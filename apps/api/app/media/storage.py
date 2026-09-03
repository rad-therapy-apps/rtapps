"""S3-compatible object storage for uploaded media, injected as a FastAPI dependency.

What this file does: defines the `MediaStorage` protocol the media router codes against
(`presigned_put`, `presigned_get`, `stat`), a `MinioStorage` implementation backed by the
`minio` SDK, and `get_media_storage`, the FastAPI dependency that returns it. Tests
override `get_media_storage` with a fake, so no test ever talks to real object storage.

Used here and why: the `minio` SDK because it's a typed, small client that works against
any S3-compatible endpoint (MinIO in dev/CI, R2 or OCI in prod) without AWS-specific
dependencies; a `Protocol` (not an ABC) so a test fake needs no inheritance, just the same
method shapes.

How it fits the project: plan 3b (FR-M-09, #51), Task 7. `app.media.router` calls
`presigned_put`/`presigned_get` (pure local signing, no I/O) directly, and `stat` (which
does call the storage backend) via `anyio.to_thread.run_sync` so the event loop isn't
blocked.

Depends on: `app.config.get_settings` (S3 endpoint/credentials/bucket), `minio` (third-party).
Used by: `app.media.router`; overridden in `tests/test_media.py` via
`app.dependency_overrides`.
"""

from datetime import timedelta
from typing import Protocol
from urllib.parse import urlparse

from minio import Minio
from minio.error import S3Error

from app.config import load_settings


class MediaStorage(Protocol):
    def presigned_put(self, key: str) -> str: ...
    def presigned_get(self, key: str) -> str: ...
    def stat(self, key: str) -> int | None: ...


class MinioStorage:
    """S3-compatible storage via the minio SDK (endpoint/creds from Settings)."""

    def __init__(self) -> None:
        settings = load_settings()
        parsed = urlparse(settings.s3_endpoint)
        self._client = Minio(
            parsed.netloc,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            secure=parsed.scheme == "https",
        )
        self._bucket = settings.s3_bucket

    def presigned_put(self, key: str) -> str:
        # Pure local signing (no network I/O) - safe to call directly from an async route.
        return self._client.presigned_put_object(self._bucket, key, expires=timedelta(minutes=10))

    def presigned_get(self, key: str) -> str:
        return self._client.presigned_get_object(self._bucket, key, expires=timedelta(minutes=5))

    def stat(self, key: str) -> int | None:
        # Network I/O - callers must run this off the event loop (anyio.to_thread.run_sync).
        try:
            return self._client.stat_object(self._bucket, key).size
        except S3Error:
            return None


def get_media_storage() -> MediaStorage:
    return MinioStorage()
