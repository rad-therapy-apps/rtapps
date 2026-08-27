from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.config import Settings
from app.errors import problem_response

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


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
                if self.settings.env != "test":
                    return problem_response(403, "Missing Origin header")
            elif origin.rstrip("/") != self.settings.public_origin.rstrip("/"):
                return problem_response(403, "Origin not allowed")
        return await call_next(request)
