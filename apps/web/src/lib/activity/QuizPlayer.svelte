<!--
	What this file does: the quiz player — presents a quiz snapshot's questions one at a time, in
	snapshot order, grades each choice against the server, and submits the attempt for a final
	score with a badge when passed.
	Used here and why: Svelte 5 runes ($props for activityId/snapshot/post, $state for the
	resumed attempt id/per-question answers/current index/result/busy, $derived for the answered
	count); `post` defaults to the real `openapi-fetch` client (`api.POST`) but is overridable so
	specs can inject a fake, matching `KnowledgeCheck.svelte`'s pattern. Questions are shown in
	snapshot order (no shuffle) — a deliberate plan 3a deviation so e2e coverage stays
	deterministic.
	How it fits the project: generalizes ADR-0004's attempt flow from lessons to quizzes (plan 3a
	Task 14) — starts (or resumes) an attempt, grades each item, and submits for a final score, all
	client-side over the session cookie (ADR-0002). See `docs/03-architecture.md` §4.4.
	Depends on: `$lib/prose/ProseDoc.svelte` (stems/explanations), `$lib/lesson/api` (`api.POST`),
	`./attempts` (`startAttempt`/`gradeItem`/`submitAttempt`), `./types` (`QuizSnapshot`), `$lib/ui/Button.svelte`, `$lib/ui/Feedback.svelte`, `$lib/ui/Icon.svelte`.
	Used by: `(app)/subjects/[slug]/activities/[id]/+page.svelte`, `QuizPlayer.svelte.spec.ts`.
-->
<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Feedback from '$lib/ui/Feedback.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { api } from '$lib/lesson/api';
	import { gradeItem, startAttempt, submitAttempt } from './attempts';
	import type { QuizSnapshot } from './types';
	import type { ProseDoc as ProseDocType } from '$lib/prose/types';

	// `activityId` scopes attempt start/resume; `snapshot` is this quiz's stripped content; `post`
	// defaults to the real API client but is overridable so specs can inject a fake.
	let {
		activityId,
		snapshot,
		post = api.POST
	}: {
		activityId: string;
		snapshot: QuizSnapshot;
		post?: typeof api.POST;
	} = $props();

	const questions = $derived(snapshot.quiz.questions);
	// The in-progress (or resumed) attempt's id; null until startAttempt resolves.
	let attemptId = $state<string | null>(null);
	// item_key -> {choice, correct, explanation}: rehydrated from the resumed attempt's saved items
	// (which carry no explanation) and filled in with one when graded fresh via `choose`.
	let answers = $state<
		Record<string, { choice: number; correct: boolean | null; explanation?: ProseDocType | null }>
	>({});
	// Index of the question currently shown.
	let index = $state(0);
	// Set once the attempt is submitted; presence switches the UI to the score summary.
	let result = $state<{ percent: number | null; passed: boolean | null } | null>(null);
	// True while a grade/submit request is in flight, to disable controls against double-submits.
	let busy = $state(false);
	// User-facing message when a start/grade/submit request fails; cleared at the start of each attempt.
	let error = $state<string | undefined>(undefined);

	// Start (or resume) the attempt once; jump to the first unanswered question.
	$effect(() => {
		startAttempt(post, activityId)
			.then((attempt) => {
				attemptId = attempt.id;
				for (const item of attempt.items) {
					answers[item.item_key] = { choice: item.response.choice, correct: item.correct };
				}
				// Resume at the first unanswered question (or the last one when all are answered).
				const firstUnanswered = questions.findIndex((q) => !answers[q.key]);
				index = firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
			})
			.catch(() => {
				error = 'Request failed. Try again.';
			});
	});

	// Grades the chosen option for one question and stores the result.
	async function choose(key: string, choice: number) {
		if (!attemptId || answers[key] || busy) return;
		busy = true;
		error = undefined;
		try {
			const grade = await gradeItem(post, attemptId, key, choice);
			answers[key] = { choice, correct: grade.correct, explanation: grade.explanation };
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

	// Count of questions answered so far, gating the "Finish quiz" button.
	const answered = $derived(Object.keys(answers).length);
</script>

{#if result}
	<section aria-live="polite" data-testid="quiz-result">
		{#if result.passed}
			<p class="badge" data-testid="quiz-badge"><Icon icon={Award} /> Badge earned!</p>
		{/if}
		<p>Score: {result.percent ?? 0}%</p>
	</section>
{:else if questions[index]}
	{@const q = questions[index]}
	<section data-testid="quiz-question">
		<p>Question {index + 1} of {questions.length}</p>
		<ProseDoc doc={q.stem} />
		<!-- One radio per option; `i` as the key/value since options have no id of their own and the list is static per question. -->
		{#each q.body.options as option, i (i)}
			<label class="option">
				<input
					type="radio"
					name={q.key}
					value={i}
					disabled={!!answers[q.key] || busy}
					checked={answers[q.key]?.choice === i}
					onchange={() => choose(q.key, i)}
				/>
				{option}
			</label>
		{/each}
		<!-- Start/grade/submit request failed: surfaced as polite live-region text so screen readers
			 announce it without stealing focus; cleared at the start of every attempt. -->
		{#if error}
			<p aria-live="polite" data-testid="player-error">{error}</p>
		{/if}
		<!-- Graded (or resumed) result for this question: verdict, explanation if any, and Next/Finish. -->
		{#if answers[q.key]}
			{@const a = answers[q.key]}
			<div data-testid="feedback">
				<Feedback correct={!!a.correct}>{a.correct ? 'Correct!' : 'Not quite.'}</Feedback>
			</div>
			{#if a.explanation}
				<ProseDoc doc={a.explanation} />
			{/if}
			{#if index < questions.length - 1}
				<Button variant="primary" onclick={() => (index += 1)}>Next question</Button>
			{:else}
				<Button variant="primary" onclick={finish} disabled={answered < questions.length || busy}
					>Finish quiz</Button
				>
			{/if}
		{/if}
	</section>
{/if}

<style>
	/* Draws attention to a passed badge without relying on color alone (the award icon carries it). */
	.badge {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: bold;
	}
	/* One radio per row, at least a control-height touch target. */
	.option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--control-height);
	}
</style>
