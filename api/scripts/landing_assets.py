"""Generate the landing page media with the same model clients the studio uses.

Produces, in web/public/landing/:
  render.png        editorial render of the example dress (image model)
  flats.png         technical flats, front and back, size M (image model)
  person.png        generated adult model photo used as the try-on subject (image model)
  tryon.jpg         Vertex Virtual Try-On result
  runway-still.png  studio still derived from the try-on (image model)
  runway.mp4        8-second Veo clip from the still, re-encoded for the web when ffmpeg is present
  *-480.webp, *-800.webp and manifest.json
                    responsive renditions and intrinsic sizes read by web/lib/landingMedia.ts

Usage: PYTHONPATH=. .venv/bin/python scripts/landing_assets.py
Existing files are reused, so a re-run only fills what is missing.
"""

import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from app import storage  # noqa: E402
from app.ai import designer, runway, tryon  # noqa: E402
from app.models import DesignSpec  # noqa: E402

OUT = ROOT.parent / "web" / "public" / "landing"
OUT.mkdir(parents=True, exist_ok=True)

SPEC = DesignSpec.model_validate(
    {
        "garment_type": "dress",
        "length": "midi",
        "sleeve": "long",
        "fabric_id": "silk-charmeuse",
        "color_hex": "#1F2A44",
        "closures": ["zipper"],
        "embellishments": ["pleats"],
        "lining": True,
        "gender": "womenswear",
        "size": "M",
    }
)

RENDER_PROMPT = (
    "Haute couture editorial product photograph of a midi dress in deep navy silk charmeuse: long fitted sleeves, "
    "a seamed waist with soft knife pleats falling to a midi hem, a gentle boat neckline, fully lined, invisible "
    "centre-back zip. Displayed on an invisible ghost mannequin, front view, centred, pristine soft studio lighting, "
    "seamless alabaster background. No person, no text, no logos."
)

PERSON_PROMPT = (
    "Full-body studio photograph of an adult woman fashion model in her late twenties, standing upright facing the "
    "camera with arms relaxed at her sides, wearing a plain fitted white t-shirt and light grey tailored trousers, "
    "flat shoes, hair tied back. Whole body visible from head to feet, plain seamless light grey studio background, "
    "soft even lighting, photorealistic, no text."
)


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def ext_for(mime: str) -> str:
    return "jpg" if "jpeg" in mime or "jpg" in mime else "png"


def mime_for(path: Path) -> str:
    return "image/jpeg" if path.suffix == ".jpg" else "image/png"


def existing(stem: str) -> Path | None:
    for ext in ("png", "jpg"):
        p = OUT / f"{stem}.{ext}"
        if p.exists() and p.stat().st_size > 0:
            return p
    return None


def produce(stem: str, fn) -> tuple[bytes, str]:
    found = existing(stem)
    if found:
        log(f"{stem}: reusing {found.name}")
        return found.read_bytes(), mime_for(found)
    log(f"{stem}: generating…")
    data, mime = fn()
    path = OUT / f"{stem}.{ext_for(mime)}"
    path.write_bytes(data)
    log(f"{stem}: saved {path.name} ({len(data) // 1024} KB)")
    return data, mime


def derive() -> None:
    """Responsive WebP renditions, a manifest with intrinsic sizes, and a web-sized clip."""
    from PIL import Image

    manifest: dict = {}
    for stem in ("render", "flats", "tryon", "runway-still"):
        src = existing(stem)
        if not src:
            continue
        image = Image.open(src)
        width, height = image.size
        variants = []
        for target in (480, 800):
            if target >= width:
                continue  # never upscale
            out = OUT / f"{stem}-{target}.webp"
            if not out.exists():
                small = image.copy()
                small.thumbnail((target, 10_000), Image.LANCZOS)
                small.save(out, "WEBP", quality=80, method=6)
            variants.append({"src": f"/landing/{out.name}", "width": Image.open(out).size[0]})
        manifest[stem] = {"src": f"/landing/{src.name}", "width": width, "height": height, "webp": variants}
        log(f"{stem}: {len(variants)} webp rendition(s)")

    video = OUT / "runway.mp4"
    if video.exists():
        previous = {}
        if (OUT / "manifest.json").exists():
            try:
                previous = json.loads((OUT / "manifest.json").read_text()).get("runway", {})
            except ValueError:
                previous = {}
        optimised = bool(previous.get("optimised"))
        if shutil.which("ffmpeg") and not optimised:
            tmp = OUT / "runway-opt.mp4"
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-i", str(video), "-an", "-movflags", "+faststart",
                 "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-vf", "scale=720:-2", str(tmp)],
                check=True,
            )
            before, after = video.stat().st_size, tmp.stat().st_size
            tmp.replace(video)
            optimised = True
            log(f"runway: re-encoded {before // 1024} KB -> {after // 1024} KB")
        manifest["runway"] = {"src": "/landing/runway.mp4", "width": 720, "height": 1280, "optimised": optimised}

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    log("manifest.json written")


def main() -> None:
    render, render_mime = produce("render", lambda: designer.generate(RENDER_PROMPT))
    produce("flats", lambda: designer.technical_flats(render, render_mime, SPEC, "M"))

    person, person_mime = produce("person", lambda: designer.generate(PERSON_PROMPT))
    check = tryon.check_person_photo(person, person_mime)
    log(f"person photo check: {check}")
    if not check.single_person_full_body or check.appears_minor or check.unsafe_content:
        raise SystemExit("Generated model photo failed the try-on pre-check; re-run to regenerate person.png after deleting it.")

    tr, tr_mime = produce("tryon", lambda: (tryon.try_on(person, person_mime, render, render_mime), "image/jpeg"))
    still, still_mime = produce("runway-still", lambda: runway.runway_studio_still_from_tryon(tr, tr_mime))

    video_path = OUT / "runway.mp4"
    if video_path.exists() and video_path.stat().st_size > 0:
        log("runway: reusing runway.mp4")
        derive()
        return
    log("runway: starting Veo job…")
    op = runway.start(still, still_mime, f"landing/runway-{int(time.time())}/")
    started = time.time()
    while True:
        done, path, error = runway.poll(op)
        if done:
            break
        if time.time() - started > 900:
            raise SystemExit("Veo job did not finish within 15 minutes.")
        time.sleep(10)
    if error:
        raise SystemExit(f"Veo failed: {error}")
    data = storage.download(path)[0]
    video_path.write_bytes(data)
    log(f"runway: saved runway.mp4 ({len(data) // 1024} KB) in {time.time() - started:.0f}s")
    derive()


if __name__ == "__main__":
    main()
