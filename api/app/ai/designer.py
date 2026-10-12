"""Garment image generation and consistent editing (Nano Banana family)."""

from google.genai import types

from ..clients import gemini as imaging
from ..config import settings
from ..models import DesignSpec
from .common import extract_image

_IMAGE_CONFIG = types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])
_PORTRAIT_CONFIG = types.GenerateContentConfig(
    response_modalities=["TEXT", "IMAGE"], image_config=types.ImageConfig(aspect_ratio="3:4")
)


def generate(prompt: str) -> tuple[bytes, str]:
    response = imaging().models.generate_content(
        model=settings.model_image, contents=prompt, config=_PORTRAIT_CONFIG
    )
    return extract_image(response)


def edit(image: bytes, mime: str, instruction: str) -> tuple[bytes, str]:
    response = imaging().models.generate_content(
        model=settings.model_image,
        contents=[
            types.Part.from_bytes(data=image, mime_type=mime),
            f"{instruction}. Keep everything else about the garment, framing, background and lighting identical.",
        ],
        config=_IMAGE_CONFIG,
    )
    return extract_image(response)


def technical_flats(image: bytes, mime: str, spec: DesignSpec) -> tuple[bytes, str]:
    prompt = (
        "Create a fashion technical flat sketch of this exact garment for a manufacturer's tech pack: "
        "FRONT view on the left and BACK view on the right, side by side, clean black vector-style line drawing "
        "on pure white background, no shading, no model, no colour fill. Show seams, darts, topstitching, "
        f"closures ({', '.join(spec.closures) or 'none'}) and hem details clearly. Label 'FRONT' and 'BACK' only."
    )
    response = imaging().models.generate_content(
        model=settings.model_image,
        contents=[types.Part.from_bytes(data=image, mime_type=mime), prompt],
        config=_IMAGE_CONFIG,
    )
    return extract_image(response)
