<!--
	What this file does: the external (arcade game) player — starts an attempt, embeds the game
	behind an iframe pointed at its served path, and listens for the arcade shim's one-time
	`postMessage` result to submit as the final score.
	Used here and why: Svelte 5 runes ($props for activityId/snapshot/post, $state for the
	started attempt id/status/percent/error/the retry-held reported score); `post` defaults to the
	real `openapi-fetch` client (`api.POST`) but is overridable so specs can inject a fake,
	matching `QuizPlayer.svelte`'s pattern. Unlike the other players, no per-item grading happens
	here — the game itself is the practice surface, and the only server round trips are start and
	submit. `reportedScore` doubles as the once-only latch (a result message is only accepted
	while it is null and the game is still `playing`) and as what a Retry click resubmits after a
	failed submit.
	How it fits the project: plan 4a's external-activity flow — Task 3's `/arcade/<slug>/` serves
	the game behind auth, Task 4's shim posts `{type:"rtapps:result", score, max}` to this page
	once, and this component submits that `score` (never a denominator — the server clamps
	against the pinned snapshot's max_score, see `attempts.ts`'s `submitExternalAttempt`). No
	pass/fail badge is shown: 4a treats games as practice, not assessment.
	Depends on: `$lib/lesson/api` (`api.POST`), `./attempts` (`startAttempt`/
	`submitExternalAttempt`), `./types` (`ExternalSnapshot`).
	Used by: `(app)/subjects/[slug]/activities/[id]/+page.svelte`, `ExternalPlayer.svelte.spec.ts`.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/lesson/api';
	import { startAttempt, submitExternalAttempt, type PostFn } from '$lib/activity/attempts';
	import type { ExternalSnapshot } from '$lib/activity/types';

	let {
		activityId,
		snapshot,
		post = api.POST
	}: { activityId: string; snapshot: ExternalSnapshot; post?: PostFn } = $props();

	let attemptId = $state<string | null>(null);
	let status = $state<'loading' | 'playing' | 'submitting' | 'done' | 'error'>('loading');
	let percent = $state<number | null>(null);
	let errorMessage = $state('');
	// The score held for retry after a failed submit; also the once-only latch (a result
	// message is only accepted while it is null and status is 'playing').
	let reportedScore = $state<number | null>(null);

	onMount(async () => {
		try {
			const attempt = await startAttempt(post, activityId);
			attemptId = attempt.id;
			status = 'playing';
		} catch (event) {
			errorMessage = event instanceof Error ? event.message : 'Could not start the activity';
			status = 'error';
		}
	});

	async function submitScore(score: number) {
		if (attemptId === null) return;
		status = 'submitting';
		try {
			const result = await submitExternalAttempt(post, attemptId, score);
			percent = result.percent;
			status = 'done';
		} catch (event) {
			errorMessage = event instanceof Error ? event.message : 'Submit failed';
			status = 'error';
		}
	}

	function onMessage(event: MessageEvent) {
		// Same-origin, right shape, numeric score, once, and only while the game is running.
		if (event.origin !== window.location.origin) return;
		const data = event.data as { type?: string; score?: unknown };
		if (data?.type !== 'rtapps:result') return;
		// Contract: score must arrive as a finite number — no coercion of strings/null/booleans
		// (Number() would turn null into 0 and "1200" into 1200; both must be ignored).
		const score = data.score;
		if (typeof score !== 'number' || !Number.isFinite(score)) return;
		if (reportedScore !== null || status !== 'playing') return;
		reportedScore = score;
		void submitScore(score);
	}
</script>

<svelte:window onmessage={onMessage} />

<header class="player-bar">
	<h1>{snapshot.activity.title}</h1>
</header>

{#if status === 'error'}
	<p role="alert">{errorMessage}</p>
	{#if reportedScore !== null}
		<button onclick={() => void submitScore(reportedScore as number)}>Retry</button>
	{/if}
{:else if status === 'done'}
	<section aria-label="result">
		<p>Score recorded: {percent}%</p>
		<!-- Practice semantics: no pass/fail badge for games in 4a. -->
	</section>
{:else}
	<!-- #52: src is the explicit /index.html, never the bare directory URL — SvelteKit
	     308-strips a trailing slash regardless of route trailingSlash options (verified
	     empirically), and a stripped URL breaks relative script/style refs in multi-file
	     games. -->
	<iframe
		src={`/arcade/${snapshot.external.arcade_slug}/index.html`}
		title={snapshot.activity.title}
		class="arcade-frame"
	></iframe>
	{#if status === 'submitting'}<p>Saving your score…</p>{/if}
{/if}

<style>
	.arcade-frame {
		width: 100%;
		height: calc(100vh - 6rem);
		border: 0;
	}
	.player-bar h1 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
	}
</style>
