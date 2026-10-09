<!--
	What this file does: the SI unit/prefix converter — picks a clinical quantity (absorbed dose,
	equivalent dose, radioactivity, exposure, length, energy), then converts a value between that
	quantity's units via `siConvert` (audit §11).
	Used here and why: everything is `$derived` from the four inputs, matching the calculator
	suite's no-submit-button, nothing-to-attempt/grade convention (a calculator is not attemptable,
	ADR/Task 11). Changing the quantity resets the from/to unit selects to that quantity's first
	two units (or its only unit, if it has just one), mirroring the legacy page's
	`populateUnitSelectors()`. The result is formatted with the legacy page's exact rule: fixed
	decimal (4 places) when `1e-4 <= |r| < 1e7`, else scientific notation (4 places).
	How it fits the project: plan 3c Task 3 — registered via `./registry`'s `si_convert` entry;
	legacy source `Radiation_Physics/units_of_measurement/index.html`; units/factors in
	`./siUnits` (`UNITS`), conversion in `./formulas` (`siConvert`, Task 1, audit §11).
	Depends on: `./CalcShell.svelte`, `$lib/ui/Alert.svelte`, `./siUnits` (`UNITS`), `./formulas` (`siConvert`), `./registry` (`CalcTables`, type
	only).
	Used by: `./registry`, `./TrivialCalculators.svelte.spec.ts`.
-->
<script lang="ts">
	import CalcShell from './CalcShell.svelte';
	import Alert from '$lib/ui/Alert.svelte';
	import { siConvert } from './formulas';
	import { UNITS } from './siUnits';
	import type { CalcTables } from './registry';

	// `tables` is unused here (pure-formula calculator) but kept so every registry
	// component shares one prop shape.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see comment above
	let { tables: _tables }: { tables: CalcTables } = $props();

	const quantities = Object.keys(UNITS);

	let quantity = $state(quantities[0]);
	let value = $state(2);
	let fromUnit = $state(Object.keys(UNITS[quantities[0]].factors)[0]);
	let toUnit = $state(
		Object.keys(UNITS[quantities[0]].factors)[1] ?? Object.keys(UNITS[quantities[0]].factors)[0]
	);

	const factors = $derived(UNITS[quantity].factors);
	const result = $derived(siConvert(value, factors[fromUnit], factors[toUnit]));

	// Reset from/to to the selected quantity's first two units whenever the quantity changes,
	// mirroring the legacy page's `populateUnitSelectors()`.
	$effect(() => {
		const units = Object.keys(UNITS[quantity].factors);
		fromUnit = units[0];
		toUnit = units.length > 1 ? units[1] : units[0];
	});

	// Legacy formatting rule (audit §11): fixed decimal (4 places) when 1e-4 <= |r| < 1e7,
	// else scientific notation (4 places).
	function formatResult(r: number): string {
		if (Math.abs(r) > 1e7 || (Math.abs(r) < 1e-4 && r !== 0)) {
			return r.toExponential(4);
		}
		return r.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
	}
</script>

<CalcShell cls="calc">
	<label
		>Quantity
		<select bind:value={quantity}>
			{#each quantities as q (q)}
				<option value={q}>{UNITS[q].label}</option>
			{/each}
		</select>
	</label>
	<label>Value <input type="number" bind:value /></label>
	<label
		>From unit
		<select bind:value={fromUnit}>
			{#each Object.keys(factors) as u (u)}
				<option value={u}>{u}</option>
			{/each}
		</select>
	</label>
	<label
		>To unit
		<select bind:value={toUnit}>
			{#each Object.keys(factors) as u (u)}
				<option value={u}>{u}</option>
			{/each}
		</select>
	</label>

	{#if result === null}
		<Alert tone="info"><p class="calc-message">Enter a valid numeric value.</p></Alert>
	{:else}
		<p class="calc-formula">result = value × (fromFactor / toFactor)</p>
		<p class="calc-result">Result: <strong>{formatResult(result)} {toUnit}</strong></p>
	{/if}
</CalcShell>
