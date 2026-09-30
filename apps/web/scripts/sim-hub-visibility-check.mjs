// sim-hub visibility invariant check.
//
// What it proves: room/portal/actor culling never hides a mesh that would actually be on screen.
// For each sample pose the page is rendered twice into an ID buffer (every mesh gets a unique flat
// colour, pixels are read back), once with culling OFF and once with culling ON. The set of mesh
// ids that reach at least one pixel must be identical. A mesh on screen with culling OFF but
// missing with it ON is a failure, reported with mesh name, room and pose. Nothing is tolerated.
//
// Poses (all with the player/camera in a non-overview mode, so culling is live):
//   - every room: walk pose (room centre, eye height 1.65) and guided pose (the room's `cam`/`look`),
//     four headings each (0/90/180/270 degrees about the vertical axis)
//   - 6 hallway points (2.5 m outside a room door), four headings each
//   - 2 poses in linaccontrol looking at the wall monitors, 1 in ctcontrol looking through the glass
//     into ctsim
//
// ON pass = production behaviour: applyVisibility(camera) runs, then the ID buffer is rendered with
// the same camera, so layer-culled actors (layers.mask = 2) are excluded exactly as in the real
// render. OFF pass = applyVisibility with culling disabled (every room group shown, every actor on
// the visible layer), so actors are rendered too. Transparent meshes (glass) are handled as in the
// perf harness: an opaque-only pass (glass hidden, so it does not occlude what is behind it) plus a
// full pass that credits only the glass meshes themselves.
//
// Animated movers: the page's requestAnimationFrame loop is stopped (frozen) once the scene has
// loaded, so no updateMovers/animations/camera code runs between or during the renders. Every pose
// is set by writing the camera directly, then OFF and ON are rendered back to back from identical
// scene state. The first poses also render OFF twice and must match (determinism self-check,
// exit code 2 if not).
//
// Informational only: "drawn-but-hidden" = meshes the ON pass sends to the GPU (visible chain, layer
// test, frustum test) that contribute no pixel (occluded or behind others). Not a failure.
//
// Requires a test hook in visibility.ts that exists only with `?visibilitycheck` in the URL
// (applyVisibility, a culling on/off switch, ROOMS, two three.js classes). Inert otherwise.
//
// How to run (from the repo root; this script builds nothing):
//   pnpm --filter web build:arcade          # produces apps/web/arcade/sim-hub/
//   node apps/web/scripts/sim-hub-visibility-check.mjs
// Env: ANGLE=metal|default|swiftshader (default swiftshader: works headless without a GPU, slower;
//      a real GPU, e.g. ANGLE=metal on macOS, is recommended), WIDTH/HEIGHT (default 960x540),
//      HEADED=1, ONLY=<substring of pose name> to run a subset, VERBOSE=1 to list every pose.
// Serves apps/web/arcade/sim-hub/ and apps/web/static/arcade/ (rtapps-sdk.js) on 127.0.0.1.
// Exit codes: 0 all poses equal; 1 a mesh visible with culling OFF is missing with it ON;
//             2 setup/determinism error (build missing, no page hook, unstable scene).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const SIMHUB_DIR = path.join(WEB, 'arcade/sim-hub');
const STATIC_ARCADE = path.join(WEB, 'static/arcade');
const { chromium } = createRequire(path.join(WEB, 'package.json'))('playwright');

if (!fs.existsSync(path.join(SIMHUB_DIR, 'index.html'))) {
	console.error(`Missing ${SIMHUB_DIR}/index.html. Run: pnpm --filter web build:arcade`);
	process.exit(2);
}

const ANGLE = process.env.ANGLE || 'swiftshader';
const WIDTH = Number(process.env.WIDTH || 960);
const HEIGHT = Number(process.env.HEIGHT || 540);
const ONLY = process.env.ONLY || '';
const VERBOSE = !!process.env.VERBOSE;

const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.json': 'application/json'
};
const srv = http.createServer((req, res) => {
	const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	let file = null;
	if (u.startsWith('/arcade/sim-hub/'))
		file = path.join(SIMHUB_DIR, u.slice('/arcade/sim-hub/'.length) || 'index.html');
	else if (u.startsWith('/arcade/')) file = path.join(STATIC_ARCADE, u.slice('/arcade/'.length));
	if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
		res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
		fs.createReadStream(file).pipe(res);
	} else {
		res.writeHead(404);
		res.end();
	}
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/arcade/sim-hub/`;

const args = ['--ignore-gpu-blocklist', '--enable-webgl'];
if (ANGLE !== 'default') args.push(`--use-angle=${ANGLE}`);
if (ANGLE === 'swiftshader') args.push('--enable-unsafe-swiftshader');
const browser = await chromium.launch({ headless: !process.env.HEADED, args });
const page = await (
	await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
).newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

// Runs before the app: capture renderer/scene/main camera through three's devtools observe event
// (no source edits) and make the app's rAF loop stoppable.
await page.addInitScript(() => {
	const S = (window.__V = { renderer: null, scene: null, camera: null, frozen: false, frames: 0 });
	const dt = new EventTarget();
	dt.addEventListener('observe', (e) => {
		const d = e.detail;
		if (d && d.isScene && !S.scene) S.scene = d;
		else if (d && d.shadowMap && typeof d.render === 'function' && !S.renderer) {
			S.renderer = d;
			const orig = d.render;
			d.render = function (scene, camera) {
				if (!d.getRenderTarget()) S.camera = camera;
				return orig.call(this, scene, camera);
			};
		}
	});
	window.__THREE_DEVTOOLS__ = dt;
	const raf = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = (cb) =>
		raf((ts) => {
			if (S.frozen) return; // loop ends: nothing animates or moves the camera any more
			S.frames++;
			return cb(ts);
		});
});

await page.goto(base + '?hq&visibilitycheck', { waitUntil: 'load' });
try {
	await page.waitForFunction(
		() =>
			window.__V.renderer &&
			window.__V.scene &&
			window.__V.camera &&
			window.__simHubVisibility &&
			window.__V.frames > 20,
		null,
		{ timeout: 90000 }
	);
} catch {
	console.error(
		'Page never exposed renderer/scene/camera/__simHubVisibility (built without the hook?). Rebuild.'
	);
	console.error(pageErrors.slice(0, 5).join('\n'));
	await browser.close();
	srv.close();
	process.exit(2);
}
// Leave overview (culling is bypassed there) and let the mode switch settle, then stop time.
await page.evaluate(() => document.querySelector('#modeSeg button[data-mode="walk"]').click());
await page.waitForTimeout(1500);
await page.evaluate(() => (window.__V.frozen = true));
await page.waitForTimeout(300);

const glInfo = await page.evaluate(() => {
	const gl = window.__V.renderer.getContext();
	const d = gl.getExtension('WEBGL_debug_renderer_info');
	return {
		gpu: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
		buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight]
	};
});
console.log('GL:', glInfo.gpu, glInfo.buffer.join('x'));

const report = await page.evaluate(
	({ only }) => {
		const { renderer: r, scene: s, camera: cam } = window.__V;
		const V = window.__simHubVisibility;
		const ROOMS = V.rooms;
		const gl = r.getContext();
		const W = gl.drawingBufferWidth;
		const H = gl.drawingBufferHeight;
		const buf = new Uint8Array(W * H * 4);
		const rt = new V.WebGLRenderTarget(W, H); // no MSAA: id colours must not blend at edges

		const roomAt = (x, z) => {
			for (const q of ROOMS)
				if (Math.abs(x - q.x) <= q.w / 2 && Math.abs(z - q.z) <= q.d / 2) return q.id;
			return 'hallway/exterior';
		};
		const visibleChain = (o) => {
			for (let p = o; p; p = p.parent) if (!p.visible) return false;
			return true;
		};

		// Fixed mesh enumeration (visible or not): ids are identical in every pass.
		const meshes = [];
		const flat = [];
		s.traverse((o) => {
			if (o.isMesh) meshes.push(o);
			else if (o.isLine || o.isPoints || o.isSprite) flat.push(o);
		});
		const mats = meshes.map((o, i) => {
			const id = i + 1;
			const m = new V.MeshBasicMaterial();
			m.color.setRGB(
				(id & 255) / 255,
				((id >> 8) & 255) / 255,
				((id >> 16) & 255) / 255,
				'srgb-linear'
			);
			m.toneMapped = false;
			m.fog = false;
			return m;
		});
		const transparent = meshes.map((o) => {
			const ms = Array.isArray(o.material) ? o.material : [o.material];
			return ms.some((m) => m.transparent && m.opacity < 0.999);
		});
		const meshName = (o) => {
			const names = [];
			for (let p = o, k = 0; p && p !== s && k < 4; p = p.parent, k++)
				if (p.name && !p.name.startsWith('room-content:')) names.push(p.name);
			return (
				(names.join(' < ') || `${o.geometry.type}#${o.id}`) +
				(o.isInstancedMesh ? ' [instanced]' : '')
			);
		};
		const info = meshes.map((o) => {
			o.updateWorldMatrix(true, false);
			const g = o.geometry;
			if (!g.boundingSphere) g.computeBoundingSphere();
			const e = o.matrixWorld.elements;
			const c = g.boundingSphere.center;
			const wx = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12];
			const wz = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14];
			return { name: meshName(o), room: roomAt(wx, wz) };
		});

		// Frustum planes from the camera, for the informational drawn count only.
		const planes = () => {
			const a = cam.projectionMatrix.elements;
			const b = cam.matrixWorldInverse.elements;
			const m = new Array(16);
			for (let i = 0; i < 4; i++)
				for (let j = 0; j < 4; j++) {
					let v = 0;
					for (let k = 0; k < 4; k++) v += a[k * 4 + i] * b[j * 4 + k];
					m[j * 4 + i] = v;
				}
			const row = (i) => [m[i], m[4 + i], m[8 + i], m[12 + i]];
			const [r0, r1, r2, r3] = [row(0), row(1), row(2), row(3)];
			const P = [];
			for (const [x, sgn] of [
				[r0, 1],
				[r0, -1],
				[r1, 1],
				[r1, -1],
				[r2, 1],
				[r2, -1]
			]) {
				const p = r3.map((v, i) => v + sgn * x[i]);
				const l = Math.hypot(p[0], p[1], p[2]);
				P.push(p.map((v) => v / l));
			}
			return P;
		};
		const inFrustum = (o, P) => {
			if (!o.frustumCulled || o.isInstancedMesh || o.isSkinnedMesh) return true;
			const g = o.geometry;
			if (!g.boundingSphere) g.computeBoundingSphere();
			const e = o.matrixWorld.elements;
			const c = g.boundingSphere.center;
			const x = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12];
			const y = e[1] * c.x + e[5] * c.y + e[9] * c.z + e[13];
			const z = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14];
			const rad =
				g.boundingSphere.radius *
				Math.max(
					Math.hypot(e[0], e[1], e[2]),
					Math.hypot(e[4], e[5], e[6]),
					Math.hypot(e[8], e[9], e[10])
				);
			for (const p of P) if (p[0] * x + p[1] * y + p[2] * z + p[3] < -rad) return false;
			return true;
		};

		const bg = s.background;
		const fog = s.fog;
		const shadowOn = r.shadowMap.enabled;
		const tone = r.toneMapping;
		const savedMat = meshes.map((o) => o.material);

		const readIds = () => {
			r.setRenderTarget(rt);
			r.setClearColor(0x000000, 0);
			r.clear();
			r.render(s, cam);
			r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
			r.setRenderTarget(null);
			const px = new Map();
			for (let i = 0; i < buf.length; i += 4) {
				const id = buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16);
				if (id) px.set(id, (px.get(id) || 0) + 1);
			}
			return px;
		};

		// One ID render at the current camera with culling on/off. Returns Map(meshIndex -> pixels)
		// and (ON only) how many meshes were actually submitted to the GPU.
		const idPass = (culling, wantDrawn) => {
			V.setCulling(culling);
			cam.updateMatrixWorld(true);
			V.applyVisibility(cam);
			let drawn = 0;
			if (wantDrawn) {
				cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
				const P = planes();
				for (let i = 0; i < meshes.length; i++) {
					const o = meshes[i];
					if (visibleChain(o) && cam.layers.test(o.layers) && inFrustum(o, P)) drawn++;
				}
			}
			const flatVis = flat.map((o) => o.visible);
			flat.forEach((o) => (o.visible = false));
			meshes.forEach(
				(o, i) =>
					(o.material = Array.isArray(savedMat[i]) ? savedMat[i].map(() => mats[i]) : mats[i])
			);
			s.background = null;
			s.fog = null;
			r.shadowMap.enabled = false;
			r.toneMapping = 0;
			const tvis = [];
			meshes.forEach((o, i) => {
				if (transparent[i]) {
					tvis.push([o, o.visible]);
					o.visible = false;
				}
			});
			const px1 = readIds(); // opaque only: glass does not occlude what is behind it
			tvis.forEach(([o, v]) => (o.visible = v));
			const px2 = readIds(); // everything: credit only the glass meshes themselves
			meshes.forEach((o, i) => (o.material = savedMat[i]));
			flat.forEach((o, i) => (o.visible = flatVis[i]));
			s.background = bg;
			s.fog = fog;
			r.shadowMap.enabled = shadowOn;
			r.toneMapping = tone;
			const seen = new Map();
			for (const [id, n] of px1) if (meshes[id - 1]) seen.set(id - 1, n);
			for (const [id, n] of px2)
				if (meshes[id - 1] && transparent[id - 1] && !seen.has(id - 1)) seen.set(id - 1, n);
			return { seen, drawn };
		};

		const yawAim = (deg, pos, pitch) => {
			const a = (deg * Math.PI) / 180;
			return [
				pos[0] - Math.sin(a) * Math.cos(pitch),
				pos[1] + Math.sin(pitch),
				pos[2] - Math.cos(pitch) * Math.cos(a)
			];
		};
		const poses = [];
		const headings = [0, 90, 180, 270];
		for (const q of ROOMS) {
			const wp = [q.x, 1.65, q.z];
			for (const h of headings)
				poses.push({ name: `${q.id} walk h${h}`, room: q.id, pos: wp, look: yawAim(h, wp, 0) });
			const gp = q.cam;
			const dx = q.look[0] - gp[0];
			const dz = q.look[2] - gp[2];
			const dy = q.look[1] - gp[1];
			const base = Math.atan2(dx, dz);
			const flatLen = Math.hypot(dx, dz);
			for (const h of headings) {
				const a = base + (h * Math.PI) / 180;
				poses.push({
					name: `${q.id} guided h${h}`,
					room: q.id,
					pos: gp,
					look: [gp[0] + Math.sin(a) * flatLen, gp[1] + dy, gp[2] + Math.cos(a) * flatLen]
				});
			}
		}
		// Hallway points: 2.5 m outside the door of six rooms spread over the wings.
		const outward = { zmin: [0, -1], zmax: [0, 1], xmin: [-1, 0], xmax: [1, 0] };
		const hall = [];
		for (const id of ['consult', 'physics', 'ctsim', 'linaccontrol', 'vault1', 'manager']) {
			const q = ROOMS.find((x) => x.id === id);
			if (!q || !q.doorSide) continue;
			const [ox, oz] = outward[q.doorSide];
			const px = q.x + ox * (Math.abs(ox) * (q.w / 2 + 2.5));
			const pz = q.z + oz * (Math.abs(oz) * (q.d / 2 + 2.5));
			// keep the x (or z) along the wall as the room's own centre coordinate
			hall.push({ id, pos: [ox ? px : q.x, 1.65, oz ? pz : q.z] });
		}
		for (const hp of hall)
			for (const h of headings)
				poses.push({
					name: `hallway@${hp.id}-door h${h}`,
					room: roomAt(hp.pos[0], hp.pos[2]),
					pos: hp.pos,
					look: yawAim(h, hp.pos, 0)
				});
		const lc = ROOMS.find((x) => x.id === 'linaccontrol');
		const cc = ROOMS.find((x) => x.id === 'ctcontrol');
		poses.push({
			name: 'linaccontrol monitors north',
			room: 'linaccontrol',
			pos: [lc.x + 1, 1.65, lc.z + 2],
			look: [lc.x + 4.45, 2.2, lc.z + 2]
		});
		poses.push({
			name: 'linaccontrol monitors south',
			room: 'linaccontrol',
			pos: [lc.x + 1, 1.65, lc.z - 2],
			look: [lc.x + 4.45, 2.2, lc.z - 2]
		});
		poses.push({
			name: 'ctcontrol glass into ctsim',
			room: 'ctcontrol',
			pos: [cc.x, 1.65, cc.z],
			look: [cc.x + 8, 1.5, cc.z]
		});

		const out = [];
		let n = 0;
		for (const p of poses) {
			if (only && !p.name.includes(only)) continue;
			cam.position.set(...p.pos);
			cam.lookAt(...p.look);
			cam.updateMatrixWorld(true);
			const off = idPass(false, false);
			const on = idPass(true, true);
			let stable = true;
			if (n < 3) {
				const off2 = idPass(false, false);
				stable =
					off2.seen.size === off.seen.size && [...off.seen.keys()].every((k) => off2.seen.has(k));
			}
			n++;
			const missing = [];
			for (const [i, px] of off.seen)
				if (!on.seen.has(i)) missing.push({ name: info[i].name, room: info[i].room, px });
			let extraOn = 0;
			for (const i of on.seen.keys()) if (!off.seen.has(i)) extraOn++;
			out.push({
				name: p.name,
				room: p.room,
				off: off.seen.size,
				on: on.seen.size,
				drawnOn: on.drawn,
				hiddenDrawn: on.drawn - on.seen.size,
				extraOn,
				stable,
				missing
			});
		}
		V.setCulling(true);
		V.applyVisibility(cam);
		return { total: meshes.length, poses: out };
	},
	{ only: ONLY }
);

await browser.close();
srv.close();

let failures = 0;
let unstable = 0;
let hiddenDrawn = 0;
let extraOn = 0;
for (const p of report.poses) {
	hiddenDrawn += p.hiddenDrawn;
	extraOn += p.extraOn;
	if (!p.stable) unstable++;
	if (p.missing.length) {
		failures++;
		console.log(
			`FAIL ${p.name} (camera room: ${p.room}): ${p.missing.length} mesh(es) on screen with culling OFF, missing with it ON`
		);
		for (const m of p.missing) console.log(`     ${m.name}  room=${m.room}  px=${m.px}`);
	} else if (VERBOSE)
		console.log(
			`ok   ${p.name}: off=${p.off} on=${p.on} drawnOn=${p.drawnOn} drawnButHidden=${p.hiddenDrawn}`
		);
}
console.log('');
console.log(`meshes in scene:            ${report.total}`);
console.log(`poses checked:              ${report.poses.length}`);
console.log(`poses with failures:        ${failures}`);
console.log(`ON-only ids (info):         ${extraOn}`);
console.log(
	`drawn-but-hidden (info):    ${hiddenDrawn} total, ${(hiddenDrawn / Math.max(1, report.poses.length)).toFixed(0)} per pose (ON draws with no pixel)`
);
if (pageErrors.length) console.log(`page errors: ${pageErrors.slice(0, 3).join(' | ')}`);
if (unstable || report.poses.length === 0) {
	console.error(
		unstable
			? 'Determinism self-check failed: OFF pass differed between two renders of the same pose.'
			: 'No poses ran.'
	);
	process.exit(2);
}
process.exit(failures ? 1 : 0);
