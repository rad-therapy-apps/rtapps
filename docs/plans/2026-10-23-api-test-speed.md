# API Test Speed-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/api/tests/test_seed.py` runs `seed()` twice per module instead of about 80 times, taking that file from 533 s to under 60 s, with every test and assertion kept.

**Architecture:**
- A module-scoped fixture seeds once, inside one never-committed transaction.
- A module-local `db` fixture overrides conftest's `db`. It gives each test a fresh session inside a SAVEPOINT that is rolled back afterwards.
- Read-only tests drop their own `seed()` calls. Tests that change data then re-run `seed()` once.
- The file's only non-async test moves to its own file.

Spec: `docs/specs/2026-10-23-api-test-speed-design.md`.

**Tech Stack:** pytest 9.1, pytest-asyncio 1.4 (auto mode, `loop_scope`), SQLAlchemy asyncio + asyncpg, Postgres 18.

## Global Constraints

- **Files:**
  - Modify only `apps/api/tests/test_seed.py`.
  - Create only `apps/api/tests/test_seed_arcade_dirs.py`.
  - No change to `conftest.py`, app code, `pyproject.toml` or `uv.lock`. No new packages.
- **Tests:**
  - The same 43 test names keep passing: 42 in `test_seed.py`, plus 1 moved verbatim to `test_seed_arcade_dirs.py`.
  - No assertion is removed or weakened.
  - pytest prints no new warnings.
- **Mutation edits** to `apps/api/app/` (Step 8) are temporary and never committed. `git diff --exit-code apps/api/app` must succeed before the commit.
- **Database:**
  - Tests use the throwaway Postgres on `127.0.0.1:5433`, Docker container `rtapps-testdb`. It is already running. If `docker ps --filter name=rtapps-testdb -q` prints nothing, start it with `docker run -d --name rtapps-testdb -p 127.0.0.1:5433:5432 -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test postgres:18`.
  - Do not remove the container.
- **Off-limits:** never read, create or edit any file whose name starts with `.env`. Never `git add` anything under `.superpowers/`.
- **Git:** stay on branch `perf/api-test-speed`. Never switch branches, push, stash or force.
- **Python tooling:** run Python only through `uv run` (from `apps/api`).
- **Commit trailer:** `Co-Authored-By: <your model name> <noreply@anthropic.com>`.

---

### Task 1: Seed once per module in test_seed.py

**Files:**
- Modify: `apps/api/tests/test_seed.py` (imports and module docstring at the top; every test function)
- Create: `apps/api/tests/test_seed_arcade_dirs.py`

**Interfaces:**
- Consumes, from `apps/api/tests/conftest.py`:
  - `TEST_DATABASE_URL: str`;
  - `make_client(app: FastAPI, db: AsyncSession)`, an async context manager yielding an `httpx.AsyncClient`;
  - fixtures `migrated_db` (session, sync), `settings` (session, sync, `Settings`) and `app` (function, sync, `FastAPI`).
- Consumes, from `app.seed`:
  - `seed(db: AsyncSession, settings: Settings) -> SeedSummary`. It does not commit, and raises `RuntimeError` for `env == "prod"`.
  - `SeedSummary`, a dataclass: `users_created, lessons_imported, activities_imported, students_created, attempts_created, quiz_attempts_created: int`, `cohort_created: bool`.
- Produces, module-local in `test_seed.py`: dataclass `Seeded`, fixture `seeded` (module scope) and fixture `db` (function scope, overriding conftest's).

- [ ] **Step 1: Confirm the starting point.**

```bash
cd apps/api
uv run pytest tests/test_seed.py --collect-only -q -p no:cacheprovider 2>/dev/null | tail -1
```

Expected: `43 tests collected`.

- [ ] **Step 2: Imports, module mark, shared fixtures.**
  - In `tests/test_seed.py`, make the import block read exactly as below. Compared with today:
    - added: `dataclass`, `AsyncIterator`, `pytest_asyncio`, `FastAPI`, `AsyncConnection`/`async_sessionmaker`/`create_async_engine`, `SeedSummary` and `make_client`;
    - removed: `from pathlib import Path` (only the test moved in Step 3 used it) and `from httpx import AsyncClient` (only the old login-test signature used it).

```python
from collections.abc import AsyncIterator
from dataclasses import dataclass

import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.attempts.models import Attempt
from app.attempts.rollup import ActivityResult
from app.auth.models import User
from app.cohorts.models import Cohort, Enrollment
from app.config import Settings
from app.content.activity_models import DataTable, Outcome, QuestionOutcome, Quiz
from app.content.models import Activity, ContentVersion, Lesson, Subject
from app.seed import SeedSummary, seed
from tests.conftest import TEST_DATABASE_URL, make_client
```

  - Directly after the imports, before the first test, add:

```python
# Every test in this module runs on one event loop shared with the module-scoped `seeded`
# fixture below: asyncpg connections belong to the loop that opened them.
pytestmark = pytest.mark.asyncio(loop_scope="module")


@dataclass
class Seeded:
    """What the module-scoped `seeded` fixture leaves for the tests to read."""

    conn: AsyncConnection
    first: SeedSummary
    second: SeedSummary
    # Activity row count captured BETWEEN the two seed() calls, so test_seed_is_idempotent
    # compares a before/after pair instead of one count against itself.
    activities_after_first: int | None


def _session_on(conn: AsyncConnection) -> AsyncSession:
    # Same mode as conftest's `db`: a session.commit() only releases the session's own
    # SAVEPOINT, never the transaction underneath it.
    return async_sessionmaker(
        bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
    )()


@pytest_asyncio.fixture(scope="module", loop_scope="module")
async def seeded(migrated_db: None, settings: Settings) -> AsyncIterator[Seeded]:
    """Run seed() twice, once for the whole module, inside one never-committed transaction
    that is rolled back when the module ends, so other test files still start empty."""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.connect() as conn:
        trans = await conn.begin()
        async with _session_on(conn) as session:
            first = await seed(session, settings)
            activities_after_first = await session.scalar(
                select(func.count()).select_from(Activity)
            )
            second = await seed(session, settings)
            # seed() does not commit. Committing releases the session's SAVEPOINT so the
            # rows stay in `trans`; closing the session without it would roll them back.
            await session.commit()
        yield Seeded(conn, first, second, activities_after_first)
        await trans.rollback()
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="module")
async def db(seeded: Seeded) -> AsyncIterator[AsyncSession]:
    """Overrides conftest's `db` for this module: a fresh session on the shared, already
    twice-seeded connection, inside a SAVEPOINT rolled back after the test, so nothing a
    test changes reaches the next one."""
    savepoint = await seeded.conn.begin_nested()
    async with _session_on(seeded.conn) as session:
        yield session
    await savepoint.rollback()
```

- [ ] **Step 3: Move the one non-async test.**
  - Cut `test_seed_simulator_arcade_directories_exist_on_disk` out of `tests/test_seed.py`: the whole function, docstring and comments, unchanged.
  - Create `tests/test_seed_arcade_dirs.py` with this header and imports, then paste the function below them, byte-for-byte unchanged:

```python
"""What this file tests: the arcade apps the seeded simulator activities point at
(`arcade_slug` in `app.seed`) are present in the repo checkout, so a seeded row never
names a missing app.

Used here and why: plain `pathlib` file checks, no database or fixtures. Kept apart from
`test_seed.py` because every test there shares one module-scoped event loop
(`pytestmark = pytest.mark.asyncio(loop_scope="module")`), and pytest-asyncio warns when
that mark lands on a non-async test.

How it fits the project: protects the plan 4c/4d simulator activities that `make seed`
creates (see `test_seed.py`).

Works with: pytest.
Depends on: `apps/web/arcade-src/` and `apps/web/arcade/` in the repo checkout.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from pathlib import Path
```

- [ ] **Step 4: Convert the tests that read per-call results, log in, or re-run the seed.** Docstrings and all other lines stay unchanged unless listed.
  - **`test_seed_is_idempotent`:**
    - Signature becomes `async def test_seed_is_idempotent(db: AsyncSession, seeded: Seeded) -> None:`.
    - Replace the lines from `first = await seed(db, settings)` through `second = await seed(db, settings)`, including the three-line "Captured BETWEEN" comment, with the block below. Every assertion after it stays unchanged.

```python
    # Both seed() calls ran once for the whole module (the `seeded` fixture), which also
    # captured the activity total between them.
    first, second = seeded.first, seeded.second
    total_activities_first = seeded.activities_after_first
```

  - **`test_seed_users_can_log_in`:** use exactly this, with the docstring unchanged:

```python
async def test_seed_users_can_log_in(app: FastAPI, db: AsyncSession) -> None:
    """The seeded educator and a seeded student account must both be usable through the
    real login endpoint with the documented shared dev password, not just present as
    rows in the database."""
    # Built here, not via conftest's `client` fixture, so the client's requests use this
    # module's shared seeded connection and event loop.
    async with make_client(app, db) as client:
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "educator@example.com", "password": "rtapps-dev-password"},
        )
        assert r.status_code == 200 and r.json()["role"] == "educator"
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "student03@example.com", "password": "rtapps-dev-password"},
        )
        assert r.status_code == 200 and r.json()["role"] == "student"
```


  - **`test_seed_cohort_students_and_results`:**
    - Signature becomes `(db: AsyncSession, seeded: Seeded) -> None`.
    - `first = await seed(db, settings)` becomes `first = seeded.first`.
    - `second = await seed(db, settings)` becomes `second = seeded.second`.
    - Nothing else changes.
  - **`test_seed_partial_rerun_recreates_only_missing_attempt`:**
    - Delete the first `await seed(db, settings)` line, since the module already seeded.
    - Rename `second = await seed(db, settings)` to `rerun = await seed(db, settings)`, and `second.` to `rerun.` in the assertion right after it.
    - Signature unchanged (`db, settings`).
  - **`test_seed_republishes_mu_calculator_on_data_tables_change`** and **`test_seed_republishes_safety_supervisor_on_config_change`:**
    - Delete only the first `await seed(db, settings)` line.
    - Keep the second, which re-runs the seed after the test's own change.
    - Signatures unchanged.
  - **`test_seed_refuses_prod`:** no change. Its `db` now resolves to this module's fixture.

- [ ] **Step 5: Convert the read-only tests.** These 35 tests:
  - `test_seed_creates_published_mu_calculator`
  - `test_seed_creates_scatter_and_wedge_tables`
  - `test_seed_creates_six_practice_calculators`
  - `test_seed_authoring_queue_is_non_empty`
  - `test_seed_sdk_slug_unique_across_published_externals`
  - every other `test_seed_creates_*`
  - every `test_seed_batch_*`

  Apply exactly two edits to each:
  1. Delete every `await seed(db, settings)` line in the body (one or two per test), plus a blank line the deletion leaves doubled.
  2. Change the signature from `(db: AsyncSession, settings: Settings) -> None` to `(db: AsyncSession) -> None`, joining it onto one line when it fits in 100 characters (ruff format decides).

  Every assertion stays, in the same order. Example, before:

```python
async def test_seed_creates_cell_defender(db: AsyncSession, settings: Settings) -> None:
    """...unchanged..."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Cell Defender"))
    assert activity is not None
    ...
    assert subject is not None and subject.slug == "radiation-biology"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Cell Defender")
    )
    assert count == 1
```

  After:

```python
async def test_seed_creates_cell_defender(db: AsyncSession) -> None:
    """...unchanged..."""
    activity = await db.scalar(select(Activity).where(Activity.title == "Cell Defender"))
    assert activity is not None
    ...
    assert subject is not None and subject.slug == "radiation-biology"

    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Cell Defender")
    )
    assert count == 1
```

  - If a test in this group turns out to change data (a `db.add`, `delete(`, attribute assignment on a row, or `flush()` before a check), STOP. Report it instead of converting it: it belongs in Step 4's re-run group.
  - Afterwards, `grep -n "await seed(" tests/test_seed.py` must show exactly 6 lines: 2 in the `seeded` fixture, 1 in each of the 3 re-run tests, and 1 in `test_seed_refuses_prod`.

- [ ] **Step 6: Module docstring.** In `tests/test_seed.py`'s module docstring:
  - Directly after the paragraph that starts `Used here and why:`, add:

```
Why the module shares one seeded database: one seed() call takes about 6 s (it imports and
validates the whole seed corpus), and each test used to run it twice. The module-scoped
`seeded` fixture runs seed() twice, once, inside a transaction that is never committed.
This module's `db` fixture (overriding conftest's) gives each test a fresh session inside
a SAVEPOINT that is rolled back afterwards. Read-only tests assert against that
twice-seeded state. Tests that change data re-run seed() once themselves. The arcade
directory check lives in `test_seed_arcade_dirs.py`.
```

  - Replace the `Depends on:` line's start, ``Depends on: `db`, `client`, `settings` fixtures and `TEST_DATABASE_URL` from`` + ``` `conftest.py`; ```, with:

```
Depends on: `migrated_db`, `settings` and `app` fixtures, `TEST_DATABASE_URL` and `make_client` from
`conftest.py`;
```

  Keep the rest of that sentence (`app.seed.seed`; …) as it is. Re-wrap to the file's existing line width only where needed.

- [ ] **Step 7: Run the file, check speed and isolation.**

```bash
cd apps/api
time uv run pytest tests/test_seed.py tests/test_seed_arcade_dirs.py -q -p no:cacheprovider --durations=5 2>&1 | tail -15
```

Expected:
- `43 passed`, with no `warnings` line in the summary;
- wall time under 60 s. Report the real time and the 5 slowest entries; the `seeded` setup should be the largest.

Then run every test in reverse definition order, to prove no test leaks changes into a later one:

```bash
IDS=$(uv run pytest tests/test_seed.py --collect-only -q -p no:cacheprovider 2>/dev/null | grep '::' | uv run python -I -c 'import sys; print(" ".join(reversed(sys.stdin.read().split())))')
uv run pytest -v -p no:cacheprovider $IDS 2>&1 | grep -E "PASSED|FAILED|ERROR|passed|failed" | sed -n '1p;$p'
```

Expected:
- the first line names `test_seed_refuses_prod`, the last test defined, which proves the order really was reversed;
- the final line reads `42 passed`.

- [ ] **Step 8: Mutation checks (prove the tests still catch bugs).** Each mutation is temporary. Run it, record the result, then restore.

```bash
cd apps/api
# M1: arcade games get-or-create always inserts (duplicates on the second run).
grep -c "        if arcade_activity is None:" app/seed.py   # must print 1
sed -i '' 's/^        if arcade_activity is None:$/        if True:  # MUTATION M1/' app/seed.py
uv run pytest tests/test_seed.py -q -p no:cacheprovider 2>&1 | grep -E "^(FAILED|ERROR)|passed|failed|error" | tail -12
git restore app/seed.py

# M2: Cell Defender seeded with a wrong max_score.
grep -c '"max_score": 5000' app/seed.py                    # must print 1
sed -i '' 's/"max_score": 5000/"max_score": 5001/' app/seed.py
uv run pytest tests/test_seed.py -q -p no:cacheprovider 2>&1 | grep -E "^(FAILED|ERROR)|passed|failed|error" | tail -12
git restore app/seed.py

# M3: demo attempts are never treated as already present (recreated on every run).
grep -c "        if has_attempt is not None:" app/seed.py    # must print 1
sed -i '' 's/^        if has_attempt is not None:$/        if False:  # MUTATION M3/' app/seed.py
uv run pytest tests/test_seed.py -q -p no:cacheprovider 2>&1 | grep -E "^(FAILED|ERROR)|passed|failed|error" | tail -12
git restore app/seed.py

git diff --exit-code app && echo "app/ clean"
```

Expected:
- **M1:** the suite is not green. Either the per-game `count == 1` assertions fail (for example `test_seed_creates_cell_defender`), or the `seeded` setup errors. Report which.
- **M2:** `test_seed_creates_cell_defender` FAILS on its `activity.config == {...}` assertion. This proves the read-only tests really read seeded state.
- **M3:** the suite is not green: `test_seed_cohort_students_and_results` and `test_seed_partial_rerun_recreates_only_missing_attempt` fail, or the setup errors on a unique key. Report which.
- Finally, `app/ clean`.
- If any mutation leaves the suite fully green, STOP and report it: a check has been weakened.

- [ ] **Step 9: Full suite and gates.**

```bash
cd apps/api
uv run ruff check . && uv run ruff format --check . | tail -1 && uv run mypy app | tail -1
time uv run pytest -q -p no:cacheprovider 2>&1 | tail -3
```

Expected:
- ruff `All checks passed!`, format clean, mypy `Success`;
- `343 passed` (same total as before: 42 + 1 moved + 300 others);
- no new warnings. Report the wall time; it was 601 s before.

- [ ] **Step 10: Commit.**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git diff --exit-code apps/api/app && git status --short
git add apps/api/tests/test_seed.py apps/api/tests/test_seed_arcade_dirs.py
git commit -m "test(api): seed once per module in test_seed.py

One seed() call takes about 6 s and almost every seed test ran it twice
(about 80 runs, 533 s of the suite's 590 s). A module-scoped fixture now
runs seed() twice inside one never-committed transaction; a module-local
db fixture gives each test a fresh session in a SAVEPOINT rolled back
afterwards. Read-only tests assert against the twice-seeded state; the
partial re-run and both republish tests re-run seed() once after their
change. The arcade-directory check moves unchanged to
test_seed_arcade_dirs.py (pytest-asyncio warns about a sync test under
the module-wide asyncio mark).

Co-Authored-By: <your model name> <noreply@anthropic.com>"
```

Report:
- Step 1's count;
- Step 7's timing and reverse-order result;
- each mutation's output;
- Step 9's gate outputs and wall time;
- the commit hash.
