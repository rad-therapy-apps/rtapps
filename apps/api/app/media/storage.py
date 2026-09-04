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
    def presigned_get(self, key: str, mime: str) -> str: ...
    def stat(self, key: str) -> int | None: ...


class MinioStorage:
    """S3-compatible storage via the minio SDK (endpoint/creds from Settings).

    Two clients, one endpoint each: `_client` (`s3_endpoint`) for `stat`, real network I/O the
    API container itself performs, so it needs the docker-internal hostname in dev
    (`storage:9000`); `_public_client` (`s3_browser_endpoint`) for presigning only (pure local
    HMAC signing, no I/O — the signature is valid for whatever host/path/query it was computed
    against, regardless of which client instance produced it), so a browser-issued PUT/GET
    against the returned URL needs the host a browser can actually reach (`localhost:9000` in
    dev). The two are identical in prod (a real S3/R2 endpoint is reachable from both sides).
    """

    def __init__(self) -> None:
        settings = load_settings()
        # `region="us-east-1"` (MinIO's own default for a non-AWS host) makes the SDK's
        # `_get_region` return it directly instead of issuing a real GetBucketLocation request —
        # `get_media_storage` builds a fresh `MinioStorage` per request (no client reuse across
        # requests to cache a looked-up region), and `_public_client` below points at a host only
        # a browser can reach, unreachable from inside this container; without a fixed region,
        # the first presigned-URL call on that client would 500 trying to look one up.
        parsed = urlparse(settings.s3_endpoint)
        self._client = Minio(
            parsed.netloc,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            secure=parsed.scheme == "https",
        )
        public_parsed = urlparse(settings.s3_browser_endpoint)
        # `region="us-east-1"` on the public client avoids a GetBucketLocation request against
        # an endpoint only browsers can reach (unreachable from inside this container).
        # The internal client must NOT pin a region — the real backend's signing region governs.
        self._public_client = Minio(
            public_parsed.netloc,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            secure=public_parsed.scheme == "https",
            region="us-east-1",
        )
        self._bucket = settings.s3_bucket

    def presigned_put(self, key: str) -> str:
        # Pure local signing (no network I/O) - safe to call directly from an async route.
        return self._public_client.presigned_put_object(
            self._bucket, key, expires=timedelta(minutes=10)
        )

    def presigned_get(self, key: str, mime: str) -> str:
        # Pass the DB-validated mime as response-content-type header so the storage response
        # carries the asset's validated content type, preventing a mismatched direct-to-storage
        # PUT from controlling the served Content-Type.
        return self._public_client.presigned_get_object(
            self._bucket,
            key,
            expires=timedelta(minutes=5),
            response_headers={"response-content-type": mime},
        )

    def stat(self, key: str) -> int | None:
        # Network I/O - callers must run this off the event loop (anyio.to_thread.run_sync).
        try:
            return self._client.stat_object(self._bucket, key).size
        except S3Error:
            return None


def get_media_storage() -> MediaStorage:
    return MinioStorage()
