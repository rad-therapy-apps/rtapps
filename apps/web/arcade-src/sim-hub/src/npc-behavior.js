/* RTApps (#77 sim-hub modularization, task 6): NPC movement, duties, exchanges and handoffs —
   the ambient mover registry (path-walkers, patrols), duty-pose idle animation, staff/patient
   speech exchanges, and the corridor-routed actor-handoff system used when a staff/patient
   pair transitions between rooms. Verbatim extractions from main.js. Companion to ./npc.js
   (task 6's other module) — `personFigure`/`setNpcRole`/`poseCharacter`/`faceNpcToward`/
   `npcBubble`/`bubbleVis` are owned there and imported back here. A handful of symbols stay
   owned by main.js — `JOURNEY` (future journey module, task 9),
   `ROOM_CAST`/`doorPoint`/`setDoorTarget`/`journeyActorRoom`/`corridorNodesFromHub`/
   `shortestCorridorRoute`/`shortestCorridorRouteFromPosition`/`makePolylineCurve`/`doors`
   (walk/corridor routing, task 8, and still-resident journey state) — because other
   still-resident systems read or write them too, so main.js exports them rather than
   duplicating that state here. `setupAmbulance` moved to ./equipment.js in task 7 and is
   imported from there instead. */
import * as THREE from 'three';
import { zeroY } from './helpers.js';
import { scene, camera } from './scene.js';
import { S } from './state.js';
import { corridorAnchor } from './rooms.js';
import { wheelchairObject, medCartObject, vehicleObject } from './props.js';
import {
	personFigure,
	setNpcRole,
	poseCharacter,
	faceNpcToward,
	faceAlong,
	npcBubble,
	bubbleVis
} from './npc.js';
import {
	JOURNEY,
	roomById,
	ROOM_CAST,
	doors,
	doorPoint,
	setDoorTarget,
	journeyActorRoom,
	corridorNodesFromHub,
	shortestCorridorRoute,
	shortestCorridorRouteFromPosition,
	makePolylineCurve
} from './main.js';
import { setupAmbulance } from './equipment.js';

export const movers = [];
const dutyActors = [];
export const interactionScenes = [];
export function registerDutyActor(group, mode = 'idle', offset = Math.random()) {
	dutyActors.push({ group, mode, offset });
	return group;
}
export function registerNpcExchange(a, b, exchange, period = 13, offset = Math.random()) {
	if (!a || !b) return;
	interactionScenes.push({
		a,
		b,
		exchange,
		period,
		offset,
		bubbleA: npcBubble(a, 'staff'),
		bubbleB: npcBubble(b, b.userData.npcRole === 'Patient' ? 'patient' : 'staff')
	});
}
export function updateDutyAnimations(sec) {
	for (const d of dutyActors) {
		const rig = d.group.userData?.walkRig,
			face = d.group.userData?.faceRig;
		if (!rig) continue;
		if (
			typeof JOURNEY !== 'undefined' &&
			JOURNEY.active &&
			d.group === JOURNEY.patient &&
			JOURNEY.stage === 'waiting'
		) {
			poseCharacter(d.group, 'seated');
			continue;
		}
		const a = sec * 1.7 + d.offset * 6.283,
			s = Math.sin(a),
			s2 = Math.sin(a * 0.67 + 0.8);
		if (d.mode === 'desk') {
			rig.armLP.rotation.x = -1.02 + 0.09 * s;
			rig.armRP.rotation.x = -1.12 - 0.08 * s2;
			rig.armLP.rotation.z = 0.04 * s;
			rig.armRP.rotation.z = -0.04 * s2;
		} else if (d.mode === 'console') {
			rig.armLP.rotation.x = -0.9 + 0.11 * s;
			rig.armRP.rotation.x = -1.18 + 0.1 * s2;
			rig.armLP.rotation.z = 0.15 + 0.04 * s;
			rig.armRP.rotation.z = -0.18 - 0.04 * s2;
		} else if (d.mode === 'gesture') {
			rig.armLP.rotation.x = -0.38 + 0.14 * s2;
			rig.armRP.rotation.x = -1.02 - 0.34 * Math.max(0, s);
			rig.armRP.rotation.z = -0.2 - 0.08 * s;
		} else if (d.mode === 'support') {
			rig.armLP.rotation.x = -0.58 + 0.1 * s;
			rig.armRP.rotation.x = -0.7 + 0.12 * s2;
			rig.armLP.rotation.z = 0.06 * s;
			rig.armRP.rotation.z = -0.06 * s2;
		} else if (d.mode === 'inspect') {
			rig.armLP.rotation.x = -0.25 + 0.08 * s;
			rig.armRP.rotation.x = -1.28 + 0.18 * s2;
			rig.armRP.rotation.z = -0.34;
		} else {
			rig.armLP.rotation.x = 0.04 * s;
			rig.armRP.rotation.x = -0.04 * s;
			rig.legLP.rotation.x = 0;
			rig.legRP.rotation.x = 0;
		}
		if (face) {
			face.head.rotation.y = 0.07 * Math.sin(a * 0.45);
			face.head.rotation.z = 0.025 * Math.sin(a * 0.31);
			face.torso.rotation.y = 0.02 * Math.sin(a * 0.25);
		}
	}
}
export function updateNpcExchanges(sec) {
	if (typeof JOURNEY !== 'undefined' && JOURNEY.active) {
		for (const sc of interactionScenes) {
			bubbleVis(sc.bubbleA, false);
			bubbleVis(sc.bubbleB, false);
		}
		return;
	}
	const cam = camera.position;
	const pa = new THREE.Vector3(),
		pb = new THREE.Vector3();
	for (const sc of interactionScenes) {
		if (
			sc.a.userData?.handoffCompleted ||
			sc.b.userData?.handoffCompleted ||
			sc.a.userData?.inHandoff ||
			sc.b.userData?.inHandoff
		) {
			bubbleVis(sc.bubbleA, false);
			bubbleVis(sc.bubbleB, false);
			continue;
		}
		sc.a.getWorldPosition(pa);
		sc.b.getWorldPosition(pb);
		const mid = pa.clone().add(pb).multiplyScalar(0.5),
			near = cam.distanceTo(mid) < 15 && S.mode !== 'overview';
		const t = (sec + sc.offset * sc.period) % sc.period;
		bubbleVis(sc.bubbleA, false);
		bubbleVis(sc.bubbleB, false);
		if (!near || t > 8.4) continue;
		faceNpcToward(sc.a, sc.b);
		faceNpcToward(sc.b, sc.a);
		const idx = Math.min(sc.exchange.length - 1, Math.floor(t / 2.1)),
			line = sc.exchange[idx];
		if (!line) continue;
		const bubble = line.who === 'b' ? sc.bubbleB : sc.bubbleA;
		bubble.textContent = line.text;
		bubbleVis(bubble, true);
	}
}
function moverPath(points, closed = true) {
	return new THREE.CatmullRomCurve3(
		points.map((p) => (p instanceof THREE.Vector3 ? p : new THREE.Vector3(...p))),
		closed,
		'catmullrom',
		0.12
	);
}
function addMover(
	group,
	points,
	speed = 0.03,
	closed = true,
	offset = Math.random(),
	yawOffset = 0
) {
	scene.add(group);
	movers.push({ group, curve: moverPath(points, closed), speed, offset, yawOffset });
}
export function updateMovers(sec) {
	for (const m of movers) {
		const u = (sec * m.speed + m.offset) % 1,
			p = m.curve.getPointAt(u),
			n = m.curve.getPointAt((u + 0.01) % 1);
		m.group.position.copy(p);
		const yaw = Math.atan2(n.x - p.x, n.z - p.z);
		m.group.rotation.y = yaw + (m.yawOffset || 0);
		m.group.position.y += Math.sin(sec * 1.7 + m.offset * 6.28) * 0.01;
		const swing = Math.sin(sec * 8 + m.offset * 6.28) * 0.42;
		m.group.traverse((o) => {
			const rig = o.userData?.walkRig;
			if (rig) {
				rig.armLP.rotation.x = swing;
				rig.armRP.rotation.x = -swing;
				rig.legLP.rotation.x = -swing * 0.85;
				rig.legRP.rotation.x = swing * 0.85;
			}
		});
	}
}
export function addMovingActors() {
	const walker = setNpcRole(
		personFigure(0x4988a7, 0x364148, 0xc59062, { female: true, hairColor: 0x2c1d16 }),
		'Radiation Therapist',
		'Moving between patient-services areas and the clinical corridor.'
	);
	addMover(
		walker,
		[
			[-6, 0, 3],
			[-18, 0, 3],
			[-30, 0, 3],
			[-42, 0, 3],
			[-42, 0, 0],
			[-42, 0, -3],
			[-30, 0, -3],
			[-18, 0, -3],
			[-6, 0, -3],
			[-6, 0, 0]
		],
		0.016,
		true,
		0.12
	);
	const escort = new THREE.Group();
	escort.userData.suppressDuringJourney = true;
	const wc = wheelchairObject(0.92, true);
	escort.add(wc);
	const pusher = setNpcRole(
		personFigure(0x5d8b66, 0x334041, 0x7b5237, { hairColor: 0x1a1411 }),
		'Patient Care Technician',
		'Assisting with safe wheelchair transport and mobility support.'
	);
	pusher.position.set(0, 0, -0.82);
	escort.add(pusher);
	addMover(
		escort,
		[
			[17, 0, 0],
			[29, 0, 0],
			[41, 0, 0],
			[52, 0, 0],
			[52, 0, 3.2],
			[41, 0, 3.2],
			[29, 0, 3.2],
			[17, 0, 3.2]
		],
		0.014,
		true,
		0.42
	);
	const techCart = new THREE.Group();
	const cart = medCartObject(0.95, 0xc39b70);
	techCart.add(cart);
	const staff = setNpcRole(
		personFigure(0xad7c4d, 0x334148, 0xd5a377, { female: true, hairColor: 0x231913 }),
		'Medical Physicist',
		'Transporting QA equipment between the physics and technical areas.'
	);
	staff.position.set(0, 0, -0.72);
	escort.userData = escort.userData || {};
	techCart.add(staff);
	addMover(
		techCart,
		[
			[0, 0, -9],
			[0, 0, -18],
			[0, 0, -31],
			[0, 0, -45],
			[0, 0, -58],
			[0, 0, -45],
			[0, 0, -31],
			[0, 0, -18]
		],
		0.013,
		true,
		0.68
	);
	const visitor = setNpcRole(
		personFigure(0xa56d6d, 0x414c57, 0xf1c8a4, { female: true, hairColor: 0x4b3126 }),
		'Patient / Visitor',
		'Navigating the center for an appointment.'
	);
	visitor.userData.suppressDuringJourney = true;
	addMover(
		visitor,
		[
			[-10, 0, 0],
			[0, 0, 0],
			[10, 0, 0],
			[10, 0, 6],
			[0, 0, 6],
			[-10, 0, 6]
		],
		0.015,
		true,
		0.31
	);
	const therapist = setNpcRole(
		personFigure(0x6f90c5, 0x34424b, 0x5f3f2b, { hairColor: 0x120f0d }),
		'Radiation Therapist',
		'Circulating between the LINAC control area and treatment wing.'
	);
	addMover(
		therapist,
		[
			[52, 0, 3.0],
			[58, 0, 3.0],
			[64, 0, 3.0],
			[64, 0, 10],
			[64, 0, 20],
			[64, 0, 10],
			[64, 0, 3.0],
			[58, 0, 3.0]
		],
		0.014,
		true,
		0.74
	);
	const car = vehicleObject('car', 0x6588bf);
	addMover(
		car,
		[
			[-34, 0, 27],
			[-10, 0, 27],
			[18, 0, 27],
			[50, 0, 27],
			[50, 0, 34],
			[18, 0, 34],
			[-10, 0, 34],
			[-34, 0, 34]
		],
		0.011,
		true,
		0.2,
		-Math.PI / 2
	);
	const ambulance = vehicleObject('ambulance');
	ambulance.position.set(-42, 0, 20);
	ambulance.rotation.y = Math.atan2(1, 0) - Math.PI / 2;
	scene.add(ambulance);
	setupAmbulance(ambulance);
	const shuttle = vehicleObject('van', 0x8db292);
	addMover(
		shuttle,
		[
			[-48, 0, 18],
			[-30, 0, 18],
			[-12, 0, 18],
			[-12, 0, 12],
			[-30, 0, 12],
			[-48, 0, 12]
		],
		0.01,
		true,
		0.82,
		-Math.PI / 2
	);
	const ctRunner = setNpcRole(
		personFigure(0x5f8ab6, 0x36424c, 0xb67e59, { female: true, hairColor: 0x2a1b14 }),
		'CT Simulation Therapist',
		'Moving between the CT control room and CT simulator to support setup and scanning workflow.',
		'ctsim'
	);
	addMover(
		ctRunner,
		[
			[31.5, 0, -4.8],
			[31.5, 0, 0],
			[24, 0, 0],
			[24, 0, -4.2],
			[24, 0, -9],
			[31.5, 0, -9],
			[31.5, 0, -4.8]
		],
		0.013,
		true,
		0.17
	);
	const linacRunner = setNpcRole(
		personFigure(0x6f90c5, 0x36424a, 0x8a5c3e, { hairColor: 0x160f0d }),
		'Radiation Therapist',
		'Walking the treatment branch between the LINAC control area and the vault approach.',
		'linaccontrol'
	);
	addMover(
		linacRunner,
		[
			[52, 0, 3],
			[58, 0, 3],
			[64, 0, 3],
			[64, 0, -8],
			[64, 0, -18],
			[64, 0, -8],
			[64, 0, 3],
			[58, 0, 3]
		],
		0.0125,
		true,
		0.53
	);
	const hdrRunner = setNpcRole(
		personFigure(0x7b9d86, 0x37454d, 0xd2a17c, { female: true, hairColor: 0x2a1912 }),
		'Procedure Nurse',
		'Moving between the HDR suite and nearby clinical support space.',
		'hdr'
	);
	addMover(
		hdrRunner,
		[
			[58, 0, 0],
			[64, 0, 0],
			[70, 0, 0],
			[70, 0, 7],
			[64, 0, 7],
			[58, 0, 7]
		],
		0.0118,
		true,
		0.29
	);
}

export function walkSwing(g, sec) {
	const s = Math.sin(sec * 8) * 0.42;
	g.traverse((o) => {
		const r = o.userData?.walkRig;
		if (r) {
			r.armLP.rotation.x = s;
			r.armRP.rotation.x = -s;
			r.legLP.rotation.x = -s * 0.85;
			r.legRP.rotation.x = s * 0.85;
		}
	});
}
export function advanceRoute(o, route, st, speed, dt, off) {
	if (st.i >= route.length - 1) return true;
	const a = route[st.i],
		b = route[st.i + 1];
	const dx = b[0] - a[0],
		dz = b[1] - a[1],
		len = Math.hypot(dx, dz) || 1;
	st.d = (st.d || 0) + speed * dt;
	const f = st.d / len;
	if (f >= 1) {
		o.position.set(b[0], 0, b[1]);
		st.i++;
		st.d = 0;
		if (st.i < route.length - 1) {
			const c = route[st.i + 1];
			faceAlong(o, c[0] - b[0], c[1] - b[1], off);
		}
		return st.i >= route.length - 1;
	}
	o.position.set(a[0] + dx * f, 0, a[1] + dz * f);
	faceAlong(o, dx, dz, off);
	return false;
}
export function advancePed(o, from, to, st, speed, dt) {
	const dx = to.x - from.x,
		dz = to.z - from.z,
		len = Math.hypot(dx, dz) || 1;
	st.d = (st.d || 0) + speed * dt;
	const f = st.d / len;
	if (f >= 1) {
		o.position.set(to.x, 0, to.z);
		return true;
	}
	o.position.set(from.x + dx * f, 0, from.z + dz * f);
	o.rotation.y = Math.atan2(dx, dz);
	return false;
}

export function setActorSeated(actor, seated) {
	if (!actor) return;
	actor.position.y = seated ? -0.35 : 0;
	poseCharacter(actor, seated ? 'seated' : 'neutral');
}

export function movementPathFor(actor, fromId, toId, final) {
	const h = { target: toId, actor: 'patient', final: [final.x, 0, final.z] },
		pts = buildActorHandoffPath(actor, fromId, toId, h);
	return makePolylineCurve(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])));
}

const handoffTransitions = [];
function castActorForHandoff(key, h) {
	const arr = ROOM_CAST[key] || [],
		kind = h.actor || 'patient',
		actors = arr.filter((x) => x.kind === kind);
	return actors[h.actorIndex || 0]?.g || null;
}
function actorFinalPoint(targetId, h) {
	if (h.final) return new THREE.Vector3(h.final[0], 0, h.final[2]);
	const r = roomById(targetId);
	if (!r) return new THREE.Vector3(0, 0, 0);
	const map = {
		consult: [-17.1, 0, -6.5],
		social: [-29.2, 0, -6.2],
		education: [-41.1, 0, -6.2],
		patientcare: [-27.4, 0, 5.5],
		physics: [6.4, 0, -17.2],
		qa: [-6.2, 0, -43.2],
		ctcontrol: [31.3, 0, -7.4],
		ctsim: [40.4, 0, -7.2],
		linaccontrol: [50.5, 0, 7.2],
		vault1: [75.2, 0, -14.4],
		vault2: [75.2, 0, 14.4],
		lobby: [-3.2, 0, 3.4]
	};
	const a = map[targetId] || [r.x, 0, r.z];
	return new THREE.Vector3(...a);
}
function actorExitPoints(room) {
	if (!room || room.hub) return [];
	if (room.id === 'vault1')
		return [
			[73.15, -15.3],
			[71.25, -15.3],
			[70.5, -18],
			[65.1, -18],
			[63.15, -18]
		];
	if (room.id === 'vault2')
		return [
			[73.15, 15.3],
			[71.25, 15.3],
			[70.5, 18],
			[65.1, 18],
			[63.15, 18]
		];
	const p = zeroY(doorPoint(room));
	return [[p.x, p.z]];
}
function actorEntryPoints(room, final) {
	if (!room || room.hub) return [[final.x, final.z]];
	const dp = zeroY(doorPoint(room));
	if (room.id === 'vault1')
		return [
			[dp.x, dp.z],
			[65.1, -18],
			[70.5, -18],
			[71.25, -15.3],
			[73.15, -15.3],
			[final.x, final.z]
		];
	if (room.id === 'vault2')
		return [
			[dp.x, dp.z],
			[65.1, 18],
			[70.5, 18],
			[71.25, 15.3],
			[73.15, 15.3],
			[final.x, final.z]
		];
	return [
		[dp.x, dp.z],
		[final.x, final.z]
	];
}
function buildActorHandoffPath(actor, fromId, targetId, h) {
	const hintedFrom = roomById(fromId),
		to = roomById(targetId),
		start = new THREE.Vector3();
	actor.getWorldPosition(start);
	start.y = 0;
	const detectedFrom = journeyActorRoom(actor),
		actualFrom = detectedFrom || hintedFrom,
		pts = [[start.x, start.z]];
	if (detectedFrom && to && detectedFrom.id === to.id) {
		const f = actorFinalPoint(targetId, h);
		pts.push([f.x, f.z]);
		return pts;
	}
	if (detectedFrom && !detectedFrom.hub) pts.push(...actorExitPoints(detectedFrom));
	if (detectedFrom?.hub && to && !to.hub) {
		for (const v of corridorNodesFromHub(to)) {
			const q = zeroY(v);
			pts.push([q.x, q.z]);
		}
	} else if (detectedFrom && to?.hub && !detectedFrom.hub) {
		for (const v of corridorNodesFromHub(detectedFrom).slice().reverse()) {
			const q = zeroY(v);
			pts.push([q.x, q.z]);
		}
	} else if (detectedFrom && to) {
		for (const v of shortestCorridorRoute(detectedFrom, to)) {
			const q = zeroY(v);
			pts.push([q.x, q.z]);
		}
	} else if (to) {
		for (const v of shortestCorridorRouteFromPosition(start, to)) {
			const q = zeroY(v);
			pts.push([q.x, q.z]);
		}
	} else if (actualFrom && !actualFrom.hub) {
		const a = corridorAnchor(actualFrom).p;
		pts.push([a.x, a.z]);
	}
	const final = actorFinalPoint(targetId, h);
	pts.push(...actorEntryPoints(to, final));
	const out = [];
	for (const p of pts) {
		if (!out.length || Math.hypot(out.at(-1)[0] - p[0], out.at(-1)[1] - p[1]) > 0.22) out.push(p);
	}
	return out;
}
export function startActorHandoff(key, h) {
	const actor = castActorForHandoff(key, h),
		target = roomById(h.target);
	if (!actor || !target) return;
	actor.userData.inHandoff = true;
	const from = roomById(key),
		pts = buildActorHandoffPath(actor, key, h.target, h),
		curve = makePolylineCurve(pts.map((p) => new THREE.Vector3(p[0], 0, p[1]))),
		len = curve.getLength(),
		duration = Math.max(4.5, Math.min(16, len / 2.25));
	if (from && doors.has(from.id)) setDoorTarget(from.id, true);
	if (doors.has(target.id)) setDoorTarget(target.id, true);
	handoffTransitions.push({
		actor,
		key,
		h,
		target,
		curve,
		start: performance.now() / 1000,
		duration
	});
	setTimeout(() => {
		if (from && doors.has(from.id) && from.id !== target.id) setDoorTarget(from.id, false);
	}, 1800);
}
export function updateHandoffTransitions(sec) {
	for (let i = handoffTransitions.length - 1; i >= 0; i--) {
		const t = handoffTransitions[i],
			u = Math.max(0, Math.min(1, (sec - t.start) / t.duration)),
			e = u * u * (3 - 2 * u),
			p = t.curve.getPoint(e),
			n = t.curve.getPoint(Math.min(1, e + 0.006));
		t.actor.position.copy(p);
		t.actor.rotation.y = Math.atan2(n.x - p.x, n.z - p.z);
		const swing = Math.sin(sec * 8) * 0.48;
		t.actor.traverse((o) => {
			const r = o.userData?.walkRig;
			if (r) {
				r.armLP.rotation.x = swing;
				r.armRP.rotation.x = -swing;
				r.legLP.rotation.x = -swing * 0.88;
				r.legRP.rotation.x = swing * 0.88;
			}
		});
		if (u >= 1) {
			t.actor.userData.inHandoff = false;
			t.actor.userData.handoffCompleted = true;
			poseCharacter(t.actor, t.h.actor === 'staff' ? 'support' : 'neutral');
			if (doors.has(t.target.id)) setTimeout(() => setDoorTarget(t.target.id, false), 1200);
			handoffTransitions.splice(i, 1);
		}
	}
}
