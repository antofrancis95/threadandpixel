import threading
from datetime import timedelta

import google.auth
from google.auth.transport.requests import Request

from .clients import bucket
from .config import settings

_lock = threading.Lock()
_creds = None


def _signing_credentials():
    global _creds
    with _lock:
        if _creds is None:
            _creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        if not _creds.valid:
            _creds.refresh(Request())
        return _creds


def upload(path: str, data: bytes, content_type: str) -> str:
    bucket().blob(path).upload_from_string(data, content_type=content_type)
    return path


def download(path: str) -> tuple[bytes, str]:
    blob = bucket().blob(path)
    data = blob.download_as_bytes()
    return data, blob.content_type or "image/png"


def exists(path: str) -> bool:
    return bucket().blob(path).exists()


def copy(src: str, dst: str) -> None:
    b = bucket()
    b.copy_blob(b.blob(src), b, dst)


def gcs_uri(path: str) -> str:
    return f"gs://{bucket().name}/{path}"


def path_from_uri(uri: str) -> str:
    prefix = f"gs://{bucket().name}/"
    if not uri.startswith(prefix):
        raise ValueError(f"Object outside asset bucket: {uri}")
    return uri[len(prefix):]


def signed_url(path: str, minutes: int = 15) -> str:
    creds = _signing_credentials()
    sa_email = settings.signing_sa or getattr(creds, "service_account_email", None)
    if not sa_email or sa_email == "default":
        raise RuntimeError("Set SIGNING_SA_EMAIL to sign URLs with user (non service account) credentials.")
    # Keyless signing via IAM signBlob; caller needs roles/iam.serviceAccountTokenCreator on sa_email.
    return bucket().blob(path).generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=minutes),
        method="GET",
        service_account_email=sa_email,
        access_token=creds.token,
    )
