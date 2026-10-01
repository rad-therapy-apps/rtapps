<!--
	What this file does: Subjects index page at `(app)/subjects`. Lists every published subject
	with its lesson and activity counts, linking into each subject's detail page.

	Used here and why: `resolve()` with a route-params object (`{ slug }`) to build the dynamic
	`[slug]` href, per the `svelte/no-navigation-without-resolve` rule; Svelte 5 runes
	(`$props()`).

	How it fits the project: `data.subjects` comes from this route's `load` (`GET /subjects`);
	each link leads to `(app)/subjects/[slug]`. `docs/03-architecture.md` §4.3.

	Works with: `$app/paths`. Used by: linked from `+layout.svelte` and `(app)/home/+page.svelte`;
	driven by `apps/web/e2e/lesson.e2e.ts`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Subjects — RTTLearn</title>
</svelte:head>

<h1>Subjects</h1>
<ul>
	{#each data.subjects as subject (subject.slug)}
		<li>
			<a href={resolve('/(app)/subjects/[slug]', { slug: subject.slug })}>{subject.title}</a>
			({subject.lesson_count} lessons, {subject.activity_count} activities)
		</li>
	{/each}
</ul>
