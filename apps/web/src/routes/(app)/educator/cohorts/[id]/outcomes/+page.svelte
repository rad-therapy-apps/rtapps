<!--
	What this file does: Outcomes page at `(app)/educator/cohorts/[id]/outcomes`. Shows the
	cohort's per-outcome mastery table, each row expandable via `<details>` to a per-student
	breakdown, plus a CSV download link.

	Used here and why: `resolve()` for the back-to-cohort link, per
	`svelte/no-navigation-without-resolve`; the CSV link is a plain same-origin `<a>` to an API URL
	(the session cookie rides along), not a SvelteKit route, so it's exempted from that rule the
	same way `ProseInline.svelte`'s external content link is; Svelte 5 runes (`$props()`).

	How it fits the project: `data.mastery` comes from this route's `load`
	(`GET cohorts/{id}/outcomes`) (plan 3a Task 15).

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
	<title>Outcomes — RTApps</title>
</svelte:head>

<h1>Outcomes</h1>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- API URL (CSV download), not a SvelteKit route -->
<a href={`/api/v1/cohorts/${data.cohortId}/outcomes.csv`} data-testid="csv-link">Download CSV</a>

<table>
	<thead>
		<tr>
			<th>Code</th>
			<th>Title</th>
			<th>Questions</th>
			<th>Answered</th>
			<th>% Correct</th>
			<th>Below threshold</th>
			<th>Students</th>
		</tr>
	</thead>
	<tbody>
		{#each data.mastery.outcomes as o (o.code)}
			<tr>
				<td>{o.code}</td>
				<td>{o.title}</td>
				<td>{o.questions}</td>
				<td>{o.answered}</td>
				<td>{formatPercent(o.percent_correct)}</td>
				<td>{o.students_below_threshold}</td>
				<td>
					<details>
						<summary>{o.students.length} students</summary>
						<table>
							<thead>
								<tr>
									<th>Student</th>
									<th>Answered</th>
									<th>% Correct</th>
								</tr>
							</thead>
							<tbody>
								{#each o.students as s (s.user_id)}
									<tr>
										<td>{s.display_name}</td>
										<td>{s.answered}</td>
										<td>{formatPercent(s.percent_correct)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</details>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<p>
	<a href={resolve('/(app)/educator/cohorts/[id]', { id: data.cohortId })}>Back to cohort</a>
</p>
