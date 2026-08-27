# ADR-0004: One `attempt` / `attempt_item` schema as the integration spine

- **Status:** Accepted
- **Date:** 2026-08-27
- **Deciders:** Chris Guzman (lead developer)
- **Related:** ADR-0001 (Postgres), ADR-0002 (sessions the SDK will rely on), ADR-0003 (`content_version_id`)
- **Sources:** `rt-app/docs/SYSTEM-OVERVIEW.md` §6, `rt-app/docs/rtt_e_workbook/docs/BRIDGES-AND-STORAGE.md` §5

## Context

The product goal is *student does an activity → a result is recorded → an educator sees it*. The legacy code has **three** incompatible implementations of "record a result", all of which keep the result in the student's own browser (`localStorage`, per origin, per profile, per device): `RTAssessmentBridge.saveResult()`, the station bridge `RTApps.complete()`, and `RTPlatform.record()`. Their field names, score units (0–100 vs. a 0–1 string vs. score/max/percent), identity fields and outcome vocabularies all differ. The games report nothing. Zero curriculum pages call any of them. An educator on another machine sees nothing.

Consumers of results in the new system: the workbook (lessons with knowledge checks, quizzes, flashcards, matching, sequencing, calculators), the games and simulators via an SDK (Phase 4), and educator analytics (per student, per cohort, per activity, per outcome). All must write and read the same thing.

Forces: grading must not trust the client (answer keys never leave the server, ADR-0003); students on lab Wi-Fi lose connectivity mid-activity; a submit may be retried by the browser or the SDK; results must survive content edits (ADR-0003); a solo developer needs one grading path, not one per app.

## Decision

1. **One schema.** Every result, from any app, is an `attempt` with zero or more `attempt_item` rows, rolled up into `activity_result`.

   `attempt`: `id, user_id, activity_id, content_version_id, cohort_id?, started_at, submitted_at?, status ∈ in_progress|submitted|abandoned, score, max_score, percent, passed, duration_s, source ∈ web|sdk, idempotency_key?, client_meta JSONB`.
   `attempt_item`: `attempt_id, item_key, response JSONB, correct?, score?, max_score?, time_ms?, graded_at?`.
   `activity_result` (rollup, recomputed on submit): `user_id, activity_id, best_percent, latest_attempt_id, attempts, first_passed_at?, mastery ∈ none|attempted|passed`.
   Outcome/SLO mapping is not on the attempt: `activity_outcome` links activities to `outcome` codes, so analytics join through the activity and a re-tagging never rewrites history.

2. **Server-side grading only.** The client sends responses; `api/app/grading/` — one pure function per question type — computes `correct`, `score`, `percent`, `passed` against the pinned `content_version` snapshot. A client-supplied score is ignored for `web`; for `sdk` sources whose scoring is internal to a game/simulator, the SDK submits `score/max_score` and the server records `graded_by = client` in `client_meta` and marks the activity kind `external`, so analytics can distinguish trusted from self-reported scores.

3. **SDK contract** (`@rtapps/sdk`, stub in Phase 1, real in Phase 4):
   - `start(activityId, {contentVersionId?}) → attemptId` — `POST /api/v1/activities/{id}/attempts`
   - `item(attemptId, itemKey, response)` — `POST /api/v1/attempts/{id}/items` (autosave, last write per `item_key` wins)
   - `submit(attemptId, {score?, maxScore?, durationS?, meta?})` — `POST /api/v1/attempts/{id}/submit` with header `Idempotency-Key: <uuid>`; the server stores the key on the attempt and returns the same 200 body for a repeated key, 409 for a different key on an already-submitted attempt.
   - Every call is queued in `localStorage["rtapps.sdk.queue.v1"]` and drained in order when online; the queue is cleared per entry on 2xx or on 409 (already applied). Nothing else is persisted client-side.

4. **Transport** is the existing session cookie (ADR-0002) for same-origin apps; cross-origin games get the Phase 4 token decision.

## Legacy fields mapped side by side

From BRIDGES-AND-STORAGE.md §5; the last column is where each concept lands.

| Concept | RTAssessmentBridge | Station bridge (`RTApps`) | `RTPlatform` | New schema |
|---|---|---|---|---|
| Record id | `attemptId` (deterministic composite) | `result_id` (`'r'+time+rand`) | `id` (base36 time + rand) | `attempt.id` (UUID, server-issued) + `idempotency_key` |
| Student | `studentId`, alias `sid` | `student_id` (from host ctx) | `studentId`, `studentName` | `attempt.user_id` (from session; never client-supplied) |
| Activity | `activityId`, `activity`/`module`, `activityVersion` | `tool_type` only | `activityId`, `activityName` | `activity_id` + `content_version_id`; name/kind via join |
| Outcome mapping | `outcomeCode` (+`code`, `slo`), `measureCategory`, `method` | `slo_id`, `goal_id`, `program_id`, `cohort`, `period` | `competencies[]` | `activity_outcome` (activity → `outcome.code`); `cohort_id` on attempt; `program_id` via cohort |
| Score | `score` 0–100, `maxScore`, `benchmark`, `result` Pass/Needs Review | `final_score` string 0–1, `scorePct`, `pass_fail` null | `score`, `maxScore`, `percent`, `status` | `score`, `max_score`, `percent` (0–100 numeric), `passed` (bool vs. `activity.config.pass_percent`) |
| Timing | `date`, `completedAt`, `durationSeconds`, `attemptNumber` | `timestamp`, `attempts_count` | `timestamp`, `durationSeconds`, `attempts` | `started_at`, `submitted_at`, `duration_s`; attempt number = `activity_result.attempts` |
| Extras | `sourceRepository`, `sourcePath` | `kesn{K,E,S,N}`, `archetype`, `raw_data_payload` | `patientMrn`, `patientName`, `mode`, `metadata` | `source` (web/sdk) + `client_meta` JSONB (free-form, size-capped 16 KB) |
| Per-item detail | none | none (raw payload) | none | `attempt_item` rows |
| Persistence | `localStorage["rtapps.assessment.results.v1"]` | host page `localStorage["rtapps_oncolife_v1"]` | `localStorage["rtplatform.learningRecords.v1"]` (last 1000) | Postgres; `localStorage` only as the SDK's outbound queue |
| Host notification | `RT_ASSESSMENT_RESULT_SAVED`, `postMessage RTAPPS_LOCAL_RESULTS_UPDATED` | `postMessage RTAPPS_RESULT` to `'*'` | `rt:recorded`, `postMessage {__rt:true}` to `'*'` | none needed; SDK resolves a Promise. No `postMessage` to `'*'` |

Every legacy field has a home; nothing is dropped except client-supplied identity and wildcard-origin messaging, both of which were the security problems.

## Options considered

### A. One `attempt`/`attempt_item` schema, server-graded, SDK with idempotent submit and offline queue — chosen

- **Pros:** one write path, one grading module with property tests, one set of analytics queries; the schema is a strict superset of all three bridges so migration of any historical `localStorage` exports is a mapping; version pinning makes re-grading exact; idempotency makes retries safe from day one; the SDK is thin (three calls).
- **Cons:** games with internal scoring produce self-reported scores the server cannot verify; the schema must anticipate per-item responses for content types that do not exist yet (`response` JSONB is the escape hatch); the offline queue holds unsent responses on a shared machine until the next online visit by *that browser* (mitigated: queue entries carry no answer keys and are cleared on success).

### B. Keep per-app schemas with adapters into a reporting table

- **Pros:** each app keeps its native shape; games could ship sooner without agreeing on anything; adapters are small.
- **Cons:** three schemas plus N adapters is the situation being replaced; adapters drift; grading would either stay client-side (untrusted) or be reimplemented per adapter; analytics need a union view that is only as good as the weakest adapter; no idempotency unless each adapter implements it. Rejected — it preserves the legacy problem with a database attached.

### C. xAPI statements into a Learning Record Store (LRS)

- **Pros:** an established standard (`actor / verb / object / result / context`), interoperable with LMSs and analytics tools; open-source LRSs exist (Learning Locker, SQL LRS); institutions recognise it.
- **Cons:** an LRS is another service to run on the free VM; statements are append-only and denormalised, so "best attempt per activity per student" and cohort aggregations are awkward without a side store; per-item responses map to `result.response` strings, losing structure; verbs and activity IRIs need a profile document before anything is consistent; grading still has to happen somewhere before the statement is emitted. **Deferred, not rejected:** the `attempt` table can be projected into xAPI statements 1:1 (`actor` = user, `verb` = `completed`/`answered`, `object` = activity IRI, `result` = score/success/duration, `context.contextActivities.grouping` = cohort). If an institution asks for LRS/LMS export, that is an exporter, not a redesign.

## Consequences

### Positive

- The Phase 2 vertical slice ("a student answer on the test URL appears in an educator view") is one table read.
- Games and simulators integrate by calling three functions; they do not need to know how grading or cohorts work.
- Retries, double-clicks and flaky Wi-Fi cannot create duplicate submissions or lose a completed attempt.
- Historical results are immune to content edits and outcome re-tagging.

### Negative

- Trusted vs. self-reported scores coexist; every analytics view must label `graded_by`. Forgetting this misleads educators.
- `attempt_item.response` JSONB is loosely typed on purpose; per-question-type response schemas in `packages/schemas` are what keep it honest, and each new question type needs one.
- Rollup (`activity_result`) is derived state; a bug there is visible to educators. It is recomputed from `attempt` rows by a `make rebuild-results` command and covered by tests.
- The offline queue is a feature students will rely on without knowing it exists; a broken drain silently loses work. The SDK surfaces queue length in the UI and logs failures.

### Neutral

- `client_meta` is capped and never queried in analytics; it exists for debugging and for game-specific payloads (`kesn`, `archetype`).
- Attempt limits (`quiz.attempts_allowed`) are enforced at `start()`, not at submit.

## Follow-ups / what would make us revisit

- Phase 1: `attempt` for lesson knowledge checks; Phase 2: `activity_result` rollup and educator views; Phase 4: real SDK, first game posting attempts, cross-origin token.
- Add an xAPI exporter (option C) when an LMS or institutional reporting requirement appears; revisit LRS-as-store only if the LRS becomes the system educators actually use.
- If self-reported `sdk` scores dominate analytics, move game scoring server-side (games submit events, server scores) — the `attempt_item` rows already fit that.
- Revisit `idempotency_key` scope (per attempt today) if bulk submission from a proctor/kiosk mode appears.
