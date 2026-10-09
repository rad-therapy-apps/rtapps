<!--
	What this file does: Subjects index page at `(app)/subjects`. Lists every published subject
	with its lesson and activity counts, linking into each subject's detail page.

	Used here and why: `resolve()` with a route-params object (`{ slug }`) to build the dynamic
	`[slug]` href, per the `svelte/no-navigation-without-resolve` rule; Svelte 5 runes
	(`$props()`).

	How it fits the project: `data.subjects` comes from this route's `load` (`GET /subjects`);
	each link leads to `(app)/subjects/[slug]`. `docs/03-architecture.md` §4.3.

	Works with: `$app/paths`, `$lib/ui/*`. Used by: linked from `+layout.svelte` and `(app)/home/+page.svelte`;
	driven by `apps/web/e2e/lesson.e2e.ts`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/ui/Card.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import SubjectTag from '$lib/ui/SubjectTag.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Subjects — RTTLearn</title>
</svelte:head>

<PageHeader title="Subjects" />
<ul class="grid">
	{#each data.subjects as subject (subject.slug)}
		<Card as="li">
			<SubjectTag slug={subject.slug} label={subject.title} decorative />
			<h2>
				<a href={resolve('/(app)/subjects/[slug]', { slug: subject.slug })}>{subject.title}</a>
			</h2>
			<p>({subject.lesson_count} lessons, {subject.activity_count} activities)</p>
		</Card>
	{/each}
</ul>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	h2 {
		margin: var(--space-3) 0 var(--space-1);
		font-size: var(--text-lg);
	}
	p {
		margin: 0;
		color: var(--text-muted);
	}
</style>
