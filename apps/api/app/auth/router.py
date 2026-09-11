"""The `/auth/*` routes: email+password register/login/logout, `/me`, and Google OAuth.

What this file does: `register`/`login` create a session and set the cookie; `logout`
revokes the session and clears the cookie; `change_password` verifies the current
password, sets a new one, and signs out every other session; `me` returns the caller's
own profile; `providers` tells the frontend whether Google sign-in is configured;
`google/start` and `google/callback` are the two legs of the Google OAuth redirect flow.

Used here and why: a FastAPI `APIRouter` mounted under `/auth` by `app.main`; each route
composes the building blocks from `app.auth.deps` (cookie set/clear, `require_user`),
`app.auth.sessions` (token issue/revoke), `app.auth.passwords` (hash/verify) and
`app.auth.google` (the OAuth exchange) rather than duplicating any of that logic.

How it fits the project: this is the route layer of ADR-0002 — the only place sessions are
created or destroyed; every route that only needs "who is this" instead depends on
`app.auth.deps.require_user`, not on anything here.

Depends on: `app.auth.deps`, `app.auth.google`, `app.auth.models`, `app.auth.passwords`,
`app.auth.schemas`, `app.auth.sessions`, `app.config`, `app.db.get_session`, `app.errors`.
Used by: `app/main.py` mounts this router; `tests/test_auth_routes.py`,
`tests/test_google.py`.
"""

import secrets

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import COOKIE, clear_session_cookie, require_user, set_session_cookie
from app.auth.google import (
    STATE_COOKIE,
    STATE_MAX_AGE,
    build_start,
    fetch_google_user,
    verify_state,
)
from app.auth.models import Identity, User, UserRole
from app.auth.passwords import hash_password, validate_password_strength, verify_password
from app.auth.schemas import ChangePasswordIn, LoginIn, RegisterIn, UserOut
from app.auth.sessions import (
    create_session,
    hash_token,
    revoke_others_for_user,
    revoke_session,
    user_by_email,
)
from app.config import Settings, get_settings
from app.db import get_session
from app.errors import Problem
from app.ratelimit import rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])

# Module-level singletons: per-IP rate limiters (ruff B008 pattern).
_login_limit = rate_limit("login")
_register_limit = rate_limit("register")
# Own bucket, not a reuse of _login_limit: change-password takes a password guess too (same
# brute-force surface as login), but it's authenticated, so sharing login's per-IP bucket
# would let unrelated login attempts from the same IP throttle a legitimate signed-in user's
# change-password calls (or vice versa). Same config as login, separate counter.
_change_password_limit = rate_limit("change-password")


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserOut,
    dependencies=[Depends(_register_limit)],
)
async def register(
    body: RegisterIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    user = User(
        email=body.email,
        display_name=body.display_name,
        role=UserRole.student,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        # Unique violation on email (a race with a concurrent register for the same
        # address); roll back so the failed insert doesn't poison the session, then 409.
        await db.rollback()
        raise Problem(409, "An account with that email already exists") from exc
    token, _ = await create_session(
        db, user, request.headers.get("user-agent"), settings.session_days
    )
    await db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/login", response_model=UserOut, dependencies=[Depends(_login_limit)])
async def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    user = await user_by_email(db, body.email)
    # One combined check and one generic error message for "no such user", "no password set
    # (OAuth-only account)", "wrong password", and "deactivated" — never reveal which case
    # it was, so a login attempt can't be used to enumerate accounts.
    if (
        user is None
        or user.password_hash is None
        or not verify_password(body.password, user.password_hash)
        or user.deactivated_at
    ):
        raise Problem(401, "Incorrect email or password")
    token, _ = await create_session(
        db, user, request.headers.get("user-agent"), settings.session_days
    )
    await db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> None:
    # No require_user here on purpose: logging out with no/invalid cookie should still
    # succeed (clear whatever the browser has) rather than 401.
    token = request.cookies.get(COOKIE)
    if token:
        await revoke_session(db, token)
        await db.commit()
    clear_session_cookie(response, settings)


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_change_password_limit)],
)
async def change_password(
    body: ChangePasswordIn,
    request: Request,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    """Change the signed-in user's password, then sign out every other session.

    Requires the current password (403 if wrong), rejects a new password that fails
    strength validation, and 409s for a Google-only account with no password to change.
    """
    # A Google-only account has no password_hash to check against or replace.
    if user.password_hash is None:
        raise Problem(409, "This account signs in with Google and has no password")
    if not verify_password(body.current_password, user.password_hash):
        raise Problem(403, "Incorrect current password")
    validate_password_strength(body.new_password)
    user.password_hash = hash_password(body.new_password)
    # Proving the current password is proof of possession, so the caller's own session
    # survives; every other session (other devices/browsers) is signed out. require_user
    # already guarantees this cookie resolved to `user`, so it's always present here.
    keep_session_id = hash_token(request.cookies.get(COOKIE) or "")
    await revoke_others_for_user(db, user.id, keep_session_id)
    await db.commit()


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(require_user)) -> User:
    return user


@router.get("/providers")
async def providers(settings: Settings = Depends(get_settings)) -> dict[str, bool]:
    return {"google": settings.google_enabled}


@router.get("/google/start")
async def google_start(settings: Settings = Depends(get_settings)) -> Response:
    # Redirects to Google's consent screen; the CSRF-style `state` value is stashed in a
    # short-lived cookie scoped to the callback path only, and checked in google_callback.
    url, state = build_start(settings, nonce=secrets.token_urlsafe(16))
    resp = RedirectResponse(url, status_code=302)
    resp.set_cookie(
        STATE_COOKIE,
        state,
        max_age=STATE_MAX_AGE,
        path="/api/v1/auth/google",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    return resp


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Response:
    verify_state(settings, state, request.cookies.get(STATE_COOKIE))
    if not code:
        raise Problem(400, "Missing code")
    info = await fetch_google_user(settings, code)
    sub, email, name = str(info["sub"]), str(info["email"]), str(info.get("name") or info["email"])
    # Link-or-create: an existing Identity means "seen this Google account before" (use its
    # linked user); otherwise fall back to matching by email, and only create a brand-new
    # user if neither exists — so a Google login on an existing password account links
    # rather than duplicating the account.
    identity = await db.scalar(
        select(Identity).where(Identity.provider == "google", Identity.subject == sub)
    )
    if identity is not None:
        user = await db.get(User, identity.user_id)
    else:
        user = await user_by_email(db, email)
        if user is None:
            user = User(email=email, display_name=name, role=UserRole.student, password_hash=None)
            db.add(user)
            await db.flush()
        db.add(Identity(user_id=user.id, provider="google", subject=sub, email_verified=True))
        await db.flush()
    if user is None or user.deactivated_at is not None:
        raise Problem(403, "Account unavailable")
    token, _ = await create_session(
        db, user, request.headers.get("user-agent"), settings.session_days
    )
    await db.commit()
    resp = RedirectResponse(f"{settings.public_origin}/home", status_code=302)
    set_session_cookie(resp, token, settings)
    resp.delete_cookie(STATE_COOKIE, path="/api/v1/auth/google")  # one-time use only
    return resp
