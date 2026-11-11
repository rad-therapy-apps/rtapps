import { describe, it, expect } from 'vitest';
import {
	advanceStop,
	closestOnSegment,
	edgeArrow,
	eHintDue,
	escortAhead,
	escortStops,
	formatDistance,
	invSmoothstep,
	lineBlocked,
	missFeedback,
	newStuckTimer,
	offRoute,
	remainingDistance,
	routeLength,
	smoothstep,
	stepEscort,
	stepNear,
	stepStuck,
	stuckLevel
} from './tutorial-math';
import type { EscortHold, Pt, StuckTimer } from './tutorial-math';

// An L-shaped route: 3 m east, then 4 m north; it is 7 m long.
const L: Pt[] = [
	[0, 0],
	[3, 0],
	[3, 4]
];

describe('route walking distance', () => {
	it('is the length along the route, not the straight line', () => {
		expect(routeLength(L)).toBeCloseTo(7);
		expect(routeLength([[0, 0]])).toBe(0);
	});

	it('counts from the player to the next stop, then along the rest of the route', () => {
		expect(remainingDistance(L, 1, [1, 0])).toBeCloseTo(6);
		expect(remainingDistance(L, 2, [3, 1])).toBeCloseTo(3);
		// off the route, the distance to the stop is the straight line to it
		expect(remainingDistance(L, 1, [3, -2])).toBeCloseTo(6);
	});
});

describe('the marker stop as the player advances', () => {
	it('moves to the next stop once the player is within 1.5 m, not before', () => {
		expect(advanceStop(L, 1, [1.49, 0])).toBe(1);
		expect(advanceStop(L, 1, [1.51, 0])).toBe(2);
	});

	it('never passes the last stop', () => {
		expect(advanceStop(L, 2, [3, 4])).toBe(2);
		expect(advanceStop(L, 1, [3, 1.4])).toBe(2);
	});

	it('skips every stop already within reach', () => {
		const close: Pt[] = [
			[0, 0],
			[1, 0],
			[1.5, 0],
			[10, 0]
		];
		expect(advanceStop(close, 1, [0.4, 0])).toBe(3);
	});

	it('finds the point of a desk edge nearest the player', () => {
		expect(closestOnSegment([2, 5], [0, 0], [0, 4])).toEqual([0, 4]);
		expect(closestOnSegment([2, 1], [0, 0], [0, 4])).toEqual([0, 1]);
	});

	it('is off the route more than 4 m from the leg being walked', () => {
		expect(offRoute(L, 1, [1.5, 3.9])).toBe(false);
		expect(offRoute(L, 1, [1.5, 4.1])).toBe(true);
		expect(offRoute(L, 2, [7.1, 2])).toBe(true);
	});
});

describe('line of sight against the walls', () => {
	const wall = { x: 0, z: 5, hw: 4, hd: 0.08 };
	const doorway = [
		{ x: -3, z: 5, hw: 2, hd: 0.08 },
		{ x: 3, z: 5, hw: 2, hd: 0.08 }
	];

	it('is blocked by a wall between the points', () => {
		expect(lineBlocked([0, 0], [0, 10], [wall])).toBe(true);
	});

	it('is clear beside a wall, short of it and through a doorway', () => {
		expect(lineBlocked([5, 0], [5, 10], [wall])).toBe(false);
		expect(lineBlocked([0, 0], [0, 4.5], [wall])).toBe(false);
		expect(lineBlocked([0, 0], [0, 10], doorway)).toBe(false);
	});
});

describe('stuck hints on walking steps', () => {
	// quarter-second frames, exact in binary, so the thresholds are met exactly
	const run = (t: StuckTimer, seconds: number, distance: number) => {
		for (let i = 0; i < seconds * 4; i++) t = stepStuck(t, 0.25, distance);
		return t;
	};
	const seen = (distance: number) => stepStuck(newStuckTimer(), 0, distance);

	it('shows hint 1 after 60 s and hint 2 after 120 s without progress', () => {
		let t = run(seen(40), 59.75, 40);
		expect(stuckLevel(t.idle)).toBe(0);
		t = run(t, 0.25, 40);
		expect(stuckLevel(t.idle)).toBe(1);
		t = run(t, 59.75, 40);
		expect(stuckLevel(t.idle)).toBe(1);
		t = run(t, 0.25, 40);
		expect(stuckLevel(t.idle)).toBe(2);
	});

	it('counts a drop of 1 m as progress, and less than that as none', () => {
		let t = run(seen(40), 50, 40);
		t = stepStuck(t, 0.25, 39.1);
		expect(t.idle).toBe(50.25);
		t = stepStuck(t, 0.25, 39);
		expect(t).toEqual({ best: 39, idle: 0 });
	});

	it('does not count walking away and back as progress', () => {
		let t = run(seen(20), 30, 20);
		t = run(t, 20, 35);
		t = run(t, 10, 20);
		expect(t.idle).toBe(60);
		expect(stuckLevel(t.idle)).toBe(1);
	});
});

describe('the E-step hint', () => {
	it('is due after 20 s within 6 m without pressing E', () => {
		let near = 0;
		for (let i = 0; i < 79; i++) near = stepNear(near, 0.25, 6);
		expect(eHintDue(near)).toBe(false);
		near = stepNear(near, 0.25, 5);
		expect(eHintDue(near)).toBe(true);
	});

	it('starts over when the player walks more than 6 m away', () => {
		let near = 0;
		for (let i = 0; i < 60; i++) near = stepNear(near, 0.25, 3);
		near = stepNear(near, 0.25, 6.5);
		expect(near).toBe(0);
	});
});

describe('decision misses', () => {
	it('gives hint 1, hint 2, then the answer at the third miss', () => {
		expect([1, 2, 3, 4].map(missFeedback)).toEqual(['hint1', 'hint2', 'reveal', 'reveal']);
	});
});

describe('the journey ease and its inverse', () => {
	it('round-trips', () => {
		for (const u of [0, 0.2, 0.5, 0.9, 1]) expect(invSmoothstep(smoothstep(u))).toBeCloseTo(u);
		expect(smoothstep(0.5)).toBeCloseTo(0.5);
	});
});

describe('escort stops and holds', () => {
	it('stops at corners and doors, never at the start or the end', () => {
		// 10 m east (a door point at 5 m on the straight), then 10 m north
		const route: Pt[] = [
			[0, 0],
			[5, 0],
			[10, 0],
			[10, 10]
		];
		expect(escortStops(route, [[5, 0.3]])).toEqual([0.25, 0.5]);
		expect(escortStops(route, [])).toEqual([0.5]);
		expect(
			escortStops(
				[
					[0, 0],
					[4, 0.1],
					[8, 0]
				],
				[]
			)
		).toEqual([]);
	});

	it('walks on past a stop while the player is within 5 m', () => {
		const r = stepEscort({ next: 0, holding: false }, 0.3, [0.25, 0.5], 4);
		expect(r.holdAt).toBeNull();
		expect(r.hold).toEqual({ next: 1, holding: false });
	});

	it('waits at the stop until the player is within 5 m, then walks on', () => {
		let h: EscortHold = { next: 0, holding: false };
		let r = stepEscort(h, 0.26, [0.25, 0.5], 9);
		expect(r.holdAt).toBe(0.25);
		h = r.hold;
		r = stepEscort(h, 0.27, [0.25, 0.5], 6);
		expect(r.holdAt).toBe(0.25);
		r = stepEscort(r.hold, 0.25, [0.25, 0.5], 4.5);
		expect(r.holdAt).toBeNull();
		expect(r.hold).toEqual({ next: 1, holding: false });
	});

	it('says "Wait for Jordan" only when the player is more than 12 m ahead', () => {
		expect(escortAhead(12.1, 30, 40)).toBe(true);
		expect(escortAhead(11.9, 30, 40)).toBe(false);
		expect(escortAhead(20, 50, 40)).toBe(false);
	});
});

describe('the off-screen edge arrow', () => {
	it('draws an on-screen stop at its point', () => {
		const a = edgeArrow(0, 0, false);
		expect(a.onScreen).toBe(true);
		expect(a.x).toBeCloseTo(0.5);
		expect(a.y).toBeCloseTo(0.5);
	});

	it('points right from the right edge and up from the top edge', () => {
		const right = edgeArrow(2, 0, false);
		expect(right.onScreen).toBe(false);
		expect(right.x).toBeCloseTo(0.975);
		expect(right.y).toBeCloseTo(0.5);
		expect(right.angle).toBeCloseTo(0);
		const up = edgeArrow(0, 3, false);
		expect(up.y).toBeCloseTo(0.025);
		expect(up.angle).toBeCloseTo(-90);
	});

	it('points the way to turn for a stop behind the camera', () => {
		const back = edgeArrow(0, 0, true);
		expect(back.onScreen).toBe(false);
		expect(back.y).toBeCloseTo(0.975);
		expect(back.angle).toBeCloseTo(90);
		// behind and to the left projects to the right of the screen
		const left = edgeArrow(0.4, 0, true);
		expect(left.x).toBeCloseTo(0.025);
		expect(Math.abs(left.angle)).toBeCloseTo(180);
	});
});

describe('distance text', () => {
	it('rounds to whole metres', () => {
		expect(formatDistance(0.4)).toBe('0 m');
		expect(formatDistance(12.6)).toBe('13 m');
	});
});
