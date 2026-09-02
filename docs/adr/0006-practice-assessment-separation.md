# ADR-0006: Practice / assessment separation via one `access` column

- **Status:** Accepted
- **Date:** 2026-09-01
- **Deciders:** Chris Guzman (lead developer)
- **Related:** ADR-0003 (content versioning — the snapshot this gates), ADR-0004 (attempt/grading spine)
- **Sources:** `docs/plans/2026-09-01-plan-3a-content-types.md` Global Constraints; `docs/02-requirements.md` FR-X-06/07 (migration), FR-E-06/07 (educator analytics)

## Context

Plan 3a migrates the entire legacy workbook — quizzes, flashcards, matching, sequencing — as `practice` content: every question, answer key and explanation in that corpus has been sitting in publicly readable HTML/JS for years (`AUDIT F-series`; see `docs/legacy-migration-report.md`). Migrating it changes nothing about who could already see it; there is no assessment integrity to protect on day one.

A later phase (the games/authoring track) needs real assessments: educator-authored pools where a student must not see the answer key, a wrong-but-plausible distractor's rationale, or even the pool's full item list before attempting it — the same content model (`quiz`, `question`, `content_version`), but with a different visibility contract for students.

Two content states, one schema, is the smallest change: reuse `activity`/`content_version`/`attempt` end to end (ADR-0003, ADR-0004) rather than a parallel table set for "the kind educators are allowed to assign for a grade." The alternative — obscurity through omission (just don't link to it) — is not a security boundary; anyone who guesses or is given an activity id would see the pool at `GET /activities/{id}`.

## Decision

1. **One column, `activity.access ∈ ('practice', 'assessment')`, default `practice`.** No new tables. An `assessment` row is a normal `activity`/`content_version` — same publish flow, same snapshot shape, same grading path (`gradeable_items`).

2. **Enforced at every student-facing read, not by omission.** `GET /subjects/{slug}` (catalog), `GET /activities/{id}` (snapshot), and `POST /activities/{id}/attempts` (start/resume) all filter `access = 'practice'` for students in the SQL query itself; an `assessment` activity id returns a plain `404 "Activity not found"` to a student — the same response as a nonexistent id, so the endpoint never confirms an assessment pool exists. Educators and admins read either `access` value (they author and grade assessments). This is the same pattern NFR-11's permission matrix already tests for cohort ownership — authorization lives in the query, never trusted from a client-supplied id, and it is why obscurity (a hidden route, an unlisted UUID) was never on the table: any id an attacker tries still resolves through this filter.

3. **All migrated legacy content is permanently `practice`.** The importer (`app.content.activity_importer`, `app.content.importer`) never sets `access = 'assessment'`; every quiz/flashcard/matching/sequencing/lesson row imported by `tools/migrate-legacy` or hand-authored in `apps/api/seed/` defaults to `practice` and stays there. It was already public; nothing about *this* migration should be read as newly asserting exam-grade integrity over 15-year-old workbook quizzes. If a program later wants to promote specific migrated questions into a real assessment pool, that is new authoring (a new `question`/`quiz` row), not a flag flip on the old one — flipping the flag on content whose answers are already indexed by search engines and cached by browsers would be integrity theater.

4. **Assessment pools ship empty in 3a.** The column and the read-side gate exist now so a `practice` → `assessment` activity never needs a migration later, but nothing authors into `access = 'assessment'` until 3b gives authors a way to build a pool deliberately (FR-A-05/06 extended). Shipping the gate ahead of the content it gates is the point: the enforcement gets its own tests now (`tests/test_content*.py` permission-matrix cases) instead of being bolted on under deadline pressure when the first real assessment is authored.

5. **Assignments, attempt windows and per-item feedback withholding are out of scope here** and arrive with the games phase (Phase 4 in `docs/02-requirements.md`'s phase legend). `access = 'assessment'` only answers *"can a student discover and read this activity at all before an educator has assigned it to them"* — it does not yet model *"this cohort's window for it is open,"* *"this student gets three attempts,"* or *"don't show the explanation until everyone in the cohort has submitted."* Those are additional columns/tables on top of the same `activity`/`attempt` rows, not a reason to delay the access gate.

## Options considered

### A. One `access` column, enforced at every student read — chosen

- **Pros:** zero new tables; reuses every existing pipeline (snapshot, grading, versioning, analytics) unchanged; the enforcement point is the same dependency-injected, query-level authorization pattern already proven for cohort ownership (NFR-11); trivially extensible (`assessment` today, nothing stops a third state later if a real need appears).
- **Cons:** a single boolean-ish flag can't yet express assignment windows or per-cohort visibility — deliberately deferred to point 5 above, not a flaw in this decision.

### B. Separate tables per state (`practice_activity` / `assessment_activity`)

- **Pros:** a schema-level guarantee that a practice reader can never accidentally see an assessment row (no shared table to mis-filter).
- **Cons:** duplicates every table in §6.2 (quiz, quiz_question, flashcard_deck, matching_activity, sequencing_activity) and every downstream consumer (`gradeable_items`, `publish_activity`, the analytics queries, the migration importer) for a distinction that is one predicate today; migration-to-assessment (point 3) would need to physically move rows between tables instead of a status change with its own audit trail; doubles the surface area `mypy --strict`/pytest have to cover for zero behavior gained until 3b. Rejected — the duplication cost is paid on day one; the isolation benefit isn't needed until real assessment content exists, and even then a query-level filter enforced by the same dependency as cohort ownership has an equivalent audit story.

### C. A parallel "quiz bank" database (separate service, separate schema, or a hidden/unlisted route)

- **Pros:** physical separation feels like a stronger boundary than a WHERE clause; a compromised student session literally cannot reach the assessment schema/service.
- **Cons:** trades one authorization bug class (a missed `access` filter) for another (a missed network/schema boundary, now duplicated across every read path); a second database or service on a single-VM Compose deployment (ADR-0005) is new infrastructure with no operator to run it; content versioning, grading and analytics would need a second implementation or a cross-schema join, undermining ADR-0003/ADR-0004's "one pipeline" premise; "hidden route" is exactly the obscurity this ADR opens by naming — an unlisted UUID is not a security boundary, and `GET /activities/{id}` already has to answer *something* for an id a client sends, gated or not. Rejected outright, not deferred: nothing about the games phase's actual requirements (assignments, windows, feedback withholding — point 5) needs a second data store, only additional columns on the schema this ADR already gates.

## Consequences

### Positive

- The entire legacy corpus migrates as `practice` with no per-document access decision to make or get wrong — the importer's default already matches what should ship.
- 3b's assessment authoring is additive: new rows with `access = 'assessment'`, no migration of the practice/read pipeline.
- One authorization pattern (query-level, dependency-injected, tested in the permission matrix) covers both cohort ownership and assessment visibility — one thing for a solo developer to get right, not two.

### Negative

- `access` alone cannot express "assigned to this cohort, this window, N attempts" — until 3b/4 land those, an `assessment` activity is simply invisible to every student, which is correct but not yet useful; the column is deliberately ahead of the authoring feature that will populate it.
- A future author who forgets to flip a hand-authored exam question to `assessment` (rather than the importer defaulting it, which cannot happen for migrated content) ships it as `practice` by default-safe, but that means it's readable, not withheld — the review step before publish (ADR-0003) is the actual backstop, same as any other publish mistake.

### Neutral

- `access` uses the same text-with-CHECK-constraint convention as every other status/kind column in the schema (`docs/03-architecture.md` §6.2), not a native enum — consistent, not a special case.

## Follow-ups / what would make us revisit

- 3b: author-facing UI to build an `assessment` quiz/pool; first real content with `access = 'assessment'`.
- Games phase: assignment/window model (which cohort, when, how many attempts) and per-item feedback withholding sit on top of `access`, not instead of it.
- If a program ever needs assessment content isolated at the infrastructure level (e.g., a compliance requirement beyond "students can't read it"), revisit Option C then, with a concrete requirement instead of a hypothetical one.
