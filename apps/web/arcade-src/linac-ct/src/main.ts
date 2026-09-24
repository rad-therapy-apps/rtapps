import './console-patch';
import './workspace';
import { S } from './state';
import {
	adaptiveApprove,
	adaptiveAssess,
	adaptiveClose,
	adaptiveCompare,
	adaptiveLaunchButton,
	adaptiveNextFraction,
	adaptivePanel,
	adaptiveResetCourse,
	asmAccessoryButton,
	asmBeamButton,
	asmElectronButton,
	asmStandButton,
	beamOnButton,
	beamStageNextButton,
	beamStagePrevButton,
	bevCollapseButton,
	bevInset,
	bonusChallengeButton,
	bottomMachineControls,
	chargeCaptureClose,
	chargeCapturePanel,
	chargeIgrtHandling,
	chargePost,
	chargeTreatmentCode,
	chargeVerify,
	clearanceOverrideApply,
	clearanceOverrideRationale,
	clearanceOverrideStatus,
	clearanceOverrideWithdraw,
	collimatorRotateMinusButton,
	collimatorRotatePlusButton,
	consoleActiveField,
	consoleActivePatient,
	consoleBeamStatusChip,
	consoleBeamVisual,
	consoleCameraAInfo,
	consoleCameraAStatus,
	consoleCameraBInfo,
	consoleCameraBStatus,
	consoleCameraCInfo,
	consoleCameraCStatus,
	consoleCollMinus,
	consoleCollPlus,
	consoleDeliveryButton,
	consoleDoorStatusChip,
	consoleGantryMinus,
	consoleGantryPlus,
	consoleIGRTButton,
	consoleIGRTStatusChip,
	consoleImmoButton,
	consoleImmoList,
	consoleImmoSummary,
	consoleJawsClose,
	consoleJawsOpen,
	consoleJawX1In,
	consoleJawX1Out,
	consoleJawX2In,
	consoleJawX2Out,
	consoleJawY1In,
	consoleJawY1Out,
	consoleJawY2In,
	consoleJawY2Out,
	consoleKV,
	consoleLasers,
	consoleLatMinus,
	consoleLatPlus,
	consoleLightsStatusChip,
	consoleLngMinus,
	consoleLngPlus,
	consoleMLCClose,
	consoleMLCOpen,
	consoleMLCShape,
	consoleMotionEnable,
	consoleMotionStatus,
	consoleMV,
	consoleOdi,
	consoleOISButton,
	consolePatientClock,
	consolePatientRefName,
	consolePatientRefSubtitle,
	consolePitchMinus,
	consolePitchPlus,
	consolePlanColl,
	consolePlanCouch,
	consolePlanGantry,
	consolePlanImaging,
	consolePlanJaws,
	consolePlanMLC,
	consoleQueue,
	consoleReadoutColl,
	consoleReadoutGantry,
	consoleReadoutJaws,
	consoleReadoutMLC,
	consoleRefEnergy,
	consoleRefField,
	consoleRefFraction,
	consoleRefMRN,
	consoleRefPosition,
	consoleRefTechnique,
	consoleRollMinus,
	consoleRollPlus,
	consoleRoomLights,
	consoleRoomStatus,
	consoleTableMinus,
	consoleTablePlus,
	consoleTravelControl,
	consoleTravelVault,
	consoleVrtMinus,
	consoleVrtPlus,
	consoleYawMinus,
	consoleYawPlus,
	couchDownButton,
	couchInButton,
	couchLeftButton,
	couchOutButton,
	couchPitchMinusButton,
	couchPitchPlusButton,
	couchRightButton,
	couchRollMinusButton,
	couchRollPlusButton,
	couchTreatmentAngleMinusButton,
	couchTreatmentAnglePlusButton,
	couchUpButton,
	couchYawMinusButton,
	couchYawPlusButton,
	ctSuiteClose,
	ctSuiteLaunchButton,
	ctSuitePanel,
	deliveryArm,
	deliveryClose,
	deliveryCompleteSession,
	deliveryFieldSelect,
	deliveryHold,
	deliveryLaunchButton,
	deliveryPanel,
	deliveryRecheck,
	deliveryReviewCharges,
	deliveryStart,
	deliveryTerminate,
	detectorToggleButton,
	gantryRotateMinusButton,
	gantryRotatePlusButton,
	igrtAcquire,
	igrtClose,
	igrtLaunchButton,
	igrtNewSetup,
	igrtPanel,
	igrtVerify,
	immobilizationClose,
	immobilizationLaunchButton,
	immobilizationPanel,
	immobilizationReset,
	immobilizationShelf,
	immobilizationTableDrop,
	immobilizationVerify,
	internalViewButton,
	jawsCloseButton,
	jawsOpenButton,
	jawX1InButton,
	jawX1OutButton,
	jawX2InButton,
	jawX2OutButton,
	jawY1InButton,
	jawY1OutButton,
	jawY2InButton,
	jawY2OutButton,
	kvToggleButton,
	lasersToggleButton,
	loadTreatmentCaseBtn,
	mlcCloseButton,
	mlcOpenButton,
	mlcShapeButton,
	motionAcquire,
	motionClose,
	motionDibhTarget,
	motionDibhTolerance,
	motionGateHigh,
	motionGateLow,
	motionHold,
	motionLaunchButton,
	motionPanel,
	motionRecheck,
	motionRelease,
	motionReset,
	motionVerify,
	nextTreatmentCaseBtn,
	odiToggleButton,
	oisClose,
	oisLaunchButton,
	oisNote,
	oisOverrideReviewCheck,
	oisPanel,
	oisReviewCheck,
	oisSignOff,
	oisTherapist,
	operatorConsolePanel,
	pendantMotionEnable,
	resetButton,
	roomLightsToggleButton,
	specialSetupClose,
	specialSetupContent,
	specialSetupLaunchButton,
	specialSetupPanel,
	srsClearanceCheck,
	srsClose,
	srsDryRun,
	srsLaunchButton,
	srsPanel,
	srsVerifyTimeout,
	startQuizButton,
	submitAnswerButton,
	tabButtons,
	treatmentCaseSelect,
	viewControlRoomButton,
	viewVaultButton
} from './dom';
import {
	beamStageStep,
	CORE_PART_IDS,
	GANTRY_PLANE_Z_TARGET,
	GROUND_Y,
	initThreeJS,
	ISOCENTER_Y_TARGET,
	linacPartsData,
	MLC_MAX_CM,
	MLC_MIN_CM,
	monitorPlannedDisplay,
	onWindowResize,
	renderTreatmentMonitor,
	setAssembly,
	setBeamState,
	setDetectorStateGame,
	setInternalView,
	setKvState,
	setLaserState,
	setODIState,
	setRoomLightsState,
	updateCouchAccordion,
	updateElectronApplicator3D,
	updateJawPositions,
	updateMLCPositions
} from './scene';
import { cctvFeeds, updateCCTVFeeds } from './cctv';
import {
	syncRoomViewButtons,
	travelToRoomView,
	updateCameraTravel,
	updateTravelWorkflow,
	updateVaultAesthetics
} from './travel';
import {
	acquireMotionCharacterization,
	adaptiveRequired,
	addImmobilizationDevice,
	advanceAdaptiveFraction,
	applyAdaptivePlan,
	applyImmobilizationRules,
	armTreatmentDelivery,
	clearImmobilizationSelection,
	deliveryCasePlan,
	deliveryProgressFraction,
	fmtSignedInt,
	getCurrentPlannedParameters,
	getDynamicFieldState,
	getTreatmentFields,
	handleSpecialSetupAction,
	holdTreatmentDelivery,
	IMAGING_SITES,
	IMMOBILIZATION_DEVICE_META,
	loadTreatmentCase,
	PATIENT_POS_NAMES,
	PATIENT_POSITIONS,
	persistOISSession,
	populateTreatmentCaseSelect,
	recheckSRSClearance,
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
	setBeamWidth,
	setImagingError6DOF,
	SETUP_REFINEMENTS,
	signOffOISRecord,
	srsRequired,
	startDIBHHold,
	startTreatmentDelivery,
	syncSpecialCheckboxes,
	terminateTreatmentDelivery,
	TREATMENT_CASES,
	updateElectronBolusMesh,
	updateMotionAnimation,
	updateSpecialAnatomyTargetMarker,
	verifyAdaptivePlan,
	verifyImmobilizationSelection,
	verifyMotionManagement,
	verifySRSTimeout
} from './linac-delivery';
import {
	acquireClinicalIGRT,
	renderClinicalIGRT,
	startClinicalIGRT,
	verifyClinicalIGRT
} from './linac-igrt';
import {
	allTreatmentFieldsCompleted,
	applyClearanceOverride,
	attemptCollisionSafeMotion,
	clearanceOverrideRecord,
	currentJawSummary,
	fundamentalState,
	getDeliveryReadiness,
	imgCouch,
	JAW_EDGE_MAX_CM,
	JAW_EDGE_MIN_CM,
	JAW_EDGE_STEP_CM,
	MOVEMENT_STEP,
	nudgeJawEdge,
	requirePendantMotion,
	ROTATION_STEP,
	runFunctionKeyIsolated,
	safeTilt,
	setPendantLCD,
	setPendantMotionArmed,
	setSafetyHUD,
	syncFundamentalReadouts,
	syncLegacyJawValue,
	updateBEVInset,
	withdrawClearanceOverride
} from './linac-safety';
import {
	completeFractionWithoutCurrentCPTModule,
	openChargeCapture,
	postChargeAndCompleteFraction,
	resolveHubUrl,
	updateChargeEducation,
	verifyChargeCapture
} from './sdk';
import {
	checkAllCorePartsEarned,
	displayBonusChallenge,
	displayQuiz,
	enableMovementControl,
	enhancementsData,
	handleSubmitAnswer,
	loadGameState,
	openTab,
	resetGame,
	saveGameState,
	updateUI
} from './game';
import type { TreatmentField } from './linac-delivery';

// RTApps (#77 phase 2 task 19): consolidated `declare global` for this app's window
// globals — folds in the interim per-module declarations previously carried by
// console-patch.ts, linac-igrt.ts, and linac-safety.ts (removed there; this module
// owns the actual `window.*` assignments below and converts last in this task).
// `BridgeSnapshot` fields are the ones actually read by console-patch.ts's mirror
// (not the full state shape this module's snapshot() builds below) — moved here
// verbatim from console-patch.ts's interim declaration, which is why fields stay
// all-optional: console-patch.ts falls back to `bs.x || {}`-shaped defaults whose
// empty-literal type must stay union-compatible with each field here.
interface BridgeSnapshot {
	activeTreatmentCase: typeof S.activeTreatmentCase;
	treatmentDelivery: {
		muDelivered?: number;
		activeFieldIndex?: number;
		delivering?: boolean;
		armed?: boolean;
		completed?: boolean;
		held?: boolean;
		completedFields?: Record<number, boolean>;
	};
	treatmentCompletion: { posted?: boolean };
	specialSetupWorkflow: {
		electron?: { bolusRequired?: boolean; bolusPlaced?: boolean };
	};
	fundamentalState: {
		gantry?: number;
		collimator?: number;
		couchAngle?: number;
		jawX1?: number;
		jawX2?: number;
		jawY1?: number;
		jawY2?: number;
		vrt?: number;
		lng?: number;
		lat?: number;
		pitch?: number;
		roll?: number;
		yaw?: number;
	};
	plan: {
		mu?: number;
		doseRate?: number;
		mode?: string;
		electron?: boolean;
		geometry?: { jaws?: string; gantry?: string; collimator?: string; couchAngle?: string };
	};
	readyInfo: { ready: boolean; checks: { name: string; ok: boolean; detail: string }[] };
	dyn: { doseRate?: number } | null;
	activeFields: (TreatmentField & { field?: string })[];
	allFieldsCompleted?: boolean;
}

declare global {
	interface Window {
		clinicalIGRTActive: boolean;
		clinicalIGRTCouchShift: (axis: string, delta: number) => boolean;
		imagingCouchShift: (axis: string, delta: number) => boolean;
		RTAppsLinacMirrorBridge: { snapshot: () => BridgeSnapshot | null };
	}
}

// RTApps (plan 4c): prefetch the hub's player URL once; the back-link control only
// renders/enables when it resolves (activity unseeded/unpublished, or offline leaves
// HUB_URL null and the button stays disabled instead of going dead). Same pattern as
// the hub's own door-fix precedent (commit 4cc341a).
resolveHubUrl();
document.getElementById('rtappsBackBtn')?.addEventListener('click', () => {
	if (S.HUB_URL) window.top.location.href = S.HUB_URL;
});

// In-room treatment monitor state. Keep these in the main module scope because
// createTreatmentMonitor3D(), renderTreatmentMonitor(), and the case loader all share them.
// Clinical IGRT controller must exist before initThreeJS() creates or resets
// imaging hardware. Hardware helpers may refresh the IGRT panel during startup.
window.clinicalIGRTActive = false;

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

// Ad-hoc memo state stashed on `animate` itself (mirrors sim-hub's adaptive-quality
// precedent) rather than a module-scope variable, so it persists across the function's
// own definition without another top-level binding.
interface AnimateQualityFloor {
	done: boolean;
	last: number;
	n: number;
	acc: number;
	bad: number;
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
		(animate as unknown as { _floor?: AnimateQualityFloor })._floor ||
		((animate as unknown as { _floor?: AnimateQualityFloor })._floor = {
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

tabButtons.forEach((button) => button.addEventListener('click', openTab));

export const wrap360 = (v) => ((v % 360) + 360) % 360;
export const setTextById = (id, value) => {
	const el = document.getElementById(id);
	if (el) el.textContent = value;
};

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

pendantMotionEnable?.addEventListener('click', () => setPendantMotionArmed(!S.pendantMotionArmed));

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
	const btn = (ev.target as Element).closest('[data-adaptive-plan]') as HTMLElement | null;
	if (!btn || !adaptiveRequired()) return;
	S.adaptiveWorkflow.approved = false;
	applyAdaptivePlan(btn.dataset.adaptivePlan);
	renderAdaptivePanel();
});
['adaptiveCheckDose', 'adaptiveCheckApprove'].forEach((id) =>
	document.getElementById(id)?.addEventListener('change', () => {
		if (!adaptiveRequired()) return;
		S.adaptiveWorkflow.approved = false;
		S.adaptiveWorkflow.doseChecked = !!(
			document.getElementById('adaptiveCheckDose') as HTMLInputElement | null
		)?.checked;
		S.adaptiveWorkflow.finalApproved = !!(
			document.getElementById('adaptiveCheckApprove') as HTMLInputElement | null
		)?.checked;
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
	const btn = (ev.target as Element).closest('[data-special]') as HTMLElement | null;
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
(
	document.querySelector('.tab-button[data-tab="divergenceContent"]') as HTMLElement | null
)?.click();

// ================= Beam Divergence Lab (integrated exercise) =================
(function () {
	const rx = 20,
		ry = 12,
		scale = 3;
	let probGantry = 0,
		probJaw = 10,
		probSid = 150,
		probError = 0,
		trueAnswers: {
			ssd?: number;
			actualSsd?: number;
			fsSkin?: number;
			doseSkin?: number;
			actualDose?: number;
			fsRec?: number;
			doseRec?: number;
		} = {};
	let bdScenCount = 0,
		probPos = 'HFS';
	let bdLive = false; // gate machine-driving to user interaction (not the initial load)
	const $ = (id) => document.getElementById(id);
	const ui = {
		mode: $('bd-quiz-mode') as HTMLSelectElement | null,
		gantry: $('bd-gantry') as HTMLInputElement | null,
		jaw: $('bd-jaw') as HTMLInputElement | null,
		sid: $('bd-sid') as HTMLInputElement | null,
		err: $('bd-setup-error') as HTMLInputElement | null,
		rowError: $('bd-row-error'),
		scenText: $('bd-scenario-text'),
		formBox: $('bd-formula-box'),
		rows: document.querySelectorAll<HTMLElement>('#divergenceContent .bd-quiz-row')
	};
	if (!ui.mode) return;
	const ans = {
		ssd: $('bd-ans-ssd') as HTMLInputElement | null,
		actualSsd: $('bd-ans-actual-ssd') as HTMLInputElement | null,
		fsSkin: $('bd-ans-fs-skin') as HTMLInputElement | null,
		doseSkin: $('bd-ans-dose-skin') as HTMLInputElement | null,
		actualDose: $('bd-ans-actual-dose') as HTMLInputElement | null,
		fsRec: $('bd-ans-fs-rec') as HTMLInputElement | null,
		doseRec: $('bd-ans-dose-rec') as HTMLInputElement | null
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
		ui.gantry.value = String(0);
		ui.jaw.value = String(10);
		ui.sid.value = String(probSid);
		ui.err.value = String(probError);
		if (typeof runPatientSetup === 'function') (runPatientSetup as (pos: string) => void)(probPos); // auto 3-point localization to iso
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
		$('bd-svg-sid').setAttribute('y1', String(sidY));
		$('bd-svg-sid').setAttribute('y2', String(sidY));
		const planY = 100 + plannedSsd * scale;
		$('bd-svg-planned-ssd').setAttribute('y1', String(planY));
		$('bd-svg-planned-ssd').setAttribute('y2', String(planY));
		$('bd-lbl-planned-ssd').setAttribute('y', String(planY - 5));
		const actY = 100 + actualSsd * scale,
			svgAct = $('bd-svg-actual-ssd'),
			lblAct = $('bd-lbl-actual-ssd');
		if (err !== 0) {
			svgAct.style.display = 'block';
			lblAct.style.display = 'block';
			svgAct.setAttribute('y1', String(actY));
			svgAct.setAttribute('y2', String(actY));
			lblAct.setAttribute('y', String(actY + 15));
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
		ui.gantry.value = String(probGantry);
		ui.jaw.value = String(probJaw);
		ui.sid.value = String(probSid);
		ui.err.value = String(probError);
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
			if (el) el.textContent = (0).toFixed(dec as number) + unit; // reset before its turn
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
		($('bd-guided-prev') as HTMLButtonElement).disabled = guidedIdx === 0;
		($('bd-guided-next') as HTMLButtonElement).disabled = guidedIdx === guidedSteps.length - 1;
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
			ui.gantry.value = String(v);
		} else if (control === 'jaw') {
			ui.jaw.value = String(
				Math.max(
					parseFloat(ui.jaw.min),
					Math.min(parseFloat(ui.jaw.max), parseFloat(ui.jaw.value) + delta)
				)
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
	const skip = document.getElementById('skipStartNextTime') as HTMLInputElement | null;
	const closeStart = (tabId) => {
		localStorage.setItem('linacSkipStartScreen', skip && skip.checked ? 'true' : 'false');
		if (screen) screen.style.display = 'none';
		if (tabId) {
			const btn = document.querySelector(
				'.tab-button[data-tab="' + tabId + '"]'
			) as HTMLElement | null;
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
	const modeSel = $('img-mode') as HTMLSelectElement | null,
		runBtn = $('img-run') as HTMLButtonElement | null,
		progBar = $('img-prog-bar'),
		statusEl = $('img-status');
	const display = $('img-display'),
		viewNote = $('img-view-note');
	const inLat = $('img-lat') as HTMLInputElement | null,
		inLng = $('img-lng') as HTMLInputElement | null,
		inVrt = $('img-vrt') as HTMLInputElement | null;
	const fbLat = $('img-fb-lat'),
		fbLng = $('img-fb-lng'),
		fbVrt = $('img-fb-vrt');
	const inRoll = $('img-roll') as HTMLInputElement | null,
		inPitch = $('img-pitch') as HTMLInputElement | null,
		inYaw = $('img-yaw') as HTMLInputElement | null;
	const fbRoll = $('img-fb-roll'),
		fbPitch = $('img-fb-pitch'),
		fbYaw = $('img-fb-yaw');
	const checkBtn = $('img-check') as HTMLButtonElement | null,
		finalMsg = $('img-final'),
		newBtn = $('img-new') as HTMLButtonElement | null;
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
		return new Promise<void>((resolve) => {
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
		new Promise<void>((resolve) => {
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
		dicomFrame = document.getElementById('dicomFrame') as HTMLIFrameElement | null,
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
			const plan = (
				typeof deliveryCasePlan === 'function'
					? deliveryCasePlan()
					: { mu: 0, doseRate: 0, mode: 'STATIC', geometry: {} }
			) as ReturnType<typeof deliveryCasePlan>;
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
				treatmentDelivery: S.treatmentDelivery as BridgeSnapshot['treatmentDelivery'],
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
