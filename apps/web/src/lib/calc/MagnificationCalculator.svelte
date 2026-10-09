<!--
	What this file does: the radiographic magnification calculator — M = SID/SOD, teaching the
	magnification factor, the resulting image size for a given object size, and the percentage
	enlargement.
	Used here and why: everything is `$derived` from the three inputs, matching the calculator
	suite's no-submit-button, nothing-to-attempt/grade convention (a calculator is not attemptable,
	ADR/Task 11).
	How it fits the project: plan 3c Task 2 — one of four formula-calculator players rendered via
	`./registry`'s `magnification` entry; formula in `./formulas` (Task 1, audit §7).
	Depends on: `./formulas` (`magnification`), `./registry` (`CalcTables`, type only).
	Used by: `./registry`, `./TrivialCalculators.svelte.spec.ts`.
-->
<script lang="ts">
	import CalcShell from './CalcShell.svelte';
	import Alert from '$lib/ui/Alert.svelte';
	import { magnification } from './formulas';
	import type { CalcTables } from './registry';

	// `tables` is unused here (pure-formula calculator) but kept so every registry
	// component shares one prop shape.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see comment above
	let { tables: _tables }: { tables: CalcTables } = $props();

	let sid = $state(140);
	let sod = $state(100);
	let obj = $state(4);

	const result = $derived(magnification(sid, sod, obj));
</script>

<CalcShell cls="calc">
	<label
		>Source-to-image distance, SID (cm) <input
			type="number"
			bind:value={sid}
			min="1"
			step="1"
		/></label
	>
	<label
		>Source-to-object distance, SOD (cm) <input
			type="number"
			bind:value={sod}
			min="1"
			step="1"
		/></label
	>
	<label>Object size (cm) <input type="number" bind:value={obj} min="0.1" step="0.5" /></label>

	{#if result === null}
		<Alert tone="info"
			><p class="calc-message">Enter a positive source-to-object distance.</p></Alert
		>
	{:else}
		<p class="calc-formula">M = SID/SOD; image size = object size × M</p>
		<p class="calc-result">Magnification: <strong>{result.m.toFixed(2)}</strong></p>
		<p class="calc-result">Image size: {result.imgSize.toFixed(2)} cm</p>
		<p class="calc-result">Enlargement: {result.pctEnlarge.toFixed(2)}%</p>
	{/if}
</CalcShell>
