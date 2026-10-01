<!--
	What this file does: Lesson page at `(app)/lessons/[slug]`. Sets the page title from the
	lesson snapshot and hands the lesson/attempt off to `LessonPager` for the actual reading and
	grading UI.

	Used here and why: Svelte 5 runes (`$props()`); the browser-side grading and paging logic
	lives entirely in `$lib/lesson/LessonPager.svelte` (which uses `$lib/lesson/api` to call the
	API directly from the client) — this file only supplies server-fetched `data` to it.

	How it fits the project: `data.lesson`/`data.attempt` come from this route's `load`, which
	already started the attempt server-side; from here on, grading each knowledge check and the
	final submit happen client-side over the same session cookie (ADR-0002, ADR-0004).
	`docs/03-architecture.md` §4.3–4.4.

	Works with: `$lib/lesson/LessonPager.svelte`, `$lib/lesson/snapshot` (`lessonSnapshot`). Used
	by: reached from `(app)/subjects/[slug]/+page.svelte`; driven end-to-end by
	`apps/web/e2e/lesson.e2e.ts`.
-->
<script lang="ts">
	import LessonPager from '$lib/lesson/LessonPager.svelte';
	import { lessonSnapshot } from '$lib/lesson/snapshot';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// The API types `LessonOut.snapshot` as an opaque object (it's untyped JSON to the schema);
	// lessonSnapshot() casts it to the actual lesson content shape this page renders.
	const snapshot = lessonSnapshot(data.lesson);
</script>

<svelte:head>
	<title>{snapshot.lesson.title} — RTTLearn</title>
</svelte:head>

<LessonPager lesson={data.lesson} attempt={data.attempt} />
