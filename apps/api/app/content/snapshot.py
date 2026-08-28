"""Assembles and reads the `content_version.snapshot` JSON document.

What this file does: `build_snapshot` walks a lesson's working-copy tables (activity,
lesson, pages, blocks, questions) into one nested dict — this is what gets frozen into a
`content_version` row on publish. `strip_answers` and `knowledge_checks` then read that
frozen snapshot back: the former for the student-facing API, the latter for grading.

Used here and why: plain dict/list assembly (no schema class for the snapshot itself,
unlike the ProseMirror body fields nested inside it, which `app.content.prose` already
validated on the way in). `copy.deepcopy` in `strip_answers` so the stripped copy never
aliases the unstripped `ContentVersion.snapshot` still held by the ORM session/cache.

How it fits the project: this is the middle step of the publish pipeline (ADR-0003) —
authored working copy -> `build_snapshot` -> immutable `content_version.snapshot` ->
`strip_answers` for `app.content.router` (students) or read unstripped for grading
(`app.attempts.router`, via `content_version.id` pinned on the attempt).

Works with:
  Depends on: `app.content.models` (Activity, Lesson, Subject; reads `lesson.pages` /
    `page.blocks` / `block.question`, populated by their `lazy="selectin"` relationships).
  Used by: `app.content.service.publish_lesson` (`build_snapshot`); `app.content.router`
    (`strip_answers`); `app.attempts.router` (`knowledge_checks`); `tests/test_content_publish.py`.
"""

import copy
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, Lesson, Subject

# Applied under any values published in `activity.config` so an unset pass_percent still
# has a sane default in every snapshot (see `submit_attempt`'s pass_percent lookup).
DEFAULT_CONFIG: dict[str, Any] = {"pass_percent": 80}


async def build_snapshot(db: AsyncSession, lesson: Lesson) -> dict[str, Any]:
    """Resolve the working copy of `lesson` into one JSON document (unstripped)."""
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    subject = await db.get(Subject, lesson.subject_id)
    pages = []
    # Walk pages -> blocks in their fixed `order`, turning each block into its snapshot
    # shape. A knowledge_check block's `key` (stable across edits) and the answer key from
    # its linked Question are both inlined here — this is the one copy of the answer that
    # ever exists; `strip_answers` below removes it again for anything a student can see.
    for page in lesson.pages:
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
                # `answer` lives inside `body` (e.g. the option index); `explanation` is a
                # sibling key on the block itself. Both must go before this reaches a student.
                block["body"].pop("answer", None)
                block.pop("explanation", None)
    return out


def knowledge_checks(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Index a snapshot's knowledge_check blocks by their stable `key` for O(1) lookup

    during grading (see `app.attempts.router.grade_item`/`submit_attempt`).
    """
    return {
        block["key"]: block
        for page in snapshot["lesson"]["pages"]
        for block in page["blocks"]
        if block["type"] == "knowledge_check"
    }
