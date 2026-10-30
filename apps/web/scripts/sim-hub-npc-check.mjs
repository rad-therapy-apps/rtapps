// sim-hub NPC movement check.
//
// Imports the built sim-hub bundle under stubbed browser globals (scripts/lib/browser-stubs.mjs)
// with `?npccheck`, which makes the page expose `window.__NPC` (src/npc-check-hook.ts), then drives
// `stepSimulation` on a simulated clock (performance.now and setTimeout run on it, Math.random is
// seeded), so the journey's own timed sequence runs headlessly at simulation speed.
//
//   a  Walls     every mover loop (500 samples) keeps clear of every collider: people by 0.3 m (the
//                escort's chair and pusher both), vehicles by their oriented footprint plus 0.2 m,
//                the tech cart by its oriented footprint plus 0.1 m
//   b  Spacing   20 simulated minutes at 30 Hz, with scripted journey moves: no mover within 0.5 m of
//                another mover, a cast actor or a journey/transition actor
//   c  One move  two queued moves for one journey actor never overlap and never jump (the first starts
//                from the reset seat, so the stand-up is measured too)
//   e  Yield     a mover holds for someone 0.9 m ahead (+/-50 deg), stands still, then walks on at pace;
//                one that never moves is outwaited: released after 8 s, then walking at pace
//   d  Hidden    after a 10 s hidden gap nobody moves further than one 0.05 s frame step
//   f  Feet      every standing or walking person's sole is within 0.03 m of the floor beneath
//                (12 moments over one leg-swing cycle after the journey reset, then t = 30 s and 90 s,
//                then 8 moments over each of the ambulance crew's walks, unload and load)
//   g  Seated    every sitter has a seat anchor (props.ts SEATS) within 0.3 m whose top is within
//                0.02 m of its pelvis (hip pivot - 0.06 x scale) and whose facing is within 20 deg of its own;
//                seat facing: no seat (wheelchairs aside) faces a wall within 3.0 m;
//                exchange facing: a seated patient's exchange partner is within 60 deg of its seat's facing;
//                pickup facing: at the journey's lobby pickup the therapist is within 60 deg of the seated
//                patient's facing and stands clear of furniture (Jordan and Mia);
//                handoff seating: "Have a seat" and patientcare -> lobby end seated on their chair, and
//                "Have a seat" for a patient already seated in the lobby is a no-op
//   h  Lying     every lying patient rests on its couch or table top, found by its props.ts geometry
//                (CT table, vault couch carbon insert, HDR exam table): the lowest point and the torso's
//                and pelvis's undersides within 0.02 m of the top, and no more than 0.07 m past any edge;
//                also with the CT couch slid 0, 1, 2 and 3.15 m into the gantry
//   i  Wheelchair  the wheelchair occupant is posed seated, pelvis within 0.02 m of that chair's
//                own seat anchor top
//   j  Stand-up  a seated actor that starts a move (the consult -> education and patientcare -> lobby
//                handoffs, "Have a seat", Mia's lobby journey move) keeps its leg column (0.15 m around
//                the soles' midpoint, soles to knees) out of the furniture for the first 30 frames
//
// Checks k, l and m measure people against furniture (scripts/lib/furniture.mjs: every visible mesh
// except people, movers, floors, walls, ceilings, mats, glass panes, planes and wall items above
// 2 m) by their body (the legs and torso, sampled on a grid of points over each mesh). They run from
// the people as the page built them, at the journey reset; hand-overs run as the page runs them, and
// both patient journeys are driven through their own sequence to the end ('done').
//   k  Rest clear  the body is at least 0.05 m from furniture (6 x 6 x 6 points per mesh; a sitter's
//                own seat left out) for every cast, duty and journey actor 10 frames after the
//                journey reset, every hand-over's actor at its end (each run alone) and every journey
//                move's actor at its end
//   l  Routes    on every frame of every hand-over (each run alone) and journey move, stand-up
//                included, the body is at most 0.02 m into furniture (4 x 4 x 4 points per mesh;
//                the seats within 0.6 m of the move's start, its end or the actor's own seat left
//                out); mover loops: for the movers that walk on their loop point, a 0.2 m ring at
//                heights 0.1, 0.5, 0.9 and 1.3 m is at most 0.02 m into furniture at 500 points
//   m  Occupancy  people at rest (lying patients aside) are at least 0.5 m apart, root to root in
//                x/z: after the journey reset; each hand-over's end against its target room's
//                residents, run alone and started together with every other hand-over into that
//                room; each journey move's end against everyone at rest then. At each of those
//                moments a seat anchor holds one sitter and nobody standing is within 0.3 m of an
//                occupied one
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-npc-check.mjs [--svg <file>] [--only a,b,c,d,e,f,g,h,i,j,k,l,m]
//     --svg also draws the furniture, every check l route and a red dot at each k or l failure.
// Exit codes: 0 every selected check passes; 1 any fails; 2 setup error.
// Output: `NPC CHECK <letter> PASS|FAIL: <summary>` per check, then at most 30 detail lines per failing check.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installBrowserStubs } from './lib/browser-stubs.mjs';
import {
	buildFurniture,
	sdf,
	bodyPoints,
	seatMeshes,
	measure,
	describe
} from './lib/furniture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argVal = (flag) => {
	const i = argv.indexOf(flag);
	return i >= 0 ? argv[i + 1] : null;
};
const svgPath = argVal('--svg');
const LETTERS = 'abcdefghijklm';
const only = new Set((argVal('--only') || [...LETTERS].join(',')).split(',').map((x) => x.trim()));
for (const x of only) {
	if (!LETTERS.includes(x) || x.length !== 1) {
		console.error(
			`NPC CHECK error: unknown check '${x}' in --only (use ${[...LETTERS].join(',')})`
		);
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
// The page's timers (the journey's later(), the door timers) run on the simulated clock too: they are
// queued against simNow and step() runs every one that is due, earliest first, before the frame.
const timers = new Map();
let timerId = 0;
globalThis.setTimeout = (fn, ms = 0, ...args) => {
	timers.set(++timerId, { at: simNow + (Number(ms) || 0), fn, args });
	return timerId;
};
globalThis.clearTimeout = (id) => timers.delete(id);
function runDueTimers() {
	for (;;) {
		let next = null;
		for (const [id, t] of timers)
			if (t.at <= simNow && (!next || t.at < next[1].at)) next = [id, t];
		if (!next) return;
		timers.delete(next[0]);
		next[1].fn(...next[1].args);
	}
}
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
	runDueTimers();
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
function driveJourneyScript(script, tSec) {
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
			// later handoffs and checks start from home: back on its seat if it was sitting, standing if
			// it was standing (a handoff that ends on a seat seats its actor)
			if (!seated && actor.userData.seated) NPC.setActorSeated(actor, false);
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
		driveJourneyScript(script, tSec);
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
	const problems = [];
	let maxRef = 0,
		maxJump = 0,
		prev = { x: actor.position.x, z: actor.position.z },
		firstOverlap = null,
		firstJump = null,
		secondStart = null;
	const track = (i) => {
		const j = Math.hypot(actor.position.x - prev.x, actor.position.z - prev.z);
		if (j > maxJump) maxJump = j;
		if (j > 0.25 && !firstJump)
			firstJump = `step ${i}: actor moved ${j.toFixed(2)} m in one step to (${actor.position.x.toFixed(2)}, ${actor.position.z.toFixed(2)})`;
		prev = { x: actor.position.x, z: actor.position.z };
	};
	// The reset seats the actor, so the first 0.5 s (15 steps) cover its stand-up out of the chair.
	NPC.moveJourneyActor(actor, from, 'consult', roomFinal('consult'), () => {
		fired.push(1);
		arrival = { x: actor.position.x, z: actor.position.z };
	});
	for (let i = -15; i < 0; i++) {
		step();
		track(i);
	}
	NPC.moveJourneyActor(actor, 'consult', 'education', roomFinal('education'), () => fired.push(2));
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
		track(i);
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
// The pelvis (the thighs' underside) is HIP_TO_PELVIS below the hip pivots, scaled with the figure.
const pelvisY = (g) => hipY(g) - HIP_TO_PELVIS * g.getWorldScale(new V3()).y;
const isSeatedPose = (g) => g.userData.pose === 'seated' || !!g.userData.seated;
const castActor = (key, h) =>
	(NPC.ROOM_CAST[key] || []).filter((e) => e.kind === (h.actor || 'patient'))[h.actorIndex || 0]?.g;
// Furniture: every non-person mesh under 3 m across in x and z (floors and long walls are larger)
// whose top is above FLOOR_ITEM_TOP (floor pads and markings are lower).
const FLOOR_ITEM_TOP = 0.15;
function furnitureBoxes() {
	return sceneBoxes().filter(
		(b) =>
			!inAnyPerson(b.o) &&
			b.hi[1] > FLOOR_ITEM_TOP &&
			b.hi[0] - b.lo[0] <= 3 &&
			b.hi[2] - b.lo[2] <= 3
	);
}
const describeBox = (b) => {
	const p = b.o.geometry.parameters || {},
		dims = ['width', 'height', 'depth'].map((k) => p[k]).filter((v) => v !== undefined);
	return `${b.o.geometry.type}${dims.length ? `(${dims.map((v) => +v.toFixed(3)).join(', ')})` : ''} x ${b.lo[0].toFixed(2)}..${b.hi[0].toFixed(2)} y ${b.lo[1].toFixed(2)}..${b.hi[1].toFixed(2)} z ${b.lo[2].toFixed(2)}..${b.hi[2].toFixed(2)}`;
};
// A person's leg column: a vertical cylinder of radius LEG_R around the midpoint of its two soles (the
// bottom centres of the shoes, the lowest meshes under each knee pivot), from the soles up to the
// knees. Standing or walking it is under the hips; seated or standing up it is where the feet are.
const LEG_R = 0.15;
function legColumn(g) {
	g.updateMatrixWorld(true);
	const rig = g.userData.walkRig,
		soles = [];
	let top = -Infinity;
	for (const knee of [rig.kneeLP, rig.kneeRP]) {
		top = Math.max(top, worldPos(knee).y);
		let shoe = null;
		knee.traverse((o) => {
			if (!o.isMesh) return;
			const b = meshBounds(o);
			if (!shoe || b.lo[1] < shoe.lo[1]) shoe = b;
		});
		soles.push({
			x: (shoe.lo[0] + shoe.hi[0]) / 2,
			y: shoe.lo[1],
			z: (shoe.lo[2] + shoe.hi[2]) / 2
		});
	}
	return {
		x: (soles[0].x + soles[1].x) / 2,
		z: (soles[0].z + soles[1].z) / 2,
		lo: Math.min(soles[0].y, soles[1].y),
		hi: top
	};
}
// Whether box b reaches into leg column c (overlapping heights, and its x/z rectangle within LEG_R of
// the column's axis).
const columnHits = (c, b) =>
	b.lo[1] < c.hi &&
	c.lo < b.hi[1] &&
	Math.hypot(Math.max(b.lo[0] - c.x, 0, c.x - b.hi[0]), Math.max(b.lo[2] - c.z, 0, c.z - b.hi[2])) <
		LEG_R;
const describeColumn = (c) =>
	`leg column at (${c.x.toFixed(2)}, ${c.z.toFixed(2)}) r ${LEG_R}, y ${c.lo.toFixed(2)}..${c.hi.toFixed(2)}`;

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
// Why sitter g is not on a seat anchor (within SEAT_RADIUS, pelvis within SEAT_TOL of its top, facing
// within FACING_TOL_DEG of it), or null when it is.
function sitterProblem(g, id, seats) {
	const p = worldPos(g),
		pelvis = pelvisY(g),
		yaw = worldYaw(g),
		near = seats.map((s) => ({ s, d: Math.hypot(s.x - p.x, s.z - p.z) })).sort((a, b) => a.d - b.d),
		fits = ({ s, d }) =>
			d <= SEAT_RADIUS &&
			Math.abs(pelvis - s.top) <= SEAT_TOL &&
			degOff(yaw, s.facing) <= FACING_TOL_DEG,
		who = `${id} (${label(g, id)}) pose=${g.userData.pose || 'none'} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
	if (near.some(fits)) return null;
	const c = near[0];
	if (!c || c.d > SEAT_RADIUS)
		return `${who}: no seat anchor within ${SEAT_RADIUS} m (nearest ${c ? `${c.s.kind} ${c.d.toFixed(2)} m` : 'none'}); pelvis ${pelvis.toFixed(3)}`;
	const gap = pelvis - c.s.top;
	return `${who}: ${c.s.kind} anchor ${c.d.toFixed(2)} m away: pelvis ${pelvis.toFixed(3)}, seat top ${c.s.top.toFixed(3)}, gap ${gap >= 0 ? '+' : ''}${gap.toFixed(3)}; facing ${degOff(yaw, c.s.facing).toFixed(0)} deg off the seat's`;
}
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
		const r = sitterProblem(g, id, seats);
		if (r) rows.push(r);
	}
	const facing = seatFacingProblems(seats),
		talk = exchangeFacingProblems(seats),
		pickup = pickupFacingProblems(seats),
		handoff = handoffSeatingProblems(seats),
		sitters = rows.length
			? `${rows.length} of ${n} sitters not on a seat (anchor within ${SEAT_RADIUS} m, pelvis within ${SEAT_TOL} m of its top, facing within ${FACING_TOL_DEG} deg)`
			: `${n} sitters on seat anchors: within ${SEAT_RADIUS} m, pelvis within ${SEAT_TOL} m of the top, facing within ${FACING_TOL_DEG} deg (${seats.length} anchors)`;
	return {
		pass:
			rows.length === 0 &&
			facing.problems.length === 0 &&
			talk.problems.length === 0 &&
			pickup.problems.length === 0 &&
			handoff.problems.length === 0,
		summary: [
			sitters,
			facing.problems.length
				? `seat facing: ${facing.problems.length} of ${facing.count} seats face a wall within ${SEAT_VIEW.toFixed(1)} m`
				: `seat facing: none of ${facing.count} seats faces a wall within ${SEAT_VIEW.toFixed(1)} m`,
			talk.problems.length
				? `exchange facing: ${talk.problems.length} of ${talk.count} seated patients have their partner more than ${TALK_DEG} deg off`
				: `exchange facing: ${talk.count} seated patients face their partner within ${TALK_DEG} deg`,
			pickup.problems.length
				? `pickup facing: ${pickup.problems.length} problems in ${pickup.count} lobby pickups`
				: `pickup facing: in ${pickup.count} lobby pickups the seated patient faces the therapist within ${TALK_DEG} deg, the therapist clear of furniture`,
			handoff.problems.length
				? `handoff seating: ${handoff.problems.length} of ${handoff.count} handoffs not ending seated as expected`
				: `handoff seating: ${handoff.count} handoffs end seated on their chair or leave a seated patient seated`
		].join('; '),
		detail: [...facing.problems, ...talk.problems, ...pickup.problems, ...handoff.problems, ...rows]
	};
}
// Sub-check "pickup facing": the journey's lobby pickup run the way the journey runs it, for Jordan
// and for Mia: the patient walks to LOBBY_PICKUP.chair and is seated on the chair there, and the
// therapist walks in from treatment control to LOBBY_PICKUP.therapist. The therapist must then be
// within TALK_DEG of the seat's facing, seen from the seated patient's hips (seated bodies never
// turn), and its lower legs clear of furniture.
function pickupFacingProblems(seats) {
	const J = NPC.JOURNEY,
		P = NPC.LOBBY_PICKUP,
		problems = [];
	let count = 0;
	for (const [who, patient] of [
		['Jordan', J.patient],
		['Mia', J.newPatient]
	]) {
		NPC.resetTreatmentJourney(true);
		count++;
		let left = 2;
		NPC.moveJourneyActor(patient, 'lobby', 'lobby', P.chair, () => {
			NPC.setActorSeated(patient, true);
			left--;
		});
		NPC.moveJourneyActor(J.therapist, 'linaccontrol', 'lobby', P.therapist, () => left--);
		for (let i = 0; i < 30 * 90 && left > 0; i++) step();
		const tag = `pickup facing (${who})`;
		if (left > 0) {
			problems.push(`${tag}: the pickup moves did not finish within 90 s`);
			continue;
		}
		const p = worldPos(patient),
			q = worldPos(J.therapist),
			seat = seats
				.map((s) => ({ s, d: Math.hypot(s.x - p.x, s.z - p.z) }))
				.sort((u, v) => u.d - v.d)[0];
		if (!patient.userData.seated || !seat || seat.d > SEAT_RADIUS) {
			problems.push(`${tag}: the patient is not seated on a seat anchor at the pickup chair`);
			continue;
		}
		const off = degOff(Math.atan2(q.x - p.x, q.z - p.z), seat.s.facing);
		if (off > TALK_DEG)
			problems.push(
				`${tag}: the therapist at (${q.x.toFixed(2)}, ${q.z.toFixed(2)}) is ${off.toFixed(0)} deg off the facing of the patient's seat at (${seat.s.x.toFixed(2)}, ${seat.s.z.toFixed(2)}) (limit ${TALK_DEG})`
			);
		const legs = legColumn(J.therapist),
			hit = furnitureBoxes().find((b) => columnHits(legs, b));
		if (hit)
			problems.push(`${tag}: the therapist's ${describeColumn(legs)} meets ${describeBox(hit)}`);
	}
	NPC.resetTreatmentJourney(true);
	return { count, problems };
}
// Sub-check "handoff seating": a patient handoff whose final point is a free seat anchor ends with the
// patient seated there (sitterProblem passes): "Have a seat" (the patient first walks to the check-in
// desk) and patientcare -> lobby. "Have a seat" for a patient already seated in the lobby is a no-op:
// no move starts and the patient stays on the same seat.
function handoffSeatingProblems(seats) {
	const H = NPC.HANDOFFS,
		problems = [],
		haveSeat = H.lobby[1],
		running = (a) => NPC.handoffTransitions.some((t) => t.actor === a),
		runHandoff = (key, h, actor) => {
			NPC.startActorHandoff(key, h);
			for (let i = 0; i < 30 * 40 && running(actor); i++) step();
		},
		expectSeated = (what, actor) => {
			const r = running(actor)
				? 'still walking after 40 s'
				: !actor.userData.shouldSit
					? `ends with pose=${actor.userData.pose || 'none'}, shouldSit=${!!actor.userData.shouldSit}; ${sitterProblem(actor, what, seats) || 'on a seat anchor'}`
					: sitterProblem(actor, what, seats);
			if (r) problems.push(`handoff seating: ${what}: ${r}`);
		};
	// "Have a seat" while already seated: the reset seats the patient on a lobby chair
	NPC.resetTreatmentJourney(true);
	NPC.handoffTransitions.length = 0;
	step();
	const jordan = castActor('lobby', haveSeat),
		p0 = worldPos(jordan);
	NPC.startActorHandoff('lobby', haveSeat);
	stepFor(1);
	const moved = worldPos(jordan).distanceTo(p0);
	if (running(jordan) || !jordan.userData.seated || moved > 0.01)
		problems.push(
			`handoff seating: "${haveSeat.label}" for a patient seated in the lobby is not a no-op: ${running(jordan) ? 'a move started' : 'no move'}, pose=${jordan.userData.pose || 'none'}, moved ${moved.toFixed(2)} m in 1 s`
		);
	NPC.handoffTransitions.length = 0;
	// "Have a seat" from the check-in desk
	NPC.resetTreatmentJourney(true);
	let atDesk = false;
	NPC.moveJourneyActor(
		jordan,
		'lobby',
		'lobby',
		{ x: -4.5, y: 0, z: -2.05 },
		() => (atDesk = true)
	);
	for (let i = 0; i < 30 * 30 && !atDesk; i++) step();
	runHandoff('lobby', haveSeat, jordan);
	expectSeated(`"${haveSeat.label}" from the check-in desk`, jordan);
	// patientcare -> lobby, from the exam table; the cast patient goes back to its seat afterwards
	NPC.resetTreatmentJourney(true);
	const care = H.patientcare[0],
		carer = castActor('patientcare', care),
		home = carer.position.clone(),
		yaw = carer.rotation.y;
	runHandoff('patientcare', care, carer);
	expectSeated(`"${care.label}"`, carer);
	NPC.handoffTransitions.length = 0;
	NPC.setActorSeated(carer, false);
	carer.position.copy(home);
	carer.rotation.y = yaw;
	NPC.setActorSeated(carer, true);
	NPC.resetTreatmentJourney(true);
	return { count: 3, problems };
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
// The tops a patient lies on, found by their props.ts geometry (the mesh's own box size times its
// scale), not by the rule restLyingPatient uses, so the check does not confirm itself.
const LYING_SURFACES = [
	{ what: 'CT table', size: [5.8, 0.15, 0.72] },
	{ what: 'vault couch carbon insert', size: [0.64, 0.055, 4.2] },
	{ what: 'exam table', size: [2.2, 0.13, 0.72] }
];
const LIE_OVERHANG = 0.07,
	CT_SLIDES = [0, 1, 2, 3.15]; // the CT couch slides up to 3.15 m into the gantry (CT_COUCH.inDist)
function lyingSurfaces() {
	const out = [];
	NPC.scene.traverse((o) => {
		if (!o.isMesh || !o.geometry || inAnyPerson(o)) return;
		if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
		const b = o.geometry.boundingBox,
			d = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map(
				(v, k) => v * Math.abs(o.scale.getComponent(k))
			),
			s = LYING_SURFACES.find((x) => x.size.every((v, k) => Math.abs(v - d[k]) < 0.01));
		if (s) out.push({ what: s.what, o });
	});
	return out;
}
// The lying figure's parts, its whole box, and the known surface under its centre.
function lyingOn(g, surfaces) {
	g.updateMatrixWorld(true);
	const parts = [];
	g.traverse((o) => {
		if (o.isMesh && o.geometry) parts.push(meshBounds(o));
	});
	const lo = [0, 1, 2].map((k) => Math.min(...parts.map((b) => b.lo[k]))),
		hi = [0, 1, 2].map((k) => Math.max(...parts.map((b) => b.hi[k]))),
		rest = parts.filter((b) => b.lo[1] <= lo[1] + LIE_TOL),
		foot = [0, 2].map((k) => [
			Math.min(...rest.map((b) => b.lo[k])),
			Math.max(...rest.map((b) => b.hi[k]))
		]),
		cx = (lo[0] + hi[0]) / 2,
		cz = (lo[2] + hi[2]) / 2,
		under = surfaces
			.map((s) => ({ ...s, b: meshBounds(s.o) }))
			.find(({ b }) => cx >= b.lo[0] && cx <= b.hi[0] && cz >= b.lo[2] && cz <= b.hi[2]);
	return { lo, hi, foot, cx, cz, under };
}
// What is wrong with lying patient g on its surface: the lowest point and the torso's and pelvis's
// undersides within LIE_TOL of the top, and its footprint (the x/z box of its lowest parts, those
// whose undersides are within LIE_TOL of its lowest point: what rests on the top) no more than
// LIE_OVERHANG past any edge of the top.
function lyingProblems(g, surfaces, who) {
	const { lo, foot, cx, cz, under } = lyingOn(g, surfaces),
		at = `${who} at (${cx.toFixed(2)}, ${cz.toFixed(2)})`;
	if (!under) return [`${at}: no known couch or table top under the centre`];
	const top = under.b.hi[1],
		off = (y) => `${y - top >= 0 ? '+' : ''}${(y - top).toFixed(3)}`,
		rows = [];
	if (Math.abs(lo[1] - top) > LIE_TOL)
		rows.push(
			`${at}: lowest point ${off(lo[1])} from the top of the ${under.what} (${top.toFixed(3)})`
		);
	for (const name of ['torso', 'pelvis']) {
		const part = g.getObjectByName(name);
		if (!part) {
			rows.push(`${at}: no part named '${name}' (createLyingPatient names it)`);
			continue;
		}
		const y = meshBounds(part).lo[1];
		if (Math.abs(y - top) > LIE_TOL)
			rows.push(
				`${at}: ${name} underside ${off(y)} from the top of the ${under.what} (${top.toFixed(3)})`
			);
	}
	const past = {
		'-x': under.b.lo[0] - foot[0][0],
		'+x': foot[0][1] - under.b.hi[0],
		'-z': under.b.lo[2] - foot[1][0],
		'+z': foot[1][1] - under.b.hi[2]
	};
	for (const [side, v] of Object.entries(past))
		if (v > LIE_OVERHANG)
			rows.push(
				`${at}: reaches ${v.toFixed(2)} m past the ${under.what}'s ${side} edge (limit ${LIE_OVERHANG})`
			);
	return rows;
}
function checkLying() {
	NPC.resetTreatmentJourney(true);
	stepFor(0.2);
	NPC.scene.updateMatrixWorld(true);
	const surfaces = lyingSurfaces(),
		lying = new Map();
	NPC.scene.traverse((o) => {
		if (o.userData?.lying) lying.set(o, '');
	});
	for (const [room, arr] of Object.entries(NPC.ROOM_CAST))
		for (const e of arr) if (lying.has(e.g)) lying.set(e.g, room);
	const rows = [],
		name = (g, room) =>
			`${room || 'lying'}:${g.userData.npcRole || 'patient'}${g.visible ? '' : ' [hidden]'}`;
	for (const [g, room] of lying) rows.push(...lyingProblems(g, surfaces, name(g, room)));
	// The CT couch slide (updateCtCouchMotion) moves the table and its patient along x by the same
	// offset: sample it at CT_SLIDES, moving every patient lying on the CT table with it.
	const ct = surfaces.find((s) => s.what === 'CT table');
	if (!ct) rows.push('no CT table found by its geometry');
	else {
		const riders = [...lying.keys()].filter((g) => lyingOn(g, surfaces).under?.o === ct.o),
			tableX = ct.o.position.x,
			riderX = riders.map((g) => g.position.x);
		for (const d of CT_SLIDES) {
			ct.o.position.x = tableX + d;
			riders.forEach((g, i) => (g.position.x = riderX[i] + d));
			NPC.scene.updateMatrixWorld(true);
			for (const g of riders)
				rows.push(...lyingProblems(g, surfaces, `${name(g, lying.get(g))} (couch slid ${d} m)`));
		}
		ct.o.position.x = tableX;
		riders.forEach((g, i) => (g.position.x = riderX[i]));
		NPC.scene.updateMatrixWorld(true);
		if (!riders.length) rows.push('no lying patient on the CT table to slide');
	}
	return {
		pass: rows.length === 0,
		summary: rows.length
			? `${rows.length} lying problems (${lying.size} lying patients; lowest point, torso and pelvis within ${LIE_TOL} m of the top, at most ${LIE_OVERHANG} m past an edge)`
			: `${lying.size} lying patients rest on their ${[...new Set(surfaces.map((s) => s.what))].join(', ')} (lowest point, torso and pelvis within ${LIE_TOL} m of the top, at most ${LIE_OVERHANG} m past an edge), also with the CT couch slid ${CT_SLIDES.join(', ')} m`,
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
			pelvis = pelvisY(g),
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

// ------------------------------------------------------------ (j) stand-up
// Seated actors that start a move: for the first STANDUP_FRAMES frames after the move starts, their
// leg column (legColumn) must not meet any furniture (furnitureBoxes), so the actor stands up out of
// its seat, not inside it, and walks off clear of it.
const STANDUP_FRAMES = 30;
function checkStandUp() {
	const J = NPC.JOURNEY,
		handoff = (key, idx) => {
			const h = NPC.HANDOFFS[key][idx];
			return [() => castActor(key, h), () => NPC.startActorHandoff(key, h)];
		},
		flows = [
			['consult -> education handoff', ...handoff('consult', 0)],
			['patientcare -> lobby handoff', ...handoff('patientcare', 0)],
			[`"${NPC.HANDOFFS.lobby[1].label}" handoff`, ...handoff('lobby', 1)],
			[
				"Mia's lobby journey move (lobby chair -> consult)",
				() => J.newPatient,
				// the journey's own move (beginMiaConsultSequence)
				() => NPC.moveJourneyActor(J.newPatient, 'lobby', 'consult', { x: -17.2, y: 0, z: -6.35 })
			]
		],
		rows = [],
		info = [];
	for (const [what, who, start] of flows) {
		NPC.resetTreatmentJourney(true);
		NPC.handoffTransitions.length = 0;
		step();
		const actor = who();
		if (!actor) {
			rows.push(`${what}: no actor`);
			continue;
		}
		const homeSeated = !!actor.userData.seated;
		start();
		let hitFrames = 0,
			first = null;
		for (let f = 1; f <= STANDUP_FRAMES; f++) {
			step();
			const legs = legColumn(actor),
				hits = furnitureBoxes().filter((b) => columnHits(legs, b));
			if (!hits.length) continue;
			hitFrames++;
			if (!first) {
				const p = worldPos(actor);
				first = `frame ${f}: ${label(actor, 'actor')} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) pose=${actor.userData.pose || 'none'}, ${describeColumn(legs)} meets ${hits.map(describeBox).join(' | ')}`;
			}
		}
		if (hitFrames)
			rows.push(
				`${what}: leg column in furniture in ${hitFrames} of the first ${STANDUP_FRAMES} frames; first ${first}`
			);
		const moving = NPC.handoffTransitions.some((t) => t.actor === actor),
			walking = NPC.workflowTransitions.some((t) => t.actor === actor);
		info.push(
			`${what}: ${homeSeated ? 'seated' : 'not seated'} at the start, ${moving || walking ? 'moving' : 'no move (still seated)'} after ${STANDUP_FRAMES} frames, ${hitFrames} frames with furniture`
		);
	}
	NPC.handoffTransitions.length = 0;
	NPC.resetTreatmentJourney(true);
	return {
		pass: rows.length === 0,
		summary: rows.length
			? `${rows.length} of ${flows.length} stand-ups put the legs in furniture`
			: `${flows.length} stand-up flows keep the leg column (r ${LEG_R} m, soles to knees) out of furniture for the first ${STANDUP_FRAMES} frames`,
		detail: rows,
		info
	};
}

// ------------------------------------------------- people and furniture (k, l, m)
const REST_CLEAR = 0.05, // (k) the least clearance between the body and furniture at rest
	REST_GRID = 6, // (k) body points per axis per mesh
	ROUTE_DEPTH = 0.02, // (l) the most the body may be inside furniture on any frame
	ROUTE_GRID = 4, // (l) body points per axis per mesh
	ROUTE_SEAT_R = 0.6, // (l) seats this close to a move's start, end or own seat are left out
	RING_R = 0.2, // (l) mover loops: the ring around the walker, with a point every 45 deg
	RING_DIRS = 8,
	RING_HEIGHTS = [0.1, 0.5, 0.9, 1.3],
	REST_GAP = 0.5, // (m) the least distance between two people at rest, root to root in x/z
	SEAT_KEEP = 0.3, // (m) the least distance from someone standing to an occupied seat anchor
	REST_FRAMES = 10, // frames after the journey reset before people are taken at rest
	HANDOFF_FRAMES = 5, // frames after the journey reset before hand-overs start
	CHECKIN_DESK = { x: -4.5, z: -2.05 }, // where "Have a seat" starts: from a lobby chair it is a no-op
	JOURNEY_LIMIT_S = 40 * 60;
// Count floors, as measured when these checks were written, so that (k), (l) and (m) cannot pass by
// measuring nobody: the people at rest after the journey reset (at least), the hand-overs followed
// and the moves of each journey (exactly). Every followed move has an end, measured or dropped.
const REST_FLOOR = 40,
	HANDOFF_ROUTES = 21,
	JOURNEY_ROUTES = { treatment: 11, newpatient: 27 };
// The movers whose person figure walks on the loop point itself; the escort pushes its wheelchair and
// the tech cart's person walks behind the cart, so their footprints are check (a)'s.
const RING_MOVERS = ['walker', 'visitor', 'therapist', 'ctRunner', 'linacRunner', 'hdrRunner'];
const furnitureFailures = []; // (k) and (l) failure positions, for --svg
const cm = (m) => `${(m * 100).toFixed(1)} cm`;
const xz = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
const roomAt = (x, z) =>
	NPC.ROOMS.find((r) => Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2)?.id ||
	'the corridors';

// The people as the page built them: every room cast, duty and journey figure, with each node's
// transform and visibility and the figure's userData. The rotation is kept as the Euler angles the
// page set (x, y, z and order), not as a quaternion: read back from a quaternion, a figure turned
// more than 90 deg about y becomes (pi, pi - y, pi), and the page's later `rotation.y = ...` would
// then turn it the mirrored way. Taken before any check runs, because checks
// (b) and (g) leave cast actors where their moves end and the journey reset only puts back its own
// actors.
function snapshotPeople() {
	const roots = new Set([
		...Object.values(NPC.ROOM_CAST).flatMap((arr) => arr.map((e) => e.g)),
		...NPC.castActors().map((c) => c.g),
		...NPC.journeyActors()
	]);
	return [...roots].map((g) => {
		const nodes = [];
		g.traverse((o) =>
			nodes.push({
				o,
				p: o.position.clone(),
				r: o.rotation.clone(),
				s: o.scale.clone(),
				v: o.visible
			})
		);
		return { g, parent: g.parent, data: { ...g.userData }, nodes };
	});
}
let peopleAtLoad = null;
// Puts the people back as the page built them, then resets the journey, with no hand-over under way.
function resetPeople() {
	for (const { g, parent, data, nodes } of peopleAtLoad) {
		if (parent && g.parent !== parent) parent.add(g);
		for (const n of nodes) {
			n.o.position.copy(n.p);
			n.o.rotation.copy(n.r);
			n.o.scale.copy(n.s);
			n.o.visible = n.v;
		}
		for (const k of Object.keys(g.userData)) if (!(k in data)) delete g.userData[k];
		Object.assign(g.userData, data);
	}
	NPC.resetTreatmentJourney(true);
	NPC.handoffTransitions.length = 0; // the reset leaves hand-overs alone
}
let furnitureCache = null;
// The furniture, built once at the journey reset while every room shows: the page hides the content
// of the rooms its camera cannot see (visibility.ts), and hidden meshes are not furniture.
function furniture() {
	if (furnitureCache) return furnitureCache;
	resetPeople();
	for (let i = 0; i < REST_FRAMES; i++) step();
	const culled = NPC.scene.children.filter((o) => o.name.startsWith('room-content:') && !o.visible);
	if (culled.length)
		setupError(`furniture: the camera culls ${culled.length} rooms (mode ${NPC.state.mode})`);
	furnitureCache = buildFurniture(NPC);
	if (!furnitureCache.list.length) setupError('furniture: no mesh classified as furniture');
	return furnitureCache;
}
// Names for people: the cast ids castActors gives (room:kind:index, duty:index), else the JOURNEY key.
function personIds() {
	const ids = new Map();
	for (const c of NPC.castActors()) ids.set(c.g, c.id);
	for (const [k, v] of Object.entries(NPC.JOURNEY))
		if (v && v.isObject3D && !ids.has(v)) ids.set(v, `JOURNEY.${k}`);
	return ids;
}
function person(g, ids) {
	const p = worldPos(g),
		id = ids.get(g) || 'person';
	return { g, id: `${id} (${label(g, id)})`, x: p.x, z: p.z, seated: isSeatedPose(g) };
}
// People at rest now: the visible cast, duty and journey actors, less lying patients (check h) and
// anyone in a move.
function peopleAtRest(ids) {
	const moving = new Set(
		[...NPC.workflowTransitions, ...NPC.handoffTransitions].map((t) => t.actor)
	);
	return [...ids.keys()]
		.filter(
			(g) => NPC.visibleInTree(g) && !g.userData.lying && !g.userData.inHandoff && !moving.has(g)
		)
		.map((g) => person(g, ids));
}

// ------------------------------------------------------------ journey driver
// Drives one patient journey ('treatment' or 'newpatient') through the page's own sequence, from the
// reset to 'done': on every frame where the journey waits (not busy, no camera travel) it is
// advanced. onFrame runs after every frame.
function driveJourney(kind, onFrame) {
	const J = NPC.JOURNEY;
	NPC.resetTreatmentJourney(true);
	NPC.setJourneyKind(kind, true);
	NPC.startTreatmentJourney();
	for (let f = 0; J.stage !== 'done'; f++) {
		if (f * STEP_MS > JOURNEY_LIMIT_S * 1000)
			setupError(
				`the ${kind} journey did not reach 'done' within ${JOURNEY_LIMIT_S / 60} simulated minutes (stage '${J.stage}')`
			);
		step();
		onFrame();
		if (!J.busy && !NPC.state.travel && J.stage !== 'done') NPC.advanceTreatmentJourney();
	}
}

// ---------------------------------------------------------- moves (k, l, m)
// "Have a seat", HANDOFFS.lobby[1]: the lobby patient's hand-over to a lobby chair (its final point).
// Checked, so that a reordered HANDOFFS fails here rather than skipping its check-in-desk start.
function haveASeat() {
	const h = NPC.HANDOFFS.lobby?.[1];
	if (!h || h.target !== 'lobby' || (h.actor || 'patient') !== 'patient' || !h.final)
		setupError(
			`HANDOFFS.lobby[1] is not "Have a seat" (target 'lobby', actor 'patient', a final point): ${JSON.stringify(h && { target: h.target, actor: h.actor, final: h.final })}`
		);
	return h;
}
// Starts the hand-overs `picks` ([key, index] pairs) together, from the journey reset, as the page
// starts them, and steps until each has ended: no hand-over entry refers to its actor and the actor
// is out of its hand-over. "Have a seat" starts from the check-in desk. onFrame(run) runs on every
// frame of each hand-over still under way.
function runHandoffs(picks, onFrame = null) {
	resetPeople();
	for (let i = 0; i < HANDOFF_FRAMES; i++) step();
	const seat = haveASeat();
	const runs = picks.map(([key, idx]) => {
		const h = NPC.HANDOFFS[key][idx],
			actor = castActor(key, h),
			name = `hand-over ${key}[${idx}] -> ${h.target}`;
		if (h === seat) {
			NPC.setActorSeated(actor, false);
			actor.position.set(CHECKIN_DESK.x, 0, CHECKIN_DESK.z);
		}
		const start = worldPos(actor),
			own = actor.userData.seated ? actor.userData.seatAnchor : null;
		NPC.startActorHandoff(key, h);
		const entry = NPC.handoffTransitions.find((t) => t.actor === actor);
		if (!entry) setupError(`${name}: no move started`);
		return { key, idx, h, actor, name, start, own, entry, ended: false };
	});
	const underWay = (r) =>
		NPC.handoffTransitions.some((t) => t.actor === r.actor) || r.actor.userData.inHandoff;
	for (let f = 0; runs.some((r) => !r.ended); f++) {
		if (f > 30 * 60)
			setupError(
				`${runs
					.filter((r) => !r.ended)
					.map((r) => r.name)
					.join(', ')}: still under way after 60 s`
			);
		step();
		for (const r of runs)
			if (!r.ended) {
				if (underWay(r)) onFrame?.(r);
				else r.ended = true;
			}
	}
	return runs;
}
// (l) a move to follow. The seats it may touch: those within ROUTE_SEAT_R of where it starts, of its
// curve's ends and of the seat its actor rises from.
function newRoute(F, kind, name, actor, entry, start, own) {
	const pts = [start, entry.curve.getPoint(0), entry.curve.getPoint(1)];
	if (own) pts.push(NPC.seatInWorld(own));
	const near = NPC.SEATS.map(NPC.seatInWorld).filter((s) =>
		pts.some((p) => Math.hypot(s.x - p.x, s.z - p.z) < ROUTE_SEAT_R)
	);
	return { kind, name, actor, skip: seatMeshes(F, near), frames: 0, worst: 0, at: null, path: [] };
}
// (l) one frame of a move: the body (ROUTE_GRID points per axis per mesh) against furniture.
function followRoute(F, r) {
	const frame = r.frames++;
	if (!NPC.visibleInTree(r.actor)) return;
	const p = worldPos(r.actor),
		m = measure(F, r.actor, r.skip, bodyPoints(r.actor, ROUTE_GRID));
	r.path.push([p.x, p.z]);
	if (m.depth > r.worst) {
		r.worst = m.depth;
		r.at = { frame, x: p.x, z: p.z, hit: m.hits[0] };
	}
}
// (k) one person: its body (REST_GRID points per axis per mesh) against furniture, less the seat it
// sits on.
function restReading(F, moment, p) {
	const own = p.g.userData.seated && p.g.userData.seatAnchor,
		skip = own ? seatMeshes(F, [NPC.seatInWorld(own)]) : new Set();
	return { moment, ...p, m: measure(F, p.g, skip, bodyPoints(p.g, REST_GRID)) };
}
// (m) a problem, kept once with the number of moments it was seen at.
function crowd(R, key, text) {
	const c = R.crowding.get(key);
	if (c) c.n++;
	else R.crowding.set(key, { text, n: 1 });
}
// (m) one moment: each of `ends` against the other ends and each of `others`, then the seat anchors
// over `everyone` at rest.
function occupancy(R, kind, moment, ends, others, everyone) {
	R.moments[kind]++;
	ends.forEach((a, i) => {
		for (const b of [...ends.slice(i + 1), ...others]) {
			const d = Math.hypot(a.x - b.x, a.z - b.z);
			if (d < REST_GAP)
				crowd(
					R,
					`${a.id} ${xz(a)} ${b.id} ${xz(b)}`,
					`${moment}: ${a.id} at ${xz(a)} is ${d.toFixed(2)} m from ${b.id} at ${xz(b)} (limit ${REST_GAP} m)`
				);
		}
	});
	const seats = NPC.SEATS.map(NPC.seatInWorld),
		held = new Map();
	for (const p of everyone) {
		if (!p.seated) continue;
		let best = null;
		seats.forEach((s, i) => {
			const d = Math.hypot(s.x - p.x, s.z - p.z);
			if (d <= SEAT_RADIUS && (!best || d < best.d)) best = { i, d };
		});
		if (best) held.set(best.i, [...(held.get(best.i) || []), p]);
	}
	for (const [i, sitters] of held) {
		const s = seats[i];
		if (sitters.length > 1)
			crowd(
				R,
				`seat ${i} ${sitters.map((p) => p.id).join(' ')}`,
				`${moment}: the ${s.kind} seat anchor at ${xz(s)} holds ${sitters.length} sitters: ${sitters.map((p) => p.id).join(', ')}`
			);
		for (const p of everyone) {
			const d = Math.hypot(p.x - s.x, p.z - s.z);
			if (!p.seated && d < SEAT_KEEP)
				crowd(
					R,
					`seat ${i} ${p.id}`,
					`${moment}: ${p.id} stands at ${xz(p)}, ${d.toFixed(2)} m from the ${s.kind} seat anchor at ${xz(s)} that ${sitters[0].id} sits on (limit ${SEAT_KEEP} m)`
				);
		}
	}
}
// (k) and (m) at the end of a move: the actor's rest clearance, and its distance from the people at
// rest (only the residents of `room` when given) and from the seats. A hidden or lying actor is left
// out.
function moveEnd(R, kind, moment, g, room) {
	if (!NPC.visibleInTree(g) || g.userData.lying) {
		R.hidden.push(moment);
		return;
	}
	const ids = personIds(),
		me = person(g, ids),
		others = peopleAtRest(ids).filter((p) => p.g !== g);
	R.ends.push(restReading(R.F, moment, me));
	occupancy(
		R,
		kind,
		moment,
		[me],
		room ? others.filter((p) => roomAt(p.x, p.z) === room) : others,
		[me, ...others]
	);
}
let runsCache = null;
// What (k), (l) and (m) read, gathered in one pass: the people at rest after the journey reset;
// every hand-over run alone (followed frame by frame, then its end); the hand-overs into each room
// started together (their ends); both journeys (each move followed frame by frame, then its end).
function furnitureRuns() {
	if (runsCache) return runsCache;
	const F = furniture(),
		R = (runsCache = {
			F,
			rest: [],
			ends: [],
			routes: [],
			hidden: [],
			crowding: new Map(),
			moments: { rest: 0, alone: 0, together: 0, journey: 0 },
			journeyMoves: {}
		});
	resetPeople();
	for (let i = 0; i < REST_FRAMES; i++) step();
	const ids = personIds(),
		atRest = peopleAtRest(ids),
		moment0 = `at rest ${REST_FRAMES} frames after the journey reset`;
	if (atRest.length < REST_FLOOR)
		setupError(
			`${atRest.length} people at rest after the journey reset, fewer than the ${REST_FLOOR} measured when (k) and (m) were written`
		);
	for (const p of atRest) R.rest.push(restReading(F, moment0, p));
	occupancy(R, 'rest', moment0, atRest, [], atRest);
	// each hand-over alone; the hand-overs into one room with different actors are grouped
	const byTarget = new Map();
	for (const [key, list] of Object.entries(NPC.HANDOFFS))
		list.forEach((h, idx) => {
			const [run] = runHandoffs([[key, idx]], (r) => {
				r.route ||= newRoute(F, 'hand-over', r.name, r.actor, r.entry, r.start, r.own);
				followRoute(F, r.route);
			});
			if (!run.route) setupError(`${run.name}: ended before its first frame`);
			R.routes.push(run.route);
			moveEnd(R, 'alone', `${run.name} (alone), at its end`, run.actor, h.target);
			const group = byTarget.get(h.target) || [];
			if (!group.some(([k, i]) => castActor(k, NPC.HANDOFFS[k][i]) === run.actor))
				group.push([key, idx]);
			byTarget.set(h.target, group);
		});
	// the hand-overs into one room started together
	for (const [target, picks] of byTarget) {
		if (picks.length < 2) continue;
		const runs = runHandoffs(picks),
			ids = personIds(),
			actors = new Set(runs.map((r) => r.actor)),
			ends = runs.map((r) => {
				const p = person(r.actor, ids);
				return { ...p, id: `${p.id}, the end of ${r.key}[${r.idx}]` };
			}),
			others = peopleAtRest(ids).filter((p) => !actors.has(p.g));
		occupancy(
			R,
			'together',
			`hand-overs into ${target} started together (${picks.map(([k, i]) => `${k}[${i}]`).join(', ')}), at their end`,
			ends,
			others.filter((p) => roomAt(p.x, p.z) === target),
			[...ends, ...others]
		);
	}
	// both journeys, every move from the frame its entry appears to the frame it leaves
	for (const kind of ['treatment', 'newpatient']) {
		resetPeople();
		const live = new Map();
		let n = 0;
		driveJourney(kind, () => {
			for (const t of NPC.workflowTransitions)
				if (!live.has(t)) {
					const who = personIds().get(t.actor) || label(t.actor, 'actor'),
						own = t.rise || t.actor.userData.seated ? t.actor.userData.seatAnchor : null,
						name = `${kind} journey move ${++n} (${NPC.JOURNEY.stage}): ${who} ${t.fromId} -> ${t.toId}`,
						route = newRoute(F, 'journey move', name, t.actor, t, worldPos(t.actor), own);
					live.set(t, route);
					R.routes.push(route);
				}
			for (const [t, route] of live) {
				if (NPC.workflowTransitions.includes(t)) followRoute(F, route);
				else {
					live.delete(t);
					moveEnd(R, 'journey', `${route.name}, at its end`, t.actor, null);
				}
			}
		});
		if (live.size)
			setupError(`the ${kind} journey reached 'done' with ${live.size} moves still under way`);
		R.journeyMoves[kind] = n;
	}
	NPC.setJourneyKind('treatment', true);
	resetPeople();
	// the count floors: every hand-over and journey move followed, and every one of them has an end
	const handoffs = R.routes.filter((r) => r.kind === 'hand-over').length,
		moves = Object.values(R.journeyMoves).reduce((a, b) => a + b, 0),
		counts = `${handoffs} hand-overs, journey moves ${Object.entries(R.journeyMoves)
			.map(([k, v]) => `${k} ${v}`)
			.join(', ')}`;
	if (
		handoffs !== HANDOFF_ROUTES ||
		Object.entries(JOURNEY_ROUTES).some(([k, v]) => R.journeyMoves[k] !== v)
	)
		setupError(
			`(l) followed ${counts}; expected exactly ${HANDOFF_ROUTES} hand-overs and journey moves treatment ${JOURNEY_ROUTES.treatment}, newpatient ${JOURNEY_ROUTES.newpatient}`
		);
	if (R.ends.length + R.hidden.length !== handoffs + moves)
		setupError(
			`${R.ends.length} move ends measured and ${R.hidden.length} dropped, for ${handoffs + moves} moves followed`
		);
	return R;
}

// ------------------------------------------------------------ (k) rest clear
function checkRestClearance() {
	const R = furnitureRuns(),
		all = [...R.rest, ...R.ends],
		bad = all
			.filter((e) => e.m.clearance < REST_CLEAR)
			.sort((a, b) => a.m.clearance - b.m.clearance),
		badRest = bad.filter((e) => R.rest.includes(e)).length,
		where = ({ m }) =>
			m.hits.length
				? `${cm(m.hits[0].depth)} into ${describe(m.hits[0].rec)} (${m.hits[0].part})`
				: `${cm(m.clearance)} from ${describe(m.nearest.rec)} (${m.nearest.part})`;
	furnitureFailures.push(...bad);
	return {
		pass: bad.length === 0,
		summary: bad.length
			? `${bad.length} of ${all.length} people at rest are inside furniture or less than ${REST_CLEAR} m from it: ${badRest} of ${R.rest.length} after the journey reset, ${bad.length - badRest} of ${R.ends.length} at the end of a hand-over or journey move`
			: `all ${all.length} people at rest keep at least ${REST_CLEAR} m from furniture: ${R.rest.length} after the journey reset, ${R.ends.length} at the end of a hand-over or journey move`,
		detail: bad.map((e) => `${e.moment}: ${e.id} at ${xz(e)}: ${where(e)}`),
		info: [
			`counts: ${R.rest.length} at rest after the journey reset (floor ${REST_FLOOR}); ${R.ends.length} move ends measured and ${R.hidden.length} dropped, of ${R.ends.length + R.hidden.length} moves followed`,
			'not measured: lying patients (check h)',
			...R.hidden.map((m) => `not measured, the actor hidden or lying: ${m}`)
		]
	};
}

// --------------------------------------------------------- (l) routes clear
// Mover loops: a RING_R ring (RING_DIRS points at each of RING_HEIGHTS) around SAMPLES points of each
// RING_MOVERS loop, against furniture; the deepest point per mover.
function moverRings(F) {
	return RING_MOVERS.map((id) => {
		const m = NPC.movers[names.indexOf(id)];
		if (!m) setupError(`mover '${id}' not found`);
		let worst = 0,
			at = null;
		for (let i = 0; i < SAMPLES; i++) {
			const c = m.curve.getPointAt(i / SAMPLES);
			for (const y of RING_HEIGHTS)
				for (let k = 0; k < RING_DIRS; k++) {
					const a = (2 * Math.PI * k) / RING_DIRS,
						q = { x: c.x + RING_R * Math.cos(a), y, z: c.z + RING_R * Math.sin(a) };
					for (const idx of F.near(q.x, q.z)) {
						const d = -sdf(F.list[idx], q);
						if (d > worst) {
							worst = d;
							at = { x: c.x, z: c.z, y, rec: F.list[idx] };
						}
					}
				}
		}
		return { id, worst, at };
	});
}
function checkRoutes() {
	const R = furnitureRuns(),
		bad = R.routes.filter((r) => r.worst > ROUTE_DEPTH).sort((a, b) => b.worst - a.worst),
		// a route whose actor is hidden on every frame measures nothing, so it fails
		unseen = R.routes.filter((r) => r.path.length === 0),
		rings = moverRings(R.F),
		badRings = rings.filter((r) => r.worst > ROUTE_DEPTH),
		count = (list, kind) => list.filter((r) => r.kind === kind).length,
		routes = `${count(R.routes, 'hand-over')} hand-overs and ${count(R.routes, 'journey move')} journey moves`;
	furnitureFailures.push(...bad.map((r) => r.at), ...badRings.map((r) => r.at));
	return {
		pass: bad.length === 0 && unseen.length === 0 && badRings.length === 0,
		summary: [
			bad.length
				? `${bad.length} of ${R.routes.length} routes go more than ${ROUTE_DEPTH} m into furniture (${count(bad, 'hand-over')} hand-overs, ${count(bad, 'journey move')} journey moves)`
				: `every frame of ${routes} keeps the body within ${ROUTE_DEPTH} m of furniture`,
			...(unseen.length
				? [`${unseen.length} of ${R.routes.length} routes have the actor hidden on every frame`]
				: []),
			badRings.length
				? `mover loops: the ${RING_R} m ring of ${badRings.length} of ${rings.length} walkers goes more than ${ROUTE_DEPTH} m into furniture`
				: `mover loops: the ${RING_R} m ring of ${rings.length} walkers stays within ${ROUTE_DEPTH} m of furniture`
		].join('; '),
		detail: [
			...unseen.map((r) => `${r.name}: the actor is hidden on all ${r.frames} frames`),
			...badRings.map(
				(r) =>
					`mover loop ${r.id}: the ${RING_R} m ring at ${r.at.y} m high is ${cm(r.worst)} into ${describe(r.at.rec)}, at loop point ${xz(r.at)} in ${roomAt(r.at.x, r.at.z)}`
			),
			...bad.map(
				(r) =>
					`${r.name}: ${cm(r.worst)} into ${describe(r.at.hit.rec)} (${r.at.hit.part}) at frame ${r.at.frame} of ${r.frames}, at ${xz(r.at)} in ${roomAt(r.at.x, r.at.z)}`
			)
		],
		info: [
			`routes followed: ${routes} (exactly ${HANDOFF_ROUTES} and ${JOURNEY_ROUTES.treatment} + ${JOURNEY_ROUTES.newpatient} required); ${R.routes.length - unseen.length} with at least one visible frame`,
			`mover loop rings, deepest: ${rings.map((r) => `${r.id} ${cm(r.worst)}`).join(', ')}; the escort and the tech cart are left to check (a)`
		]
	};
}

// ------------------------------------------------------------ (m) occupancy
function checkOccupancy() {
	const R = furnitureRuns(),
		rows = [...R.crowding.values()],
		n = R.moments,
		moments = `${n.rest + n.alone + n.together + n.journey} moments (after the journey reset, ${n.alone} hand-over ends alone, ${n.together} rooms' hand-overs started together, ${n.journey} journey-move ends)`;
	return {
		pass: rows.length === 0,
		summary: rows.length
			? `${rows.length} occupancy problems over ${moments}`
			: `over ${moments}: people at rest at least ${REST_GAP} m apart, one sitter per seat anchor, nobody standing within ${SEAT_KEEP} m of an occupied one`,
		detail: rows.map((c) => (c.n > 1 ? `${c.text} (seen at ${c.n} moments)` : c.text))
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
	i: checkWheelchair,
	j: checkStandUp,
	k: checkRestClearance,
	l: checkRoutes,
	m: checkOccupancy
};
peopleAtLoad = snapshotPeople();
let failed = 0;
for (const letter of LETTERS) {
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
		if (r.detail.length > MAX_DETAIL) console.log(`  ... and ${r.detail.length - MAX_DETAIL} more`);
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
	// furniture (checks k, l and m): each mesh's x/z bounds
	for (const { b } of furniture().list)
		out.push(
			`<rect x="${f(b.min.x)}" y="${f(b.min.z)}" width="${f(b.max.x - b.min.x)}" height="${f(b.max.z - b.min.z)}" fill="#efe8da" stroke="#d6cbb4" stroke-width="0.02"/>`
		);
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
	// check (l) routes: the actor's position on every frame, one colour per route (hover for its name)
	const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	(runsCache?.routes || []).forEach((r, i) => {
		if (r.path.length < 2) return;
		out.push(
			`<polyline points="${r.path.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="none" stroke="hsl(${((i * 137.5) % 360).toFixed(0)}, 75%, 40%)" stroke-width="0.05"><title>${esc(r.name)}</title></polyline>`
		);
	});
	for (const h of wallHits)
		out.push(`<circle cx="${f(h.x)}" cy="${f(h.z)}" r="0.22" fill="#e00"/>`);
	for (const e of spacingEvents)
		out.push(`<circle cx="${f(e.x)}" cy="${f(e.z)}" r="0.22" fill="#f90"/>`);
	for (const e of furnitureFailures)
		out.push(
			`<circle cx="${f(e.x)}" cy="${f(e.z)}" r="0.16" fill="#e00" stroke="#600" stroke-width="0.03"/>`
		);
	out.push('</svg>');
	fs.mkdirSync(path.dirname(path.resolve(svgPath)), { recursive: true });
	fs.writeFileSync(svgPath, out.join('\n'));
	console.log(`SVG written: ${svgPath}`);
}

process.exit(failed ? 1 : 0);
