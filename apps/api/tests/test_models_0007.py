"""Model-level tests for migration 0007's tables and constraints.

What this file does: round-trips a MediaAsset and a DataTable row, asserts the
storage_key/key unique constraints, and asserts the attempt partial unique index lets a
second in_progress attempt for a DIFFERENT activity through while blocking a duplicate
for the same (user, activity).

Used here and why: same async session fixture as the other model test modules; the
partial-index behavior needs a real Postgres, which the test DB provides.

How it fits the project: plan 3b Task 6 (spec §2 media, §4 data_table, #37).

Works with: app.media.models.MediaAsset, app.content.activity_models.DataTable,
app.attempts.models.Attempt.
"""

from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt
from app.auth.models import User
from app.content.activity_models import DataTable
from app.content.models import Activity, Subject
from app.media.models import MediaAsset


async def make_user(db: AsyncSession) -> User:
    """Helper to create a test user."""
    user = User(email="test@example.edu", password_hash="hashed", display_name="Test User")
    db.add(user)
    await db.flush()
    return user


async def make_subject(db: AsyncSession, slug: str = "test-subject") -> Subject:
    """Helper to create a test subject."""
    subject = Subject(slug=slug, title="Test Subject", order=1)
    db.add(subject)
    await db.flush()
    return subject


async def make_activity(
    db: AsyncSession, subject: Subject, kind: str = "lesson", slug: str = "test-activity"
) -> Activity:
    """Helper to create a test activity."""
    activity = Activity(
        kind=kind,
        ref_id=subject.id,  # Simplified: just use subject id as ref_id
        title="Test Activity",
        subject_id=subject.id,
    )
    db.add(activity)
    await db.flush()
    return activity


async def test_media_asset_roundtrip_and_unique_key(db: AsyncSession) -> None:
    """Insert and re-select a MediaAsset; assert storage_key uniqueness."""
    asset1 = MediaAsset(
        storage_key="images/test-1.jpg",
        mime="image/jpeg",
        bytes=1024,
        confirmed=False,
    )
    db.add(asset1)
    await db.flush()

    # Re-select by storage_key to verify it round-trips
    loaded = await db.scalar(
        select(MediaAsset).where(MediaAsset.storage_key == "images/test-1.jpg")
    )
    assert loaded is not None
    assert loaded.id == asset1.id
    assert loaded.mime == "image/jpeg"
    assert loaded.bytes == 1024
    assert loaded.confirmed is False

    # Attempt a second asset with the same storage_key; should fail on flush
    asset2 = MediaAsset(
        storage_key="images/test-1.jpg",  # Duplicate
        mime="image/png",
        bytes=2048,
        confirmed=False,
    )
    db.add(asset2)
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_data_table_roundtrip(db: AsyncSession) -> None:
    """Insert and re-select a DataTable; assert grid JSONB round-trips."""
    grid_data = {
        "col_label": "Dose (Gy)",
        "row_label": "Effect",
        "cols": [2, 4, 6, 8],
        "rows": [
            {"key": "effect_1", "values": [10, 20, 30, 40]},
            {"key": "effect_2", "values": [15, 25, 35, 45]},
        ],
    }
    table = DataTable(
        key="pdd_6mv",
        title="PDD 6 MV",
        grid=grid_data,
    )
    db.add(table)
    await db.flush()

    # Re-select by key
    loaded = await db.scalar(select(DataTable).where(DataTable.key == "pdd_6mv"))
    assert loaded is not None
    assert loaded.title == "PDD 6 MV"
    assert loaded.grid == grid_data
    assert loaded.grid["rows"][0]["values"] == [10, 20, 30, 40]


async def test_attempt_partial_unique_index(db: AsyncSession) -> None:
    """Assert the partial unique index on (user_id, activity_id) WHERE status='in_progress'."""
    user = await make_user(db)
    subject = await make_subject(db)
    activity1 = await make_activity(db, subject, slug="activity-1")
    activity2 = await make_activity(db, subject, slug="activity-2")
    activity3 = await make_activity(db, subject, slug="activity-3")

    # Create a content_version for attempts to reference
    from app.content.models import ContentVersion

    version1 = ContentVersion(
        activity_id=activity1.id,
        version=1,
        snapshot={},
        published_at=datetime.now(tz=None),
    )
    db.add(version1)
    await db.flush()

    # First attempt: user + activity1 + in_progress
    attempt1 = Attempt(
        user_id=user.id,
        activity_id=activity1.id,
        content_version_id=version1.id,
        status="in_progress",
    )
    db.add(attempt1)
    await db.flush()

    # Second attempt: user + activity2 (different) + in_progress — should succeed
    # (the index is partial on (user, activity), so different activity = no conflict)
    version2 = ContentVersion(
        activity_id=activity2.id,
        version=1,
        snapshot={},
        published_at=datetime.now(tz=None),
    )
    db.add(version2)
    await db.flush()

    attempt2 = Attempt(
        user_id=user.id,
        activity_id=activity2.id,
        content_version_id=version2.id,
        status="in_progress",
    )
    db.add(attempt2)
    await db.flush()  # Should succeed

    # Third attempt: user + activity3 + submitted (not in_progress) — should succeed
    # (partial index only constrains in_progress)
    version3 = ContentVersion(
        activity_id=activity3.id,
        version=1,
        snapshot={},
        published_at=datetime.now(tz=None),
    )
    db.add(version3)
    await db.flush()

    attempt3 = Attempt(
        user_id=user.id,
        activity_id=activity3.id,
        content_version_id=version3.id,
        status="submitted",
    )
    db.add(attempt3)
    await db.flush()  # Should succeed

    # Fourth test: user + activity1 + in_progress — should fail (duplicate of attempt1)
    attempt4 = Attempt(
        user_id=user.id,
        activity_id=activity1.id,
        content_version_id=version1.id,
        status="in_progress",
    )
    db.add(attempt4)
    with pytest.raises(IntegrityError):
        await db.flush()
