"""CSRF defence: reject non-GET requests whose `Origin` isn't the allowed front end.

What this file does: an ASGI middleware, `OriginCheckMiddleware`, that blocks any mutating
(non-GET/HEAD/OPTIONS) request unless its `Origin` header matches `settings.public_origin`.

Used here and why: Starlette's `BaseHTTPMiddleware`, kept deliberately simple — per
ADR-0002, `SameSite=Lax` cookies already block most cross-site sends, so this only needs to
add the `Origin` allow-list check the ADR calls for, not a full CSRF-token scheme.

How it fits the project: registered once in `app/main.py`; this is the second half of the
CSRF (cross-site request forgery) story in `docs/03-architecture.md` §8 — the first half is
the cookie's `SameSite=Lax` attribute, set in `app/auth/deps.py`.

Depends on: `app.config.Settings`, `app.errors.problem_response`.
Used by: `app/main.py` (`OriginCheckMiddleware`); exercised directly by `tests/test_csrf.py`.
"""

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.config import Settings
from app.errors import problem_response

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}  # methods that never mutate state; skip the check


class OriginCheckMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        super().__init__(app)
        self.settings = settings

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method not in SAFE_METHODS:
            origin = request.headers.get("origin")
            if origin is None:
                # Browsers send Origin on cross-origin and same-site mutating requests;
                # a missing header is suspicious except from the test client, which
                # doesn't set one — hence the env == "test" exemption.
                if self.settings.env != "test":
                    return problem_response(403, "Missing Origin header")
            elif origin.rstrip("/") != self.settings.public_origin.rstrip("/"):
                # Trailing slash stripped before comparing, so "https://app.example" and
                # "https://app.example/" are treated as the same origin.
                return problem_response(403, "Origin not allowed")
        return await call_next(request)
