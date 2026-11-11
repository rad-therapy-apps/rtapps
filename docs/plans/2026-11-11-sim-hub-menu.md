# sim-hub title menu and free mode (PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The sim hub opens on a game-style title menu (Free Mode, Tutorial "Coming soon") over the slowly turning clinic. Free Mode starts on the plaza with no panels: a controls bar that fades after a second of walking, an E prompt beside the person or thing in reach (fading in, growing, never through a wall), a room pop-up card that pauses the game, and an Esc settings menu (Sound, Room introductions, Help, Resume, Main menu). The old top bar, directory, journey box, room panel, How to use dialog and journey HUDs go. The CT QA menu opens with E at the CT scanner. Coming back from the LINAC/CT app through its Back to the Center button starts Free Mode outside the door the player left through.

**Architecture:** Step 0 (the controller, before any dispatch) adds four small pure modules every task builds on: `pause.ts` (the main loop skips `stepSimulation` while paused but still draws), `prefs.ts` (all storage, in try/catch), `play-mode.ts` (`'title' | 'free' | 'tutorial'`) and `dialogs.ts` (Esc's registry of open dialogs), plus `hub-dialogs.ts` (today's dialogs registered), the main-loop hook and marked slots in `index.html`. Then four tasks run in parallel worktrees, each owning its own new files and named, non-adjacent regions of the shared files (`index.html`, `main.ts`, `walk.ts`, `interact.ts`, `journey.ts`): 1a the title menu and settings (`menu.ts`, `menu-rules.ts`, `sound.ts`), 1b the E prompt and controls bar (`prompt-math.ts`, `hud-prompt.ts`, `hud-controls.ts`), 1c the room card (`room-enter.ts`, `roomcard-rules.ts`, `hud-roomcard.ts`), 1d the removals. They merge into `feat/sim-hub-menu` in the order 1a, 1b, 1c, 1d; then 1e (`return-door.ts`) and 1f (tidy, e2e, the full verification and the owner's pictures) run on the merged branch.

**Tech Stack:** three.js 0.160.0 (pinned), TypeScript (`tsconfig.arcade.json`, strict off), Vite (`pnpm build:arcade`), vitest 5 (`server` project, node environment), Playwright (e2e and the dev checks).

**Spec:** `docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md`: "Owner decisions", "Global constraints", "PR 1: Menu and free mode", PR 2's "Back to the door you left from" bullet (task 1e here), "Worktrees", "Owner answers". The common brief (`$MENU/plan-brief-common.md`) supersedes the spec where they differ: its task split, its file names (the spec's `hud.ts`/`hud-math.ts` become `hud-prompt.ts`, `hud-controls.ts`, `hud-roomcard.ts`, `prompt-math.ts`, `roomcard-rules.ts`, `room-enter.ts`) and its exact shared interfaces.

**Before Step 0:** tell the owner implementation is about to start (they want to compact first).

---

## Global Constraints

### Binding (from the brief, verbatim in substance)

- **NPC check:** `node scripts/sim-hub-npc-check.mjs` (from `apps/web`) keeps checks a–m green. The floors REST_FLOOR 40, HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15 never change; never loosen the check; check j unchanged. If something breaks it, fix NPC data, never the check. `journey.ts`'s journeys, actors and route builders stay (the check runs them). PR 1 changes no NPC data, so every run must print the same `NPC CHECK` lines as the Step 0 baseline.
- **Scene check** (`node scripts/sim-hub-scene-check.mjs`), **visibility check** (`ANGLE=metal node scripts/sim-hub-visibility-check.mjs`) and **vitest** (`pnpm exec vitest run --project server arcade-src/sim-hub/src`), all from `apps/web`, stay green. The visibility check may only change how it enters walk mode (task 1d).
- **e2e must keep working:** `#watermark`; `#siteChoices` (filled by `procRenderSite()` at the end of boot); `#releaseClinical`/`#holdClinical`; `window.CONSOLE_APP_URL`; `window.__rtappsVerdictLocked`; the player iframe title "Center QA walkthrough"; `RTApps.recordResult('sim-hub-qa', …)` (sdk-bridge.ts, the only score the hub reports, reached through the CT QA menu).
- **CI** (`pnpm build:arcade`, `arcade-smoke.mjs`, the NPC check in the web job) is never weakened. No self-hosted runners.
- **Lint:** `pnpm exec prettier --write <touched files>` and `pnpm exec eslint <touched files>` only, from `apps/web`; never the package-wide `pnpm lint`. `pnpm check` and `pnpm exec prettier --check .` before the PR (task 1f).
- three.js stays at 0.160.0. No new dependencies.
- Never read, create or edit any `.env*` file. Never print secrets or seed passwords.
- People in text and comments: they/them or names.
- Storage only through `prefs.ts` (try/catch). The LINAC/CT app imports the same module (task 1e).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `git add` anything under `.superpowers/` or `e2e/.auth/`. No force-push. Python only via `uv run`.
- **Implementer subagents:** scratch files only under the session scratchpad (`$MENU`, below); never delete files they did not create; no glob deletes; stop and report if a permission is denied. Never `git add` a file the task does not name.

### Repo and process rules

- **Branches:** the PR branch is `feat/sim-hub-menu`, created by the controller from the commit that holds the spec and this plan (`docs/sim-hub-menu-tutorial`, or `main` once that is merged). Task branches: `feat/sim-hub-menu-title` (1a), `feat/sim-hub-menu-prompt` (1b), `feat/sim-hub-menu-roomcard` (1c), `feat/sim-hub-menu-cleanup` (1d), `feat/sim-hub-menu-return` (1e). 1f commits on `feat/sim-hub-menu` itself.
- **Code style:** tabs, single quotes, match the surrounding code. Update every comment that names a removed thing. Remove whatever your change leaves unused, and nothing else.
- **Line numbers** below are as at Step 0's base (`b061b7d`); after Step 0 the lines from `main.ts` line 109 on move down. The quoted text is always the anchor: find the line by it.
- **Heavy checks are staggered:** at most one NPC check or visibility check runs at a time on the machine, across all worktrees. The controller schedules them.
- **Shell variables** (shell state does not persist; every block sets what it uses):

```bash
MENU=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu
REPO=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt
```

- **Commands** (all from `apps/web` of the checkout or worktree in use):
  - build: `pnpm build:arcade` (the checks read `arcade/sim-hub`, which is gitignored; rebuild after every source change)
  - vitest: `pnpm exec vitest run --project server arcade-src/sim-hub/src` (at Step 0's base: `Test Files  4 passed (4)`, `Tests  77 passed (77)`)
  - smoke: `node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html` (expected: one `SMOKE OK (clean evaluation)` per bundle, exit 0)
  - NPC check: `node scripts/sim-hub-npc-check.mjs > "$MENU/npc-<label>.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$MENU/npc-baseline.log") <(grep '^NPC CHECK' "$MENU/npc-<label>.log") && echo "NPC unchanged"` (expected: `exit 0`, `NPC unchanged`)
  - scene check: `node scripts/sim-hub-scene-check.mjs > "$MENU/scene-<label>.log" 2>&1; echo "exit $?"; diff <(grep '^SCENE CHECK' "$MENU/scene-baseline.log") <(grep '^SCENE CHECK' "$MENU/scene-<label>.log") && echo "scene unchanged"` (expected: `exit 0`, `scene unchanged`)
  - visibility check: `ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$MENU/vis-<label>.log" 2>&1; echo "exit $?"; tail -3 "$MENU/vis-<label>.log"` (expected: `exit 0`; the summary line equals the baseline's)
  - types: `pnpm check` (expected: exit 0, svelte-check `0 errors`, then tsc silent)

## Controller decisions (2026-11-11, override the open questions below)

- **Title menu (finding 1):** does not pause; the clinic keeps moving behind it.
- **Doors (finding 6):** only the doors that leave the hub for another simulator get a prompt ("Enter {room}") and act on E. Every other door opens by itself, so it gets no prompt and E ignores it; the old open/close toggle and its toast are removed. Applied in Task 1b's code. After this change, remove any `interact.ts` import that only the removed toggle used (`doors`, `setDoorTarget`, if unused elsewhere), and adjust 1b's spec expectations if any asserted Open/Close labels.
- **Kiosk (finding 7):** "Explore Freely" goes too; the kiosk keeps its welcome text and Close.
- **E reach (finding 4):** the prompt uses the effective reach (`min(range, 2.8)`), as written.
- **Dialog registry in `hub-dialogs.ts` (finding 2)** and **1e taking both session values (finding 13):** accepted.

## Plan-time decisions and findings

Each is followed by the plan text; the open questions are repeated in the report to the controller.

1. **The title menu does not pause the game.** The clinic keeps moving behind the menu (the NPC loops run, the overview orbit turns). Only the Esc settings and the room card pause in PR 1. `'menu'` stays in `PauseReason` (brief) but nothing in PR 1 sets it. _Open question:_ if the owner wants the backdrop frozen, 1a adds `setPaused('menu', m === 'title')` in its mode listener; `renderPaused` already keeps the orbit turning.
2. **Today's dialogs are registered in a new `hub-dialogs.ts`**, not inside `dialogs.ts`, so `dialogs.ts` stays pure and unit tested. Registration order is the order Esc tries them: the procedure lab (opened from the CT QA dock) closes before the dock.
3. **Distinguishing our own lock release from the player's Esc:** every dialog-opening function in the hub calls `exitPointerLock()` and adds its `show` class in the same synchronous call, while `pointerlockchange` arrives later; so a lock loss with a dialog open (or the game paused, e.g. by a room card) never opens the settings. A 300 ms grace ignores an Esc keydown that some browsers might deliver after their own lock release. These rules are pure (`menu-rules.ts`) and tested.
4. **E reach "as today"** is `min(range, 2.8)` for objects (the old `nearestInteractable(maxD = 2.8)` cap; the LINAC head screen's 4.2 is in effect 2.8) and 2.6 m for doors. The prompt fades and grows against that effective reach, so a full-size prompt always means E works. The prompt shows the in-reach target E would act on first, and otherwise the nearest one fading in.
5. **Every walk collider is a wall:** `collider()` (walk.ts) is called only by `wall()` (helpers.ts); furniture has no colliders. So `WallRect` is exactly `getColliders()`'s `{ x, z, hw, hd }`, and staff behind desks are never blocked. The sight segment stops 0.3 m short of the target so a target hanging on a wall is not hidden by that wall. A door's sight point is `doorCenter(room)` (in the doorway), its distance is to `doorPoint(room)` (as `nearestDoor` measures).
6. **Ordinary doors and E (pre-existing):** walk mode opens the nearest door within 2.15 m every frame and closes it beyond (walk.ts `updateWalk`), so E's open/close toggle does not stick; the prompt still says "Open {room}" or "Close {room}" from the door's current target, as the spec asks. _Open question:_ drop the door prompt for doors that open by themselves?
7. **Kiosk:** the spec keeps "its welcome text and Close". The plan also removes "Explore Freely" (`#kioskExplore`): in Free Mode it only called `setMode('walk')`, which teleports the player into the lobby's inspection pose. The Close button's line drops "without starting a journey". _Open question_ for the owner.
8. **`#walkHint`** (the old "Walk: W A S D … Esc release mouse" line, shown by `setMode('walk')` at the same spot as the new controls bar) is removed by 1d, though the spec's list omits it: it would sit on top of the controls bar and never hide.
9. **Hidden objects are never offered:** an interactable whose own `visible` is false is skipped by the prompt and by E (today a hidden journey actor could be "talked to"; PR 3 hides the actor the player plays). Room culling hides room groups, never the interactables themselves, so this is safe.
10. **The room card's element is `#roomPopup`**, because sdk-bridge.ts's CT QA animation pulses `#roomCard` (a selector with no element today).
11. **Room introductions:** the settings markup (1a) holds the `#setRoomCards` checkbox; 1c wires it, so the room-card rules stay in one task (`roomcard-rules.ts`). Between the two merges the box does nothing.
12. **The CT QA menu interactable** is its own anchor on the gantry's door-facing side (1.45 m in front of the ring's centre), labelled "CT QA menu", because the existing "CT Simulator Gantry" equipment anchor sits at the ring's centre and would otherwise win every tie.
13. **1e takes both session values on every boot** (the brief writes `takePref(returning) && takePref(returnDoor)`, which leaves a stale door when the flag is missing). Same outcome on a real return; a later visit never reuses an old door.
14. **The visibility check's new entry (`#menuFree`) comes from 1a,** so 1d's worktree cannot run that check; the controller runs it after merging 1d. 1d's worktree cannot boot in a real browser at all (1a removes the `#ambientBtn` handler line, 1d the button), so 1d is tried in a browser only after its merge.
15. **Merge isolation leaves two tidy-ups for 1f:** `interact.ts` gets a second `import … from './walk'` line from 1b (1d rewrites the first), and `#interactPrompt`'s markup and CSS stay until 1f (1b stops using it; removing it in 1b or 1d would touch lines next to the other's).
16. **Spec staffing line:** "the staff line, when the room has a guide": every room in `ROOM_GUIDES` has one, so every card shows it.

## File Structure

All paths under `apps/web/arcade-src/sim-hub/src/` unless given in full.

| File                                            | Responsibility                                                                  | Task                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| `pause.ts` + `pause.spec.ts`                    | pause reasons; `isPaused`; change listeners                                     | Step 0                 |
| `prefs.ts` + `prefs.spec.ts`                    | the five storage keys; JSON read/write/take in try/catch                        | Step 0                 |
| `play-mode.ts` + `play-mode.spec.ts`            | `'title' \| 'free' \| 'tutorial'`, `enterMode`, listeners                       | Step 0                 |
| `dialogs.ts` + `dialogs.spec.ts`                | Esc's registry: `registerDialog`, `openDialogName`, `closeOpenDialog`           | Step 0                 |
| `hub-dialogs.ts`                                | registers today's six dialogs                                                   | Step 0                 |
| `main.ts`                                       | frame loop pause hook (Step 0); task regions below                              | shared                 |
| `index.html`                                    | HUD markup/CSS; slots (Step 0); task regions below                              | shared                 |
| `menu.ts`                                       | title menu, settings, Help, Esc and pointer-lock handling, the play-mode switch | 1a                     |
| `menu-rules.ts` + `menu-rules.spec.ts`          | pure: what an Esc keydown does; whether a lock loss opens the settings          | 1a                     |
| `sound.ts`                                      | `setSound` (the ambience; mutes intercom speech), the remembered pref           | 1a                     |
| `prompt-math.ts` + `prompt-math.spec.ts`        | pure: prompt opacity/scale, opacity smoothing, `WallRect`, `segmentBlocked`     | 1b                     |
| `hud-prompt.ts`                                 | places the E prompt beside its target every frame                               | 1b                     |
| `hud-controls.ts`                               | the controls bar, hidden after 1 s of walking                                   | 1b                     |
| `room-enter.ts` + `room-enter.spec.ts`          | `onRoomEnter` (0.3 s dwell, re-arms in a hallway), `noteWalkRoom`               | 1c                     |
| `roomcard-rules.ts` + `roomcard-rules.spec.ts`  | pure: `shouldShowRoomCard`, tick, on/off, zone and room-type labels             | 1c                     |
| `hud-roomcard.ts`                               | the room card; wires `#setRoomCards`                                            | 1c                     |
| `return-door.ts` + `return-door.spec.ts`        | `returnDoorOnBoot`                                                              | 1e                     |
| `apps/web/arcade-src/linac-ct/src/main.ts`      | Back to the Center writes `PREF.returning`                                      | 1e                     |
| `apps/web/scripts/sim-hub-visibility-check.mjs` | enters walk mode through `#menuFree`                                            | 1d                     |
| `apps/web/e2e/simulator.e2e.ts`                 | title menu and Free Mode test                                                   | 1f                     |
| `$MENU/pr1-shots.mjs` (scratch, not committed)  | the owner's before/after pictures and the return check                          | Step 0 writes, 1f runs |

### Shared-file regions (who edits what)

No two tasks change the same line or lines next to each other (git conflicts on adjacent changes, not on changes one unchanged line apart; checked on a scratch repo). "after X" means a new line inserted directly below line X; X itself is unchanged.

**`main.ts`** (line numbers at Step 0's base)

| Task   | Region                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 0 | after `import './sdk-bridge';` (108): two imports; `function animate(now) {` (737–740) and a new `renderPaused` before it                                                                                                                                                                                                                                                                                                                                      |
| 1a     | scene import list lines 11, 12, 14 (`AMBIENCE,` `initAmbience,` `ambienceProfile,`); `	toast,` (73); after `import { applyVisibility, groupRoomContents } from './visibility';` (106); `// Environment, wayfinding, and ambience` + `toggleAmbience` (450–480); the LINAC-only Esc listener (613–616); `document.getElementById('ambientBtn').onclick = toggleAmbience;` (619); the last line, `setTimeout(() => document.getElementById('studentHelp')…` (764) |
| 1b     | after `import { isHidden, installNpcCheckHook } from './npc-check-hook';` (107); after `	if (f % 3 === 1) updateInteractionUI();` (720)                                                                                                                                                                                                                                                                                                                         |
| 1c     | after Step 0's `import './hub-dialogs';`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 1d     | `	CLINICAL_FOCUS` (59) and the comma on 58; `	beginTravel,` (62), `	setMode,` (66); `	showEquipmentPanel,` (85); `	bindPanelToggle,`/`renderRoomList,`/`updateFacilityInfo,` (87–89); 99–102 of the journey import; `raycaster`/`mouse` (111–112); 568–600; 621–622; 624–629; 633–641; the canvas `click` handler (654–669); `renderRoomList();`/`updateFacilityInfo();` (742–743)                                                                                  |
| 1e     | 1a's two boot lines and 1a's import lines (sequential)                                                                                                                                                                                                                                                                                                                                                                                                         |

**`walk.ts`**: 1b `nearestDoor` (56–71); 1c after `import { cleanPoints } from './helpers';` (28) and after `	const here = roomContainingWalkPoint(player.pos.x, player.pos.z);` (582); 1d header lines 20–22, line 26, the `./interact` import (42–49), `beginTravel`/`finishTravel`/`updateTravel`/`setMode` (315–535).

**`interact.ts`**: 1b after `import * as THREE from 'three';` (22) and from `const interactables = [];` (447) through the end of `updateInteractionUI` (547); 1d header lines 9–12 and 18–20, lines 25, 30, 35–37, and everything from `function roomEquipmentMarkup(roomId) {` (1044) down; 1e (sequential) 1b's `performInteraction` and import lines.

**`journey.ts`**: 1a `function playIntercomAudio(text) {` (521–522); 1d header lines 13 and 21, lines 72, 83, 616–619, 646–651, 796–800, 2936–2941, 2946–2966, 2990–2993.

**`index.html`**: Step 0 adds the slots before `<canvas id="scene">` and before `</style>`. 1a inserts after `<!-- slot:menu -->` / `/* slot:menu */`; 1b after `<!-- slot:hud-controls -->`, `<!-- slot:hud-prompt -->` and their CSS twins; 1c after `<!-- slot:roomcard -->` / `/* slot:roomcard */`; 1d deletes the old markup and CSS (task 1d lists every block); 1f deletes `#interactPrompt`.

**Owned by one task only:** `sdk-bridge.ts`, `props.ts`, the visibility check (1d); `linac-ct/src/main.ts` (1e); `simulator.e2e.ts` (1f).

## Worktrees and merge procedure

- [ ] **W1: Create the PR branch** (controller, main checkout, after this plan is committed):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git checkout -b feat/sim-hub-menu
```

- [ ] **W2: After Step 0 is committed, create the four worktrees** (controller):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
WT=/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt
git worktree add "$WT/menu-title" -b feat/sim-hub-menu-title feat/sim-hub-menu
git worktree add "$WT/menu-prompt" -b feat/sim-hub-menu-prompt feat/sim-hub-menu
git worktree add "$WT/menu-roomcard" -b feat/sim-hub-menu-roomcard feat/sim-hub-menu
git worktree add "$WT/menu-cleanup" -b feat/sim-hub-menu-cleanup feat/sim-hub-menu
for w in menu-title menu-prompt menu-roomcard menu-cleanup; do (cd "$WT/$w" && pnpm install --frozen-lockfile); done
```

Dispatch 1a, 1b, 1c and 1d at once, one implementer each, in its worktree. No commits on `feat/sim-hub-menu` while they run.

- [ ] **W3: Merge in order 1a, 1b, 1c, 1d**, one at a time, in the main checkout on `feat/sim-hub-menu`. After each merge: build, vitest, smoke, NPC check; after 1d also the scene and visibility checks. Expected vitest after each merge: 1a `9 passed` files / `113 passed` tests; 1b `10` / `128`; 1c `12` / `142`; 1d `12` / `142`.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git merge --no-ff feat/sim-hub-menu-title -m "Merge task 1a (title menu, settings) into feat/sim-hub-menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Then `…-prompt` "task 1b (E prompt, controls bar)", `…-roomcard` "task 1c (room card)", `…-cleanup` "task 1d (old panels removed)".) A conflict means a task left its region: stop and report, do not resolve by hand.

- [ ] **W4: After the 1d merge, create the 1e worktree** from `feat/sim-hub-menu` (`git worktree add "$WT/menu-return" -b feat/sim-hub-menu-return feat/sim-hub-menu`, then `pnpm install --frozen-lockfile` in it), run 1e, merge it the same way ("task 1e (back to the door)"). Then run 1f in the main checkout.
- [ ] **W5: After the PR merges**, remove the worktrees (`git worktree remove "$WT/<name>"` for each) and delete the task branches (`git branch -d <branch>`).

---

## Step 0: the shared foundation (controller)

**Files:**

- Create: `pause.ts`, `pause.spec.ts`, `prefs.ts`, `prefs.spec.ts`, `play-mode.ts`, `play-mode.spec.ts`, `dialogs.ts`, `dialogs.spec.ts`, `hub-dialogs.ts`
- Modify: `main.ts` (the import list after `import './sdk-bridge';`; `function animate(now) {`), `index.html` (slots)
- Scratch: `$MENU/pr1-shots.mjs`, the baselines `$MENU/{npc,scene,vis}-baseline.log`, `$MENU/pr1-before/`

**Interfaces — Produces** (exact, from the brief; every task consumes them):

```ts
// pause.ts
export type PauseReason = "menu" | "settings" | "roomCard" | "tutorial";
export function setPaused(reason: PauseReason, on: boolean): void;
export function isPaused(): boolean;
export function onPauseChange(cb: (paused: boolean) => void): () => void;
// prefs.ts
export const PREF: {
  roomCardsHidden: "simhub.roomCards.hidden";
  roomCardsEnabled: "simhub.roomCards.enabled";
  sound: "simhub.sound";
  returnDoor: "simhub.returnDoor";
  returning: "simhub.returning";
};
export function readPref<T>(
  key: string,
  fallback: T,
  store?: "local" | "session",
): T;
export function writePref(
  key: string,
  value: unknown,
  store?: "local" | "session",
): void;
export function takePref<T>(
  key: string,
  fallback: T,
  store?: "local" | "session",
): T;
// play-mode.ts
export type PlayMode = "title" | "free" | "tutorial";
export interface EnterOptions {
  atDoor?: string;
}
export function getPlayMode(): PlayMode;
export function enterMode(m: PlayMode, opts?: EnterOptions): void;
export function onPlayModeChange(
  cb: (m: PlayMode, opts: EnterOptions) => void,
): () => void;
// dialogs.ts
export function registerDialog(
  name: string,
  isOpen: () => boolean,
  close: () => void,
): void;
export function openDialogName(): string | null;
export function closeOpenDialog(): boolean;
```

Registered dialog names (in order): `procedureLab`, `linacHeadLab`, `equipment`, `staff`, `kiosk`, `ctQaDock`. The `index.html` slots, one per line in this order: `<!-- slot:menu -->`, `<!-- slot:hud-controls -->`, `<!-- slot:hud-prompt -->`, `<!-- slot:roomcard -->`, `<!-- slot:tutorial -->` before `<canvas id="scene">`, and the same names as `/* slot:… */` at the end of the `<style>` block.

- [ ] **0.1: Write the screenshot tool** to `$MENU/pr1-shots.mjs` (scratch, never committed; it extends `$MENU/ui-shots.mjs`):

```js
// PR 1 (sim-hub menu) before/after pictures for the owner (dev only, not in the repo). Serves the built
// hub (apps/web/arcade/sim-hub) and rtapps-sdk.js (apps/web/static/arcade) on 127.0.0.1 and writes
//   01-first-screen  02-walking-outside  03-room-card  04-near-maya  05-settings
// and with MODE=after also 06-back-at-the-door (task 1e: the LINAC/CT app's Back to the Center).
// MODE=before drives the old HUD (How to use dialog, Walk button, room panel, Help); MODE=after the new
// one (title menu, Free Mode, room card, Esc settings). Run from apps/web after `pnpm build:arcade`:
//   MODE=before|after node <this> <outDir>
// Walk: the plaza start (4.2, 20.4) is aimed at (1.2, 2, 10.5), so W moves (-0.29, -0.96) and A
// (-0.96, 0.29) per metre at 3.35 m/s. 22.65 m of W then 2.33 m of A end at (-4.6, -0.6), 2.5 m from
// Maya Brooks (lobby desk, -6.0, -2.7), who is then about 17 degrees left of the view centre.
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const MODE = process.env.MODE === "before" ? "before" : "after";
const WEB = process.cwd();
const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: MODE=before|after node pr1-shots.mjs <outDir>");
  process.exit(2);
}
const { chromium } = createRequire(path.join(WEB, "package.json"))(
  "playwright",
);
const SIMHUB = path.join(WEB, "arcade/sim-hub"),
  STATIC = path.join(WEB, "static/arcade");
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
};
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = null;
  if (u.startsWith("/arcade/sim-hub/"))
    f = path.join(SIMHUB, u.slice(16) || "index.html");
  else if (u.startsWith("/arcade/")) f = path.join(STATIC, u.slice(8));
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
const base = `http://127.0.0.1:${srv.address().port}/arcade/sim-hub/?hq`;
const browser = await chromium.launch({
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=metal"],
});
const page = await (
  await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
fs.mkdirSync(outDir, { recursive: true });
const shot = async (name, wait = 1200) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(outDir, name + ".png") });
  console.log("shot", name);
};
const click = (sel) =>
  page.evaluate((s) => document.querySelector(s)?.click(), sel);
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
const loaded = () =>
  page.waitForFunction(
    () => document.getElementById("loader")?.classList.contains("hide"),
    null,
    { timeout: 120000 },
  );
const W_TO_MAYA_MS = 6760,
  A_TO_MAYA_MS = 700;
try {
  await page.goto(base, { waitUntil: "load" });
  await loaded();
  await shot("01-first-screen", 4000);
  if (MODE === "before") {
    await click("#studentHelpClose");
    await page.waitForTimeout(1500);
    await click('#modeSeg button[data-mode="walk"]');
    await shot("02-walking-outside", 3000);
    await hold("w", 4200); // into the lobby: the room panel on the right shows it
    await shot("03-room-card", 1500);
    await hold("w", W_TO_MAYA_MS - 4200);
    await hold("a", A_TO_MAYA_MS);
    await shot("04-near-maya", 800);
    await click("#helpBtn");
    await shot("05-settings", 800);
  } else {
    await click("#menuFree");
    await shot("02-walking-outside", 3000);
    // the lobby card shows 0.3 s inside the lobby and pauses the game, so the walk stops there:
    // (20.4 - 9.5) / 0.957 m + 0.3 s x 3.35 m/s = 12.4 m of W, 3.7 s
    await page.keyboard.down("w");
    await page.waitForFunction(
      () => document.getElementById("roomPopup")?.classList.contains("show"),
      null,
      { polling: 50, timeout: 20000 },
    );
    await page.keyboard.up("w");
    await shot("03-room-card", 600);
    await click("#rcContinue");
    await hold("w", W_TO_MAYA_MS - 3700);
    await hold("a", A_TO_MAYA_MS);
    await page.waitForTimeout(600);
    console.log(
      "E prompt:",
      await page.evaluate(
        () => document.getElementById("ePromptTitle")?.textContent,
      ),
    );
    await shot("04-near-maya", 200);
    // headless may hold the pointer lock, and a synthetic Esc does not release it: release it the way
    // the browser does, which opens the settings; with no lock, press Esc
    await page.evaluate(
      () => document.pointerLockElement && document.exitPointerLock(),
    );
    await page.waitForTimeout(300);
    if (
      !(await page.evaluate(() =>
        document.getElementById("settingsMenu")?.classList.contains("show"),
      ))
    )
      await page.keyboard.press("Escape");
    await shot("05-settings", 800);
    // task 1e: back from the LINAC/CT app, outside the CT Simulator Room door, not at the title menu
    await page.evaluate(() => {
      sessionStorage.setItem("simhub.returnDoor", JSON.stringify("ctsim"));
      sessionStorage.setItem("simhub.returning", "true");
    });
    await page.reload({ waitUntil: "load" });
    await loaded();
    const state = await page.evaluate(() => ({
      title: document.getElementById("titleMenu")?.classList.contains("show"),
      controls: document
        .getElementById("controlsBar")
        ?.classList.contains("show"),
      left: [
        sessionStorage.getItem("simhub.returnDoor"),
        sessionStorage.getItem("simhub.returning"),
      ],
    }));
    console.log("back at the door:", JSON.stringify(state));
    await shot("06-back-at-the-door", 3000);
    if (
      state.title ||
      !state.controls ||
      state.left[0] !== null ||
      state.left[1] !== null
    ) {
      console.error("RETURN CHECK FAIL");
      process.exitCode = 1;
    }
  }
  if (errors.length) {
    console.error("page errors:\n" + errors.join("\n"));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  srv.close();
}
```

- [ ] **0.2: Baselines and the before pictures** on the untouched branch (one heavy check at a time):

```bash
MENU=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
pnpm build:arcade
node scripts/sim-hub-npc-check.mjs > "$MENU/npc-baseline.log" 2>&1; echo "exit $?"
node scripts/sim-hub-scene-check.mjs > "$MENU/scene-baseline.log" 2>&1; echo "exit $?"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$MENU/vis-baseline.log" 2>&1; echo "exit $?"
MODE=before node "$MENU/pr1-shots.mjs" "$MENU/pr1-before"
```

Expected: `exit 0` three times; five `shot …` lines. A page load that times out: retry once, then stop and report.

- [ ] **0.3: Write the failing specs.**

`pause.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// the pause state is module-level: every test gets a fresh module
let P: typeof import("./pause");
beforeEach(async () => {
  vi.resetModules();
  P = await import("./pause");
});

describe("pause", () => {
  it("starts unpaused", () => {
    expect(P.isPaused()).toBe(false);
  });

  it("stays paused while any reason is on", () => {
    P.setPaused("settings", true);
    P.setPaused("roomCard", true);
    P.setPaused("settings", false);
    expect(P.isPaused()).toBe(true);
    P.setPaused("roomCard", false);
    expect(P.isPaused()).toBe(false);
  });

  it("counts a reason once, however often it is switched on", () => {
    P.setPaused("menu", true);
    P.setPaused("menu", true);
    P.setPaused("menu", false);
    expect(P.isPaused()).toBe(false);
  });

  it("tells listeners only when the game as a whole pauses or resumes", () => {
    const seen: boolean[] = [];
    P.onPauseChange((paused) => seen.push(paused));
    P.setPaused("settings", true);
    P.setPaused("roomCard", true);
    P.setPaused("settings", false);
    P.setPaused("roomCard", false);
    P.setPaused("tutorial", false);
    expect(seen).toEqual([true, false]);
  });

  it("stops telling a listener that unsubscribed", () => {
    const seen: boolean[] = [];
    const off = P.onPauseChange((paused) => seen.push(paused));
    P.setPaused("tutorial", true);
    off();
    P.setPaused("tutorial", false);
    expect(seen).toEqual([true]);
  });
});
```

`prefs.spec.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { PREF, readPref, takePref, writePref } from "./prefs";

type StoreName = "localStorage" | "sessionStorage";

/** A Map-backed Storage that behaves like the browser's. */
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
  };
}
/** Storage that throws on every call, as a full or blocked browser storage does. */
const throwingStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};
function install(name: StoreName, value: unknown) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}
afterEach(() => {
  for (const name of ["localStorage", "sessionStorage"] as const)
    delete (globalThis as unknown as Record<string, unknown>)[name];
});

describe("PREF", () => {
  it("names the storage keys of the spec", () => {
    expect(PREF).toEqual({
      roomCardsHidden: "simhub.roomCards.hidden",
      roomCardsEnabled: "simhub.roomCards.enabled",
      sound: "simhub.sound",
      returnDoor: "simhub.returnDoor",
      returning: "simhub.returning",
    });
  });
});

describe("readPref, writePref and takePref", () => {
  it("write JSON to localStorage by default and read it back", () => {
    const local = memoryStorage();
    install("localStorage", local);
    writePref(PREF.roomCardsHidden, ["consult", "lobby"]);
    expect(local.data.get("simhub.roomCards.hidden")).toBe(
      '["consult","lobby"]',
    );
    expect(readPref(PREF.roomCardsHidden, [])).toEqual(["consult", "lobby"]);
  });

  it("keep session values in sessionStorage", () => {
    const local = memoryStorage(),
      session = memoryStorage();
    install("localStorage", local);
    install("sessionStorage", session);
    writePref(PREF.returnDoor, "ctsim", "session");
    expect(session.data.get("simhub.returnDoor")).toBe('"ctsim"');
    expect(local.data.size).toBe(0);
    expect(readPref<string | null>(PREF.returnDoor, null, "session")).toBe(
      "ctsim",
    );
    expect(readPref<string | null>(PREF.returnDoor, null)).toBe(null);
  });

  it("give the fallback for a missing key or a value that is not JSON", () => {
    const local = memoryStorage();
    install("localStorage", local);
    expect(readPref(PREF.roomCardsEnabled, true)).toBe(true);
    local.data.set("simhub.sound", "not json");
    expect(readPref(PREF.sound, false)).toBe(false);
  });

  it("takePref reads the value, then removes it", () => {
    const session = memoryStorage();
    install("sessionStorage", session);
    writePref(PREF.returning, true, "session");
    expect(takePref(PREF.returning, false, "session")).toBe(true);
    expect(session.data.has("simhub.returning")).toBe(false);
    expect(takePref(PREF.returning, false, "session")).toBe(false);
  });

  it("work with no storage at all (the node checks have no sessionStorage)", () => {
    expect(readPref(PREF.sound, false)).toBe(false);
    expect(() => writePref(PREF.sound, true)).not.toThrow();
    expect(takePref<string | null>(PREF.returnDoor, null, "session")).toBe(
      null,
    );
  });

  it("work when every storage call throws", () => {
    install("localStorage", throwingStorage);
    install("sessionStorage", throwingStorage);
    expect(readPref(PREF.roomCardsEnabled, true)).toBe(true);
    expect(() => writePref(PREF.roomCardsHidden, ["lobby"])).not.toThrow();
    expect(takePref(PREF.returning, false, "session")).toBe(false);
  });

  it("work when even reaching storage throws (blocked by privacy settings)", () => {
    for (const name of ["localStorage", "sessionStorage"] as const)
      Object.defineProperty(globalThis, name, {
        get() {
          throw new Error("SecurityError");
        },
        configurable: true,
      });
    expect(readPref(PREF.sound, false)).toBe(false);
    expect(() => writePref(PREF.sound, true, "session")).not.toThrow();
    expect(takePref<string | null>(PREF.returnDoor, null, "session")).toBe(
      null,
    );
  });
});
```

`play-mode.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnterOptions, PlayMode } from "./play-mode";

let M: typeof import("./play-mode");
beforeEach(async () => {
  vi.resetModules();
  M = await import("./play-mode");
});

describe("play mode", () => {
  it("starts at the title", () => {
    expect(M.getPlayMode()).toBe("title");
  });

  it("sets the mode, then tells the listeners in registration order, with the options", () => {
    const seen: string[] = [];
    M.onPlayModeChange((m, opts) =>
      seen.push(`a:${m}:${opts.atDoor}:${M.getPlayMode()}`),
    );
    M.onPlayModeChange((m) => seen.push(`b:${m}`));
    M.enterMode("free", { atDoor: "ctsim" });
    expect(seen).toEqual(["a:free:ctsim:free", "b:free"]);
  });

  it("passes empty options when none are given", () => {
    const seen: EnterOptions[] = [];
    M.onPlayModeChange((_m, opts) => seen.push(opts));
    M.enterMode("tutorial");
    expect(seen).toEqual([{}]);
  });

  it("tells the listeners even when the mode does not change (the boot enters the title)", () => {
    const seen: PlayMode[] = [];
    M.onPlayModeChange((m) => seen.push(m));
    M.enterMode("title");
    expect(seen).toEqual(["title"]);
  });

  it("stops telling a listener that unsubscribed", () => {
    const seen: PlayMode[] = [];
    const off = M.onPlayModeChange((m) => seen.push(m));
    M.enterMode("free");
    off();
    M.enterMode("title");
    expect(seen).toEqual(["free"]);
  });
});
```

`dialogs.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

let D: typeof import("./dialogs");
beforeEach(async () => {
  vi.resetModules();
  D = await import("./dialogs");
});

/** A dialog that is open until closed, counting its closes. */
function dialog(open: boolean) {
  const d = { open, closes: 0 };
  return {
    d,
    isOpen: () => d.open,
    close: () => {
      d.open = false;
      d.closes++;
    },
  };
}

describe("dialogs", () => {
  it("reports no open dialog when none is", () => {
    const a = dialog(false);
    D.registerDialog("a", a.isOpen, a.close);
    expect(D.openDialogName()).toBe(null);
  });

  it("names the first registered dialog that is open", () => {
    const a = dialog(false),
      b = dialog(true),
      c = dialog(true);
    D.registerDialog("a", a.isOpen, a.close);
    D.registerDialog("b", b.isOpen, b.close);
    D.registerDialog("c", c.isOpen, c.close);
    expect(D.openDialogName()).toBe("b");
  });

  it("closes only that dialog, and says one was open", () => {
    const b = dialog(true),
      c = dialog(true);
    D.registerDialog("b", b.isOpen, b.close);
    D.registerDialog("c", c.isOpen, c.close);
    expect(D.closeOpenDialog()).toBe(true);
    expect([b.d.closes, c.d.closes]).toEqual([1, 0]);
    expect(D.openDialogName()).toBe("c");
  });

  it("closes nothing and returns false when no dialog is open", () => {
    const a = dialog(false);
    D.registerDialog("a", a.isOpen, a.close);
    expect(D.closeOpenDialog()).toBe(false);
    expect(a.d.closes).toBe(0);
  });

  it("replaces a dialog registered again under the same name, in its place", () => {
    const old = dialog(true),
      later = dialog(true),
      fresh = dialog(true);
    D.registerDialog("x", old.isOpen, old.close);
    D.registerDialog("y", later.isOpen, later.close);
    D.registerDialog("x", fresh.isOpen, fresh.close);
    D.closeOpenDialog();
    expect([old.d.closes, fresh.d.closes, later.d.closes]).toEqual([0, 1, 0]);
  });
});
```

- [ ] **0.4: Run the specs (expected FAIL):** `pnpm exec vitest run --project server arcade-src/sim-hub/src`. Expected: the four new files fail to load their module (`Failed to resolve import "./pause"` and the like); `Test Files  4 failed | 4 passed (8)`.

- [ ] **0.5: Write the modules.**

`pause.ts`:

```ts
/* The game's pause switch (sim-hub menu, Step 0). The game is paused while any reason is on: the Esc
   settings, a room card, a tutorial card ('menu' is kept for a paused title screen; the title menu
   itself keeps the clinic moving behind it). main.ts's frame loop then skips stepSimulation, and with
   it updateWalk, so nobody moves and no simulation clock runs, but it still draws the frame. The NPC
   check calls stepSimulation directly and never sees a pause. Free of scene and DOM imports so it is
   unit tested in Node (pause.spec.ts). */
export type PauseReason = "menu" | "settings" | "roomCard" | "tutorial";

const reasons = new Set<PauseReason>();
const listeners: ((paused: boolean) => void)[] = [];

/** Switches one reason on or off; listeners hear only when the game as a whole pauses or resumes. */
export function setPaused(reason: PauseReason, on: boolean): void {
  const was = reasons.size > 0;
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  const now = reasons.size > 0;
  if (now !== was) for (const cb of [...listeners]) cb(now);
}

export function isPaused(): boolean {
  return reasons.size > 0;
}

/** Calls `cb(true)` when the game pauses and `cb(false)` when it resumes; returns the unsubscribe. */
export function onPauseChange(cb: (paused: boolean) => void): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}
```

`prefs.ts`:

```ts
/* Every browser-storage access of the sim hub (sim-hub menu, Step 0), each in try/catch. Storage can
   be missing (the node checks' stubs have no sessionStorage), blocked (privacy settings throw on
   access) or full; then reads give the fallback and writes do nothing, and the game still works.
   Values are stored as JSON; callers check the shape of what they read back. The LINAC/CT app imports
   this module too, for PREF.returning. Free of scene and DOM imports so it is unit tested in Node
   (prefs.spec.ts). */
export const PREF = {
  /** localStorage, JSON string[] of room ids whose room card was ticked "Don't show this again" */
  roomCardsHidden: "simhub.roomCards.hidden",
  /** localStorage, JSON boolean, default true: Settings > Room introductions */
  roomCardsEnabled: "simhub.roomCards.enabled",
  /** localStorage, JSON boolean, default false: Settings > Sound */
  sound: "simhub.sound",
  /** sessionStorage, JSON string room id, written as the hub leaves through a room-app door */
  returnDoor: "simhub.returnDoor",
  /** sessionStorage, JSON boolean, written by the LINAC/CT app's Back to the Center button */
  returning: "simhub.returning",
} as const;

type PrefStore = "local" | "session";

function storage(store: PrefStore): Storage | undefined {
  return store === "session"
    ? globalThis.sessionStorage
    : globalThis.localStorage;
}

export function readPref<T>(
  key: string,
  fallback: T,
  store: PrefStore = "local",
): T {
  try {
    const raw = storage(store)?.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref(
  key: string,
  value: unknown,
  store: PrefStore = "local",
): void {
  try {
    storage(store)?.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked or full: the game goes on without remembering
  }
}

/** Reads the value, then removes it. */
export function takePref<T>(
  key: string,
  fallback: T,
  store: PrefStore = "local",
): T {
  const value = readPref(key, fallback, store);
  try {
    storage(store)?.removeItem(key);
  } catch {
    // as in writePref
  }
  return value;
}
```

`play-mode.ts`:

```ts
/* The play mode (sim-hub menu, Step 0): 'title' (the title menu over the turning overview), 'free'
   (Free Mode) or 'tutorial'. enterMode records the mode and tells the listeners; menu.ts's listener
   does the switch itself (the camera, walk mode, the menu), the HUD modules show or hide their parts.
   Free of scene and DOM imports so it is unit tested in Node (play-mode.spec.ts). */
export type PlayMode = "title" | "free" | "tutorial";
/** `atDoor`: a room id; the walk starts just outside that room's door, facing the hallway. */
export interface EnterOptions {
  atDoor?: string;
}

let mode: PlayMode = "title";
const listeners: ((m: PlayMode, opts: EnterOptions) => void)[] = [];

export function getPlayMode(): PlayMode {
  return mode;
}

/** Sets the mode, then calls every listener synchronously in registration order (so a menu click's
    user gesture still holds when a listener asks for the pointer lock). It notifies even when the mode
    does not change: the boot enters 'title' to show the menu. */
export function enterMode(m: PlayMode, opts: EnterOptions = {}): void {
  mode = m;
  for (const cb of [...listeners]) cb(m, opts);
}

/** Returns the unsubscribe. */
export function onPlayModeChange(
  cb: (m: PlayMode, opts: EnterOptions) => void,
): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}
```

`dialogs.ts`:

```ts
/* Esc's dialog registry (sim-hub menu, Step 0). Every dialog Esc should close registers how to tell it
   is open and how to close it. menu.ts's Esc handler closes the open one instead of opening the
   settings, and a pointer-lock loss while one is open (a dialog frees the pointer as it opens) does
   not open the settings. They are tried in registration order: hub-dialogs.ts registers today's
   dialogs, menu.ts the settings, hud-roomcard.ts the room card. Free of scene and DOM imports so it is
   unit tested in Node (dialogs.spec.ts). */
interface Dialog {
  name: string;
  isOpen: () => boolean;
  close: () => void;
}

const dialogs: Dialog[] = [];

/** Registering a name again replaces the earlier entry, in its place. */
export function registerDialog(
  name: string,
  isOpen: () => boolean,
  close: () => void,
): void {
  const i = dialogs.findIndex((d) => d.name === name);
  if (i >= 0) dialogs[i] = { name, isOpen, close };
  else dialogs.push({ name, isOpen, close });
}

/** The first registered dialog that is open, or null. */
export function openDialogName(): string | null {
  return dialogs.find((d) => d.isOpen())?.name ?? null;
}

/** Closes that dialog; true if one was open. */
export function closeOpenDialog(): boolean {
  const d = dialogs.find((x) => x.isOpen());
  if (!d) return false;
  d.close();
  return true;
}
```

`hub-dialogs.ts`:

```ts
/* Today's dialogs, registered for Esc (sim-hub menu, Step 0; dialogs.ts). Esc closes the open one
   before it would open the settings. Order matters: the procedure lab, opened from the CT QA dock,
   closes before the dock. */
import { registerDialog } from "./dialogs";
import {
  closeStaffDialogue,
  closeEquipmentPanel,
  closeLinacHeadLab,
  closeProcedureLab,
  closeKioskDialog,
} from "./interact";
import { showCtQaDock } from "./sdk-bridge";

const shown = (id: string) => () =>
  document.getElementById(id)?.classList.contains("show") ?? false;

registerDialog("procedureLab", shown("procedureLab"), () =>
  closeProcedureLab(),
);
registerDialog("linacHeadLab", shown("linacHeadDialog"), () =>
  closeLinacHeadLab(),
);
registerDialog("equipment", shown("equipmentPanel"), () =>
  closeEquipmentPanel(),
);
registerDialog("staff", shown("staffDialog"), () => closeStaffDialogue());
registerDialog("kiosk", shown("kioskDialog"), () => closeKioskDialog());
registerDialog("ctQaDock", shown("ctQaDock"), () => showCtQaDock(false));
```

- [ ] **0.6: Run the specs (expected PASS):** `pnpm exec vitest run --project server arcade-src/sim-hub/src`. Expected: `Test Files  8 passed (8)`, `Tests  100 passed (100)`.

- [ ] **0.7: Wire the pause into the main loop** (`main.ts`).

Old:

```ts
import { isHidden, installNpcCheckHook } from "./npc-check-hook";
import "./sdk-bridge";
```

New:

```ts
import { isHidden, installNpcCheckHook } from "./npc-check-hook";
import "./sdk-bridge";
import { isPaused } from "./pause";
import "./hub-dialogs";
```

Old:

```ts
function animate(now) {
  requestAnimationFrame(animate);
  stepSimulation(now);
}
```

New:

```ts
// While the game is paused (pause.ts: the Esc settings, a room card) the frame loop skips
// stepSimulation, and with it updateWalk: nobody moves and no simulation clock runs, but the frame is
// still drawn. The NPC check calls stepSimulation directly, so it never sees a pause.
function renderPaused(): void {
  if (isHidden()) return;
  clock.getDelta(); // drop the paused time, so the first step after the pause is an ordinary frame
  // the title menu's backdrop keeps turning while the settings are open over it
  if (S.mode === "overview" && !JOURNEY.cameraFollow) orbit.update();
  applyVisibility(camera);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
function animate(now) {
  requestAnimationFrame(animate);
  if (isPaused()) renderPaused();
  else stepSimulation(now);
}
```

- [ ] **0.8: Add the slots** (`index.html`).

Old:

```html
				font-weight: 850;
				cursor: pointer;
			}
		</style>
```

New:

```html
				font-weight: 850;
				cursor: pointer;
			}
			/* slot:menu */
			/* slot:hud-controls */
			/* slot:hud-prompt */
			/* slot:roomcard */
			/* slot:tutorial */
		</style>
```

Old:

```html
<div id="copyright">
  © 2026 <b>RTApps</b> · Kevin Kindle · Radiation Oncology Center
</div>
<canvas id="scene"></canvas>
```

New:

```html
<div id="copyright">
  © 2026 <b>RTApps</b> · Kevin Kindle · Radiation Oncology Center
</div>
<!-- slot:menu -->
<!-- slot:hud-controls -->
<!-- slot:hud-prompt -->
<!-- slot:roomcard -->
<!-- slot:tutorial -->
<canvas id="scene"></canvas>
```

(The CSS anchor `font-weight: 850; cursor: pointer; }` directly before `</style>` is the end of `.ctqa-step-run button`; it is unique there because it is followed by `</style>`.)

- [ ] **0.9: Checks.** Build; vitest (`8 passed`, `100 passed`); smoke; `pnpm check`; NPC check with label `step0` (`NPC unchanged`); scene check `step0` (`scene unchanged`); visibility check `step0` (summary equal to the baseline's). Nothing pauses yet, so the behaviour is the same as before.
- [ ] **0.10: Lint:**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
pnpm exec prettier --write \
	arcade-src/sim-hub/src/pause.ts \
	arcade-src/sim-hub/src/pause.spec.ts \
	arcade-src/sim-hub/src/prefs.ts \
	arcade-src/sim-hub/src/prefs.spec.ts \
	arcade-src/sim-hub/src/play-mode.ts \
	arcade-src/sim-hub/src/play-mode.spec.ts \
	arcade-src/sim-hub/src/dialogs.ts \
	arcade-src/sim-hub/src/dialogs.spec.ts \
	arcade-src/sim-hub/src/hub-dialogs.ts \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/sim-hub/index.html
pnpm exec eslint \
	arcade-src/sim-hub/src/pause.ts \
	arcade-src/sim-hub/src/pause.spec.ts \
	arcade-src/sim-hub/src/prefs.ts \
	arcade-src/sim-hub/src/prefs.spec.ts \
	arcade-src/sim-hub/src/play-mode.ts \
	arcade-src/sim-hub/src/play-mode.spec.ts \
	arcade-src/sim-hub/src/dialogs.ts \
	arcade-src/sim-hub/src/dialogs.spec.ts \
	arcade-src/sim-hub/src/hub-dialogs.ts \
	arcade-src/sim-hub/src/main.ts
```

Expected: eslint prints nothing. If prettier changed a file, rerun vitest.

- [ ] **0.11: Commit** (from `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps`, on `feat/sim-hub-menu`):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
S=apps/web/arcade-src/sim-hub
git add $S/src/pause.ts $S/src/pause.spec.ts $S/src/prefs.ts $S/src/prefs.spec.ts $S/src/play-mode.ts $S/src/play-mode.spec.ts $S/src/dialogs.ts $S/src/dialogs.spec.ts $S/src/hub-dialogs.ts $S/src/main.ts $S/index.html
git commit -m "feat(sim-hub): pause, prefs, play mode and Esc dialog registry; the main loop draws while paused

Step 0 of the menu plan: the shared foundation the parallel tasks build on, and one marked slot per
task in index.html.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 1a: title menu, Esc settings, Help, Free Mode start (worktree `menu-title`)

Today's boot (`main.ts` end): `requestAnimationFrame(animate)`, the loader fades at 900 ms (`#loader.hide`), and `#studentHelp` ("How to use") opens at 1150 ms. `S.mode` starts as `'overview'` (`state.ts`) without `setMode` ever running, the camera at the overview pose (`scene.ts`: (12, 82, 92) looking at (8, 0, -12)), ceilings hidden (`ceilings.forEach((c) => (c.visible = false))`). After this task the boot ends with `installMenu(); enterMode('title');`: `setMode('overview')` sets the same pose, the orbit turns on its own (`autoRotate`), the menu shows under the fading loader, and nothing else pops up.

**Files:**

- Create: `menu.ts`, `menu-rules.ts`, `menu-rules.spec.ts`, `sound.ts`
- Modify `main.ts`: the scene import's `AMBIENCE,` `initAmbience,` `ambienceProfile,`; `	toast,` in the `./interact` import; after `import { applyVisibility, groupRoomContents } from './visibility';`; `// Environment, wayfinding, and ambience` + `async function toggleAmbience()`; the LINAC-only Esc `keydown` listener; `document.getElementById('ambientBtn').onclick = toggleAmbience;`; the last line (`#studentHelp` auto-open).
- Modify `journey.ts`: the first lines of `function playIntercomAudio(text) {`.
- Modify `index.html`: after `/* slot:menu */` and after `<!-- slot:menu -->`.

**Interfaces.** Consumes: Step 0's four modules; `setMode`, `aimPlayerAt`, `doorPoint`, `doorNormal`, `requestWalkPointerLock` (walk.ts); `roomById`, `player`, `PLAYER_EYE_Y` (main.ts); `orbit`, `camera`, `AMBIENCE`, `initAmbience`, `updateAmbience`, `ambienceProfile` (scene.ts); `toast` (interact.ts). Produces:

```ts
// menu.ts
export function installMenu(): void; // main.ts calls it at the end of boot, then enterMode('title')
export function setTutorialAvailable(on: boolean): void; // PR 3 enables the Tutorial entry
// sound.ts
export function setSound(on: boolean): Promise<boolean>; // resolves to the state it ended in
export function applySoundPrefOnFirstGesture(): void;
// menu-rules.ts
export const AUTO_OPEN_GRACE_MS = 300;
export type EscAction = "ignore" | "closeDialog" | "openSettings";
export interface EscKeyState {
  msSinceAutoOpen: number;
  dialogOpen: boolean;
  locked: boolean;
  playMode: PlayMode;
  walking: boolean;
}
export function escKeyAction(s: EscKeyState): EscAction;
export interface LockLossState {
  walking: boolean;
  playMode: PlayMode;
  dialogOpen: boolean;
  paused: boolean;
}
export function lockLossOpensSettings(s: LockLossState): boolean;
```

DOM ids for the other tasks and the checks: `#titleMenu` (class `show` while shown), `#menuFree`, `#menuTutorial` (disabled), `#settingsMenu` (class `show`), `#setRoomCards` (checkbox; wired by 1c, not here), `#setSound`, `#setResume`, `#setMainMenu`. Registered dialog: `settings`. The play-mode listener: `'free'`/`'tutorial'` → hide the menu, `S.activeRoom = null`, `setMode('walk', false)`, with `atDoor` the start at `doorPoint(room)` facing along `doorNormal(room)`, then `requestWalkPointerLock()`; `'title'` → `setMode('overview')`, `orbit.enabled = false`, `orbit.autoRotate = true` (speed 0.25), show the menu.

- [ ] **1a.1: Write the failing spec** `menu-rules.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AUTO_OPEN_GRACE_MS,
  escKeyAction,
  lockLossOpensSettings,
  type EscKeyState,
  type LockLossState,
} from "./menu-rules";

// walking in Free Mode with the pointer free (say, after a dialog closed), nothing open
const walking: EscKeyState = {
  msSinceAutoOpen: Infinity,
  dialogOpen: false,
  locked: false,
  playMode: "free",
  walking: true,
};

describe("escKeyAction", () => {
  it("closes an open dialog (a conversation, a lab, the room card, the settings) instead of opening the settings", () => {
    expect(escKeyAction({ ...walking, dialogOpen: true })).toBe("closeDialog");
  });

  it("opens the settings while walking with the pointer free", () => {
    expect(escKeyAction(walking)).toBe("openSettings");
  });

  it("opens the settings on the title menu", () => {
    expect(
      escKeyAction({ ...walking, playMode: "title", walking: false }),
    ).toBe("openSettings");
  });

  it("leaves an Esc that reaches the page while the pointer is locked to the lock loss", () => {
    expect(escKeyAction({ ...walking, locked: true })).toBe("ignore");
  });

  it("ignores the Esc that has just released the lock and opened the settings", () => {
    expect(
      escKeyAction({
        ...walking,
        dialogOpen: true,
        msSinceAutoOpen: AUTO_OPEN_GRACE_MS - 1,
      }),
    ).toBe("ignore");
  });

  it("acts on Esc again once that grace has passed", () => {
    expect(
      escKeyAction({
        ...walking,
        dialogOpen: true,
        msSinceAutoOpen: AUTO_OPEN_GRACE_MS,
      }),
    ).toBe("closeDialog");
  });

  it("does nothing in guided travel (neither walking nor on the title)", () => {
    expect(escKeyAction({ ...walking, walking: false })).toBe("ignore");
  });
});

describe("lockLossOpensSettings", () => {
  const lost: LockLossState = {
    walking: true,
    playMode: "free",
    dialogOpen: false,
    paused: false,
  };

  it("opens the settings when the lock is lost while walking with nothing open", () => {
    expect(lockLossOpensSettings(lost)).toBe(true);
  });

  it("does so in the tutorial too", () => {
    expect(lockLossOpensSettings({ ...lost, playMode: "tutorial" })).toBe(true);
  });

  it("not when a dialog took the lock: every dialog frees the pointer as it opens", () => {
    expect(lockLossOpensSettings({ ...lost, dialogOpen: true })).toBe(false);
  });

  it("not when a pause took it (a room card)", () => {
    expect(lockLossOpensSettings({ ...lost, paused: true })).toBe(false);
  });

  it("not when the walk itself ended (Main menu, guided travel)", () => {
    expect(lockLossOpensSettings({ ...lost, walking: false })).toBe(false);
  });

  it("not on the title menu", () => {
    expect(lockLossOpensSettings({ ...lost, playMode: "title" })).toBe(false);
  });
});
```

- [ ] **1a.2: Run (expected FAIL):** `pnpm exec vitest run --project server arcade-src/sim-hub/src` → `menu-rules.spec.ts` fails to resolve `./menu-rules`; `Test Files  1 failed | 8 passed (9)`.

- [ ] **1a.3: Write `menu-rules.ts`:**

```ts
/* What Esc and a pointer-lock loss do (sim-hub menu, task 1a; menu.ts applies them). The browser keeps
   Esc to itself while the pointer is locked: it only releases the lock. So the settings open on that
   lock loss, unless the loss came from a dialog opening (every dialog frees the pointer as it opens)
   or a pause (a room card), and on an Esc keydown while the pointer is free. An Esc with a dialog open
   closes the dialog instead. AUTO_OPEN_GRACE_MS ignores an Esc keydown that arrives right after the
   lock loss already opened the settings, in a browser that sends both. Free of scene and DOM imports
   so it is unit tested in Node (menu-rules.spec.ts). */
import type { PlayMode } from "./play-mode";

export const AUTO_OPEN_GRACE_MS = 300;

export type EscAction = "ignore" | "closeDialog" | "openSettings";

export interface EscKeyState {
  /** Milliseconds since a lock loss last opened the settings. */
  msSinceAutoOpen: number;
  /** A registered dialog is open (dialogs.ts), the settings included. */
  dialogOpen: boolean;
  locked: boolean;
  playMode: PlayMode;
  /** In walk mode and not in guided travel. */
  walking: boolean;
}

export function escKeyAction(s: EscKeyState): EscAction {
  if (s.msSinceAutoOpen < AUTO_OPEN_GRACE_MS) return "ignore";
  if (s.dialogOpen) return "closeDialog";
  if (s.locked) return "ignore";
  return s.playMode === "title" || s.walking ? "openSettings" : "ignore";
}

export interface LockLossState {
  walking: boolean;
  playMode: PlayMode;
  dialogOpen: boolean;
  paused: boolean;
}

export function lockLossOpensSettings(s: LockLossState): boolean {
  return s.walking && s.playMode !== "title" && !s.dialogOpen && !s.paused;
}
```

- [ ] **1a.4: Run (expected PASS):** `Test Files  9 passed (9)`, `Tests  113 passed (113)`.

- [ ] **1a.5: Write `sound.ts`:**

```ts
/* Sound on and off (sim-hub menu, task 1a): the department ambience (scene.ts AMBIENCE, a WebAudio room
   tone). Off also silences the intercom beeps and speech (journey.ts playIntercomAudio checks
   AMBIENCE.on). It is off by default; Settings > Sound remembers the choice in PREF.sound. Browsers
   start audio only from a user gesture, so a remembered "on" is applied on the first click or key
   press of the visit. */
import {
  AMBIENCE,
  initAmbience,
  updateAmbience,
  ambienceProfile,
} from "./scene";
import { toast } from "./interact";
import { PREF, readPref } from "./prefs";

export async function setSound(on: boolean): Promise<boolean> {
  if (on) {
    initAmbience();
    if (!AMBIENCE.ctx) {
      toast("<b>Sound is not available in this browser.</b>");
      return false;
    }
    try {
      if (AMBIENCE.ctx.state !== "running") await AMBIENCE.ctx.resume();
    } catch {
      toast(
        "<b>Sound could not be started.</b><br>Click the page once and try again.",
      );
      return false;
    }
  }
  AMBIENCE.on = on;
  if (!AMBIENCE.ctx) return on; // off before it ever started: nothing to fade
  const t = AMBIENCE.ctx.currentTime;
  AMBIENCE.master.gain.cancelScheduledValues(t);
  if (on) {
    updateAmbience();
    AMBIENCE.master.gain.setTargetAtTime(ambienceProfile().master, t, 0.08);
  } else {
    AMBIENCE.master.gain.setTargetAtTime(0, t, 0.1);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  return on;
}

export function applySoundPrefOnFirstGesture(): void {
  const apply = () => {
    document.removeEventListener("pointerdown", apply, true);
    document.removeEventListener("keydown", apply, true);
    if (readPref<unknown>(PREF.sound, false) === true && !AMBIENCE.on)
      void setSound(true);
  };
  document.addEventListener("pointerdown", apply, true);
  document.addEventListener("keydown", apply, true);
}
```

- [ ] **1a.6: Write `menu.ts`:**

```ts
/* The title menu, the Esc settings and Help (sim-hub menu, task 1a).
   - Title menu (#titleMenu): Free Mode and Tutorial over the overview pose (walk.ts setMode
     'overview'), which turns slowly (OrbitControls autoRotate; main.ts updates the orbit in overview).
     Mouse, or Up/Down and Enter. Tutorial says "Coming soon" until PR 3 calls setTutorialAvailable.
   - Play modes (play-mode.ts): this module's listener does the switch. 'free' and 'tutorial' hide the
     menu, walk from the plaza (or, with atDoor, from just outside that room's door, facing the
     hallway) and ask for the pointer lock, which the browser grants because enterMode runs inside
     the entry's click. 'title' goes back to the turning overview and shows the menu.
   - Settings (#settingsMenu): Sound, Room introductions (its #setRoomCards box is wired by
     hud-roomcard.ts), Help, Resume and Main menu (not on the title; in the tutorial it asks first,
     inline: the player has no confirm()). It pauses the game (pause.ts). It opens when the pointer
     lock is lost while walking with nothing open (the browser keeps Esc to itself while locked), and
     on an Esc keydown while the pointer is free; Esc with a dialog open closes that dialog
     (dialogs.ts). menu-rules.ts holds those rules. */
import * as THREE from "three";
import { S } from "./state";
import { camera, orbit } from "./scene";
import { roomById, player, PLAYER_EYE_Y } from "./main";
import {
  setMode,
  aimPlayerAt,
  doorPoint,
  doorNormal,
  requestWalkPointerLock,
} from "./walk";
import {
  enterMode,
  getPlayMode,
  onPlayModeChange,
  type EnterOptions,
  type PlayMode,
} from "./play-mode";
import { isPaused, setPaused } from "./pause";
import { closeOpenDialog, openDialogName, registerDialog } from "./dialogs";
import { PREF, readPref, writePref } from "./prefs";
import { escKeyAction, lockLossOpensSettings } from "./menu-rules";
import { applySoundPrefOnFirstGesture, setSound } from "./sound";

/** About four minutes a turn at 60 frames a second (OrbitControls turns 2π/3600 × speed a frame). */
const TITLE_ORBIT_SPEED = 0.25;
const MODE_NAMES: Record<PlayMode, string> = {
  title: "Main menu",
  free: "Free Mode",
  tutorial: "Tutorial",
};
const TUTORIAL_LINE =
  "Follow objectives as a patient and a radiation therapist";

const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T | null;
let settingsOpen = false,
  autoOpenedAt = -Infinity,
  wasLocked = false;

export function setTutorialAvailable(on: boolean): void {
  const entry = byId<HTMLButtonElement>("menuTutorial"),
    line = byId("menuTutorialSub");
  if (entry) {
    entry.disabled = !on;
    entry.setAttribute("aria-disabled", String(!on));
  }
  if (line) line.textContent = on ? TUTORIAL_LINE : "Coming soon";
}

function showHelp(on: boolean): void {
  const panel = byId("setHelpPanel");
  if (panel) panel.hidden = !on;
  byId("setHelp")?.setAttribute("aria-expanded", String(on));
}

function showLeave(on: boolean): void {
  const ask = byId("setLeave"),
    mainMenu = byId("setMainMenu");
  if (ask) ask.hidden = !on;
  if (mainMenu && getPlayMode() !== "title") mainMenu.hidden = on;
  if (on) byId("setLeaveNo")?.focus();
}

function openSettings(): void {
  if (settingsOpen) return;
  settingsOpen = true;
  const mode = getPlayMode(),
    kicker = byId("setKicker"),
    title = byId("setTitle"),
    mainMenu = byId("setMainMenu"),
    sound = byId<HTMLInputElement>("setSound");
  if (kicker) kicker.textContent = mode === "title" ? "Settings" : "Paused";
  if (title) title.textContent = MODE_NAMES[mode];
  if (mainMenu) mainMenu.hidden = mode === "title";
  showHelp(false);
  showLeave(false);
  if (sound) sound.checked = readPref<unknown>(PREF.sound, false) === true;
  byId("settingsMenu")?.classList.add("show");
  setPaused("settings", true);
  if (document.pointerLockElement) document.exitPointerLock();
  byId("setResume")?.focus();
}

/** `relock`: only from a click or Enter on Resume, a user gesture the pointer lock needs. */
function closeSettings(relock: boolean): void {
  if (!settingsOpen) return;
  settingsOpen = false;
  byId("settingsMenu")?.classList.remove("show");
  setPaused("settings", false);
  if (getPlayMode() === "title") byId("menuFree")?.focus();
  else if (relock) requestWalkPointerLock();
}

function onMainMenu(): void {
  if (getPlayMode() === "tutorial") showLeave(true);
  else enterMode("title");
}

/** Free Mode from a room's door: just outside it, facing the hallway (main.ts boot, task 1e). */
function startAtDoor(roomId: string): void {
  const r = roomById(roomId);
  if (!r || r.hub) return;
  const at = doorPoint(r),
    out = doorNormal(r);
  player.pos.set(at.x, PLAYER_EYE_Y, at.z);
  camera.position.copy(player.pos);
  aimPlayerAt(
    new THREE.Vector3(at.x + out.x * 5, PLAYER_EYE_Y, at.z + out.z * 5),
  );
}

function onModeChange(m: PlayMode, opts: EnterOptions): void {
  closeSettings(false);
  const menu = byId("titleMenu");
  if (m === "title") {
    setMode("overview");
    orbit.enabled = false; // the backdrop turns on its own: no drag or zoom behind the menu
    orbit.autoRotate = true;
    orbit.autoRotateSpeed = TITLE_ORBIT_SPEED;
    menu?.classList.add("show");
    byId("menuFree")?.focus();
    return;
  }
  menu?.classList.remove("show");
  orbit.autoRotate = false;
  S.activeRoom = null; // walk.ts setMode starts on the plaza only when no room is active
  setMode("walk", false);
  if (opts.atDoor) startAtDoor(opts.atDoor);
  requestWalkPointerLock();
}

function onEscKey(e: KeyboardEvent): void {
  if (e.key !== "Escape" || e.repeat) return;
  const action = escKeyAction({
    msSinceAutoOpen: performance.now() - autoOpenedAt,
    dialogOpen: openDialogName() !== null,
    locked: !!document.pointerLockElement,
    playMode: getPlayMode(),
    walking: S.mode === "walk" && !S.travel,
  });
  if (action === "closeDialog") closeOpenDialog();
  else if (action === "openSettings") openSettings();
}

function onLockChange(): void {
  const locked = !!document.pointerLockElement;
  if (
    wasLocked &&
    !locked &&
    lockLossOpensSettings({
      walking: S.mode === "walk" && !S.travel,
      playMode: getPlayMode(),
      dialogOpen: openDialogName() !== null,
      paused: isPaused(),
    })
  ) {
    autoOpenedAt = performance.now();
    openSettings();
  }
  wasLocked = locked;
}

/** Up and Down move between the entries that are enabled; Enter presses the focused one (a button). */
function onMenuKey(e: KeyboardEvent): void {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();
  const entries = [
    ...document.querySelectorAll<HTMLButtonElement>("#titleMenu .tmEntry"),
  ].filter((b) => !b.disabled);
  if (!entries.length) return;
  const i = entries.indexOf(document.activeElement as HTMLButtonElement),
    step = e.key === "ArrowDown" ? 1 : -1;
  entries[i < 0 ? 0 : (i + step + entries.length) % entries.length].focus();
}

export function installMenu(): void {
  byId("menuFree")?.addEventListener("click", () => enterMode("free"));
  byId("menuTutorial")?.addEventListener("click", () => enterMode("tutorial"));
  byId("titleMenu")?.addEventListener("keydown", onMenuKey);
  registerDialog(
    "settings",
    () => settingsOpen,
    () => closeSettings(false),
  );
  byId("setResume")?.addEventListener("click", () => closeSettings(true));
  byId("setHelp")?.addEventListener("click", () =>
    showHelp(byId("setHelpPanel")?.hidden === true),
  );
  byId("setMainMenu")?.addEventListener("click", onMainMenu);
  byId("setLeaveYes")?.addEventListener("click", () => enterMode("title"));
  byId("setLeaveNo")?.addEventListener("click", () => {
    showLeave(false);
    byId("setMainMenu")?.focus();
  });
  const settings = byId("settingsMenu");
  // a click on the dimmed backdrop resumes, like Resume
  settings?.addEventListener("click", (e) => {
    if (e.target === settings) closeSettings(true);
  });
  const sound = byId<HTMLInputElement>("setSound");
  sound?.addEventListener("change", () => {
    void setSound(sound.checked).then((on) => {
      sound.checked = on;
      writePref(PREF.sound, on);
    });
  });
  applySoundPrefOnFirstGesture();
  document.addEventListener("keydown", onEscKey);
  document.addEventListener("pointerlockchange", onLockChange);
  onPlayModeChange(onModeChange);
  setTutorialAvailable(false);
}
```

- [ ] **1a.7: Markup and CSS** (`index.html`).

Old: `		<!-- slot:menu -->`
New:

```html
<!-- slot:menu -->
<div id="titleMenu" role="dialog" aria-modal="true" aria-labelledby="tmTitle">
  <div class="tmColumn">
    <div class="tmEyebrow">RTApps</div>
    <h1 id="tmTitle">Radiation Oncology Center</h1>
    <p class="tmSub">
      A walk-through of a working radiation therapy department
    </p>
    <div class="tmEntries">
      <button class="tmEntry" id="menuFree" type="button">
        <b>Free Mode</b
        ><span>Walk anywhere at your own pace and talk to the staff</span>
      </button>
      <button
        class="tmEntry"
        id="menuTutorial"
        type="button"
        disabled
        aria-disabled="true"
      >
        <b>Tutorial</b><span id="menuTutorialSub">Coming soon</span>
      </button>
    </div>
    <div class="tmFooter"><kbd>Esc</kbd> Settings</div>
  </div>
</div>
<div
  id="settingsMenu"
  role="dialog"
  aria-modal="true"
  aria-labelledby="setTitle"
>
  <div class="setCard">
    <div class="setK" id="setKicker">Paused</div>
    <h2 id="setTitle">Free Mode</h2>
    <label class="setRow"
      ><span>Sound</span><input type="checkbox" id="setSound"
    /></label>
    <label class="setRow">
      <span>Room introductions</span
      ><input type="checkbox" id="setRoomCards" checked />
    </label>
    <button class="setBtn" id="setHelp" type="button" aria-expanded="false">
      Help
    </button>
    <div id="setHelpPanel" hidden>
      <div class="setKeys">
        <kbd>W A S D</kbd><span>Move</span> <kbd>Mouse</kbd
        ><span>Look around (click the view first)</span> <kbd>Shift</kbd
        ><span>Run</span> <kbd>E</kbd
        ><span>Talk, use or open what the prompt shows</span> <kbd>Esc</kbd
        ><span>Settings and pause</span>
      </div>
      <p>
        Walk in through the main entrance and explore the departments at your
        own pace.
      </p>
      <p>
        Walk up to a staff member and press E when the prompt appears to talk
        with them.
      </p>
      <p>
        Each room introduces itself as you walk in. Turn this off under Room
        introductions.
      </p>
    </div>
    <button class="setBtn primary" id="setResume" type="button">Resume</button>
    <button class="setBtn" id="setMainMenu" type="button">Main menu</button>
    <div id="setLeave" hidden>
      <p>Leave the tutorial? Your progress in this chapter will be lost.</p>
      <button class="setBtn warn" id="setLeaveYes" type="button">Leave</button>
      <button class="setBtn" id="setLeaveNo" type="button">Stay</button>
    </div>
  </div>
</div>
```

Old: `			/* slot:menu */`
New:

```css
/* slot:menu */
#titleMenu {
  position: fixed;
  inset: 0;
  z-index: 240;
  display: none;
  background: linear-gradient(
    90deg,
    rgba(6, 11, 15, 0.94) 0%,
    rgba(6, 11, 15, 0.8) 40%,
    rgba(6, 11, 15, 0) 60%
  );
}
#titleMenu.show {
  display: block;
}
.tmColumn {
  position: absolute;
  left: clamp(28px, 7vw, 120px);
  top: 50%;
  transform: translateY(-50%);
  width: min(440px, calc(60vw - 56px));
}
.tmEyebrow {
  color: var(--teal);
  font-size: 15px;
  font-weight: 850;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
#tmTitle {
  margin: 8px 0 6px;
  font-size: clamp(30px, 3.6vw, 46px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.tmSub {
  margin: 0 0 30px;
  color: var(--dim);
  font-size: 17px;
  line-height: 1.45;
}
.tmEntries {
  display: grid;
  gap: 10px;
}
.tmEntry {
  display: grid;
  gap: 4px;
  text-align: left;
  padding: 15px 18px;
  border-radius: var(--radius);
  border: 1px solid var(--stroke);
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.15s;
}
.tmEntry b {
  font-size: 19px;
}
.tmEntry span {
  color: var(--dim);
  font-size: 15px;
}
.tmEntry:hover:not(:disabled),
.tmEntry:focus-visible {
  border-color: var(--teal);
  background: rgba(66, 213, 207, 0.12);
  transform: translateX(4px);
  outline: none;
}
.tmEntry:disabled {
  cursor: default;
  opacity: 0.55;
}
.tmFooter {
  margin-top: 26px;
  color: var(--dim);
  font-size: 15px;
}
#titleMenu kbd,
#settingsMenu kbd {
  color: var(--ink);
  font-family: monospace;
  font-size: 15px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--stroke);
  padding: 1px 6px;
  border-radius: 5px;
}
#settingsMenu {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: none;
  place-items: center;
  background: rgba(4, 8, 11, 0.62);
}
#settingsMenu.show {
  display: grid;
}
.setCard {
  width: min(420px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: var(--radius);
  border: 1px solid var(--stroke2);
  background: var(--panel);
  box-shadow: var(--shadow);
}
.setK {
  color: var(--teal);
  font-size: 15px;
  font-weight: 850;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
#setTitle {
  margin: 0 0 6px;
  font-size: 24px;
}
.setRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.03);
  font-size: 15px;
  cursor: pointer;
}
.setRow input {
  accent-color: var(--teal);
  width: 20px;
  height: 20px;
  cursor: pointer;
}
.setBtn {
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}
.setBtn:hover,
.setBtn:focus-visible {
  border-color: var(--teal);
  outline: none;
}
.setBtn.primary {
  background: var(--teal);
  border-color: transparent;
  color: #06231f;
  text-align: center;
}
.setBtn.warn {
  background: rgba(255, 106, 115, 0.16);
  border-color: rgba(255, 106, 115, 0.5);
}
#setHelpPanel,
#setLeave {
  display: grid;
  gap: 8px;
}
#setHelpPanel {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.03);
  font-size: 15px;
  color: #c9d9df;
}
#setHelpPanel p,
#setLeave p {
  margin: 0;
  line-height: 1.45;
}
#setLeave p {
  color: var(--amber);
  font-size: 15px;
}
.setKeys {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 12px;
  align-items: center;
  margin-bottom: 4px;
}
.setBtn[hidden],
#setHelpPanel[hidden],
#setLeave[hidden] {
  display: none;
}
```

- [ ] **1a.8: `main.ts` edits.**

(a) Old:

```ts
	canvas,
	AMBIENCE,
	initAmbience,
	updateAmbience,
	ambienceProfile,
	updatePerfFloor
} from './scene';
```

New:

```ts
	canvas,
	updateAmbience,
	updatePerfFloor
} from './scene';
```

(b) Old:

```ts
	updateInteractionUI,
	toast,
	closeStaffDialogue,
```

New:

```ts
	updateInteractionUI,
	closeStaffDialogue,
```

(c) Old: `import { applyVisibility, groupRoomContents } from './visibility';`
New:

```ts
import { applyVisibility, groupRoomContents } from "./visibility";
import { installMenu } from "./menu";
import { enterMode } from "./play-mode";
```

(d) Old: from `// Environment, wayfinding, and ambience` through the closing `}` of `async function toggleAmbience() {` (its last statement is the `if (AMBIENCE.on) toast(` … `);` block, 31 lines in all).
New: `// Environment and wayfinding` (one line; the function moves to `sound.ts` as `setSound`, without the old `#ambientBtn` label writes).

(e) Old:

```ts
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    document.getElementById("linacHeadDialog").classList.contains("show")
  )
    closeLinacHeadLab();
});
lhUpdateText();
```

New:

```ts
lhUpdateText();
```

(Esc now closes the LINAC head lab through the registry; keeping this listener would close it and then open the settings with the same key.)

(f) Old:

```ts
lhDraw();
document.getElementById("ambientBtn").onclick = toggleAmbience;
document.getElementById("eqClose").onclick = closeEquipmentPanel;
```

New:

```ts
lhDraw();
document.getElementById("eqClose").onclick = closeEquipmentPanel;
```

(g) Old: `setTimeout(() => document.getElementById('studentHelp')?.classList.add('show'), 1150);`
New:

```ts
// the title menu (menu.ts) opens over the turning overview, in place of the old "How to use" dialog
installMenu();
enterMode("title");
```

- [ ] **1a.9: Mute the intercom with Sound off** (`journey.ts`). Old:

```ts
function playIntercomAudio(text) {
	try {
		initAmbience();
```

New:

```ts
function playIntercomAudio(text) {
	// Settings > Sound off (the default) silences the intercom beeps and speech too (sound.ts)
	if (!AMBIENCE.on) return;
	try {
		initAmbience();
```

- [ ] **1a.10: Checks.** Build; vitest (`9 passed`, `113 passed`); smoke; `pnpm check`; NPC check label `1a` (`NPC unchanged`); visibility check label `1a` (this worktree still enters through `#modeSeg`, which still exists; summary equal to the baseline's).
- [ ] **1a.11: In the browser** (Playwright through `$MENU/pr1-shots.mjs`'s server, or `pnpm exec vite preview -c vite.arcade.config.ts`): the menu shows after loading and the clinic turns behind it; Down/Up keep the focus on Free Mode (Tutorial is disabled); Free Mode starts on the plaza aimed at the doors; Esc in walk mode opens Settings "Paused · Free Mode"; Resume locks the pointer again; Main menu goes back to the turning title; Esc on the title opens Settings with no Main menu button; the LINAC head lab (walk to Engineering) closes with Esc without opening the settings. No `pageerror`.
- [ ] **1a.12: Lint:**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-title/apps/web
pnpm exec prettier --write \
	arcade-src/sim-hub/src/menu.ts \
	arcade-src/sim-hub/src/menu-rules.ts \
	arcade-src/sim-hub/src/menu-rules.spec.ts \
	arcade-src/sim-hub/src/sound.ts \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/sim-hub/src/journey.ts \
	arcade-src/sim-hub/index.html
pnpm exec eslint \
	arcade-src/sim-hub/src/menu.ts \
	arcade-src/sim-hub/src/menu-rules.ts \
	arcade-src/sim-hub/src/menu-rules.spec.ts \
	arcade-src/sim-hub/src/sound.ts \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/sim-hub/src/journey.ts
```

- [ ] **1a.13: Commit** (from `$WT/menu-title`):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-title
S=apps/web/arcade-src/sim-hub
git add $S/src/menu.ts $S/src/menu-rules.ts $S/src/menu-rules.spec.ts $S/src/sound.ts $S/src/main.ts $S/src/journey.ts $S/index.html
git commit -m "feat(sim-hub): title menu, Esc settings with Sound, Help and Main menu, Free Mode start

The hub boots to the title menu over the turning overview instead of the How to use dialog. Esc and
a pointer-lock loss open the settings; Esc closes an open dialog first. Sound replaces the Ambience
button, is remembered, and also silences the intercom.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 1b: the E prompt and the controls bar (worktree `menu-prompt`)

**Files:**

- Create: `prompt-math.ts`, `prompt-math.spec.ts`, `hud-prompt.ts`, `hud-controls.ts`
- Modify `interact.ts`: after `import * as THREE from 'three';`; from `const interactables = [];` through the closing `}` of `export function updateInteractionUI() {` (the line before the blank line and `export const LINAC_HEAD_LAB = {`).
- Modify `walk.ts`: from `// door reach is measured from a fixed 1.65 m (main.ts REACH_Y), not the eye, so it feels as before` through the closing `}` of `export function nearestDoor(maxD = 2.6) {`.
- Modify `main.ts`: after `import { isHidden, installNpcCheckHook } from './npc-check-hook';`; after `	if (f % 3 === 1) updateInteractionUI();`.
- Modify `index.html`: after `<!-- slot:hud-controls -->`, `<!-- slot:hud-prompt -->`, `/* slot:hud-controls */`, `/* slot:hud-prompt */`.
- Not touched: `#interactPrompt`/`#interactText` markup and CSS (no longer referenced; 1f removes them).

**Interfaces.** Consumes: Step 0's `pause.ts`, `play-mode.ts`; `getColliders`, `nearestDoor`, `doorCenter`, `doorPoint` (walk.ts); `player`, `REACH_Y` (main.ts); `camera` (scene.ts); `STAFF_GUIDES` (interact.ts). Produces (brief, exact):

```ts
// interact.ts
export function registerInteractable(
  object,
  label,
  detail = "",
  range = 2.5,
  guideKey = null,
  action = null,
  opts: { enabled?: () => boolean } = {},
);
export type PromptTarget =
  | {
      kind: "thing";
      object: THREE.Object3D;
      person: boolean;
      reach: number;
      title: string;
      sub: string;
    }
  | { kind: "door"; room: Room; reach: number; title: string; sub: string };
export const getPromptTarget: () => PromptTarget | null;
// walk.ts
export function nearestDoor(
  maxD = 2.6,
  accept: (room: Room) => boolean = () => true,
): { room: Room; d: number } | null;
// prompt-math.ts
export interface WallRect {
  x: number;
  z: number;
  hw: number;
  hd: number;
} // = getColliders()'s entries
export const PROMPT_LEAD = 3.0,
  OPACITY_SMOOTH_SEC = 0.25,
  SIGHT_END_CLEARANCE = 0.3;
export function promptVisual(
  dist: number,
  range: number,
): { visible: boolean; opacity: number; scale: number };
export function smoothOpacity(
  shown: number,
  target: number,
  dt: number,
): number;
export function segmentBlocked(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  walls: readonly WallRect[],
  endClearance = 0,
): boolean;
// hud-prompt.ts
export function updatePrompt(dt: number): void; // every running frame
// hud-controls.ts
export function showControlsBar(): void; // on entering 'free' or 'tutorial' (its own play-mode listener)
export function updateControlsBar(dt: number): void; // every running frame
```

DOM ids: `#controlsBar` (class `show` while shown), `#ePrompt`, `#ePromptTitle`, `#ePromptSub`.

- [ ] **1b.1: Write the failing spec** `prompt-math.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  PROMPT_LEAD,
  SIGHT_END_CLEARANCE,
  promptVisual,
  segmentBlocked,
  smoothOpacity,
  type WallRect,
} from "./prompt-math";

describe("promptVisual, for a staff member (reach 2.4 m)", () => {
  const at = (d: number) => promptVisual(d, 2.4);

  it("is hidden at 6 m", () => {
    expect(at(6)).toEqual({ visible: false, opacity: 0, scale: 0.6 });
  });

  it("starts at reach + 3.0 = 5.4 m, still transparent", () => {
    expect(at(5.4)).toEqual({ visible: false, opacity: 0, scale: 0.6 });
  });

  it("fades in over the first 0.5 m", () => {
    expect(at(5.15).visible).toBe(true);
    expect(at(5.15).opacity).toBeCloseTo(0.5);
  });

  it("is fully opaque from 4.9 m, where it starts to grow from 0.6", () => {
    expect(at(4.9)).toEqual({ visible: true, opacity: 1, scale: 0.6 });
  });

  it("is part grown at 3.5 m", () => {
    expect(at(3.5).opacity).toBe(1);
    expect(at(3.5).scale).toBeCloseTo(0.824);
  });

  it("is full size at the reach, 2.4 m, and closer in, 2.0 m", () => {
    expect(at(2.4)).toEqual({ visible: true, opacity: 1, scale: 1 });
    expect(at(2.0)).toEqual({ visible: true, opacity: 1, scale: 1 });
  });

  it("starts PROMPT_LEAD beyond any reach", () => {
    expect(promptVisual(4.2 + PROMPT_LEAD - 0.01, 4.2).visible).toBe(true);
    expect(promptVisual(4.2 + PROMPT_LEAD + 0.01, 4.2).visible).toBe(false);
  });
});

describe("smoothOpacity", () => {
  it("moves at most dt / 0.25 s toward the target, so a full fade-in takes 0.25 s", () => {
    const a = smoothOpacity(0, 1, 0.1),
      b = smoothOpacity(a, 1, 0.1);
    expect(a).toBeCloseTo(0.4);
    expect(b).toBeCloseTo(0.8);
    expect(smoothOpacity(b, 1, 0.1)).toBe(1);
  });

  it("fades out the same way and never passes the target", () => {
    expect(smoothOpacity(1, 0, 0.125)).toBeCloseTo(0.5);
    expect(smoothOpacity(0.3, 0.5, 1)).toBe(0.5);
  });
});

describe("segmentBlocked", () => {
  // a 10 m wall along z = 0, 0.16 m thick, with a doorway from x -0.8 to 0.8: two colliders, as
  // rooms.ts builds a wall with a door
  const walls: WallRect[] = [
    { x: -2.9, z: 0, hw: 2.1, hd: 0.08 },
    { x: 2.9, z: 0, hw: 2.1, hd: 0.08 },
  ];

  it("is blocked through the wall", () => {
    expect(segmentBlocked(-2, -2, -2, 2, walls)).toBe(true);
  });

  it("is clear through the doorway", () => {
    expect(segmentBlocked(0, -2, 0.3, 2, walls)).toBe(false);
  });

  it("is blocked on a slant that clips the wall beside the doorway", () => {
    expect(segmentBlocked(-3, -1, 1, 1, walls)).toBe(true);
  });

  it("is clear when both ends are on the same side", () => {
    expect(segmentBlocked(-2, -2, 2, -1, walls)).toBe(false);
  });

  it("keeps a target on the wall face from being hidden by that wall, with the end clearance", () => {
    expect(segmentBlocked(-2, -2, -2, -0.05, walls)).toBe(true);
    expect(segmentBlocked(-2, -2, -2, -0.05, walls, SIGHT_END_CLEARANCE)).toBe(
      false,
    );
  });

  it("is clear with no walls, and for a target closer than the clearance", () => {
    expect(segmentBlocked(-2, -2, -2, 2, [])).toBe(false);
    expect(segmentBlocked(-2, -0.2, -2, 0.05, walls, SIGHT_END_CLEARANCE)).toBe(
      false,
    );
  });
});
```

- [ ] **1b.2: Run (expected FAIL):** `prompt-math.spec.ts` fails to resolve `./prompt-math`; `Test Files  1 failed | 8 passed (9)`.

- [ ] **1b.3: Write `prompt-math.ts`:**

```ts
/* Pure helpers for the E prompt (sim-hub menu, task 1b): how visible and how big the prompt is at a
   distance from its target, the smoothing that keeps it from popping, and the 2D line-of-sight test
   against the walk colliders. Free of scene and DOM imports so it is unit tested in Node
   (prompt-math.spec.ts). */

/** A wall collider as walk.ts collider() stores it (getColliders()): its centre and half extents on the
    floor plan. Every collider is a wall: helpers.ts wall() is collider()'s only caller. */
export interface WallRect {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

/** The prompt starts to appear this far beyond its target's reach (5.4 m for staff, reach 2.4). */
export const PROMPT_LEAD = 3.0;
/** Over the first FADE_IN metres inside PROMPT_LEAD its opacity rises from 0 to 1. */
const FADE_IN = 0.5;
/** Its scale grows from MIN_SCALE at reach + GROW to 1 at the reach. */
const GROW = 2.5,
  MIN_SCALE = 0.6;
/** Seconds the shown opacity takes to follow a full 0 to 1 change. */
export const OPACITY_SMOOTH_SEC = 0.25;
/** The sight line stops this short of its target, so a target hanging on a wall is not hidden by it. */
export const SIGHT_END_CLEARANCE = 0.3;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The prompt at `dist` metres (measured from REACH_Y) from a target whose E reach is `range`. */
export function promptVisual(
  dist: number,
  range: number,
): { visible: boolean; opacity: number; scale: number } {
  const opacity = clamp01((range + PROMPT_LEAD - dist) / FADE_IN),
    scale = MIN_SCALE + (1 - MIN_SCALE) * clamp01((range + GROW - dist) / GROW);
  return { visible: opacity > 0, opacity, scale };
}

/** Moves the shown opacity toward `target`, at most a full change per OPACITY_SMOOTH_SEC. */
export function smoothOpacity(
  shown: number,
  target: number,
  dt: number,
): number {
  const step = dt / OPACITY_SMOOTH_SEC;
  return shown < target
    ? Math.min(target, shown + step)
    : Math.max(target, shown - step);
}

/** Whether a wall lies between a (the player) and b (the target) on the floor plan. With
    `endClearance` the segment stops that far short of b. */
export function segmentBlocked(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  walls: readonly WallRect[],
  endClearance = 0,
): boolean {
  const len = Math.hypot(bx - ax, bz - az);
  if (len <= endClearance) return false;
  const k = (len - endClearance) / len,
    dx = (bx - ax) * k,
    dz = (bz - az) * k;
  for (const w of walls) if (crossesRect(ax, az, dx, dz, w)) return true;
  return false;
}

/** Slab test: does a + t·d, for t in [0, 1], pass through the inside of the rectangle? */
function crossesRect(
  ax: number,
  az: number,
  dx: number,
  dz: number,
  w: WallRect,
): boolean {
  let t0 = 0,
    t1 = 1;
  const slabs: [number, number, number, number][] = [
    [ax, dx, w.x - w.hw, w.x + w.hw],
    [az, dz, w.z - w.hd, w.z + w.hd],
  ];
  for (const [p, d, lo, hi] of slabs) {
    if (Math.abs(d) < 1e-9) {
      if (p <= lo || p >= hi) return false;
      continue;
    }
    const ta = (lo - p) / d,
      tb = (hi - p) / d;
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
    if (t0 >= t1) return false;
  }
  return true;
}
```

- [ ] **1b.4: Run (expected PASS):** `Test Files  9 passed (9)`, `Tests  115 passed (115)`.

- [ ] **1b.5: `walk.ts`: `nearestDoor` takes a filter.** Old:

```ts
// door reach is measured from a fixed 1.65 m (main.ts REACH_Y), not the eye, so it feels as before
const doorReachFrom = new THREE.Vector3();
export function nearestDoor(maxD = 2.6) {
  let best = null,
    bd = maxD;
  doorReachFrom.set(player.pos.x, REACH_Y, player.pos.z);
  ROOMS.filter((r) => !r.hub).forEach((r) => {
    const p = doorPoint(r),
      d = doorReachFrom.distanceTo(p);
    if (d < bd) {
      bd = d;
      best = { room: r, d };
    }
  });
  return best;
}
```

New:

```ts
// door reach is measured from a fixed 1.65 m (main.ts REACH_Y), not the eye, so it feels as before;
// `accept` lets the E prompt skip a door the player cannot see (interact.ts)
const doorReachFrom = new THREE.Vector3();
export function nearestDoor(
  maxD = 2.6,
  accept: (room: Room) => boolean = () => true,
) {
  let best = null,
    bd = maxD;
  doorReachFrom.set(player.pos.x, REACH_Y, player.pos.z);
  ROOMS.filter((r) => !r.hub).forEach((r) => {
    const p = doorPoint(r),
      d = doorReachFrom.distanceTo(p);
    if (d < bd && accept(r)) {
      bd = d;
      best = { room: r, d };
    }
  });
  return best;
}
```

- [ ] **1b.6: `interact.ts`.** (a) Old: `import * as THREE from 'three';` (line 22). New:

```ts
import * as THREE from "three";
import type { Room } from "./rooms";
import { getColliders } from "./walk";
import { isPaused } from "./pause";
import {
  PROMPT_LEAD,
  SIGHT_END_CLEARANCE,
  segmentBlocked,
} from "./prompt-math";
```

(The second `./walk` import is on purpose: 1d rewrites the first one; 1f merges them.)

(b) Old: from `const interactables = [];` through the closing `}` of `export function updateInteractionUI() {` (today's `registerInteractable`, `nearestInteractable`, `ROOM_APP_DOORS`, `performInteraction`, `updateInteractionUI`). New:

```ts
// `opts.enabled`: the target takes part only while it returns true (the tutorial's own targets, PR 3).
// An object whose own `visible` is false (an actor the player is playing) is never offered either.
const interactables = [];
export function registerInteractable(
  object,
  label,
  detail = "",
  range = 2.5,
  guideKey = null,
  action = null,
  opts: { enabled?: () => boolean } = {},
) {
  interactables.push({
    object,
    label,
    detail,
    range,
    guideKey,
    action,
    enabled: opts.enabled,
  });
  return object;
}
// E works on an object within its own range but never past 2.8 m (the old nearestInteractable cap),
// and on a door within 2.6 m (walk.ts nearestDoor). Reach is measured from a fixed 1.65 m (main.ts
// REACH_Y), not the eye (PLAYER_EYE_Y), so every interaction range feels as before.
const REACH_CAP = 2.8,
  DOOR_REACH = 2.6;
// Line of sight on the floor plan: a target with a wall between it and the player is skipped, so
// people in the next room never show a prompt through the wall.
const inSight = (x: number, z: number) =>
  !segmentBlocked(
    player.pos.x,
    player.pos.z,
    x,
    z,
    getColliders(),
    SIGHT_END_CLEARANCE,
  );
const doorInSight = (room: Room) => {
  const c = doorCenter(room);
  return inSight(c.x, c.z);
};
function nearestInteractable(lead = 0) {
  let best = null,
    bd = Infinity;
  const wp = new THREE.Vector3(),
    from = new THREE.Vector3(player.pos.x, REACH_Y, player.pos.z);
  for (const it of interactables) {
    if (it.object.visible === false || (it.enabled && !it.enabled())) continue;
    it.object.getWorldPosition(wp);
    const d = from.distanceTo(wp),
      reach = Math.min(REACH_CAP, it.range || REACH_CAP);
    if (d < bd && d <= reach + lead && inSight(wp.x, wp.z)) {
      bd = d;
      best = { ...it, d, reach, pos: wp.clone() };
    }
  }
  return best;
}
/** The nearest interactable or door within its reach + `lead`, decided as before: the interactable
    wins unless the door is more than 0.25 m nearer. */
function nearestTarget(lead: number) {
  const it = nearestInteractable(lead),
    // only doors that leave the hub for another simulator: every other door opens by itself as
    // the player walks up (walk.ts updateWalk), so it gets no prompt and E leaves it alone
    door = nearestDoor(
      DOOR_REACH + lead,
      (room) => leavesHub(room) && doorInSight(room),
    );
  if (it && (!door || it.d <= door.d + 0.25)) return { it, door: null };
  return door ? { it: null, door } : null;
}

const ROOM_APP_DOORS = new Set([
  "LINAC Control Area",
  "CT Control Room",
  "CT Simulator Room",
]);
/** A door that leaves the hub for another simulator, once that simulator's player URL resolved. */
const leavesHub = (room: Room) =>
  (!!S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) ||
  (!!S.CONSOLE_APP_URL && S.CONSOLE_APP_DOORS.has(room.name));

export function performInteraction() {
  if (S.mode !== "walk" || isPaused()) return;
  const t = nearestTarget(0);
  if (t?.it) {
    const it = t.it;
    if (it.guideKey && STAFF_GUIDES[it.guideKey]) {
      openStaffDialogue(it.guideKey);
      return;
    }
    if (typeof it.action === "function") {
      it.action(it);
      return;
    }
    toast(`<b>${it.label}</b><br>${it.detail || "Interactive object"}`);
    return;
  }
  if (!t?.door) return;
  const room = t.door.room;
  if (S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) {
    // RTApps (plan 4c): these three doors leave the hub for the LINAC/CT room app.
    window.top.location.href = S.ROOM_APP_URL;
    return;
  }
  if (S.CONSOLE_APP_URL && S.CONSOLE_APP_DOORS.has(room.name)) {
    // RTApps (plan 4d): the Learning Commons door leaves the hub for the console emulator.
    window.top.location.href = S.CONSOLE_APP_URL;
    return;
  }
}

/** What the E prompt shows; hud-prompt.ts places it beside `object` (or the door) every frame. */
export type PromptTarget =
  | {
      kind: "thing";
      object: THREE.Object3D;
      person: boolean;
      reach: number;
      title: string;
      sub: string;
    }
  | { kind: "door"; room: Room; reach: number; title: string; sub: string };
let promptTarget: PromptTarget | null = null;
export const getPromptTarget = (): PromptTarget | null => promptTarget;
function pickPromptTarget(): PromptTarget | null {
  // in reach first, so a full-size prompt is always what E does; else the nearest one fading in
  const t = nearestTarget(0) ?? nearestTarget(PROMPT_LEAD);
  if (!t) return null;
  if (t.door) {
    const room = t.door.room;
    return {
      kind: "door",
      room,
      reach: DOOR_REACH,
      title: `Enter ${room.name}`,
      sub: "",
    };
  }
  const it = t.it,
    guide = it.guideKey ? STAFF_GUIDES[it.guideKey] : null;
  return {
    kind: "thing",
    object: it.object,
    person: !!it.object.userData?.npcRole,
    reach: it.reach,
    title: guide ? `Talk to ${guide.name}` : it.label,
    sub: guide ? guide.role : "",
  };
}
/** Every third frame (main.ts stepSimulation): the crosshair, and the E prompt's target. */
export function updateInteractionUI() {
  const walking = S.mode === "walk" && !S.travel;
  document.getElementById("walkReticle")?.classList.toggle("show", walking);
  promptTarget = walking ? pickPromptTarget() : null;
}
```

- [ ] **1b.7: Write `hud-prompt.ts`:**

```ts
/* The E prompt (sim-hub menu, task 1b), in place of the old one under the crosshair. interact.ts picks
   its target every third frame (the nearest interactable or door, measured from REACH_Y, never
   through a wall); this module places it beside the target every frame, so it follows a person who
   moves:
     - a person: beside the head, at the top of their bounding box minus 0.12 m, offset right by half
       the head's on-screen width plus a gap;
     - an object: beside the top centre of its bounding box (its position, for an anchor with no mesh);
     - a door: beside the door centre at 2.0 m.
   It fades in from the target's reach + 3 m and grows to full size at the reach (prompt-math.ts). */
import * as THREE from "three";
import { camera } from "./scene";
import { S } from "./state";
import { player, REACH_Y } from "./main";
import { doorCenter, doorPoint } from "./walk";
import { getPromptTarget, type PromptTarget } from "./interact";
import { onPauseChange } from "./pause";
import { promptVisual, smoothOpacity } from "./prompt-math";

const HEAD_HALF_WIDTH = 0.12,
  HEAD_TOP_DROP = 0.12,
  DOOR_PROMPT_Y = 2.0,
  GAP_PX = 10;
const el = document.getElementById("ePrompt"),
  titleEl = document.getElementById("ePromptTitle"),
  subEl = document.getElementById("ePromptSub");
const box = new THREE.Box3(),
  at = new THREE.Vector3(),
  onScreen = new THREE.Vector3(),
  beside = new THREE.Vector3(),
  right = new THREE.Vector3(),
  from = new THREE.Vector3(),
  wp = new THREE.Vector3();
let shown = 0,
  shownScale = 0.6,
  showing = false,
  last: PromptTarget | null = null,
  lastText = "";

function hide(): void {
  shown = 0;
  last = null;
  if (!el || !showing) return;
  showing = false;
  el.style.opacity = "0";
  el.classList.remove("show");
}
// a room card or the settings cover the view: the prompt goes at once
onPauseChange((paused) => {
  if (paused) hide();
});

function anchorOf(t: PromptTarget, out: THREE.Vector3): THREE.Vector3 {
  if (t.kind === "door") return out.copy(doorCenter(t.room, DOOR_PROMPT_Y));
  box.setFromObject(t.object);
  if (box.isEmpty()) return t.object.getWorldPosition(out);
  if (t.person) {
    t.object.getWorldPosition(out);
    out.y = box.max.y - HEAD_TOP_DROP;
    return out;
  }
  return out.set(
    (box.min.x + box.max.x) / 2,
    box.max.y,
    (box.min.z + box.max.z) / 2,
  );
}

/** The distance E measures (interact.ts), redone every frame so the fade follows the walk. */
function reachDistance(t: PromptTarget): number {
  from.set(player.pos.x, REACH_Y, player.pos.z);
  return from.distanceTo(
    t.kind === "door" ? doorPoint(t.room) : t.object.getWorldPosition(wp),
  );
}

/** Every frame the game runs (main.ts stepSimulation), after the camera has moved. */
export function updatePrompt(dt: number): void {
  if (!el) return;
  if (S.mode !== "walk" || S.travel) {
    hide();
    return;
  }
  const picked = getPromptTarget();
  let target = 0;
  if (picked) {
    const v = promptVisual(reachDistance(picked), picked.reach);
    target = v.opacity;
    shownScale = v.scale;
    const text = picked.title + "\n" + picked.sub;
    if (text !== lastText) {
      lastText = text;
      if (titleEl) titleEl.textContent = picked.title;
      if (subEl) {
        subEl.textContent = picked.sub;
        subEl.hidden = !picked.sub;
      }
    }
    last = picked;
  }
  shown = smoothOpacity(shown, target, dt);
  const t = picked ?? last; // with no target left, the prompt fades out where it was
  if (!t || shown <= 0 || (t.kind === "thing" && t.object.visible === false)) {
    hide();
    return;
  }
  camera.updateMatrixWorld();
  anchorOf(t, at);
  onScreen.copy(at).project(camera);
  if (
    onScreen.z > 1 ||
    Math.abs(onScreen.x) > 1.2 ||
    Math.abs(onScreen.y) > 1.2
  ) {
    el.style.opacity = "0"; // behind the camera or off screen this frame
    return;
  }
  let gap = GAP_PX;
  if (t.kind === "thing" && t.person) {
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    beside.copy(at).addScaledVector(right, HEAD_HALF_WIDTH).project(camera);
    gap += (Math.abs(beside.x - onScreen.x) / 2) * innerWidth;
  }
  const x = ((onScreen.x + 1) / 2) * innerWidth + gap,
    y = ((1 - onScreen.y) / 2) * innerHeight;
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%) scale(${shownScale.toFixed(3)})`;
  el.style.opacity = shown.toFixed(3);
  if (!showing) {
    showing = true;
    el.classList.add("show");
  }
}
```

- [ ] **1b.8: Write `hud-controls.ts`:**

```ts
/* The controls bar (sim-hub menu, task 1b): "W A S D move · Mouse look · Shift run · E interact · Esc
   settings" at the bottom centre. It shows when walking starts in Free Mode or the tutorial and fades
   out (0.4 s, in CSS) once the player has moved for 1.0 s in total. It does not come back on its own;
   Settings > Help lists the controls. */
import { S } from "./state";
import { player } from "./main";
import { onPlayModeChange } from "./play-mode";

const HIDE_AFTER_MOVING_SEC = 1.0;
const bar = document.getElementById("controlsBar");
let showing = false,
  movedSec = 0,
  lastX = NaN,
  lastZ = NaN;

export function showControlsBar(): void {
  showing = true;
  movedSec = 0;
  lastX = NaN;
  lastZ = NaN;
  bar?.classList.add("show");
}

function hideControlsBar(): void {
  showing = false;
  bar?.classList.remove("show");
}

/** Every frame the game runs (main.ts stepSimulation): counts the time the player really moves. */
export function updateControlsBar(dt: number): void {
  if (!showing || S.mode !== "walk") return;
  const x = player.pos.x,
    z = player.pos.z;
  if (!Number.isNaN(lastX) && (x !== lastX || z !== lastZ)) movedSec += dt;
  lastX = x;
  lastZ = z;
  if (movedSec >= HIDE_AFTER_MOVING_SEC) hideControlsBar();
}

onPlayModeChange((m) =>
  m === "title" ? hideControlsBar() : showControlsBar(),
);
```

- [ ] **1b.9: `main.ts`.** (a) Old: `import { isHidden, installNpcCheckHook } from './npc-check-hook';` New:

```ts
import { isHidden, installNpcCheckHook } from "./npc-check-hook";
import { updatePrompt } from "./hud-prompt";
import { updateControlsBar } from "./hud-controls";
```

(b) Old:

```ts
if (f % 3 === 1) updateInteractionUI();
updateNpcLabels();
```

New:

```ts
if (f % 3 === 1) updateInteractionUI();
updatePrompt(dt);
updateControlsBar(dt);
updateNpcLabels();
```

- [ ] **1b.10: Markup and CSS** (`index.html`). Old: `		<!-- slot:hud-controls -->` New:

```html
<!-- slot:hud-controls -->
<div id="controlsBar" role="status">
  <kbd>W A S D</kbd> move · <kbd>Mouse</kbd> look · <kbd>Shift</kbd> run ·
  <kbd>E</kbd> interact · <kbd>Esc</kbd> settings
</div>
```

Old: `		<!-- slot:hud-prompt -->` New:

```html
<!-- slot:hud-prompt -->
<div id="ePrompt" aria-hidden="true">
  <b>E</b
  ><span class="epText"
    ><span id="ePromptTitle"></span><small id="ePromptSub" hidden></small
  ></span>
</div>
```

Old: `			/* slot:hud-controls */` New:

```css
/* slot:hud-controls */
#controlsBar {
  position: fixed;
  z-index: 75;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.4s,
    visibility 0s linear 0.4s;
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 999px;
  padding: 8px 16px;
  color: var(--dim);
  font-size: 15px;
  white-space: nowrap;
  box-shadow: var(--shadow);
  pointer-events: none;
}
#controlsBar.show {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.4s;
}
#controlsBar kbd {
  color: var(--ink);
  font-family: monospace;
  font-size: 15px;
  background: rgba(255, 255, 255, 0.07);
  padding: 1px 5px;
  border-radius: 4px;
}
```

Old: `			/* slot:hud-prompt */` New:

```css
/* slot:hud-prompt */
#ePrompt {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 82;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px 7px 8px;
  border-radius: 11px;
  border: 1px solid rgba(66, 213, 207, 0.38);
  background: rgba(8, 17, 23, 0.9);
  color: var(--ink);
  font-size: 15px;
  white-space: nowrap;
  box-shadow: var(--shadow);
  pointer-events: none;
  transform-origin: 0 50%;
  opacity: 0;
  visibility: hidden;
  will-change: transform, opacity;
}
#ePrompt.show {
  visibility: visible;
}
#ePrompt b {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--teal);
  color: #06231f;
  font-size: 15px;
}
#ePrompt .epText {
  display: grid;
  gap: 1px;
}
#ePromptTitle {
  font-weight: 750;
}
#ePromptSub {
  color: var(--dim);
  font-size: 15px;
}
#ePromptSub[hidden] {
  display: none;
}
```

- [ ] **1b.11: Checks.** Build; vitest (`9 passed`, `115 passed`); smoke; `pnpm check`; NPC check label `1b` (`NPC unchanged`; the check calls stepSimulation, so it runs `updatePrompt`/`updateControlsBar` under the stubs).
- [ ] **1b.12: In the browser** (this worktree enters walk mode with the old Walk button): walking in from the plaza, the controls bar shows and fades after a second of walking; "Talk to Maya Brooks / Patient Access Coordinator" appears beside Maya's head from about 5.4 m, small and faint, full size at 2.4 m, and follows her; nobody in the next room shows a prompt through the wall; the kiosk shows "Patient Orientation Kiosk" above its screen; the LINAC Control Area door shows "Enter LINAC Control Area" above the doorway, and ordinary doors show no prompt (they open as you walk up); E still opens the conversation. No `pageerror`.
- [ ] **1b.13: Lint:**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-prompt/apps/web
pnpm exec prettier --write \
	arcade-src/sim-hub/src/prompt-math.ts \
	arcade-src/sim-hub/src/prompt-math.spec.ts \
	arcade-src/sim-hub/src/hud-prompt.ts \
	arcade-src/sim-hub/src/hud-controls.ts \
	arcade-src/sim-hub/src/interact.ts \
	arcade-src/sim-hub/src/walk.ts \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/sim-hub/index.html
pnpm exec eslint \
	arcade-src/sim-hub/src/prompt-math.ts \
	arcade-src/sim-hub/src/prompt-math.spec.ts \
	arcade-src/sim-hub/src/hud-prompt.ts \
	arcade-src/sim-hub/src/hud-controls.ts \
	arcade-src/sim-hub/src/interact.ts \
	arcade-src/sim-hub/src/walk.ts \
	arcade-src/sim-hub/src/main.ts
```

- [ ] **1b.14: Commit** (from `$WT/menu-prompt`):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-prompt
S=apps/web/arcade-src/sim-hub
git add $S/src/prompt-math.ts $S/src/prompt-math.spec.ts $S/src/hud-prompt.ts $S/src/hud-controls.ts $S/src/interact.ts $S/src/walk.ts $S/src/main.ts $S/index.html
git commit -m "feat(sim-hub): E prompt beside the person or thing in reach, never through a wall; controls bar

The prompt fades in from reach + 3 m and grows until E works, follows a moving person, and skips
targets behind a wall collider or hidden. registerInteractable takes opts.enabled. The controls bar
shows when walking starts and fades after a second of moving.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 1c: the room pop-up (worktree `menu-roomcard`)

**Files:**

- Create: `room-enter.ts`, `room-enter.spec.ts`, `roomcard-rules.ts`, `roomcard-rules.spec.ts`, `hud-roomcard.ts`
- Modify `walk.ts`: after `import { cleanPoints } from './helpers';`; after `	const here = roomContainingWalkPoint(player.pos.x, player.pos.z);` in `updateWalk`.
- Modify `main.ts`: after `import './hub-dialogs';`.
- Modify `index.html`: after `<!-- slot:roomcard -->` and `/* slot:roomcard */`.

Today's walk-mode entry hook (`updateWalk` → `applyWalkConversationComposition`) fires only in rooms whose staff `focusTargetsForRoom` finds, so it is not used; it stays for `S.activeRoom`. `roomContainingWalkPoint` returns the first non-hub room whose rectangle, inset 0.35 m, holds the point (a vault's rectangle holds its entrance maze), else the lobby inside x ±11.5, z ±9.5, else null (hallways and outside).

**Interfaces.** Consumes: Step 0's modules; `ROOM_GUIDES` (main.ts); `STAFF_GUIDES` (interact.ts); `requestWalkPointerLock` (walk.ts); `Room` (rooms.ts); `#setRoomCards` (1a's checkbox, by id). Produces (brief, exact):

```ts
// room-enter.ts
export const ENTER_DWELL_SEC = 0.3;
export function createRoomEntryTracker(
  fire: (room: Room) => void,
): (room: Room | null, dt: number) => void;
export const noteWalkRoom: (room: Room | null, dt: number) => void; // walk.ts updateWalk, every walking frame
export function onRoomEnter(cb: (room: Room) => void): () => void;
// roomcard-rules.ts
export interface RoomCardPrefs {
  enabled: boolean;
  hidden: string[];
}
export function shouldShowRoomCard(
  roomId: string,
  prefs: RoomCardPrefs,
): boolean;
export function hideRoomCardFor(
  roomId: string,
  prefs: RoomCardPrefs,
): RoomCardPrefs;
export function setRoomCardsEnabled(
  on: boolean,
  prefs: RoomCardPrefs,
): RoomCardPrefs;
export function roomZoneLabel(zone: Room["zone"]): string;
export function roomTypeLabel(roomId: string): string;
```

DOM ids: `#roomPopup` (class `show` while shown), `#rcContinue`, `#rcHide`. Registered dialog: `roomCard`.

- [ ] **1c.1: Write the failing specs.** `room-enter.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Room } from "./rooms";
import { ENTER_DWELL_SEC, createRoomEntryTracker } from "./room-enter";

const room = (id: string) => ({ id }) as Room;
const LOBBY = room("lobby"),
  CONSULT = room("consult"),
  SOCIAL = room("social");

function tracker() {
  const fired: string[] = [];
  return { fired, note: createRoomEntryTracker((r) => fired.push(r.id)) };
}

describe("room entry", () => {
  it("fires once the player has been inside a room for 0.3 s, not before", () => {
    const { fired, note } = tracker();
    expect(ENTER_DWELL_SEC).toBe(0.3);
    note(CONSULT, 0.2);
    expect(fired).toEqual([]);
    note(CONSULT, 0.1);
    expect(fired).toEqual(["consult"]);
  });

  it("fires for the lobby too", () => {
    const { fired, note } = tracker();
    note(LOBBY, 0.3);
    expect(fired).toEqual(["lobby"]);
  });

  it("does not fire again while the player stays", () => {
    const { fired, note } = tracker();
    note(CONSULT, 0.3);
    note(CONSULT, 5);
    expect(fired).toEqual(["consult"]);
  });

  it("does not fire for a room left within 0.3 s", () => {
    const { fired, note } = tracker();
    note(CONSULT, 0.2);
    note(null, 0.05);
    note(SOCIAL, 0.2);
    expect(fired).toEqual([]);
  });

  it("fires again on the next entry after a hallway or outside", () => {
    const { fired, note } = tracker();
    note(CONSULT, 0.3);
    note(null, 0.05);
    note(CONSULT, 0.3);
    expect(fired).toEqual(["consult", "consult"]);
  });

  it("walking straight into another room fires it, and walking straight back does not repeat the first", () => {
    const { fired, note } = tracker();
    note(CONSULT, 0.3);
    note(SOCIAL, 0.3);
    note(CONSULT, 0.3);
    expect(fired).toEqual(["consult", "social"]);
  });
});
```

`roomcard-rules.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  hideRoomCardFor,
  roomTypeLabel,
  roomZoneLabel,
  setRoomCardsEnabled,
  shouldShowRoomCard,
  type RoomCardPrefs,
} from "./roomcard-rules";

const fresh: RoomCardPrefs = { enabled: true, hidden: [] };

describe("room card rules", () => {
  it("show a room’s card on the first entry", () => {
    expect(shouldShowRoomCard("consult", fresh)).toBe(true);
  });

  it("do not show a ticked room, and still show the others", () => {
    const ticked = hideRoomCardFor("consult", fresh);
    expect(shouldShowRoomCard("consult", ticked)).toBe(false);
    expect(shouldShowRoomCard("lobby", ticked)).toBe(true);
  });

  it("keep a ticked room once, however often it is ticked", () => {
    expect(
      hideRoomCardFor("consult", hideRoomCardFor("consult", fresh)).hidden,
    ).toEqual(["consult"]);
  });

  it("show no cards at all with room introductions off", () => {
    const off = setRoomCardsEnabled(false, fresh);
    expect(shouldShowRoomCard("consult", off)).toBe(false);
    expect(shouldShowRoomCard("lobby", off)).toBe(false);
  });

  it("clear the ticked rooms when room introductions come back on, so every card shows again", () => {
    const ticked = hideRoomCardFor("lobby", hideRoomCardFor("consult", fresh));
    const back = setRoomCardsEnabled(true, setRoomCardsEnabled(false, ticked));
    expect(back).toEqual({ enabled: true, hidden: [] });
    expect(shouldShowRoomCard("consult", back)).toBe(true);
  });

  it("keep the ticked rooms while room introductions are off", () => {
    expect(
      setRoomCardsEnabled(false, hideRoomCardFor("consult", fresh)).hidden,
    ).toEqual(["consult"]);
  });

  it("name the department zone as the old room panel did", () => {
    expect([
      roomZoneLabel("front"),
      roomZoneLabel("technical"),
      roomZoneLabel("clinical"),
    ]).toEqual(["Patient Services", "Technical / Support", "Clinical"]);
  });

  it("name the room type as the old room panel did", () => {
    expect(
      ["vault1", "vault2", "hdr", "ctcontrol", "ctsim", "consult"].map((id) =>
        roomTypeLabel(id),
      ),
    ).toEqual([
      "Modern LINAC treatment vault",
      "Modern LINAC treatment vault",
      "HDR / special procedures",
      "CT operator control room",
      "CT simulation",
      "Department area",
    ]);
  });
});
```

- [ ] **1c.2: Run (expected FAIL):** both new files fail to resolve their module; `Test Files  2 failed | 8 passed (10)`.

- [ ] **1c.3: Write `room-enter.ts`:**

```ts
/* Room entry (sim-hub menu, task 1c). onRoomEnter fires once the player has been inside a room
   (walk.ts roomContainingWalkPoint: the lobby included, a vault from its entrance maze on) for
   ENTER_DWELL_SEC. A room fires again only after the player has been out in a hallway or outside
   since it last fired, so walking between two connected rooms does not repeat it. walk.ts updateWalk
   feeds noteWalkRoom every walking frame; paused frames do not run it. Unlike the staff-composition
   hook (journey.ts applyWalkConversationComposition), it fires for rooms without staff too. The
   tracker has no scene or DOM imports, so it is unit tested in Node (room-enter.spec.ts). */
import type { Room } from "./rooms";

export const ENTER_DWELL_SEC = 0.3;

export function createRoomEntryTracker(
  fire: (room: Room) => void,
): (room: Room | null, dt: number) => void {
  let currentId: string | null = null,
    dwell = 0;
  const firedSinceHallway = new Set<string>();
  return (room, dt) => {
    if (!room) {
      currentId = null;
      dwell = 0;
      firedSinceHallway.clear();
      return;
    }
    if (room.id !== currentId) {
      currentId = room.id;
      dwell = 0;
    }
    if (firedSinceHallway.has(room.id)) return;
    dwell += dt;
    if (dwell >= ENTER_DWELL_SEC) {
      firedSinceHallway.add(room.id);
      fire(room);
    }
  };
}

const listeners: ((room: Room) => void)[] = [];

export const noteWalkRoom = createRoomEntryTracker((room) => {
  for (const cb of [...listeners]) cb(room);
});

/** Returns the unsubscribe. */
export function onRoomEnter(cb: (room: Room) => void): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}
```

`roomcard-rules.ts`:

```ts
/* The room card's rules (sim-hub menu, task 1c; hud-roomcard.ts applies them). A room's card shows
   unless room introductions are off or the room was ticked "Don't show this again"; turning room
   introductions back on clears the ticked rooms. The zone and room-type names are the old room
   panel's (interact.ts updateRoomUI, removed in task 1d). Free of scene and DOM imports so it is unit
   tested in Node (roomcard-rules.spec.ts). */
import type { Room } from "./rooms";

export interface RoomCardPrefs {
  enabled: boolean;
  hidden: string[];
}

export function shouldShowRoomCard(
  roomId: string,
  prefs: RoomCardPrefs,
): boolean {
  return prefs.enabled && !prefs.hidden.includes(roomId);
}

export function hideRoomCardFor(
  roomId: string,
  prefs: RoomCardPrefs,
): RoomCardPrefs {
  return prefs.hidden.includes(roomId)
    ? prefs
    : { ...prefs, hidden: [...prefs.hidden, roomId] };
}

export function setRoomCardsEnabled(
  on: boolean,
  prefs: RoomCardPrefs,
): RoomCardPrefs {
  return { enabled: on, hidden: on ? [] : prefs.hidden };
}

export function roomZoneLabel(zone: Room["zone"]): string {
  return zone === "front"
    ? "Patient Services"
    : zone === "technical"
      ? "Technical / Support"
      : "Clinical";
}

export function roomTypeLabel(roomId: string): string {
  if (roomId === "vault1" || roomId === "vault2")
    return "Modern LINAC treatment vault";
  if (roomId === "hdr") return "HDR / special procedures";
  if (roomId === "ctcontrol") return "CT operator control room";
  if (roomId === "ctsim") return "CT simulation";
  return "Department area";
}
```

- [ ] **1c.4: Run (expected PASS):** `Test Files  10 passed (10)`, `Tests  114 passed (114)`.

- [ ] **1c.5: Write `hud-roomcard.ts`:**

```ts
/* The room pop-up (sim-hub menu, task 1c): a centred card when the player walks into a room
   (room-enter.ts, the lobby included): the room's kicker, name and description, its department zone
   and room type, "What happens here" and who to talk to. It pauses the game (pause.ts) and frees the
   pointer; Continue (the button or Enter) resumes and locks the pointer again, Esc closes it too
   (dialogs.ts). "Don't show this again" keeps the room in PREF.roomCardsHidden; Settings > Room
   introductions (the #setRoomCards box in menu.ts's settings, wired here) turns every card off, and
   back on clears that list (roomcard-rules.ts). The element is #roomPopup: sdk-bridge.ts's CT QA
   animation pulses '#roomCard'. */
import type { Room } from "./rooms";
import { ROOM_GUIDES } from "./main";
import { STAFF_GUIDES } from "./interact";
import { requestWalkPointerLock } from "./walk";
import { setPaused } from "./pause";
import { openDialogName, registerDialog } from "./dialogs";
import { PREF, readPref, writePref } from "./prefs";
import { onRoomEnter } from "./room-enter";
import {
  hideRoomCardFor,
  roomTypeLabel,
  roomZoneLabel,
  setRoomCardsEnabled,
  shouldShowRoomCard,
  type RoomCardPrefs,
} from "./roomcard-rules";

const byId = (id: string) => document.getElementById(id);
const setText = (id: string, text: string) => {
  const el = byId(id);
  if (el) el.textContent = text;
};
let shownId: string | null = null;

function loadPrefs(): RoomCardPrefs {
  const hidden = readPref<unknown>(PREF.roomCardsHidden, []);
  return {
    enabled: readPref<unknown>(PREF.roomCardsEnabled, true) !== false,
    hidden: Array.isArray(hidden)
      ? hidden.filter((id): id is string => typeof id === "string")
      : [],
  };
}

function savePrefs(p: RoomCardPrefs): void {
  writePref(PREF.roomCardsEnabled, p.enabled);
  writePref(PREF.roomCardsHidden, p.hidden);
}

function showRoomCard(r: Room): void {
  const key = ROOM_GUIDES[r.id],
    guide = key ? STAFF_GUIDES[key] : null;
  setText("rcKicker", r.kicker);
  setText("rcName", r.name);
  setText("rcDesc", r.desc);
  setText("rcZone", roomZoneLabel(r.zone));
  setText("rcType", roomTypeLabel(r.id));
  setText("rcWhat", r.what);
  const staff = byId("rcStaff");
  if (staff) staff.hidden = !guide;
  if (guide) setText("rcStaffName", `${guide.name} · ${guide.role}`);
  const tick = byId("rcHide") as HTMLInputElement | null;
  if (tick) tick.checked = false;
  shownId = r.id;
  byId("roomPopup")?.classList.add("show");
  setPaused("roomCard", true);
  if (document.pointerLockElement) document.exitPointerLock();
  byId("rcContinue")?.focus();
}

/** `relock`: only from Continue (a click or Enter), a user gesture the pointer lock needs. */
function closeRoomCard(relock: boolean): void {
  if (!shownId) return;
  if ((byId("rcHide") as HTMLInputElement | null)?.checked)
    savePrefs(hideRoomCardFor(shownId, loadPrefs()));
  shownId = null;
  byId("roomPopup")?.classList.remove("show");
  setPaused("roomCard", false);
  if (relock) requestWalkPointerLock();
}

onRoomEnter((r) => {
  // one card at a time, never over another dialog (a conversation, a lab, the CT QA menu)
  if (
    shownId ||
    openDialogName() !== null ||
    !shouldShowRoomCard(r.id, loadPrefs())
  )
    return;
  showRoomCard(r);
});
registerDialog(
  "roomCard",
  () => shownId !== null,
  () => closeRoomCard(false),
);
byId("rcContinue")?.addEventListener("click", () => closeRoomCard(true));
document.addEventListener("keydown", (e) => {
  if (!shownId || e.key !== "Enter") return;
  e.preventDefault(); // the focused Continue must not also click
  closeRoomCard(true);
});
const roomCardsBox = byId("setRoomCards") as HTMLInputElement | null;
if (roomCardsBox) {
  roomCardsBox.checked = loadPrefs().enabled;
  roomCardsBox.addEventListener("change", () =>
    savePrefs(setRoomCardsEnabled(roomCardsBox.checked, loadPrefs())),
  );
}
```

- [ ] **1c.6: `walk.ts`.** (a) Old: `import { cleanPoints } from './helpers';` New:

```ts
import { cleanPoints } from "./helpers";
import { noteWalkRoom } from "./room-enter";
```

(b) Old:

```ts
	const here = roomContainingWalkPoint(player.pos.x, player.pos.z);
	if (here && walkCompositionReady(here) && S.walkCompositionRoomId !== here.id)
```

New:

```ts
	const here = roomContainingWalkPoint(player.pos.x, player.pos.z);
	noteWalkRoom(here, dt); // the room card (hud-roomcard.ts), for every room and the lobby
	if (here && walkCompositionReady(here) && S.walkCompositionRoomId !== here.id)
```

- [ ] **1c.7: `main.ts`.** Old: `import './hub-dialogs';` New:

```ts
import "./hub-dialogs";
import "./hud-roomcard";
```

- [ ] **1c.8: Markup and CSS** (`index.html`). Old: `		<!-- slot:roomcard -->` New:

```html
<!-- slot:roomcard -->
<div id="roomPopup" role="dialog" aria-modal="true" aria-labelledby="rcName">
  <div class="rcCard">
    <div class="rcKicker" id="rcKicker"></div>
    <h2 id="rcName"></h2>
    <p class="rcDesc" id="rcDesc"></p>
    <div class="rcMeta">
      <div><span>Department zone</span><b id="rcZone"></b></div>
      <div><span>Room type</span><b id="rcType"></b></div>
    </div>
    <div class="rcWhat"><b>What happens here</b><span id="rcWhat"></span></div>
    <div class="rcStaff" id="rcStaff">
      <b id="rcStaffName"></b><span>Walk up and press E to talk</span>
    </div>
    <div class="rcFoot">
      <label class="rcHide"
        ><input type="checkbox" id="rcHide" /> Don't show this again</label
      >
      <button class="rcContinue" id="rcContinue" type="button">Continue</button>
    </div>
  </div>
</div>
```

Old: `			/* slot:roomcard */` New:

```css
/* slot:roomcard */
#roomPopup {
  position: fixed;
  inset: 0;
  z-index: 230;
  display: none;
  place-items: center;
  background: rgba(4, 8, 11, 0.5);
}
#roomPopup.show {
  display: grid;
}
.rcCard {
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 22px 24px;
  border-radius: var(--radius);
  border: 1px solid var(--stroke2);
  background: var(--panel);
  box-shadow: var(--shadow);
}
.rcKicker {
  color: var(--teal);
  font-size: 15px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
#rcName {
  margin: 6px 0 8px;
  font-size: 26px;
  line-height: 1.15;
}
.rcDesc {
  margin: 0 0 14px;
  color: #c9d9df;
  font-size: 15px;
  line-height: 1.5;
}
.rcMeta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.rcMeta div {
  padding: 9px 11px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.03);
}
.rcMeta span {
  display: block;
  color: var(--dim);
  font-size: 15px;
}
.rcMeta b {
  display: block;
  margin-top: 2px;
  font-size: 15px;
}
.rcWhat {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(66, 213, 207, 0.075);
  border: 1px solid rgba(66, 213, 207, 0.2);
  font-size: 15px;
  line-height: 1.5;
  color: #cce5e4;
}
.rcWhat b {
  display: block;
  margin-bottom: 2px;
  color: var(--ink);
}
.rcStaff {
  margin-top: 12px;
  display: grid;
  gap: 2px;
  font-size: 15px;
}
.rcStaff span {
  color: var(--dim);
}
.rcStaff[hidden] {
  display: none;
}
.rcFoot {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.rcHide {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dim);
  font-size: 15px;
  cursor: pointer;
}
.rcHide input {
  accent-color: var(--teal);
  width: 18px;
  height: 18px;
}
.rcContinue {
  border: 0;
  border-radius: 10px;
  padding: 10px 22px;
  background: var(--teal);
  color: #06231f;
  font-size: 15px;
  font-weight: 850;
  cursor: pointer;
}
```

- [ ] **1c.9: Checks.** Build; vitest (`10 passed`, `114 passed`); smoke; `pnpm check`; NPC check label `1c` (`NPC unchanged`).
- [ ] **1c.10: In the browser** (old Walk button): walking into the lobby, after a moment the lobby card shows ("Front of House · Patient Access", "Reception / Waiting Lobby", Patient Services, Department area, "Maya Brooks · Patient Access Coordinator") and nobody moves behind it; Continue (and Enter) resumes; leave and come back: it shows again; tick "Don't show this again", Continue, leave and come back: no card, and `localStorage['simhub.roomCards.hidden']` is `["lobby"]`; a room without visible staff (any) still shows its card; walking into Vault 1 shows its card from the maze. No `pageerror`.
- [ ] **1c.11: Lint:**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-roomcard/apps/web
pnpm exec prettier --write \
	arcade-src/sim-hub/src/room-enter.ts \
	arcade-src/sim-hub/src/room-enter.spec.ts \
	arcade-src/sim-hub/src/roomcard-rules.ts \
	arcade-src/sim-hub/src/roomcard-rules.spec.ts \
	arcade-src/sim-hub/src/hud-roomcard.ts \
	arcade-src/sim-hub/src/walk.ts \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/sim-hub/index.html
pnpm exec eslint \
	arcade-src/sim-hub/src/room-enter.ts \
	arcade-src/sim-hub/src/room-enter.spec.ts \
	arcade-src/sim-hub/src/roomcard-rules.ts \
	arcade-src/sim-hub/src/roomcard-rules.spec.ts \
	arcade-src/sim-hub/src/hud-roomcard.ts \
	arcade-src/sim-hub/src/walk.ts \
	arcade-src/sim-hub/src/main.ts
```

- [ ] **1c.12: Commit** (from `$WT/menu-roomcard`):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-roomcard
S=apps/web/arcade-src/sim-hub
git add $S/src/room-enter.ts $S/src/room-enter.spec.ts $S/src/roomcard-rules.ts $S/src/roomcard-rules.spec.ts $S/src/hud-roomcard.ts $S/src/walk.ts $S/src/main.ts $S/index.html
git commit -m "feat(sim-hub): room pop-up card on entering a room, pausing the game

onRoomEnter fires after 0.3 s in any room, the lobby included, and again only after a hallway. The
card shows the zone, room type, what happens there and who to talk to; Don't show this again and
Settings > Room introductions are remembered.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 1d: remove the old panels (worktree `menu-cleanup`)

**Files:**

- Modify `index.html`: the old HUD's CSS and markup (D1–D14 below; not `#walkReticle`, `#interactPrompt`, `#watermark`, `#copyright`, `#toast`, the dialogs, the labs, the dock).
- Modify `main.ts` (M1–M8), `walk.ts` (W1–W8), `interact.ts` (I1–I11), `journey.ts` (J1–J10), `sdk-bridge.ts` (S1–S5), `props.ts` (P1–P2), `apps/web/scripts/sim-hub-visibility-check.mjs` (V1).

**Interfaces.** Consumes: nothing new. Produces: `export function openCtQaMenu(): void` (sdk-bridge.ts); the "CT QA menu" interactable on the CT scanner; `applyWalkConversationComposition` no longer touches the HUD and closes the CT QA dock in any other room. Removed exports: `updateRoomUI`, `renderRoomList`, `updateFacilityInfo`, `bindPanelToggle` (interact.ts), `startJourneyFromKiosk` (journey.ts). Kept: `beginTravel`/guided travel (journeys and the visibility check's poses), overview mode (the title backdrop), `showCtQaDock`, `syncCtQaProgress`, `procRenderSite`, the QA verdict path, every journey, actor and route builder, `updateJourneyUI` and `showDayTransition` (already null-safe: each returns at once when `#journeyStart`/`#journeyNext` or `#dayTransition` is missing).

**Every lookup of a removed id, and what happens to it** (base line numbers):

| File:line                                  | Lookup                                                                      | Action                                              |
| ------------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------- |
| main.ts 473                                | `ambientBtn` (toggleAmbience)                                               | 1a (moved to sound.ts without it)                   |
| main.ts 568–578                            | `studentHelp`, `helpBtn`, `studentHelpClose`                                | M3 removes                                          |
| main.ts 579–585                            | `#modeSeg button`                                                           | M3 removes                                          |
| main.ts 586–594                            | `#zoneChips button`                                                         | M3 removes                                          |
| main.ts 595–600                            | `homeBtn`, `backBtn`                                                        | M3 removes                                          |
| main.ts 619                                | `ambientBtn`                                                                | 1a removes                                          |
| main.ts 621–622                            | `clinicalFocusDetails`                                                      | M4 removes                                          |
| main.ts 624–629                            | `kioskTreatment`, `kioskNewPatient`, `kioskExplore`                         | M4 removes                                          |
| main.ts 633–638                            | `#journeyModes button`, `journeyStart`, `journeyNext`, `journeyReset`       | M4 removes                                          |
| main.ts 640–641                            | `bindPanelToggle(roomRail…/infoPanel…)` (also creates `#infoPanelHandle`)   | M4 removes                                          |
| main.ts 764                                | `studentHelp`                                                               | 1a replaces                                         |
| walk.ts 325–328, 332                       | `#modeSeg button`, `walkHint`, `overviewNote`, `roomLookHint` (beginTravel) | W4 removes                                          |
| walk.ts 345–348, 362                       | `travelName`/`travelPct`/`travelFill`/`travelHUD`                           | W5, W6 remove                                       |
| walk.ts 369–371                            | `backBtn`, `locText` (finishTravel)                                         | W6 removes                                          |
| walk.ts 382–384, 401–403, 421–423, 451–453 | travel HUD (updateTravel)                                                   | W7 removes                                          |
| walk.ts 483–486, 489, 504, 508, 520–521    | `#modeSeg`, `walkHint`, `overviewNote`, `roomLookHint`, `locText` (setMode) | W8 removes                                          |
| interact.ts 519–520                        | `interactPrompt`, `interactText`                                            | 1b (no longer used); 1f removes the markup          |
| interact.ts 1051                           | `[data-eqid]` (bindRoomEquipmentButtons)                                    | I5 removes the function                             |
| interact.ts 1102, 1106                     | `roomLookHint` (enable/disableRoomInspection)                               | I6 removes the lines                                |
| interact.ts 1112–1113                      | `#zoneChips button.active`, `roomList` (renderRoomList)                     | I7 removes the function                             |
| interact.ts 1125–1129                      | `infoK`/`infoTitle`/`infoSub`/`infoBody` (updateFacilityInfo)               | I7 removes                                          |
| interact.ts 1167                           | `procedureRoomBtn` (bindProcedureRoomButtons)                               | I8 removes                                          |
| interact.ts 1262–1293                      | `info*`, `travelHere`, `overviewHere`, `talkHere` (updateRoomUI)            | I9 removes                                          |
| interact.ts 1379–1380                      | `bindPanelToggle`'s panel and button                                        | I11 removes                                         |
| journey.ts 360–363                         | `dayTransition*`                                                            | already null-safe; kept                             |
| journey.ts 417–440                         | journey box and `#patientJourneyHUD` (updateJourneyUI)                      | already null-safe; kept                             |
| journey.ts 618                             | `roomLookHint` (setJourneyCameraFollow)                                     | J5 removes                                          |
| journey.ts 650                             | `locText` (updateJourneyCameraFollow)                                       | J6 removes                                          |
| journey.ts 2963                            | `locText` (applyWalkConversationComposition)                                | J9 removes                                          |
| journey.ts 2992                            | `roomLookHint` (enableGuidedConversationComposition)                        | J10 removes                                         |
| sdk-bridge.ts 92                           | `locText` (focusCtPatientFromControl)                                       | S3 removes                                          |
| sdk-bridge.ts 282                          | `ctQaGoRoom`                                                                | S5 removes                                          |
| equipment.ts 1429, 1435–1443               | `clinicalFocusHUD`/`Title`/`Note`                                           | already null-safe (`?.`, `if (!hud) return;`); kept |
| visibility check 163                       | `#modeSeg button[data-mode="walk"]`                                         | V1                                                  |

- [ ] **1d.1: `index.html` CSS.**
  - **D1** delete from `			#topbar {` through the closing `}` of `			#overviewNote b {` (the line before `			#copyright {`): the top bar, `.brand`, `.seg`, `.ambientBtn`, `#roomRail`, `.railbox`, `.railhead`, `.zonechips`, `#roomList`, `#journeyBox`, `.roombtn`, `.jrow`, `.jtxt`, the `.journey*` rules, `#patientJourneyHUD`, `#dayTransition`, `#infoPanel`, `.iph`, `.ipbody`, `.desc`, `.meta`, `.mcell`, `.phase`, `.iactions`, `#travelHUD`, `.thtop`, `.travelbar`, `#walkHint`, `#roomLookHint`, `#overviewNote`.
  - **D2** delete from `			.panelToggle {` through the closing `}` of `			.railbox,\n			.iph {` (keep the blank line and `			.room-label {` after it).
  - **D3** delete from `			#studentHelp {` through the closing `}` of the `@media (max-width: 800px) {` block that ends with `.seg button { padding: 6px 9px; }` (keep the blank line and `			/* Department-orientation conversation UI */`).
  - **D4** delete from `			.roomIntro {` through the closing `}` of `			.iactions .talk {` (keep `			@media (max-width: 650px) {`), and inside that media query, Old:

```css
				.sdQuestions {
					max-height: 140px;
					overflow: auto;
				}
				.iactions.three {
					grid-template-columns: 1fr;
				}
			}
```

    New:

```css
				.sdQuestions {
					max-height: 140px;
					overflow: auto;
				}
			}
```

- **D5** delete from `			#clinicalFocusHUD {` through the closing `}` of `			.cfNote {` (keep `			/* Clinical interaction and equipment */` and `			#equipmentPanel {`).
- **D6** delete from `			.eqList {` through the closing `}` of `			.eqRoomButtons button:hover {` (keep `			#kioskDialog {`).
- **D7** Old: from `			@media (max-width: 1080px) {\n				#clinicalFocusHUD {` through `			.journeyButtons {\n				grid-template-columns: 1fr 1fr 38px;\n			}` (both media queries and the `/* Readability baseline: minimum interface text size approximately 11 pt. */` block of `#roomRail`, `#infoPanel`, `#journeyBox`, `#patientJourneyHUD`, `#topbar`, `.roombtn`, `.zonechips`, `.journeyModes`, `.journeyButtons`). New:

```css
@media (max-width: 800px) {
  .kioskChoices {
    grid-template-columns: 1fr;
  }
}
```

    (`			#linacHeadDialog {` follows directly: the blank line and the readability comment were inside the deleted text.)

- **D8** delete the `			.ctqa-roombtn {` rule (12 lines, before `			.ctqa-step-run {`).

- [ ] **1d.2: `index.html` markup.**
  - **D9** delete from `		<div id="topbar">` through the `#walkHint` block (`		<div id="walkHint">` … `		</div>`), keeping `		<div id="watermark">RTApps</div>` above and `		<div id="walkReticle"></div>` below.
  - **D10** delete `#roomLookHint` and `#overviewNote` (from `		<div id="roomLookHint">` through the `</div>` closing `#overviewNote`), keeping `		<div id="interactPrompt">…` above (1f removes it) and `		<div id="toast"></div>` below.
  - **D11** delete `#patientJourneyHUD`, `#dayTransition` and `#clinicalFocusHUD` (from `		<div id="patientJourneyHUD">` through the `</div>` closing `#clinicalFocusHUD`), keeping `		<div id="equipmentPanel" …>`.
  - **D12** Old:

```html
<div class="kioskChoices">
  <button id="kioskTreatment">
    <b>Returning Treatment Day</b>Follow Jordan from check-in through LINAC
    treatment and departure.</button
  ><button id="kioskNewPatient">
    <b>Mia: Consult → First Treatment</b>Follow Mia from consultation and CT
    simulation through planning, physics QA, and her return for the first
    radiation treatment.</button
  ><button class="full" id="kioskExplore">
    <b>Explore Freely</b>Enter Walk mode and inspect staff, rooms, and clinical
    equipment.</button
  ><button class="full" id="kioskClose">
    <b>Close kiosk</b>Return to the current view without starting a journey.
  </button>
</div>
```

    New:

```html
<div class="kioskChoices">
  <button class="full" id="kioskClose">
    <b>Close kiosk</b>Return to the current view.
  </button>
</div>
```

- **D13** delete `		<div id="studentHelp" …>` through its closing `		</div>` and the blank line after it (keep `		<div id="staffDialog" …>`).
- **D14** CT QA dock. Old:

```html
<p>
  This contextual menu becomes available after entering the CT room. Launch QA
  from here.
</p>
```

    New: `					<p>Opened with E at the CT scanner. Launch QA from here.</p>`. And delete `				<button class="ctqa-roombtn" id="ctQaGoRoom" type="button">Return focus to CT room</button>`.

- [ ] **1d.3: `index.html` check.** From `apps/web`:

```bash
grep -nE 'id="(topbar|modeSeg|helpBtn|ambientBtn|roomRail|roomRailToggle|zoneChips|roomList|journeyBox|backBtn|locText|homeBtn|journeyModes|journeyStart|journeyNext|journeyReset|infoPanel|infoPanelToggle|infoK|infoTitle|infoSub|infoBody|travelHUD|walkHint|roomLookHint|overviewNote|patientJourneyHUD|dayTransition|clinicalFocusHUD|clinicalFocusDetails|kioskTreatment|kioskNewPatient|kioskExplore|studentHelp|studentHelpClose|ctQaGoRoom)"' arcade-src/sim-hub/index.html
grep -nE '#(topbar|roomRail|roomList|journeyBox|patientJourneyHUD|dayTransition|infoPanel|travelHUD|walkHint|roomLookHint|overviewNote|studentHelp|clinicalFocusHUD)\b|\.(brand|seg|ambientBtn|railbox|railhead|zonechips|roombtn|jrow|jtxt|journeyCtl|journeyModes|journeyHead|journeyStep|journeyBar|journeyButtons|iph|ipbody|desc|meta|mcell|phase|iactions|thtop|travelbar|panelToggle|roomIntro|staffCard|eqList|eqLabel|eqRoomButtons|cfTop|cfTitle|cfNote|jhTop|jhSub|studentHelpCard|studentHelpGrid|studentHelpStep|studentHelpActions|ctqa-roombtn)\b' arcade-src/sim-hub/index.html
```

Expected: both print nothing. `grep -c 'id="watermark"\|id="siteChoices"\|id="releaseClinical"\|id="holdClinical"\|id="walkReticle"\|id="ctQaDock"' arcade-src/sim-hub/index.html` prints `6`.

- [ ] **1d.4: `main.ts`.**
  - **M1** Old:

```ts
	workflowState,
	CLINICAL_FOCUS
} from './equipment';
import {
	beginTravel,
	updateTravel,
	updateDoors,
	updateWalk,
	setMode,
	applyWalkMouseDelta,
	requestWalkPointerLock
} from './walk';
```

    New:

```ts
	workflowState
} from './equipment';
import {
	updateTravel,
	updateDoors,
	updateWalk,
	applyWalkMouseDelta,
	requestWalkPointerLock
} from './walk';
```

- **M2** Old:

```ts
	lhUpdateText,
	showEquipmentPanel,
	closeEquipmentPanel,
	bindPanelToggle,
	renderRoomList,
	updateFacilityInfo,
	procRenderSite,
```

    New:

```ts
	lhUpdateText,
	closeEquipmentPanel,
	procRenderSite,
```

    and Old:

```ts
	updateJourneyUI,
	resetTreatmentJourney,
	startTreatmentJourney,
	advanceTreatmentJourney,
	startJourneyFromKiosk,
	updateJourneyRoomTiming,
```

    New:

```ts
	updateJourneyUI,
	updateJourneyRoomTiming,
```

    and Old:

```ts
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
```

    New: `const clock = new THREE.Clock();`

- **M3** delete from `const studentHelp = document.getElementById('studentHelp');` through the `};` that closes `document.getElementById('backBtn').onclick = () => {` (keep `document.getElementById('linacHeadClose').onclick = closeLinacHeadLab;` after it).
- **M4** Old (starts at the line 1a keeps):

```ts
document.getElementById('eqClose').onclick = closeEquipmentPanel;
document.getElementById('clinicalFocusDetails').onclick = () =>
	CLINICAL_FOCUS.primary && showEquipmentPanel(CLINICAL_FOCUS.primary);
document.getElementById('kioskClose').onclick = closeKioskDialog;
document.getElementById('kioskTreatment').onclick = () => startJourneyFromKiosk('treatment');
document.getElementById('kioskNewPatient').onclick = () => startJourneyFromKiosk('newpatient');
document.getElementById('kioskExplore').onclick = () => {
	closeKioskDialog();
	setMode('walk');
};
document.getElementById('kioskDialog').addEventListener('click', (e) => {
	if ((e.target as HTMLElement).id === 'kioskDialog') closeKioskDialog();
});
document
	.querySelectorAll<HTMLElement>('#journeyModes button')
	.forEach((b) => (b.onclick = () => setJourneyKind(b.dataset.journey)));
document.getElementById('journeyStart').onclick = startTreatmentJourney;
document.getElementById('journeyNext').onclick = advanceTreatmentJourney;
document.getElementById('journeyReset').onclick = () => resetTreatmentJourney(false);

bindPanelToggle('roomRail', 'roomRailToggle', '▸', '◂');
bindPanelToggle('infoPanel', 'infoPanelToggle', '◂', '▸');

labelRenderer.domElement.addEventListener('click', () => {
```

    New:

```ts
document.getElementById('eqClose').onclick = closeEquipmentPanel;
document.getElementById('kioskClose').onclick = closeKioskDialog;
document.getElementById('kioskDialog').addEventListener('click', (e) => {
	if ((e.target as HTMLElement).id === 'kioskDialog') closeKioskDialog();
});

labelRenderer.domElement.addEventListener('click', () => {
```

- **M5** Old: the `canvas.addEventListener('click', (e) => {` handler (from that line through its `});`, with the overview raycast to `beginTravel(r)`). New:

```ts
// a click locks the pointer for walking; the overview is only the title menu's backdrop now, so a
// click there no longer starts guided travel to the room under it
canvas.addEventListener("click", () => {
  if (S.mode === "walk") requestWalkPointerLock();
});
```

- **M6** Old:

```ts
installNpcCheckHook(ROOM_CAST, stepSimulation, HANDOFFS);
renderRoomList();
updateFacilityInfo();
journeyActors();
```

    New:

```ts
installNpcCheckHook(ROOM_CAST, stepSimulation, HANDOFFS);
journeyActors();
```

(`setJourneyKind` stays imported: the boot calls `setJourneyKind('treatment', true)`. `roomFloors` stays exported: rooms.ts fills it.)

- [ ] **1d.5: `walk.ts`.**
  - **W1** Old:

```ts
   task 9, both imported back here. `toast`/`disableRoomInspection`/`enableRoomInspection`/
   `updateFacilityInfo`/`renderRoomList`/`updateRoomUI` are owned by ./interact.js (task 8's
   companion module) and imported back here. */
```

    New:

```ts
   task 9, both imported back here. `toast`/`disableRoomInspection`/`enableRoomInspection` are
   owned by ./interact.js (task 8's companion module) and imported back here. */
```

- **W2** Old: `import { ROOMS, corridorAnchor, doorLabel } from './rooms';` New: `import { ROOMS, corridorAnchor } from './rooms';`
- **W3** Old:

```ts
import {
  toast,
  disableRoomInspection,
  enableRoomInspection,
  updateFacilityInfo,
  renderRoomList,
  updateRoomUI,
} from "./interact";
```

    New: `import { toast, disableRoomInspection, enableRoomInspection } from './interact';`

- **W4** Old:

```ts
if (fromOverview) {
  S.mode = "guided";
  document
    .querySelectorAll<HTMLElement>("#modeSeg button")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === "guided"));
  document.getElementById("walkHint").classList.remove("show");
  document.getElementById("overviewNote").style.display = "none";
  orbit.enabled = false;
  ceilings.forEach((c) => (c.visible = true));
} else setMode("guided", false);
document.getElementById("roomLookHint").classList.remove("show");
orbit.enabled = false;
```

    New:

```ts
if (fromOverview) {
  S.mode = "guided";
  orbit.enabled = false;
  ceilings.forEach((c) => (c.visible = true));
} else setMode("guided", false);
orbit.enabled = false;
```

- **W5** Old:

```ts
	else beginRoutePhase(performance.now());
	document.getElementById('travelName').textContent = `Route to ${room.name}`;
	document.getElementById('travelPct').textContent = '0%';
	document.getElementById('travelFill').style.width = '0%';
	document.getElementById('travelHUD').classList.add('show');
	orbit.enabled = false;
```

    New:

```ts
	else beginRoutePhase(performance.now());
	orbit.enabled = false;
```

- **W6** Old:

```ts
S.travel = null;
document.getElementById("travelHUD").classList.remove("show");
enableGuidedConversationComposition(arrived);
player.pos.copy(camera.position);
// walk mode keeps its own eye height, never the guided camera's
player.pos.y = PLAYER_EYE_Y;
updateRoomUI(arrived);
renderRoomList();
(document.getElementById("backBtn") as HTMLButtonElement).disabled =
  !S.history.length;
document.getElementById("locText").textContent =
  `Current location: ${arrived.name} · initial view frames the staff interaction`;
if (arrived.id === "lobby" && JOURNEY.introPending)
  setTimeout(showJourneyCheckinIntro, 350);
```

    New:

```ts
S.travel = null;
enableGuidedConversationComposition(arrived);
player.pos.copy(camera.position);
// walk mode keeps its own eye height, never the guided camera's
player.pos.y = PLAYER_EYE_Y;
if (arrived.id === "lobby" && JOURNEY.introPending)
  setTimeout(showJourneyCheckinIntro, 350);
```

- **W7** in `updateTravel` delete these lines (they wrote the removed `#travelHUD`):
  - after `			wait = (d?.openSeconds || 2) * 1000 + 500;`: the three lines `document.getElementById('travelName').textContent = \`Opening ${doorLabel(d?.type)}…\`;`, `…'travelPct'… = '5%';`, `…'travelFill'… = '5%';`
  - before `		if (t >= 1) {` in the route phase: the three `travelName`/`travelPct`/`travelFill` lines (`Traveling through the center · ${r.name}`)
  - after `		camera.lookAt(doorCenter(r, 1.55));`: `		const q = Math.min(1, elapsed / wait);` and the three `travelName`/`travelPct`/`travelFill` lines (`Opening ${doorLabel(d?.type)} · ${r.name}`)
  - before `		if (t >= 1) finishTravel();`: the three `travelName`/`travelPct`/`travelFill` lines (`Entering ${r.name}`)
- **W8** Old:

```ts
export function setMode(m, announce = true) {
	S.mode = m;
	document
		.querySelectorAll<HTMLElement>('#modeSeg button')
		.forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
	document.getElementById('walkHint').classList.toggle('show', m === 'walk');
	document.getElementById('overviewNote').style.display = m === 'overview' ? 'block' : 'none';
	ceilings.forEach((c) => (c.visible = m !== 'overview'));
	if (m === 'overview') {
		document.getElementById('roomLookHint').classList.remove('show');
		if (document.pointerLockElement) document.exitPointerLock();
```

    New:

```ts
export function setMode(m, announce = true) {
	S.mode = m;
	ceilings.forEach((c) => (c.visible = m !== 'overview'));
	if (m === 'overview') {
		if (document.pointerLockElement) document.exitPointerLock();
```

    Old:

```ts
		S.activeRoom = null;
		showCtQaDock(false);
		document.getElementById('locText').textContent = 'Overview of the full facility.';
		updateFacilityInfo();
		renderRoomList();
	} else if (m === 'walk') {
		document.getElementById('roomLookHint').classList.remove('show');
		orbit.enabled = false;
```

    New:

```ts
		S.activeRoom = null;
		showCtQaDock(false);
	} else if (m === 'walk') {
		orbit.enabled = false;
```

    Old:

```ts
			aimPlayerAt(new THREE.Vector3(1.2, 2.0, 10.5));
			document.getElementById('locText').textContent =
				'Outside the main entrance · walk in through the doors';
		}
```

    New:

```ts
			aimPlayerAt(new THREE.Vector3(1.2, 2.0, 10.5));
		}
```

- [ ] **1d.6: `interact.ts`.**
  - **I1** Old:

```ts
   (`enable/disableRoomInspection`, `roomInspectPose`), and room info/list UI
   (`updateRoomUI`/`renderRoomList`/`updateFacilityInfo`/`bindPanelToggle`/
   `bindProcedureRoomButtons`/`bindRoomEquipmentButtons`/`roomEquipmentMarkup`). Verbatim
```

    New: `   (`enable/disableRoomInspection`, `roomInspectPose`). Verbatim`

- **I2** Old:

```ts
   `applyWalkConversationComposition` to ./journey.js and `PROC_STATE`/`PROC_SITES`/
   `showCtQaDock`/`syncCtQaProgress` to ./sdk-bridge.js, both imported back here).
   `setDoorTarget`/`doorCenter`/`doorNormal`/`beginTravel`/`nearestDoor`/`setMode` are owned by
```

    New:

```ts
   `applyWalkConversationComposition` to ./journey.js and `PROC_STATE`/`PROC_SITES` to
   ./sdk-bridge.js, both imported back here).
   `setDoorTarget`/`doorCenter`/`doorNormal`/`nearestDoor` are owned by
```

    (The next line, `   ./walk.js (task 8's companion module) and imported back here. */`, is unchanged.)

- **I3** delete `import { ROOMS } from './rooms';`; in the `./equipment` import delete `	EQUIPMENT_BY_ROOM,`.
- **I4** Old:

```ts
import {
  setDoorTarget,
  doorCenter,
  doorNormal,
  beginTravel,
  nearestDoor,
  setMode,
} from "./walk";
import {
  roomById,
  player,
  doors,
  ROOM_GUIDES,
  HANDOFFS,
  REACH_Y,
} from "./main";
import {
  PROC_STATE,
  PROC_SITES,
  showCtQaDock,
  syncCtQaProgress,
} from "./sdk-bridge";
```

    New:

```ts
import { setDoorTarget, doorCenter, doorNormal, nearestDoor } from "./walk";
import { player, doors, HANDOFFS, REACH_Y } from "./main";
import { PROC_STATE, PROC_SITES } from "./sdk-bridge";
```

- **I5** delete `function roomEquipmentMarkup(roomId) {` through the closing `}` of `function bindRoomEquipmentButtons() {` (keep `export function openKioskDialog() {`).
- **I6** Old:

```ts
	orbit.update();
	document.getElementById('roomLookHint').classList.add('show');
}

export function disableRoomInspection() {
	document.getElementById('roomLookHint').classList.remove('show');
	if (S.mode !== 'overview') orbit.enabled = false;
}
```

    New:

```ts
	orbit.update();
}

export function disableRoomInspection() {
	if (S.mode !== 'overview') orbit.enabled = false;
}
```

- **I7** delete from `export function renderRoomList() {` through the closing `}` of `export function updateFacilityInfo() {` and the blank line after it (keep `const PROC_CHOICES = [`).
- **I8** delete `function procedureRoomMarkup(roomId) {` through the closing `}` of `function bindProcedureRoomButtons(roomId) {` (keep `function procMarkDone(id, done = true) {`).
- **I9** delete from `export function updateRoomUI(r) {` through its closing `}` and the blank line after it (keep `export function resetStaffDialogue(key) {`).
- **I10** staff handoffs no longer fly the camera. Old:

```ts
setTimeout(() => {
  closeStaffDialogue(false);
  startActorHandoff(key, h);
  if (h.follow && h.target) {
    setTimeout(() => {
      if (!S.travel) beginTravel(roomById(h.target));
    }, 450);
  }
}, 1150);
```

    New:

```ts
setTimeout(() => {
  closeStaffDialogue(false);
  // the staff member walks to the target room; the camera stays with the player
  startActorHandoff(key, h);
}, 1150);
```

- **I11** delete the blank line and `export function bindPanelToggle(panelId, buttonId, collapsedLabel, expandedLabel) {` through the end of the file.

- [ ] **1d.7: `journey.ts`.**
  - **J1** Old: `   `showDayTransition`/`startJourneyFromKiosk`, and the conversation-camera composition helpers` New: `   `showDayTransition`, and the conversation-camera composition helpers`
  - **J2** Old: `   `startJourneyFromKiosk`/`clearJourneyCameraFollow`gained`export` here — main.js's` New: `   `clearJourneyCameraFollow`gained`export` here — main.js's`
  - **J3** Old: `import { toast, closeKioskDialog, roomInspectPose, updateRoomUI, renderRoomList } from './interact';` New: `import { toast, roomInspectPose } from './interact';`
  - **J4** Old: `import { focusCtPatientFromControl } from './sdk-bridge';` New: `import { focusCtPatientFromControl, showCtQaDock } from './sdk-bridge';`
  - **J5** Old:

```ts
	if (document.pointerLockElement) document.exitPointerLock();
	orbit.enabled = false;
	document.getElementById('roomLookHint').classList.remove('show');
}
export function updateJourneyCameraFollow() {
```

    New:

```ts
	if (document.pointerLockElement) document.exitPointerLock();
	orbit.enabled = false;
}
export function updateJourneyCameraFollow() {
```

- **J6** Old:

```ts
		JOURNEY.cameraRoomId = here.id;
		S.activeRoom = here;
		updateRoomUI(here);
		renderRoomList();
		document.getElementById('locText').textContent =
			`Following ${currentJourneyMeta().patient} · ${here.name}`;
	}
```

    New:

```ts
		JOURNEY.cameraRoomId = here.id;
		S.activeRoom = here;
	}
```

- **J7** Old:

```ts
	S.activeRoom = r;
	updateRoomUI(r);
	renderRoomList();
}
export function resetTreatmentJourney(silent = false) {
```

    New:

```ts
	S.activeRoom = r;
}
export function resetTreatmentJourney(silent = false) {
```

- **J8** delete `export function startJourneyFromKiosk(kind) {` through its closing `}` (5 lines inside; keep `export function walkCompositionReady(r) {`).
- **J9** Old:

```ts
/* `aim` false (the player walking in on their own) updates the room panel but leaves the view where
   the player is looking: turning it for them mid-walk reads as a jolt. */
```

    New:

```ts
/* `aim` false (the player walking in on their own) sets the active room but leaves the view where
   the player is looking: turning it for them mid-walk reads as a jolt. */
```

    and Old:

```ts
	S.activeRoom = r;
	updateRoomUI(r);
	renderRoomList();
	if (aim) aimPlayerAt(f.target);
	S.walkCompositionRoomId = r.id;
	document.getElementById('locText').textContent = aim
		? `Current location: ${r.name} · conversation view`
		: `Current location: ${r.name}`;
}
```

    New:

```ts
	S.activeRoom = r;
	// the CT QA menu belongs to the CT room (it opens with E at the scanner): another room closes it
	if (r.id !== 'ctsim') showCtQaDock(false);
	if (aim) aimPlayerAt(f.target);
	S.walkCompositionRoomId = r.id;
}
```

- **J10** Old:

```ts
	orbit.enabled = true;
	orbit.update();
	document.getElementById('roomLookHint').classList.add('show');
}
export function beginEntryPhase(now) {
```

    New:

```ts
	orbit.enabled = true;
	orbit.update();
}
export function beginEntryPhase(now) {
```

- [ ] **1d.8: `sdk-bridge.ts`.**
  - **S1** delete `import { beginTravel } from './walk';`
  - **S2** Old:

```ts
	procSetTab,
	updateRoomUI,
	renderRoomList
} from './interact';
```

    New:

```ts
	procSetTab
} from './interact';
```

- **S3** Old:

```ts
	S.activeRoom = roomById('ctcontrol');
	updateRoomUI(S.activeRoom);
	renderRoomList();
	document.getElementById('locText').textContent =
		'CT Control · observing Mia through the simulation-room window';
}
```

    New:

```ts
	S.activeRoom = roomById('ctcontrol');
}
```

- **S4** Old:

```ts
	const inCt = S.activeRoom?.id === 'ctsim';
	el.classList.toggle('show', !!show && inCt);
}
```

    New:

```ts
	const inCt = S.activeRoom?.id === 'ctsim';
	el.classList.toggle('show', !!show && inCt);
}
/** E on the CT scanner's "CT QA menu" (props.ts ctScanner): the dock opens, with the pointer free. */
export function openCtQaMenu() {
	S.activeRoom = roomById('ctsim'); // the dock and its QA run belong to the CT room
	if (document.pointerLockElement) document.exitPointerLock();
	showCtQaDock(true);
	syncCtQaProgress();
}
```

- **S5** delete:

```ts
document.getElementById("ctQaGoRoom")?.addEventListener("click", () => {
  if (S.activeRoom?.id !== "ctsim" && !S.travel) beginTravel(roomById("ctsim"));
  else showCtQaDock(true);
});
```

- [ ] **1d.9: `props.ts`.**
  - **P1** Old: `import { registerInteractable, openKioskDialog } from './interact';` New:

```ts
import { registerInteractable, openKioskDialog } from "./interact";
import { openCtQaMenu } from "./sdk-bridge";
```

- **P2** Old:

```ts
	CT_COUCH.baseX = table.position.x;
	add(g, box(2.1, 0.78, 0.65, MAT.metal, room.x - 5.0, 0.5, room.z + 1.5));
}
```

    New:

```ts
	CT_COUCH.baseX = table.position.x;
	add(g, box(2.1, 0.78, 0.65, MAT.metal, room.x - 5.0, 0.5, room.z + 1.5));
	// E at the gantry's door-facing side opens the CT QA menu (sdk-bridge.ts openCtQaMenu); the 'CT
	// Simulator Gantry' equipment anchor sits at the ring's centre, 1.45 m further in
	const qaMenu = new THREE.Object3D();
	qaMenu.position.set(room.x, 1.3, room.z + 1.5 + 1.45);
	add(g, qaMenu);
	registerInteractable(
		qaMenu,
		'CT QA menu',
		'Run the CT morning start-up, laser QC, water phantom QC and the release or hold decision.',
		3.0,
		null,
		() => openCtQaMenu()
	);
}
```

- [ ] **1d.10: The visibility check** (`apps/web/scripts/sim-hub-visibility-check.mjs`, V1, the only change there). Old:

```js
// Leave overview (culling is bypassed there) and let the mode switch settle, then stop time.
await page.evaluate(() =>
  document.querySelector('#modeSeg button[data-mode="walk"]').click(),
);
```

New:

```js
// Leave the title menu's overview (culling is bypassed there) through Free Mode and let the mode
// switch settle, then stop time.
await page.evaluate(() => document.querySelector("#menuFree").click());
```

- [ ] **1d.11: Source check** (from `apps/web`):

```bash
grep -nE "getElementById\('(topbar|modeSeg|helpBtn|ambientBtn|roomRail|roomRailToggle|zoneChips|roomList|journeyBox|backBtn|locText|homeBtn|infoPanel|infoPanelToggle|infoK|infoTitle|infoSub|infoBody|travelHUD|travelName|travelPct|travelFill|walkHint|roomLookHint|overviewNote|studentHelp|studentHelpClose|clinicalFocusDetails|kioskTreatment|kioskNewPatient|kioskExplore|ctQaGoRoom|talkHere|travelHere|overviewHere|procedureRoomBtn)'\)|#(modeSeg|zoneChips) |data-eqid|updateRoomUI|renderRoomList|updateFacilityInfo|bindPanelToggle|startJourneyFromKiosk" arcade-src/sim-hub/src/*.ts
```

Expected: no output. (`toggleAmbience`'s `ambientBtn` at main.ts 473/619 and `studentHelp` at 764 are 1a's; in this worktree they still exist, so the grep shows `main.ts` lines for `ambientBtn` and `studentHelp` only: exactly three lines, all of them 1a's.)

- [ ] **1d.12: Checks.** Build; vitest (`8 passed`, `100 passed`); smoke; `pnpm check`; NPC check label `1d` (`NPC unchanged`); scene check label `1d` (`scene unchanged`). The visibility check is not run here (no `#menuFree` without 1a); the controller runs it after merging 1d (W3).
- [ ] **1d.13: No browser check in this worktree.** Its boot still runs 1a's line `document.getElementById('ambientBtn').onclick = toggleAmbience;` (1a deletes it), and with `#ambientBtn` gone a real browser throws there; the smoke test's stub DOM does not. The first real-browser boot of 1d is the visibility check after the 1d merge (W3), which exits 2 with the page errors if the boot throws; then 1f's pictures.
- [ ] **1d.14: Lint:**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-cleanup/apps/web
pnpm exec prettier --write \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/sim-hub/src/walk.ts \
	arcade-src/sim-hub/src/interact.ts \
	arcade-src/sim-hub/src/journey.ts \
	arcade-src/sim-hub/src/sdk-bridge.ts \
	arcade-src/sim-hub/src/props.ts \
	arcade-src/sim-hub/index.html \
	scripts/sim-hub-visibility-check.mjs
pnpm exec eslint \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/sim-hub/src/walk.ts \
	arcade-src/sim-hub/src/interact.ts \
	arcade-src/sim-hub/src/journey.ts \
	arcade-src/sim-hub/src/sdk-bridge.ts \
	arcade-src/sim-hub/src/props.ts \
	scripts/sim-hub-visibility-check.mjs
```

- [ ] **1d.15: Commit** (from `$WT/menu-cleanup`):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-cleanup
S=apps/web/arcade-src/sim-hub
git add $S/index.html $S/src/main.ts $S/src/walk.ts $S/src/interact.ts $S/src/journey.ts $S/src/sdk-bridge.ts $S/src/props.ts apps/web/scripts/sim-hub-visibility-check.mjs
git commit -m "feat(sim-hub): remove the old panels; CT QA menu on E at the scanner; no camera flights on handoffs

The top bar, directory, journey box, room panel, How to use dialog, travel and journey HUDs and the
old walk hint go, with the code that wrote to them. The CT QA dock opens with E at the CT scanner and
closes in other rooms; the kiosk keeps its welcome and Close. The visibility check enters through
Free Mode.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 1e: back to the door you left from (worktree `menu-return`, after the 1d merge)

**Files:**

- Create: `return-door.ts`, `return-door.spec.ts`
- Modify `interact.ts`: 1b's import lines; the room-app branch of `performInteraction`.
- Modify `main.ts`: 1a's import lines and boot lines.
- Modify `apps/web/arcade-src/linac-ct/src/main.ts`: after `import { S } from './state';`; the `#rtappsBackBtn` handler.

**Interfaces.** Consumes: `PREF`, `writePref`, `takePref`; `enterMode(m, { atDoor })` (1a's listener does the placing); `roomById`. Produces: `export function returnDoorOnBoot(isRoom: (id: string) => boolean): string | null`.

- [ ] **1e.1: Write the failing spec** `return-door.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { returnDoorOnBoot } from "./return-door";

const ROOM_IDS = new Set(["linaccontrol", "ctcontrol", "ctsim"]);
const isRoom = (id: string) => ROOM_IDS.has(id);
let session: Map<string, string>;
function installSession(store: unknown) {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: store,
    configurable: true,
    writable: true,
  });
}
beforeEach(() => {
  session = new Map();
  installSession({
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => void session.set(k, String(v)),
    removeItem: (k: string) => void session.delete(k),
  });
});
afterEach(() => {
  delete (globalThis as unknown as Record<string, unknown>).sessionStorage;
});

describe("returnDoorOnBoot", () => {
  it("starts outside the door the player left through, after Back to the Center", () => {
    session.set("simhub.returnDoor", '"ctsim"');
    session.set("simhub.returning", "true");
    expect(returnDoorOnBoot(isRoom)).toBe("ctsim");
  });

  it("takes both values, so the next load opens the title menu", () => {
    session.set("simhub.returnDoor", '"linaccontrol"');
    session.set("simhub.returning", "true");
    returnDoorOnBoot(isRoom);
    expect(session.size).toBe(0);
    expect(returnDoorOnBoot(isRoom)).toBe(null);
  });

  it("opens the title menu when the player came back another way, and drops the door", () => {
    session.set("simhub.returnDoor", '"ctcontrol"');
    expect(returnDoorOnBoot(isRoom)).toBe(null);
    expect(session.has("simhub.returnDoor")).toBe(false);
  });

  it("opens the title menu for Back to the Center with no door (the app was opened on its own)", () => {
    session.set("simhub.returning", "true");
    expect(returnDoorOnBoot(isRoom)).toBe(null);
  });

  it("ignores a door that is not a room", () => {
    session.set("simhub.returnDoor", '"roof"');
    session.set("simhub.returning", "true");
    expect(returnDoorOnBoot(isRoom)).toBe(null);
  });

  it("opens the title menu when sessionStorage throws", () => {
    const fail = () => {
      throw new Error("blocked");
    };
    installSession({ getItem: fail, setItem: fail, removeItem: fail });
    expect(returnDoorOnBoot(isRoom)).toBe(null);
  });
});
```

- [ ] **1e.2: Run (expected FAIL):** `return-door.spec.ts` fails to resolve `./return-door`; `Test Files  1 failed | 12 passed (13)`.
- [ ] **1e.3: Write `return-door.ts`:**

```ts
/* Back to the door you left from (sim-hub menu, task 1e). Leaving through a LINAC/CT room-app door,
   interact.ts performInteraction writes PREF.returnDoor (the room id, sessionStorage: the arcade
   pages share the app's origin and tab); the LINAC/CT app's Back to the Center button writes
   PREF.returning. On boot main.ts asks here where to start. Both values are taken (read and removed)
   every time, so only a real Back to the Center return skips the title menu and an old door is never
   reused. Free of scene and DOM imports so it is unit tested in Node (return-door.spec.ts). */
import { PREF, takePref } from "./prefs";

/** The room id to start Free Mode at, or null for the title menu; `isRoom` accepts a room with a door. */
export function returnDoorOnBoot(
  isRoom: (id: string) => boolean,
): string | null {
  const returning = takePref<unknown>(PREF.returning, false, "session"),
    door = takePref<unknown>(PREF.returnDoor, null, "session");
  return returning === true && typeof door === "string" && isRoom(door)
    ? door
    : null;
}
```

- [ ] **1e.4: Run (expected PASS):** `Test Files  13 passed (13)`, `Tests  148 passed (148)`.
- [ ] **1e.5: `interact.ts`.** Old: `import { isPaused } from './pause';` New:

```ts
import { isPaused } from "./pause";
import { PREF, writePref } from "./prefs";
```

Old:

```ts
if (S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) {
  // RTApps (plan 4c): these three doors leave the hub for the LINAC/CT room app.
  window.top.location.href = S.ROOM_APP_URL;
  return;
}
```

New:

```ts
if (S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) {
  // RTApps (plan 4c): these three doors leave the hub for the LINAC/CT room app. Its Back to the
  // Center button brings the player back outside this door (return-door.ts).
  writePref(PREF.returnDoor, room.id, "session");
  window.top.location.href = S.ROOM_APP_URL;
  return;
}
```

- [ ] **1e.6: `main.ts`.** Old: `import { enterMode } from './play-mode';` New:

```ts
import { enterMode } from "./play-mode";
import { returnDoorOnBoot } from "./return-door";
```

Old:

```ts
// the title menu (menu.ts) opens over the turning overview, in place of the old "How to use" dialog
installMenu();
enterMode("title");
```

New:

```ts
// the title menu (menu.ts) opens over the turning overview, in place of the old "How to use" dialog;
// back from the LINAC/CT app's Back to the Center, Free Mode starts outside the door the player left
// through instead (return-door.ts)
installMenu();
const backAtDoor = returnDoorOnBoot((id) => {
  const r = roomById(id);
  return !!r && !r.hub;
});
if (backAtDoor) enterMode("free", { atDoor: backAtDoor });
else enterMode("title");
```

(Without a click there is no user gesture, so the pointer lock request fails quietly; the player's first click on the view locks it, as on any walk.)

- [ ] **1e.7: LINAC/CT app** (`apps/web/arcade-src/linac-ct/src/main.ts`). Old: `import { S } from './state';` (line 3) New:

```ts
import { S } from "./state";
import { PREF, writePref } from "../../sim-hub/src/prefs";
```

Old:

```ts
document.getElementById("rtappsBackBtn")?.addEventListener("click", () => {
  if (S.HUB_URL) window.top.location.href = S.HUB_URL;
});
```

New:

```ts
document.getElementById("rtappsBackBtn")?.addEventListener("click", () => {
  if (!S.HUB_URL) return;
  // the hub then starts Free Mode outside the door the player left it through (sim-hub return-door.ts)
  writePref(PREF.returning, true, "session");
  window.top.location.href = S.HUB_URL;
});
```

- [ ] **1e.8: Checks.** Build (both apps); vitest (`13 passed`, `148 passed`); smoke (all three bundles); `pnpm check`; NPC check label `1e` (`NPC unchanged`).
- [ ] **1e.9: In the browser:** with `sessionStorage` `simhub.returnDoor` = `"ctsim"` and `simhub.returning` = `true`, loading the hub skips the title and stands outside the CT Simulator Room door, looking down the hallway, with the controls bar; reloading then shows the title menu. (1f's picture script checks the same.)
- [ ] **1e.10: Lint:**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-return/apps/web
pnpm exec prettier --write \
	arcade-src/sim-hub/src/return-door.ts \
	arcade-src/sim-hub/src/return-door.spec.ts \
	arcade-src/sim-hub/src/interact.ts \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/linac-ct/src/main.ts
pnpm exec eslint \
	arcade-src/sim-hub/src/return-door.ts \
	arcade-src/sim-hub/src/return-door.spec.ts \
	arcade-src/sim-hub/src/interact.ts \
	arcade-src/sim-hub/src/main.ts \
	arcade-src/linac-ct/src/main.ts
```

- [ ] **1e.11: Commit** (from `$WT/menu-return`):

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps-wt/menu-return
git add apps/web/arcade-src/sim-hub/src/return-door.ts apps/web/arcade-src/sim-hub/src/return-door.spec.ts apps/web/arcade-src/sim-hub/src/interact.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/arcade-src/linac-ct/src/main.ts
git commit -m "feat(sim-hub): back from the LINAC/CT app outside the door the player left through

The hub notes the room as it leaves through a room-app door; the app's Back to the Center button
notes the return; on boot the hub then starts Free Mode outside that door instead of the title menu.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 1f: tidy, e2e and the full verification (controller, `feat/sim-hub-menu`)

**Files:** Modify `interact.ts` (the two `./walk` imports), `index.html` (`#interactPrompt`), `apps/web/e2e/simulator.e2e.ts`.

- [ ] **1f.1: Merge the two `./walk` imports** (`interact.ts`). Delete `import { getColliders } from './walk';`, and Old: `import { setDoorTarget, doorCenter, doorNormal, nearestDoor } from './walk';` New: `import { setDoorTarget, doorCenter, doorNormal, nearestDoor, getColliders } from './walk';`
- [ ] **1f.2: Remove the old prompt** (`index.html`): delete `		<div id="interactPrompt"><b>E</b><span id="interactText">Interact</span></div>` and the three rules `			#interactPrompt {`, `			#interactPrompt.show {`, `			#interactPrompt b {` (from `			#interactPrompt {` through the closing `}` of `#interactPrompt b`, keeping the blank line and `/* Department-orientation conversation UI */` after it).
- [ ] **1f.3: The e2e test** (`apps/web/e2e/simulator.e2e.ts`). In the header comment, Old:

```ts
 * carries the plan 4c media cache header.
```

New:

```ts
 * carries the plan 4c media cache header; a fourth opens the hub as the seeded educator (the saved
 * session, no new login) and checks that it starts on the title menu and that Free Mode hides it and
 * shows the controls bar.
```

Old: `* Works with:`./helpers` (registerStudent, signIn); the pages under apps/web/src/routes` New: `* Works with:`./helpers` (registerStudent, signIn, educatorPage); the pages under apps/web/src/routes`. Old: `import { registerStudent, signIn } from './helpers';` New: `import { educatorPage, registerStudent, signIn } from './helpers';`. Append at the end of the file:

```ts
test("the hub starts on the title menu, and Free Mode hides it and shows the controls bar", async ({
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
  // menu.ts shows the menu once the module script has built the scene, at the very end of boot
  await expect(hub.locator("#titleMenu")).toBeVisible({ timeout: 60_000 });
  await expect(hub.locator("#menuTutorial")).toBeDisabled();
  await expect(hub.locator("#controlsBar")).toBeHidden();

  await hub.locator("#menuFree").click();
  await expect(hub.locator("#titleMenu")).toBeHidden();
  await expect(hub.locator("#controlsBar")).toBeVisible();
  await page.context().close();
});
```

- [ ] **1f.4: Run the e2e locally if the compose stack is up** (`curl -sf -o /dev/null http://localhost:8080/login && echo up`): from `apps/web`, `pnpm exec playwright test e2e/simulator.e2e.ts --project chromium -g "title menu"` (expected `1 passed`). If the stack is not up, CI's e2e job is the gate; do not start or reseed a stack for it.
- [ ] **1f.5: Full verification** (from `apps/web` of the main checkout, one heavy check at a time):

```bash
MENU=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/menu
pnpm build:arcade
pnpm exec vitest run --project server arcade-src/sim-hub/src     # 13 passed (13), 148 passed (148)
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
node scripts/sim-hub-scene-check.mjs > "$MENU/scene-final.log" 2>&1; echo "exit $?"; diff <(grep '^SCENE CHECK' "$MENU/scene-baseline.log") <(grep '^SCENE CHECK' "$MENU/scene-final.log") && echo "scene unchanged"
node scripts/sim-hub-npc-check.mjs > "$MENU/npc-final.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$MENU/npc-baseline.log") <(grep '^NPC CHECK' "$MENU/npc-final.log") && echo "NPC unchanged"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$MENU/vis-final.log" 2>&1; echo "exit $?"; tail -3 "$MENU/vis-final.log"
pnpm check
pnpm exec prettier --check .
pnpm exec eslint arcade-src/sim-hub/src/*.ts arcade-src/linac-ct/src/main.ts scripts/sim-hub-visibility-check.mjs e2e/simulator.e2e.ts
grep -nE "interactPrompt|interactText|getElementById\('(topbar|modeSeg|ambientBtn|helpBtn|roomRail|infoPanel|studentHelp|walkHint|locText|backBtn|homeBtn|travelHUD|roomLookHint|overviewNote|ctQaGoRoom|kioskTreatment|kioskNewPatient|kioskExplore)'\)" arcade-src/sim-hub/src/*.ts arcade-src/sim-hub/index.html
```

Expected: vitest as shown; one `SMOKE OK` per bundle; `exit 0` and `scene unchanged`; `exit 0` and `NPC unchanged`; `exit 0` with the baseline's summary; `pnpm check` exit 0; `All matched files use Prettier code style!`; eslint silent; the last grep prints nothing.

- [ ] **1f.6: The owner's pictures and the return check:** `MODE=after node "$MENU/pr1-shots.mjs" "$MENU/pr1-after"`. Expected: six `shot …` lines, `E prompt: Talk to Maya Brooks`, `back at the door: {"title":false,"controls":true,"left":[null,null]}`, exit 0. Look at every picture next to its `pr1-before` twin: the title menu; walking outside with the controls bar and no panels; the lobby card; the prompt beside Maya's head; the Paused settings; outside the CT Simulator Room door. If the prompt line names someone else, change `W_TO_MAYA_MS`/`A_TO_MAYA_MS` in the scratch script by up to 300 ms and retake.
- [ ] **1f.7: Commit:**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git add apps/web/arcade-src/sim-hub/src/interact.ts apps/web/arcade-src/sim-hub/index.html apps/web/e2e/simulator.e2e.ts
git commit -m "test(sim-hub): e2e for the title menu and Free Mode; drop the old interact prompt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **1f.8: Push and open the PR** (`git push -u origin feat/sim-hub-menu`, then `gh pr create --base main --title "sim-hub: title menu, free mode, room cards, E prompt and Esc settings" --body …`). The body lists the decisions above that the owner should see (1, 6, 7, 8), links the pictures (attach them from `$MENU/pr1-after` and `$MENU/pr1-before`), and ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. CI runs e2e once.

---

## Self-review

**Spec coverage (PR 1 and the return):**

- Title menu (side menu over the slowly turning overview, the gradient on the left 60%, eyebrow/title/subtitle, Free Mode, Tutorial "Coming soon", "Esc Settings", mouse or Up/Down/Enter, HUD tokens): 1a. In place of `#studentHelp`: 1a (boot) and 1d (markup).
- Free Mode: plaza start aimed at the doors (walk.ts `setMode('walk')` with `S.activeRoom` null), pointer lock from the click: 1a.
- Removed markup and CSS, every list item, plus `#walkHint`: 1d; `#interactPrompt`: 1f. Kept: `#watermark`, `#copyright`, `#toast`, staff dialog, equipment panel, LINAC head lab, procedure lab, CT QA dock: checked by 1d.3's count.
- Code writing to removed elements: removed or already null-safe, every lookup listed in 1d's table; `showCtQaDock`, `syncCtQaProgress`, `procRenderSite` kept; guided travel and overview kept.
- Crosshair as today; controls bar (text, bottom centre, shows on walking in either mode, fades 0.4 s after 1.0 s of moving, never returns): 1b.
- E prompt: candidates as today from REACH_Y, one at a time, line of sight against the walk colliders, anchors (person/object/door), projected every frame, fade from range + 3.0 over 0.5 m smoothed over 0.25 s, scale 0.6 → 1.0 from range + 2.5, E only within range, the three texts, E unchanged: 1b. `registerInteractable` `opts.enabled`: 1b.
- Room card: 0.3 s inside any room (lobby included, vaults from the maze), again only after a hallway, content (kicker, name, desc, zone, room type, what happens here, staff line), pauses (no movement, no simulation, no clock, still drawn) and frees the pointer, Continue/Enter resumes and re-locks, "Don't show this again" in `simhub.roomCards.hidden`, Room introductions off/on clears: 1c (rules) with 1a's checkbox.
- Settings: opens on lock loss in walk mode with nothing open and on Esc unlocked in walk mode or on the title; Esc closes an open dialog first; Paused and the mode name, Sound (ambience, intercom beeps and speech, off by default, `simhub.sound`), Room introductions, Help (controls panel and three lines), Resume, Main menu (asks inline in the tutorial; absent on the title); pauses: 1a.
- CT QA menu: not on entering CT Sim (1d removes `updateRoomUI`'s `showCtQaDock(r.id === 'ctsim')`), opens with E on the CT scanner and frees the pointer (1d), still opens the procedure lab and reports the verdict (unchanged code).
- Staff handoffs with `follow`: the actor walks, no camera flight (1d I10). Kiosk: welcome and Close, no journey buttons (1d D12, decision 7).
- Pause: main loop skips `stepSimulation` (so `updateWalk`), keeps rendering; the NPC check calls `stepSimulation` directly: Step 0.
- Verification: vitest for every pure module (pause, prefs with throwing and unreachable storage, play-mode, dialogs, menu-rules, prompt-math with the spec's six distances and wall vs doorway, room-enter, roomcard-rules with first entry, ticked, off and back on, return-door); e2e title menu + Free Mode + controls bar (1f); NPC, scene, visibility (through Free Mode), smoke, `pnpm check`, prettier (1f); before/after pictures (Step 0 and 1f).
- Back to the door: hub writes `simhub.returnDoor` before a room-app door, the LINAC/CT Back to the Center writes `simhub.returning`, boot starts Free Mode at `doorPoint(room)` facing the hallway, otherwise the title: 1e (decision 13).

**Placeholder scan:** no TBD or "similar to"; every new file has its full code; every edit of a shared file quotes its old text, except whole-block deletions, which name their first and last lines and what follows. The picture script's walk times are computed from the plaza pose; 1f.6 says what to change if the prompt names someone else.

**Type and name consistency:** `PauseReason`, `PREF`, `readPref`/`writePref`/`takePref`, `PlayMode`/`EnterOptions`/`enterMode`/`onPlayModeChange`/`getPlayMode`, `registerDialog`/`openDialogName`/`closeOpenDialog` match the brief everywhere. Dialog names used: `procedureLab`, `linacHeadLab`, `equipment`, `staff`, `kiosk`, `ctQaDock` (Step 0), `settings` (1a), `roomCard` (1c). DOM ids shared across tasks: `#menuFree`, `#menuTutorial`, `#titleMenu` (1a; used by the visibility check, the e2e, the picture script), `#setRoomCards` (1a markup, 1c wiring), `#controlsBar` (1b; e2e), `#roomPopup`/`#rcContinue` (1c; picture script), `#ePromptTitle` (1b; picture script), `#settingsMenu` (1a; picture script). `promptVisual(dist, range)`, `segmentBlocked(ax, az, bx, bz, walls, endClearance?)`, `WallRect` (= `getColliders()` entries), `onRoomEnter(cb)`, `shouldShowRoomCard(roomId, { enabled, hidden })`, `setTutorialAvailable(on)`, `showControlsBar()` as in the brief. Test counts: Step 0 23 (8 files, 100), 1a 13, 1b 15, 1c 14, 1e 6; merged 13 files, 148 tests.
