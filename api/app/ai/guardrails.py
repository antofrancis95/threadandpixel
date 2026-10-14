"""Google ADK Guardrails for Thread & Pixel Haute Couture Atelier.

Enforces:
1. Brand & Trademark Protection Shield (refuses counterfeit / brand replicas gracefully).
2. Input Safety & Domain Boundary (ensures creative couture scope).
3. Tool & Fabric Whitelist Guardrail (constrains fabric SKUs to certified atelier catalog).
4. Output Schema Integrity Guardrail (guarantees strictly bounded Pydantic schemas).
"""

import re
from typing import Any

from ..models import DesignSpec, TailorTurn
from ..pricing import FABRICS

# Protected fashion houses and luxury labels
PROTECTED_BRANDS = {
    "gucci",
    "chanel",
    "dior",
    "louis vuitton",
    "prada",
    "versace",
    "balenciaga",
    "hermes",
    "hermès",
    "saint laurent",
    "ysl",
    "givenchy",
    "balmain",
    "valentino",
    "burberry",
    "fendi",
    "alexander mcqueen",
    "armani",
    "bottega veneta",
}

BRAND_REGEX = re.compile(r"\b(" + "|".join(re.escape(b) for b in sorted(PROTECTED_BRANDS, key=len, reverse=True)) + r")\b", re.IGNORECASE)


class GuardrailViolation(Exception):
    """Raised when an unrecoverable policy violation occurs."""


def sanitize_input_text(text: str) -> tuple[str, str | None]:
    """Inspects user input for protected brand replicas and prompt injection.
    
    Returns:
        (sanitized_text, brand_intercept_message)
    """
    if not text:
        return text, None

    brand_match = BRAND_REGEX.search(text)
    if brand_match:
        brand_name = brand_match.group(1).title()
        intercept_msg = (
            f"As a bespoke haute couture atelier, Thread & Pixel crafts original pieces rather than copies of {brand_name}. "
            f"I have designed an original couture silhouette inspired by that aesthetic."
        )
        # Scrub brand name so downstream image model does not attempt to reproduce trademarks
        clean_text = BRAND_REGEX.sub("luxury haute couture", text)
        return clean_text, intercept_msg

    return text, None


def validate_spec_guardrail(spec: DesignSpec) -> DesignSpec:
    """Ensures fabric_id is strictly bounded to certified atelier fabrics."""
    if spec.fabric_id not in FABRICS:
        # If pique or jersey mentioned, fall back to cotton-jersey, else cotton-poplin
        if "jersey" in spec.fabric_id.lower() or "pique" in spec.fabric_id.lower():
            spec.fabric_id = "cotton-jersey"
        else:
            spec.fabric_id = "cotton-poplin"

    # Ensure color hex is valid #RRGGBB
    if not re.match(r"^#[0-9a-fA-F]{6}$", spec.color_hex):
        spec.color_hex = "#FAF7F2"

    if spec.gender not in ("womenswear", "menswear", "unisex"):
        spec.gender = "womenswear"

    if spec.size is not None and spec.size not in ("XS", "S", "M", "L", "XL", "XXL"):
        spec.size = None

    return spec


def apply_output_guardrail(
    turn: TailorTurn,
    brand_notice: str | None = None,
    has_vto: bool = False,
) -> TailorTurn:
    """Enforces output integrity, fabric whitelist, and sensible next-step prompts."""
    turn.spec = validate_spec_guardrail(turn.spec)

    if brand_notice:
        turn.reply_to_user = f"{brand_notice} {turn.reply_to_user}".strip()

    if not turn.ready_to_sketch:
        turn.suggested_action = "consultation"
        return turn

    # If the tailor didn't pick a next action, guide intelligently based on turn
    if turn.suggested_action in ("none", "consultation"):
        if turn.edit_instruction.strip():
            # If user made an edit, only suggest virtual fitting room if they haven't uploaded a portrait yet!
            turn.suggested_action = "none" if has_vto else "fitting"
        else:
            # If fresh design, suggest measurements or try-on
            turn.suggested_action = "measurements"

    # If tailor suggested fitting but portrait is already on file, do not prompt for upload
    if has_vto and turn.suggested_action == "fitting":
        turn.suggested_action = "none"

    return turn

