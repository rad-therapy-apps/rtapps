import * as THREE from 'three-linac';
import { S } from './state';
import {
	bevFieldGroup,
	bevFieldLight,
	bevJawMasks,
	bevJawOutline,
	bevMlcLeaves,
	clearanceOverrideAck,
	clearanceOverrideApply,
	clearanceOverrideCard,
	clearanceOverrideRationale,
	clearanceOverrideReason,
	clearanceOverrideStatus,
	clearanceOverrideWithdraw,
	consoleMotionEnable,
	mlcShapeButton,
	pendantMotionEnable
} from './dom';
import {
	applyDetectorCommandedPose,
	getTreatmentMonitorActual,
	monitorPlannedDisplay,
	renderTreatmentMonitor,
	updateCouchAccordion,
	updateJawPositions,
	updateODIReadout
} from './scene';
import {
	activeElectronBolusSpec,
	activeSpecialSetupSpec,
	adaptiveRequired,
	adaptiveSpec,
	arcAngularState,
	deliveryCasePlan,
	deliveryProgressFraction,
	electronBolusDeliveryOK,
	electronBolusDeliveryRequired,
	getCurrentPlannedParameters,
	getDynamicFieldState,
	getTreatmentFields,
	immobilizationRequired,
	immobilizationVerified,
	isFixedElectronField,
	motionRequired,
	normalizeAngleValue,
	oisLogEvent,
	parseFirstNumber,
	parseJawSpec,
	persistOISSession,
	renderOISPanel,
	renderSRSPanel,
	renderTreatmentDeliveryPanel,
	specialSetupRequired,
	specialSetupVerified,
	srsRequired,
	stereotacticCaseLabel,
	treatmentParamMatches
} from './linac-delivery';
import { renderClinicalIGRT } from './linac-igrt';
import { saveGameState } from './game';
import { setTextById, syncOperatorConsole, wrap360 } from './main';

// RTApps (#77 phase 2 task 19): interim `window.clinicalIGRTCouchShift`/
// `window.imagingCouchShift` typing — same rationale as linac-igrt.ts's interim
// `clinicalIGRTActive` declaration (consolidated declare-global lives in main.ts,
// which converts last in this task); `imagingCouchShift` is a 4th window global found
// by grep during this conversion, beyond the 3 named in the task plan, with the same
// need. Removed from here and folded into main.ts's block when main.ts converts.
declare global {
	interface Window {
		clinicalIGRTCouchShift: (axis: string, delta: number) => boolean;
		imagingCouchShift: (axis: string, delta: number) => boolean;
	}
}

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

export function applyClearanceOverride() {
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

export function withdrawClearanceOverride() {
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
		const e = (S.specialSetupWorkflow.electron || {}) as typeof S.specialSetupWorkflow.electron,
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
						field: field?.name || (field as { field?: string })?.field || 'Treatment field',
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

export const ROTATION_STEP = Math.PI / 36;

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

export const JAW_EDGE_MIN_CM = 0.0,
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

export function currentJawSummary() {
	const d = jawDimensions();
	return `${d.x.toFixed(1)} × ${d.y.toFixed(1)} cm`;
}

export function syncLegacyJawValue() {
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

export function nudgeJawEdge(key, delta) {
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
	bevJawOutline.setAttribute('x', jawX as unknown as string);
	bevJawOutline.setAttribute('y', jawY as unknown as string);
	bevJawOutline.setAttribute('width', jawPx as unknown as string);
	bevJawOutline.setAttribute('height', jawPy as unknown as string);
	const activelyDelivering = !!(
		S.treatmentDelivery?.delivering &&
		!S.treatmentDelivery?.held &&
		!S.treatmentDelivery?.gateHeld
	);
	if (bevFieldLight) {
		bevFieldLight.setAttribute('x', jawX as unknown as string);
		bevFieldLight.setAttribute('y', jawY as unknown as string);
		bevFieldLight.setAttribute('width', jawPx as unknown as string);
		bevFieldLight.setAttribute('height', jawPy as unknown as string);
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
			planJaw.setAttribute('x', pLeft as unknown as string);
			planJaw.setAttribute('y', pTop as unknown as string);
			planJaw.setAttribute('width', pJawW as unknown as string);
			planJaw.setAttribute('height', pJawH as unknown as string);
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
			const e = (S.specialSetupWorkflow.electron || {}) as typeof S.specialSetupWorkflow.electron,
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

export function syncFundamentalReadouts(label?, value?) {
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
export function setSafetyHUD(blocked, reason = '') {
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

export function attemptCollisionSafeMotion(label, mutator) {
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

export function setPendantMotionArmed(on) {
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

export function requirePendantMotion(controlName) {
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

export function runFunctionKeyIsolated(action) {
	const mech = captureMechanicalGeometryState();
	action();
	restoreMechanicalGeometryState(mech);
	syncFundamentalReadouts();
}

export const imgCouch = (axis, d) => {
	if (window.clinicalIGRTCouchShift) window.clinicalIGRTCouchShift(axis, d);
	if (!window.clinicalIGRTActive && window.imagingCouchShift)
		return window.imagingCouchShift(axis, d);
	return false;
};

const ROT_DEG = 0.5,
	ROT_RAD = (ROT_DEG * Math.PI) / 180;

const couchTilt = (axis3d, sign) => {
	if (S.couchTopGroup) S.couchTopGroup.rotation[axis3d] += sign * ROT_RAD;
};

export const safeTilt = (label, axis, sign, stateKey) => {
	if (!requirePendantMotion(label)) return;
	const ok = attemptCollisionSafeMotion(label, () => couchTilt(axis, sign));
	if (!ok) return;
	fundamentalState[stateKey] += sign * ROT_DEG;
	imgCouch(stateKey, sign * ROT_DEG);
	syncFundamentalReadouts(label, `${fundamentalState[stateKey].toFixed(1)}°`);
};
