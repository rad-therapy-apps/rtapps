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
