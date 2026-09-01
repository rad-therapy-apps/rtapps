"""What this file tests: `app/content/router.py` — the student-facing read endpoints
(/subjects, /subjects/{slug}, /lessons/{slug}), through the full HTTP stack.

Used here and why: httpx AsyncClient against the ASGI app — no network — exercising auth
gating, listing/filtering by published status, and the response body actually returned to
a browser (as opposed to `test_content_publish.py`, which checks the snapshot functions
directly).

How it fits the project: protects ADR-0003 — only published lessons/subjects are visible,
every route requires login (`dependencies=[Depends(require_user)]` on the router), and the
answer keys/explanations never reach students at the HTTP boundary either.

Works with: pytest-asyncio, httpx.
Depends on: `client`, `db` fixtures and the `register`/`seed_lesson` helpers from
`conftest.py`; `app.content.router`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import json

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import UserRole
from app.content.activity_importer import import_any
from tests.conftest import register, seed_lesson
from tests.test_activity_importer import QUIZ_DOC, SUBJECT
from tests.test_cohorts import login, promote


async def test_requires_login(client: AsyncClient, db: AsyncSession) -> None:
    """Both listing and lesson-detail routes are 401 without a session, even if content exists."""
    await seed_lesson(db)
    assert (await client.get("/api/v1/subjects")).status_code == 401
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 401


async def test_subjects_and_lessons_listing(client: AsyncClient, db: AsyncSession) -> None:
    """Subject list includes a lesson_count and activity_count; subject detail lists its lessons
    and activities; unknown slug 404s.
    """
    await seed_lesson(db)
    await register(client)
    subjects = (await client.get("/api/v1/subjects")).json()
    assert subjects == [
        {
            "slug": "radiation-biology",
            "title": "Radiation Biology",
            "order": 1,
            "lesson_count": 1,
            "activity_count": 1,
        }
    ]
    subject = (await client.get("/api/v1/subjects/radiation-biology")).json()
    assert subject["lessons"] == [{"slug": "rbe-and-oer", "title": "RBE and OER", "order": 1}]
    assert subject["activities"] == []
    assert (await client.get("/api/v1/subjects/nope")).status_code == 404


async def test_lesson_snapshot_is_stripped(client: AsyncClient, db: AsyncSession) -> None:
    """The lesson detail response carries no "answer"/"explanation" text anywhere in the
    serialised JSON body — this is the actual student-facing HTTP boundary for ADR-0003's
    "answer keys never reach students" guarantee."""
    lesson = await seed_lesson(db)
    await register(client)
    r = await client.get("/api/v1/lessons/rbe-and-oer")
    assert r.status_code == 200
    body = r.json()
    assert body["content_version_id"] == str(lesson.current_version_id)
    text = json.dumps(body)
    assert '"answer"' not in text and '"explanation"' not in text
    kc = body["snapshot"]["lesson"]["pages"][1]["blocks"][1]
    assert kc["body"] == {"type": "single_choice", "options": ["keeps increasing", "decreases"]}


async def test_unpublished_lesson_is_404(client: AsyncClient, db: AsyncSession) -> None:
    """A draft lesson (never published) is invisible: 404 on detail, absent from listings."""
    await seed_lesson(db, publish=False)
    await register(client)
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 404
    assert (await client.get("/api/v1/subjects")).json() == []


async def test_activity_snapshot_is_stripped(client: AsyncClient, db: AsyncSession) -> None:
    """Activity snapshot route returns stripped answers."""
    activity = await import_any(db, QUIZ_DOC)
    await register(client)
    r = await client.get(f"/api/v1/activities/{activity.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["kind"] == "quiz"
    for q in body["snapshot"]["quiz"]["questions"]:
        assert "answer" not in q["body"] and "explanation" not in q


async def test_assessment_activity_hidden_from_students(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Students get 404 for assessment activities (ADR-0006)."""
    activity = await import_any(db, QUIZ_DOC)
    activity.access = "assessment"
    await db.flush()
    await register(client, email="s@example.edu")
    r = await client.get(f"/api/v1/activities/{activity.id}")
    assert r.status_code == 404  # indistinguishable from missing
    # …and absent from the subject catalog.
    r = await client.get("/api/v1/subjects/radiation-biology")
    assert r.status_code == 404 or all(
        a["id"] != str(activity.id) for a in r.json().get("activities", [])
    )


async def test_educator_can_read_assessment_snapshot(client: AsyncClient, db: AsyncSession) -> None:
    """Educators can read assessment snapshots (stripped)."""
    activity = await import_any(db, QUIZ_DOC)
    activity.access = "assessment"
    await db.flush()
    await register(client, email="e@example.edu")
    await promote(db, "e@example.edu", UserRole.educator)
    await login(client, "e@example.edu")
    r = await client.get(f"/api/v1/activities/{activity.id}")
    assert r.status_code == 200
    # Stripped even for educators on this route.
    assert "answer" not in r.json()["snapshot"]["quiz"]["questions"][0]["body"]


async def test_subject_lists_activities_grouped(client: AsyncClient, db: AsyncSession) -> None:
    """Subject detail includes activities grouped by kind."""
    await import_any(db, QUIZ_DOC)
    await import_any(
        db,
        {
            "subject": SUBJECT,
            "flashcards": {
                "slug": "cards1",
                "title": "Cards",
                "cards": [{"term": "T", "definition": "D"}],
            },
        },
    )
    await register(client)
    r = await client.get("/api/v1/subjects/radiation-biology")
    assert r.status_code == 200  # no lessons needed when activities exist
    kinds = sorted(a["kind"] for a in r.json()["activities"])
    assert kinds == ["flashcards", "quiz"]
    r = await client.get("/api/v1/subjects")
    row = next(s for s in r.json() if s["slug"] == "radiation-biology")
    assert row["activity_count"] == 2 and row["lesson_count"] == 0
