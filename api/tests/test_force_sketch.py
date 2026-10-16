from unittest.mock import MagicMock, patch

from app.ai import tailor
from app.auth import User
from app.live import _run_tool
from app.models import DesignSpec, MessageIn, TailorTurn


def _turn(ready: bool, off_topic: bool = False) -> TailorTurn:
    spec = DesignSpec(
        garment_type="shirt",
        length="hip",
        sleeve="long",
        fabric_id="cotton-poplin",
        color_hex="#FFFFFF",
        closures=[],
        embellishments=[],
        lining=False,
    )
    return TailorTurn(
        user_transcript="white shirt",
        spec=spec,
        image_prompt="a white shirt",
        edit_instruction="",
        reply_to_user="Which fabric?",
        ready_to_sketch=ready,
        is_off_topic=off_topic,
    )


def _converse(turn: TailorTurn, **kwargs) -> TailorTurn:
    with patch("app.ai.tailor.gemini") as g, patch("app.ai.tailor.parse_structured", return_value=turn):
        g.return_value.models.generate_content.return_value = MagicMock()
        return tailor.converse(MessageIn(text="white shirt"), [], None, **kwargs)


def test_tailor_keeps_consulting_by_default():
    assert _converse(_turn(ready=False)).ready_to_sketch is False


def test_force_sketch_overrides_consultation():
    assert _converse(_turn(ready=False), force_sketch=True).ready_to_sketch is True


def test_force_sketch_never_overrides_off_topic():
    turn = _converse(_turn(ready=False, off_topic=True), force_sketch=True)
    assert turn.is_off_topic is True
    assert turn.ready_to_sketch is False


def test_live_tool_forces_sketch_on_create_and_continue():
    user = User(uid="u", email="a@b.c", role="designer", is_anonymous=False)
    with patch("app.live.create_design", return_value={}) as create, patch("app.live.continue_design", return_value={}) as cont:
        _run_tool(user, {"design_id": None}, "white shirt", "menswear", "M", "tailored")
        assert create.call_args.kwargs["force_sketch"] is True
        _run_tool(user, {"design_id": "d1"}, "white shirt", "menswear", "M", "tailored")
        assert cont.call_args.kwargs["force_sketch"] is True
