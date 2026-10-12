import logging

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth

from .config import settings

log = logging.getLogger("uvicorn.error")

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={"projectId": settings.project})


class User:
    def __init__(self, uid: str, role: str | None):
        self.uid = uid
        self.role = role

    @property
    def is_factory(self) -> bool:
        return self.role == "factory"


def verify_token(token: str | None) -> User:
    if settings.auth_disabled:
        return User("local-dev", "factory")
    if not token:
        log.warning("401: missing bearer token")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        # Local PC clocks often drift a few seconds ahead of/behind Google's.
        decoded = auth.verify_id_token(token, clock_skew_seconds=30)
    except Exception as exc:
        log.warning("401: token verification failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return User(decoded["uid"], decoded.get("role"))


def current_user(authorization: str | None = Header(default=None)) -> User:
    token = authorization.removeprefix("Bearer ").strip() if authorization and authorization.startswith("Bearer ") else None
    return verify_token(token)
