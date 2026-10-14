import logging

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth

from .config import settings

log = logging.getLogger("uvicorn.error")

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={"projectId": settings.project})


class User:
    def __init__(
        self,
        uid: str,
        role: str | None,
        email: str | None = None,
        is_anonymous: bool = False,
    ):
        self.uid = uid
        self.role = role
        self.email = email
        self.is_anonymous = is_anonymous

    @property
    def is_factory(self) -> bool:
        return self.role == "factory"


def verify_token(token: str | None) -> User:
    if settings.auth_disabled:
        return User("local-dev", "factory", email="local-dev@example.com", is_anonymous=False)
    if not token:
        log.warning("401: missing bearer token")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        # Local PC clocks often drift a few seconds ahead of/behind Google's.
        decoded = auth.verify_id_token(token, clock_skew_seconds=30)
    except Exception as exc:
        log.warning("401: token verification failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    email = decoded.get("email")
    is_anon = decoded.get("firebase", {}).get("sign_in_provider") == "anonymous"
    return User(decoded["uid"], decoded.get("role"), email=email, is_anonymous=is_anon)


def check_user_allowed(user: User) -> None:
    if settings.auth_disabled:
        return
    if user.is_factory:
        return
    if user.is_anonymous or not user.email:
        log.warning("403: rejected anonymous/email-less user: %s", user.uid)
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Anonymous users are not permitted. Please sign in with an authorized Google account.",
        )

    # Lazy-import db to avoid circular imports
    from .clients import db

    email = user.email.strip().lower()
    doc_ref = db().collection("allowed_users").document(email)
    snap = doc_ref.get()
    if not snap.exists or snap.to_dict().get("enabled", True) is False:
        log.warning("403: user '%s' not in allowed_users list", user.email)
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Access denied: Account '{user.email}' is not in the approved design portal list.",
        )


def current_user(authorization: str | None = Header(default=None)) -> User:
    token = (
        authorization.removeprefix("Bearer ").strip()
        if authorization and authorization.startswith("Bearer ")
        else None
    )
    user = verify_token(token)
    check_user_allowed(user)
    return user
