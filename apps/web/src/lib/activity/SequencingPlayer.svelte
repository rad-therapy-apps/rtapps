<!--
	What this file does: the sequencing player — presents a sequencing snapshot's items (the
	server's label-sorted order) as a reorderable list with per-row "Move up"/"Move down" buttons,
	then grades every item at its current position and submits for a final score.
	Used here and why: Svelte 5 runes ($props for activityId/snapshot/post, $state for the resumed
	attempt id/current order/per-item answers/result/busy); click-based reordering (no drag) per
	plan 3a Task 15's Global Constraints; `post` defaults to the real `openapi-fetch` client
	(`api.POST`) but is overridable so specs can inject a fake, matching `QuizPlayer.svelte`'s
	pattern. An item's position in the student's ordered list (not the served order) is the grading
	choice — `./types`'s `SequencingSnapshot` documents the served (label-sorted) order.
	How it fits the project: generalizes ADR-0004's attempt flow to sequencing (plan 3a Task 15) —
	"Check order" grades every item at its current index, then submits for a final score. See
	`docs/03-architecture.md` §4.4.
	Depends on: `$lib/lesson/api` (`api.POST`), `./attempts` (`startAttempt`/`gradeItem`/
	`submitAttempt`), `./types` (`SequencingSnapshot`), `$lib/ui/Button.svelte`, `$lib/ui/Icon.svelte`.
	Used by: `(app)/subjects/[slug]/activities/[id]/+page.svelte`, `SequencingPlayer.svelte.spec.ts`.
-->
<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { api } from '$lib/lesson/api';
	import Button from '$lib/ui/Button.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { gradeItem, startAttempt, submitAttempt } from './attempts';
	import type { SequencingSnapshot } from './types';

	// `activityId` scopes attempt start/resume; `snapshot` is this sequence's stripped content;
	// `post` defaults to the real API client but is overridable so specs can inject a fake.
	let {
		activityId,
		snapshot,
		post = api.POST
	}: {
		activityId: string;
		snapshot: SequencingSnapshot;
		post?: typeof api.POST;
	} = $props();

	// Lookup by key for the label/detail rendered per row; the reorderable state below is just keys.
	const itemByKey = $derived(new Map(snapshot.sequencing.items.map((item) => [item.key, item])));
	// The student's current ordering of item keys; starts as the served (label-sorted) order and is
	// reshuffled in place by moveUp/moveDown. Seeded once (below, in the mount effect) rather than
	// in this declaration, so the initializer doesn't just capture `snapshot`'s value at prop-read
	// time (`svelte(state_referenced_locally)`).
	let order = $state<string[]>([]);
	// The in-progress (or resumed) attempt's id; null until startAttempt resolves.
	let attemptId = $state<string | null>(null);
	// item_key -> correct: filled in by a resumed attempt's saved items, and by "Check order".
	let answers = $state<Record<string, { correct: boolean | null }>>({});
	// Set once the attempt is submitted; presence switches the UI to the score summary.
	let result = $state<{ percent: number | null; passed: boolean | null } | null>(null);
	// True while grading/submitting is in flight, to disable reordering and double-submits.
	let busy = $state(false);
	// User-facing message when a start/grade/submit request fails; cleared at the start of each attempt.
	let error = $state<string | undefined>(undefined);

	// Seed the initial order and start (or resume) the attempt once; a resumed attempt's saved
	// items mark their rows.
	$effect(() => {
		order = snapshot.sequencing.items.map((item) => item.key);
		startAttempt(post, activityId)
			.then((attempt) => {
				attemptId = attempt.id;
				for (const item of attempt.items) {
					answers[item.item_key] = { correct: item.correct };
				}
			})
			.catch(() => {
				error = 'Request failed. Try again.';
			});
	});

	// Swaps the item at `index` with the one above it.
	function moveUp(index: number) {
		if (busy || index === 0) return;
		const next = [...order];
		[next[index - 1], next[index]] = [next[index], next[index - 1]];
		order = next;
	}

	// Swaps the item at `index` with the one below it.
	function moveDown(index: number) {
		if (busy || index === order.length - 1) return;
		const next = [...order];
		[next[index], next[index + 1]] = [next[index + 1], next[index]];
		order = next;
	}

	// Grades every item at its current position, then submits the attempt for a final score.
	async function checkOrder() {
		if (!attemptId || busy) return;
		busy = true;
		error = undefined;
		try {
			for (const [index, key] of order.entries()) {
				const grade = await gradeItem(post, attemptId, key, index);
				answers[key] = { correct: grade.correct };
			}
			const submitted = await submitAttempt(post, attemptId);
			result = { percent: submitted.percent, passed: submitted.passed };
		} catch {
			error = 'Request failed. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

{#if result}
	<section aria-live="polite" data-testid="sequencing-result">
		<p>Score: {result.percent ?? 0}%</p>
	</section>
{:else}
	<ol data-testid="sequencing-list">
		<!-- Rows keyed by the item's stable `key`, in the student's current order. -->
		{#each order as key, index (key)}
			{@const item = itemByKey.get(key)}
			<li>
				<span>{item?.label}</span>
				{#if item?.detail}
					<span class="detail">{item.detail}</span>
				{/if}
				<Button
					aria-label={`Move up ${item?.label}`}
					disabled={busy || index === 0}
					onclick={() => moveUp(index)}
				>
					Move up
				</Button>
				<Button
					aria-label={`Move down ${item?.label}`}
					disabled={busy || index === order.length - 1}
					onclick={() => moveDown(index)}
				>
					Move down
				</Button>
				{#if answers[key]}
					<span data-testid={`seq-feedback-${key}`}>
						{#if answers[key].correct}
							<Icon icon={Check} label="Correct" />
						{:else}
							<Icon icon={X} label="Incorrect" />
						{/if}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
	<!-- Start/grade/submit request failed: surfaced as polite live-region text so screen readers
		 announce it without stealing focus; cleared at the start of every attempt. -->
	{#if error}
		<p aria-live="polite" data-testid="player-error">{error}</p>
	{/if}
	<Button variant="primary" disabled={!attemptId || busy} onclick={checkOrder}>Check order</Button>
{/if}

<style>
	/* Removes the default numbering; each row's own position within the list is the point. */
	ol {
		list-style: none;
		padding: 0;
	}
	/* Each row wraps its label and buttons so it never overflows a 360px screen. */
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}
	li > span:first-child {
		flex: 1 1 10rem;
		min-width: 0;
	}
</style>
