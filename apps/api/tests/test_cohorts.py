"""What this file tests: every route in `app.cohorts.router` plus the
`require_cohort_educator` dependency — the permission matrix (student / other educator /
owner / admin), join-code rotation (AT-04), idempotent join, roster and removal, and the
audit rows those reads and writes leave behind.
Used here and why: httpx against the ASGI app with real Postgres (`client`/`db`); two
helpers promote a registered user to educator/admin by direct UPDATE, since role changes
are an admin route tested separately.
How it fits the project: FR-E-01/02/03/09/10, FR-S-06; docs/03-architecture.md §7 (cohorts).
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db` fixtures and `register` from `conftest.py`; `app.audit.models`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.auth.models import User, UserRole
from app.cohorts.models import Cohort
from tests.conftest import register


async def promote(db: AsyncSession, email: str, role: UserRole) -> None:
    """Set a registered user's role directly (the admin route is covered in test_admin.py)."""
    await db.execute(update(User).where(User.email == email).values(role=role))
    await db.flush()


async def login(client: AsyncClient, email: str, password: str = "password-123") -> None:
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text


async def make_educator(client: AsyncClient, db: AsyncSession, email: str) -> None:
    """Register, promote to educator, and re-login so the session sees the new role."""
    await register(client, email=email, name=email.split("@")[0])
    await promote(db, email, UserRole.educator)


async def create_cohort(client: AsyncClient, name: str = "Fall 2026") -> dict[str, Any]:
    r = await client.post("/api/v1/cohorts", json={"name": name})
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    assert body["role"] == "educator" and len(body["join_code"]) == 6
    assert body["threshold_percent"] == 70 and body["student_count"] == 0
    return body


async def test_student_cannot_create_cohort(client: AsyncClient) -> None:
    await register(client)
    r = await client.post("/api/v1/cohorts", json={"name": "X"})
    assert r.status_code == 403


async def test_create_list_get_patch(client: AsyncClient, db: AsyncSession) -> None:
    """Owner sees the cohort in their list, can read and patch it; audit row for create."""
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    listed = (await client.get("/api/v1/cohorts")).json()
    assert [c["id"] for c in listed] == [cohort["id"]]
    got = (await client.get(f"/api/v1/cohorts/{cohort['id']}")).json()
    assert got["name"] == "Fall 2026" and got["join_code"] == cohort["join_code"]
    r = await client.patch(
        f"/api/v1/cohorts/{cohort['id']}",
        json={"name": "Fall 26", "threshold_percent": 60, "starts_on": "2026-09-01"},
    )
    assert r.status_code == 200 and r.json()["threshold_percent"] == 60
    assert r.json()["name"] == "Fall 26" and r.json()["starts_on"] == "2026-09-01"
    r = await client.patch(f"/api/v1/cohorts/{cohort['id']}", json={"threshold_percent": 101})
    assert r.status_code == 422
    rows = (await db.scalars(select(AuditLog).where(AuditLog.action == "create_cohort"))).all()
    assert len(rows) == 1 and rows[0].cohort_id == uuid.UUID(cohort["id"])


async def test_join_rotate_and_idempotency(client: AsyncClient, db: AsyncSession) -> None:
    """AT-04: A joins with the code (twice, one row); after rotation B's old code is refused."""
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    code = cohort["join_code"]

    await register(client, email="a@example.edu", name="A")
    r = await client.post("/api/v1/cohorts/join", json={"code": code})
    assert r.status_code == 200 and r.json()["id"] == cohort["id"]
    assert r.json()["role"] == "student" and r.json()["join_code"] is None  # students never see it
    again = await client.post(
        "/api/v1/cohorts/join", json={"code": code.lower()}
    )  # case-insensitive
    assert again.status_code == 200 and again.json()["student_count"] == 1
    mine = (await client.get("/api/v1/cohorts")).json()
    assert len(mine) == 1 and mine[0]["role"] == "student"
    # Students can read their cohort (name only, no code) but not patch or rotate it.
    assert (await client.get(f"/api/v1/cohorts/{cohort['id']}")).status_code == 200
    assert (
        await client.patch(f"/api/v1/cohorts/{cohort['id']}", json={"name": "x"})
    ).status_code == 403
    assert (await client.post(f"/api/v1/cohorts/{cohort['id']}/rotate-code")).status_code == 403

    await login(client, "edu@example.edu")
    r = await client.post(f"/api/v1/cohorts/{cohort['id']}/rotate-code")
    assert (
        r.status_code == 200 and r.json()["join_code"] != code and len(r.json()["join_code"]) == 6
    )

    await register(client, email="b@example.edu", name="B")
    r = await client.post("/api/v1/cohorts/join", json={"code": code})
    assert r.status_code == 404 and r.json()["title"] == "Join code not valid"
    assert (await client.post("/api/v1/cohorts/join", json={"code": "ZZ"})).status_code == 422
    rotations = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "rotate_join_code"))
    ).all()
    assert len(rotations) == 1


async def test_educator_cannot_join_as_student(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    r = await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})
    assert r.status_code == 403


async def test_other_educator_gets_403_unknown_gets_404(
    client: AsyncClient, db: AsyncSession
) -> None:
    """FR-E-09: ownership is enforced per cohort, not per role."""
    await make_educator(client, db, "e1@example.edu")
    cohort = await create_cohort(client)
    await make_educator(client, db, "e2@example.edu")
    for path in (f"/api/v1/cohorts/{cohort['id']}", f"/api/v1/cohorts/{cohort['id']}/members"):
        assert (await client.get(path)).status_code == 403
    assert (await client.post(f"/api/v1/cohorts/{cohort['id']}/rotate-code")).status_code == 403
    assert (await client.get(f"/api/v1/cohorts/{uuid.uuid4()}")).status_code == 404
    assert (await client.get("/api/v1/cohorts")).json() == []


async def test_admin_can_read_any_cohort(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "e1@example.edu")
    cohort = await create_cohort(client)
    await register(client, email="root@example.edu", name="Root")
    await promote(db, "root@example.edu", UserRole.admin)
    assert (await client.get(f"/api/v1/cohorts/{cohort['id']}/members")).status_code == 200
    # Admins are not enrolled, yet GET /cohorts/{id} answers as for an educator (code visible).
    got = await client.get(f"/api/v1/cohorts/{cohort['id']}")
    assert got.status_code == 200 and got.json()["role"] == "educator"
    assert got.json()["join_code"] == cohort["join_code"]
    assert (await client.get(f"/api/v1/cohorts/{uuid.uuid4()}")).status_code == 404


async def test_join_code_race_is_a_problem_response(client: AsyncClient, db: AsyncSession) -> None:
    """If the unique index fires at flush/commit (two requests picked the same code between
    the pre-check and the write), the API answers 409 problem+json rather than a bare 500."""
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    import app.cohorts.router as router_module

    original = router_module._assign_fresh_code

    async def stale_pre_check(db: AsyncSession, c: Cohort) -> None:
        c.join_code = cohort["join_code"]  # as if the pre-check ran before the other insert

    router_module._assign_fresh_code = stale_pre_check  # type: ignore[assignment]
    try:
        r = await client.post("/api/v1/cohorts", json={"name": "Clash"})
    finally:
        router_module._assign_fresh_code = original
    assert r.status_code == 409
    assert r.headers["content-type"].startswith("application/problem+json")
    assert "join code" in r.json()["title"].lower()


async def test_members_and_remove(client: AsyncClient, db: AsyncSession) -> None:
    """Roster lists students only (not the educator); removal is audited and idempotent-safe."""
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    await register(client, email="a@example.edu", name="Ada")
    await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})
    await login(client, "edu@example.edu")

    r = await client.get(f"/api/v1/cohorts/{cohort['id']}/members")
    assert r.status_code == 200
    members = r.json()
    assert [m["email"] for m in members] == ["a@example.edu"]
    assert members[0]["display_name"] == "Ada" and members[0]["role"] == "student"
    assert members[0]["joined_at"] and members[0]["last_activity_at"] is None
    uid = members[0]["user_id"]

    r = await client.delete(f"/api/v1/cohorts/{cohort['id']}/members/{uid}")
    assert r.status_code == 204
    assert (await client.get(f"/api/v1/cohorts/{cohort['id']}/members")).json() == []
    assert (await client.delete(f"/api/v1/cohorts/{cohort['id']}/members/{uid}")).status_code == 404

    actions = (await db.scalars(select(AuditLog.action).order_by(AuditLog.at))).all()
    assert actions.count("read_cohort_members") == 2 and actions.count("remove_member") == 1
    # The removed student can re-join with the current code.
    await login(client, "a@example.edu")
    assert (
        await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})
    ).status_code == 200
