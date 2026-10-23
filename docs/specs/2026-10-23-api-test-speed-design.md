# API test suite speed-up: design

**Date:** 2026-10-23. **Status:** approved by the owner ("Option A + parallel later").

## Why

The API suite is the slowest check on every PR:
- In CI, the `api` job's pytest step takes 718 s, while every other job finishes in 6 min or less.
- Locally, the full suite takes 601 s.

Measured with `pytest --durations=0` against a throwaway Postgres 18:

| | Time |
|---|---|
| Whole suite (343 tests) | 590 s measured, 601 s wall |
| `tests/test_seed.py` (43 tests) | **533 s** |
| Every other file | ≤ 8 s each |

Each `test_seed.py` test takes 13–16 s because:
- almost every test calls `seed()` twice (create, then "a second run duplicates nothing"), about 80 full seed runs in all;
- one `seed()` call takes about 6.2 s.

cProfile of one call:
- about 3.0 s is `validate_prose`, which checks about 1,000 ProseMirror documents against the closed schema with an already-cached `jsonschema` validator;
- about 2.9 s is database work;
- no step is duplicated (`_body_is_prose` and `_prose` are one validation, not two).

So the cost is the repetition, not a slow seed.

## Goal

- `tests/test_seed.py` runs in **under 60 s** locally, down from 533 s. That puts the suite at about 1.5 min locally, and should bring CI's `api` job to about 2–3 min.
- e2e (about 6 min) then becomes the longest PR check, roughly halving every PR's wait.
- The same 43 test names keep passing, and no assertion is dropped.

## Options considered

1. **Seed once per file and share it (chosen).** Test-only change, no new packages, removes the repeated work.
2. **Run tests in parallel (`pytest-xdist`).**
   - Costs a new dev dependency and a separate database per worker, and the repeated work is still done.
   - The owner asked to look at this later, measured after option 1 lands. It is a follow-up issue, not part of this change.
3. **Make `seed()` faster** (for example, a faster JSON Schema library). It changes production validation code for a test-speed gain, and halves the time at best. Rejected.

## Design

Changes are in `apps/api/tests/test_seed.py`, plus one test moved to a new `apps/api/tests/test_seed_arcade_dirs.py` (see below). `conftest.py` and app code are unchanged.

### Shared seeded state (module scope)

- **A module-scoped async fixture `seeded`:**
  - depends on `migrated_db` and `settings`;
  - opens its own engine and one connection, and begins an outer transaction;
  - runs `seed()` twice with a session bound to that connection (`join_transaction_mode="create_savepoint"`, as in `conftest.py`);
  - between the two calls, records the `Activity` row count that `test_seed_is_idempotent` compares today;
  - yields the connection, both `SeedSummary` results and that count;
  - at module teardown, rolls back the outer transaction and disposes the engine.

  Nothing it seeds outlives the module, so every other test file still starts from an empty, migrated database.
- **A function-scoped async fixture named `db`, which overrides the conftest's `db` for this module only.** Test bodies keep their existing `db.` calls, so the diff stays small. It:
  - begins a SAVEPOINT (`begin_nested()`) on the shared connection;
  - yields a fresh `AsyncSession` bound to it, with `create_savepoint` mode and `expire_on_commit=False`;
  - after the test, closes the session and rolls the SAVEPOINT back.

  Anything a test changes (a deleted attempt, an edited config, a login's session row) is undone before the next test.
- The module runs on one event loop:
  - `pytestmark = pytest.mark.asyncio(loop_scope="module")`;
  - both fixtures are declared with `loop_scope="module"`.

  This is required because asyncpg connections are bound to the loop that created them (pytest-asyncio 1.4 supports it).
- **`test_seed_simulator_arcade_directories_exist_on_disk` moves, unchanged, to `tests/test_seed_arcade_dirs.py`.** It is the file's only non-async test. pytest-asyncio 1.4 warns about a non-async test under a module-wide asyncio mark ("marked with '@pytest.mark.asyncio' but it is not an async function"). It touches no database.
- No test in the file uses the conftest's `client` or `engine` fixtures:
  - they open a second connection on another loop;
  - a write from that second connection could block on the shared transaction's row locks.

  `test_seed_users_can_log_in` builds its client inside the test with conftest's `make_client(app, db)`. The conftest `app` fixture is a plain function, so it is safe on any loop.

### What each test does after the change

- **Read-only checks** (`test_seed_creates_*` for each activity, `test_seed_batch_*`, `test_seed_creates_published_mu_calculator`, `test_seed_creates_scatter_and_wedge_tables`, `test_seed_creates_six_practice_calculators`, `test_seed_authoring_queue_is_non_empty`, `test_seed_sdk_slug_unique_across_published_externals`):
  - drop their own `seed()` calls;
  - keep every assertion, run against the shared state, which was already seeded twice;
  - "exactly one copy" counts stay as they are.
- **Tests that assert per-call results:**
  - `test_seed_is_idempotent` reads `first`, `second` and the between-call activity count from `seeded`.
  - `test_seed_cohort_students_and_results` reads `first` and `second` from `seeded`.
  - Their assertions are unchanged.
- **Login:** `test_seed_users_can_log_in` logs in against the shared state, using the client described above.
- **Tests that change data, then re-run the seed:**
  - `test_seed_partial_rerun_recreates_only_missing_attempt`
  - `test_seed_republishes_mu_calculator_on_data_tables_change`
  - `test_seed_republishes_safety_supervisor_on_config_change`

  Each starts from the shared state, makes its change, and calls `seed()` once more: one run each, down from two. Their assertions are unchanged; the partial re-run still asserts `attempts_created == 1`.
- **Unchanged:** `test_seed_refuses_prod`. It raises before doing any work, and now gets the module's `db`, so no second connection is opened in this module.
- If a test listed as read-only turns out to change data, it moves to the "change data, then re-run the seed" group (one `seed()` call after its change) instead of losing coverage.
- Docstrings that say "re-seeding creates it only once" stay true: the shared state is the result of two `seed()` calls. The module docstring gains a short paragraph on the shared fixture and why.

### The trade-off

- Today, each activity's properties are checked between the first and second seed run. After this change they are checked after both.
- Still caught:
  - a second run that duplicates a row (the count assertions);
  - a second run that changes a property (the property assertions now see the post-rerun state, which is slightly stronger).
- No longer caught: a first run that is wrong and a second run that silently repairs it. Both runs execute the same code, and the republish tests cover "update in place" directly.

## Verification

- **Speed:** `uv run pytest tests/test_seed.py --durations=10` locally. The file finishes in under 60 s; report the number. Full suite: 343 passed, and report the wall time.
- **Isolation:** run the whole file in reverse order by passing every node id in reverse order on the command line. All 43 must pass. This would catch a test whose changes leak into a later one.
- **The tests still catch real bugs.** Mutation checks on app code, temporary and never committed, verified reverted with `git diff --exit-code apps/api/app`:
  1. Make the arcade-games get-or-create always insert. `test_seed_creates_cell_defender` and the other per-game tests must fail on their count assertion.
  2. Make the demo-attempt fill-in recreate every attempt. `test_seed_cohort_students_and_results` / `test_seed_is_idempotent` and the partial re-run test must fail.
- **Other files are unaffected:** after the module, the next file's first test still sees an empty database. The full suite passing in its normal order covers this.
- **Gates:** `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app`, and CI. CI's `--cov-fail-under=70` covers only `app/grading` and `app/auth`, which these tests still exercise through login.

## Follow-up

After this lands, re-measure CI's `api` job. File an issue for parallel test runs (`pytest-xdist`, one database per worker) with the new numbers, so the owner can decide whether the remaining time is worth it.
