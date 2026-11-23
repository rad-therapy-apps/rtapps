import { describe, expect, it } from 'vitest';
import { currentIndex } from '../../shared/walkthrough-core';
import {
	GETTING_STARTED,
	GUIDE_DIM,
	GUIDE_LOCK,
	GUIDE_TURN_DEG,
	GUIDE_WALK_M,
	advanceGuide,
	guideSnap
} from './tutorial-guide-steps';
import type { GuideFrame, GuideProgress, GuideSnap } from './tutorial-guide-steps';

const steps = GETTING_STARTED,
	ids = steps.map((s) => s.id),
	EXPLAINS = ['gs.tracker', 'gs.marker'];
const snap = (o: Partial<GuideSnap> = {}): GuideSnap => ({
	walked: 0,
	turned: 0,
	nearMaya: false,
	checkedIn: false,
	...o
});
const at = (s: GuideSnap, seen: string[] = [], reached = 0) =>
	currentIndex(steps, s, new Set(seen), reached);
const frame = (x: number, z: number, yawDeg: number, o: Partial<GuideFrame> = {}): GuideFrame => ({
	pos: [x, z],
	yaw: (yawDeg * Math.PI) / 180,
	nearMaya: false,
	checkedIn: false,
	...o
});

describe('getting started', () => {
	it('has the six sub-steps, the two explains first', () => {
		expect(steps.map((s) => [s.id, s.kind])).toEqual([
			['gs.tracker', 'explain'],
			['gs.marker', 'explain'],
			['gs.walk', 'do'],
			['gs.look', 'do'],
			['gs.follow', 'do'],
			['gs.checkin', 'do']
		]);
		expect([GUIDE_WALK_M, GUIDE_TURN_DEG]).toEqual([3, 60]);
	});

	it('targets the tracker, the marker or its edge arrow, the controls bar and the E prompt', () => {
		expect(steps.map((s) => s.targets(snap()))).toEqual([
			['#tutTracker'],
			['#tutMarker.show', '#tutEdge.show'],
			['#controlsBar'],
			[],
			[],
			['#ePrompt']
		]);
	});

	it('dims fully, lightly for walking and looking, not at all for following; only explains lock', () => {
		expect(ids.map((id) => GUIDE_DIM[id])).toEqual([
			'full',
			'full',
			'light',
			'light',
			'none',
			'full'
		]);
		expect(ids.map((id) => GUIDE_LOCK[id])).toEqual([true, true, false, false, false, false]);
	});

	it('gives each sub-step the player does its cue', () => {
		expect(steps.map((s) => s.cue ?? null)).toEqual([
			null,
			null,
			'Walk 3 m',
			'Turn to look around',
			'Follow the marker',
			'Press E'
		]);
	});

	it('moves on by Next, 3 m walked, a 60° turn, reaching Maya Brooks and her E', () => {
		expect(at(snap())).toBe(0);
		expect(at(snap(), ['gs.tracker'])).toBe(1);
		expect(at(snap(), EXPLAINS)).toBe(2);
		expect(at(snap({ walked: 2.9 }), EXPLAINS)).toBe(2);
		expect(at(snap({ walked: 3 }), EXPLAINS)).toBe(3);
		expect(at(snap({ turned: 59 }), EXPLAINS, 3)).toBe(3);
		expect(at(snap({ turned: 60 }), EXPLAINS, 3)).toBe(4);
		expect(at(snap(), EXPLAINS, 4)).toBe(4);
		expect(at(snap({ nearMaya: true }), EXPLAINS, 4)).toBe(5);
		expect(at(snap({ nearMaya: true, checkedIn: true }), EXPLAINS, 4)).toBe(6);
	});

	it('measures walking and turning from a base, the turn the shortest way round', () => {
		const base = { pos: [4, 20] as const, yaw: (170 * Math.PI) / 180 };
		const s = guideSnap(base, frame(4, 17, -170));
		expect(s.walked).toBeCloseTo(3);
		expect(s.turned).toBeCloseTo(20);
		expect(guideSnap(base, frame(4, 20, 100)).turned).toBeCloseTo(70);
	});

	it('takes the base of each sub-step from the frame it came up on', () => {
		const seen = new Set(EXPLAINS);
		// no frame yet (the explains paused the game): the walk's base is the first frame
		let p: GuideProgress = advanceGuide({ reached: 2, base: null }, null, seen);
		expect(p).toEqual({ reached: 2, base: null });
		p = advanceGuide(p, frame(4, 20, 0), seen);
		expect(p).toEqual({ reached: 2, base: { pos: [4, 20], yaw: 0 } });
		p = advanceGuide(p, frame(4, 18, 0), seen);
		expect(p.reached).toBe(2);
		p = advanceGuide(p, frame(4, 16.9, 0), seen);
		expect(p).toEqual({ reached: 3, base: { pos: [4, 16.9], yaw: 0 } });
	});

	it('does not pass the look on turning done before it came up', () => {
		const seen = new Set(EXPLAINS);
		let p: GuideProgress = { reached: 2, base: { pos: [4, 20], yaw: 0 } };
		// a 90° turn while walking, then the 3 m that finish the walk: the look comes up, not done
		p = advanceGuide(p, frame(4, 19, 90), seen);
		expect(p.reached).toBe(2);
		p = advanceGuide(p, frame(4, 16.5, 90), seen);
		expect(p.reached).toBe(3);
		p = advanceGuide(p, frame(4, 16.5, 120), seen);
		expect(p.reached).toBe(3);
		p = advanceGuide(p, frame(4, 16.5, 155), seen);
		expect(p.reached).toBe(4);
	});

	it('passes over following when the player is already at Maya Brooks as it comes up', () => {
		const seen = new Set(EXPLAINS);
		const p = advanceGuide(
			{ reached: 3, base: { pos: [0, 0], yaw: 0 } },
			frame(0, 0, 61, { nearMaya: true }),
			seen
		);
		expect(p).toEqual({ reached: 5, base: { pos: [0, 0], yaw: (61 * Math.PI) / 180 } });
	});

	it('moves on from an explain by Next alone, with or without a frame', () => {
		expect(advanceGuide({ reached: 0, base: null }, null, new Set()).reached).toBe(0);
		expect(advanceGuide({ reached: 0, base: null }, null, new Set(['gs.tracker']))).toEqual({
			reached: 1,
			base: null
		});
		expect(advanceGuide({ reached: 1, base: null }, frame(4, 20, 0), new Set(EXPLAINS))).toEqual({
			reached: 2,
			base: { pos: [4, 20], yaw: 0 }
		});
	});
});
