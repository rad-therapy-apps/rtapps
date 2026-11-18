// CT scanner model export (dev only, not run in CI): serves the built linac-ct app, opens its CT
// suite (ct-suite.html) with `?export-parts` in headless Chromium and writes the suite's gantry,
// rotor, table and lasers as one GLB for the center's CT room (sim-hub ct-room-look.ts). The suite's
// parts hook (arcade-src/linac-ct/src/ct-suite/parts-hook.ts) names the parts and builds the GLB in
// the page with the suite's own three.js; this script only fetches it and saves it.
//
// How to rerun (after a change to the suite's scan room, room.ts), from apps/web:
//   pnpm build:arcade
//   node scripts/export-ct-model.mjs
//   then commit arcade-src/sim-hub/public/models/ct-scanner.glb (served at
//   /arcade/sim-hub/models/ct-scanner.glb) and rebuild with `pnpm build:arcade`.
// Output: that file and one line with its size and node names. Needs Playwright's Chromium.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const LINAC_CT = path.join(WEB, 'arcade/linac-ct');
const OUT = path.join(WEB, 'arcade-src/sim-hub/public/models/ct-scanner.glb');
const { chromium } = createRequire(path.join(WEB, 'package.json'))('playwright');

if (!fs.existsSync(path.join(LINAC_CT, 'ct-suite.html'))) {
	console.error(`Missing ${LINAC_CT}/ct-suite.html. Run: pnpm build:arcade`);
	process.exit(2);
}

const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.json': 'application/json'
};
const srv = http.createServer((req, res) => {
	const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	const pre = '/arcade/linac-ct/',
		f = u.startsWith(pre) ? path.join(LINAC_CT, u.slice(pre.length)) : null;
	if (f && f.startsWith(LINAC_CT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
		res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
		fs.createReadStream(f).pipe(res);
	} else {
		res.writeHead(404);
		res.end();
	}
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({
	headless: true,
	args: [
		'--ignore-gpu-blocklist',
		'--enable-webgl',
		'--use-angle=swiftshader',
		'--enable-unsafe-swiftshader'
	]
});
try {
	const page = await browser.newPage();
	page.on('pageerror', (e) => console.error('page error:', String(e)));
	await page.goto(
		`http://127.0.0.1:${srv.address().port}/arcade/linac-ct/ct-suite.html?export-parts`
	);
	await page.waitForFunction(() => typeof window.__ctExportParts === 'function', null, {
		timeout: 60000
	});
	const glb = Buffer.from(await page.evaluate(() => window.__ctExportParts()), 'base64');
	// the GLB's JSON chunk starts at byte 20 (12-byte header, 8-byte chunk header)
	const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
	const roots = json.scenes[json.scene ?? 0].nodes.map((i) => json.nodes[i].name);
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, glb);
	console.log(
		`wrote ${path.relative(WEB, OUT)}: ${glb.length} bytes, ${json.nodes.length} nodes, roots ${roots.join(', ')}`
	);
} finally {
	await browser.close();
	srv.close();
}
