"""Top-level package for the RTApps API (FastAPI application).

What this file does: nothing on its own — it only marks `app/` as an importable Python
package. It exists so that submodules can be imported as `app.config`, `app.main`, etc.

Used here and why: plain Python package convention; no code, no dependencies.

How it fits the project: groups the request-handling modules that make up the `api`
container from `docs/03-architecture.md` §3 — configuration, the database session layer,
auth, content, attempts, grading, and the app factory in `app/main.py`.

Depends on: nothing.
Used by: every module under `app/` is imported as part of this package; `alembic/env.py`
and all of `tests/` import from submodules such as `app.main` and `app.db`.
"""
