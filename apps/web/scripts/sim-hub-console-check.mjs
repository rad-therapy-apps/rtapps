// sim-hub console check (docs/specs/2026-11-18-consoles-in-center-design.md, part 6): the real
// LINAC console, in the center's console panel, played through the Tutorial's console steps in
// headless Chromium.
//
// Serves the built arcade (apps/web/arcade, and apps/web/static/arcade for the shared SDK) on a
// random port, opens /arcade/sim-hub/?npccheck, starts the Tutorial and moves through its other
// steps with the window.__TUTORIAL hooks, as sim-hub-tutorial-check.mjs does; Jordan's and Jamie
// Williams's walks, which that check follows frame by frame, are put at their ends (each move in
// window.__NPC.workflowTransitions finished), and the center's own drawing is off, as in the Node
// checks (window.__NPC.disableRendering). At each console step it presses E at the target and
// plays the LINAC console in the panel's iframe by its real buttons: the drag from the equipment
// shelf, the couch keys and the held Move to field key.
//   each console step skips its Tutorial walkthrough at the first bubble, with its Skip
//   step 3  checking in the look-alike first is refused and the Tutorial shows hint 1; Jordan's
//           check-in and chart complete the step, and the panel closes a beat later
//   step 6  Patient Setup at the couch: Jordan's devices dragged onto the table, the checks ticked,
//           Verify; the step completes
//   step 8  image guidance (Jordan's whole-brain plan images with the MV panel): a new daily
//           setup, the MV panel out, the images; Vert + past the correction until the collision
//           interlock stops the couch (the Tutorial's hint: Vert −, then Verify Alignment; the status
//           line: correction pending), then Vert − from there goes and clears the refusal (the status
//           line: within tolerance); the couch correction from the console's keys, Verify Alignment
//   step 9  delivery: the window opens with the right lateral field selected; the left lateral
//           picked first, the top line and the geometry hold name the mismatch (Gantry 0° → 90°),
//           and a refused Enable Beam makes the Tutorial's hint name the fix with the field, which
//           follows the field picked back; a click on Move to field (not a hold) brings the note to
//           keep holding, not a mistake; then the right lateral field (gantry 270) and, selected by
//           the console after it, the left lateral field (90), each held to with Move to field (the
//           key says it is moving, then At field, and the Tutorial's hint goes); Vault 1's gantry
//           (window.__NPC.vaultLinac) passes the angles between, one way, and ends at the field's
//           angle (0 to 270, then 270 to 90); the Vault 1 board shows BEAM ON while the beam is
//           on, BETWEEN FIELDS between the fields and TREATMENT COMPLETE at the end
//   then    a second play from the title, steps 1-3: the console's page boots fresh, so
//           Jordan's check-in and chart open again, following the schedule walkthrough (its two
//           explains, then the two presses), and step 3 completes
// Also asserted: the Tutorial's events arrive in order from the console (console-bus.ts), Jordan
// is on the Vault 1 monitors from step 3, and no page (the center or the console) throws.
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-console-check.mjs
// Needs Playwright's Chromium (WebGL through Metal on macOS, SwiftShader elsewhere). Exit codes:
// 0 pass; 1 a check failed; 2 setup error (no build, or Chromium did not start). Output: one
// `CONSOLE CHECK <part> PASS` line per part with its time (step 6's says how the drags went: by
// mouse or by the drag events), then the whole run's time; or `CONSOLE CHECK FAIL: <what>` and
// the console's last events. Before each click the console (and at each opening the center) is
// scanned by lib/no-scroll.mjs: nothing may scroll and nothing in the console may be cut off; at
// the end `NO-SCROLL PASS`, or `NO-SCROLL FAIL` with each scrolling area and each cut-off
// element (exit code 1). CHECK_VIEW=WxH (e.g. 992x624) sets the center's size.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkView, createNoScrollCollector } from './lib/no-scroll.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const ARCADE = path.join(WEB, 'arcade');
const STATIC = path.join(WEB, 'static/arcade');
const { chromium } = createRequire(path.join(WEB, 'package.json'))('playwright');
const VIEW = checkView({ width: 1280, height: 800 });
const noScroll = createNoScrollCollector();

function setupError(msg) {
	console.error(`CONSOLE CHECK setup error: ${msg}`);
	process.exit(2);
}
for (const app of ['sim-hub', 'linac-ct'])
	if (!fs.existsSync(path.join(ARCADE, app, 'index.html')))
		setupError(`arcade/${app}/index.html is missing: run \`pnpm build:arcade\` first`);

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
// The built apps at /arcade/<app>/ and the shared arcade files (rtapps-sdk.js) at /arcade/.
const server = http.createServer((req, res) => {
	const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
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

// WebGL in headless Chromium: the GPU through Metal on macOS, SwiftShader (software) elsewhere
let browser, page;
const pageErrors = [];
try {
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
	page = await (await browser.newContext({ viewport: VIEW })).newPage();
	page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
	await page.addInitScript(() => localStorage.setItem('simhub.roomCards.enabled', 'false'));
} catch (err) {
	await browser?.close();
	server.close();
	setupError(`Chromium did not start: ${err?.message ?? err}`);
}

const T0 = Date.now();
let partStart = T0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class CheckFailure extends Error {}
function expect(ok, what) {
	if (!ok) throw new CheckFailure(what);
}
// Upper bounds only: a passing run takes a few seconds per step on a GPU. The console's machine
// moves by its own frames, which a software renderer (CI) runs several times slower.
const WAIT_MS = 60000,
	MOTION_MS = 180000,
	DRAG_MS = 60000;
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
	console.log(`CONSOLE CHECK ${name} PASS (${((now - partStart) / 1000).toFixed(1)} s)`);
	partStart = now;
}
const tut = (fn, arg) => page.evaluate(fn, arg);
const state = () => tut(() => window.__TUTORIAL.state());
const stepIs = (n, phase = 'active') =>
	until(
		`step ${n} '${phase}'`,
		([n, p]) => {
			const s = window.__TUTORIAL.state();
			return s.step === n && s.phase === p;
		},
		60000,
		[n, phase]
	);
/** Waits for step `n`'s card (a console step's shows once its console has closed) and presses its
    Continue. */
async function continueCard(n) {
	await until(
		`step ${n}'s card`,
		(n) => {
			const s = window.__TUTORIAL.state();
			return s.step === n && s.phase === 'card' && s.card;
		},
		60000,
		n
	);
	await tut(() => window.__TUTORIAL.cardContinue());
}
/** Resolves after `n` of the center's frames (its frame loop moves the E targets and the prompt). */
const frames = (n) =>
	page.evaluate(
		(n) =>
			new Promise((ok) => {
				let k = 0;
				const f = () => (++k >= n ? ok() : requestAnimationFrame(f));
				requestAnimationFrame(f);
			}),
		n
	);
/** Stands the player at the step's E target (or at `at`), turned to it, waits until the game
    offers the step's E prompt for the new spot, presses E and checks it took: the step's phase
    changes (to its dialog, its console or the next step). */
async function pressE(at) {
	await tut((at) => {
		const t = window.__TUTORIAL,
			[x, z] = at ?? t.standPoint();
		t.placePlayer(x, z);
	}, at);
	// the E targets follow the player and the prompt is worked out every third frame
	await frames(4);
	const t0 = Date.now();
	for (;;) {
		await tut(() => window.__TUTORIAL.faceTarget());
		await frames(4);
		const offered = await tut(() => {
			const t = window.__TUTORIAL;
			return (
				document.getElementById('ePrompt')?.classList.contains('show') &&
				document.getElementById('ePromptTitle')?.textContent ===
					t.steps[t.state().step - 1].target.label
			);
		});
		if (offered) break;
		if (Date.now() - t0 > WAIT_MS)
			throw new CheckFailure(`timed out after ${WAIT_MS / 1000} s waiting for the step's E prompt`);
	}
	const before = await state();
	await tut(() => window.__TUTORIAL.pressE());
	const after = await state();
	expect(
		after.phase !== before.phase || after.step !== before.step,
		`E at step ${before.step}'s target did nothing (prompt '${await tut(() => document.getElementById('ePromptTitle')?.textContent)}')`
	);
}
const events = () => tut(() => window.__consoleEvents);
const eventCount = async () => (await events()).length;
/** Waits for a console event of `kind` after the first `from`. */
const nextEvent = (kind, from, timeout = WAIT_MS) =>
	until(
		`the console's '${kind}' event`,
		([k, n]) => window.__consoleEvents.slice(n).find((e) => e.kind === k),
		timeout,
		[kind, from]
	);

try {
	// a software renderer (SwiftShader) takes a while to compile the center's shaders
	await page.goto(`${origin}/arcade/sim-hub/?npccheck`, { waitUntil: 'load', timeout: 180000 });
	await until(
		'the center to load',
		() => document.getElementById('loader')?.classList.contains('hide'),
		120000
	);
	await tut(() => {
		// the center's own drawing is off: nothing here reads its pixels, and a software renderer (CI)
		// draws it at under a frame a second, too slow to play in real time
		window.__NPC.disableRendering();
		const bus = window.__NPC.consoleBus;
		window.__consoleEvents = [];
		// each time a LINAC console page has booted (its ready, to the center)
		window.__consoleReadies = 0;
		addEventListener('message', (e) => {
			if (e.data?.type === 'rtapps-linac-ready') window.__consoleReadies++;
		});
		bus.linacEvents.on((e) => window.__consoleEvents.push(e));
		// the Vault 1 board and machine as each pose comes in
		window.__boards = [];
		window.__gantry = [];
		bus.linacPose.on(() => {
			const b = window.__TUTORIAL.boards().vault1;
			if (window.__boards.at(-1) !== b) window.__boards.push(b);
		});
		// finishes `actor`'s journey move now (the Node checks walk it frame by frame)
		window.__skipWalk = (actor) => {
			for (const t of window.__NPC.workflowTransitions)
				if (t.actor === actor && !t.rise && !t.sit)
					t.start = window.__NPC.state.simSec - t.duration;
		};
		const sample = () => {
			const g = window.__NPC.vaultLinac.state().current?.gantry;
			if (g !== undefined && window.__gantry.at(-1) !== g) window.__gantry.push(g);
			requestAnimationFrame(sample);
		};
		requestAnimationFrame(sample);
	});
	expect(
		await until(
			'Vault 1 to load the LINAC model',
			() => window.__NPC.vaultLinac.state().loaded,
			60000
		),
		'Vault 1 has the LINAC model'
	);
	part('load');

	// ---------- steps 1-2, as the patient ----------
	// getting started (tutorial-guide.ts) is the tutorial check's to play: skipped here
	await tut(() => {
		window.__TUTORIAL.enter();
		window.__TUTORIAL.coachSkip();
	});
	await stepIs(1);
	await pressE();
	await tut(() => window.__TUTORIAL.cont());
	await continueCard(1);
	await stepIs(2);
	await pressE();
	await continueCard(2);
	await stepIs(3);
	part('steps 1-2');

	// ---------- step 3: today's schedule ----------
	await pressE([46.1, 9.0]); // the console's stand point
	await until(
		'the panel to open at the queue',
		() => window.__NPC.isConsoleOpen() && window.__TUTORIAL.state().console?.workspace === 'queue'
	);
	await noScroll.scan(page, 'the center, panel open at queue');
	await until(
		"the LINAC console's ready",
		() => window.__NPC.consoleMessages().some((m) => m.message.type === 'rtapps-linac-ready'),
		60000
	);
	const frame = page.frames().find((f) => f.url().includes('/arcade/linac-ct/index.html'));
	expect(
		frame && frame.url().includes('view=console') && frame.url().includes('scenario=tutorial'),
		`the panel holds the LINAC console in the tutorial scenario (${frame?.url()})`
	);
	const click = async (sel) => {
		await noScroll.scan(frame, `before clicking ${sel}`);
		await frame.locator(sel).first().click();
		await sleep(120);
	};
	const consoleKey = (target) => click(`#rtv2MachinePanel [data-console-target="${target}"]`);
	// The console's Tutorial walkthrough (walkthrough-mode.ts): this play skips each part at its
	// first bubble with the bubble's own Skip, so today's paths (the mistakes among them) play as
	// before. A part with no walkthrough yet shows no bubble (`optional`).
	const walk = () => frame.evaluate(() => window.__WALKTHROUGH?.state() ?? null);
	const skipWalkthrough = async (part, optional = false) => {
		const t0 = Date.now();
		let s = await walk();
		while (!s && Date.now() - t0 < 1500) {
			await sleep(100);
			s = await walk();
		}
		if (!s && optional) return;
		expect(
			s?.part === part && s.index === 0,
			`the ${part} walkthrough opens at its first bubble (${JSON.stringify(s)})`
		);
		await frame.locator('#rtCoach .rt-coach-skip').click();
		await frame.waitForFunction(() => !window.__WALKTHROUGH.state());
	};
	const walkNext = async (from, to) => {
		await frame.waitForFunction((id) => window.__WALKTHROUGH.state()?.id === id, from);
		await frame.locator('#rtCoach .rt-coach-next').click();
		await frame.waitForFunction((id) => window.__WALKTHROUGH.state()?.id === id, to);
	};
	await skipWalkthrough('queue');
	const steps = await tut(() =>
		window.__TUTORIAL.steps.map(
			(s) => s.console && { hints: s.console.hints, reveal: s.console.reveal }
		)
	);
	let n = await eventCount();
	await click('#rtv2QueueRows .rtv2-queue-row:nth-child(1) .rtv2-checkin'); // the look-alike
	const refused = await nextEvent('mistake', n);
	expect(
		refused.code === 'wrong-patient',
		`checking in the look-alike is refused as wrong-patient (${refused.code})`
	);
	const hint1 = `Not yet. ${steps[2].hints[0]}`;
	await until(
		'the Tutorial to show hint 1',
		(h) => window.__TUTORIAL.state().hint === h,
		3000,
		hint1
	);
	await click('#rtv2QueueRows .rtv2-queue-row:nth-child(2) .rtv2-checkin');
	await click('#rtv2QueueRows .rtv2-queue-row:nth-child(2) .rtv2-openchart');
	await continueCard(3);
	await stepIs(4);
	expect(
		(await state()).jordanOnMonitors,
		'Jordan is on the Vault 1 monitors once the chart is open'
	);
	await until('the panel to close after the beat', () => !window.__NPC.isConsoleOpen());
	part('step 3 (schedule)');

	// ---------- steps 4-5: call Jordan, the walk to Vault 1 ----------
	await pressE();
	await tut(() => {
		const t = window.__TUTORIAL,
			s = t.steps[t.state().step - 1];
		t.answer(s.decision.options.find((o) => o.correct).id);
		t.cont();
	});
	await continueCard(4);
	await stepIs(5);
	await until(
		'Jordan to reach the couch',
		() => {
			const t = window.__TUTORIAL,
				s = t.state(),
				J = window.__NPC.JOURNEY;
			if (s.step !== 5 || s.phase === 'card') return true;
			if (!s.walkFade) {
				t.placePlayer(J.patient.position.x + 0.8, J.patient.position.z + 0.8);
				window.__skipWalk(J.patient);
			}
			return false;
		},
		60000
	);
	await continueCard(5);
	await stepIs(6);
	part('steps 4-5');

	// ---------- step 6: Patient Setup at the couch ----------
	await pressE();
	await until(
		'the panel to open at Patient Setup',
		() => window.__NPC.isConsoleOpen() && window.__TUTORIAL.state().console?.workspace === 'setup'
	);
	await noScroll.scan(page, 'the center, panel open at setup');
	await frame.locator('#immobilizationVerify').waitFor({ state: 'visible' });
	await skipWalkthrough('setup', true);
	await noScroll.scan(frame, 'Patient Setup, on opening');
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
	// all the drags, bounded: a native drag that never ends would otherwise hold the check for many
	// minutes (seen once, locally, under heavy machine load)
	const dragAll = async () => {
		const paths = [];
		for (const name of keys) {
			const src = frame.locator(`#immobilizationShelf .immo-device[aria-label="${name}"]`),
				dst = frame.locator('#immobilizationTableDrop');
			// a real mouse drag from the shelf to the table; headless Chromium now and then drops one, so
			// up to 3 tries, as the console's own harness does
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
				paths.push('mouse');
				continue;
			}
			// headless Chromium's native drag-and-drop can still drop a drag inside an iframe under load:
			// then the same drag events go to the same elements, so the console's own handlers run
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
			paths.push('drag events');
		}
		return paths;
	};
	const dragPaths = await Promise.race([dragAll(), sleep(DRAG_MS).then(() => null)]);
	expect(dragPaths, `the drags onto the table did not finish in ${DRAG_MS / 1000} s`);
	const onTable = await placed();
	expect(
		keys.length > 0 && keys.every((k) => onTable.some((l) => l.startsWith(k))),
		`dragged ${keys.join(' + ')} onto the table (${onTable.join(', ')}; ${dragPaths.join(', ')})`
	);
	for (const id of ['immoPositionCheck', 'immoIndexCheck', 'immoPrepCheck'])
		if (await frame.locator(`#${id}`).count()) await click(`#${id}`);
	await click('#immobilizationVerify');
	await continueCard(6);
	await stepIs(7);
	await until('the panel to close after the beat', () => !window.__NPC.isConsoleOpen());
	part(`step 6 (setup; dragged by ${dragPaths.join(', ')})`);

	// ---------- step 7: back to LINAC Control ----------
	await tut(() => {
		const t = window.__TUTORIAL,
			[x, z] = t.standPoint();
		t.placePlayer(x, z);
	});
	await until(
		'Jamie Williams to join the player in LINAC Control',
		() => {
			window.__skipWalk(window.__NPC.JOURNEY.vaultTherapist);
			const s = window.__TUTORIAL.state();
			return s.step === 7 && s.phase === 'card';
		},
		60000
	);
	await continueCard(7);
	await stepIs(8);
	part('step 7');

	// ---------- step 8: image guidance ----------
	await pressE([46.1, 9.0]);
	await until(
		'the panel to open at image guidance',
		() => window.__NPC.isConsoleOpen() && window.__TUTORIAL.state().console?.workspace === 'igrt'
	);
	await noScroll.scan(page, 'the center, panel open at igrt');
	await frame.locator('#igrtNewSetup').waitFor({ state: 'visible' });
	await skipWalkthrough('igrt', true);
	await noScroll.scan(frame, 'image guidance, on opening');
	await click('#igrtNewSetup');
	await consoleKey('consoleMV');
	n = await eventCount();
	await click('#igrtAcquire');
	const acquired = await nextEvent('images-acquired', n);
	expect(acquired.shiftMm === 4, `the check images show Jordan's 4 mm shift (${acquired.shiftMm})`);
	await click('#rtv2MotionEnable');
	n = await eventCount();
	// an overshoot first: Vert + past the +4 mm correction until the collision interlock stops the
	// couch (still clear of the treatment head), then Vert − from there goes, and its refusal goes;
	// the Tutorial's hint for the collision says Vert − and Verify Alignment, not new images, and the
	// status line under the residuals follows the tolerance both ways
	const appliedVertical = () =>
		frame
			.locator('#igrtCorrectionRows .igrt-row')
			.evaluateAll(
				(els) =>
					els.find((r) => r.firstElementChild?.textContent.trim() === 'Vertical')?.children[2]
						.textContent
			)
			.then(parseFloat);
	const refusalShown = () => frame.evaluate(() => !!document.querySelector('#consoleRefusal.show'));
	const statusLine = () => frame.locator('#igrtResult').textContent();
	const hintBefore = (await state()).hint;
	let stopped = null;
	for (let i = 0; i < 12 && !stopped; i++) {
		const from = await eventCount();
		await consoleKey('consoleVrtPlus');
		stopped = (await events()).slice(from).find((e) => e.kind === 'mistake');
	}
	const top = await appliedVertical();
	expect(
		stopped?.code === 'collision' && top > 4 && (await refusalShown()),
		`Vert + past the correction stops at the collision interlock, the refusal shown (${top} mm applied; ${JSON.stringify(stopped)})`
	);
	const hint = await until(
		"the Tutorial's hint for the collision",
		(before) => {
			const h = window.__TUTORIAL.state().hint;
			return h !== before && h;
		},
		3000,
		hintBefore
	);
	expect(
		hint.includes('Vert −') &&
			hint.includes('Verify Alignment') &&
			!/New Daily Setup|Acquire Images/.test(hint),
		`the Tutorial's hint after the collision names Vert − and Verify Alignment, not new images ("${hint}")`
	);
	expect(
		/^Correction pending/.test(await statusLine()),
		`the status line past the correction says the correction is pending ("${await statusLine()}")`
	);
	const fromTop = await eventCount();
	await consoleKey('consoleVrtMinus');
	const back = await appliedVertical(),
		refusedBack = (await events()).slice(fromTop).filter((e) => e.kind === 'mistake');
	expect(
		back === top - 1 && refusedBack.length === 0 && !(await refusalShown()),
		`Vert − from the stop goes and the refusal goes with it (${top} to ${back} mm; refused ${JSON.stringify(refusedBack)}; refusal shown: ${await refusalShown()})`
	);
	// 1 mm past the correction is inside Jordan's 1 mm tolerance
	expect(
		(await statusLine()) === 'Within tolerance · press Verify Alignment.',
		`the status line within tolerance says to verify (${back} mm applied: "${await statusLine()}")`
	);
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
	await consoleKey('consoleMV'); // stowed for the beam
	await click('#igrtVerify');
	await continueCard(8);
	await stepIs(9);
	await until('the panel to close after the beat', () => !window.__NPC.isConsoleOpen());
	part('step 8 (image guidance)');

	// ---------- step 9: delivery ----------
	await pressE([46.1, 9.0]);
	await until(
		'the panel to open at delivery',
		() =>
			window.__NPC.isConsoleOpen() && window.__TUTORIAL.state().console?.workspace === 'delivery'
	);
	await frame.locator('#rtv2EnableBeam').waitFor({ state: 'visible' });
	await skipWalkthrough('delivery', true);
	await noScroll.scan(page, 'the center, panel open at delivery');
	await noScroll.scan(frame, 'delivery screen, on opening');
	const pose = () =>
		tut(
			() =>
				window.__NPC
					.consoleMessages()
					.filter((m) => m.message.type === 'rtapps-linac-state')
					.at(-1)?.message.pose
		);
	// the signed turn from angle a to angle b the shortest way round, -180..180 (degrees)
	const turn = (a, b) => ((b - a + 540) % 360) - 180;
	const shown = (sel) =>
		frame.evaluate(
			(sel) => document.querySelector(sel)?.textContent.trim().replace(/\s+/g, ' ') ?? null,
			sel
		);
	const selected = () =>
		frame.evaluate(() =>
			[...document.querySelectorAll('#rtv2dFieldList .rtv2d-field-row')].findIndex((r) =>
				r.classList.contains('active')
			)
		);
	/** Polls `fn` (run in the console's page) until it returns something truthy. */
	const inConsole = async (what, fn, arg, timeout = WAIT_MS) => {
		for (const t0 = Date.now(); ; await sleep(100)) {
			const v = await frame.evaluate(fn, arg);
			if (v) return v;
			if (Date.now() - t0 > timeout)
				throw new CheckFailure(`timed out after ${timeout / 1000} s waiting for ${what}`);
		}
	};
	const hintIs = (what, want) =>
		until(what, (h) => window.__TUTORIAL.state().hint === h, 3000, want).catch(async () => {
			throw new CheckFailure(`${what} (the hint: "${(await state()).hint}")`);
		});
	expect((await selected()) === 0, 'the delivery window opens with Right Lateral selected');
	// the wrong field first: the top line and the geometry hold name the gantry, now → planned
	await click('#rtv2dFieldList .rtv2d-field-row[data-index="1"]');
	await inConsole(
		'the top line to name the left lateral field and its gantry',
		(want) => document.getElementById('rtv2dHeroCaption')?.textContent.trim() === want,
		'Left Lateral: hold Move to field until the checklist is green (Gantry 0° → 90°).'
	);
	const holdName = await shown('#rtv2dChecklist .rtv2d-check.bad b'),
		holdDetail = await shown('#rtv2dChecklist .rtv2d-check.bad span');
	expect(
		holdName === 'Treatment geometry matches plan' && holdDetail === 'Gantry 0° → 90°',
		`the Interlocks tab's hold names the mismatch ("${holdName}": "${holdDetail}")`
	);
	n = await eventCount();
	await click('#rtv2EnableBeam');
	const geometryRefused = await nextEvent('mistake', n);
	expect(
		geometryRefused.code === 'geometry-mismatch' &&
			geometryRefused.message.includes('(Gantry 0° → 90°)'),
		`Enable Beam is refused for the geometry, naming it (${JSON.stringify(geometryRefused)})`
	);
	await hintIs(
		"the Tutorial's hint to name the fix with the left lateral field",
		'Not yet. Hold Move to field until Left Lateral’s gantry reaches 90° and the checklist turns green.'
	);
	await click('#rtv2dFieldList .rtv2d-field-row[data-index="0"]');
	await hintIs(
		"the Tutorial's hint to follow the field picked back",
		'Not yet. Hold Move to field until Right Lateral’s gantry reaches 270° and the checklist turns green.'
	);
	// a click on Move to field, not a hold: the note to keep holding, which is not a mistake
	n = await eventCount();
	const misses = (await state()).misses;
	await noScroll.scan(frame, 'delivery, before clicking Move to field');
	const moveBox = await frame.locator('#consoleMoveToField').boundingBox();
	await page.mouse.click(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
	await inConsole(
		'the note to keep holding Move to field',
		() =>
			document.querySelector('#consoleRefusal.show.notice')?.textContent ===
			'Keep holding to move to the field'
	);
	await sleep(300);
	expect(
		(await events()).slice(n).every((e) => e.kind !== 'mistake') &&
			(await state()).misses === misses,
		`the note is not a mistake (${JSON.stringify((await events()).slice(n))})`
	);
	expect(
		(await shown('#consoleMoveToField')) === 'Hold to move to field',
		`Move to field let go says to hold it ("${await shown('#consoleMoveToField')}")`
	);
	// Jordan's whole-brain fields (linac-ct delivery/cases.ts, the whole-brain case), each with the
	// gantry angle it starts near: 0 at the setup (the click may have turned it a frame's worth),
	// then the first field's
	for (const [index, field, gantry, near] of [
		[0, 'Right Lateral', 270, 0],
		[1, 'Left Lateral', 90, 270]
	]) {
		// after the first field the console selects the next, with no click
		if (index > 0)
			await inConsole('the console to select the left lateral field', () =>
				document
					.querySelector('#rtv2dFieldList .rtv2d-field-row[data-index="1"]')
					?.classList.contains('active')
			);
		const from = (await pose())?.gantry;
		expect(
			Math.abs(turn(near, from)) < 3,
			`the console's gantry is at ${near} before the ${field} field (${from})`
		);
		await tut(() => (window.__gantry = []));
		await noScroll.scan(frame, 'delivery, before holding Move to field');
		const hold = frame.locator('#consoleMoveToField');
		await hold.scrollIntoViewIfNeeded();
		const box = await hold.boundingBox();
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		let moving = null;
		const t0 = Date.now();
		while (Date.now() - t0 < MOTION_MS && (await pose())?.gantry !== gantry) {
			moving ??= (await shown('#consoleMoveToField')) === 'Moving… keep holding' || null;
			await sleep(100);
		}
		await page.mouse.up();
		expect(
			(await pose())?.gantry === gantry,
			`Move to field turned the console's gantry to ${gantry} (${(await pose())?.gantry})`
		);
		expect(moving, 'Move to field says "Moving… keep holding" while held');
		await inConsole(
			'Move to field to say At field',
			() => document.getElementById('consoleMoveToField')?.textContent === 'At field'
		);
		await hintIs("the Tutorial's hint to go once the geometry matches", null);
		// Vault 1's machine follows: the angles between, then the field's
		await until(
			`Vault 1 gantry at ${gantry}`,
			(g) =>
				Math.abs(((window.__NPC.vaultLinac.state().current.gantry - g + 540) % 360) - 180) < 0.5,
			WAIT_MS,
			gantry
		);
		// sampled once a frame: a few angles even at a software renderer's frame rate. Each sample
		// as the turn so far from the start (small steps between samples, so each the shortest
		// way): all of one sign, the whole turn from the start to the field, a few in between
		const seen = await tut(() => window.__gantry);
		const turned = [];
		for (const [i, g] of seen.entries())
			turned.push((i ? turned[i - 1] : 0) + turn(i ? seen[i - 1] : from, g));
		const travel = Math.abs(turn(from, gantry)),
			total = turned.at(-1),
			oneWay = turned.every((t, i) => !i || Math.sign(t - turned[i - 1]) !== -Math.sign(total)),
			between = turned.filter((t) => Math.abs(t) > 1 && Math.abs(t) < travel - 1);
		expect(
			Math.abs(Math.abs(total) - travel) < 1 && oneWay && between.length >= 5,
			`Vault 1's gantry turned from ${from} to the ${field} field's ${gantry} through the angles between, one way (${seen.map((g) => g.toFixed(0)).join(', ')})`
		);
		n = await eventCount();
		const boardsFrom = (await tut(() => window.__boards)).length;
		await click('#rtv2EnableBeam');
		await click('#rtv2BeamOn');
		const delivered = await nextEvent('field-delivered', n, MOTION_MS);
		expect(delivered.field === field, `field-delivered ${field} (${delivered.field})`);
		// the board as each pose came in: BEAM ON while the beam was on, BETWEEN FIELDS after the first
		await until(
			`the Vault 1 board to show BEAM ON during ${field}${index === 0 ? ', then BETWEEN FIELDS' : ''}`,
			([from, after]) => {
				const b = window.__boards.slice(from);
				return b.includes('BEAM ON') && (!after || b.at(-1) === after) && b;
			},
			WAIT_MS,
			[boardsFrom, index === 0 ? 'BETWEEN FIELDS' : null]
		);
	}
	await continueCard(9);
	await stepIs(10);
	expect(
		(await tut(() => window.__TUTORIAL.boards().vault1)) === 'TREATMENT COMPLETE',
		'the Vault 1 board shows TREATMENT COMPLETE'
	);
	await until('the panel to close after the beat', () => !window.__NPC.isConsoleOpen());
	part('step 9 (delivery)');

	const order = (await events())
		.filter((e) => e.kind !== 'mistake')
		.map((e) => (e.kind === 'field-delivered' ? `${e.kind}:${e.field}` : e.kind));
	const want = [
		'checked-in',
		'chart-opened',
		'setup-complete',
		'images-acquired',
		'shift-applied',
		'alignment-verified',
		'field-delivered:Right Lateral',
		'field-delivered:Left Lateral',
		'treatment-complete'
	];
	expect(
		JSON.stringify(order) === JSON.stringify(want),
		`the console's events in order: ${order.join(' > ')}`
	);
	expect(
		(await events()).every((e) => e.kind === 'mistake' || e.mrn === 'TUT-680314'),
		"every step event is Jordan's"
	);
	const boards = await tut(() => window.__boards);
	console.log(`  Vault 1 board through delivery: ${boards.join(' > ')}`);

	// ---------- a second play, steps 1-3: a fresh console page, so Jordan checks in again ----------
	const readies = await tut(() => window.__consoleReadies);
	await tut(() => {
		window.__TUTORIAL.toTitle();
		window.__TUTORIAL.enter();
		window.__TUTORIAL.coachSkip();
	});
	await stepIs(1);
	await pressE();
	await tut(() => window.__TUTORIAL.cont());
	await continueCard(1);
	await stepIs(2);
	await pressE();
	await continueCard(2);
	await stepIs(3);
	await pressE([46.1, 9.0]);
	await until(
		'the panel to open at the queue again',
		() => window.__NPC.isConsoleOpen() && window.__TUTORIAL.state().console?.workspace === 'queue'
	);
	await noScroll.scan(page, 'the center, panel open at queue');
	expect((await state()).console.fresh, 'the second play asks for a fresh console page');
	await until(
		"the console's page to boot again",
		(r) => window.__consoleReadies > r,
		WAIT_MS,
		readies
	);
	// this play follows the schedule walkthrough: its two explains, then its two presses
	await walkNext('queue.intro', 'queue.twins');
	await walkNext('queue.twins', 'queue.checkin');
	n = await eventCount();
	await click('#rtv2QueueRows .rtv2-queue-row:nth-child(2) .rtv2-checkin');
	await frame.waitForFunction(() => window.__WALKTHROUGH.state()?.id === 'queue.chart');
	await click('#rtv2QueueRows .rtv2-queue-row:nth-child(2) .rtv2-openchart');
	await continueCard(3);
	await stepIs(4);
	const again = (await events()).slice(n).map((e) => e.kind);
	expect(
		JSON.stringify(again) === JSON.stringify(['checked-in', 'chart-opened']),
		`the second play checks Jordan in and opens the chart again (${again.join(', ')})`
	);
	part('a second play, steps 1-3');

	expect(pageErrors.length === 0, `no page errors: ${pageErrors.join(' | ')}`);
	const scrolled = noScroll.fail();
	if (scrolled) {
		console.log(scrolled);
		process.exitCode = 1;
	} else {
		console.log(
			`NO-SCROLL PASS: ${noScroll.scans} scans at ${VIEW.width}x${VIEW.height}, nothing scrolls; ${noScroll.cutScans} of the console, nothing cut off`
		);
		console.log(
			`CONSOLE CHECK PASS: steps 3, 6, 8 and 9 on the real LINAC console, and step 3 of a second play, in ${((Date.now() - T0) / 1000).toFixed(0)} s`
		);
	}
} catch (err) {
	console.log(
		`CONSOLE CHECK FAIL: ${err instanceof CheckFailure ? err.message : (err?.stack ?? err)}`
	);
	const last = await page.evaluate(() => (window.__consoleEvents ?? []).slice(-8)).catch(() => []);
	if (last.length) console.log(`  the console's last events: ${JSON.stringify(last)}`);
	const where = await page
		.evaluate(() => {
			const { phase, step, hint, console: open, dialogOpen, walkFade } = window.__TUTORIAL.state();
			const shown = [
				...document.querySelectorAll('#settingsMenu.show, #roomPopup.show, #tutDialog.show')
			].map((e) => e.id);
			return {
				step,
				phase,
				hint,
				console: open,
				dialogOpen,
				walkFade,
				shown,
				prompt: document.getElementById('ePromptTitle')?.textContent
			};
		})
		.catch(() => null);
	if (where) console.log(`  the Tutorial: ${JSON.stringify(where)}`);
	if (pageErrors.length) console.log(`  page errors: ${pageErrors.join(' | ')}`);
	process.exitCode = 1;
} finally {
	await browser.close();
	server.close();
}
