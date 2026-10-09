<!--
	What this file does: a search box over the question bank (`GET /authoring/questions?q=`) with
	an Add button per result, plus an inline "new question" form that creates one
	(`POST /authoring/questions`) and adds it straight away.
	Used here and why: `get`/`post` default to the real API client (`$lib/author/api`'s
	`api.GET`/`api.POST`) but are overridable, the same injectable-client pattern
	`LessonEditor.svelte`'s `put` uses -- both async actions (search, create) are busy-guarded
	with try/catch/finally so a failed request can never wedge either button. The create form
	reuses `BankQuestionForm.svelte` for its stem/options/answer/explanation fields (the same
	component the quiz page uses to edit an existing bank question in place), so that UI exists
	in exactly one place. `onadd` hands the caller the full `QuestionAuthorOut` either way
	(existing search result or freshly created) -- it's the quiz page's job to decide whether it's
	already in the quiz, not this component's.
	How it fits the project: the question-bank browse/create half of Task 16's quiz builder.
	Depends on: `./BankQuestionForm.svelte`, `./api` (`api`), `@rtapps/api-client`
	(`components['schemas']['QuestionAuthorOut']`).
	Used by: `routes/(app)/author/quizzes/[id]/+page.svelte`.
-->
<script lang="ts">
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import BankQuestionForm, { type BankQuestionValue } from './BankQuestionForm.svelte';
	import { api } from './api';
	import { problemDetail } from './problem';
	import type { components } from '@rtapps/api-client';

	type QuestionAuthorOut = components['schemas']['QuestionAuthorOut'];

	let {
		onadd,
		get = api.GET,
		post = api.POST
	}: {
		onadd: (question: QuestionAuthorOut) => void;
		get?: typeof api.GET;
		post?: typeof api.POST;
	} = $props();

	// --- search ---

	let query = $state('');
	let results = $state<QuestionAuthorOut[]>([]);
	let searching = $state(false);
	let searchError = $state<string | undefined>(undefined);

	async function search() {
		if (searching) return;
		searching = true;
		searchError = undefined;
		try {
			const res = await get('/api/v1/authoring/questions', {
				params: { query: { q: query || undefined } }
			});
			if (res.error) {
				searchError = problemDetail(res.error);
				return;
			}
			results = res.data ?? [];
		} catch {
			searchError = 'Request failed';
		} finally {
			searching = false;
		}
	}

	// --- create new ---

	const EMPTY_QUESTION: BankQuestionValue = {
		stem: '',
		options: ['', ''],
		answer: 0,
		explanation: null
	};

	let showCreate = $state(false);
	let draft = $state<BankQuestionValue>({
		...EMPTY_QUESTION,
		options: [...EMPTY_QUESTION.options]
	});
	let creating = $state(false);
	let createError = $state<string | undefined>(undefined);

	async function createQuestion() {
		if (creating) return;
		creating = true;
		createError = undefined;
		try {
			const res = await post('/api/v1/authoring/questions', { body: draft });
			if (res.error) {
				createError = problemDetail(res.error);
				return;
			}
			onadd(res.data);
			draft = { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] };
			showCreate = false;
		} catch {
			createError = 'Request failed';
		} finally {
			creating = false;
		}
	}
</script>

<div class="question-picker">
	<div class="search">
		<label>
			Search question bank
			<input value={query} oninput={(e) => (query = e.currentTarget.value)} />
		</label>
		<Button onclick={search} disabled={searching}>Search</Button>
	</div>
	{#if searchError}
		<Alert tone="danger" role="alert">{searchError}</Alert>
	{/if}
	{#if results.length > 0}
		<ul class="results">
			{#each results as q (q.id)}
				<li>
					<span>{q.stem}</span>
					<Button onclick={() => onadd(q)}>Add</Button>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="create">
		{#if showCreate}
			<BankQuestionForm value={draft} onchange={(next) => (draft = next)} />
			<div class="create-controls">
				<Button variant="primary" onclick={createQuestion} disabled={creating}>
					Create question
				</Button>
				<Button variant="ghost" onclick={() => (showCreate = false)}>Cancel</Button>
			</div>
			{#if createError}
				<Alert tone="danger" role="alert">{createError}</Alert>
			{/if}
		{:else}
			<Button onclick={() => (showCreate = true)}>New question</Button>
		{/if}
	</div>
</div>

<style>
	.question-picker {
		display: grid;
		gap: var(--space-3);
	}
	.search {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
	}
	.search label {
		display: grid;
		flex: 1 1 14rem;
		gap: var(--space-1);
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.results {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.results li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.create-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
