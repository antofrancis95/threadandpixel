"""Smoke-test Gemini Live and Veo.

Usage: python scripts/smoke_media.py [live] [veo]
"""

import asyncio
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from google.genai import types  # noqa: E402

from app import storage  # noqa: E402
from app.ai import runway  # noqa: E402
from app.clients import live  # noqa: E402
from app.config import settings  # noqa: E402
from app.live import _live_config  # noqa: E402


async def smoke_live():
    print(f"[live] model={settings.model_live} location={settings.live_location}")
    audio_bytes, transcript, tool_calls = 0, [], []
    async with live().aio.live.connect(model=settings.model_live, config=_live_config()) as session:
        await session.send_realtime_input(text="Hi! I'd like a short red linen summer dress with puff sleeves.")
        for _ in range(4):
            async for resp in session.receive():
                if resp.tool_call:
                    tool_calls += [(c.name, c.args) for c in resp.tool_call.function_calls or []]
                    for c in resp.tool_call.function_calls or []:
                        await session.send_tool_response(function_responses=[types.FunctionResponse(
                            id=c.id, name=c.name, response={"reply": "Created a red linen mini dress with puff sleeves."})])
                sc = resp.server_content
                if sc and sc.model_turn:
                    audio_bytes += sum(len(p.inline_data.data) for p in sc.model_turn.parts or [] if p.inline_data)
                if sc and sc.output_transcription and sc.output_transcription.text:
                    transcript.append(sc.output_transcription.text)
            if audio_bytes and tool_calls:
                break
    print(f"[live] PASS audio={audio_bytes}B tool_calls={tool_calls}\n       said: {''.join(transcript)[:300]}")


def smoke_veo():
    frame = ROOT / "tmp" / "tryon.jpg"
    print(f"[veo] model={settings.model_video} frame={frame.name}")
    op = runway.start(frame.read_bytes(), "image/jpeg", f"smoke/runway-{int(time.time())}/")
    started = time.time()
    while True:
        done, path, error = runway.poll(op)
        if done:
            break
        time.sleep(10)
    if error:
        raise SystemExit(f"[veo] FAIL {error}")
    out = ROOT / "tmp" / "runway.mp4"
    out.write_bytes(storage.download(path)[0])
    print(f"[veo] PASS in {time.time() - started:.0f}s -> {path} (saved tmp/runway.mp4)")


if __name__ == "__main__":
    targets = set(sys.argv[1:]) or {"live", "veo"}
    if "live" in targets:
        asyncio.run(smoke_live())
    if "veo" in targets:
        smoke_veo()
