import { describe, expect, it } from 'vitest';
import {
	BUBBLE_MAX_W,
	HOLE_PAD,
	PAGE_EDGE,
	holesPath,
	intersects,
	padRect,
	placeBubble,
	union
} from './coach-geometry';
import type { Rect } from './coach-geometry';

const inside = (
	page: { w: number; h: number },
	p: { x: number; y: number },
	b: { w: number; h: number }
) =>
	p.x >= PAGE_EDGE &&
	p.y >= PAGE_EDGE &&
	p.x + b.w <= page.w - PAGE_EDGE &&
	p.y + b.h <= page.h - PAGE_EDGE;

describe('padRect and union', () => {
	it('grows a rect by the hole pad on every side', () => {
		expect(padRect({ x: 10, y: 20, w: 30, h: 40 })).toEqual({
			x: 10 - HOLE_PAD,
			y: 20 - HOLE_PAD,
			w: 30 + 2 * HOLE_PAD,
			h: 40 + 2 * HOLE_PAD
		});
	});
	it('bounds several rects, and none is null', () => {
		expect(
			union([
				{ x: 0, y: 0, w: 10, h: 10 },
				{ x: 20, y: 5, w: 5, h: 20 }
			])
		).toEqual({ x: 0, y: 0, w: 25, h: 25 });
		expect(union([])).toBeNull();
	});
});

describe('holesPath', () => {
	it('is the page then one closed rounded subpath per hole', () => {
		const d = holesPath({ w: 800, h: 500 }, [
			{ x: 10, y: 10, w: 50, h: 20 },
			{ x: 100, y: 100, w: 40, h: 40 }
		]);
		expect(d.startsWith('M0 0H800V500H0Z')).toBe(true);
		expect(d.match(/Z/g)?.length).toBe(3);
	});
	it('is the page alone with no holes', () => {
		expect(holesPath({ w: 10, h: 10 }, [])).toBe('M0 0H10V10H0Z');
	});
});

describe('placeBubble', () => {
	const bubble = { w: BUBBLE_MAX_W, h: 150 };
	for (const page of [
		{ w: 823, h: 512 },
		{ w: 1280, h: 800 }
	]) {
		it(`goes below a target near the top at ${page.w}x${page.h}`, () => {
			const t: Rect = { x: 100, y: 40, w: 120, h: 30 };
			const p = placeBubble(page, t, bubble, [t]);
			expect(p.side).toBe('below');
			expect(inside(page, p, bubble)).toBe(true);
			expect(intersects({ ...p, ...bubble }, t)).toBe(false);
		});
		it(`goes above a target near the bottom at ${page.w}x${page.h}`, () => {
			const t: Rect = { x: 300, y: page.h - 60, w: 120, h: 30 };
			const p = placeBubble(page, t, bubble, [t]);
			expect(p.side).toBe('above');
			expect(intersects({ ...p, ...bubble }, t)).toBe(false);
		});
		it(`goes beside a target as tall as the page at ${page.w}x${page.h}`, () => {
			const t: Rect = { x: 40, y: 20, w: 200, h: page.h - 40 };
			const p = placeBubble(page, t, bubble, [t]);
			expect(p.side).toBe('right');
			expect(intersects({ ...p, ...bubble }, t)).toBe(false);
		});
		it(`keeps clear of a drag's two holes at ${page.w}x${page.h}`, () => {
			const from: Rect = { x: 30, y: 200, w: 140, h: 40 },
				to: Rect = { x: 420, y: 180, w: 260, h: 120 };
			const p = placeBubble(page, union([from, to]), bubble, [from, to]);
			expect(inside(page, p, bubble)).toBe(true);
			expect(intersects({ ...p, ...bubble }, from) || intersects({ ...p, ...bubble }, to)).toBe(
				false
			);
		});
	}
	it('sits low in the middle with nothing to point at', () => {
		const page = { w: 992, h: 624 },
			p = placeBubble(page, null, bubble, []);
		expect(p.side).toBeNull();
		expect(Math.abs(p.x + bubble.w / 2 - page.w / 2)).toBeLessThan(1);
		expect(inside(page, p, bubble)).toBe(true);
	});
	it('points at the target from the side it sits on', () => {
		const t: Rect = { x: 600, y: 40, w: 100, h: 30 },
			p = placeBubble({ w: 1280, h: 800 }, t, bubble, [t]);
		expect(p.pointer).toBeCloseTo(650 - p.x, 0);
	});
});
