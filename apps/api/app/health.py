"""Liveness/readiness check: confirms the API can reach Postgres.

What this file does: exposes `GET /health`, which runs a trivial query and reports whether
the database is reachable.

Used here and why: a plain FastAPI `APIRouter` with no auth and no business logic, because
this endpoint is polled by infrastructure (deploy health check, container orchestration),
not by end users.

How it fits the project: per `docs/03-architecture.md` §7 (system group) and §10 (the
deploy workflow's health-check step); mounted in `app/main.py` under `/api/v1`.

Depends on: `app.db.get_session`.
Used by: `app/main.py` (mounts `health.router`); `tests/test_health.py`.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session

router = APIRouter(tags=["system"])  # no auth: polled by infra, not by signed-in users


@router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    # "SELECT 1" proves the connection pool and the database itself are both up, not just
    # that the API process is running.
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
