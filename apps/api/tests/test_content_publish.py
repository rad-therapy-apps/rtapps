import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.importer import LessonImport, import_lesson
from app.content.service import publish_lesson
from app.content.snapshot import build_snapshot, knowledge_checks, strip_answers

FIXTURE = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())


async def test_snapshot_shape_and_strip(db: AsyncSession) -> None:
    lesson = await import_lesson(db, LessonImport.model_validate(FIXTURE), publish=False)
    snap = await build_snapshot(db, lesson)
    assert snap["activity"]["kind"] == "lesson" and snap["activity"]["config"] == {
        "pass_percent": 80
    }
    assert (
        snap["lesson"]["slug"] == "rbe-and-oer"
        and snap["lesson"]["subject"]["slug"] == "radiation-biology"
    )
    assert [p["title"] for p in snap["lesson"]["pages"]] == [
        "Not All Radiation Damages Equally",
        "RBE",
    ]
    kc = snap["lesson"]["pages"][1]["blocks"][1]
    assert (
        kc["type"] == "knowledge_check" and kc["key"] == "lq_page2_1" and kc["body"]["answer"] == 1
    )
    assert knowledge_checks(snap) == {"lq_page2_1": kc}

    stripped = strip_answers(snap)
    assert "answer" not in json.dumps(stripped)
    assert "explanation" not in json.dumps(stripped)
    assert stripped["lesson"]["pages"][1]["blocks"][1]["body"]["options"] == [
        "keeps increasing",
        "decreases",
    ]
    assert snap["lesson"]["pages"][1]["blocks"][1]["body"]["answer"] == 1  # original untouched


async def test_publish_creates_versions_and_pins_pointers(db: AsyncSession) -> None:
    lesson = await import_lesson(db, LessonImport.model_validate(FIXTURE), publish=False)
    v1 = await publish_lesson(db, lesson, author=None, change_note="first")
    assert v1.version == 1 and lesson.current_version_id == v1.id and lesson.status == "published"
    lesson.title = "RBE and OER (edited)"
    v2 = await publish_lesson(db, lesson, author=None)
    assert v2.version == 2 and lesson.current_version_id == v2.id
    assert v1.snapshot["lesson"]["title"] == "RBE and OER"  # immutable
    assert v2.snapshot["lesson"]["title"] == "RBE and OER (edited)"
