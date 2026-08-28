"""What this file tests: the email/password endpoints in `app/auth/router.py` —
register, login, logout, and the cookie attributes the session cookie is set with.

Used here and why: httpx AsyncClient against the ASGI app — no network — so the real
cookie jar behaviour (clearing, resending) exercises the same session flow a browser would.

How it fits the project: protects ADR-0002 (same-origin proxy + cookie sessions) — sessions
are opaque HttpOnly/Secure/SameSite=lax cookies, never tokens handed to client JS.

Works with: pytest-asyncio, httpx.
Depends on: `client` fixture and the `register` helper from `conftest.py`;
`app.auth.router`; `app.auth.deps.set_session_cookie`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from httpx import AsyncClient

from tests.conftest import register


async def test_register_sets_cookie_and_me_works(client: AsyncClient) -> None:
    """Registering leaves a working session cookie behind, and /auth/me reflects the new user."""
    body = await register(client)
    assert body["role"] == "student" and body["email"] == "a@example.edu"
    assert "rt_session" in client.cookies
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "a@example.edu"


async def test_register_duplicate_email_conflict(client: AsyncClient) -> None:
    """Email uniqueness is case-insensitive (CITEXT column) — a re-cased duplicate is 409."""
    await register(client)
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "A@EXAMPLE.EDU", "password": "password-123", "display_name": "B"},
    )
    assert r.status_code == 409


async def test_register_weak_password(client: AsyncClient) -> None:
    """A password failing strength validation is rejected at the schema layer (422), pre-hash."""
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "w@example.edu", "password": "short", "display_name": "W"},
    )
    assert r.status_code == 422


async def test_login_logout(client: AsyncClient) -> None:
    """Full cookie lifecycle: logged-out is 401, wrong password is 401, then login/logout works."""
    await register(client)
    client.cookies.clear()  # simulate a fresh browser with no session cookie
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    bad = await client.post(
        "/api/v1/auth/login", json={"email": "a@example.edu", "password": "nope-nope-nope"}
    )
    assert bad.status_code == 401
    ok = await client.post(
        "/api/v1/auth/login", json={"email": "a@example.edu", "password": "password-123"}
    )
    assert ok.status_code == 200 and "rt_session" in client.cookies
    assert (await client.get("/api/v1/auth/me")).status_code == 200
    out = await client.post("/api/v1/auth/logout")
    assert out.status_code == 204
    assert (await client.get("/api/v1/auth/me")).status_code == 401


async def test_cookie_attributes(client: AsyncClient) -> None:
    """The Set-Cookie header carries the exact security attributes ADR-0002 requires."""
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "c@example.edu", "password": "password-123", "display_name": "C"},
    )
    set_cookie = r.headers["set-cookie"]
    assert "HttpOnly" in set_cookie and "SameSite=lax" in set_cookie and "Path=/" in set_cookie
    assert "Secure" in set_cookie  # env=test → cookie_secure True
