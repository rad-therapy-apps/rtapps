import json

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import register, seed_lesson


async def test_requires_login(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    assert (await client.get("/api/v1/subjects")).status_code == 401
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 401


async def test_subjects_and_lessons_listing(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    subjects = (await client.get("/api/v1/subjects")).json()
    assert subjects == [
        {"slug": "radiation-biology", "title": "Radiation Biology", "order": 1, "lesson_count": 1}
    ]
    subject = (await client.get("/api/v1/subjects/radiation-biology")).json()
    assert subject["lessons"] == [{"slug": "rbe-and-oer", "title": "RBE and OER", "order": 1}]
    assert (await client.get("/api/v1/subjects/nope")).status_code == 404


async def test_lesson_snapshot_is_stripped(client: AsyncClient, db: AsyncSession) -> None:
    lesson = await seed_lesson(db)
    await register(client)
    r = await client.get("/api/v1/lessons/rbe-and-oer")
    assert r.status_code == 200
    body = r.json()
    assert body["content_version_id"] == str(lesson.current_version_id)
    text = json.dumps(body)
    assert '"answer"' not in text and '"explanation"' not in text
    kc = body["snapshot"]["lesson"]["pages"][1]["blocks"][1]
    assert kc["body"] == {"type": "single_choice", "options": ["keeps increasing", "decreases"]}


async def test_unpublished_lesson_is_404(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db, publish=False)
    await register(client)
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 404
    assert (await client.get("/api/v1/subjects")).json() == []
