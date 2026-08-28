import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity
from tests.conftest import register, seed_lesson


async def _start(client: AsyncClient) -> dict[str, Any]:
    lesson = (await client.get("/api/v1/lessons/rbe-and-oer")).json()
    r = await client.post(f"/api/v1/activities/{lesson['activity_id']}/attempts")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["content_version_id"] == lesson["content_version_id"]
    assert body["status"] == "in_progress"
    return body


async def test_start_grade_submit_flow(client: AsyncClient, db: AsyncSession) -> None:
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

    again = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": key}
    )
    assert again.status_code == 200 and again.json() == body
    other = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit",
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert other.status_code == 409
    late = await client.post(
        f"/api/v1/attempts/{attempt['id']}/items",
        json={"item_key": "lq_page2_1", "response": {"choice": 1}},
    )
    assert late.status_code == 409

    results = (await client.get("/api/v1/me/results")).json()
    assert len(results) == 1 and results[0]["lesson_slug"] == "rbe-and-oer"
    assert results[0]["percent"] == 100


async def test_unanswered_checks_count_as_zero(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k1"}
    )
    assert r.json()["score"] == 0 and r.json()["max_score"] == 1
    assert r.json()["percent"] == 0 and r.json()["passed"] is False


async def test_submit_requires_idempotency_key(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    assert (await client.post(f"/api/v1/attempts/{attempt['id']}/submit")).status_code == 400


async def test_unknown_item_key_is_404_and_bad_body_422(
    client: AsyncClient, db: AsyncSession
) -> None:
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
    await seed_lesson(db)
    await register(client, email="one@example.edu")
    attempt = await _start(client)
    client.cookies.clear()
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
    lesson = await seed_lesson(db, publish=False)
    await register(client)
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None
    assert (await client.post(f"/api/v1/activities/{activity.id}/attempts")).status_code == 404
