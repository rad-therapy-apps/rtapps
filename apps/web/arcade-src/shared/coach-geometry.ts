/* The spotlight's pure geometry (coach.ts; docs/specs/2026-11-23-tutorial-walkthrough-design.md):
   the cut-outs' padded rects, the dim layer's evenodd path with a rounded hole per cut-out, and
   where the bubble goes: below the cut-outs, else above, right or left, inside the page and over
   none of them; else the page corner nearest them that covers none; else the spot that covers
   least. Pure, so it is unit tested in Node (coach-geometry.spec.ts). */

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}
export interface Size {
	w: number;
	h: number;
}
export type Side = 'below' | 'above' | 'right' | 'left';
/** The bubble's top-left, the side of the cut-outs it sits on (null: nothing to point at, or a
    corner), and the pointer's offset along the bubble's edge that faces them. */
export interface Placement {
	x: number;
	y: number;
	side: Side | null;
	pointer: number;
}

export const HOLE_PAD = 4;
export const HOLE_RADIUS = 6;
export const BUBBLE_MAX_W = 360;
/** Between a cut-out and the bubble: room for the pointer. */
export const BUBBLE_GAP = 14;
/** The bubble stays this far inside the page. */
export const PAGE_EDGE = 8;
/** With nothing to point at, the bubble's bottom sits this far above the page's (clear of the
    center's controls bar). */
export const NO_ANCHOR_BOTTOM = 96;
/** The pointer stays this far from the bubble's corners. */
export const POINTER_INSET = 18;

const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function padRect(r: Rect, pad = HOLE_PAD): Rect {
	return { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad };
}

export function union(rs: readonly Rect[]): Rect | null {
	if (!rs.length) return null;
	const x = Math.min(...rs.map((r) => r.x)),
		y = Math.min(...rs.map((r) => r.y)),
		x2 = Math.max(...rs.map((r) => r.x + r.w)),
		y2 = Math.max(...rs.map((r) => r.y + r.h));
	return { x, y, w: x2 - x, h: y2 - y };
}

export function intersects(a: Rect, b: Rect): boolean {
	return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function overlap(a: Rect, b: Rect): number {
	const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
		h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
	return w > 0 && h > 0 ? w * h : 0;
}

function roundRect(r: Rect, radius: number): string {
	const k = r1(Math.min(radius, r.w / 2, r.h / 2)),
		x = r1(r.x),
		y = r1(r.y),
		x2 = r1(r.x + r.w),
		y2 = r1(r.y + r.h);
	return (
		`M${r1(x + k)} ${y}H${r1(x2 - k)}A${k} ${k} 0 0 1 ${x2} ${r1(y + k)}V${r1(y2 - k)}` +
		`A${k} ${k} 0 0 1 ${r1(x2 - k)} ${y2}H${r1(x + k)}A${k} ${k} 0 0 1 ${x} ${r1(y2 - k)}` +
		`V${r1(y + k)}A${k} ${k} 0 0 1 ${r1(x + k)} ${y}Z`
	);
}

/** The dim layer's path: the page, then each hole (fill-rule evenodd cuts them out). */
export function holesPath(page: Size, holes: readonly Rect[], radius = HOLE_RADIUS): string {
	return `M0 0H${r1(page.w)}V${r1(page.h)}H0Z` + holes.map((h) => roundRect(h, radius)).join('');
}

export function placeBubble(
	page: Size,
	anchor: Rect | null,
	bubble: Size,
	avoid: readonly Rect[]
): Placement {
	const maxX = page.w - PAGE_EDGE - bubble.w,
		maxY = page.h - PAGE_EDGE - bubble.h,
		cx = (v: number) => clamp(v, PAGE_EDGE, maxX),
		cy = (v: number) => clamp(v, PAGE_EDGE, maxY);
	if (!anchor)
		return {
			x: cx((page.w - bubble.w) / 2),
			y: cy(page.h - NO_ANCHOR_BOTTOM - bubble.h),
			side: null,
			pointer: 0
		};
	const ax = anchor.x + anchor.w / 2,
		ay = anchor.y + anchor.h / 2,
		box = (x: number, y: number): Rect => ({ x, y, w: bubble.w, h: bubble.h }),
		fits = (x: number, y: number) => x >= PAGE_EDGE && y >= PAGE_EDGE && x <= maxX && y <= maxY,
		clear = (x: number, y: number) => !avoid.some((r) => intersects(box(x, y), r)),
		pointer = (side: Side, x: number, y: number) =>
			side === 'below' || side === 'above'
				? clamp(ax - x, POINTER_INSET, bubble.w - POINTER_INSET)
				: clamp(ay - y, POINTER_INSET, bubble.h - POINTER_INSET);
	const spots: [Side, number, number][] = [
		['below', cx(ax - bubble.w / 2), anchor.y + anchor.h + BUBBLE_GAP],
		['above', cx(ax - bubble.w / 2), anchor.y - BUBBLE_GAP - bubble.h],
		['right', anchor.x + anchor.w + BUBBLE_GAP, cy(ay - bubble.h / 2)],
		['left', anchor.x - BUBBLE_GAP - bubble.w, cy(ay - bubble.h / 2)]
	];
	for (const [side, x, y] of spots)
		if (fits(x, y) && clear(x, y)) return { x, y, side, pointer: pointer(side, x, y) };
	const corners: [number, number][] = [
		[PAGE_EDGE, PAGE_EDGE],
		[cx(maxX), PAGE_EDGE],
		[PAGE_EDGE, cy(maxY)],
		[cx(maxX), cy(maxY)]
	];
	const near = (p: [number, number]) =>
		Math.hypot(p[0] + bubble.w / 2 - ax, p[1] + bubble.h / 2 - ay);
	const corner = corners.filter(([x, y]) => clear(x, y)).sort((a, b) => near(a) - near(b))[0];
	if (corner) return { x: corner[0], y: corner[1], side: null, pointer: 0 };
	const cover = (x: number, y: number) => avoid.reduce((n, r) => n + overlap(box(x, y), r), 0);
	const [side, x, y] = spots
		.map(([s, x, y]): [Side, number, number] => [s, cx(x), cy(y)])
		.sort((a, b) => cover(a[1], a[2]) - cover(b[1], b[2]))[0];
	return { x, y, side, pointer: pointer(side, x, y) };
}
