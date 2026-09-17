// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import * as THREE from 'three-linac';
import { OrbitControls } from 'three-linac/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three-linac/addons/geometries/RoundedBoxGeometry.js';
import { S } from './state.js';
import {
	viewerContainer,
	taskSelect,
	startQuizButton,
	quizArea,
	quizQuestionElem,
	quizOptionsElem,
	submitAnswerButton,
	messageArea,
	balanceDisplay,
	enhancementStoreElem,
	resetButton,
	treatmentCaseSelect,
	loadTreatmentCaseBtn,
	nextTreatmentCaseBtn,
	ctSuiteLaunchButton,
	ctSuitePanel,
	ctSuiteClose,
	igrtLaunchButton,
	igrtPanel,
	igrtClose,
	igrtNewSetup,
	igrtAcquire,
	igrtVerify,
	motionLaunchButton,
	motionPanel,
	motionClose,
	motionAcquire,
	motionVerify,
	motionHold,
	motionRelease,
	motionReset,
	motionRecheck,
	motionWaveCanvas,
	motionGateLow,
	motionGateHigh,
	motionDibhTarget,
	motionDibhTolerance,
	adaptiveLaunchButton,
	adaptivePanel,
	adaptiveClose,
	adaptiveAssess,
	adaptiveCompare,
	adaptiveApprove,
	oisLaunchButton,
	oisPanel,
	oisClose,
	oisNote,
	oisTherapist,
	oisReviewCheck,
	oisOverrideCard,
	oisOverrideSummary,
	oisOverrideReviewCheck,
	oisSignOff,
	adaptiveNextFraction,
	adaptiveResetCourse,
	adaptiveDoseCanvas,
	srsLaunchButton,
	srsPanel,
	srsClose,
	srsClearanceCheck,
	srsDryRun,
	srsVerifyTimeout,
	specialSetupLaunchButton,
	specialSetupPanel,
	specialSetupClose,
	specialSetupContent,
	deliveryLaunchButton,
	immobilizationLaunchButton,
	immobilizationPanel,
	immobilizationClose,
	immobilizationShelf,
	immobilizationTableDrop,
	immobilizationPlacedList,
	immobilizationVerify,
	immobilizationReset,
	deliveryPanel,
	deliveryClose,
	deliveryRecheck,
	deliveryArm,
	clearanceOverrideCard,
	clearanceOverrideReason,
	clearanceOverrideRationale,
	clearanceOverrideAck,
	clearanceOverrideApply,
	clearanceOverrideWithdraw,
	clearanceOverrideStatus,
	deliveryStart,
	deliveryHold,
	deliveryTerminate,
	deliveryFieldSelect,
	deliveryCompleteSession,
	deliveryReviewCharges,
	chargeCapturePanel,
	chargeCaptureClose,
	chargeTreatmentCode,
	chargeIgrtHandling,
	chargeVerify,
	chargePost,
	loadingScreen,
	tabButtons,
	tabContentPanels,
	bottomMachineControls,
	gantryRotatePlusButton,
	gantryRotateMinusButton,
	collimatorRotatePlusButton,
	collimatorRotateMinusButton,
	pendantMotionEnable,
	couchUpButton,
	couchDownButton,
	couchInButton,
	couchOutButton,
	couchLeftButton,
	couchRightButton,
	couchRollPlusButton,
	couchRollMinusButton,
	couchPitchPlusButton,
	couchPitchMinusButton,
	couchYawPlusButton,
	couchYawMinusButton,
	couchTreatmentAnglePlusButton,
	couchTreatmentAngleMinusButton,
	jawsOpenButton,
	jawsCloseButton,
	jawX1InButton,
	jawX1OutButton,
	jawX2InButton,
	jawX2OutButton,
	jawY1InButton,
	jawY1OutButton,
	jawY2InButton,
	jawY2OutButton,
	mlcOpenButton,
	mlcCloseButton,
	mlcShapeButton,
	detectorToggleButton,
	beamOnButton,
	lasersToggleButton,
	odiToggleButton,
	bonusChallengeButton,
	roomLightsToggleButton,
	viewVaultButton,
	viewControlRoomButton,
	kvToggleButton,
	operatorConsolePanel,
	consoleActivePatient,
	consoleActiveField,
	consoleRoomStatus,
	consoleMotionStatus,
	consoleQueue,
	consoleMotionEnable,
	consoleImmoButton,
	consoleIGRTButton,
	consoleDeliveryButton,
	consoleOISButton,
	consoleGantryMinus,
	consoleGantryPlus,
	consoleCollMinus,
	consoleCollPlus,
	consoleVrtMinus,
	consoleVrtPlus,
	consoleLngMinus,
	consoleLngPlus,
	consoleLatMinus,
	consoleLatPlus,
	consoleKV,
	consoleMV,
	consoleLasers,
	consoleBeamVisual,
	consoleRoomLights,
	consoleTravelVault,
	consoleTravelControl,
	consoleJawsClose,
	consoleJawsOpen,
	consoleMLCClose,
	consoleMLCOpen,
	consoleMLCShape,
	consoleOdi,
	consoleJawX1In,
	consoleJawX1Out,
	consoleJawX2In,
	consoleJawX2Out,
	consoleJawY1In,
	consoleJawY1Out,
	consoleJawY2In,
	consoleJawY2Out,
	consoleRollMinus,
	consoleRollPlus,
	consolePitchMinus,
	consolePitchPlus,
	consoleYawMinus,
	consoleYawPlus,
	consoleTableMinus,
	consoleTablePlus,
	consoleReadoutGantry,
	consoleReadoutColl,
	consoleReadoutJaws,
	consoleReadoutMLC,
	consoleCameraAStatus,
	consoleCameraAInfo,
	consoleCameraBStatus,
	consoleCameraBInfo,
	consoleCameraCStatus,
	consoleCameraCInfo,
	consolePatientClock,
	consolePatientRefName,
	consolePatientRefSubtitle,
	consoleRefMRN,
	consoleRefFraction,
	consoleRefPosition,
	consoleRefEnergy,
	consoleRefTechnique,
	consoleRefField,
	consolePlanGantry,
	consolePlanColl,
	consolePlanJaws,
	consolePlanMLC,
	consolePlanImaging,
	consolePlanCouch,
	consoleImmoSummary,
	consoleImmoList,
	consoleBeamStatusChip,
	consoleDoorStatusChip,
	consoleIGRTStatusChip,
	consoleLightsStatusChip,
	cameraSceneA,
	cameraSceneB,
	cameraSceneC,
	internalViewButton,
	beamStagePrevButton,
	beamStageNextButton,
	asmBeamButton,
	asmStandButton,
	asmElectronButton,
	asmAccessoryButton,
	internalOverlay,
	internalStageTitle,
	internalStageDesc,
	internalStageCounter,
	bevInset,
	bevCollapseButton,
	bevFieldGroup,
	bevFieldLight,
	bevMlcLeaves,
	bevJawMasks,
	bevJawOutline
} from './dom.js';

// RTApps (plan 4c): prefetch the hub's player URL once; the back-link control only
// renders/enables when it resolves (activity unseeded/unpublished, or offline leaves
// HUB_URL null and the button stays disabled instead of going dead). Same pattern as
// the hub's own door-fix precedent (commit 4cc341a).
if (window.RTApps) {
	window.RTApps.activityUrl('sim-hub-qa')
		.then(function (url) {
			S.HUB_URL = url;
			const backBtn = document.getElementById('rtappsBackBtn');
			if (backBtn) backBtn.disabled = false;
		})
		.catch(function () {});
}
document.getElementById('rtappsBackBtn')?.addEventListener('click', () => {
	if (S.HUB_URL) window.top.location.href = S.HUB_URL;
});

const roomCeilingFixtureMats = [];
const controlRoomAccentMats = [];
const controlRoomMonitorGroups = [];
const cctvFeeds = [];
// In-room treatment monitor state. Keep these in the main module scope because
// createTreatmentMonitor3D(), renderTreatmentMonitor(), and the case loader all share them.
// Clinical IGRT controller must exist before initThreeJS() creates or resets
// imaging hardware. Hardware helpers may refresh the IGRT panel during startup.
window.clinicalIGRTActive = false;

const DELIVERY_SPEED_FACTOR = 4;

const ISOCENTER_Y_TARGET = 1.5;
const GANTRY_PLANE_Z_TARGET = -1.0;
const COUCH_SEPARATION_OFFSET = 2.8;
const GROUND_Y = -0.05;
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

const linacPartsData = [
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
const CORE_PART_IDS = linacPartsData.filter((p) => !p.isSubComponent).map((p) => p.id);

const enhancementsData = [
	{
		id: 'gantryRotation',
		name: 'Gantry Rotation System',
		cost: 100,
		description: 'Unlocks controls to rotate the LINAC gantry.',
		type: 'movement'
	},
	{
		id: 'couchVertical',
		name: 'Couch Vertical Drive',
		cost: 75,
		description: 'Unlocks controls for up/down couch movement.',
		type: 'movement'
	},
	{
		id: 'couchLongitudinal',
		name: 'Couch Longitudinal Drive',
		cost: 75,
		description: 'Unlocks controls for in/out couch movement.',
		type: 'movement'
	},
	{
		id: 'couchLateral',
		name: 'Couch Lateral Drive',
		cost: 75,
		description: 'Unlocks controls for left/right couch movement.',
		type: 'movement'
	},
	{
		id: 'couchRotation',
		name: 'Couch 6DOF Rotation Drive',
		cost: 100,
		description: 'Unlocks roll, pitch, and yaw couch corrections for 6DOF image guidance.',
		type: 'movement'
	},
	{
		id: 'collimatorJaws',
		name: 'Collimator Jaws Control',
		cost: 80,
		description: 'Unlocks controls to open/close collimator jaws.',
		type: 'movement'
	},
	{
		id: 'imagingPanel',
		name: 'Imaging Panel System',
		cost: 120,
		description: 'Unlocks ability to extend/retract the imaging panel.',
		type: 'movement'
	},
	{
		id: 'beamDelivery',
		name: 'Beam Delivery System',
		cost: 150,
		description:
			'Brings the machine online — turn the treatment beam on/off to see it emanate from the collimator.',
		type: 'operational'
	},
	{
		id: 'alignmentLasers',
		name: 'Room Alignment Lasers',
		cost: 70,
		description: 'Projects positioning lasers that intersect at the machine isocenter.',
		type: 'operational'
	}
];

// Repeatable, post-assembly income so the full store is always attainable.
const BONUS_REWARD = 25;
const BONUS_QUESTIONS = [
	{
		question: 'Which interlock prevents beam-on when the treatment room door is open?',
		options: ['Door interlock', 'Collimator interlock', 'Couch interlock', 'Wedge interlock'],
		correctAnswerIndex: 0
	},
	{
		question: 'The flattening filter in a photon beam is used to:',
		options: [
			'Generate electrons',
			'Produce a uniform beam intensity across the field',
			'Bend the electron beam',
			'Cool the target'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Monitor units are measured by which device in the treatment head?',
		options: ['Ionization chamber', 'Klystron', 'Bending magnet', 'Electron gun'],
		correctAnswerIndex: 0
	},
	{
		question: 'For photon production, accelerated electrons strike a high-atomic-number:',
		options: ['Scattering foil', 'Target', 'Wedge', 'Collimator'],
		correctAnswerIndex: 1
	},
	{
		question: 'The multileaf collimator primarily provides:',
		options: [
			'Beam flattening',
			'Conformal field shaping',
			'Electron generation',
			'Microwave amplification'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'An isocentric (source-to-axis) setup keeps which distance constant to the axis?',
		options: [
			'Source-to-skin distance',
			'Source-to-axis distance',
			'Source-to-collimator distance',
			'Source-to-tray distance'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Scattering foils replace the flattening filter for which treatment mode?',
		options: ['Photon mode', 'Electron mode', 'Imaging mode', 'Standby mode'],
		correctAnswerIndex: 1
	},
	{
		question: 'Cone-beam computed tomography on a linear accelerator is acquired using the:',
		options: ['Klystron', 'Kilovoltage imaging source and panel', 'Modulator', 'Bending magnet'],
		correctAnswerIndex: 1
	},
	{
		question:
			'Both the klystron and magnetron operate in which frequency band to power the waveguide?',
		options: ['Radio (kHz)', 'Microwave (RF)', 'Infrared', 'Ultraviolet'],
		correctAnswerIndex: 1
	},
	{
		question: 'The magnetron differs from the klystron in that it:',
		options: [
			'Only amplifies microwaves',
			'Generates microwaves (an oscillator)',
			'Produces electrons',
			'Bends the beam'
		],
		correctAnswerIndex: 1
	},
	{
		question:
			'A bending magnet that turns the electron beam through roughly 270° is chosen mainly to:',
		options: [
			'Increase beam energy',
			'Achieve achromatic focusing at the target',
			'Cool the waveguide',
			'Flatten the beam'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Standard machine (IEC) convention places gantry 0° with the beam pointing:',
		options: [
			'Straight down (vertically)',
			'Toward the floor at 45°',
			'Horizontally',
			'Straight up'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'The percentage depth dose increases with all of the following EXCEPT:',
		options: [
			'Higher beam energy',
			'Larger field size',
			'Greater source-to-surface distance',
			'Shallower depth beyond dmax'
		],
		correctAnswerIndex: 3
	},
	{
		question: 'As photon beam energy increases, the depth of maximum dose (dmax):',
		options: ['Moves deeper', 'Moves shallower', 'Stays at the surface', 'Is unaffected'],
		correctAnswerIndex: 0
	},
	{
		question: "The 'skin-sparing' effect of megavoltage photons is due to:",
		options: [
			'The flattening filter',
			'Dose build-up below the surface',
			'The primary collimator',
			'Beam divergence'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'A physical wedge is used to:',
		options: [
			'Increase output',
			'Tilt the isodose distribution',
			'Filter electrons',
			'Shield the target'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Bolus is applied to the skin surface primarily to:',
		options: [
			'Reduce skin dose',
			'Increase surface (skin) dose',
			'Harden the beam',
			'Collimate the field'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'The primary collimator in the treatment head defines the:',
		options: ['Maximum available field size', 'Minimum leaf width', 'Wedge angle', 'Couch travel'],
		correctAnswerIndex: 0
	},
	{
		question: 'Electron beams are characterized clinically by their:',
		options: [
			'Rapid dose fall-off beyond a therapeutic range',
			'Deep penetration',
			'Skin sparing',
			'Lack of a target'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'Daily output constancy of a linear accelerator is typically checked with a:',
		options: [
			'Farmer chamber traceable to calibration',
			'Klystron test',
			'Gantry star shot',
			'Door interlock test'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'A star-shot test is used to verify the:',
		options: [
			'Radiation and mechanical isocenter coincidence',
			'Beam energy',
			'Monitor unit linearity',
			'Couch load limit'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'The waveguide must be held under high vacuum so that:',
		options: [
			'Electrons accelerate without colliding with gas molecules',
			'Microwaves are generated',
			'The target stays cool',
			'The beam is flattened'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'Volumetric-modulated arc therapy delivers dose while varying:',
		options: [
			'Only the couch angle',
			'Gantry rotation, dose rate, and MLC shape simultaneously',
			'Only the jaw positions',
			'Only the beam energy'
		],
		correctAnswerIndex: 1
	},
	{
		question:
			'The circulator (isolator) between the microwave source and waveguide protects the source from:',
		options: [
			'Reflected microwave power',
			'Stray electrons',
			'Excess coolant',
			'Scattered photons'
		],
		correctAnswerIndex: 0
	}
];

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
function setRoomLightsState(on) {
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
function fmtSignedInt(v) {
	const n = Number(v) || 0;
	if (Object.is(n, -0) || Math.abs(n) < 1e-9) return '0';
	return `${n > 0 ? '+' : ''}${Number.isInteger(n) ? n : n.toFixed(1)}`;
}
function normalizeAngleValue(value) {
	const n = parseFloat(String(value ?? '').replace('°', ''));
	if (!Number.isFinite(n)) return null;
	return ((n % 360) + 360) % 360;
}
function parseFirstNumber(value) {
	const m = String(value ?? '').match(/[-+]?\d+(?:\.\d+)?/);
	return m ? Number(m[0]) : null;
}
function parseJawPair(value) {
	const nums = String(value ?? '').match(/[-+]?\d+(?:\.\d+)?/g);
	return nums && nums.length >= 2 ? [Number(nums[0]), Number(nums[1])] : null;
}
function parseJawSpec(value) {
	const s = String(value ?? '');
	const readLabel = (label) => {
		const m = s.match(new RegExp(label + '\\s*[:=]?\\s*([-+]?\\d+(?:\\.\\d+)?)', 'i'));
		return m ? Math.abs(Number(m[1])) : null;
	};
	const x1 = readLabel('X1'),
		x2 = readLabel('X2'),
		y1 = readLabel('Y1'),
		y2 = readLabel('Y2');
	if ([x1, x2, y1, y2].every(Number.isFinite)) return { x1, x2, y1, y2, explicit: true };
	const pair = parseJawPair(value);
	if (pair)
		return { x1: pair[0] / 2, x2: pair[0] / 2, y1: pair[1] / 2, y2: pair[1] / 2, explicit: false };
	return null;
}
function parseCouchTriplet(value) {
	const nums = String(value ?? '').match(/[-+]?\d+(?:\.\d+)?/g);
	if (!nums || nums.length < 3) return null;
	return nums.slice(0, 3).map((v) => {
		const n = Number(v);
		return Object.is(n, -0) ? 0 : n;
	});
}
function canonicalCouchDisplay(value) {
	const vals = Array.isArray(value) ? value : parseCouchTriplet(value);
	if (!vals) return String(value ?? '—');
	return `${fmtSignedInt(vals[0])} / ${fmtSignedInt(vals[1])} / ${fmtSignedInt(vals[2])} mm`;
}
function getPlannedCouchState() {
	const vals = parseCouchTriplet(getCurrentPlannedParameters()?.couch);
	if (!vals) return null;
	// Monitor convention is VRT / LNG / LAT.
	return { vrt: vals[0], lng: vals[1], lat: vals[2] };
}
function getIGRTExpectedAbsoluteCouch() {
	if (
		!S.clinicalIGRT?.active ||
		!S.clinicalIGRT?.acquired ||
		!S.clinicalIGRT?.correction ||
		!S.clinicalIGRT?.baseline
	)
		return null;
	return {
		vrt: S.clinicalIGRT.baseline.vrt + S.clinicalIGRT.correction.vrt,
		lng: S.clinicalIGRT.baseline.lng + S.clinicalIGRT.correction.lng,
		lat: S.clinicalIGRT.baseline.lat + S.clinicalIGRT.correction.lat
	};
}
function couchStateMatchesPlan(tol = 0.01) {
	const p = getPlannedCouchState();
	if (!p) return true;
	return (
		Math.abs(fundamentalState.vrt - p.vrt) <= tol &&
		Math.abs(fundamentalState.lng - p.lng) <= tol &&
		Math.abs(fundamentalState.lat - p.lat) <= tol
	);
}
function treatmentParamMatches(key, plannedValue, actualValue) {
	if (plannedValue == null || actualValue == null) return false;
	if (key === 'gantry' || key === 'collimator' || key === 'couchAngle') {
		const p = normalizeAngleValue(plannedValue),
			a = normalizeAngleValue(actualValue);
		if (p == null || a == null) return false;
		const d = Math.abs(p - a);
		return Math.min(d, 360 - d) < 0.01;
	}
	if (key === 'jaws') {
		const p = parseJawSpec(plannedValue),
			a = parseJawSpec(actualValue);
		return !!p && !!a && ['x1', 'x2', 'y1', 'y2'].every((k) => Math.abs(p[k] - a[k]) < 0.01);
	}
	if (key === 'mlcAperture') {
		const p = parseFirstNumber(plannedValue),
			a = parseFirstNumber(actualValue);
		return p != null && a != null && Math.abs(p - a) < 0.01;
	}
	if (key === 'couch') {
		const a = parseCouchTriplet(actualValue);
		if (!a) return false;
		const igrtTarget = getIGRTExpectedAbsoluteCouch();
		if (igrtTarget) {
			// Once images are acquired, the clinically expected couch position is the
			// planned/setup baseline plus the recommended image-guided correction.
			const target = [igrtTarget.vrt, igrtTarget.lng, igrtTarget.lat];
			return target.every((v, i) => Math.abs(v - a[i]) <= 1.0);
		}
		const p = parseCouchTriplet(plannedValue);
		return !!p && p.every((v, i) => Math.abs(v - a[i]) < 0.01);
	}
	const canon = (v) => String(v).trim().toLowerCase().replace(/\s+/g, ' ');
	return canon(plannedValue) === canon(actualValue);
}
function monitorPlannedDisplay(key, value) {
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
function getTreatmentMonitorActual() {
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
function renderTreatmentMonitor() {
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
function getTreatmentFields() {
	if (!S.activeTreatmentCase) return [];
	if (Array.isArray(S.activeTreatmentCase.fields) && S.activeTreatmentCase.fields.length)
		return S.activeTreatmentCase.fields;
	const legacy = S.activeTreatmentCase.delivery || {
		field: 'Static field',
		mu: 100,
		doseRate: 600
	};
	return [
		{
			name: legacy.field || 'Static field',
			mu: legacy.mu || 100,
			doseRate: legacy.doseRate || 600,
			geometry: {}
		}
	];
}
function deliveryCasePlan() {
	const fields = getTreatmentFields();
	if (!fields.length)
		return {
			name: 'Static field',
			field: 'Static field',
			mu: 100,
			doseRate: 600,
			mode: 'STATIC',
			geometry: {}
		};
	const idx = Math.max(
		0,
		Math.min(fields.length - 1, Number(S.treatmentDelivery?.activeFieldIndex) || 0)
	);
	const f = fields[idx];
	return {
		...f,
		mode: String(f.mode || 'STATIC').toUpperCase(),
		field: f.name || f.field || `Field ${idx + 1}`,
		geometry: f.geometry || {}
	};
}
function isDynamicTreatmentField(field = deliveryCasePlan()) {
	return (
		['IMRT', 'VMAT'].includes(String(field?.mode || '').toUpperCase()) &&
		Array.isArray(field?.controlPoints) &&
		field.controlPoints.length > 1
	);
}
function deliveryProgressFraction(field = deliveryCasePlan()) {
	const total = Math.max(0.0001, Number(field?.mu) || 1);
	if (S.treatmentDelivery?.completed) return 1;
	return Math.max(0, Math.min(1, (Number(S.treatmentDelivery?.muDelivered) || 0) / total));
}
function arcAngularState(arc, fraction) {
	if (!arc) return null;
	const start = wrap360(Number(arc.start) || 0),
		stop = wrap360(Number(arc.stop) || 0),
		dir = String(arc.direction || 'CW').toUpperCase();
	let sweep = dir === 'CW' ? (start - stop + 360) % 360 : (stop - start + 360) % 360;
	if (arc.fullArc && sweep < 300) sweep += 360;
	const raw = dir === 'CW' ? start - sweep * fraction : start + sweep * fraction;
	return { angle: wrap360(raw), start, stop, direction: dir, sweep };
}
function getDynamicFieldState(
	field = deliveryCasePlan(),
	fraction = deliveryProgressFraction(field)
) {
	const mode = String(field?.mode || 'STATIC').toUpperCase();
	const cps =
		Array.isArray(field?.controlPoints) && field.controlPoints.length
			? field.controlPoints
			: [
					{
						muFraction: 0,
						mlcAperture: parseFirstNumber(field?.geometry?.mlcAperture) || fundamentalState.mlc,
						mlcShape: field?.geometry?.mlcShape || fundamentalState.mlcShape,
						doseRate: Number(field?.doseRate) || 600
					}
				];
	const f = Math.max(0, Math.min(1, Number(fraction) || 0));
	let lo = cps[0],
		hi = cps[cps.length - 1],
		loIdx = 0,
		hiIdx = cps.length - 1;
	for (let i = 0; i < cps.length; i++) {
		if ((Number(cps[i].muFraction) || 0) <= f) {
			lo = cps[i];
			loIdx = i;
		}
		if ((Number(cps[i].muFraction) || 0) >= f) {
			hi = cps[i];
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
			hiIdx = i;
			break;
		}
	}
	const lf = Number(lo.muFraction) || 0,
		hf = Number(hi.muFraction) || lf;
	const t = hf > lf ? Math.max(0, Math.min(1, (f - lf) / (hf - lf))) : 0;
	const lerp = (a, b) => Number(a) + (Number(b) - Number(a)) * t;
	const baseA = parseFirstNumber(field?.geometry?.mlcAperture) || fundamentalState.mlc;
	const mlcA = Number.isFinite(Number(lo.mlcAperture)) ? Number(lo.mlcAperture) : baseA;
	const mlcB = Number.isFinite(Number(hi.mlcAperture)) ? Number(hi.mlcAperture) : mlcA;
	const drA = Number.isFinite(Number(lo.doseRate))
		? Number(lo.doseRate)
		: Number(field?.doseRate) || 600;
	const drB = Number.isFinite(Number(hi.doseRate)) ? Number(hi.doseRate) : drA;
	const arc = mode === 'VMAT' ? arcAngularState(field.arc, f) : null;
	const gantry = arc
		? arc.angle
		: (normalizeAngleValue(field?.geometry?.gantry) ?? fundamentalState.gantry);
	const cpIdx = Math.max(0, Math.min(cps.length - 1, loIdx));
	return {
		mode,
		fraction: f,
		gantry,
		collimator: normalizeAngleValue(field?.geometry?.collimator) ?? fundamentalState.collimator,
		mlcAperture: lerp(mlcA, mlcB),
		mlcShape: lo.mlcShape || field?.geometry?.mlcShape || 'Conformal',
		doseRate: lerp(drA, drB),
		controlPointIndex: cpIdx,
		controlPointCount: cps.length,
		arc
	};
}
function getCurrentPlannedParameters() {
	const base = { couchAngle: '0°', ...(S.activeTreatmentCase?.planned || {}) };
	const field = deliveryCasePlan();
	let geometry = { ...(field.geometry || {}) };
	if (
		isDynamicTreatmentField(field) &&
		(S.treatmentDelivery?.delivering || S.treatmentDelivery?.held || S.treatmentDelivery?.completed)
	) {
		const d = getDynamicFieldState(field);
		geometry = {
			...geometry,
			gantry: `${d.gantry}°`,
			collimator: `${d.collimator}°`,
			mlcAperture: `${Number(d.mlcAperture.toFixed(2))} cm`,
			mlcShape: d.mlcShape
		};
	}
	const merged = { ...base, ...geometry };
	const ss = activeSpecialSetupSpec();
	if (field?.electron && String(ss?.type || '').toUpperCase() === 'ELECTRON')
		merged.electronAccessory = `${ss.shape} ${ss.widthCm} × ${ss.heightCm} cm · ${ss.cone}`;
	return merged;
}
function applyDynamicDeliveryMachineState(
	field = deliveryCasePlan(),
	fraction = deliveryProgressFraction(field)
) {
	if (!isDynamicTreatmentField(field)) return getDynamicFieldState(field, fraction);
	const d = getDynamicFieldState(field, fraction);
	S.treatmentDelivery.dynamicFraction = d.fraction;
	S.treatmentDelivery.controlPointIndex = d.controlPointIndex;
	if (d.mode === 'VMAT') {
		fundamentalState.gantry = d.gantry;
		if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z = -((d.gantry * Math.PI) / 180);
	}
	fundamentalState.mlc = Number(d.mlcAperture.toFixed(2));
	fundamentalState.mlcShape = d.mlcShape;
	updateMLCPositions();
	setTextById('pendantGantryReadout', `${Number(wrap360(fundamentalState.gantry).toFixed(1))}°`);
	setTextById('pendantMLCReadout', `${Number(fundamentalState.mlc.toFixed(1))} cm`);
	setTextById('hudGantry', `${Number(wrap360(fundamentalState.gantry).toFixed(1))}°`);
	setTextById(
		'hudMLC',
		`${Number(fundamentalState.mlc.toFixed(1))} cm · ${fundamentalState.mlcShape}`
	);
	updateBEVInset();
	return d;
}
function populateDeliveryFieldSelect() {
	if (!deliveryFieldSelect) return;
	const fields = getTreatmentFields();
	deliveryFieldSelect.innerHTML = '';
	if (!fields.length) {
		const opt = document.createElement('option');
		opt.value = '0';
		opt.textContent = 'Load a patient case';
		deliveryFieldSelect.appendChild(opt);
		deliveryFieldSelect.disabled = true;
		return;
	}
	fields.forEach((f, i) => {
		const opt = document.createElement('option');
		opt.value = String(i);
		const gantry = f.geometry?.gantry
			? ` · G ${monitorPlannedDisplay('gantry', f.geometry.gantry)}`
			: '';
		const couch =
			f.geometry?.couchAngle != null
				? ` · T ${monitorPlannedDisplay('couchAngle', f.geometry.couchAngle)}`
				: '';
		const mode = String(f.mode || 'STATIC').toUpperCase();
		const dyn =
			mode === 'VMAT'
				? ` · ${String(f.arc?.direction || 'CW').toUpperCase()} ARC`
				: mode === 'IMRT'
					? ' · IMRT'
					: '';
		const done = S.treatmentDelivery.completedFields[i] ? ' ✓' : '';
		opt.textContent = `${i + 1}. ${f.name || f.field || `Field ${i + 1}`}${gantry}${couch}${dyn}${done}`;
		deliveryFieldSelect.appendChild(opt);
	});
	S.treatmentDelivery.activeFieldIndex = Math.max(
		0,
		Math.min(fields.length - 1, Number(S.treatmentDelivery.activeFieldIndex) || 0)
	);
	deliveryFieldSelect.value = String(S.treatmentDelivery.activeFieldIndex);
	deliveryFieldSelect.disabled = !!S.treatmentDelivery.delivering;
}

function activeSpecialSetupSpec() {
	return S.activeTreatmentCase?.specialSetup || null;
}
function specialSetupRequired() {
	return !!activeSpecialSetupSpec();
}
function specialSetupVerified() {
	return !specialSetupRequired() || !!S.specialSetupWorkflow.verified;
}
function specialRndNonzero() {
	const a = [-3, -2, -1, 1, 2, 3];
	return a[Math.floor(Math.random() * a.length)];
}
function resetSpecialSetupForCase() {
	const s = activeSpecialSetupSpec();
	S.specialSetupWorkflow = {
		type: String(s?.type || 'NONE'),
		verified: false,
		breastOffset: s ? specialRndNonzero() : 0,
		csiJunctionA: specialRndNonzero(),
		csiJunctionB: specialRndNonzero(),
		electron: {
			shape: '',
			width: 0,
			height: 0,
			cone: '',
			template: false,
			fabricated: false,
			mounted: false,
			bolusShape: String(s?.shape || 'Oval'),
			bolusWidth: Number(s?.widthCm) || 6,
			bolusHeight: Number(s?.heightCm) || 4,
			bolusThickness: Number(s?.bolusThicknessCm) || 0.5,
			bolusPlaced: false,
			airGapMm: 4,
			bolusDragX: 54,
			bolusDragY: 92,
			bolusContactY: 38,
			bolusPositionOK: false,
			bolusAirGapOK: false,
			bolusLogged: false
		}
	};
	specialSetupLaunchButton?.classList.toggle('case-active', !!s);
	renderSpecialSetupPanel();
	updateElectronApplicator3D();
	updateSpecialAnatomyTargetMarker();
	updateElectronBolusMesh();
}
function specialMatchStatus(v, tol = 1) {
	return Math.abs(Number(v) || 0) <= tol;
}
function breastMatchDiagram() {
	const v = S.specialSetupWorkflow.breastOffset,
		scale = 8,
		y = 82,
		scvEdge = y - (v * scale) / 2,
		tanEdge = y + (v * scale) / 2,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
		gap = Math.abs(tanEdge - scvEdge),
		overlap = v < 0;
	return `<div class="special-diagram"><svg viewBox="0 0 500 165" aria-label="Supraclavicular tangent matchline diagram"><rect width="500" height="165" fill="#070b10"/><text x="18" y="22" fill="#d7e8f3" font-size="12" font-family="Consolas">SCV / TANGENT JUNCTION</text><rect x="55" y="34" width="390" height="${Math.max(8, scvEdge - 34)}" fill="#365f88" opacity=".68"/><rect x="55" y="${tanEdge}" width="390" height="${Math.max(8, 145 - tanEdge)}" fill="#8b4f68" opacity=".68"/><line x1="45" y1="82" x2="455" y2="82" stroke="#42d9ef" stroke-dasharray="4 4"/><text x="460" y="86" fill="#42d9ef" font-size="10">PLAN</text><line x1="55" y1="${scvEdge}" x2="445" y2="${scvEdge}" stroke="#a6d2ff" stroke-width="2"/><line x1="55" y1="${tanEdge}" x2="445" y2="${tanEdge}" stroke="#ff9fcb" stroke-width="2"/><text x="70" y="54" fill="#d9edff" font-size="11">SUPRACLAV AP</text><text x="70" y="137" fill="#ffd7e8" font-size="11">BREAST TANGENTS</text><text x="250" y="158" text-anchor="middle" fill="${specialMatchStatus(v) ? '#80e2a4' : '#ff8b97'}" font-size="12" font-weight="700">${v === 0 ? '0 mm · MATCHED' : `${Math.abs(v)} mm ${overlap ? 'OVERLAP' : 'GAP'}`}</text></svg></div>`;
}
function csiDiagram() {
	const a = S.specialSetupWorkflow.csiJunctionA,
		b = S.specialSetupWorkflow.csiJunctionB;
	return `<div class="special-diagram"><svg viewBox="0 0 500 165" aria-label="Craniospinal field junction diagram"><rect width="500" height="165" fill="#070b10"/><text x="18" y="21" fill="#d7e8f3" font-size="12" font-family="Consolas">CRANIOSPINAL FIELD STATIONS</text><rect x="65" y="34" width="120" height="36" rx="8" fill="#375f87"/><rect x="190" y="34" width="120" height="70" rx="8" fill="#506f5c"/><rect x="315" y="34" width="120" height="108" rx="8" fill="#77546e"/><text x="125" y="56" text-anchor="middle" fill="#fff" font-size="10">CRANIAL</text><text x="250" y="56" text-anchor="middle" fill="#fff" font-size="10">UPPER SPINE</text><text x="375" y="56" text-anchor="middle" fill="#fff" font-size="10">LOWER SPINE</text><line x1="187" y1="30" x2="187" y2="148" stroke="${specialMatchStatus(a) ? '#52df91' : '#ff6674'}" stroke-width="3"/><line x1="312" y1="30" x2="312" y2="148" stroke="${specialMatchStatus(b) ? '#52df91' : '#ff6674'}" stroke-width="3"/><text x="187" y="158" text-anchor="middle" fill="#d8e5ec" font-size="10">J1 ${a === 0 ? '0' : (a > 0 ? '+' : '') + a} mm</text><text x="312" y="158" text-anchor="middle" fill="#d8e5ec" font-size="10">J2 ${b === 0 ? '0' : (b > 0 ? '+' : '') + b} mm</text></svg></div>`;
}
function electronDiagram() {
	const e = S.specialSetupWorkflow.electron,
		s = activeSpecialSetupSpec();
	const w = (Number(e.width) || Number(s?.widthCm) || 6) * 11,
		h = (Number(e.height) || Number(s?.heightCm) || 4) * 11;
	const shape = String(e.shape || s?.shape || 'Oval');
	const aperture =
		shape === 'Rectangle'
			? `<rect x="${250 - w / 2}" y="${82 - h / 2}" width="${w}" height="${h}" fill="#122a31" stroke="#5bd9e9" stroke-width="3"/>`
			: `<ellipse cx="250" cy="82" rx="${w / 2}" ry="${h / 2}" fill="#122a31" stroke="#5bd9e9" stroke-width="3"/>`;
	return `<div class="special-diagram"><svg viewBox="0 0 500 165" aria-label="Electron cutout template"><rect width="500" height="165" fill="#070b10"/><rect x="155" y="25" width="190" height="115" rx="7" fill="#55545a" stroke="#8b8d93" stroke-width="2"/><text x="250" y="18" text-anchor="middle" fill="#e8edf1" font-size="11">ELECTRON INSERT · BEAM'S EYE VIEW</text>${aperture}<line x1="250" y1="37" x2="250" y2="127" stroke="#7b8791" stroke-dasharray="3 3"/><line x1="190" y1="82" x2="310" y2="82" stroke="#7b8791" stroke-dasharray="3 3"/><text x="250" y="155" text-anchor="middle" fill="${e.mounted ? '#70e3a0' : '#c7a8bb'}" font-size="11">${shape} · ${Number(e.width) || s?.widthCm || 6} × ${Number(e.height) || s?.heightCm || 4} cm · ${e.mounted ? 'MOUNTED / VERIFIED' : 'WORKFLOW IN PROGRESS'}</text></svg></div>`;
}
function renderSpecialSetupPanel() {
	if (!specialSetupPanel) return;
	const s = activeSpecialSetupSpec();
	setTextById(
		'specialSetupPatient',
		S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
			: 'No special case'
	);
	setTextById('specialSetupTechnique', s?.label || 'Not prescribed');
	setTextById(
		'specialSetupVerified',
		!s ? 'N/A' : S.specialSetupWorkflow.verified ? 'VERIFIED' : 'NOT VERIFIED'
	);
	const title = document.getElementById('specialSetupTitle'),
		sub = document.getElementById('specialSetupSubtitle'),
		status = document.getElementById('specialSetupStatus');
	if (!s) {
		if (title) title.textContent = 'Matchline / CSI / Electron Setup';
		if (sub) sub.textContent = 'Complete the technique-specific setup before beam enable.';
		if (specialSetupContent)
			specialSetupContent.innerHTML =
				'<div class="special-card"><h4>No special setup prescribed</h4><p>Select the 3-field breast, craniospinal, or electron-cutout patient.</p></div>';
		if (status) {
			status.className = '';
			status.textContent = 'No special setup is required for this patient.';
		}
		return;
	}
	const type = String(s.type || '').toUpperCase();
	if (type === 'BREAST_MATCH') {
		if (title) title.textContent = 'Three-Field Breast Matchline';
		if (sub)
			sub.textContent =
				'Supraclavicular field + tangents · recognize and correct gap/overlap at the junction.';
		const ok = specialMatchStatus(S.specialSetupWorkflow.breastOffset, Number(s.toleranceMm) || 1);
		specialSetupContent.innerHTML = `${breastMatchDiagram()}<div class="special-card"><h4>Junction adjustment</h4><div class="special-junction-readout ${ok ? 'good' : 'bad'}">${S.specialSetupWorkflow.breastOffset === 0 ? '0 mm · MATCHED' : `${S.specialSetupWorkflow.breastOffset > 0 ? '+' : ''}${S.specialSetupWorkflow.breastOffset} mm · ${S.specialSetupWorkflow.breastOffset > 0 ? 'GAP' : 'OVERLAP'}`}</div><p>Use the simulated field-edge adjustment to bring the SCV inferior edge and tangent superior edge to the planned matchline. Acceptable teaching tolerance: ±${s.toleranceMm || 1} mm.</p><div class="special-actions"><button data-special="breast-minus">−1 mm edge</button><button data-special="breast-plus">+1 mm edge</button><button data-special="breast-verify">Verify Matchline</button></div></div><div class="special-card"><h4>Planned fields</h4><p><b>SCV AP:</b> G0° · T0° · couch V/L/L 0/0/0. <b>Medial tangent:</b> G300° · T355° · LNG +2 mm. <b>Lateral tangent:</b> G120° · T5° · LNG +2 mm. The two-isocenter teaching model places the SCV reference near the SC-joint/low-neck region and shifts the tangents inferiorly to the breast/chest-wall isocenter. The tangent couch kicks model divergence matching; exact clinical values are plan-derived.</p><div class="special-checks"><label><input id="specialCheckIndex" type="checkbox" ${S.specialSetupWorkflow.indexChecked ? 'checked' : ''}> Patient/board indexing and arm position verified.</label><label><input id="specialCheckMatchDoc" type="checkbox" ${S.specialSetupWorkflow.matchDoc ? 'checked' : ''}> Junction location, half-beam field-edge concept, and tangent couch kicks reviewed.</label></div></div>`;
		if (status) {
			status.className = S.specialSetupWorkflow.verified ? 'good' : ok ? '' : 'bad';
			status.textContent = S.specialSetupWorkflow.verified
				? 'MATCHLINE VERIFIED · SCV and tangents may proceed without changing the verified patient setup.'
				: ok
					? 'Junction is within tolerance. Complete the indexing/documentation checks and verify the matchline.'
					: 'Adjust the junction before treatment: positive = gap, negative = overlap.';
		}
	} else if (type === 'CSI') {
		if (title) title.textContent = 'Total Craniospinal Setup';
		if (sub)
			sub.textContent =
				'Cranial + upper spine + lower spine · multi-isocenter indexing and two junctions.';
		const aok = specialMatchStatus(S.specialSetupWorkflow.csiJunctionA, s.toleranceMm || 1),
			bok = specialMatchStatus(S.specialSetupWorkflow.csiJunctionB, s.toleranceMm || 1);
		specialSetupContent.innerHTML = `${csiDiagram()}<div class="special-card"><h4>Field-junction management</h4><div class="special-grid"><div class="special-control"><label>Junction 1 <b>${S.specialSetupWorkflow.csiJunctionA > 0 ? '+' : ''}${S.specialSetupWorkflow.csiJunctionA} mm</b></label><div class="special-actions"><button data-special="csi-a-minus">−1</button><button data-special="csi-a-plus">+1</button><button data-special="csi-a-zero">0</button></div></div><div class="special-control"><label>Junction 2 <b>${S.specialSetupWorkflow.csiJunctionB > 0 ? '+' : ''}${S.specialSetupWorkflow.csiJunctionB} mm</b></label><div class="special-actions"><button data-special="csi-b-minus">−1</button><button data-special="csi-b-plus">+1</button><button data-special="csi-b-zero">0</button></div></div></div><p>J1 = cranial/upper-spine junction. J2 = upper/lower-spine junction. Green indicates ±${s.toleranceMm || 1} mm teaching tolerance.</p><p><b>Teaching field geometry:</b> Right cranial lateral G270° / C5° / T355°; Left cranial lateral G90° / C355° / T5°. Upper spine PA uses LNG +6 mm; lower spine PA uses LNG +12 mm. The ±5° cranial rotations represent plan-derived divergence matching; the source notes the couch kick is approximately 5° but the exact collimator/couch values depend on field length and planning geometry.</p></div><div class="special-card"><h4>Indexed setup verification</h4><div class="special-checks"><label><input id="specialCheckCranial" type="checkbox" ${S.specialSetupWorkflow.cranialIndex ? 'checked' : ''}> Cranial immobilization/head position and index verified.</label><label><input id="specialCheckSpine" type="checkbox" ${S.specialSetupWorkflow.spineIndex ? 'checked' : ''}> Upper/lower spinal station indexing verified.</label><label><input id="specialCheckCSIPlan" type="checkbox" ${S.specialSetupWorkflow.csiPlan ? 'checked' : ''}> Cranial laterals and PA spine geometry reviewed, including the cranial couch/collimator divergence match.</label></div><div class="special-actions" style="margin-top:7px"><button data-special="csi-verify" style="grid-column:1/-1">Verify CSI Setup & Junctions</button></div></div>`;
		if (status) {
			status.className = S.specialSetupWorkflow.verified ? 'good' : !aok || !bok ? 'bad' : '';
			status.textContent = S.specialSetupWorkflow.verified
				? 'CSI SETUP VERIFIED · both junctions and indexed treatment stations are approved.'
				: !aok || !bok
					? 'One or both field junctions remain outside tolerance. Correct them before treatment.'
					: 'Both junctions are within tolerance. Complete the indexing/beam-orientation checks and verify.';
		}
	} else if (type === 'ELECTRON') {
		if (title) title.textContent = 'Electron Cutout Creation & Fabrication';
		if (sub)
			sub.textContent =
				'Design → template → safe simulated fabrication → mount / label. Bolus placement occurs later in Treatment Delivery.';
		const e = S.specialSetupWorkflow.electron;
		specialSetupContent.innerHTML = `${electronDiagram()}<div class="special-card"><h4>Prescription / accessory order</h4><p><b>${S.activeTreatmentCase.energy}</b> · ${s.cone} electron cone · ${s.shape} cutout ${s.widthCm} × ${s.heightCm} cm · nominal SSD ${s.ssdCm} cm.</p><p><b>Patient position:</b> breast-treatment posture with arms elevated; the left chest-wall scar is centered to the electron central ray. Use an en-face 0° beam so the cone/cutout face is parallel to the treated surface.</p><div class="special-grid"><div class="special-control"><label>Cutout shape</label><select id="electronShape"><option>Oval</option><option>Rectangle</option><option>Circle</option></select></div><div class="special-control"><label>Electron cone</label><select id="electronCone"><option>6 × 6 cm</option><option>10 × 10 cm</option><option>15 × 15 cm</option></select></div><div class="special-control"><label>Opening width</label><select id="electronWidth">${[4, 5, 6, 7, 8].map((v) => `<option value="${v}">${v} cm</option>`).join('')}</select></div><div class="special-control"><label>Opening height</label><select id="electronHeight">${[3, 4, 5, 6, 7].map((v) => `<option value="${v}">${v} cm</option>`).join('')}</select></div></div><div class="special-actions" style="margin-top:7px"><button data-special="electron-template">Create Template</button><button data-special="electron-fabricate">Fabricate Cutout</button><button data-special="electron-mount">Mount & Verify</button></div></div><div class="special-card"><h4>Fabrication / accessory safety verification</h4><div class="special-checks"><label><input id="electronCheckPPE" type="checkbox" ${S.specialSetupWorkflow.ePPE ? 'checked' : ''}> Required PPE, ventilation, and local low-melting-alloy handling procedure confirmed.</label><label><input id="electronCheckCool" type="checkbox" ${S.specialSetupWorkflow.eCool ? 'checked' : ''}> Insert completely cooled/solidified before handling and mounting.</label><label><input id="electronCheckLabel" type="checkbox" ${S.specialSetupWorkflow.eLabel ? 'checked' : ''}> Patient, site, energy/cone, orientation, and cutout identity labeled.</label><label><input id="electronCheckLight" type="checkbox" ${S.specialSetupWorkflow.eLight ? 'checked' : ''}> Light-field/skin-mark fit and cutout orientation verified before beam delivery.</label></div><p><b>ODI/SSD:</b> ${S.odiOn && S.lastODIcm != null ? `SSD ${S.lastODIcm.toFixed(1)} cm · active` : 'Turn ODI ON and obtain a valid surface reading before mounting the insert.'}</p><p>${e.mounted ? 'The 3D treatment head now shows the mounted electron applicator/cone and insert tray. Bolus has not yet been applied; that is a separate in-room task in Delivery.' : 'After successful mount & verify, the room view will display the mounted electron applicator/cone beneath the treatment head.'}</p><div class="special-step ${e.template ? 'done' : ''}">1 · Template ${e.template ? 'created' : 'pending'}</div><div class="special-step ${e.fabricated ? 'done' : ''}">2 · Cutout ${e.fabricated ? 'fabricated/cooled' : 'pending fabrication'}</div><div class="special-step ${e.mounted ? 'done' : ''}">3 · Insert ${e.mounted ? 'mounted and verified' : 'pending mount/verification'}</div><div class="special-step">4 · Bolus placement · performed at treatment delivery</div></div>`;
		const sh = document.getElementById('electronShape'),
			co = document.getElementById('electronCone'),
			wi = document.getElementById('electronWidth'),
			he = document.getElementById('electronHeight');
		if (sh) sh.value = e.shape || s.shape;
		if (co) co.value = e.cone || s.cone;
		if (wi) wi.value = String(e.width || s.widthCm);
		if (he) he.value = String(e.height || s.heightCm);
		if (status) {
			status.className = S.specialSetupWorkflow.verified
				? 'good'
				: e.fabricated && !e.mounted
					? 'bad'
					: '';
			status.textContent = S.specialSetupWorkflow.verified
				? 'ELECTRON CUTOUT VERIFIED · fabrication, accessory identity, fit, orientation, and mounting complete. Proceed to Delivery for bolus placement.'
				: e.fabricated
					? 'Fabrication complete. Complete the safety/label/fit checks and mount the insert.'
					: 'Create the prescribed template, then complete the simulated fabrication and verification workflow.';
		}
	}
}
function syncSpecialCheckboxes() {
	const by = (id) => !!document.getElementById(id)?.checked;
	S.specialSetupWorkflow.indexChecked = by('specialCheckIndex');
	S.specialSetupWorkflow.matchDoc = by('specialCheckMatchDoc');
	S.specialSetupWorkflow.cranialIndex = by('specialCheckCranial');
	S.specialSetupWorkflow.spineIndex = by('specialCheckSpine');
	S.specialSetupWorkflow.csiPlan = by('specialCheckCSIPlan');
	S.specialSetupWorkflow.ePPE = by('electronCheckPPE');
	S.specialSetupWorkflow.eCool = by('electronCheckCool');
	S.specialSetupWorkflow.eLabel = by('electronCheckLabel');
	S.specialSetupWorkflow.eLight = by('electronCheckLight');
	const e = S.specialSetupWorkflow.electron;
	if (e) {
		const sh = document.getElementById('electronShape'),
			co = document.getElementById('electronCone'),
			wi = document.getElementById('electronWidth'),
			he = document.getElementById('electronHeight');
		if (sh) e.shape = sh.value;
		if (co) e.cone = co.value;
		if (wi) e.width = Number(wi.value) || 0;
		if (he) e.height = Number(he.value) || 0;
	}
}
function handleSpecialSetupAction(action) {
	const s = activeSpecialSetupSpec();
	if (!s) return;
	syncSpecialCheckboxes();
	const type = String(s.type || '').toUpperCase();
	if (type === 'BREAST_MATCH') {
		if (action === 'breast-minus') {
			S.specialSetupWorkflow.breastOffset = Math.max(-5, S.specialSetupWorkflow.breastOffset - 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'breast-plus') {
			S.specialSetupWorkflow.breastOffset = Math.min(5, S.specialSetupWorkflow.breastOffset + 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'breast-verify')
			S.specialSetupWorkflow.verified =
				specialMatchStatus(S.specialSetupWorkflow.breastOffset, s.toleranceMm || 1) &&
				S.specialSetupWorkflow.indexChecked &&
				S.specialSetupWorkflow.matchDoc;
	} else if (type === 'CSI') {
		if (action === 'csi-a-minus') {
			S.specialSetupWorkflow.csiJunctionA = Math.max(-5, S.specialSetupWorkflow.csiJunctionA - 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-a-plus') {
			S.specialSetupWorkflow.csiJunctionA = Math.min(5, S.specialSetupWorkflow.csiJunctionA + 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-a-zero') {
			S.specialSetupWorkflow.csiJunctionA = 0;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-b-minus') {
			S.specialSetupWorkflow.csiJunctionB = Math.max(-5, S.specialSetupWorkflow.csiJunctionB - 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-b-plus') {
			S.specialSetupWorkflow.csiJunctionB = Math.min(5, S.specialSetupWorkflow.csiJunctionB + 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-b-zero') {
			S.specialSetupWorkflow.csiJunctionB = 0;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-verify')
			S.specialSetupWorkflow.verified =
				specialMatchStatus(S.specialSetupWorkflow.csiJunctionA, s.toleranceMm || 1) &&
				specialMatchStatus(S.specialSetupWorkflow.csiJunctionB, s.toleranceMm || 1) &&
				S.specialSetupWorkflow.cranialIndex &&
				S.specialSetupWorkflow.spineIndex &&
				S.specialSetupWorkflow.csiPlan;
	} else if (type === 'ELECTRON') {
		const e = S.specialSetupWorkflow.electron;
		const shape = document.getElementById('electronShape')?.value || '';
		const cone = document.getElementById('electronCone')?.value || '';
		const width = Number(document.getElementById('electronWidth')?.value) || 0;
		const height = Number(document.getElementById('electronHeight')?.value) || 0;
		e.shape = shape;
		e.cone = cone;
		e.width = width;
		e.height = height;
		if (action === 'electron-template') {
			e.template = true;
			e.fabricated = false;
			e.mounted = false;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'electron-fabricate') {
			if (e.template) e.fabricated = true;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'electron-mount') {
			const dims =
				shape === s.shape &&
				cone === s.cone &&
				Math.abs(width - s.widthCm) < 0.01 &&
				Math.abs(height - s.heightCm) < 0.01;
			const checks =
				S.specialSetupWorkflow.ePPE &&
				S.specialSetupWorkflow.eCool &&
				S.specialSetupWorkflow.eLabel &&
				S.specialSetupWorkflow.eLight &&
				S.odiOn &&
				S.lastODIcm != null;
			if (e.template && e.fabricated && dims && checks) {
				e.mounted = true;
				S.specialSetupWorkflow.verified = true;
				e.bolusPlaced = false;
				e.airGapMm = 4;
				e.bolusDragX = 54;
				e.bolusDragY = 92;
				e.bolusContactY = 38;
				e.bolusPositionOK = false;
				e.bolusAirGapOK = false;
				e.bolusLogged = false;
			} else {
				e.mounted = false;
				S.specialSetupWorkflow.verified = false;
			}
			updateElectronBolusMesh();
		}
	}
	renderSpecialSetupPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	updateBEVInset();
	updateElectronApplicator3D();
	updateElectronBolusMesh();
}

function activeSRSConfig() {
	return S.activeTreatmentCase?.stereotactic || null;
}
function srsRequired() {
	return !!activeSRSConfig();
} // internal: any stereotactic SRS/SBRT workflow
function cranialSRSRequired() {
	return String(activeSRSConfig()?.type || '').toUpperCase() === 'SRS';
}
function sbrtRequired() {
	return String(activeSRSConfig()?.type || '').toUpperCase() === 'SBRT';
}
function stereotacticCaseLabel() {
	return sbrtRequired() ? 'SBRT' : cranialSRSRequired() ? 'SRS' : 'STEREOTACTIC';
}
function activeIGRTTolerances() {
	const s = activeSRSConfig();
	return {
		translation: Number(s?.translationTolerance ?? 1),
		rotation: Number(s?.rotationTolerance ?? 0.5)
	};
}
function resetSRSWorkflowForCase() {
	S.srsWorkflow = {
		dryRunByField: {},
		timeoutVerifiedByField: {},
		lastClearance: null,
		dryRunning: false
	};
	['srsCheckPatient', 'srsCheckRx', 'srsCheckMask', 'srsCheckTeam'].forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.checked = false;
	});
	srsLaunchButton?.classList.toggle('case-active', srsRequired());
	renderSRSPanel();
}
function srsCurrentFieldGeometryOK() {
	return deliveryGeometryChecks().every((x) => x.ok);
}
function srsChecklistData() {
	const field = deliveryCasePlan(),
		idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		tol = activeIGRTTolerances();
	const couchPlan = monitorPlannedDisplay(
		'couchAngle',
		getCurrentPlannedParameters().couchAngle || '0°'
	);
	const rows = [
		{
			name: 'Stereotactic 6DOF alignment',
			ok: igrtAlignmentReadyForDelivery(),
			detail: S.clinicalIGRT?.verified
				? `≤${tol.translation} mm / ≤${tol.rotation}°`
				: 'Complete high-precision IGRT'
		},
		{
			name: 'Imaging hardware retracted',
			ok: !S.kvOn && !S.detectorExtended,
			detail: !S.kvOn && !S.detectorExtended ? 'kV + MV stowed' : 'Retract imaging hardware'
		}
	];
	if (sbrtRequired())
		rows.push({
			name: '4D respiratory management',
			ok: !!S.motionManagement?.verified,
			detail: S.motionManagement?.verified
				? `Gate ${S.motionManagement.gateLow}–${S.motionManagement.gateHigh}% approved`
				: 'Complete 4D motion verification'
		});
	rows.push(
		{
			name: 'Selected field start geometry',
			ok: srsCurrentFieldGeometryOK(),
			detail: `${field.field} · G ${monitorPlannedDisplay('gantry', getCurrentPlannedParameters().gantry)} · T ${couchPlan}`
		},
		{
			name: 'Arc collision / trajectory clearance',
			ok: !!S.srsWorkflow.dryRunByField[idx] || clearanceOverrideActive(idx),
			detail: S.srsWorkflow.dryRunByField[idx]
				? clearanceOverrideActive(idx)
					? 'Beam-off trajectory completed · clearance proxy overridden'
					: 'Selected arc clear'
				: clearanceOverrideActive(idx)
					? 'Trajectory interlock cleared by simulation override · OIS sign-off required'
					: 'Dry run required'
		},
		{
			name: `${stereotacticCaseLabel()} timeout approval`,
			ok: !!S.srsWorkflow.timeoutVerifiedByField[idx],
			detail: S.srsWorkflow.timeoutVerifiedByField[idx]
				? 'Approved for this arc'
				: 'Final timeout required'
		}
	);
	return rows;
}
function renderSRSPanel() {
	if (!srsPanel) return;
	const config = activeSRSConfig(),
		field = deliveryCasePlan(),
		idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		tol = activeIGRTTolerances(),
		type = stereotacticCaseLabel();
	setTextById(
		'stereoEyebrow',
		sbrtRequired()
			? 'STEREOTACTIC BODY RADIATION THERAPY'
			: cranialSRSRequired()
				? 'STEREOTACTIC RADIOSURGERY'
				: 'STEREOTACTIC RADIATION THERAPY'
	);
	setTextById(
		'stereoTitle',
		sbrtRequired()
			? 'SBRT Precision & Motion-Managed Delivery'
			: cranialSRSRequired()
				? 'SRS Precision & Noncoplanar Delivery'
				: 'SRS / SBRT Precision Delivery'
	);
	setTextById(
		'stereoSubtitle',
		sbrtRequired()
			? 'High-precision IGRT + 4D motion verification → arc clearance → SBRT timeout → gated VMAT delivery.'
			: 'High-precision IGRT → prescribed couch angle → collision dry run → stereotactic timeout → beam delivery.'
	);
	setTextById(
		'srsPatient',
		config ? `${S.activeTreatmentCase.patient} · ${field.field}` : 'No stereotactic case'
	);
	setTextById('srsTolerance', config ? `±${tol.translation} mm / ±${tol.rotation}°` : '—');
	setTextById(
		'srsCouchAngle',
		config
			? monitorPlannedDisplay('couchAngle', getCurrentPlannedParameters().couchAngle || '0°')
			: '—'
	);
	setTextById(
		'stereoPatientCheckLabel',
		sbrtRequired()
			? 'Correct patient, extracranial target site, and fraction independently verified.'
			: 'Correct patient, intracranial site, and fraction independently verified.'
	);
	setTextById(
		'stereoRxCheckLabel',
		`${type} prescription and high dose-per-fraction independently verified.`
	);
	setTextById(
		'stereoImmobilizationCheckLabel',
		config
			? `${config.immobilization || 'Immobilization'} and indexing verified.`
			: 'Immobilization and indexing verified.'
	);
	const foot = document.getElementById('stereoFootnote');
	if (foot)
		foot.innerHTML = sbrtRequired()
			? '<b>SBRT controls:</b> 6DOF rockers remain image-guided corrections. The planned treatment couch angle is independent. This lung SBRT case also requires verified 4D respiratory gating; beam delivery automatically holds outside the approved gate. Dry run checks the complete selected VMAT arc with beam off.'
			: '<b>SRS controls:</b> the 0.5° ROLL/PITCH/YAW rockers remain image-guided 6DOF corrections. The separate <b>TREATMENT COUCH</b> rocker changes the intentional noncoplanar table angle in 5° increments. Field selection never moves the machine automatically. A dry run uses the selected prescribed couch angle and sweeps the gantry with beam off, then returns the gantry to its planned start position.';
	const rx = document.getElementById('srsPrescription');
	if (rx)
		rx.innerHTML = config
			? `<b>${config.label}</b> · ${S.activeTreatmentCase.energy} · Fraction ${S.activeTreatmentCase.fraction}<br>Selected arc: <b>${field.field}</b> · Gantry ${monitorPlannedDisplay('gantry', field.geometry?.gantry)} · Couch ${monitorPlannedDisplay('couchAngle', field.geometry?.couchAngle || '0°')} · Collimator ${monitorPlannedDisplay('collimator', field.geometry?.collimator)} · ${field.mu} MU.`
			: 'Load an SRS or SBRT patient to begin.';
	const list = document.getElementById('srsChecklist');
	if (list)
		list.innerHTML = srsChecklistData()
			.map(
				(c) =>
					`<div class="srs-check ${c.ok ? 'good' : 'bad'}"><div class="lamp">${c.ok ? '✓' : '!'}</div><div class="name">${c.name}</div><div class="detail">${c.detail}</div></div>`
			)
			.join('');
	const status = document.getElementById('srsStatus');
	if (status) {
		status.className = '';
		if (!config) status.textContent = 'Load a stereotactic patient case.';
		else if (S.srsWorkflow.dryRunning)
			status.textContent =
				'DRY RUN IN PROGRESS · beam off · checking the selected treatment trajectory.';
		else if (S.srsWorkflow.timeoutVerifiedByField[idx]) {
			status.className = 'good';
			status.textContent = `${type} TIMEOUT APPROVED · selected arc is cleared for treatment delivery.`;
		} else if (S.srsWorkflow.lastClearance?.safe === false) {
			if (clearanceOverrideActive(idx)) {
				status.className = 'good';
				status.textContent = `SIMULATION CLEARANCE OVERRIDE ACTIVE · ${S.srsWorkflow.lastClearance.field || field.field} near gantry ${Number(S.srsWorkflow.lastClearance.angle || 0).toFixed(0)}° · OIS sign-off required.`;
			} else {
				status.className = 'bad';
				status.textContent = `CLEARANCE HOLD · ${S.srsWorkflow.lastClearance.field || field.field} near gantry ${Number(S.srsWorkflow.lastClearance.angle || 0).toFixed(0)}°.`;
			}
		} else
			status.textContent = sbrtRequired()
				? 'Complete stereotactic IGRT and 4D motion verification, establish the prescribed arc start geometry, perform the dry run, then approve the SBRT timeout.'
				: 'Complete stereotactic IGRT, set the prescribed couch/beam geometry, perform the dry run, then approve the timeout.';
	}
	if (srsDryRun)
		srsDryRun.disabled =
			!config ||
			S.srsWorkflow.dryRunning ||
			!S.clinicalIGRT?.verified ||
			S.kvOn ||
			S.detectorExtended ||
			!srsCurrentFieldGeometryOK();
	if (srsVerifyTimeout) srsVerifyTimeout.disabled = !config || S.srsWorkflow.dryRunning;
}
function recheckSRSClearance() {
	if (!srsRequired()) {
		setPendantLCD('STEREOTACTIC', 'Not prescribed for this case');
		renderSRSPanel();
		return;
	}
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
	const c = currentSelectedFieldClearance(TREATMENT_CLEARANCE_REQUIRED_MARGIN);
	S.srsWorkflow.lastClearance = c;
	if (c.safe) {
		setPendantLCD(
			`${stereotacticCaseLabel()} CLEARANCE`,
			`CLEAR · min ${(c.minMargin * 100).toFixed(1)} cm`
		);
	} else if (clearanceOverrideActive(idx)) {
		setPendantLCD(
			`${stereotacticCaseLabel()} OVERRIDE`,
			`TRAJECTORY INTERLOCK CLEARED · OIS SIGN-OFF`
		);
	} else {
		setPendantLCD(
			`${stereotacticCaseLabel()} CLEARANCE HOLD`,
			`${c.field} · G ${Number(c.angle).toFixed(0)}°`
		);
	}
	renderSRSPanel();
	renderTreatmentDeliveryPanel();
}
async function runSRSDryRun() {
	if (!srsRequired() || S.srsWorkflow.dryRunning) return;
	if (!S.clinicalIGRT?.verified || S.kvOn || S.detectorExtended || !srsCurrentFieldGeometryOK()) {
		setPendantLCD(`${stereotacticCaseLabel()} DRY RUN`, 'Complete IGRT / start geometry first');
		renderSRSPanel();
		return;
	}
	const field = deliveryCasePlan(),
		idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		overrideActive = clearanceOverrideActive(idx);
	const check = currentSelectedFieldClearance(TREATMENT_CLEARANCE_REQUIRED_MARGIN);
	S.srsWorkflow.lastClearance = check;
	if (!check.safe && !overrideActive) {
		S.srsWorkflow.dryRunByField[idx] = false;
		setPendantLCD(`${stereotacticCaseLabel()} DRY RUN`, 'HOLD · predicted collision');
		renderSRSPanel();
		renderTreatmentDeliveryPanel();
		return;
	}

	const samples = treatmentTrajectorySamples(field),
		start = normalizeAngleValue(field.geometry?.gantry) || 0;
	S.srsWorkflow.dryRunning = true;
	S.srsWorkflow.dryRunByField[idx] = false;
	S.srsWorkflow.timeoutVerifiedByField[idx] = false;
	setBeamState(false);
	renderSRSPanel();

	let encounteredOverrideClearance = false;
	let firstOverrideHit = null;
	for (let i = 0; i < samples.length; i++) {
		const a = samples[i].angle;
		fundamentalState.gantry = wrap360(a);
		if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z = -((a * Math.PI) / 180);
		syncFundamentalReadouts(
			`${stereotacticCaseLabel()} DRY RUN`,
			`G ${a.toFixed(0)}° · beam off${overrideActive ? ' · clearance override' : ''}`
		);
		S.scene?.updateMatrixWorld(true);
		const c = getCollisionAssessment();
		if (c && c.margin < TREATMENT_CLEARANCE_REQUIRED_MARGIN) {
			S.srsWorkflow.lastClearance = {
				safe: false,
				minMargin: c.margin,
				reason: c.reason,
				field: field.field,
				angle: a
			};
			if (!overrideActive) break;
			encounteredOverrideClearance = true;
			if (!firstOverrideHit) firstOverrideHit = { angle: a, reason: c.reason, margin: c.margin };
		}
		await new Promise((r) => setTimeout(r, 18));
	}

	fundamentalState.gantry = wrap360(start);
	if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z = -((start * Math.PI) / 180);
	S.srsWorkflow.dryRunning = false;

	const pass = S.srsWorkflow.lastClearance?.safe !== false || overrideActive;
	S.srsWorkflow.dryRunByField[idx] = pass;

	if (pass && encounteredOverrideClearance) {
		const detail = `${field.field} · beam-off trajectory completed under simulation clearance override${firstOverrideHit ? ` · first proxy hold near G ${Number(firstOverrideHit.angle).toFixed(0)}°` : ''}`;
		oisLogEvent(
			'OVERRIDE',
			'Stereotactic trajectory dry run completed under override',
			detail,
			`stereo-dryrun-override-${idx}`
		);
		setPendantLCD(`${stereotacticCaseLabel()} DRY RUN`, 'COMPLETE · TRAJECTORY OVERRIDE ACTIVE');
	} else {
		setPendantLCD(
			`${stereotacticCaseLabel()} DRY RUN`,
			pass ? 'CLEAR · returned to arc start' : 'HOLD · clearance issue'
		);
	}

	syncFundamentalReadouts();
	renderSRSPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}
function verifySRSTimeout() {
	if (!srsRequired()) return;
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
	const manual = ['srsCheckPatient', 'srsCheckRx', 'srsCheckMask', 'srsCheckTeam'].every(
		(id) => !!document.getElementById(id)?.checked
	);
	const auto =
		igrtAlignmentReadyForDelivery() &&
		(!sbrtRequired() || !!S.motionManagement?.verified) &&
		!S.kvOn &&
		!S.detectorExtended &&
		srsCurrentFieldGeometryOK() &&
		(!!S.srsWorkflow.dryRunByField[idx] || clearanceOverrideActive(idx));
	S.srsWorkflow.timeoutVerifiedByField[idx] = manual && auto;
	if (S.srsWorkflow.timeoutVerifiedByField[idx])
		oisLogEvent(
			'TIMEOUT',
			`${stereotacticCaseLabel()} timeout approved`,
			deliveryCasePlan()?.field || `Field ${idx + 1}`,
			`stereo-timeout-${idx}`
		);
	setPendantLCD(
		`${stereotacticCaseLabel()} TIMEOUT`,
		S.srsWorkflow.timeoutVerifiedByField[idx]
			? 'APPROVED · selected arc'
			: 'HOLD · complete checklist'
	);
	renderSRSPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}

function activeMotionSpec() {
	return S.activeTreatmentCase?.motionManagement || null;
}
function motionRequired() {
	return !!activeMotionSpec();
}
function configureMotionPatientVisuals() {
	const spec = activeMotionSpec();
	if (S.motionTarget3D) S.motionTarget3D.visible = !!spec;
	if (S.motionSurfaceMarker) S.motionSurfaceMarker.visible = !!spec;
	if (S.motionHeart3D) S.motionHeart3D.visible = !!spec && spec.type === 'DIBH';
	if (!spec) return;
	if (spec.type === 'DIBH') {
		if (S.motionTarget3D) {
			S.motionTarget3D.position.set(-0.14, 0.075, -0.45);
			S.motionTargetBase = S.motionTarget3D.position.clone();
		}
		if (S.motionSurfaceMarker) {
			S.motionSurfaceMarker.position.set(-0.15, 0.145, -0.45);
			S.motionSurfaceBase = S.motionSurfaceMarker.position.clone();
		}
		if (S.motionHeart3D) {
			S.motionHeart3D.position.set(-0.035, 0.035, -0.42);
			S.motionHeartBase = S.motionHeart3D.position.clone();
		}
	} else {
		if (S.motionTarget3D) {
			S.motionTarget3D.position.set(0.09, 0.02, -0.45);
			S.motionTargetBase = S.motionTarget3D.position.clone();
		}
		if (S.motionSurfaceMarker) {
			S.motionSurfaceMarker.position.set(0.09, 0.13, -0.45);
			S.motionSurfaceBase = S.motionSurfaceMarker.position.clone();
		}
		if (S.motionHeart3D) S.motionHeart3D.visible = false;
	}
}
function resetMotionManagementForCase() {
	const s = activeMotionSpec();
	S.motionManagement.required = !!s;
	S.motionManagement.mode = s?.type || 'NONE';
	S.motionManagement.acquired = false;
	S.motionManagement.verified = false;
	S.motionManagement.gateOpen = false;
	S.motionManagement.period = Number(s?.period) || 4.5;
	S.motionManagement.phase = 0;
	S.motionManagement.breathLevel = 45;
	S.motionManagement.excursionSI = Number(s?.siExcursion) || 0;
	S.motionManagement.excursionAP = Number(s?.apExcursion) || 0;
	S.motionManagement.excursionLR = Number(s?.lrExcursion) || 0;
	S.motionManagement.gateLow = Number(s?.gateLow ?? 40);
	S.motionManagement.gateHigh = Number(s?.gateHigh ?? 60);
	S.motionManagement.dibhTarget = Number(s?.dibhTarget ?? 80);
	S.motionManagement.dibhTolerance = Number(s?.dibhTolerance ?? 5);
	S.motionManagement.holdActive = false;
	S.motionManagement.holdStartedAt = 0;
	S.motionManagement.samples = [];
	S.motionManagement.trace = [];
	S.motionManagement.phaseData = [];
	S.motionManagement.lastFrame = performance.now();
	if (motionGateLow) motionGateLow.value = String(S.motionManagement.gateLow);
	if (motionGateHigh) motionGateHigh.value = String(S.motionManagement.gateHigh);
	if (motionDibhTarget) motionDibhTarget.value = String(S.motionManagement.dibhTarget);
	if (motionDibhTolerance) motionDibhTolerance.value = String(S.motionManagement.dibhTolerance);
	configureMotionPatientVisuals();
	renderMotionPanel(true);
}
function respiratoryValueFromPhase(phase) {
	return Math.cos(((Number(phase) || 0) / 100) * Math.PI * 2);
}
function motionConditionOpen() {
	if (!motionRequired()) return true;
	if (S.motionManagement.mode === 'DIBH')
		return (
			!!S.motionManagement.holdActive &&
			Math.abs(S.motionManagement.breathLevel - S.motionManagement.dibhTarget) <=
				S.motionManagement.dibhTolerance
		);
	const p = ((S.motionManagement.phase % 100) + 100) % 100;
	return p >= S.motionManagement.gateLow && p <= S.motionManagement.gateHigh;
}
function currentMotionGateOpen() {
	return !motionRequired() || (!!S.motionManagement.verified && motionConditionOpen());
}
function motion4DPhaseData() {
	const arr = [];
	for (let p = 0; p < 100; p += 10) {
		const wave = respiratoryValueFromPhase(p);
		arr.push({
			phase: p,
			si: (S.motionManagement.excursionSI / 2) * wave,
			ap: (S.motionManagement.excursionAP / 2) * wave,
			lr: (S.motionManagement.excursionLR / 2) * wave
		});
	}
	return arr;
}
function acquireMotionCharacterization() {
	if (!motionRequired()) {
		setPendantLCD('4D MOTION', 'Not prescribed for this case');
		renderMotionPanel();
		return;
	}
	if (S.motionManagement.mode === 'DIBH') {
		if (!S.motionManagement.holdActive || !motionConditionOpen()) {
			setPendantLCD('DIBH', 'Start a stable in-tolerance hold first');
			renderMotionPanel();
			return;
		}
		const sample = Number(S.motionManagement.breathLevel.toFixed(1));
		S.motionManagement.samples.push(sample);
		S.motionManagement.acquired = S.motionManagement.samples.length >= 3;
		setPendantLCD(
			'DIBH SAMPLE',
			`${sample.toFixed(1)}% · ${S.motionManagement.samples.length}/3 holds`
		);
	} else {
		S.motionManagement.phaseData = motion4DPhaseData();
		S.motionManagement.samples = S.motionManagement.phaseData.map((x) => x.si);
		S.motionManagement.acquired = true;
		setPendantLCD('4D ACQUIRED', `SI excursion ${S.motionManagement.excursionSI.toFixed(0)} mm`);
	}
	S.motionManagement.verified = false;
	renderMotionPanel(true);
	renderTreatmentDeliveryPanel();
}
function verifyMotionManagement() {
	if (!motionRequired()) {
		S.motionManagement.verified = true;
		renderMotionPanel();
		return;
	}
	if (S.motionManagement.mode === 'DIBH') {
		const need = Number(activeMotionSpec()?.practiceHolds) || 3;
		const recent = S.motionManagement.samples.slice(-need);
		const ok =
			recent.length >= need &&
			recent.every(
				(v) => Math.abs(v - S.motionManagement.dibhTarget) <= S.motionManagement.dibhTolerance
			);
		S.motionManagement.acquired = recent.length >= need;
		S.motionManagement.verified = ok;
		setPendantLCD(
			'DIBH VERIFICATION',
			ok ? 'PASS · reproducible holds' : 'HOLD · record 3 in-tolerance holds'
		);
	} else {
		const width = S.motionManagement.gateHigh - S.motionManagement.gateLow,
			containsEE = S.motionManagement.gateLow <= 50 && S.motionManagement.gateHigh >= 50;
		S.motionManagement.verified =
			!!S.motionManagement.acquired && width >= 10 && width <= 30 && containsEE;
		setPendantLCD(
			'4D GATE',
			S.motionManagement.verified
				? 'PASS · end-expiration gate approved'
				: 'HOLD · acquire 4D / review gate'
		);
	}
	if (S.motionManagement.verified)
		oisLogEvent(
			'MOTION',
			'Motion management verified',
			S.motionManagement.mode === 'DIBH'
				? `DIBH ${S.motionManagement.dibhTarget}% ±${S.motionManagement.dibhTolerance}%`
				: `Gate ${S.motionManagement.gateLow}–${S.motionManagement.gateHigh}%`,
			'motion-verified'
		);
	renderMotionPanel(true);
	renderTreatmentDeliveryPanel();
}
function startDIBHHold() {
	if (S.motionManagement.mode !== 'DIBH') return;
	S.motionManagement.holdActive = true;
	S.motionManagement.holdStartedAt = performance.now();
	setPendantLCD('DIBH', 'COACH · inhale and hold');
	renderMotionPanel();
}
function releaseDIBHHold() {
	if (S.motionManagement.mode !== 'DIBH') return;
	S.motionManagement.holdActive = false;
	S.motionManagement.holdStartedAt = 0;
	setPendantLCD('DIBH', 'BREATH HOLD RELEASED');
	renderMotionPanel();
}
function drawMotionWave() {
	if (!motionWaveCanvas) return;
	const ctx = motionWaveCanvas.getContext('2d');
	if (!ctx) return;
	const w = motionWaveCanvas.width,
		h = motionWaveCanvas.height;
	ctx.clearRect(0, 0, w, h);
	ctx.fillStyle = '#070812';
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = '#211f31';
	ctx.lineWidth = 1;
	for (let x = 0; x <= w; x += 100) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, h);
		ctx.stroke();
	}
	for (let y = 40; y < h; y += 45) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(w, y);
		ctx.stroke();
	}
	if (S.motionManagement.mode === 'DIBH') {
		const top = h - ((S.motionManagement.dibhTarget + S.motionManagement.dibhTolerance) / 100) * h,
			bot = h - ((S.motionManagement.dibhTarget - S.motionManagement.dibhTolerance) / 100) * h;
		ctx.fillStyle = 'rgba(63,167,108,.16)';
		ctx.fillRect(0, top, w, bot - top);
		ctx.strokeStyle = 'rgba(91,214,142,.75)';
		ctx.setLineDash([8, 6]);
		ctx.beginPath();
		ctx.moveTo(0, h - (S.motionManagement.dibhTarget / 100) * h);
		ctx.lineTo(w, h - (S.motionManagement.dibhTarget / 100) * h);
		ctx.stroke();
		ctx.setLineDash([]);
	}
	const tr = S.motionManagement.trace;
	if (tr.length > 1) {
		ctx.strokeStyle = '#b28af4';
		ctx.lineWidth = 3;
		ctx.beginPath();
		tr.forEach((v, i) => {
			const x = (i / Math.max(1, tr.length - 1)) * w,
				y = h - (v / 100) * h;
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- legacy ternary-as-statement pattern, pre-existing, tracked in #77 phase 2 report
			i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
		});
		ctx.stroke();
	}
	const val = S.motionManagement.breathLevel,
		y = h - (val / 100) * h;
	ctx.fillStyle = S.motionManagement.gateOpen ? '#55e293' : '#ff7184';
	ctx.beginPath();
	ctx.arc(w - 12, y, 7, 0, Math.PI * 2);
	ctx.fill();
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function renderMotionPanel(force = false) {
	if (!motionPanel) return;
	const spec = activeMotionSpec(),
		dibh = S.motionManagement.mode === 'DIBH';
	setTextById(
		'motionPatient',
		S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
			: 'No case'
	);
	setTextById('motionStrategy', spec?.label || 'Not prescribed');
	setTextById(
		'motionVerified',
		!spec ? 'N/A' : S.motionManagement.verified ? 'VERIFIED' : 'NOT VERIFIED'
	);
	const lowC = document.getElementById('motionLowControl'),
		highC = document.getElementById('motionHighControl'),
		dtC = document.getElementById('motionDibhTargetControl'),
		tolC = document.getElementById('motionDibhToleranceControl');
	if (lowC) lowC.style.display = dibh ? 'none' : 'block';
	if (highC) highC.style.display = dibh ? 'none' : 'block';
	if (dtC) dtC.style.display = dibh ? 'block' : 'none';
	if (tolC) tolC.style.display = dibh ? 'block' : 'none';
	setTextById('motionGateLowValue', `${S.motionManagement.gateLow}%`);
	setTextById('motionGateHighValue', `${S.motionManagement.gateHigh}%`);
	setTextById('motionDibhTargetValue', `${S.motionManagement.dibhTarget}%`);
	setTextById('motionDibhToleranceValue', `±${S.motionManagement.dibhTolerance}%`);
	const phaseLabel = document.getElementById('motionPhaseLabel');
	if (phaseLabel) phaseLabel.textContent = dibh ? 'Breath level' : '4D phase';
	setTextById(
		'motionPhaseValue',
		dibh
			? `${S.motionManagement.breathLevel.toFixed(0)}%`
			: `${S.motionManagement.phase.toFixed(0)}%`
	);
	setTextById('motionGateValue', S.motionManagement.gateOpen ? 'OPEN' : 'CLOSED');
	const gm = document.getElementById('motionGateMetric');
	if (gm) {
		gm.classList.toggle('good', S.motionManagement.gateOpen);
		gm.classList.toggle('bad', !S.motionManagement.gateOpen);
	}
	setTextById(
		'motionExcursionValue',
		dibh
			? `DIBH ${S.motionManagement.dibhTarget}%`
			: `SI ${S.motionManagement.excursionSI.toFixed(0)} mm`
	);
	setTextById(
		'motionSamplesValue',
		dibh
			? `${S.motionManagement.samples.length}/3`
			: S.motionManagement.acquired
				? '10 phases'
				: '0/10'
	);
	setTextById('motionWaveLabel', dibh ? 'DIBH RESPIRATORY LEVEL' : '4D RESPIRATORY TRACE');
	setTextById(
		'motionWaveGateLabel',
		dibh
			? `TARGET ${S.motionManagement.dibhTarget}% ±${S.motionManagement.dibhTolerance}%`
			: `GATE ${S.motionManagement.gateLow}–${S.motionManagement.gateHigh}%`
	);
	if (motionAcquire) motionAcquire.textContent = dibh ? 'Record Hold' : 'Acquire 4D';
	if (motionHold) motionHold.style.display = dibh ? 'block' : 'none';
	if (motionRelease) motionRelease.style.display = dibh ? 'block' : 'none';
	const strip = document.getElementById('motionPhaseStrip');
	if (strip) {
		if (dibh) {
			strip.innerHTML =
				S.motionManagement.samples
					.map(
						(v, i) =>
							`<div class="motion-phase ${Math.abs(v - S.motionManagement.dibhTarget) <= S.motionManagement.dibhTolerance ? 'gate' : ''}"><b>H${i + 1}</b>${v.toFixed(0)}%</div>`
					)
					.join('') ||
				'<div class="motion-phase" style="grid-column:1/-1">Record three reproducible breath holds.</div>';
		} else {
			const data = S.motionManagement.phaseData.length
				? S.motionManagement.phaseData
				: motion4DPhaseData();
			strip.innerHTML = data
				.map(
					(x) =>
						`<div class="motion-phase ${x.phase >= S.motionManagement.gateLow && x.phase <= S.motionManagement.gateHigh ? 'gate' : ''}"><b>${x.phase}%</b>${x.si >= 0 ? '+' : ''}${x.si.toFixed(1)} mm</div>`
				)
				.join('');
		}
	}
	const st = document.getElementById('motionStatus');
	if (st) {
		st.className = 'motion-status';
		if (!spec)
			st.textContent =
				'No active respiratory motion-management technique is prescribed for this patient.';
		else if (dibh) {
			if (S.motionManagement.verified) {
				st.classList.add('good');
				st.textContent = `DIBH VERIFIED · ${S.motionManagement.samples.length} reproducible holds. Radiation is permitted only while the signal remains ${S.motionManagement.dibhTarget - S.motionManagement.dibhTolerance}%–${S.motionManagement.dibhTarget + S.motionManagement.dibhTolerance}%.`;
			} else
				st.textContent =
					'Practice DIBH: start a breath hold, wait for the green target band, record the hold, release, and repeat for three reproducible holds.';
		} else if (S.motionManagement.verified) {
			st.classList.add('good');
			st.textContent = `4D VERIFIED · ${S.motionManagement.excursionSI.toFixed(0)} mm SI motion envelope. Approved phase gate ${S.motionManagement.gateLow}%–${S.motionManagement.gateHigh}% around end-expiration.`;
		} else
			st.textContent =
				'Acquire the 10-phase dataset, review the motion envelope, then approve a 10–30% phase window containing 50% end-expiration.';
	}
	drawMotionWave();
}

function updateMotionAnimation(now) {
	const spec = activeMotionSpec();
	if (!spec) {
		S.motionManagement.gateOpen = true;
		return;
	}
	const dt = Math.max(0, Math.min(0.1, (now - (S.motionManagement.lastFrame || now)) / 1000));
	S.motionManagement.lastFrame = now;
	if (S.motionManagement.mode === 'DIBH') {
		if (S.motionManagement.holdActive) {
			const t = Math.max(0, (now - S.motionManagement.holdStartedAt) / 1000),
				ramp = Math.min(1, t / 1.2),
				start = 48,
				drift = Math.sin(t * 1.4) * 1.1 + Math.sin(t * 0.37) * 0.5;
			S.motionManagement.breathLevel =
				start + (S.motionManagement.dibhTarget - start) * ramp + (ramp >= 1 ? drift : 0);
		} else {
			S.motionManagement.phase =
				(S.motionManagement.phase + (dt / S.motionManagement.period) * 100) % 100;
			S.motionManagement.breathLevel =
				48 + 18 * respiratoryValueFromPhase(S.motionManagement.phase);
		}
	} else {
		S.motionManagement.phase =
			(S.motionManagement.phase + (dt / S.motionManagement.period) * 100) % 100;
		S.motionManagement.breathLevel = 50 + 36 * respiratoryValueFromPhase(S.motionManagement.phase);
	}
	S.motionManagement.gateOpen = motionConditionOpen();
	S.motionManagement.trace.push(Math.max(0, Math.min(100, S.motionManagement.breathLevel)));
	if (S.motionManagement.trace.length > 240) S.motionManagement.trace.shift();
	if (S.motionTarget3D && S.motionTargetBase) {
		if (S.motionManagement.mode === 'DIBH') {
			const f = (S.motionManagement.breathLevel - 50) / 50;
			S.motionTarget3D.position.copy(S.motionTargetBase);
			S.motionTarget3D.position.y += Math.max(0, f) * 0.025;
			if (S.motionSurfaceMarker && S.motionSurfaceBase) {
				S.motionSurfaceMarker.position.copy(S.motionSurfaceBase);
				S.motionSurfaceMarker.position.y += Math.max(0, f) * 0.045;
			}
			if (S.motionHeart3D && S.motionHeartBase) {
				S.motionHeart3D.position.copy(S.motionHeartBase);
				S.motionHeart3D.position.y -= Math.max(0, f) * 0.028;
				S.motionHeart3D.position.z += Math.max(0, f) * 0.018;
			}
		} else {
			const wave = respiratoryValueFromPhase(S.motionManagement.phase);
			S.motionTarget3D.position.copy(S.motionTargetBase);
			S.motionTarget3D.position.z += (S.motionManagement.excursionSI / 2) * wave * 0.004;
			S.motionTarget3D.position.y += (S.motionManagement.excursionAP / 2) * wave * 0.004;
			S.motionTarget3D.position.x += (S.motionManagement.excursionLR / 2) * wave * 0.004;
			if (S.motionSurfaceMarker && S.motionSurfaceBase) {
				S.motionSurfaceMarker.position.copy(S.motionSurfaceBase);
				S.motionSurfaceMarker.position.y += wave * 0.02;
			}
		}
	}
	if (now - S.motionManagement.lastPanelPaint > 100) {
		S.motionManagement.lastPanelPaint = now;
		renderMotionPanel();
		if (S.treatmentDelivery.delivering) renderTreatmentDeliveryPanel();
	}
}

const OIS_STORE_KEY = 'linacOISRecordVerify_v1';
function oisSessionKey() {
	return S.activeTreatmentCase
		? `${S.activeTreatmentCase.mrn}|${S.activeTreatmentCase.fraction}`
		: '';
}
function readOISStore() {
	try {
		return JSON.parse(localStorage.getItem(OIS_STORE_KEY) || '{}') || {};
	} catch (e) {
		console.warn('OIS record could not be read', e);
		return {};
	}
}
function writeOISStore(store) {
	try {
		localStorage.setItem(OIS_STORE_KEY, JSON.stringify(store));
	} catch (e) {
		console.warn('OIS record could not be persisted', e);
	}
}
function oisClock() {
	return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function loadOISSession() {
	const key = oisSessionKey();
	if (!key) {
		S.oisSession = {
			key: '',
			events: [],
			note: '',
			therapist: '',
			reviewed: false,
			overrideReviewed: false,
			clearanceOverrides: [],
			signed: false,
			signedAt: null,
			status: 'OPEN',
			snapshot: null
		};
		renderOISPanel();
		return;
	}
	const store = readOISStore(),
		saved = store[key];
	S.oisSession = saved
		? { ...saved, key, events: Array.isArray(saved.events) ? saved.events : [] }
		: {
				key,
				events: [],
				note: '',
				therapist: '',
				reviewed: false,
				overrideReviewed: false,
				clearanceOverrides: [],
				signed: false,
				signedAt: null,
				status: 'OPEN',
				snapshot: null,
				patient: S.activeTreatmentCase.patient,
				mrn: S.activeTreatmentCase.mrn,
				site: S.activeTreatmentCase.siteLabel,
				fraction: S.activeTreatmentCase.fraction,
				technique: S.activeTreatmentCase.technique,
				createdAt: new Date().toISOString()
			};
	if (!Array.isArray(S.oisSession.clearanceOverrides)) S.oisSession.clearanceOverrides = [];
	if (typeof S.oisSession.overrideReviewed !== 'boolean') S.oisSession.overrideReviewed = false;
	if (oisNote) oisNote.value = S.oisSession.note || '';
	if (oisTherapist) oisTherapist.value = S.oisSession.therapist || '';
	if (oisReviewCheck) oisReviewCheck.checked = !!S.oisSession.reviewed;
	if (oisOverrideReviewCheck) oisOverrideReviewCheck.checked = !!S.oisSession.overrideReviewed;
	if (!S.oisSession.events.length)
		oisLogEvent(
			'SESSION',
			'Patient / treatment plan loaded',
			`${S.activeTreatmentCase.siteLabel} · ${S.activeTreatmentCase.technique}`,
			'session-open'
		);
	renderOISPanel();
}
function persistOISSession() {
	if (!S.oisSession?.key) return;
	const store = readOISStore();
	S.oisSession.note = oisNote?.value ?? S.oisSession.note ?? '';
	S.oisSession.therapist = oisTherapist?.value ?? S.oisSession.therapist ?? '';
	S.oisSession.reviewed = !!(oisReviewCheck?.checked ?? S.oisSession.reviewed);
	S.oisSession.overrideReviewed = !!(
		oisOverrideReviewCheck?.checked ?? S.oisSession.overrideReviewed
	);
	S.oisSession.snapshot = buildOISSnapshot();
	store[S.oisSession.key] = S.oisSession;
	writeOISStore(store);
}
function oisLogEvent(type, title, detail = '', dedupe = '') {
	if (!S.activeTreatmentCase) return;
	const key = oisSessionKey();
	if (S.oisSession.key !== key) {
		const store = readOISStore(),
			saved = store[key];
		S.oisSession = saved
			? { ...saved, key, events: Array.isArray(saved.events) ? saved.events : [] }
			: {
					key,
					events: [],
					note: '',
					therapist: '',
					reviewed: false,
					overrideReviewed: false,
					clearanceOverrides: [],
					signed: false,
					signedAt: null,
					status: 'OPEN'
				};
	}
	if (dedupe && S.oisSession.events.some((e) => e.dedupe === dedupe)) return;
	S.oisSession.events.push({
		ts: new Date().toISOString(),
		time: oisClock(),
		type: String(type || 'EVENT'),
		title: String(title || ''),
		detail: String(detail || ''),
		dedupe: String(dedupe || '')
	});
	if (S.oisSession.events.length > 160) S.oisSession.events = S.oisSession.events.slice(-160);
	persistOISSession();
	renderOISPanel();
}
function buildOISSnapshot() {
	if (!S.activeTreatmentCase) return null;
	const residual = S.clinicalIGRT?.acquired ? getIGRTResidual() : null,
		applied = S.clinicalIGRT?.acquired ? getIGRTApplied() : null;
	const fields = getTreatmentFields();
	return {
		patient: S.activeTreatmentCase.patient,
		mrn: S.activeTreatmentCase.mrn,
		site: S.activeTreatmentCase.siteLabel,
		fraction: S.activeTreatmentCase.fraction,
		technique: S.activeTreatmentCase.technique,
		energy: S.activeTreatmentCase.energy,
		immobilization: immobilizationRequired()
			? {
					required: true,
					verified: !!S.immobilizationWorkflow.verified,
					count: (S.immobilizationWorkflow.selected || []).length
				}
			: { required: false },
		igrt: {
			required: String(S.activeTreatmentCase?.planned?.imaging || 'None').toLowerCase() !== 'none',
			mode: S.clinicalIGRT?.mode || '—',
			acquired: !!S.clinicalIGRT?.acquired,
			verified: igrtAlignmentReadyForDelivery(),
			applied,
			residual
		},
		adaptive: adaptiveRequired()
			? {
					required: true,
					approved: !!S.adaptiveWorkflow.approved,
					plan:
						adaptiveSpec()?.plans?.[S.adaptiveWorkflow.selectedPlanKey]?.title ||
						S.adaptiveWorkflow.selectedPlanKey,
					anatomy: S.adaptiveWorkflow.scenario?.title || '—'
				}
			: { required: false },
		motion: motionRequired()
			? {
					required: true,
					verified: !!S.motionManagement.verified,
					mode: S.motionManagement.mode,
					detail:
						S.motionManagement.mode === 'DIBH'
							? `DIBH ${S.motionManagement.dibhTarget}% ±${S.motionManagement.dibhTolerance}%`
							: `Gate ${S.motionManagement.gateLow}–${S.motionManagement.gateHigh}%`
				}
			: { required: false },
		stereo: srsRequired()
			? {
					required: true,
					type: stereotacticCaseLabel(),
					timeout:
						!!S.srsWorkflow.timeoutVerifiedByField?.[
							Number(S.treatmentDelivery.activeFieldIndex) || 0
						]
				}
			: { required: false },
		clearanceOverride: {
			used: clearanceOverrideUsedAny(),
			reviewed: !!S.oisSession.overrideReviewed,
			records: [...(S.oisSession.clearanceOverrides || [])]
		},
		fields: fields.map((f, i) => ({
			name: f.name || `Field ${i + 1}`,
			plannedMU: Number(f.mu) || 0,
			deliveredMU: S.treatmentDelivery.completedFields?.[i]
				? Number(f.mu) || 0
				: i === Number(S.treatmentDelivery.activeFieldIndex)
					? Number(S.treatmentDelivery.muDelivered) || 0
					: 0,
			status: S.treatmentDelivery.completedFields?.[i]
				? 'COMPLETE'
				: i === Number(S.treatmentDelivery.activeFieldIndex) && S.treatmentDelivery.terminated
					? 'TERMINATED'
					: 'PENDING'
		})),
		charge: S.treatmentCompletion?.posted
			? { posted: true, code: S.treatmentCompletion.code, record: S.treatmentCompletion.record }
			: { posted: false },
		signed: !!S.oisSession.signed
	};
}
function fmtOISShift(obj) {
	if (!obj) return '—';
	return `LAT ${fmtIGRT(Number(obj.lat) || 0, 'mm')} · LNG ${fmtIGRT(Number(obj.lng) || 0, 'mm')} · VRT ${fmtIGRT(Number(obj.vrt) || 0, 'mm')} · R/P/Y ${fmtIGRT(Number(obj.roll) || 0, '°')} / ${fmtIGRT(Number(obj.pitch) || 0, '°')} / ${fmtIGRT(Number(obj.yaw) || 0, '°')}`;
}
function renderOISPanel() {
	if (!oisPanel) return;
	const s = buildOISSnapshot();
	setTextById('oisPatient', s ? `${s.patient} · ${s.mrn}` : 'No case');
	setTextById('oisFraction', s ? s.fraction : '—');
	setTextById('oisCourse', s ? s.site : '—');
	const recordStatus = !s
		? 'NO CASE'
		: S.oisSession.signed
			? 'SIGNED / CLOSED'
			: S.treatmentCompletion?.posted
				? 'POSTED · SIGN-OFF PENDING'
				: allTreatmentFieldsCompleted()
					? 'DELIVERY COMPLETE'
					: 'OPEN';
	setTextById('oisRecordStatus', recordStatus);
	const ver = document.getElementById('oisVerification');
	if (ver) {
		if (!s) ver.innerHTML = '<div class="ois-kv"><span>Status</span><b>Load a patient</b></div>';
		else {
			const rows = [
				['Prescription', `${s.technique} · ${s.energy}`],
				[
					'Immobilization',
					s.immobilization.required
						? s.immobilization.verified
							? 'VERIFIED'
							: 'PENDING'
						: 'Not prescribed'
				],
				[
					'IGRT',
					s.igrt.required ? (s.igrt.verified ? 'ALIGNMENT VERIFIED' : 'PENDING') : 'Not prescribed'
				],
				[
					'Motion',
					s.motion.required ? (s.motion.verified ? 'VERIFIED' : 'PENDING') : 'Not prescribed'
				],
				[
					'Adaptive',
					s.adaptive.required
						? s.adaptive.approved
							? `APPROVED · ${s.adaptive.plan}`
							: 'PENDING'
						: 'Not prescribed'
				],
				[
					'SRS / SBRT',
					s.stereo.required
						? `${s.stereo.type} · ${s.stereo.timeout ? 'timeout approved' : 'timeout pending'}`
						: 'Not prescribed'
				],
				[
					'Clearance override',
					s.clearanceOverride?.used
						? s.clearanceOverride.reviewed
							? 'USED · REVIEW ACKNOWLEDGED'
							: 'USED · OIS ACKNOWLEDGMENT REQUIRED'
						: 'Not used'
				],
				['Charge', s.charge.posted ? `CPT ${s.charge.code} POSTED` : 'Not posted']
			];
			ver.innerHTML = rows
				.map((r) => `<div class="ois-kv"><span>${r[0]}</span><b>${r[1]}</b></div>`)
				.join('');
		}
	}
	const img = document.getElementById('oisImaging');
	if (img) {
		if (!s) img.innerHTML = '<div class="ois-kv"><span>IGRT</span><b>—</b></div>';
		else
			img.innerHTML = `<div class="ois-kv"><span>Mode</span><b>${s.igrt.required ? s.igrt.mode : 'Not prescribed'}</b></div><div class="ois-kv"><span>Applied correction</span><b>${s.igrt.acquired ? fmtOISShift(s.igrt.applied) : '—'}</b></div><div class="ois-kv"><span>Final residual</span><b>${s.igrt.verified ? fmtOISShift(s.igrt.residual) : '—'}</b></div>${s.adaptive.required ? `<div class="ois-kv"><span>Daily anatomy</span><b>${s.adaptive.anatomy}</b></div>` : ''}`;
	}
	const fbox = document.getElementById('oisFields');
	if (fbox) {
		fbox.innerHTML = s
			? `<table class="ois-table"><thead><tr><th>Field / arc</th><th>Plan MU</th><th>Delivered</th><th>Status</th></tr></thead><tbody>${s.fields.map((f) => `<tr><td>${f.name}</td><td>${f.plannedMU.toFixed(1)}</td><td>${f.deliveredMU.toFixed(1)}</td><td class="${f.status === 'COMPLETE' ? 'ok' : f.status === 'TERMINATED' ? 'bad' : 'hold'}">${f.status}</td></tr>`).join('')}</tbody></table>`
			: 'No patient loaded.';
	}
	const tl = document.getElementById('oisTimeline');
	if (tl) {
		const events = (S.oisSession.events || []).slice().reverse().slice(0, 40);
		tl.innerHTML = events.length
			? events
					.map(
						(e) =>
							`<div class="ois-event"><time>${e.time || ''}</time><b>${e.type}</b><span><strong>${e.title}</strong>${e.detail ? ` · ${e.detail}` : ''}</span></div>`
					)
					.join('')
			: '<div class="ois-event"><time>—</time><b>SESSION</b><span>No recorded events.</span></div>';
	}
	const overrideRecords = S.oisSession.clearanceOverrides || [];
	if (oisOverrideCard) {
		oisOverrideCard.hidden = !overrideRecords.length;
	}
	if (oisOverrideSummary && overrideRecords.length)
		oisOverrideSummary.innerHTML = overrideRecords
			.map(
				(r) =>
					`<div class="ois-kv"><span>${r.field || `Field ${Number(r.fieldIndex) + 1}`}</span><b>${r.reason || 'Clearance proxy override'}<br><small>Scope: current mechanical + full treatment trajectory${r.dynamicEncounterLogged ? ' · dynamic trajectory encountered' : ''}</small><br><small>Rationale: ${r.rationale || '—'}</small></b></div>`
			)
			.join('');
	if (oisOverrideReviewCheck) {
		oisOverrideReviewCheck.checked = !!S.oisSession.overrideReviewed;
		oisOverrideReviewCheck.disabled = !!S.oisSession.signed || !overrideRecords.length;
	}
	const overrideSignoffOK = !overrideRecords.length || !!S.oisSession.overrideReviewed;
	if (oisSignOff)
		oisSignOff.disabled =
			!S.activeTreatmentCase ||
			!S.treatmentCompletion?.posted ||
			!!S.oisSession.signed ||
			!oisReviewCheck?.checked ||
			!(oisTherapist?.value || '').trim() ||
			!overrideSignoffOK;
	if (oisNote && !oisNote.matches(':focus')) oisNote.value = S.oisSession.note || '';
	if (oisTherapist && !oisTherapist.matches(':focus'))
		oisTherapist.value = S.oisSession.therapist || '';
	if (oisReviewCheck) oisReviewCheck.checked = !!S.oisSession.reviewed;
	const st = document.getElementById('oisStatus');
	if (st) {
		st.className = 'ois-status';
		if (!s) st.textContent = 'Load a treatment case to begin a daily record.';
		else if (S.oisSession.signed) {
			st.classList.add('good');
			st.textContent = `DAILY RECORD SIGNED · ${S.oisSession.therapist || 'Therapist'} · ${S.oisSession.signedAt ? new Date(S.oisSession.signedAt).toLocaleString() : ''}`;
		} else if (S.treatmentCompletion?.posted) {
			st.classList.add('hold');
			st.textContent =
				overrideRecords.length && !S.oisSession.overrideReviewed
					? 'Treatment and charge are posted. A simulation clearance override was used; review its rationale and complete the override acknowledgment before sign-off.'
					: 'Treatment and charge are posted. Review the complete record, enter therapist/student initials, and sign off the encounter.';
		} else
			st.textContent =
				'LIVE RECORD · treatment events will be captured automatically as the workflow progresses.';
	}
}
function signOffOISRecord() {
	if (!S.activeTreatmentCase || !S.treatmentCompletion?.posted || S.oisSession.signed) return;
	const who = (oisTherapist?.value || '').trim();
	const overrideRequired = (S.oisSession.clearanceOverrides || []).length > 0;
	if (!who || !oisReviewCheck?.checked || (overrideRequired && !S.oisSession.overrideReviewed)) {
		renderOISPanel();
		return;
	}
	S.oisSession.note = oisNote?.value || '';
	S.oisSession.therapist = who;
	S.oisSession.reviewed = true;
	S.oisSession.signed = true;
	S.oisSession.signedAt = new Date().toISOString();
	S.oisSession.status = 'CLOSED';
	oisLogEvent(
		'SIGN-OFF',
		'Daily treatment record signed',
		`${who}${(S.oisSession.clearanceOverrides || []).length ? ' · clearance override reviewed' : ''}`,
		'signoff'
	);
	persistOISSession();
	setPendantLCD('OIS / R&V', 'DAILY RECORD SIGNED');
	renderOISPanel();
	renderAdaptiveCourse();
}

function adaptiveSpec() {
	return S.activeTreatmentCase?.adaptive || null;
}
function adaptiveRequired() {
	return !!adaptiveSpec();
}
function adaptiveCourseKey() {
	return S.activeTreatmentCase ? `linacAdaptiveCourse_${S.activeTreatmentCase.mrn}_v1` : '';
}
function adaptiveFractionNumber() {
	const m = String(S.activeTreatmentCase?.fraction || '').match(/\d+/);
	return m ? Number(m[0]) : 1;
}
function adaptivePlanRank(key) {
	return { small: 0, medium: 1, large: 2 }[String(key)] ?? 1;
}
function adaptiveScenarioIndex() {
	const s = adaptiveSpec(),
		sc = S.adaptiveWorkflow.scenario;
	return Math.max(0, (s?.scenarios || []).indexOf(sc));
}
function adaptivePredictedMetrics(planKey, scenario = S.adaptiveWorkflow.scenario) {
	const spec = adaptiveSpec();
	if (!spec || !scenario)
		return {
			ptvV95: 0,
			rectumGy: 0,
			bowelGy: 0,
			quality: '—',
			message: 'No daily anatomy assessment'
		};
	const rec = String(scenario.recommendedPlan || 'medium'),
		diff = adaptivePlanRank(planKey) - adaptivePlanRank(rec);
	const sidx = Math.max(0, (spec.scenarios || []).indexOf(scenario));
	let ptv = 98.8,
		rect = 0.82,
		bowel = 0.46;
	if (diff < 0) {
		ptv -= Math.abs(diff) * 7.2;
		rect -= Math.abs(diff) * 0.07;
		bowel -= Math.abs(diff) * 0.05;
	}
	if (diff > 0) {
		ptv += Math.min(0.8, diff * 0.35);
		rect += diff * 0.22;
		bowel += diff * 0.16;
	}
	if (sidx === 0) {
		rect += 0.14;
		bowel += 0.02;
	}
	if (sidx === 2) {
		bowel += 0.1;
		rect -= 0.04;
	}
	ptv = Math.max(82, Math.min(99.6, ptv));
	rect = Math.max(0.45, rect);
	bowel = Math.max(0.25, bowel);
	const quality =
		diff === 0 ? 'BEST FIT' : diff < 0 ? 'UNDER-COVERAGE RISK' : 'OAR / VOLUME PENALTY';
	const message =
		diff === 0
			? 'Target envelope matches today’s anatomy.'
			: diff < 0
				? 'Plan envelope is smaller than today’s anatomy; coverage is reduced.'
				: 'Plan envelope is larger than needed today; coverage is maintained but normal-tissue exposure rises.';
	return { ptvV95: ptv, rectumGy: rect, bowelGy: bowel, quality, message };
}
function loadAdaptiveCourse() {
	const spec = adaptiveSpec(),
		c = spec?.course;
	S.adaptiveCourse = {
		history: [],
		totalFractions: Number(c?.totalFractions) || 0,
		prescriptionGy: Number(c?.prescriptionGy) || 0,
		dosePerFractionGy: Number(c?.dosePerFractionGy) || 0,
		loaded: !!c
	};
	if (!c || !S.activeTreatmentCase) return;
	try {
		const stored = JSON.parse(localStorage.getItem(adaptiveCourseKey()) || 'null');
		if (stored && Array.isArray(stored.history)) {
			S.adaptiveCourse = { ...S.adaptiveCourse, ...stored, loaded: true };
			return;
		}
	} catch (e) {
		console.warn('Adaptive course history could not be read', e);
	}
	const scenarios = spec.scenarios || [];
	S.adaptiveCourse.history = (c.seedHistory || []).map((seed) => {
		const sc = scenarios[Number(seed.scenarioIndex) || 0] || scenarios[0];
		const met = adaptivePredictedMetrics(
			String(seed.planKey || sc?.recommendedPlan || 'medium'),
			sc
		);
		return {
			fx: Number(seed.fx),
			anatomy: sc?.title || 'Daily anatomy',
			scenarioIndex: Number(seed.scenarioIndex) || 0,
			planKey: String(seed.planKey || 'medium'),
			planTitle: spec.plans?.[seed.planKey]?.title || String(seed.planKey || ''),
			targetDoseGy: Number(c.dosePerFractionGy) || 0,
			ptvV95: met.ptvV95,
			rectumGy: met.rectumGy,
			bowelGy: met.bowelGy,
			seeded: true
		};
	});
	persistAdaptiveCourse();
}
function persistAdaptiveCourse() {
	if (!S.adaptiveCourse.loaded || !S.activeTreatmentCase) return;
	try {
		localStorage.setItem(
			adaptiveCourseKey(),
			JSON.stringify({
				history: S.adaptiveCourse.history,
				totalFractions: S.adaptiveCourse.totalFractions,
				prescriptionGy: S.adaptiveCourse.prescriptionGy,
				dosePerFractionGy: S.adaptiveCourse.dosePerFractionGy
			})
		);
	} catch (e) {
		console.warn('Adaptive course history could not be persisted', e);
	}
}
function accumulatedAdaptiveMetrics() {
	const h = S.adaptiveCourse.history || [],
		n = h.length;
	return {
		n,
		targetGy: h.reduce((s, x) => s + (Number(x.targetDoseGy) || 0), 0),
		meanV95: n ? h.reduce((s, x) => s + (Number(x.ptvV95) || 0), 0) / n : 0,
		rectumGy: h.reduce((s, x) => s + (Number(x.rectumGy) || 0), 0),
		bowelGy: h.reduce((s, x) => s + (Number(x.bowelGy) || 0), 0)
	};
}
function drawAdaptiveDoseChart() {
	if (!adaptiveDoseCanvas) return;
	const ctx = adaptiveDoseCanvas.getContext('2d');
	if (!ctx) return;
	const w = adaptiveDoseCanvas.width,
		h = adaptiveDoseCanvas.height;
	ctx.clearRect(0, 0, w, h);
	ctx.fillStyle = '#071019';
	ctx.fillRect(0, 0, w, h);
	const a = accumulatedAdaptiveMetrics(),
		spec = adaptiveSpec(),
		course = spec?.course || {};
	ctx.font = '700 22px Segoe UI, Arial';
	ctx.fillStyle = '#e7f2f8';
	ctx.fillText('Accumulated course dose · simplified teaching model', 24, 32);
	ctx.font = '14px Segoe UI, Arial';
	ctx.fillStyle = '#8fa9bb';
	ctx.fillText(
		'Each posted adaptive fraction contributes its modeled target and OAR dose estimate.',
		24,
		55
	);
	const rows = [
		{
			name: 'PTV / target',
			val: a.targetGy,
			max: Number(course.prescriptionGy) || 55,
			unit: 'Gy',
			fill: '#58c4f5'
		},
		{
			name: 'Rectum mean estimate',
			val: a.rectumGy,
			max: Number(course.rectumTeachingReferenceGy) || 24,
			unit: 'Gy',
			fill: '#e99d59'
		},
		{
			name: 'Bowel mean estimate',
			val: a.bowelGy,
			max: Number(course.bowelTeachingReferenceGy) || 15,
			unit: 'Gy',
			fill: '#c58be8'
		}
	];
	const x = 210,
		bw = w - 260,
		bh = 25;
	rows.forEach((r, i) => {
		const y = 92 + i * 51;
		ctx.font = '700 15px Segoe UI, Arial';
		ctx.fillStyle = '#dceaf4';
		ctx.fillText(r.name, 24, y + 18);
		ctx.fillStyle = '#142432';
		ctx.fillRect(x, y, bw, bh);
		ctx.fillStyle = r.fill;
		ctx.fillRect(x, y, bw * Math.min(1, r.val / Math.max(0.1, r.max)), bh);
		ctx.strokeStyle = '#31495b';
		ctx.strokeRect(x, y, bw, bh);
		ctx.font = '700 14px Consolas, monospace';
		ctx.fillStyle = '#eef7fb';
		ctx.fillText(`${r.val.toFixed(1)} / ${r.max.toFixed(1)} ${r.unit}`, x + 8, y + 18);
	});
	ctx.font = '13px Segoe UI, Arial';
	ctx.fillStyle = '#8fa9bb';
	ctx.fillText(
		`Mean delivered PTV V95 across ${a.n} recorded fraction${a.n === 1 ? '' : 's'}: ${a.n ? a.meanV95.toFixed(1) + '%' : '—'}`,
		24,
		h - 20
	);
}
function renderAdaptiveCourse() {
	const spec = adaptiveSpec(),
		a = accumulatedAdaptiveMetrics();
	setTextById(
		'adaptiveCourseProgress',
		spec ? `${a.n} / ${S.adaptiveCourse.totalFractions} fx` : '0 / 0 fx'
	);
	setTextById(
		'adaptiveTargetDose',
		spec ? `${a.targetGy.toFixed(1)} / ${S.adaptiveCourse.prescriptionGy.toFixed(1)} Gy` : '0.0 Gy'
	);
	setTextById('adaptiveMeanCoverage', a.n ? `${a.meanV95.toFixed(1)}%` : '—');
	setTextById(
		'adaptiveCurrentAnatomy',
		S.adaptiveWorkflow.scenario?.recommendedPlan
			? `${String(S.adaptiveWorkflow.scenario.recommendedPlan).toUpperCase()} plan fit`
			: '—'
	);
	const hist = document.getElementById('adaptiveHistory');
	if (hist) {
		const rows = (S.adaptiveCourse.history || []).slice(-8).reverse();
		hist.innerHTML =
			`<div class="adaptive-history-row header"><span>Fx</span><span>Anatomy</span><span>Plan</span><span>V95</span><span>Rect</span><span>Bowel</span></div>` +
			(rows.length
				? rows
						.map(
							(r) =>
								`<div class="adaptive-history-row"><b>${r.fx}</b><span>${String(r.anatomy || '').replace('Daily CBCT: ', '')}</span><span>${r.planTitle || r.planKey}</span><span>${Number(r.ptvV95).toFixed(1)}%</span><span>${Number(r.rectumGy).toFixed(2)} Gy</span><span>${Number(r.bowelGy).toFixed(2)} Gy</span></div>`
						)
						.join('')
				: `<div class="adaptive-history-row"><span>—</span><span>No posted fractions</span><span>—</span><span>—</span><span>—</span><span>—</span></div>`);
	}
	if (adaptiveNextFraction)
		adaptiveNextFraction.disabled =
			!adaptiveRequired() ||
			!S.treatmentCompletion.posted ||
			!S.oisSession.signed ||
			adaptiveFractionNumber() >= S.adaptiveCourse.totalFractions;
	if (adaptiveResetCourse) adaptiveResetCourse.disabled = !adaptiveRequired();
	drawAdaptiveDoseChart();
}
function applyAdaptivePlan(planKey) {
	const spec = adaptiveSpec();
	if (!spec || !spec.plans || !spec.plans[planKey]) return false;
	const plan = spec.plans[planKey];
	S.activeTreatmentCase.planned = JSON.parse(JSON.stringify(plan.planned || {}));
	S.activeTreatmentCase.fields = JSON.parse(JSON.stringify(plan.fields || []));
	S.adaptiveWorkflow.selectedPlanKey = planKey;
	setPendantLCD('ADAPTIVE PLAN', `${plan.title || planKey} selected`);
	resetTreatmentDeliveryForCase();
	renderTreatmentMonitor();
	renderTreatmentDeliveryPanel();
	renderAdaptivePanel();
	updateBEVInset();
	updateSpecialAnatomyTargetMarker();
	return true;
}
function chooseNewAdaptiveScenario(previousIndex = -1) {
	const arr = adaptiveSpec()?.scenarios || [];
	if (!arr.length) return null;
	let idx = Math.floor(Math.random() * arr.length);
	if (arr.length > 1 && idx === previousIndex)
		idx = (idx + 1 + Math.floor(Math.random() * (arr.length - 1))) % arr.length;
	return arr[idx];
}
function resetAdaptiveWorkflowForCase() {
	const spec = adaptiveSpec();
	S.adaptiveWorkflow = {
		required: !!spec,
		assessed: false,
		compared: false,
		approved: false,
		scenario: null,
		selectedPlanKey: '',
		doseChecked: false,
		finalApproved: false,
		basePlanKey: String(spec?.defaultPlanKey || ''),
		caseBase: null
	};
	const d = document.getElementById('adaptiveCheckDose'),
		a = document.getElementById('adaptiveCheckApprove');
	if (d) d.checked = false;
	if (a) a.checked = false;
	if (!spec) {
		S.adaptiveCourse = {
			history: [],
			totalFractions: 0,
			prescriptionGy: 0,
			dosePerFractionGy: 0,
			loaded: false
		};
		renderAdaptivePanel();
		return;
	}
	loadAdaptiveCourse();
	const scenarios = spec.scenarios || [];
	const fx = adaptiveFractionNumber();
	const seed = spec.course?.seedHistory?.find((x) => Number(x.fx) === fx);
	S.adaptiveWorkflow.scenario = seed
		? scenarios[Number(seed.scenarioIndex) || 0]
		: chooseNewAdaptiveScenario(-1);
	S.adaptiveWorkflow.caseBase = {
		planned: JSON.parse(JSON.stringify(S.activeTreatmentCase.planned || {})),
		fields: JSON.parse(JSON.stringify(S.activeTreatmentCase.fields || []))
	};
	const startKey = String(spec.defaultPlanKey || Object.keys(spec.plans || {})[0] || '');
	if (startKey) applyAdaptivePlan(startKey);
	S.adaptiveWorkflow.selectedPlanKey = startKey;
	S.adaptiveWorkflow.approved = false;
	renderAdaptivePanel();
}
function verifyAdaptivePlan() {
	if (!adaptiveRequired()) return;
	S.adaptiveWorkflow.doseChecked = !!document.getElementById('adaptiveCheckDose')?.checked;
	S.adaptiveWorkflow.finalApproved = !!document.getElementById('adaptiveCheckApprove')?.checked;
	const recommended = String(S.adaptiveWorkflow.scenario?.recommendedPlan || '');
	const correct =
		S.adaptiveWorkflow.assessed &&
		S.adaptiveWorkflow.compared &&
		S.adaptiveWorkflow.selectedPlanKey &&
		S.adaptiveWorkflow.selectedPlanKey === recommended;
	S.adaptiveWorkflow.approved = !!(
		correct &&
		S.adaptiveWorkflow.doseChecked &&
		S.adaptiveWorkflow.finalApproved
	);
	setPendantLCD(
		'ADAPTIVE REVIEW',
		S.adaptiveWorkflow.approved
			? 'APPROVED · adapted plan ready'
			: 'HOLD · complete adaptive review'
	);
	if (S.adaptiveWorkflow.approved)
		oisLogEvent(
			'ADAPTIVE',
			'Adaptive plan approved',
			`${S.adaptiveWorkflow.scenario?.title || 'Daily anatomy'} · ${adaptiveSpec()?.plans?.[S.adaptiveWorkflow.selectedPlanKey]?.title || S.adaptiveWorkflow.selectedPlanKey}`,
			'adaptive-approved'
		);
	renderAdaptivePanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}
function recordAdaptiveFractionDose() {
	if (!adaptiveRequired() || !S.adaptiveWorkflow.approved || !S.treatmentCompletion.posted) return;
	const fx = adaptiveFractionNumber();
	if (S.adaptiveCourse.history.some((x) => Number(x.fx) === fx)) {
		renderAdaptiveCourse();
		return;
	}
	const met = adaptivePredictedMetrics(S.adaptiveWorkflow.selectedPlanKey),
		spec = adaptiveSpec(),
		sc = S.adaptiveWorkflow.scenario;
	S.adaptiveCourse.history.push({
		fx,
		anatomy: sc?.title || 'Daily anatomy',
		scenarioIndex: adaptiveScenarioIndex(),
		planKey: S.adaptiveWorkflow.selectedPlanKey,
		planTitle:
			spec?.plans?.[S.adaptiveWorkflow.selectedPlanKey]?.title ||
			S.adaptiveWorkflow.selectedPlanKey,
		targetDoseGy: Number(spec?.course?.dosePerFractionGy) || 0,
		ptvV95: met.ptvV95,
		rectumGy: met.rectumGy,
		bowelGy: met.bowelGy,
		postedAt: new Date().toISOString()
	});
	S.adaptiveCourse.history.sort((x, y) => Number(x.fx) - Number(y.fx));
	persistAdaptiveCourse();
	renderAdaptiveCourse();
}
function advanceAdaptiveFraction() {
	if (!adaptiveRequired() || !S.treatmentCompletion.posted) return;
	if (!S.oisSession.signed) {
		setPendantLCD('OIS SIGN-OFF', 'Complete daily record before next fraction');
		oisPanel?.classList.add('open');
		renderOISPanel();
		return;
	}
	const cur = adaptiveFractionNumber(),
		total = Number(adaptiveSpec()?.course?.totalFractions) || cur;
	if (cur >= total) {
		setPendantLCD('ADAPTIVE COURSE', 'Course complete');
		return;
	}
	const prev = adaptiveScenarioIndex();
	S.activeTreatmentCase.fraction = `${cur + 1} / ${total}`;
	const site = IMAGING_SITES.find((s) => s.key === S.activeTreatmentCase.siteKey);
	if (site && typeof runPatientSetup === 'function')
		runPatientSetup(
			S.activeTreatmentCase.position || 'HFS',
			Number.isFinite(S.activeTreatmentCase.setupSiteZ) ? S.activeTreatmentCase.setupSiteZ : site.z,
			S.activeTreatmentCase.setupBodyX || 0,
			S.activeTreatmentCase.setupBodyY || 0
		);
	setKvState(false);
	setDetectorStateGame(false);
	setODIState(false);
	resetClinicalIGRTForCase();
	resetMotionManagementForCase();
	resetSRSWorkflowForCase();
	resetSpecialSetupForCase();
	S.adaptiveWorkflow.assessed = false;
	S.adaptiveWorkflow.compared = false;
	S.adaptiveWorkflow.approved = false;
	S.adaptiveWorkflow.doseChecked = false;
	S.adaptiveWorkflow.finalApproved = false;
	const d = document.getElementById('adaptiveCheckDose'),
		a = document.getElementById('adaptiveCheckApprove');
	if (d) d.checked = false;
	if (a) a.checked = false;
	S.adaptiveWorkflow.scenario = chooseNewAdaptiveScenario(prev);
	applyAdaptivePlan(String(adaptiveSpec()?.defaultPlanKey || 'medium'));
	resetTreatmentDeliveryForCase();
	loadOISSession();
	oisLogEvent('SESSION', 'Next adaptive fraction opened', `Fx ${cur + 1}/${total}`, 'session-open');
	setPendantLCD('NEXT ADAPTIVE FRACTION', `Fx ${cur + 1}/${total} · new daily anatomy`);
	renderAdaptivePanel();
	renderClinicalIGRT();
	renderTreatmentMonitor();
	renderOISPanel();
}
function resetAdaptiveCourseHistory() {
	if (!adaptiveRequired()) return;
	try {
		localStorage.removeItem(adaptiveCourseKey());
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty -- legacy silent-catch pattern, error intentionally swallowed
	} catch (e) {}
	S.adaptiveCourse.loaded = false;
	loadAdaptiveCourse();
	const firstUnrecorded = Math.max(1, (S.adaptiveCourse.history.at(-1)?.fx || 0) + 1);
	S.activeTreatmentCase.fraction = `${Math.min(firstUnrecorded, S.adaptiveCourse.totalFractions || firstUnrecorded)} / ${S.adaptiveCourse.totalFractions || 20}`;
	S.adaptiveWorkflow.assessed = false;
	S.adaptiveWorkflow.compared = false;
	S.adaptiveWorkflow.approved = false;
	S.adaptiveWorkflow.scenario = chooseNewAdaptiveScenario(-1);
	applyAdaptivePlan(String(adaptiveSpec()?.defaultPlanKey || 'medium'));
	resetTreatmentDeliveryForCase();
	loadOISSession();
	renderAdaptivePanel();
	renderOISPanel();
	setPendantLCD('ADAPTIVE COURSE', 'History reset to teaching baseline');
}
function renderAdaptivePanel() {
	if (!adaptivePanel) return;
	const spec = adaptiveSpec();
	setTextById(
		'adaptivePatient',
		S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel} · Fx ${S.activeTreatmentCase.fraction}`
			: 'No adaptive case'
	);
	setTextById('adaptiveTechnique', spec?.label || 'Not prescribed');
	setTextById(
		'adaptiveVerified',
		!spec ? 'N/A' : S.adaptiveWorkflow.approved ? 'APPROVED' : 'PENDING'
	);
	const anatomyCard = document.getElementById('adaptiveAnatomyCard'),
		planGrid = document.getElementById('adaptivePlanGrid'),
		stepList = document.getElementById('adaptiveStepList'),
		status = document.getElementById('adaptiveStatus');
	if (!spec) {
		if (anatomyCard)
			anatomyCard.innerHTML = 'No adaptive-planning workflow is prescribed for this patient.';
		if (planGrid) planGrid.innerHTML = '';
		if (stepList)
			stepList.innerHTML =
				'<div class="adaptive-step"><div><b>Adaptive review</b><span>Load a case with an adaptive planning task.</span></div><span>—</span></div>';
		if (status) {
			status.className = '';
			status.textContent = 'No adaptive-planning task is active for this case.';
		}
		renderAdaptiveCourse();
		return;
	}
	const scen = S.adaptiveWorkflow.scenario || {};
	if (anatomyCard)
		anatomyCard.innerHTML = `<h4>Today’s anatomy assessment</h4><p><b>${scen.title || 'Daily CBCT / on-table review'}</b></p><p style="margin-top:6px">${scen.summary || 'Review the daily anatomy, compare the available adaptive plans, then approve the most appropriate one.'}</p><ul class="adaptive-findings">${(scen.findings || []).map((x) => `<li>${x}</li>`).join('')}</ul>`;
	if (planGrid) {
		const recommended = String(scen.recommendedPlan || '');
		planGrid.innerHTML = Object.entries(spec.plans || {})
			.map(([key, plan]) => {
				const selected = S.adaptiveWorkflow.selectedPlanKey === key,
					met = adaptivePredictedMetrics(key, scen),
					planState =
						S.adaptiveWorkflow.compared && selected
							? key === recommended
								? 'correct'
								: 'wrong'
							: '';
				return `<div class="adaptive-plan ${selected ? 'selected' : ''} ${planState}"><span class="plan-tag">${key.replace(/_/g, ' ')}</span><b>${plan.title || key}</b><div>${plan.summary || ''}</div><ul><li><b>Predicted PTV V95:</b> ${met.ptvV95.toFixed(1)}%</li><li><b>Rectum mean contribution:</b> ${met.rectumGy.toFixed(2)} Gy</li><li><b>Bowel mean contribution:</b> ${met.bowelGy.toFixed(2)} Gy</li><li><b>${met.quality}</b> · ${met.message}</li></ul><button type="button" data-adaptive-plan="${key}">Select plan</button></div>`;
			})
			.join('');
	}
	if (stepList) {
		const recommended = String(scen.recommendedPlan || ''),
			selectedOk =
				S.adaptiveWorkflow.selectedPlanKey && S.adaptiveWorkflow.selectedPlanKey === recommended;
		stepList.innerHTML = [
			{
				label: '1. Daily anatomy assessed',
				detail: S.adaptiveWorkflow.assessed
					? scen.title || 'Assessment captured'
					: 'Review anatomy change and daily setup findings',
				ok: S.adaptiveWorkflow.assessed
			},
			{
				label: '2. Candidate plans compared',
				detail: S.adaptiveWorkflow.compared
					? 'Small / medium / large options reviewed'
					: 'Compare predicted target/OAR dose for the available plans',
				ok: S.adaptiveWorkflow.compared
			},
			{
				label: '3. Best plan selected',
				detail: S.adaptiveWorkflow.selectedPlanKey
					? `${spec.plans?.[S.adaptiveWorkflow.selectedPlanKey]?.title || S.adaptiveWorkflow.selectedPlanKey}${S.adaptiveWorkflow.compared ? (selectedOk ? ' · matches daily anatomy' : ' · reassess daily anatomy') : ''}`
					: 'No adaptive plan selected',
				ok: !!S.adaptiveWorkflow.selectedPlanKey && (!S.adaptiveWorkflow.compared || selectedOk)
			},
			{
				label: '4. Final adaptive approval',
				detail: S.adaptiveWorkflow.approved
					? 'Plan approved for treatment delivery'
					: 'Dose/OAR review and final approval still required',
				ok: S.adaptiveWorkflow.approved
			}
		]
			.map(
				(s) =>
					`<div class="adaptive-step ${s.ok ? 'good' : 'bad'}"><div><b>${s.label}</b><span>${s.detail}</span></div><span>${s.ok ? '✓' : '•'}</span></div>`
			)
			.join('');
	}
	if (status) {
		status.className = '';
		const recommended = String(scen.recommendedPlan || '');
		if (S.adaptiveWorkflow.approved) {
			status.classList.add('good');
			status.textContent = `ADAPTIVE PLAN APPROVED · ${spec.plans?.[S.adaptiveWorkflow.selectedPlanKey]?.title || S.adaptiveWorkflow.selectedPlanKey} is now the active plan for fraction ${adaptiveFractionNumber()}.`;
		} else if (
			S.adaptiveWorkflow.compared &&
			S.adaptiveWorkflow.selectedPlanKey &&
			S.adaptiveWorkflow.selectedPlanKey !== recommended
		) {
			status.classList.add('bad');
			status.textContent =
				'Selected plan does not best match today’s anatomy. Reassess the plan-of-the-day choice before approval.';
		} else if (!S.adaptiveWorkflow.assessed)
			status.textContent =
				'Start with the daily anatomy assessment. The patient cannot proceed to treatment until the anatomy change is reviewed.';
		else if (!S.adaptiveWorkflow.compared)
			status.textContent = 'Compare the adaptive options and their predicted target/OAR impact.';
		else
			status.textContent =
				'Adaptive plan selected. Complete the dose/OAR review and final approval checklist.';
	}
	renderAdaptiveCourse();
}

function activeElectronBolusSpec() {
	const field = deliveryCasePlan(),
		s = activeSpecialSetupSpec();
	if (!field?.electron || String(s?.type || '').toUpperCase() !== 'ELECTRON') return null;
	return s;
}
function electronBolusDeliveryRequired() {
	return !!activeElectronBolusSpec();
}
function electronBolusDeliveryOK() {
	if (!electronBolusDeliveryRequired()) return true;
	const e = S.specialSetupWorkflow?.electron || {};
	return !!(
		S.specialSetupWorkflow.verified &&
		e.mounted &&
		e.bolusPlaced &&
		e.bolusPositionOK &&
		e.bolusAirGapOK &&
		Number(e.airGapMm || 99) <= 1
	);
}
function electronBolusShapeClass(shape) {
	const s = String(shape || 'Oval').toLowerCase();
	return s === 'rectangle' ? 'rectangle' : s === 'circle' ? 'circle' : 'oval';
}
function renderElectronBolusDeliveryTask() {
	const host = document.getElementById('electronBolusDeliveryTask');
	if (!host) return;
	const s = activeElectronBolusSpec();
	if (!s) {
		host.hidden = true;
		host.innerHTML = '';
		updateElectronBolusMesh();
		return;
	}
	host.hidden = false;
	const e = S.specialSetupWorkflow.electron || {};
	if (!Number.isFinite(Number(e.bolusDragX))) e.bolusDragX = 54;
	if (!Number.isFinite(Number(e.bolusDragY))) e.bolusDragY = 92;
	if (!Number.isFinite(Number(e.bolusContactY))) e.bolusContactY = 38;
	e.bolusShape = String(s.shape || 'Oval');
	e.bolusWidth = Number(s.widthCm) || 6;
	e.bolusHeight = Number(s.heightCm) || 4;
	e.bolusThickness = Number(s.bolusThicknessCm) || 0.5;
	const scale = 16,
		fw = Math.max(62, e.bolusWidth * scale),
		fh = Math.max(48, e.bolusHeight * scale);
	const shapeClass = electronBolusShapeClass(e.bolusShape);
	const posOK = !!e.bolusPositionOK,
		gapOK = !!e.bolusAirGapOK;
	host.innerHTML = `<div class="electron-bolus-task-head"><div><h4>Electron bolus placement · treatment-room task</h4><p>Drag the prescribed ${e.bolusThickness.toFixed(1)}-cm bolus from the supply area onto the custom ${e.bolusShape.toLowerCase()} field. Then use the side profile to lower/conform it to the skin until no clinically meaningful air gap remains.</p></div><div class="electron-bolus-status ${posOK && gapOK ? 'good' : ''}">${posOK && gapOK ? 'BOLUS VERIFIED' : 'BOLUS HOLD'}</div></div>
            <div class="electron-bolus-workspace">
              <div id="electronBolusStage" class="electron-bolus-stage">
                <div class="electron-bolus-stage-label">Beam's-eye surface placement</div>
                <div class="electron-patient-surface"></div>
                <div id="electronFieldTarget" class="electron-field-target ${shapeClass}" style="width:${fw}px;height:${fh}px"></div>
                <div id="electronBolusPiece" class="electron-bolus-piece ${shapeClass} ${posOK ? 'good' : ''}" style="width:${fw}px;height:${fh}px;left:${e.bolusDragX}px;top:${e.bolusDragY}px"><span>${e.bolusThickness.toFixed(1)} cm<br>BOLUS</span></div>
                <div class="electron-bolus-help">Drag bolus until it completely overlays the cyan field outline.</div>
              </div>
              <div id="electronBolusProfile" class="electron-bolus-profile">
                <div class="electron-bolus-profile-label">Surface-contact profile</div>
                <div class="electron-profile-field"></div>
                <div class="electron-profile-skin"></div>
                <div id="electronProfileBolus" class="electron-profile-bolus ${gapOK ? 'good' : ''}" style="top:${e.bolusContactY}%"></div>
                <div class="electron-gap-readout">AIR GAP · ${Number(e.airGapMm || 0).toFixed(1)} mm<br>${gapOK ? 'CONTACT ACCEPTABLE' : 'Drag bolus downward to conform to skin'}</div>
              </div>
            </div>
            <div class="electron-bolus-metrics">
              <div class="electron-bolus-metric ${posOK ? 'good' : ''}"><span>Field coverage</span><b>${posOK ? 'MATCHED' : 'NOT MATCHED'}</b></div>
              <div class="electron-bolus-metric ${gapOK ? 'good' : ''}"><span>Skin contact</span><b>${gapOK ? 'NO AIR GAP' : `${Number(e.airGapMm || 0).toFixed(1)} mm gap`}</b></div>
              <div class="electron-bolus-metric ${electronBolusDeliveryOK() ? 'good' : ''}"><span>Beam interlock</span><b>${electronBolusDeliveryOK() ? 'RELEASED' : 'HOLD'}</b></div>
            </div>`;
	wireElectronBolusDeliveryDrag();
	updateElectronBolusMesh();
}
function wireElectronBolusDeliveryDrag() {
	const stage = document.getElementById('electronBolusStage'),
		piece = document.getElementById('electronBolusPiece'),
		target = document.getElementById('electronFieldTarget');
	const profile = document.getElementById('electronBolusProfile'),
		profileBolus = document.getElementById('electronProfileBolus');
	const e = S.specialSetupWorkflow?.electron;
	if (!e || !stage || !piece || !target || !profile || !profileBolus) return;
	const finishPlacement = () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
		const sr = stage.getBoundingClientRect(),
			tr = target.getBoundingClientRect(),
			pr = piece.getBoundingClientRect();
		const tcx = (tr.left + tr.right) / 2,
			tcy = (tr.top + tr.bottom) / 2,
			pcx = (pr.left + pr.right) / 2,
			pcy = (pr.top + pr.bottom) / 2;
		const dx = pcx - tcx,
			dy = pcy - tcy;
		const tolPx = 7;
		e.bolusPositionOK = Math.abs(dx) <= tolPx && Math.abs(dy) <= tolPx;
		e.bolusPlaced = true;
		e.bolusOffsetXcm = dx / 16;
		e.bolusOffsetYcm = dy / 16;
		if (!e.bolusPositionOK) {
			e.bolusAirGapOK = false;
		}
		updateElectronBolusMesh();
		renderTreatmentDeliveryPanel();
	};
	let dragging = false,
		ox = 0,
		oy = 0;
	piece.addEventListener('pointerdown', (ev) => {
		if (!S.specialSetupWorkflow.verified || S.treatmentDelivery.delivering) return;
		dragging = true;
		piece.setPointerCapture(ev.pointerId);
		const r = piece.getBoundingClientRect();
		ox = ev.clientX - (r.left + r.width / 2);
		oy = ev.clientY - (r.top + r.height / 2);
	});
	piece.addEventListener('pointermove', (ev) => {
		if (!dragging) return;
		const sr = stage.getBoundingClientRect(),
			pr = piece.getBoundingClientRect();
		let x = ev.clientX - sr.left - ox,
			y = ev.clientY - sr.top - oy;
		x = Math.max(pr.width / 2, Math.min(sr.width - pr.width / 2, x));
		y = Math.max(pr.height / 2, Math.min(sr.height - pr.height / 2, y));
		e.bolusDragX = x;
		e.bolusDragY = y;
		e.bolusPlaced = true;
		e.bolusPositionOK = false;
		e.bolusAirGapOK = false;
		piece.style.left = `${x}px`;
		piece.style.top = `${y}px`;
		piece.classList.remove('good');
	});
	piece.addEventListener('pointerup', (ev) => {
		if (!dragging) return;
		dragging = false;
		try {
			piece.releasePointerCapture(ev.pointerId);
			// eslint-disable-next-line no-empty -- legacy silent-catch pattern, error intentionally swallowed
		} catch {}
		finishPlacement();
	});
	piece.addEventListener('pointercancel', () => {
		dragging = false;
	});
	let pdrag = false;
	profileBolus.addEventListener('pointerdown', (ev) => {
		if (!e.bolusPositionOK || S.treatmentDelivery.delivering) return;
		pdrag = true;
		profileBolus.setPointerCapture(ev.pointerId);
	});
	profileBolus.addEventListener('pointermove', (ev) => {
		if (!pdrag) return;
		const r = profile.getBoundingClientRect();
		let pct = ((ev.clientY - r.top) / r.height) * 100;
		pct = Math.max(18, Math.min(65, pct));
		e.bolusContactY = pct;
		const gap = Math.max(0, (65 - pct) * 0.13);
		e.airGapMm = Number(gap.toFixed(1));
		e.bolusAirGapOK = e.airGapMm <= 1;
		profileBolus.style.top = `${pct}%`;
		profileBolus.classList.toggle('good', e.bolusAirGapOK);
		updateElectronBolusMesh();
	});
	profileBolus.addEventListener('pointerup', (ev) => {
		if (!pdrag) return;
		pdrag = false;
		try {
			profileBolus.releasePointerCapture(ev.pointerId);
			// eslint-disable-next-line no-empty -- legacy silent-catch pattern, error intentionally swallowed
		} catch {}
		e.bolusPlaced = true;
		e.bolusAirGapOK = Number(e.airGapMm || 99) <= 1;
		if (e.bolusPositionOK && e.bolusAirGapOK && !e.bolusLogged) {
			e.bolusLogged = true;
			oisLogEvent(
				'SETUP',
				'Electron bolus verified',
				`${e.bolusThickness.toFixed(1)} cm bolus · field matched · no air gap`,
				'electron-bolus-verified'
			);
		}
		updateElectronBolusMesh();
		renderTreatmentDeliveryPanel();
		renderTreatmentMonitor();
	});
	profileBolus.addEventListener('pointercancel', () => {
		pdrag = false;
	});
}

const IMMOBILIZATION_DEVICE_META = {
	headMask: { name: 'Short Head Mask', color: '#7fd8f7', dark: '#254c61' },
	hnMask: { name: 'Head & Shoulders Mask', color: '#9ae894', dark: '#325a2f' },
	bodyFix: { name: 'Body Fix (SBRT)', color: '#ffb1a0', dark: '#6b352b' },
	headrest: { name: 'Headrest', color: '#ffd77b', dark: '#6b5521' },
	shoulderPull: { name: 'Shoulder Pull-Down', color: '#ff9f70', dark: '#6a3b24' },
	wingBoard: { name: 'Wing Board', color: '#bc9cff', dark: '#4d3f72' },
	vacLok: { name: 'Vac-Lok', color: '#7bc9b5', dark: '#27574f' },
	breastBoard: { name: 'Breast Board', color: '#ff8eb2', dark: '#6e2f43' },
	armSupport: { name: 'Arm Support', color: '#c9acff', dark: '#4e4270' },
	bellyBoard: { name: 'Belly Board', color: '#f7c76e', dark: '#705827' },
	kneeSupport: { name: 'Knee Support', color: '#8ec3ff', dark: '#2f5371' },
	footStocks: { name: 'Foot Stocks', color: '#f59dcd', dark: '#6e3654' },
	srsMask: { name: 'SRS Mask / Baseplate', color: '#62e0df', dark: '#1f5b5c' },
	legPositioner: { name: 'Leg / Ankle Positioner', color: '#f4b76d', dark: '#6d4a1f' }
};
function immoMeta(id) {
	return (
		IMMOBILIZATION_DEVICE_META[id] || {
			name: 'Immobilization Device',
			color: '#5ea4b4',
			dark: '#315566'
		}
	);
}
const IMMOBILIZATION_DEVICE_IDS = [
	'headMask',
	'hnMask',
	'bodyFix',
	'headrest',
	'shoulderPull',
	'wingBoard',
	'vacLok',
	'breastBoard',
	'armSupport',
	'bellyBoard',
	'kneeSupport',
	'footStocks',
	'srsMask',
	'legPositioner'
];
function immobilizationSpec() {
	return S.activeTreatmentCase?.immobilization || null;
}
function immobilizationRequired() {
	const s = immobilizationSpec();
	return !!(s && Array.isArray(s.required) && s.required.length);
}
function immobilizationVerified() {
	return !immobilizationRequired() || !!S.immobilizationWorkflow.verified;
}
function shuffleImmo(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
function resetImmobilizationWorkflowForCase() {
	const required = immobilizationRequired();
	S.immobilizationWorkflow = {
		required,
		verified: !required,
		selected: [],
		shelfOrder: shuffleImmo(IMMOBILIZATION_DEVICE_IDS),
		attempts: 0,
		lastFeedback: '',
		positionChecked: false,
		indexingChecked: false,
		preparationChecked: false
	};
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	if (immobilizationLaunchButton) {
		immobilizationLaunchButton.classList.toggle('case-active', required);
		immobilizationLaunchButton.disabled = !required;
	}
}
function immobilizationDeviceSVG(id) {
	const meta = immoMeta(id),
		c = meta.color,
		d = meta.dark;
	const stroke = 'stroke="#edf9ff" stroke-width="2.4"',
		outline = `stroke="${c}" stroke-width="3"`,
		deep = `fill="${d}"`,
		fillSoft = `fill="${c}" fill-opacity="0.82"`;
	const svg = {
		headMask: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M20 14q20-15 40 0v34q-19 10-40 0Z" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="3.5 3"/><ellipse cx="40" cy="24" rx="17" ry="18" ${deep} ${stroke}/><circle cx="34" cy="23" r="1.9" fill="#0f1519"/><circle cx="46" cy="23" r="1.9" fill="#0f1519"/><path d="M34 33q6 4 12 0" fill="none" stroke="#0f1519" stroke-width="2"/><path d="M26 52h28" ${outline}/></svg>`,
		hnMask: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M12 8h56l4 48H8Z" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="4 3"/><ellipse cx="40" cy="19" rx="14" ry="14" ${deep} ${stroke}/><rect x="30" y="30" width="20" height="9" rx="4" ${fillSoft}/><path d="M8 52h64" ${outline}/><path d="M14 44h52" stroke="${c}" stroke-width="2" stroke-dasharray="3 3"/></svg>`,
		bodyFix: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="8" y="9" width="64" height="46" rx="12" ${fillSoft} ${stroke}/><path d="M40 12v40" stroke="${d}" stroke-width="3"/><path d="M20 20q20 8 40 0M20 32q20 8 40 0M20 44q20 8 40 0" fill="none" stroke="${d}" stroke-width="2.4"/><circle cx="66" cy="15" r="3.4" fill="#0d1518" stroke="#edf9ff" stroke-width="1.4"/></svg>`,
		headrest: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M12 49q12-12 20-30h18q10 18 18 30l-7 6H19Z" ${fillSoft} ${stroke}/><path d="M28 43q12-13 24 0" fill="none" stroke="${d}" stroke-width="4.5"/></svg>`,
		shoulderPull: `<svg viewBox="0 0 80 64" aria-hidden="true"><circle cx="20" cy="49" r="9" ${fillSoft} ${stroke}/><circle cx="60" cy="49" r="9" ${fillSoft} ${stroke}/><path d="M20 13v27M60 13v27" stroke="${c}" stroke-width="4.5" stroke-linecap="round"/><path d="M20 17q20 14 40 0" fill="none" stroke="#f6fdff" stroke-width="2.2"/></svg>`,
		wingBoard: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="22" y="9" width="36" height="46" rx="3" ${deep} ${stroke}/><path d="M22 17L8 10v34l14-7" ${fillSoft} ${stroke}/><path d="M58 17l14-7v34l-14-7" ${fillSoft} ${stroke}/><circle cx="31" cy="20" r="3" fill="#0d1518"/><circle cx="49" cy="20" r="3" fill="#0d1518"/></svg>`,
		vacLok: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M10 34q6-22 28-20q24-4 32 17q6 21-18 26q-31 6-42-5q-7-7 0-18Z" ${fillSoft} ${stroke}/><circle cx="26" cy="27" r="2.2" fill="#edf9ff"/><circle cx="39" cy="22" r="2.2" fill="#edf9ff"/><circle cx="52" cy="37" r="2.2" fill="#edf9ff"/></svg>`,
		breastBoard: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M11 52h58L55 11H24Z" ${fillSoft} ${stroke}/><path d="M24 48 53 18" stroke="#f8fdff" stroke-width="2.2"/><path d="M27 22h25" stroke="${d}" stroke-width="4.5" stroke-linecap="round"/></svg>`,
		armSupport: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M19 50V18q0-7 7-7h5v39" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M61 50V18q0-7-7-7h-5v39" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M28 13h24" stroke="#edf9ff" stroke-width="3.2" stroke-linecap="round"/></svg>`,
		bellyBoard: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="8" y="12" width="64" height="42" rx="5" ${fillSoft} ${stroke}/><ellipse cx="40" cy="34" rx="16" ry="12" fill="#0d1619" stroke="#edf9ff" stroke-width="2.4"/><path d="M15 20h11M54 20h11" stroke="#f6fdff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
		kneeSupport: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M12 52 40 13 68 52Z" ${fillSoft} ${stroke}/><path d="M27 40q13-12 26 0" fill="none" stroke="${d}" stroke-width="4.4"/></svg>`,
		footStocks: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="10" y="20" width="24" height="33" rx="3" ${fillSoft} ${stroke}/><rect x="46" y="20" width="24" height="33" rx="3" ${fillSoft} ${stroke}/><path d="M16 28h12M52 28h12" stroke="${d}" stroke-width="4.4" stroke-linecap="round"/></svg>`,
		srsMask: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="15" y="50" width="50" height="7" rx="2" ${fillSoft} ${stroke}/><path d="M23 43q0-29 17-34q17 5 17 34" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="40" cy="26" rx="10" ry="14" fill="#0d171b" stroke="#edf9ff" stroke-width="2"/><path d="M27 18 20 14M53 18l7-4M24 34l-7 3M56 34l7 3" stroke="${d}" stroke-width="3"/></svg>`,
		legPositioner: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M13 47h54v9H13Z" ${fillSoft} ${stroke}/><path d="M22 47V24q0-9 9-9h10q9 0 9 9v23" fill="${d}" stroke="#edf9ff" stroke-width="2.4"/><path d="M27 28h18v9H27Z" fill="${c}"/><path d="M54 33h10v14H54Z" ${fillSoft} ${stroke}/></svg>`
	};
	return svg[id] || svg.vacLok;
}
function renderImmobilizationPanel() {
	const spec = immobilizationSpec();
	setTextById(
		'immobilizationPatient',
		S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
			: 'No setup case'
	);
	setTextById(
		'immobilizationPosition',
		S.activeTreatmentCase?.positionLabel || S.activeTreatmentCase?.position || '—'
	);
	setTextById(
		'immobilizationStatusChip',
		!spec ? 'N/A' : S.immobilizationWorkflow.verified ? 'VERIFIED' : 'PENDING'
	);
	const summary = document.getElementById('immobilizationOrderSummary'),
		inst = document.getElementById('immobilizationInstructions'),
		feedback = document.getElementById('immobilizationFeedback');
	if (!spec) {
		if (summary)
			summary.textContent = 'This patient does not currently have a device-selection task.';
		if (inst) inst.innerHTML = '';
		if (feedback) {
			feedback.className = 'immo-status';
			feedback.textContent = 'No immobilization task is active for this patient.';
		}
		if (immobilizationShelf) immobilizationShelf.innerHTML = '';
		if (immobilizationPlacedList) immobilizationPlacedList.innerHTML = '';
		return;
	}
	if (summary) {
		const keyNames =
			spec.keyNames && spec.keyNames.length
				? spec.keyNames
				: (spec.required || []).map((id) => immoMeta(id).name);
		summary.innerHTML =
			(spec.orderSummary || 'Select and place the prescribed immobilization equipment.') +
			(keyNames.length
				? `<span class="immo-key"><b>Immobilization key — required for this patient:</b> ${keyNames.join('  +  ')}</span>`
				: '');
	}
	const structured = [
		['Position / orientation', spec.positionInstructions || []],
		['Indexing / reproducibility', spec.indexingInstructions || []],
		['Pre-treatment preparation', spec.preparationInstructions || []]
	];
	const hasStructured = structured.some(([, items]) => Array.isArray(items) && items.length);
	if (inst)
		inst.innerHTML = hasStructured
			? structured
					.filter(([, items]) => items.length)
					.map(([title, items]) => `<li><b>${title}:</b> ${items.join(' ')}</li>`)
					.join('')
			: (spec.instructions || []).map((x) => `<li>${x}</li>`).join('');
	const optionalNames = (spec.optional || []).map((id) => immoMeta(id).name);
	if (inst && optionalNames.length)
		inst.innerHTML += `<li><b>Plan-dependent / optional equipment:</b> ${optionalNames.join(', ')}. Do not add unless the setup record calls for it.</li>`;
	const verifyBox = document.getElementById('immobilizationVerificationChecks');
	if (verifyBox) {
		const prepRequired =
			Array.isArray(spec.preparationInstructions) && spec.preparationInstructions.length > 0;
		verifyBox.innerHTML = `<h4>Setup verification</h4><div class="immo-verify-checks">
                    <label><input id="immoPositionCheck" type="checkbox" ${S.immobilizationWorkflow.positionChecked ? 'checked' : ''}> <span><b>Position</b> · patient position/orientation reproduced from the setup record.</span></label>
                    <label><input id="immoIndexCheck" type="checkbox" ${S.immobilizationWorkflow.indexingChecked ? 'checked' : ''}> <span><b>Indexing</b> · required board/device indices and alignment references verified.</span></label>
                    ${prepRequired ? `<label><input id="immoPrepCheck" type="checkbox" ${S.immobilizationWorkflow.preparationChecked ? 'checked' : ''}> <span><b>Preparation</b> · prescribed pre-treatment preparation/monitoring requirements confirmed.</span></label>` : ''}
                </div>`;
	}
	const selected = new Set(S.immobilizationWorkflow.selected || []);
	if (immobilizationShelf)
		immobilizationShelf.innerHTML = (
			S.immobilizationWorkflow.shelfOrder || IMMOBILIZATION_DEVICE_IDS
		)
			.map((id) => {
				const meta = immoMeta(id);
				return `<div class="immo-device ${selected.has(id) ? 'used' : ''}" style="--device-color:${meta.color};--device-color-dark:${meta.dark}" draggable="${selected.has(id) ? 'false' : 'true'}" data-immo-id="${id}" aria-label="${meta.name}">${immobilizationDeviceSVG(id)}<div class="immo-device-label">${meta.name}</div></div>`;
			})
			.join('');
	if (immobilizationPlacedList)
		immobilizationPlacedList.innerHTML = (S.immobilizationWorkflow.selected || [])
			.map((id) => {
				const meta = immoMeta(id);
				return `<div class="immo-placed-device" style="--device-color:${meta.color};--device-color-dark:${meta.dark}" draggable="true" data-immo-id="${id}" aria-label="${meta.name} placed on treatment table">${immobilizationDeviceSVG(id)}<div class="immo-device-label">${meta.name}</div></div>`;
			})
			.join('');
	if (feedback) {
		feedback.className =
			'immo-status' +
			(S.immobilizationWorkflow.verified
				? ' good'
				: S.immobilizationWorkflow.attempts
					? ' bad'
					: '');
		feedback.textContent = S.immobilizationWorkflow.verified
			? 'SETUP VERIFIED · equipment, position, indexing, and prescribed preparation are complete.'
			: S.immobilizationWorkflow.lastFeedback ||
				'Complete the setup instructions, drag the prescribed equipment to the table, then verify the setup.';
	}
	wireImmobilizationDragDrop();
	wireImmobilizationVerificationChecks();
}
function wireImmobilizationVerificationChecks() {
	[
		['immoPositionCheck', 'positionChecked'],
		['immoIndexCheck', 'indexingChecked'],
		['immoPrepCheck', 'preparationChecked']
	].forEach(([id, key]) => {
		const el = document.getElementById(id);
		if (!el) return;
		el.addEventListener('change', () => {
			S.immobilizationWorkflow[key] = !!el.checked;
			S.immobilizationWorkflow.verified = false;
			S.immobilizationWorkflow.lastFeedback =
				'Setup verification changed · re-verify before treatment.';
			renderTreatmentDeliveryPanel();
			renderTreatmentMonitor();
		});
	});
}
function wireImmobilizationDragDrop() {
	document
		.querySelectorAll('.immo-device[draggable="true"],.immo-placed-device[draggable="true"]')
		.forEach((el) => {
			el.addEventListener('dragstart', (ev) => {
				el.classList.add('dragging');
				ev.dataTransfer.setData('text/immo-id', el.dataset.immoId);
				ev.dataTransfer.setData(
					'text/immo-source',
					el.classList.contains('immo-placed-device') ? 'table' : 'shelf'
				);
			});
			el.addEventListener('dragend', () => el.classList.remove('dragging'));
		});
	document
		.querySelectorAll('.immo-placed-device')
		.forEach((el) =>
			el.addEventListener('dblclick', () => removeImmobilizationDevice(el.dataset.immoId))
		);
}
function addImmobilizationDevice(id) {
	if (!immobilizationRequired() || !IMMOBILIZATION_DEVICE_IDS.includes(id)) return;
	if (!S.immobilizationWorkflow.selected.includes(id)) S.immobilizationWorkflow.selected.push(id);
	S.immobilizationWorkflow.verified = false;
	S.immobilizationWorkflow.lastFeedback =
		'Equipment changed · verify the complete setup before proceeding.';
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}
function removeImmobilizationDevice(id) {
	S.immobilizationWorkflow.selected = (S.immobilizationWorkflow.selected || []).filter(
		(x) => x !== id
	);
	S.immobilizationWorkflow.verified = false;
	S.immobilizationWorkflow.lastFeedback =
		'Equipment removed · complete the prescribed setup before verification.';
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}
function verifyImmobilizationSelection() {
	const spec = immobilizationSpec();
	if (!spec) return;
	S.immobilizationWorkflow.attempts++;
	const req = [...(spec.required || [])],
		optional = [...(spec.optional || [])],
		got = [...(S.immobilizationWorkflow.selected || [])];
	const devicesOK =
		req.every((x) => got.includes(x)) && got.every((x) => req.includes(x) || optional.includes(x));
	const prepRequired =
		Array.isArray(spec.preparationInstructions) && spec.preparationInstructions.length > 0;
	const workflowOK =
		!!S.immobilizationWorkflow.positionChecked &&
		!!S.immobilizationWorkflow.indexingChecked &&
		(!prepRequired || !!S.immobilizationWorkflow.preparationChecked);
	const ok = devicesOK && workflowOK;
	S.immobilizationWorkflow.verified = ok;
	if (ok)
		S.immobilizationWorkflow.lastFeedback =
			'SETUP VERIFIED · equipment, position, indexing, and prescribed preparation are complete.';
	else if (!devicesOK)
		S.immobilizationWorkflow.lastFeedback =
			'SETUP HOLD · one or more selected devices do not match the required or plan-dependent setup equipment.';
	else
		S.immobilizationWorkflow.lastFeedback =
			'SETUP HOLD · complete the position, indexing, and prescribed preparation verification checks.';
	if (ok) {
		setPendantLCD('PATIENT SETUP', 'IMMOBILIZATION VERIFIED');
		oisLogEvent(
			'SETUP',
			'Patient setup verified',
			`${got.map((id) => immoMeta(id).name).join(' + ')} · position/indexing${prepRequired ? ' / preparation' : ''} confirmed`,
			'immobilization-verified'
		);
	} else setPendantLCD('PATIENT SETUP', 'HOLD · CHECK SETUP');
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	renderOISPanel();
}
function clearImmobilizationSelection() {
	S.immobilizationWorkflow.selected = [];
	S.immobilizationWorkflow.verified = false;
	S.immobilizationWorkflow.positionChecked = false;
	S.immobilizationWorkflow.indexingChecked = false;
	S.immobilizationWorkflow.preparationChecked = false;
	S.immobilizationWorkflow.lastFeedback =
		'All equipment returned to the shelf and setup verification reset.';
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}
function createImmobilizationShelf3D() {
	if (!S.scene || S.immobilizationShelf3D) return;
	const g = new THREE.Group();
	g.name = 'vaultImmobilizationShelf';
	const metal = new THREE.MeshStandardMaterial({
		color: 0xaeb7bc,
		metalness: 0.46,
		roughness: 0.48
	});
	const shelfMat = new THREE.MeshStandardMaterial({
		color: 0x4a5358,
		metalness: 0.24,
		roughness: 0.7
	});
	const backPanelMat = new THREE.MeshStandardMaterial({ color: 0xd7d9dc, roughness: 0.92 });
	const addBox = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
		m.position.set(x, y, z);
		m.rotation.set(rx, ry, rz);
		m.castShadow = m.receiveShadow = true;
		g.add(m);
		return m;
	};
	addBox(1.72, 2.28, 0.04, backPanelMat, 0, 1.12, -0.27);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 0.12, 0);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 0.78, 0);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 1.44, 0);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 2.1, 0);
	addBox(0.07, 2.18, 0.56, metal, -0.83, 1.1, 0);
	addBox(0.07, 2.18, 0.56, metal, 0.83, 1.1, 0);
	const deviceMat = (id) =>
		new THREE.MeshStandardMaterial({
			color: parseInt(immoMeta(id).color.slice(1), 16),
			roughness: 0.6,
			metalness: 0.08
		});
	addBox(0.42, 0.12, 0.28, deviceMat('headrest'), -0.55, 0.25, 0);
	const hm = deviceMat('headMask');
	const headMask = new THREE.Mesh(
		new THREE.SphereGeometry(0.16, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
		hm
	);
	headMask.scale.set(1, 0.65, 1.05);
	headMask.rotation.x = Math.PI;
	headMask.position.set(-0.1, 0.31, 0.02);
	headMask.castShadow = headMask.receiveShadow = true;
	g.add(headMask);
	addBox(0.18, 0.02, 0.12, hm, -0.1, 0.16, 0.02);
	addBox(0.18, 0.28, 0.2, deviceMat('footStocks'), 0.43, 0.28, -0.08);
	addBox(0.18, 0.28, 0.2, deviceMat('footStocks'), 0.61, 0.28, 0.08);
	const vac = deviceMat('vacLok');
	const bag = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), vac);
	bag.scale.set(1.7, 0.55, 1.05);
	bag.position.set(-0.45, 0.92, 0.02);
	bag.castShadow = bag.receiveShadow = true;
	g.add(bag);
	addBox(0.46, 0.12, 0.34, deviceMat('kneeSupport'), 0.05, 0.9, 0.03, -0.4, 0, 0);
	addBox(0.18, 0.35, 0.18, deviceMat('shoulderPull'), 0.58, 0.96, -0.12);
	addBox(0.18, 0.35, 0.18, deviceMat('shoulderPull'), 0.58, 0.96, 0.12);
	addBox(0.56, 0.1, 0.38, deviceMat('breastBoard'), -0.46, 1.58, 0.02, -0.4, 0, 0);
	addBox(0.38, 0.14, 0.3, deviceMat('armSupport'), 0.02, 1.58, 0.02);
	addBox(0.42, 0.1, 0.42, deviceMat('bellyBoard'), 0.52, 1.58, 0.02);
	const hole = new THREE.Mesh(
		new THREE.TorusGeometry(0.1, 0.022, 10, 24),
		new THREE.MeshStandardMaterial({ color: 0x0f171b, roughness: 0.3 })
	);
	hole.rotation.x = Math.PI / 2;
	hole.position.set(0.52, 1.6, 0.02);
	hole.castShadow = hole.receiveShadow = true;
	g.add(hole);
	const hnm = deviceMat('hnMask');
	const hn = new THREE.Mesh(
		new THREE.SphereGeometry(0.15, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
		hnm
	);
	hn.scale.set(1, 0.62, 1.0);
	hn.rotation.x = Math.PI;
	hn.position.set(-0.5, 2.18, 0.02);
	hn.castShadow = hn.receiveShadow = true;
	g.add(hn);
	addBox(0.28, 0.02, 0.2, hnm, -0.5, 2.03, 0.02);
	addBox(0.52, 0.12, 0.34, deviceMat('wingBoard'), 0.02, 2.18, 0.02);
	addBox(0.26, 0.18, 0.26, deviceMat('breastBoard'), 0.56, 2.18, 0.02, -0.28, 0, 0);
	const srsMat = deviceMat('srsMask');
	const srsRing = new THREE.Mesh(
		new THREE.TorusGeometry(0.13, 0.025, 10, 24, Math.PI * 1.6),
		srsMat
	);
	srsRing.rotation.z = 0.75;
	srsRing.position.set(-0.2, 2.2, 0.17);
	g.add(srsRing);
	addBox(0.28, 0.025, 0.16, srsMat, -0.2, 2.05, 0.17);
	addBox(0.34, 0.16, 0.22, deviceMat('legPositioner'), 0.62, 0.96, 0.2, 0, 0, 0.18);
	g.position.set(-11.1, GROUND_Y + 0.01, -6.8);
	g.rotation.y = Math.PI / 2;
	S.scene.add(g);
	S.immobilizationShelf3D = g;
}
function createImmobilizationPatientGroup() {
	if (!S.patientBodyGroup || S.immobilizationPatientGroup) return;
	S.immobilizationPatientGroup = new THREE.Group();
	S.immobilizationPatientGroup.name = 'selectedImmobilization';
	S.patientBodyGroup.add(S.immobilizationPatientGroup);
}
function updateImmobilizationPatientVisuals() {
	if (!S.immobilizationPatientGroup) {
		createImmobilizationPatientGroup();
		if (!S.immobilizationPatientGroup) return;
	}
	while (S.immobilizationPatientGroup.children.length)
		S.immobilizationPatientGroup.remove(S.immobilizationPatientGroup.children[0]);
	const ids = S.immobilizationWorkflow.selected || [];
	const addBox = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
		m.position.set(x, y, z);
		m.rotation.set(rx, ry, rz);
		S.immobilizationPatientGroup.add(m);
		return m;
	};
	ids.forEach((id) => {
		const meta = immoMeta(id),
			mat = new THREE.MeshStandardMaterial({
				color: parseInt(meta.color.slice(1), 16),
				roughness: 0.55,
				transparent: true,
				opacity: 0.78
			});
		if (id === 'headMask' || id === 'hnMask') {
			const r = id === 'hnMask' ? 0.18 : 0.145,
				m = new THREE.Mesh(
					new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.7),
					mat
				);
			m.scale.set(1, 0.55, 1.05);
			m.rotation.x = Math.PI;
			m.position.set(0, 0.125, -0.88);
			S.immobilizationPatientGroup.add(m);
			if (id === 'hnMask') addBox(0.52, 0.018, 0.34, mat, 0, 0.095, -0.7);
		} else if (id === 'headrest') addBox(0.25, 0.05, 0.18, mat, 0, 0.035, -0.9, -0.18, 0, 0);
		else if (id === 'shoulderPull') {
			addBox(0.035, 0.025, 0.52, mat, -0.25, 0.09, -0.61, 0, 0, 0.05);
			addBox(0.035, 0.025, 0.52, mat, 0.25, 0.09, -0.61, 0, 0, -0.05);
		} else if (id === 'wingBoard') {
			addBox(0.7, 0.025, 0.52, mat, 0, -0.015, -0.55);
			addBox(0.22, 0.025, 0.42, mat, -0.42, 0.015, -0.62, 0, 0, -0.28);
			addBox(0.22, 0.025, 0.42, mat, 0.42, 0.015, -0.62, 0, 0, 0.28);
		} else if (id === 'vacLok') addBox(0.62, 0.04, 0.78, mat, 0, -0.018, -0.15);
		else if (id === 'bodyFix') {
			addBox(0.7, 0.09, 1.55, mat, 0, -0.03, 0);
			addBox(0.16, 0.14, 1.55, mat, -0.34, 0.04, 0);
			addBox(0.16, 0.14, 1.55, mat, 0.34, 0.04, 0);
		} else if (id === 'breastBoard') addBox(0.62, 0.035, 0.82, mat, 0, -0.005, -0.34, -0.1, 0, 0);
		else if (id === 'armSupport') {
			addBox(0.07, 0.12, 0.48, mat, -0.3, 0.09, -0.68, 0, 0, -0.08);
			addBox(0.07, 0.12, 0.48, mat, 0.3, 0.09, -0.68, 0, 0, 0.08);
		} else if (id === 'bellyBoard') {
			addBox(0.66, 0.035, 0.82, mat, 0, -0.018, 0.08);
			const hole = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 10, 24), mat);
			hole.rotation.x = Math.PI / 2;
			hole.position.set(0, 0.012, 0.08);
			S.immobilizationPatientGroup.add(hole);
		} else if (id === 'kneeSupport') {
			const geo = new THREE.ConeGeometry(0.18, 0.28, 3),
				m = new THREE.Mesh(geo, mat);
			m.rotation.z = Math.PI / 2;
			m.position.set(0, 0.03, 0.52);
			S.immobilizationPatientGroup.add(m);
		} else if (id === 'footStocks') {
			addBox(0.16, 0.12, 0.16, mat, -0.12, 0.05, 0.87);
			addBox(0.16, 0.12, 0.16, mat, 0.12, 0.05, 0.87);
		} else if (id === 'srsMask') {
			const m = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 10, 24, Math.PI * 1.7), mat);
			m.rotation.x = Math.PI / 2;
			m.position.set(0, 0.13, -0.88);
			S.immobilizationPatientGroup.add(m);
			addBox(0.34, 0.02, 0.22, mat, 0, 0.02, -0.88);
		} else if (id === 'legPositioner') {
			addBox(0.18, 0.14, 0.22, mat, -0.12, 0.05, 0.84, 0, 0, 0.12);
		}
	});
}

function clearanceOverrideRecord(idx = Number(S.treatmentDelivery.activeFieldIndex) || 0) {
	return S.clearanceOverrideState.byField?.[idx] || null;
}
function clearanceOverrideActive(idx = Number(S.treatmentDelivery.activeFieldIndex) || 0) {
	return !!clearanceOverrideRecord(idx)?.active;
}
function clearanceOverrideUsedAny() {
	return !!(
		(S.oisSession?.clearanceOverrides || []).length ||
		Object.values(S.clearanceOverrideState.byField || {}).some((r) => r?.used)
	);
}
function igrtAlignmentReadyForDelivery() {
	return !S.activeTreatmentCase ? false : !!S.clinicalIGRT?.verified;
}
function rawClearanceStatus() {
	const fieldPlan = deliveryCasePlan();
	if (!S.activeTreatmentCase || !fieldPlan) return { hasHold: false };
	const current = getCollisionAssessment(),
		fixedElectron = isFixedElectronField(fieldPlan),
		collisionOK = !current || current.margin >= -COLLISION_PROXY_TOL;
	// eslint-disable-next-line no-useless-assignment -- pre-existing dead code, tracked in #77 phase 2 report
	let trajectory = null,
		// eslint-disable-next-line no-useless-assignment -- pre-existing dead code, tracked in #77 phase 2 report
		trajectoryOK = true;
	if (fixedElectron) {
		trajectory = current;
		trajectoryOK = collisionOK;
	} else {
		trajectory = currentSelectedFieldClearance(TREATMENT_CLEARANCE_REQUIRED_MARGIN);
		trajectoryOK = !!trajectory?.safe;
	}
	const hasHold = !collisionOK || !trajectoryOK;
	const reason = !collisionOK
		? current?.reason || 'Current mechanical clearance hold'
		: !trajectoryOK
			? `${trajectory?.field || fieldPlan.field} · gantry ${Number(trajectory?.angle || 0).toFixed(0)}° trajectory hold`
			: 'Clear';
	return { hasHold, current, collisionOK, trajectory, trajectoryOK, fixedElectron, reason };
}
function renderClearanceOverrideCard() {
	if (!clearanceOverrideCard) return;
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		record = clearanceOverrideRecord(idx),
		raw = rawClearanceStatus(),
		show = !!record?.active || raw.hasHold;
	clearanceOverrideCard.hidden = !show;
	if (!show) return;
	clearanceOverrideCard.classList.toggle('active', !!record?.active);
	const field = deliveryCasePlan()?.field || `Field ${idx + 1}`;
	if (clearanceOverrideReason)
		clearanceOverrideReason.textContent = record?.active
			? `${field}: simulation clearance override ACTIVE for current mechanical clearance and the complete selected treatment trajectory. Underlying simulator hold: ${record.reason || raw.reason}.`
			: `${field}: ${raw.reason}. If you believe the simulator clearance proxy is overly conservative, document your reasoning. The override will apply to both the current pose and the complete trajectory for this selected field/arc.`;
	if (clearanceOverrideRationale && !clearanceOverrideRationale.matches(':focus'))
		clearanceOverrideRationale.value = record?.rationale || '';
	if (clearanceOverrideRationale)
		clearanceOverrideRationale.disabled = !!record?.active || S.treatmentDelivery.delivering;
	if (clearanceOverrideAck) {
		clearanceOverrideAck.checked = !!record?.ack;
		clearanceOverrideAck.disabled = !!record?.active || S.treatmentDelivery.delivering;
	}
	if (clearanceOverrideApply) {
		clearanceOverrideApply.disabled =
			!!record?.active || !raw.hasHold || S.treatmentDelivery.delivering;
		clearanceOverrideApply.textContent = record?.active
			? 'Override Applied'
			: 'Apply Simulation Override';
	}
	if (clearanceOverrideWithdraw)
		clearanceOverrideWithdraw.disabled = !record?.active || S.treatmentDelivery.delivering;
	if (clearanceOverrideStatus)
		clearanceOverrideStatus.textContent = record?.active
			? 'Current-pose and trajectory clearance proxies are overridden for this field. OIS/R&V acknowledgment is mandatory before final sign-off.'
			: 'This affects simulator mechanical/trajectory clearance checks only; geometry, setup, imaging, motion, timeout, and all other treatment interlocks remain active.';
}
function applyClearanceOverride() {
	if (!S.activeTreatmentCase || S.treatmentDelivery.delivering) return;
	const raw = rawClearanceStatus();
	if (!raw.hasHold) {
		renderTreatmentDeliveryPanel();
		return;
	}
	const rationale = (clearanceOverrideRationale?.value || '').trim(),
		ack = !!clearanceOverrideAck?.checked;
	if (rationale.length < 15 || !ack) {
		if (clearanceOverrideStatus)
			clearanceOverrideStatus.textContent =
				'Enter a meaningful rationale (at least 15 characters) and acknowledge the simulation-only warning.';
		return;
	}
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		field = deliveryCasePlan()?.field || `Field ${idx + 1}`;
	const rec = {
		active: true,
		used: true,
		fieldIndex: idx,
		field,
		rationale,
		ack: true,
		reason: raw.reason,
		appliedAt: new Date().toISOString(),
		mechanicalHold: !raw.collisionOK,
		trajectoryHold: !raw.trajectoryOK,
		scope: [
			'current-mechanical',
			'planned-trajectory',
			'dynamic-trajectory',
			'stereotactic-dry-run'
		]
	};
	S.clearanceOverrideState.byField[idx] = rec;
	if (!Array.isArray(S.oisSession.clearanceOverrides)) S.oisSession.clearanceOverrides = [];
	const existing = S.oisSession.clearanceOverrides.findIndex((x) => Number(x.fieldIndex) === idx);
	if (existing >= 0)
		S.oisSession.clearanceOverrides[existing] = {
			...S.oisSession.clearanceOverrides[existing],
			...rec
		};
	else S.oisSession.clearanceOverrides.push({ ...rec });
	S.oisSession.overrideReviewed = false;
	oisLogEvent(
		'OVERRIDE',
		'Simulation clearance override applied',
		`${field} · current pose + full treatment trajectory · ${raw.reason} · rationale: ${rationale}`,
		`clearance-override-${idx}`
	);
	persistOISSession();
	setPendantLCD('CLEARANCE OVERRIDE', 'ACTIVE · OIS SIGN-OFF REQUIRED');
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	renderOISPanel();
	renderSRSPanel();
}
function withdrawClearanceOverride() {
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		rec = clearanceOverrideRecord(idx);
	if (!rec?.active || S.treatmentDelivery.delivering) return;
	rec.active = false;
	rec.withdrawnAt = new Date().toISOString();
	const saved = (S.oisSession.clearanceOverrides || []).find((x) => Number(x.fieldIndex) === idx);
	if (saved) {
		saved.active = false;
		saved.withdrawnAt = rec.withdrawnAt;
	}
	S.oisSession.overrideReviewed = false;
	oisLogEvent(
		'OVERRIDE',
		'Simulation clearance override withdrawn',
		rec.field || `Field ${idx + 1}`,
		`clearance-override-withdraw-${idx}`
	);
	persistOISSession();
	setPendantLCD('CLEARANCE OVERRIDE', 'WITHDRAWN');
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	renderOISPanel();
	renderSRSPanel();
}

function deliveryGeometryChecks() {
	if (!S.activeTreatmentCase) return [];
	const actual = getTreatmentMonitorActual(),
		planned = getCurrentPlannedParameters();
	const field = deliveryCasePlan();
	const defs = field?.electron
		? [
				['Gantry', 'gantry'],
				['Collimator', 'collimator'],
				['Jaws', 'jaws'],
				['Couch position', 'couch'],
				['Treatment couch angle', 'couchAngle']
			]
		: [
				['Gantry', 'gantry'],
				['Collimator', 'collimator'],
				['Jaws', 'jaws'],
				['MLC aperture', 'mlcAperture'],
				['MLC shape', 'mlcShape'],
				['Couch position', 'couch'],
				['Treatment couch angle', 'couchAngle']
			];
	return defs.map(([name, key]) => ({
		name,
		ok: treatmentParamMatches(key, planned[key], actual[key]),
		detail: `${monitorPlannedDisplay(key, planned[key])} / ${actual[key]}`
	}));
}
function getDeliveryReadiness() {
	const checks = [];
	checks.push({
		name: 'Patient / plan loaded',
		ok: !!S.activeTreatmentCase,
		detail: S.activeTreatmentCase ? S.activeTreatmentCase.siteLabel : 'No case'
	});
	if (immobilizationRequired())
		checks.push({
			name: 'Immobilization / indexing verified',
			ok: immobilizationVerified(),
			detail: immobilizationVerified()
				? 'Prescribed equipment selected and indexed'
				: 'Open Patient Setup and drag the correct unlabeled equipment to the treatment table'
		});
	const fieldPlan = deliveryCasePlan();
	checks.push({
		name: 'Selected treatment field',
		ok: !!S.activeTreatmentCase && !!fieldPlan,
		detail: S.activeTreatmentCase
			? `${fieldPlan.field} · Gantry ${monitorPlannedDisplay('gantry', getCurrentPlannedParameters().gantry)}`
			: 'No field'
	});
	const geom = deliveryGeometryChecks();
	const geomOK = geom.length > 0 && geom.every((x) => x.ok);
	checks.push({
		name: 'Treatment geometry matches plan',
		ok: geomOK,
		detail: geomOK ? 'Gantry · Coll · Jaws · MLC · Couch' : 'Review parameter mismatches'
	});
	const imagingRequired = !!(
		S.activeTreatmentCase?.planned?.imaging &&
		String(S.activeTreatmentCase.planned.imaging).toLowerCase() !== 'none'
	);
	const overrideActive = clearanceOverrideActive();
	const igrtOK = !imagingRequired || !!S.clinicalIGRT?.verified;
	checks.push({
		name: 'Image guidance verified',
		ok: igrtOK,
		detail: imagingRequired
			? S.clinicalIGRT?.verified
				? 'IGRT alignment verified'
				: 'Registration / correction incomplete'
			: 'Not prescribed'
	});
	const mmRequired = motionRequired(),
		mmOK = !mmRequired || !!S.motionManagement.verified;
	checks.push({
		name: '4D / motion management verified',
		ok: mmOK,
		detail: mmRequired
			? S.motionManagement.verified
				? S.motionManagement.mode === 'DIBH'
					? 'DIBH reproducibility approved'
					: `Gate ${S.motionManagement.gateLow}–${S.motionManagement.gateHigh}% approved`
				: 'Complete 4D / DIBH verification'
			: 'Not prescribed'
	});
	const adaptiveOK = !adaptiveRequired() || !!S.adaptiveWorkflow.approved;
	checks.push({
		name: 'Adaptive plan approved',
		ok: adaptiveOK,
		detail: adaptiveRequired()
			? S.adaptiveWorkflow.approved
				? `${adaptiveSpec()?.plans?.[S.adaptiveWorkflow.selectedPlanKey]?.title || S.adaptiveWorkflow.selectedPlanKey} approved`
				: 'Open Adaptive and complete the anatomy review / plan selection workflow'
			: 'Not prescribed'
	});
	const specialOK = specialSetupVerified();
	checks.push({
		name: 'Technique-specific setup verified',
		ok: specialOK,
		detail: specialSetupRequired()
			? specialOK
				? `${activeSpecialSetupSpec().label} approved`
				: 'Open Setup Lab and complete the matchline/junction/accessory workflow'
			: 'Not prescribed'
	});
	if (electronBolusDeliveryRequired()) {
		const e = S.specialSetupWorkflow.electron || {},
			bolusOK = electronBolusDeliveryOK();
		const detail = !specialOK
			? 'Complete electron cutout / cone setup first'
			: !e.bolusPositionOK
				? 'Drag bolus onto the custom field'
				: !e.bolusAirGapOK
					? `Conform bolus to skin · ${Number(e.airGapMm || 0).toFixed(1)} mm gap remains`
					: `${Number(e.bolusThickness || activeElectronBolusSpec()?.bolusThicknessCm || 0.5).toFixed(1)} cm bolus · field matched · no air gap`;
		checks.push({ name: 'Bolus placement / skin contact', ok: bolusOK, detail });
	}
	const hardwareOK = !S.kvOn && !S.detectorExtended;
	checks.push({
		name: 'Imaging hardware retracted',
		ok: hardwareOK,
		detail: hardwareOK
			? 'kV + MV stowed'
			: `${S.kvOn ? 'kV extended' : ''}${S.kvOn && S.detectorExtended ? ' · ' : ''}${S.detectorExtended ? 'MV extended' : ''}`
	});
	const clearance = getCollisionAssessment();
	const fixedElectron = isFixedElectronField(fieldPlan);
	const collisionOK = !clearance || clearance.margin >= -COLLISION_PROXY_TOL;
	const currentClearanceOK = collisionOK || overrideActive;
	checks.push({
		name: 'Current mechanical clearance',
		ok: currentClearanceOK,
		detail: collisionOK
			? fixedElectron
				? 'Fixed electron setup clear'
				: 'Clear'
			: overrideActive
				? 'SIMULATION OVERRIDE ACTIVE · OIS sign-off required'
				: clearance?.reason || 'Collision risk'
	});
	if (fixedElectron) {
		const fixedPoseOK = collisionOK || overrideActive;
		checks.push({
			name: 'Fixed treatment-pose clearance',
			ok: fixedPoseOK,
			detail: collisionOK
				? 'Cone/patient/table clearance verified · gantry and couch remain stationary'
				: overrideActive
					? 'SIMULATION OVERRIDE ACTIVE · fixed-pose clearance proxy acknowledged'
					: clearance?.reason || 'Resolve fixed electron setup clearance'
		});
	} else {
		const trajectoryClearance = currentSelectedFieldClearance(TREATMENT_CLEARANCE_REQUIRED_MARGIN);
		const trajectoryOK = !!trajectoryClearance?.safe || overrideActive;
		checks.push({
			name: 'Treatment trajectory clearance',
			ok: trajectoryOK,
			detail: trajectoryClearance?.safe
				? 'Full field/arc preflight clear'
				: overrideActive
					? 'TRAJECTORY INTERLOCK OVERRIDDEN · full selected field/arc may proceed · OIS sign-off required'
					: `${trajectoryClearance?.field || fieldPlan.field} · G ${Number(trajectoryClearance?.angle || 0).toFixed(0)}° hold`
		});
	}
	if (srsRequired()) {
		const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
		const ok = !!S.srsWorkflow.timeoutVerifiedByField[idx],
			type = stereotacticCaseLabel();
		checks.push({
			name: `${type} stereotactic timeout`,
			ok,
			detail: ok
				? 'High-precision timeout approved'
				: `Open SRS / SBRT · dry run + ${type} timeout required`
		});
	}
	const motionOK = !S.pendantMotionArmed;
	checks.push({
		name: 'In-room motion locked',
		ok: motionOK,
		detail: motionOK ? 'Motion Enable locked' : 'Disarm Motion Enable'
	});
	return { ready: checks.every((x) => x.ok), checks };
}
function allTreatmentFieldsCompleted() {
	const fields = getTreatmentFields();
	return !!fields.length && fields.every((_, i) => !!S.treatmentDelivery.completedFields[i]);
}
function deliveredTreatmentMU() {
	return getTreatmentFields().reduce(
		(sum, f, i) => sum + (S.treatmentDelivery.completedFields[i] ? Number(f.mu) || 0 : 0),
		0
	);
}
function expectedTechnicalTreatmentCode() {
	return String(S.activeTreatmentCase?.billing?.treatmentCode || '');
}
function expectedTechnicalIGRTHandling() {
	const explicit = String(S.activeTreatmentCase?.billing?.igrtHandling || '');
	if (explicit) return explicit;
	const imaging = (S.activeTreatmentCase?.planned?.imaging || '').toLowerCase();
	if (!imaging || imaging === 'none') return 'none';
	if (cranialSRSRequired()) return 'separate';
	return 'bundled';
}
function resetTreatmentCompletion() {
	S.treatmentCompletion = {
		verified: false,
		posted: false,
		code: null,
		attempts: 0,
		igrtHandling: null,
		postedAt: null,
		record: null
	};
	if (chargeTreatmentCode) chargeTreatmentCode.value = '';
	if (chargeIgrtHandling) chargeIgrtHandling.value = '';
	const feedback = document.getElementById('chargeFeedback');
	if (feedback) {
		feedback.className = '';
		feedback.textContent =
			'Select the treatment-delivery code and IGRT handling, then verify the charge.';
	}
	const posted = document.getElementById('chargePostedRecord');
	if (posted) {
		posted.className = '';
		posted.textContent = '';
	}
	if (chargePost) chargePost.disabled = true;
	renderTreatmentCompletionControls();
}
function renderTreatmentCompletionControls() {
	const allDone = allTreatmentFieldsCompleted();
	if (deliveryCompleteSession) {
		const skip = !!S.activeTreatmentCase?.billing?.skipChargeCapture;
		deliveryCompleteSession.disabled =
			!S.activeTreatmentCase ||
			!allDone ||
			S.treatmentDelivery.delivering ||
			S.treatmentCompletion.posted;
		deliveryCompleteSession.classList.toggle('ready', allDone && !S.treatmentCompletion.posted);
		deliveryCompleteSession.textContent = S.treatmentCompletion.posted
			? 'Fraction Completed'
			: skip
				? 'Complete SRS Fraction'
				: 'Complete Fraction / Charges';
	}
	if (deliveryReviewCharges) {
		const skip = !!S.activeTreatmentCase?.billing?.skipChargeCapture;
		deliveryReviewCharges.disabled = skip || !S.treatmentCompletion.posted;
		deliveryReviewCharges.textContent = skip ? 'SRS Coding Not Modeled' : 'Review Charge Record';
	}
	const hint = document.getElementById('deliveryCompletionHint');
	if (hint) {
		const fields = getTreatmentFields(),
			done = fields.filter((_, i) => !!S.treatmentDelivery.completedFields[i]).length;
		hint.textContent = S.treatmentCompletion.posted
			? S.treatmentCompletion.code === 'SRS-NOT-MODELED'
				? 'SRS fraction closed · all prescribed stereotactic arcs delivered. Procedure coding is outside the current CPT exercise.'
				: `Treatment session closed · CPT ${S.treatmentCompletion.code} posted to the simulation charge record.`
			: allDone
				? S.activeTreatmentCase?.billing?.skipChargeCapture
					? 'All prescribed SRS arcs are complete. Close the SRS fraction; stereotactic procedure coding is outside the current CPT exercise.'
					: 'All prescribed fields are complete. Open Charge Capture to close today’s treatment fraction.'
				: S.activeTreatmentCase
					? `${done} of ${fields.length} prescribed field${fields.length === 1 ? '' : 's'} complete. Finish all fields before charge capture.`
					: 'Load a treatment case.';
	}
}
const CPT_EDU = {
	77402: {
		title: '77402 · Level 1',
		plain:
			'This is the lower-complexity treatment-delivery category used for conventional 2D photon treatment or electron-field delivery.'
	},
	77407: {
		title: '77407 · Level 2',
		plain:
			'This category fits single-isocenter photon treatment delivered with 3D conformal radiation therapy or IMRT.'
	},
	77412: {
		title: '77412 · Level 3',
		plain:
			'This category is used for higher-complexity situations such as multiple isocenters or single-isocenter photon treatment with active motion management; it also includes total-skin electrons or mixed electron/photon fields.'
	},
	77371: {
		title: '77371 · SRS multi-source cobalt-60',
		plain:
			'This represents a one-session cranial stereotactic radiosurgery course delivered with a multi-source cobalt-60 treatment unit.'
	},
	77372: {
		title: '77372 · SRS linear accelerator based',
		plain:
			'This represents a one-session cranial stereotactic radiosurgery course delivered on a medical linear accelerator.'
	},
	77373: {
		title: '77373 · SBRT treatment delivery',
		plain:
			'This is stereotactic body radiation therapy treatment delivery reported per fraction for one or more extracranial lesions in a treatment course of no more than five fractions; the descriptor includes image guidance.'
	}
};
function updateChargeEducation() {
	const selected = String(chargeTreatmentCode?.value || '');
	document
		.querySelectorAll('[data-cpt-card]')
		.forEach((card) =>
			card.classList.toggle('active', card.getAttribute('data-cpt-card') === selected)
		);
	const expl = document.getElementById('chargeCodeExplanation');
	if (expl) {
		if (!selected)
			expl.innerHTML = sbrtRequired()
				? '<b>How to choose:</b> this is extracranial stereotactic body treatment delivered over five or fewer fractions, so look for the SBRT per-fraction delivery code.'
				: cranialSRSRequired()
					? '<b>How to choose:</b> this is cranial SRS, so distinguish the treatment platform: multi-source cobalt-60 versus linear accelerator.'
					: '<b>How to choose:</b> identify the treatment technique first, then ask whether it is 2D/electron, single-isocenter 3D/IMRT, or a Level 3 situation such as multiple isocenters or active motion management.';
		else expl.innerHTML = `<b>${CPT_EDU[selected].title}:</b> ${CPT_EDU[selected].plain}`;
	}
	const igrtExpl = document.getElementById('chargeIgrtExplanation');
	const igrt = String(chargeIgrtHandling?.value || '');
	if (igrtExpl) {
		if (sbrtRequired()) {
			igrtExpl.innerHTML =
				'<b>SBRT image-guidance note:</b> CPT 77373 is described as SBRT treatment delivery per fraction and includes image guidance. The supplied SBRT management page also contains a separate technical-localization instruction referencing 77387-TC. Because those source statements require coding-context interpretation, this simulator grades the SBRT delivery code (77373) but does not grade a separate IGRT-TC choice for this case.';
		} else if (cranialSRSRequired()) {
			if (igrt === 'separate')
				igrtExpl.innerHTML =
					'<b>Separate 77387-TC:</b> correct for this exercise. For cranial SRS, the supplied CPT material directs the technical component of target-localization guidance to 77387 with the TC modifier.';
			else if (igrt === 'bundled')
				igrtExpl.innerHTML =
					'<b>Bundled selected:</b> that rule applies to the conventional 77402/77407/77412 delivery family in this simulator. Recheck the SRS guidance note.';
			else if (igrt === 'none')
				igrtExpl.innerHTML =
					'<b>No image guidance selected:</b> this SRS workflow included high-precision CBCT localization, so review how the technical guidance component is handled.';
			else
				igrtExpl.innerHTML =
					'<b>SRS localization:</b> the supplied CPT pages direct the technical component of guidance for target localization to 77387 with modifier TC.';
		} else {
			if (igrt === 'bundled')
				igrtExpl.innerHTML =
					'<b>Bundled:</b> image guidance was performed, but its technical component is included in the selected treatment-delivery code for this exercise rather than posted separately.';
			else if (igrt === 'separate')
				igrtExpl.innerHTML =
					'<b>Separate 77387-TC selected:</b> compare this with the bundling rule for 77402, 77407, and 77412 before verifying the charge.';
			else if (igrt === 'none')
				igrtExpl.innerHTML =
					'<b>No image guidance:</b> choose this only when the treatment session did not include image guidance.';
			else
				igrtExpl.innerHTML =
					'<b>IGRT note:</b> for the conventional treatment-delivery codes used in this exercise, the modeled technical image-guidance component is bundled into 77402, 77407, or 77412 when image guidance is performed.';
		}
	}
	const mgmt = document.getElementById('chargeManagementInfo');
	if (mgmt) {
		mgmt.innerHTML = sbrtRequired()
			? '<b>77435 — SBRT treatment management:</b> professional treatment-management service for an SBRT course to one or more lesions, with the course limited to five fractions. It is shown for context; this simulator posts the per-fraction SBRT treatment-delivery code.'
			: cranialSRSRequired()
				? '<b>77432 — SRS treatment management:</b> professional treatment-management code for a complete one-session course of cranial stereotactic radiosurgery. It is shown for context; this simulator posts the technical SRS delivery code and technical localization handling.'
				: '<b>77427 — Radiation treatment management:</b> professional service reported in units of five treatment sessions. It is shown for context only; this simulator’s daily charge-posting step focuses on the technical treatment-delivery session.';
	}
}
function renderChargeCapturePanel() {
	if (!chargeCapturePanel) return;
	const fields = getTreatmentFields(),
		allDone = allTreatmentFieldsCompleted();
	const pat = document.getElementById('chargePatient'),
		tech = document.getElementById('chargeTechnique'),
		del = document.getElementById('chargeDelivered');
	if (pat)
		pat.textContent = S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · Fx ${S.activeTreatmentCase.fraction}`
			: 'No case';
	if (tech) tech.textContent = S.activeTreatmentCase ? S.activeTreatmentCase.technique : '—';
	if (del)
		del.textContent = S.activeTreatmentCase
			? `${fields.filter((_, i) => !!S.treatmentDelivery.completedFields[i]).length}/${fields.length} fields · ${deliveredTreatmentMU()} MU`
			: '—';
	if (chargeTreatmentCode) chargeTreatmentCode.disabled = S.treatmentCompletion.posted;
	if (chargeIgrtHandling) {
		chargeIgrtHandling.disabled = S.treatmentCompletion.posted || sbrtRequired();
		const row = chargeIgrtHandling.closest('.charge-field');
		if (row) row.style.display = sbrtRequired() ? 'none' : 'grid';
		if (sbrtRequired()) chargeIgrtHandling.value = '';
	}
	if (chargeVerify)
		chargeVerify.disabled = !S.activeTreatmentCase || !allDone || S.treatmentCompletion.posted;
	if (chargePost)
		chargePost.disabled = !S.treatmentCompletion.verified || S.treatmentCompletion.posted;
	updateChargeEducation();
	const feedback = document.getElementById('chargeFeedback');
	if (feedback && !allDone && !S.treatmentCompletion.posted) {
		feedback.className = 'bad';
		feedback.textContent =
			'Treatment completion is locked until every prescribed field has been delivered.';
	}
	const rec = document.getElementById('chargePostedRecord');
	if (rec && S.treatmentCompletion.posted && S.treatmentCompletion.record) {
		const r = S.treatmentCompletion.record;
		rec.className = 'show';
		rec.innerHTML = `<b>FRACTION COMPLETE · CHARGE POSTED</b><br>${r.patient} · ${r.site} · Fx ${r.fraction}<br>CPT ${r.code} · ${r.level}<br>${r.fields} field${r.fields === 1 ? '' : 's'} · ${r.totalMU} MU · IGRT ${r.igrtHandling === 'bundled' ? 'TC bundled' : r.igrtHandling === 'separate' ? '77387-TC captured separately' : r.igrtHandling === 'not-assessed' ? 'handling shown for context' : 'not captured'}<br>Simulation record: ${r.postedAt}`;
	}
}
function completeFractionWithoutCurrentCPTModule() {
	if (
		!S.activeTreatmentCase?.billing?.skipChargeCapture ||
		!allTreatmentFieldsCompleted() ||
		S.treatmentCompletion.posted
	)
		return;
	const now = new Date(),
		fields = getTreatmentFields();
	S.treatmentCompletion.posted = true;
	S.treatmentCompletion.verified = true;
	S.treatmentCompletion.code = 'SRS-NOT-MODELED';
	S.treatmentCompletion.postedAt = now;
	S.treatmentCompletion.record = {
		patient: S.activeTreatmentCase.patient,
		mrn: S.activeTreatmentCase.mrn,
		site: S.activeTreatmentCase.siteLabel,
		fraction: S.activeTreatmentCase.fraction,
		technique: S.activeTreatmentCase.technique,
		code: 'SRS-NOT-MODELED',
		level: 'Stereotactic coding outside current exercise',
		igrtHandling: 'bundled/context not assessed',
		fields: fields.length,
		totalMU: fields.reduce((a, f) => a + (Number(f.mu) || 0), 0),
		postedAt: now.toLocaleString()
	};
	oisLogEvent(
		'SESSION',
		'Stereotactic fraction completed',
		'All prescribed arcs delivered',
		'fraction-complete'
	);
	setBeamState(false);
	setPendantLCD('SRS FRACTION COMPLETE', 'All prescribed arcs delivered');
	renderTreatmentCompletionControls();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	updateBEVInset();
	// RTApps (plan 4c): one completion per delivered treatment fraction.
	if (window.RTApps) window.RTApps.recordResult('sim-linac-fraction').catch(function () {});
}
function openChargeCapture() {
	if (!S.activeTreatmentCase) {
		setPendantLCD('CHARGE CAPTURE', 'Load a patient first');
		return;
	}
	if (!allTreatmentFieldsCompleted() && !S.treatmentCompletion.posted) {
		setPendantLCD('TREATMENT INCOMPLETE', 'Finish all prescribed fields');
		renderTreatmentDeliveryPanel();
		return;
	}
	igrtPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	chargeCapturePanel?.classList.add('open');
	renderChargeCapturePanel();
}
function verifyChargeCapture() {
	if (!allTreatmentFieldsCompleted()) {
		renderChargeCapturePanel();
		return;
	}
	S.treatmentCompletion.attempts++;
	const selected = String(chargeTreatmentCode?.value || ''),
		igrt = String(chargeIgrtHandling?.value || '');
	const expected = expectedTechnicalTreatmentCode(),
		expectedIGRT = expectedTechnicalIGRTHandling();
	const codeOK = selected === expected,
		igrtOK = expectedIGRT === 'not-assessed' ? true : igrt === expectedIGRT;
	S.treatmentCompletion.verified = codeOK && igrtOK;
	S.treatmentCompletion.code = selected || null;
	S.treatmentCompletion.igrtHandling = igrt || null;
	const feedback = document.getElementById('chargeFeedback');
	if (feedback) {
		feedback.className = S.treatmentCompletion.verified ? 'good' : 'bad';
		if (S.treatmentCompletion.verified) {
			const igrtWhy =
				expectedIGRT === 'bundled'
					? 'Because image guidance was performed, its modeled technical component is bundled into the treatment-delivery code in this exercise.'
					: expectedIGRT === 'separate'
						? 'Because this is cranial SRS with technical target localization, select 77387-TC separately in this exercise.'
						: expectedIGRT === 'not-assessed'
							? 'For this SBRT case the simulator grades CPT 77373 and displays the supplied image-guidance notes for discussion rather than grading a separate IGRT-TC selection.'
							: '';
			feedback.innerHTML = `<b>Charge selection verified.</b> <b>${expected} (${S.activeTreatmentCase.billing?.level || ''})</b> is appropriate because ${S.activeTreatmentCase.billing?.reason || 'the delivered technique matches this treatment-delivery category'}. ${CPT_EDU[expected]?.plain || ''} ${igrtWhy}`;
		} else {
			const issues = [];
			if (!codeOK)
				issues.push(
					sbrtRequired()
						? 'recheck which CPT code represents SBRT treatment delivery per fraction'
						: cranialSRSRequired()
							? 'recheck whether this SRS was delivered on a multi-source cobalt-60 unit or on a linear accelerator'
							: 'recheck the treatment-delivery level against the technique/isocenter complexity'
				);
			if (!igrtOK)
				issues.push(
					expectedIGRT === 'bundled'
						? 'do not separately capture the technical IGRT component'
						: expectedIGRT === 'separate'
							? 'capture the technical SRS localization as 77387-TC'
							: expectedIGRT === 'not-assessed'
								? 'review the SBRT image-guidance source note'
								: 'no image-guidance charge applies'
				);
			feedback.innerHTML = `<b>Charge hold.</b> ${issues.join('; ')}.`;
		}
	}
	if (chargePost) chargePost.disabled = !S.treatmentCompletion.verified;
}
function persistChargeRecord(record) {
	try {
		const key = 'linacClinicalChargeLog_v1';
		const log = JSON.parse(localStorage.getItem(key) || '[]');
		log.push(record);
		localStorage.setItem(key, JSON.stringify(log.slice(-100)));
	} catch (e) {
		console.warn('Unable to persist simulation charge record', e);
	}
}
function postChargeAndCompleteFraction() {
	if (
		!S.treatmentCompletion.verified ||
		S.treatmentCompletion.posted ||
		!allTreatmentFieldsCompleted()
	)
		return;
	const fields = getTreatmentFields(),
		now = new Date();
	const record = {
		patient: S.activeTreatmentCase.patient,
		mrn: S.activeTreatmentCase.mrn,
		site: S.activeTreatmentCase.siteLabel,
		fraction: S.activeTreatmentCase.fraction,
		technique: S.activeTreatmentCase.technique,
		code: expectedTechnicalTreatmentCode(),
		level: S.activeTreatmentCase.billing?.level || '',
		reason: S.activeTreatmentCase.billing?.reason || '',
		igrtHandling: expectedTechnicalIGRTHandling(),
		fields: fields.length,
		totalMU: fields.reduce((s, f) => s + (Number(f.mu) || 0), 0),
		postedAt: now.toLocaleString()
	};
	S.treatmentCompletion.posted = true;
	S.treatmentCompletion.code = record.code;
	S.treatmentCompletion.igrtHandling = record.igrtHandling;
	S.treatmentCompletion.postedAt = now;
	S.treatmentCompletion.record = record;
	persistChargeRecord(record);
	oisLogEvent(
		'CHARGE',
		'Technical treatment charge posted',
		`CPT ${record.code} · ${record.totalMU} MU`,
		'charge-posted'
	);
	recordAdaptiveFractionDose();
	setBeamState(false);
	S.treatmentDelivery.armed = false;
	S.treatmentDelivery.delivering = false;
	S.treatmentDelivery.held = false;
	setPendantLCD('TREATMENT COMPLETE', `CPT ${record.code} · fraction closed`);
	renderChargeCapturePanel();
	renderTreatmentCompletionControls();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	updateBEVInset();
	renderOISPanel();
	// RTApps (plan 4c): one completion per delivered treatment fraction.
	if (window.RTApps) window.RTApps.recordResult('sim-linac-fraction').catch(function () {});
}
function resetTreatmentDeliveryForCase() {
	if (S.deliveryRAF) {
		cancelAnimationFrame(S.deliveryRAF);
		S.deliveryRAF = null;
	}
	S.treatmentDelivery.armed = false;
	S.treatmentDelivery.delivering = false;
	S.treatmentDelivery.held = false;
	S.treatmentDelivery.gateHeld = false;
	S.treatmentDelivery.completed = false;
	S.treatmentDelivery.terminated = false;
	S.treatmentDelivery.muDelivered = 0;
	S.treatmentDelivery.startedAt = 0;
	S.treatmentDelivery.lastTick = 0;
	S.treatmentDelivery.autoHoldReason = '';
	S.treatmentDelivery.activeFieldIndex = 0;
	S.treatmentDelivery.completedFields = {};
	S.treatmentDelivery.dynamicFraction = 0;
	S.treatmentDelivery.controlPointIndex = 0;
	S.clearanceOverrideState = { byField: {} };
	if (S.beamOn) setBeamState(false);
	if (beamOnButton) beamOnButton.disabled = false;
	populateDeliveryFieldSelect();
	resetTreatmentCompletion();
	renderTreatmentDeliveryPanel();
}
function renderTreatmentDeliveryPanel() {
	if (!deliveryPanel) return;
	const plan = deliveryCasePlan();
	const readyInfo = getDeliveryReadiness();
	if (deliveryFieldSelect) {
		const fields = getTreatmentFields();
		if (deliveryFieldSelect.options.length !== fields.length) populateDeliveryFieldSelect();
		deliveryFieldSelect.value = String(
			Math.max(0, Number(S.treatmentDelivery.activeFieldIndex) || 0)
		);
		deliveryFieldSelect.disabled = !S.activeTreatmentCase || S.treatmentDelivery.delivering;
	}
	const pat = document.getElementById('deliveryPatient'),
		pmu = document.getElementById('deliveryPlannedMU'),
		dr = document.getElementById('deliveryDoseRate');
	const list = document.getElementById('deliveryChecklist'),
		state = document.getElementById('deliveryReadyState');
	const muVal = document.getElementById('deliveryMUValue'),
		muDet = document.getElementById('deliveryMUDetail'),
		bar = document.getElementById('deliveryProgressBar'),
		status = document.getElementById('deliveryStatus');
	const dynState = getDynamicFieldState(plan, deliveryProgressFraction(plan));
	if (pat)
		pat.textContent = S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${plan.field}`
			: 'No case';
	if (pmu) pmu.textContent = S.activeTreatmentCase ? `${plan.mu} MU` : '—';
	if (dr) dr.textContent = S.activeTreatmentCase ? `${Math.round(dynState.doseRate)} MU/min` : '—';
	setTextById('deliveryModeValue', S.activeTreatmentCase ? plan.mode || 'STATIC' : '—');
	setTextById(
		'deliveryCPValue',
		S.activeTreatmentCase
			? `${dynState.controlPointIndex + 1} / ${dynState.controlPointCount}`
			: '—'
	);
	const motionEl = document.getElementById('deliveryMotionValue'),
		detailEl = document.getElementById('deliveryDynamicDetail');
	if (motionEl) {
		if (plan.mode === 'VMAT' && dynState.arc)
			motionEl.textContent = `${dynState.arc.direction} ${dynState.arc.start}° → ${dynState.arc.stop}° · T ${monitorPlannedDisplay('couchAngle', plan.geometry?.couchAngle || '0°')}`;
		else if (plan.mode === 'IMRT')
			motionEl.textContent = `Gantry ${monitorPlannedDisplay('gantry', plan.geometry?.gantry)} fixed · MLC dynamic`;
		else motionEl.textContent = 'Fixed gantry / fixed aperture';
	}
	if (detailEl) {
		detailEl.className = plan.mode === 'VMAT' ? 'vmat' : plan.mode === 'IMRT' ? 'imrt' : '';
		if (plan.mode === 'VMAT' && dynState.arc)
			detailEl.innerHTML = `<strong>VMAT control-point delivery:</strong> gantry ${dynState.arc.direction === 'CW' ? 'decreases' : 'increases'} through a ${Math.round(dynState.arc.sweep)}° sweep while the MLC aperture and dose rate modulate. Current planned gantry: <b>${dynState.gantry.toFixed(1)}°</b>; MLC: <b>${dynState.mlcAperture.toFixed(1)} cm</b>.`;
		else if (plan.mode === 'IMRT')
			detailEl.innerHTML = `<strong>Dynamic IMRT:</strong> gantry remains fixed while the MLC aperture and dose rate vary through ${dynState.controlPointCount} planned control points. Current MLC: <b>${dynState.mlcAperture.toFixed(1)} cm</b>.`;
		else if (plan?.electron)
			detailEl.innerHTML =
				'<strong>Static electron delivery:</strong> machine geometry remains fixed. Complete the in-room bolus drag-and-drop task below before Beam Enable.';
		else
			detailEl.textContent =
				'Static field delivery. Machine geometry remains fixed for the prescribed MU.';
	}
	renderElectronBolusDeliveryTask();
	renderClearanceOverrideCard();
	if (list)
		list.innerHTML = readyInfo.checks
			.map(
				(c) =>
					`<div class="delivery-check ${c.ok ? 'good' : 'bad'}"><div class="lamp">${c.ok ? '✓' : '!'}</div><div class="name">${c.name}</div><div class="detail">${c.detail}</div></div>`
			)
			.join('');
	if (S.treatmentDelivery.armed && !S.treatmentDelivery.delivering && !readyInfo.ready) {
		S.treatmentDelivery.armed = false;
	}
	if (state) {
		const ready = readyInfo.ready;
		state.className = `delivery-ready ${ready ? 'good' : 'bad'}`;
		state.textContent = ready
			? S.treatmentDelivery.armed
				? clearanceOverrideActive()
					? 'BEAM ENABLED · SIMULATION CLEARANCE OVERRIDE ACTIVE.'
					: 'BEAM ENABLED · field may be delivered.'
				: clearanceOverrideActive()
					? 'READY WITH SIMULATION CLEARANCE OVERRIDE · OIS sign-off required.'
					: 'READY · all beam-enable interlocks satisfied.'
			: 'TREATMENT HOLD · resolve the failed interlocks above.';
	}
	const total = Number(plan.mu) || 0,
		delivered = Math.min(total, S.treatmentDelivery.muDelivered || 0),
		pct = total ? Math.max(0, Math.min(100, (delivered / total) * 100)) : 0;
	if (muVal) muVal.textContent = `${delivered.toFixed(1)} MU`;
	if (muDet) muDet.textContent = `${delivered.toFixed(1)} / ${total.toFixed(1)} MU`;
	if (bar) bar.style.width = `${pct}%`;
	if (deliveryArm) {
		deliveryArm.disabled =
			!readyInfo.ready || S.treatmentDelivery.delivering || S.treatmentDelivery.completed;
		deliveryArm.textContent = S.treatmentDelivery.armed ? 'Beam Enabled' : 'Enable Beam';
	}
	if (deliveryStart)
		deliveryStart.disabled =
			!S.treatmentDelivery.armed ||
			!readyInfo.ready ||
			S.treatmentDelivery.delivering ||
			S.treatmentDelivery.completed;
	if (deliveryHold) {
		deliveryHold.disabled = !S.treatmentDelivery.delivering || S.treatmentDelivery.completed;
		deliveryHold.textContent = S.treatmentDelivery.held ? 'Resume Beam' : 'Beam Hold';
	}
	if (deliveryTerminate)
		deliveryTerminate.disabled = !S.treatmentDelivery.delivering || S.treatmentDelivery.completed;
	if (status) {
		status.classList.remove('beam-on', 'complete');
		if (S.treatmentCompletion.posted) {
			status.classList.add('complete');
			status.textContent =
				S.treatmentCompletion.code === 'SRS-NOT-MODELED'
					? 'SRS FRACTION COMPLETE · all prescribed arcs delivered.'
					: `TREATMENT SESSION COMPLETE · CPT ${S.treatmentCompletion.code} posted.`;
		} else if (S.treatmentDelivery.completed) {
			status.classList.add('complete');
			status.textContent = allTreatmentFieldsCompleted()
				? S.activeTreatmentCase?.billing?.skipChargeCapture
					? `ALL PRESCRIBED SRS ARCS COMPLETE · close the SRS fraction.`
					: `ALL PRESCRIBED FIELDS COMPLETE · open Charge Capture to close the fraction.`
				: `FIELD COMPLETE · ${total.toFixed(1)} MU delivered. Select the next prescribed field.`;
		} else if (S.treatmentDelivery.delivering && S.treatmentDelivery.held) {
			status.textContent = `BEAM HOLD · ${S.treatmentDelivery.autoHoldReason || 'delivery paused'}.`;
		} else if (S.treatmentDelivery.delivering && S.treatmentDelivery.gateHeld) {
			status.textContent = `RESPIRATORY GATE HOLD · ${S.motionManagement.mode === 'DIBH' ? 'DIBH outside tolerance / breath hold released' : `phase ${S.motionManagement.phase.toFixed(0)}% outside ${S.motionManagement.gateLow}–${S.motionManagement.gateHigh}% gate`} · MU and machine progression paused.`;
		} else if (S.treatmentDelivery.delivering) {
			status.classList.add('beam-on');
			const d = getDynamicFieldState(plan, deliveryProgressFraction(plan));
			status.textContent = `BEAM ON · ${plan.mode}${plan.mode === 'VMAT' && d.arc ? ` · G ${d.gantry.toFixed(1)}° ${d.arc.direction}` : ''}${motionRequired() ? ` · ${S.motionManagement.mode === 'DIBH' ? 'DIBH' : 'GATED'}` : ''} · CP ${d.controlPointIndex + 1}/${d.controlPointCount} · ${delivered.toFixed(1)} / ${total.toFixed(1)} MU · ${Math.round(d.doseRate)} MU/min (×${DELIVERY_SPEED_FACTOR} training speed)`;
		} else if (S.treatmentDelivery.terminated) {
			status.textContent = `DELIVERY TERMINATED at ${delivered.toFixed(1)} MU. Reset/load case to restart field.`;
		} else if (S.treatmentDelivery.armed) {
			status.textContent = 'Beam is enabled. Recheck the patient and press Deliver Field.';
		} else
			status.textContent = readyInfo.ready
				? 'All interlocks satisfied. Press Enable Beam.'
				: 'Resolve treatment holds before beam enable.';
	}
	renderTreatmentCompletionControls();
	updateBEVInset();
}
function armTreatmentDelivery() {
	const r = getDeliveryReadiness();
	if (!r.ready) {
		S.treatmentDelivery.armed = false;
		setPendantLCD('BEAM ENABLE', 'HOLD · interlocks not satisfied');
		renderTreatmentDeliveryPanel();
		return;
	}
	S.treatmentDelivery.armed = true;
	S.treatmentDelivery.terminated = false;
	setPendantLCD('BEAM ENABLE', 'READY · field enabled');
	renderTreatmentDeliveryPanel();
}
function holdTreatmentDelivery(reason = 'manual hold') {
	if (!S.treatmentDelivery.delivering) return;
	S.treatmentDelivery.held = true;
	S.treatmentDelivery.autoHoldReason = reason;
	oisLogEvent('BEAM HOLD', 'Treatment delivery held', reason);
	setBeamState(false);
	setPendantLCD('BEAM HOLD', reason);
	renderTreatmentDeliveryPanel();
}
function resumeTreatmentDelivery() {
	if (!S.treatmentDelivery.delivering || !S.treatmentDelivery.held) return;
	const r = getDeliveryReadiness();
	if (!r.ready) {
		S.treatmentDelivery.autoHoldReason = 'interlock remains';
		renderTreatmentDeliveryPanel();
		return;
	}
	S.treatmentDelivery.held = false;
	S.treatmentDelivery.autoHoldReason = '';
	oisLogEvent('DELIVERY', 'Beam resumed', deliveryCasePlan()?.field || 'Selected field');
	S.treatmentDelivery.lastTick = performance.now();
	setBeamState(true);
	setPendantLCD('BEAM', 'RESUMED');
	S.deliveryRAF = requestAnimationFrame(deliveryTick);
	renderTreatmentDeliveryPanel();
}
function finishTreatmentDelivery() {
	if (S.deliveryRAF) {
		cancelAnimationFrame(S.deliveryRAF);
		S.deliveryRAF = null;
	}
	const total = Number(deliveryCasePlan().mu) || 0;
	S.treatmentDelivery.muDelivered = total;
	applyDynamicDeliveryMachineState(deliveryCasePlan(), 1);
	S.treatmentDelivery.delivering = false;
	S.treatmentDelivery.held = false;
	S.treatmentDelivery.gateHeld = false;
	S.treatmentDelivery.completed = true;
	S.treatmentDelivery.armed = false;
	S.treatmentDelivery.completedFields[S.treatmentDelivery.activeFieldIndex] = true;
	oisLogEvent(
		'DELIVERY',
		'Field / arc complete',
		`${deliveryCasePlan()?.field || 'Field'} · ${total.toFixed(1)} MU`,
		`field-complete-${S.treatmentDelivery.activeFieldIndex}`
	);
	setBeamState(false);
	if (beamOnButton) beamOnButton.disabled = false;
	populateDeliveryFieldSelect();
	const allDone = allTreatmentFieldsCompleted();
	setPendantLCD(
		allDone ? 'ALL FIELDS COMPLETE' : 'FIELD COMPLETE',
		allDone ? 'Open charge capture to close fraction' : `${total} MU delivered`
	);
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}
function deliveryTick(now) {
	if (!S.treatmentDelivery.delivering || S.treatmentDelivery.held) {
		S.deliveryRAF = null;
		return;
	}
	const plan = deliveryCasePlan(),
		total = Number(plan.mu) || 0;
	if (motionRequired() && !currentMotionGateOpen()) {
		S.treatmentDelivery.gateHeld = true;
		S.treatmentDelivery.lastTick = now;
		if (S.beamOn) setBeamState(false);
		renderTreatmentDeliveryPanel();
		S.deliveryRAF = requestAnimationFrame(deliveryTick);
		return;
	}
	if (S.treatmentDelivery.gateHeld) {
		S.treatmentDelivery.gateHeld = false;
		S.treatmentDelivery.lastTick = now;
		setPendantLCD('RESPIRATORY GATE', 'OPEN · delivery resumed');
	}
	if (isDynamicTreatmentField(plan))
		applyDynamicDeliveryMachineState(plan, deliveryProgressFraction(plan));
	const r = getDeliveryReadiness();
	if (!r.ready) {
		const failed = r.checks.find((x) => !x.ok);
		holdTreatmentDelivery(failed?.name || 'interlock');
		S.deliveryRAF = null;
		return;
	}
	const d = getDynamicFieldState(plan, deliveryProgressFraction(plan)),
		rate = Math.max(1, Number(d.doseRate) || Number(plan.doseRate) || 600);
	if (!S.treatmentDelivery.lastTick) S.treatmentDelivery.lastTick = now;
	const dt = Math.max(0, Math.min(0.25, (now - S.treatmentDelivery.lastTick) / 1000));
	S.treatmentDelivery.lastTick = now;
	S.treatmentDelivery.muDelivered += (rate / 60) * dt * DELIVERY_SPEED_FACTOR;
	if (S.treatmentDelivery.muDelivered >= total) {
		finishTreatmentDelivery();
		return;
	}
	if (isDynamicTreatmentField(plan)) {
		applyDynamicDeliveryMachineState(plan, deliveryProgressFraction(plan));
		const clearance = getCollisionAssessment();
		if (clearance && clearance.margin < -COLLISION_PROXY_TOL) {
			if (!clearanceOverrideActive()) {
				holdTreatmentDelivery('dynamic gantry clearance');
				S.deliveryRAF = null;
				return;
			}
			const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
				rec = clearanceOverrideRecord(idx);
			if (rec && !rec.dynamicEncounterLogged) {
				rec.dynamicEncounterLogged = true;
				const saved = (S.oisSession.clearanceOverrides || []).find(
					(x) => Number(x.fieldIndex) === idx
				);
				if (saved) saved.dynamicEncounterLogged = true;
				oisLogEvent(
					'OVERRIDE',
					'Dynamic trajectory clearance interlock overridden',
					`${deliveryCasePlan()?.field || 'Field'} · ${clearance.reason || 'dynamic gantry clearance'} · treatment continued under documented simulation override`,
					`dynamic-clearance-override-${idx}`
				);
			}
		}
	}
	if (!S.beamOn) setBeamState(true);
	renderTreatmentDeliveryPanel();
	if (now - S.deliveryMonitorStamp > 250) {
		S.deliveryMonitorStamp = now;
		renderTreatmentMonitor();
	}
	S.deliveryRAF = requestAnimationFrame(deliveryTick);
}
function startTreatmentDelivery() {
	const r = getDeliveryReadiness();
	if (!S.treatmentDelivery.armed || !r.ready) {
		setPendantLCD('DELIVERY', 'Beam not enabled / interlock');
		renderTreatmentDeliveryPanel();
		return;
	}
	S.treatmentDelivery.delivering = true;
	S.treatmentDelivery.held = false;
	S.treatmentDelivery.gateHeld = motionRequired() && !currentMotionGateOpen();
	S.treatmentDelivery.completed = false;
	S.treatmentDelivery.terminated = false;
	S.treatmentDelivery.autoHoldReason = '';
	S.treatmentDelivery.lastTick = performance.now();
	S.treatmentDelivery.dynamicFraction = 0;
	S.treatmentDelivery.controlPointIndex = 0;
	applyDynamicDeliveryMachineState(deliveryCasePlan(), 0);
	if (beamOnButton) beamOnButton.disabled = true;
	setBeamState(!S.treatmentDelivery.gateHeld);
	setPendantLCD(
		S.treatmentDelivery.gateHeld ? 'RESPIRATORY HOLD' : 'BEAM ON',
		S.treatmentDelivery.gateHeld
			? 'Waiting for approved respiratory condition'
			: `${deliveryCasePlan().mu} MU field`
	);
	S.deliveryRAF = requestAnimationFrame(deliveryTick);
	renderTreatmentDeliveryPanel();
}
function terminateTreatmentDelivery() {
	if (!S.treatmentDelivery.delivering) return;
	if (S.deliveryRAF) {
		cancelAnimationFrame(S.deliveryRAF);
		S.deliveryRAF = null;
	}
	S.treatmentDelivery.delivering = false;
	S.treatmentDelivery.held = false;
	S.treatmentDelivery.gateHeld = false;
	S.treatmentDelivery.armed = false;
	S.treatmentDelivery.terminated = true;
	oisLogEvent(
		'TERMINATION',
		'Treatment field terminated',
		`${deliveryCasePlan()?.field || 'Field'} at ${Number(S.treatmentDelivery.muDelivered || 0).toFixed(1)} MU`
	);
	setBeamState(false);
	if (beamOnButton) beamOnButton.disabled = false;
	setPendantLCD('DELIVERY', 'TERMINATED');
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
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
function setKvState(isOn) {
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

function setInternalView(on) {
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

function setAssembly(name) {
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

function beamStageStep(dir) {
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

function setupCCTVFeeds() {
	if (!Array.isArray(cctvFeeds)) return;
	cctvFeeds.length = 0;
	const defs = [
		{
			container: cameraSceneA,
			pos: [-0.4, 9.2, GANTRY_PLANE_Z_TARGET + 0.4],
			look: [0.0, 1.15, GANTRY_PLANE_Z_TARGET - 0.25],
			fov: 34
		},
		{
			container: cameraSceneB,
			pos: [7.2, 2.25, GANTRY_PLANE_Z_TARGET + 0.35],
			look: [0.1, 1.15, GANTRY_PLANE_Z_TARGET - 0.2],
			fov: 37
		},
		{ container: cameraSceneC, pos: [-10.9, 2.4, 5.15], look: [-2.6, 1.55, 1.6], fov: 42 }
	];
	defs.forEach((def) => {
		if (!def.container) return;
		def.container.innerHTML = '';
		let feedRenderer;
		try {
			feedRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
		} catch (err) {
			console.warn('CCTV renderer unavailable for', def.container?.id, err);
			return;
		}
		feedRenderer.setPixelRatio(1);
		feedRenderer.setClearColor(0x07131d, 1);
		feedRenderer.domElement.className = 'cctv-canvas';
		def.container.appendChild(feedRenderer.domElement);
		const feedCamera = new THREE.PerspectiveCamera(def.fov, 1, 0.1, 120);
		feedCamera.position.set(...def.pos);
		feedCamera.lookAt(new THREE.Vector3(...def.look));
		cctvFeeds.push({
			container: def.container,
			renderer: feedRenderer,
			camera: feedCamera,
			look: new THREE.Vector3(...def.look),
			type: def.container.id
		});
	});
	resizeCCTVFeeds();
}
function resizeCCTVFeeds() {
	cctvFeeds.forEach((feed) => {
		const w = Math.max(120, feed.container.clientWidth || 260);
		const h = Math.max(70, feed.container.clientHeight || 82);
		feed.camera.aspect = w / h;
		feed.camera.updateProjectionMatrix();
		feed.renderer.setSize(w, h, false);
	});
}
function updateCCTVFeeds() {
	if (!Array.isArray(cctvFeeds) || !S.scene) return;
	// RTApps perf pass: the CCTV monitors re-rendered the WHOLE scene up to 3 extra times
	// EVERY frame; ~9Hz is visually identical on a monitor prop (same rate the hub uses).
	const nowMs = performance.now();
	if (nowMs - (updateCCTVFeeds._last || 0) < 110) return;
	updateCCTVFeeds._last = nowMs;
	cctvFeeds.forEach((feed) => {
		if (feed.container.offsetParent === null) return;
		if (feed.type === 'cameraSceneA') {
			feed.camera.position.set(-0.4, 9.2, GANTRY_PLANE_Z_TARGET + 0.4);
			feed.look.set(0.0, 1.15, GANTRY_PLANE_Z_TARGET - 0.25);
		} else if (feed.type === 'cameraSceneB') {
			feed.camera.position.set(7.2, 2.25, GANTRY_PLANE_Z_TARGET + 0.35);
			feed.look.set(0.1, 1.15, GANTRY_PLANE_Z_TARGET - 0.2);
		} else if (feed.type === 'cameraSceneC') {
			feed.camera.position.set(-10.9, 2.4, 5.15);
			feed.look.set(-2.6, 1.55, 1.6);
		}
		feed.camera.lookAt(feed.look);
		try {
			feed.renderer.render(S.scene, feed.camera);
		} catch (err) {
			if (!feed.renderErrorLogged) {
				console.warn('CCTV feed render skipped:', feed.type, err);
				feed.renderErrorLogged = true;
			}
		}
	});
}

function initThreeJS() {
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

function updateCouchAccordion() {
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
function updateJawPositions() {
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
function updateElectronApplicator3D() {
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

const MLC_MIN_CM = 4,
	MLC_MAX_CM = 20;
const MLC_SHAPES = ['Square', 'Conformal', 'Asymmetric'];
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
function updateMLCPositions() {
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
function getODIMeasurement() {
	if (!S.gantryRotatingGroup || !S.patientGroup) return null;
	S.scene.updateMatrixWorld(true);
	const source = S.gantryRotatingGroup.localToWorld(new THREE.Vector3(0, 1.5, 0));
	const axis = S.gantryRotatingGroup.localToWorld(new THREE.Vector3(0, 0, 0));
	const dir = axis.clone().sub(source).normalize();
	const ray = new THREE.Raycaster(source, dir, 0, 4.0);
	const hits = ray.intersectObject(S.patientGroup, true);
	if (!hits.length) return { source, axis, point: axis.clone(), cm: null };
	const point = hits[0].point.clone();
	// Virtual geometry calibration: source-to-axis = 100 cm.
	const sadModel = source.distanceTo(axis);
	const cm = sadModel > 0 ? source.distanceTo(point) * (100 / sadModel) : null;
	return { source, axis, point, cm };
}
function updateODIReadout() {
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
function setODIState(on) {
	S.odiOn = !!on;
	const txt = updateODIReadout();
	odiToggleButton?.classList.toggle('active-function', S.odiOn);
	setPendantLCD('OPTICAL DISTANCE INDICATOR', S.odiOn ? txt : 'OFF');
	renderTreatmentMonitor();
}

// ----- Divergence Lab → real machine drivers -----
function setBeamWidth(cm) {
	// lab Jaw Width (5–25 cm) → centered square aperture
	setCenteredJawField(Number(cm) || 10, Number(cm) || 10);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function setReceptorSID(sidCm) {
	// lab Receptor SID (120–180 cm) → stored EPID depth only
	S.epidReceptorY = -0.7 - ((sidCm - 120) / 60) * 0.6;
	// IMPORTANT: changing a lab SID must NEVER deploy the MV detector.
	// If the learner has already extended the EPID from the pendant, update only
	// its beam-axis depth; otherwise leave the panel parked in its retracted pose.
	if (S.detectorExtended) applyDetectorCommandedPose();
}

// ----- Patient setup positions + auto 3-point localization -----
const PATIENT_POSITIONS = ['HFS', 'HFP', 'FFS', 'FFP'];
const PATIENT_POS_NAMES = {
	HFS: 'Head-First Supine',
	HFP: 'Head-First Prone',
	FFS: 'Feet-First Supine',
	FFP: 'Feet-First Prone'
};
const PATIENT_ROT = {
	HFS: [0, 0, 0],
	HFP: [0, 0, Math.PI],
	FFS: [0, Math.PI, 0],
	FFP: [0, Math.PI, Math.PI]
};
// Treatment sites: z = body-region position (head -0.93 ... feet +0.97); orient = clinically sensible setups
const IMAGING_SITES = [
	{ key: 'brain', name: 'Brain', z: -0.86, orient: ['HFS'] },
	{ key: 'hneck', name: 'Head & Neck', z: -0.72, orient: ['HFS'] },
	{ key: 'chest', name: 'Chest', z: -0.45, orient: ['HFS'] },
	{ key: 'breast', name: 'Left Breast / Thorax', z: -0.45, orient: ['HFS'] },
	{ key: 'abdomen', name: 'Abdomen', z: -0.05, orient: ['HFS'] },
	{ key: 'pelvis', name: 'Pelvis', z: 0.18, orient: ['HFS'] },
	{ key: 'spine', name: 'Spine', z: -0.28, orient: ['HFS', 'HFP'] },
	{ key: 'femur', name: 'Femur (leg)', z: 0.58, orient: ['FFS', 'FFP'] }
];
const TREATMENT_CASES = [
	{
		patient: 'Michael Carter',
		mrn: 'AU-24031',
		siteLabel: 'Prostate',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: '3DCRT AP/PA',
		energy: '6 MV',
		fraction: '12 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter 3D CRT photon delivery'
		},
		note: 'Verify setup, field identity, jaws, and ODI prior to beam enable.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary: 'Supine pelvic setup with indexed Vac-Lok molding and knee support.',
			instructions: [
				'Position the pelvis and lower body in the indexed Vac-Lok cushion used at simulation.',
				'Support both knees with the prescribed knee support/sponge to reduce lumbar strain and pelvic rotation.',
				'Confirm HFS orientation, tabletop index, and pelvic midline before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 185,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square'
				}
			},
			{
				name: 'PA',
				mu: 185,
				doseRate: 600,
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square'
				}
			}
		]
	},
	{
		patient: 'Erica Johnson',
		mrn: 'AU-24108',
		siteLabel: 'Whole Brain',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Lateral Opposed',
		energy: '6 MV',
		fraction: '4 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D opposed photon treatment delivery'
		},
		note: 'Check field identity, MLC aperture, and lateral imaging setup.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid fixation that conforms around the cranium and face.',
				'Support the occiput with an indexed insert that reproduces neutral head position.',
				'Confirm the head is straight and centered before lateral imaging.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 152,
				doseRate: 600,
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 152,
				doseRate: 600,
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Denise Walker',
		mrn: 'AU-24214',
		siteLabel: 'Right Lung',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Respiratory-Gated IMRT',
		energy: '6 MV',
		fraction: '7 / 30',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment with active respiratory motion management'
		},
		note: 'Complete 4D respiratory characterization, approve the end-expiration gate, then verify selected field geometry and kV setup before treatment.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed posterior molding.',
			instructions: [
				'Elevate both arms in a reproducible overhead support.',
				'Use a moldable indexed cradle beneath the thorax to limit rotation.',
				'Confirm the respiratory monitoring region remains visible and unobstructed.'
			]
		},
		planned: {
			gantry: '45°',
			collimator: '30°',
			jaws: '14 × 14 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '+2 / -3 / +1 mm'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung',
			period: 4.5,
			siExcursion: 10,
			apExcursion: 4,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 412,
				doseRate: 600,
				geometry: {
					gantry: '45°',
					collimator: '30°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.2, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.45, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.7, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 380 }
				]
			}
		]
	},
	{
		patient: 'Samuel Price',
		mrn: 'AU-24362',
		siteLabel: 'Left Femur',
		siteKey: 'femur',
		position: 'FFS',
		positionLabel: 'Feet-First Supine',
		technique: 'AP/PA Femur',
		energy: '10 MV',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D AP/PA photon treatment delivery'
		},
		note: 'Verify feet-first setup, selected field direction, square jaw field, and asymmetric MLC shaping.',
		immobilization: {
			required: ['vacLok', 'footStocks'],
			orderSummary: 'Feet-first extremity setup with reproducible leg and foot positioning.',
			instructions: [
				'Use an indexed moldable support around the treated lower extremity.',
				'Use paired distal-foot positioning to reproduce limb rotation.',
				'Confirm the treated femur is centered and the opposite leg is outside the field.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '90°',
			jaws: '12 × 12 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Asymmetric',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '-2 / +4 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 96,
				doseRate: 400,
				geometry: {
					gantry: '0°',
					collimator: '90°',
					jaws: '12 × 12 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Asymmetric'
				}
			},
			{
				name: 'PA',
				mu: 96,
				doseRate: 400,
				geometry: {
					gantry: '180°',
					collimator: '90°',
					jaws: '12 × 12 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Asymmetric'
				}
			}
		]
	},
	{
		patient: 'Robert Hayes',
		mrn: 'AU-24519',
		siteLabel: 'Prostate VMAT',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '8 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter modulated photon delivery'
		},
		note: 'Verify arc start geometry, retract imaging hardware, then observe prescribed gantry, MLC, and dose-rate modulation during each arc.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary: 'Supine pelvic VMAT setup with reproducible leg support.',
			instructions: [
				'Support the knees symmetrically to reduce pelvic rotation.',
				'Use paired distal-foot positioning to reproduce lower-extremity alignment.',
				'Confirm neutral pelvis and HFS orientation before CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '12 × 12 cm',
			mlcAperture: '11 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1',
				mode: 'VMAT',
				mu: 286,
				doseRate: 600,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '12 × 12 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.12, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 0.25, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.38, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.5, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.63, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 580 },
					{ muFraction: 0.75, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.88, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 460 },
					{ muFraction: 1.0, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			},
			{
				name: 'Arc 2',
				mode: 'VMAT',
				mu: 274,
				doseRate: 600,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '12 × 12 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.12, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.25, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 580 },
					{ muFraction: 0.38, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.5, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 450 },
					{ muFraction: 0.63, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.75, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.88, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 320 }
				]
			}
		]
	},
	{
		patient: 'Maya Reynolds',
		mrn: 'AU-24602',
		siteLabel: 'Brain Metastasis SRS',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Frameless SRS · Noncoplanar VMAT',
		energy: '6 MV FFF',
		fraction: '1 / 1',
		billing: {
			treatmentCode: '77372',
			level: 'LINAC-based SRS delivery',
			reason: 'Single-session cranial stereotactic radiosurgery delivered on a linear accelerator'
		},
		note: 'High-precision stereotactic workflow. Complete 6DOF CBCT alignment, set each prescribed treatment couch angle, perform a collision dry run, and complete the SRS timeout before beam enable.',
		stereotactic: {
			type: 'SRS',
			label: 'Frameless intracranial SRS',
			translationTolerance: 0.5,
			rotationTolerance: 0.25,
			immobilization: 'Frameless thermoplastic mask'
		},
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'High-precision cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid cranial fixation capable of stereotactic reproducibility.',
				'Use an indexed occipital support and confirm neutral head position.',
				'Verify the fixation is fully secured before 6DOF imaging and couch rotation.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '6 × 6 cm',
			mlcAperture: '5 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'Arc 1 · Coplanar',
				mode: 'VMAT',
				mu: 865,
				doseRate: 1200,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 0.4, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.6, mlcAperture: 4.8, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.8, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1000 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'Arc 2 · Couch +45°',
				mode: 'VMAT',
				mu: 515,
				doseRate: 1200,
				arc: { start: 300, stop: 60, direction: 'CCW', fullArc: false },
				geometry: {
					gantry: '300°',
					collimator: '330°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '45°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 },
					{ muFraction: 0.25, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 0.5, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.75, mlcAperture: 4.6, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 }
				]
			},
			{
				name: 'Arc 3 · Couch −45°',
				mode: 'VMAT',
				mu: 502,
				doseRate: 1200,
				arc: { start: 60, stop: 300, direction: 'CW', fullArc: false },
				geometry: {
					gantry: '60°',
					collimator: '30°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '315°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 },
					{ muFraction: 0.25, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1000 },
					{ muFraction: 0.5, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.75, mlcAperture: 4.4, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 }
				]
			}
		]
	},
	{
		patient: 'Anthony Brooks',
		mrn: 'AU-24631',
		siteLabel: 'Right Upper Lobe Lung SBRT',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'SBRT · Respiratory-Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '1 / 5',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction in a five-fraction course',
			igrtHandling: 'not-assessed'
		},
		note: 'SBRT workflow: complete 4D respiratory characterization, high-precision 6DOF CBCT, arc clearance dry run, SBRT timeout, and gated dual-arc VMAT delivery.',
		stereotactic: {
			type: 'SBRT',
			label: 'Peripheral lung SBRT · 50 Gy / 5 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'Indexed vacuum immobilization'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung SBRT',
			period: 4.2,
			siExcursion: 12,
			apExcursion: 5,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Indexed arms-up thoracic SBRT immobilization.',
			instructions: [
				'Elevate both arms in a reproducible overhead support.',
				'Use a moldable indexed vacuum cradle around the thorax/upper abdomen.',
				'Confirm the respiratory monitoring region is unobstructed and the body is centered.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '8 × 8 cm',
			mlcAperture: '6 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1460,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.15, mlcAperture: 5.2, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 0.3, mlcAperture: 4.4, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.5, mlcAperture: 3.8, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.6, mlcShape: 'Conformal', doseRate: 1250 },
					{ muFraction: 0.85, mlcAperture: 5.3, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1435,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.15, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1150 },
					{ muFraction: 0.3, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.5, mlcAperture: 3.6, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 0.85, mlcAperture: 5.1, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'Rachel Morgan',
		mrn: 'AU-24710',
		siteLabel: 'Left Breast + Supraclavicular',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.68,
		setupBodyX: 0.1,
		technique: '3-Field Breast · SCV + Tangent Matchline',
		energy: '6 MV',
		fraction: '9 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment with matched supraclavicular and tangent fields'
		},
		note: 'Verify the supraclavicular-to-tangent junction before treating. The simulator uses a simplified half-beam matchline exercise to teach gap/overlap recognition.',
		specialSetup: {
			type: 'BREAST_MATCH',
			label: 'SCV / tangent matchline',
			toleranceMm: 1,
			matchTechnique: 'Half-beam field-edge match'
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast/nodal setup with bilateral arm elevation.',
			instructions: [
				'Use an indexed inclined support appropriate for breast and nodal treatment.',
				'Elevate both arms with the dedicated bilateral support.',
				'Confirm the head is turned away from the treated side and the SCV/tangent junction is reproducible.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 16 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Supraclavicular AP',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Supraclavicular / low neck',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 16 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '0°'
				}
			},
			{
				name: 'Medial Tangent',
				mu: 174,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couch: '0 / +2 / 0 mm',
					couchAngle: '355°'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 181,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couch: '0 / +2 / 0 mm',
					couchAngle: '5°'
				}
			}
		]
	},
	{
		patient: 'Evan Cole',
		mrn: 'AU-24724',
		siteLabel: 'Craniospinal Axis',
		siteKey: 'spine',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		setupBodyX: 0,
		technique: 'Total Craniospinal Irradiation · Matched Fields',
		energy: '6 MV',
		fraction: '5 / 13',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment across cranial and spinal treatment regions'
		},
		note: 'Verify cranial and spinal indexing plus both field junctions before delivery. The lateral cranial fields use plan-specific couch/collimator kicks to account for divergence at the PA-spine junction.',
		specialSetup: {
			type: 'CSI',
			label: 'Craniospinal multi-isocenter junctions',
			toleranceMm: 1,
			junctionA: 'Cranial / Upper Spine',
			junctionB: 'Upper / Lower Spine'
		},
		immobilization: {
			required: ['hnMask', 'headrest'],
			orderSummary: 'Cranial fixation with reproducible head/shoulder position for CSI.',
			instructions: [
				'Use rigid fixation covering the cranium and upper shoulder region.',
				'Use an indexed occipital support to reproduce head position.',
				'Keep the body straight with arms at the sides before verifying cranial/spine junctions.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '20 × 20 cm',
			mlcAperture: '18 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Cranial Right Lateral',
				station: 'Cranial',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Cranial contents / cervical junction',
				geometry: {
					gantry: '270°',
					collimator: '5°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '355°'
				}
			},
			{
				name: 'Cranial Left Lateral',
				station: 'Cranial',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Cranial contents / cervical junction',
				geometry: {
					gantry: '90°',
					collimator: '355°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '5°'
				}
			},
			{
				name: 'Upper Spine PA',
				station: 'Upper Spine',
				mu: 146,
				doseRate: 600,
				targetRegion: 'Upper spinal canal',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / +6 / 0 mm',
					couchAngle: '0°'
				}
			},
			{
				name: 'Lower Spine PA',
				station: 'Lower Spine',
				mu: 152,
				doseRate: 600,
				targetRegion: 'Lower spinal canal',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / +12 / 0 mm',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Patricia Moore',
		mrn: 'AU-24739',
		siteLabel: 'Left Chest Wall Scar · Electron',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.45,
		setupBodyX: 0.12,
		technique: 'Custom Electron Cutout',
		energy: '9 MeV electrons',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: 'Single electron treatment field'
		},
		note: 'Create and verify the custom cutout before treatment. The electron applicator/cutout defines the final field; MLC verification is not used for this electron beam.',
		specialSetup: {
			type: 'ELECTRON',
			label: 'Electron cutout creation & fabrication',
			shape: 'Oval',
			widthCm: 6,
			heightCm: 4,
			cone: '10 × 10 cm',
			ssdCm: 100,
			bolusThicknessCm: 0.5
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Breast-treatment position retained for the electron scar field.',
			instructions: [
				'Use an indexed inclined support matching the breast-treatment posture.',
				'Elevate both arms with the bilateral support.',
				'Center the chest-wall scar beneath the electron central ray before accessory and bolus setup.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: '9 MeV Electron · Custom Cutout',
				electron: true,
				mu: 205,
				doseRate: 400,
				targetRegion: 'Left chest-wall scar',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square',
					couch: '0 / 0 / 0 mm',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Noah Patel',
		mrn: 'AU-24782',
		siteLabel: 'Bladder Adaptive RT',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Adaptive RT · Bladder Plan-of-the-Day',
		energy: '6 MV',
		fraction: '8 / 20',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Adaptive multi-field photon treatment delivery after daily anatomy review'
		},
		note: 'Assess the daily pelvic anatomy, select the correct adaptive bladder plan, and approve the adapted treatment before beam enable.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary: 'Supine pelvic adaptive setup with reproducible lower-extremity position.',
			instructions: [
				'Support the knees symmetrically to reduce pelvic rotation.',
				'Use paired distal-foot positioning to reproduce leg alignment.',
				'Confirm the pelvis is neutral before daily CBCT and adaptive-plan selection.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '12 × 12 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		adaptive: {
			label: 'Daily bladder plan selection',
			defaultPlanKey: 'medium',
			course: {
				prescriptionGy: 55,
				totalFractions: 20,
				dosePerFractionGy: 2.75,
				rectumTeachingReferenceGy: 24,
				bowelTeachingReferenceGy: 15,
				seedHistory: [
					{ fx: 1, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 2, scenarioIndex: 0, planKey: 'small' },
					{ fx: 3, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 4, scenarioIndex: 2, planKey: 'large' },
					{ fx: 5, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 6, scenarioIndex: 0, planKey: 'small' },
					{ fx: 7, scenarioIndex: 1, planKey: 'medium' }
				]
			},
			scenarios: [
				{
					title: 'Daily CBCT: small bladder / fuller rectum',
					summary:
						'The bladder is underfilled and the posterior contour sits closer to the high-dose region than on the reference plan.',
					findings: [
						'Reduced bladder filling compared with simulation.',
						'Posterior bladder wall lies closer to the rectum.',
						'Small-volume target envelope best reproduces today’s anatomy.'
					],
					recommendedPlan: 'small'
				},
				{
					title: 'Daily CBCT: medium bladder / expected anatomy',
					summary:
						'Today’s bladder and rectal filling are close to the reference simulation dataset.',
					findings: [
						'Bladder volume approximates the simulation scan.',
						'Target/OAR relationship is near baseline.',
						'The reference-size plan should provide the most balanced coverage.'
					],
					recommendedPlan: 'medium'
				},
				{
					title: 'Daily CBCT: large bladder / bowel displaced superiorly',
					summary:
						'The bladder is more distended than at simulation and a larger anterior-superior target envelope is needed.',
					findings: [
						'Increased bladder filling with superior/anterior expansion.',
						'Small bowel is displaced superiorly.',
						'Largest treatment envelope best matches the current target shape.'
					],
					recommendedPlan: 'large'
				}
			],
			plans: {
				small: {
					title: 'Small bladder plan',
					summary: 'Tighter target envelope for underfilled bladder anatomy.',
					metrics: [
						'Smaller target envelope',
						'Lower normal-tissue exposure when anatomy is small',
						'May under-cover a distended bladder'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '10 × 10 cm',
						mlcAperture: '10 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 102,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 94,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 94,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				},
				medium: {
					title: 'Medium bladder plan',
					summary: 'Reference adaptive plan matching simulation-sized bladder.',
					metrics: [
						'Reference-size target envelope',
						'Balanced bowel/rectum exposure',
						'Best when anatomy approximates simulation'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '12 × 12 cm',
						mlcAperture: '12 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 116,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 100,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 100,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				},
				large: {
					title: 'Large bladder plan',
					summary: 'Expanded target envelope for a distended bladder.',
					metrics: [
						'Expanded target envelope',
						'Protects coverage when bladder is distended',
						'Can increase OAR exposure when anatomy is small'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '14 × 14 cm',
						mlcAperture: '14 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 124,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 116,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				}
			}
		},
		fields: [
			{
				name: 'AP',
				mu: 116,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 108,
				doseRate: 600,
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 100,
				doseRate: 600,
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 100,
				doseRate: 600,
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Daniel Cho',
		mrn: 'AU-24801',
		siteLabel: 'Left Frontal Glioblastoma',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.84,
		technique: 'Primary Brain 3-Field',
		energy: '6 MV',
		fraction: '14 / 30',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field photon treatment delivery to a primary brain tumor'
		},
		note: 'Primary brain treatment. Reproduce the thermoplastic mask setup, confirm field identity, and verify conventional multi-field brain geometry before beam enable.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid fixation that conforms around the cranium and face.',
				'Use an indexed support beneath the occiput to reproduce neutral head position.',
				'Confirm HFS orientation and that the fixation is locked to the tabletop index.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '16 × 18 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 154,
				doseRate: 600,
				targetRegion: 'Left frontal lobe / whole target envelope',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 148,
				doseRate: 600,
				targetRegion: 'Left frontal lobe / whole target envelope',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'AP Boost',
				mu: 96,
				doseRate: 600,
				targetRegion: 'Left frontal boost volume',
				geometry: {
					gantry: '0°',
					collimator: '90°',
					jaws: '10 × 12 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Marcus Lee',
		mrn: 'AU-24812',
		siteLabel: 'Oropharynx + Bilateral Neck',
		siteKey: 'hneck',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.72,
		technique: 'Head & Neck Multi-Field',
		energy: '6 MV',
		fraction: '18 / 35',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field photon treatment delivery to the head and neck'
		},
		note: 'Use a head-and-shoulder mask with indexed shoulder pull-downs. Verify the AP low-neck field and the opposed upper-neck laterals before treatment.',
		immobilization: {
			required: ['hnMask', 'headrest', 'shoulderPull'],
			orderSummary: 'Rigid head-and-shoulder fixation with reproducible shoulder depression.',
			instructions: [
				'Use rigid fixation extending from the cranium through the shoulders.',
				'Use an indexed occipital support to reproduce neck extension.',
				'Add the device that maintains inferior shoulder position and verify bilateral symmetry.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 18 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP Low Neck',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Lower cervical lymphatics',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 18 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral Upper Neck',
				mu: 136,
				doseRate: 600,
				targetRegion: 'Primary site / upper neck',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral Upper Neck',
				mu: 136,
				doseRate: 600,
				targetRegion: 'Primary site / upper neck',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Helen Garcia',
		mrn: 'AU-24820',
		siteLabel: 'Mid-Thoracic Esophagus',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.42,
		technique: 'Thorax Multi-Field 3DCRT',
		energy: '10 MV',
		fraction: '11 / 28',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field thoracic photon treatment delivery'
		},
		note: 'Conventional thoracic case intended to contrast with IMRT/VMAT. Verify the AP/PA fields and weighted oblique fields for an esophageal target.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed posterior support.',
			instructions: [
				'Elevate both arms using a support that keeps elbows and hands reproducible.',
				'Add a moldable indexed posterior cradle for the upper torso.',
				'Keep the thorax centered and shoulders symmetric before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '12 × 18 cm',
			mlcAperture: '11 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 88,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '12 × 18 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 96,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '12 × 18 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'RPO',
				mu: 74,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '140°',
					collimator: '0°',
					jaws: '11 × 16 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'LPO',
				mu: 74,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '220°',
					collimator: '0°',
					jaws: '11 × 16 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Dana Collins',
		mrn: 'AU-24831',
		siteLabel: 'Right Breast IMRT',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: 'Breast IMRT · Fixed-Field',
		energy: '6 MV',
		fraction: '10 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter modulated photon delivery to the breast'
		},
		note: 'Breast IMRT case. Use the breast board setup, verify the fixed-field start geometry, then observe step-and-shoot IMRT leaf shaping through the beam delivery sequence.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast setup with both arms elevated and reproducibly supported.',
			instructions: [
				'Use an indexed inclined support appropriate for breast treatment.',
				'Elevate both arms with the dedicated bilateral arm support.',
				'Rotate the head slightly away from the treated side and reproduce board index/angle.'
			]
		},
		planned: {
			gantry: '300°',
			collimator: '15°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 128,
				doseRate: 600,
				geometry: {
					gantry: '300°',
					collimator: '15°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 16.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.33, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.66, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 16.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 2',
				mode: 'IMRT',
				mu: 122,
				doseRate: 600,
				geometry: {
					gantry: '315°',
					collimator: '10°',
					jaws: '18 × 18 cm',
					mlcAperture: '15 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.35, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.7, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 3',
				mode: 'IMRT',
				mu: 118,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '345°',
					jaws: '18 × 18 cm',
					mlcAperture: '15 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.34, mlcAperture: 11.8, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 0.67, mlcAperture: 10.2, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			},
			{
				name: 'IMRT Field 4',
				mode: 'IMRT',
				mu: 114,
				doseRate: 600,
				geometry: {
					gantry: '135°',
					collimator: '350°',
					jaws: '18 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.33, mlcAperture: 10.8, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.66, mlcAperture: 9.6, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			}
		]
	},
	{
		patient: 'Maria Santos',
		mrn: 'AU-24845',
		siteLabel: 'Pancreas',
		siteKey: 'abdomen',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.02,
		technique: 'Abdomen 4-Field Box',
		energy: '10 MV',
		fraction: '9 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field abdominal photon treatment delivery'
		},
		note: 'Abdominal multi-field case. Verify the 4-field box geometry and ensure the selected field is directed to the upper abdominal target volume.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary:
				'Supine upper-abdominal immobilization with posterior molding and knee support.',
			instructions: [
				'Use a moldable indexed cradle beneath the torso to limit rotation.',
				'Support the knees to reduce lumbar strain and improve reproducibility.',
				'Keep arms out of the treatment field and verify midline alignment.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 14 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 102,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 94,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 94,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'James Foster',
		mrn: 'AU-24856',
		siteLabel: 'Rectum · Prone Belly Board',
		siteKey: 'pelvis',
		position: 'HFP',
		positionLabel: 'Head-First Prone',
		setupSiteZ: 0.18,
		technique: 'Pelvis Multi-Field Prone',
		energy: '10 MV',
		fraction: '8 / 28',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Prone multi-field pelvic photon treatment delivery'
		},
		note: 'Prone pelvic case. The learner should recognize the belly-board setup and verify the prone field arrangement before beam enable.',
		immobilization: {
			required: ['bellyBoard'],
			orderSummary:
				'Prone pelvic setup using a board designed to displace bowel away from the pelvis.',
			instructions: [
				'Position the patient prone on the board with the abdominal/pelvic opening centered correctly.',
				'Confirm the pelvis is level and the lower abdomen can fall into the opening without pressure points.',
				'Index the board before confirming field geometry.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '0°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'PA',
				mu: 124,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 98,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 16 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 98,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 16 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Olivia Chen',
		mrn: 'AU-24867',
		siteLabel: 'Thoracic Spine',
		siteKey: 'spine',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.24,
		technique: 'Skeletal Spine Multi-Field',
		energy: '10 MV',
		fraction: '4 / 10',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field spine photon treatment delivery'
		},
		note: 'Thoracic spine palliation case. Verify the selected field direction and ensure the beam is centered on the thoracic vertebral target rather than a generic torso region.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary: 'Supine thoracic-spine setup with indexed posterior support and knee support.',
			instructions: [
				'Use a moldable indexed posterior support to reduce thoracic rotation.',
				'Support the knees for comfort and reproducibility while keeping the spine neutral.',
				'Verify the thoracic target remains centered after immobilization is secured.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '0°',
			jaws: '10 × 18 cm',
			mlcAperture: '9 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'PA',
				mu: 110,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '10 × 18 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 78,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '270°',
					collimator: '90°',
					jaws: '10 × 14 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 78,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '90°',
					collimator: '90°',
					jaws: '10 × 14 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Laura Bennett',
		mrn: 'AU-24644',
		siteLabel: 'Left Breast DIBH',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: '3DCRT Tangents · DIBH',
		energy: '6 MV',
		fraction: '6 / 20',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment with active DIBH motion management'
		},
		note: 'Verify reproducible deep-inspiration breath hold before treating the left-breast tangents. Beam delivery must remain inside the approved DIBH level.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast DIBH setup with bilateral arm elevation.',
			instructions: [
				'Use an indexed inclined support appropriate for breast treatment.',
				'Elevate both arms with the dedicated bilateral support.',
				'Confirm the respiratory monitoring surface remains visible and head position is reproducible.'
			]
		},
		planned: {
			gantry: '300°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		motionManagement: {
			type: 'DIBH',
			label: 'Deep Inspiration Breath Hold',
			period: 4.8,
			dibhTarget: 80,
			dibhTolerance: 5,
			practiceHolds: 3
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 168,
				doseRate: 600,
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 171,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	// ===== Rad Onc EMR Patient Library (integrated daily-treatment charts) =====
	{
		patient: 'John Smith',
		mrn: 'AU-24901',
		siteLabel: 'Glioblastoma (Post-op Tumor Bed)',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '11 / 30',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the post-operative brain'
		},
		note: 'EMR chart · Dr. Evelyn Reed · chart MRN 44556. Adjuvant GBM with concurrent temozolomide. Verify Aquaplast mask fixation and daily CBCT to skull anatomy before each arc.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid thermoplastic cranial fixation with indexed occipital support.',
			instructions: [
				'Seat the patient supine with the head neutral in the Aquaplast mask, arms down.',
				'Reproduce the indexed headrest and align to lateral / sagittal lasers on the anterior and lateral tattoos.',
				'Confirm mask lock before daily CBCT to skull anatomy.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '0°',
			jaws: '15 × 15 cm',
			mlcAperture: '13 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 305,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '0°',
					jaws: '15 × 15 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 420 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 298,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '0°',
					jaws: '15 × 15 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			}
		]
	},
	{
		patient: 'Maria Garcia',
		mrn: 'AU-24902',
		siteLabel: 'Whole Brain (Brain Metastases)',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		technique: 'Opposed Lateral 3DCRT',
		energy: '6 MV',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D opposed photon treatment delivery to the whole brain'
		},
		note: 'EMR chart · Dr. Samuel Green · chart MRN 11223. Palliative WBRT for multiple NSCLC brain metastases (patient on pembrolizumab). Daily kV/MV field verification to skull.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Thermoplastic cranial fixation with indexed occipital support.',
			instructions: [
				'Position supine with the head neutral in the thermoplastic mask, arms down.',
				'Align to lateral / sagittal lasers using the simulation skin marks.',
				'Confirm the head is straight and centered before lateral imaging.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 158,
				doseRate: 600,
				targetRegion: 'Whole brain',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 158,
				doseRate: 600,
				targetRegion: 'Whole brain',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Sarah Chen',
		mrn: 'AU-24903',
		siteLabel: 'Left Tonsil + Bilateral Neck',
		siteKey: 'hneck',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.72,
		technique: 'IMRT · Simultaneous Integrated Boost',
		energy: '6 MV',
		fraction: '20 / 35',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery with simultaneous integrated boost'
		},
		note: 'EMR chart · Dr. James Miller · chart MRN 77889. HPV+ SCC left tonsil, SIB to 70/63/56 Gy with concurrent cisplatin. Head-and-shoulder mask; daily kV/CBCT before delivery.',
		immobilization: {
			required: ['hnMask', 'headrest', 'shoulderPull'],
			orderSummary: 'Rigid head-and-shoulder mask with indexed occipital support.',
			instructions: [
				'Position supine, head first, arms down, in the head-and-shoulder thermoplastic mask.',
				'Reproduce the indexed headrest and align to the mask tattoos (anterior, lateral R/L).',
				'Confirm bilateral shoulder symmetry before daily kV/CBCT.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 20 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 168,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 20 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.33, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.66, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 2',
				mode: 'IMRT',
				mu: 154,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '15 × 18 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.35, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 0.7, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 3',
				mode: 'IMRT',
				mu: 150,
				doseRate: 600,
				geometry: {
					gantry: '240°',
					collimator: '0°',
					jaws: '15 × 18 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.34, mlcAperture: 9.8, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.67, mlcAperture: 7.8, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			}
		]
	},
	{
		patient: 'Robert Miller',
		mrn: 'AU-24904',
		siteLabel: 'Right Upper Lobe Lung SBRT',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.45,
		technique: 'SBRT · Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '2 / 3',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction (three-fraction course)'
		},
		note: 'EMR chart · Dr. Evelyn Reed · chart MRN 99001. Medically inoperable Stage IA NSCLC, 54 Gy / 3 fx every other day. Daily CBCT ± 4D / respiratory gating.',
		stereotactic: {
			type: 'SBRT',
			label: 'Peripheral lung SBRT · 54 Gy / 3 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'BodyFix / Vac-Lok with abdominal compression'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung SBRT',
			period: 4.2,
			siExcursion: 12,
			apExcursion: 5,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary:
				'Arms-up thoracic SBRT immobilization with indexed vacuum bag and optional abdominal compression.',
			instructions: [
				'Elevate both arms overhead on the wing board with the BodyFix / Vac-Lok bag.',
				'Apply abdominal compression if used at simulation and reproduce the index.',
				'Confirm the respiratory surrogate is unobstructed before daily CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '8 × 8 cm',
			mlcAperture: '6 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1520,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.45, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.8, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1495,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 4.9, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.45, mlcAperture: 4.0, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.7, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'David Garcia',
		mrn: 'AU-24905',
		siteLabel: 'Right Lower Lobe Lung (3DCRT)',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.42,
		technique: 'Multi-Field 3DCRT',
		energy: '6 MV',
		fraction: '15 / 33',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field thoracic photon treatment delivery'
		},
		note: 'EMR chart · Dr. Sarah Jenkins · chart MRN 55667. RLL NSCLC with involved hilar / mediastinal nodes, 66 Gy / 33 with concurrent carbo/taxol. AP/PA plus obliques; daily CBCT or kV pair.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the BodyFix vacuum bag.',
				'Align to lateral / sagittal lasers on the anterior and lateral tattoos.',
				'Keep the thorax centered and shoulders symmetric before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 92,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 104,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'RPO',
				mu: 78,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '140°',
					collimator: '0°',
					jaws: '12 × 15 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'LPO',
				mu: 70,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '220°',
					collimator: '0°',
					jaws: '12 × 15 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Linda Jones',
		mrn: 'AU-24906',
		siteLabel: 'Left Hilum NSCLC (VMAT)',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.44,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '12 / 30',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the thorax'
		},
		note: 'EMR chart · Dr. Sarah Jenkins · chart MRN 33445. Stage IIIA SCC left hilum / mediastinum, 60 Gy high / 50 Gy elective with concurrent carbo/taxol. Daily kV/CBCT.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the vacuum bag.',
				'Center the thorax without shoulder rotation and reproduce the index.',
				'Confirm setup to tattoos before daily kV/CBCT.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 352,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 338,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			}
		]
	},
	{
		patient: 'Mary Peterson',
		mrn: 'AU-24907',
		siteLabel: 'Right Breast · Tangents',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: '3DCRT Opposed Tangents',
		energy: '6 MV',
		fraction: '8 / 16',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment delivery to the whole breast'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 66778. Adjuvant hypofractionated whole-breast RT (42.56 Gy / 16) post-lumpectomy. Daily kV/MV pair to chest wall / ribs.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast-board setup with both arms elevated.',
			instructions: [
				'Position supine on the breast board with both arms elevated in the arm support.',
				'Turn the head away from the treated right side and align to lateral / sagittal lasers.',
				'Reproduce the board angle / index using the central sternum and mid-axillary tattoos.'
			]
		},
		planned: {
			gantry: '60°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 172,
				doseRate: 600,
				targetRegion: 'Right whole breast',
				geometry: {
					gantry: '60°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 176,
				doseRate: 600,
				targetRegion: 'Right whole breast',
				geometry: {
					gantry: '240°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Barbara Davis',
		mrn: 'AU-24908',
		siteLabel: 'Left Breast + Supraclavicular',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.68,
		setupBodyX: 0.1,
		technique: '3-Field Breast · SCV + Tangents',
		energy: '6 MV',
		fraction: '14 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment with matched supraclavicular and tangent fields'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 11223. HER2+ IDC left breast, 50 Gy + 10 Gy boost with nodal SCV field. Verify SCV / tangent matchline before treating.',
		specialSetup: {
			type: 'BREAST_MATCH',
			label: 'SCV / tangent matchline',
			toleranceMm: 1,
			matchTechnique: 'Half-beam field-edge match'
		},
		immobilization: {
			required: ['wingBoard', 'armSupport'],
			orderSummary: 'Inclined breast / nodal setup with bilateral arm elevation.',
			instructions: [
				'Position supine on the wing board with both arms elevated and the head turned slightly right.',
				'Align to the sternal notch, mid-axillary, and SCV-border tattoos.',
				'Confirm the supraclavicular-to-tangent junction is reproducible before treatment.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 16 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Supraclavicular AP',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Left supraclavicular / low neck',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 16 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				}
			},
			{
				name: 'Medial Tangent',
				mu: 178,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couchAngle: '355°'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 184,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couchAngle: '5°'
				}
			}
		]
	},
	{
		patient: 'Anna Bellwether',
		mrn: 'AU-24909',
		siteLabel: 'Right Breast Boost · Electron',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: 'Custom Electron Cutout',
		energy: '9 MeV electrons',
		fraction: '3 / 5',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: 'Single electron treatment field to the lumpectomy cavity'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 55443. Lumpectomy-cavity boost following whole-breast RT. Create and verify the cutout; match to cavity clips / chest wall.',
		specialSetup: {
			type: 'ELECTRON',
			label: 'Electron cutout creation & fabrication',
			shape: 'Oval',
			widthCm: 6,
			heightCm: 5,
			cone: '10 × 10 cm',
			ssdCm: 100,
			bolusThicknessCm: 0.5
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Breast-board position retained from whole-breast RT for the electron boost.',
			instructions: [
				'Reproduce the original breast-board setup and arm support.',
				'Align to the original central-sternum and mid-axillary tattoos.',
				'Center the lumpectomy cavity beneath the electron central ray before cone / cutout setup.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: '9 MeV Electron · Custom Cutout',
				electron: true,
				mu: 210,
				doseRate: 400,
				targetRegion: 'Right lumpectomy cavity',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Susan Miller',
		mrn: 'AU-24910',
		siteLabel: 'Left Breast · Prone Setup',
		siteKey: 'breast',
		position: 'HFP',
		positionLabel: 'Head-First Prone',
		setupSiteZ: -0.48,
		setupBodyX: 0.1,
		technique: '3DCRT Tangents · Prone',
		energy: '6 MV',
		fraction: '9 / 16',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment delivery to the whole breast in the prone position'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 88776. DCIS w/ microinvasion, hypofractionated prone whole-breast RT (42.56 Gy / 16). Recognize the prone breast-board setup before verifying tangents.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary:
				'Prone breast-board setup with the treated breast dependent through the board aperture.',
			instructions: [
				'Position the patient prone on the breast board with the left breast falling through the aperture.',
				'Reproduce arm and head position and confirm the board index.',
				'Verify the prone tangent arrangement before imaging.'
			]
		},
		planned: {
			gantry: '130°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 170,
				doseRate: 600,
				targetRegion: 'Left whole breast (prone)',
				geometry: {
					gantry: '130°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 174,
				doseRate: 600,
				targetRegion: 'Left whole breast (prone)',
				geometry: {
					gantry: '310°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'David Garcia',
		mrn: 'AU-24911',
		siteLabel: 'Pancreas Head SBRT',
		siteKey: 'abdomen',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.02,
		technique: 'SBRT · Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '3 / 5',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction (five-fraction course)'
		},
		note: 'EMR chart · Dr. Robert Evans · chart MRN 22334. Borderline-resectable pancreatic head adenocarcinoma s/p FOLFIRINOX, neoadjuvant SBRT 33 Gy / 5. Daily volumetric CBCT required.',
		stereotactic: {
			type: 'SBRT',
			label: 'Pancreas SBRT · 33 Gy / 5 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'Indexed vacuum immobilization'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated upper abdomen',
			period: 4.6,
			siExcursion: 9,
			apExcursion: 4,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up upper-abdominal SBRT immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the indexed vacuum bag.',
				'Reproduce any prescribed breath-hold or gating surrogate from simulation.',
				'Confirm the upper-abdomen surrogate is unobstructed before daily volumetric CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '10 × 10 cm',
			mlcAperture: '8 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1180,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '10 × 10 cm',
					mlcAperture: '8 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.25, mlcAperture: 6.4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.5, mlcAperture: 5.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.75, mlcAperture: 6.6, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1155,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '10 × 10 cm',
					mlcAperture: '8 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.25, mlcAperture: 6.2, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.5, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.75, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'James Wilson',
		mrn: 'AU-24912',
		siteLabel: 'Prostate + Seminal Vesicles (VMAT)',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: 0.18,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '22 / 44',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the prostate'
		},
		note: 'EMR chart · Dr. Maria Garcia · chart MRN 44556. Gleason 4+3 prostate adenocarcinoma, 79.2 Gy / 44 with ADT. Daily fiducial-based CBCT / kV before each arc.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary:
				'Supine pelvic VMAT setup with reproducible lower-extremity support and bladder/rectal preparation.',
			instructions: [
				'Support both knees symmetrically and use paired foot stocks to reproduce leg rotation.',
				'Confirm the prescribed bladder-filling and rectal-emptying protocol before imaging.',
				'Match to implanted fiducial markers on daily CBCT / kV.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '11 × 11 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 392,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '11 × 11 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 381,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '11 × 11 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 7.2, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 5.8, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 8.2, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			}
		]
	},
	{
		patient: 'Elizabeth Green',
		mrn: 'AU-24913',
		siteLabel: 'Endometrial · Pelvic Nodes (VMAT)',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: 0.18,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '10 / 25',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the pelvis'
		},
		note: 'EMR chart · Dr. Susan Clark · chart MRN 77665. Adjuvant post-op endometrial adenocarcinoma (upper vagina + pelvic nodes), 45 Gy / 25. Daily CBCT; reproduce bladder-filling protocol.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary:
				'Supine pelvic setup with reproducible lower-extremity support and bladder/rectal preparation.',
			instructions: [
				'Support both knees and use paired foot stocks to reproduce leg position.',
				'Confirm the prescribed bladder-filling protocol to displace small bowel.',
				'Confirm rectal preparation before daily CBCT.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '16 × 18 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 368,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 357,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 11.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			}
		]
	}
];
// ---- Apply clinical immobilization rules + improved instructions + per-patient key ----
function applyImmobilizationRules(cases) {
	const named = (ids) =>
		(ids || []).map(
			(id) => (IMMOBILIZATION_DEVICE_META[id] && IMMOBILIZATION_DEVICE_META[id].name) || id
		);
	cases.forEach((c) => {
		const im = c.immobilization;
		if (!im) return;
		const tech = (c.technique || '').toLowerCase(),
			site = (c.siteLabel || '').toLowerCase(),
			key = c.siteKey || '',
			pos = (c.position || '').toUpperCase();
		const prone = pos === 'HFP' || pos === 'FFP';
		const isSBRT = /sbrt/.test(tech) || /sbrt/.test(site);
		const isSRS =
			/srs|radiosurg/.test(tech) ||
			/srs|radiosurg/.test(site) ||
			String(c.billing && c.billing.treatmentCode) === '77372';
		const isHN = key === 'hneck';
		const isBrain = key === 'brain';
		const metBrain = isBrain && /whole brain|metasta|brain met/.test(site);
		const primaryBrain = isBrain && !metBrain;
		let req = null,
			summary = null,
			steps = null;
		if (isSBRT) {
			if (key === 'abdomen' || key === 'pelvis') {
				req = ['bodyFix', 'vacLok'];
				summary = 'Full-body immobilization (BODY FIX) for abdominal/pelvic SBRT.';
				steps = [
					'Immobilize the patient in the BODY FIX (evacuated full-body cushion) and draw the vacuum to lock the contour.',
					'Add the Vac-Lok / abdominal support prescribed for the target region.',
					'Confirm indexing and midline alignment before volumetric imaging.'
				];
			} else {
				req = ['bodyFix', 'wingBoard'];
				summary = 'Full-body immobilization (BODY FIX) for stereotactic body radiotherapy.';
				steps = [
					'Immobilize the patient in the BODY FIX (evacuated full-body cushion) and draw the vacuum to lock the whole-body contour.',
					'Elevate both arms in the reproducible overhead support (wing board).',
					'Confirm the respiratory-monitoring region is unobstructed and the body is centered and indexed.'
				];
			}
		} else if (isSRS) {
			req = ['hnMask', 'headrest'];
			summary = 'Rigid HEAD & SHOULDERS mask for stereotactic cranial reproducibility.';
			steps = [
				'Fit the HEAD & SHOULDERS thermoplastic mask for stereotactic-grade rigidity.',
				'Use an indexed occipital headrest and confirm a neutral, reproducible head position.',
				'Verify the mask is fully locked to the tabletop index before 6DOF imaging and couch rotation.'
			];
		} else if (isHN) {
			req = ['hnMask', 'headrest', 'shoulderPull'];
			summary = 'Rigid HEAD & SHOULDERS mask with indexed shoulder pull-downs.';
			steps = [
				'Fit the HEAD & SHOULDERS thermoplastic mask extending from the cranium through the shoulders.',
				'Use an indexed occipital headrest to reproduce neck extension.',
				'Add shoulder pull-downs to hold inferior shoulder position; verify bilateral symmetry.'
			];
		} else if (primaryBrain) {
			req = ['hnMask', 'headrest'];
			summary = 'Rigid HEAD & SHOULDERS mask for primary brain treatment.';
			steps = [
				'Fit the HEAD & SHOULDERS thermoplastic mask conforming over the cranium and shoulders.',
				'Support the occiput with an indexed headrest for a reproducible neutral position.',
				'Confirm HFS orientation and that the mask is locked to the tabletop index.'
			];
		} else if (metBrain) {
			req = ['headMask', 'headrest'];
			summary = 'SHORT head mask for a metastatic / palliative cranial setup.';
			steps = [
				'Fit the SHORT head mask (head-only thermoplastic) and lock it to the tabletop index.',
				'Support the occiput with an indexed headrest to reproduce a neutral head position.',
				'Confirm the head is straight and centered before imaging.'
			];
		} else if ((key === 'pelvis' || key === 'abdomen') && !prone) {
			const region = key === 'abdomen' ? 'torso/abdomen' : 'pelvis and lower body';
			req = ['vacLok', 'kneeSupport'];
			summary =
				'Supine ' +
				(key === 'abdomen' ? 'abdominal' : 'pelvic') +
				' setup immobilized in a VAC-LOK cushion (not a knee sponge alone).';
			steps = [
				'Immobilize the ' + region + ' in a VAC-LOK evacuated cushion molded to the patient.',
				'Add a knee support/sponge for comfort and reproducible leg rotation.',
				'Confirm ' + (c.positionLabel || 'HFS') + ' orientation and tabletop index before imaging.'
			];
		}
		if (req) {
			im.required = req;
			im.orderSummary = summary;
			im.instructions = steps;
			delete im.positionInstructions;
			delete im.indexingInstructions;
			delete im.preparationInstructions;
		}
		im.keyNames = named(im.required);
	});
}
applyImmobilizationRules(TREATMENT_CASES);
const SETUP_REFINEMENTS = {
	'AU-24031': {
		required: ['vacLok', 'kneeSupport'],
		orderSummary:
			'Supine pelvic setup with indexed Vac-Lok immobilization, knee support, and documented bladder/rectal preparation.',
		positionInstructions: [
			'HFS supine with the pelvis neutral and the lower body molded reproducibly in the Vac-Lok.',
			'Arms positioned comfortably on the chest or outside the treatment field.'
		],
		indexingInstructions: [
			'Reproduce the Vac-Lok index and knee-support/sponge position used at simulation.',
			'Confirm tabletop longitudinal index and pelvic midline before imaging.'
		],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling protocol was completed.',
			'Confirm rectal-emptying / bowel preparation instructions according to the treatment record before image guidance.'
		]
	},
	'AU-24108': {
		required: ['headMask', 'headrest'],
		orderSummary: 'Rigid cranial fixation with indexed occipital support.',
		positionInstructions: [
			'HFS supine with the head straight, centered, and in the simulation position.'
		],
		indexingInstructions: [
			'Reproduce the indexed headrest and mask/baseplate location.',
			'Verify mask fixation before lateral imaging.'
		],
		preparationInstructions: []
	},
	'AU-24214': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Arms-up thoracic immobilization with indexed posterior molding and respiratory-gating access.',
		positionInstructions: [
			'HFS supine with both arms elevated reproducibly above the head.',
			'Center the thorax without shoulder rotation.'
		],
		indexingInstructions: ['Reproduce the wing-board and Vac-Lok indices used at simulation.'],
		preparationInstructions: [
			'Confirm the respiratory monitoring region/surrogate is unobstructed.',
			'Complete the prescribed 4D/gating verification before treatment.'
		]
	},
	'AU-24362': {
		required: ['vacLok', 'legPositioner'],
		orderSummary:
			'Feet-first unilateral extremity setup with individualized leg molding and ankle/foot rotation control.',
		positionInstructions: [
			'FFS with the treated left femur centered and the opposite leg displaced outside the treatment field.',
			'Reproduce the documented left-leg rotation rather than forcing bilateral symmetry.'
		],
		indexingInstructions: [
			'Reproduce the Vac-Lok index and the dedicated ankle/foot-positioner setting for the treated leg.'
		],
		preparationInstructions: []
	},
	'AU-24519': {
		required: ['kneeSupport', 'footStocks'],
		orderSummary:
			'Supine pelvic VMAT setup with reproducible leg support and bladder/rectal preparation.',
		positionInstructions: ['HFS supine with pelvis neutral and lower extremities symmetric.'],
		indexingInstructions: ['Reproduce knee-support and paired foot-stock indices before CBCT.'],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling protocol.',
			'Confirm rectal preparation/emptying instructions before CBCT.'
		]
	},
	'AU-24602': {
		required: ['srsMask', 'headrest'],
		orderSummary:
			'High-precision stereotactic cranial fixation using a dedicated mask/baseplate and indexed head support.',
		positionInstructions: [
			'HFS supine with neutral stereotactic head position and no unintended rotation.'
		],
		indexingInstructions: [
			'Lock the SRS mask/baseplate and reproduce the indexed headrest position.',
			'Verify fixation before 6DOF imaging and noncoplanar couch motion.'
		],
		preparationInstructions: [
			'Complete high-precision image guidance and the stereotactic timeout before beam delivery.'
		]
	},
	'AU-24631': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Indexed arms-up thoracic SBRT immobilization with respiratory-management access.',
		positionInstructions: ['HFS supine with both arms elevated and thorax centered.'],
		indexingInstructions: ['Reproduce the wing-board and upper-body Vac-Lok indices.'],
		preparationInstructions: [
			'Confirm respiratory monitoring equipment can observe the prescribed region.',
			'Complete 4D motion verification before the SBRT timeout.'
		]
	},
	'AU-24710': {
		required: ['breastBoard', 'armSupport'],
		orderSummary:
			'Indexed inclined breast/nodal setup with bilateral arm elevation and reproducible head/chin position.',
		positionInstructions: [
			'HFS on the prescribed breast-board angle with both arms elevated.',
			'Turn the head away from the treated left side and reproduce chin position.'
		],
		indexingInstructions: [
			'Reproduce breast-board angle/index and bilateral arm-support index.',
			'Confirm lateral body alignment and the SCV/tangent junction reference.'
		],
		preparationInstructions: ['Review the field-junction / matchline setup before nodal treatment.']
	},
	'AU-24724': {
		required: ['hnMask', 'headrest', 'vacLok'],
		orderSummary:
			'Craniospinal setup with cranial fixation plus reproducible whole-body longitudinal alignment.',
		positionInstructions: [
			'HFS supine with head fixed, spine straight, pelvis neutral, and arms at the sides.',
			'Keep the legs straight and aligned with the longitudinal treatment axis.'
		],
		indexingInstructions: [
			'Reproduce headrest/mask indexing and the long-body Vac-Lok index.',
			'Confirm longitudinal station references before cranial/spine junction verification.'
		],
		preparationInstructions: [
			'Review the cranial/upper-spine and upper/lower-spine junction plan before treatment.'
		]
	},
	'AU-24739': {
		required: ['breastBoard', 'armSupport'],
		orderSummary: 'Breast-treatment position retained for the electron chest-wall scar field.',
		positionInstructions: [
			'HFS on the prescribed breast-board angle with both arms elevated.',
			'Reproduce head rotation and chest-wall exposure from simulation.'
		],
		indexingInstructions: ['Reproduce breast-board and arm-support indices.'],
		preparationInstructions: [
			'Center the chest-wall scar beneath the electron central ray.',
			'Complete cone/cutout verification and the separate delivery-stage bolus placement task.'
		]
	},
	'AU-24782': {
		required: ['kneeSupport', 'footStocks'],
		orderSummary:
			'Supine adaptive bladder setup with reproducible lower-extremity position and daily bladder/rectal preparation.',
		positionInstructions: ['HFS supine with pelvis neutral and legs symmetric.'],
		indexingInstructions: ['Reproduce knee-support and foot-stock indices before daily CBCT.'],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling state before imaging.',
			'Confirm rectal/bowel preparation and document deviations that could affect plan-of-day selection.',
			'Use the daily CBCT anatomy—not the setup note alone—to select the adaptive plan.'
		]
	},
	'AU-24801': {
		required: ['headMask', 'headrest'],
		orderSummary: 'Rigid primary-brain fixation with indexed occipital support.',
		positionInstructions: ['HFS supine with the head in the documented simulation position.'],
		indexingInstructions: ['Reproduce headrest and mask/baseplate index.'],
		preparationInstructions: []
	},
	'AU-24812': {
		required: ['hnMask', 'headrest'],
		optional: ['shoulderPull'],
		orderSummary:
			'Head-and-shoulder fixation with plan-specific head/neck position; shoulder depression is used only when documented.',
		positionInstructions: [
			'HFS supine with the head and neck reproduced from simulation rather than assuming universal extension.',
			'Confirm chin position and bilateral shoulder symmetry.'
		],
		indexingInstructions: [
			'Reproduce the indexed headrest and long-mask/baseplate position.',
			'Use the shoulder pull-down only when the setup record specifically prescribes it.'
		],
		preparationInstructions: [
			'Confirm oral cavity/airway accessories, bite block, or other site-specific devices if documented in the treatment record.'
		]
	},
	'AU-24820': {
		required: ['wingBoard', 'vacLok'],
		orderSummary: 'Arms-up conventional thoracic setup with indexed posterior torso support.',
		positionInstructions: [
			'HFS supine with arms above the head and shoulders symmetric.',
			'Center the thorax to the documented esophageal setup marks.'
		],
		indexingInstructions: ['Reproduce wing-board and Vac-Lok indices.'],
		preparationInstructions: []
	},
	'AU-24831': {
		required: ['breastBoard', 'armSupport'],
		orderSummary: 'Indexed inclined right-breast IMRT setup with bilateral arm elevation.',
		positionInstructions: [
			'HFS at the prescribed breast-board angle with both arms elevated.',
			'Turn the head away from the treated right side and reproduce chin position.'
		],
		indexingInstructions: ['Reproduce board angle/index and bilateral arm-support index.'],
		preparationInstructions: [
			'Confirm the breast surface and imaging region are unobstructed before treatment.'
		]
	},
	'AU-24845': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Supine upper-abdominal setup with both arms elevated and indexed posterior torso molding.',
		positionInstructions: [
			'HFS supine with both arms above the head to clear AP/PA and lateral upper-abdominal fields.',
			'Center the torso and avoid rotation.'
		],
		indexingInstructions: ['Reproduce wing-board and Vac-Lok indices.'],
		preparationInstructions: [
			'Confirm any prescribed fasting, contrast, or stomach/bowel preparation documented for the treatment course before imaging.'
		]
	},
	'AU-24856': {
		required: ['bellyBoard', 'armSupport'],
		orderSummary:
			'Prone pelvic belly-board setup with reproducible arm, pelvis, and lower-extremity alignment.',
		positionInstructions: [
			'HFP prone with the lower abdomen centered over the belly-board opening.',
			'Position arms above the head in the prescribed support and keep legs straight/symmetric.'
		],
		indexingInstructions: [
			'Index the belly board and reproduce the arm-support position.',
			'Confirm pelvis level and longitudinal midline before imaging.'
		],
		preparationInstructions: [
			'Confirm bowel/bladder preparation according to the pelvic treatment record.',
			'Check for pressure points and ensure the abdomen can fall freely into the opening.'
		]
	},
	'AU-24867': {
		required: ['wingBoard', 'kneeSupport'],
		orderSummary:
			'Supine thoracic-spine setup with arms elevated out of the lateral treatment fields and reproducible knee support.',
		positionInstructions: [
			'HFS supine with both arms elevated above the head to clear the opposed lateral fields.',
			'Keep the thoracic spine neutral and centered.'
		],
		indexingInstructions: ['Reproduce wing-board and knee-support indices.'],
		preparationInstructions: []
	},
	'AU-24644': {
		required: ['breastBoard', 'armSupport'],
		orderSummary:
			'Inclined left-breast DIBH setup with bilateral arm elevation and reproducible head rotation.',
		positionInstructions: [
			'HFS at the prescribed board angle with both arms elevated.',
			'Turn the head away from the treated left side and reproduce chin position.'
		],
		indexingInstructions: ['Reproduce breast-board angle/index and bilateral arm-support index.'],
		preparationInstructions: [
			'Confirm the surface-guidance / respiratory monitoring region is visible.',
			'Complete the prescribed DIBH reproducibility workflow before beam delivery.'
		]
	}
};
TREATMENT_CASES.forEach((c) => {
	const r = SETUP_REFINEMENTS[c.mrn];
	if (r) {
		c.immobilization = { ...(c.immobilization || {}), ...r };
		c.immobilization.keyNames = (c.immobilization.required || []).map(
			(id) => (IMMOBILIZATION_DEVICE_META[id] && IMMOBILIZATION_DEVICE_META[id].name) || id
		);
	}
});

function populateTreatmentCaseSelect() {
	if (!treatmentCaseSelect) return;
	treatmentCaseSelect.innerHTML = '';
	TREATMENT_CASES.forEach((c, i) => {
		const opt = document.createElement('option');
		opt.value = String(i);
		opt.textContent = `${c.patient} · ${c.siteLabel}`;
		treatmentCaseSelect.appendChild(opt);
	});
}
function loadTreatmentCase(index) {
	const safeIndex =
		((index % TREATMENT_CASES.length) + TREATMENT_CASES.length) % TREATMENT_CASES.length;
	S.activeTreatmentCaseIndex = safeIndex;
	S.activeTreatmentCase = TREATMENT_CASES[safeIndex];
	if (treatmentCaseSelect) treatmentCaseSelect.value = String(safeIndex);
	const site = IMAGING_SITES.find((s) => s.key === S.activeTreatmentCase.siteKey);
	if (site && typeof runPatientSetup === 'function') {
		const setupZ = Number.isFinite(S.activeTreatmentCase.setupSiteZ)
			? S.activeTreatmentCase.setupSiteZ
			: site.z;
		runPatientSetup(
			S.activeTreatmentCase.position || (site.orient && site.orient[0]) || 'HFS',
			setupZ,
			S.activeTreatmentCase.setupBodyX || 0,
			S.activeTreatmentCase.setupBodyY || 0
		);
	}
	setPendantLCD(
		'PATIENT LOADED',
		`${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
	);
	resetImmobilizationWorkflowForCase();
	resetClinicalIGRTForCase();
	resetMotionManagementForCase();
	resetSRSWorkflowForCase();
	resetSpecialSetupForCase();
	resetAdaptiveWorkflowForCase();
	resetTreatmentDeliveryForCase();
	loadOISSession();
	renderTreatmentMonitor();
	renderImmobilizationPanel();
	renderAdaptivePanel();
	renderOISPanel();
}

function clinicalIGRTModeForCase() {
	const imaging = (S.activeTreatmentCase?.planned?.imaging || '').toLowerCase();
	return imaging.includes('mv') ? 'MV Pair' : 'CBCT';
}
function igrtHardwareReady() {
	return S.clinicalIGRT.mode === 'MV Pair' ? !!S.detectorExtended : !!S.kvOn;
}
function fmtIGRT(v, unit) {
	const n = Math.abs(v) < 0.0001 ? 0 : v;
	const dec = unit === '°' ? 1 : 0;
	return `${n > 0 ? '+' : ''}${n.toFixed(dec)}${unit}`;
}
function getIGRTApplied() {
	const b = S.clinicalIGRT.baseline || { lat: 0, lng: 0, vrt: 0, roll: 0, pitch: 0, yaw: 0 };
	return {
		lat: fundamentalState.lat - b.lat,
		lng: fundamentalState.lng - b.lng,
		vrt: fundamentalState.vrt - b.vrt,
		roll: fundamentalState.roll - b.roll,
		pitch: fundamentalState.pitch - b.pitch,
		yaw: fundamentalState.yaw - b.yaw
	};
}
function getIGRTResidual() {
	if (!S.clinicalIGRT.correction) return { lat: 0, lng: 0, vrt: 0, roll: 0, pitch: 0, yaw: 0 };
	const a = getIGRTApplied(),
		c = S.clinicalIGRT.correction;
	return {
		lat: c.lat - a.lat,
		lng: c.lng - a.lng,
		vrt: c.vrt - a.vrt,
		roll: c.roll - a.roll,
		pitch: c.pitch - a.pitch,
		yaw: c.yaw - a.yaw
	};
}
function setClinicalIGRTError(err) {
	if (!S.patientErrorGroup || !S.errorGroupHome || !S.couchTopGroup) return;
	const r = err || { lat: 0, lng: 0, vrt: 0, roll: 0, pitch: 0, yaw: 0 };
	// Keep the patient physically on the couch during daily setup error generation.
	// Translate and rotate the couch TOP together with the patient, then let the learner
	// drive the absolute couch controls to return the target anatomy to the laser/isocenter.
	const MM = 0.1,
		ROT = Math.PI / 180;
	const homePos =
		S.clinicalIGRT?.couchTopBasePos || S.couchTopHomePos || S.couchTopGroup.position.clone();
	const homeRot =
		S.clinicalIGRT?.couchTopBaseRot || S.couchTopHomeRot || S.couchTopGroup.rotation.clone();
	S.couchTopGroup.position.set(
		homePos.x - (r.lat || 0) * MM,
		homePos.y - (r.vrt || 0) * MM,
		homePos.z - (r.lng || 0) * MM
	);
	S.couchTopGroup.rotation.set(
		homeRot.x - (r.pitch || 0) * ROT,
		homeRot.y - (r.yaw || 0) * ROT,
		homeRot.z - (r.roll || 0) * ROT
	);
	S.patientErrorGroup.position.copy(S.errorGroupHome);
	S.patientErrorGroup.rotation.set(0, 0, 0);
	updateCouchAccordion();
}
const COLLISION_PROXY_TOL = 0.025;
const TREATMENT_CLEARANCE_REQUIRED_MARGIN = 0.015;
// Static electron delivery is verified at one fixed treatment pose. Use the same small
// numerical tolerance as the live mechanical-clearance interlock; do not impose the extra
// positive trajectory buffer used for rotating photon/VMAT treatments.
const ELECTRON_FIXED_CLEARANCE_REQUIRED_MARGIN = -COLLISION_PROXY_TOL;
function isFixedElectronField(field = deliveryCasePlan()) {
	return !!field?.electron && String(field?.mode || 'STATIC').toUpperCase() === 'STATIC';
}

function treatmentTrajectorySamples(field) {
	const mode = String(field?.mode || 'STATIC').toUpperCase();
	if (mode === 'VMAT' && field?.arc) {
		const a0 = arcAngularState(field.arc, 0);
		const sweep = Math.max(0, Number(a0?.sweep) || 0);
		const count = Math.max(24, Math.ceil(sweep / 4)); // ~4° or finer across full arcs
		return Array.from({ length: count + 1 }, (_, i) => {
			const f = i / count,
				s = arcAngularState(field.arc, f);
			return {
				fraction: f,
				angle: s?.angle ?? (normalizeAngleValue(field?.geometry?.gantry) || 0)
			};
		});
	}
	return [{ fraction: 0, angle: normalizeAngleValue(field?.geometry?.gantry) || 0 }];
}
function evaluateTreatmentTrajectoryClearance(
	fields = getTreatmentFields(),
	requiredMargin = TREATMENT_CLEARANCE_REQUIRED_MARGIN
) {
	if (!S.gantryRotatingGroup || !S.couchTopGroup || !S.scene)
		return {
			safe: true,
			minMargin: Infinity,
			reason: '',
			field: '',
			angle: 0,
			requiredMargin,
			samples: 0,
			fixedElectron: false
		};
	const pose = captureCollisionPose();
	let worst = {
			score: Infinity,
			margin: Infinity,
			reason: '',
			field: '',
			angle: 0,
			requiredMargin,
			fixedElectron: false
		},
		samples = 0;
	try {
		const list = Array.isArray(fields) && fields.length ? fields : getTreatmentFields();
		for (const field of list) {
			const fixedElectron = isFixedElectronField(field);
			const fieldRequiredMargin = fixedElectron
				? ELECTRON_FIXED_CLEARANCE_REQUIRED_MARGIN
				: requiredMargin;
			const tableAngle = normalizeAngleValue(field?.geometry?.couchAngle ?? '0°') || 0;
			if (S.couchTreatmentPivot) S.couchTreatmentPivot.rotation.y = (tableAngle * Math.PI) / 180;
			// Electron treatment has no gantry/couch trajectory: evaluate only the prescribed
			// fixed pose. Photon/VMAT fields retain the existing field/arc sampling behavior.
			for (const s of treatmentTrajectorySamples(field)) {
				S.gantryRotatingGroup.rotation.z = -((s.angle * Math.PI) / 180);
				S.scene.updateMatrixWorld(true);
				const c = getCollisionAssessment();
				samples++;
				const margin = Number(c?.margin ?? Infinity);
				const score = margin - fieldRequiredMargin;
				if (score < worst.score)
					worst = {
						score,
						margin,
						reason: c?.reason || 'Mechanical clearance',
						field: field?.name || field?.field || 'Treatment field',
						angle: s.angle,
						requiredMargin: fieldRequiredMargin,
						fixedElectron
					};
			}
		}
	} finally {
		restoreCollisionPose(pose);
	}
	const safe = worst.score >= 0;
	return {
		safe,
		minMargin: worst.margin,
		reason: worst.reason,
		field: worst.field,
		angle: worst.angle,
		requiredMargin: worst.requiredMargin,
		samples,
		fixedElectron: worst.fixedElectron
	};
}
function currentSelectedFieldClearance(requiredMargin = TREATMENT_CLEARANCE_REQUIRED_MARGIN) {
	const field = typeof deliveryCasePlan === 'function' ? deliveryCasePlan() : null;
	if (!field)
		return {
			safe: true,
			minMargin: Infinity,
			reason: '',
			field: '',
			angle: 0,
			requiredMargin,
			samples: 0,
			fixedElectron: false
		};
	return evaluateTreatmentTrajectoryClearance([field], requiredMargin);
}
function prepareTreatmentClearanceBaseline() {
	if (!S.couchTopGroup || !S.patientErrorGroup || !S.errorGroupHome)
		return {
			safe: true,
			minMargin: Infinity,
			reason: '',
			field: '',
			angle: 0,
			requiredMargin: TREATMENT_CLEARANCE_REQUIRED_MARGIN,
			placementOffset: 0
		};
	const baseTop = S.couchTopGroup.position.clone(),
		basePatient = S.patientErrorGroup.position.clone();
	// Small longitudinal indexing changes are acceptable during initial patient setup,
	// but keep them limited so the patient remains visibly supported by the tabletop.
	const offsets = [0, 0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.4, -0.4, 0.5, -0.5, 0.6, -0.6, 0.7, -0.7];
	let best = null;
	for (const dz of offsets) {
		S.couchTopGroup.position.copy(baseTop);
		S.couchTopGroup.position.z += dz;
		// Slide the tabletop beneath the patient while counter-shifting the patient's
		// couch-local placement. The treatment target therefore remains at isocenter.
		S.patientErrorGroup.position.copy(basePatient);
		S.patientErrorGroup.position.z -= dz;
		S.scene.updateMatrixWorld(true);
		const c = evaluateTreatmentTrajectoryClearance(
			getTreatmentFields(),
			TREATMENT_CLEARANCE_REQUIRED_MARGIN
		);
		const candidate = {
			...c,
			placementOffset: dz,
			top: S.couchTopGroup.position.clone(),
			patient: S.patientErrorGroup.position.clone()
		};
		if (!best || candidate.minMargin > best.minMargin) best = candidate;
		if (candidate.safe) {
			best = candidate;
			break;
		}
	}
	if (!best) {
		S.couchTopGroup.position.copy(baseTop);
		S.patientErrorGroup.position.copy(basePatient);
		return {
			safe: false,
			minMargin: -Infinity,
			reason: 'Unable to evaluate clearance',
			field: '',
			angle: 0,
			requiredMargin: TREATMENT_CLEARANCE_REQUIRED_MARGIN,
			placementOffset: 0
		};
	}
	S.couchTopGroup.position.copy(best.top);
	S.patientErrorGroup.position.copy(best.patient);
	// errorGroupHome follows the patient's intentional placement on the tabletop, while
	// couchTopHomePos remains the machine's canonical tabletop geometry.
	S.errorGroupHome = S.patientErrorGroup.position.clone();
	S.scene.updateMatrixWorld(true);
	updateCouchAccordion();
	return { ...best, top: undefined, patient: undefined };
}
function removeTreatmentClearancePlacement() {
	const dz = Number(S.clinicalIGRT?.clearancePlacementOffset) || 0;
	if (Math.abs(dz) > 1e-9 && S.couchTopGroup && S.patientErrorGroup) {
		S.couchTopGroup.position.z -= dz;
		S.patientErrorGroup.position.z += dz;
		S.errorGroupHome = S.patientErrorGroup.position.clone();
		S.scene?.updateMatrixWorld(true);
		updateCouchAccordion();
	}
	S.clinicalIGRT.clearancePlacementOffset = 0;
}
function randomIGRTError(mode) {
	// Generate only values that can be reproduced exactly by the pendant:
	// translations = integer millimeters; rotations = 0.5 degree increments.
	// Keep the daily setup clinically useful but compact enough for repeated practice.
	const mmVals = [-3, -2, -1, 1, 2, 3];
	const rotVals = [-1, -0.5, 0, 0.5, 1];
	const pick = (a) => a[Math.floor(Math.random() * a.length)];
	const e = { lat: pick(mmVals), lng: pick(mmVals), vrt: pick(mmVals), roll: 0, pitch: 0, yaw: 0 };
	if (mode === 'CBCT') {
		e.roll = pick(rotVals);
		e.pitch = pick(rotVals);
		e.yaw = pick(rotVals);
	} else {
		e.pitch = pick(rotVals);
		e.yaw = pick(rotVals);
	}
	return e;
}
function correctionFromIGRTError(e) {
	// Couch coordinate convention in this emulator:
	// +LAT moves the couch/patient left, +LNG moves it toward the gantry/head,
	// +VRT raises the couch. The introduced patient error is therefore corrected
	// with opposite LAT/LNG and same-sign VRT/rotational commands.
	return { lat: -e.lat, lng: -e.lng, vrt: e.vrt, roll: e.roll, pitch: e.pitch, yaw: e.yaw };
}
function quietIGRTStep(mutator) {
	S.scene?.updateMatrixWorld(true);
	const before = getCollisionAssessment();
	const beforePose = captureCollisionPose();
	mutator();
	S.scene?.updateMatrixWorld(true);
	const after = getCollisionAssessment();
	const tol = COLLISION_PROXY_TOL;
	const entered = before.margin >= -tol && after.margin < -tol;
	const worsened = before.margin < -tol && after.margin < before.margin - 0.002;
	if (entered || worsened) {
		restoreCollisionPose(beforePose);
		return false;
	}
	return true;
}
function isIGRTCorrectionAttainable(error, c) {
	if (!S.couchGroup || !S.couchTopGroup || !c) return true;
	const origin = captureCollisionPose();
	let ok = true;
	const baseHalf = 0.7 / 2,
		minY = baseHalf + GROUND_Y;
	// Test the real path: first create the daily setup error, then apply the proposed
	// couch correction in the same sequence available to the learner.
	setClinicalIGRTError(error);
	S.scene?.updateMatrixWorld(true);
	const setupClearance = getCollisionAssessment();
	if (setupClearance && setupClearance.margin < -COLLISION_PROXY_TOL) {
		restoreCollisionPose(origin);
		return false;
	}
	const stepTranslation = (key, count) => {
		const sign = Math.sign(count),
			n = Math.round(Math.abs(count));
		for (let i = 0; i < n && ok; i++) {
			if (key === 'vrt' && S.couchGroup.position.y + sign * MOVEMENT_STEP < minY - 1e-6) {
				ok = false;
				break;
			}
			ok = quietIGRTStep(() => {
				if (key === 'vrt') {
					S.couchGroup.position.y += sign * MOVEMENT_STEP;
					updateCouchAccordion();
				} else if (key === 'lng') S.couchTopGroup.position.z -= sign * MOVEMENT_STEP;
				else if (key === 'lat') S.couchGroup.position.x -= sign * MOVEMENT_STEP;
			});
		}
	};
	const stepRotation = (key, val) => {
		const sign = Math.sign(val),
			n = Math.round(Math.abs(val) / 0.5),
			rad = (0.5 * Math.PI) / 180;
		const axis = key === 'roll' ? 'z' : key === 'pitch' ? 'x' : 'y';
		for (let i = 0; i < n && ok; i++)
			ok = quietIGRTStep(() => {
				S.couchTopGroup.rotation[axis] += sign * rad;
			});
	};
	stepTranslation('vrt', c.vrt);
	stepTranslation('lng', c.lng);
	stepTranslation('lat', c.lat);
	stepRotation('roll', c.roll);
	stepRotation('pitch', c.pitch);
	stepRotation('yaw', c.yaw);
	// At this stage we are testing whether the prescribed couch correction itself
	// can be executed safely. Treatment-field/arc clearance is intentionally evaluated
	// later, per selected field, in the Delivery workflow.
	restoreCollisionPose(origin);
	return ok;
}
function generateAttainableIGRTSetup(mode) {
	for (let attempt = 0; attempt < 40; attempt++) {
		const error = randomIGRTError(mode),
			correction = correctionFromIGRTError(error);
		if (isIGRTCorrectionAttainable(error, correction))
			return { error, correction, attainable: true };
	}
	// Guaranteed small fallback aligned to pendant increments. If the current pose is
	// unusually constrained, use a zero rotational component and minimal translations.
	const fallbacks = [
		{ lat: 1, lng: -1, vrt: 1, roll: 0, pitch: 0, yaw: 0 },
		{ lat: -1, lng: 1, vrt: 1, roll: 0, pitch: 0, yaw: 0 },
		{ lat: 1, lng: 1, vrt: -1, roll: 0, pitch: 0, yaw: 0 },
		{ lat: -1, lng: -1, vrt: -1, roll: 0, pitch: 0, yaw: 0 }
	];
	for (const error of fallbacks) {
		const e = { ...error };
		if (mode === 'CBCT') {
			e.roll = 0.5;
			e.pitch = 0;
			e.yaw = -0.5;
		} else {
			e.roll = 0;
			e.pitch = 0.5;
			e.yaw = -0.5;
		}
		const correction = correctionFromIGRTError(e);
		if (isIGRTCorrectionAttainable(e, correction))
			return { error: e, correction, attainable: true };
	}
	// Last-resort educational setup: preserve image-acquisition progression even if the
	// conservative treatment preflight cannot approve a random nonzero candidate. The final
	// corrected pose must still pass trajectory clearance before IGRT verification/beam enable.
	const error = { lat: 1, lng: -1, vrt: 1, roll: mode === 'CBCT' ? 0.5 : 0, pitch: 0, yaw: -0.5 };
	return {
		error,
		correction: correctionFromIGRTError(error),
		attainable: true,
		clearancePending: true
	};
}
function igrtAnatomyBody(site, plane) {
	const bone = '#d8cfb6',
		bone2 = '#b8ae94',
		soft = '#2d3238',
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
		soft2 = '#1e262e',
		lung = '#0f1419',
		accent = '#746d7d';
	if (site === 'brain') {
		if (plane === 'axial')
			return `<circle cx="80" cy="80" r="42" fill="#31363b" stroke="#b9c2ca" stroke-width="2.5"/><circle cx="80" cy="80" r="33" fill="#423a43"/><path d="M60 80q20-16 40 0q-4 18-20 20q-16-2-20-20Z" fill="#514753" stroke="${accent}" stroke-width="1"/><line x1="80" y1="48" x2="80" y2="112" stroke="${accent}" stroke-width="1"/>`;
		if (plane === 'ap')
			return `<path d="M56 28q24-16 48 0q8 25 4 54q-5 29-14 42l2 12H64l2-12q-9-13-14-42q-4-29 4-54Z" fill="#31363b" stroke="#b9c2ca" stroke-width="2"/><ellipse cx="80" cy="64" rx="18" ry="21" fill="#423a43"/>`;
		return `<path d="M55 26q42 6 44 54q2 47-19 58H60q-10-40-8-69q2-35 3-43Z" fill="#31363b" stroke="#b9c2ca" stroke-width="2"/><ellipse cx="72" cy="66" rx="12" ry="18" fill="#423a43"/>`;
	}
	if (site === 'hneck') {
		if (plane === 'axial')
			return `<ellipse cx="80" cy="76" rx="34" ry="28" fill="${soft}" stroke="#8e979f" stroke-width="1.4"/><rect x="73" y="42" width="14" height="56" rx="7" fill="#8c8476"/><path d="M48 76q10-20 24-18q8 8 8 18q0 10-8 18q-14 2-24-18Z" fill="#7f605c" opacity=".85"/><path d="M112 58q14-2 24 18q-10 20-24 18q-8-8-8-18q0-10 8-18Z" fill="#7f605c" opacity=".72"/><path d="M64 58q16-10 32 0q-2 14-16 18q-14-4-16-18Z" fill="#5b5160"/>`;
		if (plane === 'coronal' || plane === 'ap')
			return `<path d="M54 18q26-10 52 0l8 100q-14 16-34 18q-20-2-34-18Z" fill="${soft}" stroke="#8e979f" stroke-width="1.4"/><rect x="76" y="30" width="8" height="92" rx="4" fill="#8c8476"/><path d="M44 58q12-18 26-20q10 8 10 20q0 12-10 20q-14-2-26-20Z" fill="#7f605c" opacity=".85"/><path d="M116 38q-14 2-26 20q12 18 26 20q10-8 10-20q0-12-10-20Z" fill="#7f605c" opacity=".72"/><path d="M60 26q20-12 40 0" stroke="#66727c" stroke-width="1.1" fill="none"/>`;
		return `<path d="M52 18q42 4 48 42q4 38-14 78H54q-14-22-14-58q0-36 12-62Z" fill="${soft}" stroke="#8e979f" stroke-width="1.4"/><rect x="86" y="28" width="8" height="96" rx="4" fill="#8c8476"/><path d="M54 54q14-16 28-10q4 14-4 24q-10 2-24-14Z" fill="#7f605c" opacity=".8"/><path d="M94 62q10 16 8 34" stroke="#66727c" stroke-width="1.2" fill="none"/>`;
	}
	if (site === 'pelvis') {
		if (plane === 'axial')
			return `<ellipse cx="80" cy="78" rx="52" ry="34" fill="${soft}" stroke="#767f89" stroke-width="1.6"/><path d="M34 88q18-22 36-12v18q-17-4-30 7Z" fill="${bone}" stroke="${bone2}" stroke-width="1.4"/><path d="M126 76q18-10 36 12l-6 13q-13-11-30-7Z" fill="${bone}" stroke="${bone2}" stroke-width="1.4"/><rect x="73" y="82" width="14" height="18" rx="4" fill="#8a8170"/><circle cx="80" cy="80" r="6" fill="#554f49"/>`;
		if (plane === 'coronal')
			return `<path d="M44 24q36-18 72 0l4 96q-16 18-40 18q-24 0-40-18Z" fill="${soft}" stroke="#767f89" stroke-width="1.6"/><path d="M46 44q10-10 24-8l2 58q-16 2-26 16Z" fill="${bone}" stroke="${bone2}" stroke-width="1.3"/><path d="M114 36q14-2 24 8v66q-10-14-26-16Z" fill="${bone}" stroke="${bone2}" stroke-width="1.3"/><rect x="74" y="38" width="12" height="82" rx="4" fill="#8a8170"/><circle cx="59" cy="108" r="9" fill="${bone}" stroke="${bone2}" stroke-width="1.1"/><circle cx="101" cy="108" r="9" fill="${bone}" stroke="${bone2}" stroke-width="1.1"/>`;
		return `<path d="M48 26q44 4 50 46q4 46-26 66H48q-12-20-14-46q-2-26 14-66Z" fill="${soft}" stroke="#767f89" stroke-width="1.6"/><path d="M52 82q10-18 30-17v17q-15 2-24 16Z" fill="${bone}" stroke="${bone2}" stroke-width="1.2"/><rect x="86" y="42" width="10" height="76" rx="4" fill="#8a8170"/><circle cx="80" cy="104" r="10" fill="${bone}" stroke="${bone2}" stroke-width="1.1"/>`;
	}
	if (site === 'breast') {
		if (plane === 'axial')
			return `<ellipse cx="80" cy="78" rx="50" ry="36" fill="${soft}" stroke="#7b858d" stroke-width="1.6"/><ellipse cx="63" cy="73" rx="15" ry="18" fill="${lung}"/><ellipse cx="97" cy="73" rx="15" ry="18" fill="${lung}"/><ellipse cx="108" cy="52" rx="17" ry="10" fill="#655064" stroke="#aa82a2" stroke-width="1.2"/><ellipse cx="87" cy="84" rx="9" ry="12" fill="#783a44" opacity=".85"/><rect x="75" y="58" width="10" height="48" rx="5" fill="#8c8476"/>`;
		if (plane === 'coronal' || plane === 'ap')
			return `<path d="M48 18q32-10 64 0l8 100q-13 18-40 20q-27-2-40-20Z" fill="${soft}" stroke="#7b858d" stroke-width="1.6"/><ellipse cx="62" cy="68" rx="15" ry="29" fill="${lung}"/><ellipse cx="98" cy="68" rx="15" ry="29" fill="${lung}"/><path d="M100 42q20 2 24 18q-10 8-24 5Z" fill="#655064" stroke="#aa82a2" stroke-width="1.2"/><ellipse cx="86" cy="83" rx="8" ry="12" fill="#783a44" opacity=".85"/><rect x="76" y="28" width="8" height="92" rx="4" fill="#8c8476"/>`;
		return `<path d="M50 18q42 2 50 46q5 46-20 74H50q-12-23-12-58q0-35 12-62Z" fill="${soft}" stroke="#7b858d" stroke-width="1.6"/><ellipse cx="72" cy="72" rx="17" ry="31" fill="${lung}"/><path d="M42 48q18-8 24 10q-10 11-23 9Z" fill="#655064" stroke="#aa82a2" stroke-width="1.2"/><ellipse cx="78" cy="84" rx="8" ry="12" fill="#783a44" opacity=".85"/><rect x="87" y="26" width="8" height="96" rx="4" fill="#8c8476"/>`;
	}
	if (site === 'chest') {
		if (plane === 'axial')
			return `<ellipse cx="80" cy="78" rx="50" ry="36" fill="${soft}" stroke="#7b858d" stroke-width="1.6"/><ellipse cx="63" cy="73" rx="15" ry="18" fill="${lung}"/><ellipse cx="97" cy="73" rx="15" ry="18" fill="${lung}"/><rect x="75" y="58" width="10" height="48" rx="5" fill="#8c8476"/><path d="M71 46h18l-2 9H73Z" fill="#6d6674" opacity=".8"/><path d="M50 98q30 10 60 0" fill="none" stroke="#55606a" stroke-width="1.3"/>`;
		if (plane === 'coronal' || plane === 'ap')
			return `<path d="M48 18q32-10 64 0l8 100q-13 18-40 20q-27-2-40-20Z" fill="${soft}" stroke="#7b858d" stroke-width="1.6"/><ellipse cx="62" cy="68" rx="15" ry="29" fill="${lung}"/><ellipse cx="98" cy="68" rx="15" ry="29" fill="${lung}"/><rect x="76" y="28" width="8" height="92" rx="4" fill="#8c8476"/><path d="M46 36q14-14 24-14M114 36q-14-14-24-14" fill="none" stroke="#5c6771" stroke-width="1.1"/><path d="M50 104q30 16 60 0" fill="none" stroke="#5c6771" stroke-width="1.4"/>`;
		return `<path d="M50 18q42 2 50 46q5 46-20 74H50q-12-23-12-58q0-35 12-62Z" fill="${soft}" stroke="#7b858d" stroke-width="1.6"/><ellipse cx="72" cy="72" rx="17" ry="31" fill="${lung}"/><rect x="87" y="26" width="8" height="96" rx="4" fill="#8c8476"/><path d="M98 44q10 14 10 26q0 12-10 26" fill="none" stroke="#59656f" stroke-width="1.3"/><path d="M46 108q18 12 40 8" fill="none" stroke="#59656f" stroke-width="1.2"/>`;
	}
	if (site === 'abdomen') {
		if (plane === 'axial')
			return `<ellipse cx="80" cy="80" rx="50" ry="36" fill="${soft}" stroke="#78828b" stroke-width="1.6"/><ellipse cx="60" cy="76" rx="11" ry="17" fill="#3a302f" opacity=".78"/><ellipse cx="100" cy="76" rx="11" ry="17" fill="#3a302f" opacity=".78"/><rect x="75" y="58" width="10" height="52" rx="5" fill="#8c8476"/><path d="M62 94q18-10 36 0q-6 12-18 14q-12-2-18-14Z" fill="#6d5670" opacity=".82"/>`;
		if (plane === 'coronal' || plane === 'ap')
			return `<path d="M48 16q34-12 64 0l8 102q-14 18-40 20q-26-2-40-20Z" fill="${soft}" stroke="#78828b" stroke-width="1.6"/><rect x="76" y="26" width="8" height="96" rx="4" fill="#8c8476"/><ellipse cx="60" cy="66" rx="13" ry="28" fill="#3a302f" opacity=".78"/><ellipse cx="100" cy="66" rx="13" ry="28" fill="#3a302f" opacity=".78"/><path d="M66 96q14-8 28 0" stroke="#916b88" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/>`;
		return `<path d="M50 18q42 2 50 48q4 44-20 72H50q-12-24-12-58q0-34 12-62Z" fill="${soft}" stroke="#78828b" stroke-width="1.6"/><ellipse cx="72" cy="70" rx="16" ry="30" fill="#3a302f" opacity=".8"/><rect x="87" y="26" width="8" height="96" rx="4" fill="#8c8476"/><path d="M56 86q22-8 38 8" stroke="#916b88" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>`;
	}
	if (site === 'spine') {
		if (plane === 'axial')
			return `<ellipse cx="80" cy="80" rx="46" ry="34" fill="${soft}" stroke="#78828b" stroke-width="1.5"/><rect x="73" y="48" width="14" height="64" rx="6" fill="${bone}" stroke="${bone2}" stroke-width="1.1"/><rect x="68" y="56" width="24" height="10" rx="3" fill="#b7ac91"/><rect x="68" y="72" width="24" height="10" rx="3" fill="#b7ac91"/><rect x="68" y="88" width="24" height="10" rx="3" fill="#b7ac91"/><ellipse cx="58" cy="80" rx="10" ry="14" fill="#4b4240"/><ellipse cx="102" cy="80" rx="10" ry="14" fill="#4b4240"/>`;
		if (plane === 'coronal' || plane === 'ap')
			return `<path d="M48 18q34-10 64 0l8 104q-14 16-40 18q-26-2-40-18Z" fill="${soft}" stroke="#78828b" stroke-width="1.5"/><rect x="74" y="28" width="12" height="96" rx="4" fill="${bone}" stroke="${bone2}" stroke-width="1.1"/><rect x="71" y="38" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="71" y="54" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="71" y="70" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="71" y="86" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="71" y="102" width="18" height="10" rx="3" fill="#b7ac91"/><path d="M48 50q12-10 22-10M112 50q-12-10-22-10" stroke="#5d6871" stroke-width="1.1" fill="none"/>`;
		return `<path d="M50 18q42 2 50 46q5 46-20 74H50q-12-23-12-58q0-35 12-62Z" fill="${soft}" stroke="#78828b" stroke-width="1.5"/><rect x="84" y="28" width="12" height="94" rx="4" fill="${bone}" stroke="${bone2}" stroke-width="1.1"/><rect x="81" y="38" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="81" y="54" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="81" y="70" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="81" y="86" width="18" height="10" rx="3" fill="#b7ac91"/><rect x="81" y="102" width="18" height="10" rx="3" fill="#b7ac91"/><path d="M98 42q10 14 10 28q0 14-10 28" fill="none" stroke="#5d6871" stroke-width="1.2"/>`;
	}
	if (site === 'femur') {
		if (plane === 'axial')
			return `<ellipse cx="80" cy="82" rx="38" ry="32" fill="#433633" stroke="#7a6a64" stroke-width="1.5"/><circle cx="80" cy="82" r="12" fill="${bone}" stroke="${bone2}" stroke-width="2"/><circle cx="80" cy="82" r="5" fill="#b9ae91"/><path d="M44 48q18-12 35-8" fill="none" stroke="#93887a" stroke-width="1.1" opacity=".7"/>`;
		if (plane === 'coronal' || plane === 'ap')
			return `<path d="M46 22q20-14 44-10q14 2 22 10l6 34q-8 6-14 5q-10-2-17-10l-9 9v80H62V52l-10 8q-8 2-14-4Z" fill="#3e3330" stroke="#74645e" stroke-width="1.4"/><path d="M52 28q12-10 24-8q10 2 18 8l-3 18q-7-3-11-10q-4 7-10 10q-7 3-15 2Z" fill="${bone}" stroke="${bone2}" stroke-width="1.3"/><rect x="70" y="48" width="10" height="86" rx="5" fill="${bone}" stroke="${bone2}" stroke-width="1.2"/><rect x="73" y="60" width="4" height="60" rx="2" fill="#bcae92"/><path d="M88 44q5 8 14 12" stroke="#a89b81" stroke-width="2" fill="none"/>`;
		return `<path d="M44 24q18-10 38-4q18 6 24 20q4 10 4 26q0 16-10 26q-10 10-20 14l-4 34H60l4-84q0-18 14-32q-16 0-34 0Z" fill="#3e3330" stroke="#74645e" stroke-width="1.4"/><circle cx="76" cy="42" r="13" fill="${bone}" stroke="${bone2}" stroke-width="1.3"/><rect x="70" y="52" width="10" height="82" rx="5" fill="${bone}" stroke="${bone2}" stroke-width="1.2"/><path d="M58 94q22 4 40-10" stroke="#a89b81" stroke-width="1.5" fill="none"/>`;
	}
	// fallback torso
	if (plane === 'axial')
		return `<ellipse cx="80" cy="80" rx="48" ry="34" fill="${soft}" stroke="#78828b" stroke-width="1.5"/><circle cx="80" cy="100" r="8" fill="#6b6458"/>`;
	if (plane === 'coronal' || plane === 'ap')
		return `<path d="M48 18q32-8 64 0l6 104q-13 16-38 16q-25 0-38-16Z" fill="${soft}" stroke="#78828b" stroke-width="1.5"/><rect x="76" y="26" width="8" height="96" rx="4" fill="#6b6458"/>`;
	return `<path d="M48 20q40 2 48 42q6 44-18 76H50q-12-18-12-52q0-34 10-66Z" fill="${soft}" stroke="#78828b" stroke-width="1.5"/><rect x="84" y="28" width="8" height="92" rx="4" fill="#6b6458"/>`;
}
const RTAPPS_CT_AXIAL =
	'data:image/png;base64,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';
const RTAPPS_CT_CORONAL =
	'data:image/png;base64,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';
const RTAPPS_CT_SAGITTAL =
	'data:image/png;base64,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';
function igrtViewSVG(
	label,
	hCorrection,
	vCorrection,
	rotCorrection = 0,
	hAxis = '',
	vAxis = '',
	rotAxis = ''
) {
	// The table displays remaining COUCH correction. The image must show the residual
	// PATIENT displacement, which is opposite the couch correction. Negating here makes
	// each pendant shift move the anatomy/target toward the cyan isocenter crosshair.
	const h = -hCorrection,
		v = -vCorrection,
		rot = -rotCorrection;
	const scale = 8,
		cx = 80,
		cy = 80,
		tx = cx + Math.max(-34, Math.min(34, h * scale)),
		ty = cy - Math.max(-34, Math.min(34, v * scale));
	const residualText = `${hAxis} ${fmtIGRT(hCorrection, 'mm')} · ${vAxis} ${fmtIGRT(vCorrection, 'mm')}${rotAxis ? ` · ${rotAxis} ${fmtIGRT(rotCorrection, '°')}` : ''}`;
	const site = S.activeTreatmentCase?.siteKey || 'chest';
	const plane =
		label === 'AXIAL'
			? 'axial'
			: label === 'CORONAL'
				? 'coronal'
				: label === 'SAGITTAL'
					? 'sagittal'
					: label === 'AP'
						? 'ap'
						: 'lateral';
	if (site === 'pelvis') {
		const ctSrc =
			plane === 'axial'
				? RTAPPS_CT_AXIAL
				: plane === 'sagittal' || plane === 'lateral'
					? RTAPPS_CT_SAGITTAL
					: RTAPPS_CT_CORONAL;
		const bodyLabel = S.activeTreatmentCase?.siteLabel || site;
		const sourceLabel = S.clinicalIGRT.acquired ? 'DAILY / REGISTERED' : 'SIM / PLAN';
		const imgDx = Math.max(-34, Math.min(34, h * scale)),
			imgDy = -Math.max(-34, Math.min(34, v * scale));
		return `<div class="igrt-view"><svg viewBox="0 0 160 160" aria-label="${label} CT registration view for ${bodyLabel}">
                  <rect width="160" height="160" fill="#030609"/>
                  <g transform="rotate(${rot.toFixed(1)} 80 80) translate(${imgDx.toFixed(1)} ${imgDy.toFixed(1)})">
                    <image href="${ctSrc}" x="10" y="10" width="140" height="140" preserveAspectRatio="xMidYMid slice"/>
                  </g>
                  <g stroke="#42d9ef" stroke-width="1" stroke-dasharray="3 4"><line x1="80" y1="5" x2="80" y2="155"/><line x1="5" y1="80" x2="155" y2="80"/></g>
                  <circle cx="80" cy="80" r="4" fill="none" stroke="#42d9ef" stroke-width="1.5"/>
                  <circle cx="${tx}" cy="${ty}" r="7" fill="none" stroke="#ff54e8" stroke-width="2.1"/>
                  <line x1="${tx - 10}" y1="${ty}" x2="${tx + 10}" y2="${ty}" stroke="#ff54e8" stroke-width="1.1"/>
                  <line x1="${tx}" y1="${ty - 10}" x2="${tx}" y2="${ty + 10}" stroke="#ff54e8" stroke-width="1.1"/>
                  <text x="8" y="13" fill="#eef8ff" font-size="7.5" font-family="Arial" font-weight="700">${sourceLabel}</text>
                </svg><div class="plane-meta"><span>${label} · ${bodyLabel}</span><span>${residualText}</span></div><span class="label">CT-derived residual patient position</span></div>`;
	}

	const anatomy = igrtAnatomyBody(site, plane);
	const bodyLabel = S.activeTreatmentCase?.siteLabel || site;
	const target = `<circle cx="${tx}" cy="${ty}" r="7" fill="none" stroke="#ff54e8" stroke-width="2.1"/><line x1="${tx - 10}" y1="${ty}" x2="${tx + 10}" y2="${ty}" stroke="#ff54e8" stroke-width="1.1"/><line x1="${tx}" y1="${ty - 10}" x2="${tx}" y2="${ty + 10}" stroke="#ff54e8" stroke-width="1.1"/>`;
	return `<div class="igrt-view"><svg viewBox="0 0 160 160" aria-label="${label} registration view for ${bodyLabel}">
              <defs><radialGradient id="igbg${label.replace(/\W/g, '')}" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#26323c"/><stop offset="1" stop-color="#05080b"/></radialGradient></defs>
              <rect width="160" height="160" fill="url(#igbg${label.replace(/\W/g, '')})"/>
              <g transform="rotate(${rot.toFixed(1)} 80 80)">${anatomy}${target}</g>
              <g stroke="#42d9ef" stroke-width="1" stroke-dasharray="3 4"><line x1="80" y1="5" x2="80" y2="155"/><line x1="5" y1="80" x2="155" y2="80"/></g><circle cx="80" cy="80" r="3" fill="none" stroke="#42d9ef" stroke-width="1.5"/>
            </svg><div class="plane-meta"><span>${label} · ${bodyLabel}</span><span>${residualText}</span></div><span class="label">Residual patient position</span></div>`;
}
function renderClinicalIGRT() {
	if (!igrtPanel) return;
	const pat = document.getElementById('igrtPatient'),
		modeEl = document.getElementById('igrtMode'),
		hard = document.getElementById('igrtHardware'),
		hardChip = document.getElementById('igrtHardwareChip');
	const status = document.getElementById('igrtAcqStatus'),
		images = document.getElementById('igrtImages'),
		rows = document.getElementById('igrtCorrectionRows'),
		result = document.getElementById('igrtResult');
	if (pat)
		pat.textContent = S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
			: 'No case';
	if (modeEl) modeEl.textContent = S.clinicalIGRT.mode;
	const tolNote = document.getElementById('igrtToleranceFootnote'),
		it = activeIGRTTolerances();
	if (tolNote)
		tolNote.innerHTML = `Displayed values are <b>remaining couch corrections</b>. Exact pendant increments: 1 mm translation / 0.5° rotation. Plane mapping: <b>Axial = LAT + VRT + Roll</b>; <b>Coronal = LAT + LNG + Yaw</b>; <b>Sagittal = VRT + LNG + Pitch</b>. ${srsRequired() ? '<b>SRS high-precision tolerance:</b>' : 'Tolerance:'} translation ±${it.translation} mm; rotation ±${it.rotation}°. Treatment couch angle is a separate noncoplanar delivery coordinate and is not part of the 6DOF registration correction. <b>Alignment verification and treatment clearance are separate:</b> clearance is evaluated per selected field in Delivery.`;
	const ready = igrtHardwareReady();
	if (hard) {
		hard.textContent =
			S.clinicalIGRT.mode === 'MV Pair'
				? S.detectorExtended
					? 'MV panel extended'
					: 'Extend MV panel'
				: S.kvOn
					? 'kV arms extended'
					: 'Extend kV arms';
	}
	if (hardChip) {
		hardChip.classList.toggle('good', ready);
		hardChip.classList.toggle('bad', !ready);
	}
	if (!S.clinicalIGRT.active) {
		if (status)
			status.textContent =
				'Press New Daily Setup to create a reproducible setup error for the loaded patient.';
		if (images) images.innerHTML = '';
		if (rows) rows.innerHTML = '';
		if (result) {
			result.textContent = 'No registration acquired.';
			result.className = '';
		}
		return;
	}
	if (status) {
		const base = S.clinicalIGRT.baseline
			? canonicalCouchDisplay([
					S.clinicalIGRT.baseline.vrt,
					S.clinicalIGRT.baseline.lng,
					S.clinicalIGRT.baseline.lat
				])
			: '—';
		if (!S.clinicalIGRT.acquired) {
			const preflightNote =
				S.clinicalIGRT.clearance?.safe === false
					? `<div class="igrt-attainable" style="color:#ffd27a">Pre-treatment trajectory clearance will be rechecked after alignment correction. Imaging acquisition remains available.</div>`
					: `<div class="igrt-attainable">✓ Baseline treatment trajectory preflight clear.</div>`;
			status.innerHTML = `Daily setup error created from planned couch baseline <b>${base}</b> (VRT / LNG / LAT). Use the pendant to ${S.clinicalIGRT.mode === 'MV Pair' ? 'extend the MV panel' : 'extend the kV imaging arms'}, then acquire images.${preflightNote}`;
		} else {
			const targetObj = getIGRTExpectedAbsoluteCouch();
			const target = targetObj
				? canonicalCouchDisplay([targetObj.vrt, targetObj.lng, targetObj.lat])
				: '—';
			const selectedFieldClearance = currentSelectedFieldClearance();
			const selectedField = deliveryCasePlan();
			const clearanceOK = selectedFieldClearance?.safe !== false;
			const placementNote =
				Math.abs(Number(S.clinicalIGRT.clearancePlacementOffset) || 0) > 1e-9
					? ' Tabletop/patient placement was pre-positioned to improve treatment clearance without moving the target off isocenter.'
					: '';
			const clearanceText = clearanceOK
				? `<div class="igrt-attainable">✓ Selected-field preflight clear: ${selectedField?.field || 'Treatment field'} · G ${Number(selectedFieldClearance?.angle || normalizeAngleValue(selectedField?.geometry?.gantry) || 0).toFixed(0)}°.${placementNote}</div>`
				: `<div class="igrt-attainable" style="color:#ffd27a">Selected-field clearance proxy hold: ${selectedFieldClearance?.field || selectedField?.field || 'planned field'} · G ${Number(selectedFieldClearance?.angle || 0).toFixed(0)}°. Alignment may still be verified; resolve or document a simulation override in Delivery.</div>`;
			const wholePlanNote =
				S.clinicalIGRT.clearance?.safe === false &&
				S.clinicalIGRT.clearance?.field !== selectedFieldClearance?.field
					? `<div class="igrt-attainable" style="color:#a9bac4">Whole-plan preflight also identified a hold on ${S.clinicalIGRT.clearance?.field || 'another field'} · G ${Number(S.clinicalIGRT.clearance?.angle || 0).toFixed(0)}°. Each field is handled independently in Delivery.</div>`
					: '';
			status.innerHTML = `Registration complete. Baseline couch: <b>${base}</b>. Post-IGRT treatment target: <b>${target}</b>. Use ONLY the couch controls on the pendant to apply the recommended correction; residuals update live.${S.clinicalIGRT.attainable ? '<div class="igrt-attainable">✓ Generated correction is attainable with 1 mm / 0.5° pendant increments from this machine position.</div>' : '<div class="igrt-attainable" style="color:#ffb3b8">The couch correction path is not attainable from this machine position. Reposition the machine and create a new daily setup.</div>'}${clearanceText}${wholePlanNote}`;
		}
	}
	const residual = getIGRTResidual();
	if (images) {
		if (!S.clinicalIGRT.acquired) {
			images.innerHTML = '';
		} else if (S.clinicalIGRT.mode === 'CBCT') {
			images.className = 'igrt-images';
			images.innerHTML =
				igrtViewSVG('AXIAL', residual.lat, residual.vrt, residual.roll, 'LAT', 'VRT', 'ROLL') +
				igrtViewSVG('CORONAL', residual.lat, residual.lng, residual.yaw, 'LAT', 'LNG', 'YAW') +
				igrtViewSVG('SAGITTAL', residual.vrt, residual.lng, residual.pitch, 'VRT', 'LNG', 'PITCH');
		} else {
			images.className = 'igrt-images two';
			images.innerHTML =
				igrtViewSVG('AP', residual.lat, residual.lng, residual.yaw, 'LAT', 'LNG', 'YAW') +
				igrtViewSVG('LATERAL', residual.vrt, residual.lng, residual.pitch, 'VRT', 'LNG', 'PITCH');
		}
	}
	if (rows) {
		if (!S.clinicalIGRT.acquired) {
			rows.innerHTML =
				'<div class="igrt-row"><div class="axis">Awaiting acquisition</div><div></div><div></div><div></div></div>';
		} else {
			const a = getIGRTApplied(),
				c = S.clinicalIGRT.correction;
			const it = activeIGRTTolerances();
			const axes =
				S.clinicalIGRT.mode === 'CBCT'
					? [
							['Lateral', 'lat', 'mm', it.translation],
							['Longitudinal', 'lng', 'mm', it.translation],
							['Vertical', 'vrt', 'mm', it.translation],
							['Roll', 'roll', '°', it.rotation],
							['Pitch', 'pitch', '°', it.rotation],
							['Yaw', 'yaw', '°', it.rotation]
						]
					: [
							['Lateral', 'lat', 'mm', it.translation],
							['Longitudinal', 'lng', 'mm', it.translation],
							['Vertical', 'vrt', 'mm', it.translation],
							['Pitch', 'pitch', '°', it.rotation],
							['Yaw', 'yaw', '°', it.rotation]
						];
			rows.innerHTML = axes
				.map(([label, key, unit, tol]) => {
					const r = c[key] - a[key],
						ok = Math.abs(r) <= tol;
					return `<div class="igrt-row"><div class="axis">${label}</div><div class="num">${fmtIGRT(c[key], unit)}</div><div class="num">${fmtIGRT(a[key], unit)}</div><div class="num res ${ok ? 'good' : 'bad'}">${fmtIGRT(r, unit)}</div></div>`;
				})
				.join('');
		}
	}
	if (result) {
		if (!S.clinicalIGRT.acquired) {
			result.textContent = 'No registration acquired.';
			result.className = '';
		} else if (S.clinicalIGRT.verified) {
			const selectedClearance = currentSelectedFieldClearance();
			result.textContent = selectedClearance?.safe
				? 'IGRT VERIFIED · alignment is within tolerance. Selected treatment field clearance is clear.'
				: `IGRT VERIFIED · alignment is within tolerance. ${selectedClearance?.field || deliveryCasePlan()?.field || 'Selected field'} has a separate simulator clearance hold that must be resolved or overridden in Delivery.`;
			result.className = selectedClearance?.safe ? 'good' : '';
		} else {
			result.textContent =
				'Correction pending · drive the couch until all residual values are within tolerance.';
			result.className = 'bad';
		}
	}
}
function startClinicalIGRT() {
	if (!S.activeTreatmentCase) {
		setPendantLCD('IGRT', 'Load a patient case first');
		return;
	}
	const plannedCouch = getPlannedCouchState();
	if (plannedCouch && !couchStateMatchesPlan(0.01)) {
		const target = canonicalCouchDisplay([plannedCouch.vrt, plannedCouch.lng, plannedCouch.lat]);
		setPendantLCD('IGRT BASELINE REQUIRED', `Set couch V/L/L to ${target}`);
		if (igrtPanel) igrtPanel.classList.add('open');
		renderClinicalIGRT();
		const status = document.getElementById('igrtAcqStatus');
		if (status)
			status.innerHTML = `<b>Baseline setup not verified.</b> Before creating the daily IGRT error, set the couch to the planned case position <b>${target}</b> (VRT / LNG / LAT).`;
		return;
	}
	if (Math.abs(Number(S.clinicalIGRT.clearancePlacementOffset) || 0) > 1e-9) {
		if (S.clinicalIGRT.couchTopBasePos && S.couchTopGroup) {
			S.couchTopGroup.position.copy(S.clinicalIGRT.couchTopBasePos);
			if (S.clinicalIGRT.couchTopBaseRot)
				S.couchTopGroup.rotation.copy(S.clinicalIGRT.couchTopBaseRot);
		}
		removeTreatmentClearancePlacement();
	}
	const clearancePrep = prepareTreatmentClearanceBaseline();
	S.clinicalIGRT.clearance = clearancePrep;
	S.clinicalIGRT.clearancePlacementOffset = Number(clearancePrep.placementOffset) || 0;
	// Do not block image acquisition at this stage. Daily imaging must remain available
	// even when a treatment-trajectory preflight needs later confirmation. The corrected
	// post-IGRT pose is re-evaluated before IGRT can be VERIFIED and again before beam enable.
	// This preserves the educational sequence: image first, correct alignment, then approve
	// the final treatment position only when the full prescribed trajectory is clear.
	S.clinicalIGRT.mode = clinicalIGRTModeForCase();
	S.clinicalIGRT.active = true;
	S.clinicalIGRT.acquired = false;
	S.clinicalIGRT.verified = false;
	S.clinicalIGRT.alignmentWithinTolerance = false;
	S.clinicalIGRT.baseline = {
		lat: fundamentalState.lat,
		lng: fundamentalState.lng,
		vrt: fundamentalState.vrt,
		roll: fundamentalState.roll,
		pitch: fundamentalState.pitch,
		yaw: fundamentalState.yaw
	};
	S.clinicalIGRT.couchTopBasePos = S.couchTopGroup ? S.couchTopGroup.position.clone() : null;
	S.clinicalIGRT.couchTopBaseRot = S.couchTopGroup ? S.couchTopGroup.rotation.clone() : null;
	const generated = generateAttainableIGRTSetup(S.clinicalIGRT.mode);
	S.clinicalIGRT.error = generated.error;
	S.clinicalIGRT.correction = generated.correction;
	S.clinicalIGRT.attainable = generated.attainable;
	S.clinicalIGRT.clearancePending = !!generated.clearancePending || clearancePrep.safe === false;
	S.clinicalIGRT.clearance = clearancePrep;
	setClinicalIGRTError(S.clinicalIGRT.error);
	window.clinicalIGRTActive = true;
	setPendantLCD('DAILY SETUP', 'IGRT error loaded · acquire images');
	renderClinicalIGRT();
}
function acquireClinicalIGRT() {
	if (!S.clinicalIGRT.active) {
		setPendantLCD('IGRT', 'Create a daily setup first');
		return;
	}
	if (!igrtHardwareReady()) {
		const msg =
			S.clinicalIGRT.mode === 'MV Pair'
				? 'Extend the MV panel with the pendant first'
				: 'Extend the kV arms with the pendant first';
		setPendantLCD('IMAGING NOT READY', msg);
		renderClinicalIGRT();
		return;
	}
	S.clinicalIGRT.acquired = true;
	S.clinicalIGRT.verified = false;
	oisLogEvent(
		'IMAGING',
		`${S.clinicalIGRT.mode} acquired`,
		'Registration available for review',
		'igrt-acquired'
	);
	setPendantLCD(S.clinicalIGRT.mode, 'REGISTRATION COMPLETE');
	renderClinicalIGRT();
	renderTreatmentMonitor();
}
function verifyClinicalIGRT() {
	if (!S.clinicalIGRT.acquired) {
		setPendantLCD('IGRT', 'Acquire images first');
		return;
	}
	const r = getIGRTResidual();
	const it = activeIGRTTolerances();
	const transOK = ['lat', 'lng', 'vrt'].every((k) => Math.abs(r[k]) <= it.translation);
	const rotKeys = S.clinicalIGRT.mode === 'CBCT' ? ['roll', 'pitch', 'yaw'] : ['pitch', 'yaw'];
	const rotOK = rotKeys.every((k) => Math.abs(r[k]) <= it.rotation);
	S.clinicalIGRT.alignmentWithinTolerance = transOK && rotOK;

	// Retain a whole-plan preflight summary for teaching context, but do not make
	// patient alignment verification depend on a clearance proxy from another field.
	const wholePlanClearance = S.clinicalIGRT.alignmentWithinTolerance
		? evaluateTreatmentTrajectoryClearance(
				getTreatmentFields(),
				TREATMENT_CLEARANCE_REQUIRED_MARGIN
			)
		: S.clinicalIGRT.clearance;
	if (wholePlanClearance) S.clinicalIGRT.clearance = wholePlanClearance;

	S.clinicalIGRT.verified = S.clinicalIGRT.alignmentWithinTolerance;
	const selectedClearance = S.clinicalIGRT.alignmentWithinTolerance
		? currentSelectedFieldClearance()
		: null;

	if (S.clinicalIGRT.verified) {
		if (selectedClearance?.safe) {
			setPendantLCD('IGRT VERIFICATION', 'PASS · ALIGNMENT VERIFIED');
		} else {
			setPendantLCD('ALIGNMENT PASS', 'CLEARANCE HOLD · RESOLVE IN DELIVERY');
		}
		oisLogEvent(
			'IGRT',
			'Alignment verified',
			`Applied ${fmtOISShift(getIGRTApplied())} · residual ${fmtOISShift(r)}`,
			'igrt-verified'
		);
	} else {
		setPendantLCD('IGRT VERIFICATION', 'HOLD · residual correction remains');
	}
	renderClinicalIGRT();
	renderTreatmentMonitor();
	renderTreatmentDeliveryPanel();
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
window.clinicalIGRTCouchShift = function (axis, delta) {
	if (!S.clinicalIGRT.active || !S.clinicalIGRT.acquired) return false;
	S.clinicalIGRT.verified = false;
	renderClinicalIGRT();
	return true;
};
function resetClinicalIGRTForCase() {
	// Remove any simulated daily setup error first while the saved baseline pose still exists.
	if (S.clinicalIGRT.couchTopBasePos && S.couchTopGroup) {
		S.couchTopGroup.position.copy(S.clinicalIGRT.couchTopBasePos);
		if (S.clinicalIGRT.couchTopBaseRot)
			S.couchTopGroup.rotation.copy(S.clinicalIGRT.couchTopBaseRot);
		if (S.patientErrorGroup && S.errorGroupHome) {
			S.patientErrorGroup.position.copy(S.errorGroupHome);
			S.patientErrorGroup.rotation.set(0, 0, 0);
		}
		S.scene?.updateMatrixWorld(true);
		updateCouchAccordion();
	}
	// Undo only the automatic tabletop-under-patient clearance placement. This preserves
	// the machine's ordinary couch coordinates and prevents placement offsets from stacking
	// when a new patient/case is loaded.
	removeTreatmentClearancePlacement();
	S.clinicalIGRT.active = false;
	S.clinicalIGRT.acquired = false;
	S.clinicalIGRT.verified = false;
	S.clinicalIGRT.mode = clinicalIGRTModeForCase();
	S.clinicalIGRT.error = null;
	S.clinicalIGRT.correction = null;
	S.clinicalIGRT.baseline = null;
	S.clinicalIGRT.attainable = true;
	S.clinicalIGRT.couchTopBasePos = null;
	S.clinicalIGRT.couchTopBaseRot = null;
	S.clinicalIGRT.clearance = null;
	S.clinicalIGRT.alignmentWithinTolerance = false;
	S.clinicalIGRT.clearancePlacementOffset = 0;
	window.clinicalIGRTActive = false;
	renderClinicalIGRT();
}
function setPatientPosition(name) {
	if (!S.patientGroup) return;
	const r = PATIENT_ROT[name] || PATIENT_ROT.HFS;
	S.patientGroup.rotation.set(r[0], r[1], r[2]);
}
function applyCasePatientPose(c = S.activeTreatmentCase) {
	const p = S.patientAnatomyParts || {};
	if (p.armL) {
		p.armL.position.set(-0.25, 0, -0.35);
		p.armL.rotation.set(0, 0, 0);
	}
	if (p.armR) {
		p.armR.position.set(0.25, 0, -0.35);
		p.armR.rotation.set(0, 0, 0);
	}
	if (p.nose) {
		p.nose.position.set(0, 0.1, -0.99);
		p.nose.rotation.set(0, 0, 0);
	}
	const type = String(c?.specialSetup?.type || '').toUpperCase();
	const siteKey = String(c?.siteKey || '').toLowerCase();
	if (type === 'BREAST_MATCH' || type === 'ELECTRON' || siteKey === 'breast') {
		// Breast treatment posture: supine, both arms elevated above the head/shoulders.
		if (p.armL) {
			p.armL.position.set(-0.22, 0.055, -0.76);
			p.armL.rotation.z = -0.08;
		}
		if (p.armR) {
			p.armR.position.set(0.22, 0.055, -0.76);
			p.armR.rotation.z = 0.08;
		}
		// Turn the face slightly away from the treated side (visual cue only).
		if (p.nose) p.nose.position.x = 0.035;
	}
	if (siteKey === 'hneck') {
		// Head-and-neck setup: shoulders slightly depressed, arms relaxed at sides.
		if (p.armL) {
			p.armL.position.set(-0.25, -0.01, -0.38);
			p.armL.rotation.z = -0.03;
		}
		if (p.armR) {
			p.armR.position.set(0.25, -0.01, -0.38);
			p.armR.rotation.z = 0.03;
		}
	}
	if (type === 'CSI') {
		// Conventional supine CSI: body straight, arms at sides; cranial mask/head-and-shoulder immobilization is represented by setup context.
		if (p.armL) p.armL.position.set(-0.24, -0.005, -0.3);
		if (p.armR) p.armR.position.set(0.24, -0.005, -0.3);
	}
}
function currentSpecialFieldTarget() {
	const field = typeof deliveryCasePlan === 'function' ? deliveryCasePlan() : null;
	const type = String(S.activeTreatmentCase?.specialSetup?.type || '').toUpperCase();
	if (type === 'BREAST_MATCH') {
		if (
			String(field?.field || field?.name || '')
				.toLowerCase()
				.includes('supra')
		)
			return { x: -0.1, y: 0.13, z: -0.68, label: 'Supraclavicular / low neck' };
		return { x: -0.12, y: 0.13, z: -0.45, label: 'Left breast / chest wall' };
	}
	if (type === 'CSI') {
		const station = String(field?.station || '').toLowerCase();
		if (station.includes('cranial'))
			return { x: 0, y: 0.08, z: -0.86, label: 'Cranial contents / cervical junction' };
		if (station.includes('lower')) return { x: 0, y: 0.06, z: 0.34, label: 'Lower spinal canal' };
		return { x: 0, y: 0.06, z: -0.28, label: 'Upper spinal canal' };
	}
	if (type === 'ELECTRON') return { x: -0.12, y: 0.135, z: -0.45, label: 'Left chest-wall scar' };
	return null;
}
function updateSpecialAnatomyTargetMarker() {
	if (!S.specialAnatomyTargetMarker) return;
	const t = currentSpecialFieldTarget();
	S.specialAnatomyTargetMarker.visible = !!t;
	if (t) {
		S.specialAnatomyTargetMarker.position.set(t.x, t.y, t.z);
		S.specialAnatomyTargetMarker.userData.label = t.label;
	}
}
function updateElectronBolusMesh() {
	if (!S.electronBolusMesh) return;
	const s = activeSpecialSetupSpec();
	const isElectronCase =
		!!S.activeTreatmentCase && String(s?.type || '').toUpperCase() === 'ELECTRON';
	const e = S.specialSetupWorkflow?.electron || {};
	S.electronBolusMesh.visible = isElectronCase && !!e.bolusPlaced;
	if (!S.electronBolusMesh.visible) return;
	const w = Number(e.bolusWidth || s?.widthCm || 6);
	const h = Number(e.bolusHeight || s?.heightCm || 4);
	const thickness = Number(e.bolusThickness || s?.bolusThicknessCm || 0.5);
	S.electronBolusMesh.scale.set(
		Math.max(0.55, Math.min(1.25, w / 6)),
		Math.max(0.7, Math.min(2.4, thickness / 0.5)),
		Math.max(0.55, Math.min(1.25, h / 4))
	);
	const gap = Math.max(0, Number(e.airGapMm) || 0);
	const dxCm = Number(e.bolusOffsetXcm) || 0,
		dzCm = Number(e.bolusOffsetYcm) || 0;
	S.electronBolusMesh.position.set(
		-0.12 + dxCm * 0.012,
		0.106 + gap * 0.0018,
		-0.45 + dzCm * 0.012
	);
	S.electronBolusMesh.material.color.set(
		e.bolusPositionOK && e.bolusAirGapOK ? 0x72e0b8 : 0x66d0f2
	);
}

function runPatientSetup(name, siteZ, bodyX = 0, bodyY = 0) {
	// animate patient into isocenter (3-point setup); body offset centers the prescribed anatomy
	if (S.patientBodyGroup)
		S.patientBodyGroup.position.set(Number(bodyX) || 0, Number(bodyY) || 0, -(siteZ || 0));
	applyCasePatientPose(S.activeTreatmentCase);
	updateSpecialAnatomyTargetMarker();
	updateElectronBolusMesh();
	if (!S.patientGroup || !S.patientHome) {
		setPatientPosition(name);
		return;
	}
	setPatientPosition(name);
	const home = S.patientHome;
	const start = home
		.clone()
		.add(
			new THREE.Vector3(
				(Math.random() < 0.5 ? -1 : 1) * 0.3,
				0.22,
				(Math.random() < 0.5 ? -1 : 1) * 0.5
			)
		);
	S.patientGroup.position.copy(start);
	const t0 = performance.now(),
		dur = 1100;
	if (S.patientSetupRAF) cancelAnimationFrame(S.patientSetupRAF);
	const step = (t) => {
		const p = Math.min(1, (t - t0) / dur),
			e = 1 - Math.pow(1 - p, 3);
		S.patientGroup.position.lerpVectors(start, home, e);
		if (p < 1) S.patientSetupRAF = requestAnimationFrame(step);
		else S.patientGroup.position.copy(home);
	};
	S.patientSetupRAF = requestAnimationFrame(step);
}

// Displace/tilt the 3D patient by the residual imaging error; residual 0 → re-centered on isocenter.
function setImagingError6DOF(res) {
	if (!S.patientErrorGroup || !S.errorGroupHome) return;
	const r = res || { lat: 0, lng: 0, vrt: 0, roll: 0, pitch: 0, yaw: 0 };
	const MM = 0.02,
		ROT = (Math.PI / 180) * 2.5; // world units per mm; radians per degree (visually amplified)
	S.patientErrorGroup.position.set(
		S.errorGroupHome.x - (r.lat || 0) * MM,
		S.errorGroupHome.y - (r.vrt || 0) * MM,
		S.errorGroupHome.z - (r.lng || 0) * MM
	);
	S.patientErrorGroup.rotation.set(
		-(r.pitch || 0) * ROT,
		-(r.yaw || 0) * ROT,
		-(r.roll || 0) * ROT
	);
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

function applyDetectorCommandedPose() {
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
function setDetectorStateGame(isExtended) {
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
function setBeamState(isOn) {
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
function setLaserState(isOn) {
	S.lasersOn = isOn;
	if (S.laserGroup) S.laserGroup.visible = isOn;
	if (lasersToggleButton) {
		const s = lasersToggleButton.querySelector('small');
		if (s) s.textContent = isOn ? 'OFF' : 'Align';
		else lasersToggleButton.textContent = isOn ? 'Lasers Off' : 'Lasers On';
	}
	renderTreatmentMonitor();
}

function onWindowResize() {
	if (S.camera && S.renderer && viewerContainer) {
		S.camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
		S.camera.updateProjectionMatrix();
		S.renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
	}
}
function syncRoomViewButtons(mode = S.currentRoomView) {
	if (viewVaultButton) viewVaultButton.classList.toggle('active-function', mode === 'vault');
	if (viewControlRoomButton)
		viewControlRoomButton.classList.toggle('active-function', mode === 'control');
	syncOperatorConsole();
}
function getRoomViewPreset(mode) {
	const presets = {
		vault: {
			pos: new THREE.Vector3(8.6, ISOCENTER_Y_TARGET + 2.8, GANTRY_PLANE_Z_TARGET + 7.2),
			target: new THREE.Vector3(-0.4, 1.15, GANTRY_PLANE_Z_TARGET - 0.3),
			label: 'VAULT'
		},
		control: {
			pos: new THREE.Vector3(-13.55, 2.02, -4.0),
			target: new THREE.Vector3(-15.55, 1.58, -4.0),
			label: 'CONTROL CONSOLE'
		}
	};
	return presets[mode] || presets.vault;
}
function setConsoleMotionArmed(on) {
	S.consoleMotionArmed = !!on;
	if (consoleMotionEnable) {
		consoleMotionEnable.classList.toggle('active', S.consoleMotionArmed);
		consoleMotionEnable.textContent = S.consoleMotionArmed
			? 'Console motion enabled'
			: 'Enable console motion';
	}
	syncOperatorConsole();
	if (S.currentRoomView === 'control')
		setPendantLCD(
			'CONSOLE MOTION',
			S.consoleMotionArmed ? 'ARMED · console enabled' : 'LOCKED · arm console motion'
		);
}
function openWorkflowPanelFromConsole(kind) {
	const closers = [
		immobilizationPanel,
		igrtPanel,
		motionPanel,
		adaptivePanel,
		srsPanel,
		specialSetupPanel,
		deliveryPanel,
		chargeCapturePanel,
		oisPanel
	];
	closers.forEach((p) => p?.classList.remove('open'));
	if (kind === 'immo') {
		immobilizationPanel?.classList.add('open');
		renderImmobilizationPanel?.();
	}
	if (kind === 'igrt') {
		igrtPanel?.classList.add('open');
		renderClinicalIGRT?.();
	}
	if (kind === 'delivery') {
		deliveryPanel?.classList.add('open');
		renderTreatmentDeliveryPanel?.();
	}
	if (kind === 'ois') {
		oisPanel?.classList.add('open');
		renderOISPanel?.();
	}
}
function setStatusChip(el, label, state) {
	if (!el) return;
	el.classList.remove('good', 'warn', 'alert');
	if (state === 'good') el.classList.add('good');
	else if (state === 'warn') el.classList.add('warn');
	else if (state === 'alert') el.classList.add('alert');
	const value = el.querySelector('b');
	if (value) value.textContent = label;
}

/* ===== Console application dock: embed clinical workflow windows into the Bank A screen ===== */
const CONSOLE_DOCK_PANEL_IDS = [
	'immobilizationPanel',
	'igrtPanel',
	'deliveryPanel',
	'oisPanel',
	'motionPanel',
	'adaptivePanel',
	'srsPanel',
	'specialSetupPanel',
	'chargeCapturePanel'
];
const consoleWorkflowDock = document.getElementById('consoleWorkflowDock');
const consoleWorkflowDockBody = document.getElementById('consoleWorkflowDockBody');
const consoleDockCloseBtn = document.getElementById('consoleDockClose');
const consoleDockSlots = new Map();
function ensureConsoleDockSlot(id) {
	if (consoleDockSlots.has(id)) return;
	const el = document.getElementById(id);
	if (!el || !el.parentNode) return;
	const placeholder = document.createComment('dock-slot:' + id);
	el.parentNode.insertBefore(placeholder, el);
	consoleDockSlots.set(id, placeholder);
}
function dockConsoleWorkflowPanels() {
	if (!consoleWorkflowDockBody) return;
	CONSOLE_DOCK_PANEL_IDS.forEach((id) => {
		const el = document.getElementById(id);
		if (!el) return;
		ensureConsoleDockSlot(id);
		if (el.parentNode !== consoleWorkflowDockBody) consoleWorkflowDockBody.appendChild(el);
	});
	refreshConsoleDockState();
}
function undockConsoleWorkflowPanels() {
	CONSOLE_DOCK_PANEL_IDS.forEach((id) => {
		const el = document.getElementById(id);
		if (!el) return;
		el.classList.remove('open');
		const placeholder = consoleDockSlots.get(id);
		if (placeholder && placeholder.parentNode) placeholder.parentNode.insertBefore(el, placeholder);
	});
	refreshConsoleDockState();
}
function refreshConsoleDockState() {
	const controlActive = document.body.classList.contains('control-room-mode');
	let openEl = null;
	for (const id of CONSOLE_DOCK_PANEL_IDS) {
		const el = document.getElementById(id);
		if (el && el.classList.contains('open')) {
			openEl = el;
			break;
		}
	}
	const show = !!openEl && controlActive;
	if (consoleWorkflowDock) consoleWorkflowDock.classList.toggle('has-open', show);
	document.body.classList.toggle('console-app-open', show);
	if (show) {
		const eyebrow = consoleWorkflowDock
			? consoleWorkflowDock.querySelector('.console-dock-eyebrow')
			: null;
		const h = openEl.querySelector('h3');
		if (eyebrow) eyebrow.textContent = h ? h.textContent : 'Console application';
	}
}
if (consoleDockCloseBtn)
	consoleDockCloseBtn.addEventListener('click', () => {
		CONSOLE_DOCK_PANEL_IDS.forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.classList.remove('open');
		});
		refreshConsoleDockState();
	});
CONSOLE_DOCK_PANEL_IDS.forEach((id) => {
	const el = document.getElementById(id);
	if (!el) return;
	new MutationObserver(refreshConsoleDockState).observe(el, {
		attributes: true,
		attributeFilter: ['class']
	});
});

function syncOperatorConsole() {
	if (!operatorConsolePanel) return;
	operatorConsolePanel.classList.toggle('active', S.currentRoomView === 'control');
	document.body.classList.toggle('control-room-mode', S.currentRoomView === 'control');
	if (S.currentRoomView === 'control') dockConsoleWorkflowPanels();
	else undockConsoleWorkflowPanels();
	if (consoleActivePatient)
		consoleActivePatient.textContent = S.activeTreatmentCase?.patient || 'No patient loaded';
	if (consoleActiveField) {
		const field = S.activeTreatmentCase ? deliveryCasePlan() : null;
		consoleActiveField.textContent = S.activeTreatmentCase
			? `${S.activeTreatmentCase.siteLabel || S.activeTreatmentCase.site || '—'} · ${S.activeTreatmentCase.technique || '—'}${field ? ` · ${field.field}` : ''}`
			: 'Load a patient case to begin.';
	}
	if (consoleRoomStatus) {
		consoleRoomStatus.textContent =
			S.currentRoomView === 'control' ? 'Control room active' : 'Vault view';
		consoleRoomStatus.classList.toggle('active', S.currentRoomView === 'control');
	}
	if (consoleMotionStatus) {
		consoleMotionStatus.textContent = S.consoleMotionArmed
			? 'Console motion armed'
			: 'Motion locked';
		consoleMotionStatus.classList.toggle('active', S.consoleMotionArmed);
		consoleMotionStatus.classList.toggle('warn', !S.consoleMotionArmed);
	}
	if (consoleReadoutGantry)
		consoleReadoutGantry.textContent = `${Number(wrap360(fundamentalState.gantry).toFixed(1))}°`;
	if (consoleReadoutColl)
		consoleReadoutColl.textContent = `${Number(wrap360(fundamentalState.collimator).toFixed(1))}°`;
	if (consoleReadoutJaws)
		consoleReadoutJaws.textContent = `${Number((fundamentalState.jawX1 + fundamentalState.jawX2).toFixed(1))}×${Number((fundamentalState.jawY1 + fundamentalState.jawY2).toFixed(1))}`;
	if (consoleReadoutMLC)
		consoleReadoutMLC.textContent = `${Number(fundamentalState.mlc.toFixed(1))} cm`;
	if (consoleQueue) {
		const list = (Array.isArray(TREATMENT_CASES) ? TREATMENT_CASES : [])
			.slice(0, 6)
			.map((c, idx) => {
				const active = idx === S.activeTreatmentCaseIndex ? ' class="active"' : '';
				return `<li${active}><b>${c.patient}</b><span>${c.siteLabel || c.site || 'Treatment site'} · ${c.technique || 'Technique'}${idx === S.activeTreatmentCaseIndex ? ' · current' : ''}</span></li>`;
			})
			.join('');
		consoleQueue.innerHTML = list;
	}
	const field = S.activeTreatmentCase ? deliveryCasePlan() : null;
	if (consolePatientClock)
		consolePatientClock.textContent = new Date().toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	if (consolePatientRefName)
		consolePatientRefName.textContent = S.activeTreatmentCase?.patient || 'No patient loaded';
	if (consolePatientRefSubtitle)
		consolePatientRefSubtitle.textContent = S.activeTreatmentCase
			? `${S.activeTreatmentCase.siteLabel || '—'} · ${S.activeTreatmentCase.positionLabel || S.activeTreatmentCase.position || '—'} · ${S.activeTreatmentCase.technique || '—'}`
			: 'Load a patient case to display setup guidance.';
	if (consoleRefMRN) consoleRefMRN.textContent = S.activeTreatmentCase?.mrn || '—';
	if (consoleRefFraction) consoleRefFraction.textContent = S.activeTreatmentCase?.fraction || '—';
	if (consoleRefPosition)
		consoleRefPosition.textContent =
			S.activeTreatmentCase?.positionLabel || S.activeTreatmentCase?.position || '—';
	if (consoleRefEnergy) consoleRefEnergy.textContent = S.activeTreatmentCase?.energy || '—';
	if (consoleRefTechnique)
		consoleRefTechnique.textContent = S.activeTreatmentCase?.technique || '—';
	if (consoleRefField)
		consoleRefField.textContent = field?.field || field?.name || field?.mode || '—';
	if (consolePlanGantry)
		consolePlanGantry.textContent =
			field?.geometry?.gantry || S.activeTreatmentCase?.planned?.gantry || '—';
	if (consolePlanColl)
		consolePlanColl.textContent =
			field?.geometry?.collimator || S.activeTreatmentCase?.planned?.collimator || '—';
	if (consolePlanJaws)
		consolePlanJaws.textContent =
			field?.geometry?.jaws || S.activeTreatmentCase?.planned?.jaws || '—';
	if (consolePlanMLC)
		consolePlanMLC.textContent =
			field?.geometry?.mlcAperture || S.activeTreatmentCase?.planned?.mlcAperture || '—';
	if (consolePlanImaging)
		consolePlanImaging.textContent = S.activeTreatmentCase?.planned?.imaging || '—';
	if (consolePlanCouch) consolePlanCouch.textContent = S.activeTreatmentCase?.planned?.couch || '—';
	if (consoleImmoSummary)
		consoleImmoSummary.textContent =
			S.activeTreatmentCase?.immobilization?.orderSummary ||
			S.activeTreatmentCase?.note ||
			'No immobilization instructions loaded.';
	if (consoleImmoList) {
		const items = (
			S.activeTreatmentCase?.immobilization?.instructions?.length
				? S.activeTreatmentCase.immobilization.instructions
				: [S.activeTreatmentCase?.note || 'Load a patient case to display setup instructions.']
		).slice(0, 3);
		consoleImmoList.innerHTML = items.map((item) => `<li>${item}</li>`).join('');
	}
	// In-room monitor · setup targets + beam-enable interlock readiness (Bank A / screen 1)
	const consoleTargetFieldEl = document.getElementById('consoleTargetField');
	if (consoleTargetFieldEl)
		consoleTargetFieldEl.textContent = S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${field?.field || field?.name || S.activeTreatmentCase.technique || '—'}`
			: 'Load a patient case to set preliminary parameters.';
	setTextById(
		'consoleTargetGantry',
		field?.geometry?.gantry || S.activeTreatmentCase?.planned?.gantry || '—'
	);
	setTextById(
		'consoleTargetColl',
		field?.geometry?.collimator || S.activeTreatmentCase?.planned?.collimator || '—'
	);
	setTextById(
		'consoleTargetJaws',
		field?.geometry?.jaws || S.activeTreatmentCase?.planned?.jaws || '—'
	);
	setTextById(
		'consoleTargetMLC',
		field?.geometry?.mlcAperture || S.activeTreatmentCase?.planned?.mlcAperture || '—'
	);
	setTextById('consoleTargetEnergy', S.activeTreatmentCase?.energy || '—');
	setTextById('consoleTargetCouch', S.activeTreatmentCase?.planned?.couch || '—');
	if (typeof getDeliveryReadiness === 'function') {
		const readiness = getDeliveryReadiness();
		const ilEl = document.getElementById('consoleInterlockReadout');
		if (ilEl)
			ilEl.innerHTML = (readiness.checks || [])
				.map(
					(c) =>
						`<div class="console-interlock ${c.ok ? 'good' : 'bad'}"><span class="lamp">${c.ok ? '✓' : '!'}</span><span class="nm">${c.name}</span></div>`
				)
				.join('');
		const rsEl = document.getElementById('consoleReadyState');
		if (rsEl) {
			rsEl.className = `console-ready ${readiness.ready ? 'good' : 'bad'}`;
			rsEl.textContent = readiness.ready
				? 'READY · beam-enable interlocks satisfied'
				: S.activeTreatmentCase
					? 'HOLD · resolve the flagged interlocks'
					: 'Load a case to evaluate interlocks';
		}
	}
	setStatusChip(
		consoleBeamStatusChip,
		S.beamOn ? 'Beam On' : 'Standby',
		S.beamOn ? 'alert' : 'good'
	);
	setStatusChip(
		consoleDoorStatusChip,
		S.vaultDoorProgress > 0.1 ? 'Open' : 'Secure',
		S.vaultDoorProgress > 0.1 ? 'warn' : 'good'
	);
	setStatusChip(
		consoleIGRTStatusChip,
		S.clinicalIGRT?.verified ? 'Verified' : 'Pending',
		S.clinicalIGRT?.verified ? 'good' : 'warn'
	);
	setStatusChip(
		consoleLightsStatusChip,
		S.roomLightsOn ? 'On' : 'Off',
		S.roomLightsOn ? 'good' : 'warn'
	);
	if (consoleCameraAStatus)
		consoleCameraAStatus.textContent = S.beamOn
			? 'Live vault feed · beam visualization active'
			: 'Live vault feed nominal';
	if (consoleCameraAInfo)
		consoleCameraAInfo.textContent = S.activeTreatmentCase
			? `Active case: ${S.activeTreatmentCase.patient} · gantry ${Number(wrap360(fundamentalState.gantry).toFixed(1))}°`
			: 'GANTRY, couch, and treatment monitor visible.';
	if (consoleCameraBStatus)
		consoleCameraBStatus.textContent = S.clinicalIGRT?.verified
			? 'Live patient feed · alignment verified'
			: S.activeTreatmentCase
				? 'Live patient / isocenter observation'
				: 'No patient loaded';
	if (consoleCameraBInfo)
		consoleCameraBInfo.textContent = S.activeTreatmentCase
			? `Couch V/LAT/LNG ${fmtSignedInt(Math.round(fundamentalState.vrt * 10))} / ${fmtSignedInt(Math.round(fundamentalState.lat * 10))} / ${fmtSignedInt(Math.round(fundamentalState.lng * 10))} mm`
			: 'Patient surface and treatment isocenter visible.';
	if (consoleCameraCStatus)
		consoleCameraCStatus.textContent =
			S.vaultDoorProgress > 0.1
				? 'Live access feed · door open / transit'
				: 'Live access feed · door secure';
	if (consoleCameraCInfo)
		consoleCameraCInfo.textContent = `Room lights ${S.roomLightsOn ? 'ON' : 'OFF'} · ${S.currentRoomView === 'control' ? 'console occupied' : 'vault occupied'}`;
}
function beginTravelPath(toMode) {
	if (!S.camera || !S.controls) return;
	const dest = getRoomViewPreset(toMode);
	if (!dest?.pos?.isVector3 || !dest?.target?.isVector3) {
		console.warn('RTApps room travel cancelled: invalid destination preset.', toMode, dest);
		S.travelRequest = null;
		S.vaultDoorTarget = 0;
		return;
	}
	let positions = [S.camera.position.clone()];
	let targets = [S.controls.target.clone()];
	if (S.currentRoomView === 'vault' && toMode === 'control') {
		positions.push(
			new THREE.Vector3(4.8, 3.0, GANTRY_PLANE_Z_TARGET + 7.8),
			new THREE.Vector3(-2.0, 2.9, 7.8),
			new THREE.Vector3(-8.2, 2.7, 6.6),
			new THREE.Vector3(-11.6, 2.45, 5.15),
			new THREE.Vector3(-13.0, 2.35, 3.0),
			new THREE.Vector3(-13.8, 2.35, -0.8),
			dest.pos.clone()
		);
		targets.push(
			new THREE.Vector3(1.0, 1.1, 2.3),
			new THREE.Vector3(-4.0, 1.3, 6.2),
			new THREE.Vector3(-9.0, 1.35, 5.4),
			new THREE.Vector3(-12.3, 1.5, 5.1),
			new THREE.Vector3(-13.6, 1.5, 2.0),
			new THREE.Vector3(-14.7, 1.5, -1.6),
			dest.target.clone()
		);
	} else if (S.currentRoomView === 'control' && toMode === 'vault') {
		positions.push(
			new THREE.Vector3(-13.8, 2.35, -0.8),
			new THREE.Vector3(-13.0, 2.35, 3.0),
			new THREE.Vector3(-11.6, 2.45, 5.15),
			new THREE.Vector3(-8.2, 2.7, 6.6),
			new THREE.Vector3(-2.0, 2.9, 7.8),
			new THREE.Vector3(4.8, 3.0, GANTRY_PLANE_Z_TARGET + 7.8),
			dest.pos.clone()
		);
		targets.push(
			new THREE.Vector3(-14.7, 1.5, -1.6),
			new THREE.Vector3(-13.6, 1.5, 2.0),
			new THREE.Vector3(-12.3, 1.5, 5.1),
			new THREE.Vector3(-9.0, 1.35, 5.4),
			new THREE.Vector3(-4.0, 1.3, 6.2),
			new THREE.Vector3(1.0, 1.1, 2.3),
			dest.target.clone()
		);
	} else {
		positions.push(dest.pos.clone());
		targets.push(dest.target.clone());
	}

	// Keep only valid Vector3 pairs. A camera path is a paired position/target list;
	// a bad or missing entry must never be passed into Vector3.lerpVectors().
	const pairCount = Math.min(positions.length, targets.length);
	const cleanPositions = [];
	const cleanTargets = [];
	for (let i = 0; i < pairCount; i++) {
		const p = positions[i],
			q = targets[i];
		if (
			p?.isVector3 &&
			q?.isVector3 &&
			Number.isFinite(p.x) &&
			Number.isFinite(p.y) &&
			Number.isFinite(p.z) &&
			Number.isFinite(q.x) &&
			Number.isFinite(q.y) &&
			Number.isFinite(q.z)
		) {
			cleanPositions.push(p);
			cleanTargets.push(q);
		}
	}
	if (cleanPositions.length < 2) {
		cleanPositions.length = 0;
		cleanTargets.length = 0;
		cleanPositions.push(S.camera.position.clone(), dest.pos.clone());
		cleanTargets.push(S.controls.target.clone(), dest.target.clone());
	}
	S.cameraTravel = {
		mode: toMode,
		startTime: performance.now(),
		duration: S.currentRoomView === toMode ? 900 : 5200,
		positions: cleanPositions,
		targets: cleanTargets
	};
	setPendantLCD('DOOR OPEN', `Entering ${dest.label}`);
}
function travelToRoomView(mode) {
	if (!S.camera || !S.controls || mode === S.currentRoomView || S.travelRequest || S.cameraTravel)
		return;
	const dest = getRoomViewPreset(mode);
	S.travelRequest = { fromMode: S.currentRoomView, toMode: mode, stage: 'opening', openAt: 0 };
	S.vaultDoorTarget = 1;
	syncRoomViewButtons(S.currentRoomView);
	setPendantLCD('VAULT DOOR', `Opening for ${dest.label}`);
}
function updateTravelWorkflow(now) {
	if (!S.travelRequest) return;
	if (S.travelRequest.stage === 'opening') {
		if (S.vaultDoorProgress >= 0.985) {
			if (!S.travelRequest.openAt) {
				S.travelRequest.openAt = now;
				const dest = getRoomViewPreset(S.travelRequest.toMode);
				setPendantLCD('VAULT DOOR', `Open · Enter ${dest.label}`);
			}
			if (now - S.travelRequest.openAt >= 650) {
				S.travelRequest.stage = 'moving';
				beginTravelPath(S.travelRequest.toMode);
			}
		}
	} else if (S.travelRequest.stage === 'closing') {
		if (S.vaultDoorProgress <= 0.02) {
			setPendantLCD('ROOM VIEW', getRoomViewPreset(S.currentRoomView).label);
			S.travelRequest = null;
		}
	}
}
function updateCameraTravel(now) {
	if (!S.cameraTravel || !S.camera || !S.controls) return;
	const travel = S.cameraTravel;
	const positions = Array.isArray(travel.positions) ? travel.positions : [];
	const targets = Array.isArray(travel.targets) ? travel.targets : [];
	const pointCount = Math.min(positions.length, targets.length);

	const validVector = (v) =>
		!!(v?.isVector3 && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
	const finishTravelSafely = (reason = 'complete') => {
		const mode = travel.mode === 'control' ? 'control' : 'vault';
		const dest = getRoomViewPreset(mode);
		if (dest?.pos?.isVector3) S.camera.position.copy(dest.pos);
		if (dest?.target?.isVector3) S.controls.target.copy(dest.target);
		S.currentRoomView = mode;
		S.cameraTravel = null;
		syncRoomViewButtons(S.currentRoomView);
		S.vaultDoorTarget = 0;
		if (S.travelRequest) S.travelRequest.stage = 'closing';
		if (reason !== 'complete') console.warn('RTApps camera travel recovered safely:', reason);
	};

	if (pointCount < 2) {
		finishTravelSafely('camera path contained fewer than two waypoint pairs');
		return;
	}
	const startTime = Number(travel.startTime);
	const duration = Math.max(1, Number(travel.duration) || 1);
	const frameNow = Number.isFinite(now) ? now : performance.now();
	if (!Number.isFinite(startTime)) {
		finishTravelSafely('camera path start time was invalid');
		return;
	}

	const t = Math.max(0, Math.min(1, (frameNow - startTime) / duration));
	const easedGlobal = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	const segCount = pointCount - 1;
	const scaled = Math.min(segCount - 1e-8, Math.max(0, easedGlobal * segCount));
	const seg = Math.max(0, Math.min(segCount - 1, Math.floor(scaled)));
	const localT = scaled - seg;
	const easedLocal = localT < 0.5 ? 2 * localT * localT : 1 - Math.pow(-2 * localT + 2, 2) / 2;
	const p0 = positions[seg],
		p1 = positions[seg + 1];
	const q0 = targets[seg],
		q1 = targets[seg + 1];

	if (![p0, p1, q0, q1].every(validVector)) {
		finishTravelSafely(`invalid waypoint pair at segment ${seg}`);
		return;
	}

	S.camera.position.lerpVectors(p0, p1, easedLocal);
	S.controls.target.lerpVectors(q0, q1, easedLocal);
	if (t >= 1) finishTravelSafely('complete');
}

function updateVaultAesthetics(now) {
	const moveStep = 0.0055;
	if (S.vaultDoorTarget > S.vaultDoorProgress)
		S.vaultDoorProgress = Math.min(S.vaultDoorTarget, S.vaultDoorProgress + moveStep);
	else if (S.vaultDoorTarget < S.vaultDoorProgress)
		S.vaultDoorProgress = Math.max(S.vaultDoorTarget, S.vaultDoorProgress - moveStep);
	const easedDoor =
		S.vaultDoorProgress < 0.5
			? 2 * S.vaultDoorProgress * S.vaultDoorProgress
			: 1 - Math.pow(-2 * S.vaultDoorProgress + 2, 2) / 2;
	if (S.vaultDoorPanel) {
		S.vaultDoorPanel.position.z = 5.1 + 2.15 * easedDoor;
		S.vaultDoorPanel.position.x = -11.6 + 0.03 * easedDoor;
		if (S.vaultDoorIndicator && S.vaultDoorIndicator.material) {
			const activeColor =
				S.vaultDoorProgress > 0.95 ? 0x79f0ac : S.vaultDoorProgress > 0.05 ? 0xffcf74 : 0x7be09f;
			const col = new THREE.Color(activeColor);
			S.vaultDoorIndicator.material.color.copy(col);
			S.vaultDoorIndicator.material.emissive.copy(col);
			S.vaultDoorIndicator.material.emissiveIntensity =
				S.vaultDoorProgress > 0.05 && S.vaultDoorProgress < 0.95 ? 1.35 : 1.7;
		}
	}
	if (controlRoomAccentMats.length) {
		const pulse = 0.12 * (0.5 + 0.5 * Math.sin(now * 0.0011));
		controlRoomAccentMats.forEach((mat) => {
			mat.emissiveIntensity = (S.roomLightsOn ? 1.9 : 0.35) + pulse;
		});
	}
}

function animate() {
	requestAnimationFrame(animate);
	// RTApps perf pass: the vault kept rendering underneath the full-screen CT
	// workspace (whose iframe runs its own loop) and in hidden tabs.
	if (document.hidden || document.getElementById('ctSimWorkspace')?.classList.contains('open'))
		return;
	const now = performance.now();
	// Adaptive quality floor (mirror of sim-hub, shadows only): after 5s below ~26 FPS,
	// turn shadows off for good. `?hq` bypasses for demos.
	const P =
		animate._floor ||
		(animate._floor = {
			done: new URLSearchParams(location.search).has('hq'),
			last: now,
			n: 0,
			acc: 0,
			bad: 0
		});
	if (!P.done) {
		const d = (now - P.last) / 1000;
		P.last = now;
		if (d < 0.5) {
			P.acc += d;
			P.n++;
		}
		if (P.acc >= 1) {
			const fps = P.n / P.acc;
			P.acc = 0;
			P.n = 0;
			P.bad = fps < 26 ? P.bad + 1 : 0;
			if (P.bad >= 5) {
				P.done = true;
				S.renderer.shadowMap.enabled = false;
				S.scene.traverse((o) => {
					if (o.isMesh && o.material) o.material.needsUpdate = true;
				});
			}
		}
	}
	updateMotionAnimation(now);
	updateVaultAesthetics(now);
	updateTravelWorkflow(now);
	updateCameraTravel(now);
	if (S.controls) S.controls.update();
	[S.beamHighlight, S.standHighlight].forEach((h) => {
		if (h && h.visible) {
			const t = performance.now() * 0.004;
			h.material.opacity = 0.14 + 0.12 * (0.5 + 0.5 * Math.sin(t));
			h.scale.setScalar(1 + 0.06 * Math.sin(t));
		}
	});
	if (S.renderer && S.scene && S.camera) S.renderer.render(S.scene, S.camera);
	if (S.scene && cctvFeeds.length) updateCCTVFeeds();
}

function openTab(event) {
	const tabId = event.currentTarget.dataset.tab;
	tabContentPanels.forEach((panel) => {
		panel.classList.remove('active');
		panel.style.display = 'none';
	});
	tabButtons.forEach((button) => button.classList.remove('active'));
	const el = document.getElementById(tabId);
	if (el) {
		el.classList.add('active');
		el.style.display = 'block';
	}
	event.currentTarget.classList.add('active');
}
tabButtons.forEach((button) => button.addEventListener('click', openTab));

function updateBalanceDisplay() {
	balanceDisplay.textContent = `Balance: $${S.currentBalance}`;
}

function checkAllCorePartsEarned() {
	S.allCorePartsEarned = CORE_PART_IDS.every((id) => S.earnedParts.includes(id));
	bottomMachineControls.style.display = S.allCorePartsEarned ? 'flex' : 'none'; // Use flex for the bottom panel
	if (bonusChallengeButton)
		bonusChallengeButton.style.display = S.allCorePartsEarned ? 'block' : 'none';
	if (internalViewButton) internalViewButton.disabled = !S.allCorePartsEarned;
	if (!S.allCorePartsEarned && S.internalViewOn) setInternalView(false);
	if (S.allCorePartsEarned && !localStorage.getItem('linacFullyAssembledMessageShown_v2')) {
		showMessage(
			'LINAC assembly complete! Movement & operational enhancements now available in store.',
			'correct'
		);
		localStorage.setItem('linacFullyAssembledMessageShown_v2', 'true');
	}
}

function populateTaskSelect() {
	taskSelect.innerHTML = '';
	const availableParts = linacPartsData.filter(
		(part) => !part.isSubComponent && !S.earnedParts.includes(part.id)
	);
	if (availableParts.length === 0) {
		const option = document.createElement('option');
		option.textContent = 'All LINAC parts assembled!';
		taskSelect.appendChild(option);
		startQuizButton.disabled = true;
	} else {
		availableParts
			.sort((a, b) => a.level - b.level)
			.forEach((part) => {
				const option = document.createElement('option');
				option.value = part.id;
				option.textContent = `${part.name} (Lvl ${part.level} - Reward: $${part.cost})`;
				taskSelect.appendChild(option);
			});
		startQuizButton.disabled = false;
	}
	checkAllCorePartsEarned();
}

function renderQuiz(quizObj) {
	quizQuestionElem.textContent = quizObj.question;
	quizOptionsElem.innerHTML = '';
	quizObj.options.forEach((option, index) => {
		const input = document.createElement('input');
		input.type = 'radio';
		input.name = 'quizOption';
		input.value = index;
		input.id = `option${index}`;
		const label = document.createElement('label');
		label.htmlFor = `option${index}`;
		label.textContent = option;
		label.style.marginLeft = '5px';
		const div = document.createElement('div');
		div.classList.add('quiz-option');
		div.appendChild(input);
		div.appendChild(label);
		quizOptionsElem.appendChild(div);
	});
	quizArea.style.display = 'block';
	messageArea.textContent = '';
	messageArea.className = 'messageArea';
}

function displayQuiz() {
	const selectedPartId = taskSelect.value;
	S.currentQuizPart = linacPartsData.find((part) => part.id === selectedPartId);
	if (!S.currentQuizPart) {
		showMessage('Please select a valid part.', 'info');
		return;
	}
	S.quizMode = 'part';
	S.activeBonus = null;
	renderQuiz(S.currentQuizPart.quiz);
}

function displayBonusChallenge() {
	if (!S.allCorePartsEarned) {
		showMessage('Assemble the LINAC first.', 'info');
		return;
	}
	if (!S.bonusQuestionDeck.length) {
		S.bonusQuestionDeck = BONUS_QUESTIONS.map((_, i) => i);
		for (let i = S.bonusQuestionDeck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[S.bonusQuestionDeck[i], S.bonusQuestionDeck[j]] = [
				S.bonusQuestionDeck[j],
				S.bonusQuestionDeck[i]
			];
		}
	}
	S.activeBonus = BONUS_QUESTIONS[S.bonusQuestionDeck.pop()];
	S.quizMode = 'bonus';
	S.currentQuizPart = null;
	renderQuiz(S.activeBonus);
}

function handleSubmitAnswer() {
	const selectedOption = document.querySelector('input[name="quizOption"]:checked');
	if (!selectedOption) {
		showMessage('Please select an answer.', 'info');
		return;
	}
	const answerIndex = parseInt(selectedOption.value);

	if (S.quizMode === 'bonus') {
		if (!S.activeBonus) {
			quizArea.style.display = 'none';
			return;
		}
		if (answerIndex === S.activeBonus.correctAnswerIndex) {
			S.currentBalance += BONUS_REWARD;
			showMessage(`Correct! Continuing-education credit earned: +$${BONUS_REWARD}.`, 'correct');
			updateBalanceDisplay();
			populateEnhancementStore();
			saveGameState();
		} else {
			showMessage('Incorrect. Review the concept and try another challenge.', 'incorrect');
		}
		quizArea.style.display = 'none';
		S.activeBonus = null;
		return;
	}

	if (!S.currentQuizPart) {
		showMessage('No quiz active.', 'info');
		quizArea.style.display = 'none';
		return;
	}
	if (answerIndex === S.currentQuizPart.quiz.correctAnswerIndex) {
		showMessage(
			`Correct! You've earned the ${S.currentQuizPart.name} and $${S.currentQuizPart.cost}.`,
			'correct'
		);
		S.currentBalance += S.currentQuizPart.cost;
		S.earnedParts.push(S.currentQuizPart.id);
		if (S.currentQuizPart.threeJSObject) S.currentQuizPart.threeJSObject.visible = true;
		if (S.currentQuizPart.silhouetteObject) S.currentQuizPart.silhouetteObject.visible = false;
		linacPartsData
			.filter((p) => p.isSubComponent && p.parentPart === S.currentQuizPart.id)
			.forEach((subPart) => {
				if (subPart.threeJSObject) subPart.threeJSObject.visible = true;
			});
		updateBalanceDisplay();
		populateTaskSelect();
		populateEnhancementStore();
		saveGameState();
	} else {
		showMessage('Incorrect. Try again.', 'incorrect');
	}
	quizArea.style.display = 'none';
	S.currentQuizPart = null;
}

function showMessage(msg, type = 'info') {
	messageArea.textContent = msg;
	messageArea.className = 'messageArea';
	if (type === 'correct') messageArea.classList.add('message-correct');
	else if (type === 'incorrect') messageArea.classList.add('message-incorrect');
	else messageArea.classList.add('message-info');
}

function populateEnhancementStore() {
	enhancementStoreElem.innerHTML = '';
	const ownedCount = enhancementsData.filter((e) => S.purchasedEnhancements.includes(e.id)).length;
	const total = enhancementsData.length;

	const progress = document.createElement('div');
	progress.style.cssText = 'margin-bottom:10px; font-weight:bold;';
	progress.textContent = `Systems installed: ${ownedCount} / ${total}`;
	enhancementStoreElem.appendChild(progress);

	if (!S.allCorePartsEarned) {
		const note = document.createElement('p');
		note.style.cssText = 'color:#a94442; margin:0 0 10px;';
		note.textContent = 'Assemble the full LINAC (Assembly tab) to unlock the store.';
		enhancementStoreElem.appendChild(note);
	} else if (ownedCount === total) {
		const win = document.createElement('div');
		win.style.cssText =
			'background:#dff0d8; color:#3c763d; border:1px solid #b2dba1; border-radius:6px; padding:10px; margin-bottom:12px; font-weight:bold; text-align:center;';
		win.textContent = '🏆 Fully operational LINAC! Every system is installed — congratulations.';
		enhancementStoreElem.appendChild(win);
	} else {
		const tip = document.createElement('p');
		tip.style.cssText = 'color:#31708f; margin:0 0 10px; font-size:0.85em;';
		tip.textContent =
			'Tip: earn more credits any time with Continuing-Ed Challenges on the Assembly tab.';
		enhancementStoreElem.appendChild(tip);
	}

	const categories = [
		{ type: 'movement', label: 'Movement Systems' },
		{ type: 'operational', label: 'Operational Systems' }
	];
	categories.forEach((cat) => {
		const items = enhancementsData.filter((e) => e.type === cat.type);
		if (!items.length) return;
		const heading = document.createElement('h4');
		heading.textContent = cat.label;
		heading.style.cssText =
			'margin:12px 0 6px; color:#4a90e2; border-bottom:1px solid #ddd; padding-bottom:3px;';
		enhancementStoreElem.appendChild(heading);
		items.forEach((enh) => {
			const owned = S.purchasedEnhancements.includes(enh.id);
			const itemDiv = document.createElement('div');
			itemDiv.classList.add('store-item');
			let canPurchase = true;
			if (!S.allCorePartsEarned) canPurchase = false;
			if (owned) canPurchase = false;
			else if (S.currentBalance < enh.cost) canPurchase = false;
			itemDiv.innerHTML = `<h4>${enh.name} - $${enh.cost} ${owned ? "<span style='color:green;'>(Owned)</span>" : ''}</h4><p>${enh.description}</p>`;
			const purchaseButton = document.createElement('button');
			purchaseButton.textContent = owned ? 'Purchased' : `Purchase ($${enh.cost})`;
			purchaseButton.disabled = !canPurchase || owned;
			if (purchaseButton.disabled && !owned) {
				let title = '';
				if (!S.allCorePartsEarned) title += 'Assemble LINAC first. ';
				if (S.currentBalance < enh.cost) title += 'Not enough funds.';
				purchaseButton.title = title.trim();
			}
			purchaseButton.onclick = () => purchaseEnhancement(enh.id);
			itemDiv.appendChild(purchaseButton);
			enhancementStoreElem.appendChild(itemDiv);
		});
	});
}

function purchaseEnhancement(enhId) {
	const enhancement = enhancementsData.find((e) => e.id === enhId);
	if (!enhancement) return;
	if (S.purchasedEnhancements.includes(enhId)) {
		showMessage('Already owned.', 'info');
		return;
	}
	if (!S.allCorePartsEarned) {
		showMessage('Assemble the LINAC first.', 'info');
		return;
	}
	if (S.currentBalance >= enhancement.cost) {
		S.currentBalance -= enhancement.cost;
		S.purchasedEnhancements.push(enhId);
		enableMovementControl(enhId, true);
		showMessage(`Purchased ${enhancement.name}!`, 'correct');
		updateBalanceDisplay();
		populateEnhancementStore();
		saveGameState();
		if (enhancementsData.every((e) => S.purchasedEnhancements.includes(e.id))) {
			showMessage('🏆 All systems installed — your LINAC is fully operational!', 'correct');
		}
	} else {
		showMessage('Not enough funds.', 'incorrect');
	}
}

function enableMovementControl(enhId, isEnabled) {
	switch (enhId) {
		case 'gantryRotation':
			gantryRotatePlusButton.disabled = !isEnabled;
			gantryRotateMinusButton.disabled = !isEnabled;
			break;
		case 'couchVertical':
			couchUpButton.disabled = !isEnabled;
			couchDownButton.disabled = !isEnabled;
			break;
		case 'couchLongitudinal':
			couchInButton.disabled = !isEnabled;
			couchOutButton.disabled = !isEnabled;
			break;
		case 'couchLateral':
			couchLeftButton.disabled = !isEnabled;
			couchRightButton.disabled = !isEnabled;
			break;
		case 'couchRotation':
			[
				couchRollPlusButton,
				couchRollMinusButton,
				couchPitchPlusButton,
				couchPitchMinusButton,
				couchYawPlusButton,
				couchYawMinusButton,
				couchTreatmentAnglePlusButton,
				couchTreatmentAngleMinusButton
			].forEach((b) => {
				if (b) b.disabled = !isEnabled;
			});
			break;
		case 'collimatorJaws':
			[
				jawsOpenButton,
				jawsCloseButton,
				jawX1InButton,
				jawX1OutButton,
				jawX2InButton,
				jawX2OutButton,
				jawY1InButton,
				jawY1OutButton,
				jawY2InButton,
				jawY2OutButton
			].forEach((b) => {
				if (b) b.disabled = !isEnabled;
			});
			if (S.jawXN) [S.jawXN, S.jawXP, S.jawYN, S.jawYP].forEach((j) => (j.visible = isEnabled));
			break;
		case 'imagingPanel':
			// Enabling/disabling availability must not deploy, retract, or rotate imaging hardware.
			detectorToggleButton.disabled = !isEnabled;
			kvToggleButton.disabled = !isEnabled;
			break;
		case 'beamDelivery':
			beamOnButton.disabled = !isEnabled;
			if (!isEnabled) setBeamState(false);
			break;
		case 'alignmentLasers':
			lasersToggleButton.disabled = !isEnabled;
			if (!isEnabled) setLaserState(false);
			break;
	}
}

function saveGameState() {
	try {
		const gameState = {
			balance: S.currentBalance,
			parts: S.earnedParts,
			enhancements: S.purchasedEnhancements,
			allCorePartsEarned: S.allCorePartsEarned,
			jawOffset: S.jawOffset,
			jawX1: fundamentalState.jawX1,
			jawX2: fundamentalState.jawX2,
			jawY1: fundamentalState.jawY1,
			jawY2: fundamentalState.jawY2
		};
		localStorage.setItem('linacGameState_v4', JSON.stringify(gameState));
	} catch (e) {
		console.error('Save failed:', e);
	}
}

function loadGameState() {
	try {
		const savedState = localStorage.getItem('linacGameState_v4');
		if (savedState) {
			const gameState = JSON.parse(savedState);
			S.currentBalance = gameState.balance || 0;
			S.earnedParts = gameState.parts || [];
			S.purchasedEnhancements = gameState.enhancements || [];
			S.allCorePartsEarned = gameState.allCorePartsEarned || false;
			S.jawOffset = gameState.jawOffset !== undefined ? gameState.jawOffset : 0.1;
			if (Number.isFinite(Number(gameState.jawX1))) {
				fundamentalState.jawX1 = Number(gameState.jawX1);
				fundamentalState.jawX2 = Number(gameState.jawX2);
				fundamentalState.jawY1 = Number(gameState.jawY1);
				fundamentalState.jawY2 = Number(gameState.jawY2);
				syncLegacyJawValue();
			} else setCenteredJawField(10, 10);
			// EPID always initializes in its physical docked/home position on page load.
			S.detectorExtended = false;
		}
	} catch (e) {
		console.error('Load failed:', e);
	}
	linacPartsData.forEach((partData) => {
		const isEarned = S.earnedParts.includes(partData.id);
		if (partData.threeJSObject) partData.threeJSObject.visible = isEarned;
		if (partData.silhouetteObject)
			partData.silhouetteObject.visible = !isEarned && !partData.isSubComponent;
		if (isEarned && partData.isSubComponent) {
			const parent = linacPartsData.find((p) => p.id === partData.parentPart);
			if (parent && S.earnedParts.includes(parent.id) && partData.threeJSObject)
				partData.threeJSObject.visible = true;
		}
	});
	S.purchasedEnhancements.forEach((enhId) => enableMovementControl(enhId, true));
	updateJawPositions();
	setDetectorStateGame(S.detectorExtended);
	checkAllCorePartsEarned();
}

function resetGame() {
	if (window.confirm('Reset all progress?')) {
		localStorage.removeItem('linacGameState_v4');
		localStorage.removeItem('linacFullyAssembledMessageShown_v2');
		S.currentBalance = 0;
		S.earnedParts = [];
		S.purchasedEnhancements = [];
		S.allCorePartsEarned = false;
		S.jawOffset = 0.1;
		setCenteredJawField(10, 10);
		S.detectorExtended = false;
		linacPartsData.forEach((partData) => {
			if (partData.threeJSObject) partData.threeJSObject.visible = false;
			if (partData.silhouetteObject) partData.silhouetteObject.visible = !partData.isSubComponent;
		});
		enhancementsData.forEach((enh) => enableMovementControl(enh.id, false));
		if (S.jawXN) [S.jawXN, S.jawXP, S.jawYN, S.jawYP].forEach((j) => (j.visible = false));
		setDetectorStateGame(false);
		setBeamState(false);
		setLaserState(false);
		setKvState(false);
		loadGameState();
		updateUI();
		showMessage('Game progress reset.', 'info');
	}
}

function updateUI() {
	updateBalanceDisplay();
	populateTaskSelect();
	populateEnhancementStore();
	quizArea.style.display = 'none';
	messageArea.textContent = '';
	messageArea.className = 'messageArea';
	updateCouchAccordion();
}

const ROTATION_STEP = Math.PI / 36;
const MOVEMENT_STEP = 0.1;
const fundamentalState = {
	gantry: 0,
	collimator: 0,
	jaw: 10,
	jawX1: 5,
	jawX2: 5,
	jawY1: 5,
	jawY2: 5,
	mlc: 10,
	mlcShape: 'Square',
	vrt: 0,
	lng: 0,
	lat: 0,
	roll: 0,
	pitch: 0,
	yaw: 0,
	couchAngle: 0
};
const JAW_EDGE_MIN_CM = 0.0,
	JAW_EDGE_MAX_CM = 12.5,
	JAW_EDGE_STEP_CM = 0.5;
function ensureJawState() {
	['jawX1', 'jawX2', 'jawY1', 'jawY2'].forEach((k) => {
		if (!Number.isFinite(Number(fundamentalState[k]))) fundamentalState[k] = 5;
	});
}
function jawDimensions() {
	ensureJawState();
	return {
		x: fundamentalState.jawX1 + fundamentalState.jawX2,
		y: fundamentalState.jawY1 + fundamentalState.jawY2
	};
}
function jawsAreCentered(tol = 0.001) {
	ensureJawState();
	return (
		Math.abs(fundamentalState.jawX1 - fundamentalState.jawX2) <= tol &&
		Math.abs(fundamentalState.jawY1 - fundamentalState.jawY2) <= tol
	);
}
function currentJawSpecString() {
	ensureJawState();
	return `X1 ${fundamentalState.jawX1.toFixed(1)} / X2 ${fundamentalState.jawX2.toFixed(1)} · Y1 ${fundamentalState.jawY1.toFixed(1)} / Y2 ${fundamentalState.jawY2.toFixed(1)} cm`;
}
function currentJawSummary() {
	const d = jawDimensions();
	return `${d.x.toFixed(1)} × ${d.y.toFixed(1)} cm`;
}
function syncLegacyJawValue() {
	const d = jawDimensions();
	fundamentalState.jaw = (d.x + d.y) / 2;
}
function setCenteredJawField(xCm, yCm = xCm) {
	fundamentalState.jawX1 = fundamentalState.jawX2 = Math.max(
		JAW_EDGE_MIN_CM,
		Math.min(JAW_EDGE_MAX_CM, Number(xCm) / 2)
	);
	fundamentalState.jawY1 = fundamentalState.jawY2 = Math.max(
		JAW_EDGE_MIN_CM,
		Math.min(JAW_EDGE_MAX_CM, Number(yCm) / 2)
	);
	syncLegacyJawValue();
	updateJawPositions();
}
function nudgeJawEdge(key, delta) {
	if (!requirePendantMotion('JAWS')) return;
	ensureJawState();
	fundamentalState[key] = Math.max(
		JAW_EDGE_MIN_CM,
		Math.min(JAW_EDGE_MAX_CM, Math.round((fundamentalState[key] + delta) * 2) / 2)
	);
	syncLegacyJawValue();
	updateJawPositions();
	saveGameState();
	syncFundamentalReadouts(
		`JAW ${key.replace('jaw', '').toUpperCase()}`,
		`${fundamentalState[key].toFixed(1)} cm`
	);
}
const wrap360 = (v) => ((v % 360) + 360) % 360;
const setTextById = (id, value) => {
	const el = document.getElementById(id);
	if (el) el.textContent = value;
};
function setPendantLCD(label, value) {
	setTextById('pendantLcdLabel', label);
	setTextById('pendantLcdValue', value);
}

function updateBEVInset() {
	if (!bevFieldGroup || !bevMlcLeaves || !bevJawMasks || !bevJawOutline) return;
	const cx = 120,
		cy = 120,
		pxPerCm = 4,
		x0 = 40,
		y0 = 40,
		span = 160,
		x1 = x0 + span,
		y1 = y0 + span;
	ensureJawState();
	const jawLeft = cx - fundamentalState.jawX1 * pxPerCm,
		jawRight = cx + fundamentalState.jawX2 * pxPerCm;
	const jawTop = cy - fundamentalState.jawY1 * pxPerCm,
		jawBottom = cy + fundamentalState.jawY2 * pxPerCm;
	const jawX = Math.max(x0, jawLeft),
		jawY = Math.max(y0, jawTop),
		jawPx = Math.max(4, Math.min(span, jawRight - jawLeft)),
		jawPy = Math.max(4, Math.min(span, jawBottom - jawTop));
	bevFieldGroup.setAttribute(
		'transform',
		`rotate(${wrap360(fundamentalState.collimator)} ${cx} ${cy})`
	);
	bevJawOutline.setAttribute('x', jawX);
	bevJawOutline.setAttribute('y', jawY);
	bevJawOutline.setAttribute('width', jawPx);
	bevJawOutline.setAttribute('height', jawPy);
	const activelyDelivering = !!(
		S.treatmentDelivery?.delivering &&
		!S.treatmentDelivery?.held &&
		!S.treatmentDelivery?.gateHeld
	);
	if (bevFieldLight) {
		bevFieldLight.setAttribute('x', jawX);
		bevFieldLight.setAttribute('y', jawY);
		bevFieldLight.setAttribute('width', jawPx);
		bevFieldLight.setAttribute('height', jawPy);
		bevFieldLight.setAttribute('opacity', activelyDelivering ? '.34' : '.14');
		bevFieldLight.setAttribute('stroke-width', activelyDelivering ? '2' : '1');
	}

	bevJawMasks.innerHTML = [
		`<rect x="${x0}" y="${y0}" width="${Math.max(0, jawX - x0)}" height="${span}"/>`,
		`<rect x="${jawX + jawPx}" y="${y0}" width="${Math.max(0, x1 - (jawX + jawPx))}" height="${span}"/>`,
		`<rect x="${jawX}" y="${y0}" width="${jawPx}" height="${Math.max(0, jawY - y0)}"/>`,
		`<rect x="${jawX}" y="${jawY + jawPy}" width="${jawPx}" height="${Math.max(0, y1 - (jawY + jawPy))}"/>`
	].join('');

	const makeLeafGeometry = (aperture, shape) => {
		const leaves = 20,
			rowH = span / leaves,
			baseHalf = (aperture * pxPerCm) / 2;
		const rows = [];
		for (let i = 0; i < leaves; i++) {
			const t = (i - (leaves - 1) / 2) / ((leaves - 1) / 2);
			let halfGap = baseHalf;
			if (shape === 'Conformal')
				halfGap = baseHalf * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - t * t)));
			const shift = shape === 'Asymmetric' ? 10 : 0;
			rows.push({
				y: y0 + i * rowH + 0.5,
				h: Math.max(2, rowH - 1),
				left: cx - halfGap + shift,
				right: cx + halfGap + shift
			});
		}
		return rows;
	};
	const actualRows = makeLeafGeometry(Number(fundamentalState.mlc) || 0, fundamentalState.mlcShape);
	bevMlcLeaves.innerHTML = actualRows
		.map(
			(r) =>
				`<rect x="${x0}" y="${r.y.toFixed(2)}" width="${Math.max(0, r.left - x0).toFixed(2)}" height="${r.h.toFixed(2)}" rx="1" fill="#487d84" stroke="#76aab0" stroke-width=".35" opacity=".92"/>` +
				`<rect x="${r.right.toFixed(2)}" y="${r.y.toFixed(2)}" width="${Math.max(0, x1 - r.right).toFixed(2)}" height="${r.h.toFixed(2)}" rx="1" fill="#487d84" stroke="#76aab0" stroke-width=".35" opacity=".92"/>`
		)
		.join('');

	const field = S.activeTreatmentCase ? deliveryCasePlan() : null;
	const planned = S.activeTreatmentCase ? getCurrentPlannedParameters() : null;
	const planGroup = document.getElementById('bevPlanGroup');
	const planJaw = document.getElementById('bevPlannedJawOutline');
	const planMlc = document.getElementById('bevPlannedMlcContour');
	if (field && planned) {
		const pColl = normalizeAngleValue(planned.collimator) ?? 0;
		planGroup?.setAttribute('transform', `rotate(${pColl} ${cx} ${cy})`);
		const jp = parseJawSpec(planned.jaws) || {
			x1: fundamentalState.jawX1,
			x2: fundamentalState.jawX2,
			y1: fundamentalState.jawY1,
			y2: fundamentalState.jawY2
		};
		const pLeft = cx - jp.x1 * pxPerCm,
			pTop = cy - jp.y1 * pxPerCm,
			pJawW = Math.max(4, Math.min(160, (jp.x1 + jp.x2) * pxPerCm)),
			pJawH = Math.max(4, Math.min(160, (jp.y1 + jp.y2) * pxPerCm));
		if (planJaw) {
			planJaw.setAttribute('x', pLeft);
			planJaw.setAttribute('y', pTop);
			planJaw.setAttribute('width', pJawW);
			planJaw.setAttribute('height', pJawH);
			planJaw.style.display = '';
		}
		const pAperture = parseFirstNumber(planned.mlcAperture) ?? fundamentalState.mlc;
		const pShape = String(planned.mlcShape || 'Square');
		const pRows = makeLeafGeometry(pAperture, pShape);
		const leftPts = pRows
			.map((r) => `${r.left.toFixed(1)},${(r.y + r.h / 2).toFixed(1)}`)
			.join(' ');
		const rightPts = pRows
			.map((r) => `${r.right.toFixed(1)},${(r.y + r.h / 2).toFixed(1)}`)
			.join(' ');
		if (planMlc)
			planMlc.innerHTML = `<polyline points="${leftPts}" fill="none" stroke="#55d6e9" stroke-width="1.4" stroke-dasharray="3 2"/><polyline points="${rightPts}" fill="none" stroke="#55d6e9" stroke-width="1.4" stroke-dasharray="3 2"/>`;
		if (planGroup) planGroup.style.display = '';
	} else if (planGroup) {
		planGroup.style.display = 'none';
	}

	const actual = getTreatmentMonitorActual();
	const fieldKeys = field?.electron
		? ['gantry', 'collimator', 'jaws', 'couchAngle']
		: ['gantry', 'collimator', 'jaws', 'mlcAperture', 'mlcShape', 'couchAngle'];
	const geomMatch =
		!!planned &&
		fieldKeys.every((k) => treatmentParamMatches(k, planned[k], actual[k])) &&
		specialSetupVerified();
	const accessory = document.getElementById('bevAccessoryOverlay');
	if (accessory) {
		const s = activeSpecialSetupSpec();
		if (field?.electron && String(s?.type || '').toUpperCase() === 'ELECTRON') {
			const e = S.specialSetupWorkflow.electron || {},
				w = (Number(e.width) || Number(s.widthCm) || 6) * pxPerCm,
				h = (Number(e.height) || Number(s.heightCm) || 4) * pxPerCm,
				shape = String(e.shape || s.shape || 'Oval'),
				stroke = S.specialSetupWorkflow.verified ? '#6df0a3' : '#ffd36b';
			accessory.innerHTML =
				shape === 'Rectangle'
					? `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-width="2.2"/>`
					: `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="none" stroke="${stroke}" stroke-width="2.2"/>`;
		} else accessory.innerHTML = '';
	}
	const fieldChip = document.getElementById('bevFieldChip'),
		matchChip = document.getElementById('bevMatchChip');
	fieldChip?.classList.toggle('good', !!field);
	fieldChip?.classList.remove('bad');
	matchChip?.classList.toggle('good', !!field && geomMatch);
	matchChip?.classList.toggle('bad', !!field && !geomMatch);

	const planG = planned ? monitorPlannedDisplay('gantry', planned.gantry) : '—';
	const planC = planned ? monitorPlannedDisplay('collimator', planned.collimator) : '—';
	const planT = planned ? monitorPlannedDisplay('couchAngle', planned.couchAngle || '0°') : '—';
	setTextById(
		'bevFieldNameLabel',
		field ? `${field.field} · ${S.activeTreatmentCase.siteLabel}` : 'NO FIELD'
	);
	setTextById('bevFieldValue', field ? field.field : 'No field');
	const bevDyn = field ? getDynamicFieldState(field, deliveryProgressFraction(field)) : null;
	const bevDynText =
		field && field.mode === 'VMAT' && bevDyn?.arc
			? ` · ${bevDyn.arc.direction} · CP ${bevDyn.controlPointIndex + 1}/${bevDyn.controlPointCount}`
			: field && field.mode === 'IMRT'
				? ` · IMRT CP ${bevDyn.controlPointIndex + 1}/${bevDyn.controlPointCount}`
				: '';
	setTextById(
		'bevFieldPlan',
		field ? `Plan G ${planG} · C ${planC} · T ${planT}${bevDynText}` : 'Load a patient plan'
	);
	setTextById('bevMatchValue', field ? (geomMatch ? 'MATCH' : 'MISMATCH') : 'Machine view');
	setTextById(
		'bevJawPlan',
		planned ? `Plan ${monitorPlannedDisplay('jaws', planned.jaws)}` : 'Plan —'
	);
	setTextById(
		'bevMlcPlan',
		planned
			? `Plan ${monitorPlannedDisplay('mlcAperture', planned.mlcAperture)} · ${planned.mlcShape}`
			: 'Plan —'
	);

	let beamState = 'STANDBY',
		beamClass = '';
	if (S.treatmentCompletion?.posted) {
		beamState = 'SESSION COMPLETE';
		beamClass = 'complete';
	} else if (S.treatmentDelivery?.completed) {
		beamState = allTreatmentFieldsCompleted() ? 'ALL FIELDS COMPLETE' : 'FIELD COMPLETE';
		beamClass = 'complete';
	} else if (S.treatmentDelivery?.terminated) {
		beamState = 'TERMINATED';
		beamClass = 'hold';
	} else if (S.treatmentDelivery?.delivering && S.treatmentDelivery?.held) {
		beamState = 'BEAM HOLD';
		beamClass = 'hold';
	} else if (S.treatmentDelivery?.delivering && S.treatmentDelivery?.gateHeld) {
		beamState = 'GATE HOLD';
		beamClass = 'hold';
	} else if (activelyDelivering) {
		beamState = 'BEAM ON';
		beamClass = 'beam-on';
	} else if (S.treatmentDelivery?.armed) {
		beamState = 'BEAM ENABLED';
	} else if (field && geomMatch) {
		beamState = 'FIELD GEOMETRY MATCH';
	} else if (field) {
		beamState = 'SETUP HOLD';
		beamClass = 'hold';
	}
	setTextById('bevBeamStateLabel', beamState);
	const stateEl = document.getElementById('bevDeliveryState');
	if (stateEl) {
		stateEl.textContent = beamState;
		stateEl.className = beamClass;
	}

	const total = field ? Number(field.mu) || 0 : 0;
	const delivered = field ? Math.min(total, Number(S.treatmentDelivery?.muDelivered) || 0) : 0;
	const pct = total ? Math.max(0, Math.min(100, (delivered / total) * 100)) : 0;
	const progress = document.getElementById('bevProgressBar');
	if (progress) progress.style.width = `${pct}%`;
	setTextById(
		'bevMUValue',
		field ? `${delivered.toFixed(1)} / ${total.toFixed(1)} MU` : '0.0 / 0.0 MU'
	);

	setTextById(
		'bevHeaderStatus',
		field
			? `${field.field} · G${wrap360(fundamentalState.gantry)}° · C${wrap360(fundamentalState.collimator)}° · T${wrap360(fundamentalState.couchAngle || 0)}°`
			: `G${wrap360(fundamentalState.gantry)}° · C${wrap360(fundamentalState.collimator)}° · T${wrap360(fundamentalState.couchAngle || 0)}°`
	);
	setTextById('bevGantryLabel', `Gantry ${wrap360(fundamentalState.gantry)}°`);
	setTextById('bevCollLabel', `Coll ${wrap360(fundamentalState.collimator)}°`);
	setTextById('bevJawValue', jawsAreCentered() ? currentJawSummary() : currentJawSpecString());
	setTextById('bevMlcValue', `${fundamentalState.mlc} cm · ${fundamentalState.mlcShape}`);
}
bevCollapseButton?.addEventListener('click', () => {
	const collapsed = bevInset?.classList.toggle('collapsed');
	if (bevCollapseButton) {
		bevCollapseButton.textContent = collapsed ? '+' : '−';
		bevCollapseButton.setAttribute(
			'aria-label',
			collapsed ? "Expand beam's eye view" : "Collapse beam's eye view"
		);
	}
});

function syncFundamentalReadouts(label, value) {
	// Mechanical controls may move the gantry/couch/head, but the EPID extension
	// state is independent and remains exactly where the MV key commanded it.
	applyDetectorCommandedPose();
	setTextById('pendantGantryReadout', `${wrap360(fundamentalState.gantry)}°`);
	setTextById('pendantCollimatorReadout', `${wrap360(fundamentalState.collimator)}°`);
	setTextById('pendantJawReadout', currentJawSummary());
	setTextById('jawX1Readout', `${fundamentalState.jawX1.toFixed(1)} cm`);
	setTextById('jawX2Readout', `${fundamentalState.jawX2.toFixed(1)} cm`);
	setTextById('jawY1Readout', `${fundamentalState.jawY1.toFixed(1)} cm`);
	setTextById('jawY2Readout', `${fundamentalState.jawY2.toFixed(1)} cm`);
	setTextById('pendantMLCReadout', `${fundamentalState.mlc} cm`);
	if (mlcShapeButton) {
		const shapeLabel =
			fundamentalState.mlcShape.charAt(0).toUpperCase() + fundamentalState.mlcShape.slice(1);
		const small = mlcShapeButton.querySelector('small');
		if (small) small.textContent = shapeLabel;
		else mlcShapeButton.textContent = `Shape: ${shapeLabel}`;
	}
	setTextById(
		'pendantVrtReadout',
		`${fundamentalState.vrt > 0 ? '+' : ''}${fundamentalState.vrt} mm`
	);
	setTextById(
		'pendantLngReadout',
		`${fundamentalState.lng > 0 ? '+' : ''}${fundamentalState.lng} mm`
	);
	setTextById(
		'pendantLatReadout',
		`${fundamentalState.lat > 0 ? '+' : ''}${fundamentalState.lat} mm`
	);
	setTextById(
		'pendantRollReadout',
		`${fundamentalState.roll > 0 ? '+' : ''}${fundamentalState.roll.toFixed(1)}°`
	);
	setTextById(
		'pendantPitchReadout',
		`${fundamentalState.pitch > 0 ? '+' : ''}${fundamentalState.pitch.toFixed(1)}°`
	);
	setTextById(
		'pendantYawReadout',
		`${fundamentalState.yaw > 0 ? '+' : ''}${fundamentalState.yaw.toFixed(1)}°`
	);
	setTextById('pendantCouchAngleReadout', `${wrap360(fundamentalState.couchAngle || 0)}°`);
	setTextById('hudGantry', `${wrap360(fundamentalState.gantry)}°`);
	setTextById('hudCollimator', `${wrap360(fundamentalState.collimator)}°`);
	setTextById('hudField', currentJawSummary());
	setTextById('hudMLC', `${fundamentalState.mlc} cm · ${fundamentalState.mlcShape}`);
	updateBEVInset();
	updateODIReadout();
	setTextById(
		'hudCouch',
		`${fundamentalState.vrt} / ${fundamentalState.lng} / ${fundamentalState.lat} mm`
	);
	renderTreatmentMonitor();
	if (S.clinicalIGRT?.active) renderClinicalIGRT();
	if (srsRequired()) renderSRSPanel();
	if (label) setPendantLCD(label, value || 'Ready');
}
function captureCollisionPose() {
	return {
		gantryZ: S.gantryRotatingGroup ? S.gantryRotatingGroup.rotation.z : 0,
		couchPos: S.couchGroup ? S.couchGroup.position.clone() : null,
		couchTreatmentRot: S.couchTreatmentPivot ? S.couchTreatmentPivot.rotation.clone() : null,
		topPos: S.couchTopGroup ? S.couchTopGroup.position.clone() : null,
		topRot: S.couchTopGroup ? S.couchTopGroup.rotation.clone() : null
	};
}
function restoreCollisionPose(p) {
	if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z = p.gantryZ;
	if (S.couchGroup && p.couchPos) S.couchGroup.position.copy(p.couchPos);
	if (S.couchTreatmentPivot && p.couchTreatmentRot)
		S.couchTreatmentPivot.rotation.copy(p.couchTreatmentRot);
	if (S.couchTopGroup && p.topPos) S.couchTopGroup.position.copy(p.topPos);
	if (S.couchTopGroup && p.topRot) S.couchTopGroup.rotation.copy(p.topRot);
	updateCouchAccordion();
	S.scene?.updateMatrixWorld(true);
	updateODIReadout();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function getCouchClearanceBox() {
	if (!S.couchTopGroup) return null;
	S.scene.updateMatrixWorld(true);
	// Retained for diagnostics/legacy callers. Collision decisions below intentionally
	// use per-mesh volumes instead of this single union box because a union AABB can
	// falsely fill empty space between the patient, rails, tray and tabletop at oblique angles.
	return new THREE.Box3().setFromObject(S.couchTopGroup);
}
function getCouchClearanceVolumes() {
	if (!S.couchTopGroup || !S.scene) return [];
	S.scene.updateMatrixWorld(true);
	const volumes = [];
	S.couchTopGroup.traverse((obj) => {
		if (!obj || !obj.isMesh || obj.visible === false || !obj.geometry) return;
		// Use each mesh's LOCAL bounding box rather than a world-axis-aligned Box3.
		// The proxy point is transformed into mesh-local coordinates during clearance
		// evaluation, so couch/patient rotations do not artificially inflate the volume.
		if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
		const box = obj.geometry.boundingBox?.clone();
		if (!box || box.isEmpty()) return;
		const scale = new THREE.Vector3();
		obj.getWorldScale(scale);
		const minScale = Math.max(
			1e-6,
			Math.min(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z))
		);
		volumes.push({ obj, box, minScale, name: obj.name || 'couch/patient' });
	});
	return volumes;
}
function clearanceToProxy(volumes, point, radius, reason) {
	if (!Array.isArray(volumes) || !volumes.length) return { margin: Infinity, reason };
	let minDistance = Infinity;
	for (const v of volumes) {
		if (v?.obj && v?.box) {
			const localPoint = v.obj.worldToLocal(point.clone());
			const localDistance = v.box.distanceToPoint(localPoint);
			minDistance = Math.min(minDistance, localDistance * (v.minScale || 1));
		} else {
			const b = v?.box || v;
			if (b && !b.isEmpty()) minDistance = Math.min(minDistance, b.distanceToPoint(point));
		}
	}
	return { margin: minDistance - radius, reason };
}
function getCollisionAssessment() {
	const volumes = getCouchClearanceVolumes();
	if (!volumes.length || !S.gantryRotatingGroup) return { margin: Infinity, reason: '' };
	const checks = [];

	// Physical treatment-head proxies only. Do NOT include beam cones, ODI rays,
	// MLC teaching overlays, or other non-solid descendants in the collision envelope.
	if (S.linacHeadObject) {
		const physicalHead = [
			{ p: new THREE.Vector3(0, 0.04, 0), r: 0.4, reason: 'Treatment head drum clearance' },
			{ p: new THREE.Vector3(0, -0.34, 0), r: 0.32, reason: 'Collimator housing clearance' },
			{ p: new THREE.Vector3(0, -0.5, 0), r: 0.2, reason: 'Treatment head aperture clearance' }
		];
		physicalHead.forEach((c) => {
			const world = S.linacHeadObject.localToWorld(c.p.clone());
			checks.push(clearanceToProxy(volumes, world, c.r, c.reason));
		});
		if (S.electronApplicatorGroup?.visible) {
			const coneScale = Math.max(
				Math.abs(S.electronApplicatorGroup.scale.x || 1),
				Math.abs(S.electronApplicatorGroup.scale.z || 1)
			);
			const electronCone = [
				{
					p: new THREE.Vector3(0, -0.6, 0),
					r: 0.105 * coneScale,
					reason: 'Electron cone trimmer clearance'
				},
				{
					p: new THREE.Vector3(0, -0.82, 0),
					r: 0.12 * coneScale,
					reason: 'Electron cone distal frame clearance'
				}
			];
			electronCone.forEach((c) => {
				const world = S.linacHeadObject.localToWorld(
					c.p.clone().add(S.electronApplicatorGroup.position)
				);
				checks.push(clearanceToProxy(volumes, world, c.r, c.reason));
			});
		}
	}

	// Accelerator housing / gantry arm. These radii track the visible solids closely
	// enough for teaching while intentionally leaving normal 0/90/180/270 setups usable.
	const housingSamples = [
		{ p: [0, 1.02, 0.08], r: 0.23, reason: 'Forward gantry nose clearance' },
		{ p: [0, 1.02, -0.35], r: 0.27, reason: 'Accelerator housing clearance' },
		{ p: [0, 1.02, -0.8], r: 0.27, reason: 'Accelerator housing clearance' },
		{ p: [0, 1.02, -1.2], r: 0.27, reason: 'Accelerator housing clearance' },
		{ p: [0, 0.62, -1.3], r: 0.3, reason: 'Gantry knee clearance' }
	];
	housingSamples.forEach((c) => {
		const world = S.gantryRotatingGroup.localToWorld(new THREE.Vector3(...c.p));
		checks.push(clearanceToProxy(volumes, world, c.r, c.reason));
	});

	if (!checks.length) return { margin: Infinity, reason: '' };
	checks.sort((a, b) => a.margin - b.margin);
	return checks[0];
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function detectCouchGantryCollision() {
	const a = getCollisionAssessment();
	return a.margin < 0 ? a.reason : null;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function setSafetyHUD(blocked, reason = '') {
	const item = document.getElementById('hudSafetyItem');
	setTextById('hudSafety', blocked ? 'BLOCKED' : 'CLEAR');
	if (item) {
		item.classList.toggle('safety-blocked', blocked);
		item.classList.toggle('safety-clear', !blocked);
	}
	const lamp = document.getElementById('pendantReadyLamp');
	if (lamp) {
		lamp.textContent = blocked ? 'INTERLOCK' : 'READY';
		lamp.style.color = blocked ? '#ff8d8d' : '';
		lamp.style.borderColor = blocked ? '#8c3e46' : '';
		lamp.style.background = blocked ? '#35151a' : '';
	}
}
function showCollisionBlocked(reason) {
	setSafetyHUD(true, reason);
	setPendantLCD('COLLISION INTERLOCK', `BLOCKED · ${reason}`);
	const b = document.getElementById('collisionBanner');
	if (b) {
		b.textContent = `COLLISION BLOCKED · ${reason}`;
		b.classList.add('show');
		clearTimeout(S.collisionBannerTimer);
		S.collisionBannerTimer = setTimeout(() => {
			b.classList.remove('show');
			setSafetyHUD(false);
		}, 1800);
	}
}
function attemptCollisionSafeMotion(label, mutator) {
	const pose = captureCollisionPose();
	S.scene?.updateMatrixWorld(true);
	const before = getCollisionAssessment();
	mutator();
	S.scene?.updateMatrixWorld(true);
	const after = getCollisionAssessment();

	// Block entry into a collision zone, or motion that makes an existing overlap worse.
	// If a pose somehow begins inside the teaching proxy, movement that INCREASES
	// clearance is always permitted so the learner can back the couch/gantry out.
	// Allow ~2.5 cm of numerical proxy tolerance so the teaching interlock does not
	// trip on near-tangent bounding geometry that would still be visibly clear onscreen.
	const collisionTolerance = 0.025;
	const enteredCollision =
		before.margin >= -collisionTolerance && after.margin < -collisionTolerance;
	const worsenedCollision =
		before.margin < -collisionTolerance && after.margin < before.margin - 0.002;
	if (enteredCollision || worsenedCollision) {
		restoreCollisionPose(pose);
		showCollisionBlocked(after.reason || 'Machine clearance');
		return false;
	}
	setSafetyHUD(false);
	updateODIReadout();
	return true;
}

function setPendantMotionArmed(on) {
	S.pendantMotionArmed = !!on;
	if (pendantMotionEnable)
		pendantMotionEnable.setAttribute('aria-pressed', String(S.pendantMotionArmed));
	const status = document.getElementById('headerMotionStatus');
	if (status) {
		status.textContent = S.pendantMotionArmed ? 'Motion armed' : 'Motion locked';
		status.classList.toggle('armed', S.pendantMotionArmed);
		status.classList.toggle('locked', !S.pendantMotionArmed);
	}
	setPendantLCD(
		'MOTION ENABLE',
		S.pendantMotionArmed ? 'ARMED · geometry enabled' : 'LOCKED · squeeze enable'
	);
	if (typeof renderTreatmentDeliveryPanel === 'function') renderTreatmentDeliveryPanel();
	syncOperatorConsole();
}
function requirePendantMotion(controlName) {
	if (S.pendantMotionArmed || S.consoleMotionArmed) return true;
	setPendantLCD(controlName || 'MOTION', 'LOCKED · enable motion first');
	if (S.currentRoomView === 'control' && consoleMotionEnable?.animate)
		consoleMotionEnable.animate(
			[
				{ transform: 'translateX(0)' },
				{ transform: 'translateX(-3px)' },
				{ transform: 'translateX(3px)' },
				{ transform: 'translateX(0)' }
			],
			{ duration: 220 }
		);
	else if (pendantMotionEnable?.animate)
		pendantMotionEnable.animate(
			[
				{ transform: 'translateX(0)' },
				{ transform: 'translateX(-3px)' },
				{ transform: 'translateX(3px)' },
				{ transform: 'translateX(0)' }
			],
			{ duration: 220 }
		);
	return false;
}
pendantMotionEnable?.addEventListener('click', () => setPendantMotionArmed(!S.pendantMotionArmed));
// Room/imaging function keys must not alter mechanical geometry. Capture and restore
// gantry/collimator/couch state around each function action as a defensive interlock.
function captureMechanicalGeometryState() {
	return {
		gantryState: fundamentalState.gantry,
		collimatorState: fundamentalState.collimator,
		couchState: {
			vrt: fundamentalState.vrt,
			lng: fundamentalState.lng,
			lat: fundamentalState.lat,
			roll: fundamentalState.roll,
			pitch: fundamentalState.pitch,
			yaw: fundamentalState.yaw,
			couchAngle: fundamentalState.couchAngle
		},
		gantryZ: S.gantryRotatingGroup ? S.gantryRotatingGroup.rotation.z : null,
		headY: S.linacHeadObject ? S.linacHeadObject.rotation.y : null,
		couchPos: S.couchGroup ? S.couchGroup.position.clone() : null,
		couchTreatmentRot: S.couchTreatmentPivot ? S.couchTreatmentPivot.rotation.clone() : null,
		couchTopPos: S.couchTopGroup ? S.couchTopGroup.position.clone() : null,
		couchTopRot: S.couchTopGroup ? S.couchTopGroup.rotation.clone() : null
	};
}
function restoreMechanicalGeometryState(s) {
	if (!s) return;
	fundamentalState.gantry = s.gantryState;
	fundamentalState.collimator = s.collimatorState;
	Object.assign(fundamentalState, s.couchState);
	if (S.gantryRotatingGroup && s.gantryZ !== null) S.gantryRotatingGroup.rotation.z = s.gantryZ;
	if (S.linacHeadObject && s.headY !== null) S.linacHeadObject.rotation.y = s.headY;
	if (S.couchGroup && s.couchPos) S.couchGroup.position.copy(s.couchPos);
	if (S.couchTreatmentPivot && s.couchTreatmentRot)
		S.couchTreatmentPivot.rotation.copy(s.couchTreatmentRot);
	if (S.couchTopGroup && s.couchTopPos) S.couchTopGroup.position.copy(s.couchTopPos);
	if (S.couchTopGroup && s.couchTopRot) S.couchTopGroup.rotation.copy(s.couchTopRot);
	updateCouchAccordion();
}
function runFunctionKeyIsolated(action) {
	const mech = captureMechanicalGeometryState();
	action();
	restoreMechanicalGeometryState(mech);
	syncFundamentalReadouts();
}
gantryRotatePlusButton.addEventListener('click', () => {
	if (!requirePendantMotion('GANTRY')) return;
	const ok = attemptCollisionSafeMotion('GANTRY', () => {
		if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z -= ROTATION_STEP;
	});
	if (!ok) return;
	fundamentalState.gantry = wrap360(fundamentalState.gantry + 5);
	syncFundamentalReadouts('GANTRY', `${fundamentalState.gantry}°`);
});
gantryRotateMinusButton.addEventListener('click', () => {
	if (!requirePendantMotion('GANTRY')) return;
	const ok = attemptCollisionSafeMotion('GANTRY', () => {
		if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z += ROTATION_STEP;
	});
	if (!ok) return;
	fundamentalState.gantry = wrap360(fundamentalState.gantry - 5);
	syncFundamentalReadouts('GANTRY', `${fundamentalState.gantry}°`);
});
collimatorRotatePlusButton?.addEventListener('click', () => {
	if (!requirePendantMotion('COLLIMATOR')) return;
	fundamentalState.collimator = wrap360(fundamentalState.collimator + 5);
	if (S.linacHeadObject)
		S.linacHeadObject.rotation.y = (fundamentalState.collimator * Math.PI) / 180;
	syncFundamentalReadouts('COLLIMATOR', `${fundamentalState.collimator}°`);
});
collimatorRotateMinusButton?.addEventListener('click', () => {
	if (!requirePendantMotion('COLLIMATOR')) return;
	fundamentalState.collimator = wrap360(fundamentalState.collimator - 5);
	if (S.linacHeadObject)
		S.linacHeadObject.rotation.y = (fundamentalState.collimator * Math.PI) / 180;
	syncFundamentalReadouts('COLLIMATOR', `${fundamentalState.collimator}°`);
});
const imgCouch = (axis, d) => {
	if (window.clinicalIGRTCouchShift) window.clinicalIGRTCouchShift(axis, d);
	if (!window.clinicalIGRTActive && window.imagingCouchShift)
		return window.imagingCouchShift(axis, d);
	return false;
};
couchUpButton.addEventListener('click', () => {
	if (!requirePendantMotion('COUCH VERTICAL')) return;
	const ok = attemptCollisionSafeMotion('COUCH VERTICAL', () => {
		if (S.couchGroup) {
			S.couchGroup.position.y += MOVEMENT_STEP;
			updateCouchAccordion();
		}
	});
	if (!ok) return;
	fundamentalState.vrt += 1;
	imgCouch('vrt', 1);
	syncFundamentalReadouts(
		'COUCH VERTICAL',
		`${fundamentalState.vrt > 0 ? '+' : ''}${fundamentalState.vrt} mm`
	);
});
couchDownButton.addEventListener('click', () => {
	if (!requirePendantMotion('COUCH VERTICAL')) return;
	const couchBaseHeightRef = 0.7,
		minY = couchBaseHeightRef / 2 + GROUND_Y;
	const ok = attemptCollisionSafeMotion('COUCH VERTICAL', () => {
		if (S.couchGroup) {
			S.couchGroup.position.y = Math.max(minY, S.couchGroup.position.y - MOVEMENT_STEP);
			updateCouchAccordion();
		}
	});
	if (!ok) return;
	fundamentalState.vrt -= 1;
	imgCouch('vrt', -1);
	syncFundamentalReadouts('COUCH VERTICAL', `${fundamentalState.vrt} mm`);
});
couchInButton.addEventListener('click', () => {
	if (!requirePendantMotion('COUCH LONGITUDINAL')) return;
	const ok = attemptCollisionSafeMotion('COUCH LONGITUDINAL', () => {
		if (S.couchTopGroup) S.couchTopGroup.position.z -= MOVEMENT_STEP;
	});
	if (!ok) return;
	fundamentalState.lng += 1;
	imgCouch('lng', 1);
	syncFundamentalReadouts(
		'COUCH LONGITUDINAL',
		`${fundamentalState.lng > 0 ? '+' : ''}${fundamentalState.lng} mm`
	);
});
couchOutButton.addEventListener('click', () => {
	if (!requirePendantMotion('COUCH LONGITUDINAL')) return;
	const ok = attemptCollisionSafeMotion('COUCH LONGITUDINAL', () => {
		if (S.couchTopGroup) S.couchTopGroup.position.z += MOVEMENT_STEP;
	});
	if (!ok) return;
	fundamentalState.lng -= 1;
	imgCouch('lng', -1);
	syncFundamentalReadouts('COUCH LONGITUDINAL', `${fundamentalState.lng} mm`);
});
couchLeftButton.addEventListener('click', () => {
	if (!requirePendantMotion('COUCH LATERAL')) return;
	const ok = attemptCollisionSafeMotion('COUCH LATERAL', () => {
		if (S.couchGroup) S.couchGroup.position.x -= MOVEMENT_STEP;
	});
	if (!ok) return;
	fundamentalState.lat += 1;
	imgCouch('lat', 1);
	syncFundamentalReadouts(
		'COUCH LATERAL',
		`${fundamentalState.lat > 0 ? '+' : ''}${fundamentalState.lat} mm`
	);
});
couchRightButton.addEventListener('click', () => {
	if (!requirePendantMotion('COUCH LATERAL')) return;
	const ok = attemptCollisionSafeMotion('COUCH LATERAL', () => {
		if (S.couchGroup) S.couchGroup.position.x += MOVEMENT_STEP;
	});
	if (!ok) return;
	fundamentalState.lat -= 1;
	imgCouch('lat', -1);
	syncFundamentalReadouts('COUCH LATERAL', `${fundamentalState.lat} mm`);
});
const ROT_DEG = 0.5,
	ROT_RAD = (ROT_DEG * Math.PI) / 180;
const couchTilt = (axis3d, sign) => {
	if (S.couchTopGroup) S.couchTopGroup.rotation[axis3d] += sign * ROT_RAD;
};
const safeTilt = (label, axis, sign, stateKey) => {
	if (!requirePendantMotion(label)) return;
	const ok = attemptCollisionSafeMotion(label, () => couchTilt(axis, sign));
	if (!ok) return;
	fundamentalState[stateKey] += sign * ROT_DEG;
	imgCouch(stateKey, sign * ROT_DEG);
	syncFundamentalReadouts(label, `${fundamentalState[stateKey].toFixed(1)}°`);
};
couchRollPlusButton.addEventListener('click', () => safeTilt('COUCH ROLL', 'z', 1, 'roll'));
couchRollMinusButton.addEventListener('click', () => safeTilt('COUCH ROLL', 'z', -1, 'roll'));
couchPitchPlusButton.addEventListener('click', () => safeTilt('COUCH PITCH', 'x', 1, 'pitch'));
couchPitchMinusButton.addEventListener('click', () => safeTilt('COUCH PITCH', 'x', -1, 'pitch'));
couchYawPlusButton.addEventListener('click', () => safeTilt('COUCH YAW', 'y', 1, 'yaw'));
couchYawMinusButton.addEventListener('click', () => safeTilt('COUCH YAW', 'y', -1, 'yaw'));
const moveTreatmentCouchAngle = (sign) => {
	if (!requirePendantMotion('TREATMENT COUCH')) return;
	const next = wrap360((fundamentalState.couchAngle || 0) + sign * 5);
	const ok = attemptCollisionSafeMotion('TREATMENT COUCH', () => {
		if (S.couchTreatmentPivot) S.couchTreatmentPivot.rotation.y = (next * Math.PI) / 180;
	});
	if (!ok) return;
	fundamentalState.couchAngle = next;
	if (srsRequired()) {
		const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
		S.srsWorkflow.timeoutVerifiedByField[idx] = false;
		S.srsWorkflow.dryRunByField[idx] = false;
	}
	syncFundamentalReadouts('TREATMENT COUCH', `${next}°`);
	renderSRSPanel();
	renderTreatmentDeliveryPanel();
};
couchTreatmentAnglePlusButton?.addEventListener('click', () => moveTreatmentCouchAngle(1));
couchTreatmentAngleMinusButton?.addEventListener('click', () => moveTreatmentCouchAngle(-1));
jawsOpenButton.addEventListener('click', () => {
	if (!requirePendantMotion('JAWS')) return;
	['jawX1', 'jawX2', 'jawY1', 'jawY2'].forEach(
		(k) => (fundamentalState[k] = Math.min(JAW_EDGE_MAX_CM, fundamentalState[k] + JAW_EDGE_STEP_CM))
	);
	syncLegacyJawValue();
	updateJawPositions();
	saveGameState();
	syncFundamentalReadouts('FIELD APERTURE', currentJawSummary());
});
jawsCloseButton.addEventListener('click', () => {
	if (!requirePendantMotion('JAWS')) return;
	['jawX1', 'jawX2', 'jawY1', 'jawY2'].forEach(
		(k) => (fundamentalState[k] = Math.max(JAW_EDGE_MIN_CM, fundamentalState[k] - JAW_EDGE_STEP_CM))
	);
	syncLegacyJawValue();
	updateJawPositions();
	saveGameState();
	syncFundamentalReadouts('FIELD APERTURE', currentJawSummary());
});
jawX1InButton?.addEventListener('click', () => nudgeJawEdge('jawX1', -JAW_EDGE_STEP_CM));
jawX1OutButton?.addEventListener('click', () => nudgeJawEdge('jawX1', JAW_EDGE_STEP_CM));
jawX2InButton?.addEventListener('click', () => nudgeJawEdge('jawX2', -JAW_EDGE_STEP_CM));
jawX2OutButton?.addEventListener('click', () => nudgeJawEdge('jawX2', JAW_EDGE_STEP_CM));
jawY1InButton?.addEventListener('click', () => nudgeJawEdge('jawY1', -JAW_EDGE_STEP_CM));
jawY1OutButton?.addEventListener('click', () => nudgeJawEdge('jawY1', JAW_EDGE_STEP_CM));
jawY2InButton?.addEventListener('click', () => nudgeJawEdge('jawY2', -JAW_EDGE_STEP_CM));
jawY2OutButton?.addEventListener('click', () => nudgeJawEdge('jawY2', JAW_EDGE_STEP_CM));
mlcOpenButton?.addEventListener('click', () => {
	if (!requirePendantMotion('MLC')) return;
	fundamentalState.mlc = Math.min(MLC_MAX_CM, fundamentalState.mlc + 1);
	updateMLCPositions();
	syncFundamentalReadouts(
		'MLC APERTURE',
		`${fundamentalState.mlc} cm · ${fundamentalState.mlcShape}`
	);
});
mlcCloseButton?.addEventListener('click', () => {
	if (!requirePendantMotion('MLC')) return;
	fundamentalState.mlc = Math.max(MLC_MIN_CM, fundamentalState.mlc - 1);
	updateMLCPositions();
	syncFundamentalReadouts(
		'MLC APERTURE',
		`${fundamentalState.mlc} cm · ${fundamentalState.mlcShape}`
	);
});
mlcShapeButton?.addEventListener('click', () => {
	if (!requirePendantMotion('MLC SHAPE')) return;
	const i = (MLC_SHAPES.indexOf(fundamentalState.mlcShape) + 1) % MLC_SHAPES.length;
	fundamentalState.mlcShape = MLC_SHAPES[i];
	updateMLCPositions();
	syncFundamentalReadouts('MLC SHAPE', fundamentalState.mlcShape);
});
detectorToggleButton.addEventListener('click', () =>
	runFunctionKeyIsolated(() => {
		setDetectorStateGame(!S.detectorExtended);
		detectorToggleButton.classList.toggle('active-function', S.detectorExtended);
		setPendantLCD('MV DETECTOR', S.detectorExtended ? 'EXTENDED' : 'RETRACTED');
		saveGameState();
	})
);
beamOnButton.addEventListener('click', () =>
	runFunctionKeyIsolated(() => {
		setBeamState(!S.beamOn);
		beamOnButton.classList.toggle('active-function', S.beamOn);
		setPendantLCD('BEAM VISUALIZATION', S.beamOn ? 'ON' : 'OFF');
	})
);
lasersToggleButton.addEventListener('click', () =>
	runFunctionKeyIsolated(() => {
		setLaserState(!S.lasersOn);
		lasersToggleButton.classList.toggle('active-function', S.lasersOn);
		setPendantLCD('ALIGNMENT LASERS', S.lasersOn ? 'ON' : 'OFF');
	})
);
odiToggleButton?.addEventListener('click', () =>
	runFunctionKeyIsolated(() => setODIState(!S.odiOn))
);
kvToggleButton.addEventListener('click', () =>
	runFunctionKeyIsolated(() => {
		setKvState(!S.kvOn);
		kvToggleButton.classList.toggle('active-function', S.kvOn);
		setPendantLCD('kV IMAGING ARMS', S.kvOn ? 'EXTENDED' : 'RETRACTED');
	})
);
roomLightsToggleButton?.addEventListener('click', () =>
	runFunctionKeyIsolated(() => setRoomLightsState(!S.roomLightsOn))
);
viewVaultButton?.addEventListener('click', () => travelToRoomView('vault'));
viewControlRoomButton?.addEventListener('click', () => travelToRoomView('control'));
consoleMotionEnable?.addEventListener('click', () => setConsoleMotionArmed(!S.consoleMotionArmed));
consoleImmoButton?.addEventListener('click', () => openWorkflowPanelFromConsole('immo'));
consoleIGRTButton?.addEventListener('click', () => openWorkflowPanelFromConsole('igrt'));
consoleDeliveryButton?.addEventListener('click', () => openWorkflowPanelFromConsole('delivery'));
consoleOISButton?.addEventListener('click', () => openWorkflowPanelFromConsole('ois'));
consoleGantryMinus?.addEventListener('click', () => gantryRotateMinusButton?.click());
consoleGantryPlus?.addEventListener('click', () => gantryRotatePlusButton?.click());
consoleCollMinus?.addEventListener('click', () => collimatorRotateMinusButton?.click());
consoleCollPlus?.addEventListener('click', () => collimatorRotatePlusButton?.click());
consoleVrtMinus?.addEventListener('click', () => couchDownButton?.click());
consoleVrtPlus?.addEventListener('click', () => couchUpButton?.click());
consoleLngMinus?.addEventListener('click', () => couchOutButton?.click());
consoleLngPlus?.addEventListener('click', () => couchInButton?.click());
consoleLatMinus?.addEventListener('click', () => couchRightButton?.click());
consoleLatPlus?.addEventListener('click', () => couchLeftButton?.click());
consoleKV?.addEventListener('click', () => kvToggleButton?.click());
consoleMV?.addEventListener('click', () => detectorToggleButton?.click());
consoleLasers?.addEventListener('click', () => lasersToggleButton?.click());
consoleBeamVisual?.addEventListener('click', () => beamOnButton?.click());
consoleRoomLights?.addEventListener('click', () => roomLightsToggleButton?.click());
consoleTravelVault?.addEventListener('click', () => travelToRoomView('vault'));
consoleTravelControl?.addEventListener('click', () => travelToRoomView('control'));
consoleJawsClose?.addEventListener('click', () => jawsCloseButton?.click());
consoleJawsOpen?.addEventListener('click', () => jawsOpenButton?.click());
consoleMLCClose?.addEventListener('click', () => mlcCloseButton?.click());
consoleMLCOpen?.addEventListener('click', () => mlcOpenButton?.click());
consoleMLCShape?.addEventListener('click', () => mlcShapeButton?.click());
consoleOdi?.addEventListener('click', () => odiToggleButton?.click());
consoleJawX1In?.addEventListener('click', () => jawX1InButton?.click());
consoleJawX1Out?.addEventListener('click', () => jawX1OutButton?.click());
consoleJawX2In?.addEventListener('click', () => jawX2InButton?.click());
consoleJawX2Out?.addEventListener('click', () => jawX2OutButton?.click());
consoleJawY1In?.addEventListener('click', () => jawY1InButton?.click());
consoleJawY1Out?.addEventListener('click', () => jawY1OutButton?.click());
consoleJawY2In?.addEventListener('click', () => jawY2InButton?.click());
consoleJawY2Out?.addEventListener('click', () => jawY2OutButton?.click());
consoleRollMinus?.addEventListener('click', () => couchRollMinusButton?.click());
consoleRollPlus?.addEventListener('click', () => couchRollPlusButton?.click());
consolePitchMinus?.addEventListener('click', () => couchPitchMinusButton?.click());
consolePitchPlus?.addEventListener('click', () => couchPitchPlusButton?.click());
consoleYawMinus?.addEventListener('click', () => couchYawMinusButton?.click());
consoleYawPlus?.addEventListener('click', () => couchYawPlusButton?.click());
consoleTableMinus?.addEventListener('click', () => couchTreatmentAngleMinusButton?.click());
consoleTablePlus?.addEventListener('click', () => couchTreatmentAnglePlusButton?.click());
internalViewButton.addEventListener('click', () => {
	setInternalView(!S.internalViewOn);
});
beamStagePrevButton.addEventListener('click', () => beamStageStep(-1));
beamStageNextButton.addEventListener('click', () => beamStageStep(1));
asmBeamButton.addEventListener('click', () => {
	if (S.internalViewOn) setAssembly('beam');
});
asmStandButton.addEventListener('click', () => {
	if (S.internalViewOn) setAssembly('stand');
});
asmElectronButton.addEventListener('click', () => {
	if (S.internalViewOn) setAssembly('electron');
});
asmAccessoryButton.addEventListener('click', () => {
	if (S.internalViewOn) setAssembly('accessory');
});
bonusChallengeButton.addEventListener('click', displayBonusChallenge);
startQuizButton.addEventListener('click', displayQuiz);
submitAnswerButton.addEventListener('click', handleSubmitAnswer);
resetButton.addEventListener('click', resetGame);

initThreeJS();
// Standalone simulator: always load a complete, operational LINAC.
loadGameState();
S.earnedParts = [...CORE_PART_IDS];
S.purchasedEnhancements = enhancementsData.map((item) => item.id);
S.allCorePartsEarned = true;
// show solid (opaque) coverings — real part meshes visible, silhouettes hidden
linacPartsData.forEach((partData) => {
	if (partData.threeJSObject) partData.threeJSObject.visible = true;
	if (partData.silhouetteObject) partData.silhouetteObject.visible = false;
});
// make every machine control operational and begin from a consistent teaching baseline
S.purchasedEnhancements.forEach((enhId) => enableMovementControl(enhId, true));
setBeamWidth(10);
fundamentalState.mlc = 10;
fundamentalState.mlcShape = 'Square';
updateMLCPositions();
setDetectorStateGame(false);
setKvState(false);
setLaserState(false);
setODIState(false);
setBeamState(false);
setRoomLightsState(true);
checkAllCorePartsEarned();
updateUI();
populateTreatmentCaseSelect();
bottomMachineControls.style.display = 'flex';
const patientToggleBtn = document.getElementById('patientToggleBtn');
if (patientToggleBtn)
	patientToggleBtn.addEventListener('click', () => {
		if (!S.patientGroup) return;
		S.patientGroup.visible = !S.patientGroup.visible;
		patientToggleBtn.textContent = S.patientGroup.visible ? 'Hide Patient' : 'Show Patient';
	});
document.getElementById('resetViewButton')?.addEventListener('click', () => {
	if (!S.camera || !S.controls) return;
	S.camera.position.set(8.6, ISOCENTER_Y_TARGET + 2.8, GANTRY_PLANE_Z_TARGET + 7.2);
	S.controls.target.set(-0.4, 1.15, GANTRY_PLANE_Z_TARGET - 0.3);
	S.controls.update();
	setPendantLCD('CAMERA', 'Default treatment-room view');
});
document.getElementById('fundamentalsResetButton')?.addEventListener('click', () => {
	localStorage.removeItem('linacGameState_v4');
	location.reload();
});
loadTreatmentCaseBtn?.addEventListener('click', () =>
	loadTreatmentCase(parseInt(treatmentCaseSelect?.value || '0', 10) || 0)
);
nextTreatmentCaseBtn?.addEventListener('click', () =>
	loadTreatmentCase(S.activeTreatmentCaseIndex + 1)
);
treatmentCaseSelect?.addEventListener('change', () => renderTreatmentMonitor());
immobilizationLaunchButton?.addEventListener('click', () => {
	ctSuitePanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	immobilizationPanel?.classList.add('open');
	renderImmobilizationPanel();
});
immobilizationClose?.addEventListener('click', () => immobilizationPanel?.classList.remove('open'));
ctSuiteLaunchButton?.addEventListener('click', () => {
	immobilizationPanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	ctSuitePanel?.classList.add('open');
	setPendantLCD('CT SIMULATION', 'Simulation → planning → IGRT reference');
});
ctSuiteClose?.addEventListener('click', () => ctSuitePanel?.classList.remove('open'));

immobilizationVerify?.addEventListener('click', verifyImmobilizationSelection);
immobilizationReset?.addEventListener('click', clearImmobilizationSelection);
immobilizationTableDrop?.addEventListener('dragover', (ev) => {
	ev.preventDefault();
	immobilizationTableDrop.classList.add('dragover');
});
immobilizationTableDrop?.addEventListener('dragleave', () =>
	immobilizationTableDrop.classList.remove('dragover')
);
immobilizationTableDrop?.addEventListener('drop', (ev) => {
	ev.preventDefault();
	immobilizationTableDrop.classList.remove('dragover');
	const id = ev.dataTransfer.getData('text/immo-id');
	if (id) addImmobilizationDevice(id);
});
immobilizationShelf?.addEventListener('dragover', (ev) => ev.preventDefault());
immobilizationShelf?.addEventListener('drop', (ev) => {
	ev.preventDefault();
	const id = ev.dataTransfer.getData('text/immo-id');
	const source = ev.dataTransfer.getData('text/immo-source');
	if (id && source === 'table') removeImmobilizationDevice(id);
});
igrtLaunchButton?.addEventListener('click', () => {
	ctSuitePanel?.classList.remove('open');
	immobilizationPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	igrtPanel?.classList.add('open');
	renderClinicalIGRT();
});
motionLaunchButton?.addEventListener('click', () => {
	immobilizationPanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	motionPanel?.classList.add('open');
	renderMotionPanel(true);
});
motionClose?.addEventListener('click', () => motionPanel?.classList.remove('open'));
motionAcquire?.addEventListener('click', acquireMotionCharacterization);
motionVerify?.addEventListener('click', verifyMotionManagement);
motionHold?.addEventListener('click', startDIBHHold);
motionRelease?.addEventListener('click', releaseDIBHHold);
motionReset?.addEventListener('click', resetMotionManagementForCase);
motionRecheck?.addEventListener('click', () => {
	renderMotionPanel(true);
	renderTreatmentDeliveryPanel();
});
motionGateLow?.addEventListener('input', () => {
	S.motionManagement.gateLow = Number(motionGateLow.value);
	S.motionManagement.verified = false;
	renderMotionPanel(true);
	renderTreatmentDeliveryPanel();
});
motionGateHigh?.addEventListener('input', () => {
	S.motionManagement.gateHigh = Number(motionGateHigh.value);
	S.motionManagement.verified = false;
	renderMotionPanel(true);
	renderTreatmentDeliveryPanel();
});
motionDibhTarget?.addEventListener('input', () => {
	S.motionManagement.dibhTarget = Number(motionDibhTarget.value);
	S.motionManagement.verified = false;
	renderMotionPanel(true);
	renderTreatmentDeliveryPanel();
});
motionDibhTolerance?.addEventListener('input', () => {
	S.motionManagement.dibhTolerance = Number(motionDibhTolerance.value);
	S.motionManagement.verified = false;
	renderMotionPanel(true);
	renderTreatmentDeliveryPanel();
});
adaptiveLaunchButton?.addEventListener('click', () => {
	immobilizationPanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	adaptivePanel?.classList.add('open');
	renderAdaptivePanel();
});
adaptiveClose?.addEventListener('click', () => adaptivePanel?.classList.remove('open'));
adaptiveAssess?.addEventListener('click', () => {
	if (!adaptiveRequired()) return;
	S.adaptiveWorkflow.assessed = true;
	S.adaptiveWorkflow.approved = false;
	setPendantLCD('ADAPTIVE REVIEW', 'Daily anatomy assessed');
	renderAdaptivePanel();
	renderTreatmentDeliveryPanel();
});
adaptiveCompare?.addEventListener('click', () => {
	if (!adaptiveRequired()) return;
	S.adaptiveWorkflow.compared = true;
	S.adaptiveWorkflow.approved = false;
	setPendantLCD('ADAPTIVE REVIEW', 'Plans compared');
	renderAdaptivePanel();
	renderTreatmentDeliveryPanel();
});
adaptiveApprove?.addEventListener('click', verifyAdaptivePlan);
adaptiveNextFraction?.addEventListener('click', advanceAdaptiveFraction);
adaptiveResetCourse?.addEventListener('click', resetAdaptiveCourseHistory);
adaptivePanel?.addEventListener('click', (ev) => {
	const btn = ev.target.closest('[data-adaptive-plan]');
	if (!btn || !adaptiveRequired()) return;
	S.adaptiveWorkflow.approved = false;
	applyAdaptivePlan(btn.dataset.adaptivePlan);
	renderAdaptivePanel();
});
['adaptiveCheckDose', 'adaptiveCheckApprove'].forEach((id) =>
	document.getElementById(id)?.addEventListener('change', () => {
		if (!adaptiveRequired()) return;
		S.adaptiveWorkflow.approved = false;
		S.adaptiveWorkflow.doseChecked = !!document.getElementById('adaptiveCheckDose')?.checked;
		S.adaptiveWorkflow.finalApproved = !!document.getElementById('adaptiveCheckApprove')?.checked;
		renderAdaptivePanel();
		renderTreatmentDeliveryPanel();
	})
);
oisLaunchButton?.addEventListener('click', () => {
	immobilizationPanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.add('open');
	renderOISPanel();
});
oisClose?.addEventListener('click', () => oisPanel?.classList.remove('open'));
oisNote?.addEventListener('input', () => {
	S.oisSession.note = oisNote.value;
	persistOISSession();
});
oisTherapist?.addEventListener('input', () => {
	S.oisSession.therapist = oisTherapist.value;
	persistOISSession();
	renderOISPanel();
});
oisReviewCheck?.addEventListener('change', () => {
	S.oisSession.reviewed = !!oisReviewCheck.checked;
	persistOISSession();
	renderOISPanel();
});
oisOverrideReviewCheck?.addEventListener('change', () => {
	S.oisSession.overrideReviewed = !!oisOverrideReviewCheck.checked;
	persistOISSession();
	renderOISPanel();
});
oisSignOff?.addEventListener('click', signOffOISRecord);
srsLaunchButton?.addEventListener('click', () => {
	immobilizationPanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	srsPanel?.classList.add('open');
	renderSRSPanel();
});
srsClose?.addEventListener('click', () => srsPanel?.classList.remove('open'));
srsClearanceCheck?.addEventListener('click', recheckSRSClearance);
srsDryRun?.addEventListener('click', runSRSDryRun);
srsVerifyTimeout?.addEventListener('click', verifySRSTimeout);
['srsCheckPatient', 'srsCheckRx', 'srsCheckMask', 'srsCheckTeam'].forEach((id) =>
	document.getElementById(id)?.addEventListener('change', () => {
		const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
		S.srsWorkflow.timeoutVerifiedByField[idx] = false;
		renderSRSPanel();
		renderTreatmentDeliveryPanel();
	})
);
specialSetupLaunchButton?.addEventListener('click', () => {
	immobilizationPanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	deliveryPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	specialSetupPanel?.classList.add('open');
	renderSpecialSetupPanel();
});
specialSetupClose?.addEventListener('click', () => specialSetupPanel?.classList.remove('open'));
specialSetupContent?.addEventListener('change', () => {
	syncSpecialCheckboxes();
	S.specialSetupWorkflow.verified = false;
	if (S.specialSetupWorkflow.electron) {
		S.specialSetupWorkflow.electron.mounted = false;
		S.specialSetupWorkflow.electron.bolusPlaced = false;
		S.specialSetupWorkflow.electron.bolusPositionOK = false;
		S.specialSetupWorkflow.electron.bolusAirGapOK = false;
	}
	renderSpecialSetupPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	updateBEVInset();
	updateElectronApplicator3D();
	updateElectronBolusMesh();
});
specialSetupContent?.addEventListener('click', (ev) => {
	const btn = ev.target.closest('[data-special]');
	if (btn) handleSpecialSetupAction(btn.dataset.special);
});
deliveryLaunchButton?.addEventListener('click', () => {
	immobilizationPanel?.classList.remove('open');
	igrtPanel?.classList.remove('open');
	motionPanel?.classList.remove('open');
	adaptivePanel?.classList.remove('open');
	srsPanel?.classList.remove('open');
	specialSetupPanel?.classList.remove('open');
	chargeCapturePanel?.classList.remove('open');
	oisPanel?.classList.remove('open');
	deliveryPanel?.classList.add('open');
	renderTreatmentDeliveryPanel();
});
deliveryFieldSelect?.addEventListener('change', () => {
	if (S.treatmentDelivery.delivering) {
		deliveryFieldSelect.value = String(S.treatmentDelivery.activeFieldIndex);
		return;
	}
	S.treatmentDelivery.activeFieldIndex = Number(deliveryFieldSelect.value) || 0;
	S.treatmentDelivery.armed = false;
	S.treatmentDelivery.held = false;
	S.treatmentDelivery.completed =
		!!S.treatmentDelivery.completedFields[S.treatmentDelivery.activeFieldIndex];
	S.treatmentDelivery.terminated = false;
	S.treatmentDelivery.muDelivered = S.treatmentDelivery.completed
		? Number(deliveryCasePlan().mu) || 0
		: 0;
	S.treatmentDelivery.autoHoldReason = '';
	S.treatmentDelivery.dynamicFraction = S.treatmentDelivery.completed ? 1 : 0;
	S.treatmentDelivery.controlPointIndex = 0;
	setBeamState(false);
	const f = deliveryCasePlan();
	setPendantLCD(
		'FIELD SELECTED',
		`${f.field} · G ${monitorPlannedDisplay('gantry', getCurrentPlannedParameters().gantry)} · T ${monitorPlannedDisplay('couchAngle', getCurrentPlannedParameters().couchAngle || '0°')}`
	);
	updateSpecialAnatomyTargetMarker();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	renderSRSPanel();
	renderClinicalIGRT();
});
deliveryClose?.addEventListener('click', () => deliveryPanel?.classList.remove('open'));
deliveryRecheck?.addEventListener('click', () => {
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
});
clearanceOverrideApply?.addEventListener('click', applyClearanceOverride);
clearanceOverrideWithdraw?.addEventListener('click', withdrawClearanceOverride);
clearanceOverrideRationale?.addEventListener('input', () => {
	const rec = clearanceOverrideRecord();
	if (!rec?.active && clearanceOverrideStatus)
		clearanceOverrideStatus.textContent =
			'Document the reason for overriding the simulator clearance proxy, then acknowledge the training-only warning.';
});
deliveryArm?.addEventListener('click', armTreatmentDelivery);
deliveryStart?.addEventListener('click', startTreatmentDelivery);
deliveryHold?.addEventListener('click', () => {
	if (S.treatmentDelivery.held) resumeTreatmentDelivery();
	else holdTreatmentDelivery('manual hold');
});
deliveryTerminate?.addEventListener('click', terminateTreatmentDelivery);
deliveryCompleteSession?.addEventListener('click', () =>
	S.activeTreatmentCase?.billing?.skipChargeCapture
		? completeFractionWithoutCurrentCPTModule()
		: openChargeCapture()
);
deliveryReviewCharges?.addEventListener('click', openChargeCapture);
chargeCaptureClose?.addEventListener('click', () => chargeCapturePanel?.classList.remove('open'));
chargeTreatmentCode?.addEventListener('change', () => {
	S.treatmentCompletion.verified = false;
	if (chargePost) chargePost.disabled = true;
	updateChargeEducation();
	const f = document.getElementById('chargeFeedback');
	if (f) {
		f.className = '';
		f.textContent =
			'Selection changed. Review the code definition, then verify the charge before posting.';
	}
});
chargeIgrtHandling?.addEventListener('change', () => {
	S.treatmentCompletion.verified = false;
	if (chargePost) chargePost.disabled = true;
	updateChargeEducation();
	const f = document.getElementById('chargeFeedback');
	if (f) {
		f.className = '';
		f.textContent =
			'Selection changed. Review the IGRT explanation, then verify the charge before posting.';
	}
});
chargeVerify?.addEventListener('click', verifyChargeCapture);
chargePost?.addEventListener('click', postChargeAndCompleteFraction);
igrtClose?.addEventListener('click', () => igrtPanel?.classList.remove('open'));
igrtNewSetup?.addEventListener('click', startClinicalIGRT);
igrtAcquire?.addEventListener('click', acquireClinicalIGRT);
igrtVerify?.addEventListener('click', verifyClinicalIGRT);
setPendantMotionArmed(false);
syncFundamentalReadouts();
loadTreatmentCase(0);
setSafetyHUD(false);
syncOperatorConsole();
document.querySelector('.tab-button[data-tab="divergenceContent"]')?.click();

// ================= Beam Divergence Lab (integrated exercise) =================
(function () {
	const rx = 20,
		ry = 12,
		scale = 3;
	let probGantry = 0,
		probJaw = 10,
		probSid = 150,
		probError = 0,
		trueAnswers = {};
	let bdScenCount = 0,
		probPos = 'HFS';
	let bdLive = false; // gate machine-driving to user interaction (not the initial load)
	const $ = (id) => document.getElementById(id);
	const ui = {
		mode: $('bd-quiz-mode'),
		gantry: $('bd-gantry'),
		jaw: $('bd-jaw'),
		sid: $('bd-sid'),
		err: $('bd-setup-error'),
		rowError: $('bd-row-error'),
		scenText: $('bd-scenario-text'),
		formBox: $('bd-formula-box'),
		rows: document.querySelectorAll('#divergenceContent .bd-quiz-row')
	};
	if (!ui.mode) return;
	const ans = {
		ssd: $('bd-ans-ssd'),
		actualSsd: $('bd-ans-actual-ssd'),
		fsSkin: $('bd-ans-fs-skin'),
		doseSkin: $('bd-ans-dose-skin'),
		actualDose: $('bd-ans-actual-dose'),
		fsRec: $('bd-ans-fs-rec'),
		doseRec: $('bd-ans-dose-rec')
	};
	const fb = {
		ssd: $('bd-fb-ssd'),
		actualSsd: $('bd-fb-actual-ssd'),
		fsSkin: $('bd-fb-fs-skin'),
		doseSkin: $('bd-fb-dose-skin'),
		actualDose: $('bd-fb-actual-dose'),
		fsRec: $('bd-fb-fs-rec'),
		doseRec: $('bd-fb-dose-rec')
	};

	function filterUI() {
		const mode = ui.mode.value;
		ui.rows.forEach((row) => {
			row.style.display = row.dataset.tags.includes(mode) ? 'flex' : 'none';
		});
		ui.rowError.style.display = mode === 'error' ? 'flex' : 'none';
		$('bd-row-sid').style.display = mode === 'error' || mode === 'depth' ? 'none' : 'flex';
		if (mode === 'error') {
			ans.doseSkin.value = '100';
			ans.doseSkin.disabled = true;
			ui.formBox.innerHTML =
				'<strong>Formulas (Error Normalization):</strong><br><br>Planned Dose = 100%<br>Actual Dose = 100 &times; (Planned SSD / Actual SSD)&sup2;';
		} else {
			ans.doseSkin.disabled = false;
			ui.formBox.innerHTML =
				'<strong>Formulas (SAD Baseline):</strong><br><br>SSD = SAD &minus; Depth<br>FS = Jaw &times; (Distance / SAD)<br>Rel. Dose = 100 &times; (SAD / Distance)&sup2;';
		}
		const acChip = $('bd-hud-actualssd-chip');
		if (acChip) acChip.style.display = mode === 'error' ? 'flex' : 'none';
	}
	function requiredCalcs() {
		const list = [];
		ui.rows.forEach((row) => {
			if (row.style.display === 'none') return;
			const input = row.querySelector('input');
			if (input && input.disabled) return;
			const label = row.querySelector('span');
			if (label) list.push(label.textContent.trim());
		});
		return list;
	}
	function generateScenario() {
		filterUI();
		if (typeof stopGuidedAuto === 'function') stopGuidedAuto();
		{
			const gp = $('bd-guided');
			if (gp) gp.classList.remove('active');
		}
		const mode = ui.mode.value;
		// eslint-disable-next-line no-useless-assignment -- pre-existing dead code, tracked in #77 phase 2 report
		let scenarioKey = '';
		let attempts = 0;
		do {
			probGantry = (Math.floor(Math.random() * 35) + 1) * 10;
			probJaw = Math.floor(Math.random() * 16) + 5;
			probSid = Math.floor(Math.random() * 6) * 10 + 130;
			probError = mode === 'error' ? Math.floor(Math.random() * 10) - 5 || -3 : 0;
			scenarioKey = [mode, probGantry, probJaw, probSid, probError].join('|');
			attempts++;
		} while (S.recentScenarioKeys.includes(scenarioKey) && attempts < 40);
		S.recentScenarioKeys.push(scenarioKey);
		if (S.recentScenarioKeys.length > 10) S.recentScenarioKeys.shift();
		const rad = probGantry * (Math.PI / 180);
		const depth =
			(rx * ry) / Math.sqrt(Math.pow(rx * Math.cos(rad), 2) + Math.pow(ry * Math.sin(rad), 2));
		const plannedSsd = 100 - depth,
			actualSsd = plannedSsd + probError,
			depthStr = depth.toFixed(1);
		const showSetup = mode !== 'depth' && mode !== 'error';
		probPos = PATIENT_POSITIONS[bdScenCount % PATIENT_POSITIONS.length];
		bdScenCount++;
		const orderItems = [
			'<li>Patient setup &rarr; <span class="highlight">' +
				PATIENT_POS_NAMES[probPos] +
				'</span></li>',
			'<li>Gantry angle &rarr; <span class="highlight">' + probGantry + '&deg;</span></li>'
		];
		if (showSetup) {
			orderItems.push(
				'<li>Field size (jaw) &rarr; <span class="highlight">' + probJaw + ' cm</span></li>'
			);
			orderItems.push(
				'<li>Receptor distance (SID) &rarr; <span class="highlight">' + probSid + ' cm</span></li>'
			);
		}
		if (mode === 'error') {
			const errDir =
				probError > 0
					? 'further from the source (table too low)'
					: 'closer to the source (table too high)';
			orderItems.push(
				'<li class="bd-err">Setup error &rarr; patient positioned ' +
					Math.abs(probError) +
					' cm ' +
					errDir +
					'</li>'
			);
		}
		const dirItems = [
			'<li>The patient has been <strong>auto-localized (3-point setup)</strong> to isocenter in <span class="highlight">' +
				PATIENT_POS_NAMES[probPos] +
				'</span> &mdash; watch the couch drive them into place. You just set the gantry and field size.</li>',
			'<li><strong>Rotate the Gantry</strong> to <span class="highlight">' +
				probGantry +
				'&deg;</span> &mdash; this places <span class="highlight">' +
				depthStr +
				' cm</span> of tissue between the skin surface and the isocenter (the <em>depth</em>).</li>'
		];
		if (showSetup) {
			dirItems.push('<li><strong>Set the Field Size (jaw)</strong> to ' + probJaw + ' cm.</li>');
			dirItems.push(
				'<li>Confirm the <strong>Receptor (SID)</strong> reads ' + probSid + ' cm.</li>'
			);
		}
		if (mode === 'error')
			dirItems.push(
				'<li class="bd-err">Set the <strong>Table Setup Error</strong> slider to ' +
					probError +
					' cm.</li>'
			);
		const calcs = requiredCalcs();
		if (calcs.length)
			dirItems.push(
				'<li><strong>Calculate &amp; enter</strong> the values below: ' +
					calcs.join('; ') +
					'.</li>'
			);
		ui.scenText.innerHTML =
			'<div><strong>Patient:</strong> elliptical cross-section &mdash; lateral half-width <span class="highlight">20 cm</span>, AP half-depth <span class="highlight">12 cm</span>. SAD = <span class="highlight">100 cm</span>.</div>' +
			'<div style="font-size:0.82rem; color:#aaa; margin-top:6px;">Depth to isocenter depends on gantry angle &mdash; 12 cm at 0&deg;, 20 cm at 90&deg;.</div>' +
			'<div style="margin-top:10px;"><strong style="color:#ff9900;">Orders</strong><ul>' +
			orderItems.join('') +
			'</ul></div>' +
			'<div style="margin-top:10px;"><strong style="color:#0096ff;">Directives</strong><ol>' +
			dirItems.join('') +
			'</ol></div>';
		trueAnswers = {
			ssd: plannedSsd,
			actualSsd: actualSsd,
			fsSkin: probJaw * (plannedSsd / 100),
			doseSkin: mode === 'error' ? 100 : 100 * Math.pow(100 / plannedSsd, 2),
			actualDose: 100 * Math.pow(plannedSsd / actualSsd, 2),
			fsRec: probJaw * (probSid / 100),
			doseRec: 100 * Math.pow(100 / probSid, 2)
		};
		Object.values(ans).forEach((i) => {
			if (!i.disabled) i.value = '';
			i.className = '';
		});
		Object.values(fb).forEach((f) => (f.textContent = ''));
		$('bd-final-feedback').textContent = '';
		ui.gantry.value = 0;
		ui.jaw.value = 10;
		ui.sid.value = probSid;
		ui.err.value = probError;
		if (typeof runPatientSetup === 'function') runPatientSetup(probPos); // auto 3-point localization to iso
		updateVisualizer();
	}
	function updateVisualizer() {
		const angle = parseFloat(ui.gantry.value),
			jaw = parseFloat(ui.jaw.value),
			sid = parseFloat(ui.sid.value),
			err = parseFloat(ui.err.value);
		$('bd-val-gantry').textContent = angle + '\u00B0';
		$('bd-val-jaw').textContent = jaw + ' cm';
		$('bd-val-sid').textContent = sid + ' cm';
		$('bd-val-error').textContent = (err > 0 ? '+' : '') + err + ' cm';
		$('bd-gantry-group').setAttribute('transform', 'rotate(' + angle + ', 400, 400)');
		// The divergence exercise is display/calculation only in the clinical emulator.
		// Physical machine state is controlled exclusively by explicit pendant commands.
		// This prevents lab sliders or hidden synchronization from moving the gantry,
		// jaws, or deploying the MV detector as an unintended side effect.
		if (bdLive) {
			// Intentionally no physical-machine writes here.
		}
		const rad = angle * (Math.PI / 180);
		const depth =
			(rx * ry) / Math.sqrt(Math.pow(rx * Math.cos(rad), 2) + Math.pow(ry * Math.sin(rad), 2));
		const plannedSsd = 100 - depth,
			actualSsd = plannedSsd + err;
		const sidY = 100 + sid * scale,
			sidHalfPx = (jaw * (sid / 100) * scale) / 2;
		$('bd-svg-beam').setAttribute(
			'points',
			'400,100 ' + (400 + sidHalfPx) + ',' + sidY + ' ' + (400 - sidHalfPx) + ',' + sidY
		);
		$('bd-svg-sid').setAttribute('y1', sidY);
		$('bd-svg-sid').setAttribute('y2', sidY);
		const planY = 100 + plannedSsd * scale;
		$('bd-svg-planned-ssd').setAttribute('y1', planY);
		$('bd-svg-planned-ssd').setAttribute('y2', planY);
		$('bd-lbl-planned-ssd').setAttribute('y', planY - 5);
		const actY = 100 + actualSsd * scale,
			svgAct = $('bd-svg-actual-ssd'),
			lblAct = $('bd-lbl-actual-ssd');
		if (err !== 0) {
			svgAct.style.display = 'block';
			lblAct.style.display = 'block';
			svgAct.setAttribute('y1', actY);
			svgAct.setAttribute('y2', actY);
			lblAct.setAttribute('y', actY + 15);
		} else {
			svgAct.style.display = 'none';
			lblAct.style.display = 'none';
		}
		// ---- live numeric readouts (HUD chips + on-diagram value labels) ----
		const mode = ui.mode.value;
		const fsSkin = jaw * (plannedSsd / 100),
			fsRec = jaw * (sid / 100);
		const doseSkin = mode === 'error' ? 100 : 100 * Math.pow(100 / plannedSsd, 2);
		const doseRec = 100 * Math.pow(100 / sid, 2),
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
			actualDose = 100 * Math.pow(plannedSsd / actualSsd, 2);
		const setChip = (id, v) => {
			const el = $(id);
			if (el) el.textContent = v;
		};
		setChip('bd-hud-depth', depth.toFixed(1) + ' cm');
		setChip('bd-hud-ssd', plannedSsd.toFixed(1) + ' cm');
		setChip('bd-hud-actualssd', actualSsd.toFixed(1) + ' cm');
		setChip('bd-hud-fsskin', fsSkin.toFixed(1) + ' cm');
		setChip('bd-hud-fsrec', fsRec.toFixed(1) + ' cm');
		setChip('bd-hud-doseskin', doseSkin.toFixed(1) + ' %');
		setChip('bd-hud-doserec', doseRec.toFixed(1) + ' %');
		setChip('bd-hud-sid', sid + ' cm');
		const lblSsd = $('bd-lbl-planned-ssd');
		if (lblSsd) lblSsd.textContent = 'SSD ' + plannedSsd.toFixed(1) + ' cm';
		const lblSid = $('bd-lbl-sid');
		if (lblSid) lblSid.textContent = 'SID ' + sid + ' cm';
		if (lblAct) lblAct.textContent = 'Actual SSD ' + actualSsd.toFixed(1) + ' cm';
	}
	function animateCount(el, target, unit, dec, dur) {
		if (!el) return;
		const t0 = performance.now();
		const step = (t) => {
			const p = Math.min(1, (t - t0) / dur);
			const e = 1 - Math.pow(1 - p, 3); // ease-out
			el.textContent = (target * e).toFixed(dec) + unit;
			if (p < 1) requestAnimationFrame(step);
			else el.textContent = target.toFixed(dec) + unit;
		};
		requestAnimationFrame(step);
	}
	function flashLine(id) {
		const el = $(id);
		if (!el) return;
		el.classList.add('bd-flash');
		setTimeout(() => el.classList.remove('bd-flash'), 430);
	}
	function playRecap() {
		// snap the lab to the scenario's correct settings, then animate the readout into place
		ui.gantry.value = probGantry;
		ui.jaw.value = probJaw;
		ui.sid.value = probSid;
		ui.err.value = probError;
		updateVisualizer();
		const mode = ui.mode.value,
			depthVal = 100 - trueAnswers.ssd;
		const seq = [
			// [chipId, target, unit, decimals, diagramLineId, errorModeOnly]
			['bd-hud-sad', 100, ' cm', 0, 'bd-svg-sad', false],
			['bd-hud-depth', depthVal, ' cm', 1, 'bd-svg-planned-ssd', false],
			['bd-hud-ssd', trueAnswers.ssd, ' cm', 1, 'bd-svg-planned-ssd', false],
			['bd-hud-actualssd', trueAnswers.actualSsd, ' cm', 1, 'bd-svg-actual-ssd', true],
			['bd-hud-fsskin', trueAnswers.fsSkin, ' cm', 1, 'bd-svg-planned-ssd', false],
			['bd-hud-fsrec', trueAnswers.fsRec, ' cm', 1, 'bd-svg-sid', false],
			['bd-hud-doseskin', trueAnswers.doseSkin, ' %', 1, 'bd-svg-planned-ssd', false],
			['bd-hud-doserec', trueAnswers.doseRec, ' %', 1, 'bd-svg-sid', false],
			['bd-hud-sid', probSid, ' cm', 0, 'bd-svg-sid', false]
		];
		const hud = $('bd-hud');
		if (hud) {
			hud.classList.remove('bd-recap-play');
			void hud.offsetWidth;
			hud.classList.add('bd-recap-play');
		}
		seq.forEach((item, i) => {
			const [id, target, unit, dec, lineId, errOnly] = item;
			if (errOnly && mode !== 'error') return;
			const el = $(id);
			if (el) el.textContent = (0).toFixed(dec) + unit; // reset before its turn
			setTimeout(() => {
				animateCount($(id), target, unit, dec, 470);
				flashLine(lineId);
			}, i * 105);
		});
	}
	// ---- Guided step-by-step recap (formula + explanation per value) ----
	let guidedSteps = [],
		guidedIdx = 0,
		guidedTimer = null;
	function buildGuidedSteps() {
		const mode = ui.mode.value,
			depth = 100 - trueAnswers.ssd,
			f1 = (v) => v.toFixed(1);
		const s = [
			{
				t: 'Depth to Isocenter',
				f:
					'depth = f(gantry ' +
					probGantry +
					'°, ellipse 20×12 cm)\n\u2192 depth = ' +
					f1(depth) +
					' cm',
				x:
					'The gantry angle sets how much tissue lies between skin and isocenter — 12 cm entering at 0°, 20 cm at 90°. Here it is ' +
					f1(depth) +
					' cm.'
			},
			{
				t: 'Planned Patient SSD',
				f:
					'SSD = SAD \u2212 depth\n= 100 \u2212 ' + f1(depth) + ' = ' + f1(trueAnswers.ssd) + ' cm',
				x: 'Source-to-Skin Distance is the fixed 100 cm SAD minus the depth. A steeper angle \u2192 more depth \u2192 shorter SSD.'
			}
		];
		if (mode === 'error') {
			s.push({
				t: 'Actual SSD (setup error)',
				f:
					'Actual SSD = planned SSD + error\n= ' +
					f1(trueAnswers.ssd) +
					' + (' +
					probError +
					') = ' +
					f1(trueAnswers.actualSsd) +
					' cm',
				x: 'A table height error moves the skin toward or away from the source, changing the SSD actually delivered.'
			});
			s.push({
				t: 'Actual Skin Dose',
				f:
					'Dose = 100 × (planned SSD / actual SSD)²\n= 100 × (' +
					f1(trueAnswers.ssd) +
					'/' +
					f1(trueAnswers.actualSsd) +
					')² = ' +
					f1(trueAnswers.actualDose) +
					' %',
				x: 'By inverse-square, skin closer than planned gets MORE than 100% of dose (and vice-versa) — why small setup errors matter.'
			});
		} else {
			s.push({
				t: 'Skin Field Size',
				f:
					'FS = jaw × (SSD / SAD)\n= ' +
					probJaw +
					' × (' +
					f1(trueAnswers.ssd) +
					'/100) = ' +
					f1(trueAnswers.fsSkin) +
					' cm',
				x: 'Similar triangles: the field diverges from the source, so at the skin (closer than iso) it is smaller than the jaw setting at iso.'
			});
			s.push({
				t: 'Skin Relative Dose',
				f:
					'Dose = 100 × (SAD / SSD)²\n= 100 × (100/' +
					f1(trueAnswers.ssd) +
					')² = ' +
					f1(trueAnswers.doseSkin) +
					' %',
				x: 'Inverse-square: the skin is closer to the source than iso, so it sees a higher dose rate than the 100% reference at iso.'
			});
			s.push({
				t: 'Receptor Field Size',
				f:
					'FS = jaw × (SID / SAD)\n= ' +
					probJaw +
					' × (' +
					probSid +
					'/100) = ' +
					f1(trueAnswers.fsRec) +
					' cm',
				x: 'The receptor sits beyond isocenter (SID > SAD), so the diverging field is magnified there — larger than the jaw setting.'
			});
			s.push({
				t: 'Receptor Relative Dose',
				f:
					'Dose = 100 × (SAD / SID)²\n= 100 × (100/' +
					probSid +
					')² = ' +
					f1(trueAnswers.doseRec) +
					' %',
				x: 'Beyond isocenter the beam has spread out, so by inverse-square the dose rate at the receptor is lower than at iso.'
			});
		}
		return s;
	}
	function showGuidedStep(i) {
		guidedIdx = Math.max(0, Math.min(guidedSteps.length - 1, i));
		const st = guidedSteps[guidedIdx];
		$('bd-guided-title').textContent = 'Step ' + (guidedIdx + 1) + ' \u00b7 ' + st.t;
		$('bd-guided-formula').textContent = st.f;
		$('bd-guided-explain').textContent = st.x;
		$('bd-guided-progress').textContent = 'Step ' + (guidedIdx + 1) + ' of ' + guidedSteps.length;
		$('bd-guided-prev').disabled = guidedIdx === 0;
		$('bd-guided-next').disabled = guidedIdx === guidedSteps.length - 1;
	}
	function stopGuidedAuto() {
		if (guidedTimer) {
			clearInterval(guidedTimer);
			guidedTimer = null;
			$('bd-guided-auto').textContent = 'Auto Play';
		}
	}
	function openGuided() {
		guidedSteps = buildGuidedSteps();
		$('bd-guided').classList.add('active');
		showGuidedStep(0);
	}
	function guidedStep(dir) {
		if (guidedIdx + dir >= guidedSteps.length || guidedIdx + dir < 0) {
			if (dir > 0) stopGuidedAuto();
			return;
		}
		showGuidedStep(guidedIdx + dir);
	}
	function toggleGuidedAuto() {
		if (guidedTimer) {
			stopGuidedAuto();
			return;
		}
		if (!$('bd-guided').classList.contains('active')) openGuided();
		$('bd-guided-auto').textContent = '\u23f8 Pause';
		guidedTimer = setInterval(() => {
			if (guidedIdx >= guidedSteps.length - 1) {
				stopGuidedAuto();
				return;
			}
			showGuidedStep(guidedIdx + 1);
		}, 2600);
	}
	function checkAnswers() {
		let allCorrect = true;
		const checkField = (input, fbk, trueVal) => {
			if (input.closest('.bd-quiz-row').style.display === 'none') return;
			const val = parseFloat(input.value);
			if (isNaN(val)) {
				fbk.textContent = '\u2753';
				input.className = 'incorrect';
				allCorrect = false;
				return;
			}
			if (Math.abs(val - trueVal) <= 0.2) {
				fbk.textContent = '\u2705';
				input.className = 'correct';
			} else {
				fbk.textContent = '\u274C';
				input.className = 'incorrect';
				allCorrect = false;
			}
		};
		checkField(ans.ssd, fb.ssd, trueAnswers.ssd);
		checkField(ans.actualSsd, fb.actualSsd, trueAnswers.actualSsd);
		checkField(ans.fsSkin, fb.fsSkin, trueAnswers.fsSkin);
		checkField(ans.doseSkin, fb.doseSkin, trueAnswers.doseSkin);
		checkField(ans.actualDose, fb.actualDose, trueAnswers.actualDose);
		checkField(ans.fsRec, fb.fsRec, trueAnswers.fsRec);
		checkField(ans.doseRec, fb.doseRec, trueAnswers.doseRec);
		const msg = $('bd-final-feedback');
		if (allCorrect) {
			msg.textContent = 'Perfect! Calculations are acceptable.';
			msg.style.color = '#00ff00';
		} else {
			msg.textContent = 'Review your formulas and try again.';
			msg.style.color = '#ff3333';
		}
	}
	S.bdSyncFromMachine = (control, delta) => {
		if (control === 'gantry') {
			let v = (parseFloat(ui.gantry.value) + delta) % 360;
			if (v < 0) v += 360;
			ui.gantry.value = v;
		} else if (control === 'jaw') {
			ui.jaw.value = Math.max(
				parseFloat(ui.jaw.min),
				Math.min(parseFloat(ui.jaw.max), parseFloat(ui.jaw.value) + delta)
			);
		}
		updateVisualizer();
	};
	ui.mode.addEventListener('change', generateScenario);
	[ui.gantry, ui.jaw, ui.sid, ui.err].forEach((i) => i.addEventListener('input', updateVisualizer));
	$('bd-btn-check').addEventListener('click', checkAnswers);
	$('bd-btn-new').addEventListener('click', generateScenario);
	{
		const rb = $('bd-btn-recap');
		if (rb) rb.addEventListener('click', playRecap);
	}
	{
		const gb = $('bd-btn-guided');
		if (gb)
			gb.addEventListener('click', () => {
				stopGuidedAuto();
				const p = $('bd-guided');
				if (p.classList.contains('active')) {
					p.classList.remove('active');
				} else {
					openGuided();
				}
			});
	}
	{
		const pv = $('bd-guided-prev');
		if (pv)
			pv.addEventListener('click', () => {
				stopGuidedAuto();
				guidedStep(-1);
			});
	}
	{
		const nx = $('bd-guided-next');
		if (nx)
			nx.addEventListener('click', () => {
				stopGuidedAuto();
				guidedStep(1);
			});
	}
	{
		const au = $('bd-guided-auto');
		if (au) au.addEventListener('click', toggleGuidedAuto);
	}
	generateScenario();
	bdLive = false; // clinical mode: lab remains independent from physical machine controls
})();

// ================= Start screen and compact controls =================
(function () {
	const screen = document.getElementById('startScreen');
	const skip = document.getElementById('skipStartNextTime');
	const closeStart = (tabId) => {
		localStorage.setItem('linacSkipStartScreen', skip && skip.checked ? 'true' : 'false');
		if (screen) screen.style.display = 'none';
		if (tabId) {
			const btn = document.querySelector('.tab-button[data-tab="' + tabId + '"]');
			if (btn) btn.click();
		}
		if (typeof onWindowResize === 'function') setTimeout(onWindowResize, 20);
	};
	if (localStorage.getItem('linacSkipStartScreen') === 'true' && screen)
		screen.style.display = 'none';
	document
		.getElementById('startLab')
		?.addEventListener('click', () => closeStart('divergenceContent'));
	document.getElementById('startFresh')?.addEventListener('click', () => {
		['linacSkipStartScreen'].forEach((k) => localStorage.removeItem(k));
		localStorage.setItem('linacSkipStartScreen', skip && skip.checked ? 'true' : 'false');
		location.reload();
	});
	const panel = document.getElementById('bottomMachineControls');
	const toggle = document.getElementById('controlsCollapseButton');
	toggle?.addEventListener('click', () => {
		panel.classList.toggle('compact-collapsed');
		const collapsed = panel.classList.contains('compact-collapsed');
		toggle.textContent = collapsed ? 'Open Pendant' : 'Close Pendant';
		toggle.setAttribute('aria-expanded', String(!collapsed));
		if (typeof onWindowResize === 'function') setTimeout(onWindowResize, 20);
	});
	if (toggle) {
		toggle.textContent = 'Open Pendant';
		toggle.setAttribute('aria-expanded', 'false');
	}
})();

// ================= Adjustable side panel (drag to resize) =================
(function () {
	const resizer = document.getElementById('panelResizer');
	const sidePanelEl = document.getElementById('sidePanel');
	const mainArea = document.getElementById('mainGameArea');
	if (!resizer || !sidePanelEl || !mainArea) return;
	let dragging = false;
	const applyWidth = (px) => {
		const min = 280,
			max = Math.max(min, mainArea.clientWidth - 340);
		const w = Math.max(min, Math.min(max, px));
		sidePanelEl.style.width = w + 'px';
		if (typeof onWindowResize === 'function') onWindowResize();
	};
	const onMove = (e) => {
		if (!dragging) return;
		const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
		applyWidth(mainArea.getBoundingClientRect().right - 10 - clientX);
		e.preventDefault();
	};
	const stop = () => {
		if (!dragging) return;
		dragging = false;
		resizer.classList.remove('dragging');
		document.body.style.userSelect = '';
	};
	const start = (e) => {
		dragging = true;
		resizer.classList.add('dragging');
		document.body.style.userSelect = 'none';
		e.preventDefault();
	};
	resizer.addEventListener('mousedown', start);
	resizer.addEventListener('touchstart', start, { passive: false });
	window.addEventListener('mousemove', onMove);
	window.addEventListener('touchmove', onMove, { passive: false });
	window.addEventListener('mouseup', stop);
	window.addEventListener('touchend', stop);
})();

// ================= IGRT Imaging Lab (CBCT + orthogonal kV pair) =================
(function () {
	const $ = (id) => document.getElementById(id);
	const modeSel = $('img-mode'),
		runBtn = $('img-run'),
		progBar = $('img-prog-bar'),
		statusEl = $('img-status');
	const display = $('img-display'),
		viewNote = $('img-view-note');
	const inLat = $('img-lat'),
		inLng = $('img-lng'),
		inVrt = $('img-vrt');
	const fbLat = $('img-fb-lat'),
		fbLng = $('img-fb-lng'),
		fbVrt = $('img-fb-vrt');
	const inRoll = $('img-roll'),
		inPitch = $('img-pitch'),
		inYaw = $('img-yaw');
	const fbRoll = $('img-fb-roll'),
		fbPitch = $('img-fb-pitch'),
		fbYaw = $('img-fb-yaw');
	const checkBtn = $('img-check'),
		finalMsg = $('img-final'),
		newBtn = $('img-new');
	if (!modeSel) return;
	const transIn = [inLat, inLng, inVrt],
		rotIn = [inRoll, inPitch, inYaw],
		allIn = transIn.concat(rotIn);
	const allFb = [fbLat, fbLng, fbVrt, fbRoll, fbPitch, fbYaw];
	const PXMM = 2.5;
	let shift = { lat: 0, lng: 0, vrt: 0, roll: 0, pitch: 0, yaw: 0 },
		acquired = false,
		busy = false,
		gantryRAF = null,
		acqMode = null,
		curSite = null;
	const num = (el) => parseFloat(el.value) || 0;
	const userShift = () => ({
		lat: num(inLat),
		lng: num(inLng),
		vrt: num(inVrt),
		roll: num(inRoll),
		pitch: num(inPitch),
		yaw: num(inYaw)
	});
	const residual = () => {
		const u = userShift();
		return {
			lat: shift.lat - u.lat,
			lng: shift.lng - u.lng,
			vrt: shift.vrt - u.vrt,
			roll: shift.roll - u.roll,
			pitch: shift.pitch - u.pitch,
			yaw: shift.yaw - u.yaw
		};
	};
	const rndR = () => Math.round((Math.random() * 6 - 3) * 2) / 2; // -3..3° in 0.5° steps

	const rnd = () => Math.round((Math.random() * 16 - 8) * 2) / 2; // -8..8 in 0.5-mm steps
	function newSetup() {
		if (busy) return;
		shift = { lat: rnd(), lng: rnd(), vrt: rnd(), roll: rndR(), pitch: rndR(), yaw: rndR() };
		if (Math.abs(shift.lat) + Math.abs(shift.lng) + Math.abs(shift.vrt) < 2) shift.lat = 4;
		// pick a treatment site and a clinically sensible orientation, and set the 3D patient up for it
		const sites = typeof IMAGING_SITES !== 'undefined' ? IMAGING_SITES : null;
		if (sites) {
			curSite = sites[Math.floor(Math.random() * sites.length)];
			const orient = curSite.orient[Math.floor(Math.random() * curSite.orient.length)];
			curSite._orient = orient;
			if (typeof runPatientSetup === 'function') runPatientSetup(orient, curSite.z);
			const siteEl = $('img-site');
			if (siteEl)
				siteEl.innerHTML =
					'Treatment site: <b>' +
					curSite.name +
					'</b> \u2014 isocenter localized in 3D; patient set up <b>' +
					((typeof PATIENT_POS_NAMES !== 'undefined' && PATIENT_POS_NAMES[orient]) || orient) +
					'</b>.';
		}
		acquired = false;
		acqMode = null;
		display.innerHTML =
			'<div style="color:#666;font-size:0.85rem;padding:20px;text-align:center;">Images will appear here after acquisition.</div>';
		display.className = 'imgl-imgs';
		viewNote.textContent = '';
		allIn.forEach((i) => {
			i.value = '';
			i.className = '';
			i.disabled = true;
		});
		allFb.forEach((f) => (f.textContent = ''));
		checkBtn.disabled = true;
		finalMsg.textContent = '';
		progBar.style.width = '0%';
		runBtn.disabled = false;
		if (typeof setImagingError6DOF === 'function') setImagingError6DOF(null); // patient back on isocenter
		statusEl.textContent = 'Ready — press Run Acquisition.';
	}

	function sweepGantry(fromRad, toRad, dur, onProgress) {
		return new Promise((resolve) => {
			if (typeof S.gantryRotatingGroup === 'undefined' || !S.gantryRotatingGroup) {
				resolve();
				return;
			}
			const t0 = performance.now();
			if (gantryRAF) cancelAnimationFrame(gantryRAF);
			const step = (t) => {
				const p = Math.min(1, (t - t0) / dur);
				S.gantryRotatingGroup.rotation.z = fromRad + (toRad - fromRad) * p;
				if (onProgress) onProgress(p);
				if (p < 1) gantryRAF = requestAnimationFrame(step);
				else resolve();
			};
			gantryRAF = requestAnimationFrame(step);
		});
	}
	const rotGantryTo = (targetRad, dur) =>
		new Promise((resolve) => {
			if (typeof S.gantryRotatingGroup === 'undefined' || !S.gantryRotatingGroup) {
				resolve();
				return;
			}
			const start = S.gantryRotatingGroup.rotation.z,
				t0 = performance.now();
			if (gantryRAF) cancelAnimationFrame(gantryRAF);
			const step = (t) => {
				const p = Math.min(1, (t - t0) / dur),
					e = 0.5 - 0.5 * Math.cos(Math.PI * p);
				S.gantryRotatingGroup.rotation.z = start + (targetRad - start) * e;
				if (p < 1) gantryRAF = requestAnimationFrame(step);
				else resolve();
			};
			gantryRAF = requestAnimationFrame(step);
		});
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));

	async function runAcquisition() {
		if (busy || acquired) return;
		busy = true;
		runBtn.disabled = true;
		newBtn.disabled = true;
		const mode = modeSel.value;
		acqMode = mode;
		if (typeof setKvState === 'function') setKvState(true);
		if (mode === 'cbct') {
			statusEl.textContent = 'CBCT: acquiring projections…';
			await sweepGantry(0, -Math.PI * 1.15, 2600, (p) => {
				progBar.style.width = Math.round(p * 85) + '%';
			});
			statusEl.textContent = 'Reconstructing volume…';
			progBar.style.width = '92%';
			await wait(700);
			progBar.style.width = '100%';
			await rotGantryTo(0, 700);
			renderCBCT();
			statusEl.textContent = 'CBCT reconstructed — read the offset and enter the shift.';
		} else {
			statusEl.textContent = 'kV pair: acquiring AP (gantry 0°)…';
			await rotGantryTo(0, 700);
			progBar.style.width = '30%';
			await wait(500);
			statusEl.textContent = 'kV pair: acquiring Lateral (gantry 90°)…';
			await rotGantryTo(-Math.PI / 2, 900);
			progBar.style.width = '75%';
			await wait(500);
			progBar.style.width = '100%';
			await rotGantryTo(0, 700);
			renderOrtho();
			statusEl.textContent = 'Two orthogonal images acquired — enter the shift.';
		}
		if (typeof setKvState === 'function') setKvState(false);
		acquired = true;
		busy = false;
		transIn.concat([inPitch, inYaw]).forEach((i) => (i.disabled = false));
		if (mode === 'cbct') {
			inRoll.disabled = false;
		} else {
			shift.roll = 0;
			inRoll.value = '0';
			inRoll.disabled = true;
		} // orthogonal pair can't resolve roll
		checkBtn.disabled = false;
		newBtn.disabled = false;
		runBtn.disabled = true;
	}

	// target drawn at (-shift) from iso; anatomy tilts by residual rotation about iso
	function svgView(opts) {
		const c = 130,
			dh = -opts.h * PXMM,
			dv = -opts.v * PXMM,
			tx = c + dh,
			ty = c - dv,
			rot = opts.rot || 0;
		// eslint-disable-next-line no-useless-assignment -- pre-existing dead code, tracked in #77 phase 2 report
		let body = '';
		if (opts.site === 'brain') {
			if (opts.shape === 'axial') {
				body =
					'<circle cx="130" cy="130" r="68" fill="#2b2b2b" stroke="#cfcfcf" stroke-width="5"/><circle cx="130" cy="130" r="55" fill="#39323a"/>' +
					'<path d="M96,130 Q130,102 164,130 Q159,159 130,163 Q101,159 96,130 Z" fill="#483f49" stroke="#5a4f5c" stroke-width="1.5"/><line x1="130" y1="80" x2="130" y2="180" stroke="#5a4f5c" stroke-width="1.5"/>';
			} else {
				body =
					'<path d="M96,42 Q130,20 164,42 Q176,82 168,120 Q160,150 150,168 L152,214 L108,214 L110,168 Q100,150 92,120 Q84,82 96,42 Z" fill="#2b2b2b" stroke="#9a9a9a" stroke-width="2"/><ellipse cx="130" cy="94" rx="30" ry="34" fill="#39323a"/>';
			}
		} else if (opts.site === 'femur') {
			if (opts.shape === 'axial') {
				body =
					'<ellipse cx="130" cy="130" rx="72" ry="66" fill="#3a2f2f"/><circle cx="130" cy="128" r="20" fill="#e8e2d0" stroke="#b8ae94" stroke-width="3"/><circle cx="130" cy="128" r="9" fill="#c9bd9c"/>';
			} else {
				body =
					'<ellipse cx="130" cy="130" rx="52" ry="118" fill="#3a2f2f" opacity="0.85"/><rect x="116" y="34" width="28" height="192" rx="12" fill="#e8e2d0" stroke="#b8ae94" stroke-width="2"/>' +
					'<ellipse cx="130" cy="40" rx="24" ry="15" fill="#e8e2d0" stroke="#b8ae94" stroke-width="2"/><ellipse cx="130" cy="220" rx="24" ry="15" fill="#e8e2d0" stroke="#b8ae94" stroke-width="2"/><rect x="123" y="60" width="14" height="140" rx="6" fill="#c9bd9c"/>';
			}
		} else if (opts.shape === 'axial') {
			body =
				'<ellipse cx="130" cy="130" rx="108" ry="66" fill="#2b2b2b" stroke="#6a6a6a" stroke-width="2"/>' +
				(opts.site === 'chest'
					? '<ellipse cx="95" cy="120" rx="30" ry="34" fill="#141414"/><ellipse cx="165" cy="120" rx="30" ry="34" fill="#141414"/>'
					: '') +
				(opts.site === 'pelvis'
					? '<path d="M70,150 Q100,140 128,152 L128,180 Q100,176 78,186 Z" fill="#c9c0a8"/><path d="M190,150 Q160,140 132,152 L132,180 Q160,176 182,186 Z" fill="#c9c0a8"/>'
					: '') +
				'<circle cx="130" cy="176" r="' +
				(opts.site === 'spine' ? 15 : 12) +
				'" fill="' +
				(opts.site === 'spine' ? '#c9c0a8' : '#4a4a4a') +
				'"/><circle cx="130" cy="176" r="5" fill="#222"/>';
		} else if (opts.shape === 'coronal') {
			body =
				'<path d="M60,30 Q130,10 200,30 L196,238 Q130,252 64,238 Z" fill="#2b2b2b" stroke="#6a6a6a" stroke-width="2"/><rect x="124" y="40" width="12" height="200" rx="4" fill="' +
				(opts.site === 'spine' ? '#c9c0a8' : '#4a4a4a') +
				'"/>';
			for (let y = 46; y < 236; y += 22)
				body +=
					'<rect x="121" y="' +
					y +
					'" width="18" height="12" rx="3" fill="' +
					(opts.site === 'spine' ? '#b3a988' : '#3a3a3a') +
					'"/>';
		} else if (opts.shape === 'sagittal') {
			body =
				'<ellipse cx="130" cy="130" rx="58" ry="112" fill="#2b2b2b" stroke="#6a6a6a" stroke-width="2"/><rect x="150" y="34" width="12" height="192" rx="4" fill="' +
				(opts.site === 'spine' ? '#c9c0a8' : '#4a4a4a') +
				'"/>';
			for (let y = 40; y < 222; y += 22)
				body +=
					'<rect x="147" y="' +
					y +
					'" width="18" height="12" rx="3" fill="' +
					(opts.site === 'spine' ? '#b3a988' : '#3a3a3a') +
					'"/>';
		} else if (opts.shape === 'ap') {
			body =
				'<rect x="34" y="18" width="192" height="224" rx="26" fill="#333" opacity="0.85"/><rect x="122" y="26" width="16" height="208" rx="5" fill="#8a8a8a" opacity="0.7"/>';
			for (let y = 32; y < 232; y += 20)
				body +=
					'<rect x="118" y="' + y + '" width="24" height="12" rx="3" fill="#aaa" opacity="0.6"/>';
			body +=
				'<ellipse cx="90" cy="210" rx="34" ry="24" fill="#777" opacity="0.5"/><ellipse cx="170" cy="210" rx="34" ry="24" fill="#777" opacity="0.5"/>';
		} else {
			body =
				'<path d="M70,18 Q150,26 150,130 Q150,236 70,242 L60,242 Q52,130 60,18 Z" fill="#333" opacity="0.85"/><rect x="70" y="24" width="14" height="212" rx="5" fill="#8a8a8a" opacity="0.7"/>';
			for (let y = 30; y < 232; y += 20)
				body +=
					'<rect x="66" y="' + y + '" width="22" height="12" rx="3" fill="#aaa" opacity="0.6"/>';
		}
		const grat =
			'<line x1="130" y1="6" x2="130" y2="254" stroke="#00e0ff" stroke-width="1" stroke-dasharray="3,4" opacity="0.8"/>' +
			'<line x1="6" y1="130" x2="254" y2="130" stroke="#00e0ff" stroke-width="1" stroke-dasharray="3,4" opacity="0.8"/>' +
			'<circle cx="130" cy="130" r="4" fill="none" stroke="#00e0ff" stroke-width="1.4"/><text x="136" y="16" fill="#00e0ff" font-size="11" font-family="monospace">ISO</text>';
		const target =
			'<circle cx="' +
			tx +
			'" cy="' +
			ty +
			'" r="9" fill="none" stroke="#ff3df0" stroke-width="2.5"/>' +
			'<line x1="' +
			(tx - 13) +
			'" y1="' +
			ty +
			'" x2="' +
			(tx + 13) +
			'" y2="' +
			ty +
			'" stroke="#ff3df0" stroke-width="1.5"/>' +
			'<line x1="' +
			tx +
			'" y1="' +
			(ty - 13) +
			'" x2="' +
			tx +
			'" y2="' +
			(ty + 13) +
			'" stroke="#ff3df0" stroke-width="1.5"/>';
		const patient =
			'<g transform="rotate(' + rot.toFixed(2) + ' 130 130)">' + body + target + '</g>';
		const labels =
			'<text x="130" y="250" fill="#999" font-size="11" text-anchor="middle" font-family="monospace">' +
			opts.caption +
			'</text>' +
			'<text x="248" y="126" fill="#777" font-size="11" text-anchor="end" font-family="monospace">' +
			opts.hPos +
			'</text>' +
			'<text x="12" y="126" fill="#777" font-size="11" font-family="monospace">' +
			opts.hNeg +
			'</text>';
		return (
			'<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">' +
			patient +
			grat +
			labels +
			'</svg>'
		);
	}
	function renderCBCT() {
		const r = residual();
		if (typeof setImagingError6DOF === 'function') setImagingError6DOF(r);
		const sk = curSite ? curSite.key : null,
			sn = curSite ? curSite.name : '';
		display.innerHTML =
			svgView({
				shape: 'axial',
				site: sk,
				h: r.lat,
				v: r.vrt,
				rot: r.roll,
				caption: 'Axial \u00b7 roll',
				hPos: 'L',
				hNeg: 'R'
			}) +
			svgView({
				shape: 'coronal',
				site: sk,
				h: r.lat,
				v: r.lng,
				rot: r.yaw,
				caption: 'Coronal \u00b7 yaw',
				hPos: 'L',
				hNeg: 'R'
			}) +
			svgView({
				shape: 'sagittal',
				site: sk,
				h: r.vrt,
				v: r.lng,
				rot: r.pitch,
				caption: 'Sagittal \u00b7 pitch',
				hPos: 'A',
				hNeg: 'P'
			});
		display.className = 'imgl-imgs imgl-three';
		viewNote.innerHTML =
			'<b>' +
			sn +
			'</b> CBCT \u2014 resolves all 6 DOF. Axial \u2192 Lat/Vrt + <b>roll</b>; Coronal \u2192 Lat/Lng + <b>yaw</b>; Sagittal \u2192 Vrt/Lng + <b>pitch</b>. Drive the target onto the cross and straighten the anatomy against the graticule.';
	}
	function renderOrtho() {
		const r = residual();
		if (typeof setImagingError6DOF === 'function') setImagingError6DOF(r);
		const sk = curSite ? curSite.key : null,
			sn = curSite ? curSite.name : '';
		display.innerHTML =
			svgView({
				shape: 'ap',
				site: sk,
				h: r.lat,
				v: r.lng,
				rot: r.yaw,
				caption: 'AP \u00b7 yaw (gantry 0\u00b0)',
				hPos: 'L',
				hNeg: 'R'
			}) +
			svgView({
				shape: 'lat',
				site: sk,
				h: r.vrt,
				v: r.lng,
				rot: r.pitch,
				caption: 'Lateral \u00b7 pitch (gantry 90\u00b0)',
				hPos: 'A',
				hNeg: 'P'
			});
		display.className = 'imgl-imgs';
		viewNote.innerHTML =
			'<b>' +
			sn +
			'</b> orthogonal pair. AP \u2192 Lat/Lng + <b>yaw</b>; Lateral \u2192 Vrt/Lng + <b>pitch</b>. An orthogonal pair cannot resolve <b>roll</b> (about the S-I axis) \u2014 that needs volumetric CBCT, so Roll is disabled here.';
	}
	function redrawImages() {
		if (!acqMode) return;
		if (acqMode === 'cbct') renderCBCT();
		else renderOrtho();
	}
	function checkImgAnswer() {
		if (!acquired) return;
		let ok = true;
		const chk = (input, fb, target, tol) => {
			if (input.disabled) {
				fb.textContent = '';
				input.className = '';
				return;
			} // e.g. roll in ortho
			const v = parseFloat(input.value);
			if (isNaN(v)) {
				fb.textContent = '\u2753';
				input.className = 'incorrect';
				ok = false;
				return;
			}
			if (Math.abs(v - target) <= tol) {
				fb.textContent = '\u2705';
				input.className = 'correct';
			} else {
				fb.textContent = '\u274C';
				input.className = 'incorrect';
				ok = false;
			}
		};
		chk(inLat, fbLat, shift.lat, 1.0);
		chk(inLng, fbLng, shift.lng, 1.0);
		chk(inVrt, fbVrt, shift.vrt, 1.0);
		chk(inRoll, fbRoll, shift.roll, 0.5);
		chk(inPitch, fbPitch, shift.pitch, 0.5);
		chk(inYaw, fbYaw, shift.yaw, 0.5);
		if (ok) {
			finalMsg.textContent = 'Setup corrected \u2014 anatomy is aligned to isocenter in 6DOF.';
			finalMsg.style.color = '#00ff00';
		} else {
			finalMsg.textContent =
				'Check the direction (sign) and size of each translation and rotation.';
			finalMsg.style.color = '#ff3333';
		}
	}
	modeSel.addEventListener('change', newSetup);
	runBtn.addEventListener('click', runAcquisition);
	checkBtn.addEventListener('click', checkImgAnswer);
	newBtn.addEventListener('click', newSetup);
	allIn.forEach((i) => i.addEventListener('input', redrawImages));
	// Machine Controls couch drives feed the imaging shift while an acquisition is loaded
	window.imagingCouchShift = function (axis, delta) {
		if (!acquired) return false;
		const map = { lat: inLat, lng: inLng, vrt: inVrt, roll: inRoll, pitch: inPitch, yaw: inYaw };
		const input = map[axis];
		if (!input || input.disabled) return false;
		input.value = ((parseFloat(input.value) || 0) + delta).toFixed(1);
		redrawImages();
		return true;
	};
	newSetup();

	const dicomBtn = $('img-dicom-launch'),
		dicomModal = document.getElementById('dicomModal'),
		dicomFrame = document.getElementById('dicomFrame'),
		dicomClose = document.getElementById('dicomClose');
	if (dicomBtn && dicomModal && dicomFrame) {
		dicomBtn.addEventListener('click', () => {
			const currentSrc = dicomFrame.getAttribute('src') || '';
			if (!currentSrc || currentSrc === 'about:blank') {
				dicomFrame.src = '/arcade/linac-ct/dicom-review.html';
			}
			dicomModal.style.display = 'block';
		});
		dicomClose.addEventListener('click', () => {
			dicomModal.style.display = 'none';
		});
	}

	const PENDANT_ICON_SVG = {
		room: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M8 14h8M12 10v8" stroke-width="1.6"/></svg>`,
		laser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/><circle cx="12" cy="12" r="2.4"/></svg>`,
		odi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4" stroke-width="1.5"/></svg>`,
		kv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="5" height="4" rx="1"/><path d="M8 12h4"/><circle cx="15.5" cy="12" r="3.5"/><path d="M19 8l2 2M19 16l2-2" stroke-width="1.6"/></svg>`,
		mv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M8 19v2M16 19v2M9 9h6M9 12h6M9 15h4" stroke-width="1.5"/></svg>`,
		beam: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l-1 5H9L8 3Z"/><path d="M9 8h6v4l-1.2 1.2v6.3a1.8 1.8 0 0 1-3.6 0v-6.3L9 12V8Z"/></svg>`,
		vaultView: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/></svg>`,
		consoleView: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="10" rx="1.8"/><path d="M8 19h8M12 15v4"/><path d="M7 9h4M13 9h4M7 12h10" stroke-width="1.5"/></svg>`,
		gantryMinus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 7.5A6.8 6.8 0 1 1 6 12"/><path d="M4.5 8 7.8 7.8 7.6 4.5"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>`,
		gantryPlus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 7.5A6.8 6.8 0 1 0 18 12"/><path d="M19.5 8 16.2 7.8 16.4 4.5"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>`,
		collMinus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="8" height="8" rx="1.2" transform="rotate(-18 12 12)"/><path d="M7 5.8A8.2 8.2 0 0 1 5.2 12"/><path d="M4.2 8.2 5.4 12l3.5-1"/></svg>`,
		collPlus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="8" height="8" rx="1.2" transform="rotate(18 12 12)"/><path d="M17 5.8A8.2 8.2 0 0 0 18.8 12"/><path d="M19.8 8.2 18.6 12l-3.5-1"/></svg>`,
		jawsClose: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="4" height="12" rx="1"/><rect x="16" y="6" width="4" height="12" rx="1"/><path d="M10 12h4"/><path d="M12 10l2 2-2 2M12 10l-2 2 2 2"/></svg>`,
		jawsOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="4" height="12" rx="1"/><rect x="16" y="6" width="4" height="12" rx="1"/><path d="M12 12H8M12 12h4"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2"/></svg>`,
		mlcClose: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h6M15 6h6M3 10h5M16 10h5M3 14h6M15 14h6M3 18h5M16 18h5"/><path d="M10 12h4"/><path d="M12 10l2 2-2 2M12 10l-2 2 2 2" stroke-width="1.5"/></svg>`,
		mlcOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h6M15 6h6M3 10h5M16 10h5M3 14h6M15 14h6M3 18h5M16 18h5"/><path d="M8 12h8"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2" stroke-width="1.5"/></svg>`,
		mlcShape: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h5M15 6h5M4 10h7M17 10h3M4 14h3M13 14h7M4 18h6M14 18h6"/><path d="M8 12h8" stroke-width="1.4"/></svg>`,
		arrowUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>`,
		arrowDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>`,
		arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>`,
		arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
		turnLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7a7 7 0 1 0 0 10"/><path d="M8 3 4 7l4 4"/></svg>`,
		turnRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7a7 7 0 1 1 0 10"/><path d="m16 3 4 4-4 4"/></svg>`,
		safety: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.4 2.6 7.8 7 10 4.4-2.2 7-5.6 7-10V6l-7-3Z"/><circle cx="12" cy="11" r="2.2"/><path d="M12 13.2V16.2"/></svg>`
	};
	function iconButtonMarkup(svg, title, sub) {
		return `<span class="btn-icon" aria-hidden="true">${svg}</span><span class="btn-copy"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>`;
	}
	function setButtonIcon(id, markup, ariaLabel) {
		const el = document.getElementById(id);
		if (!el) return;
		el.innerHTML = markup;
		if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
	}
	function setRockerIcon(id, svg, ariaLabel) {
		const el = document.getElementById(id);
		if (!el) return;
		el.classList.add('icon-only');
		el.innerHTML = `<span class="btn-icon" aria-hidden="true">${svg}</span>`;
		if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
	}
	function applyPendantControlIcons() {
		const buttonGroups = document.querySelectorAll('.machine-control-button-group.motion-control');
		buttonGroups.forEach((group) => group.classList.add('iconized'));
		setButtonIcon(
			'gantryRotateMinusButton',
			iconButtonMarkup(PENDANT_ICON_SVG.gantryMinus, 'Gantry', '−5°'),
			'Rotate gantry counterclockwise by 5 degrees'
		);
		setButtonIcon(
			'gantryRotatePlusButton',
			iconButtonMarkup(PENDANT_ICON_SVG.gantryPlus, 'Gantry', '+5°'),
			'Rotate gantry clockwise by 5 degrees'
		);
		setButtonIcon(
			'collimatorRotateMinusButton',
			iconButtonMarkup(PENDANT_ICON_SVG.collMinus, 'Coll', '−5°'),
			'Rotate collimator counterclockwise by 5 degrees'
		);
		setButtonIcon(
			'collimatorRotatePlusButton',
			iconButtonMarkup(PENDANT_ICON_SVG.collPlus, 'Coll', '+5°'),
			'Rotate collimator clockwise by 5 degrees'
		);
		setButtonIcon(
			'jawsCloseButton',
			iconButtonMarkup(PENDANT_ICON_SVG.jawsClose, 'Jaws', 'Close'),
			'Close all four jaws symmetrically'
		);
		setButtonIcon(
			'jawsOpenButton',
			iconButtonMarkup(PENDANT_ICON_SVG.jawsOpen, 'Jaws', 'Open'),
			'Open all four jaws symmetrically'
		);
		setButtonIcon(
			'mlcCloseButton',
			iconButtonMarkup(PENDANT_ICON_SVG.mlcClose, 'MLC', '−1 cm'),
			'Close MLC aperture by 1 centimeter'
		);
		setButtonIcon(
			'mlcOpenButton',
			iconButtonMarkup(PENDANT_ICON_SVG.mlcOpen, 'MLC', '+1 cm'),
			'Open MLC aperture by 1 centimeter'
		);
		const mlcShape = document.getElementById('mlcShapeButton');
		if (mlcShape) {
			mlcShape.classList.add('iconized-shape');
			mlcShape.innerHTML = `<span class="btn-icon" aria-hidden="true">${PENDANT_ICON_SVG.mlcShape}</span><span class="btn-copy"><b>Shape</b><small>Square</small></span>`;
			mlcShape.setAttribute('aria-label', 'Cycle MLC shape preset');
		}
		setRockerIcon('couchDownButton', PENDANT_ICON_SVG.arrowDown, 'Move couch vertical down');
		setRockerIcon('couchUpButton', PENDANT_ICON_SVG.arrowUp, 'Move couch vertical up');
		setRockerIcon('couchOutButton', PENDANT_ICON_SVG.arrowLeft, 'Move couch out');
		setRockerIcon('couchInButton', PENDANT_ICON_SVG.arrowRight, 'Move couch in');
		setRockerIcon('couchRightButton', PENDANT_ICON_SVG.arrowRight, 'Move couch right');
		setRockerIcon('couchLeftButton', PENDANT_ICON_SVG.arrowLeft, 'Move couch left');
		setRockerIcon('couchRollMinusButton', PENDANT_ICON_SVG.turnLeft, 'Rotate couch roll negative');
		setRockerIcon('couchRollPlusButton', PENDANT_ICON_SVG.turnRight, 'Rotate couch roll positive');
		setRockerIcon(
			'couchPitchMinusButton',
			PENDANT_ICON_SVG.arrowDown,
			'Rotate couch pitch negative'
		);
		setRockerIcon('couchPitchPlusButton', PENDANT_ICON_SVG.arrowUp, 'Rotate couch pitch positive');
		setRockerIcon('couchYawMinusButton', PENDANT_ICON_SVG.turnLeft, 'Rotate couch yaw negative');
		setRockerIcon('couchYawPlusButton', PENDANT_ICON_SVG.turnRight, 'Rotate couch yaw positive');
		const motionEnable = document.getElementById('pendantMotionEnable');
		if (motionEnable) {
			motionEnable.innerHTML = `<span class="enable-dot"></span><span class="enable-icon" aria-hidden="true">${PENDANT_ICON_SVG.safety}</span><span><b>MOTION ENABLE</b><small>Dead-man safety · click to arm/disarm</small></span>`;
		}
		const fnButtons = [
			[
				'roomLightsToggleButton',
				'room',
				'ROOM',
				'Lights ON',
				'room',
				'Toggle treatment-room lights'
			],
			['lasersToggleButton', 'laser', 'LASER', 'Align', 'laser', 'Toggle alignment lasers'],
			['odiToggleButton', 'odi', 'ODI', 'SSD', 'odi', 'Toggle ODI readout'],
			['kvToggleButton', 'kv', 'kV', 'Imaging', 'kv', 'Toggle kV imaging arms'],
			['detectorToggleButton', 'mv', 'MV', 'EPID', 'mv', 'Toggle MV detector panel'],
			['beamOnButton', 'beam', 'BEAM', 'Visualize', 'beam', 'Toggle beam visualization'],
			[
				'viewVaultButton',
				'vaultView',
				'VAULT',
				'Travel',
				'travel',
				'Travel to the treatment vault view'
			],
			[
				'viewControlRoomButton',
				'consoleView',
				'CONSOLE',
				'Travel',
				'travel',
				'Travel to the control console room view'
			]
		];
		fnButtons.forEach(([id, iconKey, label, sub, color, aria]) => {
			const el = document.getElementById(id);
			if (!el) return;
			el.dataset.keyColor = color;
			el.innerHTML = `<span class="fn-icon" aria-hidden="true">${PENDANT_ICON_SVG[iconKey]}</span><b>${label}</b><small>${sub}</small>`;
			el.setAttribute('aria-label', aria);
		});
		setRoomLightsState(S.roomLightsOn);
		syncRoomViewButtons(S.currentRoomView);
	}
	applyPendantControlIcons();

	// Standalone fundamentals mode: ODI and MLC are core controls, not game-store upgrades.
	[odiToggleButton, mlcOpenButton, mlcCloseButton, mlcShapeButton].forEach((btn) => {
		if (btn) btn.disabled = false;
	});
	updateBEVInset();
})();

/* ===== RTApps console mirror state bridge =====
           The enhanced console UI is implemented in a later classic script.
           Module-scoped clinical state is not directly visible there, so expose
           a narrow read-only snapshot instead of leaking module variables. */
window.RTAppsLinacMirrorBridge = {
	snapshot() {
		try {
			const plan =
				typeof deliveryCasePlan === 'function'
					? deliveryCasePlan()
					: { mu: 0, doseRate: 0, mode: 'STATIC', geometry: {} };
			const readyInfo =
				typeof getDeliveryReadiness === 'function'
					? getDeliveryReadiness()
					: { ready: false, checks: [] };
			const progress =
				typeof deliveryProgressFraction === 'function' ? deliveryProgressFraction(plan) : 0;
			const dyn =
				typeof getDynamicFieldState === 'function' ? getDynamicFieldState(plan, progress) : null;
			const activeFields = typeof getTreatmentFields === 'function' ? getTreatmentFields() : [];
			return {
				activeTreatmentCase: S.activeTreatmentCase,
				treatmentDelivery: S.treatmentDelivery,
				treatmentCompletion: S.treatmentCompletion,
				specialSetupWorkflow: S.specialSetupWorkflow,
				fundamentalState,
				plan,
				readyInfo,
				dyn,
				activeFields,
				allFieldsCompleted:
					typeof allTreatmentFieldsCompleted === 'function'
						? !!allTreatmentFieldsCompleted()
						: false
			};
			// eslint-disable-next-line no-unreachable -- pre-existing bug: statement placed after return, never executes; tracked in #77 phase 2 report
			window.dispatchEvent(new CustomEvent('rtapps-linac-bridge-ready'));
		} catch (err) {
			console.warn('RTApps mirror bridge snapshot unavailable.', err);
			return null;
		}
	}
};
