// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
/* ============================================================
   CT SIMULATION SUITE  —  single-file operator console
   Left: 3D scan room (three.js)   Center: topogram + axial recon
   Right: protocol / workflow / window-level / positioning
   ============================================================ */
import * as THREE from 'three-ct';
import { OrbitControls } from 'three-ct/addons/controls/OrbitControls.js';

/* ---------------- CT PROTOCOL LIBRARY ---------------- */
const PROTOCOLS = {
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

/* ---------------- EMBEDDED REAL CT SERIES (all de-identified) ----------------
   Five real planning CTs, each downsampled to the 220^2 recon matrix and
   subsampled in slices. HU are packed loss-lessly into a PNG sprite (16-bit
   -> R,G) and decoded in-browser, so window/level + HU readout use genuine
   Hounsfield data. AP + lateral scouts are DRRs computed from each volume. */
const REAL_DATA = {
	prostate: {
		meta: {
			size: 220,
			n: 110,
			cols: 11,
			rows: 10,
			off: 1024,
			kv: 120,
			mas: 51,
			dfov: 50,
			px: 2.2727,
			slice_sp: 1.25
		},
		png: 'assets/ct-1.png'
	},
	spine: {
		meta: {
			size: 220,
			n: 120,
			cols: 11,
			rows: 11,
			off: 1024,
			kv: 120,
			mas: 125,
			dfov: 60,
			px: 2.7273,
			slice_sp: 2.0
		},
		png: 'assets/ct-2.png'
	},
	cranio: {
		meta: {
			size: 220,
			n: 110,
			cols: 11,
			rows: 10,
			off: 1024,
			kv: 120,
			mas: 201,
			dfov: 65,
			px: 2.9545,
			slice_sp: 1.0
		},
		png: 'assets/ct-3.png'
	},
	skin: {
		meta: {
			size: 220,
			n: 100,
			cols: 10,
			rows: 10,
			off: 1024,
			kv: 130,
			mas: 3420,
			dfov: 60,
			px: 2.7273,
			slice_sp: 3.0
		},
		png: 'assets/ct-4.png'
	},
	breast: {
		meta: {
			size: 220,
			n: 110,
			cols: 11,
			rows: 10,
			off: 1024,
			kv: 140,
			mas: 200,
			dfov: 60,
			px: 2.7273,
			slice_sp: 2.0
		},
		png: 'assets/ct-5.png'
	}
};

// replace the procedural demo protocols with the real datasets
Object.keys(PROTOCOLS).forEach((k) => delete PROTOCOLS[k]);
const PROTO_SPEC = [
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

const REALV = {};
Object.keys(REAL_DATA).forEach(
	(k) =>
		(REALV[k] = {
			loaded: false,
			loading: false,
			slices: [],
			scoutAP: null,
			scoutLAT: null,
			meta: REAL_DATA[k].meta
		})
);

function buildScout(slices, SZ, N, mode) {
	const w = SZ,
		h = N,
		cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	const ctx = cv.getContext('2d');
	const img = ctx.createImageData(w, h),
		att = new Float32Array(w * h);
	let mx = 1;
	for (let s = 0; s < N; s++) {
		const sl = slices[s];
		for (let u = 0; u < SZ; u++) {
			let a = 0;
			if (mode === 'ap') {
				for (let y = 0; y < SZ; y++) {
					const hh = sl[y * SZ + u];
					if (hh > -500) a += hh + 1000;
				}
			} else {
				for (let x = 0; x < SZ; x++) {
					const hh = sl[u * SZ + x];
					if (hh > -500) a += hh + 1000;
				}
			}
			att[s * w + u] = a;
			if (a > mx) mx = a;
		}
	}
	for (let i = 0; i < att.length; i++) {
		const v = Math.min(255, Math.pow(att[i] / mx, 0.6) * 255) | 0;
		const p = i * 4;
		img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
		img.data[p + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	return cv;
}
async function decodeRealVolume(key) {
	const V = REALV[key];
	if (V.loaded || V.loading) return V.loaded;
	V.loading = true;
	const img = new Image();
	img.src = REAL_DATA[key].png;
	await img.decode();
	const M = REAL_DATA[key].meta,
		SZ = M.size,
		cols = M.cols,
		off = M.off;
	const cv = document.createElement('canvas');
	cv.width = img.width;
	cv.height = img.height;
	const cx = cv.getContext('2d', { willReadFrequently: true });
	cx.drawImage(img, 0, 0);
	const data = cx.getImageData(0, 0, img.width, img.height).data;
	for (let k = 0; k < M.n; k++) {
		const ty = Math.floor(k / cols) * SZ,
			tx = (k % cols) * SZ,
			out = new Int16Array(SZ * SZ);
		for (let r = 0; r < SZ; r++) {
			const base = ((ty + r) * img.width + tx) * 4;
			for (let c = 0; c < SZ; c++) {
				const p = base + c * 4;
				out[r * SZ + c] = ((data[p] << 8) | data[p + 1]) - off;
			}
		}
		V.slices.push(out);
	}
	V.scoutAP = buildScout(V.slices, SZ, M.n, 'ap');
	V.scoutLAT = buildScout(V.slices, SZ, M.n, 'lat');
	V.loaded = true;
	V.loading = false;
	return true;
}
const spanOf = (p) => (p.real ? [0, p.spanCm] : REGION_SPAN[p.region] || [0, 30]);

/* window/level presets (WW, WL) */
const WL_PRESETS = {
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
const REGION_SPAN = { pelvis: [0, 34], thorax: [0, 32], abdomen: [0, 30], head: [0, 22] };

/* ---------------- BODY HABITUS / TECHNIQUE TRAINING ----------------
   These values are intentionally scanner-agnostic teaching targets. Real CT
   systems use site-specific AEC/tube-current modulation, dose reference levels,
   patient-size metrics, and scanner-specific kVp selection. */
const HABITUS_CASES = {
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
const TECH_BASE = {
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
function techniqueTarget(p, habitus) {
	const base = TECH_BASE[p?.key] || TECH_BASE[p?.region] || { kv: 120, mas: 220 };
	if (habitus === 'small')
		return { kv: Math.max(80, base.kv - 20), mas: Math.round((base.mas * 0.72) / 5) * 5 };
	if (habitus === 'large')
		return { kv: Math.min(140, base.kv + 20), mas: Math.round((base.mas * 1.3) / 5) * 5 };
	return { ...base };
}
function habitusForProtocol(p) {
	return (
		HABITUS_CASES[p?.key] || HABITUS_CASES[p?.region] || { ap: 28, lat: 34, habitus: 'average' }
	);
}
function updateTechniqueReadout() {
	const rk = document.getElementById('roKv'),
		rm = document.getElementById('roMas');
	if (rk) rk.innerHTML = `${S.techKv}<em> kVp</em>`;
	if (rm) rm.innerHTML = `${S.techMas}<em> mAs</em>`;
}
function updateAcquisitionGates() {
	const dataReady = !!(S.proto && (!S.proto.real || REALV[S.proto.dataKey]?.loaded));
	const ready = !!(S.proto && S.techniqueValidated && S.isoSet && dataReady && !S.scanning);
	const b = document.getElementById('btnTopogram');
	if (b) b.disabled = !ready;
}
function resetTechniqueForProtocol() {
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
function selectHabitus(v) {
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
function setTechnique(kv, mas) {
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
function validateTechnique() {
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
const S = {
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
   1) 3D SCAN ROOM
   ============================================================ */
const BORE_R = 7.5,
	HOUSING_R = 11.5,
	GANTRY_DEPTH = 6.5,
	PATIENT_LEN = 34;
let scene, camera, renderer, controls, clock;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 2 report
let gantryHousing, gantryRotor, tubeMesh, detectorMesh;
let couchGroup, tableTop, patientGroup, skinGroup, boneGroup, organGroup, tumorMesh;
let laserGroup;
let gantryAngle = 0;

function initThree() {
	const canvas = document.getElementById('scanCanvas');
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0a0f14);
	scene.fog = new THREE.Fog(0x0a0f14, 55, 110);
	clock = new THREE.Clock();
	camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.target.set(0, 0, 0);

	scene.add(new THREE.HemisphereLight(0xbcd3e6, 0x0a0f14, 0.7));
	const key = new THREE.DirectionalLight(0xffffff, 0.85);
	key.position.set(14, 22, 18);
	key.castShadow = true;
	key.shadow.mapSize.set(1024, 1024);
	key.shadow.camera.near = 1;
	key.shadow.camera.far = 90;
	key.shadow.camera.left = -30;
	key.shadow.camera.right = 30;
	key.shadow.camera.top = 30;
	key.shadow.camera.bottom = -30;
	scene.add(key);
	const fill = new THREE.DirectionalLight(0x88aacc, 0.4);
	fill.position.set(-16, 10, -12);
	scene.add(fill);
	const spot = new THREE.PointLight(0x35d6c4, 0.35, 60);
	spot.position.set(0, 9, 2);
	scene.add(spot);

	createRoom();
	createGantry();
	createCouchPatient();
	createLasers();
	setView('iso');
	addEventListener('resize', onResize);
	onResize();
	requestAnimationFrame(onResize);
	setTimeout(onResize, 120);
	renderer.setAnimationLoop(animate);
}

function createRoom() {
	const floorMat = new THREE.MeshStandardMaterial({
		color: 0x141c24,
		roughness: 0.95,
		metalness: 0.05
	});
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMat);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -14;
	floor.receiveShadow = true;
	scene.add(floor);
	// subtle floor grid
	const grid = new THREE.GridHelper(120, 48, 0x1d2c3a, 0x142029);
	grid.position.y = -13.98;
	scene.add(grid);
	const wallMat = new THREE.MeshStandardMaterial({
		color: 0x101820,
		roughness: 1,
		side: THREE.DoubleSide
	});
	const back = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), wallMat);
	back.position.set(0, 16, -34);
	back.receiveShadow = true;
	scene.add(back);
	// control-room window glow on the back wall
	const win = new THREE.Mesh(
		new THREE.PlaneGeometry(26, 10),
		new THREE.MeshBasicMaterial({ color: 0x0e3a44 })
	);
	win.position.set(22, 9, -33.9);
	scene.add(win);
	const winFrame = new THREE.Mesh(
		new THREE.PlaneGeometry(27, 11),
		new THREE.MeshBasicMaterial({ color: 0x35d6c4, transparent: true, opacity: 0.15 })
	);
	winFrame.position.set(22, 9, -33.95);
	scene.add(winFrame);
}

function createGantry() {
	gantryHousing = new THREE.Group();
	const shell = new THREE.MeshStandardMaterial({
		color: 0xdfe6ec,
		roughness: 0.55,
		metalness: 0.25
	});
	const shellDark = new THREE.MeshStandardMaterial({
		color: 0x2a333c,
		roughness: 0.8,
		metalness: 0.2,
		side: THREE.BackSide
	});
	// outer housing cylinder (axis Z)
	const outer = new THREE.Mesh(
		new THREE.CylinderGeometry(HOUSING_R, HOUSING_R, GANTRY_DEPTH, 64, 1, true),
		shell
	);
	outer.rotation.x = Math.PI / 2;
	outer.castShadow = true;
	gantryHousing.add(outer);
	// bore inner wall (dark)
	const bore = new THREE.Mesh(
		new THREE.CylinderGeometry(BORE_R, BORE_R, GANTRY_DEPTH + 0.1, 64, 1, true),
		shellDark
	);
	bore.rotation.x = Math.PI / 2;
	gantryHousing.add(bore);
	// front + back faces (ring)
	const faceMat = new THREE.MeshStandardMaterial({
		color: 0xeef2f5,
		roughness: 0.5,
		metalness: 0.2,
		side: THREE.DoubleSide
	});
	const faceMatBack = new THREE.MeshStandardMaterial({
		color: 0xc4ccd3,
		roughness: 0.6,
		metalness: 0.2,
		side: THREE.DoubleSide
	});
	const fGeo = new THREE.RingGeometry(BORE_R, HOUSING_R, 64);
	const front = new THREE.Mesh(fGeo, faceMat);
	front.position.z = GANTRY_DEPTH / 2;
	gantryHousing.add(front);
	const back = new THREE.Mesh(fGeo, faceMatBack);
	back.position.z = -GANTRY_DEPTH / 2;
	gantryHousing.add(back);
	// teal accent bezel around bore
	const bezel = new THREE.Mesh(
		new THREE.TorusGeometry(BORE_R + 0.18, 0.18, 12, 64),
		new THREE.MeshStandardMaterial({
			color: 0x35d6c4,
			emissive: 0x0c4c46,
			emissiveIntensity: 0.8,
			roughness: 0.4
		})
	);
	bezel.position.z = GANTRY_DEPTH / 2 + 0.02;
	gantryHousing.add(bezel);
	// little status strip on the housing face
	const strip = new THREE.Mesh(
		new THREE.PlaneGeometry(4, 0.7),
		new THREE.MeshBasicMaterial({ color: 0x0c1a22 })
	);
	strip.position.set(0, HOUSING_R - 1.2, GANTRY_DEPTH / 2 + 0.03);
	gantryHousing.add(strip);
	scene.add(gantryHousing);

	// rotor: tube + detector arc that spin inside the bore during scan
	gantryRotor = new THREE.Group();
	tubeMesh = new THREE.Mesh(
		new THREE.BoxGeometry(1.4, 1.0, 1.6),
		new THREE.MeshStandardMaterial({
			color: 0x2b6cff,
			emissive: 0x0a1c55,
			emissiveIntensity: 0.5,
			roughness: 0.5
		})
	);
	tubeMesh.position.set(0, BORE_R - 0.7, 0);
	tubeMesh.castShadow = true;
	gantryRotor.add(tubeMesh);
	const det = new THREE.Mesh(
		new THREE.CylinderGeometry(
			BORE_R - 0.4,
			BORE_R - 0.4,
			1.4,
			64,
			1,
			true,
			Math.PI * 0.72,
			Math.PI * 0.56
		),
		new THREE.MeshStandardMaterial({
			color: 0x4a1416,
			emissive: 0x1a0405,
			roughness: 0.6,
			side: THREE.DoubleSide
		})
	);
	det.rotation.x = Math.PI / 2;
	detectorMesh = det;
	gantryRotor.add(det);
	scene.add(gantryRotor);
}

function createCouchPatient() {
	couchGroup = new THREE.Group();
	// pedestal (outside the bore, +Z side)
	const ped = new THREE.Mesh(
		new THREE.BoxGeometry(4, 9, 4),
		new THREE.MeshStandardMaterial({ color: 0x30393f, roughness: 0.8 })
	);
	ped.position.set(0, -9, PATIENT_LEN / 2 + 3);
	ped.castShadow = true;
	ped.receiveShadow = true;
	couchGroup.add(ped);
	// table top (long, along Z)
	tableTop = new THREE.Mesh(
		new THREE.BoxGeometry(TABLE_W(), 0.5, PATIENT_LEN + 8),
		new THREE.MeshStandardMaterial({ color: 0x0f5a63, roughness: 0.5, metalness: 0.2 })
	);
	tableTop.position.set(0, -4.4, 2);
	tableTop.castShadow = true;
	tableTop.receiveShadow = true;
	couchGroup.add(tableTop);
	// curved head-support pad
	const pad = new THREE.Mesh(
		new THREE.CylinderGeometry(2.2, 2.2, 3, 20, 1, false, 0, Math.PI),
		new THREE.MeshStandardMaterial({ color: 0x14343a, roughness: 0.9 })
	);
	pad.rotation.z = Math.PI / 2;
	pad.rotation.y = Math.PI / 2;
	pad.position.set(0, -3.9, -PATIENT_LEN / 2 + 1.5);
	couchGroup.add(pad);

	patientGroup = new THREE.Group();
	buildPatient();
	patientGroup.position.set(0, -3.0, 0);
	couchGroup.add(patientGroup);
	couchGroup.position.z = S.couchZ;
	scene.add(couchGroup);
}
function TABLE_W() {
	return 5.2;
}

function buildPatient() {
	skinGroup = new THREE.Group();
	boneGroup = new THREE.Group();
	organGroup = new THREE.Group();
	const skinMat = new THREE.MeshStandardMaterial({
		color: 0xe4b48f,
		roughness: 0.85,
		transparent: true,
		opacity: 0.5
	});
	const boneMat = new THREE.MeshStandardMaterial({ color: 0xeae4d2, roughness: 0.6 });
	const capsule = (rx, ry, len, z) => {
		const g = new THREE.CapsuleGeometry(1, 1, 4, 12);
		const m = new THREE.Mesh(g, skinMat);
		m.scale.set(rx, len / 2, ry);
		m.rotation.x = Math.PI / 2;
		m.position.z = z;
		m.castShadow = true;
		return m;
	};
	// torso (chest→abdomen), pelvis, thighs, lower legs
	skinGroup.add(capsule(3.4, 2.4, 15, -3)); // thorax/abdomen
	skinGroup.add(capsule(3.6, 2.5, 7, 6.5)); // pelvis
	const thighL = capsule(1.5, 1.7, 10, 12.5);
	thighL.position.x = -1.6;
	skinGroup.add(thighL);
	const thighR = thighL.clone();
	thighR.position.x = 1.6;
	skinGroup.add(thighR);
	// head + neck
	const head = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 16), skinMat);
	head.position.set(0, 0.4, -15);
	head.scale.set(1, 1.15, 1.25);
	head.castShadow = true;
	skinGroup.add(head);
	const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.6, 14), skinMat);
	neck.rotation.x = Math.PI / 2;
	neck.position.set(0, 0.1, -12.4);
	skinGroup.add(neck);
	// arms at sides
	const armL = capsule(0.9, 1.0, 12, -4);
	armL.position.x = -3.9;
	skinGroup.add(armL);
	const armR = armL.clone();
	armR.position.x = 3.9;
	skinGroup.add(armR);

	// skeleton: spine, ribcage hint, pelvis ring, femora, skull
	for (let i = 0; i < 20; i++) {
		const v = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), boneMat);
		v.position.set(0, -1.7, -10.5 + i * 0.95);
		boneGroup.add(v);
	}
	const skull = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 14), boneMat);
	skull.position.set(0, 0.4, -15);
	skull.scale.set(1, 1.12, 1.2);
	boneGroup.add(skull);
	const pelvis = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.75, 12, 28), boneMat);
	pelvis.rotation.x = Math.PI / 2;
	pelvis.scale.set(1, 1, 0.6);
	pelvis.position.set(0, -1.4, 7.5);
	boneGroup.add(pelvis);
	const femL = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 9, 12), boneMat);
	femL.rotation.x = Math.PI / 2;
	femL.position.set(-1.6, -1.6, 13);
	boneGroup.add(femL);
	const femR = femL.clone();
	femR.position.x = 1.6;
	boneGroup.add(femR);
	for (let i = 0; i < 7; i++) {
		const rib = new THREE.Mesh(
			new THREE.TorusGeometry(2.9 - i * 0.06, 0.14, 8, 20, Math.PI * 1.3),
			boneMat
		);
		rib.rotation.y = Math.PI / 2;
		rib.rotation.z = Math.PI * 0.15;
		rib.position.set(0, -0.6, -9 + i * 1.1);
		boneGroup.add(rib);
	}

	// organs (region-representative internal structures, semi-transparent)
	const org = (c, rx, ry, rz, x, y, z, op = 0.75) => {
		const m = new THREE.Mesh(
			new THREE.SphereGeometry(1, 16, 12),
			new THREE.MeshStandardMaterial({
				color: c,
				roughness: 0.6,
				transparent: true,
				opacity: op,
				emissive: c,
				emissiveIntensity: 0.06
			})
		);
		m.scale.set(rx, ry, rz);
		m.position.set(x, y, z);
		return m;
	};
	organGroup.add(org(0xff8f9e, 2.0, 2.2, 3.0, -1.4, 0.2, -6.5)); // left lung
	organGroup.add(org(0xff8f9e, 2.0, 2.2, 3.0, 1.4, 0.2, -6.5)); // right lung
	organGroup.add(org(0xd23b45, 1.6, 1.5, 1.6, -0.6, -0.4, -4.6)); // heart
	organGroup.add(org(0x8a5a2b, 2.6, 1.9, 2.4, 1.2, -0.2, -0.5)); // liver
	organGroup.add(org(0xcaa24a, 1.1, 1.1, 1.4, -1.9, -1.0, 0.4)); // spleen/kidney L
	organGroup.add(org(0xf2d675, 1.2, 1.2, 1.2, 0, 1.0, 7.4, 0.8)); // bladder (anterior)
	organGroup.add(org(0x9e7b52, 0.8, 0.8, 1.6, 0, -1.2, 7.6, 0.8)); // rectum (posterior)
	tumorMesh = new THREE.Mesh(
		new THREE.SphereGeometry(0.55, 16, 14),
		new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0x5a0d08, emissiveIntensity: 0.8 })
	);
	tumorMesh.position.set(0, 0.1, 7.5);
	organGroup.add(tumorMesh);

	patientGroup.add(skinGroup, boneGroup, organGroup);
	boneGroup.visible = false;
	organGroup.visible = false;
}

function createLasers() {
	laserGroup = new THREE.Group();
	const mat = new THREE.LineBasicMaterial({ color: 0x39ff8c, transparent: true, opacity: 0.85 });
	const E = 28;
	const line = (a, b) =>
		laserGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat));
	line(new THREE.Vector3(-E, 0, 0), new THREE.Vector3(E, 0, 0));
	line(new THREE.Vector3(0, -E, 0), new THREE.Vector3(0, E, 0));
	line(new THREE.Vector3(0, 0, -E), new THREE.Vector3(0, 0, E));
	scene.add(laserGroup);
}

function setView(name) {
	if (!camera) return;
	const t = new THREE.Vector3(0, 0, 0);
	if (name === 'iso') camera.position.set(24, 17, 26);
	else if (name === 'front') camera.position.set(0.1, 1.5, 30);
	else if (name === 'side') camera.position.set(34, 3, 0.1);
	else if (name === 'top') camera.position.set(0.1, 38, 0.1);
	controls.target.copy(t);
	camera.lookAt(t);
}

function onResize() {
	const c = document.getElementById('scanCanvas');
	if (!c || !renderer) return;
	const w = c.clientWidth || c.parentElement.clientWidth,
		h = c.clientHeight || c.parentElement.clientHeight;
	if (w < 2 || h < 2) return;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
}

function animate() {
	const dt = clock.getDelta(),
		el = clock.elapsedTime;
	if ((S.scanning || S.rotating) && gantryRotor) {
		gantryAngle += (S.scanning ? 4.2 : 1.6) * dt;
		gantryRotor.rotation.z = gantryAngle;
	}
	if (S.motion && patientGroup) {
		patientGroup.position.y = -3.0 + Math.sin(el * 2.0) * S.motionAmp * 0.5;
	} else if (patientGroup) patientGroup.position.y = -3.0;
	if (couchGroup) couchGroup.position.z = S.couchZ;
	controls.update();
	renderer.render(scene, camera);
	document.getElementById('roomAux').textContent =
		`Gantry ${(THREE.MathUtils.radToDeg(gantryRotor ? gantryRotor.rotation.z : 0) % 360).toFixed(0)}° · ${S.scanning ? 'SCANNING' : S.rotating ? 'Rotating' : 'Idle'}`;
}

/* ============================================================
   2) PROCEDURAL CT RECONSTRUCTION ENGINE
   ============================================================ */
const REC = 220; // recon matrix
const axCanvas = document.getElementById('axCanvas');
axCanvas.width = REC;
axCanvas.height = REC;
const axCtx = axCanvas.getContext('2d');
let noiseSeed = 1234567;
function rnd() {
	noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff;
	return noiseSeed / 0x7fffffff;
}
const ell = (x, y, cx, cy, rx, ry) => {
	const dx = (x - cx) / rx,
		dy = (y - cy) / ry;
	return dx * dx + dy * dy;
}; // <1 inside
const lerp = (a, b, t) => a + (b - a) * t;

/* HU at patient-space (x lateral cm, y anterior +cm) for a region at normalized level t (0 sup →1 inf) */
function sampleHU(region, t, x, y) {
	if (region === 'pelvis') return huPelvis(t, x, y);
	if (region === 'thorax') return huThorax(t, x, y);
	if (region === 'abdomen') return huAbdomen(t, x, y);
	return huHead(t, x, y);
}
function bodyBase(x, y, rx, ry, fat) {
	// returns {out, hu} skin/fat/muscle shell
	if (ell(x, y, 0, 0, rx, ry) > 1) return -1000; // air outside body
	if (ell(x, y, 0, 0, rx - fat, ry - fat) > 1) return -95; // subcutaneous fat rim
	return 45; // muscle default
}
function huPelvis(t, x, y) {
	const rx = lerp(18.5, 14.5, t),
		ry = lerp(12.5, 11.5, t);
	let hu = bodyBase(x, y, rx, ry, 1.7);
	if (hu <= -1000) return hu;
	// bladder (anterior) — fuller superiorly
	if (t > 0.28 && t < 0.78 && ell(x, y, 0, ry * 0.28, lerp(5.5, 3.2, t), lerp(4.2, 3.0, t)) < 1)
		hu = 10;
	// rectum (posterior)
	if (t > 0.34 && t < 0.82 && ell(x, y, 0, -ry * 0.3, 2.2, 2.0) < 1) hu = rnd() < 0.4 ? -45 : 20;
	// prostate / tumour target (between bladder & rectum, low pelvis)
	if (t > 0.5 && t < 0.74 && ell(x, y, 0, -ry * 0.02, 2.4, 2.2) < 1) hu = 48;
	if (t > 0.54 && t < 0.7 && ell(x, y, 0.6, -ry * 0.05, 1.1, 1.0) < 1) hu = 72; // tumour nodule
	// bowel gas bubbles (upper pelvis)
	if (
		t < 0.4 &&
		(ell(x, y, -6, ry * 0.35, 1.6, 1.3) < 1 || ell(x, y, 6.5, ry * 0.28, 1.4, 1.2) < 1)
	)
		hu = -780;
	// BONE
	if (t < 0.34) {
		// iliac wings + sacrum + L5
		const wing = (cx) => {
			const e = ell(x, y, cx, -ry * 0.15, 3.2, 5.0);
			return e < 1 && e > 0.42;
		};
		if (wing(rx * 0.55) || wing(-rx * 0.55)) hu = 560 + rnd() * 180;
		if (ell(x, y, 0, -ry * 0.55, 2.0, 1.6) < 1) hu = 430; // sacrum
		if (ell(x, y, 0, -ry * 0.32, 1.6, 1.3) < 1)
			hu = ell(x, y, 0, -ry * 0.32, 0.8, 0.7) < 1 ? 150 : 520; // L5 body+cortex
	} else if (t < 0.62) {
		// acetabula / femoral heads + pubis
		const head = (cx) => ell(x, y, cx, -ry * 0.02, 3.0, 3.0);
		if (head(rx * 0.58) < 1) {
			hu = head(rx * 0.58) > 0.5 ? 620 : 130;
		}
		if (head(-rx * 0.58) < 1) {
			hu = head(-rx * 0.58) > 0.5 ? 620 : 130;
		}
		if (ell(x, y, 0, ry * 0.42, 2.6, 1.1) < 1) hu = 560; // pubic rami
		if (ell(x, y, 0, -ry * 0.5, 1.6, 1.4) < 1) hu = 430; // sacrum/coccyx
	} else {
		// femoral shafts + ischium
		const shaft = (cx) => ell(x, y, cx, 0, 1.9, 1.9);
		if (shaft(rx * 0.5) < 1) {
			hu = shaft(rx * 0.5) > 0.45 ? 940 : 70;
		}
		if (shaft(-rx * 0.5) < 1) {
			hu = shaft(-rx * 0.5) > 0.45 ? 940 : 70;
		}
		if (
			ell(x, y, rx * 0.34, -ry * 0.45, 1.3, 1.2) < 1 ||
			ell(x, y, -rx * 0.34, -ry * 0.45, 1.3, 1.2) < 1
		)
			hu = 520; // ischial tuberosities
	}
	return hu;
}
function huThorax(t, x, y) {
	const rx = lerp(15, 18, t),
		ry = lerp(11, 13, t);
	let hu = bodyBase(x, y, rx, ry, 1.3);
	if (hu <= -1000) return hu;
	const lungShrink = t > 0.78 ? lerp(1, 0.2, (t - 0.78) / 0.22) : 1;
	const lung = (cx) => ell(x, y, cx, ry * 0.05, rx * 0.4 * lungShrink, ry * 0.6 * lungShrink);
	if (lung(rx * 0.45) < 1) {
		hu = -780 + rnd() * 40;
		if (rnd() < 0.03) hu = 30;
	} // right lung + vessels
	if (lung(-rx * 0.45) < 1) {
		hu = -780 + rnd() * 40;
		if (rnd() < 0.03) hu = 30;
	} // left lung
	if (t > 0.2 && ell(x, y, -1.2, ry * 0.08, rx * 0.28, ry * 0.4) < 1) hu = 45; // heart/mediastinum (left)
	if (ell(x, y, 0, ry * 0.02, rx * 0.16, ry * 0.5) < 1) hu = 42; // mediastinum core / great vessels
	// spine posterior
	if (ell(x, y, 0, -ry * 0.62, 1.7, 1.5) < 1)
		hu = ell(x, y, 0, -ry * 0.62, 0.9, 0.8) < 1 ? 150 : 420;
	if (ell(x, y, 0, -ry * 0.5, 0.6, 0.6) < 1) hu = -30; // spinal canal
	// sternum anterior
	if (ell(x, y, 0, ry * 0.78, 1.4, 0.6) < 1) hu = 430;
	// rib dots around periphery
	for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
		const cx = Math.cos(a) * rx * 0.92,
			cy = Math.sin(a) * ry * 0.92 * 0.9;
		if (Math.sin(a) < 0.3 && ell(x, y, cx, cy, 0.7, 0.7) < 1) hu = 560;
	}
	return hu;
}
function huAbdomen(t, x, y) {
	const rx = lerp(17, 18.5, t),
		ry = lerp(12, 13, t);
	let hu = bodyBase(x, y, rx, ry, 1.6);
	if (hu <= -1000) return hu;
	if (t < 0.55 && ell(x, y, rx * 0.4, ry * 0.08, rx * 0.5, ry * 0.55) < 1) hu = 60 + rnd() * 12; // liver (right)
	if (t < 0.32 && ell(x, y, -rx * 0.5, -ry * 0.1, rx * 0.22, ry * 0.3) < 1) hu = 52; // spleen
	if (t < 0.42 && ell(x, y, -rx * 0.35, ry * 0.35, 2.4, 2.0) < 1) hu = rnd() < 0.5 ? -780 : 20; // stomach gas/fluid
	const kid = (cx) => ell(x, y, cx, -ry * 0.28, 1.7, 2.4);
	if (t > 0.18 && t < 0.72) {
		if (kid(rx * 0.5) < 1) hu = kid(rx * 0.5) > 0.5 ? 32 : 12;
		if (kid(-rx * 0.5) < 1) hu = kid(-rx * 0.5) > 0.5 ? 32 : 12;
	}
	if (ell(x, y, 0, -ry * 0.6, 1.8, 1.6) < 1) hu = ell(x, y, 0, -ry * 0.6, 0.9, 0.8) < 1 ? 150 : 420; // vertebra
	if (ell(x, y, 0, -ry * 0.48, 0.6, 0.6) < 1) hu = -30; // canal
	if (ell(x, y, -1.2, -ry * 0.34, 0.7, 0.7) < 1) hu = 42; // aorta
	if (ell(x, y, 1.4, -ry * 0.32, 0.9, 0.7) < 1) hu = 40; // IVC
	// central bowel with gas
	if (ell(x, y, 0, ry * 0.15, rx * 0.5, ry * 0.5) < 1 && hu === 45) {
		if (rnd() < 0.12) hu = -820;
		else if (rnd() < 0.1) hu = 15;
	}
	return hu;
}
function huHead(t, x, y) {
	const rx = lerp(6.5, 9, t),
		ry = lerp(7.5, 10, t);
	const e = ell(x, y, 0, 0, rx, ry);
	if (e > 1) return -1000;
	if (t > 0.82) {
		// orbit/sinus level
		if (ell(x, y, -3, ry * 0.2, 1.5, 1.5) < 1 || ell(x, y, 3, ry * 0.2, 1.5, 1.5) < 1) return 30; // globes
		if (ell(x, y, 0, ry * 0.35, 2.2, 1.6) < 1) return -900; // sinus air
	}
	if (ell(x, y, 0, 0, rx - 1.0, ry - 1.0) > 1) return 780 + rnd() * 120; // skull cortex
	let hu = 36 + rnd() * 6; // brain
	if (ell(x, y, 0, ry * 0.05, 0.35, 0.9) < 1) hu = 48; // falx (midline)
	if (
		t > 0.35 &&
		t < 0.75 &&
		(ell(x, y, -1.1, ry * 0.1, 0.9, 1.5) < 1 || ell(x, y, 1.1, ry * 0.1, 0.9, 1.5) < 1)
	)
		hu = 12; // lateral ventricles
	return hu;
}

/* build one axial slice HU buffer at normalized level t */
function genSliceHU(region, t) {
	noiseSeed = ((t * 99991) | 0) ^ 0x5f3759df; // stable per level
	const dfov = S.proto.dfov,
		buf = new Float32Array(REC * REC);
	for (let r = 0; r < REC; r++) {
		const y = (0.5 - r / (REC - 1)) * dfov;
		for (let c = 0; c < REC; c++) {
			const x = (c / (REC - 1) - 0.5) * dfov;
			buf[r * REC + c] = sampleHU(region, t, x, y);
		}
	}
	return buf;
}
/* window/level → paint a HU buffer onto the axial canvas */
function paintHU(buf) {
	const W = Math.max(1, S.ww),
		L = S.wl,
		low = L - 0.5 - (W - 1) / 2,
		high = L - 0.5 + (W - 1) / 2,
		img = axCtx.createImageData(REC, REC),
		d = img.data;
	for (let i = 0; i < buf.length; i++) {
		const h = buf[i];
		let v;
		if (h <= low) v = 0;
		else if (h > high) v = 255;
		else v = Math.round(((h - (L - 0.5)) / (W - 1) + 0.5) * 255);
		v = v < 0 ? 0 : v > 255 ? 255 : v;
		const k = i * 4;
		d[k] = d[k + 1] = d[k + 2] = v;
		d[k + 3] = 255;
	}
	axCtx.putImageData(img, 0, 0);
}
function autoWindow() {
	if (!S.sliceHU || !S.sliceHU.length) return;
	const src = S.sliceHU[S.curSlice],
		vals = [];
	for (let i = 0; i < src.length; i += 2) {
		const h = src[i];
		if (h > -900 && h < 1800) vals.push(h);
	}
	if (vals.length < 20) return;
	vals.sort((a, b) => a - b);
	const q = (p) => vals[Math.max(0, Math.min(vals.length - 1, Math.floor((vals.length - 1) * p)))];
	const lo = q(0.06),
		hi = q(0.94);
	setWL(Math.max(60, Math.min(2500, Math.round(hi - lo))), Math.round((hi + lo) / 2));
	document.querySelectorAll('#wlGrid .chip').forEach((c) => c.classList.remove('active'));
}
let hoverHU = null;
function repaintCurrent() {
	if (!S.sliceHU || !S.sliceHU.length) {
		return;
	}
	paintHU(S.sliceHU[S.curSlice]);
	const t = S.sliceLevels[S.curSlice];
	const tablePos = levelToTablePos(t);
	document.getElementById('axTL').innerHTML =
		`${S.proto.name}<br>Slice ${S.curSlice + 1}/${S.sliceHU.length}`;
	document.getElementById('axTR').innerHTML =
		`WW ${S.ww} · WL ${S.wl}<br>${S.proto.slice.toFixed(1)} mm`;
	document.getElementById('axBL').innerHTML = `${S.techKv} kVp · ${S.techMas} mAs`;
	document.getElementById('axBR').innerHTML = `Table ${tablePos}<br>DFOV ${S.proto.dfov} cm`;
	document.getElementById('axMeta').textContent = hoverHU == null ? '— HU' : `${hoverHU} HU`;
}
function levelToTablePos(t) {
	const [a, b] = spanOf(S.proto);
	const cm = lerp(a, b, t);
	return 'S' + cm.toFixed(1);
}

/* ---- topogram (scout) : stylised AP projection with scan-range brackets + slice line ---- */
const topoCanvas = document.getElementById('topoCanvas'),
	topoCtx = topoCanvas.getContext('2d');
const TOPO_W = topoCanvas.width,
	TOPO_H = topoCanvas.height;
function drawScoutReal(sliceLineT = null) {
	const g = topoCtx,
		W = TOPO_W,
		H = TOPO_H;
	g.clearRect(0, 0, W, H);
	g.fillStyle = '#000';
	g.fillRect(0, 0, W, H);
	const V = REALV[S.proto.dataKey];
	if (!V || !V.loaded) return;
	const mTop = 30,
		mBot = H - 16,
		yOf = (t) => lerp(mTop, mBot, t),
		availH = mBot - mTop;
	const gap = 10,
		x0 = 18,
		colW = (W - 18 * 2 - gap) / 2;
	const panes = [
		['AP', V.scoutAP, x0],
		['LAT', V.scoutLAT, x0 + colW + gap]
	];
	g.imageSmoothingEnabled = true;
	panes.forEach(([lab, sc, px]) => {
		if (sc) g.drawImage(sc, px, mTop, colW, availH);
		g.strokeStyle = '#22323f';
		g.lineWidth = 1;
		g.strokeRect(px, mTop, colW, availH);
		g.fillStyle = '#8ff0e6';
		g.font = '700 10px ui-monospace,monospace';
		g.textAlign = 'center';
		g.fillText(lab, px + colW / 2, mTop - 9);
	});
	g.textAlign = 'left';
	const y1 = yOf(S.rangeStart / 100),
		y2 = yOf(S.rangeEnd / 100);
	g.fillStyle = 'rgba(53,214,196,0.10)';
	g.fillRect(x0, Math.min(y1, y2), W - 36, Math.abs(y2 - y1));
	g.strokeStyle = '#35d6c4';
	g.lineWidth = 2;
	[y1, y2].forEach((y) => {
		g.beginPath();
		g.moveTo(x0, y);
		g.lineTo(W - 18, y);
		g.stroke();
	});
	g.fillStyle = '#8ff0e6';
	g.font = '9px ui-monospace,monospace';
	g.fillText('START', x0 + 2, y1 - 3);
	g.fillText('END', x0 + 2, y2 + 11);
	if (sliceLineT != null) {
		const ys = yOf(sliceLineT);
		g.strokeStyle = '#f5b53d';
		g.lineWidth = 1.4;
		g.setLineDash([4, 3]);
		g.beginPath();
		g.moveTo(x0, ys);
		g.lineTo(W - 18, ys);
		g.stroke();
		g.setLineDash([]);
	}
	g.fillStyle = '#7f97ac';
	g.font = '9px ui-monospace,monospace';
	g.textAlign = 'center';
	g.fillText('SUP', W / 2, 14);
	g.fillText('INF', W / 2, H - 4);
	g.textAlign = 'left';
	const tp = document.getElementById('topoMeta');
	if (tp) tp.textContent = 'AP · LAT';
	document.getElementById('topoCornerTL').innerHTML = `${S.proto.name}<br>Scout · AP + Lateral DRR`;
}
function drawTopogram(sliceLineT = null) {
	if (S.proto && S.proto.real) {
		return drawScoutReal(sliceLineT);
	}
	const g = topoCtx,
		W = TOPO_W,
		H = TOPO_H;
	g.clearRect(0, 0, W, H);
	g.fillStyle = '#000';
	g.fillRect(0, 0, W, H);
	const region = S.proto.region,
		mTop = 26,
		mBot = H - 16,
		cx = W / 2;
	// body silhouette (superior→inferior) as a filled path in grayscale
	const prof = []; // half-width per level
	const N = 40;
	for (let i = 0; i <= N; i++) {
		const t = i / N;
		let hw;
		if (region === 'pelvis') hw = lerp(46, 34, t) * (t < 0.15 ? lerp(0.7, 1, t / 0.15) : 1);
		else if (region === 'thorax') hw = lerp(38, 50, t);
		else if (region === 'abdomen') hw = lerp(48, 52, t);
		else hw = lerp(20, 30, t);
		prof.push(hw * 0.9);
	}
	const yOf = (t) => lerp(mTop, mBot, t);
	g.beginPath();
	g.moveTo(cx - prof[0], yOf(0));
	for (let i = 0; i <= N; i++) g.lineTo(cx - prof[i], yOf(i / N));
	for (let i = N; i >= 0; i--) g.lineTo(cx + prof[i], yOf(i / N));
	g.closePath();
	const grd = g.createLinearGradient(cx - 60, 0, cx + 60, 0);
	grd.addColorStop(0, '#3a3a3a');
	grd.addColorStop(0.5, '#8a8a8a');
	grd.addColorStop(1, '#3a3a3a');
	g.fillStyle = grd;
	g.fill();
	// spine column
	g.strokeStyle = '#dcdcdc';
	g.lineWidth = 6;
	g.beginPath();
	g.moveTo(cx, yOf(0.02));
	g.lineTo(cx, yOf(0.98));
	g.stroke();
	g.strokeStyle = '#111';
	g.lineWidth = 1;
	for (let i = 1; i < 24; i++) {
		const y = lerp(yOf(0.05), yOf(0.95), i / 24);
		g.beginPath();
		g.moveTo(cx - 4, y);
		g.lineTo(cx + 4, y);
		g.stroke();
	}
	// region-specific bright bone
	g.fillStyle = '#f2f2f2';
	if (region === 'pelvis') {
		g.beginPath();
		g.ellipse(cx, yOf(0.5), 34, 26, 0, 0, 7);
		g.fill('evenodd');
		g.strokeStyle = '#f4f4f4';
		g.lineWidth = 7;
		g.beginPath();
		g.arc(cx, yOf(0.45), 30, Math.PI * 0.15, Math.PI * 0.85);
		g.stroke();
		g.lineWidth = 8;
		g.beginPath();
		g.moveTo(cx - 8, yOf(0.86));
		g.lineTo(cx - 8, yOf(0.99));
		g.moveTo(cx + 8, yOf(0.86));
		g.lineTo(cx + 8, yOf(0.99));
		g.stroke();
	} else if (region === 'thorax') {
		g.fillStyle = '#111';
		g.beginPath();
		g.ellipse(cx - 20, yOf(0.5), 16, 44, 0, 0, 7);
		g.ellipse(cx + 20, yOf(0.5), 16, 44, 0, 0, 7);
		g.fill();
		g.strokeStyle = '#c9c9c9';
		g.lineWidth = 2;
		for (let i = 0; i < 9; i++) {
			const y = lerp(yOf(0.2), yOf(0.8), i / 9);
			g.beginPath();
			g.arc(cx - 22, y, 17, -0.6, 0.6);
			g.arc(cx + 22, y, 17, Math.PI - 0.6, Math.PI + 0.6);
			g.stroke();
		}
	} else if (region === 'head') {
		g.strokeStyle = '#f4f4f4';
		g.lineWidth = 6;
		g.beginPath();
		g.ellipse(cx, yOf(0.35), 24, 30, 0, 0, 7);
		g.stroke();
	}
	// scan-range brackets
	const y1 = yOf(S.rangeStart / 100),
		y2 = yOf(S.rangeEnd / 100);
	g.strokeStyle = '#35d6c4';
	g.lineWidth = 2;
	g.setLineDash([]);
	[y1, y2].forEach((y) => {
		g.beginPath();
		g.moveTo(18, y);
		g.lineTo(W - 18, y);
		g.stroke();
		g.fillStyle = '#35d6c4';
		g.fillRect(14, y - 1, 6, 2);
		g.fillRect(W - 20, y - 1, 6, 2);
	});
	g.fillStyle = 'rgba(53,214,196,0.10)';
	g.fillRect(18, Math.min(y1, y2), W - 36, Math.abs(y2 - y1));
	g.fillStyle = '#8ff0e6';
	g.font = '10px ui-monospace,monospace';
	g.fillText('START', 22, y1 - 4);
	g.fillText('END', 22, y2 + 12);
	// current slice line
	if (sliceLineT != null) {
		const ys = yOf(sliceLineT);
		g.strokeStyle = '#f5b53d';
		g.lineWidth = 1.5;
		g.setLineDash([4, 3]);
		g.beginPath();
		g.moveTo(14, ys);
		g.lineTo(W - 14, ys);
		g.stroke();
		g.setLineDash([]);
	}
	// orientation
	g.fillStyle = '#7f97ac';
	g.font = '9px ui-monospace,monospace';
	g.textAlign = 'center';
	g.fillText('SUP', cx, 16);
	g.fillText('INF', cx, H - 4);
	g.textAlign = 'left';
	document.getElementById('topoCornerTL').innerHTML = `${S.proto.name}<br>Scout · AP`;
}

/* ============================================================
   3) CONSOLE LOGIC / WORKFLOW
   ============================================================ */
const $ = (id) => document.getElementById(id);
const log = (msg, cls = '') => {
	const l = $('log');
	const t = new Date().toLocaleTimeString([], { hour12: false });
	const d = document.createElement('div');
	d.innerHTML = `<span class="t">${t}</span> <span class="${cls}">${msg}</span>`;
	l.prepend(d);
	while (l.children.length > 60) l.lastChild.remove();
};
function setStatus(text, cls) {
	const s = $('statusLine');
	s.className = 'status-line ' + (cls || '');
	$('statusText').textContent = text;
}
function setXray(on) {
	$('xrayInd').classList.toggle('on', on);
}

/* build protocol chips */
function buildProtocols() {
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
function buildWL() {
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
function buildSteps() {
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
function setStep(n) {
	S.step = n;
	$('conStep').textContent =
		`Step ${n} · ${['', 'Protocol', 'Habitus / Technique', 'Position', 'Topogram', 'Range', 'Scan'][n]}`;
	document.querySelectorAll('#workflowSteps .step').forEach((el) => {
		const k = +el.dataset.step;
		el.classList.toggle('done', k < n);
		el.classList.toggle('cur', k === n);
	});
}

function setProto(key) {
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
function setWL(ww, wl) {
	S.ww = Math.max(20, Math.min(4000, Math.round(ww)));
	S.wl = Math.max(-1200, Math.min(1600, Math.round(wl)));
	$('wwSlider').value = S.ww;
	$('wlSlider').value = S.wl;
	$('wwLbl').textContent = S.ww;
	$('wlLbl').textContent = S.wl;
	if (S.sliceHU && S.sliceHU.length) repaintCurrent();
}

/* range */
function updateRangeLabels() {
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
function moveCouch(dx, dy, dz) {
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
function setIso() {
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

/* topogram */
function acquireTopogram() {
	if (!S.proto || S.scanning) return;
	if (!S.techniqueValidated) {
		setStatus('Validate habitus & technique first', 'busy');
		log('Imaging blocked — technique has not been validated.', 'warn');
		return;
	}
	if (!S.isoSet) {
		setStatus('Set isocenter before scout', 'busy');
		log('Imaging blocked — patient positioning/isocenter is incomplete.', 'warn');
		return;
	}
	setStatus('Acquiring topogram…', 'busy');
	setXray(true);
	log('Topogram (scout) acquisition…', 'warn');
	$('btnTopogram').disabled = true;
	let p = 0;
	const iv = setInterval(() => {
		p += 0.12;
		drawTopogram(p < 1 ? p : null);
		if (p >= 1) {
			clearInterval(iv);
			setXray(false);
			S.topoAcquired = true;
			$('topoHint').style.display = 'none';
			['rangeStart', 'rangeEnd'].forEach((id) => ($(id).disabled = false));
			$('btnScan').disabled = false;
			$('btnTopogram').disabled = false;
			drawTopogram();
			updateRangeLabels();
			setStatus('Topogram ready — plan range', 'rdy');
			setStep(5);
			log('Topogram ready. Define the scan range on the scout.', 'ok');
		}
	}, 40);
}

/* scan */
let scanTimer = null;
function startScan() {
	if (!S.topoAcquired || S.scanning) return;
	if (!S.techniqueValidated) {
		setStatus('Technique validation required', 'busy');
		log('Scan blocked — revalidate technique before acquisition.', 'warn');
		return;
	}
	const t0 = S.rangeStart / 100,
		t1 = S.rangeEnd / 100;
	let plan = [];
	if (S.proto.real) {
		const V = REALV[S.proto.dataKey],
			N = V.meta.n;
		const i0 = Math.round(t0 * (N - 1)),
			i1 = Math.round(t1 * (N - 1));
		const lo = Math.min(i0, i1),
			hi = Math.max(i0, i1);
		for (let idx = lo; idx <= hi; idx++) plan.push({ buf: V.slices[idx], t: idx / (N - 1) });
	} else {
		const [a, b] = spanOf(S.proto);
		const cmLen = lerp(a, b, t1) - lerp(a, b, t0);
		const nn = Math.max(4, Math.round((cmLen * 10) / S.proto.slice));
		for (let i = 0; i < nn; i++) {
			const f = i / (nn - 1 || 1);
			plan.push({ t: lerp(t0, t1, f), gen: true });
		}
	}
	const n = plan.length;
	S.scanning = true;
	S.sliceHU = [];
	S.sliceLevels = [];
	S.curSlice = 0;
	setStep(6);
	setStatus('Scanning…', 'busy');
	setXray(true);
	$('btnScan').disabled = true;
	$('btnStop').disabled = false;
	$('btnTopogram').disabled = true;
	document.querySelectorAll('.mb,[data-couch]').forEach((b) => (b.disabled = true));
	$('btnSetIso').disabled = true;
	$('axHint').style.display = 'none';
	$('progFill').classList.add('live');
	log(
		`${S.proto.real ? 'Loading real axial series' : 'Axial acquisition'} — ${n} slices @ ${S.proto.slice.toFixed(1)} mm, ${S.techKv} kVp / ${S.techMas} mAs.`,
		'warn'
	);
	const couchA = 12,
		couchB = -14;
	let i = 0;
	scanTimer = setInterval(
		() => {
			if (!S.scanning) {
				clearInterval(scanTimer);
				return;
			}
			const item = plan[i],
				f = i / (n - 1 || 1);
			S.couchZ = lerp(couchA, couchB, f); // index the table through the bore
			$('couchZval').textContent = 'Z ' + S.couchZ.toFixed(1);
			$('botCouchZ').textContent = S.couchZ.toFixed(1);
			const buf = item.gen ? genSliceHU(S.proto.region, item.t) : item.buf;
			S.sliceHU.push(buf);
			S.sliceLevels.push(item.t);
			S.curSlice = S.sliceHU.length - 1;
			repaintCurrent();
			drawTopogram(item.t);
			const pct = Math.round(((i + 1) / n) * 100);
			$('progFill').style.width = pct + '%';
			$('progPct').textContent = pct + '%';
			$('progText').textContent = `Acquiring slice ${i + 1} / ${n}`;
			$('acqSlices').textContent = S.sliceHU.length;
			i++;
			if (i >= n) {
				clearInterval(scanTimer);
				finishScan();
			}
		},
		S.proto.real ? 45 : 70
	);
}
function finishScan() {
	S.scanning = false;
	setXray(false);
	$('progFill').classList.remove('live');
	$('btnStop').disabled = true;
	$('btnScan').disabled = false;
	$('btnTopogram').disabled = false;
	$('btnSetIso').disabled = false;
	document.querySelectorAll('.mb,[data-couch]').forEach((b) => (b.disabled = false));
	const n = S.sliceHU.length;
	$('sliceScroll').disabled = false;
	$('sliceScroll').max = n - 1;
	$('sliceScroll').value = n - 1;
	S.curSlice = n - 1;
	$('sliceLabel').textContent = `${n} / ${n}`;
	repaintCurrent();
	drawTopogram(S.sliceLevels[n - 1]);
	setStatus('Scan complete — review series', 'rdy');
	setStep(6);
	window.parent?.postMessage(
		{
			type: 'rtapps-ct-complete',
			key: S.proto?.key || '',
			patient: S.proto?.patient || '',
			series: S.proto?.series || '',
			images: n
		},
		'*'
	);
	$('progText').textContent = `Series complete · ${n} images`;
	log(`Reconstruction complete — <b>${n}</b> axial images. Scroll to review.`, 'ok');
}
function stopScan() {
	if (!S.scanning) return;
	S.scanning = false;
	if (scanTimer) clearInterval(scanTimer);
	setXray(false);
	$('progFill').classList.remove('live');
	$('btnStop').disabled = true;
	$('btnScan').disabled = false;
	$('btnTopogram').disabled = false;
	$('btnSetIso').disabled = false;
	document.querySelectorAll('.mb,[data-couch]').forEach((b) => (b.disabled = false));
	const n = S.sliceHU ? S.sliceHU.length : 0;
	if (n > 0) {
		$('sliceScroll').disabled = false;
		$('sliceScroll').max = n - 1;
		$('sliceScroll').value = n - 1;
		S.curSlice = n - 1;
		$('sliceLabel').textContent = `${n} / ${n}`;
		repaintCurrent();
	}
	setStatus('Scan stopped', 'busy');
	log('Acquisition stopped by operator.', 'hot');
}
function reviewSlice(i) {
	if (!S.sliceHU || !S.sliceHU.length) return;
	S.curSlice = Math.max(0, Math.min(S.sliceHU.length - 1, i));
	$('sliceLabel').textContent = `${S.curSlice + 1} / ${S.sliceHU.length}`;
	repaintCurrent();
	drawTopogram(S.sliceLevels[S.curSlice]);
}

/* ---- HU cursor on the axial image ---- */
axCanvas.addEventListener('mousemove', (e) => {
	if (!S.sliceHU || !S.sliceHU.length) {
		return;
	}
	const r = axCanvas.getBoundingClientRect();
	const cx = Math.floor(((e.clientX - r.left) / r.width) * REC),
		cy = Math.floor(((e.clientY - r.top) / r.height) * REC);
	if (cx < 0 || cy < 0 || cx >= REC || cy >= REC) {
		hoverHU = null;
	} else {
		hoverHU = Math.round(S.sliceHU[S.curSlice][cy * REC + cx]);
	}
	$('axMeta').textContent = hoverHU == null ? '— HU' : `${hoverHU} HU  (${cx},${cy})`;
});
axCanvas.addEventListener('mouseleave', () => {
	hoverHU = null;
	$('axMeta').textContent = '— HU';
});

/* ============================================================
   4) WIRE UP
   ============================================================ */
function wire() {
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

/* boot */
initThree();
wire();
setStatus('Select a scan protocol to begin', 'busy');
log('CT Simulation Suite ready. Select a scan protocol to begin.', '');
log(
	'Workflow: protocol → habitus/technique → position &amp; isocenter → topogram → range → scan.',
	''
);
// auto-load pelvis so the console isn't empty
setProto('prostate');

/* ===== RTApps parent workstation bridge ===== */
window.addEventListener('message', (ev) => {
	const d = ev.data || {};
	if (d.type === 'rtapps-ct-view') {
		document.body.classList.toggle('rtapps-room-mode', d.view === 'room');
		document.body.classList.toggle('rtapps-console-mode', d.view === 'console');
		setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
	}
	if (d.type === 'rtapps-ct-case' && d.key && PROTOCOLS[d.key]) {
		setProto(d.key);
		window.parent?.postMessage(
			{
				type: 'rtapps-ct-case-loaded',
				key: d.key,
				patient: PROTOCOLS[d.key].patient,
				protocol: PROTOCOLS[d.key].name,
				series: PROTOCOLS[d.key].series
			},
			'*'
		);
	}
});
document.body.classList.add('rtapps-room-mode');
const rtappsEmbedBadge = document.createElement('div');
rtappsEmbedBadge.className = 'rtapps-embedded-badge';
rtappsEmbedBadge.textContent = 'RTApps · CT Simulation Workspace';
document.body.appendChild(rtappsEmbedBadge);
window.parent?.postMessage({ type: 'rtapps-ct-ready' }, '*');
