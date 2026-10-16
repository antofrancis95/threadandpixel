from app.ai.designer import BODY_PRESETS, SIZE_MEASUREMENTS, body_preset, garment_callouts


def test_preset_tape_reproduces_size_chart():
    # Pre-filled tape values must give exactly the chart numbers, so flats and tape never disagree by default.
    for garment, sizes in SIZE_MEASUREMENTS.items():
        for size, chart in sizes.items():
            preset = body_preset(None, garment, size)
            assert garment_callouts(garment, size, None, preset) == chart


def test_custom_tape_scales_matching_dimensions_only():
    base = garment_callouts("trousers", "M", "menswear")
    tape = dict(BODY_PRESETS["menswear"]["M"], waist_cm=94)  # ~12% bigger waist
    custom = garment_callouts("trousers", "M", "menswear", tape)
    assert int(custom["Waist Width"].split()[0]) > int(base["Waist Width"].split()[0])
    assert custom["Inseam"] == base["Inseam"]
    assert custom["Hem Opening"] == base["Hem Opening"]


def test_height_scales_lengths():
    base = garment_callouts("suit", "M", "menswear")
    tape = dict(BODY_PRESETS["menswear"]["M"], height_cm=190)
    custom = garment_callouts("suit", "M", "menswear", tape)
    assert int(custom["Jacket Length"].split()[0]) > int(base["Jacket Length"].split()[0])
    assert custom["Chest Width"] == base["Chest Width"]


def test_no_tape_returns_size_chart():
    assert garment_callouts("suit", "L", "menswear") == SIZE_MEASUREMENTS["suit"]["L"]


def test_dress_defaults_to_womenswear_preset():
    assert body_preset("unisex", "dress", "M") == BODY_PRESETS["womenswear"]["M"]
    assert body_preset(None, "suit", "M") == BODY_PRESETS["menswear"]["M"]


def test_flats_endpoint_forwards_optional_tape():
    from unittest.mock import patch

    from fastapi.testclient import TestClient

    from app.auth import User, current_user
    from app.main import app

    app.dependency_overrides[current_user] = lambda: User(uid="u", email="a@b.c", role="designer", is_anonymous=False)
    try:
        client = TestClient(app)
        with patch("app.main.generate_flats_service", return_value={"flats_url": "x", "size": "L"}) as svc:
            assert client.post("/designs/d1/flats?size=L").status_code == 200
            assert svc.call_args.kwargs["measurements"] is None
            body = {"measurements": {"waist_cm": 90, "bust_cm": None}}
            assert client.post("/designs/d1/flats?size=L", json=body).status_code == 200
            assert svc.call_args.kwargs["measurements"] == {"waist_cm": 90.0}
    finally:
        app.dependency_overrides.pop(current_user, None)
