// sim-hub NPC screenshot tool (dev only, not run in CI): serves the built sim-hub, opens it in
// headless Chromium, closes the "Start Exploring" dialog, hides the DOM except the canvas and writes
// one PNG per fixed pose, to compare NPC feet, seating and lying before and after a change.
//
// How to run (run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-shots.mjs <outDir> [shotName]
//     shotName limits the run to one of the fixed shots (walker-low, lobby-chairs, ...).
//     Shots are deterministic: each pose runs the simulation on a fixed clock, so two runs give the
//     same pixels (before/after comparisons).
// Output: <outDir>/<name>.png and one line per shot. Needs Playwright's Chromium.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const outDir = process.argv[2],
	onlyShot = process.argv[3];
if (!outDir) {
	console.error('usage: node scripts/sim-hub-shots.mjs <outDir> [shotName]');
	process.exit(2);
}
const { chromium } = createRequire(path.join(WEB, 'package.json'))('playwright');

// Each shot: the subject, the camera as [right, up, forward] from the subject (right/forward turn
// with the subject's facing; up is world height), and the world height looked at. `u` parks a mover
// at that point of its loop first.
const SHOTS = [
	{ name: 'walker-low', subject: 'mover:walker', u: 0.3, cam: [-1.6, 0.35, 0], lookY: 0.35 },
	{ name: 'lobby-chairs', subject: 'cast:lobby:patient:1', cam: [3.5, 0.9, 0.5], lookY: 0.6 },
	// the patient sits on the exam table's near edge; this camera stays clear of the oncologist
	{ name: 'consult-patient', subject: 'cast:consult:patient:1', cam: [2.6, 1.3, 1.8], lookY: 0.8 },
	{ name: 'escort-wheelchair', subject: 'mover:escort', u: 0.3, cam: [2.4, 1.1, 0], lookY: 0.8 },
	{ name: 'ct-table', subject: 'cast:ctsim:patient:*', cam: [0, 1.5, -1.8], lookY: 1.05 },
	{ name: 'vault-couch', subject: 'cast:vault1:patient:*', cam: [-1.4, 1.6, 1.2], lookY: 1.0 }
];

const SIMHUB = path.join(WEB, 'arcade/sim-hub'),
	STATIC = path.join(WEB, 'static/arcade');
const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.json': 'application/json',
	'.woff2': 'font/woff2'
};
const srv = http.createServer((req, res) => {
	const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	let f = null;
	if (u.startsWith('/arcade/sim-hub/')) f = path.join(SIMHUB, u.slice(16) || 'index.html');
	else if (u.startsWith('/arcade/')) f = path.join(STATIC, u.slice(8));
	if (f && fs.existsSync(f) && fs.statSync(f).isFile()) {
		res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
		fs.createReadStream(f).pipe(res);
	} else {
		res.writeHead(404);
		res.end();
	}
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/arcade/sim-hub/`;
const browser = await chromium.launch({
	headless: true,
	args: [
		'--ignore-gpu-blocklist',
		'--enable-webgl',
		'--use-angle=swiftshader',
		'--enable-unsafe-swiftshader'
	]
});
const page = await (
	await browser.newContext({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 })
).newPage();
// three.js announces its renderer, scene and camera to __THREE_DEVTOOLS__; keep them, and let the
// frame loop be frozen once the page is set up.
await page.addInitScript(() => {
	const S = (window.__V = {
		renderer: null,
		scene: null,
		camera: null,
		frozen: false,
		frames: 0,
		spec: null,
		info: null
	});
	// the scene builder draws random phases for the actors' idle motion: seed it
	let seed = 1;
	Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
	// Puts the camera at the shot's pose; runs before every frame draws, so the page's own culling
	// (which reads the camera) sees the new viewpoint and shows the actors in that room.
	const place = (s, c) => {
		const N = window.__NPC;
		let objs, yaw;
		if (s.subject.startsWith('mover:')) {
			const m = N.movers.find((x) => x.id === s.subject.slice(6));
			if (!m)
				throw new Error(
					`unknown mover '${s.subject.slice(6)}' (have: ${N.movers.map((x) => x.id).join(', ')})`
				);
			objs = [m.group];
			yaw = m.group.rotation.y - (m.yawOffset || 0);
		} else {
			const [, room, kind, idx] = s.subject.split(':');
			if (!N.ROOM_CAST[room])
				throw new Error(`unknown room '${room}' (have: ${Object.keys(N.ROOM_CAST).join(', ')})`);
			objs =
				idx === '*'
					? N.ROOM_CAST[room].filter((e) => e.kind === kind && N.visibleInTree(e.g)).map((e) => e.g)
					: [N.ROOM_CAST[room][+idx].g];
			yaw = objs[0].rotation.y;
		}
		const P = objs.map((o) => o.getWorldPosition(new o.position.constructor())),
			x = P.reduce((a, p) => a + p.x, 0) / P.length,
			z = P.reduce((a, p) => a + p.z, 0) / P.length,
			fx = Math.sin(yaw),
			fz = Math.cos(yaw),
			rx = Math.cos(yaw),
			rz = -Math.sin(yaw),
			C = [x + rx * s.cam[0] + fx * s.cam[2], s.cam[1], z + rz * s.cam[0] + fz * s.cam[2]];
		c.position.set(...C);
		c.lookAt(x, s.lookY, z);
		c.updateMatrixWorld();
		c.updateProjectionMatrix?.();
		return {
			cam: C.map((v) => +v.toFixed(2)),
			look: [+x.toFixed(2), s.lookY, +z.toFixed(2)],
			vis: objs.map((o) => `${o.visible}/${N.visibleInTree(o)}`).join(' ')
		};
	};
	const dt = new EventTarget();
	dt.addEventListener('observe', (e) => {
		const d = e.detail;
		if (d && d.isScene && !S.scene) S.scene = d;
		else if (d && d.shadowMap && typeof d.render === 'function' && !S.renderer) {
			S.renderer = d;
			const orig = d.render;
			d.render = function (scene, camera) {
				if (!d.getRenderTarget()) {
					S.camera = camera;
					if (S.spec) S.info = place(S.spec, camera);
				}
				return orig.call(this, scene, camera);
			};
		}
	});
	window.__THREE_DEVTOOLS__ = dt;
	S.resume = () => {
		S.frozen = false;
		const cb = S.pending;
		S.pending = null;
		if (cb) window.requestAnimationFrame(cb);
	};
	const raf = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = (cb) =>
		raf((ts) => {
			// freeze on a frame count that is a multiple of 12, so the page's frame-count striding is the
			// same on every run
			if (S.freezeOnMultiple && S.frames % 12 === 0) S.frozen = true;
			if (S.frozen) {
				S.pending = cb; // the loop stops here; resume() restarts it
				return;
			}
			S.frames++;
			return cb(ts);
		});
});
page.on('pageerror', (e) => console.error('pageerror', String(e).slice(0, 300)));
try {
	await page.goto(base + '?hq&npccheck', { waitUntil: 'load' });
	await page.waitForFunction(
		() => window.__V.renderer && window.__V.scene && window.__V.camera && window.__V.frames > 30,
		null,
		{ timeout: 120000 }
	);
	await page.evaluate(() => {
		const b = [...document.querySelectorAll('button')].find((x) =>
			/start exploring/i.test(x.textContent)
		);
		if (b) b.click();
	});
	await page.waitForTimeout(800);
	await page.evaluate(() => {
		window.__V.freezeOnMultiple = true;
	});
	await page.waitForFunction(() => window.__V.frozen, null, { polling: 100, timeout: 120000 });
	await page.evaluate(() => window.__NPC.resetTreatmentJourney(true));
	await page.evaluate(() => {
		const cv = document.querySelector('canvas'),
			keep = new Set();
		for (let n = cv; n; n = n.parentElement) keep.add(n);
		for (const el of document.body.querySelectorAll('*'))
			if (!keep.has(el) && !cv.contains(el)) el.style.visibility = 'hidden';
		cv.style.visibility = 'visible';
	});
	await page.waitForTimeout(300);
	fs.mkdirSync(outDir, { recursive: true });
	if (onlyShot && !SHOTS.some((x) => x.name === onlyShot)) {
		console.error(`unknown shot '${onlyShot}' (have: ${SHOTS.map((x) => x.name).join(', ')})`);
		process.exitCode = 2;
	} else
		for (const shot of SHOTS.filter((x) => !onlyShot || x.name === onlyShot)) {
			// The page's own loop stays frozen. Each shot runs the simulation on a fixed clock (a base per
			// shot, then 60 steps of 1/30 s) with the camera placed before every draw, so the culling and
			// the animation match on every run.
			const info = await page.evaluate(
				([s, base]) => {
					const V = window.__V,
						N = window.__NPC;
					N.state.simSec = 0;
					N.stepSimulation._f = 0;
					N.movers.forEach((m, i) => {
						m.u = (i * 0.137) % 1;
						m.heldFor = 0;
					});
					if (s.u !== undefined) {
						const m = N.movers.find((x) => x.id === s.subject.slice(6));
						if (!m)
							throw new Error(
								`unknown mover '${s.subject.slice(6)}' (have: ${N.movers.map((x) => x.id).join(', ')})`
							);
						m.u = s.u;
					}
					V.spec = s;
					let t = base;
					performance.now = () => t;
					// the wall clocks read Date and the actors' idle motion reads Math.random: fix both
					const D = Date,
						d0 = D.UTC(2026, 0, 5, 10, 0, 0);
					window.Date = class extends D {
						constructor(...args) {
							super(...(args.length ? args : [d0 + (t - base)]));
						}
						static now() {
							return d0 + (t - base);
						}
					};
					let a = 1;
					Math.random = () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646;
					for (let i = 0; i < 60; i++) {
						t += 1000 / 30;
						N.stepSimulation(t);
					}
					return V.info;
				},
				[shot, 1e7 + SHOTS.indexOf(shot) * 1e5]
			);
			const file = path.join(outDir, shot.name + '.png');
			await page.locator('canvas').first().screenshot({ path: file });
			console.log(
				`${shot.name} -> ${file} cam ${info.cam.join(',')} look ${info.look.join(',')} visible ${info.vis}`
			);
		}
} catch (err) {
	console.error(`sim-hub-shots error: ${err && err.message ? err.message : err}`);
	process.exitCode = 2;
} finally {
	await browser.close();
	srv.close();
}
