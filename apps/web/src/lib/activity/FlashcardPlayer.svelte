<!--
	What this file does: the flashcard player — walks a deck's cards one at a time (front shows
	the term, Flip reveals the definition), then starts and immediately submits an attempt once
	the student finishes the deck.
	Used here and why: Svelte 5 runes ($props for activityId/snapshot/post, $state for the current
	index/flipped/done/busy); `post` defaults to the real `openapi-fetch` client (`api.POST`) but
	is overridable so specs can inject a fake, matching `KnowledgeCheck.svelte`'s pattern.
	Flashcards have no gradeable items (`gradeable_items` returns `{}` for this kind in
	`app.content.activity_snapshots`), so unlike `QuizPlayer.svelte` there is nothing to resume or
	grade per-card — the attempt only exists to record completion.
	How it fits the project: generalizes ADR-0004's attempt flow from lessons to flashcards (plan
	3a Task 14) — start and submit both happen client-side over the session cookie (ADR-0002),
	deferred until the student reaches the end of the deck. See `docs/03-architecture.md` §4.4.
	Depends on: `$lib/lesson/api` (`api.POST`), `./attempts` (`startAttempt`/`submitAttempt`),
	`./types` (`FlashcardsSnapshot`).
	Used by: `(app)/subjects/[slug]/activities/[id]/+page.svelte`.
-->
<script lang="ts">
	import { api } from '$lib/lesson/api';
	import { startAttempt, submitAttempt } from './attempts';
	import type { FlashcardsSnapshot } from './types';

	// `activityId` scopes the completion attempt; `snapshot` is this deck's stripped content;
	// `post` defaults to the real API client but is overridable so specs can inject a fake.
	let {
		activityId,
		snapshot,
		post = api.POST
	}: {
		activityId: string;
		snapshot: FlashcardsSnapshot;
		post?: typeof api.POST;
	} = $props();

	const cards = $derived(snapshot.flashcards.cards);
	// Index of the card currently shown.
	let index = $state(0);
	// Whether the current card shows its definition (flipped) or its term (front).
	let flipped = $state(false);
	// Set once the completion attempt is submitted; presence switches the UI to "Deck complete".
	let done = $state(false);
	// True while the finish request is in flight, to disable the button against double-submits.
	let busy = $state(false);

	// Whether the current card is the deck's last, gating Next vs. the Finish button.
	const isLastCard = $derived(index === cards.length - 1);

	// Moves to the previous card, reset to its front.
	function previous() {
		if (index === 0) return;
		index -= 1;
		flipped = false;
	}

	// Moves to the next card, reset to its front.
	function next() {
		if (isLastCard) return;
		index += 1;
		flipped = false;
	}

	// Toggles between the current card's term and definition.
	function flip() {
		flipped = !flipped;
	}

	// Starts a completion attempt and submits it immediately (flashcards have nothing to grade).
	async function finish() {
		if (busy) return;
		busy = true;
		const attempt = await startAttempt(post, activityId);
		await submitAttempt(post, attempt.id);
		done = true;
		busy = false;
	}
</script>

{#if done}
	<p aria-live="polite" data-testid="deck-complete">Deck complete</p>
{:else if cards[index]}
	{@const card = cards[index]}
	<section>
		<p>Card {index + 1} of {cards.length}</p>
		<p>{flipped ? card.definition : card.term}</p>
		<div class="controls">
			<button type="button" disabled={index === 0} onclick={previous}>Previous</button>
			<button type="button" onclick={flip}>Flip</button>
			{#if isLastCard}
				<button type="button" disabled={busy} onclick={finish}>Finish deck</button>
			{:else}
				<button type="button" onclick={next}>Next</button>
			{/if}
		</div>
	</section>
{/if}

<style>
	/* Lays the Previous/Flip/Next-or-Finish buttons out side by side with spacing. */
	.controls {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
	}
</style>
