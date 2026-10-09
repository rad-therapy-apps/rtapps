<!--
	What this file does: the extended-SSD correction calculator — isf = ((ssd0+d)/(ssdE+d))^2,
	teaching the inverse-square factor between a reference and an extended treatment distance,
	plus the output percentage, the MU multiplier it implies, and the field-size (magnification)
	factor between the two SSDs.
	Used here and why: everything is `$derived` from the three inputs, matching the calculator
	suite's no-submit-button, nothing-to-attempt/grade convention (a calculator is not attemptable,
	ADR/Task 11).
	How it fits the project: plan 3c Task 2 — one of four formula-calculator players rendered via
	`./registry`'s `extended_ssd` entry; formula in `./formulas` (Task 1, audit §4).
	Depends on: `./CalcShell.svelte`, `$lib/ui/Alert.svelte`, `./formulas` (`extendedSsd`), `./registry` (`CalcTables`, type only).
	Used by: `./registry`, `./TrivialCalculators.svelte.spec.ts`.
-->
<script lang="ts">
	import CalcShell from './CalcShell.svelte';
	import Alert from '$lib/ui/Alert.svelte';
	import { extendedSsd } from './formulas';
	import type { CalcTables } from './registry';

	// `tables` is unused here (pure-formula calculator) but kept so every registry
	// component shares one prop shape.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see comment above
	let { tables: _tables }: { tables: CalcTables } = $props();

	let ssd0 = $state(100);
	let ssdE = $state(150);
	let depth = $state(10);

	const result = $derived(extendedSsd(ssd0, ssdE, depth));
</script>

<CalcShell cls="calc">
	<label>Reference SSD, SSD0 (cm) <input type="number" bind:value={ssd0} min="1" step="1" /></label>
	<label>Extended SSD, SSDe (cm) <input type="number" bind:value={ssdE} min="1" step="1" /></label>
	<label>Depth (cm) <input type="number" bind:value={depth} min="0" step="0.5" /></label>

	{#if result === null}
		<Alert tone="info"
			><p class="calc-message">
				Enter a positive reference SSD and a positive SSDe + depth.
			</p></Alert
		>
	{:else}
		<p class="calc-formula">ISF = ((SSD0+d)/(SSDe+d))²</p>
		<p class="calc-result">ISF: <strong>{result.isf.toFixed(4)}</strong></p>
		<p class="calc-result">Output: {result.outPct.toFixed(2)}%</p>
		<p class="calc-result">MU multiplier: <strong>{result.muMult.toFixed(4)}</strong></p>
		<p class="calc-result">Field factor: {result.fieldF.toFixed(2)}</p>
	{/if}
</CalcShell>
