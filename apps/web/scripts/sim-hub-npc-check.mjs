// sim-hub NPC movement check.
//
// Imports the built sim-hub bundle under stubbed browser globals (scripts/lib/browser-stubs.mjs)
// with `?npccheck`, which makes the page expose `window.__NPC` (src/npc-check-hook.ts), then drives
// `stepSimulation` on a simulated clock (performance.now is replaced by it, Math.random is seeded).
//
//   a  Walls     every mover loop (500 samples) keeps clear of every collider: people by 0.3 m (the
//                escort's chair and pusher both), vehicles by their oriented footprint plus 0.2 m
//   b  Spacing   20 simulated minutes at 30 Hz, with scripted journey moves: no mover within 0.5 m of
//                another mover, a cast actor or a journey/transition actor
//   c  One move  two queued moves for one journey actor never overlap and never jump
//   e  Yield     a mover holds for someone 0.9 m ahead (+/-50 deg), stands still, then walks on at pace
//   d  Hidden    after a 10 s hidden gap nobody moves further than one 0.05 s frame step
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-npc-check.mjs [--svg <file>] [--only a,b,c,d,e]
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
const only = new Set((argVal('--only') || 'a,b,c,d,e').split(',').map((x) => x.trim()));

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
// Journey actors are driven deterministically so that movers and journey actors meet over and over:
// each scripted actor, whenever it stands still, walks to the next room of its cycle (routes through
// the patient-services and clinical corridors, the treatment branch and the vaults). Pairs counted:
// mover-mover, mover-cast, mover-journey/transition. Journey-cast and journey-journey pairs are out
// of scope (story actors; stage 3).
const MOVE_PAUSE_S = 3;
const MAX_HOLD_S = 20;
function journeyScript() {
	NPC.resetTreatmentJourney(true);
	const J = NPC.JOURNEY;
	const plan = [
		[
			J.patient,
			[
				'consult',
				'lobby',
				'patientcare',
				'lobby',
				'ctsim',
				'lobby',
				'vault1',
				'lobby',
				'education',
				'lobby'
			]
		],
		[J.newPatient, ['education', 'lobby', 'social', 'lobby']],
		[J.therapist, ['vault1', 'linaccontrol']],
		[J.vaultTherapist, ['linaccontrol', 'vault1']]
	];
	return plan
		.filter(([actor]) => actor)
		.map(([actor, rooms]) => ({
			actor,
			rooms,
			i: 0,
			cur: NPC.journeyActorRoom(actor)?.id,
			idleSince: 0,
			moving: false
		}));
}
// Real handoffs (HANDOFFS in main.ts): the cast actor walks to its target room, then is walked home
// with an ordinary journey move, over and over.
// Routes that start or end inside the rooms of the resident runners (hdr, ctcontrol) are left out: they
// share the room's own door mouth, and routes inside rooms belong to stage 3.
const HANDOFF_PICKS = ['commons', 'qa', 'manager', 'physics', 'engineering', 'dosimetry', 'safety'];
function handoffScript() {
	return HANDOFF_PICKS.map((key) => {
		const h = NPC.HANDOFFS[key][0],
			actor = NPC.ROOM_CAST[key].filter((e) => e.kind === (h.actor || 'patient'))[h.actorIndex || 0]
				.g;
		return { key, h, actor, state: 'home', idleSince: 0 };
	});
}
function driveHandoffs(hs, tSec) {
	for (const x of hs) {
		const running = NPC.handoffTransitions.some((t) => t.actor === x.actor);
		if (x.state === 'out' && !running) {
			x.state = 'back';
			NPC.moveJourneyActor(x.actor, x.h.target, x.key, roomFinal(x.key), () => {
				x.state = 'home';
				x.idleSince = tSec;
			});
		} else if (x.state === 'home' && tSec - x.idleSince >= MOVE_PAUSE_S) {
			x.state = 'out';
			NPC.startActorHandoff(x.key, x.h);
		}
	}
}
function driveJourney(script, tSec) {
	for (const sc of script) {
		if (sc.moving || tSec - sc.idleSince < MOVE_PAUSE_S || !sc.cur) continue;
		let to = sc.rooms[sc.i++ % sc.rooms.length];
		if (to === sc.cur) to = sc.rooms[sc.i++ % sc.rooms.length];
		sc.moving = true;
		const from = sc.cur;
		NPC.moveJourneyActor(sc.actor, from, to, roomFinal(to), () => {
			sc.moving = false;
			sc.cur = to;
			sc.idleSince = tSec;
		});
	}
}
// For a detail line: where the other NPC stands relative to the mover's heading, and whether the
// mover is holding.
function describeApproach(a, b) {
	const mv = a.m ? a : b.m ? b : null;
	if (!mv) return '';
	const o = mv === a ? b : a,
		yaw = mv.m.group.rotation.y - (mv.m.yawOffset || 0),
		bearing = ((((Math.atan2(o.x - mv.x, o.z - mv.z) - yaw) * 180) / Math.PI + 540) % 360) - 180;
	return `[${mv.id} ${mv.m.holding ? 'holding' : 'moving'}, other at ${bearing.toFixed(0)} deg]`;
}
function checkSpacing() {
	const tmpV = new NPC.movers[0].group.position.constructor();
	const active = new Set();
	const script = journeyScript(),
		hand = handoffScript();
	const holdMax = NPC.movers.map(() => 0);
	let total = 0;
	for (let s = 0; s < SPACING_STEPS; s++) {
		const tSec = (s * STEP_MS) / 1000;
		driveJourney(script, tSec);
		driveHandoffs(hand, tSec);
		step();
		NPC.movers.forEach((m, i) => {
			holdMax[i] = Math.max(holdMax[i], m.heldFor);
		});
		const pts = NPC.movers.map((m, i) => ({
			id: names[i],
			x: m.group.position.x,
			z: m.group.position.z,
			kind: 'mover',
			m
		}));
		const journeyObjs = new Map();
		for (const t of NPC.workflowTransitions) journeyObjs.set(t.actor, 'transition');
		for (const t of NPC.handoffTransitions) journeyObjs.set(t.actor, 'transition');
		for (const o of NPC.journeyActors()) if (!journeyObjs.has(o)) journeyObjs.set(o, 'journey');
		const wp = { x: 0, z: 0 };
		for (const [o, kind] of journeyObjs) {
			if (!NPC.visibleInTree(o)) continue;
			o.getWorldPosition(tmpV);
			wp.x = tmpV.x;
			wp.z = tmpV.z;
			pts.push({
				id: `${kind}:${o.userData?.npcRole || o.name || 'actor'}`,
				x: wp.x,
				z: wp.z,
				kind,
				o
			});
		}
		for (const c of NPC.castActors()) if (!journeyObjs.has(c.g)) pts.push({ ...c, kind: 'cast' });
		const now = new Set();
		for (let i = 0; i < pts.length; i++) {
			for (let j = i + 1; j < pts.length; j++) {
				const a = pts[i],
					b = pts[j];
				if (a.kind !== 'mover' && b.kind !== 'mover') continue;
				if (Math.hypot(a.x - b.x, a.z - b.z) < MIN_DIST) {
					const key = `${a.id}|${b.id}`;
					now.add(key);
					if (!active.has(key)) {
						total++;
						spacingEvents.push({
							pair: `${a.id} / ${b.id}`,
							how: describeApproach(a, b),
							kinds: [a.kind, b.kind].sort().join('-'),
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
	const byKind = {};
	for (const e of spacingEvents) byKind[e.kinds] = (byKind[e.kinds] || 0) + 1;
	const kindList = Object.entries(byKind)
		.map(([k, v]) => `${k}: ${v}`)
		.join(', ');
	const minutes = (SPACING_STEPS * STEP_MS) / 60000;
	const worstHold = Math.max(...holdMax),
		released = NPC.movers.filter((m) => m.releases > 0).map((m) => m.id);
	const holdProblems = [];
	if (worstHold > MAX_HOLD_S)
		holdProblems.push(`a mover waited ${worstHold.toFixed(1)} s in a row (limit ${MAX_HOLD_S} s)`);
	if (released.length)
		holdProblems.push(`the runtime hold release fired for ${released.join(', ')}`);
	const base = total
		? `${total} spacing events (< ${MIN_DIST} m) in ${minutes} simulated minutes (${kindList})`
		: `no pair closer than ${MIN_DIST} m in ${minutes} simulated minutes (mover-mover, mover-cast, mover-journey)`;
	return {
		pass: total === 0 && holdProblems.length === 0,
		summary: [base, ...holdProblems].join('; '),
		detail: [
			...holdProblems,
			...spacingEvents
				.slice(0, MAX_DETAIL)
				.map(
					(e) =>
						`${e.kinds} ${e.pair} at t=${e.t.toFixed(1)}s near (${e.x.toFixed(2)}, ${e.z.toFixed(2)}) d=${e.d.toFixed(2)} ${e.how}`
				)
		],
		info: [
			`journey moves issued: ${script.reduce((n, sc) => n + sc.i, 0)}; handoff routes: ${hand.map((x) => `${x.key}>${x.h.target}`).join(', ')}`,
			`longest hold per mover (s): ${names.map((n, i) => `${n} ${holdMax[i].toFixed(1)}`).join(', ')}; releases: ${released.length}`
		]
	};
}

// ----------------------------------------------------------------- (e) yield
// A static obstacle (the journey patient, which every mover must yield to) is put at a chosen
// distance and bearing from a mover each step. techCart is index 2, so it has movers of lower and
// higher priority around it.
function checkYield() {
	NPC.resetTreatmentJourney(true);
	const mi = names.indexOf('techCart'),
		m = NPC.movers[mi],
		obstacle = NPC.JOURNEY.patient,
		dtStep = STEP_MS / 1000,
		far = () => obstacle.position.set(900, 0, 900),
		problems = [];
	const heading = () => {
		const p = m.curve.getPointAt(m.u),
			n = m.curve.getPointAt((m.u + 0.01) % 1),
			l = Math.hypot(n.x - p.x, n.z - p.z);
		return { p, fx: (n.x - p.x) / l, fz: (n.z - p.z) / l };
	};
	const place = (dist, deg) => {
		const { p, fx, fz } = heading(),
			a = (deg * Math.PI) / 180,
			c = Math.cos(a),
			sn = Math.sin(a);
		obstacle.position.set(p.x + dist * (fx * c - fz * sn), 0, p.z + dist * (fx * sn + fz * c));
	};
	const arms = () => {
		let v = 0;
		m.group.traverse((o) => {
			const r = o.userData?.walkRig;
			if (r) v = Math.max(v, Math.abs(r.armLP.rotation.x), Math.abs(r.legLP.rotation.x));
		});
		return v;
	};
	const run = (dist, deg, n) => {
		for (let i = 0; i < n; i++) {
			place(dist, deg);
			step();
		}
	};
	const moves = (dist, deg) => {
		const u0 = m.u;
		run(dist, deg, 5);
		return m.u !== u0 && !m.holding;
	};
	far();
	stepFor(1);
	// (i) 0.7 m ahead: holds, u frozen for 1 s, limbs at rest
	let u0 = m.u;
	run(0.7, 0, 30);
	if (!m.holding) problems.push('(i) not holding with an obstacle 0.7 m ahead');
	if (m.u !== u0) problems.push(`(i) u moved ${m.u - u0} while holding`);
	if (arms() !== 0) problems.push(`(i) limbs not at rest while holding (${arms().toFixed(3)} rad)`);
	// (ii) removed: exact pace
	far();
	step();
	for (let i = 0; i < 30; i++) {
		u0 = m.u;
		step();
		const du = (((m.u - u0) % 1) + 1) % 1;
		if (m.holding || Math.abs(du - m.speed * dtStep) > 1e-9) {
			problems.push(`(ii) step ${i}: du=${du} expected ${m.speed * dtStep}, holding=${m.holding}`);
			break;
		}
	}
	// (iii) behind, (iv) 1.2 m ahead, (v) 0.7 m ahead at 70 deg
	if (!moves(0.7, 180)) problems.push('(iii) held for an obstacle 0.7 m behind');
	if (!moves(1.2, 0)) problems.push('(iv) held for an obstacle 1.2 m ahead');
	if (!moves(0.7, 70)) problems.push('(v) held for an obstacle 0.7 m ahead at 70 deg');
	if (moves(0.7, 40)) problems.push('(v) did not hold for an obstacle 0.7 m ahead at 40 deg');
	far();
	step();
	// (vi) priority between movers, asked of shouldHold directly
	const { p, fx, fz } = heading(),
		lo = NPC.movers[mi - 1],
		hi = NPC.movers[mi + 1],
		saved = [lo, hi].map((o) => [o.group.position.x, o.group.position.z]),
		put = (o) => o.group.position.set(p.x + 0.7 * fx, 0, p.z + 0.7 * fz),
		away = (o) => o.group.position.set(900, 0, 900);
	away(lo);
	away(hi);
	put(hi);
	const holdsForHigher = NPC.shouldHold(m, [], p.x, p.z, fx, fz);
	away(hi);
	put(lo);
	const holdsForLower = NPC.shouldHold(m, [], p.x, p.z, fx, fz);
	[lo, hi].forEach((o, i) => o.group.position.set(saved[i][0], 0, saved[i][1]));
	if (holdsForHigher) problems.push('(vi) held for a higher-index mover');
	if (!holdsForLower) problems.push('(vi) did not hold for a lower-index mover');
	return {
		pass: problems.length === 0,
		summary: problems.length
			? `${problems.length} yield rule violations`
			: 'holds for 0.7 m ahead (frozen, limbs at rest), walks on at exact pace, ignores behind, 1.2 m and 70 deg, yields only to lower-index movers',
		detail: problems
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
	NPC.handoffTransitions.length = 0; // the reset leaves handoffs alone
	const actor = NPC.JOURNEY.patient;
	if (!actor) throw new Error('no journey patient');
	const from = NPC.journeyActorRoom(actor)?.id;
	if (!from) throw new Error('journey patient is not in a room');
	const fired = [];
	let arrival = null; // where the actor stood when the first onComplete ran
	NPC.moveJourneyActor(actor, from, 'consult', roomFinal('consult'), () => {
		fired.push(1);
		arrival = { x: actor.position.x, z: actor.position.z };
	});
	stepFor(0.5);
	NPC.moveJourneyActor(actor, 'consult', 'education', roomFinal('education'), () => fired.push(2));
	const problems = [];
	let maxRef = 0,
		maxJump = 0,
		prev = { x: actor.position.x, z: actor.position.z },
		firstOverlap = null,
		firstJump = null,
		secondStart = null;
	for (let i = 0; i < 30 * 120 && refsActor(actor) > 0; i++) {
		step();
		const r = refsActor(actor);
		if (arrival && secondStart === null) {
			const t2 = NPC.workflowTransitions.find((t) => t.actor === actor);
			if (t2) {
				const p0 = t2.curve.getPoint(0);
				secondStart = Math.hypot(p0.x - arrival.x, p0.z - arrival.z);
			}
		}
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
	if (secondStart === null || secondStart > 0.05)
		problems.push(
			`second move start: ${secondStart === null ? 'never started' : `${secondStart.toFixed(2)} m from where the first arrived`}`
		);
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
	NPC.handoffTransitions.length = 0;
	const actor = NPC.JOURNEY.patient,
		from = NPC.journeyActorRoom(actor).id,
		to = from === 'vault1' ? 'consult' : 'vault1';
	NPC.moveJourneyActor(actor, from, to, roomFinal(to), null);
	const t = NPC.workflowTransitions.find((x) => x.actor === actor),
		tSpeed = (1.5 * t.curve.getLength()) / t.duration;
	const jump = hiddenGap(actor);
	rows.push({ id: 'transition', worst: jump, least: jump, phase: 0, allow: allowance(tSpeed) });
	NPC.resetTreatmentJourney(true);
	// Movers loop out and back, so one start phase can give a small net displacement by
	// coincidence. Test PHASES start phases spread evenly over each mover's loop (m.u is its own
	// progress); the 2 s of normal frames after it settle the frame clock before the snapshot.
	NPC.movers.forEach((m, i) => {
		const allow = allowance(m.curve.getLength() * m.speed);
		let least = Infinity,
			worst = -1,
			worstPhase = 0;
		for (let k = 0; k < PHASES; k++) {
			m.u = k / PHASES;
			m.pendingDt = 0;
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
const CHECKS = { a: checkWalls, b: checkSpacing, c: checkOneMove, d: checkHidden, e: checkYield };
let failed = 0;
for (const letter of ['a', 'b', 'c', 'd', 'e']) {
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
	for (const line of r.info || []) console.log(`  info: ${line}`);
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
