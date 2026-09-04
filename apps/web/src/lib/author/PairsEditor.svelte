<!--
	What this file does: rows of {term, definition} text inputs -- add/remove/move, plus an
	inline duplicate warning -- shared by the flashcard deck and matching builders (Task 16).
	Used here and why: a plain `rows`/`onchange` pair (the same controlled shape as
	`RichTextEditor.svelte`/`KnowledgeCheckForm.svelte`'s `doc`/`onchange`), so this component owns
	no state of its own -- every edit round-trips through the caller's own state. `minRows`
	differs by caller: `FlashcardDeckPutIn.cards` requires at least 1 (deck), `MatchingPutIn.pairs`
	requires at least 2 (matching) -- the Remove control disables itself at that floor rather than
	the API's 422 being the only backstop, the same idea as `LessonEditor.svelte`'s last-block
	delete guard. Duplicate detection (`./duplicates`) mirrors the same rule the API enforces
	server-side (`_MatchingContentMixin._unique_pairs`, and the equivalent
	`activity_importer.MatchingPayload` checks it's not shared with -- see that mixin's docstring)
	so an author sees a clash before saving, not after a round-trip 422. `termLabel`/
	`definitionLabel` let the deck page relabel the same shape as "Front"/"Back" without a second
	component.
	How it fits the project: the term/definition half of Task 16's deck and matching builders.
	Depends on: `./duplicates` (`duplicates`).
	Used by: `routes/(app)/author/decks/[id]/+page.svelte`,
	`routes/(app)/author/matching/[id]/+page.svelte`, `PairsEditor.svelte.spec.ts`.
-->
<script lang="ts">
	import { duplicates } from './duplicates';

	type Pair = { term: string; definition: string };

	let {
		rows,
		onchange,
		termLabel = 'Term',
		definitionLabel = 'Definition',
		minRows = 2
	}: {
		rows: Pair[];
		onchange: (next: Pair[]) => void;
		termLabel?: string;
		definitionLabel?: string;
		minRows?: number;
	} = $props();

	const duplicateTerms = $derived(duplicates(rows.map((r) => r.term)));
	const duplicateDefinitions = $derived(duplicates(rows.map((r) => r.definition)));

	function setTerm(index: number, term: string) {
		onchange(rows.map((r, i) => (i === index ? { ...r, term } : r)));
	}
	function setDefinition(index: number, definition: string) {
		onchange(rows.map((r, i) => (i === index ? { ...r, definition } : r)));
	}
	function addRow() {
		onchange([...rows, { term: '', definition: '' }]);
	}
	function moveRow(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= rows.length) return;
		const next = [...rows];
		[next[index], next[target]] = [next[target], next[index]];
		onchange(next);
	}
	function removeRow(index: number) {
		if (rows.length <= minRows) return;
		onchange(rows.filter((_, i) => i !== index));
	}
</script>

<div class="pairs-editor">
	{#each rows as row, i (i)}
		<div class="pair-row">
			<label>
				{termLabel}
				<input
					value={row.term}
					oninput={(e) => setTerm(i, e.currentTarget.value)}
					aria-invalid={duplicateTerms.has(row.term)}
				/>
			</label>
			<label>
				{definitionLabel}
				<input
					value={row.definition}
					oninput={(e) => setDefinition(i, e.currentTarget.value)}
					aria-invalid={duplicateDefinitions.has(row.definition)}
				/>
			</label>
			<div class="pair-controls">
				<button type="button" onclick={() => moveRow(i, -1)} disabled={i === 0}>Move up</button>
				<button type="button" onclick={() => moveRow(i, 1)} disabled={i === rows.length - 1}>
					Move down
				</button>
				<button type="button" onclick={() => removeRow(i)} disabled={rows.length <= minRows}>
					Remove
				</button>
			</div>
		</div>
	{/each}

	<button type="button" onclick={addRow}>Add {termLabel.toLowerCase()}</button>

	{#if duplicateTerms.size > 0}
		<p role="alert">Duplicate {termLabel.toLowerCase()}s: {[...duplicateTerms].join(', ')}</p>
	{/if}
	{#if duplicateDefinitions.size > 0}
		<p role="alert">
			Duplicate {definitionLabel.toLowerCase()}s: {[...duplicateDefinitions].join(', ')}
		</p>
	{/if}
</div>

<style>
	.pair-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		margin-block: 0.5rem;
	}
	.pair-controls {
		display: flex;
		gap: 0.5rem;
	}
</style>
