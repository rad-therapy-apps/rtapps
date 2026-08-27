import respx
from httpx import AsyncClient, Response

from app.config import Settings
from tests.conftest import TEST_DATABASE_URL

GOOGLE_SETTINGS = Settings(
    database_url=TEST_DATABASE_URL,
    env="test",
    public_origin="https://test",
    google_client_id="cid",
    google_client_secret="csecret",
)


async def test_start_redirects_with_state(client_google: AsyncClient) -> None:
    r = await client_google.get("/api/v1/auth/google/start")
    assert r.status_code == 302
    assert r.headers["location"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "rt_oauth_state" in client_google.cookies


async def test_start_404_when_not_configured(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/auth/google/start")).status_code == 404


@respx.mock
async def test_callback_creates_user_and_session(client_google: AsyncClient) -> None:
    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=Response(200, json={"access_token": "at", "id_token": "x"})
    )
    respx.get("https://openidconnect.googleapis.com/v1/userinfo").mock(
        return_value=Response(
            200,
            json={"sub": "g-123", "email": "g@example.edu", "email_verified": True, "name": "Gee"},
        )
    )
    start = await client_google.get("/api/v1/auth/google/start")
    from urllib.parse import parse_qs, urlparse

    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    cb = await client_google.get(f"/api/v1/auth/google/callback?code=abc&state={state}")
    assert cb.status_code == 302 and cb.headers["location"] == "https://test/home"
    me = await client_google.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "g@example.edu"


async def test_callback_bad_state(client_google: AsyncClient) -> None:
    r = await client_google.get("/api/v1/auth/google/callback?code=abc&state=forged")
    assert r.status_code == 400


async def test_providers_google_disabled(client: AsyncClient) -> None:
    r = await client.get("/api/v1/auth/providers")
    assert r.status_code == 200
    assert r.json() == {"google": False}


async def test_providers_google_enabled(client_google: AsyncClient) -> None:
    r = await client_google.get("/api/v1/auth/providers")
    assert r.status_code == 200
    assert r.json() == {"google": True}
