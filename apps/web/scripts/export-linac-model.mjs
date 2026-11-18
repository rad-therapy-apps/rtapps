// Exports the LINAC app's vault for the center's Vault 1 (docs/specs/2026-11-18-consoles-in-center-
// design.md, part 1): serves the built linac-ct app, opens it in headless Chromium with
// `?export-parts` (arcade-src/linac-ct/src/parts-hook.ts names the parts and hands them over) and
// writes them with three's GLTFExporter, together with the room's floor, wall and ceiling textures,
// into arcade-src/sim-hub/public/models/, which the center serves at /arcade/sim-hub/models/ and
// sim-hub vault-linac.ts and rooms.ts load:
//   linac-vault.glb     one named node per part, in the app's coordinates: linacMachine (gantry,
//                       collimator, jawX1/X2/Y1/Y2, kvArms, epid, beam), couch (couchRotation,
//                       couchTop, couchTopBoard, couchBellows), couchBase, floorPadMachine/Iso/
//                       Cabinet, lasers, treatmentMonitor (no screen: the center draws its own),
//                       radiationSign, ceilingLight1..6. The app's patient is left out.
//   linac-floor.png, linac-wall.png, linac-ceiling.png   the room finishes (256 x 256, repeating)
// The page's Math.random is seeded, so a rerun on the same app gives the same files. Texture
// coordinates are dropped from meshes without a texture, to keep the file small.
//
// How to rerun (after a change to the LINAC app's vault), from apps/web:
//   pnpm build:arcade && node scripts/export-linac-model.mjs && pnpm build:arcade
// The second build copies the new files into the built center. Commit the files it writes.
// Needs Playwright's Chromium. Exit codes: 0 written; 2 setup error.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const APP = path.join(WEB, 'arcade/linac-ct');
const STATIC = path.join(WEB, 'static/arcade');
const THREE_DIR = path.join(WEB, 'node_modules/three');
const OUT = path.join(WEB, 'arcade-src/sim-hub/public/models');
const { chromium } = createRequire(path.join(WEB, 'package.json'))('playwright');

function setupError(msg) {
	console.error(`EXPORT LINAC MODEL setup error: ${msg}`);
	process.exit(2);
}
if (!fs.existsSync(path.join(APP, 'index.html')))
	setupError('arcade/linac-ct/index.html is missing: run `pnpm build:arcade` first');

const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2'
};
// The built app at /arcade/linac-ct/, the shared arcade files (rtapps-sdk.js) at /arcade/ and
// three's addons (GLTFExporter) at /three/, their bare 'three' imports pointed at three's build.
const server = http.createServer((req, res) => {
	const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	let f = null;
	if (u.startsWith('/arcade/linac-ct/'))
		f = path.join(APP, u.slice('/arcade/linac-ct/'.length) || 'index.html');
	else if (u.startsWith('/three/')) f = path.join(THREE_DIR, u.slice('/three/'.length));
	else if (u.startsWith('/arcade/')) f = path.join(STATIC, u.slice('/arcade/'.length));
	if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
		res.writeHead(404);
		res.end();
		return;
	}
	if (u.startsWith('/three/examples/')) {
		const src = fs
			.readFileSync(f, 'utf8')
			.replace(/from ['"]three['"]/g, "from '/three/build/three.module.js'");
		res.writeHead(200, { 'content-type': 'text/javascript' });
		res.end(src);
		return;
	}
	res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
	fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
	headless: true,
	args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=metal']
});
try {
	const page = await (
		await browser.newContext({ viewport: { width: 1280, height: 720 } })
	).newPage();
	// a fixed sequence for the wall texture's speckle (scene.ts makeWallTexture)
	await page.addInitScript(() => {
		let s = 20261118;
		Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
	});
	page.on('pageerror', (e) => console.log('page error:', String(e).slice(0, 200)));
	await page.goto(`${origin}/arcade/linac-ct/index.html?side=linac&export-parts`, {
		waitUntil: 'load'
	});
	await page
		.waitForFunction(() => window.__linacExportParts?.ready(), null, { timeout: 60000 })
		.catch(() => setupError('the app never built its vault (no ?export-parts hook?)'));
	// let the app's boot patches (console-patch.ts) settle before reading the parts
	await page.waitForTimeout(2500);
	const res = await page.evaluate(async () => {
		const { GLTFExporter } = await import('/three/examples/jsm/exporters/GLTFExporter.js');
		const { mergeVertices } = await import('/three/examples/jsm/utils/BufferGeometryUtils.js');
		const { parts, textures } = window.__linacExportParts.collect();
		const mapped = new Set(),
			merged = new Map(),
			names = [];
		for (const p of parts)
			p.traverse((o) => {
				if (o.isMesh && o.material?.map) mapped.add(o.geometry);
			});
		for (const p of parts)
			p.traverse((o) => {
				if (o.name) names.push(o.name);
				if (!o.isMesh) return;
				// no texture: no texture coordinates; the rounded boxes come unindexed, so shared
				// corners are merged (once per geometry, as the meshes share them)
				if (!merged.has(o.geometry)) {
					const g = o.geometry;
					if (!mapped.has(g)) for (const a of ['uv', 'uv1', 'uv2']) g.deleteAttribute(a);
					merged.set(g, g.index ? g : mergeVertices(g));
				}
				o.geometry = merged.get(o.geometry);
			});
		const glb = await new Promise((ok, bad) =>
			new GLTFExporter().parse(parts, ok, bad, {
				binary: true,
				onlyVisible: false,
				maxTextureSize: 512
			})
		);
		const bytes = new Uint8Array(glb);
		let bin = '';
		for (let i = 0; i < bytes.length; i += 8192)
			bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
		const png = {};
		for (const [k, c] of Object.entries(textures)) png[k] = c.toDataURL('image/png').split(',')[1];
		return { glb: btoa(bin), png, names };
	});
	fs.mkdirSync(OUT, { recursive: true });
	const files = [['linac-vault.glb', Buffer.from(res.glb, 'base64')]];
	for (const [k, b64] of Object.entries(res.png))
		files.push([`linac-${k}.png`, Buffer.from(b64, 'base64')]);
	let total = 0;
	for (const [name, buf] of files) {
		fs.writeFileSync(path.join(OUT, name), buf);
		total += buf.length;
		console.log(
			`wrote ${path.relative(WEB, path.join(OUT, name))} (${(buf.length / 1024).toFixed(1)} KB)`
		);
	}
	console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB; named nodes: ${res.names.join(' ')}`);
} finally {
	await browser.close();
	server.close();
}
