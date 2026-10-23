// Adaptive replanning course and dose chart (split out of linac-delivery.ts, #77).
import { S } from '../state';
import {
	adaptiveDoseCanvas,
	adaptiveNextFraction,
	adaptivePanel,
	adaptiveResetCourse,
	oisPanel
} from '../dom';
import { renderTreatmentMonitor, setDetectorStateGame, setKvState, setODIState } from '../scene';
import { renderClinicalIGRT, resetClinicalIGRTForCase } from '../linac-igrt';
import { setTextById } from '../main';
import { setPendantLCD, updateBEVInset } from '../linac-safety';
import type { AdaptiveCourseSpec, AdaptiveScenario } from './types';
import { resetSpecialSetupForCase, updateSpecialAnatomyTargetMarker } from './special-setup';
import { resetSRSWorkflowForCase } from './stereotactic';
import { resetMotionManagementForCase } from './motion';
import { loadOISSession, oisLogEvent, renderOISPanel } from './ois';
import { resetTreatmentDeliveryForCase, renderTreatmentDeliveryPanel } from './treatment-delivery';
import { IMAGING_SITES } from './cases';
import { runPatientSetup } from './case-setup';

export function adaptiveSpec() {
	return S.activeTreatmentCase?.adaptive || null;
}

export function adaptiveRequired() {
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
		course = (spec?.course || {}) as AdaptiveCourseSpec;
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

export function renderAdaptiveCourse() {
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

export function applyAdaptivePlan(planKey) {
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

export function resetAdaptiveWorkflowForCase() {
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
	const d = document.getElementById('adaptiveCheckDose') as HTMLInputElement | null,
		a = document.getElementById('adaptiveCheckApprove') as HTMLInputElement | null;
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

export function verifyAdaptivePlan() {
	if (!adaptiveRequired()) return;
	S.adaptiveWorkflow.doseChecked = !!(
		document.getElementById('adaptiveCheckDose') as HTMLInputElement | null
	)?.checked;
	S.adaptiveWorkflow.finalApproved = !!(
		document.getElementById('adaptiveCheckApprove') as HTMLInputElement | null
	)?.checked;
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

export function recordAdaptiveFractionDose() {
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

export function advanceAdaptiveFraction() {
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
	const d = document.getElementById('adaptiveCheckDose') as HTMLInputElement | null,
		a = document.getElementById('adaptiveCheckApprove') as HTMLInputElement | null;
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

export function resetAdaptiveCourseHistory() {
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

export function renderAdaptivePanel() {
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
	const scen = (S.adaptiveWorkflow.scenario || {}) as AdaptiveScenario;
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
