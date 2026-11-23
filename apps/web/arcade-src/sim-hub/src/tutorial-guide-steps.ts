/* The Tutorial's getting started walkthrough as data (docs/specs/2026-11-23-tutorial-walkthrough-
   design.md, "Getting started (center, 6)"): six bubbles at the start of step 1, on the tracker,
   the marker, walking, looking, following the marker inside and pressing E at Maya Brooks. The two
   explains hold the game until Next; the four the player does are checked from the player each
   frame. Walking and turning are measured from when their own sub-step came up (advanceGuide), so a
   turn made while walking never counts for the look. tutorial-guide.ts shows them on the spotlight
   (shared/coach.ts); the rules are shared/walkthrough-core.ts's. Pure, so tutorial-guide-steps.spec.ts
   tests it in Node. */
import { currentIndex } from '../../shared/walkthrough-core';
import type { SubStep } from '../../shared/walkthrough-core';
import type { CoachDim } from '../../shared/coach';

/** What the player has done since the current sub-step came up, and where they are. */
export interface GuideSnap {
	/** Metres from where the player stood when the current sub-step came up. */
	walked: number;
	/** Degrees from where the player faced when the current sub-step came up. */
	turned: number;
	/** Within reach of Maya Brooks: near her stand point. */
	nearMaya: boolean;
	/** Step 1's E: the check-in is open. */
	checkedIn: boolean;
}

/** The player this frame (tutorial.ts updateTutorial). */
export interface GuideFrame {
	pos: readonly [number, number];
	yaw: number;
	nearMaya: boolean;
	checkedIn: boolean;
}

/** Where the walkthrough is: the furthest sub-step reached, and the player's place and facing when
    it came up; null until a frame after it came up (the explains pause the frames). */
export interface GuideProgress {
	reached: number;
	base: { pos: readonly [number, number]; yaw: number } | null;
}

export const GUIDE_HEADER = 'Getting started';
export const GUIDE_WALK_M = 3;
export const GUIDE_TURN_DEG = 60;

export const GETTING_STARTED: readonly SubStep<GuideSnap>[] = [
	{
		id: 'gs.tracker',
		kind: 'explain',
		text: {
			do: 'This is your objective.',
			why: 'It always says what to do next. The bar fills as you finish steps, and the number on the right is how far away your next stop is. Right now you are Jordan Ellis, a patient arriving for treatment.'
		},
		targets: () => ['#tutTracker']
	},
	{
		id: 'gs.marker',
		kind: 'explain',
		text: {
			do: "The diamond marks where you're going.",
			why: "Its label gives the place and the distance. When it's off screen, an arrow at the edge of the screen points the way."
		},
		targets: () => ['#tutMarker.show', '#tutEdge.show']
	},
	{
		id: 'gs.walk',
		kind: 'do',
		text: {
			do: 'Press W to walk toward the ring at the doors.',
			why: 'A and D step sideways and S steps back. Hold Shift to run.'
		},
		targets: () => ['#controlsBar'],
		done: (s) => s.walked >= GUIDE_WALK_M,
		cue: 'Walk 3 m'
	},
	{
		id: 'gs.look',
		kind: 'do',
		text: {
			do: 'Move the mouse to look around.',
			why: "If the view doesn't turn, click the game once so it can use your mouse. Press Esc to get the mouse back."
		},
		targets: () => [],
		done: (s) => s.turned >= GUIDE_TURN_DEG,
		cue: 'Turn to look around'
	},
	{
		id: 'gs.follow',
		kind: 'do',
		text: {
			do: 'Follow the marker inside to reception.',
			why: 'Reception is just inside the glass doors, on the left.'
		},
		targets: () => [],
		done: (s) => s.nearMaya,
		cue: 'Follow the marker'
	},
	{
		id: 'gs.checkin',
		kind: 'do',
		text: {
			do: 'Press E to check in with Maya Brooks.',
			why: "A prompt like this appears whenever there's something you can do. Press E while it shows."
		},
		targets: () => ['#ePrompt'],
		done: (s) => s.checkedIn,
		cue: 'Press E'
	}
];

/** The dim by sub-step: the movement sub-steps dim lightly, so the player sees where to walk. */
export const GUIDE_DIM: Record<string, CoachDim> = {
	'gs.tracker': 'full',
	'gs.marker': 'full',
	'gs.walk': 'light',
	'gs.look': 'light',
	'gs.follow': 'none',
	'gs.checkin': 'full'
};

/** Whether the sub-step locks the page: only the explains; the player moves in the others. */
export const GUIDE_LOCK: Record<string, boolean> = {
	'gs.tracker': true,
	'gs.marker': true,
	'gs.walk': false,
	'gs.look': false,
	'gs.follow': false,
	'gs.checkin': false
};

/** Nothing done: the snap before the first frame. */
export const NOTHING_DONE: GuideSnap = { walked: 0, turned: 0, nearMaya: false, checkedIn: false };

/** The snap of frame `f`, measured from `base`. The turn is the shortest way round. */
export function guideSnap(base: NonNullable<GuideProgress['base']>, f: GuideFrame): GuideSnap {
	const a = f.yaw - base.yaw;
	return {
		walked: Math.hypot(f.pos[0] - base.pos[0], f.pos[1] - base.pos[1]),
		turned: (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180) / Math.PI,
		nearMaya: f.nearMaya,
		checkedIn: f.checkedIn
	};
}

/** The walkthrough after frame `f` (null: no frame yet), with the explains' Next in `seen`. Once the
    current sub-step is done, the ones after it are measured from this frame: walking and turning
    done before a sub-step came up never pass it. */
export function advanceGuide(
	p: GuideProgress,
	f: GuideFrame | null,
	seen: ReadonlySet<string>
): GuideProgress {
	const base = p.base ?? (f && { pos: f.pos, yaw: f.yaw }),
		i = currentIndex(
			GETTING_STARTED,
			f && base ? guideSnap(base, f) : NOTHING_DONE,
			seen,
			p.reached
		);
	if (i === p.reached) return { reached: i, base };
	// the current one is done; those after it start from here, so walked and turned are 0 for them
	const here = f && { pos: f.pos, yaw: f.yaw };
	return {
		reached: currentIndex(
			GETTING_STARTED,
			f && here ? guideSnap(here, f) : NOTHING_DONE,
			seen,
			p.reached + 1
		),
		base: here
	};
}
