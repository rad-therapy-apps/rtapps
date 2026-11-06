// sim-hub scenery check (dev only, not run in CI).
//
// Imports the built sim-hub bundle under stubbed browser globals (scripts/lib/browser-stubs.mjs) with
// `?npccheck`, which makes the page expose `window.__NPC` (src/npc-check-hook.ts), and measures the
// scenery as the page builds it: each mesh by its world box (its geometry's box through its world
// matrix), the walls by their colliders (walk.ts) and by the lintel boxes over doors and windows
// (rooms.ts buildSide names them 'wall-lintel'; they are not colliders).
//
//   signs       no panel drawn from a canvas (a sign, plaque, label or screen face) reaches more than
//               0.01 m into a wall collider (in x/z) or a lintel (in x, y and z)
//   legs        every chair() and couch() seat (props.ts: meshes named 'chair-seat' / 'couch-seat')
//               stands on four legs ('chair-leg' / 'couch-leg') centred under it, from the floor
//               (bottom at most 0.005 m up) to the seat's underside (within 0.005 m); 20 chairs and
//               3 couches
//   placements  every PLACEMENTS entry below holds
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-scene-check.mjs [--only signs,legs,placements] [--dump <file.json>]
//     --dump also writes every mesh's world box, geometry size, colour and room, and the wall
//     colliders, to <file.json>, to look things up while placing them.
// Exit codes: 0 every selected rule passes; 1 any fails; 2 setup error.
// Output: `SCENE CHECK <rule> PASS|FAIL: <summary>` per rule, then at most 40 detail lines per failing rule.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installBrowserStubs } from './lib/browser-stubs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argVal = (flag) => {
	const i = argv.indexOf(flag);
	return i >= 0 ? argv[i + 1] : null;
};
const RULES = ['signs', 'legs', 'placements'];
const only = new Set((argVal('--only') || RULES.join(',')).split(',').map((x) => x.trim()));
for (const x of only)
	if (!RULES.includes(x)) setupError(`unknown rule '${x}' in --only (use ${RULES.join(',')})`);
const dumpPath = argVal('--dump');
const MAX_DETAIL = 40;
const SIGN_DEPTH = 0.01;
const LEG_TOL = 0.005;
const FLUSH_GAP = 0.06;
const CHAIRS = 20,
	COUCHES = 3;

// Where the scenery fixes put things (docs/specs/2026-10-31-sim-hub-scenery-design.md). `pick` finds
// exactly one mesh: geometry type `geom` (default BoxGeometry) whose geometry parameters match `size`
// within 0.005 (box [width, height, depth], plane [width, height], torus [radius, tube], cylinder
// [radiusTop, radiusBottom, height]), whose world box centre is within `r` (default 0.5) of `at`
// [x, z], if `y` is given within 0.1 of it in height, and if `name` is given whose mesh name is
// exactly that ('' for an unnamed mesh). An eRbox (RoundedBoxGeometry) reports a BoxGeometry of
// size [1, 1, 1]. Then each given test:
//   absent  no such mesh exists (a removed prop)
//   minY    the box bottom is at this height, within 0.01 (a desk screen: the 0.88 desk top + 0.28 stand)
//   maxY    the box top is at most this height
//   within  the box centre is inside [x0, x1, z0, z1] (a desk top)
//   flush   { axis: 'x' | 'z', face, side: 'min' | 'max' }: the box's `side` along `axis` (the side
//           toward the wall) is 0 to 0.06 m off the wall's inner face `face`, not past it
const PLACEMENTS = [
	// R11: a turned cabinet shows its drawer lines on the face it turns to (engineering's east
	// cabinet faces -x; its front is 0.2058 m from its centre)
	{
		id: 'engineering east cabinet drawer line on its front',
		pick: { size: [1.26, 0.02, 0.015], at: [11.744, -33], y: 0.31, r: 0.05 }
	},
	// S and V1: the hallway blades (their front faces; the back face is 'sign-back') stop 0.05 m short
	// of the corridor face of the room wall they stand off; the vault warning plaques hang side by
	// side above each vault door on the corridor face (x 63.71), over the door's header sign, which
	// also moves out of the lintel
	{
		id: 'CT SIMULATION blade stops at the corridor face',
		pick: { geom: 'PlaneGeometry', size: [3.4, 0.76], at: [27.8, -2.17], name: '' },
		flush: { axis: 'z', face: -3.92, side: 'min' }
	},
	{
		id: 'TREATMENT AREA blade stops at the corridor face',
		pick: { geom: 'PlaneGeometry', size: [3.7, 0.76], at: [46.5, 2.02], name: '' },
		flush: { axis: 'z', face: 3.92, side: 'max' }
	},
	...[-18, 18].flatMap((vz) => [
		...[-1.55, 0, 1.55].map((dz) => ({
			id: `vault plaque above the door at z ${vz + dz}`,
			pick: { geom: 'PlaneGeometry', size: [1.35, 0.82], at: [63.66, vz + dz], r: 0.1 },
			minY: 4.44,
			flush: { axis: 'x', face: 63.71, side: 'max' }
		})),
		{
			id: `vault header sign on the corridor face at z ${vz}`,
			pick: { geom: 'PlaneGeometry', size: [4.7, 0.76], at: [63.66, vz], r: 0.1 },
			flush: { axis: 'x', face: 63.71, side: 'max' }
		}
	]),
	{
		id: 'vault 1 NO ENTRY plaque inside the maze removed',
		pick: { geom: 'PlaneGeometry', size: [1.35, 0.82], at: [64.32, -15.05], r: 0.1 },
		absent: true
	},
	{
		id: 'vault 2 NO ENTRY plaque inside the maze removed',
		pick: { geom: 'PlaneGeometry', size: [1.35, 0.82], at: [64.32, 20.95], r: 0.1 },
		absent: true
	},
	{
		id: 'hidden door-side name signs removed (consult)',
		pick: { geom: 'PlaneGeometry', size: [2.15, 0.65], at: [-15.45, -2.965] },
		absent: true
	},
	{
		id: 'lobby entrance sign on the entrance wall face',
		pick: { geom: 'PlaneGeometry', size: [5.4, 1.05], at: [0, 10.095], r: 0.1 },
		flush: { axis: 'z', face: 10.09, side: 'min' }
	},
	// R1-R3, R5, R6: desk computer screens stand on their desks; wall screens hang flush on
	// their walls
	{
		id: 'education desk screen',
		pick: { size: [0.8, 0.48, 0.055], at: [-42, -5.95] },
		minY: 1.16,
		within: [-43.9, -40.1, -6.75, -5.65]
	},
	{
		id: 'education wall screen removed',
		pick: { size: [1.8, 0.95, 0.055], at: [-38.89, -3.11] },
		absent: true
	},
	{
		id: 'physics atom disc removed',
		pick: { geom: 'CylinderGeometry', size: [1, 1, 0.06], at: [9.2, -17.5] },
		absent: true
	},
	{
		id: 'engineering overview screen on the +z wall',
		pick: { size: [3.03, 1.84, 0.1], at: [5.6, -26.16] },
		flush: { axis: 'z', face: -26.08, side: 'max' }
	},
	{
		id: 'engineering shielding screen on the +z wall',
		pick: { size: [3.03, 1.84, 0.1], at: [10.4, -26.16] },
		flush: { axis: 'z', face: -26.08, side: 'max' }
	},
	{
		id: 'dosimetry desk screen',
		pick: { size: [1.2, 0.65, 0.055], at: [9, -47.4] },
		minY: 1.16,
		within: [6.8, 11.2, -48.1, -47.1]
	},
	{
		id: 'dosimetry wall screen removed',
		pick: { size: [2.5, 1.3, 0.055], at: [9, -41.6] },
		absent: true
	},
	{
		id: 'commons screen on the wall the chairs face',
		pick: { size: [1.8, 1.0, 0.055], at: [-8, -54.11] },
		flush: { axis: 'z', face: -54.08, side: 'max' }
	},
	// R4: the water phantom is a real-size tank (0.65 m) on its cart (deck top 0.80)
	{
		id: 'QA water phantom tank on its cart',
		pick: { size: [0.65, 0.55, 0.65], at: [-7.5, -43.3] },
		minY: 0.8
	},
	{
		id: 'QA room-sized tank removed',
		pick: { size: [3.1, 1.55, 2.8], at: [-7.5, -43.3] },
		absent: true
	},
	// R7: the manager's desk stands 0.3 m in front of the visitor chairs; its screen faces the manager
	{
		id: 'manager desk by the visitor chairs',
		pick: { size: [2.5, 0.08, 0.85], at: [20, 8.5] },
		within: [19.99, 20.01, 8.49, 8.51]
	},
	{
		id: 'manager screen on the desk',
		pick: { size: [1.0, 0.55, 0.055], at: [20, 8.75] },
		minY: 1.16,
		within: [18.75, 21.25, 8.075, 8.925]
	},
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
	{
		id: 'CT control cabinet on the door wall',
		pick: { size: [1.6, 1.5, 0.45], at: [34.7, -4.31] },
		flush: { axis: 'z', face: -4.08, side: 'max' }
	},
	{
		id: 'CT CONTROL board on the back wall',
		pick: { size: [2.73, 1.56, 0.1], at: [31.5, -13.82] },
		flush: { axis: 'z', face: -13.92, side: 'min' },
		maxY: 2.75
	},
	{
		id: 'CT control blank wall screen removed',
		pick: { size: [1.9, 1.05, 0.055], at: [31.5, -13.15] },
		absent: true
	},
	{
		id: 'CT control blank monitor wall removed',
		pick: { size: [0.95, 0.54, 0.055], at: [29.95, -9], r: 0.6 },
		absent: true
	},
	...[
		[-9.6, 2.15, 'CT SIM STATUS'],
		[-8.4, 2.15, 'PATIENT VIEW'],
		[-9.6, 1.38, 'GANTRY VIEW'],
		[-8.4, 1.38, 'ROOM WIDE']
	].map(([z, y, label]) => ({
		id: `CT control ${label} screen in front of the board`,
		pick: { size: [1.14, 0.7, 0.08], at: [30.15, z], y, r: 0.1 }
	})),
	// the CT control intercom speaker is on the window wall beside the window (z -11.25..-6.75), not over it
	{
		id: 'CT control speaker beside the window',
		pick: { size: [0.34, 0.34, 0.08], at: [35.87, -12.3], y: 2.65, r: 0.1 },
		flush: { axis: 'x', face: 35.92, side: 'max' }
	},
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
	{
		id: 'CT sagittal laser on the ceiling',
		pick: { size: [0.12, 0.12, 0.12], at: [44, -9.5], y: 3.65, r: 0.1 },
		minY: 3.59,
		maxY: 3.71
	},
	{
		id: 'CT SIMULATION board below the CT room sign',
		pick: { size: [3.03, 1.63, 0.1], at: [44, -18.82] },
		maxY: 2.75
	},
	{
		id: 'CT room-sized gantry ring removed',
		pick: { geom: 'TorusGeometry', size: [2.15, 0.58], at: [44, -9.5] },
		absent: true
	},
	// R10: LINAC control: the console against the west wall (inner face x 44.08), its screens in
	// three columns facing east; keyboards and mice on the desk; the cabinet under the Treatment
	// Control screen; the clock on the east wall; the blank duplicates gone
	{
		id: 'LINAC console desk against the west wall',
		pick: { size: [6.0, 0.08, 1.25], at: [44.71, 9] },
		flush: { axis: 'x', face: 44.08, side: 'min' }
	},
	{
		id: 'LINAC backing board on the west wall',
		pick: { size: [0.08, 2.5, 5.4], at: [44.12, 9] },
		flush: { axis: 'x', face: 44.08, side: 'min' }
	},
	...[
		[1.42, 0.86, 10.37, 2.43, 'Vault Wide (left, top)'],
		[1.42, 0.86, 10.37, 1.48, 'Patient View (left, bottom)'],
		[1.16, 0.72, 9, 2.23, 'Cam A (middle, top)'],
		[1.16, 0.72, 9, 1.42, 'Overhead (middle, bottom)'],
		[1.16, 0.72, 7.76, 2.23, 'Cam B (right, top)'],
		[1.16, 0.72, 7.76, 1.42, 'Vault Status (right, bottom)']
	].map(([w, h, z, y, label]) => ({
		id: `LINAC ${label}`,
		pick: { size: [w, h, 0.08], at: [44.45, z], y, r: 0.1 }
	})),
	...[7.85, 10.15].flatMap((z) => [
		{
			id: `LINAC keyboard at z ${z} on the desk`,
			pick: { size: [0.72, 0.035, 0.24], at: [45.0, z] },
			minY: 0.88,
			within: [44.085, 45.335, 6, 12]
		},
		{
			id: `LINAC mouse by the keyboard at z ${z} on the desk`,
			pick: { size: [1, 1, 1], at: [45.0, z - 0.48], y: 0.9, r: 0.05 },
			minY: 0.88,
			within: [44.085, 45.335, 6, 12]
		}
	]),
	{
		id: 'LINAC cabinet under the Treatment Control screen',
		pick: { size: [1.7, 1.3, 0.45], at: [57.69, 9] },
		flush: { axis: 'x', face: 57.92, side: 'max' },
		maxY: 1.38
	},
	{
		id: 'LINAC clock on the east wall',
		pick: { geom: 'CylinderGeometry', size: [0.37, 0.37, 0.025], at: [57.88, 5.4] },
		flush: { axis: 'x', face: 57.92, side: 'max' }
	},
	{
		id: 'LINAC blank screens removed',
		pick: { size: [1.7, 0.95, 0.055], at: [55.45, 9], r: 2.1 },
		absent: true
	},
	{
		id: 'LINAC blank monitor wall removed',
		pick: { size: [0.92, 0.52, 0.055], at: [49.45, 9], r: 0.6 },
		absent: true
	},
	// V2-V4: vault sinks flush on their walls (vault 2's on the opposite, +z wall); the wall art off
	// the setup checklist; one live status board per vault, mirrored on the wall nearest the junction
	{
		id: 'vault 1 sink splash flush on the -z wall',
		pick: { size: [1.52, 0.78, 0.07], at: [66.2, -30.67] },
		flush: { axis: 'z', face: -30.71, side: 'min' }
	},
	{
		id: 'vault 2 sink splash flush on the +z wall',
		pick: { size: [1.52, 0.78, 0.07], at: [66.2, 30.67] },
		flush: { axis: 'z', face: 30.71, side: 'max' }
	},
	{
		id: 'vault 1 wall art off the checklist',
		pick: { size: [1.29, 0.61, 0.05], at: [93.65, -26.6] }
	},
	{
		id: 'vault 2 wall art off the checklist',
		pick: { size: [1.29, 0.61, 0.05], at: [93.65, 9.4] }
	},
	{
		id: 'vault 1 live status board on its +z wall',
		pick: { size: [3.68, 2.15, 0.1], at: [78.45, -5.39] },
		flush: { axis: 'z', face: -5.29, side: 'max' }
	},
	{
		id: 'vault 2 live status board on its -z wall',
		pick: { size: [3.68, 2.15, 0.1], at: [78.45, 5.39] },
		flush: { axis: 'z', face: 5.29, side: 'min' }
	},
	{
		id: 'vault 1 floating status board removed',
		pick: { size: [2.88, 1.68, 0.1], at: [90.78, -8.2] },
		absent: true
	},
	{
		id: 'vault 1 static status screen removed',
		pick: { size: [4.73, 2.13, 0.1], at: [78.45, -30.65] },
		absent: true
	},
	{
		id: 'vault 2 static status screen removed',
		pick: { size: [4.73, 2.13, 0.1], at: [78.45, 5.35] },
		absent: true
	},
	// B4: the HDR suite is 13 x 13 at (51.5, 24); the cart and the door beacon move with it; the parking
	// curb stops short of its floor
	{ id: 'HDR floor 13 x 13', pick: { size: [12.85, 0.07, 12.85], at: [51.5, 24] } },
	{
		id: 'HDR old floor removed',
		pick: { size: [10.85, 0.07, 11.85], at: [56, 25] },
		absent: true
	},
	{
		id: 'HDR cart beside the table',
		pick: { size: [0.62 * 0.92, 0.05, 0.44 * 0.92], at: [50.8, 22.8], r: 0.2 }
	},
	{ id: 'parking curb ends at x 44.9', pick: { size: [82.9, 0.08, 0.22], at: [3.45, 20.95] } },
	{
		id: 'parking curb under the HDR floor removed',
		pick: { size: [96, 0.08, 0.22], at: [10, 20.95] },
		absent: true
	},
	// B3: the walkway floor x 58..64 (brought forward from the walls task so the HDR runner has a floor
	// at its door)
	{ id: 'walkway floor x 58..64', pick: { size: [6, 0.06, 62], at: [61, 0] } },
	{
		id: 'old branch floor x 60..68 removed',
		pick: { size: [8, 0.06, 62], at: [64, 0] },
		absent: true
	},
	{ id: 'clinical hallway floor ends at x 58', pick: { size: [46, 0.06, 8], at: [35, 0] } },
	// B2, B3: the treatment walkway's outside wall at x 58 (5.7 m), its end walls at z +-31, and the clinical
	// hallway's infill trimmed at x 58
	{ id: 'walkway outside wall z -31..-4', pick: { size: [0.18, 5.7, 27], at: [58, -17.5] } },
	{ id: 'walkway outside wall z 14..17.5', pick: { size: [0.18, 5.7, 3.5], at: [58, 15.75] } },
	{ id: 'walkway outside wall z 30.5..31', pick: { size: [0.18, 5.7, 0.5], at: [58, 30.75] } },
	{ id: 'walkway north end wall', pick: { size: [6.09, 5.7, 0.18], at: [60.955, -31] } },
	{ id: 'walkway south end wall', pick: { size: [6.09, 5.7, 0.18], at: [60.955, 31] } },
	{
		id: 'clinical z +4 stub across the walkway mouth removed',
		pick: { size: [2, 3.75, 0.18], at: [59, 4] },
		absent: true
	},
	{
		id: 'clinical z -4 infill meets the walkway wall at x 58.09',
		pick: { size: [6.09, 3.75, 0.18], at: [55.045, -4] }
	},
	// B1, B2: hallway roofs (3.75, and the walkway's at 5.7), the gap fills up to the walkway roof, and
	// the patient and technical hallways' end walls
	...[
		[-52, -12, -3, 3, 3.75, 'west hallway'],
		[-3, 3, -41.5, -10, 3.75, 'technical hallway south'],
		[-3, 2, -54, -41.5, 3.75, 'technical hallway by dosimetry'],
		[-2, 2, -66, -54, 3.75, 'technical hallway north'],
		[12, 15, -4, 4, 3.75, 'clinical hallway by the lobby'],
		[15, 25, -4, 3.5, 3.75, 'clinical hallway by the manager'],
		[25, 36, -4, 4, 3.75, 'clinical hallway by CT control'],
		[36, 52, -3, 4, 3.75, 'clinical hallway by the CT room'],
		[52, 58, -4, 4, 3.75, 'clinical hallway by LINAC control'],
		[58, 64, -31, 31, 5.7, 'treatment walkway'],
		[64, 67, -5, 5, 5.7, 'pocket between the vault entrances']
	].map(([x0, x1, z0, z1, y, where]) => ({
		id: `roof over the ${where}`,
		pick: {
			size: [x1 - x0, 0.08, z1 - z0],
			at: [(x0 + x1) / 2, (z0 + z1) / 2],
			y,
			r: 0.05,
			name: 'hall-roof'
		},
		minY: y - 0.04
	})),
	{
		id: 'fill above LINAC control east wall',
		pick: { size: [0.16, 1.95, 10], at: [58, 9] },
		minY: 3.75
	},
	{
		id: 'fill above the HDR suite east wall',
		pick: { size: [0.16, 1.95, 13], at: [58, 24] },
		minY: 3.75
	},
	{
		id: 'lintel over the clinical hallway mouth',
		pick: { size: [0.18, 1.95, 8], at: [58, 0] },
		minY: 3.75
	},
	{ id: 'west hallway end wall', pick: { size: [0.18, 3.75, 6], at: [-52, 0] } },
	{ id: 'technical hallway end wall', pick: { size: [4, 3.75, 0.18], at: [0, -66] } },
	// the lobby's hallway openings end at the hallway walls' inner faces (z ±2.91 west, x ±2.91
	// north, z ±3.91 east), so no slot beside a hallway wall shows the outside
	...[
		[0.18, 7.09, -12, 6.455, 'west'],
		[0.18, 7.09, -12, -6.455, 'west'],
		[0.18, 6.09, 12, 6.955, 'east'],
		[0.18, 6.09, 12, -6.955, 'east'],
		[9.09, 0.18, 7.455, -10, 'north'],
		[9.09, 0.18, -7.455, -10, 'north']
	].map(([w, d, x, z, side]) => ({
		id: `lobby ${side} wall meets its hallway wall at ${x}, ${z}`,
		pick: { size: [w, 4.15, d], at: [x, z], r: 0.05 }
	})),
	// P1-9: the welcome kiosk stands just inside the main entrance, east of the walk-in line. Its screen
	// is on the doors' side (+z) of its stand, so it reads the right way round as you walk in.
	{
		id: 'welcome kiosk screen faces the entrance',
		pick: { geom: 'PlaneGeometry', size: [1.16, 0.68], at: [2.6, 6.355], r: 0.02 }
	},
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
	})),
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
	})),
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
	},
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
];

function setupError(msg) {
	console.error(`SCENE CHECK setup error: ${msg}`);
	process.exit(2);
}

// seeded, so the page builds the same scene on every run
let seed = 1;
Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
// The stub GL reports no optional extensions, so three.js warns once per missing one. Drop exactly
// that warning; every other warning still prints.
const warn = console.warn;
console.warn = (...a) => {
	if (a.length === 1 && /^THREE\.WebGLRenderer: \w+ extension not supported\.$/.test(String(a[0])))
		return;
	warn(...a);
};
installBrowserStubs({ search: '?npccheck' });

const assetsDir = path.resolve(HERE, '../arcade/sim-hub/assets');
let bundle;
try {
	bundle = fs.readdirSync(assetsDir).find((f) => /^index-.*\.js$/.test(f));
} catch {
	/* handled below */
}
if (!bundle) setupError(`no built bundle in ${assetsDir} (run pnpm build:arcade)`);
try {
	await import(pathToFileURL(path.join(assetsDir, bundle)).href);
} catch (err) {
	setupError(`bundle threw during evaluation: ${err && err.stack ? err.stack : err}`);
}
const NPC = globalThis.window && globalThis.window.__NPC;
if (!NPC) setupError('window.__NPC missing (hook not installed with ?npccheck)');
NPC.disableRendering();
const walls = NPC.colliders;
if (!walls || !walls.length) setupError('no wall colliders');

NPC.scene.updateMatrixWorld(true);
const meshes = [];
NPC.scene.traverse((o) => {
	if (!o.isMesh || !o.geometry) return;
	const g = o.geometry;
	if (!g.boundingBox) g.computeBoundingBox();
	const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
	let room = '';
	for (let p = o.parent; p && p !== NPC.scene; p = p.parent)
		if (p.name && p.name.startsWith('room-content:')) room = p.name.slice(13);
	const mat = Array.isArray(o.material) ? o.material[0] : o.material;
	meshes.push({
		name: o.name || '',
		geom: g.type,
		params: g.parameters || {},
		mat,
		canvas: !!(mat && mat.map && mat.map.isCanvasTexture),
		min: [b.min.x, b.min.y, b.min.z],
		max: [b.max.x, b.max.y, b.max.z],
		cx: (b.min.x + b.max.x) / 2,
		cy: (b.min.y + b.max.y) / 2,
		cz: (b.min.z + b.max.z) / 2,
		room
	});
});
if (!meshes.length) setupError('no meshes in the scene');

const results = [];
function report(rule, fails, summary) {
	results.push(!fails.length);
	console.log(`SCENE CHECK ${rule} ${fails.length ? 'FAIL' : 'PASS'}: ${summary}`);
	for (const f of fails.slice(0, MAX_DETAIL)) console.log(`  ${f}`);
	if (fails.length > MAX_DETAIL) console.log(`  ... and ${fails.length - MAX_DETAIL} more`);
}
const f2 = (v) => v.toFixed(2);
const where = (m) =>
	`${m.geom} ${m.name || m.room || '(scene)'} x ${f2(m.min[0])}..${f2(m.max[0])} y ${f2(m.min[1])}..${f2(m.max[1])} z ${f2(m.min[2])}..${f2(m.max[2])}`;

// How far [a, b] reaches into [c0, c1]: their overlap, or for a flat extent (a panel seen edge-on)
// its distance to the nearer end of [c0, c1]; 0 when outside.
function reach(a, b, c0, c1) {
	if (b - a < 1e-6) return a > c0 && a < c1 ? Math.min(a - c0, c1 - a) : 0;
	return Math.max(0, Math.min(b, c1) - Math.max(a, c0));
}

if (only.has('signs')) {
	const fails = [],
		lintels = meshes.filter((m) => m.name === 'wall-lintel');
	let n = 0;
	for (const m of meshes) {
		// panels are planes; the walls' own boxes carry a canvas texture too
		if (!m.canvas || m.geom !== 'PlaneGeometry') continue;
		n++;
		for (const c of walls) {
			const d = Math.min(
				reach(m.min[0], m.max[0], c.x - c.hw, c.x + c.hw),
				reach(m.min[2], m.max[2], c.z - c.hd, c.z + c.hd)
			);
			if (d > SIGN_DEPTH)
				fails.push(
					`${where(m)} is ${f2(d)} m into the wall at x ${f2(c.x - c.hw)}..${f2(c.x + c.hw)} z ${f2(c.z - c.hd)}..${f2(c.z + c.hd)}`
				);
		}
		for (const l of lintels) {
			const d = Math.min(
				reach(m.min[0], m.max[0], l.min[0], l.max[0]),
				reach(m.min[1], m.max[1], l.min[1], l.max[1]),
				reach(m.min[2], m.max[2], l.min[2], l.max[2])
			);
			if (d > SIGN_DEPTH) fails.push(`${where(m)} is ${f2(d)} m into the lintel ${where(l)}`);
		}
	}
	report(
		'signs',
		fails,
		`${n} canvas panels against ${walls.length} wall colliders and ${lintels.length} lintels, ${fails.length} into a wall by more than ${SIGN_DEPTH} m`
	);
}

if (only.has('legs')) {
	const fails = [],
		count = { chair: 0, couch: 0 };
	for (const kind of ['chair', 'couch']) {
		const legs = meshes.filter((m) => m.name === `${kind}-leg`);
		for (const s of meshes.filter((m) => m.name === `${kind}-seat`)) {
			count[kind]++;
			const under = legs.filter(
				(l) =>
					l.cx > s.min[0] &&
					l.cx < s.max[0] &&
					l.cz > s.min[2] &&
					l.cz < s.max[2] &&
					l.min[1] <= LEG_TOL &&
					Math.abs(l.max[1] - s.min[1]) <= LEG_TOL
			);
			if (under.length !== 4) fails.push(`${where(s)} stands on ${under.length} legs`);
		}
	}
	if (count.chair !== CHAIRS) fails.push(`found ${count.chair} chair seats (expected ${CHAIRS})`);
	if (count.couch !== COUCHES) fails.push(`found ${count.couch} couch seats (expected ${COUCHES})`);
	report(
		'legs',
		fails,
		`${count.chair} chairs and ${count.couch} couches, ${fails.length} problems`
	);
}

if (only.has('placements')) {
	const fails = [],
		sizeKeys = {
			BoxGeometry: ['width', 'height', 'depth'],
			PlaneGeometry: ['width', 'height'],
			TorusGeometry: ['radius', 'tube'],
			CylinderGeometry: ['radiusTop', 'radiusBottom', 'height']
		};
	for (const e of PLACEMENTS) {
		const geom = e.pick.geom || 'BoxGeometry',
			keys = sizeKeys[geom],
			r = e.pick.r ?? 0.5;
		if (!keys) setupError(`${e.id}: no size keys for ${geom}`);
		const found = meshes.filter(
			(m) =>
				m.geom === geom &&
				keys.every((k, i) => Math.abs(m.params[k] - e.pick.size[i]) <= 0.005) &&
				Math.hypot(m.cx - e.pick.at[0], m.cz - e.pick.at[1]) <= r &&
				(e.pick.y === undefined || Math.abs(m.cy - e.pick.y) <= 0.1) &&
				(e.pick.name === undefined || m.name === e.pick.name)
		);
		if (e.absent) {
			if (found.length) fails.push(`${e.id}: still there (${where(found[0])})`);
			continue;
		}
		if (found.length !== 1) {
			fails.push(`${e.id}: picked ${found.length} meshes (expected 1)`);
			continue;
		}
		const m = found[0];
		if (e.minY !== undefined && Math.abs(m.min[1] - e.minY) > 0.01)
			fails.push(`${e.id}: bottom at y ${m.min[1].toFixed(3)} (expected ${e.minY}): ${where(m)}`);
		if (e.maxY !== undefined && m.max[1] > e.maxY + 0.001)
			fails.push(
				`${e.id}: top at y ${m.max[1].toFixed(3)} (expected at most ${e.maxY}): ${where(m)}`
			);
		if (e.within) {
			const [x0, x1, z0, z1] = e.within;
			if (m.cx < x0 || m.cx > x1 || m.cz < z0 || m.cz > z1)
				fails.push(
					`${e.id}: centre (${f2(m.cx)}, ${f2(m.cz)}) outside x ${x0}..${x1} z ${z0}..${z1}`
				);
		}
		if (e.flush) {
			const { axis, face, side } = e.flush,
				k = axis === 'x' ? 0 : 2,
				gap = side === 'max' ? face - m.max[k] : m.min[k] - face;
			if (gap < -0.001 || gap > FLUSH_GAP)
				fails.push(
					`${e.id}: ${gap < 0 ? `${(-gap).toFixed(3)} m into` : `${gap.toFixed(3)} m off`} the wall face ${axis} = ${face}: ${where(m)}`
				);
		}
	}
	report('placements', fails, `${PLACEMENTS.length} placements, ${fails.length} problems`);
}

if (dumpPath) {
	const r3 = (v) => +v.toFixed(3);
	fs.writeFileSync(
		dumpPath,
		JSON.stringify({
			walls,
			meshes: meshes.map((m) => ({
				name: m.name,
				geom: m.geom,
				params: Object.fromEntries(
					Object.entries(m.params).filter(([, v]) => typeof v === 'number')
				),
				color: m.mat && m.mat.color ? m.mat.color.getHexString() : null,
				canvas: m.canvas,
				room: m.room,
				min: m.min.map(r3),
				max: m.max.map(r3)
			}))
		})
	);
	console.log(`SCENE CHECK dump: ${meshes.length} meshes, ${walls.length} walls -> ${dumpPath}`);
}
process.exit(results.every(Boolean) ? 0 : 1);
