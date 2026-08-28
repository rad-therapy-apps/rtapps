<!--
	What this file does: Student detail page at
	`(app)/educator/cohorts/[id]/students/[uid]`. Shows one student's per-activity results and
	full attempt history within a cohort.

	Used here and why: `resolve()` for the back-to-cohort link, per
	`svelte/no-navigation-without-resolve`; a `<details open>` per attempt so its items are visible
	by default (the Task 9 Playwright e2e drives this without needing to click to expand); Svelte
	5 runes (`$props()`).

	How it fits the project: `data.detail` comes from this route's `load`
	(`GET cohorts/{id}/students/{uid}`) (FR-E-03). Attempt items render `response` as raw JSON
	since its shape varies per item type (multiple-choice vs free-text, etc).

	Works with: `$app/paths`, `$lib/cohort/format` (`formatPercent`). Used by: reached from
	`(app)/educator/cohorts/[id]/+page.svelte`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatPercent } from '$lib/cohort/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.detail.student.display_name} — RTApps</title>
</svelte:head>

<h1>{data.detail.student.display_name}</h1>
<p>{data.detail.student.email} · joined {data.detail.student.joined_at}</p>

<h2>Results</h2>
<table>
	<thead>
		<tr>
			<th>Activity</th>
			<th>Best</th>
			<th>Latest</th>
			<th>Attempts</th>
			<th>Mastery</th>
			<th>Time spent</th>
		</tr>
	</thead>
	<tbody>
		{#each data.detail.results as r (r.activity_id)}
			<tr>
				<td>{r.title}</td>
				<td>{formatPercent(r.best_percent)}</td>
				<td>{formatPercent(r.latest_percent)}</td>
				<td>{r.attempts}</td>
				<td>{r.mastery}</td>
				<td>{Math.round(r.time_spent_s / 60)} min</td>
			</tr>
		{/each}
	</tbody>
</table>

<h2>Attempts</h2>
<!-- One <details> per attempt, open by default, with its items in a nested table. -->
{#each data.detail.attempts as a (a.attempt_id)}
	<details open>
		<summary>{a.title} — {formatPercent(a.percent)} — {a.submitted_at}</summary>
		<table>
			<thead>
				<tr>
					<th>Item</th>
					<th>Response</th>
					<th>Correct</th>
					<th>Score</th>
				</tr>
			</thead>
			<tbody>
				{#each a.items as i (i.item_key)}
					<tr>
						<td>{i.item_key}</td>
						<td>{JSON.stringify(i.response)}</td>
						<td>{i.correct ? 'Yes' : 'No'}</td>
						<td>{i.score ?? '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</details>
{/each}

<p>
	<a href={resolve('/(app)/educator/cohorts/[id]', { id: data.cohortId })}>Back to cohort</a>
</p>
