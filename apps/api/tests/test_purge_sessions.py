"""What this file tests: `app.tasks.purge_sessions.purge_expired_sessions` — deletes only
sessions whose expiry is more than PURGE_AFTER_DAYS (30) in the past.

Used here and why: hand-built `Session` rows via the `db` fixture (same pattern as
`test_sessions.py`), setting `expires_at` directly rather than going through
`app.auth.sessions.create_session`, since NFR-26 purge only cares about `expires_at`.

How it fits the project: protects NFR-26 (sessions purged 30 days after expiry) — a
session merely expired isn't purged yet (it stays as an audit trail for a month), only one
that's aged past the 30-day cutoff is.

Works with: pytest-asyncio.
Depends on: `db` fixture from `conftest.py`; `app.auth.models` (Session, User, UserRole);
`app.tasks.purge_sessions`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Session, User, UserRole
from app.tasks.purge_sessions import purge_expired_sessions


async def _user(db: AsyncSession) -> User:
    """Insert a bare student row directly (no password/registration needed here)."""
    u = User(email="p@example.edu", display_name="Pat", role=UserRole.student)
    db.add(u)
    await db.flush()
    return u


async def test_purge_deletes_only_sessions_expired_over_30_days(db: AsyncSession) -> None:
    user = await _user(db)
    now = datetime.now(UTC)
    old = Session(id="a" * 64, user_id=user.id, expires_at=now - timedelta(days=31))
    recent = Session(id="b" * 64, user_id=user.id, expires_at=now - timedelta(days=1))
    live = Session(id="c" * 64, user_id=user.id, expires_at=now + timedelta(days=14))
    db.add_all([old, recent, live])
    await db.flush()

    count = await purge_expired_sessions(db)

    assert count == 1
    assert await db.get(Session, old.id) is None
    assert await db.get(Session, recent.id) is not None
    assert await db.get(Session, live.id) is not None
