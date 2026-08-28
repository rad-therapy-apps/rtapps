<script lang="ts">
	import LessonPager from '$lib/lesson/LessonPager.svelte';
	import type { LessonSnapshot } from '$lib/lesson/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const snapshot = data.lesson.snapshot as unknown as LessonSnapshot;
</script>

<svelte:head>
	<title>{snapshot.lesson.title} — RTApps</title>
</svelte:head>

<LessonPager lesson={data.lesson} attempt={data.attempt} />
