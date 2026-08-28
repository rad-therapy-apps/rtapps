import copy
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, Lesson, Subject

DEFAULT_CONFIG: dict[str, Any] = {"pass_percent": 80}


async def build_snapshot(db: AsyncSession, lesson: Lesson) -> dict[str, Any]:
    """Resolve the working copy of `lesson` into one JSON document (unstripped)."""
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    subject = await db.get(Subject, lesson.subject_id)
    await db.refresh(lesson, ["pages"])
    pages = []
    for page in lesson.pages:
        await db.refresh(page, ["blocks"])
        blocks: list[dict[str, Any]] = []
        for block in page.blocks:
            if block.type == "rich_text":
                blocks.append({"type": "rich_text", "body": block.body})
            elif block.type == "knowledge_check":
                q = block.question
                if q is None:
                    raise ValueError(f"knowledge_check {block.body.get('key')} has no question")
                blocks.append(
                    {
                        "type": "knowledge_check",
                        "key": block.body["key"],
                        "question_id": str(q.id),
                        "stem": q.stem,
                        "body": {"type": q.type, **q.body},
                        "explanation": q.explanation,
                    }
                )
        pages.append({"order": page.order, "title": page.title, "blocks": blocks})
    return {
        "activity": {
            "id": str(activity.id),
            "kind": activity.kind,
            "title": activity.title,
            "config": {**DEFAULT_CONFIG, **activity.config},
        },
        "lesson": {
            "id": str(lesson.id),
            "slug": lesson.slug,
            "title": lesson.title,
            "subject": {"slug": subject.slug, "title": subject.title} if subject else None,
            "pages": pages,
        },
    }


def strip_answers(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Deep copy of `snapshot` with answer keys and explanations removed (student-facing)."""
    out = copy.deepcopy(snapshot)
    for page in out["lesson"]["pages"]:
        for block in page["blocks"]:
            if block["type"] == "knowledge_check":
                block["body"].pop("answer", None)
                block.pop("explanation", None)
    return out


def knowledge_checks(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        block["key"]: block
        for page in snapshot["lesson"]["pages"]
        for block in page["blocks"]
        if block["type"] == "knowledge_check"
    }
