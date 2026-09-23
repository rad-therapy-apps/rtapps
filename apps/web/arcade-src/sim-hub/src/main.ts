import * as THREE from 'three';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 1 report
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { S } from './state';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 1 report
import { box, std, wall, makeDirectionalSign } from './helpers';
import {
	renderer,
	scene,
	camera,
	labelRenderer,
	orbit,
	canvas,
	AMBIENCE,
	initAmbience,
	updateAmbience,
	ambienceProfile,
	updatePerfFloor
} from './scene';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 1 report
import { vehicleObject, monumentSign, privacyChangingNook } from './props';
import {
	C,
	ROOMS,
	buildRoom,
	buildHubLobby,
	buildCorridorInfillWalls,
	buildVaultMazeEntries,
	corridorFloor,
	corridorLightsHorizontal,
	corridorLightsVertical,
	clinicalCeilingAccents,
	addCirculationProps,
	addClinicalWallPolish,
	buildExteriorAmbient
} from './rooms';
import { updateNpcLabels, departmentStaff } from './npc';
import {
	updateMovers,
	addMovingActors,
	updateDutyAnimations,
	updateNpcExchanges,
	updateHandoffTransitions
} from './npc-behavior';
import {
	buildClinicalEquipmentLayer,
	updateClinicalEquipment,
	updateStatusBeacons,
	updateAmbulance,
	renderOperatorLiveFeeds,
	buildOperatorLiveConsole,
	buildCtLiveConsole,
	updateCtCouchMotion,
	updateWallClocks,
	addJourneyWallClocks,
	buildPhase4WorkflowDisplays,
	updateWorkflowTransitions,
	buildPhase5Wayfinding,
	workflowState,
	CLINICAL_FOCUS
} from './equipment';
import {
	beginTravel,
	updateTravel,
	updateDoors,
	updateWalk,
	setMode,
	applyWalkMouseDelta,
	requestWalkPointerLock
} from './walk';
import {
	performInteraction,
	updateInteractionUI,
	toast,
	closeStaffDialogue,
	resetStaffDialogue,
	closeKioskDialog,
	closeLinacHeadLab,
	lhAnimate,
	lhCanvasClick,
	lhDraw,
	lhReset,
	lhSetEnergy,
	lhSetMode,
	lhUpdateText,
	showEquipmentPanel,
	closeEquipmentPanel,
	bindPanelToggle,
	renderRoomList,
	updateFacilityInfo,
	procRenderSite,
	procRefreshRelease
} from './interact';
import {
	JOURNEY,
	journeyActors,
	setJourneyKind,
	applyJourneyPatientFocus,
	updateJourneyUI,
	resetTreatmentJourney,
	startTreatmentJourney,
	advanceTreatmentJourney,
	startJourneyFromKiosk,
	updateJourneyRoomTiming,
	updateJourneyCameraFollow
} from './journey';
import './sdk-bridge';

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export const ROOM_GUIDES = {
	lobby: 'lobby',
	consult: 'consult',
	social: 'social',
	education: 'education',
	patientcare: 'patientcare',
	safety: 'safety',
	physics: 'physics',
	radbio: 'radbio',
	engineering: 'engineering',
	qa: 'qa',
	dosimetry: 'dosimetry',
	commons: 'commons',
	manager: 'manager',
	ctcontrol: 'ctcontrol',
	ctsim: 'ctsim',
	linaccontrol: 'linaccontrol',
	vault1: 'vault1',
	vault2: 'vault2',
	hdr: 'hdr'
};
// RTApps (#77 phase 2 task 16): typed boundary for the room-cast/primary-actor registries —
// filled incrementally by npc.ts's departmentStaff() (`{ g, kind }` cast entries; `g`/primary
// slots are the THREE.Object3D each NPC's setNpcRole call returns), read by
// npc-behavior.ts/journey.ts/equipment.ts.
export const ROOM_CAST: Record<string, { g: THREE.Object3D; kind: string }[]> = {},
	PRIMARY_NPCS: Record<string, THREE.Object3D> = {},
	PRIMARY_PATIENTS: Record<string, THREE.Object3D> = {};
export const HANDOFFS = {
	lobby: [
		{
			label: 'New patient visit → Consultation',
			patient: 'This is my first radiation oncology visit.',
			staff:
				'You are checked in. Dr. Ramirez and the consultation team are ready for you. I’ll let them know you are on the way.',
			target: 'consult',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		},
		{
			label: 'Returning treatment visit → Have a seat',
			patient: 'I am here for today’s treatment.',
			staff:
				'You are checked in. Please have a seat in the waiting area. A radiation therapist will come for you when the treatment room is ready.',
			target: 'lobby',
			actor: 'patient',
			actorIndex: 1,
			final: [-2.8, 0, 3.4],
			follow: false
		}
	],
	consult: [
		{
			label: 'Continue to Patient Navigation',
			staff:
				'Before simulation, Sam can review the sequence of appointments, practical instructions and what happens next. Let’s connect you with Patient Navigation.',
			target: 'education',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		},
		{
			label: 'Request support services first',
			staff:
				'Absolutely. Nia in Social Services can help with transportation, financial concerns, work issues and emotional support before we move forward.',
			target: 'social',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		}
	],
	social: [
		{
			label: 'Continue with Patient Navigation',
			staff:
				'We have a support plan in place. Sam can now help you review the next steps in the treatment pathway.',
			target: 'education',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		}
	],
	education: [
		{
			label: 'Proceed to CT Simulation',
			staff:
				'Your next clinical step is CT simulation. The simulation therapists will reproduce your treatment position, select immobilization and obtain the planning images.',
			target: 'ctsim',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		}
	],
	patientcare: [
		{
			label: 'Return to the waiting area for treatment',
			staff:
				'Your assessment is complete. Please return to the waiting area. The treatment team will call you when the vault is ready.',
			target: 'lobby',
			actor: 'patient',
			actorIndex: 0,
			final: [-4.2, 0, 3.4],
			follow: true
		}
	],
	safety: [
		{
			label: 'Continue to Medical Physics',
			staff:
				'Radiation safety and medical physics work closely together. Let’s continue to Physics to see how measurement, calibration and technical verification support safe treatment.',
			target: 'physics',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	physics: [
		{
			label: 'Continue to Machine QA',
			staff:
				'The measurement is complete. The next stop is Machine QA, where the team verifies performance before clinical use.',
			target: 'qa',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	engineering: [
		{
			label: 'Send the machine back for QA verification',
			staff:
				'Service diagnostics are complete. Before the machine returns to patient use, QA verification is the next step.',
			target: 'qa',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	qa: [
		{
			label: 'Release to Treatment Operations',
			staff:
				'QA checks are complete and acceptable. Treatment Operations can now continue the clinical workflow.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	dosimetry: [
		{
			label: 'Continue to Physics plan review',
			staff:
				'The plan is ready for technical review. Dr. Shah will take the plan forward for physics verification before treatment.',
			target: 'physics',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	manager: [
		{
			label: 'Continue to Treatment Control',
			staff:
				'The staffing and schedule review is complete. Chris will return to the treatment control area to coordinate the day’s clinical operations.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	ctcontrol: [
		{
			label: 'Enter the CT room for final setup',
			staff:
				'The protocol is confirmed. Avery will join the simulation team in the scanner room for the final setup checks before acquisition.',
			target: 'ctsim',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	ctsim: [
		{
			label: 'Complete scan → therapist returns to CT Control',
			staff:
				'The simulation scan is complete. Jasmine will return to the control room while the image set is transferred for treatment planning.',
			target: 'ctcontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	linaccontrol: [
		{
			label: 'Take the treatment team to Vault 1',
			staff:
				'The treatment record and imaging workflow are ready. Marcus will enter Vault 1 for the patient setup and verification sequence.',
			target: 'vault1',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		},
		{
			label: 'Take the treatment team to Vault 2',
			staff:
				'Vault 2 is ready. Marcus will enter the treatment room for setup and verification before delivery.',
			target: 'vault2',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	vault1: [
		{
			label: 'Treatment complete → therapist returns to control',
			staff:
				'Treatment is complete. We’ll assist the patient off the couch, then Elena will return to Treatment Control to document the session and prepare for the next patient.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	vault2: [
		{
			label: 'Treatment complete → therapist returns to control',
			staff:
				'Treatment is complete. We’ll assist the patient off the couch, then Devin will return to Treatment Control to document the session and prepare for the next patient.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	hdr: [
		{
			label: 'Procedure complete → Nursing follow-up',
			staff:
				'The procedure is complete and source safety checks are confirmed. I’ll transition with the patient to the nursing area for post-procedure assessment and recovery support.',
			target: 'patientcare',
			actor: 'staff',
			actorIndex: 0,
			follow: true
		}
	],
	commons: [
		{
			label: 'Return to the lobby / choose another department',
			staff:
				'That concludes this case discussion. You can return to the lobby and choose another department to explore.',
			target: 'lobby',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	]
};
export const roomById = (id) => ROOMS.find((r) => r.id === id);

// RTApps (#77 phase 2 task 16): typed boundary for the shared-material registry — filled
// incrementally below (std() always returns a THREE.MeshStandardMaterial), read by
// rooms.ts/props.ts throughout.
export const MAT: Record<string, THREE.MeshStandardMaterial> = {};
MAT.floor = std(0x87939b, 0.82, 0.04);
MAT.floorDark = std(0x3b4650, 0.86, 0.04);
MAT.wall = std(0xd9e0e4, 0.92, 0.01);
MAT.wallVault = std(0xb7bec3, 0.95, 0.02);
MAT.trim = std(0x4b5962, 0.7, 0.1);
MAT.glass = std(0x79b9d1, 0.18, 0.05, { transparent: true, opacity: 0.27, side: THREE.DoubleSide });
MAT.screen = std(0x0b1f2d, 0.28, 0.02, { emissive: 0x0a4e71, emissiveIntensity: 0.75 });
MAT.metal = std(0xaeb9c0, 0.42, 0.55);
MAT.black = std(0x172028, 0.65, 0.15);
MAT.uphol = std(0x4f6b7d, 0.9, 0.0);
MAT.white = std(0xf1f4f5, 0.8, 0.02);
MAT.water = std(0x2e87b8, 0.15, 0.0, { transparent: true, opacity: 0.42 });
MAT.red = std(0xad3942, 0.68, 0.03);
MAT.green = std(0x3e9b6b, 0.68, 0.03);
MAT.wood = std(0x8b6a50, 0.78, 0.02);
export function add(g, o) {
	g.add(o);
	return o;
}

const ground = box(200, 0.18, 150, std(0x151c22, 0.98, 0), 12, -0.12, -12);
ground.receiveShadow = true;
scene.add(ground);

export const roomFloors = [];
export const ceilings = [];
export const doors = new Map();
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 1 report
function updateDoorNameLabels() {}

buildExteriorAmbient();

corridorFloor(-32, 0, 40, 7, C.front); // Patient Services west corridor
corridorFloor(0, -38, 7, 56, C.technical); // Technical / Education north corridor
corridorFloor(38, 0, 52, 8, C.clinical); // Main Clinical east corridor
corridorFloor(64, 0, 8, 62, C.vault); // Treatment branch
scene.add(box(9, 0.065, 9, std(0x627079, 0.82, 0.04), 64, 0.026, 0));
corridorLightsHorizontal(-50, -12, 0);
corridorLightsVertical(-66, -10, 0);
corridorLightsHorizontal(12, 64, 0);
corridorLightsVertical(-30, 30, 64);
buildCorridorInfillWalls();
buildVaultMazeEntries();
ROOMS.forEach((r) => (r.hub ? buildHubLobby(r) : buildRoom(r)));
addJourneyWallClocks();
addCirculationProps();
buildPhase4WorkflowDisplays();

buildOperatorLiveConsole();

buildCtLiveConsole();

addClinicalWallPolish();

departmentStaff();
addMovingActors();
clinicalCeilingAccents('ctcontrol');
clinicalCeilingAccents('ctsim');
clinicalCeilingAccents('linaccontrol');
clinicalCeilingAccents('vault1');
clinicalCeilingAccents('vault2');
privacyChangingNook('ctsim', 37.15, -4.7, 0, 'CT PATIENT CHANGING');
privacyChangingNook('vault1', 68.7, -14.2, Math.PI / 2, 'TREATMENT CHANGING', 1.16);
privacyChangingNook('vault2', 68.7, 14.2, Math.PI / 2, 'TREATMENT CHANGING', 1.16);

// Environment, wayfinding, and ambience
async function toggleAmbience() {
	initAmbience();
	if (!AMBIENCE.ctx) {
		toast('<b>Ambient audio unavailable in this browser.</b>');
		return;
	}
	try {
		if (AMBIENCE.ctx.state !== 'running') await AMBIENCE.ctx.resume();
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy pattern, error object intentionally unused
	} catch (e) {
		toast(
			'<b>Browser audio could not be started.</b><br>Click the page once and try Ambience again.'
		);
		return;
	}
	AMBIENCE.on = !AMBIENCE.on;
	const t = AMBIENCE.ctx.currentTime;
	AMBIENCE.master.gain.cancelScheduledValues(t);
	if (AMBIENCE.on) {
		updateAmbience();
		AMBIENCE.master.gain.setTargetAtTime(ambienceProfile().master, t, 0.08);
	} else AMBIENCE.master.gain.setTargetAtTime(0, t, 0.1);
	const b = document.getElementById('ambientBtn');
	b.classList.toggle('on', AMBIENCE.on);
	b.textContent = AMBIENCE.on ? '🔊 Ambience On' : '🔇 Ambience Off';
	if (AMBIENCE.on)
		toast(
			'<b>Department ambience enabled.</b><br>You should hear a low room tone that changes between reception, CT, control, and the treatment vaults.'
		);
}

makeDirectionalSign(
	'←  PATIENT SERVICES',
	'Consult · Counseling · Education · Patient Care',
	-11.25,
	2.82,
	0,
	Math.PI / 2,
	3.7
);
makeDirectionalSign(
	'TECHNICAL / EDUCATION  ↑',
	'Physics · RadBio · Engineering · QA · Dosimetry',
	0,
	2.82,
	-9.35,
	0,
	4.2
);
makeDirectionalSign(
	'CLINICAL SERVICES  →',
	'CT Simulation · Leadership · LINAC · HDR',
	11.25,
	2.82,
	0,
	-Math.PI / 2,
	3.7
);
buildPhase5Wayfinding();

buildClinicalEquipmentLayer();

// lobby branding wall
const brandCanvas = document.createElement('canvas');
brandCanvas.width = 1024;
brandCanvas.height = 256;
const bc = brandCanvas.getContext('2d');
bc.fillStyle = '#eef4f5';
bc.fillRect(0, 0, 1024, 256);
bc.fillStyle = '#143845';
bc.font = '900 104px Arial';
bc.fillText('RT', 76, 150);
bc.fillStyle = '#1d9e99';
bc.fillText('Apps', 196, 150);
bc.fillStyle = '#506872';
bc.font = '600 35px Arial';
bc.fillText('SIMULATED RADIATION THERAPY CENTER', 76, 205);
const bt = new THREE.CanvasTexture(brandCanvas);
bt.colorSpace = THREE.SRGBColorSpace;
const sign = new THREE.Mesh(
	new THREE.PlaneGeometry(5.5, 1.38),
	new THREE.MeshBasicMaterial({ map: bt })
);
sign.position.set(-6.0, 2.32, 9.89);
sign.rotation.y = Math.PI;
scene.add(sign);
monumentSign(-1.8, 14.25);

export const player = {
	pos: new THREE.Vector3(0, 1.65, 5.5),
	yaw: Math.PI,
	pitch: 0,
	locked: false
};
// RTApps (#77 phase 2 task 16): typed boundary for the pressed-key registry, read by walk.ts.
export const keys: Record<string, boolean> = {};

document.getElementById('sdClose').onclick =
	closeStaffDialogue as unknown as GlobalEventHandlers['onclick'];
document.getElementById('sdRestart').onclick = () =>
	S.activeGuideKey && resetStaffDialogue(S.activeGuideKey);

const studentHelp = document.getElementById('studentHelp');
const openStudentHelp = () => {
	if (document.pointerLockElement) document.exitPointerLock();
	studentHelp?.classList.add('show');
};
const closeStudentHelp = () => studentHelp?.classList.remove('show');
document.getElementById('helpBtn').onclick = openStudentHelp;
document.getElementById('studentHelpClose').onclick = closeStudentHelp;
studentHelp?.addEventListener('click', (e) => {
	if (e.target === studentHelp) closeStudentHelp();
});
document.querySelectorAll<HTMLElement>('#modeSeg button').forEach(
	(b) =>
		(b.onclick = () => {
			setMode(b.dataset.mode);
			if (b.dataset.mode === 'walk') requestWalkPointerLock();
		})
);
document.querySelectorAll<HTMLElement>('#zoneChips button').forEach(
	(b) =>
		(b.onclick = () => {
			document
				.querySelectorAll<HTMLElement>('#zoneChips button')
				.forEach((x) => x.classList.toggle('active', x === b));
			renderRoomList();
		})
);
document.getElementById('homeBtn').onclick = () => beginTravel(roomById('lobby'));
document.getElementById('backBtn').onclick = () => {
	const id = S.history.pop();
	if (id) beginTravel(roomById(id), false);
	(document.getElementById('backBtn') as HTMLButtonElement).disabled = !S.history.length;
};
document.getElementById('linacHeadClose').onclick = closeLinacHeadLab;
document.getElementById('lhPhoton').onclick = () => lhSetMode('photon');
document.getElementById('lhElectron').onclick = () => lhSetMode('electron');
document
	.querySelectorAll<HTMLElement>('[data-lhenergy]')
	.forEach((b) => (b.onclick = () => lhSetEnergy(b.dataset.lhenergy)));
document.getElementById('lhAnimate').onclick = lhAnimate;
document.getElementById('lhReset').onclick = () => lhReset();
document.getElementById('linacHeadCanvas').onclick = lhCanvasClick;
document.getElementById('linacHeadDialog').addEventListener('click', (e) => {
	if ((e.target as HTMLElement).id === 'linacHeadDialog') closeLinacHeadLab();
});
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && document.getElementById('linacHeadDialog').classList.contains('show'))
		closeLinacHeadLab();
});
lhUpdateText();
lhDraw();
document.getElementById('ambientBtn').onclick = toggleAmbience;
document.getElementById('eqClose').onclick = closeEquipmentPanel;
document.getElementById('clinicalFocusDetails').onclick = () =>
	CLINICAL_FOCUS.primary && showEquipmentPanel(CLINICAL_FOCUS.primary);
document.getElementById('kioskClose').onclick = closeKioskDialog;
document.getElementById('kioskTreatment').onclick = () => startJourneyFromKiosk('treatment');
document.getElementById('kioskNewPatient').onclick = () => startJourneyFromKiosk('newpatient');
document.getElementById('kioskExplore').onclick = () => {
	closeKioskDialog();
	setMode('walk');
};
document.getElementById('kioskDialog').addEventListener('click', (e) => {
	if ((e.target as HTMLElement).id === 'kioskDialog') closeKioskDialog();
});
document
	.querySelectorAll<HTMLElement>('#journeyModes button')
	.forEach((b) => (b.onclick = () => setJourneyKind(b.dataset.journey)));
document.getElementById('journeyStart').onclick = startTreatmentJourney;
document.getElementById('journeyNext').onclick = advanceTreatmentJourney;
document.getElementById('journeyReset').onclick = () => resetTreatmentJourney(false);

bindPanelToggle('roomRail', 'roomRailToggle', '▸', '◂');
bindPanelToggle('infoPanel', 'infoPanelToggle', '◂', '▸');

labelRenderer.domElement.addEventListener('click', () => {
	if (S.mode === 'walk') requestWalkPointerLock();
});
canvas.addEventListener('mousedown', (e) => {
	if (S.mode === 'walk' && e.button === 0) {
		S.walkDragLook = true;
		S.walkLastX = e.clientX;
		S.walkLastY = e.clientY;
		requestWalkPointerLock();
	}
});
canvas.addEventListener('click', (e) => {
	if (S.mode === 'walk') {
		requestWalkPointerLock();
		return;
	}
	if (S.mode !== 'overview' || S.travel) return;
	const rect = canvas.getBoundingClientRect();
	mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
	mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(roomFloors, false)[0];
	if (hit) {
		const r = roomById(hit.object.userData.roomId);
		if (r) beginTravel(r);
	}
});
document.addEventListener('pointerlockchange', () => {
	player.locked = document.pointerLockElement === canvas;
	S.walkDragLook = false;
});
document.addEventListener('mousemove', (e) => {
	if (S.mode !== 'walk') return;
	if (player.locked) {
		applyWalkMouseDelta(e.movementX, e.movementY);
		return;
	}
	if (S.walkDragLook) {
		const dx = e.clientX - S.walkLastX,
			dy = e.clientY - S.walkLastY;
		S.walkLastX = e.clientX;
		S.walkLastY = e.clientY;
		applyWalkMouseDelta(dx, dy);
	}
});
document.addEventListener('mouseup', () => (S.walkDragLook = false));
window.addEventListener('blur', () => (S.walkDragLook = false));
document.addEventListener('keydown', (e) => {
	const k = e.key.toLowerCase();
	keys[k] = true;
	if (k === 'e' && !e.repeat) performInteraction();
});
document.addEventListener('keyup', (e) => {
	keys[e.key.toLowerCase()] = false;
});

function animate(now) {
	requestAnimationFrame(animate);
	if (document.hidden) return;
	const dt = Math.min(0.05, clock.getDelta()),
		sec = now * 0.001,
		f = ((animate as unknown as { _f?: number })._f =
			((animate as unknown as { _f?: number })._f || 0) + 1);
	updateDoors(dt);
	updateWalk(dt);
	updateTravel(now);
	updateMovers(sec);
	updateDutyAnimations(sec);
	updateHandoffTransitions(sec);
	updateWorkflowTransitions(sec);
	updateCtCouchMotion(sec);
	updateJourneyCameraFollow();
	if (f % 2 === 0) updateNpcExchanges(sec);
	updateAmbulance(dt, sec);
	updateStatusBeacons(sec);
	if (f % 3 === 0) updateClinicalEquipment(sec);
	updateAmbience();
	if (f % 3 === 1) updateInteractionUI();
	updateNpcLabels();
	updateJourneyRoomTiming(now);
	updateWallClocks(now);
	updatePerfFloor(dt);
	if (
		!JOURNEY.cameraFollow &&
		(S.mode === 'overview' || (S.mode === 'guided' && S.activeRoom && !S.travel))
	)
		orbit.update();
	renderOperatorLiveFeeds(now);
	renderer.render(scene, camera);
	labelRenderer.render(scene, camera);
}
renderRoomList();
updateFacilityInfo();
journeyActors();
setJourneyKind('treatment', true);
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
procRenderSite();
procRefreshRelease();
ceilings.forEach((c) => (c.visible = false));
requestAnimationFrame(animate);
setTimeout(() => document.getElementById('loader').classList.add('hide'), 900);
setTimeout(() => document.getElementById('studentHelp')?.classList.add('show'), 1150);
