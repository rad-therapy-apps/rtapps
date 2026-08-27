from httpx import AsyncClient


async def test_wrong_origin_rejected(client: AsyncClient) -> None:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "x@example.edu", "password": "password-123"},
        headers={"Origin": "https://evil.example"},
    )
    assert r.status_code == 403


async def test_matching_origin_allowed(client: AsyncClient) -> None:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "x@example.edu", "password": "password-123"},
        headers={"Origin": "http://test"},
    )
    assert r.status_code == 401  # passed CSRF, failed auth (no such user)


async def test_get_ignores_origin(client: AsyncClient) -> None:
    r = await client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert r.status_code == 200
