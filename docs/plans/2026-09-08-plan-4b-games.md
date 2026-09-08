# Plan 4b — Games at Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All 22 audited-integrable RT-Games titles run behind auth on the arcade spine, seeded under their subjects, reporting scores (or completions) into the attempt spine; educators see per-attempt results; issues #52–#56 closed.

**Architecture:** Scale the proven Cell Defender recipe (copy → shim tag → one report call → seed entry) across five batches keyed to the audit (`.superpowers/sdd/4b-games-audit.md` — the per-title source of truth). New: `trailingSlash='always'` on the arcade route (#52); a `completion_only` config flag with an empty-body submit path + `RTApps.reportCompletion()`; per-attempt rows in the educator activity stats (#53, schema change → client regen); a vitest guard keeping the two Caddyfiles' header blocks identical (#56).

**Tech Stack:** unchanged (SvelteKit 2/Svelte 5, FastAPI/SQLAlchemy 2, vitest, Playwright).

**Spec:** `docs/specs/2026-09-08-plan-4b-games-design.md`. **Audit:** `.superpowers/sdd/4b-games-audit.md`. Branch `feat/games` from main. Tag: `v0.7.0` = M7.

## Global Constraints

- Legacy checkouts (`rt-app/RT-Games` above all) are STRICTLY READ-ONLY — copy from, never write to.
- Copy conventions (spec §1): per game, the diff vs legacy must show ONLY the sanctioned edits listed in that game's roster row (shim tag + report call + any listed asset/link fix). NO content or gameplay edits. Every batch report carries a per-game diff audit.
- Completion-only contract: config `"completion_only": true` (no `max_score`); empty-body submit → all score fields null; score body on completion-only → 422; missing body on scored external → 422 (unchanged). Message `{type:"rtapps:result", completion:true}`.
- max_score policy: derive from the game's own data (fixed counts × awards; best-case formula for time bonuses); genuinely unbounded → heuristic cap, derivation recorded in the batch evidence table. Server clamps regardless.
- Client regen (`make client`) happens ONLY in Task 8 (#53 schema) and Task 11 (version); any other task believing it changed a schema shape is a plan conflict to surface.
- api gates (from `apps/api`): `uv run ruff check . && uv run ruff format --check . && uv run mypy app`; `TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5434/rtapps_test uv run pytest -q > /tmp/pt.log 2>&1; echo "exit=$?"` (never pipe pytest through tail/head; ~10 min).
- web gates (repo root): `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test`.
- Never read/create/edit any `.env*` file. House labelled header comments on new files.
- Seed rules: get-or-create by title, publish once, idempotent; unknown subject slug = hard error (existing idiom).

## File map

| File | Responsibility |
|---|---|
| `apps/web/src/routes/(app)/arcade/[slug]/[...file]/+server.ts` | + `trailingSlash = 'always'` (#52) |
| `apps/api/app/attempts/router.py` + `tests/test_external_activity.py` | completion-only submit branch |
| `apps/web/static/arcade/rtapps-shim.js` | + `reportCompletion()` |
| `apps/web/src/lib/activity/ExternalPlayer.svelte` (+spec), `types.ts` | completion handling |
| `apps/web/arcade/<slug>/…` ×22 | the games |
| `apps/api/app/seed.py` (+ `tests/test_seed.py`) | `SEED_ARCADE_GAMES` list |
| `apps/api/app/analytics/queries.py`, `schemas.py`, client | #53 attempt rows |
| `.../educator/cohorts/[id]/activities/[aid]/+page.svelte` | #53 table |
| `apps/web/src/lib/server/caddy-sync.test.ts` | #56 guard |
| assorted (see Task 10) | #54/#55 cleanup |
| `apps/web/e2e/arcade.e2e.ts` | exact-percent + completion e2e |
| docs/README/main.py/client | v0.7.0 |

---

### Task 1: #52 — trailing slash pre-flight

**Files:**
- Modify: `apps/web/src/routes/(app)/arcade/[slug]/[...file]/+server.ts`

**Interfaces:**
- Produces: `/arcade/<slug>/` no longer 308-strips its trailing slash, so games' relative `script.js`/`style.css` refs resolve inside their own directory. Batches 4–5 rely on this.

- [ ] **Step 1: Implement.** Add to the route file, above the `GET` export, with this comment:
```typescript
// #52: preserve the trailing slash on /arcade/<slug>/ — SvelteKit's default 'never' 308-strips
// it, which makes a game's RELATIVE asset refs (./script.js) resolve against /arcade/ instead
// of the game's own directory. Absolute-pathed games are unaffected either way.
export const trailingSlash = 'always';
```
- [ ] **Step 2: Verify redirect flip.** Start the dev server (`pnpm --filter web dev`, background), then: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/arcade/cell-defender` → expect `308` (now redirecting TO the slash form) and `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:5173/arcade/cell-defender/` → expect `303 …/login…` (anonymous; the slash now survives). Stop the dev server.
- [ ] **Step 3: Web gates green** (`lint`, `check`, `test` — the resolver tests are URL-independent and must stay green).
- [ ] **Step 4: Commit**
```bash
git add "apps/web/src/routes/(app)/arcade"
git commit -m "fix(web): arcade route keeps trailing slashes for relative game assets (#52)"
```

---

### Task 2: Completion-only submit (API)

**Files:**
- Modify: `apps/api/app/attempts/router.py` (the external branch, shown below as it exists today)
- Test: `apps/api/tests/test_external_activity.py` (extend)

**Interfaces:**
- Consumes: the existing branch in `submit_attempt`:
```python
    if kind == "external":
        # Plan 4a: the game's client-reported score. Server-authoritative max from the
        # PINNED snapshot config; clamp so a tampered client caps out at 100%.
        if payload is None:
            raise Problem(422, "External activities require a score payload")
        ...
```
- Produces: for an external activity whose PINNED snapshot config has `"completion_only": true` — empty body accepted, `score`/`max_score`/`percent`/`passed` all null; a score body → 422. Scored externals byte-identical behavior. No schema change (the body was already optional) — no client regen.

- [ ] **Step 1: Failing tests** (extend `test_external_activity.py`, reusing its Task-1/2 fixtures — create the activity with `config={"arcade_slug": "beam-sculptor", "completion_only": True}` and no max_score):
```python
async def test_completion_only_submit_records_null_scores(...):
    # start attempt; submit with NO body → 200; score/max_score/percent/passed all None;
    # status "submitted"; rollup row exists (upsert_activity_result ran)

async def test_completion_only_rejects_score_payload(...):
    # submit with {"score": 50} → 422

async def test_scored_external_still_requires_payload(...):
    # existing scored fixture: submit with no body → 422 (unchanged behavior, pin it)
```
- [ ] **Step 2: Run — expect FAIL** (currently a completion-only activity's empty-body submit 422s).
- [ ] **Step 3: Implement.** Replace the external branch's opening with:
```python
    if kind == "external":
        config = version.snapshot["activity"]["config"]
        if config.get("completion_only"):
            # Plan 4b: completion-only games (no meaningful numeric score). Same contract
            # as flashcards — recording that the game was played, no score fields at all.
            if payload is not None:
                raise Problem(422, "Completion-only activities do not take a score")
            attempt.score = attempt.max_score = attempt.percent = None
            attempt.passed = None
        else:
            # Plan 4a: the game's client-reported score. Server-authoritative max from the
            # PINNED snapshot config; clamp so a tampered client caps out at 100%.
            if payload is None:
                raise Problem(422, "External activities require a score payload")
            max_score = float(config.get("max_score") or 0)
            if max_score <= 0:
                raise Problem(422, "Activity has no max_score configured")
            score = min(payload.score, max_score)
            attempt.score = score
            attempt.max_score = max_score
            attempt.percent = round(100.0 * score / max_score, 2)
            attempt.passed = None  # practice: no pass mark for games
```
(The pre-existing `if kind != "external" and payload is not None: 422` guard above it stays.)
- [ ] **Step 4: Full api suite green** (`exit=0`).
- [ ] **Step 5: Gates + commit**
```bash
git add apps/api
git commit -m "feat(api): completion-only submit for unscored external activities"
```

---

### Task 3: Completion-only shim + player (web)

**Files:**
- Modify: `apps/web/static/arcade/rtapps-shim.js`, `apps/web/src/lib/activity/ExternalPlayer.svelte`, `apps/web/src/lib/activity/ExternalPlayer.svelte.spec.ts`, `apps/web/src/lib/activity/attempts.ts` (+`attempts.test.ts`), `apps/web/src/lib/activity/types.ts`

**Interfaces:**
- Consumes: Task 2's contract; the existing shim latch; `submitAttempt(post, attemptId)` already posts an empty-body submit with an Idempotency-Key (reuse it for completions — no new helper needed; verify its request truly has no body, it does).
- Produces: shim `RTApps.reportCompletion()`; `ExternalSnapshot.external` gains `completion_only?: boolean` (mirror of config; add `"completion_only": config.get("completion_only", False)` to the API's external snapshot branch in `apps/api/app/content/activity_snapshots.py` — a snapshot CONTENT addition, not a schema-shape change).

- [ ] **Step 1: Shim.** Inside the existing IIFE (same `sent` latch — a game reports a result OR a completion, once):
```javascript
		reportCompletion: function () {
			if (sent || window.parent === window) return;
			sent = true;
			window.parent.postMessage(
				{ type: 'rtapps:result', completion: true },
				window.location.origin
			);
		}
```
- [ ] **Step 2: Failing player spec cases** (existing idiom; render with a snapshot whose `external.completion_only` is true):
```
1. completion-only activity + {type:"rtapps:result", completion:true} → empty-body submit
   fired once; panel shows "Completed" and NO percent text
2. completion-only activity + a SCORE message ({score: 1200}) → ignored, no submit
3. scored activity + a COMPLETION message → ignored, no submit
4. completion message twice → one submit (latch)
```
- [ ] **Step 3: Implement player.** In `ExternalPlayer.svelte`'s `onMessage`, after the type check and before the score handling:
```typescript
		const completionOnly = snapshot.external.completion_only === true;
		const isCompletion = (data as { completion?: unknown }).completion === true;
		if (completionOnly !== isCompletion) return; // score↔completion cross-messages ignored
		if (isCompletion) {
			if (reportedScore !== null || status !== 'playing') return;
			reportedScore = 0; // latch (value unused for completions)
			void submitCompletion();
			return;
		}
```
with `submitCompletion` beside `submitScore`:
```typescript
	async function submitCompletion() {
		if (attemptId === null) return;
		status = 'submitting';
		try {
			await submitAttempt(post, attemptId);
			percent = null;
			status = 'done';
		} catch (event) {
			errorMessage = event instanceof Error ? event.message : 'Submit failed';
			status = 'error';
		}
	}
```
Result panel: `{#if percent === null}Completed{:else}Score recorded: {percent}%{/if}` (retry button for completion errors re-calls `submitCompletion` — key retry off `reportedScore !== null` and `snapshot.external.completion_only`). `types.ts`: add `completion_only?: boolean` to `ExternalSnapshot['external']`.
- [ ] **Step 4: API snapshot addition** (one line in `activity_snapshots.py`'s external dict): `"completion_only": activity.config.get("completion_only", False),` — extend the Task-1-era snapshot test to assert it.
- [ ] **Step 5: All gates green, both projects** (api full suite for the snapshot line; web lint/check/test).
- [ ] **Step 6: Commit**
```bash
git add apps/web/static/arcade apps/web/src/lib/activity apps/api
git commit -m "feat: completion-only games — shim reportCompletion and player handling"
```

---

### Tasks 4–7 + Task 9: the game batches

Shared per-batch procedure (each batch task repeats it with its own roster table — the audit `.superpowers/sdd/4b-games-audit.md` carries the per-title evidence, quoted line numbers included; READ YOUR BATCH'S ROWS THERE FIRST):

1. **Derive**: for each game, open the copied-from legacy file, locate the score variable and game-over site named in the roster row, and pin the max_score (fixed derivation, or heuristic cap with reasoning). Record every derivation in the report's evidence table.
2. **Failing seed tests**: extend `apps/api/tests/test_seed.py` — for each game: activity exists by title, `kind="external"`, `status="published"`, `access="practice"`, exact `config`; idempotency counts updated (seed twice, counts stable).
3. **Copy + wire**: `cp` the legacy file(s) to `apps/web/arcade/<slug>/…`; insert `<script src="/arcade/rtapps-shim.js"></script>` immediately before the main game script; insert the report call at the game-over site; apply ONLY the sanctioned extra edits from the roster row. Multi-file games copy their whole directory.
4. **Seed**: append the batch's entries to `SEED_ARCADE_GAMES` (Task 4 creates it — see below).
5. **Diff audit**: for each game, `diff` legacy vs copy; the report quotes each diff proving only sanctioned edits.
6. **Gates**: full api suite green; web lint/check green (games are prettier-ignored; nothing else changed web-side).
7. **Commit** (message per batch below).

Task 4 FIRST converts the seed to scale: replace `SEED_ARCADE_GAME = {…}` with a list, keeping Cell Defender as entry zero:
```python
# Arcade games (plans 4a/4b), get-or-created by title like the practice calculators.
# max_score derivations live in each plan-4b batch's evidence table
# (.superpowers/sdd/task-N-report.md) and the audit; unbounded games carry heuristic
# caps (server clamps; percent ≤ 100). completion_only games have no max_score.
SEED_ARCADE_GAMES = [
    {
        "title": "Cell Defender",
        "subject_slug": "radiation-biology",
        "config": {"arcade_slug": "cell-defender", "max_score": 5000},
    },
    # …batch entries append here…
]
```
and generalize the existing get-or-create block to loop over the list (same body, `for game in SEED_ARCADE_GAMES:`). Existing Cell Defender tests must stay green unchanged.

### Task 4: Batch 1 — clean fixed maxes (6)

| Title | Legacy source | slug | subject | Wiring (game-over site) | config |
|---|---|---|---|---|---|
| Anatomy Atlas Adventure | `anatomy_atlas_game_index.html` | `anatomy-atlas` | `sectional-anatomy` | `reportResult(score)` at its game-over (5 cases × 100) | `{"arcade_slug": "anatomy-atlas", "max_score": 500}` |
| Dose Calc Dash | `dose_calc_dash_game_index.html` | `dose-calc-dash` | `treatment-planning` | `reportResult(score)` (4 cases × 100) | `{"arcade_slug": "dose-calc-dash", "max_score": 400}` |
| Adaptive Consultation Assessment | `onco_conversations_game_index.html` | `adaptive-consultation` | `patient-care` | `reportResult(score.user)` where `finalPercentage` is computed (score.user/score.max both tracked — max_score = the fixed sum of scenario maxPoints; derive the number) | `{"arcade_slug": "adaptive-consultation", "max_score": <derived>}` |
| Adaptive Ethical Decision-Making Simulator | `ethical_decision_making/index.html` | `ethical-decisions` | `ethics` | same score.user/score.max shape — derive the fixed max | `{"arcade_slug": "ethical-decisions", "max_score": <derived>}` |
| Legal Eagle Lineup | `legal_eagle_game_index.html` | `legal-eagle` | `ethics` | `reportResult(score)`; max = case count × 100 (confirm count from `allCaseFiles`) | `{"arcade_slug": "legal-eagle", "max_score": <derived>}` |
| Vital Signs Challenge | `vital-signs-challenge` (**extensionless file — copy AS `index.html`**, the sanctioned rename) | `vital-signs` | `patient-care` | `reportResult(score)` in `showGameOver` (L531); max = rounds × per-round max (confirm) | `{"arcade_slug": "vital-signs", "max_score": <derived>}` |

`<derived>` means: the implementer derives the number in Step 1 from the game's own data arrays, uses the literal in seed + tests, and shows the arithmetic in the evidence table — it is not optional and not an estimate unless the table says "unbounded → cap".

Commit: `git add apps/web/arcade apps/api && git commit -m "feat: arcade batch 1 - six fixed-max games seeded"`

### Task 5: Batch 2 — max needs derivation (5)

| Title | Legacy source | slug | subject | Wiring | config |
|---|---|---|---|---|---|
| Care Commander | `care_commander_game_index.html` | `care-commander` | `patient-care` | `reportResult(score)`; derive from `needTypes`/`stations` structure | `max_score: <derived>` |
| Error Reporter | `error_reporter_game_v3_index.html` | `error-reporter` | `quality-management-and-safety` | `reportResult(score)`; mixed +100/xpGained — derive best-case per level | `max_score: <derived>` |
| QA Crusader | `qa_crusader_game_index.html` | `qa-crusader` | `quality-management-and-safety` | `reportResult(score)`; 6 levels, matches + 500 bonus — derive best case | `max_score: <derived>` |
| Safety Supervisor | `safety_supervisor_game_index.html` | `safety-supervisor` | `radiation-protection` | `reportResult(score)`; levels × 100 (confirm count) | `max_score: <derived>` |
| Procedure Pursuit | `procedure_pursuit_game_index.html` | `procedure-pursuit` | `treatment-delivery-procedures` | `reportResult(score)`; 20 questions, time-bonus — best-case formula (base × 20 + max bonus), show the formula | `max_score: <derived>` |

Commit: `…batch 2 - five derived-max games seeded"`

### Task 6: Batch 3 — heuristic / odd wiring (5)

| Title | Legacy source | slug | subject | Wiring | config |
|---|---|---|---|---|---|
| Anatomy Angler | `anatomy_angler_game_index.html` | `anatomy-angler` | `sectional-anatomy` | `reportResult(score)`; unbounded → heuristic cap (Cell Defender precedent; justify the number) | `max_score: <cap>` |
| Side Effect Sorcerer | `side_effect_sorcerer_game_v4_index.html` | `side-effect-sorcerer` | `radiation-biology` | `reportResult(score)`; unbounded → cap | `max_score: <cap>` |
| Gantry Position Guessing Game | `gantry_name_game/index.html` | `gantry-game` | `treatment-delivery-procedures` | `reportResult(score)` (confirm fixed rounds → derive, else cap) | `max_score: <derived-or-cap>` |
| LINAC Component Identification | `linac-parts/index.html` | `linac-parts` | `treatment-delivery-procedures` | `reportResult(correctCount)` — note the variable name; max = component count (derive) | `max_score: <derived>` |
| SSD Practice - BEV | `ssd_practice/index.html` | `ssd-practice` | `treatment-planning` | `reportResult(nCorrect)` at its end-of-round; max = total questions (derive) | `max_score: <derived>` |

Commit: `…batch 3 - five heuristic and counter-wired games seeded"`

### Task 7: Batch 4 — relative assets (4; REQUIRES Task 1)

Directory games copy whole directories (`index.html` + `script.js` + `style.css` + `quiz.html` where present); relative refs now work under the preserved trailing slash. Sanctioned per-game extra edits listed here and ONLY here.

| Title | Legacy source | slug | subject | Wiring + sanctioned edits | config |
|---|---|---|---|---|---|
| CT Simulation Border Challenge | `ct-borders/index.html` | `ct-borders` | `sectional-anatomy` | `reportResult(correctAnswers)` at game end; `MAX_CORRECT = 10` → max 10; SANCTIONED: remove/neutralize the `href="../index.html"` back-link (containment 404s it) | `{"arcade_slug": "ct-borders", "max_score": 10}` |
| Dosimetry Vocabulary Game | `dosimetry_vocabulary/` (note the legacy `style.css.css` filename — copy as-is, it is referenced correctly) | `dosimetry-vocabulary` | `radiation-physics` | `reportResult(score)` in script.js's end state; derive max | `max_score: <derived>` |
| Rad Units Challenge | `rad_units_challenge/` (menu `index.html` + `quiz.html` + shared script) | `rad-units` | `radiation-physics` | wire the report call in the shared `script.js` end-of-quiz path (works for all 4 modes; derive max from the mode question counts — if modes differ, use the largest and note it); SANCTIONED: fix `quiz.html`'s broken `menu.html` back-link to `index.html` | `max_score: <derived>` |
| Sectional Anatomy Quiz | `sectional_anatomy_challenge/` (same menu+quiz shape) | `sectional-anatomy-quiz` | `sectional-anatomy` | same shape as Rad Units | `max_score: <derived>` |

The shim `<script>` goes in each HTML entry page that hosts gameplay (`quiz.html` where the game runs, `index.html` where it's the menu — menu pages need no shim).
Commit: `…batch 4 - four relative-asset games seeded"`

### Task 9: Batch 5 — completion-only (2; REQUIRES Tasks 2–3)

| Title | Legacy source | slug | subject | Wiring | config |
|---|---|---|---|---|---|
| Beam Sculptor | `beam_sculptor_game_v2_index.html` | `beam-sculptor` | `treatment-planning` | `if (window.RTApps) window.RTApps.reportCompletion();` inside `endGame(won, message)` (fires for approved AND rejected — playing to a verdict is the completion) | `{"arcade_slug": "beam-sculptor", "completion_only": true}` |
| OncoLife UNO: The Clinical Shift | `onco_uno_game_index.html` | `onco-uno` | `patient-care` | `reportCompletion()` at its game-end state (locate the win/lose handler) | `{"arcade_slug": "onco-uno", "completion_only": true}` |

Seed tests additionally assert these two configs carry `completion_only: True` and NO `max_score` key.
Commit: `…batch 5 - two completion-only games seeded"`

---

### Task 8: #53 — educator per-attempt rows

**Files:**
- Modify: `apps/api/app/analytics/schemas.py` (`ActivityStatsOut` + new `AttemptRowOut`), `apps/api/app/analytics/queries.py` (`activity_stats`, line ~240)
- Modify: `packages/api-client/*` (via `make client` only)
- Modify: `apps/web/src/routes/(app)/educator/cohorts/[id]/activities/[aid]/+page.svelte`
- Test: the analytics API test file that covers `GET /{cohort_id}/activities/{activity_id}` (find it: `grep -rln "activity_stats\|activities/{activity_id}" apps/api/tests`), extend it.

**Interfaces:**
- Produces: `ActivityStatsOut.attempt_rows: list[AttemptRowOut]` — populated ONLY for `kind == "external"` (empty list otherwise); `AttemptRowOut = {display_name: str, score: float | None, max_score: float | None, percent: float | None, submitted_at: datetime}`; ordered newest first. Completion-only attempts have all three numbers null → the page renders "Completed".

- [ ] **Step 1: Failing API test**: seed-style fixture with an external activity + two submitted attempts (one scored 24%, one completion-only if cheap — else two scored); assert `attempt_rows` carries display_name/percent ordered newest-first, and that a QUIZ activity's stats return `attempt_rows == []`.
- [ ] **Step 2: Implement.** `schemas.py`:
```python
class AttemptRowOut(BaseModel):
    # One submitted attempt on an EXTERNAL activity (plan 4b #53): games have no per-item
    # stats, so educators get the per-attempt scores instead. Empty for other kinds.
    display_name: str
    score: float | None
    max_score: float | None
    percent: float | None
    submitted_at: datetime
```
add `attempt_rows: list[AttemptRowOut]` to `ActivityStatsOut`. In `queries.py`'s `activity_stats`, populate for external kind: submitted attempts by this cohort's members on this activity (join `User` for `display_name`, reuse the function's existing cohort-member filtering — read how its existing aggregates scope attempts and use the same predicate), `order_by(Attempt.submitted_at.desc())`; else `[]`.
- [ ] **Step 3: api gates + full suite green**, then `make client` (repo root) — commit will include the regenerated client.
- [ ] **Step 4: Web page.** After the "Score distribution" table in the educator page, render only when rows exist:
```svelte
{#if data.stats.attempt_rows.length > 0}
	<h2>Attempts</h2>
	<table>
		<thead><tr><th>Student</th><th>Score</th><th>Percent</th></tr></thead>
		<tbody>
			{#each data.stats.attempt_rows as row (row.submitted_at + row.display_name)}
				<tr>
					<td>{row.display_name}</td>
					<td>{row.score === null ? '—' : `${row.score} / ${row.max_score}`}</td>
					<td>{row.percent === null ? 'Completed' : formatPercent(row.percent)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
```
- [ ] **Step 5: web gates green.**
- [ ] **Step 6: Commit**
```bash
git add apps/api packages/api-client "apps/web/src/routes/(app)/educator"
git commit -m "feat: per-attempt score rows for external activities in educator stats (#53)"
```

---

### Task 10: #56 guard + #54/#55 cleanup batches

**Files:**
- Create: `apps/web/src/lib/server/caddy-sync.test.ts` (#56)
- Modify (#54): `apps/api/tests/test_external_activity.py`, `apps/api/tests/test_seed.py`, `apps/web/src/lib/activity/ExternalPlayer.svelte.spec.ts`, `apps/web/e2e/arcade.e2e.ts`
- Modify (#55): `apps/api/app/content/activity_snapshots.py` (docstring), `apps/web/src/lib/server/arcade.ts` + `arcade.test.ts` + the arcade `+server.ts` (header comments), `apps/web/Dockerfile` (one comment)

- [ ] **Step 1 (#56): the guard test** (vitest server project — runs in the existing web CI job, no workflow edits):
```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// #56: plan 4a's final review caught infra/Caddyfile flipped to SAMEORIGIN while
// Caddyfile.prod still sent DENY — prod would silently have blocked the arcade iframe.
// This pins the two files' security-header lines to each other.
const HEADERS = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];

function headerLines(file: string): string[] {
	const text = fs.readFileSync(path.resolve(__dirname, '../../../../../infra', file), 'utf8');
	return HEADERS.map(
		(h) => text.split('\n').find((line) => line.trim().startsWith(h))?.trim() ?? `${h}: MISSING`
	);
}

describe('Caddyfile security-header sync', () => {
	it('dev and prod proxies send identical security headers', () => {
		expect(headerLines('Caddyfile')).toEqual(headerLines('Caddyfile.prod'));
	});
});
```
Adjust the `path.resolve` depth to the actual file location (verify by running the test); verify the header names against the real files first and use the exact set present in both.
- [ ] **Step 2: prove the guard**: temporarily change one header in one file → test fails; revert → passes. ALSO check `.github/workflows/pr.yml`: if the `web` job is path-filtered such that an infra-only change skips it, report that as a concern in your report (do NOT edit the workflow — the token can't push workflow changes; the controller handles it).
- [ ] **Step 3 (#54)**: add `test_external_submit_rejects_zero_max_config` (activity with `max_score: 0` → 422) and a request-level negative-score test (schema 422); fix `test_seed_is_idempotent` to capture counts BETWEEN the two `seed()` calls; move the `expect()` calls out of ExternalPlayer spec fakes (assert after the awaited render instead); add `await page.waitForFunction(() => (window as any).RTApps !== undefined)`-equivalent inside the arcade e2e's frame before `evaluate` (match the file's existing style — it may need `frame.waitForFunction`).
- [ ] **Step 4 (#55)**: docstring/comment fixes — activity_snapshots module docstring kind list gains `external`; the three arcade files' "Depends on" lines match their actual imports; the Dockerfile comment about `"files"` mentions `arcade/`.
- [ ] **Step 5: both projects' gates green** (api full suite for the new tests; web full gates).
- [ ] **Step 6: Commit**
```bash
git add apps/web apps/api
git commit -m "test+docs: Caddyfile sync guard, coverage batch, comment drift (#54 #55 #56)"
```

---

### Task 11: e2e — completion flow + exact percent (REQUIRES Tasks 8–9)

**Files:**
- Modify: `apps/web/e2e/arcade.e2e.ts`

- [ ] **Step 1**: upgrade the educator assertion from the 0–49% bucket floor check to the exact row: the Attempts table shows the student's row with `24%` (use the #53 table's cells).
- [ ] **Step 2**: add a completion-only case: student opens Beam Sculptor from Treatment Planning, `frame.evaluate(() => RTApps.reportCompletion())`, expect the "Completed" panel; educator's Beam Sculptor stats page shows the attempt row with "Completed".
- [ ] **Step 3**: run the arcade spec, then the full e2e suite against the compose stack (you own compose/e2e; seed must include the new games — re-run the seed step first so batches 1–5's activities exist).
- [ ] **Step 4: Commit**
```bash
git add apps/web/e2e
git commit -m "test(e2e): completion-only flow and exact educator percent"
```

---

### Task 12: Docs, version 0.7.0, full gates

**Files:**
- Modify: `apps/api/app/main.py` (`version="0.7.0"`), `docs/03-architecture.md` (extend §6.5 with one short paragraph: the game library — 23 games incl. Cell Defender, batch integration recipe, completion-only contract, per-attempt educator rows), `README.md` (status → v0.7.0 / M7 — game library on the arcade spine; next: 4c simulator world), `packages/api-client` (via `make client` after the version edit)

- [ ] **Step 1: Edits** (grep api tests for "0.6" pins). **Step 2**: `make client`. **Step 3: BOTH projects' full gates, sequenced.** **Step 4: Commit**
```bash
git add apps/api docs README.md packages/api-client
git commit -m "feat: v0.7.0 - game library docs and version bump"
```

---

## Execution notes (for the controller)

- Order: 1 → 2 → 3 (spine chain); 4 → 5 → 6 sequential (each rebases the seed list); 7 after 1; 9 after 3; 8 independent after 3; 10 after 9 (its #54 e2e tweak touches the arcade spec); 11 after 8+9+10; 12 last. One writer at a time; batches are big transcription tasks — sonnet for 4 and 7 (multi-file/derivations), haiku acceptable for 5, 6, 9 with sonnet review.
- Batch reviews verify game-by-game against the audit: wiring site, diff-vs-legacy shows only sanctioned edits, max derivation arithmetic, subject slug, seed/test exactness. This is the plan's whole quality story — do not skimp.
- Legacy tree read-only; copies only.
- If Task 10's pr.yml path-filter check reports the web job skips infra-only changes, the controller adds the path to the workflow AND merges the PR via local git (`gh` token lacks workflow scope — the 1c lesson).
- e2e/compose ownership: Tasks 11 (and any batch spot-checks) exclusively.
- Final whole-branch review lenses: per-game diff audits (sample several), max_score derivations re-checked, completion contract cross-checks (score↔completion cross-messages), #56 guard actually runs in CI for this PR, seed idempotency at 23 games, backlog triage.
