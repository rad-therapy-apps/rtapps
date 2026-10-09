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
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import type { Grid, GridRow } from './types';

	let { initialGrid, onchange }: { initialGrid: Grid; onchange: (next: Grid) => void } = $props();

	// `$state.snapshot`, not `structuredClone`: the data-tables page passes a `$state` proxy,
	// which `structuredClone` cannot copy (DataCloneError). The snapshot is a deep plain copy.
	let grid = $state<Grid>($state.snapshot(initialGrid));

	// The API requires cols/row keys strictly ascending (`GridIn`'s model-level validator) --
	// surfaced here the same way `PairsEditor.svelte`'s duplicate warning is, so a hand-typed
	// violation is visible before save rather than only after a round-trip 422.
	function isStrictlyAscending(values: number[]): boolean {
		return values.every((v, i) => i === 0 || values[i - 1] < v);
	}

	const colsAscending = $derived(isStrictlyAscending(grid.cols));
	const rowKeysAscending = $derived(isStrictlyAscending(grid.rows.map((r) => r.key)));

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
	// `values` never drift apart in length. The new col defaults to max(existing) + 1 (0 if
	// empty) so it lands strictly ascending rather than colliding with an existing 0 (e.g. the
	// data-tables page's 1x1 `EMPTY_GRID`).
	function addCol() {
		const nextValue = grid.cols.length > 0 ? Math.max(...grid.cols) + 1 : 0;
		grid = {
			...grid,
			cols: [...grid.cols, nextValue],
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

	// The new row key defaults to max(existing) + 1 (0 if empty), same reasoning as `addCol`.
	function addRow() {
		const nextKey = grid.rows.length > 0 ? Math.max(...grid.rows.map((r) => r.key)) + 1 : 0;
		grid = { ...grid, rows: [...grid.rows, { key: nextKey, values: grid.cols.map(() => 0) }] };
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
		return Number.isFinite(n) ? n : undefined;
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
	<div class="axis-labels">
		<label>
			Row axis label
			<input value={grid.row_label} oninput={(e) => setRowLabel(e.currentTarget.value)} />
		</label>
		<label>
			Column axis label
			<input value={grid.col_label} oninput={(e) => setColLabel(e.currentTarget.value)} />
		</label>
	</div>

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
									if (Number.isFinite(n)) setColValue(ci, n);
								}}
								aria-label={`Column ${ci + 1} value`}
							/>
							<Button
								variant="ghost"
								onclick={() => removeCol(ci)}
								disabled={grid.cols.length <= 1}
							>
								Remove column
							</Button>
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
									if (Number.isFinite(n)) setRowKey(ri, n);
								}}
								aria-label={`Row ${ri + 1} key`}
							/>
							<Button
								variant="ghost"
								onclick={() => removeRow(ri)}
								disabled={grid.rows.length <= 1}
							>
								Remove row
							</Button>
						</th>
						{#each row.values as value, ci (ci)}
							<td>
								<input
									type="number"
									{value}
									oninput={(e) => {
										const n = e.currentTarget.valueAsNumber;
										if (Number.isFinite(n)) setCellValue(ri, ci, n);
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
		<Button onclick={addRow}>Add row</Button>
		<Button onclick={addCol}>Add column</Button>
	</div>

	{#if !colsAscending}
		<Alert tone="warning" role="alert">Column values must be strictly ascending.</Alert>
	{/if}
	{#if !rowKeysAscending}
		<Alert tone="warning" role="alert">Row keys must be strictly ascending.</Alert>
	{/if}

	<div class="paste-controls">
		{#if showPaste}
			<label>
				Paste from spreadsheet (TSV: header row of columns, then one row per line with its key
				first)
				<textarea bind:value={pasteText}></textarea>
			</label>
			<div class="paste-buttons">
				<Button onclick={applyPaste}>Apply paste</Button>
				<Button variant="ghost" onclick={() => (showPaste = false)}>Cancel</Button>
			</div>
			{#if pasteError}
				<Alert tone="danger" role="alert">{pasteError}</Alert>
			{/if}
		{:else}
			<Button onclick={() => (showPaste = true)}>Paste from spreadsheet</Button>
		{/if}
	</div>
</div>

<style>
	.grid-editor {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-3);
	}
	.grid-editor label {
		display: grid;
		gap: var(--space-1);
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.axis-labels {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
	}
	.axis-labels label {
		flex: 1 1 12rem;
	}
	/* The wrapper is the scroll container in both axes: the height cap makes it scroll vertically,
	   which is what lets the header row stick (top: 0 is relative to this box), and the page never
	   scrolls sideways. Scroll padding keeps a focused cell clear of the pinned header and, on wide
	   screens, the pinned key column. */
	.grid-table-wrap {
		--grid-key-col: 14rem;
		max-height: min(70vh, 40rem);
		overflow: auto;
		scroll-padding-block-start: 5.5rem;
		scroll-padding-inline-start: var(--grid-key-col);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.grid-table {
		width: max-content;
		min-width: 100%;
		font-variant-numeric: tabular-nums;
	}
	/* Compact cells: the shared 2.5rem control height is too tall for a dense matrix. */
	.grid-table input {
		width: 6rem;
		min-height: 2rem;
		padding: var(--space-1) var(--space-2);
	}
	.grid-table :global(button) {
		min-height: 2rem;
		padding: var(--space-1) var(--space-2);
		font-size: var(--text-sm);
	}
	.grid-table input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
	/* Sticky header row; sticky cells keep an opaque background so scrolled cells do not show through. */
	.grid-table thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--surface-raised);
	}
	/* Sticky first column: the row-key column labels each row, so it is the one worth pinning. Its
	   width is fixed to --grid-key-col (the key input plus "Remove row") so the scroll padding above
	   matches it. The corner cell is sticky both ways and sits above both. */
	.grid-table tbody th,
	.grid-table thead th:first-child {
		width: var(--grid-key-col);
		min-width: var(--grid-key-col);
	}
	.grid-table tbody th {
		position: sticky;
		inset-inline-start: 0;
		z-index: 1;
		background: var(--surface-raised);
	}
	.grid-table thead th:first-child {
		inset-inline-start: 0;
		z-index: 2;
	}
	/* Phones: a 14rem pinned column would leave almost no room for value cells, so the key column
	   scrolls with the row instead (the header row and corner cell still stick vertically). */
	@media (max-width: 50rem) {
		.grid-table-wrap {
			scroll-padding-inline-start: 0;
		}
		.grid-table tbody th {
			position: static;
		}
		.grid-table thead th:first-child {
			position: sticky;
			inset-inline-start: auto;
			width: auto;
			min-width: 0;
		}
		.grid-table tbody th {
			width: auto;
			min-width: 0;
		}
	}
	.grid-controls,
	.paste-controls,
	.paste-buttons {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}
	.paste-controls {
		flex-direction: column;
		align-items: flex-start;
	}
	.paste-controls label {
		width: 100%;
	}
	.paste-controls textarea {
		width: 100%;
	}
</style>
