<!--
	What this file does: Cohort overview page at `(app)/educator/cohorts/[id]`. Shows the join
	code, a threshold-percent setting, per-activity analytics (each with a link to its stats page),
	the student roster, and header links to the outcomes page and the overview CSV download.

	Used here and why: `use:enhance` on the rotate/threshold/remove forms for progressive
	enhancement; `resolve()` for the student-detail/activity-stats/outcomes links, per
	`svelte/no-navigation-without-resolve`; the CSV link is a plain same-origin `<a>` to an API URL
	(the session cookie rides along), not a SvelteKit route, so it's exempted from that rule the
	same way `ProseInline.svelte`'s external content link is; Svelte 5 runes (`$props()`).

	How it fits the project: `data.overview`/`data.members` come from this route's `load`
	(`GET cohorts/{id}/overview`, `GET cohorts/{id}/members`); rows below the below-threshold
	percent get the `below` css class via `belowThresholdClass` (FR-E-02, FR-E-03). The stats/
	outcomes links are plan 3a Task 15.

	Works with: `$app/forms`, `$app/paths`, `$lib/cohort/format` (`formatPercent`,
	`belowThresholdClass`). Used by: reached from `(app)/educator/+page.svelte`; links into
	`(app)/educator/cohorts/[id]/students/[uid]`,
	`(app)/educator/cohorts/[id]/activities/[aid]`, `(app)/educator/cohorts/[id]/outcomes`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { belowThresholdClass, formatPercent } from '$lib/cohort/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Joined-at comes from the separate members fetch; merged in here by user id for the roster table.
	function joinedAt(userId: string): string {
		return data.members.find((m) => m.user_id === userId)?.joined_at ?? '—';
	}
</script>

<svelte:head>
	<title>{data.overview.cohort.name} — RTApps</title>
</svelte:head>

<h1>{data.overview.cohort.name}</h1>

<!-- Server-rendered error from the last failed rotate/threshold/remove action. -->
{#if form?.error}
	<p role="alert">{form.error}</p>
{/if}

<!-- Join code panel: the code students enter to join, plus a form to rotate it. -->
<p>Join code: <code data-testid="join-code">{data.overview.cohort.join_code}</code></p>
<form method="POST" action="?/rotate" use:enhance>
	<button>Rotate code</button>
</form>

<!-- Below-threshold percent: the cutoff used to flag activities/students below it. -->
<form method="POST" action="?/threshold" use:enhance>
	<label for="threshold_percent">Below-threshold mark (%)</label>
	<input
		id="threshold_percent"
		name="threshold_percent"
		type="number"
		min="0"
		max="100"
		value={data.overview.cohort.threshold_percent}
	/>
	<button>Save</button>
</form>

<!-- Cohort-wide analytics links: outcomes mastery and the overview CSV download. -->
<p>
	<a href={resolve('/(app)/educator/cohorts/[id]/outcomes', { id: data.overview.cohort.id })}
		>Outcomes</a
	>
	·
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- API URL (CSV download), not a SvelteKit route -->
	<a href={`/api/v1/cohorts/${data.overview.cohort.id}/overview.csv`}>Download CSV</a>
</p>

<h2>Activities</h2>
<table>
	<thead>
		<tr>
			<th>Activity</th>
			<th>Attempted</th>
			<th>Passed</th>
			<th>Mean best</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.overview.activities as a (a.activity_id)}
			<tr class={belowThresholdClass(a.below_threshold)}>
				<td>{a.title}</td>
				<td>{a.attempted}</td>
				<td>{a.passed}</td>
				<td>{formatPercent(a.mean_best_percent)}</td>
				<td>
					<a
						href={resolve('/(app)/educator/cohorts/[id]/activities/[aid]', {
							id: data.overview.cohort.id,
							aid: a.activity_id
						})}>Stats</a
					>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<h2>Students</h2>
<table>
	<thead>
		<tr>
			<th>Student</th>
			<th>Email</th>
			<th>Joined</th>
			<th>Attempted</th>
			<th>Passed</th>
			<th>Mean best</th>
			<th>Last activity</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.overview.students as s (s.user_id)}
			<tr class={belowThresholdClass(s.below_threshold)}>
				<td>
					<a
						href={resolve('/(app)/educator/cohorts/[id]/students/[uid]', {
							id: data.overview.cohort.id,
							uid: s.user_id
						})}
					>
						{s.display_name}
					</a>
				</td>
				<td>{s.email}</td>
				<td>{joinedAt(s.user_id)}</td>
				<td>{s.attempted}</td>
				<td>{s.passed}</td>
				<td>{formatPercent(s.mean_best_percent)}</td>
				<td>{s.last_activity_at ?? '—'}</td>
				<td>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="user_id" value={s.user_id} />
						<button>Remove</button>
					</form>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	/* Highlights an activity/student row below the cohort's threshold percent. */
	tr.below {
		background: var(--danger-bg);
	}
</style>
