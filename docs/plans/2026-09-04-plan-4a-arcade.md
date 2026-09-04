# Plan 4a — Arcade Spine + Pilot Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A legacy browser game (Cell Defender) runs behind platform auth, launched from its subject page, and its score lands in the attempt spine — visible in educator stats with no analytics changes.

**Architecture:** Games are static files in `apps/web/arcade/<slug>/`, streamed by an auth-gated SvelteKit `+server.ts` route on the same origin. A game is an `activity` with the new `kind="external"` and `config = {arcade_slug, max_score}`. The student route renders it as a full-viewport iframe; a ~20-line shim in the game posts `{type:"rtapps:result", score}` to the parent on game over; the parent page (ExternalPlayer) owns the attempt lifecycle and submits the score. The server is authoritative for `max_score` (read from the pinned snapshot config, score clamped) — the client never supplies the denominator.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, FastAPI + SQLAlchemy 2 async + Alembic, vitest (server + browser projects), Playwright.

**Spec:** `docs/specs/2026-09-04-plan-4a-arcade-spine-design.md`. Branch `feat/arcade` from main. Tag at the end: `v0.6.0` = milestone M6.

## Global Constraints

- Legacy checkouts (`rt-app/RT-Games`, `rtt_e_workbook`, `simulator`) are STRICTLY READ-ONLY — copy from them, never write to them.
- Never read, create, or edit any `.env*` file.
- Game files must NOT be reachable logged-out: they live in `apps/web/arcade/` (a source dir), never `apps/web/static/` — except the shim, which is deliberately public (it contains no secrets and makes no API calls) and lives at `apps/web/static/arcade/rtapps-shim.js`.
- Grading semantics for external activities: `score` clamped to `[0, max_score]`, `max_score` from the PINNED snapshot's `activity.config` (server-side, never from the client), `percent` rounded to 2 places, `passed` stays `null` (practice, no pass mark in 4a).
- The shim message shape is exactly `{type: "rtapps:result", score: number, max: number | null}`; the bridge ignores `max` in 4a (server-authoritative), accepts same-origin messages only, and submits at most once per attempt.
- This plan CHANGES the OpenAPI schema (optional submit body): the task that changes `apps/api/app/attempts/` MUST run `make client` and commit the regenerated `packages/api-client` in the same commit, or the CI `contract` job fails.
- api gates (from `apps/api`): `uv run ruff check . && uv run ruff format --check . && uv run mypy app` and `TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5434/rtapps_test uv run pytest -q > /tmp/pt.log 2>&1; echo "exit=$?"` (never pipe pytest through tail/head; full suite ~10 min).
- web gates (repo root): `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test`.
- House style: every new hand-written file gets the labelled header comment (What this file does / Used here and why / How it fits the project / Depends on / Used by) matching its neighbors.

## File map

| File | Responsibility |
|---|---|
| `apps/api/app/content/models.py` | `ACTIVITY_KINDS` gains `"external"` |
| `apps/api/alembic/versions/0008_external_kind.py` | widen `ck_activity_kind` |
| `apps/api/app/content/activity_snapshots.py` | external snapshot branch |
| `apps/api/app/attempts/schemas.py` + `router.py` | `ExternalSubmitIn`, external submit branch |
| `apps/api/app/seed.py` + `tests/test_seed.py` | Cell Defender activity |
| `apps/api/tests/test_external_activity.py` | external kind + submit lifecycle tests |
| `apps/web/src/lib/server/arcade.ts` (+ `.test.ts`) | pure path/type resolver |
| `apps/web/src/routes/(app)/arcade/[slug]/[...file]/+server.ts` | auth-gated file streaming |
| `apps/web/static/arcade/rtapps-shim.js` | the in-game shim (public, harmless) |
| `apps/web/arcade/cell-defender/index.html` | the copied + wired pilot game |
| `apps/web/src/lib/activity/types.ts` | `ExternalSnapshot` |
| `apps/web/src/lib/activity/attempts.ts` (+ `.test.ts`) | `submitExternalAttempt` |
| `apps/web/src/lib/activity/ExternalPlayer.svelte` (+ `.svelte.spec.ts`) | iframe + bridge + result panel |
| `apps/web/src/routes/(app)/subjects/[slug]/activities/[id]/+page.svelte` | external branch |
| `apps/web/src/routes/(app)/subjects/[slug]/+page.svelte` | Games label + Simulator section |
| `apps/web/package.json` | `"files"` gains `"arcade"` (prod image) |
| `apps/web/e2e/arcade.e2e.ts` | end-to-end exit criterion |
| `docs/03-architecture.md`, `README.md`, `apps/api/app/main.py` | docs + version 0.6.0 |

---

### Task 1: API — the `external` activity kind

**Files:**
- Modify: `apps/api/app/content/models.py:59` (`ACTIVITY_KINDS`)
- Create: `apps/api/alembic/versions/0008_external_kind.py`
- Modify: `apps/api/app/content/activity_snapshots.py` (after the calculator branch, ~line 200)
- Test: `apps/api/tests/test_external_activity.py` (new)

**Interfaces:**
- Consumes: `_activity_part(activity)` and `_subject_ref(db, activity)` (both already in `activity_snapshots.py`); `publish_activity` (existing, kind-agnostic).
- Produces: snapshot shape `{"activity": {..., "kind": "external", "config": {...}}, "external": {"arcade_slug": str, "max_score": int, "subject": {...}}}` — Tasks 2/5/7 rely on it exactly.

- [ ] **Step 1: Write the failing test.** Look at `apps/api/tests/test_calculator_activity.py` first and copy its fixture idiom for creating + publishing an activity (subject creation, session fixtures, auth helpers — reuse the same helpers it imports). New file `apps/api/tests/test_external_activity.py`:

```python
"""
What this file does: tests for the `external` activity kind (plan 4a) — model constraint,
snapshot shape, and (Task 2) the score-submit lifecycle.
Used here and why: mirrors test_calculator_activity.py's publish-then-read idiom; the
snapshot must embed arcade_slug/max_score from config at publish time.
How it fits the project: plan 4a §3 (player route contract), docs/03-architecture.md §6.5.
Depends on: conftest fixtures, app.content.activity_snapshots, app.authoring publish route.
Used by: pr.yml api job.
"""

async def test_external_activity_publish_and_snapshot(db, ...):  # match conftest fixture names
    # Create an activity row directly (authoring UI for external is out of 4a scope):
    activity = Activity(
        kind="external",
        ref_id=new_id(),
        title="Cell Defender",
        subject_id=subject.id,
        status="draft",
        access="practice",
        config={"arcade_slug": "cell-defender", "max_score": 5000},
    )
    db.add(activity)
    await db.flush()
    version = await publish_activity(db, activity, author=educator, change_note="test")
    snap = version.snapshot
    assert snap["activity"]["kind"] == "external"
    assert snap["external"]["arcade_slug"] == "cell-defender"
    assert snap["external"]["max_score"] == 5000
    assert snap["external"]["subject"]["slug"] == subject.slug
```

Adapt imports/fixture names to what `test_calculator_activity.py` actually uses — that file is the template; the assertions above are the requirement.

- [ ] **Step 2: Run it — expect FAIL** (`IntegrityError` from `ck_activity_kind` or a snapshot `ValueError`): `TEST_DATABASE_URL=... uv run pytest tests/test_external_activity.py -q`

- [ ] **Step 3: Implement.**

`models.py:59`:
```python
ACTIVITY_KINDS = ("lesson", "quiz", "flashcards", "matching", "sequencing", "calculator", "external")
```

`alembic/versions/0008_external_kind.py` (copy 0007's header-comment style; `down_revision` = the revision id inside 0007, read it from the file):
```python
def upgrade() -> None:
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint(
        "ck_activity_kind",
        "activity",
        "kind IN ('lesson', 'quiz', 'flashcards', 'matching', 'sequencing', 'calculator', 'external')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint(
        "ck_activity_kind",
        "activity",
        "kind IN ('lesson', 'quiz', 'flashcards', 'matching', 'sequencing', 'calculator')",
    )
```

`activity_snapshots.py`, immediately after the calculator branch (the `subject` variable from `_subject_ref` is already in scope):
```python
    # External: an embedded browser app (plan 4a). There is no working-copy row to resolve —
    # the snapshot pins the arcade slug and score ceiling straight from the activity config,
    # so a later config edit never changes what an already-pinned attempt was played against.
    if activity.kind == "external":
        return {
            "activity": _activity_part(activity),
            "external": {
                "arcade_slug": activity.config.get("arcade_slug"),
                "max_score": activity.config.get("max_score"),
                "subject": subject,
            },
        }
```

- [ ] **Step 4: Migration + test pass.** From `apps/api`: `TEST_DATABASE_URL=... uv run pytest tests/test_external_activity.py tests/test_migrations.py -q` (if a migrations test file exists — check; conftest runs `alembic upgrade head` against the test DB either way). Expected: PASS.

- [ ] **Step 5: Gates + commit.**
```bash
git add apps/api
git commit -m "feat(api): external activity kind with pinned arcade snapshot"
```

---

### Task 2: API — score submit for external attempts (+ client regen)

**Files:**
- Modify: `apps/api/app/attempts/schemas.py`, `apps/api/app/attempts/router.py` (`submit_attempt`, line ~177)
- Modify: `packages/api-client/*` (generated — via `make client` only, never by hand)
- Test: `apps/api/tests/test_external_activity.py` (extend)

**Interfaces:**
- Consumes: Task 1's snapshot shape; existing `submit_attempt` flow (idempotency, rollup).
- Produces: `POST /api/v1/attempts/{id}/submit` accepts an OPTIONAL JSON body `{"score": <float >= 0>}` (`ExternalSubmitIn`). Required for external-kind attempts (422 without it); 422 if sent for any other kind. Task 5's `submitExternalAttempt` calls it.

- [ ] **Step 1: Failing tests** (extend `test_external_activity.py`; reuse the publish fixture from Task 1 and the attempt-flow helpers from whichever test file exercises `POST /activities/{id}/attempts` — find it with `grep -rn "attempts" apps/api/tests --include="*.py" -l` and copy its client-call idiom):

```python
async def test_external_attempt_submit_records_clamped_score(client, ...):
    # start attempt on the published external activity
    # submit with {"score": 1200} → 200; percent == 24.0; passed is None; max_score == 5000
    # submit with {"score": 999999} on a fresh attempt → score clamped to 5000, percent == 100.0

async def test_external_submit_requires_score_payload(client, ...):
    # submit external attempt with NO body → 422

async def test_score_payload_rejected_for_graded_kinds(client, ...):
    # start an attempt on a published quiz, submit WITH {"score": 3} → 422
```

- [ ] **Step 2: Run — expect FAIL** (422s missing / body ignored).

- [ ] **Step 3: Implement.**

`schemas.py` (bottom, matching neighbors' docstring style):
```python
class ExternalSubmitIn(BaseModel):
    """Score reported by an external activity's player page (plan 4a). The server is
    authoritative for the denominator: `max_score` comes from the pinned snapshot's
    activity config and the score is clamped into [0, max_score] — a tampered client
    can inflate its own practice percent to at most 100, never break the scale."""

    score: float = Field(ge=0)
```

`router.py` — add `payload: ExternalSubmitIn | None = None` to `submit_attempt`'s signature (import `ExternalSubmitIn`), then restructure the kind branches:
```python
    kind = version.snapshot["activity"]["kind"]
    if kind != "external" and payload is not None:
        raise Problem(422, "A score payload is only valid for external activities")
    if kind == "external":
        # Plan 4a: the game's client-reported score. Server-authoritative max from the
        # PINNED snapshot config; clamp so a tampered client caps out at 100%.
        if payload is None:
            raise Problem(422, "External activities require a score payload")
        max_score = float(version.snapshot["activity"]["config"].get("max_score") or 0)
        if max_score <= 0:
            raise Problem(422, "Activity has no max_score configured")
        score = min(payload.score, max_score)
        attempt.score = score
        attempt.max_score = max_score
        attempt.percent = round(100.0 * score / max_score, 2)
        attempt.passed = None  # practice: no pass mark for games in 4a
    elif kind == "flashcards":
        ...  # existing branch unchanged
    else:
        ...  # existing graded branch unchanged
```

- [ ] **Step 4: Tests pass**, then the FULL api suite (`exit=0`).

- [ ] **Step 5: Regenerate the client** (repo root): `make client`, then `git diff --stat packages/api-client` — expect changes in `openapi.json` + `src/schema.d.ts` (new optional requestBody + `ExternalSubmitIn`).

- [ ] **Step 6: Gates + commit** (client regen in the SAME commit):
```bash
git add apps/api packages/api-client
git commit -m "feat(api): external attempts submit a server-clamped score"
```

---

### Task 3: Web — auth-gated arcade serving route

**Files:**
- Create: `apps/web/src/lib/server/arcade.ts`, `apps/web/src/lib/server/arcade.test.ts`
- Create: `apps/web/src/routes/(app)/arcade/[slug]/[...file]/+server.ts`
- Modify: `apps/web/package.json:6` (`"files"` array)

**Interfaces:**
- Produces: `GET /arcade/<slug>/` serves `apps/web/arcade/<slug>/index.html` to signed-in users; `GET /arcade/<slug>/<file>` serves allow-listed types; 404 otherwise. `resolveArcadeFile(root, slug, rest) -> {filePath, contentType} | null`. Tasks 4/5/8 rely on the URL shape `/arcade/<slug>/`.
- Consumes: `hooks.server.ts`'s deny-by-default guard (any `/arcade/*` path already redirects anonymous users to login — no guard change needed; the route adds a 401 as defense in depth).

- [ ] **Step 1: Failing resolver tests** — `arcade.test.ts` (vitest server project; copy `guard.test.ts`'s header/style):
```typescript
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveArcadeFile } from './arcade';

const root = '/srv/arcade';

describe('resolveArcadeFile', () => {
	it('serves index.html for an empty rest path', () => {
		expect(resolveArcadeFile(root, 'cell-defender', '')).toEqual({
			filePath: path.resolve(root, 'cell-defender', 'index.html'),
			contentType: 'text/html; charset=utf-8'
		});
	});
	it('maps known extensions', () => {
		expect(resolveArcadeFile(root, 'g', 'a/b.js')?.contentType).toBe('text/javascript');
		expect(resolveArcadeFile(root, 'g', 'x.png')?.contentType).toBe('image/png');
	});
	it('rejects traversal, bad slugs, and unknown extensions', () => {
		expect(resolveArcadeFile(root, 'g', '../../etc/passwd')).toBeNull();
		expect(resolveArcadeFile(root, '..', 'index.html')).toBeNull();
		expect(resolveArcadeFile(root, 'G!', '')).toBeNull();
		expect(resolveArcadeFile(root, 'g', 'x.exe')).toBeNull();
	});
});
```

- [ ] **Step 2: Run — FAIL** (`resolveArcadeFile` not defined): `pnpm --filter web test`

- [ ] **Step 3: Implement** `arcade.ts` (house header comment, then):
```typescript
import path from 'node:path';

/** Extension → Content-Type allow-map; anything not listed here 404s. */
export const ARCADE_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.json': 'application/json',
	'.woff2': 'font/woff2'
};

/** Resolve a request to a real file inside root/<slug>/, or null (→ 404). Containment is
 *  checked on the RESOLVED path, so `..` segments can never escape the slug directory. */
export function resolveArcadeFile(
	root: string,
	slug: string,
	rest: string
): { filePath: string; contentType: string } | null {
	if (!/^[a-z0-9-]+$/.test(slug)) return null;
	const slugDir = path.resolve(root, slug);
	const filePath = path.resolve(slugDir, rest === '' ? 'index.html' : rest);
	if (filePath !== slugDir && !filePath.startsWith(slugDir + path.sep)) return null;
	const contentType = ARCADE_TYPES[path.extname(filePath).toLowerCase()];
	if (!contentType) return null;
	return { filePath, contentType };
}
```

`+server.ts` (house header comment, then):
```typescript
import fs from 'node:fs';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { resolveArcadeFile } from '$lib/server/arcade';
import type { RequestHandler } from './$types';

// cwd is apps/web in dev/tests and /app in the production image (Dockerfile WORKDIR),
// and `arcade/` sits directly under both — see package.json "files".
const ARCADE_ROOT = path.resolve(process.cwd(), 'arcade');

export const GET: RequestHandler = ({ params, locals }) => {
	// hooks.server.ts already redirects anonymous users off /arcade/*; this 401 is defense
	// in depth in case the guard's path rules ever change.
	if (!locals.user) throw error(401, 'Not signed in');
	const resolved = resolveArcadeFile(ARCADE_ROOT, params.slug, params.file);
	if (!resolved || !fs.existsSync(resolved.filePath)) throw error(404, 'Not found');
	return new Response(fs.readFileSync(resolved.filePath), {
		headers: { 'Content-Type': resolved.contentType }
	});
};
```

`apps/web/package.json` `"files"`: add `"arcade"` beside `"build"` (without this, `pnpm deploy` omits the games from the production image).

- [ ] **Step 4: Tests pass**: `pnpm --filter web test` — the new resolver tests green, nothing else broken.

- [ ] **Step 5: Gates + commit.**
```bash
git add apps/web/src/lib/server/arcade.ts apps/web/src/lib/server/arcade.test.ts "apps/web/src/routes/(app)/arcade" apps/web/package.json
git commit -m "feat(web): auth-gated arcade file serving route"
```

---

### Task 4: The shim + Cell Defender copy and wiring

**Files:**
- Create: `apps/web/static/arcade/rtapps-shim.js`
- Create: `apps/web/arcade/cell-defender/index.html` (copied from the READ-ONLY legacy file `/Users/christopherguzman/Desktop/coding_projects/rt-app/RT-Games/cell_defender_game_v2_index.html`, then minimally edited)

**Interfaces:**
- Produces: `window.RTApps.reportResult(score, max?)` → posts `{type: "rtapps:result", score: Number, max: Number|null}` to `window.parent`, same-origin target, at most once per page load, no-op outside an iframe. Task 5's bridge and Task 8's e2e depend on this exact message shape.

- [ ] **Step 1: Write the shim** (`static/arcade/rtapps-shim.js` — plain script, no modules; short header comment in the same labelled style):
```javascript
/*
 * What this file does: the RTApps arcade shim — the ONLY integration a game needs. Exposes
 * window.RTApps.reportResult(score, max?) which posts one {type:"rtapps:result"} message to
 * the embedding platform page (ExternalPlayer.svelte), which owns the attempt lifecycle.
 * Used here and why: plain IIFE, no modules/deps, so any legacy single-file game can include
 * it with one <script> tag. Deliberately public (static/): it holds no secrets and makes no
 * API calls; posting is same-origin-targeted and once-only.
 * How it fits the project: plan 4a §2; the direct-API SDK for real applications is plan 4c.
 * Depends on: nothing. Used by: apps/web/arcade/<slug>/index.html game files.
 */
(function () {
	var sent = false;
	window.RTApps = {
		reportResult: function (score, max) {
			// Once per page load; harmless no-op when the game is opened outside an iframe.
			if (sent || window.parent === window) return;
			sent = true;
			window.parent.postMessage(
				{
					type: 'rtapps:result',
					score: Number(score),
					max: max == null ? null : Number(max)
				},
				window.location.origin
			);
		}
	};
})();
```
No unit test for this file: it is a browser-global IIFE exercised end-to-end by Task 8's e2e (which calls the real `RTApps.reportResult` inside the real iframe); the bridge's message-validation unit tests (Task 5) cover the message contract.

- [ ] **Step 2: Copy the game.** `mkdir -p apps/web/arcade/cell-defender && cp "/Users/christopherguzman/Desktop/coding_projects/rt-app/RT-Games/cell_defender_game_v2_index.html" apps/web/arcade/cell-defender/index.html`. The game is self-contained except four `<audio>` tags loading from `cdn.pixabay.com` (lines ~209-212) — leave them; audio failing to load offline degrades silently and asset re-hosting is 4b-audit scope.

- [ ] **Step 3: Wire the shim.** Two minimal edits to the COPY (never the legacy file):
  1. Immediately before the game's main `<script>` block add: `<script src="/arcade/rtapps-shim.js"></script>`
  2. In `function gameOver(message)` (around line 1081), after `finalScoreEl.textContent = score;` add:
```javascript
    // RTApps platform integration (plan 4a): report the run's score to the embedding page.
    if (window.RTApps) window.RTApps.reportResult(score);
```
  (The shim's once-only guard means a replay after game over reports nothing — first result wins; acceptable for practice, noted for the 4b audit.)

- [ ] **Step 4: Manual smoke** — from repo root run `pnpm --filter web dev`, sign in (seeded educator or student from `docs/05-setup.md`), open `http://localhost:5173/arcade/cell-defender/` — the game loads and plays; signed out (private window) the same URL redirects to `/login`. Then stop the dev server.

- [ ] **Step 5: Gates + commit** (lint/check must stay green; the game file is not linted — confirm `.eslintignore`/eslint config doesn't sweep `apps/web/arcade/`; if it does, add `arcade/` to the ignore list in the same commit, mirroring how `build/` is ignored):
```bash
git add apps/web/static/arcade apps/web/arcade
git commit -m "feat(web): arcade shim + Cell Defender pilot game"
```

---

### Task 5: Web — ExternalPlayer, submit helper, activity-page branch

**Files:**
- Modify: `apps/web/src/lib/activity/types.ts` (add `ExternalSnapshot` to the union)
- Modify: `apps/web/src/lib/activity/attempts.ts` (add `submitExternalAttempt`)
- Modify: `apps/web/src/lib/activity/attempts.test.ts` (extend)
- Create: `apps/web/src/lib/activity/ExternalPlayer.svelte`, `apps/web/src/lib/activity/ExternalPlayer.svelte.spec.ts`
- Modify: `apps/web/src/routes/(app)/subjects/[slug]/activities/[id]/+page.svelte` (external branch)

**Interfaces:**
- Consumes: Task 2's submit body (`body: { score }` on `POST /api/v1/attempts/{attempt_id}/submit` — regenerated client types); Task 1's snapshot shape; existing `startAttempt(post, activityId)`, `PostFn`, `SubmittedAttempt` from `attempts.ts`; Task 3's URL shape `/arcade/<slug>/`; Task 4's message shape.
- Produces: `submitExternalAttempt(post: PostFn, attemptId: string, score: number): Promise<SubmittedAttempt>`; `<ExternalPlayer activityId snapshot post? />`.

- [ ] **Step 1: Failing helper test** (extend `attempts.test.ts`, copying its existing fake-post idiom):
```typescript
it('submitExternalAttempt posts the score with an Idempotency-Key', async () => {
	const calls: unknown[] = [];
	const post = (async (url: string, init: unknown) => {
		calls.push({ url, init });
		return { data: { percent: 24.0, passed: null }, error: undefined };
	}) as unknown as PostFn;
	const result = await submitExternalAttempt(post, 'a1', 1200);
	expect(result).toEqual({ percent: 24.0, passed: null });
	const { url, init } = calls[0] as { url: string; init: { body: unknown; headers: Record<string, string> } };
	expect(url).toBe('/api/v1/attempts/{attempt_id}/submit');
	expect(init.body).toEqual({ score: 1200 });
	expect(init.headers['Idempotency-Key']).toBeTruthy();
});
```

- [ ] **Step 2: Run — FAIL** (not exported).

- [ ] **Step 3: Implement `submitExternalAttempt`** in `attempts.ts` (below `submitAttempt`):
```typescript
/** POST /attempts/{id}/submit with the external game's reported score (plan 4a). The server
 *  clamps against the pinned snapshot's max_score — this client never sends a denominator. */
export async function submitExternalAttempt(
	post: PostFn,
	attemptId: string,
	score: number
): Promise<SubmittedAttempt> {
	const res = await post('/api/v1/attempts/{attempt_id}/submit', {
		params: { path: { attempt_id: attemptId } },
		headers: { 'Idempotency-Key': crypto.randomUUID() },
		body: { score }
	});
	if (res.error) throw new Error(errorTitle(res.error));
	const attempt = res.data as AttemptOut;
	return { percent: attempt.percent, passed: attempt.passed };
}
```

`types.ts` — add beside the other snapshot types and to the `ActivitySnapshot` union:
```typescript
export type ExternalSnapshot = {
	activity: { id: string; kind: 'external'; title: string };
	external: { arcade_slug: string; max_score: number; subject: { slug: string; title: string } };
};
```

- [ ] **Step 4: Failing player spec** (`ExternalPlayer.svelte.spec.ts`, browser project — copy `QuizPlayer.svelte.spec.ts`'s render/fake-post idiom and header style). Cases:
```
1. renders the iframe with src "/arcade/cell-defender/" and the activity title, and calls
   startAttempt on mount (fake post records the attempts URL)
2. a same-origin {type:"rtapps:result", score: 1200} message → submit posted with body
   {score: 1200}; result panel shows "24%" (fake submit returns percent 24, passed null)
   and NO pass/fail badge
3. a second result message after submit → no second submit call (bridge is once-only)
4. a message with the wrong shape ({type:"other"} / missing numeric score) → ignored,
   no submit call
5. submit rejection (fake post returns error) → error text + a Retry button; clicking
   Retry re-posts with the SAME score and a fresh Idempotency-Key
```
Dispatch messages in the spec with `window.dispatchEvent(new MessageEvent('message', { data: {...}, origin: window.location.origin }))`; the wrong-ORIGIN case is not browser-fakeable reliably (MessageEvent origin is settable in constructor — include a case with `origin: 'https://evil.example'` → ignored).

- [ ] **Step 5: Implement `ExternalPlayer.svelte`** (house header comment; runes; matches players' prop idiom):
```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/lesson/api';
	import { startAttempt, submitExternalAttempt, type PostFn } from '$lib/activity/attempts';
	import type { ExternalSnapshot } from '$lib/activity/types';

	let {
		activityId,
		snapshot,
		post = api.POST
	}: { activityId: string; snapshot: ExternalSnapshot; post?: PostFn } = $props();

	let attemptId = $state<string | null>(null);
	let status = $state<'loading' | 'playing' | 'submitting' | 'done' | 'error'>('loading');
	let percent = $state<number | null>(null);
	let errorMessage = $state('');
	// The score held for retry after a failed submit; also the once-only latch (a result
	// message is only accepted while it is null and status is 'playing').
	let reportedScore = $state<number | null>(null);

	onMount(async () => {
		try {
			const attempt = await startAttempt(post, activityId);
			attemptId = attempt.id;
			status = 'playing';
		} catch (event) {
			errorMessage = event instanceof Error ? event.message : 'Could not start the activity';
			status = 'error';
		}
	});

	async function submitScore(score: number) {
		if (attemptId === null) return;
		status = 'submitting';
		try {
			const result = await submitExternalAttempt(post, attemptId, score);
			percent = result.percent;
			status = 'done';
		} catch (event) {
			errorMessage = event instanceof Error ? event.message : 'Submit failed';
			status = 'error';
		}
	}

	function onMessage(event: MessageEvent) {
		// Same-origin, right shape, numeric score, once, and only while the game is running.
		if (event.origin !== window.location.origin) return;
		const data = event.data as { type?: string; score?: unknown };
		if (data?.type !== 'rtapps:result') return;
		const score = Number(data.score);
		if (!Number.isFinite(score)) return;
		if (reportedScore !== null || status !== 'playing') return;
		reportedScore = score;
		void submitScore(score);
	}
</script>

<svelte:window onmessage={onMessage} />

<header class="player-bar">
	<h1>{snapshot.activity.title}</h1>
</header>

{#if status === 'error'}
	<p role="alert">{errorMessage}</p>
	{#if reportedScore !== null}
		<button onclick={() => void submitScore(reportedScore as number)}>Retry</button>
	{/if}
{:else if status === 'done'}
	<section aria-label="result">
		<p>Score recorded: {percent}%</p>
		<!-- Practice semantics: no pass/fail badge for games in 4a. -->
	</section>
{:else}
	<iframe
		src={`/arcade/${snapshot.external.arcade_slug}/`}
		title={snapshot.activity.title}
		class="arcade-frame"
	></iframe>
	{#if status === 'submitting'}<p>Saving your score…</p>{/if}
{/if}

<style>
	.arcade-frame {
		width: 100%;
		height: calc(100vh - 6rem);
		border: 0;
	}
	.player-bar h1 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
	}
</style>
```

Activity page `+page.svelte` — add to the imports `ExternalPlayer` and `ExternalSnapshot`, and a branch after `calculator`:
```svelte
	{:else if snapshot.activity.kind === 'external'}
		<ExternalPlayer
			activityId={data.activity.activity_id}
			snapshot={snapshot as ExternalSnapshot}
		/>
```

- [ ] **Step 6: All web tests pass**: `pnpm --filter web test` — new spec green, 131 existing green.

- [ ] **Step 7: Gates + commit.**
```bash
git add apps/web/src/lib/activity "apps/web/src/routes/(app)/subjects/[slug]/activities/[id]/+page.svelte"
git commit -m "feat(web): external activity player with arcade result bridge"
```

---

### Task 6: Web — subject-page shelf (Games + Simulator sections)

**Files:**
- Modify: `apps/web/src/routes/(app)/subjects/[slug]/+page.svelte`

**Interfaces:**
- Consumes: the existing `kindLabels`/`activityGroups` grouping (external activities already arrive in `data.subject.activities` — the API's subject query has no kind filter beyond `!= "lesson"`).

- [ ] **Step 1: Implement.** In `kindLabels`, add as the LAST entry (order fixes section placement — Games render below the practice-activity sections): `external: 'Games'`. After the closing `{/each}` of the activity groups, append:
```svelte
<!-- Phase-4 shelf (plan 4a): the Simulator section's entry is a placeholder until plan 4c
     replaces it with the real simulator application entry. Static on every subject page. -->
<h2>Simulator</h2>
<button disabled title="The RT simulator arrives in a future update">Enter the simulator — coming soon</button>
```
Update the file's header comment to mention the shelf.

- [ ] **Step 2: Verify.** `pnpm --filter web lint && pnpm --filter web check` — green. (Behavioral proof rides Task 8's e2e: the Games section link is the entry path it clicks.)

- [ ] **Step 3: Commit.**
```bash
git add "apps/web/src/routes/(app)/subjects/[slug]/+page.svelte"
git commit -m "feat(web): subject-page games shelf and simulator placeholder"
```

---

### Task 7: API — seed Cell Defender

**Files:**
- Modify: `apps/api/app/seed.py` (extend the calculator-activities section)
- Test: `apps/api/tests/test_seed.py` (extend)

**Interfaces:**
- Consumes: Task 1's kind; the seed's existing get-or-create-by-title + `publish_activity` idiom (`SEED_PRACTICE_CALCULATORS` loop — read it and mirror it exactly).
- Produces: a published activity titled `Cell Defender`, `kind="external"`, `access="practice"`, subject `radiation-biology`, `config={"arcade_slug": "cell-defender", "max_score": 5000}`. Task 8's e2e clicks it by title.

- [ ] **Step 1: Failing test** (extend `test_seed.py` in its existing style):
```python
async def test_seed_creates_cell_defender(db_after_seed):
    activity = await db.scalar(select(Activity).where(Activity.title == "Cell Defender"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "cell-defender", "max_score": 5000}
    # subject is radiation-biology
```
Also bump the counts in the existing idempotency test (one more activity; seeding twice still changes nothing).

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement.** Module-level constant next to the calculator list:
```python
# Plan 4a pilot game (get-or-created by title, like the practice calculators). max_score
# 5000 ≈ a strong full run of Cell Defender (per-enemy 50-100 + per-level 250 bonuses);
# percent is clamped server-side, and a per-game tuning pass is plan 4b audit scope.
SEED_ARCADE_GAME = {
    "title": "Cell Defender",
    "subject_slug": "radiation-biology",
    "config": {"arcade_slug": "cell-defender", "max_score": 5000},
}
```
Then, after the practice-calculators loop, a get-or-create block mirroring it exactly (query by title; create `Activity(kind="external", ref_id=new_id(), access="practice", status="draft", config=..., subject_id=...)`; `publish_activity`; skip entirely when the title already exists).

- [ ] **Step 4: Full api suite green** (`exit=0`).

- [ ] **Step 5: Gates + commit.**
```bash
git add apps/api
git commit -m "feat(api): seed the Cell Defender arcade pilot"
```

---

### Task 8: E2E — the phase exit criterion

**Files:**
- Create: `apps/web/e2e/arcade.e2e.ts`

**Interfaces:**
- Consumes: `./helpers` (`registerStudent`/`signIn`/`signOut` — read `quiz.e2e.ts` for the educator/student fixture emails and stats-page idiom and reuse them); Task 7's seeded activity; Task 4's real shim inside the real game; Task 5's player.

- [ ] **Step 1: Write the spec** (mirror `quiz.e2e.ts`'s structure and header comment):
```typescript
test('a student plays the seeded arcade game and the educator sees the score', async ({ page }) => {
	// Student: subject page → Games section → Cell Defender.
	// (sign in as the seeded/registered student the way quiz.e2e.ts does)
	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await page.getByRole('link', { name: 'Radiation Biology' }).click();
	await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Simulator' })).toBeVisible();
	await page.getByRole('link', { name: 'Cell Defender' }).click();

	// The real game (with the real shim) loads in the iframe; drive the shim directly
	// instead of playing the canvas game — this exercises shim → bridge → submit.
	const frame = page.frameLocator('iframe[title="Cell Defender"]');
	await expect(frame.locator('#gameOverScreen')).toBeAttached();
	await page
		.frames()
		.find((f) => f.url().includes('/arcade/cell-defender'))!
		.evaluate(() => (window as unknown as { RTApps: { reportResult(s: number): void } }).RTApps.reportResult(1200));

	await expect(page.getByText('Score recorded: 24%')).toBeVisible();

	// Educator: the attempt shows in the activity stats (same navigation as quiz.e2e.ts).
	// Assert the Cell Defender activity row/stats reflect 1 attempt / 24%.
});
```
Fill the sign-in/stat-assertion details from `quiz.e2e.ts`'s working idiom — the assertions above are the requirement; also assert signed-out access: `GET /arcade/cell-defender/` in a fresh context redirects to `/login`.

- [ ] **Step 2: Run it against the compose stack** the way CI's e2e job does (check `.github/workflows/pr.yml`'s e2e steps and `apps/web/playwright.config.ts` for the exact local invocation; seed must have run). Expected: PASS.

- [ ] **Step 3: Commit.**
```bash
git add apps/web/e2e/arcade.e2e.ts
git commit -m "test(e2e): arcade pilot — game score reaches educator stats"
```

---

### Task 9: Docs, version 0.6.0, full gates

**Files:**
- Modify: `apps/api/app/main.py` (`version="0.6.0"`), `docs/03-architecture.md` (new §6.5 "External activities & the arcade" after §6.4), `README.md` (status line → v0.6.0 / M6)

- [ ] **Step 1: Edits.** §6.5, one paragraph in §6.4's register: external-kind activities embed browser apps served from `apps/web/arcade/` behind auth; the iframe player owns the attempt; the shim posts one result message; the server clamps the score against the pinned snapshot's `max_score` (`passed` stays null — practice). README status: v0.6.0 (M6) — arcade spine + Cell Defender pilot; next: 4b games at scale.
- [ ] **Step 2: Version regen.** `make client` from repo root (info.version changes openapi.json — the 3c lesson), commit the regenerated `packages/api-client` with this task.
- [ ] **Step 3: BOTH projects' full gates green, sequenced** (api full suite, then web lint/check/test).
- [ ] **Step 4: Commit.**
```bash
git add apps/api docs README.md packages/api-client
git commit -m "feat: v0.6.0 - arcade spine docs and version bump"
```

---

## Execution notes (for the controller)

- Order: 1→2 (api chain), 3→4 (web serving chain, independent of 1-2), 5 (needs 2's client + 3/4), 6 (needs 5 only for coherence — trivial), 7 (needs 1), 8 (needs 4+5+6+7), 9 last. One writer at a time as always.
- Task 4 copies FROM the read-only legacy tree — remind the implementer never to write there.
- Task 2 and Task 9 both regenerate the client (`make client`) — any OTHER task believing it changed a schema shape is a plan conflict to surface.
- Task 8's e2e touches compose + seeded state; nothing else may run api pytest or e2e concurrently.
- Final whole-branch review lenses: arcade route path-containment and auth (adversarial paths), bridge message validation (origin/shape/once), server-side clamp arithmetic, seed idempotency, the game copy's diff vs legacy limited to the two wiring edits, and `package.json "files"` carrying `arcade/` into the image.
