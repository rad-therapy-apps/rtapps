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
The API tests need a PostgreSQL. Either use the compose `db` (`TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5442/rtapps_test` after `createdb rtapps_test`; the host publishes on 5442, container internal port remains 5432), or a throwaway container:
```bash
docker run -d --name rtapps-test-pg -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test -p 5433:5432 postgres:16
export TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test
cd apps/api && uv run pytest
```
If 5433 is taken on your machine, use another host port and set `TEST_DATABASE_URL` to match — CI uses 5433.

## Seed data
`make seed` (stack running) creates accounts, all with password `rtapps-dev-password`: `admin@example.com` (admin), `educator@example.com` (educator), `student@example.com` (student), and `student01@example.com` … `student10@example.com` (ten students enrolled in the demo cohort); imports + publishes the lessons in `apps/api/seed/lessons/`, the full migrated legacy corpus in `apps/api/seed/content/` (one subdirectory per subject) and the hand-written activity fixtures in `apps/api/seed/activities/` (e.g. the demo quiz); and creates a demo cohort (join code `DEMO42`) owned by `educator@example.com` with the ten `studentNN@example.com` accounts enrolled, plus attempts and rollups on both a lesson and the demo quiz. Safe to re-run; it refuses when `ENV=prod`.

All migrated content under `apps/api/seed/content/` is attributed here, once, to the legacy RTApps e-workbook (CC BY-NC 4.0) rather than per-document — this statement is the mechanism satisfying NFR-27's notice requirement for activity documents (quiz/flashcards/matching/sequencing have no in-content notice block of their own). Migrated *lessons* are the exception: they keep the in-content notice the phase-1 converter (`tools/migrate-legacy convert`) already writes into the page.

## Migrating legacy content
`tools/migrate-legacy scan` walks an entire legacy content tree (all 13 subject folders, or a subset), classifies each page (paged lesson, quiz, flashcards, matching, sequencing, or `unsupported`), converts every supported one, and writes its report:
```bash
cd tools/migrate-legacy
uv run migrate-legacy scan /path/to/rtt_e_workbook --out ../../apps/api/seed/content --report /tmp/scan-report.json
# --subjects restricts the walk to named subject directories, e.g.:
uv run migrate-legacy scan /path/to/rtt_e_workbook --out ../../apps/api/seed/content --subjects Radiation_Biology Ethics
```
Each page is reported as `converted`, `needs-review` (something was mapped lossily, e.g. a knowledge check with no answer key or a duplicate matching pair) or `unsupported` (none of the five patterns). `docs/legacy-migration-report.md` is the fix-list generated from a full `scan` run against the legacy repo — the record of what still needs a human pass before (re-)import. Import the converted JSON with `cd apps/api && uv run python -m app.content.importer ../../apps/api/seed/content/<subject>/<slug>.json` (or the activity equivalent for quiz/flashcards/matching/sequencing documents) or simply `make seed`, which imports everything already committed under `seed/content/` and `seed/activities/`.

The single-lesson `migrate-legacy convert` command (one directory in, one lesson JSON out) still exists for a targeted re-conversion of one page; `scan` is the one to reach for over the whole corpus.

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
- **Port in use** — 8080 (proxy), 5173 (web), 8000 is internal, 5442 (db; container internal port 5432), 9000 (SeaweedFS S3 API), 8025 (Mailpit).

## Deploying
Test/production VM, deploy workflows, backups and restore: see `docs/06-operations.md`.

## Branch protection
The org is on the GitHub Free plan, which does not support branch protection on private repos; CI on PRs is advisory until the plan changes or the repo becomes public — do not merge red.
