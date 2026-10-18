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

# Gemini 4 Argon (MODEL_PRO=gemini-4-argon) is enabled on this project and returns this schema unchanged.
# Tested 18 Oct 2026: sharper critiques, but 2 of 4 calls took 60-78s (3.1 Pro: ~20s), and the quote
# waits on this call. It ignores temperature. When swapping, cap it and fall back to 3.1 Pro. Turn the
# client's retries off for the capped call, or each retry restarts the clock (a 1s cap took 23s):
#
#     contents = [types.Part.from_bytes(data=image, mime_type=mime), f"Spec: {spec.model_dump_json()}"]
#     config = json_config(TechPackCritique, SYSTEM_PROMPT, temperature=0.2)
#     config.http_options = types.HttpOptions(timeout=20_000, retry_options=types.HttpRetryOptions(attempts=1))
#     try:
#         response = gemini().models.generate_content(model=settings.model_pro, contents=contents, config=config)
#     except Exception:
#         config.http_options = None
#         response = gemini().models.generate_content(
#             model="gemini-3.1-pro-preview", contents=contents, config=config
#         )


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
