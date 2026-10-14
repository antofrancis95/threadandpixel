import pytest
from app.ai.guardrails import (
    apply_output_guardrail,
    get_off_topic_redirection,
    is_off_topic_query,
    sanitize_input_text,
    validate_spec_guardrail,
)
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


def test_is_off_topic_query_detection():
    # Malayalam medical insurance queries (from user screenshot)
    malayalam_insurance = (
        "മെഡിക്കൽ ഇൻഷുറൻസ് റിപ്പോർട്ടർ അവിടെ എനിക്ക് എഴുതാൻ പറ്റില്ല എന്ന് ഞാൻ തന്നെ ആൻസർ തന്നാലോ? "
        "ഞാൻ അവിടെ എഴുതി പോയിട്ട് 12 ലാക്സ് എന്ന്. ആ ടിക്ക് ഇടാൻ പറ്റുന്നില്ലേ? ഞാൻ എസ് എന്ന് എഴുതിയിട്ടോ?"
    )
    assert is_off_topic_query(malayalam_insurance) is True

    # English medical insurance queries
    assert is_off_topic_query("How do I fill out this medical insurance claim form?") is True
    assert is_off_topic_query("Where do I submit my income tax return?") is True

    # Legitimate bespoke fashion queries must pass
    assert is_off_topic_query("A bespoke midnight navy wool-suiting tuxedo with satin lapels.") is False
    assert is_off_topic_query("Can you make me a charcoal checkered blazer in size 42?") is False
    assert is_off_topic_query("എനിക്ക് കറുത്ത നിറത്തിലുള്ള സ്യൂട്ട് വേണം") is False


def test_output_guardrail_handles_explicit_off_topic():
    current_spec = DesignSpec(
        garment_type="jacket",
        length="hip",
        sleeve="long",
        fabric_id="wool-suiting",
        color_hex="#333333",
        closures=["buttons"],
        embellishments=[],
        lining=True,
    )
    turn = TailorTurn(
        user_transcript="Someone in the background talking about insurance",
        spec=DesignSpec(
            garment_type="dress",
            length="maxi",
            sleeve="short",
            fabric_id="cotton-poplin",
            color_hex="#FFFFFF",
            closures=["none"],
            embellishments=[],
            lining=False,
        ),
        image_prompt="A dress",
        edit_instruction="change dress",
        reply_to_user="I am The Master Couturier at Thread & Pixel. Shall we return to your jacket design?",
        suggested_action="fitting",
        ready_to_sketch=True,
        is_off_topic=True,
    )
    guarded = apply_output_guardrail(turn, current_spec=current_spec)
    assert guarded.is_off_topic is True
    assert guarded.ready_to_sketch is False
    assert guarded.edit_instruction == ""
    assert guarded.suggested_action == "none"
    assert guarded.spec.garment_type == "jacket"
    assert guarded.spec.fabric_id == "wool-suiting"


def test_output_guardrail_intercepts_disclaimer_leak_in_malayalam():
    # If the model slipped and generated medical insurance advice with disclaimer (as in screenshot)
    disclaimer_leak = (
        "മെഡിക്കൽ ഇൻഷുറൻസ് ഫോമിൽ വിവരങ്ങൾ കൃത്യമായി രേഖപ്പെടുത്തേണ്ടത് വളരെ പ്രധാനമാണ്. "
        "ഇത് വൈദ്യോപദേശമോ രോഗനിർണ്ണയമോ അല്ല; കൃത്യമായ വിവരങ്ങൾക്ക് ദയവായി ഒരു ഇൻഷുറൻസ് പ്രൊഫഷണലിനെയോ സമീപിക്കുക."
    )
    turn = TailorTurn(
        user_transcript="മെഡിക്കൽ ഇൻഷുറൻസ് റിപ്പോർട്ടർ",
        spec=DesignSpec(
            garment_type="jacket",
            length="hip",
            sleeve="long",
            fabric_id="wool-suiting",
            color_hex="#333333",
            closures=["buttons"],
            embellishments=[],
            lining=True,
        ),
        image_prompt="",
        edit_instruction="random edit",
        reply_to_user=disclaimer_leak,
        suggested_action="measurements",
        ready_to_sketch=True,
        is_off_topic=False,  # Model initially forgot to mark it
    )
    guarded = apply_output_guardrail(turn)
    # Guardrail must catch the disclaimer and intercept!
    assert guarded.is_off_topic is True
    assert guarded.ready_to_sketch is False
    assert guarded.edit_instruction == ""
    assert guarded.suggested_action == "none"
    # Reply must be sanitized to Couturier deflection in Malayalam
    assert "മാസ്റ്റർ കൗച്ചൂറിയർ" in guarded.reply_to_user
    assert "വൈദ്യോപദേശമോ" not in guarded.reply_to_user


def test_design_upload_and_occasion_actions_preserved():
    turn_upload = TailorTurn(
        user_transcript="I have a sketch I want to upload",
        spec=DesignSpec(
            garment_type="dress",
            length="maxi",
            sleeve="sleeveless",
            fabric_id="silk-charmeuse",
            color_hex="#E8D8C8",
            closures=["zipper"],
            embellishments=[],
            lining=True,
        ),
        image_prompt="",
        edit_instruction="",
        reply_to_user="Please upload your sketch to generate an outfit based on it.",
        suggested_action="design_upload",
        ready_to_sketch=False,
    )
    guarded_upload = apply_output_guardrail(turn_upload)
    assert guarded_upload.suggested_action == "design_upload"

    turn_occasion = TailorTurn(
        user_transcript="I have a summer wedding to attend",
        spec=DesignSpec(
            garment_type="dress",
            length="midi",
            sleeve="short",
            fabric_id="silk-chiffon",
            color_hex="#B0E0E6",
            closures=["zipper"],
            embellishments=[],
            lining=True,
        ),
        image_prompt="",
        edit_instruction="",
        reply_to_user="A summer wedding is marvelous. Please share your photo and occasion details.",
        suggested_action="occasion_stylist",
        ready_to_sketch=False,
    )
    guarded_occasion = apply_output_guardrail(turn_occasion)
    assert guarded_occasion.suggested_action == "occasion_stylist"


def test_message_in_fields_support():
    from app.models import MessageIn

    msg = MessageIn(
        text="A dress based on my uploaded sketch",
        design_image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        design_image_mime="image/png",
        occasion="Black-tie Gala",
        gender="womenswear",
        size="M",
    )
    assert msg.occasion == "Black-tie Gala"
    assert msg.design_image_mime == "image/png"
    assert msg.size == "M"


def test_detect_semantic_gender():
    from app.ai.tailor import detect_semantic_gender

    assert detect_semantic_gender("I need a bespoke tuxedo for a black-tie gala") == "menswear"
    assert detect_semantic_gender("Tailor a navy blazer and charcoal trousers for a gentleman") == "menswear"
    assert detect_semantic_gender("Designing a suit for my husband") == "menswear"

    assert detect_semantic_gender("I need an emerald evening gown for a red carpet gala") == "womenswear"
    assert detect_semantic_gender("Cocktail dress in silk chiffon for a summer wedding") == "womenswear"
    assert detect_semantic_gender("A bespoke skirt and corset ensemble for my wife") == "womenswear"

    assert detect_semantic_gender("Something chic for an evening event") is None
    assert detect_semantic_gender(None) is None
