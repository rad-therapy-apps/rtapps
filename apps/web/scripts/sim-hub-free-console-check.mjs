// sim-hub free console check (docs/specs/2026-11-18-consoles-in-center-design.md, parts 5 and 7):
// the two graded activities, 'Treatment delivery' and 'CT simulation', played end to end in Free
// Mode on the real LINAC and CT consoles in the center's console panel, in headless Chromium.
//
// Serves the built arcade (apps/web/arcade, and apps/web/static/arcade for the shared files) on a
// random port, with /arcade/rtapps-sdk.js replaced by a recorder: every frame that loads it (the
// center and the LINAC console) gets a window.RTApps whose recordResult(slug, opts) is logged in
// the top page, with the page that called it. Each part opens the center the way its activity
// does (/arcade/sim-hub/index.html?start=<room>, start-room.ts) with ?npccheck for the check hooks
// (window.__NPC, window.__TUTORIAL); the center's own drawing is off (window.__NPC.disableRendering),
// as in sim-hub-console-check.mjs, so the panel's camera feeds draw nothing but still run.
//   LINAC  ?start=linaccontrol: Free Mode at the LINAC Control door, no title menu; the player is
//          put at the console desk, E opens the LINAC console in the free scenario, which posts
//          ready. The first patient on the queue (Michael Carter, AU-24031) is played through one
//          fraction by the console's real buttons and its own workflow tabs: check in, chart,
//          Patient Setup (the devices dragged from the shelf, the checks, Verify), image guidance
//          (a new daily setup, the kV arms out, the images, the couch correction from the console's
//          keys, Verify Alignment), delivery (the AP field, then the PA field after the held Move
//          to field) and charge capture, whose Post closes the fraction (linac-ct/src/sdk.ts
//          postChargeAndCompleteFraction): recordResult('sim-linac-fraction') once, from the
//          console's page. Vault 1's gantry (window.__NPC.vaultLinac) turns through the angles
//          between AP and PA and ends at 180.
//   CT     ?start=ctcontrol: Free Mode at the CT Control door; E at the CT console desk opens the
//          CT console, which posts ready; one prostate scan is run (protocol, habitus and
//          technique, the table held in to the isocentre and raised, Set Isocenter, topogram,
//          range, scan), and its rtapps-ct-complete makes the center record
//          recordResult('sim-ct-scan') once, from the center's page (console-panel.ts). The CT
//          room's table and the patients lying on it (window.__NPC.ctRoom frame and riders) move
//          into the bore while it scans.
// Each part closes the panel with its × and the click asks for mouse look again (hub-dialogs.ts,
// counted on the canvas's requestPointerLock). Also asserted: the console's events in order and
// with no mistakes, and no page error in the center or either console.
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-free-console-check.mjs
// Needs Playwright's Chromium (WebGL through Metal on macOS, SwiftShader elsewhere). Exit codes:
// 0 pass; 1 a check failed; 2 setup error. Output: one `FREE CONSOLE CHECK <part> PASS` line per
// part with its time, or `FREE CONSOLE CHECK FAIL: <what>` and the console's last events.
// The serving, the GL flags and the equipment drag are copied from sim-hub-console-check.mjs.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const ARCADE = path.join(WEB, 'arcade');
const STATIC = path.join(WEB, 'static/arcade');
const { chromium } = createRequire(path.join(WEB, 'package.json'))('playwright');
const VIEW = { width: 1280, height: 800 };

function setupError(msg) {
	console.error(`FREE CONSOLE CHECK setup error: ${msg}`);
	process.exit(2);
}
for (const app of ['sim-hub', 'linac-ct'])
	if (!fs.existsSync(path.join(ARCADE, app, 'index.html')))
		setupError(`arcade/${app}/index.html is missing: run \`pnpm build:arcade\` first`);

// The SDK stand-in: each frame's recordResult goes to one list in the top page, with the page that
// called it; activityUrl fails, as the real SDK does with no API behind it.
const SDK_RECORDER = `(function () {
	var calls = (window.top.__recorded = window.top.__recorded || []);
	window.RTApps = {
		recordResult: function (slug, opts) {
			calls.push({ slug: slug, opts: opts === undefined ? null : opts, page: location.pathname });
			return Promise.resolve({ percent: null });
		},
		activityUrl: function () {
			return Promise.reject(new Error('no API in the free console check'));
		}
	};
})();
`;
const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.glb': 'model/gltf-binary'
};
// The built apps at /arcade/<app>/ and the shared arcade files at /arcade/, the SDK replaced.
const server = http.createServer((req, res) => {
	const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	if (u === '/arcade/rtapps-sdk.js') {
		res.writeHead(200, { 'content-type': 'text/javascript' });
		res.end(SDK_RECORDER);
		return;
	}
	const app = ['sim-hub', 'linac-ct'].find((a) => u.startsWith(`/arcade/${a}/`));
	const root = app ? path.join(ARCADE, app) : STATIC;
	const rel = app ? u.slice(`/arcade/${app}/`.length) || 'index.html' : u.slice('/arcade/'.length);
	const f = path.join(root, rel);
	if (
		!u.startsWith('/arcade/') ||
		!f.startsWith(root) ||
		!fs.existsSync(f) ||
		!fs.statSync(f).isFile()
	) {
		res.writeHead(404);
		res.end();
		return;
	}
	res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
	fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

let browser, context;
try {
	// WebGL in headless Chromium: the GPU through Metal on macOS, SwiftShader (software) elsewhere
	browser = await chromium.launch({
		headless: true,
		args: [
			'--ignore-gpu-blocklist',
			'--enable-webgl',
			...(process.platform === 'darwin'
				? ['--use-angle=metal']
				: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
		]
	});
	context = await browser.newContext({ viewport: VIEW });
	await context.addInitScript(() => localStorage.setItem('simhub.roomCards.enabled', 'false'));
} catch (err) {
	await browser?.close().catch(() => {});
	server.close();
	setupError(`could not start Chromium: ${err?.message ?? err}`);
}
const pageErrors = [];

const T0 = Date.now();
let partStart = T0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class CheckFailure extends Error {}
function expect(ok, what) {
	if (!ok) throw new CheckFailure(what);
}
// Upper bounds only: a passing run takes a few seconds per step on a GPU. The consoles' machines
// move by their own frames, which a software renderer (CI) runs several times slower.
const WAIT_MS = 60000,
	MOTION_MS = 180000;
/** The center's page of the part being played. */
let page;
const ev = (fn, arg) => page.evaluate(fn, arg);
/** Polls `fn` (run in the center's page with `arg`) until it returns something truthy. */
async function until(what, fn, timeout = WAIT_MS, arg) {
	const t0 = Date.now();
	for (;;) {
		const v = await page.evaluate(fn, arg);
		if (v) return v;
		if (Date.now() - t0 > timeout)
			throw new CheckFailure(`timed out after ${timeout / 1000} s waiting for ${what}`);
		await sleep(100);
	}
}
function part(name) {
	const now = Date.now();
	console.log(`FREE CONSOLE CHECK ${name} PASS (${((now - partStart) / 1000).toFixed(1)} s)`);
	partStart = now;
}
const recorded = () => ev(() => window.__recorded ?? []);
const events = () => ev(() => window.__consoleEvents);
const eventCount = async () => (await events()).length;
/** Waits for a LINAC console event of `kind` after the first `from`. */
const nextEvent = (kind, from, timeout = WAIT_MS) =>
	until(
		`the console's '${kind}' event`,
		([k, n]) => window.__consoleEvents.slice(n).find((e) => e.kind === k),
		timeout,
		[kind, from]
	);
/** The console messages of `type` the panel accepted. */
const messages = (type) =>
	ev(
		(t) =>
			window.__NPC
				.consoleMessages()
				.filter((m) => m.message.type === t)
				.map((m) => m.message),
		type
	);

/** Opens the center as the activity does, at `room`'s door, and checks it is Free Mode there with
    no title menu; then turns its drawing off and starts listening to the console bus. */
async function openCenter(room) {
	page = await context.newPage();
	page.on('pageerror', (e) => pageErrors.push(`${room}: ${String(e).slice(0, 300)}`));
	// a software renderer (SwiftShader) takes a while to compile the center's shaders
	await page.goto(`${origin}/arcade/sim-hub/index.html?start=${room}&npccheck`, {
		waitUntil: 'load',
		timeout: 180000
	});
	await until(
		'the center to load',
		() => document.getElementById('loader')?.classList.contains('hide'),
		120000
	);
	const at = await ev((id) => {
		const r = window.__NPC.ROOMS.find((x) => x.id === id),
			[px, pz] = window.__TUTORIAL.playerPos();
		// the middle of the room's door (walk.ts doorCenter)
		const dx = r.doorSide === 'xmin' ? -r.w / 2 : r.doorSide === 'xmax' ? r.w / 2 : 0,
			dz = r.doorSide === 'zmin' ? -r.d / 2 : r.doorSide === 'zmax' ? r.d / 2 : 0;
		return {
			mode: window.__TUTORIAL.mode(),
			walk: window.__NPC.state.mode === 'walk',
			menu: document.getElementById('titleMenu')?.classList.contains('show'),
			fromDoor: Math.hypot(px - (r.x + dx), pz - (r.z + dz))
		};
	}, room);
	expect(
		at.mode === 'free' && at.walk && !at.menu,
		`?start=${room} enters Free Mode walking, with no title menu (${JSON.stringify(at)})`
	);
	expect(
		at.fromDoor < 1.5,
		`?start=${room} starts at its door (${at.fromDoor.toFixed(2)} m from the door's middle)`
	);
	await ev(() => {
		// nothing here reads the center's pixels, and a software renderer (CI) draws it at under a
		// frame a second; the panel's camera feeds still run, onto the no-op render
		window.__NPC.disableRendering();
		window.__consoleEvents = [];
		window.__NPC.consoleBus.linacEvents.on((e) => window.__consoleEvents.push(e));
		window.__ctComplete = [];
		window.__NPC.consoleBus.ctComplete.on((m) => window.__ctComplete.push(m));
		// the mouse look the × hands back (hub-dialogs.ts requestWalkPointerLock)
		const c = document.getElementById('scene'),
			lock = c.requestPointerLock.bind(c);
		window.__lockCalls = 0;
		c.requestPointerLock = (...a) => {
			window.__lockCalls++;
			return lock(...a);
		};
	});
}

/** Stands the player at a console desk, turned to it, waits for the desk's E prompt, presses E and
    checks the panel opened that console in the free scenario; returns the console's frame. */
async function openDesk(kind, [x, z], prompt, pagePath) {
	await ev(([x, z]) => window.__TUTORIAL.placePlayer(x, z, Math.PI / 2), [x, z]); // facing -x
	await until(
		`the desk's E prompt '${prompt}'`,
		(p) =>
			document.getElementById('ePrompt')?.classList.contains('show') &&
			document.getElementById('ePromptTitle')?.textContent === p,
		WAIT_MS,
		prompt
	);
	await page.keyboard.press('e');
	await until(
		`E to open the ${kind} console panel`,
		(k) =>
			window.__NPC.isConsoleOpen() &&
			document.getElementById('consolePanel')?.classList.contains('show') &&
			document.getElementById('consolePanel').dataset.kind === k,
		WAIT_MS,
		kind
	);
	let frame;
	for (let t0 = Date.now(); !frame; await sleep(100)) {
		frame = page.frames().find((f) => f.url().includes(pagePath));
		if (Date.now() - t0 > WAIT_MS) throw new CheckFailure(`no ${pagePath} frame in the panel`);
	}
	const url = new URL(frame.url());
	expect(
		url.searchParams.get('view') === 'console' && !url.searchParams.has('scenario'),
		`the panel holds the ${kind} console in the free scenario (${frame.url()})`
	);
	return frame;
}

/** Closes the panel with its × and checks the click asked for mouse look again. */
async function closeWithX() {
	const locks = await ev(() => window.__lockCalls);
	await page.click('#cpClose');
	await until('the × to close the panel', () => !window.__NPC.isConsoleOpen());
	const after = await ev(() => ({
		shown: document.getElementById('consolePanel').classList.contains('show'),
		locks: window.__lockCalls,
		walk: window.__NPC.state.mode === 'walk'
	}));
	expect(!after.shown && after.walk, `the panel is hidden, the player walking (${after.shown})`);
	expect(
		after.locks > locks,
		`closing with × asks for mouse look again (requestPointerLock calls ${locks} -> ${after.locks})`
	);
}

/** Waits, then checks the recorder holds exactly `slug`, once, called from `from`. */
async function recordedOnce(slug, from) {
	await until(
		`recordResult('${slug}')`,
		(s) => window.__recorded?.some((c) => c.slug === s),
		WAIT_MS,
		slug
	);
	await sleep(600); // long enough for a second call to show
	const calls = await recorded();
	expect(
		calls.length === 1 && calls[0].slug === slug && calls[0].page === from,
		`recordResult('${slug}') called exactly once, from ${from} (${JSON.stringify(calls)})`
	);
	return calls[0];
}

/** Drags each device named in the order onto the table in Patient Setup (copied from
    sim-hub-console-check.mjs step 6): a real mouse drag, with the same drag events as a fallback
    when headless Chromium drops one inside the iframe. */
async function dragDevices(frame) {
	const keys = (await frame.locator('#immobilizationOrderSummary .immo-key').textContent())
		.split(':')
		.slice(1)
		.join(':')
		.split('+')
		.map((s) => s.trim())
		.filter(Boolean);
	// the console's drag events, to pace the mouse on them rather than on guessed sleeps
	await frame.evaluate(() => {
		window.__drag = { started: 0, over: 0 };
		document.addEventListener('dragstart', () => window.__drag.started++, true);
		document
			.getElementById('immobilizationTableDrop')
			.addEventListener('dragover', () => window.__drag.over++, true);
	});
	const dragSeen = (k) => frame.evaluate((k) => window.__drag[k], k);
	const placed = () =>
		frame
			.locator('#immobilizationPlacedList .immo-placed-device')
			.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
	const isPlaced = async (name) => (await placed()).some((l) => l.startsWith(name));
	const soon = async (fn, ms) => {
		for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(50)) if (await fn()) return true;
		return false;
	};
	const frameBox = await page.locator('#consolePanel iframe:not([hidden])').boundingBox();
	const dragPaths = [];
	for (const name of keys) {
		const src = frame.locator(`#immobilizationShelf .immo-device[aria-label="${name}"]`),
			dst = frame.locator('#immobilizationTableDrop');
		for (let attempt = 0; attempt < 3 && !(await isPlaced(name)); attempt++) {
			await src.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
			let a = await src.boundingBox();
			for (let i = 0; i < 20; i++) {
				await sleep(80);
				const a2 = await src.boundingBox();
				if (a2.x === a.x && a2.y === a.y) break;
				a = a2;
			}
			// the middle of the table's visible part (in the console page's own coordinates): clear of
			// the sticky heading and of the edges where Chrome would scroll the page during the drag
			const b = await dst.boundingBox();
			const drop = await frame.evaluate(
				([x, top, h]) => {
					const table = document.getElementById('immobilizationTableDrop'),
						ys = [];
					for (let y = Math.max(0, top); y < Math.min(top + h, innerHeight); y += 5)
						if (table.contains(document.elementFromPoint(x, y))) ys.push(y);
					return ys.length ? ys[Math.floor(ys.length / 2)] : null;
				},
				[b.x + b.width / 2 - frameBox.x, b.y - frameBox.y, b.height]
			);
			if (drop === null) continue;
			const started = await dragSeen('started'),
				over = await dragSeen('over');
			await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
			await page.mouse.down();
			await page.mouse.move(a.x + a.width / 2 + 8, a.y + a.height / 2 + 4, { steps: 3 });
			await soon(async () => (await dragSeen('started')) > started, 1500);
			await page.mouse.move(b.x + b.width / 2, frameBox.y + drop, { steps: 12 });
			await soon(async () => (await dragSeen('over')) > over, 1500);
			await page.mouse.up();
			await soon(() => isPlaced(name), 1500);
		}
		if (await isPlaced(name)) {
			dragPaths.push('mouse');
			continue;
		}
		await src.evaluate((el) => {
			const dt = new DataTransfer(),
				table = document.getElementById('immobilizationTableDrop');
			el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
			table.dispatchEvent(
				new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
			);
			table.dispatchEvent(
				new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
			);
		});
		dragPaths.push('drag events');
	}
	const onTable = await placed();
	expect(
		keys.length > 0 && keys.every((k) => onTable.some((l) => l.startsWith(k))),
		`dragged ${keys.join(' + ')} onto the table (${onTable.join(', ')}; ${dragPaths.join(', ')})`
	);
}

// The desks' stand points, facing the desk to the west (equipment.ts linac_console, ct_console)
const LINAC_DESK = [46.1, 9.0],
	CT_DESK = [29.0, -9.2];
const MRN = 'AU-24031'; // Michael Carter, the free queue's first patient (delivery/cases.ts)

/** 'Treatment delivery': one free fraction on the LINAC console from LINAC Control. */
async function playLinac() {
	await openCenter('linaccontrol');
	await ev(() => {
		// Vault 1's gantry, sampled once a frame
		window.__gantry = [];
		const sample = () => {
			const g = window.__NPC.vaultLinac.state().current?.gantry;
			if (g !== undefined && window.__gantry.at(-1) !== g) window.__gantry.push(g);
			requestAnimationFrame(sample);
		};
		requestAnimationFrame(sample);
	});
	await until('Vault 1 to load the LINAC model', () => window.__NPC.vaultLinac.state().loaded);
	part('LINAC load (Free Mode at the LINAC Control door)');

	const frame = await openDesk(
		'linac',
		LINAC_DESK,
		'Open the treatment console',
		'/arcade/linac-ct/index.html'
	);
	const ready = await until(
		"the LINAC console's ready",
		() =>
			window.__NPC.consoleMessages().find((m) => m.message.type === 'rtapps-linac-ready')?.message,
		WAIT_MS
	);
	expect(
		ready.scenario === 'free',
		`the LINAC console is ready in the free scenario (${ready.scenario})`
	);
	const click = async (sel) => {
		await frame.locator(sel).first().click();
		await sleep(120);
	};
	const consoleKey = (target) => click(`#rtv2MachinePanel [data-console-target="${target}"]`);
	const workflow = (w) => click(`.rtv2-nav button[data-workflow="${w}"]`);
	const pose = async () => (await messages('rtapps-linac-state')).at(-1)?.pose;
	part('LINAC panel (E at the desk)');

	// ---------- the queue: check in and open the first patient's chart ----------
	let n = await eventCount();
	await click('#rtv2QueueRows .rtv2-queue-row:nth-child(1) .rtv2-checkin');
	const checkedIn = await nextEvent('checked-in', n);
	expect(checkedIn.mrn === MRN, `the first patient checked in is ${MRN} (${checkedIn.mrn})`);
	n = await eventCount();
	await click('#rtv2QueueRows .rtv2-queue-row:nth-child(1) .rtv2-openchart');
	await nextEvent('chart-opened', n);

	// ---------- Patient Setup, from the chart's workflow tabs ----------
	await workflow('setup');
	await frame.locator('#immobilizationVerify').waitFor({ state: 'visible' });
	await dragDevices(frame);
	for (const id of ['immoPositionCheck', 'immoIndexCheck', 'immoPrepCheck'])
		if (await frame.locator(`#${id}`).count()) await click(`#${id}`);
	n = await eventCount();
	await click('#immobilizationVerify');
	await nextEvent('setup-complete', n);

	// ---------- image guidance ----------
	await workflow('igrt');
	await frame.locator('#igrtNewSetup').waitFor({ state: 'visible' });
	await click('#igrtNewSetup');
	await consoleKey('consoleKV');
	n = await eventCount();
	await click('#igrtAcquire');
	const acquired = await nextEvent('images-acquired', n);
	expect(acquired.shiftMm > 0, `the check images show a shift (${acquired.shiftMm} mm)`);
	await click('#rtv2MotionEnable');
	n = await eventCount();
	const rows = await frame
		.locator('#igrtCorrectionRows .igrt-row')
		.evaluateAll((els) => els.map((r) => [...r.children].map((c) => c.textContent.trim())));
	const AXIS = {
		Lateral: 'Lat',
		Longitudinal: 'Lng',
		Vertical: 'Vrt',
		Roll: 'Roll',
		Pitch: 'Pitch',
		Yaw: 'Yaw'
	};
	for (const [axis, , , residual] of rows) {
		const v = parseFloat(residual),
			stepSize = /°/.test(residual) ? 0.5 : 1;
		for (let i = 0; i < Math.round(Math.abs(v) / stepSize); i++)
			await consoleKey(`console${AXIS[axis]}${v > 0 ? 'Plus' : 'Minus'}`);
	}
	await nextEvent('shift-applied', n);
	await consoleKey('consoleKV'); // stowed for the beam
	n = await eventCount();
	await click('#igrtVerify');
	await nextEvent('alignment-verified', n);
	part('LINAC check-in, chart, setup and image guidance');

	// ---------- delivery: AP, then PA after Move to field ----------
	await workflow('delivery');
	await frame.locator('#rtv2EnableBeam').waitFor({ state: 'visible' });
	for (const [index, field, gantry] of [
		[0, 'AP', 0],
		[1, 'PA', 180]
	]) {
		if (index > 0) {
			await click(`#rtv2dFieldList .rtv2d-field-row[data-index="${index}"]`);
			await ev(() => (window.__gantry = []));
			const hold = frame.locator('#consoleMoveToField');
			await hold.scrollIntoViewIfNeeded();
			const box = await hold.boundingBox();
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			const t0 = Date.now();
			while (Date.now() - t0 < MOTION_MS && (await pose())?.gantry !== gantry) await sleep(100);
			await page.mouse.up();
			expect(
				(await pose())?.gantry === gantry,
				`Move to field turned the console's gantry to ${gantry} (${(await pose())?.gantry})`
			);
			// Vault 1's machine follows: the angles between, then 180
			await until(
				'Vault 1 gantry at 180',
				() => Math.abs(window.__NPC.vaultLinac.state().current.gantry - 180) < 0.5
			);
			// sampled once a frame: a few angles even at a software renderer's frame rate
			const between = await ev(() => window.__gantry.filter((g) => g > 1 && g < 179));
			const rising = between.every((g, i) => i === 0 || g >= between[i - 1]);
			expect(
				between.length >= 5 && rising,
				`Vault 1's gantry turned through the angles between AP and PA, one way (${between.map((g) => g.toFixed(0)).join(', ')})`
			);
		}
		n = await eventCount();
		await click('#rtv2EnableBeam');
		await click('#rtv2BeamOn');
		const delivered = await nextEvent('field-delivered', n, MOTION_MS);
		expect(delivered.field === field, `field-delivered ${field} (${delivered.field})`);
	}
	await nextEvent('treatment-complete', n);
	part('LINAC delivery (AP, PA)');

	// ---------- charge capture closes the fraction ----------
	expect(
		(await recorded()).length === 0,
		`nothing recorded before the fraction closes (${JSON.stringify(await recorded())})`
	);
	await click('#rtv2dActionRecord');
	await frame.locator('#chargeTreatmentCode').waitFor({ state: 'visible' });
	// Michael Carter's 3D-CRT AP/PA: CPT 77407 (Level 2), its image guidance bundled
	await frame.locator('#chargeTreatmentCode').selectOption('77407');
	await frame.locator('#chargeIgrtHandling').selectOption('bundled');
	await click('#chargeVerify');
	expect(
		await frame.locator('#chargeFeedback.good').count(),
		`the charge verifies (${await frame.locator('#chargeFeedback').textContent()})`
	);
	await click('#chargePost');
	const call = await recordedOnce('sim-linac-fraction', '/arcade/linac-ct/index.html');
	console.log(`  recordResult${JSON.stringify([call.slug, call.opts])} from ${call.page}`);

	const all = await events();
	const order = all
		.filter((e) => e.kind !== 'mistake')
		.map((e) => (e.kind === 'field-delivered' ? `${e.kind}:${e.field}` : e.kind));
	const want = [
		'checked-in',
		'chart-opened',
		'setup-complete',
		'images-acquired',
		'shift-applied',
		'alignment-verified',
		'field-delivered:AP',
		'field-delivered:PA',
		'treatment-complete'
	];
	expect(
		JSON.stringify(order) === JSON.stringify(want),
		`the console's events in order: ${order.join(' > ')}`
	);
	expect(
		all.every((e) => e.kind === 'mistake' || e.mrn === MRN),
		`every step event is ${MRN}'s`
	);
	const mistakes = all.filter((e) => e.kind === 'mistake');
	expect(
		mistakes.length === 0,
		`no mistakes on a clean play: ${mistakes.map((e) => `${e.code} (${e.message})`).join(' | ')}`
	);
	await closeWithX();
	part('LINAC charge capture, recordResult and ×');
	await page.close();
}

/** 'CT simulation': one free scan on the CT console from CT Control. */
async function playCt() {
	await openCenter('ctcontrol');
	await until('the CT room to load the scanner model', () => window.__NPC.ctRoom?.modelLoaded());
	await ev(() => {
		// the table's frame and its riders' as each pose comes in (ct-room-look.ts moves them first)
		const { ctPose, frame, riders } = window.__NPC.ctRoom;
		window.__ct = [];
		ctPose.on((p) =>
			window.__ct.push({
				travel: p.tableTravel,
				scanning: p.scanning,
				x: frame.position.x,
				y: frame.position.y,
				riderX: riders.position.x
			})
		);
	});
	part('CT load (Free Mode at the CT Control door)');

	const frame = await openDesk(
		'ct',
		CT_DESK,
		'Open the CT console',
		'/arcade/linac-ct/ct-suite.html'
	);
	await until(
		"the CT console's ready",
		() => window.__NPC.consoleMessages().some((m) => m.message.type === 'rtapps-ct-ready'),
		WAIT_MS
	);
	// the table at rest (the console posts its first pose before its ready, so the panel drops it
	// and the room follows from the console's first change)
	const rest = await ev(() => window.__NPC.ctRoom.frame.position.x);
	const click = async (sel) => {
		await frame.locator(sel).first().click();
		await sleep(120);
	};
	const step = () => frame.locator('#conStep').textContent();
	part('CT panel (E at the desk)');

	// protocol, then habitus and technique (prostate, large: 140 kVp, 310 mAs; console.ts
	// techniqueTarget)
	await click('#protoGrid .chip[data-k="prostate"]');
	await click('[data-habitus="large"]');
	await frame.locator('#kvSelect').selectOption('140');
	await frame.locator('#masInput').fill('310');
	await frame.locator('#masInput').dispatchEvent('change');
	await click('#btnValidateTechnique');
	expect((await step()) === 'Step 3 · Position', `the technique validates (${await step()})`);
	// position: the table held In to the isocentre, then up, then Set Isocenter
	const inKey = frame.locator('[data-couch="z-1"]');
	await inKey.scrollIntoViewIfNeeded();
	const box = await inKey.boundingBox();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await until(
		'the table held In to reach the isocentre',
		() => window.__ct.at(-1)?.travel >= 0.47,
		MOTION_MS
	);
	await page.mouse.up();
	for (let i = 0; i < 5; i++) await click('[data-couch="y1"]');
	await click('#btnSetIso');
	// topogram, range, scan
	await frame.locator('#btnTopogram:not([disabled])').waitFor({ timeout: WAIT_MS });
	await click('#btnTopogram');
	await frame.waitForFunction(
		() => document.getElementById('conStep').textContent.startsWith('Step 5'),
		null,
		{ timeout: MOTION_MS }
	);
	await frame.locator('#rangeStart').fill('20');
	await frame.locator('#rangeStart').dispatchEvent('input');
	await frame.locator('#rangeEnd').fill('60');
	await frame.locator('#rangeEnd').dispatchEvent('input');
	const from = await ev(() => window.__ct.length);
	await click('#btnScan');
	const done = await until('the scan to complete', () => window.__ctComplete[0], MOTION_MS);
	expect(
		done.key === 'prostate' && done.images > 0,
		`the scan completes with images (${JSON.stringify(done)})`
	);
	part('CT scan');

	// the room's table rode into the bore while it scanned, its lying patients with it
	const scan = (await ev((n) => window.__ct.slice(n), from)).filter((s) => s.scanning);
	const xs = scan.map((s) => s.x);
	expect(
		scan.length >= 3 && xs.every((x) => x > rest) && xs.at(-1) > xs[0],
		`the CT room's table moved into the bore while scanning (rest ${rest.toFixed(2)}, ${xs.map((x) => x.toFixed(2)).join(', ')})`
	);
	expect(
		scan.every((s) => s.riderX === s.x),
		"the patients lying on the CT table moved with it (the riders' frame)"
	);
	const call = await recordedOnce('sim-ct-scan', '/arcade/sim-hub/index.html');
	console.log(`  recordResult${JSON.stringify([call.slug, call.opts])} from ${call.page}`);
	await closeWithX();
	part('CT recordResult and ×');
	await page.close();
}

try {
	await playLinac();
	await playCt();
	expect(pageErrors.length === 0, `no page errors: ${pageErrors.join(' | ')}`);
	console.log(
		`FREE CONSOLE CHECK PASS: a free LINAC fraction and a free CT scan, each recorded once, in ${((Date.now() - T0) / 1000).toFixed(0)} s`
	);
} catch (err) {
	console.log(
		`FREE CONSOLE CHECK FAIL: ${err instanceof CheckFailure ? err.message : (err?.stack ?? err)}`
	);
	const last = await page?.evaluate(() => (window.__consoleEvents ?? []).slice(-8)).catch(() => []);
	if (last?.length) console.log(`  the LINAC console's last events: ${JSON.stringify(last)}`);
	const rec = await page?.evaluate(() => window.__recorded ?? []).catch(() => null);
	if (rec) console.log(`  recordResult calls: ${JSON.stringify(rec)}`);
	if (pageErrors.length) console.log(`  page errors: ${pageErrors.join(' | ')}`);
	process.exitCode = 1;
} finally {
	await browser.close();
	server.close();
}
