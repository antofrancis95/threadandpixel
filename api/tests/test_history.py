from unittest.mock import patch
from app.models import DesignSpec
from app.service import design_response


def test_design_response_preserves_messages_array():
    spec = DesignSpec(
        garment_type="dress",
        length="maxi",
        sleeve="long",
        fabric_id="silk-chiffon",
        color_hex="#E8D8C8",
        closures=["zipper"],
        embellishments=[],
        lining=True,
    )
    doc_data = {
        "design_id": "des-test-123",
        "current_version": 2,
        "spec": spec.model_dump(),
        "current_image_path": "designs/des-test-123/v2.png",
        "flats_path": None,
        "tryon_path": None,
        "runway_path": None,
        "suggested_action": "measurements",
        "messages": [
            {"role": "user", "text": "I want an emerald velvet ballgown."},
            {"role": "model", "text": "Splendid! I have draped an emerald velvet ballgown."},
            {"role": "user", "text": "Can we lengthen the train?"},
            {"role": "model", "text": "I have extended the hemline to floor sweeping."},
        ],
    }

    with patch("app.storage.signed_url", return_value="https://storage.googleapis.com/test.png"):
        res = design_response("des-test-123", doc_data)
        assert isinstance(res, dict)
        assert res["design_id"] == "des-test-123"
        assert res["messages"] is not None
        assert len(res["messages"]) == 4
        assert res["messages"][0]["role"] == "user"
        assert res["messages"][0]["text"] == "I want an emerald velvet ballgown."
        assert res["messages"][1]["role"] == "model"
        assert res["messages"][2]["role"] == "user"
        assert res["messages"][3]["role"] == "model"
        assert res["messages"][3]["text"] == "I have extended the hemline to floor sweeping."

