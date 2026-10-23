// Plan, field and couch geometry, arcs; ODI/jaw/SID drivers (split out of linac-delivery.ts, #77).
import * as THREE from 'three-linac';
import { S } from '../state';
import { deliveryFieldSelect } from '../dom';
import { applyDetectorCommandedPose, monitorPlannedDisplay, updateMLCPositions } from '../scene';
import { setTextById, wrap360 } from '../main';
import { fundamentalState, setCenteredJawField, updateBEVInset } from '../linac-safety';
import type {
	FieldGeometry,
	TreatmentField,
	PlannedParameters,
	DeliveryFieldPlan,
	CoordinateShift
} from './types';
import { activeSpecialSetupSpec } from './special-setup';

export function fmtSignedInt(v) {
	const n = Number(v) || 0;
	if (Object.is(n, -0) || Math.abs(n) < 1e-9) return '0';
	return `${n > 0 ? '+' : ''}${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

export function normalizeAngleValue(value) {
	const n = parseFloat(String(value ?? '').replace('°', ''));
	if (!Number.isFinite(n)) return null;
	return ((n % 360) + 360) % 360;
}

export function parseFirstNumber(value) {
	const m = String(value ?? '').match(/[-+]?\d+(?:\.\d+)?/);
	return m ? Number(m[0]) : null;
}

function parseJawPair(value) {
	const nums = String(value ?? '').match(/[-+]?\d+(?:\.\d+)?/g);
	return nums && nums.length >= 2 ? [Number(nums[0]), Number(nums[1])] : null;
}

export function parseJawSpec(value) {
	const s = String(value ?? '');
	const readLabel = (label) => {
		const m = s.match(new RegExp(label + '\\s*[:=]?\\s*([-+]?\\d+(?:\\.\\d+)?)', 'i'));
		return m ? Math.abs(Number(m[1])) : null;
	};
	const x1 = readLabel('X1'),
		x2 = readLabel('X2'),
		y1 = readLabel('Y1'),
		y2 = readLabel('Y2');
	if ([x1, x2, y1, y2].every(Number.isFinite)) return { x1, x2, y1, y2, explicit: true };
	const pair = parseJawPair(value);
	if (pair)
		return { x1: pair[0] / 2, x2: pair[0] / 2, y1: pair[1] / 2, y2: pair[1] / 2, explicit: false };
	return null;
}

function parseCouchTriplet(value) {
	const nums = String(value ?? '').match(/[-+]?\d+(?:\.\d+)?/g);
	if (!nums || nums.length < 3) return null;
	return nums.slice(0, 3).map((v) => {
		const n = Number(v);
		return Object.is(n, -0) ? 0 : n;
	});
}

export function canonicalCouchDisplay(value) {
	const vals = Array.isArray(value) ? value : parseCouchTriplet(value);
	if (!vals) return String(value ?? '—');
	return `${fmtSignedInt(vals[0])} / ${fmtSignedInt(vals[1])} / ${fmtSignedInt(vals[2])} mm`;
}

export function getPlannedCouchState() {
	const vals = parseCouchTriplet(getCurrentPlannedParameters()?.couch);
	if (!vals) return null;
	// Monitor convention is VRT / LNG / LAT.
	return { vrt: vals[0], lng: vals[1], lat: vals[2] };
}

export function getIGRTExpectedAbsoluteCouch() {
	if (
		!S.clinicalIGRT?.active ||
		!S.clinicalIGRT?.acquired ||
		!S.clinicalIGRT?.correction ||
		!S.clinicalIGRT?.baseline
	)
		return null;
	return {
		vrt:
			(S.clinicalIGRT.baseline as CoordinateShift).vrt +
			(S.clinicalIGRT.correction as CoordinateShift).vrt,
		lng:
			(S.clinicalIGRT.baseline as CoordinateShift).lng +
			(S.clinicalIGRT.correction as CoordinateShift).lng,
		lat:
			(S.clinicalIGRT.baseline as CoordinateShift).lat +
			(S.clinicalIGRT.correction as CoordinateShift).lat
	};
}

export function couchStateMatchesPlan(tol = 0.01) {
	const p = getPlannedCouchState();
	if (!p) return true;
	return (
		Math.abs(fundamentalState.vrt - p.vrt) <= tol &&
		Math.abs(fundamentalState.lng - p.lng) <= tol &&
		Math.abs(fundamentalState.lat - p.lat) <= tol
	);
}

export function treatmentParamMatches(key, plannedValue, actualValue) {
	if (plannedValue == null || actualValue == null) return false;
	if (key === 'gantry' || key === 'collimator' || key === 'couchAngle') {
		const p = normalizeAngleValue(plannedValue),
			a = normalizeAngleValue(actualValue);
		if (p == null || a == null) return false;
		const d = Math.abs(p - a);
		return Math.min(d, 360 - d) < 0.01;
	}
	if (key === 'jaws') {
		const p = parseJawSpec(plannedValue),
			a = parseJawSpec(actualValue);
		return !!p && !!a && ['x1', 'x2', 'y1', 'y2'].every((k) => Math.abs(p[k] - a[k]) < 0.01);
	}
	if (key === 'mlcAperture') {
		const p = parseFirstNumber(plannedValue),
			a = parseFirstNumber(actualValue);
		return p != null && a != null && Math.abs(p - a) < 0.01;
	}
	if (key === 'couch') {
		const a = parseCouchTriplet(actualValue);
		if (!a) return false;
		const igrtTarget = getIGRTExpectedAbsoluteCouch();
		if (igrtTarget) {
			// Once images are acquired, the clinically expected couch position is the
			// planned/setup baseline plus the recommended image-guided correction.
			const target = [igrtTarget.vrt, igrtTarget.lng, igrtTarget.lat];
			return target.every((v, i) => Math.abs(v - a[i]) <= 1.0);
		}
		const p = parseCouchTriplet(plannedValue);
		return !!p && p.every((v, i) => Math.abs(v - a[i]) < 0.01);
	}
	const canon = (v) => String(v).trim().toLowerCase().replace(/\s+/g, ' ');
	return canon(plannedValue) === canon(actualValue);
}

export function getTreatmentFields(): TreatmentField[] {
	if (!S.activeTreatmentCase) return [];
	if (Array.isArray(S.activeTreatmentCase.fields) && S.activeTreatmentCase.fields.length)
		return S.activeTreatmentCase.fields;
	const legacy = S.activeTreatmentCase.delivery || {
		field: 'Static field',
		mu: 100,
		doseRate: 600
	};
	return [
		{
			name: legacy.field || 'Static field',
			mu: legacy.mu || 100,
			doseRate: legacy.doseRate || 600,
			geometry: {} as FieldGeometry
		}
	];
}

export function deliveryCasePlan(): DeliveryFieldPlan {
	const fields = getTreatmentFields();
	if (!fields.length)
		return {
			name: 'Static field',
			field: 'Static field',
			mu: 100,
			doseRate: 600,
			mode: 'STATIC',
			geometry: {} as FieldGeometry
		};
	const idx = Math.max(
		0,
		Math.min(fields.length - 1, Number(S.treatmentDelivery?.activeFieldIndex) || 0)
	);
	const f = fields[idx];
	return {
		...f,
		mode: String(f.mode || 'STATIC').toUpperCase(),
		field: f.name || (f as TreatmentField & { field?: string }).field || `Field ${idx + 1}`,
		geometry: (f.geometry || {}) as FieldGeometry
	};
}

export function isDynamicTreatmentField(field = deliveryCasePlan()) {
	return (
		['IMRT', 'VMAT'].includes(String(field?.mode || '').toUpperCase()) &&
		Array.isArray(field?.controlPoints) &&
		field.controlPoints.length > 1
	);
}

export function deliveryProgressFraction(field = deliveryCasePlan()) {
	const total = Math.max(0.0001, Number(field?.mu) || 1);
	if (S.treatmentDelivery?.completed) return 1;
	return Math.max(0, Math.min(1, (Number(S.treatmentDelivery?.muDelivered) || 0) / total));
}

export function arcAngularState(arc, fraction) {
	if (!arc) return null;
	const start = wrap360(Number(arc.start) || 0),
		stop = wrap360(Number(arc.stop) || 0),
		dir = String(arc.direction || 'CW').toUpperCase();
	let sweep = dir === 'CW' ? (start - stop + 360) % 360 : (stop - start + 360) % 360;
	if (arc.fullArc && sweep < 300) sweep += 360;
	const raw = dir === 'CW' ? start - sweep * fraction : start + sweep * fraction;
	return { angle: wrap360(raw), start, stop, direction: dir, sweep };
}

export function getDynamicFieldState(
	field = deliveryCasePlan(),
	fraction = deliveryProgressFraction(field)
) {
	const mode = String(field?.mode || 'STATIC').toUpperCase();
	const cps =
		Array.isArray(field?.controlPoints) && field.controlPoints.length
			? field.controlPoints
			: [
					{
						muFraction: 0,
						mlcAperture: parseFirstNumber(field?.geometry?.mlcAperture) || fundamentalState.mlc,
						mlcShape: field?.geometry?.mlcShape || fundamentalState.mlcShape,
						doseRate: Number(field?.doseRate) || 600
					}
				];
	const f = Math.max(0, Math.min(1, Number(fraction) || 0));
	let lo = cps[0],
		hi = cps[cps.length - 1],
		loIdx = 0,
		hiIdx = cps.length - 1;
	for (let i = 0; i < cps.length; i++) {
		if ((Number(cps[i].muFraction) || 0) <= f) {
			lo = cps[i];
			loIdx = i;
		}
		if ((Number(cps[i].muFraction) || 0) >= f) {
			hi = cps[i];
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
			hiIdx = i;
			break;
		}
	}
	const lf = Number(lo.muFraction) || 0,
		hf = Number(hi.muFraction) || lf;
	const t = hf > lf ? Math.max(0, Math.min(1, (f - lf) / (hf - lf))) : 0;
	const lerp = (a, b) => Number(a) + (Number(b) - Number(a)) * t;
	const baseA = parseFirstNumber(field?.geometry?.mlcAperture) || fundamentalState.mlc;
	const mlcA = Number.isFinite(Number(lo.mlcAperture)) ? Number(lo.mlcAperture) : baseA;
	const mlcB = Number.isFinite(Number(hi.mlcAperture)) ? Number(hi.mlcAperture) : mlcA;
	const drA = Number.isFinite(Number(lo.doseRate))
		? Number(lo.doseRate)
		: Number(field?.doseRate) || 600;
	const drB = Number.isFinite(Number(hi.doseRate)) ? Number(hi.doseRate) : drA;
	const arc = mode === 'VMAT' ? arcAngularState(field.arc, f) : null;
	const gantry = arc
		? arc.angle
		: (normalizeAngleValue(field?.geometry?.gantry) ?? fundamentalState.gantry);
	const cpIdx = Math.max(0, Math.min(cps.length - 1, loIdx));
	return {
		mode,
		fraction: f,
		gantry,
		collimator: normalizeAngleValue(field?.geometry?.collimator) ?? fundamentalState.collimator,
		mlcAperture: lerp(mlcA, mlcB),
		mlcShape: lo.mlcShape || field?.geometry?.mlcShape || 'Conformal',
		doseRate: lerp(drA, drB),
		controlPointIndex: cpIdx,
		controlPointCount: cps.length,
		arc
	};
}

export function getCurrentPlannedParameters() {
	const base = { couchAngle: '0°', ...(S.activeTreatmentCase?.planned || {}) };
	const field = deliveryCasePlan();
	let geometry = { ...(field.geometry || {}) };
	if (
		isDynamicTreatmentField(field) &&
		(S.treatmentDelivery?.delivering || S.treatmentDelivery?.held || S.treatmentDelivery?.completed)
	) {
		const d = getDynamicFieldState(field);
		geometry = {
			...geometry,
			gantry: `${d.gantry}°`,
			collimator: `${d.collimator}°`,
			mlcAperture: `${Number(d.mlcAperture.toFixed(2))} cm`,
			mlcShape: d.mlcShape
		};
	}
	const merged = { ...base, ...geometry } as PlannedParameters & { electronAccessory?: string };
	const ss = activeSpecialSetupSpec();
	if (field?.electron && String(ss?.type || '').toUpperCase() === 'ELECTRON')
		merged.electronAccessory = `${ss.shape} ${ss.widthCm} × ${ss.heightCm} cm · ${ss.cone}`;
	return merged;
}

export function applyDynamicDeliveryMachineState(
	field = deliveryCasePlan(),
	fraction = deliveryProgressFraction(field)
) {
	if (!isDynamicTreatmentField(field)) return getDynamicFieldState(field, fraction);
	const d = getDynamicFieldState(field, fraction);
	S.treatmentDelivery.dynamicFraction = d.fraction;
	S.treatmentDelivery.controlPointIndex = d.controlPointIndex;
	if (d.mode === 'VMAT') {
		fundamentalState.gantry = d.gantry;
		if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z = -((d.gantry * Math.PI) / 180);
	}
	fundamentalState.mlc = Number(d.mlcAperture.toFixed(2));
	fundamentalState.mlcShape = d.mlcShape;
	updateMLCPositions();
	setTextById('pendantGantryReadout', `${Number(wrap360(fundamentalState.gantry).toFixed(1))}°`);
	setTextById('pendantMLCReadout', `${Number(fundamentalState.mlc.toFixed(1))} cm`);
	setTextById('hudGantry', `${Number(wrap360(fundamentalState.gantry).toFixed(1))}°`);
	setTextById(
		'hudMLC',
		`${Number(fundamentalState.mlc.toFixed(1))} cm · ${fundamentalState.mlcShape}`
	);
	updateBEVInset();
	return d;
}

export function populateDeliveryFieldSelect() {
	if (!deliveryFieldSelect) return;
	const fields = getTreatmentFields();
	deliveryFieldSelect.innerHTML = '';
	if (!fields.length) {
		const opt = document.createElement('option');
		opt.value = '0';
		opt.textContent = 'Load a patient case';
		deliveryFieldSelect.appendChild(opt);
		deliveryFieldSelect.disabled = true;
		return;
	}
	fields.forEach((f, i) => {
		const opt = document.createElement('option');
		opt.value = String(i);
		const gantry = f.geometry?.gantry
			? ` · G ${monitorPlannedDisplay('gantry', f.geometry.gantry)}`
			: '';
		const couch =
			f.geometry?.couchAngle != null
				? ` · T ${monitorPlannedDisplay('couchAngle', f.geometry.couchAngle)}`
				: '';
		const mode = String(f.mode || 'STATIC').toUpperCase();
		const dyn =
			mode === 'VMAT'
				? ` · ${String(f.arc?.direction || 'CW').toUpperCase()} ARC`
				: mode === 'IMRT'
					? ' · IMRT'
					: '';
		const done = S.treatmentDelivery.completedFields[i] ? ' ✓' : '';
		opt.textContent = `${i + 1}. ${f.name || (f as TreatmentField & { field?: string }).field || `Field ${i + 1}`}${gantry}${couch}${dyn}${done}`;
		deliveryFieldSelect.appendChild(opt);
	});
	S.treatmentDelivery.activeFieldIndex = Math.max(
		0,
		Math.min(fields.length - 1, Number(S.treatmentDelivery.activeFieldIndex) || 0)
	);
	deliveryFieldSelect.value = String(S.treatmentDelivery.activeFieldIndex);
	deliveryFieldSelect.disabled = !!S.treatmentDelivery.delivering;
}

export function getODIMeasurement() {
	if (!S.gantryRotatingGroup || !S.patientGroup) return null;
	S.scene.updateMatrixWorld(true);
	const source = S.gantryRotatingGroup.localToWorld(new THREE.Vector3(0, 1.5, 0));
	const axis = S.gantryRotatingGroup.localToWorld(new THREE.Vector3(0, 0, 0));
	const dir = axis.clone().sub(source).normalize();
	const ray = new THREE.Raycaster(source, dir, 0, 4.0);
	const hits = ray.intersectObject(S.patientGroup, true);
	if (!hits.length) return { source, axis, point: axis.clone(), cm: null };
	const point = hits[0].point.clone();
	// Virtual geometry calibration: source-to-axis = 100 cm.
	const sadModel = source.distanceTo(axis);
	const cm = sadModel > 0 ? source.distanceTo(point) * (100 / sadModel) : null;
	return { source, axis, point, cm };
}

// ----- Divergence Lab → real machine drivers -----
export function setBeamWidth(cm) {
	// lab Jaw Width (5–25 cm) → centered square aperture
	setCenteredJawField(Number(cm) || 10, Number(cm) || 10);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
function setReceptorSID(sidCm) {
	// lab Receptor SID (120–180 cm) → stored EPID depth only
	S.epidReceptorY = -0.7 - ((sidCm - 120) / 60) * 0.6;
	// IMPORTANT: changing a lab SID must NEVER deploy the MV detector.
	// If the learner has already extended the EPID from the pendant, update only
	// its beam-axis depth; otherwise leave the panel parked in its retracted pose.
	if (S.detectorExtended) applyDetectorCommandedPose();
}
