"""What this file tests: `POST /authoring/activities/{id}/publish`, `GET .../preview`, and
`GET .../versions` — Task 10, the step that closes the authoring loop by freezing a working
copy into a new immutable `ContentVersion` and pointing students at it.

Used here and why: `client`/`db` from `conftest.py`; `make_educator` from `test_cohorts.py`
for role seeding, matching every other authoring test file's idiom; a lesson's `Activity.config`
is poked directly via the `db` fixture (no authoring route sets `import_notes` — only the
importer does) to simulate a migrated-content draft awaiting review.

How it fits the project: plan 3b Task 10 — the "author edits, previews, then publishes"
milestone's backend. Pins the ordering bug called out in the task brief: `import_notes` must
be cleared from `activity.config` BEFORE the snapshot is taken, not after, or the frozen
version (and therefore the student-facing snapshot) would still carry the converter's
review notes.

Works with: pytest-asyncio, httpx.
Depends on: `app.authoring.router`; `app.content.models` (Activity, ContentVersion, Lesson,
Subject); `app.audit.models.AuditLog`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.content.models import Activity, ContentVersion, Lesson, Subject
from tests.conftest import register
from tests.test_cohorts import make_educator

PAGE_ONE: dict[str, Any] = {
    "pages": [
        {
            "title": "Page One",
            "blocks": [
                {
                    "type": "rich_text",
                    "body": {
                        "type": "doc",
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Hi."}]}
                        ],
                    },
                },
                {
                    "type": "knowledge_check",
                    "key": "kc1",
                    "stem": {
                        "type": "doc",
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Q?"}]}
                        ],
                    },
                    "options": ["A", "B"],
                    "answer": 0,
                    "explanation": {
                        "type": "doc",
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Because."}]}
                        ],
                    },
                },
            ],
        }
    ]
}

PAGE_ONE_EDITED: dict[str, Any] = {
    "pages": [
        {
            "title": "Edited Page One",
            "blocks": [
                {
                    "type": "rich_text",
                    "body": {
                        "type": "doc",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "New content."}],
                            }
                        ],
                    },
                }
            ],
        }
    ]
}


async def _ensure_subject(db: AsyncSession, slug: str = "radiation-biology") -> None:
    if await db.scalar(select(Subject.id).where(Subject.slug == slug)) is None:
        db.add(Subject(slug=slug, title="Radiation Biology", order=1))
        await db.flush()


async def _create_draft_lesson(
    client: AsyncClient, db: AsyncSession, slug: str = "new-lesson"
) -> dict[str, Any]:
    await _ensure_subject(db)
    r = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "radiation-biology", "title": "New Lesson", "slug": slug},
    )
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    return body


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------


async def test_publish_full_loop_clears_import_notes_and_audits_once(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Publish a migrated draft lesson: v1, published, import_notes gone, student-visible,
    one audit row; publishing again produces v2."""
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    r = await client.put(f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=PAGE_ONE)
    assert r.status_code == 200, r.text

    # Simulate a migrated lesson carrying converter review notes (only the importer sets
    # these in practice; poked directly here since no authoring route writes them).
    activity = await db.get(Activity, uuid.UUID(lesson["activity_id"]))
    assert activity is not None
    activity.config = {"import_notes": ["no correct answer for q1"]}
    await db.commit()

    r = await client.post(
        f"/api/v1/authoring/activities/{lesson['activity_id']}/publish",
        json={"change_note": "first publish"},
    )
    assert r.status_code == 201, r.text
    v1 = r.json()
    assert v1["version"] == 1 and v1["change_note"] == "first publish"
    assert v1["author_display_name"] == "edu"
    uuid.UUID(v1["id"])

    await db.refresh(activity)
    assert activity.status == "published"
    assert "import_notes" not in activity.config

    rows = (await db.scalars(select(AuditLog).where(AuditLog.action == "publish_activity"))).all()
    assert len(rows) == 1
    assert rows[0].target_type == "activity" and rows[0].target_id == activity.id

    student = await client.get(f"/api/v1/activities/{lesson['activity_id']}")
    assert student.status_code == 200, student.text
    body = student.json()
    assert body["snapshot"]["lesson"]["pages"][0]["title"] == "Page One"
    assert body["content_version_id"] == v1["id"]

    r2 = await client.post(f"/api/v1/authoring/activities/{lesson['activity_id']}/publish", json={})
    assert r2.status_code == 201, r2.text
    assert r2.json()["version"] == 2
    assert r2.json()["change_note"] is None


async def test_publish_snapshot_never_carries_import_notes(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Pin: the frozen `ContentVersion.snapshot`'s `activity.config` has no `import_notes`
    key — the ordering bug the task brief calls out (clear before, not after, snapshotting)."""
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    activity_id = uuid.UUID(lesson["activity_id"])
    activity = await db.get(Activity, activity_id)
    assert activity is not None
    activity.config = {"import_notes": ["some note"]}
    await db.commit()

    r = await client.post(f"/api/v1/authoring/activities/{lesson['activity_id']}/publish", json={})
    assert r.status_code == 201, r.text

    version = await db.scalar(
        select(ContentVersion).where(ContentVersion.activity_id == activity_id)
    )
    assert version is not None
    assert "import_notes" not in version.snapshot["activity"]["config"]


async def test_publish_lesson_kind_repoints_lesson_pointer(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Publishing a lesson-kind activity keeps `Lesson.current_version_id`/`status` in sync
    with the activity's own, via `publish_lesson`."""
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    r = await client.post(f"/api/v1/authoring/activities/{lesson['activity_id']}/publish", json={})
    assert r.status_code == 201, r.text
    version_id = uuid.UUID(r.json()["id"])

    lesson_row = await db.get(Lesson, uuid.UUID(lesson["lesson_id"]))
    assert lesson_row is not None
    assert lesson_row.status == "published"
    assert lesson_row.current_version_id == version_id


async def test_publish_fresh_empty_lesson_works(client: AsyncClient, db: AsyncSession) -> None:
    """An empty draft (no pages ever added) is a legal publish target."""
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    r = await client.post(f"/api/v1/authoring/activities/{lesson['activity_id']}/publish", json={})
    assert r.status_code == 201, r.text

    student = await client.get(f"/api/v1/activities/{lesson['activity_id']}")
    assert student.status_code == 200, student.text
    assert student.json()["snapshot"]["lesson"]["pages"] == []


async def test_publish_unknown_activity_404(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.post(f"/api/v1/authoring/activities/{uuid.uuid4()}/publish", json={})
    assert r.status_code == 404


async def test_publish_student_403(client: AsyncClient, db: AsyncSession) -> None:
    await register(client)
    r = await client.post(f"/api/v1/authoring/activities/{uuid.uuid4()}/publish", json={})
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------


async def test_preview_shows_edit_while_student_still_serves_published_version(
    client: AsyncClient, db: AsyncSession
) -> None:
    """The edit -> preview -> publish loop's core invariant: preview reflects an unpublished
    edit; the student route keeps serving the last published version until republished."""
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    r = await client.put(f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=PAGE_ONE)
    assert r.status_code == 200, r.text
    r = await client.post(f"/api/v1/authoring/activities/{lesson['activity_id']}/publish", json={})
    assert r.status_code == 201, r.text

    student_before = await client.get(f"/api/v1/activities/{lesson['activity_id']}")
    assert student_before.json()["snapshot"]["lesson"]["pages"][0]["title"] == "Page One"

    r = await client.put(
        f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=PAGE_ONE_EDITED
    )
    assert r.status_code == 200, r.text

    preview = await client.get(f"/api/v1/authoring/activities/{lesson['activity_id']}/preview")
    assert preview.status_code == 200, preview.text
    assert preview.json()["lesson"]["pages"][0]["title"] == "Edited Page One"

    student_after = await client.get(f"/api/v1/activities/{lesson['activity_id']}")
    assert student_after.json()["snapshot"]["lesson"]["pages"][0]["title"] == "Page One"


async def test_preview_never_leaks_answer_or_explanation(
    client: AsyncClient, db: AsyncSession
) -> None:
    """No knowledge_check block in a preview carries `answer` (inside `body`) or
    `explanation`, mirroring `test_content_publish.py`'s strip assertions."""
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    r = await client.put(f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=PAGE_ONE)
    assert r.status_code == 200, r.text

    preview = await client.get(f"/api/v1/authoring/activities/{lesson['activity_id']}/preview")
    assert preview.status_code == 200, preview.text
    body = preview.json()

    checked_a_block = False
    for page in body["lesson"]["pages"]:
        for block in page["blocks"]:
            assert "explanation" not in block
            if block["type"] == "knowledge_check":
                assert "answer" not in block["body"]
                checked_a_block = True
    assert checked_a_block  # the fixture actually contains a knowledge_check to assert on


async def test_preview_unknown_activity_404(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.get(f"/api/v1/authoring/activities/{uuid.uuid4()}/preview")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Versions
# ---------------------------------------------------------------------------


async def test_versions_ordering_and_fields(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    r1 = await client.post(
        f"/api/v1/authoring/activities/{lesson['activity_id']}/publish",
        json={"change_note": "first"},
    )
    assert r1.status_code == 201, r1.text
    r2 = await client.post(
        f"/api/v1/authoring/activities/{lesson['activity_id']}/publish",
        json={"change_note": "second"},
    )
    assert r2.status_code == 201, r2.text

    r = await client.get(f"/api/v1/authoring/activities/{lesson['activity_id']}/versions")
    assert r.status_code == 200, r.text
    versions = r.json()
    assert [v["version"] for v in versions] == [2, 1]
    assert [v["change_note"] for v in versions] == ["second", "first"]
    assert all(v["author_display_name"] == "edu" for v in versions)
    assert versions[0]["id"] == r2.json()["id"]
    assert versions[1]["id"] == r1.json()["id"]


async def test_versions_unknown_activity_404(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.get(f"/api/v1/authoring/activities/{uuid.uuid4()}/versions")
    assert r.status_code == 404
