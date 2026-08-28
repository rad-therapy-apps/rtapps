from collections.abc import Callable, Coroutine
from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.auth.sessions import resolve_session
from app.config import Settings, get_settings
from app.db import get_session
from app.errors import Problem

COOKIE = "rt_session"


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        COOKIE,
        token,
        max_age=settings.session_days * 86400,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        COOKIE, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax"
    )


async def current_user(
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    return await resolve_session(db, token, now=datetime.now(UTC), days=settings.session_days)


async def require_user(user: User | None = Depends(current_user)) -> User:
    if user is None:
        raise Problem(401, "Not signed in")
    return user


def require_role(*roles: UserRole) -> Callable[..., Coroutine[Any, Any, User]]:
    async def _dep(user: User = Depends(require_user)) -> User:
        if user.role not in roles:
            raise Problem(403, "Insufficient role")
        return user

    return _dep
