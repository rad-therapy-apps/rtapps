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
		<button type="button" onclick={search} disabled={searching}>Search</button>
		{#if searchError}
			<p role="alert">{searchError}</p>
		{/if}
		{#if results.length > 0}
			<ul>
				{#each results as q (q.id)}
					<li>
						{q.stem}
						<button type="button" onclick={() => onadd(q)}>Add</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="create">
		{#if showCreate}
			<BankQuestionForm value={draft} onchange={(next) => (draft = next)} />
			<button type="button" onclick={createQuestion} disabled={creating}>Create question</button>
			<button type="button" onclick={() => (showCreate = false)}>Cancel</button>
			{#if createError}
				<p role="alert">{createError}</p>
			{/if}
		{:else}
			<button type="button" onclick={() => (showCreate = true)}>New question</button>
		{/if}
	</div>
</div>
