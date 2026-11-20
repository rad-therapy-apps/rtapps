import { describe, it, expect } from 'vitest';
import { COLLISION_PROXY_TOL, collisionRefuses, WORSEN_SLACK } from './collision-rule';

const TOL = COLLISION_PROXY_TOL;

/** A couch axis in the scene: each key press moves the couch 0.1 m (linac-safety.ts MOVEMENT_STEP)
    and the nearest clearance proxy's margin falls by `slope` m for each press toward it. The
    vertical slope is the one measured at the Tutorial's image guidance (Jordan's couch under the
    treatment head at gantry 0: 0.653 m clear at 0 mm, 0.061 m at +6 mm). */
const AXES = [
	{ axis: 'vertical', start: 0.653, slope: 0.0987 },
	{ axis: 'longitudinal', start: 0.48, slope: 0.1 },
	{ axis: 'lateral', start: 0.31, slope: 0.07 }
];

/** Presses a key `times` times from `pos` (in presses), each step through the rule; returns where
    the couch ends and how many presses were refused. */
function press(pos: number, dir: 1 | -1, times: number, margin: (p: number) => number) {
	let refused = 0;
	for (let i = 0; i < times; i++) {
		if (collisionRefuses(margin(pos), margin(pos + dir))) refused++;
		else pos += dir;
	}
	return { pos, refused };
}

describe('the collision rule for one machine move', () => {
	it('allows moves that stay clear', () => {
		expect(collisionRefuses(0.5, 0.4)).toBe(false);
		expect(collisionRefuses(0.4, 0.5)).toBe(false);
		expect(collisionRefuses(Infinity, Infinity)).toBe(false);
	});

	it('refuses a move into the collision zone', () => {
		expect(collisionRefuses(0.06, -0.04)).toBe(true);
		expect(collisionRefuses(0, -0.2)).toBe(true);
	});

	it('takes the boundary step: ending exactly at the tolerance is allowed, just past it is not', () => {
		expect(collisionRefuses(0.07, -TOL)).toBe(false);
		expect(collisionRefuses(0.07, -TOL - 0.001)).toBe(true);
	});

	it('inside the zone, refuses a move that makes the overlap worse', () => {
		expect(collisionRefuses(-0.1, -0.11)).toBe(true);
		expect(collisionRefuses(-0.1, -0.1 - WORSEN_SLACK - 0.001)).toBe(true);
	});

	it('inside the zone, allows a move that improves or holds the overlap', () => {
		expect(collisionRefuses(-0.1, -0.05)).toBe(false);
		expect(collisionRefuses(-0.1, -0.1)).toBe(false);
		// the proxies' numerical noise: a sideways move a hair worse still goes
		expect(collisionRefuses(-0.1, -0.1 - WORSEN_SLACK / 2)).toBe(false);
	});

	it('always allows leaving the zone', () => {
		expect(collisionRefuses(-0.2, 0.1)).toBe(false);
		expect(collisionRefuses(-TOL - 0.001, -TOL)).toBe(false);
	});

	it('never refuses a move that gains clearance, from anywhere', () => {
		const margins = [-0.4, -0.2, -0.05, -TOL - 0.001, -TOL, -0.01, 0, 0.01, 0.1, 0.6];
		for (const before of margins)
			for (const after of margins)
				if (after > before)
					expect(collisionRefuses(before, after), `${before} → ${after}`).toBe(false);
	});
});

describe('overshoot, then back', () => {
	for (const { axis, start, slope } of AXES)
		it(`stops ${axis} + at the boundary, clear, then lets every − press back`, () => {
			const margin = (p: number) => start - slope * p;
			const up = press(0, 1, 30, margin);
			// it stops before the collision: the last position reached is still inside the tolerance and
			// the next press would not be
			expect(up.refused).toBeGreaterThan(0);
			expect(margin(up.pos)).toBeGreaterThanOrEqual(-TOL);
			expect(margin(up.pos + 1)).toBeLessThan(-TOL);
			// every press back goes, all the way past the start
			const down = press(up.pos, -1, up.pos + 5, margin);
			expect(down.refused).toBe(0);
			expect(down.pos).toBe(-5);
		});

	it('the Tutorial: Vert + stops at +6 mm, past the +4 mm correction, and Vert − returns to +4', () => {
		const margin = (v: number) => 0.653 - 0.0987 * v;
		const up = press(0, 1, 20, margin);
		expect(up.pos).toBe(6);
		const down = press(up.pos, -1, 2, margin);
		expect(down).toEqual({ pos: 4, refused: 0 });
	});

	it('backs out of an overlap the couch is already in (the geometry moved under it)', () => {
		const margin = (p: number) => -0.15 - 0.1 * p; // 0.15 m inside at 0, worse going +
		expect(press(0, 1, 3, margin)).toEqual({ pos: 0, refused: 3 });
		expect(press(0, -1, 4, margin)).toEqual({ pos: -4, refused: 0 });
	});
});
