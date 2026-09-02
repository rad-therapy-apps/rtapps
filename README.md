# RTApps

Radiation-therapy education platform — the ground-up rebuild of the RTApps e-workbook, games and educator analytics.

- `docs/` — problem definition, requirements, architecture, conventions, ADRs (start with `docs/01-problem-definition-and-scope.md`)
- `apps/web` — SvelteKit front end
- `apps/api` — FastAPI back end
- `packages/` — shared schemas, generated API client, result-reporting SDK
- `tools/migrate-legacy` — imports content from the legacy `rtt_e_workbook` repository
- `infra/` — Docker Compose (dev + prod), Caddy/Cloudflare Tunnel config, backup container, deploy script

Status: **v0.3.0** (milestone M3) — quizzes, flashcards, matching and sequencing activities; the full legacy corpus migrated (`tools/migrate-legacy scan`); educator per-activity stats, outcome mastery and CSV export; practice/assessment separation (ADR-0006); hardening (rate limits, admin erase, session purge, Sentry, `program` table). Next: plan 3b (authoring).

Getting started: `docs/05-setup.md`; deploying: `docs/06-operations.md`.

Educational software — not for clinical use. Licence: to be decided (see `docs/01-problem-definition-and-scope.md`).
