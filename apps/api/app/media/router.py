"""Routes for uploading media: presign, confirm, and the authenticated serve redirect.

What this file does: `POST /authoring/media/presign` creates a pending `MediaAsset` row
and hands back a presigned PUT URL for a direct-to-storage upload; `POST
/authoring/media/{id}/confirm` verifies the object actually landed in storage and flips
the row to servable (audited); `GET /media/{id}` redirects any authenticated user to a
short-lived presigned GET for a confirmed asset.

Used here and why: `require_author` (educator/admin) gates the two authoring routes;
`require_user` alone gates the serve route, since any signed-in user (including students)
may view media embedded in content they can read. `storage.stat` performs network I/O, so
confirm calls it via `anyio.to_thread.run_sync` rather than blocking the event loop;
`presigned_put`/`presigned_get` are pure local signing and are called directly.

How it fits the project: plan 3b (FR-M-09, #51), Task 7 - the upload half of the media
pipeline Task 6's `MediaAsset` model and future content-authoring routes (Tasks 8-11) sit
on top of.

Depends on: `app.audit.service.record_audit`, `app.authoring.deps.require_author`,
`app.auth.deps.require_user`, `app.auth.models.User`, `app.db.get_session`,
`app.errors.Problem`, `app.ids.new_id`, `app.media.models.MediaAsset`,
`app.media.schemas` (PresignIn, PresignOut, MediaAssetOut), `app.media.storage`
(MediaStorage, get_media_storage).
Used by: `app.main` (mounted); `tests/test_media.py`.
"""

import uuid
from pathlib import Path

import anyio
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit
from app.auth.deps import require_user
from app.auth.models import User
from app.authoring.deps import require_author
from app.db import get_session
from app.errors import Problem
from app.ids import new_id
from app.media.models import MediaAsset
from app.media.schemas import MediaAssetOut, PresignIn, PresignOut
from app.media.storage import MediaStorage, get_media_storage

router = APIRouter(tags=["media"])


@router.post("/authoring/media/presign", response_model=PresignOut, status_code=201)
async def presign_upload(
    payload: PresignIn,
    user: User = Depends(require_author),
    db: AsyncSession = Depends(get_session),
    storage: MediaStorage = Depends(get_media_storage),
) -> PresignOut:
    """Create a pending media asset and a presigned PUT URL for a direct-to-storage upload."""
    asset_id = new_id()
    # Path(...).name strips any directory components (e.g. "../../evil.png" -> "evil.png")
    # so a hostile filename can never escape the asset's own storage prefix.
    basename = Path(payload.filename).name or "upload"
    key = f"media/{asset_id}/{basename}"
    asset = MediaAsset(
        id=asset_id,
        storage_key=key,
        mime=payload.mime,
        bytes=payload.bytes,
        uploaded_by=user.id,
    )
    db.add(asset)
    await db.commit()
    return PresignOut(id=asset.id, upload_url=storage.presigned_put(key), storage_key=key)


@router.post("/authoring/media/{asset_id}/confirm", response_model=MediaAssetOut)
async def confirm_upload(
    asset_id: uuid.UUID,
    request: Request,
    user: User = Depends(require_author),
    db: AsyncSession = Depends(get_session),
    storage: MediaStorage = Depends(get_media_storage),
) -> MediaAsset:
    """Verify the object landed in storage and mark the asset servable (audited)."""
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise Problem(404, "Media asset not found")
    # stat_object performs network I/O; run it off the event loop.
    size = await anyio.to_thread.run_sync(storage.stat, asset.storage_key)
    if size is None:
        raise Problem(409, "Object not found in storage; upload before confirming")
    asset.bytes = size
    asset.confirmed = True
    await record_audit(
        db,
        actor=user,
        action="confirm_media",
        target_type="media_asset",
        target_id=asset.id,
        request=request,
    )
    await db.commit()
    return asset


@router.get("/media/{asset_id}", status_code=302, response_class=RedirectResponse)
async def serve_media(
    asset_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
    storage: MediaStorage = Depends(get_media_storage),
) -> RedirectResponse:
    """Redirect an authenticated viewer to a short-lived presigned GET for the object."""
    asset = await db.get(MediaAsset, asset_id)
    if asset is None or not asset.confirmed:
        raise Problem(404, "Media asset not found")
    return RedirectResponse(storage.presigned_get(asset.storage_key), status_code=302)
