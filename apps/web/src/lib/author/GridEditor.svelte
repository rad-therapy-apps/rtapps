<!--
	What this file does: the data-table grid editor -- a numeric matrix (row keys down the left,
	column values across the top), add/remove row/col, editable row/col axis labels, and a
	"paste from spreadsheet" TSV importer that replaces cols/rows wholesale.
	Used here and why: owns a working copy of the grid in its own `$state` (seeded once from
	`initialGrid`, the same seed-once-then-own-it pattern as `LessonEditor.svelte`'s `pages`) and
	calls `onchange` on every mutation rather than waiting for an explicit save (Save is the
	data-tables page's own concern, not this component's) -- structural edits (add/remove row or
	col) have to touch every row's `values` array in lockstep with `cols`, which is far simpler
	against one owned copy than as a fully controlled prop. The data-tables page wraps this in
	`{#key}` on which table is selected, so switching tables reseeds a fresh working copy instead
	of merging two tables' state (the same reason `LessonEditor.svelte` keys each block's
	RichTextEditor on `instanceId`). `parseGridTsv` is a plain paste parser: the first row is
	column values (its own first cell is a throwaway label slot); the first cell of every
	following row is that row's key, the rest are its values; any non-numeric cell rejects the
	whole paste with a message naming the offending cell, before `grid` is touched at all.
	How it fits the project: the numeric-lookup-table half of Task 16 -- `GridIn`/`GridRow`'s wire
	shape (`row_label`/`col_label`/`cols`/`rows`) is exactly what this edits, and what
	`DataTablePutIn.grid` expects back verbatim.
	Depends on: `./types` (`Grid`, `GridRow`).
	Used by: `routes/(app)/author/data-tables/+page.svelte`, `GridEditor.svelte.spec.ts`.
-->
<script lang="ts">
	import type { Grid, GridRow } from './types';

	let { initialGrid, onchange }: { initialGrid: Grid; onchange: (next: Grid) => void } = $props();

	let grid = $state<Grid>(structuredClone(initialGrid));

	function emit() {
		onchange(grid);
	}

	function setRowLabel(row_label: string) {
		grid = { ...grid, row_label };
		emit();
	}
	function setColLabel(col_label: string) {
		grid = { ...grid, col_label };
		emit();
	}

	function setColValue(colIndex: number, value: number) {
		grid = { ...grid, cols: grid.cols.map((c, i) => (i === colIndex ? value : c)) };
		emit();
	}

	// Adding a column has to extend every existing row's `values` too, so `cols` and each row's
	// `values` never drift apart in length.
	function addCol() {
		grid = {
			...grid,
			cols: [...grid.cols, 0],
			rows: grid.rows.map((r) => ({ ...r, values: [...r.values, 0] }))
		};
		emit();
	}

	function removeCol(colIndex: number) {
		if (grid.cols.length <= 1) return;
		grid = {
			...grid,
			cols: grid.cols.filter((_, i) => i !== colIndex),
			rows: grid.rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== colIndex) }))
		};
		emit();
	}

	function setRowKey(rowIndex: number, key: number) {
		grid = { ...grid, rows: grid.rows.map((r, i) => (i === rowIndex ? { ...r, key } : r)) };
		emit();
	}

	function setCellValue(rowIndex: number, colIndex: number, value: number) {
		grid = {
			...grid,
			rows: grid.rows.map((r, i) =>
				i === rowIndex
					? { ...r, values: r.values.map((v, vi) => (vi === colIndex ? value : v)) }
					: r
			)
		};
		emit();
	}

	function addRow() {
		grid = { ...grid, rows: [...grid.rows, { key: 0, values: grid.cols.map(() => 0) }] };
		emit();
	}

	function removeRow(rowIndex: number) {
		if (grid.rows.length <= 1) return;
		grid = { ...grid, rows: grid.rows.filter((_, i) => i !== rowIndex) };
		emit();
	}

	// --- paste from spreadsheet ---

	let pasteText = $state('');
	let pasteError = $state<string | undefined>(undefined);
	let showPaste = $state(false);

	function parseNumber(cell: string): number | undefined {
		if (cell.trim() === '') return undefined;
		const n = Number(cell);
		return Number.isNaN(n) ? undefined : n;
	}

	// First row = column values (its own first cell is a throwaway label slot); first cell of
	// each following row = that row's key, the rest = its values. Any non-numeric cell rejects
	// the whole paste with a message naming the offending cell -- `grid` is untouched on failure.
	function parseGridTsv(text: string): { cols: number[]; rows: GridRow[] } | string {
		const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
		if (lines.length < 2) return 'Paste a header row of columns plus at least one data row.';

		const headerCells = lines[0].split('\t').slice(1);
		const cols: number[] = [];
		for (const cell of headerCells) {
			const n = parseNumber(cell);
			if (n === undefined) return `Column header "${cell}" is not a number.`;
			cols.push(n);
		}
		if (cols.length === 0) return 'At least one column is required.';

		const rows: GridRow[] = [];
		for (const line of lines.slice(1)) {
			const cells = line.split('\t');
			const key = parseNumber(cells[0]);
			if (key === undefined) return `Row key "${cells[0]}" is not a number.`;
			const valueCells = cells.slice(1);
			if (valueCells.length !== cols.length) {
				return `Row "${cells[0]}" has ${valueCells.length} values, expected ${cols.length}.`;
			}
			const values: number[] = [];
			for (const cell of valueCells) {
				const n = parseNumber(cell);
				if (n === undefined) return `Value "${cell}" (row "${cells[0]}") is not a number.`;
				values.push(n);
			}
			rows.push({ key, values });
		}
		return { cols, rows };
	}

	function applyPaste() {
		const result = parseGridTsv(pasteText);
		if (typeof result === 'string') {
			pasteError = result;
			return;
		}
		pasteError = undefined;
		grid = { ...grid, cols: result.cols, rows: result.rows };
		emit();
		pasteText = '';
		showPaste = false;
	}
</script>

<div class="grid-editor">
	<label>
		Row axis label
		<input value={grid.row_label} oninput={(e) => setRowLabel(e.currentTarget.value)} />
	</label>
	<label>
		Column axis label
		<input value={grid.col_label} oninput={(e) => setColLabel(e.currentTarget.value)} />
	</label>

	<div class="grid-table-wrap">
		<table class="grid-table">
			<thead>
				<tr>
					<th>{grid.row_label || 'Row'} / {grid.col_label || 'Col'}</th>
					{#each grid.cols as col, ci (ci)}
						<th>
							<input
								type="number"
								value={col}
								oninput={(e) => {
									const n = e.currentTarget.valueAsNumber;
									if (!Number.isNaN(n)) setColValue(ci, n);
								}}
								aria-label={`Column ${ci + 1} value`}
							/>
							<button type="button" onclick={() => removeCol(ci)} disabled={grid.cols.length <= 1}>
								Remove column
							</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each grid.rows as row, ri (ri)}
					<tr>
						<th>
							<input
								type="number"
								value={row.key}
								oninput={(e) => {
									const n = e.currentTarget.valueAsNumber;
									if (!Number.isNaN(n)) setRowKey(ri, n);
								}}
								aria-label={`Row ${ri + 1} key`}
							/>
							<button type="button" onclick={() => removeRow(ri)} disabled={grid.rows.length <= 1}>
								Remove row
							</button>
						</th>
						{#each row.values as value, ci (ci)}
							<td>
								<input
									type="number"
									{value}
									oninput={(e) => {
										const n = e.currentTarget.valueAsNumber;
										if (!Number.isNaN(n)) setCellValue(ri, ci, n);
									}}
									aria-label={`Row ${ri + 1}, column ${ci + 1} value`}
								/>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="grid-controls">
		<button type="button" onclick={addRow}>Add row</button>
		<button type="button" onclick={addCol}>Add column</button>
	</div>

	<div class="paste-controls">
		{#if showPaste}
			<label>
				Paste from spreadsheet (TSV: header row of columns, then one row per line with its key
				first)
				<textarea bind:value={pasteText}></textarea>
			</label>
			<button type="button" onclick={applyPaste}>Apply paste</button>
			<button type="button" onclick={() => (showPaste = false)}>Cancel</button>
			{#if pasteError}
				<p role="alert">{pasteError}</p>
			{/if}
		{:else}
			<button type="button" onclick={() => (showPaste = true)}>Paste from spreadsheet</button>
		{/if}
	</div>
</div>

<style>
	.grid-table-wrap {
		overflow-x: auto;
	}
	.grid-table input {
		width: 6rem;
	}
	.grid-controls,
	.paste-controls {
		display: flex;
		gap: 0.5rem;
		margin-block: 0.5rem;
		flex-wrap: wrap;
	}
</style>
