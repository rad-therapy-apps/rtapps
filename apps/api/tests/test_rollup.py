"""What this file tests: `app.attempts.rollup.upsert_activity_result` and its call from
`submit_attempt` — one row per (user, activity), best/latest/attempts/first_passed_at/
mastery semantics, and that an idempotent submit replay leaves the rollup untouched (AT-06).
Used here and why: drives the real HTTP submit flow (httpx + Postgres) so the rollup is
verified inside the same transaction as the attempt, not as a separately-called helper.
How it fits the project: FR-X-02; ADR-0004 (rollups are derived from attempts).
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register`, `seed_lesson` from `conftest.py`;
`app.attempts.rollup.ActivityResult`.
Used by: CI `api` job; `make test-api`.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.rollup import ActivityResult
from tests.conftest import register, seed_lesson


async def _run_attempt(client: AsyncClient, activity_id: str, choice: int | None) -> str:
    """Start, optionally answer the single check, submit; returns the attempt id."""
    attempt = (await client.post(f"/api/v1/activities/{activity_id}/attempts")).json()
    if choice is not None:
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": "lq_page2_1", "response": {"choice": choice}},
        )
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": str(uuid.uuid4())}
    )
    assert r.status_code == 200, r.text
    return str(attempt["id"])


async def test_rollup_tracks_best_latest_and_first_pass(
    client: AsyncClient, db: AsyncSession
) -> None:
    await seed_lesson(db)
    await register(client)
    lesson = (await client.get("/api/v1/lessons/rbe-and-oer")).json()
    aid = lesson["activity_id"]

    first = await _run_attempt(client, aid, None)  # 0 %
    row = await db.scalar(select(ActivityResult))
    assert row is not None and row.attempts == 1 and row.best_percent == 0
    assert row.latest_attempt_id == uuid.UUID(first) and row.latest_percent == 0
    assert row.mastery == "attempted" and row.first_passed_at is None

    second = await _run_attempt(client, aid, 1)  # 100 %
    await db.refresh(row)
    assert row.attempts == 2 and row.best_percent == 100 and row.latest_percent == 100
    assert row.latest_attempt_id == uuid.UUID(second)
    assert row.mastery == "passed" and row.first_passed_at is not None
    passed_at = row.first_passed_at

    third = await _run_attempt(client, aid, 0)  # back to 0 %: best stays, latest moves
    await db.refresh(row)
    assert row.attempts == 3 and row.best_percent == 100 and row.latest_percent == 0
    assert row.latest_attempt_id == uuid.UUID(third)
    assert row.mastery == "passed" and row.first_passed_at == passed_at
    assert len((await db.scalars(select(ActivityResult))).all()) == 1


async def test_replay_does_not_double_count(client: AsyncClient, db: AsyncSession) -> None:
    """AT-06: the same Idempotency-Key submitted twice yields attempts == 1."""
    await seed_lesson(db)
    await register(client)
    lesson = (await client.get("/api/v1/lessons/rbe-and-oer")).json()
    attempt = (await client.post(f"/api/v1/activities/{lesson['activity_id']}/attempts")).json()
    key = str(uuid.uuid4())
    for _ in range(2):
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": key}
        )
        assert r.status_code == 200
    row = await db.scalar(select(ActivityResult))
    assert row is not None and row.attempts == 1
