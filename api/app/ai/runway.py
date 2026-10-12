"""Veo runway clip: image-to-video from the try-on (or a generated runway still)."""

from google.genai import types

from .. import storage
from ..clients import gemini, imaging
from ..config import settings
from .common import AIError, extract_image

RUNWAY_PROMPT = (
    "Cinematic fashion runway video. The model walks confidently toward the camera on a minimalist runway, "
    "then pauses and turns slightly to show the garment. The garment's design, colour, fabric and details stay "
    "exactly the same as in the image; fabric moves naturally with each step. Soft studio lighting, shallow depth "
    "of field, smooth tracking shot."
)


def runway_still(garment: bytes, mime: str) -> tuple[bytes, str]:
    response = gemini().models.generate_content(
        model=settings.model_image,
        contents=[
            types.Part.from_bytes(data=garment, mime_type=mime),
            "Full-body photo of a professional adult fashion model standing at the start of a minimalist runway, "
            "facing the camera, wearing exactly this garment with every detail unchanged. Editorial lighting.",
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
