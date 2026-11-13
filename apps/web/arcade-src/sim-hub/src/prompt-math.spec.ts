import { describe, expect, it } from 'vitest';
import {
	inFront,
	promptSide,
	SIGHT_END_CLEARANCE,
	segmentBlocked,
	smoothOpacity,
	type WallRect
} from './prompt-math';

describe('smoothOpacity', () => {
	it('moves at most dt / 0.25 s toward the target, so a full fade-in takes 0.25 s', () => {
		const a = smoothOpacity(0, 1, 0.1),
			b = smoothOpacity(a, 1, 0.1);
		expect(a).toBeCloseTo(0.4);
		expect(b).toBeCloseTo(0.8);
		expect(smoothOpacity(b, 1, 0.1)).toBe(1);
	});

	it('fades out the same way and never passes the target', () => {
		expect(smoothOpacity(1, 0, 0.125)).toBeCloseTo(0.5);
		expect(smoothOpacity(0.3, 0.5, 1)).toBe(0.5);
	});
});

describe('segmentBlocked', () => {
	// a 10 m wall along z = 0, 0.16 m thick, with a doorway from x -0.8 to 0.8: two colliders, as
	// rooms.ts builds a wall with a door
	const walls: WallRect[] = [
		{ x: -2.9, z: 0, hw: 2.1, hd: 0.08 },
		{ x: 2.9, z: 0, hw: 2.1, hd: 0.08 }
	];

	it('is blocked through the wall', () => {
		expect(segmentBlocked(-2, -2, -2, 2, walls)).toBe(true);
	});

	it('is clear through the doorway', () => {
		expect(segmentBlocked(0, -2, 0.3, 2, walls)).toBe(false);
	});

	it('is blocked on a slant that clips the wall beside the doorway', () => {
		expect(segmentBlocked(-3, -1, 1, 1, walls)).toBe(true);
	});

	it('is clear when both ends are on the same side', () => {
		expect(segmentBlocked(-2, -2, 2, -1, walls)).toBe(false);
	});

	it('keeps a target on the wall face from being hidden by that wall, with the end clearance', () => {
		expect(segmentBlocked(-2, -2, -2, -0.05, walls)).toBe(true);
		expect(segmentBlocked(-2, -2, -2, -0.05, walls, SIGHT_END_CLEARANCE)).toBe(false);
	});

	it('is clear with no walls, and for a target closer than the clearance', () => {
		expect(segmentBlocked(-2, -2, -2, 2, [])).toBe(false);
		expect(segmentBlocked(-2, -0.2, -2, 0.05, walls, SIGHT_END_CLEARANCE)).toBe(false);
	});
});

describe('inFront', () => {
	// facing -z (yaw 0), standing at the origin
	it('is true for a target ahead, even off to one side', () => {
		expect(inFront(0, -1, 0, 0, 0, -3)).toBe(true);
		expect(inFront(0, -1, 0, 0, 4, -1)).toBe(true);
	});

	it('is false behind the player and level with them', () => {
		expect(inFront(0, -1, 0, 0, 0, 3)).toBe(false);
		expect(inFront(0, -1, 0, 0, 2, 0)).toBe(false);
		expect(inFront(0, -1, 0, 0, 0, 0)).toBe(false);
	});

	it('measures from the eye, not the origin', () => {
		expect(inFront(1, 0, 10, 5, 11, 5)).toBe(true);
		expect(inFront(1, 0, 10, 5, 9, 5)).toBe(false);
	});
});

describe('promptSide (viewport 1440 wide, prompt 200 wide)', () => {
	it('goes right of the target when it fits', () => {
		expect(promptSide(500, 10, 200, 1, 1440)).toEqual({ side: 'right', edge: 510 });
	});

	it('still fits right when the scaled width just reaches the margin', () => {
		expect(promptSide(1222, 10, 200, 1, 1440).side).toBe('right');
		expect(promptSide(1223, 10, 200, 1, 1440).side).toBe('left');
	});

	it('flips to the left when it would clip on the right, the right edge at the target minus the gap', () => {
		expect(promptSide(1300, 10, 200, 1, 1440)).toEqual({ side: 'left', edge: 1290 });
	});

	it('decides the side at full size, whatever the current scale', () => {
		expect(promptSide(1100, 10, 200, 0.6, 1440).side).toBe('right');
		expect(promptSide(1250, 10, 200, 1, 1440).side).toBe('left');
		expect(promptSide(1250, 10, 200, 0.6, 1440).side).toBe('left');
	});

	it('never lets the left side pass the left edge: the prompt then sits at the margin', () => {
		expect(promptSide(300, 10, 400, 1, 500)).toEqual({ side: 'left', edge: 408 });
	});

	it('clamps a target past the right edge to the margin', () => {
		expect(promptSide(1600, 10, 200, 1, 1440)).toEqual({ side: 'left', edge: 1432 });
	});
});
