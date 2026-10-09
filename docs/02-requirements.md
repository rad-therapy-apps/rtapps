# RTApps — Requirements

| | |
|---|---|
| Document | `docs/02-requirements.md` |
| Status | Draft for mentor review (Phase 0); interview answers (`docs/01` §8.3) may change priorities |
| Owner | Chris Guzman |
| Reviewer | Kevin Kindle |
| Depends on | `docs/01-problem-definition-and-scope.md` (stakeholders, scope, glossary), `docs/03-architecture.md` (data model, API, phases) |

## 1. How to read this document

### 1.1 Identifiers

| Prefix | Actor / area |
|---|---|
| `FR-S-xx` | Student |
| `FR-E-xx` | Educator / instructor |
| `FR-A-xx` | Content author |
| `FR-M-xx` | Program administrator |
| `FR-X-xx` | System, migration, SDK, cross-cutting |
| `FR-W-xx` | Explicitly excluded from Release 1 (§2.6) |
| `NFR-xx` | Non-functional (§3, grouped by category; numbering is stable, not sequential within a group) |
| `AT-xx` | Acceptance-test scenario (§5) |

### 1.2 Columns

| Column | Values |
|---|---|
| Priority | MoSCoW: **M** must, **S** should, **C** could, **W** won't (this release) |
| Phase | 0 docs · 1 scaffold + auth + lesson (→ M1) · 2 educator view + vertical slice (→ M2) · 3 content types + authoring + migration (→ M3) · 4 SDK + games / simulators / EMR (2027) |
| Trace | Legacy content type (`docs/01` §4), source doc section, or stakeholder need (`docs/01` §2) |
| Status | `proposed` · `agreed` (mentor reviewed) · `implemented` (PR merged) · `verified` (acceptance test green) |

Every functional requirement is a testable "shall" statement. Numbers that are not in the source documents are marked *target* and are engineering defaults to be confirmed.

## 2. Functional requirements

### 2.1 Student (FR-S)

| ID | Requirement | Pri | Phase | Trace | Status |
|---|---|---|---|---|---|
| FR-S-01 | The system shall let a person register with email, display name and password; the password shall be stored as an argon2id hash and never logged. | M | 1 | Stakeholder: student; SYSTEM-OVERVIEW §1 "no login" | implemented |
| FR-S-02 | The system shall let a registered user log in with email + password and receive an opaque server-side session cookie; five consecutive failures per account within 15 min (*target*) shall delay further attempts. | M | 1 | 03-architecture § sessions | implemented |
| FR-S-03 | The system shall let a user sign in with Google; a Google identity with a verified email matching an existing account shall link to that account, otherwise a new `student` account is created. | M | 2 | Owner decision: auth | implemented |
| FR-S-04 | The system shall let a user log out, revoking the current session server-side; a revoked session cookie shall be rejected on the next request. | M | 1 | 03-architecture § sessions | implemented |
| FR-S-05 | The system shall let a user request a password reset by email; the reset link shall be single-use and expire within 60 min (*target*). | S | 2 | Stakeholder: student | proposed |
| FR-S-06 | The system shall let a student join a cohort by entering its current join code; a rotated or unknown code shall be rejected with a clear message; joining twice shall be idempotent. | M | 2 | Owner decision: cohorts; BRIDGES §5 identity gap | implemented |
| FR-S-07 | The system shall list the 13 subjects and, per subject, its published lessons and activities in author-defined order, showing the student's completion / mastery state next to each. | M | 1 | ARCHITECTURE §3.1 (13 subjects) | implemented |
| FR-S-08 | The system shall render a published lesson as ordered pages shown one at a time with previous / next controls, a page indicator, and deep-linkable page URLs; rich text shall be rendered from the closed ProseMirror schema without `{@html}`. | M | 1 | Legacy: paged lesson (`lesson-page-N`, 96 pages) | implemented |
| FR-S-09 | The system shall remember the student's furthest page per lesson and offer to resume there on return. | S | 1 | Stakeholder: student | proposed |
| FR-S-10 | The system shall let a student answer a knowledge check embedded in a lesson page and shall return correctness and the explanation immediately on submit; the answer is recorded as an `attempt_item` in the lesson attempt. | M | 1 | Legacy: knowledge check (`lessonCorrectAnswers`) | implemented |
| FR-S-11 | The system shall grade a lesson attempt as the union of its knowledge checks (score = correct / total) and mark it complete when the last page has been viewed. | M | 1 | 03-architecture § grading | implemented |
| FR-S-12 | The system shall let a student start a quiz attempt only while `attempts_allowed` is not exhausted, and shall show the remaining attempts before starting. | M | 3 | Legacy: quiz; `quiz.attempts_allowed` | implemented (v0.3.0 note: `attempts_allowed` is not yet enforced — see docs/03-architecture.md §6.2) |
| FR-S-13 | The system shall shuffle question order and, per question, option order when the quiz's `shuffle` flag is set, and shall persist the presented order in the attempt so grading and review are stable. | M | 3 | Legacy: quiz | implemented (v0.3.0 deviation: `shuffle` is stored in `activity.config` but the player presents snapshot order for e2e determinism — see docs/03-architecture.md §6.2) |
| FR-S-14 | The system shall grade a submitted quiz, show score, percent, per-question correctness and explanations, and award a badge when percent ≥ the quiz's `pass_percent` (default 80). | M | 3 | Legacy: quiz badge at ≥ 80 % (ARCHITECTURE §4.2) | implemented |
| FR-S-15 | The system shall autosave quiz responses per item during the attempt so a reload resumes the attempt rather than losing it. | S | 3 | Stakeholder: student | implemented |
| FR-S-16 | The system shall support the six question types single_choice, true_false, multi_select, numeric_tolerance, ordering and matching in quizzes, each with a deterministic grader. | M | 3 | 03-architecture § data model (`question.type`) | implemented (v0.3.0 deviation: quiz questions are `single_choice` only; the other five types are reduced to per-item single-choice via `gradeable_items` rather than given dedicated graders — see docs/03-architecture.md §6.3) |
| FR-S-17 | The system shall present a flashcard deck one card at a time (term → reveal definition), let the student mark each card *known* or *review*, cycle *review* cards until all are known, and record the attempt with a score tier (*target*: Gold ≥ 96 %, Silver 90–95 %, Bronze 80–89 % known on first pass). | M | 3 | Legacy: flashcards (`{term, definition}`) | implemented |
| FR-S-18 | The system shall present a matching activity as `present_n` randomly selected pairs from the set, accept drag-and-drop **and** keyboard selection, grade on submit, and mark mastery at ≥ `pass_percent` (default 80). | M | 3 | Legacy: matching (`{name, description}`, 80 % mastery) | implemented (v0.3.0 deviation: `present_n` is stored but the player presents all pairs — per-attempt sampling arrives with assessment mode; see docs/03-architecture.md §6.2) |
| FR-S-19 | The system shall present a sequencing activity as shuffled items to be placed in order, grade by exact position match (partial credit per correct position), and record the attempt. | M | 3 | Legacy: timeline / sequencing (`patient_journey_sequencer_activity`) | proposed |
| FR-S-20 | The system shall provide calculator activities (MU, TMR/PDD first) whose inputs are validated, whose lookups read published `data_table` versions, and whose graded exercises compare the student's answer with the computed answer within a tolerance. | M | 3 | Legacy: calculators (`pddData`, `tmrData`, wedge, tray) | proposed |
| FR-S-21 | The system shall host simulator activities as code-backed pages behind authentication that post attempts through the SDK. | S | 4 | Legacy: ~10 canvas / three.js simulators; APPS-CATALOG summary | proposed |
| FR-S-22 | The system shall show a student their own results: per activity best percent, latest attempt, attempts used, badges earned, and per-attempt item review where the activity allows it. | M | 1 (minimal), 3 (full) | Stakeholder: student; BRIDGES §5 (results device-bound today) | implemented |
| FR-S-23 | The system shall not show a student any other student's results or cohort-relative ranking unless the educator enables it for the cohort (default off; see 01 Q4). | M | 2 | Stakeholder: privacy | proposed |

### 2.2 Educator (FR-E)

| ID | Requirement | Pri | Phase | Trace | Status |
|---|---|---|---|---|---|
| FR-E-01 | The system shall let an educator create a cohort with a name and optional start / end dates; the creator becomes its owner. | M | 2 | Owner decision: cohorts | implemented |
| FR-E-02 | The system shall generate a join code per cohort and let the owner rotate it; the previous code shall stop working immediately. | M | 2 | Owner decision: cohorts | implemented |
| FR-E-03 | The system shall show the cohort roster (display name, email, joined date, last activity) and let the owner remove a member. | M | 2 | Stakeholder: educator | implemented |
| FR-E-04 | The system shall show a cohort overview: per activity, the count of students attempted / passed and mean best percent; per student, activities attempted / passed; highlighting activities and students below a configurable threshold (*target* 70 %). | M | 2 | Stakeholder: educator ("who is struggling") | implemented |
| FR-E-05 | The system shall show per-student detail within a cohort: every activity result with best / latest percent, attempts, time spent, and per-attempt item responses. | M | 2 | Stakeholder: educator; SYSTEM-OVERVIEW §1 educators | implemented |
| FR-E-06 | The system shall show per-activity statistics for a cohort: attempts, pass rate, score distribution, per-item difficulty (percent correct) and the most common wrong answers. | M | 3 | Stakeholder: educator ("which activities work") | implemented |
| FR-E-07 | The system shall show per-outcome mastery for a cohort and per student: for each outcome code, percent of tagged items answered correctly and number of students below threshold. | M | 3 | BRIDGES §5 outcome vocabularies; 01 Q3 | implemented (v0.3.0 deviation: covers quiz items only — see docs/03-architecture.md §7) |
| FR-E-08 | The system shall export any cohort view as CSV (UTF-8, header row, one row per student-activity or student-outcome) containing no fields beyond those visible on screen. | S | 3 | Stakeholder: educator (grading); NG1 | implemented |
| FR-E-09 | The system shall restrict every educator read to cohorts the educator owns, enforced in the database query, not only in the UI. | M | 2 | 03-architecture § authorization | implemented |
| FR-E-10 | The system shall write an `audit_log` row (actor, action, target student / cohort, timestamp, request id) for every educator read of student data and every export. | M | 2 | Assumption A2; risk: student data | implemented |
| FR-E-11 | The system shall show educators the same student-facing rendering of any published activity (preview as student) without creating attempts. | S | 3 | Stakeholder: educator | proposed |

### 2.3 Content author (FR-A)

| ID | Requirement | Pri | Phase | Trace | Status |
|---|---|---|---|---|---|
| FR-A-01 | The system shall let an author create a lesson under a subject with title, slug, order and outcome tags, and edit its pages in a rich-text editor limited to the closed schema (`doc, paragraph, heading 2–4, bulletList, orderedList, listItem, blockquote, table, image, callout, math, hardBreak`; marks `bold, italic, underline, link(https), code, sub, sup`). | M | 3 | 03-architecture § rich text; Legacy: paged lesson | proposed |
| FR-A-02 | The API shall reject any lesson body containing a node or mark outside the closed schema with a 422 problem detail naming the offending path. | M | 1 | 03-architecture § rich text (`prose-doc.schema.json`) | proposed |
| FR-A-03 | The system shall let an author add, reorder and delete lesson pages, and place `knowledge_check`, `media`, `embed` and `callout` blocks on a page. | M | 3 | 03-architecture § data model (`lesson_page`, `content_block`) | proposed |
| FR-A-04 | The system shall provide a form-based builder for each of the six question types with stem (rich text), options / answer key, explanation, difficulty and outcome tags, and shall validate the body against the question JSON schema before save. | M | 3 | 03-architecture § data model (`question`) | proposed |
| FR-A-05 | The system shall let an author assemble a quiz from existing questions (search, add, reorder), set `pass_percent`, `shuffle` and `attempts_allowed`. | M | 3 | Legacy: quiz | proposed |
| FR-A-06 | The system shall let an author create and edit flashcard decks (term, definition, optional image), matching sets (pairs, `present_n`, `pass_percent`) and sequencing sets (ordered items) with row-level add / reorder / delete and bulk paste from tab-separated text. | M | 3 | Legacy: flashcards, matching, sequencing | proposed |
| FR-A-07 | The system shall let an author create and edit `data_table` grids (key, units, row / column headers, numeric cells) in a spreadsheet-style editor and shall reject non-numeric cells. | M | 3 | Legacy: inline `pddData` / `tmrData` / wedge / tray | proposed |
| FR-A-08 | The system shall let an author upload an image by requesting a presigned URL, uploading directly to object storage, then confirming; the API shall verify size (*target* ≤ 10 MB), MIME (`image/png, image/jpeg, image/webp, image/svg+xml` with SVG sanitized) and SHA-256 before the asset becomes referencable; alt text is required. | M | 3 | 03-architecture § services (storage); NFR accessibility | proposed |
| FR-A-09 | The system shall keep an author's edits as a working copy that students never see until published. | M | 3 | 03-architecture § content versioning | proposed |
| FR-A-10 | The system shall let an author preview the working copy exactly as a student would see it. | M | 3 | Stakeholder: author | proposed |
| FR-A-11 | The system shall let an author publish a lesson or activity, creating an immutable `content_version` with an incrementing version number, author, timestamp and change note; students shall see the new version on next load. | M | 3 | 03-architecture § content versioning | proposed |
| FR-A-12 | The system shall list an item's version history and let an author roll back by publishing a previous snapshot as a new version; attempts pinned to any version shall continue to grade against that version. | M | 3 | 01 M15; risk: re-grade stability | proposed |
| FR-A-13 | The system shall let an author unpublish (archive) an activity so it no longer appears to students while its attempts and versions are retained. | S | 3 | Stakeholder: author | proposed |
| FR-A-14 | The system shall let an author tag activities and questions with outcome codes from a program-managed `outcome` list. | M | 3 | FR-E-07 | proposed |

### 2.4 Program administrator (FR-M)

| ID | Requirement | Pri | Phase | Trace | Status |
|---|---|---|---|---|---|
| FR-M-01 | The system shall let an admin list and search users and change a user's role among `student`, `educator`, `admin`; the change shall be audited and take effect on the user's next request. | M | 2 | Owner decision: roles | implemented |
| FR-M-02 | The system shall let an admin deactivate a user: all sessions revoked, login refused, data retained; and reactivate. | M | 2 | Risk: student data (deactivate / erase) | implemented |
| FR-M-03 | The system shall let an admin erase a user: PII replaced with a tombstone (`erased-<id>`), identities and sessions deleted, attempts retained pseudonymously for cohort statistics; the action is audited and irreversible. | M | 2 | Risk: student data; NFR privacy | implemented |
| FR-M-04 | The system shall let an admin view and filter the audit log by actor, action, target and date range. | M | 2 | FR-E-10 | implemented |
| FR-M-05 | The system shall let an admin manage the `outcome` list and subject metadata. | S | 3 | FR-A-14 | proposed |
| FR-M-06 | The system shall seed a fresh instance with an admin, an educator, one cohort, one subject with a published lesson + quiz and 10 fake students with attempts via `make seed`. | M | 1 | 03-architecture § compose (dev) | proposed |

### 2.5 System, migration and SDK (FR-X)

| ID | Requirement | Pri | Phase | Trace | Status |
|---|---|---|---|---|---|
| FR-X-01 | The system shall record every scored interaction as an `attempt` (user, activity, `content_version_id`, started / submitted timestamps, status, score / max / percent, passed, duration, source, `client_meta`) with one `attempt_item` per answered item (`item_key`, response JSON, correct, score, time_ms). | M | 1 | SYSTEM-OVERVIEW §6 (integration spine); BRIDGES §5 superset | proposed |
| FR-X-02 | The system shall maintain an `activity_result` rollup per (user, activity) — best percent, latest attempt, attempt count, first passed at, mastery — updated transactionally on submit. | M | 2 | 03-architecture § data model | implemented |
| FR-X-03 | `POST /attempts/{id}/submit` shall honour an `Idempotency-Key` header: a repeated submit with the same key shall return the original result and create no second attempt. | M | 1 | ADR-004; SDK offline queue | proposed |
| FR-X-04 | The system shall strip answer keys and explanations from activity snapshots served to students before submit, and shall grade only server-side. | M | 1 | Legacy: answers inline in page JS | proposed |
| FR-X-05 | The system shall serve content to students only from published `content_version` snapshots, never from working-copy rows. | M | 1 | 03-architecture § content versioning | proposed |
| FR-X-06 | `tools/migrate-legacy` shall classify each legacy HTML page under the 13 subject folders into one of five patterns (paged lesson with knowledge checks, quiz, flashcards, matching, sequencing) or `unsupported`, convert supported pages into draft lessons / questions / activities via the authoring API, and emit a per-page report (`converted / needs-review / unsupported`, with reasons) as JSON and Markdown. | M | 1 (2 lessons), 3 (all patterns) | ARCHITECTURE §4 page anatomy; risk: legacy inconsistency | implemented |
| FR-X-07 | The migration shall preserve the CC BY-NC 4.0 notice on migrated content and the required Sketchfab credit lines on any migrated page that referenced a model. | M | 3 | ARCHITECTURE §7; 01 constraints | implemented |
| FR-X-08 | The migration shall be re-runnable: re-importing a page that was already imported shall update the draft, not duplicate it (keyed by legacy path). | S | 3 | Stakeholder: developer | implemented |
| FR-X-09 | The migration shall produce golden-file tests for at least three legacy pages (one lesson, one quiz, one matching) that fail when the mapper output changes. | M | 1 | 03-architecture § testing | implemented |
| FR-X-10 | `@rtapps/sdk` shall expose `start(activityId)`, `item(key, response)`, `submit()` and shall post the same attempt payload the web client uses, with an `Idempotency-Key` per attempt and a localStorage queue that retries on reconnect. | S | 4 (stub in 1) | SYSTEM-OVERVIEW §6 "one bridge script"; ADR-004 | proposed |
| FR-X-11 | Legacy games and simulators shall be re-hosted as `external` / `simulator` activities behind authentication and shall post attempts via the SDK; their attempts shall appear in cohort analytics identically to web attempts. | S | 4 | SYSTEM-OVERVIEW §6 (games report nothing); APPS-CATALOG summary | proposed |
| FR-X-12 | The API shall publish `openapi.json`; CI shall regenerate `packages/api-client` and fail if the checked-in client differs. | M | 1 | 03-architecture § API | proposed |
| FR-X-13 | All list endpoints shall use cursor pagination `{items, next_cursor}`; all errors shall be RFC 9457 `application/problem+json`. | M | 1 | 03-architecture § API | proposed |
| FR-X-14 | The EMR library (38 fictional patients) shall be re-hosted as an `external` activity using one canonical patient schema with an adapter for the other legacy schema. | C | 4 | SYSTEM-OVERVIEW §4 (two patient libraries) | proposed |

### 2.6 Won't have in Release 1 (W)

Recorded so they are not re-proposed without a trigger. See `docs/01` §3.2 non-goals and §4 scope table.

| ID | Requirement | Pri | Reconsider when |
|---|---|---|---|
| FR-W-01 | LTI 1.3 / SCORM / xAPI export to an institutional LMS. | W | The program asks for grade passback; CSV export (FR-E-08) is the interim. |
| FR-W-02 | Native mobile app or installable PWA with offline lessons. | W | Student interviews (`docs/01` ST1) show mobile-only use. |
| FR-W-03 | AI-generated questions, explanations or grading. | W | Not planned. |
| FR-W-04 | Cross-cohort or year-over-year comparison dashboards. | W | After one full cohort cycle of data exists (2027). |
| FR-W-05 | Spaced-repetition scheduling for flashcards. | W | Student interviews (ST5) show demand; needs a background worker (A5). |
| FR-W-06 | Co-educators on a cohort (multiple owners). | W | Mentor interview M11; `enrollment.role` already allows it. |
| FR-W-07 | Free-form HTML or embedded scripts in lesson content. | W | Never; the closed schema (FR-A-02, NFR-09) is a security boundary. |
| FR-W-08 | Real DICOM or real patient data of any kind. | W | Never (NG2). |

## 3. Non-functional requirements

Each NFR has a verification method that runs in CI or is recorded in `docs/05-setup.md`; "review" means a checklist item in the PR template.

### 3.1 Performance and scalability

| ID | Requirement | Pri | Phase | Verification |
|---|---|---|---|---|
| NFR-01 | Lesson page load (SSR, warm cache, seed data) p95 < 1.0 s *target*; attempt submit p95 < 300 ms *target*; cohort overview for 50 students × 100 activities p95 < 1.5 s *target*, measured on the test VM. | M | 2 | Load script recorded in `docs/05-setup.md`; Playwright timing assertions in smoke |
| NFR-02 | No API response shall stream media; all media is served from object storage via presigned or public-read URLs. | M | 3 | Code review; integration test asserts redirect / URL |
| NFR-28 | Design point: 1 program, ≤ 500 students, ≤ 20 educators, ≤ 2,000 activities, ≤ 500 k attempts *target*; no horizontal scaling in Release 1. | S | 2 | Load script |

### 3.2 Availability and disaster recovery

| ID | Requirement | Pri | Phase | Verification |
|---|---|---|---|---|
| NFR-03 | Single VM; planned maintenance windows acceptable; unplanned downtime < 8 h/month *target*. `/health` returns DB and storage status. | S | 2 | Uptime check from Cloudflare or a cron curl |
| NFR-04 | Nightly `pg_dump` to object storage, 30-day retention, encrypted at rest. RPO ≤ 24 h; RTO ≤ 4 h *target* via documented restore. Restore rehearsed at least once per phase. | M | 2 | `backup.sh` in cron container; restore log in setup docs |

### 3.3 Security

| ID | Requirement | Pri | Phase | Verification |
|---|---|---|---|---|
| NFR-05 | Sessions: opaque 256-bit token stored hashed; cookie `rt_session` `HttpOnly; Secure; SameSite=Lax`; 14-day sliding expiry; revocable server-side; UA hash checked. | M | 1 | pytest session suite |
| NFR-06 | Passwords hashed with argon2id (memory ≥ 64 MiB, time ≥ 3 *target*); minimum 10 characters *target*; no maximum below 128; no composition rules. | M | 1 | pytest |
| NFR-07 | CSRF: `SameSite=Lax` plus `Origin` / `Referer` allow-list on every non-GET; requests without a valid origin rejected 403. | M | 1 | pytest permission suite |
| NFR-08 | HTTPS only in production (Caddy TLS or Cloudflare Tunnel); HSTS enabled; HTTP → HTTPS redirect. | M | 2 | curl in deploy health check |
| NFR-09 | No `{@html}` in the web app; rich text rendered by `ProseNode.svelte` from the closed schema; unknown nodes rejected at the API and skipped by the renderer. ESLint rule bans `{@html}`. | M | 1 | eslint in CI; vitest unknown-node test |
| NFR-10 | Secrets only in `/opt/rtapps/.env` on the VM and GitHub Environment secrets; never in images, logs or the repo; `.env.example` documents every key. | M | 2 | Secret-scan step in CI; review |
| NFR-11 | Authorization is a FastAPI dependency; cohort ownership and program scope are checked in the SQL query; a permission matrix test covers every route × role. | M | 1 | pytest permission matrix |
| NFR-12 | Dependabot for uv, pnpm and GitHub Actions; security updates merged within 14 days *target*; no runtime CDN scripts (all JS bundled and pinned) — contrast ARCHITECTURE §7.4. | M | 1 | Repo settings; `pnpm audit` / uv audit step in CI |
| NFR-13 | Rate limits on `login`, `register`, password reset and `join` (*target* 10 / min / IP) with 429 problem responses. | S | 2 | pytest — implemented v0.3.0 (per-IP; see docs/06-operations.md §11 for the X-Forwarded-For caveat) |
| NFR-30 | Cross-window messaging (if any simulator iframe remains in Phase 4) shall set an explicit `targetOrigin` and check `event.origin`; `'*'` is banned by lint. | M | 4 | eslint rule; review (BRIDGES §7, AUDIT F7) |

### 3.4 Privacy and data retention

| ID | Requirement | Pri | Phase | Verification |
|---|---|---|---|---|
| NFR-14 | PII limited to display name, email and cohort membership; no DOB, student number or photo; no PII in URLs or logs; educator reads audited (FR-E-10); erase supported (FR-M-03). | M | 2 | Schema review; log grep test |
| NFR-15 | Fictional patients only in EMR / DICOM content; a content checklist in `docs/04-conventions.md` requires authors to confirm this on upload. | M | 4 | Review |
| NFR-26 | Attempts and `content_version` snapshots retained indefinitely (pseudonymized after erase); sessions purged 30 days after expiry; audit log retained ≥ 2 years *target*; backups 30 days. | S | 2 | Purge job test — implemented v0.3.0 (`app.tasks.purge_sessions`; scheduled via the VM crontab, docs/06-operations.md §5) |

### 3.5 Accessibility and browser support

| ID | Requirement | Pri | Phase | Verification |
|---|---|---|---|---|
| NFR-16 | Student-facing pages meet WCAG 2.1 AA: semantic headings, contrast ≥ 4.5:1, alt text required on images, visible focus, no information by colour alone. | M | 1 (lesson), 3 (all types) | axe-core in Playwright; manual keyboard pass per type — verified by `apps/web/e2e/ui.e2e.ts` (axe scans of every route reachable with seeded data) and `apps/web/src/lib/ui/tokens.test.ts` (token contrast) |
| NFR-17 | Every activity is fully keyboard operable, including matching and sequencing (select-then-place alternative to drag-drop); screen-reader announcements for feedback. | M | 3 | Playwright keyboard-only scenario per type |
| NFR-18 | Last two major versions of Chrome, Edge, Firefox and Safari on desktop; current iOS Safari and Android Chrome for reading and quizzes; no IE. Layout usable from 360 px width. | M | 1 | Playwright projects (Chromium, Firefox, WebKit); manual mobile check — verified by `apps/web/e2e/ui.e2e.ts` (no sideways scroll at 360 px, `mobile-360` project) |
| NFR-29 | English only; UI strings kept in one place per app so translation is a data change later. | C | 3 | Review |

### 3.6 Maintainability and observability

| ID | Requirement | Pri | Phase | Verification |
|---|---|---|---|---|
| NFR-19 | CI required on `main`: ruff, mypy (strict on `app/`), pytest with Postgres, eslint, svelte-check, vitest, contract check, Playwright smoke, image build. Coverage gate 70 % on `grading` and `auth` (Phase 1), 70 % on `api/app` overall by Phase 3 *target*. | M | 1 | Branch protection; coverage report |
| NFR-20 | Conventions in `docs/04-conventions.md`; one ADR per significant decision; generated code (`api-client`) never hand-edited. | M | 2 | Review |
| NFR-21 | `make dev` from a clean clone to all healthchecks green in < 10 min *target* on a laptop, with no host-installed runtimes besides Docker, pnpm and uv. | M | 1 | Fresh-clone test recorded per phase |
| NFR-22 | Structured JSON logs (request id, user id, route, status, duration) from api and proxy; no PII beyond user id; log level configurable by env. | M | 2 | Log sample in setup docs |
| NFR-23 | `/health` (liveness + DB + storage) and counters for attempts submitted and errors; unhandled exceptions reported to an error tracker (Sentry free tier or equivalent) *target*. | S | 2 | Deploy health curl; error tracker screenshot |

### 3.7 Portability and licensing

| ID | Requirement | Pri | Phase | Verification |
|---|---|---|---|---|
| NFR-24 | Object storage accessed only through the S3 API (SeaweedFS in dev, R2 / OCI in prod); `compose.prod.yaml` runs on any Docker host; images multi-arch (arm64 + amd64). | M | 2 | CI builds both archs; MinIO in CI |
| NFR-25 | Schema managed by Alembic; `alembic upgrade head` runs as a one-shot deploy step; every migration has a downgrade and a dry-run on a throwaway DB in `main.yml`. | M | 1 | CI job |
| NFR-27 | Migrated workbook content displays its CC BY-NC 4.0 notice; Sketchfab credit lines rendered wherever a model is shown; the unlicensed human-body model is not included until provenance is documented. | M | 3 | Review; migration test asserts notice block |

## 4. Traceability matrix

Legacy content type (from `rtt_e_workbook/docs/ARCHITECTURE.md` §4 and SYSTEM-OVERVIEW §1) → requirements → phase.

| Legacy content type | Legacy evidence | Student FRs | Author FRs | Educator / system FRs | Phase |
|---|---|---|---|---|---|
| Paged lesson with knowledge checks | `lesson-page-N` (96 pages), `lessonCorrectAnswers`; e.g. `Radiation_Biology/RBE_and_OER/index.html` | FR-S-07, 08, 09, 10, 11, 22 | FR-A-01, 02, 03, 09–12 | FR-X-01, 04, 05, 06, 09; FR-E-04, 05 | 1 (render + grade), 3 (author) |
| Quiz with badge | `{question, options, answer, explanation}` arrays; `generateBadge()`; e.g. `Ethics/HIPAA/index.html` | FR-S-12, 13, 14, 15, 16 | FR-A-04, 05 | FR-X-01, 03, 06; FR-E-06 | 3 |
| Flashcards | `{term, definition}` decks | FR-S-17 | FR-A-06 | FR-X-01, 06 | 3 |
| Matching (drag-drop) | `{name, description}` pairs, 80 % mastery | FR-S-18 | FR-A-06 | FR-X-01, 06; NFR-17 | 3 |
| Sequencing / timeline | `patient_journey_sequencer_activity.html` and similar | FR-S-19 | FR-A-06 | FR-X-01, 06 | 3 |
| Calculators with inline data grids | `pddData`, `tmrData`, wedge / tray tables in ~10 pages | FR-S-20 | FR-A-07 | FR-X-01, 05 | 3 (MU, TMR/PDD), later for the rest |
| Canvas / three.js simulators | ~10 pages with `importmap` three.js; `3D_LINAC/`, `apps/ct_4d/` | FR-S-21 | — | FR-X-10, 11; NFR-30 | 4 |
| EMR library | `apps/patient_library/*.json` (38 parseable of 39) | — | — | FR-X-14; NFR-15 | 4 |
| DICOM alignment / viewers | `apps/image_alignment/`, `apps/mediastinal_lymph_node_seg/` | — | — | FR-X-11; NFR-02 | 4 |
| Games (RT-Games) | ~45 single-file games; none record results | — | — | FR-X-10, 11 | 4 |
| Result bridges (three schemas) | `BRIDGES-AND-STORAGE.md` §5 | FR-S-22 | — | FR-X-01, 02, 03, 10; FR-E-04–08 | 1–2 (schema), 4 (SDK) |
| Identity (none today) | SYSTEM-OVERVIEW §1 "no login"; `?studentId=` URL param | FR-S-01–06, 23 | — | FR-E-01–03, 09, 10; FR-M-01–04; NFR-05–07, 14 | 1–2 |
| Content editing (hand-edited HTML) | 155/161 pages with inline JS; no metadata | — | FR-A-01–14 | FR-X-06–09; NFR-27 | 3 |
| Outcome tagging (three vocabularies) | `outcomeCode` / `slo_id` / `competencies[]` | — | FR-A-14; FR-M-05 | FR-E-07 | 3 |

Stakeholder needs not tied to a legacy type: developer / maintainer → NFR-19–25, FR-M-06, FR-X-12, 13; program / institution → NFR-14, 15, 26, 27, 28.

## 5. Acceptance-test outline for Release 1

Automated where marked (Playwright e2e against Compose in CI; pytest against Postgres). Scenario IDs are referenced from FR status once green.

| ID | Scenario | Given | When | Then | Covers | Automation |
|---|---|---|---|---|---|---|
| AT-01 | Register and log in | A fresh instance seeded with subjects | A visitor registers with email, name, password and then logs in | A `rt_session` cookie is set (HttpOnly, Secure, SameSite=Lax); `GET /auth/me` returns the student; the password hash starts with `$argon2id$` | FR-S-01, 02; NFR-05, 06 | Playwright + pytest |
| AT-02 | Logout revokes session | A logged-in student | They log out and then replay the old cookie against `/auth/me` | The replay returns 401 and the `session` row is marked revoked | FR-S-04; NFR-05 | pytest |
| AT-03 | Google sign-in links by email | An existing email account for `a@x.edu`; a stubbed Google provider returning verified `a@x.edu` | The user completes Google sign-in | They land in the same account; one `identity` row exists; no duplicate user | FR-S-03 | pytest (Authlib stub) |
| AT-04 | Join cohort by code and rotation | An educator-owned cohort with code `ABC123` | Student A joins with `ABC123`; the educator rotates; Student B tries `ABC123` | A is enrolled once (second join is a no-op); B gets a 4xx problem "code no longer valid" | FR-S-06; FR-E-02 | Playwright + pytest |
| AT-05 | Paged lesson with knowledge check | A published migrated lesson (`RBE_and_OER`) | A student pages to a knowledge check, chooses the wrong option, submits, then chooses the right option on a second attempt | Immediate feedback with explanation both times; one `attempt` with two `attempt_item` rows pinned to the lesson's `content_version_id`; resume returns to the last page | FR-S-08, 09, 10, 11; FR-X-01, 04, 05 | Playwright + pytest |
| AT-06 | Idempotent submit | A student mid-quiz | The client sends `POST /attempts/{id}/submit` twice with the same `Idempotency-Key` | One graded attempt; second response is byte-equal to the first; `activity_result.attempts` = 1 | FR-X-03, 02 | pytest |
| AT-07 | Quiz limits, shuffle and badge | A quiz with `attempts_allowed = 2`, `shuffle = true`, `pass_percent = 80` | A student scores 60 % then 90 % | First result: no badge, "1 attempt left"; second: badge awarded; third start is refused; option order in the two attempts is recorded and differs at least once | FR-S-12, 13, 14; FR-X-02 | Playwright + pytest |
| AT-08 | Question graders | The six question types with fixtures | Property-based tests (hypothesis) run valid and invalid responses | Each grader is pure, deterministic, rejects malformed responses with a schema error and never returns score > max | FR-S-16; NFR-19 | pytest + hypothesis |
| AT-09 | Flashcards, matching, sequencing | One published activity of each type | A student completes each using keyboard only | Each creates an attempt with per-item detail; matching mastery is true at ≥ 80 %; flashcard tier matches the known-count rule; sequencing partial credit equals correct positions / total | FR-S-17, 18, 19; NFR-17 | Playwright (keyboard project) + pytest |
| AT-10 | Calculator with data table | Published `pdd_6mv` table v1; an MU exercise | The author publishes table v2 with a changed cell; a student who started on v1 submits | The v1 attempt grades against v1; a new attempt uses v2; both pin their `content_version_id` | FR-S-20; FR-A-07, 11, 12; FR-X-05 | pytest |
| AT-11 | Educator sees the result (vertical slice) | AT-05 completed by a student in cohort C owned by educator E; educator F owns no cohort | E opens cohort overview and the student's detail; F requests the same URLs | E sees the attempt within one refresh; F receives 403; two `audit_log` rows exist for E, none for F | FR-E-04, 05, 09, 10; NFR-11 | Playwright against test URL + pytest |
| AT-12 | Per-activity, per-outcome, CSV | Seed cohort with 10 fake students and tagged questions | E opens activity stats and outcome mastery and exports CSV | Item difficulty and outcome percentages match a pytest-computed expectation; CSV has header + 10 rows and no columns beyond the view; an export audit row exists | FR-E-06, 07, 08, 10 | Playwright + pytest |
| AT-13 | Author edits, previews, publishes, rolls back | An author account; a lesson at v1 | The author adds a page with an image (presigned upload) and a knowledge check, previews, publishes (v2), then rolls back | Preview shows the draft while students still see v1; after publish students see v2; after rollback students see v3 (= v1 content); an unknown node in the body is rejected 422 | FR-A-01–03, 08–12; NFR-02 | Playwright + pytest |
| AT-14 | Migration report and golden files | Three legacy pages (lesson, quiz, matching) by path | `tools/migrate-legacy` runs twice | Output equals golden files; second run updates rather than duplicates drafts; report counts `converted / needs-review / unsupported`; migrated lesson carries the CC BY-NC notice | FR-X-06, 07, 08, 09; NFR-27 | pytest golden files |
| AT-15 | Admin role change, deactivate, erase | A student with attempts in cohort C | Admin promotes to educator, deactivates, then erases | Role change is audited and effective on next request; deactivated user's session is refused; after erase the user row is a tombstone, identities / sessions gone, attempts still counted in C's stats; audit rows for all three | FR-M-01–04; NFR-14, 26 | pytest |
| AT-16 | Clean-clone dev environment and CI gate | A machine with Docker, pnpm, uv only | `make dev` then `make seed`; a PR with a failing test is opened | All healthchecks green; seed users can log in; the PR is blocked by required checks | FR-M-06; NFR-19, 21 | Manual (recorded) + GitHub branch protection |
| AT-17 | Deploy and restore | A push to `main`; last night's backup object | `deploy.yml` runs; the restore procedure is followed on a throwaway DB | `/health` returns 200 from the test URL; AT-11 passes against it; restored DB contains yesterday's attempts | NFR-03, 04, 08, 24, 25 | Workflow log + restore log |

Mapping to the learning objectives: AT-01, 02, 05, 06, 08, 14, 16 must be green for M1; AT-03, 04, 11, 15, 17 for M2; AT-07, 09, 10, 12, 13 for M3 / 2026-12-19.

## 6. Open items awaiting interview answers

Requirements whose wording or priority depends on `docs/01` §8 answers. Until answered, the value shown in §2 is the engineering default taken from legacy behaviour.

| Question (`docs/01` §6.2 / §8) | Requirements affected | Default in force |
|---|---|---|
| Q1 / M5 — pass mark | FR-S-14, FR-S-18, FR-A-05, FR-A-06 | 80 %, per-activity configurable |
| Q2 / M5 — attempts allowed; best vs latest | FR-S-12, FR-X-02, FR-E-04 | unlimited unless set; rollup keeps best and latest, views show best |
| Q3 / M9 — outcome vocabulary | FR-A-14, FR-M-05, FR-E-07 | empty `outcome` list; seed after answer |
| Q4 / M10 / ST4 — cohort-relative standing | FR-S-23 | off |
| Q5 / M12 / ST6 — per-item visibility to educators | FR-E-05, FR-E-10 | visible, every read audited |
| Q6 / M7 — what a cohort is | FR-E-01, FR-E-02, FR-S-06 | free-form name + optional dates |
| Q7 / M13 — calculator order and tables | FR-S-20, FR-A-07 | MU, then TMR/PDD, with legacy tables |
| Q8 / M14 — content to skip or keep verbatim | FR-X-06, FR-X-08 | migrate everything classifiable; flag the rest |
| M6 — badge semantics | FR-S-14, FR-S-22 | per-quiz, permanent |
| M15 — re-grade after a fix | FR-A-12 | never re-grade; new version applies to new attempts |
| ST1 — devices | NFR-18 | desktop first, mobile for reading and quizzes |

## 7. Change log

| Date | Change | By |
|---|---|---|
| 2026-08-27 | Initial draft for Phase 0 review | Chris Guzman |
| 2026-09-01 | v0.3.0 status sweep: quiz/badge, flashcards, matching (FR-S-12–18), educator activity stats/outcome mastery/CSV (FR-E-06/07/08), admin erase (FR-M-03), migration tool (FR-X-06–09), rate limiting (NFR-13) and session purge (NFR-26) marked `implemented`; known v0.3.0 deviations noted inline (see docs/03-architecture.md §6.2/§6.3/§7 and ADR-0006) | Chris Guzman |
