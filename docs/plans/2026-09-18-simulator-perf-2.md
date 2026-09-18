# Simulator Perf 2 Implementation Plan (wing lag: sim-hub clinical wing, linac-ct, CT suite)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Eliminate the owner-reported lag in sim-hub's clinical wing (CT sim room + adjacent hallway; waiting area is fine) and the census-found waste in linac-ct and the CT suite, with zero visible behavior change outside smoother frame rates.

**Design basis (2026-09-18 three-app perf census, owner-approved tiers):** the phase-1 perf work made the renderer cheap but nothing stops work on things the player can't see. Verified findings:
- sim-hub: all 11 movers (`npc-behavior.js:172 updateMovers` — 2× CatmullRom `getPointAt` + full `group.traverse` per mover per frame), all ~44 duty actors (`npc-behavior.js:60 updateDutyAnimations`), and every NPC label (`npc.js:278 updateNpcLabels`, getWorldPosition + distance math) update every frame with no room/distance gating. Heaviest standing-cost rooms: vault1, vault2, ctsim (full machine assemblies), linaccontrol, ctcontrol (multi-monitor consoles) — the clustered clinical wing the owner walked. Live-feed RENDERS are already room/journey-gated (`equipment.js:602-645`) — leave them.
- linac-ct vault: `renderTreatmentDeliveryPanel()` runs unthrottled every deliveryTick (`linac-delivery.js:3554`); CCTV feeds re-render the whole scene at live CSS resolution every ~110ms (`cctv.js:70-91`); `S.standInternalsGroup.visible = true` always (`scene.js:2026`) while sibling `detailGantryGroup` correctly defaults hidden (`scene.js:2276`).
- CT suite: `renderer.setAnimationLoop(animate)` never pauses (`ct-suite/room.js:61`) — full antialiased/PCFSoft render every frame even when console view hides the canvas (`ct-suite.html:906`) or the iframe/page is hidden; W/L drag does an uncapped 220×220 repaint per pointermove (`console.js:525 setWL` → `imaging.js:376-395 paintHU`); `roomAux.textContent` written unconditionally every frame (`room.js:414-415`).
- DEFERRED (recorded, not in this PR): per-frame `getCollisionAssessment()` during dynamic delivery (`linac-delivery.js:3488-3559`) — safety-check cadence change, revisit only if beam-on lag is reported; one-way adaptive shadow floor in linac-ct; room-geometry LOD/unloading for sim-hub.

**Line numbers above are as of main `3dd5af0`.**

## Global Constraints

- These are PERF edits, not verbatim moves — but the behavior contract is strict: no visible change except frame rate. Guided journeys, NPC exchanges/handoffs, QA scoring, SDK completions, door handoffs all behave identically.
- Gating applies in **walk mode only** (`S.mode === 'walk'`); overview/orbit mode keeps full-fidelity updates everywhere (the overview camera sees the whole clinic).
- Journey-involved actors are ALWAYS fully updated regardless of distance (journeys steer the camera to them).
- Far NPCs are **strided, never frozen** (visible through windows/doorways; a hard freeze would pop).
- Zero changes to: SDK contract lines, e2e specs, CI, serving, Dockerfiles, the 27 small games.
- Gates before every commit (repo root): `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test` (28 files / 161 tests) + `pnpm --filter web build:arcade` + `cd apps/web && node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html` (3× SMOKE OK).
- Branch `perf/simulator-hotspots` from main `3dd5af0`+. **Merge is HELD until the owner's pending PR-2 acceptance walk (linac-ct vault) passes.**
- NEVER read/create/edit `.env*`. No force-push. Commit messages end with the repo's `Co-Authored-By:` trailer.
- Files still carry `// @ts-nocheck` headers — keep them (PR 4 removes them).

---

### Task 1: Tier 1 — safe fixes (CT suite + linac-ct vault), one commit

**Files:** Modify `apps/web/arcade-src/linac-ct/src/ct-suite/room.js`, `apps/web/arcade-src/linac-ct/src/ct-suite/console.js` (or `imaging.js` — wherever the throttle wrapper fits cleanest at the `setWL`→`paintHU` call path), `apps/web/arcade-src/linac-ct/src/linac-delivery.js`, `apps/web/arcade-src/linac-ct/src/cctv.js`, `apps/web/arcade-src/linac-ct/src/scene.js`.

- [ ] **1a — CT suite render pause.** In `ct-suite/room.js`: make `animate` early-return (skip `renderer.render` and all per-frame scene work, keep nothing else running) when the 3D view is not visible: `document.hidden`, OR the suite is in console mode (the state the `rtapps-ct-view` handler / `setView('console')` sets — read the existing mode flag or `document.body.classList.contains('rtapps-console-mode')`, matching however `ct-suite.html:906` decides to hide `#scanCanvas`). On returning to room view the loop resumes naturally (setAnimationLoop keeps ticking; only the body is skipped). Verify with the smoke test that module eval is unchanged.
- [ ] **1b — W/L drag throttle.** Coalesce `setWL`-driven repaints to one per animation frame: if a repaint is already scheduled, update the pending values and return; flush via `requestAnimationFrame`. Final state after drag end must be pixel-identical to today.
- [ ] **1c — roomAux write-on-change.** `ct-suite/room.js:414-415`: cache the last string; write `textContent` only when it changed.
- [ ] **1d — delivery panel throttle.** `linac-delivery.js` deliveryTick: throttle `renderTreatmentDeliveryPanel()` to ≥250ms intervals (same pattern as the adjacent monitor repaint throttle on that loop), with one guaranteed final render when delivery ends/completes so end-state text is never stale.
- [ ] **1e — CCTV internal resolution cap.** `cctv.js`: cap each feed renderer's internal drawing-buffer size (setSize with `updateStyle=false`, or equivalent) to max 512 wide (keep aspect), independent of the container's CSS size. Cadence/visibility gating stays as-is.
- [ ] **1f — standInternalsGroup default.** `scene.js:2026`: default `S.standInternalsGroup.visible = false` to match `detailGantryGroup` — FIRST verify by reading the toggle path (setInternalView/setAssembly/toggleSimpleInternals) that the group is made visible by the same user action that reveals the detail groups; if the group is actually load-bearing at startup (visible in the default vault view), SKIP this item and report why.
- [ ] Gates + smoke → commit `perf(simulators): tier-1 safe fixes — CT-suite render pause, repaint throttles, CCTV cap`.

### Task 2: Tier 2 — sim-hub walk-mode animation gating, one commit

**Files:** Modify `apps/web/arcade-src/sim-hub/src/npc-behavior.js`, `apps/web/arcade-src/sim-hub/src/npc.js`; a small shared helper + constants may live in `npc-behavior.js` (exported to npc.js if needed).

Behavior contract (from Global Constraints): walk mode only; journey actors always full-rate; far actors strided, not frozen; overview mode unchanged.

- [ ] **2a — shared gate helper.** In `npc-behavior.js` add:
  - `const NEAR_RADIUS_SQ = 30 * 30;` (world units; the clinic rooms are ~14–20 units across — tune only if review shows otherwise) and a frame counter incremented once per `updateMovers` call.
  - `function actorUpdateStride(objWorldPos)` → returns `1` (full rate) when `S.mode !== 'walk'`, when the actor is journey-involved (reuse the existing journey-actor membership the module already knows via `JOURNEY`/`journeyActors` imports — implementer picks the cheapest existing membership check), or when `objWorldPos.distanceToSquared(player.position) < NEAR_RADIUS_SQ`; else returns `4`.
  - Positions come from each actor's cached group position (`.group.position` — world == local here since actors are scene-rooted; verify and note if not).
- [ ] **2b — updateMovers gating.** Each mover updates only when `frameCount % stride === 0`, and when it does, it advances by the ELAPSED time since its own last update (accumulate dt per mover) so strided movers walk at the same real-world speed, just with chunkier sampling. `group.traverse` swing animation is part of the same gated update.
- [ ] **2c — updateDutyAnimations gating.** Same stride mechanism per duty actor (they animate in place; stride 4 at distance is imperceptible). Exchange/handoff-active actors count as journey-involved (full rate) — reuse the existing exchange registration state.
- [ ] **2d — updateNpcLabels gating.** In `npc.js`: in walk mode, skip the world-position/distance/DOM math for labels whose actor's last-known distance² exceeded the existing fade-out distance (the function already computes a fade distance — reuse its constant), re-checking skipped labels every 10th frame so approaching NPCs regain labels promptly. Overview mode unchanged.
- [ ] **2e — verification.** Gates + smoke. Then a behavioral self-check on the dev build (`pnpm --filter web dev`, no login needed to load the static page? if the app requires the full stack, verify via CI e2e instead and say so): journey start still animates escorts correctly (the e2e guided-journey path is the arbiter). Commit `perf(sim-hub): walk-mode distance gating for NPC movers, duty animations, labels`.

### Task 3 (controller): review, PR, held merge, walks

- [ ] Final branch review (both commits, focus: behavior contract — journey exemptions actually exempt, stride math keeps real-time speed, throttles have final-state flushes).
- [ ] Push, `gh pr create`, CI green. **HOLD merge until the owner's PR-2 linac-ct walk passes.** Then merge → deploy → owner walks BOTH: (a) the lag route (Faculty Directory → CT sim room → walk mode → hallway → waiting area) expecting smoothness, (b) one guided journey + CT QA to confirm zero behavior change; plus the linac-ct fraction screen (delivery panel text updates ~4×/sec now — acceptably live).
- [ ] Ledger + #77 note; record deferred items (delivery collision throttle, shadow-floor recovery, room LOD) on #77.
