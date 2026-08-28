"""What this file tests: `app.auth.sessions` — token generation/hashing, session
creation, resolution (including the sliding-expiry extension), and revocation.

Used here and why: the real `db` fixture (Postgres) with hand-built `User` rows via the
`_user` helper, bypassing `conftest.register`/HTTP entirely — these are unit tests of the
session store itself, one level below the cookie/HTTP plumbing `test_roles.py` and
`conftest.register` exercise.

How it fits the project: protects the session half of ADR-0002 — a session's identity in
the database is the hash of its token (never the raw token), expired/revoked sessions
resolve to nothing, and an about-to-expire session is transparently renewed on use so an
active user is never logged out mid-session.

Works with: pytest-asyncio.
Depends on: `db` fixture from `conftest.py`; `app.auth.models` (User, UserRole);
`app.auth.sessions`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.auth.sessions import (
    create_session,
    hash_token,
    resolve_session,
    revoke_all_for_user,
    revoke_session,
)


async def _user(db: AsyncSession) -> User:
    """Insert a bare student row directly (no password/registration needed for these
    session-store tests)."""
    u = User(email="s@example.edu", display_name="Sam", role=UserRole.student)
    db.add(u)
    await db.flush()
    return u


async def test_create_and_resolve(db: AsyncSession) -> None:
    """A freshly created session resolves back to its owner; an unrelated token doesn't."""
    u = await _user(db)
    token, sess = await create_session(db, u, ua="ua", days=14)
    # The stored session id is the *hash* of the token, not the token itself — the raw
    # token only ever exists in the cookie, never at rest in the database.
    assert sess.id == hash_token(token)
    assert await resolve_session(db, token, now=datetime.now(UTC), days=14) is not None
    assert await resolve_session(db, "nope", now=datetime.now(UTC), days=14) is None


async def test_expired_and_revoked(db: AsyncSession) -> None:
    """Two independent ways a session must stop resolving: its lifetime has passed, or
    it was explicitly revoked (revocation applies regardless of remaining lifetime)."""
    u = await _user(db)
    token, _sess = await create_session(db, u, ua=None, days=14)
    later = datetime.now(UTC) + timedelta(days=15)  # 1 day past the 14-day lifetime
    assert await resolve_session(db, token, now=later, days=14) is None
    token2, _ = await create_session(db, u, ua=None, days=14)
    await revoke_session(db, token2)
    assert await resolve_session(db, token2, now=datetime.now(UTC), days=14) is None


async def test_sliding_expiry_extends_when_under_half(db: AsyncSession) -> None:
    """resolve_session extends expires_at when less than half the configured lifetime
    remains, so an active session never needs the user to log back in mid-use."""
    u = await _user(db)
    token, sess = await create_session(db, u, ua=None, days=14)
    original = sess.expires_at
    at = original - timedelta(days=6)  # 6 days left < 7 → extend
    assert await resolve_session(db, token, now=at, days=14) is not None
    await db.refresh(sess)  # pick up the row as resolve_session's own commit left it
    assert sess.expires_at > original  # the renewal actually persisted, not just returned truthy


async def test_revoke_all(db: AsyncSession) -> None:
    """revoke_all_for_user (e.g. "log out everywhere") must revoke every active session
    for the user and report the count, and a revoked session must stop resolving."""
    u = await _user(db)
    t1, _ = await create_session(db, u, ua=None, days=14)
    _t2, _ = await create_session(db, u, ua=None, days=14)
    assert await revoke_all_for_user(db, u.id) == 2
    assert await resolve_session(db, t1, now=datetime.now(UTC), days=14) is None
