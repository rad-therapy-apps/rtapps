<script lang="ts">
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import { api } from './api';
	import type { KnowledgeCheckBlock } from './types';
	import type { components } from '@rtapps/api-client';
	import type { ProseDoc as ProseDocType } from '$lib/prose/types';

	type ItemGradeOut = components['schemas']['ItemGradeOut'];

	// The generated schema keys its paths with the API's own "/api/v1" mount prefix, but
	// `createApi()`'s `baseUrl` already supplies that prefix — so calls here use the
	// unprefixed path openapi-fetch actually sends over the wire. That string isn't a key
	// of the generated `paths` type, hence the cast; the request/response shape is still checked.
	type ItemsPost = (
		path: '/attempts/{attempt_id}/items',
		init: {
			params: { path: { attempt_id: string } };
			body: { item_key: string; response: { choice: number } };
		}
	) => Promise<{ data?: ItemGradeOut; error?: { title?: string } }>;

	let {
		block,
		attemptId,
		post = api.POST as unknown as ItemsPost,
		onGraded,
		initial
	}: {
		block: KnowledgeCheckBlock;
		attemptId: string;
		post?: ItemsPost;
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
			const res = await post('/attempts/{attempt_id}/items', {
				params: { path: { attempt_id: attemptId } },
				body: { item_key: block.key, response: { choice } }
			});
			if (res.error) {
				error = res.error.title ?? 'Request failed';
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
