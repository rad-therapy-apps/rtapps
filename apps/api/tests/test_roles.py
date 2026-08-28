"""What this file tests: `app.auth.deps.require_role` — the 403-if-wrong-role
dependency factory used to gate educator/admin-only routes.

Used here and why: a throwaway probe route mounted directly onto the ASGI app under
test (via the `client` fixture) rather than one of the app's real routes, so this test
exercises `require_role` in isolation instead of coupling to whichever real endpoint
happens to use it today.

How it fits the project: protects the role-check half of ADR-0002 (auth) — signed-out,
wrong-role, and correct-role are the three states every role-gated route depends on
`require_role` to distinguish.

Works with: httpx.AsyncClient, FastAPI's dependency override mechanism.
Depends on: `client`, `db` fixtures and the `register` helper from `conftest.py`;
`app.auth.deps.require_role`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from fastapi import APIRouter, Depends
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_role
from app.auth.models import User, UserRole
from tests.conftest import register


async def test_require_role(client: AsyncClient, db: AsyncSession) -> None:
    """Walk require_role(educator, admin) through all three states: signed out (401),
    signed in with an insufficient role (403), then promoted to an allowed role (200)."""
    # httpx's AsyncClient doesn't expose the ASGI app it wraps, so reach through the
    # private ASGITransport attribute to get at the real FastAPI app and mount a route
    # onto it for this test only.
    app = client._transport.app  # type: ignore[attr-defined]
    probe = APIRouter()

    @probe.get(
        "/api/v1/_probe/educator",
        dependencies=[Depends(require_role(UserRole.educator, UserRole.admin))],
    )
    async def _probe() -> dict[str, bool]:
        return {"ok": True}

    app.include_router(probe)

    # No session cookie at all -> require_user (which require_role sits on top of) 401s.
    assert (await client.get("/api/v1/_probe/educator")).status_code == 401
    me = await register(client)
    # register() creates a plain student, which is not in the allowed role set -> 403.
    assert (await client.get("/api/v1/_probe/educator")).status_code == 403
    # Promote the user directly via the DB (no role-change endpoint exists) and confirm
    # require_role now lets the same session through.
    await db.execute(update(User).where(User.email == me["email"]).values(role=UserRole.educator))
    await db.flush()
    assert (await client.get("/api/v1/_probe/educator")).status_code == 200
