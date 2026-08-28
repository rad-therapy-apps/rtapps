"""RFC 9457 `application/problem+json` error responses and their FastAPI exception handlers.

What this file does: defines `Problem`, the exception routes raise for expected/handled
errors (e.g. "not found", "wrong password"), a `problem_response` helper that builds the
JSON body, and `install_error_handlers`, which wires `Problem`, Starlette's own
`HTTPException`, and Pydantic's `RequestValidationError` to that same response shape.

Used here and why: FastAPI's `@app.exception_handler` so every error path — expected
(`Problem`), framework-level (`HTTPException`), and request validation (422) — returns one
consistent error shape instead of FastAPI's differing defaults for each.

How it fits the project: per `docs/03-architecture.md` §7, every API error is
`application/problem+json` (`{type, title, status, detail, errors[]}`); this is the single
place that contract is implemented, registered once in `app/main.py`.

Depends on: nothing in-repo.
Used by: `app/main.py` (`install_error_handlers`); `Problem` is raised throughout
`app/auth/router.py`, `app/auth/deps.py`, `app/auth/google.py`, `app/content/router.py`,
`app/attempts/router.py`; `problem_response` is also used directly by `app/csrf.py`.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM = "application/problem+json"  # RFC 9457 media type used on every error response


class Problem(Exception):
    # Raise this anywhere a route needs to fail with a specific HTTP status and message;
    # the handler registered below turns it into a problem+json response.
    def __init__(self, status: int, title: str, detail: str | None = None) -> None:
        super().__init__(title)
        self.status = status
        self.title = title
        self.detail = detail


def problem_response(
    status: int, title: str, detail: str | None = None, **extra: object
) -> JSONResponse:
    # "about:blank" is RFC 9457's default `type` when there's no dedicated problem-type
    # URI; **extra lets callers add fields such as `errors` (validation) without a new shape.
    body: dict[str, object] = {"type": "about:blank", "title": title, "status": status}
    if detail:
        body["detail"] = detail
    body.update(extra)
    return JSONResponse(body, status_code=status, media_type=PROBLEM)


def install_error_handlers(app: FastAPI) -> None:
    # Registered once, in app/main.py's create_app(), so every route in the app benefits.
    @app.exception_handler(Problem)
    async def _problem(_: Request, exc: Problem) -> JSONResponse:
        return problem_response(exc.status, exc.title, exc.detail)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Catches FastAPI/Starlette's own HTTPExceptions (e.g. 404 for an unmatched route)
        # so they get the same problem+json shape as a hand-raised Problem.
        return problem_response(exc.status_code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Pydantic request-validation failures (bad body/query/path) become RFC 9457's
        # `errors[]` list rather than FastAPI's default `{"detail": [...]}`.
        errors = [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]
        return problem_response(422, "Validation failed", errors=errors)
