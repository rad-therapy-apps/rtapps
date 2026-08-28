from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.content.models import Activity, ContentVersion, Lesson
from app.content.snapshot import build_snapshot


async def publish_lesson(
    db: AsyncSession, lesson: Lesson, author: User | None, change_note: str | None = None
) -> ContentVersion:
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    snapshot = await build_snapshot(db, lesson)
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
    lesson.current_version_id = version.id
    lesson.status = "published"
    activity.current_version_id = version.id
    activity.status = "published"
    await db.flush()
    return version
