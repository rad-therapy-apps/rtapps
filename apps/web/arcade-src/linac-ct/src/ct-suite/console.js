// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import {
	REAL_DATA,
	REALV,
	decodeRealVolume,
	acquireTopogram,
	startScan,
	stopScan,
	autoWindow,
	axCanvas,
	reviewSlice,
	repaintCurrent,
	drawTopogram,
	lerp
} from './imaging';
import { setView, couchGroup, laserGroup, skinGroup, boneGroup, organGroup } from './room';
/* ---------------- CT PROTOCOL LIBRARY ---------------- */
export const PROTOCOLS = {
	pelvis: {
		key: 'pelvis',
		name: 'Pelvis',
		patient: 'ANDERSON, ROSE',
		id: 'CT-24-0413',
		region: 'pelvis',
		kv: 120,
		mas: 250,
		slice: 3.0,
		pitch: 0.9,
		dfov: 45,
		series: 'Pelvis w/o contrast',
		body: 'CT of the pelvis — prostate / bladder / rectum. Supine, Vac-Lok, comfortably full bladder.'
	},
	thorax: {
		key: 'thorax',
		name: 'Thorax',
		patient: 'PARK, DANIEL',
		id: 'CT-24-0517',
		region: 'thorax',
		kv: 120,
		mas: 150,
		slice: 2.0,
		pitch: 1.0,
		dfov: 40,
		series: 'Chest w/o contrast',
		body: 'CT of the thorax — lung / mediastinum. Arms up, breath-hold on inspiration.'
	},
	abdomen: {
		key: 'abdomen',
		name: 'Abdomen',
		patient: 'REYES, MARIA',
		id: 'CT-24-0602',
		region: 'abdomen',
		kv: 120,
		mas: 220,
		slice: 3.0,
		pitch: 0.9,
		dfov: 42,
		series: 'Abdomen w/ contrast',
		body: 'CT of the abdomen — liver / kidneys / spine. Supine, arms up.'
	},
	head: {
		key: 'head',
		name: 'Head & Neck',
		patient: 'OKAFOR, JOHN',
		id: 'CT-24-0731',
		region: 'head',
		kv: 120,
		mas: 300,
		slice: 2.0,
		pitch: 0.8,
		dfov: 24,
		series: 'Head w/o contrast',
		body: 'CT of the head — brain. Supine, head-holder, chin tucked to orbitomeatal line.'
	}
};

// replace the procedural demo protocols with the real datasets
Object.keys(PROTOCOLS).forEach((k) => delete PROTOCOLS[k]);
export const PROTO_SPEC = [
	{
		key: 'prostate',
		dataKey: 'prostate',
		name: 'Prostate SBRT',
		patient: 'SBRT PROSTATE \u00b7 de-identified',
		id: 'ANON-PROSTATE',
		region: 'pelvis',
		defaultWL: 'Pelvis',
		series: 'Prostate SBRT planning CT'
	},
	{
		key: 'spine',
		dataKey: 'spine',
		name: 'Spine SBRT',
		patient: 'SBRT SPINE \u00b7 de-identified',
		id: 'ANON-SPINE',
		region: 'spine',
		defaultWL: 'Soft tissue',
		series: 'Spine SBRT planning CT'
	},
	{
		key: 'cranio',
		dataKey: 'cranio',
		name: 'Craniopharyngioma',
		patient: 'CRANIOPHARYNGIOMA \u00b7 de-identified',
		id: 'ANON-CRANIO',
		region: 'head',
		defaultWL: 'Brain',
		series: 'Cranial planning CT'
	},
	{
		key: 'skin',
		dataKey: 'skin',
		name: 'Skin Cancer',
		patient: 'SKIN CANCER \u00b7 de-identified',
		id: 'ANON-SKIN',
		region: 'head',
		defaultWL: 'Soft tissue',
		series: 'Superficial planning CT'
	},
	{
		key: 'breast',
		dataKey: 'breast',
		name: 'Intact Breast',
		patient: 'INTACT BREAST \u00b7 de-identified',
		id: 'ANON-BREAST',
		region: 'thorax',
		defaultWL: 'Soft tissue',
		series: 'Breast planning CT'
	}
];
PROTO_SPEC.forEach((sp) => {
	const m = REAL_DATA[sp.dataKey].meta;
	PROTOCOLS[sp.key] = Object.assign({}, sp, {
		real: true,
		kv: m.kv,
		mas: m.mas,
		slice: m.slice_sp,
		pitch: null,
		dfov: m.dfov,
		spanCm: +((m.n * m.slice_sp) / 10).toFixed(1)
	});
});

export const spanOf = (p) => (p.real ? [0, p.spanCm] : REGION_SPAN[p.region] || [0, 30]);

/* window/level presets (WW, WL) */
export const WL_PRESETS = {
	'Soft tissue': [400, 40],
	'Soft +': [250, 40],
	Pelvis: [320, 40],
	Bone: [2000, 400],
	Lung: [1500, -600],
	Brain: [80, 40],
	Abdomen: [350, 50],
	Mediastinum: [350, 50],
	Breast: [350, 45]
};

/* superior→inferior physical extent (cm) each region occupies on the table, for topogram + level mapping */
export const REGION_SPAN = { pelvis: [0, 34], thorax: [0, 32], abdomen: [0, 30], head: [0, 22] };

/* ---------------- BODY HABITUS / TECHNIQUE TRAINING ----------------
   These values are intentionally scanner-agnostic teaching targets. Real CT
   systems use site-specific AEC/tube-current modulation, dose reference levels,
   patient-size metrics, and scanner-specific kVp selection. */
export const HABITUS_CASES = {
	prostate: { ap: 34, lat: 42, habitus: 'large' },
	spine: { ap: 29, lat: 35, habitus: 'average' },
	cranio: { ap: 19, lat: 20, habitus: 'small' },
	skin: { ap: 21, lat: 22, habitus: 'small' },
	breast: { ap: 33, lat: 40, habitus: 'large' },
	pelvis: { ap: 28, lat: 35, habitus: 'average' },
	thorax: { ap: 27, lat: 36, habitus: 'average' },
	abdomen: { ap: 35, lat: 42, habitus: 'large' },
	head: { ap: 20, lat: 21, habitus: 'small' }
};

export const TECH_BASE = {
	prostate: { kv: 120, mas: 240 },
	spine: { kv: 120, mas: 260 },
	cranio: { kv: 120, mas: 240 },
	skin: { kv: 120, mas: 180 },
	breast: { kv: 120, mas: 200 },
	pelvis: { kv: 120, mas: 250 },
	thorax: { kv: 120, mas: 160 },
	abdomen: { kv: 120, mas: 220 },
	head: { kv: 120, mas: 250 }
};

export function techniqueTarget(p, habitus) {
	const base = TECH_BASE[p?.key] || TECH_BASE[p?.region] || { kv: 120, mas: 220 };
	if (habitus === 'small')
		return { kv: Math.max(80, base.kv - 20), mas: Math.round((base.mas * 0.72) / 5) * 5 };
	if (habitus === 'large')
		return { kv: Math.min(140, base.kv + 20), mas: Math.round((base.mas * 1.3) / 5) * 5 };
	return { ...base };
}

export function habitusForProtocol(p) {
	return (
		HABITUS_CASES[p?.key] || HABITUS_CASES[p?.region] || { ap: 28, lat: 34, habitus: 'average' }
	);
}

export function updateTechniqueReadout() {
	const rk = document.getElementById('roKv'),
		rm = document.getElementById('roMas');
	if (rk) rk.innerHTML = `${S.techKv}<em> kVp</em>`;
	if (rm) rm.innerHTML = `${S.techMas}<em> mAs</em>`;
}

export function updateAcquisitionGates() {
	const dataReady = !!(S.proto && (!S.proto.real || REALV[S.proto.dataKey]?.loaded));
	const ready = !!(S.proto && S.techniqueValidated && S.isoSet && dataReady && !S.scanning);
	const b = document.getElementById('btnTopogram');
	if (b) b.disabled = !ready;
}

export function resetTechniqueForProtocol() {
	if (!S.proto) return;
	const h = habitusForProtocol(S.proto),
		base = TECH_BASE[S.proto.key] || TECH_BASE[S.proto.region] || { kv: 120, mas: 220 };
	S.expectedHabitus = h.habitus;
	S.selectedHabitus = '';
	S.habitusAttempts = 0;
	S.techniqueValidated = false;
	S.techKv = base.kv;
	S.techMas = base.mas;
	const cue = document.getElementById('habitusCue');
	if (cue)
		cue.innerHTML = `Measured patient size: <b>AP ${h.ap} cm</b> · <b>Lateral ${h.lat} cm</b>. Classify the body habitus, then adjust the technique.`;
	document.querySelectorAll('[data-habitus]').forEach((b) => b.classList.remove('active'));
	const kv = document.getElementById('kvSelect');
	if (kv) kv.value = String(S.techKv);
	const ms = document.getElementById('masSlider'),
		mi = document.getElementById('masInput');
	if (ms) ms.value = S.techMas;
	if (mi) mi.value = S.techMas;
	const fb = document.getElementById('techFeedback');
	if (fb) {
		fb.className = 'tech-feedback';
		fb.textContent = '';
	}
	const lock = document.getElementById('techLock');
	if (lock) {
		lock.className = 'tech-lock';
		lock.querySelector('span:last-child').textContent =
			'Technique validation required before imaging.';
	}
	updateTechniqueReadout();
	updateAcquisitionGates();
}

export function selectHabitus(v) {
	S.selectedHabitus = v;
	S.techniqueValidated = false;
	document
		.querySelectorAll('[data-habitus]')
		.forEach((b) => b.classList.toggle('active', b.dataset.habitus === v));
	const fb = document.getElementById('techFeedback');
	if (fb) fb.className = 'tech-feedback';
	const lock = document.getElementById('techLock');
	if (lock) {
		lock.className = 'tech-lock';
		lock.querySelector('span:last-child').textContent =
			'Technique changed — validate before imaging.';
	}
	updateAcquisitionGates();
}

export function setTechnique(kv, mas) {
	S.techKv = Math.max(80, Math.min(140, Number(kv) || 120));
	S.techMas = Math.max(40, Math.min(500, Math.round((Number(mas) || 220) / 5) * 5));
	const ks = document.getElementById('kvSelect'),
		ms = document.getElementById('masSlider'),
		mi = document.getElementById('masInput');
	if (ks) ks.value = String(S.techKv);
	if (ms) ms.value = S.techMas;
	if (mi) mi.value = S.techMas;
	S.techniqueValidated = false;
	updateTechniqueReadout();
	updateAcquisitionGates();
	const lock = document.getElementById('techLock');
	if (lock) {
		lock.className = 'tech-lock';
		lock.querySelector('span:last-child').textContent =
			'Technique changed — revalidate before imaging.';
	}
}

export function validateTechnique() {
	if (!S.proto) return;
	S.habitusAttempts++;
	const target = techniqueTarget(S.proto, S.expectedHabitus),
		masTol = Math.max(10, target.mas * 0.1);
	const habitusOK = S.selectedHabitus === S.expectedHabitus,
		kvOK = S.techKv === target.kv,
		masOK = Math.abs(S.techMas - target.mas) <= masTol;
	const fb = document.getElementById('techFeedback'),
		lock = document.getElementById('techLock');
	if (habitusOK && kvOK && masOK) {
		S.techniqueValidated = true;
		if (fb) {
			fb.className = 'tech-feedback show good';
			fb.innerHTML = `Technique accepted. ${S.expectedHabitus[0].toUpperCase() + S.expectedHabitus.slice(1)} habitus · ${S.techKv} kVp · ${S.techMas} mAs is within the training target.`;
		}
		if (lock) {
			lock.className = 'tech-lock ok';
			lock.querySelector('span:last-child').textContent =
				'Technique validated · imaging enabled after isocenter is set.';
		}
		if (S.step < 3) setStep(3);
		updateAcquisitionGates();
		log(
			`Technique validated for ${S.expectedHabitus} habitus — ${S.techKv} kVp / ${S.techMas} mAs.`,
			'ok'
		);
		return;
	}
	S.techniqueValidated = false;
	updateAcquisitionGates();
	let msg = [];
	if (!habitusOK) msg.push('body-habitus classification');
	if (!kvOK) msg.push('kVp');
	if (!masOK) msg.push('mAs');
	let coach =
		' Reassess patient attenuation: smaller patients generally require less output; larger patients generally require more.';
	if (S.habitusAttempts >= 3)
		coach += ` Training target for this case: ${target.kv} kVp and approximately ${Math.round(target.mas - masTol)}–${Math.round(target.mas + masTol)} mAs.`;
	if (fb) {
		fb.className = 'tech-feedback show ' + (S.habitusAttempts >= 3 ? 'warn' : 'bad');
		fb.innerHTML = `Not yet. Recheck ${msg.join(', ')}.${coach}`;
	}
	if (lock) {
		lock.className = 'tech-lock';
		lock.querySelector('span:last-child').textContent =
			'Imaging locked until technique is validated.';
	}
	log(`Technique validation incomplete — review ${msg.join(', ')}.`, 'warn');
}

/* ---------------- GLOBAL STATE ---------------- */
export const S = {
	proto: null,
	ww: 400,
	wl: 40,
	selectedHabitus: '',
	expectedHabitus: '',
	habitusAttempts: 0,
	techniqueValidated: false,
	techKv: 120,
	techMas: 220,
	couchZ: 0, // scene units; +out / -in
	isoSet: false,
	scanning: false,
	rotating: false,
	motion: false,
	motionAmp: 0.5,
	topoAcquired: false,
	slices: [], // cached ImageData of reconstructed axial slices
	sliceLevels: [], // normalized t per slice
	curSlice: 0,
	rangeStart: 10,
	rangeEnd: 80, // % of region span
	step: 1
};

/* ============================================================
   3) CONSOLE LOGIC / WORKFLOW
   ============================================================ */
export const $ = (id) => document.getElementById(id);
export const log = (msg, cls = '') => {
	const l = $('log');
	const t = new Date().toLocaleTimeString([], { hour12: false });
	const d = document.createElement('div');
	d.innerHTML = `<span class="t">${t}</span> <span class="${cls}">${msg}</span>`;
	l.prepend(d);
	while (l.children.length > 60) l.lastChild.remove();
};

export function setStatus(text, cls) {
	const s = $('statusLine');
	s.className = 'status-line ' + (cls || '');
	$('statusText').textContent = text;
}

export function setXray(on) {
	$('xrayInd').classList.toggle('on', on);
}

/* build protocol chips */
export function buildProtocols() {
	const grid = $('protoGrid');
	grid.innerHTML = '';
	Object.values(PROTOCOLS).forEach((p) => {
		const b = document.createElement('button');
		b.className = 'chip';
		b.textContent = p.name;
		b.dataset.k = p.key;
		b.onclick = () => setProto(p.key);
		grid.appendChild(b);
	});
}

/* build window/level preset chips */
export function buildWL() {
	const grid = $('wlGrid');
	grid.innerHTML = '';
	Object.entries(WL_PRESETS).forEach(([name, [ww, wl]]) => {
		const b = document.createElement('button');
		b.className = 'chip';
		b.textContent = name;
		b.onclick = () => {
			setWL(ww, wl);
			[...grid.children].forEach((c) => c.classList.toggle('active', c === b));
		};
		grid.appendChild(b);
	});
}

/* workflow step list */
export function buildSteps() {
	const defs = [
		['1', 'Select protocol', 'Patient, anatomy, series'],
		['2', 'Assess habitus & technique', 'Classify size · set kVp and mAs · validate'],
		['3', 'Position & set isocenter', 'Couch + lasers to the target'],
		['4', 'Acquire topogram', 'AP/LAT scouts for scan planning'],
		['5', 'Define scan range', 'Set superior + inferior limits'],
		['6', 'Scan & reconstruct', 'Acquire axial images']
	];
	$('workflowSteps').innerHTML = defs
		.map(
			([n, l, s]) =>
				`<div class="step" data-step="${n}"><div class="n">${n}</div><div class="txt"><div class="lab">${l}</div><div class="sub">${s}</div></div></div>`
		)
		.join('');
}

export function setStep(n) {
	S.step = n;
	$('conStep').textContent =
		`Step ${n} · ${['', 'Protocol', 'Habitus / Technique', 'Position', 'Topogram', 'Range', 'Scan'][n]}`;
	document.querySelectorAll('#workflowSteps .step').forEach((el) => {
		const k = +el.dataset.step;
		el.classList.toggle('done', k < n);
		el.classList.toggle('cur', k === n);
	});
}

export function setProto(key) {
	if (S.scanning) return;
	const p = PROTOCOLS[key];
	S.proto = p;
	[...$('protoGrid').children].forEach((c) => c.classList.toggle('active', c.dataset.k === key));
	$('ptName').textContent = p.patient;
	$('ptId').textContent = p.id;
	$('ptProto').textContent = p.name;
	$('ptSeries').textContent = p.series;
	$('roSlice').innerHTML = `${p.slice.toFixed(1)}<em> mm</em>`;
	$('roPitch').innerHTML = p.pitch == null ? '—' : p.pitch.toFixed(2);
	$('dfov').textContent = p.dfov + ' cm';
	S.isoSet = false;
	$('botIso').textContent = '— cm';
	resetTechniqueForProtocol();
	// reset acquisition
	S.topoAcquired = false;
	S.sliceHU = null;
	S.slices = [];
	S.sliceLevels = [];
	S.curSlice = 0;
	$('axHint').style.display = '';
	$('topoHint').style.display = '';
	$('sliceScroll').disabled = true;
	$('sliceScroll').max = 0;
	$('sliceScroll').value = 0;
	$('sliceLabel').textContent = '— / —';
	$('btnTopogram').disabled = true;
	$('btnScan').disabled = true;
	['rangeStart', 'rangeEnd'].forEach((id) => ($(id).disabled = true));
	$('axMeta').textContent = '— HU';
	$('acqSlices').textContent = '0';
	$('progFill').style.width = '0%';
	$('progText').textContent = 'No acquisition';
	$('progPct').textContent = '0%';
	// default window/level for this protocol
	const wlName = p.defaultWL || 'Soft tissue',
		wlv = WL_PRESETS[wlName] || WL_PRESETS['Soft tissue'];
	setWL(wlv[0], wlv[1]);
	[...$('wlGrid').children].forEach((c) => c.classList.toggle('active', c.textContent === wlName));
	updateRangeLabels();
	setStatus('Protocol loaded', 'rdy');
	setStep(2);
	log(`Loaded protocol <b>${p.name}</b> — ${p.patient} (${p.id}).`, 'ok');
	$('topoMeta').textContent = 'AP · LAT';
	if (p.real && !REALV[p.dataKey].loaded) {
		$('btnTopogram').disabled = true;
		setStatus('Loading real CT volume…', 'busy');
		log('Decoding embedded CT series…', 'warn');
		decodeRealVolume(p.dataKey)
			.then(() => {
				if (S.proto && S.proto.dataKey === p.dataKey) {
					updateAcquisitionGates();
					setStatus('Real CT loaded — position & topogram', 'rdy');
					log(
						`Real series decoded — <b>${REALV[p.dataKey].meta.n}</b> slices @ ${REALV[p.dataKey].meta.slice_sp} mm.`,
						'ok'
					);
				}
			})
			.catch(() => {
				setStatus('CT load failed', 'busy');
				log('Failed to decode embedded CT series.', 'hot');
			});
	}
}

/* window/level */
let wlRepaintPending = false;
export function setWL(ww, wl) {
	S.ww = Math.max(20, Math.min(4000, Math.round(ww)));
	S.wl = Math.max(-1200, Math.min(1600, Math.round(wl)));
	$('wwSlider').value = S.ww;
	$('wlSlider').value = S.wl;
	$('wwLbl').textContent = S.ww;
	$('wlLbl').textContent = S.wl;
	if (!S.sliceHU || !S.sliceHU.length) return;
	// RTApps perf pass: coalesce repaints to one per animation frame (pointermove during a
	// WL drag can fire well over 60/sec); repaintCurrent() always reads the latest S.ww/S.wl,
	// so the flushed frame reflects whatever values were last set — pixel-identical end state.
	if (wlRepaintPending) return;
	wlRepaintPending = true;
	requestAnimationFrame(() => {
		wlRepaintPending = false;
		repaintCurrent();
	});
}

/* range */
export function updateRangeLabels() {
	if (!S.proto) return;
	const [a, b] = spanOf(S.proto);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
	const span = b - a;
	const s = Math.min(+$('rangeStart').value, +$('rangeEnd').value - 4),
		e = Math.max(+$('rangeEnd').value, +$('rangeStart').value + 4);
	S.rangeStart = s;
	S.rangeEnd = e;
	$('rangeStart').value = s;
	$('rangeEnd').value = e;
	const cmS = lerp(a, b, s / 100),
		cmE = lerp(a, b, e / 100),
		len = cmE - cmS;
	$('rangeStartLbl').textContent = `S${cmS.toFixed(1)} cm`;
	$('rangeEndLbl').textContent = `S${cmE.toFixed(1)} cm`;
	$('rangeLen').textContent = len.toFixed(1) + ' cm';
	const nSlices = Math.max(1, Math.round((len * 10) / S.proto.slice));
	$('rangeSlices').textContent = nSlices;
	if (S.topoAcquired) drawTopogram();
}

/* positioning */
export function moveCouch(dx, dy, dz) {
	if (S.scanning) return;
	S.couchZ = Math.max(-16, Math.min(20, S.couchZ + dz * 1.2));
	if (couchGroup) {
		couchGroup.position.x = (couchGroup.position.x || 0) + dx * 0.6;
		couchGroup.position.y = (couchGroup.position.y || 0) + dy * 0.6;
	}
	$('couchZval').textContent = 'Z ' + S.couchZ.toFixed(1);
	$('botCouchZ').textContent = S.couchZ.toFixed(1);
	$('botTablePos').textContent = 'S ' + (50 - S.couchZ * 1.5).toFixed(1);
}

export function setIso() {
	if (S.scanning) return;
	S.isoSet = true;
	if (laserGroup) {
		laserGroup.children.forEach((l) => l.material.color.set(0x39ff8c));
	}
	$('botIso').textContent = (50 - S.couchZ * 1.5).toFixed(1) + ' cm';
	setStatus('Isocenter set', 'rdy');
	if (S.techniqueValidated) setStep(4);
	updateAcquisitionGates();
	log('Lasers aligned · isocenter marked at table position.', 'ok');
}

/* ============================================================
   4) WIRE UP
   ============================================================ */
export function wire() {
	buildProtocols();
	buildWL();
	buildSteps();
	setStep(1);
	document
		.querySelectorAll('[data-view]')
		.forEach((b) => (b.onclick = () => setView(b.dataset.view)));
	$('btnSkin').onclick = () => {
		skinGroup.visible = !skinGroup.visible;
		$('btnSkin').style.color = skinGroup.visible ? '' : 'var(--cyan)';
	};
	$('btnBone').onclick = () => {
		boneGroup.visible = !boneGroup.visible;
		$('btnBone').style.color = boneGroup.visible ? 'var(--cyan)' : '';
	};
	$('btnOrgans').onclick = () => {
		organGroup.visible = !organGroup.visible;
		$('btnOrgans').style.color = organGroup.visible ? 'var(--cyan)' : '';
	};
	$('btnTopogram').onclick = acquireTopogram;
	$('btnScan').onclick = startScan;
	$('btnStop').onclick = stopScan;
	$('rangeStart').oninput = updateRangeLabels;
	$('rangeEnd').oninput = updateRangeLabels;
	$('wwSlider').oninput = (e) => {
		setWL(+e.target.value, S.wl);
		document.querySelectorAll('#wlGrid .chip').forEach((c) => c.classList.remove('active'));
	};
	$('wlSlider').oninput = (e) => {
		setWL(S.ww, +e.target.value);
		document.querySelectorAll('#wlGrid .chip').forEach((c) => c.classList.remove('active'));
	};
	document
		.querySelectorAll('[data-habitus]')
		.forEach((b) => (b.onclick = () => selectHabitus(b.dataset.habitus)));
	$('kvSelect').onchange = (e) => setTechnique(+e.target.value, S.techMas);
	$('masSlider').oninput = (e) => setTechnique(S.techKv, +e.target.value);
	$('masInput').onchange = (e) => setTechnique(S.techKv, +e.target.value);
	$('btnValidateTechnique').onclick = validateTechnique;
	$('btnAutoWindow').onclick = autoWindow;
	$('btnResetWindow').onclick = () => {
		if (!S.proto) return;
		const nm = S.proto.defaultWL || 'Soft tissue',
			v = WL_PRESETS[nm] || WL_PRESETS['Soft tissue'];
		setWL(v[0], v[1]);
		[...$('wlGrid').children].forEach((c) => c.classList.toggle('active', c.textContent === nm));
	};
	let wlDrag = null;
	axCanvas.addEventListener('pointerdown', (e) => {
		if (!S.sliceHU || !S.sliceHU.length) return;
		wlDrag = { x: e.clientX, y: e.clientY, ww: S.ww, wl: S.wl };
		axCanvas.setPointerCapture?.(e.pointerId);
	});
	axCanvas.addEventListener('pointermove', (e) => {
		if (!wlDrag) return;
		const dx = e.clientX - wlDrag.x,
			dy = e.clientY - wlDrag.y;
		setWL(wlDrag.ww + dx * 5, wlDrag.wl - dy * 2);
		document.querySelectorAll('#wlGrid .chip').forEach((c) => c.classList.remove('active'));
	});
	const endWL = () => {
		wlDrag = null;
	};
	axCanvas.addEventListener('pointerup', endWL);
	axCanvas.addEventListener('pointercancel', endWL);
	axCanvas.addEventListener('dblclick', () => $('btnResetWindow').click());
	$('sliceScroll').oninput = (e) => reviewSlice(+e.target.value);
	document.querySelectorAll('[data-couch]').forEach((b) => {
		const m = b.dataset.couch;
		const ax = m[0],
			sgn = m.slice(1) === '1' ? 1 : -1;
		b.onclick = () => moveCouch(ax === 'x' ? sgn : 0, ax === 'y' ? sgn : 0, ax === 'z' ? sgn : 0);
	});
	$('btnSetIso').onclick = setIso;
	$('rotChk').onchange = (e) => {
		S.rotating = e.target.checked;
	};
	$('motionChk').onchange = (e) => {
		S.motion = e.target.checked;
	};
	$('ampSlider').oninput = (e) => {
		S.motionAmp = +e.target.value;
		$('ampLbl').textContent = (+e.target.value).toFixed(1);
	};
	// initial slice-scroll keyboard
	addEventListener('keydown', (e) => {
		if (!S.sliceHU || !S.sliceHU.length) return;
		if (e.key === 'ArrowUp') {
			reviewSlice(S.curSlice + 1);
			$('sliceScroll').value = S.curSlice;
		}
		if (e.key === 'ArrowDown') {
			reviewSlice(S.curSlice - 1);
			$('sliceScroll').value = S.curSlice;
		}
	});
}
