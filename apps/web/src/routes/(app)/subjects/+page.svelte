<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Subjects — RTApps</title>
</svelte:head>

<h1>Subjects</h1>
<ul>
	{#each data.subjects as subject (subject.slug)}
		<li>
			<a href={resolve('/(app)/subjects/[slug]', { slug: subject.slug })}>{subject.title}</a>
			({subject.lesson_count} lessons)
		</li>
	{/each}
</ul>
