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

SEED_PASSWORD = "rtapps-dev-password"
SEED_USERS: list[tuple[str, str, UserRole]] = [
    ("admin@example.com", "Admin", UserRole.admin),
    ("educator@example.com", "Educator", UserRole.educator),
    ("student@example.com", "Student", UserRole.student),
]
LESSON_DIR = Path(__file__).resolve().parents[1] / "seed/lessons"


@dataclass
class SeedSummary:
    users_created: int
    lessons_imported: int


async def seed(db: AsyncSession, settings: Settings) -> SeedSummary:
    """Get-or-create the dev accounts and (re)import every seed lesson. Does not commit."""
    if settings.env == "prod":
        raise RuntimeError("refusing to seed a prod environment")

    users_created = 0
    password_hash = hash_password(SEED_PASSWORD)
    for email, display_name, role in SEED_USERS:
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
    await db.flush()

    lessons_imported = 0
    for path in sorted(LESSON_DIR.glob("*.json")):
        doc = LessonImport.model_validate(json.loads(path.read_text()))
        await import_lesson(db, doc, publish=True)
        lessons_imported += 1

    return SeedSummary(users_created=users_created, lessons_imported=lessons_imported)


async def _run() -> None:
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
