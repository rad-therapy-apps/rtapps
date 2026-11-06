# sim-hub scenery round 3, Part 1 (building-wide and outside) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The building-wide and outside fixes from the owner's 2026-11-06 list:
- door status lights on the wall beside each door sign;
- closed doors that span jamb to jamb, and baseboards that stop at doorways;
- desk monitors with a dark back;
- header names that fit their sign;
- hallway light strips that cast no shadow;
- a straight technical hallway north end;
- a solid LINAC junction with its sign and the right arrows;
- lobby blades that point the way you walk;
- the kiosk at the entrance;
- walk mode starting outside at NPC eye height;
- a sliding glass entrance;
- the light pole and plants clear of the monument sign;
- a parked ambulance;
- vehicles at real size with round wheels.

**Architecture:** Geometry changes go in the builders: `rooms.ts`, `props.ts`, `equipment.ts` and `helpers.ts`.
- The player's eye and reach constants go in `main.ts`, used by `walk.ts`, `interact.ts` and `journey.ts`.
- The entrance sensor goes in `npc-behavior.ts`, next to `collectBlockers`.
- `apps/web/scripts/sim-hub-scene-check.mjs` gets a `PLACEMENTS` entry for every moved item. Each task starts by adding these entries and watching them fail (RED).
- The NPC check a–m stays green. Only check f's ambulance-crew part goes, with the crew.
- The visibility check's walk poses move to the new eye height.

**Tech Stack:** three.js 0.160.0 (pinned), TypeScript, Vite (`pnpm build:arcade`), Node dev scripts, vitest.

**Spec:** `docs/specs/2026-11-06-sim-hub-scenery-round3-design.md`, Part 1 (P1-1 to P1-14), Global constraints and Verification. It is the single source of requirements.
- Decisions: `.superpowers/sdd/scenery3-decisions.md`.
- Code-level detail: `.superpowers/sdd/scenery3-inv-{A,B,C,D}.md`.
- Line numbers below were checked against `6a2bc32`, whose sources match the spec's base `d70ee12`. A task's line numbers are as at the start of that task. The quoted text is the anchor.
- `≈` marks a line that an earlier task in this plan shifts. Find it by the quoted text.

## Global Constraints

### From the spec (verbatim)

- **NPC check** (`node scripts/sim-hub-npc-check.mjs`): checks a–m stay green.
  - The floors and thresholds never change: REST_FLOOR 40, HANDOFF_ROUTES 21, TOGETHER_ROUTES 15, JOURNEY_ROUTES treatment 11 / newpatient 27, LEG_R 0.15, and every distance in the header.
  - Only two check edits are allowed:
    - **check f:** its ambulance-crew part goes with the removed crew (P1-13);
    - **check j:** stays unchanged, with the same four stand-up flows and the same box test. Check l covers the new education stand-ups frame by frame.
  - If a move breaks a check, fix the NPC data (arrival spots, `ROOM_GRAPHS` nodes, finals, offsets). Never loosen the check.
- **Scene check** (`node scripts/sim-hub-scene-check.mjs`): exits 0. Every moved item has a new or updated `PLACEMENTS` entry; each section lists them.
- **Visibility check** (`node scripts/sim-hub-visibility-check.mjs`): 0 failures.
- **`pnpm test` and `pnpm check`** pass. three.js stays 0.160.0. No new dependencies. Run `pnpm build:arcade` before the browser checks.
- **Conventions, as in the 2026-10-31 spec:**
  - room walls are 0.16 thick (vault 0.58), with inner faces 0.08 inside the room lines;
  - room height is 3.75 (vault 5.7, lobby 4.15);
  - **flush:** the object's back is 0 to 0.06 m off the wall's inner face, not past it (`FLUSH_GAP` 0.06);
  - boards sit 0.1 off the wall, workflow boards 0.05;
  - a desk monitor's screen bottom is at the desk top 0.88 + 0.28 = 1.16;
  - room contents stay inside the room box, inset 0.05, so `visibility.ts` culls them with the room; anything outside a room goes in `scene`, not the room group;
  - seat tops do not change: chair 0.54, couch 0.59, bench 0.6, task chair 0.65.
- **Baseboard edge:** room baseboards run 0.065..0.135 m inside the wall line, at y 0.03..0.21.
  - A few moved items stand with their back on the baseboard's face, exactly 0.06 m off the wall.
  - Because 0.06 is the flush limit, those items are pinned with `within` (centre ±0.01), not `flush`. Each section says which.
- **Shots:**
  - New shots go in `scripts/sim-hub-shots.mjs` under the names given per item, `ceilings: true` unless it is a plan view.
  - Add them first and shoot "before" on the committed d70ee12 bundle (`arcade/sim-hub`). Then rebuild and shoot "after" with the same poses: `node scripts/sim-hub-shots.mjs <outDir>`.
  - The poses below reuse the investigators' poses, so their scratch before-shots match.

### Repo and process rules

- **Branch:** `fix/sim-hub-scenery-r3-building`.
  - Commit at the end of each task, adding only the files that task names.
  - Never `git add` anything under `.superpowers/` or `e2e/.auth/`. Never force-push.
  - Do not touch `apps/web/src`.
- **Scratch:** files go only under `/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/`.
  - Never delete a file you did not create. No glob deletes.
  - Never open `.env*` files.
  - If a permission is denied, stop and report.
- **Lint:** do not run the package-wide `pnpm lint`. Run `pnpm exec prettier --write <files> && pnpm exec eslint <files>`, from `apps/web`, on the files the task touched.
- **Code style:**
  - Match the surrounding code: tabs and single quotes.
  - Update every comment that names an old position or a removed thing.
  - Remove whatever your change leaves unused, and nothing else.
- **Commands,** all from `apps/web` (`/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web`):
  - **build:** `pnpm build:arcade`. Rebuild after every source change. The checks read the built bundle in `arcade/sim-hub`, which is gitignored.
  - **scene check:** `node scripts/sim-hub-scene-check.mjs`. Add `--only placements` for the RED step.
  - **NPC check:** `node scripts/sim-hub-npc-check.mjs`.
  - **visibility check:** `ANGLE=metal node scripts/sim-hub-visibility-check.mjs`. Use Metal: the machine is loaded, and SwiftShader page loads time out.
  - **shots:**
    - The repo tool `node scripts/sim-hub-shots.mjs <outDir> [shot]` uses SwiftShader and may time out under load.
    - Use the GPU helper instead: `node $SHOTS <outDir> - <shots.json>`, where `-` means every shot in the file.
    - If a page load times out, retry once. If it times out again, stop and report.
  - **sim-hub specs:** `pnpm exec vitest run --project server arcade-src/sim-hub/src`.
- **Local `pnpm test`:**
  - The browser-project specs under `apps/web/src` time out when the machine is loaded. Part 1 does not touch `apps/web/src`, and CI is the gate for those specs.
  - The sim-hub's own vitest specs (`arcade-src/sim-hub/src/*.spec.ts`) must pass locally.
- **`pnpm check`** must exit 0.
- **Owner shots:**
  - Task 1 takes the before shots of every Part 1 item into `$P1/before`, on the pristine bundle.
  - Each task takes its own after shots into `$P1/after`.
  - The controller retakes all 29 at the end (Task 6).
- **Shell variables:** shell state does not persist between commands, so every command block sets the ones it uses:

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
```

- **A subset of the shots:** `$P1/shots-p1.json` holds all 29 Part 1 shots (Task 1). To take a few of them, filter the file by name, then run the helper on the subset:

```bash
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P1/shots-p1.json" "$P1/tN.json" name1 name2
node "$SHOTS" "$P1/after" - "$P1/tN.json"
```

- **The NPC check's expected summaries:** Task 1 saves the baseline summaries to `$P1/npc-baseline.log`:
  - a: 10 movers;
  - f: 30 moments;
  - g: 7 sitters;
  - j: 4 flows;
  - k: 114 at rest;
  - l: 21 + 15 + 38 = 74 routes;
  - m: 66 moments.

  Tasks 1–4 must reproduce every summary line exactly. Task 5 changes only f's line, to 14 moments.

## Plan-time findings for the controller

1. **The entrance trigger opens too late for the player (P1-11).** On the walk-in line x 2.0, the 3.0 m circle round (0, 10) begins at z 12.24, only 1.9 m before the glass (z ≈ 10.35 for the body's front).
   - Walking (3.35 m/s), the player reaches the glass 0.56 s after the trigger; sprinting (6.1 m/s), 0.31 s after.
   - With `openSeconds` 2.15, the east pane has then moved only about 0.45 m (p ≈ 0.17).
   - It clears the player's body (pane inner edge ≥ 2.32) only at progress ≈ 0.80, about 1.7 s after the trigger.
   - So the spec's by-hand check, "the panes open before the player reaches them", will fail.
   - **Resolved by the controller (2026-11-06):** the player's radius is 5.5 m (`ENTRANCE_PLAYER_R`) and `openSeconds` is 0.9. People keep the 3.0 m radius (`ENTRANCE_OPEN_R`). The panes are then clear in time walking (1.42 s, need 0.72) and sprinting (0.78 s). The spec's P1-11 is updated to match. The walk start (2.0, 20.4) is 10.6 m from (0, 10), so the panes start closed.
2. **The walk-in line runs into the kiosk (P1-9, P1-10).** The kiosk frame spans x 1.94..3.26 at z 5.97..6.53, so a player walking straight north on x 2.0 meets its west edge.
   - Furniture does not collide, so the player passes through it.
   - B meant this ("the walk line runs straight into it"), so it is not a defect. The spec's "east of the walk-in line" means the kiosk's centre.

## Files

| file (under `apps/web/`) | tasks | what changes |
|---|---|---|
| `arcade-src/sim-hub/src/equipment.ts` | 1, 3, 5 | status-light `placements` table; the junction sign; the ambulance cycle removed |
| `arcade-src/sim-hub/src/props.ts` | 1, 4, 5 | `monitor()` back shell; kiosk position; monument-sign plants; `vehicleObject` inner group and wheels |
| `arcade-src/sim-hub/src/helpers.ts` | 1, 3 | header-name fit rule; `makeDirectionalSign` back label |
| `arcade-src/sim-hub/src/rooms.ts` | 2, 3, 4, 5 | door leaves; baseboards; entrance panes and door entry; light-strip shadows; technical hallway north end and roof; junction block; walkway cart removed; light pole; `APRON_TOP` removed |
| `arcade-src/sim-hub/src/walk.ts` | 2, 4 | sliding-panel motion; the entrance skipped by the door loop; walk start; eye height; door reach |
| `arcade-src/sim-hub/src/npc-behavior.ts` | 2, 5 | `updateLobbyEntrance`; the ambulance parked; orphaned walk helpers removed |
| `arcade-src/sim-hub/src/main.ts` | 2, 3, 4, 5 | entrance call in the loop; lobby blades; `PLAYER_EYE_Y`/`REACH_Y` and the initial player; `updateAmbulance` removed |
| `arcade-src/sim-hub/src/interact.ts` | 4 | interaction reach from `REACH_Y` |
| `arcade-src/sim-hub/src/journey.ts` | 4 | the walk reposition at `PLAYER_EYE_Y` |
| `arcade-src/sim-hub/src/state.ts` | 5 | `AMB`/`ambUnload`/`ambLoad` removed |
| `scripts/sim-hub-scene-check.mjs` | 1–5 | `PLACEMENTS` |
| `scripts/sim-hub-shots.mjs` | 1 | the 24 new Part 1 shots |
| `scripts/sim-hub-visibility-check.mjs` | 4 | walk poses at 1.87; the outside-start poses |
| `scripts/sim-hub-npc-check.mjs` | 5 | check f's crew part removed |

## Task order and dependencies

- **Task 1** comes first. It builds the pristine bundle, takes every before shot, and writes `$P1/shots-p1.json`, which every later task uses.
- **Task 2** (doors, baseboards, the entrance glass) sets the `clinicalSlide` motion that the entrance reuses.
  - Task 4's walk-in path from the outside start goes through that entrance.
- **Task 3** (light strips, the technical hallway end, the LINAC junction, the lobby blades) is independent of Tasks 2 and 4.
  - The junction sign keeps today's back face: it passes no back label, so the `makeDirectionalSign` change in the same task does not affect it.
- **Task 4** (kiosk, pole and plants, walk start and eye height):
  - The eye height feeds the visibility check's walk poses, and its new outside-start poses, so the visibility check is run here.
  - The `outside-spawn` framing assumes the pole and plants have moved, which happens in the same task.
- **Task 5** (ambulance parked, vehicles scaled):
  - The parked footprint assumes scale 1.6, set in the same task.
  - Check f's crew part must go in the same task as the crew, or f fails with "crew never walked in 90 s".
  - Until Task 5, the ambulance still drives its old cycle through the sign, so Task 4's `outside-spawn` and `sign-front` after shots may show it.
- **Task 6** (controller) runs every check, retakes all 29 after shots, and finishes the branch.
- **`PLACEMENTS` count:**

  | after task | count |
  |---|---|
  | baseline | 109 |
  | 1 | 119 |
  | 2 | 132 |
  | 3 | 136 |
  | 4 | 142 |
  | 5 | 143 |

  The spec's Verification breakdown gives the same 143.
- **Each task appends its `PLACEMENTS` entries at the end of the array.** That is just above the `];` followed by `function setupError(msg) {`.
  - Add a comma after what was the last entry.
  - Prettier then formats the new entries.

---

### Task 1: Door status lights on the wall, desk-monitor back shells, header-name fit (P1-1, P1-3, P1-4); every Part 1 shot

**Files:**
- Modify: `apps/web/scripts/sim-hub-shots.mjs:103`. Append 24 shots after `overview-roofs`.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs:470-471`. Append 10 pins at the end of `PLACEMENTS`.
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts:1182-1196`, the status-light `placements` table in `buildPhase5Wayfinding`.
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts:522-530`, `monitor()`.
- Modify: `apps/web/arcade-src/sim-hub/src/helpers.ts:83-87`, `makeDoorHeaderTexture`.
- Scratch: `$P1/shots-p1.json`, `$P1/before/*.png`, `$P1/npc-baseline.log`, `$P1/t1.json`.

**Interfaces:**
- Produces:
  - `$P1/shots-p1.json`: the 29 Part 1 shots, an array of `{ name, eye, look, ceilings? }` or `{ name, subject, u, cam, lookY, ceilings? }`.
  - The 24 new entries in `SHOTS`.
  - `monitor(g, x, y, z, rot, w, h, stand)` adds, when `stand` is true, a `MAT.black` box of geometry `[w, h, 0.02]` 0.0375 m behind the screen. Later pins must not pick `[w, h, 0.02]`; none do today.
  - `$P1/npc-baseline.log`, the baseline NPC summaries that Tasks 2–5 diff against.

- [ ] **Step 1: Baseline on a clean, pristine build**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git status --short && git branch --show-current
```

Expected: no status output (the controller has committed this plan), and `fix/sim-hub-scenery-r3-building`.

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
mkdir -p "$P1/before" "$P1/after"
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
```

Expected:
- `SCENE CHECK signs PASS: …` (163 panels);
- `SCENE CHECK legs PASS: …` (20 chairs, 3 couches);
- `SCENE CHECK placements PASS: 109 placements, 0 problems`;
- `exit 0`.

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-npc-check.mjs > "$P1/npc-baseline.log" 2>&1; echo "exit $?"; grep '^NPC CHECK' "$P1/npc-baseline.log"
```

Expected: `exit 0` and 13 lines `NPC CHECK a PASS: …` to `NPC CHECK m PASS: …`. In particular:
- `a PASS: 0 wall-clipping samples across 10 movers`;
- `f PASS: … at 30 moments`;
- `k PASS: all 114 people at rest …`;
- `m PASS: over 66 moments …`.

- [ ] **Step 2: Write the Part 1 shot list and take every before shot**

Write `$P1/shots-p1.json`. It holds the 24 new shots and the five existing ones (`vault1-door-signs`, `hall-tech-north`, `walkway-junction`, `walkway-north`, `overview-roofs`), copied from `sim-hub-shots.mjs`:

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cat > "$P1/shots-p1.json" <<'JSON_EOF'
[
{ "name": "door-sign-consult-side", "eye": [-13.2, 2.4, -0.6], "look": [-17.2, 3.0, -2.6], "ceilings": true },
{ "name": "door-sign-ctcontrol", "eye": [31.5, 1.7, -0.3], "look": [31.5, 3.0, -3.9], "ceilings": true },
{ "name": "door-sign-ctsim", "eye": [44, 1.7, 0.6], "look": [44, 3.0, -2.9], "ceilings": true },
{ "name": "vault1-door-signs", "eye": [60.0, 1.7, -18.0], "look": [63.7, 4.1, -18.0] },
{ "name": "door-consult-hall", "eye": [-18, 1.5, 0.4], "look": [-18, 1.3, -3], "ceilings": true },
{ "name": "door-physics-hall", "eye": [-0.4, 1.5, -18], "look": [3, 1.3, -18], "ceilings": true },
{ "name": "door-ctcontrol-in", "eye": [31.5, 1.5, -7.6], "look": [31.5, 1.3, -4], "ceilings": true },
{ "name": "door-vault1-hall", "eye": [59.2, 1.8, -18], "look": [64, 1.6, -18], "ceilings": true },
{ "name": "door-hdr-hall", "eye": [62.5, 1.5, 24], "look": [58, 1.3, 24], "ceilings": true },
{ "name": "mgr-visitor", "eye": [20.6, 1.25, 10.4], "look": [20, 1.4, 7.4], "ceilings": true },
{ "name": "commons-sign", "eye": [1.6, 2.5, -60], "look": [-2, 3.05, -60], "ceilings": true },
{ "name": "hall-north-end", "eye": [0.5, 1.7, -56], "look": [0.5, 1.6, -66], "ceilings": true },
{ "name": "hall-north-near", "eye": [0, 1.7, -50], "look": [0, 1.6, -66], "ceilings": true },
{ "name": "hall-tech-north", "eye": [0, 1.7, -50], "look": [0, 2.2, -66], "ceilings": true },
{ "name": "walkway-junction", "eye": [48, 1.7, 0], "look": [62, 2.6, 0], "ceilings": true },
{ "name": "walkway-junction-near", "eye": [57.5, 1.7, 0], "look": [64, 2.6, 0], "ceilings": true },
{ "name": "walkway-north", "eye": [60.9, 1.7, -1], "look": [60.9, 2.4, -31], "ceilings": true },
{ "name": "blade-clinical", "eye": [5, 1.87, 0.5], "look": [11.25, 2.7, 0], "ceilings": true },
{ "name": "blade-patient", "eye": [-5, 1.87, 0.5], "look": [-11.25, 2.7, 0], "ceilings": true },
{ "name": "blade-clinical-back", "eye": [13.2, 1.87, 0.5], "look": [11.25, 2.8, 0], "ceilings": true },
{ "name": "lobby-kiosk", "eye": [0.6, 1.87, 11.0], "look": [2.6, 1.4, 6.25], "ceilings": true },
{ "name": "outside-spawn", "eye": [2.0, 1.87, 20.4], "look": [-1.0, 2.0, 10.5], "ceilings": true },
{ "name": "lobby-entrance", "eye": [1.2, 1.87, 11.2], "look": [1.6, 1.4, 3], "ceilings": true },
{ "name": "sign-front", "eye": [-1.8, 1.6, 18.5], "look": [-1.8, 1.0, 14.25], "ceilings": true },
{ "name": "sign-top", "eye": [-1.8, 6.5, 16.8], "look": [-1.8, 0, 14.25], "ceilings": true },
{ "name": "ambulance-parked", "eye": [24, 3.0, 17], "look": [31, 0.8, 23], "ceilings": true },
{ "name": "car-side", "subject": "mover:car", "u": 0.2, "cam": [4.5, 1.2, 0.5], "lookY": 0.45, "ceilings": true },
{ "name": "shuttle-side", "subject": "mover:shuttle", "u": 0.2, "cam": [5, 1.4, 0.5], "lookY": 0.5, "ceilings": true },
{ "name": "overview-roofs", "eye": [20, 120, -15.1], "look": [20, 0, -15], "ceilings": true }
]
JSON_EOF
node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length)' "$P1/shots-p1.json"
```

Expected: `29`.

Take the before shots on the pristine bundle that Step 1 built. No source has changed yet:

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node "$SHOTS" "$P1/before" - "$P1/shots-p1.json" && ls "$P1/before" | wc -l
```

Expected: one line per shot naming its PNG, no error, then `29`.

Read three of them to confirm the poses work:
- `door-sign-ctcontrol.png`: the box covers "CONTROL";
- `door-consult-hall.png`: the slot at the latch side;
- `sign-front.png`: the plants half out of the slab.

- [ ] **Step 3: Add the 24 shots to the repo's shot list**

In `apps/web/scripts/sim-hub-shots.mjs`, replace the last entry of `SHOTS` (line 103):

```js
	{ name: 'overview-roofs', eye: [20, 120, -15.1], look: [20, 0, -15], ceilings: true }
```

with:

```js
	{ name: 'overview-roofs', eye: [20, 120, -15.1], look: [20, 0, -15], ceilings: true },
	// the 2026-11-06 round 3, Part 1 (docs/specs/2026-11-06-sim-hub-scenery-round3-design.md): the status
	// lights beside the door signs, the doors closed jamb to jamb, a desk monitor's back, the commons sign,
	// the technical hallway's north end, the LINAC junction, the lobby blades, the kiosk, the walk start
	// outside, the entrance glass, the monument sign's pole and plants, the parked ambulance and the
	// vehicles at real size
	{ name: 'door-sign-consult-side', eye: [-13.2, 2.4, -0.6], look: [-17.2, 3.0, -2.6], ceilings: true },
	{ name: 'door-sign-ctcontrol', eye: [31.5, 1.7, -0.3], look: [31.5, 3.0, -3.9], ceilings: true },
	{ name: 'door-sign-ctsim', eye: [44, 1.7, 0.6], look: [44, 3.0, -2.9], ceilings: true },
	{ name: 'door-consult-hall', eye: [-18, 1.5, 0.4], look: [-18, 1.3, -3], ceilings: true },
	{ name: 'door-physics-hall', eye: [-0.4, 1.5, -18], look: [3, 1.3, -18], ceilings: true },
	{ name: 'door-ctcontrol-in', eye: [31.5, 1.5, -7.6], look: [31.5, 1.3, -4], ceilings: true },
	{ name: 'door-vault1-hall', eye: [59.2, 1.8, -18], look: [64, 1.6, -18], ceilings: true },
	{ name: 'door-hdr-hall', eye: [62.5, 1.5, 24], look: [58, 1.3, 24], ceilings: true },
	{ name: 'mgr-visitor', eye: [20.6, 1.25, 10.4], look: [20, 1.4, 7.4], ceilings: true },
	{ name: 'commons-sign', eye: [1.6, 2.5, -60], look: [-2, 3.05, -60], ceilings: true },
	{ name: 'hall-north-end', eye: [0.5, 1.7, -56], look: [0.5, 1.6, -66], ceilings: true },
	{ name: 'hall-north-near', eye: [0, 1.7, -50], look: [0, 1.6, -66], ceilings: true },
	{ name: 'walkway-junction-near', eye: [57.5, 1.7, 0], look: [64, 2.6, 0], ceilings: true },
	{ name: 'blade-clinical', eye: [5, 1.87, 0.5], look: [11.25, 2.7, 0], ceilings: true },
	{ name: 'blade-patient', eye: [-5, 1.87, 0.5], look: [-11.25, 2.7, 0], ceilings: true },
	{ name: 'blade-clinical-back', eye: [13.2, 1.87, 0.5], look: [11.25, 2.8, 0], ceilings: true },
	{ name: 'lobby-kiosk', eye: [0.6, 1.87, 11.0], look: [2.6, 1.4, 6.25], ceilings: true },
	{ name: 'outside-spawn', eye: [2.0, 1.87, 20.4], look: [-1.0, 2.0, 10.5], ceilings: true },
	{ name: 'lobby-entrance', eye: [1.2, 1.87, 11.2], look: [1.6, 1.4, 3], ceilings: true },
	{ name: 'sign-front', eye: [-1.8, 1.6, 18.5], look: [-1.8, 1.0, 14.25], ceilings: true },
	{ name: 'sign-top', eye: [-1.8, 6.5, 16.8], look: [-1.8, 0, 14.25], ceilings: true },
	{ name: 'ambulance-parked', eye: [24, 3.0, 17], look: [31, 0.8, 23], ceilings: true },
	{
		name: 'car-side',
		subject: 'mover:car',
		u: 0.2,
		cam: [4.5, 1.2, 0.5],
		lookY: 0.45,
		ceilings: true
	},
	{
		name: 'shuttle-side',
		subject: 'mover:shuttle',
		u: 0.2,
		cam: [5, 1.4, 0.5],
		lookY: 0.5,
		ceilings: true
	}
```

The `];` on the next line stays.

- [ ] **Step 4: Add the failing status-light placements (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, the last entry of `PLACEMENTS` is the kiosk pin (lines 467-470). Add a comma after its closing `}`, and append before `];`:

```js
	// P1-1 (2026-11-06): each room's status light hangs on the hallway face of its door wall, its back
	// 0.005 m off the face, right of the door sign; both vault lights are on the main-corridor side
	...[
		['consult', -15.65, -2.85, 'z', -2.92, 'min'],
		['education', -39.65, -2.85, 'z', -2.92, 'min'],
		['CT room', 46.35, -2.85, 'z', -2.92, 'min'],
		['CT control', 33.85, -3.85, 'z', -3.92, 'min'],
		['physics', 2.85, -15.65, 'x', 2.92, 'max'],
		['dosimetry', 1.85, -46.65, 'x', 1.92, 'max'],
		['LINAC control', 48.65, 3.85, 'z', 3.92, 'max'],
		['vault 1', 63.64, -15.2, 'x', 63.71, 'max'],
		['vault 2', 63.64, 15.2, 'x', 63.71, 'max'],
		['HDR', 58.15, 21.65, 'x', 58.08, 'min']
	].map(([room, x, z, axis, face, side]) => ({
		id: `status light beside the ${room} door sign`,
		pick: { size: [0.58, 0.24, 0.13], at: [x, z], r: 0.05 },
		flush: { axis, face, side }
	}))
```

Run it against the unchanged bundle:

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected:
- `SCENE CHECK placements FAIL: 119 placements, 10 problems`;
- ten lines `status light beside the … door sign: picked 0 meshes (expected 1)`;
- `exit 1`.

- [ ] **Step 5: Mount the status lights (P1-1)**

In `apps/web/arcade-src/sim-hub/src/equipment.ts`, `buildPhase5Wayfinding`, replace the `placements` table (lines 1185-1196):

```ts
	const placements: Record<string, [number, number, number, number]> = {
		consult: [-17.0, 3.12, -2.12, 0],
		education: [-41.0, 3.12, -2.12, 0],
		ctsim: [44.0, 3.2, -2.88, 0],
		ctcontrol: [31.5, 3.1, -3.88, 0],
		dosimetry: [15.72, 3.12, -49, -Math.PI / 2],
		physics: [11.72, 3.12, -18, -Math.PI / 2],
		linaccontrol: [51.0, 3.12, 4.12, 0],
		vault1: [66.72, 3.55, -18, -Math.PI / 2],
		vault2: [66.72, 3.55, 18, -Math.PI / 2],
		hdr: [57.6, 3.15, 23.1, 0]
	};
```

with:

```ts
	// Each status light hangs on the hallway face of its door wall, its back 0.005 m off the face, centred
	// on the door sign's mid-height (3.05; vaults 3.78) and 0.10 m clear of the sign's back plate, on the
	// right as you face the door. Both vault lights are on the main-corridor side (toward z 0), above the
	// red entrance marker, so vault 2's is left of its sign, mirroring vault 1's.
	const placements: Record<string, [number, number, number, number]> = {
		consult: [-15.65, 3.05, -2.85, 0],
		education: [-39.65, 3.05, -2.85, 0],
		ctsim: [46.35, 3.05, -2.85, 0],
		ctcontrol: [33.85, 3.05, -3.85, 0],
		dosimetry: [1.85, 3.05, -46.65, -Math.PI / 2],
		physics: [2.85, 3.05, -15.65, -Math.PI / 2],
		linaccontrol: [48.65, 3.05, 3.85, Math.PI],
		vault1: [63.64, 3.78, -15.2, -Math.PI / 2],
		vault2: [63.64, 3.78, 15.2, -Math.PI / 2],
		hdr: [58.15, 3.05, 21.65, Math.PI / 2]
	};
```

Keep the two `// RTApps (#77 phase 2 task 14)` comment lines above it, and the loop below it.

- [ ] **Step 6: Desk-monitor back shells (P1-3)**

In `apps/web/arcade-src/sim-hub/src/props.ts`, `monitor()` (lines 522-530), replace:

```ts
	// a wall-mounted screen has no desk stand under it
	if (!stand) return;
	const st = box(0.08, 0.28, 0.08, MAT.black, x, y - h / 2 - 0.14, z);
```

with:

```ts
	// a wall-mounted screen has no desk stand under it
	if (!stand) return;
	// a dark back shell 0.02 m deep just behind the screen (0.0275..0.0475 m behind its centre), so a desk
	// monitor shows which way it faces: the screen is one emissive box that looks the same from both sides
	const back = box(w, h, 0.02, MAT.black, x - Math.sin(rot) * 0.0375, y, z - Math.cos(rot) * 0.0375);
	back.rotation.y = rot;
	add(g, back);
	const st = box(0.08, 0.28, 0.08, MAT.black, x, y - h / 2 - 0.14, z);
```

- [ ] **Step 7: Header-name fit rule (P1-4)**

In `apps/web/arcade-src/sim-hub/src/helpers.ts`, `makeDoorHeaderTexture`, replace line 87:

```ts
	if (nm.length > 34) x.font = '800 48px Arial';
```

with:

```ts
	// the name fits 1040 px of the 1200 px canvas (80 px, about 0.25 m of sign, clear each side), at most
	// 58 px; `|| 1` keeps 58 px under the node canvas stub (scripts/lib/browser-stubs.mjs), which measures
	// every text 0 px wide
	const fit = Math.floor((58 * 1040) / (x.measureText(nm.toUpperCase()).width || 1));
	if (fit < 58) x.font = `800 ${fit}px Arial`;
```

The line before the rule, `x.font = '800 58px Arial';` (line 83), stays. `measureText` measures in that font.

- [ ] **Step 8: Build and run the checks**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P1/npc-t1.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P1/npc-baseline.log") <(grep '^NPC CHECK' "$P1/npc-t1.log")
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- the scene check: signs PASS (163), legs PASS, `SCENE CHECK placements PASS: 119 placements, 0 problems`, `exit 0`;
- the NPC check: `exit 0`, and no diff output;
- vitest: 4 test files passed;
- `check exit 0`.

If the NPC check fails, a desk monitor's shell is the only new mesh near a person. Report the failing line; do not change NPC data in this task.

- [ ] **Step 9: After shots**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P1/shots-p1.json" "$P1/t1.json" door-sign-consult-side door-sign-ctcontrol door-sign-ctsim vault1-door-signs mgr-visitor commons-sign
node "$SHOTS" "$P1/after" - "$P1/t1.json"
```

Expected: six lines naming the PNGs. Read each next to its `$P1/before` twin. Check:
- `door-sign-consult-side`: the light is on the wall right of the sign, with no air gap;
- `door-sign-ctcontrol` and `door-sign-ctsim`: "CONTROL" and "SIMULATOR" are readable, with the light to their right;
- `vault1-door-signs`: the light is above the red entrance marker, and nothing is floating in the maze;
- `mgr-visitor`: the manager's monitor shows a dark back. It faces away until R3-7 moves it.
- `commons-sign`: white space before the L and after the N.

- [ ] **Step 10: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/helpers.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-shots.mjs && pnpm exec eslint arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/helpers.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-shots.mjs
```

Expected: no eslint errors. If prettier changed a source file, rebuild and rerun the scene check (exit 0) before committing.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/props.ts apps/web/arcade-src/sim-hub/src/helpers.ts apps/web/scripts/sim-hub-scene-check.mjs apps/web/scripts/sim-hub-shots.mjs
git commit -m "fix(sim-hub): status lights on the wall beside each door sign, desk monitors get a dark back, header names fit their sign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Doors jamb to jamb, baseboards cut at doorways, the sliding glass entrance (P1-2, P1-11)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`:
  - `buildDoor` leaves, lines 529-531, 541-542, 552-553 and 559;
  - `addRoomBaseboards`, lines 669-679;
  - `buildLobbyEntrance` panes, lines 803-805.
- Modify: `apps/web/arcade-src/sim-hub/src/walk.ts`:
  - `updateDoors` clinical-slide motion, lines 463-465;
  - the walk door loop, lines 599-601.
- Modify: `apps/web/arcade-src/sim-hub/src/npc-behavior.ts`: a new `updateLobbyEntrance()` after `collectBlockers` (lines 267-277).
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts`:
  - the `./npc-behavior` import, lines 35-41;
  - `stepSimulation`, line 686.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs`: append 13 pins.
- Scratch: `$P1/entrance-probe.mjs`, `$P1/npc-t2.log`, `$P1/t2.json`.

**Interfaces:**
- Consumes: `$P1/shots-p1.json` and `$P1/npc-baseline.log` (Task 1).
- Produces:
  - `doors.get('lobby-entrance')`: `{ group, side: 'zmax', type: 'clinicalSlide', progress, target, openSeconds: 0.9, parts: [westPane, eastPane], gap: 5.2 }`.
  - `export function updateLobbyEntrance(): void` in `npc-behavior.ts`, called each frame in `main.ts stepSimulation` before `updateDoors(dt)`.
  - The clinical-slide motion: `parts[0].position.x = -(gap / 4 + gap * 0.5 * p)` and `parts[1].position.x = gap / 4 + gap * 0.5 * p`.
  - Task 4's walk-in path from the outside start goes through this entrance.

- [ ] **Step 1: Add the failing door, baseboard and pane placements (RED)**

The bundle is Task 1's final build. If unsure, run `pnpm build:arcade` first; the tree is clean at this point.

In `apps/web/scripts/sim-hub-scene-check.mjs`, add a comma after the last `PLACEMENTS` entry (Task 1's status-light `.map(...)`), and append before `];`:

```js
	// P1-2: every closed door leaf spans jamb to jamb (the swing leaf stops 6 mm short of the latch jamb,
	// so its corner clears it as it opens); the door wall's baseboard stops at the opening. The scene is
	// measured as the page builds it, with every door closed.
	{
		id: 'consult door leaf jamb to jamb',
		pick: { size: [2.594, 2.55, 0.08], at: [-18.003, -3], r: 0.02 }
	},
	{
		id: 'manager door leaf jamb to jamb',
		pick: { size: [2.594, 2.55, 0.08], at: [19.997, 3.5], r: 0.02 }
	},
	...[-17.35, -18.65].map((z) => ({
		id: `physics door leaves meet in the middle (leaf at z ${z})`,
		pick: { size: [1.3, 2.55, 0.08], at: [3, z], r: 0.02 }
	})),
	...[30.85, 32.15].map((x) => ({
		id: `CT control door panels meet in the middle (panel at x ${x})`,
		pick: { size: [1.3, 2.55, 0.07], at: [x, -4], r: 0.02 }
	})),
	{
		id: 'vault 1 door leaf jamb to jamb',
		pick: { size: [4.8, 3.15, 0.18], at: [64, -18], r: 0.02 }
	},
	{
		id: 'HDR door leaf jamb to jamb',
		pick: { size: [2.6, 2.55, 0.18], at: [58, 24], r: 0.02 }
	},
	{
		id: 'consult door-wall baseboard no longer runs across the door',
		pick: { size: [9.72, 0.18, 0.07], at: [-18, -3.1] },
		absent: true
	},
	...[-21.08, -14.92].map((x) => ({
		id: `consult door-wall baseboard cut at the door (piece at x ${x})`,
		pick: { size: [3.56, 0.18, 0.07], at: [x, -3.1], r: 0.02 }
	})),
	// P1-11: the lobby's glass entrance is a sliding door; closed, its panes meet in the middle and reach
	// the jambs (x -2.6..2.6)
	...[
		['west', -1.3],
		['east', 1.3]
	].map(([side, x]) => ({
		id: `lobby entrance pane ${side}, closed`,
		pick: { size: [2.6, 2.7, 0.05], at: [x, 10], r: 0.02 }
	}))
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected:
- `SCENE CHECK placements FAIL: 132 placements, 13 problems`;
- twelve `picked 0 meshes (expected 1)` lines;
- one `consult door-wall baseboard no longer runs across the door: still there (…)`;
- `exit 1`.

- [ ] **Step 2: Door leaves span jamb to jamb (P1-2)**

In `apps/web/arcade-src/sim-hub/src/rooms.ts`, `buildDoor`, make four replacements.

**Swing** (lines 529-531). Replace:

```ts
		const leaf = box(gap * 0.88, h, 0.08, mat, gap * 0.44, 0, 0);
		pivot.add(leaf);
		if (type === 'patientSwing') addDoorWindow(pivot, gap * 0.49, 0.35, 0.046, gap * 0.22, 0.72);
```

with:

```ts
		// closed, the leaf spans the opening from the hinge jamb to 6 mm short of the latch jamb, so its
		// corner swings clear of that jamb
		const leaf = box(gap - 0.006, h, 0.08, mat, (gap - 0.006) / 2, 0, 0);
		pivot.add(leaf);
		if (type === 'patientSwing')
			addDoorWindow(pivot, (gap - 0.006) / 2, 0.35, 0.046, gap * 0.22, 0.72);
```

**Double** (lines 541-542). Replace:

```ts
		const lw = box(gap * 0.48, h, 0.08, mat, gap * 0.24, 0, 0),
			rw = box(gap * 0.48, h, 0.08, mat, -gap * 0.24, 0, 0);
```

with:

```ts
		// closed, the two leaves reach their jambs and meet in the middle (seam 0; the faces are hidden)
		const lw = box(gap / 2, h, 0.08, mat, gap / 4, 0, 0),
			rw = box(gap / 2, h, 0.08, mat, -gap / 4, 0, 0);
```

The two `addDoorWindow` lines after it, at ±`gap * 0.24`, stay.

**Clinical slide** (lines 552-553). Replace:

```ts
		const lw = box(gap * 0.47, h, 0.07, mat, -gap * 0.245, 0, 0),
			rw = box(gap * 0.47, h, 0.07, mat, gap * 0.245, 0, 0);
```

with:

```ts
		// closed, the two panels reach the jambs and meet in the middle; open, each slides gap/2 into the
		// wall (walk.ts updateDoors), so the whole opening is clear
		const lw = box(gap / 2, h, 0.07, mat, -gap / 4, 0, 0),
			rw = box(gap / 2, h, 0.07, mat, gap / 4, 0, 0);
```

**Vault and HDR slide** (line 559). Replace:

```ts
		const leaf = box(gap * 0.94, h, 0.18, mat, 0, 0, 0);
```

with:

```ts
		// closed, the leaf spans jamb to jamb; open (gap * 1.02 aside), it clears the opening
		const leaf = box(gap, h, 0.18, mat, 0, 0, 0);
```

- [ ] **Step 3: Sliding-panel motion (P1-2)**

In `apps/web/arcade-src/sim-hub/src/walk.ts`, `updateDoors` (lines 463-465), replace:

```ts
		} else if (d.type === 'clinicalSlide') {
			d.parts[0].position.x = -d.gap * 0.245 - d.gap * 0.48 * p;
			d.parts[1].position.x = d.gap * 0.245 + d.gap * 0.48 * p;
```

with:

```ts
		} else if (d.type === 'clinicalSlide') {
			// each panel (gap/2 wide, closed at ±gap/4) slides gap/2 into the wall: open, it spans
			// gap/2..gap from the centre and the opening is clear
			d.parts[0].position.x = -(d.gap / 4 + d.gap * 0.5 * p);
			d.parts[1].position.x = d.gap / 4 + d.gap * 0.5 * p;
```

- [ ] **Step 4: Baseboards stop at the doorway (P1-2)**

In `apps/web/arcade-src/sim-hub/src/rooms.ts`, replace the whole of `addRoomBaseboards` (lines 669-679):

```ts
export function addRoomBaseboards(room: Room) {
	const hx = room.w / 2,
		hz = room.d / 2,
		y = 0.12,
		hh = 0.18,
		m = std(room.vault ? 0x4e5961 : 0x839198, 0.72, 0.08);
	scene.add(box(room.w - 0.28, hh, 0.07, m, room.x, y, room.z - hz + 0.1));
	scene.add(box(room.w - 0.28, hh, 0.07, m, room.x, y, room.z + hz - 0.1));
	scene.add(box(0.07, hh, room.d - 0.28, m, room.x - hx + 0.1, y, room.z));
	scene.add(box(0.07, hh, room.d - 0.28, m, room.x + hx - 0.1, y, room.z));
}
```

with:

```ts
export function addRoomBaseboards(room: Room) {
	const hx = room.w / 2,
		hz = room.d / 2,
		y = 0.12,
		hh = 0.18,
		m = std(room.vault ? 0x4e5961 : 0x839198, 0.72, 0.08),
		half = (room.vault ? 4.8 : 2.6) / 2;
	// One wall's board, 0.1 m in from the wall line and 0.14 m short of each corner. On the door wall it
	// is two pieces that stop at the opening's edges (the door is centred on that wall, its gap as in
	// buildSide), so no board runs across the doorway.
	const board = (side, alongX, at) => {
		const c = alongX ? room.x : room.z,
			len = (alongX ? room.w : room.d) - 0.28,
			runs =
				room.doorSide === side
					? [
							[c - len / 2, c - half],
							[c + half, c + len / 2]
						]
					: [[c - len / 2, c + len / 2]];
		for (const [a, b] of runs)
			scene.add(
				alongX
					? box(b - a, hh, 0.07, m, (a + b) / 2, y, at)
					: box(0.07, hh, b - a, m, at, y, (a + b) / 2)
			);
	};
	board('zmin', true, room.z - hz + 0.1);
	board('zmax', true, room.z + hz - 0.1);
	board('xmin', false, room.x - hx + 0.1);
	board('xmax', false, room.x + hx - 0.1);
}
```

Example, consult: the door is on zmax, centred on x -18. The board pieces run x -22.86..-19.3 and -16.7..-13.14, at z -3.1.

- [ ] **Step 5: The entrance panes become a sliding door (P1-11)**

In `apps/web/arcade-src/sim-hub/src/rooms.ts`, `buildLobbyEntrance` (lines 803-806), replace:

```ts
	const l = box(gap * 0.47, h, 0.05, glass, -gap * 0.245, 0, 0),
		rr = box(gap * 0.47, h, 0.05, glass, gap * 0.245, 0, 0);
	g.add(l, rr);
	scene.add(g);
```

with:

```ts
	// A sliding glass door, like the clinical sliders. Closed, the panes meet in the middle and reach the
	// jambs (±2.6). Open, each slides gap/2 into the front wall, so the 5.2 m opening is clear. It opens on
	// its own sensor (npc-behavior.ts updateLobbyEntrance). Its id is not a room's, so room moves never open
	// or close it. Like every door, the panes do not collide.
	const l = box(gap / 2, h, 0.05, glass, -gap / 4, 0, 0),
		rr = box(gap / 2, h, 0.05, glass, gap / 4, 0, 0);
	g.add(l, rr);
	doors.set('lobby-entrance', {
		group: g,
		side: 'zmax',
		type: 'clinicalSlide',
		progress: 0,
		target: 0,
		openSeconds: 0.9,
		parts: [l, rr],
		gap
	});
	scene.add(g);
```

`doors` is already imported from `./main` (rooms.ts:64). The lobby is built at main.ts:424, after `doors` is declared at main.ts:407.

- [ ] **Step 6: The entrance sensor and the walk door loop (P1-11)**

In `apps/web/arcade-src/sim-hub/src/npc-behavior.ts`, insert after the end of `collectBlockers` (its `return blockerBuf;` and `}`, lines 276-277) and before `export function shouldHold`:

```ts
// The lobby's glass entrance (rooms.ts buildLobbyEntrance, door id 'lobby-entrance') is a sensor door,
// like the clinical sliders. Each frame, in every mode, it opens while someone is within
// ENTRANCE_OPEN_R (horizontal) of the doorway's centre (0, 10), and closes otherwise. Someone means the
// player in walk mode, or any person: the actors collectBlockers gathers, plus the movers that are
// people, not vehicles. The player's circle is wider (ENTRANCE_PLAYER_R) so the panes are clear before
// a walking or sprinting player reaches them. main.ts stepSimulation calls it before updateDoors.
const ENTRANCE_X = 0,
	ENTRANCE_Z = 10,
	ENTRANCE_OPEN_R = 3.0,
	ENTRANCE_PLAYER_R = 5.5;
export function updateLobbyEntrance() {
	const near = (x: number, z: number, r: number) =>
		Math.hypot(x - ENTRANCE_X, z - ENTRANCE_Z) < r;
	let open = S.mode === 'walk' && near(player.pos.x, player.pos.z, ENTRANCE_PLAYER_R);
	if (!open) {
		const b = collectBlockers();
		for (let i = 0; i < b.length && !open; i += 2) open = near(b[i], b[i + 1], ENTRANCE_OPEN_R);
	}
	// a mover is a person when it has a walking rig, which addMover records as `bob: false`
	for (const m of movers) {
		if (open) break;
		open =
			!m.bob &&
			visibleInTree(m.group) &&
			near(m.group.position.x, m.group.position.z, ENTRANCE_OPEN_R);
	}
	setDoorTarget('lobby-entrance', open);
}
```

`S`, `player`, `setDoorTarget`, `movers`, `visibleInTree` and `collectBlockers` are already in scope in this module.

In `apps/web/arcade-src/sim-hub/src/main.ts`, change the `./npc-behavior` import (lines 35-41) to:

```ts
import {
	updateMovers,
	addMovingActors,
	updateDutyAnimations,
	updateNpcExchanges,
	updateHandoffTransitions,
	updateLobbyEntrance
} from './npc-behavior';
```

In `stepSimulation` (line 686), replace:

```ts
	updateDoors(dt);
	updateWalk(dt);
```

with:

```ts
	updateLobbyEntrance();
	updateDoors(dt);
	updateWalk(dt);
```

In `apps/web/arcade-src/sim-hub/src/walk.ts`, at the end of `updateWalk` (lines 599-601), replace:

```ts
	doors.forEach((d, id) => {
		if (!nearest || id !== nearest.id || nd >= 2.15) setDoorTarget(id, false);
	});
```

with:

```ts
	doors.forEach((d, id) => {
		// the lobby's glass entrance has its own sensor (npc-behavior.ts updateLobbyEntrance)
		if (id === 'lobby-entrance') return;
		if (!nearest || id !== nearest.id || nd >= 2.15) setDoorTarget(id, false);
	});
```

- [ ] **Step 7: Build and run the checks**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P1/npc-t2.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P1/npc-baseline.log") <(grep '^NPC CHECK' "$P1/npc-t2.log")
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- signs PASS (163), legs PASS, `SCENE CHECK placements PASS: 132 placements, 0 problems`, `exit 0`;
- the NPC check: `exit 0`, and no diff output, since doors are not furniture (`scripts/lib/furniture.mjs:20`) and the entrance panes are now door meshes;
- vitest: 4 files passed;
- `check exit 0`.

- [ ] **Step 8: Probe the entrance sensor**

Write this scratch probe. It is not committed. It loads the built page the way the checks do, runs 120 simulated seconds, and counts how often the entrance opens fully and closes again for the people who pass it. Before this change, person movers came within 3 m of (0, 10) twice in 120 s, for 8.8 s in all:

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cat > "$P1/entrance-probe.mjs" <<'PROBE_EOF'
// Scratch probe (not committed): over 120 simulated seconds, does the lobby's glass entrance open for the
// people who pass it, and close again? Run from apps/web after pnpm build:arcade.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const WEB = '/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web';
let simNow = 1000;
Object.defineProperty(globalThis.performance, 'now', { value: () => simNow, configurable: true });
const timers = new Map();
let tid = 0;
globalThis.setTimeout = (fn, ms = 0, ...a) => (timers.set(++tid, { at: simNow + (Number(ms) || 0), fn, a }), tid);
globalThis.clearTimeout = (id) => timers.delete(id);
const { installBrowserStubs } = await import(pathToFileURL(path.join(WEB, 'scripts/lib/browser-stubs.mjs')).href);
installBrowserStubs({ search: '?npccheck' });
const dir = path.join(WEB, 'arcade/sim-hub/assets');
await import(pathToFileURL(path.join(dir, fs.readdirSync(dir).find((f) => /^index-.*\.js$/.test(f)))).href);
const N = globalThis.window.__NPC;
N.disableRendering();
const door = N.doors.get('lobby-entrance');
if (!door) {
	console.log('no lobby-entrance door');
	process.exit(1);
}
let opened = 0, closed = 0, isOpen = false;
for (let i = 0; i < 30 * 120; i++) {
	simNow += 1000 / 30;
	for (const [id, t] of [...timers]) if (t.at <= simNow) { timers.delete(id); t.fn(...t.a); }
	N.stepSimulation(simNow);
	if (!isOpen && door.progress >= 0.999) { opened++; isOpen = true; }
	if (isOpen && door.progress <= 0.001) { closed++; isOpen = false; }
}
console.log(`lobby entrance over 120 s: opened fully ${opened}x, closed again ${closed}x, ends at progress ${door.progress.toFixed(2)}, panes at x ${door.parts.map((p) => p.position.x.toFixed(2)).join(', ')}`);
process.exit(0);
PROBE_EOF
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node "$P1/entrance-probe.mjs" 2>&1 | grep 'lobby entrance'
```

Expected: `lobby entrance over 120 s: opened fully Nx, closed again Mx, …`, where:
- N ≥ 1;
- M is N or N - 1;
- when it ends closed: `ends at progress 0.00, panes at x -1.30, 1.30`.

If N is 0, the sensor does not see the passers-by. Report it with the output.

- [ ] **Step 9: After shots**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P1/shots-p1.json" "$P1/t2.json" door-consult-hall door-physics-hall door-ctcontrol-in door-vault1-hall door-hdr-hall lobby-entrance
node "$SHOTS" "$P1/after" - "$P1/t2.json"
```

Expected: six lines naming the PNGs. Read each next to its before twin. Check:
- `door-consult-hall`: no slot at the latch side;
- `door-physics-hall`: the two leaves meet with no centre slot;
- `door-ctcontrol-in`: no bright slit in the middle or at the jambs, and no baseboard across the doorway;
- `door-vault1-hall` and `door-hdr-hall`: no dark slots at the sides.
- `lobby-entrance`: the two panes meet in the middle. The shot's fixed clock may catch them opening if someone is near; either is fine.

- [ ] **Step 10: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/walk.ts arcade-src/sim-hub/src/npc-behavior.ts arcade-src/sim-hub/src/main.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/walk.ts arcade-src/sim-hub/src/npc-behavior.ts arcade-src/sim-hub/src/main.ts scripts/sim-hub-scene-check.mjs
```

Expected: no eslint errors. If prettier changed a source file, rebuild and rerun the scene check (exit 0).

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/walk.ts apps/web/arcade-src/sim-hub/src/npc-behavior.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): closed doors span jamb to jamb, baseboards stop at doorways, the glass entrance slides open

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Light-strip shadows, the technical hallway's north end, the LINAC junction, the lobby blades (P1-5, P1-6, P1-7, P1-8)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`:
  - `addCirculationProps`, the walkway cart, lines 475-478;
  - `buildCorridorInfillWalls`, ≈1518-1523, ≈1533-1534 and ≈1542-1545;
  - `corridorLightsHorizontal` and `corridorLightsVertical`, lines 1610-1638;
  - `buildCorridorRoofs`, lines 1658-1660.
  - Task 2 added lines to rooms.ts above the last three (marked ≈), so find them by the quoted text.
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts:1164-1172`, the junction sign.
- Modify: `apps/web/arcade-src/sim-hub/src/helpers.ts:≈441-477`, `makeDirectionalSign` (Task 1 added four lines above it).
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts:≈479-506`, the three lobby blades (Task 2 added one import line above them).
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs`:
  - the roof rows, lines 415-416;
  - the end wall, line 451;
  - append 5 pins.
- Scratch: `$P1/npc-t3.log`, `$P1/t3.json`.

**Interfaces:**
- Consumes: `$P1/shots-p1.json` and `$P1/npc-baseline.log` (Task 1).
- Produces: `makeDirectionalSign(text, sub, x, y, z, rotY, w = 3.2, back?: [string, string])`. With `back`, the back face (`'sign-back'`) shows `back[0]` / `back[1]` in place of the arrow-swapped front. Without it, the behaviour is today's.

- [ ] **Step 1: Update and add the placements (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, in the roof rows (lines 415-416), replace:

```js
		[-2, 2, -56.5, -54, 3.75, 'technical hallway by commons and dosimetry'],
		[-2, 3, -66, -56.5, 3.75, 'technical hallway north'],
```

with:

```js
		[-2, 2, -66, -54, 3.75, 'technical hallway north'],
```

Replace the end-wall pin (line 451):

```js
	{ id: 'technical hallway end wall', pick: { size: [5, 3.75, 0.18], at: [0.5, -66] } },
```

with:

```js
	{ id: 'technical hallway end wall', pick: { size: [4, 3.75, 0.18], at: [0, -66] } },
```

Add a comma after the last `PLACEMENTS` entry (Task 2's lobby-pane `.map(...)`), and append before `];`:

```js
	// P1-6: the technical hallway's right wall runs straight along x 2 from dosimetry to the end wall
	{
		id: 'technical hallway north right wall on x 2',
		pick: { size: [0.18, 3.75, 9.5], at: [2, -61.25], r: 0.02 }
	},
	{
		id: 'technical hallway north right wall on x 3 removed',
		pick: { size: [0.18, 3.75, 9.5], at: [3, -61.25] },
		absent: true
	},
	// P1-7: a solid block fills the pocket between the vault entrances, its face on the vault walls'
	// corridor face (x 63.71); the junction sign hangs on it; the walkway's supply cart is gone
	{
		id: 'junction block flush with the vault walls',
		pick: { size: [3.08, 5.7, 10.0], at: [65.25, 0], r: 0.02 }
	},
	{
		id: 'junction sign on the block',
		pick: { geom: 'PlaneGeometry', size: [4.0, 0.76], at: [63.66, 0], r: 0.1, name: '' },
		flush: { axis: 'x', face: 63.71, side: 'max' }
	},
	{
		id: 'walkway cart removed',
		pick: { size: [0.4592, 0.78, 0.3116], at: [61.6, -23.2] },
		absent: true
	}
```

The `'roof over the pocket between the vault entrances'` row stays.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected: `SCENE CHECK placements FAIL: 136 placements, 7 problems`, then `exit 1`. The seven problems:
- `roof over the technical hallway north: picked 0 meshes`;
- `technical hallway end wall: picked 0 meshes`;
- `technical hallway north right wall on x 2: picked 0 meshes`;
- `technical hallway north right wall on x 3 removed: still there`;
- `junction block …: picked 0`;
- `junction sign on the block: picked 0`;
- `walkway cart removed: still there`.

- [ ] **Step 2: Hallway light strips cast no shadow (P1-5)**

In `apps/web/arcade-src/sim-hub/src/rooms.ts`, replace both light functions:

```ts
export function corridorLightsHorizontal(x0, x1, z, y = 3.72) {
	for (let x = x0; x <= x1; x += 5) {
		const l = box(
			2.1,
			0.025,
			0.24,
			std(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 1.35 }),
			x,
			y,
			z
		);
		scene.add(l);
	}
}

export function corridorLightsVertical(z0, z1, x, y = 3.72) {
	for (let z = z0; z <= z1; z += 5) {
		const l = box(
			0.24,
			0.025,
			2.1,
			std(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 1.35 }),
			x,
			y,
			z
		);
		scene.add(l);
	}
}
```

with:

```ts
// The strips cast no shadow. The hallway roofs cast none, so the sun reaches a strip, and its shadow
// drew a thin diagonal line across the hallway walls.
export function corridorLightsHorizontal(x0, x1, z, y = 3.72) {
	for (let x = x0; x <= x1; x += 5) {
		const l = box(
			2.1,
			0.025,
			0.24,
			std(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 1.35 }),
			x,
			y,
			z
		);
		l.castShadow = false;
		scene.add(l);
	}
}

export function corridorLightsVertical(z0, z1, x, y = 3.72) {
	for (let z = z0; z <= z1; z += 5) {
		const l = box(
			0.24,
			0.025,
			2.1,
			std(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 1.35 }),
			x,
			y,
			z
		);
		l.castShadow = false;
		scene.add(l);
	}
}
```

- [ ] **Step 3: The technical hallway's north end (P1-6)**

In `buildCorridorInfillWalls`, replace the x 3 list (≈1518-1523):

```ts
	[
		[-13, -10],
		[-26, -23],
		[-41.5, -36],
		[-66, -56.5]
	].forEach((s) => infillV(s[0], s[1], 3));
```

with:

```ts
	[
		[-13, -10],
		[-26, -23],
		[-41.5, -36]
	].forEach((s) => infillV(s[0], s[1], 3));
```

Replace the hallway ends (≈1542-1545):

```ts
	// the patient-services hallway's west end and the technical hallway's north end (x -3..-2 is the
	// commons' wall)
	infillV(-3, 3, -52);
	infillH(-2, 3, -66);
```

with:

```ts
	// the patient-services hallway's west end and the technical hallway's north end (x -3..-2 is the
	// commons' wall). The technical hallway's right wall runs on along x 2 past dosimetry (z -56.5) to
	// that end, so the hallway stays 4 m wide (x -2..2) from the commons to its end, centred on the floor
	// stripe and the lights.
	infillV(-3, 3, -52);
	infillV(-66, -56.5, 2);
	infillH(-2, 2, -66);
```

In `buildCorridorRoofs`, replace:

```ts
	roof(-2, 2, -56.5, -54, 3.75);
	roof(-2, 3, -66, -56.5, 3.75);
```

with:

```ts
	roof(-2, 2, -66, -54, 3.75);
```

- [ ] **Step 4: The LINAC junction: block, sign, cart (P1-7)**

In `buildCorridorInfillWalls`, replace (≈1533-1534):

```ts
	// Treatment branch between the two vault entrances.
	infillV(-7, 7, 67, 5.7, 0.42);
```

with:

```ts
	// Treatment branch between the two vault entrances.
	infillV(-7, 7, 67, 5.7, 0.42);
	// A solid block fills that pocket (x 63.71..66.79, z -5..5, the vault height). Its face continues the
	// vault walls' corridor face (x 63.71), so the walkway's east side reads as one wall, and the junction
	// sign hangs on it (equipment.ts buildPhase5Wayfinding). z ±5 also closes the notches where the vault
	// west walls end. The pocket's roof, floor plate and back wall stay, hidden inside or under it.
	wall(65.25, 0, 3.08, 10.0, 5.7, MAT.wallVault, true);
```

`wall` (helpers) and `MAT` (main) are already imported in rooms.ts.

In `addCirculationProps` (lines 474-479), replace:

```ts
	aedWallBox(hall, 58.15, 1.62, 6.82, Math.PI / 2, 'AED');
	const cameraPole = medCartObject(0.82, 0x98adb7);
	cameraPole.position.set(61.6, 0, -23.2);
	cameraPole.rotation.y = Math.PI / 2;
	scene.add(cameraPole);
}
```

with:

```ts
	aedWallBox(hall, 58.15, 1.62, 6.82, Math.PI / 2, 'AED');
}
```

`medCartObject` stays in use by `cart1` and `cart2`.

In `apps/web/arcade-src/sim-hub/src/equipment.ts`, `buildPhase5Wayfinding` (lines 1164-1168), replace:

```ts
	makeDirectionalSign(
		'VAULT 1  ↓   ·   VAULT 2  ↑',
		'Shielded treatment rooms',
		63.2,
		2.88,
```

with:

```ts
	// On the junction block's face (x 63.71, rooms.ts buildCorridorInfillWalls), 0.05 m off it. Read from
	// the walkway facing +x, vault 1 (z -18) is on the left and vault 2 (z 18) on the right. Its back face
	// faces the block and is never seen, so it passes no back label.
	makeDirectionalSign(
		'VAULT 1  ←   ·   VAULT 2  →',
		'Shielded treatment rooms',
		63.66,
		2.88,
```

The rest of the call (`0, -Math.PI / 2, 4.0`) stays.

- [ ] **Step 5: The lobby blades (P1-8)**

In `apps/web/arcade-src/sim-hub/src/helpers.ts`, replace `makeDirectionalSign` (≈441-477) from its comment through its last `face(...)` call. Replace:

```ts
// Two one-sided faces at the same spot, so neither side reads mirrored. The back face ('sign-back')
// swaps the horizontal arrows, so from either side they point the same way in the world.
export function makeDirectionalSign(text, sub, x, y, z, rotY, w = 3.2) {
	const face = (label, rot, name) => {
```

with:

```ts
// Two one-sided faces at the same spot, so neither side reads mirrored. The back face ('sign-back')
// swaps the horizontal arrows, so from either side they point the same way in the world. A blade that
// passes `back` ([text, sub]) shows that on its back face instead: the lobby blades, whose backs face
// the hallways, point back to the lobby.
export function makeDirectionalSign(text, sub, x, y, z, rotY, w = 3.2, back?: [string, string]) {
	const face = (label, subLabel, rot, name) => {
```

Inside `face`, replace:

```ts
		q.fillText(sub, 45, 162);
```

with:

```ts
		q.fillText(subLabel, 45, 162);
```

Replace the two calls at the end:

```ts
	face(text, rotY, '');
	face(
		text.replace(/[←→]/g, (a) => (a === '←' ? '→' : '←')),
		rotY + Math.PI,
		'sign-back'
	);
}
```

with:

```ts
	face(text, sub, rotY, '');
	const [backText, backSub] = back || [
		text.replace(/[←→]/g, (a) => (a === '←' ? '→' : '←')),
		sub
	];
	face(backText, backSub, rotY + Math.PI, 'sign-back');
}
```

In `apps/web/arcade-src/sim-hub/src/main.ts`, replace the three lobby blades (≈479-506, from `makeDirectionalSign(\n\t'←  PATIENT SERVICES',` through the `'CLINICAL SERVICES  →'` call's closing `);`):

```ts
makeDirectionalSign(
	'←  PATIENT SERVICES',
	'Consult · Counseling · Education · Patient Care',
	-11.25,
	2.82,
	0,
	Math.PI / 2,
	3.7
);
makeDirectionalSign(
	'TECHNICAL / EDUCATION  ↑',
	'Physics · RadBio · Engineering · QA · Dosimetry',
	0,
	2.82,
	-9.35,
	0,
	4.2
);
makeDirectionalSign(
	'CLINICAL SERVICES  →',
	'CT Simulation · Leadership · LINAC · HDR',
	11.25,
	2.82,
	0,
	-Math.PI / 2,
	3.7
);
```

with:

```ts
// The three lobby blades hang over the openings you walk straight through, so each front points ↑.
// Their backs face the hallways and point back to the lobby.
const LOBBY_BLADE_BACK: [string, string] = [
	'MAIN LOBBY  ↑',
	'Reception · Check-in · Main entrance'
];
makeDirectionalSign(
	'PATIENT SERVICES  ↑',
	'Consult · Counseling · Education · Patient Care',
	-11.25,
	2.82,
	0,
	Math.PI / 2,
	3.7,
	LOBBY_BLADE_BACK
);
makeDirectionalSign(
	'TECHNICAL / EDUCATION  ↑',
	'Physics · RadBio · Engineering · QA · Dosimetry',
	0,
	2.82,
	-9.35,
	0,
	4.2,
	LOBBY_BLADE_BACK
);
makeDirectionalSign(
	'CLINICAL SERVICES  ↑',
	'CT Simulation · Leadership · LINAC · HDR',
	11.25,
	2.82,
	0,
	-Math.PI / 2,
	3.7,
	LOBBY_BLADE_BACK
);
```

The other blades pass no `back` and keep today's behaviour: CT SIMULATION, TREATMENT AREA, the junction and EXIT / RECEPTION.

- [ ] **Step 6: Build and run the checks**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P1/npc-t3.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P1/npc-baseline.log") <(grep '^NPC CHECK' "$P1/npc-t3.log")
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- the scene check: signs PASS (163 panels; the junction sign is 0.05 m off the block), legs PASS, `SCENE CHECK placements PASS: 136 placements, 0 problems`, `exit 0`;
- the NPC check: `exit 0` and no diff output. The block is a wall collider. Movers keep at least 0.3 m from it (linacRunner lanes x 62.2 and 60.9), and the hand-over lane x 63.4 keeps its 0.2 m circle 0.11 m short of its face, as along the vault walls.
- vitest: 4 files passed;
- `check exit 0`.

If check a, k or l now fails near the junction (x > 62, |z| < 6), report the failing lines. Do not move NPC lanes in this task.

- [ ] **Step 7: After shots**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P1/shots-p1.json" "$P1/t3.json" hall-north-end hall-north-near hall-tech-north overview-roofs commons-sign walkway-junction walkway-junction-near walkway-north blade-clinical blade-patient blade-clinical-back
node "$SHOTS" "$P1/after" - "$P1/t3.json"
```

Expected: eleven lines naming the PNGs. Read each next to its before twin. Check:
- `hall-north-end` and `hall-north-near`: the right wall runs straight to a 4 m end wall, centred on the stripe and the lights, with no diagonal shadow line;
- `overview-roofs`: the technical hallway's north roof is one 4 m slab;
- `walkway-junction` and `walkway-junction-near`: the pocket is filled flush with the vault walls, and the sign sits on it reading `VAULT 1 ← · VAULT 2 →`;
- `walkway-north`: no blue cart on the walkway;
- `blade-clinical` and `blade-patient`: `CLINICAL SERVICES ↑` and `PATIENT SERVICES ↑`;
- `blade-clinical-back`: `MAIN LOBBY ↑` with its subtitle.

- [ ] **Step 8: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/helpers.ts arcade-src/sim-hub/src/main.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/helpers.ts arcade-src/sim-hub/src/main.ts scripts/sim-hub-scene-check.mjs
```

Expected: no eslint errors. If prettier changed a source file, rebuild and rerun the scene check (exit 0).

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/helpers.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): straight technical hallway end, solid LINAC junction with its sign, lobby blades point the way you walk, no strip-light shadow lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The kiosk at the entrance, the light pole and sign plants, the walk start outside at NPC eye height (P1-9, P1-12, P1-10)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts`:
  - `monumentSign` plants, lines 490-492;
  - `orientationKiosk`, ≈1626-1630 (1622-1626 before Task 1).
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`: the lamp list in `buildExteriorAmbient`, the `[0, 14],` entry. It was line 990 before Task 2.
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts`: `export const player`, ≈544 (535 before Tasks 2 and 3).
- Modify: `apps/web/arcade-src/sim-hub/src/walk.ts`:
  - the `./main` import, line 29;
  - `nearestDoor`, lines 56-68;
  - `finishTravel`, line 361;
  - `setMode`'s walk branch, ≈507-515.
- Modify: `apps/web/arcade-src/sim-hub/src/interact.ts`:
  - the `./main` import, line 36;
  - `nearestInteractable`, lines 459-472.
- Modify: `apps/web/arcade-src/sim-hub/src/journey.ts`:
  - the `./main` import, lines 73-81;
  - `applyWalkConversationComposition`, line 2949.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs`:
  - the kiosk pin, lines 465-470;
  - append 6 pins.
- Modify: `apps/web/scripts/sim-hub-visibility-check.mjs`:
  - the header, lines 10-12;
  - the poses, lines 367-427.
- Scratch: `$P1/npc-t4.log`, `$P1/vis-t4.log`, `$P1/t4.json`.

**Interfaces:**
- Consumes:
  - the `'lobby-entrance'` sliding door and `updateLobbyEntrance` (Task 2). The walk-in path from the new start goes through it.
  - `$P1/shots-p1.json` and `$P1/npc-baseline.log` (Task 1).
- Produces:
  - `export const PLAYER_EYE_Y = 1.87` and `export const REACH_Y = 1.65` in `main.ts`, declared just above `export const player`;
  - the walk start (2.0, `PLAYER_EYE_Y`, 20.4), aimed at (-1.0, 2.0, 10.5);
  - the visibility check's walk poses at 1.87, plus `outside spawn h0/h90/h180/h270`.

- [ ] **Step 1: Update and add the placements (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, replace the kiosk pin (lines 465-470; Task 1 added a comma after its `}`):

```js
	// the welcome kiosk's screen is on the lobby side (+z) of its stand, so it reads the right way
	// round from the room
	{
		id: 'welcome kiosk screen faces the lobby',
		pick: { geom: 'PlaneGeometry', size: [1.16, 0.68], at: [5.5, -4.195], r: 0.02 }
	},
```

with:

```js
	// P1-9: the welcome kiosk stands just inside the main entrance, east of the walk-in line. Its screen
	// is on the doors' side (+z) of its stand, so it reads the right way round as you walk in.
	{
		id: 'welcome kiosk screen faces the entrance',
		pick: { geom: 'PlaneGeometry', size: [1.16, 0.68], at: [2.6, 6.355], r: 0.02 }
	},
```

Add a comma after the last `PLACEMENTS` entry (Task 3's `walkway cart removed`), and append before `];`:

```js
	// P1-12: the plaza light pole stands left of the monument sign (seen from the street), and the sign's
	// four plants stand at the corners of its planter bed, none inside the slab (pots at scale 0.55)
	{
		id: 'light pole left of the monument sign',
		pick: { geom: 'CylinderGeometry', size: [0.06, 0.08, 4.4], at: [-5.75, 14.25], r: 0.05 }
	},
	{
		id: 'light pole behind the monument sign removed',
		pick: { geom: 'CylinderGeometry', size: [0.06, 0.08, 4.4], at: [0, 14], r: 0.1 },
		absent: true
	},
	...[
		['front-left', -4.65, 14.85],
		['front-right', 1.05, 14.85],
		['back-left', -4.65, 13.65],
		['back-right', 1.05, 13.65]
	].map(([corner, x, z]) => ({
		id: `monument plant at the ${corner} corner`,
		pick: { geom: 'CylinderGeometry', size: [0.1485, 0.187, 0.286], at: [x, z], r: 0.05 }
	}))
```

The corners are named as seen from the street: front is +z, toward the street; left is -x.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected: `SCENE CHECK placements FAIL: 142 placements, 7 problems`, then `exit 1`. The seven problems:
- `welcome kiosk screen faces the entrance: picked 0 meshes`;
- `light pole left of the monument sign: picked 0 meshes`;
- `light pole behind the monument sign removed: still there`;
- four `monument plant at the … corner: picked 0 meshes`.

- [ ] **Step 2: The kiosk at the entrance (P1-9)**

In `apps/web/arcade-src/sim-hub/src/props.ts`, `orientationKiosk`, replace:

```ts
	const x = 5.5,
		z = -4.3;
```

with:

```ts
	// just inside the main entrance (the doors are at z 10), east of the walk-in line, square to the doors
	const x = 2.6,
		z = 6.25;
```

Then replace the comment four lines below it:

```ts
	// the screen faces the lobby (+z) and leans back, so it reads the right way round from the room
```

with:

```ts
	// the screen faces the entrance doors (+z) and leans back, so it reads the right way round as you walk in
```

Nothing else in the builder changes. The kiosk spans x 1.94..3.26 and z 5.97..6.53, with the screen at (2.6, 1.5, 6.355). Its interactable moves with the screen.

- [ ] **Step 3: The light pole and the sign plants (P1-12)**

In `apps/web/arcade-src/sim-hub/src/rooms.ts`, `buildExteriorAmbient`, in the lamp list, replace:

```ts
		[0, 14],
```

with:

```ts
		// left of the monument sign seen from the street; the arm (+x) hangs the luminaire over the
		// planter's west end
		[-5.75, 14.25],
```

In `apps/web/arcade-src/sim-hub/src/props.ts`, `monumentSign` (lines 490-492), replace:

```ts
	for (const ox of [-2.6, -1.8, 1.8, 2.6]) {
		plant(g, x + ox, z - 0.15, 0.55);
	}
```

with:

```ts
	// one plant at each corner of the planter bed (6.4 x 1.85), clear of the slab and of the lettering
	for (const [ox, oz] of [
		[-2.85, -0.6],
		[2.85, -0.6],
		[-2.85, 0.6],
		[2.85, 0.6]
	])
		plant(g, x + ox, z + oz, 0.55);
```

- [ ] **Step 4: Eye height, reach, and the walk start outside (P1-10)**

In `apps/web/arcade-src/sim-hub/src/main.ts`, replace:

```ts
export const player = {
	pos: new THREE.Vector3(0, 1.65, 5.5),
```

with:

```ts
// The walk camera's height. NPC eyes are at 1.87 (npc.ts personFigure), so the player meets them eye to
// eye. Interaction reach (interact.ts nearestInteractable, walk.ts nearestDoor) is measured from
// REACH_Y, the old eye height, so every reach feels as before. Guided travel keeps its 1.66 route nodes.
export const PLAYER_EYE_Y = 1.87;
export const REACH_Y = 1.65;
export const player = {
	// walk mode starts outside the main entrance (walk.ts setMode)
	pos: new THREE.Vector3(2.0, PLAYER_EYE_Y, 20.4),
```

Declare both constants here, above `player`, and not in walk.ts: `player` uses `PLAYER_EYE_Y` while main.ts loads.

In `apps/web/arcade-src/sim-hub/src/walk.ts`, change the `./main` import (line 29) to:

```ts
import { roomById, player, doors, ceilings, keys, PLAYER_EYE_Y, REACH_Y } from './main';
```

Replace the start of `nearestDoor` (lines 56-62):

```ts
export function nearestDoor(maxD = 2.6) {
	let best = null,
		bd = maxD;
	ROOMS.filter((r) => !r.hub).forEach((r) => {
		const p = doorPoint(r),
			d = player.pos.distanceTo(p);
```

with:

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
```

In `finishTravel` (line 361), replace:

```ts
	player.pos.copy(camera.position);
	updateRoomUI(arrived);
```

with:

```ts
	player.pos.copy(camera.position);
	// walk mode keeps its own eye height, never the guided camera's
	player.pos.y = PLAYER_EYE_Y;
	updateRoomUI(arrived);
```

In `setMode`, the walk branch with no active room (≈507-515), replace:

```ts
		} else {
			player.pos.set(0, 1.65, 5.5);
			camera.position.copy(player.pos);
			const f = focusTargetsForRoom(roomById('lobby'));
			if (f) aimPlayerAt(f.target);
			else {
				player.yaw = 0;
				player.pitch = 0;
			}
		}
```

with:

```ts
		} else {
			// Walk mode starts outside, on the entrance plaza about 0.5 m north of the curb, facing the
			// monument and entrance signs. The walk in runs north along x 2.0 through the sliding glass.
			// S.activeRoom stays null outside; walking in, roomContainingWalkPoint picks up the lobby.
			player.pos.set(2.0, PLAYER_EYE_Y, 20.4);
			camera.position.copy(player.pos);
			aimPlayerAt(new THREE.Vector3(-1.0, 2.0, 10.5));
			document.getElementById('locText').textContent =
				'Outside the main entrance · walk in through the doors';
		}
```

`focusTargetsForRoom` and `roomById` stay imported. walk.ts still uses them at lines 120 and 431.

In `apps/web/arcade-src/sim-hub/src/interact.ts`, change the `./main` import (line 36) to:

```ts
import { roomById, player, doors, ROOM_GUIDES, HANDOFFS, REACH_Y } from './main';
```

and replace the start of `nearestInteractable` (lines 459-465):

```ts
function nearestInteractable(maxD = 2.8) {
	let best = null,
		bd = maxD;
	const wp = new THREE.Vector3();
	for (const it of interactables) {
		it.object.getWorldPosition(wp);
		const d = player.pos.distanceTo(wp),
```

with:

```ts
function nearestInteractable(maxD = 2.8) {
	let best = null,
		bd = maxD;
	// reach is measured from a fixed 1.65 m (main.ts REACH_Y), not the eye (PLAYER_EYE_Y), so every
	// interaction range feels as before
	const wp = new THREE.Vector3(),
		from = new THREE.Vector3(player.pos.x, REACH_Y, player.pos.z);
	for (const it of interactables) {
		it.object.getWorldPosition(wp);
		const d = from.distanceTo(wp),
```

In `apps/web/arcade-src/sim-hub/src/journey.ts`, add `PLAYER_EYE_Y` to the `./main` import (lines 73-81):

```ts
import {
	roomById,
	ROOM_GUIDES,
	ROOM_CAST,
	PRIMARY_NPCS,
	PRIMARY_PATIENTS,
	doors,
	player,
	PLAYER_EYE_Y
} from './main';
```

and in `applyWalkConversationComposition` (line 2949), replace:

```ts
		player.pos.y = 1.65;
```

with:

```ts
		player.pos.y = PLAYER_EYE_Y;
```

Leave these unchanged:
- boot (overview);
- the guided start (walk.ts, camera at 1.7);
- the Lobby button and Back;
- the guided-route nodes at 1.66, and `HUB` at 1.68;
- the room `cam` poses and the third-person framings;
- `doorCenter`'s default `y = 1.65`, which is a target height, not an eye.

- [ ] **Step 5: The visibility check samples the new eye height and the outside start (P1-10)**

In `apps/web/scripts/sim-hub-visibility-check.mjs`, replace the header lines 10-12:

```js
//   - every room: walk pose (room centre, eye height 1.65) and guided pose (the room's `cam`/`look`),
//     four headings each (0/90/180/270 degrees about the vertical axis)
//   - 6 hallway points (2.5 m outside a room door), four headings each
```

with:

```js
//   - every room: walk pose (room centre, eye height 1.87, main.ts PLAYER_EYE_Y) and guided pose (the
//     room's `cam`/`look`), four headings each (0/90/180/270 degrees about the vertical axis)
//   - 6 hallway points (2.5 m outside a room door), four headings each
//   - the walk-mode start outside the main entrance (2.0, 1.87, 20.4), four headings
```

Replace (line 367):

```js
		const poses = [];
		const headings = [0, 90, 180, 270];
```

with:

```js
		// the walk camera's height (main.ts PLAYER_EYE_Y)
		const EYE = 1.87;
		const poses = [];
		const headings = [0, 90, 180, 270];
```

Make these five replacements:

| line | old | new |
|---|---|---|
| 370 | `const wp = [q.x, 1.65, q.z];` | `const wp = [q.x, EYE, q.z];` |
| 399 | `hall.push({ id, pos: [ox ? px : q.x, 1.65, oz ? pz : q.z] });` | `hall.push({ id, pos: [ox ? px : q.x, EYE, oz ? pz : q.z] });` |
| 414 | `pos: [lc.x - 2.5, 1.65, lc.z + 1.37],` | `pos: [lc.x - 2.5, EYE, lc.z + 1.37],` |
| 420 | `pos: [lc.x + 1, 1.65, lc.z - 1.24],` | `pos: [lc.x + 1, EYE, lc.z - 1.24],` |
| 426 | `pos: [cc.x, 1.65, cc.z],` | `pos: [cc.x, EYE, cc.z],` |

Then, after the `ctcontrol glass into ctsim` pose's closing `});` (line 428) and before `// Elevated poses (see header).`, insert:

```js
		// the walk-mode start outside the main entrance (walk.ts setMode), the first camera a player sees
		const spawn = [2.0, EYE, 20.4];
		for (const h of headings)
			poses.push({
				name: `outside spawn h${h}`,
				room: roomAt(spawn[0], spawn[2]),
				pos: spawn,
				look: yawAim(h, spawn, 0)
			});
```

Confirm no walk pose is left at the old height:

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && grep -c '1\.65' scripts/sim-hub-visibility-check.mjs
```

Expected: `0`.

- [ ] **Step 6: Build and run the checks, including the visibility check**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P1/npc-t4.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P1/npc-baseline.log") <(grep '^NPC CHECK' "$P1/npc-t4.log")
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P1/vis-t4.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures|page errors' "$P1/vis-t4.log"
```

Expected:
- the scene check: signs PASS (163), legs PASS, `SCENE CHECK placements PASS: 142 placements, 0 problems`, `exit 0`;
- the NPC check: `exit 0` and no diff output. The kiosk joins the furniture at its new spot, with 0.97 m to the visitor lanes and 1.34 m to the journey line. The NPC check runs in overview mode, so the new initial `player.pos` changes nothing in it.
- vitest: 4 files passed;
- `check exit 0`;
- the visibility check: `poses checked: 301`, `poses with failures: 0` and `vis exit 0`. That is the 297 poses as before, plus the 4 outside-start headings.

If a check fails:
- **NPC, near the kiosk:** if k, l or m fails there, report the failing line. Do not move the kiosk off the spec's spot without the controller.
- **Visibility:** if a pose fails, report its lines from `$P1/vis-t4.log`: the pose name and the missing meshes. Do not change `visibility.ts` in this plan. A failing `outside spawn` pose means the lobby portal culls something seen through the entrance.

- [ ] **Step 7: After shots**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P1/shots-p1.json" "$P1/t4.json" lobby-kiosk outside-spawn lobby-entrance sign-front sign-top
node "$SHOTS" "$P1/after" - "$P1/t4.json"
```

Expected: five lines naming the PNGs. Read each next to its before twin. Check:
- `lobby-kiosk`: the kiosk stands just inside the doors, east of the line in, screen toward the doors.
- `outside-spawn`: the monument sign and the entrance sign are both in view, the pole is left of the monument, and the kiosk shows through the east glass. The ambulance may still pass through the sign; Task 5 parks it.
- `sign-front` and `sign-top`: the plants are at the bed's four corners, none in the slab. The pole is off to the left, not behind the slab.
- `lobby-entrance`: the entrance seen from outside at eye height 1.87.

- [ ] **Step 8: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/main.ts arcade-src/sim-hub/src/walk.ts arcade-src/sim-hub/src/interact.ts arcade-src/sim-hub/src/journey.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-visibility-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/main.ts arcade-src/sim-hub/src/walk.ts arcade-src/sim-hub/src/interact.ts arcade-src/sim-hub/src/journey.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-visibility-check.mjs
```

Expected: no eslint errors. If prettier changed a source file, rebuild and rerun the scene check (exit 0).

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/props.ts apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/arcade-src/sim-hub/src/walk.ts apps/web/arcade-src/sim-hub/src/interact.ts apps/web/arcade-src/sim-hub/src/journey.ts apps/web/scripts/sim-hub-scene-check.mjs apps/web/scripts/sim-hub-visibility-check.mjs
git commit -m "fix(sim-hub): walk mode starts outside at NPC eye height, the kiosk greets you inside the doors, the pole and plants clear the monument sign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The ambulance parked, the vehicles at real size with round wheels (P1-13, P1-14)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts:204-212`: `vehicleObject`, its inner `body` group and `addWheel`.
- Modify: `apps/web/arcade-src/sim-hub/src/npc-behavior.ts`:
  - the header comment, lines 9-11;
  - the `./npc` import, lines 21-35;
  - the `./equipment` import, line 47;
  - the ambulance, ≈599-603 (577-581 before Task 2);
  - `walkSwing`/`advanceRoute`/`advancePed`, ≈804-851 (782-829 before Task 2).
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts`:
  - the imports, lines 33-53;
  - the ambulance cycle, lines 738-836.
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts`:
  - the `./equipment` import, ≈47;
  - `stepSimulation`'s `updateAmbulance(dt, sec);`, ≈713 (697 before Tasks 2 to 4).
- Modify: `apps/web/arcade-src/sim-hub/src/state.ts`: lines 9, 19-21 and 45-47.
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`: the apron constants before `buildExteriorAmbient` (937-941 before Task 2).
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs`: append 1 pin.
- Modify: `apps/web/scripts/sim-hub-npc-check.mjs`:
  - check f's header, lines 21-22;
  - `allPeople`, lines 1021-1022;
  - `checkFeet`, lines 1065-1087.
- Scratch: `$P1/npc-t5.log`, `$P1/t5.json`.

**Interfaces:**
- Consumes: `$P1/shots-p1.json` and `$P1/npc-baseline.log` (Task 1).
- Produces:
  - `vehicleObject(kind, color)` returns an unscaled group holding a `body` group scaled 1.6;
  - the ambulance is static at (31, 0, 23), `rotation.y = π`;
  - `S` no longer has `AMB`/`ambUnload`/`ambLoad`;
  - check f samples 14 moments.

- [ ] **Step 1: Add the failing ambulance placement (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, add a comma after the last `PLACEMENTS` entry (Task 4's plant `.map(...)`), and append before `];`:

```js
	// P1-13: the ambulance is parked on the asphalt east of the entrance plaza, nose west (its chassis
	// geometry is 2.8 x 0.24 x 1.3 before the vehicles' 1.6 scale)
	{
		id: 'ambulance parked in the lot',
		pick: { size: [2.8, 0.24, 1.3], at: [31, 23], r: 0.05 }
	}
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected: `SCENE CHECK placements FAIL: 143 placements, 1 problems`, then `ambulance parked in the lot: picked 0 meshes (expected 1)`, then `exit 1`.

- [ ] **Step 2: Vehicles at scale 1.6 with round wheels (P1-14)**

First, in `apps/web/arcade-src/sim-hub/src/props.ts`, rename every `g.add(` inside `vehicleObject` to `body.add(`. There are 21: 20 in the three models and the one in `addWheel`.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web/arcade-src/sim-hub/src && perl -pi -e 's/\bg\.add\(/body.add(/ if /^export function vehicleObject\(/ .. /^}$/' props.ts && awk '/^export function vehicleObject\(/,/^}$/' props.ts | grep -c 'body\.add('; awk '/^export function vehicleObject\(/,/^}$/' props.ts | grep -c '\bg\.add('
```

Expected: `21` then `0`. The range ends at the function's own closing `}`, which is the first line that is exactly `}` after its start, so no other function changes.

Then replace the top of the function:

```ts
export function vehicleObject(kind = 'car', color = 0x5c89bf) {
	const g = new THREE.Group();
	const wheelMat = std(0x20262b, 0.85, 0.12);
	function addWheel(x, z, r = 0.22, w = 0.18) {
		const wh = cyl(r, r, w, wheelMat, 16);
		wh.rotation.z = Math.PI / 2;
		wh.position.set(x, 0.22, z);
		body.add(wh);
	}
```

with:

```ts
export function vehicleObject(kind = 'car', color = 0x5c89bf) {
	// The models are built at about half real size, so their parts go in an inner `body` group scaled
	// 1.6 (car 3.68 x 1.73 x 1.49 m, van 4.16 x 1.98 x 1.70, ambulance 4.48 x 2.08 x 1.86; wheels r 0.35,
	// still on the ground). The returned group stays unscaled. npc-check a measures a mover's meshes in
	// that group's frame, where a scale on the group itself would cancel out of the footprint it tests.
	const g = new THREE.Group(),
		body = new THREE.Group();
	body.scale.setScalar(1.6);
	g.add(body);
	const wheelMat = std(0x20262b, 0.85, 0.12);
	function addWheel(x, z, r = 0.22, w = 0.18) {
		const wh = cyl(r, r, w, wheelMat, 16);
		// the axle runs across the vehicle (local z), so each tyre shows its round side
		wh.rotation.x = Math.PI / 2;
		wh.position.set(x, 0.22, z);
		body.add(wh);
	}
```

The function's last line, `return g;`, stays. The movers' loop speeds stay.

- [ ] **Step 3: Park the ambulance and remove its arrival cycle (P1-13)**

Delete the cycle blocks first, anchored on their text.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web/arcade-src/sim-hub/src
perl -ni -e 'print if !(/^\/\* ---- Ambulance drop-off choreography/ .. /^export function workflowState\(/) || /^export function workflowState\(/' equipment.ts
perl -ni -e 'print if !(/^export function walkSwing\(g, sec\) \{$/ .. /^const SEAT_SNAP = 1\.0,/) || /^const SEAT_SNAP = 1\.0,/' npc-behavior.ts
grep -c 'ambState\|AMB_\|crewOnGround\|ambPatient\|setupAmbulance\|updateAmbulance' equipment.ts; grep -c 'function walkSwing\|function advanceRoute\|function advancePed' npc-behavior.ts
```

Expected: `0` and `0`.
- In equipment.ts this removes the `/* ---- Ambulance drop-off choreography … */` comment through `updateAmbulance`'s closing `}` and the blank line after it. The blank line before `export function workflowState` stays.
- In npc-behavior.ts it removes `walkSwing`, `advanceRoute` and `advancePed`, up to `const SEAT_SNAP`.

In `apps/web/arcade-src/sim-hub/src/equipment.ts`, replace the imports:

```ts
import { personFigure, faceAlong, poseCharacter, setLegSwing, SOLE_Y } from './npc';
import {
	advanceRoute,
	advancePed,
	walkSwing,
	startNextQueuedMove,
	stepRise,
	beginSit,
	stepSit
} from './npc-behavior';
```

with:

```ts
import { poseCharacter, setLegSwing } from './npc';
import { startNextQueuedMove, stepRise, beginSit, stepSit } from './npc-behavior';
```

Then replace:

```ts
import { roomById, PRIMARY_PATIENTS, doors, player, roomFloors } from './main';
import { APRON_TOP } from './rooms';
```

with:

```ts
import { roomById, PRIMARY_PATIENTS, doors, player } from './main';
```

The removed names (`personFigure`, `faceAlong`, `SOLE_Y`, `advanceRoute`, `advancePed`, `walkSwing`, `roomFloors`, `APRON_TOP`) had no other use in equipment.ts.

In `apps/web/arcade-src/sim-hub/src/npc-behavior.ts`:

1. The header comment, lines 9-11. Replace:

```ts
   duplicating that state here. `JOURNEY`/`journeyActorRoom` moved to ./journey.js in task 9 and
   are imported back here. `setupAmbulance` moved to ./equipment.js in task 7 and is
   imported from there instead. `doorPoint`/`setDoorTarget`/`corridorNodesFromHub`/
```

with:

```ts
   duplicating that state here. `JOURNEY`/`journeyActorRoom` moved to ./journey.js in task 9 and
   are imported back here. `doorPoint`/`setDoorTarget`/`corridorNodesFromHub`/
```

2. In the `./npc` import, delete the line `	faceAlong,`. After step 3's deletion, `faceAlong` has no other use here.

3. Delete the line `import { setupAmbulance } from './equipment';`.

4. Replace the ambulance:

```ts
	const ambulance = vehicleObject('ambulance');
	ambulance.position.set(-42, 0, 20);
	ambulance.rotation.y = Math.atan2(1, 0) - Math.PI / 2;
	scene.add(ambulance);
	setupAmbulance(ambulance);
```

with:

```ts
	// parked on the asphalt east of the entrance plaza, nose west (the cab is at local +x): at vehicle
	// scale 1.6 it covers x 28.76..33.24, z 21.96..24.04, 0.9 m from the curb, between the stop marks at
	// x 26 and 36
	const ambulance = vehicleObject('ambulance');
	ambulance.position.set(31, 0, 23);
	ambulance.rotation.y = Math.PI;
	scene.add(ambulance);
```

In `apps/web/arcade-src/sim-hub/src/main.ts`, delete the line `	updateAmbulance,` from the `./equipment` import, and the line `	updateAmbulance(dt, sec);` from `stepSimulation`.

In `apps/web/arcade-src/sim-hub/src/state.ts`, make three deletions:
- the lines `	AMB: THREE.Object3D | null;`, `	ambUnload: THREE.Object3D | null;` and `	ambLoad: THREE.Object3D | null;` from `SimHubState`;
- the lines `	AMB: null,`, `	ambUnload: null,` and `	ambLoad: null,` from `S`;
- `import type * as THREE from 'three';` (line 9), since only those three members used it.

In `apps/web/arcade-src/sim-hub/src/rooms.ts`, replace:

```ts
// The ambulance-bay apron in front of the lobby; its top is the outdoor ground the ambulance
// crew walks on.
const APRON_Y = -0.01,
	APRON_H = 0.018;
export const APRON_TOP = APRON_Y + APRON_H / 2;
```

with:

```ts
// The light apron of the entrance plaza in front of the lobby.
const APRON_Y = -0.01,
	APRON_H = 0.018;
```

- [ ] **Step 4: Check f loses its ambulance-crew part (P1-13)**

This is one of the two check edits the spec allows. The crew is gone, so its feet are no longer sampled; no threshold changes.

In `apps/web/scripts/sim-hub-npc-check.mjs`, replace the header lines 21-22:

```js
//                (12 moments over one leg-swing cycle after the journey reset, then t = 30 s and 90 s,
//                then 8 moments over each of the ambulance crew's walks, unload and load)
```

with:

```js
//                (12 moments over one leg-swing cycle after the journey reset, then t = 30 s and 90 s)
```

In `allPeople`, delete the two lines:

```js
	add(NPC.state.ambUnload, 'ambulance crew (unload)');
	add(NPC.state.ambLoad, 'ambulance crew (load)');
```

In `checkFeet`, replace:

```js
	stepFor(60);
	sample('t=90s');
	// The ambulance crew is only visible while it walks between the bay and the lobby: wait for each
	// walk, then sample 8 moments 0.6 s apart along it (the walk takes about 5 s).
	for (const [key, name] of [
		['ambUnload', 'unload'],
		['ambLoad', 'load']
	]) {
		const crew = NPC.state[key];
		for (let i = 0; i < 30 * 90 && !(crew && crew.visible); i++) step();
		if (!(crew && crew.visible)) {
			readings++;
			worstRows.push({
				when: `ambulance ${name}`,
				id: 'crew never walked in 90 s',
				sole: NaN,
				floor: NaN,
				gap: NaN
			});
			continue;
		}
		for (let k = 0; k < 8 && crew.visible; k++) {
			if (k) stepFor(0.6);
			sample(`ambulance ${name} ${k}/8`);
		}
	}
	return {
```

with:

```js
	stepFor(60);
	sample('t=90s');
	return {
```

- [ ] **Step 5: Build and run the checks**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && grep -rn 'updateAmbulance\|setupAmbulance\|ambUnload\|ambLoad\|S\.AMB\|APRON_TOP\|walkSwing\|advanceRoute\|advancePed\|crewOnGround' arcade-src/sim-hub/src scripts
pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P1/npc-t5.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P1/npc-baseline.log") <(grep '^NPC CHECK' "$P1/npc-t5.log")
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- the grep: no output;
- the scene check: signs PASS (163), legs PASS, `SCENE CHECK placements PASS: 143 placements, 0 problems`, `exit 0`;
- the NPC check: `exit 0`. The diff shows only check f's line changing from `… at 30 moments` to `… at 14 moments`. Check a still reads `0 wall-clipping samples across 10 movers`, now with the larger footprints.
- vitest: 4 files passed;
- `check exit 0`.

If check a fails for the car or the shuttle, report the failing lines. Clearances at scale 1.6 should be:
- the car's east lane 0.56 m from the HDR suite wall (check a needs 0.2);
- the shuttle's west lane edge at z 21.81 (curb at 21.06).

Do not change the scale or the lanes without the controller.

- [ ] **Step 6: After shots**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P1/shots-p1.json" "$P1/t5.json" ambulance-parked car-side shuttle-side overview-roofs outside-spawn sign-front
node "$SHOTS" "$P1/after" - "$P1/t5.json"
```

Expected: six lines naming the PNGs. Read each next to its before twin. Check:
- `ambulance-parked`: the ambulance stands on the asphalt, nose west, clear of the curb;
- `car-side` and `shuttle-side`: real-size bodies, with round wheels seen side-on;
- `outside-spawn` and `sign-front`: no ambulance in or behind the sign;
- `overview-roofs`: the vehicles are larger, and nothing else differs.

- [ ] **Step 7: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/npc-behavior.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/main.ts arcade-src/sim-hub/src/state.ts arcade-src/sim-hub/src/rooms.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-npc-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/npc-behavior.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/main.ts arcade-src/sim-hub/src/state.ts arcade-src/sim-hub/src/rooms.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-npc-check.mjs
```

Expected: no eslint errors, and no unused imports left. If prettier changed a source file, rebuild and rerun the scene check (exit 0).

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/props.ts apps/web/arcade-src/sim-hub/src/npc-behavior.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/arcade-src/sim-hub/src/state.ts apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/scripts/sim-hub-scene-check.mjs apps/web/scripts/sim-hub-npc-check.mjs
git commit -m "fix(sim-hub): the ambulance parks in the lot (its arrival cycle and crew removed for now), vehicles at real size with round wheels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 (controller): Final checks, as-built notes, review, owner page, PR

**Files:**
- Modify: `docs/specs/2026-11-06-sim-hub-scenery-round3-design.md`: a `### Part 1 as built` subsection at the end of `## Verification`, before `## Out of scope / not changing`.
- Scratch: `$P1/after/*.png`, `$P1/final-*.log`.

- [ ] **Step 1: Every check, from a clean build**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git status --short && git log --oneline 6a2bc32..HEAD
cd apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P1/final-npc.log" 2>&1; echo "exit $?"; grep '^NPC CHECK' "$P1/final-npc.log"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P1/final-vis.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures' "$P1/final-vis.log"
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
pnpm test; echo "test exit $?"
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
pnpm exec prettier --check .
```

Expected, as in the spec's Verification:
- `git status`: clean. The log shows the five task commits.
- **Scene check:** exit 0; signs PASS (163 panels); legs PASS (20 chairs, 3 couches); placements PASS, 143.
- **NPC check:** a–m PASS:
  - a: 10 movers, with the larger vehicle footprints;
  - f: 14 moments;
  - j: 4 stand-up flows;
  - g: 7 sitters;
  - k: 114 at rest;
  - l: 74 routes;
  - m: 66 moments.
- **Visibility:** 301 poses, 0 failures.
- **vitest (sim-hub), `pnpm check`, smoke, prettier:** pass.
- **`pnpm test`:** the browser-project specs under `apps/web/src` may time out locally under load. Part 1 does not touch them, and CI is their gate. Note any local timeout in the PR body.

- [ ] **Step 2: By hand**

Run `pnpm dev` from `apps/web`, open `/arcade/sim-hub/index.html`, and press Walk. Check three things:
- Walk mode starts outside, facing both signs.
- **The glass:** walking north, it slides open as you walk in and closes behind you.
  - The panes should be fully clear before you reach them, walking or sprinting (plan-time finding 1: player radius 5.5 m, `openSeconds` 0.9).
- E-reach on staff feels as before.

- [ ] **Step 3: All after shots**

```bash
P1=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p1
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node "$SHOTS" "$P1/after" - "$P1/shots-p1.json" && ls "$P1/after" | wc -l
```

Expected: 29 PNGs, with the same names as `$P1/before`. Read each pair.

- [ ] **Step 4: As-built notes**

Add `### Part 1 as built` to the spec. It records:
- the five commits;
- the final counts from Step 1;
- what Step 2 found about the entrance, and any decision on it;
- any deviation an implementer reported, with its reason.

Commit:

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add docs/specs/2026-11-06-sim-hub-scenery-round3-design.md
git commit -m "docs(sim-hub): scenery round 3 Part 1 as-built notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Final whole-branch review, then fixes**

Review `6a2bc32..HEAD` against Part 1 of the spec with the agentmaster-review skill (or superpowers:requesting-code-review).
- Dispatch fixes one at a time, never while another dispatch is running.
- Rerun Step 1 after any fix.

- [ ] **Step 6: The owner's before/after page**

Publish a before/after artifact from `$P1/before` and `$P1/after` (29 pairs), like the earlier rounds. It has one caption per item:
- the spec section;
- what changed, in plain words;
- for the entrance, how it behaves.

- [ ] **Step 7: Push and open the PR**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git push -u origin fix/sim-hub-scenery-r3-building
gh pr create --title "fix(sim-hub): scenery round 3, Part 1 (building-wide and outside)" --body "$(cat <<'BODY_EOF'
Part 1 of the owner's 2026-11-06 scenery list (spec: docs/specs/2026-11-06-sim-hub-scenery-round3-design.md, P1-1 to P1-14).

- Status lights on the wall beside each door sign; closed doors span jamb to jamb; baseboards stop at doorways; desk monitors get a dark back; header names fit their sign.
- Hallway light strips cast no shadow; the technical hallway's north end runs straight; a solid LINAC junction carries its sign (vault 1 left, vault 2 right) and the walkway cart is gone; the lobby blades point the way you walk, their backs back to the lobby.
- The kiosk stands just inside the doors; walk mode starts outside at NPC eye height (reach unchanged); the glass entrance slides open; the light pole and plants clear the monument sign.
- The ambulance parks in the lot (its arrival cycle and crew removed for now; check f's crew part goes with them); vehicles at real size with round wheels.

Checks: scene check 143 placements PASS; NPC check a-m PASS (f 14 moments); visibility 301 poses, 0 failures; sim-hub vitest and pnpm check pass. Before/after shots: see the owner page.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY_EOF
)"
```

Expected: the PR URL.

---

## Spec coverage (self-review)

| spec section | task | pins / checks | shots |
|---|---|---|---|
| P1-1 door status lights | 1 | 10 `status light beside the … door sign` (flush) | door-sign-consult-side, door-sign-ctcontrol, door-sign-ctsim, vault1-door-signs |
| P1-2 doors and baseboards | 2 | 8 leaf/panel pins, baseboard `absent` + 2 pieces | door-consult-hall, door-physics-hall, door-ctcontrol-in, door-vault1-hall, door-hdr-hall |
| P1-3 monitor back shells | 1 | none (existing screen pins still pick one mesh) | mgr-visitor |
| P1-4 header-sign fit | 1 | none | commons-sign |
| P1-5 light-strip shadows | 3 | none | hall-north-end |
| P1-6 technical hallway end | 3 | roof rows merged, end wall edited, right wall x 2 + `absent` x 3 | hall-north-end, hall-north-near, hall-tech-north, overview-roofs |
| P1-7 LINAC junction | 3 | block, sign (flush), cart `absent` | walkway-junction, walkway-junction-near, walkway-north |
| P1-8 lobby blades | 3 | none | blade-clinical, blade-patient, blade-clinical-back |
| P1-9 kiosk | 4 | kiosk pin edited in place | lobby-kiosk |
| P1-10 walk start and eye height | 4 | visibility: walk poses at 1.87, 4 outside-start poses (301) | outside-spawn |
| P1-11 entrance sliding glass | 2 | 2 pane pins; sensor probe; by hand in Task 6 | lobby-entrance |
| P1-12 light pole and sign plants | 4 | pole + `absent`, 4 plant pins | sign-front, sign-top |
| P1-13 ambulance parked | 5 | ambulance pin; check f crew part removed (14 moments) | ambulance-parked |
| P1-14 vehicles scaled, wheels fixed | 5 | check a with the larger footprints | car-side, shuttle-side, overview-roofs |
| Global constraints, Verification | all, 6 | 143 placements; a–m; 301 poses; vitest; `pnpm check` | all 29 |
