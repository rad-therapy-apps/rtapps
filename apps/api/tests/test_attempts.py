"""What this file tests: the attempt lifecycle in `app/attempts/router.py` — starting an
attempt against a published activity, grading individual knowledge-check items, submitting
for a final score, and idempotent/ownership/state-machine edge cases around all three.

Used here and why: httpx AsyncClient against the ASGI app (via the `client` fixture) — no
network — driving the actual FastAPI routes and real Postgres rows, so the score/percent
math and the row-lock-based idempotency in `submit_attempt` are exercised end to end.

How it fits the project: protects ADR-0004 (unified attempt/result schema) — one attempt
can only be submitted once per idempotency key, scores are derived from the immutable
content-version snapshot (not the live lesson), and ownership/status transitions are a
strict state machine (in_progress -> submitted, or -> abandoned).

Works with: pytest-asyncio, httpx.
Depends on: `client`, `db` fixtures and the `register`/`seed_lesson` helpers from
`conftest.py`; `app.attempts.router`; `app.content.importer` (via `seed_lesson`).
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import uuid
from typing import Any
from unittest.mock import patch

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import app.attempts.router as attempts_router
from app.attempts.models import Attempt
from app.content.activity_importer import import_any
from app.content.models import Activity
from tests.conftest import register, seed_lesson
from tests.test_activity_importer import QUIZ_DOC, SUBJECT


async def _start(client: AsyncClient) -> dict[str, Any]:
    """Look up the seeded lesson's activity and start a fresh in-progress attempt on it."""
    lesson = (await client.get("/api/v1/lessons/rbe-and-oer")).json()
    r = await client.post(f"/api/v1/activities/{lesson['activity_id']}/attempts")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["content_version_id"] == lesson["content_version_id"]
    assert body["status"] == "in_progress"
    return body


async def test_start_grade_submit_flow(client: AsyncClient, db: AsyncSession) -> None:
    """Full happy path: start -> grade (wrong, then right) -> submit -> replay -> lock out."""
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)

    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items",
        json={"item_key": "lq_page2_1", "response": {"choice": 0}},
    )
    assert r.status_code == 200 and r.json()["correct"] is False and r.json()["score"] == 0
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items",
        json={"item_key": "lq_page2_1", "response": {"choice": 1}},
    )
    assert (
        r.json()["correct"] is True and r.json()["explanation"]["type"] == "doc"
    )  # last write wins, explanation returned after grading

    key = str(uuid.uuid4())
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": key}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "submitted" and body["score"] == 1 and body["max_score"] == 1
    assert body["percent"] == 100 and body["passed"] is True and body["submitted_at"]

    # Same key on an already-submitted attempt replays the stored result instead of erroring.
    again = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": key}
    )
    assert again.status_code == 200 and again.json() == body
    # A different key against an already-submitted attempt is a conflict, not a replay.
    other = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit",
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert other.status_code == 409
    # Grading is also locked out once the attempt is submitted.
    late = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items",
        json={"item_key": "lq_page2_1", "response": {"choice": 1}},
    )
    assert late.status_code == 409

    results = (await client.get("/api/v1/me/results")).json()
    assert len(results) == 1 and results[0]["lesson_slug"] == "rbe-and-oer"
    assert results[0]["percent"] == 100


async def test_unanswered_checks_count_as_zero(client: AsyncClient, db: AsyncSession) -> None:
    """Submitting without grading any item still scores every knowledge check as 0, not skipped."""
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k1"}
    )
    assert r.json()["score"] == 0 and r.json()["max_score"] == 1
    assert r.json()["percent"] == 0 and r.json()["passed"] is False


async def test_submit_requires_idempotency_key(client: AsyncClient, db: AsyncSession) -> None:
    """Missing Idempotency-Key header is a 400, not a silent no-op submit."""
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    assert (await client.post(f"/api/v1/attempts/{attempt['id']}/submit")).status_code == 400


async def test_unknown_item_key_is_404_and_bad_body_422(
    client: AsyncClient, db: AsyncSession
) -> None:
    """An item_key absent from the content snapshot is 404; a missing `response` field is 422."""
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items",
        json={"item_key": "nope", "response": {"choice": 0}},
    )
    assert r.status_code == 404
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items", json={"item_key": "lq_page2_1"}
    )
    assert r.status_code == 422


async def test_other_users_attempt_is_404(client: AsyncClient, db: AsyncSession) -> None:
    """A second user cannot grade or submit the first user's attempt (404s it away, not 403)."""
    await seed_lesson(db)
    await register(client, email="one@example.edu")
    attempt = await _start(client)
    client.cookies.clear()  # drop user one's session cookie before logging in as user two
    await register(client, email="two@example.edu")
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items",
        json={"item_key": "lq_page2_1", "response": {"choice": 1}},
    )
    assert r.status_code == 404
    assert (
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "x"}
        )
    ).status_code == 404


async def test_unpublished_activity_cannot_start(client: AsyncClient, db: AsyncSession) -> None:
    """Starting an attempt on a draft (unpublished) activity is 404 — it has no current version."""
    lesson = await seed_lesson(db, publish=False)
    await register(client)
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None
    assert (await client.post(f"/api/v1/activities/{activity.id}/attempts")).status_code == 404


async def test_abandoned_attempt_cannot_be_submitted_or_graded(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Once an attempt is (e.g. externally) marked abandoned, grade/submit both reject it."""
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    row = await db.get(Attempt, uuid.UUID(attempt["id"]))
    assert row is not None
    row.status = "abandoned"
    await db.flush()
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k"}
    )
    assert r.status_code == 409
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items",
        json={"item_key": "lq_page2_1", "response": {"choice": 1}},
    )
    assert r.status_code == 409


async def test_start_attempt_resumes_in_progress(client: AsyncClient, db: AsyncSession) -> None:
    """Resume: return existing in-progress attempt instead of creating a duplicate."""
    activity = await import_any(db, QUIZ_DOC)
    await register(client)
    r1 = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r1.status_code == 201 and r1.json()["items"] == []
    snap = (await client.get(f"/api/v1/activities/{activity.id}")).json()["snapshot"]
    key = snap["quiz"]["questions"][0]["key"]
    await client.post(
        f"/api/v1/attempts/{r1.json()['id']}/items",
        json={"item_key": key, "response": {"choice": 0}},
    )
    r2 = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r2.json()["id"] == r1.json()["id"]  # resumed, not duplicated
    assert r2.json()["items"][0]["item_key"] == key  # saved item comes back
    assert r2.json()["items"][0]["response"] == {"choice": 0}


async def test_start_attempt_integrityerror_returns_existing(
    client: AsyncClient, db: AsyncSession
) -> None:
    """A race loser recovers instead of 500ing: simulate it by making the resume-select miss
    once, so the route's INSERT hits `uq_attempt_one_in_progress` against attempt A (already
    started), and its IntegrityError handler must roll back to its savepoint and return A."""
    activity = await import_any(db, QUIZ_DOC)
    await register(client)
    r1 = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r1.status_code == 201
    attempt_a_id = r1.json()["id"]

    real_resume_attempt = attempts_router._resume_attempt
    calls = 0

    async def _miss_once(
        db_: AsyncSession, user_id: uuid.UUID, activity_id: uuid.UUID
    ) -> Attempt | None:
        nonlocal calls
        calls += 1
        if calls == 1:
            return None  # forces the insert path even though A already exists
        return await real_resume_attempt(db_, user_id, activity_id)

    with patch.object(attempts_router, "_resume_attempt", side_effect=_miss_once):
        r2 = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r2.status_code == 201, r2.text
    assert r2.json()["id"] == attempt_a_id  # recovered attempt A, not a 500 or a duplicate


async def test_quiz_submit_grades_and_passes(client: AsyncClient, db: AsyncSession) -> None:
    """Quiz submit: score and pass on all correct answers."""
    activity = await import_any(db, QUIZ_DOC)  # answers: q1 -> 0, q2 -> 1
    await register(client)
    snap = (await client.get(f"/api/v1/activities/{activity.id}")).json()["snapshot"]
    attempt = (await client.post(f"/api/v1/activities/{activity.id}/attempts")).json()
    for q, choice in zip(snap["quiz"]["questions"], (0, 1), strict=True):
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": q["key"], "response": {"choice": choice}},
        )
        assert r.json()["correct"] is True
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k1"}
    )
    assert r.json()["percent"] == 100.0 and r.json()["passed"] is True


async def test_matching_and_sequencing_grade_via_items(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Matching: grade via per-item responses, compute percent on submit."""
    m = await import_any(
        db,
        {
            "subject": SUBJECT,
            "matching": {
                "slug": "m1",
                "title": "M",
                "pairs": [
                    {"term": "T1", "definition": "Alpha"},
                    {"term": "T2", "definition": "Beta"},
                ],
            },
        },
    )
    await register(client)
    snap = (await client.get(f"/api/v1/activities/{m.id}")).json()["snapshot"]
    defs = snap["matching"]["definitions"]  # sorted: ["Alpha", "Beta"]
    attempt = (await client.post(f"/api/v1/activities/{m.id}/attempts")).json()
    # T1 -> Alpha correct; T2 -> Alpha wrong.
    k1, k2 = (t["key"] for t in snap["matching"]["terms"])
    assert (
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": k1, "response": {"choice": defs.index("Alpha")}},
        )
    ).json()["correct"]
    assert not (
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": k2, "response": {"choice": defs.index("Alpha")}},
        )
    ).json()["correct"]
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k2"}
    )
    assert r.json()["percent"] == 50.0 and r.json()["passed"] is False


async def test_flashcards_submit_is_completion_only(client: AsyncClient, db: AsyncSession) -> None:
    """Flashcards: submit with no score/percent/passed fields."""
    deck = await import_any(
        db,
        {
            "subject": SUBJECT,
            "flashcards": {"slug": "f1", "title": "F", "cards": [{"term": "T", "definition": "D"}]},
        },
    )
    await register(client)
    attempt = (await client.post(f"/api/v1/activities/{deck.id}/attempts")).json()
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k3"}
    )
    body = r.json()
    assert body["status"] == "submitted"
    assert body["score"] is None and body["percent"] is None and body["passed"] is None


async def test_student_cannot_start_assessment_attempt(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Students: cannot start attempts on assessment activities (404)."""
    activity = await import_any(db, QUIZ_DOC)
    activity.access = "assessment"
    await db.flush()
    await register(client)
    r = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r.status_code == 404
