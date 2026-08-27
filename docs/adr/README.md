# Architecture Decision Records

Decisions are recorded in [MADR](https://adr.github.io/madr/) format. One file per decision, numbered, never rewritten once accepted — a superseding decision gets a new number and links back.

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-backend-stack-fastapi-postgres.md) | Backend stack — FastAPI + SQLAlchemy 2 (async) + Alembic + PostgreSQL 16 | Accepted | 2026-08-27 |
| [0002](0002-same-origin-proxy-and-cookie-sessions.md) | Same-origin reverse proxy with server-side cookie sessions | Accepted | 2026-08-27 |
| [0003](0003-content-in-database-as-prosemirror-json.md) | Curriculum content in Postgres as ProseMirror JSON with working copies and published snapshots | Accepted | 2026-08-27 |
| [0004](0004-unified-attempt-result-schema.md) | One `attempt` / `attempt_item` schema as the integration spine | Accepted | 2026-08-27 |
| [0005](0005-single-vm-docker-compose-deployment.md) | Single VM running Docker Compose, images from GHCR, Caddy or Cloudflare Tunnel | Accepted | 2026-08-27 |

## Adding a record

1. Copy the section layout of an existing ADR: Status · Context · Decision · Options considered · Consequences · Follow-ups.
2. Number it `NNNN-short-kebab-title.md`; start as `Proposed`, flip to `Accepted` in the merging PR.
3. Add a row above. ADR-0001 also serves as the internship stack decision record (due 2026-10-30).
