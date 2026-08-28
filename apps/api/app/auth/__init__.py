"""Package for authentication and session management.

What this file does: nothing on its own — it groups the modules that implement sign-in.

Used here and why: plain Python package convention; no code, no dependencies.

How it fits the project: contains the user/session models (`models.py`), password hashing
(`passwords.py`), Google OAuth (`google.py`), session issuance and lookup (`sessions.py`),
FastAPI dependencies for the current user and role checks (`deps.py`), request/response
schemas (`schemas.py`), and the `/auth/*` routes (`router.py`). This is the implementation
of the session design in ADR-0002 (`docs/adr/0002-same-origin-proxy-and-cookie-sessions.md`).

Depends on: nothing.
Used by: `app/main.py` mounts `app.auth.router`; `alembic/env.py` imports `app.auth.models`
so Alembic's autogenerate can see the `user`/`identity`/`session` tables.
"""
