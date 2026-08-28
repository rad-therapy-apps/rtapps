"""What this file tests: `app/content/router.py` — the student-facing read endpoints
(/subjects, /subjects/{slug}, /lessons/{slug}), through the full HTTP stack.

Used here and why: httpx AsyncClient against the ASGI app — no network — exercising auth
gating, listing/filtering by published status, and the response body actually returned to
a browser (as opposed to `test_content_publish.py`, which checks the snapshot functions
directly).

How it fits the project: protects ADR-0003 — only published lessons/subjects are visible,
every route requires login (`dependencies=[Depends(require_user)]` on the router), and the
answer keys/explanations never reach students at the HTTP boundary either.

Works with: pytest-asyncio, httpx.
Depends on: `client`, `db` fixtures and the `register`/`seed_lesson` helpers from
`conftest.py`; `app.content.router`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import json

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import register, seed_lesson


async def test_requires_login(client: AsyncClient, db: AsyncSession) -> None:
    """Both listing and lesson-detail routes are 401 without a session, even if content exists."""
    await seed_lesson(db)
    assert (await client.get("/api/v1/subjects")).status_code == 401
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 401


async def test_subjects_and_lessons_listing(client: AsyncClient, db: AsyncSession) -> None:
    """Subject list includes a lesson_count; subject detail lists its lessons; unknown slug 404s."""
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
    """The lesson detail response carries no "answer"/"explanation" text anywhere in the
    serialised JSON body — this is the actual student-facing HTTP boundary for ADR-0003's
    "answer keys never reach students" guarantee."""
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
    """A draft lesson (never published) is invisible: 404 on detail, absent from listings."""
    await seed_lesson(db, publish=False)
    await register(client)
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 404
    assert (await client.get("/api/v1/subjects")).json() == []
