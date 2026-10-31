# sim-hub scenery fixes: design

**Date:** 2026-10-31. **Status:** approved by the owner on 2026-10-31. The work ships as two PRs:

- **Update 1:** rooms, signs and chairs.
- **Update 2:** the building shell.

The owner's request is saved verbatim (not committed) in `.superpowers/sdd/scenery-request-2026-10-30.md`.

## Problem

After the NPC stage 3 work (#181) the owner walked the sim hub and listed scenery faults:

- signs poking through walls;
- chairs with no legs;
- hallways with no roof, and hallway ends open to the outside;
- a narrow treatment walkway with no outside wall;
- a small HDR suite;
- a CT scanner poking through the ceiling;
- many props floating in rooms or sitting in the wrong place.

Three read-only investigations on 2026-10-30 measured each item from the code and from a runtime dump of every mesh's world box. The tools are listed under Verification. Paths are relative to `apps/web/arcade-src/sim-hub/src/` unless given in full.

## Owner decisions (2026-10-31)

- **Vault status screens:** both vaults get a **live** status board, in mirrored places. Vault 2's board also changes over time; see V4 for what it shows.
- **Learning Commons screen:** flush on the wall the five chairs face.
- **CT scanner:** **shrink it to real size** under the normal 3.75 m ceiling. The CT room ceiling does not change.
- **Physics lab "glass pane"** (`atom`, a decorative 2 m disc): remove it.
- **QA lab "glass cube"** (the interactable Water Phantom, 3.1 × 1.55 × 2.8 m): make it real size, on a cart, and keep it interactable.
- **Blank monitors** (`monitor()`, `MAT.screen`) are props: not interactable and never updated. The CT control one may be removed.
- **Treatment walkway:** widen it to about 5.6 m by putting its outside wall in line with LINAC Control's east wall (x = 58). The HDR suite moves west to that line and grows from 11 × 12 m to 13 × 14 m.
- **Walkway roof height:** 5.7 m, the vault height, so the vault door signs above the doors stay visible. The other hallway roofs are at 3.75 m.

## Global constraints

- **NPC check:** `node apps/web/scripts/sim-hub-npc-check.mjs` checks a–m stay green. The count floors stay (REST_FLOOR 40, HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15). If a move breaks a check, fix the NPC data (arrival spots, `ROOM_GRAPHS` nodes, finals, offsets). Never loosen the check.
- **Unit tests:** `pnpm --filter web test` (vitest, including `room-routes.spec.ts`) stays green.
- **Visibility check:** `node apps/web/scripts/sim-hub-visibility-check.mjs` stays green. Update its hard-coded poses when the objects they frame move.
- **Seat tops:** chair 0.54, couch 0.59, bench 0.6, task chair 0.65 (the `addSeat` anchors). They do not change.
- **No new dependencies.** three.js stays at 0.160.0.
- **Room contents:** objects stay inside their room's box (`visibility.ts` puts a mesh in a room's content group only if its box is inside the room, inset 0.05 m).
- **Mirrored vaults:** vault 1 and vault 2 furnishing is copy-pasted (`rooms.ts` `furnish` cases `vault1` ≈1272–1370, `vault2` ≈1373–1470). Every vault fix applies to both, mirrored where stated.
- **"Flush on a wall":**
  - the back of the object is 0.00–0.06 m from the wall's inner face (the existing workflow boards sit 0.05 m off);
  - the stand of a `monitor()` placed on a wall is removed or hidden, so no stem hangs in the air.
- **"On a desk":** the object's lowest point is at the desk top, y = 0.88 for `desk()`, within 0.01 m. For `monitor()`: y = 0.88 + 0.28 + h/2.

---

## Update 1: rooms, signs and chairs

### R1. Patient Education (`education`, centre (-42, -7.5), door on zmax)

- **Now:** a blank 1.8 × 0.95 `monitor` sits on the door wall (`rooms.ts` ≈1052, at (-38.9, 1.7, -3.1)). Its stand hangs in the air. The desk (centre (-42, -6.2), top 0.88, z -6.75..-5.65) has no screen.
- **Change:**
  - Replace it with a desk computer screen, `monitor(g, -42, 1.40, ≈-5.95, Math.PI, 0.8, 0.48)`.
  - Its stand sits on the desk top, and it faces -z, toward the visitor chairs at z -7.7 and the navigator at (-43.6, -6.95).
- **NPC:** none within 1 m.

### R2. Physics Learning Laboratory (`physics`)

- **Change:** delete the `atom` disc (`rooms.ts` ≈1077–1081). Update the `room-routes.ts` comment that names it.
- **NPC:** arrival spots are 2.2 m or more away. No effect.

### R3. LINAC Engineering (`engineering`, inner x 3.08..12.92, z -35.92..-26.08, door on xmin at z -32.3..-29.7)

- **Now:** there are three screens.
  - The big LINAC head schematic is on the zmin wall.
  - "LINAC System Overview" (`equipment.ts` ≈207–217) is on the xmin wall and covers 1.46 m of the 2.6 m door opening.
  - "Vault Shielding Concepts" (`equipment.ts` ≈219–229) is on the xmax wall.
- **Change:**
  - Move both small screens onto the zmax wall, opposite the big screen, side by side.
  - They face -z (`rot = Math.PI`) at z ≈ -26.16, x = 5.6 and 10.4, with y unchanged (2.03).
  - They keep their interaction.
- **NPC:** nobody near the zmax wall. The engineering graph comment names the xmin screen, so update the comment.

### R4. Machine QA (`qa`)

- **Now:** the tank `box(3.1, 1.55, 2.8, MAT.water)` is at (-7.5, 1.0, -43.3) (`rooms.ts` ≈1106). It is interactable as "Water Phantom", and `equipment.ts` anchor `qa_water` sits at the same x/z.
- **Change:**
  - The tank becomes about 0.65 × 0.55 × 0.65 m of `MAT.water`, sitting on a wheeled cart about 0.8 m tall.
  - It stays at the same x/z, so the `qa_water` anchor and ring still match.
  - Keep `registerInteractable(tank, 'Water Phantom', …)` on the tank mesh.
- **NPC:**
  - The `ARRIVAL_SPOTS.qa` spots are at x ≈ -5.65, "beside the QA enclosure". Move them to stand beside the cart, about 0.5 m from it, facing it.
  - The graph nodes round the old tank ends stay valid (more room). Re-check (k), (l) and (m).

### R5. Dosimetry (`dosimetry`)

- **Now:** a blank 2.5 × 1.3 `monitor` is on the zmax wall (`rooms.ts` ≈1119). The centre desk (9, -47.6, top 0.88, z -48.1..-47.1) has no screen.
- **Change:**
  - Replace it with a wide desk screen, `monitor(g, 9, 1.485, ≈-47.4, Math.PI, 1.2, 0.65)`, on the centre desk.
  - It faces -z, toward Dr Shah at (7.1, -48.35).
- **NPC:** Dr Shah is 1.9 m away. No effect.

### R6. Learning Commons (`commons`, inner z up to -54.08)

- **Now:** a blank 1.8 × 1.0 `monitor` floats 1.0 m in front of the west wall (`rooms.ts` ≈1260).
- **Change:**
  - Put it flush on the zmax wall, centred at x = -8, y ≈ 1.9, facing -z.
  - The five chairs at z -61.3 face +z, so it acts as a presentation screen.
- **NPC:** nearest people are 3.1 m away.

### R7. Manager's office (`manager`, door on zmin, inner z 3.58..12.42)

- **Now:**
  - The desk (2.5 × 0.85) is centred at (20, 6.5), z 6.08..6.92. Its monitor is at z 6.2, facing +z.
  - The visitor chairs are at (19, 9.5) and (21, 9.5), facing -z; their seat front edge is at z 9.22. The chairs do not move.
- **Change:**
  - Move the desk so its +z edge is about 0.3 m from the seat fronts: centre ≈ (20, 8.5), z ≈ 8.075..8.925.
  - The monitor sits on the desk near its +z edge, facing -z, toward the manager. The manager stands on the door side of the desk, facing the visitors.
- **NPC:**
  - Primary (20, 7.1) rot 0 → about 0.6 m in front of the new desk's -z edge, facing +z.
  - Secondary Chris Evans (18.2, 9.6) and `ROOM_GRAPHS.manager` nodes (18.2, 6.5) and (18.6, 7.6), which go round the old desk's -x end: re-route round the new desk. Update the comments.

### R8. CT Control (`ctcontrol`)

Room: inner x 27.08..35.92, z -13.92..-4.08. The door is on zmax (gap x 30.2..32.8). The window is on the xmax wall (z -11.25..-6.75, y 1.18..2.83). The desk top is x 29.73..30.88, z -11.6..-6.8.

1. **Keyboard:**
   - It is at x 31.23..31.47 (`equipment.ts` ≈600, `consoleKeyboard(g, r.x - 0.15, …)`), which is past the desk edge (30.88).
   - Move it onto the desk top, about x 30.6, with the mouse alongside.
2. **Chairs:**
   - Three task chairs are at x 32.45 (`rooms.ts` ≈1134–1135), so their seat fronts are 1.32 m from the desk edge.
   - Move them so the seat front is about 0.5 m from the desk edge: x ≈ 31.65, same z, same rotation. The seat anchors follow automatically (`taskChair` → `addSeat`).
3. **White cabinet:**
   - It is at x 31.8..33.4, z -5.78..-5.33 (`rooms.ts` ≈1137), in front of the door.
   - Move it against the zmax wall east of the door: x ≈ 34.7, back flush on the wall, front facing -z.
4. **Live "CT CONTROL" board:**
   - It is `createWorkflowDisplay('ctControlState', 35.82, 2.22, -11.2, -π/2, …)` (`equipment.ts` ≈259) and covers the window.
   - Move it flush onto the zmin wall, centred at x 31.5, facing +z, with its top below the interior sign (sign bottom y 2.75). It stays live.
5. **Blank monitor and duplicates:**
   - Delete the blank monitor on the zmin wall (`rooms.ts` ≈1136).
   - Delete the blank 2 × 2 `monitorWall` (`rooms.ts` ≈1133), which sits inside the live console screens.
6. **Hidden live screens (found during investigation):**
   - `buildCtLiveConsole` (`equipment.ts` ≈523–600) places its four live screens in two columns one behind the other: x 29.45 and 30.5 at the same z. "CT SIM STATUS" and "GANTRY VIEW" are hidden behind the backing board (x 30.02).
   - Lay the four out as a 2 × 2 grid side by side along z, all in front of the board, facing +x, with their labels.
- **NPC (most affected room):**
  - `ARRIVAL_SPOTS.ctcontrol` (31.3, -7.4), (31.3, -6.75) and (31.85, -7.75), and the `ROOM_GRAPHS.ctcontrol` nodes at x 31.2–31.85, sit in today's aisle between the desk and the chairs. The moved chairs cover it.
  - Re-route behind the chairs (x ≈ 32.6 or more) and move the arrival spots there.
  - Check the primary therapist (32.7, -6.6, console pose) and Avery (31.0, -11.0).
  - Update the comments that name the keyboard tray and the cabinet.

### R9. CT Simulator (`ctsim`): real-size scanner

- **Now:** `ctScanner` (`props.ts` ≈1258) builds a torus with R 2.15 and tube 0.58, centred at y 2.15. That gives a 5.46 m gantry, top y 4.88, which pokes 1.13 m through the 3.75 ceiling. The bore glow torus has R 1.5. The base box is 1.2 × 1.0 × 4.9. The table top is at 1.025 (x 37.2..43.0, z -9.5); it slides +x into the gantry by `CT_COUCH.inDist`.
- **Change:**
  - Keep the ring centre at x/z (44, -9.5). Torus R 0.75 and tube 0.30, centred at y 1.05: outer height 2.10, bore 0.90 m (big-bore CT).
  - The bore glow fits just inside the bore. The base becomes a low plinth under the ring.
  - The sliding table (0.72 wide) and the lying patient must pass through the bore without intersecting the ring: the chord at the table underside is about 0.83 m at bore centre 1.05.
  - `CT_COUCH.ring` and `.bore` keep working (`flashCtScanner`).
- **NPC and shots:**
  - `LYING_SURFACES.ctsim` is the table, unchanged.
  - Re-shoot `ct-table` and `ct-low`. Re-check the patient through a full couch slide (in, dwell, out), so the patient and table never cut the ring.

### R10. LINAC Control (`linaccontrol`, inner x 44.08..57.92, z 4.08..13.92, door on zmin)

Every screen in the desk group faces +x, so the group goes against the **west** wall, facing east as now. "Left/right" is as seen by a person at the desk facing the screens (facing -x): left = +z, right = -z.

- **Desk:** `desk(g, 50, 9, 6.0, 1.25, π/2)` (`rooms.ts` ≈1263) → back edge on the west wall: centre x ≈ 44.71.
- **Chairs, therapists and finals:** they move with it by the same Δx (≈ -5.29). This keeps the desk–chair gap.
  - Chairs: x 51.95 → ≈46.66.
  - Morgan Reed: `npc.ts` ≈772, (51.35, 10.6) → ≈(46.06, 10.6); the journey reset is `journey.ts` ≈825.
  - Marcus Hill: (50.8, 7.0) → ≈(45.51, 7.0).
  - Journey finals: `journey.ts` ≈1303/2497 (50.85, 8.6) and ≈1311/2505 (51.1, 10.2).
  - `ARRIVAL_SPOTS.linaccontrol` (x 52.75) and `ROOM_GRAPHS.linaccontrol` nodes 1–5. Node 0 is the door; add a node inside the door if the check needs one.
  - The `equipment.ts` `linac_console` anchor (dx -1.0, ≈1287).
- **Board:** the dark backing plate and its accent (`addClinicalWallPolish`, `rooms.ts` ≈1663–1666) go flush on the west wall. They may grow taller if the monitor stack needs it, keeping the top below the ceiling lights.
- **Monitors,** in one row of three columns in front of the board, stems on the desk top, left to right:
  - **Left column:** Vault Wide on top, Patient View below. They are 1.68 × 0.95 today; shrink to 1.28 × 0.72 (16:9 kept) so the stack fits.
  - **Middle column:** Cam A on top, Overhead below. As today.
  - **Right column:** Cam B on top, Vault Status (mirror) below. Today Cam B is below and both sit hidden behind the board at x 48.95.
  - Each label tab sits where it does today relative to its monitor. No frame overlaps another frame.
  - The live feeds do not depend on monitor positions (`renderOperatorLiveFeeds`, `equipment.ts` ≈652).
- **Hidden duplicates:** delete the blank `monitorWall` (`rooms.ts` ≈1264) and the two blank `monitor`s (`rooms.ts` ≈1268–1269). They sit inside the live screens.
- **Keyboards:** `consoleKeyboard` ×2 (`equipment.ts` ≈505–506, at x 50.75) → on the desk top, in front of the monitor columns.
- **Clock:** `wallClock` at (55.9, 2.85, 5.35) floats 2 m off the east wall (`rooms.ts` ≈1271). Move it flush on the east wall at about z 5.4, facing -x, clear of the Treatment Control screen (z 7.51..10.49).
- **White cabinet:** `rooms.ts` ≈1270. Move it under the Treatment Control screen (frame bottom y 1.38) on the east wall: centre ≈ (57.69, 9), front facing -x. Height 1.3, so it clears the frame.
- **Visibility check:** the poses that frame the old Vault Wide / Patient View spots (`scripts/sim-hub-visibility-check.mjs` ≈409–420) follow the new spots.

### R11. Cabinet drawer lines (found during investigation)

- `cabinetBank` (`props.ts` ≈606) rotates the body but not its drawer lines and handles. Any cabinet with `rot ≠ 0` shows as a plain white box, with the lines buried inside or on its back; this is the owner's "random white box".
- Rotate the lines and handles with the body, so every cabinet shows its drawer fronts on the side it faces.

### V. Treatment vaults 1 and 2 (mirrored; vault 2 is vault 1 mirrored across z = 0)

The vault west walls are 0.58 m thick (x 63.71..64.29), with door openings at z -20.4..-15.6 (vault 1) and 15.6..20.4 (vault 2). The corridor-facing wall face is at x = 63.71. The door header sign spans y 3.40..4.16.

1. **Warning signs above the door, outside:**
   - "CAUTION / RADIATION AREA" and "DO NOT ENTER / BEAM ON WHEN LIGHT IS ON" come from `addVaultDoorwaySigns` (`rooms.ts` ≈834). They sit inside the wall thickness at x 63.88, straddling the opening edges.
   - "NO ENTRY / WHEN BEAM ON" is a `warningPlaque` inside the vault behind the maze wall (`rooms.ts` ≈1357 and ≈1457).
   - Put all three side by side on the corridor face above the door, over the header sign: x ≈ 63.66, facing -x, y ≈ 4.85 (spans about 4.44..5.26, below the 5.7 wall top). The three 1.35 m plaques span z centre ±2.2 inside the opening's width.
   - Remove the inside NO ENTRY plaque. The interior "CAUTION / HIGH RADIATION AREA" plaque stays.
2. **Hand-washing station:**
   - `sinkStation` (`rooms.ts` ≈1337/1437) sits about 1.4 m off the wall it backs onto.
   - Vault 1: same wall (zmin), back flush.
   - Vault 2: move it to the opposite wall (zmax, z = 31) near the same x, back flush, facing -z.
   - The separate sanitizer dispenser and glove rack stay.
3. **Grey picture over the Setup Checklist:**
   - The `wallArt` 1.2 × 0.52 at (93.65, 3.15, room.z − 6.0) (`rooms.ts` ≈1369 and its vault 2 twin) covers the top-left of the "SETUP CHECKLIST" screen (frame z room.z − 6.89..room.z − 2.71, up to y 3.36). This was confirmed by a screenshot.
   - Move it along the east wall so it overlaps no screen, about z = room.z − 8.6. Check that the new spot is free.
4. **Live status boards, mirrored on the junction-side wall:**
   - **Vault 1:**
     - Move the live `createWorkflowDisplay('vault1State', …)` (`equipment.ts` ≈260), which floats 2.9 m off any wall at (90.78, 2.32, -8.2).
     - Put it flush on vault 1's **zmax** wall (z = -5, the right wall when entering), centred at x ≈ 78.45 and facing -z, where Vault 2's screen is today, mirrored.
     - Size it about 3.5 × 1.97 (the board texture is 1100 × 620).
     - Delete vault 1's static framed "VAULT STATUS" on its zmin wall (`rooms.ts` ≈1309–1323).
     - Move its "VAULT 1 · LINAC" `interiorRoomSign` (zmin wall, y 3.58) to the zmax wall above the board.
     - The LINAC control "Vault Status (mirror)" keeps working: it uses the same texture.
   - **Vault 2:**
     - Replace the static framed "VAULT STATUS" on its zmin wall (z = 5, the left wall when entering) with a live board titled **"VAULT 2 STATUS"**: same size, same spot, facing +z.
     - Raise its "VAULT 2 · LINAC" sign so the board does not cover it.
     - Vault 2 has a resident patient on the couch and a therapist in the room, and no journey.
     - Its board steps through that patient's setup on a loop, on the sim clock: identity check (2 identifiers), positioning (indexed immobilization), setup imaging (match to plan), setup verified. Each step lasts about 20–30 s, then it starts over.
     - It never shows "beam on", because a therapist is in the room.
     - Use the same row style as vault 1's board. Use the patient's display name if the cast has one, otherwise "Patient".

### S. Hallway signs through walls

- **Now:** `makeDirectionalSign` (`helpers.ts` ≈499) centres a 0.76 m-tall plane on (x, z). Two blades are placed 1.2 m from a wall line with half-widths of 1.7 and 1.85, so they cross the wall:
  - **"CT SIMULATION"** (`equipment.ts` ≈1111, x 27.8, z -4.50..-1.10, w 3.4) reaches 0.42 m into CT Control (wall outer face z -3.92).
  - **"TREATMENT AREA →"** (`equipment.ts` ≈1121, x 46.5, z 0.90..4.60, w 3.7) reaches 0.52 m into LINAC Control (wall outer face z 3.92).
- **Change:**
  - Move each blade's centre so its inner edge stops 0.05 m short of the wall's corridor face: z ≈ -2.17 and ≈ 2.02.
  - Also fix every other sign or plate the dump finds intersecting a wall:
    - the CT sim nook sign by 0.06 m;
    - the vault wall plates crossing the x 66.79 infill;
    - the HDR door signs by 0.05 m;
    - any vault door sign left inside the 0.58 m wall.
  - The vault door plaques themselves move in V1.
- **Vault door header signs:** "TREATMENT VAULT 1/2 · LINAC" (`makeDoorHeaderSign`, `helpers.ts` ≈163) sits 0.13 m off the wall centre line. On the 0.58 m vault walls that puts it inside the lintel above the door (x 63.87), so it is hidden. Offset the header and its back plate by the wall's half-thickness beyond 0.08 (+0.21 m for vaults; no change for 0.16 m walls), so the vault header shows on the corridor face.
- **Hidden door-side name signs:** `makeWallSign` (`helpers.ts` ≈119) puts a 2.15 m name sign beside every room door 0.035 m off the wall centre line, inside the wall, so it has never been visible. **Owner decision (2026-10-31): remove them** (the call in `buildDoor`, `makeWallSign` and its only user `makeSignTexture`).
- **CT changing-nook sign:** 2.35 m wide, it reaches 0.1 m into the CT room's west wall. Make the nook sign 2.1 × 0.8 (same proportions as its canvas), which also shrinks the vault nooks' signs.
- **Lintels:** name the lintel and window-header boxes (`buildSide`) `wall-lintel`, so the check measures panels against them too (they are not colliders).

### C. Chair and couch legs

- `chair()` (`props.ts` ≈530; seat y 0.42..0.54) and `couch()` (`props.ts` ≈549; seat y 0.27..0.59) have no legs. That is 20 chairs (lobby 7, consult 1, social 2, education 3, commons 5, manager 2) and 3 couches.
- Add four thin legs (about 0.04 × 0.04) from the floor to the seat underside, inset about 0.04 from the seat corners and rotated with the chair. Use the **same material instance as the seat** (`MAT.uphol`): `scripts/lib/furniture.mjs` `seatMeshes` exempts same-material parts within 0.45 m of a seat anchor from sitter collision.
- Seat and back boxes and seat tops do not move.

---

## Update 2: the building shell

Planned after Update 1 merges. Re-measure first: Update 1 moves nothing here, but the plan needs exact wall pieces.

### B1. Hallway roofs

- **Now:** rooms have ceilings: `buildRoom` (`rooms.ts` ≈725–754), a 0.08 slab at the wall height, pushed to `ceilings` (`main.ts` 404). The four hallways have none, only light strips at y 3.72.
- **Change:** add roof slabs over each hallway floor (`main.ts` ≈409–413), not overlapping room ceilings:
  - west/patient: x -52..-12, z -3.5..3.5;
  - technical: x -3.5..3.5, z -66..-10;
  - clinical: x 12..58, z -4..4;
  - treatment walkway: the widened strip, see B3.
- **Heights:** 3.75 for the first three, with the light strips flush under them. 5.7 for the treatment walkway, with its light strips moved up under it.
- **Gap fill:** wherever a 3.75 roof meets the 5.7 walkway, or a 3.75 room wall forms the walkway side (LINAC Control's and the HDR suite's walkway-facing walls), fill the gap up to 5.7 so no sky shows.
- **Roof flags:** every roof slab is pushed to `ceilings`, so it hides in overview like the room ceilings (`walk.ts` 309/462, `main.ts` 735). It has `castShadow = false` (the `box()` helper turns shadows on above 1 m).

### B2. Hallway end walls

Add walls (`infillH` / `infillV`, colliding, `INFILL_MAT`) at the four open ends:

- the west end of the patient hallway, x = -52, z -3..3;
- the north end of the technical hallway, z = -66, x -3..3;
- both ends of the treatment walkway, z = -31 and z = 31, from the new outside wall to the vault walls.

The lobby glass doors (z = 10) are the building entrance and stay open.

### B3. Treatment walkway

- **Now:**
  - The floor is x 60..68, z -31..31 (`main.ts` 412), with a junction plate.
  - Vault walls sit on the walkway centreline (x 63.71..64.29). The west side is open for z -31..-4.5 and z 14..19.
  - Clear width: 3.7 m north and south, 5.6 m beside LINAC Control, 2.13 m beside the HDR suite (x 61.58..63.71).
- **Change:**
  - A new outside wall centred on x = 58, matching LINAC Control's east wall, for z -31..-4 and z 14..19. It is 5.7 m tall.
  - The HDR suite's walkway wall is also x = 58 (B4).
  - Widen the floor to x 58..64, plus the existing junction plate.
  - Trim the clinical hallway's south infill wall (z = -4, today x 52..60) to end at x = 58.
  - The clear width becomes about 5.6 m along the whole walkway.
- **Player path:** `walk.ts` `TREATMENT_JUNCTION_X = 64` and the guided-route nodes at x 64 run inside the vault wall (issue #182). Move them to the walkway's middle (x ≈ 60.9). Keep the vault door approach points.
- **NPC:**
  - `NPC_TREATMENT_LANE_X = 63.4` stays inside the walkway.
  - The HDR runner and the hdr graph nodes follow the moved HDR door.
  - Re-run the NPC check, plus a sweep of every hard-coded x in 58..64 (`npc-behavior.ts`, `room-routes.ts`, `journey.ts`, `npc.ts`, `rooms.ts` `corridorAnchor`, `equipment.ts` sign at x 63.2 and the beacons).

### B4. HDR suite, bigger

- **Now:** `hdr` is x 50.5..61.5, z 19..31 (11 × 12), with its door on the xmax wall.
- **Change:**
  - Centre (51.5, 26), w 13, d 14, so x 45..58 and z 19..33. The door stays on xmax, now at x = 58, centred on z = 26.
  - West and south are free.
  - The north wall at z 19 keeps the 5 m gap to LINAC Control (z 14).
  - Room `cam` and `look` move with it.
- **Moves with it:**
  - contents placed relative to the room centre (`hdrSuite`): check each;
  - the cast offsets (relative);
  - `ROOM_GRAPHS.hdr` and `ARRIVAL_SPOTS.hdr` (absolute: re-derive);
  - journey finals, if any;
  - the `npc-behavior.ts` hdrRunner path (`≈725–775`) through the old door at x 61.5;
  - the `equipment.ts` beacon at (61.1, 3.15, 24.1);
  - the cart and AED near (55.3, 23.8).
- **Checks:** re-shoot `hdr-low`.

---

## Verification

- **Scene dump (dev tool):**
  - It loads the built sim hub headless and writes every mesh's world box, geometry, material colour/opacity and group chain to JSON. It was built in the session scratchpad on 2026-10-30.
  - Update 1 adds it to the repo as `apps/web/scripts/sim-hub-scene-check.mjs` (with `--dump <file>` to write the boxes), checking this spec's measurable rules:
    - no sign or plate box intersects a wall box;
    - each named moved screen is on its desk top or flush on its wall;
    - every `chair()` / `couch()` has 4 legs touching the floor.
  - Not run in CI. Output goes to a path given on the command line.
- **Screenshots:**
  - `scripts/sim-hub-shots.mjs` gains scenery shots for each changed spot, so before and after can be compared.
  - Shots that show ceilings must put the page in walk mode or set `ceilings` visible. The boot state hides ceilings.
- **Per task:** NPC check a–m, unit tests, the visibility check, and lint/typecheck as CI runs them.
- **Owner page:** a before/after page for the owner, published as an artifact like stage 3's "Around the Furniture".

## Out of scope

- Raising ceilings. The CT scanner shrinks instead.
- Giving vault 2 a patient journey (its board only loops through setup).
- The other issue #182 items, apart from the player path in B3.
- New furniture beyond the cart under the water phantom.

## As-built notes

(Filled in as each update lands.)
