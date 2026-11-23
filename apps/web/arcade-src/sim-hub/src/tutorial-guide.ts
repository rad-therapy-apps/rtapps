/* The Tutorial's getting started walkthrough (docs/specs/2026-11-23-tutorial-walkthrough-design.md,
   "Getting started (center, 6)") on the shared spotlight (shared/coach.ts), at the start of step 1.
   tutorial.ts starts it with each play (startGuide shows the first bubble itself: an explain pauses
   the game, so no frame would), ticks it on each frame of step 1 with the player's place and
   facing (tickGuide), and stops it at the check-in and on leaving. An explain pauses the game and
   frees the pointer, as a dialog does, until its Next, or Esc through tutorial.ts's dialog entry;
   the sub-steps the player does leave both free. Skip walkthrough ends it for the rest of the
   play. The sub-steps and their rules are tutorial-guide-steps.ts. */
import { hideCoach, showCoach } from '../../shared/coach';
import { DEFAULT_CUE } from '../../shared/walkthrough-core';
import type { SubKind } from '../../shared/walkthrough-core';
import { setPaused } from './pause';
import { requestWalkPointerLock } from './walk';
import {
	GETTING_STARTED,
	GUIDE_DIM,
	GUIDE_HEADER,
	GUIDE_LOCK,
	NOTHING_DONE,
	advanceGuide,
	guideSnap
} from './tutorial-guide-steps';
import type { GuideFrame, GuideProgress } from './tutorial-guide-steps';

let running = false;
let progress: GuideProgress = { reached: 0, base: null };
/** The explains whose Next was pressed this play. */
const seen = new Set<string>();
/** The last frame ticked (none while the explains pause the game). */
let frame: GuideFrame | null = null;
/** An explain shows: the game is paused and the pointer freed. */
let holding = false;

const current = () => (running ? GETTING_STARTED[progress.reached] : undefined);

/* The Tutorial's start asks for the pointer lock (menu.ts) as the first explain shows, and the lock
   comes after: while an explain holds, a lock that arrives is let go, so Next can be clicked. */
document.addEventListener('pointerlockchange', () => {
	if (holding && document.pointerLockElement) document.exitPointerLock();
});

/** Pauses the game and frees the pointer for an explain, or gives them back; `relock` inside a
    click (Next, Skip), which the pointer lock needs. */
function hold(on: boolean, relock: boolean): void {
	if (on === holding) return;
	holding = on;
	setPaused('tutorial-guide', on);
	if (on && document.pointerLockElement) document.exitPointerLock();
	else if (!on && relock) requestWalkPointerLock();
}

/** Whether an element is on screen: it has a box and is not hidden (the controls bar and the E
    prompt keep theirs while faded out). */
function shows(e: Element | null): e is Element {
	if (!e) return false;
	const r = e.getBoundingClientRect();
	return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
}

function show(relock: boolean): void {
	const s = current();
	if (!s) return;
	const sels = s.targets(frame && progress.base ? guideSnap(progress.base, frame) : NOTHING_DONE),
		targets = sels.map((q) => document.querySelector(q)).filter(shows);
	showCoach({
		targets,
		// a sub-step whose targets are not on screen (the E prompt before the player faces Maya
		// Brooks) shows its bubble alone: no dim with nothing to look at, and so no lock
		dim: sels.length && !targets.length ? 'none' : GUIDE_DIM[s.id],
		lock: GUIDE_LOCK[s.id],
		header: GUIDE_HEADER,
		dots: { count: GETTING_STARTED.length, index: progress.reached },
		text: s.text,
		footer: s.kind === 'explain' ? { kind: 'next' } : { kind: 'wait', cue: s.cue ?? DEFAULT_CUE },
		onNext: guideNext,
		onSkip: guideSkip
	});
	hold(s.kind === 'explain', relock);
}

function end(relock: boolean): void {
	running = false;
	hideCoach();
	hold(false, relock);
}

/** Works out the current sub-step from the last frame and shows it, or ends after the last. */
function advance(relock: boolean): void {
	progress = advanceGuide(progress, frame, seen);
	if (progress.reached >= GETTING_STARTED.length) end(relock);
	else show(relock);
}

/** A new play: from the first sub-step, which shows at once. */
export function startGuide(): void {
	running = true;
	progress = { reached: 0, base: null };
	seen.clear();
	frame = null;
	advance(false);
}

/** Leaving the Tutorial, or step 1's check-in: the bubble goes and the game is given back. */
export function stopGuide(): void {
	if (running) end(false);
}

/** One frame of step 1 (tutorial.ts updateTutorial). */
export function tickGuide(ctx: GuideFrame): void {
	if (!running) return;
	frame = ctx;
	advance(false);
}

/** An explain shows: it holds the game, and Esc presses its Next (tutorial.ts's dialog entry). */
export function guideBlocking(): boolean {
	return current()?.kind === 'explain';
}

/** Next on an explain: the next sub-step shows at once. */
export function guideNext(): void {
	const s = current();
	if (s?.kind !== 'explain') return;
	seen.add(s.id);
	advance(true);
}

/** Skip walkthrough: getting started ends for the rest of this play. */
export function guideSkip(): void {
	if (running) end(true);
}

/** The sub-step showing, for the tutorial check (window.__TUTORIAL.coach()); null when none. */
export function guideState(): { id: string; index: number; of: number; kind: SubKind } | null {
	const s = current();
	return s ? { id: s.id, index: progress.reached, of: GETTING_STARTED.length, kind: s.kind } : null;
}
