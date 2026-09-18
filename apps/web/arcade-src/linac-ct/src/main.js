// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import * as THREE from 'three-linac';
import { S } from './state.js';
import {
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
	oisOverrideReviewCheck,
	oisSignOff,
	adaptiveNextFraction,
	adaptiveResetCourse,
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
	internalViewButton,
	beamStagePrevButton,
	beamStageNextButton,
	asmBeamButton,
	asmStandButton,
	asmElectronButton,
	asmAccessoryButton,
	bevInset,
	bevCollapseButton,
	bevFieldGroup,
	bevFieldLight,
	bevMlcLeaves,
	bevJawMasks,
	bevJawOutline
} from './dom.js';
import {
	initThreeJS,
	setRoomLightsState,
	renderTreatmentMonitor,
	monitorPlannedDisplay,
	getTreatmentMonitorActual,
	setKvState,
	setInternalView,
	setAssembly,
	beamStageStep,
	updateCouchAccordion,
	updateJawPositions,
	updateElectronApplicator3D,
	updateMLCPositions,
	updateODIReadout,
	setODIState,
	applyDetectorCommandedPose,
	setDetectorStateGame,
	setBeamState,
	setLaserState,
	onWindowResize,
	ISOCENTER_Y_TARGET,
	GANTRY_PLANE_Z_TARGET,
	GROUND_Y,
	linacPartsData,
	MLC_MIN_CM,
	MLC_MAX_CM
} from './scene.js';
import { cctvFeeds, updateCCTVFeeds } from './cctv.js';
import {
	syncRoomViewButtons,
	travelToRoomView,
	updateTravelWorkflow,
	updateCameraTravel,
	updateVaultAesthetics
} from './travel.js';
import {
	acquireMotionCharacterization,
	activeElectronBolusSpec,
	activeSpecialSetupSpec,
	adaptiveRequired,
	adaptiveSpec,
	addImmobilizationDevice,
	advanceAdaptiveFraction,
	applyAdaptivePlan,
	applyImmobilizationRules,
	arcAngularState,
	armTreatmentDelivery,
	clearImmobilizationSelection,
	cranialSRSRequired,
	deliveredTreatmentMU,
	deliveryCasePlan,
	deliveryProgressFraction,
	electronBolusDeliveryOK,
	electronBolusDeliveryRequired,
	expectedTechnicalIGRTHandling,
	expectedTechnicalTreatmentCode,
	fmtSignedInt,
	getCurrentPlannedParameters,
	getDynamicFieldState,
	getTreatmentFields,
	handleSpecialSetupAction,
	holdTreatmentDelivery,
	IMAGING_SITES,
	IMMOBILIZATION_DEVICE_META,
	immobilizationRequired,
	immobilizationVerified,
	isFixedElectronField,
	loadTreatmentCase,
	motionRequired,
	normalizeAngleValue,
	oisLogEvent,
	parseFirstNumber,
	parseJawSpec,
	PATIENT_POS_NAMES,
	PATIENT_POSITIONS,
	persistOISSession,
	populateTreatmentCaseSelect,
	recheckSRSClearance,
	recordAdaptiveFractionDose,
	releaseDIBHHold,
	removeImmobilizationDevice,
	renderAdaptivePanel,
	renderImmobilizationPanel,
	renderMotionPanel,
	renderOISPanel,
	renderSpecialSetupPanel,
	renderSRSPanel,
	renderTreatmentDeliveryPanel,
	resetAdaptiveCourseHistory,
	resetMotionManagementForCase,
	resumeTreatmentDelivery,
	runPatientSetup,
	runSRSDryRun,
	sbrtRequired,
	setBeamWidth,
	setImagingError6DOF,
	SETUP_REFINEMENTS,
	signOffOISRecord,
	specialSetupRequired,
	specialSetupVerified,
	srsRequired,
	startDIBHHold,
	startTreatmentDelivery,
	stereotacticCaseLabel,
	syncSpecialCheckboxes,
	terminateTreatmentDelivery,
	TREATMENT_CASES,
	treatmentParamMatches,
	updateElectronBolusMesh,
	updateMotionAnimation,
	updateSpecialAnatomyTargetMarker,
	verifyAdaptivePlan,
	verifyImmobilizationSelection,
	verifyMotionManagement,
	verifySRSTimeout
} from './linac-delivery.js';
import {
	acquireClinicalIGRT,
	renderClinicalIGRT,
	startClinicalIGRT,
	verifyClinicalIGRT
} from './linac-igrt.js';

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

// In-room treatment monitor state. Keep these in the main module scope because
// createTreatmentMonitor3D(), renderTreatmentMonitor(), and the case loader all share them.
// Clinical IGRT controller must exist before initThreeJS() creates or resets
// imaging hardware. Hardware helpers may refresh the IGRT panel during startup.
window.clinicalIGRTActive = false;

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

export function clearanceOverrideRecord(idx = Number(S.treatmentDelivery.activeFieldIndex) || 0) {
	return S.clearanceOverrideState.byField?.[idx] || null;
}
export function clearanceOverrideActive(idx = Number(S.treatmentDelivery.activeFieldIndex) || 0) {
	return !!clearanceOverrideRecord(idx)?.active;
}
export function clearanceOverrideUsedAny() {
	return !!(
		(S.oisSession?.clearanceOverrides || []).length ||
		Object.values(S.clearanceOverrideState.byField || {}).some((r) => r?.used)
	);
}
export function igrtAlignmentReadyForDelivery() {
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
export function renderClearanceOverrideCard() {
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

export function deliveryGeometryChecks() {
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
export function getDeliveryReadiness() {
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
export function allTreatmentFieldsCompleted() {
	const fields = getTreatmentFields();
	return !!fields.length && fields.every((_, i) => !!S.treatmentDelivery.completedFields[i]);
}
export function resetTreatmentCompletion() {
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
export function renderTreatmentCompletionControls() {
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

const MLC_SHAPES = ['Square', 'Conformal', 'Asymmetric'];

// ----- Patient setup positions + auto 3-point localization -----
applyImmobilizationRules(TREATMENT_CASES);
TREATMENT_CASES.forEach((c) => {
	const r = SETUP_REFINEMENTS[c.mrn];
	if (r) {
		c.immobilization = { ...(c.immobilization || {}), ...r };
		c.immobilization.keyNames = (c.immobilization.required || []).map(
			(id) => (IMMOBILIZATION_DEVICE_META[id] && IMMOBILIZATION_DEVICE_META[id].name) || id
		);
	}
});

export const COLLISION_PROXY_TOL = 0.025;
export const TREATMENT_CLEARANCE_REQUIRED_MARGIN = 0.015;
// Static electron delivery is verified at one fixed treatment pose. Use the same small
// numerical tolerance as the live mechanical-clearance interlock; do not impose the extra
// positive trajectory buffer used for rotating photon/VMAT treatments.
const ELECTRON_FIXED_CLEARANCE_REQUIRED_MARGIN = -COLLISION_PROXY_TOL;

export function treatmentTrajectorySamples(field) {
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
export function evaluateTreatmentTrajectoryClearance(
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
export function currentSelectedFieldClearance(
	requiredMargin = TREATMENT_CLEARANCE_REQUIRED_MARGIN
) {
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
export function prepareTreatmentClearanceBaseline() {
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
export function removeTreatmentClearancePlacement() {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
window.clinicalIGRTCouchShift = function (axis, delta) {
	if (!S.clinicalIGRT.active || !S.clinicalIGRT.acquired) return false;
	S.clinicalIGRT.verified = false;
	renderClinicalIGRT();
	return true;
};

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

export function syncOperatorConsole() {
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

export function animate() {
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
export const MOVEMENT_STEP = 0.1;
export const fundamentalState = {
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
export function setCenteredJawField(xCm, yCm = xCm) {
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
export const wrap360 = (v) => ((v % 360) + 360) % 360;
export const setTextById = (id, value) => {
	const el = document.getElementById(id);
	if (el) el.textContent = value;
};
export function setPendantLCD(label, value) {
	setTextById('pendantLcdLabel', label);
	setTextById('pendantLcdValue', value);
}

export function updateBEVInset() {
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

export function syncFundamentalReadouts(label, value) {
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
export function captureCollisionPose() {
	return {
		gantryZ: S.gantryRotatingGroup ? S.gantryRotatingGroup.rotation.z : 0,
		couchPos: S.couchGroup ? S.couchGroup.position.clone() : null,
		couchTreatmentRot: S.couchTreatmentPivot ? S.couchTreatmentPivot.rotation.clone() : null,
		topPos: S.couchTopGroup ? S.couchTopGroup.position.clone() : null,
		topRot: S.couchTopGroup ? S.couchTopGroup.rotation.clone() : null
	};
}
export function restoreCollisionPose(p) {
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
export function getCollisionAssessment() {
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
