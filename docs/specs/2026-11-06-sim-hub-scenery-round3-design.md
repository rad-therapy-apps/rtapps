# sim-hub scenery round 3: design

**Date:** 2026-11-06. **Status:** the owner approved the design summary on 2026-11-06 ("looks good"). The work ships as two PRs:

- **Part 1:** building-wide and outside, branch `fix/sim-hub-scenery-r3-building`.
- **Part 2:** the rooms, on its own branch after Part 1 merges.

The owner's request is saved verbatim (not committed) in `.superpowers/sdd/scenery-request-2026-11-06.md`, the decisions in `.superpowers/sdd/scenery3-decisions.md` and the four investigation reports in `.superpowers/sdd/scenery3-inv-{A,B,C,D}.md`. Paths are relative to `apps/web/arcade-src/sim-hub/src/` unless given in full; scripts are in `apps/web/scripts/`. Line numbers are at d70ee12, this branch's base.

## Problem

After Update 2 and the 2026-11-05 follow-ups, the owner walked the sim hub again and listed:

- boxes with a green light floating outside rooms, two of them covering the CT door signs;
- a gap beside or between every closed door leaf;
- furniture in doorways or in mid-room: IV poles, supply carts, a white block, filing cabinets, a wheelchair through a cabinet, a sink and a storage rack off their walls;
- room layouts to change: the consult desk onto the left wall, the education desk by the TV with seated people, the physics desk into the far corner, the radiobiology bench row turned, the manager's screen toward the chairs, the CT console against a wall, a slightly bigger CT gantry;
- signs: the commons name running to the sign's edges, the clinical-services arrow pointing sideways, the vault junction sign floating with wrong arrows, the CT laser warning inside the room;
- the technical hallway's north end looking jagged;
- outside: start the walk outside facing the signs, the welcome kiosk at the entrance, the light pole and plants through the monument sign, an ambulance driving on the sidewalk into the sign, small vehicles, and a player eye below the NPCs' eyes.

Four read-only investigations on 2026-11-06 measured each item from the code and from a `--dump` of every mesh's world box, and prototyped most changes in scratch copies against the scene and NPC checks:

- **A:** status lights, doors, consult, patient care, education;
- **B:** outside, lobby, eye height;
- **C:** physics, radiobiology, dosimetry, commons sign, technical hallway, manager;
- **D:** CT control, CT room, LINAC junction.

## Owner decisions (2026-11-06)

**Owner answers:**

1. **Door status lights:** mount all 10 on the wall beside each door sign (report A, option A). See P1-1.
2. **CT control console:** against the wall opposite the window, the west wall (inner face x 27.08) (report D, reading (a)). See R3-8.
3. **Lobby glass entrance:** it slides open as a person or the player approaches, like the clinical sliders. See P1-11.
4. **CT gantry:** 1.35× real size, ring centre y 1.31, base 2.1 m long so the sunk foot stays hidden. See R3-9.

**Approved summary:**

- **Walk start:** walk mode starts outside at (2.0, eye, 20.4) aimed at (-1.0, 2.0, 10.5). Boot (overview), the guided start, the Lobby button and Back are unchanged. (P1-10)
- **Eye height:** 1.87 in walk mode only, one constant. Interaction reach is still measured from 1.65. Guided-route nodes stay at 1.66. The visibility check's walk poses move to 1.87. (P1-10)
- **Kiosk:** to (2.6, 6.25), facing the doors, east of the walk-in line. (P1-9)
- **Light pole:** to (-5.75, 14.25), left of the monument sign as seen from its lettered side. (P1-12)
- **Sign plants:** one at each corner of the planter bed, (±2.85, ±0.6) from the sign centre, none inside the slab. (P1-12)
- **Ambulance:** parked at (31, 23), nose west; its arrival cycle and crew are removed for now, and check f's crew-feet part goes with them. (P1-13)
- **Vehicles:** scaled 1.6 inside an inner group, so check a measures the real footprint; the sideways wheels fixed. (P1-14)
- **Lobby blades:** CLINICAL SERVICES and PATIENT SERVICES point ↑; `makeDirectionalSign` gets an optional back-face label; all three lobby blade backs read "MAIN LOBBY ↑". (P1-8)
- **Doors:** every closed leaf spans jamb to jamb, seam 0 where the faces are hidden; baseboards stop at doorways; the two patient-care route nodes that pass through the open leaf move. (P1-2, R3-2)
- **Desk monitors:** all 13 get a dark back shell. (P1-3)
- **Header signs:** one fit rule, the name shrinks to fit 1040 px of the 1200 px canvas; no canvas-shape change. (P1-4)
- **Hallway light strips:** no shadows, which removes the stray diagonal line. (P1-5)
- **Technical hallway north end:** the right wall moves to x 2. (P1-6)
- **LINAC junction:** a solid block fills the pocket, the sign hangs on it with vault 1 ← and vault 2 →, and the blue cart in the walkway goes. (P1-7)
- **Rooms:** consult (R3-1), patient care (R3-2), education (R3-3), physics (R3-4), radiobiology (R3-5), dosimetry (R3-6), manager (R3-7), CT control (R3-8) and the CT room (R3-9), as in each section.

## Global constraints

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

---

## Part 1: building-wide and outside

### P1-1. Door status lights

- **What it is:**
  - `makeStatusBeacon` (equipment.ts:1112), placed from the `placements` table (equipment.ts:1185-1196). A dark 0.58 × 0.24 × 0.13 box with a 0.38 × 0.10 lamp 0.075 m proud of its face.
  - It is the room's status light. Outside the CT room and the vaults, it is the "X-RAY ON / BEAM ON" warning light that the vault plaque ("BEAM ON WHEN LIGHT IS ON") refers to. Elsewhere it is an in-use light.
  - It follows the room's state (`statusColorForState`, equipment.ts:1090): green when ready, amber during setup or arrival, pulsing blue during a CT scan, pulsing red at beam on, and teal during a consult or education talk. Nothing else reads it.
- **Now:** the spots are leftovers:
  - consult and education: floating 0.735 m off the hallway wall;
  - CT room and CT control: in front of the door header signs, hiding "AT" of SIMULATOR and "TR" of CONTROL;
  - physics, dosimetry, linaccontrol and hdr: inside the room;
  - both vaults: in mid-air in the maze.
- **Change:** only the `placements` table changes.
  - Each light goes on the hallway face of its door wall, centred on the sign's mid-height (3.05; vaults 3.78).
  - It is 0.10 m clear of the sign's back plate (half-width 1.96; vaults 2.41), with its back 0.005 m off the wall face.

  | room | now (x, y, z, rot) | new (x, y, z, rot) | wall face | pin side |
  |---|---|---|---|---|
  | consult | (-17.0, 3.12, -2.12, 0) | (-15.65, 3.05, -2.85, 0) | z -2.92 | min |
  | education | (-41.0, 3.12, -2.12, 0) | (-39.65, 3.05, -2.85, 0) | z -2.92 | min |
  | ctsim | (44.0, 3.2, -2.88, 0) | (46.35, 3.05, -2.85, 0) | z -2.92 | min |
  | ctcontrol | (31.5, 3.1, -3.88, 0) | (33.85, 3.05, -3.85, 0) | z -3.92 | min |
  | physics | (11.72, 3.12, -18, -π/2) | (2.85, 3.05, -15.65, -π/2) | x 2.92 | max |
  | dosimetry | (15.72, 3.12, -49, -π/2) | (1.85, 3.05, -46.65, -π/2) | x 1.92 | max |
  | linaccontrol | (51.0, 3.12, 4.12, 0) | (48.65, 3.05, 3.85, π) | z 3.92 | max |
  | vault1 | (66.72, 3.55, -18, -π/2) | (63.64, 3.78, -15.2, -π/2) | x 63.71 | max |
  | vault2 | (66.72, 3.55, 18, -π/2) | (63.64, 3.78, 15.2, -π/2) | x 63.71 | max |
  | hdr | (57.6, 3.15, 23.1, 0) | (58.15, 3.05, 21.65, π/2) | x 58.08 | min |

- **Which side:**
  - Eight lights sit right of the sign as you face the door.
  - Both vault lights sit on the main-corridor side (toward z 0), above the red entrance marker (rooms.ts:1568-1578), so vault 2's is left of its sign, mirroring vault 1 (Resolved ambiguities 1).
  - The linaccontrol light is 1.9 m from the TREATMENT AREA blade (x 46.5).
- **Clear:** A's dump query found only the mounting wall within 0.1 m of each new spot.
  - The ctsim light (x 46.06..46.64, y 2.93..3.17) is clear of the laser plaque that R3-9 moves to the other side of that door.
  - The vault lights are 10 m from the P1-7 block.
- **NPC:** none. Every light is at y 2.93..3.17 (vaults 3.66..3.90). No collider, interactable or route.
- **Checks:**
  - Add 10 pins: `{ id: 'status light beside the <room> door sign', pick: { size: [0.58, 0.24, 0.13], at: [x, z], r: 0.05 }, flush: { axis, face, side } }`, with the face and side from the table.
  - Shots:
    - `door-sign-consult-side`: eye [-13.2, 2.4, -0.6], look [-17.2, 3.0, -2.6];
    - `door-sign-ctcontrol`: eye [31.5, 1.7, -0.3], look [31.5, 3.0, -3.9];
    - `door-sign-ctsim`: eye [44, 1.7, 0.6], look [44, 3.0, -2.9];
    - the existing `vault1-door-signs`.

### P1-2. Doors and baseboards

- **What it is:**
  - `buildDoor` (rooms.ts:503-590) builds six door types. `updateDoors` (walk.ts:452-471) opens them; closed is the build pose.
  - The jambs' inner faces are exactly on the opening edges, ±gap/2 (gap 2.6, vault 4.8), and the head meets the leaf top.
  - So every gap is at the sides or the middle, where the leaves are narrower than the opening.
- **Now (closed):**

  | type (rooms) | closed leaf | gap |
  |---|---|---|
  | patientSwing (consult, social, education, patientcare), leadershipSwing (manager) | one leaf `gap * 0.88` = 2.288 (rooms.ts:529) | 0.312 at the latch jamb |
  | technicalDouble (safety, physics, radbio, engineering, qa, dosimetry, commons) | two leaves `gap * 0.48` = 1.248 (rooms.ts:541-542) | 0.104 in the middle |
  | clinicalSlide (ctcontrol, ctsim, linaccontrol) | two panels `gap * 0.47` = 1.222 at ±0.637 (rooms.ts:552-553) | 0.052 in the middle and at each jamb |
  | vaultSlide (vault1, vault2) | one leaf `gap * 0.94` = 4.512 (rooms.ts:559) | 0.144 at each jamb |
  | hdrSlide (hdr) | one leaf `gap * 0.94` = 2.444 (rooms.ts:559) | 0.078 at each jamb |

  - `addRoomBaseboards` (rooms.ts:669-679) runs the door wall's baseboard (0.18 tall, 0.07 deep, 0.1 m in from the wall line) straight across every doorway, like a kick bar. In a vault, the board hides inside the 0.58 m wall except across the doorway, where it overlaps the leaf.
- **Change:** every closed leaf spans jamb to jamb. Where two faces meet hidden, the seam is 0.
  - **Swing** (rooms.ts:529, 531):
    - `leaf = box(gap - 0.006, h, 0.08, mat, (gap - 0.006) / 2, 0, 0)`, 2.594 m. It stops 6 mm short of the latch jamb, so its corner swings clear of it (Resolved ambiguities 2).
    - The window: `addDoorWindow(pivot, (gap - 0.006) / 2, 0.35, 0.046, gap * 0.22, 0.72)`.
    - Open (-0.48π, unchanged), the clear width is 2.40 m (today 2.42).
    - The three zmax patient doors swing into the hallway, with the tip at z -0.41 (today -0.72). Doors are not colliders, and the checks skip door meshes.
  - **Double** (rooms.ts:541-542):
    - `lw = box(gap / 2, h, 0.08, mat, gap / 4, 0, 0)` and `rw = box(gap / 2, h, 0.08, mat, -gap / 4, 0, 0)`: 1.3 m each, seam 0.
    - The windows stay at ±gap × 0.24.
    - Open (±0.46π), the clear width is 2.19 m (today 2.21).
  - **Clinical slide:**
    - Panels (rooms.ts:552-553): `lw = box(gap / 2, h, 0.07, mat, -gap / 4, 0, 0)` and `rw = box(gap / 2, h, 0.07, mat, gap / 4, 0, 0)`.
    - Motion (walk.ts:464-465): `d.parts[0].position.x = -(d.gap / 4 + d.gap * 0.5 * p)` and `d.parts[1].position.x = d.gap / 4 + d.gap * 0.5 * p`.
    - Open, each panel spans gap/2..gap from the centre, inside the wall, so the full 2.6 m is clear (today the panels stop 0.026 m inside the opening).
    - The wall beside each door is long enough: ctcontrol 3.2 m, ctsim 6.7, linaccontrol 5.7.
  - **Vault and HDR slide** (rooms.ts:559):
    - `leaf = box(gap, h, 0.18, mat, 0, 0, 0)`: 4.8 m (vault) or 2.6 m (HDR).
    - Open (`off = gap * 1.02`, unchanged), the vault leaf spans 2.496..7.296 m from the centre and the HDR leaf 1.352..3.952, so both openings are clear.
  - **Baseboards:**
    - On the room's `doorSide`, the board becomes two pieces. Each runs from the corner inset (±(side length / 2 - 0.14), as today) to the opening edge (±gap/2 from the door centre).
    - Example, consult (door on zmax, centred on x -18): x -22.86..-19.3 and -16.7..-13.14, at z -3.1.
- **NPC:**
  - The player and NPCs path through the door centre (`doorPoint`, `ROOM_GRAPHS` node 0). Every open leaf stays at least 0.9 m from those lines.
  - The patient-care nodes that cross the open leaf move with R3-2, not here (Resolved ambiguities 3).
- **Checks:** pins for the closed leaves and one baseboard pair:
  - `consult door leaf jamb to jamb`: `size: [2.594, 2.55, 0.08], at: [-18.003, -3], r: 0.02`;
  - `manager door leaf jamb to jamb`: `size: [2.594, 2.55, 0.08], at: [19.997, 3.5], r: 0.02`;
  - `physics door leaves meet in the middle`: two pins, `size: [1.3, 2.55, 0.08], at: [3, -17.35]` and `at: [3, -18.65]`, `r: 0.02`;
  - `CT control door panels meet in the middle`: two pins, `size: [1.3, 2.55, 0.07], at: [30.85, -4]` and `at: [32.15, -4]`, `r: 0.02`;
  - `vault 1 door leaf jamb to jamb`: `size: [4.8, 3.15, 0.18], at: [64, -18], r: 0.02`;
  - `HDR door leaf jamb to jamb`: `size: [2.6, 2.55, 0.18], at: [58, 24], r: 0.02`;
  - `consult door-wall baseboard cut at the door`:
    - `absent` for `size: [9.72, 0.18, 0.07], at: [-18, -3.1]`;
    - pins for `size: [3.56, 0.18, 0.07]` at [-21.08, -3.1] and [-14.92, -3.1].
  - Shots (A's poses):
    - `door-consult-hall`: eye [-18, 1.5, 0.4], look [-18, 1.3, -3];
    - `door-physics-hall`: eye [-0.4, 1.5, -18], look [3, 1.3, -18];
    - `door-ctcontrol-in`: eye [31.5, 1.5, -7.6], look [31.5, 1.3, -4];
    - `door-vault1-hall`: eye [59.2, 1.8, -18], look [64, 1.6, -18];
    - `door-hdr-hall`: eye [62.5, 1.5, 24], look [58, 1.3, 24].

### P1-3. Desk monitor back shells

- **What it is:** `monitor()` (props.ts:522) is one box in one emissive material (`MAT.screen`), so it looks the same from the front and the back. Only its position says which way it faces, which is why the manager's screen "faces the door" to the owner.
- **Change:**
  - In `monitor()`, only when `stand` is true (desk monitors; wall screens unchanged), add after the screen:
    ```js
    const back = box(w, h, 0.02, MAT.black, x - Math.sin(rot) * 0.0375, y, z - Math.cos(rot) * 0.0375);
    back.rotation.y = rot;
    add(g, back);
    ```
  - The result is a 0.02 m dark shell just behind the 0.055 screen, at 0.0275..0.0475 m behind its centre.
  - It applies to all 13 stand monitors: lobby ×2, consult, education, safety, QA, the dosimetry review screen and its 4 workstations, the manager's, and HDR (props.ts:1463). Each one's `rot` already faces its user.
- **NPC:** none.
- **Checks:**
  - The screen's size, position and bottom do not change, and the shell's size ([w, h, 0.02]) differs from the screen's ([w, h, 0.055]), so every existing screen pin still picks one mesh.
  - Shot `mgr-visitor`: eye [20.6, 1.25, 10.4], look [20, 1.4, 7.4]. In Part 1 it shows the manager monitor's back; after R3-7 it shows the screen.

### P1-4. Header-sign fit (Learning Commons)

- **What it is:** the door header sign, `makeDoorHeaderSign` (helpers.ts:97), drawn by `makeDoorHeaderTexture` (helpers.ts:70).
  - It is a 1200 × 260 canvas stretched onto a 3.8 × 0.62 face. The commons sign hangs on the hallway face of the commons' east wall (x -2), y 2.74..3.36, z -61.9..-58.1.
- **Now:**
  - The name drops to 48 px only above 34 characters (helpers.ts:87). "LEARNING COMMONS / STAFF EDUCATION" has exactly 34, so it is drawn at 58 px.
  - It measures 1216 px, 16 px wider than the canvas, so 8 px of the L and of the N are cut off.
  - The manager's name fits with only 34 px each side.
- **Change:** replace helpers.ts:87 with a fit rule, after `x.font = '800 58px Arial'`:
  ```js
  // the name fits 1040 px of the 1200 px canvas (80 px, about 0.25 m of sign, clear each side), at most 58 px
  const fit = Math.floor((58 * 1040) / (x.measureText(nm.toUpperCase()).width || 1));
  if (fit < 58) x.font = `800 ${fit}px Arial`;
  ```
  - The commons name goes from 58 to 49 px (about 86 px, 0.27 m, clear each side), and the manager's from 48 to 44 px.
  - Dosimetry stays 48 px; hdr and engineering stay 58 px. Every other sign is unchanged.
  - `|| 1` guards the node canvas stub (`scripts/lib/browser-stubs.mjs:55`), which returns width 0 and so leaves 58 px under the checks.
  - No canvas or plane size changes.
- **NPC:** none.
- **Checks:** no geometry moves, so there are no pins. Shot `commons-sign`: eye [1.6, 2.5, -60], look [-2, 3.05, -60] (from inside the P1-6 hallway).

### P1-5. Hallway light-strip shadows

- **What it is:** the hallway light strips are 2.1 m boxes, so `box()` turns their shadows on. The hallway roofs cast none (Update 2), so the sun reaches the strips, and the strip at z -64 throws a thin dark diagonal line across the technical hallway's end and right walls.
- **Change:** add `l.castShadow = false;` before `scene.add(l)` in `corridorLightsHorizontal` (rooms.ts:1610) and `corridorLightsVertical` (rooms.ts:1625). This removes the same lines in every hallway. The broad, soft sun shade on the end wall stays.
- **NPC / checks:** none. The after shot is `hall-north-end` (P1-6).

### P1-6. Technical hallway, north end

- **What it is:** going north, the walls step in twice and then back out.
  - The hallway is x -3..3 to z -41.5.
  - Dosimetry's west wall (x 2) then narrows it to x -3..2.
  - At z -54, the commons' east wall (x -2) narrows it to x -2..2, 4 m.
  - At z -56.5, the right side steps back out to the x 3 infill. The last 9.5 m are x -2..3, 0.5 m off the floor stripe and the lights on x 0, and the end wall is 5 m.
- **Change:**
  - `buildCorridorInfillWalls`:
    - drop `[-66, -56.5]` from the x 3 list (rooms.ts:1522);
    - add `infillV(-66, -56.5, 2)`;
    - change `infillH(-2, 3, -66)` (rooms.ts:1545) to `infillH(-2, 2, -66)`.
  - `buildCorridorRoofs`: replace `roof(-2, 2, -56.5, -54, 3.75)` and `roof(-2, 3, -66, -56.5, 3.75)` (rooms.ts:1659-1660) with `roof(-2, 2, -66, -54, 3.75)`.
  - Result: 6 m, then 5 m from z -41.5, then 4 m from z -54 to the end. The right wall runs straight along x 2 from z -41.5 to the end wall.
  - Nothing uses the x 2..3 strip now outside the wall:
    - the tech cart turns at z -41.7;
    - story actors walk x 0;
    - the commons and dosimetry approach points are inside x -2..2;
    - the commons door leaves swing to x -0.75.
  - The floor slab runs under the new wall, as it already does at x 3.09..3.5.
- **NPC:** none. The colliders follow the infill.
- **Checks:**
  - **Roof rows:** the scene-check rows 'technical hallway by commons and dosimetry' and 'technical hallway north' (sim-hub-scene-check.mjs:415-416) become one: `[-2, 2, -66, -54, 3.75, 'technical hallway north']`.
  - **End wall:** 'technical hallway end wall' (:451) becomes `size: [4, 3.75, 0.18], at: [0, -66]`.
  - **Right wall:**
    - new pin `technical hallway north right wall on x 2`: `size: [0.18, 3.75, 9.5], at: [2, -61.25], r: 0.02`;
    - `absent` for the old piece, the same size at [3, -61.25].
  - **Shots:** `hall-north-end` (eye [0.5, 1.7, -56], look [0.5, 1.6, -66]), `hall-north-near` (eye [0, 1.7, -50], look [0, 1.6, -66]), and the existing `hall-tech-north` and `overview-roofs`.

### P1-7. LINAC junction: block, sign, arrows, walkway cart

- **What it is:**
  - The junction sign is a two-faced hanging blade (`makeDirectionalSign`, equipment.ts:1164-1172).
  - It reads "VAULT 1 ↓ · VAULT 2 ↑" and hangs at x 63.2, y 2.50..3.26, z -2..2, 0.51 m in front of the vault-wall line, in the mouth of the junction pocket.
  - The pocket is the gap the owner sees: a recess x 63.71..66.79, z -4.71..4.71, 5.7 m tall, between vault 1's and vault 2's side walls. Its roof is `roof(64, 67, -5, 5, 5.7)` (rooms.ts:1669) and its back wall `infillV(-7, 7, 67, 5.7, 0.42)` (rooms.ts:1534).
  - The "random blue box" toward vault 1 is a small blue-grey supply cart, `medCartObject(0.82)` named `cameraPole`, at (61.6, -23.2) (rooms.ts:475-478). It is the only object on the walkway floor.
- **Change:**
  - **Block:** in `buildCorridorInfillWalls`, beside the pocket's back wall, add `wall(65.25, 0, 3.08, 10.0, 5.7, MAT.wallVault, true)`.
    - It fills x 63.71..66.79, z -5..5, y 0..5.7, with a collider.
    - Its face continues the vault walls' corridor face at x 63.71, so the walkway's east side reads as one wall from z -31 to 31, apart from the vault doors.
    - z ±5 also closes the 0.29 × 0.29 notches where the vault west walls end.
    - The pocket's roof, floor plate and back wall stay, hidden inside or under the block.
  - **Sign:** `makeDirectionalSign('VAULT 1  ←   ·   VAULT 2  →', 'Shielded treatment rooms', 63.66, 2.88, 0, -Math.PI / 2, 4.0)`.
    - The text and x 63.66 change; it hangs 0.05 m off the new face at the same height.
    - Facing +x from the walkway, vault 1 (z -18) is on the left and vault 2 on the right; the text already runs from -z to +z.
    - Its back face now faces the block and is never seen. It passes no back label (P1-8).
  - **Cart:** delete `cameraPole` (rooms.ts:475-478). Nothing else refers to it, and `medCartObject` stays in use in that function.
- **NPC:**
  - Nothing routes into the pocket: no mover point, graph node, arrival spot, final or guided point has x > 63.4 and |z| < 5.5.
  - NPC hand-overs on `NPC_TREATMENT_LANE_X` 63.4 keep their 0.2 m root circle 0.11 m short of the face, as along the rest of the vault walls.
  - linacRunner's lanes (x 62.2 and 60.9) clear the face by more than check a's 0.3 m.
  - Furniture rules skip anything over 3 m tall (`scripts/lib/furniture.mjs:97`).
- **Checks:**
  - `junction block flush with the vault walls`: `size: [3.08, 5.7, 10.0], at: [65.25, 0], r: 0.02`;
  - `junction sign on the block`: `geom: 'PlaneGeometry', size: [4.0, 0.76], at: [63.66, 0], r: 0.1, name: ''`, `flush: { axis: 'x', face: 63.71, side: 'max' }`;
  - `walkway cart removed`: `size: [0.4592, 0.78, 0.3116], at: [61.6, -23.2]`, `absent`;
  - the 'roof over the pocket between the vault entrances' pin stays.
  - Shots: the existing `walkway-junction` and `walkway-north`, plus `walkway-junction-near` (eye [57.5, 1.7, 0], look [64, 2.6, 0]).

### P1-8. Lobby blades

- **What it is:**
  - Three two-faced hanging wayfinding blades over the lobby's hallway openings (main.ts:478-505), y 2.44..3.2.
  - The back face (`sign-back`) swaps ← and → so arrows point the same way in the world (helpers.ts:437-473).
  - Each blade hangs over an opening you walk straight through, so "the way to go" is ↑.
- **Now:**
  - "CLINICAL SERVICES →" (11.25, 2.82, 0, -π/2) and "← PATIENT SERVICES" (-11.25, 2.82, 0, π/2) point at the entrance, not down the hallway.
  - Their backs read "CLINICAL SERVICES ←" and "PATIENT SERVICES →" toward the lobby.
  - "TECHNICAL / EDUCATION ↑" (0, 2.82, -9.35, 0) is right from the lobby, but its back also reads ↑ from the hallway, where ahead is the lobby.
- **Change:**
  - **Signature:** `makeDirectionalSign(text, sub, x, y, z, rotY, w = 3.2, back?: [string, string])`. When `back` is given, the back face shows it instead of the arrow-swapped front.
  - **Fronts:**
    - main.ts:497 `'CLINICAL SERVICES  →'` → `'CLINICAL SERVICES  ↑'`;
    - main.ts:479 `'←  PATIENT SERVICES'` → `'PATIENT SERVICES  ↑'`;
    - TECHNICAL / EDUCATION stays.
  - **Backs:** all three lobby blades pass `['MAIN LOBBY  ↑', 'Reception · Check-in · Main entrance']`, about 500 of the 1000 px.
  - **Other blades:** CT SIMULATION, TREATMENT AREA, the junction (P1-7) and EXIT / RECEPTION pass no `back` and keep today's behaviour.
- **NPC:** none. No geometry moves, so the signs rule and the pins are unaffected.
- **Checks:** shots, at eye height 1.87:
  - `blade-clinical`: eye [5, 1.87, 0.5], look [11.25, 2.7, 0];
  - `blade-patient`: eye [-5, 1.87, 0.5], look [-11.25, 2.7, 0];
  - `blade-clinical-back`: eye [13.2, 1.87, 0.5], look [11.25, 2.8, 0].

### P1-9. Welcome kiosk

- **What it is:**
  - `orientationKiosk()` (props.ts:1619-1651), a patient check-in and wayfinding kiosk: a touch screen on a pedestal.
  - Pressing E opens the kiosk dialog (the two journeys and "Explore freely").
- **Now:**
  - It is at x 5.5, z -4.3 (props.ts:1622-1623), facing +z, 14.3 m from the doors and behind the east couches.
  - Its screen plane is at (5.5, 1.5, -4.195).
- **Change:**
  - Set the consts to `x = 2.6, z = 6.25`; nothing else in the builder changes.
  - The kiosk stands 3.5 m inside the doors, just east of the walk-in line, square to the doors, leaning back as now.
  - It spans x 1.94..3.26 and z 5.97..6.53, with the screen at (2.6, 1.5, 6.355). From the doorway's middle it is 35° to the right.
  - Clearances:
    - the visitor lanes z 5.0 and 7.5: 0.97 m;
    - the journey line GAP → S → finals (x 0..0.6): 1.34 m;
    - node S (0.4, 6.0): 1.54 m;
    - the east chair row: 2.3 m.
- **NPC:** none moves. The kiosk joins the check's furniture at its new spot; checks k, l and m have the margins above.
- **Checks:**
  - The pin 'welcome kiosk screen faces the lobby' (sim-hub-scene-check.mjs:467-470) becomes 'welcome kiosk screen faces the entrance', `at: [2.6, 6.355]`. Update its comment.
  - Shot `lobby-kiosk`: eye [0.6, 1.87, 11.0], look [2.6, 1.4, 6.25].
- **Known, not changed here:** with the kiosk at the entrance, its "Explore freely" button (main.ts:607-610) will be pressed more often. When the player is already walking, that button calls `setMode('walk')`, which teleports the player to the lobby inspect pose. This is not in the approved summary.

### P1-10. Walk start outside and eye height

- **What "spawn" is today:** boot is overview. The **walk-mode start** with no active room is the only spawn in the lobby: `player.pos.set(0, 1.65, 5.5)` aimed at the lobby's conversation target (walk.ts:505-513). main.ts:536 sets the same point.
- **Eye height now:**
  - The walk camera's y is `player.pos.y`, set to 1.65 at main.ts:536, walk.ts:506 and journey.ts:2949.
  - walk.ts:361 copies the guided camera's height (1.66 to 1.96) into it after a trip.
  - NPC eyes are at world y 1.87 (npc.ts:82-83; 1.80 m above the floor surface), so the player looks at their chins.
- **Change:**
  - **Constants:** add `export const PLAYER_EYE_Y = 1.87` and `export const REACH_Y = 1.65` beside `player` in main.ts. main.ts:536 uses the first while the module loads, so it must be defined there, not imported from walk.ts.
  - **Eye sites:** use `PLAYER_EYE_Y` at:
    1. main.ts:536, the initial `player.pos`, which becomes (2.0, PLAYER_EYE_Y, 20.4);
    2. walk.ts:506, the walk-mode start;
    3. journey.ts:2949, `player.pos.y = PLAYER_EYE_Y`;
    4. walk.ts:361, `player.pos.y = PLAYER_EYE_Y` after the copy, so walk mode never inherits a guided height.
  - **Walk-mode start** (walk.ts:505-513, the `else` branch):
    - `player.pos.set(2.0, PLAYER_EYE_Y, 20.4)`, then `aimPlayerAt(new THREE.Vector3(-1.0, 2.0, 10.5))` (yaw 0.294, pitch 0.013) in place of the lobby focus target;
    - set `#locText` to "Outside the main entrance · walk in through the doors".
    - The spot is on the entrance plaza, about 0.5 m north of the curb (z 20.95), 6 m in front of the monument sign and 2.6 m east of its middle.
    - In frame: the monument face (-29° to +4°), the entrance sign (-8° to +21°), the east glass door with the kiosk behind it, and the moved light pole at -35°.
  - **Reach:** `nearestInteractable` (interact.ts:459-472) and `nearestDoor` (walk.ts:56-68) measure from `(player.pos.x, REACH_Y, player.pos.z)`, so every reach feels as today. Without this, NPC reach would drop from 1.74 m to 1.50 m horizontally.
  - **Unchanged:** boot, the guided start (walk.ts:520-523, camera at 1.7), the Lobby button, Back, the guided-route nodes at 1.66, `HUB` at 1.68, the room `cam` poses, and the third-person framings.
  - Outside, `S.activeRoom` stays null. Walking in, `roomContainingWalkPoint` picks up the lobby at z < 9.5 without turning the view.
- **Walk-in path:** north along x 2.0.
  - The monument planter's east edge (x 1.4) is 0.6 m clear, and the moved plants' leaves (x 1.31) 0.69 m.
  - The front wall's colliders start at x 2.6, and the player's 0.32 m radius reaches x 2.32.
  - The shuttle's west lane passes 1.4 m south of the start at vehicle scale 1.6.
- **NPC:** none.
- **Checks:**
  - **Visibility check:**
    - its walk poses go from 1.65 to 1.87: the header (line 10), the room walk poses (:370), the hallway poses (:399) and the linaccontrol and ctcontrol poses (:414, :420, :426);
    - add the start pose, `outside spawn h0/h90/h180/h270` at [2.0, 1.87, 20.4] (`room: roomAt(2.0, 20.4)`), 4 headings.
  - Shot `outside-spawn`: eye [2.0, 1.87, 20.4], look [-1.0, 2.0, 10.5].

### P1-11. Entrance sliding glass

- **What it is:**
  - `buildLobbyEntrance` (rooms.ts:785-808): a 5.2 m opening (x -2.6..2.6) in the lobby's front wall (z 10), with a frame and two static glass panes.
  - The panes are `gap * 0.47` = 2.444 wide at ±`gap * 0.245`, 2.7 tall and 0.05 deep. They have no collider and no door entry, so today you walk through closed glass.
- **Change:**
  - **Panes:** `box(gap / 2, h, 0.05, glass, ∓gap / 4, 0, 0)`, each 2.6 m wide, meeting in the middle with seam 0 and reaching the jamb faces (±2.6).
  - **Door entry:** register them in `doors` as `{ group: g, side: 'zmax', type: 'clinicalSlide', progress: 0, target: 0, openSeconds: 0.9, parts: [l, rr], gap }` under the id `'lobby-entrance'`.
    - The id is not a room id, so room moves never call `setDoorTarget` on it.
    - `updateDoors` slides it with the P1-2 formula. Open, each pane spans 2.6..5.2 m from the centre, inside the front wall (x ≥ 2.6 and ≤ -2.6), and the 5.2 m opening is clear.
    - The entrance sign above (y 2.755..3.805) is untouched.
  - **Trigger:** each frame, in every mode, set its target to 1 when either is near the doorway centre (0, 10), measured horizontally, and to 0 otherwise:
    - the player, in walk mode, within 5.5 m (so the panes are clear before a walking or sprinting player reaches them);
    - any person within 3.0 m: the actors `collectBlockers` gathers (npc-behavior.ts:267), plus the movers that are people, not vehicles.
    - In practice it opens for the player walking in, the visitor walker passing (0, 7.5), and a departing patient at Mia's (0, 8.9) or Jordan's (0, 7.6) final.
    - Call it from the main loop before `updateDoors`.
  - **Walk loop:** the loop that closes every non-nearest door (walk.ts:599-601) skips `'lobby-entrance'`.
  - The panes stay non-colliding, as all doors are.
- **NPC:**
  - No route changes. The crew that walked through the glass is removed (P1-13).
  - `scripts/lib/furniture.mjs:20` already treats every mesh of a `doors` entry as a door, not furniture.
- **Checks:**
  - Pins: `lobby entrance pane west, closed` (`size: [2.6, 2.7, 0.05], at: [-1.3, 10], r: 0.02`) and the same for the east pane at [1.3, 10]. The scene check measures the scene as the page builds it (sim-hub-scene-check.mjs:3-7), when every door is closed; the P1-2 leaf pins rely on the same.
  - Shot `lobby-entrance`: eye [1.2, 1.87, 11.2], look [1.6, 1.4, 3].
  - Check by hand in walk mode from the outside start that the panes open before the player reaches them.

### P1-12. Light pole and sign plants

- **What it is:**
  - **Light pole:** `lampPost` (props.ts:70-90) is a 4.4 m site light for the plaza, with a 0.55 m arm toward +x and a luminaire under its end.
    - The one the owner means stands at (0, 14), against the monument slab's back and through one plant's pot (list entry rooms.ts:990).
  - **Monument sign:** `monumentSign(-1.8, 14.25)` (main.ts:533) is the "RTApps" sign.
    - planter bed 6.4 × 1.85: x -5.0..1.4, z 13.325..15.175;
    - slab 5.2 × 2.05 × 0.36: x -4.4..0.8, z 14.07..14.43;
    - lettered face toward +z, the street.
  - **Plants:** four potted shrubs, `plant(g, x + ox, z - 0.15, 0.55)` for ox -2.6, -1.8, 1.8, 2.6 (props.ts:490-492).
    - They stand at z 14.1, inside the slab's depth.
    - The middle two are wholly inside it. The end two stick out half-way, mostly behind.
- **Change:**
  - **Pole:** rooms.ts:990 `[0, 14]` → `[-5.75, 14.25]`.
    - Facing the lettered face (looking north), that is on the left, 0.75 m west of the bed's west edge, level with the sign's centre line.
    - The arm points +x, so the luminaire hangs over the planter's west end and lights the face.
    - The front lamp row becomes -20, -5.75, 20.
  - **Plants:** replace the loop with `for (const [ox, oz] of [[-2.85, -0.6], [2.85, -0.6], [-2.85, 0.6], [2.85, 0.6]]) plant(g, x + ox, z + oz, 0.55);`. That puts them at (-4.65, 13.65), (1.05, 13.65), (-4.65, 14.85) and (1.05, 14.85).
    - The front leaves span z 14.60..15.11, 0.17 m in front of the face (14.44). The back leaves span z 13.40..13.91, 0.16 m behind the slab.
    - The front pair flanks the lettered face (x -4.2..0.6; the text starts at x -3.93), with leaves ending at x -4.39 and starting at 0.79.
    - All leaves stay inside the bed: x -4.91..1.31, z 13.40..15.11.
- **NPC:** none. These are scene-level exterior props, never culled.
- **Checks:**
  - `light pole left of the monument sign`: `geom: 'CylinderGeometry', size: [0.06, 0.08, 4.4], at: [-5.75, 14.25], r: 0.05`;
  - `absent` for the same at [0, 14] (`r: 0.1`);
  - four `monument plant at the <corner> corner` pins: `geom: 'CylinderGeometry', size: [0.1485, 0.187, 0.286]` (the pot at scale 0.55), at each new corner, `r: 0.05`.
  - Shots: `sign-front` (eye [-1.8, 1.6, 18.5], look [-1.8, 1.0, 14.25]) and `sign-top` (eye [-1.8, 6.5, 16.8], look [-1.8, 0, 14.25]).

### P1-13. Ambulance parked

- **What it is:** `vehicleObject('ambulance')` (props.ts:204-356), created at npc-behavior.ts:577-581 and driven by `updateAmbulance` (equipment.ts:783-834, called at main.ts:697) through an arrival story. The cycle is:
  - it drives along z 20 on the light plaza (the sidewalk), through the tree at (-18, 20);
  - it stops at (-2.2, 13.2) facing -z, 0.53 m into the monument slab;
  - a crew figure walks to the doors through the closed glass and back;
  - it leaves and repeats every ~30 s.
- **Change:**
  - **Park it:** npc-behavior.ts:577-581 becomes:
    ```js
    const ambulance = vehicleObject('ambulance');
    ambulance.position.set(31, 0, 23);
    ambulance.rotation.y = Math.PI;
    scene.add(ambulance);
    ```
    - That puts it on the asphalt east of the plaza, nose west (the cab is at local +x).
    - At scale 1.6 (P1-14), its footprint is x 28.76..33.24, z 21.96..24.04: 0.9 m from the curb, between the stop marks at x 26 and 36, and 7 m from the car lane.
  - **Remove the cycle:**
    - equipment.ts:739-834: `ambState`, `AMB_*`, `crewOnGround`, `ambPatient`, `setupAmbulance` and `updateAmbulance`;
    - the `setupAmbulance` import (npc-behavior.ts:47) and call (:581);
    - the `updateAmbulance` import (main.ts:46) and call (:697);
    - `S.AMB`, `S.ambUnload` and `S.ambLoad` (state.ts:19-21, 45-47).
  - **Orphans:**
    - npc-behavior.ts `walkSwing` (:782), `advanceRoute` (:793) and `advancePed` (:816) lose their only callers, and their import in equipment.ts:36-38 goes too;
    - rooms.ts `APRON_TOP` (:941) and its import (equipment.ts:53) lose theirs.
    - Remove them, since this change orphans them. Git history keeps the cycle for later.
- **NPC:** **check f** (sim-hub-npc-check.mjs) loses its crew part. This is one of the two check edits Global constraints allows:
  - the header lines 21-22 ("then 8 moments over each of the ambulance crew's walks");
  - the two `add(NPC.state.amb…)` lines (:1021-1022);
  - the crew loop (:1065-1087).
  - Its subject is gone, so this is not a loosening. f then samples 14 moments (12 + t 30 s + t 90 s) instead of 30.
- **Checks:**
  - `ambulance parked in the lot`: `size: [2.8, 0.24, 1.3]` (the chassis, geometry before scale), `at: [31, 23], r: 0.05`.
  - Shot `ambulance-parked`: eye [24, 3.0, 17], look [31, 0.8, 23].

### P1-14. Vehicles scaled, wheels fixed

- **What it is:** `vehicleObject(kind, color)` (props.ts:204-356) builds three models, front at local +x:
  - the car mover (npc-behavior.ts:539-576);
  - the shuttle van mover (:582-611);
  - the ambulance.

  Today they are about half real size: car 2.30 × 1.08 × 0.93, van 2.60 × 1.24 × 1.06, ambulance 2.80 × 1.30 × 1.16. The car's roof is at an NPC's hip.
- **Change:**
  - **Scale:** build the parts into an inner `body` group with `body.scale.setScalar(1.6)` and return the outer group unscaled.
    - Check a's `vehicleFootprint` (sim-hub-npc-check.mjs:214-236) measures meshes in the inverse of the mover group's matrix. A scale on the outer group would cancel out, and the check would keep testing the old footprint.
    - Sizes become: car 3.68 × 1.73 × 1.49, van 4.16 × 1.98 × 1.70, ambulance 4.48 × 2.08 × 1.86. The wheels become r 0.35 and still touch y 0.
  - **Wheels:** `addWheel` (props.ts:207-212) sets `wh.rotation.z = Math.PI / 2`, which turns the axle along the vehicle's length, so the tyres show edge-on. Change it to `wh.rotation.x = Math.PI / 2`, axle along z.
  - **Speeds:** the loop speeds stay.
  - **Clearances at 1.6, all pass:**
    - the car's east lane edge is 0.56 m from the HDR suite wall (check a needs 0.2);
    - the car's west lane edge is at z 38.36 (curb2 at 38.94);
    - the shuttle's west lane edge is at z 21.81 (curb at 21.06);
    - the shuttle and car lanes are 2.15 m apart;
    - the shuttle's roof (1.70) passes under the tree crowns (bottom 1.96) and clear of them in z.
- **NPC:** check a re-measures the larger footprints. Vehicles are not people, so b and the rest are unaffected.
- **Checks:** shots `car-side` (`subject: 'mover:car', u: 0.2, cam: [4.5, 1.2, 0.5], lookY: 0.45`) and `shuttle-side` (`subject: 'mover:shuttle', u: 0.2, cam: [5, 1.4, 0.5], lookY: 0.5`). The existing `overview-*` shots change only in size.

---

## Part 2: the rooms

Re-measure first: Part 1 moves no room contents, but check that every line anchor below still holds after its merge.

### R3-1. Consult / exam room (`consult`, x -23..-13, z -12..-3, door on zmax at x -19.3..-16.7)

Entering, you walk toward -z, so the owner's "wall on the left" is the **west wall**, inner face x -22.92.

- **What they are:**
  - **"Metal poles with a bar and something hanging off it":** two **IV poles** (drip stands), `ivPoleObject` (props.ts:143). Each is a wheeled base, a pole, an arm and a translucent IV fluid bag.
  - **"White filing cabinet thing":** a white **storage cabinet**, `cabinetBank` 1.5 × 1.45 × 0.42 (props.ts:631). It is turned rot π, so its drawers face the back wall.
  - **"Something hanging off it":** a **brochure rack**, the patient-leaflet stand (`brochureRack`, props.ts:437), standing against the cabinet's end.
- **Now** (rooms.ts:1047-1058; pole B in `addCirculationProps`, rooms.ts:463-465):
  - desk `desk(g, -20.5, -9.3, 1.8, 0.7)`, free-standing (:1049);
  - monitor at (-20.5, 1.35, -9.5), screen bottom 1.11 (:1050);
  - chair at (-15.7, -9.1), rot 0, alone on the right (:1051);
  - rack at (-14.0, -10.3), rot π (:1052);
  - pole A at (-15.0, -6.1), scale 0.88 (:1054-1056);
  - cabinet at (-14.8, -10.1), rot π (:1057);
  - pole B at (-18.9, -4.8), scale 0.9, 1.8 m inside the door in the walking path.
- **Change:**
  ```
  desk(g, room.x - 4.55, room.z - 0.9, 1.8, 0.7, Math.PI / 2);   // (-22.55, -8.4): top x -22.90..-22.20, z -9.30..-7.50
  monitor(g, room.x - 4.62, 1.4, room.z - 0.9, Math.PI / 2);     // (-22.62, 1.40, -8.4): bottom 1.16, faces the room
  chair(g, room.x - 3.65, room.z - 0.9, -Math.PI / 2);           // (-21.65, -8.4): behind the desk, facing it and the screen
  brochureRack(g, room.x + 4.65, room.z - 2.8, -Math.PI / 2);    // (-13.35, -10.3): flush on the east wall, trays to -x
  iv.position.set(room.x + 4.45, 0, room.z - 3.95); iv.rotation.y = -Math.PI / 2;  // pole A (-13.55, -11.45)
  cabinetBank(g, room.x - 4.65, room.z - 2.65, 1.5, 1.45, 0.42, Math.PI / 2, 0xe4eaed);  // (-22.65, -10.15): drawers to +x
  // addCirculationProps: pole B parked beside pole A
  iv2.position.set(-14.25, 0, -11.45); iv2.rotation.y = -Math.PI / 2;
  ```
  - **Desk:** its top is 0.02 m off the west wall. The chair's seat anchor is (-21.71, -8.4), facing -x. Check g's wall rule passes, because the facing first crosses the desk top.
  - **Cabinet:** it is beside the desk on the back-corner side, x -22.86..-22.44, z -10.90..-9.40, with 0.10 m to the desk end. It clears the clock (y ≥ 2.28) and its label (y 1.95..2.25).
  - **IV poles:** both are parked in the back-right corner, with bases 0.27 m from the walls and 0.29 m apart, and the bags hanging toward the room.
- **NPC:**
  - The oncologist (npc.ts:597-608, at (-20.3, -8.75), 'gesture') stays, 0.72 m from the new chair and now in front of her desk.
  - No node moves. Reword the node 2 comment "-x of the IV pole at (-18.9, -4.8)" (room-routes.ts:197).
  - The arrival spots and Mia's final (-17.2, -5.9) are untouched.
- **Checks:**
  - Pins:
    - `consult desk on the west wall`: `size: [1.8, 0.08, 0.7], at: [-22.55, -8.4]`, `flush: { axis: 'x', face: -22.92, side: 'min' }`;
    - `consult desk screen`: `size: [0.8, 0.48, 0.055], at: [-22.62, -8.4]`, `minY: 1.16`, `within: [-22.9, -22.2, -9.3, -7.5]`;
    - `consult chair behind the desk`: `size: [0.55, 0.12, 0.55], at: [-21.65, -8.4], r: 0.05`;
    - `consult cabinet beside the desk` (on the baseboard edge): `size: [1.5, 1.45, 0.42], at: [-22.65, -10.15]`, `within: [-22.66, -22.64, -10.16, -10.14]`;
    - `consult brochure rack on the east wall` (on the baseboard edge): `size: [0.08, 1.05, 0.42], at: [-13.35, -10.3], r: 0.05`, `within: [-13.36, -13.34, -10.31, -10.29]`;
    - `consult IV poles in the back-right corner`: `geom: 'CylinderGeometry'` with `size: [0.0264, 0.0264, 1.364], at: [-13.55, -11.45]` and `size: [0.027, 0.027, 1.395], at: [-14.25, -11.45]`, `r: 0.05`.
  - Shots: `consult-enter` (eye [-18, 1.7, -3.3], look [-18, 0.9, -9]) and `consult-westwall` (eye [-15.2, 1.7, -7.5], look [-22.9, 1.0, -8.5]).

### R3-2. Patient care skills room (`patientcare`, x -35..-21, z 3..14, door on zmin at x -29.3..-26.7, leaf swings in)

Entering, you walk toward +z, so the left is the **east wall**, inner face x -21.08. It is bare.

- **What they are:**
  - **"Blue filing cabinet thing" at the entrance:** a wheeled **medical supply cart**, `medCartObject` (props.ts:177), with three drawers, a top tray, casters and a push handle.
  - **"White box":** an unlabelled white block, 2.2 × 0.95 × 0.55 (rooms.ts:1081). The route comments call it "the bed". It becomes a **supply counter**.
  - **"Second blue filing cabinet":** a second supply cart (rooms.ts:1082-1084).
- **Now:**
  - cart1 at (-28.0, 4.4), rot π (rooms.ts:451-454), 1.2 m inside the door on its centre line;
  - the block at (-28, 0.55, 5.5): x -29.1..-26.9, z 5.225..5.775;
  - cart mc at (-23.4, 5.6), rot 0, 2.3 m off the east wall in open floor.
- **Change:** one supply wall on the east wall, drawers facing the room:
  ```
  cabinetBank(g, room.x + 6.585, room.z - 1.5, 2.2, 0.95, 0.55, -Math.PI / 2, 0xf1f4f5);  // counter (-21.415, 7.0): x -21.69..-21.14, z 5.9..8.1, drawers to -x
  mc.position.set(room.x + 6.655, 0, room.z + 0.1); mc.rotation.y = -Math.PI / 2;     // (-21.345, 8.6): top z 8.32..8.89
  // addCirculationProps
  cart1.position.set(-21.35, 0, 9.45); cart1.rotation.y = -Math.PI / 2;               // top z 9.16..9.74
  ```
  - The counter replaces the plain box at rooms.ts:1081, drawn as a drawer counter so it reads as one (Resolved ambiguities 4).
  - Clearances: the right exam table is 2.6 m away and the nurse at (-26.6, 6.3) 4.9 m. Every node and spot is at x ≤ -25.9.
  - The doorway area x -29.3..-26.7, z 3..6 becomes open floor.
- **NPC:**
  - **Nodes:** the open leaf lies along x -29.3..-29.1 from z 3 to 5.59 (with P1-2's leaf), and today's nodes 3 (-29.0, 3.7) and 4 (-30.0, 6.5) walk people through it. Move them in `ROOM_GRAPHS.patientcare` (room-routes.ts:259-260):
    - node 3 → (-28.5, 4.0);
    - node 4 → (-28.6, 6.5).
    - Edges are unchanged. Both stay 0.6 m clear of the leaf.
  - Rewrite the comments "round the cart (-28, 4.4) and the bed".
  - The arrival spots (-27.4, 4.95), (-27.4, 6.05) and (-26.65, 5.5) stay, now in open floor.
  - The wheelchair interactable (-33.4, 5.4) does not move.
- **Checks:**
  - Pins (all on the baseboard edge, so `within` ±0.01):
    - `patientcare supply counter on the east wall`: `size: [2.2, 0.95, 0.55], at: [-21.415, 7.0]`;
    - `patientcare cart beside the counter`: `size: [0.5152, 0.78, 0.3496], at: [-21.345, 8.6]`;
    - `patientcare entrance cart parked on the east wall`: `size: [0.532, 0.78, 0.361], at: [-21.35, 9.45]`;
    - `patientcare entrance clear`: `absent` for `size: [2.2, 0.95, 0.55], at: [-28, 5.5]`.
  - Shots: `patientcare-entrance` (eye [-28, 1.7, 3.3], look [-28, 0.8, 9]) and `patientcare-east` (eye [-27.5, 1.8, 6.5], look [-21.1, 0.8, 7.8]).

### R3-3. Patient education / follow-up (`education`, x -47..-37, z -12..-3, door on zmax at x -43.3..-40.7)

- **What it is:**
  - "The wall with the TV" is the **back wall** (z -12). The "TV" is the live PATIENT EDUCATION board (equipment.ts:278): frame x -43.415..-40.585, y 1.47..3.03, front at z -11.77.
  - The owner's "doctor" is the Patient Navigator, Sam.
- **Now** (rooms.ts:1067-1077, npc.ts:622-634):
  - the desk `desk(g, -42, -6.2, 3.8, 1.1)` stands 5.2 m from the TV wall, close to the door;
  - three chairs stand in a row at z -7.7 on the TV side;
  - the monitor sits mid-desk at (-42, 1.4, -5.95), rot π;
  - the navigator **stands** at (-43.6, -6.95), ry 0.5, in the 'gesture' pose;
  - the resident patient sits on the +x chair;
  - an outdoor tree from the exterior list, `[-45, -8, 0.9]` (rooms.ts:980), stands inside the room.
- **Pointing and looking:**
  - There is no dedicated point pose. The arm-out animation the owner saw is duty mode 'gesture' (npc-behavior.ts:145-148), which the navigator already has, and a seated figure keeps it.
  - There is no head aim, so people look at the monitor by facing it: each chair turns toward the monitor.
- **Change** (A's revised numbers, with the visitor chairs at z -8.45):
  ```
  // rooms.ts case 'education' (the three chairs and the monitor replace rooms.ts:1068-1075; the bench stays)
  desk(g, room.x, room.z - 2.5, 3.8, 1.1);                        // (-42, -10.0): top x -43.9..-40.1, z -10.55..-9.45, 1.37 m off the TV wall
  monitor(g, room.x + 1.5, 1.4, room.z - 2.5, -1.25, 0.8, 0.48);  // (-40.5, 1.40, -10.0): on the +x end, turned toward the patient, bottom 1.16
  chair(g, room.x - 0.15, room.z - 3.65, 0.96);                   // navigator (-42.15, -11.15), facing the monitor
  chair(g, room.x + 0.1, room.z - 0.95, 2.41);                    // patient (-41.9, -8.45), facing the monitor
  chair(g, room.x - 1.1, room.z - 0.95, Math.PI);                 // free chair (-43.1, -8.45), facing the desk
  ```
  ```
  // npc.ts:622-634: the navigator sits (still 'gesture', so the arm keeps pointing); the patient takes the chair nearer the monitor
  const nav = place('education', 'Patient Navigator', …, -0.1, -3.62, 0.96, 0xefc7a4, undefined, 'education');
  seatActor(nav, nav.position);   // snaps to the navigator chair's anchor (-42.10, -11.12); seatActor is already imported (npc.ts:15)
  sitPatient('education', 'Reviewing the care pathway and education materials.', 0.14, -1.0, 2.41);  // anchor (-41.86, -8.50)
  ```
  - Remove the tree entry `[-45, -8, 0.9]` (rooms.ts:980).
  - The desk stays 3.8 m.
  - Geometry, from A's model and prototype:

    | | navigator | patient | free chair |
    |---|---|---|---|
    | seat anchor | (-42.10, -11.12) | (-41.86, -8.50) | (-43.10, -8.51) |
    | facing | 0.96 (55°), at the monitor | 2.41 (138°), at the monitor | π |
    | stand-up point (0.5 m along facing) | (-41.69, -10.83), legs 0.11 m clear of the desk top | (-41.53, -8.87), 0.43 m clear | (-43.10, -9.01), 0.38 m clear |
    | facing ray to a wall | 6.1 m | 4.6 m | 3.41 m (limit 3.0) |

    - The monitor faces -72°, turned 12° past the bisector toward the patient. The patient sees it 29° off their facing, the navigator 53°.
    - The patient's exchange partner (the navigator) is 47.4° off the patient's facing; the limit is 60.
    - The navigator and the patient are 2.8 m apart.
    - The seated navigator's head is 0.43 m in front of the board's face.
- **NPC:**
  - **`ROOM_GRAPHS.education`:** replace room-routes.ts:231-251 with these nodes:
    - 0 door (-42, -2.15);
    - 1 (-40.92, -2.6);
    - 2 (-40.92, -4.0);
    - 3 (-40.8, -7.7), in front of the patient chair;
    - 4 (-39.6, -9.2), off the desk's +x front corner;
    - 5 (-39.6, -10.95), behind the desk's +x end, the navigator's way out;
    - 6 (-42.5, -7.6), in front of the free chair.

    Edges: 0-1, 1-2, 2-3, 3-4, 4-5, 2-6. Rewrite the comment.
  - **`ARRIVAL_SPOTS.education`:** the spots stay at (-41.1, -5.4), (-41.5, -7.0) and (-41.8, -5.4). Their facings turn to the seated navigator: **-2.95, -2.98, -3.07** (today -2.13, -1.55, -2.28).
  - **Mia's final:**
    - journey.ts:1896 `new THREE.Vector3(-40.9, 0, -5.4)` → `new THREE.Vector3(-43.1, 0, -8.51)`;
    - add `sit: true` to that call's options, beside `cameraOptions` (journey.ts:1925).
    - She ends at the free chair's approach point (-43.10, -9.01) and sits. Her move on to ctsim starts with a stand-up, then goes via node 6.
  - **Navigator to ctsim:** the navigator's journey move to ctsim (journey.ts:2071-2078) now starts with a stand-up toward node 5.
  - **Hand-over:** the resident patient's 'Proceed to CT Simulation' hand-over (main.ts:198) stands up from the chair toward node 3.
  - **Check j** stays as it is (Global constraints). These stand-ups are covered frame by frame by check l.
  - **Expected results (A's prototype):**
    - g counts 8 sitters (the navigator added), and 6 seated patients face their partner within 60°;
    - l: 74 routes, every frame within 0.02 m;
    - k: 114 at rest;
    - m: 66 moments.
- **Checks:**
  - The pin 'education desk screen' (sim-hub-scene-check.mjs:116-120) becomes `pick: { size: [0.8, 0.48, 0.055], at: [-40.5, -10.0] }, minY: 1.16, within: [-43.9, -40.1, -10.55, -9.45]`.
  - Add `education desk by the TV wall`: `size: [3.8, 0.08, 1.1], at: [-42, -10.0], within: [-42.01, -41.99, -10.01, -9.99]`.
  - Add `education tree removed`: `absent` for the trunk, `geom: 'CylinderGeometry', size: [0.162, 0.216, 2.25], at: [-45, -8]` (`tree()`, props.ts:495, at scale 0.9).
  - Shots:
    - change the shot `education-monitor` (sim-hub-shots.mjs:69), whose eye would sit inside the new desk, to eye [-38.6, 1.9, -6.6], look [-40.6, 1.3, -10.0];
    - add `education-enter` (eye [-42, 1.7, -3.3], look [-42, 0.9, -9]) and `education-side` (eye [-38, 1.7, -7], look [-42, 1.1, -10]).

### R3-4. Physics learning laboratory (`physics`, x 3..12, z -23..-13, door on xmin at z -19.3..-16.7)

- **What it is:**
  - The desk (`desk()`, props.ts:513) is the **Physics Plan-QA Workstation**: `EQUIPMENT_SPECS` `physics_planqa` (equipment.ts:1445) puts an E-interactable and a hidden floor ring at its centre.
  - In a clinic it is the physicist's desk for the technical plan check. It has no monitor, and none is added.
- **Now:**
  - `desk(g, room.x - 2.3, room.z - 2.2, 2, 0.75)` (rooms.ts:1100) is at (5.2, -20.2), 1.1 m in from the door wall: the first thing on your left.
  - The physicist stands at (5.3, -19.3), ry 0.3. Jordan Price stands at (9.1, -16.8), ry -1.2.
- **Change:** slide the desk along the same (left, -z) wall to the far corner:
  - `desk(g, room.x + 3.37, room.z - 4.5, 2, 0.75)`, at (10.87, -22.5). Its top spans x 9.87..11.87 (0.05 off the east wall) and z -22.875..-22.125 (0.045 off the -z wall).
  - It sits under the clock (z ≥ -21.07 clear) and beside the PHYSICS PLAN QA board, clear of the door swing and both people.
  - `physics_planqa` (equipment.ts:1447-1448): `dx: -2.3, dz: -2.2` → `dx: 3.37, dz: -4.5`.
- **NPC:**
  - **Physicist:** npc.ts:665-667 `-2.2, -1.3, 0.3` → `3.37, -3.5, -0.36`. That puts her at (10.87, -21.5), 0.625 m in front of the desk, facing into the room toward Jordan.
  - **Jordan Price:** npc.ts:867 ry `-1.2` → `2.78`, facing the physicist they talk with (Resolved ambiguities 5).
  - **`ARRIVAL_SPOTS.physics`** (room-routes.ts:50-53): (9.0, -20.3, facing 2.14), (8.4, -19.9, 2.14) and (9.3, -19.7, 2.42).
  - **`ROOM_GRAPHS.physics`** (room-routes.ts:280-286): add node `[7.4, -18.6]` and edge `[1, 2]`.
  - **Journey camera:** `journeyFocusActors` (journey.ts:787) would put the default camera behind the east wall. Add before the default branch: `else if (roomId === 'physics') pos = target.clone().add(new THREE.Vector3(-3.0, 0.5, 2.0));`.
  - C's prototype passed a–m, with the safety[0] and dosimetry[0] hand-overs in and physics[0] out running through the new spots and node.
  - Watch one info line: an unrelated vault-1 move came 0.5 cm from the changing-nook panel. That is information, not a failure.
- **Checks:**
  - `physics desk in the far -z corner`: `size: [2, 0.08, 0.75], at: [10.87, -22.5], within: [10.86, 10.88, -22.51, -22.49]`.
  - Shots: the existing `physics-room`, and `physics-door` (eye [3.6, 1.7, -18], look [10, 1, -18]).

### R3-5. Radiobiology laboratory (`radbio`, x -12..-3, z -36..-26, door on xmax at z -32.3..-29.7)

- **What it is:**
  - Three lab benches (`desk()` 1.6 × 0.7), each with a black cone standing in for a microscope (rooms.ts:1102-1108).
  - The educator (npc.ts:673-685) and Leah Grant (npc.ts:872-884), who share an exchange.
  - Radbio has no graph, spots, hand-overs, journey moves, equipment specs or pins.
- **Now:** the row runs along x on the door's own axis (z -31), so from the door you look straight down it.
  - Benches at x -9.7, -7.5 and -5.3.
  - The educator at (-7.5, -32.4), ry 0.
  - Leah at (-5.5, -30.0), ry -1.1.
- **Change:** rotate every prop and person +90° about the room centre (-7.5, -31): offsets (dx, dz) → (dz, -dx), headings ry → ry + π/2.
  ```
  desk(g, room.x, room.z + i * 2.2, 1.6, 0.7, Math.PI / 2);   // benches (-7.5, -33.2 / -31 / -28.8)
  mic.position.set(room.x, 1.2, room.z + i * 2.2);
  ```
  - Use `rot = Math.PI / 2`, not swapped w and d: `desk()` sizes its base from w and d.
  - From the door, the benches now run left to right. The educator stands behind the middle one, facing the door.
  - The row (x -7.85..-7.15, z -34.0..-28.0) is 3.93 m from the door wall and 1.92 m from the ±z walls.
  - The room shell (wall art, cove light, ceiling fixtures) stays.
- **NPC:**
  - **Educator:** npc.ts:677-679 `0, -1.4, 0` → `-1.4, 0, Math.PI / 2`, at (-8.9, -31).
  - **Leah:** npc.ts:878-880 `2.0, 1.0, -1.1` → `1.0, -2.0, -1.1 + Math.PI / 2`, at (-6.5, -33.0), ry 0.471.
  - Nothing routes into radbio, and C's prototype passed a–m.
- **Checks:**
  - Pins: `radbio bench <i> across the room` for i -1/0/1, `size: [1.6, 0.08, 0.7], at: [-7.5, -31 + 2.2i], r: 0.05`.
  - Shots: `radbio-room` (eye [-3.6, 1.7, -31], look [-10, 1.0, -31]) and `radbio-top` (eye [-7.5, 11, -29.5], look [-7.5, 0, -31], no ceilings).

### R3-6. Dosimetry / treatment planning suite (`dosimetry`, x 2..16, z -56.5..-41.5)

- **What it is:** two white **lateral filing cabinets**, `cabinetBank` 1.6 × 1.6 × 0.45 (rooms.ts:1155-1156), for records, QA documents, film and small phantoms.
- **Now:** they stand at (3.8, -45.3) and (14.2, -45.3), rot 0, 3.5 m off the +z wall. Their drawers face bare floor and their backs face the planning desks. The west one is first on your right as you enter.
- **Change:** both go flush on the +z wall, drawers facing the room:
  - `cabinetBank(g, room.x ∓ 4.4, room.z + 7.175, 1.6, 1.6, 0.45, Math.PI, 0xe1e7ea)`, at (4.6, -41.825) and (13.4, -41.825);
  - the backs are at z -41.60, 0.02 off the wall face (-41.58);
  - they stay symmetric about x 9, and the west one is 0.535 m from the potted plant at (3, -42.5).
- **NPC:** none. No NPC, node, spot, final or interactable involves them.
- **Checks:**
  - `dosimetry cabinet at x <x> flush on the +z wall` for x 4.6 and 13.4: `size: [1.6, 1.6, 0.45], at: [x, -41.825]`, `flush: { axis: 'z', face: -41.58, side: 'max' }`.
  - Shots: `dosimetry-door` (eye [2.6, 1.7, -49], look [9, 1, -46]) and `dosimetry-cabinet-west` (eye [9, 1.7, -52], look [3.8, 1, -45.3]).

### R3-7. Rad Onc manager / lead therapist office (`manager`, x 15..25, z 3.5..12.5, door on zmin)

- **What it is:**
  - The desk is `desk(g, room.x, room.z + 0.5, 2.5, 0.85)`, top z 8.075..8.925.
  - Its monitor is at (20, 8.75), rot π (rooms.ts:1162), facing the manager and the door.
  - Two visitor chairs stand at (19, 9.5) and (21, 9.5), facing the desk.
  - The manager is at (20, 7.45), ry 0.
  - Chris Evans stands at (18.2, 9.6), ry 0.65, 103° away from the manager he talks with.
- **Change:**
  - rooms.ts:1162 → `monitor(g, room.x + 0.7, 1.435, room.z + 0.4, -0.4, 1.0, 0.55)`.
    - The monitor moves to (20.7, 8.4), on the desk's door-side +x end, turned 23° toward the chairs' middle.
    - Its footprint (x 20.23..21.19, z 8.13..8.62) stays on the top, with the bottom at 1.16.
    - Off-centre, it no longer blocks the line between the manager and Chris.
  - With P1-3's back shell, the door sees the black back and the chairs see the screen.
  - Update the rooms.ts:1159-1160 comment.
- **NPC:**
  - **Manager:** npc.ts:740 ry `0` → `-0.7`.
  - **Chris Evans:** npc.ts:945 ry `0.65` → `2.44`.
  - They now face each other across the desk's clear -x end. Chris stays standing.
  - Positions, graph nodes and the manager[0] → linaccontrol hand-over are unchanged.
- **Checks:**
  - The pin 'manager screen on the desk' (sim-hub-scene-check.mjs:175-179) changes `at: [20, 8.75]` → `at: [20.7, 8.4]`; its `within` and `minY` still hold. Update its comment.
  - Shots: `mgr-visitor` (P1-3), `mgr-door` (eye [20, 1.7, 3.8], look [20, 1, 9]), and the existing `manager-desk` and `manager-office`.

### R3-8. CT control room (`ctcontrol`, x 27..36, z -14..-4, door on zmax at x 30.2..32.8, window on xmax)

- **What it is:**
  - The CT simulator **operator console**, where the therapist runs the scan protocol, watches the patient on CCTV and through the window, and talks over the intercom. It is made of:
    - the desk (rooms.ts:1168);
    - three task chairs (:1170-1171);
    - the backing board and its accent (rooms.ts:1718-1721);
    - four live screens (`buildCtLiveConsole`, equipment.ts:548);
    - the keyboard and mouse (equipment.ts:619);
    - the `ct_console` anchor and ring (equipment.ts:1306-1310).
  - The "random blue filing cabinet" is the **CT Supply Cart**, `medCartObject(0.88)` (rooms.ts:1188-1196), an interactable mobile cart for contrast, IV supplies and positioning accessories.
- **Now:**
  - The console floats 2.65 m off the bare west wall (inner face x 27.08):
    - desk top x 29.725..30.875;
    - board x 29.98..30.06;
    - screens at x 30.15;
    - keyboard at x 30.6;
    - chairs at x 31.65.
  - The cart stands alone at (32.3, -12.25), rot 0, behind the chairs.
- **Change:** translate the whole group by Δx -2.90, so the board lands flush on the west wall. Trim the desk's depth from 1.15 to 0.89, because the part behind the board cannot stay. Every operator-side distance is unchanged.

  | part | now | new |
  |---|---|---|
  | desk (rooms.ts:1168) | `desk(g, room.x - 1.2, room.z - 0.2, 4.8, 1.15, π/2)` | `desk(g, room.x - 3.97, room.z - 0.2, 4.8, 0.89, π/2)`: top x 27.085..27.975, z -11.6..-6.8 |
  | chairs (rooms.ts:1171) | `room.x + 0.15` (31.65) | `room.x - 2.75` (28.75; seats x 28.50..29.00, 0.525 from the desk front) |
  | backing board (rooms.ts:1718) | x 30.02 | `box(0.08, 2.35, 4.2, dark, 27.12, 1.75, -9)`: x 27.08..27.16 |
  | accent (rooms.ts:1720) | x 30.08 | x 27.18 |
  | screens (equipment.ts:548) | `mx = r.x - 1.35` (30.15) | `mx = r.x - 4.25` (27.25) |
  | keyboard (equipment.ts:619) | `r.x - 0.9` (30.6) | `r.x - 3.8` (27.7; the mouse follows to (27.7, -8.83)) |
  | `ct_console` (equipment.ts:1308) | dx -1.2 | dx -3.9 |
  | cart (rooms.ts:1189) | (32.3, -12.25), rot 0 | `ccart.position.set(room.x - 4.22, 0, room.z - 3.4); ccart.rotation.y = Math.PI / 2` at (27.28, -12.4) |

  - Update the comments at rooms.ts:1169 ("x 27.975") and equipment.ts:546-547 ("x 27.08..27.16").
  - **Cart:** it sits against the west wall at the console's -z end, drawers facing the room and the handle toward the console.
    - Its top is x 27.086..27.444, 0.006 off the wall, and z -12.59..-12.21, 0.6 m from the desk end. The decisions' x 27.25 would put the top 0.024 m into the wall (Resolved ambiguities 6).
    - It is 1.2 m from Avery.
- **NPC** (the same Δx -2.90 keeps every person-to-console relation):
  - **`ROOM_GRAPHS.ctcontrol`** (room-routes.ts:344-360):
    - nodes 0 (31.5, -3.15) and 1 (31.5, -4.5) stay;
    - node 2 (31.2, -5.6) → (28.3, -5.6);
    - node 3 (32.6, -6.95) → (29.7, -6.95);
    - node 4 (32.6, -8.5) → (29.7, -8.5);
    - node 5 (32.6, -10.5) → (29.7, -10.5).
    - Edges are unchanged. Rewrite the comment: seats x 28.50..29.00, console to x 27.975.
  - **`ARRIVAL_SPOTS.ctcontrol`** (room-routes.ts:62-66): (29.85, -7.25), (29.85, -8.45) and (30.45, -7.85), facings -1.57 as today.
  - **CT simulation therapist:** npc.ts:750 dx `1.2` → `-1.7`, at (29.8, -6.6).
  - **Avery Woods:** npc.ts:955 dx `-0.4` → `-3.3`, at (28.2, -11.0), 0.225 m off the desk front as today.
  - **Journey finals:** journey.ts:2138 (32.3, 0, -7.2) → (29.4, 0, -7.2), and journey.ts:2146 (32.3, 0, -8.45) → (29.4, 0, -8.45).
  - **ctRunner** (npc-behavior.ts:620-668): its in-room loop (down x 28, back up x 29.1) would cross the moved desk and chairs.
    - Replace the points from `[29.9, 0, -5.3]` through `[31, 0, -5.5]` with a loop on the window side, all at y 0: (31.2, -5.7), (32.4, -6.1), (33.6, -6.9), (33.6, -8.5), (33.6, -11.0), (33.8, -11.8), (34.2, -12.15), (34.6, -11.8), (34.8, -11.0), (34.8, -8.5), (34.8, -7.0), (34.4, -5.9), (33.4, -5.2), (32.4, -4.95).
    - It stays 1.1 m off the window wall, 1.77 m off the back wall and 0.8 m from the door-wall cabinet's corner.
    - Speed: the loop grows from 38.02 to 39.77 m, so the constant goes from 0.011397 to **0.010895**, keeping 0.433 m/s.
    - Rewrite the comment at npc-behavior.ts:623-627.
  - **Checks that notice:**
    - a, b and e: the ctRunner against walls and people;
    - g: the three chairs face a desk top standing against the wall;
    - k: Avery, the therapist, the spots and the finals;
    - l and m.
  - **Not affected:**
    - the CT feed cameras;
    - `roomInspectPose` (34.7, 1.82, -6.1);
    - the journey focus offset (2.8, 0.4, -2.2);
    - the door-wall cabinet (x 33.9..35.5).
- **Checks:** update the R8 block (sim-hub-scene-check.mjs:180-236):
  - keyboard → `at: [27.7, -8.35]`, `within: [27.085, 27.975, -11.6, -6.8]`;
  - mouse → `at: [27.7, -8.83]`, same `within`;
  - chairs → `at: [28.75, z]`;
  - the four screens → `at: [27.25, z]`;
  - rename the ids that say "29.725..30.875";
  - the 'blank monitor wall removed' pin at [29.95, -9] stays.
  - Add:
    - `CT control console desk against the west wall`: `size: [4.8, 0.08, 0.89], at: [27.53, -9.2]`, `flush: { axis: 'x', face: 27.08, side: 'min' }`;
    - `CT control backing board on the west wall`: `size: [0.08, 2.35, 4.2], at: [27.12, -9]`, same flush;
    - `CT supply cart on the west wall`: `size: [0.5456, 0.05, 0.3872]` (its top), `at: [27.28, -12.4], r: 0.05`, `flush: { axis: 'x', face: 27.08, side: 'min' }`.
  - Shots:
    - `ctcontrol-door` (eye [31.5, 1.75, -4.4], look [30.5, 1.1, -12.5]);
    - `ctcontrol-window-view` (eye [33, 1.7, -9], look [36, 1.6, -9.5]);
    - the existing `ctcontrol-room`, `ctcontrol-backwall` and `ctcontrol-console` (relative to Avery).

### R3-9. CT simulator room (`ctsim`, x 36..52, z -19..-3, door on zmax at x 42.7..45.3)

Room centre (44, -11). The east wall's inner face is x 51.92, the back wall's z -18.92, the door wall's z -3.08 (hallway face -2.92).

- **What they are:**
  - **The CT machine:** `ctScanner` (props.ts:1264-1290), a big-bore gantry ring at 1.25× real size today, with its bore glow, base, couch and couch base.
  - **"Poles with things hanging off":** IV poles.
    - iv1 at (43.5, -5.6) (rooms.ts:460-462) stands on the door's centre line, 2.6 m inside the door.
    - simiv at (48.7, -7.1), by the wheelchair, stays.
  - **"Two filing cabinets":** storage cabinet banks 2.2 × 1.8 × 0.5 (rooms.ts:1215-1216) at (50.2, -16.2) and (50.2, -6.2), 0.62 m off the east wall. The **wheelchair** prop at (49.4, -6.0) (rooms.ts:1200-1205) runs through cabinet B.
  - **"Hand hygiene station":** `sinkStation` (rooms.ts:1218) at (48.6, -17.55), a sink with dispensers and a sign, its splashback 0.975 m off the back wall.
  - **"CT Immobilization item":** `immobilizationStorage` (rooms.ts:1217; props.ts:872-910) at (50.05, -11.15), rot π/2.
    - It is the rack for masks, vacuum cushions and knee and foot supports, 1.6 m off the east wall and turned so the room sees its back.
    - Its sign gets no offset at rot ±π/2. The `ct_immobilization` anchor is at equipment.ts:1275-1279.
  - **"CT Simulation / Lasers may be active" sign:** `warningPlaque` (rooms.ts:1249-1257), a yellow 1.35 × 0.82 double-sided plaque inside on the east wall at (51.77, 2.25, -15.3). A laser warning belongs at the entrance, on the corridor side.
  - **Leftovers:**
    - the floating wall shelf `wallShelf(g, room.x + 5.3, 1.35, room.z - 1.4, 1.2, Math.PI)` (rooms.ts:1258), a plank in mid-air at (49.3, 1.35, -12.4);
    - the stool at (48.9, -12.5) (rooms.ts:1259) from the old storage spot;
    - a teal light bar `box(7.2, 0.04, 0.08, glow, ct.x, 3.15, ct.z + 5.8)` (rooms.ts:1731) floating at y 3.15, z -5.2, 2.2 m in from the door wall.
- **Change:**
  - **Gantry 1.35×:**
    - props.ts:1268 → `TorusGeometry(1.0125, 0.405, 18, 54)`;
    - :1270 ring y `1.25` → `1.31`;
    - :1274 → `TorusGeometry(0.6075, 0.02, 14, 48)`;
    - :1280 base `box(1.0, 0.35, 2.0, …)` → `box(1.0, 0.35, 2.1, …)`;
    - update the comment at :1265-1267.
    - The ring is 2.835 m across (today 2.625), top 2.7275, with its foot at -0.1075 hidden under the floor and inside the base.
    - The couch's bottom corners (y 0.875, z ±0.36) clear the bore glow by 0.0229 m.
    - The 2.1 m base hides the ring where it meets the base top (half-width 1.043 at y 0.35).
    - The ceiling (3.71) and the sagittal laser (3.59..3.71) stay clear.
  - **iv1** (rooms.ts:461): `iv1.position.set(38.6, 0, -10.5)`. It stands beside the couch at the patient's head end, on the -z side away from the door, base x 38.38..38.82, z -10.72..-10.28, 0.42 m from the couch edge.
  - **Cabinets** (rooms.ts:1215-1216): `cabinetBank(g, room.x + 7.665, room.z - 5.2, 2.2, 1.8, 0.5, -Math.PI / 2, 0xe2e8eb)` and the same at `room.z + 4.8`.
    - They are flush on the east wall (x 51.415..51.915) with drawers to -x: A at z -17.3..-15.1, B at -7.3..-5.1.
    - The wheelchair stays where it is, 1.7 m from B.
  - **Sink** (rooms.ts:1218): `sinkStation(g, room.x + 4.75, room.z - 7.52, 0)`.
    - The splashback's back is at z -18.915, flush; the body spans z -18.85..-18.19.
    - The +0.15 m in x keeps the rail and sign clear of the back wall's teal panel (to x 47.84).
  - **Immobilization rack:**
    - rooms.ts:1217 → `immobilizationStorage(g, room.x + 7.665, room.z - 1.6, -Math.PI / 2, 'CT IMMOBILIZATION', -0.2)`, at (51.665, -12.6). The frame spans x 51.415..51.915 and z -13.45..-11.75, facing the room.
    - **Builder fix:** add a `signOffset = 0.28` parameter and place the sign at `(x + Math.sin(rot) * signOffset, 2.42, z + Math.cos(rot) * signOffset)` (props.ts:905-907). The vault calls at rot π are unchanged.
    - With -0.2, the sign sits on the wall at x 51.865, y 2.11..2.73, 0.36 m clear of the patient-info screen.
    - `ct_immobilization` (equipment.ts:1277-1278): dx 6.05 → **7.42**, dz -0.15 → **-1.6**.
    - Raise the intercom speaker at rooms.ts:1248 from y 2.85 to **2.95** (box y 2.78..3.12), so it clears the sign's top.
  - **Shelf and stool:**
    - rooms.ts:1258 → `wallShelf(g, room.x + 7.78, 1.35, room.z - 3.3, 1.2, Math.PI / 2)`, at (51.78, 1.35, -14.3): x 51.64..51.92, z -14.9..-13.7, between cabinet A and the rack;
    - rooms.ts:1259 → `stool(g, room.x + 7.3, room.z - 3.3, 0x688596)`, at (51.3, -14.3), under it.
  - **Teal bar** (rooms.ts:1731): `box(7.2, 0.04, 0.08, glow, ct.x, 3.15, ct.z + ct.d / 2 - 0.12)`, at z -3.12.
    - It is flush on the door wall's inner face at its own height, running across the lintel's room face (y 2.65..3.75) above the door frame (top 2.71).
    - The dump shows nothing else on that face (Resolved ambiguities 7).
  - **Laser plaque:** remove it from the room (rooms.ts:1249-1257). Add `warningPlaque(scene, 41.6, 1.75, -2.87, 0, 'CT SIMULATION', 'LASERS MAY BE ACTIVE')` on the hallway face, left of the door as you face it, keeping the ☢ symbol.
    - It spans x 40.925..42.275 and y 1.34..2.16, 0.05 off the hallway face, 0.285 m from the door frame and below the header sign.
    - It goes in `scene`, not the room group `g`: an outside plaque in `g` would stop the culling pass (`groupRoomContents`) from taking the room's furniture into its cull group.
    - The sliding panels move inside the wall slab, so they never cover it.
- **NPC:**
  - No node, spot or final moves. The nearest nodes and spots are on the +z side (z ≥ -8.8). The ring stays 1.4 m from Jasmine (45.8, -9.0) and nodes 6-7.
  - Reword the `ROOM_GRAPHS.ctsim` node 1 comment "clear of the IV pole at (43.5, -5.6)" (room-routes.ts:366).
  - Check h (lying patient, couch slid 0..3.15 m) measures the couch top, which does not change.
- **Checks:**
  - The pin 'CT gantry 1.25x real size' (sim-hub-scene-check.mjs:240-245) becomes 'CT gantry 1.35x real size': `size: [1.0125, 0.405]`, `minY: -0.1075`, `maxY: 2.73`. Update its comment.
  - Add:
    - `CT room IV pole by the couch head`: `geom: 'CylinderGeometry', size: [0.0285, 0.0285, 1.4725], at: [38.6, -10.5], r: 0.05`;
    - `CT room cabinet <A|B> flush on the east wall`: `size: [2.2, 1.8, 0.5]` at [51.665, -16.2] and [51.665, -6.2], `flush: { axis: 'x', face: 51.92, side: 'max' }`;
    - `CT room sink splash flush on the back wall`: `size: [1.52, 0.78, 0.07], at: [48.75, -18.88]`, `flush: { axis: 'z', face: -18.92, side: 'min' }`;
    - `CT immobilization rack flush on the east wall`: `size: [1.7, 2.0, 0.5], at: [51.665, -12.6]`, `flush: { axis: 'x', face: 51.92, side: 'max' }`;
    - `CT room shelf on the east wall`: `size: [1.2, 0.04, 0.28], at: [51.78, -14.3]`, same flush;
    - `CT room speaker above the immobilization sign`: `size: [0.34, 0.34, 0.08], at: [51.78, -13.2], y: 2.95, r: 0.1`;
    - `CT room teal bar on the door wall`: `size: [7.2, 0.04, 0.08], at: [44, -3.12]`, `flush: { axis: 'z', face: -3.08, side: 'max' }`;
    - `CT laser plaque outside, left of the door`: `geom: 'PlaneGeometry', size: [1.35, 0.82], at: [41.6, -2.87], r: 0.05`, `flush: { axis: 'z', face: -2.92, side: 'min' }`;
    - `absent` for the old plaque at [51.77, -15.3].
  - Shots:
    - the existing `ct-gantry`, `ct-table` and `ct-low`;
    - `ctsim-from-door` (eye [44, 1.75, -3.4], look [44, 1.1, -13]);
    - `ctsim-east-wall` (eye [39, 2, -11], look [52, 1.3, -11]);
    - `ctsim-sink` (eye [46, 1.8, -13.5], look [48.6, 1, -18.5]);
    - `ctsim-hall` (eye [41, 1.7, 1.5], look [43, 1.9, -2.9]);
    - `ctsim-couch-iv` (eye [36.8, 1.9, -13], look [39.5, 1, -9.8]).
  - Re-check the patient through a full couch slide: in, dwell, out.

---

## Verification

Run every check after `pnpm build:arcade`, from `apps/web`.

**Part 1 final run must show:**

- **Scene check:** exit 0.
  - **signs:** PASS, 163 panels, none into a wall or lintel.
  - **legs:** PASS, 20 chairs and 3 couches.
  - **placements:** PASS, 143, which is:
    - the baseline 109;
    - -1 for the merged roof row;
    - +10 status lights;
    - +11 doors and baseboards;
    - +2 for the technical hallway's right wall;
    - +3 for the junction;
    - +2 entrance panes;
    - +6 for the light pole and plants;
    - +1 ambulance.
- **NPC check:** a–m PASS.
  - a: 10 movers, with the larger vehicle footprints.
  - f: 14 moments, the crew part gone.
  - j: the same 4 stand-up flows.
  - g, k, l and m as the baseline: 7 sitters, 114 at rest, 74 routes, 66 moments.
- **Visibility check:** 301 poses (297 + the 4 outside-start headings), 0 failures, with every walk pose at 1.87.
- **`pnpm test` and `pnpm check`:** pass.
- **By hand:**
  - walk mode starts outside facing both signs;
  - the glass slides open as you walk in and closes behind you;
  - E-reach on staff feels as before.
- **Shots, before and after:**
  - door-sign-consult-side, door-sign-ctcontrol, door-sign-ctsim, vault1-door-signs;
  - door-consult-hall, door-physics-hall, door-ctcontrol-in, door-vault1-hall, door-hdr-hall;
  - mgr-visitor, commons-sign, hall-north-end, hall-north-near, hall-tech-north;
  - walkway-junction, walkway-junction-near, walkway-north;
  - blade-clinical, blade-patient, blade-clinical-back;
  - lobby-kiosk, outside-spawn, lobby-entrance, sign-front, sign-top;
  - ambulance-parked, car-side, shuttle-side, overview-roofs.

**Part 2 final run must show:**

- **Scene check:** exit 0. signs PASS (163), legs PASS (20 chairs, 3 couches). placements PASS: the Part 1 count, plus each R3 section's new pins, with the edited ones updated in place.
- **NPC check:** a–m PASS with the same floors. Expected from the prototypes:
  - g: 8 sitters (the navigator added); 9 seats facing a wall across a work surface (the 5 LINAC chairs, the consult chair, and the 3 CT control chairs now 1.67 m from the west wall); 6 seated patients facing their partner within 60°;
  - j: the same 4 flows;
  - k: 114 at rest;
  - l: 74 routes;
  - m: 66 moments.
  - Read the "closest to furniture" info lines for the CT control and education rooms.
- **Visibility check:** 0 failures.
- **`pnpm test`:** passes, including `room-routes.spec.ts` for the new physics, education and ctcontrol graphs.
- **`pnpm check`:** passes.
- **Shots, before and after:**
  - consult-enter, consult-westwall, patientcare-entrance, patientcare-east;
  - education-monitor (new pose), education-enter, education-side;
  - physics-room, physics-door, radbio-room, radbio-top;
  - dosimetry-door, dosimetry-cabinet-west;
  - mgr-visitor, mgr-door, manager-desk, manager-office;
  - ctcontrol-door, ctcontrol-window-view, ctcontrol-room, ctcontrol-console;
  - ct-gantry, ct-table, ct-low, ctsim-from-door, ctsim-east-wall, ctsim-sink, ctsim-hall, ctsim-couch-iv.

**Owner page:** a before/after page for the owner, published as an artifact like the earlier rounds.

## Out of scope / not changing

**From the decisions:**

- The CT control / CT room window overlap: only 2.5 of the 4.5 m of glass is see-through (z -11.25..-8.75).
- The CT control cabinet touching the couch underside.
- A dedicated pointing animation or head aim. People face things by turning; the 'gesture' arm stays as it is.
- The education desk size (3.8 m).

**Found by the investigations, not in the approved summary:**

- Each vault door's red beam-on lamp sits inside the 0.58 m wall (rooms.ts:573-585) and is invisible. P1-1's light is the visible one.
- The kiosk's "Explore freely" teleporting a walking player (P1-9).
- Header canvases matching their sign's proportions; the lettering stays drawn 1.33× wide.
- Seating Chris Evans; a monitor on the physics desk; an open-front immobilization rack; a laser symbol on the CT plaque.
- The guided camera rising to the new eye height (its 1.66 nodes stay).

## Resolved ambiguities

1. **Vault 2's status light** sits left of its sign. The decisions say "right of each door sign (report A, option A)", but A's option A table puts both vault lights on the main-corridor side, above each vault's red entrance marker, mirrored: (63.64, 3.78, ±15.2). The table is followed; the other nine are right of their signs.
2. **Swing doors keep A's 6 mm.** "Seam 0 where faces are hidden" is applied to the double doors' and sliding panels' meeting edges and to the vault and HDR jambs. The swing leaf stops 6 mm short of the latch jamb because its corner sweeps past the jamb face as it opens.
3. **The patient-care route nodes move in Part 2 (R3-2), not with the doors.** The decisions list them under Doors (Part 1). But until R3-2 moves the white block, the new edge 3→4 at x ≈ -28.56 runs through it (x -29.1..-26.9, z 5.225..5.775), and check l would fail. In Part 1 the old crossing stays visual only; doors are not furniture.
4. **The white block becomes a drawer counter** (`cabinetBank`, A's own option) rather than the turned plain box, because "becomes a supply counter" is meant to answer the owner's "idk what it is". A's prototype used the box. Nobody stands within 4 m, so checks k and l are unaffected.
5. **Jordan Price turns to face the physicist** (npc.ts:867, -1.2 → 2.78). C lists this as optional in item 1, and C's checked prototype includes it. The decisions take "the physicist and the graph changes in report C item 1".
6. **The CT supply cart is at x 27.28, not 27.25.** At 27.25 with rot π/2, its 0.3872 m top reaches x 27.056, 0.024 m into the west wall (face 27.08). 27.28 keeps it 0.006 m off; z -12.4 and the rotation are as decided.
7. **The floating teal bar** has no numbers in D or the decisions. It goes flush on the CT room door wall's inner face at its own height (z -3.12, y 3.15), the smallest move that puts it on a wall.
8. **The education stand-ups stay out of check j,** as decided. A's added j flows and its oriented-box refinement are not used, and check l covers those stand-ups.
9. **Line anchors corrected against the code:**
   - the header font rule is helpers.ts:87 (C said :83);
   - Mia's education final is journey.ts:1896 (A said :1891);
   - the CT finals are journey.ts:2138 and :2146.
10. **The lobby entrance trigger:** the decisions say "a person or the player". It uses B's 3.0 m radius around (0, 10) for people and 5.5 m for the player, with `openSeconds` 0.9, so the panes are clear before the player reaches them (found while planning: at 3.0 m and 2.15 s they were still opening). So the visitor walker (passing at 2.5 m) and a departing patient at the doors also open it, as at a real sensor door. Its door id `'lobby-entrance'` keeps it out of room-move door calls.
