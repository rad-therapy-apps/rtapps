// Motion management: 4D, DIBH hold, gating (split out of linac-delivery.ts, #77).
import { S } from '../state';
import {
	motionAcquire,
	motionDibhTarget,
	motionDibhTolerance,
	motionGateHigh,
	motionGateLow,
	motionHold,
	motionPanel,
	motionRelease,
	motionWaveCanvas
} from '../dom';
import { setTextById } from '../main';
import { setPendantLCD } from '../linac-safety';
import { oisLogEvent } from './ois';
import { renderTreatmentDeliveryPanel } from './treatment-delivery';

function activeMotionSpec() {
	return S.activeTreatmentCase?.motionManagement || null;
}

export function motionRequired() {
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

export function resetMotionManagementForCase() {
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

export function currentMotionGateOpen() {
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

export function acquireMotionCharacterization() {
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

export function verifyMotionManagement() {
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

export function startDIBHHold() {
	if (S.motionManagement.mode !== 'DIBH') return;
	S.motionManagement.holdActive = true;
	S.motionManagement.holdStartedAt = performance.now();
	setPendantLCD('DIBH', 'COACH · inhale and hold');
	renderMotionPanel();
}

export function releaseDIBHHold() {
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
export function renderMotionPanel(force = false) {
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

export function updateMotionAnimation(now) {
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
