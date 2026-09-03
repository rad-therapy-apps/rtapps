/**
 * What this file does: `interpolate2d` — pure bilinear lookup over a calculator data table's
 * grid (PDD/TMR tables: rows are depths, cols are field sizes), plus the `Grid`/`GridRow` wire
 * shape it operates on.
 * Used here and why: no extrapolation — a rowKey/colKey outside the grid's range returns
 * `null` rather than guessing, since a value beyond the table's measured range is exactly what
 * `MuCalculator.svelte` must refuse to teach from. An exact hit on either axis (or both) skips
 * that axis's lerp instead of dividing by a zero span.
 * How it fits the project: TDD step 2 of plan 3b Task 17 — makes `interpolate.test.ts` pass.
 * Depends on: nothing.
 * Used by: `./interpolate.test.ts`, `./MuCalculator.svelte`.
 */

export type GridRow = { key: number; values: number[] };
export type Grid = { row_label: string; col_label: string; cols: number[]; rows: GridRow[] };

/**
 * Finds the pair of indices in an ascending `keys` array bracketing `x` (equal indices when `x`
 * is an exact hit), or `null` when `x` falls outside `[keys[0], keys[last]]` (no extrapolation).
 */
function bracket(keys: number[], x: number): [number, number] | null {
	if (keys.length === 0 || x < keys[0] || x > keys[keys.length - 1]) return null;
	for (let i = 0; i < keys.length; i++) {
		if (keys[i] === x) return [i, i];
		if (keys[i] > x) return [i - 1, i];
	}
	return null; // unreachable given the range check above
}

/** Linear interpolation of y at x between (x0, y0) and (x1, y1); returns y0 when x0 === x1. */
function lerp(x0: number, x1: number, y0: number, y1: number, x: number): number {
	if (x0 === x1) return y0;
	return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

/**
 * Bilinear interpolation of `grid` at (`rowKey`, `colKey`): lerp across columns for each of the
 * two bracketing rows, then lerp those two results across rows. An exact hit on an axis (grid
 * point, row midpoint, or col midpoint) falls out of the same two lerps automatically. Returns
 * `null` when either key is outside the grid's range.
 */
export function interpolate2d(grid: Grid, rowKey: number, colKey: number): number | null {
	const rowBracket = bracket(
		grid.rows.map((r) => r.key),
		rowKey
	);
	const colBracket = bracket(grid.cols, colKey);
	if (!rowBracket || !colBracket) return null;
	const [r0, r1] = rowBracket;
	const [c0, c1] = colBracket;

	const row0 = grid.rows[r0].values;
	const row1 = grid.rows[r1].values;
	const v0 = lerp(grid.cols[c0], grid.cols[c1], row0[c0], row0[c1], colKey);
	const v1 = lerp(grid.cols[c0], grid.cols[c1], row1[c0], row1[c1], colKey);
	return lerp(grid.rows[r0].key, grid.rows[r1].key, v0, v1, rowKey);
}
