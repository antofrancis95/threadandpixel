import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _req(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    project: str
    region: str
    gemini_location: str
    bucket: str
    signing_sa: str | None
    model_flash: str
    model_lite: str
    model_pro: str
    model_image: str
    model_vto: str
    model_video: str
    model_live: str
    live_location: str
    imaging_location: str
    demo_mode: str
    demo_timeout_s: float
    allowed_origins: list[str]
    auth_disabled: bool


DEMO_MODES = {"off", "record", "fallback", "replay"}


def load_settings() -> Settings:
    on_cloud_run = "K_SERVICE" in os.environ
    gemini_location = os.environ.get("GEMINI_LOCATION", "global")
    imaging_location = os.environ.get("IMAGING_LOCATION", "us-central1")
    demo_mode = os.environ.get("DEMO_MODE", "off").lower()
    if demo_mode not in DEMO_MODES:
        raise RuntimeError(f"DEMO_MODE must be one of {sorted(DEMO_MODES)}")
    return Settings(
        project=_req("GOOGLE_CLOUD_PROJECT"),
        region=os.environ.get("GOOGLE_CLOUD_REGION", "asia-southeast1"),
        gemini_location=gemini_location,
        bucket=_req("ASSET_BUCKET"),
        signing_sa=os.environ.get("SIGNING_SA_EMAIL") or None,
        model_flash=_req("MODEL_FLASH"),
        model_lite=_req("MODEL_LITE"),
        model_pro=_req("MODEL_PRO"),
        model_image=_req("MODEL_IMAGE"),
        model_vto=os.environ.get("MODEL_VTO", "virtual-try-on-001"),
        model_video=os.environ.get("MODEL_VIDEO", "veo-3.1-fast-generate-001"),
        model_live=os.environ.get("MODEL_LIVE", "gemini-3.8-live"),
        live_location=os.environ.get("LIVE_LOCATION", gemini_location),
        imaging_location=imaging_location,
        demo_mode=demo_mode,
        demo_timeout_s=float(os.environ.get("DEMO_TIMEOUT_S", "25")),
        allowed_origins=[o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
        # Never allow the auth bypass on Cloud Run.
        auth_disabled=(not on_cloud_run) and os.environ.get("AUTH_DISABLED", "").lower() == "true",
    )


settings = load_settings()
