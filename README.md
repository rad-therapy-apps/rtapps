# RTTLearn (rtapps)

Radiation-therapy education platform — the ground-up rebuild of the RTApps e-workbook, games and educator analytics.

- `docs/` — problem definition, requirements, architecture, conventions, ADRs (start with `docs/01-problem-definition-and-scope.md`)
- `apps/web` — SvelteKit front end
- `apps/api` — FastAPI back end
- `packages/` — shared schemas, generated API client, result-reporting SDK
- `tools/migrate-legacy` — imports content from the legacy `rtt_e_workbook` repository
- `infra/` — Docker Compose (dev + prod), Caddy/Cloudflare Tunnel config, backup container, deploy script

Status: **v0.9.0** (M9) — phase 4 closes: LINAC alignment sets + console door, password management; next: phase 5 (EMR decision + CI diet).

Getting started: `docs/05-setup.md`; deploying: `docs/06-operations.md`.

## Licence and data

Educational software — not for clinical use.

- **Licence:** source-available, all rights reserved — see [`LICENSE`](LICENSE). The code is public so it can be read and evaluated; reuse needs the copyright holders' written permission. Vendored and installed third-party libraries keep their own open-source licences.
- **CT images:** the DICOM series used by the simulators (`apps/web/arcade-src/linac-ct/`) are de-identified images from a public research dataset, used for teaching only. Dataset: _to be confirmed with the course lead before the repository goes public_.
- **Legacy content:** the lesson text, games and visual identity derive from the original RTApps e-workbook and RadTherapyPlatform by Kevin Kindle. Migrated workbook content under `apps/api/seed/content/` keeps its CC BY-NC 4.0 notice (see `docs/05-setup.md`), and the embedded Sketchfab anatomy models are credited where they are shown, under their own Creative Commons licences.
