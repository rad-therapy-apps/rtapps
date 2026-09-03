<!--
	What this file does: the MU (monitor unit) calculator — teaching-first inputs (prescribed
	dose, SSD/PDD vs SAD/TMR technique, depth, field size) over a bilinear PDD/TMR table lookup,
	showing every intermediate step (the looked-up value, the working formula, and the resulting
	MU) rather than just an answer.
	Used here and why: everything is `$derived` from the inputs and the picked table — there is
	no submit button and nothing to attempt/grade (a calculator is not attemptable, ADR/Task 11);
	the technique radio picks the FIRST table whose key contains "pdd" (SSD) or "tmr" (SAD),
	mirroring how `data_tables` is keyed in the authoring builder (Task 16) rather than a fixed
	slot. `interpolate2d` returning `null` (out of range) is turned into a message computed from
	the grid's own bounds (`Math.min`/`Math.max` over its rows/cols) so it can never show NaN.
	How it fits the project: plan 3b Task 17 — the calculator branch of the student activity
	route (`(app)/subjects/[slug]/activities/[id]/+page.svelte`) renders this via
	`./registry`, passing `snapshot.calculator.data_tables` verbatim as `tables`.
	Depends on: `./interpolate` (`interpolate2d`, `Grid`).
	Used by: `./registry`, `./MuCalculator.svelte.spec.ts`, the student activity route.
-->
<script lang="ts">
	import { interpolate2d, type Grid } from './interpolate';

	let { tables }: { tables: Record<string, { title: string; grid: Grid }> } = $props();

	let dose = $state(200);
	let technique = $state<'ssd' | 'sad'>('ssd');
	let depth = $state(5);
	let fieldSize = $state(10);

	// "pdd" for SSD/PDD, "tmr" for SAD/TMR; the first matching entry in `tables`' own key order.
	const neededTableKind = $derived(technique === 'ssd' ? 'pdd' : 'tmr');
	const tableEntry = $derived(
		Object.entries(tables).find(([key]) => key.toLowerCase().includes(neededTableKind))
	);
	const grid = $derived(tableEntry ? tableEntry[1].grid : null);

	// null when out of range (interpolate2d's contract) or when there's no table to read from.
	const lookup = $derived(grid ? interpolate2d(grid, depth, fieldSize) : null);

	// The grid's own bounds, for the out-of-range message below — never a guessed/static range.
	const depthBounds = $derived(
		grid
			? {
					min: Math.min(...grid.rows.map((r) => r.key)),
					max: Math.max(...grid.rows.map((r) => r.key))
				}
			: null
	);
	const fieldBounds = $derived(
		grid ? { min: Math.min(...grid.cols), max: Math.max(...grid.cols) } : null
	);

	const formula = $derived(technique === 'ssd' ? 'MU = dose / (PDD/100)' : 'MU = dose / TMR');
	const mu = $derived(
		lookup === null ? null : technique === 'ssd' ? dose / (lookup / 100) : dose / lookup
	);
</script>

<div class="mu-calculator">
	<label>
		Prescribed dose (cGy)
		<input type="number" bind:value={dose} />
	</label>

	<fieldset>
		<legend>Technique</legend>
		<label>
			<input type="radio" name="technique" value="ssd" bind:group={technique} />
			SSD (PDD)
		</label>
		<label>
			<input type="radio" name="technique" value="sad" bind:group={technique} />
			SAD (TMR)
		</label>
	</fieldset>

	<label>
		Depth (cm)
		<input type="number" bind:value={depth} />
	</label>

	<label>
		Field size (cm)
		<input type="number" bind:value={fieldSize} />
	</label>

	<section aria-live="polite" data-testid="mu-output">
		{#if !tableEntry}
			<p data-testid="mu-missing-table">
				this calculator has no {neededTableKind.toUpperCase()} table
			</p>
		{:else if lookup === null}
			<p data-testid="mu-out-of-range">
				outside the table's range (depth {depthBounds?.min}&ndash;{depthBounds?.max} cm, field size {fieldBounds?.min}&ndash;{fieldBounds?.max}
				cm)
			</p>
		{:else}
			<p data-testid="mu-lookup">
				{neededTableKind.toUpperCase()}: {lookup.toFixed(4)}
			</p>
			<p data-testid="mu-formula">{formula}</p>
			<p data-testid="mu-result">MU = {mu?.toFixed(1)}</p>
		{/if}
	</section>
</div>
