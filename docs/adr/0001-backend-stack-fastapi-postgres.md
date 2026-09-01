# ADR-0001: Backend stack — FastAPI + SQLAlchemy 2 (async) + Alembic + PostgreSQL 16

- **Status:** Accepted
- **Date:** 2026-08-27
- **Deciders:** Chris Guzman (lead developer). Mentor (content author) consulted on scope.
- **Note:** This ADR is also the internship *stack decision record* for milestone M2. Phase 2 will append measured evidence (CI time, p95 of `POST /attempts/{id}/submit`, LOC per feature) under *Follow-ups*.

## Context

RTApps is being rebuilt from scratch. The front end is already fixed as SvelteKit (TypeScript, pnpm, adapter-node). The backend must own:

- auth (email + password, Google OAuth), server-side sessions, role/cohort authorization, audit log (ADR-0002);
- the content model: normalized authoring tables plus immutable JSONB snapshots of ProseMirror documents (ADR-0003);
- server-side grading of six question types and the `attempt` / `attempt_item` / `activity_result` spine with idempotent submit (ADR-0004);
- educator analytics (per-student, per-cohort, per-outcome aggregations);
- presigned object-storage URLs; an OpenAPI document that generates the TypeScript client.

Later phases add the games/simulator SDK, re-hosting of the DICOM-alignment and EMR tools, NIfTI/DICOM handling, and probably PDF export of certificates and cohort reports.

Forces and constraints:

| Force | Effect on the decision |
|---|---|
| Solo developer with ordered milestones (M1 first tested version + CI; M2 deployed vertical slice) | Productivity and a short learning curve dominate |
| Owner's existing toolchain is Python 3.12 + `uv`; already fluent in FastAPI/Pydantic | Anything else costs ramp-up time the schedule does not have |
| Scientific/medical-imaging work in later phases (`pydicom`, `nibabel`, `numpy`, `scipy`) | These libraries are Python-only in any serious form |
| Budget ≈ free: Oracle Cloud ARM free tier + Cloudflare | Must run in one container on arm64; no per-seat auth pricing |
| Handover at end of internship to an unknown maintainer | Mainstream, well-documented stack; explicit conventions |
| Content is versioned JSONB; attempts need transactions, idempotency keys, aggregations | Relational database with first-class JSON |
| Front end is TypeScript regardless | Either one language end-to-end (Node) or a typed contract across a language boundary |

## Decision

**FastAPI** (Python 3.12, `uv`, Pydantic v2) + **SQLAlchemy 2.0 async** (asyncpg) + **Alembic** + **PostgreSQL 16**, as a separate `api` service consumed by the SvelteKit app now and by games, simulators and the educator app later.

Types cross the language boundary through the contract, not by hand: `openapi.json` is exported in CI → `packages/api-client` via `openapi-typescript` + `openapi-fetch`; CI fails if the checked-in client is stale. JSON Schemas for ProseMirror documents, question bodies and the attempt payload live once in `packages/schemas` and generate both Pydantic models and TypeScript types.

## Options considered

### A. FastAPI + SQLAlchemy 2 (async) + Alembic + PostgreSQL 16 — chosen

- **Pros:** owner already productive; Pydantic v2 gives runtime validation and an accurate OpenAPI document for free; native async fits SSR fan-out and presign calls; first-class access to `pydicom`/`nibabel`/`numpy` in-process; pytest + `httpx` + `hypothesis` is an excellent testing story for pure grading functions; one small image, arm64 wheels available for everything needed.
- **Cons:** no admin/auth batteries — sessions, password hashing, OAuth, permissions are written by hand (Authlib, argon2-cffi); async SQLAlchemy has real footguns (implicit lazy loads raise `MissingGreenlet`, `selectinload` discipline required); Alembic autogenerate needs review for JSONB and enum changes; two languages in the repo, two toolchains, two CI matrices.

### B. Django + Django REST Framework + PostgreSQL

- **Pros:** the most complete batteries: auth, sessions, permissions, `makemigrations`, admin, ORM, test client; largest hiring pool; conventions enforce structure for a future maintainer; same Python ecosystem for DICOM.
- **Cons:** the admin is of little value because the mentor needs a purpose-built authoring UI anyway (ADR-0003); async support is still partial (ORM async is a thin wrapper, many third-party packages sync-only); DRF serializers duplicate what Pydantic gives; OpenAPI needs `drf-spectacular` and is less accurate than FastAPI's; owner would spend the first two weeks learning DRF idioms instead of shipping the lesson slice.

### C. Node — Hono or Fastify + Prisma or Drizzle + PostgreSQL

- **Pros:** one language and one package manager across the monorepo; end-to-end types without codegen (shared `zod` schemas, Hono RPC or tRPC); fastest I/O; Drizzle migrations are SQL-first and transparent.
- **Cons:** the domain libraries do not exist in JavaScript at the needed depth (`dicom-parser` reads tags; there is no `nibabel`/`numpy` equivalent for voxel work), so a Python sidecar would appear by Phase 4 and the repo would be two languages *anyway* — with the harder half in the language the owner knows less on the server; Prisma types JSON columns as `JsonValue` (loses the schema); owner's Node-server experience is thin; JS ecosystem churn is a handover risk.

### D. Supabase (managed Postgres + PostgREST + Auth + Storage)

- **Pros:** fastest to a demo: tables, row-level security, hosted auth with Google, storage and a generated TS client in an afternoon; the RT-Games presenter dashboard already talks to Supabase.
- **Cons:** the product's core logic is server-side and stateful — grading with answers stripped from what the client sees, version-pinned snapshots, idempotent submit, audited educator reads. In Supabase that logic lands in SQL functions and RLS policies or in Deno edge functions: hard to unit-test, no `hypothesis`, no `pydicom`. Free tier pauses projects after a week of inactivity, which is exactly what a student cohort between semesters looks like; the reliable tier is USD 25/month against a budget of zero. Auth lock-in (user table, JWT format) is the hardest part to leave later. A Python service would still be needed for imaging.

### E. Database only: SQLite-first with Litestream — rejected

Considered as the database under option A (keep FastAPI, replace Postgres).

- **Pros:** zero-ops, one file, trivially fast local tests, Litestream streams the WAL to object storage for near-free durability.
- **Cons:** single writer; attempt autosave (`POST attempts/{id}/items`) from a whole cohort during a lab session serialises on the write lock; no `citext`, weaker JSON indexing (no GIN over JSONB), no `pg_dump`-style logical backups and restore drills; every analytics query written for SQLite is rewritten when Postgres arrives; Postgres on the same VM costs nothing extra. The migration from SQLite to Postgres would land right when the product first has real users — the worst time.

### Comparison

Scale 1–5, higher is better. Scores are the owner's judgement for *this* project, not general merit.

| Criterion | A. FastAPI + SQLA + PG | B. Django + DRF | C. Node + Prisma/Drizzle | D. Supabase |
|---|---|---|---|---|
| Solo-dev productivity (first 8 weeks) | 4 — hand-rolled auth costs ~1 week | 5 — batteries | 4 — one language, hand-rolled auth too | 5 → 3 once grading/versioning logic starts |
| Ecosystem for this domain (DICOM/NIfTI/scientific Python, PDF export) | 5 — `pydicom`, `nibabel`, `numpy`, `weasyprint`/`reportlab` in-process | 5 — same | 2 — sidecar needed | 2 — sidecar needed; edge functions are Deno |
| Type safety across the boundary | 4 — Pydantic → OpenAPI → generated TS client, validated at runtime on both sides | 3 — DRF serializers + `drf-spectacular`, weaker internal typing | 5 — single language, shared `zod`, no codegen | 3 — generated table types; RPC/edge logic untyped |
| Async / performance | 4 — native ASGI; grading is CPU-light | 3 — partial async ORM | 5 | 4 — PostgREST fast; edge cold starts |
| Migrations | 4 — Alembic autogenerate, review required | 5 — best in class | 4 — Prisma/Drizzle good; JSON typing weak | 3 — SQL migrations; RLS policies are schema and easy to get wrong |
| Testing story | 5 — pytest + httpx + hypothesis, real PG per test with rollback | 5 | 4 — vitest; DB fixtures more manual | 2 — local stack heavy; RLS hard to test |
| Hosting cost | 5 — one container, arm64 | 5 | 5 | 4 — free tier pauses; USD 25/mo for reliability |
| Learning curve for the owner | 5 — current daily toolchain | 3 — DRF idioms | 3 — Node server patterns | 3 — RLS, PostgREST semantics |
| Hiring / handover | 4 — mainstream; maintainer needs Python *and* TS | 5 — largest pool, enforced structure | 4 — one language; ecosystem churn | 3 — logic scattered across SQL/RLS/edge |
| **Total** | **40** | **39** | **36** | **29 (→ 27)** |

Django scores almost identically. The tie-break is the learning-curve row and the schedule: the difference between A and B is ~two weeks of ramp-up before the 2026-09-25 deliverable, and Django's strongest asset (the admin) is not usable for the mentor's authoring workflow. Node loses on the domain-library row; that row is decisive because it means two languages either way, so "one language" is not actually on offer.

### Notes on the decisive rows

- **Domain ecosystem.** The DICOM-alignment tool, the 38-patient EMR and NIfTI viewing are on the Phase 4 roadmap and are the platform's distinguishing features for a radiation-therapy program. `pydicom` (tag parsing, pixel data), `nibabel` (NIfTI I/O), `numpy`/`scipy` (resampling, DVH math) have no equivalent outside Python. PDF export (`weasyprint` from the same HTML the renderer produces, or `reportlab`) is also strongest in Python. Any non-Python backend therefore implies a Python sidecar later, which collapses the "one language" advantage of option C.
- **Type safety.** Option C wins the row, but the practical gap is small: the generated client is regenerated in CI on every PR and a stale client fails the build, so drift is caught at the same point (PR) where tRPC would catch it (compile). What is lost is editor-time inference while writing a new endpoint; what is gained is runtime validation on the server from the same declaration.
- **Testing.** Grading is the highest-risk logic (a wrong `numeric_tolerance` or `matching` grader silently mis-scores a cohort). `hypothesis` property tests per grader (`score ≤ max`, order-independence of `multi_select`, idempotence of re-grading a pinned version) are the concrete reason this row is weighted heavily.
- **Learning curve.** Not a vanity row. With a solo developer the calendar cost of ramp-up is the single largest schedule risk in Phases 1–2; the 2026-09-25 deliverable leaves no slack for it.

### Boundary contract (how two languages stay in sync)

| Artefact | Source of truth | Generated | Checked in CI |
|---|---|---|---|
| Request/response models | Pydantic v2 in `apps/api` | `openapi.json` → `packages/api-client` (`openapi-typescript`, `openapi-fetch`) | `git diff --exit-code` on the client |
| ProseMirror document, question bodies, attempt payload | JSON Schema in `packages/schemas` | Pydantic models (`datamodel-code-generator`) and TS types (`json-schema-to-typescript`) | shared valid/invalid fixtures run in pytest *and* vitest |
| Database schema | SQLAlchemy 2 declarative models | Alembic revisions (`--autogenerate`, reviewed) | `alembic upgrade head` on a throwaway DB in `main.yml`; `alembic check` in `pr.yml` |
| Error format | RFC 9457 `application/problem+json` | — | contract tests assert `type`, `status`, `detail` |

Hand edits to generated packages are forbidden by convention (`docs/04-conventions.md`) and by a CI check.

### Risks of the chosen option and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Hand-rolled auth has a security defect | Medium | Authlib for OAuth; argon2id; permission-matrix pytest suite (every role × every route group); `security-review` on auth PRs |
| Async SQLAlchemy lazy-load errors in production | Medium | `expire_on_commit=False`; repository functions declare their `selectinload` graph; a pytest fixture that fails on unexpected SQL emitted outside a session |
| Alembic autogenerate misses a JSONB/enum change | Medium | Review every revision by hand; `alembic check` in CI; migrations run as an explicit deploy step (ADR-0005) so a bad one never boots a container |
| Two-toolchain fatigue for the solo owner | High | `Makefile` targets wrap both (`make lint`, `make test`, `make gen`); path-filtered CI so a docs PR does not run everything |
| A future maintainer knows only one of the two languages | Medium | Conventions doc; the API is the stable contract, so either half can be rewritten independently |

### Pinned versions at decision time

Python 3.12 · FastAPI ≥ 0.115 · Pydantic 2.x · SQLAlchemy 2.0.x (asyncio extension, `asyncpg`) · Alembic 1.13+ · PostgreSQL 16 (`citext`, `pgcrypto`) · `uv` for lock and run · `uvicorn` workers behind Caddy. Upgrades via Dependabot; majors need an ADR amendment only if they change the boundary contract.

## Consequences

### Positive

- The owner ships in the toolchain already in daily use; Phase 1 starts immediately.
- Grading is pure Python functions tested with property-based tests; the same interpreter later runs DICOM/NIfTI code without an inter-process boundary.
- Pydantic models are the single source of truth for request/response shapes; the generated client makes a front-end/back-end drift a CI failure, not a runtime bug.
- Postgres JSONB with GIN indexes supports both the content snapshots and `attempt_item.response` queries; `citext` handles email uniqueness; logical backups are one `pg_dump`.
- Whole stack runs in Docker Compose on one arm64 VM at zero cost (ADR-0005).

### Negative

- **Two languages.** Every contributor touches Python and TypeScript; there are two lockfiles, two linters (ruff/mypy, eslint/svelte-check), two test runners, and a codegen step between them. This is the real price and it is paid on every PR.
- Auth, sessions, permissions and OAuth are hand-written (ADR-0002). More surface for security mistakes than Django's defaults; mitigated by a permission-matrix test suite and Authlib for OAuth.
- Async SQLAlchemy discipline: explicit eager loading, no attribute access outside a session, `expire_on_commit=False`. New contributors will hit `MissingGreenlet` at least once.
- No admin UI; every authoring and admin screen is built in SvelteKit. This was already required by the content decision, so the marginal cost is small but non-zero.

### Neutral

- Runtime validation happens twice (Pydantic on the server, generated types + optional `zod` on the client). Acceptable; the schemas are shared.
- arm64 images require multi-arch builds in CI (`main.yml` builds arm64 + amd64). Python wheels for `numpy`/`asyncpg` exist for both.
- Background jobs are out of scope for v1; `api/app/tasks/` is reserved. If media processing needs one, `arq` (asyncio-native, Redis) is the expected choice.

## Follow-ups / what would make us revisit

- **Phase 2 (milestone M2) — measured evidence (2026-08-28, plan 2):**
  - **CI wall time for `pr.yml`:** 3 min 31 s for run 33210380122 on `feat/educator-slice` (six jobs in parallel; the longest is `e2e` at 2 min 11 s, which boots the full compose stack). Well inside the "a PR is checked in under ten minutes" expectation that motivated a single-process stack.
  - **p95 of `POST /attempts/{id}/submit`:** median 11.3 ms, p95 43.5 ms, max 67.0 ms over 30 sequential submits through Caddy on the developer laptop's compose stack (Uvicorn `--reload`, Postgres in Docker; script kept in the plan-2 ledger). Against the NFR-01 target of 300 ms this leaves an order of magnitude of headroom; to be re-measured on the test VM once it exists (docs/06-operations.md §6).
  - **Lines of code, auth module:** `apps/api/app/auth/*.py` = 721 lines *including* the mandatory header/block comments (roughly 40 % of the file), i.e. ~430 lines of Python for register/login/logout/me, opaque sessions, argon2, Google OAuth and the role dependency. A Django + django-allauth + DRF equivalent would need ~0 lines of auth logic but ~40–60 lines of settings/URL wiring plus the allauth templates — comparable effort, with the FastAPI version being fully typed and tested against a real database in 1.4 s.
  - **`MissingGreenlet` incidents:** 1 (plan 1c, Task 3 — building a lesson tree via lazy relationships inside an async session; fixed by constructing through relationships before the flush and using `selectin` loading). No recurrence in plan 2 (cohorts, analytics, admin).
  - **Verdict:** nothing measured argues for revisiting the decision; the async-ORM learning curve (the one `MissingGreenlet`) was paid once.
- **Revisit toward Django** if hand-written auth/permissions grow past ~1,500 lines or a permission-matrix test fails in review more than twice; the ORM/model layer is the only part that would need porting.
- **Revisit toward Node** only if the imaging and PDF features are dropped from the roadmap *and* a maintainer arrives who is TS-only. If imaging stays, Python stays.
- **Revisit Supabase** never for the core; it may still host RT-Games presenter data until games adopt the SDK (ADR-0004).
- **SQLite** may return for `tools/migrate-legacy` scratch state or for unit tests that do not need JSONB operators; never as the system of record.
