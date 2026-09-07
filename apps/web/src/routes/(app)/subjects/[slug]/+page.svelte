<!--
	What this file does: Subject detail page at `(app)/subjects/[slug]`. Shows the subject's
	summary, links to each of its lessons, links to its practice activities grouped by kind, and the Games + Simulator shelf.

	Used here and why: `resolve()` with route params to build each lesson/activity href, per
	`svelte/no-navigation-without-resolve`; Svelte 5 runes (`$props()`, `$derived()` for grouping
	`data.subject.activities` by kind so an empty group renders no section at all).

	How it fits the project: `data.subject` comes from this route's `load`
	(`GET /subjects/{slug}`); each lesson link leads to `(app)/lessons/[slug]`, each activity link
	to `(app)/subjects/[slug]/activities/[id]` (plan 3a Task 14). `docs/03-architecture.md` §4.3/§4.4.

	Works with: `$app/paths`. Used by: reached from `(app)/subjects/+page.svelte`; driven by
	`apps/web/e2e/lesson.e2e.ts`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Display label per activity kind, also fixing the section order below.
	const kindLabels: Record<string, string> = {
		quiz: 'Quizzes',
		flashcards: 'Flashcards',
		matching: 'Matching',
		sequencing: 'Sequencing',
		calculator: 'Calculators',
		external: 'Games'
	};
	// One group per kind that has at least one activity; a kind with none renders no section.
	const activityGroups = $derived(
		Object.entries(kindLabels)
			.map(([kind, label]) => ({
				label,
				activities: data.subject.activities.filter((activity) => activity.kind === kind)
			}))
			.filter((group) => group.activities.length > 0)
	);
</script>

<svelte:head>
	<title>{data.subject.title} — RTApps</title>
</svelte:head>

<h1>{data.subject.title}</h1>
<!-- Summary is optional content on the subject; omit the paragraph when absent. -->
{#if data.subject.summary}
	<p>{data.subject.summary}</p>
{/if}
<ul>
	{#each data.subject.lessons as lesson (lesson.slug)}
		<li>
			<a href={resolve('/(app)/lessons/[slug]', { slug: lesson.slug })}>{lesson.title}</a>
		</li>
	{/each}
</ul>

<!-- One labeled section per non-empty activity kind, in kindLabels' fixed order. -->
{#each activityGroups as group (group.label)}
	<h2>{group.label}</h2>
	<ul>
		{#each group.activities as activity (activity.id)}
			<li>
				<a
					href={resolve('/(app)/subjects/[slug]/activities/[id]', {
						slug: data.subject.slug,
						id: activity.id
					})}
				>
					{activity.title}
				</a>
			</li>
		{/each}
	</ul>
{/each}

<!-- Phase-4 shelf (plan 4a): the Simulator section's entry is a placeholder until plan 4c
     replaces it with the real simulator application entry. Static on every subject page. -->
<h2>Simulator</h2>
<button disabled title="The RT simulator arrives in a future update"
	>Enter the simulator — coming soon</button
>
