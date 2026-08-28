import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, ContentBlock, Lesson, LessonPage, Question, Subject


async def test_lesson_tree_round_trip(db: AsyncSession) -> None:
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
