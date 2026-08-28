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
| `make seed` | dev accounts + the migrated lessons (idempotent; refuses in prod) |
| `make e2e` | Playwright against the running, seeded stack (`pnpm --filter web exec playwright install chromium` once) |
| `make client` | regenerate `packages/api-client` from the API's OpenAPI (the `contract` CI job fails if it is stale) |
| `make test-tools` / `make lint-tools` | the legacy migration tool (`tools/migrate-legacy`) |

### API tests outside compose
The API tests need a PostgreSQL. Either use the compose `db` (`TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps_test` after `createdb rtapps_test`), or a throwaway container:
```bash
docker run -d --name rtapps-test-pg -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test -p 5433:5432 postgres:16
export TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test
cd apps/api && uv run pytest
```
If 5433 is taken on your machine, use another host port and set `TEST_DATABASE_URL` to match — CI uses 5433.

## Seed data
`make seed` (stack running) creates three accounts, all with password `rtapps-dev-password`: `admin@example.com` (admin), `educator@example.com` (educator), `student@example.com` (student), and imports + publishes the lessons in `apps/api/seed/lessons/`. Safe to re-run; it refuses when `ENV=prod`.

## Migrating legacy lessons
`tools/migrate-legacy` converts a legacy paged lesson (`div.lesson-page` + `lessonCorrectAnswers`) into an import document:
```bash
cd tools/migrate-legacy
uv run migrate-legacy convert /path/to/rtt_e_workbook/Radiation_Biology/RBE_and_OER --out ../../apps/api/seed/lessons --report /tmp/report.json
```
Each page is reported as `converted`, `needs-review` (something was mapped lossily or a knowledge check had no answer key) or `unsupported` (not the paged-lesson pattern). Import with `cd apps/api && uv run python -m app.content.importer ../../apps/api/seed/lessons/<slug>.json` or simply `make seed`.

## Google sign-in (optional)
Email + password works out of the box. To enable "Continue with Google":
1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** of type *Web application*.
2. Add the authorised redirect URI `http://localhost:8080/api/v1/auth/google/callback` (use the real origin in production).
3. Put the client id and secret in `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart the API: `docker compose -f infra/compose.yaml restart api`.

The login page shows the Google button only when `GET /api/v1/auth/providers` reports `{"google": true}`, i.e. when both variables are set. Accounts are linked by verified e-mail: signing in with Google using the address of an existing password account signs into that account.

## Layout
See `docs/03-architecture.md` §9. Short version: `apps/api` (FastAPI), `apps/web` (SvelteKit), `infra/` (compose, Caddy), `docs/`.

## Troubleshooting
- **`web` container loops on `pnpm install`** — run `pnpm install` once on the host so `pnpm-lock.yaml` matches, then `make dev` again.
- **`api` unhealthy** — `make logs`; usually the DB isn't ready yet on first boot; the healthcheck allows ~2.5 minutes (30 s start period + 12 retries × 10 s) before marking it unhealthy.
- **Port in use** — 8080 (proxy), 5173 (web), 8000 is internal, 5432 (db), 9000/9001 (MinIO), 8025 (Mailpit).

## Branch protection
The org is on the GitHub Free plan, which does not support branch protection on private repos; CI on PRs is advisory until the plan changes or the repo becomes public — do not merge red.
