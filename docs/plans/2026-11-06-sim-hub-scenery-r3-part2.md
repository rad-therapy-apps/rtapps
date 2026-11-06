# sim-hub scenery round 3, Part 2 (the rooms) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The room re-layouts from the owner's 2026-11-06 list:
- consult: the desk, screen and chair on the left (west) wall, the cabinet beside the desk, the IV poles parked, the brochure rack on the wall;
- patient care: one supply wall on the left (east) wall, the doorway clear;
- education: the desk by the TV wall with the navigator seated behind it, two visitor chairs, the patient and Mia seated, the stray tree gone;
- physics: the plan-QA desk in the far corner;
- radiobiology: the bench row turned across the room;
- dosimetry: the cabinets flush on the wall;
- manager: the screen turned to the visitor chairs, the two people facing each other;
- CT control: the console group against the west wall, the supply cart on the wall;
- CT room: the gantry at 1.35×, storage, sink and shelf on the walls, the IV pole off the doorway, the laser warning outside the door.

**Architecture:** Geometry changes go in the builders: `rooms.ts` (furnish cases, `addCirculationProps`, `addClinicalWallPolish`, the exterior tree list), `props.ts` (`ctScanner`, `immobilizationStorage`) and `equipment.ts` (the CT live console, three `EQUIPMENT_SPECS` anchors).
- People move only through NPC data: cast offsets and headings in `npc.ts`, `ROOM_GRAPHS` and `ARRIVAL_SPOTS` in `room-routes.ts`, journey finals and one camera branch in `journey.ts`, the ctRunner loop in `npc-behavior.ts`.
- `apps/web/scripts/sim-hub-scene-check.mjs` gets a `PLACEMENTS` entry for every moved item. Each task starts by adding its entries and watching them fail (RED).
- The NPC check a–m stays green with its thresholds and floors unchanged; check j is not edited.

**Tech Stack:** three.js 0.160.0 (pinned), TypeScript, Vite (`pnpm build:arcade`), Node dev scripts, vitest.

**Spec:** `docs/specs/2026-11-06-sim-hub-scenery-round3-design.md`, "Part 2: the rooms" (R3-1 to R3-9), "Global constraints" and the Part 2 items of "Verification". It is the single source of requirements.
- "### Part 1 as built" is the starting state: 147 placements; walk start (4.2, 20.4) at eye 1.87, reach from 1.65; ceiling slabs 0.04 thick, flush with the wall tops; status lights on the walls; doors jamb to jamb, baseboards cut at doorways; visibility at 301 poses.
- Decisions: `.superpowers/sdd/scenery3-decisions.md`. Code-level detail: `.superpowers/sdd/scenery3-inv-{A,C,D}.md`; prototypes in the scratchpad under `scenery3/A` and `scenery3/C/proto.diff`.
- The section "Line anchors re-measured at 22bd2a8" maps every spec anchor to its line at `22bd2a8` (main with Part 1 merged).
- A task's line numbers are as at the start of that task, counted from the edits the earlier tasks make. `≈` marks a line an earlier task in this plan shifts. The quoted text is always the anchor: find the line by it.

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

  For Part 2 the "before" bundle is the pristine build of `22bd2a8` (Task 1). The shots use the GPU helper (below), not the repo tool.

### Repo and process rules

- **Branch:** `fix/sim-hub-scenery-r3-rooms` (from `22bd2a8`).
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
  - **visibility check:** `ANGLE=metal node scripts/sim-hub-visibility-check.mjs`. Use Metal: the machine is loaded, and SwiftShader page loads time out. It runs in every task, because every task moves furniture seen through a door or window (Part 1 found two culling problems only when it ran).
  - **cull groups:** `node scripts/sim-hub-scene-check.mjs --only placements --dump "$P2/dump-tN.json" >/dev/null && node "$P2/cull-count.mjs" "$P2/dump-tN.json"` (Task 1 writes the script). It prints how many meshes the culling pass took into each Part 2 room's cull group. A furnish group with one item outside its room's rect (inset 0.05) is never taken in, and its room's count drops by the whole group. The visibility check cannot see that (an unculled room is safe, only slower).
  - **shots:**
    - The repo tool `node scripts/sim-hub-shots.mjs <outDir> [shot]` uses SwiftShader and may time out under load.
    - Use the GPU helper instead: `node $SHOTS <outDir> - <shots.json>`, where `-` means every shot in the file.
    - If a page load times out, retry once. If it times out again, stop and report.
  - **sim-hub specs:** `pnpm exec vitest run --project server arcade-src/sim-hub/src` (4 files, 77 tests; `room-routes.spec.ts` runs its valid-edges, connected and farthest-path tests over every `ROOM_GRAPHS` entry, so the new physics, education and ctcontrol graphs are covered with no new test).
- **Local `pnpm test`:**
  - The browser-project specs under `apps/web/src` time out when the machine is loaded. Part 2 does not touch `apps/web/src`, and CI is the gate for those specs.
  - The sim-hub's own vitest specs must pass locally.
- **`pnpm check`** must exit 0.
- **Owner shots:**
  - Task 1 takes the before shots of every Part 2 item into `$P2/before`, on the pristine bundle.
  - Each task takes its own after shots into `$P2/after`.
  - The controller retakes all 30 at the end (Task 6).
- **Shell variables:** shell state does not persist between commands, so every command block sets the ones it uses:

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
```

- **A subset of the shots:** `$P2/shots-p2.json` holds all 30 Part 2 shots (Task 1). To take a few of them, filter the file by name, then run the helper on the subset:

```bash
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P2/shots-p2.json" "$P2/tN.json" name1 name2
node "$SHOTS" "$P2/after" - "$P2/tN.json"
```

- **The NPC check's expected summaries.** Task 1 saves the baseline to `$P2/npc-baseline.log`. At `22bd2a8` it reads (Part 1's final run):

```
NPC CHECK a PASS: 0 wall-clipping samples across 10 movers
NPC CHECK b PASS: no pair closer than 0.5 m in 20 simulated minutes (mover-mover, mover-cast, mover-journey)
NPC CHECK c PASS: no overlap, max step 0.098 m (sit-down 0.077 m), onComplete [1,2,3], seated on the lobby chair at (4.40, 3.34)
NPC CHECK d PASS: all 11 walkers stayed within one frame step after a 10 s hidden gap at 5 phases
NPC CHECK e PASS: holds for 0.7 m ahead (frozen, limbs at rest), walks on at exact pace, releases a standing blocker after 8 s, ignores behind, 1.2 m and 70 deg, yields only to lower-index movers
NPC CHECK f PASS: every standing or walking sole within 0.03 m of the floor at 14 moments
NPC CHECK g PASS: 7 sitters on seat anchors: within 0.3 m, pelvis within 0.02 m of the top, facing within 20 deg (61 anchors); seat facing: none of 55 seats faces a wall within 3.0 m, except 5 across a work surface standing against that wall; exchange facing: 5 seated patients face their partner within 60 deg; pickup facing: in 2 lobby pickups the seated patient faces the therapist within 60 deg, the therapist clear of furniture; handoff seating: 3 handoffs end seated on their chair or leave a seated patient seated
NPC CHECK h PASS: 6 lying patients rest on their exam table, CT table, vault couch carbon insert (lowest point, torso and pelvis within 0.02 m of the top, at most 0.07 m past an edge), also with the CT couch slid 0, 1, 2, 3.15 m
NPC CHECK i PASS: 1 wheelchair occupants seated, pelvis within 0.02 m of the chair's seat anchor top
NPC CHECK j PASS: 4 stand-up flows keep the leg column (r 0.15 m, soles to knees) out of furniture for the first 30 frames
NPC CHECK k PASS: all 114 people at rest keep at least 0.05 m from furniture: 40 after the journey reset, 59 at the end of a hand-over or journey move, 15 at the end of hand-overs started together; walls: the 0.2 m circle round every root is clear of the wall colliders
NPC CHECK l PASS: every frame of 21 hand-overs alone, 15 together and 38 journey moves keeps the body within 0.02 m of furniture; walls: the 0.2 m circle round the root stays clear of the wall colliders on every frame; mover loops: the 0.2 m ring of 6 walkers stays within 0.02 m of furniture
NPC CHECK m PASS: over 66 moments (after the journey reset, 21 hand-over ends alone, 6 rooms' hand-overs started together, 38 journey-move ends): people at rest at least 0.5 m apart, one sitter per seat anchor, nobody standing within 0.3 m of an occupied one
```

  Each task diffs its `NPC CHECK` lines against the previous task's log. The only expected changes are, in the g line:

  | after task | g: sitters | g: "except N across a work surface" | g: "N seated patients face their partner" | other lines |
  |---|---|---|---|---|
  | baseline | 7 | 5 | 5 | as above |
  | 1 (consult chair faces the west wall across its desk) | 7 | 6 | 5 | unchanged |
  | 2 (the navigator seated) | 8 | 6 | 6 | c may read `max step 0.097 m` (A's prototype); any other change: stop and report |
  | 3 | 8 | 6 | 6 | unchanged |
  | 4 (the three CT control chairs face the west wall across the console) | 8 | 9 | 6 | unchanged |
  | 5 | 8 | 9 | 6 | unchanged |

  "Seated patients" is the check's own label: the sub-check counts every seated member of an exchange, and the sixth is the seated navigator.

  The `info:` lines (closest routes to furniture, mover-loop rings, furniture mesh count) change as furniture moves. They are information, not failures; each task records the ones it is told to read.

- **The cull-group counts** (`cull-count.mjs`, from the scene check's `--dump`). At `22bd2a8`: consult 75, patientcare 55, education 61, physics 25, radbio 23, dosimetry 77, manager 45, ctcontrol 124, ctsim 150. Expected changes:
  - Task 1: patientcare 64 (the counter is a 10-mesh `cabinetBank`, the old block 1 mesh);
  - Task 2: education 57 (the tree's trunk and 3 crowns go);
  - Task 5: ctsim 149 (the laser plaque leaves the room for `scene`).

  Every other count stays as it is.

## Plan-time findings for the controller

Each needs a decision unless marked "information". The plan text follows the recommendation where a check would otherwise fail; elsewhere it follows the spec and gives the alternative ready to paste.

**Controller decisions (2026-11-06):**
- Finding 1 is accepted. Task 4 Step 6 applies the turned-in return leg and the speed constant `0.011124`.
- Findings 3, 4 and 5 are accepted as already written into the plan (the `extent` test, `minY: 2.78`, the 9 extra pins, final count 188).
- Finding 6 takes the alternative: `room.z - 7.51`, with the sink pin's `at` at [48.75, -18.87], so the dispenser sits 1 cm inside the cull inset instead of on it.

1. **The ctRunner's new loop walks through the CT control room-inspect camera (R3-8).**
   - The spec says `roomInspectPose` (34.7, 1.82, -6.1) (interact.ts:1080) is "not affected". Its position is not, but the spec's return leg (34.8, -7.0) → (34.4, -5.9) passes 0.197 m from it (measured on the real Catmull-Rom curve, tension 0.12). In "Inspect room" for CT control the runner walks through the camera once per 92 s loop.
   - **Recommendation:** keep the spec's two legs and turn the return leg west earlier. In Task 4 Step 6, replace the last four in-room points `[34.8, 0, -7.0], [34.4, 0, -5.9], [33.4, 0, -5.2], [32.4, 0, -4.95]` with `[34.6, 0, -7.5], [34.0, 0, -6.9], [33.4, 0, -6.3], [32.4, 0, -5.25]`, and the speed constant `0.010895` with `0.011124`.
     - Measured the same way: loop 38.952 m (0.433 m/s kept), 1.061 m from the camera, 1.114 m off the window wall, 1.770 m off the back wall, 1.567 m from the door-wall cabinet, 1.576 m off the door wall, 1.651 m from the therapist, 2.055 m from the spots and finals.
     - Update the comment's "0.8 m from the door-wall cabinet" to 1.57 m and "39.77 m" to 38.95 m.
   - The plan as written uses the spec's loop. Task 4's sweep step prints the camera distance either way.
2. **R3-8's NPC data was never run through the NPC check (information, risk).** D mocked CT control visually, with the ctRunner hidden; A and C ran their rooms through the full check, D did not. The spec's CT control expectations (g 9 seats, a, b, e, k, l, m) are reasoned from the Δx -2.90 translation, not measured. Task 4 runs the full check and says what to change, in NPC data only, if anything fails.
3. **The radiobiology bench pins cannot go RED or see the turn (R3-5).** The middle bench keeps its centre and size, so `radbio bench 0 across the room` picks today's unturned bench and passes. None of the three pins tests the rotation, so a bench left unturned at a new centre would pass too.
   - **Recommendation (in the plan, Task 3):** add a placements test `extent: [x, z]`, the world box's size along x and z within 0.01, to `sim-hub-scene-check.mjs` (5 lines plus a header line). Give the three bench pins `extent: [0.7, 1.6]`. It adds a test kind to the scene check and loosens nothing.
   - Alternative, no tool change: a `flush` against a made-up face, e.g. `flush: { axis: 'z', face: -31.8, side: 'min' }` for the middle bench. It works, but its message says "wall face" where there is none.
4. **The CT speaker pin's RED depends on rounding (R3-9).** The pick's `y: 2.95` is exactly 0.1 from today's speaker at 2.85, the edge of the pick's ±0.1 window, and the pin has no other test. Whether the unmoved speaker is picked then depends on floating-point noise.
   - **Recommendation (in the plan, Task 5):** add `minY: 2.78` (the raised box's bottom). The pin then fails at RED whichever way the pick goes.
5. **Moved or resized items with no pin in their section.** Global constraints say "Every moved item has a new or updated `PLACEMENTS` entry". The section lists leave out:
   - the three education chairs (R3-3);
   - the two outer radbio microscopes (R3-5);
   - the CT control backing board's accent strip (R3-8);
   - the CT room stool (R3-9);
   - the gantry's bore glow (R = 0.6075) and its 2.1 m base (R3-9). The base hides the sunk ring foot, and the bore sets the couch clearance.
   - **Recommendation (in the plan):** pin all 9, each RED first. The final count is then 188. Without them it is 179; the running counts would be 158, 160, 166, 169, 179.
6. **The CT sink's soap dispenser sits exactly on the CT room's cull inset (R3-9, information).**
   - At `sinkStation(g, room.x + 4.75, room.z - 7.52, 0)` the soap dispenser's back is at z -18.95, the room rect's inset edge (`visibility.ts` `INTERIOR_INSET` 0.05). It passes `groupRoomContents`' `>=` by exact float equality.
   - If it tipped over, the whole CT room's furniture would stop culling: a silent performance loss, not a visibility failure.
   - **Recommendation:** keep the spec's -7.52; Task 5's cull-count step (ctsim 149) catches it. The alternative is `room.z - 7.51`: splash 0.015 m off the wall (still flush), dispenser 1 cm inside the inset, and the sink pin's `at` becomes [48.75, -18.87].
7. **Spec text that does not match the code (information; the plan uses the measured values):**
   - R3-8 says "rename the ids that say '29.725..30.875'". No id says it; only the R8 block comment (sim-hub-scene-check.mjs:180) does, and the plan updates that comment.
   - R3-8's cart: "top is x 27.086..27.444 … z -12.59..-12.21". The top (0.3872 × 0.5456 at rot π/2) spans x 27.086..27.474 and z -12.673..-12.127. It is 0.53 m from the desk end, and the handle is 0.49 m from it. The flush gap is 0.006, as stated.
   - R3-1's IV pole pin is one bullet for two meshes, so it is two entries: 7 consult pins, not 6.
   - Verification's Part 2 shot list leaves out `ctcontrol-backwall`, which R3-8 lists. The plan shoots it, so there are 30 shots.
   - R3-3's "6 seated patients face their partner" is the check's label. The sixth seated member is the navigator.
   - Check c may change its max-step figure after R3-3: A's prototype read 0.097 m against 0.098. The plan allows that one change.
8. **Line anchors (information):** Part 1 moved most anchors. The table below re-measures every one at `22bd2a8`; every quoted text was found. Unchanged: `room-routes.ts`, `main.ts`, `sim-hub-shots.mjs:69` and the `rooms.ts` `addCirculationProps` lines.

## Line anchors re-measured at 22bd2a8

Paths are relative to `apps/web/arcade-src/sim-hub/src/` unless given; scripts are in `apps/web/scripts/`.

| spec anchor | at 22bd2a8 | anchor text |
|---|---|---|
| **R3-1** props.ts:143 `ivPoleObject` | props.ts:143 | `export function ivPoleObject(scale = 1) {` |
| props.ts:631 `cabinetBank` | props.ts:662 | `export function cabinetBank(g, x, z, w = 2.0, h = 1.8, d = 0.48, rot = 0, color = 0xdfe5e8) {` |
| props.ts:437 `brochureRack` | props.ts:450 | `export function brochureRack(g, x, z, rot = 0) {` |
| rooms.ts:1047-1058 consult case | rooms.ts:1104-1115 | `case 'consult':` … `break;` |
| :1049 desk / :1050 monitor / :1051 chair / :1052 rack | rooms.ts:1106 / 1107 / 1108 / 1109 | `desk(g, room.x - 2.5, room.z - 1.8, 1.8, 0.7);` / `monitor(g, room.x - 2.5, 1.35, room.z - 2.0);` / `chair(g, room.x + 2.3, room.z - 1.6);` / `brochureRack(g, room.x + 4.0, room.z - 2.8, Math.PI);` |
| :1054-1056 pole A / :1057 cabinet | rooms.ts:1111-1113 / 1114 | `const iv = ivPoleObject(0.88);` / `cabinetBank(g, room.x + 3.2, room.z - 2.6, 1.5, 1.45, 0.42, Math.PI, 0xe4eaed);` |
| rooms.ts:463-465 pole B | rooms.ts:463-465 | `iv2.position.set(-18.9, 0, -4.8);` |
| npc.ts:597-608 oncologist | npc.ts:594-605 | `place(` `'consult',` `'Radiation Oncologist',` |
| room-routes.ts:197 node 2 | room-routes.ts:197 | `[-19.9, -4.6], // 2 -x of the IV pole at (-18.9, -4.8)` |
| **R3-2** props.ts:177 `medCartObject` | props.ts:177 | `export function medCartObject(scale = 1, color = 0x7da9c8) {` |
| rooms.ts:1081 white block | rooms.ts:1138 | `add(g, box(2.2, 0.95, 0.55, MAT.white, room.x, 0.55, room.z - 3));` |
| rooms.ts:1082-1084 cart mc | rooms.ts:1140-1142 | `const mc = medCartObject(0.92, 0x7eaec1);` `mc.position.set(room.x + 4.6, 0, room.z - 2.9);` |
| rooms.ts:451-454 cart1 | rooms.ts:451-454 | `cart1.position.set(-28.0, 0, 4.4);` `cart1.rotation.y = Math.PI;` |
| room-routes.ts:259-260 nodes 3, 4 | room-routes.ts:259-260 (comment 252-253) | `[-29.0, 3.7], // 3 inside the door's -x half, clear of the cart` / `[-30.0, 6.5], // 4 -x of the bed` |
| **R3-3** equipment.ts:278 education board | equipment.ts:269 | `createWorkflowDisplay('educationState', -42, 2.25, -11.82, 0, 'PATIENT EDUCATION', 2.65, 1.38);` |
| rooms.ts:1067-1077 education case (1068-1075 replaced) | rooms.ts:1124-1134 (1125-1132 replaced) | `desk(g, room.x, room.z + 1.3, 3.8, 1.1);` … `monitor(g, room.x, 1.4, room.z + 1.55, Math.PI, 0.8, 0.48);` |
| npc.ts:622-634 navigator and patient | npc.ts:619-631 | `place(` `'education',` `'Patient Navigator',` … `sitPatient('education', 'Reviewing the care pathway and education materials.', 1.1, -0.2, -0.4);` |
| rooms.ts:980 tree | rooms.ts:1035 | `[-45, -8, 0.9],` |
| npc-behavior.ts:145-148 'gesture' | npc-behavior.ts:142-145 | `} else if (d.mode === 'gesture') {` |
| npc.ts:15 `seatActor` import | npc.ts:15 | `import { registerDutyActor, registerNpcExchange, seatActor } from './npc-behavior';` |
| room-routes.ts:231-251 education graph | room-routes.ts:231-251 (comment 228-230) | `education: {` |
| journey.ts:1896 Mia's final | journey.ts:1897 | `new THREE.Vector3(-40.9, 0, -5.4),` |
| journey.ts:1925 `cameraOptions` | journey.ts:1926 | `cameraOptions: { distance: 3.5, side: 1.25 }` |
| journey.ts:2071-2078 navigator to ctsim | journey.ts:2073-2080 | `moveJourneyActor(` `JOURNEY.navigator,` `'education',` `'ctsim',` `new THREE.Vector3(38.3, 0, -4.7),` |
| main.ts:198 hand-over | main.ts:198-207 | `label: 'Proceed to CT Simulation',` (line 200) |
| sim-hub-scene-check.mjs:116-120 | sim-hub-scene-check.mjs:115-120 | `id: 'education desk screen',` |
| props.ts:495 `tree()` | props.ts:513 | `export function tree(x, z, s = 1) {` |
| sim-hub-shots.mjs:69 | sim-hub-shots.mjs:69 | `{ name: 'education-monitor', eye: [-42.0, 1.8, -10.4], look: [-42.0, 1.2, -5.95] },` |
| **R3-4** props.ts:513 `desk()` | props.ts:531 | `export function desk(g, x, z, w = 2.2, d = 0.75, rot = 0) {` |
| equipment.ts:1445 / 1447-1448 `physics_planqa` | equipment.ts:1344 / 1346-1347 | `id: 'physics_planqa',` / `dx: -2.3,` `dz: -2.2,` |
| rooms.ts:1100 physics desk | rooms.ts:1157 | `desk(g, room.x - 2.3, room.z - 2.2, 2, 0.75);` |
| npc.ts:665-667 physicist | npc.ts:662-664 | `-2.2,` `-1.3,` `0.3,` (in `place(` `'physics',`) |
| npc.ts:867 Jordan Price | npc.ts:864 | `-1.2,` (in `secondary(` `'physics',` `'Jordan Price',`) |
| room-routes.ts:50-53 spots | room-routes.ts:50-54 | `physics: [` `{ x: 6.4, z: -17.2, facing: -2.66 },` |
| room-routes.ts:280-286 graph | room-routes.ts:279-286 | `// door to the open floor; the desk stays clear` `physics: {` |
| journey.ts:787 `journeyFocusActors` | journey.ts:764 (function), 787 (last branch), 788 (default) | `else if (roomId === 'ctcontrol') pos = target.clone().add(new THREE.Vector3(2.8, 0.4, -2.2));` / `else pos = target.clone().add(new THREE.Vector3(3.0, 0.5, 2.0));` |
| **R3-5** rooms.ts:1102-1108 radbio | rooms.ts:1159-1166 | `desk(g, room.x + i * 2.2, room.z, 1.6, 0.7);` (1161), `mic.position.set(room.x + i * 2.2, 1.2, room.z);` (1163) |
| npc.ts:673-685 / 677-679 educator | npc.ts:669-680 / 674-676 | `0,` `-1.4,` `0,` (in `place(` `'radbio',`) |
| npc.ts:872-884 / 878-880 Leah | npc.ts:869-881 / 875-877 | `2.0,` `1.0,` `-1.1,` (in `secondary(` `'radbio',` `'Leah Grant',`) |
| **R3-6** rooms.ts:1155-1156 | rooms.ts:1212-1213 | `cabinetBank(g, room.x - 5.2, room.z + 3.7, 1.6, 1.6, 0.45, 0, 0xe1e7ea);` and `room.x + 5.2` |
| **R3-7** rooms.ts:1162 monitor / 1159-1160 comment | rooms.ts:1219 / 1216-1217 | `monitor(g, room.x, 1.435, room.z + 0.75, Math.PI, 1.0, 0.55);` / `// manager on its door side facing them; the screen faces the manager` |
| npc.ts:740 manager ry | npc.ts:737 | `0,` (in `place(` `'manager',`) |
| npc.ts:945 Chris Evans ry | npc.ts:942 | `0.65,` |
| sim-hub-scene-check.mjs:175-179 | sim-hub-scene-check.mjs:174-179 (comment 168) | `id: 'manager screen on the desk',` |
| **R3-8** rooms.ts:1168 desk / 1169 comment / 1170-1171 chairs | rooms.ts:1225 / 1226 / 1227-1228 | `desk(g, room.x - 1.2, room.z - 0.2, 4.8, 1.15, Math.PI / 2);` / `… from the desk edge (x 30.875)` / `taskChair(g, room.x + 0.15, room.z + i * 1.15, -Math.PI / 2, 0x4c6776);` |
| rooms.ts:1188-1196 / 1189 cart | rooms.ts:1244-1252 / 1246 | `ccart.position.set(room.x + 0.8, 0, room.z - 3.25);` |
| rooms.ts:1718-1721 board, accent | rooms.ts:1787-1790 | `const ctPlate = box(0.08, 2.35, 4.2, dark, 30.02, 1.75, -9);` / `const ctAccent = box(0.035, 0.07, 3.8, glow, 30.08, 2.92, -9);` |
| equipment.ts:548 screens / 546-547 comment | equipment.ts:539 / 537-538 | `const mx = r.x - 1.35;` / `// (x 29.98..30.06), facing the operators (+x) …` |
| equipment.ts:619 keyboard | equipment.ts:610 | `consoleKeyboard(g, r.x - 0.9, r.z + 0.65, rot);` |
| equipment.ts:1306-1310 / 1308 `ct_console` | equipment.ts:1204-1209 / 1207 | `id: 'ct_console',` / `dx: -1.2,` |
| room-routes.ts:344-360 graph | room-routes.ts:344-360 (comment 342-343) | `ctcontrol: {` |
| room-routes.ts:62-66 spots | room-routes.ts:61-66 | `{ x: 32.75, z: -7.25, facing: -1.57 },` |
| npc.ts:750 therapist dx | npc.ts:747 | `1.2,` (in `place(` `'ctcontrol',`) |
| npc.ts:955 Avery dx | npc.ts:953 | `-0.4,` (in `secondary(` `'ctcontrol',` `'Avery Woods',`) |
| journey.ts:2138 / 2146 finals | journey.ts:2139 / 2147 | `new THREE.Vector3(32.3, 0, -7.2),` / `new THREE.Vector3(32.3, 0, -8.45),` |
| npc-behavior.ts:620-668 ctRunner / 623-627 comment | npc-behavior.ts:644-700 / 653-657 | points `[29.9, 0, -5.3],` (678) through `[31, 0, -5.5]` (693); speed `0.011397,` (695) |
| interact.ts `roomInspectPose` (34.7, 1.82, -6.1) | interact.ts:1080 | `if (r.id === 'ctcontrol') inside = new THREE.Vector3(r.x + 3.2, 1.82, r.z + 2.9);` |
| journey focus offset (2.8, 0.4, -2.2) | journey.ts:787 | as above |
| sim-hub-scene-check.mjs:180-236 R8 block | sim-hub-scene-check.mjs:180-235 | `// R8: CT control: keyboard and mouse on the console desk (x 29.725..30.875); chairs 0.5 m from` |
| **R3-9** props.ts:1264-1290 `ctScanner` | props.ts:1295-1322 | `export function ctScanner(g, room: Room) {` |
| props.ts:1268 / 1270 / 1274 / 1280 / 1265-1267 | props.ts:1299 / 1301 / 1305 / 1311 / 1296-1298 | `TorusGeometry(0.9375, 0.375, 18, 54)` / `ring.position.set(room.x, 1.25, room.z + 1.5);` / `TorusGeometry(0.5625, 0.02, 14, 48)` / `box(1.0, 0.35, 2.0, MAT.white, …)` / `// a big-bore CT gantry at 1.25x real size …` |
| rooms.ts:460-462 iv1 | rooms.ts:460-462 | `iv1.position.set(43.5, 0, -5.6);` |
| rooms.ts:1200-1205 wheelchair | rooms.ts:1256-1261 | `simwc.position.set(room.x + 5.4, 0, room.z + 5.0);` |
| rooms.ts:1215-1216 cabinets | rooms.ts:1272-1273 | `cabinetBank(g, room.x + 6.2, room.z - 5.2, 2.2, 1.8, 0.5, Math.PI, 0xe2e8eb);` |
| rooms.ts:1217 immobilization | rooms.ts:1274 | `immobilizationStorage(g, room.x + 6.05, room.z - 0.15, Math.PI / 2, 'CT IMMOBILIZATION');` |
| rooms.ts:1218 sink | rooms.ts:1275 | `sinkStation(g, room.x + 4.6, room.z - 6.55, 0);` |
| props.ts:872-910 / 905-907 `immobilizationStorage` | props.ts:903-943 / 934-942 | `export function immobilizationStorage(g, x, z, rot = 0, label = 'IMMOBILIZATION') {` / `z + Math.cos(rot) * 0.28,` |
| equipment.ts:1275-1279 `ct_immobilization` | equipment.ts:1173-1178 (dx 1176, dz 1177) | `dx: 6.05,` `dz: -0.15,` |
| rooms.ts:1248 speaker | rooms.ts:1305 | `wallSpeaker(g, room.x + 7.78, 2.85, room.z - 2.2, -Math.PI / 2);` |
| rooms.ts:1249-1257 plaque | rooms.ts:1306-1314 | `warningPlaque(` `g,` `room.x + 7.77,` |
| rooms.ts:1258 shelf / 1259 stool | rooms.ts:1315 / 1316 | `wallShelf(g, room.x + 5.3, 1.35, room.z - 1.4, 1.2, Math.PI);` / `stool(g, room.x + 4.9, room.z - 1.5, 0x688596);` |
| rooms.ts:1731 teal bar | rooms.ts:1800 | `const l = box(7.2, 0.04, 0.08, glow, ct.x, 3.15, ct.z + 5.8);` |
| room-routes.ts:366 node 1 | room-routes.ts:366 | `[43.4, -4.0], // 1 inside the door, clear of the IV pole at (43.5, -5.6)` |
| sim-hub-scene-check.mjs:240-245 gantry pin | sim-hub-scene-check.mjs:240-245 (comment 236-239) | `id: 'CT gantry 1.25x real size',` |
| **Placements end** | sim-hub-scene-check.mjs:599-603 | the last entry `'technical hallway floor, z -66..-56.5 stops at the x 2 wall'`, then `];` |
| **Shots end** | sim-hub-shots.mjs:144-152 | the `shuttle-side` entry, then `];` |

## Files

| file (under `apps/web/`) | tasks | what changes |
|---|---|---|
| `arcade-src/sim-hub/src/rooms.ts` | 1–5 | furnish cases consult, patientcare, education, physics, radbio, dosimetry, manager, ctcontrol, ctsim; `addCirculationProps` (cart1, iv1, iv2); the exterior tree list; `addClinicalWallPolish` (the CT console board and accent, the CT room teal bar) |
| `arcade-src/sim-hub/src/npc.ts` | 2, 3, 4 | the seated navigator and the education patient; physicist, Jordan Price, radbio educator, Leah Grant; manager, Chris Evans, CT simulation therapist, Avery Woods |
| `arcade-src/sim-hub/src/room-routes.ts` | 1–5 | consult and ctsim node comments; patientcare nodes 3, 4; education graph and spot facings; physics spots and graph; ctcontrol spots and graph |
| `arcade-src/sim-hub/src/journey.ts` | 2, 3, 4 | Mia's education final (seated); the physics journey camera; the two CT control finals |
| `arcade-src/sim-hub/src/equipment.ts` | 3, 4, 5 | `physics_planqa`; the CT live console's screens, keyboard and comment; `ct_console`; `ct_immobilization` |
| `arcade-src/sim-hub/src/npc-behavior.ts` | 4 | the ctRunner's in-room loop and speed |
| `arcade-src/sim-hub/src/props.ts` | 5 | `ctScanner` at 1.35×; `immobilizationStorage` sign offset |
| `scripts/sim-hub-scene-check.mjs` | 1–5 | `PLACEMENTS`; the `extent` test (Task 3) |
| `scripts/sim-hub-shots.mjs` | 1 | 19 new Part 2 shots; the `education-monitor` pose |

## Task order and dependencies

- **Task 1** comes first. It builds the pristine bundle, records the NPC baseline and the cull-group counts, takes every before shot, and writes `$P2/shots-p2.json` and `$P2/cull-count.mjs`, which every later task uses. Then consult and patient care.
- **Tasks 2–5** each touch `rooms.ts`, `room-routes.ts` and the scene check, so they run one after another in this order. Their contents are independent, but the expected NPC g line builds up: the consult chair (Task 1) makes "except 6", and the CT control chairs (Task 4) make "except 9".
- **Task 4** puts the manager (R3-7, four values and a pin) with CT control (R3-8), the two clinical-operations rooms.
- **Task 6** (controller) runs every check from a clean build, retakes all 30 after shots, writes the as-built notes, and finishes the branch.
- **`PLACEMENTS` count** (finding 5 adds 9 pins; the last column is without them):

  | after task | new or edited entries | count | spec lists only |
  |---|---|---|---|
  | baseline | | 147 | 147 |
  | 1 | +7 consult, +4 patient care | 158 | 158 |
  | 2 | +2 education, +3 chairs; 1 edited | 163 | 160 |
  | 3 | +1 physics, +3 radbio benches, +2 microscopes, +2 dosimetry | 171 | 166 |
  | 4 | manager 1 edited; +3 CT control, +1 accent; 9 edited | 175 | 169 |
  | 5 | +10 CT room, +stool, +bore, +base; 1 edited | 188 | 179 |

- **Each task appends its `PLACEMENTS` entries at the end of the array:** just above the `];` that is followed by `function setupError(msg) {`.
  - Add a comma after what was the last entry.
  - Prettier then formats the new entries.

---

### Task 1: Baseline, Part 2 shots, the consult room (R3-1) and the patient care room (R3-2)

**Files:**
- Modify: `apps/web/scripts/sim-hub-shots.mjs:69` (the `education-monitor` pose) and `:144-152` (append 19 shots after `shuttle-side`).
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs:599-603`. Append 11 pins.
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`:
  - `addCirculationProps`, lines 451-454 (`cart1`) and 463-465 (`iv2`);
  - `case 'consult'`, lines 1106-1114;
  - `case 'patientcare'`, lines 1138-1142.
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts:197` (consult node 2 comment) and `:252-262` (patientcare graph).
- Scratch: `$P2/shots-p2.json`, `$P2/before/*.png`, `$P2/npc-baseline.log`, `$P2/cull-count.mjs`, `$P2/dump-base.json`, `$P2/npc-t1.log`, `$P2/vis-t1.log`, `$P2/dump-t1.json`, `$P2/t1.json`.

**Interfaces:**
- Produces:
  - `$P2/shots-p2.json`: the 30 Part 2 shots, an array of `{ name, eye, look, ceilings? }` or `{ name, subject, cam, lookY }`. Every later task filters it.
  - `$P2/npc-baseline.log`, which Task 1 diffs against, and `$P2/npc-t1.log`, which Task 2 diffs against.
  - `$P2/cull-count.mjs <dump.json>`: prints `<room>: <n> culled` for the nine Part 2 rooms.
  - 19 new entries and one changed pose in `SHOTS`.

- [ ] **Step 1: Baseline on a clean, pristine build**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git status --short && git branch --show-current && git diff --stat 22bd2a8 HEAD -- apps/web
```

Expected:
- no status output (the controller has committed this plan);
- `fix/sim-hub-scenery-r3-rooms`;
- no diff output: the sources are `22bd2a8`'s.

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
mkdir -p "$P2/before" "$P2/after"
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs --dump "$P2/dump-base.json"; echo "exit $?"
```

Expected:
- `SCENE CHECK signs PASS: 163 canvas panels against 136 wall colliders and 24 lintels, 0 into a wall by more than 0.01 m`;
- `SCENE CHECK legs PASS: 20 chairs and 3 couches, 0 problems`;
- `SCENE CHECK placements PASS: 147 placements, 0 problems`;
- a `SCENE CHECK dump:` line;
- `exit 0`.

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-npc-check.mjs > "$P2/npc-baseline.log" 2>&1; echo "exit $?"; grep '^NPC CHECK' "$P2/npc-baseline.log"
```

Expected: `exit 0` and the 13 lines given under "The NPC check's expected summaries". If any differs, stop and report it before changing anything.

- [ ] **Step 2: The cull-group counter and its baseline**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cat > "$P2/cull-count.mjs" <<'JS_EOF'
// Part 2: per room, how many meshes the culling pass took into the room's cull group
// (visibility.ts groupRoomContents; the scene check's --dump records each mesh's group as `room`).
// A furnish group with one item outside its room's rect inset 0.05 is never taken in, and the count
// drops by the whole group.
import fs from 'node:fs';
const ROOMS = ['consult', 'patientcare', 'education', 'physics', 'radbio', 'dosimetry', 'manager', 'ctcontrol', 'ctsim'];
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const id of ROOMS) console.log(`${id}: ${d.meshes.filter((m) => m.room === id).length} culled`);
JS_EOF
node "$P2/cull-count.mjs" "$P2/dump-base.json"
```

Expected, nine lines: `consult: 75 culled`, `patientcare: 55 culled`, `education: 61 culled`, `physics: 25 culled`, `radbio: 23 culled`, `dosimetry: 77 culled`, `manager: 45 culled`, `ctcontrol: 124 culled`, `ctsim: 150 culled`.

- [ ] **Step 3: Write the Part 2 shot list and take every before shot**

The list holds:
- the 19 new shots;
- `education-monitor` at its new pose (the old eye would stand inside the moved desk);
- ten existing shots copied from `sim-hub-shots.mjs`: `physics-room`, `mgr-visitor`, `manager-desk`, `manager-office`, `ctcontrol-room`, `ctcontrol-backwall`, `ctcontrol-console`, `ct-gantry`, `ct-table`, `ct-low`.

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cat > "$P2/shots-p2.json" <<'JSON_EOF'
[
{ "name": "consult-enter", "eye": [-18, 1.7, -3.3], "look": [-18, 0.9, -9], "ceilings": true },
{ "name": "consult-westwall", "eye": [-15.2, 1.7, -7.5], "look": [-22.9, 1.0, -8.5], "ceilings": true },
{ "name": "patientcare-entrance", "eye": [-28, 1.7, 3.3], "look": [-28, 0.8, 9], "ceilings": true },
{ "name": "patientcare-east", "eye": [-27.5, 1.8, 6.5], "look": [-21.1, 0.8, 7.8], "ceilings": true },
{ "name": "education-monitor", "eye": [-38.6, 1.9, -6.6], "look": [-40.6, 1.3, -10.0] },
{ "name": "education-enter", "eye": [-42, 1.7, -3.3], "look": [-42, 0.9, -9], "ceilings": true },
{ "name": "education-side", "eye": [-38, 1.7, -7], "look": [-42, 1.1, -10], "ceilings": true },
{ "name": "physics-room", "eye": [3.6, 2.4, -13.6], "look": [11.0, 1.0, -22.0] },
{ "name": "physics-door", "eye": [3.6, 1.7, -18], "look": [10, 1, -18], "ceilings": true },
{ "name": "radbio-room", "eye": [-3.6, 1.7, -31], "look": [-10, 1.0, -31], "ceilings": true },
{ "name": "radbio-top", "eye": [-7.5, 11, -29.5], "look": [-7.5, 0, -31] },
{ "name": "dosimetry-door", "eye": [2.6, 1.7, -49], "look": [9, 1, -46], "ceilings": true },
{ "name": "dosimetry-cabinet-west", "eye": [9, 1.7, -52], "look": [3.8, 1, -45.3], "ceilings": true },
{ "name": "mgr-visitor", "eye": [20.6, 1.25, 10.4], "look": [20, 1.4, 7.4], "ceilings": true },
{ "name": "mgr-door", "eye": [20, 1.7, 3.8], "look": [20, 1, 9], "ceilings": true },
{ "name": "manager-desk", "subject": "cast:manager:staff:0", "cam": [2.6, 1.6, 0.3], "lookY": 0.8 },
{ "name": "manager-office", "eye": [24.4, 2.4, 4.1], "look": [17.0, 1.0, 10.5] },
{ "name": "ctcontrol-door", "eye": [31.5, 1.75, -4.4], "look": [30.5, 1.1, -12.5], "ceilings": true },
{ "name": "ctcontrol-window-view", "eye": [33, 1.7, -9], "look": [36, 1.6, -9.5], "ceilings": true },
{ "name": "ctcontrol-room", "eye": [35.4, 2.4, -13.4], "look": [28.0, 1.0, -5.0] },
{ "name": "ctcontrol-backwall", "eye": [31.5, 1.9, -5.2], "look": [31.5, 1.8, -13.9] },
{ "name": "ctcontrol-console", "subject": "cast:ctcontrol:staff:1", "cam": [0.9, 1.7, -2.6], "lookY": 1.0 },
{ "name": "ct-gantry", "eye": [38.0, 2.6, -17.0], "look": [46.0, 2.0, -9.0] },
{ "name": "ct-table", "subject": "cast:ctsim:patient:*", "cam": [0, 1.5, -1.8], "lookY": 1.05 },
{ "name": "ct-low", "subject": "cast:ctsim:patient:*", "cam": [0.4, 1.08, -1.9], "lookY": 1.08 },
{ "name": "ctsim-from-door", "eye": [44, 1.75, -3.4], "look": [44, 1.1, -13], "ceilings": true },
{ "name": "ctsim-east-wall", "eye": [39, 2, -11], "look": [52, 1.3, -11], "ceilings": true },
{ "name": "ctsim-sink", "eye": [46, 1.8, -13.5], "look": [48.6, 1, -18.5], "ceilings": true },
{ "name": "ctsim-hall", "eye": [41, 1.7, 1.5], "look": [43, 1.9, -2.9], "ceilings": true },
{ "name": "ctsim-couch-iv", "eye": [36.8, 1.9, -13], "look": [39.5, 1, -9.8], "ceilings": true }
]
JSON_EOF
node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length)' "$P2/shots-p2.json"
```

Expected: `30`.

Take the before shots on the pristine bundle that Step 1 built. No source has changed yet:

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node "$SHOTS" "$P2/before" - "$P2/shots-p2.json" && ls "$P2/before" | wc -l
```

Expected: one line per shot naming its PNG, no error, then `30`.

Read three to confirm the poses work:
- `consult-enter.png`: an IV pole in the doorway's path;
- `patientcare-entrance.png`: the white block and the cart's handle straight ahead;
- `ctsim-east-wall.png`: the cabinets off the wall, the rack turned away, the plaque inside.

- [ ] **Step 4: Add the shots to the repo's shot list**

In `apps/web/scripts/sim-hub-shots.mjs`, replace line 69:

```js
	{ name: 'education-monitor', eye: [-42.0, 1.8, -10.4], look: [-42.0, 1.2, -5.95] },
```

with:

```js
	// from the bench side: since round 3 (R3-3) the desk stands where this shot's eye used to be
	{ name: 'education-monitor', eye: [-38.6, 1.9, -6.6], look: [-40.6, 1.3, -10.0] },
```

Then replace the last entry (lines 144-151, before `];`):

```js
	{
		name: 'shuttle-side',
		subject: 'mover:shuttle',
		u: 0.2,
		cam: [5, 1.4, 0.5],
		lookY: 0.5,
		ceilings: true
	}
```

with:

```js
	{
		name: 'shuttle-side',
		subject: 'mover:shuttle',
		u: 0.2,
		cam: [5, 1.4, 0.5],
		lookY: 0.5,
		ceilings: true
	},
	// the 2026-11-06 round 3, Part 2 (the rooms): consult, patient care, education, physics,
	// radiobiology, dosimetry, the manager's office, CT control and the CT room
	{ name: 'consult-enter', eye: [-18, 1.7, -3.3], look: [-18, 0.9, -9], ceilings: true },
	{ name: 'consult-westwall', eye: [-15.2, 1.7, -7.5], look: [-22.9, 1.0, -8.5], ceilings: true },
	{ name: 'patientcare-entrance', eye: [-28, 1.7, 3.3], look: [-28, 0.8, 9], ceilings: true },
	{ name: 'patientcare-east', eye: [-27.5, 1.8, 6.5], look: [-21.1, 0.8, 7.8], ceilings: true },
	{ name: 'education-enter', eye: [-42, 1.7, -3.3], look: [-42, 0.9, -9], ceilings: true },
	{ name: 'education-side', eye: [-38, 1.7, -7], look: [-42, 1.1, -10], ceilings: true },
	{ name: 'physics-door', eye: [3.6, 1.7, -18], look: [10, 1, -18], ceilings: true },
	{ name: 'radbio-room', eye: [-3.6, 1.7, -31], look: [-10, 1.0, -31], ceilings: true },
	{ name: 'radbio-top', eye: [-7.5, 11, -29.5], look: [-7.5, 0, -31] },
	{ name: 'dosimetry-door', eye: [2.6, 1.7, -49], look: [9, 1, -46], ceilings: true },
	{ name: 'dosimetry-cabinet-west', eye: [9, 1.7, -52], look: [3.8, 1, -45.3], ceilings: true },
	{ name: 'mgr-door', eye: [20, 1.7, 3.8], look: [20, 1, 9], ceilings: true },
	{ name: 'ctcontrol-door', eye: [31.5, 1.75, -4.4], look: [30.5, 1.1, -12.5], ceilings: true },
	{ name: 'ctcontrol-window-view', eye: [33, 1.7, -9], look: [36, 1.6, -9.5], ceilings: true },
	{ name: 'ctsim-from-door', eye: [44, 1.75, -3.4], look: [44, 1.1, -13], ceilings: true },
	{ name: 'ctsim-east-wall', eye: [39, 2, -11], look: [52, 1.3, -11], ceilings: true },
	{ name: 'ctsim-sink', eye: [46, 1.8, -13.5], look: [48.6, 1, -18.5], ceilings: true },
	{ name: 'ctsim-hall', eye: [41, 1.7, 1.5], look: [43, 1.9, -2.9], ceilings: true },
	{ name: 'ctsim-couch-iv', eye: [36.8, 1.9, -13], look: [39.5, 1, -9.8], ceilings: true }
```

The `];` on the next line stays.

- [ ] **Step 5: Add the failing consult and patient-care placements (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, the last entry of `PLACEMENTS` is `'technical hallway floor, z -66..-56.5 stops at the x 2 wall'` (lines 599-602). Add a comma after its closing `}`, and append before `];`:

```js
	// R3-1 (2026-11-06): consult: the oncologist's desk, its screen and chair on the west wall (the left
	// as you walk in), the storage cabinet beside the desk, the brochure rack on the east wall and both
	// IV poles in the back-right corner. The cabinet and the rack stand on the baseboard's face (0.06 m
	// off the wall, the flush limit), so they are pinned by their centres.
	{
		id: 'consult desk on the west wall',
		pick: { size: [1.8, 0.08, 0.7], at: [-22.55, -8.4] },
		flush: { axis: 'x', face: -22.92, side: 'min' }
	},
	{
		id: 'consult desk screen',
		pick: { size: [0.8, 0.48, 0.055], at: [-22.62, -8.4] },
		minY: 1.16,
		within: [-22.9, -22.2, -9.3, -7.5]
	},
	{
		id: 'consult chair behind the desk',
		pick: { size: [0.55, 0.12, 0.55], at: [-21.65, -8.4], r: 0.05 }
	},
	{
		id: 'consult cabinet beside the desk',
		pick: { size: [1.5, 1.45, 0.42], at: [-22.65, -10.15] },
		within: [-22.66, -22.64, -10.16, -10.14]
	},
	{
		id: 'consult brochure rack on the east wall',
		pick: { size: [0.08, 1.05, 0.42], at: [-13.35, -10.3], r: 0.05 },
		within: [-13.36, -13.34, -10.31, -10.29]
	},
	{
		id: 'consult IV pole A in the back-right corner',
		pick: { geom: 'CylinderGeometry', size: [0.0264, 0.0264, 1.364], at: [-13.55, -11.45], r: 0.05 }
	},
	{
		id: 'consult IV pole B in the back-right corner',
		pick: { geom: 'CylinderGeometry', size: [0.027, 0.027, 1.395], at: [-14.25, -11.45], r: 0.05 }
	},
	// R3-2: patient care: the supply counter (a drawer counter in place of the plain white block) and
	// both supply carts on the east wall (the left as you walk in), on the baseboard's face; the
	// doorway is clear
	...[
		['supply counter on the east wall', [2.2, 0.95, 0.55], -21.415, 7.0],
		['cart beside the counter', [0.5152, 0.78, 0.3496], -21.345, 8.6],
		['entrance cart parked on the east wall', [0.532, 0.78, 0.361], -21.35, 9.45]
	].map(([what, size, x, z]) => ({
		id: `patientcare ${what}`,
		pick: { size, at: [x, z] },
		within: [x - 0.01, x + 0.01, z - 0.01, z + 0.01]
	})),
	{
		id: 'patientcare entrance clear',
		pick: { size: [2.2, 0.95, 0.55], at: [-28, 5.5] },
		absent: true
	}
```

Run against the unchanged bundle:

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected:
- `SCENE CHECK placements FAIL: 158 placements, 11 problems`;
- ten lines `<id>: picked 0 meshes (expected 1)`: the seven consult ids and the three `patientcare …` wall ids;
- `patientcare entrance clear: still there (BoxGeometry …)`;
- `exit 1`.

- [ ] **Step 6: The consult room (R3-1)**

In `apps/web/arcade-src/sim-hub/src/rooms.ts`, `furnish`, `case 'consult'`, replace lines 1106-1114:

```ts
			desk(g, room.x - 2.5, room.z - 1.8, 1.8, 0.7);
			monitor(g, room.x - 2.5, 1.35, room.z - 2.0);
			chair(g, room.x + 2.3, room.z - 1.6);
			brochureRack(g, room.x + 4.0, room.z - 2.8, Math.PI);
			// eslint-disable-next-line no-case-declarations -- legacy switch case, lexical decl scoped to this case only (no fallthrough)
			const iv = ivPoleObject(0.88);
			iv.position.set(room.x + 3.0, 0, room.z + 1.4);
			g.add(iv);
			cabinetBank(g, room.x + 3.2, room.z - 2.6, 1.5, 1.45, 0.42, Math.PI, 0xe4eaed);
```

with:

```ts
			// the oncologist's desk along the west wall (the left as you walk in), its top 0.02 m off the
			// wall face (x -22.90..-22.20, z -9.30..-7.50); the screen on it faces the room (bottom 1.16),
			// and the chair stands behind the desk, facing it and the screen
			desk(g, room.x - 4.55, room.z - 0.9, 1.8, 0.7, Math.PI / 2);
			monitor(g, room.x - 4.62, 1.4, room.z - 0.9, Math.PI / 2);
			chair(g, room.x - 3.65, room.z - 0.9, -Math.PI / 2);
			// the patient-leaflet rack on the east wall, its trays toward the room (-x)
			brochureRack(g, room.x + 4.65, room.z - 2.8, -Math.PI / 2);
			// eslint-disable-next-line no-case-declarations -- legacy switch case, lexical decl scoped to this case only (no fallthrough)
			const iv = ivPoleObject(0.88);
			// parked in the back-right corner, its bag toward the room (addCirculationProps parks the
			// room's second pole beside it)
			iv.position.set(room.x + 4.45, 0, room.z - 3.95);
			iv.rotation.y = -Math.PI / 2;
			g.add(iv);
			// the storage cabinet beside the desk on the west wall (x -22.86..-22.44, z -10.90..-9.40),
			// drawers facing the room (+x)
			cabinetBank(g, room.x - 4.65, room.z - 2.65, 1.5, 1.45, 0.42, Math.PI / 2, 0xe4eaed);
```

In `addCirculationProps`, replace lines 463-465:

```ts
	const iv2 = ivPoleObject(0.9);
	iv2.position.set(-18.9, 0, -4.8);
	scene.add(iv2);
```

with:

```ts
	const iv2 = ivPoleObject(0.9);
	// consult: parked in the back-right corner beside the room's other IV pole, its bag toward the room
	iv2.position.set(-14.25, 0, -11.45);
	iv2.rotation.y = -Math.PI / 2;
	scene.add(iv2);
```

In `apps/web/arcade-src/sim-hub/src/room-routes.ts`, replace line 197:

```ts
			[-19.9, -4.6], // 2 -x of the IV pole at (-18.9, -4.8)
```

with:

```ts
			[-19.9, -4.6], // 2 inside the door's -x half, toward the table's -x end
```

No consult node, spot or final moves. The oncologist (-20.3, -8.75) stays, now in front of her desk.

- [ ] **Step 7: The patient care room (R3-2)**

In `rooms.ts`, `case 'patientcare'`, replace lines 1138-1142:

```ts
			add(g, box(2.2, 0.95, 0.55, MAT.white, room.x, 0.55, room.z - 3));
			// eslint-disable-next-line no-case-declarations -- legacy switch case, lexical decl scoped to this case only (no fallthrough)
			const mc = medCartObject(0.92, 0x7eaec1);
			mc.position.set(room.x + 4.6, 0, room.z - 2.9);
			g.add(mc);
```

with:

```ts
			// one supply wall on the east wall (the left as you walk in), so the doorway stays clear: the
			// supply counter, drawers facing the room (-x), at x -21.69..-21.14, z 5.9..8.1; the supply
			// cart beside it, then the entrance cart (addCirculationProps)
			cabinetBank(g, room.x + 6.585, room.z - 1.5, 2.2, 0.95, 0.55, -Math.PI / 2, 0xf1f4f5);
			// eslint-disable-next-line no-case-declarations -- legacy switch case, lexical decl scoped to this case only (no fallthrough)
			const mc = medCartObject(0.92, 0x7eaec1);
			mc.position.set(room.x + 6.655, 0, room.z + 0.1);
			mc.rotation.y = -Math.PI / 2;
			g.add(mc);
```

In `addCirculationProps`, replace lines 451-454:

```ts
	const cart1 = medCartObject(0.95, 0x82aeca);
	cart1.position.set(-28.0, 0, 4.4);
	cart1.rotation.y = Math.PI;
	scene.add(cart1);
```

with:

```ts
	const cart1 = medCartObject(0.95, 0x82aeca);
	// patient care: parked on the east wall after the supply counter and its cart, drawers facing the
	// room (-x), so the doorway stays clear (top x -21.56..-21.14, z 9.16..9.74)
	cart1.position.set(-21.35, 0, 9.45);
	cart1.rotation.y = -Math.PI / 2;
	scene.add(cart1);
```

In `room-routes.ts`, replace lines 252-262:

```ts
	// round the cart (-28, 4.4) and the bed (x -29.1..-26.9, z 5.22..5.78) inside the door: +x side
	// to the arrival spots, -x side to the exam table at (-30.6, 9.8)
	patientcare: {
		nodes: [
			[-28, 2.15], // 0 door
			[-25.9, 4.6], // 1 +x of the cart and bed: spot [0] arrives along x, clear of the bed
			[-26.2, 6.2], // 2 +z of the bed's +x end: spots [1], [2] and the nurse
			[-29.0, 3.7], // 3 inside the door's -x half, clear of the cart
			[-30.0, 6.5], // 4 -x of the bed
			[-29.0, 9.0] // 5 +x of the table's stand-up point (-30.6, 9.14): leaves along x
		],
```

with:

```ts
	// the doorway is open floor (the supply counter and both carts stand on the east wall): +x side to
	// the arrival spots, -x side to the exam table at (-30.6, 9.8). The door leaf swings in along
	// x -29.3..-29.1 from z 3 to 5.59; nodes 3 and 4 keep 0.6 m clear of it
	patientcare: {
		nodes: [
			[-28, 2.15], // 0 door
			[-25.9, 4.6], // 1 +x of the doorway: spot [0] arrives along x
			[-26.2, 6.2], // 2 by spots [1], [2] and the nurse
			[-28.5, 4.0], // 3 inside the door's -x half, 0.6 m clear of the open leaf
			[-28.6, 6.5], // 4 past the open leaf's tip, toward the -x exam table
			[-29.0, 9.0] // 5 +x of the table's stand-up point (-30.6, 9.14): leaves along x
		],
```

The edges are unchanged. The arrival spots (-27.4, 4.95), (-27.4, 6.05) and (-26.65, 5.5) stay, now on open floor. The wheelchair interactable at (-33.4, 5.4) does not move.

Swept footprints:
- the open leaf (x -29.3..-29.1, z 3..5.59) is 0.6 m from nodes 3 and 4 and from the edge between them;
- the counter and carts are 4 m from every node and spot, and 4.9 m from the nurse (-26.6, 6.3).

- [ ] **Step 8: Build and run every check**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P2/npc-t1.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P2/npc-baseline.log") <(grep '^NPC CHECK' "$P2/npc-t1.log")
node scripts/sim-hub-scene-check.mjs --only placements --dump "$P2/dump-t1.json" >/dev/null && node "$P2/cull-count.mjs" "$P2/dump-t1.json"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P2/vis-t1.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures' "$P2/vis-t1.log"
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- **scene check:** signs PASS (163 panels), legs PASS (20 chairs, 3 couches), `SCENE CHECK placements PASS: 158 placements, 0 problems`, `exit 0`;
- **NPC check:** `exit 0`, and a diff of exactly one line. The g line's `except 5 across a work surface` becomes `except 6 across a work surface`: the consult chair now faces the west wall across its desk, whose top ends 0.02 m from the wall;
- **cull groups:** `consult: 75 culled`, `patientcare: 64 culled`, the other seven as the baseline;
- **visibility:** `vis exit 0`, `poses checked: 301`, `poses with failures: 0`;
- **vitest:** 4 test files, 77 tests passed;
- `check exit 0`.

If the NPC check fails, fix NPC data only (patientcare nodes 3 and 4 are the only route change here) and report what you changed.

Read the l info lines: the old first-closest route, `hdr[0] -> patientcare`, 0.9 cm from the white block at (-28.00, 5.50), is gone.

- [ ] **Step 9: After shots**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P2/shots-p2.json" "$P2/t1.json" consult-enter consult-westwall patientcare-entrance patientcare-east
node "$SHOTS" "$P2/after" - "$P2/t1.json"
```

Expected: four lines naming the PNGs. Read each next to its `$P2/before` twin. Check:
- `consult-enter`: the walk-in path is clear; the desk, screen and chair are on the left wall; both IV poles are in the back-right corner; the rack is on the right wall;
- `consult-westwall`: the desk on the wall, the screen facing the room, the chair behind the desk, the white cabinet beside it with its drawers showing;
- `patientcare-entrance`: the doorway area is open floor; the counter and carts are on the left wall;
- `patientcare-east`: the counter shows drawers and handles, with both carts beside it on the same wall.

- [ ] **Step 10: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-shots.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs scripts/sim-hub-shots.mjs
```

Expected: no eslint errors. If prettier changed a source file, rebuild and rerun the scene check (exit 0) before committing.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-scene-check.mjs apps/web/scripts/sim-hub-shots.mjs
git commit -m "fix(sim-hub): consult desk on the west wall and IV poles parked; patient-care supply wall, doorway clear; Part 2 shots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The education room (R3-3)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (Task 1 added 4 lines in `addCirculationProps` and 9 in the consult case):
  - `case 'education'`, lines ≈1138-1145 (`22bd2a8`: 1125-1132);
  - `buildExteriorAmbient`'s tree list, line ≈1039 `[-45, -8, 0.9],` (`22bd2a8`: 1035).
- Modify: `apps/web/arcade-src/sim-hub/src/npc.ts:619-631` (the navigator and the education patient).
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts`: education spots (lines 40-44); education graph (228-251).
- Modify: `apps/web/arcade-src/sim-hub/src/journey.ts:1893-1928` (Mia's move consult → education).
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs`: 'education desk screen' (lines 115-120); append 5 pins.
- Scratch: `$P2/npc-t2.log`, `$P2/vis-t2.log`, `$P2/dump-t2.json`, `$P2/t2.json`.

**Interfaces:**
- Consumes: `$P2/shots-p2.json`, `$P2/cull-count.mjs` and `$P2/npc-t1.log` from Task 1.
- Produces:
  - the navigator seated at boot (`seatActor`, duty pose still `'gesture'`);
  - `ROOM_GRAPHS.education` with 7 nodes;
  - Mia's education final at the free chair's seat (`sit: true`);
  - `$P2/npc-t2.log`.

- [ ] **Step 1: Add the failing education placements (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, replace the 'education desk screen' entry (lines 115-120):

```js
	{
		id: 'education desk screen',
		pick: { size: [0.8, 0.48, 0.055], at: [-42, -5.95] },
		minY: 1.16,
		within: [-43.9, -40.1, -6.75, -5.65]
	},
```

with:

```js
	{
		id: 'education desk screen',
		pick: { size: [0.8, 0.48, 0.055], at: [-40.5, -10.0] },
		minY: 1.16,
		within: [-43.9, -40.1, -10.55, -9.45]
	},
```

Append at the end of `PLACEMENTS` (add a comma after the last entry, `patientcare entrance clear`):

```js
	// R3-3: education: the navigator's desk by the TV wall (1.37 m off it), the navigator's chair
	// behind it, the patient's chair and the free chair on the door side; the outdoor tree that stood
	// inside the room is gone (tree() trunk at scale 0.9)
	{
		id: 'education desk by the TV wall',
		pick: { size: [3.8, 0.08, 1.1], at: [-42, -10.0] },
		within: [-42.01, -41.99, -10.01, -9.99]
	},
	...[
		['navigator', -42.15, -11.15],
		['patient', -41.9, -8.45],
		['free', -43.1, -8.45]
	].map(([who, x, z]) => ({
		id: `education ${who} chair`,
		pick: { size: [0.55, 0.12, 0.55], at: [x, z], r: 0.05 }
	})),
	{
		id: 'education tree removed',
		pick: { geom: 'CylinderGeometry', size: [0.162, 0.216, 2.25], at: [-45, -8] },
		absent: true
	}
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected:
- `SCENE CHECK placements FAIL: 163 placements, 6 problems`;
- `picked 0 meshes (expected 1)` for: `education desk screen`, `education desk by the TV wall`, `education navigator chair`, `education patient chair`, `education free chair`;
- `education tree removed: still there (CylinderGeometry …)`;
- `exit 1`.

- [ ] **Step 2: The desk, monitor and chairs; the tree**

In `rooms.ts`, `case 'education'`, replace lines ≈1138-1145:

```ts
			desk(g, room.x, room.z + 1.3, 3.8, 1.1);
			// the outer chairs turn in toward the desk's middle, the right one toward the navigator
			for (let i = -1; i <= 1; i++) {
				chair(g, room.x + i * 1.3, room.z - 0.2, -0.4 * i);
			}
			// the navigator's computer on the desk, toward its door-side edge, facing the visitor chairs
			// (-z) so the navigator and the patient read it together
			monitor(g, room.x, 1.4, room.z + 1.55, Math.PI, 0.8, 0.48);
```

with:

```ts
			// the navigator's desk by the TV wall (the PATIENT EDUCATION board on the back wall), 1.37 m
			// off it: top x -43.9..-40.1, z -10.55..-9.45. The navigator sits behind it, the two visitor
			// chairs stand on the door side, and the resident patient takes the one nearer the monitor. The
			// monitor stands on the desk's +x end, turned 12 deg past the bisector toward the patient
			// (bottom 1.16); the navigator's and the patient's chairs turn to face it.
			desk(g, room.x, room.z - 2.5, 3.8, 1.1);
			monitor(g, room.x + 1.5, 1.4, room.z - 2.5, -1.25, 0.8, 0.48);
			chair(g, room.x - 0.15, room.z - 3.65, 0.96); // the navigator's
			chair(g, room.x + 0.1, room.z - 0.95, 2.41); // the patient's
			chair(g, room.x - 1.1, room.z - 0.95, Math.PI); // the free chair, facing the desk
```

The `benchSeat` line after it stays.

In `buildExteriorAmbient`'s tree list, delete line ≈1039:

```ts
		[-45, -8, 0.9],
```

(It is an outdoor tree whose trunk and crown stood inside the education room.)

- [ ] **Step 3: The seated navigator and the patient**

In `apps/web/arcade-src/sim-hub/src/npc.ts`, replace lines 619-631:

```ts
	place(
		'education',
		'Patient Navigator',
		'Helps patients understand appointments, resources and the sequence of care.',
		0x5c8e9c,
		-1.6,
		0.55,
		0.5,
		0xefc7a4,
		undefined,
		'education'
	);
	sitPatient('education', 'Reviewing the care pathway and education materials.', 1.1, -0.2, -0.4);
```

with:

```ts
	// the navigator sits behind the desk by the TV wall, turned to the monitor on its +x end; the duty
	// pose stays 'gesture', so the arm keeps pointing while seated. The resident patient sits in the
	// visitor chair nearer the monitor, also turned to it.
	const nav = place(
		'education',
		'Patient Navigator',
		'Helps patients understand appointments, resources and the sequence of care.',
		0x5c8e9c,
		-0.1,
		-3.62,
		0.96,
		0xefc7a4,
		undefined,
		'education'
	);
	seatActor(nav, nav.position);
	sitPatient('education', 'Reviewing the care pathway and education materials.', 0.14, -1.0, 2.41);
```

`seatActor` is already imported (npc.ts:15). It snaps the navigator to the navigator chair's anchor (-42.10, -11.12) and the patient to (-41.86, -8.50).

- [ ] **Step 4: The education graph and spots**

In `room-routes.ts`, replace the education spots (lines 40-44):

```ts
	education: [
		{ x: -41.1, z: -5.4, facing: -2.13 },
		{ x: -41.5, z: -7.0, facing: -1.55 },
		{ x: -41.8, z: -5.4, facing: -2.28 }
	],
```

with:

```ts
	// on the open floor inside the door, facing the seated navigator behind the desk by the TV wall
	education: [
		{ x: -41.1, z: -5.4, facing: -2.95 },
		{ x: -41.5, z: -7.0, facing: -2.98 },
		{ x: -41.8, z: -5.4, facing: -3.07 }
	],
```

Replace the education graph and its comment (lines ≈229-252 after the spots' new comment line, from `// in by the door's +x half` to the graph's closing `},`):

```ts
	// in by the door's +x half (the doorway is x -43.3..-40.7), then round the desk (x -43.9..-40.1,
	// z -6.75..-5.65). Spot [1] (-41.5, -7.0) stands in the 0.59 m gap between the desk and the
	// chairs: its line to node 4 is clear at body width (0.12 m), not at 0.25 m
	education: {
		nodes: [
			[-42, -2.15], // 0 door
			[-40.92, -2.6], // 1 outside the door's +x half
			[-40.92, -4.0], // 2 inside it
			[-39.75, -5.3], // 3 +x of the desk: Mia's final and spot [0] arrive and leave along x
			[-39.6, -7.3], // 4 off the desk's +x end, -z side: the seated patient and spot [1]
			[-42.9, -5.2], // 5 +z of the desk: spot [2] along x
			[-44.5, -5.0], // 6 and 7 round the desk's -x end
			[-44.5, -7.0] // 7 to the navigator (-43.6, -6.95)
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[2, 5],
			[5, 6],
			[6, 7]
		]
	},
```

with:

```ts
	// in by the door's +x half (the doorway is x -43.3..-40.7), then over the open floor to the
	// visitor chairs: node 3 in front of the patient's chair, node 6 in front of the free chair, and
	// round the desk's +x front corner (node 4) to node 5 behind the desk's +x end, the seated
	// navigator's way out (desk x -43.9..-40.1, z -10.55..-9.45, by the TV wall)
	education: {
		nodes: [
			[-42, -2.15], // 0 door
			[-40.92, -2.6], // 1 outside the door's +x half
			[-40.92, -4.0], // 2 inside it: spots [0] and [2]
			[-40.8, -7.7], // 3 in front of the patient's chair (stand-up (-41.53, -8.87)): spot [1]
			[-39.6, -9.2], // 4 off the desk's +x front corner, 0.56 m from it
			[-39.6, -10.95], // 5 behind the desk's +x end: the navigator's stand-up (-41.69, -10.83)
			[-42.5, -7.6] // 6 in front of the free chair (Mia's seat, stand-up (-43.10, -9.01)) and the room centre
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[2, 6]
		]
	},
```

- [ ] **Step 5: Mia sits in the free chair**

In `apps/web/arcade-src/sim-hub/src/journey.ts`, in the `moveJourneyActor(JOURNEY.newPatient, 'consult', 'education', …)` call (lines 1893-1928), replace line 1897:

```ts
			new THREE.Vector3(-40.9, 0, -5.4),
```

with:

```ts
			// the free visitor chair's seat anchor: with `sit` she walks to its approach point and sits,
			// beside the resident patient
			new THREE.Vector3(-43.1, 0, -8.51),
```

and that call's options object (lines ≈1923-1929):

```ts
			{
				followCamera: true,
				followSubject: JOURNEY.newPatient,
				followTarget: JOURNEY.navigator,
				cues,
				cameraOptions: { distance: 3.5, side: 1.25 }
			}
```

with:

```ts
			{
				followCamera: true,
				followSubject: JOURNEY.newPatient,
				followTarget: JOURNEY.navigator,
				cues,
				sit: true,
				cameraOptions: { distance: 3.5, side: 1.25 }
			}
```

Nothing else changes; three stand-ups follow from the data:
- the navigator's move to ctsim (journey.ts ≈2076-2083) starts with his stand-up toward node 5;
- Mia's move on to ctsim starts with hers, via node 6;
- the resident patient's 'Proceed to CT Simulation' hand-over (main.ts:198) stands up toward node 3.

Check j is not edited. Check l follows all three frame by frame.

- [ ] **Step 6: Build and run every check**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P2/npc-t2.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P2/npc-t1.log") <(grep '^NPC CHECK' "$P2/npc-t2.log"); grep 'closest to furniture\|info: counts' "$P2/npc-t2.log"
node scripts/sim-hub-scene-check.mjs --only placements --dump "$P2/dump-t2.json" >/dev/null && node "$P2/cull-count.mjs" "$P2/dump-t2.json"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P2/vis-t2.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures' "$P2/vis-t2.log"
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- **scene check:** signs PASS (163), legs PASS (20 chairs, 3 couches), `SCENE CHECK placements PASS: 163 placements, 0 problems`, `exit 0`;
- **NPC check:** `exit 0`. The diff shows only:
  - g: `7 sitters` → `8 sitters` and `exchange facing: 5 seated patients` → `exchange facing: 6 seated patients` (the rest of g, `except 6 …`, unchanged);
  - possibly c: `max step 0.098 m` → `max step 0.097 m` (A's prototype). Any other change to c, or any other line, is a failure: stop and report.
  - j still reads `4 stand-up flows`; k `114`; l `21 hand-overs alone, 15 together and 38 journey moves`; m `66 moments`.
- **cull groups:** `education: 57 culled`; the others as after Task 1;
- **visibility:** `vis exit 0`, 301 poses, 0 failures;
- **vitest:** 4 files, 77 tests passed (the new education graph meets the valid-edges, connected and farthest-path tests: nodes 0 and 5 are the farthest pair, joined by 0-1-2-3-4-5);
- `check exit 0`.

Record the five "closest to furniture" lines for the report. Any line naming education must be at least 0.0 cm, i.e. a pass.

If l or k fails in education, the fix is NPC data: the node positions or the spot positions and facings above, never the check. A's prototype passed with exactly these numbers; its first run, with the visitor chairs at z -8.6, failed l by 4.8 cm, Mia's back leg turning into the desk base. Report any deviation.

- [ ] **Step 7: After shots**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P2/shots-p2.json" "$P2/t2.json" education-monitor education-enter education-side
node "$SHOTS" "$P2/after" - "$P2/t2.json"
```

Expected: three PNGs. Check:
- `education-enter`: the desk under the TV board; the navigator seated behind it with the arm out; two chairs on the door side, the patient seated in the right one; no tree;
- `education-side`: the seated patient and the seated navigator both turned toward the monitor on the desk's right end;
- `education-monitor`: the monitor's screen faces the patient's chair.

- [ ] **Step 8: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts arcade-src/sim-hub/src/journey.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts arcade-src/sim-hub/src/journey.ts scripts/sim-hub-scene-check.mjs
```

Expected: no eslint errors. Rebuild and rerun the scene check if prettier changed a source file.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/npc.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/arcade-src/sim-hub/src/journey.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): education desk by the TV wall, the navigator and patient seated facing the monitor, Mia sits in the free chair

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Physics (R3-4), radiobiology (R3-5), dosimetry (R3-6); the scene check's `extent` test

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (Tasks 1–2 added 18 lines above these): `case 'physics'` (≈1174-1176; `22bd2a8`: 1156-1158), `case 'radbio'` (≈1177-1184; 1159-1166), dosimetry cabinets (≈1230-1231; 1212-1213).
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts:1346-1347` (`physics_planqa`).
- Modify: `apps/web/arcade-src/sim-hub/src/npc.ts` (Task 2 added 4 lines above these): physicist (≈666-668), radbio educator (≈678-680), Jordan Price (≈868), Leah Grant (≈879-881).
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts`: physics spots (≈51-55), physics graph (≈280-287).
- Modify: `apps/web/arcade-src/sim-hub/src/journey.ts:787-788` (`journeyFocusActors`).
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs`: header test list (lines 53-58), the placements rule (after its `if (e.within) {` block, which Tasks 1–2's pins pushed down), append 8 pins.
- Scratch: `$P2/npc-t3.log`, `$P2/vis-t3.log`, `$P2/dump-t3.json`, `$P2/t3.json`.

**Interfaces:**
- Consumes: `$P2/npc-t2.log`.
- Produces: the placements test `extent: [x, z]`: the picked mesh's world box size along x and along z, each within 0.01. It tells which way a box is turned when its centre does not move. Task 5 does not use it; it is available.

- [ ] **Step 1: The `extent` test (plan-time finding 3)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, in the header's test list, replace:

```js
//   within  the box centre is inside [x0, x1, z0, z1] (a desk top)
```

with:

```js
//   within  the box centre is inside [x0, x1, z0, z1] (a desk top)
//   extent  [x, z]: the box's world size along x and along z, each within 0.01 (which way a box is
//           turned, when its centre stays where it was)
```

In the placements rule (`if (only.has('placements')) {`), after the `within` block:

```js
		if (e.within) {
			const [x0, x1, z0, z1] = e.within;
			if (m.cx < x0 || m.cx > x1 || m.cz < z0 || m.cz > z1)
				fails.push(
					`${e.id}: centre (${f2(m.cx)}, ${f2(m.cz)}) outside x ${x0}..${x1} z ${z0}..${z1}`
				);
		}
```

add:

```js
		if (e.extent) {
			const [ex, ez] = e.extent,
				dx = m.max[0] - m.min[0],
				dz = m.max[2] - m.min[2];
			if (Math.abs(dx - ex) > 0.01 || Math.abs(dz - ez) > 0.01)
				fails.push(
					`${e.id}: world box ${dx.toFixed(3)} x ${dz.toFixed(3)} m in x and z (expected ${ex} x ${ez}): ${where(m)}`
				);
		}
```

- [ ] **Step 2: Add the failing placements (RED)**

Append at the end of `PLACEMENTS` (add a comma after `education tree removed`):

```js
	// R3-4: physics: the plan-QA desk in the far corner of the left (-z) wall, under the clock and
	// beside the PHYSICS PLAN QA board
	{
		id: 'physics desk in the far -z corner',
		pick: { size: [2, 0.08, 0.75], at: [10.87, -22.5] },
		within: [10.86, 10.88, -22.51, -22.49]
	},
	// R3-5: radiobiology: the bench row turned 90 deg about the room centre, so it runs across the room
	// from the door: each top is 0.7 m along x and 1.6 m along z (the middle bench keeps its centre, so
	// only its extent shows the turn); the outer benches' microscopes move with them
	...[-1, 0, 1].map((i) => ({
		id: `radbio bench ${i} across the room`,
		pick: { size: [1.6, 0.08, 0.7], at: [-7.5, -31 + 2.2 * i], r: 0.05 },
		extent: [0.7, 1.6]
	})),
	...[-1, 1].map((i) => ({
		id: `radbio microscope on bench ${i}`,
		pick: { geom: 'CylinderGeometry', size: [0.12, 0.18, 0.55], at: [-7.5, -31 + 2.2 * i], r: 0.05 }
	})),
	// R3-6: dosimetry: both lateral filing cabinets flush on the +z wall, drawers facing the room
	...[4.6, 13.4].map((x) => ({
		id: `dosimetry cabinet at x ${x} flush on the +z wall`,
		pick: { size: [1.6, 1.6, 0.45], at: [x, -41.825] },
		flush: { axis: 'z', face: -41.58, side: 'max' }
	}))
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected:
- `SCENE CHECK placements FAIL: 171 placements, 8 problems`;
- `picked 0 meshes (expected 1)` for: `physics desk in the far -z corner`, `radbio bench -1 across the room`, `radbio bench 1 across the room`, both `radbio microscope on bench …`, and both `dosimetry cabinet at x … flush on the +z wall`;
- `radbio bench 0 across the room: world box 1.600 x 0.700 m in x and z (expected 0.7 x 1.6): BoxGeometry …`. It picks today's middle bench, unturned, and the new test catches it;
- `exit 1`.

- [ ] **Step 3: Physics (R3-4)**

In `rooms.ts`, replace (≈1174-1176):

```ts
		case 'physics':
			desk(g, room.x - 2.3, room.z - 2.2, 2, 0.75);
			break;
```

with:

```ts
		case 'physics':
			// the plan-QA desk in the far corner of the left (-z) wall, under the clock and beside the
			// PHYSICS PLAN QA board: top x 9.87..11.87 (0.05 off the east wall), z -22.875..-22.125
			desk(g, room.x + 3.37, room.z - 4.5, 2, 0.75);
			break;
```

In `equipment.ts`, `physics_planqa` (lines 1346-1347), so the interactable anchor and its ring follow the desk:

```ts
		dx: -2.3,
		dz: -2.2,
```

→

```ts
		dx: 3.37,
		dz: -4.5,
```

In `npc.ts`, the physicist's `place('physics', …)` offsets (≈666-668):

```ts
		-2.2,
		-1.3,
		0.3,
```

→

```ts
		3.37,
		-3.5,
		-0.36,
```

She stands at (10.87, -21.5), 0.625 m in front of the desk, facing into the room toward Jordan Price.

Jordan Price's heading (`secondary('physics', 'Jordan Price', …)`, ≈868): `-1.2,` → `2.78,`, so he faces the physicist he talks with.

In `room-routes.ts`, replace the physics spots (≈51-55):

```ts
	physics: [
		{ x: 6.4, z: -17.2, facing: -2.66 },
		{ x: 5.75, z: -17.2, facing: -2.93 },
		{ x: 6.15, z: -17.8, facing: -2.63 }
	],
```

with:

```ts
	// on the room's open floor, facing the physicist at the plan-QA desk in the far -z corner
	physics: [
		{ x: 9.0, z: -20.3, facing: 2.14 },
		{ x: 8.4, z: -19.9, facing: 2.14 },
		{ x: 9.3, z: -19.7, facing: 2.42 }
	],
```

and the physics graph (≈281-288 after the spots' new comment line):

```ts
	// door to the open floor; the desk stays clear
	physics: {
		nodes: [
			[2.15, -18],
			[4.0, -17.6]
		],
		edges: [[0, 1]]
	},
```

with:

```ts
	// door to the open floor, then toward the plan-QA desk in the far -z corner (x 9.87..11.87,
	// z -22.875..-22.125): the arrival spots, the physicist and Jordan Price each reach node 2 in a
	// clear straight line
	physics: {
		nodes: [
			[2.15, -18],
			[4.0, -17.6],
			[7.4, -18.6]
		],
		edges: [
			[0, 1],
			[1, 2]
		]
	},
```

In `journey.ts`, `journeyFocusActors`, after line 787:

```ts
	else if (roomId === 'ctcontrol') pos = target.clone().add(new THREE.Vector3(2.8, 0.4, -2.2));
```

insert:

```ts
	// the physics pair stands by the desk in the far -z corner: the default offset would put the
	// camera behind the east wall
	else if (roomId === 'physics') pos = target.clone().add(new THREE.Vector3(-3.0, 0.5, 2.0));
```

The default branch, `else pos = …(3.0, 0.5, 2.0)`, stays last.

- [ ] **Step 4: Radiobiology (R3-5)**

In `rooms.ts`, replace (≈1179-1186, after Step 3's two comment lines):

```ts
		case 'radbio':
			for (let i = -1; i <= 1; i++) {
				desk(g, room.x + i * 2.2, room.z, 1.6, 0.7);
				const mic = cyl(0.12, 0.18, 0.55, MAT.black);
				mic.position.set(room.x + i * 2.2, 1.2, room.z);
				add(g, mic);
			}
			break;
```

with:

```ts
		case 'radbio':
			// the bench row runs across the room, left to right as you come in from the door (x -3): on
			// the room's centre line x, 3.93 m from the door wall, the row x -7.85..-7.15, z -34.0..-28.0;
			// a microscope on each bench. Turned with rot, not swapped w and d: desk() sizes its base from
			// w and d
			for (let i = -1; i <= 1; i++) {
				desk(g, room.x, room.z + i * 2.2, 1.6, 0.7, Math.PI / 2);
				const mic = cyl(0.12, 0.18, 0.55, MAT.black);
				mic.position.set(room.x, 1.2, room.z + i * 2.2);
				add(g, mic);
			}
			break;
```

In `npc.ts`, the educator (`place('radbio', …)`, ≈678-680):

```ts
		0,
		-1.4,
		0,
```

→

```ts
		-1.4,
		0,
		Math.PI / 2,
```

The educator stands at (-8.9, -31), behind the middle bench, facing the door.

Leah Grant (`secondary('radbio', 'Leah Grant', …)`, ≈879-881):

```ts
		2.0,
		1.0,
		-1.1,
```

→

```ts
		1.0,
		-2.0,
		-1.1 + Math.PI / 2,
```

Leah stands at (-6.5, -33.0), ry 0.471. Both are the old layout turned +90° about the room centre (-7.5, -31). Nothing routes into radbio.

- [ ] **Step 5: Dosimetry (R3-6)**

In `rooms.ts`, replace (≈1236-1237, after Steps 3–4's six comment lines):

```ts
			cabinetBank(g, room.x - 5.2, room.z + 3.7, 1.6, 1.6, 0.45, 0, 0xe1e7ea);
			cabinetBank(g, room.x + 5.2, room.z + 3.7, 1.6, 1.6, 0.45, 0, 0xe1e7ea);
```

with:

```ts
			// the two lateral filing cabinets flush on the +z wall (backs 0.02 m off its face), drawers
			// facing the room, symmetric about the room's x; the west one 0.535 m from the potted plant
			cabinetBank(g, room.x - 4.4, room.z + 7.175, 1.6, 1.6, 0.45, Math.PI, 0xe1e7ea);
			cabinetBank(g, room.x + 4.4, room.z + 7.175, 1.6, 1.6, 0.45, Math.PI, 0xe1e7ea);
```

No NPC, node, spot, final or interactable involves them.

- [ ] **Step 6: Build and run every check**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P2/npc-t3.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P2/npc-t2.log") <(grep '^NPC CHECK' "$P2/npc-t3.log"); grep 'closest to furniture' "$P2/npc-t3.log"
node scripts/sim-hub-scene-check.mjs --only placements --dump "$P2/dump-t3.json" >/dev/null && node "$P2/cull-count.mjs" "$P2/dump-t3.json"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P2/vis-t3.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures' "$P2/vis-t3.log"
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- **scene check:** signs PASS (163), legs PASS, `SCENE CHECK placements PASS: 171 placements, 0 problems`, `exit 0`;
- **NPC check:** `exit 0`, no diff output. In particular:
  - k still counts `114` and l `21 … 15 … 38`, with the hand-overs safety[0] and dosimetry[0] into physics, and physics[0] out of it, running through the new spots and node;
- **closest-to-furniture lines:** C's prototype showed a vault-1 journey move (`newpatient journey move 20 (firstpickup)`) 0.5 cm from the changing-nook panel. That is information, not a failure; note it if it appears;
- **cull groups:** physics 25, radbio 23, dosimetry 77; the rest as after Task 2;
- **visibility:** 301 poses, 0 failures;
- **vitest:** 4 files, 77 tests;
- `check exit 0`.

- [ ] **Step 7: After shots**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P2/shots-p2.json" "$P2/t3.json" physics-room physics-door radbio-room radbio-top dosimetry-door dosimetry-cabinet-west
node "$SHOTS" "$P2/after" - "$P2/t3.json"
```

Expected: six PNGs. Check:
- `physics-door`: open floor ahead; the desk in the far-left corner under the clock;
- `physics-room`: the physicist in front of the desk, Jordan Price facing her;
- `radbio-room`: the three benches run left to right across the room; the educator behind the middle one faces the camera (the door);
- `radbio-top`: the row across the room, Leah on the door side of the -z bench;
- `dosimetry-door` and `dosimetry-cabinet-west`: both cabinets against the +z wall, drawers facing the room.

- [ ] **Step 8: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts arcade-src/sim-hub/src/journey.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts arcade-src/sim-hub/src/journey.ts scripts/sim-hub-scene-check.mjs
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/npc.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/arcade-src/sim-hub/src/journey.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): physics desk in the far corner, radiobiology benches across the room, dosimetry cabinets on the wall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The manager's office (R3-7) and CT control (R3-8)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (Tasks 1–3 added 26 lines above these):
  - `case 'manager'` (≈1241-1245; `22bd2a8`: 1215-1219);
  - `case 'ctcontrol'`: desk and chairs (≈1251-1254; 1225-1228), cart (≈1272; 1246);
  - `addClinicalWallPolish` (≈1813-1816; 1787-1790).
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts:537-539, 610, 1207`.
- Modify: `apps/web/arcade-src/sim-hub/src/npc.ts` (Task 2 added 4 lines above these): manager ry (≈741), CT simulation therapist dx (≈751), Chris Evans ry (≈946), Avery Woods dx (≈957).
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts`: ctcontrol spots (≈65-67), ctcontrol graph (≈350-368).
- Modify: `apps/web/arcade-src/sim-hub/src/journey.ts`: the two CT control finals (≈2145, ≈2153; `22bd2a8`: 2139, 2147; Tasks 2 and 3 added six lines above them).
- Modify: `apps/web/arcade-src/sim-hub/src/npc-behavior.ts:653-657, 678-695`.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (Task 3 added two header lines above these): manager screen (comment ≈170, entry ≈176-181), the R8 block (≈182-231); append 4 pins.
- Scratch: `$P2/ctrunner-sweep.mjs`, `$P2/npc-t4.log`, `$P2/vis-t4.log`, `$P2/dump-t4.json`, `$P2/t4.json`.

**Interfaces:**
- Consumes: `$P2/npc-t3.log`.
- Produces:
  - the ctRunner loop and its speed constant;
  - `$P2/ctrunner-sweep.mjs`, which reads the loop from `npc-behavior.ts` and prints its length, pace and clearances.

- [ ] **Step 1: Add and edit the failing placements (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, replace line ≈170:

```js
	// R7: the manager's desk stands 0.3 m in front of the visitor chairs; its screen faces the manager
```

with:

```js
	// R7: the manager's desk stands 0.3 m in front of the visitor chairs; its screen (R3-7) stands on the
	// desk's door-side +x end, turned to the visitor chairs
```

In the 'manager screen on the desk' entry (≈177-182 after that edit), change `at: [20, 8.75]` to `at: [20.7, 8.4]`. Its `minY` and `within` stay.

Replace the R8 block's comment and first entries (≈183-202):

```js
	// R8: CT control: keyboard and mouse on the console desk (x 29.725..30.875); chairs 0.5 m from
	// it; the cabinet on the door wall east of the door; the live CT CONTROL board on the back wall
	// below the room sign; the blank screens gone; the four live screens side by side in front of the
	// backing board
	{
		id: 'CT control keyboard on the console desk',
		pick: { size: [0.72, 0.035, 0.24], at: [30.6, -8.35] },
		minY: 0.88,
		within: [29.725, 30.875, -11.6, -6.8]
	},
	{
		id: 'CT control mouse on the console desk',
		pick: { size: [1, 1, 1], at: [30.6, -8.83], y: 0.9, r: 0.05 },
		minY: 0.88,
		within: [29.725, 30.875, -11.6, -6.8]
	},
	...[-10.15, -9, -7.85].map((z) => ({
		id: `CT control chair at z ${z} 0.5 m from the desk`,
		pick: { size: [0.54, 0.1, 0.5], at: [31.65, z], r: 0.05 }
	})),
```

with:

```js
	// R8, R3-8: CT control: the console against the west wall (inner face x 27.08), keyboard and mouse
	// on its desk (x 27.085..27.975); chairs 0.5 m from it; the cabinet on the door wall east of the
	// door; the live CT CONTROL board on the back wall below the room sign; the blank screens gone; the
	// four live screens side by side in front of the backing board
	{
		id: 'CT control keyboard on the console desk',
		pick: { size: [0.72, 0.035, 0.24], at: [27.7, -8.35] },
		minY: 0.88,
		within: [27.085, 27.975, -11.6, -6.8]
	},
	{
		id: 'CT control mouse on the console desk',
		pick: { size: [1, 1, 1], at: [27.7, -8.83], y: 0.9, r: 0.05 },
		minY: 0.88,
		within: [27.085, 27.975, -11.6, -6.8]
	},
	...[-10.15, -9, -7.85].map((z) => ({
		id: `CT control chair at z ${z} 0.5 m from the desk`,
		pick: { size: [0.54, 0.1, 0.5], at: [28.75, z], r: 0.05 }
	})),
```

In the four-screen entry (≈224-232), change `pick: { size: [1.14, 0.7, 0.08], at: [30.15, z], y, r: 0.1 }` to `pick: { size: [1.14, 0.7, 0.08], at: [27.25, z], y, r: 0.1 }`. The 'CT control blank monitor wall removed' entry at [29.95, -9] stays.

Append at the end of `PLACEMENTS` (add a comma after the last dosimetry entry's `}))`):

```js
	// R3-8: the CT control console group against the west wall, flush on its inner face (x 27.08): the
	// desk (0.89 deep), the backing board and its accent strip; the CT supply cart on the same wall at
	// the console's -z end (its top 0.006 m off the wall)
	{
		id: 'CT control console desk against the west wall',
		pick: { size: [4.8, 0.08, 0.89], at: [27.53, -9.2] },
		flush: { axis: 'x', face: 27.08, side: 'min' }
	},
	{
		id: 'CT control backing board on the west wall',
		pick: { size: [0.08, 2.35, 4.2], at: [27.12, -9] },
		flush: { axis: 'x', face: 27.08, side: 'min' }
	},
	{
		id: 'CT control backing board accent on the board',
		pick: { size: [0.035, 0.07, 3.8], at: [27.18, -9], r: 0.05 }
	},
	{
		id: 'CT supply cart on the west wall',
		pick: { size: [0.5456, 0.05, 0.3872], at: [27.28, -12.4], r: 0.05 },
		flush: { axis: 'x', face: 27.08, side: 'min' }
	}
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected:
- `SCENE CHECK placements FAIL: 175 placements, 14 problems`;
- each a `picked 0 meshes (expected 1)` line, for:
  - `manager screen on the desk`;
  - the CT control keyboard and mouse;
  - the three `CT control chair at z …` entries;
  - the four `CT control … screen in front of the board` entries;
  - the four new CT control ids;
- `exit 1`.

- [ ] **Step 2: The manager's office (R3-7)**

In `rooms.ts`, `case 'manager'`, replace (≈1242-1245):

```ts
			// the desk stands just in front of the visitor chairs (seat fronts at z = room.z + 1.22), the
			// manager on its door side facing them; the screen faces the manager
			desk(g, room.x, room.z + 0.5, 2.5, 0.85);
			monitor(g, room.x, 1.435, room.z + 0.75, Math.PI, 1.0, 0.55);
```

with:

```ts
			// the desk stands just in front of the visitor chairs (seat fronts at z = room.z + 1.22), the
			// manager on its door side. The screen stands on the desk's door-side +x end (x 20.23..21.19,
			// z 8.13..8.62), turned 23 deg toward the chairs' middle: the chairs see the screen and the door
			// its dark back, and it no longer stands between the manager and Chris Evans.
			desk(g, room.x, room.z + 0.5, 2.5, 0.85);
			monitor(g, room.x + 0.7, 1.435, room.z + 0.4, -0.4, 1.0, 0.55);
```

In `npc.ts`:
- the manager's heading (`place('manager', …)`, ≈741): `0,` → `-0.7,`;
- Chris Evans's heading (`secondary('manager', 'Chris Evans', …)`, ≈946): `0.65,` → `2.44,`.

They now face each other across the desk's clear -x end. Positions, graph nodes and the manager[0] → linaccontrol hand-over are unchanged.

- [ ] **Step 3: The console group against the west wall (R3-8)**

In `rooms.ts`, `case 'ctcontrol'`, replace (≈1253-1256, after Step 2's two comment lines):

```ts
			desk(g, room.x - 1.2, room.z - 0.2, 4.8, 1.15, Math.PI / 2);
			// the operators' chairs face the console, seat fronts 0.5 m from the desk edge (x 30.875)
			for (let i = -1; i <= 1; i++)
				taskChair(g, room.x + 0.15, room.z + i * 1.15, -Math.PI / 2, 0x4c6776);
```

with:

```ts
			// the console against the west wall (inner face x 27.08), opposite the window: top
			// x 27.085..27.975, z -11.6..-6.8, 0.89 deep (nothing stands behind the backing board on the wall)
			desk(g, room.x - 3.97, room.z - 0.2, 4.8, 0.89, Math.PI / 2);
			// the operators' chairs face the console, seat fronts 0.5 m from the desk edge (x 27.975)
			for (let i = -1; i <= 1; i++)
				taskChair(g, room.x - 2.75, room.z + i * 1.15, -Math.PI / 2, 0x4c6776);
```

Replace the cart's position (≈1276):

```ts
			ccart.position.set(room.x + 0.8, 0, room.z - 3.25);
```

with:

```ts
			// against the west wall at the console's -z end, drawers facing the room (+x), the handle
			// toward the console; its top 0.006 m off the wall
			ccart.position.set(room.x - 4.22, 0, room.z - 3.4);
			ccart.rotation.y = Math.PI / 2;
```

In `addClinicalWallPolish`, replace (≈1820-1823):

```ts
	const ctPlate = box(0.08, 2.35, 4.2, dark, 30.02, 1.75, -9);
	g.add(ctPlate);
	const ctAccent = box(0.035, 0.07, 3.8, glow, 30.08, 2.92, -9);
	g.add(ctAccent);
```

with:

```ts
	// CT control's console stands against the room's west wall (inner face x 27.08)
	const ctPlate = box(0.08, 2.35, 4.2, dark, 27.12, 1.75, -9);
	g.add(ctPlate);
	const ctAccent = box(0.035, 0.07, 3.8, glow, 27.18, 2.92, -9);
	g.add(ctAccent);
```

In `equipment.ts`, `buildCtLiveConsole`, replace lines 537-539:

```ts
	// the four screens stand side by side in a 2 x 2 grid on the desk, in front of the backing board
	// (x 29.98..30.06), facing the operators (+x): status and gantry on the -z side, patient and room on +z
	const mx = r.x - 1.35;
```

with:

```ts
	// the four screens stand side by side in a 2 x 2 grid on the desk, in front of the backing board
	// (x 27.08..27.16), facing the operators (+x): status and gantry on the -z side, patient and room on +z
	const mx = r.x - 4.25;
```

and line 610:

```ts
	consoleKeyboard(g, r.x - 0.9, r.z + 0.65, rot);
```

with:

```ts
	consoleKeyboard(g, r.x - 3.8, r.z + 0.65, rot);
```

The mouse follows, to (27.7, -8.83).

`ct_console` (`EQUIPMENT_SPECS`, line 1207): `dx: -1.2,` → `dx: -3.9,`. The anchor and its ring then sit under the moved desk, ring x 27.11..28.09, inside the room.

- [ ] **Step 4: CT control people, spots, graph and finals**

In `npc.ts`:
- the CT simulation therapist (`place('ctcontrol', …)`, ≈751): `1.2,` → `-1.7,`. They stand at (29.8, -6.6);
- Avery Woods (`secondary('ctcontrol', 'Avery Woods', …)`, ≈957): `-0.4,` → `-3.3,`. Avery stands at (28.2, -11.0), 0.225 m off the desk front as today.

In `room-routes.ts`, the ctcontrol spots (≈65-67):

```ts
		{ x: 32.75, z: -7.25, facing: -1.57 },
		{ x: 32.75, z: -8.45, facing: -1.57 },
		{ x: 33.35, z: -7.85, facing: -1.57 }
```

→

```ts
		{ x: 29.85, z: -7.25, facing: -1.57 },
		{ x: 29.85, z: -8.45, facing: -1.57 },
		{ x: 30.45, z: -7.85, facing: -1.57 }
```

The comment above them ("behind the operators' chairs, facing the console") stays true.

Replace the ctcontrol graph (≈350-368, from `// in through the door, then down behind` to the graph's closing `},`):

```ts
	// in through the door, then down behind the operators' chairs (seats x 31.4..31.9, backs to 31.88):
	// the 0.5 m between the console (to x 30.875) and the seats is too narrow to walk
	ctcontrol: {
		nodes: [
			[31.5, -3.15], // 0 door
			[31.5, -4.5], // 1 inside the door
			[31.2, -5.6], // 2 toward the console's +z end
			[32.6, -6.95], // 3 north of the chairs: the therapist (32.7, -6.6) and spot [0]
			[32.6, -8.5], // 4 behind the chairs: spots [1] and [2], scan place (32.3, -8.45)
			[32.6, -10.5] // 5 behind the south chair: the partner (31.1, -11.0) leaves along ~18 deg
		],
```

with:

```ts
	// in through the door, then down behind the operators' chairs (seats x 28.50..29.00, backs to
	// 28.98): the 0.5 m between the console against the west wall (to x 27.975) and the seats is too
	// narrow to walk
	ctcontrol: {
		nodes: [
			[31.5, -3.15], // 0 door
			[31.5, -4.5], // 1 inside the door
			[28.3, -5.6], // 2 toward the console's +z end
			[29.7, -6.95], // 3 north of the chairs: the therapist (29.8, -6.6) and spot [0]
			[29.7, -8.5], // 4 behind the chairs: spots [1] and [2], scan place (29.4, -8.45)
			[29.7, -10.5] // 5 behind the south chair: Avery Woods (28.2, -11.0) leaves along ~18 deg
		],
```

The edges are unchanged.

In `journey.ts`, the two CT control finals (≈2145 and ≈2153; 2139 and 2147 at `22bd2a8`, and Tasks 2 and 3 add six lines above them, so find them by text):

```ts
				new THREE.Vector3(32.3, 0, -7.2),
```

→ `new THREE.Vector3(29.4, 0, -7.2),`, and

```ts
				new THREE.Vector3(32.3, 0, -8.45),
```

→ `new THREE.Vector3(29.4, 0, -8.45),`.

- [ ] **Step 5: Write the ctRunner sweep script and run it on today's loop**

The script reads the ctRunner's points and speed straight from `npc-behavior.ts`. It builds the same curve the mover walks (`CatmullRomCurve3`, closed, tension 0.12) and prints the loop's length and pace. For the part inside CT control it also prints the closest approach to:
- the door-wall cabinet's box;
- the window, back and door walls;
- the therapist, the spots and finals, and the moved console and chairs;
- the CT control room-inspect camera at (34.7, -6.1).

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cat > "$P2/ctrunner-sweep.mjs" <<'JS_EOF'
// The ctRunner's loop as npc-behavior.ts defines it, swept along its real curve (moverPath: closed
// Catmull-Rom, tension 0.12): length, pace (speed constant x length), and inside CT control
// (x 27..36, z -14..-4) the closest approach of the path's centre line to what a walker must clear.
import fs from 'node:fs';
import * as THREE from '/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web/node_modules/three/build/three.module.js';
const src = fs.readFileSync('/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web/arcade-src/sim-hub/src/npc-behavior.ts', 'utf8');
const at = src.indexOf('addMover(\n\t\tctRunner,');
const block = src.slice(at, src.indexOf("'ctRunner'", at));
const pts = [...block.matchAll(/\[(-?[\d.]+), 0, (-?[\d.]+)\]/g)].map((m) => [+m[1], +m[2]]);
const speed = +block.match(/\n\t\t\],\n\t\t([\d.]+),/)[1];
const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.12);
const len = c.getLength();
const boxD = (x, z, x0, x1, z0, z1) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
const r = { camera: 1e9, cabinet: 1e9, window: 1e9, back: 1e9, doorWall: 1e9, therapist: 1e9, spots: 1e9, console: 1e9 };
for (let i = 0; i < 4000; i++) {
	const p = c.getPointAt(i / 4000);
	if (p.x < 27 || p.x > 36 || p.z > -4) continue;
	r.camera = Math.min(r.camera, Math.hypot(p.x - 34.7, p.z + 6.1));
	r.cabinet = Math.min(r.cabinet, boxD(p.x, p.z, 33.9, 35.5, -4.535, -4.085));
	r.window = Math.min(r.window, 35.92 - p.x);
	r.back = Math.min(r.back, p.z + 13.92);
	if (p.x > 32.8) r.doorWall = Math.min(r.doorWall, -4.08 - p.z);
	r.therapist = Math.min(r.therapist, Math.hypot(p.x - 29.8, p.z + 6.6));
	for (const [sx, sz] of [[29.85, -7.25], [29.85, -8.45], [30.45, -7.85], [29.4, -7.2], [29.4, -8.45]])
		r.spots = Math.min(r.spots, Math.hypot(p.x - sx, p.z - sz));
	r.console = Math.min(r.console, boxD(p.x, p.z, 27.085, 29.0, -11.6, -6.8));
}
console.log(`points ${pts.length}, length ${len.toFixed(3)} m, speed ${speed}, pace ${(speed * len).toFixed(4)} m/s`);
console.log(Object.entries(r).map(([k, v]) => `${k} ${v < 1e8 ? v.toFixed(3) : 'n/a'}`).join(', '));
JS_EOF
node "$P2/ctrunner-sweep.mjs"
```

Expected on today's loop (before Step 6):

```
points 36, length 38.017 m, speed 0.011397, pace 0.4333 m/s
camera 3.347, cabinet 2.444, window 4.462, back 1.770, doorWall n/a, therapist 0.123, spots 0.241, console 0.000
```

The console at 0.000 shows the old loop runs where the desk now stands, which is why it moves.

- [ ] **Step 6: The ctRunner's in-room loop on the window side**

In `apps/web/arcade-src/sim-hub/src/npc-behavior.ts`, replace the comment (lines 653-657):

```ts
			// Out of CT control at x = 31.45 (door lane), corridor lanes z = -1.4 / -2.6, in at x = 30.65;
			// the west-bound lane passes north of the parked wheelchair at (28.6, -1.4) at z = -0.85.
			// Inside CT control the loop stays west of x = 30 (down x = 28, back up x = 29.1), clear of
			// the idle staff and of where the CT journey and the ctsim handoff leave the therapists
			// (32.3, -8.45), (32.75, -7.25), (32.3, -7.2).
```

with:

```ts
			// Out of CT control at x = 31.45 (door lane), corridor lanes z = -1.4 / -2.6, in at x = 30.65;
			// the west-bound lane passes north of the parked wheelchair at (28.6, -1.4) at z = -0.85.
			// Inside CT control the loop keeps to the window side (down x = 33.6, back up x = 34.8): 1.1 m
			// off the window wall, 1.77 m off the back wall and 0.8 m from the door-wall cabinet, clear of
			// the console group on the west wall, the idle staff and where the CT journey and the ctsim
			// handoff leave the therapists (29.4, -8.45), (29.85, -7.25), (29.4, -7.2). The loop is
			// 39.77 m; the speed constant keeps its 0.433 m/s.
```

Replace the in-room points (lines 678-693), from `[29.9, 0, -5.3],` through `[31, 0, -5.5]`:

```ts
			[29.9, 0, -5.3],
			[28.9, 0, -5.6],
			[28.2, 0, -6.4],
			[28, 0, -8],
			[28, 0, -9.5],
			[28, 0, -11],
			[28.1, 0, -11.8],
			[28.55, 0, -12.15],
			[29, 0, -11.8],
			[29.1, 0, -11],
			[29.1, 0, -9.5],
			[29.1, 0, -8],
			[29.1, 0, -7.2],
			[29.6, 0, -6.6],
			[30.4, 0, -6],
			[31, 0, -5.5]
		],
		0.011397,
```

with:

```ts
			[31.2, 0, -5.7],
			[32.4, 0, -6.1],
			[33.6, 0, -6.9],
			[33.6, 0, -8.5],
			[33.6, 0, -11.0],
			[33.8, 0, -11.8],
			[34.2, 0, -12.15],
			[34.6, 0, -11.8],
			[34.8, 0, -11.0],
			[34.8, 0, -8.5],
			[34.8, 0, -7.0],
			[34.4, 0, -5.9],
			[33.4, 0, -5.2],
			[32.4, 0, -4.95]
		],
		0.010895,
```

**The controller accepted plan-time finding 1,** so change three things:
- the last four points become `[34.6, 0, -7.5], [34.0, 0, -6.9], [33.4, 0, -6.3], [32.4, 0, -5.25]`;
- the constant becomes `0.011124`;
- in the comment, "0.8 m from the door-wall cabinet" becomes "1.57 m" and "39.77 m" becomes "38.95 m".

Run the sweep again:

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
node "$P2/ctrunner-sweep.mjs"
```

Expected with the spec's loop:

```
points 34, length 39.768 m, speed 0.010895, pace 0.4333 m/s
camera 0.197, cabinet 0.827, window 1.113, back 1.770, doorWall 0.956, therapist 1.651, spots 2.055, console 2.417
```

With finding 1's loop: `length 38.952 m, speed 0.011124, pace 0.4333 m/s` and `camera 1.061, cabinet 1.567, window 1.114, back 1.770, doorWall 1.576, therapist 1.651, spots 2.055, console 2.417`.

Either way the pace is 0.433 m/s as today. The body clears the walls (check a needs 0.3 m), the cabinet and the people.

- [ ] **Step 7: Build and run every check**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P2/npc-t4.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P2/npc-t3.log") <(grep '^NPC CHECK' "$P2/npc-t4.log"); grep 'closest to furniture\|mover loop rings\|longest hold\|seat facing' "$P2/npc-t4.log"
node scripts/sim-hub-scene-check.mjs --only placements --dump "$P2/dump-t4.json" >/dev/null && node "$P2/cull-count.mjs" "$P2/dump-t4.json"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P2/vis-t4.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures' "$P2/vis-t4.log"
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- **scene check:** signs PASS (163), legs PASS, `SCENE CHECK placements PASS: 175 placements, 0 problems`, `exit 0`;
- **NPC check:** `exit 0`. The diff shows only the g line: `except 6 across a work surface` → `except 9 across a work surface`. The three CT control chairs (seat anchors at x 28.69, facing -x) meet the west wall 1.61 m ahead, across the desk top, which ends 0.005 m from the wall. Every other line is unchanged:
  - a: `0 wall-clipping samples across 10 movers`;
  - b: no pair closer than 0.5 m;
  - e PASS;
  - k `114`, l `21 … 15 … 38`, m `66 moments`;
- **seat-facing info:** five lines and `seat facing: ... and 4 more across a work surface`;
- **mover-loop info:** the ctRunner's ring depth (was 1.1 cm), expected lower now that the loop runs on open floor;
- **cull groups:** manager 45, ctcontrol 124; the rest as after Task 3;
- **visibility:** 301 poses, 0 failures (`ctcontrol glass into ctsim` included);
- **vitest:** 4 files, 77 tests (the new ctcontrol graph's farthest pair is nodes 0 and 5, joined 0-1-2-3-4-5);
- `check exit 0`.

**If a check fails** (plan-time finding 2: this part was never run through the NPC check):
- a, b, e or l's mover-loop ring naming `ctRunner`: move the in-room loop points. Keep them at least 1.1 m off the window wall (x 35.92), 0.8 m from the cabinet box and 1.5 m from the spots, re-time the constant to `0.4333 / length` with `$P2/ctrunner-sweep.mjs`, and report the points.
- k, l or m naming a CT control person, spot or final: these moved by exactly Δx -2.90 with the console, so first diff the moved values against the spec's table (R3-8). If they match, nudge the failing spot, node or final in NPC data and report.
- Never edit the check.

- [ ] **Step 8: After shots**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P2/shots-p2.json" "$P2/t4.json" mgr-visitor mgr-door manager-desk manager-office ctcontrol-door ctcontrol-window-view ctcontrol-room ctcontrol-backwall ctcontrol-console
node "$SHOTS" "$P2/after" - "$P2/t4.json"
```

Expected: nine PNGs. Check:
- `mgr-visitor`: the screen faces the camera (the visitor chairs);
- `mgr-door`: from the door, the monitor's dark back is at the desk's right end, and the manager and Chris face each other;
- `manager-desk` and `manager-office`: the manager is turned toward Chris;
- `ctcontrol-door`: the console, chairs and backing board are against the far-left (west) wall, with the cart against the same wall at its end; the window side is open floor;
- `ctcontrol-room`, `ctcontrol-backwall`, `ctcontrol-console`: the console on the wall, nothing floating mid-room;
- `ctcontrol-window-view`: the window. If the ctRunner happens to stand in front of it at the shot's fixed clock, note it; it is not a defect.

- [ ] **Step 9: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts arcade-src/sim-hub/src/journey.ts arcade-src/sim-hub/src/npc-behavior.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts arcade-src/sim-hub/src/journey.ts arcade-src/sim-hub/src/npc-behavior.ts scripts/sim-hub-scene-check.mjs
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/npc.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/arcade-src/sim-hub/src/journey.ts apps/web/arcade-src/sim-hub/src/npc-behavior.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): manager's screen turned to the visitors; CT control console and supply cart against the west wall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The CT room (R3-9)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts:1296-1311` (`ctScanner`), `:903, 934-942` (`immobilizationStorage`).
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (earlier tasks added 2 lines above `iv1` and 33 above the ctsim case):
  - `addCirculationProps`: `iv1` (≈462-464; `22bd2a8`: 460-462);
  - `case 'ctsim'`: ≈1305-1308 (1272-1275) and ≈1338-1349 (1305-1316);
  - `addClinicalWallPolish`: the teal bar (≈1834; 1800).
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts:1176-1177` (`ct_immobilization`).
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts`: ctsim node 1 comment (≈375; `22bd2a8`: 366).
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs`: the gantry comment and entry (≈239-248); append 13 pins.
- Scratch: `$P2/npc-t5.log`, `$P2/vis-t5.log`, `$P2/dump-t5.json`, `$P2/t5.json`.

**Interfaces:**
- Consumes: `$P2/npc-t4.log`.
- Produces: `immobilizationStorage(g, x, z, rot = 0, label = 'IMMOBILIZATION', signOffset = 0.28)`. The sign stands `signOffset` m along the rack's facing; a negative value puts it behind, on the wall. The vault calls (rot π, default offset) are unchanged.

- [ ] **Step 1: Edit and add the failing placements (RED)**

In `apps/web/scripts/sim-hub-scene-check.mjs`, replace the gantry comment and entry (≈239-248):

```js
	// R9: the CT gantry, at the owner's 1.25x real size (a 2.625 m ring centred 1.25 m up, so the
	// couch clears its bore), stands under the 3.75 m ceiling with its foot just under the floor; the
	// sagittal laser over it is on the ceiling (slab underside y 3.71), not hanging where the old
	// ring's bore was
	{
		id: 'CT gantry 1.25x real size',
		pick: { geom: 'TorusGeometry', size: [0.9375, 0.375], at: [44, -9.5] },
		minY: -0.06,
		maxY: 2.57
	},
```

with:

```js
	// R9, R3-9: the CT gantry, at the owner's 1.35x real size (a 2.835 m ring centred 1.31 m up, so the
	// couch clears its bore glow), stands under the 3.75 m ceiling with its foot 0.1075 m under the
	// floor, hidden by the 2.1 m base; the sagittal laser over it is on the ceiling (slab underside
	// y 3.71), not hanging where the old ring's bore was
	{
		id: 'CT gantry 1.35x real size',
		pick: { geom: 'TorusGeometry', size: [1.0125, 0.405], at: [44, -9.5] },
		minY: -0.1075,
		maxY: 2.73
	},
```

Append at the end of `PLACEMENTS` (add a comma after `CT supply cart on the west wall`):

```js
	// R3-9: the CT room. The gantry's bore glow and base at 1.35x; the IV pole beside the couch's head
	// end, off the doorway; on the east wall the two cabinets, the immobilization rack (its sign on the
	// wall above it, the intercom speaker raised clear of the sign), the shelf and the stool under it;
	// the sink's splashback flush on the back wall; the teal light bar on the door wall; the laser
	// warning outside on the hallway face, left of the door
	{
		id: 'CT gantry bore glow at 1.35x',
		pick: { geom: 'TorusGeometry', size: [0.6075, 0.02], at: [44, -9.5], y: 1.31 }
	},
	{
		id: 'CT gantry base 2.1 m long',
		pick: { size: [1.0, 0.35, 2.1], at: [44, -9.5], r: 0.05 }
	},
	{
		id: 'CT room IV pole by the couch head',
		pick: { geom: 'CylinderGeometry', size: [0.0285, 0.0285, 1.4725], at: [38.6, -10.5], r: 0.05 }
	},
	...[
		['A', -16.2],
		['B', -6.2]
	].map(([which, z]) => ({
		id: `CT room cabinet ${which} flush on the east wall`,
		pick: { size: [2.2, 1.8, 0.5], at: [51.665, z] },
		flush: { axis: 'x', face: 51.92, side: 'max' }
	})),
	{
		id: 'CT room sink splash flush on the back wall',
		pick: { size: [1.52, 0.78, 0.07], at: [48.75, -18.87] },
		flush: { axis: 'z', face: -18.92, side: 'min' }
	},
	{
		id: 'CT immobilization rack flush on the east wall',
		pick: { size: [1.7, 2.0, 0.5], at: [51.665, -12.6] },
		flush: { axis: 'x', face: 51.92, side: 'max' }
	},
	{
		id: 'CT room shelf on the east wall',
		pick: { size: [1.2, 0.04, 0.28], at: [51.78, -14.3] },
		flush: { axis: 'x', face: 51.92, side: 'max' }
	},
	{
		id: 'CT room stool under the shelf',
		pick: { geom: 'CylinderGeometry', size: [0.22, 0.22, 0.06], at: [51.3, -14.3], r: 0.05 }
	},
	{
		id: 'CT room speaker above the immobilization sign',
		pick: { size: [0.34, 0.34, 0.08], at: [51.78, -13.2], y: 2.95, r: 0.1 },
		minY: 2.78
	},
	{
		id: 'CT room teal bar on the door wall',
		pick: { size: [7.2, 0.04, 0.08], at: [44, -3.12] },
		flush: { axis: 'z', face: -3.08, side: 'max' }
	},
	{
		id: 'CT laser plaque outside, left of the door',
		pick: { geom: 'PlaneGeometry', size: [1.35, 0.82], at: [41.6, -2.87], r: 0.05 },
		flush: { axis: 'z', face: -2.92, side: 'min' }
	},
	{
		id: 'CT laser plaque inside the room removed',
		pick: { geom: 'PlaneGeometry', size: [1.35, 0.82], at: [51.77, -15.3] },
		absent: true
	}
```

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node scripts/sim-hub-scene-check.mjs --only placements; echo "exit $?"
```

Expected:
- `SCENE CHECK placements FAIL: 188 placements, 14 problems`;
- `picked 0 meshes (expected 1)` for: `CT gantry 1.35x real size`, the bore glow, the base, the IV pole, both cabinets, the sink splash, the rack, the shelf, the stool, the teal bar, and the plaque outside;
- `CT room speaker above the immobilization sign`: either `picked 0 meshes (expected 1)` or `bottom at y 2.680 (expected 2.78)`, depending on rounding at the pick's edge (plan-time finding 4);
- `CT laser plaque inside the room removed: still there (PlaneGeometry …)`;
- `exit 1`.

- [ ] **Step 2: The gantry at 1.35× and the immobilization builder**

In `apps/web/arcade-src/sim-hub/src/props.ts`, `ctScanner`, replace lines 1296-1301:

```ts
	// a big-bore CT gantry at 1.25x real size (owner's choice): a 2.625 m ring with a 1.125 m bore,
	// centred 1.25 m up (its foot sits 0.06 m under the floor, behind the base) so the couch's bottom
	// corners (y 0.875, z ±0.36) clear the bore by 0.04 m when the couch slides the patient in
	const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9375, 0.375, 18, 54), MAT.white);
	ring.rotation.y = Math.PI / 2;
	ring.position.set(room.x, 1.25, room.z + 1.5);
```

with:

```ts
	// a big-bore CT gantry at 1.35x real size (owner's choice, 2026-11-06): a 2.835 m ring with a
	// 1.215 m bore, centred 1.31 m up, so the couch's bottom corners (y 0.875, z ±0.36) clear the bore
	// glow by 0.023 m when the couch slides the patient in. Its foot sinks 0.1075 m under the floor; the
	// 2.1 m base hides the ring where it meets the base top (the ring's half-width there is 1.043)
	const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0125, 0.405, 18, 54), MAT.white);
	ring.rotation.y = Math.PI / 2;
	ring.position.set(room.x, 1.31, room.z + 1.5);
```

Line 1305: `new THREE.TorusGeometry(0.5625, 0.02, 14, 48),` → `new THREE.TorusGeometry(0.6075, 0.02, 14, 48),`.

Line 1311: `const base = box(1.0, 0.35, 2.0, MAT.white, room.x, 0.175, room.z + 1.5);` → `const base = box(1.0, 0.35, 2.1, MAT.white, room.x, 0.175, room.z + 1.5);`.

The couch and its base do not change, so check h (the lying patient, couch slid 0..3.15 m) measures the same top.

In `immobilizationStorage`, replace the signature (line 903):

```ts
export function immobilizationStorage(g, x, z, rot = 0, label = 'IMMOBILIZATION') {
```

with:

```ts
// signOffset: how far along the rack's facing its sign stands from the frame's centre (negative:
// behind it, on the wall the rack stands against)
export function immobilizationStorage(g, x, z, rot = 0, label = 'IMMOBILIZATION', signOffset = 0.28) {
```

Replace the sign call's position (lines 934-938):

```ts
	interiorRoomSign(
		g,
		x,
		2.42,
		z + Math.cos(rot) * 0.28,
```

with:

```ts
	interiorRoomSign(
		g,
		x + Math.sin(rot) * signOffset,
		2.42,
		z + Math.cos(rot) * signOffset,
```

The two vault calls (rooms.ts ≈1441 and ≈1519, rot π, no offset) place their signs where they do today: sin π adds 0.

- [ ] **Step 3: The IV pole, the east wall, the sink, the speaker, the plaque, the shelf and stool**

In `rooms.ts`, `addCirculationProps`, replace (≈462-464):

```ts
	const iv1 = ivPoleObject(0.95);
	iv1.position.set(43.5, 0, -5.6);
	scene.add(iv1);
```

with:

```ts
	const iv1 = ivPoleObject(0.95);
	// CT room: beside the CT couch at the patient's head end, on the -z side away from the door and the
	// staff lane (base x 38.38..38.82, z -10.72..-10.28, 0.42 m from the couch edge)
	iv1.position.set(38.6, 0, -10.5);
	scene.add(iv1);
```

In `case 'ctsim'`, replace (≈1307-1310, after the `iv1` edit's two comment lines):

```ts
			cabinetBank(g, room.x + 6.2, room.z - 5.2, 2.2, 1.8, 0.5, Math.PI, 0xe2e8eb);
			cabinetBank(g, room.x + 6.2, room.z + 4.8, 2.2, 1.8, 0.5, Math.PI, 0xe2e8eb);
			immobilizationStorage(g, room.x + 6.05, room.z - 0.15, Math.PI / 2, 'CT IMMOBILIZATION');
			sinkStation(g, room.x + 4.6, room.z - 6.55, 0);
```

with:

```ts
			// the two storage cabinets flush on the east wall (x 51.415..51.915), drawers facing the
			// room: A at z -17.3..-15.1, B at z -7.3..-5.1, 1.7 m from the wheelchair
			cabinetBank(g, room.x + 7.665, room.z - 5.2, 2.2, 1.8, 0.5, -Math.PI / 2, 0xe2e8eb);
			cabinetBank(g, room.x + 7.665, room.z + 4.8, 2.2, 1.8, 0.5, -Math.PI / 2, 0xe2e8eb);
			// the immobilization rack flush on the east wall between cabinet A and the patient-info
			// screen, facing the room; its sign hangs on the wall above it (x 51.865, y 2.11..2.73)
			immobilizationStorage(g, room.x + 7.665, room.z - 1.6, -Math.PI / 2, 'CT IMMOBILIZATION', -0.2);
			// the sink's splashback flush on the back wall (its back at z -18.905, so the soap dispenser
			// stays 1 cm inside the room's cull box); 0.15 m east of the
			// old x keeps the rail and the sign clear of the back wall's teal panel (to x 47.84)
			sinkStation(g, room.x + 4.75, room.z - 7.51, 0);
```

Then replace (≈1346-1357):

```ts
			wallSpeaker(g, room.x + 7.78, 2.85, room.z - 2.2, -Math.PI / 2);
			warningPlaque(
				g,
				room.x + 7.77,
				2.25,
				room.z - 4.3,
				-Math.PI / 2,
				'CT SIMULATION',
				'LASERS MAY BE ACTIVE'
			);
			wallShelf(g, room.x + 5.3, 1.35, room.z - 1.4, 1.2, Math.PI);
			stool(g, room.x + 4.9, room.z - 1.5, 0x688596);
```

with:

```ts
			// the intercom speaker, raised clear of the immobilization sign's top (box y 2.78..3.12)
			wallSpeaker(g, room.x + 7.78, 2.95, room.z - 2.2, -Math.PI / 2);
			// the laser warning belongs at the entrance: on the hallway face of the door wall, left of the
			// door (x 40.925..42.275, y 1.34..2.16, 0.05 m off the face), below the header sign. It goes in
			// `scene`, not this room's group: a plaque outside the room in `g` would stop the culling pass
			// (visibility.ts groupRoomContents) from taking the room's furniture into its cull group.
			warningPlaque(scene, 41.6, 1.75, -2.87, 0, 'CT SIMULATION', 'LASERS MAY BE ACTIVE');
			// a shelf on the east wall between cabinet A and the rack (z -14.9..-13.7), the stool under it
			wallShelf(g, room.x + 7.78, 1.35, room.z - 3.3, 1.2, Math.PI / 2);
			stool(g, room.x + 7.3, room.z - 3.3, 0x688596);
```

In `addClinicalWallPolish`, replace (≈1840):

```ts
		const l = box(7.2, 0.04, 0.08, glow, ct.x, 3.15, ct.z + 5.8);
```

with:

```ts
		// the CT room's teal light bar on its door wall's inner face (z -3.08), across the lintel above
		// the door frame, instead of hanging 2.2 m in from the wall
		const l = box(7.2, 0.04, 0.08, glow, ct.x, 3.15, ct.z + ct.d / 2 - 0.12);
```

In `equipment.ts`, `ct_immobilization` (lines 1176-1177): `dx: 6.05,` → `dx: 7.42,` and `dz: -0.15,` → `dz: -1.6,`. The anchor's floor ring is then centred on the rack's front, x 50.93..51.91.

In `room-routes.ts`, replace line ≈375:

```ts
			[43.4, -4.0], // 1 inside the door, clear of the IV pole at (43.5, -5.6)
```

with:

```ts
			[43.4, -4.0], // 1 inside the door
```

No ctsim node, spot or final moves: the nearest are on the +z side (z ≥ -8.8), and the ring stays 1.4 m from Jasmine (45.8, -9.0) and from nodes 6-7.

Swept footprints:
- the couch slides only along x (top z -9.86..-9.14 at every slide 0..3.15 m), so it never reaches the IV pole's base (z ≤ -10.28);
- the clinical slide panels open inside the door wall's slab (z -3.035..-2.965), 0.095 m behind the plaque's plane (z -2.87);
- the grown ring (x 43.595..44.405, z -10.92..-8.08, y up to 2.73) is 1.5 m from node 7 and 1.4 m from Jasmine.

- [ ] **Step 4: Build and run every check**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
node scripts/sim-hub-npc-check.mjs > "$P2/npc-t5.log" 2>&1; echo "exit $?"; diff <(grep '^NPC CHECK' "$P2/npc-t4.log") <(grep '^NPC CHECK' "$P2/npc-t5.log")
node scripts/sim-hub-scene-check.mjs --only placements --dump "$P2/dump-t5.json" >/dev/null && node "$P2/cull-count.mjs" "$P2/dump-t5.json"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P2/vis-t5.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures' "$P2/vis-t5.log"
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
```

Expected:
- **scene check:** `exit 0`.
  - The signs rule still reads 163 panels. The plaque moved: its plane is 0.05 m off the hallway face. The immobilization sign's two faces are 0.055 m off the east wall.
  - legs PASS.
  - `SCENE CHECK placements PASS: 188 placements, 0 problems`.
- **NPC check:** `exit 0`, no diff output. h still reads `also with the CT couch slid 0, 1, 2, 3.15 m`.
- **cull groups:** `ctsim: 149 culled` (the plaque left for `scene`); the rest as after Task 4.
  - If ctsim drops far below 149, the CT room's furnish group is no longer culled: some item lies outside the room's rect, inset 0.05.
  - The likely one is the sink's soap dispenser (plan-time finding 6). Report it; do not move the sink without the controller.
- **visibility:** 301 poses, 0 failures.
- **vitest:** 4 files, 77 tests.
- `check exit 0`.

- [ ] **Step 5: After shots**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
node -e 'const fs=require("fs");const [src,out,...names]=process.argv.slice(1);fs.writeFileSync(out,JSON.stringify(JSON.parse(fs.readFileSync(src,"utf8")).filter((s)=>names.includes(s.name))))' "$P2/shots-p2.json" "$P2/t5.json" ct-gantry ct-table ct-low ctsim-from-door ctsim-east-wall ctsim-sink ctsim-hall ctsim-couch-iv
node "$SHOTS" "$P2/after" - "$P2/t5.json"
```

Expected: eight PNGs. Check:
- `ct-gantry`: a visibly larger ring, no ring sliver showing past the base's ends;
- `ct-table` and `ct-low`: the patient on the couch, the couch clear of the bore glow;
- `ctsim-from-door`: no IV pole in the doorway's path, and no teal bar hanging in mid-air;
- `ctsim-east-wall`, from left to right along the wall:
  - cabinet A;
  - the shelf with the stool under it;
  - the rack facing the room, with its sign on the wall above it and the speaker above the sign;
  - the patient-info screen;
  - cabinet B;
  - no yellow plaque inside;
- `ctsim-sink`: the sink against the back wall, no gap behind it;
- `ctsim-hall`: the yellow LASERS MAY BE ACTIVE plaque on the hallway wall left of the CT door, below the header sign;
- `ctsim-couch-iv`: the IV pole beside the couch's head end.

- [ ] **Step 6: Format, lint, commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && pnpm exec prettier --write arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs
```

Prettier will wrap the long `immobilizationStorage` signature and call. Rebuild and rerun the scene check (exit 0) if it changed a source file.

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add apps/web/arcade-src/sim-hub/src/props.ts apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): CT gantry at 1.35x; CT room cabinets, rack, shelf and sink on the walls; IV pole by the couch; laser warning outside the door

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 (controller): Final checks, as-built notes, review, owner page, PR

**Files:**
- Modify: `docs/specs/2026-11-06-sim-hub-scenery-round3-design.md`: a `### Part 2 as built` subsection at the end of `## Verification`, after `### Part 1 as built` and before `## Out of scope / not changing`.
- Scratch: `$P2/after/*.png`, `$P2/final-*.log`, `$P2/dump-final.json`.

- [ ] **Step 1: Every check, from a clean build**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git status --short && git log --oneline 22bd2a8..HEAD
cd apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs > "$P2/final-scene.log" 2>&1; echo "exit $?"; cat "$P2/final-scene.log"
node scripts/sim-hub-npc-check.mjs > "$P2/final-npc.log" 2>&1; echo "exit $?"; grep '^NPC CHECK' "$P2/final-npc.log"; grep 'closest to furniture\|mover loop rings' "$P2/final-npc.log"
node scripts/sim-hub-scene-check.mjs --only placements --dump "$P2/dump-final.json" >/dev/null && node "$P2/cull-count.mjs" "$P2/dump-final.json"
ANGLE=metal node scripts/sim-hub-visibility-check.mjs > "$P2/final-vis.log" 2>&1; echo "vis exit $?"; grep -E 'poses checked|poses with failures' "$P2/final-vis.log"
pnpm exec vitest run --project server arcade-src/sim-hub/src
pnpm check >/dev/null; echo "check exit $?"
pnpm test > "$P2/final-test.log" 2>&1; echo "test exit $?"; tail -6 "$P2/final-test.log"
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
pnpm exec prettier --check .
```

Expected, as in the spec's Verification (Part 2):
- `git status`: clean. The log shows the plan commit and the five task commits.
- **Scene check:** exit 0; signs PASS (163 panels); legs PASS (20 chairs, 3 couches); placements PASS, 188 (179 if the controller dropped finding 5's pins).
- **NPC check:** a–m PASS, with the same floors:
  - g: `8 sitters`; `except 9 across a work surface` (the 5 LINAC chairs, the consult chair and the 3 CT control chairs); `exchange facing: 6 seated patients`;
  - j: `4 stand-up flows`;
  - k: `all 114 people at rest`;
  - l: 21 + 15 + 38 = 74 routes;
  - m: `over 66 moments`;
  - a: 10 movers, 0 samples; f: 14 moments.
- **Closest-to-furniture lines:** read the ones naming the CT control and education rooms, and record them in the as-built notes.
- **Cull groups:** consult 75, patientcare 64, education 57, physics 25, radbio 23, dosimetry 77, manager 45, ctcontrol 124, ctsim 149.
- **Visibility:** 301 poses, 0 failures.
- **vitest (sim-hub), `pnpm check`, smoke, prettier:** pass.
- **`pnpm test`:** the browser-project specs under `apps/web/src` may time out locally under load. Part 2 does not touch them, and CI is their gate. Note any local timeout in the PR body.

- [ ] **Step 2: By hand**

Run `pnpm dev` from `apps/web` and open `/arcade/sim-hub/index.html`. Then:
- **Walk into each Part 2 room.** Nothing stands in a doorway's walking line: consult, patient care and the CT room especially.
- **Education, at rest:** the navigator sits behind the desk with the arm pointing; the patient sits turned to the monitor.
- **The new-patient journey:**
  - Mia walks into education and sits in the free chair beside the patient.
  - On the next step the navigator stands up, walks out behind the desk's right end, and escorts Mia to the CT changing area; Mia stands up first.
- **The CT scan** (spec R3-9, "re-check the patient through a full couch slide: in, dwell, out"): the couch slides in, dwells and slides out; the lying patient and the couch stay clear of the larger ring and the bore glow.
- **CT control:**
  - the console against the west wall;
  - Inspect room: whether the ctRunner walks through the inspect camera (plan-time finding 1). Record what you see and the decision taken;
  - the ctRunner loops on the window side and does not walk into the console or the cart.

- [ ] **Step 3: All after shots**

```bash
P2=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery3/p2
SHOTS=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/shots-json.mjs
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web && node "$SHOTS" "$P2/after" - "$P2/shots-p2.json" && ls "$P2/after" | wc -l
```

Expected: 30 PNGs, with the same names as `$P2/before`. Read each pair.

- [ ] **Step 4: As-built notes**

Add `### Part 2 as built` to the spec. It records:
- the commits;
- the final counts from Step 1, including the cull-group counts;
- the closest-to-furniture lines for CT control and education;
- the decisions on plan-time findings 1, 3, 4, 5 and 6, and what Step 2 found about the inspect camera;
- any deviation an implementer reported, with its reason.

Commit:

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git add docs/specs/2026-11-06-sim-hub-scenery-round3-design.md
git commit -m "docs(sim-hub): scenery round 3 Part 2 as-built notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Final whole-branch review, then fixes**

Review `22bd2a8..HEAD` against Part 2 of the spec with the agentmaster-review skill (or superpowers:requesting-code-review).
- Dispatch fixes one at a time, never while another dispatch is running.
- Rerun Step 1 after any fix.

- [ ] **Step 6: The owner's before/after page**

Publish a before/after artifact from `$P2/before` and `$P2/after` (30 pairs), like the earlier rounds. It has one caption per room:
- the spec section;
- what changed, in plain words;
- for education and CT control, who now sits or walks where.

- [ ] **Step 7: Push and open the PR**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && git push -u origin fix/sim-hub-scenery-r3-rooms
gh pr create --title "fix(sim-hub): scenery round 3, Part 2 (the rooms)" --body "$(cat <<'BODY_EOF'
Part 2 of the owner's 2026-11-06 scenery list (spec: docs/specs/2026-11-06-sim-hub-scenery-round3-design.md, R3-1 to R3-9).

- Consult: the desk, screen and chair on the left wall, the cabinet beside the desk, both IV poles parked in the back corner, the brochure rack on the wall.
- Patient care: one supply wall (a drawer counter and both carts) on the left wall; the doorway is clear.
- Education: the desk by the TV wall with the navigator seated behind it, the patient seated facing the monitor, Mia sits in the free chair during the new-patient journey; the stray outdoor tree is gone.
- Physics: the plan-QA desk in the far corner. Radiobiology: the bench row turned across the room. Dosimetry: both cabinets flush on the wall.
- Manager: the screen turned to the visitor chairs; the manager and Chris Evans face each other.
- CT control: the console group and the supply cart against the west wall; the CT runner loops on the window side.
- CT room: the gantry at 1.35x; cabinets, immobilization rack, shelf and stool on the east wall; the sink flush on its wall; the IV pole beside the couch; the teal bar on the door wall; the laser warning outside, left of the door.

Checks: scene check 188 placements PASS; NPC check a-m PASS (g 8 sitters, 9 seats across a work surface; j unchanged at 4 flows); visibility 301 poses, 0 failures; sim-hub vitest and pnpm check pass. Before/after shots: see the owner page.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY_EOF
)"
```

Expected: the PR URL.

---

## Spec coverage (self-review)

| spec section | task | pins / checks | shots |
|---|---|---|---|
| R3-1 consult | 1 | desk (flush), screen, chair, cabinet (`within`), rack (`within`), IV poles ×2; node 2 comment; NPC g `except 6` | consult-enter, consult-westwall |
| R3-2 patient care | 1 | counter, cart, entrance cart (`within`), entrance `absent`; nodes 3, 4 | patientcare-entrance, patientcare-east |
| R3-3 education | 2 | screen edited, desk, 3 chairs (finding 5), tree `absent`; seated navigator, graph, spots, Mia `sit`; NPC g 8 sitters, 6 exchange; j untouched, l covers the stand-ups | education-monitor (new pose), education-enter, education-side |
| R3-4 physics | 3 | desk; `physics_planqa`; physicist, Jordan; spots, node, edge; journey camera | physics-room, physics-door |
| R3-5 radiobiology | 3 | 3 benches with `extent` (finding 3), 2 microscopes (finding 5); educator, Leah | radbio-room, radbio-top |
| R3-6 dosimetry | 3 | 2 cabinets (flush) | dosimetry-door, dosimetry-cabinet-west |
| R3-7 manager | 4 | screen edited; manager and Chris headings | mgr-visitor, mgr-door, manager-desk, manager-office |
| R3-8 CT control | 4 | R8 block edited (keyboard, mouse, chairs, screens), desk, board, accent (finding 5), cart; console, `ct_console`, people, spots, graph, finals, ctRunner (sweep; finding 1); NPC g `except 9` | ctcontrol-door, ctcontrol-window-view, ctcontrol-room, ctcontrol-backwall, ctcontrol-console |
| R3-9 CT room | 5 | gantry edited, bore and base (finding 5), IV, cabinets ×2, sink, rack, shelf, stool (finding 5), speaker (`minY`, finding 4), teal bar, plaque outside, old plaque `absent`; `ct_immobilization`; node 1 comment; check h; couch slide by hand (Task 6) | ct-gantry, ct-table, ct-low, ctsim-from-door, ctsim-east-wall, ctsim-sink, ctsim-hall, ctsim-couch-iv |
| Global constraints, Verification (Part 2) | all, 6 | 188 placements; a–m with the same floors; 301 poses; cull groups; vitest incl. room-routes.spec.ts; `pnpm check`, `pnpm test` | all 30 |
