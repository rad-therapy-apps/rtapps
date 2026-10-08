<!--
	What this file does: Subject detail page at `(app)/subjects/[slug]`. Shows the subject's
	summary, links to each of its lessons, and links to its practice activities grouped by kind
	(including the Games shelf). The simulators have their own page, `(app)/simulator`.

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
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
	import Card from '$lib/ui/Card.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import SubjectTag from '$lib/ui/SubjectTag.svelte';
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
				kind,
				label,
				activities: data.subject.activities.filter((activity) => activity.kind === kind)
			}))
			.filter((group) => group.activities.length > 0)
	);
</script>

<svelte:head>
	<title>{data.subject.title} — RTTLearn</title>
</svelte:head>

<PageHeader title={data.subject.title} subtitle={data.subject.summary ?? undefined}>
	{#snippet actions()}
		<SubjectTag slug={data.subject.slug} label={data.subject.title} />
	{/snippet}
</PageHeader>
<ul class="rows lessons">
	{#each data.subject.lessons as lesson (lesson.slug)}
		<li>
			<Icon icon={BookOpen} />
			<a href={resolve('/(app)/lessons/[slug]', { slug: lesson.slug })}>{lesson.title}</a>
		</li>
	{/each}
</ul>

<!-- One labeled section per non-empty activity kind, in kindLabels' fixed order. -->
<div class="sections">
	{#each activityGroups as group (group.label)}
		<Card as="section">
			<h2>
				{#if group.kind === 'external'}<Icon icon={Gamepad2} size={22} />{/if}{group.label}
			</h2>
			<ul class="rows">
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
		</Card>
	{/each}
</div>

<style>
	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.lessons {
		margin-bottom: var(--space-5);
	}
	.rows li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border);
	}
	.rows li:last-child {
		border-bottom: 0;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: 0;
		font-size: var(--text-lg);
	}
	.sections {
		display: grid;
		gap: var(--space-4);
	}
</style>
