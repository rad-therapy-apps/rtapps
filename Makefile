COMPOSE := docker compose -f infra/compose.yaml --env-file .env

.PHONY: dev down logs test test-api test-web test-tools lint lint-api lint-web lint-tools e2e client migrate

dev: .env
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=100

.env:
	cp infra/.env.example .env
	@echo "Created .env from infra/.env.example — edit SESSION_SECRET before deploying anywhere."

test: test-api test-web test-tools

test-api:
	cd apps/api && uv run pytest

test-web:
	pnpm --filter web test

test-tools:
	cd tools/migrate-legacy && uv run pytest -q

lint: lint-api lint-web lint-tools

lint-api:
	cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run mypy app

lint-web:
	pnpm --filter web lint && pnpm --filter web check

lint-tools:
	cd tools/migrate-legacy && uv run ruff check . && uv run ruff format --check . && uv run mypy src

e2e:
	pnpm --filter web e2e

client:
	pnpm --filter web client

migrate:
	cd apps/api && uv run alembic revision --autogenerate -m "$(m)"
