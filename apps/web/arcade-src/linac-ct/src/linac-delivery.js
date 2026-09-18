// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import * as THREE from 'three-linac';
import { S } from './state.js';
import {
	adaptiveDoseCanvas,
	adaptiveNextFraction,
	adaptivePanel,
	adaptiveResetCourse,
	beamOnButton,
	deliveryArm,
	deliveryFieldSelect,
	deliveryHold,
	deliveryPanel,
	deliveryStart,
	deliveryTerminate,
	immobilizationLaunchButton,
	immobilizationPlacedList,
	immobilizationShelf,
	motionAcquire,
	motionDibhTarget,
	motionDibhTolerance,
	motionGateHigh,
	motionGateLow,
	motionHold,
	motionPanel,
	motionRelease,
	motionWaveCanvas,
	oisNote,
	oisOverrideCard,
	oisOverrideReviewCheck,
	oisOverrideSummary,
	oisPanel,
	oisReviewCheck,
	oisSignOff,
	oisTherapist,
	specialSetupContent,
	specialSetupLaunchButton,
	specialSetupPanel,
	srsDryRun,
	srsLaunchButton,
	srsPanel,
	srsVerifyTimeout,
	treatmentCaseSelect
} from './dom.js';
import {
	GROUND_Y,
	applyDetectorCommandedPose,
	monitorPlannedDisplay,
	renderTreatmentMonitor,
	setBeamState,
	setDetectorStateGame,
	setKvState,
	setODIState,
	updateElectronApplicator3D,
	updateMLCPositions
} from './scene.js';
import {
	fmtIGRT,
	getIGRTApplied,
	getIGRTResidual,
	renderClinicalIGRT,
	resetClinicalIGRTForCase
} from './linac-igrt.js';
import {
	allTreatmentFieldsCompleted,
	clearanceOverrideActive,
	clearanceOverrideRecord,
	clearanceOverrideUsedAny,
	COLLISION_PROXY_TOL,
	currentSelectedFieldClearance,
	deliveryGeometryChecks,
	fundamentalState,
	getCollisionAssessment,
	getDeliveryReadiness,
	igrtAlignmentReadyForDelivery,
	renderClearanceOverrideCard,
	renderTreatmentCompletionControls,
	resetTreatmentCompletion,
	setCenteredJawField,
	setPendantLCD,
	setTextById,
	syncFundamentalReadouts,
	TREATMENT_CLEARANCE_REQUIRED_MARGIN,
	treatmentTrajectorySamples,
	updateBEVInset,
	wrap360
} from './main.js';

const DELIVERY_SPEED_FACTOR = 4;

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
		vrt: S.clinicalIGRT.baseline.vrt + S.clinicalIGRT.correction.vrt,
		lng: S.clinicalIGRT.baseline.lng + S.clinicalIGRT.correction.lng,
		lat: S.clinicalIGRT.baseline.lat + S.clinicalIGRT.correction.lat
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

export function getTreatmentFields() {
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
			geometry: {}
		}
	];
}

export function deliveryCasePlan() {
	const fields = getTreatmentFields();
	if (!fields.length)
		return {
			name: 'Static field',
			field: 'Static field',
			mu: 100,
			doseRate: 600,
			mode: 'STATIC',
			geometry: {}
		};
	const idx = Math.max(
		0,
		Math.min(fields.length - 1, Number(S.treatmentDelivery?.activeFieldIndex) || 0)
	);
	const f = fields[idx];
	return {
		...f,
		mode: String(f.mode || 'STATIC').toUpperCase(),
		field: f.name || f.field || `Field ${idx + 1}`,
		geometry: f.geometry || {}
	};
}

function isDynamicTreatmentField(field = deliveryCasePlan()) {
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
	const merged = { ...base, ...geometry };
	const ss = activeSpecialSetupSpec();
	if (field?.electron && String(ss?.type || '').toUpperCase() === 'ELECTRON')
		merged.electronAccessory = `${ss.shape} ${ss.widthCm} × ${ss.heightCm} cm · ${ss.cone}`;
	return merged;
}

function applyDynamicDeliveryMachineState(
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

function populateDeliveryFieldSelect() {
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
		opt.textContent = `${i + 1}. ${f.name || f.field || `Field ${i + 1}`}${gantry}${couch}${dyn}${done}`;
		deliveryFieldSelect.appendChild(opt);
	});
	S.treatmentDelivery.activeFieldIndex = Math.max(
		0,
		Math.min(fields.length - 1, Number(S.treatmentDelivery.activeFieldIndex) || 0)
	);
	deliveryFieldSelect.value = String(S.treatmentDelivery.activeFieldIndex);
	deliveryFieldSelect.disabled = !!S.treatmentDelivery.delivering;
}

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

function resetSpecialSetupForCase() {
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
		const sh = document.getElementById('electronShape'),
			co = document.getElementById('electronCone'),
			wi = document.getElementById('electronWidth'),
			he = document.getElementById('electronHeight');
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
	const by = (id) => !!document.getElementById(id)?.checked;
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
		const sh = document.getElementById('electronShape'),
			co = document.getElementById('electronCone'),
			wi = document.getElementById('electronWidth'),
			he = document.getElementById('electronHeight');
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
		const shape = document.getElementById('electronShape')?.value || '';
		const cone = document.getElementById('electronCone')?.value || '';
		const width = Number(document.getElementById('electronWidth')?.value) || 0;
		const height = Number(document.getElementById('electronHeight')?.value) || 0;
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

function activeSRSConfig() {
	return S.activeTreatmentCase?.stereotactic || null;
}

export function srsRequired() {
	return !!activeSRSConfig();
} // internal: any stereotactic SRS/SBRT workflow

export function cranialSRSRequired() {
	return String(activeSRSConfig()?.type || '').toUpperCase() === 'SRS';
}

export function sbrtRequired() {
	return String(activeSRSConfig()?.type || '').toUpperCase() === 'SBRT';
}

export function stereotacticCaseLabel() {
	return sbrtRequired() ? 'SBRT' : cranialSRSRequired() ? 'SRS' : 'STEREOTACTIC';
}

export function activeIGRTTolerances() {
	const s = activeSRSConfig();
	return {
		translation: Number(s?.translationTolerance ?? 1),
		rotation: Number(s?.rotationTolerance ?? 0.5)
	};
}

function resetSRSWorkflowForCase() {
	S.srsWorkflow = {
		dryRunByField: {},
		timeoutVerifiedByField: {},
		lastClearance: null,
		dryRunning: false
	};
	['srsCheckPatient', 'srsCheckRx', 'srsCheckMask', 'srsCheckTeam'].forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.checked = false;
	});
	srsLaunchButton?.classList.toggle('case-active', srsRequired());
	renderSRSPanel();
}

function srsCurrentFieldGeometryOK() {
	return deliveryGeometryChecks().every((x) => x.ok);
}

function srsChecklistData() {
	const field = deliveryCasePlan(),
		idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		tol = activeIGRTTolerances();
	const couchPlan = monitorPlannedDisplay(
		'couchAngle',
		getCurrentPlannedParameters().couchAngle || '0°'
	);
	const rows = [
		{
			name: 'Stereotactic 6DOF alignment',
			ok: igrtAlignmentReadyForDelivery(),
			detail: S.clinicalIGRT?.verified
				? `≤${tol.translation} mm / ≤${tol.rotation}°`
				: 'Complete high-precision IGRT'
		},
		{
			name: 'Imaging hardware retracted',
			ok: !S.kvOn && !S.detectorExtended,
			detail: !S.kvOn && !S.detectorExtended ? 'kV + MV stowed' : 'Retract imaging hardware'
		}
	];
	if (sbrtRequired())
		rows.push({
			name: '4D respiratory management',
			ok: !!S.motionManagement?.verified,
			detail: S.motionManagement?.verified
				? `Gate ${S.motionManagement.gateLow}–${S.motionManagement.gateHigh}% approved`
				: 'Complete 4D motion verification'
		});
	rows.push(
		{
			name: 'Selected field start geometry',
			ok: srsCurrentFieldGeometryOK(),
			detail: `${field.field} · G ${monitorPlannedDisplay('gantry', getCurrentPlannedParameters().gantry)} · T ${couchPlan}`
		},
		{
			name: 'Arc collision / trajectory clearance',
			ok: !!S.srsWorkflow.dryRunByField[idx] || clearanceOverrideActive(idx),
			detail: S.srsWorkflow.dryRunByField[idx]
				? clearanceOverrideActive(idx)
					? 'Beam-off trajectory completed · clearance proxy overridden'
					: 'Selected arc clear'
				: clearanceOverrideActive(idx)
					? 'Trajectory interlock cleared by simulation override · OIS sign-off required'
					: 'Dry run required'
		},
		{
			name: `${stereotacticCaseLabel()} timeout approval`,
			ok: !!S.srsWorkflow.timeoutVerifiedByField[idx],
			detail: S.srsWorkflow.timeoutVerifiedByField[idx]
				? 'Approved for this arc'
				: 'Final timeout required'
		}
	);
	return rows;
}

export function renderSRSPanel() {
	if (!srsPanel) return;
	const config = activeSRSConfig(),
		field = deliveryCasePlan(),
		idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		tol = activeIGRTTolerances(),
		type = stereotacticCaseLabel();
	setTextById(
		'stereoEyebrow',
		sbrtRequired()
			? 'STEREOTACTIC BODY RADIATION THERAPY'
			: cranialSRSRequired()
				? 'STEREOTACTIC RADIOSURGERY'
				: 'STEREOTACTIC RADIATION THERAPY'
	);
	setTextById(
		'stereoTitle',
		sbrtRequired()
			? 'SBRT Precision & Motion-Managed Delivery'
			: cranialSRSRequired()
				? 'SRS Precision & Noncoplanar Delivery'
				: 'SRS / SBRT Precision Delivery'
	);
	setTextById(
		'stereoSubtitle',
		sbrtRequired()
			? 'High-precision IGRT + 4D motion verification → arc clearance → SBRT timeout → gated VMAT delivery.'
			: 'High-precision IGRT → prescribed couch angle → collision dry run → stereotactic timeout → beam delivery.'
	);
	setTextById(
		'srsPatient',
		config ? `${S.activeTreatmentCase.patient} · ${field.field}` : 'No stereotactic case'
	);
	setTextById('srsTolerance', config ? `±${tol.translation} mm / ±${tol.rotation}°` : '—');
	setTextById(
		'srsCouchAngle',
		config
			? monitorPlannedDisplay('couchAngle', getCurrentPlannedParameters().couchAngle || '0°')
			: '—'
	);
	setTextById(
		'stereoPatientCheckLabel',
		sbrtRequired()
			? 'Correct patient, extracranial target site, and fraction independently verified.'
			: 'Correct patient, intracranial site, and fraction independently verified.'
	);
	setTextById(
		'stereoRxCheckLabel',
		`${type} prescription and high dose-per-fraction independently verified.`
	);
	setTextById(
		'stereoImmobilizationCheckLabel',
		config
			? `${config.immobilization || 'Immobilization'} and indexing verified.`
			: 'Immobilization and indexing verified.'
	);
	const foot = document.getElementById('stereoFootnote');
	if (foot)
		foot.innerHTML = sbrtRequired()
			? '<b>SBRT controls:</b> 6DOF rockers remain image-guided corrections. The planned treatment couch angle is independent. This lung SBRT case also requires verified 4D respiratory gating; beam delivery automatically holds outside the approved gate. Dry run checks the complete selected VMAT arc with beam off.'
			: '<b>SRS controls:</b> the 0.5° ROLL/PITCH/YAW rockers remain image-guided 6DOF corrections. The separate <b>TREATMENT COUCH</b> rocker changes the intentional noncoplanar table angle in 5° increments. Field selection never moves the machine automatically. A dry run uses the selected prescribed couch angle and sweeps the gantry with beam off, then returns the gantry to its planned start position.';
	const rx = document.getElementById('srsPrescription');
	if (rx)
		rx.innerHTML = config
			? `<b>${config.label}</b> · ${S.activeTreatmentCase.energy} · Fraction ${S.activeTreatmentCase.fraction}<br>Selected arc: <b>${field.field}</b> · Gantry ${monitorPlannedDisplay('gantry', field.geometry?.gantry)} · Couch ${monitorPlannedDisplay('couchAngle', field.geometry?.couchAngle || '0°')} · Collimator ${monitorPlannedDisplay('collimator', field.geometry?.collimator)} · ${field.mu} MU.`
			: 'Load an SRS or SBRT patient to begin.';
	const list = document.getElementById('srsChecklist');
	if (list)
		list.innerHTML = srsChecklistData()
			.map(
				(c) =>
					`<div class="srs-check ${c.ok ? 'good' : 'bad'}"><div class="lamp">${c.ok ? '✓' : '!'}</div><div class="name">${c.name}</div><div class="detail">${c.detail}</div></div>`
			)
			.join('');
	const status = document.getElementById('srsStatus');
	if (status) {
		status.className = '';
		if (!config) status.textContent = 'Load a stereotactic patient case.';
		else if (S.srsWorkflow.dryRunning)
			status.textContent =
				'DRY RUN IN PROGRESS · beam off · checking the selected treatment trajectory.';
		else if (S.srsWorkflow.timeoutVerifiedByField[idx]) {
			status.className = 'good';
			status.textContent = `${type} TIMEOUT APPROVED · selected arc is cleared for treatment delivery.`;
		} else if (S.srsWorkflow.lastClearance?.safe === false) {
			if (clearanceOverrideActive(idx)) {
				status.className = 'good';
				status.textContent = `SIMULATION CLEARANCE OVERRIDE ACTIVE · ${S.srsWorkflow.lastClearance.field || field.field} near gantry ${Number(S.srsWorkflow.lastClearance.angle || 0).toFixed(0)}° · OIS sign-off required.`;
			} else {
				status.className = 'bad';
				status.textContent = `CLEARANCE HOLD · ${S.srsWorkflow.lastClearance.field || field.field} near gantry ${Number(S.srsWorkflow.lastClearance.angle || 0).toFixed(0)}°.`;
			}
		} else
			status.textContent = sbrtRequired()
				? 'Complete stereotactic IGRT and 4D motion verification, establish the prescribed arc start geometry, perform the dry run, then approve the SBRT timeout.'
				: 'Complete stereotactic IGRT, set the prescribed couch/beam geometry, perform the dry run, then approve the timeout.';
	}
	if (srsDryRun)
		srsDryRun.disabled =
			!config ||
			S.srsWorkflow.dryRunning ||
			!S.clinicalIGRT?.verified ||
			S.kvOn ||
			S.detectorExtended ||
			!srsCurrentFieldGeometryOK();
	if (srsVerifyTimeout) srsVerifyTimeout.disabled = !config || S.srsWorkflow.dryRunning;
}

export function recheckSRSClearance() {
	if (!srsRequired()) {
		setPendantLCD('STEREOTACTIC', 'Not prescribed for this case');
		renderSRSPanel();
		return;
	}
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
	const c = currentSelectedFieldClearance(TREATMENT_CLEARANCE_REQUIRED_MARGIN);
	S.srsWorkflow.lastClearance = c;
	if (c.safe) {
		setPendantLCD(
			`${stereotacticCaseLabel()} CLEARANCE`,
			`CLEAR · min ${(c.minMargin * 100).toFixed(1)} cm`
		);
	} else if (clearanceOverrideActive(idx)) {
		setPendantLCD(
			`${stereotacticCaseLabel()} OVERRIDE`,
			`TRAJECTORY INTERLOCK CLEARED · OIS SIGN-OFF`
		);
	} else {
		setPendantLCD(
			`${stereotacticCaseLabel()} CLEARANCE HOLD`,
			`${c.field} · G ${Number(c.angle).toFixed(0)}°`
		);
	}
	renderSRSPanel();
	renderTreatmentDeliveryPanel();
}

export async function runSRSDryRun() {
	if (!srsRequired() || S.srsWorkflow.dryRunning) return;
	if (!S.clinicalIGRT?.verified || S.kvOn || S.detectorExtended || !srsCurrentFieldGeometryOK()) {
		setPendantLCD(`${stereotacticCaseLabel()} DRY RUN`, 'Complete IGRT / start geometry first');
		renderSRSPanel();
		return;
	}
	const field = deliveryCasePlan(),
		idx = Number(S.treatmentDelivery.activeFieldIndex) || 0,
		overrideActive = clearanceOverrideActive(idx);
	const check = currentSelectedFieldClearance(TREATMENT_CLEARANCE_REQUIRED_MARGIN);
	S.srsWorkflow.lastClearance = check;
	if (!check.safe && !overrideActive) {
		S.srsWorkflow.dryRunByField[idx] = false;
		setPendantLCD(`${stereotacticCaseLabel()} DRY RUN`, 'HOLD · predicted collision');
		renderSRSPanel();
		renderTreatmentDeliveryPanel();
		return;
	}

	const samples = treatmentTrajectorySamples(field),
		start = normalizeAngleValue(field.geometry?.gantry) || 0;
	S.srsWorkflow.dryRunning = true;
	S.srsWorkflow.dryRunByField[idx] = false;
	S.srsWorkflow.timeoutVerifiedByField[idx] = false;
	setBeamState(false);
	renderSRSPanel();

	let encounteredOverrideClearance = false;
	let firstOverrideHit = null;
	for (let i = 0; i < samples.length; i++) {
		const a = samples[i].angle;
		fundamentalState.gantry = wrap360(a);
		if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z = -((a * Math.PI) / 180);
		syncFundamentalReadouts(
			`${stereotacticCaseLabel()} DRY RUN`,
			`G ${a.toFixed(0)}° · beam off${overrideActive ? ' · clearance override' : ''}`
		);
		S.scene?.updateMatrixWorld(true);
		const c = getCollisionAssessment();
		if (c && c.margin < TREATMENT_CLEARANCE_REQUIRED_MARGIN) {
			S.srsWorkflow.lastClearance = {
				safe: false,
				minMargin: c.margin,
				reason: c.reason,
				field: field.field,
				angle: a
			};
			if (!overrideActive) break;
			encounteredOverrideClearance = true;
			if (!firstOverrideHit) firstOverrideHit = { angle: a, reason: c.reason, margin: c.margin };
		}
		await new Promise((r) => setTimeout(r, 18));
	}

	fundamentalState.gantry = wrap360(start);
	if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z = -((start * Math.PI) / 180);
	S.srsWorkflow.dryRunning = false;

	const pass = S.srsWorkflow.lastClearance?.safe !== false || overrideActive;
	S.srsWorkflow.dryRunByField[idx] = pass;

	if (pass && encounteredOverrideClearance) {
		const detail = `${field.field} · beam-off trajectory completed under simulation clearance override${firstOverrideHit ? ` · first proxy hold near G ${Number(firstOverrideHit.angle).toFixed(0)}°` : ''}`;
		oisLogEvent(
			'OVERRIDE',
			'Stereotactic trajectory dry run completed under override',
			detail,
			`stereo-dryrun-override-${idx}`
		);
		setPendantLCD(`${stereotacticCaseLabel()} DRY RUN`, 'COMPLETE · TRAJECTORY OVERRIDE ACTIVE');
	} else {
		setPendantLCD(
			`${stereotacticCaseLabel()} DRY RUN`,
			pass ? 'CLEAR · returned to arc start' : 'HOLD · clearance issue'
		);
	}

	syncFundamentalReadouts();
	renderSRSPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}

export function verifySRSTimeout() {
	if (!srsRequired()) return;
	const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
	const manual = ['srsCheckPatient', 'srsCheckRx', 'srsCheckMask', 'srsCheckTeam'].every(
		(id) => !!document.getElementById(id)?.checked
	);
	const auto =
		igrtAlignmentReadyForDelivery() &&
		(!sbrtRequired() || !!S.motionManagement?.verified) &&
		!S.kvOn &&
		!S.detectorExtended &&
		srsCurrentFieldGeometryOK() &&
		(!!S.srsWorkflow.dryRunByField[idx] || clearanceOverrideActive(idx));
	S.srsWorkflow.timeoutVerifiedByField[idx] = manual && auto;
	if (S.srsWorkflow.timeoutVerifiedByField[idx])
		oisLogEvent(
			'TIMEOUT',
			`${stereotacticCaseLabel()} timeout approved`,
			deliveryCasePlan()?.field || `Field ${idx + 1}`,
			`stereo-timeout-${idx}`
		);
	setPendantLCD(
		`${stereotacticCaseLabel()} TIMEOUT`,
		S.srsWorkflow.timeoutVerifiedByField[idx]
			? 'APPROVED · selected arc'
			: 'HOLD · complete checklist'
	);
	renderSRSPanel();
	renderTreatmentDeliveryPanel();
	renderTreatmentMonitor();
}

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

function currentMotionGateOpen() {
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

function loadOISSession() {
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
		course = spec?.course || {};
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

function renderAdaptiveCourse() {
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

function resetAdaptiveWorkflowForCase() {
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
	const d = document.getElementById('adaptiveCheckDose'),
		a = document.getElementById('adaptiveCheckApprove');
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
	S.adaptiveWorkflow.doseChecked = !!document.getElementById('adaptiveCheckDose')?.checked;
	S.adaptiveWorkflow.finalApproved = !!document.getElementById('adaptiveCheckApprove')?.checked;
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
	const d = document.getElementById('adaptiveCheckDose'),
		a = document.getElementById('adaptiveCheckApprove');
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
	const scen = S.adaptiveWorkflow.scenario || {};
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
	const e = S.specialSetupWorkflow?.electron || {};
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

function renderElectronBolusDeliveryTask() {
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
	const e = S.specialSetupWorkflow.electron || {};
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

function resetImmobilizationWorkflowForCase() {
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
	const structured = [
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
		const el = document.getElementById(id);
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
		.forEach((el) => {
			el.addEventListener('dragstart', (ev) => {
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
		.forEach((el) =>
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

function resetTreatmentDeliveryForCase() {
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
		renderTreatmentDeliveryPanel();
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
				rec = clearanceOverrideRecord(idx);
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
	renderTreatmentDeliveryPanel();
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

export const PATIENT_POSITIONS = ['HFS', 'HFP', 'FFS', 'FFP'];

export const PATIENT_POS_NAMES = {
	HFS: 'Head-First Supine',
	HFP: 'Head-First Prone',
	FFS: 'Feet-First Supine',
	FFP: 'Feet-First Prone'
};

const PATIENT_ROT = {
	HFS: [0, 0, 0],
	HFP: [0, 0, Math.PI],
	FFS: [0, Math.PI, 0],
	FFP: [0, Math.PI, Math.PI]
};

// Treatment sites: z = body-region position (head -0.93 ... feet +0.97); orient = clinically sensible setups
export const IMAGING_SITES = [
	{ key: 'brain', name: 'Brain', z: -0.86, orient: ['HFS'] },
	{ key: 'hneck', name: 'Head & Neck', z: -0.72, orient: ['HFS'] },
	{ key: 'chest', name: 'Chest', z: -0.45, orient: ['HFS'] },
	{ key: 'breast', name: 'Left Breast / Thorax', z: -0.45, orient: ['HFS'] },
	{ key: 'abdomen', name: 'Abdomen', z: -0.05, orient: ['HFS'] },
	{ key: 'pelvis', name: 'Pelvis', z: 0.18, orient: ['HFS'] },
	{ key: 'spine', name: 'Spine', z: -0.28, orient: ['HFS', 'HFP'] },
	{ key: 'femur', name: 'Femur (leg)', z: 0.58, orient: ['FFS', 'FFP'] }
];

export const TREATMENT_CASES = [
	{
		patient: 'Michael Carter',
		mrn: 'AU-24031',
		siteLabel: 'Prostate',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: '3DCRT AP/PA',
		energy: '6 MV',
		fraction: '12 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter 3D CRT photon delivery'
		},
		note: 'Verify setup, field identity, jaws, and ODI prior to beam enable.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary: 'Supine pelvic setup with indexed Vac-Lok molding and knee support.',
			instructions: [
				'Position the pelvis and lower body in the indexed Vac-Lok cushion used at simulation.',
				'Support both knees with the prescribed knee support/sponge to reduce lumbar strain and pelvic rotation.',
				'Confirm HFS orientation, tabletop index, and pelvic midline before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 185,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square'
				}
			},
			{
				name: 'PA',
				mu: 185,
				doseRate: 600,
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square'
				}
			}
		]
	},
	{
		patient: 'Erica Johnson',
		mrn: 'AU-24108',
		siteLabel: 'Whole Brain',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Lateral Opposed',
		energy: '6 MV',
		fraction: '4 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D opposed photon treatment delivery'
		},
		note: 'Check field identity, MLC aperture, and lateral imaging setup.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid fixation that conforms around the cranium and face.',
				'Support the occiput with an indexed insert that reproduces neutral head position.',
				'Confirm the head is straight and centered before lateral imaging.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 152,
				doseRate: 600,
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 152,
				doseRate: 600,
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Denise Walker',
		mrn: 'AU-24214',
		siteLabel: 'Right Lung',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Respiratory-Gated IMRT',
		energy: '6 MV',
		fraction: '7 / 30',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment with active respiratory motion management'
		},
		note: 'Complete 4D respiratory characterization, approve the end-expiration gate, then verify selected field geometry and kV setup before treatment.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed posterior molding.',
			instructions: [
				'Elevate both arms in a reproducible overhead support.',
				'Use a moldable indexed cradle beneath the thorax to limit rotation.',
				'Confirm the respiratory monitoring region remains visible and unobstructed.'
			]
		},
		planned: {
			gantry: '45°',
			collimator: '30°',
			jaws: '14 × 14 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '+2 / -3 / +1 mm'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung',
			period: 4.5,
			siExcursion: 10,
			apExcursion: 4,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 412,
				doseRate: 600,
				geometry: {
					gantry: '45°',
					collimator: '30°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.2, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.45, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.7, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 380 }
				]
			}
		]
	},
	{
		patient: 'Samuel Price',
		mrn: 'AU-24362',
		siteLabel: 'Left Femur',
		siteKey: 'femur',
		position: 'FFS',
		positionLabel: 'Feet-First Supine',
		technique: 'AP/PA Femur',
		energy: '10 MV',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D AP/PA photon treatment delivery'
		},
		note: 'Verify feet-first setup, selected field direction, square jaw field, and asymmetric MLC shaping.',
		immobilization: {
			required: ['vacLok', 'footStocks'],
			orderSummary: 'Feet-first extremity setup with reproducible leg and foot positioning.',
			instructions: [
				'Use an indexed moldable support around the treated lower extremity.',
				'Use paired distal-foot positioning to reproduce limb rotation.',
				'Confirm the treated femur is centered and the opposite leg is outside the field.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '90°',
			jaws: '12 × 12 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Asymmetric',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '-2 / +4 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 96,
				doseRate: 400,
				geometry: {
					gantry: '0°',
					collimator: '90°',
					jaws: '12 × 12 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Asymmetric'
				}
			},
			{
				name: 'PA',
				mu: 96,
				doseRate: 400,
				geometry: {
					gantry: '180°',
					collimator: '90°',
					jaws: '12 × 12 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Asymmetric'
				}
			}
		]
	},
	{
		patient: 'Robert Hayes',
		mrn: 'AU-24519',
		siteLabel: 'Prostate VMAT',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '8 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter modulated photon delivery'
		},
		note: 'Verify arc start geometry, retract imaging hardware, then observe prescribed gantry, MLC, and dose-rate modulation during each arc.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary: 'Supine pelvic VMAT setup with reproducible leg support.',
			instructions: [
				'Support the knees symmetrically to reduce pelvic rotation.',
				'Use paired distal-foot positioning to reproduce lower-extremity alignment.',
				'Confirm neutral pelvis and HFS orientation before CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '12 × 12 cm',
			mlcAperture: '11 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1',
				mode: 'VMAT',
				mu: 286,
				doseRate: 600,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '12 × 12 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.12, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 0.25, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.38, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.5, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.63, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 580 },
					{ muFraction: 0.75, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.88, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 460 },
					{ muFraction: 1.0, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			},
			{
				name: 'Arc 2',
				mode: 'VMAT',
				mu: 274,
				doseRate: 600,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '12 × 12 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.12, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.25, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 580 },
					{ muFraction: 0.38, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.5, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 450 },
					{ muFraction: 0.63, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.75, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.88, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 320 }
				]
			}
		]
	},
	{
		patient: 'Maya Reynolds',
		mrn: 'AU-24602',
		siteLabel: 'Brain Metastasis SRS',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Frameless SRS · Noncoplanar VMAT',
		energy: '6 MV FFF',
		fraction: '1 / 1',
		billing: {
			treatmentCode: '77372',
			level: 'LINAC-based SRS delivery',
			reason: 'Single-session cranial stereotactic radiosurgery delivered on a linear accelerator'
		},
		note: 'High-precision stereotactic workflow. Complete 6DOF CBCT alignment, set each prescribed treatment couch angle, perform a collision dry run, and complete the SRS timeout before beam enable.',
		stereotactic: {
			type: 'SRS',
			label: 'Frameless intracranial SRS',
			translationTolerance: 0.5,
			rotationTolerance: 0.25,
			immobilization: 'Frameless thermoplastic mask'
		},
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'High-precision cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid cranial fixation capable of stereotactic reproducibility.',
				'Use an indexed occipital support and confirm neutral head position.',
				'Verify the fixation is fully secured before 6DOF imaging and couch rotation.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '6 × 6 cm',
			mlcAperture: '5 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'Arc 1 · Coplanar',
				mode: 'VMAT',
				mu: 865,
				doseRate: 1200,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 0.4, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.6, mlcAperture: 4.8, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.8, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1000 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'Arc 2 · Couch +45°',
				mode: 'VMAT',
				mu: 515,
				doseRate: 1200,
				arc: { start: 300, stop: 60, direction: 'CCW', fullArc: false },
				geometry: {
					gantry: '300°',
					collimator: '330°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '45°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 },
					{ muFraction: 0.25, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 0.5, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.75, mlcAperture: 4.6, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 }
				]
			},
			{
				name: 'Arc 3 · Couch −45°',
				mode: 'VMAT',
				mu: 502,
				doseRate: 1200,
				arc: { start: 60, stop: 300, direction: 'CW', fullArc: false },
				geometry: {
					gantry: '60°',
					collimator: '30°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '315°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 },
					{ muFraction: 0.25, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1000 },
					{ muFraction: 0.5, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.75, mlcAperture: 4.4, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 }
				]
			}
		]
	},
	{
		patient: 'Anthony Brooks',
		mrn: 'AU-24631',
		siteLabel: 'Right Upper Lobe Lung SBRT',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'SBRT · Respiratory-Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '1 / 5',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction in a five-fraction course',
			igrtHandling: 'not-assessed'
		},
		note: 'SBRT workflow: complete 4D respiratory characterization, high-precision 6DOF CBCT, arc clearance dry run, SBRT timeout, and gated dual-arc VMAT delivery.',
		stereotactic: {
			type: 'SBRT',
			label: 'Peripheral lung SBRT · 50 Gy / 5 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'Indexed vacuum immobilization'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung SBRT',
			period: 4.2,
			siExcursion: 12,
			apExcursion: 5,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Indexed arms-up thoracic SBRT immobilization.',
			instructions: [
				'Elevate both arms in a reproducible overhead support.',
				'Use a moldable indexed vacuum cradle around the thorax/upper abdomen.',
				'Confirm the respiratory monitoring region is unobstructed and the body is centered.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '8 × 8 cm',
			mlcAperture: '6 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1460,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.15, mlcAperture: 5.2, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 0.3, mlcAperture: 4.4, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.5, mlcAperture: 3.8, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.6, mlcShape: 'Conformal', doseRate: 1250 },
					{ muFraction: 0.85, mlcAperture: 5.3, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1435,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.15, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1150 },
					{ muFraction: 0.3, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.5, mlcAperture: 3.6, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 0.85, mlcAperture: 5.1, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'Rachel Morgan',
		mrn: 'AU-24710',
		siteLabel: 'Left Breast + Supraclavicular',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.68,
		setupBodyX: 0.1,
		technique: '3-Field Breast · SCV + Tangent Matchline',
		energy: '6 MV',
		fraction: '9 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment with matched supraclavicular and tangent fields'
		},
		note: 'Verify the supraclavicular-to-tangent junction before treating. The simulator uses a simplified half-beam matchline exercise to teach gap/overlap recognition.',
		specialSetup: {
			type: 'BREAST_MATCH',
			label: 'SCV / tangent matchline',
			toleranceMm: 1,
			matchTechnique: 'Half-beam field-edge match'
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast/nodal setup with bilateral arm elevation.',
			instructions: [
				'Use an indexed inclined support appropriate for breast and nodal treatment.',
				'Elevate both arms with the dedicated bilateral support.',
				'Confirm the head is turned away from the treated side and the SCV/tangent junction is reproducible.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 16 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Supraclavicular AP',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Supraclavicular / low neck',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 16 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '0°'
				}
			},
			{
				name: 'Medial Tangent',
				mu: 174,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couch: '0 / +2 / 0 mm',
					couchAngle: '355°'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 181,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couch: '0 / +2 / 0 mm',
					couchAngle: '5°'
				}
			}
		]
	},
	{
		patient: 'Evan Cole',
		mrn: 'AU-24724',
		siteLabel: 'Craniospinal Axis',
		siteKey: 'spine',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		setupBodyX: 0,
		technique: 'Total Craniospinal Irradiation · Matched Fields',
		energy: '6 MV',
		fraction: '5 / 13',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment across cranial and spinal treatment regions'
		},
		note: 'Verify cranial and spinal indexing plus both field junctions before delivery. The lateral cranial fields use plan-specific couch/collimator kicks to account for divergence at the PA-spine junction.',
		specialSetup: {
			type: 'CSI',
			label: 'Craniospinal multi-isocenter junctions',
			toleranceMm: 1,
			junctionA: 'Cranial / Upper Spine',
			junctionB: 'Upper / Lower Spine'
		},
		immobilization: {
			required: ['hnMask', 'headrest'],
			orderSummary: 'Cranial fixation with reproducible head/shoulder position for CSI.',
			instructions: [
				'Use rigid fixation covering the cranium and upper shoulder region.',
				'Use an indexed occipital support to reproduce head position.',
				'Keep the body straight with arms at the sides before verifying cranial/spine junctions.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '20 × 20 cm',
			mlcAperture: '18 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Cranial Right Lateral',
				station: 'Cranial',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Cranial contents / cervical junction',
				geometry: {
					gantry: '270°',
					collimator: '5°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '355°'
				}
			},
			{
				name: 'Cranial Left Lateral',
				station: 'Cranial',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Cranial contents / cervical junction',
				geometry: {
					gantry: '90°',
					collimator: '355°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '5°'
				}
			},
			{
				name: 'Upper Spine PA',
				station: 'Upper Spine',
				mu: 146,
				doseRate: 600,
				targetRegion: 'Upper spinal canal',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / +6 / 0 mm',
					couchAngle: '0°'
				}
			},
			{
				name: 'Lower Spine PA',
				station: 'Lower Spine',
				mu: 152,
				doseRate: 600,
				targetRegion: 'Lower spinal canal',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / +12 / 0 mm',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Patricia Moore',
		mrn: 'AU-24739',
		siteLabel: 'Left Chest Wall Scar · Electron',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.45,
		setupBodyX: 0.12,
		technique: 'Custom Electron Cutout',
		energy: '9 MeV electrons',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: 'Single electron treatment field'
		},
		note: 'Create and verify the custom cutout before treatment. The electron applicator/cutout defines the final field; MLC verification is not used for this electron beam.',
		specialSetup: {
			type: 'ELECTRON',
			label: 'Electron cutout creation & fabrication',
			shape: 'Oval',
			widthCm: 6,
			heightCm: 4,
			cone: '10 × 10 cm',
			ssdCm: 100,
			bolusThicknessCm: 0.5
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Breast-treatment position retained for the electron scar field.',
			instructions: [
				'Use an indexed inclined support matching the breast-treatment posture.',
				'Elevate both arms with the bilateral support.',
				'Center the chest-wall scar beneath the electron central ray before accessory and bolus setup.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: '9 MeV Electron · Custom Cutout',
				electron: true,
				mu: 205,
				doseRate: 400,
				targetRegion: 'Left chest-wall scar',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square',
					couch: '0 / 0 / 0 mm',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Noah Patel',
		mrn: 'AU-24782',
		siteLabel: 'Bladder Adaptive RT',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Adaptive RT · Bladder Plan-of-the-Day',
		energy: '6 MV',
		fraction: '8 / 20',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Adaptive multi-field photon treatment delivery after daily anatomy review'
		},
		note: 'Assess the daily pelvic anatomy, select the correct adaptive bladder plan, and approve the adapted treatment before beam enable.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary: 'Supine pelvic adaptive setup with reproducible lower-extremity position.',
			instructions: [
				'Support the knees symmetrically to reduce pelvic rotation.',
				'Use paired distal-foot positioning to reproduce leg alignment.',
				'Confirm the pelvis is neutral before daily CBCT and adaptive-plan selection.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '12 × 12 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		adaptive: {
			label: 'Daily bladder plan selection',
			defaultPlanKey: 'medium',
			course: {
				prescriptionGy: 55,
				totalFractions: 20,
				dosePerFractionGy: 2.75,
				rectumTeachingReferenceGy: 24,
				bowelTeachingReferenceGy: 15,
				seedHistory: [
					{ fx: 1, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 2, scenarioIndex: 0, planKey: 'small' },
					{ fx: 3, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 4, scenarioIndex: 2, planKey: 'large' },
					{ fx: 5, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 6, scenarioIndex: 0, planKey: 'small' },
					{ fx: 7, scenarioIndex: 1, planKey: 'medium' }
				]
			},
			scenarios: [
				{
					title: 'Daily CBCT: small bladder / fuller rectum',
					summary:
						'The bladder is underfilled and the posterior contour sits closer to the high-dose region than on the reference plan.',
					findings: [
						'Reduced bladder filling compared with simulation.',
						'Posterior bladder wall lies closer to the rectum.',
						'Small-volume target envelope best reproduces today’s anatomy.'
					],
					recommendedPlan: 'small'
				},
				{
					title: 'Daily CBCT: medium bladder / expected anatomy',
					summary:
						'Today’s bladder and rectal filling are close to the reference simulation dataset.',
					findings: [
						'Bladder volume approximates the simulation scan.',
						'Target/OAR relationship is near baseline.',
						'The reference-size plan should provide the most balanced coverage.'
					],
					recommendedPlan: 'medium'
				},
				{
					title: 'Daily CBCT: large bladder / bowel displaced superiorly',
					summary:
						'The bladder is more distended than at simulation and a larger anterior-superior target envelope is needed.',
					findings: [
						'Increased bladder filling with superior/anterior expansion.',
						'Small bowel is displaced superiorly.',
						'Largest treatment envelope best matches the current target shape.'
					],
					recommendedPlan: 'large'
				}
			],
			plans: {
				small: {
					title: 'Small bladder plan',
					summary: 'Tighter target envelope for underfilled bladder anatomy.',
					metrics: [
						'Smaller target envelope',
						'Lower normal-tissue exposure when anatomy is small',
						'May under-cover a distended bladder'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '10 × 10 cm',
						mlcAperture: '10 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 102,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 94,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 94,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				},
				medium: {
					title: 'Medium bladder plan',
					summary: 'Reference adaptive plan matching simulation-sized bladder.',
					metrics: [
						'Reference-size target envelope',
						'Balanced bowel/rectum exposure',
						'Best when anatomy approximates simulation'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '12 × 12 cm',
						mlcAperture: '12 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 116,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 100,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 100,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				},
				large: {
					title: 'Large bladder plan',
					summary: 'Expanded target envelope for a distended bladder.',
					metrics: [
						'Expanded target envelope',
						'Protects coverage when bladder is distended',
						'Can increase OAR exposure when anatomy is small'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '14 × 14 cm',
						mlcAperture: '14 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 124,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 116,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				}
			}
		},
		fields: [
			{
				name: 'AP',
				mu: 116,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 108,
				doseRate: 600,
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 100,
				doseRate: 600,
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 100,
				doseRate: 600,
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Daniel Cho',
		mrn: 'AU-24801',
		siteLabel: 'Left Frontal Glioblastoma',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.84,
		technique: 'Primary Brain 3-Field',
		energy: '6 MV',
		fraction: '14 / 30',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field photon treatment delivery to a primary brain tumor'
		},
		note: 'Primary brain treatment. Reproduce the thermoplastic mask setup, confirm field identity, and verify conventional multi-field brain geometry before beam enable.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid fixation that conforms around the cranium and face.',
				'Use an indexed support beneath the occiput to reproduce neutral head position.',
				'Confirm HFS orientation and that the fixation is locked to the tabletop index.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '16 × 18 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 154,
				doseRate: 600,
				targetRegion: 'Left frontal lobe / whole target envelope',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 148,
				doseRate: 600,
				targetRegion: 'Left frontal lobe / whole target envelope',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'AP Boost',
				mu: 96,
				doseRate: 600,
				targetRegion: 'Left frontal boost volume',
				geometry: {
					gantry: '0°',
					collimator: '90°',
					jaws: '10 × 12 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Marcus Lee',
		mrn: 'AU-24812',
		siteLabel: 'Oropharynx + Bilateral Neck',
		siteKey: 'hneck',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.72,
		technique: 'Head & Neck Multi-Field',
		energy: '6 MV',
		fraction: '18 / 35',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field photon treatment delivery to the head and neck'
		},
		note: 'Use a head-and-shoulder mask with indexed shoulder pull-downs. Verify the AP low-neck field and the opposed upper-neck laterals before treatment.',
		immobilization: {
			required: ['hnMask', 'headrest', 'shoulderPull'],
			orderSummary: 'Rigid head-and-shoulder fixation with reproducible shoulder depression.',
			instructions: [
				'Use rigid fixation extending from the cranium through the shoulders.',
				'Use an indexed occipital support to reproduce neck extension.',
				'Add the device that maintains inferior shoulder position and verify bilateral symmetry.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 18 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP Low Neck',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Lower cervical lymphatics',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 18 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral Upper Neck',
				mu: 136,
				doseRate: 600,
				targetRegion: 'Primary site / upper neck',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral Upper Neck',
				mu: 136,
				doseRate: 600,
				targetRegion: 'Primary site / upper neck',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Helen Garcia',
		mrn: 'AU-24820',
		siteLabel: 'Mid-Thoracic Esophagus',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.42,
		technique: 'Thorax Multi-Field 3DCRT',
		energy: '10 MV',
		fraction: '11 / 28',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field thoracic photon treatment delivery'
		},
		note: 'Conventional thoracic case intended to contrast with IMRT/VMAT. Verify the AP/PA fields and weighted oblique fields for an esophageal target.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed posterior support.',
			instructions: [
				'Elevate both arms using a support that keeps elbows and hands reproducible.',
				'Add a moldable indexed posterior cradle for the upper torso.',
				'Keep the thorax centered and shoulders symmetric before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '12 × 18 cm',
			mlcAperture: '11 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 88,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '12 × 18 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 96,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '12 × 18 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'RPO',
				mu: 74,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '140°',
					collimator: '0°',
					jaws: '11 × 16 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'LPO',
				mu: 74,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '220°',
					collimator: '0°',
					jaws: '11 × 16 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Dana Collins',
		mrn: 'AU-24831',
		siteLabel: 'Right Breast IMRT',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: 'Breast IMRT · Fixed-Field',
		energy: '6 MV',
		fraction: '10 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter modulated photon delivery to the breast'
		},
		note: 'Breast IMRT case. Use the breast board setup, verify the fixed-field start geometry, then observe step-and-shoot IMRT leaf shaping through the beam delivery sequence.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast setup with both arms elevated and reproducibly supported.',
			instructions: [
				'Use an indexed inclined support appropriate for breast treatment.',
				'Elevate both arms with the dedicated bilateral arm support.',
				'Rotate the head slightly away from the treated side and reproduce board index/angle.'
			]
		},
		planned: {
			gantry: '300°',
			collimator: '15°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 128,
				doseRate: 600,
				geometry: {
					gantry: '300°',
					collimator: '15°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 16.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.33, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.66, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 16.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 2',
				mode: 'IMRT',
				mu: 122,
				doseRate: 600,
				geometry: {
					gantry: '315°',
					collimator: '10°',
					jaws: '18 × 18 cm',
					mlcAperture: '15 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.35, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.7, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 3',
				mode: 'IMRT',
				mu: 118,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '345°',
					jaws: '18 × 18 cm',
					mlcAperture: '15 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.34, mlcAperture: 11.8, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 0.67, mlcAperture: 10.2, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			},
			{
				name: 'IMRT Field 4',
				mode: 'IMRT',
				mu: 114,
				doseRate: 600,
				geometry: {
					gantry: '135°',
					collimator: '350°',
					jaws: '18 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.33, mlcAperture: 10.8, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.66, mlcAperture: 9.6, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			}
		]
	},
	{
		patient: 'Maria Santos',
		mrn: 'AU-24845',
		siteLabel: 'Pancreas',
		siteKey: 'abdomen',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.02,
		technique: 'Abdomen 4-Field Box',
		energy: '10 MV',
		fraction: '9 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field abdominal photon treatment delivery'
		},
		note: 'Abdominal multi-field case. Verify the 4-field box geometry and ensure the selected field is directed to the upper abdominal target volume.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary:
				'Supine upper-abdominal immobilization with posterior molding and knee support.',
			instructions: [
				'Use a moldable indexed cradle beneath the torso to limit rotation.',
				'Support the knees to reduce lumbar strain and improve reproducibility.',
				'Keep arms out of the treatment field and verify midline alignment.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 14 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 102,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 94,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 94,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'James Foster',
		mrn: 'AU-24856',
		siteLabel: 'Rectum · Prone Belly Board',
		siteKey: 'pelvis',
		position: 'HFP',
		positionLabel: 'Head-First Prone',
		setupSiteZ: 0.18,
		technique: 'Pelvis Multi-Field Prone',
		energy: '10 MV',
		fraction: '8 / 28',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Prone multi-field pelvic photon treatment delivery'
		},
		note: 'Prone pelvic case. The learner should recognize the belly-board setup and verify the prone field arrangement before beam enable.',
		immobilization: {
			required: ['bellyBoard'],
			orderSummary:
				'Prone pelvic setup using a board designed to displace bowel away from the pelvis.',
			instructions: [
				'Position the patient prone on the board with the abdominal/pelvic opening centered correctly.',
				'Confirm the pelvis is level and the lower abdomen can fall into the opening without pressure points.',
				'Index the board before confirming field geometry.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '0°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'PA',
				mu: 124,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 98,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 16 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 98,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 16 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Olivia Chen',
		mrn: 'AU-24867',
		siteLabel: 'Thoracic Spine',
		siteKey: 'spine',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.24,
		technique: 'Skeletal Spine Multi-Field',
		energy: '10 MV',
		fraction: '4 / 10',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field spine photon treatment delivery'
		},
		note: 'Thoracic spine palliation case. Verify the selected field direction and ensure the beam is centered on the thoracic vertebral target rather than a generic torso region.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary: 'Supine thoracic-spine setup with indexed posterior support and knee support.',
			instructions: [
				'Use a moldable indexed posterior support to reduce thoracic rotation.',
				'Support the knees for comfort and reproducibility while keeping the spine neutral.',
				'Verify the thoracic target remains centered after immobilization is secured.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '0°',
			jaws: '10 × 18 cm',
			mlcAperture: '9 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'PA',
				mu: 110,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '10 × 18 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 78,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '270°',
					collimator: '90°',
					jaws: '10 × 14 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 78,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '90°',
					collimator: '90°',
					jaws: '10 × 14 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Laura Bennett',
		mrn: 'AU-24644',
		siteLabel: 'Left Breast DIBH',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: '3DCRT Tangents · DIBH',
		energy: '6 MV',
		fraction: '6 / 20',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment with active DIBH motion management'
		},
		note: 'Verify reproducible deep-inspiration breath hold before treating the left-breast tangents. Beam delivery must remain inside the approved DIBH level.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast DIBH setup with bilateral arm elevation.',
			instructions: [
				'Use an indexed inclined support appropriate for breast treatment.',
				'Elevate both arms with the dedicated bilateral support.',
				'Confirm the respiratory monitoring surface remains visible and head position is reproducible.'
			]
		},
		planned: {
			gantry: '300°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		motionManagement: {
			type: 'DIBH',
			label: 'Deep Inspiration Breath Hold',
			period: 4.8,
			dibhTarget: 80,
			dibhTolerance: 5,
			practiceHolds: 3
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 168,
				doseRate: 600,
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 171,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	// ===== Rad Onc EMR Patient Library (integrated daily-treatment charts) =====
	{
		patient: 'John Smith',
		mrn: 'AU-24901',
		siteLabel: 'Glioblastoma (Post-op Tumor Bed)',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '11 / 30',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the post-operative brain'
		},
		note: 'EMR chart · Dr. Evelyn Reed · chart MRN 44556. Adjuvant GBM with concurrent temozolomide. Verify Aquaplast mask fixation and daily CBCT to skull anatomy before each arc.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid thermoplastic cranial fixation with indexed occipital support.',
			instructions: [
				'Seat the patient supine with the head neutral in the Aquaplast mask, arms down.',
				'Reproduce the indexed headrest and align to lateral / sagittal lasers on the anterior and lateral tattoos.',
				'Confirm mask lock before daily CBCT to skull anatomy.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '0°',
			jaws: '15 × 15 cm',
			mlcAperture: '13 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 305,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '0°',
					jaws: '15 × 15 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 420 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 298,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '0°',
					jaws: '15 × 15 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			}
		]
	},
	{
		patient: 'Maria Garcia',
		mrn: 'AU-24902',
		siteLabel: 'Whole Brain (Brain Metastases)',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		technique: 'Opposed Lateral 3DCRT',
		energy: '6 MV',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D opposed photon treatment delivery to the whole brain'
		},
		note: 'EMR chart · Dr. Samuel Green · chart MRN 11223. Palliative WBRT for multiple NSCLC brain metastases (patient on pembrolizumab). Daily kV/MV field verification to skull.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Thermoplastic cranial fixation with indexed occipital support.',
			instructions: [
				'Position supine with the head neutral in the thermoplastic mask, arms down.',
				'Align to lateral / sagittal lasers using the simulation skin marks.',
				'Confirm the head is straight and centered before lateral imaging.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 158,
				doseRate: 600,
				targetRegion: 'Whole brain',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 158,
				doseRate: 600,
				targetRegion: 'Whole brain',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Sarah Chen',
		mrn: 'AU-24903',
		siteLabel: 'Left Tonsil + Bilateral Neck',
		siteKey: 'hneck',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.72,
		technique: 'IMRT · Simultaneous Integrated Boost',
		energy: '6 MV',
		fraction: '20 / 35',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery with simultaneous integrated boost'
		},
		note: 'EMR chart · Dr. James Miller · chart MRN 77889. HPV+ SCC left tonsil, SIB to 70/63/56 Gy with concurrent cisplatin. Head-and-shoulder mask; daily kV/CBCT before delivery.',
		immobilization: {
			required: ['hnMask', 'headrest', 'shoulderPull'],
			orderSummary: 'Rigid head-and-shoulder mask with indexed occipital support.',
			instructions: [
				'Position supine, head first, arms down, in the head-and-shoulder thermoplastic mask.',
				'Reproduce the indexed headrest and align to the mask tattoos (anterior, lateral R/L).',
				'Confirm bilateral shoulder symmetry before daily kV/CBCT.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 20 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 168,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 20 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.33, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.66, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 2',
				mode: 'IMRT',
				mu: 154,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '15 × 18 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.35, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 0.7, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 3',
				mode: 'IMRT',
				mu: 150,
				doseRate: 600,
				geometry: {
					gantry: '240°',
					collimator: '0°',
					jaws: '15 × 18 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.34, mlcAperture: 9.8, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.67, mlcAperture: 7.8, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			}
		]
	},
	{
		patient: 'Robert Miller',
		mrn: 'AU-24904',
		siteLabel: 'Right Upper Lobe Lung SBRT',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.45,
		technique: 'SBRT · Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '2 / 3',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction (three-fraction course)'
		},
		note: 'EMR chart · Dr. Evelyn Reed · chart MRN 99001. Medically inoperable Stage IA NSCLC, 54 Gy / 3 fx every other day. Daily CBCT ± 4D / respiratory gating.',
		stereotactic: {
			type: 'SBRT',
			label: 'Peripheral lung SBRT · 54 Gy / 3 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'BodyFix / Vac-Lok with abdominal compression'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung SBRT',
			period: 4.2,
			siExcursion: 12,
			apExcursion: 5,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary:
				'Arms-up thoracic SBRT immobilization with indexed vacuum bag and optional abdominal compression.',
			instructions: [
				'Elevate both arms overhead on the wing board with the BodyFix / Vac-Lok bag.',
				'Apply abdominal compression if used at simulation and reproduce the index.',
				'Confirm the respiratory surrogate is unobstructed before daily CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '8 × 8 cm',
			mlcAperture: '6 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1520,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.45, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.8, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1495,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 4.9, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.45, mlcAperture: 4.0, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.7, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'David Garcia',
		mrn: 'AU-24905',
		siteLabel: 'Right Lower Lobe Lung (3DCRT)',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.42,
		technique: 'Multi-Field 3DCRT',
		energy: '6 MV',
		fraction: '15 / 33',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field thoracic photon treatment delivery'
		},
		note: 'EMR chart · Dr. Sarah Jenkins · chart MRN 55667. RLL NSCLC with involved hilar / mediastinal nodes, 66 Gy / 33 with concurrent carbo/taxol. AP/PA plus obliques; daily CBCT or kV pair.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the BodyFix vacuum bag.',
				'Align to lateral / sagittal lasers on the anterior and lateral tattoos.',
				'Keep the thorax centered and shoulders symmetric before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 92,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 104,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'RPO',
				mu: 78,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '140°',
					collimator: '0°',
					jaws: '12 × 15 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'LPO',
				mu: 70,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '220°',
					collimator: '0°',
					jaws: '12 × 15 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Linda Jones',
		mrn: 'AU-24906',
		siteLabel: 'Left Hilum NSCLC (VMAT)',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.44,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '12 / 30',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the thorax'
		},
		note: 'EMR chart · Dr. Sarah Jenkins · chart MRN 33445. Stage IIIA SCC left hilum / mediastinum, 60 Gy high / 50 Gy elective with concurrent carbo/taxol. Daily kV/CBCT.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the vacuum bag.',
				'Center the thorax without shoulder rotation and reproduce the index.',
				'Confirm setup to tattoos before daily kV/CBCT.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 352,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 338,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			}
		]
	},
	{
		patient: 'Mary Peterson',
		mrn: 'AU-24907',
		siteLabel: 'Right Breast · Tangents',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: '3DCRT Opposed Tangents',
		energy: '6 MV',
		fraction: '8 / 16',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment delivery to the whole breast'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 66778. Adjuvant hypofractionated whole-breast RT (42.56 Gy / 16) post-lumpectomy. Daily kV/MV pair to chest wall / ribs.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast-board setup with both arms elevated.',
			instructions: [
				'Position supine on the breast board with both arms elevated in the arm support.',
				'Turn the head away from the treated right side and align to lateral / sagittal lasers.',
				'Reproduce the board angle / index using the central sternum and mid-axillary tattoos.'
			]
		},
		planned: {
			gantry: '60°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 172,
				doseRate: 600,
				targetRegion: 'Right whole breast',
				geometry: {
					gantry: '60°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 176,
				doseRate: 600,
				targetRegion: 'Right whole breast',
				geometry: {
					gantry: '240°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Barbara Davis',
		mrn: 'AU-24908',
		siteLabel: 'Left Breast + Supraclavicular',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.68,
		setupBodyX: 0.1,
		technique: '3-Field Breast · SCV + Tangents',
		energy: '6 MV',
		fraction: '14 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment with matched supraclavicular and tangent fields'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 11223. HER2+ IDC left breast, 50 Gy + 10 Gy boost with nodal SCV field. Verify SCV / tangent matchline before treating.',
		specialSetup: {
			type: 'BREAST_MATCH',
			label: 'SCV / tangent matchline',
			toleranceMm: 1,
			matchTechnique: 'Half-beam field-edge match'
		},
		immobilization: {
			required: ['wingBoard', 'armSupport'],
			orderSummary: 'Inclined breast / nodal setup with bilateral arm elevation.',
			instructions: [
				'Position supine on the wing board with both arms elevated and the head turned slightly right.',
				'Align to the sternal notch, mid-axillary, and SCV-border tattoos.',
				'Confirm the supraclavicular-to-tangent junction is reproducible before treatment.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 16 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Supraclavicular AP',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Left supraclavicular / low neck',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 16 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				}
			},
			{
				name: 'Medial Tangent',
				mu: 178,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couchAngle: '355°'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 184,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couchAngle: '5°'
				}
			}
		]
	},
	{
		patient: 'Anna Bellwether',
		mrn: 'AU-24909',
		siteLabel: 'Right Breast Boost · Electron',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: 'Custom Electron Cutout',
		energy: '9 MeV electrons',
		fraction: '3 / 5',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: 'Single electron treatment field to the lumpectomy cavity'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 55443. Lumpectomy-cavity boost following whole-breast RT. Create and verify the cutout; match to cavity clips / chest wall.',
		specialSetup: {
			type: 'ELECTRON',
			label: 'Electron cutout creation & fabrication',
			shape: 'Oval',
			widthCm: 6,
			heightCm: 5,
			cone: '10 × 10 cm',
			ssdCm: 100,
			bolusThicknessCm: 0.5
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Breast-board position retained from whole-breast RT for the electron boost.',
			instructions: [
				'Reproduce the original breast-board setup and arm support.',
				'Align to the original central-sternum and mid-axillary tattoos.',
				'Center the lumpectomy cavity beneath the electron central ray before cone / cutout setup.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: '9 MeV Electron · Custom Cutout',
				electron: true,
				mu: 210,
				doseRate: 400,
				targetRegion: 'Right lumpectomy cavity',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Susan Miller',
		mrn: 'AU-24910',
		siteLabel: 'Left Breast · Prone Setup',
		siteKey: 'breast',
		position: 'HFP',
		positionLabel: 'Head-First Prone',
		setupSiteZ: -0.48,
		setupBodyX: 0.1,
		technique: '3DCRT Tangents · Prone',
		energy: '6 MV',
		fraction: '9 / 16',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment delivery to the whole breast in the prone position'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 88776. DCIS w/ microinvasion, hypofractionated prone whole-breast RT (42.56 Gy / 16). Recognize the prone breast-board setup before verifying tangents.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary:
				'Prone breast-board setup with the treated breast dependent through the board aperture.',
			instructions: [
				'Position the patient prone on the breast board with the left breast falling through the aperture.',
				'Reproduce arm and head position and confirm the board index.',
				'Verify the prone tangent arrangement before imaging.'
			]
		},
		planned: {
			gantry: '130°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 170,
				doseRate: 600,
				targetRegion: 'Left whole breast (prone)',
				geometry: {
					gantry: '130°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 174,
				doseRate: 600,
				targetRegion: 'Left whole breast (prone)',
				geometry: {
					gantry: '310°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'David Garcia',
		mrn: 'AU-24911',
		siteLabel: 'Pancreas Head SBRT',
		siteKey: 'abdomen',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.02,
		technique: 'SBRT · Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '3 / 5',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction (five-fraction course)'
		},
		note: 'EMR chart · Dr. Robert Evans · chart MRN 22334. Borderline-resectable pancreatic head adenocarcinoma s/p FOLFIRINOX, neoadjuvant SBRT 33 Gy / 5. Daily volumetric CBCT required.',
		stereotactic: {
			type: 'SBRT',
			label: 'Pancreas SBRT · 33 Gy / 5 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'Indexed vacuum immobilization'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated upper abdomen',
			period: 4.6,
			siExcursion: 9,
			apExcursion: 4,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up upper-abdominal SBRT immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the indexed vacuum bag.',
				'Reproduce any prescribed breath-hold or gating surrogate from simulation.',
				'Confirm the upper-abdomen surrogate is unobstructed before daily volumetric CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '10 × 10 cm',
			mlcAperture: '8 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1180,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '10 × 10 cm',
					mlcAperture: '8 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.25, mlcAperture: 6.4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.5, mlcAperture: 5.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.75, mlcAperture: 6.6, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1155,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '10 × 10 cm',
					mlcAperture: '8 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.25, mlcAperture: 6.2, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.5, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.75, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'James Wilson',
		mrn: 'AU-24912',
		siteLabel: 'Prostate + Seminal Vesicles (VMAT)',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: 0.18,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '22 / 44',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the prostate'
		},
		note: 'EMR chart · Dr. Maria Garcia · chart MRN 44556. Gleason 4+3 prostate adenocarcinoma, 79.2 Gy / 44 with ADT. Daily fiducial-based CBCT / kV before each arc.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary:
				'Supine pelvic VMAT setup with reproducible lower-extremity support and bladder/rectal preparation.',
			instructions: [
				'Support both knees symmetrically and use paired foot stocks to reproduce leg rotation.',
				'Confirm the prescribed bladder-filling and rectal-emptying protocol before imaging.',
				'Match to implanted fiducial markers on daily CBCT / kV.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '11 × 11 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 392,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '11 × 11 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 381,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '11 × 11 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 7.2, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 5.8, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 8.2, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			}
		]
	},
	{
		patient: 'Elizabeth Green',
		mrn: 'AU-24913',
		siteLabel: 'Endometrial · Pelvic Nodes (VMAT)',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: 0.18,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '10 / 25',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the pelvis'
		},
		note: 'EMR chart · Dr. Susan Clark · chart MRN 77665. Adjuvant post-op endometrial adenocarcinoma (upper vagina + pelvic nodes), 45 Gy / 25. Daily CBCT; reproduce bladder-filling protocol.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary:
				'Supine pelvic setup with reproducible lower-extremity support and bladder/rectal preparation.',
			instructions: [
				'Support both knees and use paired foot stocks to reproduce leg position.',
				'Confirm the prescribed bladder-filling protocol to displace small bowel.',
				'Confirm rectal preparation before daily CBCT.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '16 × 18 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 368,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 357,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 11.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			}
		]
	}
];

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

export const SETUP_REFINEMENTS = {
	'AU-24031': {
		required: ['vacLok', 'kneeSupport'],
		orderSummary:
			'Supine pelvic setup with indexed Vac-Lok immobilization, knee support, and documented bladder/rectal preparation.',
		positionInstructions: [
			'HFS supine with the pelvis neutral and the lower body molded reproducibly in the Vac-Lok.',
			'Arms positioned comfortably on the chest or outside the treatment field.'
		],
		indexingInstructions: [
			'Reproduce the Vac-Lok index and knee-support/sponge position used at simulation.',
			'Confirm tabletop longitudinal index and pelvic midline before imaging.'
		],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling protocol was completed.',
			'Confirm rectal-emptying / bowel preparation instructions according to the treatment record before image guidance.'
		]
	},
	'AU-24108': {
		required: ['headMask', 'headrest'],
		orderSummary: 'Rigid cranial fixation with indexed occipital support.',
		positionInstructions: [
			'HFS supine with the head straight, centered, and in the simulation position.'
		],
		indexingInstructions: [
			'Reproduce the indexed headrest and mask/baseplate location.',
			'Verify mask fixation before lateral imaging.'
		],
		preparationInstructions: []
	},
	'AU-24214': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Arms-up thoracic immobilization with indexed posterior molding and respiratory-gating access.',
		positionInstructions: [
			'HFS supine with both arms elevated reproducibly above the head.',
			'Center the thorax without shoulder rotation.'
		],
		indexingInstructions: ['Reproduce the wing-board and Vac-Lok indices used at simulation.'],
		preparationInstructions: [
			'Confirm the respiratory monitoring region/surrogate is unobstructed.',
			'Complete the prescribed 4D/gating verification before treatment.'
		]
	},
	'AU-24362': {
		required: ['vacLok', 'legPositioner'],
		orderSummary:
			'Feet-first unilateral extremity setup with individualized leg molding and ankle/foot rotation control.',
		positionInstructions: [
			'FFS with the treated left femur centered and the opposite leg displaced outside the treatment field.',
			'Reproduce the documented left-leg rotation rather than forcing bilateral symmetry.'
		],
		indexingInstructions: [
			'Reproduce the Vac-Lok index and the dedicated ankle/foot-positioner setting for the treated leg.'
		],
		preparationInstructions: []
	},
	'AU-24519': {
		required: ['kneeSupport', 'footStocks'],
		orderSummary:
			'Supine pelvic VMAT setup with reproducible leg support and bladder/rectal preparation.',
		positionInstructions: ['HFS supine with pelvis neutral and lower extremities symmetric.'],
		indexingInstructions: ['Reproduce knee-support and paired foot-stock indices before CBCT.'],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling protocol.',
			'Confirm rectal preparation/emptying instructions before CBCT.'
		]
	},
	'AU-24602': {
		required: ['srsMask', 'headrest'],
		orderSummary:
			'High-precision stereotactic cranial fixation using a dedicated mask/baseplate and indexed head support.',
		positionInstructions: [
			'HFS supine with neutral stereotactic head position and no unintended rotation.'
		],
		indexingInstructions: [
			'Lock the SRS mask/baseplate and reproduce the indexed headrest position.',
			'Verify fixation before 6DOF imaging and noncoplanar couch motion.'
		],
		preparationInstructions: [
			'Complete high-precision image guidance and the stereotactic timeout before beam delivery.'
		]
	},
	'AU-24631': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Indexed arms-up thoracic SBRT immobilization with respiratory-management access.',
		positionInstructions: ['HFS supine with both arms elevated and thorax centered.'],
		indexingInstructions: ['Reproduce the wing-board and upper-body Vac-Lok indices.'],
		preparationInstructions: [
			'Confirm respiratory monitoring equipment can observe the prescribed region.',
			'Complete 4D motion verification before the SBRT timeout.'
		]
	},
	'AU-24710': {
		required: ['breastBoard', 'armSupport'],
		orderSummary:
			'Indexed inclined breast/nodal setup with bilateral arm elevation and reproducible head/chin position.',
		positionInstructions: [
			'HFS on the prescribed breast-board angle with both arms elevated.',
			'Turn the head away from the treated left side and reproduce chin position.'
		],
		indexingInstructions: [
			'Reproduce breast-board angle/index and bilateral arm-support index.',
			'Confirm lateral body alignment and the SCV/tangent junction reference.'
		],
		preparationInstructions: ['Review the field-junction / matchline setup before nodal treatment.']
	},
	'AU-24724': {
		required: ['hnMask', 'headrest', 'vacLok'],
		orderSummary:
			'Craniospinal setup with cranial fixation plus reproducible whole-body longitudinal alignment.',
		positionInstructions: [
			'HFS supine with head fixed, spine straight, pelvis neutral, and arms at the sides.',
			'Keep the legs straight and aligned with the longitudinal treatment axis.'
		],
		indexingInstructions: [
			'Reproduce headrest/mask indexing and the long-body Vac-Lok index.',
			'Confirm longitudinal station references before cranial/spine junction verification.'
		],
		preparationInstructions: [
			'Review the cranial/upper-spine and upper/lower-spine junction plan before treatment.'
		]
	},
	'AU-24739': {
		required: ['breastBoard', 'armSupport'],
		orderSummary: 'Breast-treatment position retained for the electron chest-wall scar field.',
		positionInstructions: [
			'HFS on the prescribed breast-board angle with both arms elevated.',
			'Reproduce head rotation and chest-wall exposure from simulation.'
		],
		indexingInstructions: ['Reproduce breast-board and arm-support indices.'],
		preparationInstructions: [
			'Center the chest-wall scar beneath the electron central ray.',
			'Complete cone/cutout verification and the separate delivery-stage bolus placement task.'
		]
	},
	'AU-24782': {
		required: ['kneeSupport', 'footStocks'],
		orderSummary:
			'Supine adaptive bladder setup with reproducible lower-extremity position and daily bladder/rectal preparation.',
		positionInstructions: ['HFS supine with pelvis neutral and legs symmetric.'],
		indexingInstructions: ['Reproduce knee-support and foot-stock indices before daily CBCT.'],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling state before imaging.',
			'Confirm rectal/bowel preparation and document deviations that could affect plan-of-day selection.',
			'Use the daily CBCT anatomy—not the setup note alone—to select the adaptive plan.'
		]
	},
	'AU-24801': {
		required: ['headMask', 'headrest'],
		orderSummary: 'Rigid primary-brain fixation with indexed occipital support.',
		positionInstructions: ['HFS supine with the head in the documented simulation position.'],
		indexingInstructions: ['Reproduce headrest and mask/baseplate index.'],
		preparationInstructions: []
	},
	'AU-24812': {
		required: ['hnMask', 'headrest'],
		optional: ['shoulderPull'],
		orderSummary:
			'Head-and-shoulder fixation with plan-specific head/neck position; shoulder depression is used only when documented.',
		positionInstructions: [
			'HFS supine with the head and neck reproduced from simulation rather than assuming universal extension.',
			'Confirm chin position and bilateral shoulder symmetry.'
		],
		indexingInstructions: [
			'Reproduce the indexed headrest and long-mask/baseplate position.',
			'Use the shoulder pull-down only when the setup record specifically prescribes it.'
		],
		preparationInstructions: [
			'Confirm oral cavity/airway accessories, bite block, or other site-specific devices if documented in the treatment record.'
		]
	},
	'AU-24820': {
		required: ['wingBoard', 'vacLok'],
		orderSummary: 'Arms-up conventional thoracic setup with indexed posterior torso support.',
		positionInstructions: [
			'HFS supine with arms above the head and shoulders symmetric.',
			'Center the thorax to the documented esophageal setup marks.'
		],
		indexingInstructions: ['Reproduce wing-board and Vac-Lok indices.'],
		preparationInstructions: []
	},
	'AU-24831': {
		required: ['breastBoard', 'armSupport'],
		orderSummary: 'Indexed inclined right-breast IMRT setup with bilateral arm elevation.',
		positionInstructions: [
			'HFS at the prescribed breast-board angle with both arms elevated.',
			'Turn the head away from the treated right side and reproduce chin position.'
		],
		indexingInstructions: ['Reproduce board angle/index and bilateral arm-support index.'],
		preparationInstructions: [
			'Confirm the breast surface and imaging region are unobstructed before treatment.'
		]
	},
	'AU-24845': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Supine upper-abdominal setup with both arms elevated and indexed posterior torso molding.',
		positionInstructions: [
			'HFS supine with both arms above the head to clear AP/PA and lateral upper-abdominal fields.',
			'Center the torso and avoid rotation.'
		],
		indexingInstructions: ['Reproduce wing-board and Vac-Lok indices.'],
		preparationInstructions: [
			'Confirm any prescribed fasting, contrast, or stomach/bowel preparation documented for the treatment course before imaging.'
		]
	},
	'AU-24856': {
		required: ['bellyBoard', 'armSupport'],
		orderSummary:
			'Prone pelvic belly-board setup with reproducible arm, pelvis, and lower-extremity alignment.',
		positionInstructions: [
			'HFP prone with the lower abdomen centered over the belly-board opening.',
			'Position arms above the head in the prescribed support and keep legs straight/symmetric.'
		],
		indexingInstructions: [
			'Index the belly board and reproduce the arm-support position.',
			'Confirm pelvis level and longitudinal midline before imaging.'
		],
		preparationInstructions: [
			'Confirm bowel/bladder preparation according to the pelvic treatment record.',
			'Check for pressure points and ensure the abdomen can fall freely into the opening.'
		]
	},
	'AU-24867': {
		required: ['wingBoard', 'kneeSupport'],
		orderSummary:
			'Supine thoracic-spine setup with arms elevated out of the lateral treatment fields and reproducible knee support.',
		positionInstructions: [
			'HFS supine with both arms elevated above the head to clear the opposed lateral fields.',
			'Keep the thoracic spine neutral and centered.'
		],
		indexingInstructions: ['Reproduce wing-board and knee-support indices.'],
		preparationInstructions: []
	},
	'AU-24644': {
		required: ['breastBoard', 'armSupport'],
		orderSummary:
			'Inclined left-breast DIBH setup with bilateral arm elevation and reproducible head rotation.',
		positionInstructions: [
			'HFS at the prescribed board angle with both arms elevated.',
			'Turn the head away from the treated left side and reproduce chin position.'
		],
		indexingInstructions: ['Reproduce breast-board angle/index and bilateral arm-support index.'],
		preparationInstructions: [
			'Confirm the surface-guidance / respiratory monitoring region is visible.',
			'Complete the prescribed DIBH reproducibility workflow before beam delivery.'
		]
	}
};

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

export function isFixedElectronField(field = deliveryCasePlan()) {
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

export function updateElectronBolusMesh() {
	if (!S.electronBolusMesh) return;
	const s = activeSpecialSetupSpec();
	const isElectronCase =
		!!S.activeTreatmentCase && String(s?.type || '').toUpperCase() === 'ELECTRON';
	const e = S.specialSetupWorkflow?.electron || {};
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
