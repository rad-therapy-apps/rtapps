// Case loading, patient pose and patient setup (split out of linac-delivery.ts, #77).
import * as THREE from 'three-linac';
import { S } from '../state';
import { treatmentCaseSelect } from '../dom';
import { renderTreatmentMonitor } from '../scene';
import { resetClinicalIGRTForCase } from '../linac-igrt';
import { setPendantLCD } from '../linac-safety';
import type { TreatmentField } from './types';
import { deliveryCasePlan } from './plan';
import { resetSpecialSetupForCase, updateSpecialAnatomyTargetMarker } from './special-setup';
import { resetSRSWorkflowForCase } from './stereotactic';
import { resetMotionManagementForCase } from './motion';
import { loadOISSession, renderOISPanel } from './ois';
import { resetAdaptiveWorkflowForCase, renderAdaptivePanel } from './adaptive';
import { updateElectronBolusMesh } from './electron-bolus';
import { resetImmobilizationWorkflowForCase, renderImmobilizationPanel } from './immobilization';
import { resetTreatmentDeliveryForCase } from './treatment-delivery';
import { PATIENT_ROT, IMAGING_SITES, TREATMENT_CASES } from './cases';

export function populateTreatmentCaseSelect() {
	if (!treatmentCaseSelect) return;
	treatmentCaseSelect.innerHTML = '';
	TREATMENT_CASES.forEach((c, i) => {
		const opt = document.createElement('option');
		opt.value = String(i);
		opt.textContent = `${c.patient} · ${c.siteLabel}`;
		treatmentCaseSelect.appendChild(opt);
	});
}

export function loadTreatmentCase(index) {
	const safeIndex =
		((index % TREATMENT_CASES.length) + TREATMENT_CASES.length) % TREATMENT_CASES.length;
	S.activeTreatmentCaseIndex = safeIndex;
	S.activeTreatmentCase = TREATMENT_CASES[safeIndex];
	if (treatmentCaseSelect) treatmentCaseSelect.value = String(safeIndex);
	const site = IMAGING_SITES.find((s) => s.key === S.activeTreatmentCase.siteKey);
	if (site && typeof runPatientSetup === 'function') {
		const setupZ = Number.isFinite(S.activeTreatmentCase.setupSiteZ)
			? S.activeTreatmentCase.setupSiteZ
			: site.z;
		runPatientSetup(
			S.activeTreatmentCase.position || (site.orient && site.orient[0]) || 'HFS',
			setupZ,
			S.activeTreatmentCase.setupBodyX || 0,
			S.activeTreatmentCase.setupBodyY || 0
		);
	}
	setPendantLCD(
		'PATIENT LOADED',
		`${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
	);
	resetImmobilizationWorkflowForCase();
	resetClinicalIGRTForCase();
	resetMotionManagementForCase();
	resetSRSWorkflowForCase();
	resetSpecialSetupForCase();
	resetAdaptiveWorkflowForCase();
	resetTreatmentDeliveryForCase();
	loadOISSession();
	renderTreatmentMonitor();
	renderImmobilizationPanel();
	renderAdaptivePanel();
	renderOISPanel();
}

export function isFixedElectronField(field: TreatmentField = deliveryCasePlan()) {
	return !!field?.electron && String(field?.mode || 'STATIC').toUpperCase() === 'STATIC';
}

function setPatientPosition(name) {
	if (!S.patientGroup) return;
	const r = PATIENT_ROT[name] || PATIENT_ROT.HFS;
	S.patientGroup.rotation.set(r[0], r[1], r[2]);
}

function applyCasePatientPose(c = S.activeTreatmentCase) {
	const p = S.patientAnatomyParts || {};
	if (p.armL) {
		p.armL.position.set(-0.25, 0, -0.35);
		p.armL.rotation.set(0, 0, 0);
	}
	if (p.armR) {
		p.armR.position.set(0.25, 0, -0.35);
		p.armR.rotation.set(0, 0, 0);
	}
	if (p.nose) {
		p.nose.position.set(0, 0.1, -0.99);
		p.nose.rotation.set(0, 0, 0);
	}
	const type = String(c?.specialSetup?.type || '').toUpperCase();
	const siteKey = String(c?.siteKey || '').toLowerCase();
	if (type === 'BREAST_MATCH' || type === 'ELECTRON' || siteKey === 'breast') {
		// Breast treatment posture: supine, both arms elevated above the head/shoulders.
		if (p.armL) {
			p.armL.position.set(-0.22, 0.055, -0.76);
			p.armL.rotation.z = -0.08;
		}
		if (p.armR) {
			p.armR.position.set(0.22, 0.055, -0.76);
			p.armR.rotation.z = 0.08;
		}
		// Turn the face slightly away from the treated side (visual cue only).
		if (p.nose) p.nose.position.x = 0.035;
	}
	if (siteKey === 'hneck') {
		// Head-and-neck setup: shoulders slightly depressed, arms relaxed at sides.
		if (p.armL) {
			p.armL.position.set(-0.25, -0.01, -0.38);
			p.armL.rotation.z = -0.03;
		}
		if (p.armR) {
			p.armR.position.set(0.25, -0.01, -0.38);
			p.armR.rotation.z = 0.03;
		}
	}
	if (type === 'CSI') {
		// Conventional supine CSI: body straight, arms at sides; cranial mask/head-and-shoulder immobilization is represented by setup context.
		if (p.armL) p.armL.position.set(-0.24, -0.005, -0.3);
		if (p.armR) p.armR.position.set(0.24, -0.005, -0.3);
	}
}

export function runPatientSetup(name, siteZ, bodyX = 0, bodyY = 0) {
	// animate patient into isocenter (3-point setup); body offset centers the prescribed anatomy
	if (S.patientBodyGroup)
		S.patientBodyGroup.position.set(Number(bodyX) || 0, Number(bodyY) || 0, -(siteZ || 0));
	applyCasePatientPose(S.activeTreatmentCase);
	updateSpecialAnatomyTargetMarker();
	updateElectronBolusMesh();
	if (!S.patientGroup || !S.patientHome) {
		setPatientPosition(name);
		return;
	}
	setPatientPosition(name);
	const home = S.patientHome;
	const start = home
		.clone()
		.add(
			new THREE.Vector3(
				(Math.random() < 0.5 ? -1 : 1) * 0.3,
				0.22,
				(Math.random() < 0.5 ? -1 : 1) * 0.5
			)
		);
	S.patientGroup.position.copy(start);
	const t0 = performance.now(),
		dur = 1100;
	if (S.patientSetupRAF) cancelAnimationFrame(S.patientSetupRAF);
	const step = (t) => {
		const p = Math.min(1, (t - t0) / dur),
			e = 1 - Math.pow(1 - p, 3);
		S.patientGroup.position.lerpVectors(start, home, e);
		if (p < 1) S.patientSetupRAF = requestAnimationFrame(step);
		else S.patientGroup.position.copy(home);
	};
	S.patientSetupRAF = requestAnimationFrame(step);
}

// Displace/tilt the 3D patient by the residual imaging error; residual 0 → re-centered on isocenter.
export function setImagingError6DOF(res) {
	if (!S.patientErrorGroup || !S.errorGroupHome) return;
	const r = res || { lat: 0, lng: 0, vrt: 0, roll: 0, pitch: 0, yaw: 0 };
	const MM = 0.02,
		ROT = (Math.PI / 180) * 2.5; // world units per mm; radians per degree (visually amplified)
	S.patientErrorGroup.position.set(
		S.errorGroupHome.x - (r.lat || 0) * MM,
		S.errorGroupHome.y - (r.vrt || 0) * MM,
		S.errorGroupHome.z - (r.lng || 0) * MM
	);
	S.patientErrorGroup.rotation.set(
		-(r.pitch || 0) * ROT,
		-(r.yaw || 0) * ROT,
		-(r.roll || 0) * ROT
	);
}
