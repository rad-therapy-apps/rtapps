# Simulator merge and gantry archive (PR 2, task 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Simulator page shows one card, the radiation oncology center. Its copy says the LINAC and CT simulators are inside the center. The Gantry Position Guessing Game is archived: students no longer see it anywhere, and its row, versions, attempts and files stay.

**Architecture:**

- **Web:** `(app)/simulator/+page.server.ts` resolves only the hub (`GET /activities/by-sdk-slug/sim-hub-qa`). `+page.svelte` renders one `Card` and keeps `data-testid="simulator-entry"`. The `linacConsole` and `gantry` lookups, their cards and the `Monitor`/`RotateCw` icon imports go.
- **API:** in `app/seed.py`, the gantry entry in `SEED_ARCADE_GAMES` gets `"archived": True`. The arcade loop sets such a row's `status` to `"archived"` instead of publishing it. `"archived"` is the third value the schema already allows (`LESSON_STATUSES = ("draft", "published", "archived")`, CHECK `ck_activity_status`). Every student-facing read already requires `status == "published"`, so there is no migration and no route change.
- **Tests:**
  - `apps/api/tests/test_seed.py`: a fresh seed creates the game archived. A published row with an attempt flips in place, keeps the attempt, and is hidden from every student read.
  - `apps/web/e2e/simulator.e2e.ts`: the page has one card, and the Treatment Delivery Procedures Games shelf has no gantry link.
- **Docs:** a paragraph in `docs/03-architecture.md` §6.6.

**Tech Stack:** SvelteKit with Svelte 5 runes, `#lib/ui` kit, Playwright; FastAPI, SQLAlchemy asyncio, pytest-asyncio, Postgres 18; `uv`, `pnpm`.

**Spec:** `docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md`. The parts that apply are "Owner decisions" (Merge, Gantry game), "Global constraints", "PR 2: Simulator merge and gantry archive" and "Owner answers" item 3. The common brief (`/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/plan-brief-common.md`) overrides the spec where they differ. In particular, "Back to the door you left from" is PR 1's task 1e and is not in this plan.

## Global Constraints

### Binding (from the common brief, verbatim)

- NPC check: `node apps/web/scripts/sim-hub-npc-check.mjs` checks a–m stay green; floors REST_FLOOR 40, HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15 never change; never loosen the check; check j unchanged. If something breaks it, fix NPC data, never the check. journey.ts journeys, actors and route builders stay (the check runs them).
- Scene check (`node scripts/sim-hub-scene-check.mjs`), visibility check (`ANGLE=metal node scripts/sim-hub-visibility-check.mjs`, from apps/web) and `pnpm exec vitest run --project server arcade-src/sim-hub/src` stay green. The visibility check may only change how it enters walk mode.
- e2e must keep working: `#watermark`, `#siteChoices` (filled by procRenderSite() at the end of boot), `#releaseClinical`/`#holdClinical`, `window.CONSOLE_APP_URL`, `window.__rtappsVerdictLocked`, player iframe title "Center QA walkthrough", `RTApps.recordResult('sim-hub-qa', …)`.
- CI (pnpm build:arcade, arcade-smoke.mjs, the NPC check in the web job) is never weakened. No self-hosted runners.
- Lint: `pnpm exec prettier --write <touched files>` and `pnpm exec eslint <touched files>` only; never the package-wide `pnpm lint`. Also `pnpm check` and `pnpm exec prettier --check .` before the PR.
- three.js pinned at 0.160.0; no new dependencies (7-day release-age rule).
- Never read, create or edit any `.env*` file (infra/prod.env.example is fine). Never print secrets or seed passwords.
- People in text and comments: they/them or names.
- Storage only through prefs.ts (try/catch).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `git add` anything under `.superpowers/` or `e2e/.auth/`. No force-push. Python via `uv run` (never pip/python directly).
- Implementer subagents: scratch files only under the session scratchpad; never delete files they didn't create; no glob deletes; stop and report if a permission is denied.

### PR 2 rules

- **Branch and worktree:**
  - Branch `feat/simulator-merge`, from `main` (at or after `2a845b0`).
  - One worktree (`merge-page`), one PR.
  - It depends on nothing in PR 1 or PR 3 and can ship first.
- **Files:** change only the six files in "File Structure". Do not touch any of these:
  - `apps/web/arcade/**` (the gantry game's files stay);
  - `apps/web/arcade-src/**` or `apps/web/scripts/**` (there is no hub code in this PR);
  - `apps/api/app/content/router.py` and its resolver tests;
  - `packages/api-client/**`;
  - the LINAC/CT and console entries in `SEED_ARCADE_GAMES`.
- **Hub checks:** this PR changes no hub or script file, so the NPC, scene and visibility checks and `arcade-smoke.mjs` are not run locally. CI's web job still runs `build:arcade`, the smoke and the NPC check, unchanged. Task 4 proves no hub file changed.
- **Prettier:** only on the files under `apps/web` that a task touched, run from `apps/web`. Never run prettier on `docs/03-architecture.md`. The repo root has no prettier config, so prettier's defaults would rewrap the doc's tables, and CI's `pnpm --filter web lint` does not check `docs/`.
- **API lint:** from `apps/api`:
  - `uv run ruff format <files>`;
  - `uv run ruff check <files>`;
  - `uv run ruff format --check <files>`;
  - `uv run mypy app`.
- **Code style:**
  - Python: 4 spaces, line length 100.
  - Web: tabs, single quotes, printWidth 100.
  - Update every comment that names a removed thing. Remove what your change leaves unused, and nothing else.
- **Scratch:** only under `/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page/`.
- **Shell variables:** shell state does not persist between commands, so every block sets the ones it uses:

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
```

If the controller puts the worktree somewhere else, use that path for `WT` everywhere.

- **API test database:**
  - It is the throwaway Postgres `rtapps-testdb` on `127.0.0.1:5433`, which `tests/conftest.py` uses by default (`TEST_DATABASE_URL`).
  - Never remove that container.
  - The repo's compose `db` (port 5442) is not used for pytest.
- **Local e2e stack:**
  - The Docker compose project `rtlocal` runs from the worktree with a scratch settings file `$SCR/local-stack.env`. Its name does not start with `.env`, and it holds made-up dev values only.
  - It binds the same host ports as the owner's `make dev`: 8080, 5173, 5442, 9000, 8025 and 1025.
  - If any of those ports is taken, stop and report. Never stop the owner's stack.
  - Take `rtlocal` down at the end of Task 4.
- **e2e logins** share one rate-limit bucket (burst 10, one token per 6 s). A run of `simulator.e2e.ts` uses at most 3 logins: 2 in the setup project and 1 educator sign-in. If a test stays on `/login`, grep `apps/web/test-results` for "Too many requests", wait 60 s and re-run. Never disable the limiter.

## Controller decisions (2026-11-11, override the findings below)

- **Copy (finding 7):** use the hub's own names: "walk to the LINAC Control Area or the CT Simulator Room and press E at the door". Applied in Task 2.
- **Stale sentence (finding 8):** dropped now; the card says "Explore on your own and talk to the staff, then run the QA walkthrough." Applied in Task 2.
- **`by-arcade-slug` (finding 5):** keep the route unchanged.
- **Prod (finding 6):** prod is not live yet; the PR body notes the manual `UPDATE` for when it is.
- **Archive effects (findings 2–3):** accepted; the owner is told the educator overview and stats page drop the game while student results keep it.
- **Docker (finding 9):** the controller decides at dispatch time; without the local stack, CI's e2e run is the e2e check.

## Plan-time findings for the controller

Each item is information, unless it says "decision".

1. **Archive mechanism: status `"archived"`.**
   - The schema already has an archive concept: `LESSON_STATUSES = ("draft", "published", "archived")` in `apps/api/app/content/models.py:56`, enforced by `ck_activity_status` in `alembic/versions/0003_content.py:180`. Nothing has used `"archived"` until now.
   - There is no admin or authoring route that unpublishes. The authoring API only publishes (`app/authoring/router.py`), and the admin router only manages users.
   - `"archived"` was chosen over `"draft"` for three reasons:
     - It says "retired", not "not yet published".
     - The author page shows it as "(archived)" (`(app)/author/+page.svelte:171`).
     - It needs no migration.
2. **What "archived" hides.** Every one of these requires `status == "published"`:
   - **Subject counts:** `GET /subjects` (`content/router.py:66`).
   - **Games shelf:** `GET /subjects/{slug}` activities (`:103`). `(app)/subjects/[slug]/+page.svelte` groups them, and the "Games" shelf is the `external` group.
   - **Slug resolvers:** both, through `_resolve_published_external` (`:180`).
   - **Player route:** `GET /activities/{id}` (`:209`), so `(app)/subjects/[slug]/activities/[id]` returns 404.
   - **Starting an attempt:** `POST /activities/{id}/attempts` (`attempts/router.py:94`).
   - **Educator cohort overview:** its activity table, through `_published_activities` (`analytics/queries.py:69-77`).
   - **Educator stats page:** the activity stats page and its CSV export (`analytics/router.py:99, 254`) return 404.

   Task 1's new test checks the first five through the API.

3. **What stays:**
   - **The row and its versions:** the activity row and its append-only `content_version` rows. Attempts pin `content_version_id` with `ondelete="RESTRICT"`.
   - **The student's own results:** `GET /me/results` (`attempts/router.py:253`) joins `Activity` without a status filter.
   - **The educator's per-student page:** `student_results` and `student_attempts` (`analytics/queries.py:170-230`) have no status filter either.
   - **The seed:** it has no `delete` call.
   - **The game's files:** `apps/web/arcade/gantry-game/` and its vendor files (`apps/web/static/arcade/vendor/MANIFEST.md`) are untouched.
4. **No test asserted the three cards.**
   - `apps/web/e2e` has no assertion on `console-entry`, `gantry-entry` or the gantry game. A grep of the repo, excluding old plans, finds only the page itself.
   - Three specs use the page, and none of them changes behaviour:
     - `simulator.e2e.ts:93-94` and `long-tail.e2e.ts:146-147, 340-341` click `simulator-entry`;
     - `ui.e2e.ts:69` runs an axe scan of `/simulator`.
   - The page has no unit tests. No `src/routes` route has any, and none renders a page that imports `$app/paths`. So the page's test is the new e2e assertion.
5. **`GET /activities/by-arcade-slug/{slug}` loses its only web consumer** (the gantry lookup).
   - The route, its tests (`TestArcadeSlugResolver`) and its docstring ("added for the Simulator page, whose gantry-game entry…") stay unchanged.
   - Editing the docstring would change `packages/api-client/openapi.json`, which the `contract` CI job diffs, and it would need `make client`.
   - **Decision for the owner:** keep the route, or remove it in a follow-up.
6. **Deployed environments.**
   - The seed does not run on deploy. On `test`, the row is archived only after the seed is re-run (`docs/06-operations.md`, "First deploy on `test`").
   - The seed refuses `ENV=prod`. So if prod has a gantry row, it needs a manual step, for example `UPDATE activity SET status = 'archived' WHERE kind = 'external' AND title = 'Gantry Position Guessing Game';`.
   - **Decision for the owner:** how prod is handled. The PR body flags it.
7. **Copy.** The card uses the spec's wording verbatim: "walk to the LINAC Control Area or the CT Simulator Room and press E at the door".
   - The hub's own names for those rooms are "LINAC Control Area", "CT Control Room" (kicker "Clinical Wing · CT Simulation") and "CT Simulator Room". The doors that open the LINAC/CT app are `ROOM_APP_DOORS` in `arcade-src/sim-hub/src/interact.ts:478`.
   - **Decision for the owner:** keep the spec's wording, or use the hub's names.
8. **A sentence that goes stale.** The card's first paragraph still says "Follow a guided patient journey or explore on your own". PR 1 removes the guided journeys.
   - This PR keeps the sentence unchanged, because the journeys still exist when it ships.
   - **Decision for the owner:** whether to drop it now. The ready replacement for that sentence is "Explore on your own and talk to the staff, then run the QA walkthrough."
9. **Docker is not running** on the machine as of planning (`docker info` fails).
   - Task 1 needs Docker for pytest. Tasks 2 and 4 need it for the local e2e stack.
   - **Decision for the controller:** whether the local e2e stack may run while PR 1's heavy checks run. If not, skip the e2e steps marked "(stack)", and CI's e2e job is the only e2e run.

## File Structure

| File                                                  | Responsibility                                                                                                                                                                           | Task |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `apps/api/app/seed.py`                                | `SEED_ARCADE_GAMES`: the comment above it and the gantry entry (`"archived": True`). The arcade loop's last branch: archive instead of publish.                                          | 1    |
| `apps/api/tests/test_seed.py`                         | Imports; the module docstring's "Depends on"; `test_seed_batch_3_gantry_position_guessing_game` (now archived); new `test_seed_archives_a_published_gantry_game_and_keeps_its_attempts`. | 1    |
| `apps/web/e2e/simulator.e2e.ts`                       | Task 1: header line 11 and the Games-shelf assertion in the second serial test. Task 2: header line 3 and the one-card assertion in the first serial test.                               | 1, 2 |
| `apps/web/src/routes/(app)/simulator/+page.server.ts` | `load` resolves the hub only.                                                                                                                                                            | 2    |
| `apps/web/src/routes/(app)/simulator/+page.svelte`    | One card, the center, with the LINAC/CT copy.                                                                                                                                            | 2    |
| `docs/03-architecture.md`                             | §6.6: a paragraph on the Simulator page and the archive.                                                                                                                                 | 3    |

## Setup (controller, before dispatch)

- [ ] **Create the worktree and install.**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
mkdir -p /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees
git worktree add /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page -b feat/simulator-merge main
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
pnpm install --frozen-lockfile
```

Expected: `Preparing worktree (new branch 'feat/simulator-merge')`, then pnpm ends with `Done in …`.

- [ ] **Record the `pnpm check` baseline.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
mkdir -p "$SCR"
cd "$WT/apps/web" && pnpm check 2>&1 | grep "svelte-check found" | tee "$SCR/check-baseline.txt"
```

Expected: `svelte-check found 0 errors and N warnings`, where N is the baseline (earlier plans recorded 23). Task 2 compares against this file.

---

### Task 1: Archive the gantry game in the seed

**Files:**

- Modify: `apps/api/app/seed.py`. There are three anchors:
  - the comment line `# Arcade games (plans 4a/4b), get-or-created by title like the practice calculators.`;
  - the dict whose `"title"` is `"Gantry Position Guessing Game"`;
  - the two lines `if arcade_activity.status != "published" or config_changed:` / `await publish_activity(db, arcade_activity, educator, change_note="Initial publish")` at the end of the `for game in SEED_ARCADE_GAMES:` loop.
- Modify: `apps/api/tests/test_seed.py`. There are four anchors:
  - the import block;
  - the docstring's `Depends on:` paragraph;
  - the whole function `test_seed_batch_3_gantry_position_guessing_game`;
  - the blank lines before `async def test_seed_batch_3_linac_component_identification`.
- Modify: `apps/web/e2e/simulator.e2e.ts`. There are two anchors:
  - the header line ` * carries the plan 4c media cache header.`;
  - the line `await expect(studentPage.getByRole('heading', { name: 'Games' })).toBeVisible();`.

**Interfaces:**

- **Consumes:**
  - `seed(db: AsyncSession, settings: Settings) -> SeedSummary` from `app.seed`. It does not commit, and later queries in `seed()` autoflush the status change.
  - `SEED_PASSWORD: str` from `app.seed`.
  - `publish_activity(db: AsyncSession, activity: Activity, author: User | None, change_note: str | None = None) -> ContentVersion` from `app.content.service`. It writes the next version, sets `status = "published"`, repoints `current_version_id` and flushes.
  - `make_client(app: FastAPI, db: AsyncSession)` from `tests.conftest`: an async context manager yielding an `httpx.AsyncClient` with base URL `https://test`.
  - This module's fixtures: `db` (a SAVEPOINT on the twice-seeded connection) and `settings`. Also conftest's `app`.
- **Produces:**
  - A `SEED_ARCADE_GAMES` entry may carry `"archived": True`. The key sits outside `config`, so the config comparison is unchanged.
  - After `seed()`, the `kind == "external"` activity titled "Gantry Position Guessing Game" has `status == "archived"`.
  - On a fresh database it has `current_version_id is None`.
  - On a database where it was published, `current_version_id` is unchanged.

- [ ] **Step 1: Start the test database.**

```bash
docker info >/dev/null 2>&1 && echo docker-ok || echo docker-down
docker ps -q --filter name=^rtapps-testdb$
docker ps -aq --filter name=^rtapps-testdb$
```

- If the first line says `docker-down`, stop and report: the owner has to start Docker Desktop.
- If the second command prints an id, the database is running; go on.
- Otherwise, if the third command prints an id, run `docker start rtapps-testdb`.
- Otherwise create the database:

```bash
docker run -d --name rtapps-testdb -p 127.0.0.1:5433:5432 -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test postgres:18
```

Then re-run `docker exec rtapps-testdb pg_isready -U rtapps -d rtapps_test` until it prints `/var/run/postgresql:5432 - accepting connections`. Use Monitor with an until-loop if foreground `sleep` is blocked.

- [ ] **Step 2: Baseline.** The first `uv run` in the worktree creates `apps/api/.venv`.

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/api" && uv run pytest tests/test_seed.py -k gantry -q -p no:cacheprovider --no-cov 2>&1 | tail -3
```

Expected: `1 passed, 41 deselected`.

- [ ] **Step 3: Write the failing tests** in `apps/api/tests/test_seed.py`.

Imports. Old:

```python
from collections.abc import AsyncIterator
from dataclasses import dataclass

import pytest
```

New:

```python
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime

import pytest
```

Old:

```python
from app.content.models import Activity, ContentVersion, Lesson, Subject
from app.seed import SeedSummary, seed
```

New:

```python
from app.content.models import Activity, ContentVersion, Lesson, Subject
from app.content.service import publish_activity
from app.seed import SEED_PASSWORD, SeedSummary, seed
```

Module docstring. Old:

```
Depends on: `migrated_db`, `settings` and `app` fixtures, `TEST_DATABASE_URL` and `make_client` from
`conftest.py`; `app.seed.seed`; `app.config.Settings`; `app.cohorts.models` (Cohort,
Enrollment); `app.attempts.models` (Attempt); `app.attempts.rollup` (ActivityResult);
`app.content.models` (Activity, Lesson); `app.content.activity_models` (DataTable, Quiz,
Outcome, QuestionOutcome).
```

New:

```
Depends on: `migrated_db`, `settings` and `app` fixtures, `TEST_DATABASE_URL` and `make_client` from
`conftest.py`; `app.seed` (seed, SEED_PASSWORD); `app.config.Settings`; `app.cohorts.models`
(Cohort, Enrollment); `app.attempts.models` (Attempt); `app.attempts.rollup` (ActivityResult);
`app.content.models` (Activity, Lesson); `app.content.activity_models` (DataTable, Quiz,
Outcome, QuestionOutcome); `app.content.service` (publish_activity).
```

The gantry test. Old (the whole function):

```python
async def test_seed_batch_3_gantry_position_guessing_game(db: AsyncSession) -> None:
    """Plan 4b batch 3: Gantry Position Guessing Game — published, kind external, access
    practice, config with arcade_slug and max_score (10: perfect streak of 10 correct);
    subject is treatment-delivery-procedures; re-seeding creates 0."""
    activity = await db.scalar(
        select(Activity).where(
            Activity.kind == "external", Activity.title == "Gantry Position Guessing Game"
        )
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "gantry-game", "max_score": 10}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "treatment-delivery-procedures"

    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "Gantry Position Guessing Game")
    )
    assert count == 1
```

New. This is the changed function plus the new test after it; the next function, `test_seed_batch_3_linac_component_identification`, stays as it is:

```python
async def test_seed_batch_3_gantry_position_guessing_game(db: AsyncSession) -> None:
    """Plan 4b batch 3: Gantry Position Guessing Game — kind external, access practice,
    config with arcade_slug and max_score (10: perfect streak of 10 correct); subject is
    treatment-delivery-procedures; re-seeding creates 0. Archived since 2026-11-11
    (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 2): a fresh seed creates it at
    status "archived" and never publishes it, so it has no content version."""
    activity = await db.scalar(
        select(Activity).where(
            Activity.kind == "external", Activity.title == "Gantry Position Guessing Game"
        )
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "archived"
    assert activity.current_version_id is None
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "gantry-game", "max_score": 10}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "treatment-delivery-procedures"

    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "Gantry Position Guessing Game")
    )
    assert count == 1


async def test_seed_archives_a_published_gantry_game_and_keeps_its_attempts(
    app: FastAPI, db: AsyncSession, settings: Settings
) -> None:
    """A database seeded before 2026-11-11 holds the gantry game published, perhaps with
    attempts on it. Re-running seed() flips that row to "archived" in place: no second row,
    no new version, the attempt kept. From then on no student-facing read finds it (the
    subject's Games shelf, the by-arcade-slug resolver, the player route, a new attempt),
    while the student's own results still list the old attempt, and the LINAC/CT and console
    activities on the same shelf stay listed."""
    activity = await db.scalar(
        select(Activity).where(
            Activity.kind == "external", Activity.title == "Gantry Position Guessing Game"
        )
    )
    educator = await db.scalar(select(User).where(User.email == "educator@example.com"))
    student = await db.scalar(select(User).where(User.email == "student03@example.com"))
    assert activity is not None and educator is not None and student is not None
    # Simulate a database seeded before the archive: the game published, one submitted attempt.
    version = await publish_activity(db, activity, educator, change_note="Initial publish")
    attempt = Attempt(
        user_id=student.id,
        activity_id=activity.id,
        content_version_id=version.id,
        status="submitted",
        score=7.0,
        max_score=10.0,
        percent=70.0,
        submitted_at=datetime.now(UTC),
    )
    db.add(attempt)
    await db.flush()

    await seed(db, settings)
    await db.refresh(activity)
    assert activity.status == "archived"
    assert activity.current_version_id == version.id
    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "Gantry Position Guessing Game")
    )
    assert count == 1
    kept = await db.scalar(
        select(func.count()).select_from(Attempt).where(Attempt.id == attempt.id)
    )
    assert kept == 1

    # Built here, not via conftest's `client` fixture, for the same event-loop reason as
    # test_seed_users_can_log_in.
    async with make_client(app, db) as client:
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "student03@example.com", "password": SEED_PASSWORD},
        )
        assert r.status_code == 200
        r = await client.get("/api/v1/subjects/treatment-delivery-procedures")
        assert r.status_code == 200
        titles = {a["title"] for a in r.json()["activities"]}
        assert "Gantry Position Guessing Game" not in titles
        assert {"Treatment delivery", "CT simulation", "Treatment console"} <= titles
        r = await client.get("/api/v1/activities/by-arcade-slug/gantry-game")
        assert r.status_code == 404
        r = await client.get(f"/api/v1/activities/{activity.id}")
        assert r.status_code == 404
        r = await client.post(f"/api/v1/activities/{activity.id}/attempts")
        assert r.status_code == 404
        r = await client.get("/api/v1/me/results")
        assert r.status_code == 200
        assert str(attempt.id) in {row["attempt_id"] for row in r.json()}
```

- [ ] **Step 4: Run them; expect both to FAIL.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/api" && uv run pytest tests/test_seed.py -k gantry -q -p no:cacheprovider --no-cov 2>&1 | grep -E "^FAILED|passed|failed"
```

Expected:

```
FAILED tests/test_seed.py::test_seed_batch_3_gantry_position_guessing_game - AssertionError: assert 'published' == 'archived'
FAILED tests/test_seed.py::test_seed_archives_a_published_gantry_game_and_keeps_its_attempts - AssertionError: assert 'published' == 'archived'
2 failed, 41 deselected
```

If a test fails anywhere else, for example an import error, a database error or a 401 at login, fix the test before going on.

- [ ] **Step 5: Implement** in `apps/api/app/seed.py`.

The comment above `SEED_ARCADE_GAMES`. Old:

```python
# Arcade games (plans 4a/4b), get-or-created by title like the practice calculators.
```

New:

```python
# Arcade games (plans 4a/4b), get-or-created by title like the practice calculators. An entry
# with "archived": True is kept at status "archived" and never published (see the loop in seed()).
```

The gantry entry. Old:

```python
        "title": "Gantry Position Guessing Game",
        "subject_slug": "treatment-delivery-procedures",
        "config": {"arcade_slug": "gantry-game", "max_score": 10},
    },
```

New:

```python
        # Archived 2026-11-11 (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 2): off
        # the Simulator page and hidden from students; its row, versions and attempts stay.
        "title": "Gantry Position Guessing Game",
        "subject_slug": "treatment-delivery-procedures",
        "config": {"arcade_slug": "gantry-game", "max_score": 10},
        "archived": True,
    },
```

The end of the arcade loop. Old:

```python
        if arcade_activity.status != "published" or config_changed:
            await publish_activity(db, arcade_activity, educator, change_note="Initial publish")
```

New:

```python
        if game.get("archived"):
            # Archived: never (re)published. Every student-facing read requires "published",
            # so this alone hides it; the row, its versions and its attempts stay.
            arcade_activity.status = "archived"
        elif arcade_activity.status != "published" or config_changed:
            await publish_activity(db, arcade_activity, educator, change_note="Initial publish")
```

- [ ] **Step 6: Run them; expect PASS.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/api" && uv run pytest tests/test_seed.py -k gantry -q -p no:cacheprovider --no-cov 2>&1 | tail -1
```

Expected: `2 passed, 41 deselected`.

- [ ] **Step 7: Run the API files this PR touches or depends on.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/api" && uv run pytest tests/test_seed.py tests/test_seed_arcade_dirs.py tests/test_external_activity.py tests/test_content_routes.py -q -p no:cacheprovider --no-cov 2>&1 | tail -1
```

Expected: `68 passed`.

- The before count is 67: 42 in `test_seed.py`, 1 in `test_seed_arcade_dirs.py`, and 24 in the two route files.
- The new one is the archive test.
- `test_seed_creates_treatment_delivery`, `test_seed_creates_ct_simulation`, `test_seed_creates_treatment_console` and `test_seed_sdk_slug_unique_across_published_externals` still pass. So the LINAC/CT and console rows stay published and unchanged.

- [ ] **Step 8: e2e: the Games shelf.** This is written now. It runs in Task 2 Step 6 and in Task 4 (stack).

In `apps/web/e2e/simulator.e2e.ts`, the header. Old:

```ts
 * carries the plan 4c media cache header.
```

New:

```ts
 * carries the plan 4c media cache header. The second test also checks that the gantry game,
 * archived on 2026-11-11, is gone from the Treatment Delivery Procedures Games shelf.
```

The second serial test. Old:

```ts
await expect(studentPage.getByRole("heading", { name: "Games" })).toBeVisible();
```

New:

```ts
await expect(studentPage.getByRole("heading", { name: "Games" })).toBeVisible();
// Archived on 2026-11-11: the gantry game left this shelf; the LINAC/CT activities stay.
await expect(
  studentPage.getByRole("link", { name: "Gantry Position Guessing Game" }),
).toHaveCount(0);
```

- [ ] **Step 9: Checks.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/api" && uv run ruff format app/seed.py tests/test_seed.py && uv run ruff check app/seed.py tests/test_seed.py && uv run ruff format --check app/seed.py tests/test_seed.py && uv run mypy app
cd "$WT/apps/web" && pnpm exec prettier --write e2e/simulator.e2e.ts && pnpm exec eslint e2e/simulator.e2e.ts
```

Expected:

- ruff ends with `All checks passed!` and `2 files already formatted`;
- mypy prints `Success: no issues found in … source files`;
- prettier prints `e2e/simulator.e2e.ts …ms` (it may say unchanged);
- eslint prints nothing.

If `ruff format` reformats any of the new lines, keep its output.

- [ ] **Step 10: Commit.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT" && git add apps/api/app/seed.py apps/api/tests/test_seed.py apps/web/e2e/simulator.e2e.ts && git commit -m "feat(seed): archive the gantry position game" -m "The seed keeps the Gantry Position Guessing Game at status \"archived\" (the schema's existing third status) and never publishes it; a row published by an earlier seed flips in place. Its row, versions, attempts and files stay; every student-facing read already requires \"published\". docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 2." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git -C "$WT" show --stat --oneline HEAD | tail -4
```

Expected: 3 files changed.

---

### Task 2: The Simulator page shows only the center

**Files:**

- Modify (whole file): `apps/web/src/routes/(app)/simulator/+page.server.ts`.
- Modify (whole file): `apps/web/src/routes/(app)/simulator/+page.svelte`.
- Modify: `apps/web/e2e/simulator.e2e.ts`. There are two anchors:
  - the header line ` * a student enters the simulator hub from any subject page's live Simulator entry, drives a`;
  - the line `await expect(studentPage.getByTestId('simulator-entry')).toBeVisible();`.

  Both are outside Task 1's two regions.

**Interfaces:**

- **Consumes:**
  - `GET /api/v1/activities/by-sdk-slug/sim-hub-qa` → `SdkSlugOut { activity_id, subject_slug, completion_only, max_score }`;
  - `apiFetch(event: RequestEvent, path: string): Promise<Response>` from `#lib/server/api.js`;
  - `Card` (`as?: 'div' | 'section' | 'article' | 'li'`), `Icon`, `PageHeader` (`title`, `subtitle?`) from `#lib/ui`;
  - `resolve` from `$app/paths`.
- **Produces:**
  - `load` returns `{ hub: SimulatorEntry }`, where `export type SimulatorEntry = { slug: string; id: string } | null` is unchanged.
  - `PageData` has `hub` only.
  - In the DOM, `<main>` holds exactly one `li`, the center's card. Its link `a[data-testid="simulator-entry"]` has the text "Enter the radiation oncology center".
  - The test ids `console-entry` and `gantry-entry` no longer exist.

- [ ] **Step 1 (stack): Start the scratch e2e stack.** It uses the worktree's code, so the API seeds with Task 1's change.

```bash
lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | grep -E ':(8080|5173|5442|9000|8025|1025) ' || echo ports-free
```

Expected: `ports-free`. If anything else prints, stop and report. Do not stop the stack that holds the ports.

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
mkdir -p "$SCR"
cat > "$SCR/local-stack.env" <<'EOF'
POSTGRES_USER=rtapps
POSTGRES_PASSWORD=rtlocal-db
POSTGRES_DB=rtapps
DATABASE_URL=postgresql+asyncpg://rtapps:rtlocal-db@db:5432/rtapps
SESSION_SECRET=rtlocal-session-secret-for-a-scratch-stack-only
MINIO_ROOT_USER=rtlocal
MINIO_ROOT_PASSWORD=rtlocal-storage
S3_ENDPOINT=http://storage:9000
S3_ACCESS_KEY=rtlocal
S3_SECRET_KEY=rtlocal-storage
S3_BUCKET=rtapps-media
PUBLIC_ORIGIN=http://localhost:8080
ENV=dev
API_INTERNAL_URL=http://api:8000
ORIGIN=http://localhost:8080
EOF
cat > "$SCR/dc.sh" <<EOF
#!/bin/bash
exec docker compose -p rtlocal -f "$WT/infra/compose.yaml" --env-file "$SCR/local-stack.env" "\$@"
EOF
bash "$SCR/dc.sh" up -d --build
bash "$SCR/dc.sh" up --wait --wait-timeout 600 proxy web api
bash "$SCR/dc.sh" exec -T api uv run python -m app.seed
```

Expected:

- `up --wait` ends with `Container rtlocal-proxy-1 Healthy` or `Running`, and likewise for `web` and `api`. A cold build takes several minutes, because the web container runs `pnpm install` and `pnpm build:arcade`.
- The seed prints one line starting `seeded:`.

`dc.sh` exists because the shell is zsh, which does not word-split a command held in a variable.

- [ ] **Step 2: The failing e2e assertion.** In `apps/web/e2e/simulator.e2e.ts`, the header. Old:

```ts
 * a student enters the simulator hub from any subject page's live Simulator entry, drives a
```

New:

```ts
 * a student enters the simulator hub from the Simulator page's one card (the center), drives a
```

The first serial test. Old:

```ts
await expect(studentPage.getByTestId("simulator-entry")).toBeVisible();
```

New:

```ts
await expect(studentPage.getByTestId("simulator-entry")).toBeVisible();
// One card since 2026-11-11: the LINAC/CT simulators are reached through the center's
// doors, and the gantry game is archived.
await expect(studentPage.getByRole("main").getByRole("listitem")).toHaveCount(
  1,
);
await expect(studentPage.getByText("press E at the door")).toBeVisible();
```

- [ ] **Step 3 (stack): Run it; expect FAIL.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/web" && pnpm exec playwright test e2e/simulator.e2e.ts --project=chromium 2>&1 | tail -25
```

Expected:

- `1 failed`: the first serial test, at `toHaveCount(1)` with `Expected: 1` and `Received: 3`.
- `1 did not run`: the second serial test, skipped because the serial group failed.
- `3 passed`: the two setup sign-ins and the signed-out test.

If Playwright reports a missing browser, run `pnpm exec playwright install chromium` and re-run.

- [ ] **Step 4: Write `apps/web/src/routes/(app)/simulator/+page.server.ts`** (whole file):

```ts
/**
 * What this file does: SSR `load` for `(app)/simulator`. Resolves the player route params of
 * the page's one entry, the radiation oncology center (the sim-hub activity), so the page can
 * link straight to its player.
 *
 * Used here and why: the simulators are external activities addressed by stable names, never
 * by embedded UUIDs (plan 4c): the hub carries an `sdk_slug`, resolved through
 * `GET /activities/by-sdk-slug/{slug}`. The lookup is best-effort: a 404 (not seeded,
 * unpublished) or a network failure leaves the entry `null` and the page shows its "coming
 * soon" placeholder, so a missing simulator never breaks the page. The LINAC/CT console and
 * gantry game lookups went on 2026-11-11 (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md,
 * PR 2): the LINAC/CT simulators are reached through the center's doors, and the gantry game is
 * archived.
 *
 * How it fits the project: `(app)/+layout.server.ts` guarantees a signed-in user. The entry
 * links to `(app)/subjects/[slug]/activities/[id]`, the same player route as the Games shelf.
 *
 * Works with: `#lib/server/api` (`apiFetch`), `@rtapps/api-client` (`SdkSlugOut`).
 * Used by: `+page.svelte` (this route); driven by `apps/web/e2e/simulator.e2e.ts`,
 * `long-tail.e2e.ts` and `ui.e2e.ts`.
 */
import type { RequestEvent } from "@sveltejs/kit";
import { apiFetch } from "#lib/server/api.js";
import type { components } from "@rtapps/api-client";
import type { PageServerLoad } from "./$types";

/** Player route params for one simulator entry, or null when it does not resolve. */
export type SimulatorEntry = { slug: string; id: string } | null;

async function resolveEntry(
  event: RequestEvent,
  path: string,
): Promise<SimulatorEntry> {
  try {
    const res = await apiFetch(event, path);
    if (!res.ok) return null;
    const info: components["schemas"]["SdkSlugOut"] = await res.json();
    return { slug: info.subject_slug, id: info.activity_id };
  } catch {
    // Best-effort by contract: a network-level failure degrades to the placeholder.
    return null;
  }
}

export const load: PageServerLoad = async (event) => {
  const hub = await resolveEntry(event, "/activities/by-sdk-slug/sim-hub-qa");
  return { hub };
};
```

- [ ] **Step 5: Write `apps/web/src/routes/(app)/simulator/+page.svelte`** (whole file). The `<style>` block is unchanged. One card in the same `.entries` grid keeps the restyled look and width.

```svelte
<!--
	What this file does: the Simulator page at `(app)/simulator` — one card, the radiation
	oncology center, with an entry link into its player, or a disabled "coming soon" button when
	`load` could not resolve it. The LINAC and CT simulators are inside the center, behind its
	doors, so they have no card of their own.

	Used here and why: Svelte 5 runes (`$props()`); `resolve()` for every href per
	`svelte/no-navigation-without-resolve`; the shared `PageHeader`, `Card` and `Icon` kit
	(docs/specs/2026-10-01-ui-restyle-design.md). The hub entry keeps `data-testid="simulator-entry"`
	and its "Enter the radiation oncology center" text, which the e2e specs drive.

	How it fits the project: the simulators used to sit in a "Simulator" section on every subject
	page; the owner moved them to their own tab (2026-10-06) because they are not tied to a
	subject. On 2026-11-11 the LINAC/CT console and gantry game cards went
	(docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 2): the LINAC/CT simulators are
	reached through the center's doors, and the gantry game is archived. The link opens
	`(app)/subjects/[slug]/activities/[id]`, the same player route the Games shelf uses, so
	attempts and SDK scoring are unchanged.

	Works with: `$app/paths`, `#lib/ui/*`, `./+page.server.ts` (`hub`).
	Used by: `AppShell.svelte`'s "Simulator" nav link; `apps/web/e2e/simulator.e2e.ts`,
	`long-tail.e2e.ts`, `ui.e2e.ts`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Card from '#lib/ui/Card.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Simulator — RTTLearn</title>
</svelte:head>

<PageHeader
	title="Simulator"
	subtitle="Practise in a virtual radiation oncology center, with the LINAC and CT simulators inside it."
/>

<ul class="entries">
	<Card as="li">
		<h2><Icon icon={Building2} size={22} />Radiation oncology center</h2>
		<p>
			Walk the clinic: the lobby, the CT simulator, the treatment vaults and the control room.
			Explore on your own and talk to the staff, then run the QA walkthrough.
		</p>
		<p>
			The LINAC and CT simulators are inside the center: walk to the LINAC Control Area or
			the CT Simulator Room and press E at the door.
		</p>
		{#if data.hub}
			<a
				class="entry"
				href={resolve('/(app)/subjects/[slug]/activities/[id]', data.hub)}
				data-testid="simulator-entry">Enter the radiation oncology center</a
			>
		{:else}
			<button disabled title="The RT simulator arrives in a future update"
				>Enter the simulator — coming soon</button
			>
		{/if}
	</Card>
</ul>

<style>
	.entries {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-lg);
	}
	p {
		color: var(--text-muted);
	}
	/* A link styled as the primary button (the kit's Button renders a <button>). */
	.entry {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-height);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		background: var(--accent);
		color: var(--accent-contrast);
		font-weight: 600;
		text-decoration: none;
	}
	.entry:hover {
		background: var(--accent-strong);
		border-color: var(--accent-strong);
		color: var(--accent-contrast);
	}
</style>
```

- [ ] **Step 6 (stack): Run it; expect PASS.** The web container's Vite dev server picks up the edits through the bind mount.

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/web" && pnpm exec playwright test e2e/simulator.e2e.ts --project=chromium 2>&1 | tail -8
```

Expected: `5 passed`. That covers both setup sign-ins, all three simulator tests, and Task 1's Games-shelf assertion in the second serial test.

- If the first test still receives 3 list items, the dev server did not reload. Run `bash "$SCR/dc.sh" restart web`, then `bash "$SCR/dc.sh" up --wait --wait-timeout 600 web` (with `SCR` set as above), and re-run.
- If the Games-shelf assertion fails, the stack's seed did not archive the row. Check that `$WT/apps/api/app/seed.py` has Task 1's change, re-run the seed command from Step 1, and re-run.

- [ ] **Step 7: Checks.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
cd "$WT/apps/web" && pnpm exec prettier --write "src/routes/(app)/simulator/+page.svelte" "src/routes/(app)/simulator/+page.server.ts" e2e/simulator.e2e.ts && pnpm exec eslint "src/routes/(app)/simulator/+page.svelte" "src/routes/(app)/simulator/+page.server.ts" e2e/simulator.e2e.ts
pnpm check 2>&1 | grep "svelte-check found"; cat "$SCR/check-baseline.txt"
grep -c 'data-testid=' "src/routes/(app)/simulator/+page.svelte"
```

Expected:

- eslint prints nothing.
- The two `svelte-check found 0 errors and N warnings` lines match. A new warning or any error is a failure. In particular, no unused-import warning for `Monitor` or `RotateCw`.
- The grep prints `1`.

- [ ] **Step 8: Commit.** Leave the stack up for Task 4.

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT" && git add "apps/web/src/routes/(app)/simulator/+page.svelte" "apps/web/src/routes/(app)/simulator/+page.server.ts" apps/web/e2e/simulator.e2e.ts && git commit -m "feat(simulator): the Simulator page shows only the center" -m "The LINAC/CT console and gantry game cards and their lookups go; the center's card says the LINAC and CT simulators are inside it (walk to the LINAC Control Area or the CT Simulator Room and press E at the door). data-testid=\"simulator-entry\" stays. e2e: one card on the page. docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 2." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git -C "$WT" show --stat --oneline HEAD | tail -4
```

Expected: 3 files changed.

---

### Task 3: Architecture doc

**Files:**

- Modify: `docs/03-architecture.md` §6.6 "The simulator world". The anchor is the end of the v0.9.0 paragraph, `…re-arming on every new QA launch and on lab reset (#73).`

**Interfaces:** none.

- [ ] **Step 1: Confirm the anchor is unique.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
grep -c "on lab reset (#73)." "$WT/docs/03-architecture.md"
```

Expected: `1`.

- [ ] **Step 2: Add the paragraph.** Old:

```markdown
The hub's QA verdict buttons now latch — one verdict per scenario — re-arming on every new QA launch and on lab reset (#73).
```

New (the old line, a blank line, then the new paragraph):

```markdown
The hub's QA verdict buttons now latch — one verdict per scenario — re-arming on every new QA launch and on lab reset (#73).

**One simulator entry (2026-11-11, `docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md` PR 2).** The Simulator tab (`(app)/simulator`) shows one card, the center (`sim-hub-qa`, resolved through `by-sdk-slug`). The LINAC and CT simulators have no card of their own: students reach them through the hub's LINAC Control Area, CT Control Room and CT Simulator Room doors (`ROOM_APP_DOORS`), and the console emulator through the Learning Commons door. Their activities ("Treatment delivery", "CT simulation", "Treatment console") stay published, stay on the Treatment Delivery Procedures Games shelf and keep recording their own completions. The gantry position game (`arcade_slug` `gantry-game`) is archived: `app/seed.py` keeps its activity at `status` `archived` — the third value of the existing `draft`/`published`/`archived` CHECK set, used here for the first time — and never publishes it; a row published by an earlier seed is flipped in place on the next seed. Every student-facing read requires `published` (`GET /subjects`, `GET /subjects/{slug}`, both slug resolvers, `GET /activities/{id}`, starting an attempt), and so do the educator cohort overview's activity table and its stats page, so the game is off the Games shelf and cannot be played. Its activity row, content versions, attempts and rollups are kept and still appear in a student's own results and on the educator's per-student page; its files stay in `apps/web/arcade/gantry-game/`.
```

Do not run prettier on this file (see Global Constraints).

- [ ] **Step 3: Check.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
git -C "$WT" diff --stat -- docs/03-architecture.md
```

Expected: `1 file changed, 2 insertions(+)`.

- [ ] **Step 4: Commit.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT" && git add docs/03-architecture.md && git commit -m "docs(architecture): one simulator entry; the gantry game is archived" -m "Section 6.6: the Simulator tab shows only the center, the LINAC/CT simulators are reached through its doors, and what the archived status hides and keeps." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Final verification and PR

**Files:** none changed. Only the PR body goes in `$SCR`.

**Interfaces:** none.

- [ ] **Step 1: The branch touches exactly the six files, and no hub code.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
git -C "$WT" diff --name-only main...HEAD
git -C "$WT" diff --name-only main...HEAD -- apps/web/arcade apps/web/arcade-src apps/web/scripts apps/api/app/content packages | wc -l
git -C "$WT" status --short
```

Expected:

- The first command lists exactly these six files:
  - `apps/api/app/seed.py`
  - `apps/api/tests/test_seed.py`
  - `apps/web/e2e/simulator.e2e.ts`
  - `apps/web/src/routes/(app)/simulator/+page.server.ts`
  - `apps/web/src/routes/(app)/simulator/+page.svelte`
  - `docs/03-architecture.md`
- The second command prints `0`.
- `status` prints nothing. The generated `arcade/sim-hub`, `arcade/linac-ct`, `test-results`, `playwright-report` and `e2e/.auth` are gitignored.

- [ ] **Step 2: API.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
cd "$WT/apps/api" && uv run pytest tests/test_seed.py tests/test_seed_arcade_dirs.py tests/test_external_activity.py tests/test_content_routes.py -q -p no:cacheprovider --no-cov 2>&1 | tail -1
uv run ruff check app/seed.py tests/test_seed.py && uv run ruff format --check app/seed.py tests/test_seed.py && uv run mypy app
```

Expected:

- `68 passed`;
- `All checks passed!`;
- `2 files already formatted`;
- `Success: no issues found in … source files`.

CI's api job runs the full API suite.

- [ ] **Step 3: Web.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
cd "$WT/apps/web" && pnpm exec prettier --check . && pnpm exec eslint "src/routes/(app)/simulator/+page.svelte" "src/routes/(app)/simulator/+page.server.ts" e2e/simulator.e2e.ts
pnpm check 2>&1 | grep "svelte-check found"; cat "$SCR/check-baseline.txt"
```

Expected:

- prettier prints `All matched files use Prettier code style!`;
- eslint prints nothing;
- the two `svelte-check found 0 errors and N warnings` lines match.

- [ ] **Step 4 (stack): e2e for the touched spec and the page's axe scan.**

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
bash "$SCR/dc.sh" exec -T api uv run python -m app.seed
bash "$SCR/dc.sh" exec -T db psql -U rtapps -d rtapps -tAc "select status from activity where kind = 'external' and title in ('Gantry Position Guessing Game', 'Treatment delivery', 'CT simulation', 'Treatment console') order by title"
cd "$WT/apps/web" && pnpm exec playwright test e2e/simulator.e2e.ts --project=chromium 2>&1 | tail -4
pnpm exec playwright test e2e/ui.e2e.ts --project=chromium -g "student pages are accessible" 2>&1 | tail -4
```

Expected:

- The seed re-run prints a `seeded:` line, and the archived row stays archived.
- psql prints `published`, `archived`, `published`, `published`, in title order: CT simulation, Gantry Position Guessing Game, Treatment console, Treatment delivery.
- The simulator spec prints `5 passed`.
- The ui spec prints `3 passed` (2 setup and the student pages scan, which includes `/simulator`).

`long-tail.e2e.ts` uses only `simulator-entry`, which is unchanged. It and the other projects (mobile-360, firefox, webkit) run in CI's e2e job.

- [ ] **Step 5 (stack): Take the scratch stack down.**

```bash
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
bash "$SCR/dc.sh" down -v
docker ps --filter label=com.docker.compose.project=rtlocal -q | wc -l
```

Expected:

- `Container rtlocal-… Removed` and `Volume rtlocal_… Removed` lines, then `0`.
- Leave the `rtapps-testdb` container running.
- The files under `$SCR` were created by this plan and may stay.

- [ ] **Step 6 (controller): Push and open the PR.** Commit and push are pre-authorised for this repo.

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-worktrees/merge-page
SCR=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/merge-page
cat > "$SCR/pr-body.md" <<'EOF'
## Summary

PR 2 of `docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md` (plan: `docs/plans/2026-11-11-simulator-merge.md`).

- The Simulator page shows one card, the radiation oncology center. Its copy says the LINAC and CT simulators are inside it: walk to the LINAC Control Area or the CT Simulator Room and press E at the door. The console and gantry cards and their lookups are gone; `data-testid="simulator-entry"` stays.
- The Gantry Position Guessing Game is archived. The seed keeps it at status `archived` (the schema's existing third status) and never publishes it; a row published by an earlier seed flips in place. Every student-facing read already requires `published`, so it is off the Games shelf, the slug resolvers and the player route. Its row, versions, attempts and files (`apps/web/arcade/gantry-game/`) stay.
- "Treatment delivery", "CT simulation" and "Treatment console" are unchanged and stay on the Treatment Delivery Procedures shelf.
- `docs/03-architecture.md` §6.6 updated.

No hub code changes. "Back to the door you left from" is in the menu PR (task 1e).

## After merge

- `test`: re-run the seed after the deploy (`docs/06-operations.md`, "First deploy on `test`") to archive the row there.
- prod: the seed refuses prod. If prod has the gantry row, archive it by hand (owner's call).

## Test plan

- [x] `uv run pytest tests/test_seed.py tests/test_seed_arcade_dirs.py tests/test_external_activity.py tests/test_content_routes.py` (68 passed): fresh seed creates the game archived; an already-published row with an attempt flips in place, keeps the attempt, and 404s or drops out of every student read
- [x] ruff, ruff format, mypy
- [x] `pnpm check`, `prettier --check .`, eslint on the touched files
- [x] Local scratch stack: `simulator.e2e.ts` (one card; no gantry link on the Games shelf) and the `ui.e2e.ts` student-pages axe scan, chromium
- [ ] CI e2e (all projects)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
cd "$WT" && git push -u origin feat/simulator-merge
gh pr create --base main --head feat/simulator-merge --title "feat(simulator): one simulator entry; archive the gantry game" --body-file "$SCR/pr-body.md"
```

Expected: the push sets the upstream, and `gh` prints the PR URL. If the stack steps were skipped (finding 9), change the "Local scratch stack" line to `- [ ] e2e: run by CI only` before creating the PR.

---

## Self-review

**Spec coverage (PR 2 and the brief):**

| Requirement                                                                                                                 | Where                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulator page: only the center's card                                                                                      | Task 2 Steps 4–5 (`load` returns `{ hub }`; one `Card`)                                                                                       |
| Copy: LINAC and CT are inside the center, "walk to the LINAC Control Area or the CT Simulator Room and press E at the door" | Task 2 Step 5 (second paragraph); e2e `getByText('press E at the door')`                                                                      |
| `linacConsole` and `gantry` lookups and cards go, with unused imports                                                       | Task 2 Steps 4–5 (`Monitor`, `RotateCw` removed); Step 7 `pnpm check` and eslint                                                              |
| `data-testid="simulator-entry"` stays                                                                                       | Task 2 Step 5; grep count `1`; all e2e entry clicks unchanged                                                                                 |
| Matches the restyled page's components and style                                                                            | Task 2 Step 5: same `PageHeader`/`Card`/`Icon`, same `.entries` grid and `<style>`                                                            |
| Gantry archived, existing row updated idempotently                                                                          | Task 1 Step 5; test `…archives_a_published_gantry_game…` (flip in place, one row, same version); the module's seed-twice fixture (idempotent) |
| Fresh seed creates it unpublished                                                                                           | Task 1 Step 3, `test_seed_batch_3_gantry_position_guessing_game` (`archived`, no version)                                                     |
| What unpublished hides: Games shelf, subject lists, by-arcade-slug, player                                                  | Findings 2; Task 1 test (API); Task 1 Step 8 e2e (web shelf)                                                                                  |
| Past attempts kept                                                                                                          | Task 1 test (`kept == 1`, listed in `/me/results`); Findings 3                                                                                |
| Existing mechanism preferred                                                                                                | Findings 1: `archived` status, no admin unpublish UI exists                                                                                   |
| `apps/web/arcade/gantry-game/` stays                                                                                        | Global Constraints; Task 4 Step 1 (`0` files under `apps/web/arcade`)                                                                         |
| LINAC/CT and console unchanged and listed                                                                                   | No edit to their entries; Task 1 test asserts all three on the shelf; Task 4 Step 4 psql                                                      |
| Docs                                                                                                                        | Task 3                                                                                                                                        |
| Verification: pytest, `pnpm check`, prettier, e2e                                                                           | Task 4 Steps 2–4; CI e2e for everything else                                                                                                  |
| Back to the door / round trip                                                                                               | Not here: PR 1 task 1e (common brief)                                                                                                         |
| Hub checks                                                                                                                  | Not run: no hub file changes (Task 4 Step 1); CI runs them unchanged                                                                          |

**Placeholder scan:**

- No TBD, no "similar to", and no step without its exact text or command.
- "N" in the `svelte-check` lines is the recorded baseline, compared from `$SCR/check-baseline.txt`, not left to guess.
- "…" in expected outputs stands only for timings, counts or names the tools print.

**Type and name consistency:**

- **API names:** `SEED_PASSWORD`, `SeedSummary`, `seed`, `publish_activity(db, activity, author, change_note)`, `Attempt(user_id, activity_id, content_version_id, status, score, max_score, percent, submitted_at)` and `make_client(app, db)` all match the code read at `b061b7d`.
- **Status and test names:** the status string is `"archived"` everywhere: the seed, both tests, the docs and the psql check. The test names are the same in Steps 3, 4 and 6.
- **Web names:** `SimulatorEntry` and `resolveEntry` are unchanged. `PageData.hub` is the only field the page reads.
- **e2e ids:** the test ids used in e2e (`simulator-entry`) exist. The removed ones (`console-entry`, `gantry-entry`) are referenced nowhere else.
