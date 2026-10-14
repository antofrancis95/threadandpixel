import pytest
from app.ai.guardrails import apply_output_guardrail, sanitize_input_text, validate_spec_guardrail
from app.ai.tailor import AtelierCouturierAgent
from app.models import DesignSpec, TailorTurn


def test_adk_agent_configured():
    assert AtelierCouturierAgent.name == "couturier_agent"
    assert "gemini" in AtelierCouturierAgent.model


def test_trademark_shield_intercepts_protected_brands():
    clean, notice = sanitize_input_text("Can you make me a Gucci replica gown?")
    assert "Gucci" not in clean
    assert "luxury haute couture" in clean
    assert notice is not None
    assert "Gucci" in notice
    assert "bespoke" in notice


def test_trademark_shield_passes_unbranded_queries():
    clean, notice = sanitize_input_text("A pastel blue silk chiffon maxi dress with flutter sleeves.")
    assert clean == "A pastel blue silk chiffon maxi dress with flutter sleeves."
    assert notice is None


def test_fabric_whitelist_fallback():
    spec = DesignSpec(
        garment_type="dress",
        length="maxi",
        sleeve="long",
        fabric_id="unobtanium-weave",
        color_hex="#123456",
        closures=["zipper"],
        embellishments=[],
        lining=False,
    )
    validated = validate_spec_guardrail(spec)
    assert validated.fabric_id == "cotton-poplin"


def test_output_guardrail_assigns_suggested_action():
    turn = TailorTurn(
        user_transcript="Long sheer sleeves",
        spec=DesignSpec(
            garment_type="dress",
            length="maxi",
            sleeve="long",
            fabric_id="silk-chiffon",
            color_hex="#B8D4F0",
            closures=["zipper"],
            embellishments=["embroidery"],
            lining=True,
        ),
        image_prompt="Editorial photo",
        edit_instruction="Make sleeves sheer",
        reply_to_user="I have elongated the sleeves in sheer silk chiffon.",
        suggested_action="none",
    )
    guarded = apply_output_guardrail(turn)
    # When edit_instruction is present without existing portrait, suggests virtual fitting room!
    assert guarded.suggested_action == "fitting"

    # When portrait is already on file, guardrail preserves "none" and does not prompt to upload again
    guarded_with_vto = apply_output_guardrail(turn, has_vto=True)
    assert guarded_with_vto.suggested_action == "none"


def test_consultation_action_when_not_ready_to_sketch():
    turn = TailorTurn(
        user_transcript="I'm looking for a polo",
        spec=DesignSpec(
            garment_type="shirt",
            length="hip",
            sleeve="short",
            fabric_id="cotton-jersey",
            color_hex="#1B2A4A",
            closures=["buttons"],
            embellishments=[],
            lining=False,
            gender="menswear",
        ),
        image_prompt="",
        edit_instruction="",
        reply_to_user="A bespoke polo is a wonderful choice. What color, fit, fabric, and size would you prefer?",
        suggested_action="none",
        ready_to_sketch=False,
    )
    guarded = apply_output_guardrail(turn)
    assert guarded.suggested_action == "consultation"
    assert guarded.ready_to_sketch is False


def test_spec_size_validation():
    spec = DesignSpec(
        garment_type="shirt",
        length="hip",
        sleeve="short",
        fabric_id="pique-cotton-custom",
        color_hex="#1B2A4A",
        closures=["buttons"],
        embellishments=[],
        lining=False,
        size="L",
        fit="slim fit",
    )
    validated = validate_spec_guardrail(spec)
    assert validated.size == "L"
    assert validated.fabric_id == "cotton-jersey"


def test_size_measurements_catalog():
    from app.ai.designer import SIZE_MEASUREMENTS

    assert "shirt" in SIZE_MEASUREMENTS
    assert "top" in SIZE_MEASUREMENTS
    assert "dress" in SIZE_MEASUREMENTS
    assert "suit" in SIZE_MEASUREMENTS
    for size in ("XS", "S", "M", "L", "XL", "XXL"):
        assert size in SIZE_MEASUREMENTS["shirt"]
        assert "Chest Width" in SIZE_MEASUREMENTS["shirt"][size]
        assert "Body Length" in SIZE_MEASUREMENTS["shirt"][size]


