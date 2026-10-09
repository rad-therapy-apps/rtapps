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
	import Card from '$lib/ui/Card.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.detail.student.display_name} — RTTLearn</title>
</svelte:head>

<PageHeader title={data.detail.student.display_name} />
<p>{data.detail.student.email} · joined {data.detail.student.joined_at}</p>

<h2>Results</h2>
{#if data.detail.results.length === 0}
	<Card><p class="muted">No attempts yet.</p></Card>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="table-wrap" role="region" aria-label="Results" tabindex="0">
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
						<td class="num">{formatPercent(r.best_percent)}</td>
						<td class="num">{formatPercent(r.latest_percent)}</td>
						<td class="num">{r.attempts}</td>
						<td>{r.mastery}</td>
						<td>{Math.round(r.time_spent_s / 60)} min</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<h2>Attempts</h2>
<!-- One <details> per attempt, open by default, with its items in a nested table. -->
{#if data.detail.attempts.length === 0}
	<Card><p class="muted">No attempts yet.</p></Card>
{/if}
{#each data.detail.attempts as a (a.attempt_id)}
	<details open>
		<summary>{a.title} — {formatPercent(a.percent)} — {a.submitted_at}</summary>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="table-wrap" role="region" aria-label="{a.title} responses" tabindex="0">
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
							<td class="response">{JSON.stringify(i.response)}</td>
							<td>{i.correct ? 'Yes' : 'No'}</td>
							<td class="num">{i.score ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
{/each}

<p>
	<a href={resolve('/(app)/educator/cohorts/[id]', { id: data.cohortId })}>Back to cohort</a>
</p>

<style>
	.muted {
		margin: 0;
		color: var(--text-muted);
	}

	.table-wrap {
		overflow-x: auto;
	}
	.response {
		overflow-wrap: anywhere;
	}
	.num {
		font-variant-numeric: tabular-nums;
	}
</style>
