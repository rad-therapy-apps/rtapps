// Special setups: breast match, CSI, electron fields (split out of linac-delivery.ts, #77).
import { S } from '../state';
import { specialSetupContent, specialSetupLaunchButton, specialSetupPanel } from '../dom';
import { renderTreatmentMonitor, updateElectronApplicator3D } from '../scene';
import { setTextById } from '../main';
import { updateBEVInset } from '../linac-safety';
import { deliveryCasePlan } from './plan';
import { updateElectronBolusMesh } from './electron-bolus';
import { renderTreatmentDeliveryPanel } from './treatment-delivery';

export function activeSpecialSetupSpec() {
	return S.activeTreatmentCase?.specialSetup || null;
}

export function specialSetupRequired() {
	return !!activeSpecialSetupSpec();
}

export function specialSetupVerified() {
	return !specialSetupRequired() || !!S.specialSetupWorkflow.verified;
}

function specialRndNonzero() {
	const a = [-3, -2, -1, 1, 2, 3];
	return a[Math.floor(Math.random() * a.length)];
}

export function resetSpecialSetupForCase() {
	const s = activeSpecialSetupSpec();
	S.specialSetupWorkflow = {
		type: String(s?.type || 'NONE'),
		verified: false,
		breastOffset: s ? specialRndNonzero() : 0,
		csiJunctionA: specialRndNonzero(),
		csiJunctionB: specialRndNonzero(),
		electron: {
			shape: '',
			width: 0,
			height: 0,
			cone: '',
			template: false,
			fabricated: false,
			mounted: false,
			bolusShape: String(s?.shape || 'Oval'),
			bolusWidth: Number(s?.widthCm) || 6,
			bolusHeight: Number(s?.heightCm) || 4,
			bolusThickness: Number(s?.bolusThicknessCm) || 0.5,
			bolusPlaced: false,
			airGapMm: 4,
			bolusDragX: 54,
			bolusDragY: 92,
			bolusContactY: 38,
			bolusPositionOK: false,
			bolusAirGapOK: false,
			bolusLogged: false
		}
	};
	specialSetupLaunchButton?.classList.toggle('case-active', !!s);
	renderSpecialSetupPanel();
	updateElectronApplicator3D();
	updateSpecialAnatomyTargetMarker();
	updateElectronBolusMesh();
}

function specialMatchStatus(v, tol = 1) {
	return Math.abs(Number(v) || 0) <= tol;
}

function breastMatchDiagram() {
	const v = S.specialSetupWorkflow.breastOffset,
		scale = 8,
		y = 82,
		scvEdge = y - (v * scale) / 2,
		tanEdge = y + (v * scale) / 2,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
		gap = Math.abs(tanEdge - scvEdge),
		overlap = v < 0;
	return `<div class="special-diagram"><svg viewBox="0 0 500 165" aria-label="Supraclavicular tangent matchline diagram"><rect width="500" height="165" fill="#070b10"/><text x="18" y="22" fill="#d7e8f3" font-size="12" font-family="Consolas">SCV / TANGENT JUNCTION</text><rect x="55" y="34" width="390" height="${Math.max(8, scvEdge - 34)}" fill="#365f88" opacity=".68"/><rect x="55" y="${tanEdge}" width="390" height="${Math.max(8, 145 - tanEdge)}" fill="#8b4f68" opacity=".68"/><line x1="45" y1="82" x2="455" y2="82" stroke="#42d9ef" stroke-dasharray="4 4"/><text x="460" y="86" fill="#42d9ef" font-size="10">PLAN</text><line x1="55" y1="${scvEdge}" x2="445" y2="${scvEdge}" stroke="#a6d2ff" stroke-width="2"/><line x1="55" y1="${tanEdge}" x2="445" y2="${tanEdge}" stroke="#ff9fcb" stroke-width="2"/><text x="70" y="54" fill="#d9edff" font-size="11">SUPRACLAV AP</text><text x="70" y="137" fill="#ffd7e8" font-size="11">BREAST TANGENTS</text><text x="250" y="158" text-anchor="middle" fill="${specialMatchStatus(v) ? '#80e2a4' : '#ff8b97'}" font-size="12" font-weight="700">${v === 0 ? '0 mm · MATCHED' : `${Math.abs(v)} mm ${overlap ? 'OVERLAP' : 'GAP'}`}</text></svg></div>`;
}

function csiDiagram() {
	const a = S.specialSetupWorkflow.csiJunctionA,
		b = S.specialSetupWorkflow.csiJunctionB;
	return `<div class="special-diagram"><svg viewBox="0 0 500 165" aria-label="Craniospinal field junction diagram"><rect width="500" height="165" fill="#070b10"/><text x="18" y="21" fill="#d7e8f3" font-size="12" font-family="Consolas">CRANIOSPINAL FIELD STATIONS</text><rect x="65" y="34" width="120" height="36" rx="8" fill="#375f87"/><rect x="190" y="34" width="120" height="70" rx="8" fill="#506f5c"/><rect x="315" y="34" width="120" height="108" rx="8" fill="#77546e"/><text x="125" y="56" text-anchor="middle" fill="#fff" font-size="10">CRANIAL</text><text x="250" y="56" text-anchor="middle" fill="#fff" font-size="10">UPPER SPINE</text><text x="375" y="56" text-anchor="middle" fill="#fff" font-size="10">LOWER SPINE</text><line x1="187" y1="30" x2="187" y2="148" stroke="${specialMatchStatus(a) ? '#52df91' : '#ff6674'}" stroke-width="3"/><line x1="312" y1="30" x2="312" y2="148" stroke="${specialMatchStatus(b) ? '#52df91' : '#ff6674'}" stroke-width="3"/><text x="187" y="158" text-anchor="middle" fill="#d8e5ec" font-size="10">J1 ${a === 0 ? '0' : (a > 0 ? '+' : '') + a} mm</text><text x="312" y="158" text-anchor="middle" fill="#d8e5ec" font-size="10">J2 ${b === 0 ? '0' : (b > 0 ? '+' : '') + b} mm</text></svg></div>`;
}

function electronDiagram() {
	const e = S.specialSetupWorkflow.electron,
		s = activeSpecialSetupSpec();
	const w = (Number(e.width) || Number(s?.widthCm) || 6) * 11,
		h = (Number(e.height) || Number(s?.heightCm) || 4) * 11;
	const shape = String(e.shape || s?.shape || 'Oval');
	const aperture =
		shape === 'Rectangle'
			? `<rect x="${250 - w / 2}" y="${82 - h / 2}" width="${w}" height="${h}" fill="#122a31" stroke="#5bd9e9" stroke-width="3"/>`
			: `<ellipse cx="250" cy="82" rx="${w / 2}" ry="${h / 2}" fill="#122a31" stroke="#5bd9e9" stroke-width="3"/>`;
	return `<div class="special-diagram"><svg viewBox="0 0 500 165" aria-label="Electron cutout template"><rect width="500" height="165" fill="#070b10"/><rect x="155" y="25" width="190" height="115" rx="7" fill="#55545a" stroke="#8b8d93" stroke-width="2"/><text x="250" y="18" text-anchor="middle" fill="#e8edf1" font-size="11">ELECTRON INSERT · BEAM'S EYE VIEW</text>${aperture}<line x1="250" y1="37" x2="250" y2="127" stroke="#7b8791" stroke-dasharray="3 3"/><line x1="190" y1="82" x2="310" y2="82" stroke="#7b8791" stroke-dasharray="3 3"/><text x="250" y="155" text-anchor="middle" fill="${e.mounted ? '#70e3a0' : '#c7a8bb'}" font-size="11">${shape} · ${Number(e.width) || s?.widthCm || 6} × ${Number(e.height) || s?.heightCm || 4} cm · ${e.mounted ? 'MOUNTED / VERIFIED' : 'WORKFLOW IN PROGRESS'}</text></svg></div>`;
}

export function renderSpecialSetupPanel() {
	if (!specialSetupPanel) return;
	const s = activeSpecialSetupSpec();
	setTextById(
		'specialSetupPatient',
		S.activeTreatmentCase
			? `${S.activeTreatmentCase.patient} · ${S.activeTreatmentCase.siteLabel}`
			: 'No special case'
	);
	setTextById('specialSetupTechnique', s?.label || 'Not prescribed');
	setTextById(
		'specialSetupVerified',
		!s ? 'N/A' : S.specialSetupWorkflow.verified ? 'VERIFIED' : 'NOT VERIFIED'
	);
	const title = document.getElementById('specialSetupTitle'),
		sub = document.getElementById('specialSetupSubtitle'),
		status = document.getElementById('specialSetupStatus');
	if (!s) {
		if (title) title.textContent = 'Matchline / CSI / Electron Setup';
		if (sub) sub.textContent = 'Complete the technique-specific setup before beam enable.';
		if (specialSetupContent)
			specialSetupContent.innerHTML =
				'<div class="special-card"><h4>No special setup prescribed</h4><p>Select the 3-field breast, craniospinal, or electron-cutout patient.</p></div>';
		if (status) {
			status.className = '';
			status.textContent = 'No special setup is required for this patient.';
		}
		return;
	}
	const type = String(s.type || '').toUpperCase();
	if (type === 'BREAST_MATCH') {
		if (title) title.textContent = 'Three-Field Breast Matchline';
		if (sub)
			sub.textContent =
				'Supraclavicular field + tangents · recognize and correct gap/overlap at the junction.';
		const ok = specialMatchStatus(S.specialSetupWorkflow.breastOffset, Number(s.toleranceMm) || 1);
		specialSetupContent.innerHTML = `${breastMatchDiagram()}<div class="special-card"><h4>Junction adjustment</h4><div class="special-junction-readout ${ok ? 'good' : 'bad'}">${S.specialSetupWorkflow.breastOffset === 0 ? '0 mm · MATCHED' : `${S.specialSetupWorkflow.breastOffset > 0 ? '+' : ''}${S.specialSetupWorkflow.breastOffset} mm · ${S.specialSetupWorkflow.breastOffset > 0 ? 'GAP' : 'OVERLAP'}`}</div><p>Use the simulated field-edge adjustment to bring the SCV inferior edge and tangent superior edge to the planned matchline. Acceptable teaching tolerance: ±${s.toleranceMm || 1} mm.</p><div class="special-actions"><button data-special="breast-minus">−1 mm edge</button><button data-special="breast-plus">+1 mm edge</button><button data-special="breast-verify">Verify Matchline</button></div></div><div class="special-card"><h4>Planned fields</h4><p><b>SCV AP:</b> G0° · T0° · couch V/L/L 0/0/0. <b>Medial tangent:</b> G300° · T355° · LNG +2 mm. <b>Lateral tangent:</b> G120° · T5° · LNG +2 mm. The two-isocenter teaching model places the SCV reference near the SC-joint/low-neck region and shifts the tangents inferiorly to the breast/chest-wall isocenter. The tangent couch kicks model divergence matching; exact clinical values are plan-derived.</p><div class="special-checks"><label><input id="specialCheckIndex" type="checkbox" ${S.specialSetupWorkflow.indexChecked ? 'checked' : ''}> Patient/board indexing and arm position verified.</label><label><input id="specialCheckMatchDoc" type="checkbox" ${S.specialSetupWorkflow.matchDoc ? 'checked' : ''}> Junction location, half-beam field-edge concept, and tangent couch kicks reviewed.</label></div></div>`;
		if (status) {
			status.className = S.specialSetupWorkflow.verified ? 'good' : ok ? '' : 'bad';
			status.textContent = S.specialSetupWorkflow.verified
				? 'MATCHLINE VERIFIED · SCV and tangents may proceed without changing the verified patient setup.'
				: ok
					? 'Junction is within tolerance. Complete the indexing/documentation checks and verify the matchline.'
					: 'Adjust the junction before treatment: positive = gap, negative = overlap.';
		}
	} else if (type === 'CSI') {
		if (title) title.textContent = 'Total Craniospinal Setup';
		if (sub)
			sub.textContent =
				'Cranial + upper spine + lower spine · multi-isocenter indexing and two junctions.';
		const aok = specialMatchStatus(S.specialSetupWorkflow.csiJunctionA, s.toleranceMm || 1),
			bok = specialMatchStatus(S.specialSetupWorkflow.csiJunctionB, s.toleranceMm || 1);
		specialSetupContent.innerHTML = `${csiDiagram()}<div class="special-card"><h4>Field-junction management</h4><div class="special-grid"><div class="special-control"><label>Junction 1 <b>${S.specialSetupWorkflow.csiJunctionA > 0 ? '+' : ''}${S.specialSetupWorkflow.csiJunctionA} mm</b></label><div class="special-actions"><button data-special="csi-a-minus">−1</button><button data-special="csi-a-plus">+1</button><button data-special="csi-a-zero">0</button></div></div><div class="special-control"><label>Junction 2 <b>${S.specialSetupWorkflow.csiJunctionB > 0 ? '+' : ''}${S.specialSetupWorkflow.csiJunctionB} mm</b></label><div class="special-actions"><button data-special="csi-b-minus">−1</button><button data-special="csi-b-plus">+1</button><button data-special="csi-b-zero">0</button></div></div></div><p>J1 = cranial/upper-spine junction. J2 = upper/lower-spine junction. Green indicates ±${s.toleranceMm || 1} mm teaching tolerance.</p><p><b>Teaching field geometry:</b> Right cranial lateral G270° / C5° / T355°; Left cranial lateral G90° / C355° / T5°. Upper spine PA uses LNG +6 mm; lower spine PA uses LNG +12 mm. The ±5° cranial rotations represent plan-derived divergence matching; the source notes the couch kick is approximately 5° but the exact collimator/couch values depend on field length and planning geometry.</p></div><div class="special-card"><h4>Indexed setup verification</h4><div class="special-checks"><label><input id="specialCheckCranial" type="checkbox" ${S.specialSetupWorkflow.cranialIndex ? 'checked' : ''}> Cranial immobilization/head position and index verified.</label><label><input id="specialCheckSpine" type="checkbox" ${S.specialSetupWorkflow.spineIndex ? 'checked' : ''}> Upper/lower spinal station indexing verified.</label><label><input id="specialCheckCSIPlan" type="checkbox" ${S.specialSetupWorkflow.csiPlan ? 'checked' : ''}> Cranial laterals and PA spine geometry reviewed, including the cranial couch/collimator divergence match.</label></div><div class="special-actions" style="margin-top:7px"><button data-special="csi-verify" style="grid-column:1/-1">Verify CSI Setup & Junctions</button></div></div>`;
		if (status) {
			status.className = S.specialSetupWorkflow.verified ? 'good' : !aok || !bok ? 'bad' : '';
			status.textContent = S.specialSetupWorkflow.verified
				? 'CSI SETUP VERIFIED · both junctions and indexed treatment stations are approved.'
				: !aok || !bok
					? 'One or both field junctions remain outside tolerance. Correct them before treatment.'
					: 'Both junctions are within tolerance. Complete the indexing/beam-orientation checks and verify.';
		}
	} else if (type === 'ELECTRON') {
		if (title) title.textContent = 'Electron Cutout Creation & Fabrication';
		if (sub)
			sub.textContent =
				'Design → template → safe simulated fabrication → mount / label. Bolus placement occurs later in Treatment Delivery.';
		const e = S.specialSetupWorkflow.electron;
		specialSetupContent.innerHTML = `${electronDiagram()}<div class="special-card"><h4>Prescription / accessory order</h4><p><b>${S.activeTreatmentCase.energy}</b> · ${s.cone} electron cone · ${s.shape} cutout ${s.widthCm} × ${s.heightCm} cm · nominal SSD ${s.ssdCm} cm.</p><p><b>Patient position:</b> breast-treatment posture with arms elevated; the left chest-wall scar is centered to the electron central ray. Use an en-face 0° beam so the cone/cutout face is parallel to the treated surface.</p><div class="special-grid"><div class="special-control"><label>Cutout shape</label><select id="electronShape"><option>Oval</option><option>Rectangle</option><option>Circle</option></select></div><div class="special-control"><label>Electron cone</label><select id="electronCone"><option>6 × 6 cm</option><option>10 × 10 cm</option><option>15 × 15 cm</option></select></div><div class="special-control"><label>Opening width</label><select id="electronWidth">${[4, 5, 6, 7, 8].map((v) => `<option value="${v}">${v} cm</option>`).join('')}</select></div><div class="special-control"><label>Opening height</label><select id="electronHeight">${[3, 4, 5, 6, 7].map((v) => `<option value="${v}">${v} cm</option>`).join('')}</select></div></div><div class="special-actions" style="margin-top:7px"><button data-special="electron-template">Create Template</button><button data-special="electron-fabricate">Fabricate Cutout</button><button data-special="electron-mount">Mount & Verify</button></div></div><div class="special-card"><h4>Fabrication / accessory safety verification</h4><div class="special-checks"><label><input id="electronCheckPPE" type="checkbox" ${S.specialSetupWorkflow.ePPE ? 'checked' : ''}> Required PPE, ventilation, and local low-melting-alloy handling procedure confirmed.</label><label><input id="electronCheckCool" type="checkbox" ${S.specialSetupWorkflow.eCool ? 'checked' : ''}> Insert completely cooled/solidified before handling and mounting.</label><label><input id="electronCheckLabel" type="checkbox" ${S.specialSetupWorkflow.eLabel ? 'checked' : ''}> Patient, site, energy/cone, orientation, and cutout identity labeled.</label><label><input id="electronCheckLight" type="checkbox" ${S.specialSetupWorkflow.eLight ? 'checked' : ''}> Light-field/skin-mark fit and cutout orientation verified before beam delivery.</label></div><p><b>ODI/SSD:</b> ${S.odiOn && S.lastODIcm != null ? `SSD ${S.lastODIcm.toFixed(1)} cm · active` : 'Turn ODI ON and obtain a valid surface reading before mounting the insert.'}</p><p>${e.mounted ? 'The 3D treatment head now shows the mounted electron applicator/cone and insert tray. Bolus has not yet been applied; that is a separate in-room task in Delivery.' : 'After successful mount & verify, the room view will display the mounted electron applicator/cone beneath the treatment head.'}</p><div class="special-step ${e.template ? 'done' : ''}">1 · Template ${e.template ? 'created' : 'pending'}</div><div class="special-step ${e.fabricated ? 'done' : ''}">2 · Cutout ${e.fabricated ? 'fabricated/cooled' : 'pending fabrication'}</div><div class="special-step ${e.mounted ? 'done' : ''}">3 · Insert ${e.mounted ? 'mounted and verified' : 'pending mount/verification'}</div><div class="special-step">4 · Bolus placement · performed at treatment delivery</div></div>`;
		const sh = document.getElementById('electronShape') as HTMLSelectElement | null,
			co = document.getElementById('electronCone') as HTMLSelectElement | null,
			wi = document.getElementById('electronWidth') as HTMLSelectElement | null,
			he = document.getElementById('electronHeight') as HTMLSelectElement | null;
		if (sh) sh.value = e.shape || s.shape;
		if (co) co.value = e.cone || s.cone;
		if (wi) wi.value = String(e.width || s.widthCm);
		if (he) he.value = String(e.height || s.heightCm);
		if (status) {
			status.className = S.specialSetupWorkflow.verified
				? 'good'
				: e.fabricated && !e.mounted
					? 'bad'
					: '';
			status.textContent = S.specialSetupWorkflow.verified
				? 'ELECTRON CUTOUT VERIFIED · fabrication, accessory identity, fit, orientation, and mounting complete. Proceed to Delivery for bolus placement.'
				: e.fabricated
					? 'Fabrication complete. Complete the safety/label/fit checks and mount the insert.'
					: 'Create the prescribed template, then complete the simulated fabrication and verification workflow.';
		}
	}
}

export function syncSpecialCheckboxes() {
	const by = (id) => !!(document.getElementById(id) as HTMLInputElement | null)?.checked;
	S.specialSetupWorkflow.indexChecked = by('specialCheckIndex');
	S.specialSetupWorkflow.matchDoc = by('specialCheckMatchDoc');
	S.specialSetupWorkflow.cranialIndex = by('specialCheckCranial');
	S.specialSetupWorkflow.spineIndex = by('specialCheckSpine');
	S.specialSetupWorkflow.csiPlan = by('specialCheckCSIPlan');
	S.specialSetupWorkflow.ePPE = by('electronCheckPPE');
	S.specialSetupWorkflow.eCool = by('electronCheckCool');
	S.specialSetupWorkflow.eLabel = by('electronCheckLabel');
	S.specialSetupWorkflow.eLight = by('electronCheckLight');
	const e = S.specialSetupWorkflow.electron;
	if (e) {
		const sh = document.getElementById('electronShape') as HTMLSelectElement | null,
			co = document.getElementById('electronCone') as HTMLSelectElement | null,
			wi = document.getElementById('electronWidth') as HTMLSelectElement | null,
			he = document.getElementById('electronHeight') as HTMLSelectElement | null;
		if (sh) e.shape = sh.value;
		if (co) e.cone = co.value;
		if (wi) e.width = Number(wi.value) || 0;
		if (he) e.height = Number(he.value) || 0;
	}
}

export function handleSpecialSetupAction(action) {
	const s = activeSpecialSetupSpec();
	if (!s) return;
	syncSpecialCheckboxes();
	const type = String(s.type || '').toUpperCase();
	if (type === 'BREAST_MATCH') {
		if (action === 'breast-minus') {
			S.specialSetupWorkflow.breastOffset = Math.max(-5, S.specialSetupWorkflow.breastOffset - 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'breast-plus') {
			S.specialSetupWorkflow.breastOffset = Math.min(5, S.specialSetupWorkflow.breastOffset + 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'breast-verify')
			S.specialSetupWorkflow.verified =
				specialMatchStatus(S.specialSetupWorkflow.breastOffset, s.toleranceMm || 1) &&
				S.specialSetupWorkflow.indexChecked &&
				S.specialSetupWorkflow.matchDoc;
	} else if (type === 'CSI') {
		if (action === 'csi-a-minus') {
			S.specialSetupWorkflow.csiJunctionA = Math.max(-5, S.specialSetupWorkflow.csiJunctionA - 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-a-plus') {
			S.specialSetupWorkflow.csiJunctionA = Math.min(5, S.specialSetupWorkflow.csiJunctionA + 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-a-zero') {
			S.specialSetupWorkflow.csiJunctionA = 0;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-b-minus') {
			S.specialSetupWorkflow.csiJunctionB = Math.max(-5, S.specialSetupWorkflow.csiJunctionB - 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-b-plus') {
			S.specialSetupWorkflow.csiJunctionB = Math.min(5, S.specialSetupWorkflow.csiJunctionB + 1);
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-b-zero') {
			S.specialSetupWorkflow.csiJunctionB = 0;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'csi-verify')
			S.specialSetupWorkflow.verified =
				specialMatchStatus(S.specialSetupWorkflow.csiJunctionA, s.toleranceMm || 1) &&
				specialMatchStatus(S.specialSetupWorkflow.csiJunctionB, s.toleranceMm || 1) &&
				S.specialSetupWorkflow.cranialIndex &&
				S.specialSetupWorkflow.spineIndex &&
				S.specialSetupWorkflow.csiPlan;
	} else if (type === 'ELECTRON') {
		const e = S.specialSetupWorkflow.electron;
		const shape =
			(document.getElementById('electronShape') as HTMLSelectElement | null)?.value || '';
		const cone = (document.getElementById('electronCone') as HTMLSelectElement | null)?.value || '';
		const width =
			Number((document.getElementById('electronWidth') as HTMLSelectElement | null)?.value) || 0;
		const height =
			Number((document.getElementById('electronHeight') as HTMLSelectElement | null)?.value) || 0;
		e.shape = shape;
		e.cone = cone;
		e.width = width;
		e.height = height;
		if (action === 'electron-template') {
			e.template = true;
			e.fabricated = false;
			e.mounted = false;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'electron-fabricate') {
			if (e.template) e.fabricated = true;
			S.specialSetupWorkflow.verified = false;
		}
		if (action === 'electron-mount') {
			const dims =
				shape === s.shape &&
				cone === s.cone &&
				Math.abs(width - s.widthCm) < 0.01 &&
				Math.abs(height - s.heightCm) < 0.01;
			const checks =
				S.specialSetupWorkflow.ePPE &&
				S.specialSetupWorkflow.eCool &&
				S.specialSetupWorkflow.eLabel &&
				S.specialSetupWorkflow.eLight &&
				S.odiOn &&
				S.lastODIcm != null;
			if (e.template && e.fabricated && dims && checks) {
				e.mounted = true;
				S.specialSetupWorkflow.verified = true;
				e.bolusPlaced = false;
				e.airGapMm = 4;
				e.bolusDragX = 54;
				e.bolusDragY = 92;
				e.bolusContactY = 38;
				e.bolusPositionOK = false;
				e.bolusAirGapOK = false;
				e.bolusLogged = false;
			} else {
				e.mounted = false;
				S.specialSetupWorkflow.verified = false;
			}
			updateElectronBolusMesh();
		}
	}
	renderSpecialSetupPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
	updateBEVInset();
	updateElectronApplicator3D();
	updateElectronBolusMesh();
}

function currentSpecialFieldTarget() {
	const field = typeof deliveryCasePlan === 'function' ? deliveryCasePlan() : null;
	const type = String(S.activeTreatmentCase?.specialSetup?.type || '').toUpperCase();
	if (type === 'BREAST_MATCH') {
		if (
			String(field?.field || field?.name || '')
				.toLowerCase()
				.includes('supra')
		)
			return { x: -0.1, y: 0.13, z: -0.68, label: 'Supraclavicular / low neck' };
		return { x: -0.12, y: 0.13, z: -0.45, label: 'Left breast / chest wall' };
	}
	if (type === 'CSI') {
		const station = String(field?.station || '').toLowerCase();
		if (station.includes('cranial'))
			return { x: 0, y: 0.08, z: -0.86, label: 'Cranial contents / cervical junction' };
		if (station.includes('lower')) return { x: 0, y: 0.06, z: 0.34, label: 'Lower spinal canal' };
		return { x: 0, y: 0.06, z: -0.28, label: 'Upper spinal canal' };
	}
	if (type === 'ELECTRON') return { x: -0.12, y: 0.135, z: -0.45, label: 'Left chest-wall scar' };
	return null;
}

export function updateSpecialAnatomyTargetMarker() {
	if (!S.specialAnatomyTargetMarker) return;
	const t = currentSpecialFieldTarget();
	S.specialAnatomyTargetMarker.visible = !!t;
	if (t) {
		S.specialAnatomyTargetMarker.position.set(t.x, t.y, t.z);
		S.specialAnatomyTargetMarker.userData.label = t.label;
	}
}
