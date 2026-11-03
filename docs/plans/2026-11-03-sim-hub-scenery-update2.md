# sim-hub scenery fixes, Update 2 (the building shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- The hallways get roofs, and their open ends get walls.
- The treatment walkway gets an outside wall and becomes about 5.6 m wide.
- The HDR suite grows to 13 × 13 m.
- The player's walking line in the walkway moves out of the vault wall.

**Architecture:** Geometry changes go in `rooms.ts` (walls, roofs, curb, HDR room entry) and `main.ts` (floors, lights). Path constants go in `walk.ts`, NPC data in `room-routes.ts` and `npc-behavior.ts`. `apps/web/scripts/sim-hub-scene-check.mjs` gets `PLACEMENTS` entries for every new wall, roof and moved item. The NPC check a–m stays green. The shots tool gains a `ceilings` option so the pictures can show the roofs.

**Tech Stack:** three.js 0.160.0 (pinned), TypeScript, Vite (`pnpm build:arcade`), Node dev scripts, vitest.

**Spec:** `docs/specs/2026-10-31-sim-hub-scenery-design.md`, Update 2 (B1–B4). Its **"Re-measured 2026-11-03"** block overrides the older numbers there.

## Global Constraints

### Repo and process rules
- **Branch:** `fix/sim-hub-scenery-building`. Commit after each task. Never `git add` anything under `.superpowers/` or `e2e/.auth/`. Never force-push.
- **Scratch files:** only under `/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/`.
- **Deleting files:** never delete a file you did not create. No glob deletes. Never read or open any file whose name starts with `.env`.
- **Permissions:** if a permission is denied, stop and report it. Do not work around it.
- **Dependencies:** none new. three.js stays at 0.160.0.

### Checks that stay green
- **NPC check:** `node scripts/sim-hub-npc-check.mjs` checks a–m stay green. The count floors (REST_FLOOR 40, HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15) do not change.
  - If a change breaks a check, change only the NPC data the task names.
  - Never loosen the check, its thresholds or its floors.
- **Scene check:** `node scripts/sim-hub-scene-check.mjs` exits 0: signs, legs and every `PLACEMENTS` entry. It already passes on main.
- **Tests:** `pnpm test` (vitest) and `pnpm check` stay green.

### Geometry rules
- **Walls:** `infillH(x1, x2, z, h = 3.75, t = 0.18)` and `infillV(z1, z2, x, h = 3.75, t = 0.18)` build colliding walls in `INFILL_MAT`. A wall is centred on its line. `wall()` gives a box of size (len, h, t) for H walls and (t, h, len) for V walls.
- **Roofs:** a box of 0.08 thickness centred at the roof height: 3.75 (spans 3.71..3.79) or 5.7 (spans 5.66..5.74). Roof material `std(0xe9edef, 0.95, 0)`, as the room ceilings use.
  - Each roof is named `hall-roof`.
  - `castShadow = false` and `receiveShadow = false`.
  - Pushed to `ceilings` (`main.ts`), so the overview hides it.
  - Its edges lie on wall centre lines and never overlap a room ceiling.
- **Gap fills:** boxes in `INFILL_MAT` from y 3.75 to 5.7: size (t, 1.95, len), centre y 4.725. They are not colliders. Each is named `roof-fill`.

### Code style
- Match the surrounding code: tabs, single quotes, and the legacy `// eslint-disable-next-line no-case-declarations -- …` before a `const` in a `switch` case.
- Update every comment that names an old position.
- Remove anything your change leaves unused.

### Commands (from `apps/web`)
- **Build:** `pnpm build:arcade`. Rebuild after every source change.
- **Checks:**
  - `node scripts/sim-hub-scene-check.mjs`
  - `node scripts/sim-hub-npc-check.mjs` (`--only k,l,m` and `--svg <file>` while iterating; the full a–m before committing)
  - `pnpm test`
  - `pnpm check`
- **Format and lint the touched files:** `pnpm exec prettier --write <files> && pnpm exec eslint <files>`. Do not run the package-wide `pnpm lint`; a gitignored `apps/web/.superpowers` breaks it locally.
- **Screenshots:** `node scripts/sim-hub-shots.mjs <outDir> [shotName]`.
  - outDir `…/scratchpad/scenery/u2/after`, or `…/u2/before` in Task 1.
  - Read the PNGs to look at them.

---

### Task 1: Shots that can show ceilings, and the before shots

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/npc-check-hook.ts` (import and expose `ceilings`)
- Modify: `apps/web/scripts/sim-hub-shots.mjs` (per-shot `ceilings` option, new scenery entries)

**Interfaces:**
- Produces:
  - `window.__NPC.ceilings` (the `main.ts` `ceilings` array);
  - a shot entry `{ name, eye, look, ceilings?: true }`. With `ceilings: true` every ceiling and roof is shown for that shot; otherwise they stay hidden, as at boot.

- [ ] **Step 1: Expose `ceilings` on the hook**

In `npc-check-hook.ts`, change `import { doors } from './main';` to `import { doors, ceilings } from './main';`. Add to the `__NPC` object, after `doors,`:

```ts
			/** The room ceilings and hallway roofs (main.ts); hidden at boot and in overview. */
			ceilings,
```

- [ ] **Step 2: The `ceilings` shot option**

In `sim-hub-shots.mjs`:

1. In the per-shot `page.evaluate`, right after `V.spec = s;`, add:

```js
					// ceilings and hallway roofs are hidden at boot (as in overview); a shot may show them
					N.ceilings.forEach((c) => (c.visible = !!s.ceilings));
```

2. In the comment above `SHOTS`, add one sentence: `A shot with \`ceilings: true\` shows the ceilings and hallway roofs, which the boot state hides.`

- [ ] **Step 3: The Update 2 shots**

Append to the end of `SHOTS`, after the `vault2-status` entry:

```js
	// the 2026-11-03 building-shell fixes (Update 2): hallway roofs and end walls, the widened treatment
	// walkway and its outside wall, the bigger HDR suite, and two overviews (the plan, and the roofs)
	{ name: 'hall-west-end', eye: [-38, 1.7, 0], look: [-52, 2.2, 0], ceilings: true },
	{ name: 'hall-tech-north', eye: [0, 1.7, -50], look: [0, 2.2, -66], ceilings: true },
	{ name: 'hall-clinical-roof', eye: [20, 1.6, 0], look: [34, 3.6, 0], ceilings: true },
	{ name: 'walkway-junction', eye: [48, 1.7, 0], look: [62, 2.6, 0], ceilings: true },
	{ name: 'walkway-north', eye: [60.9, 1.7, -1], look: [60.9, 2.4, -31], ceilings: true },
	{ name: 'walkway-south', eye: [60.9, 1.7, 1], look: [60.9, 2.4, 31], ceilings: true },
	{ name: 'hdr-door', eye: [62.6, 1.7, 21.5], look: [57.5, 1.6, 24.5], ceilings: true },
	{ name: 'hdr-room', eye: [55.5, 2.4, 19.8], look: [50, 1.0, 29], ceilings: true },
	{ name: 'overview-treatment', eye: [56, 75, -0.1], look: [56, 0, 0] },
	{ name: 'overview-roofs', eye: [20, 120, -15.1], look: [20, 0, -15], ceilings: true }
```

- [ ] **Step 4: Build and take the before shots**

```bash
cd apps/web && pnpm build:arcade >/dev/null && for s in hall-west-end hall-tech-north hall-clinical-roof walkway-junction walkway-north walkway-south hdr-door hdr-room overview-treatment overview-roofs hdr-low; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/u2/before $s; done
```

Expected: 11 lines `… -> …/u2/before/<name>.png`, with no error.

Read `hall-clinical-roof.png` and `overview-roofs.png`. The room ceilings now show (ceilings on), and the hallways have no roof.

- [ ] **Step 5: Checks, lint, commit**

Run the scene check (exit 0) and the NPC check (a–m). Then format and lint the two files, and commit:

```bash
cd ../.. && git add apps/web/arcade-src/sim-hub/src/npc-check-hook.ts apps/web/scripts/sim-hub-shots.mjs
git commit -m "test(sim-hub): shots can show the ceilings; building-shell scenery shots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: HDR suite, bigger

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`:
  - the `ROOMS` hdr entry ≈422–438;
  - `cart2` ≈455–458;
  - the curb in `buildExteriorAmbient` ≈949.
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts` (status beacon `hdr` ≈1182)
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts` (`ROOM_GRAPHS.hdr` ≈454–461)
- Modify: `apps/web/arcade-src/sim-hub/src/npc-behavior.ts` (the hdrRunner path ≈716–771)
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

The HDR suite becomes centre (51.5, 24), w 13, d 13: x 45..58, z 17.5..30.5.
- The door stays on the xmax wall, now at x = 58, centred on z 24 (gap z 22.7..25.3).
- It cannot reach further south: the parking-loop car drives at z 32 and turns at x 47..49.75 (npc-behavior.ts ≈540–566).
- Everything in `hdrSuite` (props.ts ≈1451) and the `hdr` furnish case is relative to the room, so it follows.

- [ ] **Step 1: Add the failing placements**

```js
	// B4: the HDR suite is 13 x 13 at (51.5, 24); the cart and the door beacon move with it; the parking
	// curb stops short of its floor
	{ id: 'HDR floor 13 x 13', pick: { size: [12.85, 0.07, 12.85], at: [51.5, 24] } },
	{ id: 'HDR old floor removed', pick: { size: [10.85, 0.07, 11.85], at: [56, 25] }, absent: true },
	{ id: 'HDR cart beside the table', pick: { size: [0.62 * 0.92, 0.05, 0.44 * 0.92], at: [50.8, 22.8], r: 0.2 } },
	{ id: 'parking curb ends at x 44.9', pick: { size: [82.9, 0.08, 0.22], at: [3.45, 20.95] } },
	{ id: 'parking curb under the HDR floor removed', pick: { size: [96, 0.08, 0.22], at: [10, 20.95] }, absent: true }
```

`medCartObject(0.92)`'s top is `box(0.62 * s, 0.05, 0.44 * s)`. Confirm that in props.ts ≈186. If the cart is turned and its world box differs, pick the size that matches the geometry parameters: picks use the parameters, not the world box.

Build, then run `--only placements`. Expected: FAIL.

- [ ] **Step 2: The room**

In the `ROOMS` hdr entry, set:

```ts
		x: 51.5,
		z: 24,
		w: 13,
		d: 13,
```

and

```ts
		cam: [57.3, 1.68, 24],
		look: [51.5, 1.25, 24],
```

`cam` stays 0.7 m inside the door wall, as before.

- [ ] **Step 3: The cart, the beacon, the curb**

`rooms.ts` cart2:

```ts
	cart2.position.set(50.8, 0, 22.8);
```

Keep its rotation. Add the comment `// in the HDR suite, beside the exam table (room centre (51.5, 24))`.

`equipment.ts` beacons: `hdr: [57.6, 3.15, 23.1, 0]`. That keeps it 0.4 m inside the door wall (x 58) and 0.9 m from the door centre, as before.

`rooms.ts` curb:

```ts
	// the drive's north curb stops at x 44.9, short of the HDR suite (x 45..58): its top (0.08) would
	// show through the suite's floor
	const curb = box(82.9, 0.08, 0.22, std(0xadb4af, 0.9, 0.02), 3.45, 0.04, 20.95);
```

The drive and the parking lines lie below the floor top (0.065) and stay.

- [ ] **Step 4: HDR graph and runner**

`ROOM_GRAPHS.hdr`:

```ts
	// door to the console side of the glass partition (x 54.4); the machine at (53.7, 23.3) and the
	// exam table stay clear
	hdr: {
		nodes: [
			[58.85, 24],
			[57.0, 24.6]
		],
		edges: [[0, 1]]
	}
```

Node 0 must equal walk.ts `doorPoint` for hdr (door centre + 0.85 outward). Confirm it in walk.ts.

The hdrRunner path (npc-behavior.ts ≈716–771) is absolute. Rebuild it for the new door:
- **Door transit:** move the points through the old door (x 61.5, z ≈25) by (−3.5, −1), to x 58 and z ≈24.
- **Walkway lanes:** keep x 62.15 (north-bound) and 63.15 (south-bound). Keep their north turn at z ≤ 30.4: Task 3's end wall at z 31 has its face at 30.91. Keep the south turn at z 20.1.
- **Interior loop:** move it from x 59.7..60.7 to x 55.2..56.2 and from z 25..30.1 to z 24..29.1. That is the console side of the glass, clear of the desk (55.7, 22.6) and the south wall face (30.42).
- **Comments:** update them.

Then run the NPC check. Checks a, b and l cover the runner. Adjust only these runner points, the hdr graph and the HDR staff offsets (npc.ts `place('hdr', …)` / `secondary('hdr', …)`) until a–m pass.

- [ ] **Step 5: Checks, shots, lint, commit**

Rebuild, then run:
- the scene check (exit 0);
- the NPC check a–m, with the car's check a passing near the new south wall;
- `pnpm test`;
- `pnpm check`.

If check a fails for the car near the HDR south wall, move the room 0.3 m north (z 23.7, z 17.2..30.2) with every number above. Report it.

Shots: `hdr-room`, `hdr-door`, `hdr-low`. Read them: the room is bigger and its contents sit as before.

Format and lint, then commit:

```bash
cd ../.. && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/arcade-src/sim-hub/src/npc-behavior.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): HDR suite grows to 13 x 13 and lines up with the treatment walkway

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Also add npc.ts if you changed it.

---

### Task 3: The treatment walkway: outside wall, width, floor, lights, walking line

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`:
  - `buildCorridorInfillWalls` ≈1487–1525;
  - `corridorAnchor` ≈1680–1682.
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts`: the walkway floor, the junction plate and the lights, ≈412–418.
- Modify: `apps/web/arcade-src/sim-hub/src/walk.ts`: `TREATMENT_JUNCTION_X` (≈50) and every literal walkway x 64 (≈143–152, 157–158, 166, 168, 190, 204–210, 226–240).
- Modify: `apps/web/arcade-src/sim-hub/src/npc-behavior.ts`: the lane remap ≈1155 and its comment ≈1116–1118.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

**Interfaces:**
- Consumes: the HDR suite at x 45..58, z 17.5..30.5 (Task 2).
- Produces: `TREATMENT_JUNCTION_X = 60.9`, the walkway's middle.

- [ ] **Step 1: Add the failing placements**

```js
	// B2, B3: the treatment walkway's outside wall at x 58 (5.7 m), its end walls at z +-31, the clinical
	// hallway's infill trimmed at x 58, and the walkway floor x 58..64
	{ id: 'walkway outside wall z -31..-4', pick: { size: [0.18, 5.7, 27], at: [58, -17.5] } },
	{ id: 'walkway outside wall z 14..17.5', pick: { size: [0.18, 5.7, 3.5], at: [58, 15.75] } },
	{ id: 'walkway outside wall z 30.5..31', pick: { size: [0.18, 5.7, 0.5], at: [58, 30.75] } },
	{ id: 'walkway north end wall', pick: { size: [6.09, 5.7, 0.18], at: [60.955, -31] } },
	{ id: 'walkway south end wall', pick: { size: [6.09, 5.7, 0.18], at: [60.955, 31] } },
	{ id: 'clinical z +4 stub across the walkway mouth removed', pick: { size: [2, 3.75, 0.18], at: [59, 4] }, absent: true },
	{ id: 'clinical z -4 infill ends at x 58', pick: { size: [6, 3.75, 0.18], at: [55, -4] } },
	{ id: 'walkway floor x 58..64', pick: { size: [6, 0.06, 62], at: [61, 0] } },
	{ id: 'old branch floor x 60..68 removed', pick: { size: [8, 0.06, 62], at: [64, 0] }, absent: true }
```

Build, then run `--only placements`. Expected: FAIL.

- [ ] **Step 2: Walls**

In `buildCorridorInfillWalls`:
- delete `[58, 60]` from the z = 4 list;
- change `[52, 60]` to `[52, 58]` in the z = -4 list;
- after `infillV(-7, 7, 67, 5.7, 0.42);` add:

```ts
	// The treatment walkway's outside wall, on the line of LINAC Control's and the HDR suite's east walls
	// (x 58), 5.7 m like the vault walls opposite, and its two end walls
	infillV(-31, -4, 58, 5.7);
	infillV(14, 17.5, 58, 5.7);
	infillV(30.5, 31, 58, 5.7);
	infillH(57.91, 64, -31, 5.7);
	infillH(57.91, 64, 31, 5.7);
```

- [ ] **Step 3: Floor, plate, lights**

In `main.ts`:

```ts
corridorFloor(61, 0, 6, 62, C.vault); // Treatment walkway, x 58..64
// the junction plate also floors the pocket between the vault entrances (x 64..67, z -4.71..4.71)
scene.add(box(9.5, 0.065, 9.5, std(0x627079, 0.82, 0.04), 64, 0.026, 0));
```

These replace the `corridorFloor(64, 0, 8, 62, C.vault)` and `box(9, …)` lines.

Also end the clinical hallway's floor at the walkway's wall line. Otherwise it overlaps the walkway floor at the same height for x 58..59.25, where the plate does not cover it, and z-fights. Replace `corridorFloor(38, 0, 52, 8, C.clinical); // Main Clinical east corridor` with:

```ts
corridorFloor(35, 0, 46, 8, C.clinical); // Main Clinical east corridor, x 12..58
```

Add this placement in Step 1:

```js
	{ id: 'clinical hallway floor ends at x 58', pick: { size: [46, 0.06, 8], at: [35, 0] } },
```

Lights:
- change `corridorLightsHorizontal(12, 64, 0);` to `corridorLightsHorizontal(12, 57, 0);`;
- change `corridorLightsVertical(-30, 30, 64);` to `corridorLightsVertical(-30, 30, 61, 5.67);`, the walkway's middle, under its 5.7 roof (Task 4).

- [ ] **Step 4: The walking line**

In `walk.ts`:
- set `TREATMENT_JUNCTION_X = 60.9` and add the comment `// the treatment walkway's middle (x 58.09..63.71)`;
- replace every other literal walkway x of 64 in the listed lines with `TREATMENT_JUNCTION_X`: the junction points `new Vector3(64, 1.66, 0)`, the vault route nodes `(64, ±18)`, the treatment projection `(64, clamp z)` and the main-corridor clamp max;
- keep the vault door approach nodes `(62.8, ±18)` and the door points `(63.15, ±18)` unchanged.

The `rooms.ts` `corridorAnchor` for hdr becomes `(TREATMENT_JUNCTION_X, 1.66, room.z)`. Import the constant if rooms.ts already imports from walk.ts. Otherwise use `60.9` with the comment `// walk.ts TREATMENT_JUNCTION_X`, to avoid an import cycle.

In `npc-behavior.ts`:
- the hand-over remap that moves walk.ts's x = 64 nodes onto `NPC_TREATMENT_LANE_X` (63.4) must now match `TREATMENT_JUNCTION_X` (import it from `./walk` if npc-behavior already imports from walk; otherwise compare to 60.9 with the same comment);
- update the comment at ≈1116–1118 to say the player walks the walkway's middle (x 60.9) and NPCs keep the lane at 63.4.

- [ ] **Step 5: Checks**

Rebuild. Then run:
- the scene check (exit 0);
- the NPC check a–m. Check a covers the therapist, linacRunner and vault runner lanes (x ≥ 59.6, clear of the x 58 wall), and l covers the hand-overs through the walkway;
- `pnpm test`, which includes walk/portals specs if any assert route nodes;
- `pnpm check`.

If a check fails, adjust only the NPC routes named in the failure, inside the walkway, and list each change.

- [ ] **Step 6: Shots, lint, commit**

Shots: `walkway-junction`, `walkway-north`, `walkway-south`, `hdr-door`, `overview-treatment`. Read them: the outside wall is up, the walkway is wide, and the end walls close it.

Format and lint, then commit:

```bash
cd ../.. && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/arcade-src/sim-hub/src/walk.ts apps/web/arcade-src/sim-hub/src/npc-behavior.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): treatment walkway gets its outside and end walls, widens to 5.6 m, and the walking line leaves the vault wall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Hallway roofs, gap fills, the last end walls

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`: a new `buildCorridorRoofs()` next to the corridor light helpers, and `buildCorridorInfillWalls`.
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts`: the technical lights start, and a call to `buildCorridorRoofs()` with its import.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

- [ ] **Step 1: Add the failing placements**

```js
	// B1, B2: hallway roofs (3.75, and the walkway's at 5.7), the gap fills up to the walkway roof, and
	// the patient and technical hallways' end walls
	...[
		[-52, -12, -3, 3, 3.75, 'west hallway'],
		[-3, 3, -41.5, -10, 3.75, 'technical hallway south'],
		[-3, 2, -54, -41.5, 3.75, 'technical hallway by dosimetry'],
		[-2, 2, -56.5, -54, 3.75, 'technical hallway by commons and dosimetry'],
		[-2, 3, -66, -56.5, 3.75, 'technical hallway north'],
		[12, 15, -4, 4, 3.75, 'clinical hallway by the lobby'],
		[15, 25, -4, 3.5, 3.75, 'clinical hallway by the manager'],
		[25, 36, -4, 4, 3.75, 'clinical hallway by CT control'],
		[36, 52, -3, 4, 3.75, 'clinical hallway by the CT room'],
		[52, 58, -4, 4, 3.75, 'clinical hallway by LINAC control'],
		[58, 64, -31, 31, 5.7, 'treatment walkway'],
		[64, 67, -5, 5, 5.7, 'pocket between the vault entrances']
	].map(([x0, x1, z0, z1, y, where]) => ({
		id: `roof over the ${where}`,
		pick: { size: [x1 - x0, 0.08, z1 - z0], at: [(x0 + x1) / 2, (z0 + z1) / 2], y, r: 0.05 },
		minY: y - 0.04
	})),
	{ id: 'fill above LINAC control east wall', pick: { size: [0.16, 1.95, 10], at: [58, 9] }, minY: 3.75 },
	{ id: 'fill above the HDR suite east wall', pick: { size: [0.16, 1.95, 13], at: [58, 24] }, minY: 3.75 },
	{ id: 'lintel over the clinical hallway mouth', pick: { size: [0.18, 1.95, 8], at: [58, 0] }, minY: 3.75 },
	{ id: 'west hallway end wall', pick: { size: [0.18, 3.75, 6], at: [-52, 0] } },
	{ id: 'technical hallway end wall', pick: { size: [5, 3.75, 0.18], at: [0.5, -66] } }
```

Build, then run `--only placements`. Expected: FAIL.

- [ ] **Step 2: `buildCorridorRoofs`**

In `rooms.ts`, after `corridorLightsVertical`:

```ts
const ROOF_MAT = std(0xe9edef, 0.95, 0);
// Roofs over the hallways, like the room ceilings: 0.08 slabs at the wall top (3.75; the treatment
// walkway's at 5.7, the vault height), edges on the wall centre lines so they never overlap a room's
// ceiling (which stops 0.1 m inside its walls). They join `ceilings`, so the overview hides them. Then
// the walls above the 3.75 rooms that face the walkway are filled up to its roof.
export function buildCorridorRoofs() {
	const roof = (x0, x1, z0, z1, y) => {
		const r = box(x1 - x0, 0.08, z1 - z0, ROOF_MAT, (x0 + x1) / 2, y, (z0 + z1) / 2);
		r.name = 'hall-roof';
		r.castShadow = false;
		r.receiveShadow = false;
		scene.add(r);
		ceilings.push(r);
	};
	roof(-52, -12, -3, 3, 3.75); // patient-services hallway
	// technical hallway: the commons (x -2) and dosimetry (x 2) walls stand 1 m inside its lines
	roof(-3, 3, -41.5, -10, 3.75);
	roof(-3, 2, -54, -41.5, 3.75);
	roof(-2, 2, -56.5, -54, 3.75);
	roof(-2, 3, -66, -56.5, 3.75);
	// clinical hallway: the manager's (z 3.5) and the CT room's (z -3) walls stand inside its lines
	roof(12, 15, -4, 4, 3.75);
	roof(15, 25, -4, 3.5, 3.75);
	roof(25, 36, -4, 4, 3.75);
	roof(36, 52, -3, 4, 3.75);
	roof(52, 58, -4, 4, 3.75);
	// the treatment walkway and the pocket between the vault entrances, at the vault height
	roof(58, 64, -31, 31, 5.7);
	roof(64, 67, -5, 5, 5.7);
	const fill = (t, len, x, z, alongZ) => {
		const f = box(alongZ ? t : len, 1.95, alongZ ? len : t, INFILL_MAT, x, 4.725, z);
		f.name = 'roof-fill';
		scene.add(f);
	};
	fill(0.16, 10, 58, 9, true); // above LINAC Control's east wall (z 4..14)
	fill(0.16, 13, 58, 24, true); // above the HDR suite's east wall (z 17.5..30.5)
	fill(0.18, 8, 58, 0, true); // over the clinical hallway's mouth (z -4..4)
}
```

`ceilings` must be imported from `./main` in rooms.ts; it already is (rooms.ts line 66). `INFILL_MAT` must be declared before `buildCorridorRoofs` runs. It is a module-level `const` at ≈1475 and is initialised at module load, so any position is fine.

- [ ] **Step 3: The last end walls, the lights, the call**

In `buildCorridorInfillWalls`, after the walkway walls from Task 3:

```ts
	// the patient-services hallway's west end and the technical hallway's north end (x -3..-2 is the
	// commons' wall)
	infillV(-3, 3, -52);
	infillH(-2, 3, -66);
```

In `main.ts`:
- change `corridorLightsVertical(-66, -10, 0);` to `corridorLightsVertical(-64, -10, 0);`, so the north strip stays clear of the end wall;
- add `buildCorridorRoofs();` right after the light calls, and add `buildCorridorRoofs` to the `./rooms` import list.

- [ ] **Step 4: Checks, including the visibility check**

Rebuild, then run:
- the scene check (exit 0);
- the NPC check a–m. Roofs and fills are above 2 m and not furniture;
- `pnpm test`;
- `pnpm check`;
- `node scripts/sim-hub-visibility-check.mjs; echo "exit $?"`. Expected: 0 failures. The old "linaccontrol walk h0" failure should clear, because the clinical roof's edge at z -3 covers the CT room's ceiling slab. If any pose fails, report it with its lines.

Then confirm the overview still hides the roofs. `overview-treatment` (no ceilings flag) must show no roof slabs.

- [ ] **Step 5: Shots, lint, commit**

Shots: all ten Update 2 shots into `u2/after`. Read them:
- the hallways have roofs;
- the west and technical ends are walled;
- the walkway roof meets the vault walls with no sky showing over LINAC Control's or the HDR suite's walkway wall.

Format and lint, then commit:

```bash
cd ../.. && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): roofs over every hallway, walls at the open hallway ends

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 (controller): final checks, as-built notes, page, PR

- [ ] Run every check above, plus `node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html` and `pnpm exec prettier --check .`.
- [ ] Fill the spec's as-built notes for Update 2.
- [ ] Final whole-branch review, then fixes.
- [ ] The owner's before/after page from `u2/before` and `u2/after`, then the PR.
