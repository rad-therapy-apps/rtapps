// OIS record-and-verify and sign-off (split out of linac-delivery.ts, #77).
import { S } from '../state';
import {
	oisNote,
	oisOverrideCard,
	oisOverrideReviewCheck,
	oisOverrideSummary,
	oisPanel,
	oisReviewCheck,
	oisSignOff,
	oisTherapist
} from '../dom';
import { fmtIGRT, getIGRTApplied, getIGRTResidual } from '../linac-igrt';
import { setTextById } from '../main';
import {
	allTreatmentFieldsCompleted,
	clearanceOverrideUsedAny,
	igrtAlignmentReadyForDelivery,
	setPendantLCD
} from '../linac-safety';
import { getTreatmentFields } from './plan';
import { srsRequired, stereotacticCaseLabel } from './stereotactic';
import { motionRequired } from './motion';
import { adaptiveSpec, adaptiveRequired, renderAdaptiveCourse } from './adaptive';
import { immobilizationRequired } from './immobilization';

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

export function loadOISSession() {
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

export function persistOISSession() {
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

export function oisLogEvent(type, title, detail = '', dedupe = '') {
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

export function fmtOISShift(obj) {
	if (!obj) return '—';
	return `LAT ${fmtIGRT(Number(obj.lat) || 0, 'mm')} · LNG ${fmtIGRT(Number(obj.lng) || 0, 'mm')} · VRT ${fmtIGRT(Number(obj.vrt) || 0, 'mm')} · R/P/Y ${fmtIGRT(Number(obj.roll) || 0, '°')} / ${fmtIGRT(Number(obj.pitch) || 0, '°')} / ${fmtIGRT(Number(obj.yaw) || 0, '°')}`;
}

export function renderOISPanel() {
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

export function signOffOISRecord() {
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
