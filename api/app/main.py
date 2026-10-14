import io
import uuid

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.cloud import firestore
from PIL import Image, UnidentifiedImageError

from . import demo, live, pricing, storage
from .ai import designer, runway, techpack, tryon
from .ai.common import AIError
from .auth import User, current_user
from .clients import db
from .config import settings
from .models import DesignSpec, MessageIn, OrderIn, PhotoCheck, TechPackCritique, TechPackIn, TryOnIn
from .service import (
    EXT,
    continue_design,
    create_design,
    design_response,
    generate_flats_service,
    history,
    job_response,
    owned_design,
    start_runway_service,
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

app = FastAPI(title="Thread & Pixel API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(live.router)


@app.exception_handler(AIError)
def _ai_error(_: Request, exc: AIError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/healthz")
def healthz():
    return {"ok": True, "demo_mode": settings.demo_mode}


@app.get("/catalog")
def get_catalog():
    return pricing.catalog()


@app.get("/designs")
def list_designs(user: User = Depends(current_user)):
    snaps = db().collection("designs").where("uid", "==", user.uid).stream()
    items = []
    for s in snaps:
        d = s.to_dict()
        def url(key: str) -> str | None:
            return storage.signed_url(d[key]) if d.get(key) else None

        items.append({
            "design_id": s.id,
            "version": d.get("current_version", 1),
            "spec": d.get("spec", {}),
            "image_url": url("current_image_path"),
            "messages_count": len(d.get("messages", [])),
            "updated_at": str(d.get("updated_at") or d.get("created_at") or ""),
            "created_at": str(d.get("created_at") or ""),
        })
    items.sort(key=lambda x: x["updated_at"] or x["created_at"] or "", reverse=True)
    return items


@app.post("/designs")
def post_design(body: MessageIn, user: User = Depends(current_user)):
    return create_design(user, body)


@app.get("/designs/{design_id}")
def get_design(design_id: str, user: User = Depends(current_user)):
    ref, data = owned_design(design_id, user)
    result = design_response(ref.id, data)
    msgs = data.get("messages")
    if not msgs:
        msgs = history(ref, limit=50)
    result["messages"] = msgs
    return result


@app.post("/designs/{design_id}/messages")
def post_message(design_id: str, body: MessageIn, user: User = Depends(current_user)):
    return continue_design(user, design_id, body)


@app.post("/designs/{design_id}/flats")
def create_flats(design_id: str, user: User = Depends(current_user)):
    return generate_flats_service(user, design_id)


@app.post("/uploads/person")
async def upload_person(
    file: UploadFile = File(...),
    consent: bool = Form(...),
    user: User = Depends(current_user),
):
    if not consent:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Consent is required to process your photo.")
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image must be 10 MB or smaller.")
    try:
        img = Image.open(io.BytesIO(raw))
        if img.format not in {"JPEG", "PNG", "WEBP"}:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Use a JPEG, PNG or WebP image.")
        img = img.convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "File is not a valid image.")

    # Re-encode to strip EXIF (GPS, device info) before storing.
    img.thumbnail((2048, 2048))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    clean = buf.getvalue()

    check = demo.model("photo-check", lambda: tryon.check_person_photo(clean, "image/jpeg"), PhotoCheck)
    if check.appears_minor or check.unsafe_content or not check.single_person_full_body:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Photo not suitable for try-on: {check.reason}")

    upload_id = uuid.uuid4().hex
    path = storage.upload(f"uploads/{user.uid}/{upload_id}.jpg", clean, "image/jpeg")
    db().collection("uploads").document(upload_id).set(
        {"uid": user.uid, "path": path, "consent_at": firestore.SERVER_TIMESTAMP}
    )
    db().collection("users").document(user.uid).set(
        {"last_upload_id": upload_id, "last_person_path": path},
        merge=True,
    )
    return {"upload_id": upload_id}


@app.post("/designs/{design_id}/tryon")
def create_tryon(design_id: str, body: TryOnIn, user: User = Depends(current_user)):
    ref, data = owned_design(design_id, user)
    upload_id = body.upload_id or data.get("person_upload_id")
    person_path = None

    if body.upload_id:
        snap = db().collection("uploads").document(body.upload_id).get()
        if not snap.exists or snap.get("uid") != user.uid:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Upload not found")
        person_path = snap.get("path")
        upload_id = body.upload_id
    elif data.get("person_upload_path"):
        person_path = data.get("person_upload_path")
        upload_id = data.get("person_upload_id")
    else:
        u_snap = db().collection("users").document(user.uid).get()
        if u_snap.exists and u_snap.get("last_person_path"):
            person_path = u_snap.get("last_person_path")
            upload_id = u_snap.get("last_upload_id")
        else:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "No portrait uploaded yet. Please upload a photo for virtual try-on.",
            )

    person, person_mime = storage.download(person_path)
    garment, garment_mime = storage.download(data["current_image_path"])
    result = demo.blob("tryon", lambda: tryon.try_on(person, person_mime, garment, garment_mime), "image/jpeg")
    path = storage.upload(f"uploads/{user.uid}/tryon-{ref.id}-v{data['current_version']}.jpg", result, "image/jpeg")
    ref.update({
        "tryon_path": path,
        "person_upload_path": person_path,
        "person_upload_id": upload_id,
        "runway_path": None,
    })
    return {"tryon_url": storage.signed_url(path), "has_vto_portrait": True}


@app.post("/designs/{design_id}/runway")
def create_runway(design_id: str, user: User = Depends(current_user)):
    return start_runway_service(user, design_id)


@app.get("/jobs/{job_id}")
def get_job(job_id: str, user: User = Depends(current_user)):
    job_ref = db().collection("jobs").document(job_id)
    snap = job_ref.get()
    if not snap.exists or snap.get("uid") != user.uid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    job = snap.to_dict()

    if job["status"] == "running":
        done, video_path, error = runway.poll(job["operation"])
        if done:
            if video_path:
                job |= {"status": "done", "video_path": video_path}
                if settings.demo_mode == "record":
                    demo.save_video(video_path)
            elif settings.demo_mode == "fallback" and (cached := demo.cached_video()):
                job |= {"status": "done", "video_path": cached}
            else:
                job |= {"status": "error", "error": error}
            job_ref.update({k: job[k] for k in ("status", "video_path", "error")})
            if job["video_path"]:
                db().collection("designs").document(job["design_id"]).update({"runway_path": job["video_path"]})
    return _job_response(job_id, job)


def _job_response(job_id: str, job: dict) -> dict:
    return {
        "job_id": job_id,
        "status": job["status"],
        "video_url": storage.signed_url(job["video_path"], minutes=60) if job.get("video_path") else None,
        "error": job.get("error"),
    }


@app.post("/designs/{design_id}/techpack")
def create_techpack(design_id: str, body: TechPackIn, user: User = Depends(current_user)):
    ref, data = owned_design(design_id, user)
    spec = DesignSpec.model_validate(data["spec"])
    image, mime = storage.download(data["current_image_path"])
    critique = demo.model("techpack", lambda: techpack.analyze(image, mime, spec), TechPackCritique)
    quote = pricing.quote(spec, body.size)

    quote_ref = ref.collection("quotes").document()
    quote_ref.set({
        "version": data["current_version"],
        "size": body.size,
        "measurements": body.measurements.model_dump() if body.measurements else None,
        "techpack": critique.model_dump(),
        "quote": quote,
        "created_at": firestore.SERVER_TIMESTAMP,
    })
    return {"quote_id": quote_ref.id, "techpack": critique.model_dump(), "quote": quote}


@app.post("/designs/{design_id}/order")
def create_order(design_id: str, body: OrderIn, user: User = Depends(current_user)):
    ref, data = owned_design(design_id, user)
    q = ref.collection("quotes").document(body.quote_id).get()
    if not q.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")
    quote = q.to_dict()
    if quote["version"] != data["current_version"]:
        raise HTTPException(status.HTTP_409_CONFLICT, "Design changed since this quote; request a new quote.")

    order_ref = db().collection("orders").document()
    order_ref.set({
        "uid": user.uid,
        "design_id": ref.id,
        "spec": data["spec"],
        "size": quote["size"],
        "measurements": quote["measurements"],
        "techpack": quote["techpack"],
        "quote": quote["quote"],
        "total": quote["quote"]["total"],
        "image_path": data["current_image_path"],
        "flats_path": data.get("flats_path"),
        "tryon_path": data.get("tryon_path"),
        "runway_path": data.get("runway_path"),
        "status": "new",
        "created_at": firestore.SERVER_TIMESTAMP,
    })
    return {"order_id": order_ref.id}


@app.get("/orders/{order_id}")
def get_order(order_id: str, user: User = Depends(current_user)):
    snap = db().collection("orders").document(order_id).get()
    if not snap.exists or not (user.is_factory or snap.get("uid") == user.uid):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    order = snap.to_dict()
    order.pop("created_at", None)
    for key in ("image_path", "flats_path", "tryon_path", "runway_path"):
        path = order.pop(key, None)
        order[key.replace("_path", "_url")] = storage.signed_url(path) if path else None
    return {"order_id": snap.id, **order}
