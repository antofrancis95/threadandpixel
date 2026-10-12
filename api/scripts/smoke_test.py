"""Verify every Vertex AI model the app depends on.

Usage:
  python scripts/smoke_test.py --list     # discover model IDs only
  python scripts/smoke_test.py            # run all checks using IDs from .env
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from google.genai import types  # noqa: E402
from google.genai.types import Image, ProductImage, RecontextImageConfig, RecontextImageSource  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "tmp"
KEYWORDS = ("gemini-3", "image", "imagen", "veo", "try-on", "nano")


def list_models():
    from app.clients import gemini, imaging

    seen = set()
    for client in (gemini(), imaging()):
        for m in client.models.list():
            if m.name not in seen and any(k in m.name for k in KEYWORDS):
                seen.add(m.name)
                print(m.name)


def run_checks():
    from app.clients import gemini, imaging
    from app.config import settings

    OUT.mkdir(exist_ok=True)
    results = {}

    def check(name, fn):
        try:
            fn()
            results[name] = "PASS"
        except Exception as exc:  # report and continue
            results[name] = f"FAIL: {type(exc).__name__}: {exc}"[:300]
        print(f"[{name}] {results[name]}")

    for label, model in (("flash", settings.model_flash), ("lite", settings.model_lite), ("pro", settings.model_pro)):
        check(label, lambda m=model: print(gemini().models.generate_content(
            model=m, contents='Reply with {"ok": true}',
            config=types.GenerateContentConfig(response_mime_type="application/json")).text))

    state = {}

    def gen():
        from app.ai import designer
        state["img"], state["mime"] = designer.generate(
            "Photorealistic product photo of a pastel blue chiffon maxi dress on an invisible mannequin, white background")
        (OUT / "dress.png").write_bytes(state["img"])

    def edit():
        from app.ai import designer
        img, _ = designer.edit(state["img"], state["mime"], "Make the sleeves long and sheer")
        (OUT / "dress-edit.png").write_bytes(img)

    def vto():
        r = imaging().models.recontext_image(
            model=settings.model_vto,
            source=RecontextImageSource(
                person_image=Image(gcs_uri="gs://cloud-samples-data/generative-ai/image/woman.jpeg"),
                product_images=[ProductImage(product_image=Image(image_bytes=state["img"], mime_type=state["mime"]))]),
            config=RecontextImageConfig(number_of_images=1, safety_filter_level="BLOCK_LOW_AND_ABOVE"))
        (OUT / "tryon.jpg").write_bytes(r.generated_images[0].image.image_bytes)

    def bucket():
        from app import storage
        storage.upload("smoke/hello.txt", b"ok", "text/plain")
        print(storage.signed_url("smoke/hello.txt"))

    check("image-generate", gen)
    check("image-edit", edit)
    check("virtual-try-on", vto)
    check("storage+signed-url", bucket)

    print("\nSummary:")
    for k, v in results.items():
        print(f"  {k:20} {v}")
    print(f"Outputs in {OUT}")
    sys.exit(0 if all(v == "PASS" for v in results.values()) else 1)


if __name__ == "__main__":
    os.environ.setdefault("PYTHONUTF8", "1")
    list_models() if "--list" in sys.argv else run_checks()
