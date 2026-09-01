"""The publish step: freezes a working copy into a new immutable `content_version`.

What this file does: `publish_activity` is the generalized publisher for any activity kind
(quiz, matching, flashcards, sequencing, lesson). `publish_lesson` wraps it, freezing a
lesson's working copy, then repointing the lesson's own current_version_id pointer (the
activity pointer is handled by `publish_activity`).

Used here and why: plain SQLAlchemy async session calls; no separate "publish" table or
state machine — publishing is just inserting one `ContentVersion` row and updating pointer
columns in the same flush, which is what keeps rollback/republish this simple.

How it fits the project: this is the step between authoring and serving (ADR-0003) -
`app.content.importer` calls `publish_lesson` after writing/replacing a lesson's working
copy; students only ever see the version this points `current_version_id` at. Tasks 3-5
call `publish_activity` directly for non-lesson activity kinds.

Works with:
  Depends on: `app.auth.models.User` (author attribution), `app.content.models` (Activity,
    ContentVersion, Lesson), `app.content.activity_snapshots.build_activity_snapshot`
    (assembles the document for any kind).
  Used by: `app.content.importer.import_lesson`, `tests/test_activity_snapshots.py`,
    `tests/test_content_publish.py`, Tasks 3-5.
"""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.content.activity_snapshots import build_activity_snapshot
from app.content.models import Activity, ContentVersion, Lesson


async def publish_activity(
    db: AsyncSession, activity: Activity, author: User | None, change_note: str | None = None
) -> ContentVersion:
    """Snapshot any activity's working copy, write the next version, repoint the activity."""
    # Build the snapshot for any activity kind (quiz, matching, flashcards, sequencing, lesson).
    snapshot = await build_activity_snapshot(db, activity)
    # Version numbers are per-activity and sequential (enforced by
    # uq_content_version_activity_version); first publish starts at 1.
    last = await db.scalar(
        select(func.max(ContentVersion.version)).where(ContentVersion.activity_id == activity.id)
    )
    version = ContentVersion(
        activity_id=activity.id,
        version=(last or 0) + 1,
        snapshot=snapshot,
        author_id=author.id if author else None,
        published_at=datetime.now(UTC),
        change_note=change_note,
    )
    db.add(version)
    await db.flush()
    # Repoint the activity at the new version and mark it published.
    # Existing attempts keep their own pinned content_version_id, so this doesn't touch them.
    activity.current_version_id = version.id
    activity.status = "published"
    await db.flush()
    return version


async def publish_lesson(
    db: AsyncSession, lesson: Lesson, author: User | None, change_note: str | None = None
) -> ContentVersion:
    """Lesson wrapper: publish the paired activity, then repoint the lesson too."""
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    version = await publish_activity(db, activity, author, change_note)
    lesson.current_version_id = version.id
    lesson.status = "published"
    await db.flush()
    return version
