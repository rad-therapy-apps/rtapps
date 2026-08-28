# What this file does: defines the documented developer-facing commands for this repo
# (`make dev`, `make test`, etc.) as thin wrappers over docker compose, pnpm, and uv.
# Used here and why: a single entry point so a solo developer (or CI) doesn't need to
# remember the underlying compose/pnpm/uv invocations or their working directories.
# How it fits the project: this is the literal contract documented in
# docs/04-conventions.md §9 ("Local workflow cheat-sheet") — every target listed there
# must exist here with matching behavior.
# Works with: infra/compose.yaml (via $(COMPOSE)), infra/.env.example, pnpm-workspace.yaml
# (pnpm --filter targets), apps/api (uv-run Python tooling), tools/migrate-legacy.
# Used by: developers directly; the `contract` CI job in .github/workflows/pr.yml runs
# `make client` and diffs the result to catch a stale packages/api-client.

# Base compose invocation reused by every target that talks to the dev stack — pins the
# compose file location and loads runtime config from the local, gitignored .env.
COMPOSE := docker compose -f infra/compose.yaml --env-file .env

.PHONY: dev down logs test test-api test-web test-tools lint lint-api lint-web lint-tools e2e client migrate seed prod-config

# Bring up the full dev stack (db, storage, api, web, proxy, mailpit), rebuilding images
# first. Depends on .env existing (see the .env target below).
dev: .env
	$(COMPOSE) up --build

# Stop and remove the dev stack's containers.
down:
	$(COMPOSE) down

# Tail the last 100 lines of every service's logs and keep following.
logs:
	$(COMPOSE) logs -f --tail=100

# Bootstraps a local .env from the committed template on first run; every other target
# that needs it depends on this so `make dev`/`make seed` work without a manual step.
.env:
	cp infra/.env.example .env
	@echo "Created .env from infra/.env.example — edit SESSION_SECRET before deploying anywhere."

# Runs all three test suites (api, web, tools) in sequence.
test: test-api test-web test-tools

# API unit tests; --cov-fail-under=70 fails the build if coverage drops below 70%,
# matching docs/03-architecture.md §11's testing strategy floor.
test-api:
	cd apps/api && uv run pytest --cov-fail-under=70

# Web unit tests (Vitest, run through the pnpm workspace filter).
test-web:
	pnpm --filter web test

# Tests for the standalone legacy-migration tool (not part of the deployed app).
test-tools:
	cd tools/migrate-legacy && uv run pytest -q

# Runs all three linters in sequence.
lint: lint-api lint-web lint-tools

# Python lint/format-check/type-check for the API.
lint-api:
	cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run mypy app

# ESLint + svelte-check for the web app.
lint-web:
	pnpm --filter web lint && pnpm --filter web check

# Same three checks as lint-api, applied to the migration tool's own source tree.
lint-tools:
	cd tools/migrate-legacy && uv run ruff check . && uv run ruff format --check . && uv run mypy src

# Playwright end-to-end tests against the running compose stack.
e2e:
	pnpm --filter web e2e

# Regenerates the typed API client from the live OpenAPI schema, in three steps:
#   1. Export the FastAPI app's current OpenAPI document to JSON (see
#      apps/api/app/openapi_export.py) as the source of truth for the client.
#   2. Generate TypeScript types from that schema into packages/api-client.
#   3. Reformat the generated types file so it matches the repo's prettier config
#      (generators don't respect it) and diffs cleanly.
# The `contract` CI job runs this and fails if the checked-in output differs, so
# packages/api-client can never silently drift from apps/api's actual routes/schemas.
client:
	cd apps/api && uv run python -m app.openapi_export > ../../packages/api-client/openapi.json
	pnpm --filter @rtapps/api-client generate
	pnpm --filter web exec prettier --write ../../packages/api-client/src/schema.d.ts

# Creates a new Alembic migration from the current model state; pass a message with
# `make migrate m="add data_table"`.
migrate:
	cd apps/api && uv run alembic revision --autogenerate -m "$(m)"

# Loads demo data into the running dev stack via the api container (admin, educator,
# cohort, subject with a published lesson/quiz, fake students with attempts).
seed:
	$(COMPOSE) exec api uv run python -m app.seed

# Validates infra/compose.prod.yaml and the Cloudflare Tunnel overlay against the
# committed placeholder env file — catches a broken compose file (bad interpolation,
# invalid `!override`, etc.) without needing real secrets or a VM. Same commands the CI
# `images` job runs (Task 11).
prod-config:
	docker compose -f infra/compose.prod.yaml --env-file infra/prod.env.example config -q
	docker compose -f infra/compose.prod.yaml -f infra/compose.tunnel.yaml --env-file infra/prod.env.example config -q
