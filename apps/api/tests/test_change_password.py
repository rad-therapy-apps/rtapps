"""What this file tests: `POST /api/v1/auth/change-password` in `app/auth/router.py` —
the authed self-service password change and its "revoke every other session" side effect.

Used here and why: httpx AsyncClient against the ASGI app, same as `test_auth_routes.py`;
a second `AsyncClient` sharing the same `db`/`app` (via `make_client`) simulates a second
signed-in device for the "keeps current session, revokes others" case.

How it fits the project: extends ADR-0002 — a password change proves possession of the
account, so per the design spec the caller's own session survives while every other
session is revoked (log out everywhere else).

Works with: pytest-asyncio, httpx.
Depends on: `client`/`db`/`app` fixtures and the `register` helper from `conftest.py`;
`tests.conftest.make_client` for a second client sharing the same test transaction;
`app.auth.router`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from tests.conftest import make_client, register

EMAIL = "a@example.edu"
OLD = "password-123"
NEW = "correct-horse-battery"


async def test_change_password_happy_path(client: AsyncClient, db: AsyncSession) -> None:
    """After a successful change, the old password no longer logs in and the new one does."""
    await register(client, email=EMAIL, password=OLD)
    r = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": OLD, "new_password": NEW},
    )
    assert r.status_code == 204
    bad = await client.post("/api/v1/auth/login", json={"email": EMAIL, "password": OLD})
    assert bad.status_code == 401
    ok = await client.post("/api/v1/auth/login", json={"email": EMAIL, "password": NEW})
    assert ok.status_code == 200
    # Regression: change-password always clears must_change_password, even when it was
    # already false (this test never set it) — a no-op write, not a special case.
    assert (await client.get("/api/v1/auth/me")).json()["must_change_password"] is False


async def test_change_password_wrong_current_is_403_and_changes_nothing(
    client: AsyncClient,
) -> None:
    """A wrong current_password is 403, and the real password still works afterward."""
    await register(client, email=EMAIL, password=OLD)
    r = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "nope-nope-nope", "new_password": NEW},
    )
    assert r.status_code == 403
    still_ok = await client.post("/api/v1/auth/login", json={"email": EMAIL, "password": OLD})
    assert still_ok.status_code == 200


async def test_change_password_keeps_current_session_revokes_others(
    app: FastAPI, db: AsyncSession
) -> None:
    """Changing password on session A keeps A signed in but signs B out."""
    async with make_client(app, db) as a, make_client(app, db) as b:
        await register(a, email=EMAIL, password=OLD)
        login_b = await b.post("/api/v1/auth/login", json={"email": EMAIL, "password": OLD})
        assert login_b.status_code == 200

        r = await a.post(
            "/api/v1/auth/change-password",
            json={"current_password": OLD, "new_password": NEW},
        )
        assert r.status_code == 204

        assert (await a.get("/api/v1/auth/me")).status_code == 200
        assert (await b.get("/api/v1/auth/me")).status_code == 401


async def test_change_password_rejects_weak_new_password(client: AsyncClient) -> None:
    """A new_password failing the length floor is rejected at the schema layer (422)."""
    await register(client, email=EMAIL, password=OLD)
    r = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": OLD, "new_password": "short"},
    )
    assert r.status_code == 422


async def test_change_password_google_only_account_is_409(
    client: AsyncClient, db: AsyncSession
) -> None:
    """A Google-only account (no password_hash) can't change a password that never existed."""
    user = User(email="g@example.edu", display_name="G", role=UserRole.student, password_hash=None)
    db.add(user)
    await db.flush()
    from app.auth.sessions import create_session

    token, _ = await create_session(db, user, ua=None, days=14)
    await db.commit()
    client.cookies.set("rt_session", token)

    r = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "whatever-1", "new_password": NEW},
    )
    assert r.status_code == 409


async def test_change_password_requires_auth(client: AsyncClient) -> None:
    """No/invalid session cookie: 401, same as any other `require_user` route."""
    r = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": OLD, "new_password": NEW},
    )
    assert r.status_code == 401
