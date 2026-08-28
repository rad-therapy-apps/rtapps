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
from app.auth.passwords import hash_password, verify_password
from app.auth.schemas import LoginIn, RegisterIn, UserOut
from app.auth.sessions import create_session, revoke_session, user_by_email
from app.config import Settings, get_settings
from app.db import get_session
from app.errors import Problem

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserOut)
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
        await db.rollback()
        raise Problem(409, "An account with that email already exists") from exc
    token, _ = await create_session(
        db, user, request.headers.get("user-agent"), settings.session_days
    )
    await db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/login", response_model=UserOut)
async def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    user = await user_by_email(db, body.email)
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
    token = request.cookies.get(COOKIE)
    if token:
        await revoke_session(db, token)
        await db.commit()
    clear_session_cookie(response, settings)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(require_user)) -> User:
    return user


@router.get("/providers")
async def providers(settings: Settings = Depends(get_settings)) -> dict[str, bool]:
    return {"google": settings.google_enabled}


@router.get("/google/start")
async def google_start(settings: Settings = Depends(get_settings)) -> Response:
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
    resp.delete_cookie(STATE_COOKIE, path="/api/v1/auth/google")
    return resp
