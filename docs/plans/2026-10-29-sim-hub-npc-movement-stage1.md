# sim-hub NPC Movement, Stage 1 (Walls, Spacing, Jumps) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sim-hub NPCs stop walking through walls and through each other, and stop jumping. An automated check, run in CI, proves it and keeps it fixed.

**Architecture:**
- A `?npccheck` test hook exposes sim-hub's wall boxes, movers and move entry points.
- A Node check script loads the built bundle in the existing stubbed-browser harness and runs four checks:
  - (a) walls;
  - (b) spacing;
  - (c) one move per actor;
  - (d) no jump after a hidden tab.
- Then, in order, these make each check pass:
  - the walker loops are redrawn;
  - movers gain lanes and yielding, with their own progress;
  - moves for a busy actor are queued, and a pausing simulator clock drives all NPC timing.

Spec: `docs/specs/2026-10-29-sim-hub-npc-movement-design.md`, "Stage 1 design".

**Tech Stack:** TypeScript sim-hub modules (`apps/web/arcade-src/sim-hub/src/`), three.js 0.160 (pinned, do not change), Vite/rolldown arcade build, Node 24 scripts (`apps/web/scripts/`), GitHub Actions.

## Global Constraints

- **Scope:** only `apps/web/arcade-src/sim-hub/src/*.ts`, `apps/web/scripts/*.mjs` (new and existing) and `.github/workflows/pr.yml` (Task 4 only) change.
- **No new dependencies.** three.js stays at its pinned version.
- **The test hook** is inert unless `?npccheck` is in the URL. Without it, nothing is added to `window` and behaviour is unchanged. Follow the `?visibilitycheck` precedent in `visibility.ts:144-147`.
- **Check thresholds** (exact values):
  - NPC body radius 0.3 m against `colliders`;
  - the escort's footprint covers the wheelchair and the pusher at local z −0.82;
  - 500 samples per mover curve;
  - spacing: 20 minutes of simulated time at 30 Hz, a minimum centre-to-centre distance of 0.5 m, and `Math.random` replaced by a seeded PRNG (seed 1) before the bundle loads;
  - yield: hold when another NPC is within 0.9 m and inside ±50° of the heading;
  - hidden-tab check: a 10 s gap, after which nobody moves further than one 0.05 s frame step.
- **Keep the scene's feel.** Each walker keeps its role and general area. Don't add or remove walkers, and don't change their speeds unless spacing requires it (report any change). Journey and handoff behaviour (routes, onComplete order, cues) is otherwise unchanged.
- **Gates for every task:**
  - `pnpm check`: 0 errors (23 pre-existing warnings);
  - `pnpm exec eslint arcade-src src scripts`;
  - `pnpm exec prettier --check arcade-src scripts`;
  - `pnpm test`: 326 passed;
  - `pnpm build:arcade`, then the arcade smoke check gives 3 × SMOKE OK;
  - the NPC check, with the results each task specifies.
- **Off-limits:** never read, create or edit any file whose name starts with `.env`. Never `git add` anything under `.superpowers/`.
- **Git:** stay on branch `fix/sim-hub-npc-movement`. Never switch branches, push, stash or force.
- **Commit trailer:** `Co-Authored-By: <your model name> <noreply@anthropic.com>`.

---

### Task 1: The NPC check harness (failing first)

**Files:**
- Create: `apps/web/scripts/lib/browser-stubs.mjs` (the stub environment, moved out of `arcade-smoke.mjs`)
- Modify: `apps/web/scripts/arcade-smoke.mjs` (import the stubs; behaviour unchanged)
- Create: `apps/web/scripts/sim-hub-npc-check.mjs`
- Modify:
  - `apps/web/arcade-src/sim-hub/src/main.ts` (extract the per-frame body);
  - `walk.ts` (export `colliders` read-only for the hook);
  - the module that installs the hook. Put the hook in a new `apps/web/arcade-src/sim-hub/src/npc-check-hook.ts`, imported from `main.ts`.

**Interfaces (produced, later tasks rely on these exact names):**
- **`main.ts`: `export function stepSimulation(now: number): void`.**
  - It is exactly today's body of `animate`, from `if (document.hidden) return;` to the end, with `animate` reduced to `requestAnimationFrame(animate); stepSimulation(now);`.
  - It is a pure extraction with no behaviour change.
- **The hook** installs `window.__NPC` only with `?npccheck`. It holds:
  - `colliders`: `walk.ts`'s array of `{x, z, hw, hd}`;
  - `movers`: from `npc-behavior.ts` (`{group, curve, speed, offset, yawOffset}`);
  - `castActors()`: every ROOM_CAST and duty-actor group's world `{x, z, id}`;
  - `stepSimulation`;
  - `setHidden(bool)`: sets the value `stepSimulation` reads for `document.hidden`;
  - `moveJourneyActor` and `startActorHandoff` (export them if needed);
  - `workflowTransitions` and `handoffTransitions` (read-only views);
  - `journeyActors()`: the actors `moveJourneyActor` can move.
- **`sim-hub-npc-check.mjs [--svg <file>] [--only a,b,c,d]`:**
  - exit 0 when every selected check passes, 1 when any fails, 2 on setup error;
  - it prints `NPC CHECK <letter> PASS|FAIL: <summary>` per check, then at most 30 detail lines per failing check.

- [ ] **Step 1: Extract the stubs.**
  - Move the stub-building code from `arcade-smoke.mjs` into `scripts/lib/browser-stubs.mjs`, as `export function installBrowserStubs({ search = '' } = {})`. It sets the same globals as today, with `location.search` set to `search`.
  - `arcade-smoke.mjs` imports it and calls it before importing each bundle.
  - Run `node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html` after `pnpm build:arcade`. It must print exactly the same 3 SMOKE OK lines as before.
- [ ] **Step 2: Extract `stepSimulation` and add the hook.**
  - Do it as described under Interfaces.
  - Read `castActors` positions with `getWorldPosition`.
  - `journeyActors()` returns the journey's patient and the other actors from `journeyActors` in `journey.ts`.
- [ ] **Step 3: Write the check script.** It calls `installBrowserStubs({ search: '?npccheck' })`, replaces `Math.random` with a seeded PRNG (mulberry32, seed 1) before importing the built `arcade/sim-hub/assets/index-*.js`, then reads `window.__NPC`.
  - **(a) Walls.** For each mover, sample `curve.getPointAt(i/500)` for i in 0..499. A sample fails if `|x−c.x| < c.hw+0.3 && |z−c.z| < c.hd+0.3` for any collider. For the escort, also test the pusher point at local z −0.82, rotated by the curve's heading. Identify movers by their group name, or the first child mesh name if unnamed; the hook may give movers a stable `id`.
  - **(b) Spacing.** Call `stepSimulation(t)` with `t` advancing 1000/30 ms per step, for 36,000 steps. After each step, collect mover positions plus `castActors()`. Fail on any pair closer than 0.5 m where at least one is a mover; cast-cast pairs are ignored. Report the first 30 events as pair, time and place.
  - **(c) One move per actor.** Pick a journey actor standing in a room. Call `moveJourneyActor` to another room, then, 0.5 s of simulated time later, a second move for the same actor. Step until both finish. Fail if:
    - at any step more than one transition in `workflowTransitions`/`handoffTransitions` references the actor;
    - or the actor moves more than 0.25 m between consecutive steps;
    - or the two `onComplete` callbacks (wrap them) don't each fire exactly once, first then second.
  - **(d) No jump after a hidden tab.** Step normally for 2 s, record every mover and transition-actor position, `setHidden(true)` and step for 10 s, `setHidden(false)` and step once. Fail if any of them moved more than (its speed × 0.05 s) + 0.05 m. For movers, use the curve length × speed as the speed.
  - **`--svg <file>`:** write a top-down floor plan:
    - colliders as grey rectangles;
    - each mover loop as a coloured polyline with its name;
    - wall-clipping samples as red dots;
    - spacing events as orange dots.
- [ ] **Step 4: Run it and keep the RED evidence.**

```bash
cd apps/web && pnpm build:arcade >/dev/null 2>&1 && node scripts/sim-hub-npc-check.mjs --svg /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/npc/before.svg; echo "exit $?"
```

Expected: all four checks FAIL, with exit 1. If one passes, report it; the investigation predicted all four fail. If (a)'s failing movers don't include `therapist`, `linacRunner` and `ctRunner`, report that too.

- [ ] **Step 5: Gates** (Global Constraints), then commit: `test(sim-hub): NPC movement check harness (?npccheck hook, walls/spacing/moves/hidden-tab checks)`.
- **Report:** the full NPC check output and the SVG path.

### Task 2: Redraw the background walkers' loops (check a)

**Files:** modify `apps/web/arcade-src/sim-hub/src/npc-behavior.ts` (the `addMover(...)` point lists only).

- Re-author every mover loop that fails check (a), and any within 0.1 m of failing, so it follows corridor lanes and passes through doorways. Use the room table in `rooms.ts` (room `x`, `z`, `w`, `d`, `doorSide`) and `doorPoint`/`corridorNodesFromHub` in `walk.ts` as the geometry reference.
- Each walker keeps its role and general area. For example, `therapist` still loops the treatment branch and `ctRunner` still serves CT control, now entering through its door.
- **Lanes, ready for Task 3:** where two loops share a corridor, place them at least 1.2 m apart across the corridor, still ≥ 0.3 m plus clearance from the walls.
- Only waypoint arrays and, if needed, `closed` change. Speeds and offsets stay as they are (Task 3 owns spacing).
- **Verify:** `node scripts/sim-hub-npc-check.mjs --only a --svg <scratchpad>/npc/after-a.svg` gives `NPC CHECK a PASS`. Also run all checks and report (b), (c) and (d), which are expected to still fail.
- **Gates**, then commit: `fix(sim-hub): redraw background walker loops along corridors and through doors`.
- **Report:** per mover, what changed (one line each), the check output, and both SVG paths.

### Task 3: Lanes and yielding for walkers (check b; movers' part of d)

**Files:** modify `npc-behavior.ts` (`addMover`, `updateMovers`, and the mover records) and `main.ts` (pass `dt` to `updateMovers`).

- **Own progress:** each mover keeps its own progress: `m.u` starts at `m.offset`, and each update does `m.u = (m.u + dt*m.speed) % 1` unless the mover is holding. Position and heading come from `m.u` instead of `(sec*speed+offset)%1`.
  - `updateMovers(dt, sec)`: `sec` stays for the bob and swing phase. While holding, the swing is set to 0 (arms and legs at rest) and the bob stops.
  - `stepSimulation` passes its clamped `dt`.
- **Yielding:** a mover holds this frame if another NPC is within 0.9 m and inside ±50° of its heading. "Another NPC" means any mover with a lower index, any cast or duty actor, any journey actor, or any actor in a transition.
  - Movers never hold for higher-index movers.
  - Journey and handoff actors never hold.
- The `actorUpdateStride` throttling (#88) stays. A strided mover still advances `m.u` by the accumulated dt since its last update, so far movers keep their pace.
- **Verify:** `node scripts/sim-hub-npc-check.mjs` gives (a) PASS and (b) PASS. For (d), the movers' part must pass; transition actors may still fail until Task 4. Report it.
- If (b) still fails, adjust lanes (Task 2's waypoints) or start offsets, not the thresholds. Report each adjustment.
- **Gates**, then commit: `fix(sim-hub): background walkers keep lanes and yield instead of passing through people`.

### Task 4: One move per actor, the simulator clock, and CI (checks c, d)

**Files:**
- Modify: `journey.ts` (`moveJourneyActor`), `npc-behavior.ts` (`startActorHandoff`, `updateHandoffTransitions`), `equipment.ts` (`updateWorkflowTransitions`, plus the `CT_COUCH.start` stamping at :928, which uses the same clock), `main.ts` (the `simSec` accumulator) and `state.ts` (the `simSec` field, if kept on `S`).
- Modify `.github/workflows/pr.yml`.

- **Simulator clock:**
  - `stepSimulation` keeps `simSec`, which grows by the clamped `dt` only on frames that run (not hidden).
  - `simSec` is passed where `sec` is passed today: `updateMovers`, `updateDutyAnimations`, `updateHandoffTransitions`, `updateWorkflowTransitions`, `updateCtCouchMotion`, `updateNpcExchanges` and `updateAmbulance`.
  - Every `start: performance.now() / 1000` for these transitions, and `CT_COUCH.start`, uses the same clock. Expose it as `export function simNow(): number` from `main.ts`, or keep it on `S`; pick one and use it everywhere.
  - Leave the wall clocks, `LINAC_HEAD_LAB` and journey-room timing on `performance.now()`. They show real elapsed time on purpose.
- **Queued moves:**
  - If an actor already has a transition, `moveJourneyActor` and `startActorHandoff` append the request to that actor's queue (`actor.userData.moveQueue`) instead of starting it.
  - When a transition completes, after its `onComplete` and cues run as today, the next queued request for that actor starts from the actor's current (arrival) position.
  - Journey resets that clear `workflowTransitions` (`journey.ts:834`) also clear every actor's queue.
  - First list every `moveJourneyActor` and `startActorHandoff` call site, with what its `onComplete` does. If any call site needs a move to interrupt rather than queue, STOP and report it (NEEDS_CONTEXT). Do not invent interrupt semantics.
- **Verify:** `node scripts/sim-hub-npc-check.mjs --svg <scratchpad>/npc/after.svg` gives all four checks PASS, with exit 0.
- **CI:** in `.github/workflows/pr.yml`'s `web` job, directly after the arcade smoke step, add the step below with the same indentation:

```yaml
      # Walls, spacing, one-move-per-actor and hidden-tab checks for sim-hub NPCs (#77 follow-up).
      - run: node scripts/sim-hub-npc-check.mjs
        working-directory: apps/web
        timeout-minutes: 5
```

  Validate it with `python3 -I -c "import yaml; yaml.safe_load(open('.github/workflows/pr.yml')); print('pr.yml parses')"` (from the repo root).
- **Gates**, then commit: `fix(sim-hub): queue moves per actor and drive NPC timing from a pausing sim clock; NPC check in CI`.
- **Report:** the call-site list, the check output, and the final SVG path.
