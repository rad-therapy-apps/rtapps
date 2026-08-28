<script lang="ts">
	import LessonPager from '$lib/lesson/LessonPager.svelte';
	import { lessonSnapshot } from '$lib/lesson/snapshot';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const snapshot = lessonSnapshot(data.lesson);
</script>

<svelte:head>
	<title>{snapshot.lesson.title} — RTApps</title>
</svelte:head>

<LessonPager lesson={data.lesson} attempt={data.attempt} />
