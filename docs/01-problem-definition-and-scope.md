# RTApps — Problem definition and scope

| | |
|---|---|
| Document | `docs/01-problem-definition-and-scope.md` |
| Status | Draft for mentor review (Phase 0) |
| Owner | Chris Guzman (lead developer) |
| Reviewer | Kevin Kindle (mentor, content author) |
| Related | `docs/02-requirements.md`, `docs/03-architecture.md`, `docs/adr/` |
| Sources | `rt-app/docs/SYSTEM-OVERVIEW.md`, `rt-app/docs/AUDIT-REPORT.md`, `rt-app/docs/rtt_e_workbook/docs/{ARCHITECTURE,APPS-CATALOG,BRIDGES-AND-STORAGE}.md` |

## 1. Problem statement

RTApps is a radiation-therapy (RT) education suite. Students in an RT program learn from a workbook of 13 subject modules (Ethics, Radiation Physics, Radiation Biology, Treatment Planning, Patient Care, and nine others) made of paged lessons with embedded knowledge checks, quizzes that award a badge at 80 %, flashcard decks, drag-and-drop matching, sequencing/timeline activities, dosimetry calculators (PDD, TMR, MU, wedge and tray factors), canvas/three.js simulators, a 38-patient fictional EMR library and DICOM alignment exercises. A companion repository holds roughly 45 arcade/quiz games tied to workbook topics. Educators need to see, per student and per cohort, which outcomes are mastered and which are weak, and which activities actually teach. The mentor, a radiation therapist, needs to write and revise this content himself.

The product that exists today cannot deliver this. All three legacy repositories (`rtt_e_workbook`, `RT-Games`, `RadTherapyPlatform`) are static GitHub Pages sites with no server, no database and no login. Every result a student produces is written, at best, to `localStorage` on the student's own device, and in most cases is not written anywhere at all: of the 161 topic-level workbook pages, **zero** load either result bridge, and none of the games report anything. Three independent "record a result" contracts exist (`RTAssessmentBridge`, the station bridge `window.RTApps`, and `window.RTPlatform`) with incompatible field names, score units (0–100, a 0–1 string, or score/max/percent), identity fields and outcome vocabularies (`outcomeCode` vs `slo_id` vs `competencies[]`). The educator platform's `education-assessment` module is a placeholder because it has nothing to read.

Content is equally locked in. 155 of 161 topic pages carry their own bespoke inline `<script>`; question banks are JavaScript arrays inside each page; calculator data grids (`pddData`, `tmrData`, wedge and tray tables) are hard-coded per page. There is no metadata: no lesson knows its subject, learning outcome, difficulty or version, and there are no shared question banks. Duplication is rife (15 games copied byte-for-byte into the workbook's `apps/hub/`, one already diverged; 10+ byte-identical internal duplicates; version suffixes such as `v2_index.html` in file names instead of history). 118 pages pull an unpinned Tailwind Play CDN and 19 pages load eight different three.js versions. Editing a lesson means editing HTML and JavaScript by hand, which the content author cannot do.

Because there is no identity, there is no notion of a cohort, an enrollment, an attempt or a student record. Because there is no server, there is nothing an educator on another machine could ever see. Because content and code are the same file, the author cannot publish without a developer. These are not defects to patch; they are the absence of the system.

RTApps will therefore be rebuilt from the ground up as a web application with a single account model, a single content model stored in the database and edited through an in-app authoring UI, and a single attempt/result record that every activity (workbook, games, simulators) writes to and every educator view reads from. Legacy code is a reference for *what* each activity does; none of it is reused as-is. Nothing is in production, so there is no migration of live users, only of content.

## 2. Stakeholders

| Stakeholder | Who | Needs | Success measure |
|---|---|---|---|
| Student | RT program learner (typically 1–2 year didactic program preparing for the ARRT exam) | Find and work through lessons in order; immediate feedback on knowledge checks; retake quizzes; see own progress and badges; works on the laptop they already have | Completes a lesson and a quiz without help; can see own results next day on another device |
| Educator / instructor | Program faculty running a cohort | Create a cohort, get students in with a code; see roster, per-student strengths/weaknesses, per-activity statistics, per-outcome mastery; export for grading | Answers "who is struggling with TMR calculations this week?" from one screen in under a minute |
| Content author | Kevin Kindle (mentor) | Write and edit lessons, questions, decks, matching sets, sequencing items and calculator data tables without touching code; preview; publish when ready; undo a bad publish | Edits and publishes a lesson unaided (Phase 3 exit criterion) |
| Program administrator | Whoever administers the institution's instance (initially Chris; later a faculty member) | Manage user roles; deactivate or erase a user; see the audit log; restore from backup | Every role change and every erase is a single action and is logged |
| Developer / maintainer | Chris Guzman (solo) now; possibly others later | A codebase one person can hold in their head; CI that catches regressions; one-command dev environment; one-workflow deploy; nothing that requires manual server work | `make dev` from a clean clone works; every PR runs the full suite; deploy is one workflow run |
| Program / institution | The RT program that owns the content and the student data | Content licensed correctly; student data handled with FERPA-like care; hosting cost near zero; no dependence on a single vendor | Passes an informal privacy review by the program; monthly hosting cost within free tier |

## 3. Goals and non-goals

### 3.1 Goals

| ID | Goal |
|---|---|
| G1 | Every student action that produces a score is recorded server-side as an `attempt`, pinned to the exact content version, and is visible to the student and to their cohort's educator. |
| G2 | One content model covers all seven workbook content types; content lives in the database, not in HTML files. |
| G3 | The content author can create, edit, preview, publish and roll back content through the browser without developer involvement. |
| G4 | Educators can answer per-student, per-cohort, per-activity and per-outcome questions from built-in views and a CSV export. |
| G5 | The legacy workbook's five common page patterns are migrated by a tool, not by hand, with a report of what needs human review. |
| G6 | The system is operable by one person: Docker Compose on one VM, GitHub Actions for CI/CD, nightly backups, a health endpoint, structured logs. |
| G7 | The attempt/result contract is stable enough that games, simulators and other future clients can post to it through an SDK without changing the server. |
| G8 | Student data is minimal (name, email, cohort), educator reads are audited, and a user can be deactivated or erased. |
| G9 | The internship learning-objective deliverables (Milestones M1, M2, M3 — see §7) are met by the phase exit criteria, not by separate work. |

### 3.2 Non-goals

| ID | Non-goal | Why |
|---|---|---|
| NG1 | A general-purpose LMS (gradebook, assignments, discussion, calendar) | The institution already has one; RTApps is the content and practice layer. LTI export is a later-phase question, not a Release 1 feature. |
| NG2 | Any clinical use, real patient data, or real DICOM from identifiable patients | Fictional patients only. The EMR library and DICOM cases are teaching props. |
| NG3 | Multi-institution SaaS in Release 1 | One `program` row now; the schema keeps `program_id` on every table so this can change later. |
| NG4 | A headless CMS or Markdown/MDX content pipeline | Decided: content in Postgres as ProseMirror JSON with an in-app editor (ADR-003). |
| NG5 | Native mobile apps, offline-first workbook | Responsive web only. The SDK's offline queue (Phase 4) is for games, not the workbook. |
| NG6 | AI-generated content or AI grading | All grading is deterministic per question type. |
| NG7 | Rewriting the ~45 games or the three.js simulators in Release 1 | They are re-hosted behind auth and connected via the SDK in Phase 4; their internals are untouched. |
| NG8 | Pixel-for-pixel reproduction of legacy pages | The migration tool maps content into the closed schema; layout is the new renderer's. |
| NG9 | Background job infrastructure in Release 1 | Grading is synchronous; `api/app/tasks/` is reserved. |

## 4. Scope of Release 1

Release 1 = the end of Phase 3 (Milestone M3): everything a student and an educator need for the 13 migrated subjects, plus the authoring UI. Phase numbers refer to `docs/03-architecture.md` § roadmap.

| Capability | Release 1 | Later | Notes |
|---|---|---|---|
| Accounts: email + password, Google OAuth, roles student / educator / admin, server-side sessions | **In** (email Phase 1, Google Phase 2) | | Self-hosted; no third-party identity provider beyond Google sign-in |
| Password reset by email | **In** (Phase 2) | | Requires outbound mail; Mailpit in dev |
| Cohorts: educator creates, rotatable join code, students join by code, roster | **In** (Phase 2) | | One educator owns a cohort; co-educators later |
| Subjects and lesson browsing (13 subjects) | **In** (Phase 1) | | |
| Paged lesson with embedded knowledge checks | **In** (Phase 1) | | Legacy `lesson-page-N` + `lessonCorrectAnswers` pattern |
| Quiz with attempt limit, shuffle, badge at ≥ 80 % | **In** (Phase 3) | | Legacy `{question, options, answer, explanation}` pattern |
| Flashcards: known / review, score tiers | **In** (Phase 3) | | Legacy `{term, definition}` pattern |
| Matching (drag-drop pairs, 80 % mastery, present N of M) | **In** (Phase 3) | | Legacy `{name, description}` pattern |
| Sequencing / timeline | **In** (Phase 3) | | |
| Calculators backed by author-editable data tables | **In** (Phase 3: MU, TMR/PDD first) | Remaining calculators as data tables are entered | Legacy inline `pddData` / `tmrData` / wedge / tray grids |
| Simulators (canvas / three.js) as code-backed activities | Out | Phase 4 (`external` / `simulator` activity kind + SDK) | Legacy code re-hosted behind auth, not rewritten |
| EMR library (38 fictional patients) | Out | Phase 4 | Two incompatible legacy schemas; one becomes canonical then |
| DICOM alignment / image viewers | Out | Phase 4 | Large case zips (5–32 MB) need object storage first |
| Games (RT-Games) | Out | Phase 4 via SDK | Zero games record results today |
| Authoring UI: lesson editor (TipTap, closed schema), question builders (six types), quiz / deck / matching / sequencing / data-table editors | **In** (Phase 3) | | The schedule risk; form-based builders, no free-form HTML |
| Draft → publish, immutable versions, rollback | **In** (Phase 3) | | Attempts pin `content_version_id` |
| Media upload (images) via presigned URLs to S3-compatible storage | **In** (Phase 3) | Video / 3-D assets (Phase 4) | Nothing streams through the API |
| Attempt capture with per-item detail, duration, content version, idempotent submit | **In** (Phase 1 for knowledge checks; Phase 3 for all types) | | The integration spine |
| Student sees own results and badges | **In** (Phase 1 minimal, Phase 3 full) | | |
| Educator analytics: cohort overview, per-student detail, per-activity stats, per-outcome mastery, CSV export | **In** (Phase 2 overview + student; Phase 3 activity, outcome, CSV) | Trend over time, cohort comparison | |
| Audit log of educator reads and admin actions | **In** (Phase 2) | | |
| Admin: user roles, deactivate, erase | **In** (Phase 2) | | |
| Legacy migration tool (`tools/migrate-legacy`) for the five common patterns, with per-page report | **In** (Phase 1 for 2 lessons; Phase 3 for all five patterns) | | `converted / needs-review / unsupported` |
| `@rtapps/sdk` for external clients (games, simulators) | Stub only | Phase 4 | Contract fixed in ADR-004 now, implemented later |
| LMS integration: LTI 1.3, SCORM, xAPI | Out | Not planned; revisit after Phase 4 if the program asks | CSV export is the interim |
| Mobile app | Out | Not planned | Responsive web |
| AI features | Out | Not planned | |
| Offline use | Out | SDK offline queue for games only (Phase 4) | |

## 5. Constraints

| Constraint | Consequence |
|---|---|
| Solo developer (Chris), part-time alongside other internship duties | Scope per phase is small; the authoring UI is form-based, not a page builder; no background worker in Release 1; every feature must be testable by automation, not by manual QA |
| Learning-objective milestones (order matters, dates are indicative): M1 (requirements, reviewed design, first version with tests + CI), M2 (stack ADR with ≥ 3 options, working vertical slice deployed to a test environment, setup/conventions docs), 2026-11-28 (≥ 3 modules complete, ≥ 3 mentor + ≥ 2 student feedback conversations, findings doc → backlog) | Phase exit criteria are the objectives; slipping a phase slips a deliverable |
| Stack decided (not re-argued here): SvelteKit + TypeScript, FastAPI + Python 3.12 + SQLAlchemy 2 + Alembic, PostgreSQL 16, content in DB with authoring UI, self-hosted auth, Docker Compose, GitHub Actions → GHCR, new private monorepo `rad-therapy-apps/rtapps` | ADR-001…005 record the reasoning; this document treats them as givens |
| Private repositories; legacy repos read-only | Migration tool reads legacy repos by path; nothing is written back |
| Licensing: legacy workbook content is CC BY-NC 4.0; Sketchfab models are four CC-BY-4.0 and one CC-BY-NC-SA-4.0 (`urinary_tract`), each requiring a specific credit line; the 86 MB human-body model has no licence or provenance | Migrated content keeps its CC BY-NC 4.0 notice; no commercial use; the model credit lines must be reproduced where the models are shown; the human-body model is not migrated until provenance is established |
| Student data handled with FERPA-like care; no real patients ever | PII limited to display name, email, cohort membership; no DOB or student number; educator reads audited; deactivate + erase endpoints; encrypted backups; no PII in URLs |
| Hosting budget ~free tier (likely Oracle Cloud ARM VM + Cloudflare; R2 or OCI object storage) | Single VM, single Postgres, no managed services that cost money; multi-arch (arm64 + amd64) images; object storage via S3 API only |
| Docker-only deployment | Everything runs from `compose.prod.yaml`; no host-installed runtimes; migrations run as a one-shot deploy step |
| Legacy content quality: 155/161 pages have bespoke JS; inconsistent folder naming; broken links after the July 2026 reorganisation | The migration tool automates five patterns and flags the rest; hand-migration budget is limited to `needs-review` pages |

## 6. Assumptions and open questions

### 6.1 Assumptions (from the design; cheap to change)

| ID | Assumption | If wrong |
|---|---|---|
| A1 | Single institution for the foreseeable future; every row carries `program_id` so multi-program is a data change, not a schema change | Add program-scoped authorization to every query; already planned as a dependency |
| A2 | Student PII is limited to display name, email and cohort membership | Adding fields means revisiting the privacy section and the erase endpoint |
| A3 | Object storage is always reached through the S3 API (MinIO locally, R2/OCI in production) | None; this is the lock-in guard |
| A4 | Caddy or Cloudflare Tunnel is the single public origin; browser and server both talk to `/api/v1` on that origin | A split-origin deployment would need CORS and a different cookie policy |
| A5 | No background worker in Release 1; grading is synchronous and fast (pure functions) | Media processing or bulk export would need `api/app/tasks/` filled in |
| A6 | Release 1 = end of Phase 3; Phase 4 (SDK, games, simulators, EMR, DICOM) is 2027 | If the mentor ranks simulators above authoring, Phase 3 and 4 swap content |
| A7 | One educator owns a cohort; a student is in at most a few cohorts | Co-teaching needs `enrollment.role` extended, already present |
| A8 | 80 % is the pass threshold for quizzes and matching (taken from legacy) and is per-activity configurable | Only defaults change |
| A9 | The legacy EMR's workbook schema (`radiationOncologyData{...}`) becomes canonical in Phase 4, with an adapter for the platform schema | The reverse choice is the same amount of work |
| A10 | Students use their own laptops with a current browser; no institution-managed locked-down devices | Browser-support NFR changes |

### 6.2 Open questions for the mentor

| ID | Question | Blocks |
|---|---|---|
| Q1 | Is 80 % the right pass mark everywhere, or do some activities (e.g. calculators, safety) need 100 %? | Quiz/matching defaults, FR-S-14 |
| Q2 | How many quiz attempts should be allowed, and does the best or the latest count? | `quiz.attempts_allowed`, rollup rule |
| Q3 | Which outcome vocabulary should tag content: ARRT content specifications, ASRT curriculum codes, program SLOs, or the legacy `slo_id` list from OncoLife? | `outcome` table seed |
| Q4 | Should students see cohort-relative standing, or only their own results? | FR-S-22 |
| Q5 | Should educators see per-item responses or only scores? | Per-student detail view, audit scope |
| Q6 | What is a cohort in your program: an intake year, a course section, a clinical rotation group? | Cohort model, join-code lifecycle |
| Q7 | Which of the ~10 calculators are used in teaching today, and in what order? | Phase 3 calculator order |
| Q8 | Is there content in the legacy workbook that should *not* be migrated? | Migration scope |

## 7. Success criteria for Release 1

Mapped to the three learning-objective dates. Each is verifiable by a person other than the developer.

Milestones are ordered, not dated: the internship learning objectives list calendar dates, but those are placeholders. What matters is that M1 (first tested version with CI) precedes M2 (vertical slice on a test environment), which precedes M3 (all 13 subjects migrated, authoring UI usable by the mentor). Dates are set when each phase is planned.

### 7.1 Milestone M1 — first tested version (Phase 1 exit, tag `v0.1.0`)

| # | Criterion | Verified by |
|---|---|---|
| S1 | `docs/01`, `docs/02`, `docs/03` merged; the design PR carries the mentor's review | GitHub PR history |
| S2 | Every FR in `docs/02` traces to a legacy content type or a stakeholder need | Traceability matrix in `docs/02` §4 |
| S3 | `make dev` from a clean clone brings up `db`, `storage`, `api`, `web`, `proxy`, `mailpit` with all healthchecks green | Fresh clone on a second machine |
| S4 | A student can register with email, log in, open a migrated lesson (`Radiation_Biology/RBE_and_OER` or `Radiation_Physics/em_spectrum`), page through it, answer a knowledge check and see immediate feedback | Playwright flow in CI |
| S5 | That answer exists as `attempt` + `attempt_item` rows pinned to a `content_version_id` | pytest against Postgres |
| S6 | `pr.yml` is required on `main` and runs ruff, mypy, pytest, eslint, svelte-check, vitest, contract check, Playwright smoke, image builds | Branch protection settings; a failing PR is blocked |
| S7 | Coverage ≥ 70 % on `api/app/grading` and `api/app/auth` | CI coverage report |

### 7.2 Milestone M2 — vertical slice deployed (Phase 2 exit)

| # | Criterion | Verified by |
|---|---|---|
| S8 | ADR-001 compares FastAPI + Postgres against at least three alternatives (Django/DRF, Node/Prisma, Supabase) with a decision | ADR merged |
| S9 | A student answer submitted on the **test URL** appears in an educator's cohort overview and per-student detail within one page refresh | Playwright e2e against the deployed test environment |
| S10 | Google sign-in works and links to an existing email account by verified email | Manual + pytest for the identity table |
| S11 | Every educator read of student data writes an `audit_log` row | pytest |
| S12 | A push to `main` deploys to the test VM in one workflow run; health endpoint returns 200 | GitHub Actions run log |
| S13 | A nightly backup exists in object storage and a restore into a fresh database has been performed once and recorded | `docs/05-setup.md` restore log |
| S14 | `docs/04-conventions.md` and `docs/05-setup.md` merged | Repo |

### 7.3 Milestone M3 — content complete (Phase 3 mid-point and exit)

| # | Criterion | Verified by |
|---|---|---|
| S15 | Ethics, Radiation Biology and Radiation Physics migrated and walked through end-to-end by Chris at the Phase 3 mid-point; all 13 subjects by 2026-12-19 | Migration report with `converted / needs-review / unsupported` counts per subject |
| S16 | ≥ 3 mentor and ≥ 2 student feedback conversations held; findings doc mapped to backlog issues | `docs/findings-2026-11.md` and linked issues |
| S17 | Quiz (badge at pass), flashcards, matching, sequencing and at least the MU and TMR/PDD calculators record attempts | pytest per grader; Playwright per type |
| S18 | The mentor creates a new lesson with a knowledge check, uploads an image, publishes it, and a student sees it — with no developer help | Observed session, recorded in findings doc |
| S19 | A bad publish can be rolled back to the previous version and existing attempts still grade identically | pytest publish/version pinning |
| S20 | Per-activity statistics, per-outcome mastery and CSV export available to the educator | Playwright |
| S21 | Target: p95 lesson page load < 1.0 s and p95 attempt submit < 300 ms on the test VM with the seed data | Simple load script in CI or manual `hey`/`k6` run recorded in setup docs |

## 8. Mentor and student interview guide

To be run during Phase 0/1 (before M1) and again as the ≥ 3 mentor + ≥ 2 student conversations at M3. Record answers in §8.3 and turn each into a backlog issue or a requirement change.

### 8.1 Questions for the mentor (Kevin Kindle)

| # | Question | Informs |
|---|---|---|
| M1 | Which topics do students consistently struggle with on the ARRT exam or in clinic? Which workbook activities do you point them to for those? | Migration priority, outcome tags |
| M2 | Of the seven activity types (paged lesson, quiz, flashcards, matching, sequencing, calculators, simulators), which three matter most to learning? Which could be dropped without loss? | Phase 3 order, NG7 |
| M3 | Walk me through how you write a lesson today. Where do you start, what tools, how long does it take, what is most painful? | Authoring UI design |
| M4 | If you could edit a lesson in the browser, what must it support: headings, images, tables, formulas, callouts, embedded video, anything else? | Closed prose schema |
| M5 | How should a quiz be graded: pass mark, attempts allowed, best vs latest, shuffle questions and options, show explanations immediately or after submit? | FR-S-12..16 |
| M6 | What does a badge mean to you and to students? Is it per quiz, per subject, per outcome? Should it expire or be re-earned? | Badge model |
| M7 | What is a cohort in your program? How many students, how long does it live, do students move between cohorts? | Cohort model, join-code rules |
| M8 | What do you want to see first when you open the educator view: a class heat-map, a list of weakest students, a list of weakest outcomes, or recent activity? | Cohort overview design |
| M9 | Which outcome framework should tag content (ARRT content specs, ASRT curriculum, program SLOs)? Do you have the list? | `outcome` seed |
| M10 | Do students need to see how they rank against the cohort, or is that harmful? | Q4 |
| M11 | Who else should be able to see student results: other faculty, clinical preceptors, the program director? Should students be able to share their own results? | Roles, audit |
| M12 | What are your privacy expectations for student data? Would you be comfortable with a student's full answer history being visible to any educator in the program? | Q5, audit scope |
| M13 | Which calculators do you use in class, and are the PDD/TMR/wedge/tray tables in the workbook the ones you want, or do you have your program's own? | `data_table` seed |
| M14 | Which legacy activities must survive unchanged (the "sacred" ones), and which can we re-imagine? | Migration `unsupported` handling |
| M15 | When something goes wrong (a typo in a published lesson, a wrong answer key), what should happen to attempts already recorded? | Versioning and re-grade policy |

### 8.2 Questions for students

| # | Question | Informs |
|---|---|---|
| ST1 | When you use the workbook now, what device and browser do you use, and where (home, clinic, campus)? | Browser support, responsive targets |
| ST2 | Which activity types do you actually finish, and which do you abandon? Why? | Phase 3 order |
| ST3 | After a quiz, what do you do with the result? Would you want to see it again later? | Student results view |
| ST4 | Do you want to know how you compare with classmates, or only with the pass mark? | Q4 |
| ST5 | What would make you come back to a lesson you already passed? | Spaced review (later) |
| ST6 | Would you be comfortable with your instructor seeing every answer you gave, or only your scores? | Privacy defaults |
| ST7 | If a lesson had a formula or calculation, would you rather see worked examples, a calculator, or both? | Calculator UX |
| ST8 | Is there anything in the current workbook that is confusing, broken, or that you avoid? | Migration `needs-review` list |

### 8.3 Answers

_(to be filled after interview on YYYY-MM-DD)_

## 9. Glossary

| Term | Meaning in this project |
|---|---|
| Activity | Any scorable unit a student can attempt: lesson (via its knowledge checks), quiz, flashcard deck, matching set, sequencing set, calculator exercise, simulator, or external (game). `activity.kind` in the data model. |
| Attempt | One student's one run at one activity, pinned to a `content_version`. Has status, score / max / percent, pass flag, duration, source (`web` or `sdk`). |
| Attempt item | One answered item inside an attempt (`item_key`, response JSON, correct flag, score, time). |
| Activity result | Per student per activity rollup: best percent, latest attempt, attempt count, first-passed time, mastery flag. |
| Badge | Awarded when a quiz attempt reaches `pass_percent` (default 80 %). Legacy: `generateBadge()` in quiz pages. |
| Cohort | A group of students taught together, owned by an educator, joined by a rotatable code. |
| Content version | Immutable published snapshot (full JSON tree) of an activity or lesson. Students read snapshots; attempts pin them. |
| Data table | Author-editable numeric grid (e.g. `pdd_6mv`, `tmr_10mv`, wedge factors, tray factors) consumed by calculators. Legacy: inline `pddData` / `tmrData`. |
| Enrollment | Membership of a user in a cohort with a role. |
| Knowledge check | A single-choice question embedded in a lesson page. Legacy: `lessonCorrectAnswers` map in paged lessons. |
| Mastery | Activity result flag set when a student meets the activity's pass rule (quiz ≥ pass %, matching ≥ 80 %, etc.). |
| Outcome / SLO | A student learning outcome code (from ARRT content specifications, the ASRT curriculum or program-defined SLOs) attached to activities and questions for per-outcome analytics. Legacy: `outcomeCode`, `slo_id`, `competencies[]`. |
| Paged lesson | A lesson split into ordered pages shown one at a time. Legacy: `lesson-page-N` divs; 96 pages use it. |
| Program | The institution / RT program that owns an instance. One row in Release 1. |
| Publish | Turning a working copy into a new `content_version`. |
| Working copy | The editable, normalized rows an author changes before publishing. |
| ARRT | American Registry of Radiologic Technologists; runs the certification exam whose content specifications structure much of the curriculum. |
| ASRT | American Society of Radiologic Technologists; publishes the Radiation Therapy Curriculum. |
| TILT | Transparency in Learning and Teaching framework followed by the legacy workbook. |
| DICOM | Digital Imaging and Communications in Medicine — the medical image file format used by the alignment and viewer activities. |
| EMR / OIS | Electronic medical record / oncology information system. The legacy 38-patient library simulates one with fictional data. |
| 4D-CT | Time-resolved CT used for respiratory-motion planning; one legacy simulator. |
| HU | Hounsfield unit, CT intensity scale. |
| LINAC | Linear accelerator; the treatment machine simulated in the 3D and console activities. |
| MLC | Multi-leaf collimator; field-shaping component of a LINAC. |
| MU | Monitor unit — the machine's dose-delivery unit. The MU calculator turns a prescription into MU using PDD/TMR, output and modifier factors. |
| PDD | Percentage depth dose — dose at depth as a percentage of the dose at the reference depth, tabulated by energy, field size and depth. |
| TMR | Tissue-maximum ratio — a depth-dose quantity used for isocentric calculations. |
| Wedge / tray factor | Transmission factors for beam modifiers, tabulated in calculator data tables. |
| RBE / OER | Relative biological effectiveness / oxygen enhancement ratio — radiobiology quantities; the `RBE_and_OER` lesson is the first migration target. |
| TPS | Treatment planning system; simulated by the `Treatment_Planning_Suite` and `Brain_TPS` legacy pages. |
| cGy / Gy | Centigray / gray, the SI units of absorbed dose. |
| KESN | Knowledge / Evaluation / Skill / Novelty sub-scores in the legacy station bridge; carried only in `attempt.client_meta` if at all. |
| SDK | `@rtapps/sdk` — the client library games and simulators use to post attempts (Phase 4). |
| Vertical slice | The M2 deliverable: one activity records a result and one educator view reads it, on a deployed test environment. |

## 10. Change log

| Date | Change | By |
|---|---|---|
| 2026-08-27 | Initial draft for Phase 0 review | Chris Guzman |
