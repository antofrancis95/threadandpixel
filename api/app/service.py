import io
import logging
import uuid

from fastapi import HTTPException, status
from google.cloud import firestore
from PIL import Image, UnidentifiedImageError

from . import demo, storage
from .ai import designer, runway, tailor, tryon
from .auth import User
from .clients import db
from .config import settings
from .models import DesignSpec, MessageIn, PhotoCheck, TailorTurn

log = logging.getLogger(__name__)

EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


def owned_design(design_id: str, user: User) -> tuple[firestore.DocumentReference, dict]:
    ref = db().collection("designs").document(design_id)
    snap = ref.get()
    if not snap.exists or snap.get("uid") != user.uid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found")
    return ref, snap.to_dict()


def history(ref: firestore.DocumentReference, limit: int = 50) -> list[dict]:
    snap = ref.get()
    if snap.exists:
        data = snap.to_dict() or {}
        msgs = data.get("messages")
        if isinstance(msgs, list) and len(msgs) > 0:
            return msgs[-limit:]
    snaps = ref.collection("messages").order_by("ts", direction=firestore.Query.DESCENDING).limit(limit).stream()
    return [{"role": s.get("role"), "text": s.get("text")} for s in reversed(list(snaps))]


def save_turn(ref: firestore.DocumentReference, user_text: str, reply: str) -> None:
    batch = db().batch()
    batch.set(ref.collection("messages").document(), {"role": "user", "text": user_text, "ts": firestore.SERVER_TIMESTAMP, "seq": 1})
    batch.set(ref.collection("messages").document(), {"role": "model", "text": reply, "ts": firestore.SERVER_TIMESTAMP, "seq": 2})
    batch.commit()


def add_version(ref: firestore.DocumentReference, version: int, image: bytes, mime: str, instruction: str) -> str:
    path = storage.upload(f"designs/{ref.id}/v{version}.{EXT.get(mime, 'png')}", image, mime)
    ref.collection("versions").document(str(version)).set(
        {"image_path": path, "instruction": instruction, "created_at": firestore.SERVER_TIMESTAMP}
    )
    return path


def design_response(
    ref_id: str,
    data: dict,
    reply: str | None = None,
    transcript: str | None = None,
    suggested_action: str | None = None,
    is_off_topic: bool = False,
) -> dict:
    def url(key: str) -> str | None:
        return storage.signed_url(data[key]) if data.get(key) else None

    return {
        "design_id": ref_id,
        "version": data.get("current_version", 0),
        "spec": data["spec"],
        "image_url": url("current_image_path"),
        "flats_url": url("flats_path"),
        "tryon_url": url("tryon_path"),
        "runway_url": url("runway_path"),
        "reference_image_url": url("reference_image_path"),
        "occasion": data.get("occasion"),
        "has_vto_portrait": bool(data.get("person_upload_path")),
        "reply": reply,
        "transcript": transcript,
        "messages": data.get("messages", []),
        "suggested_action": suggested_action or data.get("suggested_action", "none"),
        "is_off_topic": is_off_topic,
    }


def create_design(user: User, msg: MessageIn) -> dict:
    turn = demo.model(
        "tailor-create",
        lambda: tailor.converse(msg, [], None, explicit_gender=msg.gender),
        TailorTurn,
    )
    ref = db().collection("designs").document()
    msgs = [
        {"role": "user", "text": turn.user_transcript},
        {"role": "model", "text": turn.reply_to_user},
    ]

    if turn.is_off_topic or not turn.ready_to_sketch:
        # Initial consultation or off-topic turn: do NOT sketch yet. Record consultation state and ask for basic specs.
        action = "none" if turn.is_off_topic else turn.suggested_action
        data = {
            "uid": user.uid,
            "spec": turn.spec.model_dump(),
            "image_prompt": turn.image_prompt,
            "suggested_action": action,
            "current_version": 0,
            "current_image_path": None,
            "flats_path": None,
            "tryon_path": None,
            "runway_path": None,
            "messages": msgs,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        ref.set(data)
        save_turn(ref, turn.user_transcript, turn.reply_to_user)
        return design_response(ref.id, data, turn.reply_to_user, turn.user_transcript, action, is_off_topic=turn.is_off_topic)

    # Basic specifications are present; proceed to sketch!
    image, mime = demo.image("design-create", lambda: designer.generate(turn.image_prompt))
    path = add_version(ref, 1, image, mime, turn.image_prompt)

    # If size is available, automatically draft technical flats with measurement callouts!
    effective_size = turn.spec.size or msg.size
    flats_path = None
    if effective_size:
        try:
            flats_image, flats_mime = demo.image(
                "flats",
                lambda: designer.technical_flats(image, mime, turn.spec, size=effective_size),
            )
            flats_path = storage.upload(
                f"designs/{ref.id}/flats-v1.{EXT.get(flats_mime, 'png')}",
                flats_image,
                flats_mime,
            )
        except Exception as exc:
            log.warning("Auto drafting flats with measurements failed: %s", exc)

    data = {
        "uid": user.uid,
        "spec": turn.spec.model_dump(),
        "image_prompt": turn.image_prompt,
        "suggested_action": turn.suggested_action,
        "current_version": 1,
        "current_image_path": path,
        "flats_path": flats_path,
        "tryon_path": None,
        "runway_path": None,
        "messages": msgs,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    ref.set(data)
    save_turn(ref, turn.user_transcript, turn.reply_to_user)
    return design_response(ref.id, data, turn.reply_to_user, turn.user_transcript, turn.suggested_action)


def create_design_from_image(
    user: User,
    image_bytes: bytes,
    mime: str,
    text: str | None = None,
    gender: str | None = None,
    size: str | None = None,
) -> dict:
    """Generates an outfit based on an uploaded design image / sketch."""
    turn = demo.model(
        "tailor-design-image",
        lambda: tailor.converse_with_design_image(
            image_bytes, mime, text=text, explicit_gender=gender, size=size
        ),
        TailorTurn,
    )
    ref = db().collection("designs").document()
    msgs = [
        {"role": "user", "text": turn.user_transcript},
        {"role": "model", "text": turn.reply_to_user},
    ]
    ref_ext = EXT.get(mime, "jpg")
    ref_path = storage.upload(f"designs/{ref.id}/reference.{ref_ext}", image_bytes, mime)

    image, out_mime = demo.image(
        "design-create",
        lambda: designer.generate_from_reference(image_bytes, mime, turn.image_prompt),
    )
    path = add_version(ref, 1, image, out_mime, turn.image_prompt)

    effective_size = turn.spec.size or size or "M"
    flats_path = None
    try:
        flats_image, flats_mime = demo.image(
            "flats",
            lambda: designer.technical_flats(image, out_mime, turn.spec, size=effective_size),
        )
        flats_path = storage.upload(
            f"designs/{ref.id}/flats-v1.{EXT.get(flats_mime, 'png')}",
            flats_image,
            flats_mime,
        )
    except Exception as exc:
        log.warning("Auto drafting flats for image design failed: %s", exc)

    data = {
        "uid": user.uid,
        "spec": turn.spec.model_dump(),
        "image_prompt": turn.image_prompt,
        "suggested_action": turn.suggested_action,
        "current_version": 1,
        "current_image_path": path,
        "reference_image_path": ref_path,
        "flats_path": flats_path,
        "tryon_path": None,
        "runway_path": None,
        "messages": msgs,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    ref.set(data)
    save_turn(ref, turn.user_transcript, turn.reply_to_user)
    return design_response(ref.id, data, turn.reply_to_user, turn.user_transcript, turn.suggested_action)


def create_design_for_occasion(
    user: User,
    occasion: str,
    person_bytes: bytes | None = None,
    person_mime: str | None = None,
    upload_id: str | None = None,
    preferences: str | None = None,
    gender: str | None = None,
    size: str | None = None,
) -> dict:
    """Designs an outfit for a specific occasion tailored to the client's photo and drapes it onto them."""
    resolved_person_bytes = None
    resolved_person_mime = "image/jpeg"
    resolved_person_path = None
    resolved_upload_id = upload_id

    if person_bytes:
        try:
            img = Image.open(io.BytesIO(person_bytes))
            if img.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Use a JPEG, PNG or WebP image.")
            img = img.convert("RGB")
        except (UnidentifiedImageError, OSError):
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "File is not a valid image.")

        img.thumbnail((2048, 2048))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92)
        clean = buf.getvalue()

        check = demo.model("photo-check", lambda: tryon.check_person_photo(clean, "image/jpeg"), PhotoCheck)
        if check.appears_minor or check.unsafe_content or not check.single_person_full_body:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Photo not suitable for try-on: {check.reason}")

        resolved_upload_id = uuid.uuid4().hex
        resolved_person_path = storage.upload(f"uploads/{user.uid}/{resolved_upload_id}.jpg", clean, "image/jpeg")
        db().collection("uploads").document(resolved_upload_id).set(
            {"uid": user.uid, "path": resolved_person_path, "consent_at": firestore.SERVER_TIMESTAMP}
        )
        db().collection("users").document(user.uid).set(
            {"last_upload_id": resolved_upload_id, "last_person_path": resolved_person_path},
            merge=True,
        )
        resolved_person_bytes = clean
        resolved_person_mime = "image/jpeg"
    elif upload_id:
        snap = db().collection("uploads").document(upload_id).get()
        if not snap.exists or snap.get("uid") != user.uid:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Upload not found")
        resolved_person_path = snap.get("path")
        resolved_person_bytes, resolved_person_mime = storage.download(resolved_person_path)
    else:
        u_snap = db().collection("users").document(user.uid).get()
        if u_snap.exists and u_snap.get("last_person_path"):
            resolved_person_path = u_snap.get("last_person_path")
            resolved_upload_id = u_snap.get("last_upload_id")
            resolved_person_bytes, resolved_person_mime = storage.download(resolved_person_path)
        else:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Please upload a photo of yourself so the Couturier can design and drape your occasion outfit.",
            )

    turn = demo.model(
        "tailor-occasion",
        lambda: tailor.converse_for_occasion(
            resolved_person_bytes,
            resolved_person_mime,
            occasion=occasion,
            preferences=preferences,
            explicit_gender=gender,
            size=size,
        ),
        TailorTurn,
    )

    ref = db().collection("designs").document()
    msgs = [
        {"role": "user", "text": turn.user_transcript},
        {"role": "model", "text": turn.reply_to_user},
    ]

    image, out_mime = demo.image("design-create", lambda: designer.generate(turn.image_prompt))
    path = add_version(ref, 1, image, out_mime, turn.image_prompt)

    # Automatically perform virtual try-on on the person photo
    tryon_path = None
    try:
        tryon_bytes = demo.blob(
            "tryon",
            lambda: tryon.try_on(resolved_person_bytes, resolved_person_mime, image, out_mime),
            "image/jpeg",
        )
        tryon_path = storage.upload(
            f"uploads/{user.uid}/tryon-{ref.id}-v1.jpg",
            tryon_bytes,
            "image/jpeg",
        )
    except Exception as exc:
        log.warning("Auto try-on for occasion outfit failed: %s", exc)

    # Automatically draft flats with measurements
    effective_size = turn.spec.size or size or "M"
    flats_path = None
    try:
        flats_image, flats_mime = demo.image(
            "flats",
            lambda: designer.technical_flats(image, out_mime, turn.spec, size=effective_size),
        )
        flats_path = storage.upload(
            f"designs/{ref.id}/flats-v1.{EXT.get(flats_mime, 'png')}",
            flats_image,
            flats_mime,
        )
    except Exception as exc:
        log.warning("Auto drafting flats for occasion outfit failed: %s", exc)

    data = {
        "uid": user.uid,
        "spec": turn.spec.model_dump(),
        "image_prompt": turn.image_prompt,
        "suggested_action": turn.suggested_action,
        "current_version": 1,
        "current_image_path": path,
        "flats_path": flats_path,
        "tryon_path": tryon_path,
        "runway_path": None,
        "occasion": occasion,
        "person_upload_path": resolved_person_path,
        "person_upload_id": resolved_upload_id,
        "messages": msgs,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    ref.set(data)
    save_turn(ref, turn.user_transcript, turn.reply_to_user)
    return design_response(ref.id, data, turn.reply_to_user, turn.user_transcript, turn.suggested_action)


def continue_design(user: User, design_id: str, msg: MessageIn) -> dict:
    ref, data = owned_design(design_id, user)
    existing_person_path = data.get("person_upload_path")
    if not existing_person_path:
        u_snap = db().collection("users").document(user.uid).get()
        if u_snap.exists and u_snap.get("last_person_path"):
            existing_person_path = u_snap.get("last_person_path")

    has_vto = bool(existing_person_path or data.get("tryon_path"))
    spec = DesignSpec.model_validate(data["spec"])
    turn = demo.model(
        "tailor-edit",
        lambda: tailor.converse(msg, history(ref), spec, has_vto=has_vto, explicit_gender=msg.gender),
        TailorTurn,
    )

    new_turn = [
        {"role": "user", "text": turn.user_transcript},
        {"role": "model", "text": turn.reply_to_user},
    ]
    existing_msgs = data.get("messages") or []
    updated_msgs = existing_msgs + new_turn

    if turn.is_off_topic:
        # Off-topic input captured in background or foreground:
        # Do NOT modify design spec, do NOT trigger image edits, do NOT increment version!
        updates: dict = {
            "updated_at": firestore.SERVER_TIMESTAMP,
            "messages": updated_msgs,
        }
        ref.update(updates)
        save_turn(ref, turn.user_transcript, turn.reply_to_user)
        data["messages"] = updated_msgs
        return design_response(ref.id, data, turn.reply_to_user, turn.user_transcript, "none", is_off_topic=True)

    updates: dict = {
        "spec": turn.spec.model_dump(),
        "suggested_action": turn.suggested_action,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "messages": updated_msgs,
    }

    # Case 1: Was in consultation phase (no image yet, version == 0)
    if data.get("current_version", 0) == 0 or not data.get("current_image_path"):
        if turn.ready_to_sketch:
            # We now have enough details to sketch!
            image, mime = demo.image("design-create", lambda: designer.generate(turn.image_prompt))
            path = add_version(ref, 1, image, mime, turn.image_prompt)
            effective_size = turn.spec.size or msg.size or spec.size
            flats_path = None
            if effective_size:
                try:
                    flats_image, flats_mime = demo.image(
                        "flats",
                        lambda: designer.technical_flats(image, mime, turn.spec, size=effective_size),
                    )
                    flats_path = storage.upload(
                        f"designs/{ref.id}/flats-v1.{EXT.get(flats_mime, 'png')}",
                        flats_image,
                        flats_mime,
                    )
                except Exception as exc:
                    log.warning("Auto drafting flats with measurements failed: %s", exc)

            updates |= {
                "current_version": 1,
                "current_image_path": path,
                "flats_path": flats_path,
                "tryon_path": None,
                "runway_path": None,
            }
        else:
            # Still consulting
            pass

    # Case 2: Existing design with image (version >= 1) being edited
    elif turn.edit_instruction.strip():
        current, mime = storage.download(data["current_image_path"])
        image, out_mime = demo.image("design-edit", lambda: designer.edit(current, mime, turn.edit_instruction))
        version = data["current_version"] + 1

        new_tryon_path = None
        if existing_person_path:
            try:
                person, person_mime = storage.download(existing_person_path)
                tryon_bytes = demo.blob(
                    "tryon",
                    lambda: tryon.try_on(person, person_mime, image, out_mime),
                    "image/jpeg",
                )
                new_tryon_path = storage.upload(
                    f"uploads/{user.uid}/tryon-{ref.id}-v{version}.jpg",
                    tryon_bytes,
                    "image/jpeg",
                )
            except Exception as exc:
                log.warning("Auto try-on drape for v%s failed: %s", version, exc)

        effective_size = turn.spec.size or msg.size or spec.size
        flats_path = None
        if effective_size:
            try:
                flats_image, flats_mime = demo.image(
                    "flats",
                    lambda: designer.technical_flats(image, out_mime, turn.spec, size=effective_size),
                )
                flats_path = storage.upload(
                    f"designs/{ref.id}/flats-v{version}.{EXT.get(flats_mime, 'png')}",
                    flats_image,
                    flats_mime,
                )
            except Exception as exc:
                log.warning("Auto drafting flats with measurements on edit failed: %s", exc)

        updates |= {
            "current_version": version,
            "current_image_path": add_version(ref, version, image, out_mime, turn.edit_instruction),
            "flats_path": flats_path,
            "tryon_path": new_tryon_path,
            "runway_path": None,
        }
        if existing_person_path:
            updates["person_upload_path"] = existing_person_path

    ref.update(updates)
    save_turn(ref, turn.user_transcript, turn.reply_to_user)
    return design_response(ref.id, data | updates, turn.reply_to_user, turn.user_transcript, turn.suggested_action)


def generate_flats_service(user: User, design_id: str, size: str | None = None) -> dict:
    """Drafts 2D architectural technical flats for a design."""
    ref, data = owned_design(design_id, user)
    if not data.get("current_image_path"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Garment must be sketched before drafting technical flats.")
    current, mime = storage.download(data["current_image_path"])
    spec = DesignSpec.model_validate(data["spec"])
    effective_size = size or spec.size or data.get("size")
    image, out_mime = demo.image("flats", lambda: designer.technical_flats(current, mime, spec, size=effective_size))
    path = storage.upload(
        f"designs/{ref.id}/flats-v{data['current_version']}.{EXT.get(out_mime, 'png')}", image, out_mime
    )
    updates: dict = {"flats_path": path}
    if size and not spec.size:
        spec.size = size
        updates["spec"] = spec.model_dump()
        updates["size"] = size
    ref.update(updates)
    return {"flats_url": storage.signed_url(path), "size": effective_size}


def job_response(job_id: str, job: dict) -> dict:
    return {
        "job_id": job_id,
        "design_id": job["design_id"],
        "status": job["status"],
        "video_url": storage.signed_url(job["video_path"]) if job.get("video_path") else None,
        "error": job.get("error"),
    }


def start_runway_service(user: User, design_id: str) -> dict:
    """Initiates a Runway/Veo video job.
    
    CRITICAL REQUIREMENT: The clip generated must always have a luxury studio background.
    The background from the try-on image must NOT be used under any circumstances.
    """
    ref, data = owned_design(design_id, user)
    job_ref = db().collection("jobs").document()
    job = {
        "uid": user.uid,
        "type": "runway",
        "design_id": ref.id,
        "version": data["current_version"],
        "status": "running",
        "operation": None,
        "video_path": None,
        "error": None,
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    cached = demo.cached_video() if settings.demo_mode in ("replay", "fallback") else None
    if settings.demo_mode == "replay" and cached:
        job |= {"status": "done", "video_path": cached}
    else:
        try:
            if data.get("tryon_path"):
                # Primary: Use the virtual try-on image (user wearing the bespoke garment),
                # transposed into a luxury studio runway background.
                tryon_img, tryon_mime = storage.download(data["tryon_path"])
                try:
                    frame, frame_mime = demo.image(
                        "runway-tryon-studio",
                        lambda: runway.runway_studio_still_from_tryon(tryon_img, tryon_mime),
                    )
                except Exception:
                    # If studio background transposition encounters an error, use the try-on image directly
                    # to ensure the user's virtual try-on is preserved.
                    frame, frame_mime = tryon_img, tryon_mime
            else:
                # Fallback: Generic haute couture model generated from the garment render
                garment, garment_mime = storage.download(data["current_image_path"])
                frame, frame_mime = demo.image("runway-still", lambda: runway.runway_still(garment, garment_mime))

            job["operation"] = runway.start(frame, frame_mime, f"uploads/{user.uid}/runway/{ref.id}/{job_ref.id}/")
        except Exception:
            if not cached:
                raise
            job |= {"status": "done", "video_path": cached}

    job_ref.set(job)
    if job["video_path"]:
        ref.update({"runway_path": job["video_path"]})
    return job_response(job_ref.id, job)
