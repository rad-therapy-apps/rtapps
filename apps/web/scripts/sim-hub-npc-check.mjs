// sim-hub NPC movement check.
//
// Imports the built sim-hub bundle under stubbed browser globals (scripts/lib/browser-stubs.mjs)
// with `?npccheck`, which makes the page expose `window.__NPC` (src/npc-check-hook.ts), then drives
// `stepSimulation` on a simulated clock (performance.now is replaced by it, Math.random is seeded).
//
//   a  Walls     every mover loop (500 samples) keeps clear of every collider: people by 0.3 m (the
//                escort's chair and pusher both), vehicles by their oriented footprint plus 0.2 m
//   b  Spacing   20 simulated minutes at 30 Hz: no mover within 0.5 m of another mover or cast actor
//   c  One move  two queued moves for one journey actor never overlap and never jump
//   d  Hidden    after a 10 s hidden gap nobody moves further than one 0.05 s frame step
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-npc-check.mjs [--svg <file>] [--only a,b,c,d]
// Exit codes: 0 every selected check passes; 1 any fails; 2 setup error.
// Output: `NPC CHECK <letter> PASS|FAIL: <summary>` per check, then at most 30 detail lines per failing check.
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
const svgPath = argVal('--svg');
const only = new Set((argVal('--only') || 'a,b,c,d').split(',').map((x) => x.trim()));

const BODY_R = 0.3;
const VEHICLES = new Set(['car', 'shuttle']);
const VEHICLE_MARGIN = 0.2;
const SAMPLES = 500;
const MIN_DIST = 0.5;
const STEP_MS = 1000 / 30;
const SPACING_STEPS = 36000;
const MAX_DETAIL = 30;

function setupError(msg) {
	console.error(`NPC CHECK setup error: ${msg}`);
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

// Simulated clock: transitions stamp `start` with performance.now(), the frame body gets `now`.
let simNow = 1000;
Object.defineProperty(globalThis.performance, 'now', { value: () => simNow, configurable: true });
Math.random = mulberry32(1);
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
const step = () => {
	simNow += STEP_MS;
	NPC.stepSimulation(simNow);
};
const stepFor = (seconds) => {
	const n = Math.round((seconds * 1000) / STEP_MS);
	for (let i = 0; i < n; i++) step();
};

function moverName(m, i) {
	if (m.id) return m.id;
	if (m.group.name) return m.group.name;
	let found = '';
	m.group.traverse((o) => {
		if (!found && o.isMesh && o.name) found = o.name;
	});
	return found || `mover${i}`;
}
const names = NPC.movers.map(moverName);
for (const v of VEHICLES) if (!names.includes(v)) setupError(`vehicle mover '${v}' not found`);

const wallHits = [];
const spacingEvents = [];

// ---------------------------------------------------------------- (a) walls
// A vehicle's footprint in its own frame: the union of its meshes' bounding boxes (vehicleObject in
// props.ts), grown by VEHICLE_MARGIN on every side.
function vehicleFootprint(group) {
	group.updateMatrixWorld(true);
	const toGroup = group.matrixWorld.clone().invert();
	let x0 = Infinity,
		x1 = -Infinity,
		z0 = Infinity,
		z1 = -Infinity;
	group.traverse((o) => {
		if (!o.isMesh) return;
		if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
		const b = o.geometry.boundingBox.clone().applyMatrix4(toGroup.clone().multiply(o.matrixWorld));
		x0 = Math.min(x0, b.min.x);
		x1 = Math.max(x1, b.max.x);
		z0 = Math.min(z0, b.min.z);
		z1 = Math.max(z1, b.max.z);
	});
	return {
		cx: (x0 + x1) / 2,
		cz: (z0 + z1) / 2,
		ex: (x1 - x0) / 2 + VEHICLE_MARGIN,
		ez: (z1 - z0) / 2 + VEHICLE_MARGIN
	};
}
// Separating-axis test: the footprint at p, turned by rotY (the group's rotation.y), against the
// axis-aligned collider c.
function footprintHits(f, p, rotY, c) {
	const ux = Math.cos(rotY),
		uz = -Math.sin(rotY), // local x in world
		vx = Math.sin(rotY),
		vz = Math.cos(rotY), // local z in world
		dx = p.x + f.cx * ux + f.cz * vx - c.x,
		dz = p.z + f.cx * uz + f.cz * vz - c.z;
	return (
		Math.abs(dx) < c.hw + f.ex * Math.abs(ux) + f.ez * Math.abs(vx) &&
		Math.abs(dz) < c.hd + f.ex * Math.abs(uz) + f.ez * Math.abs(vz) &&
		Math.abs(dx * ux + dz * uz) < f.ex + c.hw * Math.abs(ux) + c.hd * Math.abs(uz) &&
		Math.abs(dx * vx + dz * vz) < f.ez + c.hw * Math.abs(vx) + c.hd * Math.abs(vz)
	);
}
function checkWalls() {
	const perMover = new Map();
	NPC.movers.forEach((m, mi) => {
		const name = names[mi],
			foot = VEHICLES.has(name) ? vehicleFootprint(m.group) : null;
		for (let i = 0; i < SAMPLES; i++) {
			const u = i / SAMPLES,
				p = m.curve.getPointAt(u),
				n = m.curve.getPointAt((u + 0.01) % 1),
				yaw = Math.atan2(n.x - p.x, n.z - p.z);
			if (foot) {
				// updateMovers turns the group to yaw + yawOffset
				const c = NPC.colliders.find((k) => footprintHits(foot, p, yaw + (m.yawOffset || 0), k));
				if (c) {
					wallHits.push({ name, x: p.x, z: p.z, what: 'vehicle', c });
					perMover.set(name, (perMover.get(name) || 0) + 1);
				}
				continue;
			}
			const pts = [{ x: p.x, z: p.z, what: 'body' }];
			if (name === 'escort') {
				pts.push({
					x: p.x + Math.sin(yaw) * -0.82,
					z: p.z + Math.cos(yaw) * -0.82,
					what: 'pusher'
				});
			}
			for (const q of pts) {
				for (const c of NPC.colliders) {
					if (Math.abs(q.x - c.x) < c.hw + BODY_R && Math.abs(q.z - c.z) < c.hd + BODY_R) {
						wallHits.push({ name, x: q.x, z: q.z, what: q.what, c });
						perMover.set(name, (perMover.get(name) || 0) + 1);
						break;
					}
				}
			}
		}
	});
	const list = [...perMover].map(([k, v]) => `${k}(${v})`).join(', ');
	const detail = wallHits
		.filter((h, i, a) => a.findIndex((o) => o.name === h.name) === i)
		.slice(0, MAX_DETAIL)
		.map(
			(h) =>
				`${h.name} ${h.what} at (${h.x.toFixed(2)}, ${h.z.toFixed(2)}) inside collider (${h.c.x.toFixed(2)}, ${h.c.z.toFixed(2)}) hw=${h.c.hw.toFixed(2)} hd=${h.c.hd.toFixed(2)}`
		);
	return {
		pass: wallHits.length === 0,
		summary: wallHits.length
			? `${wallHits.length} wall-clipping samples across ${perMover.size} of ${NPC.movers.length} movers: ${list}`
			: `0 wall-clipping samples across ${NPC.movers.length} movers`,
		detail
	};
}

// -------------------------------------------------------------- (b) spacing
function checkSpacing() {
	const active = new Set();
	let total = 0;
	for (let s = 0; s < SPACING_STEPS; s++) {
		step();
		const pts = NPC.movers.map((m, i) => ({
			id: names[i],
			x: m.group.position.x,
			z: m.group.position.z,
			mover: true
		}));
		for (const c of NPC.castActors()) pts.push({ ...c, mover: false });
		const now = new Set();
		for (let i = 0; i < pts.length; i++) {
			for (let j = i + 1; j < pts.length; j++) {
				const a = pts[i],
					b = pts[j];
				if (!a.mover && !b.mover) continue;
				if (Math.hypot(a.x - b.x, a.z - b.z) < MIN_DIST) {
					const key = `${a.id}|${b.id}`;
					now.add(key);
					if (!active.has(key)) {
						total++;
						spacingEvents.push({
							pair: `${a.id} / ${b.id}`,
							t: (s * STEP_MS) / 1000,
							x: (a.x + b.x) / 2,
							z: (a.z + b.z) / 2,
							d: Math.hypot(a.x - b.x, a.z - b.z)
						});
					}
				}
			}
		}
		active.clear();
		for (const k of now) active.add(k);
	}
	return {
		pass: total === 0,
		summary: total
			? `${total} spacing events (< ${MIN_DIST} m) in ${(SPACING_STEPS * STEP_MS) / 60000} simulated minutes`
			: `no pair closer than ${MIN_DIST} m in ${(SPACING_STEPS * STEP_MS) / 60000} simulated minutes`,
		detail: spacingEvents
			.slice(0, MAX_DETAIL)
			.map(
				(e) =>
					`${e.pair} at t=${e.t.toFixed(1)}s near (${e.x.toFixed(2)}, ${e.z.toFixed(2)}) d=${e.d.toFixed(2)}`
			)
	};
}

// -------------------------------------------------------- (c) one move each
function roomFinal(id) {
	const r = NPC.ROOMS.find((x) => x.id === id);
	return { x: r.x, y: 0, z: r.z };
}
function refsActor(actor) {
	let n = 0;
	for (const t of NPC.workflowTransitions) if (t.actor === actor) n++;
	for (const t of NPC.handoffTransitions) if (t.actor === actor) n++;
	return n;
}
function checkOneMove() {
	// Known start state: resetTreatmentJourney() clears the workflow transitions and puts the journey
	// patient back in the lobby; its room is then read from its position.
	NPC.resetTreatmentJourney(true);
	const actor = NPC.JOURNEY.patient;
	if (!actor) throw new Error('no journey patient');
	const from = NPC.journeyActorRoom(actor)?.id;
	if (!from) throw new Error('journey patient is not in a room');
	const fired = [];
	NPC.moveJourneyActor(actor, from, 'consult', roomFinal('consult'), () => fired.push(1));
	stepFor(0.5);
	NPC.moveJourneyActor(actor, 'consult', 'education', roomFinal('education'), () => fired.push(2));
	const problems = [];
	let maxRef = 0,
		maxJump = 0,
		prev = { x: actor.position.x, z: actor.position.z },
		firstOverlap = null,
		firstJump = null;
	for (let i = 0; i < 30 * 120 && refsActor(actor) > 0; i++) {
		step();
		const r = refsActor(actor);
		if (r > maxRef) maxRef = r;
		if (r > 1 && !firstOverlap) firstOverlap = `step ${i}: ${r} transitions reference the actor`;
		const j = Math.hypot(actor.position.x - prev.x, actor.position.z - prev.z);
		if (j > maxJump) maxJump = j;
		if (j > 0.25 && !firstJump)
			firstJump = `step ${i}: actor moved ${j.toFixed(2)} m in one step to (${actor.position.x.toFixed(2)}, ${actor.position.z.toFixed(2)})`;
		prev = { x: actor.position.x, z: actor.position.z };
	}
	if (firstOverlap)
		problems.push(`overlap: max ${maxRef} concurrent transitions; first ${firstOverlap}`);
	if (firstJump) problems.push(`jump: max ${maxJump.toFixed(2)} m in one step; first ${firstJump}`);
	const order = fired.join(',');
	if (order !== '1,2') problems.push(`onComplete order/count: got [${order}], expected [1,2]`);
	return {
		pass: problems.length === 0,
		summary: problems.length
			? problems.map((p) => p.split(';')[0]).join('; ')
			: `no overlap, max step ${maxJump.toFixed(3)} m, onComplete [1,2]`,
		detail: problems
	};
}

// -------------------------------------------------------- (d) hidden tab gap
const PHASES = 5;
const GAP_S = 10;
// Allowed displacement over the gap: one 0.05 s frame step (the clamp on dt) at the walker's speed
// plus 0.05 m. Movers: curve length x loops-per-second = m/s. Transition actors ride a smoothstep
// ease, whose peak speed is 1.5x its average (d/du of 3u^2 - 2u^3 is 1.5 at u = 0.5), so their
// speed is 1.5 x length / duration; that is the true maximum, not a loosened bound.
const allowance = (speed) => speed * 0.05 + 0.05;
const xzDist = (obj, x, z) => Math.hypot(obj.position.x - x, obj.position.z - z);

// Runs one hidden gap and returns how far `obj` moved by the first visible frame afterwards.
function hiddenGap(obj) {
	stepFor(2);
	const x = obj.position.x,
		z = obj.position.z;
	NPC.setHidden(true);
	stepFor(GAP_S); // stepSimulation returns at once; only the clock advances
	NPC.setHidden(false);
	step();
	NPC.setHidden(null);
	return xzDist(obj, x, z);
}
function checkHidden() {
	const rows = [];
	// Transition actor: from a known state, in whatever room it stands in.
	NPC.resetTreatmentJourney(true);
	const actor = NPC.JOURNEY.patient,
		from = NPC.journeyActorRoom(actor).id,
		to = from === 'vault1' ? 'consult' : 'vault1';
	NPC.moveJourneyActor(actor, from, to, roomFinal(to), null);
	const t = NPC.workflowTransitions.find((x) => x.actor === actor),
		tSpeed = (1.5 * t.curve.getLength()) / t.duration;
	const jump = hiddenGap(actor);
	rows.push({ id: 'transition', worst: jump, least: jump, phase: 0, allow: allowance(tSpeed) });
	NPC.resetTreatmentJourney(true);
	// Movers are pure functions of simulated time and loop out and back, so one start phase can
	// give a small net displacement by coincidence. Test PHASES start phases spread evenly over
	// each mover's loop period (1 / speed seconds). Jumping the clock to the phase start is exact
	// for movers; the 2 s of normal frames after it settle the frame clock before the snapshot.
	NPC.movers.forEach((m, i) => {
		const allow = allowance(m.curve.getLength() * m.speed);
		let least = Infinity,
			worst = -1,
			worstPhase = 0;
		for (let k = 0; k < PHASES; k++) {
			const cur = ((((simNow / 1000) * m.speed + m.offset) % 1) + 1) % 1,
				want = k / PHASES,
				dPhase = (want - cur + 1) % 1;
			simNow += (dPhase / m.speed) * 1000;
			const d = hiddenGap(m.group);
			least = Math.min(least, d);
			if (d > worst) {
				worst = d;
				worstPhase = k;
			}
		}
		rows.push({ id: names[i], worst, least, phase: worstPhase, allow });
	});
	const bad = rows.filter((r) => r.worst > r.allow);
	return {
		pass: bad.length === 0,
		summary: bad.length
			? `${bad.length} of ${rows.length} walkers jumped after a ${GAP_S} s hidden gap (${PHASES} start phases each; worst ${Math.max(...bad.map((b) => b.worst)).toFixed(2)} m)`
			: `all ${rows.length} walkers stayed within one frame step after a ${GAP_S} s hidden gap at ${PHASES} phases`,
		detail: rows.map(
			(r) =>
				`${r.worst > r.allow ? 'JUMP' : 'ok  '} ${r.id}: worst ${r.worst.toFixed(2)} m, best ${r.least.toFixed(2)} m (phase ${r.phase}/${PHASES}), allowed ${r.allow.toFixed(2)} m`
		)
	};
}

// ------------------------------------------------------------------ driver
const CHECKS = { a: checkWalls, b: checkSpacing, c: checkOneMove, d: checkHidden };
let failed = 0;
for (const letter of ['a', 'b', 'c', 'd']) {
	if (!only.has(letter)) continue;
	let r;
	try {
		r = CHECKS[letter]();
	} catch (err) {
		setupError(`check ${letter} threw: ${err && err.stack ? err.stack : err}`);
	}
	console.log(`NPC CHECK ${letter} ${r.pass ? 'PASS' : 'FAIL'}: ${r.summary}`);
	if (!r.pass) {
		failed++;
		for (const line of r.detail.slice(0, MAX_DETAIL)) console.log(`  ${line}`);
	}
}

if (svgPath) {
	// Top-down plan: x right, z down (one unit = one metre).
	const palette = [
		'#1f77b4',
		'#2ca02c',
		'#9467bd',
		'#8c564b',
		'#e377c2',
		'#17becf',
		'#bcbd22',
		'#d62728',
		'#7f7f7f',
		'#ff7f0e'
	];
	let minX = Infinity,
		maxX = -Infinity,
		minZ = Infinity,
		maxZ = -Infinity;
	const grow = (x, z) => {
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minZ = Math.min(minZ, z);
		maxZ = Math.max(maxZ, z);
	};
	for (const c of NPC.colliders) {
		grow(c.x - c.hw, c.z - c.hd);
		grow(c.x + c.hw, c.z + c.hd);
	}
	const loops = NPC.movers.map((m, mi) => {
		const pts = [];
		for (let i = 0; i <= SAMPLES; i++) {
			const p = m.curve.getPointAt((i % SAMPLES) / SAMPLES);
			pts.push([p.x, p.z]);
			grow(p.x, p.z);
		}
		return { name: names[mi], pts, color: palette[mi % palette.length] };
	});
	const pad = 2,
		W = maxX - minX + 2 * pad,
		H = maxZ - minZ + 2 * pad;
	const f = (n) => n.toFixed(2);
	const out = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(minX - pad)} ${f(minZ - pad)} ${f(W)} ${f(H)}" width="${Math.round(W * 12)}" height="${Math.round(H * 12)}">`,
		`<rect x="${f(minX - pad)}" y="${f(minZ - pad)}" width="${f(W)}" height="${f(H)}" fill="#fff"/>`
	];
	for (const c of NPC.colliders)
		out.push(
			`<rect x="${f(c.x - c.hw)}" y="${f(c.z - c.hd)}" width="${f(2 * c.hw)}" height="${f(2 * c.hd)}" fill="#bbb" stroke="#888" stroke-width="0.03"/>`
		);
	for (const l of loops) {
		out.push(
			`<polyline points="${l.pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="none" stroke="${l.color}" stroke-width="0.12"/>`,
			`<text x="${f(l.pts[0][0])}" y="${f(l.pts[0][1] - 0.3)}" font-size="1.1" fill="${l.color}" font-family="sans-serif">${l.name}</text>`
		);
	}
	for (const h of wallHits)
		out.push(`<circle cx="${f(h.x)}" cy="${f(h.z)}" r="0.22" fill="#e00"/>`);
	for (const e of spacingEvents)
		out.push(`<circle cx="${f(e.x)}" cy="${f(e.z)}" r="0.22" fill="#f90"/>`);
	out.push('</svg>');
	fs.mkdirSync(path.dirname(path.resolve(svgPath)), { recursive: true });
	fs.writeFileSync(svgPath, out.join('\n'));
	console.log(`SVG written: ${svgPath}`);
}

process.exit(failed ? 1 : 0);
