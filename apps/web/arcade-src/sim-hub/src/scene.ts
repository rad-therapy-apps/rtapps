/* RTApps (#77 sim-hub modularization, task 4): renderer/camera/light bootstrap, resize
   handling, adaptive perf floor, and ambient audio. Verbatim extractions from main.js —
   the top-of-script scene/camera/renderer/orbit/label-renderer setup plus the hemisphere+sun
   lights, `resize`, `PERF_FLOOR`/`updatePerfFloor`, and `AMBIENCE`/`initAmbience`/
   `ambienceProfile`/`updateAmbience`. `toast` is owned by ./interact.js (task 8's UI toast
   widget) and imported back here for the perf-floor "Reduced graphics" message. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { S } from './state';
import { toast } from './interact';

export const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({
	canvas,
	antialias: window.devicePixelRatio <= 1,
	powerPreference: 'high-performance'
});
/* RTApps perf pass: pixel-ratio cap 1.7→1.25 and PCFSoft→PCF shadows — the walkable world was
   rendering ~2x the pixels it needed on retina screens with the most expensive shadow filter. */
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc3d2);
scene.fog = new THREE.FogExp2(0xa7c3cf, 0.0033);
export const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.08, 280);
camera.position.set(12, 82, 92);
export const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.id = 'labels';
document.body.appendChild(labelRenderer.domElement);
export const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.075;
orbit.target.set(8, 0, -12);
orbit.maxPolarAngle = Math.PI / 2.07;
orbit.minDistance = 18;
orbit.maxDistance = 155;
orbit.enablePan = false;
orbit.zoomSpeed = 0.55;
orbit.rotateSpeed = 0.48;

/* RTApps perf pass 2: ~55 per-room/lobby PointLights removed below — in a forward renderer every
   lit fragment paid for every light. Hemisphere intensity raised to keep interiors bright; the
   emissive fixture boxes (brightened in addRoomLighting/buildHubLobby) keep the lit-fixture look. */
scene.add(new THREE.HemisphereLight(0xf4fbff, 0x63745f, 1.55));
const sun = new THREE.DirectionalLight(0xfff3dd, 1.34);
sun.position.set(-34, 58, 54);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -105;
sun.shadow.camera.right = 105;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
scene.add(sun);

function resize() {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
	labelRenderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

// Adaptive quality floor: on hardware that can't hold ~26 FPS for 5s straight, ratchet
// down once (shadows off, then pixel ratio 1.0) and never back up. `?hq` bypasses for demos.
export const PERF_FLOOR = {
	lvl: 0,
	acc: 0,
	n: 0,
	bad: 0,
	hq: new URLSearchParams(location.search).has('hq')
};
export function updatePerfFloor(dt) {
	const P = PERF_FLOOR;
	if (P.hq || P.lvl >= 2) return;
	P.acc += dt;
	P.n++;
	if (P.acc < 1) return;
	const fps = P.n / P.acc;
	P.acc = 0;
	P.n = 0;
	P.bad = fps < 26 ? P.bad + 1 : 0;
	if (P.bad < 5) return;
	P.bad = 0;
	P.lvl++;
	if (P.lvl === 1) {
		renderer.shadowMap.enabled = false;
		scene.traverse((o) => {
			if (o.isMesh && o.material) o.material.needsUpdate = true;
		});
		toast('<b>Reduced graphics</b><br>for smoother walking');
	} else renderer.setPixelRatio(1);
}

export const AMBIENCE = {
	ctx: null,
	master: null,
	compressor: null,
	noiseGain: null,
	humGain: null,
	hum2Gain: null,
	filter: null,
	on: false,
	lastRoom: null
};
export function initAmbience() {
	if (AMBIENCE.ctx) return;
	// Legacy vendor-prefixed fallback, not in the DOM lib's Window type — cast only.
	const AC =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!AC) return;
	const ctx = new AC(),
		master = ctx.createGain(),
		compressor = ctx.createDynamicsCompressor();
	master.gain.value = 0;
	compressor.threshold.value = -24;
	compressor.knee.value = 16;
	compressor.ratio.value = 3;
	compressor.attack.value = 0.02;
	compressor.release.value = 0.35;
	master.connect(compressor).connect(ctx.destination);
	const hum = ctx.createOscillator(),
		humGain = ctx.createGain();
	hum.type = 'sine';
	hum.frequency.value = 58;
	humGain.gain.value = 0.1;
	hum.connect(humGain).connect(master);
	hum.start();
	const hum2 = ctx.createOscillator(),
		hum2Gain = ctx.createGain();
	hum2.type = 'sine';
	hum2.frequency.value = 116;
	hum2Gain.gain.value = 0.025;
	hum2.connect(hum2Gain).connect(master);
	hum2.start();
	const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
		data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.34;
	const noise = ctx.createBufferSource();
	noise.buffer = buffer;
	noise.loop = true;
	const filter = ctx.createBiquadFilter(),
		noiseGain = ctx.createGain();
	filter.type = 'lowpass';
	filter.frequency.value = 900;
	noiseGain.gain.value = 0.075;
	noise.connect(filter).connect(noiseGain).connect(master);
	noise.start();
	Object.assign(AMBIENCE, { ctx, master, compressor, noiseGain, humGain, hum2Gain, filter });
}
export function ambienceProfile() {
	// S.activeRoom is `unknown` (Room has no interface yet, task 11); cast to the
	// minimal shape this function reads.
	const r = S.activeRoom as { id?: string; zone?: string } | null;
	const id = r?.id || '';
	if (id === 'vault1' || id === 'vault2')
		return { master: 0.44, noise: 0.115, hum: 0.145, hum2: 0.038, freq: 560 };
	if (id === 'linaccontrol')
		return { master: 0.35, noise: 0.07, hum: 0.085, hum2: 0.025, freq: 920 };
	if (id === 'ctsim') return { master: 0.39, noise: 0.095, hum: 0.11, hum2: 0.025, freq: 760 };
	if (id === 'ctcontrol') return { master: 0.32, noise: 0.065, hum: 0.074, hum2: 0.02, freq: 1000 };
	if (id === 'lobby') return { master: 0.3, noise: 0.105, hum: 0.03, hum2: 0.01, freq: 1500 };
	if (r?.zone === 'technical')
		return { master: 0.31, noise: 0.072, hum: 0.064, hum2: 0.018, freq: 1120 };
	return { master: 0.28, noise: 0.062, hum: 0.052, hum2: 0.015, freq: 1280 };
}
export function updateAmbience() {
	if (!AMBIENCE.on || !AMBIENCE.ctx || AMBIENCE.ctx.state !== 'running') return;
	const p = ambienceProfile(),
		t = AMBIENCE.ctx.currentTime;
	AMBIENCE.master.gain.setTargetAtTime(p.master, t, 0.18);
	AMBIENCE.noiseGain.gain.setTargetAtTime(p.noise, t, 0.28);
	AMBIENCE.humGain.gain.setTargetAtTime(p.hum, t, 0.28);
	AMBIENCE.hum2Gain.gain.setTargetAtTime(p.hum2, t, 0.28);
	AMBIENCE.filter.frequency.setTargetAtTime(p.freq, t, 0.35);
}
