"""What this file tests: `app.admin.router` — admin-only access, user search and cursor
pagination, audited role change (effective on the user's next request), audited
deactivation (session refused afterwards), and the audit-log listing with filters.
Used here and why: httpx + real Postgres; the deactivated user's own client is reused to
prove their existing session stops working (FR-M-01/02 "takes effect on next request").
How it fits the project: FR-M-01/02/04; the admin surface the owner needs to promote the
mentor to educator on the test VM without psql.
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register` (conftest); `promote`, `login` from `test_cohorts.py`.
Used by: CI `api` job; `make test-api`.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import UserRole
from tests.conftest import register
from tests.test_cohorts import login, promote


async def make_admin(
    client: AsyncClient, db: AsyncSession, email: str = "root@example.edu"
) -> None:
    await register(client, email=email, name="Root")
    await promote(db, email, UserRole.admin)


async def test_non_admin_forbidden(client: AsyncClient, db: AsyncSession) -> None:
    await register(client)
    assert (await client.get("/api/v1/admin/users")).status_code == 403
    await promote(db, "a@example.edu", UserRole.educator)
    assert (await client.get("/api/v1/admin/audit-log")).status_code == 403


async def test_list_search_paginate(client: AsyncClient, db: AsyncSession) -> None:
    for i in range(3):
        await register(client, email=f"s{i}@example.edu", name=f"Student {i}")
    await make_admin(client, db)
    page = (await client.get("/api/v1/admin/users", params={"limit": 2})).json()
    assert len(page["items"]) == 2 and page["next_cursor"]
    assert page["items"][0]["email"] == "root@example.edu"  # newest first
    rest = (
        await client.get("/api/v1/admin/users", params={"limit": 2, "cursor": page["next_cursor"]})
    ).json()
    assert len(rest["items"]) == 2 and rest["next_cursor"] is None
    ids = [u["id"] for u in page["items"] + rest["items"]]
    assert len(set(ids)) == 4
    found = (await client.get("/api/v1/admin/users", params={"q": "STUDENT 1"})).json()["items"]
    assert [u["email"] for u in found] == ["s1@example.edu"]


async def test_role_change_is_audited_and_effective(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email="m@example.edu", name="Mentor")
    assert (await client.post("/api/v1/cohorts", json={"name": "X"})).status_code == 403
    await make_admin(client, db)
    admin_id = (await client.get("/api/v1/auth/me")).json()["id"]
    mentor = (await client.get("/api/v1/admin/users", params={"q": "m@example.edu"})).json()[
        "items"
    ][0]
    r = await client.patch(f"/api/v1/admin/users/{mentor['id']}/role", json={"role": "educator"})
    assert r.status_code == 200 and r.json()["role"] == "educator"
    assert (
        await client.patch(f"/api/v1/admin/users/{admin_id}/role", json={"role": "student"})
    ).status_code == 400
    assert (
        await client.patch(f"/api/v1/admin/users/{uuid.uuid4()}/role", json={"role": "student"})
    ).status_code == 404
    assert (
        await client.patch(f"/api/v1/admin/users/{mentor['id']}/role", json={"role": "owner"})
    ).status_code == 422
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "change_role"})).json()
    assert (
        len(log) == 1
        and log[0]["target_id"] == mentor["id"]
        and log[0]["actor_email"] == "root@example.edu"
    )
    assert log[0]["detail"] == {"from": "student", "to": "educator"}
    # The role is read from the user row on every request, so it applies to the next call.
    await login(client, "m@example.edu")
    assert (await client.post("/api/v1/cohorts", json={"name": "X"})).status_code == 201


async def test_deactivate_revokes_sessions(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email="gone@example.edu", name="Gone")
    await make_admin(client, db)
    admin_id = (await client.get("/api/v1/auth/me")).json()["id"]
    gone = (await client.get("/api/v1/admin/users", params={"q": "gone@"})).json()["items"][0]
    r = await client.post(f"/api/v1/admin/users/{gone['id']}/deactivate")
    assert r.status_code == 200 and r.json()["deactivated_at"]
    assert (await client.post(f"/api/v1/admin/users/{admin_id}/deactivate")).status_code == 400
    r = await client.post(
        "/api/v1/auth/login", json={"email": "gone@example.edu", "password": "password-123"}
    )
    assert r.status_code == 401
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "deactivate_user"})).json()
    assert len(log) == 1


async def test_audit_log_filters(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email="m@example.edu", name="M")
    await make_admin(client, db)
    m = (await client.get("/api/v1/admin/users", params={"q": "m@"})).json()["items"][0]
    await client.patch(f"/api/v1/admin/users/{m['id']}/role", json={"role": "educator"})
    await client.patch(f"/api/v1/admin/users/{m['id']}/role", json={"role": "student"})
    all_rows = (await client.get("/api/v1/admin/audit-log")).json()
    assert len(all_rows) == 2 and all_rows[0]["at"] >= all_rows[1]["at"]
    assert (
        len((await client.get("/api/v1/admin/audit-log", params={"target_id": m["id"]})).json())
        == 2
    )
    assert (
        await client.get("/api/v1/admin/audit-log", params={"since": "2099-01-01T00:00:00Z"})
    ).json() == []
    assert (await client.get("/api/v1/admin/audit-log", params={"limit": 1})).json()[0]["detail"][
        "to"
    ] == "student"
