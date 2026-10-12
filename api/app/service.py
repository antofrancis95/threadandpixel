"""Design workflow shared by the REST API and the Gemini Live voice session."""

from fastapi import HTTPException, status
from google.cloud import firestore

from . import demo, storage
from .ai import designer, tailor
from .auth import User
from .clients import db
from .models import DesignSpec, MessageIn, TailorTurn

EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


def owned_design(design_id: str, user: User) -> tuple[firestore.DocumentReference, dict]:
    ref = db().collection("designs").document(design_id)
    snap = ref.get()
    if not snap.exists or snap.get("uid") != user.uid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found")
    return ref, snap.to_dict()


def history(ref: firestore.DocumentReference, limit: int = 20) -> list[dict]:
    snaps = ref.collection("messages").order_by("ts", direction=firestore.Query.DESCENDING).limit(limit).stream()
    return [{"role": s.get("role"), "text": s.get("text")} for s in reversed(list(snaps))]


def save_turn(ref: firestore.DocumentReference, user_text: str, reply: str) -> None:
    batch = db().batch()
    batch.set(ref.collection("messages").document(), {"role": "user", "text": user_text, "ts": firestore.SERVER_TIMESTAMP})
    batch.set(ref.collection("messages").document(), {"role": "model", "text": reply, "ts": firestore.SERVER_TIMESTAMP})
    batch.commit()


def add_version(ref: firestore.DocumentReference, version: int, image: bytes, mime: str, instruction: str) -> str:
    path = storage.upload(f"designs/{ref.id}/v{version}.{EXT.get(mime, 'png')}", image, mime)
    ref.collection("versions").document(str(version)).set(
        {"image_path": path, "instruction": instruction, "created_at": firestore.SERVER_TIMESTAMP}
    )
    return path


def design_response(ref_id: str, data: dict, reply: str | None = None, transcript: str | None = None) -> dict:
    def url(key: str) -> str | None:
        return storage.signed_url(data[key]) if data.get(key) else None

    return {
        "design_id": ref_id,
        "version": data["current_version"],
        "spec": data["spec"],
        "image_url": storage.signed_url(data["current_image_path"]),
        "flats_url": url("flats_path"),
        "tryon_url": url("tryon_path"),
        "runway_url": url("runway_path"),
        "reply": reply,
        "transcript": transcript,
    }


def create_design(user: User, msg: MessageIn) -> dict:
    turn = demo.model("tailor-create", lambda: tailor.converse(msg, [], None), TailorTurn)
    image, mime = demo.image("design-create", lambda: designer.generate(turn.image_prompt))

    ref = db().collection("designs").document()
    path = add_version(ref, 1, image, mime, turn.image_prompt)
    data = {
        "uid": user.uid,
        "spec": turn.spec.model_dump(),
        "image_prompt": turn.image_prompt,
        "current_version": 1,
        "current_image_path": path,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    ref.set(data)
    save_turn(ref, turn.user_transcript, turn.reply_to_user)
    return design_response(ref.id, data, turn.reply_to_user, turn.user_transcript)


def continue_design(user: User, design_id: str, msg: MessageIn) -> dict:
    ref, data = owned_design(design_id, user)
    spec = DesignSpec.model_validate(data["spec"])
    turn = demo.model("tailor-edit", lambda: tailor.converse(msg, history(ref), spec), TailorTurn)

    updates: dict = {"spec": turn.spec.model_dump(), "updated_at": firestore.SERVER_TIMESTAMP}
    if turn.edit_instruction.strip():
        current, mime = storage.download(data["current_image_path"])
        image, out_mime = demo.image("design-edit", lambda: designer.edit(current, mime, turn.edit_instruction))
        version = data["current_version"] + 1
        updates |= {
            "current_version": version,
            "current_image_path": add_version(ref, version, image, out_mime, turn.edit_instruction),
            "flats_path": None,
            "tryon_path": None,
            "runway_path": None,
        }
    ref.update(updates)
    save_turn(ref, turn.user_transcript, turn.reply_to_user)
    return design_response(ref.id, data | updates, turn.reply_to_user, turn.user_transcript)
