"""What this file tests: `POST /authoring/media/presign`, `POST
/authoring/media/{id}/confirm`, and `GET /media/{id}` in `app.media.router` - request
validation (mime allowlist, byte-size bound), filename sanitization (path traversal is
stripped to a basename), the presign-then-confirm lifecycle against a fake storage
backend, the authoring role gate (educator/admin only, student 403, anon 401), and the
serve redirect (confirmed only, any signed-in user, 404 for unconfirmed/unknown).

Used here and why: `app.dependency_overrides[get_media_storage]` swaps in an in-memory
`FakeStorage` so no test talks to real object storage, following the same
override-a-dependency idiom `app.main.create_app` sets up for `get_session`;
`make_educator` from `tests/test_cohorts.py` for role seeding, matching the educator-route
test idiom in `tests/test_analytics.py`.

How it fits the project: plan 3b (FR-M-09, #51), Task 7 - the upload half of the media
pipeline.

Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `app`, `register` (conftest); `make_educator` (test_cohorts);
`app.audit.models.AuditLog`, `app.media.models.MediaAsset`, `app.media.storage`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.media.models import MediaAsset
from app.media.storage import get_media_storage
from tests.conftest import register
from tests.test_cohorts import make_educator

VALID_PAYLOAD = {"filename": "diagram.png", "mime": "image/png", "bytes": 1234}


class FakeStorage:
    def __init__(self) -> None:
        self.objects: dict[str, int] = {}

    def presigned_put(self, key: str) -> str:
        return f"https://fake-storage/put/{key}"

    def presigned_get(self, key: str, mime: str) -> str:
        # Record mime in the URL so tests can verify it was passed
        return f"https://fake-storage/get/{key}?mime={mime}"

    def stat(self, key: str) -> int | None:
        return self.objects.get(key)


@pytest.fixture
def fake_storage(app: FastAPI) -> Iterator[FakeStorage]:
    storage = FakeStorage()
    app.dependency_overrides[get_media_storage] = lambda: storage
    yield storage
    del app.dependency_overrides[get_media_storage]


async def _presign(client: AsyncClient, **overrides: object) -> dict[str, object]:
    payload = {**VALID_PAYLOAD, **overrides}
    r = await client.post("/api/v1/authoring/media/presign", json=payload)
    assert r.status_code == 201, r.text
    body: dict[str, object] = r.json()
    return body


async def test_presign_happy_path(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    body = await _presign(client)
    uuid.UUID(str(body["id"]))  # valid uuid
    assert str(body["upload_url"]).startswith("https://fake-storage/put/")
    assert str(body["storage_key"]).startswith("media/")
    asset = await db.get(MediaAsset, uuid.UUID(str(body["id"])))
    assert asset is not None and asset.confirmed is False


async def test_presign_rejects_bad_mime_and_oversize(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.post(
        "/api/v1/authoring/media/presign",
        json={**VALID_PAYLOAD, "mime": "image/svg+xml"},
    )
    assert r.status_code == 422
    r = await client.post(
        "/api/v1/authoring/media/presign",
        json={**VALID_PAYLOAD, "bytes": 10_485_761},
    )
    assert r.status_code == 422
    r = await client.post(
        "/api/v1/authoring/media/presign",
        json={**VALID_PAYLOAD, "bytes": 10_485_760},
    )
    assert r.status_code == 201, r.text


async def test_presign_sanitizes_path_traversal_filename(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    body = await _presign(client, filename="../../evil.png")
    assert str(body["storage_key"]).endswith("/evil.png")
    assert ".." not in str(body["storage_key"])


async def test_presign_sanitizes_dot_segment_filename(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    body = await _presign(client, filename="..")
    assert str(body["storage_key"]).endswith("/upload")


async def test_confirm_before_and_after_upload(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    body = await _presign(client)
    asset_id, key = body["id"], body["storage_key"]

    r = await client.post(f"/api/v1/authoring/media/{asset_id}/confirm")
    assert r.status_code == 409

    fake_storage.objects[str(key)] = 1234
    r = await client.post(f"/api/v1/authoring/media/{asset_id}/confirm")
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["confirmed"] is True and out["bytes"] == 1234

    audits = (await db.scalars(select(AuditLog).where(AuditLog.action == "confirm_media"))).all()
    assert len(audits) == 1
    assert audits[0].target_type == "media_asset"
    assert audits[0].target_id == uuid.UUID(str(asset_id))


async def test_presign_student_403(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await register(client)  # student
    r = await client.post("/api/v1/authoring/media/presign", json=VALID_PAYLOAD)
    assert r.status_code == 403


async def test_presign_anon_401(client: AsyncClient, fake_storage: FakeStorage) -> None:
    r = await client.post("/api/v1/authoring/media/presign", json=VALID_PAYLOAD)
    assert r.status_code == 401


async def test_serve_media(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    body = await _presign(client)
    asset_id, key = body["id"], body["storage_key"]
    fake_storage.objects[str(key)] = 1234
    r = await client.post(f"/api/v1/authoring/media/{asset_id}/confirm")
    assert r.status_code == 200, r.text

    await register(client, email="student@example.edu")  # student, fresh session
    r = await client.get(f"/api/v1/media/{asset_id}", follow_redirects=False)
    assert r.status_code == 302
    # Verify the redirect includes the DB-validated mime (image/png from VALID_PAYLOAD)
    assert r.headers["location"] == f"https://fake-storage/get/{key}?mime=image/png"

    unknown_id = uuid.uuid4()
    r = await client.get(f"/api/v1/media/{unknown_id}", follow_redirects=False)
    assert r.status_code == 404


async def test_serve_media_unconfirmed_is_404(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    body = await _presign(client)
    asset_id = body["id"]

    await register(client, email="student@example.edu")
    r = await client.get(f"/api/v1/media/{asset_id}", follow_redirects=False)
    assert r.status_code == 404


async def test_serve_media_anon_401(client: AsyncClient, fake_storage: FakeStorage) -> None:
    r = await client.get(f"/api/v1/media/{uuid.uuid4()}", follow_redirects=False)
    assert r.status_code == 401


async def test_serve_media_with_different_mimes(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    """Verify different mime types get their own presigned URLs with correct mime."""
    await make_educator(client, db, "edu@example.edu")

    # Create and confirm a PNG asset
    body_png = await _presign(client, mime="image/png")
    asset_id_png, key_png = body_png["id"], body_png["storage_key"]
    fake_storage.objects[str(key_png)] = 1000
    r = await client.post(f"/api/v1/authoring/media/{asset_id_png}/confirm")
    assert r.status_code == 200

    # Create and confirm a JPEG asset
    body_jpg = await _presign(client, mime="image/jpeg")
    asset_id_jpg, key_jpg = body_jpg["id"], body_jpg["storage_key"]
    fake_storage.objects[str(key_jpg)] = 2000
    r = await client.post(f"/api/v1/authoring/media/{asset_id_jpg}/confirm")
    assert r.status_code == 200

    await register(client, email="student@example.edu")

    # Verify PNG asset gets image/png mime in its presigned URL
    r = await client.get(f"/api/v1/media/{asset_id_png}", follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == f"https://fake-storage/get/{key_png}?mime=image/png"

    # Verify JPEG asset gets image/jpeg mime in its presigned URL
    r = await client.get(f"/api/v1/media/{asset_id_jpg}", follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == f"https://fake-storage/get/{key_jpg}?mime=image/jpeg"


async def test_confirm_is_idempotent_no_duplicate_audit(
    client: AsyncClient, db: AsyncSession, fake_storage: FakeStorage
) -> None:
    await make_educator(client, db, "edu@example.edu")
    body = await _presign(client)
    asset_id, key = body["id"], body["storage_key"]

    # Mark storage object present
    fake_storage.objects[str(key)] = 1234

    # Confirm first time
    r = await client.post(f"/api/v1/authoring/media/{asset_id}/confirm")
    assert r.status_code == 200
    out = r.json()
    assert out["confirmed"] is True

    # Confirm second time (should be idempotent, no duplicate audit)
    r = await client.post(f"/api/v1/authoring/media/{asset_id}/confirm")
    assert r.status_code == 200
    out = r.json()
    assert out["confirmed"] is True

    # Assert exactly one confirm_media audit row
    audits = (await db.scalars(select(AuditLog).where(AuditLog.action == "confirm_media"))).all()
    assert len(audits) == 1
    assert audits[0].target_type == "media_asset"
    assert audits[0].target_id == uuid.UUID(str(asset_id))
