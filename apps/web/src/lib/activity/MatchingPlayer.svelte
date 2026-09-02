<!--
	What this file does: the matching player — presents a matching snapshot's terms (stored order)
	and the server's alphabetically-ordered definitions as two clickable columns; selecting a term
	then a definition immediately grades that pairing, and re-pairing an already-graded term is
	allowed until the attempt is submitted.
	Used here and why: Svelte 5 runes ($props for activityId/snapshot/post, $state for the resumed
	attempt id/selected term/per-term answers/result/busy); click-based pairing (no drag) per plan
	3a Task 15's Global Constraints; `post` defaults to the real `openapi-fetch` client (`api.POST`)
	but is overridable so specs can inject a fake, matching `QuizPlayer.svelte`'s pattern. A
	definition's position in `matching.definitions` (the server's alphabetical order) is the grading
	choice — `./types`'s `MatchingSnapshot` documents this.
	How it fits the project: generalizes ADR-0004's attempt flow to matching (plan 3a Task 15) —
	each term/definition pairing grades immediately, and "Check results" submits for a final score.
	See `docs/03-architecture.md` §4.4.
	Depends on: `$lib/lesson/api` (`api.POST`), `./attempts` (`startAttempt`/`gradeItem`/
	`submitAttempt`), `./types` (`MatchingSnapshot`).
	Used by: `(app)/subjects/[slug]/activities/[id]/+page.svelte`, `MatchingPlayer.svelte.spec.ts`.
-->
<script lang="ts">
	import { api } from '$lib/lesson/api';
	import { gradeItem, startAttempt, submitAttempt } from './attempts';
	import type { MatchingSnapshot } from './types';

	// `activityId` scopes attempt start/resume; `snapshot` is this matching set's stripped content;
	// `post` defaults to the real API client but is overridable so specs can inject a fake.
	let {
		activityId,
		snapshot,
		post = api.POST
	}: {
		activityId: string;
		snapshot: MatchingSnapshot;
		post?: typeof api.POST;
	} = $props();

	const terms = $derived(snapshot.matching.terms);
	const definitions = $derived(snapshot.matching.definitions);
	// The in-progress (or resumed) attempt's id; null until startAttempt resolves.
	let attemptId = $state<string | null>(null);
	// The term key currently selected (awaiting a definition click to pair it), or null.
	let selectedTermKey = $state<string | null>(null);
	// term_key -> {choice, correct}: the definition index paired with each term and its grade.
	// Re-pairing a term overwrites its entry here (upsert), which is what "Check results" counts.
	let answers = $state<Record<string, { choice: number; correct: boolean | null }>>({});
	// Set once the attempt is submitted; presence switches the UI to the score summary.
	let result = $state<{ percent: number | null; passed: boolean | null } | null>(null);
	// True while a grade/submit request is in flight, to disable pairing against double-submits.
	let busy = $state(false);
	// User-facing message when a start/grade/submit request fails; cleared at the start of each attempt.
	let error = $state<string | undefined>(undefined);

	// Start (or resume) the attempt once; a resumed attempt's saved items re-mark their terms.
	$effect(() => {
		startAttempt(post, activityId)
			.then((attempt) => {
				attemptId = attempt.id;
				for (const item of attempt.items) {
					answers[item.item_key] = { choice: item.response.choice, correct: item.correct };
				}
			})
			.catch(() => {
				error = 'Request failed. Try again.';
			});
	});

	// Selects a term to pair next; re-selecting an already-answered term is allowed (upsert below).
	function selectTerm(key: string) {
		if (busy) return;
		selectedTermKey = key;
	}

	// Pairs the selected term with a definition and grades it immediately.
	async function pair(definitionIndex: number) {
		if (!attemptId || !selectedTermKey || busy) return;
		const termKey = selectedTermKey;
		busy = true;
		error = undefined;
		try {
			const grade = await gradeItem(post, attemptId, termKey, definitionIndex);
			answers[termKey] = { choice: definitionIndex, correct: grade.correct };
			selectedTermKey = null;
		} catch {
			error = 'Request failed. Try again.';
		} finally {
			busy = false;
		}
	}

	// Submits the attempt for final scoring.
	async function finish() {
		if (!attemptId || busy) return;
		busy = true;
		error = undefined;
		try {
			const submitted = await submitAttempt(post, attemptId);
			result = { percent: submitted.percent, passed: submitted.passed };
		} catch {
			error = 'Request failed. Try again.';
		} finally {
			busy = false;
		}
	}

	// Every current term has an answer, gating the "Check results" button; a count comparison would
	// let a resumed attempt's stale key (from a since-edited term list) satisfy the gate early.
	const allPaired = $derived(terms.every((t) => t.key in answers));
</script>

{#if result}
	<section aria-live="polite" data-testid="matching-result">
		{#if result.passed}
			<p class="badge" data-testid="matching-badge">🏅 Badge earned!</p>
		{/if}
		<p>Score: {result.percent ?? 0}%</p>
	</section>
{:else}
	<div class="columns">
		<ul data-testid="matching-terms">
			<!-- Terms keyed by their stable `key`, in stored (snapshot) order. -->
			{#each terms as t (t.key)}
				<li>
					<button
						type="button"
						aria-pressed={selectedTermKey === t.key}
						disabled={busy}
						onclick={() => selectTerm(t.key)}
					>
						{t.term}
					</button>
					{#if answers[t.key]}
						<span data-testid={`match-feedback-${t.key}`}>{answers[t.key].correct ? '✓' : '✗'}</span
						>
					{/if}
				</li>
			{/each}
		</ul>
		<ul data-testid="matching-definitions">
			<!-- Definitions have no id of their own; their position is the grading choice, so `i`
				 doubles as the each-block key (the list itself is static per snapshot). -->
			{#each definitions as definition, i (i)}
				<li>
					<button type="button" disabled={busy} onclick={() => pair(i)}>{definition}</button>
				</li>
			{/each}
		</ul>
	</div>
	<!-- Start/grade/submit request failed: surfaced as polite live-region text so screen readers
		 announce it without stealing focus; cleared at the start of every attempt. -->
	{#if error}
		<p aria-live="polite" data-testid="player-error">{error}</p>
	{/if}
	<button type="button" disabled={!allPaired || busy} onclick={finish}>Check results</button>
{/if}

<style>
	/* Lays the terms/definitions columns out side by side. */
	.columns {
		display: flex;
		gap: 2rem;
	}
	/* Draws attention to a passed badge without relying on color alone (the emoji carries it). */
	.badge {
		font-weight: bold;
	}
</style>
