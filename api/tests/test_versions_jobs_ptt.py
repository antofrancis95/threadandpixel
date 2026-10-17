from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.auth import User, current_user
from app.live import _live_config
from app.main import app
from app.service import job_response, restore_version_service

USER = User(uid="u", email="a@b.c", role="designer", is_anonymous=False)


def _client():
    app.dependency_overrides[current_user] = lambda: USER
    return TestClient(app)


def teardown_module(_):
    app.dependency_overrides.pop(current_user, None)


def test_job_response_carries_stage_and_timing():
    with patch("app.storage.signed_url", return_value="https://signed/v.mp4"):
        running = job_response("j1", {"design_id": "d", "status": "running", "stage": "rendering", "started_at": 1.0})
        assert running["stage"] == "rendering" and running["typical_s"] > 0 and running["elapsed_s"] > 0
        done = job_response("j1", {"design_id": "d", "status": "done", "video_path": "p"})
        assert done["stage"] == "done" and done["video_url"] == "https://signed/v.mp4"
        failed = job_response("j1", {"design_id": "d", "status": "error", "error": "boom"})
        assert failed["stage"] == "failed" and failed["elapsed_s"] is None


def test_versions_routes_delegate_to_service():
    client = _client()
    with patch("app.main.list_versions_service", return_value=[{"version": 1, "is_current": True}]) as ls:
        r = client.get("/designs/d1/versions")
        assert r.status_code == 200 and r.json()[0]["version"] == 1
        assert ls.call_args.args[1] == "d1"
    with patch("app.main.restore_version_service", return_value={"design_id": "d1", "version": 3}) as rs:
        r = client.post("/designs/d1/versions/1/restore")
        assert r.status_code == 200 and r.json()["version"] == 3
        assert rs.call_args.args[1:] == ("d1", 1)


def test_restore_makes_a_new_version_and_drops_derived_assets():
    ref = MagicMock()
    ref.id = "d1"
    old = MagicMock()
    old.exists = True
    old.to_dict.return_value = {"image_path": "designs/d1/v1.png", "spec": {"garment_type": "jacket"}}
    ref.collection.return_value.document.return_value.get.return_value = old
    data = {
        "current_version": 3,
        "current_image_path": "designs/d1/v3.png",
        "spec": {"garment_type": "dress"},
        "flats_path": "f",
        "tryon_path": "t",
        "runway_path": "r",
        "messages": [],
    }
    with (
        patch("app.service.owned_design", return_value=(ref, data)),
        patch("app.service.storage.download", return_value=(b"png", "image/png")),
        patch("app.service.add_version", return_value="designs/d1/v4.png") as add,
        patch("app.service.save_turn"),
        patch("app.storage.signed_url", side_effect=lambda p, **_: f"https://signed/{p}"),
    ):
        res = restore_version_service(USER, "d1", 1)
    assert add.call_args.args[1] == 4 and add.call_args.args[5] == {"garment_type": "jacket"}
    updates = ref.update.call_args.args[0]
    assert updates["current_version"] == 4 and updates["spec"] == {"garment_type": "jacket"}
    assert updates["flats_path"] is None and updates["tryon_path"] is None and updates["runway_path"] is None
    assert res["version"] == 4 and res["image_url"] == "https://signed/designs/d1/v4.png"
    assert res["flats_url"] is None


def test_restore_of_current_version_is_a_no_op():
    ref = MagicMock()
    ref.id = "d1"
    old = MagicMock()
    old.exists = True
    old.to_dict.return_value = {"image_path": "designs/d1/v2.png"}
    ref.collection.return_value.document.return_value.get.return_value = old
    data = {"current_version": 2, "current_image_path": "designs/d1/v2.png", "spec": {}, "messages": []}
    with patch("app.service.owned_design", return_value=(ref, data)), patch("app.storage.signed_url", return_value="u"):
        res = restore_version_service(USER, "d1", 2)
    assert res["version"] == 2
    ref.update.assert_not_called()


def test_push_to_talk_disables_automatic_activity_detection():
    assert _live_config("").realtime_input_config is None
    cfg = _live_config("", manual_activity=True)
    assert cfg.realtime_input_config.automatic_activity_detection.disabled is True
