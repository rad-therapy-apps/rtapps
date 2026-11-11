/* Pure helpers for the sim-hub tutorial (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md,
   PR 3): the walking distance along a marker route, the marker's next stop as the player walks it,
   the line-of-sight test against the walk colliders, the stuck and E-step hint timers, the decision
   miss counter, Jordan's escort stops and holds, and the off-screen edge arrow. Plain numbers only
   (points are [x, z] in metres), so its spec runs without the scene; tutorial.ts feeds it the
   world. */

/** A point on the floor: [x, z] in metres. */
export type Pt = readonly [number, number];
/** A wall collider (walk.ts getColliders): centre x/z and half-sizes. */
export interface Rect {
	x: number;
	z: number;
	hw: number;
	hd: number;
}

/** The marker moves on to the next stop when the player comes this close (m). */
export const MARKER_SWITCH_R = 1.5;
/** The route is rebuilt when the player is this far off the leg they are walking (m). */
export const OFF_ROUTE_R = 4;
/** A walking step makes progress when the walking distance drops by this much (m). */
export const STUCK_PROGRESS_M = 1;
/** Seconds without progress before hint 1 and hint 2. */
export const STUCK_HINT_S: readonly [number, number] = [60, 120];
/** The E-step hint shows after E_HINT_S seconds within E_HINT_R of the target (m, walking). */
export const E_HINT_R = 6;
export const E_HINT_S = 20;
/** The miss that shows the answer. */
export const REVEAL_AT = 3;
/** Jordan waits at a stop until the player is within ESCORT_WAIT_R (m). */
export const ESCORT_WAIT_R = 5;
/** "Wait for Jordan" shows when the player is this far ahead of Jordan (m). */
export const ESCORT_AHEAD_R = 12;

export function dist(a: Pt, b: Pt): number {
	return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** The length of the polyline through `pts`. */
export function routeLength(pts: readonly Pt[]): number {
	let n = 0;
	for (let i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]);
	return n;
}

/** The walking distance from `p` to the route's end: to stop `idx`, then along the route. */
export function remainingDistance(pts: readonly Pt[], idx: number, p: Pt): number {
	if (!pts.length) return 0;
	const i = Math.min(Math.max(idx, 0), pts.length - 1);
	return dist(p, pts[i]) + routeLength(pts.slice(i));
}

/** The next stop once the player is at `p`: stop `idx`, or later ones while each is within `r`.
    The route's last point is never passed. */
export function advanceStop(pts: readonly Pt[], idx: number, p: Pt, r = MARKER_SWITCH_R): number {
	let i = idx;
	while (i < pts.length - 1 && dist(p, pts[i]) < r) i++;
	return i;
}

/** The point of segment a-b nearest to `p`. */
export function closestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
	const dx = b[0] - a[0],
		dz = b[1] - a[1],
		len2 = dx * dx + dz * dz;
	if (len2 < 1e-12) return a;
	const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
	return [a[0] + dx * t, a[1] + dz * t];
}

/** Whether the player at `p` is farther than `r` from the leg they are walking, stop idx-1 to idx. */
export function offRoute(pts: readonly Pt[], idx: number, p: Pt, r = OFF_ROUTE_R): boolean {
	if (pts.length < 2) return false;
	const i = Math.min(Math.max(idx, 1), pts.length - 1);
	return dist(p, closestOnSegment(p, pts[i - 1], pts[i])) > r;
}

/** Whether segment a-b passes through rectangle c (slab test, x/z). */
export function segmentHitsRect(a: Pt, b: Pt, c: Rect): boolean {
	let t0 = 0,
		t1 = 1;
	const axes: [number, number, number, number][] = [
		[a[0], b[0] - a[0], c.x - c.hw, c.x + c.hw],
		[a[1], b[1] - a[1], c.z - c.hd, c.z + c.hd]
	];
	for (const [o, d, lo, hi] of axes) {
		if (Math.abs(d) < 1e-12) {
			if (o <= lo || o >= hi) return false;
			continue;
		}
		const u = (lo - o) / d,
			v = (hi - o) / d;
		t0 = Math.max(t0, Math.min(u, v));
		t1 = Math.min(t1, Math.max(u, v));
		if (t0 >= t1) return false;
	}
	return true;
}

/** Whether any wall collider lies between a and b. */
export function lineBlocked(a: Pt, b: Pt, walls: readonly Rect[]): boolean {
	return walls.some((c) => segmentHitsRect(a, b, c));
}

/** The stuck timer of a walking step: the lowest walking distance seen since the last progress,
    and the seconds since then. */
export interface StuckTimer {
	best: number;
	idle: number;
}
export function newStuckTimer(): StuckTimer {
	return { best: Infinity, idle: 0 };
}
/** One frame: progress (the distance at least STUCK_PROGRESS_M under the best) restarts the timer;
    the step's first frame only sets the best. */
export function stepStuck(t: StuckTimer, dt: number, distance: number): StuckTimer {
	if (!Number.isFinite(t.best)) return { best: distance, idle: t.idle + dt };
	if (distance <= t.best - STUCK_PROGRESS_M) return { best: distance, idle: 0 };
	return { best: t.best, idle: t.idle + dt };
}
/** Which walking hint the idle time has reached: 0 none, 1 or 2. */
export function stuckLevel(idle: number): 0 | 1 | 2 {
	if (idle >= STUCK_HINT_S[1]) return 2;
	if (idle >= STUCK_HINT_S[0]) return 1;
	return 0;
}

/** One frame of an E step's timer: seconds within E_HINT_R of the target, reset beyond it. */
export function stepNear(near: number, dt: number, distance: number): number {
	return distance <= E_HINT_R ? near + dt : 0;
}
export function eHintDue(near: number): boolean {
	return near >= E_HINT_S;
}

export type FeedbackKind = 'correct' | 'hint1' | 'hint2' | 'reveal';
/** The feedback for the n-th wrong answer to one decision: hint 1, hint 2, then the answer. */
export function missFeedback(misses: number): 'hint1' | 'hint2' | 'reveal' {
	if (misses >= REVEAL_AT) return 'reveal';
	return misses === 2 ? 'hint2' : 'hint1';
}

/** The ease journey moves walk their curve with (equipment.ts updateWorkflowTransitions). */
export function smoothstep(u: number): number {
	const x = Math.max(0, Math.min(1, u));
	return x * x * (3 - 2 * x);
}
/** The time fraction u at which smoothstep(u) reaches e. */
export function invSmoothstep(e: number): number {
	const x = Math.max(0, Math.min(1, e));
	return 0.5 - Math.sin(Math.asin(1 - 2 * x) / 3);
}

/** Where Jordan waits along an escort route: the inner points that turn by at least `turnDeg` or
    lie within `doorR` of a door point, as fractions of the route's length, in order. */
export function escortStops(
	pts: readonly Pt[],
	doors: readonly Pt[],
	turnDeg = 20,
	doorR = 0.6
): number[] {
	const total = routeLength(pts),
		out: number[] = [];
	if (total < 1e-9) return out;
	let along = 0;
	for (let i = 1; i < pts.length - 1; i++) {
		along += dist(pts[i - 1], pts[i]);
		const ax = pts[i][0] - pts[i - 1][0],
			az = pts[i][1] - pts[i - 1][1],
			bx = pts[i + 1][0] - pts[i][0],
			bz = pts[i + 1][1] - pts[i][1],
			la = Math.hypot(ax, az),
			lb = Math.hypot(bx, bz);
		const turn =
			la > 1e-9 && lb > 1e-9
				? (Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb)))) * 180) / Math.PI
				: 0;
		const atDoor = doors.some((d) => dist(d, pts[i]) <= doorR);
		if (turn >= turnDeg || atDoor) out.push(along / total);
	}
	return out;
}

/** Jordan's progress through the stops: the next stop's index, and whether Jordan waits at it. */
export interface EscortHold {
	next: number;
	holding: boolean;
}
/** One frame of the escort: Jordan at route fraction `e`, the player `gap` metres away. Jordan
    walks past a stop while the player is within `r`, and otherwise waits there until they are;
    `holdAt` is the fraction to keep Jordan at this frame, or null to let the move run. */
export function stepEscort(
	h: EscortHold,
	e: number,
	stops: readonly number[],
	gap: number,
	r = ESCORT_WAIT_R
): { hold: EscortHold; holdAt: number | null } {
	let next = h.next;
	if (h.holding) {
		if (gap > r) return { hold: h, holdAt: stops[next] };
		next += 1;
	}
	while (next < stops.length && e >= stops[next]) {
		if (gap > r) return { hold: { next, holding: true }, holdAt: stops[next] };
		next += 1;
	}
	return { hold: { next, holding: false }, holdAt: null };
}

/** Whether to show "Wait for Jordan": the player more than `r` from Jordan and nearer the end. */
export function escortAhead(
	gap: number,
	playerRemaining: number,
	jordanRemaining: number,
	r = ESCORT_AHEAD_R
): boolean {
	return gap > r && playerRemaining < jordanRemaining;
}

/** Where to draw the marker for a stop projected to normalised device coordinates (x right, y up,
    -1..1) or behind the camera: on screen at its point, otherwise an arrow on the screen edge
    pointing the way to turn. x and y are screen fractions (0..1, y down); angle is the arrow's
    direction in degrees on screen (0 right, 90 down). */
export function edgeArrow(
	ndcX: number,
	ndcY: number,
	behind: boolean,
	margin = 0.05
): { onScreen: boolean; x: number; y: number; angle: number } {
	let x = behind ? -ndcX : ndcX,
		y = behind ? -ndcY : ndcY;
	if (!behind && Math.abs(x) <= 1 && Math.abs(y) <= 1)
		return { onScreen: true, x: (x + 1) / 2, y: (1 - y) / 2, angle: 0 };
	if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) y = -1; // straight behind: turn around
	const k = (1 - margin) / Math.max(Math.abs(x), Math.abs(y));
	x *= k;
	y *= k;
	return {
		onScreen: false,
		x: (x + 1) / 2,
		y: (1 - y) / 2,
		angle: (Math.atan2(-y, x) * 180) / Math.PI
	};
}

/** A walking distance as the tracker and the marker show it. */
export function formatDistance(m: number): string {
	return `${Math.max(0, Math.round(m))} m`;
}
