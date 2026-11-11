# sim-hub Tutorial, Chapter 1 (PR 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 1 of the sim-hub tutorial, Jordan's treatment day: played as the patient Jordan Ellis (steps 1-2), then as the LINAC Control therapist Morgan Reed (steps 3-11), with the tracker card, the door-by-door marker, the check-in exchange, four decisions with hint, stronger hint and answer reveal, the role change, Jordan's escorts with waits, the vault door and beam, the end card, and a headless run-through check in CI.

**Architecture:**

- **3a, pure core (starts now, no PR 1 dependency):** `tutorial-math.ts` (route distance, next marker stop with the 1.5 m switch, line of sight, stuck and E-step hint timers, miss counter, escort stops and holds, the edge arrow), `tutorial-steps.ts` (Chapter 1 as data, with the exact text) and `tutorial-machine.ts` (a pure reducer: events in, state and effects out). Each has a vitest spec.
- **3b, wiring (after PR 1 merges):** `tutorial-hud.ts` (DOM only) and `tutorial.ts` (performs the machine's effects in the world, every frame from `main.ts stepSimulation`). Small, behaviour-neutral edits in shared files: the Jamie Williams rename, guards for hidden figures, `export`s, the vault laser registry, the tutorial door guard.
- **The tutorial reuses the treatment journey's actors and movers** (`JOURNEY.patient`, `.therapist`, `.vaultTherapist`, `.couchPatient`, `moveJourneyActor`, `movementPathFor`, `seatActor`). It never sets `JOURNEY.active`. It calls `resetTreatmentJourney(true)` on start and on exit.
- **E targets are the tutorial's own interactables** (`registerInteractable(..., { enabled })`), placed so they are always nearer than the thing they sit on (proven at plan time, see findings).
- **The run-through check** (`scripts/sim-hub-tutorial-check.mjs`) boots the bundle like the NPC check and plays the chapter twice. It runs in CI next to the NPC check.

**Tech Stack:** three.js 0.160.0 (pinned), TypeScript, Vite (`pnpm build:arcade`), vitest (server project), Node check scripts with `scripts/lib/browser-stubs.mjs`, Playwright (e2e and the owner's pictures).

**Spec:** `docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md`, "PR 3: Tutorial, Chapter 1" and the global constraints. Interfaces from PR 1: the common brief (session scratchpad `menu/plan-brief-common.md`) and `docs/plans/2026-11-11-sim-hub-menu.md` (PR 1's plan; 3b's anchors are taken from its code).

## Global Constraints

### Binding (from the brief)

- **NPC check:** `node scripts/sim-hub-npc-check.mjs` (from `apps/web`) keeps checks a–m green. The floors REST_FLOOR 40, HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15 never change; never loosen the check; check j unchanged; no edits to the check at all in PR 3. If something breaks it, fix NPC data, never the check. `journey.ts`'s journeys, actors and route builders stay. **PR 3 must print the same `NPC CHECK` lines as the baseline taken after PR 1 merges** (see "How the plan keeps the NPC check green").
- **Scene check** (`node scripts/sim-hub-scene-check.mjs`), **visibility check** (`ANGLE=metal node scripts/sim-hub-visibility-check.mjs`) and **vitest** (`pnpm exec vitest run --project server arcade-src/sim-hub/src`) stay green.
- **e2e must keep working:** `#watermark`, `#siteChoices`, `#releaseClinical`/`#holdClinical`, `window.CONSOLE_APP_URL`, `window.__rtappsVerdictLocked`, the player iframe title "Center QA walkthrough", `RTApps.recordResult('sim-hub-qa', …)`.
- **CI** (`pnpm build:arcade`, `arcade-smoke.mjs`, the NPC check in the `web` job) is never weakened. PR 3 adds one step. No self-hosted runners.
- **Lint:** `pnpm exec prettier --write <touched files>` and `pnpm exec eslint <touched files>` only, from `apps/web`; never the package-wide `pnpm lint`. `pnpm check` and `pnpm exec prettier --check .` before the PR.
- three.js stays 0.160.0. No new dependencies.
- Never read, create or edit any `.env*` file. Never print secrets or seed passwords.
- People in text and comments: they/them or names (the steps spec tests the chapter's text for he/she).
- Storage only through `prefs.ts` (the tutorial stores nothing).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `git add` anything under `.superpowers/` or `e2e/.auth/`. No force-push. Python only via `uv run` (none needed here).
- **Implementer subagents:** scratch files only under `$TUT` (below); never delete files they did not create; no glob deletes; stop and report if a permission is denied. Never `git add` a file the task does not name. The controller never commits while implementers are dispatched.
- **PR 1's files** (`pause.ts`, `prefs.ts`, `play-mode.ts`, `dialogs.ts`, `hub-dialogs.ts`, `menu.ts`, `menu-rules.ts`, `sound.ts`, `prompt-math.ts`, `hud-prompt.ts`, `hud-controls.ts`, `room-enter.ts`, `roomcard-rules.ts`, `hud-roomcard.ts`, `return-door.ts`) are only called, never edited. Two lines PR 1 wrote in existing files are changed, each flagged for the owner (findings 4 and 5).

### Repo and process rules

- **Branches:** the PR branch is `feat/sim-hub-tutorial`, created for 3a from the commit that holds the spec and this plan: `main` once `docs/sim-hub-menu-tutorial` is merged, else `docs/sim-hub-menu-tutorial`. Task branches for 3b: `feat/sim-hub-tutorial-prep` (3b-1), `feat/sim-hub-tutorial-hud` (3b-2), `feat/sim-hub-tutorial-wiring` (3b-3). 3a, 3b-4 and 3b-5 commit on `feat/sim-hub-tutorial` itself.
- **Code style:** tabs, single quotes, printWidth 100 (`apps/web/prettier.config.js`); match the surrounding code; remove whatever your change leaves unused, nothing else.
- **Anchors:** the quoted old text is the anchor; line numbers drift. 3b anchors are PR 1's code as its plan writes it. If an anchor is not found exactly after PR 1 merged, stop and report (do not guess).
- **Heavy checks are staggered:** at most one NPC, visibility or run-through check at a time on the machine. The controller schedules them.
- **Shell variables** (shell state does not persist; every block sets what it uses):

```bash
TUT=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/tutorial
REPO=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt
```

- **Commands** (all from `apps/web` of the worktree in use):
  - build: `pnpm build:arcade` (the checks read the gitignored `arcade/sim-hub`; rebuild after every source change)
  - vitest: `pnpm exec vitest run --project server arcade-src/sim-hub/src`
  - smoke: `node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html` (expected: one `SMOKE OK (clean evaluation)` per bundle, exit 0)
  - NPC check: `node scripts/sim-hub-npc-check.mjs > "$TUT/npc-<label>.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$TUT/npc-baseline.log") <(grep '^NPC CHECK' "$TUT/npc-<label>.log") && echo "NPC unchanged"` (expected: `exit 0`, `NPC unchanged`)
  - scene check: `node scripts/sim-hub-scene-check.mjs > "$TUT/scene-<label>.log" 2>&1; echo "exit $?"; diff <(grep '^SCENE CHECK' "$TUT/scene-baseline.log") <(grep '^SCENE CHECK' "$TUT/scene-<label>.log") && echo "scene unchanged"` (expected: `exit 0`, `scene unchanged`)
  - run-through check: `node scripts/sim-hub-tutorial-check.mjs` (expected: the six `TUTORIAL CHECK … PASS` lines of task 3b-3, exit 0; about 25 s)
  - random draws at boot: `node "$TUT/count-random.mjs"` (task 3b-0 writes it; expected: the same count as `$TUT/random-baseline.txt`)
  - types: `pnpm check` (expected: exit 0, svelte-check `0 errors`, tsc silent)

## Plan-time verification

Before writing this plan, every 3a and 3b file below was built and run in the scratchpad (`menu/planners/tut/`), against a copy of today's hub with stand-ins for PR 1's interfaces (`pause.ts`, `play-mode.ts`, `dialogs.ts`, a `menu.ts` whose mode switch does what 1a's `onModeChange` does, and 1b's `registerInteractable` `opts.enabled` plus its own-`visible` skip):

- **3a:** the three specs pass (`Test Files 3 passed`, `Tests 56 passed`); tsc, eslint and prettier are clean.
- **3b:** the hub type-checks with the wiring (`tsc -p` with the arcade settings).
- **The run-through check:** printed the six PASS lines of task 3b-3 in about 25 s.
- **The NPC check's random stream:** the bundle drew exactly as many `Math.random` values during boot with and without the tutorial (43,938).
- **A real browser (Playwright, Metal):** played the whole chapter with no page errors. Pictures were taken of the tracker outside, the check-in, the marker, the role card, a decision with a hint, the marker on a door and the end card.

The code in this plan is that code. 3b's anchors were then aligned with PR 1's plan.

## Plan-time findings and decisions

Owner-facing items are marked **(owner)**; the plan follows the recommendation.

1. **E targets would lose to what they sit on.** Every target the tutorial needs already has an interactable: Maya and Jordan (their figures, at the feet), the console (six monitors and the "LINAC Treatment Control Console" equipment anchor) and the couch (the couch anchor and the couch side panels, "COUCH CONTROLS", which won at first in the scratch run).
   - So each press-E step gets its own target, enabled only during that step.
   - **For a person**, the target sits at reach height (1.65 m) over the person: always nearer than their own interactable at their feet.
   - **For the console and the couch**, the target is the point of the desk's front edge, or the couch's near side, nearest the player. Every screen or panel lies behind that line.
   - The check presses E through the real `performInteraction` at every step, so a regression shows up there.
2. **Hidden figures still show their name label and speech bubbles.** three.js r160's CSS2DRenderer draws a hidden parent's CSS2D children. So the hidden Morgan's "Morgan Reed, RTT" label and the Morgan↔Marcus exchange bubble would float at the console.
   - `updateNpcLabels` and `updateNpcExchanges` skip hidden figures (task 3b-1).
   - PR 1's `nearestInteractable` already skips them for E (PR 1 finding 9).
3. **Pre-existing bug: exchanges rotate lying patients.** `updateNpcExchanges` calls `faceNpcToward(b, a)` on the vault 1 couch patient when the camera is within 15 m. That turned Jordan 50° on the couch in the scratch run and left the couch patient turned after exit. `faceNpcToward` now leaves lying figures alone, as it already does seated ones (task 3b-1).
4. **(owner) The LINAC Control door would end the tutorial.** In PR 1, E at LINAC Control's door leaves for the LINAC/CT app. Step 7 leads the player right to that door.
   - In the tutorial, the doors that leave the hub get no prompt and E ignores them: one condition in PR 1's `leavesHub` (interact.ts).
   - The alternative is leaving it, which loses the chapter.
5. **(owner) PR 1's e2e test** (1f) asserts `#menuTutorial` is disabled. PR 3 enables it, so task 3b-4 flips that one assertion to `toBeEnabled()`.
6. **The journey caps a move at 32 s** (`beginJourneyMove`). On the 102 m walk to Vault 1 that is 3.2 m/s on average and 4.8 m/s at the curve's peak, faster than the player walks.
   - The escort sets its own move's duration to the walking pace (1.52 m/s, the journey's own escort speed).
   - The route data stays the journey's.
7. **The escort waits at "doors and corners":** points within 0.6 m of a door point, and turns of 20° or more.
   - At 30°, the lobby exit (22°) was not a stop, so Jordan walked 60 m without waiting.
   - The 50 m main corridor has no stop: there Jordan walks on toward a player who is ahead, and "Wait for Jordan" shows.
8. **The escort holds Jordan** by moving its journey move's clock (`start`) each frame. It does not split the route, so Jordan walks exactly the journey's route builder output. Doors on the route are held open while Jordan is within 6 m of their door point, because walk mode closes every door the player is not at.
9. **(owner) Where the moves end:**
   - **Step 5:** the walk to Vault 1 is the journey's two moves: lobby → the changing area (69.0, −14.15), then → the couch side (76.7, −15.25). Jordan's chair is the journey's pickup chair (`LOBBY_PICKUP.chair`; the check asserts it), so these are the routes NPC check l walks.
   - **Step 11:** ends at the lobby desk, as the spec says. This is the check-in spot (−4.5, −2.05), a journey literal clear of the mover loops (check b). The journey's own departure ends at (0, 7.6), on the visitor's lobby loop.
   - **Jamie Williams "at the other side of the couch":** (76.3, −20.0), on the vault 1 graph's furniture-clear line from node 6 to Elena Torres's place. It is not a journey literal. The run-through check covers its walls, not its furniture.
10. **(owner) Invented facts the decisions need:**
    - Jordan's date of birth: March 14, 1968.
    - The 9:00 Vault 1 slot.
    - "Jody Ellis" booked on Vault 2.
    - The 4 mm shift.
    - The simulation record rows.

    The reasons and hints come from `STAFF_GUIDES` (lobby, linaccontrol, vault1/vault2), the vault exchanges and `MIA_SIM_SETUP`. The journey's text uses "him/his", so the tutorial's lines are rewritten with names (the spec tests it).

11. **(owner) Spec conflict:** the picture "the marker at the consult room door" does not exist in Chapter 1: the route never passes the consult room. The plan shoots the marker on LINAC Control's door (step 7) instead.
12. **The marker label** is "{objective place} · {walking distance}" at every stop, and the tracker shows the same distance. The marker hides within 1.5 m of the last stop, where the E prompt or the room takes over. A stop with a wall in the line of sight is hidden and the route rebuilt from the player; the route is also rebuilt every second.
13. **Gown and timing details:**
    - Jordan's gown goes on at the changing area, and Jordan's clothes come back on getting off the couch, both at once (no changing pause).
    - The intercom line at step 2 is Maya's, to Treatment Control.
    - Beam on has no intercom, because the player is the one who would speak.
14. **Random-stream safety:** an `Object3D` draws `Math.random` for its uuid, and the NPC check seeds `Math.random`. So nothing in the tutorial makes a three.js object at module load or boot. The route proxy and the E targets are made on the first tutorial start.

## How the plan keeps the NPC check green

The NPC check needs no edits, and its output must be identical to the baseline. The plan guarantees this five ways:

1. **Nothing runs outside play mode 'tutorial'.**
   - The NPC check boots to the title menu (PR 1) and drives the journeys directly; it never calls `enterMode('tutorial')`.
   - `updateTutorial` returns on its first line while inactive.
   - `initTutorial` only:
     - binds DOM;
     - registers one dialog and one mode listener;
     - enables the menu entry;
     - with `?npccheck`, adds `window.__TUTORIAL` (the NPC check never enumerates `window`).
   - E targets and the route proxy are created on the first start.
2. **Same random stream.** No three.js object is made at load or boot.
   - Task 3b-0 records how many `Math.random` draws the boot makes.
   - Task 3b-3 shows the count unchanged (43,938 at plan time, with and without the tutorial).
3. **No NPC data changes.**
   - `ROOM_GRAPHS`, `ARRIVAL_SPOTS`, the cast placements in `npc.ts`, `HANDOFFS`, `LOBBY_PICKUP`, speeds and duration caps are untouched.
   - Check b reads `journey.ts` as text for literal positions. Its only change is adding `export` to `journeyIntercom`; the tutorial's positions live in `tutorial-steps.ts`.
   - The escort's own duration change applies to the tutorial's own move entries, at run time.
4. **The shared-code edits are guards that cannot fire in the check.**
   - **Labels and bubbles** of hidden figures: DOM only.
   - **Exchanges with a hidden partner:** while a journey runs, exchanges are off. After the journey reset every exchange partner is visible: `ctSimPatient`/`miaTreatmentPatient` are hidden but in no exchange.
   - **`faceNpcToward` ignoring lying figures:** only exchanges ever pass one. They need the camera within 15 m of a vault, CT or HDR pair outside overview mode. The check's camera stays in overview, or at the journeys' lobby and LINAC Control framings. A lying patient turned today would also already fail check h's edge test.
   - **`startActorHandoff` ignoring `tutorialLocked` actors:** only the tutorial sets the flag.
   - **`leavesHub`'s tutorial condition, the vault 1 laser registry and the Jamie Williams rename:** no actor state at all.
   - **Empirical proof:** the NPC check runs after 3b-1, after 3b-3 and at the end, each diffed against the baseline (`NPC unchanged`).
5. **Leaving restores the world.**
   - Exit calls `resetTreatmentJourney(true)`.
   - It also restores what the reset does not touch: Morgan's visibility, the vault 1 lasers, and the `tutorialLocked`/`inHandoff` flags.
   - The run-through check asserts, after both Keep exploring and Main menu, that every journey actor's position, rotation, visibility, seating and gown, the visibility of every person, the open moves and the lasers equal the journey reset's.

## File Structure

All paths under `apps/web/arcade-src/sim-hub/src/` unless given in full.

| File                                                                        | Responsibility                                                                                                                                                                                                                             | Task        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `tutorial-math.ts` + `tutorial-math.spec.ts`                                | pure: route distance, next stop (1.5 m), off-route, line of sight, stuck timers (60/120 s, 1 m), E-step timer (6 m, 20 s), miss feedback, smoothstep and its inverse, escort stops and holds, "Wait for Jordan", edge arrow, distance text | 3a-1        |
| `tutorial-steps.ts` + `tutorial-steps.spec.ts`                              | Chapter 1 as data: roles, 11 steps, targets, triggers, hints, the exchange, 4 decisions, actions, world points, lines                                                                                                                      | 3a-2        |
| `tutorial-machine.ts` + `tutorial-machine.spec.ts`                          | pure reducer: state + event → state + effects                                                                                                                                                                                              | 3a-3        |
| `interact.ts`                                                               | `STAFF_GUIDES.vault1` → Jamie Williams; `leavesHub` false in the tutorial                                                                                                                                                                  | 3b-1        |
| `npc.ts`                                                                    | `faceNpcToward` leaves lying figures; `updateNpcLabels` hides hidden figures' labels                                                                                                                                                       | 3b-1        |
| `npc-behavior.ts`                                                           | `export seatNear`; `updateNpcExchanges` skips hidden partners; `startActorHandoff` skips `tutorialLocked` actors                                                                                                                           | 3b-1        |
| `journey.ts`                                                                | `export journeyIntercom`                                                                                                                                                                                                                   | 3b-1        |
| `props.ts`                                                                  | `ROOM_LASERS` (each vault's two laser lines)                                                                                                                                                                                               | 3b-1        |
| `tutorial-hud.ts`                                                           | DOM: tracker, hint line, distance, marker, edge arrow, dialog, fade, role card, end card                                                                                                                                                   | 3b-2        |
| `index.html`                                                                | after `<!-- slot:tutorial -->` and `/* slot:tutorial */`                                                                                                                                                                                   | 3b-2        |
| `tutorial.ts`                                                               | wiring: start/exit, effects, actions, escorts, marker, E targets, per-frame update, `?npccheck` hook                                                                                                                                       | 3b-3        |
| `main.ts`                                                                   | three lines: import, `updateTutorial(dt)`, `initTutorial()`                                                                                                                                                                                | 3b-3        |
| `apps/web/scripts/sim-hub-tutorial-check.mjs`                               | the headless run-through check                                                                                                                                                                                                             | 3b-3        |
| `.github/workflows/pr.yml`                                                  | job `web`: the run-through check after the NPC check                                                                                                                                                                                       | 3b-4        |
| `apps/web/e2e/simulator.e2e.ts`                                             | Tutorial from the title menu shows the tracker at step 1; 1f's `#menuTutorial` assertion flipped                                                                                                                                           | 3b-4        |
| `$TUT/count-random.mjs`, `$TUT/tutorial-shots.mjs` (scratch, not committed) | boot random-draw count; the owner's pictures                                                                                                                                                                                               | 3b-0 writes |

Shared files in 3b: 3b-1 and 3b-2 run in parallel and touch disjoint files (3b-2 owns `index.html` and the new `tutorial-hud.ts`; 3b-1 owns the other five). 3b-3 runs after both are merged.

## Worktrees and merge procedure

- [ ] **W1 (controller, now): the PR branch and 3a's worktree.**

```bash
REPO=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt
TUT=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/tutorial
mkdir -p "$TUT"
cd "$REPO" && git fetch origin
# the spec and this plan: on main once the docs branch is merged, else on the docs branch
if git cat-file -e origin/main:docs/plans/2026-11-11-sim-hub-tutorial.md 2>/dev/null; then BASE=origin/main; else BASE=docs/sim-hub-menu-tutorial; fi
git worktree add "$WT/tutorial-core" -b feat/sim-hub-tutorial "$BASE"
cd "$WT/tutorial-core" && pnpm install --frozen-lockfile
```

Dispatch one implementer for 3a-1, 3a-2 and 3a-3, in that order, in `$WT/tutorial-core` (each imports the one before; each is its own commit and review). Then `git push -u origin feat/sim-hub-tutorial`.

- [ ] **W2 (controller, after PR 1 is merged into `main`): task 3b-0.**
- [ ] **W3: 3b-1 and 3b-2 in parallel worktrees** (from `feat/sim-hub-tutorial` after 3b-0's merge commit):

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt
cd "$WT/tutorial-core"
git worktree add "$WT/tutorial-prep" -b feat/sim-hub-tutorial-prep feat/sim-hub-tutorial
git worktree add "$WT/tutorial-hud" -b feat/sim-hub-tutorial-hud feat/sim-hub-tutorial
for w in tutorial-prep tutorial-hud; do (cd "$WT/$w" && pnpm install --frozen-lockfile); done
```

- [ ] **W4: merge 3b-1, then 3b-2,** in `$WT/tutorial-core` on `feat/sim-hub-tutorial` (no commits there while they run):

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt
cd "$WT/tutorial-core"
git merge --no-ff feat/sim-hub-tutorial-prep -m "Merge task 3b-1 (tutorial prep) into feat/sim-hub-tutorial

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git merge --no-ff feat/sim-hub-tutorial-hud -m "Merge task 3b-2 (tutorial HUD) into feat/sim-hub-tutorial

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

After each: build, vitest, smoke. A conflict means a task left its files: stop and report.

- [ ] **W5: 3b-3** in `git worktree add "$WT/tutorial-wiring" -b feat/sim-hub-tutorial-wiring feat/sim-hub-tutorial` (then `pnpm install --frozen-lockfile`), merged the same way ("Merge task 3b-3 (tutorial wiring and run-through check)"). Then 3b-4 and 3b-5 on `feat/sim-hub-tutorial` in `$WT/tutorial-core`.

---

## Task 3a-1: `tutorial-math.ts` (worktree `tutorial-core`)

**Files:**

- Create: `apps/web/arcade-src/sim-hub/src/tutorial-math.ts`
- Create: `apps/web/arcade-src/sim-hub/src/tutorial-math.spec.ts`

**Interfaces.** Consumes: nothing. Produces (exact):

```ts
export type Pt = readonly [number, number];
export interface Rect {
  x: number;
  z: number;
  hw: number;
  hd: number;
}
export const MARKER_SWITCH_R = 1.5,
  OFF_ROUTE_R = 4,
  STUCK_PROGRESS_M = 1;
export const STUCK_HINT_S: readonly [number, number]; // [60, 120]
export const E_HINT_R = 6,
  E_HINT_S = 20,
  REVEAL_AT = 3,
  ESCORT_WAIT_R = 5,
  ESCORT_AHEAD_R = 12;
export function dist(a: Pt, b: Pt): number;
export function routeLength(pts: readonly Pt[]): number;
export function remainingDistance(
  pts: readonly Pt[],
  idx: number,
  p: Pt,
): number;
export function advanceStop(
  pts: readonly Pt[],
  idx: number,
  p: Pt,
  r?: number,
): number;
export function closestOnSegment(p: Pt, a: Pt, b: Pt): Pt;
export function offRoute(
  pts: readonly Pt[],
  idx: number,
  p: Pt,
  r?: number,
): boolean;
export function segmentHitsRect(a: Pt, b: Pt, c: Rect): boolean;
export function lineBlocked(a: Pt, b: Pt, walls: readonly Rect[]): boolean;
export interface StuckTimer {
  best: number;
  idle: number;
}
export function newStuckTimer(): StuckTimer;
export function stepStuck(
  t: StuckTimer,
  dt: number,
  distance: number,
): StuckTimer;
export function stuckLevel(idle: number): 0 | 1 | 2;
export function stepNear(near: number, dt: number, distance: number): number;
export function eHintDue(near: number): boolean;
export type FeedbackKind = "correct" | "hint1" | "hint2" | "reveal";
export function missFeedback(misses: number): "hint1" | "hint2" | "reveal";
export function smoothstep(u: number): number;
export function invSmoothstep(e: number): number;
export function escortStops(
  pts: readonly Pt[],
  doors: readonly Pt[],
  turnDeg?: number,
  doorR?: number,
): number[];
export interface EscortHold {
  next: number;
  holding: boolean;
}
export function stepEscort(
  h: EscortHold,
  e: number,
  stops: readonly number[],
  gap: number,
  r?: number,
): { hold: EscortHold; holdAt: number | null };
export function escortAhead(
  gap: number,
  playerRemaining: number,
  jordanRemaining: number,
  r?: number,
): boolean;
export function edgeArrow(
  ndcX: number,
  ndcY: number,
  behind: boolean,
  margin?: number,
): { onScreen: boolean; x: number; y: number; angle: number };
export function formatDistance(m: number): string;
```

- [ ] **3a-1.1: Write the failing test** `tutorial-math.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  advanceStop,
  closestOnSegment,
  edgeArrow,
  eHintDue,
  escortAhead,
  escortStops,
  formatDistance,
  invSmoothstep,
  lineBlocked,
  missFeedback,
  newStuckTimer,
  offRoute,
  remainingDistance,
  routeLength,
  smoothstep,
  stepEscort,
  stepNear,
  stepStuck,
  stuckLevel,
} from "./tutorial-math";
import type { EscortHold, Pt, StuckTimer } from "./tutorial-math";

// An L-shaped route: 3 m east, then 4 m north; it is 7 m long.
const L: Pt[] = [
  [0, 0],
  [3, 0],
  [3, 4],
];

describe("route walking distance", () => {
  it("is the length along the route, not the straight line", () => {
    expect(routeLength(L)).toBeCloseTo(7);
    expect(routeLength([[0, 0]])).toBe(0);
  });

  it("counts from the player to the next stop, then along the rest of the route", () => {
    expect(remainingDistance(L, 1, [1, 0])).toBeCloseTo(6);
    expect(remainingDistance(L, 2, [3, 1])).toBeCloseTo(3);
    // off the route, the distance to the stop is the straight line to it
    expect(remainingDistance(L, 1, [3, -2])).toBeCloseTo(6);
  });
});

describe("the marker stop as the player advances", () => {
  it("moves to the next stop once the player is within 1.5 m, not before", () => {
    expect(advanceStop(L, 1, [1.49, 0])).toBe(1);
    expect(advanceStop(L, 1, [1.51, 0])).toBe(2);
  });

  it("never passes the last stop", () => {
    expect(advanceStop(L, 2, [3, 4])).toBe(2);
    expect(advanceStop(L, 1, [3, 1.4])).toBe(2);
  });

  it("skips every stop already within reach", () => {
    const close: Pt[] = [
      [0, 0],
      [1, 0],
      [1.5, 0],
      [10, 0],
    ];
    expect(advanceStop(close, 1, [0.4, 0])).toBe(3);
  });

  it("finds the point of a desk edge nearest the player", () => {
    expect(closestOnSegment([2, 5], [0, 0], [0, 4])).toEqual([0, 4]);
    expect(closestOnSegment([2, 1], [0, 0], [0, 4])).toEqual([0, 1]);
  });

  it("is off the route more than 4 m from the leg being walked", () => {
    expect(offRoute(L, 1, [1.5, 3.9])).toBe(false);
    expect(offRoute(L, 1, [1.5, 4.1])).toBe(true);
    expect(offRoute(L, 2, [7.1, 2])).toBe(true);
  });
});

describe("line of sight against the walls", () => {
  const wall = { x: 0, z: 5, hw: 4, hd: 0.08 };
  const doorway = [
    { x: -3, z: 5, hw: 2, hd: 0.08 },
    { x: 3, z: 5, hw: 2, hd: 0.08 },
  ];

  it("is blocked by a wall between the points", () => {
    expect(lineBlocked([0, 0], [0, 10], [wall])).toBe(true);
  });

  it("is clear beside a wall, short of it and through a doorway", () => {
    expect(lineBlocked([5, 0], [5, 10], [wall])).toBe(false);
    expect(lineBlocked([0, 0], [0, 4.5], [wall])).toBe(false);
    expect(lineBlocked([0, 0], [0, 10], doorway)).toBe(false);
  });
});

describe("stuck hints on walking steps", () => {
  // quarter-second frames, exact in binary, so the thresholds are met exactly
  const run = (t: StuckTimer, seconds: number, distance: number) => {
    for (let i = 0; i < seconds * 4; i++) t = stepStuck(t, 0.25, distance);
    return t;
  };
  const seen = (distance: number) => stepStuck(newStuckTimer(), 0, distance);

  it("shows hint 1 after 60 s and hint 2 after 120 s without progress", () => {
    let t = run(seen(40), 59.75, 40);
    expect(stuckLevel(t.idle)).toBe(0);
    t = run(t, 0.25, 40);
    expect(stuckLevel(t.idle)).toBe(1);
    t = run(t, 59.75, 40);
    expect(stuckLevel(t.idle)).toBe(1);
    t = run(t, 0.25, 40);
    expect(stuckLevel(t.idle)).toBe(2);
  });

  it("counts a drop of 1 m as progress, and less than that as none", () => {
    let t = run(seen(40), 50, 40);
    t = stepStuck(t, 0.25, 39.1);
    expect(t.idle).toBe(50.25);
    t = stepStuck(t, 0.25, 39);
    expect(t).toEqual({ best: 39, idle: 0 });
  });

  it("does not count walking away and back as progress", () => {
    let t = run(seen(20), 30, 20);
    t = run(t, 20, 35);
    t = run(t, 10, 20);
    expect(t.idle).toBe(60);
    expect(stuckLevel(t.idle)).toBe(1);
  });
});

describe("the E-step hint", () => {
  it("is due after 20 s within 6 m without pressing E", () => {
    let near = 0;
    for (let i = 0; i < 79; i++) near = stepNear(near, 0.25, 6);
    expect(eHintDue(near)).toBe(false);
    near = stepNear(near, 0.25, 5);
    expect(eHintDue(near)).toBe(true);
  });

  it("starts over when the player walks more than 6 m away", () => {
    let near = 0;
    for (let i = 0; i < 60; i++) near = stepNear(near, 0.25, 3);
    near = stepNear(near, 0.25, 6.5);
    expect(near).toBe(0);
  });
});

describe("decision misses", () => {
  it("gives hint 1, hint 2, then the answer at the third miss", () => {
    expect([1, 2, 3, 4].map(missFeedback)).toEqual([
      "hint1",
      "hint2",
      "reveal",
      "reveal",
    ]);
  });
});

describe("the journey ease and its inverse", () => {
  it("round-trips", () => {
    for (const u of [0, 0.2, 0.5, 0.9, 1])
      expect(invSmoothstep(smoothstep(u))).toBeCloseTo(u);
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
  });
});

describe("escort stops and holds", () => {
  it("stops at corners and doors, never at the start or the end", () => {
    // 10 m east (a door point at 5 m on the straight), then 10 m north
    const route: Pt[] = [
      [0, 0],
      [5, 0],
      [10, 0],
      [10, 10],
    ];
    expect(escortStops(route, [[5, 0.3]])).toEqual([0.25, 0.5]);
    expect(escortStops(route, [])).toEqual([0.5]);
    expect(
      escortStops(
        [
          [0, 0],
          [4, 0.1],
          [8, 0],
        ],
        [],
      ),
    ).toEqual([]);
  });

  it("walks on past a stop while the player is within 5 m", () => {
    const r = stepEscort({ next: 0, holding: false }, 0.3, [0.25, 0.5], 4);
    expect(r.holdAt).toBeNull();
    expect(r.hold).toEqual({ next: 1, holding: false });
  });

  it("waits at the stop until the player is within 5 m, then walks on", () => {
    let h: EscortHold = { next: 0, holding: false };
    let r = stepEscort(h, 0.26, [0.25, 0.5], 9);
    expect(r.holdAt).toBe(0.25);
    h = r.hold;
    r = stepEscort(h, 0.27, [0.25, 0.5], 6);
    expect(r.holdAt).toBe(0.25);
    r = stepEscort(r.hold, 0.25, [0.25, 0.5], 4.5);
    expect(r.holdAt).toBeNull();
    expect(r.hold).toEqual({ next: 1, holding: false });
  });

  it('says "Wait for Jordan" only when the player is more than 12 m ahead', () => {
    expect(escortAhead(12.1, 30, 40)).toBe(true);
    expect(escortAhead(11.9, 30, 40)).toBe(false);
    expect(escortAhead(20, 50, 40)).toBe(false);
  });
});

describe("the off-screen edge arrow", () => {
  it("draws an on-screen stop at its point", () => {
    const a = edgeArrow(0, 0, false);
    expect(a.onScreen).toBe(true);
    expect(a.x).toBeCloseTo(0.5);
    expect(a.y).toBeCloseTo(0.5);
  });

  it("points right from the right edge and up from the top edge", () => {
    const right = edgeArrow(2, 0, false);
    expect(right.onScreen).toBe(false);
    expect(right.x).toBeCloseTo(0.975);
    expect(right.y).toBeCloseTo(0.5);
    expect(right.angle).toBeCloseTo(0);
    const up = edgeArrow(0, 3, false);
    expect(up.y).toBeCloseTo(0.025);
    expect(up.angle).toBeCloseTo(-90);
  });

  it("points the way to turn for a stop behind the camera", () => {
    const back = edgeArrow(0, 0, true);
    expect(back.onScreen).toBe(false);
    expect(back.y).toBeCloseTo(0.975);
    expect(back.angle).toBeCloseTo(90);
    // behind and to the left projects to the right of the screen
    const left = edgeArrow(0.4, 0, true);
    expect(left.x).toBeCloseTo(0.025);
    expect(Math.abs(left.angle)).toBeCloseTo(180);
  });
});

describe("distance text", () => {
  it("rounds to whole metres", () => {
    expect(formatDistance(0.4)).toBe("0 m");
    expect(formatDistance(12.6)).toBe("13 m");
  });
});
```

- [ ] **3a-1.2: Run it (expected FAIL).** From `apps/web`: `pnpm exec vitest run --project server arcade-src/sim-hub/src/tutorial-math.spec.ts`. Expected: the suite fails to load, with an import error for `./tutorial-math` (vitest prints `Failed to resolve import "./tutorial-math"` or `Cannot find module './tutorial-math'`), `Test Files  1 failed (1)`.
- [ ] **3a-1.3: Write `tutorial-math.ts`:**

```ts
/* Pure helpers for the sim-hub tutorial (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md,
   PR 3): the walking distance along a marker route, the marker's next stop as the player walks it,
   the line-of-sight test against the walk colliders, the stuck and E-step hint timers, the decision
   miss counter, Jordan's escort stops and holds, and the off-screen edge arrow. Plain numbers only
   (points are [x, z] in metres), so its spec runs without the scene; tutorial.ts feeds it the
   world. */

/** A point on the floor: [x, z] in metres. */
export type Pt = readonly [number, number];
/** A wall collider (walk.ts getColliders): centre x/z and half-sizes. */
export interface Rect {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

/** The marker moves on to the next stop when the player comes this close (m). */
export const MARKER_SWITCH_R = 1.5;
/** The route is rebuilt when the player is this far off the leg they are walking (m). */
export const OFF_ROUTE_R = 4;
/** A walking step makes progress when the walking distance drops by this much (m). */
export const STUCK_PROGRESS_M = 1;
/** Seconds without progress before hint 1 and hint 2. */
export const STUCK_HINT_S: readonly [number, number] = [60, 120];
/** The E-step hint shows after E_HINT_S seconds within E_HINT_R of the target (m, walking). */
export const E_HINT_R = 6;
export const E_HINT_S = 20;
/** The miss that shows the answer. */
export const REVEAL_AT = 3;
/** Jordan waits at a stop until the player is within ESCORT_WAIT_R (m). */
export const ESCORT_WAIT_R = 5;
/** "Wait for Jordan" shows when the player is this far ahead of Jordan (m). */
export const ESCORT_AHEAD_R = 12;

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** The length of the polyline through `pts`. */
export function routeLength(pts: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]);
  return n;
}

/** The walking distance from `p` to the route's end: to stop `idx`, then along the route. */
export function remainingDistance(
  pts: readonly Pt[],
  idx: number,
  p: Pt,
): number {
  if (!pts.length) return 0;
  const i = Math.min(Math.max(idx, 0), pts.length - 1);
  return dist(p, pts[i]) + routeLength(pts.slice(i));
}

/** The next stop once the player is at `p`: stop `idx`, or later ones while each is within `r`.
    The route's last point is never passed. */
export function advanceStop(
  pts: readonly Pt[],
  idx: number,
  p: Pt,
  r = MARKER_SWITCH_R,
): number {
  let i = idx;
  while (i < pts.length - 1 && dist(p, pts[i]) < r) i++;
  return i;
}

/** The point of segment a-b nearest to `p`. */
export function closestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len2 = dx * dx + dz * dz;
  if (len2 < 1e-12) return a;
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2),
  );
  return [a[0] + dx * t, a[1] + dz * t];
}

/** Whether the player at `p` is farther than `r` from the leg they are walking, stop idx-1 to idx. */
export function offRoute(
  pts: readonly Pt[],
  idx: number,
  p: Pt,
  r = OFF_ROUTE_R,
): boolean {
  if (pts.length < 2) return false;
  const i = Math.min(Math.max(idx, 1), pts.length - 1);
  return dist(p, closestOnSegment(p, pts[i - 1], pts[i])) > r;
}

/** Whether segment a-b passes through rectangle c (slab test, x/z). */
export function segmentHitsRect(a: Pt, b: Pt, c: Rect): boolean {
  let t0 = 0,
    t1 = 1;
  const axes: [number, number, number, number][] = [
    [a[0], b[0] - a[0], c.x - c.hw, c.x + c.hw],
    [a[1], b[1] - a[1], c.z - c.hd, c.z + c.hd],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (o <= lo || o >= hi) return false;
      continue;
    }
    const u = (lo - o) / d,
      v = (hi - o) / d;
    t0 = Math.max(t0, Math.min(u, v));
    t1 = Math.min(t1, Math.max(u, v));
    if (t0 >= t1) return false;
  }
  return true;
}

/** Whether any wall collider lies between a and b. */
export function lineBlocked(a: Pt, b: Pt, walls: readonly Rect[]): boolean {
  return walls.some((c) => segmentHitsRect(a, b, c));
}

/** The stuck timer of a walking step: the lowest walking distance seen since the last progress,
    and the seconds since then. */
export interface StuckTimer {
  best: number;
  idle: number;
}
export function newStuckTimer(): StuckTimer {
  return { best: Infinity, idle: 0 };
}
/** One frame: progress (the distance at least STUCK_PROGRESS_M under the best) restarts the timer;
    the step's first frame only sets the best. */
export function stepStuck(
  t: StuckTimer,
  dt: number,
  distance: number,
): StuckTimer {
  if (!Number.isFinite(t.best)) return { best: distance, idle: t.idle + dt };
  if (distance <= t.best - STUCK_PROGRESS_M) return { best: distance, idle: 0 };
  return { best: t.best, idle: t.idle + dt };
}
/** Which walking hint the idle time has reached: 0 none, 1 or 2. */
export function stuckLevel(idle: number): 0 | 1 | 2 {
  if (idle >= STUCK_HINT_S[1]) return 2;
  if (idle >= STUCK_HINT_S[0]) return 1;
  return 0;
}

/** One frame of an E step's timer: seconds within E_HINT_R of the target, reset beyond it. */
export function stepNear(near: number, dt: number, distance: number): number {
  return distance <= E_HINT_R ? near + dt : 0;
}
export function eHintDue(near: number): boolean {
  return near >= E_HINT_S;
}

export type FeedbackKind = "correct" | "hint1" | "hint2" | "reveal";
/** The feedback for the n-th wrong answer to one decision: hint 1, hint 2, then the answer. */
export function missFeedback(misses: number): "hint1" | "hint2" | "reveal" {
  if (misses >= REVEAL_AT) return "reveal";
  return misses === 2 ? "hint2" : "hint1";
}

/** The ease journey moves walk their curve with (equipment.ts updateWorkflowTransitions). */
export function smoothstep(u: number): number {
  const x = Math.max(0, Math.min(1, u));
  return x * x * (3 - 2 * x);
}
/** The time fraction u at which smoothstep(u) reaches e. */
export function invSmoothstep(e: number): number {
  const x = Math.max(0, Math.min(1, e));
  return 0.5 - Math.sin(Math.asin(1 - 2 * x) / 3);
}

/** Where Jordan waits along an escort route: the inner points that turn by at least `turnDeg` or
    lie within `doorR` of a door point, as fractions of the route's length, in order. */
export function escortStops(
  pts: readonly Pt[],
  doors: readonly Pt[],
  turnDeg = 20,
  doorR = 0.6,
): number[] {
  const total = routeLength(pts),
    out: number[] = [];
  if (total < 1e-9) return out;
  let along = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    along += dist(pts[i - 1], pts[i]);
    const ax = pts[i][0] - pts[i - 1][0],
      az = pts[i][1] - pts[i - 1][1],
      bx = pts[i + 1][0] - pts[i][0],
      bz = pts[i + 1][1] - pts[i][1],
      la = Math.hypot(ax, az),
      lb = Math.hypot(bx, bz);
    const turn =
      la > 1e-9 && lb > 1e-9
        ? (Math.acos(
            Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb))),
          ) *
            180) /
          Math.PI
        : 0;
    const atDoor = doors.some((d) => dist(d, pts[i]) <= doorR);
    if (turn >= turnDeg || atDoor) out.push(along / total);
  }
  return out;
}

/** Jordan's progress through the stops: the next stop's index, and whether Jordan waits at it. */
export interface EscortHold {
  next: number;
  holding: boolean;
}
/** One frame of the escort: Jordan at route fraction `e`, the player `gap` metres away. Jordan
    walks past a stop while the player is within `r`, and otherwise waits there until they are;
    `holdAt` is the fraction to keep Jordan at this frame, or null to let the move run. */
export function stepEscort(
  h: EscortHold,
  e: number,
  stops: readonly number[],
  gap: number,
  r = ESCORT_WAIT_R,
): { hold: EscortHold; holdAt: number | null } {
  let next = h.next;
  if (h.holding) {
    if (gap > r) return { hold: h, holdAt: stops[next] };
    next += 1;
  }
  while (next < stops.length && e >= stops[next]) {
    if (gap > r) return { hold: { next, holding: true }, holdAt: stops[next] };
    next += 1;
  }
  return { hold: { next, holding: false }, holdAt: null };
}

/** Whether to show "Wait for Jordan": the player more than `r` from Jordan and nearer the end. */
export function escortAhead(
  gap: number,
  playerRemaining: number,
  jordanRemaining: number,
  r = ESCORT_AHEAD_R,
): boolean {
  return gap > r && playerRemaining < jordanRemaining;
}

/** Where to draw the marker for a stop projected to normalised device coordinates (x right, y up,
    -1..1) or behind the camera: on screen at its point, otherwise an arrow on the screen edge
    pointing the way to turn. x and y are screen fractions (0..1, y down); angle is the arrow's
    direction in degrees on screen (0 right, 90 down). */
export function edgeArrow(
  ndcX: number,
  ndcY: number,
  behind: boolean,
  margin = 0.05,
): { onScreen: boolean; x: number; y: number; angle: number } {
  let x = behind ? -ndcX : ndcX,
    y = behind ? -ndcY : ndcY;
  if (!behind && Math.abs(x) <= 1 && Math.abs(y) <= 1)
    return { onScreen: true, x: (x + 1) / 2, y: (1 - y) / 2, angle: 0 };
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) y = -1; // straight behind: turn around
  const k = (1 - margin) / Math.max(Math.abs(x), Math.abs(y));
  x *= k;
  y *= k;
  return {
    onScreen: false,
    x: (x + 1) / 2,
    y: (1 - y) / 2,
    angle: (Math.atan2(-y, x) * 180) / Math.PI,
  };
}

/** A walking distance as the tracker and the marker show it. */
export function formatDistance(m: number): string {
  return `${Math.max(0, Math.round(m))} m`;
}
```

- [ ] **3a-1.4: Run it (expected PASS):** the same command: `Test Files  1 passed (1)`, `Tests  24 passed (24)`. Then the folder: `pnpm exec vitest run --project server arcade-src/sim-hub/src`: `Test Files  5 passed (5)`, `Tests  101 passed (101)` (on today's `main`: 4 files, 77 tests, plus this one).
- [ ] **3a-1.5: Checks.** `pnpm exec prettier --write arcade-src/sim-hub/src/tutorial-math.ts arcade-src/sim-hub/src/tutorial-math.spec.ts && pnpm exec eslint arcade-src/sim-hub/src/tutorial-math.ts arcade-src/sim-hub/src/tutorial-math.spec.ts` (expected: no output, exit 0; prettier changes nothing). `pnpm check` (exit 0).
- [ ] **3a-1.6: Commit** (from the worktree root `$WT/tutorial-core`):

```bash
git add apps/web/arcade-src/sim-hub/src/tutorial-math.ts apps/web/arcade-src/sim-hub/src/tutorial-math.spec.ts
git commit -m "feat(sim-hub): tutorial math (route distance, marker stops, hint timers, escort holds)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3a-2: `tutorial-steps.ts`, Chapter 1 as data (worktree `tutorial-core`, after 3a-1)

The exact text the player reads is in this file; the owner reads it here before it is built.

**Files:**

- Create: `apps/web/arcade-src/sim-hub/src/tutorial-steps.ts`
- Create: `apps/web/arcade-src/sim-hub/src/tutorial-steps.spec.ts`

**Interfaces.** Consumes: `type Pt` (3a-1). Produces: `Role`, `RoleInfo`, `ROLES`, `WORLD`, `TUTORIAL_TIMING`, `TargetId`, `TargetSpec`, `Target`, `Trigger`, `StepAction`, `ExchangeLine`, `DecisionOption`, `Decision`, `Step`, `WAIT_FOR_JORDAN`, `eHintText(name)`, `LINES`, `CHAPTER_1` (all as written below).

**Chapter 1 at a glance** (the file is the source):

| #   | Role   | Objective                                 | Target · trigger                         | Decision (correct answer)                                 | Actions                                       |
| --- | ------ | ----------------------------------------- | ---------------------------------------- | --------------------------------------------------------- | --------------------------------------------- |
| 1   | Jordan | Go inside and check in at reception.      | Maya Brooks · E                          | check-in exchange                                         |                                               |
| 2   | Jordan | Take a seat in the waiting area.          | the empty chair · E, then 6 s            |                                                           | pickChair; sitPlayer, intercomToControl       |
| 3   | Morgan | Check today's schedule.                   | console · E                              | Ellis, Jordan · born March 14, 1968 · Vault 1 · 9:00      |                                               |
| 4   | Morgan | Go to reception and call Jordan.          | Jordan · E                               | Full name and date of birth                               | jordanConfirms                                |
| 5   | Morgan | Walk Jordan to Vault 1.                   | Jordan reaches the couch side            |                                                           | escortToVault                                 |
| 6   | Morgan | Set Jordan up on the treatment couch.     | couch · E                                | head first, supine, both indexed supports, recorded index | jordanOnCouch, lasersOn, jamieAcrossCouch     |
| 7   | Morgan | Leave the vault before treatment.         | in LINAC Control (Jamie out too)         |                                                           | jamieToControl; holdVaultClosed               |
| 8   | Morgan | Take the check images.                    | console · E                              | Apply the couch shift, then check the match again         | shiftApplied                                  |
| 9   | Morgan | Deliver today's treatment.                | console · E, then 10 s "Beam on · {s} s" |                                                           | beamOn; beamOff                               |
| 10  | Morgan | Go back in and help Jordan off the couch. | couch · E                                |                                                           | releaseVaultDoor, jamieBackIn; jordanOffCouch |
| 11  | Morgan | Walk Jordan back to reception.            | Jordan reaches the lobby desk            |                                                           | escortToLobby; jordanThanks                   |

Feedback shown in the dialog: a miss → `Not yet. {hint 1}`, then `Not yet. {hint 2}`; the third miss → `{reveal} {reason}`; a right answer → `Correct. {reason}`. The E-step hint: `Walk up to {name} and press E when the prompt appears.`; the escort hint: `Wait for Jordan`.

- [ ] **3a-2.1: Write the failing test** `tutorial-steps.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CHAPTER_1, LINES, ROLES, WORLD, eHintText } from "./tutorial-steps";
import type { StepAction } from "./tutorial-steps";

const ACTIONS: StepAction[] = [
  "pickChair",
  "sitPlayer",
  "intercomToControl",
  "jordanConfirms",
  "escortToVault",
  "jordanOnCouch",
  "lasersOn",
  "jamieAcrossCouch",
  "jamieToControl",
  "holdVaultClosed",
  "shiftApplied",
  "beamOn",
  "beamOff",
  "releaseVaultDoor",
  "jamieBackIn",
  "jordanOffCouch",
  "escortToLobby",
  "jordanThanks",
];

// every string in Chapter 1 that a player reads
function texts(): string[] {
  const out: string[] = [eHintText("Jordan"), ...Object.values(LINES)];
  for (const s of CHAPTER_1) {
    out.push(s.objective, s.target.place, s.target.name, ...s.hints);
    if (s.target.label) out.push(s.target.label);
    if (s.countdown) out.push(s.countdown);
    for (const l of s.exchange ?? []) out.push(l.who, l.text);
    const d = s.decision;
    if (d) {
      out.push(d.title, d.prompt, ...d.hints, d.reveal, d.reason);
      for (const o of d.options) out.push(o.text);
      for (const [k, v] of d.context ?? []) out.push(k, v);
    }
  }
  return out;
}

describe("Chapter 1 steps", () => {
  it("has 11 steps, numbered in order", () => {
    expect(CHAPTER_1.map((s) => s.n)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  it("is played as Jordan for steps 1-2, then as Morgan Reed", () => {
    expect(CHAPTER_1.map((s) => s.role)).toEqual([
      "patient",
      "patient",
      ...Array(9).fill("therapist"),
    ]);
    expect(ROLES.patient.name).toBe("Jordan Ellis");
    expect(ROLES.therapist.name).toBe("Morgan Reed");
  });

  it("gives every step an objective, a target and two walking hints", () => {
    for (const s of CHAPTER_1) {
      expect(s.objective, `step ${s.n}`).toMatch(/\S.*\.$/);
      expect(s.target.place.length, `step ${s.n}`).toBeGreaterThan(0);
      expect(s.target.name.length, `step ${s.n}`).toBeGreaterThan(0);
      expect(s.target.roomId.length, `step ${s.n}`).toBeGreaterThan(0);
      expect(s.hints, `step ${s.n}`).toHaveLength(2);
      for (const h of s.hints)
        expect(h.length, `step ${s.n}`).toBeGreaterThan(10);
      expect(s.hints[0], `step ${s.n}`).not.toBe(s.hints[1]);
    }
  });

  it("matches each trigger to its kind of target", () => {
    for (const s of CHAPTER_1) {
      if (s.trigger === "pressE") {
        expect(s.target.label, `step ${s.n}`).toBeTruthy();
        expect(["actor", "seat", "segment"]).toContain(s.target.spec.kind);
      }
      if (s.trigger === "enterRoom")
        expect(s.target.spec.kind, `step ${s.n}`).toBe("room");
      if (s.trigger === "escortArrived")
        expect(s.target.spec.kind, `step ${s.n}`).toBe("escort");
    }
    expect(
      CHAPTER_1.filter((s) => s.trigger === "escortArrived").map((s) => s.n),
    ).toEqual([5, 11]);
  });

  it("has the decisions at steps 3, 4, 6 and 8", () => {
    expect(CHAPTER_1.filter((s) => s.decision).map((s) => s.n)).toEqual([
      3, 4, 6, 8,
    ]);
  });

  it("gives every decision exactly one correct answer and three feedback lines", () => {
    for (const s of CHAPTER_1) {
      const d = s.decision;
      if (!d) continue;
      expect(
        d.options.filter((o) => o.correct),
        `step ${s.n}`,
      ).toHaveLength(1);
      expect(new Set(d.options.map((o) => o.id)).size, `step ${s.n}`).toBe(
        d.options.length,
      );
      expect(d.options.length, `step ${s.n}`).toBeGreaterThanOrEqual(2);
      const lines = [...d.hints, d.reveal];
      expect(lines, `step ${s.n}`).toHaveLength(3);
      for (const l of [...lines, d.reason])
        expect(l.length, `step ${s.n}`).toBeGreaterThan(10);
    }
  });

  it("does not put the correct answer in the same place in every decision", () => {
    const at = CHAPTER_1.filter((s) => s.decision).map((s) =>
      s.decision!.options.findIndex((o) => o.correct),
    );
    expect(new Set(at).size).toBeGreaterThan(1);
  });

  it("tells Jordan’s identity at check-in, which the schedule answer then matches", () => {
    const said = (CHAPTER_1[0].exchange ?? []).map((l) => l.text).join(" ");
    expect(said).toContain("Jordan Ellis");
    expect(said).toContain("March 14, 1968");
    expect(said).toContain("Vault 1");
    const right = CHAPTER_1[2].decision!.options.find((o) => o.correct)!.text;
    expect(right).toContain("March 14, 1968");
    expect(right).toContain("Vault 1");
    expect(CHAPTER_1[3].decision!.options.find((o) => o.correct)!.text).toBe(
      "Full name and date of birth",
    );
    expect(CHAPTER_1[7].decision!.options.find((o) => o.correct)!.text).toMatch(
      /^Apply the/,
    );
  });

  it("waits 6 s after sitting down and counts down 10 s of beam", () => {
    expect(CHAPTER_1[1].afterSeconds).toBe(6);
    expect(CHAPTER_1[8].afterSeconds).toBe(10);
    expect(CHAPTER_1[8].countdown).toContain("{s}");
    for (const s of CHAPTER_1)
      if (s.afterSeconds) expect(s.trigger, `step ${s.n}`).toBe("pressE");
  });

  it("uses only the actions tutorial.ts performs", () => {
    for (const s of CHAPTER_1)
      for (const a of [
        ...(s.onStart ?? []),
        ...(s.onTrigger ?? []),
        ...(s.onComplete ?? []),
      ])
        expect(ACTIONS, `step ${s.n}`).toContain(a);
  });

  it("names people by name or they/them, never he or she", () => {
    for (const t of texts())
      expect(t).not.toMatch(/\b(he|him|his|she|her|hers)\b/i);
  });

  it("ends the escorts on the journey’s own finals", () => {
    expect(CHAPTER_1[4].target.spec).toEqual({
      kind: "escort",
      final: WORLD.couchSide,
    });
    expect(WORLD.couchSide).toEqual([76.7, -15.25]);
    expect(WORLD.changingArea).toEqual([69.0, -14.15]);
    expect(CHAPTER_1[10].target.spec).toEqual({
      kind: "escort",
      final: WORLD.lobbyDesk,
    });
    expect(WORLD.lobbyDesk).toEqual(WORLD.checkIn);
  });
});
```

- [ ] **3a-2.2: Run it (expected FAIL):** `pnpm exec vitest run --project server arcade-src/sim-hub/src/tutorial-steps.spec.ts`: import error for `./tutorial-steps`, `Test Files  1 failed (1)`.
- [ ] **3a-2.3: Write `tutorial-steps.ts`:**

```ts
/* Chapter 1 of the sim-hub tutorial, Jordan's treatment day (docs/specs/2026-11-11-sim-hub-menu-
   tutorial-design.md, PR 3), as data: each step's role, objective, target, completion trigger,
   walking hints, check-in exchange or decision, and the world actions tutorial.ts runs when the
   step starts, is triggered and completes. The decision wording and the reasons come from the
   staff and journey text (interact.ts STAFF_GUIDES, journey.ts JOURNEY_META and the journey's
   lines). Plain data, so its spec runs without the scene. Positions are world [x, z] in metres;
   the escort and Jamie's finals are the journey's own (journey.ts), so their routes are the ones
   the NPC check walks. */
import type { Pt } from "./tutorial-math";

export type Role = "patient" | "therapist";
export interface RoleInfo {
  name: string;
  role: string;
  initials: string;
}
export const ROLES: Record<Role, RoleInfo> = {
  patient: { name: "Jordan Ellis", role: "Patient", initials: "JE" },
  therapist: {
    name: "Morgan Reed",
    role: "Radiation Therapist",
    initials: "MR",
  },
};

/** World points the wiring uses (tutorial.ts). */
export const WORLD = {
  /** Outside the main entrance (z > plazaZ, |x| < plazaHalfX) the marker leads in through it. */
  plazaZ: 10.25,
  plazaHalfX: 30,
  entranceOut: [1.2, 11.6] as Pt,
  entranceIn: [0.6, 8.4] as Pt,
  /** The check-in spot in front of Maya Brooks (journey.ts startTreatmentJourney). */
  checkIn: [-4.5, -2.05] as Pt,
  /** Where the player stands at the start of step 3: Morgan Reed's spot at the console, facing it
	    (journey.ts resetTreatmentJourney; yaw as walk.ts reads it, the look along -x). */
  therapistStart: { x: 46.06, z: 10.6, yaw: Math.PI / 2, pitch: -0.12 },
  /** The console desk's front edge (rooms.ts linaccontrol: desk at room.x - 6.29, 1.25 deep,
	    6.0 long) and where to stand at it. */
  console: {
    a: [45.4, 6.2] as Pt,
    b: [45.4, 11.8] as Pt,
    stand: [46.1, 9.0] as Pt,
  },
  /** The vault 1 couch's near (+z) side, just in front of its side control panel (props.ts
	    couchSideControlPanel, at z -17.22), and where to stand beside it. */
  couch: {
    a: [76.2, -17.1] as Pt,
    b: [79.6, -17.1] as Pt,
    stand: [77.4, -16.4] as Pt,
  },
  /** Jordan's escort to Vault 1: the changing area, then the couch side (journey.ts
	    beginJordanEscortToVault). */
  changingArea: [69.0, -14.15] as Pt,
  couchSide: [76.7, -15.25] as Pt,
  /** Where Jordan stands after sitting up (journey.ts, the 'returning' stage). */
  offCouch: [77.0, -15.25] as Pt,
  /** The lobby desk, where the walk back ends (the check-in spot). */
  lobbyDesk: [-4.5, -2.05] as Pt,
  /** Jamie Williams across the couch: on the line from the vault graph's node off the couch's -x
	    end (room-routes.ts vault1 node 6) to Elena Torres's place. */
  jamieAcross: [76.3, -20.0] as Pt,
  /** Jamie at the console, and back in the vault (journey.ts, the vault therapist's finals). */
  jamieControl: [45.56, 8.6] as Pt,
  jamieBack: [76.3, -16.0] as Pt,
  /** The eye above the seat top when seated: standing eye 1.87 - hip 1.06 + hip to pelvis 0.06. */
  seatedEyeAboveSeat: 0.87,
  escortSpeed: 1.52,
};

export const TUTORIAL_TIMING = { roleFadeMs: 600, roleCardMs: 2500 };

export type TargetId =
  | "maya"
  | "chair"
  | "console"
  | "jordan"
  | "couch"
  | "linaccontrol"
  | "vault1"
  | "reception";

export type TargetSpec =
  | { kind: "actor"; actor: "maya" | "jordan"; stand?: Pt }
  | { kind: "seat" }
  | { kind: "segment"; a: Pt; b: Pt; stand: Pt }
  | { kind: "room"; roomId: string }
  | { kind: "escort"; final: Pt };

export interface Target {
  id: TargetId;
  /** The room the target is in (the marker route's destination room). */
  roomId: string;
  /** Where the objective is, on the marker. */
  place: string;
  /** The target in the E hint: "Walk up to {name} and press E when the prompt appears." */
  name: string;
  /** The E prompt's text (press-E steps). */
  label?: string;
  spec: TargetSpec;
}

export type Trigger = "pressE" | "enterRoom" | "escortArrived";

export type StepAction =
  | "pickChair"
  | "sitPlayer"
  | "intercomToControl"
  | "jordanConfirms"
  | "escortToVault"
  | "jordanOnCouch"
  | "lasersOn"
  | "jamieAcrossCouch"
  | "jamieToControl"
  | "holdVaultClosed"
  | "shiftApplied"
  | "beamOn"
  | "beamOff"
  | "releaseVaultDoor"
  | "jamieBackIn"
  | "jordanOffCouch"
  | "escortToLobby"
  | "jordanThanks";

export interface ExchangeLine {
  who: string;
  text: string;
}

export interface DecisionOption {
  id: string;
  text: string;
  correct?: true;
}
export interface Decision {
  title: string;
  prompt: string;
  /** Rows shown above the options (a record the answer is read from). */
  context?: readonly (readonly [string, string])[];
  options: readonly DecisionOption[];
  /** After the first and the second miss. */
  hints: readonly [string, string];
  /** Shown at the third miss, with the reason. */
  reveal: string;
  /** One line: why the answer is right (also shown when it is picked). */
  reason: string;
}

export interface Step {
  n: number;
  role: Role;
  objective: string;
  target: Target;
  trigger: Trigger;
  /** Walking hints after 60 s and 120 s without progress. */
  hints: readonly [string, string];
  /** Opened by E (step 1); Continue triggers the step. */
  exchange?: readonly ExchangeLine[];
  /** Opened by E; Continue after the answer triggers the step. */
  decision?: Decision;
  /** After the trigger, the step completes this many seconds later. */
  afterSeconds?: number;
  /** The hint line while afterSeconds runs; {s} is the whole seconds left. */
  countdown?: string;
  onStart?: readonly StepAction[];
  onTrigger?: readonly StepAction[];
  onComplete?: readonly StepAction[];
}

export const WAIT_FOR_JORDAN = "Wait for Jordan";
export const eHintText = (name: string): string =>
  `Walk up to ${name} and press E when the prompt appears.`;

/** World lines the actions say (tutorial.ts). */
export const LINES = {
  intercomToControl:
    "Treatment Control, Jordan Ellis is checked in for 9:00 in Vault 1 and waiting in reception.",
  controlAlert:
    "Jordan Ellis just checked in. The chart is open and Vault 1 is ready for setup.",
  jordanConfirms: "Jordan Ellis, March 14, 1968. I’m ready to go back.",
  jordanChanged: "I’m changed and ready to continue.",
  jamieSetup:
    "You’re in position. I’m checking the support placement, couch index, and your alignment before we take the check images.",
  jamieLeaving:
    "Stay still, Jordan. We’ll talk to you over the intercom before treatment begins.",
  shiftVerified: "Correction verified against the treatment record.",
  jordanOffCouch: "Thank you. I’ve changed and I’m ready to go.",
  jordanThanks: "That went smoothly. See you tomorrow.",
};

const CONSOLE_HINTS: readonly [string, string] = [
  "The treatment console is the long desk of screens against the wall of LINAC Control.",
  "Stand at the console desk, in front of the screens, and press E.",
];
const CONSOLE_SPEC: TargetSpec = { kind: "segment", ...WORLD.console };
const COUCH_SPEC: TargetSpec = { kind: "segment", ...WORLD.couch };

export const CHAPTER_1: readonly Step[] = [
  {
    n: 1,
    role: "patient",
    objective: "Go inside and check in at reception.",
    target: {
      id: "maya",
      roomId: "lobby",
      place: "Reception",
      name: "Maya Brooks",
      label: "Check in with Maya Brooks",
      spec: { kind: "actor", actor: "maya", stand: WORLD.checkIn },
    },
    trigger: "pressE",
    hints: [
      "Reception is just inside the main doors, on your left as you walk in.",
      "Walk through the glass doors and turn left to the front desk, where Maya Brooks stands.",
    ],
    exchange: [
      {
        who: "Maya Brooks",
        text: "Good morning. Can I have your full name and date of birth, please?",
      },
      {
        who: "You",
        text: "Jordan Ellis, March 14, 1968. I’m here for my scheduled treatment.",
      },
      {
        who: "Maya Brooks",
        text: "Thank you, Jordan. I have you on today’s schedule in Vault 1 at 9:00. I’ll mark you arrived so the treatment team knows you’re here. Please have a seat in the waiting area.",
      },
    ],
  },
  {
    n: 2,
    role: "patient",
    objective: "Take a seat in the waiting area.",
    target: {
      id: "chair",
      roomId: "lobby",
      place: "Waiting area",
      name: "the empty chair",
      label: "Sit down",
      spec: { kind: "seat" },
    },
    trigger: "pressE",
    hints: [
      "The waiting chairs face the front desk, across the lobby from it.",
      "The marker is on an empty chair in the waiting area. Walk up to it and press E to sit down.",
    ],
    afterSeconds: 6,
    onStart: ["pickChair"],
    onTrigger: ["sitPlayer", "intercomToControl"],
  },
  {
    n: 3,
    role: "therapist",
    objective: "Check today’s schedule.",
    target: {
      id: "console",
      roomId: "linaccontrol",
      place: "Treatment console",
      name: "the treatment console",
      label: "Open today’s schedule",
      spec: CONSOLE_SPEC,
    },
    trigger: "pressE",
    hints: CONSOLE_HINTS,
    decision: {
      title: "Today’s schedule",
      prompt:
        "Treatment Control has the alert: Jordan Ellis is checked in. Three entries on today’s schedule are for an Ellis. Which one is Jordan’s?",
      options: [
        {
          id: "a",
          text: "Ellis, Jordan · born October 2, 1985 · Vault 1 · 9:40",
        },
        {
          id: "b",
          text: "Ellis, Jordan · born March 14, 1968 · Vault 1 · 9:00",
          correct: true,
        },
        { id: "c", text: "Ellis, Jody · born March 14, 1968 · Vault 2 · 9:00" },
      ],
      hints: [
        "Two entries share Jordan’s name. Check the date of birth Jordan gave at check-in.",
        "Jordan was born on March 14, 1968, and is booked on Vault 1.",
      ],
      reveal:
        "Jordan’s entry is Ellis, Jordan · born March 14, 1968 · Vault 1 · 9:00.",
      reason:
        "A full name and date of birth together identify the patient, and the booking has to be on the machine where the plan is loaded.",
    },
  },
  {
    n: 4,
    role: "therapist",
    objective: "Go to reception and call Jordan.",
    target: {
      id: "jordan",
      roomId: "lobby",
      place: "Waiting area",
      name: "Jordan",
      label: "Call Jordan",
      spec: { kind: "actor", actor: "jordan" },
    },
    trigger: "pressE",
    hints: [
      "Follow the MAIN LOBBY signs back to reception. Jordan is in the waiting area.",
      "Jordan is sitting in the chair you used. Walk up to Jordan and press E.",
    ],
    decision: {
      title: "Confirm the patient",
      prompt:
        "Before you take Jordan back, you confirm you have the right patient. Which two things confirm Jordan’s identity?",
      options: [
        { id: "a", text: "Full name and the chair Jordan is sitting in" },
        { id: "b", text: "Date of birth and today’s appointment time" },
        { id: "c", text: "Full name and date of birth", correct: true },
        { id: "d", text: "A yes when you ask, “Are you Jordan Ellis?”" },
      ],
      hints: [
        "An identifier belongs to the patient, not to where they sit or when they are booked.",
        "Ask Jordan to tell you the same two things you matched on the schedule.",
      ],
      reveal: "Full name and date of birth.",
      reason:
        "Two identifiers that Jordan states, matched to the record, confirm the right patient; a seat, a time or a yes to a leading question can be wrong.",
    },
    onTrigger: ["jordanConfirms"],
  },
  {
    n: 5,
    role: "therapist",
    objective: "Walk Jordan to Vault 1.",
    target: {
      id: "vault1",
      roomId: "vault1",
      place: "Vault 1",
      name: "Vault 1",
      spec: { kind: "escort", final: WORLD.couchSide },
    },
    trigger: "escortArrived",
    hints: [
      "Jordan waits at each door and corner until you are within 5 m. Stay close.",
      "Follow the TREATMENT AREA signs, then the VAULT 1 sign at the end of the walkway.",
    ],
    onStart: ["escortToVault"],
  },
  {
    n: 6,
    role: "therapist",
    objective: "Set Jordan up on the treatment couch.",
    target: {
      id: "couch",
      roomId: "vault1",
      place: "Treatment couch",
      name: "the treatment couch",
      label: "Set Jordan up on the couch",
      spec: COUCH_SPEC,
    },
    trigger: "pressE",
    hints: [
      "The couch is in the middle of Vault 1, under the treatment machine.",
      "Stand beside the couch, next to Jordan, and press E.",
    ],
    decision: {
      title: "Jordan’s simulation record",
      prompt:
        "Jordan’s setup was documented at CT simulation. Which setup reproduces it?",
      context: [
        ["Position", "Head first, supine"],
        ["Head", "Indexed head support"],
        ["Knees", "Indexed knee support"],
        ["Couch", "Index recorded at CT simulation"],
      ],
      options: [
        {
          id: "a",
          text: "Feet first, supine · indexed head support and knee support · the recorded couch index",
        },
        {
          id: "b",
          text: "Head first, supine · indexed head support, no knee support · the recorded couch index",
        },
        {
          id: "c",
          text: "Head first, supine · indexed head support and knee support · the recorded couch index",
          correct: true,
        },
      ],
      hints: [
        "Compare each part with the record: position, head support, knee support and couch index.",
        "The record says head first, with both indexed supports.",
      ],
      reveal:
        "Head first, supine, with the indexed head and knee supports at the recorded couch index.",
      reason:
        "Each day’s setup reproduces the position, supports and indexing documented at CT simulation, so Jordan lies where the plan expects.",
    },
    onTrigger: ["jordanOnCouch", "lasersOn", "jamieAcrossCouch"],
  },
  {
    n: 7,
    role: "therapist",
    objective: "Leave the vault before treatment.",
    target: {
      id: "linaccontrol",
      roomId: "linaccontrol",
      place: "LINAC Control",
      name: "LINAC Control",
      spec: { kind: "room", roomId: "linaccontrol" },
    },
    trigger: "enterRoom",
    hints: [
      "Jordan stays alone in the vault during treatment. Walk back out through the maze to LINAC Control.",
      "Follow the walkway back to the main corridor; LINAC Control’s door is by the TREATMENT AREA sign.",
    ],
    onStart: ["jamieToControl"],
    onComplete: ["holdVaultClosed"],
  },
  {
    n: 8,
    role: "therapist",
    objective: "Take the check images.",
    target: {
      id: "console",
      roomId: "linaccontrol",
      place: "Treatment console",
      name: "the treatment console",
      label: "Take the check images",
      spec: CONSOLE_SPEC,
    },
    trigger: "pressE",
    hints: CONSOLE_HINTS,
    decision: {
      title: "Today’s check images",
      prompt:
        "Today’s images are matched to the planning reference. They show Jordan 4 mm from the planned position. What do you do before treatment?",
      options: [
        { id: "a", text: "Treat as is: 4 mm is a small shift" },
        {
          id: "b",
          text: "Apply the couch shift, then check the match again",
          correct: true,
        },
      ],
      hints: [
        "The images are taken to find exactly this kind of difference before the beam is on.",
        "A shift measured on today’s images is corrected with the couch before any treatment.",
      ],
      reveal: "Apply the couch shift first, then check the match again.",
      reason:
        "Image guidance checks that Jordan is in the planned treatment position before radiation is delivered; a measured shift is corrected, then verified.",
    },
    onTrigger: ["shiftApplied"],
  },
  {
    n: 9,
    role: "therapist",
    objective: "Deliver today’s treatment.",
    target: {
      id: "console",
      roomId: "linaccontrol",
      place: "Treatment console",
      name: "the treatment console",
      label: "Start the treatment",
      spec: CONSOLE_SPEC,
    },
    trigger: "pressE",
    hints: CONSOLE_HINTS,
    afterSeconds: 10,
    countdown: "Beam on · {s} s",
    onTrigger: ["beamOn"],
    onComplete: ["beamOff"],
  },
  {
    n: 10,
    role: "therapist",
    objective: "Go back in and help Jordan off the couch.",
    target: {
      id: "couch",
      roomId: "vault1",
      place: "Vault 1",
      name: "Jordan",
      label: "Help Jordan off the couch",
      spec: COUCH_SPEC,
    },
    trigger: "pressE",
    hints: [
      "The vault door opens as you walk up to it. Jordan is still on the couch.",
      "Walk back down the walkway into Vault 1, stand beside the couch and press E.",
    ],
    onStart: ["releaseVaultDoor", "jamieBackIn"],
    onTrigger: ["jordanOffCouch"],
  },
  {
    n: 11,
    role: "therapist",
    objective: "Walk Jordan back to reception.",
    target: {
      id: "reception",
      roomId: "lobby",
      place: "Reception",
      name: "reception",
      spec: { kind: "escort", final: WORLD.lobbyDesk },
    },
    trigger: "escortArrived",
    hints: [
      "Jordan waits at each door and corner until you are within 5 m. Stay close.",
      "Follow the MAIN LOBBY signs back to reception.",
    ],
    onStart: ["escortToLobby"],
    onComplete: ["jordanThanks"],
  },
];
```

- [ ] **3a-2.4: Run it (expected PASS):** `Test Files  1 passed (1)`, `Tests  12 passed (12)`. Folder: `Test Files  6 passed (6)`, `Tests  113 passed (113)`.
- [ ] **3a-2.5: Checks.** prettier `--write` and eslint on the two files (no output); `pnpm check` (exit 0).
- [ ] **3a-2.6: Commit:**

```bash
git add apps/web/arcade-src/sim-hub/src/tutorial-steps.ts apps/web/arcade-src/sim-hub/src/tutorial-steps.spec.ts
git commit -m "feat(sim-hub): tutorial chapter 1 steps, decisions and hints as data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3a-3: `tutorial-machine.ts`, the step machine (worktree `tutorial-core`, after 3a-2)

**Files:**

- Create: `apps/web/arcade-src/sim-hub/src/tutorial-machine.ts`
- Create: `apps/web/arcade-src/sim-hub/src/tutorial-machine.spec.ts`

**Interfaces.** Consumes: `CHAPTER_1`, `WAIT_FOR_JORDAN`, `eHintText`, `Role`, `Step`, `StepAction`, `TargetId` (3a-2); `eHintDue`, `missFeedback`, `newStuckTimer`, `stepNear`, `stepStuck`, `stuckLevel`, `FeedbackKind`, `StuckTimer` (3a-1). Produces (exact):

```ts
export type Phase =
  "off" | "active" | "dialog" | "waiting" | "roleChange" | "done";
export interface TutorialState {
  phase: Phase;
  step: number;
  misses: number;
  resolved: boolean;
  wait: number;
  stuck: StuckTimer;
  near: number;
  hintLevel: 0 | 1 | 2;
  eHint: boolean;
  hint: string | null;
}
export type TutorialEvent =
  | { type: "start" }
  | { type: "stop" }
  | { type: "tick"; dt: number; distance: number; escortAhead?: boolean }
  | { type: "pressedE"; target: TargetId }
  | { type: "reachedTarget" }
  | { type: "answered"; option: string }
  | { type: "continue" }
  | { type: "closeDialog" }
  | { type: "roleChangeDone" };
export type Effect =
  | { type: "showStep"; step: number }
  | { type: "action"; action: StepAction }
  | { type: "openDialog"; step: number }
  | { type: "feedback"; kind: FeedbackKind; text: string }
  | { type: "closeDialog" }
  | { type: "hint"; text: string | null }
  | { type: "roleChange"; role: Role }
  | { type: "complete" };
export const OFF: TutorialState;
export function progressOf(s: TutorialState, total?: number): number;
export function reduceTutorial(
  s: TutorialState,
  ev: TutorialEvent,
  steps?: readonly Step[],
): { state: TutorialState; effects: Effect[] };
```

Rules (what the spec below pins down):

- **`start`:** step 1, `active`.
- **E steps:** `pressedE` with the step's target opens its dialog (exchange or decision); with neither, the step is triggered at once.
- **`reachedTarget`:** triggers enterRoom and escort steps.
- **Triggering:** runs the step's `onTrigger` actions. With `afterSeconds` the step waits (`waiting`, ticks count down, `countdown` text in the hint line); otherwise it completes.
- **Completing:** runs `onComplete`, then enters the next step (`onStart`). If the role differs, it goes through `roleChange` first and waits for `roleChangeDone`.
- **Decisions:** answers give `Correct. …`, or `Not yet. …` twice, then `{reveal} {reason}` at the third miss. Continue then completes the step.
- **Esc (`closeDialog`):** closes an unanswered dialog and keeps its misses. On an answered decision it acts as Continue.
- **Ticks while `active`:**
  - Stuck timer: hint 1 at 60 s and hint 2 at 120 s without a 1 m drop; a hint shown stays for the step.
  - E steps: within 6 m for 20 s → the E hint, which also stays.
  - `escortAhead` → `Wait for Jordan`.
  - Precedence: escort > E hint > walking hint.

- [ ] **3a-3.1: Write the failing test** `tutorial-machine.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { OFF, progressOf, reduceTutorial } from "./tutorial-machine";
import type { Effect, TutorialEvent, TutorialState } from "./tutorial-machine";
import { CHAPTER_1, WAIT_FOR_JORDAN, eHintText } from "./tutorial-steps";

// Runs events from `s`, collecting every effect.
function run(s: TutorialState, ...events: TutorialEvent[]) {
  const effects: Effect[] = [];
  for (const ev of events) {
    const r = reduceTutorial(s, ev);
    s = r.state;
    effects.push(...r.effects);
  }
  return { s, effects };
}
// `seconds` of quarter-second frames at walking distance `distance`.
function ticks(
  seconds: number,
  distance: number,
  escortAhead = false,
): TutorialEvent[] {
  return Array.from({ length: seconds * 4 }, () => ({
    type: "tick" as const,
    dt: 0.25,
    distance,
    escortAhead,
  }));
}
const hints = (effects: Effect[]) =>
  effects
    .flatMap((e) => (e.type === "hint" ? [e.text] : []))
    .filter((t) => t !== null);
const actions = (effects: Effect[]) =>
  effects.flatMap((e) => (e.type === "action" ? [e.action] : []));
const atStep = (n: number): TutorialState => ({
  ...OFF,
  phase: "active",
  step: n,
});

describe("starting", () => {
  it("opens step 1 with no hint", () => {
    const { s, effects } = run(OFF, { type: "start" });
    expect(s.phase).toBe("active");
    expect(s.step).toBe(1);
    expect(effects).toEqual([
      { type: "showStep", step: 1 },
      { type: "hint", text: null },
    ]);
    expect(progressOf(s)).toBe(0);
  });

  it("stops", () => {
    expect(run(atStep(5), { type: "stop" }).s).toEqual(OFF);
  });
});

describe("E steps", () => {
  it("ignores E on any other target, then opens the check-in exchange", () => {
    let r = run(atStep(1), { type: "pressedE", target: "console" });
    expect(r.s).toEqual(atStep(1));
    expect(r.effects).toEqual([]);
    r = run(atStep(1), { type: "pressedE", target: "maya" });
    expect(r.s.phase).toBe("dialog");
    expect(r.effects).toEqual([{ type: "openDialog", step: 1 }]);
  });

  it("moves on to step 2 after the exchange, picking the chair", () => {
    const { s, effects } = run(
      atStep(1),
      { type: "pressedE", target: "maya" },
      { type: "continue" },
    );
    expect(s.step).toBe(2);
    expect(s.phase).toBe("active");
    expect(effects.slice(1)).toEqual([
      { type: "closeDialog" },
      { type: "showStep", step: 2 },
      { type: "hint", text: null },
      { type: "action", action: "pickChair" },
    ]);
  });

  it("sits the player down, waits 6 s, then changes the role", () => {
    let r = run(atStep(2), { type: "pressedE", target: "chair" });
    expect(actions(r.effects)).toEqual(["sitPlayer", "intercomToControl"]);
    expect(r.s.phase).toBe("waiting");
    r = run(r.s, ...ticks(5.75, 0));
    expect(r.s.phase).toBe("waiting");
    r = run(r.s, ...ticks(0.25, 0));
    expect(r.s.phase).toBe("roleChange");
    expect(r.s.step).toBe(3);
    expect(r.effects).toContainEqual({ type: "roleChange", role: "therapist" });
    expect(progressOf(r.s)).toBeCloseTo(2 / 11);
    r = run(r.s, { type: "roleChangeDone" });
    expect(r.s.phase).toBe("active");
    expect(r.effects[0]).toEqual({ type: "showStep", step: 3 });
  });

  it("counts the beam down for 10 s, then turns it off", () => {
    let r = run(atStep(9), { type: "pressedE", target: "console" });
    expect(actions(r.effects)).toEqual(["beamOn"]);
    expect(hints(r.effects)).toEqual(["Beam on · 10 s"]);
    r = run(r.s, ...ticks(1, 0));
    expect(hints(r.effects)).toEqual(["Beam on · 9 s"]);
    r = run(r.s, ...ticks(9, 0));
    expect(actions(r.effects)).toEqual([
      "beamOff",
      "releaseVaultDoor",
      "jamieBackIn",
    ]);
    expect(r.s.step).toBe(10);
  });
});

describe("decisions", () => {
  const open = run(atStep(3), { type: "pressedE", target: "console" }).s;
  const d = CHAPTER_1[2].decision!;

  it("gives a hint, a stronger hint, then the answer with its reason at the third miss", () => {
    const { s, effects } = run(
      open,
      { type: "answered", option: "a" },
      { type: "answered", option: "c" },
      { type: "answered", option: "a" },
    );
    expect(effects).toEqual([
      { type: "feedback", kind: "hint1", text: `Not yet. ${d.hints[0]}` },
      { type: "feedback", kind: "hint2", text: `Not yet. ${d.hints[1]}` },
      { type: "feedback", kind: "reveal", text: `${d.reveal} ${d.reason}` },
    ]);
    expect(s.resolved).toBe(true);
    const next = run(
      s,
      { type: "answered", option: "b" },
      { type: "continue" },
    );
    expect(next.effects[0]).toEqual({ type: "closeDialog" });
    expect(next.s.step).toBe(4);
  });

  it("accepts the right answer with its reason, and Continue completes the step", () => {
    const r = run(open, { type: "answered", option: "b" });
    expect(r.effects).toEqual([
      { type: "feedback", kind: "correct", text: `Correct. ${d.reason}` },
    ]);
    expect(run(r.s, { type: "continue" }).s.step).toBe(4);
  });

  it("ignores Continue before the decision is answered", () => {
    const r = run(
      open,
      { type: "answered", option: "a" },
      { type: "continue" },
    );
    expect(r.s.phase).toBe("dialog");
  });

  it("keeps the misses when the dialog is closed and opened again", () => {
    let r = run(
      open,
      { type: "answered", option: "a" },
      { type: "closeDialog" },
    );
    expect(r.s.phase).toBe("active");
    expect(r.effects.at(-1)).toEqual({ type: "closeDialog" });
    r = run(
      r.s,
      { type: "pressedE", target: "console" },
      { type: "answered", option: "c" },
    );
    expect(r.effects.at(-1)).toMatchObject({ type: "feedback", kind: "hint2" });
  });

  it("runs the step’s actions after the answer", () => {
    const r = run(
      run(atStep(6), { type: "pressedE", target: "couch" }).s,
      { type: "answered", option: "c" },
      { type: "continue" },
    );
    expect(actions(r.effects)).toEqual([
      "jordanOnCouch",
      "lasersOn",
      "jamieAcrossCouch",
      "jamieToControl",
    ]);
    expect(r.s.step).toBe(7);
  });
});

describe("walking steps", () => {
  it("completes on reaching the target, not on E", () => {
    expect(
      run(atStep(7), { type: "pressedE", target: "linaccontrol" }).s.step,
    ).toBe(7);
    const r = run(atStep(7), { type: "reachedTarget" });
    expect(actions(r.effects)).toEqual(["holdVaultClosed"]);
    expect(r.s.step).toBe(8);
  });

  it("shows hint 1 after 60 s and hint 2 after 120 s without progress, and keeps them", () => {
    const step = CHAPTER_1[6];
    let r = run(atStep(7), ...ticks(59.75, 30));
    expect(hints(r.effects)).toEqual([]);
    r = run(r.s, ...ticks(0.25, 30));
    expect(hints(r.effects)).toEqual([step.hints[0]]);
    // progress restarts the timer but the hint shown stays
    r = run(r.s, ...ticks(30, 20));
    expect(r.s.hint).toBe(step.hints[0]);
    r = run(r.s, ...ticks(120, 20));
    expect(hints(r.effects)).toEqual([step.hints[1]]);
  });

  it('says "Wait for Jordan" while the player is far ahead on an escort', () => {
    let r = run(atStep(5), ...ticks(1, 40, true));
    expect(r.s.hint).toBe(WAIT_FOR_JORDAN);
    r = run(r.s, ...ticks(1, 40, false));
    expect(r.effects.at(-1)).toEqual({ type: "hint", text: null });
  });

  it("completes an escort when Jordan arrives", () => {
    const r = run(atStep(5), { type: "reachedTarget" });
    expect(r.s.step).toBe(6);
  });
});

describe("the E-step hint", () => {
  it("shows after 20 s within 6 m without pressing E", () => {
    let r = run(atStep(1), ...ticks(19.75, 4));
    expect(r.s.hint).toBeNull();
    r = run(r.s, ...ticks(0.25, 4));
    expect(r.s.hint).toBe(eHintText("Maya Brooks"));
    expect(r.s.hint).toBe(
      "Walk up to Maya Brooks and press E when the prompt appears.",
    );
  });

  it("does not count time farther than 6 m away", () => {
    const r = run(atStep(1), ...ticks(30, 6.5));
    expect(r.s.hint).toBeNull();
  });
});

describe("the whole chapter", () => {
  // plays every step the way the run-through check does, answering each decision wrong three times
  function playThrough() {
    let s = OFF;
    const all: Effect[] = [];
    const go = (...events: TutorialEvent[]) => {
      const r = run(s, ...events);
      s = r.s;
      all.push(...r.effects);
    };
    go({ type: "start" });
    while (s.phase !== "done") {
      const step = CHAPTER_1[s.step - 1];
      if (s.phase === "roleChange") go({ type: "roleChangeDone" });
      else if (s.phase === "waiting") go(...ticks(1, 0));
      else if (step.trigger !== "pressE") go({ type: "reachedTarget" });
      else {
        go({ type: "pressedE", target: step.target.id });
        const wrong = step.decision?.options.find((o) => !o.correct);
        if (wrong)
          for (let i = 0; i < 3; i++)
            go({ type: "answered", option: wrong.id });
        if (s.phase === "dialog") go({ type: "continue" });
      }
    }
    return { s, all };
  }

  it("reaches the end card after all 11 steps", () => {
    const { s, all } = playThrough();
    expect(s.step).toBe(11);
    expect(progressOf(s)).toBe(1);
    expect(all.at(-1)).toEqual({ type: "complete" });
    expect(
      all
        .filter((e) => e.type === "showStep")
        .map((e) => (e as { step: number }).step),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(
      all.filter((e) => e.type === "feedback" && e.kind === "reveal"),
    ).toHaveLength(4);
  });

  it("runs every world action once, in order", () => {
    expect(actions(playThrough().all)).toEqual([
      "pickChair",
      "sitPlayer",
      "intercomToControl",
      "jordanConfirms",
      "escortToVault",
      "jordanOnCouch",
      "lasersOn",
      "jamieAcrossCouch",
      "jamieToControl",
      "holdVaultClosed",
      "shiftApplied",
      "beamOn",
      "beamOff",
      "releaseVaultDoor",
      "jamieBackIn",
      "jordanOffCouch",
      "escortToLobby",
      "jordanThanks",
    ]);
  });

  it("ignores events once done", () => {
    const { s } = playThrough();
    for (const ev of [
      { type: "pressedE", target: "reception" },
      { type: "reachedTarget" },
      { type: "continue" },
      ...ticks(1, 0),
    ] as TutorialEvent[])
      expect(run(s, ev)).toEqual({ s, effects: [] });
  });
});
```

- [ ] **3a-3.2: Run it (expected FAIL):** `pnpm exec vitest run --project server arcade-src/sim-hub/src/tutorial-machine.spec.ts`: import error for `./tutorial-machine`, `Test Files  1 failed (1)`.
- [ ] **3a-3.3: Write `tutorial-machine.ts`:**

```ts
/* The sim-hub tutorial's step machine (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3):
   a pure reducer over Chapter 1's steps (tutorial-steps.ts). Events in (start, a frame's tick with
   the walking distance, E on a target, reaching a target, an answer, Continue, closing the dialog,
   the role change finishing, stop); a new state and a list of effects out, which tutorial.ts
   performs (tracker, dialog, hint line, role change, world actions). It holds the hint timers and
   the decision miss counter, mirroring the CT console's validateTechnique: "Not yet." with a hint,
   a stronger hint, then the answer and its reason at the third miss. */
import { CHAPTER_1, WAIT_FOR_JORDAN, eHintText } from "./tutorial-steps";
import type { Role, Step, StepAction, TargetId } from "./tutorial-steps";
import {
  eHintDue,
  missFeedback,
  newStuckTimer,
  stepNear,
  stepStuck,
  stuckLevel,
} from "./tutorial-math";
import type { FeedbackKind, StuckTimer } from "./tutorial-math";

export type Phase =
  "off" | "active" | "dialog" | "waiting" | "roleChange" | "done";

export interface TutorialState {
  phase: Phase;
  /** The current step, 1-based (0 when off). */
  step: number;
  /** Wrong answers to the current step's decision. */
  misses: number;
  /** The decision was answered right, or its answer shown: Continue completes the step. */
  resolved: boolean;
  /** Seconds left of the step's afterSeconds ('waiting'). */
  wait: number;
  stuck: StuckTimer;
  /** Seconds within E_HINT_R of the target (press-E steps). */
  near: number;
  /** The walking hint reached this step (it never goes back down). */
  hintLevel: 0 | 1 | 2;
  /** The E-step hint is due (it stays for the step). */
  eHint: boolean;
  /** The hint line as last emitted. */
  hint: string | null;
}

export type TutorialEvent =
  | { type: "start" }
  | { type: "tick"; dt: number; distance: number; escortAhead?: boolean }
  | { type: "pressedE"; target: TargetId }
  | { type: "reachedTarget" }
  | { type: "answered"; option: string }
  | { type: "continue" }
  | { type: "closeDialog" }
  | { type: "roleChangeDone" }
  | { type: "stop" };

export type Effect =
  | { type: "showStep"; step: number }
  | { type: "action"; action: StepAction }
  | { type: "openDialog"; step: number }
  | { type: "feedback"; kind: FeedbackKind; text: string }
  | { type: "closeDialog" }
  | { type: "hint"; text: string | null }
  | { type: "roleChange"; role: Role }
  | { type: "complete" };

export const OFF: TutorialState = {
  phase: "off",
  step: 0,
  misses: 0,
  resolved: false,
  wait: 0,
  stuck: newStuckTimer(),
  near: 0,
  hintLevel: 0,
  eHint: false,
  hint: null,
};

function fresh(step: number, phase: Phase): TutorialState {
  return { ...OFF, phase, step, stuck: newStuckTimer() };
}

function countdownText(template: string, secondsLeft: number): string {
  return template.replace(
    "{s}",
    String(Math.max(0, Math.ceil(secondsLeft - 1e-9))),
  );
}

/** The share of the chapter done, for the tracker's bar: completed steps over all steps. */
export function progressOf(s: TutorialState, total = CHAPTER_1.length): number {
  if (s.phase === "done") return 1;
  if (s.phase === "off") return 0;
  return (s.step - 1) / total;
}

export function reduceTutorial(
  s: TutorialState,
  ev: TutorialEvent,
  steps: readonly Step[] = CHAPTER_1,
): { state: TutorialState; effects: Effect[] } {
  const fx: Effect[] = [];
  const out = (state: TutorialState) => ({ state, effects: fx });
  const cur: Step | undefined = steps[s.step - 1];
  const actions = (list?: readonly StepAction[]) => {
    for (const action of list ?? []) fx.push({ type: "action", action });
  };
  const enter = (n: number): TutorialState => {
    fx.push({ type: "showStep", step: n }, { type: "hint", text: null });
    actions(steps[n - 1].onStart);
    return fresh(n, "active");
  };
  const complete = (st: TutorialState): TutorialState => {
    actions(cur?.onComplete);
    if (st.step >= steps.length) {
      fx.push({ type: "hint", text: null }, { type: "complete" });
      return fresh(st.step, "done");
    }
    const next = steps[st.step];
    if (cur && next.role !== cur.role) {
      fx.push(
        { type: "hint", text: null },
        { type: "roleChange", role: next.role },
      );
      return fresh(st.step + 1, "roleChange");
    }
    return enter(st.step + 1);
  };
  const trigger = (st: TutorialState): TutorialState => {
    if (!cur) return st;
    actions(cur.onTrigger);
    if (cur.afterSeconds) {
      const hint = cur.countdown
        ? countdownText(cur.countdown, cur.afterSeconds)
        : null;
      if (hint !== st.hint) fx.push({ type: "hint", text: hint });
      return { ...st, phase: "waiting", wait: cur.afterSeconds, hint };
    }
    return complete(st);
  };

  switch (ev.type) {
    case "start":
      return out(enter(1));
    case "stop":
      return out(OFF);
    case "tick": {
      if (!cur) return out(s);
      if (s.phase === "waiting") {
        const wait = s.wait - ev.dt;
        if (wait <= 1e-9) return out(complete({ ...s, wait: 0 }));
        const hint = cur.countdown ? countdownText(cur.countdown, wait) : null;
        if (hint !== s.hint) fx.push({ type: "hint", text: hint });
        return out({ ...s, wait, hint });
      }
      if (s.phase !== "active") return out(s);
      const pressE = cur.trigger === "pressE",
        stuck = stepStuck(s.stuck, ev.dt, ev.distance),
        near = pressE ? stepNear(s.near, ev.dt, ev.distance) : 0,
        hintLevel = Math.max(s.hintLevel, stuckLevel(stuck.idle)) as 0 | 1 | 2,
        eHint = s.eHint || (pressE && eHintDue(near));
      const hint = ev.escortAhead
        ? WAIT_FOR_JORDAN
        : eHint
          ? eHintText(cur.target.name)
          : hintLevel
            ? cur.hints[hintLevel - 1]
            : null;
      if (hint !== s.hint) fx.push({ type: "hint", text: hint });
      return out({ ...s, stuck, near, hintLevel, eHint, hint });
    }
    case "pressedE": {
      if (
        !cur ||
        s.phase !== "active" ||
        cur.trigger !== "pressE" ||
        ev.target !== cur.target.id
      )
        return out(s);
      if (cur.decision || cur.exchange) {
        fx.push({ type: "openDialog", step: s.step });
        return out({ ...s, phase: "dialog", resolved: false });
      }
      return out(trigger(s));
    }
    case "reachedTarget": {
      if (!cur || s.phase !== "active" || cur.trigger === "pressE")
        return out(s);
      return out(trigger(s));
    }
    case "answered": {
      const d = cur?.decision;
      if (!d || s.phase !== "dialog" || s.resolved) return out(s);
      const opt = d.options.find((o) => o.id === ev.option);
      if (!opt) return out(s);
      if (opt.correct) {
        fx.push({
          type: "feedback",
          kind: "correct",
          text: `Correct. ${d.reason}`,
        });
        return out({ ...s, resolved: true });
      }
      const misses = s.misses + 1,
        kind = missFeedback(misses),
        text =
          kind === "reveal"
            ? `${d.reveal} ${d.reason}`
            : `Not yet. ${d.hints[kind === "hint1" ? 0 : 1]}`;
      fx.push({ type: "feedback", kind, text });
      return out({ ...s, misses, resolved: kind === "reveal" });
    }
    case "continue": {
      // Continue shows only on the exchange and on an answered decision
      if (!cur || s.phase !== "dialog" || !(cur.exchange || s.resolved))
        return out(s);
      fx.push({ type: "closeDialog" });
      return out(trigger({ ...s, phase: "active" }));
    }
    case "closeDialog": {
      // Esc: an answered decision completes as Continue would; otherwise E opens it again,
      // with its misses kept
      if (!cur || s.phase !== "dialog") return out(s);
      fx.push({ type: "closeDialog" });
      if (cur.decision && s.resolved)
        return out(trigger({ ...s, phase: "active" }));
      return out({ ...s, phase: "active" });
    }
    case "roleChangeDone":
      if (s.phase !== "roleChange") return out(s);
      return out(enter(s.step));
  }
}
```

- [ ] **3a-3.4: Run it (expected PASS):** `Test Files  1 passed (1)`, `Tests  20 passed (20)`. Folder: `Test Files  7 passed (7)`, `Tests  133 passed (133)`.
- [ ] **3a-3.5: Checks.** prettier `--write` and eslint on the two files; `pnpm check`; `pnpm build:arcade` and the smoke (3a adds no imports to the bundle, so the smoke is unchanged: `SMOKE OK` ×3).
- [ ] **3a-3.6: Commit and push:**

```bash
git add apps/web/arcade-src/sim-hub/src/tutorial-machine.ts apps/web/arcade-src/sim-hub/src/tutorial-machine.spec.ts
git commit -m "feat(sim-hub): tutorial step machine (hints, miss counter, answer reveal, role change)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/sim-hub-tutorial
```

---

## Task 3b-0: bring PR 1 in, take the baselines (controller, after PR 1 is merged into `main`)

**Files:** none committed. Scratch: `$TUT/count-random.mjs`, `$TUT/tutorial-shots.mjs`, the logs and the "before" pictures.

- [ ] **3b-0.1: Merge `main` into the PR branch** (a merge commit; no rebase, no force-push):

```bash
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt
cd "$WT/tutorial-core"
git fetch origin && git merge --no-ff origin/main -m "Merge main (PR 1: menu and free mode) into feat/sim-hub-tutorial

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
pnpm install --frozen-lockfile
```

- [ ] **3b-0.2: Confirm the anchors 3b uses exist** (each command prints one match; stop and report any that prints none):

```bash
cd "$WT/tutorial-core/apps/web/arcade-src/sim-hub"
grep -n "name: 'Morgan Reed, RTT'," src/interact.ts            # two: linaccontrol and vault1
grep -n "^const leavesHub = (room: Room) =>" src/interact.ts
grep -n "^import { isPaused } from './pause';" src/interact.ts
grep -n "if (a.userData.seated) return;" src/npc.ts
grep -n "const near = d < LABEL_FADE_DIST;" src/npc.ts
grep -n "^function seatNear(p, radius, freeFor = null) {" src/npc-behavior.ts
grep -n "if (!actor || !target) return;" src/npc-behavior.ts
grep -n "^function journeyIntercom(actor, text, ms = 12000) {" src/journey.ts
grep -n "ROOM_LASERS\|^export const LYING_SURFACES" src/props.ts
grep -n "^installMenu();\|^import { installMenu } from './menu';\|updateWorkflowTransitions(sec);" src/main.ts
grep -n "slot:tutorial" index.html                               # two
grep -n "toBeDisabled" ../../e2e/simulator.e2e.ts
```

- [ ] **3b-0.3: Baselines** (from `$WT/tutorial-core/apps/web`):

```bash
TUT=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/tutorial
pnpm build:arcade
pnpm exec vitest run --project server arcade-src/sim-hub/src   # PR 1's count + 3 files, + 56 tests (PR 1's plan: 13 / 148, so 16 / 204)
node scripts/sim-hub-npc-check.mjs > "$TUT/npc-baseline.log" 2>&1; echo "exit $?"   # exit 0
node scripts/sim-hub-scene-check.mjs > "$TUT/scene-baseline.log" 2>&1; echo "exit $?" # exit 0
```

- [ ] **3b-0.4: The random-draw counter.** Write `$TUT/count-random.mjs`:

```js
// Counts the Math.random draws the built sim-hub makes while it boots under the check stubs, so a
// change can be shown to leave the NPC check's seeded stream alone. Run from apps/web.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const { installBrowserStubs } = await import(
  pathToFileURL(path.join(process.cwd(), "scripts/lib/browser-stubs.mjs")).href
);
let n = 0,
  a = 1;
Math.random = () => {
  n++;
  a = (a * 16807) % 2147483647;
  return a / 2147483647;
};
console.warn = () => {};
installBrowserStubs({ search: "?npccheck" });
const dir = path.join(process.cwd(), "arcade/sim-hub/assets");
await import(
  pathToFileURL(
    path.join(
      dir,
      fs.readdirSync(dir).find((f) => /^index-.*\.js$/.test(f)),
    ),
  ).href
);
console.log(n);
process.exit(0);
```

Run `node "$TUT/count-random.mjs" > "$TUT/random-baseline.txt"; cat "$TUT/random-baseline.txt"` (one number).

- [ ] **3b-0.5: The owner's pictures script.** Write `$TUT/tutorial-shots.mjs` (it was run against the plan-time scratch build):

```js
// sim-hub tutorial screenshots for the owner (dev only, not committed). Serves the built hub
// (apps/web/arcade/sim-hub) with ?npccheck, which exposes window.__TUTORIAL and window.__NPC, and
// writes PNGs to <outDir>. MODE=before: the title menu and the plaza in free mode (run on the
// PR 1 build, before the tutorial). MODE=after (default): the title menu, the tracker outside, the
// marker on LINAC Control's door, a decision with a hint, the role-change card and the end card,
// playing Chapter 1 in real time (about four minutes). Run from apps/web:
//   node <this file> <outDir>
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const WEB = process.cwd(),
  DIST = process.env.DIST || path.join(WEB, "arcade/sim-hub"),
  outDir = process.argv[2],
  MODE = process.env.MODE || "after";
const { chromium } = createRequire(path.join(WEB, "package.json"))(
  "playwright",
);
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
};
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = null;
  if (u.startsWith("/arcade/sim-hub/"))
    f = path.join(DIST, u.slice(16) || "index.html");
  else if (u.startsWith("/arcade/"))
    f = path.join(WEB, "static/arcade", u.slice(8));
  if (f && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, {
      "content-type": TYPES[path.extname(f)] || "application/octet-stream",
    });
    fs.createReadStream(f).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=metal"],
});
const page = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();
// room introduction cards off (prefs.ts simhub.roomCards.enabled): a card pauses the game and E
await page.addInitScript(() =>
  localStorage.setItem("simhub.roomCards.enabled", "false"),
);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
fs.mkdirSync(outDir, { recursive: true });
const shot = async (name, wait = 800) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(outDir, `${MODE}-${name}.png`) });
  console.log("shot", name);
};
const T = (fn, ...a) =>
  page.evaluate(([f, a]) => window.__TUTORIAL[f](...a), [fn, a]);
const state = () => page.evaluate(() => window.__TUTORIAL.state());
const until = async (cond, ms) => {
  for (let t = 0; t < ms; t += 200) {
    if (await cond()) return true;
    await page.waitForTimeout(200);
  }
  throw new Error(`timed out (${JSON.stringify(await state())})`);
};
const playStep = async (answerWrongOnce = false, beforeAnswer = null) => {
  const s = await state(),
    st = await page.evaluate((n) => window.__TUTORIAL.steps[n - 1], s.step);
  if (st.trigger === "pressE") {
    const [x, z] = await T("standPoint");
    await T("placePlayer", x, z);
    await page.waitForTimeout(300);
    await T("pressE");
    if (st.exchange) await T("cont");
    if (st.decision) {
      if (answerWrongOnce)
        await T("answer", st.decision.options.find((o) => !o.correct).id);
      if (beforeAnswer) await beforeAnswer();
      await T("answer", st.decision.options.find((o) => o.correct).id);
      await T("cont");
    }
  } else if (st.trigger === "enterRoom") {
    const [x, z] = await T("standPoint");
    await T("placePlayer", x, z);
  } else {
    // beside Jordan until the escort ends
    while (
      (await state()).step === s.step &&
      (await state()).phase === "active"
    ) {
      await page.evaluate(() => {
        const p = window.__NPC.JOURNEY.patient.position;
        window.__TUTORIAL.placePlayer(p.x + 0.8, p.z + 0.8);
      });
      await page.waitForTimeout(150);
    }
  }
  await until(async () => {
    const n = await state();
    return n.phase === "done" || n.step !== s.step || n.phase === "roleChange";
  }, 120000);
};

await page.goto(
  `http://127.0.0.1:${srv.address().port}/arcade/sim-hub/?npccheck`,
  {
    waitUntil: "load",
  },
);
await page.waitForFunction(
  () => document.getElementById("loader")?.classList.contains("hide"),
  null,
  {
    timeout: 120000,
  },
);
await shot("1-title", 2500);
if (MODE === "before") {
  await page.click("#menuFree");
  await shot("2-outside", 2500);
} else {
  if (await page.$("#menuTutorial")) await page.click("#menuTutorial");
  else await T("enter");
  await shot("2-tracker-outside", 2500);
  await playStep(); // 1: check-in
  const [x, z] = await T("standPoint");
  await T("placePlayer", x, z);
  await page.waitForTimeout(300);
  await T("pressE"); // 2: sit down; the role change follows
  await page.waitForTimeout(6000 + 600 + 400);
  await shot("5-role-card", 0);
  await until(async () => (await state()).phase === "active", 10000);
  await playStep(true, () => shot("4-decision-hint", 500)); // 3
  for (let n = 4; n <= 6; n++) await playStep();
  // 7: on the main corridor in front of LINAC Control's door, facing it (+z)
  await T("placePlayer", 51.6, -1.0, Math.PI);
  await shot("3-marker-door", 1500);
  await playStep();
  while ((await state()).phase !== "done") {
    if ((await state()).phase === "waiting") await page.waitForTimeout(500);
    else await playStep();
  }
  await shot("6-end-card", 1200);
}
console.log("errors", JSON.stringify(errors));
await browser.close();
srv.close();
```

Take the "before" pictures now (PR 1's build): `MODE=before node "$TUT/tutorial-shots.mjs" "$TUT/shots"` (expected: `shot 1-title`, `shot 2-outside`, `errors []`). The Tutorial entry reads "Coming soon" in `before-1-title.png`.

- [ ] **3b-0.6:** `git push origin feat/sim-hub-tutorial`. Then W3.

---

## Task 3b-1: shared-file prep (worktree `tutorial-prep`)

**Files (modify only):** `interact.ts`, `npc.ts`, `npc-behavior.ts`, `journey.ts`, `props.ts` (all in `apps/web/arcade-src/sim-hub/src/`).

**Interfaces.** Consumes: `getPlayMode` (`play-mode.ts`), `visibleInTree` (npc-behavior.ts, existing). Produces: `export function seatNear(p, radius, freeFor = null)` (npc-behavior.ts); `export function journeyIntercom(actor, text, ms = 12000)` (journey.ts); `export const ROOM_LASERS: Record<string, THREE.Line[]>` (props.ts); `userData.tutorialLocked` honoured by `startActorHandoff`.

- [ ] **3b-1.1: The rename** (`interact.ts`). Old:

```ts
	vault1: {
		name: 'Morgan Reed, RTT',
		role: 'Radiation Therapist · Treatment Vault 1',
		initials: 'MR',
```

New:

```ts
	vault1: {
		name: 'Jamie Williams, RTT',
		role: 'Radiation Therapist · Treatment Vault 1',
		initials: 'JW',
```

Everything that shows this NPC's name reads it from `STAFF_GUIDES.vault1`, so this covers all of them:

- the floating role label and the chest badge (`npc.ts setNpcRole`, built at boot);
- the staff conversation (`openStaffDialogue`);
- the E prompt ("Talk to Jamie Williams, RTT", `interact.ts pickPromptTarget`);
- the room card's staff line (`hud-roomcard.ts`).

Verify: `grep -rn "Morgan Reed" arcade-src/sim-hub/src` (from `apps/web`) prints only the `linaccontrol` entry, and `grep -rn "Jamie Williams" arcade-src/sim-hub/src` prints the new `vault1` entry (the tutorial's lines come in 3a-2's file).

- [ ] **3b-1.2: No leaving in the tutorial** (`interact.ts`; finding 4). Old: `import { isPaused } from './pause';` New:

```ts
import { isPaused } from "./pause";
import { getPlayMode } from "./play-mode";
```

Old:

```ts
/** A door that leaves the hub for another simulator, once that simulator's player URL resolved. */
const leavesHub = (room: Room) =>
  (!!S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) ||
  (!!S.CONSOLE_APP_URL && S.CONSOLE_APP_DOORS.has(room.name));
```

New:

```ts
/** A door that leaves the hub for another simulator, once that simulator's player URL resolved;
    none in the tutorial, where leaving would end the chapter (no prompt, and E leaves it alone). */
const leavesHub = (room: Room) =>
  getPlayMode() !== "tutorial" &&
  ((!!S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) ||
    (!!S.CONSOLE_APP_URL && S.CONSOLE_APP_DOORS.has(room.name)));
```

(If `interact.ts` already imports from `./play-mode`, add `getPlayMode` to that import instead.)

- [ ] **3b-1.3: `npc.ts`.** Old: `import { registerDutyActor, registerNpcExchange, seatActor } from './npc-behavior';` New:

```ts
import {
  registerDutyActor,
  registerNpcExchange,
  seatActor,
  visibleInTree,
} from "./npc-behavior";
```

Old:

```ts
// a seated figure keeps its seat's facing; turning it would swing its legs through the seat
if (a.userData.seated) return;
```

New:

```ts
// a seated figure keeps its seat's facing; turning it would swing its legs through the seat; a
// lying one stays along its couch or table
if (a.userData.seated || a.userData.lying) return;
```

Old:

```ts
const d = cam.distanceTo(wp);
const near = d < LABEL_FADE_DIST;
```

New:

```ts
const d = cam.distanceTo(wp);
// a hidden figure (the one the tutorial player is being) shows no label
const near = d < LABEL_FADE_DIST && visibleInTree(n.group);
```

- [ ] **3b-1.4: `npc-behavior.ts`.** Old: `function seatNear(p, radius, freeFor = null) {` New: `export function seatNear(p, radius, freeFor = null) {`.

  Old (inside `updateNpcExchanges`, the end of the hand-over skip):

```ts
			bubbleVis(sc.bubbleA, false);
			bubbleVis(sc.bubbleB, false);
			continue;
		}
		sc.a.getWorldPosition(pa);
```

New:

```ts
			bubbleVis(sc.bubbleA, false);
			bubbleVis(sc.bubbleB, false);
			continue;
		}
		// a hidden partner (the figure the tutorial player is being, an empty couch) says nothing
		if (!visibleInTree(sc.a) || !visibleInTree(sc.b)) {
			bubbleVis(sc.bubbleA, false);
			bubbleVis(sc.bubbleB, false);
			continue;
		}
		sc.a.getWorldPosition(pa);
```

Old (in `startActorHandoff`):

```ts
if (!actor || !target) return;
```

New:

```ts
// the tutorial's Jordan and vault partner follow its script, not a staff hand-over
if (!actor || !target || actor.userData.tutorialLocked) return;
```

- [ ] **3b-1.5: `journey.ts`.** Old: `function journeyIntercom(actor, text, ms = 12000) {` New: `export function journeyIntercom(actor, text, ms = 12000) {`. Nothing else in `journey.ts` changes (check b reads it as text).
- [ ] **3b-1.6: `props.ts`.** Old:

```ts
export const LYING_SURFACES: Record<string, THREE.Object3D> = {};
```

New:

```ts
export const LYING_SURFACES: Record<string, THREE.Object3D> = {};
/** Each vault's room lasers (emulatorLinacShell), by room id: the tutorial turns vault 1's on for
    Jordan's setup and off otherwise. */
export const ROOM_LASERS: Record<string, THREE.Line[]> = {};
```

Old (the end of `emulatorLinacShell`):

```ts
	const l2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), laserMat);
	root.add(l2);
}
```

New:

```ts
	const l2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), laserMat);
	root.add(l2);
	ROOM_LASERS[room.id] = [l1, l2];
}
```

- [ ] **3b-1.7: Checks** (from `$WT/tutorial-prep/apps/web`):

```bash
TUT=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/tutorial
F="arcade-src/sim-hub/src/interact.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/npc-behavior.ts arcade-src/sim-hub/src/journey.ts arcade-src/sim-hub/src/props.ts"
pnpm exec prettier --write $F && pnpm exec eslint $F
pnpm check
pnpm build:arcade
pnpm exec vitest run --project server arcade-src/sim-hub/src     # same counts as 3b-0.3
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
node scripts/sim-hub-npc-check.mjs > "$TUT/npc-3b1.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$TUT/npc-baseline.log") <(grep '^NPC CHECK' "$TUT/npc-3b1.log") && echo "NPC unchanged"
node scripts/sim-hub-scene-check.mjs > "$TUT/scene-3b1.log" 2>&1; echo "exit $?"; diff <(grep '^SCENE CHECK' "$TUT/scene-baseline.log") <(grep '^SCENE CHECK' "$TUT/scene-3b1.log") && echo "scene unchanged"
node "$TUT/count-random.mjs"; cat "$TUT/random-baseline.txt"   # the two numbers are equal
```

Expected: no lint output; `pnpm check` exit 0; `SMOKE OK` ×3; `exit 0` and `NPC unchanged`; `exit 0` and `scene unchanged`; equal random counts.

- [ ] **3b-1.8: Commit** (from `$WT/tutorial-prep`):

```bash
git add apps/web/arcade-src/sim-hub/src/interact.ts apps/web/arcade-src/sim-hub/src/npc.ts apps/web/arcade-src/sim-hub/src/npc-behavior.ts apps/web/arcade-src/sim-hub/src/journey.ts apps/web/arcade-src/sim-hub/src/props.ts
git commit -m "feat(sim-hub): tutorial prep: Jamie Williams in Vault 1, hidden figures silent, lying figures stay put

Renames the vault 1 therapist to Jamie Williams, RTT. Hidden figures show no label and take no
part in exchanges; exchanges no longer turn lying patients; tutorial-locked actors skip staff
hand-overs; no hub-leaving doors in the tutorial; exports seatNear and journeyIntercom; registers
each vault's room lasers.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3b-2: the tutorial HUD (worktree `tutorial-hud`, parallel with 3b-1)

**Files:**

- Create: `apps/web/arcade-src/sim-hub/src/tutorial-hud.ts`
- Modify: `apps/web/arcade-src/sim-hub/index.html` (after `<!-- slot:tutorial -->` and after `/* slot:tutorial */` only)

**Interfaces.** Consumes: `Decision`, `ExchangeLine`, `RoleInfo` (3a-2), `FeedbackKind` (3a-1). Produces (exact): `interface HudHandlers { answer(id: string): void; cont(): void; mainMenu(): void; keepExploring(): void }`, `interface TrackerView { role: RoleInfo; step: number; total: number; objective: string; progress: number }`, and the functions `initTutorialHud(h)`, `showTracker(v | null)`, `setHint(text | null)`, `setDistance(text)`, `placeMarker({ x, y, label } | null)`, `placeEdge({ x, y, angle, label } | null)`, `openExchange(title, lines)`, `openDecision(d)`, `showFeedback(kind, text, picked, correct)`, `closeDialog()`, `setFade(on)`, `showRoleCard(r | null)`, `showEnd(on)`, `hideTutorialHud()`.

DOM rule: element lookups happen once, in `initTutorialHud`. Only `textContent`, `className`, `classList`, `style`, `hidden`, `disabled`, `dataset`, `onclick`, `createElement` and `appendChild` are used, which `scripts/lib/browser-stubs.mjs` provides. `append`, `replaceChildren` and `createTextNode` are not stubbed, and the run-through check failed on them at plan time.

- [ ] **3b-2.1: Write `tutorial-hud.ts`:**

```ts
/* The sim-hub tutorial's screen (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3): the
   tracker card at the top-left (role, objective, hint line, progress, step and walking distance),
   the orange marker and its screen-edge arrow, the check-in and decision dialog, the fade and the
   role-change card, and the end card. DOM only; tutorial.ts decides what they show. The elements
   are index.html's slot:tutorial block, looked up once at init (a headless check's stub DOM hands
   out a new element on every lookup). */
import type { Decision, ExchangeLine, RoleInfo } from "./tutorial-steps";
import type { FeedbackKind } from "./tutorial-math";

export interface HudHandlers {
  answer(id: string): void;
  cont(): void;
  mainMenu(): void;
  keepExploring(): void;
}
export interface TrackerView {
  role: RoleInfo;
  step: number;
  total: number;
  objective: string;
  progress: number;
}

const IDS = [
  "tutTracker",
  "tutAvatar",
  "tutRole",
  "tutObjective",
  "tutHint",
  "tutBar",
  "tutStep",
  "tutDistance",
  "tutMarker",
  "tutMarkerLabel",
  "tutEdge",
  "tutEdgeArrow",
  "tutEdgeLabel",
  "tutDialog",
  "tutDialogTitle",
  "tutDialogBody",
  "tutDialogContext",
  "tutDialogOptions",
  "tutDialogFeedback",
  "tutDialogContinue",
  "tutFade",
  "tutRoleCard",
  "tutRoleCardName",
  "tutEnd",
  "tutEndMenu",
  "tutEndExplore",
] as const;
type Id = (typeof IDS)[number];

let E = {} as Record<Id, HTMLElement>;
let handlers: HudHandlers | null = null;
let optionButtons: HTMLButtonElement[] = [];
let shownDistance = "";

const show = (el: HTMLElement, on: boolean) => el.classList.toggle("show", on);

export function initTutorialHud(h: HudHandlers): void {
  E = Object.fromEntries(
    IDS.map((id) => [id, document.getElementById(id)]),
  ) as Record<Id, HTMLElement>;
  handlers = h;
  E.tutDialogContinue.onclick = () => handlers?.cont();
  E.tutEndMenu.onclick = () => handlers?.mainMenu();
  E.tutEndExplore.onclick = () => handlers?.keepExploring();
}

export function showTracker(v: TrackerView | null): void {
  show(E.tutTracker, !!v);
  if (!v) return;
  E.tutAvatar.textContent = v.role.initials;
  E.tutRole.textContent = `${v.role.role} · ${v.role.name}`;
  E.tutObjective.textContent = v.objective;
  E.tutStep.textContent = `Step ${v.step} of ${v.total}`;
  E.tutBar.style.width = `${Math.round(v.progress * 100)}%`;
}

export function setHint(text: string | null): void {
  E.tutHint.textContent = text ?? "";
  show(E.tutHint, !!text);
}

export function setDistance(text: string): void {
  if (text === shownDistance) return;
  shownDistance = text;
  E.tutDistance.textContent = text;
}

/** The marker on screen at (x, y), screen fractions; null hides it. */
export function placeMarker(
  m: { x: number; y: number; label: string } | null,
): void {
  show(E.tutMarker, !!m);
  if (!m) return;
  E.tutMarker.style.left = `${(m.x * 100).toFixed(2)}%`;
  E.tutMarker.style.top = `${(m.y * 100).toFixed(2)}%`;
  E.tutMarkerLabel.textContent = m.label;
}

/** The edge arrow at (x, y), screen fractions, pointing `angle` degrees (0 right, 90 down). */
export function placeEdge(
  a: { x: number; y: number; angle: number; label: string } | null,
): void {
  show(E.tutEdge, !!a);
  if (!a) return;
  E.tutEdge.style.left = `${(a.x * 100).toFixed(2)}%`;
  E.tutEdge.style.top = `${(a.y * 100).toFixed(2)}%`;
  // the label stays on screen: it hangs inward from a side edge, above the arrow at the bottom
  E.tutEdge.classList.toggle("left", a.x < 0.25);
  E.tutEdge.classList.toggle("right", a.x > 0.75);
  E.tutEdge.classList.toggle("bottom", a.y > 0.75);
  E.tutEdgeArrow.style.transform = `rotate(${a.angle.toFixed(1)}deg)`;
  E.tutEdgeLabel.textContent = a.label;
}

function openCard(title: string): void {
  E.tutDialogTitle.textContent = title;
  E.tutDialogBody.textContent = "";
  E.tutDialogContext.textContent = "";
  E.tutDialogOptions.textContent = "";
  optionButtons = [];
  E.tutDialogFeedback.textContent = "";
  E.tutDialogFeedback.className = "tut-feedback";
  show(E.tutDialog, true);
}

export function openExchange(
  title: string,
  lines: readonly ExchangeLine[],
): void {
  openCard(title);
  for (const l of lines) {
    const p = document.createElement("p"),
      who = document.createElement("b"),
      said = document.createElement("span");
    p.className = "tut-line";
    who.textContent = l.who;
    said.textContent = ` ${l.text}`;
    p.appendChild(who);
    p.appendChild(said);
    E.tutDialogBody.appendChild(p);
  }
  E.tutDialogContinue.hidden = false;
}

export function openDecision(d: Decision): void {
  openCard(d.title);
  const p = document.createElement("p");
  p.textContent = d.prompt;
  E.tutDialogBody.appendChild(p);
  for (const [k, v] of d.context ?? []) {
    const row = document.createElement("div"),
      key = document.createElement("span"),
      val = document.createElement("b");
    row.className = "tut-row";
    key.textContent = k;
    val.textContent = v;
    row.appendChild(key);
    row.appendChild(val);
    E.tutDialogContext.appendChild(row);
  }
  for (const o of d.options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tut-option";
    b.dataset.option = o.id;
    b.textContent = o.text;
    b.onclick = () => handlers?.answer(o.id);
    E.tutDialogOptions.appendChild(b);
    optionButtons.push(b);
  }
  E.tutDialogContinue.hidden = true;
}

/** The answer's feedback: a miss marks the picked option; the answer or a right pick marks the
    right one, locks the options and shows Continue. */
export function showFeedback(
  kind: FeedbackKind,
  text: string,
  picked: string | null,
  correct: string | null,
): void {
  E.tutDialogFeedback.textContent = text;
  E.tutDialogFeedback.className = `tut-feedback show ${kind}`;
  const done = kind === "correct" || kind === "reveal";
  for (const b of optionButtons) {
    const id = b.dataset.option;
    if (id === picked && !done) b.classList.add("tried");
    if (done && id === correct) b.classList.add("right");
    b.disabled = done;
  }
  E.tutDialogContinue.hidden = !done;
}

export function closeDialog(): void {
  show(E.tutDialog, false);
  optionButtons = [];
}

export function setFade(on: boolean): void {
  show(E.tutFade, on);
}

export function showRoleCard(r: RoleInfo | null): void {
  show(E.tutRoleCard, !!r);
  if (r) E.tutRoleCardName.textContent = `${r.name} · ${r.role}`;
}

export function showEnd(on: boolean): void {
  show(E.tutEnd, on);
}

export function hideTutorialHud(): void {
  showTracker(null);
  setHint(null);
  placeMarker(null);
  placeEdge(null);
  closeDialog();
  setFade(false);
  showRoleCard(null);
  showEnd(false);
  shownDistance = "";
}
```

- [ ] **3b-2.2: Markup** (`index.html`). Old: `		<!-- slot:tutorial -->` New: the slot line, then:

```html
<div
  id="tutTracker"
  class="tut-tracker"
  data-testid="tutorial-tracker"
  aria-live="polite"
>
  <div class="tut-who">
    <div id="tutAvatar" class="tut-av">JE</div>
    <div>
      <span class="tut-k">Your role</span
      ><b id="tutRole">Patient · Jordan Ellis</b>
    </div>
  </div>
  <div class="tut-lab">Objective</div>
  <div id="tutObjective" class="tut-txt"></div>
  <div id="tutHint" class="tut-hint"></div>
  <div class="tut-bar"><i id="tutBar"></i></div>
  <div class="tut-meta">
    <span id="tutStep">Step 1 of 11</span><span id="tutDistance"></span>
  </div>
</div>
<div id="tutMarker" class="tut-marker" aria-hidden="true">
  <div class="tut-gem"></div>
  <div id="tutMarkerLabel" class="tut-lbl"></div>
</div>
<div id="tutEdge" class="tut-edge" aria-hidden="true">
  <div id="tutEdgeArrow" class="tut-arr"></div>
  <div id="tutEdgeLabel" class="tut-lbl"></div>
</div>
<div
  id="tutDialog"
  class="tut-dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="tutDialogTitle"
>
  <div class="tut-card">
    <div id="tutDialogTitle" class="tut-title"></div>
    <div id="tutDialogBody" class="tut-body"></div>
    <div id="tutDialogContext" class="tut-context"></div>
    <div id="tutDialogOptions" class="tut-options"></div>
    <div id="tutDialogFeedback" class="tut-feedback"></div>
    <button id="tutDialogContinue" class="tut-continue" type="button" hidden>
      Continue
    </button>
  </div>
</div>
<div id="tutFade" class="tut-fade"></div>
<div id="tutRoleCard" class="tut-rolecard" aria-live="polite">
  <span class="tut-k">You are now</span><b id="tutRoleCardName"></b>
</div>
<div
  id="tutEnd"
  class="tut-end"
  role="dialog"
  aria-modal="true"
  aria-labelledby="tutEndTitle"
>
  <div class="tut-card">
    <div id="tutEndTitle" class="tut-title">Chapter 1 complete</div>
    <p class="tut-body">
      You followed Jordan’s treatment day as the patient and as the radiation
      therapist.
    </p>
    <div class="tut-endrow">
      <button id="tutEndMenu" type="button">Main menu</button>
      <button id="tutEndExplore" class="tut-primary" type="button">
        Keep exploring
      </button>
    </div>
  </div>
</div>
```

- [ ] **3b-2.3: CSS** (`index.html`). Old: `			/* slot:tutorial */` New: the slot line, then:

```css
.tut-tracker {
  position: fixed;
  z-index: 70;
  top: 16px;
  left: 16px;
  width: min(330px, calc(100vw - 32px));
  padding: 14px 16px;
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  color: var(--ink);
  display: none;
  pointer-events: none;
}
.tut-tracker.show {
  display: block;
}
.tut-who {
  display: flex;
  gap: 10px;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--stroke);
}
.tut-av {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 900;
  background: rgba(117, 184, 255, 0.2);
  color: #9ccaff;
  border: 1px solid rgba(117, 184, 255, 0.53);
}
.tut-k {
  display: block;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--dim);
  font-weight: 700;
}
.tut-who b {
  display: block;
  font-size: 16px;
}
.tut-lab {
  margin-top: 10px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--amber);
  font-weight: 800;
}
.tut-txt {
  margin: 4px 0;
  font-size: 18px;
  font-weight: 800;
}
.tut-hint {
  display: none;
  margin-top: 6px;
  padding: 6px 8px;
  border-left: 3px solid var(--amber);
  background: rgba(255, 188, 99, 0.1);
  font-size: 14px;
  color: var(--ink);
}
.tut-hint.show {
  display: block;
}
.tut-bar {
  height: 6px;
  margin-top: 10px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.12);
}
.tut-bar i {
  display: block;
  height: 100%;
  width: 0;
  background: var(--teal);
  transition: width 0.4s;
}
.tut-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 13px;
  color: var(--dim);
}
.tut-marker,
.tut-edge {
  position: fixed;
  z-index: 60;
  display: none;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}
.tut-marker.show,
.tut-edge.show {
  display: block;
}
.tut-gem {
  width: 26px;
  height: 26px;
  margin: 0 auto;
  background: var(--amber);
  border-radius: 4px;
  transform: rotate(45deg);
  box-shadow: 0 0 18px rgba(255, 188, 99, 0.9);
}
.tut-arr {
  width: 0;
  height: 0;
  margin: 0 auto;
  border-top: 16px solid transparent;
  border-bottom: 16px solid transparent;
  border-left: 22px solid var(--amber);
  filter: drop-shadow(0 0 8px rgba(255, 188, 99, 0.8));
}
.tut-lbl {
  margin-top: 12px;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}
.tut-edge .tut-lbl {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
}
.tut-edge.left .tut-lbl {
  left: 0;
  transform: none;
}
.tut-edge.right .tut-lbl {
  left: auto;
  right: 0;
  transform: none;
}
.tut-edge.bottom .tut-lbl {
  top: auto;
  bottom: 100%;
  margin: 0 0 12px;
}
.tut-dialog,
.tut-end {
  position: fixed;
  z-index: 185;
  inset: 0;
  display: none;
  place-items: center;
  background: rgba(4, 8, 11, 0.45);
}
.tut-dialog.show,
.tut-end.show {
  display: grid;
}
.tut-card {
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 18px 20px;
  background: rgba(9, 17, 23, 0.965);
  border: 1px solid rgba(66, 213, 207, 0.38);
  border-radius: 18px;
  box-shadow: var(--shadow);
  color: var(--ink);
}
.tut-title {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 8px;
}
.tut-body {
  font-size: 16px;
  line-height: 1.45;
}
.tut-line b {
  color: var(--teal);
}
.tut-context {
  display: grid;
  gap: 4px;
  margin: 8px 0;
}
.tut-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 8px;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  font-size: 14px;
}
.tut-row span {
  color: var(--dim);
}
.tut-options {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
.tut-option,
.tut-continue,
.tut-endrow button {
  font: inherit;
  font-size: 15px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--stroke2);
  background: var(--panel2);
  color: var(--ink);
  cursor: pointer;
}
.tut-option:hover:not(:disabled) {
  border-color: var(--teal);
}
.tut-option.tried {
  border-color: var(--red);
  opacity: 0.75;
}
.tut-option.right {
  border-color: var(--green);
  background: rgba(101, 221, 160, 0.14);
}
.tut-feedback {
  display: none;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 15px;
}
.tut-feedback.show {
  display: block;
}
.tut-feedback.hint1,
.tut-feedback.hint2 {
  background: rgba(255, 106, 115, 0.12);
  border: 1px solid rgba(255, 106, 115, 0.45);
}
.tut-feedback.reveal {
  background: rgba(255, 188, 99, 0.12);
  border: 1px solid rgba(255, 188, 99, 0.5);
}
.tut-feedback.correct {
  background: rgba(101, 221, 160, 0.12);
  border: 1px solid rgba(101, 221, 160, 0.5);
}
.tut-continue {
  margin-top: 12px;
  float: right;
  border-color: var(--teal);
}
.tut-fade {
  position: fixed;
  z-index: 230;
  inset: 0;
  background: #000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s;
}
.tut-fade.show {
  opacity: 1;
}
.tut-rolecard {
  position: fixed;
  z-index: 235;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: none;
  text-align: center;
  color: var(--ink);
  pointer-events: none;
}
.tut-rolecard.show {
  display: block;
}
.tut-rolecard b {
  display: block;
  margin-top: 8px;
  font-size: 30px;
  font-weight: 900;
}
.tut-endrow {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.tut-endrow .tut-primary {
  border-color: var(--teal);
  background: rgba(66, 213, 207, 0.16);
}
```

- [ ] **3b-2.4: Checks** (from `$WT/tutorial-hud/apps/web`):
  - `pnpm exec prettier --write arcade-src/sim-hub/src/tutorial-hud.ts arcade-src/sim-hub/index.html`
  - `pnpm exec eslint arcade-src/sim-hub/src/tutorial-hud.ts`
  - `pnpm check` (exit 0; the module is type-checked though nothing imports it yet)
  - `pnpm build:arcade`
  - the smoke (`SMOKE OK` ×3)
  - `grep -c 'id="tut' arcade/sim-hub/index.html` (expected `26`: every id the HUD looks up is in the built page)
- [ ] **3b-2.5: Commit:**

```bash
git add apps/web/arcade-src/sim-hub/src/tutorial-hud.ts apps/web/arcade-src/sim-hub/index.html
git commit -m "feat(sim-hub): tutorial HUD (tracker, marker, edge arrow, dialog, role card, end card)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3b-3: the wiring and the run-through check (worktree `tutorial-wiring`, after 3b-1 and 3b-2 are merged)

**Files:**

- Create: `apps/web/scripts/sim-hub-tutorial-check.mjs`
- Create: `apps/web/arcade-src/sim-hub/src/tutorial.ts`
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts` (three insertions)

**Interfaces.**

- **Consumes from PR 1:**
  - `getPlayMode`, `enterMode`, `onPlayModeChange` (`play-mode.ts`)
  - `setPaused('tutorial', …)` (`pause.ts`)
  - `registerDialog` (`dialogs.ts`)
  - `setTutorialAvailable` (`menu.ts`)
  - `registerInteractable(…, { enabled })` and `performInteraction` (interact.ts)
- **Consumes from 3b-1:** `seatNear`, `journeyIntercom`, `ROOM_LASERS`.
- **Consumes, existing:**
  - `JOURNEY`, `LOBBY_PICKUP`, `moveJourneyActor`, `resetTreatmentJourney`, `journeySpeech`, `workflowTransitions` (journey.ts)
  - `movementPathFor`, `seatActor`, `actorHasTransition` (npc-behavior.ts)
  - `poseCharacter`, `faceNpcToward`, `setPatientGown` (npc.ts)
  - `workflowState` (equipment.ts)
  - `seatInWorld` (props.ts)
  - `getColliders`, `doorPoint`, `insidePoint`, `roomContainingWalkPoint`, `setDoorTarget`, `requestWalkPointerLock` (walk.ts)
  - `player`, `PLAYER_EYE_Y`, `REACH_Y`, `PRIMARY_NPCS`, `roomById`, `doors` (main.ts)
- **Consumes from 3a and 3b-2:** everything they produce.
- **Produces:** `export function initTutorial(): void` and `export function updateTutorial(dt: number): void`. With `?npccheck` it also produces `window.__TUTORIAL`:
  - `steps`, `enter()`, `mode()`, `state()`, `standPoint()`, `placePlayer(x, z, yaw?)`, `playerPos()`
  - `pressE()`, `answer(id)`, `cont()`, `mainMenu()`, `keepExploring()`, `toTitle()`
  - `route()`, `routeHitsWall()`, `lasersOn()`, `chair()`

- [ ] **3b-3.1: Write the check** `apps/web/scripts/sim-hub-tutorial-check.mjs`:

```js
// sim-hub tutorial run-through check (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3).
//
// Imports the built sim-hub bundle under stubbed browser globals (scripts/lib/browser-stubs.mjs)
// with `?npccheck`, which makes the page expose `window.__NPC` (src/npc-check-hook.ts) and
// `window.__TUTORIAL` (src/tutorial.ts), and plays Chapter 1 twice on a simulated clock
// (performance.now and setTimeout run on it, Math.random is seeded), as sim-hub-npc-check.mjs
// does. The player is moved to each target and presses E (the real performInteraction), answers
// each decision and follows Jordan on the escorts. Room introduction cards are switched off
// through the page's own preference (localStorage simhub.roomCards.enabled = false).
//   run 1  every decision answered wrong three times: hint 1, hint 2, then the answer shown and
//          the step completed; the 60 s and 120 s walking hints and the 20 s E hint show; on the
//          walk to Vault 1 the player runs ahead and Jordan waits at a stop ("Wait for Jordan");
//          the end card's Keep exploring leaves the player where they stand, in free mode
//   run 2  every decision answered right; the end card's Main menu goes back to the title
// Asserted on both runs: every step completes, in order; the figure the player is being is hidden
// (Jordan's in steps 1-2, Morgan Reed's from step 3) and the vault 1 couch is empty until Jordan
// lies down; every move the tutorial makes (Jordan's escorts, Jamie Williams's walks) keeps the
// 0.2 m circle round the walker's root clear of the wall colliders on every frame (as NPC check l
// does); the marker's route never crosses a wall collider; and after leaving, the journey actors,
// the people's visibility and the vault 1 lasers are exactly as the journey reset leaves them (what
// sim-hub-npc-check.mjs expects).
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-tutorial-check.mjs
// Exit codes: 0 every part passes; 1 any fails; 2 setup error.
// Output: `TUTORIAL CHECK <part> PASS|FAIL: <summary>` per part, then at most 30 detail lines per
// failing part.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { installBrowserStubs } from "./lib/browser-stubs.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STEP_MS = 1000 / 30;
const WALL_R = 0.2; // the root circle checked against the wall colliders (NPC check k and l)
const STEP_LIMIT_S = 300; // the longest a step may take (an escort is the longest)
const MAX_DETAIL = 30;

function setupError(msg) {
  console.error(`TUTORIAL CHECK setup error: ${msg}`);
  process.exit(2);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simulated clock, as sim-hub-npc-check.mjs: performance.now and the page's timers run on simNow.
let simNow = 1000;
Object.defineProperty(globalThis.performance, "now", {
  value: () => simNow,
  configurable: true,
});
const timers = new Map();
let timerId = 0;
globalThis.setTimeout = (fn, ms = 0, ...args) => {
  timers.set(++timerId, { at: simNow + (Number(ms) || 0), fn, args });
  return timerId;
};
globalThis.clearTimeout = (id) => timers.delete(id);
function runDueTimers() {
  for (;;) {
    let next = null;
    for (const [id, t] of timers)
      if (t.at <= simNow && (!next || t.at < next[1].at)) next = [id, t];
    if (!next) return;
    timers.delete(next[0]);
    next[1].fn(...next[1].args);
  }
}
Math.random = mulberry32(1);
const warn = console.warn;
console.warn = (...a) => {
  if (
    a.length === 1 &&
    /^THREE\.WebGLRenderer: \w+ extension not supported\.$/.test(String(a[0]))
  )
    return;
  warn(...a);
};
installBrowserStubs({ search: "?npccheck" });
// a working store, with the room introduction cards off (the page reads it through prefs.ts)
const store = new Map([["simhub.roomCards.enabled", "false"]]);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
};

const assetsDir = path.resolve(HERE, "../arcade/sim-hub/assets");
let bundle;
try {
  bundle = fs.readdirSync(assetsDir).find((f) => /^index-.*\.js$/.test(f));
} catch {
  /* handled below */
}
if (!bundle)
  setupError(`no built bundle in ${assetsDir} (run pnpm build:arcade)`);
try {
  await import(pathToFileURL(path.join(assetsDir, bundle)).href);
} catch (err) {
  setupError(
    `bundle threw during evaluation: ${err && err.stack ? err.stack : err}`,
  );
}
const NPC = globalThis.window && globalThis.window.__NPC;
const T = globalThis.window && globalThis.window.__TUTORIAL;
if (!NPC)
  setupError("window.__NPC missing (hook not installed with ?npccheck)");
if (!T)
  setupError(
    "window.__TUTORIAL missing (src/tutorial.ts initTutorial did not run)",
  );
NPC.disableRendering();

const J = NPC.JOURNEY;
const who = (a) =>
  a === J.patient
    ? "Jordan"
    : a === J.vaultTherapist
      ? "Jamie Williams"
      : "another actor";
const xz = (o) => {
  o.updateWorldMatrix(true, false);
  return { x: o.matrixWorld.elements[12], z: o.matrixWorld.elements[14] };
};
// how far a WALL_R circle at (x, z) reaches into the wall colliders (NPC check k and l)
function wallReach(x, z) {
  let deepest = null;
  for (const c of NPC.colliders) {
    const depth =
      WALL_R -
      Math.hypot(
        Math.max(Math.abs(x - c.x) - c.hw, 0),
        Math.max(Math.abs(z - c.z) - c.hd, 0),
      );
    if (depth > 0 && (!deepest || depth > deepest.depth))
      deepest = { depth, c };
  }
  return deepest;
}

// every frame of a run: each tutorial move's walker against the walls
let wallHits = [],
  movesSeen = new Set();
function onFrame() {
  if (!T.state().active) return;
  for (const t of NPC.workflowTransitions) {
    movesSeen.add(t);
    const p = xz(t.actor),
      hit = wallReach(p.x, p.z);
    if (hit)
      wallHits.push(
        `step ${T.state().step}: ${who(t.actor)} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) ${(hit.depth * 100).toFixed(1)} cm into the wall at (${hit.c.x.toFixed(2)}, ${hit.c.z.toFixed(2)})`,
      );
  }
}
const step = () => {
  simNow += STEP_MS;
  runDueTimers();
  NPC.stepSimulation(simNow);
  onFrame();
};
const stepFor = (seconds) => {
  for (let i = 0; i < Math.round((seconds * 1000) / STEP_MS); i++) step();
};
// steps until cond() holds; false after `seconds`
function stepUntil(cond, seconds) {
  for (let i = 0; i < Math.round((seconds * 1000) / STEP_MS); i++) {
    if (cond()) return true;
    step();
  }
  return cond();
}

// The journey actors and the people as the journey reset leaves them.
function worldState() {
  const actors = {};
  for (const k of ["patient", "therapist", "vaultTherapist", "couchPatient"]) {
    const a = J[k];
    actors[k] = {
      x: a.position.x,
      y: a.position.y,
      z: a.position.z,
      ry: a.rotation.y,
      visible: a.visible,
      seated: !!a.userData.seated,
      gown: !!a.userData.inGown,
      locked: !!a.userData.tutorialLocked,
      inHandoff: !!a.userData.inHandoff,
    };
  }
  return JSON.stringify({
    actors,
    people: Object.values(NPC.ROOM_CAST)
      .flat()
      .map((e) => e.g.visible),
    moves: NPC.workflowTransitions.length,
    lasers: T.lasersOn(),
  });
}
NPC.resetTreatmentJourney(true);
const BASELINE = worldState();

const results = [];
function report(part, fails, summary) {
  results.push({ part, pass: !fails.length, summary, fails });
}

// One play-through. `wrong`: answer every decision wrong three times; also exercises the hints,
// Jordan's wait and Keep exploring. Otherwise answers right and leaves by Main menu.
function play(wrong) {
  const name = wrong ? "run 1 (wrong answers)" : "run 2 (right answers)";
  const fails = [],
    order = [];
  wallHits = [];
  movesSeen = new Set();
  let routes = 0;
  T.enter();
  if (
    T.mode() !== "tutorial" ||
    T.state().phase !== "active" ||
    T.state().step !== 1
  )
    fails.push(
      `entering did not start step 1 (mode ${T.mode()}, ${JSON.stringify(T.state())})`,
    );
  if (wrong) {
    // the walking hints at the plaza, then the E hint near Maya Brooks
    const st = T.steps[0];
    stepFor(60.5);
    if (T.state().hint !== st.hints[0])
      fails.push(`no hint 1 after 60 s (hint: ${T.state().hint})`);
    stepFor(60);
    if (T.state().hint !== st.hints[1])
      fails.push(`no hint 2 after 120 s (hint: ${T.state().hint})`);
    const [sx, sz] = T.standPoint();
    T.placePlayer(sx, sz + 2); // about 2 m to walk
    stepFor(20.5);
    if (
      T.state().hint !==
      "Walk up to Maya Brooks and press E when the prompt appears."
    )
      fails.push(`no E hint after 20 s within 6 m (hint: ${T.state().hint})`);
  }
  let testedWait = false;
  while (T.state().phase !== "done" && !fails.length) {
    const s = T.state(),
      st = T.steps[s.step - 1];
    if (s.phase === "roleChange" || s.phase === "waiting") {
      if (!stepUntil(() => T.state().phase !== s.phase, 20))
        fails.push(`step ${s.step}: stuck in '${s.phase}'`);
      continue;
    }
    if (s.phase !== "active") {
      fails.push(`step ${s.step}: unexpected phase '${s.phase}'`);
      break;
    }
    if (order.at(-1) !== s.step) order.push(s.step);
    // the figure the player is being is hidden; the couch stays empty until Jordan lies down
    if (s.step <= 2 && J.patient.visible)
      fails.push(`step ${s.step}: Jordan's figure is shown`);
    if (s.step >= 3 && J.therapist.visible)
      fails.push(`step ${s.step}: Morgan Reed's figure is shown`);
    if (s.step <= 5 && J.couchPatient.visible)
      fails.push(`step ${s.step}: the vault 1 couch patient is shown`);
    stepFor(0.2); // the marker's route for the step
    routes++;
    if (T.routeHitsWall())
      fails.push(
        `step ${s.step}: the marker route crosses a wall: ${JSON.stringify(T.route())}`,
      );
    if (st.trigger === "pressE") {
      const [x, z] = T.standPoint();
      T.placePlayer(x, z);
      step();
      T.pressE();
      if (st.exchange) {
        if (T.state().phase !== "dialog")
          fails.push(`step ${s.step}: E did not open the check-in`);
        T.cont();
      } else if (st.decision) {
        if (T.state().phase !== "dialog") {
          fails.push(`step ${s.step}: E did not open the decision`);
          break;
        }
        const right = st.decision.options.find((o) => o.correct),
          miss = st.decision.options.find((o) => !o.correct);
        if (wrong) {
          for (let i = 1; i <= 3; i++) {
            T.answer(miss.id);
            const m = T.state();
            if (m.misses !== i || m.resolved !== (i === 3))
              fails.push(
                `step ${s.step}: after miss ${i}, misses ${m.misses}, answer shown ${m.resolved}`,
              );
          }
        } else {
          T.answer(right.id);
          if (!T.state().resolved || T.state().misses)
            fails.push(`step ${s.step}: the right answer was not accepted`);
        }
        T.cont();
      }
      if (T.state().step === s.step && T.state().phase === "active")
        fails.push(
          `step ${s.step}: E at ${st.target.name} did not reach the tutorial's target`,
        );
    } else if (st.trigger === "enterRoom") {
      const [x, z] = T.standPoint();
      T.placePlayer(x, z);
      if (!stepUntil(() => T.state().step !== s.step, 120))
        fails.push(`step ${s.step}: not completed in ${st.target.place}`);
    } else {
      // escort: walk beside Jordan; on run 1's walk to Vault 1, run ahead once and come back
      const follow = () => {
        const p = xz(J.patient);
        T.placePlayer(p.x + 0.8, p.z + 0.8);
      };
      let frames = 0;
      const going = () =>
        T.state().step === s.step && T.state().phase === "active";
      while (going() && frames++ < (STEP_LIMIT_S * 1000) / STEP_MS) {
        if (wrong && s.step === 5 && !testedWait && frames === 240) {
          testedWait = true;
          T.placePlayer(73.15, -15.3); // inside Vault 1: far ahead of Jordan
          const held = stepUntil(() => T.state().escortHolding, 30);
          const at = xz(J.patient);
          stepFor(2);
          const still = xz(J.patient);
          if (!held)
            fails.push("step 5: Jordan did not wait at a stop for the player");
          else if (Math.hypot(still.x - at.x, still.z - at.z) > 1e-6)
            fails.push("step 5: Jordan moved on while waiting");
          if (T.state().hint !== "Wait for Jordan")
            fails.push(
              `step 5: no "Wait for Jordan" while far ahead (hint: ${T.state().hint})`,
            );
        }
        follow();
        step();
      }
      if (going()) fails.push(`step ${s.step}: Jordan did not arrive`);
    }
    if (s.step === 2) {
      const c = T.chair();
      if (
        !c ||
        Math.hypot(
          c.x - NPC.LOBBY_PICKUP.chair.x,
          c.z - NPC.LOBBY_PICKUP.chair.z,
        ) > 1
      )
        fails.push(
          `step 2: the chair is not the journey's pickup chair (${JSON.stringify(c)})`,
        );
    }
  }
  if (!fails.length) {
    if (
      JSON.stringify(order) !==
      JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    )
      fails.push(`steps played ${JSON.stringify(order)}`);
    if (!T.state().endOpen) fails.push("no end card");
    if (wrong && !testedWait) fails.push("Jordan's wait was not exercised");
  }
  report(
    `${name}: steps`,
    fails,
    `${order.length} of 11 steps completed, ${routes} marker routes clear of the walls`,
  );
  report(
    `${name}: walls`,
    wallHits,
    `${movesSeen.size} tutorial moves, the ${WALL_R} m circle round every walker clear of the wall colliders on every frame`,
  );
  // leaving
  const leave = [];
  if (!T.state().endOpen) {
    leave.push("the run did not reach the end card");
    T.toTitle();
  } else {
    if (wrong) {
      const before = T.playerPos();
      T.keepExploring();
      const after = T.playerPos();
      if (T.mode() !== "free")
        leave.push(`Keep exploring went to '${T.mode()}'`);
      if (Math.hypot(after[0] - before[0], after[1] - before[1]) > 1e-6)
        leave.push(
          `Keep exploring moved the player from ${before} to ${after}`,
        );
    } else {
      T.mainMenu();
      if (T.mode() !== "title") leave.push(`Main menu went to '${T.mode()}'`);
    }
  }
  const now = worldState();
  if (now !== BASELINE)
    leave.push(`world after leaving: ${now}`, `journey reset: ${BASELINE}`);
  report(
    `${name}: leaving`,
    leave,
    `${wrong ? "Keep exploring" : "Main menu"}; the journey actors, people and lasers as the journey reset leaves them`,
  );
}

play(true);
play(false);

let failed = false;
for (const r of results) {
  console.log(
    `TUTORIAL CHECK ${r.part} ${r.pass ? "PASS" : "FAIL"}: ${r.summary}`,
  );
  if (!r.pass) {
    failed = true;
    for (const f of r.fails.slice(0, MAX_DETAIL)) console.log(`  ${f}`);
  }
}
process.exit(failed ? 1 : 0);
```

- [ ] **3b-3.2: Run it (expected FAIL, setup error):** from `apps/web`, `pnpm build:arcade && node scripts/sim-hub-tutorial-check.mjs; echo "exit $?"`. Expected: `TUTORIAL CHECK setup error: window.__TUTORIAL missing (src/tutorial.ts initTutorial did not run)`, `exit 2`.
- [ ] **3b-3.3: Write `tutorial.ts`:**

```ts
/* The sim-hub tutorial, Chapter 1 (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3):
   wires the pure step machine (tutorial-machine.ts) into the world. Entering play mode 'tutorial'
   resets the treatment journey (resetTreatmentJourney(true)), hides the figure the player is being
   and plays the steps: the tracker, the door-by-door marker (built with the NPC route builder
   movementPathFor, so it goes through doors and room graphs, never walls), the check-in and the
   decisions, the role change, Jordan's escorts with their waits, the vault door, the beam and the
   end card. Leaving play mode 'tutorial' resets the journey again, so the world is left as the NPC
   check expects. Outside the tutorial nothing here runs: updateTutorial returns at once, and the E
   targets are made on the first start and disabled otherwise. With ?npccheck it exposes
   window.__TUTORIAL for scripts/sim-hub-tutorial-check.mjs. */
import * as THREE from "three";
import { S } from "./state";
import { camera, scene } from "./scene";
import { ROOMS } from "./rooms";
import {
  player,
  PLAYER_EYE_Y,
  REACH_Y,
  PRIMARY_NPCS,
  roomById,
  doors,
} from "./main";
import {
  getColliders,
  doorPoint,
  insidePoint,
  roomContainingWalkPoint,
  setDoorTarget,
  requestWalkPointerLock,
} from "./walk";
import { registerInteractable, performInteraction } from "./interact";
import {
  movementPathFor,
  seatNear,
  seatActor,
  actorHasTransition,
} from "./npc-behavior";
import { poseCharacter, faceNpcToward, setPatientGown } from "./npc";
import {
  JOURNEY,
  LOBBY_PICKUP,
  moveJourneyActor,
  resetTreatmentJourney,
  journeySpeech,
  journeyIntercom,
  workflowTransitions,
} from "./journey";
import { workflowState } from "./equipment";
import { seatInWorld, ROOM_LASERS } from "./props";
import type { SeatAnchor } from "./props";
import { getPlayMode, enterMode, onPlayModeChange } from "./play-mode";
import { setPaused } from "./pause";
import { registerDialog } from "./dialogs";
import { setTutorialAvailable } from "./menu";
import {
  CHAPTER_1,
  LINES,
  ROLES,
  TUTORIAL_TIMING,
  WORLD,
} from "./tutorial-steps";
import type { Role, Step, StepAction } from "./tutorial-steps";
import { OFF, progressOf, reduceTutorial } from "./tutorial-machine";
import type { Effect, TutorialEvent, TutorialState } from "./tutorial-machine";
import {
  ESCORT_WAIT_R,
  MARKER_SWITCH_R,
  advanceStop,
  closestOnSegment,
  dist,
  edgeArrow,
  escortAhead,
  escortStops,
  formatDistance,
  invSmoothstep,
  lineBlocked,
  offRoute,
  remainingDistance,
  routeLength,
  smoothstep,
  stepEscort,
} from "./tutorial-math";
import type { EscortHold, Pt } from "./tutorial-math";
import * as hud from "./tutorial-hud";

/** A journey move as equipment.ts updateWorkflowTransitions runs it (journey.ts beginJourneyMove). */
interface Move {
  actor: THREE.Object3D;
  curve: THREE.CurvePath<THREE.Vector3>;
  start: number;
  duration: number;
  rise: unknown;
}
interface Leg {
  from: string;
  to: string;
  final: Pt;
  arrive?: () => void;
}
interface Escort {
  legs: Leg[];
  leg: number;
  moving: boolean;
  t: Move | null;
  stops: number[];
  hold: EscortHold;
  length: number;
}

const PARKED_Y = -50; // an E target off duty sits far below the floor
const ANCHOR_RANGE = { actor: 2.4, seat: 2.0, segment: 2.2 };
const ROUTE_REFRESH_S = 1;
const DOOR_OPEN_R = 6; // a door opens for Jordan this far ahead

let machine: TutorialState = OFF;
let active = false;
let dispatching = false;
const queue: TutorialEvent[] = [];
let chair: SeatAnchor | null = null;
let seatedAt: THREE.Vector3 | null = null;
let vaultHeld = false;
let dialogOpen = false,
  roleCardOpen = false,
  endOpen = false;
let lastAnswer: string | null = null;
const timers = new Set<ReturnType<typeof setTimeout>>();
let route: Pt[] = [];
let stopIdx = 1;
let routeFor = "";
let routeAge = 0;
let escort: Escort | null = null;
const anchors: { step: Step; obj: THREE.Object3D }[] = [];
const doorPts: [string, Pt][] = [];
// made on first use: an Object3D draws Math.random for its uuid, and the NPC check seeds Math.random
let proxy: THREE.Object3D | null = null;
const markerWorld = new THREE.Vector3(),
  markerView = new THREE.Vector3();

const at = (p: Pt) => new THREE.Vector3(p[0], 0, p[1]);
const xzOf = (o: THREE.Object3D): Pt => {
  const w = o.getWorldPosition(new THREE.Vector3());
  return [w.x, w.z];
};
const actorOf = (a: "maya" | "jordan") =>
  a === "maya" ? PRIMARY_NPCS.lobby : JOURNEY.patient;

function after(ms: number, fn: () => void): void {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

function doorPoints(): [string, Pt][] {
  if (!doorPts.length)
    for (const r of ROOMS)
      if (!r.hub && doors.has(r.id)) {
        const p = doorPoint(r);
        doorPts.push([r.id, [p.x, p.z]]);
      }
  return doorPts;
}

function setLasers(on: boolean): void {
  for (const l of ROOM_LASERS.vault1 ?? []) l.visible = on;
}

function dispatch(ev: TutorialEvent): void {
  queue.push(ev);
  if (dispatching) return;
  dispatching = true;
  while (queue.length) {
    const r = reduceTutorial(machine, queue.shift()!);
    machine = r.state;
    for (const e of r.effects) perform(e);
  }
  dispatching = false;
}

function perform(e: Effect): void {
  switch (e.type) {
    case "showStep": {
      const st = CHAPTER_1[e.step - 1];
      hud.showTracker({
        role: ROLES[st.role],
        step: st.n,
        total: CHAPTER_1.length,
        objective: st.objective,
        progress: progressOf(machine),
      });
      route = [];
      routeFor = "";
      return;
    }
    case "action":
      ACTIONS[e.action]();
      return;
    case "openDialog":
      openDialog(CHAPTER_1[e.step - 1]);
      return;
    case "feedback": {
      const right = CHAPTER_1[machine.step - 1]?.decision?.options.find(
        (o) => o.correct,
      );
      hud.showFeedback(e.kind, e.text, lastAnswer, right?.id ?? null);
      return;
    }
    case "closeDialog":
      closeDialog();
      return;
    case "hint":
      hud.setHint(e.text);
      return;
    case "roleChange":
      roleChange(e.role);
      return;
    case "complete":
      openEnd();
      return;
  }
}

/* ---- dialogs, the role change and the end card (each pauses the game) ---- */
function openDialog(st: Step): void {
  dialogOpen = true; // before the lock goes, so losing it opens no settings menu
  if (st.exchange) hud.openExchange("Check-in", st.exchange);
  else if (st.decision) hud.openDecision(st.decision);
  setPaused("tutorial", true);
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeDialog(): void {
  if (!dialogOpen) return;
  dialogOpen = false;
  lastAnswer = null;
  hud.closeDialog();
  setPaused("tutorial", false);
  requestWalkPointerLock();
}
function answer(id: string): void {
  lastAnswer = id;
  dispatch({ type: "answered", option: id });
}
function roleChange(role: Role): void {
  roleCardOpen = true;
  setPaused("tutorial", true);
  hud.placeMarker(null);
  hud.placeEdge(null);
  hud.setFade(true);
  after(TUTORIAL_TIMING.roleFadeMs, () => {
    becomeRole(role);
    hud.showRoleCard(ROLES[role]);
    after(TUTORIAL_TIMING.roleCardMs, () => {
      hud.showRoleCard(null);
      hud.setFade(false);
      after(TUTORIAL_TIMING.roleFadeMs, () => {
        roleCardOpen = false;
        setPaused("tutorial", false);
        dispatch({ type: "roleChangeDone" });
      });
    });
  });
}
/* Under the black: Jordan's figure sits in the chair the player used, Morgan Reed's figure goes
   (the player is now Morgan) and the player stands at the LINAC Control console. */
function becomeRole(role: Role): void {
  if (role !== "therapist") return;
  seatedAt = null;
  const p = JOURNEY.patient;
  p.visible = true;
  p.userData.shouldSit = true;
  if (chair) seatActor(p, chair);
  JOURNEY.therapist.visible = false;
  const t = WORLD.therapistStart;
  player.pos.set(t.x, PLAYER_EYE_Y, t.z);
  player.yaw = t.yaw;
  player.pitch = t.pitch;
  camera.position.copy(player.pos);
  workflowState(
    "linaccontrol",
    "PATIENT READY",
    "Jordan Ellis checked in · waiting in reception",
    "#6fb6ff",
  );
  journeySpeech(JOURNEY.controlPartner, LINES.controlAlert, "staff", 11000);
}
function openEnd(): void {
  endOpen = true;
  hud.placeMarker(null);
  hud.placeEdge(null);
  hud.showEnd(true);
  setPaused("tutorial", true);
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeEnd(): boolean {
  if (!endOpen) return false;
  endOpen = false;
  hud.showEnd(false);
  setPaused("tutorial", false);
  return true;
}
function mainMenu(): void {
  if (closeEnd()) enterMode("title");
}
/* Free mode where the player stands: enterMode('free') places the player at the plaza (menu.ts),
   so the place and the view are put back after it. */
function keepExploring(): void {
  if (!closeEnd()) return;
  const pos = player.pos.clone(),
    yaw = player.yaw,
    pitch = player.pitch;
  enterMode("free");
  player.pos.copy(pos);
  player.yaw = yaw;
  player.pitch = pitch;
  camera.position.copy(pos);
  requestWalkPointerLock();
}

/* ---- the world actions the steps name (tutorial-steps.ts StepAction) ---- */
const ACTIONS: Record<StepAction, () => void> = {
  // the journey's pickup chair when it is free, else the free waiting chair nearest it
  pickChair: () => {
    chair =
      seatNear(LOBBY_PICKUP.chair, 1.0, JOURNEY.patient) ||
      seatNear(LOBBY_PICKUP.chair, 6, JOURNEY.patient);
  },
  sitPlayer: () => {
    if (!chair) return;
    const s = seatInWorld(chair),
      back = 0.12; // the hips sit this far behind the anchor (npc-behavior.ts seatActor)
    seatedAt = new THREE.Vector3(
      s.x - Math.sin(s.facing) * back,
      s.top + WORLD.seatedEyeAboveSeat,
      s.z - Math.cos(s.facing) * back,
    );
    player.pos.copy(seatedAt);
    player.yaw = s.facing + Math.PI;
    player.pitch = -0.05;
    camera.position.copy(seatedAt);
  },
  intercomToControl: () =>
    journeyIntercom(PRIMARY_NPCS.lobby, LINES.intercomToControl, 9000),
  jordanConfirms: () =>
    journeySpeech(JOURNEY.patient, LINES.jordanConfirms, "patient", 10000),
  escortToVault: () => {
    workflowState(
      "lobby",
      "IN TRANSIT",
      "Jordan and therapist en route to Vault 1",
      "#42d5cf",
    );
    workflowState(
      "vault1",
      "PATIENT ARRIVING",
      "Treatment team preparing room",
      "#6fb6ff",
    );
    startEscort([
      {
        from: "lobby",
        to: "vault1",
        final: WORLD.changingArea,
        arrive: () => {
          setPatientGown(JOURNEY.patient, true);
          setPatientGown(JOURNEY.couchPatient, true);
          journeySpeech(JOURNEY.patient, LINES.jordanChanged, "patient", 10000);
        },
      },
      {
        from: "vault1",
        to: "vault1",
        final: WORLD.couchSide,
        arrive: () =>
          workflowState(
            "vault1",
            "PATIENT SETUP",
            "Preparing Jordan for daily treatment position",
            "#ffb454",
          ),
      },
    ]);
  },
  // the journey's vault setup pose: Jordan's figure gives way to the couch patient, in a gown
  jordanOnCouch: () => {
    JOURNEY.patient.visible = false;
    JOURNEY.couchPatient.visible = true;
    setPatientGown(JOURNEY.couchPatient, true);
    workflowState(
      "vault1",
      "PATIENT SETUP",
      "Jordan on couch · accessories and indexing verified",
      "#ffb454",
    );
  },
  lasersOn: () => setLasers(true),
  jamieAcrossCouch: () => {
    const v = JOURNEY.vaultTherapist;
    moveJourneyActor(
      v,
      "vault1",
      "vault1",
      at(WORLD.jamieAcross),
      () => {
        faceNpcToward(v, JOURNEY.couchPatient);
        poseCharacter(v, "support");
        journeySpeech(v, LINES.jamieSetup, "staff", 11000);
      },
      1.2,
    );
  },
  jamieToControl: () => {
    const v = JOURNEY.vaultTherapist;
    journeySpeech(v, LINES.jamieLeaving, "staff", 10000);
    moveJourneyActor(
      v,
      "vault1",
      "linaccontrol",
      at(WORLD.jamieControl),
      () => {
        v.rotation.y = -Math.PI / 2; // facing the console
        poseCharacter(v, "console");
      },
      1.88,
    );
  },
  holdVaultClosed: () => {
    vaultHeld = true;
    setDoorTarget("vault1", false);
    workflowState(
      "vault1",
      "READY TO TREAT",
      "Jordan positioned · therapists in treatment control",
      "#ffb454",
    );
    workflowState(
      "linaccontrol",
      "IMAGE REVIEW",
      "Jordan Ellis · check images at the console",
      "#6fb6ff",
    );
  },
  shiftApplied: () => {
    workflowState(
      "linaccontrol",
      "IMAGE REVIEW",
      "Jordan Ellis · couch correction applied and verified",
      "#6fb6ff",
    );
    journeySpeech(JOURNEY.controlPartner, LINES.shiftVerified, "staff", 10000);
  },
  beamOn: () => {
    workflowState(
      "vault1",
      "BEAM ON",
      "Treatment delivery · patient monitored remotely",
      "#ff737b",
    );
    workflowState(
      "linaccontrol",
      "MONITORING",
      "Vault 1 treatment in progress · CCTV and intercom active",
      "#ff737b",
    );
  },
  beamOff: () => {
    workflowState(
      "vault1",
      "TREATMENT COMPLETE",
      "Beam delivery complete · room re-entry",
      "#65dda0",
    );
    workflowState(
      "linaccontrol",
      "COMPLETE",
      "Therapists returning to Vault 1",
      "#65dda0",
    );
  },
  releaseVaultDoor: () => {
    vaultHeld = false;
  },
  jamieBackIn: () => {
    const v = JOURNEY.vaultTherapist;
    moveJourneyActor(
      v,
      "linaccontrol",
      "vault1",
      at(WORLD.jamieBack),
      () => {
        faceNpcToward(v, JOURNEY.couchPatient);
        poseCharacter(v, "support");
      },
      1.88,
    );
  },
  jordanOffCouch: () => {
    const p = JOURNEY.patient;
    JOURNEY.couchPatient.visible = false;
    setPatientGown(JOURNEY.couchPatient, false);
    setPatientGown(p, false);
    p.position.set(WORLD.offCouch[0], 0, WORLD.offCouch[1]);
    p.rotation.y = Math.atan2(
      player.pos.x - p.position.x,
      player.pos.z - p.position.z,
    );
    p.visible = true;
    setLasers(false);
    workflowState(
      "vault1",
      "ROOM TURNOVER",
      "Patient leaving · room reset begins",
      "#42d5cf",
    );
    journeySpeech(p, LINES.jordanOffCouch, "patient", 10000);
  },
  escortToLobby: () => {
    workflowState(
      "lobby",
      "DEPARTING",
      "Jordan Ellis · treatment complete",
      "#65dda0",
    );
    workflowState("vault1", "AVAILABLE", "Room turnover complete", "#65dda0");
    workflowState(
      "linaccontrol",
      "READY",
      "Preparing for next scheduled patient",
      "#42d5cf",
    );
    startEscort([
      {
        from: "vault1",
        to: "lobby",
        final: WORLD.lobbyDesk,
        arrive: () => faceNpcToward(JOURNEY.patient, PRIMARY_NPCS.lobby),
      },
    ]);
  },
  jordanThanks: () =>
    journeySpeech(JOURNEY.patient, LINES.jordanThanks, "patient", 10000),
};

/* ---- Jordan's escorts: the journey's moves, held at each door and corner for the player ---- */
function startEscort(legs: Leg[]): void {
  escort = {
    legs,
    leg: 0,
    moving: false,
    t: null,
    stops: [],
    hold: { next: 0, holding: false },
    length: 0,
  };
}
function beginLeg(): void {
  const i = escort.leg,
    L = escort.legs[i];
  escort.moving = true;
  moveJourneyActor(
    JOURNEY.patient,
    L.from,
    L.to,
    at(L.final),
    () => legDone(i),
    WORLD.escortSpeed,
  );
  attachLeg();
}
// The move's entry, once it exists (a move queued behind another starts when that one ends).
function attachLeg(): void {
  const t = (workflowTransitions as Move[]).find(
    (w) => w.actor === JOURNEY.patient,
  );
  if (!t) return;
  const pts = curvePoints(t.curve);
  escort.t = t;
  escort.stops = escortStops(
    pts,
    doorPoints().map(([, p]) => p),
  );
  escort.hold = { next: 0, holding: false };
  escort.length = routeLength(pts);
  // at walking pace: the journey caps a move at 32 s, which on the 100 m walk to the vault is a run
  t.duration = Math.max(t.duration, escort.length / WORLD.escortSpeed);
}
function legDone(i: number): void {
  if (!escort || escort.leg !== i) return;
  escort.legs[i].arrive?.();
  escort.t = null;
  escort.moving = false;
  if (i + 1 < escort.legs.length) {
    escort.leg = i + 1; // starts when the player is within ESCORT_WAIT_R
    return;
  }
  escort = null;
  dispatch({ type: "reachedTarget" });
}
/** One frame of the escort: Jordan's distance to the player and Jordan's walk still to go. */
function updateEscort(): { gap: number; remaining: number } | null {
  if (!escort) return null;
  const p = JOURNEY.patient,
    jp = p.position, // Jordan's figure is a scene child: local is world
    gap = Math.hypot(player.pos.x - jp.x, player.pos.z - jp.z);
  if (!escort.moving && gap <= ESCORT_WAIT_R) beginLeg();
  else if (escort.moving && !escort.t) attachLeg();
  let e = 0;
  const t = escort.t;
  if (t && !t.rise) {
    e = smoothstep((S.simSec - t.start) / t.duration);
    const r = stepEscort(escort.hold, e, escort.stops, gap);
    escort.hold = r.hold;
    if (r.holdAt !== null) {
      // keep the move at the stop: its clock restarts from there when the player comes
      t.start = S.simSec - invSmoothstep(r.holdAt) * t.duration;
      p.position.copy(t.curve.getPoint(r.holdAt));
      poseCharacter(p, "neutral");
      e = r.holdAt;
    }
  }
  for (const [id, d] of doorPoints())
    if (Math.hypot(jp.x - d[0], jp.z - d[1]) < DOOR_OPEN_R)
      setDoorTarget(id, true);
  let remaining = t ? (1 - e) * escort.length : 0,
    from: Pt = escort.moving ? escort.legs[escort.leg].final : [jp.x, jp.z];
  for (
    let k = escort.leg + (escort.moving ? 1 : 0);
    k < escort.legs.length;
    k++
  ) {
    remaining += dist(from, escort.legs[k].final);
    from = escort.legs[k].final;
  }
  return { gap, remaining };
}

/* ---- the marker: door by door along the walking route ---- */
function curvePoints(curve: THREE.CurvePath<THREE.Vector3>): Pt[] {
  const cs = curve.curves as THREE.LineCurve3[];
  if (!cs.length) return [];
  const last = cs[cs.length - 1].v2;
  return [...cs.map((c) => [c.v1.x, c.v1.z] as Pt), [last.x, last.z]];
}
/** Where the marker leads for a step: the spot to stand at for an E target, the room's inside
    point, or the escort's end. */
function destination(st: Step, p: Pt): Pt {
  const sp = st.target.spec;
  if (sp.kind === "actor") {
    if (sp.stand) return sp.stand;
    const a = actorOf(sp.actor),
      [x, z] = xzOf(a);
    return [x + Math.sin(a.rotation.y) * 1.1, z + Math.cos(a.rotation.y) * 1.1];
  }
  if (sp.kind === "seat") {
    if (!chair) return WORLD.checkIn;
    const s = seatInWorld(chair);
    return [s.x + Math.sin(s.facing) * 0.6, s.z + Math.cos(s.facing) * 0.6];
  }
  if (sp.kind === "segment") {
    // in front of the edge where the player is nearest it, on the stand side
    const q = closestOnSegment(p, sp.a, sp.b),
      o = closestOnSegment(sp.stand, sp.a, sp.b),
      n = dist(sp.stand, o) || 1;
    return [
      q[0] + ((sp.stand[0] - o[0]) / n) * 0.7,
      q[1] + ((sp.stand[1] - o[1]) / n) * 0.7,
    ];
  }
  if (sp.kind === "room") {
    const p = insidePoint(roomById(sp.roomId));
    return [p.x, p.z];
  }
  return sp.final;
}
/* The walking route from the player: from the plaza in through the main entrance, then the NPC
   route builder's (out through the room's door and graph, the corridors, in through the target
   room's door and graph). */
function buildRoute(st: Step): Pt[] {
  const p: Pt = [player.pos.x, player.pos.z],
    dest = destination(st, p),
    pre: Pt[] = [];
  let from = p;
  if (
    !roomContainingWalkPoint(p[0], p[1]) &&
    p[1] > WORLD.plazaZ &&
    Math.abs(p[0]) < WORLD.plazaHalfX
  ) {
    pre.push(p, WORLD.entranceOut);
    from = WORLD.entranceIn;
  }
  proxy ??= new THREE.Object3D();
  proxy.position.set(from[0], 0, from[1]);
  const pts = curvePoints(
    movementPathFor(proxy, null, st.target.roomId, at(dest)),
  );
  const out = [...pre, ...(pts.length > 1 ? pts : [from, dest])];
  return out.length > 1 ? out : [p, dest];
}
/** The marker and the tracker's distance for this frame; returns the walking distance. */
function updateMarker(st: Step, dt: number): number {
  const p: Pt = [player.pos.x, player.pos.z],
    key = `${st.n}|${roomContainingWalkPoint(p[0], p[1])?.id ?? "out"}`;
  routeAge += dt;
  if (
    key !== routeFor ||
    route.length < 2 ||
    routeAge >= ROUTE_REFRESH_S ||
    offRoute(route, stopIdx, p)
  ) {
    route = buildRoute(st);
    stopIdx = 1;
    routeFor = key;
    routeAge = 0;
  }
  stopIdx = advanceStop(route, stopIdx, p);
  const d = remainingDistance(route, stopIdx, p);
  hud.setDistance(formatDistance(d));
  const stop = route[stopIdx];
  // at the last stop the E prompt or the room takes over
  const there =
    stop && stopIdx === route.length - 1 && dist(p, stop) < MARKER_SWITCH_R;
  if (machine.phase !== "active" || !stop || there) {
    hud.placeMarker(null);
    hud.placeEdge(null);
    return d;
  }
  const label = `${st.target.place} · ${formatDistance(d)}`;
  camera.updateMatrixWorld();
  markerWorld.set(stop[0], 1.6, stop[1]);
  const behind =
    markerView.copy(markerWorld).applyMatrix4(camera.matrixWorldInverse).z > 0;
  markerWorld.project(camera);
  const a = edgeArrow(markerWorld.x, markerWorld.y, behind, 0.06);
  if (!a.onScreen) {
    hud.placeMarker(null);
    hud.placeEdge({ x: a.x, y: a.y, angle: a.angle, label });
  } else if (lineBlocked(p, stop, getColliders())) {
    // never through a wall: hide it and rebuild the route from here next frame
    hud.placeMarker(null);
    hud.placeEdge(null);
    routeAge = ROUTE_REFRESH_S;
  } else {
    hud.placeEdge(null);
    hud.placeMarker({ x: a.x, y: a.y, label });
  }
  return d;
}

/* ---- the E targets: one per press-E step, enabled only while that step is waiting for E ---- */
function anchorPoint(st: Step, p: Pt): Pt | null {
  const sp = st.target.spec;
  if (sp.kind === "actor") return xzOf(actorOf(sp.actor));
  if (sp.kind === "seat") {
    if (!chair) return null;
    const s = seatInWorld(chair);
    return [s.x, s.z];
  }
  if (sp.kind === "segment") return closestOnSegment(p, sp.a, sp.b);
  return null;
}
/* At reach height over the target (a person's own interactable is at their feet, so this one is
   always nearer), or the point of a desk or couch edge nearest the player (in front of every
   screen or panel behind that edge). */
function ensureAnchors(): void {
  if (anchors.length) return;
  for (const st of CHAPTER_1) {
    if (st.trigger !== "pressE") continue;
    const obj = new THREE.Object3D(); // no mesh: the E prompt sits at its point (hud-prompt.ts)
    obj.position.set(0, PARKED_Y, 0);
    scene.add(obj);
    const kind = st.target.spec.kind as keyof typeof ANCHOR_RANGE;
    registerInteractable(
      obj,
      st.target.label,
      "",
      ANCHOR_RANGE[kind],
      null,
      () => dispatch({ type: "pressedE", target: st.target.id }),
      {
        enabled: () =>
          active && machine.phase === "active" && machine.step === st.n,
      },
    );
    anchors.push({ step: st, obj });
  }
}

/* ---- start, exit and the frame ---- */
function startTutorial(): void {
  if (active) exitTutorial();
  ensureAnchors();
  resetTreatmentJourney(true);
  active = true;
  JOURNEY.patient.visible = false; // the player is Jordan
  JOURNEY.couchPatient.visible = false; // the couch stays empty until Jordan lies down
  JOURNEY.patient.userData.tutorialLocked = true;
  JOURNEY.vaultTherapist.userData.tutorialLocked = true;
  setLasers(false);
  workflowState(
    "linaccontrol",
    "READY",
    "Vault 1 scheduled for Jordan Ellis",
    "#42d5cf",
  );
  workflowState("vault1", "AVAILABLE", "Awaiting patient arrival", "#65dda0");
  dispatch({ type: "start" });
}
function exitTutorial(): void {
  active = false;
  for (const id of timers) clearTimeout(id);
  timers.clear();
  queue.length = 0;
  machine = OFF;
  hud.hideTutorialHud();
  dialogOpen = roleCardOpen = endOpen = false;
  lastAnswer = null;
  setPaused("tutorial", false);
  if (seatedAt) player.pos.y = PLAYER_EYE_Y;
  seatedAt = null;
  vaultHeld = false;
  escort = null;
  chair = null;
  route = [];
  routeFor = "";
  for (const a of [JOURNEY.patient, JOURNEY.vaultTherapist]) {
    a.userData.tutorialLocked = false;
    a.userData.inHandoff = false;
  }
  JOURNEY.therapist.visible = true;
  setLasers(true);
  resetTreatmentJourney(true);
}

/** Called every simulation frame (main.ts stepSimulation, after the journey moves). */
export function updateTutorial(dt: number): void {
  if (!active) return;
  if (seatedAt) {
    player.pos.copy(seatedAt); // seated: no walking
    camera.position.copy(seatedAt);
  }
  if (vaultHeld) setDoorTarget("vault1", false); // closed for the beam, whoever walks up to it
  const esc = updateEscort(),
    st = CHAPTER_1[machine.step - 1];
  if (!st) return;
  const p: Pt = [player.pos.x, player.pos.z];
  for (const a of anchors) {
    const q = a.step.n === machine.step ? anchorPoint(a.step, p) : null;
    if (q) a.obj.position.set(q[0], REACH_Y, q[1]);
    else a.obj.position.y = PARKED_Y;
  }
  if (machine.phase !== "active" && machine.phase !== "waiting") {
    hud.placeMarker(null);
    hud.placeEdge(null);
    return;
  }
  // in LINAC Control, with Jamie Williams out of the vault too: nobody stays in for the beam
  if (
    machine.phase === "active" &&
    st.trigger === "enterRoom" &&
    roomContainingWalkPoint(p[0], p[1])?.id === st.target.roomId &&
    !actorHasTransition(JOURNEY.vaultTherapist)
  ) {
    dispatch({ type: "reachedTarget" });
    return;
  }
  const d = updateMarker(st, dt);
  dispatch({
    type: "tick",
    dt,
    distance: esc ? esc.remaining : d,
    escortAhead: !!esc && escortAhead(esc.gap, d, esc.remaining),
  });
}

function installCheckHook(): void {
  if (
    typeof location === "undefined" ||
    !new URLSearchParams(location.search).has("npccheck")
  )
    return;
  Object.assign(window, {
    __TUTORIAL: {
      steps: CHAPTER_1,
      /** As the title menu's Tutorial entry does. */
      enter: () => enterMode("tutorial"),
      mode: () => getPlayMode(),
      state: () => ({
        ...machine,
        active,
        seated: !!seatedAt,
        vaultHeld,
        dialogOpen,
        roleCardOpen,
        endOpen,
        escortHolding: !!escort?.hold.holding,
      }),
      /** Where the marker leads for the current step. */
      standPoint: () =>
        machine.step
          ? destination(CHAPTER_1[machine.step - 1], [
              player.pos.x,
              player.pos.z,
            ])
          : null,
      placePlayer: (x: number, z: number, yaw?: number) => {
        player.pos.set(x, PLAYER_EYE_Y, z);
        if (yaw !== undefined) player.yaw = yaw;
        camera.position.copy(player.pos);
      },
      playerPos: () => [player.pos.x, player.pos.z],
      pressE: () => performInteraction(),
      answer,
      cont: () => dispatch({ type: "continue" }),
      mainMenu,
      keepExploring,
      /** Leaves the tutorial from anywhere, as Settings > Main menu does. */
      toTitle: () => enterMode("title"),
      route: () => route.map((q) => [q[0], q[1]]),
      routeHitsWall: () =>
        route.some(
          (q, i) => i > 0 && lineBlocked(route[i - 1], q, getColliders()),
        ),
      lasersOn: () => (ROOM_LASERS.vault1 ?? []).every((l) => l.visible),
      chair: () => (chair ? seatInWorld(chair) : null),
    },
  });
}

/** Boot (main.ts): the screen, Esc, the play-mode switch, the menu entry and the check hook. */
export function initTutorial(): void {
  hud.initTutorialHud({
    answer,
    cont: () => dispatch({ type: "continue" }),
    mainMenu,
    keepExploring,
  });
  registerDialog(
    "tutorial",
    () => dialogOpen || roleCardOpen || endOpen,
    () => {
      if (dialogOpen) dispatch({ type: "closeDialog" });
      else if (endOpen) keepExploring();
    },
  );
  onPlayModeChange((m) => {
    if (m === "tutorial") startTutorial();
    else if (active) exitTutorial();
  });
  setTutorialAvailable(true);
  installCheckHook();
}
```

- [ ] **3b-3.4: `main.ts`, three insertions.** Old: `import { installMenu } from './menu';` New:

```ts
import { installMenu } from "./menu";
import { initTutorial, updateTutorial } from "./tutorial";
```

Old (in `stepSimulation`): `	updateWorkflowTransitions(sec);` New:

```ts
updateWorkflowTransitions(sec);
updateTutorial(dt);
```

(After the journey moves, so the escort's hold and the door holds win this frame; it runs only when the game is not paused, since PR 1's `animate` skips `stepSimulation` then.) Old: `installMenu();` New:

```ts
installMenu();
// after installMenu, which starts with the Tutorial entry disabled (menu.ts)
initTutorial();
```

- [ ] **3b-3.5: Run the check (expected PASS)** (from `apps/web`): `pnpm build:arcade && node scripts/sim-hub-tutorial-check.mjs; echo "exit $?"`. Expected, exactly:

```
TUTORIAL CHECK run 1 (wrong answers): steps PASS: 11 of 11 steps completed, 11 marker routes clear of the walls
TUTORIAL CHECK run 1 (wrong answers): walls PASS: 6 tutorial moves, the 0.2 m circle round every walker clear of the wall colliders on every frame
TUTORIAL CHECK run 1 (wrong answers): leaving PASS: Keep exploring; the journey actors, people and lasers as the journey reset leaves them
TUTORIAL CHECK run 2 (right answers): steps PASS: 11 of 11 steps completed, 11 marker routes clear of the walls
TUTORIAL CHECK run 2 (right answers): walls PASS: 6 tutorial moves, the 0.2 m circle round every walker clear of the wall colliders on every frame
TUTORIAL CHECK run 2 (right answers): leaving PASS: Main menu; the journey actors, people and lasers as the journey reset leaves them
exit 0
```

The check's detail lines name the step and what failed. Fix the wiring or the tutorial's own data (`WORLD` points, anchor ranges), never the check's assertions. Typical causes:

- "E at … did not reach the tutorial's target": another interactable wins; see finding 1.
- "Jordan did not wait": the stops.
- "world after leaving": an exit restore is missing.

If PR 1's `onModeChange` or another PR 1 module throws under the stubs, report it. Do not edit PR 1's files. Only global stubs the check itself sets up may be added, each with a comment.

- [ ] **3b-3.6: Checks** (from `$WT/tutorial-wiring/apps/web`):

```bash
TUT=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu/tutorial
F="arcade-src/sim-hub/src/tutorial.ts arcade-src/sim-hub/src/main.ts scripts/sim-hub-tutorial-check.mjs"
pnpm exec prettier --write $F && pnpm exec eslint $F
pnpm check
pnpm exec vitest run --project server arcade-src/sim-hub/src     # same counts as 3b-0.3
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
node "$TUT/count-random.mjs"; cat "$TUT/random-baseline.txt"   # equal: no three.js object at boot
node scripts/sim-hub-npc-check.mjs > "$TUT/npc-3b3.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$TUT/npc-baseline.log") <(grep '^NPC CHECK' "$TUT/npc-3b3.log") && echo "NPC unchanged"
```

Expected: no lint output; exit 0; the vitest counts; `SMOKE OK` ×3; equal counts; `exit 0`, `NPC unchanged`.

- [ ] **3b-3.7: A look in a real browser** (from `apps/web`): `node "$TUT/tutorial-shots.mjs" "$TUT/shots-3b3"`. It plays the chapter in real time, about four minutes. Expected: the six `shot` lines and `errors []`. Look at the six pictures: the tracker top-left; the orange marker; the dialog with a red "Not yet." line; the black role card; the end card.
- [ ] **3b-3.8: Commit** (from `$WT/tutorial-wiring`):

```bash
git add apps/web/arcade-src/sim-hub/src/tutorial.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/scripts/sim-hub-tutorial-check.mjs
git commit -m "feat(sim-hub): tutorial chapter 1 wired into the hub, with a headless run-through check

Jordan's treatment day as the patient, then as the LINAC Control therapist: tracker, door-by-door
marker, check-in, four decisions with hint, stronger hint and answer, role change, Jordan's escorts
with waits, the vault door and beam, the end card. resetTreatmentJourney(true) on start and exit.
scripts/sim-hub-tutorial-check.mjs plays it twice (wrong, then right answers).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3b-4: CI and e2e (`feat/sim-hub-tutorial`, in `$WT/tutorial-core`, after the 3b-3 merge)

**Files:**

- Modify: `.github/workflows/pr.yml` (job `web`, after the NPC check step)
- Modify: `apps/web/e2e/simulator.e2e.ts`

- [ ] **3b-4.1: CI** (`.github/workflows/pr.yml`). Old:

```yaml
- run: node scripts/sim-hub-npc-check.mjs
  working-directory: apps/web
  timeout-minutes: 5
```

New:

```yaml
- run: node scripts/sim-hub-npc-check.mjs
  working-directory: apps/web
  timeout-minutes: 5
# sim-hub tutorial run-through (PR 3): Chapter 1 played headlessly twice (wrong answers, then
# right); every step completes, the tutorial's walks stay clear of the walls, and leaving puts
# the journey actors back as the NPC check expects.
- run: node scripts/sim-hub-tutorial-check.mjs
  working-directory: apps/web
  timeout-minutes: 5
```

- [ ] **3b-4.2: e2e** (`apps/web/e2e/simulator.e2e.ts`). In 1f's test, Old: `	await expect(hub.locator('#menuTutorial')).toBeDisabled();` New: `	await expect(hub.locator('#menuTutorial')).toBeEnabled();`

  In the header comment, Old (1f's sentence end): ` * shows the controls bar.` New:

```ts
 * shows the controls bar; a fifth starts the Tutorial from the title menu and checks the tracker's
 * step 1.
```

Append at the end of the file:

```ts
test("Tutorial on the title menu starts Chapter 1 with the tracker at step 1", async ({
  browser,
}) => {
  test.setTimeout(180_000); // the same heavy sim-hub bundle as the tests above
  // The seeded educator's saved session (auth.setup.ts): no new login against the shared limit.
  const page = await educatorPage(browser);
  await page.getByRole("link", { name: "Simulator", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("simulator-entry").click();
  await expect(page).toHaveURL(/\/activities\//, { timeout: 15_000 });

  const hub = page.frameLocator('iframe[title="Center QA walkthrough"]');
  await expect(hub.locator("#titleMenu")).toBeVisible({ timeout: 60_000 });
  await expect(hub.locator("#menuTutorial")).toBeEnabled();
  await hub.locator("#menuTutorial").click();
  await expect(hub.locator("#titleMenu")).toBeHidden();
  const tracker = hub.getByTestId("tutorial-tracker");
  await expect(tracker).toBeVisible();
  await expect(tracker).toContainText("Step 1 of 11");
  await expect(tracker).toContainText("Patient · Jordan Ellis");
  await expect(tracker).toContainText("Go inside and check in at reception.");
  await page.context().close();
});
```

- [ ] **3b-4.3: Checks** (from `apps/web`):
  - `pnpm exec prettier --write e2e/simulator.e2e.ts && pnpm exec eslint e2e/simulator.e2e.ts`
  - Do not run prettier on `pr.yml`: it is not prettier-formatted today, and `--write` would reformat the whole file. Instead `git diff -- ../../.github/workflows/pr.yml` must show only the six added lines (three comment lines, `- run:`, `working-directory:`, `timeout-minutes:`), indented like the NPC check step above them.
  - `pnpm check`
  - If the compose stack is up (`curl -sf -o /dev/null http://localhost:8080/login && echo up`): `pnpm exec playwright test e2e/simulator.e2e.ts --project chromium -g "title menu"` (expected `2 passed`). Otherwise CI's e2e job is the gate; do not start or reseed a stack.
- [ ] **3b-4.4: Commit:**

```bash
git add .github/workflows/pr.yml apps/web/e2e/simulator.e2e.ts
git commit -m "test(sim-hub): tutorial run-through check in CI; e2e: Tutorial shows the tracker at step 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3b-5: pictures, full verification, PR (controller, `feat/sim-hub-tutorial`)

- [ ] **3b-5.1: After pictures** (from `$WT/tutorial-core/apps/web`): `pnpm build:arcade && node "$TUT/tutorial-shots.mjs" "$TUT/shots"`. Expected: `shot 1-title`, `shot 2-tracker-outside`, `shot 5-role-card`, `shot 4-decision-hint`, `shot 3-marker-door`, `shot 6-end-card`, `errors []`. The pairs for the owner:
  - **Before / after:** `before-1-title` / `after-1-title` (Tutorial "Coming soon" → enabled), and `before-2-outside` / `after-2-tracker-outside` (no tracker → tracker and the marker on the doors).
  - **After only:** `after-3-marker-door` (LINAC Control's door, finding 11), `after-4-decision-hint`, `after-5-role-card`, `after-6-end-card`.
- [ ] **3b-5.2: Full verification** (one heavy check at a time):
  - build; vitest (3b-0.3's counts); smoke; `pnpm check`; `pnpm exec prettier --check .`
  - the NPC check, label `final`: `NPC unchanged`
  - the scene check, label `final`: `scene unchanged`
  - `ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$TUT/vis-final.log" 2>&1; echo "exit $?"; tail -3 "$TUT/vis-final.log"`: `exit 0`, 0 failures
  - the run-through check: the six PASS lines
  - the random count: equal to the baseline
- [ ] **3b-5.3: Push and open the PR:** `git push origin feat/sim-hub-tutorial`, then `gh pr create --base main --title "sim-hub: tutorial, Chapter 1 (Jordan's treatment day)" --body …`.
  - The body summarises the chapter and lists findings 3, 4, 5, 9, 10 and 11 for the owner.
  - It attaches the pictures from `$TUT/shots`.
  - It says the run-through check now runs in the `web` job.
  - It ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
  - CI runs e2e once.

---

## Self-review

**Spec coverage** (PR 3 section):

- **Tracker:**
  - avatar, "Your role", "{role} · {name}": 3b-2 `showTracker`;
  - objective, progress bar, "Step n of 11", walking distance: 3b-3 `showStep`/`updateMarker`;
  - the hint line: `setHint`.
- **Marker:**
  - orange diamond, "{place} · {distance}": 3b-2 CSS, 3b-3;
  - next door or corner via the route builder (`movementPathFor` over `shortestCorridorRoute(FromPosition)`, `doorPoint`, room graphs, `insidePoint` for a room objective): 3b-3 `buildRoute`;
  - the 1.5 m switch: `advanceStop`;
  - never through a wall: `lineBlocked`, hide and rebuild;
  - the edge arrow off screen: `edgeArrow`, `placeEdge`;
  - walking distance: `remainingDistance`.
- **Role change** (fade, 2.5 s card) and **end card** (Main menu, Keep exploring where the player stands): 3b-3 `roleChange`/`keepExploring`, 3b-2.
- **Steps 1-11** with their targets, triggers and actions: 3a-2 (table), 3b-3 `ACTIONS`.
  - **Step 2:** the free chair (`seatNear`, the pickup chair), seated eye height and movement lock, the intercom (`journeyIntercom`), about 6 s.
  - **Step 4:** Jordan stands as the escort's rise.
  - **Steps 5 and 11:** waits within 5 m, "Wait for Jordan" beyond 12 m.
  - **Step 6:** the setup pose, the lasers, Jamie across.
  - **Step 7:** done in LINAC Control, the door closes and is held.
  - **Step 9:** beam-on status, 10 s countdown.
  - **Step 10:** the door opens on approach.
  - **Step 11:** ends at the lobby desk.
- **Hints and answer reveal:** hint, stronger hint, answer and reason at the third miss: 3a-3. Walking hints at 60/120 s with the 1 m rule: 3a-1/3a-3. The E hint after 20 s within 6 m: 3a-1/3a-3.
- **NPCs:**
  - shared actors and builders;
  - `resetTreatmentJourney(true)` on start and exit;
  - hidden actors skipped by the E prompt (PR 1) and blockers (`visibleInTree`, existing), with labels and bubbles too (3b-1);
  - the couch patient hidden until Jordan lies down;
  - the rename: 3b-1.
- **New files:** `tutorial.ts`, `tutorial-steps.ts`, `tutorial-math.ts`, plus `tutorial-machine.ts` and `tutorial-hud.ts` (the brief's split).
- **Verification:**
  - the math and steps specs as listed, plus the machine spec;
  - the run-through check (twice, wrong and right; steps complete; escort routes clear of walls) in CI next to the NPC check;
  - the e2e test;
  - the pictures, with the consult-door conflict noted.
- **Free-mode pieces** (controls bar, E prompt, room cards, Esc): PR 1's, active in 'tutorial'. The tutorial registers its dialog for Esc and pauses through `setPaused('tutorial')`.

**Placeholder scan:**

- Every new file's full code is in the plan.
- Every shared-file edit has its old and new text.
- Every command states its expected output.
- The only conditional instructions are the anchor-not-found stop rule and the e2e stack-up check.

**Type consistency:**

- `Pt`, `Rect`, `FeedbackKind`, `StuckTimer` and `EscortHold` come from `tutorial-math.ts`.
- `TargetId`, `StepAction`, `Role` and `Step` come from `tutorial-steps.ts`.
- `TutorialState`, `TutorialEvent` and `Effect` come from `tutorial-machine.ts`.
- `tutorial.ts` uses them as the specs do.
- The `ACTIONS` record is typed `Record<StepAction, () => void>`, so a missing or extra action fails `pnpm check`. The steps spec lists the same 18 actions.
- The hook's `state()` spreads `TutorialState`, and the check reads `phase`, `step`, `misses`, `resolved`, `hint`, `active`, `endOpen` and `escortHolding` from it.
- `registerInteractable`'s seventh argument matches PR 1's `opts: { enabled?: () => boolean }`.
- `seatNear(p, radius, freeFor)` takes a `THREE.Vector3` (`LOBBY_PICKUP.chair`), as inside npc-behavior.ts.
