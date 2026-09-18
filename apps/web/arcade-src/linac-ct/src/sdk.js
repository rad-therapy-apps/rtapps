// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import { S } from './state.js';
import {
	adaptivePanel,
	chargeCapturePanel,
	chargeIgrtHandling,
	chargePost,
	chargeTreatmentCode,
	chargeVerify,
	deliveryCompleteSession,
	deliveryPanel,
	deliveryReviewCharges,
	igrtPanel,
	motionPanel,
	oisPanel
} from './dom.js';
import { renderTreatmentMonitor, setBeamState } from './scene.js';
import {
	cranialSRSRequired,
	deliveredTreatmentMU,
	expectedTechnicalIGRTHandling,
	expectedTechnicalTreatmentCode,
	getTreatmentFields,
	oisLogEvent,
	recordAdaptiveFractionDose,
	renderOISPanel,
	renderTreatmentDeliveryPanel,
	sbrtRequired
} from './linac-delivery.js';
import { allTreatmentFieldsCompleted, setPendantLCD, updateBEVInset } from './linac-safety.js';

export function resolveHubUrl() {
	if (window.RTApps) {
		window.RTApps.activityUrl('sim-hub-qa')
			.then(function (url) {
				S.HUB_URL = url;
				const backBtn = document.getElementById('rtappsBackBtn');
				if (backBtn) backBtn.disabled = false;
			})
			.catch(function () {});
	}
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

export function updateChargeEducation() {
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

export function completeFractionWithoutCurrentCPTModule() {
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

export function openChargeCapture() {
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

export function verifyChargeCapture() {
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

export function postChargeAndCompleteFraction() {
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
