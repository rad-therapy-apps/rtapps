// Immobilization devices, verification and rules (split out of linac-delivery.ts, #77).
import * as THREE from 'three-linac';
import { S } from '../state';
import { immobilizationLaunchButton, immobilizationPlacedList, immobilizationShelf } from '../dom';
import { GROUND_Y, renderTreatmentMonitor } from '../scene';
import { setTextById } from '../main';
import { setPendantLCD } from '../linac-safety';
import { oisLogEvent, renderOISPanel } from './ois';
import { renderTreatmentDeliveryPanel } from './treatment-delivery';

export const IMMOBILIZATION_DEVICE_META = {
	headMask: { name: 'Short Head Mask', color: '#7fd8f7', dark: '#254c61' },
	hnMask: { name: 'Head & Shoulders Mask', color: '#9ae894', dark: '#325a2f' },
	bodyFix: { name: 'Body Fix (SBRT)', color: '#ffb1a0', dark: '#6b352b' },
	headrest: { name: 'Headrest', color: '#ffd77b', dark: '#6b5521' },
	shoulderPull: { name: 'Shoulder Pull-Down', color: '#ff9f70', dark: '#6a3b24' },
	wingBoard: { name: 'Wing Board', color: '#bc9cff', dark: '#4d3f72' },
	vacLok: { name: 'Vac-Lok', color: '#7bc9b5', dark: '#27574f' },
	breastBoard: { name: 'Breast Board', color: '#ff8eb2', dark: '#6e2f43' },
	armSupport: { name: 'Arm Support', color: '#c9acff', dark: '#4e4270' },
	bellyBoard: { name: 'Belly Board', color: '#f7c76e', dark: '#705827' },
	kneeSupport: { name: 'Knee Support', color: '#8ec3ff', dark: '#2f5371' },
	footStocks: { name: 'Foot Stocks', color: '#f59dcd', dark: '#6e3654' },
	srsMask: { name: 'SRS Mask / Baseplate', color: '#62e0df', dark: '#1f5b5c' },
	legPositioner: { name: 'Leg / Ankle Positioner', color: '#f4b76d', dark: '#6d4a1f' }
};

function immoMeta(id) {
	return (
		IMMOBILIZATION_DEVICE_META[id] || {
			name: 'Immobilization Device',
			color: '#5ea4b4',
			dark: '#315566'
		}
	);
}

const IMMOBILIZATION_DEVICE_IDS = [
	'headMask',
	'hnMask',
	'bodyFix',
	'headrest',
	'shoulderPull',
	'wingBoard',
	'vacLok',
	'breastBoard',
	'armSupport',
	'bellyBoard',
	'kneeSupport',
	'footStocks',
	'srsMask',
	'legPositioner'
];

export function immobilizationSpec() {
	return S.activeTreatmentCase?.immobilization || null;
}

export function immobilizationRequired() {
	const s = immobilizationSpec();
	return !!(s && Array.isArray(s.required) && s.required.length);
}

export function immobilizationVerified() {
	return !immobilizationRequired() || !!S.immobilizationWorkflow.verified;
}

function shuffleImmo(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export function resetImmobilizationWorkflowForCase() {
	const required = immobilizationRequired();
	S.immobilizationWorkflow = {
		required,
		verified: !required,
		selected: [],
		shelfOrder: shuffleImmo(IMMOBILIZATION_DEVICE_IDS),
		attempts: 0,
		lastFeedback: '',
		positionChecked: false,
		indexingChecked: false,
		preparationChecked: false
	};
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	if (immobilizationLaunchButton) {
		immobilizationLaunchButton.classList.toggle('case-active', required);
		immobilizationLaunchButton.disabled = !required;
	}
}

function immobilizationDeviceSVG(id) {
	const meta = immoMeta(id),
		c = meta.color,
		d = meta.dark;
	const stroke = 'stroke="#edf9ff" stroke-width="2.4"',
		outline = `stroke="${c}" stroke-width="3"`,
		deep = `fill="${d}"`,
		fillSoft = `fill="${c}" fill-opacity="0.82"`;
	const svg = {
		headMask: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M20 14q20-15 40 0v34q-19 10-40 0Z" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="3.5 3"/><ellipse cx="40" cy="24" rx="17" ry="18" ${deep} ${stroke}/><circle cx="34" cy="23" r="1.9" fill="#0f1519"/><circle cx="46" cy="23" r="1.9" fill="#0f1519"/><path d="M34 33q6 4 12 0" fill="none" stroke="#0f1519" stroke-width="2"/><path d="M26 52h28" ${outline}/></svg>`,
		hnMask: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M12 8h56l4 48H8Z" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="4 3"/><ellipse cx="40" cy="19" rx="14" ry="14" ${deep} ${stroke}/><rect x="30" y="30" width="20" height="9" rx="4" ${fillSoft}/><path d="M8 52h64" ${outline}/><path d="M14 44h52" stroke="${c}" stroke-width="2" stroke-dasharray="3 3"/></svg>`,
		bodyFix: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="8" y="9" width="64" height="46" rx="12" ${fillSoft} ${stroke}/><path d="M40 12v40" stroke="${d}" stroke-width="3"/><path d="M20 20q20 8 40 0M20 32q20 8 40 0M20 44q20 8 40 0" fill="none" stroke="${d}" stroke-width="2.4"/><circle cx="66" cy="15" r="3.4" fill="#0d1518" stroke="#edf9ff" stroke-width="1.4"/></svg>`,
		headrest: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M12 49q12-12 20-30h18q10 18 18 30l-7 6H19Z" ${fillSoft} ${stroke}/><path d="M28 43q12-13 24 0" fill="none" stroke="${d}" stroke-width="4.5"/></svg>`,
		shoulderPull: `<svg viewBox="0 0 80 64" aria-hidden="true"><circle cx="20" cy="49" r="9" ${fillSoft} ${stroke}/><circle cx="60" cy="49" r="9" ${fillSoft} ${stroke}/><path d="M20 13v27M60 13v27" stroke="${c}" stroke-width="4.5" stroke-linecap="round"/><path d="M20 17q20 14 40 0" fill="none" stroke="#f6fdff" stroke-width="2.2"/></svg>`,
		wingBoard: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="22" y="9" width="36" height="46" rx="3" ${deep} ${stroke}/><path d="M22 17L8 10v34l14-7" ${fillSoft} ${stroke}/><path d="M58 17l14-7v34l-14-7" ${fillSoft} ${stroke}/><circle cx="31" cy="20" r="3" fill="#0d1518"/><circle cx="49" cy="20" r="3" fill="#0d1518"/></svg>`,
		vacLok: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M10 34q6-22 28-20q24-4 32 17q6 21-18 26q-31 6-42-5q-7-7 0-18Z" ${fillSoft} ${stroke}/><circle cx="26" cy="27" r="2.2" fill="#edf9ff"/><circle cx="39" cy="22" r="2.2" fill="#edf9ff"/><circle cx="52" cy="37" r="2.2" fill="#edf9ff"/></svg>`,
		breastBoard: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M11 52h58L55 11H24Z" ${fillSoft} ${stroke}/><path d="M24 48 53 18" stroke="#f8fdff" stroke-width="2.2"/><path d="M27 22h25" stroke="${d}" stroke-width="4.5" stroke-linecap="round"/></svg>`,
		armSupport: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M19 50V18q0-7 7-7h5v39" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M61 50V18q0-7-7-7h-5v39" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M28 13h24" stroke="#edf9ff" stroke-width="3.2" stroke-linecap="round"/></svg>`,
		bellyBoard: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="8" y="12" width="64" height="42" rx="5" ${fillSoft} ${stroke}/><ellipse cx="40" cy="34" rx="16" ry="12" fill="#0d1619" stroke="#edf9ff" stroke-width="2.4"/><path d="M15 20h11M54 20h11" stroke="#f6fdff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
		kneeSupport: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M12 52 40 13 68 52Z" ${fillSoft} ${stroke}/><path d="M27 40q13-12 26 0" fill="none" stroke="${d}" stroke-width="4.4"/></svg>`,
		footStocks: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="10" y="20" width="24" height="33" rx="3" ${fillSoft} ${stroke}/><rect x="46" y="20" width="24" height="33" rx="3" ${fillSoft} ${stroke}/><path d="M16 28h12M52 28h12" stroke="${d}" stroke-width="4.4" stroke-linecap="round"/></svg>`,
		srsMask: `<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="15" y="50" width="50" height="7" rx="2" ${fillSoft} ${stroke}/><path d="M23 43q0-29 17-34q17 5 17 34" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="40" cy="26" rx="10" ry="14" fill="#0d171b" stroke="#edf9ff" stroke-width="2"/><path d="M27 18 20 14M53 18l7-4M24 34l-7 3M56 34l7 3" stroke="${d}" stroke-width="3"/></svg>`,
		legPositioner: `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M13 47h54v9H13Z" ${fillSoft} ${stroke}/><path d="M22 47V24q0-9 9-9h10q9 0 9 9v23" fill="${d}" stroke="#edf9ff" stroke-width="2.4"/><path d="M27 28h18v9H27Z" fill="${c}"/><path d="M54 33h10v14H54Z" ${fillSoft} ${stroke}/></svg>`
	};
	return svg[id] || svg.vacLok;
}

export function renderImmobilizationPanel() {
	const spec = immobilizationSpec();
	setTextById(
		'immobilizationPatient',
		S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
			: 'No setup case'
	);
	setTextById(
		'immobilizationPosition',
		S.activeTreatmentCase?.positionLabel || S.activeTreatmentCase?.position || '—'
	);
	setTextById(
		'immobilizationStatusChip',
		!spec ? 'N/A' : S.immobilizationWorkflow.verified ? 'VERIFIED' : 'PENDING'
	);
	const summary = document.getElementById('immobilizationOrderSummary'),
		inst = document.getElementById('immobilizationInstructions'),
		feedback = document.getElementById('immobilizationFeedback');
	if (!spec) {
		if (summary)
			summary.textContent = 'This patient does not currently have a device-selection task.';
		if (inst) inst.innerHTML = '';
		if (feedback) {
			feedback.className = 'immo-status';
			feedback.textContent = 'No immobilization task is active for this patient.';
		}
		if (immobilizationShelf) immobilizationShelf.innerHTML = '';
		if (immobilizationPlacedList) immobilizationPlacedList.innerHTML = '';
		return;
	}
	if (summary) {
		const keyNames =
			spec.keyNames && spec.keyNames.length
				? spec.keyNames
				: (spec.required || []).map((id) => immoMeta(id).name);
		summary.innerHTML =
			(spec.orderSummary || 'Select and place the prescribed immobilization equipment.') +
			(keyNames.length
				? `<span class="immo-key"><b>Immobilization key — required for this patient:</b> ${keyNames.join('  +  ')}</span>`
				: '');
	}
	const structured: [string, string[]][] = [
		['Position / orientation', spec.positionInstructions || []],
		['Indexing / reproducibility', spec.indexingInstructions || []],
		['Pre-treatment preparation', spec.preparationInstructions || []]
	];
	const hasStructured = structured.some(([, items]) => Array.isArray(items) && items.length);
	if (inst)
		inst.innerHTML = hasStructured
			? structured
					.filter(([, items]) => items.length)
					.map(([title, items]) => `<li><b>${title}:</b> ${items.join(' ')}</li>`)
					.join('')
			: (spec.instructions || []).map((x) => `<li>${x}</li>`).join('');
	const optionalNames = (spec.optional || []).map((id) => immoMeta(id).name);
	if (inst && optionalNames.length)
		inst.innerHTML += `<li><b>Plan-dependent / optional equipment:</b> ${optionalNames.join(', ')}. Do not add unless the setup record calls for it.</li>`;
	const verifyBox = document.getElementById('immobilizationVerificationChecks');
	if (verifyBox) {
		const prepRequired =
			Array.isArray(spec.preparationInstructions) && spec.preparationInstructions.length > 0;
		verifyBox.innerHTML = `<h4>Setup verification</h4><div class="immo-verify-checks">
                    <label><input id="immoPositionCheck" type="checkbox" ${S.immobilizationWorkflow.positionChecked ? 'checked' : ''}> <span><b>Position</b> · patient position/orientation reproduced from the setup record.</span></label>
                    <label><input id="immoIndexCheck" type="checkbox" ${S.immobilizationWorkflow.indexingChecked ? 'checked' : ''}> <span><b>Indexing</b> · required board/device indices and alignment references verified.</span></label>
                    ${prepRequired ? `<label><input id="immoPrepCheck" type="checkbox" ${S.immobilizationWorkflow.preparationChecked ? 'checked' : ''}> <span><b>Preparation</b> · prescribed pre-treatment preparation/monitoring requirements confirmed.</span></label>` : ''}
                </div>`;
	}
	const selected = new Set(S.immobilizationWorkflow.selected || []);
	if (immobilizationShelf)
		immobilizationShelf.innerHTML = (
			S.immobilizationWorkflow.shelfOrder || IMMOBILIZATION_DEVICE_IDS
		)
			.map((id) => {
				const meta = immoMeta(id);
				return `<div class="immo-device ${selected.has(id) ? 'used' : ''}" style="--device-color:${meta.color};--device-color-dark:${meta.dark}" draggable="${selected.has(id) ? 'false' : 'true'}" data-immo-id="${id}" aria-label="${meta.name}">${immobilizationDeviceSVG(id)}<div class="immo-device-label">${meta.name}</div></div>`;
			})
			.join('');
	if (immobilizationPlacedList)
		immobilizationPlacedList.innerHTML = (S.immobilizationWorkflow.selected || [])
			.map((id) => {
				const meta = immoMeta(id);
				return `<div class="immo-placed-device" style="--device-color:${meta.color};--device-color-dark:${meta.dark}" draggable="true" data-immo-id="${id}" aria-label="${meta.name} placed on treatment table">${immobilizationDeviceSVG(id)}<div class="immo-device-label">${meta.name}</div></div>`;
			})
			.join('');
	if (feedback) {
		feedback.className =
			'immo-status' +
			(S.immobilizationWorkflow.verified
				? ' good'
				: S.immobilizationWorkflow.attempts
					? ' bad'
					: '');
		feedback.textContent = S.immobilizationWorkflow.verified
			? 'SETUP VERIFIED · equipment, position, indexing, and prescribed preparation are complete.'
			: S.immobilizationWorkflow.lastFeedback ||
				'Complete the setup instructions, drag the prescribed equipment to the table, then verify the setup.';
	}
	wireImmobilizationDragDrop();
	wireImmobilizationVerificationChecks();
}

function wireImmobilizationVerificationChecks() {
	[
		['immoPositionCheck', 'positionChecked'],
		['immoIndexCheck', 'indexingChecked'],
		['immoPrepCheck', 'preparationChecked']
	].forEach(([id, key]) => {
		const el = document.getElementById(id) as HTMLInputElement | null;
		if (!el) return;
		el.addEventListener('change', () => {
			S.immobilizationWorkflow[key] = !!el.checked;
			S.immobilizationWorkflow.verified = false;
			S.immobilizationWorkflow.lastFeedback =
				'Setup verification changed · re-verify before treatment.';
			renderTreatmentDeliveryPanel();
			renderTreatmentMonitor();
		});
	});
}

function wireImmobilizationDragDrop() {
	document
		.querySelectorAll('.immo-device[draggable="true"],.immo-placed-device[draggable="true"]')
		.forEach((el: HTMLElement) => {
			el.addEventListener('dragstart', (ev: DragEvent) => {
				el.classList.add('dragging');
				ev.dataTransfer.setData('text/immo-id', el.dataset.immoId);
				ev.dataTransfer.setData(
					'text/immo-source',
					el.classList.contains('immo-placed-device') ? 'table' : 'shelf'
				);
			});
			el.addEventListener('dragend', () => el.classList.remove('dragging'));
		});
	document
		.querySelectorAll('.immo-placed-device')
		.forEach((el: HTMLElement) =>
			el.addEventListener('dblclick', () => removeImmobilizationDevice(el.dataset.immoId))
		);
}

export function addImmobilizationDevice(id) {
	if (!immobilizationRequired() || !IMMOBILIZATION_DEVICE_IDS.includes(id)) return;
	if (!S.immobilizationWorkflow.selected.includes(id)) S.immobilizationWorkflow.selected.push(id);
	S.immobilizationWorkflow.verified = false;
	S.immobilizationWorkflow.lastFeedback =
		'Equipment changed · verify the complete setup before proceeding.';
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}

export function removeImmobilizationDevice(id) {
	S.immobilizationWorkflow.selected = (S.immobilizationWorkflow.selected || []).filter(
		(x) => x !== id
	);
	S.immobilizationWorkflow.verified = false;
	S.immobilizationWorkflow.lastFeedback =
		'Equipment removed · complete the prescribed setup before verification.';
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}

export function verifyImmobilizationSelection() {
	const spec = immobilizationSpec();
	if (!spec) return;
	S.immobilizationWorkflow.attempts++;
	const req = [...(spec.required || [])],
		optional = [...(spec.optional || [])],
		got = [...(S.immobilizationWorkflow.selected || [])];
	const devicesOK =
		req.every((x) => got.includes(x)) && got.every((x) => req.includes(x) || optional.includes(x));
	const prepRequired =
		Array.isArray(spec.preparationInstructions) && spec.preparationInstructions.length > 0;
	const workflowOK =
		!!S.immobilizationWorkflow.positionChecked &&
		!!S.immobilizationWorkflow.indexingChecked &&
		(!prepRequired || !!S.immobilizationWorkflow.preparationChecked);
	const ok = devicesOK && workflowOK;
	S.immobilizationWorkflow.verified = ok;
	if (ok)
		S.immobilizationWorkflow.lastFeedback =
			'SETUP VERIFIED · equipment, position, indexing, and prescribed preparation are complete.';
	else if (!devicesOK)
		S.immobilizationWorkflow.lastFeedback =
			'SETUP HOLD · one or more selected devices do not match the required or plan-dependent setup equipment.';
	else
		S.immobilizationWorkflow.lastFeedback =
			'SETUP HOLD · complete the position, indexing, and prescribed preparation verification checks.';
	if (ok) {
		setPendantLCD('PATIENT SETUP', 'IMMOBILIZATION VERIFIED');
		oisLogEvent(
			'SETUP',
			'Patient setup verified',
			`${got.map((id) => immoMeta(id).name).join(' + ')} · position/indexing${prepRequired ? ' / preparation' : ''} confirmed`,
			'immobilization-verified'
		);
	} else setPendantLCD('PATIENT SETUP', 'HOLD · CHECK SETUP');
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	renderOISPanel();
}

export function clearImmobilizationSelection() {
	S.immobilizationWorkflow.selected = [];
	S.immobilizationWorkflow.verified = false;
	S.immobilizationWorkflow.positionChecked = false;
	S.immobilizationWorkflow.indexingChecked = false;
	S.immobilizationWorkflow.preparationChecked = false;
	S.immobilizationWorkflow.lastFeedback =
		'All equipment returned to the shelf and setup verification reset.';
	updateImmobilizationPatientVisuals();
	renderImmobilizationPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}

export function createImmobilizationShelf3D() {
	if (!S.scene || S.immobilizationShelf3D) return;
	const g = new THREE.Group();
	g.name = 'vaultImmobilizationShelf';
	const metal = new THREE.MeshStandardMaterial({
		color: 0xaeb7bc,
		metalness: 0.46,
		roughness: 0.48
	});
	const shelfMat = new THREE.MeshStandardMaterial({
		color: 0x4a5358,
		metalness: 0.24,
		roughness: 0.7
	});
	const backPanelMat = new THREE.MeshStandardMaterial({ color: 0xd7d9dc, roughness: 0.92 });
	const addBox = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
		m.position.set(x, y, z);
		m.rotation.set(rx, ry, rz);
		m.castShadow = m.receiveShadow = true;
		g.add(m);
		return m;
	};
	addBox(1.72, 2.28, 0.04, backPanelMat, 0, 1.12, -0.27);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 0.12, 0);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 0.78, 0);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 1.44, 0);
	addBox(1.74, 0.06, 0.54, shelfMat, 0, 2.1, 0);
	addBox(0.07, 2.18, 0.56, metal, -0.83, 1.1, 0);
	addBox(0.07, 2.18, 0.56, metal, 0.83, 1.1, 0);
	const deviceMat = (id) =>
		new THREE.MeshStandardMaterial({
			color: parseInt(immoMeta(id).color.slice(1), 16),
			roughness: 0.6,
			metalness: 0.08
		});
	addBox(0.42, 0.12, 0.28, deviceMat('headrest'), -0.55, 0.25, 0);
	const hm = deviceMat('headMask');
	const headMask = new THREE.Mesh(
		new THREE.SphereGeometry(0.16, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
		hm
	);
	headMask.scale.set(1, 0.65, 1.05);
	headMask.rotation.x = Math.PI;
	headMask.position.set(-0.1, 0.31, 0.02);
	headMask.castShadow = headMask.receiveShadow = true;
	g.add(headMask);
	addBox(0.18, 0.02, 0.12, hm, -0.1, 0.16, 0.02);
	addBox(0.18, 0.28, 0.2, deviceMat('footStocks'), 0.43, 0.28, -0.08);
	addBox(0.18, 0.28, 0.2, deviceMat('footStocks'), 0.61, 0.28, 0.08);
	const vac = deviceMat('vacLok');
	const bag = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), vac);
	bag.scale.set(1.7, 0.55, 1.05);
	bag.position.set(-0.45, 0.92, 0.02);
	bag.castShadow = bag.receiveShadow = true;
	g.add(bag);
	addBox(0.46, 0.12, 0.34, deviceMat('kneeSupport'), 0.05, 0.9, 0.03, -0.4, 0, 0);
	addBox(0.18, 0.35, 0.18, deviceMat('shoulderPull'), 0.58, 0.96, -0.12);
	addBox(0.18, 0.35, 0.18, deviceMat('shoulderPull'), 0.58, 0.96, 0.12);
	addBox(0.56, 0.1, 0.38, deviceMat('breastBoard'), -0.46, 1.58, 0.02, -0.4, 0, 0);
	addBox(0.38, 0.14, 0.3, deviceMat('armSupport'), 0.02, 1.58, 0.02);
	addBox(0.42, 0.1, 0.42, deviceMat('bellyBoard'), 0.52, 1.58, 0.02);
	const hole = new THREE.Mesh(
		new THREE.TorusGeometry(0.1, 0.022, 10, 24),
		new THREE.MeshStandardMaterial({ color: 0x0f171b, roughness: 0.3 })
	);
	hole.rotation.x = Math.PI / 2;
	hole.position.set(0.52, 1.6, 0.02);
	hole.castShadow = hole.receiveShadow = true;
	g.add(hole);
	const hnm = deviceMat('hnMask');
	const hn = new THREE.Mesh(
		new THREE.SphereGeometry(0.15, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
		hnm
	);
	hn.scale.set(1, 0.62, 1.0);
	hn.rotation.x = Math.PI;
	hn.position.set(-0.5, 2.18, 0.02);
	hn.castShadow = hn.receiveShadow = true;
	g.add(hn);
	addBox(0.28, 0.02, 0.2, hnm, -0.5, 2.03, 0.02);
	addBox(0.52, 0.12, 0.34, deviceMat('wingBoard'), 0.02, 2.18, 0.02);
	addBox(0.26, 0.18, 0.26, deviceMat('breastBoard'), 0.56, 2.18, 0.02, -0.28, 0, 0);
	const srsMat = deviceMat('srsMask');
	const srsRing = new THREE.Mesh(
		new THREE.TorusGeometry(0.13, 0.025, 10, 24, Math.PI * 1.6),
		srsMat
	);
	srsRing.rotation.z = 0.75;
	srsRing.position.set(-0.2, 2.2, 0.17);
	g.add(srsRing);
	addBox(0.28, 0.025, 0.16, srsMat, -0.2, 2.05, 0.17);
	addBox(0.34, 0.16, 0.22, deviceMat('legPositioner'), 0.62, 0.96, 0.2, 0, 0, 0.18);
	g.position.set(-11.1, GROUND_Y + 0.01, -6.8);
	g.rotation.y = Math.PI / 2;
	S.scene.add(g);
	S.immobilizationShelf3D = g;
}

export function createImmobilizationPatientGroup() {
	if (!S.patientBodyGroup || S.immobilizationPatientGroup) return;
	S.immobilizationPatientGroup = new THREE.Group();
	S.immobilizationPatientGroup.name = 'selectedImmobilization';
	S.patientBodyGroup.add(S.immobilizationPatientGroup);
}

function updateImmobilizationPatientVisuals() {
	if (!S.immobilizationPatientGroup) {
		createImmobilizationPatientGroup();
		if (!S.immobilizationPatientGroup) return;
	}
	while (S.immobilizationPatientGroup.children.length)
		S.immobilizationPatientGroup.remove(S.immobilizationPatientGroup.children[0]);
	const ids = S.immobilizationWorkflow.selected || [];
	const addBox = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
		m.position.set(x, y, z);
		m.rotation.set(rx, ry, rz);
		S.immobilizationPatientGroup.add(m);
		return m;
	};
	ids.forEach((id) => {
		const meta = immoMeta(id),
			mat = new THREE.MeshStandardMaterial({
				color: parseInt(meta.color.slice(1), 16),
				roughness: 0.55,
				transparent: true,
				opacity: 0.78
			});
		if (id === 'headMask' || id === 'hnMask') {
			const r = id === 'hnMask' ? 0.18 : 0.145,
				m = new THREE.Mesh(
					new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.7),
					mat
				);
			m.scale.set(1, 0.55, 1.05);
			m.rotation.x = Math.PI;
			m.position.set(0, 0.125, -0.88);
			S.immobilizationPatientGroup.add(m);
			if (id === 'hnMask') addBox(0.52, 0.018, 0.34, mat, 0, 0.095, -0.7);
		} else if (id === 'headrest') addBox(0.25, 0.05, 0.18, mat, 0, 0.035, -0.9, -0.18, 0, 0);
		else if (id === 'shoulderPull') {
			addBox(0.035, 0.025, 0.52, mat, -0.25, 0.09, -0.61, 0, 0, 0.05);
			addBox(0.035, 0.025, 0.52, mat, 0.25, 0.09, -0.61, 0, 0, -0.05);
		} else if (id === 'wingBoard') {
			addBox(0.7, 0.025, 0.52, mat, 0, -0.015, -0.55);
			addBox(0.22, 0.025, 0.42, mat, -0.42, 0.015, -0.62, 0, 0, -0.28);
			addBox(0.22, 0.025, 0.42, mat, 0.42, 0.015, -0.62, 0, 0, 0.28);
		} else if (id === 'vacLok') addBox(0.62, 0.04, 0.78, mat, 0, -0.018, -0.15);
		else if (id === 'bodyFix') {
			addBox(0.7, 0.09, 1.55, mat, 0, -0.03, 0);
			addBox(0.16, 0.14, 1.55, mat, -0.34, 0.04, 0);
			addBox(0.16, 0.14, 1.55, mat, 0.34, 0.04, 0);
		} else if (id === 'breastBoard') addBox(0.62, 0.035, 0.82, mat, 0, -0.005, -0.34, -0.1, 0, 0);
		else if (id === 'armSupport') {
			addBox(0.07, 0.12, 0.48, mat, -0.3, 0.09, -0.68, 0, 0, -0.08);
			addBox(0.07, 0.12, 0.48, mat, 0.3, 0.09, -0.68, 0, 0, 0.08);
		} else if (id === 'bellyBoard') {
			addBox(0.66, 0.035, 0.82, mat, 0, -0.018, 0.08);
			const hole = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 10, 24), mat);
			hole.rotation.x = Math.PI / 2;
			hole.position.set(0, 0.012, 0.08);
			S.immobilizationPatientGroup.add(hole);
		} else if (id === 'kneeSupport') {
			const geo = new THREE.ConeGeometry(0.18, 0.28, 3),
				m = new THREE.Mesh(geo, mat);
			m.rotation.z = Math.PI / 2;
			m.position.set(0, 0.03, 0.52);
			S.immobilizationPatientGroup.add(m);
		} else if (id === 'footStocks') {
			addBox(0.16, 0.12, 0.16, mat, -0.12, 0.05, 0.87);
			addBox(0.16, 0.12, 0.16, mat, 0.12, 0.05, 0.87);
		} else if (id === 'srsMask') {
			const m = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 10, 24, Math.PI * 1.7), mat);
			m.rotation.x = Math.PI / 2;
			m.position.set(0, 0.13, -0.88);
			S.immobilizationPatientGroup.add(m);
			addBox(0.34, 0.02, 0.22, mat, 0, 0.02, -0.88);
		} else if (id === 'legPositioner') {
			addBox(0.18, 0.14, 0.22, mat, -0.12, 0.05, 0.84, 0, 0, 0.12);
		}
	});
}

// ---- Apply clinical immobilization rules + improved instructions + per-patient key ----
export function applyImmobilizationRules(cases) {
	const named = (ids) =>
		(ids || []).map(
			(id) => (IMMOBILIZATION_DEVICE_META[id] && IMMOBILIZATION_DEVICE_META[id].name) || id
		);
	cases.forEach((c) => {
		const im = c.immobilization;
		if (!im) return;
		const tech = (c.technique || '').toLowerCase(),
			site = (c.siteLabel || '').toLowerCase(),
			key = c.siteKey || '',
			pos = (c.position || '').toUpperCase();
		const prone = pos === 'HFP' || pos === 'FFP';
		const isSBRT = /sbrt/.test(tech) || /sbrt/.test(site);
		const isSRS =
			/srs|radiosurg/.test(tech) ||
			/srs|radiosurg/.test(site) ||
			String(c.billing && c.billing.treatmentCode) === '77372';
		const isHN = key === 'hneck';
		const isBrain = key === 'brain';
		const metBrain = isBrain && /whole brain|metasta|brain met/.test(site);
		const primaryBrain = isBrain && !metBrain;
		let req = null,
			summary = null,
			steps = null;
		if (isSBRT) {
			if (key === 'abdomen' || key === 'pelvis') {
				req = ['bodyFix', 'vacLok'];
				summary = 'Full-body immobilization (BODY FIX) for abdominal/pelvic SBRT.';
				steps = [
					'Immobilize the patient in the BODY FIX (evacuated full-body cushion) and draw the vacuum to lock the contour.',
					'Add the Vac-Lok / abdominal support prescribed for the target region.',
					'Confirm indexing and midline alignment before volumetric imaging.'
				];
			} else {
				req = ['bodyFix', 'wingBoard'];
				summary = 'Full-body immobilization (BODY FIX) for stereotactic body radiotherapy.';
				steps = [
					'Immobilize the patient in the BODY FIX (evacuated full-body cushion) and draw the vacuum to lock the whole-body contour.',
					'Elevate both arms in the reproducible overhead support (wing board).',
					'Confirm the respiratory-monitoring region is unobstructed and the body is centered and indexed.'
				];
			}
		} else if (isSRS) {
			req = ['hnMask', 'headrest'];
			summary = 'Rigid HEAD & SHOULDERS mask for stereotactic cranial reproducibility.';
			steps = [
				'Fit the HEAD & SHOULDERS thermoplastic mask for stereotactic-grade rigidity.',
				'Use an indexed occipital headrest and confirm a neutral, reproducible head position.',
				'Verify the mask is fully locked to the tabletop index before 6DOF imaging and couch rotation.'
			];
		} else if (isHN) {
			req = ['hnMask', 'headrest', 'shoulderPull'];
			summary = 'Rigid HEAD & SHOULDERS mask with indexed shoulder pull-downs.';
			steps = [
				'Fit the HEAD & SHOULDERS thermoplastic mask extending from the cranium through the shoulders.',
				'Use an indexed occipital headrest to reproduce neck extension.',
				'Add shoulder pull-downs to hold inferior shoulder position; verify bilateral symmetry.'
			];
		} else if (primaryBrain) {
			req = ['hnMask', 'headrest'];
			summary = 'Rigid HEAD & SHOULDERS mask for primary brain treatment.';
			steps = [
				'Fit the HEAD & SHOULDERS thermoplastic mask conforming over the cranium and shoulders.',
				'Support the occiput with an indexed headrest for a reproducible neutral position.',
				'Confirm HFS orientation and that the mask is locked to the tabletop index.'
			];
		} else if (metBrain) {
			req = ['headMask', 'headrest'];
			summary = 'SHORT head mask for a metastatic / palliative cranial setup.';
			steps = [
				'Fit the SHORT head mask (head-only thermoplastic) and lock it to the tabletop index.',
				'Support the occiput with an indexed headrest to reproduce a neutral head position.',
				'Confirm the head is straight and centered before imaging.'
			];
		} else if ((key === 'pelvis' || key === 'abdomen') && !prone) {
			const region = key === 'abdomen' ? 'torso/abdomen' : 'pelvis and lower body';
			req = ['vacLok', 'kneeSupport'];
			summary =
				'Supine ' +
				(key === 'abdomen' ? 'abdominal' : 'pelvic') +
				' setup immobilized in a VAC-LOK cushion (not a knee sponge alone).';
			steps = [
				'Immobilize the ' + region + ' in a VAC-LOK evacuated cushion molded to the patient.',
				'Add a knee support/sponge for comfort and reproducible leg rotation.',
				'Confirm ' + (c.positionLabel || 'HFS') + ' orientation and tabletop index before imaging.'
			];
		}
		if (req) {
			im.required = req;
			im.orderSummary = summary;
			im.instructions = steps;
			delete im.positionInstructions;
			delete im.indexingInstructions;
			delete im.preparationInstructions;
		}
		im.keyNames = named(im.required);
	});
}
