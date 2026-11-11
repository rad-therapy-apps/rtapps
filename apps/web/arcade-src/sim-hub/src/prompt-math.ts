/* Pure helpers for the E prompt (sim-hub menu, task 1b): how visible and how big the prompt is at a
   distance from its target, the smoothing that keeps it from popping, and the 2D line-of-sight test
   against the walk colliders. Free of scene and DOM imports so it is unit tested in Node
   (prompt-math.spec.ts). */

/** A wall collider as walk.ts collider() stores it (getColliders()): its centre and half extents on the
    floor plan. Every collider is a wall: helpers.ts wall() is collider()'s only caller. */
export interface WallRect {
	x: number;
	z: number;
	hw: number;
	hd: number;
}

/** The prompt starts to appear this far beyond its target's reach (5.4 m for staff, reach 2.4). */
export const PROMPT_LEAD = 3.0;
/** Over the first FADE_IN metres inside PROMPT_LEAD its opacity rises from 0 to 1. */
const FADE_IN = 0.5;
/** Its scale grows from MIN_SCALE at reach + GROW to 1 at the reach. */
const GROW = 2.5,
	MIN_SCALE = 0.6;
/** Seconds the shown opacity takes to follow a full 0 to 1 change. */
export const OPACITY_SMOOTH_SEC = 0.25;
/** The sight line stops this short of its target, so a target hanging on a wall is not hidden by it. */
export const SIGHT_END_CLEARANCE = 0.3;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The prompt at `dist` metres (measured from REACH_Y) from a target whose E reach is `range`. */
export function promptVisual(
	dist: number,
	range: number
): { visible: boolean; opacity: number; scale: number } {
	const opacity = clamp01((range + PROMPT_LEAD - dist) / FADE_IN),
		scale = MIN_SCALE + (1 - MIN_SCALE) * clamp01((range + GROW - dist) / GROW);
	return { visible: opacity > 0, opacity, scale };
}

/** Moves the shown opacity toward `target`, at most a full change per OPACITY_SMOOTH_SEC. */
export function smoothOpacity(shown: number, target: number, dt: number): number {
	const step = dt / OPACITY_SMOOTH_SEC;
	return shown < target ? Math.min(target, shown + step) : Math.max(target, shown - step);
}

/** Whether a wall lies between a (the player) and b (the target) on the floor plan. With
    `endClearance` the segment stops that far short of b. */
export function segmentBlocked(
	ax: number,
	az: number,
	bx: number,
	bz: number,
	walls: readonly WallRect[],
	endClearance = 0
): boolean {
	const len = Math.hypot(bx - ax, bz - az);
	if (len <= endClearance) return false;
	const k = (len - endClearance) / len,
		dx = (bx - ax) * k,
		dz = (bz - az) * k;
	for (const w of walls) if (crossesRect(ax, az, dx, dz, w)) return true;
	return false;
}

/** Slab test: does a + t·d, for t in [0, 1], pass through the inside of the rectangle? */
function crossesRect(ax: number, az: number, dx: number, dz: number, w: WallRect): boolean {
	let t0 = 0,
		t1 = 1;
	const slabs: [number, number, number, number][] = [
		[ax, dx, w.x - w.hw, w.x + w.hw],
		[az, dz, w.z - w.hd, w.z + w.hd]
	];
	for (const [p, d, lo, hi] of slabs) {
		if (Math.abs(d) < 1e-9) {
			if (p <= lo || p >= hi) return false;
			continue;
		}
		const ta = (lo - p) / d,
			tb = (hi - p) / d;
		t0 = Math.max(t0, Math.min(ta, tb));
		t1 = Math.min(t1, Math.max(ta, tb));
		if (t0 >= t1) return false;
	}
	return true;
}
