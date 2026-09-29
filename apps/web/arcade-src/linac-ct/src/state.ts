/* RTApps (#77 linac-ct modularization, phase 2 PR 2 task 3): shared mutable state.
   Every top-level `let` formerly declared in main.js lives here as a property of
   `S` instead. ES module imports are read-only bindings, so a `let scene` in
   main.js couldn't be reassigned from another module — `S.scene` can, since only
   `S`'s properties change, not the `S` binding itself. Modules extracted from
   main.js in later tasks import `S` and read/write `S.<name>` in its place.
   Initializers below are verbatim from the original top-level declarations; a
   `let` whose original declaration had no initializer defaults to `undefined`. */
import type * as THREE from 'three-linac';
import type { OrbitControls } from 'three-linac/examples/jsm/controls/OrbitControls.js';
// RTApps (#77 phase 2 task 19, type-only follow-up): linac-delivery.ts now exports
// interfaces for the literals several nested workflow objects are always assigned
// from (built/consumed in linac-delivery.ts, which owns all of these per the
// comments below), mirroring the sim-hub Room/Travel precedent (state.ts importing a
// type from a module that imports `S` back — type-only, erased at compile time, no
// runtime circularity).
import type {
	TreatmentCase,
	AdaptiveScenario,
	AdaptiveHistoryEntry,
	MotionPhaseSample,
	OISEvent,
	ClearanceOverrideRecord,
	ClearanceResult
} from './linac-delivery';
// RTApps (#77 phase 2 task 19, type-only follow-up): linac-igrt.ts now exports a
// `CouchShift6D` interface for the literal `clinicalIGRT.baseline`/`.correction` are
// always assigned from (built/consumed in linac-igrt.ts, which owns `ClinicalIGRTState`
// per the comment below) — same type-only-import pattern as above.
import type { CouchShift6D } from './linac-igrt';
// RTApps (#77 phase 2 task 19, type-only follow-up): sdk.ts now exports a
// `TreatmentCompletionRecord` interface for the literal `treatmentCompletion.record` is
// always assigned from (built in sdk.ts, which owns `TreatmentCompletionState` per the
// comment below) — same type-only-import pattern as above.
import type { TreatmentCompletionRecord } from './sdk';
// RTApps (#77 phase 2 task 19, type-only follow-up): game.ts now exports a
// `BonusQuestion` interface for the literal `activeBonus` is always assigned from
// (owned by game.ts); scene.ts's `LinacPartData` (already the honest shape for
// `linacPartsData` entries) is what `currentQuizPart` is always assigned from — same
// type-only-import pattern as above.
import type { BonusQuestion } from './game';
import type { LinacPartData } from './scene';

// RTApps (#77 phase 2 task 18): typed boundary for `S`. Unions/types derived from
// every actual assignment site across the linac-ct modules (grep `S.<member> =`).
// A handful of nested workflow fields remain `unknown` (opaque object payloads);
// tightening them to structural types is a recorded #77 follow-up.

interface CameraTravel {
	mode: 'vault' | 'control';
	startTime: number;
	duration: number;
	positions: THREE.Vector3[];
	targets: THREE.Vector3[];
}

interface TravelRequest {
	fromMode: 'vault' | 'control';
	toMode: 'vault' | 'control';
	stage: 'opening' | 'moving' | 'closing';
	openAt: number;
}

// Shapes mutated almost entirely by linac-igrt.js.
interface ClinicalIGRTState {
	active: boolean;
	acquired: boolean;
	verified: boolean;
	mode: 'CBCT' | 'MV Pair';
	error: unknown;
	correction: CouchShift6D | null;
	baseline: CouchShift6D | null;
	attainable: boolean;
	couchTopBasePos: unknown;
	couchTopBaseRot: unknown;
	clearance: ClearanceResult | null;
	alignmentWithinTolerance: boolean;
	clearancePlacementOffset: number;
	// RTApps (#77 phase 2 task 19): dynamically added by linac-igrt.ts's
	// startClinicalIGRT (never in the initial literal, so optional).
	clearancePending?: boolean;
}

// Shapes mutated almost entirely by linac-delivery.js.
interface TreatmentDeliveryState {
	armed: boolean;
	delivering: boolean;
	held: boolean;
	gateHeld: boolean;
	completed: boolean;
	terminated: boolean;
	muDelivered: number;
	startedAt: number;
	lastTick: number;
	autoHoldReason: string;
	activeFieldIndex: number;
	completedFields: unknown;
	dynamicFraction: number;
	controlPointIndex: number;
}

// Shapes mutated almost entirely by linac-safety.js.
interface ClearanceOverrideState {
	byField: Record<string, ClearanceOverrideRecord>;
}

// Shapes mutated almost entirely by linac-delivery.js.
interface MotionManagementState {
	required: boolean;
	mode: string;
	acquired: boolean;
	verified: boolean;
	gateOpen: boolean;
	phase: number;
	breathLevel: number;
	period: number;
	excursionSI: number;
	excursionAP: number;
	excursionLR: number;
	gateLow: number;
	gateHigh: number;
	dibhTarget: number;
	dibhTolerance: number;
	holdActive: boolean;
	holdStartedAt: number;
	samples: number[];
	trace: number[];
	phaseData: MotionPhaseSample[];
	lastFrame: number;
	lastPanelPaint: number;
}

// Shapes mutated almost entirely by linac-delivery.js.
interface AdaptiveWorkflowState {
	required: boolean;
	assessed: boolean;
	compared: boolean;
	approved: boolean;
	scenario: AdaptiveScenario | null;
	selectedPlanKey: string;
	doseChecked: boolean;
	finalApproved: boolean;
	basePlanKey: string;
	caseBase: unknown;
}

// Shapes mutated almost entirely by linac-delivery.js.
interface AdaptiveCourseState {
	history: AdaptiveHistoryEntry[];
	totalFractions: number;
	prescriptionGy: number;
	dosePerFractionGy: number;
	loaded: boolean;
}

// Shapes mutated almost entirely by linac-delivery.js.
interface OISSessionState {
	key: string;
	events: OISEvent[];
	note: string;
	therapist: string;
	reviewed: boolean;
	overrideReviewed: boolean;
	clearanceOverrides: ClearanceOverrideRecord[];
	signed: boolean;
	signedAt: string | null;
	status: string;
	snapshot: unknown;
}

// Shapes mutated almost entirely by linac-delivery.js.
interface ImmobilizationWorkflowState {
	required: boolean;
	verified: boolean;
	selected: string[];
	shelfOrder: string[];
	attempts: number;
	lastFeedback: string;
	positionChecked: boolean;
	indexingChecked: boolean;
	preparationChecked: boolean;
}

// Shapes mutated almost entirely by linac-delivery.js. `timeoutVerifiedByField`
// is read (as a boolean flag map) from scene.js's fundamentalState summary.
interface SRSWorkflowState {
	dryRunByField: Record<number, boolean>;
	timeoutVerifiedByField: Record<number, boolean>;
	lastClearance: ClearanceResult | null;
	dryRunning: boolean;
}

interface SpecialSetupElectronState {
	shape: string;
	width: number;
	height: number;
	cone: string;
	template: boolean;
	fabricated: boolean;
	mounted: boolean;
	bolusShape: string;
	bolusWidth: number;
	bolusHeight: number;
	bolusThickness: number;
	bolusPlaced: boolean;
	airGapMm: number;
	bolusDragX: number;
	bolusDragY: number;
	bolusContactY: number;
	bolusPositionOK: boolean;
	bolusAirGapOK: boolean;
	bolusLogged: boolean;
	// RTApps (#77 phase 2 task 19): dynamically added by linac-delivery.ts's drag-finish
	// handler (never in the initial literal, so optional).
	bolusOffsetXcm?: number;
	bolusOffsetYcm?: number;
}

// `type` is mutated by linac-delivery.js from case data; kept as `string` rather
// than an exhaustive union since the source case field isn't type-narrowed here.
interface SpecialSetupWorkflowState {
	type: string;
	verified: boolean;
	breastOffset: number;
	csiJunctionA: number;
	csiJunctionB: number;
	electron: SpecialSetupElectronState;
	// RTApps (#77 phase 2 task 19): dynamically added by linac-delivery.ts's
	// syncSpecialCheckboxes (never in the initial literal, so optional).
	indexChecked?: boolean;
	matchDoc?: boolean;
	cranialIndex?: boolean;
	spineIndex?: boolean;
	csiPlan?: boolean;
	ePPE?: boolean;
	eCool?: boolean;
	eLabel?: boolean;
	eLight?: boolean;
}

// Shape mutated almost entirely by sdk.js.
interface TreatmentCompletionState {
	verified: boolean;
	posted: boolean;
	code: string | null;
	attempts: number;
	igrtHandling: string | null;
	postedAt: Date | null;
	record: TreatmentCompletionRecord | null;
}

interface LinacState {
	HUB_URL: string | null;
	internalViewOn: boolean;
	stageIndex: number;
	activeAssembly: 'beam' | 'electron' | 'accessory' | 'stand';
	beamPathGroup: THREE.Group | null;
	standPathGroup: THREE.Group | null;
	standInternalsGroup: THREE.Group | null;
	beamHighlight: THREE.Mesh | null;
	standHighlight: THREE.Mesh | null;
	detailGantryGroup: THREE.Group | null;
	detailFilter: THREE.Object3D | null;
	detailFoil: THREE.Object3D | null;
	detailTarget: THREE.Object3D | null;
	detailAccessoryTray: THREE.Object3D | null;
	detailElectronCone: THREE.Object3D | null;
	scene: THREE.Scene | undefined;
	camera: THREE.PerspectiveCamera | undefined;
	renderer: THREE.WebGLRenderer | undefined;
	controls: OrbitControls | undefined;
	staticSetupGroup: THREE.Group | undefined;
	gantryRotatingGroup: THREE.Group | undefined;
	couchGroup: THREE.Group | undefined;
	couchTopGroup: THREE.Group | undefined;
	patientGroup: THREE.Group | undefined;
	patientHome: THREE.Vector3 | null;
	patientSetupRAF: number | null;
	patientErrorGroup: THREE.Group | null;
	errorGroupHome: THREE.Vector3 | null;
	patientBodyGroup: THREE.Group | null;
	couchTopHomePos: THREE.Vector3 | null;
	couchTopHomeRot: THREE.Euler | null;
	couchTreatmentPivot: THREE.Group | null;
	electronBolusMesh: THREE.Mesh | null;
	immobilizationShelf3D: THREE.Group | null;
	immobilizationPatientGroup: THREE.Group | null;
	patientAnatomyParts: Record<string, THREE.Mesh>;
	specialAnatomyTargetMarker: THREE.Mesh | null;
	linacHeadObject: THREE.Object3D | undefined;
	jawXN: THREE.Mesh | undefined;
	jawXP: THREE.Mesh | undefined;
	jawYN: THREE.Mesh | undefined;
	jawYP: THREE.Mesh | undefined;
	electronApplicatorGroup: THREE.Group | null;
	mlcGroup: THREE.Group | null;
	mlcLeavesA: THREE.Mesh[];
	mlcLeavesB: THREE.Mesh[];
	odiLine: THREE.Line | null;
	odiSpot: THREE.Mesh | null;
	odiOn: boolean;
	lastODIcm: number | null;
	detectorPanel: THREE.Group | undefined;
	detectorArm: THREE.Group | undefined;
	beamCone: THREE.Mesh | null;
	laserGroup: THREE.Group | null;
	beamOn: boolean;
	lasersOn: boolean;
	kvGroup: THREE.Group | null;
	kvOn: boolean;
	roomLightsOn: boolean;
	hemiLight: THREE.HemisphereLight | null;
	ambientRoomLight: THREE.AmbientLight | null;
	keyRoomLight: THREE.DirectionalLight | null;
	fillRoomLight: THREE.DirectionalLight | null;
	rimRoomLight: THREE.DirectionalLight | null;
	vaultDoorGroup: THREE.Group | null;
	vaultDoorPanel: THREE.Mesh | null;
	// Generic-pinned (not just `THREE.Mesh`) because travel.js reads
	// `.material.color` / `.material.emissive` / `.material.emissiveIntensity`.
	vaultDoorIndicator: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null;
	vaultDoorTrack: THREE.Mesh | null;
	controlRoomGroup: THREE.Group | null;
	cameraTravel: CameraTravel | null;
	currentRoomView: 'vault' | 'control';
	vaultDoorProgress: number;
	vaultDoorTarget: number;
	travelRequest: TravelRequest | null;
	consoleMotionArmed: boolean;
	treatmentMonitorCanvas: HTMLCanvasElement | null;
	treatmentMonitorCtx: CanvasRenderingContext2D | null;
	treatmentMonitorTexture: THREE.CanvasTexture | null;
	treatmentMonitorMesh: THREE.Mesh | null;
	treatmentMonitorFrame: THREE.Group | null;
	treatmentMonitorFrameSecondary: THREE.Group | null;
	activeTreatmentCase: TreatmentCase | null;
	activeTreatmentCaseIndex: number;
	clinicalIGRT: ClinicalIGRTState;
	treatmentDelivery: TreatmentDeliveryState;
	clearanceOverrideState: ClearanceOverrideState;
	motionManagement: MotionManagementState;
	adaptiveWorkflow: AdaptiveWorkflowState;
	adaptiveCourse: AdaptiveCourseState;
	oisSession: OISSessionState;
	immobilizationWorkflow: ImmobilizationWorkflowState;
	srsWorkflow: SRSWorkflowState;
	specialSetupWorkflow: SpecialSetupWorkflowState;
	motionTarget3D: THREE.Mesh | null;
	motionTargetBase: THREE.Vector3 | null;
	motionSurfaceMarker: THREE.Mesh | null;
	motionSurfaceBase: THREE.Vector3 | null;
	motionHeart3D: THREE.Mesh | null;
	motionHeartBase: THREE.Vector3 | null;
	deliveryRAF: number | null;
	deliveryMonitorStamp: number;
	deliveryPanelStamp: number;
	treatmentCompletion: TreatmentCompletionState;
	quizMode: 'part' | 'bonus';
	activeBonus: BonusQuestion | null;
	currentBalance: number;
	earnedParts: string[];
	purchasedEnhancements: string[];
	currentQuizPart: LinacPartData | null;
	// Callback installed by main.js; shape lives there.
	bdSyncFromMachine: unknown;
	bonusQuestionDeck: number[];
	recentScenarioKeys: string[];
	allCorePartsEarned: boolean;
	jawOffset: number;
	detectorExtended: boolean;
	epidReceptorY: number;
	ghostMat: THREE.MeshStandardMaterial | null;
	pendantMotionArmed: boolean;
	collisionBannerTimer: number | null;
}

export const S: LinacState = {
	HUB_URL: null,
	internalViewOn: false,
	stageIndex: -1,
	activeAssembly: 'beam',
	beamPathGroup: null,
	standPathGroup: null,
	standInternalsGroup: null,
	beamHighlight: null,
	standHighlight: null,
	detailGantryGroup: null,
	detailFilter: null,
	detailFoil: null,
	detailTarget: null,
	detailAccessoryTray: null,
	detailElectronCone: null,
	scene: undefined,
	camera: undefined,
	renderer: undefined,
	controls: undefined,
	staticSetupGroup: undefined,
	gantryRotatingGroup: undefined,
	couchGroup: undefined,
	couchTopGroup: undefined,
	patientGroup: undefined,
	patientHome: null,
	patientSetupRAF: null,
	patientErrorGroup: null,
	errorGroupHome: null,
	patientBodyGroup: null,
	couchTopHomePos: null,
	couchTopHomeRot: null,
	couchTreatmentPivot: null,
	electronBolusMesh: null,
	immobilizationShelf3D: null,
	immobilizationPatientGroup: null,
	patientAnatomyParts: {},
	specialAnatomyTargetMarker: null,
	linacHeadObject: undefined,
	jawXN: undefined,
	jawXP: undefined,
	jawYN: undefined,
	jawYP: undefined,
	electronApplicatorGroup: null,
	mlcGroup: null,
	mlcLeavesA: [],
	mlcLeavesB: [],
	odiLine: null,
	odiSpot: null,
	odiOn: false,
	lastODIcm: null,
	detectorPanel: undefined,
	detectorArm: undefined,
	beamCone: null,
	laserGroup: null,
	beamOn: false,
	lasersOn: false,
	kvGroup: null,
	kvOn: false,
	roomLightsOn: true,
	hemiLight: null,
	ambientRoomLight: null,
	keyRoomLight: null,
	fillRoomLight: null,
	rimRoomLight: null,
	vaultDoorGroup: null,
	vaultDoorPanel: null,
	vaultDoorIndicator: null,
	vaultDoorTrack: null,
	controlRoomGroup: null,
	cameraTravel: null,
	currentRoomView: 'vault',
	vaultDoorProgress: 0,
	vaultDoorTarget: 0,
	travelRequest: null,
	consoleMotionArmed: false,
	treatmentMonitorCanvas: null,
	treatmentMonitorCtx: null,
	treatmentMonitorTexture: null,
	treatmentMonitorMesh: null,
	treatmentMonitorFrame: null,
	treatmentMonitorFrameSecondary: null,
	activeTreatmentCase: null,
	activeTreatmentCaseIndex: 0,
	clinicalIGRT: {
		active: false,
		acquired: false,
		verified: false,
		mode: 'CBCT',
		error: null,
		correction: null,
		baseline: null,
		attainable: true,
		couchTopBasePos: null,
		couchTopBaseRot: null,
		clearance: null,
		alignmentWithinTolerance: false,
		clearancePlacementOffset: 0
	},
	treatmentDelivery: {
		armed: false,
		delivering: false,
		held: false,
		gateHeld: false,
		completed: false,
		terminated: false,
		muDelivered: 0,
		startedAt: 0,
		lastTick: 0,
		autoHoldReason: '',
		activeFieldIndex: 0,
		completedFields: {},
		dynamicFraction: 0,
		controlPointIndex: 0
	},
	clearanceOverrideState: { byField: {} },
	motionManagement: {
		required: false,
		mode: 'NONE',
		acquired: false,
		verified: false,
		gateOpen: false,
		phase: 0,
		breathLevel: 50,
		period: 4.5,
		excursionSI: 0,
		excursionAP: 0,
		excursionLR: 0,
		gateLow: 40,
		gateHigh: 60,
		dibhTarget: 80,
		dibhTolerance: 5,
		holdActive: false,
		holdStartedAt: 0,
		samples: [],
		trace: [],
		phaseData: [],
		lastFrame: 0,
		lastPanelPaint: 0
	},
	adaptiveWorkflow: {
		required: false,
		assessed: false,
		compared: false,
		approved: false,
		scenario: null,
		selectedPlanKey: '',
		doseChecked: false,
		finalApproved: false,
		basePlanKey: '',
		caseBase: null
	},
	adaptiveCourse: {
		history: [],
		totalFractions: 0,
		prescriptionGy: 0,
		dosePerFractionGy: 0,
		loaded: false
	},
	oisSession: {
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
	},
	immobilizationWorkflow: {
		required: false,
		verified: false,
		selected: [],
		shelfOrder: [],
		attempts: 0,
		lastFeedback: '',
		positionChecked: false,
		indexingChecked: false,
		preparationChecked: false
	},
	srsWorkflow: {
		dryRunByField: {},
		timeoutVerifiedByField: {},
		lastClearance: null,
		dryRunning: false
	},
	specialSetupWorkflow: {
		type: 'NONE',
		verified: false,
		breastOffset: 0,
		csiJunctionA: 0,
		csiJunctionB: 0,
		electron: {
			shape: '',
			width: 0,
			height: 0,
			cone: '',
			template: false,
			fabricated: false,
			mounted: false,
			bolusShape: '',
			bolusWidth: 0,
			bolusHeight: 0,
			bolusThickness: 0,
			bolusPlaced: false,
			airGapMm: 4,
			bolusDragX: 54,
			bolusDragY: 92,
			bolusContactY: 38,
			bolusPositionOK: false,
			bolusAirGapOK: false,
			bolusLogged: false
		}
	},
	motionTarget3D: null,
	motionTargetBase: null,
	motionSurfaceMarker: null,
	motionSurfaceBase: null,
	motionHeart3D: null,
	motionHeartBase: null,
	deliveryRAF: null,
	deliveryMonitorStamp: 0,
	deliveryPanelStamp: 0,
	treatmentCompletion: {
		verified: false,
		posted: false,
		code: null,
		attempts: 0,
		igrtHandling: null,
		postedAt: null,
		record: null
	},
	quizMode: 'part', // 'part' | 'bonus'
	activeBonus: null,
	currentBalance: 0,
	earnedParts: [],
	purchasedEnhancements: [],
	currentQuizPart: null,
	bdSyncFromMachine: null,
	bonusQuestionDeck: [],
	recentScenarioKeys: [],
	allCorePartsEarned: false,
	jawOffset: 0.1,
	detectorExtended: false,
	epidReceptorY: -1.02, // EPID depth below isocenter (driven by the Divergence Lab SID slider)
	ghostMat: null,
	pendantMotionArmed: false,
	collisionBannerTimer: null
};
