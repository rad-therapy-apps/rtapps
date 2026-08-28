<!--
	What this file does: a single-choice knowledge-check question — radio options, a "Check
	answer" button that grades the current choice against the server, and the resulting
	correct/incorrect feedback with explanation.
	Used here and why: Svelte 5 runes ($props for the block/attemptId/post/onGraded/initial
	inputs, $state for the in-progress choice/result/error/checking); `post` defaults to the real
	`openapi-fetch` client (`api.POST`) but is overridable so specs can inject a fake.
	How it fits the project: this is the item-grading half of ADR-0004's integration spine —
	posts to `/api/v1/attempts/{attempt_id}/items` over the session cookie (ADR-0002) and renders
	whatever the server decides, never a client-computed answer. See `docs/03-architecture.md`
	§4.4.
	Depends on: `$lib/prose/ProseDoc.svelte` (renders the stem/explanation), `./api`, `./types`
	(`KnowledgeCheckBlock`), `@rtapps/api-client` (`ItemGradeOut`), `$lib/prose/types`.
	Used by: `LessonPager.svelte` (one instance per knowledge_check block),
	`KnowledgeCheck.svelte.spec.ts`.
-->
<script lang="ts">
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import { api } from './api';
	import type { KnowledgeCheckBlock } from './types';
	import type { components } from '@rtapps/api-client';
	import type { ProseDoc as ProseDocType } from '$lib/prose/types';

	type ItemGradeOut = components['schemas']['ItemGradeOut'];

	// `block` is this question's content + answer key location (`key`); `attemptId` scopes the
	// grading request to the in-progress attempt; `post` defaults to the real API client but is
	// swapped for a fake in tests; `onGraded` reports the result up to LessonPager so it can be
	// restored if the page is revisited; `initial` re-hydrates a result already graded earlier.
	let {
		block,
		attemptId,
		post = api.POST,
		onGraded,
		initial
	}: {
		block: KnowledgeCheckBlock;
		attemptId: string;
		post?: typeof api.POST;
		onGraded?: (key: string, result: ItemGradeOut) => void;
		initial?: ItemGradeOut;
	} = $props();

	// The radio index the student has selected; undefined until they pick one.
	let choice = $state<number | undefined>(undefined);
	// The most recent grading result, seeded from `initial` so a page revisit shows it again.
	let result = $state<ItemGradeOut | undefined>(initial);
	// User-facing message when grading fails; cleared at the start of each attempt.
	let error = $state<string | undefined>(undefined);
	// True while a grading request is in flight, to disable the button against double-submits.
	let checking = $state(false);

	// Posts the selected choice to the API and stores the graded result (or an error message).
	async function checkAnswer() {
		if (choice === undefined) return;
		checking = true;
		error = undefined;
		try {
			const res = await post('/api/v1/attempts/{attempt_id}/items', {
				params: { path: { attempt_id: attemptId } },
				body: { item_key: block.key, response: { choice } }
			});
			if (res.error) {
				// The generated schema only documents the default FastAPI 422 body, but
				// apps/api's global exception handlers (apps/api/app/errors.py) actually return
				// an RFC7807 problem+json body with `title` for every error response, so the
				// schema's `error` type doesn't reflect what's sent over the wire.
				error = (res.error as { title?: string }).title ?? 'Request failed';
				return;
			}
			result = res.data;
			if (result) onGraded?.(block.key, result);
		} catch {
			error = 'Request failed';
		} finally {
			checking = false;
		}
	}
</script>

<!-- The whole question: stem, one radio per option, the check button, and any feedback below. -->
<fieldset>
	<legend><ProseDoc doc={block.stem} /></legend>
	<!-- One radio per option; `i` as the key/value since options have no id of their own and the list is static per block. -->
	{#each block.body.options as option, i (i)}
		<label>
			<input type="radio" name={block.key} value={i} bind:group={choice} />
			{option}
		</label>
	{/each}
	<button type="button" disabled={choice === undefined || checking} onclick={checkAnswer}>
		{result ? 'Check again' : 'Check answer'}
	</button>
	<!-- Grading request failed: surfaced as polite live-region text so screen readers announce it without stealing focus. -->
	{#if error}
		<p aria-live="polite">{error}</p>
	{/if}
	<!-- Graded result: correct/incorrect verdict, plus an explanation if the question has one. -->
	{#if result}
		<p aria-live="polite">{result.correct ? 'Correct' : 'Not quite'}</p>
		{#if result.explanation}
			<!-- OpenAPI types the explanation as a plain object; it is a validated prose doc (packages/schemas) -->
			<ProseDoc doc={result.explanation as unknown as ProseDocType} />
		{/if}
	{/if}
</fieldset>

<style>
	/* Spacing around the whole question. */
	fieldset {
		margin: 1rem 0;
		padding: 1rem;
	}
	/* One option per line rather than inline radios. */
	label {
		display: block;
	}
</style>
