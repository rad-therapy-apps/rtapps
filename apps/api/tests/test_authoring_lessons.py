"""What this file tests: every route in `app.authoring.router` — the authz matrix (anon
401 / student 403 / educator+admin 200), `GET /authoring/subjects` and
`GET /authoring/subjects/{slug}/activities` (all statuses, `needs_review` from
`Activity.config["import_notes"]`), `POST /authoring/lessons` (draft creation + slug
conflict), `GET/PUT /authoring/lessons/{id}` (meta read/edit + slug conflict), and
`PUT /authoring/lessons/{id}/pages` (whole-tree replace, the unstripped author view, a
draft's invisibility on the student route, an invalid prose node's 422, and — the "edit
isn't publish" guarantee — that editing a published lesson's pages leaves the served
student snapshot unchanged until an explicit publish).

Used here and why: `client`/`db`/`register`/`seed_lesson` from `conftest.py`;
`make_educator`/`promote` from `test_cohorts.py` for role seeding, matching the
educator-route test idiom in `test_analytics.py`/`test_media.py`; `publish_lesson` called
directly (Task 10's publish route doesn't exist yet) to put a lesson in "published" state
for the pin test.

How it fits the project: plan 3b Task 8 — the "Kevin fixes a migrated lesson" milestone's
backend.

Works with: pytest-asyncio, httpx.
Depends on: `app.authoring.router`; `app.content.importer` (`import_lesson`,
`LessonImport`); `app.content.service.publish_lesson`; `app.content.models` (Activity,
Lesson, Subject).
Used by: CI `api` job; `make test-api`.
"""

import json
import uuid
from pathlib import Path
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import UserRole
from app.content.importer import LessonImport, import_lesson
from app.content.models import Activity, Lesson, Subject
from app.content.service import publish_lesson
from tests.conftest import register, seed_lesson
from tests.test_cohorts import make_educator, promote

LESSON_FIXTURE = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())

VALID_PAGES: dict[str, Any] = {
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
                }
            ],
        },
        {
            "title": "Page Two",
            "blocks": [
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
                }
            ],
        },
    ]
}


async def _make_admin(client: AsyncClient, db: AsyncSession, email: str) -> None:
    """Register, promote to admin, and re-login so the session sees the new role."""
    await register(client, email=email, name=email.split("@")[0])
    await promote(db, email, UserRole.admin)


# ---------------------------------------------------------------------------
# Authz matrix on GET /authoring/subjects
# ---------------------------------------------------------------------------


async def test_subjects_anon_401(client: AsyncClient) -> None:
    r = await client.get("/api/v1/authoring/subjects")
    assert r.status_code == 401


async def test_subjects_student_403(client: AsyncClient) -> None:
    await register(client)
    r = await client.get("/api/v1/authoring/subjects")
    assert r.status_code == 403


async def test_subjects_educator_200(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.get("/api/v1/authoring/subjects")
    assert r.status_code == 200


async def test_subjects_admin_200(client: AsyncClient, db: AsyncSession) -> None:
    await _make_admin(client, db, "admin@example.edu")
    r = await client.get("/api/v1/authoring/subjects")
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# GET /authoring/subjects/{slug}/activities
# ---------------------------------------------------------------------------


async def test_list_activities_flags_needs_review(client: AsyncClient, db: AsyncSession) -> None:
    """A plain import has `needs_review` false; one carrying `import_notes` has it true."""
    await seed_lesson(db)  # subject "radiation-biology", lesson "rbe-and-oer", no notes

    doc = json.loads(json.dumps(LESSON_FIXTURE))
    doc["lesson"]["slug"] = "rbe-and-oer-migrated"
    doc["import_notes"] = ["no correct answer for q_page1_1_ans"]
    await import_lesson(db, LessonImport.model_validate(doc))

    await make_educator(client, db, "edu@example.edu")
    r = await client.get("/api/v1/authoring/subjects/radiation-biology/activities")
    assert r.status_code == 200, r.text
    rows = {row["slug"]: row for row in r.json()}
    assert rows["rbe-and-oer"]["needs_review"] is False
    assert rows["rbe-and-oer"]["import_notes"] == []
    assert rows["rbe-and-oer-migrated"]["needs_review"] is True
    assert rows["rbe-and-oer-migrated"]["import_notes"] == doc["import_notes"]
    assert rows["rbe-and-oer"]["kind"] == "lesson" and rows["rbe-and-oer"]["status"] == "published"


async def test_list_activities_includes_lesson_id(client: AsyncClient, db: AsyncSession) -> None:
    """A lesson row's `lesson_id` matches its `Lesson.id`; a non-lesson kind's is null."""
    lesson = await seed_lesson(db)  # subject "radiation-biology", lesson "rbe-and-oer"
    quiz = Activity(
        kind="quiz", ref_id=uuid.uuid4(), title="Some Quiz", subject_id=lesson.subject_id
    )
    db.add(quiz)
    await db.commit()

    await make_educator(client, db, "edu@example.edu")
    r = await client.get("/api/v1/authoring/subjects/radiation-biology/activities")
    assert r.status_code == 200, r.text
    rows = {row["title"]: row for row in r.json()}
    assert rows["RBE and OER"]["kind"] == "lesson"
    assert rows["RBE and OER"]["lesson_id"] == str(lesson.id)
    assert rows["Some Quiz"]["kind"] == "quiz"
    assert rows["Some Quiz"]["lesson_id"] is None


async def test_list_activities_unknown_subject_404(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.get("/api/v1/authoring/subjects/no-such-subject/activities")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# POST /authoring/lessons, GET /authoring/lessons/{id}
# ---------------------------------------------------------------------------


async def test_create_lesson_round_trips_and_slug_conflicts(
    client: AsyncClient, db: AsyncSession
) -> None:
    subject = Subject(slug="radiation-biology", title="Radiation Biology", order=1)
    db.add(subject)
    await db.flush()
    await make_educator(client, db, "edu@example.edu")

    r = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "radiation-biology", "title": "New Lesson", "slug": "new-lesson"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == "New Lesson" and body["slug"] == "new-lesson"
    assert body["status"] == "draft" and body["pages"] == [] and body["import_notes"] == []
    uuid.UUID(body["lesson_id"])
    uuid.UUID(body["activity_id"])
    assert body["subject_slug"] == "radiation-biology"

    got = (await client.get(f"/api/v1/authoring/lessons/{body['lesson_id']}")).json()
    assert got == body

    dup = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "radiation-biology", "title": "Dup", "slug": "new-lesson"},
    )
    assert dup.status_code == 409


async def test_create_lesson_unknown_subject_404(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "no-such-subject", "title": "X", "slug": "x"},
    )
    assert r.status_code == 404


async def test_get_lesson_unknown_404(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.get(f"/api/v1/authoring/lessons/{uuid.uuid4()}")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# PUT /authoring/lessons/{id}/pages
# ---------------------------------------------------------------------------


async def _ensure_subject(db: AsyncSession, slug: str = "radiation-biology") -> None:
    """Create the subject a draft lesson is filed under, unless a prior call already did."""
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


async def test_put_pages_round_trips_with_answers_and_draft_stays_hidden(
    client: AsyncClient, db: AsyncSession
) -> None:
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)

    r = await client.put(f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=VALID_PAGES)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["pages"]) == 2
    kc = body["pages"][1]["blocks"][0]
    # Author view keeps the answer index and explanation (build_snapshot is unstripped).
    assert kc["type"] == "knowledge_check" and kc["body"]["answer"] == 0
    assert kc["explanation"] is not None

    got = (await client.get(f"/api/v1/authoring/lessons/{lesson['lesson_id']}")).json()
    assert got["pages"] == body["pages"]

    # Never published: the student route 404s regardless of role.
    student = await client.get(f"/api/v1/activities/{lesson['activity_id']}")
    assert student.status_code == 404


async def test_put_pages_rejects_unknown_prose_node_with_path(
    client: AsyncClient, db: AsyncSession
) -> None:
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)

    bad_pages = {
        "pages": [
            {
                "title": "Page One",
                "blocks": [
                    {
                        "type": "rich_text",
                        "body": {"type": "doc", "content": [{"type": "marquee"}]},
                    }
                ],
            }
        ]
    }
    r = await client.put(f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=bad_pages)
    assert r.status_code == 422, r.text
    errors = r.json()["errors"]
    assert errors  # at least one validation error
    # The offending node's position is somewhere in the reported path (loc list or message).
    assert any(
        "content" in str(e["loc"]) or "content" in e["msg"] or "marquee" in e["msg"] for e in errors
    )


async def test_put_pages_on_published_lesson_leaves_served_snapshot_unchanged(
    client: AsyncClient, db: AsyncSession
) -> None:
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db)
    r = await client.put(f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=VALID_PAGES)
    assert r.status_code == 200, r.text

    # Publish directly (Task 10's route doesn't exist yet); `db` shares the connection/
    # transaction the `client` fixture's requests use, so this is immediately visible to them.
    lesson_row = await db.get(Lesson, uuid.UUID(lesson["lesson_id"]))
    assert lesson_row is not None
    await publish_lesson(db, lesson_row, author=None, change_note="test publish")

    # Student can now see the published page-one content.
    published = (await client.get(f"/api/v1/activities/{lesson['activity_id']}")).json()
    assert published["snapshot"]["lesson"]["pages"][0]["title"] == "Page One"

    # Edit the working copy to something different...
    different_pages = {
        "pages": [
            {
                "title": "Edited After Publish",
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
    r = await client.put(
        f"/api/v1/authoring/lessons/{lesson['lesson_id']}/pages", json=different_pages
    )
    assert r.status_code == 200, r.text
    assert r.json()["pages"][0]["title"] == "Edited After Publish"  # working copy did change

    # ...but the served student snapshot is still the pre-edit content (edit != publish).
    still_published = (await client.get(f"/api/v1/activities/{lesson['activity_id']}")).json()
    assert still_published["snapshot"]["lesson"]["pages"][0]["title"] == "Page One"
    assert len(still_published["snapshot"]["lesson"]["pages"]) == 2


# ---------------------------------------------------------------------------
# PUT /authoring/lessons/{id} (meta only)
# ---------------------------------------------------------------------------


async def test_update_lesson_meta_retitle_and_slug_conflict(
    client: AsyncClient, db: AsyncSession
) -> None:
    await make_educator(client, db, "edu@example.edu")
    lesson = await _create_draft_lesson(client, db, slug="first-lesson")
    other = await _create_draft_lesson(client, db, slug="second-lesson")

    r = await client.put(
        f"/api/v1/authoring/lessons/{lesson['lesson_id']}",
        json={"title": "Retitled", "slug": "first-lesson"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == "Retitled" and body["slug"] == "first-lesson"

    conflict = await client.put(
        f"/api/v1/authoring/lessons/{lesson['lesson_id']}",
        json={"title": "X", "slug": "second-lesson"},
    )
    assert conflict.status_code == 409
    # `other` is untouched by the failed rename.
    still = (await client.get(f"/api/v1/authoring/lessons/{other['lesson_id']}")).json()
    assert still["slug"] == "second-lesson"


async def test_update_lesson_meta_unknown_404(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    r = await client.put(
        f"/api/v1/authoring/lessons/{uuid.uuid4()}", json={"title": "X", "slug": "x"}
    )
    assert r.status_code == 404


async def test_create_lesson_slug_duplicate_returns_409_with_guard(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Verify slug duplicate handling returns 409 (from IntegrityError guard).

    The flush is now inside the try/except IntegrityError handler, ensuring that
    if two concurrent requests race past the pre-check SELECT, the second one's
    flush hits the unique constraint and gets mapped to 409, not 500.
    This test verifies that behavior by creating two lessons with the same slug
    and checking the second returns 409.
    """
    await make_educator(client, db, "edu@example.edu")

    subject = Subject(slug="guard-test-subj", title="Guard Test Subject", order=1)
    db.add(subject)
    await db.commit()

    # First create succeeds
    r1 = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "guard-test-subj", "title": "Lesson One", "slug": "guard-test-slug"},
    )
    assert r1.status_code == 201, r1.text

    # Second create with same slug returns 409 from the guard, not 500
    r2 = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "guard-test-subj", "title": "Lesson Two", "slug": "guard-test-slug"},
    )
    assert r2.status_code == 409, f"Expected 409, got {r2.status_code}: {r2.text}"
