import { describe, expect, it } from 'vitest';
import { breakPages, pageStep } from './pager-math';

describe('breakPages', () => {
	it('gives no pages for no blocks', () => {
		expect(breakPages([], 100, 10)).toEqual([]);
	});

	it('keeps every block on one page when they fit', () => {
		expect(breakPages([30, 30, 20], 100, 10)).toEqual([[0, 1, 2]]);
	});

	it('counts the gap between blocks, not before the first', () => {
		// 50 + 10 + 40 = 100 fits exactly; one more pixel of gap would not
		expect(breakPages([50, 40], 100, 10)).toEqual([[0, 1]]);
		expect(breakPages([50, 40], 100, 11)).toEqual([[0], [1]]);
	});

	it('fills each page greedily, in order', () => {
		expect(breakPages([40, 40, 40, 40, 40], 100, 10)).toEqual([[0, 1], [2, 3], [4]]);
	});

	it('gives a block taller than the limit a page to itself', () => {
		expect(breakPages([30, 150, 30, 30], 100, 10)).toEqual([[0], [1], [2, 3]]);
	});

	it('starts with a tall block on its own page', () => {
		expect(breakPages([150, 20], 100, 0)).toEqual([[0], [1]]);
	});
});

describe('pageStep', () => {
	const key = (
		k: string,
		mods: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey', boolean>> = {}
	) => ({
		key: k,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		...mods
	});

	it('turns back on ArrowLeft and on on ArrowRight', () => {
		expect(pageStep(key('ArrowLeft'), 'BODY')).toBe(-1);
		expect(pageStep(key('ArrowRight'), 'BUTTON')).toBe(1);
	});

	it('leaves other keys alone, the title menu’s ArrowUp and ArrowDown among them', () => {
		for (const k of ['ArrowUp', 'ArrowDown', 'Enter', 'e', 'Escape'])
			expect(pageStep(key(k), 'BODY')).toBe(0);
	});

	it('leaves the arrows to a field that has focus', () => {
		for (const tag of ['INPUT', 'SELECT', 'TEXTAREA'])
			expect(pageStep(key('ArrowRight'), tag)).toBe(0);
	});

	it('leaves the arrows alone with a modifier held (Alt+Left is the browser’s Back)', () => {
		for (const m of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)
			expect(pageStep(key('ArrowLeft', { [m]: true }), 'BODY')).toBe(0);
	});
});
