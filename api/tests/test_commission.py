from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth import User, current_user
from app.main import app
from app.models import MessageIn
from app.service import continue_design, create_techpack_service, generate_flats_service, order_for, restore_version_service

USER = User(uid="u", email="a@b.c", role="designer", is_anonymous=False)


def _client():
    app.dependency_overrides[current_user] = lambda: USER
    return TestClient(app)


def teardown_module(_):
    app.dependency_overrides.pop(current_user, None)


def _design_ref(quote_version: int = 2):
    ref = MagicMock()
    ref.id = "d1"
    quote = MagicMock()
    quote.exists = True
    quote.to_dict.return_value = {
        "version": quote_version,
        "size": "M",
        "measurements": None,
        "techpack": {},
        "quote": {"total": 420.0},
    }
    ref.collection.return_value.document.return_value.get.return_value = quote
    return ref


DESIGN = {"current_version": 2, "spec": {}, "current_image_path": "designs/d1/v2.png"}


def test_ordering_seals_the_design():
    ref = _design_ref()
    store = MagicMock()
    store.collection.return_value.document.return_value.id = "o1"
    with (
        patch("app.main.owned_design", return_value=(ref, dict(DESIGN))),
        patch("app.main.order_for", return_value=None),
        patch("app.main.db", return_value=store),
    ):
        r = _client().post("/designs/d1/order", json={"quote_id": "q1"})
    assert r.status_code == 200 and r.json() == {"order_id": "o1"}
    sealed = ref.update.call_args.args[0]
    assert sealed["order_id"] == "o1" and sealed["suggested_action"] == "none"


def test_a_commissioned_design_cannot_be_ordered_twice():
    ref = _design_ref()
    store = MagicMock()
    with (
        patch("app.main.owned_design", return_value=(ref, DESIGN | {"order_id": "o1"})),
        patch("app.main.db", return_value=store),
    ):
        r = _client().post("/designs/d1/order", json={"quote_id": "q1"})
    assert r.status_code == 409 and "already commissioned" in r.json()["detail"]
    store.collection.assert_not_called()
    ref.update.assert_not_called()


def test_a_design_ordered_before_the_seal_is_found_through_its_order():
    ref = _design_ref()
    store = MagicMock()
    with (
        patch("app.main.owned_design", return_value=(ref, dict(DESIGN))),
        patch("app.main.order_for", return_value="legacy"),
        patch("app.main.db", return_value=store),
    ):
        r = _client().post("/designs/d1/order", json={"quote_id": "q1"})
    assert r.status_code == 409
    store.collection.assert_not_called()


def test_order_for_prefers_the_id_on_the_design():
    with patch("app.service.db") as store:
        assert order_for(MagicMock(), {"order_id": "o1"}) == "o1"
    store.assert_not_called()


@pytest.mark.parametrize(
    "call",
    [
        lambda: continue_design(USER, "d1", MessageIn(text="make the sleeves sheer")),
        lambda: restore_version_service(USER, "d1", 1),
        lambda: generate_flats_service(USER, "d1", "L"),
        lambda: create_techpack_service(USER, "d1", "L"),
    ],
    ids=["refine", "restore", "flats", "quote"],
)
def test_a_commissioned_design_no_longer_changes(call):
    ref = MagicMock()
    with patch("app.service.owned_design", return_value=(ref, DESIGN | {"order_id": "o1"})):
        with pytest.raises(HTTPException) as exc:
            call()
    assert exc.value.status_code == 409
    ref.update.assert_not_called()
