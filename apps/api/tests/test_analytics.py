"""What this file tests: `GET /cohorts/{id}/overview` and `GET /cohorts/{id}/students/{uid}`
in `app.analytics.router` — aggregates from `activity_result`, the threshold flag, cohort
scoping (a student outside the cohort is invisible), the AT-11 permission outcome (owner 200
and audited; another educator 403 and not audited), and the shape of per-attempt items.
Used here and why: builds real attempts through the HTTP flow so the numbers come from the
same rollup code the product uses; two cohorts to prove scoping.
How it fits the project: FR-E-04/05/09/10 — the educator half of the M2 vertical slice.
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register`, `seed_lesson` (conftest); `make_educator`, `login`,
`create_cohort` from `tests/test_cohorts.py`; `app.audit.models.AuditLog`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from tests.conftest import register, seed_lesson
from tests.test_cohorts import create_cohort, login, make_educator


async def _complete(client: AsyncClient, activity_id: str, choice: int | None) -> None:
    attempt = (await client.post(f"/api/v1/activities/{activity_id}/attempts")).json()
    if choice is not None:
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": "lq_page2_1", "response": {"choice": choice}},
        )
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": str(uuid.uuid4())}
    )
    assert r.status_code == 200


async def _setup(client: AsyncClient, db: AsyncSession) -> dict[str, Any]:
    """Educator E owns cohort C with students A (100 %) and B (0 %); D is in another cohort."""
    await seed_lesson(db)
    # `GET /lessons/{slug}` requires a signed-in session (app.content.router), so this must
    # come after some register/login call — make_educator's register() leaves one behind.
    await make_educator(client, db, "e@example.edu")
    aid = (await client.get("/api/v1/lessons/rbe-and-oer")).json()["activity_id"]
    cohort = await create_cohort(client, "C")
    await make_educator(client, db, "f@example.edu")
    other = await create_cohort(client, "Other")
    for email, code, choice in (
        ("a@example.edu", cohort["join_code"], 1),
        ("b@example.edu", cohort["join_code"], None),
        ("d@example.edu", other["join_code"], 1),
    ):
        await register(client, email=email, name=email[0].upper())
        assert (await client.post("/api/v1/cohorts/join", json={"code": code})).status_code == 200
        await _complete(client, aid, choice)
    await login(client, "e@example.edu")
    return {"cohort": cohort, "other": other, "aid": aid}


async def test_overview_aggregates_and_scoping(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["cohort"]["id"] == ctx["cohort"]["id"] and body["cohort"]["student_count"] == 2
    act = next(a for a in body["activities"] if a["activity_id"] == ctx["aid"])
    assert act["attempted"] == 2 and act["passed"] == 1 and act["mean_best_percent"] == 50.0
    assert act["below_threshold"] is True and act["lesson_slug"] == "rbe-and-oer"
    students = {s["email"]: s for s in body["students"]}
    assert set(students) == {"a@example.edu", "b@example.edu"}  # D is invisible
    assert students["a@example.edu"]["mean_best_percent"] == 100.0
    assert students["a@example.edu"]["below_threshold"] is False
    assert students["b@example.edu"]["mean_best_percent"] == 0.0
    assert students["b@example.edu"]["below_threshold"] is True
    assert students["a@example.edu"]["last_activity_at"] is not None
    audits = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "read_cohort_overview"))
    ).all()
    assert len(audits) == 1 and audits[0].cohort_id == uuid.UUID(ctx["cohort"]["id"])


async def test_overview_threshold_is_per_cohort(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    await client.patch(f"/api/v1/cohorts/{ctx['cohort']['id']}", json={"threshold_percent": 40})
    body = (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")).json()
    act = next(a for a in body["activities"] if a["activity_id"] == ctx["aid"])
    assert act["mean_best_percent"] == 50.0 and act["below_threshold"] is False


async def test_student_detail(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    members = (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/members")).json()
    a = next(m for m in members if m["email"] == "a@example.edu")
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{a['user_id']}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["student"]["email"] == "a@example.edu"
    assert len(body["results"]) == 1
    res = body["results"][0]
    assert res["best_percent"] == 100.0 and res["attempts"] == 1 and res["mastery"] == "passed"
    assert res["time_spent_s"] >= 0 and res["title"] == "RBE and OER"
    assert len(body["attempts"]) == 1
    att = body["attempts"][0]
    assert att["percent"] == 100.0 and att["passed"] is True and att["status"] == "submitted"
    assert att["items"] == [
        {
            "item_key": "lq_page2_1",
            "response": {"choice": 1},
            "correct": True,
            "score": 1.0,
            "max_score": 1.0,
        }
    ]
    audits = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "read_student_detail"))
    ).all()
    assert len(audits) == 1 and audits[0].target_id == uuid.UUID(a["user_id"])


async def test_student_outside_cohort_is_404(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    await login(client, "f@example.edu")
    d = (await client.get(f"/api/v1/cohorts/{ctx['other']['id']}/members")).json()[0]
    await login(client, "e@example.edu")
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{d['user_id']}")
    assert r.status_code == 404


async def test_other_educator_403_and_not_audited(client: AsyncClient, db: AsyncSession) -> None:
    """AT-11: F requests E's cohort views → 403; no audit rows for F."""
    ctx = await _setup(client, db)
    members = (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/members")).json()
    await login(client, "f@example.edu")
    assert (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")).status_code == 403
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{members[0]['user_id']}")
    assert r.status_code == 403
    await login(client, "a@example.edu")
    assert (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")).status_code == 403
    reads = (
        await db.scalars(
            select(AuditLog).where(
                AuditLog.action.in_(["read_cohort_overview", "read_student_detail"])
            )
        )
    ).all()
    assert reads == []
