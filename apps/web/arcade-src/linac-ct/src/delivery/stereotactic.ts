// SRS / SBRT checklist, dry run and clearance (split out of linac-delivery.ts, #77).
import { S } from '../state';
import { srsDryRun, srsLaunchButton, srsPanel, srsVerifyTimeout } from '../dom';
import { monitorPlannedDisplay, renderTreatmentMonitor, setBeamState } from '../scene';
import { setTextById, wrap360 } from '../main';
import {
	clearanceOverrideActive,
	currentSelectedFieldClearance,
	deliveryGeometryChecks,
	fundamentalState,
	getCollisionAssessment,
	igrtAlignmentReadyForDelivery,
	setPendantLCD,
	syncFundamentalReadouts,
	TREATMENT_CLEARANCE_REQUIRED_MARGIN,
	treatmentTrajectorySamples
} from '../linac-safety';
import { normalizeAngleValue, deliveryCasePlan, getCurrentPlannedParameters } from './plan';
import { oisLogEvent } from './ois';
import { renderTreatmentDeliveryPanel } from './treatment-delivery';

function activeSRSConfig() {
	return S.activeTreatmentCase?.stereotactic || null;
}

export function srsRequired() {
	return !!activeSRSConfig();
} // internal: any stereotactic SRS/SBRT workflow

export function cranialSRSRequired() {
	return String(activeSRSConfig()?.type || '').toUpperCase() === 'SRS';
}

export function sbrtRequired() {
	return String(activeSRSConfig()?.type || '').toUpperCase() === 'SBRT';
}

export function stereotacticCaseLabel() {
	return sbrtRequired() ? 'SBRT' : cranialSRSRequired() ? 'SRS' : 'STEREOTACTIC';
}

export function activeIGRTTolerances() {
	const s = activeSRSConfig();
	return {
		translation: Number(s?.translationTolerance ?? 1),
		rotation: Number(s?.rotationTolerance ?? 0.5)
	};
}

export function resetSRSWorkflowForCase() {
	S.srsWorkflow = {
		dryRunByField: {},
		timeoutVerifiedByField: {},
		lastClearance: null,
		dryRunning: false
	};
	['srsCheckPatient', 'srsCheckRx', 'srsCheckMask', 'srsCheckTeam'].forEach((id) => {
		const el = document.getElementById(id) as HTMLInputElement | null;
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

export function renderSRSPanel() {
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

export function recheckSRSClearance() {
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

export async function runSRSDryRun() {
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

export function verifySRSTimeout() {
	if (!srsRequired()) return;
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
	const manual = ['srsCheckPatient', 'srsCheckRx', 'srsCheckMask', 'srsCheckTeam'].every(
		(id) => !!(document.getElementById(id) as HTMLInputElement | null)?.checked
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
