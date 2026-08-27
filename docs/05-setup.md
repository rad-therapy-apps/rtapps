# Local setup

## Prerequisites
- Docker Desktop (Compose v2+), Node 24 (`corepack enable` once; on macOS, if `/usr/local/bin` is not writable, `corepack enable --install-directory ~/.local/bin`), Python 3.12 with `uv`.
- `gh` CLI logged in to the `rad-therapy-apps` org (for PRs).

## First run
```bash
git clone git@github.com:rad-therapy-apps/rtapps.git && cd rtapps
make dev                 # creates .env from infra/.env.example, builds and starts everything
```
Open http://localhost:8080 — the status page shows web and API health.
- API docs: http://localhost:8080/api/v1/docs
- MinIO console: http://localhost:9001 (user/password from `.env`)
- Mailpit (outgoing mail in dev): http://localhost:8025

## Day to day
| Command | Does |
|---|---|
| `make dev` / `make down` / `make logs` | start / stop / tail the stack |
| `make test` | API tests (needs `TEST_DATABASE_URL`, see below) + web unit tests |
| `make lint` | ruff, mypy, prettier, eslint, svelte-check |
| `make migrate m="add user table"` | new Alembic revision from model changes |
| `make e2e` | Playwright against the running stack |

### API tests outside compose
The API tests need a PostgreSQL. Either use the compose `db` (`TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps_test` after `createdb rtapps_test`), or a throwaway container:
```bash
docker run -d --name rtapps-test-pg -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test -p 5433:5432 postgres:16
export TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test
cd apps/api && uv run pytest
```
If 5433 is taken on your machine, use another host port and set `TEST_DATABASE_URL` to match — CI uses 5433.

## Layout
See `docs/03-architecture.md` §9. Short version: `apps/api` (FastAPI), `apps/web` (SvelteKit), `infra/` (compose, Caddy), `docs/`.

## Troubleshooting
- **`web` container loops on `pnpm install`** — run `pnpm install` once on the host so `pnpm-lock.yaml` matches, then `make dev` again.
- **`api` unhealthy** — `make logs`; usually the DB isn't ready yet on first boot; it retries for 30 s.
- **Port in use** — 8080 (proxy), 5173 (web), 8000 is internal, 5432 (db), 9000/9001 (MinIO), 8025 (Mailpit).
