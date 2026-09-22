// @ts-nocheck -- converted in this PR, header removed per-module
/* RTApps (#77 sim-hub modularization, task 9 — final extraction): the patient-journey narrative
   state machine and its conversation-camera composition helpers. Verbatim extractions from
   main.js: the two treatment-journey pathways (`startTreatmentJourney`/`advanceTreatmentJourney`
   and the escort/pickup/handoff sequence functions for Jordan Ellis; `advanceNewPatientJourney`
   and the `beginMia*` consult/CT-sim/planning/first-treatment sequence for Mia Reynolds),
   `resetTreatmentJourney`/`setJourneyKind`/`journeyActors`/`applyJourneyPatientFocus`,
   `JOURNEY`/`JOURNEY_META`/`ROOM_WORKFLOW`/`MIA_SIM_SETUP`/`workflowTransitions` state,
   `journeySpeech`/`journeyIntercom`/`journeyAudioCue`/`playIntercomAudio` narration,
   `updateJourneyCameraFollow`/`setJourneyCameraFollow`/`clearJourneyCameraFollow`/
   `moveJourneyActor`/`journeyFocusActors` camera and blocking, `updateJourneyRoomTiming`/
   `roomElapsedLabel`/`journeyActorRoom` per-room dwell tracking, `currentJourneyMeta`/
   `journeyNextLabel`/`journeyProgress`/`updateJourneyUI` HUD state, `showJourneyCheckinIntro`/
   `showDayTransition`/`startJourneyFromKiosk`, and the conversation-camera composition helpers
   `focusTargetsForRoom`/`conversationCameraPose`/`focusConversationCamera`/`walkCompositionReady`/
   `applyWalkConversationComposition`/`beginRoutePhase`/`enableGuidedConversationComposition`/
   `beginEntryPhase`. `JOURNEY_ROOM_TIMING`/`JOURNEY_META`/`activeJourneyPatientActor` and the
   internal begin-/create-/journey- prefixed helpers used only by the sequences above moved
   along with their sole consumers and are not exported. `updateJourneyRoomTiming`/`journeyActors`/
   `updateJourneyCameraFollow`/`setJourneyKind`/`applyJourneyPatientFocus`/
   `resetTreatmentJourney`/`startTreatmentJourney`/`advanceTreatmentJourney`/
   `startJourneyFromKiosk`/`clearJourneyCameraFollow` gained `export` here — main.js's
   bootstrap/wiring and ./sdk-bridge.js's `focusCtPatientFromControl` call them across the
   module boundary. `roomById`/`ROOM_GUIDES`/`ROOM_CAST`/`PRIMARY_NPCS`/`PRIMARY_PATIENTS`/
   `doors`/`player` stay owned by main.js and are imported back here;
   `focusCtPatientFromControl` (CT QA control-room camera cut, task 9's other sdk-bridge.js
   anchor) is owned by ./sdk-bridge.js and imported back here for
   `advanceNewPatientJourney`'s use. */
import * as THREE from 'three';
import { S } from './state';
import { box, sphere, std, cleanPoints, later } from './helpers';
import { scene, camera, orbit, AMBIENCE, initAmbience } from './scene';
import { ROOMS } from './rooms';
import {
	setPatientGown,
	setNpcRole,
	poseCharacter,
	npcBubble,
	bubbleVis,
	faceNpcToward
} from './npc';
import { movers, interactionScenes, setActorSeated, movementPathFor } from './npc-behavior';
import {
	workflowState,
	resetCtCouchMotion,
	startCtCouchScan,
	clearClinicalFocus
} from './equipment';
import {
	doorNormal,
	doorPoint,
	insidePoint,
	aimPlayerAt,
	makeRouteToApproach,
	roomContainingWalkPoint,
	setDoorTarget,
	beginTravel,
	setMode,
	makePolylineCurve
} from './walk';
import { toast, closeKioskDialog, roomInspectPose, updateRoomUI, renderRoomList } from './interact';
import {
	roomById,
	ROOM_GUIDES,
	ROOM_CAST,
	PRIMARY_NPCS,
	PRIMARY_PATIENTS,
	doors,
	player
} from './main';
import { focusCtPatientFromControl } from './sdk-bridge';

const JOURNEY_ROOM_TIMING = { roomId: null, enteredAt: 0, lastPatient: null };
function activeJourneyPatientActor() {
	if (typeof JOURNEY === 'undefined' || !JOURNEY.active) return null;
	if (JOURNEY.kind === 'treatment')
		return JOURNEY.jordanOnCouch ? JOURNEY.couchPatient : JOURNEY.patient;
	if (JOURNEY.miaOnTreatmentCouch) return JOURNEY.miaTreatmentPatient;
	if (JOURNEY.miaOnTable) return JOURNEY.ctSimPatient;
	return JOURNEY.newPatient;
}
export function journeyActorRoom(actor) {
	if (!actor || actor.visible === false) return null;
	const p = new THREE.Vector3();
	actor.getWorldPosition(p);
	return (
		ROOMS.find(
			(r) =>
				p.x >= r.x - r.w / 2 - 0.25 &&
				p.x <= r.x + r.w / 2 + 0.25 &&
				p.z >= r.z - r.d / 2 - 0.25 &&
				p.z <= r.z + r.d / 2 + 0.25
		) || null
	);
}
export function updateJourneyRoomTiming(now = performance.now()) {
	if (typeof JOURNEY === 'undefined' || !JOURNEY.active) {
		JOURNEY_ROOM_TIMING.roomId = null;
		JOURNEY_ROOM_TIMING.enteredAt = 0;
		JOURNEY_ROOM_TIMING.lastPatient = null;
		return;
	}
	const actor = activeJourneyPatientActor(),
		room = journeyActorRoom(actor),
		patient = currentJourneyMeta?.().patient || '';
	const id = room?.id || null;
	if (id !== JOURNEY_ROOM_TIMING.roomId || patient !== JOURNEY_ROOM_TIMING.lastPatient) {
		JOURNEY_ROOM_TIMING.roomId = id;
		JOURNEY_ROOM_TIMING.enteredAt = now;
		JOURNEY_ROOM_TIMING.lastPatient = patient;
	}
}
export function roomElapsedLabel(roomId, now = performance.now()) {
	if (!roomId || JOURNEY_ROOM_TIMING.roomId !== roomId || !JOURNEY_ROOM_TIMING.enteredAt) return '';
	const sec = Math.max(0, Math.floor((now - JOURNEY_ROOM_TIMING.enteredAt) / 1000)),
		m = Math.floor(sec / 60),
		s = sec % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} in room`;
}
/* Patient journeys */
export const ROOM_WORKFLOW = {
	lobby: { state: 'OPEN', detail: 'Routine arrivals', color: '#42d5cf' },
	linaccontrol: { state: 'READY', detail: 'Treatment team available', color: '#42d5cf' },
	vault1: { state: 'AVAILABLE', detail: 'Room ready for next patient', color: '#65dda0' },
	consult: { state: 'READY', detail: 'Consult room available', color: '#42d5cf' },
	education: { state: 'READY', detail: 'Patient education available', color: '#42d5cf' },
	ctsim: { state: 'AVAILABLE', detail: 'CT simulator ready', color: '#65dda0' },
	ctcontrol: { state: 'READY', detail: 'CT control ready', color: '#42d5cf' }
};
export const workflowTransitions = [];
export const JOURNEY = {
	active: false,
	busy: false,
	kind: 'treatment',
	stage: 'idle',
	patientName: 'Jordan Ellis',
	patient: null,
	therapist: null,
	vaultTherapist: null,
	controlPartner: null,
	couchPatient: null,
	newPatient: null,
	consultStaff: null,
	navigator: null,
	ctTherapist: null,
	ctControlTherapist: null,
	ctControlPartner: null,
	dosimetrist: null,
	dosimetryPartner: null,
	physicist: null,
	physicsPartner: null,
	staticCtPatient: null,
	ctSimPatient: null,
	miaTreatmentPatient: null,
	jordanOnCouch: false,
	miaOnTable: false,
	miaOnTreatmentCouch: false,
	introPending: false,
	vaultMonitorPatientOnly: false,
	sceneTimer: 0,
	sceneTimers: [],
	cameraFollow: null,
	cameraRoomId: null
};
const JOURNEY_META = {
	treatment: {
		title: 'Returning Treatment Patient',
		patient: 'Jordan Ellis',
		type: 'Returning treatment patient',
		idle: 'Follow one patient from check-in through treatment and departure.',
		labels: {
			idle: 'Start at reception',
			checkin: 'Complete check-in and begin pickup',
			setup: 'Begin verification imaging',
			imaging: 'Deliver treatment',
			treatment: 'Complete treatment',
			returning: 'Assist patient after treatment',
			departure: 'Escort patient to exit',
			done: 'Journey complete'
		},
		desc: {
			idle: 'Follow one patient from check-in through treatment and departure.',
			checkin: 'Jordan is checking in for a scheduled treatment visit.',
			waiting: 'Jordan is seated in the waiting area while Treatment Control is alerted.',
			alert: 'The treatment therapist has been alerted and is heading to reception.',
			called: 'The therapist has greeted Jordan and is escorting him to Vault 1.',
			setup: 'Jordan is in Vault 1 while the therapists reproduce the treatment setup.',
			imaging: 'Verification imaging is underway before treatment delivery.',
			treatment: 'Therapists are outside the vault monitoring treatment from the control area.',
			returning: 'Treatment is complete; therapists are returning to the vault.',
			departure: 'Jordan is leaving the treatment area after today’s fraction.',
			done: 'Treatment-day journey complete. Reset to run it again.'
		}
	},
	newpatient: {
		title: 'Mia Reynolds · Consult to First Treatment',
		patient: 'Mia Reynolds',
		type: 'New patient · simulation · planning · first treatment',
		idle: 'Follow Mia from her first consultation through CT simulation, treatment planning, physics QA, and her return for the first radiation treatment.',
		labels: {
			idle: 'Start at reception',
			checkin: 'Complete check-in and begin consult',
			consult: 'Continue to patient education',
			education: 'Escort to CT simulation',
			ctsetup: 'Begin CT scan',
			ctscan: 'Complete simulation',
			ctdone: 'Review first-treatment instructions',
			instructions: 'Preparing to return to lobby',
			escort: 'Escorting Mia to reception',
			plantransfer: 'Send CT dataset to dosimetry',
			dosimetry: 'Create computer treatment plan',
			physicsqa: 'Perform physics QA',
			planrelease: 'Release plan to LINAC Control',
			firstreturn: 'Begin Tuesday first-treatment visit',
			firstcheckin: 'Complete check-in and call therapist',
			firstsetup: 'Acquire first-treatment verification imaging',
			firstimaging: 'Deliver first radiation treatment',
			firsttreatment: 'Complete first treatment',
			firstcomplete: 'Review post-treatment instructions',
			firstdeparture: 'Escort Mia to exit',
			done: 'Journey complete'
		},
		desc: {
			idle: 'Follow Mia from arrival through consultation, education, CT simulation, discharge, treatment planning, physics QA and her first radiation treatment.',
			checkin: 'Mia is checking in for her first consultation visit.',
			waiting: 'Mia is seated briefly while the consultation room is prepared.',
			consult: 'The radiation oncologist is meeting Mia for the initial consultation.',
			education: 'A navigator is reviewing the care pathway and preparing Mia for CT simulation.',
			ctsetup: 'Radiation therapists are reproducing immobilization and setup for the planning CT.',
			ctscan:
				'The CT couch is moving Mia through the gantry while the planning CT is acquired from the control room.',
			ctdone:
				'CT simulation is complete; the therapist is helping Mia off the table before discharge instructions.',
			instructions:
				'The therapist is reviewing general instructions and Mia’s simulated first-treatment appointment.',
			escort: 'The therapist is escorting Mia back to reception so she can leave the center.',
			plantransfer:
				'After Mia leaves, the CT team sends the image dataset plus indexed setup and immobilization instructions to Dosimetry.',
			dosimetry:
				'The medical dosimetrist is creating and evaluating the computer treatment plan from the physician prescription and CT dataset.',
			physicsqa:
				'Medical physics is performing the technical plan review and required QA before treatment release.',
			planrelease:
				'The verified plan is being released to LINAC Control for Mia’s scheduled first treatment.',
			firstreturn:
				'Time advances to Tuesday morning. Mia is returning for her scheduled 9:30 AM first treatment and is due to check in at 9:15 AM.',
			firstcheckin:
				'Mia has checked in for her first treatment. The treatment team will be alerted that she is waiting.',
			firstwaiting:
				'Mia is seated in reception while Treatment Control confirms that the approved plan, physics clearance, and simulation setup record are available.',
			firstpickup:
				'The treatment therapist is retrieving Mia and preparing to reproduce the simulation setup in Vault 1.',
			firstsetup:
				'Mia is in Vault 1 while the therapists reproduce the position, supports and indexing documented at CT simulation.',
			firstimaging:
				'The first-treatment setup is complete and verification imaging is being acquired before any treatment is delivered.',
			firsttreatment:
				'Mia’s first fraction is being delivered while the therapists monitor the treatment from the protected control area.',
			firstcomplete:
				'The first fraction is complete and the therapists are assisting Mia off the treatment couch.',
			firstdeparture:
				'Mia is leaving after her first treatment with instructions for subsequent visits and symptom reporting.',
			done: 'Mia’s longitudinal journey is complete: consultation, CT simulation, planning, physics QA, and first treatment have all been demonstrated.'
		}
	}
};
export function currentJourneyMeta() {
	return JOURNEY_META[JOURNEY.kind] || JOURNEY_META.treatment;
}
export const MIA_SIM_SETUP = {
	position: 'Head First Supine',
	headSupport: 'Indexed head support',
	lowerSupport: 'Indexed knee support',
	tableIndex: 'Recorded at CT simulation',
	reference: 'Simulation reference marks documented',
	plan: 'Approved',
	physicsQA: 'Passed',
	fraction: '1 / simulated course',
	appointment: 'Tuesday 9:30 AM',
	checkin: '9:15 AM',
	imaging: 'Verification imaging required'
};
function showDayTransition(title, sub, ms = 4200) {
	const box = document.getElementById('dayTransition');
	if (!box) return;
	document.getElementById('dayTransitionTitle').textContent = title;
	document.getElementById('dayTransitionSub').textContent = sub;
	box.classList.add('show');
	setTimeout(() => box.classList.remove('show'), ms);
}
function journeyProgress() {
	const stages =
		JOURNEY.kind === 'treatment'
			? [
					'idle',
					'checkin',
					'waiting',
					'alert',
					'called',
					'setup',
					'imaging',
					'treatment',
					'returning',
					'departure',
					'done'
				]
			: [
					'idle',
					'checkin',
					'waiting',
					'consult',
					'education',
					'ctsetup',
					'ctscan',
					'ctdone',
					'instructions',
					'escort',
					'plantransfer',
					'dosimetry',
					'physicsqa',
					'planrelease',
					'firstreturn',
					'firstcheckin',
					'firstwaiting',
					'firstpickup',
					'firstsetup',
					'firstimaging',
					'firsttreatment',
					'firstcomplete',
					'firstdeparture',
					'done'
				];
	const i = Math.max(0, stages.indexOf(JOURNEY.stage));
	return Math.round((i / (stages.length - 1)) * 100);
}
export function journeyNextLabel() {
	return currentJourneyMeta().labels[JOURNEY.stage] || 'Sequence running…';
}
export function updateJourneyUI() {
	const meta = currentJourneyMeta(),
		start = document.getElementById('journeyStart'),
		next = document.getElementById('journeyNext'),
		phase = document.getElementById('journeyPhaseLabel'),
		txt = document.getElementById('journeyStepText'),
		bar = document.getElementById('journeyProgress'),
		hud = document.getElementById('patientJourneyHUD');
	if (!start || !next) return;
	document.getElementById('journeyTitle').textContent = meta.title;
	document.getElementById('jhPatient').textContent = meta.patient;
	document.getElementById('jhType').textContent = meta.type;
	start.style.display = JOURNEY.active ? 'none' : 'block';
	next.disabled = !JOURNEY.active || JOURNEY.busy || JOURNEY.stage === 'done' || !!S.travel;
	next.textContent = JOURNEY.busy ? 'Sequence running…' : journeyNextLabel();
	phase.textContent = JOURNEY.active
		? JOURNEY.stage.toUpperCase().replaceAll('_', ' ')
		: 'Optional journey';
	txt.textContent = meta.desc[JOURNEY.stage] || meta.idle;
	bar.style.width = journeyProgress() + '%';
	hud.classList.toggle('show', JOURNEY.active);
	document.getElementById('jhPhase').textContent =
		JOURNEY.stage === 'idle' ? 'Check-in' : JOURNEY.stage.toUpperCase().replaceAll('_', ' ');
	document.getElementById('jhSub').textContent = txt.textContent;
	document
		.querySelectorAll('#journeyModes button')
		.forEach((b) => b.classList.toggle('active', b.dataset.journey === JOURNEY.kind));
}
function createJourneyLyingPatient(room, skin = 0xd7a17d, hairColor = 0x3a281f) {
	const cont = new THREE.Group(),
		topMat = std(0xd3d9dd, 0.78, 0.02),
		pantMat = std(0xc3cace, 0.82, 0.03),
		skinMat = std(skin, 0.9, 0.0),
		hairMat = std(hairColor, 0.82, 0.02),
		shoeMat = std(0x252b30, 0.85, 0.1),
		lift = 0.48;
	const torso = box(0.82, 0.22, 0.42, topMat, 0, 0.9 + lift, -0.05),
		pelvis = box(0.42, 0.2, 0.42, topMat, 0.5, 0.88 + lift, -0.02),
		neck = box(0.08, 0.06, 0.08, skinMat, -0.52, 0.92 + lift, 0);
	cont.add(torso, pelvis, neck);
	const hd = sphere(0.17, skinMat);
	hd.scale.y = 1.04;
	hd.position.set(-0.72, 0.92 + lift, 0);
	cont.add(hd);
	const hair = sphere(0.175, hairMat);
	hair.scale.set(1, 0.5, 1);
	hair.position.set(-0.73, 0.99 + lift, -0.01);
	cont.add(hair);
	const armL = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, -0.22),
		armR = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, 0.22),
		foreL = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, -0.22),
		foreR = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, 0.22),
		legL = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, -0.1),
		legR = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, 0.1),
		footL = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, -0.1),
		footR = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, 0.1);
	cont.add(armL, armR, foreL, foreR, legL, legR, footL, footR);
	cont.add(box(0.34, 0.055, 0.42, std(0xd7e1e5, 0.86, 0.02), -0.67, 0.73 + lift, 0));
	setNpcRole(cont, 'Patient', 'Mia Reynolds positioned for CT simulation.');
	cont.userData.clothingRig = {
		kind: 'lying',
		topParts: [torso, pelvis, armL, armR],
		bottomParts: [legL, legR],
		topColor: 0xd3d9dd,
		bottomColor: 0xc3cace
	};
	cont.position.set(room.x - 4.0, 0.02, room.z + 1.5);
	scene.add(cont);
	(ROOM_CAST.ctsim || (ROOM_CAST.ctsim = [])).push({ g: cont, kind: 'patient' });
	cont.visible = false;
	return cont;
}
function createJourneyTreatmentPatient(room, skin = 0xd7a17d, hairColor = 0x3a281f) {
	const cont = new THREE.Group(),
		topMat = std(0xd3d9dd, 0.78, 0.02),
		pantMat = std(0xc3cace, 0.82, 0.03),
		skinMat = std(skin, 0.9, 0.0),
		hairMat = std(hairColor, 0.82, 0.02),
		shoeMat = std(0x252b30, 0.85, 0.1),
		lift = 0.62;
	const torso = box(0.82, 0.22, 0.42, topMat, 0, 0.9 + lift, -0.05),
		pelvis = box(0.42, 0.2, 0.42, topMat, 0.5, 0.88 + lift, -0.02),
		neck = box(0.08, 0.06, 0.08, skinMat, -0.52, 0.92 + lift, 0);
	cont.add(torso, pelvis, neck);
	const hd = sphere(0.17, skinMat);
	hd.scale.y = 1.04;
	hd.position.set(-0.72, 0.92 + lift, 0);
	cont.add(hd);
	const hair = sphere(0.175, hairMat);
	hair.scale.set(1, 0.5, 1);
	hair.position.set(-0.73, 0.99 + lift, -0.01);
	cont.add(hair);
	const armL = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, -0.22),
		armR = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, 0.22),
		foreL = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, -0.22),
		foreR = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, 0.22),
		legL = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, -0.1),
		legR = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, 0.1),
		footL = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, -0.1),
		footR = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, 0.1);
	cont.add(armL, armR, foreL, foreR, legL, legR, footL, footR);
	cont.add(box(0.34, 0.055, 0.42, std(0xd7e1e5, 0.86, 0.02), -0.67, 0.73 + lift, 0));
	setNpcRole(cont, 'Patient', 'Mia Reynolds positioned for her first radiation treatment.');
	cont.userData.clothingRig = {
		kind: 'lying',
		topParts: [torso, pelvis, armL, armR],
		bottomParts: [legL, legR],
		topColor: 0xd3d9dd,
		bottomColor: 0xc3cace
	};
	cont.position.set(room.x - 1.25, 0.02, room.z - 0.05);
	scene.add(cont);
	(ROOM_CAST.vault1 || (ROOM_CAST.vault1 = [])).push({ g: cont, kind: 'patient' });
	cont.visible = false;
	return cont;
}
export function journeyActors() {
	const lp = (ROOM_CAST.lobby || []).filter((x) => x.kind === 'patient');
	if (!JOURNEY.patient) JOURNEY.patient = lp[1]?.g || lp[0]?.g;
	if (!JOURNEY.newPatient) JOURNEY.newPatient = lp[0]?.g || lp[1]?.g;
	if (!JOURNEY.therapist) JOURNEY.therapist = PRIMARY_NPCS.linaccontrol;
	if (!JOURNEY.vaultTherapist) JOURNEY.vaultTherapist = PRIMARY_NPCS.vault1;
	if (!JOURNEY.controlPartner)
		JOURNEY.controlPartner =
			(ROOM_CAST.linaccontrol || []).filter(
				(x) => x.kind === 'staff' && x.g !== JOURNEY.therapist
			)[0]?.g || JOURNEY.vaultTherapist;
	if (!JOURNEY.couchPatient) JOURNEY.couchPatient = PRIMARY_PATIENTS.vault1;
	if (!JOURNEY.consultStaff) JOURNEY.consultStaff = PRIMARY_NPCS.consult;
	if (!JOURNEY.navigator) JOURNEY.navigator = PRIMARY_NPCS.education;
	if (!JOURNEY.ctTherapist) JOURNEY.ctTherapist = PRIMARY_NPCS.ctsim;
	if (!JOURNEY.ctControlTherapist) JOURNEY.ctControlTherapist = PRIMARY_NPCS.ctcontrol;
	if (!JOURNEY.ctControlPartner)
		JOURNEY.ctControlPartner =
			(ROOM_CAST.ctcontrol || []).filter(
				(x) => x.kind === 'staff' && x.g !== JOURNEY.ctControlTherapist
			)[0]?.g || JOURNEY.ctTherapist;
	if (!JOURNEY.dosimetrist) JOURNEY.dosimetrist = PRIMARY_NPCS.dosimetry;
	if (!JOURNEY.dosimetryPartner)
		JOURNEY.dosimetryPartner =
			(ROOM_CAST.dosimetry || []).filter(
				(x) => x.kind === 'staff' && x.g !== JOURNEY.dosimetrist
			)[0]?.g || null;
	if (!JOURNEY.physicist) JOURNEY.physicist = PRIMARY_NPCS.physics;
	if (!JOURNEY.physicsPartner)
		JOURNEY.physicsPartner =
			(ROOM_CAST.physics || []).filter((x) => x.kind === 'staff' && x.g !== JOURNEY.physicist)[0]
				?.g || null;
	if (!JOURNEY.staticCtPatient) JOURNEY.staticCtPatient = PRIMARY_PATIENTS.ctsim;
	if (!JOURNEY.ctSimPatient)
		JOURNEY.ctSimPatient = createJourneyLyingPatient(roomById('ctsim'), 0xd7a17d, 0x3a281f);
	if (!JOURNEY.miaTreatmentPatient)
		JOURNEY.miaTreatmentPatient = createJourneyTreatmentPatient(
			roomById('vault1'),
			0xd7a17d,
			0x3a281f
		);
	if (JOURNEY.patient) JOURNEY.patient.userData.journeyPatient = true;
	if (JOURNEY.newPatient) JOURNEY.newPatient.userData.journeyPatient = true;
	if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.userData.journeyPatient = true;
}
export function journeySpeech(actor, text, kind = 'staff', ms = 10000) {
	if (!actor) return;
	const hold = Math.max(10000, ms);
	let el = actor.userData.journeyBubble;
	if (!el) {
		el = npcBubble(actor, kind);
		actor.userData.journeyBubble = el;
	}
	el.textContent = text;
	el.style.opacity = '1';
	clearTimeout(el._journeyTimer);
	el._journeyTimer = setTimeout(() => (el.style.opacity = '0'), hold);
}
function playIntercomAudio(text) {
	try {
		initAmbience();
		if (AMBIENCE.ctx && AMBIENCE.ctx.state !== 'running') AMBIENCE.ctx.resume().catch(() => {});
		if (AMBIENCE.ctx) {
			const ctx = AMBIENCE.ctx,
				t = ctx.currentTime + 0.02;
			const beep = (freq, delay = 0.0, dur = 0.12, gain = 0.035) => {
				const osc = ctx.createOscillator(),
					amp = ctx.createGain();
				osc.type = 'sine';
				osc.frequency.value = freq;
				amp.gain.setValueAtTime(0.0001, t + delay);
				amp.gain.linearRampToValueAtTime(gain, t + delay + 0.01);
				amp.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
				osc.connect(amp).connect(ctx.destination);
				osc.start(t + delay);
				osc.stop(t + delay + dur + 0.03);
			};
			beep(930, 0, 0.1, 0.028);
			beep(710, 0.16, 0.12, 0.022);
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty -- legacy silent-catch pattern, error intentionally swallowed
	} catch (e) {}
	try {
		if ('speechSynthesis' in window) {
			window.speechSynthesis.cancel();
			const u = new SpeechSynthesisUtterance(text);
			u.rate = 0.96;
			u.pitch = 0.92;
			u.volume = 0.88;
			window.speechSynthesis.speak(u);
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty -- legacy silent-catch pattern, error intentionally swallowed
	} catch (e) {}
}
function journeyIntercom(actor, text, ms = 12000) {
	journeySpeech(actor, text, 'staff', ms);
	playIntercomAudio(text);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 1 report
function journeyAudioCue(actor, text, kind = 'staff', ms = 12000) {
	journeySpeech(actor, text, kind, ms);
	playIntercomAudio(text);
}
function setJourneySeated(seated) {
	setActorSeated(JOURNEY.patient, seated);
}
function clearJourneyTimer() {
	if (JOURNEY.sceneTimer) {
		clearTimeout(JOURNEY.sceneTimer);
		JOURNEY.sceneTimer = 0;
	}
	for (const id of JOURNEY.sceneTimers || []) clearTimeout(id);
	JOURNEY.sceneTimers = [];
}
function releaseJourneyAfter(ms) {
	JOURNEY.busy = true;
	updateJourneyUI();
	later(() => {
		JOURNEY.busy = false;
		updateJourneyUI();
	}, ms);
}
export function clearJourneyCameraFollow() {
	JOURNEY.cameraFollow = null;
	JOURNEY.cameraRoomId = null;
}
function setJourneyCameraFollow(subject, companion = null, opts = {}) {
	if (!subject) return;
	const wp = new THREE.Vector3();
	subject.getWorldPosition(wp);
	JOURNEY.cameraFollow = {
		subject,
		companion,
		last: wp.clone(),
		distance: opts.distance || 3.65,
		side: opts.side ?? 1.35,
		height: opts.height || 1.82,
		lead: opts.lead || 1.0,
		patientPrimary: opts.patientPrimary !== false
	};
	if (document.pointerLockElement) document.exitPointerLock();
	orbit.enabled = false;
	document.getElementById('roomLookHint').classList.remove('show');
}
export function updateJourneyCameraFollow() {
	const f = JOURNEY.cameraFollow;
	if (!JOURNEY.active || !f || !f.subject || f.subject.visible === false) return;
	const p = new THREE.Vector3(),
		q = new THREE.Vector3();
	f.subject.getWorldPosition(p);
	let target = p.clone();
	if (f.companion && f.companion.visible !== false) {
		f.companion.getWorldPosition(q);
		target.lerp(q, 0.32);
	}
	target.y = 1.3;
	let dir = p.clone().sub(f.last);
	dir.y = 0;
	if (dir.lengthSq() < 0.0004) {
		dir.set(Math.sin(f.subject.rotation.y), 0, Math.cos(f.subject.rotation.y));
	} else dir.normalize();
	const right = new THREE.Vector3(dir.z, 0, -dir.x);
	const desired = p.clone().addScaledVector(dir, -f.distance).addScaledVector(right, f.side);
	desired.y = f.height;
	camera.position.lerp(desired, 0.76);
	const look = target.clone().addScaledVector(dir, f.lead);
	camera.lookAt(look);
	f.last.copy(p);
	const here = roomContainingWalkPoint(p.x, p.z);
	if (here && here.id !== JOURNEY.cameraRoomId) {
		JOURNEY.cameraRoomId = here.id;
		S.activeRoom = here;
		updateRoomUI(here);
		renderRoomList();
		document.getElementById('locText').textContent =
			`Following ${currentJourneyMeta().patient} · ${here.name}`;
	}
}
export function setJourneyKind(kind, silent = false) {
	journeyActors();
	clearClinicalFocus();
	if (JOURNEY.active) resetTreatmentJourney(true);
	JOURNEY.kind = kind === 'newpatient' ? 'newpatient' : 'treatment';
	JOURNEY.stage = 'idle';
	JOURNEY.patientName = currentJourneyMeta().patient;
	applyJourneyPatientFocus();
	updateJourneyUI();
	if (!silent) toast(`<b>${currentJourneyMeta().title}</b><br>${currentJourneyMeta().idle}`);
}
export function applyJourneyPatientFocus() {
	if (JOURNEY.active) {
		for (const sc of interactionScenes) {
			bubbleVis(sc.bubbleA, false);
			bubbleVis(sc.bubbleB, false);
		}
	}
	for (const arr of Object.values(ROOM_CAST))
		for (const e of arr) if (e.kind === 'patient') e.g.visible = true;
	for (const m of movers)
		m.group.visible = !(JOURNEY.active && m.group.userData?.suppressDuringJourney);
	if (!JOURNEY.active) {
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
		if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = false;
		return;
	}
	const hideRooms =
		JOURNEY.kind === 'treatment'
			? ['lobby', 'vault1']
			: ['lobby', 'consult', 'education', 'ctsim', 'vault1'];
	const keep = new Set(
		JOURNEY.kind === 'treatment'
			? [JOURNEY.patient, JOURNEY.couchPatient]
			: [JOURNEY.newPatient, JOURNEY.ctSimPatient, JOURNEY.miaTreatmentPatient]
	);
	for (const id of hideRooms)
		for (const e of ROOM_CAST[id] || [])
			if (e.kind === 'patient' && !keep.has(e.g)) e.g.visible = false;
	if (JOURNEY.kind === 'treatment') {
		const onCouch = !!JOURNEY.jordanOnCouch;
		if (JOURNEY.patient) JOURNEY.patient.visible = !onCouch;
		if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = onCouch;
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
		if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = false;
	} else {
		const onCt = !!JOURNEY.miaOnTable,
			onTx = !!JOURNEY.miaOnTreatmentCouch,
			behind = ['plantransfer', 'dosimetry', 'physicsqa', 'planrelease'].includes(JOURNEY.stage);
		if (JOURNEY.newPatient) JOURNEY.newPatient.visible = !onCt && !onTx && !behind;
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = onCt;
		if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = onTx;
		if (JOURNEY.staticCtPatient) JOURNEY.staticCtPatient.visible = false;
		if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = false;
	}
}
function moveJourneyActor(actor, fromId, toId, final, onComplete = null, speed = 1.95, opts = {}) {
	if (!actor) return;
	if (fromId && doors.has(fromId)) setDoorTarget(fromId, true);
	if (toId && doors.has(toId)) setDoorTarget(toId, true);
	actor.userData.inHandoff = true;
	const curve = movementPathFor(actor, fromId, toId, final),
		len = curve.getLength(),
		duration = Math.max(2.6, Math.min(32, len / speed));
	const cues = (opts.cues || []).map((c) => ({ ...c, fired: false }));
	workflowTransitions.push({
		actor,
		fromId,
		toId,
		curve,
		start: performance.now() / 1000,
		duration,
		onComplete,
		cues
	});
	if (opts.followCamera)
		setJourneyCameraFollow(
			opts.followSubject || actor,
			opts.followTarget || null,
			opts.cameraOptions || {}
		);
}
function journeyFocusActors(a, b, roomId) {
	clearJourneyCameraFollow();
	if (S.mode === 'overview') setMode('guided', false);
	const pa = new THREE.Vector3(),
		pb = new THREE.Vector3();
	a?.getWorldPosition(pa);
	b?.getWorldPosition(pb);
	const target =
		a && b
			? pa.clone().add(pb).multiplyScalar(0.5).setY(1.35)
			: a
				? pa
				: new THREE.Vector3(0, 1.35, 0);
	const r = roomById(roomId);
	if (!r) return;
	let pos;
	if (roomId === 'lobby') pos = target.clone().add(new THREE.Vector3(3.4, 0.45, 3.2));
	else if (roomId === 'linaccontrol') pos = target.clone().add(new THREE.Vector3(3.2, 0.5, -2.4));
	else if (roomId === 'vault1') pos = new THREE.Vector3(81.4, 1.96, -13.9);
	else if (roomId === 'vault2') pos = new THREE.Vector3(81.4, 1.96, 13.9);
	else if (roomId === 'consult') pos = target.clone().add(new THREE.Vector3(2.8, 0.45, 2.5));
	else if (roomId === 'education') pos = target.clone().add(new THREE.Vector3(2.8, 0.45, 2.3));
	else if (roomId === 'ctsim') pos = target.clone().add(new THREE.Vector3(3.0, 0.4, 2.0));
	else if (roomId === 'ctcontrol') pos = target.clone().add(new THREE.Vector3(2.8, 0.4, -2.2));
	else pos = target.clone().add(new THREE.Vector3(3.0, 0.5, 2.0));
	camera.position.copy(pos);
	camera.lookAt(target);
	orbit.target.copy(target);
	orbit.enabled = S.mode === 'guided';
	orbit.update();
	S.activeRoom = r;
	updateRoomUI(r);
	renderRoomList();
}
export function resetTreatmentJourney(silent = false) {
	journeyActors();
	clearJourneyTimer();
	clearJourneyCameraFollow();
	JOURNEY.active = false;
	JOURNEY.busy = false;
	JOURNEY.stage = 'idle';
	JOURNEY.jordanOnCouch = false;
	JOURNEY.miaOnTable = false;
	JOURNEY.miaOnTreatmentCouch = false;
	JOURNEY.introPending = false;
	JOURNEY.vaultMonitorPatientOnly = false;
	workflowTransitions.length = 0;
	if (JOURNEY.patient) {
		JOURNEY.patient.position.set(-2.5, 0, 3.0);
		JOURNEY.patient.rotation.y = Math.PI;
		setJourneySeated(false);
	}
	if (JOURNEY.newPatient) {
		JOURNEY.newPatient.position.set(-6.2, 0, 3.3);
		JOURNEY.newPatient.rotation.y = Math.PI;
		setActorSeated(JOURNEY.newPatient, true);
	}
	if (JOURNEY.therapist) {
		JOURNEY.therapist.position.set(51.35, 0, 10.6);
		JOURNEY.therapist.rotation.y = -Math.PI / 2;
		poseCharacter(JOURNEY.therapist, 'console');
	}
	if (JOURNEY.vaultTherapist) {
		JOURNEY.vaultTherapist.position.set(75.5, 0, -14.75);
		JOURNEY.vaultTherapist.rotation.y = 0.6;
		poseCharacter(JOURNEY.vaultTherapist, 'support');
	}
	if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = true;
	if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
	if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = false;
	setPatientGown(JOURNEY.patient, false);
	setPatientGown(JOURNEY.newPatient, false);
	setPatientGown(JOURNEY.couchPatient, false);
	setPatientGown(JOURNEY.ctSimPatient, false);
	setPatientGown(JOURNEY.miaTreatmentPatient, false);
	resetCtCouchMotion();
	workflowState('lobby', 'OPEN', 'Routine arrivals', '#42d5cf');
	workflowState('linaccontrol', 'READY', 'Treatment team available', '#42d5cf');
	workflowState('vault1', 'AVAILABLE', 'Room ready for next patient', '#65dda0');
	workflowState('consult', 'READY', 'Consult room available', '#42d5cf');
	workflowState('education', 'READY', 'Patient education available', '#42d5cf');
	workflowState('ctsim', 'AVAILABLE', 'CT simulator ready', '#65dda0');
	workflowState('ctcontrol', 'READY', 'CT control ready', '#42d5cf');
	workflowState('dosimetry', 'READY', 'Treatment planning workstations ready', '#42d5cf');
	workflowState('physics', 'READY', 'Physics plan review available', '#42d5cf');
	applyJourneyPatientFocus();
	updateJourneyUI();
	if (!silent) toast('<b>Patient journey reset.</b>');
}
export function showJourneyCheckinIntro() {
	if (!JOURNEY.active || JOURNEY.stage !== 'checkin' || !JOURNEY.introPending) return;
	JOURNEY.introPending = false;
	JOURNEY.busy = true;
	if (JOURNEY.kind === 'treatment') {
		journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.patient, 'lobby');
		journeySpeech(
			JOURNEY.patient,
			'Good morning. I’m here for my scheduled treatment. I haven’t had any appointment changes.',
			'patient',
			10500
		);
		later(
			() =>
				journeySpeech(
					PRIMARY_NPCS.lobby,
					'Good morning, Jordan. I have you on today’s treatment schedule. I’ll mark you arrived so the treatment team knows you’re here.',
					'staff',
					11000
				),
			6200
		);
		releaseJourneyAfter(17800);
	} else {
		journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
		journeySpeech(
			JOURNEY.newPatient,
			'Hi. I’m Mia Reynolds. This is my first visit with radiation oncology.',
			'patient',
			10500
		);
		later(
			() =>
				journeySpeech(
					PRIMARY_NPCS.lobby,
					'Thanks, Mia. I found your consultation appointment. I’ll mark you arrived and let the physician team know you’re ready.',
					'staff',
					11000
				),
			6200
		);
		releaseJourneyAfter(17800);
	}
	updateJourneyUI();
}
export function startTreatmentJourney() {
	if (JOURNEY.active) return;
	journeyActors();
	JOURNEY.active = true;
	JOURNEY.busy = true;
	JOURNEY.stage = 'checkin';
	JOURNEY.jordanOnCouch = false;
	JOURNEY.miaOnTable = false;
	JOURNEY.miaOnTreatmentCouch = false;
	JOURNEY.introPending = true;
	JOURNEY.vaultMonitorPatientOnly = false;
	setPatientGown(JOURNEY.patient, false);
	setPatientGown(JOURNEY.newPatient, false);
	setPatientGown(JOURNEY.couchPatient, false);
	setPatientGown(JOURNEY.ctSimPatient, false);
	setPatientGown(JOURNEY.miaTreatmentPatient, false);
	resetCtCouchMotion();
	applyJourneyPatientFocus();
	if (JOURNEY.kind === 'treatment') {
		if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = false;
		setJourneySeated(false);
		JOURNEY.patient.visible = true;
		JOURNEY.patient.position.set(-4.5, 0, -2.05);
		JOURNEY.patient.rotation.y = -1.15;
		workflowState('lobby', 'CHECK-IN', 'Jordan Ellis · arrived for treatment', '#6fb6ff');
		workflowState('linaccontrol', 'READY', 'Vault 1 scheduled for Jordan Ellis', '#42d5cf');
		workflowState('vault1', 'AVAILABLE', 'Awaiting patient arrival', '#65dda0');
	} else {
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
		setActorSeated(JOURNEY.newPatient, false);
		JOURNEY.newPatient.visible = true;
		JOURNEY.newPatient.position.set(-4.45, 0, -2.15);
		JOURNEY.newPatient.rotation.y = -1.15;
		workflowState('lobby', 'CHECK-IN', 'Mia Reynolds · arrived for consultation', '#6fb6ff');
		workflowState('consult', 'READY', 'Consult room prepared', '#42d5cf');
		workflowState('education', 'READY', 'Education room available', '#42d5cf');
		workflowState('ctsim', 'AVAILABLE', 'CT simulator ready', '#65dda0');
	}
	applyJourneyPatientFocus();
	if (S.activeRoom?.id === 'lobby' && !S.travel) later(showJourneyCheckinIntro, 450);
	else if (!S.travel) beginTravel(roomById('lobby'), false);
	updateJourneyUI();
}
function beginJordanPickupSequence() {
	JOURNEY.busy = true;
	JOURNEY.stage = 'waiting';
	workflowState('lobby', 'WAITING', 'Jordan Ellis · seated in treatment waiting area', '#ffb454');
	journeySpeech(
		PRIMARY_NPCS.lobby,
		'You’re checked in, Jordan. Go ahead and have a seat. I’ve sent your arrival to the treatment team.',
		'staff',
		11000
	);
	moveJourneyActor(
		JOURNEY.patient,
		'lobby',
		'lobby',
		new THREE.Vector3(-2.8, 0, 3.4),
		() => {
			setJourneySeated(true);
			applyJourneyPatientFocus();
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.patient, 'lobby');
			updateJourneyUI();
			later(() => {
				JOURNEY.stage = 'alert';
				workflowState(
					'linaccontrol',
					'PATIENT READY',
					'Jordan Ellis checked in · waiting in reception',
					'#6fb6ff'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.controlPartner, 'linaccontrol');
				journeySpeech(
					JOURNEY.controlPartner,
					'Jordan Ellis just checked in. His chart is open and Vault 1 is ready for setup.',
					'staff',
					11000
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.therapist,
							'I’ll bring him back. I also want to follow up on the fatigue he reported yesterday before we start today’s fraction.',
							'staff',
							11000
						),
					7200
				);
				updateJourneyUI();
				later(() => {
					workflowState(
						'linaccontrol',
						'PATIENT CALL',
						'Therapist leaving control to retrieve Jordan',
						'#6fb6ff'
					);
					moveJourneyActor(
						JOURNEY.therapist,
						'linaccontrol',
						'lobby',
						new THREE.Vector3(-0.6, 0, 2.9),
						() => {
							JOURNEY.stage = 'called';
							faceNpcToward(JOURNEY.therapist, JOURNEY.patient);
							faceNpcToward(JOURNEY.patient, JOURNEY.therapist);
							journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'lobby');
							journeySpeech(
								JOURNEY.therapist,
								'Jordan? Hi. Vault 1 is ready. Before we head back, I want to check how you’ve been doing since yesterday.',
								'staff',
								11000
							);
							later(
								() =>
									journeySpeech(JOURNEY.patient, 'Sure. I’m ready to go back.', 'patient', 10000),
								6800
							);
							updateJourneyUI();
							later(() => beginJordanEscortToVault(), 15000);
						},
						1.7,
						{
							followCamera: true,
							followSubject: JOURNEY.therapist,
							cameraOptions: { distance: 3.4, side: 1.2 }
						}
					);
				}, 15800);
			}, 7200);
		},
		1.25
	);
}
function beginJordanEscortToVault() {
	JOURNEY.stage = 'called';
	setJourneySeated(false);
	JOURNEY.busy = true;
	workflowState(
		'lobby',
		'IN TRANSIT',
		'Jordan and therapist en route to treatment changing area',
		'#42d5cf'
	);
	workflowState('vault1', 'PATIENT ARRIVING', 'Treatment team preparing room', '#6fb6ff');
	const cues = [
		{
			at: 0.1,
			actor: JOURNEY.therapist,
			text: 'Before we get to the room, how has your energy been since yesterday?',
			ms: 10500
		},
		{
			at: 0.4,
			actor: JOURNEY.patient,
			kind: 'patient',
			text: 'I’m more tired in the evenings, but I can still do my normal morning routine.',
			ms: 10500
		},
		{
			at: 0.68,
			actor: JOURNEY.therapist,
			text: 'Thanks. I’ll document that. No new pain, nausea, dizziness, or skin changes that we need to address before treatment?',
			ms: 11500
		}
	];
	let atChangeCount = 0;
	const atChange = () => {
		if (++atChangeCount < 2) return;
		workflowState('vault1', 'CHANGING', 'Jordan using treatment changing area', '#ffb454');
		journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'Here is the treatment changing area. Take your time changing into the hospital gown. I’ll wait just outside the privacy area and we’ll continue when you are ready.',
			'staff',
			13500
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.patient,
					'Okay. I’ll change now and let you know when I’m ready.',
					'patient',
					10500
				),
			6500
		);
		later(() => {
			setPatientGown(JOURNEY.patient, true);
			setPatientGown(JOURNEY.couchPatient, true);
			journeySpeech(JOURNEY.patient, 'I’m changed and ready to continue.', 'patient', 10500);
		}, 13700);
		later(() => {
			journeySpeech(
				JOURNEY.therapist,
				'Great. We’ll continue into Vault 1 and reproduce your indexed treatment setup.',
				'staff',
				11500
			);
			workflowState(
				'vault1',
				'PATIENT ARRIVING',
				'Jordan changed into gown · entering treatment vault',
				'#6fb6ff'
			);
			let done = 0;
			const arrived = () => {
				if (++done < 2) return;
				JOURNEY.stage = 'setup';
				JOURNEY.jordanOnCouch = false;
				JOURNEY.busy = true;
				workflowState(
					'vault1',
					'PATIENT SETUP',
					'Preparing Jordan for daily treatment position',
					'#ffb454'
				);
				applyJourneyPatientFocus();
				faceNpcToward(JOURNEY.therapist, JOURNEY.patient);
				poseCharacter(JOURNEY.therapist, 'support');
				journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'vault1');
				journeySpeech(
					JOURNEY.therapist,
					'We’re in Vault 1 now. Before you get onto the couch, we’ll confirm the treatment accessories and then help you into the same indexed position we used yesterday.',
					'staff',
					11500
				);
				later(() => {
					JOURNEY.jordanOnCouch = true;
					applyJourneyPatientFocus();
					faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.couchPatient);
					faceNpcToward(JOURNEY.therapist, JOURNEY.couchPatient);
					poseCharacter(JOURNEY.vaultTherapist, 'support');
					poseCharacter(JOURNEY.therapist, 'support');
					journeyFocusActors(JOURNEY.vaultTherapist, JOURNEY.couchPatient, 'vault1');
					workflowState(
						'vault1',
						'PATIENT SETUP',
						'Jordan on couch · accessories and indexing verified',
						'#ffb454'
					);
					journeySpeech(
						JOURNEY.vaultTherapist,
						'You’re in position. I’m checking the support placement, couch index, and your alignment before we acquire the verification image.',
						'staff',
						11500
					);
					releaseJourneyAfter(12800);
				}, 11800);
			};
			moveJourneyActor(
				JOURNEY.therapist,
				'vault1',
				'vault1',
				new THREE.Vector3(76.0, 0, -14.25),
				arrived,
				1.48
			);
			moveJourneyActor(
				JOURNEY.patient,
				'vault1',
				'vault1',
				new THREE.Vector3(76.7, 0, -15.25),
				arrived,
				1.5,
				{
					followCamera: true,
					followSubject: JOURNEY.patient,
					followTarget: JOURNEY.therapist,
					cameraOptions: { distance: 3.6, side: 1.35, lead: 1.0 }
				}
			);
		}, 23200);
	};
	moveJourneyActor(
		JOURNEY.therapist,
		'lobby',
		'vault1',
		new THREE.Vector3(69.8, 0, -15.25),
		atChange,
		1.5
	);
	moveJourneyActor(
		JOURNEY.patient,
		'lobby',
		'vault1',
		new THREE.Vector3(68.8, 0, -14.15),
		atChange,
		1.52,
		{
			followCamera: true,
			followSubject: JOURNEY.patient,
			followTarget: JOURNEY.therapist,
			cues,
			cameraOptions: { distance: 3.6, side: 1.35, lead: 1.05 }
		}
	);
}
export function advanceTreatmentJourney() {
	if (!JOURNEY.active || JOURNEY.busy || S.travel) return;
	if (JOURNEY.kind === 'newpatient') {
		advanceNewPatientJourney();
		return;
	}
	journeyActors();
	if (JOURNEY.stage === 'checkin') {
		beginJordanPickupSequence();
	} else if (JOURNEY.stage === 'setup') {
		JOURNEY.busy = true;
		faceNpcToward(JOURNEY.therapist, JOURNEY.couchPatient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.couchPatient);
		poseCharacter(JOURNEY.therapist, 'support');
		workflowState('vault1', 'IMAGING', 'Verification imaging / daily position match', '#6fb6ff');
		journeySpeech(
			JOURNEY.therapist,
			'Your setup matches the indexed treatment position. We’re going to take today’s verification image now and compare it with the approved reference.',
			'staff',
			7200
		);
		JOURNEY.stage = 'imaging';
		releaseJourneyAfter(7600);
	} else if (JOURNEY.stage === 'imaging') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'READY TO TREAT',
			'Verification images complete · therapists moving to treatment control',
			'#ffb454'
		);
		workflowState(
			'linaccontrol',
			'IMAGE REVIEW',
			'Jordan Ellis · therapists reviewing alignment at the console',
			'#6fb6ff'
		);
		journeySpeech(
			JOURNEY.therapist,
			'The verification images are complete. We’re leaving the room now to review your alignment on the control-room monitors. Stay still and we will speak to you over the intercom before treatment begins.',
			'staff',
			12500
		);
		let done = 0;
		const atControl = () => {
			if (++done < 2) return;
			setDoorTarget('vault1', false);
			JOURNEY.vaultMonitorPatientOnly = true;
			poseCharacter(JOURNEY.therapist, 'console');
			poseCharacter(JOURNEY.vaultTherapist, 'console');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
			journeySpeech(
				JOURNEY.controlPartner,
				'Jordan’s daily images are on screen. I’m confirming the image match, recorded couch correction, and treatment record before beam-on.',
				'staff',
				12000
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.therapist,
						'The monitor review looks good. Alignment is verified and all treatment parameters are cleared. I’m going to talk with Jordan over the intercom now.',
						'staff',
						11500
					),
				8600
			);
			later(
				() =>
					journeyIntercom(
						JOURNEY.therapist,
						'Jordan, your alignment is verified. Please remain still. We are beginning your treatment now.',
						13000
					),
				17200
			);
			later(() => {
				JOURNEY.stage = 'treatment';
				JOURNEY.busy = true;
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
				journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
				journeySpeech(
					JOURNEY.therapist,
					'Beam-on has started. We are watching Jordan on the vault cameras and can communicate with him throughout treatment from the protected control area.',
					'staff',
					12000
				);
				releaseJourneyAfter(12600);
			}, 24800);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 8.6),
			atControl,
			1.88
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 10.2),
			atControl,
			1.9,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'treatment') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'TREATMENT COMPLETE',
			'Beam delivery complete · room re-entry',
			'#65dda0'
		);
		workflowState('linaccontrol', 'COMPLETE', 'Therapists returning to Vault 1', '#65dda0');
		journeyIntercom(
			JOURNEY.therapist,
			'Jordan, your treatment is complete. Stay still and we will be back in the room in just a moment.',
			12000
		);
		setDoorTarget('vault1', true);
		let done = 0;
		const reenter = () => {
			if (++done < 2) return;
			JOURNEY.vaultMonitorPatientOnly = false;
			JOURNEY.stage = 'returning';
			JOURNEY.busy = true;
			faceNpcToward(JOURNEY.therapist, JOURNEY.couchPatient);
			faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.couchPatient);
			poseCharacter(JOURNEY.therapist, 'support');
			poseCharacter(JOURNEY.vaultTherapist, 'support');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.couchPatient, 'vault1');
			journeySpeech(
				JOURNEY.therapist,
				'Jordan, today’s treatment is complete. Stay where you are for a moment while we lower the couch and help you sit up safely.',
				'staff',
				7200
			);
			releaseJourneyAfter(7600);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.3, 0, -16.0),
			reenter,
			1.88
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.0, 0, -14.3),
			reenter,
			1.9,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'returning') {
		JOURNEY.jordanOnCouch = false;
		JOURNEY.patient.position.set(77.0, 0, -15.25);
		setJourneySeated(false);
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.therapist, JOURNEY.patient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.patient);
		poseCharacter(JOURNEY.therapist, 'support');
		poseCharacter(JOURNEY.vaultTherapist, 'support');
		workflowState('vault1', 'ROOM TURNOVER', 'Patient leaving · room reset begins', '#42d5cf');
		journeySpeech(
			JOURNEY.therapist,
			'Everything is documented for today. Once you’re changed back into your clothes, you’re free to head out; if the fatigue changes before tomorrow, call us rather than waiting until the next appointment.',
			'staff',
			7600
		);
		JOURNEY.stage = 'departure';
		JOURNEY.busy = true;
		applyJourneyPatientFocus();
		journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'vault1');
		releaseJourneyAfter(7800);
	} else if (JOURNEY.stage === 'departure') {
		JOURNEY.busy = true;
		workflowState('lobby', 'DEPARTING', 'Jordan Ellis · treatment complete', '#65dda0');
		workflowState('vault1', 'AVAILABLE', 'Room turnover complete', '#65dda0');
		workflowState('linaccontrol', 'READY', 'Preparing for next scheduled patient', '#42d5cf');
		journeySpeech(
			JOURNEY.therapist,
			'Take your time changing back into your clothes. We’ll head to the lobby when you’re ready.',
			'staff',
			12000
		);
		later(() => {
			setPatientGown(JOURNEY.patient, false);
			journeySpeech(JOURNEY.patient, 'I’m changed and ready to go.', 'patient', 10000);
		}, 7600);
		later(
			() =>
				moveJourneyActor(
					JOURNEY.patient,
					'vault1',
					'lobby',
					new THREE.Vector3(0, 0, 7.6),
					() => {
						JOURNEY.stage = 'done';
						JOURNEY.busy = false;
						journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.patient, 'lobby');
						journeySpeech(
							JOURNEY.patient,
							'That went smoothly. I’ll let the team know if the fatigue changes before tomorrow.',
							'patient',
							6500
						);
						updateJourneyUI();
						toast('<b>Treatment-day journey complete.</b> Jordan has completed today’s fraction.');
					},
					1.85,
					{
						followCamera: true,
						followSubject: JOURNEY.patient,
						cameraOptions: { distance: 3.6, side: 1.25 }
					}
				),
			9800
		);
	}
}

function beginMiaConsultSequence() {
	JOURNEY.busy = true;
	JOURNEY.stage = 'waiting';
	workflowState('lobby', 'WAITING', 'Mia Reynolds · waiting for consultation', '#ffb454');
	journeySpeech(
		PRIMARY_NPCS.lobby,
		'You’re checked in, Mia. Please have a seat for a moment while the consultation room is prepared.',
		'staff',
		11000
	);
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'lobby',
		new THREE.Vector3(-6.2, 0, 3.3),
		() => {
			setActorSeated(JOURNEY.newPatient, true);
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
			updateJourneyUI();
			later(() => {
				setActorSeated(JOURNEY.newPatient, false);
				workflowState(
					'consult',
					'CONSULT IN PROGRESS',
					'Initial radiation oncology consultation',
					'#6fb6ff'
				);
				moveJourneyActor(
					JOURNEY.newPatient,
					'lobby',
					'consult',
					new THREE.Vector3(-17.2, 0, -6.35),
					() => {
						JOURNEY.stage = 'consult';
						JOURNEY.busy = true;
						faceNpcToward(JOURNEY.consultStaff, JOURNEY.newPatient);
						faceNpcToward(JOURNEY.newPatient, JOURNEY.consultStaff);
						journeyFocusActors(JOURNEY.consultStaff, JOURNEY.newPatient, 'consult');
						journeySpeech(
							JOURNEY.consultStaff,
							'Mia, before we discuss scheduling, I want to review why radiation is being considered and what we are trying to accomplish with treatment.',
							'staff',
							11500
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.newPatient,
									'I was worried I might be starting radiation today. I’m glad we can go through the plan first.',
									'patient',
									10500
								),
							7800
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.consultStaff,
									'Today is for the treatment decision and planning. If we proceed, simulation is the next technical step so the team can reproduce your position and create a plan based on your anatomy.',
									'staff',
									12000
								),
							15800
						);
						releaseJourneyAfter(28800);
					},
					1.6,
					{
						followCamera: true,
						followSubject: JOURNEY.newPatient,
						cameraOptions: { distance: 3.5, side: 1.2 }
					}
				);
			}, 8200);
		},
		1.2
	);
}
function beginMiaFirstTreatmentReturn() {
	clearJourneyTimer();
	clearJourneyCameraFollow();
	JOURNEY.busy = true;
	JOURNEY.miaOnTable = false;
	JOURNEY.miaOnTreatmentCouch = false;
	JOURNEY.vaultMonitorPatientOnly = false;
	setPatientGown(JOURNEY.newPatient, false);
	setPatientGown(JOURNEY.miaTreatmentPatient, true);
	JOURNEY.newPatient.position.set(0.2, 0, 8.65);
	JOURNEY.newPatient.rotation.y = Math.PI;
	setActorSeated(JOURNEY.newPatient, false);
	applyJourneyPatientFocus();
	showDayTransition(
		'Tuesday · 9:15 AM',
		'Mia returns to the RTApps center for her scheduled 9:30 AM first radiation treatment.',
		5200
	);
	workflowState(
		'lobby',
		'FIRST TREATMENT ARRIVAL',
		'Mia Reynolds · 9:15 AM check-in for 9:30 AM first treatment',
		'#6fb6ff'
	);
	workflowState(
		'linaccontrol',
		'PLAN READY',
		'Mia Reynolds · approved plan · physics QA passed · Fraction 1',
		'#65dda0'
	);
	workflowState('vault1', 'AVAILABLE', 'Vault 1 prepared for Mia’s first fraction', '#65dda0');
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'lobby',
		new THREE.Vector3(-4.45, 0, -2.15),
		() => {
			JOURNEY.stage = 'firstcheckin';
			JOURNEY.busy = true;
			faceNpcToward(PRIMARY_NPCS.lobby, JOURNEY.newPatient);
			faceNpcToward(JOURNEY.newPatient, PRIMARY_NPCS.lobby);
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
			journeySpeech(
				JOURNEY.newPatient,
				'Good morning. I’m back for my first radiation treatment. I was told to check in at 9:15 for my 9:30 appointment.',
				'patient',
				12500
			);
			later(
				() =>
					journeySpeech(
						PRIMARY_NPCS.lobby,
						'Good morning, Mia. You’re right on time. Your treatment appointment is on schedule, and I’ll mark you arrived so the treatment team can bring you back when the room is ready.',
						'staff',
						13500
					),
				8200
			);
			releaseJourneyAfter(22400);
		},
		1.35,
		{
			followCamera: true,
			followSubject: JOURNEY.newPatient,
			cameraOptions: { distance: 3.45, side: 1.1 }
		}
	);
}
function beginMiaFirstTreatmentPickup() {
	JOURNEY.busy = true;
	JOURNEY.stage = 'firstwaiting';
	workflowState('lobby', 'WAITING', 'Mia Reynolds · seated for first treatment', '#ffb454');
	journeySpeech(
		PRIMARY_NPCS.lobby,
		'You’re checked in, Mia. Please have a seat. The therapists now have your arrival status and will come get you shortly.',
		'staff',
		12000
	);
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'lobby',
		new THREE.Vector3(-2.8, 0, 3.4),
		() => {
			setActorSeated(JOURNEY.newPatient, true);
			applyJourneyPatientFocus();
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
			later(() => {
				JOURNEY.stage = 'firstpickup';
				workflowState(
					'linaccontrol',
					'FIRST FRACTION READY',
					'Mia checked in · approved plan and simulation setup record available',
					'#6fb6ff'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.controlPartner, 'linaccontrol');
				journeySpeech(
					JOURNEY.controlPartner,
					'Mia Reynolds is checked in for her 9:30 first fraction. The approved plan is loaded, physics QA is complete, and the setup record from CT simulation is available.',
					'staff',
					13500
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.therapist,
							'I’ll bring her back. Before setup I’ll confirm there have been no changes since simulation, then we’ll reproduce the indexed position and acquire verification imaging before treatment.',
							'staff',
							13500
						),
					9000
				);
				later(() => {
					workflowState(
						'linaccontrol',
						'PATIENT CALL',
						'Therapist leaving control to retrieve Mia',
						'#6fb6ff'
					);
					moveJourneyActor(
						JOURNEY.therapist,
						'linaccontrol',
						'lobby',
						new THREE.Vector3(-0.6, 0, 2.9),
						() => {
							faceNpcToward(JOURNEY.therapist, JOURNEY.newPatient);
							faceNpcToward(JOURNEY.newPatient, JOURNEY.therapist);
							journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'lobby');
							journeySpeech(
								JOURNEY.therapist,
								'Mia? Good morning. Your first-treatment plan is ready. Before we go back, has anything changed medically or physically since your CT simulation?',
								'staff',
								13000
							);
							later(
								() =>
									journeySpeech(
										JOURNEY.newPatient,
										'No major changes. I’ve been following the instructions and I’m ready to start.',
										'patient',
										11500
									),
								8500
							);
							later(() => beginMiaFirstTreatmentEscort(), 18600);
						},
						1.68,
						{
							followCamera: true,
							followSubject: JOURNEY.therapist,
							cameraOptions: { distance: 3.45, side: 1.2 }
						}
					);
				}, 19200);
				updateJourneyUI();
			}, 7600);
		},
		1.25
	);
}
function beginMiaFirstTreatmentEscort() {
	setActorSeated(JOURNEY.newPatient, false);
	JOURNEY.stage = 'firstpickup';
	JOURNEY.busy = true;
	workflowState(
		'lobby',
		'IN TRANSIT',
		'Mia and therapist en route to treatment changing area',
		'#42d5cf'
	);
	workflowState(
		'vault1',
		'PATIENT ARRIVING',
		'Treatment team preparing simulation setup record',
		'#6fb6ff'
	);
	const cues = [
		{
			at: 0.1,
			actor: JOURNEY.therapist,
			text: 'We’ll use the same head-first supine position that was documented at simulation. I’ll explain each step again before we position you.',
			ms: 12500
		},
		{
			at: 0.36,
			actor: JOURNEY.newPatient,
			kind: 'patient',
			text: 'I remember the supports from the CT scan. Will they be set up the same way today?',
			ms: 11500
		},
		{
			at: 0.64,
			actor: JOURNEY.therapist,
			text: `Yes. Your record shows an ${MIA_SIM_SETUP.headSupport.toLowerCase()}, an ${MIA_SIM_SETUP.lowerSupport.toLowerCase()}, and the table index recorded at simulation. We’ll verify all of those before imaging.`,
			ms: 14000
		}
	];
	let atChangeCount = 0;
	const atChange = () => {
		if (++atChangeCount < 2) return;
		workflowState(
			'vault1',
			'CHANGING',
			'Mia using treatment changing area before first treatment',
			'#ffb454'
		);
		journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'This is the changing area. Take your time changing into the hospital gown. I’ll wait just outside, and we’ll enter the vault after you tell me you’re ready.',
			'staff',
			13500
		);
		later(
			() => journeySpeech(JOURNEY.newPatient, 'Okay. I’ll change now.', 'patient', 10000),
			6200
		);
		later(() => {
			setPatientGown(JOURNEY.newPatient, true);
			setPatientGown(JOURNEY.miaTreatmentPatient, true);
			journeySpeech(JOURNEY.newPatient, 'I’m changed and ready.', 'patient', 10000);
		}, 13400);
		later(() => {
			journeySpeech(
				JOURNEY.therapist,
				'Great. Now we’ll continue into Vault 1 and reproduce the setup recorded at simulation.',
				'staff',
				11500
			);
			workflowState(
				'vault1',
				'PATIENT ARRIVING',
				'Mia changed into gown · entering Vault 1',
				'#6fb6ff'
			);
			let done = 0;
			const arrived = () => {
				if (++done < 2) return;
				JOURNEY.stage = 'firstsetup';
				JOURNEY.miaOnTreatmentCouch = false;
				JOURNEY.busy = true;
				applyJourneyPatientFocus();
				workflowState(
					'vault1',
					'FIRST TREATMENT SETUP',
					'Mia standing · simulation accessories being confirmed',
					'#ffb454'
				);
				faceNpcToward(JOURNEY.therapist, JOURNEY.newPatient);
				faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.newPatient);
				poseCharacter(JOURNEY.therapist, 'support');
				poseCharacter(JOURNEY.vaultTherapist, 'support');
				journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'vault1');
				journeySpeech(
					JOURNEY.therapist,
					'Before you lie down, we’re checking the simulation record and placing the same indexed supports on the treatment couch. Once those are confirmed, we’ll help you into position.',
					'staff',
					14000
				);
				later(() => {
					JOURNEY.miaOnTreatmentCouch = true;
					applyJourneyPatientFocus();
					faceNpcToward(JOURNEY.therapist, JOURNEY.miaTreatmentPatient);
					faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient);
					poseCharacter(JOURNEY.therapist, 'support');
					poseCharacter(JOURNEY.vaultTherapist, 'support');
					workflowState(
						'vault1',
						'FIRST TREATMENT SETUP',
						'Mia on couch · CT simulation position reproduced',
						'#ffb454'
					);
					journeyFocusActors(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient, 'vault1');
					journeySpeech(
						JOURNEY.vaultTherapist,
						`Mia is in the ${MIA_SIM_SETUP.position} position. The indexed supports and couch index match the simulation record, and the reference marks are aligned.`,
						'staff',
						14500
					);
					later(
						() =>
							journeySpeech(
								JOURNEY.therapist,
								'This is why the simulation setup was documented so carefully: today we can reproduce the same geometry before we compare verification images with the treatment reference.',
								'staff',
								14000
							),
						9400
					);
					releaseJourneyAfter(24800);
				}, 14200);
			};
			moveJourneyActor(
				JOURNEY.therapist,
				'vault1',
				'vault1',
				new THREE.Vector3(76.0, 0, -14.25),
				arrived,
				1.48
			);
			moveJourneyActor(
				JOURNEY.newPatient,
				'vault1',
				'vault1',
				new THREE.Vector3(76.7, 0, -15.25),
				arrived,
				1.5,
				{
					followCamera: true,
					followSubject: JOURNEY.newPatient,
					followTarget: JOURNEY.therapist,
					cameraOptions: { distance: 3.65, side: 1.35, lead: 1.0 }
				}
			);
		}, 22800);
	};
	moveJourneyActor(
		JOURNEY.therapist,
		'lobby',
		'vault1',
		new THREE.Vector3(69.8, 0, -15.25),
		atChange,
		1.48
	);
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'vault1',
		new THREE.Vector3(68.8, 0, -14.15),
		atChange,
		1.5,
		{
			followCamera: true,
			followSubject: JOURNEY.newPatient,
			followTarget: JOURNEY.therapist,
			cues,
			cameraOptions: { distance: 3.65, side: 1.35, lead: 1.05 }
		}
	);
}
function advanceNewPatientJourney() {
	if (!JOURNEY.active || JOURNEY.busy || S.travel) return;
	journeyActors();
	if (JOURNEY.stage === 'checkin') {
		beginMiaConsultSequence();
	} else if (JOURNEY.stage === 'consult') {
		JOURNEY.busy = true;
		workflowState('consult', 'COMPLETE', 'Consultation complete · education handoff', '#65dda0');
		workflowState(
			'education',
			'EDUCATION',
			'Navigator reviewing simulation preparation',
			'#42d5cf'
		);
		const cues = [
			{
				at: 0.2,
				actor: JOURNEY.newPatient,
				kind: 'patient',
				text: 'There was a lot of information in the consultation. What do I need to remember before simulation?',
				ms: 10500
			},
			{
				at: 0.58,
				actor: JOURNEY.navigator,
				text: 'I’ll focus on the practical pieces: preparation, clothing, whether contrast is planned, and how the simulation team will position you.',
				ms: 11500
			}
		];
		moveJourneyActor(
			JOURNEY.newPatient,
			'consult',
			'education',
			new THREE.Vector3(-40.9, 0, -6.1),
			() => {
				JOURNEY.stage = 'education';
				JOURNEY.busy = true;
				journeyFocusActors(JOURNEY.navigator, JOURNEY.newPatient, 'education');
				journeySpeech(
					JOURNEY.navigator,
					'At simulation, the therapists will find a position you can tolerate, make it reproducible, and document how each support is indexed.',
					'staff',
					11500
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.newPatient,
							'So the setup they create today becomes the position I return to when treatment starts.',
							'patient',
							10500
						),
					7800
				);
				releaseJourneyAfter(19200);
			},
			1.55,
			{
				followCamera: true,
				followSubject: JOURNEY.newPatient,
				followTarget: JOURNEY.navigator,
				cues,
				cameraOptions: { distance: 3.5, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'education') {
		JOURNEY.busy = true;
		workflowState(
			'education',
			'COMPLETE',
			'Preparation reviewed · patient en route to CT changing area',
			'#65dda0'
		);
		workflowState('ctsim', 'PATIENT ARRIVAL', 'Mia approaching CT simulation', '#6fb6ff');
		const cues = [
			{
				at: 0.12,
				actor: JOURNEY.navigator,
				text: 'The simulation team has your order. I’ll take you to the CT area and show you where to change before the scan.',
				ms: 11000
			},
			{
				at: 0.42,
				actor: JOURNEY.newPatient,
				kind: 'patient',
				text: 'I’m a little nervous about whether I’ll be able to stay still long enough.',
				ms: 10500
			},
			{
				at: 0.7,
				actor: JOURNEY.navigator,
				text: 'Tell the therapists before you get onto the table. They can adjust the supports first so the position is reproducible without making you uncomfortable.',
				ms: 11500
			}
		];
		let changeCount = 0;
		const atChanging = () => {
			if (++changeCount < 2) return;
			workflowState('ctsim', 'CHANGING', 'Mia using CT patient changing area', '#ffb454');
			journeyFocusActors(JOURNEY.navigator, JOURNEY.newPatient, 'ctsim');
			journeySpeech(
				JOURNEY.navigator,
				'This is the CT changing area. Take your time changing into the hospital gown. I’ll give you privacy and wait just outside.',
				'staff',
				13000
			);
			later(
				() => journeySpeech(JOURNEY.newPatient, 'Okay. I’ll change now.', 'patient', 10000),
				6200
			);
			later(() => {
				setPatientGown(JOURNEY.newPatient, true);
				setPatientGown(JOURNEY.ctSimPatient, true);
				journeySpeech(
					JOURNEY.newPatient,
					'I’m changed and ready for the simulation.',
					'patient',
					10500
				);
			}, 13500);
			later(() => {
				journeySpeech(
					JOURNEY.navigator,
					'Great. We’ll go into the CT room now and meet the simulation therapist.',
					'staff',
					11000
				);
				let arrived = 0;
				const inCt = () => {
					if (++arrived < 2) return;
					JOURNEY.stage = 'ctsetup';
					JOURNEY.miaOnTable = false;
					JOURNEY.busy = true;
					applyJourneyPatientFocus();
					workflowState(
						'ctsim',
						'PRE-POSITIONING',
						'Therapist reviewing setup before Mia gets on the table',
						'#ffb454'
					);
					journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.newPatient, 'ctsim');
					faceNpcToward(JOURNEY.ctTherapist, JOURNEY.newPatient);
					faceNpcToward(JOURNEY.newPatient, JOURNEY.ctTherapist);
					journeySpeech(
						JOURNEY.ctTherapist,
						'Mia, before you get on the CT table, I’ll explain the position we need and show you where your head, arms, and legs will be supported. Tell me immediately if anything feels strained or difficult to maintain.',
						'staff',
						12000
					);
					later(() => {
						JOURNEY.miaOnTable = true;
						applyJourneyPatientFocus();
						faceNpcToward(JOURNEY.ctTherapist, JOURNEY.ctSimPatient);
						poseCharacter(JOURNEY.ctTherapist, 'support');
						workflowState('ctsim', 'SETUP', 'Mia on CT table · supports being adjusted', '#ffb454');
						journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.ctSimPatient, 'ctsim');
						journeySpeech(
							JOURNEY.ctTherapist,
							'Now that you’re on the table, I’m adjusting the supports and indexing them so we can reproduce this position later. Try to relax while I make the final adjustments.',
							'staff',
							12000
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.ctSimPatient,
									'This position feels comfortable. I can stay like this for the scan.',
									'patient',
									10500
								),
							8200
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.ctTherapist,
									'Good. I’ll record the indexing and reference information, then we’ll step into the control room for the planning scan.',
									'staff',
									11500
								),
							16800
						);
						releaseJourneyAfter(29200);
					}, 12800);
				};
				moveJourneyActor(
					JOURNEY.navigator,
					'ctsim',
					'ctsim',
					new THREE.Vector3(39.8, 0, -6.7),
					inCt,
					1.28
				);
				moveJourneyActor(
					JOURNEY.newPatient,
					'ctsim',
					'ctsim',
					new THREE.Vector3(40.4, 0, -7.2),
					inCt,
					1.3,
					{
						followCamera: true,
						followSubject: JOURNEY.newPatient,
						followTarget: JOURNEY.navigator,
						cameraOptions: { distance: 3.6, side: 1.25 }
					}
				);
			}, 22600);
		};
		moveJourneyActor(
			JOURNEY.navigator,
			'education',
			'ctsim',
			new THREE.Vector3(38.0, 0, -4.7),
			atChanging,
			1.43
		);
		moveJourneyActor(
			JOURNEY.newPatient,
			'education',
			'ctsim',
			new THREE.Vector3(37.15, 0, -4.7),
			atChanging,
			1.45,
			{
				followCamera: true,
				followSubject: JOURNEY.newPatient,
				followTarget: JOURNEY.navigator,
				cues,
				cameraOptions: { distance: 3.7, side: 1.35 }
			}
		);
	} else if (JOURNEY.stage === 'ctsetup') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTable = true;
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.ctTherapist, JOURNEY.ctSimPatient);
		workflowState('ctsim', 'SCANNING', 'Planning CT acquisition underway', '#ffb454');
		workflowState('ctcontrol', 'SCANNING', 'Therapists monitoring Mia and the scan', '#ffb454');
		journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.ctSimPatient, 'ctsim');
		journeySpeech(
			JOURNEY.ctTherapist,
			'Your setup is documented and you are ready for imaging. We’re going behind the glass now. Stay in this position; you’ll hear us over the intercom before the scan begins.',
			'staff',
			12000
		);
		later(() => {
			let done = 0;
			const atControl = () => {
				if (++done < 2) return;
				JOURNEY.stage = 'ctscan';
				JOURNEY.busy = true;
				focusCtPatientFromControl();
				startCtCouchScan();
				journeySpeech(
					JOURNEY.ctControlTherapist,
					'Mia is centered and the scan extent is set. Watch the tabletop move her through the gantry while we acquire the planning CT; we can see her continuously through the observation window and can stop if she needs assistance.',
					'staff',
					14500
				);
				later(
					() =>
						journeyIntercom(
							JOURNEY.ctControlTherapist,
							'Mia, we are ready to begin the scan. Please remain still while the table moves through the scanner.',
							13000
						),
					3800
				);
				releaseJourneyAfter(19000);
			};
			moveJourneyActor(
				JOURNEY.ctTherapist,
				'ctsim',
				'ctcontrol',
				new THREE.Vector3(32.3, 0, -7.2),
				atControl,
				1.55
			);
			moveJourneyActor(
				JOURNEY.ctControlTherapist,
				'ctcontrol',
				'ctcontrol',
				new THREE.Vector3(31.1, 0, -7.8),
				atControl,
				1.25
			);
		}, 10800);
	} else if (JOURNEY.stage === 'ctscan') {
		JOURNEY.busy = true;
		workflowState('ctsim', 'COMPLETE', 'Planning CT complete · patient assistance', '#65dda0');
		workflowState(
			'ctcontrol',
			'COMPLETE',
			'Images ready for physician / dosimetry review',
			'#65dda0'
		);
		journeyIntercom(
			JOURNEY.ctControlTherapist,
			'Mia, the scan is complete. Stay still for a moment while we come back into the room to help you off the table.',
			12500
		);
		moveJourneyActor(
			JOURNEY.ctTherapist,
			'ctcontrol',
			'ctsim',
			new THREE.Vector3(41.2, 0, -8.4),
			() => {
				JOURNEY.stage = 'ctdone';
				JOURNEY.miaOnTable = true;
				JOURNEY.busy = true;
				applyJourneyPatientFocus();
				faceNpcToward(JOURNEY.ctTherapist, JOURNEY.ctSimPatient);
				poseCharacter(JOURNEY.ctTherapist, 'support');
				journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.ctSimPatient, 'ctsim');
				journeySpeech(
					JOURNEY.ctTherapist,
					'The scan is complete, Mia. Stay where you are while I remove the supports and help you sit up safely.',
					'staff',
					11000
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.ctSimPatient,
							'Okay. What happens with the images after I leave?',
							'patient',
							10500
						),
					7600
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.ctTherapist,
							'They go to treatment planning. Your physician, dosimetry, and physics teams will use the CT and today’s setup information to build and verify the plan before your first treatment.',
							'staff',
							12000
						),
					15400
				);
				releaseJourneyAfter(27600);
			},
			1.55,
			{
				followCamera: true,
				followSubject: JOURNEY.ctTherapist,
				cameraOptions: { distance: 3.4, side: 1.2 }
			}
		);
	} else if (JOURNEY.stage === 'ctdone') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTable = false;
		JOURNEY.newPatient.position.set(41.0, 0, -7.2);
		setActorSeated(JOURNEY.newPatient, false);
		JOURNEY.stage = 'instructions';
		applyJourneyPatientFocus();
		journeySpeech(
			JOURNEY.ctTherapist,
			'Take a few minutes in the changing area to get back into your clothes. I’ll wait here, and then we’ll review your instructions before you leave.',
			'staff',
			12500
		);
		later(() => {
			setPatientGown(JOURNEY.newPatient, false);
			journeySpeech(
				JOURNEY.newPatient,
				'I’m changed and ready for the instructions.',
				'patient',
				10500
			);
		}, 8500);
		faceNpcToward(JOURNEY.ctTherapist, JOURNEY.newPatient);
		poseCharacter(JOURNEY.ctTherapist, 'support');
		workflowState(
			'ctsim',
			'DISCHARGE INSTRUCTIONS',
			'Simulation complete · first-treatment instructions',
			'#6fb6ff'
		);
		journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.newPatient, 'ctsim');
		journeySpeech(
			JOURNEY.ctTherapist,
			'You’re safely off the table, Mia. Today’s simulation is finished. Unless your physician or nurse gave you different instructions, you can return to your usual activities. If we placed temporary setup marks, avoid scrubbing them off, and call us if you have a new medical concern before treatment starts.',
			'staff',
			14500
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.ctTherapist,
					'For this simulated schedule, your first radiation treatment is Tuesday at 9:30 AM. Please check in here by 9:15 AM. The first treatment visit may take a little longer because we will reproduce today’s setup and perform verification imaging before treatment.',
					'staff',
					15000
				),
			9800
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.newPatient,
					'So I should be back at 9:15 AM Tuesday for a 9:30 treatment, and I should let the team know if anything changes before then.',
					'patient',
					12500
				),
			20200
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.ctTherapist,
					'Exactly. Bring any questions with you, and continue any preparation instructions your care team gave you. I’ll walk you back to reception so you know where to check in when you return.',
					'staff',
					14000
				),
			29200
		);
		later(() => {
			JOURNEY.stage = 'escort';
			workflowState('ctsim', 'COMPLETE', 'Mia discharged from CT simulation', '#65dda0');
			workflowState(
				'lobby',
				'RETURNING TO LOBBY',
				'Mia Reynolds · escorted after simulation',
				'#42d5cf'
			);
			const cues = [
				{
					at: 0.24,
					actor: JOURNEY.ctTherapist,
					text: 'On your first treatment day, we’ll verify your identity and setup again before anything is delivered.',
					ms: 12000
				},
				{
					at: 0.62,
					actor: JOURNEY.newPatient,
					kind: 'patient',
					text: 'That helps. I’ll plan to arrive early and check in at the same desk.',
					ms: 11000
				}
			];
			let arrived = 0;
			const lobbyArrival = () => {
				if (++arrived < 2) return;
				JOURNEY.busy = true;
				journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.newPatient, 'lobby');
				journeySpeech(
					JOURNEY.ctTherapist,
					'Here we are back at reception. This is where you’ll check in at 9:15 AM Tuesday. You’re finished for today, Mia.',
					'staff',
					13500
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.newPatient,
							'Thank you. I’ll see the team Tuesday morning.',
							'patient',
							11000
						),
					9000
				);
				later(() => {
					workflowState('lobby', 'DEPARTING', 'Mia Reynolds · visit complete', '#65dda0');
					moveJourneyActor(
						JOURNEY.newPatient,
						'lobby',
						'lobby',
						new THREE.Vector3(0, 0, 8.9),
						() => {
							workflowState(
								'lobby',
								'COMPLETE',
								'Mia Reynolds · exited after CT simulation',
								'#65dda0'
							);
							journeySpeech(
								JOURNEY.newPatient,
								'I have my return time and know where to check in.',
								'patient',
								10500
							);
							JOURNEY.stage = 'plantransfer';
							JOURNEY.busy = true;
							updateJourneyUI();
							later(() => beginMiaPlanningHandoff(), 11200);
						},
						1.35,
						{
							followCamera: true,
							followSubject: JOURNEY.newPatient,
							cameraOptions: { distance: 3.4, side: 1.0 }
						}
					);
				}, 20500);
			};
			moveJourneyActor(
				JOURNEY.newPatient,
				'ctsim',
				'lobby',
				new THREE.Vector3(0.35, 0, 4.2),
				lobbyArrival,
				1.48,
				{
					followCamera: true,
					followSubject: JOURNEY.newPatient,
					followTarget: JOURNEY.ctTherapist,
					cues,
					cameraOptions: { distance: 3.7, side: 1.25 }
				}
			);
			moveJourneyActor(
				JOURNEY.ctTherapist,
				'ctsim',
				'lobby',
				new THREE.Vector3(-0.65, 0, 3.65),
				lobbyArrival,
				1.43,
				{ followCamera: false }
			);
		}, 41800);
		updateJourneyUI();
	} else if (JOURNEY.stage === 'firstreturn') {
		beginMiaFirstTreatmentReturn();
	} else if (JOURNEY.stage === 'firstcheckin') {
		beginMiaFirstTreatmentPickup();
	} else if (JOURNEY.stage === 'firstsetup') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTreatmentCouch = true;
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.therapist, JOURNEY.miaTreatmentPatient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient);
		workflowState(
			'vault1',
			'VERIFICATION IMAGING',
			'Fraction 1 · simulation setup reproduced · image verification underway',
			'#6fb6ff'
		);
		journeyFocusActors(JOURNEY.therapist, JOURNEY.miaTreatmentPatient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'The simulation setup has been reproduced. We’ll acquire verification images now and compare Mia’s current treatment position with the approved reference before any radiation is delivered.',
			'staff',
			14000
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.vaultTherapist,
					'The image review confirms the first-treatment position is acceptable for this simulated workflow. The next step is to clear the room and prepare for treatment delivery.',
					'staff',
					14000
				),
			9500
		);
		JOURNEY.stage = 'firstimaging';
		releaseJourneyAfter(24200);
	} else if (JOURNEY.stage === 'firstimaging') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'READY TO TREAT',
			'Fraction 1 · verification complete · therapists moving to treatment control',
			'#ffb454'
		);
		workflowState(
			'linaccontrol',
			'IMAGE REVIEW',
			'Mia Reynolds · first-fraction alignment under therapist review',
			'#6fb6ff'
		);
		journeySpeech(
			JOURNEY.therapist,
			'Your verification imaging is complete, Mia. We’re stepping out now to review the alignment on the control-room monitors. Stay in this position; we can see and hear you the entire time.',
			'staff',
			14000
		);
		let done = 0;
		const atControl = () => {
			if (++done < 2) return;
			setDoorTarget('vault1', false);
			JOURNEY.vaultMonitorPatientOnly = true;
			poseCharacter(JOURNEY.therapist, 'console');
			poseCharacter(JOURNEY.vaultTherapist, 'console');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
			journeySpeech(
				JOURNEY.vaultTherapist,
				'Mia’s setup images are displayed. I’m confirming the first-treatment match and the plan parameters before we begin fraction one.',
				'staff',
				13500
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.therapist,
						'The control-room review is complete. The approved plan, reproduced setup, and image verification all agree. I’ll let Mia know we are about to start.',
						'staff',
						13000
					),
				9200
			);
			later(
				() =>
					journeyIntercom(
						JOURNEY.therapist,
						'Mia, your setup and imaging are verified. Please continue to hold still. We are starting your first treatment now.',
						14000
					),
				18600
			);
			later(() => {
				JOURNEY.stage = 'firsttreatment';
				JOURNEY.busy = true;
				workflowState('vault1', 'BEAM ON', 'Mia Reynolds · first fraction in progress', '#ff737b');
				workflowState(
					'linaccontrol',
					'MONITORING',
					'Mia Reynolds · Fraction 1 · CCTV and intercom active',
					'#ff737b'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
				journeySpeech(
					JOURNEY.therapist,
					'Mia’s identity, approved plan, reproduced setup, and verification imaging are complete. Fraction 1 is now being delivered while we monitor her and the treatment system from the protected control area.',
					'staff',
					15000
				);
				releaseJourneyAfter(15800);
			}, 26800);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 8.6),
			atControl,
			1.82
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 10.2),
			atControl,
			1.84,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'firsttreatment') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'FIRST FRACTION COMPLETE',
			'Beam delivery complete · therapist re-entry',
			'#65dda0'
		);
		workflowState(
			'linaccontrol',
			'COMPLETE',
			'Fraction 1 recorded · therapists returning to Mia',
			'#65dda0'
		);
		journeyIntercom(
			JOURNEY.therapist,
			'Mia, your first treatment is complete. Stay still and we will come back into the room to help you sit up.',
			12500
		);
		setDoorTarget('vault1', true);
		let done = 0;
		const reenter = () => {
			if (++done < 2) return;
			JOURNEY.vaultMonitorPatientOnly = false;
			JOURNEY.stage = 'firstcomplete';
			JOURNEY.busy = true;
			faceNpcToward(JOURNEY.therapist, JOURNEY.miaTreatmentPatient);
			faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient);
			poseCharacter(JOURNEY.therapist, 'support');
			poseCharacter(JOURNEY.vaultTherapist, 'support');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.miaTreatmentPatient, 'vault1');
			journeySpeech(
				JOURNEY.therapist,
				'Mia, your first treatment is complete. Stay where you are while we lower the couch and help you sit up.',
				'staff',
				13000
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.vaultTherapist,
						'Your first fraction has been documented. We’ll remove the setup supports and make sure you feel steady before you stand.',
						'staff',
						12500
					),
				8600
			);
			releaseJourneyAfter(21800);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.3, 0, -16.0),
			reenter,
			1.82
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.0, 0, -14.3),
			reenter,
			1.84,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'firstcomplete') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTreatmentCouch = false;
		JOURNEY.newPatient.position.set(77.0, 0, -15.25);
		setActorSeated(JOURNEY.newPatient, false);
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.therapist, JOURNEY.newPatient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.newPatient);
		workflowState(
			'vault1',
			'POST-TREATMENT',
			'Mia standing · first-treatment instructions',
			'#42d5cf'
		);
		journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'That completes your first fraction. You may not notice an immediate change from the radiation itself. Continue the instructions your care team gave you and tell us about new fatigue, skin changes, pain, nausea, or other symptoms as the course continues.',
			'staff',
			15000
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.newPatient,
					'I understand. I’ll check in the same way for my next treatment and let the team know if anything changes.',
					'patient',
					12500
				),
			10200
		);
		JOURNEY.stage = 'firstdeparture';
		releaseJourneyAfter(23200);
	} else if (JOURNEY.stage === 'firstdeparture') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'ROOM TURNOVER',
			'Mia changing after treatment · room reset begins',
			'#42d5cf'
		);
		journeySpeech(
			JOURNEY.therapist,
			'Take a few minutes to change back into your clothes. I’ll wait nearby, and then I’ll walk you to reception.',
			'staff',
			12000
		);
		later(() => {
			setPatientGown(JOURNEY.newPatient, false);
			setPatientGown(JOURNEY.miaTreatmentPatient, false);
			journeySpeech(JOURNEY.newPatient, 'I’m changed and ready to head out.', 'patient', 10000);
		}, 8000);
		workflowState(
			'linaccontrol',
			'READY',
			'Fraction 1 complete · preparing next treatment',
			'#65dda0'
		);
		workflowState('lobby', 'DEPARTING', 'Mia Reynolds · first treatment complete', '#65dda0');
		let arrived = 0;
		const lobbyArrival = () => {
			if (++arrived < 2) return;
			journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'lobby');
			journeySpeech(
				JOURNEY.therapist,
				'You’re all set for today, Mia. Check in here for your next scheduled treatment, and contact the department sooner if you develop a concern that should not wait until the next visit.',
				'staff',
				14000
			);
			later(() => {
				moveJourneyActor(
					JOURNEY.newPatient,
					'lobby',
					'lobby',
					new THREE.Vector3(0, 0, 8.9),
					() => {
						JOURNEY.stage = 'done';
						JOURNEY.busy = false;
						workflowState(
							'lobby',
							'COMPLETE',
							'Mia Reynolds · first treatment visit complete',
							'#65dda0'
						);
						journeySpeech(
							JOURNEY.newPatient,
							'I know how simulation, planning, and today’s setup connected to my first treatment.',
							'patient',
							12000
						);
						updateJourneyUI();
						toast(
							'<b>Mia’s longitudinal journey is complete.</b> Consultation, CT simulation, planning, physics QA, and the first radiation treatment have all been demonstrated.'
						);
					},
					1.35,
					{
						followCamera: true,
						followSubject: JOURNEY.newPatient,
						cameraOptions: { distance: 3.4, side: 1.0 }
					}
				);
			}, 14800);
		};
		later(() => {
			moveJourneyActor(
				JOURNEY.newPatient,
				'vault1',
				'lobby',
				new THREE.Vector3(0.35, 0, 4.2),
				lobbyArrival,
				1.48,
				{
					followCamera: true,
					followSubject: JOURNEY.newPatient,
					followTarget: JOURNEY.therapist,
					cameraOptions: { distance: 3.7, side: 1.25 }
				}
			);
			moveJourneyActor(
				JOURNEY.therapist,
				'vault1',
				'lobby',
				new THREE.Vector3(-0.65, 0, 3.65),
				lobbyArrival,
				1.43
			);
		}, 9800);
	}
}

function beginMiaPlanningHandoff() {
	if (!JOURNEY.active || JOURNEY.kind !== 'newpatient') return;
	clearJourneyCameraFollow();
	JOURNEY.busy = true;
	JOURNEY.stage = 'plantransfer';
	workflowState(
		'ctcontrol',
		'TRANSFER TO PLANNING',
		'Mia CT dataset + indexed setup / immobilization record sent to Dosimetry',
		'#6fb6ff'
	);
	journeyFocusActors(JOURNEY.ctControlTherapist, JOURNEY.ctControlPartner, 'ctcontrol');
	journeySpeech(
		JOURNEY.ctControlTherapist,
		'Mia has left for the day. I’m sending her planning CT together with the indexed setup, immobilization details, treatment position, and reference information to the Dosimetry suite.',
		'staff',
		14500
	);
	later(() => {
		JOURNEY.stage = 'dosimetry';
		workflowState(
			'dosimetry',
			'COMPUTER PLAN',
			'Mia Reynolds · treatment plan calculation and optimization',
			'#ffb454'
		);
		journeyFocusActors(JOURNEY.dosimetrist, JOURNEY.dosimetryPartner, 'dosimetry');
		poseCharacter(JOURNEY.dosimetrist, 'desk');
		journeySpeech(
			JOURNEY.dosimetrist,
			'The CT dataset and simulation setup are here with the physician prescription. I’m building the computer treatment plan: selecting beam geometry, calculating dose, and optimizing target coverage while limiting dose to nearby normal tissues.',
			'staff',
			15000
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.dosimetrist,
					'The plan meets the planning objectives. After the radiation oncologist’s clinical approval, I’m sending the approved plan and calculation data to Medical Physics for the independent technical review.',
					'staff',
					15000
				),
			11200
		);
		later(() => {
			JOURNEY.stage = 'physicsqa';
			workflowState(
				'dosimetry',
				'SENT TO PHYSICS',
				'Approved plan transferred for technical verification',
				'#65dda0'
			);
			workflowState(
				'physics',
				'PLAN QA',
				'Mia Reynolds · physics review / required QA in progress',
				'#6fb6ff'
			);
			journeyFocusActors(JOURNEY.physicist, JOURNEY.physicsPartner, 'physics');
			poseCharacter(JOURNEY.physicist, 'desk');
			journeySpeech(
				JOURNEY.physicist,
				'I’ve received Mia’s approved treatment plan. I’m verifying prescription and plan consistency, dose calculation, machine parameters, treatment geometry, and the required QA documentation before the plan can be released.',
				'staff',
				15000
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.physicist,
						'The technical checks are acceptable. For techniques requiring patient-specific measurement, that QA must also pass. This simulated plan is cleared for transfer to the treatment system.',
						'staff',
						15000
					),
				11200
			);
			later(() => {
				JOURNEY.stage = 'planrelease';
				workflowState(
					'physics',
					'QA COMPLETE',
					'Plan verified · released to treatment operations',
					'#65dda0'
				);
				workflowState(
					'linaccontrol',
					'PLAN RECEIVED',
					'Mia Reynolds · approved plan available for first treatment',
					'#65dda0'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.controlPartner, 'linaccontrol');
				poseCharacter(JOURNEY.therapist, 'console');
				journeySpeech(
					JOURNEY.therapist,
					'Mia’s approved and physics-verified plan is now available in Treatment Control for her Tuesday 9:30 AM appointment. Before delivery, we will still verify her identity, reproduce the indexed setup, and perform the required treatment-room imaging.',
					'staff',
					15500
				);
				later(() => {
					JOURNEY.stage = 'firstreturn';
					JOURNEY.busy = false;
					workflowState(
						'linaccontrol',
						'READY FOR FIRST TREATMENT',
						'Mia Reynolds · approved plan + physics QA available · Tuesday 9:30 AM',
						'#65dda0'
					);
					applyJourneyPatientFocus();
					updateJourneyUI();
					toast(
						'<b>Planning workflow complete.</b> Mia’s approved, physics-cleared plan is ready. Continue the journey to advance to Tuesday morning and her first treatment.'
					);
				}, 16500);
			}, 28500);
		}, 28500);
	}, 15500);
	updateJourneyUI();
}

export function focusTargetsForRoom(r) {
	const arr = ROOM_CAST[r.id] || [],
		wp = new THREE.Vector3(),
		near = (e) => {
			if (e.g.visible === false) return false;
			e.g.getWorldPosition(wp);
			return (
				Math.abs(wp.x - r.x) <= r.w / 2 + 2.2 &&
				Math.abs(wp.z - r.z) <= r.d / 2 + 2.2 &&
				!e.g.userData?.inHandoff
			);
		},
		staff = arr.filter((e) => e.kind === 'staff' && near(e)),
		patients = arr.filter((e) => e.kind === 'patient' && near(e));
	let a = staff.find((e) => e.g === PRIMARY_NPCS[ROOM_GUIDES[r.id]])?.g || staff[0]?.g,
		b = patients[0]?.g || staff[1]?.g;
	if (JOURNEY.active) {
		if (JOURNEY.kind === 'treatment') {
			if (r.id === 'lobby' && JOURNEY.patient?.visible !== false) {
				a = PRIMARY_NPCS.lobby || a;
				b = JOURNEY.patient;
			} else if (r.id === 'linaccontrol') {
				a = JOURNEY.therapist || a;
				b = JOURNEY.controlPartner || JOURNEY.vaultTherapist || b;
			} else if (r.id === 'vault1' && JOURNEY.couchPatient?.visible !== false) {
				a = JOURNEY.therapist || PRIMARY_NPCS.vault1 || a;
				b = JOURNEY.couchPatient;
			}
		} else {
			if (r.id === 'lobby' && JOURNEY.newPatient?.visible !== false) {
				a = PRIMARY_NPCS.lobby || a;
				b = JOURNEY.newPatient;
			} else if (r.id === 'consult' && JOURNEY.newPatient?.visible !== false) {
				a = JOURNEY.consultStaff || a;
				b = JOURNEY.newPatient;
			} else if (r.id === 'education' && JOURNEY.newPatient?.visible !== false) {
				a = JOURNEY.navigator || a;
				b = JOURNEY.newPatient;
			} else if (r.id === 'ctsim' && JOURNEY.ctSimPatient?.visible !== false) {
				a = JOURNEY.ctTherapist || a;
				b = JOURNEY.ctSimPatient;
			} else if (r.id === 'ctcontrol') {
				a = JOURNEY.ctControlTherapist || a;
				b = JOURNEY.ctTherapist || b;
			} else if (r.id === 'linaccontrol') {
				a = JOURNEY.therapist || a;
				b = JOURNEY.controlPartner || b;
			} else if (r.id === 'vault1' && JOURNEY.miaTreatmentPatient?.visible !== false) {
				a = JOURNEY.vaultTherapist || JOURNEY.therapist || a;
				b = JOURNEY.miaTreatmentPatient;
			} else if (r.id === 'vault1' && JOURNEY.newPatient?.visible !== false) {
				a = JOURNEY.therapist || JOURNEY.vaultTherapist || a;
				b = JOURNEY.newPatient;
			}
		}
	}
	if (!a) return null;
	const pa = new THREE.Vector3(),
		pb = new THREE.Vector3();
	a.getWorldPosition(pa);
	if (b) b.getWorldPosition(pb);
	else pb.copy(pa).add(new THREE.Vector3(0.4, 0, 0));
	return { a, b, pa, pb, target: pa.clone().add(pb).multiplyScalar(0.5).setY(1.35) };
}
function conversationCameraPose(r) {
	const f = r ? focusTargetsForRoom(r) : null;
	if (!r || !f) return null;
	let pos;
	if (r.id === 'vault1') pos = new THREE.Vector3(81.4, 1.96, -13.9);
	else if (r.id === 'vault2') pos = new THREE.Vector3(81.4, 1.96, 13.9);
	else {
		const n = r.hub ? new THREE.Vector3(0, 0, 1) : doorNormal(r),
			tangent = Math.abs(n.x) > 0.5 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
		pos = f.target.clone().add(n.clone().multiplyScalar(3.5)).add(tangent.multiplyScalar(1.55));
		pos.y = 1.85;
	}
	return { pos, target: f.target.clone(), fov: r.vault ? 58 : 54 };
}
export function focusConversationCamera(key) {
	const r = roomById(key),
		pose = conversationCameraPose(r);
	if (!r || !pose) return;
	camera.position.copy(pose.pos);
	camera.fov = pose.fov;
	camera.updateProjectionMatrix();
	orbit.target.copy(pose.target);
	orbit.minDistance = 2.0;
	orbit.maxDistance = 10;
	orbit.enableZoom = true;
	orbit.enableRotate = true;
	orbit.enabled = true;
	orbit.update();
}
export function startJourneyFromKiosk(kind) {
	closeKioskDialog();
	setJourneyKind(kind, true);
	setMode('guided', false);
	startTreatmentJourney();
}
export function walkCompositionReady(r) {
	if (!r) return false;
	if (r.id === 'vault1') return player.pos.x > 75.1 && player.pos.z > -17.5;
	if (r.id === 'vault2') return player.pos.x > 75.1 && player.pos.z < 17.5;
	return true;
}
export function applyWalkConversationComposition(r, reposition = false) {
	const f = focusTargetsForRoom(r);
	if (!r || !f) return;
	if (reposition) {
		const pose = roomInspectPose(r);
		player.pos.copy(pose.pos);
		player.pos.y = 1.65;
	}
	S.activeRoom = r;
	updateRoomUI(r);
	renderRoomList();
	aimPlayerAt(f.target);
	S.walkCompositionRoomId = r.id;
	document.getElementById('locText').textContent =
		`Current location: ${r.name} · conversation view`;
}
export function beginRoutePhase(now) {
	S.travel.curve = makeRouteToApproach(S.travel.room);
	const len = S.travel.curve.getLength();
	S.travel.routeStart = now;
	S.travel.routeDuration = Math.max(5200, Math.min(14500, 3500 + len * 92));
	S.travel.phase = 'route';
	S.travel.originClosed = false;
}
export function enableGuidedConversationComposition(r) {
	const pose = conversationCameraPose(r) || roomInspectPose(r);
	if (!pose) return;
	camera.fov = pose.fov || 58;
	camera.updateProjectionMatrix();
	camera.position.copy(pose.pos);
	orbit.target.copy(pose.target);
	const dist = camera.position.distanceTo(pose.target);
	orbit.minDistance = Math.max(2.2, dist * 0.58);
	orbit.maxDistance = Math.max(3.2, dist * 1.16);
	orbit.minPolarAngle = 0.42;
	orbit.maxPolarAngle = Math.PI * 0.49;
	orbit.enableZoom = true;
	orbit.enableRotate = true;
	orbit.enablePan = false;
	orbit.enabled = true;
	orbit.update();
	document.getElementById('roomLookHint').classList.add('show');
}
export function beginEntryPhase(now) {
	const r = S.travel.room;
	let pts = [camera.position.clone(), doorPoint(r), insidePoint(r), new THREE.Vector3(...r.cam)],
		poly = false;
	if (r.id === 'vault1') {
		const pose = conversationCameraPose(r) || roomInspectPose(r);
		pts = [
			camera.position.clone(),
			new THREE.Vector3(63.15, 1.66, -18),
			new THREE.Vector3(65.1, 1.66, -18),
			new THREE.Vector3(70.5, 1.66, -18),
			new THREE.Vector3(71.25, 1.66, -15.3),
			new THREE.Vector3(73.15, 1.66, -15.3),
			pose.pos.clone()
		];
		poly = true;
	}
	if (r.id === 'vault2') {
		const pose = conversationCameraPose(r) || roomInspectPose(r);
		pts = [
			camera.position.clone(),
			new THREE.Vector3(63.15, 1.66, 18),
			new THREE.Vector3(65.1, 1.66, 18),
			new THREE.Vector3(70.5, 1.66, 18),
			new THREE.Vector3(71.25, 1.66, 15.3),
			new THREE.Vector3(73.15, 1.66, 15.3),
			pose.pos.clone()
		];
		poly = true;
	}
	const clean = cleanPoints(pts);
	S.travel.entryCurve = poly
		? makePolylineCurve(clean)
		: new THREE.CatmullRomCurve3(clean, false, 'catmullrom', 0.16);
	S.travel.entryStart = now;
	S.travel.entryDuration = r.vault ? 4450 : r.special ? 2850 : 2350;
	S.travel.phase = 'enter';
}
