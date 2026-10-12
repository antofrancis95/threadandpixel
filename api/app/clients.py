from functools import lru_cache

from google import genai
from google.genai import types
from google.cloud import firestore, storage

from .config import settings


def _genai_client(location: str) -> genai.Client:
    http_options = types.HttpOptions(
        retry_options=types.HttpRetryOptions(attempts=4, initial_delay=2.0, max_delay=20.0, http_status_codes=[429, 503])
    )
    try:
        return genai.Client(enterprise=True, project=settings.project, location=location, http_options=http_options)
    except TypeError:
        # Older google-genai releases use the `vertexai` flag.
        return genai.Client(vertexai=True, project=settings.project, location=location, http_options=http_options)


@lru_cache
def gemini() -> genai.Client:
    return _genai_client(settings.gemini_location)


@lru_cache
def imaging() -> genai.Client:
    return _genai_client(settings.region)


@lru_cache
def live() -> genai.Client:
    return _genai_client(settings.live_location)


@lru_cache
def db() -> firestore.Client:
    return firestore.Client(project=settings.project)


@lru_cache
def bucket() -> storage.Bucket:
    return storage.Client(project=settings.project).bucket(settings.bucket)
