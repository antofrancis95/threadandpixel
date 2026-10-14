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


SIZE_MEASUREMENTS: dict[str, dict[str, dict[str, str]]] = {
    "top": {
        "XS": {"Chest Width": "48 cm", "Body Length": "66 cm", "Shoulder Width": "42 cm", "Sleeve Length": "20 cm", "Hem Width": "47 cm"},
        "S": {"Chest Width": "51 cm", "Body Length": "69 cm", "Shoulder Width": "44 cm", "Sleeve Length": "21 cm", "Hem Width": "50 cm"},
        "M": {"Chest Width": "54 cm", "Body Length": "72 cm", "Shoulder Width": "46 cm", "Sleeve Length": "22 cm", "Hem Width": "53 cm"},
        "L": {"Chest Width": "57 cm", "Body Length": "75 cm", "Shoulder Width": "48 cm", "Sleeve Length": "23 cm", "Hem Width": "56 cm"},
        "XL": {"Chest Width": "60 cm", "Body Length": "77 cm", "Shoulder Width": "50 cm", "Sleeve Length": "24 cm", "Hem Width": "59 cm"},
        "XXL": {"Chest Width": "63 cm", "Body Length": "79 cm", "Shoulder Width": "52 cm", "Sleeve Length": "25 cm", "Hem Width": "62 cm"},
    },
    "shirt": {
        "XS": {"Chest Width": "48 cm", "Body Length": "68 cm", "Shoulder Width": "42 cm", "Sleeve Length": "21 cm", "Hem Width": "48 cm"},
        "S": {"Chest Width": "51 cm", "Body Length": "71 cm", "Shoulder Width": "44 cm", "Sleeve Length": "22 cm", "Hem Width": "51 cm"},
        "M": {"Chest Width": "54 cm", "Body Length": "73 cm", "Shoulder Width": "46 cm", "Sleeve Length": "23 cm", "Hem Width": "54 cm"},
        "L": {"Chest Width": "57 cm", "Body Length": "76 cm", "Shoulder Width": "48 cm", "Sleeve Length": "24 cm", "Hem Width": "57 cm"},
        "XL": {"Chest Width": "60 cm", "Body Length": "78 cm", "Shoulder Width": "50 cm", "Sleeve Length": "25 cm", "Hem Width": "60 cm"},
        "XXL": {"Chest Width": "63 cm", "Body Length": "80 cm", "Shoulder Width": "52 cm", "Sleeve Length": "26 cm", "Hem Width": "63 cm"},
    },
    "dress": {
        "XS": {"Bust Width": "43 cm", "Waist Width": "33 cm", "Hip Width": "46 cm", "Total Length": "125 cm", "Shoulder Width": "36 cm"},
        "S": {"Bust Width": "45 cm", "Waist Width": "35 cm", "Hip Width": "48 cm", "Total Length": "128 cm", "Shoulder Width": "37 cm"},
        "M": {"Bust Width": "48 cm", "Waist Width": "38 cm", "Hip Width": "51 cm", "Total Length": "131 cm", "Shoulder Width": "39 cm"},
        "L": {"Bust Width": "51 cm", "Waist Width": "41 cm", "Hip Width": "54 cm", "Total Length": "133 cm", "Shoulder Width": "41 cm"},
        "XL": {"Bust Width": "54 cm", "Waist Width": "44 cm", "Hip Width": "57 cm", "Total Length": "135 cm", "Shoulder Width": "43 cm"},
        "XXL": {"Bust Width": "57 cm", "Waist Width": "47 cm", "Hip Width": "60 cm", "Total Length": "137 cm", "Shoulder Width": "45 cm"},
    },
    "jacket": {
        "XS": {"Chest Width": "50 cm", "Body Length": "72 cm", "Shoulder Width": "44 cm", "Sleeve Length": "62 cm", "Waist Width": "46 cm"},
        "S": {"Chest Width": "52 cm", "Body Length": "74 cm", "Shoulder Width": "45 cm", "Sleeve Length": "63 cm", "Waist Width": "48 cm"},
        "M": {"Chest Width": "55 cm", "Body Length": "76 cm", "Shoulder Width": "47 cm", "Sleeve Length": "64 cm", "Waist Width": "51 cm"},
        "L": {"Chest Width": "58 cm", "Body Length": "78 cm", "Shoulder Width": "49 cm", "Sleeve Length": "65 cm", "Waist Width": "54 cm"},
        "XL": {"Chest Width": "61 cm", "Body Length": "80 cm", "Shoulder Width": "51 cm", "Sleeve Length": "66 cm", "Waist Width": "57 cm"},
        "XXL": {"Chest Width": "64 cm", "Body Length": "82 cm", "Shoulder Width": "53 cm", "Sleeve Length": "67 cm", "Waist Width": "60 cm"},
    },
    "suit": {
        "XS": {"Chest Width": "50 cm", "Jacket Length": "72 cm", "Shoulder Width": "44 cm", "Trouser Waist": "38 cm", "Inseam": "78 cm"},
        "S": {"Chest Width": "52 cm", "Jacket Length": "74 cm", "Shoulder Width": "45 cm", "Trouser Waist": "40 cm", "Inseam": "79 cm"},
        "M": {"Chest Width": "55 cm", "Jacket Length": "76 cm", "Shoulder Width": "47 cm", "Trouser Waist": "43 cm", "Inseam": "80 cm"},
        "L": {"Chest Width": "58 cm", "Jacket Length": "78 cm", "Shoulder Width": "49 cm", "Trouser Waist": "46 cm", "Inseam": "81 cm"},
        "XL": {"Chest Width": "61 cm", "Jacket Length": "80 cm", "Shoulder Width": "51 cm", "Trouser Waist": "49 cm", "Inseam": "82 cm"},
        "XXL": {"Chest Width": "64 cm", "Jacket Length": "82 cm", "Shoulder Width": "53 cm", "Trouser Waist": "52 cm", "Inseam": "82 cm"},
    },
    "trousers": {
        "XS": {"Waist Width": "37 cm", "Inseam": "78 cm", "Outseam": "102 cm", "Thigh Width": "28 cm", "Hem Opening": "17 cm"},
        "S": {"Waist Width": "39 cm", "Inseam": "79 cm", "Outseam": "103 cm", "Thigh Width": "29 cm", "Hem Opening": "18 cm"},
        "M": {"Waist Width": "42 cm", "Inseam": "80 cm", "Outseam": "104 cm", "Thigh Width": "31 cm", "Hem Opening": "19 cm"},
        "L": {"Waist Width": "45 cm", "Inseam": "81 cm", "Outseam": "105 cm", "Thigh Width": "33 cm", "Hem Opening": "20 cm"},
        "XL": {"Waist Width": "48 cm", "Inseam": "82 cm", "Outseam": "106 cm", "Thigh Width": "35 cm", "Hem Opening": "21 cm"},
        "XXL": {"Waist Width": "51 cm", "Inseam": "82 cm", "Outseam": "107 cm", "Thigh Width": "37 cm", "Hem Opening": "22 cm"},
    },
    "skirt": {
        "XS": {"Waist Width": "33 cm", "Hip Width": "46 cm", "Total Length": "68 cm", "Hem Width": "52 cm"},
        "S": {"Waist Width": "35 cm", "Hip Width": "48 cm", "Total Length": "70 cm", "Hem Width": "54 cm"},
        "M": {"Waist Width": "38 cm", "Hip Width": "51 cm", "Total Length": "72 cm", "Hem Width": "57 cm"},
        "L": {"Waist Width": "41 cm", "Hip Width": "54 cm", "Total Length": "74 cm", "Hem Width": "60 cm"},
        "XL": {"Waist Width": "44 cm", "Hip Width": "57 cm", "Total Length": "75 cm", "Hem Width": "63 cm"},
        "XXL": {"Waist Width": "47 cm", "Hip Width": "60 cm", "Total Length": "76 cm", "Hem Width": "66 cm"},
    },
    "jumpsuit": {
        "XS": {"Bust Width": "43 cm", "Waist Width": "34 cm", "Hip Width": "47 cm", "Total Length": "142 cm", "Inseam": "76 cm"},
        "S": {"Bust Width": "45 cm", "Waist Width": "36 cm", "Hip Width": "49 cm", "Total Length": "145 cm", "Inseam": "77 cm"},
        "M": {"Bust Width": "48 cm", "Waist Width": "39 cm", "Hip Width": "52 cm", "Total Length": "148 cm", "Inseam": "78 cm"},
        "L": {"Bust Width": "51 cm", "Waist Width": "42 cm", "Hip Width": "55 cm", "Total Length": "151 cm", "Inseam": "79 cm"},
        "XL": {"Bust Width": "54 cm", "Waist Width": "45 cm", "Hip Width": "58 cm", "Total Length": "153 cm", "Inseam": "80 cm"},
        "XXL": {"Bust Width": "57 cm", "Waist Width": "48 cm", "Hip Width": "61 cm", "Total Length": "155 cm", "Inseam": "80 cm"},
    },
}


def technical_flats(
    image: bytes,
    mime: str,
    spec: DesignSpec,
    size: str | None = None,
) -> tuple[bytes, str]:
    effective_size = size or spec.size
    prompt = (
        "Create an architectural fashion technical flat sketch of this exact garment for a manufacturer's tech pack: "
        "FRONT view on the left and BACK view on the right, side by side, clean black vector-style line drawing "
        "on pure white background, no shading, no model, no colour fill. Show seams, darts, topstitching, "
        f"closures ({', '.join(spec.closures) or 'none'}) and hem details clearly. Label 'FRONT' and 'BACK' only."
    )
    if effective_size:
        measurements = SIZE_MEASUREMENTS.get(spec.garment_type, {}).get(effective_size)
        if measurements:
            spec_lines = ", ".join(f"{k}: {v}" for k, v in measurements.items())
            prompt += (
                f"\n\nCRITICAL SPECIFICATION: This is Size {effective_size}. Include architectural technical flat measurement callouts: "
                f"draw thin CAD dimension lines with measurement arrows and exact dimension labels ({spec_lines}) "
                f"directly on the flat sketch to indicate tailoring proportions and garment dimensions for Size {effective_size}."
            )
        else:
            prompt += (
                f"\n\nCRITICAL SPECIFICATION: This is Size {effective_size}. Include architectural technical flat measurement callouts: "
                f"draw thin CAD dimension lines with measurement arrows and numerical centimeter dimension labels for Size {effective_size} "
                "directly on the flat sketch indicating width, length, and sleeve dimensions."
            )

    response = imaging().models.generate_content(
        model=settings.model_image,
        contents=[types.Part.from_bytes(data=image, mime_type=mime), prompt],
        config=_IMAGE_CONFIG,
    )
    return extract_image(response)
