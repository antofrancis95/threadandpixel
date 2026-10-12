"""Manufacturer tech pack narrative + manufacturability critique (Gemini Pro)."""

from google.genai import types

from ..clients import gemini
from ..config import settings
from ..models import DesignSpec, TechPackCritique
from .common import json_config, parse_structured

SYSTEM_PROMPT = """You are a senior garment technologist preparing a tech pack for a small made-to-measure workshop.
Given the garment image and its structured spec, return:
- construction_notes: 4-8 ordered, practical construction steps.
- seam_types: seam/finish types used (e.g. French seam, overlocked, rolled hem).
- manufacturable: false if any visible detail cannot realistically be constructed as shown.
- issues: concrete problems and suggested fixes (empty if none).
Do not invent prices or yardage; those are computed elsewhere."""


def analyze(image: bytes, mime: str, spec: DesignSpec) -> TechPackCritique:
    response = gemini().models.generate_content(
        model=settings.model_pro,
        contents=[
            types.Part.from_bytes(data=image, mime_type=mime),
            f"Spec: {spec.model_dump_json()}",
        ],
        config=json_config(TechPackCritique, SYSTEM_PROMPT, temperature=0.2),
    )
    return parse_structured(response, TechPackCritique)
