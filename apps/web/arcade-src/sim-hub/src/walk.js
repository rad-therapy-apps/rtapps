/* RTApps (#77 sim-hub modularization, task 8): walk-mode movement, collision, doors, guided
   travel and corridor routing — player movement/collision (`canMove`, `collider`), pointer-lock
   mouse look, door open/close animation and target state (`updateDoors`, `setDoorTarget`,
   `doorCenter`, `doorNormal`, `doorPoint`, `nearestDoor`), the guided travel state machine
   (`beginTravel`/`updateTravel`/`finishTravel`) and its corridor-routing helpers
   (`shortestCorridorRoute(FromPosition)`, `corridorNodesFromHub`, `nearestCorridorProjection`,
   `approachPoint`, `insidePoint`, `makeRouteToApproach`, `makePolylineCurve`,
   `branchRouteBetween`), and `setMode`/`aimPlayerAt`/`roomContainingWalkPoint`. Verbatim
   extractions from main.js. `HUB`/`TREATMENT_JUNCTION_X` (corridor-routing constants used only
   here) and `colliders` (collision list read only by `canMove`/`collider`) moved along with
   their sole consumers and are not exported. A handful of symbols stay owned by main.js because
   still-resident journey/booking systems read or write them too, or because they're entangled
   with the conversation-camera/journey-timing code: `roomById`/`player`/`doors`/`ceilings`/
   `keys` (already exported from main.js per earlier tasks). `JOURNEY`/`updateJourneyUI`/
   `beginRoutePhase`/`beginEntryPhase`/`focusTargetsForRoom`/`walkCompositionReady`/
   `applyWalkConversationComposition`/`enableGuidedConversationComposition`/
   `showJourneyCheckinIntro` moved to ./journey.js and `showCtQaDock` to ./sdk-bridge.js in
   task 9, both imported back here. `toast`/`disableRoomInspection`/`enableRoomInspection`/
   `updateFacilityInfo`/`renderRoomList`/`updateRoomUI` are owned by ./interact.js (task 8's
   companion module) and imported back here. */
import * as THREE from 'three';
import { S } from './state.js';
import { camera, orbit, canvas } from './scene.js';
import { ROOMS, corridorAnchor, doorLabel } from './rooms.js';
import { cleanPoints } from './helpers.js';
import { roomById, player, doors, ceilings, keys } from './main.js';
import { showCtQaDock } from './sdk-bridge.js';
import {
	JOURNEY,
	updateJourneyUI,
	beginRoutePhase,
	beginEntryPhase,
	focusTargetsForRoom,
	walkCompositionReady,
	applyWalkConversationComposition,
	enableGuidedConversationComposition,
	showJourneyCheckinIntro
} from './journey.js';
import {
	toast,
	disableRoomInspection,
	enableRoomInspection,
	updateFacilityInfo,
	renderRoomList,
	updateRoomUI
} from './interact.js';

const HUB = new THREE.Vector3(0, 1.68, 0);
const TREATMENT_JUNCTION_X = 64;

export function nearestDoor(maxD = 2.6) {
	let best = null,
		bd = maxD;
	ROOMS.filter((r) => !r.hub).forEach((r) => {
		const p = doorPoint(r),
			d = player.pos.distanceTo(p);
		if (d < bd) {
			bd = d;
			best = { room: r, d };
		}
	});
	return best;
}

const colliders = [];
export function collider(x, z, w, d) {
	colliders.push({ x, z, hw: w / 2, hd: d / 2 });
}
export function doorNormal(room) {
	if (room.doorSide === 'zmin') return new THREE.Vector3(0, 0, -1);
	if (room.doorSide === 'zmax') return new THREE.Vector3(0, 0, 1);
	if (room.doorSide === 'xmin') return new THREE.Vector3(-1, 0, 0);
	return new THREE.Vector3(1, 0, 0);
}
export function doorCenter(room, y = 1.65) {
	const p = new THREE.Vector3(room.x, y, room.z),
		hx = room.w / 2,
		hz = room.d / 2;
	if (room.doorSide === 'zmin') p.z -= hz;
	if (room.doorSide === 'zmax') p.z += hz;
	if (room.doorSide === 'xmin') p.x -= hx;
	if (room.doorSide === 'xmax') p.x += hx;
	return p;
}

export function makePolylineCurve(points) {
	const path = new THREE.CurvePath();
	for (let i = 0; i < points.length - 1; i++)
		path.add(new THREE.LineCurve3(points[i].clone(), points[i + 1].clone()));
	return path;
}

export function aimPlayerAt(target) {
	const dx = target.x - player.pos.x,
		dy = target.y - player.pos.y,
		dz = target.z - player.pos.z,
		flat = Math.hypot(dx, dz) || 0.001;
	player.yaw = Math.atan2(-dx, -dz);
	player.pitch = Math.atan2(dy, flat);
	camera.position.copy(player.pos);
	camera.lookAt(target);
}
export function roomContainingWalkPoint(x, z) {
	return (
		ROOMS.find(
			(r) =>
				!r.hub &&
				x > r.x - r.w / 2 + 0.35 &&
				x < r.x + r.w / 2 - 0.35 &&
				z > r.z - r.d / 2 + 0.35 &&
				z < r.z + r.d / 2 - 0.35
		) || (x > -11.5 && x < 11.5 && z > -9.5 && z < 9.5 ? roomById('lobby') : null)
	);
}

export function doorPoint(room) {
	if (room.hub) return new THREE.Vector3(...room.cam);
	return doorCenter(room, 1.66).add(doorNormal(room).multiplyScalar(0.85));
}
function approachPoint(room) {
	if (room.hub) return new THREE.Vector3(...room.cam);
	return doorCenter(room, 1.66).add(doorNormal(room).multiplyScalar(room.vault ? 4.2 : 3.1));
}
export function insidePoint(room) {
	if (room.hub) return new THREE.Vector3(...room.cam);
	if (room.id === 'vault1') return new THREE.Vector3(68.25, 1.66, -18);
	if (room.id === 'vault2') return new THREE.Vector3(68.25, 1.66, 18);
	return doorCenter(room, 1.66).add(doorNormal(room).multiplyScalar(-1.25));
}
export function corridorNodesFromHub(room) {
	if (room.hub) return [];
	if (room.wing === 'patient')
		return [new THREE.Vector3(-12.8, 1.66, 0), new THREE.Vector3(room.x, 1.66, 0)];
	if (room.wing === 'technical')
		return [new THREE.Vector3(0, 1.66, -10.8), new THREE.Vector3(0, 1.66, room.z)];
	if (room.id === 'vault1')
		return [
			new THREE.Vector3(12.8, 1.66, 0),
			new THREE.Vector3(64, 1.66, 0),
			new THREE.Vector3(64, 1.66, -18),
			new THREE.Vector3(62.8, 1.66, -18)
		];
	if (room.id === 'vault2')
		return [
			new THREE.Vector3(12.8, 1.66, 0),
			new THREE.Vector3(64, 1.66, 0),
			new THREE.Vector3(64, 1.66, 18),
			new THREE.Vector3(62.8, 1.66, 18)
		];
	if (room.wing === 'treatment')
		return [
			new THREE.Vector3(12.8, 1.66, 0),
			new THREE.Vector3(TREATMENT_JUNCTION_X, 1.66, 0),
			new THREE.Vector3(TREATMENT_JUNCTION_X, 1.66, room.z)
		];
	return [new THREE.Vector3(12.8, 1.66, 0), new THREE.Vector3(room.x, 1.66, 0)];
}
function nearestCorridorProjection(pos) {
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
		y = 1.66;
	const candidates = [
		{ line: 'main', p: new THREE.Vector3(clamp(pos.x, -52, 64), y, 0) },
		{ line: 'technical', p: new THREE.Vector3(0, y, clamp(pos.z, -66, 0)) },
		{ line: 'treatment', p: new THREE.Vector3(64, y, clamp(pos.z, -30, 30)) }
	];
	let best = candidates[0],
		bd = Infinity;
	for (const c of candidates) {
		const d = Math.hypot(pos.x - c.p.x, pos.z - c.p.z);
		if (d < bd) {
			bd = d;
			best = c;
		}
	}
	return best;
}
export function shortestCorridorRouteFromPosition(pos, destRoom) {
	const a = nearestCorridorProjection(pos),
		pts = [];
	const start = new THREE.Vector3(pos.x, 1.66, pos.z);
	if (start.distanceTo(a.p) > 0.25) pts.push(start, a.p.clone());
	else pts.push(start);
	if (destRoom?.hub) {
		if (a.line === 'technical') pts.push(new THREE.Vector3(0, 1.66, -10.8));
		else if (a.line === 'treatment')
			pts.push(new THREE.Vector3(64, 1.66, 0), new THREE.Vector3(12.8, 1.66, 0));
		else pts.push(new THREE.Vector3(pos.x < 0 ? -12.8 : 12.8, 1.66, 0));
		return cleanPoints(pts);
	}
	const b = corridorAnchor(destRoom);
	if (a.line === b.line) {
		pts.push(b.p.clone());
		return cleanPoints(pts);
	}
	if (a.line === 'main' && b.line === 'technical')
		pts.push(new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'main')
		pts.push(new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'main' && b.line === 'treatment')
		pts.push(new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'treatment' && b.line === 'main')
		pts.push(new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'treatment')
		pts.push(new THREE.Vector3(0, 1.66, 0), new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'treatment' && b.line === 'technical')
		pts.push(new THREE.Vector3(64, 1.66, 0), new THREE.Vector3(0, 1.66, 0), b.p.clone());
	return cleanPoints(pts);
}
export function shortestCorridorRoute(srcRoom, destRoom) {
	const a = corridorAnchor(srcRoom),
		b = corridorAnchor(destRoom),
		pts = [];
	if (a.line === b.line) {
		pts.push(a.p.clone(), b.p.clone());
		return cleanPoints(pts);
	}
	if (a.line === 'main' && b.line === 'technical')
		pts.push(a.p.clone(), new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'main')
		pts.push(a.p.clone(), new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'main' && b.line === 'treatment')
		pts.push(a.p.clone(), new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'treatment' && b.line === 'main')
		pts.push(a.p.clone(), new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'treatment')
		pts.push(
			a.p.clone(),
			new THREE.Vector3(0, 1.66, 0),
			new THREE.Vector3(64, 1.66, 0),
			b.p.clone()
		);
	else if (a.line === 'treatment' && b.line === 'technical')
		pts.push(
			a.p.clone(),
			new THREE.Vector3(64, 1.66, 0),
			new THREE.Vector3(0, 1.66, 0),
			b.p.clone()
		);
	return cleanPoints(pts);
}
function branchRouteBetween(srcRoom, destRoom) {
	return shortestCorridorRoute(srcRoom, destRoom);
}
export function makeRouteToApproach(dest) {
	const pts = [camera.position.clone()];
	if (S.activeRoom && !S.activeRoom.hub) {
		pts.push(doorPoint(S.activeRoom));
		if (dest.hub) {
			pts.push(
				...corridorNodesFromHub(S.activeRoom).slice().reverse(),
				HUB.clone(),
				new THREE.Vector3(...dest.cam)
			);
		} else {
			pts.push(...branchRouteBetween(S.activeRoom, dest), approachPoint(dest));
		}
	} else if (S.activeRoom?.hub) {
		if (dest.hub) pts.push(new THREE.Vector3(...dest.cam));
		else pts.push(...corridorNodesFromHub(dest), approachPoint(dest));
	} else {
		pts.push(new THREE.Vector3(0, 7.2, 15), new THREE.Vector3(0, 2.2, 5.2), HUB.clone());
		if (dest.hub) pts.push(new THREE.Vector3(...dest.cam));
		else pts.push(...corridorNodesFromHub(dest), approachPoint(dest));
	}
	return new THREE.CatmullRomCurve3(cleanPoints(pts), false, 'catmullrom', 0.18);
}
export function setDoorTarget(id, v) {
	const d = doors.get(id);
	if (d) d.target = v ? 1 : 0;
}

export function beginTravel(room, push = true) {
	if (!room || S.travel) return;
	if (S.activeRoom?.id === 'ctsim' && room.id !== 'ctsim') showCtQaDock(false);
	disableRoomInspection();
	if (push && S.activeRoom && S.activeRoom.id !== room.id) S.history.push(S.activeRoom.id);
	if (S.mode === 'walk' && document.pointerLockElement) document.exitPointerLock();
	const fromOverview = S.mode === 'overview';
	if (fromOverview) {
		S.mode = 'guided';
		document
			.querySelectorAll('#modeSeg button')
			.forEach((b) => b.classList.toggle('active', b.dataset.mode === 'guided'));
		document.getElementById('walkHint').classList.remove('show');
		document.getElementById('overviewNote').style.display = 'none';
		orbit.enabled = false;
		ceilings.forEach((c) => (c.visible = true));
	} else setMode('guided', false);
	document.getElementById('roomLookHint').classList.remove('show');
	orbit.enabled = false;
	const origin =
		S.activeRoom && !S.activeRoom.hub && doors.has(S.activeRoom.id) ? S.activeRoom : null;
	S.travel = {
		room,
		origin,
		phase: origin ? 'exitDoor' : 'route',
		phaseStart: performance.now(),
		originClosed: false
	};
	if (origin) setDoorTarget(origin.id, true);
	else beginRoutePhase(performance.now());
	document.getElementById('travelName').textContent = `Route to ${room.name}`;
	document.getElementById('travelPct').textContent = '0%';
	document.getElementById('travelFill').style.width = '0%';
	document.getElementById('travelHUD').classList.add('show');
	orbit.enabled = false;
	toast(`Guided route to <b>${room.name}</b>`);
}

function finishTravel() {
	if (!S.travel) return;
	S.activeRoom = S.travel.room;
	const arrived = S.activeRoom;
	if (arrived && !arrived.hub && doors.has(arrived.id)) {
		const id = arrived.id;
		setTimeout(() => setDoorTarget(id, false), 1500);
	}
	S.travel = null;
	document.getElementById('travelHUD').classList.remove('show');
	enableGuidedConversationComposition(arrived);
	player.pos.copy(camera.position);
	updateRoomUI(arrived);
	renderRoomList();
	document.getElementById('backBtn').disabled = !S.history.length;
	document.getElementById('locText').textContent =
		`Current location: ${arrived.name} · initial view frames the staff interaction`;
	if (arrived.id === 'lobby' && JOURNEY.introPending) setTimeout(showJourneyCheckinIntro, 350);
	updateJourneyUI();
}
export function updateTravel(now) {
	if (!S.travel) return;
	const r = S.travel.room;
	if (S.travel.phase === 'exitDoor') {
		const d = doors.get(S.travel.origin.id),
			elapsed = now - S.travel.phaseStart,
			wait = (d?.openSeconds || 2) * 1000 + 500;
		document.getElementById('travelName').textContent = `Opening ${doorLabel(d?.type)}…`;
		document.getElementById('travelPct').textContent = '5%';
		document.getElementById('travelFill').style.width = '5%';
		if (elapsed >= wait) beginRoutePhase(now);
		return;
	}
	if (S.travel.phase === 'route') {
		let t = (now - S.travel.routeStart) / S.travel.routeDuration;
		t = Math.max(0, Math.min(1, t));
		const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
			p = S.travel.curve.getPoint(e),
			ahead = S.travel.curve.getPoint(Math.min(1, e + 0.01));
		camera.position.copy(p);
		if (r.vault && t > 0.78) camera.lookAt(doorCenter(r, 1.58));
		else camera.lookAt(ahead);
		if (S.travel.origin && !S.travel.originClosed && t > 0.1) {
			setDoorTarget(S.travel.origin.id, false);
			S.travel.originClosed = true;
		}
		document.getElementById('travelName').textContent = `Traveling through the center · ${r.name}`;
		document.getElementById('travelPct').textContent = `${Math.round(8 + t * 62)}%`;
		document.getElementById('travelFill').style.width = `${8 + t * 62}%`;
		if (t >= 1) {
			if (r.hub) {
				finishTravel();
				return;
			}
			setDoorTarget(r.id, true);
			S.travel.phase = 'destDoor';
			S.travel.phaseStart = now;
		}
		return;
	}
	if (S.travel.phase === 'destDoor') {
		const d = doors.get(r.id),
			elapsed = now - S.travel.phaseStart,
			wait = (d?.openSeconds || 2) * 1000 + 650;
		camera.lookAt(doorCenter(r, 1.55));
		const q = Math.min(1, elapsed / wait);
		document.getElementById('travelName').textContent = `Opening ${doorLabel(d?.type)} · ${r.name}`;
		document.getElementById('travelPct').textContent = `${Math.round(70 + q * 15)}%`;
		document.getElementById('travelFill').style.width = `${70 + q * 15}%`;
		if (elapsed >= wait) beginEntryPhase(now);
		return;
	}
	if (S.travel.phase === 'enter') {
		let t = (now - S.travel.entryStart) / S.travel.entryDuration;
		t = Math.max(0, Math.min(1, t));
		const e = t * t * (3 - 2 * t),
			p = S.travel.entryCurve.getPoint(e),
			ahead = S.travel.entryCurve.getPoint(Math.min(1, e + 0.012));
		camera.position.copy(p);
		if (r.vault) {
			const door = doorCenter(r, 1.6),
				f = focusTargetsForRoom(r),
				finalTarget = f?.target || new THREE.Vector3(r.x, 1.35, r.z);
			if (p.x < 71.0) {
				camera.lookAt(door);
			} else if (e < 0.9) {
				camera.lookAt(ahead);
			} else {
				const blend = Math.max(0, Math.min(1, (e - 0.9) / 0.1)),
					look = ahead.clone().lerp(finalTarget, blend);
				camera.lookAt(look);
			}
		} else {
			const target = new THREE.Vector3(...r.look);
			camera.lookAt(ahead.lerp(target, Math.max(0, (e - 0.72) / 0.28)));
		}
		document.getElementById('travelName').textContent = `Entering ${r.name}`;
		document.getElementById('travelPct').textContent = `${Math.round(85 + t * 15)}%`;
		document.getElementById('travelFill').style.width = `${85 + t * 15}%`;
		if (t >= 1) finishTravel();
	}
}
export function updateDoors(dt) {
	doors.forEach((d) => {
		const step = dt / Math.max(0.65, d.openSeconds);
		if (d.target > d.progress) d.progress = Math.min(d.target, d.progress + step);
		else d.progress = Math.max(d.target, d.progress - step);
		const p = d.progress * d.progress * (3 - 2 * d.progress);
		if (d.type === 'patientSwing' || d.type === 'leadershipSwing') {
			d.parts[0].rotation.y = -Math.PI * 0.48 * p;
		} else if (d.type === 'technicalDouble') {
			d.parts[0].rotation.y = -Math.PI * 0.46 * p;
			d.parts[1].rotation.y = Math.PI * 0.46 * p;
		} else if (d.type === 'clinicalSlide') {
			d.parts[0].position.x = -d.gap * 0.245 - d.gap * 0.48 * p;
			d.parts[1].position.x = d.gap * 0.245 + d.gap * 0.48 * p;
		} else {
			const off = d.gap * 1.02 * p;
			d.parts.forEach((part) => (part.position.x = off));
		}
	});
}

export function setMode(m, announce = true) {
	S.mode = m;
	document
		.querySelectorAll('#modeSeg button')
		.forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
	document.getElementById('walkHint').classList.toggle('show', m === 'walk');
	document.getElementById('overviewNote').style.display = m === 'overview' ? 'block' : 'none';
	ceilings.forEach((c) => (c.visible = m !== 'overview'));
	if (m === 'overview') {
		document.getElementById('roomLookHint').classList.remove('show');
		if (document.pointerLockElement) document.exitPointerLock();
		camera.fov = 52;
		camera.updateProjectionMatrix();
		camera.position.set(12, 82, 92);
		orbit.target.set(8, 0, -12);
		orbit.minDistance = 18;
		orbit.maxDistance = 155;
		orbit.minPolarAngle = 0;
		orbit.maxPolarAngle = Math.PI / 2.07;
		orbit.enablePan = false;
		orbit.enabled = true;
		orbit.update();
		S.activeRoom = null;
		showCtQaDock(false);
		document.getElementById('locText').textContent = 'Overview of the full facility.';
		updateFacilityInfo();
		renderRoomList();
	} else if (m === 'walk') {
		document.getElementById('roomLookHint').classList.remove('show');
		orbit.enabled = false;
		if (S.activeRoom) {
			applyWalkConversationComposition(S.activeRoom, true);
		} else {
			player.pos.set(0, 1.65, 5.5);
			camera.position.copy(player.pos);
			const f = focusTargetsForRoom(roomById('lobby'));
			if (f) aimPlayerAt(f.target);
			else {
				player.yaw = 0;
				player.pitch = 0;
			}
		}
		if (announce)
			toast('Walk mode: use WASD and the mouse to move and look around. Press E to interact.');
	} else if (m === 'guided') {
		if (S.activeRoom && !S.travel) enableRoomInspection(S.activeRoom);
		else {
			orbit.enabled = false;
			if (!S.activeRoom && !S.travel) {
				camera.position.set(0, 1.7, 5.5);
				camera.lookAt(0, 1.35, 0);
			}
		}
	}
}

export function requestWalkPointerLock() {
	if (S.mode !== 'walk' || document.pointerLockElement === canvas) return;
	try {
		const p = canvas.requestPointerLock?.();
		if (p && typeof p.catch === 'function') p.catch(() => {});
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy pattern, error object intentionally unused
	} catch (_) {
		/* drag-look fallback remains available */
	}
}
export function applyWalkMouseDelta(dx, dy) {
	if (S.mode !== 'walk') return;
	player.yaw -= dx * 0.0024;
	player.pitch = Math.max(-1.12, Math.min(1.12, player.pitch - dy * 0.0024));
}

function canMove(x, z) {
	if (x < -58 || x > 94 || z < -70 || z > 38) return false;
	const rad = 0.32;
	for (const c of colliders) {
		if (Math.abs(x - c.x) < c.hw + rad && Math.abs(z - c.z) < c.hd + rad) return false;
	}
	return true;
}
export function updateWalk(dt) {
	if (S.mode !== 'walk' || S.travel) return;
	const moving = keys.w || keys.s || keys.a || keys.d;
	const speed = (keys.shift ? 6.1 : 3.35) * dt;
	let f = (keys.w ? 1 : 0) - (keys.s ? 1 : 0),
		s = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
	if (f || s) {
		const l = Math.hypot(f, s) || 1;
		f /= l;
		s /= l;
		const dx = (-Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) * speed,
			dz = (-Math.cos(player.yaw) * f - Math.sin(player.yaw) * s) * speed;
		const nx = player.pos.x + dx,
			nz = player.pos.z + dz;
		if (canMove(nx, player.pos.z)) player.pos.x = nx;
		if (canMove(player.pos.x, nz)) player.pos.z = nz;
	}
	const here = roomContainingWalkPoint(player.pos.x, player.pos.z);
	if (here && walkCompositionReady(here) && S.walkCompositionRoomId !== here.id)
		applyWalkConversationComposition(here, false);
	if (!here) S.walkCompositionRoomId = null;
	const bob = moving ? Math.sin(performance.now() * 0.01 * (keys.shift ? 1.25 : 1)) * 0.022 : 0;
	camera.position.copy(player.pos);
	camera.position.y += bob;
	const dir = new THREE.Vector3(
		-Math.sin(player.yaw) * Math.cos(player.pitch),
		Math.sin(player.pitch),
		-Math.cos(player.yaw) * Math.cos(player.pitch)
	);
	camera.lookAt(camera.position.clone().add(dir));
	let nearest = null,
		nd = 99;
	ROOMS.filter((r) => !r.hub).forEach((r) => {
		const dp = doorPoint(r);
		const d = Math.hypot(player.pos.x - dp.x, player.pos.z - dp.z);
		if (d < nd) {
			nd = d;
			nearest = r;
		}
	});
	if (nearest && nd < 2.15) setDoorTarget(nearest.id, true);
	doors.forEach((d, id) => {
		if (!nearest || id !== nearest.id || nd >= 2.15) setDoorTarget(id, false);
	});
}
