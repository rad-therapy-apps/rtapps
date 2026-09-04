/**
 * What this file does: unit tests for `interpolate2d`, the pure bilinear lookup over a
 * calculator data table's grid (PDD/TMR tables: rows are depths, cols are field sizes).
 * Used here and why: vitest `server` project — `interpolate2d` is a pure function, no DOM
 * needed; a tiny hand-built 2x2 grid (rows 5/10, cols 5/10, values chosen so every
 * intermediate lerp is an exact decimal) lets every case below be hand-computed rather than
 * approximated.
 * How it fits the project: TDD step 1 of plan 3b Task 17 — written before `interpolate.ts`
 * exists, per the brief's required case list (exact point, col midpoint, row midpoint, true
 * bilinear center, out-of-range each axis, single-row grid).
 * Depends on: `./interpolate` (written next), vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it } from 'vitest';
import { interpolate2d, type Grid } from './interpolate';

// Depths 5/10 (rows), field sizes 5/10 (cols). Values are round numbers so every lerp below
// (col-wise, row-wise, and the bilinear combination of both) has an exact expected result.
const GRID: Grid = {
	row_label: 'Depth (cm)',
	col_label: 'Field size (cm)',
	cols: [5, 10],
	rows: [
		{ key: 5, values: [80, 85] },
		{ key: 10, values: [70, 75] }
	]
};

describe('interpolate2d', () => {
	it('returns the exact value at an exact grid point', () => {
		expect(interpolate2d(GRID, 5, 10)).toBe(85);
		expect(interpolate2d(GRID, 10, 5)).toBe(70);
	});

	it('interpolates at the midpoint between two columns on an exact row', () => {
		// Row 5's values are 80 (col 5) and 85 (col 10); the col-7.5 midpoint is 82.5.
		expect(interpolate2d(GRID, 5, 7.5)).toBe(82.5);
	});

	it('interpolates at the midpoint between two rows on an exact column', () => {
		// Col 5's values are 80 (row 5) and 70 (row 10); the row-7.5 midpoint is 75.
		expect(interpolate2d(GRID, 7.5, 5)).toBe(75);
	});

	it('computes the true bilinear center of four surrounding points', () => {
		// Hand-computed: col-lerp row 5 at 7.5 -> 82.5; col-lerp row 10 at 7.5 -> 72.5;
		// row-lerp those two at 7.5 -> 77.5.
		expect(interpolate2d(GRID, 7.5, 7.5)).toBe(77.5);
	});

	it('returns null below and above the row (depth) range', () => {
		expect(interpolate2d(GRID, 4, 5)).toBeNull();
		expect(interpolate2d(GRID, 11, 5)).toBeNull();
	});

	it('returns null below and above the column (field size) range', () => {
		expect(interpolate2d(GRID, 5, 4)).toBeNull();
		expect(interpolate2d(GRID, 5, 11)).toBeNull();
	});

	it('interpolates across columns only on a single-row grid', () => {
		const singleRow: Grid = { ...GRID, rows: [{ key: 5, values: [80, 85] }] };
		expect(interpolate2d(singleRow, 5, 7.5)).toBe(82.5);
	});
});
