# Plan 3a design — content types, migration, analytics, hardening

**Milestone:** M3 · tag `v0.3.0` · branch `feat/content-types`
**Date:** 2026-09-01 · **Status:** approved by owner (this session)

## 1. Goal and scope

Students can complete quizzes (badge at ≥ 80 %), flashcard decks, matching activities and
sequencing activities migrated from all 13 legacy subjects; educators get per-activity
statistics, per-outcome mastery and CSV export; and the carried-over hardening backlog ships
(rate limiting, admin guards, erase, Sentry, session purge, `program` table, minor findings).

**In scope:** four new activity kinds (`quiz`, `flashcards`, `matching`, `sequencing`) with
storage, publish/versioning, grading, player UIs; attempt resume; `migrate-legacy` converters
for the four legacy patterns run over all 13 subjects with committed output and fix-list
report; FR-E-06/07/08 analytics + CSV; the practice/assessment `access` flag and student-read
gate; issues #29 #30 #31; FR-M-03 erase; Sentry; session purge; `program` table.

**Out of scope (plan 3b or later):** authoring UI (TipTap, question builders, media upload),
calculators and `data_table`, assessment content and the assign-to-cohort workflow, games/SDK,
activity-level outcome tagging, question types beyond `single_choice`.

**Context.** The workbook is a learning tool; the games (phase 4) quiz students on it. Games
have a practice mode (ungraded self-testing on workbook-derived material) and an assigned mode
(professor-quizzed, different material). All migrated legacy content is by definition
*practice* material — students have already seen it, so it has no assessment integrity.
Assessment pools stay empty until the mentor authors fresh items in the authoring UI.

## 2. Data model (Alembic migration 0006)

Per `docs/03-architecture.md`. All tables get UUIDv7 ids and the repo's timestamp columns;
`status ∈ draft|published` and `current_version_id` follow the `lesson` pattern exactly.

- `question` — `type` (check-constrained to `single_choice` **only** for now; widened by a
  later migration when 3b adds more types), `stem` (ProseMirror JSON, JSONB), `body` JSONB
  (`{options: [str], answer_index: int, explanation: ProseDoc | null}`).
- `quiz` — `title`, `slug` (unique per subject), `pass_percent` int default **80**,
  `shuffle` bool default true; `quiz_question` join (`quiz_id`, `question_id`, `position`,
  unique on both pairs).
- `flashcard_deck` — `title`, `slug`, `cards` JSONB (`[{term, definition}]`).
- `matching_activity` — `title`, `slug`, `pairs` JSONB (`[{name, description}]`),
  `present_n` int nullable (show a random subset of N pairs; null = all),
  `pass_percent` int default **80**.
- `sequencing_activity` — `title`, `slug`, `items` JSONB (ordered `[str]` or
  `[{label, detail}]`), `pass_percent` int default **80**.
- `activity` — `kind` check widens to `lesson|quiz|flashcards|matching|sequencing`; add
  `subject_id` FK (nullable, backfilled for lessons from their lesson→subject link), `title`,
  and **`access`** (`practice|assessment`, check-constrained, default `practice`).
- `outcome` — `code` (unique, citext), `title`; `question_outcome` join. Question-level tags
  only in 3a (FR-A-14 activity tagging is 3b). The outcome list starts from whatever the
  migration extracts from legacy `outcomeCode`/`slo_id`/`competencies[]` plus seed examples.
- `program` — `name`; `cohort.program_id` nullable FK (single institution now; NFR future-
  proofing only, no behavior change).

## 3. Publish/versioning and read API

Identical to lessons: publishing writes an immutable `content_version` snapshot (full JSONB —
for a quiz that includes its questions with answers); students read only snapshots; attempts
pin `content_version_id`.

- `GET /api/v1/activities/{id}` returns the kind-specific published snapshot **with answers
  stripped** (`answer_index`, matching pair solutions, correct sequence order and
  explanations never serialized to students; feedback arrives only through the graded
  item-autosave and submit responses — see the per-item feedback rule below). Grading reads
  answers from the snapshot server-side.
- Subject detail (`GET /subjects/{slug}`) adds the subject's published activities grouped by
  kind.
- **Access gate:** every student-facing catalog and read endpoint filters
  `access = 'practice'`; an `assessment` activity id returns `404 "Activity not found"` to
  students. Educators/admin can read their own program's assessment items (there are none in
  3a; the filter and its tests are the deliverable). Recorded as **ADR-0006** (authorization,
  not obscurity; legacy content is practice-only).
- **Per-item feedback:** for `practice` activities the item-autosave response
  (`POST /attempts/{id}/items`) includes `correct` and the question's explanation, graded
  server-side against the pinned snapshot — this is what lets the QuizPlayer show feedback
  after each question, matching legacy behavior. Future `assessment` activities will withhold
  this (the field is where the distinction lives); explanations still never appear in the
  activity snapshot itself.

## 4. Grading and attempts

One pure function per kind in `app/grading/` (same style as `single_choice.py`):

- **quiz** — each question is an `attempt_item` (`item_key = question id`); score = correct
  count, max = question count; `passed = percent ≥ pass_percent` → badge.
- **matching** — each presented pair an item; correct iff matched to its own description;
  `passed = percent ≥ pass_percent`.
- **sequencing** — each item correct iff placed at its exact original position;
  `passed = percent ≥ pass_percent`.
- **flashcards** — ungraded: submit records completion only (`score/max/percent/passed`
  null, rollup mastery `attempted`). The rollup's handling of null percents is pinned by a
  test.

**Attempt resume:** `POST /activities/{id}/attempts` returns the caller's existing
`in_progress` attempt for that activity — with its autosaved items — instead of creating a
duplicate; the player rehydrates from it. Submit stays idempotent via `Idempotency-Key`
(unchanged, AT-06 semantics).

## 5. Web players

Student route `(app)/subjects/[slug]/activities/[id]`: the `load` fetches the snapshot and the
page renders a per-kind component:

- **QuizPlayer** — one question at a time; after answering, the correct/incorrect state and
  explanation (from the submit/feedback response) are shown; badge screen when
  `passed` (≥ 80 %).
- **FlashcardPlayer** — flip through cards; finishing the deck submits the completion
  attempt.
- **MatchingPlayer** — click-based: select a term, then select a description to pair; no drag
  library (accessibility + Playwright stability).
- **SequencingPlayer** — reorder via per-row up/down buttons.

All players autosave items as the student progresses (existing items endpoint) so resume
works. Repo conventions apply: `resolve()` for hrefs, no `{@html}`, file-header comments.

## 6. Migration — all 13 subjects

`tools/migrate-legacy` gains a classifier branch and converter per legacy pattern:

- quiz arrays (`{question, options, answer, explanation}`) → `question` + `quiz` import JSON;
- flashcard decks (`{term, definition}`) → `flashcard_deck`;
- matching (`{name, description}` pairs) → `matching_activity`;
- timeline/sequencing pages → `sequencing_activity`.

Converters emit typed import documents (`{kind, payload}`) consumed by an extended
`apps/api/app/content/importer.py`; legacy outcome vocab (`outcomeCode`/`slo_id`/
`competencies[]`) is extracted into `outcome` rows and question tags where present. The tool
runs over all 13 subjects; converted JSON is committed to the repo and loaded by the seed/
import command; a **second run updates rather than duplicates** (AT-14); three golden-file
fixtures (quiz, flashcards, matching) pin the conversion; migrated content carries the
CC BY-NC notice; the aggregated per-page `converted|needs-review|unsupported` report is
committed as the 3b fix-list document. All imported activities are `access = 'practice'`.

## 7. Educator analytics (FR-E-06/07/08, AT-12)

- `GET /cohorts/{id}/activities/{aid}` — attempts, pass rate, score distribution, per-item
  difficulty (percent correct per `item_key`) and most-common wrong answers, computed from
  `attempt_item` for cohort members.
- `GET /cohorts/{id}/outcomes` — per outcome code: percent of tagged items answered correctly
  (cohort-wide and per student) and count of students below the cohort threshold.
- CSV export: each educator view (overview, activity stats, outcomes) gets an export endpoint
  sharing one serializer — UTF-8, header row, one row per student-activity or
  student-outcome, **no columns beyond the on-screen view** (FR-E-08). Every read and every
  export is audited via `record_audit` (new actions `read_activity_stats`, `read_outcomes`,
  `export_csv`), authorization through the existing `require_cohort_educator`.
- Web: activity-stats and outcomes pages under `(app)/educator/cohorts/[id]/…` with export
  links.

## 8. Hardening and operations

- **NFR-13 / #29** — in-process per-IP token-bucket middleware on `login`, `register`,
  `join` (10/min/IP), returning 429 problem+json. Single-process prod API makes in-memory
  state sufficient; noted in code why.
- **#30** — last-admin guard (cannot demote/deactivate/erase the only active admin) and
  ILIKE `%`/`_` escaping in admin user search.
- **#31** — the minor findings recorded in the issue, fixed as one task.
- **FR-M-03 erase** — `POST /admin/users/{id}/erase`: display name → `Erased user`, email →
  `erased-<id>@erased.invalid`, password hash cleared, identities and sessions deleted,
  user deactivated, attempts/rollups retained pseudonymously, audited (`erase_user`),
  irreversible, guarded by the last-admin rule.
- **Session purge (NFR-26)** — CLI command deleting sessions expired > 30 days, run by the
  existing nightly backup cron container; pytest covers it.
- **Sentry** — `sentry-sdk` (api) + `@sentry/sveltekit` (web), initialized only when
  `SENTRY_DSN` is set; no-op otherwise; DSN placeholders in `infra/prod.env.example`.
- **`program` table** — schema only (see §2); no routes or UI.

## 9. Testing

- pytest: one suite per grading function with boundary/property cases; snapshot
  answer-stripping (assert no `answer_index`/solutions in student payloads); resume returns
  the same attempt + items; access gate (assessment activity 404s for students, absent from
  catalog); rate-limit 429 after N requests; erase tombstones PII but keeps rollups;
  last-admin guard; ILIKE escaping; session purge; migrations head → 0006.
- migrate-legacy: golden files for the three new patterns; re-run idempotency (AT-14).
- vitest: player components' response shapes and answer-hiding.
- Playwright: student completes a quiz to the badge screen and resumes a half-finished quiz;
  educator opens activity stats and outcomes and downloads a CSV (AT-12 essentials).
- Coverage gate unchanged (`--cov=app/grading --cov=app/auth --cov-fail-under=70` — the new
  grading modules fall under it automatically).

## 10. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Phase split | 3a (this) then 3b authoring + calculators + bulk fix-ups | Authoring UI is the schedule risk; isolate it |
| Calculators | Deferred to 3b | Bespoke per-calculator UI; `data_table` editor lives with authoring |
| Backlog | All carried items ride in 3a | Owner choice; each is small and independent |
| Migration extent | All 13 subjects now | Report flags broken pages; authoring UI (3b) is the fix tool |
| Storage | Per-type tables + shared `question` bank | Matches reviewed `docs/03-architecture.md`; enables 3b builders |
| Question types | `single_choice` only | All legacy quiz content is single-choice; YAGNI |
| Flashcards | Ungraded, completion-only | Legacy decks are study aids with no scoring |
| Sequencing scoring | Exact position | Simplest defensible rule; revisit if content demands |
| Players | Click-based, no drag library | Accessibility, Playwright stability, smaller surface |
| Practice/assessment | `access` flag + student-read gate now; assignments later | Zero-leak foundation for the games phase at one column's cost (ADR-0006) |
