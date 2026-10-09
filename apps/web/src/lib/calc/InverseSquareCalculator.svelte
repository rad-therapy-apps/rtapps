<!--
	What this file does: the inverse-square law calculator — I2 = I1 * (d1/d2)^2, teaching the
	intensity at a second distance plus the distance ratio and the area-scaling factor it implies.
	Used here and why: I1 (reference intensity) is fixed at 100 (legacy default) rather than an
	input, since the calculator is about how intensity changes with distance, not about I1 itself
	(audit §6); everything else is `$derived`, matching the calculator suite's no-submit-button,
	nothing-to-attempt/grade convention (a calculator is not attemptable, ADR/Task 11).
	How it fits the project: plan 3c Task 2 — one of four formula-calculator players rendered via
	`./registry`'s `inverse_square` entry; formula in `./formulas` (Task 1).
	Depends on: `./formulas` (`inverseSquare`), `./registry` (`CalcTables`, type only).
	Used by: `./registry`, `./TrivialCalculators.svelte.spec.ts`.
-->
<script lang="ts">
	import CalcShell from './CalcShell.svelte';
	import Alert from '$lib/ui/Alert.svelte';
	import { inverseSquare } from './formulas';
	import type { CalcTables } from './registry';

	// `tables` is unused here (pure-formula calculator) but kept so every registry
	// component shares one prop shape.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see comment above
	let { tables: _tables }: { tables: CalcTables } = $props();

	// Reference intensity I1 is fixed (legacy default), not user-adjustable.
	const i1 = 100;

	let d1 = $state(100);
	let d2 = $state(200);

	const result = $derived(inverseSquare(i1, d1, d2));
</script>

<CalcShell cls="calc">
	<label>Distance 1, d1 (cm) <input type="number" bind:value={d1} min="1" step="1" /></label>
	<label>Distance 2, d2 (cm) <input type="number" bind:value={d2} min="1" step="1" /></label>

	{#if result === null}
		<Alert tone="info"><p class="calc-message">Enter positive distances for d1 and d2.</p></Alert>
	{:else}
		<p class="calc-formula">I2 = I1 · (d1/d2)² (I1 fixed at {i1})</p>
		<p class="calc-result">Intensity I2: <strong>{result.i2.toFixed(1)}</strong></p>
		<p class="calc-result">Distance ratio d2/d1: {result.ratio.toFixed(2)}</p>
		<p class="calc-result">Area scaling: {result.area.toFixed(2)}</p>
	{/if}
</CalcShell>
