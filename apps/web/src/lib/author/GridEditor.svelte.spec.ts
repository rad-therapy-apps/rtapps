/**
 * What this file tests: `GridEditor.svelte`'s paste-from-spreadsheet TSV importer (happy path, a
 * non-numeric rejection, and a non-finite `Infinity` rejection) and that structural edits (add
 * row/col) keep emitting a well-formed `Grid` (every row's `values` lines up 1:1 with `cols`) with
 * strictly-ascending col values / row keys (`max(existing) + 1`, never colliding with an existing
 * 0), plus the inline warning shown when a hand edit breaks that ascending order.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`), same as `LessonEditor.svelte.spec.ts` -- assertions read the
 * exact `Grid` object the component's `onchange` receives via a `vi.fn` spy, not the DOM, since
 * that's the shape `DataTablePutIn.grid` (Task 11) actually needs to be valid.
 * How it fits the project: the component half of Task 16's data-table grid editor test plan.
 * Depends on: `./GridEditor.svelte`, `./types` (`Grid`), vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import GridEditor from './GridEditor.svelte';
import type { Grid } from './types';

// A small 2x2 fixture: two columns (5, 10), two rows keyed 0 and 5.
function fixture(): Grid {
	return {
		row_label: 'Depth (cm)',
		col_label: 'Field size (cm)',
		cols: [5, 10],
		rows: [
			{ key: 0, values: [1.1, 2.2] },
			{ key: 5, values: [3.3, 4.4] }
		]
	};
}

function pasteButtons(container: HTMLElement): HTMLButtonElement[] {
	return [...container.querySelectorAll<HTMLButtonElement>('.paste-controls button')];
}
function gridButtons(container: HTMLElement): HTMLButtonElement[] {
	return [...container.querySelectorAll<HTMLButtonElement>('.grid-controls button')];
}
function pasteTextarea(container: HTMLElement): HTMLTextAreaElement {
	const el = container.querySelector<HTMLTextAreaElement>('.paste-controls textarea');
	if (!el) throw new Error('paste textarea not found');
	return el;
}

describe('GridEditor', () => {
	// Scenario: paste a valid TSV block (header row of columns, then one row per line with its
	// key first) and apply it.
	// Invariant: `onchange` receives the original row/col axis labels unchanged, plus the pasted
	// cols/rows -- a well-formed `Grid` (every row's `values.length` matches `cols.length`).
	it('parses a valid TSV paste into cols/rows', async () => {
		const onchange = vi.fn();
		const { container } = await render(GridEditor, { initialGrid: fixture(), onchange });

		await userEvent.click(pasteButtons(container)[0]); // "Paste from spreadsheet"
		await userEvent.fill(pasteTextarea(container), '\t15\t20\n1\t5.5\t6.6\n2\t7.7\t8.8');
		await userEvent.click(pasteButtons(container)[0]); // "Apply paste"

		expect(onchange).toHaveBeenCalledTimes(1);
		const emitted = onchange.mock.calls[0][0] as Grid;
		expect(emitted.row_label).toBe('Depth (cm)');
		expect(emitted.col_label).toBe('Field size (cm)');
		expect(emitted.cols).toEqual([15, 20]);
		expect(emitted.rows).toEqual([
			{ key: 1, values: [5.5, 6.6] },
			{ key: 2, values: [7.7, 8.8] }
		]);

		// The paste UI closes back to its toggle button on success.
		expect(pasteButtons(container)).toHaveLength(1);
	});

	// Scenario: paste a TSV block with a non-numeric value cell.
	// Invariant: the paste is rejected with a message naming the offending cell, `grid` is
	// untouched (`onchange` never called), and the paste textarea stays open for a retry.
	it('rejects a non-numeric cell without touching the grid', async () => {
		const onchange = vi.fn();
		const { container } = await render(GridEditor, { initialGrid: fixture(), onchange });

		await userEvent.click(pasteButtons(container)[0]); // "Paste from spreadsheet"
		await userEvent.fill(pasteTextarea(container), '\t15\t20\n1\tabc\t6.6');
		await userEvent.click(pasteButtons(container)[0]); // "Apply paste"

		expect(onchange).not.toHaveBeenCalled();
		const banner = container.querySelector('[role=alert]');
		expect(banner?.textContent).toContain('"abc"');
		expect(banner?.textContent).toContain('not a number');
		// Still open for a retry, not silently reset.
		expect(container.querySelector('.paste-controls textarea')).not.toBeNull();
	});

	// Scenario: paste a TSV block whose value cell is the string "Infinity".
	// Invariant: `Number("Infinity")` is finite-checked (`Number.isFinite`, not `Number.isNaN`),
	// so it's rejected the same as any other non-numeric cell rather than silently accepted.
	it('rejects a TSV cell containing Infinity as non-numeric', async () => {
		const onchange = vi.fn();
		const { container } = await render(GridEditor, { initialGrid: fixture(), onchange });

		await userEvent.click(pasteButtons(container)[0]); // "Paste from spreadsheet"
		await userEvent.fill(pasteTextarea(container), '\t15\t20\n1\tInfinity\t6.6');
		await userEvent.click(pasteButtons(container)[0]); // "Apply paste"

		expect(onchange).not.toHaveBeenCalled();
		const banner = container.querySelector('[role=alert]');
		expect(banner?.textContent).toContain('"Infinity"');
		expect(banner?.textContent).toContain('not a number');
	});

	// Scenario: add a column, then a row.
	// Invariant: every emitted `Grid` stays well-formed -- each row's `values` always lines up
	// 1:1 with `cols`, matching `GridIn`'s model-level "consistent" validator.
	it('keeps rows/cols lengths in sync when adding a column then a row', async () => {
		const onchange = vi.fn();
		const { container } = await render(GridEditor, { initialGrid: fixture(), onchange });

		await userEvent.click(gridButtons(container)[1]); // "Add column"
		const afterAddCol = onchange.mock.calls.at(-1)?.[0] as Grid;
		expect(afterAddCol.cols).toHaveLength(3);
		for (const row of afterAddCol.rows) expect(row.values).toHaveLength(3);

		await userEvent.click(gridButtons(container)[0]); // "Add row"
		const afterAddRow = onchange.mock.calls.at(-1)?.[0] as Grid;
		expect(afterAddRow.rows).toHaveLength(3);
		for (const row of afterAddRow.rows) expect(row.values).toHaveLength(afterAddRow.cols.length);
	});

	// Scenario: add a column then a row starting from a 1x1 grid whose col value and row key
	// already sit at 0 (the data-tables page's `EMPTY_GRID` shape) -- the bug this fix closes: a
	// naive `0` default for the new col/row would collide with the existing one, violating
	// `GridIn`'s strictly-ascending rule with no warning.
	// Invariant: the new col value and row key are `max(existing) + 1`, landing strictly
	// ascending with no duplicate and no warning banner.
	it('defaults a new col/row to max(existing) + 1, never colliding with an existing 0', async () => {
		const onchange = vi.fn();
		const emptyGrid: Grid = {
			row_label: '',
			col_label: '',
			cols: [0],
			rows: [{ key: 0, values: [0] }]
		};
		const { container } = await render(GridEditor, { initialGrid: emptyGrid, onchange });

		await userEvent.click(gridButtons(container)[1]); // "Add column"
		const afterAddCol = onchange.mock.calls.at(-1)?.[0] as Grid;
		expect(afterAddCol.cols).toEqual([0, 1]);

		await userEvent.click(gridButtons(container)[0]); // "Add row"
		const afterAddRow = onchange.mock.calls.at(-1)?.[0] as Grid;
		expect(afterAddRow.rows.map((r) => r.key)).toEqual([0, 1]);

		expect(container.querySelector('[role=alert]')).toBeNull();
	});

	// Scenario: hand-edit a column value so `cols` is no longer strictly ascending.
	// Invariant: an inline warning appears (mirroring `PairsEditor.svelte`'s duplicate-warning
	// style), visible before save rather than only after a round-trip 422.
	it('shows a warning when column values are hand-edited out of ascending order', async () => {
		const onchange = vi.fn();
		const { container } = await render(GridEditor, { initialGrid: fixture(), onchange });

		const secondColInput = container.querySelector<HTMLInputElement>(
			'input[aria-label="Column 2 value"]'
		);
		if (!secondColInput) throw new Error('column 2 input not found');
		await userEvent.fill(secondColInput, '2'); // cols become [5, 2] -- not ascending

		const alerts = [...container.querySelectorAll('[role=alert]')];
		expect(
			alerts.some((el) => el.textContent?.includes('Column values must be strictly ascending'))
		).toBe(true);
	});

	// Scenario: hand-edit a row key so row keys are no longer strictly ascending.
	// Invariant: same inline warning, scoped to row keys.
	it('shows a warning when row keys are hand-edited out of ascending order', async () => {
		const onchange = vi.fn();
		const { container } = await render(GridEditor, { initialGrid: fixture(), onchange });

		const secondRowKeyInput = container.querySelector<HTMLInputElement>(
			'input[aria-label="Row 2 key"]'
		);
		if (!secondRowKeyInput) throw new Error('row 2 key input not found');
		await userEvent.fill(secondRowKeyInput, '-1'); // row keys become [0, -1] -- not ascending

		const alerts = [...container.querySelectorAll('[role=alert]')];
		expect(
			alerts.some((el) => el.textContent?.includes('Row keys must be strictly ascending'))
		).toBe(true);
	});
});
