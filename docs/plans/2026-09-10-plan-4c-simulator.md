# Plan 4c — Simulator World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Simulator button enters the walkable hub; hub doors hand off to the LINAC/CT room app; both apps post results (scored QA, fraction/scan completions) into the attempt spine through a minimal same-origin SDK.

**Architecture:** Hub (`sim-hub/`) and the combined LINAC+CT app (`linac-ct/`, the newer "CT Scanner Emulator.html" revision with its giant base64 PNGs extracted to cacheable static files and a `<base>` tag injected into its blob-loaded suite) are served by the existing auth-gated arcade route (+ a `Cache-Control` header for non-HTML). A new `sdk_slug` config key + resolver endpoint lets apps address activities by name; `rtapps-sdk.js` (cookie-auth fetch, resolve→start→submit per completed event, multiple per session) is the "A pattern" surface. Doors navigate `window.top` to player URLs; results fire at the audit-mapped terminal moments.

**Tech Stack:** unchanged. **Spec:** `docs/specs/2026-09-10-plan-4c-simulator-design.md`. **Audit (anchors source of truth):** `.superpowers/sdd/4c-simulator-audit.md`. Branch `feat/simulator`. Tag: `v0.8.0` = M8.

## Global Constraints

- Legacy trees (`rt-app/simulator`, `rt-app/RT-Games`) STRICTLY READ-ONLY — copy from only.
- Revision pin: the room app is **`CT Scanner Emulator.html`** (the audit dated it as the later revision: queue switcher `#rtv2QueueSwitcher`, defensive camera guards, 10 CT cases vs 6). The 8.7 MB file ships nowhere.
- Sanctioned-edit discipline (the 4b bar): every app copy's diff vs legacy must show ONLY the edits its task's table lists; per-task diff audits in reports; terminal-event reporting only.
- SDK contract: `RTApps.recordResult(slug, opts?)` → resolve (cached per page load) → start/resume attempt → submit immediately (`{score: opts.score}` if the activity is scored, empty body if `completion_only`); ONE internal retry on network failure, no queue. `RTApps.activityUrl(slug)` → `/subjects/<subject_slug>/activities/<activity_id>` from the same cached resolver data.
- Resolver response shape (used by SDK, doors, and the entry link): `{activity_id, subject_slug, completion_only, max_score}` — 404 for unknown, unpublished, or non-external.
- `make client` runs ONLY in Task 1 (resolver schema) and Task 10 (version).
- api gates (from `apps/api`): `uv run ruff check . && uv run ruff format --check . && uv run mypy app`; full suite `TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5434/rtapps_test uv run pytest -q > /tmp/pt.log 2>&1; echo "exit=$?"` (~35 min; never pipe pytest through tail/head; never skip; paste the real exit line).
- web gates (repo root): `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test`.
- Never read/create/edit any `.env*` file. House header comments on new files.

## File map

| File | Responsibility |
|---|---|
| `apps/api/app/content/router.py` + `schemas.py` | resolver endpoint + `SdkSlugOut` |
| `packages/api-client/*` | regen (Task 1, Task 10) |
| `apps/web/static/arcade/rtapps-sdk.js` | the SDK |
| `apps/web/src/lib/arcade/sdk.spec.ts` | SDK browser tests (loads the real file via `?raw`) |
| `apps/web/arcade/sim-hub/index.html` | hub copy + door + QA wiring |
| `apps/web/arcade/linac-ct/index.html` + `assets/*.png` | room app copy, extracted assets, wiring |
| `apps/api/app/seed.py` + `tests/test_seed.py` | three sim activities |
| `apps/web/src/lib/server/arcade.ts` + route + tests | Cache-Control for non-HTML |
| `.../subjects/[slug]/+page.server.ts` + `+page.svelte` | live Simulator link |
| `apps/web/e2e/arcade.e2e.ts` (or a new `simulator.e2e.ts`) | exit-criterion e2e |
| docs/README/main.py/client | v0.8.0 |

---

### Task 1: API — sdk_slug resolver (+ client regen)

**Files:**
- Modify: `apps/api/app/content/schemas.py` (after `ActivityRefOut`, ~line 53), `apps/api/app/content/router.py` (insert the new route ABOVE `GET /activities/{activity_id}` at line 126)
- Modify: `packages/api-client/*` (via `make client` only)
- Test: `apps/api/tests/test_external_activity.py` (extend)

**Interfaces:**
- Produces: `GET /api/v1/activities/by-sdk-slug/{slug}` → `SdkSlugOut {activity_id: UUID, subject_slug: str, completion_only: bool, max_score: float | None}`; 404 (Problem) for unknown slug, unpublished activity, or non-external kind. Tasks 2/3/6/8 rely on this exact shape.

- [ ] **Step 1: Failing tests** (extend `test_external_activity.py`, reusing its publish fixtures; give the fixture activity `config={"arcade_slug": "cell-defender", "sdk_slug": "test-sim", "max_score": 5000}`):
```python
async def test_sdk_slug_resolves_published_external(client, ...):
    # GET /api/v1/activities/by-sdk-slug/test-sim as a signed-in student
    # → 200 {activity_id: str(activity.id), subject_slug: subject.slug,
    #        completion_only: False, max_score: 5000}

async def test_sdk_slug_resolver_404s(client, ...):
    # unknown slug → 404; a DRAFT external activity's slug → 404;
    # a published QUIZ (no sdk_slug ever matches, but also kind-guarded) → 404
```
- [ ] **Step 2: Run — FAIL** (404 route missing).
- [ ] **Step 3: Implement.** `schemas.py`:
```python
class SdkSlugOut(BaseModel):
    """Resolution of an external activity's config `sdk_slug` (plan 4c): simulator apps
    address activities by stable name — never by embedded UUID — and learn whether to
    submit a score or a completion. 404 for anything not a PUBLISHED external activity."""

    activity_id: uuid.UUID
    subject_slug: str
    completion_only: bool
    max_score: float | None
```
`router.py` (above the `/activities/{activity_id}` route; reuse the module's existing imports/idioms — `Subject` join like `get_subject` does):
```python
@router.get("/activities/by-sdk-slug/{slug}", response_model=SdkSlugOut)
async def resolve_sdk_slug(
    slug: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> SdkSlugOut:
    """Plan 4c: name → activity for the simulator SDK. Matches on the LIVE activity
    config (not a snapshot): the slug is an addressing convention, and only published
    external activities resolve."""
    activity = await db.scalar(
        select(Activity).where(
            Activity.kind == "external",
            Activity.status == "published",
            Activity.config["sdk_slug"].as_string() == slug,
        )
    )
    if activity is None:
        raise Problem(404, "No published activity with that sdk_slug")
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None
    return SdkSlugOut(
        activity_id=activity.id,
        subject_slug=subject.slug,
        completion_only=bool(activity.config.get("completion_only")),
        max_score=activity.config.get("max_score"),
    )
```
(Adapt the JSONB string-match to the codebase's actual SQLAlchemy idiom if `.as_string()` isn't used elsewhere — check how config keys are queried; a Python-side filter over external activities is acceptable given their count, if the JSONB operator fights mypy. Route-order note: FastAPI tries routes in order and `{activity_id}` is typed `uuid.UUID`, so "by-sdk-slug" wouldn't match it anyway — the explicit ordering is belt-and-braces.)
- [ ] **Step 4: Tests pass, full api suite green.** Then `make client` (repo root) — regen in the same commit.
- [ ] **Step 5: Gates + commit**
```bash
git add apps/api packages/api-client
git commit -m "feat(api): resolve external activities by sdk_slug for the simulator SDK"
```

---

### Task 2: The SDK

**Files:**
- Create: `apps/web/static/arcade/rtapps-sdk.js`
- Create: `apps/web/src/lib/arcade/sdk.spec.ts` (browser project)

**Interfaces:**
- Consumes: Task 1's resolver; the existing attempt endpoints (`POST /api/v1/activities/{id}/attempts` resumes-or-creates; `POST /api/v1/attempts/{id}/submit` takes `{score}` or empty body + an `Idempotency-Key` header).
- Produces: `window.RTApps.recordResult(slug, opts?) -> Promise<{percent: number|null}>` and `window.RTApps.activityUrl(slug) -> Promise<string>`. Tasks 3/5 call these verbatim.

- [ ] **Step 1: Write the SDK** (`static/arcade/rtapps-sdk.js`; plain IIFE, no modules — apps include it with one `<script>` tag; house-style header comment first):
```javascript
/*
 * What this file does: the RTApps simulator SDK (plan 4c, the "A pattern") — simulator
 * apps are real API clients: cookie-authenticated same-origin fetch, one attempt started
 * and submitted per completed event, multiple events per session.
 * Used here and why: unlike the games' shim (rtapps-shim.js, one postMessage to a parent
 * page), simulator apps run long sessions with many result moments and no wrapping
 * player logic to lean on. Public file: no secrets, session cookie carries auth.
 * How it fits the project: docs/specs/2026-09-10-plan-4c-simulator-design.md §2.
 * Depends on: /api/v1 (by-sdk-slug resolver, attempts start/submit).
 * Used by: apps/web/arcade/sim-hub/, apps/web/arcade/linac-ct/.
 */
(function () {
	var resolved = {}; // per-page-load cache: slug -> resolver response

	async function resolve(slug) {
		if (resolved[slug]) return resolved[slug];
		var res = await fetch('/api/v1/activities/by-sdk-slug/' + encodeURIComponent(slug), {
			credentials: 'same-origin'
		});
		if (!res.ok) throw new Error('RTApps: unknown activity slug ' + slug);
		resolved[slug] = await res.json();
		return resolved[slug];
	}

	async function post(url, body) {
		var init = {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Idempotency-Key': crypto.randomUUID() }
		};
		if (body !== undefined) {
			init.headers['Content-Type'] = 'application/json';
			init.body = JSON.stringify(body);
		}
		var res = await fetch(url, init);
		if (!res.ok) throw new Error('RTApps: request failed (' + res.status + ')');
		return res.json();
	}

	async function recordOnce(slug, opts) {
		var info = await resolve(slug);
		var attempt = await post('/api/v1/activities/' + info.activity_id + '/attempts');
		var submitted = await post(
			'/api/v1/attempts/' + attempt.id + '/submit',
			info.completion_only ? undefined : { score: Number((opts && opts.score) || 0) }
		);
		return { percent: submitted.percent };
	}

	window.RTApps = window.RTApps || {};
	// One attempt per completed event; call as many times per session as events complete.
	window.RTApps.recordResult = function (slug, opts) {
		return recordOnce(slug, opts).catch(function () {
			// One retry for flaky-wifi resilience; a second failure surfaces to the caller.
			return recordOnce(slug, opts);
		});
	};
	// Player URL for an activity, for door/back navigation (no UUIDs in app code).
	window.RTApps.activityUrl = function (slug) {
		return resolve(slug).then(function (info) {
			return '/subjects/' + info.subject_slug + '/activities/' + info.activity_id;
		});
	};
})();
```
(Note the start-attempt `post` sends an Idempotency-Key header harmlessly — only submit requires it. If the attempts-start endpoint rejects unexpected headers it won't — headers are never validated — keep as-is for one shared helper.)
- [ ] **Step 2: Failing spec** — `apps/web/src/lib/arcade/sdk.spec.ts` (browser project; loads the REAL file):
```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
// Vite ?raw import pulls the actual shipped file's source.
import sdkSource from '../../../static/arcade/rtapps-sdk.js?raw';

function loadSdk() {
	// Evaluate the real IIFE against the current window (fetch already stubbed).
	new Function(sdkSource)();
}
```
Cases (each stubs `window.fetch` with `vi.fn` returning Response-like objects and asserts the call sequence):
```
1. scored flow: recordResult('s', {score: 3}) → GET by-sdk-slug/s → POST attempts →
   POST submit with body {"score": 3} and an Idempotency-Key header → resolves {percent}
2. completion flow (resolver says completion_only: true) → submit has NO body
3. resolver cache: two recordResult calls → exactly ONE by-sdk-slug fetch
4. retry-once: first attempts POST rejects (network), whole chain retried once and
   succeeds → one resolution + two attempt POSTs; a second consecutive failure rejects
5. activityUrl('s') → '/subjects/<subject_slug>/<...>/activities/<activity_id>' built
   from the resolver payload
6. unknown slug (resolver 404) → rejects with an Error naming the slug
```
- [ ] **Step 3: Run — FAIL** (file missing / behaviors unimplemented), then implement/fix until green.
- [ ] **Step 4: All web gates green.**
- [ ] **Step 5: Commit**
```bash
git add apps/web/static/arcade/rtapps-sdk.js apps/web/src/lib/arcade
git commit -m "feat(web): rtapps-sdk — simulator apps as direct API clients"
```

---

### Task 3: Hub — copy, doors, QA result

**Files:**
- Create: `apps/web/arcade/sim-hub/index.html` (copied from the READ-ONLY `/Users/christopherguzman/Desktop/coding_projects/rt-app/simulator/RTApps_Radiation_Oncology_Center_Master_v43_CT_QA_STATE_FIXED.html`)

**Interfaces:**
- Consumes: Task 2's `RTApps.recordResult('sim-hub-qa', {score})` and `RTApps.activityUrl('sim-linac-fraction')` (the room app's slug — both room slugs resolve to the SAME linac-ct activity player? NO: doors target the room app; both the Linac and CT doors navigate to the `sim-linac-fraction` activity's player, since the combined app hosts both sides. Use `activityUrl('sim-linac-fraction')` for BOTH doors).
- Audit anchors (verify against the copy, quote in the report): rooms list ~line 426-437 (`CT Control Room`, `CT Simulator Room`, `LINAC Control Area`); door helpers `nearestDoor`/`doorSide`/`doorCenter`; QA: `runCtQaSequence()` ~line 1490, `procRefreshRelease()` ~line 1358, `PROC_STATE` checks `startup`/`laser`/`water` + the release gate.

Sanctioned edits (the COMPLETE list — diff audit must show exactly these):
1. `<script src="/arcade/rtapps-sdk.js"></script>` before the main script.
2. Door handoff: in the interaction path where the player activates a door into `LINAC Control Area`, `CT Control Room`, or `CT Simulator Room` (find the actual door-activation handler via `nearestDoor` usage), insert a navigation branch:
```javascript
// RTApps (plan 4c): these three doors leave the hub for the LINAC/CT room app.
if (window.RTApps && ROOM_APP_DOORS.has(door.roomName)) {
    window.RTApps.activityUrl('sim-linac-fraction').then(function (url) {
        window.top.location.href = url;
    });
    return;
}
```
with `const ROOM_APP_DOORS = new Set(['LINAC Control Area', 'CT Control Room', 'CT Simulator Room']);` defined beside it (adapt the property carrying the room name to the actual door object shape — the implementer reads the door code and documents the real field).
3. QA result: at the RELEASE/HOLD verdict (where `procRefreshRelease`'s gate lands — the moment the verdict is shown), one terminal-event call:
```javascript
// RTApps (plan 4c): score = QA checks passed (startup, laser, water, released), of 4.
if (window.RTApps) {
    var qaScore = (PROC_STATE.startup ? 1 : 0) + (PROC_STATE.laser === true ? 1 : 0)
        + (PROC_STATE.water === true ? 1 : 0) + (released ? 1 : 0);
    window.RTApps.recordResult('sim-hub-qa', { score: qaScore }).catch(function () {});
}
```
(`released` = the verdict boolean at that site; the implementer binds it to the real variable and documents it. The `.catch(function(){})` keeps a failed post from breaking the sim — the SDK already retried once.)
Terminal-event check: the verdict site must fire once per QA run; re-running QA in the same visit MAY report again (each run is a new attempt — the SDK has no latch, by design; verify the verdict site isn't reached repeatedly per single run).

- [ ] **Step 1: Copy** (`mkdir -p apps/web/arcade/sim-hub && cp <legacy> apps/web/arcade/sim-hub/index.html`).
- [ ] **Step 2: Read the door + QA code**, record the real handler/field/variable names in the report's evidence table.
- [ ] **Step 3: Apply the three edits.** **Step 4: Diff audit** (legacy vs copy: exactly the three edits). **Step 5: web lint/check green** (arcade is prettier-ignored; nothing else changed). **Step 6: Commit**
```bash
git add apps/web/arcade/sim-hub
git commit -m "feat(arcade): simulator hub — doors to the room app, QA results via the SDK"
```

---

### Task 4: Room app — copy + asset extraction

**Files:**
- Create: `apps/web/arcade/linac-ct/index.html` (from the READ-ONLY `/Users/christopherguzman/Desktop/coding_projects/rt-app/simulator/CT Scanner Emulator.html`), `apps/web/arcade/linac-ct/assets/*.png`
- Create (scratch, not committed): an extraction script in the session scratchpad.

**Interfaces:**
- Produces: `linac-ct/index.html` under ~2 MB with every base64 PNG ≥ 1 MB extracted to `assets/ct-<n>.png`, referenced so they LOAD — including inside the blob-iframe (see the `<base>` note). Task 5 wires results into this copy.

Extraction contract:
1. Write a scratchpad Python script: find data-URI PNGs ≥ 1 MB in the file (both in the outer shell and inside the `CT_SUITE_HTML` JS string — mind JS string escaping when replacing inside it), decode each to `assets/ct-<n>.png`, replace the data URI with `assets/ct-<n>.png`, and print per-image `sha256(decoded)` — then verify each written file's sha256 matches (byte-equality proof, quoted in the report).
2. **The blob-iframe problem:** the CT suite is loaded via a Blob URL iframe, where relative URLs do NOT resolve. Inject `<base href="/arcade/linac-ct/">` immediately after the suite HTML's `<head>` opening INSIDE the `CT_SUITE_HTML` string (escaped appropriately), so `assets/ct-<n>.png` resolves against the app's served directory. The outer shell needs no base tag (its document URL is already `/arcade/linac-ct/index.html`).
3. Small icons (<1 MB, the ~336 KB shell set) stay embedded — not worth the churn.
4. NO other changes in this task (wiring is Task 5) — the diff audit is: base-tag injection + N data-URI→path substitutions, nothing else. Report the before/after file sizes (expect ~27 MB → ≤2 MB).
- [ ] **Step 1: Copy + write the script + extract + verify hashes.** **Step 2: Diff audit + size report.** **Step 3: Manual load check**: `pnpm --filter web dev`, sign in (seeded creds per docs/05-setup.md), open `http://localhost:5173/arcade/linac-ct/index.html` — DevTools network shows the extracted PNGs loading 200 from `/arcade/linac-ct/assets/…` INSIDE the CT suite iframe (open a CT case to force it); no 404s. Screenshot-level evidence isn't possible — paste the curl of one asset URL (302/303 anonymous, 200 authed via the dev-session cookie jar if practical; otherwise the DevTools observation described precisely). **Step 4: web lint/check green.** **Step 5: Commit**
```bash
git add apps/web/arcade/linac-ct
git commit -m "feat(arcade): LINAC/CT room app with extracted cacheable assets"
```

---

### Task 5: Room app — wiring (back-link + results)

**Files:**
- Modify: `apps/web/arcade/linac-ct/index.html`

**Interfaces:**
- Consumes: Task 2's SDK; audit anchors in the OUTER SHELL: `finishTreatmentDelivery` / `postChargeAndCompleteFraction` (fraction completion) and the shell's handler for the `rtapps-ct-complete` postMessage from its internal suite iframe.

Sanctioned edits (complete list):
1. `<script src="/arcade/rtapps-sdk.js"></script>` in the OUTER shell (the suite iframe needs no SDK — its completions surface via the existing internal postMessage to the shell).
2. A fixed "Back to the center" control in the shell UI (small button, matching the shell's own style) →
```javascript
window.RTApps.activityUrl('sim-hub-qa').then(function (url) { window.top.location.href = url; });
```
3. Fraction result: inside `postChargeAndCompleteFraction` (the terminal completion per patient — the implementer verifies it fires once per completed fraction and not on `completeFractionWithoutCurrentCPTModule`'s path… if that second path is ALSO a genuine completion, wire both and say so):
```javascript
// RTApps (plan 4c): one completion per delivered treatment fraction.
if (window.RTApps) window.RTApps.recordResult('sim-linac-fraction').catch(function () {});
```
4. CT result: in the shell's `rtapps-ct-complete` message handler (each completed scan case):
```javascript
// RTApps (plan 4c): one completion per finished CT scan workflow.
if (window.RTApps) window.RTApps.recordResult('sim-ct-scan').catch(function () {});
```
Terminal-event verification per site (the 4b lens): trace that each fires exactly once per event and not per tick/retry; the internal `rtapps-ct-*` messages themselves never reach the PLATFORM bridge as results (they lack `type:"rtapps:result"` — add one player spec case asserting a `{type:'rtapps-ct-complete'}`-shaped message is ignored, in `ExternalPlayer.svelte.spec.ts`).
- [ ] **Step 1: Read + record the real sites.** **Step 2: Apply edits + the player spec case.** **Step 3: Diff audit vs Task 4's committed state** (exactly these edits). **Step 4: web gates INCLUDING tests** (the new spec case). **Step 5: Commit**
```bash
git add apps/web/arcade/linac-ct apps/web/src/lib/activity
git commit -m "feat(arcade): room app back-link and SDK result wiring"
```

---

### Task 6: Seed — three simulator activities

**Files:**
- Modify: `apps/api/app/seed.py` (extend `SEED_ARCADE_GAMES` — same list, the loop already handles both scored and completion shapes)
- Test: `apps/api/tests/test_seed.py` (extend)

**Interfaces:**
- Consumes: the existing seed loop; Task 1's resolver (tested against these rows).
- Produces (exact entries appended):
```python
    # Plan 4c: the simulator world. sim-hub-qa IS the hub activity (its player embeds
    # the walkable hub); the two completion activities live in the room app.
    {
        "title": "Center QA walkthrough",
        "subject_slug": "quality-management-and-safety",
        "config": {"arcade_slug": "sim-hub", "sdk_slug": "sim-hub-qa", "max_score": 4},
    },
    {
        "title": "Treatment delivery",
        "subject_slug": "treatment-delivery-procedures",
        "config": {"arcade_slug": "linac-ct", "sdk_slug": "sim-linac-fraction", "completion_only": True},
    },
    {
        "title": "CT simulation",
        "subject_slug": "treatment-delivery-procedures",
        "config": {"arcade_slug": "linac-ct", "sdk_slug": "sim-ct-scan", "completion_only": True},
    },
```
(Note two activities share `arcade_slug: linac-ct` — the same served app hosts both result streams; entering either activity's player shows the same app. That is intended.)
- [ ] **Step 1: Failing tests**: the three activities exist published with EXACT configs; sdk_slug uniqueness across all published external activities (collect and assert no duplicates); the referenced arcade directories exist on disk relative to the repo (`apps/web/arcade/sim-hub/index.html`, `apps/web/arcade/linac-ct/index.html` — a cheap existence check tying seed to Task 3/4's deliverables); idempotency counts updated.
- [ ] **Step 2: FAIL → implement → targeted pass.** **Step 3: Full api suite green.** **Step 4: Gates + commit**
```bash
git add apps/api
git commit -m "feat(api): seed the simulator hub and room activities"
```

---

### Task 7: Arcade route — Cache-Control for non-HTML

**Files:**
- Modify: `apps/web/src/lib/server/arcade.ts`, the arcade `+server.ts`, `apps/web/src/lib/server/arcade.test.ts`

- [ ] **Step 1: Failing test** (extend the resolver tests):
```typescript
	it('marks non-HTML files cacheable and HTML uncacheable', () => {
		expect(cacheControlFor('.png')).toBe('private, max-age=3600');
		expect(cacheControlFor('.mp3')).toBe('private, max-age=3600');
		expect(cacheControlFor('.html')).toBe('no-cache');
		expect(cacheControlFor('.js')).toBe('no-cache');
	});
```
- [ ] **Step 2: Implement** in `arcade.ts` (beside `ARCADE_TYPES`):
```typescript
/** Cache policy (plan 4c): media/font assets are immutable-in-practice and large (the
 *  simulator's extracted PNGs) → an hour of private caching; HTML and scripts stay
 *  uncacheable so app updates land immediately. */
export function cacheControlFor(ext: string): string {
	return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp3', '.wav', '.woff2'].includes(ext)
		? 'private, max-age=3600'
		: 'no-cache';
}
```
and in the route's Response headers: `'Cache-Control': cacheControlFor(path.extname(resolved.filePath).toLowerCase())` (import alongside the existing helpers).
- [ ] **Step 3: web gates green.** **Step 4: Commit**
```bash
git add apps/web/src/lib/server "apps/web/src/routes/(app)/arcade"
git commit -m "feat(web): cache headers for arcade media assets"
```

---

### Task 8: The live Simulator entry

**Files:**
- Modify: `apps/web/src/routes/(app)/subjects/[slug]/+page.server.ts`, `+page.svelte`

**Interfaces:**
- Consumes: Task 1's resolver via the server-side `apiFetch` (the load already forwards the session cookie); Task 6's seeded `sim-hub-qa`.

- [ ] **Step 1: Extend the load** (`+page.server.ts` — after the subject fetch):
```typescript
	// Plan 4c: resolve the simulator hub's player URL for the Simulator section. A 404
	// (hub not seeded/unpublished) degrades to the disabled placeholder, never an error.
	let simulatorUrl: string | null = null;
	const sim = await apiFetch(event, '/activities/by-sdk-slug/sim-hub-qa');
	if (sim.ok) {
		const info: components['schemas']['SdkSlugOut'] = await sim.json();
		simulatorUrl = `/subjects/${info.subject_slug}/activities/${info.activity_id}`;
	}
	return { subject, simulatorUrl };
```
- [ ] **Step 2: Page edit** (`+page.svelte`, replacing the disabled button):
```svelte
<h2>Simulator</h2>
{#if data.simulatorUrl}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- player URL built from API ids, not a static route literal -->
	<a href={data.simulatorUrl} data-testid="simulator-entry">Enter the radiation oncology center</a>
{:else}
	<button disabled title="The RT simulator arrives in a future update">Enter the simulator — coming soon</button>
{/if}
```
(If the `resolve()` lint rule accepts a dynamic path without the disable comment, drop the comment; match how the Games links handle it — they use `resolve('/(app)/subjects/[slug]/activities/[id]', {...})`, which also works here and is PREFERRED: build with `resolve()` from `info.subject_slug`/`info.activity_id` instead of string concat. Use the resolve() form.)
- [ ] **Step 3: web gates green** (behavioral proof rides Task 9's e2e).
- [ ] **Step 4: Commit**
```bash
git add "apps/web/src/routes/(app)/subjects/[slug]"
git commit -m "feat(web): live Simulator entry on subject pages"
```

---

### Task 9: E2E — the phase-4 core loop

**Files:**
- Create: `apps/web/e2e/simulator.e2e.ts` (its own file — the arcade spec stays game-focused; mirror helpers/idioms from `arcade.e2e.ts`)

- [ ] **Step 1: Spec** (mirror the existing sign-in/educator idioms; you own compose/e2e; re-run the seed first):
```
Test 1 "a student enters the simulator and a QA run reaches the educator":
  student → any subject page → getByTestId('simulator-entry') visible → click →
  the hub activity's player loads (URL contains /activities/) → the sim-hub iframe
  attaches → frame.waitForFunction(window.RTApps) →
  frame.evaluate(() => RTApps.recordResult('sim-hub-qa', {score: 3})) → await it →
  educator → Center QA walkthrough stats → Attempts row shows 75.0%
Test 2 "room app completions record":
  (student still signed in) navigate directly to the Treatment delivery activity's
  player via the subject page → linac-ct iframe attaches → waitForFunction(RTApps) →
  frame.evaluate(() => RTApps.recordResult('sim-ct-scan')) →
  NOTE: that call records against the CT activity while standing in the Treatment
  delivery player — the SDK is player-independent by design; assert the resolved
  promise, then educator → CT simulation stats → row shows "Completed"
Also assert: anonymous GET /arcade/sim-hub/index.html → login redirect; one extracted
asset URL (from the linac-ct page's own img/network refs) returns 200 with
Cache-Control: private, max-age=3600 when authed (request it via the page context).
```
- [ ] **Step 2: Run the spec, then the FULL e2e suite** (CI worker/retry policy; exclusion-comparison for any pre-existing flakiness, per the 4b idiom).
- [ ] **Step 3: Commit**
```bash
git add apps/web/e2e
git commit -m "test(e2e): simulator entry, SDK results, cache headers"
```

---

### Task 10: Docs, version 0.8.0, full gates

**Files:**
- Modify: `apps/api/app/main.py` (`version="0.8.0"`), `docs/03-architecture.md` (a §6.6 "The simulator world" paragraph: hub + room app on the arcade route, the SDK as the second integration tier — shim for embedded games, SDK for API-client apps — sdk_slug resolution, per-event attempts, asset extraction + cache policy), `README.md` (v0.8.0 / M8 — the simulator world ships: walkable hub, LINAC/CT room app, SDK results; next: 4d long tail), `packages/api-client` (via `make client`)

- [ ] **Step 1: Edits** (grep tests for "0.7" pins). **Step 2: `make client`.** **Step 3: BOTH full gate sets, sequenced, real exit lines pasted.** **Step 4: Commit**
```bash
git add apps/api docs README.md packages/api-client
git commit -m "feat: v0.8.0 - simulator world docs and version bump"
```

---

## Execution notes (for the controller)

- Order: 1 → 2 (SDK needs the resolver shape) → 3 (hub) — while 4 (extraction) can run between them where the writer slot allows; 5 after 2+4; 6 after 3+4 (its existence checks need the copies); 7 independent; 8 after 1+6; 9 after 3–8; 10 last. One writer at a time as always.
- Model policy: sonnet for 1, 3, 4, 5, 9 (legacy surgery, extraction, e2e); haiku acceptable for 7 (complete code) with the re-verify rule; sonnet for 2, 6, 8 (contract-bearing). Reviewers sonnet; final review sonnet.
- Tasks 3/4/5 are legacy-surgery tasks: per-file diff audits with the real anchor names recorded are mandatory review inputs (the 4b bar).
- Task 4's manual load check needs the dev stack; Tasks 4 and 9 own compose/dev-server windows exclusively.
- The audit (`.superpowers/sdd/4c-simulator-audit.md`) rides every 3/4/5 dispatch.
- Final whole-branch review lenses: SDK trust surface (it can submit scores — same clamp protections as 4a apply server-side; verify nothing widened), the blob-iframe `<base>` mechanics, extraction byte-equality evidence, terminal-event traces for all four wired sites, sdk_slug uniqueness, cache-header correctness, backlog triage.
