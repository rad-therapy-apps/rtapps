<script lang="ts">
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import KnowledgeCheck from './KnowledgeCheck.svelte';
	import { api } from './api';
	import { formatScore } from './score';
	import { resolve } from '$app/paths';
	import type { components } from '@rtapps/api-client';
	import type { LessonSnapshot } from './types';

	type LessonOut = components['schemas']['LessonOut'];
	type AttemptOut = components['schemas']['AttemptOut'];
	type ItemGradeOut = components['schemas']['ItemGradeOut'];

	const submitPost = api.POST;

	let { lesson, attempt }: { lesson: LessonOut; attempt: AttemptOut } = $props();

	// `snapshot` is typed as a plain object by the OpenAPI schema (it's opaque JSON to the API),
	// so it needs an explicit cast to the lesson content shape the frontend actually renders.
	const snapshot = lesson.snapshot as unknown as LessonSnapshot;
	const pages = snapshot.lesson.pages;
	const idempotencyKey = crypto.randomUUID();

	let pageIndex = $state(0);
	let gradedResults = $state<Record<string, ItemGradeOut>>({});
	let submitResult = $state<AttemptOut | undefined>(undefined);
	let submitError = $state<string | undefined>(undefined);
	let submitting = $state(false);

	const currentPage = $derived(pages[pageIndex]);
	const isLastPage = $derived(pageIndex === pages.length - 1);

	function recordGrade(key: string, gradeResult: ItemGradeOut) {
		gradedResults = { ...gradedResults, [key]: gradeResult };
	}

	async function finish() {
		submitting = true;
		submitError = undefined;
		try {
			const res = await submitPost('/api/v1/attempts/{attempt_id}/submit', {
				params: { path: { attempt_id: attempt.id } },
				headers: { 'Idempotency-Key': idempotencyKey }
			});
			if (res.error) {
				// See the matching comment in KnowledgeCheck.svelte: apps/api's global exception
				// handlers return an RFC7807 problem+json body with `title` for every error
				// response, which the generated schema (documenting only the default FastAPI
				// 422 body) doesn't reflect.
				submitError = (res.error as { title?: string }).title ?? 'Request failed';
				return;
			}
			submitResult = res.data;
		} catch {
			submitError = 'Request failed';
		} finally {
			submitting = false;
		}
	}
</script>

<p>Page {pageIndex + 1} of {pages.length}</p>
<h2>{currentPage.title}</h2>

{#each currentPage.blocks as block, i (i)}
	{#if block.type === 'rich_text'}
		<ProseDoc doc={block.body} />
	{:else}
		<KnowledgeCheck
			{block}
			attemptId={attempt.id}
			onGraded={recordGrade}
			initial={gradedResults[block.key]}
		/>
	{/if}
{/each}

<div class="pager-controls">
	<button type="button" disabled={pageIndex === 0} onclick={() => pageIndex--}>Previous</button>
	{#if !isLastPage}
		<button type="button" onclick={() => pageIndex++}>Next</button>
	{/if}
</div>

{#if isLastPage}
	{#if !submitResult}
		<button type="button" disabled={submitting} onclick={finish}>Finish lesson</button>
	{:else}
		<p aria-live="polite">Score: {formatScore(submitResult)}</p>
		<a href={resolve('/home')}>Back to home</a>
	{/if}
	{#if submitError}
		<p aria-live="polite">{submitError}</p>
	{/if}
{/if}

<style>
	.pager-controls {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
	}
</style>
