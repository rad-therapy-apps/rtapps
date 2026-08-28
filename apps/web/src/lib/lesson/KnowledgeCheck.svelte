<script lang="ts">
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import { api } from './api';
	import type { KnowledgeCheckBlock } from './types';
	import type { components } from '@rtapps/api-client';
	import type { ProseDoc as ProseDocType } from '$lib/prose/types';

	type ItemGradeOut = components['schemas']['ItemGradeOut'];

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

	let choice = $state<number | undefined>(undefined);
	let result = $state<ItemGradeOut | undefined>(initial);
	let error = $state<string | undefined>(undefined);
	let checking = $state(false);

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

<fieldset>
	<legend><ProseDoc doc={block.stem} /></legend>
	{#each block.body.options as option, i (i)}
		<label>
			<input type="radio" name={block.key} value={i} bind:group={choice} />
			{option}
		</label>
	{/each}
	<button type="button" disabled={choice === undefined || checking} onclick={checkAnswer}>
		{result ? 'Check again' : 'Check answer'}
	</button>
	{#if error}
		<p aria-live="polite">{error}</p>
	{/if}
	{#if result}
		<p aria-live="polite">{result.correct ? 'Correct' : 'Not quite'}</p>
		{#if result.explanation}
			<!-- OpenAPI types the explanation as a plain object; it is a validated prose doc (packages/schemas) -->
			<ProseDoc doc={result.explanation as unknown as ProseDocType} />
		{/if}
	{/if}
</fieldset>

<style>
	fieldset {
		margin: 1rem 0;
		padding: 1rem;
	}
	label {
		display: block;
	}
</style>
