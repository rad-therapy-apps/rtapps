"""NFR-26 session purge job: deletes sessions whose expiry is long past.

What this file does: `purge_expired_sessions` deletes `session` rows whose `expires_at` is
more than `PURGE_AFTER_DAYS` (30) in the past and returns the count deleted; `main()` is the
CLI entry point (`python -m app.tasks.purge_sessions`) that runs this against a real
database and commits.

Used here and why: a single `DELETE ... WHERE expires_at < cutoff` (not a `SELECT` then
per-row delete) so the purge is one round-trip regardless of row count; same
engine/session-factory/commit shape as `app.seed._run` so this script behaves like every
other one-off CLI entry point in `app/`.

How it fits the project: NFR-26 — sessions are kept around for a month past expiry (an
audit trail for revoked/expired logins) then purged; the VM crontab (docs/06-operations.md,
Task 17) is what actually schedules this, not any code in this package.

Depends on: `app.auth.models` (Session), `app.config`, `app.db`.
Used by: `python -m app.tasks.purge_sessions` (VM crontab entry, Task 17).
"""

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from sqlalchemy import CursorResult, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Session
from app.config import load_settings
from app.db import get_engine, make_session_factory

PURGE_AFTER_DAYS = 30  # NFR-26: sessions purged 30 days after expiry


async def purge_expired_sessions(db: AsyncSession) -> int:
    """Delete sessions whose expiry is more than PURGE_AFTER_DAYS in the past."""
    cutoff = datetime.now(UTC) - timedelta(days=PURGE_AFTER_DAYS)
    result = await db.execute(delete(Session).where(Session.expires_at < cutoff))
    return cast(CursorResult[Any], result).rowcount or 0


async def _run() -> None:
    # Standalone script path: builds its own engine/session (mirrors app.seed._run) and
    # commits once.
    settings = load_settings()
    engine = get_engine(settings)
    factory = make_session_factory(engine)
    async with factory() as db:
        count = await purge_expired_sessions(db)
        await db.commit()
    print(f"purged {count} expired sessions")
    await engine.dispose()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
