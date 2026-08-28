#!/usr/bin/env sh
# Dev container entrypoint for the api service.
#
# What this file does: runs pending Alembic migrations, then execs uvicorn with autoreload.
#
# Used here and why: `alembic upgrade head` here (unlike prod, where migration is a
# separate one-shot deploy step per ADR-0005) so a fresh dev database is always brought to
# the latest schema automatically on container start; `exec` replaces this shell with
# uvicorn so it receives signals directly (correct container shutdown behaviour) and
# `--reload` picks up local code edits without a rebuild.
#
# How it fits the project: the dev-only counterpart to prod's separate migrate-then-deploy
# step; only used when running the api under `docker compose` for local development.
#
# Depends on: `alembic.ini`/`alembic/` (migrations), `app.main:app` (the ASGI app).
# Used by: `infra/compose.yaml`'s dev api service definition (not the production image,
# which instead runs uvicorn directly via the Dockerfile's CMD).
set -e
uv run alembic upgrade head  # dev-only: prod runs this as a separate deploy step (ADR-0005)
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
