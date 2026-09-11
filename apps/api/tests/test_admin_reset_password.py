"""What this file tests: `POST /api/v1/admin/users/{id}/reset-password` in
`app/admin/router.py` — the admin-only temp-password reset — and the `must_change_password`
gate it sets, enforced by `app.auth.deps.require_user` for every route except `/auth/*`.

Used here and why: httpx + real Postgres, same idioms as `test_admin.py` (`make_admin`,
`promote`, `login` from `test_cohorts.py`); the one test that needs both a target user's
own session and an admin session live at once uses two `AsyncClient`s sharing the same
`db` (`tests.conftest.make_client`, the `test_change_password.py` two-device pattern)
rather than swapping one client's cookie jar back and forth — manually setting a cookie
on an httpx jar that already holds a server-issued one for the same name creates a second,
differently-scoped cookie that can shadow the real one on a later request.

How it fits the project: Task 3 of plan 4d — an admin-issued temporary password for a user
who can't reset their own (forgot password, no working email), gated so the temp-password
holder can do nothing but sign in and set a real password until they do.

Works with: pytest-asyncio, httpx.
Depends on: `client`/`db`/`app` fixtures, `register`, `make_client` (conftest); `make_admin`
(test_admin.py); `promote`, `login` (test_cohorts.py); `app.admin.router`,
`app.auth.deps.require_user`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from tests.conftest import make_client, register
from tests.test_admin import make_admin
from tests.test_cohorts import login, promote

STUDENT = "student@example.edu"
OLD = "password-123"


async def test_admin_reset_returns_temp_password_once_and_revokes_sessions(
    app: FastAPI, db: AsyncSession
) -> None:
    async with make_client(app, db) as student_c, make_client(app, db) as admin_c:
        await register(student_c, email=STUDENT, password=OLD, name="Student")
        await make_admin(admin_c, db)
        student = (await admin_c.get("/api/v1/admin/users", params={"q": STUDENT})).json()["items"][
            0
        ]

        r = await admin_c.post(f"/api/v1/admin/users/{student['id']}/reset-password")
        assert r.status_code == 200
        body = r.json()
        assert set(body) == {"temporary_password"}
        temp_password = body["temporary_password"]
        assert len(temp_password) >= 10  # clears the password-strength floor

        # The student's pre-reset session is revoked immediately, not just at next login.
        assert (await student_c.get("/api/v1/auth/me")).status_code == 401

        login_r = await student_c.post(
            "/api/v1/auth/login", json={"email": STUDENT, "password": temp_password}
        )
        assert login_r.status_code == 200
        me = await student_c.get("/api/v1/auth/me")
        assert me.status_code == 200
        assert me.json()["must_change_password"] is True


async def test_flag_gates_everything_but_auth_and_change(
    client: AsyncClient, db: AsyncSession
) -> None:
    await register(client, email=STUDENT, password=OLD, name="Student")
    await make_admin(client, db)
    student = (await client.get("/api/v1/admin/users", params={"q": STUDENT})).json()["items"][0]
    temp_password = (
        await client.post(f"/api/v1/admin/users/{student['id']}/reset-password")
    ).json()["temporary_password"]

    await client.post("/api/v1/auth/login", json={"email": STUDENT, "password": temp_password})

    blocked = await client.get("/api/v1/subjects")
    assert blocked.status_code == 403
    assert blocked.json()["type"].endswith("/password-change-required")

    assert (await client.get("/api/v1/auth/me")).status_code == 200  # /auth/* still allowed

    changed = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": temp_password, "new_password": "correct-horse-battery"},
    )
    assert changed.status_code == 204

    allowed = await client.get("/api/v1/subjects")
    assert allowed.status_code == 200
    assert (await client.get("/api/v1/auth/me")).json()["must_change_password"] is False


async def test_reset_requires_admin(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email=STUDENT, password=OLD, name="Student")
    target = await db.scalar(select(User).where(User.email == STUDENT))
    assert target is not None

    await register(client, email="s2@example.edu", name="S2")  # plain student caller
    r = await client.post(f"/api/v1/admin/users/{target.id}/reset-password")
    assert r.status_code == 403

    await promote(db, "s2@example.edu", UserRole.educator)
    await login(client, "s2@example.edu")
    r = await client.post(f"/api/v1/admin/users/{target.id}/reset-password")
    assert r.status_code == 403


async def test_reset_deactivated_user_is_409(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email=STUDENT, password=OLD, name="Student")
    await make_admin(client, db)
    student = (await client.get("/api/v1/admin/users", params={"q": STUDENT})).json()["items"][0]
    await client.post(f"/api/v1/admin/users/{student['id']}/deactivate")

    r = await client.post(f"/api/v1/admin/users/{student['id']}/reset-password")
    assert r.status_code == 409


async def test_reset_writes_audit_row(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email=STUDENT, password=OLD, name="Student")
    await make_admin(client, db)
    student = (await client.get("/api/v1/admin/users", params={"q": STUDENT})).json()["items"][0]

    await client.post(f"/api/v1/admin/users/{student['id']}/reset-password")

    log = (await client.get("/api/v1/admin/audit-log", params={"action": "reset_password"})).json()
    assert len(log) == 1
    assert log[0]["target_id"] == student["id"]
    assert "sessions_revoked" in log[0]["detail"]
