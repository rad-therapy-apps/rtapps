// Electron bolus delivery task and bolus mesh (split out of linac-delivery.ts, #77).
import { S } from '../state';
import { renderTreatmentMonitor } from '../scene';
import { deliveryCasePlan } from './plan';
import { activeSpecialSetupSpec } from './special-setup';
import { oisLogEvent } from './ois';
import { renderTreatmentDeliveryPanel } from './treatment-delivery';

export function activeElectronBolusSpec() {
	const field = deliveryCasePlan(),
		s = activeSpecialSetupSpec();
	if (!field?.electron || String(s?.type || '').toUpperCase() !== 'ELECTRON') return null;
	return s;
}

export function electronBolusDeliveryRequired() {
	return !!activeElectronBolusSpec();
}

export function electronBolusDeliveryOK() {
	if (!electronBolusDeliveryRequired()) return true;
	const e = (S.specialSetupWorkflow?.electron || {}) as typeof S.specialSetupWorkflow.electron;
	return !!(
		S.specialSetupWorkflow.verified &&
		e.mounted &&
		e.bolusPlaced &&
		e.bolusPositionOK &&
		e.bolusAirGapOK &&
		Number(e.airGapMm || 99) <= 1
	);
}

function electronBolusShapeClass(shape) {
	const s = String(shape || 'Oval').toLowerCase();
	return s === 'rectangle' ? 'rectangle' : s === 'circle' ? 'circle' : 'oval';
}

export function renderElectronBolusDeliveryTask() {
	const host = document.getElementById('electronBolusDeliveryTask');
	if (!host) return;
	const s = activeElectronBolusSpec();
	if (!s) {
		host.hidden = true;
		host.innerHTML = '';
		updateElectronBolusMesh();
		return;
	}
	host.hidden = false;
	const e = (S.specialSetupWorkflow.electron || {}) as typeof S.specialSetupWorkflow.electron;
	if (!Number.isFinite(Number(e.bolusDragX))) e.bolusDragX = 54;
	if (!Number.isFinite(Number(e.bolusDragY))) e.bolusDragY = 92;
	if (!Number.isFinite(Number(e.bolusContactY))) e.bolusContactY = 38;
	e.bolusShape = String(s.shape || 'Oval');
	e.bolusWidth = Number(s.widthCm) || 6;
	e.bolusHeight = Number(s.heightCm) || 4;
	e.bolusThickness = Number(s.bolusThicknessCm) || 0.5;
	const scale = 16,
		fw = Math.max(62, e.bolusWidth * scale),
		fh = Math.max(48, e.bolusHeight * scale);
	const shapeClass = electronBolusShapeClass(e.bolusShape);
	const posOK = !!e.bolusPositionOK,
		gapOK = !!e.bolusAirGapOK;
	host.innerHTML = `<div class="electron-bolus-task-head"><div><h4>Electron bolus placement · treatment-room task</h4><p>Drag the prescribed ${e.bolusThickness.toFixed(1)}-cm bolus from the supply area onto the custom ${e.bolusShape.toLowerCase()} field. Then use the side profile to lower/conform it to the skin until no clinically meaningful air gap remains.</p></div><div class="electron-bolus-status ${posOK && gapOK ? 'good' : ''}">${posOK && gapOK ? 'BOLUS VERIFIED' : 'BOLUS HOLD'}</div></div>
            <div class="electron-bolus-workspace">
              <div id="electronBolusStage" class="electron-bolus-stage">
                <div class="electron-bolus-stage-label">Beam's-eye surface placement</div>
                <div class="electron-patient-surface"></div>
                <div id="electronFieldTarget" class="electron-field-target ${shapeClass}" style="width:${fw}px;height:${fh}px"></div>
                <div id="electronBolusPiece" class="electron-bolus-piece ${shapeClass} ${posOK ? 'good' : ''}" style="width:${fw}px;height:${fh}px;left:${e.bolusDragX}px;top:${e.bolusDragY}px"><span>${e.bolusThickness.toFixed(1)} cm<br>BOLUS</span></div>
                <div class="electron-bolus-help">Drag bolus until it completely overlays the cyan field outline.</div>
              </div>
              <div id="electronBolusProfile" class="electron-bolus-profile">
                <div class="electron-bolus-profile-label">Surface-contact profile</div>
                <div class="electron-profile-field"></div>
                <div class="electron-profile-skin"></div>
                <div id="electronProfileBolus" class="electron-profile-bolus ${gapOK ? 'good' : ''}" style="top:${e.bolusContactY}%"></div>
                <div class="electron-gap-readout">AIR GAP · ${Number(e.airGapMm || 0).toFixed(1)} mm<br>${gapOK ? 'CONTACT ACCEPTABLE' : 'Drag bolus downward to conform to skin'}</div>
              </div>
            </div>
            <div class="electron-bolus-metrics">
              <div class="electron-bolus-metric ${posOK ? 'good' : ''}"><span>Field coverage</span><b>${posOK ? 'MATCHED' : 'NOT MATCHED'}</b></div>
              <div class="electron-bolus-metric ${gapOK ? 'good' : ''}"><span>Skin contact</span><b>${gapOK ? 'NO AIR GAP' : `${Number(e.airGapMm || 0).toFixed(1)} mm gap`}</b></div>
              <div class="electron-bolus-metric ${electronBolusDeliveryOK() ? 'good' : ''}"><span>Beam interlock</span><b>${electronBolusDeliveryOK() ? 'RELEASED' : 'HOLD'}</b></div>
            </div>`;
	wireElectronBolusDeliveryDrag();
	updateElectronBolusMesh();
}

function wireElectronBolusDeliveryDrag() {
	const stage = document.getElementById('electronBolusStage'),
		piece = document.getElementById('electronBolusPiece'),
		target = document.getElementById('electronFieldTarget');
	const profile = document.getElementById('electronBolusProfile'),
		profileBolus = document.getElementById('electronProfileBolus');
	const e = S.specialSetupWorkflow?.electron;
	if (!e || !stage || !piece || !target || !profile || !profileBolus) return;
	const finishPlacement = () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
		const sr = stage.getBoundingClientRect(),
			tr = target.getBoundingClientRect(),
			pr = piece.getBoundingClientRect();
		const tcx = (tr.left + tr.right) / 2,
			tcy = (tr.top + tr.bottom) / 2,
			pcx = (pr.left + pr.right) / 2,
			pcy = (pr.top + pr.bottom) / 2;
		const dx = pcx - tcx,
			dy = pcy - tcy;
		const tolPx = 7;
		e.bolusPositionOK = Math.abs(dx) <= tolPx && Math.abs(dy) <= tolPx;
		e.bolusPlaced = true;
		e.bolusOffsetXcm = dx / 16;
		e.bolusOffsetYcm = dy / 16;
		if (!e.bolusPositionOK) {
			e.bolusAirGapOK = false;
		}
		updateElectronBolusMesh();
		renderTreatmentDeliveryPanel();
	};
	let dragging = false,
		ox = 0,
		oy = 0;
	piece.addEventListener('pointerdown', (ev) => {
		if (!S.specialSetupWorkflow.verified || S.treatmentDelivery.delivering) return;
		dragging = true;
		piece.setPointerCapture(ev.pointerId);
		const r = piece.getBoundingClientRect();
		ox = ev.clientX - (r.left + r.width / 2);
		oy = ev.clientY - (r.top + r.height / 2);
	});
	piece.addEventListener('pointermove', (ev) => {
		if (!dragging) return;
		const sr = stage.getBoundingClientRect(),
			pr = piece.getBoundingClientRect();
		let x = ev.clientX - sr.left - ox,
			y = ev.clientY - sr.top - oy;
		x = Math.max(pr.width / 2, Math.min(sr.width - pr.width / 2, x));
		y = Math.max(pr.height / 2, Math.min(sr.height - pr.height / 2, y));
		e.bolusDragX = x;
		e.bolusDragY = y;
		e.bolusPlaced = true;
		e.bolusPositionOK = false;
		e.bolusAirGapOK = false;
		piece.style.left = `${x}px`;
		piece.style.top = `${y}px`;
		piece.classList.remove('good');
	});
	piece.addEventListener('pointerup', (ev) => {
		if (!dragging) return;
		dragging = false;
		try {
			piece.releasePointerCapture(ev.pointerId);
			// eslint-disable-next-line no-empty -- legacy silent-catch pattern, error intentionally swallowed
		} catch {}
		finishPlacement();
	});
	piece.addEventListener('pointercancel', () => {
		dragging = false;
	});
	let pdrag = false;
	profileBolus.addEventListener('pointerdown', (ev) => {
		if (!e.bolusPositionOK || S.treatmentDelivery.delivering) return;
		pdrag = true;
		profileBolus.setPointerCapture(ev.pointerId);
	});
	profileBolus.addEventListener('pointermove', (ev) => {
		if (!pdrag) return;
		const r = profile.getBoundingClientRect();
		let pct = ((ev.clientY - r.top) / r.height) * 100;
		pct = Math.max(18, Math.min(65, pct));
		e.bolusContactY = pct;
		const gap = Math.max(0, (65 - pct) * 0.13);
		e.airGapMm = Number(gap.toFixed(1));
		e.bolusAirGapOK = e.airGapMm <= 1;
		profileBolus.style.top = `${pct}%`;
		profileBolus.classList.toggle('good', e.bolusAirGapOK);
		updateElectronBolusMesh();
	});
	profileBolus.addEventListener('pointerup', (ev) => {
		if (!pdrag) return;
		pdrag = false;
		try {
			profileBolus.releasePointerCapture(ev.pointerId);
			// eslint-disable-next-line no-empty -- legacy silent-catch pattern, error intentionally swallowed
		} catch {}
		e.bolusPlaced = true;
		e.bolusAirGapOK = Number(e.airGapMm || 99) <= 1;
		if (e.bolusPositionOK && e.bolusAirGapOK && !e.bolusLogged) {
			e.bolusLogged = true;
			oisLogEvent(
				'SETUP',
				'Electron bolus verified',
				`${e.bolusThickness.toFixed(1)} cm bolus · field matched · no air gap`,
				'electron-bolus-verified'
			);
		}
		updateElectronBolusMesh();
		renderTreatmentDeliveryPanel();
		renderTreatmentMonitor();
	});
	profileBolus.addEventListener('pointercancel', () => {
		pdrag = false;
	});
}

export function updateElectronBolusMesh() {
	if (!S.electronBolusMesh) return;
	const s = activeSpecialSetupSpec();
	const isElectronCase =
		!!S.activeTreatmentCase && String(s?.type || '').toUpperCase() === 'ELECTRON';
	const e = (S.specialSetupWorkflow?.electron || {}) as typeof S.specialSetupWorkflow.electron;
	S.electronBolusMesh.visible = isElectronCase && !!e.bolusPlaced;
	if (!S.electronBolusMesh.visible) return;
	const w = Number(e.bolusWidth || s?.widthCm || 6);
	const h = Number(e.bolusHeight || s?.heightCm || 4);
	const thickness = Number(e.bolusThickness || s?.bolusThicknessCm || 0.5);
	S.electronBolusMesh.scale.set(
		Math.max(0.55, Math.min(1.25, w / 6)),
		Math.max(0.7, Math.min(2.4, thickness / 0.5)),
		Math.max(0.55, Math.min(1.25, h / 4))
	);
	const gap = Math.max(0, Number(e.airGapMm) || 0);
	const dxCm = Number(e.bolusOffsetXcm) || 0,
		dzCm = Number(e.bolusOffsetYcm) || 0;
	S.electronBolusMesh.position.set(
		-0.12 + dxCm * 0.012,
		0.106 + gap * 0.0018,
		-0.45 + dzCm * 0.012
	);
	S.electronBolusMesh.material.color.set(
		e.bolusPositionOK && e.bolusAirGapOK ? 0x72e0b8 : 0x66d0f2
	);
}
