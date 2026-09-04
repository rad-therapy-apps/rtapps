"""Pydantic request/response models for `app.media.router`.

What this file does: `PresignIn` validates a requested upload (filename, mime, size)
before a `MediaAsset` row is even created; `PresignOut` is the presign response;
`MediaAssetOut` is the confirm response.

Used here and why: plain Pydantic `BaseModel`s with `Field`/`field_validator`, matching
`app.auth.schemas`; `ALLOWED_MIMES`/`MAX_BYTES` are enforced here so a bad request never
reaches the storage layer.

How it fits the project: plan 3b (FR-M-09, #51) - images only in 3b.

Depends on: nothing in-repo.
Used by: `app/media/router.py`.
"""

import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_MIMES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_BYTES = 10_485_760


class PresignIn(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    mime: str
    bytes: int = Field(gt=0, le=MAX_BYTES)

    @field_validator("mime")
    @classmethod
    def _allowed(cls, v: str) -> str:
        if v not in ALLOWED_MIMES:
            raise ValueError(f"mime must be one of {sorted(ALLOWED_MIMES)}")
        return v


class PresignOut(BaseModel):
    id: uuid.UUID
    upload_url: str
    storage_key: str


class MediaAssetOut(BaseModel):
    """Response shape for confirm; built from a MediaAsset ORM row via from_attributes."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mime: str
    bytes: int
    alt: str | None
    confirmed: bool
