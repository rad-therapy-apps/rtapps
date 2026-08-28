from httpx import AsyncClient

from tests.conftest import register


async def test_register_sets_cookie_and_me_works(client: AsyncClient) -> None:
    body = await register(client)
    assert body["role"] == "student" and body["email"] == "a@example.edu"
    assert "rt_session" in client.cookies
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "a@example.edu"


async def test_register_duplicate_email_conflict(client: AsyncClient) -> None:
    await register(client)
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "A@EXAMPLE.EDU", "password": "password-123", "display_name": "B"},
    )
    assert r.status_code == 409


async def test_register_weak_password(client: AsyncClient) -> None:
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "w@example.edu", "password": "short", "display_name": "W"},
    )
    assert r.status_code == 422


async def test_login_logout(client: AsyncClient) -> None:
    await register(client)
    client.cookies.clear()
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
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "c@example.edu", "password": "password-123", "display_name": "C"},
    )
    set_cookie = r.headers["set-cookie"]
    assert "HttpOnly" in set_cookie and "SameSite=lax" in set_cookie and "Path=/" in set_cookie
    assert "Secure" in set_cookie  # env=test → cookie_secure True
