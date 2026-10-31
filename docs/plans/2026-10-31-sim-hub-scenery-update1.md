# sim-hub scenery fixes, Update 1 (rooms, signs, chairs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every floating or misplaced prop the owner listed where it belongs, pull signs out of walls, give chairs legs, and keep the NPCs walking clear of the moved furniture.

**Architecture:**
- A new dev script, `apps/web/scripts/sim-hub-scene-check.mjs`, loads the built sim hub in Node exactly as the NPC check does. It measures every mesh's world box.
- The script holds three rules:
  - **signs:** canvas panels must stay out of walls.
  - **legs:** each chair seat has four legs.
  - **placements:** a list of where each moved prop must end up.
- Each task first adds its own `PLACEMENTS` entries, which fail. It then moves the props in the sim-hub source until they pass. Then it re-runs the NPC check and adjusts the NPC route data in the rooms it touched.

**Tech Stack:** three.js 0.160.0 (pinned), TypeScript, Vite (`pnpm build:arcade`), Node scripts under `apps/web/scripts/`, vitest.

**Spec:** `docs/specs/2026-10-31-sim-hub-scenery-design.md` (Update 1 sections R1–R11, V, S, C).

## Global Constraints

### Repo and process rules
- **Branch:** `fix/sim-hub-scenery-rooms`. Commit after each task. Never `git add` anything under `.superpowers/` or `e2e/.auth/`. Never force-push.
- **Scratch files:** only under `/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/`.
- **Deleting files:** never delete a file you did not create. No glob deletes. Never read or open any file whose name starts with `.env`.
- **Permissions:** if a permission is denied, stop and report it. Do not work around it.
- **Dependencies:** none new. three.js stays at 0.160.0.

### Checks that stay green
- **NPC check:** `node scripts/sim-hub-npc-check.mjs` checks a–m stay green, with the count floors unchanged: REST_FLOOR 40, HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15.
  - If a move breaks a check, change only the NPC data of the room you moved things in: `ARRIVAL_SPOTS` and `ROOM_GRAPHS` in `room-routes.ts`, staff offsets in `npc.ts`, and journey finals in `journey.ts`.
  - Never loosen the check, its thresholds or its floors.
- **Unit tests:** `pnpm test` (vitest) stays green.

### Measurement rules
- **Seat tops never change:** chair 0.54, couch 0.59, bench 0.6, task chair 0.65.
- **Flush on a wall:** the object's back is 0.00–0.06 m from the wall's inner face and not past it. Wall inner face = wall centre line ∓ half thickness: 0.08 for 0.16 m room walls, 0.29 for 0.58 m vault walls.
- **On a desk:** a `monitor()` screen sits at y = 0.88 + 0.28 + h/2, so its box bottom is 1.16. The `desk()` top is y 0.80..0.88.
- **Room boxes:** objects stay inside their room's box.
- **Coordinates:** world x/z. Room centres are in `apps/web/arcade-src/sim-hub/src/rooms.ts` `ROOMS`.

### Code style
- Match the surrounding code's comment density, naming and idioms: tabs, single quotes, the legacy `// eslint-disable-next-line no-case-declarations -- …` comment before a `const` in a `switch` case.
- Update every code comment that names a moved object's old position.
- When your change leaves something unused, remove it: an import, a function, a constant.

### Commands (run from `apps/web` unless stated)
- **Build:** `pnpm build:arcade`. Every script below reads the build, so rebuild after every source change.
- **Scene check:** `node scripts/sim-hub-scene-check.mjs`. Exit 0 means every rule passes. Add `--only placements` to run one rule.
- **NPC check:** `node scripts/sim-hub-npc-check.mjs`, about 25 s; exit 0 means pass.
- **Unit tests:** `pnpm test`.
- **Typecheck:** `pnpm check`.
- **Format and lint the files you touched:** `pnpm exec prettier --write <files> && pnpm exec eslint <files>`. CI's lint runs `prettier --check` and `eslint`. Do not run the package-wide `pnpm lint`; a stray `apps/web/.superpowers` folder breaks it locally.
- **Screenshots:** `node scripts/sim-hub-shots.mjs <outDir> <shotName>`, which writes `<outDir>/<shotName>.png`. Use the outDir `/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after`. Read the PNG to look at it.

---

### Task 1: Scene check tool and the before shots

**Files:**
- Create: `apps/web/scripts/sim-hub-scene-check.mjs`
- Modify: `apps/web/scripts/sim-hub-shots.mjs` (the `SHOTS` array and the comment above its scenery entries)

**Interfaces:**
- Produces:
  - `node scripts/sim-hub-scene-check.mjs [--only signs,legs,placements] [--dump <file.json>]`.
  - A `PLACEMENTS` array, which later tasks append entries to. Entry fields:
    - `id`
    - `pick: { geom?, size, at: [x, z], r?, y? }`
    - `absent?`, `minY?`, `maxY?`
    - `within?: [x0, x1, z0, z1]`
    - `flush?: { axis, face, side }`
  - Mesh names the rules read, which later tasks set:
    - `chair-seat`, `chair-leg`, `couch-seat`, `couch-leg` (Task 2);
    - `wall-lintel` (Task 3).
  - New `SHOTS` scenery entries by name, listed in Step 4.

- [ ] **Step 1: Create the scene check**

Create `apps/web/scripts/sim-hub-scene-check.mjs`:

```js
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
// [x, z] and, if `y` is given, within 0.1 of it in height. Then each given test:
//   absent  no such mesh exists (a removed prop)
//   minY    the box bottom is at this height, within 0.01 (a desk screen: the 0.88 desk top + 0.28 stand)
//   maxY    the box top is at most this height
//   within  the box centre is inside [x0, x1, z0, z1] (a desk top)
//   flush   { axis: 'x' | 'z', face, side: 'min' | 'max' }: the box's `side` along `axis` (the side
//           toward the wall) is 0 to 0.06 m off the wall's inner face `face`, not past it
const PLACEMENTS = [];

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
		if (!m.canvas) continue;
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
	report('legs', fails, `${count.chair} chairs and ${count.couch} couches, ${fails.length} problems`);
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
				(e.pick.y === undefined || Math.abs(m.cy - e.pick.y) <= 0.1)
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
			fails.push(`${e.id}: top at y ${m.max[1].toFixed(3)} (expected at most ${e.maxY}): ${where(m)}`);
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
```

- [ ] **Step 2: Build and run it on the unchanged scene (baseline)**

Run:

```bash
cd apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
```

Expected exit 1. The output should contain:
- `SCENE CHECK signs FAIL`, with at least these offenders:
  - the `CT SIMULATION` blade at x 27.80, z -4.50..-1.10;
  - the `TREATMENT AREA` blade at x 46.50, z 0.90..4.60;
  - the vault door plaques at x 63.88;
  - about 18 door-side name signs (2.15 m wide planes 0.035 m off the wall line);
  - the CT changing-nook sign near x 35.98..38.33.
- `SCENE CHECK legs FAIL: 0 chairs and 0 couches`.
- `SCENE CHECK placements PASS: 0 placements`.

Copy the full signs list into your report: Task 3 fixes it. If the run errors instead, fix the script. The bundle and hook are as described.

- [ ] **Step 3: Write a dump for later tasks**

Run:

```bash
cd apps/web && node scripts/sim-hub-scene-check.mjs --only placements --dump /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/scene-before.json
```

Expected: `SCENE CHECK dump: <n> meshes, <m> walls -> …scene-before.json`, with n around 3,500 and m around 130.

- [ ] **Step 4: Add the scenery shots**

In `apps/web/scripts/sim-hub-shots.mjs`, replace the comment block and the four scenery entries at the end of `SHOTS`. They start at the line `// scenery on walls: the lobby AED cabinet` and end at the `dosimetry-monitor` entry. Use this:

```js
	// scenery on walls: the lobby AED cabinet (it hung mid-room at (-4.6, 3.02), now on the west wall)
	// and vault 1's entrance marker (it hung in the doorway, now a stripe on the wall beside it)
	{ name: 'lobby-aed', eye: [-1.2, 1.9, 1.4], look: [-11.84, 1.4, 5.0] },
	{ name: 'vault-entrance', eye: [61.0, 1.8, -12.2], look: [63.9, 1.5, -17.6] },
	// the 2026-10-31 scenery fixes (docs/specs/2026-10-31-sim-hub-scenery-design.md), one view per fix,
	// to compare before and after: the education and dosimetry desk screens, the hallway blades, chair
	// legs, the engineering screens and door, the physics room, the QA phantom, the commons screen, the
	// manager's desk, CT control, the CT gantry, the LINAC control console and east wall, and in each
	// vault the door signs, the sink, the setup checklist and the status board
	{ name: 'education-monitor', eye: [-42.0, 1.8, -10.4], look: [-42.0, 1.2, -5.95] },
	{ name: 'dosimetry-monitor', eye: [11.6, 1.9, -50.4], look: [9.0, 1.3, -47.4] },
	{ name: 'blade-ct', eye: [23.0, 2.2, 2.6], look: [27.8, 2.8, -2.6] },
	{ name: 'blade-treatment', eye: [41.5, 2.2, -2.6], look: [46.5, 2.8, 2.4] },
	{ name: 'lobby-chair-legs', eye: [-0.6, 0.75, 6.4], look: [-3.3, 0.35, 3.6] },
	{ name: 'engineering-screens', eye: [8.0, 1.9, -34.6], look: [8.0, 1.9, -26.1] },
	{ name: 'engineering-door', eye: [11.6, 1.9, -31.0], look: [3.1, 1.7, -31.0] },
	{ name: 'physics-room', eye: [3.6, 2.4, -13.6], look: [11.0, 1.0, -22.0] },
	{ name: 'qa-phantom', eye: [-3.8, 2.0, -40.2], look: [-7.5, 1.0, -43.3] },
	{ name: 'commons-screen', eye: [-8.0, 1.8, -64.6], look: [-8.0, 1.6, -54.1] },
	{ name: 'manager-office', eye: [24.4, 2.4, 4.1], look: [17.0, 1.0, 10.5] },
	{ name: 'ctcontrol-room', eye: [35.4, 2.4, -13.4], look: [28.0, 1.0, -5.0] },
	{ name: 'ctcontrol-backwall', eye: [31.5, 1.9, -5.2], look: [31.5, 1.8, -13.9] },
	{ name: 'ct-gantry', eye: [38.0, 2.6, -17.0], look: [46.0, 2.0, -9.0] },
	{ name: 'linaccontrol-console', eye: [52.5, 1.9, 9.0], look: [44.1, 1.7, 9.0] },
	{ name: 'linaccontrol-east', eye: [47.5, 1.9, 9.0], look: [57.9, 1.5, 7.2] },
	{ name: 'vault1-door-signs', eye: [60.0, 1.7, -18.0], look: [63.7, 4.1, -18.0] },
	{ name: 'vault2-door-signs', eye: [60.0, 1.7, 18.0], look: [63.7, 4.1, 18.0] },
	{ name: 'vault1-sink', eye: [69.5, 1.9, -25.5], look: [66.2, 1.0, -30.5] },
	{ name: 'vault2-sink', eye: [69.5, 1.9, 25.5], look: [66.2, 1.0, 30.5] },
	{ name: 'vault1-checklist', eye: [87.0, 2.3, -22.8], look: [93.7, 2.4, -22.8] },
	{ name: 'vault1-status', eye: [78.45, 2.3, -13.0], look: [78.45, 2.2, -5.3] },
	{ name: 'vault2-status', eye: [78.45, 2.3, 13.0], look: [78.45, 2.2, 5.3] }
];
```

- [ ] **Step 5: Take the before shots**

Run all shots on the unchanged build, about 5 minutes:

```bash
cd apps/web && node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/before 2>&1 | tail -3
```

Expected:
- one line per shot (38 shots), ending with `vault2-status -> …/before/vault2-status.png`;
- no `sim-hub-shots error`.

- [ ] **Step 6: Lint and commit**

```bash
cd apps/web && pnpm exec prettier --write scripts/sim-hub-scene-check.mjs scripts/sim-hub-shots.mjs && pnpm exec eslint scripts/sim-hub-scene-check.mjs scripts/sim-hub-shots.mjs
cd ../.. && git add apps/web/scripts/sim-hub-scene-check.mjs apps/web/scripts/sim-hub-shots.mjs
git commit -m "test(sim-hub): scene check for signs, chair legs and prop placements; scenery shots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Chair and couch legs, cabinet drawer fronts

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts`:
  - `chair()` ≈530;
  - `couch()` ≈549;
  - `cabinetBank()` ≈606.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

**Interfaces:**
- Consumes: the scene check's legs rule (Task 1).
- Produces:
  - meshes named `chair-seat` / `chair-leg` / `couch-seat` / `couch-leg`;
  - `cabinetBank` draws its drawer lines and handles on the face it turns to. Tasks 7 and 9 rely on this.

- [ ] **Step 1: Add the failing placement for a turned cabinet**

The engineering east cabinet (`rooms.ts` `cabinetBank(g, room.x + 3.95, room.z - 2.0, 1.4, 1.42, 0.42, -Math.PI / 2, …)`, at (11.95, -33)) faces -x. Its drawer lines (1.26 × 0.02 × 0.015) belong at x = 11.95 − 0.2058 = 11.744.

Append to `PLACEMENTS`:

```js
	// Task 2: a turned cabinet shows its drawer lines on the face it turns to (engineering's east
	// cabinet faces -x; its front is 0.2058 m from its centre)
	{
		id: 'engineering east cabinet drawer line on its front',
		pick: { size: [1.26, 0.02, 0.015], at: [11.744, -33], y: 0.31, r: 0.05 }
	}
```

Run `node scripts/sim-hub-scene-check.mjs --only legs,placements`.

Expected: FAIL:
- `legs`: 0 chairs;
- `placements`: `picked 0 meshes`.

- [ ] **Step 2: Legs on chair() and couch()**

In `props.ts`, replace `chair()` and `couch()` with these, and add `seatLegs` just above `chair()`:

```ts
// Four legs from the floor to a seat's underside, inset from its corners and turned with it, in the
// seat's own material: the NPC check counts a seat's same-material parts as its frame, not as
// furniture its sitter must clear (scripts/lib/furniture.mjs seatMeshes).
function seatLegs(g, kind, x, z, rot, hx, hz, h) {
	const c = Math.cos(rot),
		s = Math.sin(rot);
	for (const [lx, lz] of [
		[-hx, -hz],
		[hx, -hz],
		[-hx, hz],
		[hx, hz]
	]) {
		const leg = box(0.04, h, 0.04, MAT.uphol, x + lx * c + lz * s, h / 2, z - lx * s + lz * c);
		leg.rotation.y = rot;
		leg.name = `${kind}-leg`;
		add(g, leg);
	}
}

export function chair(g, x, z, rot = 0) {
	const s = box(0.55, 0.12, 0.55, MAT.uphol, x, 0.48, z);
	s.rotation.y = rot;
	s.name = 'chair-seat';
	add(g, s);
	const b = box(
		0.55,
		0.65,
		0.12,
		MAT.uphol,
		x - 0.21 * Math.sin(rot),
		0.82,
		z - 0.21 * Math.cos(rot)
	);
	b.rotation.y = rot;
	add(g, b);
	seatLegs(g, 'chair', x, z, rot, 0.235, 0.235, 0.42);
	// sitting area: backrest front (-0.15) to the seat's front edge (+0.275)
	addSeat(g, 'chair', x, z, rot, 0.54, 0, 0.06);
}

export function couch(g, x, z, rot = 0) {
	const s = box(1.7, 0.32, 0.72, MAT.uphol, x, 0.43, z);
	s.rotation.y = rot;
	s.name = 'couch-seat';
	add(g, s);
	const b = box(1.7, 0.72, 0.16, MAT.uphol, x - 0.3 * Math.sin(rot), 0.87, z - 0.3 * Math.cos(rot));
	b.rotation.y = rot;
	add(g, b);
	seatLegs(g, 'couch', x, z, rot, 0.8, 0.31, 0.27);
	// sitting area: backrest front (-0.22) to the seat's front edge (+0.36)
	addSeatRow(g, 'couch', x, z, rot, 0.59, 1.7, 0.07);
}
```

The chair seat spans y 0.42..0.54, so its legs are 0.42 tall. The couch seat spans y 0.27..0.59, so its legs are 0.27 tall.

- [ ] **Step 3: Turn the cabinet's drawer lines and handles with its body**

In `cabinetBank()`, replace everything after `add(g, body);` up to the function's closing brace with:

```ts
	// the drawer lines and handles go on the front (the body's local +z face), turned with the body
	const front = (d / 2) * 0.98,
		at = (lx) => [x + lx * Math.cos(rot) + front * Math.sin(rot), z - lx * Math.sin(rot) + front * Math.cos(rot)];
	for (let i = -1; i <= 1; i++) {
		const y = h * 0.22 + i * h * 0.22,
			[lx0, lz0] = at(0);
		const line = box(w * 0.9, 0.02, 0.015, std(0xb2bcc2, 0.7, 0.06), lx0, y, lz0);
		line.rotation.y = rot;
		add(g, line);
		for (const side of [-1, 1]) {
			const [hx, hz] = at(side * w * 0.24);
			const handle = box(0.04, 0.16, 0.015, std(0x7d8b93, 0.45, 0.35), hx, y, hz);
			handle.rotation.y = rot;
			add(g, handle);
		}
	}
}
```

- [ ] **Step 4: Run the scene check**

Run:

```bash
cd apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs --only legs,placements; echo "exit $?"
```

Expected:
- `SCENE CHECK legs PASS: 20 chairs and 3 couches, 0 problems`
- `SCENE CHECK placements PASS: 1 placements, 0 problems`
- `exit 0`

- [ ] **Step 5: NPC check, tests, typecheck**

Run:

```bash
cd apps/web && node scripts/sim-hub-npc-check.mjs; echo "exit $?"; pnpm test 2>&1 | tail -4; pnpm check 2>&1 | tail -3
```

Expected: the NPC check prints a–m PASS with exit 0, the tests pass, and the check reports 0 errors.

If check k or l fails, it is a person against a new chair leg. Report the failing lines. Do not change the legs' height or footprint to pass, and do not edit NPC data outside the room named in the failure. Fixing a failing room's spot or node is allowed: move it until the check passes, and list the change.

- [ ] **Step 6: Shots, lint, commit**

```bash
cd apps/web && node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after lobby-chair-legs
pnpm exec prettier --write arcade-src/sim-hub/src/props.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/props.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/props.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): chairs and couches stand on legs; turned cabinets show their drawer fronts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Read `after/lobby-chair-legs.png`: the lobby chairs should stand on four thin legs.

---

### Task 3: Signs out of the walls

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts` (`buildPhase5Wayfinding` ≈1110)
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`:
  - `addVaultDoorwaySigns` ≈834;
  - `buildDoor` ≈589 (the `makeWallSign` call);
  - `buildSide` ≈593–636 (lintel names);
  - the `vault1`/`vault2` furnish cases (the NO ENTRY plaque);
  - the imports.
- Modify: `apps/web/arcade-src/sim-hub/src/helpers.ts`:
  - `makeDoorHeaderSign` ≈163;
  - remove `makeWallSign` ≈119 and `makeSignTexture` ≈73;
  - update the header comment at line 5.
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts` (`privacyChangingNook` sign plane ≈1570)
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

**Interfaces:**
- Consumes: the scene check's signs rule (Task 1).
- Produces: lintel boxes named `wall-lintel`.

- [ ] **Step 1: Add the failing placements**

Append to `PLACEMENTS`:

```js
	// Task 3: the hallway blades stop 0.05 m short of the corridor face of the room wall they stand
	// off; the vault warning plaques hang side by side above each vault door on the corridor face
	// (x 63.71), over the door's header sign, which also moves out of the lintel
	{
		id: 'CT SIMULATION blade stops at the corridor face',
		pick: { geom: 'PlaneGeometry', size: [3.4, 0.76], at: [27.8, -2.17] },
		flush: { axis: 'z', face: -3.92, side: 'min' }
	},
	{
		id: 'TREATMENT AREA blade stops at the corridor face',
		pick: { geom: 'PlaneGeometry', size: [3.7, 0.76], at: [46.5, 2.02] },
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
	}
```

Run `pnpm build:arcade >/dev/null; node scripts/sim-hub-scene-check.mjs --only signs,placements`.

Expected: both rules FAIL.

- [ ] **Step 2: Hallway blades**

In `equipment.ts` `buildPhase5Wayfinding`:
- change the `CT SIMULATION` sign's z argument from `-2.8` to `-2.17`;
- change the `TREATMENT AREA` sign's z argument from `2.75` to `2.02`.

Add one comment line above the first call:

```ts
	// the two blades stand off the room walls along the clinical corridor; each one's wall edge stops
	// 0.05 m short of that wall's corridor face (z -3.92 for CT control, 3.92 for LINAC control)
```

- [ ] **Step 3: Vault door signs on the corridor face**

Replace the body of `addVaultDoorwaySigns` from `const p1 = …` to the end with:

```ts
	// Three plaques side by side on the corridor face above the door, over its header sign (y 3.40..4.16):
	// the vault wall is 0.58 m thick, so its corridor face is 0.29 m off the door centre line
	const signs: [number, string, string][] = [
		[-1.55, 'CAUTION', 'RADIATION AREA'],
		[0, 'DO NOT ENTER', 'BEAM ON WHEN LIGHT IS ON'],
		[1.55, 'NO ENTRY', 'WHEN BEAM ON']
	];
	for (const [along, title, sub] of signs) {
		const p = dc
			.clone()
			.add(tangent.clone().multiplyScalar(along))
			.add(normal.clone().multiplyScalar(0.34));
		warningPlaque(scene, p.x, 4.85, p.z, rot, title, sub);
	}
```

Change `dc = doorCenter(room, 2.45)` to `dc = doorCenter(room, 4.85)`. The y passed to `warningPlaque` is explicit, so this only keeps the vector consistent.

In the `vault1` and `vault2` furnish cases, delete the `warningPlaque(…, 'NO ENTRY', 'WHEN BEAM ON')` call. It is the one at `room.x - room.w / 2 + 0.32, 1.65, room.z + 2.95`. Keep the `CAUTION / HIGH RADIATION AREA` one.

- [ ] **Step 4: Door header signs follow the wall thickness; remove the hidden door-side signs**

In `helpers.ts` `makeDoorHeaderSign`, replace `dc.add(normal.clone().multiplyScalar(0.085));` with:

```ts
	// the back plate sits 0.005 m out from the wall's face: half the wall's thickness from the door's
	// centre line (buildRoom: 0.58 m vault walls, 0.16 m others)
	dc.add(normal.clone().multiplyScalar((room.vault ? 0.29 : 0.08) + 0.005));
```

For 0.16 m walls this is the same 0.085 as before. For vault walls the back plate moves to 0.295 and the sign to 0.34 (x 63.66).

Delete `makeWallSign` and `makeSignTexture`; `makeWallSign` is the only user of `makeSignTexture`, so confirm with `grep -n makeSignTexture arcade-src/sim-hub/src/*.ts` that nothing else uses it. In the `helpers.ts` header comment, remove `makeWallSign, `. In `rooms.ts`, delete the `makeWallSign(room, side, gap);` line in `buildDoor` and the `makeWallSign,` import.

- [ ] **Step 5: Name the lintels**

In `rooms.ts` `buildSide`, give the four header boxes (the two door lintels and the two window headers) the name `wall-lintel`. Replace them as follows.

zmin/zmax door:

```ts
			const lint = box(gap, h - 2.65, t, mat, room.x, 2.65 + (h - 2.65) / 2, z);
			lint.name = 'wall-lintel';
			scene.add(lint);
```

zmin/zmax window:

```ts
			const hdr = box(win, h - 2.82, t, mat, room.x, 2.82 + (h - 2.82) / 2, z);
			hdr.name = 'wall-lintel';
			scene.add(hdr);
```

xmin/xmax door: after `const lint = box(t, h - 2.65, gap, mat, x, 2.65 + (h - 2.65) / 2, room.z);`, add `lint.name = 'wall-lintel';`.

xmin/xmax window:

```ts
			const hdr = box(t, h - 2.82, win, mat, x, 2.82 + (h - 2.82) / 2, room.z);
			hdr.name = 'wall-lintel';
			scene.add(hdr);
```

- [ ] **Step 6: The changing-nook sign fits its nook**

In `props.ts` `privacyChangingNook`, change the sign plane from `new THREE.PlaneGeometry(2.35 * s, 0.9)` to `new THREE.PlaneGeometry(2.1 * s, 0.8)`. Add above it:

```ts
	// 2.1 m wide (the canvas's own 2.6:1), so the CT nook's sign (x 36.10..38.20) clears the room's
	// west wall (inner face x 36.08)
```

- [ ] **Step 7: Run the scene check**

Run:

```bash
cd apps/web && pnpm build:arcade >/dev/null && node scripts/sim-hub-scene-check.mjs; echo "exit $?"
```

Expected: `signs PASS`, `legs PASS`, `placements PASS`, `exit 0`.

If `signs` still lists an offender not covered above, move that panel out to 0.005–0.05 m in front of the wall face it stands on. Change its builder's offset the same way as Step 4, list it in your report and re-run. Do not raise `SIGN_DEPTH`.

- [ ] **Step 8: NPC check, tests, typecheck**

Run the NPC check, `pnpm test` and `pnpm check` as in Task 2 Step 5. Expected: all pass. Signs are planes and the check leaves them out of the furniture, so no NPC effect is expected.

- [ ] **Step 9: Shots, lint, commit**

```bash
cd apps/web && for s in blade-ct blade-treatment vault1-door-signs vault2-door-signs; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after $s; done
pnpm exec prettier --write arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/helpers.ts arcade-src/sim-hub/src/props.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/helpers.ts arcade-src/sim-hub/src/props.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/helpers.ts apps/web/arcade-src/sim-hub/src/props.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): signs out of the walls; vault warnings above the vault doors; hidden door-side signs removed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Read the four PNGs:
- the blades hang in the hallway without entering the rooms;
- each vault door has its header sign, with the three yellow plaques in a row above it.

---

### Task 4: Desk and wall screens (education, physics, engineering, dosimetry, commons)

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts` (`monitor()` ≈522)
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (furnish cases `education`, `physics`, `dosimetry`, `commons`)
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts` (`buildEngineeringWallSchematics` ≈206)
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts`: the comments above `ROOM_GRAPHS.physics` and `ROOM_GRAPHS.engineering`.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

**Interfaces:**
- Produces: `monitor(g, x, y, z, rot = 0, w = 0.8, h = 0.48, stand = true)`. With `stand = false` there is no desk stand.

- [ ] **Step 1: Add the failing placements**

```js
	// Task 4: desk computer screens stand on their desks; wall screens hang flush on their walls
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
	}
```

Build, run `--only placements`. Expected: FAIL, 6 or more problems.

- [ ] **Step 2: `monitor()` without a stand**

```ts
export function monitor(g, x, y, z, rot = 0, w = 0.8, h = 0.48, stand = true) {
	const m = box(w, h, 0.055, MAT.screen, x, y, z);
	m.rotation.y = rot;
	add(g, m);
	// a wall-mounted screen has no desk stand under it
	if (!stand) return;
	const st = box(0.08, 0.28, 0.08, MAT.black, x, y - h / 2 - 0.14, z);
	add(g, st);
}
```

- [ ] **Step 3: Education**

In the `education` case, replace the two comment lines and the `monitor(g, room.x + 3.11, 1.7, room.z + 4.392, 0, 1.8, 0.95);` call with:

```ts
			// the navigator's computer on the desk, toward its door-side edge, facing the visitor chairs
			// (-z) so the navigator and the patient read it together
			monitor(g, room.x, 1.4, room.z + 1.55, Math.PI, 0.8, 0.48);
```

- [ ] **Step 4: Physics**

In the `physics` case, delete the `atom` disc:
- the `// eslint-disable-next-line no-case-declarations …` line;
- `const atom = …`;
- `atom.rotation.x = …`;
- `atom.position.set(…)`;
- `add(g, atom);`.

Leave the `desk(…)` and `break;`.

In `room-routes.ts`, change the comment above `physics:` to `// door to the open floor; the desk stays clear`.

- [ ] **Step 5: Engineering**

Replace `buildEngineeringWallSchematics` in `equipment.ts` with:

```ts
// The two small teaching screens hang side by side on the +z wall, opposite the big head schematic on
// the -z wall; the -x wall holds the door.
export function buildEngineeringWallSchematics(g, room) {
	const z = room.z + room.d / 2 - 0.16;
	customTextureWallMonitor(
		g,
		room.x - 2.4,
		2.03,
		z,
		Math.PI,
		2.85,
		1.66,
		engineeringLinacOverviewTexture(),
		'LINAC System Overview',
		'Broad schematic showing the major LINAC subsystems beyond the treatment head.'
	);
	customTextureWallMonitor(
		g,
		room.x + 2.4,
		2.03,
		z,
		Math.PI,
		2.85,
		1.66,
		engineeringShieldingTexture(),
		'Vault Shielding Concepts',
		'Educational shielding schematic contrasting controlled and non-controlled area barrier concepts.'
	);
}
```

In `room-routes.ts`, change the two comment lines above `engineering:` to:

```ts
	// in by the door's -z half, past the cabinet at (4.05, -32.9)
```

Change node 2's trailing comment to `// 2 inside, clear of the cabinet`.

- [ ] **Step 6: Dosimetry**

In the `dosimetry` case, replace:

```ts
			// flush on the +z wall's inner face (z = room.z + 7.42)
			monitor(g, room.x, 2.2, room.z + 7.392, 0, 2.5, 1.3);
```

with:

```ts
			// the planning review screen on the centre desk, toward its +z edge, facing Dr Shah's side (-z)
			monitor(g, room.x, 1.485, room.z + 1.6, Math.PI, 1.2, 0.65);
```

- [ ] **Step 7: Commons**

In the `commons` case, replace `monitor(g, room.x - 4.9, 2.0, room.z, Math.PI / 2, 1.8, 1.0);` with:

```ts
			// a presentation screen flush on the +z wall's inner face (z = room.z + 5.92), facing the five
			// chairs; no desk stand
			monitor(g, room.x, 1.9, room.z + room.d / 2 - 0.115, Math.PI, 1.8, 1.0, false);
```

- [ ] **Step 8: Scene check, NPC check, tests, typecheck**

Rebuild, then run the scene check, NPC check, `pnpm test` and `pnpm check`. Expected:
- scene check exit 0, with placements 0 problems;
- NPC a–m PASS;
- tests and check clean.

People who stand near the new desk screens:
- education: the navigator at (-43.6, -6.95), and the arrival spots at z -5.4;
- dosimetry: Dr Shah at (7.1, -48.35).

They are 0.5 m or more from the screens. If k fails, report it; do not move the screens off their desks.

- [ ] **Step 9: Shots, lint, commit**

```bash
cd apps/web && for s in education-monitor physics-room engineering-screens engineering-door dosimetry-monitor commons-screen; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after $s; done
pnpm exec prettier --write arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/props.ts apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): computer screens on the education and dosimetry desks, engineering screens off the door, commons screen on its wall, physics disc removed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Machine QA water phantom at real size

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (furnish case `qa` ≈1104)
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts`: `ARRIVAL_SPOTS.qa` and its comment; the `ROOM_GRAPHS.qa` comments.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

- [ ] **Step 1: Add the failing placements**

```js
	// Task 5: the water phantom is a real-size tank (0.65 m) on its cart (deck top 0.80)
	{
		id: 'QA water phantom tank on its cart',
		pick: { size: [0.65, 0.55, 0.65], at: [-7.5, -43.3] },
		minY: 0.8
	},
	{
		id: 'QA room-sized tank removed',
		pick: { size: [3.1, 1.55, 2.8], at: [-7.5, -43.3] },
		absent: true
	}
```

- [ ] **Step 2: Tank and cart**

In the `qa` case, replace the tank lines (the eslint comment, `const tank = box(3.1, …)`, `add(g, tank);` and the `registerInteractable(tank, …)` call) with:

```ts
			// the water phantom: a scanning tank about real size (0.65 m) on its wheeled cart, at the old
			// tank's x/z so the qa_water anchor (equipment.ts) still marks it; the tank stays the
			// interactable
			// eslint-disable-next-line no-case-declarations -- legacy switch case, lexical decl scoped to this case only (no fallthrough)
			const cartMat = std(0x8d9aa3, 0.5, 0.35),
				cartZ = room.z + 0.7;
			add(g, box(0.9, 0.06, 0.9, cartMat, room.x, 0.77, cartZ));
			add(g, box(0.84, 0.04, 0.84, cartMat, room.x, 0.22, cartZ));
			for (const sx of [-0.4, 0.4])
				for (const sz of [-0.4, 0.4]) {
					add(g, box(0.05, 0.62, 0.05, cartMat, room.x + sx, 0.43, cartZ + sz));
					const wheel = cyl(0.06, 0.06, 0.05, MAT.black, 12);
					wheel.rotation.z = Math.PI / 2;
					wheel.position.set(room.x + sx, 0.06, cartZ + sz);
					add(g, wheel);
				}
			// eslint-disable-next-line no-case-declarations -- legacy switch case, lexical decl scoped to this case only (no fallthrough)
			const tank = box(0.65, 0.55, 0.65, MAT.water, room.x, 1.075, cartZ);
			add(g, tank);
			registerInteractable(
				tank,
				'Water Phantom',
				'QA phantom used for beam-data and dosimetric measurements.'
			);
```

The cart has:
- a deck at y 0.74..0.80;
- posts at y 0.12..0.74;
- a lower shelf at 0.20..0.24;
- wheels with radius 0.06.

The tank spans y 0.80..1.35 and x/z -7.825..-7.175 / -43.625..-42.975. Keep `desk(…)` and `monitor(…)` after it.

- [ ] **Step 3: Arrival spots beside the cart**

The cart spans x -7.95..-7.05 and z -43.75..-42.85. In `room-routes.ts`:
- change the comment above `qa:` in `ARRIVAL_SPOTS` to `// beside the phantom's cart, facing it`;
- set the spots to start at:

```ts
	qa: [
		{ x: -6.5, z: -43.3, facing: -1.57 },
		{ x: -6.5, z: -42.65, facing: -1.57 },
		{ x: -6.5, z: -43.95, facing: -1.57 }
	],
```

In `ROOM_GRAPHS.qa`, rewrite the two comment lines above it as:

```ts
	// the arrival spots stand beside the phantom's cart (x -7.95..-7.05, z -43.75..-42.85): they are
	// reached from off its ends
```

Update node 1's and node 2's trailing comments to say "off the cart's -z end" and "off its +z end".

- [ ] **Step 4: Scene check and NPC check**

Rebuild, then run the scene check (expect exit 0) and the NPC check.

If k or m fails on a QA spot, move only that spot. Keep it beside the cart, at 0.4–0.8 m from the cart, facing it, 0.6 m from the other spots and 0.5 m from the residents: the physicist (-9.5, -46.0) and Riley Chen (as placed by `npc.ts`). Re-run until a–m pass. If l fails on a QA route, move the `ROOM_GRAPHS.qa` nodes 1 and 2 within the open floor.

- [ ] **Step 5: Tests, typecheck, shots, lint, commit**

```bash
cd apps/web && pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2
node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after qa-phantom
pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): QA water phantom at real size on its cart

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Manager's desk up to the visitor chairs

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (furnish case `manager` ≈1124)
- Modify: `apps/web/arcade-src/sim-hub/src/npc.ts` (the `place('manager', …)` dz ≈738)
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts` (`ROOM_GRAPHS.manager` and its comment)
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

- [ ] **Step 1: Add the failing placements**

```js
	// Task 6: the manager's desk stands 0.3 m in front of the visitor chairs; its screen faces the manager
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
	}
```

- [ ] **Step 2: Move the desk and screen**

Replace the first two lines of the `manager` case with:

```ts
			// the desk stands just in front of the visitor chairs (seat fronts at z = room.z + 1.22), the
			// manager on its door side facing them; the screen faces the manager
			desk(g, room.x, room.z + 0.5, 2.5, 0.85);
			monitor(g, room.x, 1.435, room.z + 0.75, Math.PI, 1.0, 0.55);
```

Leave the two `chair(…)` lines unchanged.

- [ ] **Step 3: The manager stands at the new desk**

In `npc.ts`, change the `place('manager', 'Rad Onc Manager / Lead Therapist', …)` dz argument from `-0.9` to `-0.55`. That puts the manager at (20, 7.45), facing +z, 0.625 m from the desk's -z edge (8.075).

- [ ] **Step 4: Graph round the new desk**

The new desk spans x 18.75..21.25 and z 8.075..8.925. In `room-routes.ts`:
- change the comment above `manager:` to `// round the desk's -x end (x 18.75..21.25, z 8.075..8.925)`;
- start the nodes from:

```ts
		nodes: [
			[20, 2.65], // 0 door
			[18.2, 6.5], // 1 -x of the desk, on its door side
			[18.6, 7.6], // 2 by the desk's -x end: the manager in front of it
			[18.25, 8.55] // 3 beside the desk's -x end: the visitor's chair and Chris Evans
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3]
		]
```

- [ ] **Step 5: Scene check and NPC check**

Rebuild, then run the scene check (exit 0) and the NPC check.

If k, l or m fails in the manager's office, adjust only:
- the manager's dz (keep it −0.45..−0.75);
- Chris Evans's offsets in `npc.ts secondary('manager', 'Chris Evans', …)`;
- the `ROOM_GRAPHS.manager` nodes.

Re-run until a–m pass.

- [ ] **Step 6: Tests, typecheck, shots, lint, commit**

```bash
cd apps/web && pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2
for s in manager-office manager-desk; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after $s; done
pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/npc.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): manager's desk moves up to the visitor chairs, away from the door

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: CT Control room

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (furnish case `ctcontrol` ≈1131). Keep the `monitorWall` import: LINAC control still calls it until Task 9, which removes the function and the import.
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts`:
  - the `ctControlState` board in `buildPhase4WorkflowDisplays` ≈264;
  - `buildCtLiveConsole` ≈523–600.
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts` (`ARRIVAL_SPOTS.ctcontrol`, `ROOM_GRAPHS.ctcontrol` and comments)
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

**Interfaces:**
- Consumes: the `cabinetBank` turn fix (Task 2).

- [ ] **Step 1: Add the failing placements**

```js
	// Task 7: CT control: keyboard on the console desk (x 29.725..30.875); chairs 0.5 m from it; the
	// cabinet on the door wall east of the door; the live CT CONTROL board on the back wall below the room
	// sign; the blank screens gone; the four live screens side by side in front of the backing board
	{
		id: 'CT control keyboard on the console desk',
		pick: { size: [0.72, 0.035, 0.24], at: [30.6, -8.35] },
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
		[-9.6, 2.08, 'CT SIM STATUS'],
		[-8.4, 2.08, 'PATIENT VIEW'],
		[-9.6, 1.38, 'GANTRY VIEW'],
		[-8.4, 1.38, 'ROOM WIDE']
	].map(([z, y, label]) => ({
		id: `CT control ${label} screen in front of the board`,
		pick: { size: [1.14, 0.7, 0.08], at: [30.15, z], y, r: 0.1 }
	}))
```

- [ ] **Step 2: Furnish case**

Replace the `ctcontrol` case's lines from `desk(…)` through the `cabinetBank(…)` call with:

```ts
			desk(g, room.x - 1.2, room.z - 0.2, 4.8, 1.15, Math.PI / 2);
			// the operators' chairs face the console, seat fronts 0.5 m from the desk edge (x 30.875)
			for (let i = -1; i <= 1; i++)
				taskChair(g, room.x + 0.15, room.z + i * 1.15, -Math.PI / 2, 0x4c6776);
			// a storage cabinet against the door wall east of the door (x 30.2..32.8), drawers facing in
			cabinetBank(g, room.x + 3.2, room.z + room.d / 2 - 0.31, 1.6, 1.5, 0.45, Math.PI, 0xdbe3e8);
```

This drops `monitorWall(…)` and the blank `monitor(g, room.x, 2.05, room.z - 4.15, …)`. The `interiorRoomSign`, `wallClock` and other lines that follow stay.

- [ ] **Step 3: The live CT CONTROL board on the back wall**

In `buildPhase4WorkflowDisplays`, replace the `createWorkflowDisplay('ctControlState', 35.82, 2.22, -11.2, -Math.PI / 2, 'CT CONTROL', 2.55, 1.38)` call with:

```ts
	// on CT control's back (-z) wall, where the blank screen was: clear of the window on the +x wall and
	// below the room sign (from y 2.75)
	createWorkflowDisplay('ctControlState', 31.5, 1.95, -13.82, 0, 'CT CONTROL', 2.55, 1.38);
```

- [ ] **Step 4: The four live CT screens side by side**

In `buildCtLiveConsole`:
- add `const mx = r.x - 1.35;` after `const rot = Math.PI / 2;`;
- add the comment shown below;
- change the four `createOperatorMonitor` and `operatorLabel` positions. Keep every other argument.

```ts
	// the four screens stand side by side in a 2 x 2 grid on the desk, in front of the backing board
	// (x 29.98..30.06), facing the operators (+x): status and gantry on the -z side, patient and room on +z
	const mx = r.x - 1.35;
```

| Screen | Monitor `(x, y, z)` | Label |
|---|---|---|
| CT sim status mirror | `(mx, 2.08, r.z - 0.6)` | `operatorLabel(g, mx, 2.46, r.z - 0.6, rot, 'CT SIM STATUS', 'MIRROR')` |
| Patient view (`tA`) | `(mx, 2.08, r.z + 0.6)` | `operatorLabel(g, mx, 2.46, r.z + 0.6, rot, 'PATIENT VIEW')` |
| Gantry view (`tB`) | `(mx, 1.38, r.z - 0.6)` | `operatorLabel(g, mx, 1.76, r.z - 0.6, rot, 'GANTRY VIEW')` |
| Room wide (`tC`) | `(mx, 1.38, r.z + 0.6)` | `operatorLabel(g, mx, 1.76, r.z + 0.6, rot, 'ROOM WIDE')` |

- Keyboard: `consoleKeyboard(g, r.x - 0.9, r.z + 0.65, rot);`

The keyboard lands at x 30.48..30.72, on the desk.

- [ ] **Step 5: NPC routes behind the chairs**

The chairs now cover the old aisle between the console and the chairs: seats x 31.4..31.9, backs to x 31.88. In `room-routes.ts`:

```ts
	// behind the operators' chairs, facing the console
	ctcontrol: [
		{ x: 32.75, z: -7.25, facing: -1.57 },
		{ x: 32.75, z: -8.45, facing: -1.57 },
		{ x: 33.35, z: -7.85, facing: -1.57 }
	],
```

and

```ts
	// in through the door, then down behind the operators' chairs (seats x 31.4..31.9, backs to 31.88):
	// the 0.5 m between the console (to x 30.875) and the seats is too narrow to walk
	ctcontrol: {
		nodes: [
			[31.5, -3.15], // 0 door
			[31.5, -4.5], // 1 inside the door
			[31.2, -5.6], // 2 toward the console's +z end
			[32.6, -6.95], // 3 north of the chairs: the therapist (32.7, -6.6) and spot [0]
			[32.6, -8.5], // 4 behind the chairs: spots [1] and [2]
			[32.6, -10.7] // 5 behind the south chair: the partner (31.0, -11.0) leaves along ~80 deg
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5]
		]
	},
```

- [ ] **Step 6: Scene check and NPC check**

Rebuild, then run the scene check (exit 0) and the NPC check.

If k, l or m fails in CT control, adjust only:
- these spots and nodes;
- the primary therapist's offsets (`place('ctcontrol', …)`, now (32.7, -6.6));
- Avery Woods's offsets (`secondary('ctcontrol', 'Avery Woods', …)`, (31.0, -11.0)).

Keep people out of the 0.5 m gap between the desk and the chairs. Re-run until a–m pass.

- [ ] **Step 7: Tests, typecheck, shots, lint, commit**

```bash
cd apps/web && pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2
for s in ctcontrol-room ctcontrol-backwall ctcontrol-console; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after $s; done
pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): CT control: keyboard on the desk, chairs closer, cabinet out of the doorway, CT CONTROL board off the window, all four live screens visible

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Read the PNGs:
- the window is clear;
- the board is on the back wall;
- the four labelled screens show side by side;
- the cabinet is beside the door.

---

### Task 8: CT scanner at real size

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts` (`ctScanner` ≈1258)
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts`: the comment above `ROOM_GRAPHS.ctsim`, which names the gantry box.
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

- [ ] **Step 1: Add the failing placements**

```js
	// Task 8: a real-size CT gantry (2.1 m tall) stands under the 3.75 m ceiling
	{
		id: 'CT gantry real size',
		pick: { geom: 'TorusGeometry', size: [0.75, 0.3], at: [44, -9.5] },
		maxY: 2.11
	},
	{
		id: 'CT room-sized gantry ring removed',
		pick: { geom: 'TorusGeometry', size: [2.15, 0.58], at: [44, -9.5] },
		absent: true
	}
```

- [ ] **Step 2: The gantry**

In `ctScanner`, replace the `ring`, `bore` and `base` lines (through `add(g, base);`) with:

```ts
	// a real-size big-bore CT gantry: 2.1 m tall with a 0.9 m bore, centred 1.05 m up, so the couch top
	// (y 1.025, 0.72 m wide) and the patient on it pass through the bore when the couch slides in
	const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.3, 18, 54), MAT.white);
	ring.rotation.y = Math.PI / 2;
	ring.position.set(room.x, 1.05, room.z + 1.5);
	ring.castShadow = true;
	add(g, ring);
	const bore = new THREE.Mesh(
		new THREE.TorusGeometry(0.45, 0.02, 14, 48),
		std(0x2b3944, 0.5, 0.1, { emissive: 0x16435a, emissiveIntensity: 0.65 })
	);
	bore.rotation.y = Math.PI / 2;
	bore.position.copy(ring.position);
	add(g, bore);
	const base = box(0.8, 0.35, 1.6, MAT.white, room.x, 0.175, room.z + 1.5);
	add(g, base);
```

The table, pedestal and `CT_COUCH` lines stay.

- [ ] **Step 3: Comment**

In `room-routes.ts`, change `// from the door round the gantry (x 43.4..44.6, z -12.2..-6.8): -x to the couch side and the` to `// from the door round the gantry (x 43.6..44.4, z -10.55..-8.45): -x to the couch side and the`.

- [ ] **Step 4: Scene check, NPC check (h measures the patient on the sliding couch)**

Rebuild, then run the scene check (exit 0) and the NPC check.

Check h measures the CT patient with the couch slid 0, 1, 2 and 3.15 m in. It must pass.

Also confirm no part of the couch or patient enters the ring:

```bash
cd apps/web && node scripts/sim-hub-scene-check.mjs --only placements --dump /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/scene-task8.json >/dev/null
```

At couch offset 0 the table (x 37.2..43.0) stops short of the ring (x 43.7..44.3). That is what the dump shows. The NPC check's h covers the slid positions.

- [ ] **Step 5: Tests, typecheck, shots, lint, commit**

```bash
cd apps/web && pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2
for s in ct-gantry ct-table ct-low; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after $s; done
pnpm exec prettier --write arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/props.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): CT gantry at real size, under the ceiling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Read `ct-table.png` and `ct-low.png`: the patient lies on the table in front of the smaller gantry, not inside its ring.

---

### Task 9: LINAC Control console against the west wall

**Files:**
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts`:
  - furnish case `linaccontrol` ≈1262;
  - `addClinicalWallPolish` ≈1663–1666;
  - remove the now-unused `monitorWall` import.
- Modify: `apps/web/arcade-src/sim-hub/src/props.ts`: remove `monitorWall` ≈700. It has no caller after this task; confirm with grep.
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts`:
  - `buildOperatorLiveConsole` ≈392–510;
  - the `linac_console` spec dx ≈1289.
- Modify: `apps/web/arcade-src/sim-hub/src/npc.ts`: Morgan Reed `place('linaccontrol', …)` dx ≈776; Marcus Hill `secondary('linaccontrol', …)` dx ≈980.
- Modify: `apps/web/arcade-src/sim-hub/src/journey.ts` ≈825, 1303, 1311, 2497, 2505.
- Modify: `apps/web/arcade-src/sim-hub/src/room-routes.ts` (`ARRIVAL_SPOTS.linaccontrol`, `ROOM_GRAPHS.linaccontrol`)
- Modify: `apps/web/scripts/sim-hub-visibility-check.mjs` ≈409–420
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

**Interfaces:**
- Consumes: the `cabinetBank` turn fix (Task 2).

Everything in the desk group moves by Δx = −5.29: the desk centre goes from 50 to 44.71, so its back edge is on the west wall's inner face, x 44.08.

- [ ] **Step 1: Add the failing placements**

```js
	// Task 9: LINAC control: the console against the west wall (inner face x 44.08), its screens in
	// three columns facing east; keyboards on the desk; the cabinet under the Treatment Control screen;
	// the clock on the east wall; the blank duplicates gone
	{
		id: 'LINAC console desk against the west wall',
		pick: { size: [6.0, 0.08, 1.25], at: [44.71, 9] },
		flush: { axis: 'x', face: 44.08, side: 'min' }
	},
	{
		id: 'LINAC backing board on the west wall',
		pick: { size: [0.08, 2.35, 5.4], at: [44.12, 9] },
		flush: { axis: 'x', face: 44.08, side: 'min' }
	},
	...[
		[1.42, 0.86, 10.37, 2.36, 'Vault Wide (left, top)'],
		[1.42, 0.86, 10.37, 1.48, 'Patient View (left, bottom)'],
		[1.16, 0.72, 9, 2.16, 'Cam A (middle, top)'],
		[1.16, 0.72, 9, 1.42, 'Overhead (middle, bottom)'],
		[1.16, 0.72, 7.76, 2.16, 'Cam B (right, top)'],
		[1.16, 0.72, 7.76, 1.42, 'Vault Status (right, bottom)']
	].map(([w, h, z, y, label]) => ({
		id: `LINAC ${label}`,
		pick: { size: [w, h, 0.08], at: [44.45, z], y, r: 0.1 }
	})),
	...[7.85, 10.15].map((z) => ({
		id: `LINAC keyboard at z ${z} on the desk`,
		pick: { size: [0.72, 0.035, 0.24], at: [45.0, z] },
		within: [44.085, 45.335, 6, 12]
	})),
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
	}
```

- [ ] **Step 2: Furnish case**

Replace the `linaccontrol` case's lines from `desk(…)` through `wallClock(…)` with the code below. The `sanitizerDispenser` line stays.

```ts
			// the console desk against the west wall (inner face x = room.x - 6.92), its screens facing east
			// into the room as before; the operators' chairs keep their 1.07 m to the desk edge
			desk(g, room.x - 6.29, room.z, 6.0, 1.25, Math.PI / 2);
			for (let i = -2; i <= 2; i++)
				taskChair(g, room.x - 4.34, room.z + i * 1.05, -Math.PI / 2, 0x4d6877);
			// under the Treatment Control screen on the east wall (frame from y 1.38), drawers facing in
			cabinetBank(g, room.x + 6.69, room.z, 1.7, 1.3, 0.45, -Math.PI / 2, 0xdfe7ea);
			// on the east wall beside the Treatment Control screen (z room.z - 1.49 .. room.z + 1.49)
			wallClock(g, room.x + 6.86, 2.85, room.z - 3.6, -Math.PI / 2);
```

This drops `monitorWall(…)` and the two blank `monitor(g, room.x + 4.45, …)` calls. Remove `monitorWall` from the `rooms.ts` import list. Delete `monitorWall` from `props.ts` after `grep -n monitorWall arcade-src/sim-hub/src/*.ts` shows no other user.

- [ ] **Step 3: Backing board**

In `addClinicalWallPolish`:

```ts
	// LINAC control's console stands against the room's west wall (inner face x 44.08)
	const linacPlate = box(0.08, 2.35, 5.4, dark, 44.12, 1.75, 9);
	g.add(linacPlate);
	const linacAccent = box(0.035, 0.07, 5.0, glow, 44.18, 2.92, 9);
	g.add(linacAccent);
```

- [ ] **Step 4: Console screens**

In `buildOperatorLiveConsole`, after `const rot = Math.PI / 2;` add:

```ts
	// Three columns of screens on the console desk against the west wall, facing east (+x), left to right
	// as the operator sees them (left = +z): Vault Wide over Patient View, Cam A over Overhead, Cam B over
	// the Vault 1 status mirror. Stems stand on the desk top (y 0.88); columns 0.08 m apart.
	const mx = r.x - 6.55,
		left = r.z + 1.37,
		right = r.z - 1.24;
```

Change only the positions and sizes below; keep every other argument.

| Screen | Monitor `(x, y, z)` and size | Label |
|---|---|---|
| Vault status mirror | `(mx, 1.42, right)`, 1.02 × 0.58 | `operatorLabel(g, mx, 1.81, right, rot, 'VAULT STATUS', 'MIRROR')` |
| Cam A (`tA`) | `(mx, 2.16, r.z)` | `operatorLabel(g, mx, 2.55, r.z, rot, 'CAM A')` |
| Cam B (`tB`) | `(mx, 2.16, right)` | `operatorLabel(g, mx, 2.55, right, rot, 'CAM B')` |
| Overhead (`tC`) | `(mx, 1.42, r.z)` | `operatorLabel(g, mx, 1.81, r.z, rot, 'OVERHEAD')` |
| Vault Wide (`tD`) | `(mx, 2.36, left)`, w 1.28, h 0.72 | `operatorLabel(g, mx, 2.82, left, rot, 'VAULT WIDE')` |
| Patient View (`tE`) | `(mx, 1.48, left)`, w 1.28, h 0.72 | `operatorLabel(g, mx, 1.94, left, rot, 'PATIENT VIEW')` |

Keyboards:

```ts
	consoleKeyboard(g, r.x - 6.0, r.z + 1.15, rot);
	consoleKeyboard(g, r.x - 6.0, r.z - 1.15, rot);
```

In `EQUIPMENT_SPECS`, change the `linac_console` entry's `dx: -1.0` to `dx: -6.29`.

- [ ] **Step 5: People and routes move with the desk (Δx = −5.29)**

People:
- `npc.ts`, Morgan Reed (`place('linaccontrol', 'Radiation Therapist · Treatment Control', …)`): dx `0.35` → `-4.94`.
- `npc.ts`, Marcus Hill (`secondary('linaccontrol', 'Marcus Hill', …)`): dx `-0.2` → `-5.49`.

Journey positions:
- `journey.ts` ≈825: `JOURNEY.therapist.position.set(51.35, 0, 10.6)` → `(46.06, 0, 10.6)`.
- `journey.ts` ≈1303 and ≈2497: `new THREE.Vector3(50.85, 0, 8.6)` → `(45.56, 0, 8.6)`.
- `journey.ts` ≈1311 and ≈2505: `new THREE.Vector3(51.1, 0, 10.2)` → `(45.81, 0, 10.2)`.

Arrival spots and graph, in `room-routes.ts`:
- `ARRIVAL_SPOTS.linaccontrol`: every `x: 52.75` → `x: 47.46`. The facings stay.
- `ROOM_GRAPHS.linaccontrol`: replace with:

```ts
	// the aisle between the console's keyboards (to x 45.12) and the operators' chairs (from x 46.41),
	// and a line behind the chairs for the arrival spots; in through the door's middle
	linaccontrol: {
		nodes: [
			[51, 3.15], // 0 door
			[51, 4.7], // 1 inside the door
			[45.66, 6.2], // 2 Marcus (45.51, 7.0) leaves along -z, clear of the console top
			[46.01, 7.85], // 3 aisle
			[45.99, 9.5], // 4 aisle
			[47.51, 5.9], // 5 behind the chairs: spot [0] arrives along z
			[47.61, 8.6] // 6 behind the chairs: spots [2]-[4]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[2, 5],
			[1, 5],
			[5, 6]
		]
	},
```

- [ ] **Step 6: Visibility-check poses**

In `scripts/sim-hub-visibility-check.mjs`, replace the two `linaccontrol monitors …` poses with:

```js
		poses.push({
			name: 'linaccontrol monitors left',
			room: 'linaccontrol',
			pos: [lc.x + 1, 1.65, lc.z + 1.37],
			look: [lc.x - 6.55, 2.36, lc.z + 1.37]
		});
		poses.push({
			name: 'linaccontrol monitors right',
			room: 'linaccontrol',
			pos: [lc.x + 1, 1.65, lc.z - 1.24],
			look: [lc.x - 6.55, 1.8, lc.z - 1.24]
		});
```

- [ ] **Step 7: Scene check, NPC check, visibility check**

Rebuild, then run the scene check (exit 0) and the NPC check.

If k, l or m fails in LINAC control, adjust only that room's spots, nodes, the two therapists' offsets and the four journey finals above, staying on the same side of the desk as now. Re-run until a–m pass.

Then run `node scripts/sim-hub-visibility-check.mjs; echo "exit $?"`, which needs Playwright's Chromium and takes a few minutes. Expected exit 0.

- [ ] **Step 8: Tests, typecheck, shots, lint, commit**

```bash
cd apps/web && pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2
for s in linaccontrol-console linaccontrol-east linac-console; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after $s; done
pnpm exec prettier --write arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/journey.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-visibility-check.mjs scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/rooms.ts arcade-src/sim-hub/src/props.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/npc.ts arcade-src/sim-hub/src/journey.ts arcade-src/sim-hub/src/room-routes.ts scripts/sim-hub-visibility-check.mjs scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/arcade-src/sim-hub/src/props.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/npc.ts apps/web/arcade-src/sim-hub/src/journey.ts apps/web/arcade-src/sim-hub/src/room-routes.ts apps/web/scripts/sim-hub-visibility-check.mjs apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): LINAC control console against the west wall, screens regrouped, keyboards on the desk, clock and cabinet on the east wall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Read `linaccontrol-console.png`. It shows three columns on the desk against the wall: Vault Wide over Patient View (left), Cam A over Overhead (middle), Cam B over Vault Status (right). The feeds are black in the screenshot tool, but each label is readable.

---

### Task 10: Vaults: sinks, wall art, live status boards

**Files:**
- Create: `apps/web/arcade-src/sim-hub/src/vault-setup-loop.ts`
- Create: `apps/web/arcade-src/sim-hub/src/vault-setup-loop.spec.ts`
- Modify: `apps/web/arcade-src/sim-hub/src/equipment.ts`:
  - `buildPhase4WorkflowDisplays` (the `vault1State` board, plus a new `vault2State`);
  - a new `updateVault2Board`.
- Modify: `apps/web/arcade-src/sim-hub/src/main.ts` (import and call `updateVault2Board` in `stepSimulation` ≈688)
- Modify: `apps/web/arcade-src/sim-hub/src/rooms.ts` (furnish cases `vault1`, `vault2`)
- Modify: `apps/web/scripts/sim-hub-scene-check.mjs` (`PLACEMENTS`)

**Interfaces:**
- Produces:
  - `VAULT2_STEP_SEC: number` (25);
  - `VAULT2_SETUP_STEPS: SetupStep[]`, where `SetupStep = { state: string; color: string; rows: [string, string][] }`;
  - `vault2StepAt(sec: number): number`;
  - `updateVault2Board(sec)`, exported from `equipment.ts`.

- [ ] **Step 1: Failing unit test for the setup loop**

Create `vault-setup-loop.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VAULT2_SETUP_STEPS, VAULT2_STEP_SEC, vault2StepAt } from './vault-setup-loop';

describe('vault 2 setup loop', () => {
	it('steps through identity check, positioning, setup imaging and setup verified', () => {
		expect(VAULT2_SETUP_STEPS.map((s) => s.state)).toEqual([
			'IDENTITY CHECK',
			'POSITIONING',
			'SETUP IMAGING',
			'SETUP VERIFIED'
		]);
	});
	it('moves to the next step every VAULT2_STEP_SEC seconds and starts over', () => {
		expect(vault2StepAt(0)).toBe(0);
		expect(vault2StepAt(VAULT2_STEP_SEC - 0.01)).toBe(0);
		expect(vault2StepAt(VAULT2_STEP_SEC)).toBe(1);
		expect(vault2StepAt(VAULT2_STEP_SEC * 3.5)).toBe(3);
		expect(vault2StepAt(VAULT2_STEP_SEC * 4)).toBe(0);
	});
	it('never shows beam on: a therapist stays in the room', () => {
		for (const s of VAULT2_SETUP_STEPS) expect(JSON.stringify(s).toUpperCase()).not.toMatch(/BEAM/);
	});
});
```

Run `pnpm test -- vault-setup-loop`. Expected: FAIL (cannot find module `./vault-setup-loop`).

- [ ] **Step 2: The loop data**

Create `vault-setup-loop.ts`:

```ts
/* Vault 2's status board. Vault 2 has a patient on the couch and a therapist beside them but no
   journey, so its board steps through that patient's setup on a loop, on the sim clock. The therapist
   never leaves the room, so the loop never reaches beam on. Plain data, so its spec runs without the
   scene. */
export interface SetupStep {
	state: string;
	color: string;
	rows: [string, string][];
}

export const VAULT2_STEP_SEC = 25;

export const VAULT2_SETUP_STEPS: SetupStep[] = [
	{
		state: 'IDENTITY CHECK',
		color: '#42d5cf',
		rows: [
			['Patient', 'Name and date of birth · 2 identifiers'],
			['Couch', 'Preparing for setup'],
			['Imaging', 'Pending']
		]
	},
	{
		state: 'POSITIONING',
		color: '#42d5cf',
		rows: [
			['Patient', 'Identity verified'],
			['Couch', 'Indexed immobilization · aligning to marks'],
			['Imaging', 'Pending']
		]
	},
	{
		state: 'SETUP IMAGING',
		color: '#ffb454',
		rows: [
			['Patient', 'Positioned on the couch'],
			['Couch', 'Indexed'],
			['Imaging', 'Matching to the plan']
		]
	},
	{
		state: 'SETUP VERIFIED',
		color: '#65dda0',
		rows: [
			['Patient', 'Positioned · comfortable'],
			['Imaging', 'Matched to the plan'],
			['Therapist', 'In the room · final checks']
		]
	}
];

/** The setup step shown at sim time `sec` (seconds): each lasts VAULT2_STEP_SEC, then it starts over. */
export function vault2StepAt(sec: number): number {
	return Math.floor(Math.max(0, sec) / VAULT2_STEP_SEC) % VAULT2_SETUP_STEPS.length;
}
```

Run `pnpm test -- vault-setup-loop`. Expected: 3 passed.

- [ ] **Step 3: Add the failing placements**

```js
	// Task 10: vault sinks flush on their walls (vault 2's on the opposite, +z wall); the wall art off
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
	{ id: 'vault 1 wall art off the checklist', pick: { size: [1.29, 0.61, 0.05], at: [93.65, -26.6] } },
	{ id: 'vault 2 wall art off the checklist', pick: { size: [1.29, 0.61, 0.05], at: [93.65, 9.4] } },
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
	}
```

- [ ] **Step 4: Live boards**

In `equipment.ts` `buildPhase4WorkflowDisplays`, replace the `createWorkflowDisplay('vault1State', 90.78, 2.32, -8.2, -Math.PI / 2, 'VAULT 1 STATUS', 2.7, 1.5);` line with:

```ts
	// one live status board per vault, mirrored on the wall nearest the junction (vault 1's +z wall,
	// vault 2's -z wall: inner faces z -5.29 and 5.29), sized to the board texture (1100 x 620)
	createWorkflowDisplay('vault1State', 78.45, 2.18, -5.39, Math.PI, 'VAULT 1 STATUS', 3.5, 1.97);
	createWorkflowDisplay('vault2State', 78.45, 2.18, 5.39, 0, 'VAULT 2 STATUS', 3.5, 1.97);
```

Then add, below `updateWorkflowDisplay`, with `import { VAULT2_SETUP_STEPS, vault2StepAt } from './vault-setup-loop';` among the imports:

```ts
let vault2Step = -1;
/** Repaints vault 2's board when its setup loop moves on (stepSimulation, main.ts). */
export function updateVault2Board(sec) {
	const i = vault2StepAt(sec);
	if (i === vault2Step) return;
	vault2Step = i;
	const s = VAULT2_SETUP_STEPS[i];
	updateWorkflowDisplay('vault2State', s.state, s.rows, s.color);
}
```

In `main.ts`, add `updateVault2Board` to the `./equipment` import list. Call `updateVault2Board(sec);` on the line after `updateWorkflowTransitions(sec);` in `stepSimulation`.

- [ ] **Step 5: Vault furnishing**

In the **`vault1`** case:
- **Static screen:** delete the `framedWallMonitor(…, 'VAULT STATUS', 'Room observation', …)` call (the one at `room.x - 0.55, 2.18, room.z - room.d / 2 + 0.35`).
- **Sink:** change the `sinkStation` line to:

```ts
			// splash back flush on the -z wall's inner face (room.z - room.d / 2 + 0.29)
			sinkStation(g, room.x - room.w / 2 + 2.2, room.z - room.d / 2 + 0.69, 0);
```

- **Room sign:** change the `interiorRoomSign(g, room.x, 3.58, room.z - room.d / 2 + 0.34, 0, 'VAULT 1 · LINAC', …)` call to:

```ts
			// over the live status board on the +z wall (equipment.ts), as vault 2's over its board on the -z wall
			interiorRoomSign(
				g,
				room.x,
				3.75,
				room.z + room.d / 2 - 0.34,
				Math.PI,
				'VAULT 1 · LINAC',
				'External beam treatment vault'
			);
```

- **Wall art:** change the `wallArt` z argument from `room.z - 6.0` to `room.z - 8.6`, with a comment `// clear of the setup checklist screen (room.z - 6.89 .. room.z - 2.71)`.

In the **`vault2`** case:
- **Static screen:** delete its `framedWallMonitor(…, 'VAULT STATUS', …)` call. The live `vault2State` board takes its place.
- **Sink:**

```ts
			// on the +z wall, opposite the status board; splash back flush on its inner face
			// (room.z + room.d / 2 - 0.29)
			sinkStation(g, room.x - room.w / 2 + 2.2, room.z + room.d / 2 - 0.69, Math.PI);
```

- **Room sign:** change its `interiorRoomSign` y from `3.58` to `3.75`, so the board's frame (to y 3.255) does not hide it.
- **Wall art:** change its `wallArt` z from `room.z - 6.0` to `room.z - 8.6`, with the same comment.

- [ ] **Step 6: Scene check, NPC check, tests, typecheck**

Rebuild, then run the scene check (exit 0), the NPC check (a–m), `pnpm test` and `pnpm check`.

If the vault 2 sink (66.2, 30.31) breaks k or l, report the failing line. The sink is far from vault 2's maze routes.

- [ ] **Step 7: Shots, lint, commit**

```bash
cd apps/web && for s in vault1-sink vault2-sink vault1-checklist vault1-status vault2-status; do node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/scenery/after $s; done
pnpm exec prettier --write arcade-src/sim-hub/src/vault-setup-loop.ts arcade-src/sim-hub/src/vault-setup-loop.spec.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/main.ts arcade-src/sim-hub/src/rooms.ts scripts/sim-hub-scene-check.mjs && pnpm exec eslint arcade-src/sim-hub/src/vault-setup-loop.ts arcade-src/sim-hub/src/vault-setup-loop.spec.ts arcade-src/sim-hub/src/equipment.ts arcade-src/sim-hub/src/main.ts arcade-src/sim-hub/src/rooms.ts scripts/sim-hub-scene-check.mjs
cd ../.. && git add apps/web/arcade-src/sim-hub/src/vault-setup-loop.ts apps/web/arcade-src/sim-hub/src/vault-setup-loop.spec.ts apps/web/arcade-src/sim-hub/src/equipment.ts apps/web/arcade-src/sim-hub/src/main.ts apps/web/arcade-src/sim-hub/src/rooms.ts apps/web/scripts/sim-hub-scene-check.mjs
git commit -m "fix(sim-hub): vault sinks on their walls, art off the checklist, live mirrored status boards in both vaults

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Read the PNGs:
- each sink sits against its wall;
- the checklist screen is uncovered;
- `VAULT 1 STATUS` and `VAULT 2 STATUS` boards hang on the junction-side walls with the vault name sign above, and vault 2's shows `IDENTITY CHECK`.

---

### Task 11 (controller): final checks and as-built notes

- [ ] Rebuild, then run the full scene check, the NPC check, `pnpm test`, `pnpm check`, the visibility check and `node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html`. All must pass.
- [ ] Re-take all shots into `scenery/after/`.
- [ ] Fill the spec's "As-built notes" for Update 1: anything that differs from the spec, and the NPC data that moved.
- [ ] Final whole-branch review, then the PR. Build the owner's before/after page from `scenery/before` and `scenery/after`.
