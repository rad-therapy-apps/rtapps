"""The publish step: freezes a lesson's working copy into a new immutable `content_version`.

What this file does: `publish_lesson` builds a snapshot of the current working copy,
writes it as the next version number for the lesson's activity, and repoints both the
lesson and the activity at that new version.

Used here and why: plain SQLAlchemy async session calls; no separate "publish" table or
state machine — publishing is just inserting one `ContentVersion` row and updating two
pointer columns in the same flush, which is what keeps rollback/republish this simple.

How it fits the project: this is the step between authoring and serving (ADR-0003) —
`app.content.importer` calls this after writing/replacing a lesson's working copy;
students only ever see the version this points `current_version_id` at.

Works with:
  Depends on: `app.auth.models.User` (author attribution), `app.content.models` (Activity,
    ContentVersion, Lesson), `app.content.snapshot.build_snapshot` (assembles the document).
  Used by: `app.content.importer.import_lesson`; `tests/test_content_publish.py`.
"""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.content.models import Activity, ContentVersion, Lesson
from app.content.snapshot import build_snapshot


async def publish_lesson(
    db: AsyncSession, lesson: Lesson, author: User | None, change_note: str | None = None
) -> ContentVersion:
    """Snapshot `lesson`'s working copy, write it as the next version, and publish it."""
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    snapshot = await build_snapshot(db, lesson)
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
    await db.flush()  # need version.id before repointing current_version_id below
    # Repoint both the lesson and its activity at the new version and mark them published.
    # Existing attempts keep their own pinned content_version_id, so this doesn't touch them.
    lesson.current_version_id = version.id
    lesson.status = "published"
    activity.current_version_id = version.id
    activity.status = "published"
    await db.flush()
    return version
