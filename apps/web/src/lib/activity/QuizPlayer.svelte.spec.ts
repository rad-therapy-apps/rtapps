/**
 * What this file does: component-level tests for `QuizPlayer.svelte` — first-question rendering,
 * grading a choice with feedback and its explanation, the passed badge on submit, resuming an
 * in-progress attempt at its first unanswered question, and the error/retry path when a grade
 * request rejects.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) so radio/button behaviour is exercised for real; the `post` prop
 * is replaced with a `vi.fn` fake that dispatches on the request path (start/grade/submit), so no
 * real network call happens and each call's exact path/body can be asserted, mirroring
 * `KnowledgeCheck.svelte.spec.ts`/`LessonPager.svelte.spec.ts`.
 * How it fits the project: covers the client half of ADR-0004's attempt flow generalized to
 * quizzes (plan 3a Task 14) — start/resume, per-question grading, and final submit.
 * Depends on: `./QuizPlayer.svelte`, `./types` (`QuizSnapshot`), `@rtapps/api-client`,
 * vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type ComponentProps } from 'svelte';
import QuizPlayer from './QuizPlayer.svelte';
import type { QuizSnapshot } from './types';

type Post = NonNullable<ComponentProps<typeof QuizPlayer>['post']>;

// Two-question fixture, reused by every test below.
const snapshot: QuizSnapshot = {
	activity: { id: 'activity-1', kind: 'quiz', title: 'RBE Quiz' },
	quiz: {
		id: 'quiz-1',
		slug: 'rbe-quiz',
		title: 'RBE Quiz',
		subject: { slug: 'radiation-biology', title: 'Radiation Biology' },
		questions: [
			{
				key: 'q1',
				question_id: 'question-1',
				stem: {
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'What happens as LET increases?' }]
						}
					]
				},
				body: { type: 'single_choice', options: ['Option A', 'Option B'] }
			},
			{
				key: 'q2',
				question_id: 'question-2',
				stem: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'What is RBE?' }] }]
				},
				body: { type: 'single_choice', options: ['Option C', 'Option D'] }
			}
		]
	}
};

// Fields common to every fake AttemptOut response below (start and submit).
const baseAttempt = {
	id: 'attempt-1',
	activity_id: 'activity-1',
	content_version_id: 'cv-1',
	status: 'in_progress',
	started_at: '2026-01-01T00:00:00Z',
	submitted_at: null,
	score: null,
	max_score: null,
	percent: null,
	passed: null
};

// Waits until the component's mount-time `startAttempt` call has actually gone out, so a
// subsequent radio click isn't racing the still-unresolved attempt id (`choose()` no-ops until
// it's set).
async function waitForAttemptStart(post: Post) {
	await vi.waitFor(() =>
		expect(post).toHaveBeenCalledWith('/api/v1/activities/{activity_id}/attempts', {
			params: { path: { activity_id: 'activity-1' } }
		})
	);
}

describe('QuizPlayer', () => {
	// Scenario: a fresh attempt (no saved items).
	// Invariant: the first question's stem and options render.
	it('renders the first question', async () => {
		const post: Post = vi.fn(async () => ({
			data: { ...baseAttempt, items: [] },
			error: undefined
		})) as unknown as Post;

		await render(QuizPlayer, { activityId: 'activity-1', snapshot, post });

		await expect.element(page.getByTestId('quiz-question')).toBeInTheDocument();
		await expect.element(page.getByText('Question 1 of 2')).toBeInTheDocument();
		await expect.element(page.getByText('What happens as LET increases?')).toBeInTheDocument();
	});

	// Scenario: choosing an option grades it via the server.
	// Invariant: the exact request body is sent, and feedback plus the explanation render.
	it('grades the chosen option and shows feedback with its explanation', async () => {
		const post: Post = vi.fn(
			async (
				path: string,
				init?: { body?: { item_key: string; response: { choice: number } } }
			) => {
				if (path === '/api/v1/activities/{activity_id}/attempts') {
					return { data: { ...baseAttempt, items: [] }, error: undefined };
				}
				if (path === '/api/v1/attempts/{attempt_id}/items') {
					return {
						data: {
							item_key: init!.body!.item_key,
							correct: true,
							score: 1,
							max_score: 1,
							explanation: {
								type: 'doc',
								content: [
									{ type: 'paragraph', content: [{ type: 'text', text: 'Because overkill.' }] }
								]
							}
						},
						error: undefined
					};
				}
				throw new Error(`unexpected path ${path}`);
			}
		) as unknown as Post;

		await render(QuizPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		await page.getByRole('radio', { name: 'Option B' }).click();

		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 'q1', response: { choice: 1 } }
		});
		await expect.element(page.getByTestId('feedback')).toHaveTextContent('Correct!');
		await expect.element(page.getByText('Because overkill.')).toBeInTheDocument();
	});

	// Scenario: both questions are answered correctly and the attempt is submitted as passed.
	// Invariant: the result section shows the badge and the score.
	it('shows the badge once the quiz is submitted as passed', async () => {
		const post: Post = vi.fn(
			async (
				path: string,
				init?: { body?: { item_key: string; response: { choice: number } } }
			) => {
				if (path === '/api/v1/activities/{activity_id}/attempts') {
					return { data: { ...baseAttempt, items: [] }, error: undefined };
				}
				if (path === '/api/v1/attempts/{attempt_id}/items') {
					return {
						data: {
							item_key: init!.body!.item_key,
							correct: true,
							score: 1,
							max_score: 1,
							explanation: null
						},
						error: undefined
					};
				}
				if (path === '/api/v1/attempts/{attempt_id}/submit') {
					return {
						data: { ...baseAttempt, status: 'submitted', percent: 100, passed: true },
						error: undefined
					};
				}
				throw new Error(`unexpected path ${path}`);
			}
		) as unknown as Post;

		await render(QuizPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		await page.getByRole('radio', { name: 'Option B' }).click();
		await expect.element(page.getByTestId('feedback')).toBeInTheDocument();
		await page.getByRole('button', { name: 'Next question' }).click();

		await expect.element(page.getByText('Question 2 of 2')).toBeInTheDocument();
		await page.getByRole('radio', { name: 'Option D' }).click();
		await expect.element(page.getByTestId('feedback')).toBeInTheDocument();

		await page.getByRole('button', { name: 'Finish quiz' }).click();

		await expect.element(page.getByTestId('quiz-result')).toBeInTheDocument();
		await expect.element(page.getByTestId('quiz-badge')).toBeInTheDocument();
		await expect.element(page.getByText('Score: 100%')).toBeInTheDocument();
	});

	// Scenario: resuming an attempt that already has a saved (incorrect) answer to question 1.
	// Invariant: the player lands on question 2, the first unanswered question, not question 1.
	it('resumes on the first unanswered question', async () => {
		const post: Post = vi.fn(async (path: string) => {
			if (path === '/api/v1/activities/{activity_id}/attempts') {
				return {
					data: {
						...baseAttempt,
						items: [
							{ item_key: 'q1', response: { choice: 0 }, correct: false, score: 0, max_score: 1 }
						]
					},
					error: undefined
				};
			}
			throw new Error(`unexpected path ${path}`);
		}) as unknown as Post;

		await render(QuizPlayer, { activityId: 'activity-1', snapshot, post });

		await expect.element(page.getByText('Question 2 of 2')).toBeInTheDocument();
	});

	// Scenario: the grade request rejects (e.g. a dropped network connection).
	// Invariant: the error message renders and `busy` is released, so choosing again (the retry)
	// posts a second grade request and succeeds.
	it('shows an error when grading fails, and releases busy so a retry succeeds', async () => {
		let gradeCalls = 0;
		const post: Post = vi.fn(
			async (
				path: string,
				init?: { body?: { item_key: string; response: { choice: number } } }
			) => {
				if (path === '/api/v1/activities/{activity_id}/attempts') {
					return { data: { ...baseAttempt, items: [] }, error: undefined };
				}
				if (path === '/api/v1/attempts/{attempt_id}/items') {
					gradeCalls += 1;
					if (gradeCalls === 1) {
						throw new Error('network down');
					}
					return {
						data: {
							item_key: init!.body!.item_key,
							correct: true,
							score: 1,
							max_score: 1,
							explanation: null
						},
						error: undefined
					};
				}
				throw new Error(`unexpected path ${path}`);
			}
		) as unknown as Post;

		await render(QuizPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		await page.getByRole('radio', { name: 'Option A' }).click();

		await expect.element(page.getByTestId('player-error')).toBeInTheDocument();
		expect(gradeCalls).toBe(1);

		// Retry: the failed grade left the answer unrecorded and busy released, so choosing again
		// (a different option, since the browser's native radio state stays checked on the first
		// one even though the failed grade was never recorded) re-posts.
		await page.getByRole('radio', { name: 'Option B' }).click();

		expect(gradeCalls).toBe(2);
		await expect.element(page.getByTestId('feedback')).toHaveTextContent('Correct!');
	});
});
