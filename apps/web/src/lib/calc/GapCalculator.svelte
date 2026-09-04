<!--
	What this file does: the skin-gap calculator — gap = ½·L1·(d/SSD) + ½·L2·(d/SSD), teaching the
	surface gap needed between two adjacent divergent fields matched at a given depth.
	Used here and why: everything is `$derived` from the four inputs, matching the calculator
	suite's no-submit-button, nothing-to-attempt/grade convention (a calculator is not attemptable,
	ADR/Task 11).
	How it fits the project: plan 3c Task 2 — one of four formula-calculator players rendered via
	`./registry`'s `gap` entry; legacy source Treatment_Planning/Gap_Calculation; formula
	`gapCalc()` in `./formulas` (Task 1, audit §5).
	Depends on: `./formulas` (`gapCalc`), `./registry` (`CalcTables`, type only).
	Used by: `./registry`, `./TrivialCalculators.svelte.spec.ts`.
-->
<script lang="ts">
	import { gapCalc } from './formulas';
	import type { CalcTables } from './registry';

	// `tables` is unused here (pure-formula calculator) but kept so every registry
	// component shares one prop shape.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see comment above
	let { tables: _tables }: { tables: CalcTables } = $props();

	let l1 = $state(10);
	let l2 = $state(20);
	let depth = $state(5);
	let ssd = $state(100);

	const gap = $derived(gapCalc(l1, l2, depth, ssd));
</script>

<div class="calc">
	<label>Field length 1 (cm) <input type="number" bind:value={l1} min="1" step="0.5" /></label>
	<label>Field length 2 (cm) <input type="number" bind:value={l2} min="1" step="0.5" /></label>
	<label>Match depth (cm) <input type="number" bind:value={depth} min="0.5" step="0.5" /></label>
	<label>SSD (cm) <input type="number" bind:value={ssd} min="50" step="1" /></label>

	{#if gap === null}
		<p class="calc-message">Enter positive field lengths, depth and SSD.</p>
	{:else}
		<p class="calc-formula">gap = ½·L1·(d/SSD) + ½·L2·(d/SSD)</p>
		<p class="calc-result">Skin gap: <strong>{gap.toFixed(2)} cm</strong></p>
	{/if}
</div>
