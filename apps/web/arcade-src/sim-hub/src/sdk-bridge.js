// @ts-nocheck -- converted in this PR, header removed per-module
/* RTApps (#77 sim-hub modularization, task 9 — final extraction): the RTApps SDK integration
   surface and the CT/QA procedures flow. Verbatim extractions from main.js: the sdk_slug
   fetch-resolvers that prefetch `S.ROOM_APP_URL`/`S.CONSOLE_APP_URL` from
   `window.RTApps.activityUrl` (run as side effects of importing this module — the
   `window.CONSOLE_APP_URL` mirror assignment is preserved byte-for-byte since e2e reads it via
   `frame.evaluate`), `focusCtPatientFromControl` (CT QA control-room camera cut), and the whole
   CT/QA Procedures Lab logic block (`PROC_STATE`/`PROC_SITES` state, `CT_QA_ANIM`,
   `showCtQaDock`/`focusCtQaEquipment`/`qaToast`/`syncCtQaProgress`, the
   `ctQaAnimateStartup`/`ctQaAnimateLaser`/`ctQaAnimateWater`/`runCtQaSequence` sequencer, and the
   CT/QA top-level UI wiring: `genLaser`/`judgeLaser`/`genWater`/`judgeWater`, the site-selection
   handlers, and the `releaseClinical`/`holdClinical` button handlers carrying the
   `__rtappsVerdictLocked` latch and every `RTApps.recordResult` call site). This whole region
   moved as one unit rather than only the individually-named anchors: the code's own "v41/v42/v43"
   section comments already delineate it as a single CT/QA feature, `PROC_STATE`/`PROC_SITES` are
   read/written throughout by the named anchors, and the `__rtappsVerdictLocked`/`recordResult`
   call sites live inside inline `addEventListener` callbacks that can't be split out verbatim
   without the button-click statements they belong to. `focusCtPatientFromControl` gained
   `export` here (advanceNewPatientJourney in ./journey.js calls it). `clearJourneyCameraFollow`/
   `JOURNEY` are owned by ./journey.js and imported back here; `roomById` stays owned by main.js.
   The `document.getElementById('sdClose'/'sdRestart')` staff-dialogue-restart wiring sitting
   between the v42 and v43 sections is unrelated to CT/QA and stayed in main.js. */
import * as THREE from 'three';
import { S } from './state';
import { camera, orbit } from './scene';
import { setClinicalFocus, clearClinicalFocus, flashCtScanner, pulseCtObject } from './equipment';
import { beginTravel } from './walk';
import {
	toast,
	openProcedureLab,
	closeProcedureLab,
	procRefreshRelease,
	procRenderSite,
	procResetAll,
	procSetResult,
	procSetTab,
	updateRoomUI,
	renderRoomList
} from './interact';
import { roomById } from './main';
import { JOURNEY, clearJourneyCameraFollow } from './journey';

// RTApps (plan 4c): prefetch the room app's player URL once; if it can't resolve
// (activity unseeded/unpublished, or offline), ROOM_APP_URL stays null and the three
// wired doors keep their legacy in-hub behavior instead of going dead.
if (window.RTApps) {
	window.RTApps.activityUrl('sim-linac-fraction')
		.then(function (url) {
			S.ROOM_APP_URL = url;
		})
		.catch(function () {});
}
// RTApps (plan 4d): prefetch the console emulator's player URL once; if it can't resolve
// (activity unseeded/unpublished, or offline), CONSOLE_APP_URL stays null and the
// Learning Commons door keeps its legacy in-hub behavior instead of going dead. A
// parallel, independent pair alongside ROOM_APP_URL/ROOM_APP_DOORS (not merged into it) —
// that set's semantics are "leads to sim-linac-fraction" and this leads elsewhere.
window.CONSOLE_APP_URL = null; // also mirrored onto `window` (module scripts don't leak top-level vars there) so e2e can read the prefetch gate via frame.evaluate
if (window.RTApps && window.RTApps.activityUrl) {
	window.RTApps.activityUrl('sim-console')
		.then(function (url) {
			S.CONSOLE_APP_URL = url;
			window.CONSOLE_APP_URL = url;
		})
		.catch(function () {});
}
export function focusCtPatientFromControl() {
	clearJourneyCameraFollow();
	const patient = JOURNEY.ctSimPatient;
	if (!patient || patient.visible === false) return;
	const wp = new THREE.Vector3();
	patient.getWorldPosition(wp);
	camera.position.set(35.55, 1.78, -9.25);
	camera.lookAt(wp.clone().setY(1.25));
	orbit.target.copy(wp.clone().setY(1.25));
	orbit.enabled = false;
	S.activeRoom = roomById('ctcontrol');
	updateRoomUI(S.activeRoom);
	renderRoomList();
	document.getElementById('locText').textContent =
		'CT Control · observing Mia through the simulation-room window';
}
/* ===== v41 · CT / QA Procedures Lab logic ===== */
export const PROC_STATE = {
	startup: false,
	laser: null,
	water: null,
	site: false,
	released: false,
	laserValues: null,
	waterValues: null
};
export const PROC_SITES = {
	hn: {
		prompt:
			'Supine head-and-neck simulation. Choose the immobilization and setup elements that support reproducibility.',
		correct: ['mask', 'headrest']
	},
	breast: {
		prompt: 'Supine breast simulation with arms elevated. Choose the positioning accessories.',
		correct: ['breastboard', 'arms']
	},
	lung: {
		prompt: 'Thoracic simulation where respiratory motion may affect target position.',
		correct: ['wingboard', 'motion']
	},
	abd: {
		prompt:
			'Abdomen / pelvis simulation. Select immobilization and contrast preparation when ordered.',
		correct: ['vacbag', 'contrast']
	},
	prostate: {
		prompt:
			'Supine prostate simulation. Choose leg-positioning / immobilization support and preparation option.',
		correct: ['vacbag', 'legs']
	}
};

/* ===== v42 · contextual CT QA menu and animation helpers ===== */
const CT_QA_ANIM = { running: false, phase: null };
export function showCtQaDock(show = true) {
	const el = document.getElementById('ctQaDock');
	if (!el) return;
	const inCt = S.activeRoom?.id === 'ctsim';
	el.classList.toggle('show', !!show && inCt);
}

function focusCtQaEquipment(ids, note) {
	try {
		setClinicalFocus(ids, note);
		setTimeout(() => {
			if (!JOURNEY?.active) clearClinicalFocus();
		}, 1600);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty -- legacy silent-catch pattern, error intentionally swallowed
	} catch (e) {}
}

function qaToast(msg) {
	try {
		toast(`<b>CT QA</b> · ${msg}`);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty -- legacy silent-catch pattern, error intentionally swallowed
	} catch (e) {}
}
export function syncCtQaProgress() {
	const map = {
		ctQaProgStartup: PROC_STATE.startup ? 'PASS' : 'PENDING',
		ctQaProgLaser:
			PROC_STATE.laser === true ? 'PASS' : PROC_STATE.laser === false ? 'FAIL' : 'PENDING',
		ctQaProgWater:
			PROC_STATE.water === true ? 'PASS' : PROC_STATE.water === false ? 'FAIL' : 'PENDING',
		ctQaProgFinal: PROC_STATE.released ? 'RELEASED' : 'HOLD'
	};
	Object.entries(map).forEach(([id, val]) => {
		const e = document.getElementById(id);
		if (e) e.textContent = val;
	});
}
async function ctQaAnimateStartup() {
	CT_QA_ANIM.running = true;
	CT_QA_ANIM.phase = 'startup';
	qaToast('Running CT morning start-up');
	focusCtQaEquipment(['ct_scanner', 'ct_table', 'ct_lasers'], 'CT morning start-up inspection');
	flashCtScanner(1100);
	procSetTab('startup');
	openProcedureLab('startup');
	const checks = [...document.querySelectorAll('[data-startup]')];
	for (const c of checks) {
		c.checked = true;
		flashCtScanner(420);
		pulseCtObject('#roomCard', 450);
		await new Promise((r) => setTimeout(r, 350));
	}
	document.getElementById('procStartupComplete')?.click();
	syncCtQaProgress();
	CT_QA_ANIM.running = false;
}
async function ctQaAnimateLaser() {
	CT_QA_ANIM.running = true;
	CT_QA_ANIM.phase = 'laser';
	qaToast('Running CT laser QC');
	focusCtQaEquipment(['ct_lasers', 'ct_scanner'], 'Laser-to-imaging-plane QC');
	flashCtScanner(900);
	procSetTab('laser');
	openProcedureLab('laser');
	pulseCtObject('#roomEquipment', 700);
	document.getElementById('laserNew')?.click();
	await new Promise((r) => setTimeout(r, 600));
	const vals = PROC_STATE.laserValues || { lat: 0, vrt: 0, lng: 0 };
	const actual = Math.max(Math.abs(vals.lat), Math.abs(vals.vrt), Math.abs(vals.lng)) <= 2;
	document.getElementById(actual ? 'laserPass' : 'laserHold')?.click();
	syncCtQaProgress();
	CT_QA_ANIM.running = false;
}
async function ctQaAnimateWater() {
	CT_QA_ANIM.running = true;
	CT_QA_ANIM.phase = 'water';
	qaToast('Running CT water phantom QC');
	focusCtQaEquipment(['ct_scanner', 'ct_table'], 'Water phantom image-quality QC');
	flashCtScanner(1200);
	procSetTab('water');
	openProcedureLab('water');
	pulseCtObject('#roomEquipment', 850);
	document.getElementById('waterNew')?.click();
	await new Promise((r) => setTimeout(r, 600));
	const v = PROC_STATE.waterValues || { hu: 0, uniform: 0, noise: 0 };
	const actual = Math.abs(v.hu) <= 5 && Math.abs(v.uniform) <= 5 && Math.abs(v.noise) <= 10;
	document.getElementById(actual ? 'waterPass' : 'waterHold')?.click();
	syncCtQaProgress();
	CT_QA_ANIM.running = false;
}
async function runCtQaSequence() {
	if (S.activeRoom?.id !== 'ctsim') {
		qaToast('Enter the CT Simulation Room first');
		return;
	}
	window.__rtappsVerdictLocked = false; // #73: every QA launch is a new scenario, entitled to one fresh verdict
	const rcBtn = document.getElementById('releaseClinical');
	if (rcBtn) rcBtn.disabled = false;
	const hcBtn = document.getElementById('holdClinical');
	if (hcBtn) hcBtn.disabled = false;
	showCtQaDock(true);
	await ctQaAnimateStartup();
	await new Promise((r) => setTimeout(r, 500));
	await ctQaAnimateLaser();
	await new Promise((r) => setTimeout(r, 500));
	await ctQaAnimateWater();
	await new Promise((r) => setTimeout(r, 500));
	openProcedureLab('release');
	procSetTab('release');
	const all = PROC_STATE.startup && PROC_STATE.laser === true && PROC_STATE.water === true;
	document.getElementById(all ? 'releaseClinical' : 'holdClinical')?.click();
	syncCtQaProgress();
	qaToast(all ? 'CT released for simulation' : 'CT remains on hold');
}
/* ===== v43 · CT/QA top-level UI wiring ===== */
document.getElementById('procedureLabClose')?.addEventListener('click', closeProcedureLab);
document.getElementById('ctQaClose')?.addEventListener('click', () => showCtQaDock(false));
document.getElementById('ctQaLaunch')?.addEventListener('click', runCtQaSequence);
document.getElementById('ctQaQuickStartup')?.addEventListener('click', ctQaAnimateStartup);
document.getElementById('ctQaQuickLaser')?.addEventListener('click', ctQaAnimateLaser);
document.getElementById('ctQaQuickWater')?.addEventListener('click', ctQaAnimateWater);
document.getElementById('ctQaGoRoom')?.addEventListener('click', () => {
	if (S.activeRoom?.id !== 'ctsim' && !S.travel) beginTravel(roomById('ctsim'));
	else showCtQaDock(true);
});

document.getElementById('procedureLab')?.addEventListener('click', (e) => {
	if (e.target?.id === 'procedureLab') closeProcedureLab();
});
document
	.querySelectorAll('#procTabs button')
	.forEach((b) => b.addEventListener('click', () => procSetTab(b.dataset.proc)));

document.getElementById('procStartupComplete')?.addEventListener('click', () => {
	const checks = [...document.querySelectorAll('[data-startup]')];
	const ok = checks.length && checks.every((x) => x.checked);
	PROC_STATE.startup = ok;
	procSetResult(
		'procStartupResult',
		ok
			? '<b>PASS.</b> Required morning start-up items are complete. Proceed to quantitative QC.'
			: '<b>Incomplete.</b> Finish every start-up check before continuing.',
		ok
	);
	if (ok) {
		document.getElementById('startupScanner').textContent = 'READY';
		document.getElementById('startupQC').textContent = 'NEXT';
		document.getElementById('startupPatients').textContent = 'LOCKED';
	}
	procRefreshRelease();
});

function genLaser() {
	const vals = [-2.7, -2.3, -1.8, -1.2, -0.7, 0.4, 0.9, 1.4, 1.9, 2.4];
	const pick = () => vals[Math.floor(Math.random() * vals.length)];
	PROC_STATE.laserValues = { lat: pick(), vrt: pick(), lng: pick() };
	document.getElementById('laserLat').textContent = PROC_STATE.laserValues.lat.toFixed(1) + ' mm';
	document.getElementById('laserVrt').textContent = PROC_STATE.laserValues.vrt.toFixed(1) + ' mm';
	document.getElementById('laserLng').textContent = PROC_STATE.laserValues.lng.toFixed(1) + ' mm';
	PROC_STATE.laser = null;
	procSetResult('laserResult', 'Measurement acquired. Decide PASS or HOLD using ±2.0 mm.', null);
	procRefreshRelease();
}
document.getElementById('laserNew')?.addEventListener('click', genLaser);
function judgeLaser(choice) {
	if (!PROC_STATE.laserValues) {
		procSetResult('laserResult', 'Acquire a measurement first.', false);
		return;
	}
	const actual = Math.max(...Object.values(PROC_STATE.laserValues).map(Math.abs)) <= 2;
	const correct = (choice === 'pass') === actual;
	PROC_STATE.laser = actual;
	procSetResult(
		'laserResult',
		correct
			? actual
				? '<b>Correct: PASS.</b> All axes are within ±2.0 mm.'
				: '<b>Correct: HOLD.</b> At least one axis exceeds the training tolerance.'
			: actual
				? '<b>Reconsider.</b> All axes are within the training tolerance.'
				: '<b>Reconsider.</b> One or more axes exceed ±2.0 mm.',
		correct
	);
	procRefreshRelease();
}
document.getElementById('laserPass')?.addEventListener('click', () => judgeLaser('pass'));
document.getElementById('laserHold')?.addEventListener('click', () => judgeLaser('hold'));

function genWater() {
	const huPool = [-7, -4, -2, 0, 2, 4, 7],
		uPool = [2, 3, 4, 5, 6, 7],
		nPool = [-13, -8, -4, 2, 6, 9, 14];
	const pick = (a) => a[Math.floor(Math.random() * a.length)];
	PROC_STATE.waterValues = { hu: pick(huPool), uniform: pick(uPool), noise: pick(nPool) };
	document.getElementById('waterHU').textContent = PROC_STATE.waterValues.hu + ' HU';
	document.getElementById('waterUniform').textContent = PROC_STATE.waterValues.uniform + ' HU';
	document.getElementById('waterNoise').textContent =
		(PROC_STATE.waterValues.noise > 0 ? '+' : '') + PROC_STATE.waterValues.noise + '%';
	PROC_STATE.water = null;
	procSetResult(
		'waterResult',
		'Phantom acquired. Decide PASS or HOLD using the displayed training criteria.',
		null
	);
	procRefreshRelease();
}
document.getElementById('waterNew')?.addEventListener('click', genWater);
function judgeWater(choice) {
	if (!PROC_STATE.waterValues) {
		procSetResult('waterResult', 'Acquire the phantom first.', false);
		return;
	}
	const v = PROC_STATE.waterValues,
		actual = Math.abs(v.hu) <= 5 && Math.abs(v.uniform) <= 5 && Math.abs(v.noise) <= 10;
	const correct = (choice === 'pass') === actual;
	PROC_STATE.water = actual;
	procSetResult(
		'waterResult',
		correct
			? actual
				? '<b>Correct: PASS.</b> CT number, uniformity, and noise are within the training limits.'
				: '<b>Correct: HOLD.</b> At least one image-quality metric is outside the training limit.'
			: actual
				? '<b>Reconsider.</b> All displayed values are within the training limits.'
				: '<b>Reconsider.</b> At least one displayed value is outside the training limits.',
		correct
	);
	procRefreshRelease();
}
document.getElementById('waterPass')?.addEventListener('click', () => judgeWater('pass'));
document.getElementById('waterHold')?.addEventListener('click', () => judgeWater('hold'));

document.getElementById('siteCase')?.addEventListener('change', () => {
	PROC_STATE.site = false;
	procRenderSite();
	procRefreshRelease();
});
document.getElementById('siteValidate')?.addEventListener('click', () => {
	const key = document.getElementById('siteCase').value,
		expected = PROC_SITES[key].correct;
	const selected = [...document.querySelectorAll('input[name="siteChoice"]:checked')].map(
		(x) => x.value
	);
	const ok =
		expected.every((x) => selected.includes(x)) && selected.every((x) => expected.includes(x));
	PROC_STATE.site = ok;
	procSetResult(
		'siteResult',
		ok
			? '<b>Correct setup.</b> The selected elements match this training simulation order.'
			: `<b>Not yet.</b> Reconsider the positioning / immobilization / preparation requirements for ${document.getElementById('siteCase').selectedOptions[0].text}.`,
		ok
	);
	procRefreshRelease();
});

document.getElementById('releaseClinical')?.addEventListener('click', () => {
	if (window.__rtappsVerdictLocked) return; // #73: one verdict per scenario
	window.__rtappsVerdictLocked = true; // reset path sets this back to false
	const rcBtn = document.getElementById('releaseClinical');
	if (rcBtn) rcBtn.disabled = true;
	const hcBtn = document.getElementById('holdClinical');
	if (hcBtn) hcBtn.disabled = true;
	const all = PROC_STATE.startup && PROC_STATE.laser === true && PROC_STATE.water === true;
	PROC_STATE.released = all;
	procSetResult(
		'releaseResult',
		all
			? '<b>CT RELEASED.</b> Morning start-up and required QC support clinical use in this simulation. The CT patient workflow may proceed.'
			: '<b>Release denied.</b> Required start-up/QC is incomplete or a QC result is outside tolerance. Keep the scanner on HOLD and escalate.',
		all
	);
	procRefreshRelease();
	if (all) toast('<b>CT Simulator RELEASED</b> · patient scanning available');
	// RTApps (plan 4c): score = QA checks passed (startup, laser, water, released), of 4.
	if (window.RTApps) {
		var released = PROC_STATE.released;
		var qaScore =
			(PROC_STATE.startup ? 1 : 0) +
			(PROC_STATE.laser === true ? 1 : 0) +
			(PROC_STATE.water === true ? 1 : 0) +
			(released ? 1 : 0);
		window.RTApps.recordResult('sim-hub-qa', { score: qaScore }).catch(function () {});
	}
});
document.getElementById('holdClinical')?.addEventListener('click', () => {
	if (window.__rtappsVerdictLocked) return; // #73: one verdict per scenario
	window.__rtappsVerdictLocked = true; // reset path sets this back to false
	const rcBtn = document.getElementById('releaseClinical');
	if (rcBtn) rcBtn.disabled = true;
	const hcBtn = document.getElementById('holdClinical');
	if (hcBtn) hcBtn.disabled = true;
	PROC_STATE.released = false;
	procSetResult(
		'releaseResult',
		'<b>CT ON HOLD.</b> Clinical scanning is suspended pending review / corrective action.',
		true
	);
	procRefreshRelease();
	toast('<b>CT Simulator HOLD</b> · QC review required');
	// RTApps (plan 4c): score = QA checks passed (startup, laser, water, released), of 4.
	if (window.RTApps) {
		var released = PROC_STATE.released;
		var qaScore =
			(PROC_STATE.startup ? 1 : 0) +
			(PROC_STATE.laser === true ? 1 : 0) +
			(PROC_STATE.water === true ? 1 : 0) +
			(released ? 1 : 0);
		window.RTApps.recordResult('sim-hub-qa', { score: qaScore }).catch(function () {});
	}
});
document.getElementById('resetProcedures')?.addEventListener('click', procResetAll);
