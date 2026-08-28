"""What this file tests: `app/content/snapshot.py` (build_snapshot, strip_answers,
knowledge_checks) and `app/content/service.publish_lesson` — turning a working-copy lesson
tree into an immutable, versioned, student-safe JSON snapshot.

Used here and why: a real `db` session driving the actual importer and publish service —
no HTTP layer — so the snapshot shape and answer-stripping are checked directly against
the data structures the attempts/content routers consume.

How it fits the project: protects ADR-0003 (content as JSON snapshots, published versions
immutable) and the requirement that answer keys and explanations never reach students —
`strip_answers` is the only thing standing between the database and what `GET
/lessons/{slug}` returns (see `test_content_routes.py`).

Works with: pytest-asyncio, sqlalchemy asyncio.
Depends on: `db` fixture from `conftest.py`; `tests/fixtures/lesson_min.json`;
`app.content.importer`, `app.content.service`, `app.content.snapshot`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.importer import LessonImport, import_lesson
from app.content.service import publish_lesson
from app.content.snapshot import build_snapshot, knowledge_checks, strip_answers

FIXTURE = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())


async def test_snapshot_shape_and_strip(db: AsyncSession) -> None:
    """build_snapshot resolves the full tree (with answers); strip_answers removes every
    "answer" and "explanation" key from knowledge checks while leaving the source snapshot
    untouched, and knowledge_checks() indexes blocks by their item key."""
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
    # Searching the serialised JSON (not just the known key) catches any answer/explanation
    # leaking in from an unexpected place strip_answers didn't anticipate.
    assert "answer" not in json.dumps(stripped)
    assert "explanation" not in json.dumps(stripped)
    assert stripped["lesson"]["pages"][1]["blocks"][1]["body"]["options"] == [
        "keeps increasing",
        "decreases",
    ]
    assert snap["lesson"]["pages"][1]["blocks"][1]["body"]["answer"] == 1  # original untouched


async def test_publish_creates_versions_and_pins_pointers(db: AsyncSession) -> None:
    """Each publish bumps the version number and repoints the lesson's current_version_id;
    earlier ContentVersion snapshots stay frozen even after the lesson is edited again."""
    lesson = await import_lesson(db, LessonImport.model_validate(FIXTURE), publish=False)
    v1 = await publish_lesson(db, lesson, author=None, change_note="first")
    assert v1.version == 1 and lesson.current_version_id == v1.id and lesson.status == "published"
    lesson.title = "RBE and OER (edited)"
    v2 = await publish_lesson(db, lesson, author=None)
    assert v2.version == 2 and lesson.current_version_id == v2.id
    assert v1.snapshot["lesson"]["title"] == "RBE and OER"  # immutable
    assert v2.snapshot["lesson"]["title"] == "RBE and OER (edited)"
