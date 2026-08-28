# Multi-stage build for the api's production image (built from the repo root, since it
# needs `packages/schemas/` alongside `apps/api/` — see the build context note below).
#
# What this file does: `base` sets up the uv/python image and env flags shared by both
# later stages; `deps` installs only production dependencies into a venv; `runtime` copies
# that venv plus the app code (no build tools, no dev dependencies) and runs uvicorn as a
# non-root user.
#
# Used here and why: `uv`'s official image + `uv sync --frozen --no-dev` for reproducible,
# lockfile-pinned installs; splitting `deps` from `runtime` keeps build caches and the
# final image from carrying uv's own download/compile cache; a non-root `app` user per
# container security best practice.
#
# How it fits the project: this image is what `infra/compose.yaml` and prod (ADR-0005,
# single-VM Docker Compose) run as the `api` service; it serves the FastAPI app that
# SvelteKit (`web`) and the browser talk to through the Caddy/tunnel proxy.
#
# Depends on: `apps/api/pyproject.toml` + `uv.lock` (dependencies), `apps/api/app`,
# `packages/schemas/prose-doc.schema.json`, `apps/api/alembic.ini`, `apps/api/alembic`,
# `apps/api/seed` (all copied in below). Build context must be the repo root.
# Used by: `infra/compose.yaml` (`dockerfile: apps/api/Dockerfile`); the `api`/`e2e` jobs
# in `.github/workflows/pr.yml` (build the image, then smoke-test and run it in compose).

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# deps: resolve and install only production dependencies (--no-dev) from the locked,
# frozen lockfile (--frozen — never re-resolves), cached across builds via the uv cache mount.
FROM base AS deps
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

# runtime: the actual served image — app code, migrations, and seed script, running as a
# dedicated non-root user with no build tooling present.
FROM base AS runtime
RUN useradd --create-home --uid 10001 app
COPY --from=deps /app/.venv /app/.venv
COPY apps/api/app ./app
COPY packages/schemas/prose-doc.schema.json /app/app/schemas/prose-doc.schema.json
COPY apps/api/alembic.ini ./
COPY apps/api/alembic ./alembic
COPY apps/api/seed ./seed
ENV PATH="/app/.venv/bin:$PATH"
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
