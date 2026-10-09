<!--
	What this file does: Activity stats page at
	`(app)/educator/cohorts/[id]/activities/[aid]`. Shows one activity's attempt/pass-rate summary,
	its score distribution, a per-item table (answered/correct/% correct/top wrong answers), and
	(plan 4b #53) a per-attempt table for `external` (game) activities, plus a CSV download link.

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
	import PageHeader from '$lib/ui/PageHeader.svelte';
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
	<title>{data.stats.title} — RTTLearn</title>
</svelte:head>

<PageHeader title={data.stats.title} />
<p>
	Attempts: {data.stats.attempts} · Students attempted: {data.stats.students_attempted} · Pass rate: {formatPercent(
		data.stats.pass_rate
	)}
</p>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- API URL (CSV download), not a SvelteKit route -->
<a href={csvHref} data-testid="csv-link">Download CSV</a>

<h2>Score distribution</h2>
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="table-wrap" role="region" aria-label="Score distribution" tabindex="0">
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
					<td class="num">{bucket.count}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if data.stats.attempt_rows.length > 0}
	<h2>Attempts</h2>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="table-wrap" role="region" aria-label="Attempts" tabindex="0">
		<table>
			<thead>
				<tr>
					<th>Student</th>
					<th>Score</th>
					<th>Percent</th>
				</tr>
			</thead>
			<tbody>
				{#each data.stats.attempt_rows as row (row.submitted_at + row.display_name)}
					<tr>
						<td>{row.display_name}</td>
						<td class="num">{row.score === null ? '—' : `${row.score} / ${row.max_score}`}</td>
						<td class="num">{row.percent === null ? 'Completed' : formatPercent(row.percent)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<h2>Items</h2>
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="table-wrap" role="region" aria-label="Items" tabindex="0">
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
					<td class="num">{item.answered}</td>
					<td class="num">{item.correct}</td>
					<td class="num">{formatPercent(item.percent_correct)}</td>
					<td>{topWrong(item)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<p>
	<a href={resolve('/(app)/educator/cohorts/[id]', { id: data.cohortId })}>Back to cohort</a>
</p>

<style>
	.table-wrap {
		overflow-x: auto;
	}
	.num {
		font-variant-numeric: tabular-nums;
	}
</style>
