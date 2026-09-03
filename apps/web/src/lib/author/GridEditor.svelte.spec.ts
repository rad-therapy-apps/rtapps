/**
 * What this file tests: `GridEditor.svelte`'s paste-from-spreadsheet TSV importer (happy path and
 * a non-numeric rejection) and that structural edits (add row/col) keep emitting a well-formed
 * `Grid` (every row's `values` lines up 1:1 with `cols`).
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
});
