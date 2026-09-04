# RTApps

Radiation-therapy education platform — the ground-up rebuild of the RTApps e-workbook, games and educator analytics.

- `docs/` — problem definition, requirements, architecture, conventions, ADRs (start with `docs/01-problem-definition-and-scope.md`)
- `apps/web` — SvelteKit front end
- `apps/api` — FastAPI back end
- `packages/` — shared schemas, generated API client, result-reporting SDK
- `tools/migrate-legacy` — imports content from the legacy `rtt_e_workbook` repository
- `infra/` — Docker Compose (dev + prod), Caddy/Cloudflare Tunnel config, backup container, deploy script

Status: **v0.4.0** (milestone M4) — in-app authoring: educators/admins repair migrated needs-review lessons and author new content (closed-schema rich-text editor, question bank, quiz/flashcard/matching/sequencing builders, data tables, edit → preview → publish with version history); media upload (presign → PUT → confirm to MinIO/S3); MU calculator proving the calculator framework; converter answer-key recovery + full re-scan. Next: plan 3c (remaining calculators, authoring follow-ups).

Getting started: `docs/05-setup.md`; deploying: `docs/06-operations.md`.

Educational software — not for clinical use. Licence: to be decided (see `docs/01-problem-definition-and-scope.md`).
