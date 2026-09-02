<!--
	What this file does: Signed-in landing page at `(app)/home`. Greets the user, lists their past
	results in a table, and (students only) shows their cohorts plus a join-by-code form.

	Used here and why: `use:enhance` on the join form for progressive enhancement; `resolve()` for
	the subjects link (`svelte/no-navigation-without-resolve`); Svelte 5 runes (`$props()`);
	`data.user` is typed non-nullable because the `(app)` layout guard guarantees it by the time
	this page renders.

	How it fits the project: `data.results`/`data.error` and `data.cohorts` come from this route's
	`load` (`GET /me/results`, `GET /cohorts`); the join form posts to the `join` action
	(`POST /cohorts/join`); this is the page `apps/web/e2e/lesson.e2e.ts` returns to after finishing
	a lesson, to assert the new result row and score appear.

	Works with: `$app/forms`, `$app/paths`. Used by: linked from `+layout.svelte` implicitly (post
	sign-in redirect target) and from the login/register `next` default.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Home — RTApps</title>
</svelte:head>

<h1>Welcome, {data.user.display_name}</h1>
<p>Role: {data.user.role}</p>

<p><a href={resolve('/(app)/subjects')}>Browse subjects</a></p>

<!-- Cohorts and the join-by-code form only apply to students. -->
{#if data.user.role === 'student'}
	<h2>Your cohorts</h2>
	{#if data.cohorts.length === 0}
		<p>You are not in a cohort yet.</p>
	{:else}
		<ul>
			{#each data.cohorts as c (c.id)}
				<li>{c.name}</li>
			{/each}
		</ul>
	{/if}

	<form method="POST" action="?/join" use:enhance>
		<label for="code">Join code</label>
		<input
			id="code"
			name="code"
			required
			minlength="6"
			maxlength="12"
			autocapitalize="characters"
			value={form?.code ?? ''}
		/>
		<button>Join cohort</button>
	</form>

	<!-- Server-rendered result from the last join attempt: success (polite live region) or error. -->
	{#if form?.joined}
		<p aria-live="polite">Joined {form.joined}</p>
	{/if}
	{#if form?.error}
		<p role="alert">{form.error}</p>
	{/if}
{/if}

<h2>Your results</h2>
<!-- Three mutually exclusive states: load error, no results yet, or the results table. -->
{#if data.error}
	<p>{data.error}</p>
{:else if data.results.length === 0}
	<p>No results yet — pick a subject to start.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Lesson</th>
				<th>Score</th>
				<th>Percent</th>
				<th>Passed</th>
				<th>Date</th>
			</tr>
		</thead>
		<tbody>
			{#each data.results as result (result.attempt_id)}
				<tr>
					<td>{result.activity_title}</td>
					<td>{result.score ?? '—'} / {result.max_score ?? '—'}</td>
					<td>{result.percent ?? '—'}</td>
					<td>{result.passed ? 'Yes' : 'No'}</td>
					<td>{result.submitted_at ?? '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
