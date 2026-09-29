import * as THREE from 'three-linac';
import { S } from './state';
import { cameraSceneA, cameraSceneB, cameraSceneC } from './dom';
import { GANTRY_PLANE_Z_TARGET } from './scene';

export const cctvFeeds = [];

export function setupCCTVFeeds() {
	if (!Array.isArray(cctvFeeds)) return;
	cctvFeeds.length = 0;
	const defs = [
		{
			container: cameraSceneA,
			pos: [-0.4, 9.2, GANTRY_PLANE_Z_TARGET + 0.4],
			look: [0.0, 1.15, GANTRY_PLANE_Z_TARGET - 0.25],
			fov: 34
		},
		{
			container: cameraSceneB,
			pos: [7.2, 2.25, GANTRY_PLANE_Z_TARGET + 0.35],
			look: [0.1, 1.15, GANTRY_PLANE_Z_TARGET - 0.2],
			fov: 37
		},
		{ container: cameraSceneC, pos: [-10.9, 2.4, 5.15], look: [-2.6, 1.55, 1.6], fov: 42 }
	];
	defs.forEach((def) => {
		if (!def.container) return;
		def.container.innerHTML = '';
		let feedRenderer;
		try {
			feedRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
		} catch (err) {
			console.warn('CCTV renderer unavailable for', def.container?.id, err);
			return;
		}
		feedRenderer.setPixelRatio(1);
		feedRenderer.setClearColor(0x07131d, 1);
		feedRenderer.domElement.className = 'cctv-canvas';
		def.container.appendChild(feedRenderer.domElement);
		const feedCamera = new THREE.PerspectiveCamera(def.fov, 1, 0.1, 120);
		feedCamera.position.set(...def.pos);
		feedCamera.lookAt(new THREE.Vector3(...def.look));
		cctvFeeds.push({
			container: def.container,
			renderer: feedRenderer,
			camera: feedCamera,
			look: new THREE.Vector3(...def.look),
			type: def.container.id
		});
	});
	resizeCCTVFeeds();
}
const CCTV_MAX_BUFFER_W = 512;
function resizeCCTVFeeds() {
	cctvFeeds.forEach((feed) => {
		const w = Math.max(120, feed.container.clientWidth || 260);
		const h = Math.max(70, feed.container.clientHeight || 82);
		feed.camera.aspect = w / h;
		feed.camera.updateProjectionMatrix();
		// RTApps perf pass: cap the internal drawing-buffer size independent of the
		// container's CSS size (updateStyle=false, unchanged) — keeps aspect, softens the
		// monitor-prop image on large layouts instead of rendering a full-res scene 3x/frame.
		const scale = w > CCTV_MAX_BUFFER_W ? CCTV_MAX_BUFFER_W / w : 1;
		feed.renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
	});
}
export function updateCCTVFeeds() {
	if (!Array.isArray(cctvFeeds) || !S.scene) return;
	// RTApps perf pass: the CCTV monitors re-rendered the WHOLE scene up to 3 extra times
	// EVERY frame; ~9Hz is visually identical on a monitor prop (same rate the hub uses).
	const nowMs = performance.now();
	if (nowMs - ((updateCCTVFeeds as { _last?: number })._last || 0) < 110) return;
	(updateCCTVFeeds as { _last?: number })._last = nowMs;
	cctvFeeds.forEach((feed) => {
		if (feed.container.offsetParent === null) return;
		if (feed.type === 'cameraSceneA') {
			feed.camera.position.set(-0.4, 9.2, GANTRY_PLANE_Z_TARGET + 0.4);
			feed.look.set(0.0, 1.15, GANTRY_PLANE_Z_TARGET - 0.25);
		} else if (feed.type === 'cameraSceneB') {
			feed.camera.position.set(7.2, 2.25, GANTRY_PLANE_Z_TARGET + 0.35);
			feed.look.set(0.1, 1.15, GANTRY_PLANE_Z_TARGET - 0.2);
		} else if (feed.type === 'cameraSceneC') {
			feed.camera.position.set(-10.9, 2.4, 5.15);
			feed.look.set(-2.6, 1.55, 1.6);
		}
		feed.camera.lookAt(feed.look);
		try {
			feed.renderer.render(S.scene, feed.camera);
		} catch (err) {
			if (!feed.renderErrorLogged) {
				console.warn('CCTV feed render skipped:', feed.type, err);
				feed.renderErrorLogged = true;
			}
		}
	});
}
