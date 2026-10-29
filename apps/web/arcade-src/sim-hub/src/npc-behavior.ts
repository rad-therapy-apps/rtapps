/* RTApps (#77 sim-hub modularization, task 6): NPC movement, duties, exchanges and handoffs —
   the ambient mover registry (path-walkers, patrols), duty-pose idle animation, staff/patient
   speech exchanges, and the corridor-routed actor-handoff system used when a staff/patient
   pair transitions between rooms. Verbatim extractions from main.js. Companion to ./npc.js
   (task 6's other module) — `personFigure`/`setNpcRole`/`poseCharacter`/`faceNpcToward`/
   `npcBubble`/`bubbleVis` are owned there and imported back here. A handful of symbols stay
   owned by main.js — `ROOM_CAST`/`doors` (still-resident journey state) — because other
   still-resident systems read or write them too, so main.js exports them rather than
   duplicating that state here. `JOURNEY`/`journeyActorRoom` moved to ./journey.js in task 9 and
   are imported back here. `setupAmbulance` moved to ./equipment.js in task 7 and is
   imported from there instead. `doorPoint`/`setDoorTarget`/`corridorNodesFromHub`/
   `shortestCorridorRoute`/`shortestCorridorRouteFromPosition`/`makePolylineCurve` moved to
   ./walk.js in task 8 and are imported from there instead. */
import * as THREE from 'three';
import { zeroY } from './helpers';
import { scene, camera } from './scene';
import { S } from './state';
import { corridorAnchor } from './rooms';
import { wheelchairObject, medCartObject, vehicleObject } from './props';
import {
	personFigure,
	setNpcRole,
	poseCharacter,
	faceNpcToward,
	faceAlong,
	npcBubble,
	bubbleVis
} from './npc';
import {
	doorPoint,
	setDoorTarget,
	corridorNodesFromHub,
	shortestCorridorRoute,
	shortestCorridorRouteFromPosition,
	makePolylineCurve
} from './walk';
import { roomById, ROOM_CAST, doors, player } from './main';
import { JOURNEY, journeyActorRoom } from './journey';
import { setupAmbulance } from './equipment';

export const movers = [];
export const dutyActors = [];
export const interactionScenes = [];

/* RTApps perf task 2: walk-mode distance gating for ambient movers and duty animations.
   Full-fidelity always applies in overview/orbit mode, to any actor involved in the active
   guided journey, and to any actor mid actor-handoff transition. Everyone else is strided by
   distance to the player so far-off NPCs sample less often instead of freezing. Both
   updateMovers and updateDutyAnimations already compute position/pose as a pure function of
   absolute elapsed seconds (no per-frame accumulation) — so skipping frames never causes
   drift; resampling at the current `sec` next time a strided actor updates lands exactly where
   continuous motion would have put it, at the same real-world speed. Exchange conversations
   need no membership check: NEAR_RADIUS is derived from EXCHANGE_TRIGGER_DIST (see below), so
   actively-conversing actors are always full-rate by construction. */
const EXCHANGE_TRIGGER_DIST = 15;
/* Full-rate radius for the stride gate. Derived from the exchange trigger so the invariant
   "an actor whose exchange conversation is active is ALWAYS inside the full-rate radius"
   holds by construction: exchanges only activate when the camera (== player in walk mode)
   is within EXCHANGE_TRIGGER_DIST of the pair midpoint, and partners stand within a couple
   of units of that midpoint — so 2x the trigger distance always covers both actors. The
   stride gate measures from the same point as the trigger: `camera.position` in guided mode
   (the player body is stale while the camera flies the journey) and `player.pos` in walk
   mode, where the camera is the player.
   Raising EXCHANGE_TRIGGER_DIST automatically widens this radius; do not decouple them. */
const NEAR_RADIUS = Math.max(30, EXCHANGE_TRIGGER_DIST * 2);
const NEAR_RADIUS_SQ = NEAR_RADIUS * NEAR_RADIUS;
let frameCount = 0;
let journeyActorSet = null;
let journeyActorSetFrame = -1;
function journeyInvolved(actor) {
	if (!actor) return false;
	if (actor.userData?.inHandoff) return true;
	if (typeof JOURNEY === 'undefined' || !JOURNEY.active) return false;
	if (journeyActorSetFrame !== frameCount) {
		journeyActorSet = new Set(Object.values(JOURNEY).filter((v) => v && v.isObject3D));
		journeyActorSetFrame = frameCount;
	}
	return journeyActorSet.has(actor);
}
function actorUpdateStride(objWorldPos, actor) {
	if (S.mode === 'overview') return 1;
	if (journeyInvolved(actor)) return 1;
	const ref = S.mode === 'guided' ? camera.position : player.pos;
	return objWorldPos.distanceToSquared(ref) < NEAR_RADIUS_SQ ? 1 : 4;
}
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
		const stride = actorUpdateStride(d.group.position, d.group);
		if (stride > 1 && frameCount % stride !== 0) continue;
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
			near = cam.distanceTo(mid) < EXCHANGE_TRIGGER_DIST && S.mode !== 'overview';
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
	yawOffset = 0,
	id = ''
) {
	scene.add(group);
	movers.push({ group, curve: moverPath(points, closed), speed, offset, yawOffset, id });
}
export function updateMovers(sec) {
	frameCount++;
	for (const m of movers) {
		const stride = actorUpdateStride(m.group.position, m.group);
		if (stride > 1 && frameCount % stride !== 0) continue;
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
			// Patient-services corridor lanes: west on z = 1.5, east on z = -1.5.
			[-12.8, 0, 1.5],
			[-21, 0, 1.5],
			[-29, 0, 1.5],
			[-37, 0, 1.5],
			[-45, 0, 1.5],
			[-45.75, 0, 1.3],
			[-46.3, 0, 0.75],
			[-46.5, 0, 0],
			[-46.3, 0, -0.75],
			[-45.75, 0, -1.3],
			[-45, 0, -1.5],
			[-37, 0, -1.5],
			[-29, 0, -1.5],
			[-21, 0, -1.5],
			[-12.8, 0, -1.5],
			[-12.05, 0, -1.3],
			[-11.5, 0, -0.75],
			[-11.3, 0, 0],
			[-11.5, 0, 0.75],
			[-12.05, 0, 1.3]
		],
		0.01829,
		true,
		0.12,
		0,
		'walker'
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
			// Clinical corridor lanes: east on z = 0.8, west on z = 2.4.
			[16.5, 0, 0.8],
			[24.5, 0, 0.8],
			[32, 0, 0.8],
			[40, 0, 0.8],
			[47.5, 0, 0.8],
			[47.9, 0, 0.91],
			[48.19, 0, 1.2],
			[48.3, 0, 1.6],
			[48.19, 0, 2],
			[47.9, 0, 2.29],
			[47.5, 0, 2.4],
			[40, 0, 2.4],
			[32, 0, 2.4],
			[24.5, 0, 2.4],
			[16.5, 0, 2.4],
			[16.1, 0, 2.29],
			[15.81, 0, 2],
			[15.7, 0, 1.6],
			[15.81, 0, 1.2],
			[16.1, 0, 0.91]
		],
		0.01604,
		true,
		0.42,
		0,
		'escort'
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
		0.68,
		0,
		'techCart'
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
		0.31,
		0,
		'visitor'
	);
	const therapist = setNpcRole(
		personFigure(0x6f90c5, 0x34424b, 0x5f3f2b, { hairColor: 0x120f0d }),
		'Radiation Therapist',
		'Circulating between the LINAC control area and treatment wing.'
	);
	addMover(
		therapist,
		[
			// Corridor lanes z = 1.4 / 2.6, branch lanes x = 62.9 / 61.7 to the vault 2 approach.
			[51, 0, 1.4],
			[55, 0, 1.4],
			[59, 0, 1.4],
			[60, 0, 1.4],
			[61.11, 0, 1.62],
			[62.05, 0, 2.25],
			[62.68, 0, 3.19],
			[62.9, 0, 4.3],
			[62.9, 0, 5.5],
			[62.9, 0, 11],
			[62.9, 0, 16.4],
			[62.9, 0, 17.2],
			[62.72, 0, 17.62],
			[62.3, 0, 17.8],
			[61.88, 0, 17.62],
			[61.7, 0, 17.2],
			[61.7, 0, 16.4],
			[61.7, 0, 11],
			[61.7, 0, 5.5],
			[61.7, 0, 4.3],
			[61.47, 0, 3.45],
			[60.85, 0, 2.83],
			[60, 0, 2.6],
			[59, 0, 2.6],
			[55, 0, 2.6],
			[51, 0, 2.6],
			[50.58, 0, 2.42],
			[50.4, 0, 2],
			[50.58, 0, 1.58]
		],
		0.01488,
		true,
		0.74,
		0,
		'therapist'
	);
	const car = vehicleObject('car', 0x6588bf);
	addMover(
		car,
		[
			// Drive lanes: east on z = 32, west on z = 37.5, clear of the HDR suite.
			[-34, 0, 32],
			[-22.5, 0, 32],
			[-11, 0, 32],
			[0.5, 0, 32],
			[12.5, 0, 32],
			[24, 0, 32],
			[35.5, 0, 32],
			[47, 0, 32],
			[48.38, 0, 32.37],
			[49.38, 0, 33.38],
			[49.75, 0, 34.75],
			[49.38, 0, 36.13],
			[48.38, 0, 37.13],
			[47, 0, 37.5],
			[35.5, 0, 37.5],
			[24, 0, 37.5],
			[12.5, 0, 37.5],
			[0.5, 0, 37.5],
			[-11, 0, 37.5],
			[-22.5, 0, 37.5],
			[-34, 0, 37.5],
			[-35.37, 0, 37.13],
			[-36.38, 0, 36.13],
			[-36.75, 0, 34.75],
			[-36.38, 0, 33.38],
			[-35.37, 0, 32.37]
		],
		0.01123,
		true,
		0.2,
		-Math.PI / 2,
		'car'
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
			// Drive, west part: east on z = 28, west on z = 22.8.
			[-33, 0, 28],
			[-24.5, 0, 28],
			[-16, 0, 28],
			[-7.5, 0, 28],
			[1, 0, 28],
			[2.3, 0, 27.65],
			[3.25, 0, 26.7],
			[3.6, 0, 25.4],
			[3.25, 0, 24.1],
			[2.3, 0, 23.15],
			[1, 0, 22.8],
			[-7.5, 0, 22.8],
			[-16, 0, 22.8],
			[-24.5, 0, 22.8],
			[-33, 0, 22.8],
			[-34.3, 0, 23.15],
			[-35.25, 0, 24.1],
			[-35.6, 0, 25.4],
			[-35.25, 0, 26.7],
			[-34.3, 0, 27.65]
		],
		0.01004,
		true,
		0.82,
		-Math.PI / 2,
		'shuttle'
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
			// Out of CT control at x = 31.45, corridor lanes z = -1.4 / -2.6, in at x = 30.65.
			[31.45, 0, -6.6],
			[31.45, 0, -5.3],
			[31.45, 0, -4],
			[31.45, 0, -2.9],
			[31.45, 0, -2.2],
			[31.34, 0, -1.8],
			[31.05, 0, -1.51],
			[30.65, 0, -1.4],
			[27.5, 0, -1.4],
			[24.5, 0, -1.4],
			[24.08, 0, -1.58],
			[23.9, 0, -2],
			[24.08, 0, -2.42],
			[24.5, 0, -2.6],
			[27, 0, -2.6],
			[29.85, 0, -2.6],
			[30.25, 0, -2.71],
			[30.54, 0, -3],
			[30.65, 0, -3.4],
			[30.65, 0, -4],
			[30.65, 0, -5],
			[30.1, 0, -5.7],
			[29.3, 0, -6.2],
			[28.6, 0, -6.9],
			[28.45, 0, -8],
			[28.45, 0, -9.5],
			[28.45, 0, -11],
			[28.7, 0, -11.9],
			[29.4, 0, -12.45],
			[30.4, 0, -12.6],
			[31.1, 0, -12.3],
			[31.45, 0, -11.6],
			[31.5, 0, -10.4],
			[31.5, 0, -9],
			[31.5, 0, -7.8]
		],
		0.01136,
		true,
		0.17,
		0,
		'ctRunner'
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
			// Corridor lanes z = -1.2 / -2.4, branch lanes x = 62.9 / 61.7 to the vault 1 approach.
			[47, 0, -1.2],
			[51, 0, -1.2],
			[55, 0, -1.2],
			[59, 0, -1.2],
			[60, 0, -1.2],
			[61.11, 0, -1.42],
			[62.05, 0, -2.05],
			[62.68, 0, -2.99],
			[62.9, 0, -4.1],
			[62.9, 0, -5.3],
			[62.9, 0, -11],
			[62.9, 0, -16.4],
			[62.9, 0, -17.2],
			[62.72, 0, -17.62],
			[62.3, 0, -17.8],
			[61.88, 0, -17.62],
			[61.7, 0, -17.2],
			[61.7, 0, -16.4],
			[61.7, 0, -11],
			[61.7, 0, -5.3],
			[61.7, 0, -4.1],
			[61.47, 0, -3.25],
			[60.85, 0, -2.63],
			[60, 0, -2.4],
			[59, 0, -2.4],
			[55, 0, -2.4],
			[51, 0, -2.4],
			[47, 0, -2.4],
			[46.58, 0, -2.22],
			[46.4, 0, -1.8],
			[46.58, 0, -1.38]
		],
		0.01311,
		true,
		0.53,
		0,
		'linacRunner'
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
			// Out of HDR at z = 25.5, strip lanes x = 62.15 / 63.15, in at z = 24.5 to the nook.
			[61.5, 0, 25.5],
			[61.83, 0, 25.59],
			[62.06, 0, 25.83],
			[62.15, 0, 26.15],
			[62.15, 0, 28.5],
			[62.15, 0, 30.4],
			[62.3, 0, 30.75],
			[62.65, 0, 30.9],
			[63, 0, 30.75],
			[63.15, 0, 30.4],
			[63.15, 0, 28],
			[63.15, 0, 25.5],
			[63.15, 0, 23],
			[63.15, 0, 20.6],
			[63, 0, 20.25],
			[62.65, 0, 20.1],
			[62.3, 0, 20.25],
			[62.15, 0, 20.6],
			[62.15, 0, 22],
			[62.15, 0, 23.85],
			[62.06, 0, 24.18],
			[61.83, 0, 24.41],
			[61.5, 0, 24.5],
			[60.6, 0, 24.5],
			[60.15, 0, 24.62],
			[59.82, 0, 24.95],
			[59.7, 0, 25.4],
			[59.7, 0, 26.5],
			[59.7, 0, 28],
			[59.7, 0, 29.6],
			[59.85, 0, 29.95],
			[60.2, 0, 30.1],
			[60.55, 0, 29.95],
			[60.7, 0, 29.6],
			[60.7, 0, 28],
			[60.7, 0, 26.3],
			[60.81, 0, 25.9],
			[61.1, 0, 25.61]
		],
		0.01287,
		true,
		0.29,
		0,
		'hdrRunner'
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

export const handoffTransitions = [];
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
