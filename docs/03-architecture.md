
# RTApps — Architecture Design

| | |
|---|---|
| Status | Draft for review (mentor review required before Phase 1 code — see §12) |
| Author | Chris Guzman |
| Date | 2026-08-27 |
| Related | `01-problem-definition-and-scope.md`, `02-requirements.md`, `adr/` |

This document describes how RTApps is built: the services, how they talk to each other, the data model, the API, security, deployment, and testing. It is written to be read top-down by someone who has never seen the code. Decisions with real alternatives are recorded as ADRs and only summarised here.

---

## 1. Overview

RTApps is a web application with three kinds of users:

- **Students** read lessons, answer knowledge checks, take quizzes and practise with flashcards, matching, sequencing, calculators and simulators. Every answer is recorded.
- **Educators** own cohorts of students and see how each student and the cohort as a whole are doing — by subject, by activity, by learning outcome.
- **Authors** (the mentor) write and publish the curriculum inside the application, without touching code.

Everything runs as a small set of containers on one virtual machine. There are two applications: a **web app** (SvelteKit) that renders pages, and an **API** (FastAPI) that owns all data and rules. PostgreSQL stores everything except large files, which live in S3-compatible object storage.

### 1.1 Design principles

1. **The API owns the rules.** Grading, permissions, publishing and analytics live in the API. The web app renders and forwards; it never computes a score or decides who may see what.
2. **One record of truth for results.** Every learning interaction — a knowledge check in a lesson, a quiz, later a game — becomes an `attempt` with per-item detail. Analytics are queries over attempts, not per-feature bookkeeping.
3. **Content is data, not code.** Lessons and activities are rows in the database with a strict schema. Only genuinely programmatic things (calculators' formulas, simulators) are code, and even those are configured by data.
4. **Published content is immutable.** Students always see a published snapshot; authors edit a working copy. A result recorded against version 3 of a lesson still makes sense after version 4 is published.
5. **Boring infrastructure.** Docker Compose on one VM, Postgres, a reverse proxy. Nothing that needs a team to operate.

---

## 2. System context (C4 level 1)

```mermaid
flowchart TB
  student([Student])
  educator([Educator])
  author([Content author])
  admin([Administrator])
  google[(Google Identity)]
  storage[(Object storage<br/>S3-compatible)]
  games[/Games & simulators<br/>separate repos, later/]

  subgraph rtapps[RTApps]
    sys[Web app + API + database]
  end

  student -- reads lessons, answers, sees own results --> sys
  educator -- manages cohorts, views analytics --> sys
  author -- writes & publishes content --> sys
  admin -- roles, audit --> sys
  sys -- OAuth sign-in --> google
  sys -- presigned upload/download URLs --> storage
  student -. uploads/downloads media directly .-> storage
  games -- post attempts via @rtapps/sdk --> sys
```

---

## 3. Containers (C4 level 2)

```mermaid
flowchart LR
  browser[Browser]
  subgraph vm[Single VM — Docker Compose]
    proxy[proxy<br/>Caddy or cloudflared<br/>one origin]
    web[web<br/>SvelteKit SSR<br/>adapter-node]
    api[api<br/>FastAPI + Uvicorn<br/>Python 3.12]
    db[(db<br/>PostgreSQL 16)]
    minio[(storage<br/>MinIO — dev only)]
    backup[backup<br/>nightly pg_dump]
  end
  r2[(R2 / OCI Object Storage<br/>production)]

  browser -->|HTTPS| proxy
  proxy -->|/api/*| api
  proxy -->|/*| web
  web -->|HTTP, forwards session cookie| api
  api --> db
  api -->|presigned URLs| minio
  api -.->|presigned URLs| r2
  browser -->|PUT/GET presigned| r2
  backup --> db
  backup -.-> r2
```

| Service | Technology | Responsibility | Must not |
|---|---|---|---|
| `proxy` | Caddy 2 (automatic TLS) **or** `cloudflared` tunnel + Caddy on plain HTTP | Single public origin; routes `/api/*` to the API and everything else to the web app; compression; security headers | Hold any application logic |
| `web` | SvelteKit (TypeScript), `adapter-node`, TipTap for authoring | Server-side rendering, route guards by role, forms, the lesson/activity renderers, the authoring UI | Access the database; grade anything; decide permissions |
| `api` | FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic, Authlib, argon2 | Authentication and sessions; authorization; content model and publishing; grading; attempts and results; analytics; audit log; media presigning; OpenAPI | Render HTML; stream large files |
| `db` | PostgreSQL 16 | All state. JSONB for documents; SQL views for analytics | — |
| `storage` | MinIO (dev) / Cloudflare R2 or OCI Object Storage (prod), S3 API | Media (images, audio), DICOM zips, 3-D models | Be accessed with long-lived credentials from the browser |
| `backup` | Alpine cron container | Nightly `pg_dump` to object storage, 30-day retention | — |

A background worker (queue + Redis) is **deliberately absent** in Release 1: grading is synchronous and takes milliseconds. The API package reserves `app/tasks/` so a worker can be added without restructuring when media processing or nightly roll-ups need it.

---

## 4. Request flows

### 4.1 Same-origin split (ADR-0002)

The proxy puts the API and the web app on **one origin** (`https://app.example`). Consequences:

- The browser sends the session cookie automatically to `/api/v1/...`; there is no CORS configuration and no token juggling in JavaScript.
- SvelteKit `load()` functions run on the server and call the API at `http://api:8000` directly, **forwarding the incoming `Cookie` header**. The page arrives fully rendered.
- Client-side mutations (submitting an answer, editor autosave) call `/api/v1/...` through a generated, typed client.

### 4.2 Login (email + password)

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as web (SvelteKit)
  participant A as api (FastAPI)
  participant D as db
  B->>W: POST /login (form action)
  W->>A: POST /api/v1/auth/login {email, password}
  A->>D: SELECT user WHERE email
  A->>A: argon2id verify
  A->>D: INSERT session (token_hash, user_id, expires, ua_hash)
  A-->>W: 200 {user} + Set-Cookie: rt_session=…; HttpOnly; Secure; SameSite=Lax
  W-->>B: 303 → /home (cookie relayed via event.cookies)
```

Google sign-in follows the standard OIDC authorization-code flow, implemented in the API with `httpx` and a signed state cookie (no Authlib) (`/auth/google/start` → Google → `/auth/google/callback`); the account is linked by verified email through the `identity` table, and the same session cookie is issued.

### 4.3 Reading a lesson (server-side render)

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as web
  participant A as api
  B->>W: GET /subjects/radiation-biology/rbe-and-oer
  W->>A: GET /api/v1/auth/me (Cookie forwarded, once per request in hooks.server.ts)
  A-->>W: {id, role: student}
  W->>A: GET /api/v1/lessons/rbe-and-oer (Cookie forwarded)
  A-->>W: published snapshot (correct answers stripped)
  W-->>B: HTML rendered from ProseMirror JSON via ProseNode.svelte
```

### 4.4 Answering a knowledge check

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as api
  participant D as db
  B->>A: POST /api/v1/activities/{id}/attempts
  A->>D: INSERT attempt (status=in_progress, content_version_id)
  A-->>B: {attempt_id}
  B->>A: POST /api/v1/attempts/{id}/items {item_key: q_page2_1, response: "B"}
  A->>A: grade(question.type, question.body, response)
  A->>D: INSERT attempt_item (correct, score)
  A-->>B: {correct, score, explanation}
  B->>A: POST /api/v1/attempts/{id}/submit  (Idempotency-Key)
  A->>D: UPDATE attempt (score, percent, passed, submitted_at); UPSERT activity_result
  A-->>B: scored attempt
```

The browser never sees a correct answer before it has answered; grading is server-side only.

### 4.5 Educator cohort report

`GET /api/v1/cohorts/{id}/overview` → the API checks that the caller is an educator **enrolled in that cohort with role educator** (in the SQL query, not in the client), writes an `audit_log` row (`actor, action=read_cohort_overview, cohort`), and returns aggregates computed from `activity_result` and `attempt_item`.

### 4.6 Author publishes a lesson

`POST /api/v1/lessons/{id}/publish` → the API validates the working copy (schema, every knowledge check has a correct answer), assembles the full tree (pages → blocks → questions) into one JSON document, inserts a `content_version` (version n+1, author, change note), sets `lesson.current_version_id`, and records an audit row. Students reading the lesson from that moment receive version n+1; attempts already in progress keep their pinned version.

---

## 5. Rich-text content (ADR-0003)

Lesson text is authored in **TipTap** (a ProseMirror editor) and stored as **ProseMirror JSON** in JSONB. The document schema is **closed** and defined once, in `packages/schemas/prose-doc.schema.json`:

| Nodes | `doc`, `paragraph`, `heading` (levels 2–4), `bulletList`, `orderedList`, `listItem`, `blockquote`, `table`/`tableRow`/`tableCell`, `image` (by `mediaAssetId`, never a URL), `callout` (`kind` ∈ key-principle / clinical-note / warning), `math` (KaTeX source), `hardBreak` |
|---|---|
| Marks | `bold`, `italic`, `underline`, `link` (https only), `code`, `subscript`, `superscript` |

One schema file drives four things: the TipTap extension list in the editor, the API validator (unknown node or mark → 422), the legacy-migration mapper, and the renderer. The renderer, `apps/web/src/lib/prose/ProseNode.svelte`, is a recursive component that switches on node type and emits real Svelte elements. It **never** uses `{@html}`, so there is no HTML-injection surface no matter what an author pastes.

---

## 6. Data model

### 6.1 Entity–relationship diagram

```mermaid
erDiagram
  USER ||--o{ IDENTITY : "signs in via"
  USER ||--o{ SESSION : has
  PROGRAM ||--o{ COHORT : has
  COHORT ||--o{ ENROLLMENT : has
  USER ||--o{ ENROLLMENT : has
  SUBJECT ||--o{ LESSON : contains
  LESSON ||--o{ LESSON_PAGE : contains
  LESSON_PAGE ||--o{ CONTENT_BLOCK : contains
  CONTENT_BLOCK }o--o| QUESTION : "knowledge_check →"
  ACTIVITY }o--o| LESSON : "kind=lesson"
  ACTIVITY ||--o| QUIZ : "kind=quiz"
  ACTIVITY ||--o| FLASHCARD_DECK : "kind=flashcards"
  ACTIVITY ||--o| MATCHING_ACTIVITY : "kind=matching"
  ACTIVITY ||--o| SEQUENCING_ACTIVITY : "kind=sequencing"
  ACTIVITY }o--o{ DATA_TABLE : "calculator config"
  QUIZ ||--o{ QUIZ_QUESTION : has
  QUESTION ||--o{ QUIZ_QUESTION : "used in"
  ACTIVITY }o--o{ OUTCOME : "maps to"
  ACTIVITY ||--o{ CONTENT_VERSION : "published as"
  USER ||--o{ ATTEMPT : makes
  ACTIVITY ||--o{ ATTEMPT : receives
  CONTENT_VERSION ||--o{ ATTEMPT : pins
  ATTEMPT ||--o{ ATTEMPT_ITEM : has
  USER ||--o{ ACTIVITY_RESULT : has
  ACTIVITY ||--o{ ACTIVITY_RESULT : summarises
  USER ||--o{ MEDIA_ASSET : owns
  USER ||--o{ AUDIT_LOG : acts
```

### 6.2 Tables

Conventions: UUID v7 primary keys; `created_at`/`updated_at` on every table; soft-delete only where stated; JSONB columns are validated against a JSON Schema at the API boundary.

**Identity and cohorts**

| Table | Key columns | Notes |
|---|---|---|
| `user` | `email` (citext, unique), `display_name`, `role` ∈ student/educator/admin, `password_hash` (nullable for Google-only), `deactivated_at` | No date of birth, no student number, no address. Minimal PII by design. |
| `identity` | `user_id`, `provider` (google), `subject`, `email_verified` | Allows several providers per user. |
| `session` | `id` = SHA-256 of the token, `user_id`, `expires_at`, `ua_hash`, `revoked_at` | Raw token exists only in the cookie. |
| `program` | `name`, `owner_id` | One row today ("Radiation Therapy"); everything hangs off it for later multi-program use. |
| `cohort` | `program_id`, `name`, `join_code` (unique, rotatable), `starts_on`, `ends_on` | |
| `enrollment` | `user_id`, `cohort_id`, `role` ∈ student/educator, `joined_at`; unique (user, cohort) | An educator "owns" a cohort by being enrolled in it with role educator. |

**Curriculum (working copy)**

| Table | Key columns | Notes |
|---|---|---|
| `subject` | `slug`, `title`, `order`, `summary` | The 13 subjects. |
| `lesson` | `subject_id`, `slug`, `title`, `order`, `status` ∈ draft/published/archived, `current_version_id` | |
| `lesson_page` | `lesson_id`, `order`, `title` | The "Page 3 of 10" unit students navigate. |
| `content_block` | `page_id`, `order`, `type` ∈ rich_text/knowledge_check/media/embed/callout, `body` JSONB | `rich_text` → ProseMirror doc; `knowledge_check` → `{question_id}`; `media` → `{media_asset_id, caption}`; `embed` → `{activity_id}`. |
| `question` | `type` ∈ single_choice/true_false/multi_select/numeric_tolerance/ordering/matching, `stem` JSONB (ProseMirror), `body` JSONB, `explanation` JSONB, `difficulty`, `outcome_ids` uuid[] | `body` shape per type: options + correct index(es); `{value, tolerance, unit}`; ordered items; pairs. Questions are reusable across lessons and quizzes (the legacy workbook has no shared banks; this fixes that). |
| `quiz` | `activity_id`, `pass_percent` (default 80), `shuffle`, `attempts_allowed`, `show_explanations` | |
| `quiz_question` | `quiz_id`, `question_id`, `order`, `points` | |
| `flashcard_deck` | `activity_id`, `cards` JSONB `[{front, back, media_asset_id?, pronounce?}]` | Score tiers (gold/silver/bronze) live in `activity.config`. |
| `matching_activity` | `activity_id`, `pairs` JSONB `[{left, right}]`, `present_n`, `pass_percent` | |
| `sequencing_activity` | `activity_id`, `items` JSONB (ordered; optional buckets such as eras) | |
| `data_table` | `key` (e.g. `pdd_6mv`), `title`, `unit`, `grid` JSONB `{row_axis, col_axis, values}` | PDD/TMR/wedge/tray tables; author-editable; referenced by calculators. |
| `activity` | `kind` ∈ lesson/quiz/flashcards/matching/sequencing/calculator/simulator/external, `ref_id`, `title`, `subject_id`, `lesson_id?`, `config` JSONB, `status`, `current_version_id` | The polymorphic thing a student "does". `calculator`/`simulator` are code-backed: `config` names the implementation (`{code_key: "mu_calc", tables: [...]}`). `external` covers re-hosted legacy tools that post via the SDK. |
| `outcome` / `activity_outcome` | `code` (SLO such as `3.2`), `title` | Learning outcomes for analytics. |
| `media_asset` | `owner_id`, `storage_key`, `mime`, `bytes`, `sha256`, `width`, `height`, `alt`, `status` ∈ pending/ready | The file itself is in object storage. |

**Publishing**

| Table | Key columns | Notes |
|---|---|---|
| `content_version` | `entity_type` ∈ lesson/activity, `entity_id`, `version`, `snapshot` JSONB, `author_id`, `published_at`, `change_note` | Immutable. Students read `snapshot`; authors edit the working copy. |

**Results (the integration spine — ADR-0004)**

| Table | Key columns | Notes |
|---|---|---|
| `attempt` | `user_id`, `activity_id`, `content_version_id`, `started_at`, `submitted_at`, `status` ∈ in_progress/submitted/abandoned, `score`, `max_score`, `percent`, `passed`, `duration_s`, `source` ∈ web/sdk, `client_meta` JSONB | One row per try. |
| `attempt_item` | `attempt_id`, `item_key`, `response` JSONB, `correct`, `score`, `max_score`, `time_ms` | One row per question / card / pair. |
| `activity_result` | `user_id`, `activity_id`, `best_percent`, `latest_attempt_id`, `attempts`, `first_passed_at`, `mastery` | Maintained on submit; the row analytics read most. |
| `audit_log` | `actor_id`, `action`, `target_type`, `target_id`, `cohort_id?`, `ip`, `at`, `detail` JSONB | Written for every educator read of student data and every publish. |

### 6.3 Grading

`apps/api/app/grading/` holds one pure function per question type — `single_choice.py`, `true_false.py`, `multi_select.py` (partial credit configurable), `numeric_tolerance.py` (absolute or relative tolerance, unit-aware), `ordering.py` (Kendall-style partial credit), `matching.py`. Each takes `(question.body, response) → GradeResult{correct, score, max_score, feedback}`. A lesson attempt's score is the sum over its knowledge checks; a quiz applies `points` and `pass_percent`. These functions are the most heavily tested code in the system (property-based tests).

---

## 7. API

Base path `/api/v1`. Resources are plural nouns; the API is documented by FastAPI's OpenAPI and that document is the contract for the front end.

| Group | Endpoints | Who |
|---|---|---|
| auth | `POST auth/register`, `POST auth/login`, `POST auth/logout`, `GET auth/me`, `GET auth/providers`, `GET auth/google/start`, `GET auth/google/callback`, `POST auth/password-reset/{request,confirm}` | anyone / signed-in |
| cohorts | `POST cohorts`, `GET cohorts`, `GET cohorts/{id}`, `POST cohorts/{id}/rotate-code`, `POST cohorts/join {code}`, `GET cohorts/{id}/members` | educator (own), student (join) |
| content (published) | `GET subjects`, `GET subjects/{slug}`, `GET lessons/{slug}`, `GET activities/{id}` — returns the published snapshot with correct answers stripped | signed-in |
| attempts | `POST activities/{id}/attempts`, `POST attempts/{id}/items`, `POST attempts/{id}/submit` (accepts `Idempotency-Key`), `GET me/results`, `GET me/attempts/{id}` | owner of the attempt |
| analytics | `GET cohorts/{id}/overview`, `GET cohorts/{id}/students/{uid}`, `GET cohorts/{id}/activities/{aid}`, `GET cohorts/{id}/outcomes`, `GET cohorts/{id}/export.csv` — each read audited | educator (own cohort), admin |
| authoring | `POST/PATCH lessons`, `PUT lessons/{id}/pages` (whole tree), `POST/PATCH questions`, `POST/PATCH activities`, `POST/PATCH data-tables`, `POST lessons|activities/{id}/publish`, `GET …/versions`, `POST …/versions/{n}/restore`, `POST media/presign`, `POST media/{id}/confirm` | educator, admin |
| admin | `GET users`, `PATCH users/{id}/role`, `POST users/{id}/deactivate`, `POST users/{id}/erase`, `GET audit-log` | admin |
| system | `GET health`, `GET openapi.json` | public |

Conventions:

- **Authorization** is a FastAPI dependency (`require_role`, `require_cohort_educator`) and cohort ownership is enforced inside the query, never by trusting client-supplied ids.
- **Pagination**: cursor-based, `?cursor=&limit=` → `{items, next_cursor}`.
- **Errors**: RFC 9457 `application/problem+json` — `{type, title, status, detail, errors[]}`; Pydantic validation errors map to `errors[]`.
- **Idempotency**: `submit` and SDK posts accept `Idempotency-Key`; a repeated key returns the original result.
- **Versioning**: URL prefix; only additive changes within `v1`.
- **Typed client**: CI exports `openapi.json` and regenerates `packages/api-client` (`openapi-typescript` + `openapi-fetch`); the build fails if the committed client is stale, so front end and API cannot drift silently.

---

## 8. Security and privacy

| Concern | Measure |
|---|---|
| Passwords | argon2id (`argon2-cffi`), per-user salt, parameters tuned to ~250 ms on the target VM |
| Sessions | Opaque 256-bit random token; only its SHA-256 stored; cookie `rt_session` `HttpOnly; Secure; SameSite=Lax; Path=/`; 14-day sliding expiry; revocation on logout and password change |
| CSRF | `SameSite=Lax` plus an `Origin`/`Referer` allow-list check on every non-GET request in the API |
| XSS | Rich text rendered from JSON by components — no `{@html}`, no sanitiser to get wrong; strict CSP (`default-src 'self'`, images from the storage origin only) |
| Transport | HTTPS only (Caddy auto-TLS or Cloudflare); HSTS |
| Secrets | Runtime secrets only in `/opt/rtapps/.env` on the VM (mode 600); CI has no database credentials; GitHub push protection on the org |
| Student data | Minimal PII (name, email, cohort membership); educators see only cohorts they are enrolled in; every educator read of student data is audit-logged; admin can deactivate and **erase** a user (attempts anonymised, PII nulled) |
| Patient data | All patient records in the EMR content are fictional; the system stores no real PHI and is not a medical device |
| Files | Browser uploads/downloads go straight to object storage with short-lived presigned URLs; the API validates MIME/size on `confirm` |
| Dependencies | Dependabot on uv, pnpm and Actions; `pip-audit`/`pnpm audit` in CI |
| Rate limiting | Login, register and password-reset endpoints are rate-limited per IP/email at the proxy and the API |
| Cross-origin clients (Phase 4) | `SameSite=Lax` cookies are not sent to a games site on another origin. Before the SDK ships, decide between hosting games under the same parent domain with a `Domain=` cookie, or issuing short-lived bearer tokens to the SDK (ADR-0002 follow-up). Not needed for Release 1, where every page is same-origin. |

---

## 9. Repository layout

```
rtapps/
  apps/
    web/                    SvelteKit (TypeScript)
      src/routes/(student)/ (educator)/ (author)/ (admin)/   route groups = role guards
      src/lib/prose/ProseNode.svelte                          JSON → elements renderer
      src/lib/activities/   Lesson, Quiz, Flashcards, Matching, Sequencing, Calculator components
      src/hooks.server.ts   resolves locals.user once per request; guards
    api/                    FastAPI
      app/{auth,content,authoring,attempts,grading,analytics,media,audit}/
      app/tasks/            reserved for a future worker
      alembic/              migrations
      tests/                pytest
  packages/
    schemas/                prose-doc, question bodies, attempt payload (JSON Schema → TS types + Pydantic models)
    api-client/             generated from openapi.json — never edited by hand
    sdk/                    @rtapps/sdk: start() / item() / submit(), offline queue (Phase 4)
  tools/
    migrate-legacy/         Python: legacy HTML → API drafts, with a per-page report
  infra/
    compose.yaml            development
    compose.prod.yaml       production (GHCR images, volumes, backup)
    Caddyfile, cloudflared/ proxy variants
    .env.example, backup.sh
  .github/workflows/        pr.yml, main.yml, deploy.yml
  docs/                     this folder
  Makefile, pnpm-workspace.yaml
```

---

## 10. Environments and deployment (ADR-0005)

### 10.1 Development

`make dev` → `docker compose up --build` brings up `db`, `storage` (MinIO with a bucket-init job), `api` (Uvicorn with reload, source bind-mounted, runs `alembic upgrade head` on start), `web` (Vite dev server with HMR), `proxy` (Caddy on `http://localhost:8080`, same routing rules as production) and `mailpit` (catches auth e-mails). `make seed` loads an admin, an educator, one cohort, one subject with a published lesson and quiz, and ten fake students with attempts. `.env` is copied from `.env.example`; only `SESSION_SECRET` and Google OAuth keys differ per machine.

### 10.2 Test and production

Same `compose.prod.yaml`, different `.env` and different VM. Images are pulled from GHCR by commit SHA; no bind mounts; `web` runs the `adapter-node` build; Postgres data is on a block volume; the `backup` container runs `pg_dump` nightly to object storage with 30-day retention (media buckets have versioning enabled). Migrations run as a **one-shot step in the deploy workflow**, not on container start, so a bad migration never loops a restarting container.

```mermaid
flowchart LR
  dev[Developer] -->|PR| gh[GitHub]
  gh -->|pr.yml: lint · type-check · tests · e2e · build| gh
  gh -->|merge to main → main.yml| ghcr[(GHCR images<br/>arm64 + amd64)]
  gh -->|deploy.yml: SSH| vm[VM]
  vm -->|compose pull · alembic upgrade · up -d| vm
  vm --> health[health check]
```

Target hosting is an Oracle Cloud ARM VM (free tier: 4 OCPU / 24 GB) behind Cloudflare (DNS, TLS or Tunnel, R2 for objects). Nothing in the design depends on that choice: any Ubuntu VM with Docker and any S3-compatible bucket works.

### 10.3 Scaling path

Single VM is expected to serve a program of a few hundred students comfortably. If it doesn't: (1) move Postgres to a managed instance, (2) run two `api` replicas behind the proxy, (3) add the worker for media/analytics. None of these change application code.

---

## 11. Testing strategy

| Layer | Tooling | What is tested |
|---|---|---|
| Grading functions | pytest + hypothesis | Every question type; tolerance boundaries; partial credit; malformed responses |
| API | pytest + httpx against a real Postgres (transaction rolled back per test) | Auth flows; the permission matrix (student cannot read another cohort; educator cannot read a cohort they're not in); attempt lifecycle; publish/version pinning; audit rows written |
| Shared schemas | JSON fixture files (valid + invalid) run by both Python and TypeScript tests | ProseMirror documents, question bodies, attempt payloads |
| Web units | vitest + @testing-library/svelte | `ProseNode` renders every node type and rejects unknown ones; activity components emit the right response shapes |
| End-to-end | Playwright against the compose stack | register → join cohort → open lesson → answer → see score → educator sees it |
| Migration tool | pytest golden files | Three legacy pages → expected JSON |
| Contract | CI job | `openapi.json` → regenerated client must match the committed one |

CI (`pr.yml`) runs all of the above on every pull request and is a required check on `main`. Coverage gate: 70 % on `app/grading` and `app/auth` from the first version, rising as the codebase grows.

---

## 12. Review and next steps

- **Mentor review of this document** is the gate before Phase 1 code. Questions for that review are in `01-problem-definition-and-scope.md` §8; the design questions specifically: (a) are the seven content types and their rules (80 % pass, badge tiers, attempts allowed) right? (b) is "educator = enrolled in cohort with role educator" the right ownership model? (c) which learning-outcome codes should analytics use (ARRT content specifications, programme SLOs, both)?
- Phase 1 implementation plan follows approval: scaffold, auth, one migrated lesson with knowledge checks, tests, CI — milestone M1.
- Decisions recorded in `docs/adr/`: 0001 stack, 0002 sessions/proxy, 0003 content storage, 0004 result schema, 0005 deployment.
