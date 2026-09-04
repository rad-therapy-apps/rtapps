"""SQLAlchemy ORM model for uploaded media assets (plan 3b).

What this file does: defines the `MediaAsset` table for storing uploaded media metadata
(images only in 3b). A row is created by the presign endpoint (confirmed=False) and flipped
by confirm after the client's direct-to-storage PUT succeeds; only confirmed rows are ever
served.

Used here and why: SQLAlchemy 2.0 `Mapped`/`mapped_column` declarative model, matching
the rest of the app. Each asset is immutable once created except for the `confirmed` flag.

How it fits the project: plan 3b (FR-M-09, #51). MediaAsset rows are produced by Task 7
(presign endpoint, confirm flow) and consumed by the content snapshot builder for embedding
media references.

Works with:
  Depends on: `app.auth.models.TimestampMixin` (created_at/updated_at columns), `app.db.Base`
    (declarative base), `app.ids.new_id` (UUIDv7 primary keys).
  Used by: `app.media.router` (presign/confirm), `app.content.snapshot` (embeds in snapshots),
    `alembic/env.py` (imported for autogenerate metadata).
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import TimestampMixin
from app.db import Base
from app.ids import new_id


# One uploaded media object (images only in 3b). A row is created by the presign
# endpoint (confirmed=False) and flipped by confirm after the client's direct-to-storage
# PUT succeeds; only confirmed rows are ever served.
class MediaAsset(TimestampMixin, Base):
    __tablename__ = "media_asset"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    storage_key: Mapped[str] = mapped_column(String(300), unique=True, nullable=False)
    mime: Mapped[str] = mapped_column(String(100), nullable=False)
    bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    alt: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
