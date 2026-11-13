/* The sim-hub tutorial, Chapter 1 (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3):
   wires the pure step machine (tutorial-machine.ts) into the world. Entering play mode 'tutorial'
   resets the treatment journey (resetTreatmentJourney(true)), hides the figure the player is being
   and plays the steps: the tracker, the door-by-door marker (built with the NPC route builder
   movementPathFor, so it goes through doors and room graphs, never walls), the check-in and the
   decisions, the role change, Jordan's escorts with their waits, the vault door, the beam and the
   end card. Leaving play mode 'tutorial' resets the journey again, so the world is left as the NPC
   check expects. Outside the tutorial nothing here runs: updateTutorial returns at once, and the E
   targets are made on the first start and disabled otherwise. With ?npccheck it exposes
   window.__TUTORIAL for scripts/sim-hub-tutorial-check.mjs. */
import * as THREE from 'three';
import { S } from './state';
import { camera, scene } from './scene';
import { ROOMS } from './rooms';
import { player, PLAYER_EYE_Y, REACH_Y, PRIMARY_NPCS, ROOM_CAST, roomById, doors } from './main';
import {
	aimPlayerAt,
	getColliders,
	doorPoint,
	insidePoint,
	roomContainingWalkPoint,
	setDoorTarget,
	requestWalkPointerLock
} from './walk';
import { registerInteractable, performInteraction } from './interact';
import { movementPathFor, seatNear, seatActor, actorHasTransition } from './npc-behavior';
import { poseCharacter, faceNpcToward, setPatientGown } from './npc';
import {
	JOURNEY,
	LOBBY_PICKUP,
	moveJourneyActor,
	resetTreatmentJourney,
	journeySpeech,
	journeyIntercom,
	workflowTransitions
} from './journey';
import { workflowState } from './equipment';
import { seatInWorld, ROOM_LASERS } from './props';
import type { SeatAnchor } from './props';
import { getPlayMode, enterMode, onPlayModeChange } from './play-mode';
import { setPaused } from './pause';
import { registerDialog } from './dialogs';
import { setTutorialAvailable } from './menu';
import { CHAPTER_1, LINES, ROLES, TUTORIAL_TIMING, WORLD } from './tutorial-steps';
import type { Role, Step, StepAction } from './tutorial-steps';
import { OFF, progressOf, reduceTutorial } from './tutorial-machine';
import type { Effect, TutorialEvent, TutorialState } from './tutorial-machine';
import {
	ESCORT_WAIT_R,
	MARKER_SWITCH_R,
	advanceStop,
	closestOnSegment,
	dist,
	edgeArrow,
	escortAhead,
	escortStops,
	formatDistance,
	invSmoothstep,
	lineBlocked,
	offRoute,
	remainingDistance,
	routeLength,
	smoothstep,
	stepEscort
} from './tutorial-math';
import type { EscortHold, Pt } from './tutorial-math';
import * as hud from './tutorial-hud';

/** A journey move as equipment.ts updateWorkflowTransitions runs it (journey.ts beginJourneyMove). */
interface Move {
	actor: THREE.Object3D;
	curve: THREE.CurvePath<THREE.Vector3>;
	start: number;
	duration: number;
	rise: unknown;
}
interface Leg {
	from: string;
	to: string;
	final: Pt;
	arrive?: () => void;
}
interface Escort {
	legs: Leg[];
	leg: number;
	moving: boolean;
	t: Move | null;
	stops: number[];
	hold: EscortHold;
	length: number;
}

const PARKED_Y = -50; // an E target off duty sits far below the floor
const ANCHOR_RANGE = { actor: 2.4, seat: 2.0, segment: 2.2 };
const ROUTE_REFRESH_S = 1;
const DOOR_OPEN_R = 6; // a door opens for Jordan this far ahead

let machine: TutorialState = OFF;
let active = false;
let dispatching = false;
const queue: TutorialEvent[] = [];
let chair: SeatAnchor | null = null;
let seatedAt: THREE.Vector3 | null = null;
let vaultHeld = false;
let dialogOpen = false,
	roleCardOpen = false,
	endOpen = false;
let lastAnswer: string | null = null;
const timers = new Set<ReturnType<typeof setTimeout>>();
let route: Pt[] = [];
let stopIdx = 1;
let routeFor = '';
let routeAge = 0;
let escort: Escort | null = null;
const anchors: { step: Step; obj: THREE.Object3D }[] = [];
const doorPts: [string, Pt][] = [];
// made on first use: an Object3D draws Math.random for its uuid, and the NPC check seeds Math.random
let proxy: THREE.Object3D | null = null;
const markerWorld = new THREE.Vector3(),
	markerView = new THREE.Vector3();

const at = (p: Pt) => new THREE.Vector3(p[0], 0, p[1]);
const xzOf = (o: THREE.Object3D): Pt => {
	const w = o.getWorldPosition(new THREE.Vector3());
	return [w.x, w.z];
};
const actorOf = (a: 'maya' | 'jordan') => (a === 'maya' ? PRIMARY_NPCS.lobby : JOURNEY.patient);

function after(ms: number, fn: () => void): void {
	const id = setTimeout(() => {
		timers.delete(id);
		fn();
	}, ms);
	timers.add(id);
}

function doorPoints(): [string, Pt][] {
	if (!doorPts.length)
		for (const r of ROOMS)
			if (!r.hub && doors.has(r.id)) {
				const p = doorPoint(r);
				doorPts.push([r.id, [p.x, p.z]]);
			}
	return doorPts;
}

function setLasers(on: boolean): void {
	for (const l of ROOM_LASERS.vault1 ?? []) l.visible = on;
}

function dispatch(ev: TutorialEvent): void {
	queue.push(ev);
	if (dispatching) return;
	dispatching = true;
	while (queue.length) {
		const r = reduceTutorial(machine, queue.shift()!);
		machine = r.state;
		for (const e of r.effects) perform(e);
	}
	dispatching = false;
}

function perform(e: Effect): void {
	switch (e.type) {
		case 'showStep': {
			showTrackerFor(CHAPTER_1[e.step - 1]);
			route = [];
			routeFor = '';
			return;
		}
		case 'action':
			ACTIONS[e.action]();
			return;
		case 'openDialog':
			openDialog(CHAPTER_1[e.step - 1]);
			return;
		case 'feedback': {
			const right = CHAPTER_1[machine.step - 1]?.decision?.options.find((o) => o.correct);
			hud.showFeedback(e.kind, e.text, lastAnswer, right?.id ?? null);
			return;
		}
		case 'closeDialog':
			closeDialog();
			return;
		case 'hint':
			hud.setHint(e.text);
			return;
		case 'roleChange':
			roleChange(e.role);
			return;
		case 'complete':
			openEnd();
			return;
	}
}

/* ---- dialogs, the role change and the end card (each pauses the game) ---- */
function openDialog(st: Step): void {
	dialogOpen = true; // before the lock goes, so losing it opens no settings menu
	if (st.exchange) hud.openExchange('Check-in', st.exchange);
	else if (st.decision) hud.openDecision(st.decision);
	setPaused('tutorial', true);
	if (document.pointerLockElement) document.exitPointerLock();
}
function closeDialog(): void {
	if (!dialogOpen) return;
	dialogOpen = false;
	lastAnswer = null;
	hud.closeDialog();
	setPaused('tutorial', false);
	requestWalkPointerLock();
}
function answer(id: string): void {
	lastAnswer = id;
	dispatch({ type: 'answered', option: id });
}
function roleChange(role: Role): void {
	roleCardOpen = true;
	setPaused('tutorial', true);
	hud.placeMarker(null);
	hud.placeEdge(null);
	hud.setFade(true);
	after(TUTORIAL_TIMING.roleFadeMs, () => {
		becomeRole(role);
		hud.showRoleCard(ROLES[role]);
		after(TUTORIAL_TIMING.roleCardMs, () => {
			hud.showRoleCard(null);
			hud.setFade(false);
			after(TUTORIAL_TIMING.roleFadeMs, () => {
				roleCardOpen = false;
				if (role === 'therapist') {
					// the mouse still turns the player under the card: play resumes facing the console
					player.yaw = WORLD.therapistStart.yaw;
					player.pitch = WORLD.therapistStart.pitch;
				}
				setPaused('tutorial', false);
				dispatch({ type: 'roleChangeDone' });
			});
		});
	});
}
/* Under the black: Jordan's figure sits in the chair the player used, Morgan Reed's figure goes
   (the player is now Morgan) and the player stands at the LINAC Control console. */
function becomeRole(role: Role): void {
	if (role !== 'therapist') return;
	seatedAt = null;
	const p = JOURNEY.patient;
	p.visible = true;
	p.userData.shouldSit = true;
	if (chair) seatActor(p, chair);
	JOURNEY.therapist.visible = false;
	const t = WORLD.therapistStart;
	player.pos.set(t.x, PLAYER_EYE_Y, t.z);
	player.yaw = t.yaw;
	player.pitch = t.pitch;
	camera.position.copy(player.pos);
	workflowState(
		'linaccontrol',
		'PATIENT READY',
		'Jordan Ellis checked in · waiting in reception',
		'#6fb6ff'
	);
	journeySpeech(JOURNEY.controlPartner, LINES.controlAlert, 'staff', 11000);
}
function showTrackerFor(st: Step): void {
	hud.showTracker({
		role: ROLES[st.role],
		step: st.n,
		total: CHAPTER_1.length,
		objective: st.objective,
		progress: progressOf(machine)
	});
}
function openEnd(): void {
	endOpen = true;
	// the tracker behind the card shows the chapter done: a full bar and no distance left
	showTrackerFor(CHAPTER_1[machine.step - 1]);
	hud.setDistance('');
	hud.placeMarker(null);
	hud.placeEdge(null);
	hud.showEnd(true);
	setPaused('tutorial', true);
	if (document.pointerLockElement) document.exitPointerLock();
}
function closeEnd(): boolean {
	if (!endOpen) return false;
	endOpen = false;
	hud.showEnd(false);
	setPaused('tutorial', false);
	return true;
}
function mainMenu(): void {
	if (closeEnd()) enterMode('title');
}
/* Free mode where the player stands: enterMode('free') places the player at the plaza (menu.ts),
   so the place and the view are put back after it. */
function keepExploring(): void {
	if (!closeEnd()) return;
	const pos = player.pos.clone(),
		yaw = player.yaw,
		pitch = player.pitch;
	enterMode('free');
	player.pos.copy(pos);
	player.yaw = yaw;
	player.pitch = pitch;
	camera.position.copy(pos);
	requestWalkPointerLock();
}

/* ---- the world actions the steps name (tutorial-steps.ts StepAction) ---- */
const ACTIONS: Record<StepAction, () => void> = {
	// the journey's pickup chair when it is free, else the free waiting chair nearest it
	pickChair: () => {
		chair =
			seatNear(LOBBY_PICKUP.chair, 1.0, JOURNEY.patient) ||
			seatNear(LOBBY_PICKUP.chair, 6, JOURNEY.patient);
	},
	sitPlayer: () => {
		if (!chair) return;
		const s = seatInWorld(chair),
			back = 0.12; // the hips sit this far behind the anchor (npc-behavior.ts seatActor)
		seatedAt = new THREE.Vector3(
			s.x - Math.sin(s.facing) * back,
			s.top + WORLD.seatedEyeAboveSeat,
			s.z - Math.cos(s.facing) * back
		);
		player.pos.copy(seatedAt);
		player.yaw = s.facing + Math.PI;
		player.pitch = -0.05;
		camera.position.copy(seatedAt);
	},
	intercomToControl: () => journeyIntercom(PRIMARY_NPCS.lobby, LINES.intercomToControl, 9000),
	jordanConfirms: () => journeySpeech(JOURNEY.patient, LINES.jordanConfirms, 'patient', 10000),
	escortToVault: () => {
		workflowState('lobby', 'IN TRANSIT', 'Jordan and therapist en route to Vault 1', '#42d5cf');
		workflowState('vault1', 'PATIENT ARRIVING', 'Treatment team preparing room', '#6fb6ff');
		startEscort([
			{
				from: 'lobby',
				to: 'vault1',
				final: WORLD.changingArea,
				arrive: () => {
					setPatientGown(JOURNEY.patient, true);
					setPatientGown(JOURNEY.couchPatient, true);
					journeySpeech(JOURNEY.patient, LINES.jordanChanged, 'patient', 10000);
				}
			},
			{
				from: 'vault1',
				to: 'vault1',
				final: WORLD.couchSide,
				arrive: () =>
					workflowState(
						'vault1',
						'PATIENT SETUP',
						'Preparing Jordan for daily treatment position',
						'#ffb454'
					)
			}
		]);
	},
	// the journey's vault setup pose: Jordan's figure gives way to the couch patient, in a gown
	jordanOnCouch: () => {
		JOURNEY.patient.visible = false;
		JOURNEY.couchPatient.visible = true;
		setPatientGown(JOURNEY.couchPatient, true);
		workflowState(
			'vault1',
			'PATIENT SETUP',
			'Jordan on couch · accessories and indexing verified',
			'#ffb454'
		);
	},
	lasersOn: () => setLasers(true),
	jamieAcrossCouch: () => {
		const v = JOURNEY.vaultTherapist;
		journeySpeech(v, LINES.jamieSetup, 'staff', 11000);
		moveJourneyActor(
			v,
			'vault1',
			'vault1',
			at(WORLD.jamieAcross),
			() => {
				faceNpcToward(v, JOURNEY.couchPatient);
				poseCharacter(v, 'support');
			},
			1.2
		);
	},
	// queued behind the walk round the couch: the leaving line is a cue, said as this walk starts
	jamieToControl: () => {
		const v = JOURNEY.vaultTherapist;
		moveJourneyActor(
			v,
			'vault1',
			'linaccontrol',
			at(WORLD.jamieControl),
			() => {
				v.rotation.y = -Math.PI / 2; // facing the console
				poseCharacter(v, 'console');
			},
			1.88,
			{ cues: [{ at: 0, text: LINES.jamieLeaving, ms: 10000 }] }
		);
	},
	holdVaultClosed: () => {
		vaultHeld = true;
		hideElena(true);
		setDoorTarget('vault1', false);
		workflowState(
			'vault1',
			'READY TO TREAT',
			'Jordan positioned · therapists in treatment control',
			'#ffb454'
		);
		workflowState(
			'linaccontrol',
			'IMAGE REVIEW',
			'Jordan Ellis · check images at the console',
			'#6fb6ff'
		);
	},
	shiftApplied: () => {
		workflowState(
			'linaccontrol',
			'IMAGE REVIEW',
			'Jordan Ellis · couch correction applied and verified',
			'#6fb6ff'
		);
		journeySpeech(JOURNEY.controlPartner, LINES.shiftVerified, 'staff', 10000);
	},
	beamOn: () => {
		workflowState(
			'vault1',
			'BEAM ON',
			'Treatment delivery · patient monitored remotely',
			'#ff737b'
		);
		workflowState(
			'linaccontrol',
			'MONITORING',
			'Vault 1 treatment in progress · CCTV and intercom active',
			'#ff737b'
		);
	},
	beamOff: () => {
		workflowState(
			'vault1',
			'TREATMENT COMPLETE',
			'Beam delivery complete · room re-entry',
			'#65dda0'
		);
		workflowState('linaccontrol', 'COMPLETE', 'Therapists returning to Vault 1', '#65dda0');
	},
	releaseVaultDoor: () => {
		vaultHeld = false;
		hideElena(false);
	},
	jamieBackIn: () => {
		const v = JOURNEY.vaultTherapist;
		moveJourneyActor(
			v,
			'linaccontrol',
			'vault1',
			at(WORLD.jamieBack),
			() => {
				faceNpcToward(v, JOURNEY.couchPatient);
				poseCharacter(v, 'support');
			},
			1.88
		);
	},
	jordanOffCouch: () => {
		const p = JOURNEY.patient;
		JOURNEY.couchPatient.visible = false;
		setPatientGown(JOURNEY.couchPatient, false);
		setPatientGown(p, false);
		p.position.set(WORLD.offCouch[0], 0, WORLD.offCouch[1]);
		p.rotation.y = Math.atan2(player.pos.x - p.position.x, player.pos.z - p.position.z);
		p.visible = true;
		setLasers(false);
		workflowState('vault1', 'ROOM TURNOVER', 'Patient leaving · room reset begins', '#42d5cf');
		journeySpeech(p, LINES.jordanOffCouch, 'patient', 10000);
	},
	escortToLobby: () => {
		workflowState('lobby', 'DEPARTING', 'Jordan Ellis · treatment complete', '#65dda0');
		workflowState('vault1', 'AVAILABLE', 'Room turnover complete', '#65dda0');
		workflowState('linaccontrol', 'READY', 'Preparing for next scheduled patient', '#42d5cf');
		startEscort([
			{
				from: 'vault1',
				to: 'lobby',
				final: WORLD.lobbyDesk,
				arrive: () => faceNpcToward(JOURNEY.patient, PRIMARY_NPCS.lobby)
			}
		]);
	},
	jordanThanks: () => journeySpeech(JOURNEY.patient, LINES.jordanThanks, 'patient', 10000)
};

/* Elena Torres, Jamie Williams's partner beside the couch, is out of sight while the vault door is
   shut for the beam: Jordan stays alone in the vault, and LINAC Control's camera feeds frame the
   couch. Found by name (npc.ts setNamedNpcRole); nothing happens if she is not there. */
const ELENA = 'Elena Torres';
let elenaHidden: THREE.Object3D | null = null;
function hideElena(hide: boolean): void {
	if (!hide) {
		if (elenaHidden) elenaHidden.visible = true;
		elenaHidden = null;
		return;
	}
	const e = (ROOM_CAST.vault1 ?? []).find((x) => x.g.userData.npcName === ELENA)?.g,
		[x, z] = e ? xzOf(e) : [0, 0];
	if (!e || !e.visible || roomContainingWalkPoint(x, z)?.id !== 'vault1') return;
	e.visible = false;
	elenaHidden = e;
}

/* ---- Jordan's escorts: the journey's moves, held at each door and corner for the player ---- */
function startEscort(legs: Leg[]): void {
	escort = {
		legs,
		leg: 0,
		moving: false,
		t: null,
		stops: [],
		hold: { next: 0, holding: false },
		length: 0
	};
}
function beginLeg(): void {
	const i = escort.leg,
		L = escort.legs[i];
	escort.moving = true;
	moveJourneyActor(JOURNEY.patient, L.from, L.to, at(L.final), () => legDone(i), WORLD.escortSpeed);
	attachLeg();
}
// The move's entry, once it exists (a move queued behind another starts when that one ends).
function attachLeg(): void {
	const t = (workflowTransitions as Move[]).find((w) => w.actor === JOURNEY.patient);
	if (!t) return;
	const pts = curvePoints(t.curve);
	escort.t = t;
	escort.stops = escortStops(
		pts,
		doorPoints().map(([, p]) => p)
	);
	escort.hold = { next: 0, holding: false };
	escort.length = routeLength(pts);
	// at walking pace: the journey caps a move at 32 s, which on the 100 m walk to the vault is a run
	t.duration = Math.max(t.duration, escort.length / WORLD.escortSpeed);
}
function legDone(i: number): void {
	if (!escort || escort.leg !== i) return;
	escort.legs[i].arrive?.();
	escort.t = null;
	escort.moving = false;
	if (i + 1 < escort.legs.length) {
		escort.leg = i + 1; // starts when the player is within ESCORT_WAIT_R
		return;
	}
	escort = null;
	dispatch({ type: 'reachedTarget' });
}
/** One frame of the escort: Jordan's distance to the player and Jordan's walk still to go. */
function updateEscort(): { gap: number; remaining: number } | null {
	if (!escort) return null;
	const p = JOURNEY.patient,
		jp = p.position, // Jordan's figure is a scene child: local is world
		gap = Math.hypot(player.pos.x - jp.x, player.pos.z - jp.z);
	if (!escort.moving && gap <= ESCORT_WAIT_R) beginLeg();
	else if (escort.moving && !escort.t) attachLeg();
	let e = 0;
	const t = escort.t;
	if (t && !t.rise) {
		e = smoothstep((S.simSec - t.start) / t.duration);
		const r = stepEscort(escort.hold, e, escort.stops, gap);
		escort.hold = r.hold;
		if (r.holdAt !== null) {
			// keep the move at the stop: its clock restarts from there when the player comes
			t.start = S.simSec - invSmoothstep(r.holdAt) * t.duration;
			p.position.copy(t.curve.getPoint(r.holdAt));
			poseCharacter(p, 'neutral');
			e = r.holdAt;
		}
	}
	for (const [id, d] of doorPoints())
		if (Math.hypot(jp.x - d[0], jp.z - d[1]) < DOOR_OPEN_R) setDoorTarget(id, true);
	let remaining = t ? (1 - e) * escort.length : 0,
		from: Pt = escort.moving ? escort.legs[escort.leg].final : [jp.x, jp.z];
	for (let k = escort.leg + (escort.moving ? 1 : 0); k < escort.legs.length; k++) {
		remaining += dist(from, escort.legs[k].final);
		from = escort.legs[k].final;
	}
	return { gap, remaining };
}

/* ---- the marker: door by door along the walking route ---- */
function curvePoints(curve: THREE.CurvePath<THREE.Vector3>): Pt[] {
	const cs = curve.curves as THREE.LineCurve3[];
	if (!cs.length) return [];
	const last = cs[cs.length - 1].v2;
	return [...cs.map((c) => [c.v1.x, c.v1.z] as Pt), [last.x, last.z]];
}
/** Where the marker leads for a step: the spot to stand at for an E target, the room's inside
    point, or the escort's end. */
function destination(st: Step, p: Pt): Pt {
	const sp = st.target.spec;
	if (sp.kind === 'actor') {
		if (sp.stand) return sp.stand;
		const a = actorOf(sp.actor),
			[x, z] = xzOf(a);
		return [x + Math.sin(a.rotation.y) * 1.1, z + Math.cos(a.rotation.y) * 1.1];
	}
	if (sp.kind === 'seat') {
		if (!chair) return WORLD.checkIn;
		const s = seatInWorld(chair);
		return [s.x + Math.sin(s.facing) * 0.6, s.z + Math.cos(s.facing) * 0.6];
	}
	if (sp.kind === 'segment') {
		// in front of the edge where the player is nearest it, on the stand side
		const q = closestOnSegment(p, sp.a, sp.b),
			o = closestOnSegment(sp.stand, sp.a, sp.b),
			n = dist(sp.stand, o) || 1;
		return [q[0] + ((sp.stand[0] - o[0]) / n) * 0.7, q[1] + ((sp.stand[1] - o[1]) / n) * 0.7];
	}
	if (sp.kind === 'room') {
		const p = insidePoint(roomById(sp.roomId));
		return [p.x, p.z];
	}
	return sp.final;
}
/* The walking route from the player: from the plaza in through the main entrance, then the NPC
   route builder's (out through the room's door and graph, the corridors, in through the target
   room's door and graph). */
function buildRoute(st: Step): Pt[] {
	const p: Pt = [player.pos.x, player.pos.z],
		dest = destination(st, p),
		pre: Pt[] = [];
	let from = p;
	if (
		!roomContainingWalkPoint(p[0], p[1]) &&
		p[1] > WORLD.plazaZ &&
		Math.abs(p[0]) < WORLD.plazaHalfX
	) {
		pre.push(p, WORLD.entranceOut);
		from = WORLD.entranceIn;
	}
	proxy ??= new THREE.Object3D();
	proxy.position.set(from[0], 0, from[1]);
	const pts = curvePoints(movementPathFor(proxy, null, st.target.roomId, at(dest)));
	const out = [...pre, ...(pts.length > 1 ? pts : [from, dest])];
	// the next stop is the farthest one in plain sight: a rebuilt route never starts at a node
	// already passed, and an in-room hop goes straight
	while (out.length > 2 && !lineBlocked(out[0], out[2], getColliders())) out.splice(1, 1);
	return out.length > 1 ? out : [p, dest];
}
/** The marker and the tracker's distance for this frame; returns the walking distance. */
function updateMarker(st: Step, dt: number): number {
	const p: Pt = [player.pos.x, player.pos.z],
		key = `${st.n}|${roomContainingWalkPoint(p[0], p[1])?.id ?? 'out'}`;
	routeAge += dt;
	if (
		key !== routeFor ||
		route.length < 2 ||
		routeAge >= ROUTE_REFRESH_S ||
		offRoute(route, stopIdx, p)
	) {
		route = buildRoute(st);
		stopIdx = 1;
		routeFor = key;
		routeAge = 0;
	}
	stopIdx = advanceStop(route, stopIdx, p);
	const d = remainingDistance(route, stopIdx, p);
	hud.setDistance(formatDistance(d));
	const stop = route[stopIdx];
	// at the last stop the room or the E prompt takes over; an E target not yet on screen keeps the
	// edge arrow, pointing at it, until the player turns to it and its prompt shows
	const there = stop && stopIdx === route.length - 1 && dist(p, stop) < MARKER_SWITCH_R,
		eTarget = there
			? anchors.find((x) => x.step === st && x.obj.position.y !== PARKED_Y)?.obj
			: undefined;
	if (machine.phase !== 'active' || !stop || (there && !eTarget)) {
		hud.placeMarker(null);
		hud.placeEdge(null);
		return d;
	}
	const label = `${st.target.place} · ${formatDistance(d)}`;
	camera.updateMatrixWorld();
	if (eTarget) markerWorld.copy(eTarget.position);
	else markerWorld.set(stop[0], 1.6, stop[1]);
	const behind = markerView.copy(markerWorld).applyMatrix4(camera.matrixWorldInverse).z > 0;
	markerWorld.project(camera);
	const a = edgeArrow(markerWorld.x, markerWorld.y, behind, 0.06);
	if (!a.onScreen) {
		hud.placeMarker(null);
		hud.placeEdge({ x: a.x, y: a.y, angle: a.angle, label });
	} else if (eTarget) {
		// on screen: its E prompt is there
		hud.placeMarker(null);
		hud.placeEdge(null);
	} else if (lineBlocked(p, stop, getColliders())) {
		// never through a wall: hide it and rebuild the route from here next frame
		hud.placeMarker(null);
		hud.placeEdge(null);
		routeAge = ROUTE_REFRESH_S;
	} else {
		hud.placeEdge(null);
		hud.placeMarker({ x: a.x, y: a.y, label });
	}
	return d;
}

/* ---- the E targets: one per press-E step, enabled only while that step is waiting for E ---- */
function anchorPoint(st: Step, p: Pt): Pt | null {
	const sp = st.target.spec;
	if (sp.kind === 'actor') return xzOf(actorOf(sp.actor));
	if (sp.kind === 'seat') {
		if (!chair) return null;
		const s = seatInWorld(chair);
		return [s.x, s.z];
	}
	if (sp.kind === 'segment') return closestOnSegment(p, sp.a, sp.b);
	return null;
}
/* At reach height over the target (a person is measured along the floor, so this one ties with theirs
   and wins, being registered later: interact.ts TIE_EPS), or the point of a desk or couch edge nearest the player (in front of every
   screen or panel behind that edge). */
function ensureAnchors(): void {
	if (anchors.length) return;
	for (const st of CHAPTER_1) {
		if (st.trigger !== 'pressE') continue;
		const obj = new THREE.Object3D(); // no mesh: the E prompt sits at its point (hud-prompt.ts)
		obj.position.set(0, PARKED_Y, 0);
		scene.add(obj);
		const kind = st.target.spec.kind as keyof typeof ANCHOR_RANGE;
		registerInteractable(
			obj,
			st.target.label,
			'',
			ANCHOR_RANGE[kind],
			null,
			() => dispatch({ type: 'pressedE', target: st.target.id }),
			{
				enabled: () => active && machine.phase === 'active' && machine.step === st.n
			}
		);
		anchors.push({ step: st, obj });
	}
}

/* ---- start, exit and the frame ---- */
/** The people the tutorial's script speaks for, locked while it runs: no hand-over takes them and
    they trade no background exchange lines (npc-behavior.ts startActorHandoff, updateNpcExchanges).
    Jordan, Jamie Williams, Morgan Reed and Maya Brooks. */
const scripted = () => [
	JOURNEY.patient,
	JOURNEY.vaultTherapist,
	JOURNEY.therapist,
	PRIMARY_NPCS.lobby
];
function startTutorial(): void {
	if (active) exitTutorial();
	ensureAnchors();
	resetTreatmentJourney(true);
	active = true;
	JOURNEY.patient.visible = false; // the player is Jordan
	JOURNEY.couchPatient.visible = false; // the couch stays empty until Jordan lies down
	for (const a of scripted()) a.userData.tutorialLocked = true;
	setLasers(false);
	workflowState('linaccontrol', 'READY', 'Vault 1 scheduled for Jordan Ellis', '#42d5cf');
	workflowState('vault1', 'AVAILABLE', 'Awaiting patient arrival', '#65dda0');
	dispatch({ type: 'start' });
}
function exitTutorial(): void {
	active = false;
	for (const id of timers) clearTimeout(id);
	timers.clear();
	queue.length = 0;
	machine = OFF;
	hud.hideTutorialHud();
	dialogOpen = roleCardOpen = endOpen = false;
	lastAnswer = null;
	setPaused('tutorial', false);
	if (seatedAt) player.pos.y = PLAYER_EYE_Y;
	seatedAt = null;
	vaultHeld = false;
	escort = null;
	chair = null;
	route = [];
	routeFor = '';
	for (const a of scripted()) a.userData.tutorialLocked = false;
	for (const a of [JOURNEY.patient, JOURNEY.vaultTherapist]) a.userData.inHandoff = false;
	JOURNEY.therapist.visible = true;
	hideElena(false);
	setLasers(true);
	resetTreatmentJourney(true);
}

/** Called every simulation frame (main.ts stepSimulation, after the journey moves). */
export function updateTutorial(dt: number): void {
	if (!active) return;
	if (seatedAt) {
		player.pos.copy(seatedAt); // seated: no walking
		camera.position.copy(seatedAt);
	}
	if (vaultHeld) setDoorTarget('vault1', false); // closed for the beam, whoever walks up to it
	const esc = updateEscort(),
		st = CHAPTER_1[machine.step - 1];
	if (!st) return;
	const p: Pt = [player.pos.x, player.pos.z];
	for (const a of anchors) {
		const q = a.step.n === machine.step ? anchorPoint(a.step, p) : null;
		if (q) a.obj.position.set(q[0], REACH_Y, q[1]);
		else a.obj.position.y = PARKED_Y;
	}
	if (machine.phase !== 'active' && machine.phase !== 'waiting') {
		hud.placeMarker(null);
		hud.placeEdge(null);
		return;
	}
	// in LINAC Control, with Jamie Williams out of the vault too: nobody stays in for the beam
	const inRoom =
		machine.phase === 'active' &&
		st.trigger === 'enterRoom' &&
		roomContainingWalkPoint(p[0], p[1])?.id === st.target.roomId;
	if (inRoom && !actorHasTransition(JOURNEY.vaultTherapist)) {
		dispatch({ type: 'reachedTarget' });
		return;
	}
	const d = updateMarker(st, dt);
	dispatch({
		type: 'tick',
		dt,
		distance: esc ? esc.remaining : d,
		escortAhead: !!esc && escortAhead(esc.gap, d, esc.remaining),
		heldForJamie: inRoom
	});
}

function installCheckHook(): void {
	if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('npccheck'))
		return;
	Object.assign(window, {
		__TUTORIAL: {
			steps: CHAPTER_1,
			/** As the title menu's Tutorial entry does. */
			enter: () => enterMode('tutorial'),
			mode: () => getPlayMode(),
			state: () => ({
				...machine,
				active,
				seated: !!seatedAt,
				vaultHeld,
				dialogOpen,
				roleCardOpen,
				endOpen,
				escortHolding: !!escort?.hold.holding
			}),
			/** Where the marker leads for the current step. */
			standPoint: () =>
				machine.step
					? destination(CHAPTER_1[machine.step - 1], [player.pos.x, player.pos.z])
					: null,
			placePlayer: (x: number, z: number, yaw?: number) => {
				player.pos.set(x, PLAYER_EYE_Y, z);
				if (yaw !== undefined) player.yaw = yaw;
				camera.position.copy(player.pos);
			},
			playerPos: () => [player.pos.x, player.pos.z],
			/** Turns the player to the current step's E target, as a player does before pressing E:
			    E only offers what is in front of the player (interact.ts inView). */
			faceTarget: () => {
				const a = anchors.find((x) => x.step.n === machine.step);
				if (a && a.obj.position.y !== PARKED_Y) aimPlayerAt(a.obj.position);
			},
			pressE: () => performInteraction(),
			answer,
			cont: () => dispatch({ type: 'continue' }),
			mainMenu,
			keepExploring,
			/** Leaves the tutorial from anywhere, as Settings > Main menu does. */
			toTitle: () => enterMode('title'),
			route: () => route.map((q) => [q[0], q[1]]),
			routeHitsWall: () =>
				route.some((q, i) => i > 0 && lineBlocked(route[i - 1], q, getColliders())),
			lasersOn: () => (ROOM_LASERS.vault1 ?? []).every((l) => l.visible),
			chair: () => (chair ? seatInWorld(chair) : null)
		}
	});
}

/** Boot (main.ts): the screen, Esc, the play-mode switch, the menu entry and the check hook. */
export function initTutorial(): void {
	hud.initTutorialHud({
		answer,
		cont: () => dispatch({ type: 'continue' }),
		mainMenu,
		keepExploring
	});
	registerDialog(
		'tutorial',
		() => dialogOpen || roleCardOpen || endOpen,
		() => {
			if (dialogOpen) dispatch({ type: 'closeDialog' });
			else if (endOpen) keepExploring();
		}
	);
	onPlayModeChange((m) => {
		if (m === 'tutorial') startTutorial();
		else if (active) exitTutorial();
	});
	setTutorialAvailable(true);
	installCheckHook();
}
