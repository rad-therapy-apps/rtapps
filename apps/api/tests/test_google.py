"""What this file tests: `app/auth/google.py` and the `/auth/google/*` routes in
`app/auth/router.py` — the OAuth "login with Google" flow (start, state verification,
token exchange, userinfo fetch, session creation) plus its various failure modes.

Used here and why: httpx AsyncClient against the ASGI app for the real routes, and respx
to fake Google's token endpoint (`https://oauth2.googleapis.com/token`) and userinfo
endpoint (`https://openidconnect.googleapis.com/v1/userinfo`) — no real network call to
Google is ever made, and the mocked responses can be shaped to exercise error paths
(missing access_token, missing email) that would be hard to trigger against the real API.

How it fits the project: Google sign-in is optional per ADR-0002's cookie-session design —
`google_enabled` gates whether the routes even respond, and `client_google` (vs. plain
`client`) is how these tests toggle that.

Works with: pytest-asyncio, httpx, respx.
Depends on: `client`, `client_google` fixtures from `conftest.py` (the latter carries a
fake Google client id/secret so `settings.google_enabled` is True); `app.auth.google`,
`app.auth.router`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from urllib.parse import parse_qs, urlparse

import respx
from httpx import AsyncClient, Response

from app.config import Settings
from tests.conftest import TEST_DATABASE_URL

# NOTE(review): GOOGLE_SETTINGS is not referenced elsewhere in this file; the client_google
# fixture in conftest.py builds its own equivalent Settings independently.
GOOGLE_SETTINGS = Settings(
    database_url=TEST_DATABASE_URL,
    env="test",
    public_origin="https://test",
    google_client_id="cid",
    google_client_secret="csecret",
)


async def test_start_redirects_with_state(client_google: AsyncClient) -> None:
    """/auth/google/start redirects to Google's real OAuth endpoint and sets a state cookie."""
    r = await client_google.get("/api/v1/auth/google/start")
    assert r.status_code == 302
    assert r.headers["location"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "rt_oauth_state" in client_google.cookies


async def test_start_404_when_not_configured(client: AsyncClient) -> None:
    """Without a Google client id/secret configured, the start route doesn't exist (404)."""
    assert (await client.get("/api/v1/auth/google/start")).status_code == 404


@respx.mock
async def test_callback_creates_user_and_session(client_google: AsyncClient) -> None:
    """Happy path: a valid code+state exchanges for a token, fetches userinfo, creates a
    new local user tied to the Google identity, and redirects home with a session set."""
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

    # Recover the state token /start minted, so the callback carries a signature that
    # matches its own state cookie — a forged/mismatched state is covered separately below.
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    cb = await client_google.get(f"/api/v1/auth/google/callback?code=abc&state={state}")
    assert cb.status_code == 302 and cb.headers["location"] == "https://test/home"
    me = await client_google.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "g@example.edu"


async def test_callback_bad_state(client_google: AsyncClient) -> None:
    """A state value that doesn't match (or was never signed) is rejected before any token
    exchange is attempted — no respx mocks are registered, so a real HTTP call here would fail."""
    r = await client_google.get("/api/v1/auth/google/callback?code=abc&state=forged")
    assert r.status_code == 400


async def test_providers_google_disabled(client: AsyncClient) -> None:
    """/auth/providers reports Google as unavailable when no client id/secret is configured."""
    r = await client.get("/api/v1/auth/providers")
    assert r.status_code == 200
    assert r.json() == {"google": False}


async def test_providers_google_enabled(client_google: AsyncClient) -> None:
    """/auth/providers reports Google as available once client id/secret are configured."""
    r = await client_google.get("/api/v1/auth/providers")
    assert r.status_code == 200
    assert r.json() == {"google": True}


@respx.mock
async def test_callback_token_without_access_token_is_502(client_google: AsyncClient) -> None:
    """Google returning 200 but omitting access_token is treated as an upstream failure (502),
    and no session cookie is issued for a login that never actually completed."""
    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=Response(200, json={"id_token": "x"})
    )
    start = await client_google.get("/api/v1/auth/google/start")
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    cb = await client_google.get(f"/api/v1/auth/google/callback?code=abc&state={state}")
    assert cb.status_code == 502
    assert "rt_session" not in client_google.cookies


@respx.mock
async def test_callback_userinfo_missing_email_is_502(client_google: AsyncClient) -> None:
    """Userinfo missing the email field (required to link/create a local account) is also 502."""
    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=Response(200, json={"access_token": "at"})
    )
    respx.get("https://openidconnect.googleapis.com/v1/userinfo").mock(
        return_value=Response(200, json={"sub": "g-1", "email_verified": True})
    )
    start = await client_google.get("/api/v1/auth/google/start")
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    cb = await client_google.get(f"/api/v1/auth/google/callback?code=abc&state={state}")
    assert cb.status_code == 502
