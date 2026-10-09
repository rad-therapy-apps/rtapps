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
	`./types` (`FlashcardsSnapshot`), `$lib/ui/Button.svelte`, `$lib/ui/Feedback.svelte`.
	Used by: `(app)/subjects/[slug]/activities/[id]/+page.svelte`.
-->
<script lang="ts">
	import { api } from '$lib/lesson/api';
	import Button from '$lib/ui/Button.svelte';
	import Feedback from '$lib/ui/Feedback.svelte';
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
	// True only after the student flips, so the 150 ms fade plays on a flip and not when a card appears.
	let fade = $state(false);
	// Set once the completion attempt is submitted; presence switches the UI to "Deck complete".
	let done = $state(false);
	// True while the finish request is in flight, to disable the button against double-submits.
	let busy = $state(false);
	// User-facing message when the completion attempt fails; cleared at the start of each attempt.
	let error = $state<string | undefined>(undefined);

	// Whether the current card is the deck's last, gating Next vs. the Finish button.
	const isLastCard = $derived(index === cards.length - 1);

	// Moves to the previous card, reset to its front.
	function previous() {
		if (index === 0) return;
		index -= 1;
		flipped = false;
		fade = false;
	}

	// Moves to the next card, reset to its front.
	function next() {
		if (isLastCard) return;
		index += 1;
		flipped = false;
		fade = false;
	}

	// Toggles between the current card's term and definition.
	function flip() {
		flipped = !flipped;
		fade = true;
	}

	// Starts a completion attempt and submits it immediately (flashcards have nothing to grade).
	async function finish() {
		if (busy) return;
		busy = true;
		error = undefined;
		try {
			const attempt = await startAttempt(post, activityId);
			await submitAttempt(post, attempt.id);
			done = true;
		} catch {
			error = 'Request failed. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

{#if done}
	<div aria-live="polite" data-testid="deck-complete">
		<Feedback correct={true}>Deck complete</Feedback>
	</div>
{:else if cards[index]}
	{@const card = cards[index]}
	<section>
		<p>Card {index + 1} of {cards.length}</p>
		<!-- Keyed on the face so each flip fades in over 150 ms (no other motion). -->
		{#key flipped}
			<p class="face" class:fade>{flipped ? card.definition : card.term}</p>
		{/key}
		<div class="controls">
			<Button disabled={index === 0} onclick={previous}>Previous</Button>
			<Button variant="primary" onclick={flip}>Flip</Button>
			{#if isLastCard}
				<Button variant="primary" disabled={busy} onclick={finish}>Finish deck</Button>
			{:else}
				<Button variant="primary" onclick={next}>Next</Button>
			{/if}
		</div>
		<!-- Completion attempt failed: surfaced as polite live-region text so screen readers announce
			 it without stealing focus; cleared at the start of every attempt. -->
		{#if error}
			<p aria-live="polite" data-testid="player-error">{error}</p>
		{/if}
	</section>
{/if}

<style>
	/* Lays the Previous/Flip/Next-or-Finish buttons out side by side with spacing. */
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		margin: var(--space-4) 0;
	}
	/* The card face: a raised panel at least 12rem high, text centred. */
	.face {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 12rem;
		margin: 0;
		padding: var(--space-5);
		background: var(--surface-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		font-size: var(--text-xl);
		text-align: center;
		overflow-wrap: anywhere;
	}
	.face.fade {
		animation: face-in 150ms linear;
	}
	@keyframes face-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.face.fade {
			animation: none;
		}
	}
</style>
