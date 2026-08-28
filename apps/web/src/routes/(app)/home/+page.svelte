<!--
	What this file does: Signed-in landing page at `(app)/home`. Greets the user and lists their
	past results in a table.

	Used here and why: `resolve()` for the subjects link (`svelte/no-navigation-without-resolve`);
	Svelte 5 runes (`$props()`); `data.user` is typed non-nullable because the `(app)` layout
	guard guarantees it by the time this page renders.

	How it fits the project: `data.results`/`data.error` come from this route's `load`
	(`GET /me/results`); this is the page `apps/web/e2e/lesson.e2e.ts` returns to after finishing
	a lesson, to assert the new result row and score appear.

	Works with: `$app/paths`. Used by: linked from `+layout.svelte` implicitly (post sign-in
	redirect target) and from the login/register `next` default.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Home — RTApps</title>
</svelte:head>

<h1>Welcome, {data.user.display_name}</h1>
<p>Role: {data.user.role}</p>

<p><a href={resolve('/subjects')}>Browse subjects</a></p>

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
