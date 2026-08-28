from urllib.parse import urlencode

import httpx
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import Settings
from app.errors import Problem

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_COOKIE = "rt_oauth_state"
STATE_MAX_AGE = 600


def _serializer(settings: Settings) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.session_secret, salt="google-oauth-state")


def redirect_uri(settings: Settings) -> str:
    return f"{settings.public_origin}/api/v1/auth/google/callback"


def build_start(settings: Settings, nonce: str) -> tuple[str, str]:
    if not settings.google_enabled:
        raise Problem(404, "Google sign-in is not configured")
    state = _serializer(settings).dumps(nonce)
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
    if not state_query or not state_cookie or state_query != state_cookie:
        raise Problem(400, "Invalid OAuth state")
    try:
        _serializer(settings).loads(state_query, max_age=STATE_MAX_AGE)
    except (BadSignature, SignatureExpired) as exc:
        raise Problem(400, "Invalid OAuth state") from exc


async def fetch_google_user(settings: Settings, code: str) -> dict[str, object]:
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
        raise Problem(403, "Google account email is not verified")
    return data
