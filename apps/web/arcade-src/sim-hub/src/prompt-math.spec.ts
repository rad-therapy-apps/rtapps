import { describe, expect, it } from 'vitest';
import {
	PROMPT_LEAD,
	SIGHT_END_CLEARANCE,
	promptVisual,
	segmentBlocked,
	smoothOpacity,
	type WallRect
} from './prompt-math';

describe('promptVisual, for a staff member (reach 2.4 m)', () => {
	const at = (d: number) => promptVisual(d, 2.4);

	it('is hidden at 6 m', () => {
		expect(at(6)).toEqual({ visible: false, opacity: 0, scale: 0.6 });
	});

	it('starts at reach + 3.0 = 5.4 m, still transparent', () => {
		expect(at(5.4)).toEqual({ visible: false, opacity: 0, scale: 0.6 });
	});

	it('fades in over the first 0.5 m', () => {
		expect(at(5.15).visible).toBe(true);
		expect(at(5.15).opacity).toBeCloseTo(0.5);
	});

	it('is fully opaque from 4.9 m, where it starts to grow from 0.6', () => {
		expect(at(4.9)).toEqual({ visible: true, opacity: 1, scale: 0.6 });
	});

	it('is part grown at 3.5 m', () => {
		expect(at(3.5).opacity).toBe(1);
		expect(at(3.5).scale).toBeCloseTo(0.824);
	});

	it('is full size at the reach, 2.4 m, and closer in, 2.0 m', () => {
		expect(at(2.4)).toEqual({ visible: true, opacity: 1, scale: 1 });
		expect(at(2.0)).toEqual({ visible: true, opacity: 1, scale: 1 });
	});

	it('starts PROMPT_LEAD beyond any reach', () => {
		expect(promptVisual(4.2 + PROMPT_LEAD - 0.01, 4.2).visible).toBe(true);
		expect(promptVisual(4.2 + PROMPT_LEAD + 0.01, 4.2).visible).toBe(false);
	});
});

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
