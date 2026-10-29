// Shared types for the treatment-delivery modules (split out of linac-delivery.ts, #77).

// RTApps (#77 phase 2 task 19): honest shape for `TREATMENT_CASES` entries, derived
// from every field actually present across the 32-entry literal in cases.ts plus every
// property read off `S.activeTreatmentCase` in the delivery/ modules. Exported so state.ts can
// tighten `activeTreatmentCase` from `unknown` to `TreatmentCase | null` (type-only
// import, mirroring the sim-hub Room/Travel precedent) — this is the only state.ts
// member this task tightens; other `unknown` fields the delivery/ modules own keep local
// erasing casts at their access sites.
export interface FieldGeometry {
	gantry: string;
	collimator: string;
	jaws: string;
	mlcAperture: string;
	mlcShape: string;
	couchAngle?: string;
	couch?: string;
}

interface FieldArc {
	start: number;
	stop: number;
	direction: string;
	fullArc: boolean;
}

interface ControlPoint {
	muFraction: number;
	mlcAperture: number;
	mlcShape: string;
	doseRate: number;
}

// Exported: console-patch.ts's bridge-snapshot mirror types `activeFields` off this.
export interface TreatmentField {
	name: string;
	mu: number;
	doseRate: number;
	geometry: FieldGeometry;
	mode?: string;
	controlPoints?: ControlPoint[];
	arc?: FieldArc;
	targetRegion?: string;
	station?: string;
	electron?: boolean;
}

interface CaseBilling {
	treatmentCode: string;
	level: string;
	reason: string;
	igrtHandling?: string;
	// Only ever read (`?.skipChargeCapture`); never set on any of the 32 cases.
	skipChargeCapture?: boolean;
}

interface CaseImmobilization {
	required: string[];
	orderSummary: string;
	instructions: string[];
	// Only ever read defensively (`spec.xxx || []`/`|| fallback`); never set on any of
	// the 32 cases — kept optional for the (currently dead) structured-instructions path.
	keyNames?: string[];
	positionInstructions?: string[];
	indexingInstructions?: string[];
	preparationInstructions?: string[];
	optional?: string[];
}

export interface PlannedParameters {
	gantry: string;
	collimator: string;
	jaws: string;
	mlcAperture: string;
	mlcShape: string;
	imaging: string;
	odi: string;
	couch: string;
	couchAngle?: string;
}

interface MotionManagementSpec {
	type: string;
	label: string;
	period: number;
	siExcursion?: number;
	apExcursion?: number;
	lrExcursion?: number;
	gateLow?: number;
	gateHigh?: number;
	dibhTarget?: number;
	dibhTolerance?: number;
	practiceHolds?: number;
}

interface StereotacticSpec {
	type: string;
	label: string;
	translationTolerance: number;
	rotationTolerance: number;
	immobilization: string;
}

// Exported: scene.ts's updateElectronApplicator3D reads this off `activeSpecialSetupSpec()`.
export interface SpecialSetupSpec {
	type: string;
	label: string;
	toleranceMm?: number;
	matchTechnique?: string;
	junctionA?: string;
	junctionB?: string;
	shape?: string;
	widthCm?: number;
	heightCm?: number;
	cone?: string;
	ssdCm?: number;
	bolusThicknessCm?: number;
}

interface AdaptiveSeedHistoryEntry {
	fx: number;
	scenarioIndex: number;
	planKey: string;
}

export interface AdaptiveCourseSpec {
	prescriptionGy: number;
	totalFractions: number;
	dosePerFractionGy: number;
	rectumTeachingReferenceGy?: number;
	bowelTeachingReferenceGy?: number;
	seedHistory?: AdaptiveSeedHistoryEntry[];
}

// Exported: state.ts tightens `AdaptiveWorkflowState.scenario` (owned by adaptive.ts) to
// this type.
export interface AdaptiveScenario {
	title: string;
	summary: string;
	findings: string[];
	recommendedPlan: string;
}

interface AdaptivePlanSpec {
	title: string;
	summary?: string;
	metrics?: string[];
	planned: PlannedParameters;
	fields: TreatmentField[];
}

interface AdaptiveSpec {
	label: string;
	defaultPlanKey: string;
	course: AdaptiveCourseSpec;
	scenarios: AdaptiveScenario[];
	plans: Record<string, AdaptivePlanSpec>;
}

export interface TreatmentCase {
	patient: string;
	mrn: string;
	siteLabel: string;
	siteKey: string;
	position: string;
	positionLabel: string;
	technique: string;
	energy: string;
	fraction: string;
	billing: CaseBilling;
	note: string;
	immobilization: CaseImmobilization;
	planned: PlannedParameters;
	fields: TreatmentField[];
	motionManagement?: MotionManagementSpec;
	stereotactic?: StereotacticSpec;
	setupSiteZ?: number;
	setupBodyX?: number;
	setupBodyY?: number;
	specialSetup?: SpecialSetupSpec;
	adaptive?: AdaptiveSpec;
	// Legacy fallback shape read by getTreatmentFields() when `fields` is absent; never
	// set on any of the 32 cases (dead code kept from before the `fields` array existed).
	delivery?: { field?: string; mu?: number; doseRate?: number };
	// Legacy fallback read by main.ts (`siteLabel || site`); never set on any of the 32
	// cases (dead code kept from before `siteLabel` existed).
	site?: string;
}

// `deliveryCasePlan()`'s return: a `TreatmentField` plus the two fields it always
// computes and guarantees present (`field`, uppercased `mode`).
export interface DeliveryFieldPlan extends TreatmentField {
	field: string;
	mode: string;
}

// IGRT couch-shift coordinate convention used throughout the delivery/ modules (VRT/LNG/LAT).
export interface CoordinateShift {
	vrt: number;
	lng: number;
	lat: number;
}

// Exported: state.ts tightens `MotionManagementState.phaseData` (owned by motion.ts)
// to this type. Shape of each entry built by motion4DPhaseData().
export interface MotionPhaseSample {
	phase: number;
	si: number;
	ap: number;
	lr: number;
}

// Exported: state.ts tightens `OISSessionState.events` (owned by ois.ts) to this
// type. Shape built by oisLogEvent().
export interface OISEvent {
	ts: string;
	time: string;
	type: string;
	title: string;
	detail: string;
	dedupe: string;
}

// Exported: state.ts tightens `OISSessionState.clearanceOverrides` (owned by
// ois.ts) to this type. Base shape built by linac-safety.ts's applyClearanceOverride;
// `dynamicEncounterLogged` is added dynamically by treatment-delivery.ts.
export interface ClearanceOverrideRecord {
	active: boolean;
	used: boolean;
	fieldIndex: number;
	field: string;
	rationale: string;
	ack: boolean;
	reason: string;
	appliedAt: string;
	mechanicalHold: boolean;
	trajectoryHold: boolean;
	scope: string[];
	withdrawnAt?: string;
	dynamicEncounterLogged?: boolean;
}

// Exported: state.ts tightens `SRSWorkflowState.lastClearance` (owned by stereotactic.ts) to
// this type. Fields are the ones actually read off it in stereotactic.ts; linac-safety.ts's
// clearance-check helpers return objects with these fields plus others not read here.
export interface ClearanceResult {
	safe: boolean;
	minMargin: number;
	reason: string;
	field: string;
	angle: number;
}

// Exported: state.ts tightens `AdaptiveCourseState.history` (owned by adaptive.ts) to
// this type. Entries are built either from a seeded history (postedAt absent) or a
// posted fraction (seeded absent).
export interface AdaptiveHistoryEntry {
	fx: number;
	anatomy: string;
	scenarioIndex: number;
	planKey: string;
	planTitle: string;
	targetDoseGy: number;
	ptvV95: number;
	rectumGy: number;
	bowelGy: number;
	seeded?: boolean;
	postedAt?: string;
}
