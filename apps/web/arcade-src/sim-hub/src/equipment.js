/* RTApps (#77 sim-hub modularization, task 7): clinical layer, status beacons, the ambulance
   drop-off choreography, operator/CT live-feed CCTV consoles, wall clocks, Phase-4 workflow
   status displays, the LINAC-head/engineering wall stations, and Phase-5 wayfinding signage.
   Verbatim extractions from main.js. A handful of symbols stay owned by main.js because other
   still-resident systems (the journey/patient state machine — task 9 — and the walk-mode
   interaction registry) read or write them too: `JOURNEY`/`ROOM_WORKFLOW`/`MIA_SIM_SETUP`/
   `currentJourneyMeta`/`journeyNextLabel`/`updateJourneyUI`/`roomElapsedLabel`/
   `workflowTransitions`/`journeySpeech` (journey narrative state consumed by `workflowState`
   and `updateWorkflowTransitions`), `player` (walk-mode position read by
   `updateClinicalEquipment`), `roomById`/`registerInteractable`/`PRIMARY_PATIENTS`/`doors`/
   `setDoorTarget` (already exported from main.js per earlier tasks), and
   `openLinacHeadLab`/`lhPreviewTexture`/`LINAC_HEAD_LAB` (the future LINAC-head-lab dialog
   module, still resident in main.js, referenced by `buildLinacHeadWallStation`), and
   `showEquipmentPanel` (the still-resident equipment detail dialog, opened by
   `buildClinicalEquipmentLayer`'s interaction callback). Conversely
   `CT_COUCH`/`ROOM_CLOCKS` (mutated by ./props.js furnishing) and
   `EQUIPMENT_BY_ID`/`EQUIPMENT_BY_ROOM`/`EQUIPMENT_EXPLORED`/`EQUIPMENT_SPECS`/
   `CLINICAL_FOCUS`/`setClinicalFocus`/`clearClinicalFocus`/`equipmentRoomName`/
   `flashCtScanner`/`pulseCtObject`/`workflowState` (read by main.js's still-resident
   equipment panel, CT QA console, and journey sequence) are exported here and imported back
   into main.js. */
import * as THREE from 'three';
import { S } from './state.js';
import {
	box,
	std,
	makeDirectionalSign,
	workflowDisplayTexture,
	engineeringLinacOverviewTexture,
	engineeringShieldingTexture
} from './helpers.js';
import { scene, camera, orbit, renderer } from './scene.js';
import { wallClock, consoleKeyboard, orientationKiosk, customTextureWallMonitor } from './props.js';
import { personFigure, faceAlong, poseCharacter } from './npc.js';
import { advanceRoute, advancePed, walkSwing } from './npc-behavior.js';
import {
	roomById,
	registerInteractable,
	PRIMARY_PATIENTS,
	JOURNEY,
	doors,
	setDoorTarget,
	player,
	ROOM_WORKFLOW,
	currentJourneyMeta,
	MIA_SIM_SETUP,
	journeyNextLabel,
	updateJourneyUI,
	roomElapsedLabel,
	workflowTransitions,
	journeySpeech,
	openLinacHeadLab,
	lhPreviewTexture,
	LINAC_HEAD_LAB,
	showEquipmentPanel
} from './main.js';

const PHASE4_DISPLAYS = {};
function paintWorkflowDisplay(d, status = 'READY', rows = [], accent = '#42d5cf') {
	d.status = status;
	d.rows = rows;
	const x = d.ctx,
		c = d.canvas;
	x.fillStyle = '#07141a';
	x.fillRect(0, 0, c.width, c.height);
	x.fillStyle = accent;
	x.fillRect(0, 0, c.width, 30);
	x.fillStyle = '#eaf6f8';
	x.font = '900 54px Arial';
	x.fillText(d.title, 42, 92);
	x.fillStyle = accent;
	x.font = '900 44px Arial';
	x.fillText(status, 42, 150);
	let y = 215;
	rows.forEach((r, i) => {
		x.fillStyle = i % 2 ? 'rgba(255,255,255,.025)' : 'rgba(66,213,207,.055)';
		x.fillRect(34, y - 32, c.width - 68, 58);
		x.fillStyle = '#87aab6';
		x.font = '700 25px Arial';
		x.fillText(r[0], 54, y);
		x.fillStyle = '#f5fbfc';
		x.font = '800 27px Arial';
		x.fillText(r[1], 390, y);
		y += 72;
	});
	d.texture.needsUpdate = true;
}
function createWorkflowDisplay(key, x, y, z, rot, title, w = 2.7, h = 1.5) {
	const g = new THREE.Group();
	scene.add(g);
	const d = workflowDisplayTexture(title);
	PHASE4_DISPLAYS[key] = d;
	const frame = box(w + 0.18, h + 0.18, 0.1, std(0x202d34, 0.58, 0.28), x, y, z);
	frame.rotation.y = rot;
	g.add(frame);
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({ map: d.texture, side: THREE.DoubleSide })
	);
	screen.position.set(x + Math.sin(rot) * 0.058, y, z + Math.cos(rot) * 0.058);
	screen.rotation.y = rot;
	g.add(screen);
	paintWorkflowDisplay(d, 'READY', []);
	return d;
}
function updateWorkflowDisplay(key, status, rows = [], accent = '#42d5cf') {
	const d = PHASE4_DISPLAYS[key];
	if (d) paintWorkflowDisplay(d, status, rows, accent);
}
export const ROOM_CLOCKS = [];
export function updateWallClocks(now = performance.now()) {
	if (now - (updateWallClocks._last || 0) < 250) return;
	updateWallClocks._last = now;
	/* RTApps perf pass 2: 4Hz is indistinguishable for clock hands */ const d = new Date(),
		h = d.getHours() % 12,
		m = d.getMinutes(),
		s = d.getSeconds(),
		patient = typeof JOURNEY !== 'undefined' && JOURNEY.active ? currentJourneyMeta().patient : '';
	for (const c of ROOM_CLOCKS) {
		c.hourPivot.rotation.z = (-(h + m / 60) * Math.PI) / 6;
		c.minutePivot.rotation.z = (-m * Math.PI) / 30;
		c.secondPivot.rotation.z = (-s * Math.PI) / 30;
		const tm = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
			elapsed = roomElapsedLabel(c.roomId, now),
			key = tm + '|' + elapsed + '|' + patient;
		if (key === c.lastKey) continue;
		c.lastKey = key;
		const x = c.ctx;
		x.clearRect(0, 0, 600, 150);
		x.fillStyle = 'rgba(8,20,26,.95)';
		x.fillRect(0, 0, 600, 150);
		x.strokeStyle = '#6fa9b7';
		x.lineWidth = 4;
		x.strokeRect(3, 3, 594, 144);
		x.textAlign = 'center';
		x.fillStyle = '#ffffff';
		x.font = '900 58px Arial';
		x.fillText(tm, 300, 62);
		x.fillStyle = elapsed ? '#65dda0' : '#9ccbd0';
		x.font = '800 28px Arial';
		x.fillText(elapsed ? `${patient} · ${elapsed}` : 'Department clock', 300, 112);
		c.texture.needsUpdate = true;
	}
}
export const CT_COUCH = {
	table: null,
	ring: null,
	bore: null,
	baseX: 0,
	patient: null,
	patientBaseX: 0,
	phase: 'idle',
	start: 0,
	inDist: 3.15
};
export function buildLinacHeadWallStation(g, room) {
	const frame = box(
		6.1,
		3.4,
		0.16,
		std(0x1d2b32, 0.58, 0.22),
		room.x,
		2.05,
		room.z - room.d / 2 + 0.15
	);
	g.add(frame);
	const tx = lhPreviewTexture();
	LINAC_HEAD_LAB.previewTexture = tx;
	const scr = new THREE.Mesh(
		new THREE.PlaneGeometry(5.75, 3.05),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	scr.position.set(room.x, 2.05, room.z - room.d / 2 + 0.245);
	g.add(scr);
	registerInteractable(
		scr,
		'Interactive LINAC Treatment Head Schematic',
		'Open the photon/electron treatment-head beam-path teaching station.',
		4.2,
		null,
		() => openLinacHeadLab()
	);
	const shelf = box(
		6.3,
		0.08,
		0.28,
		std(0x657781, 0.5, 0.24),
		room.x,
		0.18,
		room.z - room.d / 2 + 0.36
	);
	g.add(shelf);
}
export function buildEngineeringWallSchematics(g, room) {
	customTextureWallMonitor(
		g,
		room.x - room.w / 2 + 0.16,
		2.03,
		room.z + 1.35,
		Math.PI / 2,
		2.85,
		1.66,
		engineeringLinacOverviewTexture(),
		'LINAC System Overview',
		'Broad schematic showing the major LINAC subsystems beyond the treatment head.'
	);
	customTextureWallMonitor(
		g,
		room.x + room.w / 2 - 0.16,
		2.03,
		room.z + 1.35,
		-Math.PI / 2,
		2.85,
		1.66,
		engineeringShieldingTexture(),
		'Vault Shielding Concepts',
		'Educational shielding schematic contrasting controlled and non-controlled area barrier concepts.'
	);
}
export function addJourneyWallClocks() {
	const addClock = (id, x, y, z, rot = 0) => {
		const g = new THREE.Group();
		g.userData.roomId = id;
		scene.add(g);
		wallClock(g, x, y, z, rot);
	};
	addClock('lobby', 8.2, 2.85, -9.82, 0);
	addClock('consult', -21.5, 2.65, -11.82, 0);
	addClock('social', -33.5, 2.65, -11.82, 0);
	addClock('education', -45.5, 2.65, -11.82, 0);
	addClock('patientcare', -33.8, 2.75, 13.82, Math.PI);
	addClock('physics', 11.82, 2.65, -20.7, -Math.PI / 2);
	addClock('dosimetry', 15.82, 2.75, -54.7, -Math.PI / 2);
	addClock('manager', 23.6, 2.65, 12.32, Math.PI);
}
export function buildPhase4WorkflowDisplays() {
	createWorkflowDisplay('lobbyQueue', 5.0, 2.25, -9.82, 0, 'PATIENT QUEUE', 3.1, 1.55);
	createWorkflowDisplay(
		'controlQueue',
		57.86,
		2.22,
		9.0,
		-Math.PI / 2,
		'TREATMENT CONTROL',
		2.8,
		1.5
	);
	createWorkflowDisplay('vault1State', 90.78, 2.32, -8.2, -Math.PI / 2, 'VAULT 1 STATUS', 2.7, 1.5);
	createWorkflowDisplay('consultState', -18, 2.25, -11.82, 0, 'CONSULT STATUS', 2.65, 1.38);
	createWorkflowDisplay('educationState', -42, 2.25, -11.82, 0, 'PATIENT EDUCATION', 2.65, 1.38);
	createWorkflowDisplay('ctSimState', 44, 2.35, -18.82, 0, 'CT SIMULATION', 2.85, 1.45);
	createWorkflowDisplay(
		'ctControlState',
		35.82,
		2.22,
		-11.2,
		-Math.PI / 2,
		'CT CONTROL',
		2.55,
		1.38
	);
	createWorkflowDisplay(
		'dosimetryState',
		15.82,
		2.32,
		-49,
		-Math.PI / 2,
		'TREATMENT PLANNING',
		2.75,
		1.42
	);
	createWorkflowDisplay(
		'physicsPlanState',
		11.82,
		2.25,
		-18,
		-Math.PI / 2,
		'PHYSICS PLAN QA',
		2.55,
		1.38
	);
}

const OPERATOR_CONSOLE = { built: false, feeds: [], screens: [] };
function createOperatorMonitor(
	g,
	x,
	y,
	z,
	rot,
	w,
	h,
	map,
	title = 'Operator Monitor',
	desc = 'Active control-room display.'
) {
	const frame = box(w + 0.14, h + 0.14, 0.08, std(0x202a31, 0.58, 0.22), x, y, z);
	frame.rotation.y = rot;
	g.add(frame);
	const bezel = box(w + 0.04, h + 0.04, 0.06, std(0x0d1418, 0.5, 0.12), x, y, z + 0.001);
	bezel.rotation.y = rot;
	g.add(bezel);
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide })
	);
	screen.position.set(x + Math.sin(rot) * 0.046, y, z + Math.cos(rot) * 0.046);
	screen.rotation.y = rot;
	g.add(screen);
	const stem = box(0.06, 0.18, 0.06, std(0x6c7a82, 0.45, 0.25), x, y - h / 2 - 0.15, z);
	stem.rotation.y = rot;
	g.add(stem);
	registerInteractable(frame, title, desc, 2.8);
	OPERATOR_CONSOLE.screens.push(screen);
	return screen;
}

function operatorLabel(g, x, y, z, rot, text, sub = 'LIVE') {
	const c = document.createElement('canvas');
	c.width = 720;
	c.height = 180;
	const q = c.getContext('2d');
	q.fillStyle = '#101a20';
	q.fillRect(0, 0, 720, 180);
	q.fillStyle = '#dce9ed';
	q.font = '900 42px Arial';
	q.fillText(text, 24, 72);
	q.fillStyle = sub === 'LIVE' ? '#6cf2c1' : '#84bfda';
	q.font = '900 28px Arial';
	q.fillText(sub, 24, 124);
	q.fillStyle = sub === 'LIVE' ? '#42d5cf' : '#75b8ff';
	q.beginPath();
	q.arc(650, 90, 18, 0, Math.PI * 2);
	q.fill();
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(0.82, 0.21),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	m.position.set(x + Math.sin(rot) * 0.052, y, z + Math.cos(rot) * 0.052);
	m.rotation.y = rot;
	g.add(m);
	return m;
}
function createOperatorFeed(name, pos, target, fov = 42) {
	const rt = new THREE.WebGLRenderTarget(960, 540);
	rt.texture.colorSpace = THREE.SRGBColorSpace;
	const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 260);
	cam.position.copy(pos);
	cam.lookAt(target);
	cam.updateProjectionMatrix();
	OPERATOR_CONSOLE.feeds.push({ name, camera: cam, renderTarget: rt, baseTarget: target.clone() });
	return rt.texture;
}
export function buildOperatorLiveConsole() {
	if (OPERATOR_CONSOLE.built || !PHASE4_DISPLAYS.vault1State) return;
	const r = roomById('linaccontrol');
	if (!r) return;
	const g = new THREE.Group();
	scene.add(g);
	const rot = Math.PI / 2;
	createOperatorMonitor(
		g,
		r.x - 2.05,
		2.16,
		r.z,
		rot,
		1.02,
		0.58,
		PHASE4_DISPLAYS.vault1State.texture,
		'Vault monitor mirror',
		'Mirrors the in-room patient-info and treatment-status monitor inside Vault 1.'
	);
	operatorLabel(g, r.x - 2.05, 2.55, r.z, rot, 'VAULT STATUS', 'MIRROR');
	const tA = createOperatorFeed(
		'Oblique right',
		new THREE.Vector3(88.7, 2.6, -13.1),
		new THREE.Vector3(79.55, 1.55, -18.05),
		40
	);
	const tB = createOperatorFeed(
		'Oblique left',
		new THREE.Vector3(88.7, 2.6, -22.9),
		new THREE.Vector3(79.55, 1.55, -18.05),
		40
	);
	const tC = createOperatorFeed(
		'Overhead',
		new THREE.Vector3(79.6, 5.4, -24.8),
		new THREE.Vector3(79.55, 1.5, -18.05),
		36
	);
	const tD = createOperatorFeed(
		'Wide room',
		new THREE.Vector3(89.8, 3.2, -18.0),
		new THREE.Vector3(79.55, 1.55, -18.05),
		38
	);
	const tE = createOperatorFeed(
		'Table close-up',
		new THREE.Vector3(83.6, 2.2, -11.9),
		new THREE.Vector3(79.55, 1.55, -18.05),
		34
	);
	createOperatorMonitor(
		g,
		r.x - 1.02,
		2.16,
		r.z,
		rot,
		1.02,
		0.58,
		tA,
		'Vault CCTV camera A',
		'Live oblique CCTV view of the patient on the treatment couch.'
	);
	operatorLabel(g, r.x - 1.02, 2.55, r.z, rot, 'CAM A');
	createOperatorMonitor(
		g,
		r.x - 2.05,
		1.42,
		r.z,
		rot,
		1.02,
		0.58,
		tB,
		'Vault CCTV camera B',
		'Live cross-table CCTV view of the active patient.'
	);
	operatorLabel(g, r.x - 2.05, 1.81, r.z, rot, 'CAM B');
	createOperatorMonitor(
		g,
		r.x - 1.02,
		1.42,
		r.z,
		rot,
		1.02,
		0.58,
		tC,
		'Vault CCTV camera C',
		'Live overhead CCTV view of the treatment couch and setup.'
	);
	operatorLabel(g, r.x - 1.02, 1.81, r.z, rot, 'OVERHEAD');
	createOperatorMonitor(
		g,
		r.x + 4.48,
		2.2,
		r.z + 2.0,
		rot,
		1.68,
		0.95,
		tD,
		'Vault CCTV wide view',
		'Wide-angle live vault view for monitoring patient position and room status.'
	);
	operatorLabel(g, r.x + 4.48, 2.82, r.z + 2.0, rot, 'VAULT WIDE');
	createOperatorMonitor(
		g,
		r.x + 4.48,
		2.2,
		r.z - 2.0,
		rot,
		1.68,
		0.95,
		tE,
		'Vault CCTV close-up',
		'Closer live view of the active patient on the couch for therapist observation.'
	);
	operatorLabel(g, r.x + 4.48, 2.82, r.z - 2.0, rot, 'PATIENT VIEW');
	consoleKeyboard(g, r.x - 0.25, r.z + 1.15, rot);
	consoleKeyboard(g, r.x - 0.25, r.z - 1.15, rot);
	OPERATOR_CONSOLE.built = true;
}

const CT_OPERATOR_CONSOLE = { built: false, feeds: [], screens: [], lastRender: 0 };
function createCtFeed(name, pos, target, fov = 40) {
	const rt = new THREE.WebGLRenderTarget(800, 450);
	rt.texture.colorSpace = THREE.SRGBColorSpace;
	const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 220);
	cam.position.copy(pos);
	cam.lookAt(target);
	cam.updateProjectionMatrix();
	CT_OPERATOR_CONSOLE.feeds.push({ name, camera: cam, renderTarget: rt });
	return rt.texture;
}
export function buildCtLiveConsole() {
	if (CT_OPERATOR_CONSOLE.built || !PHASE4_DISPLAYS.ctSimState) return;
	const r = roomById('ctcontrol');
	if (!r) return;
	const g = new THREE.Group();
	scene.add(g);
	const rot = Math.PI / 2;
	createOperatorMonitor(
		g,
		r.x - 2.05,
		2.08,
		r.z,
		rot,
		1.0,
		0.56,
		PHASE4_DISPLAYS.ctSimState.texture,
		'CT simulation status mirror',
		'Mirrors the CT Simulation room workflow/status display.'
	);
	operatorLabel(g, r.x - 2.05, 2.46, r.z, rot, 'CT SIM STATUS', 'MIRROR');
	const tA = createCtFeed(
		'CT Patient Side',
		new THREE.Vector3(36.0, 2.15, -9.0),
		new THREE.Vector3(40.0, 1.45, -9.5),
		38
	);
	const tB = createCtFeed(
		'CT Gantry',
		new THREE.Vector3(42.0, 3.0, -3.5),
		new THREE.Vector3(44.0, 1.4, -9.5),
		42
	);
	const tC = createCtFeed(
		'CT Table Wide',
		new THREE.Vector3(50.2, 2.8, -5.3),
		new THREE.Vector3(41.2, 1.35, -9.5),
		38
	);
	createOperatorMonitor(
		g,
		r.x - 1.0,
		2.08,
		r.z,
		rot,
		1.0,
		0.56,
		tA,
		'CT patient view',
		'Live CT-room view centered on Mia during simulation.'
	);
	operatorLabel(g, r.x - 1.0, 2.46, r.z, rot, 'PATIENT VIEW');
	createOperatorMonitor(
		g,
		r.x - 2.05,
		1.38,
		r.z,
		rot,
		1.0,
		0.56,
		tB,
		'CT gantry view',
		'Live view of the CT couch entering and exiting the gantry.'
	);
	operatorLabel(g, r.x - 2.05, 1.76, r.z, rot, 'GANTRY VIEW');
	createOperatorMonitor(
		g,
		r.x - 1.0,
		1.38,
		r.z,
		rot,
		1.0,
		0.56,
		tC,
		'CT room wide view',
		'Wide live view of the simulation tabletop and gantry.'
	);
	operatorLabel(g, r.x - 1.0, 1.76, r.z, rot, 'ROOM WIDE');
	consoleKeyboard(g, r.x - 0.15, r.z + 0.65, rot);
	CT_OPERATOR_CONSOLE.built = true;
}
function ctPatientTarget() {
	let p = null;
	if (
		typeof JOURNEY !== 'undefined' &&
		JOURNEY &&
		JOURNEY.ctSimPatient &&
		JOURNEY.ctSimPatient.visible
	)
		p = JOURNEY.ctSimPatient;
	else if (PRIMARY_PATIENTS.ctsim && PRIMARY_PATIENTS.ctsim.visible) p = PRIMARY_PATIENTS.ctsim;
	if (!p) return new THREE.Vector3(40.0, 1.45, -9.5);
	const v = new THREE.Vector3();
	p.getWorldPosition(v);
	v.y = Math.max(1.35, v.y + 1.3);
	return v;
}
function activeVaultPatientTarget() {
	const fallback = new THREE.Vector3(77.75, 1.55, -18.05);
	let patient = null;
	if (typeof JOURNEY !== 'undefined' && JOURNEY) {
		if (
			JOURNEY.kind === 'newpatient' &&
			JOURNEY.miaTreatmentPatient &&
			JOURNEY.miaTreatmentPatient.visible
		)
			patient = JOURNEY.miaTreatmentPatient;
		else if (JOURNEY.couchPatient && JOURNEY.couchPatient.visible) patient = JOURNEY.couchPatient;
		else if (JOURNEY.miaTreatmentPatient && JOURNEY.miaTreatmentPatient.visible !== false)
			patient = JOURNEY.miaTreatmentPatient;
	}
	if (!patient && PRIMARY_PATIENTS.vault1) patient = PRIMARY_PATIENTS.vault1;
	if (!patient) return fallback;
	const p = new THREE.Vector3();
	patient.getWorldPosition(p);
	p.y = Math.max(1.45, p.y + 1.5);
	return p;
}
export function renderOperatorLiveFeeds(nowMs = performance.now()) {
	const linacNeeded =
		OPERATOR_CONSOLE.built &&
		(S.activeRoom?.id === 'linaccontrol' ||
			S.activeRoom?.id === 'vault1' ||
			(typeof JOURNEY !== 'undefined' &&
				JOURNEY.active &&
				[
					'treatment',
					'firstimaging',
					'firsttreatment',
					'firstcomplete',
					'setup',
					'imaging',
					'returning'
				].some((s) => String(JOURNEY.stage).includes(s))));
	if (linacNeeded && nowMs - (OPERATOR_CONSOLE.lastRender || 0) > 110) {
		OPERATOR_CONSOLE.lastRender = nowMs;
		const t = activeVaultPatientTarget();
		for (const feed of OPERATOR_CONSOLE.feeds) {
			feed.camera.lookAt(t);
			feed.camera.updateMatrixWorld();
			renderer.setRenderTarget(feed.renderTarget);
			renderer.render(scene, feed.camera);
		}
	}
	const ctNeeded =
		CT_OPERATOR_CONSOLE.built &&
		(S.activeRoom?.id === 'ctcontrol' ||
			S.activeRoom?.id === 'ctsim' ||
			(typeof JOURNEY !== 'undefined' &&
				JOURNEY.active &&
				['ctsetup', 'ctscan', 'ctdone'].includes(JOURNEY.stage)));
	if (ctNeeded && nowMs - CT_OPERATOR_CONSOLE.lastRender > 125) {
		CT_OPERATOR_CONSOLE.lastRender = nowMs;
		const t = ctPatientTarget();
		for (const feed of CT_OPERATOR_CONSOLE.feeds) {
			feed.camera.lookAt(t);
			feed.camera.updateMatrixWorld();
			renderer.setRenderTarget(feed.renderTarget);
			renderer.render(scene, feed.camera);
		}
	}
	renderer.setRenderTarget(null);
}

/* ---- Ambulance drop-off choreography: pull up, unload, dwell, load, depart ---- */
const ambState = { phase: 'approach', route: { i: 0, d: 0 }, wait: 0 };
const AMB_FWD = -Math.PI / 2;
const AMB_IN = [
	[-42, 20],
	[-14, 20],
	[-3.4, 20],
	[-2.6, 16],
	[-2.2, 13.2]
];
const AMB_OUT = [
	[-2.2, 13.2],
	[-2.9, 16.6],
	[-8, 20],
	[-30, 20],
	[-54, 20]
];
const AMB_REAR = { x: -4.2, z: 13.6 },
	AMB_ENTRY = { x: 0.4, z: 7.8 };
function ambPatient() {
	const q = personFigure(0xcfd6da, 0xb9c1c6, 0xe9c39d);
	q.visible = false;
	scene.add(q);
	return q;
}
export function setupAmbulance(a) {
	S.AMB = a;
	S.ambUnload = ambPatient();
	S.ambLoad = ambPatient();
	ambState.phase = 'approach';
	ambState.route = { i: 0, d: 0 };
	ambState.wait = 0;
}
export function updateAmbulance(dt, sec) {
	if (!S.AMB) return;
	const A = ambState;
	if (A.phase === 'approach') {
		if (advanceRoute(S.AMB, AMB_IN, A.route, 7.5, dt, AMB_FWD)) {
			faceAlong(S.AMB, 0, -1, AMB_FWD);
			A.phase = 'unload';
			A.route = { i: 0, d: 0 };
			S.ambUnload.visible = true;
			S.ambUnload.position.set(AMB_REAR.x, 0, AMB_REAR.z);
		}
	} else if (A.phase === 'unload') {
		walkSwing(S.ambUnload, sec);
		if (advancePed(S.ambUnload, AMB_REAR, AMB_ENTRY, A.route, 1.5, dt)) {
			S.ambUnload.visible = false;
			A.phase = 'dwell';
			A.wait = 0;
		}
	} else if (A.phase === 'dwell') {
		A.wait += dt;
		if (A.wait > 3.4) {
			A.phase = 'load';
			A.route = { i: 0, d: 0 };
			S.ambLoad.visible = true;
			S.ambLoad.position.set(AMB_ENTRY.x, 0, AMB_ENTRY.z);
		}
	} else if (A.phase === 'load') {
		walkSwing(S.ambLoad, sec);
		if (advancePed(S.ambLoad, AMB_ENTRY, AMB_REAR, A.route, 1.4, dt)) {
			S.ambLoad.visible = false;
			A.phase = 'depart';
			A.route = { i: 0, d: 0 };
		}
	} else if (A.phase === 'depart') {
		if (advanceRoute(S.AMB, AMB_OUT, A.route, 8.6, dt, AMB_FWD)) {
			A.phase = 'gap';
			A.wait = 0;
		}
	} else if (A.phase === 'gap') {
		A.wait += dt;
		if (A.wait > 4.5) {
			S.AMB.position.set(-42, 0, 20);
			faceAlong(S.AMB, 1, 0, AMB_FWD);
			A.phase = 'approach';
			A.route = { i: 0, d: 0 };
		}
	}
}

export function workflowState(roomId, state, detail, color = '#42d5cf') {
	ROOM_WORKFLOW[roomId] = { state, detail, color };
	setStatusBeacon(roomId, state);
	syncClinicalFocus(roomId, state, detail);
	const patient = currentJourneyMeta().patient,
		next = JOURNEY.active ? journeyNextLabel() : 'Routine arrivals';
	const miaFirstTx =
		JOURNEY.kind === 'newpatient' &&
		[
			'firstreturn',
			'firstcheckin',
			'firstwaiting',
			'firstpickup',
			'firstsetup',
			'firstimaging',
			'firsttreatment',
			'firstcomplete',
			'firstdeparture'
		].includes(JOURNEY.stage);
	if (roomId === 'lobby')
		updateWorkflowDisplay(
			'lobbyQueue',
			state,
			[
				[patient, detail],
				['Front Desk', 'Patient Access active'],
				['Next action', next]
			],
			color
		);
	if (roomId === 'linaccontrol') {
		const rows = miaFirstTx
			? [
					[patient, detail],
					['Plan / Physics', 'Approved · QA passed'],
					['Treatment', 'Fraction 1 · imaging required']
				]
			: [
					['Vault 1', ROOM_WORKFLOW.vault1?.state || 'AVAILABLE'],
					[patient, detail],
					[
						'Therapists',
						state === 'MONITORING'
							? 'Monitoring beam delivery'
							: state === 'PATIENT READY'
								? 'Patient alert received'
								: 'Available'
					]
				];
		updateWorkflowDisplay('controlQueue', state, rows, color);
	}
	if (roomId === 'vault1') {
		const rows = miaFirstTx
			? [
					[patient, detail],
					['Simulation setup', `${MIA_SIM_SETUP.position} · indexed supports`],
					['Treatment', 'Fraction 1 · CCTV/intercom active']
				]
			: [
					[patient, detail],
					['Room', detail],
					['CCTV / intercom', 'Active'],
					['Emergency OFF', 'Available']
				];
		updateWorkflowDisplay('vault1State', state, rows, color);
	}
	if (roomId === 'consult')
		updateWorkflowDisplay(
			'consultState',
			state,
			[
				[patient, detail],
				['Physician', 'Radiation oncologist'],
				['Next', 'Education / simulation pathway']
			],
			color
		);
	if (roomId === 'education')
		updateWorkflowDisplay(
			'educationState',
			state,
			[
				[patient, detail],
				['Navigator', 'Education / scheduling'],
				['Next', 'CT Simulation']
			],
			color
		);
	if (roomId === 'ctsim')
		updateWorkflowDisplay(
			'ctSimState',
			state,
			[
				[patient, detail],
				['Immobilization', state === 'SETUP' ? 'In progress' : 'Indexed / documented'],
				['Planning images', state === 'SCANNING' ? 'Acquiring' : 'Ready']
			],
			color
		);
	if (roomId === 'ctcontrol')
		updateWorkflowDisplay(
			'ctControlState',
			state,
			[
				[patient, detail],
				['Scanner', state === 'SCANNING' ? 'Acquiring images' : 'Ready'],
				['Intercom / observation', 'Active']
			],
			color
		);
	if (roomId === 'dosimetry')
		updateWorkflowDisplay(
			'dosimetryState',
			state,
			[
				[patient, detail],
				['Planning workstation', state.includes('PLAN') ? 'Optimization / calculation' : 'Ready'],
				['Next', 'Physics technical review']
			],
			color
		);
	if (roomId === 'physics')
		updateWorkflowDisplay(
			'physicsPlanState',
			state,
			[
				[patient, detail],
				['Plan QA', state.includes('QA') ? 'Verification in progress' : 'Ready'],
				['Next', 'Release to LINAC Control']
			],
			color
		);
	updateJourneyUI();
}

export function resetCtCouchMotion() {
	if (CT_COUCH.table) CT_COUCH.table.position.x = CT_COUCH.baseX;
	if (CT_COUCH.patient && Number.isFinite(CT_COUCH.patientBaseX))
		CT_COUCH.patient.position.x = CT_COUCH.patientBaseX;
	CT_COUCH.patient = null;
	CT_COUCH.phase = 'idle';
	CT_COUCH.start = 0;
}
export function startCtCouchScan() {
	const patient = JOURNEY.ctSimPatient;
	if (!CT_COUCH.table || !patient) return;
	CT_COUCH.patient = patient;
	CT_COUCH.patientBaseX = patient.position.x;
	CT_COUCH.phase = 'in';
	CT_COUCH.start = performance.now() / 1000;
	workflowState(
		'ctsim',
		'SCANNING',
		'CT couch moving Mia into gantry for planning acquisition',
		'#ffb454'
	);
}
export function updateCtCouchMotion(sec) {
	if (CT_COUCH.phase === 'idle' || !CT_COUCH.table || !CT_COUCH.patient) return;
	const ease = (t) => t * t * (3 - 2 * t);
	let offset = 0;
	if (CT_COUCH.phase === 'in') {
		const u = Math.min(1, (sec - CT_COUCH.start) / 6.5);
		offset = CT_COUCH.inDist * ease(u);
		if (u >= 1) {
			CT_COUCH.phase = 'dwell';
			CT_COUCH.start = sec;
		}
	} else if (CT_COUCH.phase === 'dwell') {
		offset = CT_COUCH.inDist;
		if (sec - CT_COUCH.start >= 4) {
			CT_COUCH.phase = 'out';
			CT_COUCH.start = sec;
		}
	} else if (CT_COUCH.phase === 'out') {
		const u = Math.min(1, (sec - CT_COUCH.start) / 6.5);
		offset = CT_COUCH.inDist * (1 - ease(u));
		if (u >= 1) {
			CT_COUCH.phase = 'idle';
			offset = 0;
			workflowState('ctsim', 'SCAN COMPLETE', 'CT couch returned to setup position', '#65dda0');
		}
	}
	CT_COUCH.table.position.x = CT_COUCH.baseX + offset;
	CT_COUCH.patient.position.x = CT_COUCH.patientBaseX + offset;
	if (JOURNEY.stage === 'ctscan' && S.activeRoom?.id === 'ctcontrol') {
		const wp = new THREE.Vector3();
		CT_COUCH.patient.getWorldPosition(wp);
		camera.lookAt(wp.clone().setY(1.25));
		orbit.target.copy(wp.clone().setY(1.25));
	}
}

export function updateWorkflowTransitions(sec) {
	for (let i = workflowTransitions.length - 1; i >= 0; i--) {
		const t = workflowTransitions[i],
			u = Math.max(0, Math.min(1, (sec - t.start) / t.duration)),
			e = u * u * (3 - 2 * u),
			p = t.curve.getPoint(e),
			n = t.curve.getPoint(Math.min(1, e + 0.006));
		t.actor.position.copy(p);
		t.actor.rotation.y = Math.atan2(n.x - p.x, n.z - p.z);
		const sw = Math.sin(sec * 7.1) * 0.42;
		t.actor.traverse((o) => {
			const r = o.userData?.walkRig;
			if (r) {
				r.armLP.rotation.x = sw;
				r.armRP.rotation.x = -sw;
				r.legLP.rotation.x = -sw * 0.86;
				r.legRP.rotation.x = sw * 0.86;
			}
		});
		for (const c of t.cues || []) {
			if (!c.fired && u >= c.at) {
				c.fired = true;
				if (c.fn) c.fn();
				if (c.text) journeySpeech(c.actor || t.actor, c.text, c.kind || 'staff', c.ms || 10000);
			}
		}
		if (u >= 1) {
			t.actor.userData.inHandoff = false;
			poseCharacter(t.actor, 'neutral');
			if (t.fromId && doors.has(t.fromId) && t.fromId !== t.toId)
				setTimeout(() => setDoorTarget(t.fromId, false), 400);
			if (t.toId && doors.has(t.toId)) setTimeout(() => setDoorTarget(t.toId, false), 1500);
			workflowTransitions.splice(i, 1);
			if (t.onComplete) t.onComplete();
		}
	}
}

const STATUS_BEACONS = {};
function statusColorForState(state = 'READY') {
	const s = String(state).toUpperCase();
	if (s.includes('BEAM') || s === 'TREATMENT' || s === 'MONITORING') return 0xff5e66;
	if (s.includes('SCAN') || s.includes('IMAGING')) return 0x63b7ff;
	if (
		s.includes('SETUP') ||
		s.includes('ARRIVAL') ||
		s.includes('WAIT') ||
		s.includes('CALL') ||
		s.includes('TRANSIT') ||
		s.includes('INSTRUCTIONS')
	)
		return 0xffbd68;
	if (
		s.includes('COMPLETE') ||
		s.includes('AVAILABLE') ||
		s.includes('READY') ||
		s.includes('OPEN')
	)
		return 0x65dda0;
	return 0x42d5cf;
}
function makeStatusBeacon(roomId, x, y, z, rot = 0) {
	const g = new THREE.Group();
	scene.add(g);
	const shell = box(0.58, 0.24, 0.13, std(0x26353c, 0.52, 0.18), x, y, z);
	shell.rotation.y = rot;
	g.add(shell);
	const mat = std(0x65dda0, 0.18, 0.02, { emissive: 0x65dda0, emissiveIntensity: 1.8 });
	const lamp = box(0.38, 0.1, 0.035, mat, x, y, z);
	lamp.rotation.y = rot;
	lamp.position.x += Math.sin(rot) * 0.075;
	lamp.position.z += Math.cos(rot) * 0.075;
	g.add(lamp);
	STATUS_BEACONS[roomId] = { lamp, mat, state: 'READY' };
	return g;
}
function setStatusBeacon(roomId, state) {
	const b = STATUS_BEACONS[roomId];
	if (!b) return;
	b.state = String(state || 'READY');
	const c = statusColorForState(b.state);
	b.mat.color.setHex(c);
	b.mat.emissive.setHex(c);
}
export function updateStatusBeacons(sec) {
	for (const b of Object.values(STATUS_BEACONS)) {
		const s = b.state.toUpperCase(),
			active = s.includes('BEAM') || s.includes('SCAN') || s.includes('IMAGING');
		b.mat.emissiveIntensity = active ? 1.8 + 0.75 * (0.5 + 0.5 * Math.sin(sec * 4.6)) : 1.55;
	}
}

export function buildPhase5Wayfinding() {
	makeDirectionalSign(
		'CT SIMULATION  ↓',
		'CT Simulator · CT Control',
		27.8,
		2.82,
		-2.8,
		Math.PI / 2,
		3.4
	);
	makeDirectionalSign(
		'TREATMENT AREA  →',
		'LINAC Control · Vaults · HDR',
		46.5,
		2.82,
		2.75,
		-Math.PI / 2,
		3.7
	);
	makeDirectionalSign(
		'VAULT 1  ↓   ·   VAULT 2  ↑',
		'Shielded treatment rooms',
		63.2,
		2.88,
		0,
		-Math.PI / 2,
		4.0
	);
	makeDirectionalSign(
		'EXIT / RECEPTION  →',
		'Main entrance · Patient pickup',
		-8.7,
		2.78,
		7.7,
		0,
		3.4
	);
	orientationKiosk();
	const placements = {
		consult: [-17.0, 3.12, -2.12, 0],
		education: [-41.0, 3.12, -2.12, 0],
		ctsim: [44.0, 3.2, -2.88, 0],
		ctcontrol: [31.5, 3.1, -3.88, 0],
		dosimetry: [15.72, 3.12, -49, -Math.PI / 2],
		physics: [11.72, 3.12, -18, -Math.PI / 2],
		linaccontrol: [51.0, 3.12, 4.12, 0],
		vault1: [66.72, 3.55, -18, -Math.PI / 2],
		vault2: [66.72, 3.55, 18, -Math.PI / 2],
		hdr: [61.1, 3.15, 24.1, 0]
	};
	for (const [id, v] of Object.entries(placements)) makeStatusBeacon(id, ...v);
}

export const EQUIPMENT_BY_ID = {},
	EQUIPMENT_BY_ROOM = {},
	EQUIPMENT_EXPLORED = new Set();
export const CLINICAL_FOCUS = { ids: new Set(), note: '', primary: null };
export const EQUIPMENT_SPECS = [
	{
		id: 'consult_exam',
		roomId: 'consult',
		dx: 0,
		dz: 1,
		y: 1.0,
		label: 'Consultation Exam Table',
		purpose:
			'A clinical examination surface used during assessment and consultation when a physical examination or positioning review is needed.',
		users: 'Radiation oncologist, nurse, and other members of the clinical team.',
		notice: 'The consultation room combines discussion space with clinical assessment capability.',
		safety:
			'The patient should be assisted according to mobility needs and local fall-prevention practices.'
	},
	{
		id: 'ct_scanner',
		roomId: 'ctsim',
		dx: 0,
		dz: 1.5,
		y: 1.4,
		label: 'CT Simulator Gantry',
		purpose:
			'Acquires the planning CT dataset that establishes patient anatomy and treatment geometry for treatment planning.',
		users:
			'CT simulation radiation therapists; images are subsequently used by the radiation oncologist, dosimetry, and medical physics teams.',
		notice:
			'Large bore, flat treatment-style tabletop, room lasers, and a setup designed to reproduce the future treatment position.',
		safety:
			'This is a planning imaging system. Patient communication and observation continue throughout acquisition.'
	},
	{
		id: 'ct_table',
		roomId: 'ctsim',
		dx: -3.9,
		dz: 1.5,
		y: 1.0,
		label: 'CT Simulation Tabletop',
		purpose:
			'Provides a flat, indexable surface so the position created at simulation can be reproduced on the treatment machine.',
		users: 'Radiation therapists position the patient and index accessories to the tabletop.',
		notice:
			'Look for the flat carbon-style surface and the relationship between the tabletop, patient supports, and scanner bore.',
		safety:
			'Comfort and reproducibility must be established before scanning; patients should report pain or an unsustainable position before acquisition.'
	},
	{
		id: 'ct_immobilization',
		roomId: 'ctsim',
		dx: 6.05,
		dz: -0.15,
		y: 1.1,
		label: 'CT Immobilization Storage',
		purpose:
			'Stores site-specific positioning and immobilization devices used to make simulation and treatment positions reproducible.',
		users:
			'Radiation therapists select and index devices appropriate to the treatment site and patient needs.',
		notice:
			'Masks, vacuum cushions, knee/foot supports, and other accessories are organized for repeatable setup.',
		safety:
			'Devices support reproducibility but should not create avoidable pressure, pain, breathing restriction, or unsafe positioning.'
	},
	{
		id: 'ct_lasers',
		roomId: 'ctsim',
		dx: 0,
		dz: 1.5,
		y: 2.7,
		label: 'CT Room Lasers',
		purpose:
			'Provide visible reference planes that help establish and document patient alignment during simulation.',
		users: 'Radiation therapists use room lasers with indexing and reference marks during setup.',
		notice:
			'Laser planes intersect the simulation space and provide a geometric reference for alignment.',
		safety:
			'Lasers are alignment aids; they do not replace image verification or documented setup instructions.'
	},
	{
		id: 'ct_console',
		roomId: 'ctcontrol',
		dx: -1.2,
		dz: -0.2,
		y: 1.35,
		label: 'CT Simulation Control Console',
		purpose:
			'Allows therapists to select the scan protocol, monitor the patient, communicate by intercom, and acquire the planning images.',
		users: 'CT simulation radiation therapists.',
		notice:
			'The console is paired with observation glass, patient communication, and acquisition displays.',
		safety:
			'The therapist confirms patient readiness and scan parameters before acquisition and maintains observation during the scan.'
	},
	{
		id: 'linac_console',
		roomId: 'linaccontrol',
		dx: -1.0,
		dz: 0,
		y: 1.35,
		label: 'LINAC Treatment Control Console',
		purpose:
			'The protected workstation where therapists verify the treatment record, review imaging, monitor the patient, and control treatment delivery.',
		users:
			'Radiation therapists; other authorized team members may participate according to local workflow.',
		notice:
			'Multiple monitors support treatment-record review, image guidance, machine status, and patient observation.',
		safety:
			'Beam delivery occurs only after required identity, setup, imaging, and machine-safety checks are complete.'
	},
	{
		id: 'linac_gantry',
		roomId: 'vault1',
		dx: 1.2,
		dz: 0,
		y: 1.55,
		label: 'Medical Linear Accelerator Gantry',
		purpose:
			'Supports the treatment head and rotates around the patient to deliver the planned external-beam radiation geometry.',
		users:
			'Radiation therapists operate the machine according to the approved treatment plan; physics maintains and verifies machine performance.',
		notice:
			'The gantry, treatment head, imaging equipment, and couch share a common treatment isocenter.',
		safety:
			'The treatment team clears the room and verifies the protected-door/interlock state before radiation delivery.'
	},
	{
		id: 'linac_couch',
		roomId: 'vault1',
		dx: -1.8,
		dz: 0,
		y: 1.05,
		label: 'LINAC Treatment Couch',
		purpose:
			'Supports and positions the patient at treatment isocenter using reproducible indexing and setup instructions.',
		users:
			'Radiation therapists position the patient and apply approved couch corrections after verification imaging.',
		notice:
			'The narrow carbon tabletop minimizes beam attenuation while supporting indexed immobilization.',
		safety:
			'Patient position, accessory indexing, clearance, and couch corrections are verified before treatment.'
	},
	{
		id: 'linac_imaging',
		roomId: 'vault1',
		dx: 1.25,
		dz: 1.62,
		y: 1.25,
		label: 'On-board Imaging System',
		purpose:
			'Acquires verification images used to compare daily patient anatomy and setup with the treatment reference.',
		users:
			'Radiation therapists perform image guidance; physician or physics review may be required depending on the procedure and local policy.',
		notice:
			'Imaging panels and source components extend from the treatment machine around the patient.',
		safety:
			'Image guidance verifies treatment geometry; corrections are applied according to the approved clinical workflow.'
	},
	{
		id: 'vault_immobilization',
		roomId: 'vault1',
		dx: 7.6,
		dz: 12.05,
		y: 1.1,
		label: 'Vault Immobilization Storage',
		purpose:
			'Keeps treatment-positioning accessories available near the treatment machine for reproducible daily setup.',
		users: 'Radiation therapists.',
		notice:
			'Treatment-room accessories correspond to the setup created and documented during simulation.',
		safety:
			'The correct device and index position must match the patient-specific setup instructions.'
	},
	{
		id: 'vault_cctv',
		roomId: 'vault1',
		dx: 11.45,
		dz: 5.0,
		y: 2.8,
		label: 'Treatment-room CCTV / Intercom',
		purpose:
			'Allows continuous visual observation and two-way communication while therapists are outside the shielded vault during beam delivery.',
		users: 'Radiation therapists monitoring the treatment from the control area.',
		notice: 'Multiple camera views reduce blind spots and support continuous patient observation.',
		safety:
			'The patient remains observable and able to communicate with the treatment team throughout beam delivery.'
	},
	{
		id: 'engineering_head_station',
		roomId: 'engineering',
		dx: 0,
		dz: -4.72,
		y: 2.05,
		label: 'Interactive LINAC Treatment Head Schematic',
		purpose:
			'Interactive wall teaching station that traces the treatment-head beam path and compares photon and conventional electron operating modes.',
		users:
			'Students, radiation therapists, medical physicists, and LINAC engineering/service personnel.',
		notice:
			'Explore the bending magnet, target or target bypass, primary collimator, carousel modifier, monitor chamber, jaws, MLC, and electron applicator context.',
		safety:
			'Educational schematic only. Component architecture and service procedures are manufacturer-specific and should never be inferred from this simulation.'
	},
	{
		id: 'qa_water',
		roomId: 'qa',
		dx: 0,
		dz: 0.7,
		y: 1.0,
		label: 'Water Phantom',
		purpose:
			'Provides a water-equivalent measurement environment for radiation-beam quality assurance and dosimetric measurements.',
		users: 'Medical physicists and qualified QA personnel.',
		notice:
			'The detector is positioned within a controlled water volume to characterize beam behavior.',
		safety:
			'QA measurements verify equipment performance before clinical use; this orientation does not simulate machine operation.'
	},
	{
		id: 'physics_planqa',
		roomId: 'physics',
		dx: -2.3,
		dz: -2.2,
		y: 1.35,
		label: 'Physics Plan-QA Workstation',
		purpose:
			'Used for the technical review of an approved treatment plan, including prescription/plan consistency, dose calculation, machine parameters and required QA documentation.',
		users: 'Medical physicists.',
		notice:
			'Physics review is a separate technical safety check before the plan is released for treatment.',
		safety:
			'The plan is not released to treatment delivery until required physics checks are complete.'
	},
	{
		id: 'dosimetry_ws',
		roomId: 'dosimetry',
		dx: 0,
		dz: -2.0,
		y: 1.35,
		label: 'Treatment Planning Workstation',
		purpose:
			'Used to create and evaluate treatment plans based on the physician prescription and simulation imaging.',
		users:
			'Medical dosimetrists, radiation oncologists, and medical physicists according to their respective responsibilities.',
		notice:
			'Planning workstations support contours, beam geometry, dose calculation, DVHs, and plan review.',
		safety: 'Clinical plans require appropriate review and approval before treatment delivery.'
	},
	{
		id: 'hdr_afterloader',
		roomId: 'hdr',
		dx: 2.2,
		dz: -0.7,
		y: 0.9,
		label: 'HDR Remote Afterloader',
		purpose:
			'Houses the shielded HDR source and remotely drives it through approved applicators during temporary brachytherapy treatment.',
		users:
			'Authorized brachytherapy team members including radiation oncology, medical physics, nursing, and trained treatment staff.',
		notice:
			'The source remains shielded inside the afterloader except during controlled treatment delivery.',
		safety:
			'Source transfer, room access, emergency procedures, and patient monitoring follow strict brachytherapy safety protocols.'
	}
];
export function buildClinicalEquipmentLayer() {
	for (const spec of EQUIPMENT_SPECS) {
		const r = roomById(spec.roomId);
		if (!r) continue;
		const x = r.x + spec.dx,
			z = r.z + spec.dz;
		const anchor = new THREE.Object3D();
		anchor.position.set(x, spec.y || 1.0, z);
		scene.add(anchor);
		const mat = new THREE.MeshBasicMaterial({
			color: 0x42d5cf,
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.028, 10, 36), mat);
		ring.rotation.x = Math.PI / 2;
		ring.position.set(x, 0.075, z);
		scene.add(ring);
		const item = { ...spec, anchor, ring, mat };
		EQUIPMENT_BY_ID[spec.id] = item;
		(EQUIPMENT_BY_ROOM[spec.roomId] || (EQUIPMENT_BY_ROOM[spec.roomId] = [])).push(item);
		registerInteractable(
			anchor,
			spec.label,
			`${spec.purpose} Press E for clinical orientation details.`,
			3.0,
			null,
			() => showEquipmentPanel(spec.id)
		);
	}
}
export function equipmentRoomName(item) {
	return roomById(item.roomId)?.name || 'Radiation Oncology Center';
}
export function clearClinicalFocus() {
	CLINICAL_FOCUS.ids.clear();
	CLINICAL_FOCUS.primary = null;
	CLINICAL_FOCUS.note = '';
	document.getElementById('clinicalFocusHUD')?.classList.remove('show');
}
export function setClinicalFocus(ids, note = '') {
	CLINICAL_FOCUS.ids = new Set((ids || []).filter((id) => EQUIPMENT_BY_ID[id]));
	CLINICAL_FOCUS.primary = [...CLINICAL_FOCUS.ids][0] || null;
	CLINICAL_FOCUS.note = note || '';
	const hud = document.getElementById('clinicalFocusHUD');
	if (!hud) return;
	if (!JOURNEY.active || !CLINICAL_FOCUS.ids.size) {
		hud.classList.remove('show');
		return;
	}
	const labels = [...CLINICAL_FOCUS.ids].map((id) => EQUIPMENT_BY_ID[id].label);
	document.getElementById('clinicalFocusTitle').textContent = labels.join(' + ');
	document.getElementById('clinicalFocusNote').textContent = note;
	hud.classList.add('show');
}
function syncClinicalFocus(roomId, state, detail = '') {
	if (typeof JOURNEY === 'undefined' || !JOURNEY.active) {
		clearClinicalFocus();
		return;
	}
	const s = String(state || '').toUpperCase();
	let ids = [];
	let note = detail;
	if (roomId === 'consult' && (s.includes('CONSULT') || s.includes('READY')))
		ids = ['consult_exam'];
	if (roomId === 'ctsim') {
		if (s.includes('PRE-POSITION')) ids = ['ct_table', 'ct_immobilization'];
		else if (s === 'SETUP' || s.includes('PATIENT ARRIVAL'))
			ids = ['ct_table', 'ct_immobilization', 'ct_lasers'];
		else if (s.includes('SCAN')) ids = ['ct_scanner', 'ct_table', 'ct_lasers'];
		else if (s.includes('INSTRUCTIONS')) ids = ['ct_table'];
	}
	if (roomId === 'ctcontrol' && (s.includes('SCAN') || s.includes('TRANSFER')))
		ids = ['ct_console', 'ct_scanner'];
	if (roomId === 'dosimetry') ids = ['dosimetry_ws'];
	if (roomId === 'physics' && (s.includes('QA') || s.includes('PLAN'))) ids = ['physics_planqa'];
	if (roomId === 'linaccontrol') {
		if (s.includes('PATIENT READY') || s.includes('CALL')) ids = ['linac_console'];
		if (s.includes('MONITOR') || s.includes('COMPLETE')) ids = ['linac_console', 'vault_cctv'];
	}
	if (roomId === 'vault1') {
		if (s.includes('SETUP') || s.includes('ARRIV')) ids = ['linac_couch', 'vault_immobilization'];
		else if (s.includes('IMAGING')) ids = ['linac_imaging', 'linac_couch'];
		else if (s.includes('READY TO TREAT')) ids = ['linac_gantry', 'linac_couch', 'vault_cctv'];
		else if (s.includes('TREATMENT') || s.includes('BEAM'))
			ids = ['linac_gantry', 'vault_cctv', 'linac_console'];
		else if (s.includes('TURNOVER')) ids = [];
	}
	if (ids.length) setClinicalFocus(ids, note);
	else if (['education', 'lobby'].includes(roomId) && !s.includes('CALL')) clearClinicalFocus();
}
export function updateClinicalEquipment(sec) {
	const p = player.pos;
	for (const item of Object.values(EQUIPMENT_BY_ID)) {
		const active = CLINICAL_FOCUS.ids.has(item.id),
			dx = p.x - item.anchor.position.x,
			dz = p.z - item.anchor.position.z,
			near = S.mode === 'walk' && Math.hypot(dx, dz) < 4.1;
		const target = active ? 0.76 : near ? 0.22 : 0;
		item.mat.opacity += (target - item.mat.opacity) * 0.35;
		const pulse = active ? 1 + 0.1 * Math.sin(sec * 4.2) : 1;
		item.ring.scale.setScalar(pulse);
		item.ring.visible = item.mat.opacity > 0.012;
	}
}

export function flashCtScanner(ms = 700) {
	const objs = [CT_COUCH.ring, CT_COUCH.bore].filter(Boolean);
	if (!objs.length) return;
	const prior = objs.map((o) => ({
		o,
		emissive: o.material?.emissive?.clone?.() || null,
		intensity: Number(o.material?.emissiveIntensity) || 0,
		scale: o.scale.clone()
	}));
	objs.forEach((o) => {
		if (o.material?.emissive) {
			o.material.emissive.setHex(0x36d8d0);
			o.material.emissiveIntensity = 1.15;
		}
		o.scale.multiplyScalar(1.025);
	});
	setTimeout(() => {
		prior.forEach((p) => {
			if (p.emissive && p.o.material?.emissive) p.o.material.emissive.copy(p.emissive);
			if (p.o.material) p.o.material.emissiveIntensity = p.intensity;
			p.o.scale.copy(p.scale);
		});
	}, ms);
}

export function pulseCtObject(selector, ms = 900) {
	const el = document.querySelector(selector);
	if (!el) return;
	el.style.transition = 'transform .35s ease, box-shadow .35s ease, filter .35s ease';
	const prev = el.style.cssText;
	el.style.transform = 'scale(1.04)';
	el.style.boxShadow = '0 0 0 4px rgba(87,219,214,.18), 0 0 18px rgba(87,219,214,.48)';
	el.style.filter = 'brightness(1.14)';
	setTimeout(() => {
		try {
			el.style.cssText = prev;
		} catch (e) {}
	}, ms);
}
