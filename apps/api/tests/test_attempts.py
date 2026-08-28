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

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt
from app.content.models import Activity
from tests.conftest import register, seed_lesson


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
