<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.subject.title} — RTApps</title>
</svelte:head>

<h1>{data.subject.title}</h1>
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
