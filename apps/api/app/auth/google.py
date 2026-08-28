"""Google sign-in: the OIDC (OpenID Connect) authorization-code flow, hand-rolled with `httpx`.

What this file does: builds the Google authorization URL and a signed anti-CSRF `state`
value (`build_start`), verifies that state on callback (`verify_state`), and exchanges the
authorization code for the user's Google profile (`fetch_google_user`).

Used here and why: `httpx` (async HTTP client) talks to Google's token/userinfo endpoints
directly rather than pulling in a full OIDC client library — per
`docs/03-architecture.md` §4.2, this flow is implemented with `httpx` and a signed state
cookie, explicitly "(no Authlib)"; `itsdangerous.URLSafeTimedSerializer` signs and
time-limits the `state` value so it can be verified without any server-side storage for it.

How it fits the project: the Google half of ADR-0002's login flow; `app/auth/router.py`
calls into this module for the `/auth/google/start` and `/auth/google/callback` routes,
then links the returned profile to a `User`/`Identity` row and issues a normal session.

Depends on: `app.config.Settings`, `app.errors.Problem`.
Used by: `app/auth/router.py`; `tests/test_google.py`.
"""

from urllib.parse import urlencode

import httpx
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import Settings
from app.errors import Problem

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_COOKIE = "rt_oauth_state"  # short-lived cookie holding the signed anti-CSRF state value
STATE_MAX_AGE = 600  # seconds the signed state (and its cookie) stay valid — 10 minutes


def _serializer(settings: Settings) -> URLSafeTimedSerializer:
    # Keyed on the app's session secret with a distinct salt, so a leaked/forged OAuth
    # state value can't be reused to forge anything else signed with the same secret.
    return URLSafeTimedSerializer(settings.session_secret, salt="google-oauth-state")


def redirect_uri(settings: Settings) -> str:
    # Must exactly match the redirect URI registered in the Google Cloud console.
    return f"{settings.public_origin}/api/v1/auth/google/callback"


def build_start(settings: Settings, nonce: str) -> tuple[str, str]:
    # 404s (rather than a confusing OAuth error) when Google credentials aren't configured,
    # e.g. in dev environments that don't need Google sign-in.
    if not settings.google_enabled:
        raise Problem(404, "Google sign-in is not configured")
    state = _serializer(settings).dumps(nonce)  # sign the nonce; caller stores it in a cookie
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri(settings),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{AUTH_URL}?{urlencode(params)}", state


def verify_state(settings: Settings, state_query: str | None, state_cookie: str | None) -> None:
    # Two checks: the state Google echoed back must equal the one set in the cookie
    # (defends against a forged callback), and it must still verify its signature and not
    # have expired (defends against replaying an old, no-longer-valid state).
    if not state_query or not state_cookie or state_query != state_cookie:
        raise Problem(400, "Invalid OAuth state")
    try:
        _serializer(settings).loads(state_query, max_age=STATE_MAX_AGE)
    except (BadSignature, SignatureExpired) as exc:
        raise Problem(400, "Invalid OAuth state") from exc


async def fetch_google_user(settings: Settings, code: str) -> dict[str, object]:
    # Two-step OAuth: exchange the authorization code for an access token, then use that
    # token to fetch the user's profile. Any non-200 from Google is surfaced as a 502
    # (upstream failure), not passed through as-is.
    async with httpx.AsyncClient(timeout=10) as http:
        tok = await http.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri(settings),
                "grant_type": "authorization_code",
            },
        )
        if tok.status_code != 200:
            raise Problem(502, "Google token exchange failed")
        access_token = tok.json().get("access_token")
        if not access_token:
            raise Problem(502, "Google token exchange returned no access token")
        info = await http.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if info.status_code != 200:
            raise Problem(502, "Google userinfo failed")
        data: dict[str, object] = info.json()
    if not data.get("sub") or not data.get("email"):
        raise Problem(502, "Google userinfo response is missing sub or email")
    if not data.get("email_verified"):
        # Only a Google-verified email is trusted to link/create an account by email
        # (app/auth/router.py matches on this), so an unverified one is rejected here.
        raise Problem(403, "Google account email is not verified")
    return data
