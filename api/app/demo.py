"""Demo safety net for live judging.

DEMO_MODE:
  off      - always call the models (default)
  record   - call the models and save each successful result as the golden-path cache
  fallback - call the models; on error or after DEMO_TIMEOUT_S, serve the cached result instead
  replay   - never call the models; serve cached results instantly
Cache lives in gs://$ASSET_BUCKET/demo/<stage>.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from typing import Callable, TypeVar

from google.api_core.exceptions import NotFound
from pydantic import BaseModel

from . import storage
from .config import settings

log = logging.getLogger("uvicorn.error")
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="demo")

T = TypeVar("T")
M = TypeVar("M", bound=BaseModel)

PREFIX = "demo/"


def _run(stage: str, fn: Callable[[], T], save: Callable[[T], None], load: Callable[[], T]) -> T:
    mode = settings.demo_mode
    if mode == "off":
        return fn()
    if mode == "replay":
        return load()
    if mode == "record":
        result = fn()
        try:
            save(result)
        except Exception:
            log.exception("demo: failed to record %s", stage)
        return result

    try:
        return _pool.submit(fn).result(timeout=settings.demo_timeout_s)
    except Exception as exc:
        reason = "timeout" if isinstance(exc, FutureTimeout) else f"{type(exc).__name__}: {exc}"
        log.warning("demo: %s failed (%s); serving cached result", stage, reason)
        try:
            return load()
        except NotFound:
            raise exc


def image(stage: str, fn: Callable[[], tuple[bytes, str]]) -> tuple[bytes, str]:
    path = f"{PREFIX}{stage}.img"
    return _run(stage, fn, lambda r: storage.upload(path, r[0], r[1]), lambda: storage.download(path))


def blob(stage: str, fn: Callable[[], bytes], mime: str) -> bytes:
    path = f"{PREFIX}{stage}.bin"
    return _run(stage, fn, lambda r: storage.upload(path, r, mime), lambda: storage.download(path)[0])


def model(stage: str, fn: Callable[[], M], cls: type[M]) -> M:
    path = f"{PREFIX}{stage}.json"
    return _run(
        stage,
        fn,
        lambda r: storage.upload(path, r.model_dump_json().encode(), "application/json"),
        lambda: cls.model_validate_json(storage.download(path)[0]),
    )


def save_video(path: str) -> None:
    storage.copy(path, f"{PREFIX}runway.mp4")


def cached_video() -> str | None:
    path = f"{PREFIX}runway.mp4"
    return path if storage.exists(path) else None
