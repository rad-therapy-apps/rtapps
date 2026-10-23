// Beam-on delivery: arm, hold, resume, terminate (split out of linac-delivery.ts, #77).
import { S } from '../state';
import {
	beamOnButton,
	deliveryArm,
	deliveryFieldSelect,
	deliveryHold,
	deliveryPanel,
	deliveryStart,
	deliveryTerminate
} from '../dom';
import { monitorPlannedDisplay, renderTreatmentMonitor, setBeamState } from '../scene';
import { setTextById } from '../main';
import { renderTreatmentCompletionControls, resetTreatmentCompletion } from '../sdk';
import {
	allTreatmentFieldsCompleted,
	clearanceOverrideActive,
	clearanceOverrideRecord,
	COLLISION_PROXY_TOL,
	getCollisionAssessment,
	getDeliveryReadiness,
	renderClearanceOverrideCard,
	setPendantLCD,
	updateBEVInset
} from '../linac-safety';
import type { ClearanceOverrideRecord } from './types';
import {
	getTreatmentFields,
	deliveryCasePlan,
	isDynamicTreatmentField,
	deliveryProgressFraction,
	getDynamicFieldState,
	applyDynamicDeliveryMachineState,
	populateDeliveryFieldSelect
} from './plan';
import { cranialSRSRequired } from './stereotactic';
import { motionRequired, currentMotionGateOpen } from './motion';
import { oisLogEvent } from './ois';
import { renderElectronBolusDeliveryTask } from './electron-bolus';

const DELIVERY_SPEED_FACTOR = 4;

export function deliveredTreatmentMU() {
	return getTreatmentFields().reduce(
		(sum, f, i) => sum + (S.treatmentDelivery.completedFields[i] ? Number(f.mu) || 0 : 0),
		0
	);
}

export function expectedTechnicalTreatmentCode() {
	return String(S.activeTreatmentCase?.billing?.treatmentCode || '');
}

export function expectedTechnicalIGRTHandling() {
	const explicit = String(S.activeTreatmentCase?.billing?.igrtHandling || '');
	if (explicit) return explicit;
	const imaging = (S.activeTreatmentCase?.planned?.imaging || '').toLowerCase();
	if (!imaging || imaging === 'none') return 'none';
	if (cranialSRSRequired()) return 'separate';
	return 'bundled';
}

export function resetTreatmentDeliveryForCase() {
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

export function renderTreatmentDeliveryPanel() {
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

export function armTreatmentDelivery() {
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

export function holdTreatmentDelivery(reason = 'manual hold') {
	if (!S.treatmentDelivery.delivering) return;
	S.treatmentDelivery.held = true;
	S.treatmentDelivery.autoHoldReason = reason;
	oisLogEvent('BEAM HOLD', 'Treatment delivery held', reason);
	setBeamState(false);
	setPendantLCD('BEAM HOLD', reason);
	renderTreatmentDeliveryPanel();
}

export function resumeTreatmentDelivery() {
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
		if (now - S.deliveryPanelStamp > 250) {
			S.deliveryPanelStamp = now;
			renderTreatmentDeliveryPanel();
		}
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
				rec = clearanceOverrideRecord(idx) as ClearanceOverrideRecord | null;
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
	// RTApps perf pass: throttle the delivery panel repaint like the adjacent monitor
	// repaint — display-only text refreshed at 4Hz is imperceptible vs. 60Hz. Every exit
	// path out of deliveryTick (hold/finish/terminate) still calls renderTreatmentDeliveryPanel()
	// unconditionally, so end-state text is never stale.
	if (now - S.deliveryPanelStamp > 250) {
		S.deliveryPanelStamp = now;
		renderTreatmentDeliveryPanel();
	}
	if (now - S.deliveryMonitorStamp > 250) {
		S.deliveryMonitorStamp = now;
		renderTreatmentMonitor();
	}
	S.deliveryRAF = requestAnimationFrame(deliveryTick);
}

export function startTreatmentDelivery() {
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

export function terminateTreatmentDelivery() {
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
