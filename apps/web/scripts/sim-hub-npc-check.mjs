// sim-hub NPC movement check.
//
// Imports the built sim-hub bundle under stubbed browser globals (scripts/lib/browser-stubs.mjs)
// with `?npccheck`, which makes the page expose `window.__NPC` (src/npc-check-hook.ts), then drives
// `stepSimulation` on a simulated clock (performance.now is replaced by it, Math.random is seeded).
//
//   a  Walls     every mover loop (500 samples) keeps clear of every collider: people by 0.3 m (the
//                escort's chair and pusher both), vehicles by their oriented footprint plus 0.2 m,
//                the tech cart by its oriented footprint plus 0.1 m
//   b  Spacing   20 simulated minutes at 30 Hz, with scripted journey moves: no mover within 0.5 m of
//                another mover, a cast actor or a journey/transition actor
//   c  One move  two queued moves for one journey actor never overlap and never jump
//   e  Yield     a mover holds for someone 0.9 m ahead (+/-50 deg), stands still, then walks on at pace;
//                one that never moves is outwaited: released after 8 s, then walking at pace
//   d  Hidden    after a 10 s hidden gap nobody moves further than one 0.05 s frame step
//   f  Feet      every standing or walking person's sole is within 0.03 m of the floor beneath
//                (12 moments over one leg-swing cycle after the journey reset, then t = 30 s and 90 s,
//                then 8 moments over each of the ambulance crew's walks, unload and load)
//   g  Seated    every sitter has a seat anchor (props.ts SEATS) within 0.3 m whose top is within
//                0.02 m of its pelvis (hip pivot - 0.06) and whose facing is within 20 deg of its own;
//                seat facing: no seat (wheelchairs aside) faces a wall within 3.0 m;
//                exchange facing: a seated patient's exchange partner is within 60 deg of its seat's facing
//   h  Lying     every lying patient's lowest point is within 0.02 m of the couch or table top beneath
//   i  Wheelchair  the wheelchair occupant is posed seated, pelvis within 0.02 m of that chair's
//                own seat anchor top
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-npc-check.mjs [--svg <file>] [--only a,b,c,d,e,f,g,h,i]
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
const only = new Set((argVal('--only') || 'a,b,c,d,e,f,g,h,i').split(',').map((x) => x.trim()));
for (const x of only) {
	if (!'abcdefghi'.includes(x) || x.length !== 1) {
		console.error(`NPC CHECK error: unknown check '${x}' in --only (use a,b,c,d,e,f,g,h,i)`);
		process.exit(2);
	}
}

const BODY_R = 0.3;
const VEHICLES = new Set(['car', 'shuttle']);
const VEHICLE_MARGIN = 0.2;
// Movers checked by their real mesh footprint rather than a body circle. Vehicles get a 0.2 m
// margin; the tech cart (a person pushing a cart down a 3 m wide spine lane) gets 0.1 m.
const FOOTPRINT_MARGIN = { car: VEHICLE_MARGIN, shuttle: VEHICLE_MARGIN, techCart: 0.1 };
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

// Simulated clock. Journey and handoff transitions run on the sim clock (S.simSec, advanced by
// stepSimulation), not on performance.now. performance.now is still replaced so that the code that
// still reads the wall clock (the game's own timers, travel and room timing) sees simulated time too.
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
// A footprint in the mover's own frame: the union of its meshes' bounding boxes (vehicleObject in
// props.ts for the vehicles), grown by `margin` on every side.
function vehicleFootprint(group, margin) {
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
		ex: (x1 - x0) / 2 + margin,
		ez: (z1 - z0) / 2 + margin
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
			foot = name in FOOTPRINT_MARGIN ? vehicleFootprint(m.group, FOOTPRINT_MARGIN[name]) : null;
		for (let i = 0; i < SAMPLES; i++) {
			const u = i / SAMPLES,
				p = m.curve.getPointAt(u),
				n = m.curve.getPointAt((u + 0.01) % 1),
				yaw = Math.atan2(n.x - p.x, n.z - p.z);
			if (foot) {
				// updateMovers turns the group to yaw + yawOffset
				const c = NPC.colliders.find((k) => footprintHits(foot, p, yaw + (m.yawOffset || 0), k));
				if (c) {
					wallHits.push({ name, x: p.x, z: p.z, what: 'footprint', c });
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
// Static resting spots: where a story actor is left standing. A mover that holds for someone it
// cannot outwait walks through them after the runtime release, so every spot must stay at least
// YIELD_CLEARANCE (the runtime yield range) from every visible mover loop. The spots are the final
// point each HANDOFFS entry sends its actor to (run to completion here, as the page leaves it) and
// every literal position in journey.ts (move finals and stage teleports; the file is read as text).
const YIELD_CLEARANCE = 0.9;
function restingSpotProblems() {
	const spots = [];
	const tmp = new NPC.movers[0].group.position.constructor();
	for (const [key, list] of Object.entries(NPC.HANDOFFS)) {
		list.forEach((h, hi) => {
			const actor = (NPC.ROOM_CAST[key] || []).filter((e) => e.kind === (h.actor || 'patient'))[
				h.actorIndex || 0
			]?.g;
			if (!actor) return;
			const home = actor.position.clone(),
				yaw = actor.rotation.y,
				seated = !!actor.userData.seated,
				shouldSit = actor.userData.shouldSit;
			NPC.startActorHandoff(key, h);
			for (let i = 0; i < 30 * 40 && NPC.handoffTransitions.some((t) => t.actor === actor); i++)
				step();
			actor.getWorldPosition(tmp);
			spots.push({ what: `handoff ${key}[${hi}] -> ${h.target}`, x: tmp.x, z: tmp.z });
			// later handoffs and checks start from home: back on its seat if it was sitting
			actor.position.copy(home);
			actor.rotation.y = yaw;
			if (seated) NPC.seatActor(actor, actor.getWorldPosition(tmp));
			actor.userData.shouldSit = shouldSit; // the handoff's stand-up cleared it
		});
	}
	NPC.handoffTransitions.length = 0;
	const src = fs.readFileSync(path.join(HERE, '../arcade-src/sim-hub/src/journey.ts'), 'utf8');
	src.split('\n').forEach((line, i) => {
		for (const m of line.matchAll(
			/(new THREE\.Vector3|position\.set)\((-?[\d.]+),\s*0,\s*(-?[\d.]+)\)/g
		))
			spots.push({ what: `journey.ts:${i + 1}`, x: +m[2], z: +m[3] });
	});
	const loops = NPC.movers
		.map((m, i) => ({ id: names[i], m }))
		.filter(({ m }) => !m.group.userData.suppressDuringJourney)
		.map(({ id, m }) => ({
			id,
			pts: Array.from({ length: 1000 }, (_, k) => m.curve.getPointAt(k / 1000))
		}));
	const problems = [];
	for (const sp of spots)
		for (const l of loops) {
			let best = Infinity;
			for (const q of l.pts) best = Math.min(best, Math.hypot(q.x - sp.x, q.z - sp.z));
			if (best < YIELD_CLEARANCE)
				problems.push(
					`resting spot ${sp.what} (${sp.x.toFixed(2)}, ${sp.z.toFixed(2)}) is ${best.toFixed(2)} m from the ${l.id} loop (limit ${YIELD_CLEARANCE} m)`
				);
		}
	return { count: spots.length, problems };
}
function checkSpacing() {
	const rest = restingSpotProblems();
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
	const released = NPC.movers.filter((m) => m.releases > 0).map((m) => m.id);
	const holdProblems = [...rest.problems];
	// Any hold that lasts the runtime limit (8 s) ends in a release, so this also fails a lane that
	// leaves a mover waiting for good.
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
	// (vii) runtime release: a blocker that never moves (0.7 m ahead for 9 s) is outwaited. The mover
	// holds (u and height steady) until its 8 s limit, then walks on at exact pace and counts one release.
	const releases0 = m.releases,
		hold = [];
	run(0.7, 0, 1);
	const y0 = m.group.position.y;
	let releasedAt = null,
		ySteady = true,
		uMoved = false;
	for (let i = 0; i < 270 && !problems.some((x) => x.startsWith('(vii)')); i++) {
		u0 = m.u;
		run(0.7, 0, 1);
		const du = (((m.u - u0) % 1) + 1) % 1;
		hold.push(m.holding);
		if (m.holding) {
			if (m.group.position.y !== y0) ySteady = false;
			if (m.u !== u0) uMoved = true;
		} else {
			if (releasedAt === null) releasedAt = (i + 2) * dtStep;
			if (Math.abs(du - m.speed * dtStep) > 1e-9) {
				problems.push(`(vii) after the release step ${i}: du=${du} expected ${m.speed * dtStep}`);
			}
		}
	}
	if (releasedAt === null || releasedAt < 7.9 || releasedAt > 8.2)
		problems.push(
			`(vii) release at ${releasedAt === null ? 'never' : releasedAt.toFixed(2) + ' s'}, expected 8 s`
		);
	if (hold.slice(0, 220).includes(false)) problems.push('(vii) stopped holding before 7.3 s');
	if (uMoved) problems.push('(vii) u moved while holding');
	if (!ySteady) problems.push('(vii) height changed while holding (bob not stopped)');
	if (m.releases !== releases0 + 1)
		problems.push(`(vii) releases went ${releases0} -> ${m.releases}, expected +1`);
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
			: 'holds for 0.7 m ahead (frozen, limbs at rest), walks on at exact pace, releases a standing blocker after 8 s, ignores behind, 1.2 m and 70 deg, yields only to lower-index movers',
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

// ------------------------------------------------- shared geometry (f, g, h, i)
const V3 = NPC.movers[0].group.position.constructor;
const FLOOR_TOL = 0.03,
	SEAT_TOL = 0.02,
	LIE_TOL = 0.02;
const HIP_TO_PELVIS = 0.06;
// World-space bounds of a mesh (its geometry box through its world matrix).
function meshBounds(o) {
	if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
	const b = o.geometry.boundingBox,
		lo = [Infinity, Infinity, Infinity],
		hi = [-Infinity, -Infinity, -Infinity],
		v = new V3();
	for (const x of [b.min.x, b.max.x])
		for (const y of [b.min.y, b.max.y])
			for (const z of [b.min.z, b.max.z]) {
				v.set(x, y, z).applyMatrix4(o.matrixWorld);
				lo[0] = Math.min(lo[0], v.x);
				lo[1] = Math.min(lo[1], v.y);
				lo[2] = Math.min(lo[2], v.z);
				hi[0] = Math.max(hi[0], v.x);
				hi[1] = Math.max(hi[1], v.y);
				hi[2] = Math.max(hi[2], v.z);
			}
	return { o, lo, hi };
}
function sceneBoxes() {
	NPC.scene.updateMatrixWorld(true);
	const out = [];
	NPC.scene.traverse((o) => {
		if (o.isMesh && o.geometry) out.push(meshBounds(o));
	});
	return out;
}
// Floor top at (x, z): the highest top below 0.8 among the meshes that contain (x, z) and span more
// than 3 m in both x and z. Static, so the large slabs are measured once.
let floorSlabs = null;
function floorTop(x, z) {
	floorSlabs ||= sceneBoxes().filter(
		(b) => b.hi[1] < 0.8 && b.hi[0] - b.lo[0] > 3 && b.hi[2] - b.lo[2] > 3
	);
	let best = -Infinity;
	for (const b of floorSlabs)
		if (x >= b.lo[0] && x <= b.hi[0] && z >= b.lo[2] && z <= b.hi[2])
			best = Math.max(best, b.hi[1]);
	return best;
}
// A person figure is the object that carries a walkRig; a lying patient is flagged userData.lying.
const isPart = (o, root) => {
	for (let n = o; n; n = n.parent) if (n === root) return true;
	return false;
};
const isPerson = (n) => !!(n.userData && (n.userData.walkRig || n.userData.lying));
const inAnyPerson = (o) => {
	for (let n = o; n; n = n.parent) if (isPerson(n)) return true;
	return false;
};
function lowestY(group) {
	group.updateMatrixWorld(true);
	let lo = Infinity;
	group.traverse((o) => {
		if (o.isMesh && o.geometry) lo = Math.min(lo, meshBounds(o).lo[1]);
	});
	return lo;
}
const worldPos = (o) => o.getWorldPosition(new V3());
const label = (g, fallback) => g.userData?.npcName || g.userData?.npcRole || g.name || fallback;
const hipY = (g) => {
	g.updateMatrixWorld(true);
	return worldPos(g.userData.walkRig.legLP).y;
};
const isSeatedPose = (g) => g.userData.pose === 'seated' || !!g.userData.seated;

// Every visible person-figure: movers, cast, duty actors and journey actors, with their ids.
function allPeople() {
	const seen = new Map(),
		add = (root, id) => {
			if (!root) return;
			root.traverse((n) => {
				if (n.userData?.walkRig && !seen.has(n)) seen.set(n, id);
			});
		};
	NPC.movers.forEach((m, i) => add(m.group, `mover ${names[i]}`));
	for (const [room, arr] of Object.entries(NPC.ROOM_CAST))
		arr.forEach((e, i) => add(e.g, `${room}:${e.kind}:${i}`));
	for (const o of NPC.journeyActors())
		add(o, `journey ${o.userData?.npcRole || o.name || 'actor'}`);
	add(NPC.state.ambUnload, 'ambulance crew (unload)');
	add(NPC.state.ambLoad, 'ambulance crew (load)');
	return [...seen].map(([g, id]) => ({ g, id })).filter(({ g }) => NPC.visibleInTree(g));
}

// --------------------------------------------------------------- (f) feet
function checkFeet() {
	// The legs swing +/-0.357 rad from a fixed hip (sin(sec * 8 + offset * 6.28)), so walking soles are
	// sampled at 12 moments evenly spread over one swing cycle, plus 2 later ones for drift. The sole is
	// each person's lowest point (the planted foot).
	const CYCLE = (2 * Math.PI) / 8,
		worstRows = [],
		moments = [];
	let readings = 0,
		worst = 0;
	const sample = (when) => {
		let n = 0,
			w = null;
		for (const { g, id } of allPeople()) {
			if (g.userData.lying || g.userData.wheelchairOccupant || isSeatedPose(g)) continue;
			n++;
			const p = worldPos(g),
				sole = lowestY(g),
				floor = floorTop(p.x, p.z),
				gap = sole - floor;
			if (Math.abs(gap) <= FLOOR_TOL) continue;
			readings++;
			worst = Math.max(worst, Math.abs(gap));
			if (!w || Math.abs(gap) > Math.abs(w.gap))
				w = { when, id: `${id} (${label(g, id)})`, sole, floor, gap };
		}
		if (w) worstRows.push(w);
		moments.push(`${when}: ${n}`);
	};
	NPC.resetTreatmentJourney(true);
	stepFor(2);
	for (let k = 0; k < 12; k++) {
		if (k) stepFor(CYCLE / 12);
		sample(`gait ${k}/12`);
	}
	stepFor(28);
	sample('t=30s');
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
		pass: readings === 0,
		summary: readings
			? `${readings} sole readings off the floor by more than ${FLOOR_TOL} m in ${worstRows.length} of ${moments.length} moments (worst ${worst.toFixed(2)} m)`
			: `every standing or walking sole within ${FLOOR_TOL} m of the floor at ${moments.length} moments`,
		detail: worstRows.map(
			(r) =>
				`worst at ${r.when}: ${r.id}: sole ${r.sole.toFixed(3)}, floor ${r.floor.toFixed(3)}, gap ${r.gap >= 0 ? '+' : ''}${r.gap.toFixed(3)}`
		)
	};
}

// -------------------------------------------------------------- (g) seated
// The sitters are the figures posed seated (or flagged userData.seated) plus every cast patient that
// should sit (userData.shouldSit), so one left standing or unseated still fails. A sitter passes when
// a seat anchor within 0.3 m has its top within 0.02 m of the pelvis and faces within 20 deg of it.
const SEAT_RADIUS = 0.3,
	FACING_TOL_DEG = 20;
// World yaw of an object (the rotation.y that turns +z to where it faces).
const worldYaw = (o) => {
	const d = o.getWorldDirection(new V3());
	return Math.atan2(d.x, d.z);
};
const degOff = (a, b) => Math.abs(((((a - b) * 180) / Math.PI + 540) % 360) - 180);
function checkSeated() {
	NPC.resetTreatmentJourney(true);
	stepFor(0.2);
	const seats = NPC.SEATS.map(NPC.seatInWorld),
		rows = [];
	let n = 0;
	for (const { g, id } of allPeople()) {
		if (g.userData.wheelchairOccupant) continue; // (i)
		if (!(isSeatedPose(g) || g.userData.shouldSit)) continue;
		n++;
		const p = worldPos(g),
			pelvis = hipY(g) - HIP_TO_PELVIS,
			yaw = worldYaw(g),
			near = seats
				.map((s) => ({ s, d: Math.hypot(s.x - p.x, s.z - p.z) }))
				.sort((a, b) => a.d - b.d),
			fits = ({ s, d }) =>
				d <= SEAT_RADIUS &&
				Math.abs(pelvis - s.top) <= SEAT_TOL &&
				degOff(yaw, s.facing) <= FACING_TOL_DEG,
			who = `${id} (${label(g, id)}) pose=${g.userData.pose || 'none'} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
		if (near.some(fits)) continue;
		const c = near[0];
		if (!c || c.d > SEAT_RADIUS) {
			rows.push(
				`${who}: no seat anchor within ${SEAT_RADIUS} m (nearest ${c ? `${c.s.kind} ${c.d.toFixed(2)} m` : 'none'}); pelvis ${pelvis.toFixed(3)}`
			);
			continue;
		}
		const gap = pelvis - c.s.top;
		rows.push(
			`${who}: ${c.s.kind} anchor ${c.d.toFixed(2)} m away: pelvis ${pelvis.toFixed(3)}, seat top ${c.s.top.toFixed(3)}, gap ${gap >= 0 ? '+' : ''}${gap.toFixed(3)}; facing ${degOff(yaw, c.s.facing).toFixed(0)} deg off the seat's`
		);
	}
	const facing = seatFacingProblems(seats),
		talk = exchangeFacingProblems(seats),
		sitters = rows.length
			? `${rows.length} of ${n} sitters not on a seat (anchor within ${SEAT_RADIUS} m, pelvis within ${SEAT_TOL} m of its top, facing within ${FACING_TOL_DEG} deg)`
			: `${n} sitters on seat anchors: within ${SEAT_RADIUS} m, pelvis within ${SEAT_TOL} m of the top, facing within ${FACING_TOL_DEG} deg (${seats.length} anchors)`;
	return {
		pass: rows.length === 0 && facing.problems.length === 0 && talk.problems.length === 0,
		summary: [
			sitters,
			facing.problems.length
				? `seat facing: ${facing.problems.length} of ${facing.count} seats face a wall within ${SEAT_VIEW.toFixed(1)} m`
				: `seat facing: none of ${facing.count} seats faces a wall within ${SEAT_VIEW.toFixed(1)} m`,
			talk.problems.length
				? `exchange facing: ${talk.problems.length} of ${talk.count} seated patients have their partner more than ${TALK_DEG} deg off`
				: `exchange facing: ${talk.count} seated patients face their partner within ${TALK_DEG} deg`
		].join('; '),
		detail: [...facing.problems, ...talk.problems, ...rows]
	};
}
// Sub-check "exchange facing": in every speech exchange (registerNpcExchange) with a seated member, the
// partner is within TALK_DEG of the facing of the seat the sitter is on (seated bodies never turn).
const TALK_DEG = 60;
function exchangeFacingProblems(seats) {
	const problems = [];
	let count = 0;
	for (const sc of NPC.interactionScenes)
		for (const [sitter, partner] of [
			[sc.a, sc.b],
			[sc.b, sc.a]
		]) {
			if (!sitter.userData.seated) continue;
			count++;
			const p = worldPos(sitter),
				q = worldPos(partner),
				seat = seats
					.map((s) => ({ s, d: Math.hypot(s.x - p.x, s.z - p.z) }))
					.sort((u, v) => u.d - v.d)[0],
				who = `exchange facing: ${label(sitter, 'sitter')} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) and ${label(partner, 'partner')}`;
			if (!seat || seat.d > SEAT_RADIUS) {
				problems.push(`${who}: the sitter has no seat anchor within ${SEAT_RADIUS} m`);
				continue;
			}
			const off = degOff(Math.atan2(q.x - p.x, q.z - p.z), seat.s.facing);
			if (off > TALK_DEG)
				problems.push(
					`${who}: partner ${off.toFixed(0)} deg off the seat's facing (limit ${TALK_DEG})`
				);
		}
	if (count < 1)
		problems.push('exchange facing: no seated exchange pair was checked (the set is empty)');
	return { count, problems };
}
// Sub-check "seat facing": the segment from each seat anchor SEAT_VIEW m forward along its facing must
// not enter a wall collider (radius 0). Wheelchairs are left out: they are parked or pushed anywhere.
const SEAT_VIEW = 3.0;
// Whether segment (x0, z0)-(x1, z1) passes through the inside of collider box c (slab method).
function segmentEntersBox(x0, z0, x1, z1, c) {
	let t0 = 0,
		t1 = 1;
	for (const [p, d, lo, hi] of [
		[x0, x1 - x0, c.x - c.hw, c.x + c.hw],
		[z0, z1 - z0, c.z - c.hd, c.z + c.hd]
	]) {
		if (Math.abs(d) < 1e-9) {
			if (p <= lo || p >= hi) return false;
			continue;
		}
		const a = (lo - p) / d,
			b = (hi - p) / d;
		t0 = Math.max(t0, Math.min(a, b));
		t1 = Math.min(t1, Math.max(a, b));
		if (t0 >= t1) return false;
	}
	return true;
}
function seatFacingProblems(seats) {
	const problems = [];
	let count = 0;
	for (const s of seats) {
		if (s.kind === 'wheelchair') continue;
		count++;
		const x1 = s.x + Math.sin(s.facing) * SEAT_VIEW,
			z1 = s.z + Math.cos(s.facing) * SEAT_VIEW,
			hit = NPC.colliders.find((c) => segmentEntersBox(s.x, s.z, x1, z1, c));
		if (hit)
			problems.push(
				`seat facing: ${s.kind} at (${s.x.toFixed(2)}, ${s.z.toFixed(2)}) facing ${((s.facing * 180) / Math.PI).toFixed(0)} deg meets the wall at (${hit.x.toFixed(2)}, ${hit.z.toFixed(2)}) within ${SEAT_VIEW.toFixed(1)} m`
			);
	}
	return { count, problems };
}

// --------------------------------------------------------------- (h) lying
function checkLying() {
	NPC.resetTreatmentJourney(true);
	stepFor(0.2);
	const boxes = sceneBoxes(),
		lying = new Map();
	NPC.scene.traverse((o) => {
		if (o.userData?.lying) lying.set(o, '');
	});
	for (const [room, arr] of Object.entries(NPC.ROOM_CAST))
		for (const e of arr) if (lying.has(e.g)) lying.set(e.g, room);
	const rows = [];
	for (const [g, room] of lying) {
		g.updateMatrixWorld(true);
		const mine = boxes.filter((b) => isPart(b.o, g)),
			lowest = Math.min(...mine.map((b) => b.lo[1])),
			cx = (Math.min(...mine.map((b) => b.lo[0])) + Math.max(...mine.map((b) => b.hi[0]))) / 2,
			cz = (Math.min(...mine.map((b) => b.lo[2])) + Math.max(...mine.map((b) => b.hi[2]))) / 2;
		let under = null;
		for (const b of boxes) {
			if (isPart(b.o, g) || inAnyPerson(b.o)) continue;
			if (cx < b.lo[0] || cx > b.hi[0] || cz < b.lo[2] || cz > b.hi[2]) continue;
			if (b.hi[1] < lowest - 1.6 || b.hi[1] > lowest + 0.5) continue;
			if (!under || b.hi[1] > under.hi[1]) under = b;
		}
		const who = `${room || 'lying'}:${g.userData.npcRole || 'patient'} at (${cx.toFixed(2)}, ${cz.toFixed(2)}) ${g.visible ? '' : '[hidden] '}`;
		if (!under) {
			rows.push(`${who}lowest ${lowest.toFixed(3)}: no couch or table top under the centre`);
			continue;
		}
		const gap = lowest - under.hi[1];
		if (Math.abs(gap) > LIE_TOL)
			rows.push(
				`${who}lowest ${lowest.toFixed(3)}, top ${under.hi[1].toFixed(3)} (${under.o.name || 'mesh'}), gap ${gap >= 0 ? '+' : ''}${gap.toFixed(3)}`
			);
	}
	return {
		pass: rows.length === 0,
		summary: rows.length
			? `${rows.length} of ${lying.size} lying patients not resting on the couch or table (within ${LIE_TOL} m)`
			: `${lying.size} lying patients rest within ${LIE_TOL} m of the couch or table top`,
		detail: rows
	};
}

// ----------------------------------------------------------- (i) wheelchair
// The occupant's pelvis is measured against the seat anchor that its own wheelchair registered.
function checkWheelchair() {
	NPC.resetTreatmentJourney(true);
	stepFor(0.5);
	const occupants = [];
	NPC.scene.traverse((o) => {
		if (o.userData?.wheelchairOccupant) occupants.push(o);
	});
	const rows = [];
	for (const g of occupants) {
		g.updateMatrixWorld(true);
		const chair = g.parent,
			pelvis = hipY(g) - HIP_TO_PELVIS,
			pose = g.userData.pose || 'none',
			anchor = NPC.SEATS.find((s) => s.group === chair),
			problems = [];
		if (pose !== 'seated') problems.push(`pose=${pose}, expected seated`);
		if (!anchor) problems.push('the wheelchair has no seat anchor');
		else {
			const top = NPC.seatInWorld(anchor).top,
				gap = pelvis - top;
			if (Math.abs(gap) > SEAT_TOL)
				problems.push(
					`pelvis ${pelvis.toFixed(3)}, seat top ${top.toFixed(3)}, gap ${gap >= 0 ? '+' : ''}${gap.toFixed(3)}`
				);
		}
		if (problems.length) rows.push(`wheelchair occupant: ${problems.join('; ')}`);
	}
	if (!occupants.length) rows.push('no wheelchair occupant found (userData.wheelchairOccupant)');
	return {
		pass: rows.length === 0,
		summary: rows.length
			? `${rows.length} of ${occupants.length} wheelchair occupants not seated on the chair`
			: `${occupants.length} wheelchair occupants seated, pelvis within ${SEAT_TOL} m of the chair's seat anchor top`,
		detail: rows
	};
}

// ------------------------------------------------------------------ driver
const CHECKS = {
	a: checkWalls,
	b: checkSpacing,
	c: checkOneMove,
	d: checkHidden,
	e: checkYield,
	f: checkFeet,
	g: checkSeated,
	h: checkLying,
	i: checkWheelchair
};
let failed = 0;
for (const letter of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) {
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
