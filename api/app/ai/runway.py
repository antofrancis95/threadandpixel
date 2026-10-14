"""Veo runway clip: image-to-video from the try-on (or a generated runway still)."""

from google.genai import types

from .. import storage
from ..clients import gemini, imaging
from ..config import settings
from .common import AIError, extract_image

RUNWAY_PROMPT = (
    "Cinematic haute couture fashion runway video in a luxury photo studio with a sleek minimalist runway and neutral seamless studio backdrop. "
    "The model walks confidently toward the camera on the runway, then pauses and turns slightly to showcase the garment drape. "
    "The garment's design, colour, fabric and details stay exactly the same as in the image; fabric moves naturally with each step. "
    "Soft luxury studio key lighting, neutral studio background, shallow depth of field, smooth tracking shot. Pure studio environment without domestic clutter."
)


def runway_still(garment: bytes, mime: str) -> tuple[bytes, str]:
    response = gemini().models.generate_content(
        model=settings.model_image,
        contents=[
            types.Part.from_bytes(data=garment, mime_type=mime),
            "Full-body photo of a professional adult fashion model standing in a luxury high-fashion photo studio at the start of a sleek minimalist runway with a clean seamless studio background, "
            "facing the camera, wearing exactly this garment with every detail unchanged. Diffuse softbox studio lighting, neutral studio backdrop.",
        ],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"], image_config=types.ImageConfig(aspect_ratio="9:16")
        ),
    )
    return extract_image(response)


def runway_studio_still_from_tryon(tryon_image: bytes, mime: str) -> tuple[bytes, str]:
    """Transposes the person and garment from the virtual try-on portrait onto a luxury studio runway setting.
    
    Preserves the person's identity and the draped bespoke garment while replacing any domestic/casual
    photo background with a sleek studio runway environment.
    """
    prompt = (
        "Keep the exact same person, face, body, and draped bespoke garment from this image completely identical and unchanged. "
        "Place this person at the start of a sleek, minimalist fashion runway inside a luxury photo studio. "
        "Replace the entire background with a neutral seamless studio runway backdrop and softbox editorial studio lighting. "
        "Clean luxury haute couture studio environment without any domestic or casual background elements. 9:16 vertical framing."
    )
    response = gemini().models.generate_content(
        model=settings.model_image,
        contents=[
            types.Part.from_bytes(data=tryon_image, mime_type=mime),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"], image_config=types.ImageConfig(aspect_ratio="9:16")
        ),
    )
    return extract_image(response)


def start(first_frame: bytes, mime: str, output_prefix: str) -> str:
    op = imaging().models.generate_videos(
        model=settings.model_video,
        prompt=RUNWAY_PROMPT,
        image=types.Image(image_bytes=first_frame, mime_type=mime),
        config=types.GenerateVideosConfig(
            aspect_ratio="9:16",
            duration_seconds=8,
            number_of_videos=1,
            person_generation="allow_adult",
            generate_audio=False,
            output_gcs_uri=storage.gcs_uri(output_prefix),
        ),
    )
    if not op.name:
        raise AIError("Veo did not start a generation job.")
    return op.name


def poll(operation_name: str) -> tuple[bool, str | None, str | None]:
    """Returns (done, video_path, error)."""
    op = imaging().operations.get(types.GenerateVideosOperation(name=operation_name))
    if not op.done:
        return False, None, None
    if op.error:
        return True, None, str(op.error.get("message", op.error) if isinstance(op.error, dict) else op.error)
    videos = (op.response.generated_videos if op.response else None) or []
    if not videos or not videos[0].video or not videos[0].video.uri:
        reasons = (op.response.rai_media_filtered_reasons if op.response else None) or ["no video returned"]
        return True, None, "; ".join(reasons)
    return True, storage.path_from_uri(videos[0].video.uri), None
