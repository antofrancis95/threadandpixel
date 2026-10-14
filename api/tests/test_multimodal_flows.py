import io
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from app.auth import User, current_user
from app.main import app
from app.models import DesignSpec
from app.service import design_response

client = TestClient(app)

@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[current_user] = lambda: User(
        uid="test-user-123",
        email="designer@atelier.com",
        role="designer",
        is_anonymous=False,
    )
    yield
    app.dependency_overrides.pop(current_user, None)


def test_design_response_with_reference_and_occasion():
    spec = DesignSpec(
        garment_type="dress",
        length="midi",
        sleeve="sleeveless",
        fabric_id="silk-charmeuse",
        color_hex="#0A1128",
        closures=["zipper"],
        embellishments=[],
        lining=True,
    )
    doc_data = {
        "design_id": "des-occasion-456",
        "current_version": 1,
        "spec": spec.model_dump(),
        "current_image_path": "designs/des-occasion-456/v1.png",
        "reference_image_path": "designs/des-occasion-456/ref.png",
        "occasion": "Met Gala Premiere",
        "flats_path": None,
        "tryon_path": "designs/des-occasion-456/tryon.png",
        "runway_path": None,
        "suggested_action": "measurements",
        "messages": [
            {"role": "user", "text": "Curate an outfit for Met Gala Premiere"},
            {"role": "model", "text": "I have drafted a midnight navy silk gown."},
        ],
    }

    with patch("app.storage.signed_url", side_effect=lambda path: f"https://signed/{path}"):
        res = design_response("des-occasion-456", doc_data)
        assert res["design_id"] == "des-occasion-456"
        assert res["occasion"] == "Met Gala Premiere"
        assert res["reference_image_url"] == "https://signed/designs/des-occasion-456/ref.png"
        assert res["tryon_url"] == "https://signed/designs/des-occasion-456/tryon.png"


from PIL import Image

def test_create_design_from_image_endpoint():
    mock_design = {
        "design_id": "des-img-123",
        "version": 1,
        "spec": {
            "garment_type": "dress",
            "length": "maxi",
            "sleeve": "long",
            "fabric_id": "silk-crepe",
            "color_hex": "#D4AF37",
            "closures": ["zipper"],
            "embellishments": [],
            "lining": True,
            "gender": "womenswear",
            "size": "M",
        },
        "image_url": "https://signed/designs/des-img-123/v1.png",
        "flats_url": None,
        "tryon_url": None,
        "runway_url": None,
        "reference_image_url": "https://signed/designs/des-img-123/ref.png",
        "occasion": None,
        "suggested_action": "measurements",
        "reply": "I have translated your uploaded sketch into an haute couture silhouette.",
        "transcript": None,
        "messages": [],
    }

    with patch("app.main.create_design_from_image") as mock_service:
        mock_service.return_value = mock_design

        fake_buf = io.BytesIO()
        Image.new("RGB", (100, 100), color="blue").save(fake_buf, format="PNG")
        fake_buf.seek(0)
        files = {"file": ("sketch.png", fake_buf, "image/png")}
        data = {"text": "Inspired by 1920s Art Deco", "gender": "womenswear", "size": "M"}

        response = client.post("/designs/from-image", files=files, data=data)
        assert response.status_code == 200
        payload = response.json()
        assert payload["design_id"] == "des-img-123"
        assert payload["reference_image_url"] == "https://signed/designs/des-img-123/ref.png"
        mock_service.assert_called_once()


def test_create_design_for_occasion_endpoint():
    mock_design = {
        "design_id": "des-occ-789",
        "version": 1,
        "spec": {
            "garment_type": "suit",
            "length": "regular",
            "sleeve": "long",
            "fabric_id": "wool-gabardine",
            "color_hex": "#111111",
            "closures": ["buttons"],
            "embellishments": [],
            "lining": True,
            "gender": "menswear",
            "size": "L",
        },
        "image_url": "https://signed/designs/des-occ-789/v1.png",
        "flats_url": None,
        "tryon_url": "https://signed/designs/des-occ-789/tryon.png",
        "runway_url": None,
        "reference_image_url": None,
        "occasion": "Charity Gala",
        "suggested_action": "measurements",
        "reply": "I have curated a bespoke tuxedo for your Charity Gala and draped it on your portrait.",
        "transcript": None,
        "messages": [],
    }

    with patch("app.main.create_design_for_occasion") as mock_service:
        mock_service.return_value = mock_design

        fake_photo_buf = io.BytesIO()
        Image.new("RGB", (100, 100), color="green").save(fake_photo_buf, format="PNG")
        fake_photo_buf.seek(0)
        files = {"file": ("portrait.png", fake_photo_buf, "image/png")}
        data = {
            "occasion": "Charity Gala",
            "preferences": "Sleek velvet lapels",
            "gender": "menswear",
            "size": "L",
            "consent": "true",
        }

        response = client.post("/designs/for-occasion", files=files, data=data)
        assert response.status_code == 200
        payload = response.json()
        assert payload["design_id"] == "des-occ-789"
        assert payload["occasion"] == "Charity Gala"
        assert payload["tryon_url"] == "https://signed/designs/des-occ-789/tryon.png"
        mock_service.assert_called_once()
