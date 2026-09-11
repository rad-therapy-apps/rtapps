# Plan 4d — Phase-4 Long Tail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three LINAC alignment sets on the Games shelf, the LINAC console emulator as a second simulator-hub door, the #59/#72/#73 quality items, and change-password + admin temp-password reset — closing phase 4 at v0.9.0 = M9.

**Architecture:** Content rides the two proven pipelines unchanged — 4b's audit → copy → shim → seed for shelf games and 4c's prefetch-gated hub door + direct-SDK wiring for the console. Passwords are a pair of new auth/admin endpoints plus one `must_change_password` column whose gate lives in the existing `require_user` dependency.

**Tech Stack:** FastAPI + SQLAlchemy 2 async + Alembic, SvelteKit, vitest/Playwright, legacy three.js apps copied verbatim.

**Spec:** `docs/specs/2026-09-11-plan-4d-long-tail-design.md` (owner-approved). The audit file this plan's content tasks depend on: `.superpowers/sdd/4d-long-tail-audit.md` (produced by Task 1).

## Global Constraints

- Branch `feat/long-tail` from main; version lands as **0.9.0** (Task 10 only).
- Legacy trees (`rt-app/RT-Games/`, `rt-app/simulator/`) are STRICTLY READ-ONLY — copy only; every in-copy deviation from legacy bytes is a sanctioned edit recorded in the audit/task report.
- api gates from `apps/api`: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app`, full `TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5434/rtapps_test uv run pytest > /tmp/pt.log 2>&1; echo "exit=$?"` (never piped through head/tail). web gates from repo root: `pnpm --filter web lint`, `pnpm --filter web check`, `pnpm --filter web test`.
- `make client` ONLY in Tasks 2, 3, and 10 (each after its API surface change).
- One `RTApps.reportCompletion()` (shim, shelf games) or `RTApps.recordResult(slug)` (SDK, console) call per app, at its TRUE terminal event per the audit; repeat-fire latches per the 4b bar.
- New seeded activities are `kind=external`, `access=practice`, `status=published`; `sdk_slug` uniqueness across published externals must keep passing `test_seed_sdk_slug_unique_across_published_externals`.
- Temporary passwords are returned once in a response body and NEVER logged, stored in plaintext, or echoed in tests' assertion messages.
- No Caddyfile changes anywhere in this plan.

## Execution notes (for the controller)

- Order: 1 → 2 → 3 → 4 (web pw UI) while 5 (alignment sets) waits for the writer slot; 5 → 6 (console) → 7 (seed) ; 8 (spec+latch) any writer window after 1; 9 (e2e) after 3–8; 10 last. One writer at a time; Task 9 owns compose/e2e exclusively.
- Model policy: sonnet for 1, 2, 3, 5, 6, 7, 9 (audit, contract-bearing, legacy surgery, e2e); sonnet for 4 and 8 (mixed-surface web); haiku nowhere (no complete-code-only task this plan). Reviewers sonnet; final review sonnet.
- Tasks 5/6/8 are legacy-surgery tasks: per-file diff audits with real anchor names are mandatory review inputs.
- The audit (`.superpowers/sdd/4d-long-tail-audit.md`) rides every 5/6/7/8 dispatch.
- Final whole-branch review lenses: password-flow security (temp password exposure, flag gate coverage, session revocation correctness), terminal-event traces for all four new wired apps, sdk_slug/arcade_slug consistency, Safety Supervisor derivation evidence, backlog triage.

---

### Task 1: The 4d audit

**Files:**
- Create: `.superpowers/sdd/4d-long-tail-audit.md`

**Interfaces:**
- Produces: per-app terminal-event anchors (function names + line numbers) that Tasks 5, 6, 7, 8 consume; the Safety Supervisor reachable-maximum derivation Task 7 consumes; the hub door room name Task 6 consumes.

- [ ] **Step 1: Audit the three alignment sets** (READ-ONLY: `/Users/christopherguzman/Desktop/coding_projects/rt-app/RT-Games/{3_point_setup,3D_LINAC_beginner_activities,3D_LINAC_intermediate_activities}/index.html`). For each record: file inventory + sizes; external/relative asset refs (each must be dead, inlined, or flagged for extraction); the activity/track structure; the TRUE completion anchor — for the guided tracks the handler that fires when the FINAL activity of the track completes (function name + line); for `3_point_setup` the first-successful-alignment feedback moment (the code that declares alignment success) — if no discrete success state exists, propose the least-invasive observable anchor and say why; repeat-fire analysis (can the anchor fire twice per page load? what latch is needed); any `window.top`/navigation code that fights an iframe.
- [ ] **Step 2: Audit the console emulator** (`RT-Games/linac_emulator/{index.html,script.js,style.css}`): the Beam On sequence's completion handler (name + line) as the expected `recordResult('sim-console')` anchor — confirm or correct; the two dead `<audio>` tags' exact lines (sanctioned strip); where a back-link to the hub can anchor (mirror the linac-ct room app's placement); repeat-fire analysis (Beam On can presumably run repeatedly — record the reset path and the once-per-completion decision).
- [ ] **Step 3: Pick the hub door room.** In `apps/web/arcade/sim-hub/index.html` read the rooms array (~lines 421–441) and the existing door gate (`performInteraction`, `ROOM_APP_DOORS`, `ROOM_APP_URL` prefetch at ~600–610). Record the exact `dr.room.name` string for the control-room door Task 6 will wire, and confirm the second-door approach: a parallel `CONSOLE_APP_URL` prefetch + a `CONSOLE_APP_DOORS` set, NOT overloading `ROOM_APP_DOORS`.
- [ ] **Step 4: Derive Safety Supervisor's reachable maximum.** In the shipped copy `apps/web/arcade/safety-supervisor/` (and its legacy source for cross-check), derive the maximum score reachable given the two Level-4 `isFatal` hazards (per issue #59: theoretical ~1900, practical ~1700). Show the arithmetic per level exactly like 4b's max_score derivations. Record the current published `max_score` in the seed and the exact new value.
- [ ] **Step 5: Commit**
```bash
git add .superpowers/sdd/4d-long-tail-audit.md
git commit -m "docs: plan 4d audit - alignment sets, console emulator, hub door, safety-supervisor ceiling"
```

---

### Task 2: API change-password

**Files:**
- Modify: `apps/api/app/auth/router.py`, `apps/api/app/auth/schemas.py`, `apps/api/app/auth/sessions.py`
- Test: `apps/api/tests/test_change_password.py` (new)
- Regenerate: `packages/api-client` (`make client`)

**Interfaces:**
- Consumes: existing `verify_password`, `hash_password`, `validate_password_strength` (`app/auth/passwords.py`), `hash_token` + session model (`app/auth/sessions.py`), `require_user` and the `rt_session` cookie name (read `deps.py`/`router.py` for the exact cookie constant).
- Produces: `POST /api/v1/auth/change-password` (204) with body `{"current_password": str, "new_password": str}`; `revoke_others_for_user(db, user_id, keep_session_id) -> int` in `sessions.py` that Task 3's tests may reuse.

- [ ] **Step 1: Failing tests** — in `apps/api/tests/test_change_password.py`, following the register/login fixture idioms in the existing `apps/api/tests/test_auth*.py` (read one first and reuse its client/user fixtures):
```python
async def test_change_password_happy_path(client, db_session):
    # register + login as a fresh user, then:
    r = await client.post("/api/v1/auth/change-password",
        json={"current_password": OLD, "new_password": "correct-horse-battery"})
    assert r.status_code == 204
    # old password no longer logs in; new one does
    assert (await client.post("/api/v1/auth/login", json={"email": EMAIL, "password": OLD})).status_code == 401
    assert (await client.post("/api/v1/auth/login", json={"email": EMAIL, "password": "correct-horse-battery"})).status_code == 200

async def test_change_password_wrong_current_is_403_and_changes_nothing(client): ...
async def test_change_password_keeps_current_session_revokes_others(client):
    # login twice (two session cookies); change password on session A;
    # session A's /auth/me still 200, session B's /auth/me now 401
async def test_change_password_rejects_weak_new_password(client):  # reuses validate_password_strength → 422/400 per register's behavior
async def test_change_password_google_only_account_is_409(client, db_session):  # user with password_hash=None
async def test_change_password_requires_auth(client):  # anonymous → 401
```
- [ ] **Step 2: Run to fail** — `TEST_DATABASE_URL=... uv run pytest tests/test_change_password.py > /tmp/pt.log 2>&1; echo "exit=$?"` → nonzero, 404s.
- [ ] **Step 3: Implement.** `schemas.py`: `class ChangePasswordIn(BaseModel): current_password: str = Field(max_length=256); new_password: str = Field(min_length=10, max_length=256)`. `sessions.py`:
```python
async def revoke_others_for_user(db: AsyncSession, user_id: uuid.UUID, keep_session_id: str) -> int:
    """Revoke every non-expired session of the user EXCEPT keep_session_id (the caller's own).
    Used by change-password: a password change proves possession, so the current session
    survives while any other device is signed out."""
    # same UPDATE shape as revoke_all_for_user, plus `Session.id != keep_session_id`
```
`router.py` endpoint (after `logout`): resolve the caller's own session id by hashing the request's `rt_session` cookie with `hash_token`; 403 problem-json on `verify_password` failure; 409 problem-json when `user.password_hash is None` ("This account signs in with Google and has no password"); `validate_password_strength(new_password)`; set `user.password_hash = hash_password(new_password)`; `await revoke_others_for_user(...)`; 204. Mirror the existing endpoints' docstring style (docstrings flow into openapi.json).
- [ ] **Step 4: Tests pass**, then full api gates (ruff, format, mypy app, full pytest with real exit code).
- [ ] **Step 5: `make client`** from repo root; commit the regenerated files with the change.
- [ ] **Step 6: Commit**
```bash
git add apps/api packages/api-client
git commit -m "feat(api): change-password endpoint with other-session revocation"
```

---

### Task 3: API admin reset + must_change_password gate

**Files:**
- Create: `apps/api/alembic/versions/0009_must_change_password.py`
- Modify: `apps/api/app/auth/models.py`, `apps/api/app/auth/deps.py`, `apps/api/app/auth/router.py` (expose the flag on `/auth/me` via `UserOut`), `apps/api/app/auth/schemas.py`, `apps/api/app/admin/router.py`, `apps/api/app/admin/schemas.py`
- Test: `apps/api/tests/test_admin_reset_password.py` (new)
- Regenerate: `packages/api-client` (`make client`)

**Interfaces:**
- Consumes: Task 2's `revoke_all_for_user` (already existed), `hash_password`; the admin router's `require_admin` + audit-write pattern (read `admin/router.py:108-165` — the role/deactivate endpoints — and mirror exactly).
- Produces: `User.must_change_password: bool` (server default false); `POST /api/v1/admin/users/{user_id}/reset-password` → `{"temporary_password": str}`; `/auth/me` response gains `must_change_password: bool`; the `require_user` gate (403 `password-change-required` problem) that Task 4's web layer relies on.

- [ ] **Step 1: Migration + model.** `models.py`: `must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa.false())` (match the file's import style). Migration 0009 mirrors 0008's structure: `op.add_column("user", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))`, downgrade drops it.
- [ ] **Step 2: Failing tests** (same fixture idioms as Task 2):
```python
async def test_admin_reset_returns_temp_password_once_and_revokes_sessions(client): ...
    # admin resets student; response has temporary_password; student's old session 401;
    # student logs in WITH temp password → 200 and /auth/me shows must_change_password true
async def test_flag_gates_everything_but_auth_and_change(client): ...
    # flagged user: GET /api/v1/subjects → 403 (type ends /password-change-required);
    # GET /auth/me → 200; POST /auth/change-password → 204; then /subjects → 200 and flag false
async def test_reset_requires_admin(client):  # educator/student → 403
async def test_reset_deactivated_user_is_409(client): ...
async def test_reset_writes_audit_row(client): ...  # mirror deactivate's audit assertion
```
- [ ] **Step 3: Implement.** Admin endpoint: `secrets.token_urlsafe(9)` (12 chars, satisfies the 10-min-length policy) as the temp password; set hash + `must_change_password = True`; `revoke_all_for_user`; audit row via the router's existing pattern; 409 for deactivated; response model `class ResetPasswordOut(BaseModel): temporary_password: str`. Gate in `deps.py`'s `require_user`: after resolving the user, if `user.must_change_password` and the request path is not under `/api/v1/auth/` (login/logout/me/change-password all live there), raise the 403 problem (`type` suffix `password-change-required`, detail "Password change required before continuing"). Change-password (Task 2's endpoint) additionally sets `user.must_change_password = False` — add that line and a regression assertion in Task 2's happy-path test. `/auth/me`: add `must_change_password: bool` to `UserOut`.
- [ ] **Step 4: Full api gates**, real exit codes. **Step 5: `make client`.**
- [ ] **Step 6: Commit**
```bash
git add apps/api packages/api-client
git commit -m "feat(api): admin temp-password reset and must-change-password gate"
```

---

### Task 4: Web password UI

**Files:**
- Create: `apps/web/src/routes/(app)/account/password/+page.svelte`, `+page.server.ts`
- Modify: `apps/web/src/hooks.server.ts` (must-change redirect), the signed-in nav component (find where the signed-in user's name/logout link renders and add an "Account" → change-password link beside it), the admin users page (`apps/web/src/routes/(app)/admin/users/…` — read the tree; add a per-user "Reset password" action)

**Interfaces:**
- Consumes: `/auth/me`'s new `must_change_password` (already in `locals.user` via hooks), Task 2/3's endpoints through the regenerated client types (`components['schemas']['ChangePasswordIn']`, `ResetPasswordOut`).
- Produces: `/account/password` route; the redirect rule Task 9's e2e drives.

- [ ] **Step 1: Change form.** `+page.server.ts`: a form action posting `{current_password, new_password}` to `/auth/change-password` via `apiFetch`; map 403 → "Current password is incorrect", 409 → the Google-only message, 422 → the validation detail; on 204 redirect to `/subjects` with the existing flash/redirect idiom (read a neighboring form action, e.g. login's, and mirror it exactly — including the progressive-enhancement `use:enhance` pattern its `+page.svelte` uses). Page: current + new + confirm fields (confirm checked client- and server-side; mismatch → "New passwords do not match").
- [ ] **Step 2: Redirect rule.** In `hooks.server.ts` after `locals.user` resolves: if `locals.user?.must_change_password` and the pathname is not `/account/password` and not `/logout`, `redirect(303, '/account/password')`. Place it beside the existing `decideAccess` call, same throw style.
- [ ] **Step 3: Admin reset action.** On the admin users page: a "Reset password" button per row → form action calling the admin endpoint → render `temporary_password` ONCE in a result banner with the note "They must change it at next sign-in." No copy-to-clipboard library — a `<code>` element is enough.
- [ ] **Step 4: Web gates** (lint/check/test) green. Behavioral proof rides Task 9.
- [ ] **Step 5: Commit**
```bash
git add apps/web/src
git commit -m "feat(web): change-password page, forced-change redirect, admin reset action"
```

---

### Task 5: Alignment sets — copy, shim, wire

**Files:**
- Create: `apps/web/arcade/three-point-setup/index.html`, `apps/web/arcade/linac-training-beginner/index.html`, `apps/web/arcade/linac-training-intermediate/index.html`

**Interfaces:**
- Consumes: Task 1's per-app anchors (completion handler names + lines, repeat-fire latches, sanctioned-edit list).
- Produces: the three arcade dirs Task 7 seeds (arcade_slugs exactly as the dir names above).

- [ ] **Step 1: Copy** each legacy `index.html` verbatim to its arcade dir (`cp`, then sha256 both sides and record).
- [ ] **Step 2: Wire each app** with exactly the audited edits and nothing else: `<script src="/arcade/rtapps-shim.js"></script>` before the closing body tag (the 4b recipe — see any wired game, e.g. `apps/web/arcade/cell-defender/index.html:214`), plus ONE `RTApps.reportCompletion()` call inside the audit's completion anchor, plus the audit's repeat-fire latch (a `var rtappsReported = false;` guard in the same scope, per the 4b idiom) if the audit requires one. Record every changed line number.
- [ ] **Step 3: Per-file diff audit.** For each app: `diff` the copy against legacy; the only hunks are the audited edits. Paste the diff summary in the report.
- [ ] **Step 4: Web gates** (the arcade route's existence tests don't cover unseeded dirs — gates are lint/check/test only; anonymous-curl checks ride Task 9).
- [ ] **Step 5: Commit**
```bash
git add apps/web/arcade
git commit -m "feat(arcade): three LINAC alignment sets wired for completion reporting"
```

---

### Task 6: Console emulator — copy, SDK, hub door

**Files:**
- Create: `apps/web/arcade/linac-console/{index.html,script.js,style.css}`
- Modify: `apps/web/arcade/sim-hub/index.html` (second door)

**Interfaces:**
- Consumes: Task 1's console anchors (Beam On completion handler, dead-audio lines, back-link placement, hub room name) and the hub's existing door mechanics (`ROOM_APP_URL` prefetch at ~line 602, `performInteraction` gate at ~608).
- Produces: `arcade_slug` `linac-console` + `sdk_slug` `sim-console` that Task 7 seeds.

- [ ] **Step 1: Copy** the three files verbatim; sha256 pairs recorded.
- [ ] **Step 2: Sanctioned console edits** (exactly these): strip the two dead `<audio>` tags (audit lines); include the SDK `<script src="/arcade/rtapps-sdk.js"></script>`; ONE `RTApps.recordResult('sim-console')` (fire-and-forget with `.catch(function(){})`, the room-app idiom) at the audit's Beam On completion anchor with the audit's once-per-completion latch; a back-link to the hub mirroring `apps/web/arcade/linac-ct/index.html`'s `HUB_URL` prefetch + anchor placement (copy that pattern's shape, adapting only element placement per the audit).
- [ ] **Step 3: Hub second door.** In `apps/web/arcade/sim-hub/index.html`, beside the existing prefetch block (~line 602):
```javascript
var CONSOLE_APP_URL = null;
if (window.RTApps && window.RTApps.activityUrl) {
    window.RTApps.activityUrl('sim-console').then(function (url) {
        CONSOLE_APP_URL = url;
    }).catch(function () {});
}
var CONSOLE_APP_DOORS = new Set(['<the audit's room name>']);
```
and in `performInteraction`'s door branch, a parallel gate BEFORE the legacy fallback, identical in shape to the `ROOM_APP_URL && ROOM_APP_DOORS.has(dr.room.name)` line: `if (CONSOLE_APP_URL && CONSOLE_APP_DOORS.has(dr.room.name)) { window.top.location.href = CONSOLE_APP_URL; return; }`. Null URL (unseeded/failed) falls through to the legacy door behavior — three-state proof like 4c's door review.
- [ ] **Step 4: Per-file diff audits** for all four files (console trio + hub). **Step 5: Web gates.**
- [ ] **Step 6: Commit**
```bash
git add apps/web/arcade
git commit -m "feat(arcade): LINAC console emulator as a second simulator-hub door"
```

---

### Task 7: Seed + Safety Supervisor ceiling

**Files:**
- Modify: `apps/api/app/seed.py`, `apps/api/tests/test_seed.py`

**Interfaces:**
- Consumes: Task 5/6's arcade_slugs; Task 1's Safety Supervisor derivation (exact new max_score).
- Produces: four new published activities Task 9's e2e drives.

- [ ] **Step 1: Failing tests** — extend `test_seed.py` in its existing per-activity style (full `config ==` equality + idempotent re-seed + disk-existence, mirroring the sim entries' tests): "Three-point setup" / "LINAC training — beginner" / "LINAC training — intermediate" (subject `treatment-delivery-procedures`, `{"arcade_slug": <slug>, "completion_only": true}`, shim games — NO sdk_slug) and "Treatment console" (`{"arcade_slug": "linac-console", "sdk_slug": "sim-console", "completion_only": true}`). Plus: Safety Supervisor's seeded `max_score` equals the audit's derived value, and the republish branch updates an existing row's config (the 3c republish-branch pattern — see how the MU-calculator seed handles a changed config).
- [ ] **Step 2: Implement** — four `SEED_ARCADE_GAMES` entries matching the sim entries' shape (`apps/api/app/seed.py:255-270`); change Safety Supervisor's `max_score` value in its existing entry to the derived number with a comment citing the audit.
- [ ] **Step 3: Full api gates**, real exit codes (suite ~35–40 min — let it run).
- [ ] **Step 4: Commit**
```bash
git add apps/api
git commit -m "feat(api): seed the alignment sets and console; correct safety-supervisor ceiling"
```

---

### Task 8: #72 SDK spec + #73 verdict latch

**Files:**
- Modify: `apps/web/src/lib/arcade/sdk.spec.ts`, `apps/web/arcade/sim-hub/index.html`

**Interfaces:**
- Consumes: the SDK spec's existing mock-fetch harness (read `sdk.spec.ts:52-260` — reuse its helpers verbatim); the hub QA handlers `releaseClinical`/`holdClinical` (4c audit anchors, `procRefreshRelease` region ~line 1358).

- [ ] **Step 1: #72 spec case**, in the retry describe block's style:
```typescript
it('rejects when the submit and its single retry both fail, without re-entering resolve/start', async () => {
    // harness: resolve OK, start OK, submit rejects twice
    // assert: recordResult rejects; attemptCalls === 1; submitCalls === 2; resolveCalls === 1
});
```
(Adapt call-counter names to the file's existing helpers — the six retry cases already count these.)
- [ ] **Step 2: Run the spec file** — new case passes, existing cases untouched.
- [ ] **Step 3: #73 latch.** In the hub: at the top of BOTH `releaseClinical` and `holdClinical`, an idempotent guard + disable, and re-enable at the QA scenario reset point (the audit's `runCtQaSequence`/reset anchor):
```javascript
if (window.__rtappsVerdictLocked) return;      // #73: one verdict per scenario
window.__rtappsVerdictLocked = true;           // reset path sets this back to false
```
plus `disabled = true` on both buttons' DOM elements at lock time and re-enable + `__rtappsVerdictLocked = false` in the scenario-reset handler. Record exact line numbers; this is a sanctioned hub edit reviewed with a diff audit.
- [ ] **Step 4: Web gates.** **Step 5: Commit**
```bash
git add apps/web/src/lib/arcade/sdk.spec.ts apps/web/arcade/sim-hub
git commit -m "test(web): submit-fails-twice SDK case; fix(arcade): latch hub QA verdict buttons"
```

---

### Task 9: E2E — long-tail flows

**Files:**
- Create: `apps/web/e2e/long-tail.e2e.ts`
- (mirror idioms from `apps/web/e2e/simulator.e2e.ts` — sign-in, iframe attach, educator stats, 180s budgets for three.js apps)

- [ ] **Step 1: Spec** (own the compose stack; re-seed first — required, the alignment/console rows are new):
```
Test 1 "an alignment set completion reaches the educator":
  student → treatment-delivery-procedures subject page → the "Three-point setup"
  Games-shelf entry → player iframe attaches → drive the shim's completion
  (frame.evaluate the audited completion call if UI-driving is impractical —
  same policy 4b used) → educator → activity stats row shows "Completed"
Test 2 "the console door round-trip":
  student → simulator entry → hub loads → CONSOLE_APP_URL prefetch resolves →
  navigate to the console player via the resolved URL (door-click through the
  3D world is not automatable; assert the prefetch gate instead:
  frame.evaluate(() => CONSOLE_APP_URL) is non-null and contains /activities/) →
  console iframe → frame.evaluate(() => RTApps.recordResult('sim-console')) →
  educator → "Treatment console" row "Completed"
Test 3 "forced password change":
  admin resets a student's password (admin users page UI) → capture the temp
  password from the banner → student's old session bounced (next navigation →
  login) → student signs in with temp password → lands on /account/password
  (redirect rule) and cannot navigate away → changes password → can browse; old
  temp password no longer logs in
Also: the QA verdict latch — in the hub QA flow, click RELEASE twice rapidly;
educator attempts count for "Center QA walkthrough" grows by exactly 1.
```
- [ ] **Step 2: Run the new spec, then the FULL e2e suite** (workers/retry per config; exclusion-comparison for pre-existing flakiness with worker count held constant — the 4c review's lesson).
- [ ] **Step 3: Commit**
```bash
git add apps/web/e2e
git commit -m "test(e2e): alignment completion, console door, forced password change, verdict latch"
```

---

### Task 10: Docs, version 0.9.0, full gates

**Files:**
- Modify: `apps/api/app/main.py` (`version="0.9.0"`), `docs/03-architecture.md` (§6.6 gains a short v0.9.0 paragraph: three shelf alignment sets, the console as a second door, the QA verdict latch; §7 auth row gains `POST auth/change-password` ✅ and the admin row `POST admin/users/{id}/reset-password` ✅; §7 content row: nothing new), `README.md` (v0.9.0 / M9 — phase 4 closes: LINAC alignment sets, console door, password management; next: phase 5 / EMR decision), `packages/api-client` (`make client`)
- [ ] **Step 1: Edits** (grep tests for "0.8" pins first). **Step 2: `make client`.** **Step 3: BOTH full gate sets, sequenced, real exit lines.** **Step 4: Commit**
```bash
git add apps/api docs README.md packages/api-client
git commit -m "feat: v0.9.0 - phase-4 long tail docs and version bump"
```
