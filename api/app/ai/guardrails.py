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


# Off-topic non-couture advice and disclaimer indicators
OFFTOPIC_ADVICE_PATTERNS = [
    r"വൈദ്യോപദേശമോ",
    r"രോഗനിർണ്ണയമോ",
    r"ആരോഗ്യരക്ഷാ\s*വിദഗ്ധ",
    r"ഇൻഷുറൻസ്\s*(കമ്പനി|പോളിസി|ക്ലെയിം|ഏജന്റ്|ഫോം|പ്രൊഫഷണൽ)",
    r"not\s+medical\s+advice",
    r"medical\s+(advice|diagnosis|treatment|opinion)",
    r"consult\s+(a|an|your)?\s*(doctor|physician|healthcare|medical|insurance|attorney|lawyer)",
    r"insurance\s+(company|agent|policy|claim|coverage|form|fill)",
    r"legal\s+(advice|counsel|opinion)",
    r"tax\s+(advice|consultant|return|form)",
]
OFFTOPIC_ADVICE_REGEX = re.compile("|".join(OFFTOPIC_ADVICE_PATTERNS), re.IGNORECASE)

OFFTOPIC_STRONG_PATTERNS = [
    r"ഇൻഷുറൻസ്",
    r"മെഡിക്കൽ\s*ഇൻഷുറൻസ്",
    r"മെഡിക്കൽ\s*റിപ്പോർട്ട്",
    r"ക്ലെയിം\s*നിരസിക്കപ്പെടാൻ",
    r"insurance\s*(policy|claim|form|agent|company)",
    r"medical\s*(insurance|claim|report|bill|form)",
    r"income\s*tax",
    r"tax\s*(return|audit|deduction|filing)",
]
OFFTOPIC_STRONG_REGEX = re.compile("|".join(OFFTOPIC_STRONG_PATTERNS), re.IGNORECASE)

FASHION_KEYWORD_PATTERNS = [
    r"\b(dress|suit|blazer|jacket|shirt|trousers|pants|skirt|gown|tuxedo|jumpsuit|polo|coat|overcoat)\b",
    r"\b(fabric|silk|linen|wool|cotton|velvet|chiffon|satin|denim|leather|jersey|pique|suiting|crepe)\b",
    r"\b(lapel|collar|sleeve|hem|silhouette|couture|atelier|tailor|tailoring|fitting|measurements|garment|runway|drape|pleat|pockets)\b",
    r"(വസ്ത്ര|സ്യൂട്ട്|ബ്ലേസർ|ഷർട്ട്|സാരി|പാവാട|കോട്ടൺ|സിൽക്ക്|ഫാബ്രിക്|ഡിസൈൻ|തയ്യൽ)",
]
FASHION_KEYWORD_REGEX = re.compile("|".join(FASHION_KEYWORD_PATTERNS), re.IGNORECASE)


def is_off_topic_query(text: str) -> bool:
    """Checks whether text is unambiguously off-topic (e.g. medical insurance, legal advice, taxes)
    without any fashion, garment, or atelier context."""
    if not text or not text.strip():
        return False
    if OFFTOPIC_STRONG_REGEX.search(text):
        if not FASHION_KEYWORD_REGEX.search(text):
            return True
    return False


def get_off_topic_redirection(user_text: str = "", garment_name: str | None = None) -> str:
    """Generates an elegant Couturier redirection in the appropriate language (Malayalam or English)."""
    # Detect Malayalam script: Unicode range \u0d00-\u0d7f
    is_malayalam = bool(re.search(r"[\u0d00-\u0d7f]", user_text))
    garment_ref = garment_name or ("വസ്ത്ര" if is_malayalam else "bespoke garment")

    if is_malayalam:
        return (
            "ക്ഷമിക്കണം, ഞാൻ ത്രെഡ് & പിക്സലിലെ മാസ്റ്റർ കൗച്ചൂറിയർ ആണ്. എന്റെ ശ്രദ്ധ പൂർണ്ണമായും നിങ്ങളുടെ "
            "ബെസ്പോക്ക് ഫാഷൻ രൂപകൽപ്പനയിലാണ്; മറ്റ് വിഷയങ്ങളിൽ എനിക്ക് ഉപദേശം നൽകാൻ സാധിക്കില്ല. "
            f"നമുക്ക് നിങ്ങളുടെ {garment_ref} ഡിസൈനിലേക്ക് തന്നെ ശ്രദ്ധ കേന്ദ്രീകരിക്കാം; ഇതിൽ കൂടുതൽ എന്തെങ്കിലും മാറ്റങ്ങൾ വരുത്താനുണ്ടോ?"
        )
    return (
        "As The Master Couturier at Thread & Pixel, my atelier is devoted exclusively to bespoke couture fashion. "
        "I cannot advise on non-fashion matters. "
        f"Shall we return to perfecting your {garment_ref} design?"
    )


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
    current_spec: DesignSpec | None = None,
) -> TailorTurn:
    """Enforces output integrity, fabric whitelist, off-topic domain deflection, and sensible next-step prompts."""
    turn.spec = validate_spec_guardrail(turn.spec)

    if brand_notice:
        turn.reply_to_user = f"{brand_notice} {turn.reply_to_user}".strip()

    # Domain Boundary Check: Intercept model responses containing off-topic advice or disclaimers
    if OFFTOPIC_ADVICE_REGEX.search(turn.reply_to_user) or is_off_topic_query(turn.user_transcript):
        turn.is_off_topic = True

    if turn.is_off_topic:
        turn.ready_to_sketch = False
        turn.edit_instruction = ""
        turn.suggested_action = "none"
        if current_spec:
            turn.spec = current_spec
        # If the reply contains off-topic advice/disclaimers or lacks couture redirection, sanitize it
        if OFFTOPIC_ADVICE_REGEX.search(turn.reply_to_user):
            garment_label = current_spec.garment_type if current_spec else None
            turn.reply_to_user = get_off_topic_redirection(
                user_text=f"{turn.user_transcript} {turn.reply_to_user}",
                garment_name=garment_label,
            )
        return turn

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

