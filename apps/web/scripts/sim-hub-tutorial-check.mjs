// sim-hub tutorial run-through check (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3).
//
// Imports the built sim-hub bundle under stubbed browser globals (scripts/lib/browser-stubs.mjs)
// with `?npccheck`, which makes the page expose `window.__NPC` (src/npc-check-hook.ts) and
// `window.__TUTORIAL` (src/tutorial.ts), and plays Chapter 1 twice on a simulated clock
// (performance.now and setTimeout run on it, Math.random is seeded), as sim-hub-npc-check.mjs
// does. The player is moved to each target, turns to it and presses E (the real
// performInteraction), answers each decision and follows Jordan on the escorts. Room introduction cards are switched off
// through the page's own preference (localStorage simhub.roomCards.enabled = false).
//   run 1  every decision answered wrong three times: hint 1, hint 2, then the answer shown and
//          the step completed; the 60 s and 120 s walking hints and the 20 s E hint show; on the
//          walk to Vault 1 the player runs ahead and Jordan waits at a stop ("Wait for Jordan");
//          the end card's Keep exploring leaves the player where they stand, in free mode
//   run 2  every decision answered right; the end card's Main menu goes back to the title
// Asserted on both runs: every step completes, in order; the figure the player is being is hidden
// (Jordan's in steps 1-2, Morgan Reed's from step 3) and the vault 1 couch is empty until Jordan
// lies down; every move the tutorial makes (Jordan's escorts, Jamie Williams's walks) keeps the
// 0.2 m circle round the walker's root clear of the wall colliders on every frame (as NPC check l
// does); the marker's route never crosses a wall collider; and after leaving, the journey actors,
// the people's visibility and the vault 1 lasers are exactly as the journey reset leaves them (what
// sim-hub-npc-check.mjs expects).
//
// How to run (builds nothing; run `pnpm build:arcade` first), from apps/web:
//   node scripts/sim-hub-tutorial-check.mjs
// Exit codes: 0 every part passes; 1 any fails; 2 setup error.
// Output: `TUTORIAL CHECK <part> PASS|FAIL: <summary>` per part, then at most 30 detail lines per
// failing part.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installBrowserStubs } from './lib/browser-stubs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STEP_MS = 1000 / 30;
const WALL_R = 0.2; // the root circle checked against the wall colliders (NPC check k and l)
const STEP_LIMIT_S = 300; // the longest a step may take (an escort is the longest)
const MAX_DETAIL = 30;

function setupError(msg) {
	console.error(`TUTORIAL CHECK setup error: ${msg}`);
	process.exit(2);
}

function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Simulated clock, as sim-hub-npc-check.mjs: performance.now and the page's timers run on simNow.
let simNow = 1000;
Object.defineProperty(globalThis.performance, 'now', {
	value: () => simNow,
	configurable: true
});
const timers = new Map();
let timerId = 0;
globalThis.setTimeout = (fn, ms = 0, ...args) => {
	timers.set(++timerId, { at: simNow + (Number(ms) || 0), fn, args });
	return timerId;
};
globalThis.clearTimeout = (id) => timers.delete(id);
function runDueTimers() {
	for (;;) {
		let next = null;
		for (const [id, t] of timers)
			if (t.at <= simNow && (!next || t.at < next[1].at)) next = [id, t];
		if (!next) return;
		timers.delete(next[0]);
		next[1].fn(...next[1].args);
	}
}
Math.random = mulberry32(1);
const warn = console.warn;
console.warn = (...a) => {
	if (a.length === 1 && /^THREE\.WebGLRenderer: \w+ extension not supported\.$/.test(String(a[0])))
		return;
	warn(...a);
};
installBrowserStubs({ search: '?npccheck' });
// a working store, with the room introduction cards off (the page reads it through prefs.ts)
const store = new Map([['simhub.roomCards.enabled', 'false']]);
globalThis.localStorage = {
	getItem: (k) => (store.has(k) ? store.get(k) : null),
	setItem: (k, v) => void store.set(k, String(v)),
	removeItem: (k) => void store.delete(k)
};

const assetsDir = path.resolve(HERE, '../arcade/sim-hub/assets');
let bundle;
try {
	bundle = fs.readdirSync(assetsDir).find((f) => /^index-.*\.js$/.test(f));
} catch {
	/* handled below */
}
if (!bundle) setupError(`no built bundle in ${assetsDir} (run pnpm build:arcade)`);
try {
	await import(pathToFileURL(path.join(assetsDir, bundle)).href);
} catch (err) {
	setupError(`bundle threw during evaluation: ${err && err.stack ? err.stack : err}`);
}
const NPC = globalThis.window && globalThis.window.__NPC;
const T = globalThis.window && globalThis.window.__TUTORIAL;
if (!NPC) setupError('window.__NPC missing (hook not installed with ?npccheck)');
if (!T) setupError('window.__TUTORIAL missing (src/tutorial.ts initTutorial did not run)');
NPC.disableRendering();

const J = NPC.JOURNEY;
const who = (a) =>
	a === J.patient ? 'Jordan' : a === J.vaultTherapist ? 'Jamie Williams' : 'another actor';
const xz = (o) => {
	o.updateWorldMatrix(true, false);
	return { x: o.matrixWorld.elements[12], z: o.matrixWorld.elements[14] };
};
// how far a WALL_R circle at (x, z) reaches into the wall colliders (NPC check k and l)
function wallReach(x, z) {
	let deepest = null;
	for (const c of NPC.colliders) {
		const depth =
			WALL_R -
			Math.hypot(Math.max(Math.abs(x - c.x) - c.hw, 0), Math.max(Math.abs(z - c.z) - c.hd, 0));
		if (depth > 0 && (!deepest || depth > deepest.depth)) deepest = { depth, c };
	}
	return deepest;
}

// every frame of a run: each tutorial move's walker against the walls
let wallHits = [],
	movesSeen = new Set();
function onFrame() {
	if (!T.state().active) return;
	for (const t of NPC.workflowTransitions) {
		movesSeen.add(t);
		const p = xz(t.actor),
			hit = wallReach(p.x, p.z);
		if (hit)
			wallHits.push(
				`step ${T.state().step}: ${who(t.actor)} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) ${(hit.depth * 100).toFixed(1)} cm into the wall at (${hit.c.x.toFixed(2)}, ${hit.c.z.toFixed(2)})`
			);
	}
}
const step = () => {
	simNow += STEP_MS;
	runDueTimers();
	NPC.stepSimulation(simNow);
	onFrame();
};
const stepFor = (seconds) => {
	for (let i = 0; i < Math.round((seconds * 1000) / STEP_MS); i++) step();
};
// steps until cond() holds; false after `seconds`
function stepUntil(cond, seconds) {
	for (let i = 0; i < Math.round((seconds * 1000) / STEP_MS); i++) {
		if (cond()) return true;
		step();
	}
	return cond();
}

// The journey actors and the people as the journey reset leaves them.
function worldState() {
	const actors = {};
	for (const k of ['patient', 'therapist', 'vaultTherapist', 'couchPatient']) {
		const a = J[k];
		actors[k] = {
			x: a.position.x,
			y: a.position.y,
			z: a.position.z,
			ry: a.rotation.y,
			visible: a.visible,
			seated: !!a.userData.seated,
			gown: !!a.userData.inGown,
			locked: !!a.userData.tutorialLocked,
			inHandoff: !!a.userData.inHandoff
		};
	}
	return JSON.stringify({
		actors,
		people: Object.values(NPC.ROOM_CAST)
			.flat()
			.map((e) => e.g.visible),
		moves: NPC.workflowTransitions.length,
		lasers: T.lasersOn()
	});
}
NPC.resetTreatmentJourney(true);
const BASELINE = worldState();

const results = [];
function report(part, fails, summary) {
	results.push({ part, pass: !fails.length, summary, fails });
}

// One play-through. `wrong`: answer every decision wrong three times; also exercises the hints,
// Jordan's wait and Keep exploring. Otherwise answers right and leaves by Main menu.
function play(wrong) {
	const name = wrong ? 'run 1 (wrong answers)' : 'run 2 (right answers)';
	const fails = [],
		order = [];
	wallHits = [];
	movesSeen = new Set();
	let routes = 0;
	T.enter();
	if (T.mode() !== 'tutorial' || T.state().phase !== 'active' || T.state().step !== 1)
		fails.push(`entering did not start step 1 (mode ${T.mode()}, ${JSON.stringify(T.state())})`);
	if (wrong) {
		// the walking hints at the plaza, then the E hint near Maya Brooks
		const st = T.steps[0];
		stepFor(60.5);
		if (T.state().hint !== st.hints[0])
			fails.push(`no hint 1 after 60 s (hint: ${T.state().hint})`);
		stepFor(60);
		if (T.state().hint !== st.hints[1])
			fails.push(`no hint 2 after 120 s (hint: ${T.state().hint})`);
		const [sx, sz] = T.standPoint();
		T.placePlayer(sx, sz + 2); // about 2 m to walk
		stepFor(20.5);
		if (T.state().hint !== 'Walk up to Maya Brooks and press E when the prompt appears.')
			fails.push(`no E hint after 20 s within 6 m (hint: ${T.state().hint})`);
	}
	let testedWait = false;
	while (T.state().phase !== 'done' && !fails.length) {
		const s = T.state(),
			st = T.steps[s.step - 1];
		if (s.phase === 'roleChange' || s.phase === 'waiting') {
			if (!stepUntil(() => T.state().phase !== s.phase, 20))
				fails.push(`step ${s.step}: stuck in '${s.phase}'`);
			continue;
		}
		if (s.phase !== 'active') {
			fails.push(`step ${s.step}: unexpected phase '${s.phase}'`);
			break;
		}
		if (order.at(-1) !== s.step) order.push(s.step);
		// the figure the player is being is hidden; the couch stays empty until Jordan lies down
		if (s.step <= 2 && J.patient.visible) fails.push(`step ${s.step}: Jordan's figure is shown`);
		if (s.step >= 3 && J.therapist.visible)
			fails.push(`step ${s.step}: Morgan Reed's figure is shown`);
		if (s.step <= 5 && J.couchPatient.visible)
			fails.push(`step ${s.step}: the vault 1 couch patient is shown`);
		stepFor(0.2); // the marker's route for the step
		routes++;
		if (T.routeHitsWall())
			fails.push(`step ${s.step}: the marker route crosses a wall: ${JSON.stringify(T.route())}`);
		if (st.trigger === 'pressE') {
			const [x, z] = T.standPoint();
			T.placePlayer(x, z);
			step();
			T.faceTarget(); // E offers only what is in front of the player (interact.ts inView)
			T.pressE();
			if (st.exchange) {
				if (T.state().phase !== 'dialog') fails.push(`step ${s.step}: E did not open the check-in`);
				T.cont();
			} else if (st.decision) {
				if (T.state().phase !== 'dialog') {
					fails.push(`step ${s.step}: E did not open the decision`);
					break;
				}
				const right = st.decision.options.find((o) => o.correct),
					miss = st.decision.options.find((o) => !o.correct);
				if (wrong) {
					for (let i = 1; i <= 3; i++) {
						T.answer(miss.id);
						const m = T.state();
						if (m.misses !== i || m.resolved !== (i === 3))
							fails.push(
								`step ${s.step}: after miss ${i}, misses ${m.misses}, answer shown ${m.resolved}`
							);
					}
				} else {
					T.answer(right.id);
					if (!T.state().resolved || T.state().misses)
						fails.push(`step ${s.step}: the right answer was not accepted`);
				}
				T.cont();
			}
			if (T.state().step === s.step && T.state().phase === 'active')
				fails.push(`step ${s.step}: E at ${st.target.name} did not reach the tutorial's target`);
		} else if (st.trigger === 'enterRoom') {
			const [x, z] = T.standPoint();
			T.placePlayer(x, z);
			if (!stepUntil(() => T.state().step !== s.step, 120))
				fails.push(`step ${s.step}: not completed in ${st.target.place}`);
		} else {
			// escort: walk beside Jordan; on run 1's walk to Vault 1, run ahead once and come back
			const follow = () => {
				const p = xz(J.patient);
				T.placePlayer(p.x + 0.8, p.z + 0.8);
			};
			let frames = 0;
			const going = () => T.state().step === s.step && T.state().phase === 'active';
			while (going() && frames++ < (STEP_LIMIT_S * 1000) / STEP_MS) {
				if (wrong && s.step === 5 && !testedWait && frames === 240) {
					testedWait = true;
					T.placePlayer(73.15, -15.3); // inside Vault 1: far ahead of Jordan
					const held = stepUntil(() => T.state().escortHolding, 30);
					const at = xz(J.patient);
					stepFor(2);
					const still = xz(J.patient);
					if (!held) fails.push('step 5: Jordan did not wait at a stop for the player');
					else if (Math.hypot(still.x - at.x, still.z - at.z) > 1e-6)
						fails.push('step 5: Jordan moved on while waiting');
					if (T.state().hint !== 'Wait for Jordan')
						fails.push(`step 5: no "Wait for Jordan" while far ahead (hint: ${T.state().hint})`);
				}
				follow();
				step();
			}
			if (going()) fails.push(`step ${s.step}: Jordan did not arrive`);
		}
		if (s.step === 2) {
			const c = T.chair();
			if (!c || Math.hypot(c.x - NPC.LOBBY_PICKUP.chair.x, c.z - NPC.LOBBY_PICKUP.chair.z) > 1)
				fails.push(`step 2: the chair is not the journey's pickup chair (${JSON.stringify(c)})`);
		}
	}
	if (!fails.length) {
		if (JSON.stringify(order) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))
			fails.push(`steps played ${JSON.stringify(order)}`);
		if (!T.state().endOpen) fails.push('no end card');
		if (wrong && !testedWait) fails.push("Jordan's wait was not exercised");
	}
	report(
		`${name}: steps`,
		fails,
		`${order.length} of 11 steps completed, ${routes} marker routes clear of the walls`
	);
	report(
		`${name}: walls`,
		wallHits,
		`${movesSeen.size} tutorial moves, the ${WALL_R} m circle round every walker clear of the wall colliders on every frame`
	);
	// leaving
	const leave = [];
	if (!T.state().endOpen) {
		leave.push('the run did not reach the end card');
		T.toTitle();
	} else {
		if (wrong) {
			const before = T.playerPos();
			T.keepExploring();
			const after = T.playerPos();
			if (T.mode() !== 'free') leave.push(`Keep exploring went to '${T.mode()}'`);
			if (Math.hypot(after[0] - before[0], after[1] - before[1]) > 1e-6)
				leave.push(`Keep exploring moved the player from ${before} to ${after}`);
		} else {
			T.mainMenu();
			if (T.mode() !== 'title') leave.push(`Main menu went to '${T.mode()}'`);
		}
	}
	const now = worldState();
	if (now !== BASELINE) leave.push(`world after leaving: ${now}`, `journey reset: ${BASELINE}`);
	report(
		`${name}: leaving`,
		leave,
		`${wrong ? 'Keep exploring' : 'Main menu'}; the journey actors, people and lasers as the journey reset leaves them`
	);
}

play(true);
play(false);

let failed = false;
for (const r of results) {
	console.log(`TUTORIAL CHECK ${r.part} ${r.pass ? 'PASS' : 'FAIL'}: ${r.summary}`);
	if (!r.pass) {
		failed = true;
		for (const f of r.fails.slice(0, MAX_DETAIL)) console.log(`  ${f}`);
	}
}
process.exit(failed ? 1 : 0);
