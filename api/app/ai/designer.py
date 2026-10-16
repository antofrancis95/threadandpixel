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
# Flats show FRONT and BACK side by side, so a landscape canvas keeps both garments fully in frame.
_FLATS_CONFIG = types.GenerateContentConfig(
    response_modalities=["TEXT", "IMAGE"], image_config=types.ImageConfig(aspect_ratio="4:3")
)


def generate(prompt: str) -> tuple[bytes, str]:
    response = imaging().models.generate_content(
        model=settings.model_image, contents=prompt, config=_PORTRAIT_CONFIG
    )
    return extract_image(response)


def generate_from_reference(reference_image: bytes, reference_mime: str, prompt: str) -> tuple[bytes, str]:
    """Generates an editorial garment image guided by a reference design sketch or photo."""
    try:
        response = imaging().models.generate_content(
            model=settings.model_image,
            contents=[
                types.Part.from_bytes(data=reference_image, mime_type=reference_mime),
                prompt,
            ],
            config=_PORTRAIT_CONFIG,
        )
        return extract_image(response)
    except Exception:
        # Fallback to pure high-fashion prompt synthesis if reference injection fails
        return generate(prompt)


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


# Body measurements (cm) behind each standard size. SIZE_MEASUREMENTS above holds the garment dimensions drafted for the
# same sizes, so scaling them by (client tape / preset) keeps the flats consistent with what the client typed.
# Keep in sync with BODY_PRESETS in web/lib/types.ts, which pre-fills the custom tape fields.
BODY_PRESETS: dict[str, dict[str, dict[str, int]]] = {
    "menswear": {
        "XS": {"bust_cm": 86, "waist_cm": 72, "hip_cm": 90, "height_cm": 168},
        "S": {"bust_cm": 92, "waist_cm": 78, "hip_cm": 95, "height_cm": 172},
        "M": {"bust_cm": 98, "waist_cm": 84, "hip_cm": 100, "height_cm": 176},
        "L": {"bust_cm": 104, "waist_cm": 90, "hip_cm": 105, "height_cm": 180},
        "XL": {"bust_cm": 110, "waist_cm": 96, "hip_cm": 110, "height_cm": 183},
        "XXL": {"bust_cm": 116, "waist_cm": 102, "hip_cm": 115, "height_cm": 186},
    },
    "womenswear": {
        "XS": {"bust_cm": 80, "waist_cm": 62, "hip_cm": 86, "height_cm": 160},
        "S": {"bust_cm": 84, "waist_cm": 66, "hip_cm": 90, "height_cm": 164},
        "M": {"bust_cm": 88, "waist_cm": 70, "hip_cm": 96, "height_cm": 168},
        "L": {"bust_cm": 94, "waist_cm": 76, "hip_cm": 102, "height_cm": 172},
        "XL": {"bust_cm": 100, "waist_cm": 82, "hip_cm": 108, "height_cm": 175},
        "XXL": {"bust_cm": 106, "waist_cm": 88, "hip_cm": 114, "height_cm": 178},
    },
}
_WOMENSWEAR_GARMENTS = {"dress", "skirt", "jumpsuit"}


def body_preset(gender: str | None, garment_type: str | None, size: str) -> dict[str, int] | None:
    key = gender if gender in BODY_PRESETS else ("womenswear" if garment_type in _WOMENSWEAR_GARMENTS else "menswear")
    return BODY_PRESETS[key].get(size)


def garment_callouts(
    garment_type: str | None,
    size: str,
    gender: str | None = None,
    measurements: dict | None = None,
) -> dict[str, str]:
    """Garment dimension callouts for the flats: the size chart, scaled to the client's own tape when given."""
    table = SIZE_MEASUREMENTS.get(garment_type or "", {}).get(size) or SIZE_MEASUREMENTS["suit"].get(size, {})
    preset = body_preset(gender, garment_type, size)
    given = {k: v for k, v in (measurements or {}).items() if v}
    if not table or not preset or not given:
        return dict(table)

    def ratio(field: str) -> float:
        return given[field] / preset[field] if field in given else 1.0

    out: dict[str, str] = {}
    for label, value in table.items():
        lower = label.lower()
        if "chest" in lower or "bust" in lower:
            factor = ratio("bust_cm")
        elif "waist" in lower:
            factor = ratio("waist_cm")
        elif "hip" in lower or "thigh" in lower:
            factor = ratio("hip_cm")
        elif any(w in lower for w in ("length", "inseam", "outseam", "sleeve")):
            factor = ratio("height_cm")
        else:
            factor = 1.0
        out[label] = f"{round(float(value.split()[0]) * factor)} cm"
    return out


def technical_flats(
    image: bytes,
    mime: str,
    spec: DesignSpec,
    size: str | None = None,
    measurements: dict | None = None,
) -> tuple[bytes, str]:
    effective_size = size or spec.size
    garment_type = spec.garment_type or "garment"
    closures_desc = ", ".join(spec.closures) if spec.closures else "standard couture closures"

    prompt_parts = [
        "You are an expert haute couture apparel patternmaker and technical CAD designer. Generate an architectural, factory-production technical flat sketch (tech pack flat specification) for this exact garment shown in the reference image.",
        "",
        "LAYOUT & PRESENTATION:",
        "- True 2D CAD technical vector flat lay (NO 3D perspective, NO angled views, perfectly symmetrical flat presentation).",
        "- Side-by-side presentation: Complete FRONT view on the left, Complete BACK view on the right.",
        "- Pristine, solid, pure white background (#FFFFFF).",
        "- High-contrast black line art (#000000). ABSOLUTELY NO human bodies, NO faces, NO hair, NO mannequin dummy stands, NO grey shading, NO photographic textures, NO color fills.",
        "",
        "ARCHITECTURAL CONSTRUCTION DETAILS:",
        f"- Garment Type: {garment_type.upper()}.",
        f"- Closures & Finishes: {closures_desc}.",
        "- Crisp outline contour lines (1.5pt solid black) defining the exact silhouette shape.",
        "- Precise internal construction lines (1.0pt): neckline, lapels, collar roll, armholes, shoulder seams, side seams, waist seam, yoke, pleats, vents.",
        "- Functional tailoring details: darts (bust/waist darts), pocket welts and flaps, placket, buttonhole placements, cuff buttons, hem allowances.",
        "- Visible topstitching: fine dashed line work (0.75pt) along lapel edges, collars, plackets, pockets, and hem.",
        "- Label 'FRONT' beneath the left sketch, and 'BACK' beneath the right sketch.",
        "",
        "FRAMING (CRITICAL):",
        "- Landscape canvas. BOTH complete garments, every dimension line, arrow and label must sit fully INSIDE the image with a clear white margin of at least 8% on every side.",
        "- NEVER crop, clip or cut off any garment edge, sleeve, hem, dimension line or text. Scale the drawing down if needed so everything fits.",
        "- Write all dimension text horizontally (never rotated or vertical) so it stays legible.",
    ]

    if effective_size:
        callouts = garment_callouts(garment_type, effective_size, spec.gender, measurements)
        if callouts:
            spec_lines = ", ".join(f"{k}: {v}" for k, v in callouts.items())
            example = "; ".join(f"'{k}: {v}'" for k, v in list(callouts.items())[:2])
            custom = " The client supplied their own tape measurements, already reflected in these numbers." if measurements else ""
            prompt_parts.extend([
                "",
                f"MANDATORY ARCHITECTURAL MEASUREMENT CALLOUTS FOR SIZE {effective_size}:",
                f"The garment is tailored to SIZE {effective_size}.{custom} You MUST draw technical CAD dimension lines directly onto the flat sketch, using EXACTLY these values and no others: {spec_lines}.",
                "1. Draw thin architectural dimension extension lines and leader lines with distinct double-ended dimension arrows across each measurement point listed above.",
                f"2. Render clearly legible dimension text next to each arrow using the exact label and number given (for example {example}). Do not invent, round or alter any number.",
                f"3. Place a prominent specification title block at the top: 'SPECIFICATION TECH PACK — SIZE {effective_size}'.",
            ])
        else:
            prompt_parts.extend([
                "",
                f"MANDATORY ARCHITECTURAL MEASUREMENT CALLOUTS FOR SIZE {effective_size}:",
                f"The garment is tailored to SIZE {effective_size}. Draw thin CAD dimension lines with double-ended arrows and numerical centimeter labels for Size {effective_size} indicating chest width, waist width, length, and sleeve dimensions.",
                f"Place a specification title block at the top: 'SPECIFICATION TECH PACK — SIZE {effective_size}'.",
            ])
    else:
        prompt_parts.extend([
            "",
            "ARCHITECTURAL MEASUREMENT GUIDELINES:",
            "Draw thin technical CAD dimension lines with leader arrows indicating key proportional tailoring landmarks (Chest width, Waist, Hip, Full Length, and Hem sweep) with standard proportional drafting callouts.",
            "Place a specification title block at the top: 'SPECIFICATION TECH PACK — PROPORTIONAL DRAFT'.",
        ])

    prompt = "\n".join(prompt_parts)

    response = imaging().models.generate_content(
        model=settings.model_image,
        contents=[types.Part.from_bytes(data=image, mime_type=mime), prompt],
        config=_FLATS_CONFIG,
    )
    return extract_image(response)

