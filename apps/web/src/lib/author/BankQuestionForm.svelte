<!--
	What this file does: the editable form for a single question-bank question -- stem, options
	with a correct-answer radio (add/remove, min 2), and an optional explanation.
	Used here and why: mirrors `KnowledgeCheckForm.svelte`'s idiom (Task 15) -- a plain
	`value`/`onchange` pair, no state of its own -- but for a bank `QuestionAuthorOut`, whose
	stem/explanation are plain text (not `ProseDoc`), so plain `<textarea>`s stand in for
	`RichTextEditor`; `$props.id()` gives the answer radio group a stable per-instance name
	without needing an external instanceId the way `KnowledgeCheckForm` has one from its block.
	Shared by `QuestionPicker.svelte`'s "new question" form and the quiz builder's inline
	edit-existing-question form (Task 16), so the option add/remove/answer-select UI exists in
	exactly one place.
	How it fits the project: the question-bank half of Task 16's quiz builder; `value`'s shape is
	`QuestionAuthorIn`'s wire shape (stem/options/answer/explanation).
	Depends on: nothing else.
	Used by: `QuestionPicker.svelte`, `routes/(app)/author/quizzes/[id]/+page.svelte`.
-->
<script lang="ts">
	export type BankQuestionValue = {
		stem: string;
		options: string[];
		answer: number;
		explanation: string | null;
	};

	let {
		value,
		onchange
	}: {
		value: BankQuestionValue;
		onchange: (next: BankQuestionValue) => void;
	} = $props();

	const uid = $props.id();

	function setStem(stem: string) {
		onchange({ ...value, stem });
	}
	function setOption(index: number, option: string) {
		onchange({ ...value, options: value.options.map((o, i) => (i === index ? option : o)) });
	}
	function addOption() {
		onchange({ ...value, options: [...value.options, ''] });
	}
	// Removing an option can orphan the current answer index: reset to 0 if the removed option
	// was itself the answer, otherwise shift the answer down past the removed slot -- same rule
	// as `KnowledgeCheckForm.svelte`'s `removeOption`.
	function removeOption(index: number) {
		if (value.options.length <= 2) return;
		const options = value.options.filter((_, i) => i !== index);
		const answer =
			index === value.answer ? 0 : index < value.answer ? value.answer - 1 : value.answer;
		onchange({ ...value, options, answer });
	}
	function setAnswer(index: number) {
		onchange({ ...value, answer: index });
	}
	function addExplanation() {
		onchange({ ...value, explanation: '' });
	}
	function removeExplanation() {
		onchange({ ...value, explanation: null });
	}
	function setExplanation(explanation: string) {
		onchange({ ...value, explanation });
	}
</script>

<fieldset class="bank-question-form">
	<legend>Question</legend>

	<label>
		Stem
		<textarea value={value.stem} oninput={(e) => setStem(e.currentTarget.value)}></textarea>
	</label>

	<div class="field options">
		<p>Options</p>
		{#each value.options as option, i (i)}
			<div class="option">
				<input
					type="radio"
					name="bank-question-answer-{uid}"
					checked={value.answer === i}
					onchange={() => setAnswer(i)}
					aria-label={`Correct answer: option ${i + 1}`}
				/>
				<input
					type="text"
					value={option}
					oninput={(e) => setOption(i, e.currentTarget.value)}
					aria-label={`Option ${i + 1}`}
				/>
				<button type="button" onclick={() => removeOption(i)} disabled={value.options.length <= 2}>
					Remove option
				</button>
			</div>
		{/each}
		<button type="button" onclick={addOption}>Add option</button>
	</div>

	<div class="field">
		{#if value.explanation !== null}
			<label>
				Explanation
				<textarea value={value.explanation} oninput={(e) => setExplanation(e.currentTarget.value)}
				></textarea>
			</label>
			<button type="button" onclick={removeExplanation}>Remove explanation</button>
		{:else}
			<button type="button" onclick={addExplanation}>Add explanation</button>
		{/if}
	</div>
</fieldset>

<style>
	.bank-question-form {
		margin: 1rem 0;
		padding: 1rem;
	}
	.field {
		margin-block: 0.75rem;
	}
	.option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-block-end: 0.25rem;
	}
</style>
