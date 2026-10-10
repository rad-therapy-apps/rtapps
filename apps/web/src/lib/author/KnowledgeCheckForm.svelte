<!--
	What this file does: the editor for one knowledge-check block — stem (rich text), options
	(text inputs, add/remove, min 2), the correct-answer radio, and an optional explanation
	(rich text, toggled on/off).
	Used here and why: Svelte 5 runes (`$props`); a plain `block`/`onchange` pair, same shape as
	`RichTextEditor`'s own `doc`/`onchange` — this component owns no state of its own, so every
	edit round-trips through the parent's `pages` array (`LessonEditor.svelte`'s dirty-tracking
	invariant: every mutation goes through one place). Both `RichTextEditor` instances (stem,
	explanation) are keyed off `block.instanceId` (stable across reorders — see `./types.ts`),
	never off array position, so TipTap's one-time-mount contract (Task 14) survives a block move.
	`key` (the grading identifier) is shown read-only — it's never editable once a block exists.
	How it fits the project: the knowledge-check half of Task 15's lesson editor; `key`/`answer`
	map straight onto `KnowledgeCheckImport`'s wire shape (`packages/api-client`).
	Depends on: `./RichTextEditor.svelte`, `./types` (`ClientKnowledgeCheckBlock`).
	Used by: `LessonEditor.svelte`, `LessonEditor.svelte.spec.ts`.
-->
<script lang="ts">
	import RichTextEditor from './RichTextEditor.svelte';
	import type { ClientKnowledgeCheckBlock } from './types';
	import type { ProseDoc } from '../prose/types';
	import Button from '$lib/ui/Button.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let {
		block,
		name = 'Knowledge check',
		onchange
	}: {
		block: ClientKnowledgeCheckBlock;
		/** Accessible-name prefix for the two editors, so several checks on one page stay distinct. */
		name?: string;
		onchange: (next: ClientKnowledgeCheckBlock) => void;
	} = $props();

	const EMPTY_DOC: ProseDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

	function setStem(stem: ProseDoc) {
		onchange({ ...block, stem });
	}

	function setOption(index: number, value: string) {
		const options = block.options.map((option, i) => (i === index ? value : option));
		onchange({ ...block, options });
	}

	function addOption() {
		onchange({ ...block, options: [...block.options, ''] });
	}

	// Removing an option can orphan the current correct-answer index: reset to 0 if the removed
	// option was itself the answer, otherwise shift the answer down past the removed slot.
	function removeOption(index: number) {
		if (block.options.length <= 2) return;
		const options = block.options.filter((_, i) => i !== index);
		const answer =
			index === block.answer ? 0 : index < block.answer ? block.answer - 1 : block.answer;
		onchange({ ...block, options, answer });
	}

	function setAnswer(index: number) {
		onchange({ ...block, answer: index });
	}

	function addExplanation() {
		onchange({ ...block, explanation: structuredClone(EMPTY_DOC) });
	}

	function removeExplanation() {
		onchange({ ...block, explanation: null });
	}

	function setExplanation(explanation: ProseDoc) {
		onchange({ ...block, explanation });
	}
</script>

<fieldset class="kc-form">
	<legend>Knowledge check</legend>

	<!-- The grading identifier: stable, never editable once the block exists. -->
	<p>Key: <code>{block.key}</code></p>

	<div class="field">
		<p>Question</p>
		{#key block.instanceId}
			<RichTextEditor doc={block.stem} label={`${name} question`} onchange={setStem} />
		{/key}
	</div>

	<div class="field options">
		<p>Options</p>
		{#each block.options as option, i (i)}
			<div class="option">
				<input
					type="radio"
					name="answer-{block.instanceId}"
					checked={block.answer === i}
					onchange={() => setAnswer(i)}
					aria-label={`Correct answer: option ${i + 1}`}
				/>
				<input
					type="text"
					value={option}
					oninput={(e) => setOption(i, e.currentTarget.value)}
					aria-label={`Option ${i + 1}`}
				/>
				<Button
					variant="danger"
					icon={Trash2}
					onclick={() => removeOption(i)}
					disabled={block.options.length <= 2}
				>
					Remove option
				</Button>
			</div>
		{/each}
		<Button onclick={addOption}>Add option</Button>
	</div>

	<div class="field">
		{#if block.explanation !== null}
			<p>Explanation</p>
			{#key `${block.instanceId}:explanation`}
				<RichTextEditor
					doc={block.explanation}
					label={`${name} explanation`}
					onchange={setExplanation}
				/>
			{/key}
			<Button onclick={removeExplanation}>Remove explanation</Button>
		{:else}
			<Button onclick={addExplanation}>Add explanation</Button>
		{/if}
	</div>
</fieldset>

<style>
	.kc-form {
		margin: var(--space-4) 0;
		padding: var(--space-4);
		background: var(--surface);
	}
	.field {
		margin-block: var(--space-3);
	}
	.field > p {
		margin-block-end: var(--space-2);
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.option {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-block-end: var(--space-2);
	}
	.option input[type='text'] {
		flex: 1 1 12rem;
	}
</style>
