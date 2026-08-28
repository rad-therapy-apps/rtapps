"""What this file tests: the SQLAlchemy ORM mapping in `app/content/models.py` — that the
Subject/Lesson/LessonPage/ContentBlock/Question/Activity tree persists and reloads through
its relationships with the right ordering, defaults, and cross-links intact.

Used here and why: a real `db` session/transaction (no HTTP layer) — this is a model-layer
test, checking the ORM mapping itself rather than any route built on top of it.

How it fits the project: protects ADR-0003 (content stored in Postgres as ProseMirror-ish
JSON trees) — the working-copy tree must round-trip losslessly before it can ever be
snapshotted for publishing (see `test_content_publish.py`).

Works with: pytest-asyncio, sqlalchemy asyncio.
Depends on: `db` fixture from `conftest.py`; `app.content.models`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, ContentBlock, Lesson, LessonPage, Question, Subject


async def test_lesson_tree_round_trip(db: AsyncSession) -> None:
    """Build a subject/lesson/page/blocks/question/activity tree via relationships, then
    reload the lesson by id and check page order, block types, the question back-link, and
    that new lessons/activities default to draft status with no current version."""
    subject = Subject(slug="radiation-biology", title="Radiation Biology", order=1)
    lesson = Lesson(subject=subject, slug="rbe-and-oer", title="RBE and OER", order=1)
    page = LessonPage(lesson=lesson, order=1, title="Page 1")
    q = Question(
        type="single_choice",
        stem={"type": "doc", "content": [{"type": "paragraph"}]},
        body={"options": ["A", "B"], "answer": 1},
        explanation=None,
    )
    ContentBlock(
        page=page,
        order=1,
        type="rich_text",
        body={"type": "doc", "content": [{"type": "paragraph"}]},
    )
    ContentBlock(page=page, order=2, type="knowledge_check", body={"key": "lq_page1_1"}, question=q)
    db.add_all([subject, lesson])
    await db.flush()  # ids are assigned at flush time
    activity = Activity(
        kind="lesson", ref_id=lesson.id, title=lesson.title, subject=subject, lesson=lesson
    )
    db.add(activity)
    await db.flush()

    loaded = await db.get(Lesson, lesson.id)
    assert loaded is not None and isinstance(loaded.id, uuid.UUID)
    assert [p.title for p in loaded.pages] == ["Page 1"]
    assert [b.type for b in loaded.pages[0].blocks] == ["rich_text", "knowledge_check"]
    assert loaded.pages[0].blocks[1].question is q
    assert loaded.status == "draft" and loaded.current_version_id is None
    assert activity.config == {} and activity.status == "draft"
