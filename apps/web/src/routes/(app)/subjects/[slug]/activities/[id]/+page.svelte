<!--
	What this file does: Activity page at `(app)/subjects/[slug]/activities/[id]`. Dispatches to
	the player matching the activity's kind.
	Used here and why: Svelte 5 runes (`$props()`); `activitySnapshot()` casts the opaque
	`snapshot` JSON to its typed shape, and branching on `snapshot.activity.kind` (rather than
	`data.activity.kind`) lets TypeScript narrow `ActivitySnapshot` to the exact variant each
	player expects. The `calculator` branch (plan 3b Task 17) looks up
	`$lib/calc/registry`[`calc_type`] instead of importing one fixed player, since which
	calculator component a given activity needs isn't known until the snapshot is read; an
	unrecognized `calc_type` renders a plain "not supported yet" message rather than crashing.
	Unlike the other four kinds, no attempt is ever started here: a calculator has no
	attempt/grade/submit lifecycle (Task 11's 409 guard is the API-side backstop), and
	`MuCalculator.svelte` — like every registry entry — never calls `startAttempt`.
	How it fits the project: `data.activity` comes from this route's `load`
	(`GET /activities/{id}`, answers stripped per ADR-0006). `docs/03-architecture.md` §4.4, plan
	3a Task 14/15, plan 3b Task 17.
	Works with: `$lib/activity/QuizPlayer.svelte`, `$lib/activity/FlashcardPlayer.svelte`,
	`$lib/activity/MatchingPlayer.svelte`, `$lib/activity/SequencingPlayer.svelte`,
	`$lib/activity/ExternalPlayer.svelte`, `$lib/calc/registry`, `$lib/activity/types`
	(`activitySnapshot`). Used by: reached from `(app)/subjects/[slug]/+page.svelte`.
-->
<script lang="ts">
	import QuizPlayer from '$lib/activity/QuizPlayer.svelte';
	import FlashcardPlayer from '$lib/activity/FlashcardPlayer.svelte';
	import MatchingPlayer from '$lib/activity/MatchingPlayer.svelte';
	import SequencingPlayer from '$lib/activity/SequencingPlayer.svelte';
	import ExternalPlayer from '$lib/activity/ExternalPlayer.svelte';
	import { registry } from '$lib/calc/registry';
	import { activitySnapshot } from '$lib/activity/types';
	import type {
		QuizSnapshot,
		FlashcardsSnapshot,
		MatchingSnapshot,
		SequencingSnapshot,
		CalculatorSnapshot,
		ExternalSnapshot
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
	{:else if snapshot.activity.kind === 'calculator'}
		<!-- No player import here: which component to render depends on `calc_type`, looked up in
			 the registry below. No attempt is started for calculators (Task 11's 409 guard is the
			 API-side backstop) — this branch simply never calls startAttempt. -->
		{@const calc = (snapshot as CalculatorSnapshot).calculator}
		{@const CalcComponent = registry[calc.calc_type]}
		{#if CalcComponent}
			<CalcComponent tables={calc.data_tables} />
		{:else}
			<p>this calculator isn't supported yet</p>
		{/if}
	{:else if snapshot.activity.kind === 'external'}
		<ExternalPlayer
			activityId={data.activity.activity_id}
			snapshot={snapshot as ExternalSnapshot}
		/>
	{/if}
{/key}
