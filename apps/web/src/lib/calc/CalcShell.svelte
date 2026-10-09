<!--
	What this file does: The shared frame for every calculator — a Card holding a responsive
	input grid (two columns from 40rem, one below) and the shared look of the result, formula and
	message lines.
	Used here and why: calculators pass plain markup (labels, inputs, `.calc-result`, `.calc-formula`,
	`.calc-message`) as children, so the look is applied through `:global` selectors scoped under
	this shell's own class; `cls` keeps each calculator's existing container class (`calc`,
	`mu-calculator`) on the element tests select. Colours come from tokens only.
	How it fits the project: shared by the six calculators in this folder, docs/specs/2026-10-01-ui-restyle-design.md
	(Task 9). The activity route page renders calculators without its own Card, so this supplies it.
	Depends on: `$lib/ui/Card.svelte`.
	Used by: every `*Calculator.svelte` and `SiConverter.svelte` in this folder.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '$lib/ui/Card.svelte';

	let { cls, children }: { cls: 'calc' | 'mu-calculator'; children: Snippet } = $props();
</script>

<Card>
	<div class="{cls} calc-grid">
		{@render children()}
	</div>
</Card>

<style>
	.calc-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
	}
	@media (min-width: 40rem) {
		.calc-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.calc-grid :global(label) {
		display: grid;
		gap: var(--space-1);
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.calc-grid :global(label:has(input[type='checkbox'])),
	.calc-grid :global(fieldset label) {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 400;
		font-size: inherit;
	}
	.calc-grid :global(fieldset) {
		grid-column: 1 / -1;
		min-width: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-5);
	}
	.calc-grid :global(.calc-formula),
	.calc-grid :global(.calc-result),
	.calc-grid :global([data-testid='mu-output']),
	.calc-grid :global(.alert) {
		grid-column: 1 / -1;
		min-width: 0;
		margin: 0;
	}
	.calc-grid :global(.calc-formula) {
		font-family: var(--font-mono);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}
	.calc-grid :global(.calc-result),
	.calc-grid :global([data-testid='mu-output']) {
		padding: var(--space-3) var(--space-4);
		background: var(--surface-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	.calc-grid :global([data-testid='mu-output'] p) {
		margin: 0 0 var(--space-1);
	}
	.calc-grid :global(.calc-message) {
		margin: 0;
	}
</style>
