<!--
	What this file does: Activity stats page at
	`(app)/educator/cohorts/[id]/activities/[aid]`. Shows one activity's attempt/pass-rate summary,
	its score distribution, and a per-item table (answered/correct/% correct/top wrong answers),
	plus a CSV download link.

	Used here and why: `resolve()` for the back-to-cohort link, per
	`svelte/no-navigation-without-resolve`; the CSV link is a plain same-origin `<a>` to an API URL
	(the session cookie rides along), not a SvelteKit route, so it's exempted from that rule the
	same way `ProseInline.svelte`'s external content link is; Svelte 5 runes (`$props()`).

	How it fits the project: `data.stats` comes from this route's `load`
	(`GET cohorts/{id}/activities/{aid}`) (plan 3a Task 15).

	Works with: `$app/paths`, `$lib/cohort/format` (`formatPercent`). Used by: reached from
	`(app)/educator/cohorts/[id]/+page.svelte`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatPercent } from '$lib/cohort/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Built here (not inline) so the `<a>` below fits on one line — the eslint-disable comment for
	// it only covers the line right after the comment.
	const csvHref = $derived(`/api/v1/cohorts/${data.cohortId}/activities/${data.activityId}.csv`);

	// "Option (count)" per wrong answer, joined for one cell — top_wrong is already ranked by the API.
	function topWrong(item: PageData['stats']['items'][number]): string {
		return item.top_wrong.map((w) => `${w.option} (${w.count})`).join(', ') || '—';
	}
</script>

<svelte:head>
	<title>{data.stats.title} — RTApps</title>
</svelte:head>

<h1>{data.stats.title}</h1>
<p>
	Attempts: {data.stats.attempts} · Students attempted: {data.stats.students_attempted} · Pass rate: {formatPercent(
		data.stats.pass_rate
	)}
</p>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- API URL (CSV download), not a SvelteKit route -->
<a href={csvHref} data-testid="csv-link">Download CSV</a>

<h2>Score distribution</h2>
<table>
	<thead>
		<tr>
			<th>Range</th>
			<th>Count</th>
		</tr>
	</thead>
	<tbody>
		{#each data.stats.distribution as bucket (bucket.label)}
			<tr>
				<td>{bucket.label}</td>
				<td>{bucket.count}</td>
			</tr>
		{/each}
	</tbody>
</table>

<h2>Items</h2>
<table>
	<thead>
		<tr>
			<th>Item</th>
			<th>Answered</th>
			<th>Correct</th>
			<th>% Correct</th>
			<th>Top wrong answers</th>
		</tr>
	</thead>
	<tbody>
		{#each data.stats.items as item (item.key)}
			<tr>
				<td>{item.label}</td>
				<td>{item.answered}</td>
				<td>{item.correct}</td>
				<td>{formatPercent(item.percent_correct)}</td>
				<td>{topWrong(item)}</td>
			</tr>
		{/each}
	</tbody>
</table>

<p>
	<a href={resolve('/(app)/educator/cohorts/[id]', { id: data.cohortId })}>Back to cohort</a>
</p>
