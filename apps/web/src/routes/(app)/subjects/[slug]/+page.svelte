<!--
	What this file does: Subject detail page at `(app)/subjects/[slug]`. Shows the subject's
	summary and links to each of its lessons.

	Used here and why: `resolve()` with route params to build each lesson's `[slug]` href, per
	`svelte/no-navigation-without-resolve`; Svelte 5 runes (`$props()`).

	How it fits the project: `data.subject` comes from this route's `load`
	(`GET /subjects/{slug}`); each lesson link leads to `(app)/lessons/[slug]`.
	`docs/03-architecture.md` §4.3.

	Works with: `$app/paths`. Used by: reached from `(app)/subjects/+page.svelte`; driven by
	`apps/web/e2e/lesson.e2e.ts`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
