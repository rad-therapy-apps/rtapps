// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import * as THREE from 'three-linac';
import { OrbitControls } from 'three-linac/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three-linac/addons/geometries/RoundedBoxGeometry.js';
import { S } from './state.js';
import {
	viewerContainer,
	loadingScreen,
	asmAccessoryButton,
	asmBeamButton,
	asmElectronButton,
	asmStandButton,
	beamOnButton,
	beamStageNextButton,
	beamStagePrevButton,
	detectorToggleButton,
	internalOverlay,
	internalStageCounter,
	internalStageDesc,
	internalStageTitle,
	internalViewButton,
	kvToggleButton,
	lasersToggleButton,
	odiToggleButton,
	roomLightsToggleButton
} from './dom.js';
import { setupCCTVFeeds } from './cctv.js';
import { animate, setTextById, syncOperatorConsole, wrap360 } from './main.js';
import { allTreatmentFieldsCompleted, fundamentalState, setPendantLCD } from './linac-safety.js';
import {
	createImmobilizationShelf3D,
	createImmobilizationPatientGroup,
	treatmentParamMatches,
	canonicalCouchDisplay,
	getIGRTExpectedAbsoluteCouch,
	getCurrentPlannedParameters,
	deliveryCasePlan,
	fmtSignedInt,
	normalizeAngleValue,
	parseJawSpec,
	getODIMeasurement,
	activeSpecialSetupSpec,
	specialSetupVerified,
	immobilizationRequired,
	immobilizationSpec,
	immobilizationVerified,
	motionRequired,
	srsRequired,
	renderTreatmentDeliveryPanel
} from './linac-delivery.js';
import { renderClinicalIGRT } from './linac-igrt.js';

const roomCeilingFixtureMats = [];
export const controlRoomAccentMats = [];
const controlRoomMonitorGroups = [];

export const ISOCENTER_Y_TARGET = 1.5;
export const GANTRY_PLANE_Z_TARGET = -1.0;
const COUCH_SEPARATION_OFFSET = 2.8;
export const GROUND_Y = -0.05;
const ACCORDION_GEOMETRIC_HEIGHT = 1.0;
const WORLD_ISOCENTER = new THREE.Vector3(0, ISOCENTER_Y_TARGET, GANTRY_PLANE_Z_TARGET);
// --- New geometry anchors (gantry-local frame; origin = isocenter) ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
const HEAD_CENTER_LOCAL = new THREE.Vector3(0, 1.1, 0); // treatment-head group placement
const JAW_PLANE_HEADLOCAL = -0.52; // head-local Y of the collimator exit plane
const EPID_Z = 0.0; // beam-axis plane (gantry-local z)

const MAX_JAW_OFFSET = 0.25;
const MIN_JAW_OFFSET = 0.03;
const EPID_RETRACT_Y = -0.5; // parked below the circular gantry section
const EPID_RETRACT_Z = -0.9; // near the original stowed position, away from the beam axis

// ---- Shared Varian-style palette (clean white shells, taupe/grey trim) ----
const MAT = {
	shell: new THREE.MeshStandardMaterial({ color: 0xf4f5f7, metalness: 0.05, roughness: 0.42 }), // main white plastic
	shellSoft: new THREE.MeshStandardMaterial({ color: 0xe9ebee, metalness: 0.05, roughness: 0.5 }),
	trim: new THREE.MeshStandardMaterial({ color: 0xb7b3aa, metalness: 0.15, roughness: 0.55 }), // taupe accent band
	trimDark: new THREE.MeshStandardMaterial({ color: 0x8f8c85, metalness: 0.2, roughness: 0.55 }),
	base: new THREE.MeshStandardMaterial({ color: 0x9a9d9f, metalness: 0.2, roughness: 0.6 }), // floor pedestal
	steel: new THREE.MeshStandardMaterial({ color: 0xb6bcc2, metalness: 0.85, roughness: 0.3 }),
	steelDark: new THREE.MeshStandardMaterial({ color: 0x707880, metalness: 0.8, roughness: 0.35 }),
	copper: new THREE.MeshStandardMaterial({ color: 0xbc7a4b, metalness: 0.8, roughness: 0.35 }),
	magnet: new THREE.MeshStandardMaterial({ color: 0x4c565f, metalness: 0.7, roughness: 0.4 }),
	target: new THREE.MeshStandardMaterial({ color: 0xcaa04a, metalness: 0.85, roughness: 0.3 }),
	glassDark: new THREE.MeshStandardMaterial({ color: 0x1c2124, metalness: 0.3, roughness: 0.25 }), // monitor / carbon top
	beamGlow: new THREE.MeshStandardMaterial({
		color: 0xffcf87,
		emissive: 0xffb347,
		emissiveIntensity: 0.9,
		roughness: 0.5
	})
};
// earnedMaterial keys still referenced by jaws/imaging code:
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
const earnedMaterial = {
	collimatorJaws: new THREE.MeshStandardMaterial({
		color: 0xf0a020,
		metalness: 0.6,
		roughness: 0.4
	}),
	imagingPanel: new THREE.MeshStandardMaterial({ color: 0xdfe3e7, metalness: 0.2, roughness: 0.5 })
};
const silhouetteMaterial = new THREE.MeshStandardMaterial({
	color: 0x9fb2c4,
	transparent: true,
	opacity: 0.22,
	depthWrite: false
});

//--------------------------------------------------
// ADDITIONAL MATERIALS (detailed internals)
//--------------------------------------------------
const steelMaterial = new THREE.MeshStandardMaterial({
	color: 0xb7bcc2,
	metalness: 0.85,
	roughness: 0.3
});
const aluminumMaterial = new THREE.MeshStandardMaterial({
	color: 0xd8d8d8,
	metalness: 0.7,
	roughness: 0.35
});
const copperMaterial = new THREE.MeshStandardMaterial({
	color: 0xc87f42,
	metalness: 0.95,
	roughness: 0.25
});
const brassMaterial = new THREE.MeshStandardMaterial({
	color: 0xb89a2f,
	metalness: 0.9,
	roughness: 0.3
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
const pipeMaterial = new THREE.MeshStandardMaterial({
	color: 0x4fa8ff,
	transparent: true,
	opacity: 0.65
});
const rfMaterial = new THREE.MeshStandardMaterial({
	color: 0x4488ff,
	emissive: 0x112255,
	metalness: 0.75,
	roughness: 0.25
});
const ceramicMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.55 });
const carbonMaterial = new THREE.MeshStandardMaterial({
	color: 0x2b2b2b,
	metalness: 0.15,
	roughness: 0.9
});

// Rounded box helper (per supplied snippets)
function roundedBox(w, h, d, r, mat) {
	const geo = new THREE.BoxGeometry(w, h, d);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
const couchMaterial = MAT.shell; // couch shell = white
const couchTopMaterial = new THREE.MeshStandardMaterial({
	color: 0x17191b,
	metalness: 0.25,
	roughness: 0.35
}); // carbon-fibre top
const couchAccordionMaterial = new THREE.MeshStandardMaterial({
	color: 0xd7d9dc,
	metalness: 0.1,
	roughness: 0.6
});

export const linacPartsData = [
	{
		id: 'drivestand',
		name: 'Drivestand',
		level: 1,
		cost: 0,
		quiz: {
			question:
				'The Drivestand typically supports the rotating gantry and houses which key component for microwave generation/amplification?',
			options: ['Electron Gun', 'Klystron or Magnetron', 'Treatment Couch', 'Target Assembly'],
			correctAnswerIndex: 1
		},
		position: [0, 0, -2.5],
		rotation: [0, 0, 0],
		group: 'static',
		sil: { type: 'box', size: [1.7, 2.5, 1.0], offset: [0, 1.3, 0] }
	},
	{
		id: 'modulatorCabinet',
		name: 'Modulator Cabinet',
		level: 2,
		cost: 25,
		quiz: {
			question: 'What is the primary purpose of the Modulator cabinet in a LINAC system?',
			options: [
				'To cool the accelerator',
				'To provide precisely timed high-voltage pulses to the electron gun and microwave source',
				'To house the beam shaping devices',
				'To control couch movements'
			],
			correctAnswerIndex: 1
		},
		position: [-3.5, 0, -2.9],
		rotation: [0, 0, 0],
		group: 'static',
		sil: { type: 'box', size: [0.8, 1.4, 0.7], offset: [0, 0.7, 0] }
	},
	{
		id: 'klystron',
		name: 'Klystron',
		level: 3,
		cost: 50,
		quiz: {
			question: 'A Klystron is a specialized vacuum tube that performs what function in a LINAC?',
			options: [
				'Generates electrons',
				'Amplifies microwaves to high power',
				'Shapes the X-ray beam',
				'Bends the electron beam'
			],
			correctAnswerIndex: 1
		},
		position: [0.0, 0.65, -2.4],
		rotation: [0, 0, 0],
		group: 'static',
		sil: { type: 'cylinder', size: [0.15, 0.15, 0.8, 20], rot: [Math.PI / 2, 0, 0] }
	},
	{
		id: 'connectingArm',
		name: 'Connecting Arm (to Gantry)',
		level: 4,
		cost: 30,
		quiz: {
			question:
				'What is the structural role of the connecting arm between the drivestand and the rotating gantry assembly?',
			options: [
				'To carry cooling water',
				'To provide a stable pivot point and conduit for services',
				'To generate the primary electron beam',
				'To house the X-ray target'
			],
			correctAnswerIndex: 1
		},
		position: [0, 1.5, -1.85],
		rotation: [0, 0, 0],
		group: 'static',
		sil: { type: 'cylinder', size: [0.6, 0.6, 0.34, 32], rot: [Math.PI / 2, 0, 0] }
	},
	{
		id: 'verticalArm',
		name: 'Vertical Gantry Arm',
		level: 5,
		cost: 40,
		quiz: {
			question: 'The large vertical arm of the gantry supports which major components?',
			options: [
				'Only the klystron',
				'The accelerator housing and treatment head',
				'The patient couch',
				'The control console'
			],
			correctAnswerIndex: 1
		},
		position: [0, 0, 0],
		rotation: [0, 0, 0],
		group: 'gantry',
		sil: { type: 'box', size: [1.25, 2.4, 0.6], offset: [0, 0.1, -1.4] }
	},
	{
		id: 'acceleratorHousing',
		name: 'Accelerator Housing',
		level: 6,
		cost: 60,
		quiz: {
			question:
				'The accelerator housing encloses the electron gun and what other critical component?',
			options: [
				'The X-ray target',
				'The main part of the accelerating waveguide',
				'The bending magnet',
				'The klystron'
			],
			correctAnswerIndex: 1
		},
		position: [0, 0, 0],
		rotation: [0, 0, 0],
		group: 'gantry',
		sil: { type: 'box', size: [0.6, 0.6, 1.5], offset: [0, 1.02, -0.7] }
	},
	{
		id: 'electronGun',
		name: 'Electron Gun',
		level: 7,
		cost: 50,
		quiz: {
			question: 'The electron gun is the source of electrons. Where is it typically located?',
			options: [
				'In the treatment head',
				'At the beginning of the accelerator waveguide, within the housing',
				'In the klystron',
				'On the patient couch'
			],
			correctAnswerIndex: 1
		},
		position: [0, 1.05, -1.3],
		rotation: [Math.PI / 2, 0, 0],
		group: 'gantry',
		sil: { type: 'cylinder', size: [0.11, 0.09, 0.32, 16] }
	},
	{
		id: 'waveguide',
		name: 'Accelerator Waveguide',
		level: 8,
		cost: 75,
		quiz: {
			question: 'What is the function of the accelerating waveguide?',
			options: [
				'To bend the electron beam',
				'To use microwave energy to accelerate electrons',
				'To produce X-rays',
				'To collimate the beam'
			],
			correctAnswerIndex: 1
		},
		position: [0, 1.05, -0.7],
		rotation: [Math.PI / 2, 0, 0],
		group: 'gantry',
		sil: { type: 'cylinder', size: [0.09, 0.09, 1.0, 16] }
	},
	{
		id: 'bendingMagnet',
		name: 'Bending Magnet',
		level: 9,
		cost: 60,
		quiz: {
			question: 'What is the role of the bending magnet in the LINAC gantry?',
			options: [
				'To generate microwaves',
				'To steer the accelerated electrons towards the target',
				'To shape the final treatment beam',
				'To cool the accelerator structure'
			],
			correctAnswerIndex: 1
		},
		position: [0, 1.2, -0.05],
		rotation: [0, 0, 0],
		group: 'gantry',
		sil: { type: 'box', size: [0.3, 0.36, 0.28] }
	},
	{
		id: 'treatmentHead',
		name: 'Treatment Head',
		level: 10,
		cost: 100,
		quiz: {
			question:
				'The treatment head contains the target, flattening filter (for photons), scattering foils (for electrons), and what other crucial beam-shaping component?',
			options: ['Klystron', 'Electron Gun', 'Multileaf Collimator (MLC)', 'Waveguide'],
			correctAnswerIndex: 2
		},
		position: [0, 1.05, 0.0],
		rotation: [0, 0, 0],
		group: 'gantry',
		sil: { type: 'cylinder', size: [0.44, 0.44, 0.72, 24] }
	},
	{
		id: 'target',
		name: 'X-ray Target',
		isSubComponent: true,
		parentPart: 'treatmentHead',
		position: [0, 0.2, 0],
		rotation: [0, 0, 0],
		group: 'gantry',
		sil: { type: 'cylinder', size: [0.08, 0.08, 0.02, 16] }
	}
];

// Derived from linacPartsData above; kept in this module (rather than game.js, its
// original main.js home) because reading linacPartsData at module top level from a
// separate file is unsafe once that file sits in a cycle with scene.js (eval-order).
export const CORE_PART_IDS = linacPartsData.filter((p) => !p.isSubComponent).map((p) => p.id);

// ---------- Lightweight procedural vault (canvas textures, no external files) ----------
function makeFloorTexture() {
	const c = document.createElement('canvas');
	c.width = c.height = 256;
	const g = c.getContext('2d');
	g.fillStyle = '#c9ccd1';
	g.fillRect(0, 0, 256, 256);
	g.strokeStyle = '#aeb2b9';
	g.lineWidth = 3;
	for (let i = 0; i <= 256; i += 64) {
		g.beginPath();
		g.moveTo(i, 0);
		g.lineTo(i, 256);
		g.stroke();
		g.beginPath();
		g.moveTo(0, i);
		g.lineTo(256, i);
		g.stroke();
	}
	g.strokeStyle = '#d6d9dd';
	g.lineWidth = 1;
	for (let i = 32; i < 256; i += 64) {
		g.beginPath();
		g.moveTo(i, 0);
		g.lineTo(i, 256);
		g.stroke();
		g.beginPath();
		g.moveTo(0, i);
		g.lineTo(256, i);
		g.stroke();
	}
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(10, 10);
	return t;
}
function makeWallTexture() {
	const c = document.createElement('canvas');
	c.width = c.height = 256;
	const g = c.getContext('2d');
	g.fillStyle = '#e7e3da';
	g.fillRect(0, 0, 256, 256);
	for (let i = 0; i < 700; i++) {
		g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.045 + ')';
		g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
	}
	g.fillStyle = '#4a90e2';
	g.fillRect(0, 232, 256, 8); // baseboard accent
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(4, 1);
	return t;
}
function makeRadSignTexture() {
	const c = document.createElement('canvas');
	c.width = c.height = 256;
	const g = c.getContext('2d');
	g.fillStyle = '#f4c20d';
	g.fillRect(0, 0, 256, 256);
	g.translate(128, 128);
	g.fillStyle = '#1a1a1a';
	for (let k = 0; k < 3; k++) {
		g.rotate((Math.PI * 2) / 3);
		g.beginPath();
		g.moveTo(0, 0);
		g.arc(0, 0, 96, -Math.PI / 6, Math.PI / 6);
		g.closePath();
		g.fill();
	}
	g.fillStyle = '#f4c20d';
	g.beginPath();
	g.arc(0, 0, 36, 0, Math.PI * 2);
	g.fill();
	g.fillStyle = '#1a1a1a';
	g.beginPath();
	g.arc(0, 0, 22, 0, Math.PI * 2);
	g.fill();
	return new THREE.CanvasTexture(c);
}
function makeCeilingTexture() {
	const c = document.createElement('canvas');
	c.width = c.height = 256;
	const g = c.getContext('2d');
	g.fillStyle = '#eef0f2';
	g.fillRect(0, 0, 256, 256);
	g.strokeStyle = '#d3d6da';
	g.lineWidth = 4;
	for (let i = 0; i <= 256; i += 64) {
		g.beginPath();
		g.moveTo(i, 0);
		g.lineTo(i, 256);
		g.stroke();
		g.beginPath();
		g.moveTo(0, i);
		g.lineTo(256, i);
		g.stroke();
	}
	g.fillStyle = '#fbfbe6'; // recessed light fixtures
	g.fillRect(40, 40, 48, 48);
	g.fillRect(168, 168, 48, 48);
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(5, 5);
	return t;
}
function makeControlScreenTexture(label = 'CONTROL', accent = '#68d7e3') {
	const c = document.createElement('canvas');
	c.width = 640;
	c.height = 360;
	const g = c.getContext('2d');
	const grad = g.createLinearGradient(0, 0, 0, c.height);
	grad.addColorStop(0, '#0d1822');
	grad.addColorStop(1, '#091119');
	g.fillStyle = grad;
	g.fillRect(0, 0, c.width, c.height);
	g.strokeStyle = '#214357';
	g.lineWidth = 2;
	g.strokeRect(12, 12, c.width - 24, c.height - 24);
	g.fillStyle = accent;
	g.fillRect(26, 28, 8, 42);
	g.fillStyle = '#ecf4fb';
	g.font = '700 34px Segoe UI';
	g.fillText(label, 48, 58);
	g.fillStyle = '#8eb6c7';
	g.font = '600 17px Segoe UI';
	g.fillText('Closed-circuit observation · therapist control console', 48, 88);
	const boxY = [120, 185, 250];
	const titles = ['Camera feed', 'Treatment parameters', 'Safety / access'];
	boxY.forEach((y, i) => {
		g.fillStyle = 'rgba(18,37,50,.92)';
		g.fillRect(28, y, 180, 48);
		g.strokeStyle = '#2c5468';
		g.strokeRect(28, y, 180, 48);
		g.fillStyle = '#78d7e5';
		g.font = '700 15px Consolas';
		g.fillText(titles[i], 40, y + 19);
		g.fillStyle = '#d7e7f1';
		g.font = '700 18px Consolas';
		g.fillText(i === 0 ? 'Live CCTV' : i === 1 ? 'Planned / actual' : 'Door secure', 40, y + 39);
	});
	for (let i = 0; i < 4; i++) {
		const x = 236 + i * 92;
		g.fillStyle = 'rgba(15,28,38,.96)';
		g.fillRect(x, 120, 78, 178);
		g.strokeStyle = '#31566a';
		g.strokeRect(x, 120, 78, 178);
		g.fillStyle = i % 2 ? '#6de0a8' : '#6ecdea';
		g.fillRect(x + 10, 136, 58, 10);
		g.fillStyle = '#eaf4fb';
		g.font = '700 12px Consolas';
		g.fillText(['Cam A', 'Cam B', 'Cam C', 'R&V'][i], x + 12, 165);
		g.font = '700 14px Consolas';
		g.fillText(['Vault', 'Patient', 'Door', 'Ready'][i], x + 12, 192);
		g.fillStyle = '#7fa0b2';
		g.font = '600 11px Consolas';
		g.fillText('monitor', x + 12, 224);
	}
	g.fillStyle = 'rgba(214,168,85,.95)';
	g.fillRect(470, 34, 134, 42);
	g.fillStyle = '#fff8e8';
	g.font = '800 18px Segoe UI';
	g.fillText('CONTROL ROOM', 484, 60);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
function makeCameraFeedTexture(title = 'CAMERA A') {
	const c = document.createElement('canvas');
	c.width = 512;
	c.height = 320;
	const g = c.getContext('2d');
	g.fillStyle = '#0a1118';
	g.fillRect(0, 0, c.width, c.height);
	const grad = g.createLinearGradient(0, 0, c.width, c.height);
	grad.addColorStop(0, 'rgba(62,113,146,.35)');
	grad.addColorStop(1, 'rgba(13,28,38,.05)');
	g.fillStyle = grad;
	g.fillRect(0, 0, c.width, c.height);
	g.strokeStyle = 'rgba(110,180,220,.22)';
	g.lineWidth = 1;
	for (let y = 0; y < c.height; y += 8) {
		g.beginPath();
		g.moveTo(0, y);
		g.lineTo(c.width, y);
		g.stroke();
	}
	g.strokeStyle = '#274456';
	g.lineWidth = 2;
	g.strokeRect(12, 12, c.width - 24, c.height - 24);
	g.fillStyle = '#79d8e7';
	g.font = '700 18px Consolas';
	g.fillText(title, 24, 34);
	g.fillStyle = '#d8edf8';
	g.font = '600 14px Consolas';
	g.fillText('CLOSED CIRCUIT VAULT MONITOR', 24, 58);
	g.strokeStyle = '#79d8e7';
	g.lineWidth = 3;
	g.strokeRect(56, 84, 180, 118);
	g.strokeRect(276, 84, 180, 118);
	g.strokeStyle = '#f09f66';
	g.beginPath();
	g.moveTo(146, 84);
	g.lineTo(146, 202);
	g.stroke();
	g.beginPath();
	g.moveTo(366, 84);
	g.lineTo(366, 202);
	g.stroke();
	g.fillStyle = '#7fb0c7';
	g.font = '700 13px Consolas';
	g.fillText('LINAC', 118, 218);
	g.fillText('PATIENT / COUCH', 298, 218);
	g.fillStyle = '#8be4a7';
	g.fillRect(46, 246, 172, 10);
	g.fillRect(294, 246, 120, 10);
	g.fillStyle = '#dcecf7';
	g.font = '700 16px Consolas';
	g.fillText('Door closed', 48, 279);
	g.fillText('Ready', 296, 279);
	g.fillStyle = '#8aa7b6';
	g.font = '600 12px Consolas';
	g.fillText('Pan-Tilt-Zoom · Isocenter overview', 48, 298);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
function createRoom() {
	const Xw = 12,
		Zw = 12,
		ceilY = 7.5;
	const wallH = ceilY - GROUND_Y,
		midY = GROUND_Y + wallH / 2;
	const wallTex = makeWallTexture();
	wallTex.repeat.set(6, 1);
	const wallMat = new THREE.MeshStandardMaterial({
		map: wallTex,
		roughness: 0.95,
		metalness: 0.0,
		side: THREE.FrontSide
	});
	const trimMat = new THREE.MeshStandardMaterial({
		color: 0x7b8892,
		roughness: 0.78,
		metalness: 0.12
	});
	const baseMat = new THREE.MeshStandardMaterial({
		color: 0x9099a0,
		roughness: 0.78,
		metalness: 0.08
	});
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
	const darkGlassMat = new THREE.MeshStandardMaterial({
		color: 0x1d2a34,
		roughness: 0.2,
		metalness: 0.1,
		transparent: true,
		opacity: 0.82
	});
	const mkWall = (w, x, z, ry, h = wallH, y = midY) => {
		const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
		m.position.set(x, y, z);
		m.rotation.y = ry;
		m.receiveShadow = true;
		m.castShadow = false;
		S.scene.add(m);
		return m;
	};
	mkWall(Xw * 2, 0, -Zw, 0); // back wall
	mkWall(Xw * 2, 0, Zw, Math.PI); // front wall
	mkWall(Zw * 2, Xw, 0, -Math.PI / 2); // right wall

	// Left wall with a vault sliding-door opening only (no window).
	const leftX = -Xw + 0.02;
	const mkLeft = (z, w, h = wallH, y = midY) => mkWall(w, leftX, z, Math.PI / 2, h, y);
	const doorCenterZ = 5.1,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
		doorWidth = 2.6,
		doorTopY = 4.5;
	mkLeft(-8.8, 6.2);
	mkLeft(0.0, 8.4);
	mkLeft(doorCenterZ, 4.0, ceilY - doorTopY, doorTopY + (ceilY - doorTopY) / 2);
	mkLeft(doorCenterZ - 1.55, 0.8, doorTopY - GROUND_Y, GROUND_Y + (doorTopY - GROUND_Y) / 2);
	mkLeft(doorCenterZ + 1.55, 0.8, doorTopY - GROUND_Y, GROUND_Y + (doorTopY - GROUND_Y) / 2);
	mkLeft(10.1, 3.4);

	// Ceiling
	const ceil = new THREE.Mesh(
		new THREE.PlaneGeometry(Xw * 2, Zw * 2),
		new THREE.MeshStandardMaterial({
			map: makeCeilingTexture(),
			roughness: 0.9,
			side: THREE.FrontSide
		})
	);
	ceil.rotation.x = Math.PI / 2;
	ceil.position.set(0, ceilY, 0);
	ceil.receiveShadow = true;
	S.scene.add(ceil);

	// Baseboards / wall trim inside the vault.
	const baseboardSpecs = [
		[24, 0, -11.86, 0],
		[24, 0, 11.86, 0],
		[24, 11.86, 0, Math.PI / 2],
		[16.5, -11.86, -3.25, Math.PI / 2],
		[5.6, -11.86, 0.35, Math.PI / 2],
		[4.1, -11.86, 8.95, Math.PI / 2]
	];
	baseboardSpecs.forEach(([len, x, z, ry]) => {
		const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 0.08), baseMat);
		b.position.set(x, GROUND_Y + 0.11, z);
		b.rotation.y = ry;
		S.scene.add(b);
	});
	const crownSpecs = [
		[24, 0, -11.86, 0],
		[24, 0, 11.86, 0],
		[24, 11.86, 0, Math.PI / 2],
		[16.5, -11.86, -3.25, Math.PI / 2],
		[5.6, -11.86, 0.35, Math.PI / 2],
		[4.1, -11.86, 8.95, Math.PI / 2]
	];
	crownSpecs.forEach(([len, x, z, ry]) => {
		const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.06), trimMat);
		b.position.set(x, ceilY - 0.1, z);
		b.rotation.y = ry;
		S.scene.add(b);
	});

	// Overhead treatment-room luminaires.
	roomCeilingFixtureMats.length = 0;
	[
		[-4.2, -4.5],
		[0, -4.5],
		[4.2, -4.5],
		[-4.2, 2.8],
		[0, 2.8],
		[4.2, 2.8]
	].forEach(([x, z]) => {
		const mat = new THREE.MeshStandardMaterial({
			color: 0xfffdf1,
			emissive: 0xfff1b8,
			emissiveIntensity: 2.3,
			roughness: 0.28,
			metalness: 0.0,
			side: THREE.DoubleSide
		});
		const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.72), mat);
		panel.rotation.x = Math.PI / 2;
		panel.position.set(x, ceilY - 0.035, z);
		S.scene.add(panel);
		roomCeilingFixtureMats.push(mat);
	});
	const sign = new THREE.Mesh(
		new THREE.PlaneGeometry(1.7, 1.7),
		new THREE.MeshStandardMaterial({ map: makeRadSignTexture(), roughness: 0.8 })
	);
	sign.position.set(-3.5, 2.5, -Zw + 0.05);
	S.scene.add(sign);

	// Sliding vault entry door.
	const frameMat = new THREE.MeshStandardMaterial({
		color: 0x56616a,
		roughness: 0.76,
		metalness: 0.18
	});
	const doorMat = new THREE.MeshStandardMaterial({
		color: 0x8f979c,
		roughness: 0.64,
		metalness: 0.24
	});
	S.vaultDoorGroup = new THREE.Group();
	const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.68, 3.1), frameMat);
	doorFrame.position.set(-11.76, GROUND_Y + 2.34, doorCenterZ);
	S.vaultDoorGroup.add(doorFrame);
	const doorOpening = new THREE.Mesh(
		new THREE.BoxGeometry(0.32, 4.42, 2.62),
		new THREE.MeshStandardMaterial({ color: 0x0e1115, roughness: 0.96, metalness: 0.0 })
	);
	doorOpening.position.set(-11.72, GROUND_Y + 2.21, doorCenterZ);
	S.vaultDoorGroup.add(doorOpening);
	S.vaultDoorTrack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 4.2), frameMat);
	S.vaultDoorTrack.position.set(-11.58, GROUND_Y + 4.78, doorCenterZ + 0.82);
	S.vaultDoorGroup.add(S.vaultDoorTrack);
	const trackMotor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.26, 0.58), frameMat);
	trackMotor.position.set(-11.47, GROUND_Y + 4.78, doorCenterZ - 1.52);
	S.vaultDoorGroup.add(trackMotor);
	S.vaultDoorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.34, 2.42), doorMat);
	S.vaultDoorPanel.position.set(-11.6, GROUND_Y + 2.17, doorCenterZ);
	S.vaultDoorPanel.castShadow = true;
	S.vaultDoorPanel.receiveShadow = true;
	S.vaultDoorGroup.add(S.vaultDoorPanel);
	const doorInset = new THREE.Mesh(
		new THREE.BoxGeometry(0.03, 1.0, 0.72),
		new THREE.MeshStandardMaterial({ color: 0x7f878d, roughness: 0.7, metalness: 0.18 })
	);
	doorInset.position.set(0.07, 0.58, 0);
	S.vaultDoorPanel.add(doorInset);
	const pushBar = new THREE.Mesh(
		new THREE.BoxGeometry(0.06, 0.1, 1.0),
		new THREE.MeshStandardMaterial({ color: 0xc2b28d, roughness: 0.34, metalness: 0.52 })
	);
	pushBar.position.set(0.1, 0.1, 0);
	S.vaultDoorPanel.add(pushBar);
	const threshold = new THREE.Mesh(
		new THREE.BoxGeometry(0.52, 0.04, 2.68),
		new THREE.MeshStandardMaterial({ color: 0x666f77, roughness: 0.8 })
	);
	threshold.position.set(-11.58, GROUND_Y + 0.02, doorCenterZ);
	S.vaultDoorGroup.add(threshold);
	const indicatorMat = new THREE.MeshStandardMaterial({
		color: 0x8ce7a7,
		emissive: 0x72ff9d,
		emissiveIntensity: 1.5
	});
	S.vaultDoorIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 18), indicatorMat);
	S.vaultDoorIndicator.position.set(-11.5, GROUND_Y + 4.35, doorCenterZ - 1.36);
	S.vaultDoorGroup.add(S.vaultDoorIndicator);
	const indicatorBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.42), frameMat);
	indicatorBox.position.set(-11.56, GROUND_Y + 4.35, doorCenterZ - 1.36);
	S.vaultDoorGroup.add(indicatorBox);
	S.scene.add(S.vaultDoorGroup);

	// Closed-circuit wall-mounted cameras.
	const camBodyMat = new THREE.MeshStandardMaterial({
		color: 0xe7eaee,
		roughness: 0.38,
		metalness: 0.18
	});
	const camLensMat = new THREE.MeshStandardMaterial({
		color: 0x202832,
		emissive: 0x112a44,
		emissiveIntensity: 0.32,
		roughness: 0.15,
		metalness: 0.26
	});
	const makeCCTV = (pos, rot) => {
		const g = new THREE.Group();
		const mount = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), frameMat);
		g.add(mount);
		const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12), frameMat);
		arm.rotation.z = Math.PI / 2;
		arm.position.set(0.1, -0.02, 0);
		g.add(arm);
		const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.26, 16), camBodyMat);
		body.rotation.z = Math.PI / 2;
		body.position.set(0.24, -0.03, 0);
		g.add(body);
		const hood = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.15), camBodyMat);
		hood.position.set(0.29, 0.03, 0);
		g.add(hood);
		const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), camLensMat);
		lens.rotation.z = Math.PI / 2;
		lens.position.set(0.38, -0.03, 0);
		g.add(lens);
		const led = new THREE.Mesh(
			new THREE.SphereGeometry(0.012, 10, 10),
			new THREE.MeshStandardMaterial({
				color: 0xd36464,
				emissive: 0xff4f4f,
				emissiveIntensity: 1.2
			})
		);
		led.position.set(0.32, -0.07, 0.04);
		g.add(led);
		g.position.set(pos[0], pos[1], pos[2]);
		g.rotation.set(rot[0], rot[1], rot[2]);
		S.scene.add(g);
		return g;
	};
	makeCCTV([-10.9, 5.6, -10.9], [0, Math.PI / 4, 0]);
	makeCCTV([10.9, 5.4, 10.6], [0, (-3 * Math.PI) / 4, 0]);
	makeCCTV([10.9, 4.9, -6.8], [0, -Math.PI / 2 - 0.3, 0]);

	// Vault cabinetry, stool, and accessory cart.
	const cabinetMat = new THREE.MeshStandardMaterial({
		color: 0xa7b1b7,
		roughness: 0.68,
		metalness: 0.12
	});
	const topMat = new THREE.MeshStandardMaterial({
		color: 0xdfe6eb,
		roughness: 0.42,
		metalness: 0.08
	});
	const cartMat = new THREE.MeshStandardMaterial({
		color: 0x88939a,
		roughness: 0.62,
		metalness: 0.18
	});
	const cabinet = new THREE.Group();
	const cabBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.25, 2.8), cabinetMat);
	cabBase.position.set(10.6, 0.63, -8.8);
	cabinet.add(cabBase);
	const cabTop = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.06, 2.92), topMat);
	cabTop.position.set(10.6, 1.28, -8.8);
	cabinet.add(cabTop);
	[-9.5, -8.8, -8.1].forEach((z) => {
		const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.34), frameMat);
		handle.position.set(10.06, 0.8, z);
		cabinet.add(handle);
	});
	S.scene.add(cabinet);
	const stool = new THREE.Group();
	const seat = new THREE.Mesh(
		new THREE.CylinderGeometry(0.26, 0.28, 0.1, 18),
		new THREE.MeshStandardMaterial({ color: 0x40505d, roughness: 0.6 })
	);
	seat.position.set(9.3, 0.66, -7.8);
	stool.add(seat);
	const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.56, 12), frameMat);
	stem.position.set(9.3, 0.34, -7.8);
	stool.add(stem);
	const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.06, 0.05, 16), frameMat);
	foot.position.set(9.3, 0.04, -7.8);
	stool.add(foot);
	S.scene.add(stool);
	const cart = new THREE.Group();
	const cartFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 1.4), cartMat);
	cartFrame.position.set(10.65, 0.5, 5.2);
	cart.add(cartFrame);
	const cartTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 1.5), topMat);
	cartTop.position.set(10.65, 1.03, 5.2);
	cart.add(cartTop);
	const midShelf = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.04, 1.42), topMat);
	midShelf.position.set(10.65, 0.58, 5.2);
	cart.add(midShelf);
	[
		[10.37, 0.09, 4.65],
		[10.93, 0.09, 4.65],
		[10.37, 0.09, 5.75],
		[10.93, 0.09, 5.75]
	].forEach(([x, y, z]) => {
		const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), frameMat);
		wheel.rotation.z = Math.PI / 2;
		wheel.position.set(x, y, z);
		cart.add(wheel);
	});
	S.scene.add(cart);

	// Control room outside the vault.
	S.controlRoomGroup = new THREE.Group();
	const crFloor = new THREE.Mesh(
		new THREE.BoxGeometry(5.7, 0.04, 7.2),
		new THREE.MeshStandardMaterial({ color: 0xa7aaad, roughness: 0.78, metalness: 0.05 })
	);
	crFloor.position.set(-15.0, GROUND_Y + 0.02, -4.0);
	crFloor.receiveShadow = true;
	S.controlRoomGroup.add(crFloor);
	const crWallMat = wallMat;
	const crBackWall = new THREE.Mesh(new THREE.PlaneGeometry(7.2, wallH), crWallMat);
	crBackWall.position.set(-17.82, midY, -4.0);
	crBackWall.rotation.y = -Math.PI / 2;
	S.controlRoomGroup.add(crBackWall);
	const crSideBack = new THREE.Mesh(new THREE.PlaneGeometry(5.7, wallH), crWallMat);
	crSideBack.position.set(-15.0, midY, -7.58);
	crSideBack.rotation.y = 0;
	S.controlRoomGroup.add(crSideBack);
	const crSideFront = new THREE.Mesh(new THREE.PlaneGeometry(5.7, wallH), crWallMat);
	crSideFront.position.set(-15.0, midY, -0.42);
	crSideFront.rotation.y = Math.PI;
	S.controlRoomGroup.add(crSideFront);
	const crLeftWall = new THREE.Mesh(new THREE.PlaneGeometry(7.2, wallH), crWallMat);
	crLeftWall.position.set(-12.18, midY, -4.0);
	crLeftWall.rotation.y = Math.PI / 2;
	S.controlRoomGroup.add(crLeftWall);
	const crCeil = new THREE.Mesh(
		new THREE.PlaneGeometry(5.7, 7.2),
		new THREE.MeshStandardMaterial({ color: 0xd9dbde, roughness: 0.9, side: THREE.DoubleSide })
	);
	crCeil.rotation.x = Math.PI / 2;
	crCeil.position.set(-15.0, ceilY - 0.02, -4.0);
	S.controlRoomGroup.add(crCeil);
	[
		{ g: [5.68, 0.22, 0.08], p: [-15.0, GROUND_Y + 0.11, -7.54], r: [0, 0, 0] },
		{ g: [5.68, 0.22, 0.08], p: [-15.0, GROUND_Y + 0.11, -0.46], r: [0, 0, 0] },
		{ g: [7.08, 0.22, 0.08], p: [-12.22, GROUND_Y + 0.11, -4.0], r: [0, Math.PI / 2, 0] },
		{ g: [7.08, 0.22, 0.08], p: [-17.78, GROUND_Y + 0.11, -4.0], r: [0, Math.PI / 2, 0] }
	].forEach(({ g, p, r }) => {
		const b = new THREE.Mesh(new THREE.BoxGeometry(...g), baseMat);
		b.position.set(...p);
		b.rotation.set(...r);
		S.controlRoomGroup.add(b);
	});
	const crLightMat = new THREE.MeshStandardMaterial({
		color: 0xfffcf0,
		emissive: 0xfff1bc,
		emissiveIntensity: 1.9,
		roughness: 0.24
	});
	controlRoomAccentMats.push(crLightMat);
	[
		[-14.2, -5.4],
		[-15.8, -2.7]
	].forEach(([x, z]) => {
		const l = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.42), crLightMat);
		l.rotation.x = Math.PI / 2;
		l.position.set(x, ceilY - 0.04, z);
		S.controlRoomGroup.add(l);
	});
	const deskMat = new THREE.MeshStandardMaterial({
		color: 0x5e6770,
		roughness: 0.68,
		metalness: 0.14
	});
	const chairMat = new THREE.MeshStandardMaterial({
		color: 0x2f3944,
		roughness: 0.55,
		metalness: 0.12
	});
	const makeConsole = (x, z, label, accent) => {
		const g = new THREE.Group();
		const deskBase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.84, 0.68), deskMat);
		deskBase.position.set(0, 0.42, 0);
		g.add(deskBase);
		const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.82), topMat);
		deskTop.position.set(0, 0.88, 0);
		g.add(deskTop);
		const lowerMonitor = new THREE.Mesh(
			new THREE.BoxGeometry(0.06, 0.52, 0.88),
			new THREE.MeshStandardMaterial({
				map: makeCameraFeedTexture(label),
				emissive: 0x23485c,
				emissiveIntensity: 0.5,
				roughness: 0.22
			})
		);
		lowerMonitor.position.set(-0.42, 1.28, 0);
		lowerMonitor.rotation.y = Math.PI / 2;
		g.add(lowerMonitor);
		const upperMonitor = new THREE.Mesh(
			new THREE.BoxGeometry(0.06, 0.56, 0.96),
			new THREE.MeshStandardMaterial({
				map: makeControlScreenTexture('R&V', accent),
				emissive: 0x23485c,
				emissiveIntensity: 0.55,
				roughness: 0.22
			})
		);
		upperMonitor.position.set(0.18, 1.26, 0);
		upperMonitor.rotation.y = Math.PI / 2;
		g.add(upperMonitor);
		const keyboard = new THREE.Mesh(
			new THREE.BoxGeometry(0.52, 0.03, 0.22),
			new THREE.MeshStandardMaterial({ color: 0x1c232a, roughness: 0.55 })
		);
		keyboard.position.set(0.16, 0.93, 0.18);
		g.add(keyboard);
		const mouse = new THREE.Mesh(
			new THREE.BoxGeometry(0.08, 0.025, 0.12),
			new THREE.MeshStandardMaterial({ color: 0x26313b, roughness: 0.48 })
		);
		mouse.position.set(0.34, 0.93, -0.04);
		g.add(mouse);
		const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), chairMat);
		chairSeat.position.set(0.9, 0.56, 0);
		g.add(chairSeat);
		const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 0.44), chairMat);
		chairBack.position.set(1.06, 0.84, 0);
		g.add(chairBack);
		const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.44, 12), chairMat);
		chairBase.position.set(0.88, 0.3, 0);
		g.add(chairBase);
		const chairFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.06, 0.04, 16), chairMat);
		chairFoot.position.set(0.88, 0.06, 0);
		g.add(chairFoot);
		g.position.set(x, GROUND_Y, z);
		g.rotation.y = Math.PI / 2;
		return g;
	};
	S.controlRoomGroup.add(makeConsole(-14.45, -5.35, 'CAM A', '#68d7e3'));
	S.controlRoomGroup.add(makeConsole(-14.5, -2.65, 'CAM B', '#72e0a7'));
	const credenza = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.2, 2.5), deskMat);
	credenza.position.set(-16.9, 0.6, -4.0);
	S.controlRoomGroup.add(credenza);
	const stool2 = stool.clone();
	stool2.position.set(-16.3, 0, -2.0);
	S.controlRoomGroup.add(stool2);
	S.scene.add(S.controlRoomGroup);
}
export function setRoomLightsState(on) {
	S.roomLightsOn = !!on;
	if (S.hemiLight) S.hemiLight.intensity = S.roomLightsOn ? 0.9 : 0.16;
	if (S.ambientRoomLight) S.ambientRoomLight.intensity = S.roomLightsOn ? 0.55 : 0.1;
	if (S.keyRoomLight) S.keyRoomLight.intensity = S.roomLightsOn ? 1.15 : 0.22;
	if (S.fillRoomLight) S.fillRoomLight.intensity = S.roomLightsOn ? 0.45 : 0.08;
	if (S.rimRoomLight) S.rimRoomLight.intensity = S.roomLightsOn ? 0.35 : 0.08;
	roomCeilingFixtureMats.forEach((mat) => {
		mat.emissiveIntensity = S.roomLightsOn ? 2.3 : 0.03;
		mat.color.setHex(S.roomLightsOn ? 0xfffdf1 : 0x55585b);
		mat.needsUpdate = true;
	});
	controlRoomAccentMats.forEach((mat) => {
		mat.emissiveIntensity = S.roomLightsOn ? 1.9 : 0.35;
		mat.color.setHex(S.roomLightsOn ? 0xfffcf0 : 0x777c80);
		mat.needsUpdate = true;
	});
	if (S.scene && S.scene.background)
		S.scene.background.setHex(S.roomLightsOn ? 0xeceef1 : 0x171b20);
	if (roomLightsToggleButton) {
		roomLightsToggleButton.classList.toggle('active-function', S.roomLightsOn);
		roomLightsToggleButton.setAttribute('aria-pressed', String(S.roomLightsOn));
		const small = roomLightsToggleButton.querySelector('small');
		if (small) small.textContent = S.roomLightsOn ? 'Lights ON' : 'Lights OFF';
	}
	setPendantLCD('ROOM LIGHTS', S.roomLightsOn ? 'ON' : 'OFF · treatment vault dimmed');
}
function createTreatmentMonitor3D() {
	S.treatmentMonitorCanvas = document.createElement('canvas');
	// Match the physical 16:9 monitor aspect ratio and use a high-resolution texture
	// so text remains readable when the camera is several metres away or oblique.
	S.treatmentMonitorCanvas.width = 1600;
	S.treatmentMonitorCanvas.height = 900;
	S.treatmentMonitorCtx = S.treatmentMonitorCanvas.getContext('2d', { alpha: false });
	S.treatmentMonitorTexture = new THREE.CanvasTexture(S.treatmentMonitorCanvas);
	S.treatmentMonitorTexture.colorSpace = THREE.SRGBColorSpace;
	S.treatmentMonitorTexture.minFilter = THREE.LinearMipmapLinearFilter;
	S.treatmentMonitorTexture.magFilter = THREE.LinearFilter;
	S.treatmentMonitorTexture.generateMipmaps = true;
	if (S.renderer && S.renderer.capabilities)
		S.treatmentMonitorTexture.anisotropy = Math.min(16, S.renderer.capabilities.getMaxAnisotropy());
	// Basic material keeps the clinical display bright and legible even when room lights are off.
	const screenMat = new THREE.MeshBasicMaterial({
		map: S.treatmentMonitorTexture,
		toneMapped: false
	});
	const frameMat = new THREE.MeshStandardMaterial({
		color: 0x1f2730,
		roughness: 0.52,
		metalness: 0.22
	});
	const bezelMat = new THREE.MeshStandardMaterial({
		color: 0x0b1015,
		roughness: 0.42,
		metalness: 0.15
	});

	const buildMonitorGroup = () => {
		const group = new THREE.Group();
		const frame = new THREE.Mesh(new RoundedBoxGeometry(6.15, 3.62, 0.16, 4, 0.06), frameMat);
		const bezel = new THREE.Mesh(new RoundedBoxGeometry(5.78, 3.3, 0.08, 4, 0.05), bezelMat);
		bezel.position.z = 0.055;
		const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.56, 3.13), screenMat);
		screen.position.z = 0.096;
		const mount = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.16, 0.18, 4, 0.03), frameMat);
		mount.position.set(0, -1.94, -0.02);
		const stem = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.55, 0.12, 4, 0.03), frameMat);
		stem.position.set(0, -1.6, -0.02);
		group.add(frame, bezel, screen, mount, stem);
		return { group, screen };
	};

	const primary = buildMonitorGroup();
	primary.group.position.set(4.1, 3.48, -11.9);
	S.scene.add(primary.group);
	S.treatmentMonitorMesh = primary.screen;
	S.treatmentMonitorFrame = primary.group;

	const secondary = buildMonitorGroup();
	secondary.group.position.set(-11.88, 3.46, -4.85);
	secondary.group.rotation.y = Math.PI / 2;
	S.scene.add(secondary.group);
	S.treatmentMonitorFrameSecondary = secondary.group;

	const consoleA = buildMonitorGroup();
	consoleA.group.scale.set(0.34, 0.34, 0.34);
	consoleA.group.position.set(-14.42, 1.86, -5.35);
	consoleA.group.rotation.y = Math.PI / 2;
	S.scene.add(consoleA.group);
	controlRoomMonitorGroups.push(consoleA.group);

	const consoleB = buildMonitorGroup();
	consoleB.group.scale.set(0.34, 0.34, 0.34);
	consoleB.group.position.set(-14.45, 1.86, -2.68);
	consoleB.group.rotation.y = Math.PI / 2;
	S.scene.add(consoleB.group);
	controlRoomMonitorGroups.push(consoleB.group);

	const cameraBankMatA = new THREE.MeshBasicMaterial({
		map: makeCameraFeedTexture('CAMERA A · LINAC'),
		toneMapped: false
	});
	const cameraBankMatB = new THREE.MeshBasicMaterial({
		map: makeCameraFeedTexture('CAMERA B · PATIENT'),
		toneMapped: false
	});
	const cameraBankMatC = new THREE.MeshBasicMaterial({
		map: makeCameraFeedTexture('CAMERA C · DOOR'),
		toneMapped: false
	});
	const wallFrameMat = new THREE.MeshStandardMaterial({
		color: 0x1b2430,
		roughness: 0.52,
		metalness: 0.18
	});
	const buildWallScreen = (mat, x, y, z) => {
		const g = new THREE.Group();
		const frame = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.96, 0.08, 4, 0.03), wallFrameMat);
		const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), mat);
		screen.position.z = 0.045;
		g.add(frame, screen);
		g.position.set(x, y, z);
		g.rotation.y = Math.PI / 2;
		S.scene.add(g);
		return g;
	};
	buildWallScreen(cameraBankMatA, -17.72, 4.85, -5.65);
	buildWallScreen(cameraBankMatB, -17.72, 4.85, -4.0);
	buildWallScreen(cameraBankMatC, -17.72, 4.85, -2.35);

	renderTreatmentMonitor();
}

export function monitorPlannedDisplay(key, value) {
	if (key === 'imaging' && S.clinicalIGRT?.active && S.clinicalIGRT?.acquired)
		return 'IGRT verified';
	if (key === 'couch') {
		const target = getIGRTExpectedAbsoluteCouch();
		if (target) return canonicalCouchDisplay([target.vrt, target.lng, target.lat]);
		return canonicalCouchDisplay(value);
	}
	if (key === 'gantry' || key === 'collimator' || key === 'couchAngle') {
		const n = normalizeAngleValue(value);
		return n == null ? String(value ?? '—') : `${Number.isInteger(n) ? n : n.toFixed(1)}°`;
	}
	if (key === 'jaws') {
		const j = parseJawSpec(value);
		if (j?.explicit)
			return `X1 ${j.x1.toFixed(1)} / X2 ${j.x2.toFixed(1)} · Y1 ${j.y1.toFixed(1)} / Y2 ${j.y2.toFixed(1)} cm`;
	}
	return String(value ?? '—');
}
export function getTreatmentMonitorActual() {
	const fs =
		typeof fundamentalState !== 'undefined' && fundamentalState
			? fundamentalState
			: {
					gantry: 0,
					collimator: 0,
					jaw: 10,
					mlc: 10,
					mlcShape: 'Square',
					vrt: 0,
					lng: 0,
					lat: 0,
					couchAngle: 0
				};
	const imaging =
		S.clinicalIGRT?.active && S.clinicalIGRT?.acquired
			? S.clinicalIGRT.verified
				? 'IGRT alignment verified'
				: 'Correction pending'
			: S.kvOn && S.detectorExtended
				? 'kV + MV deployed'
				: S.kvOn
					? 'kV arms extended'
					: S.detectorExtended
						? 'MV panel extended'
						: 'None';
	return {
		gantry: `${wrap360(fs.gantry)}°`,
		collimator: `${wrap360(fs.collimator)}°`,
		jaws: Number.isFinite(fs.jawX1)
			? `X1 ${fs.jawX1.toFixed(1)} / X2 ${fs.jawX2.toFixed(1)} · Y1 ${fs.jawY1.toFixed(1)} / Y2 ${fs.jawY2.toFixed(1)} cm`
			: `${fs.jaw} × ${fs.jaw} cm`,
		mlcAperture: `${fs.mlc} cm`,
		mlcShape: `${fs.mlcShape}`,
		imaging,
		odi: S.odiOn ? 'On' : 'Off',
		couch: `${fmtSignedInt(fs.vrt)} / ${fmtSignedInt(fs.lng)} / ${fmtSignedInt(fs.lat)} mm`,
		couchAngle: `${wrap360(fs.couchAngle || 0)}°`,
		electronAccessory: (() => {
			const ss = activeSpecialSetupSpec();
			if (String(ss?.type || '').toUpperCase() !== 'ELECTRON') return 'N/A';
			const e = S.specialSetupWorkflow.electron || {};
			return e.mounted
				? `${e.shape} ${e.width} × ${e.height} cm · ${e.cone}${e.bolusPlaced ? ` · bolus ${Number(e.bolusThickness || ss?.bolusThicknessCm || 0.5).toFixed(1)} cm` : ''}`
				: 'Not mounted';
		})()
	};
}
function monitorFitFont(ctx, text, maxWidth, startPx = 40, minPx = 25, mono = false, weight = 700) {
	const family = mono ? 'Consolas, monospace' : 'Segoe UI, Arial, sans-serif';
	let px = startPx;
	while (px > minPx) {
		ctx.font = `${weight} ${px}px ${family}`;
		if (ctx.measureText(String(text)).width <= maxWidth) break;
		px -= 1;
	}
	return `${weight} ${px}px ${family}`;
}
function drawMonitorCell(ctx, x, y, w, h, opts = {}) {
	const {
		fill = '#111a23',
		stroke = '#26394a',
		text = '',
		color = '#eef4fb',
		align = 'left',
		mono = false,
		fontSize = 36,
		weight = 700,
		status = null
	} = opts;
	ctx.fillStyle = fill;
	ctx.fillRect(x, y, w, h);
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 2;
	ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
	let textX = align === 'left' ? x + 18 : align === 'center' ? x + w / 2 : x + w - 18;
	let maxText = w - 34;
	if (status) {
		const badgeX = x + 18,
			badgeY = y + h / 2;
		ctx.beginPath();
		ctx.arc(badgeX, badgeY, 12, 0, Math.PI * 2);
		ctx.fillStyle = status === 'ok' ? '#39df8f' : '#ff6974';
		ctx.fill();
		ctx.fillStyle = status === 'ok' ? '#082117' : '#321015';
		ctx.font = '900 18px Segoe UI, Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(status === 'ok' ? '✓' : '!', badgeX, badgeY + 1);
		if (align === 'left') textX = x + 44;
		maxText -= 34;
	}
	ctx.fillStyle = color;
	ctx.font = monitorFitFont(
		ctx,
		text,
		maxText,
		fontSize,
		Math.max(23, fontSize - 11),
		mono,
		weight
	);
	ctx.textAlign = align;
	ctx.textBaseline = 'middle';
	ctx.fillText(String(text), textX, y + h / 2 + 1);
}
export function renderTreatmentMonitor() {
	if (!S.treatmentMonitorCtx || !S.treatmentMonitorTexture) return;
	const ctx = S.treatmentMonitorCtx,
		c = S.treatmentMonitorCanvas;
	ctx.clearRect(0, 0, c.width, c.height);
	ctx.fillStyle = '#071019';
	ctx.fillRect(0, 0, c.width, c.height);

	// Header
	ctx.fillStyle = '#102538';
	ctx.fillRect(18, 18, c.width - 36, 94);
	ctx.fillStyle = '#4cc2ff';
	ctx.fillRect(18, 18, 11, 94);
	ctx.fillStyle = '#f7fbff';
	ctx.font = '800 41px Segoe UI, Arial';
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'left';
	ctx.fillText('IN-ROOM TREATMENT MONITOR', 52, 63);
	ctx.fillStyle = '#a9c4d9';
	ctx.font = '600 22px Segoe UI, Arial';
	ctx.fillText('PLANNED vs ACTUAL · independent machine parameter verification', 54, 94);

	const planned = S.activeTreatmentCase || {
		patient: 'No case loaded',
		mrn: '—',
		siteLabel: '—',
		positionLabel: '—',
		technique: '—',
		energy: '—',
		fraction: '—',
		planned: {}
	};
	const plannedParams = S.activeTreatmentCase ? getCurrentPlannedParameters() : {};
	const activeField = S.activeTreatmentCase ? deliveryCasePlan() : null;
	const actual = getTreatmentMonitorActual();
	const rowDefs = activeField?.electron
		? [
				['GANTRY ANGLE', 'gantry'],
				['COLLIMATOR', 'collimator'],
				['JAWS / CONE', 'jaws'],
				['ELECTRON CUTOUT', 'electronAccessory'],
				['IMAGE GUIDANCE', 'imaging'],
				['ODI', 'odi'],
				['COUCH V / L / L', 'couch'],
				['COUCH ANGLE', 'couchAngle']
			]
		: [
				['GANTRY ANGLE', 'gantry'],
				['COLLIMATOR', 'collimator'],
				['JAWS', 'jaws'],
				['MLC APERTURE', 'mlcAperture'],
				['MLC SHAPE', 'mlcShape'],
				['IMAGE GUIDANCE', 'imaging'],
				['ODI', 'odi'],
				['COUCH V / L / L', 'couch'],
				['COUCH ANGLE', 'couchAngle']
			];
	const rows = rowDefs.map(([label, key]) => {
		const pRaw = plannedParams?.[key] ?? '—';
		const aRaw = actual[key] ?? '—';
		return [
			label,
			monitorPlannedDisplay(key, pRaw),
			aRaw,
			treatmentParamMatches(key, pRaw, aRaw),
			key
		];
	});
	const matches = rows.reduce((sum, row) => sum + (row[3] ? 1 : 0), 0);
	const allMatch = matches === rows.length;
	const motionPlanOK = !motionRequired() || !!S.motionManagement.verified;
	const srsPlanOK =
		!srsRequired() ||
		!!S.srsWorkflow.timeoutVerifiedByField[Number(S.treatmentDelivery.activeFieldIndex) || 0];
	const specialPlanOK = specialSetupVerified();
	const immobilizationPlanOK = immobilizationVerified();
	const treatmentVerified =
		allMatch && motionPlanOK && srsPlanOK && specialPlanOK && immobilizationPlanOK;

	// Patient banner
	ctx.fillStyle = '#0d1924';
	ctx.fillRect(18, 128, c.width - 36, 108);
	ctx.fillStyle = '#f3f8fc';
	ctx.font = '800 43px Segoe UI, Arial';
	ctx.fillText(planned.patient || 'No patient loaded', 44, 171);
	ctx.fillStyle = '#8faec5';
	ctx.font = '700 23px Segoe UI, Arial';
	ctx.fillText(
		`MRN ${planned.mrn || '—'}  ·  ${planned.siteLabel || '—'}  ·  ${planned.positionLabel || planned.position || '—'}  ·  ${planned.technique || '—'}${activeField ? `  ·  FIELD: ${activeField.field}` : ''}`,
		46,
		202
	);
	if (immobilizationRequired()) {
		ctx.fillStyle = '#72cfe0';
		ctx.font = monitorFitFont(
			ctx,
			`SETUP ORDER · ${immobilizationSpec()?.orderSummary || 'Verify prescribed immobilization and indexing.'}`,
			1080,
			18,
			15,
			false,
			750
		);
		ctx.fillText(
			`SETUP ORDER · ${immobilizationSpec()?.orderSummary || 'Verify prescribed immobilization and indexing.'}`,
			46,
			228
		);
	}
	ctx.fillStyle = treatmentVerified ? '#174f37' : '#594219';
	ctx.fillRect(1192, 146, 360, 66);
	ctx.strokeStyle = treatmentVerified ? '#3be094' : '#ffc15e';
	ctx.lineWidth = 3;
	ctx.strokeRect(1193.5, 147.5, 357, 63);
	ctx.fillStyle = treatmentVerified ? '#bff6d7' : '#ffe3ae';
	ctx.font = '800 25px Segoe UI, Arial';
	ctx.textAlign = 'center';
	ctx.fillText(
		treatmentVerified
			? 'READY · VERIFIED'
			: !immobilizationPlanOK
				? 'IMMOBILIZATION HOLD'
				: !motionPlanOK
					? 'MOTION HOLD'
					: !srsPlanOK
						? 'STEREO TIMEOUT HOLD'
						: !specialPlanOK
							? 'SETUP LAB HOLD'
							: `${matches}/${rows.length} VERIFIED`,
		1372,
		181
	);
	ctx.textAlign = 'left';

	// Column headers and table
	const x0 = 36,
		y0 = 258,
		labelW = 392,
		plannedW = 510,
		actualW = 626,
		headH = 56,
		rowH = 55;
	drawMonitorCell(ctx, x0, y0, labelW, headH, {
		fill: '#193349',
		stroke: '#315a78',
		text: 'PARAMETER',
		color: '#d7ecfb',
		fontSize: 29,
		weight: 800
	});
	drawMonitorCell(ctx, x0 + labelW, y0, plannedW, headH, {
		fill: '#193349',
		stroke: '#315a78',
		text: 'PLANNED',
		color: '#d7ecfb',
		align: 'center',
		fontSize: 29,
		weight: 800
	});
	drawMonitorCell(ctx, x0 + labelW + plannedW, y0, actualW, headH, {
		fill: '#193349',
		stroke: '#315a78',
		text: 'ACTUAL',
		color: '#d7ecfb',
		align: 'center',
		fontSize: 29,
		weight: 800
	});
	rows.forEach((row, idx) => {
		const y = y0 + headH + idx * rowH;
		const base = idx % 2 === 0 ? '#0d1822' : '#0a141d';
		drawMonitorCell(ctx, x0, y, labelW, rowH, {
			fill: base,
			stroke: '#243847',
			text: row[0],
			color: '#dceaf4',
			fontSize: 31,
			weight: 750
		});
		drawMonitorCell(ctx, x0 + labelW, y, plannedW, rowH, {
			fill: '#122737',
			stroke: '#2d526e',
			text: row[1],
			color: '#e5f4ff',
			align: 'center',
			mono: true,
			fontSize: 36,
			weight: 800
		});
		drawMonitorCell(ctx, x0 + labelW + plannedW, y, actualW, rowH, {
			fill: row[3] ? '#0e4c35' : '#6a2530',
			stroke: row[3] ? '#32d98a' : '#ff6674',
			text: row[2],
			color: '#ffffff',
			align: 'center',
			mono: true,
			fontSize: 38,
			weight: 900,
			status: row[3] ? 'ok' : 'bad'
		});
	});

	// Bottom verification banner
	const summaryY = 820;
	let summaryFill = treatmentVerified ? '#0e5439' : '#5b4215',
		summaryStroke = treatmentVerified ? '#3ce39a' : '#ffc15e',
		summaryText = treatmentVerified ? '#d1ffe7' : '#ffebbd';
	let summaryMessage = treatmentVerified
		? 'ALL PLANNED PARAMETERS MATCH · READY FOR TREATMENT'
		: !immobilizationPlanOK
			? 'PATIENT SETUP HOLD · VERIFY IMMOBILIZATION / INDEXING'
			: !motionPlanOK
				? '4D / MOTION MANAGEMENT VERIFICATION REQUIRED'
				: !srsPlanOK
					? 'STEREOTACTIC TIMEOUT / DRY-RUN VERIFICATION REQUIRED'
					: 'PARAMETER MISMATCH · VERIFY RED VALUES BEFORE BEAM ENABLE';
	if (S.treatmentCompletion?.posted) {
		summaryFill = '#0b5a3b';
		summaryStroke = '#53e6a2';
		summaryText = '#dcffea';
		summaryMessage =
			S.treatmentCompletion.code === 'SRS-NOT-MODELED'
				? 'SRS FRACTION COMPLETE · ALL PRESCRIBED ARCS DELIVERED'
				: `TREATMENT COMPLETE · CPT ${S.treatmentCompletion.code} CAPTURED`;
	} else if (S.treatmentDelivery?.delivering) {
		const autoGate = !!S.treatmentDelivery.gateHeld;
		summaryFill = S.treatmentDelivery.held || autoGate ? '#5b4215' : '#641f27';
		summaryStroke = S.treatmentDelivery.held || autoGate ? '#ffc15e' : '#ff6674';
		summaryText = '#fff0f1';
		summaryMessage = S.treatmentDelivery.held
			? `BEAM HOLD · ${S.treatmentDelivery.muDelivered.toFixed(1)} MU DELIVERED`
			: autoGate
				? `RESPIRATORY GATE HOLD · ${S.treatmentDelivery.muDelivered.toFixed(1)} MU DELIVERED`
				: `BEAM ON · ${S.treatmentDelivery.muDelivered.toFixed(1)} / ${deliveryCasePlan().mu} MU`;
	} else if (S.treatmentDelivery?.completed) {
		summaryFill = '#0e5439';
		summaryStroke = '#3ce39a';
		summaryText = '#d1ffe7';
		summaryMessage = allTreatmentFieldsCompleted()
			? `ALL FIELDS COMPLETE · CHARGE CAPTURE PENDING`
			: `FIELD COMPLETE · ${deliveryCasePlan().mu} MU DELIVERED`;
	}
	ctx.fillStyle = summaryFill;
	ctx.fillRect(36, summaryY, 1528, 58);
	ctx.strokeStyle = summaryStroke;
	ctx.lineWidth = 3;
	ctx.strokeRect(37.5, summaryY + 1.5, 1525, 55);
	ctx.fillStyle = summaryText;
	ctx.font = '800 28px Segoe UI, Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(summaryMessage, 800, summaryY + 30);
	ctx.textAlign = 'left';
	ctx.fillStyle = '#7892a7';
	ctx.font = '600 17px Segoe UI, Arial';
	ctx.fillText(
		'Couch convention: V / Long / Lat · zero is unsigned; + / − indicates direction for nonzero positions.',
		46,
		888
	);
	S.treatmentMonitorTexture.needsUpdate = true;
	syncOperatorConsole();
	if (typeof renderTreatmentDeliveryPanel === 'function') renderTreatmentDeliveryPanel();
}

function createVaultEnvironment() {
	// Clean product-render "studio": grey base pads under the machine, soft backdrop.
	const padMat = new THREE.MeshStandardMaterial({
		color: 0x9a9d9f,
		roughness: 0.75,
		metalness: 0.1
	});
	const machinePad = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.04, 48), padMat);
	machinePad.position.set(0, GROUND_Y + 0.02, GANTRY_PLANE_Z_TARGET - 1.7);
	machinePad.receiveShadow = true;
	S.scene.add(machinePad);
	const isoPad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.03, 48), padMat);
	isoPad.position.set(0, GROUND_Y + 0.025, GANTRY_PLANE_Z_TARGET);
	isoPad.receiveShadow = true;
	S.scene.add(isoPad);
	// pad under the corner modulator cabinet
	const cornerPad = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.03, 40), padMat);
	cornerPad.position.set(-3.5, GROUND_Y + 0.02, -3.9);
	cornerPad.receiveShadow = true;
	S.scene.add(cornerPad);
}

// ---------- kV / CBCT on-board imaging arms (orthogonal to the treatment beam) ----------
function createKvImaging3D() {
	S.kvGroup = new THREE.Group();
	const armMaterial = new THREE.MeshStandardMaterial({
		transparent: true,
		opacity: 0,
		depthWrite: false
	}); // support arms rendered CLEAR
	const darkMaterial = new THREE.MeshStandardMaterial({
		color: 0x2a2f33,
		metalness: 0.5,
		roughness: 0.4
	});
	const panelMaterial = new THREE.MeshStandardMaterial({
		color: 0xe7eaee,
		metalness: 0.2,
		roughness: 0.5
	});
	const isoZ = EPID_Z; // head / isocenter plane
	const faceZ = -1.02; // just in front of the rotating drum face (arms mount here)
	const boomLen = Math.abs(isoZ - faceZ) + 0.1;
	const mkBoom = (x) => {
		const b = rbox(0.16, 0.16, boomLen, armMaterial, 0.06);
		b.position.set(x, 0, (isoZ + faceZ) / 2);
		b.castShadow = false;
		b.receiveShadow = false;
		return b;
	};
	// gantry-mount booms (keep the imagers attached to the drum face)
	S.kvGroup.add(mkBoom(0.8));
	S.kvGroup.add(mkBoom(-0.8));

	//-----------------------------------------------------
	// kV SOURCE
	//-----------------------------------------------------
	const tube = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.22), darkMaterial);
	tube.position.set(1.02, 0, isoZ);
	tube.castShadow = true;
	S.kvGroup.add(tube);
	// collimated window on the isocenter-facing side of the tube
	const srcWindow = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.06, 20), brassMaterial);
	srcWindow.rotation.z = Math.PI / 2;
	srcWindow.position.set(0.9, 0, isoZ);
	srcWindow.castShadow = true;
	S.kvGroup.add(srcWindow);
	// Support arm OUTSIDE the tube
	const srcArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.07), armMaterial);
	srcArm.position.set(1.34, 0, isoZ);
	srcArm.castShadow = false;
	S.kvGroup.add(srcArm);
	//
	// Detector — flat panel, broad face PERPENDICULAR to the horizontal kV beam (faces the source across isocenter)
	//
	const detFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.36), carbonMaterial);
	detFrame.position.set(-1.06, 0, isoZ);
	detFrame.castShadow = true;
	S.kvGroup.add(detFrame);
	const detector = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.3), panelMaterial);
	detector.position.set(-1.02, 0, isoZ);
	detector.castShadow = true;
	S.kvGroup.add(detector);
	// Detector support arm OUTSIDE detector
	const detArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.07), armMaterial);
	detArm.position.set(-1.34, 0, isoZ);
	detArm.castShadow = false;
	S.kvGroup.add(detArm);
	S.kvGroup.visible = false;
	S.gantryRotatingGroup.add(S.kvGroup);
}
export function setKvState(isOn) {
	S.kvOn = isOn;
	if (S.kvGroup) S.kvGroup.visible = isOn;
	if (kvToggleButton) {
		const s = kvToggleButton.querySelector('small');
		if (s) s.textContent = isOn ? 'Retract' : 'Imaging';
		else kvToggleButton.textContent = isOn ? 'Retract kV Arms' : 'Extend kV Arms';
	}
	renderTreatmentMonitor();
	if (S.clinicalIGRT?.active) renderClinicalIGRT();
}

// ---------- Internal-construction view + assembly sequencer ----------
const SHELL_PART_IDS = ['drivestand', 'verticalArm', 'acceleratorHousing', 'treatmentHead'];
const BEAM_STAGES = [
	{
		title: '1 · Klystron RF Amplification',
		anchor: [0, 0.65, -2.4],
		desc: 'The modulator pulses the klystron, which amplifies microwave RF power for the accelerating structure.'
	},
	{
		title: '2 · Circulator and RF Waveguide',
		anchor: [0, 1.15, -2.4],
		desc: 'The circulator directs forward microwave power toward the accelerator and diverts reflected power to a protective load.'
	},
	{
		title: '3 · Electron Gun Injection',
		anchor: [0, 1.05, -1.22],
		desc: 'The electron gun releases timed electron bunches into the evacuated accelerating waveguide.'
	},
	{
		title: '4 · Accelerating Waveguide',
		anchor: [0, 1.05, -0.55],
		desc: 'Microwave electric fields accelerate the electron bunches to the selected megavoltage energy.'
	},
	{
		title: '5 · Steering, Focusing, and Vacuum',
		anchor: [0, 1.2, -0.5],
		desc: 'Steering and focusing coils center the pencil beam while ion pumps maintain the high vacuum.'
	},
	{
		title: '6 · 270° Bending Magnet',
		anchor: [0, 1.16, -0.02],
		desc: 'The bending magnet redirects and energy-selects the accelerated electrons toward the treatment head.'
	},
	{
		title: '7 · Tungsten Target',
		anchor: [0, 1.1, 0],
		desc: 'In photon mode, electrons strike the high-Z target and produce bremsstrahlung X-rays.'
	},
	{
		title: '8 · Primary Collimator',
		anchor: [0, 0.96, 0],
		desc: 'The fixed primary collimator limits the maximum photon beam cone and absorbs off-axis radiation.'
	},
	{
		title: '9 · Flattening Filter / FFF Position',
		anchor: [0, 0.85, 0],
		desc: 'A flattening filter shapes a conventional photon profile; in FFF mode the filter is retracted.'
	},
	{
		title: '10 · Monitor Ion Chamber',
		anchor: [0, 0.76, 0],
		desc: 'Dual monitor chambers measure dose, dose rate, symmetry, and terminate the beam at the prescribed monitor units.'
	},
	{
		title: '11 · Mirror and Light Field',
		anchor: [0, 0.66, 0],
		desc: 'The optical system projects the field and crosshair while remaining outside the treatment beam during irradiation.'
	},
	{
		title: '12 · Secondary Jaws',
		anchor: [0, 0.54, 0],
		desc: 'Movable tungsten jaws define a rectangular field and reduce leakage outside the treatment aperture.'
	},
	{
		title: '13 · Multileaf Collimator',
		anchor: [0, 0.47, 0],
		desc: 'The MLC forms the conformal aperture and dynamically modulates fluence for IMRT and VMAT.'
	},
	{
		title: '14 · Photon Beam Exit',
		anchor: [0, 0.2, 0],
		desc: 'The shaped photon beam exits the treatment head and diverges toward isocenter.'
	}
];
const ELECTRON_STAGES = [
	{
		title: '1 · Klystron RF Amplification',
		anchor: [0, 0.65, -2.4],
		desc: 'The klystron supplies high-power microwaves to accelerate the clinical electron beam.'
	},
	{
		title: '2 · Electron Gun and Waveguide',
		anchor: [0, 1.05, -0.9],
		desc: 'Electron bunches are injected and accelerated to the selected electron energy.'
	},
	{
		title: '3 · Bending Magnet and Energy Selection',
		anchor: [0, 1.16, -0.02],
		desc: 'The bending system redirects the electrons and rejects electrons outside the selected energy band.'
	},
	{
		title: '4 · Target Retracted',
		anchor: [0, 1.1, 0],
		desc: 'For electron treatment, the X-ray target is moved out of the beam path so electrons continue into the head.'
	},
	{
		title: '5 · Scattering Foil',
		anchor: [0, 0.85, 0],
		desc: 'A scattering foil broadens the narrow electron pencil beam into a clinically useful field.'
	},
	{
		title: '6 · Monitor Ion Chamber',
		anchor: [0, 0.76, 0],
		desc: 'The monitor chamber measures output and symmetry for the electron beam.'
	},
	{
		title: '7 · Jaws and MLC Backup',
		anchor: [0, 0.5, 0],
		desc: 'The jaws and MLC provide upstream collimation and leakage control for the selected applicator.'
	},
	{
		title: '8 · Electron Applicator',
		anchor: [0, 0.2, 0],
		desc: 'The electron applicator extends close to the patient to control lateral scatter and field definition.'
	},
	{
		title: '9 · Insert / Cutout',
		anchor: [0, -0.02, 0],
		desc: 'A custom insert at the applicator end shapes the final clinical electron field.'
	},
	{
		title: '10 · Electron Beam Exit',
		anchor: [0, -0.2, 0],
		desc: 'The shaped electron beam exits the applicator with a finite therapeutic range and rapid distal falloff.'
	}
];
const ACCESSORY_STAGES = [
	{
		title: '1 · Accessory Mount',
		anchor: [0, 0.35, 0],
		desc: 'The accessory mount below the collimator provides a keyed, interlocked attachment point.'
	},
	{
		title: '2 · Accessory Tray',
		anchor: [0, 0.26, 0],
		desc: 'A coded tray supports approved beam modifiers and must be fully seated to satisfy the accessory interlock.'
	},
	{
		title: '3 · Physical Wedge / Compensator',
		anchor: [0, 0.18, 0],
		desc: 'A physical wedge or compensator modifies fluence; its identity and orientation must agree with the treatment plan.'
	},
	{
		title: '4 · Electron Applicator Option',
		anchor: [0, 0.06, 0],
		desc: 'For electron mode, the accessory interface supports the selected applicator and its field-defining insert.'
	},
	{
		title: '5 · Final Accessory-Collimated Exit',
		anchor: [0, -0.18, 0],
		desc: 'After accessory verification, the modified beam exits toward the patient with the intended field shape and intensity pattern.'
	}
];
const STAND_STAGES = [
	{
		title: '1 · Klystron',
		anchor: [0, 0.65, -2.4],
		desc: 'The klystron amplifies low-power microwaves into the high-power RF pulses that drive the accelerating waveguide.'
	},
	{
		title: '2 · Circulator',
		anchor: [0, 1.15, -2.4],
		desc: 'The circulator passes forward RF to the waveguide and diverts reflected power into a dummy load.'
	},
	{
		title: '3 · Water Cooling System',
		anchor: [0.5, 0.72, -2.55],
		desc: 'A closed water loop removes heat from the RF source, load, and accelerator components.'
	}
];
const ASSEMBLIES = {
	beam: {
		stages: BEAM_STAGES,
		label: 'Photon Beam Line',
		path: () => S.beamPathGroup,
		hl: () => S.beamHighlight,
		target: [0, 1.2, GANTRY_PLANE_Z_TARGET]
	},
	electron: {
		stages: ELECTRON_STAGES,
		label: 'Electron Beam Line',
		path: () => S.beamPathGroup,
		hl: () => S.beamHighlight,
		target: [0, 0.9, GANTRY_PLANE_Z_TARGET]
	},
	accessory: {
		stages: ACCESSORY_STAGES,
		label: 'Accessory Beam Line',
		path: () => S.beamPathGroup,
		hl: () => S.beamHighlight,
		target: [0, 0.35, GANTRY_PLANE_Z_TARGET]
	},
	stand: {
		stages: STAND_STAGES,
		label: 'RF & Cooling',
		path: () => S.standPathGroup,
		hl: () => S.standHighlight,
		target: [0, 1.0, GANTRY_PLANE_Z_TARGET - 2.5]
	}
};
const SHELL_MATS = () => new Set([MAT.shell, MAT.shellSoft, MAT.trim, MAT.trimDark, MAT.base]);
function mkHighlight() {
	const h = new THREE.Mesh(
		new THREE.SphereGeometry(0.34, 20, 20),
		new THREE.MeshBasicMaterial({
			color: 0x8fd0ff,
			transparent: true,
			opacity: 0.22,
			depthWrite: false
		})
	);
	h.visible = false;
	return h;
}
// orient a thin tube between two points a,b (used for pipes / flow segments)
function tube(group, a, b, r, mat, minStage) {
	const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
	const len = dir.length() || 0.001;
	const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat);
	m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
	if (minStage !== undefined) {
		m.userData.minStage = minStage;
		m.visible = false;
	}
	group.add(m);
	return m;
}

function createBeamPathViz() {
	S.beamPathGroup = new THREE.Group();
	const eMat = new THREE.MeshStandardMaterial({
		color: 0x27c4e0,
		emissive: 0x1aa0c0,
		emissiveIntensity: 0.9,
		transparent: true,
		opacity: 0.85
	});
	const pMat = new THREE.MeshStandardMaterial({
		color: 0xffcf87,
		emissive: 0xffb347,
		emissiveIntensity: 0.9,
		transparent: true,
		opacity: 0.85
	});
	const aMat = new THREE.MeshStandardMaterial({
		color: 0xb58cff,
		emissive: 0x7546d8,
		emissiveIntensity: 0.8,
		transparent: true,
		opacity: 0.82
	});
	const addSeg = (a, b, r, mat, minStage, modes) => {
		const m = tube(S.beamPathGroup, a, b, r, mat, minStage);
		m.userData.modes = modes;
		return m;
	};
	const node = (pos, mat, minStage, modes) => {
		const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 16), mat);
		m.position.set(...pos);
		m.userData.minStage = minStage;
		m.userData.modes = modes;
		m.visible = false;
		S.beamPathGroup.add(m);
	};
	addSeg([0, 0.65, -2.4], [0, 1.05, -1.3], 0.025, aMat, 0, ['beam', 'electron']);
	addSeg([0, 1.05, -1.3], [0, 1.05, -0.2], 0.035, eMat, 2, ['beam']);
	addSeg([0, 1.05, -1.3], [0, 1.05, -0.2], 0.035, eMat, 1, ['electron']);
	node([0, 1.16, -0.02], eMat, 5, ['beam']);
	node([0, 1.16, -0.02], eMat, 2, ['electron']);
	addSeg([0, 1.1, 0], [0, 0.18, 0], 0.05, pMat, 6, ['beam']);
	addSeg([0, 1.1, 0], [0, -0.22, 0], 0.045, eMat, 3, ['electron']);
	addSeg([0, 0.36, 0], [0, -0.22, 0], 0.055, aMat, 0, ['accessory']);
	S.beamPathGroup.visible = false;
	S.beamHighlight = mkHighlight();
	S.gantryRotatingGroup.add(S.beamPathGroup);
	S.gantryRotatingGroup.add(S.beamHighlight);
}

function createStandAssembly3D() {
	// --- always-present internal components inside the stand (revealed when its shell is ghosted) ---
	S.standInternalsGroup = new THREE.Group();
	const ferrite = new THREE.MeshStandardMaterial({
		color: 0x6b7075,
		metalness: 0.6,
		roughness: 0.4
	});
	const tankMat = new THREE.MeshStandardMaterial({
		color: 0x3f7fb0,
		metalness: 0.2,
		roughness: 0.5
	});
	const pipeMat = new THREE.MeshStandardMaterial({
		color: 0x2f6f9f,
		metalness: 0.3,
		roughness: 0.45
	});
	// circulator: ferrite body + 3 waveguide ports, sitting above the klystron
	const cBody = cyl(0.17, 0.17, 0.18, ferrite, 6);
	cBody.position.set(0, 1.15, -2.4);
	S.standInternalsGroup.add(cBody);
	const portUp = rbox(0.1, 0.16, 0.1, MAT.steelDark, 0.02);
	portUp.position.set(0, 1.32, -2.4);
	S.standInternalsGroup.add(portUp);
	const portDn = rbox(0.1, 0.16, 0.1, MAT.steelDark, 0.02);
	portDn.position.set(0, 0.98, -2.4);
	S.standInternalsGroup.add(portDn);
	const portSide = rbox(0.16, 0.1, 0.1, MAT.steelDark, 0.02);
	portSide.position.set(0.18, 1.12, -2.4);
	S.standInternalsGroup.add(portSide);
	const load = rbox(0.14, 0.14, 0.22, ferrite, 0.03);
	load.position.set(0.36, 1.12, -2.4);
	S.standInternalsGroup.add(load); // dummy load
	// water cooling: reservoir + pump + motor
	const tank = cyl(0.17, 0.17, 0.5, tankMat, 24);
	tank.position.set(0.52, 0.95, -2.6);
	S.standInternalsGroup.add(tank);
	const tankCap = cyl(0.18, 0.18, 0.04, MAT.trim, 24);
	tankCap.position.set(0.52, 1.22, -2.6);
	S.standInternalsGroup.add(tankCap);
	const pump = rbox(0.22, 0.2, 0.22, MAT.steel, 0.04);
	pump.position.set(0.52, 0.5, -2.6);
	S.standInternalsGroup.add(pump);
	const motor = cyl(0.08, 0.08, 0.16, MAT.steelDark, 20);
	motor.rotation.z = Math.PI / 2;
	motor.position.set(0.72, 0.5, -2.6);
	S.standInternalsGroup.add(motor);
	// cooling pipe loop (thin blue tubes): reservoir → pump → klystron → circulator → back
	tube(S.standInternalsGroup, [0.52, 0.72, -2.6], [0.52, 0.6, -2.6], 0.028, pipeMat);
	tube(S.standInternalsGroup, [0.52, 0.44, -2.6], [0.18, 0.44, -2.5], 0.028, pipeMat);
	tube(S.standInternalsGroup, [0.18, 0.44, -2.5], [0.05, 0.55, -2.42], 0.028, pipeMat);
	tube(S.standInternalsGroup, [0.08, 0.92, -2.4], [0.08, 1.05, -2.4], 0.028, pipeMat);
	tube(S.standInternalsGroup, [0.12, 1.15, -2.4], [0.52, 1.16, -2.6], 0.028, pipeMat);
	S.standInternalsGroup.visible = true;
	S.staticSetupGroup.add(S.standInternalsGroup);

	// --- walkthrough flow-path viz (revealed stage by stage) ---
	S.standPathGroup = new THREE.Group();
	const rfMat = new THREE.MeshStandardMaterial({
		color: 0xffb066,
		emissive: 0xff8c1a,
		emissiveIntensity: 0.9,
		transparent: true,
		opacity: 0.85,
		roughness: 0.4
	});
	const waterMat = new THREE.MeshStandardMaterial({
		color: 0x38c0f0,
		emissive: 0x1f9fd6,
		emissiveIntensity: 0.8,
		transparent: true,
		opacity: 0.85,
		roughness: 0.4
	});
	const node = (pos, mat, minStage) => {
		const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), mat);
		m.position.set(...pos);
		m.userData.minStage = minStage;
		m.visible = false;
		S.standPathGroup.add(m);
	};
	node([0, 0.65, -2.4], rfMat, 0); // RF generated in the klystron
	tube(S.standPathGroup, [0, 0.9, -2.4], [0, 1.05, -2.4], 0.03, rfMat, 1); // klystron → circulator
	tube(S.standPathGroup, [0, 1.24, -2.4], [0, 1.55, -2.4], 0.03, rfMat, 1); // circulator → up to waveguide
	// water loop highlighted at stage 3
	tube(S.standPathGroup, [0.52, 0.72, -2.6], [0.52, 0.6, -2.6], 0.032, waterMat, 2);
	tube(S.standPathGroup, [0.52, 0.44, -2.6], [0.18, 0.44, -2.5], 0.032, waterMat, 2);
	tube(S.standPathGroup, [0.18, 0.44, -2.5], [0.05, 0.55, -2.42], 0.032, waterMat, 2);
	tube(S.standPathGroup, [0.08, 0.92, -2.4], [0.08, 1.05, -2.4], 0.032, waterMat, 2);
	tube(S.standPathGroup, [0.12, 1.15, -2.4], [0.52, 1.16, -2.6], 0.032, waterMat, 2);
	S.standPathGroup.visible = false;
	S.standHighlight = mkHighlight();
	S.staticSetupGroup.add(S.standPathGroup);
	S.staticSetupGroup.add(S.standHighlight);
}

// ================= DETAILED INTERNAL COMPONENTS (supplied snippets) =================
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function createKlystron() {
	const k = new THREE.Group();
	const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.65, 32), copperMaterial);
	body.rotation.z = Math.PI / 2;
	k.add(body);
	for (let i = -2; i <= 2; i++) {
		const fin = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 8, 30), aluminumMaterial);
		fin.rotation.y = Math.PI / 2;
		fin.position.x = i * 0.12;
		k.add(fin);
	}
	return k;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function createCirculator() {
	const g = new THREE.Group();
	const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 30), copperMaterial);
	body.rotation.x = Math.PI / 2;
	g.add(body);
	const flange1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 20), steelMaterial);
	flange1.position.x = 0.14;
	flange1.rotation.z = Math.PI / 2;
	g.add(flange1);
	const flange2 = flange1.clone();
	flange2.position.x = -0.14;
	g.add(flange2);
	return g;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function createRFWaveguide() {
	const curve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(-1.6, 0.65, 0),
		new THREE.Vector3(-1.1, 0.65, 0),
		new THREE.Vector3(-0.75, 0.25, 0),
		new THREE.Vector3(-0.45, 0.18, 0)
	]);
	return new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.03, 10, false), rfMaterial);
}
function createElectronGun() {
	const gun = new THREE.Group();
	const cathode = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 24), brassMaterial);
	cathode.rotation.z = Math.PI / 2;
	cathode.position.x = -0.12;
	gun.add(cathode);
	const insulator = new THREE.Mesh(
		new THREE.CylinderGeometry(0.055, 0.055, 0.06, 24),
		ceramicMaterial
	);
	insulator.rotation.z = Math.PI / 2;
	insulator.position.x = -0.03;
	gun.add(insulator);
	const anode = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 24), copperMaterial);
	anode.rotation.z = Math.PI / 2;
	anode.position.x = 0.08;
	gun.add(anode);
	return gun;
}
function createWaveguide() {
	const guide = new THREE.Group();
	const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 0.18), copperMaterial);
	guide.add(body);
	for (let i = 0; i < 12; i++) {
		const iris = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.22), brassMaterial);
		iris.position.x = -0.66 + i * 0.12;
		guide.add(iris);
	}
	return guide;
}
function createIonPump() {
	const pump = new THREE.Group();
	const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 20), steelMaterial);
	pump.add(body);
	const flange = new THREE.Mesh(
		new THREE.CylinderGeometry(0.07, 0.07, 0.015, 20),
		aluminumMaterial
	);
	flange.position.y = 0.14;
	pump.add(flange);
	return pump;
}
function createSteeringCoils() {
	const group = new THREE.Group();
	for (let i = 0; i < 4; i++) {
		const torus = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 12, 30), copperMaterial);
		torus.rotation.y = Math.PI / 2;
		torus.position.x = -0.45 + i * 0.28;
		group.add(torus);
	}
	return group;
}
function createBendingMagnet() {
	const magnet = new THREE.Group();
	const core = new THREE.Mesh(
		new THREE.TorusGeometry(0.22, 0.07, 20, 50, Math.PI * 1.5),
		steelMaterial
	);
	core.rotation.z = Math.PI / 2;
	magnet.add(core);
	const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), carbonMaterial);
	pole.position.set(0.22, 0, 0);
	magnet.add(pole);
	return magnet;
}
function createPrimaryCollimator() {
	const group = new THREE.Group();
	const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 0.3, 32), brassMaterial);
	cone.rotation.x = Math.PI / 2;
	group.add(cone);
	return group;
}
function createTargetDetail() {
	const group = new THREE.Group();
	const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 30), steelMaterial);
	disk.rotation.x = Math.PI / 2;
	group.add(disk);
	return group;
}
function createFlatteningFilter() {
	const filter = new THREE.Group();
	const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.075, 0.12, 30), copperMaterial);
	cone.rotation.x = Math.PI / 2;
	filter.add(cone);
	return filter;
}
function createScatteringFoil() {
	const foil = new THREE.Group();
	const disk = new THREE.Mesh(
		new THREE.CylinderGeometry(0.065, 0.065, 0.004, 24),
		aluminumMaterial
	);
	disk.rotation.x = Math.PI / 2;
	foil.add(disk);
	return foil;
}
function createMonitorChamber() {
	const chamber = new THREE.Group();
	const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.028, 30), ceramicMaterial);
	body.rotation.x = Math.PI / 2;
	chamber.add(body);
	return chamber;
}
function createMirrorAssembly() {
	const mirror = new THREE.Group();
	const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.015), steelMaterial);
	mirror.add(frame);
	const glass = new THREE.Mesh(
		new THREE.BoxGeometry(0.16, 0.1, 0.004),
		new THREE.MeshPhongMaterial({ color: 0x99ccff, transparent: true, opacity: 0.45 })
	);
	glass.position.z = 0.006;
	mirror.add(glass);
	return mirror;
}
function createMLCDetail() {
	const mlc = new THREE.Group();
	for (let i = 0; i < 30; i++) {
		const left = roundedBox(0.06, 0.015, 0.24, 0.003, steelMaterial);
		left.position.set(-0.16, -0.22 + i * 0.015, 0);
		mlc.add(left);
		const right = roundedBox(0.06, 0.015, 0.24, 0.003, steelMaterial);
		right.position.set(0.16, -0.22 + i * 0.015, 0);
		mlc.add(right);
	}
	return mlc;
}

// Assemble the detailed beam line inside the gantry (revealed in the Internal View)
function createDetailedInternals3D() {
	S.detailGantryGroup = new THREE.Group();
	const RY = -Math.PI / 2; // components built along +X → align to my +Z beam axis
	const HY = Math.PI / 2; // head-stack parts (built facing Z) → face down (−Y)
	const add = (obj, pos, rot) => {
		if (pos) obj.position.set(...pos);
		if (rot) obj.rotation.set(...rot);
		S.detailGantryGroup.add(obj);
		return obj;
	};
	// horizontal accelerator section (y ≈ 1.05, along Z from back to head)
	add(createElectronGun(), [0, 1.05, -1.22], [0, RY, 0]);
	add(createWaveguide(), [0, 1.05, -0.55], [0, RY, 0]);
	add(createSteeringCoils(), [0, 1.05, -0.55], [0, RY, 0]);
	add(createIonPump(), [0, 1.28, -0.82], [0, 0, 0]);
	add(createIonPump(), [0, 1.28, -0.24], [0, 0, 0]);
	add(createBendingMagnet(), [0, 1.16, -0.02], [0, RY, 0]);
	// vertical head stack (beam travels −Y through the head)
	S.detailTarget = add(createTargetDetail(), [0, 1.1, 0], [HY, 0, 0]);
	add(createPrimaryCollimator(), [0, 0.96, 0], [HY, 0, 0]);
	S.detailFilter = add(createFlatteningFilter(), [0, 0.85, 0], [HY, 0, 0]);
	S.detailFoil = add(createScatteringFoil(), [0, 0.85, 0], [HY, 0, 0]);
	add(createMonitorChamber(), [0, 0.76, 0], [HY, 0, 0]);
	add(createMirrorAssembly(), [0, 0.66, 0], [Math.PI / 4, 0, 0]);
	add(createMLCDetail(), [0, 0.47, 0], [0, 0, 0]);
	S.detailAccessoryTray = add(
		roundedBox(0.62, 0.025, 0.62, 0.02, brassMaterial),
		[0, 0.27, 0],
		[0, 0, 0]
	);
	S.detailElectronCone = add(
		new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.46, 4, 1, true), aluminumMaterial),
		[0, 0.02, 0],
		[0, Math.PI / 4, 0]
	);
	S.detailAccessoryTray.visible = false;
	S.detailElectronCone.visible = false;
	if (S.detailFoil) S.detailFoil.visible = false; // photon mode by default (filter shown, foil hidden)
	S.detailGantryGroup.visible = false;
	S.gantryRotatingGroup.add(S.detailGantryGroup);
}

// hide/show the simpler earned internal meshes so they don't overlap the detailed ones
const SIMPLE_INTERNAL_IDS = ['electronGun', 'waveguide', 'bendingMagnet', 'target', 'klystron'];
function toggleSimpleInternals(hide) {
	SIMPLE_INTERNAL_IDS.forEach((id) => {
		const pd = linacPartsData.find((p) => p.id === id);
		if (!pd || !pd.threeJSObject) return;
		if (hide) {
			pd._preIVVis = pd.threeJSObject.visible;
			pd.threeJSObject.visible = false;
		} else if (pd._preIVVis !== undefined) {
			pd.threeJSObject.visible = pd._preIVVis;
			delete pd._preIVVis;
		}
	});
}

function ghostShells(on) {
	if (!S.ghostMat)
		S.ghostMat = new THREE.MeshStandardMaterial({
			color: 0xf4f5f7,
			transparent: true,
			opacity: 0.13,
			depthWrite: false,
			roughness: 0.6
		});
	const mats = SHELL_MATS();
	SHELL_PART_IDS.forEach((id) => {
		const pd = linacPartsData.find((p) => p.id === id);
		if (!pd || !pd.threeJSObject) return;
		pd.threeJSObject.traverse((m) => {
			if (!m.isMesh) return;
			if (on) {
				if (mats.has(m.material)) {
					m.userData._origMat = m.material;
					m.material = S.ghostMat;
				}
			} else if (m.userData._origMat) {
				m.material = m.userData._origMat;
				delete m.userData._origMat;
			}
		});
	});
}

export function setInternalView(on) {
	S.internalViewOn = on;
	ghostShells(on);
	toggleSimpleInternals(on);
	if (S.detailGantryGroup) S.detailGantryGroup.visible = on;
	internalViewButton.textContent = on ? '🔍 Hide Internals' : '🔍 Show Internals';
	[
		beamStagePrevButton,
		beamStageNextButton,
		asmBeamButton,
		asmElectronButton,
		asmAccessoryButton,
		asmStandButton
	].forEach((b) => {
		if (b) b.disabled = !on;
	});
	if (on) {
		setAssembly(S.activeAssembly);
	} else {
		S.stageIndex = -1;
		[S.beamPathGroup, S.standPathGroup].forEach((g) => {
			if (g) g.visible = false;
		});
		[S.beamHighlight, S.standHighlight].forEach((h) => {
			if (h) h.visible = false;
		});
		internalOverlay.style.display = 'none';
	}
}

export function setAssembly(name) {
	S.activeAssembly = name;
	S.stageIndex = 0;
	if (asmBeamButton) asmBeamButton.classList.toggle('asm-active', name === 'beam');
	if (asmStandButton) asmStandButton.classList.toggle('asm-active', name === 'stand');
	if (asmElectronButton) asmElectronButton.classList.toggle('asm-active', name === 'electron');
	if (asmAccessoryButton) asmAccessoryButton.classList.toggle('asm-active', name === 'accessory');
	if (S.detailFilter) S.detailFilter.visible = name === 'beam';
	if (S.detailFoil) S.detailFoil.visible = name === 'electron';
	if (S.detailTarget) S.detailTarget.visible = name !== 'electron';
	if (S.detailAccessoryTray) S.detailAccessoryTray.visible = name === 'accessory';
	if (S.detailElectronCone)
		S.detailElectronCone.visible = name === 'electron' || name === 'accessory';
	if (S.controls) S.controls.target.set(...ASSEMBLIES[name].target);
	updateStage();
}

export function beamStageStep(dir) {
	if (!S.internalViewOn) return;
	const stages = ASSEMBLIES[S.activeAssembly].stages;
	S.stageIndex = Math.max(0, Math.min(stages.length - 1, S.stageIndex + dir));
	updateStage();
}

function updateStage() {
	const A = ASSEMBLIES[S.activeAssembly];
	if (S.activeAssembly === 'stand') {
		if (S.beamPathGroup) S.beamPathGroup.visible = false;
		if (S.beamHighlight) S.beamHighlight.visible = false;
	} else {
		if (S.standPathGroup) S.standPathGroup.visible = false;
		if (S.standHighlight) S.standHighlight.visible = false;
	}
	if (!S.internalViewOn || S.stageIndex < 0) {
		internalOverlay.style.display = 'none';
		if (A.path()) A.path().visible = false;
		if (A.hl()) A.hl().visible = false;
		return;
	}
	const stages = A.stages,
		grp = A.path(),
		hl = A.hl(),
		s = stages[S.stageIndex];
	internalOverlay.style.display = 'block';
	internalStageTitle.textContent = s.title;
	internalStageDesc.textContent = s.desc;
	internalStageCounter.textContent = `Stage ${S.stageIndex + 1} of ${stages.length} · ${A.label} — ◀ Prev / Next ▶`;
	if (grp) {
		grp.visible = true;
		grp.children.forEach((c) => {
			const modeOK = !c.userData.modes || c.userData.modes.includes(S.activeAssembly);
			c.visible = modeOK && S.stageIndex >= (c.userData.minStage ?? 0);
		});
	}
	if (hl) {
		hl.position.set(...s.anchor);
		hl.visible = true;
	}
}

export function initThreeJS() {
	S.scene = new THREE.Scene();
	S.scene.background = new THREE.Color(0xeceef1);
	S.camera = new THREE.PerspectiveCamera(
		42,
		viewerContainer.clientWidth / viewerContainer.clientHeight,
		0.1,
		120
	);
	S.camera.position.set(8.6, ISOCENTER_Y_TARGET + 2.8, GANTRY_PLANE_Z_TARGET + 7.2);
	S.renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 1 });
	S.renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
	// RTApps perf pass: pixel-ratio cap 2→1.25, PCFSoft→PCF (see sim-hub's matching change).
	S.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
	S.renderer.shadowMap.enabled = true;
	S.renderer.shadowMap.type = THREE.PCFShadowMap;
	viewerContainer.appendChild(S.renderer.domElement);
	S.controls = new OrbitControls(S.camera, S.renderer.domElement);
	S.controls.target.set(-0.4, 1.15, GANTRY_PLANE_Z_TARGET - 0.3);
	S.controls.enableDamping = true;
	S.controls.update();
	// Soft, even treatment-room lighting; references are retained so the pendant can toggle the vault lights.
	S.hemiLight = new THREE.HemisphereLight(0xffffff, 0xc7cbd0, 0.9);
	S.scene.add(S.hemiLight);
	S.ambientRoomLight = new THREE.AmbientLight(0xffffff, 0.55);
	S.scene.add(S.ambientRoomLight);
	S.keyRoomLight = new THREE.DirectionalLight(0xffffff, 1.15);
	S.keyRoomLight.position.set(9, 16, 12);
	S.keyRoomLight.castShadow = true;
	S.keyRoomLight.shadow.mapSize.width = 2048;
	S.keyRoomLight.shadow.mapSize.height = 2048;
	S.keyRoomLight.shadow.camera.left = -8;
	S.keyRoomLight.shadow.camera.right = 8;
	S.keyRoomLight.shadow.camera.top = 8;
	S.keyRoomLight.shadow.camera.bottom = -8;
	S.keyRoomLight.shadow.camera.near = 1;
	S.keyRoomLight.shadow.camera.far = 50;
	S.keyRoomLight.shadow.bias = -0.0004;
	S.scene.add(S.keyRoomLight);
	S.fillRoomLight = new THREE.DirectionalLight(0xffffff, 0.45);
	S.fillRoomLight.position.set(-10, 8, -6);
	S.scene.add(S.fillRoomLight);
	S.rimRoomLight = new THREE.DirectionalLight(0xffffff, 0.35);
	S.rimRoomLight.position.set(-4, 6, 12);
	S.scene.add(S.rimRoomLight);
	const groundPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(60, 60),
		new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.95, metalness: 0.0 })
	);
	groundPlane.rotation.x = -Math.PI / 2;
	groundPlane.position.y = GROUND_Y;
	groundPlane.receiveShadow = true;
	S.scene.add(groundPlane);
	createRoom();
	createTreatmentMonitor3D();
	createVaultEnvironment();
	S.staticSetupGroup = new THREE.Group();
	S.staticSetupGroup.position.set(0, 0, GANTRY_PLANE_Z_TARGET);
	S.scene.add(S.staticSetupGroup);
	S.gantryRotatingGroup = new THREE.Group();
	S.gantryRotatingGroup.position.set(0, ISOCENTER_Y_TARGET, 0);
	S.staticSetupGroup.add(S.gantryRotatingGroup);
	const couchBaseHeightRef = 0.7;
	const initialCouchY = couchBaseHeightRef / 2 + GROUND_Y + 0.54; // raised so the patient's chest sits at isocenter
	S.couchGroup = new THREE.Group();
	S.couchGroup.position.set(0, initialCouchY, GANTRY_PLANE_Z_TARGET + COUCH_SEPARATION_OFFSET);
	S.scene.add(S.couchGroup);
	// Treatment couch rotation uses a dedicated vertical-axis pivot located at isocenter.
	// This keeps the target fixed at isocenter while the tabletop rotates for noncoplanar SRS arcs.
	S.couchTreatmentPivot = new THREE.Group();
	S.couchTreatmentPivot.position.set(0, couchBaseHeightRef / 2 + 0.15 / 2 + 0.235, -2.8);
	S.couchGroup.add(S.couchTreatmentPivot);
	S.couchTopGroup = new THREE.Group();
	S.couchTopGroup.position.set(0, -0.235, 1.1);
	S.couchTreatmentPivot.add(S.couchTopGroup); // same world pose as legacy tabletop at table angle 0°
	S.couchTopHomePos = S.couchTopGroup.position.clone();
	S.couchTopHomeRot = S.couchTopGroup.rotation.clone();
	createCouch3DModels();
	createImmobilizationShelf3D();
	createImmobilizationPatientGroup();
	linacPartsData.forEach((partData) => createLinacPart3D(partData));
	createCollimatorJaws3D();
	createMLC3D();
	createElectronApplicator3D();
	createODI3D();
	createImagingPanel3D();
	createBeam3D();
	createLasers3D();
	createKvImaging3D();
	createBeamPathViz();
	createStandAssembly3D();
	createDetailedInternals3D();
	window.addEventListener('resize', onWindowResize, false);
	setupCCTVFeeds();
	animate();
	loadingScreen.style.display = 'none';
}

// ---------- Detailed part builders (each returns a Group; the whole group is toggled) ----------
function rbox(w, h, d, mat, r) {
	const rad = Math.min(r === undefined ? 0.06 : r, Math.min(w, h, d) / 2 - 0.001);
	const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.max(0.01, rad)), mat);
	m.castShadow = true;
	m.receiveShadow = true;
	return m;
}
function cyl(rt, rb, h, mat, seg) {
	const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat);
	m.castShadow = true;
	m.receiveShadow = true;
	return m;
}
function ring(rOuter, rInner, h, mat, seg) {
	// open thick ring (tube) via lathe-free approach: outer cylinder minus feel using TubeGeometry substitute
	const shape = new THREE.Shape();
	shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
	const hole = new THREE.Path();
	hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
	shape.holes.push(hole);
	const g = new THREE.ExtrudeGeometry(shape, {
		depth: h,
		bevelEnabled: false,
		curveSegments: seg || 48
	});
	g.translate(0, 0, -h / 2);
	const m = new THREE.Mesh(g, mat);
	m.castShadow = true;
	m.receiveShadow = true;
	return m;
}

const partBuilders = {
	drivestand() {
		const g = new THREE.Group(); // FIXED stand, sits behind the gantry (does not rotate)
		const body = rbox(1.7, 2.5, 1.0, MAT.shell, 0.16);
		body.position.set(0, 1.3, 0);
		g.add(body);
		const plinth = rbox(1.85, 0.3, 1.15, MAT.base, 0.06);
		plinth.position.set(0, 0.15, 0);
		g.add(plinth);
		const panel = rbox(1.2, 1.7, 0.06, MAT.shellSoft, 0.08);
		panel.position.set(0, 1.55, 0.52);
		g.add(panel);
		const band = rbox(1.25, 0.14, 0.05, MAT.trim, 0.03);
		band.position.set(0, 0.62, 0.53);
		g.add(band);
		return g;
	},
	modulatorCabinet() {
		const g = new THREE.Group(); // separate corner cabinet: fuse box + floor conduit to the stand
		const body = rbox(0.8, 1.4, 0.7, MAT.shell, 0.08);
		body.position.set(0, 0.7, 0);
		g.add(body);
		const doorL = rbox(0.34, 1.2, 0.04, MAT.shellSoft, 0.02);
		doorL.position.set(-0.19, 0.72, 0.36);
		g.add(doorL);
		const doorR = doorL.clone();
		doorR.position.x = 0.19;
		g.add(doorR);
		const handle = rbox(0.03, 0.3, 0.05, MAT.trimDark, 0.01);
		handle.position.set(0.0, 0.72, 0.4);
		g.add(handle);
		const vent = rbox(0.5, 0.1, 0.04, MAT.trim, 0.02);
		vent.position.set(0, 1.22, 0.36);
		g.add(vent);
		// underfloor conduit running across to the drivestand base (L-shaped)
		const runX = rbox(3.15, 0.08, 0.14, MAT.base, 0.03);
		runX.position.set(1.75, 0.03, 0);
		g.add(runX);
		const runZ = rbox(0.14, 0.08, 0.6, MAT.base, 0.03);
		runZ.position.set(3.32, 0.03, 0.22);
		g.add(runZ);
		return g;
	},
	klystron() {
		const g = new THREE.Group(); // RF amplifier tube in the stand base, axis Z
		const tube = cyl(0.15, 0.15, 0.8, MAT.steel, 28);
		tube.rotation.x = Math.PI / 2;
		g.add(tube);
		for (let i = -1; i <= 1; i++) {
			const fin = cyl(0.19, 0.19, 0.03, MAT.steelDark, 28);
			fin.rotation.x = Math.PI / 2;
			fin.position.z = i * 0.2;
			g.add(fin);
		}
		const collar = cyl(0.09, 0.09, 0.16, MAT.copper, 20);
		collar.rotation.x = Math.PI / 2;
		collar.position.z = 0.45;
		g.add(collar);
		return g;
	},
	connectingArm() {
		const g = new THREE.Group(); // rotation bearing bridging the gap between stand and gantry
		const collar = ring(0.55, 0.4, 0.34, MAT.trimDark, 48);
		g.add(collar); // ring, axis Z
		const flangeF = ring(0.62, 0.45, 0.06, MAT.trim, 48);
		flangeF.position.z = 0.16;
		g.add(flangeF);
		const flangeB = flangeF.clone();
		flangeB.position.z = -0.16;
		g.add(flangeB);
		return g;
	},
	verticalArm() {
		const g = new THREE.Group(); // rotating gantry body (vertical leg of the L) — set well back
		const bodyBlock = rbox(1.25, 2.4, 0.55, MAT.shell, 0.16);
		bodyBlock.position.set(0, 0.1, -1.4);
		g.add(bodyBlock);
		// small circular parameter display on the gantry face (not a large drum)
		const bezel = cyl(0.4, 0.4, 0.05, MAT.trim, 44);
		bezel.rotation.x = Math.PI / 2;
		bezel.position.set(0, 0.15, -1.11);
		g.add(bezel);
		const rim = cyl(0.34, 0.34, 0.04, MAT.trimDark, 44);
		rim.rotation.x = Math.PI / 2;
		rim.position.set(0, 0.15, -1.13);
		g.add(rim);
		const screen = cyl(0.3, 0.3, 0.03, MAT.glassDark, 44);
		screen.rotation.x = Math.PI / 2;
		screen.position.set(0, 0.15, -1.15);
		g.add(screen);
		return g;
	},
	acceleratorHousing() {
		const g = new THREE.Group(); // LONG horizontal arm reaching forward to the head (top leg of the L)
		const arm = rbox(0.6, 0.6, 1.5, MAT.shell, 0.14);
		arm.position.set(0, 1.02, -0.7);
		g.add(arm);
		const knee = rbox(0.72, 0.9, 0.62, MAT.shell, 0.16);
		knee.position.set(0, 0.62, -1.3);
		g.add(knee);
		const nose = cyl(0.24, 0.24, 0.18, MAT.trim, 28);
		nose.rotation.x = Math.PI / 2;
		nose.position.set(0, 1.02, 0.12);
		g.add(nose);
		return g;
	},
	electronGun() {
		const g = new THREE.Group(); // copper gun, axis Z (group already rotated)
		const b = cyl(0.09, 0.055, 0.3, MAT.copper, 20);
		g.add(b);
		const cap = cyl(0.1, 0.1, 0.05, MAT.steelDark, 20);
		cap.position.y = -0.16;
		g.add(cap);
		return g;
	},
	waveguide() {
		const g = new THREE.Group(); // ridged accelerating structure, axis Z (group rotated)
		const core = cyl(0.07, 0.07, 1.0, MAT.steel, 24);
		g.add(core);
		for (let i = 0; i < 15; i++) {
			const disc = cyl(0.095, 0.095, 0.022, MAT.steelDark, 24);
			disc.position.y = -0.44 + i * 0.063;
			g.add(disc);
		}
		return g;
	},
	bendingMagnet() {
		const g = new THREE.Group(); // 270-deg magnet block above the head
		const blk = rbox(0.28, 0.34, 0.26, MAT.magnet, 0.04);
		g.add(blk);
		const pole = cyl(0.13, 0.13, 0.12, MAT.steelDark, 20);
		pole.position.set(0.16, 0, 0);
		pole.rotation.z = Math.PI / 2;
		g.add(pole);
		return g;
	},
	treatmentHead() {
		const g = new THREE.Group(); // rounded drum head + collimator collars
		const drum = cyl(0.4, 0.4, 0.6, MAT.shell, 40);
		drum.position.y = 0.02;
		g.add(drum);
		const topCap = cyl(0.32, 0.4, 0.16, MAT.shell, 40);
		topCap.position.y = 0.36;
		g.add(topCap);
		const collarA = cyl(0.36, 0.42, 0.14, MAT.trim, 40);
		collarA.position.y = -0.34;
		g.add(collarA);
		const collarB = cyl(0.3, 0.36, 0.12, MAT.shellSoft, 40);
		collarB.position.y = -0.46;
		g.add(collarB);
		const aperture = cyl(0.16, 0.2, 0.05, MAT.trimDark, 32);
		aperture.position.y = -0.52;
		g.add(aperture);
		const light = cyl(0.14, 0.14, 0.02, MAT.beamGlow, 24);
		light.position.y = -0.545;
		g.add(light);
		return g;
	},
	target() {
		const g = new THREE.Group();
		const t = cyl(0.08, 0.08, 0.02, MAT.target, 20);
		t.rotation.x = Math.PI / 2;
		g.add(t);
		return g;
	}
};

function makeSilhouette(sil, name) {
	let geo;
	if (sil.type === 'cylinder') geo = new THREE.CylinderGeometry(...sil.size);
	else geo = new THREE.BoxGeometry(...(sil.size || [0.5, 0.5, 0.5]));
	const m = new THREE.Mesh(geo, silhouetteMaterial);
	m.name = name;
	return m;
}

function createLinacPart3D(partData) {
	const build = partBuilders[partData.id] || (() => rbox(0.4, 0.4, 0.4, MAT.shell));
	const mesh = build();
	mesh.position.set(...partData.position);
	mesh.rotation.set(...partData.rotation);
	mesh.name = partData.id;
	mesh.visible = false;
	partData.threeJSObject = mesh;
	const silSpec = partData.sil || { type: 'box', size: [0.4, 0.4, 0.4] };
	const silhouette = makeSilhouette(silSpec, partData.id + '_silhouette');
	silhouette.position.set(...partData.position);
	if (silSpec.offset) silhouette.position.add(new THREE.Vector3(...silSpec.offset));
	silhouette.rotation.set(...(silSpec.rot || partData.rotation));
	silhouette.visible = !partData.isSubComponent;
	partData.silhouetteObject = silhouette;
	if (partData.isSubComponent) {
		const parentPartData = linacPartsData.find((p) => p.id === partData.parentPart);
		if (parentPartData && parentPartData.threeJSObject) {
			parentPartData.threeJSObject.add(mesh);
			partData.silhouetteObject.visible = false;
		}
	} else if (partData.group === 'static') {
		S.staticSetupGroup.add(mesh);
		S.staticSetupGroup.add(silhouette);
	} else if (partData.group === 'gantry') {
		S.gantryRotatingGroup.add(mesh);
		S.gantryRotatingGroup.add(silhouette);
	}
}

function makeBellowsTexture() {
	const c = document.createElement('canvas');
	c.width = 32;
	c.height = 128;
	const g = c.getContext('2d');
	g.fillStyle = '#d7d9dc';
	g.fillRect(0, 0, 32, 128);
	for (let y = 0; y < 128; y += 8) {
		g.fillStyle = 'rgba(0,0,0,0.16)';
		g.fillRect(0, y, 32, 2);
		g.fillStyle = 'rgba(255,255,255,0.5)';
		g.fillRect(0, y + 3, 32, 2);
	}
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(1, 6);
	return t;
}

function createCouch3DModels() {
	const couchBaseHeightRef = 0.7;
	couchAccordionMaterial.map = makeBellowsTexture();
	couchAccordionMaterial.needsUpdate = true;

	// Flat carbon-fibre patient top (slightly raised on a white tray)
	const top = rbox(0.52, 0.05, 4.3, couchTopMaterial, 0.02);
	top.position.set(0, 0.11, 0.0);
	S.couchTopGroup.add(top);
	const tray = rbox(0.6, 0.08, 1.0, MAT.shell, 0.03);
	tray.position.set(0, 0.04, 1.1);
	S.couchTopGroup.add(tray);
	const railL = rbox(0.03, 0.05, 3.9, MAT.trim, 0.01);
	railL.position.set(-0.24, 0.05, 0.0);
	S.couchTopGroup.add(railL);
	const railR = railL.clone();
	railR.position.x = 0.24;
	S.couchTopGroup.add(railR);

	// ---- supine patient; a body-offset group slides the chosen treatment site onto isocenter ----
	const skinMat = new THREE.MeshStandardMaterial({
		color: 0xe7b98f,
		roughness: 0.8,
		metalness: 0.0
	});
	const gownMat = new THREE.MeshStandardMaterial({
		color: 0x8fb8d8,
		roughness: 0.85,
		metalness: 0.0
	});
	const patient = new THREE.Group(); // orientation group (roll/pitch/yaw for HFS/FFP etc.)
	const bodyGroup = new THREE.Group(); // shifts the body so the treatment site sits at the origin
	patient.add(bodyGroup);
	S.patientBodyGroup = bodyGroup;
	// parts positioned by body region along z (head -0.93 ... feet +0.97); site offset re-centers one region on iso
	const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), skinMat);
	head.position.set(0, 0, -0.93);
	head.castShadow = true;
	bodyGroup.add(head);
	const nose = rbox(0.05, 0.05, 0.07, skinMat, 0.01);
	nose.position.set(0, 0.1, -0.99);
	bodyGroup.add(nose); // face marker (up = supine)
	const torso = rbox(0.36, 0.2, 0.85, gownMat, 0.07);
	torso.position.set(0, 0, -0.45);
	bodyGroup.add(torso);
	const hips = rbox(0.38, 0.2, 0.4, gownMat, 0.07);
	hips.position.set(0, 0, 0.1);
	bodyGroup.add(hips);
	const legL = rbox(0.14, 0.16, 0.6, gownMat, 0.05);
	legL.position.set(-0.09, -0.01, 0.55);
	bodyGroup.add(legL);
	const legR = legL.clone();
	legR.position.x = 0.09;
	bodyGroup.add(legR);
	const footL = rbox(0.12, 0.11, 0.14, skinMat, 0.04);
	footL.position.set(-0.09, -0.03, 0.9);
	bodyGroup.add(footL);
	const footR = footL.clone();
	footR.position.x = 0.09;
	bodyGroup.add(footR);
	const armL = rbox(0.1, 0.13, 0.66, skinMat, 0.05);
	armL.position.set(-0.25, 0, -0.35);
	bodyGroup.add(armL);
	const armR = armL.clone();
	armR.position.x = 0.25;
	bodyGroup.add(armR);
	S.patientAnatomyParts = { head, nose, torso, hips, legL, legR, footL, footR, armL, armR };
	const targetMarkerMat = new THREE.MeshStandardMaterial({
		color: 0xffd166,
		emissive: 0x6c4310,
		emissiveIntensity: 0.8,
		roughness: 0.45,
		transparent: true,
		opacity: 0.9,
		depthTest: true
	});
	S.specialAnatomyTargetMarker = new THREE.Mesh(
		new THREE.SphereGeometry(0.055, 18, 14),
		targetMarkerMat
	);
	S.specialAnatomyTargetMarker.visible = false;
	S.specialAnatomyTargetMarker.name = 'specialAnatomicFieldTarget';
	bodyGroup.add(S.specialAnatomyTargetMarker);
	const bolusMat = new THREE.MeshStandardMaterial({
		color: 0x66d0f2,
		emissive: 0x0c3f55,
		emissiveIntensity: 0.45,
		roughness: 0.42,
		transparent: true,
		opacity: 0.58
	});
	S.electronBolusMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.1), bolusMat);
	S.electronBolusMesh.visible = false;
	S.electronBolusMesh.name = 'electronBolus';
	S.electronBolusMesh.position.set(-0.12, 0.108, -0.45);
	bodyGroup.add(S.electronBolusMesh);
	const motionTargetMat = new THREE.MeshStandardMaterial({
		color: 0xff4fe1,
		emissive: 0x5a153f,
		roughness: 0.45,
		transparent: true,
		opacity: 0.88
	});
	S.motionTarget3D = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 14), motionTargetMat);
	S.motionTarget3D.visible = false;
	bodyGroup.add(S.motionTarget3D);
	const surfaceMat = new THREE.MeshStandardMaterial({
		color: 0x62e2ff,
		emissive: 0x143d48,
		roughness: 0.4,
		transparent: true,
		opacity: 0.9
	});
	S.motionSurfaceMarker = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.07), surfaceMat);
	S.motionSurfaceMarker.visible = false;
	bodyGroup.add(S.motionSurfaceMarker);
	const heartMat = new THREE.MeshStandardMaterial({
		color: 0xe54d5a,
		emissive: 0x4b1118,
		roughness: 0.55,
		transparent: true,
		opacity: 0.78
	});
	S.motionHeart3D = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 14), heartMat);
	S.motionHeart3D.scale.set(0.8, 1.15, 0.8);
	S.motionHeart3D.visible = false;
	bodyGroup.add(S.motionHeart3D);
	// error group sits at isocenter; the imaging setup error displaces/tilts it, corrections re-center it
	S.patientErrorGroup = new THREE.Group();
	S.patientErrorGroup.position.set(0, 0.235, -1.1); // isocenter (couch-top-local)
	S.couchTopGroup.add(S.patientErrorGroup);
	S.errorGroupHome = S.patientErrorGroup.position.clone();
	patient.position.set(0, 0, 0); // patient centered on isocenter within the error group
	patient.scale.set(0.8, 0.8, 0.8); // fit the iso-to-gantry clearance for off-center sites
	S.patientErrorGroup.add(patient);
	S.patientGroup = patient;
	S.patientHome = patient.position.clone();

	// White rotatable couch housing (sits above the bellows)
	const housing = rbox(0.62, couchBaseHeightRef, 1.15, MAT.shell, 0.08);
	S.couchGroup.add(housing);
	const housingBand = rbox(0.66, 0.08, 1.2, MAT.trim, 0.03);
	housingBand.position.y = 0.3;
	S.couchGroup.add(housingBand);

	// Ribbed telescoping bellows column (scaled by updateCouchAccordion)
	const couchAccordionVisualGeo = new THREE.BoxGeometry(0.52, ACCORDION_GEOMETRIC_HEIGHT, 0.7);
	const couchAccordionVisualMesh = new THREE.Mesh(couchAccordionVisualGeo, couchAccordionMaterial);
	couchAccordionVisualMesh.name = 'couchAccordionVisual';
	couchAccordionVisualMesh.castShadow = true;
	couchAccordionVisualMesh.receiveShadow = true;
	S.couchGroup.add(couchAccordionVisualMesh);

	// Grey floor base plate for the couch (stationary on the floor)
	const couchBase = cyl(0.62, 0.7, 0.12, MAT.base, 40);
	couchBase.position.set(S.couchGroup.position.x, GROUND_Y + 0.06, S.couchGroup.position.z);
	couchBase.receiveShadow = true;
	S.scene.add(couchBase);

	// Hand pendant on the side of the housing
	const pendant = rbox(0.09, 0.22, 0.05, MAT.glassDark, 0.02);
	pendant.position.set(0.36, 0.12, 0.45);
	S.couchGroup.add(pendant);

	updateCouchAccordion();
}

export function updateCouchAccordion() {
	const accordionVisual = S.couchGroup.getObjectByName('couchAccordionVisual');
	if (!accordionVisual || !S.couchGroup) return;
	const couchBaseHeightRef = 0.7;
	const baseBottomWorldY = S.couchGroup.position.y - couchBaseHeightRef / 2;
	const accordionVisibleHeight = Math.max(0.01, baseBottomWorldY - GROUND_Y);
	accordionVisual.scale.y = accordionVisibleHeight / ACCORDION_GEOMETRIC_HEIGHT;
	accordionVisual.position.y =
		-(couchBaseHeightRef / 2) + accordionVisibleHeight / 2 - (couchBaseHeightRef / 2 + 0.15 / 2);
}

function createCollimatorJaws3D() {
	const headData = linacPartsData.find((p) => p.id === 'treatmentHead');
	if (!headData || !headData.threeJSObject) return;
	S.linacHeadObject = headData.threeJSObject;
	const jawMaterialX = new THREE.MeshStandardMaterial({
		color: 0xf0a020,
		metalness: 0.6,
		roughness: 0.4
	});
	const jawMaterialY = new THREE.MeshStandardMaterial({
		color: 0x28c0d0,
		metalness: 0.6,
		roughness: 0.4
	});
	const jawThickness = 0.04;
	const jawDepth = 0.14;
	const jawSpan = 0.34;
	S.jawXN = new THREE.Mesh(new THREE.BoxGeometry(jawThickness, jawSpan, jawDepth), jawMaterialX);
	S.jawXP = new THREE.Mesh(new THREE.BoxGeometry(jawThickness, jawSpan, jawDepth), jawMaterialX);
	S.jawYN = new THREE.Mesh(new THREE.BoxGeometry(jawSpan, jawThickness, jawDepth), jawMaterialY);
	S.jawYP = new THREE.Mesh(new THREE.BoxGeometry(jawSpan, jawThickness, jawDepth), jawMaterialY);
	const headCenterToBeamExitY = JAW_PLANE_HEADLOCAL;
	S.jawXN.position.set(
		-jawEdgeCmToOffset(Number(fundamentalState?.jawX1 ?? 5)),
		headCenterToBeamExitY,
		0
	);
	S.jawXP.position.set(
		jawEdgeCmToOffset(Number(fundamentalState?.jawX2 ?? 5)),
		headCenterToBeamExitY,
		0
	);
	S.jawYN.position.set(
		0,
		headCenterToBeamExitY - jawEdgeCmToOffset(Number(fundamentalState?.jawY1 ?? 5)) - jawThickness,
		0
	);
	S.jawYP.position.set(
		0,
		headCenterToBeamExitY + jawEdgeCmToOffset(Number(fundamentalState?.jawY2 ?? 5)) + jawThickness,
		0
	);
	[S.jawXN, S.jawXP, S.jawYN, S.jawYP].forEach((jaw) => {
		jaw.visible = false;
		jaw.castShadow = true;
		S.linacHeadObject.add(jaw);
	});
}

function jawEdgeCmToOffset(cm) {
	const c = Math.max(0, Math.min(12.5, Number(cm) || 0));
	return MIN_JAW_OFFSET + (c / 12.5) * (MAX_JAW_OFFSET - MIN_JAW_OFFSET);
}
export function updateJawPositions() {
	if (!S.jawXN) return;
	const headCenterToBeamExitY = JAW_PLANE_HEADLOCAL;
	const x1 = Number(fundamentalState?.jawX1 ?? 5),
		x2 = Number(fundamentalState?.jawX2 ?? 5),
		y1 = Number(fundamentalState?.jawY1 ?? 5),
		y2 = Number(fundamentalState?.jawY2 ?? 5);
	S.jawXN.position.x = -jawEdgeCmToOffset(x1);
	S.jawXP.position.x = jawEdgeCmToOffset(x2);
	S.jawYN.position.y = headCenterToBeamExitY - jawEdgeCmToOffset(y1) - 0.04;
	S.jawYP.position.y = headCenterToBeamExitY + jawEdgeCmToOffset(y2) + 0.04;
	S.jawOffset =
		(jawEdgeCmToOffset(x1) +
			jawEdgeCmToOffset(x2) +
			jawEdgeCmToOffset(y1) +
			jawEdgeCmToOffset(y2)) /
		4;
}

function createElectronApplicator3D() {
	if (!S.linacHeadObject) return;
	S.electronApplicatorGroup = new THREE.Group();
	S.electronApplicatorGroup.name = 'electronApplicator';
	const frameMat = new THREE.MeshStandardMaterial({
		color: 0xc5cad0,
		metalness: 0.72,
		roughness: 0.34
	});
	const trayMat = new THREE.MeshStandardMaterial({
		color: 0x8d949c,
		metalness: 0.6,
		roughness: 0.42
	});
	const insertMat = new THREE.MeshStandardMaterial({
		color: 0xb96b68,
		metalness: 0.18,
		roughness: 0.62
	});
	const accentMat = new THREE.MeshStandardMaterial({
		color: 0x666d75,
		metalness: 0.45,
		roughness: 0.45
	});
	const addBox = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
		m.position.set(x, y, z);
		m.rotation.set(rx, ry, rz);
		m.castShadow = m.receiveShadow = true;
		S.electronApplicatorGroup.add(m);
		return m;
	};
	// Compact Type-III style electron applicator. The baseline geometry is intentionally
	// tighter than the previous version so it sits beneath the head without intersecting
	// the patient or couch in the chest-wall electron workflow.
	addBox(0.34, 0.045, 0.34, accentMat, 0, -0.28, 0);
	addBox(0.3, 0.04, 0.3, frameMat, 0, -0.34, 0);
	addBox(0.32, 0.035, 0.32, frameMat, 0, -0.47, 0);
	addBox(0.36, 0.04, 0.36, frameMat, 0, -0.61, 0);
	addBox(0.42, 0.045, 0.42, trayMat, 0, -0.76, 0);
	addBox(0.46, 0.05, 0.46, accentMat, 0, -0.9, 0);
	const pts = [
		[-0.13, -0.62, -0.13],
		[0.13, -0.62, -0.13],
		[-0.13, -0.62, 0.13],
		[0.13, -0.62, 0.13]
	];
	pts.forEach(([x, y, z]) => addBox(0.035, 0.48, 0.035, frameMat, x, y, z));
	addBox(0.22, 0.028, 0.035, frameMat, 0, -0.69, 0.13);
	addBox(0.22, 0.028, 0.035, frameMat, 0, -0.69, -0.13);
	addBox(0.035, 0.028, 0.22, frameMat, 0.13, -0.69, 0);
	addBox(0.035, 0.028, 0.22, frameMat, -0.13, -0.69, 0);
	const insert = addBox(0.14, 0.018, 0.14, insertMat, 0, -0.77, 0);
	insert.name = 'electronInsertBlock';
	S.electronApplicatorGroup.visible = false;
	S.linacHeadObject.add(S.electronApplicatorGroup);
	updateElectronApplicator3D();
}
export function updateElectronApplicator3D() {
	if (!S.electronApplicatorGroup) return;
	const isElectronCase =
		!!S.activeTreatmentCase &&
		String(activeSpecialSetupSpec()?.type || '').toUpperCase() === 'ELECTRON';
	const mounted = !!S.specialSetupWorkflow?.electron?.mounted;
	S.electronApplicatorGroup.visible = isElectronCase && mounted;
	if (!S.electronApplicatorGroup.visible) return;
	const e = S.specialSetupWorkflow?.electron || {};
	const s = activeSpecialSetupSpec() || {};
	const cone = String(e.cone || s.cone || '10 × 10 cm');
	const coneScale = cone.includes('6 × 6') ? 0.82 : cone.includes('15 × 15') ? 1.08 : 0.94;
	S.electronApplicatorGroup.scale.set(coneScale, 1.0, coneScale);
	S.electronApplicatorGroup.position.set(0, 0.03, 0);
	const insert = S.electronApplicatorGroup.getObjectByName('electronInsertBlock');
	if (insert) {
		const width = Number(e.width) || Number(s.widthCm) || 6;
		const height = Number(e.height) || Number(s.heightCm) || 4;
		insert.scale.set(
			Math.max(0.58, Math.min(1.18, width / 6)),
			1,
			Math.max(0.58, Math.min(1.18, height / 4))
		);
		insert.material.color.set(S.specialSetupWorkflow?.verified ? 0x6bbf87 : 0xb96b68);
	}
}

export const MLC_MIN_CM = 4;
export const MLC_MAX_CM = 20;

function createMLC3D() {
	if (!S.linacHeadObject) return;
	S.mlcGroup = new THREE.Group();
	S.mlcGroup.name = 'mlcClinical';
	const leafMatA = new THREE.MeshStandardMaterial({
		color: 0x59636f,
		metalness: 0.75,
		roughness: 0.32
	});
	const leafMatB = new THREE.MeshStandardMaterial({
		color: 0x707b87,
		metalness: 0.75,
		roughness: 0.32
	});
	const n = 26,
		leafLen = 0.26,
		leafW = 0.017;
	for (let i = 0; i < n; i++) {
		const z = (i - (n - 1) / 2) * leafW;
		const a = new THREE.Mesh(new THREE.BoxGeometry(leafLen, 0.026, leafW * 0.86), leafMatA);
		const b = new THREE.Mesh(new THREE.BoxGeometry(leafLen, 0.026, leafW * 0.86), leafMatB);
		a.position.z = b.position.z = z;
		a.userData.leafIndex = b.userData.leafIndex = i;
		a.castShadow = b.castShadow = true;
		S.mlcGroup.add(a, b);
		S.mlcLeavesA.push(a);
		S.mlcLeavesB.push(b);
	}
	// Place the leaf tips immediately below the collimator exit so leaf motion is visible from the room view.
	S.mlcGroup.position.y = -0.565;
	S.linacHeadObject.add(S.mlcGroup);
	updateMLCPositions();
}
function mlcGapForLeaf(index) {
	const n = Math.max(1, S.mlcLeavesA.length),
		mid = (n - 1) / 2;
	const t = Math.abs((index - mid) / Math.max(1, mid));
	const baseHalfGap =
		0.025 + ((fundamentalState.mlc - MLC_MIN_CM) / (MLC_MAX_CM - MLC_MIN_CM)) * 0.115;
	if (fundamentalState.mlcShape === 'Conformal')
		return baseHalfGap * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - t * t)));
	return baseHalfGap;
}
export function updateMLCPositions() {
	if (!S.mlcGroup || !S.mlcLeavesA.length) return;
	const leafLen = 0.26;
	S.mlcLeavesA.forEach((leaf, i) => {
		const gap = mlcGapForLeaf(i);
		const asym = fundamentalState.mlcShape === 'Asymmetric' ? 0.026 : 0;
		leaf.position.x = -(gap + leafLen / 2) + asym;
		S.mlcLeavesB[i].position.x = +(gap + leafLen / 2) + asym;
	});
}
function createODI3D() {
	const mat = new THREE.LineBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.95 });
	const geo = new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(),
		new THREE.Vector3(0, -1, 0)
	]);
	S.odiLine = new THREE.Line(geo, mat);
	S.odiLine.visible = false;
	S.scene.add(S.odiLine);
	S.odiSpot = new THREE.Mesh(
		new THREE.SphereGeometry(0.018, 16, 12),
		new THREE.MeshBasicMaterial({ color: 0xffcf6a })
	);
	S.odiSpot.visible = false;
	S.scene.add(S.odiSpot);
}

export function updateODIReadout() {
	const m = getODIMeasurement();
	S.lastODIcm = m && Number.isFinite(m.cm) ? m.cm : null;
	const txt = S.lastODIcm == null ? 'NO SURFACE' : `SSD ${S.lastODIcm.toFixed(1)} cm`;
	setTextById('hudODI', S.odiOn ? txt : 'OFF');
	if (S.odiLine && m) {
		S.odiLine.geometry.setFromPoints([m.source, m.point]);
		S.odiLine.visible = S.odiOn;
	}
	if (S.odiSpot && m) {
		S.odiSpot.position.copy(m.point);
		S.odiSpot.visible = S.odiOn && S.lastODIcm != null;
	}
	return txt;
}
export function setODIState(on) {
	S.odiOn = !!on;
	const txt = updateODIReadout();
	odiToggleButton?.classList.toggle('active-function', S.odiOn);
	setPendantLCD('OPTICAL DISTANCE INDICATOR', S.odiOn ? txt : 'OFF');
	renderTreatmentMonitor();
}

function createImagingPanel3D() {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
	const armMaterial = MAT.shell;
	const panelMaterial = new THREE.MeshStandardMaterial({
		color: 0xe7eaee,
		metalness: 0.2,
		roughness: 0.5
	});
	//------------------------------------------------
	// EPID PANEL
	//------------------------------------------------
	const panelGrp = new THREE.Group();
	const epidFrame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), carbonMaterial);
	epidFrame.castShadow = true;
	panelGrp.add(epidFrame);
	const epidPanel = new THREE.Mesh(
		new THREE.BoxGeometry(0.42, 0.04, 0.42), // thin in Y → broad face horizontal, perpendicular to the MV beam
		panelMaterial
	);
	epidPanel.position.y = 0.04; // detector surface on top, faces up toward the head
	epidPanel.castShadow = true;
	panelGrp.add(epidPanel);
	S.detectorPanel = panelGrp;
	//
	// Support arm — rendered CLEAR (invisible) so only the panel shows
	//
	S.detectorArm = new THREE.Group();
	const clearArmMat = new THREE.MeshStandardMaterial({
		transparent: true,
		opacity: 0,
		depthWrite: false
	});
	const faceZ = -1.02;
	const boom = rbox(0.16, 0.16, Math.abs(0 - faceZ) + 0.1, clearArmMat, 0.05);
	boom.position.set(0, -0.16, (0 + faceZ) / 2);
	boom.castShadow = false;
	boom.receiveShadow = false;
	const strut = rbox(0.16, 0.9, 0.16, clearArmMat, 0.05);
	strut.position.set(0, -0.6, 0);
	strut.castShadow = false;
	strut.receiveShadow = false;
	const epidArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), clearArmMat);
	epidArm.position.set(0, -1.36, 0);
	epidArm.castShadow = false;
	S.detectorArm.add(boom);
	S.detectorArm.add(strut);
	S.detectorArm.add(epidArm);
	S.detectorArm.visible = false;
	S.detectorPanel.visible = false;
	S.gantryRotatingGroup.add(S.detectorArm);
	S.gantryRotatingGroup.add(S.detectorPanel);
	setDetectorStateGame(false);
}

export function applyDetectorCommandedPose() {
	if (!S.detectorArm || !S.detectorPanel) return;
	if (S.detectorExtended) {
		S.detectorArm.visible = true;
		S.detectorPanel.visible = true;
		S.detectorArm.position.set(0, 0, 0);
		S.detectorPanel.rotation.set(0, 0, 0);
		S.detectorPanel.position.set(0, S.epidReceptorY, EPID_Z);
	} else {
		// HOME / RETRACTED: park beneath the circular gantry section with the
		// broad panel face vertical. This pose is reasserted after unrelated
		// machine motion so no other subsystem can accidentally deploy it.
		S.detectorArm.visible = false;
		S.detectorPanel.visible = true;
		S.detectorPanel.rotation.set(Math.PI / 2, 0, 0);
		S.detectorPanel.position.set(0, EPID_RETRACT_Y, EPID_RETRACT_Z);
	}
}
export function setDetectorStateGame(isExtended) {
	// Only this function is allowed to change the commanded EPID extension state.
	S.detectorExtended = !!isExtended;
	applyDetectorCommandedPose();
	if (detectorToggleButton) {
		const s = detectorToggleButton.querySelector('small');
		if (s) s.textContent = S.detectorExtended ? 'Retract' : 'EPID';
		else detectorToggleButton.textContent = S.detectorExtended ? 'Retract Panel' : 'Extend Panel';
	}
	renderTreatmentMonitor();
	if (S.clinicalIGRT?.active) renderClinicalIGRT();
}

// --- Beam Delivery (child of the treatment head so it follows gantry rotation) ---
function createBeam3D() {
	const headData = linacPartsData.find((p) => p.id === 'treatmentHead');
	if (!headData || !headData.threeJSObject) return;
	const jawExitY = JAW_PLANE_HEADLOCAL; // aligns with jaw plane (head-local)
	const beamLength = 1.1,
		baseRadius = 0.22;
	const beamGeo = new THREE.CylinderGeometry(0.02, baseRadius, beamLength, 24, 1, true); // narrow at jaws, widening down
	const beamMat = new THREE.MeshBasicMaterial({
		color: 0x33e0ff,
		transparent: true,
		opacity: 0.28,
		side: THREE.DoubleSide,
		depthWrite: false
	});
	S.beamCone = new THREE.Mesh(beamGeo, beamMat);
	S.beamCone.position.set(0, jawExitY - beamLength / 2, 0);
	S.beamCone.visible = false;
	headData.threeJSObject.add(S.beamCone);
}
export function setBeamState(isOn) {
	const next = !!isOn,
		changed = S.beamOn !== next;
	S.beamOn = next;
	if (S.beamCone) S.beamCone.visible = next;
	if (beamOnButton) {
		const s = beamOnButton.querySelector('small');
		if (s) s.textContent = next ? 'OFF' : 'Visualize';
		else beamOnButton.textContent = next ? 'Beam Off' : 'Beam On';
	}
	if (changed) renderTreatmentMonitor();
}

// --- Room alignment lasers (cross at the world isocenter) ---
function createLasers3D() {
	S.laserGroup = new THREE.Group();
	const laserMat = new THREE.MeshBasicMaterial({ color: 0xff2b2b });
	const len = 7,
		r = 0.006;
	const mkLine = (rx, ry, rz) => {
		const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), laserMat);
		m.rotation.set(rx, ry, rz);
		return m;
	};
	S.laserGroup.add(mkLine(0, 0, 0)); // vertical (Y)
	S.laserGroup.add(mkLine(0, 0, Math.PI / 2)); // lateral (X)
	S.laserGroup.add(mkLine(Math.PI / 2, 0, 0)); // longitudinal (Z)
	S.laserGroup.position.copy(WORLD_ISOCENTER);
	S.laserGroup.visible = false;
	S.scene.add(S.laserGroup);
}
export function setLaserState(isOn) {
	S.lasersOn = isOn;
	if (S.laserGroup) S.laserGroup.visible = isOn;
	if (lasersToggleButton) {
		const s = lasersToggleButton.querySelector('small');
		if (s) s.textContent = isOn ? 'OFF' : 'Align';
		else lasersToggleButton.textContent = isOn ? 'Lasers Off' : 'Lasers On';
	}
	renderTreatmentMonitor();
}

export function onWindowResize() {
	if (S.camera && S.renderer && viewerContainer) {
		S.camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
		S.camera.updateProjectionMatrix();
		S.renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
	}
}
