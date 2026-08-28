"""FastAPI dependencies for "who is signed in" and role-based authorization.

What this file does: reads the `rt_session` cookie, resolves it to a `User` via
`app.auth.sessions.resolve_session`, and exposes the dependencies routes plug in:
`current_user` (optional), `require_user` (401 if not signed in), and `require_role` (403
if the signed-in user's role isn't in an allowed set). Also owns setting/clearing the
session cookie itself.

Used here and why: FastAPI's `Depends()` dependency injection, so every protected route
just declares `user: User = Depends(require_user)` instead of repeating the cookie/lookup
logic; the cookie attributes here are exactly the ones ADR-0002 specifies.

How it fits the project: this is the "who is this request from, and are they allowed" half
of ADR-0002; `app.auth.router` calls `set_session_cookie`/`clear_session_cookie` on
login/logout, and every route elsewhere in the app that needs auth depends on
`require_user`/`require_role` from here.

Depends on: `app.auth.models` (User, UserRole), `app.auth.sessions` (resolve_session),
`app.config` (Settings, get_settings), `app.db.get_session`, `app.errors.Problem`.
Used by: `app/auth/router.py`, `app/content/router.py`, `app/attempts/router.py`,
`tests/test_roles.py`.
"""

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

COOKIE = "rt_session"  # cookie name fixed by ADR-0002; shared with app/auth/router.py


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    # Cookie attributes are the entire client-side half of the session security model
    # (ADR-0002): HttpOnly (no JS access, defends against token theft via XSS), Secure
    # outside dev, SameSite=Lax (blocks the cookie on cross-site non-navigation requests),
    # scoped to the whole site (Path=/).
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
    # Attributes must match set_session_cookie's exactly, or the browser treats this as a
    # different cookie and won't actually delete the session one.
    response.delete_cookie(
        COOKIE, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax"
    )


async def current_user(
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User | None:
    # Returns None (not an error) when there's no cookie or it doesn't resolve, so callers
    # can decide whether "not signed in" is acceptable (see require_user below, where it isn't).
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    return await resolve_session(db, token, now=datetime.now(UTC), days=settings.session_days)


async def require_user(user: User | None = Depends(current_user)) -> User:
    # The 401-raising variant of current_user; use this as the dependency on any route that
    # must have a signed-in caller.
    if user is None:
        raise Problem(401, "Not signed in")
    return user


def require_role(*roles: UserRole) -> Callable[..., Coroutine[Any, Any, User]]:
    # Dependency factory: require_role(UserRole.admin) builds a dependency that first
    # requires a signed-in user, then 403s if their role isn't one of the allowed roles.
    # Cohort-specific ownership (e.g. "this educator's own cohort") is enforced separately,
    # inside the relevant query — this only checks the global role.
    async def _dep(user: User = Depends(require_user)) -> User:
        if user.role not in roles:
            raise Problem(403, "Insufficient role")
        return user

    return _dep
