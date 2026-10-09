<!--
	What this file does: the MU (monitor unit) calculator — teaching-first inputs (prescribed
	dose, SSD/PDD vs SAD/TMR technique, depth, field size, plus the photon-complete factor chain:
	collimator/phantom scatter, wedge factor, tray factor, calibration, and the SSD-only Mayneord
	correction) over bilinear/1D table lookups, showing every intermediate step (each factor's
	value and source, the assembled formula, and the resulting MU) rather than just an answer.
	Used here and why: everything is `$derived` from the inputs and the picked tables — there is
	no submit button and nothing to attempt/grade (a calculator is not attemptable, ADR/Task 11);
	role resolution matches pdd/tmr tables FIRST (by key substring) and excludes them from the
	1D-role search, then finds the first REMAINING key containing "sc"/"sp"/"wedge" — mirroring
	how `data_tables` is keyed in the authoring builder (Task 16) rather than a fixed slot. A
	role's table being absent shows its factor as 1.0000 "not configured" rather than blocking the
	calculation. `interpolate2d`/`lookup1d` returning `null` (out of range) is turned into a
	message computed from the grid's own bounds so it can never show NaN.
	How it fits the project: plan 3b Task 17 (base) + plan 3c Task 4 (photon-complete upgrade —
	scatter factors, wedge/tray, Mayneord/ISF) — the calculator branch of the student activity
	route (`(app)/subjects/[slug]/activities/[id]/+page.svelte`) renders this via
	`./registry`, passing `snapshot.calculator.data_tables` verbatim as `tables`.
	Depends on: `./interpolate` (`interpolate2d`, `Grid`), `./formulas` (`mayneordF`, `ssdIsf`).
	Used by: `./registry`, `./MuCalculator.svelte.spec.ts`, the student activity route.
-->
<script lang="ts">
	import CalcShell from './CalcShell.svelte';
	import { interpolate2d, type Grid } from './interpolate';
	import { mayneordF, ssdIsf } from './formulas';

	let { tables }: { tables: Record<string, { title: string; grid: Grid }> } = $props();

	let dose = $state(200);
	let technique = $state<'ssd' | 'sad'>('ssd');
	let depth = $state(5);
	let fieldSize = $state(10);

	// Photon-complete chain inputs (plan 3c Task 4); defaults keep the calculator's pre-Task-4
	// behavior a no-op multiplication (K=1, TF=1, WF=1 at angle 0) except ISF, which TG-51 always
	// applies in SSD mode.
	let kFactor = $state(1);
	let dmax = $state(1.5);
	let trayFactor = $state(1);
	let wedgeAngle = $state(0);
	let mayneordOn = $state(false);
	let ssd = $state(100);

	type TableEntry = [string, { title: string; grid: Grid }];

	/** First entry (in `entries`' own order) whose key contains `substr` (case-insensitive). */
	function findEntry(entries: TableEntry[], substr: string): TableEntry | undefined {
		return entries.find(([key]) => key.toLowerCase().includes(substr));
	}

	/** A single-row grid's factor-vs-x lookup: `interpolate2d` pinned to that one row's own key. */
	function lookup1d(grid: Grid, x: number): number | null {
		return grid.rows.length === 0 ? null : interpolate2d(grid, grid.rows[0].key, x);
	}

	// "pdd" for SSD/PDD, "tmr" for SAD/TMR; the first matching entry in `tables`' own key order.
	const neededTableKind = $derived(technique === 'ssd' ? 'pdd' : 'tmr');
	const allEntries = $derived(Object.entries(tables));

	// IMPORTANT ordering (brief): pdd/tmr are matched FIRST and excluded from the 1D-role search
	// below, so an sc/sp/wedge match can never accidentally land on a pdd/tmr table's key.
	const pddEntry = $derived(findEntry(allEntries, 'pdd'));
	const tmrEntry = $derived(findEntry(allEntries, 'tmr'));
	const tableEntry = $derived(technique === 'ssd' ? pddEntry : tmrEntry);
	const grid = $derived(tableEntry ? tableEntry[1].grid : null);

	const remainingEntries = $derived(
		allEntries.filter(([key]) => key !== pddEntry?.[0] && key !== tmrEntry?.[0])
	);
	// Progressive role exclusion: each matched entry is removed from the pool before the next role's
	// search (order: sc, then sp, then wedge) — prevents a key matching multiple substrings from
	// being assigned to more than one role.
	const scEntry = $derived(findEntry(remainingEntries, 'sc'));
	const scExcluded = $derived(remainingEntries.filter(([key]) => key !== scEntry?.[0]));
	const spEntry = $derived(findEntry(scExcluded, 'sp'));
	const spExcluded = $derived(scExcluded.filter(([key]) => key !== spEntry?.[0]));
	const wedgeEntry = $derived(findEntry(spExcluded, 'wedge'));

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

	// Scatter factors (Sc/Sp): 1.0 "not configured" when that role has no table.
	const scValue = $derived(scEntry ? lookup1d(scEntry[1].grid, fieldSize) : 1);
	const spValue = $derived(spEntry ? lookup1d(spEntry[1].grid, fieldSize) : 1);
	const scSource = $derived(scEntry ? `table: ${scEntry[0]}` : 'not configured');
	const spSource = $derived(spEntry ? `table: ${spEntry[0]}` : 'not configured');

	// Wedge factor (WF): 1.0 at wedge angle 0 or with no wedge table (no need for an authored
	// 0-angle row) — otherwise looked up on the remaining wedge-role table.
	const wedgeValue = $derived(
		wedgeAngle === 0 || !wedgeEntry ? 1 : lookup1d(wedgeEntry[1].grid, wedgeAngle)
	);
	const wedgeSource = $derived(
		wedgeAngle === 0 ? 'no wedge' : wedgeEntry ? `table: ${wedgeEntry[0]}` : 'not configured'
	);

	// SSD-mode-only corrections (Task 1 formulas): the Mayneord depth-dose shift (toggle) and the
	// inverse-square factor TG-51 always applies away from the reference SSD; both fixed at 1 (no
	// correction) in SAD/TMR mode.
	const mayneordFactor = $derived(
		technique === 'ssd' && mayneordOn ? mayneordF(depth, dmax, ssd) : 1
	);
	const isf = $derived(technique === 'ssd' ? ssdIsf(ssd, dmax, depth) : 1);

	// True once the 2D lookup succeeded but some other (1D or formula) factor is out of range —
	// distinct from `lookup === null`, which has its own message/bounds below.
	const factorsOutOfRange = $derived(
		lookup !== null &&
			(scValue === null ||
				spValue === null ||
				wedgeValue === null ||
				(technique === 'ssd' && (mayneordFactor === null || isf === null)))
	);

	const formula = $derived(
		technique === 'ssd'
			? 'MU = dose / (K · (PDD/100) · Sc · Sp · WF · TF · ISF)'
			: 'MU = dose / (K · TMR · Sc · Sp · WF · TF)'
	);

	// dose / (K · (PDD/100) · Sc · Sp · WF · TF · ISF) in SSD mode (PDD first multiplied by the
	// Mayneord correction when the toggle is on); dose / (K · TMR · Sc · Sp · WF · TF) in SAD mode.
	const mu = $derived.by(() => {
		if (lookup === null) return null;
		if (scValue === null || spValue === null || wedgeValue === null) return null;
		if (technique === 'ssd') {
			if (mayneordFactor === null || isf === null) return null;
			const pddEff = lookup * mayneordFactor;
			const den = kFactor * (pddEff / 100) * scValue * spValue * wedgeValue * trayFactor * isf;
			return dose / den;
		}
		const den = kFactor * lookup * scValue * spValue * wedgeValue * trayFactor;
		return dose / den;
	});
</script>

<CalcShell cls="mu-calculator">
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

	<label>
		calibration (cGy/MU)
		<input type="number" bind:value={kFactor} />
	</label>

	<label>
		Tray factor
		<input type="number" bind:value={trayFactor} />
	</label>

	<label>
		Wedge angle (deg)
		<input type="number" bind:value={wedgeAngle} />
	</label>

	{#if technique === 'ssd'}
		<label>
			SSD (cm)
			<input type="number" bind:value={ssd} />
		</label>

		<label>
			dmax (cm)
			<input type="number" bind:value={dmax} />
		</label>

		<label>
			<input type="checkbox" bind:checked={mayneordOn} />
			Mayneord correction
		</label>
	{/if}

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
		{:else if factorsOutOfRange}
			<p data-testid="mu-factor-out-of-range">
				one or more scatter, wedge, or correction factors are outside their table's range
			</p>
		{:else if mu !== null && Number.isFinite(mu)}
			<p data-testid="mu-lookup">
				{neededTableKind.toUpperCase()}: {lookup.toFixed(4)}
			</p>
			<p data-testid="mu-factor-k">K: {kFactor.toFixed(4)} (input)</p>
			<p data-testid="mu-factor-sc">Sc: {(scValue ?? 1).toFixed(4)} ({scSource})</p>
			<p data-testid="mu-factor-sp">Sp: {(spValue ?? 1).toFixed(4)} ({spSource})</p>
			<p data-testid="mu-factor-wedge">WF: {(wedgeValue ?? 1).toFixed(4)} ({wedgeSource})</p>
			<p data-testid="mu-factor-tray">TF: {trayFactor.toFixed(4)} (input)</p>
			{#if technique === 'ssd'}
				<p data-testid="mu-factor-isf">ISF: {(isf ?? 1).toFixed(4)} (formula)</p>
				{#if mayneordOn}
					<p data-testid="mu-factor-mayneord">
						Mayneord F: {(mayneordFactor ?? 1).toFixed(4)} (formula)
					</p>
				{/if}
			{/if}
			<p data-testid="mu-formula">{formula}</p>
			<p data-testid="mu-result">MU = {mu.toFixed(1)}</p>
		{:else}
			<p data-testid="mu-undefined">MU is undefined for a zero table value</p>
		{/if}
	</section>
</CalcShell>
