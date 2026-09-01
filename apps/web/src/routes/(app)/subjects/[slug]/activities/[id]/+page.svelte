<!--
	What this file does: Activity page at `(app)/subjects/[slug]/activities/[id]`. Dispatches to
	the player matching the activity's kind.
	Used here and why: Svelte 5 runes (`$props()`); `activitySnapshot()` casts the opaque
	`snapshot` JSON to its typed shape, and branching on `snapshot.activity.kind` (rather than
	`data.activity.kind`) lets TypeScript narrow `ActivitySnapshot` to the exact variant each
	player expects.
	How it fits the project: `data.activity` comes from this route's `load`
	(`GET /activities/{id}`, answers stripped per ADR-0006). `docs/03-architecture.md` §4.4, plan
	3a Task 14/15.
	Works with: `$lib/activity/QuizPlayer.svelte`, `$lib/activity/FlashcardPlayer.svelte`,
	`$lib/activity/MatchingPlayer.svelte`, `$lib/activity/SequencingPlayer.svelte`,
	`$lib/activity/types` (`activitySnapshot`). Used by: reached from
	`(app)/subjects/[slug]/+page.svelte`.
-->
<script lang="ts">
	import QuizPlayer from '$lib/activity/QuizPlayer.svelte';
	import FlashcardPlayer from '$lib/activity/FlashcardPlayer.svelte';
	import MatchingPlayer from '$lib/activity/MatchingPlayer.svelte';
	import SequencingPlayer from '$lib/activity/SequencingPlayer.svelte';
	import { activitySnapshot } from '$lib/activity/types';
	import type {
		QuizSnapshot,
		FlashcardsSnapshot,
		MatchingSnapshot,
		SequencingSnapshot
	} from '$lib/activity/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// The API types `ActivityOut.snapshot` as an opaque object (it's untyped JSON to the schema);
	// activitySnapshot() casts it to the actual activity content shape this page renders.
	const snapshot = $derived(activitySnapshot(data.activity.snapshot));
</script>

<svelte:head>
	<title>{snapshot.activity.title} — RTApps</title>
</svelte:head>

<!-- Keying on the activity id forces the player to be destroyed and recreated when client-side
	 navigation moves from one activity to another, so a previous activity's in-progress state
	 (index, answers, busy) never bleeds into the next one; mirrors `{#key pageIndex}` in
	 `LessonPager.svelte`. -->
{#key data.activity.activity_id}
	{#if snapshot.activity.kind === 'quiz'}
		<!-- svelte-check doesn't carry the `snapshot.activity.kind` narrowing above across the
			 component-prop boundary, so the discriminated union is cast explicitly here; the check
			 above is what actually guarantees the shape at runtime. -->
		<QuizPlayer activityId={data.activity.activity_id} snapshot={snapshot as QuizSnapshot} />
	{:else if snapshot.activity.kind === 'flashcards'}
		<FlashcardPlayer
			activityId={data.activity.activity_id}
			snapshot={snapshot as FlashcardsSnapshot}
		/>
	{:else if snapshot.activity.kind === 'matching'}
		<MatchingPlayer
			activityId={data.activity.activity_id}
			snapshot={snapshot as MatchingSnapshot}
		/>
	{:else if snapshot.activity.kind === 'sequencing'}
		<SequencingPlayer
			activityId={data.activity.activity_id}
			snapshot={snapshot as SequencingSnapshot}
		/>
	{/if}
{/key}
