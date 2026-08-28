"""Development seed data: creates the three demo accounts and imports seed lessons.

What this file does: `seed()` get-or-creates an admin/educator/student account (all
sharing one dev password) and imports every JSON lesson fixture in `seed/lessons/`,
publishing each one; `main()` is the CLI entry point that runs this against a real
database and commits.

Used here and why: plain SQLAlchemy `select`/`add`/`flush` (no ORM merge helpers) so the
get-or-create logic and what gets committed stay explicit; refuses to run at all when
`settings.env == "prod"`, as a safety net against seeding demo accounts into production.

How it fits the project: this is `make seed` from `docs/03-architecture.md` §10.1 (dev
environment bring-up) — it gives a fresh dev/test database a login-able admin, educator and
student, plus at least one published lesson to click through.

Depends on: `app.auth.models` (User, UserRole), `app.auth.passwords` (hash_password),
`app.config`, `app.content.importer` (LessonImport, import_lesson), `app.db`.
Used by: `tests/test_seed.py` (`seed`); run directly as a script by `make seed`.
"""

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.auth.passwords import hash_password
from app.config import Settings, load_settings
from app.content.importer import LessonImport, import_lesson
from app.db import get_engine, make_session_factory

SEED_PASSWORD = "rtapps-dev-password"  # shared by all three demo accounts (dev/test only)
SEED_USERS: list[tuple[str, str, UserRole]] = [
    ("admin@example.com", "Admin", UserRole.admin),
    ("educator@example.com", "Educator", UserRole.educator),
    ("student@example.com", "Student", UserRole.student),
]
LESSON_DIR = Path(__file__).resolve().parents[1] / "seed/lessons"  # JSON lesson fixtures to import


@dataclass
class SeedSummary:
    # Small return value so callers (and the CLI's final print) know what actually
    # changed, since seed() is safe to re-run and most rows will already exist after the
    # first run.
    users_created: int
    lessons_imported: int


async def seed(db: AsyncSession, settings: Settings) -> SeedSummary:
    """Get-or-create the dev accounts and (re)import every seed lesson. Does not commit."""
    if settings.env == "prod":
        raise RuntimeError("refusing to seed a prod environment")

    users_created = 0
    password_hash = hash_password(SEED_PASSWORD)  # hash once, reuse for all three demo users
    for email, display_name, role in SEED_USERS:
        # Get-or-create: re-running seed() against an already-seeded database is a no-op
        # for existing accounts rather than raising a unique-constraint error.
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            db.add(
                User(
                    email=email,
                    display_name=display_name,
                    role=role,
                    password_hash=password_hash,
                )
            )
            users_created += 1
    await db.flush()  # assign ids / surface constraint errors before importing lessons

    lessons_imported = 0
    for path in sorted(LESSON_DIR.glob("*.json")):
        # Every fixture is imported and published immediately; seed data has no draft phase.
        doc = LessonImport.model_validate(json.loads(path.read_text()))
        await import_lesson(db, doc, publish=True)
        lessons_imported += 1

    return SeedSummary(users_created=users_created, lessons_imported=lessons_imported)


async def _run() -> None:
    # Standalone script path: builds its own engine/session (this isn't run inside the
    # FastAPI app's lifespan) and commits once, since seed() itself only flushes.
    settings = load_settings()
    engine = get_engine(settings)
    factory = make_session_factory(engine)
    async with factory() as db:
        summary = await seed(db, settings)
        await db.commit()
    print(
        f"seeded: {summary.users_created} users created, "
        f"{summary.lessons_imported} lessons imported"
    )
    await engine.dispose()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
