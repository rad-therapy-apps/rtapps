/**
 * What this file does: unit tests for the shared attempt helpers (`startAttempt`, `gradeItem`,
 * `submitAttempt`) used by every practice-activity player.
 * Used here and why: vitest `server` project — pure functions, no DOM needed; `post` is a
 * `vi.fn` stub so each call's exact path/params/body — and the submit call's Idempotency-Key
 * header — can be asserted without a real network call.
 * How it fits the project: covers the client half of ADR-0004's attempt/grade/submit calls,
 * generalized from lessons to the four practice-activity kinds (plan 3a Task 14).
 * Depends on: `./attempts`, vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it, vi } from 'vitest';
import { gradeItem, startAttempt, submitAttempt, type PostFn } from './attempts';

describe('startAttempt', () => {
	// Scenario: the API resumes/starts an attempt with one saved item.
	// Invariant: the request targets the right path/params, and the saved item is mapped to
	// `{item_key, response, correct}` with `response.choice` intact (dropping score/max_score).
	it('starts (or resumes) an attempt and maps its saved items', async () => {
		// `PostFn` is a generic overloaded signature (openapi-fetch's `ClientMethod`); `vi.fn<PostFn>`
		// can't infer a matching concrete implementation, so the fake is built untyped and cast
		// once to the real prop type instead of widening the prop itself.
		const post: PostFn = vi.fn(async () => ({
			data: {
				id: 'attempt-1',
				activity_id: 'activity-1',
				content_version_id: 'cv-1',
				status: 'in_progress',
				started_at: '2026-01-01T00:00:00Z',
				submitted_at: null,
				score: null,
				max_score: null,
				percent: null,
				passed: null,
				items: [{ item_key: 'q1', response: { choice: 1 }, correct: true, score: 1, max_score: 1 }]
			},
			error: undefined
		})) as unknown as PostFn;

		const attempt = await startAttempt(post, 'activity-1');

		expect(post).toHaveBeenCalledWith('/api/v1/activities/{activity_id}/attempts', {
			params: { path: { activity_id: 'activity-1' } }
		});
		expect(attempt).toEqual({
			id: 'attempt-1',
			items: [{ item_key: 'q1', response: { choice: 1 }, correct: true }]
		});
	});
});

describe('gradeItem', () => {
	// Scenario: the server grades a choice as correct with an explanation.
	// Invariant: the request body is exactly {item_key, response: {choice}}, and the explanation
	// is passed through untouched (its ProseDoc cast is a compile-time boundary, not a runtime one).
	it('grades one choice and returns its explanation', async () => {
		const post: PostFn = vi.fn(async () => ({
			data: {
				item_key: 'q1',
				correct: true,
				score: 1,
				max_score: 1,
				explanation: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Because overkill.' }] }]
				}
			},
			error: undefined
		})) as unknown as PostFn;

		const grade = await gradeItem(post, 'attempt-1', 'q1', 1);

		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 'q1', response: { choice: 1 } }
		});
		expect(grade).toEqual({
			item_key: 'q1',
			correct: true,
			explanation: {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Because overkill.' }] }]
			}
		});
	});

	// Scenario: the question has no explanation.
	// Invariant: `explanation` comes back null rather than undefined.
	it('passes through a null explanation', async () => {
		const post: PostFn = vi.fn(async () => ({
			data: { item_key: 'q2', correct: false, score: 0, max_score: 1, explanation: null },
			error: undefined
		})) as unknown as PostFn;

		const grade = await gradeItem(post, 'attempt-1', 'q2', 0);

		expect(grade.explanation).toBeNull();
	});
});

describe('submitAttempt', () => {
	// Scenario: submit succeeds with a passing percent.
	// Invariant: a fresh Idempotency-Key header is present on the request, and percent/passed are
	// returned.
	it('submits the attempt with an Idempotency-Key header', async () => {
		const post: PostFn = vi.fn(async () => ({
			data: {
				id: 'attempt-1',
				activity_id: 'activity-1',
				content_version_id: 'cv-1',
				status: 'submitted',
				started_at: '2026-01-01T00:00:00Z',
				submitted_at: '2026-01-01T00:05:00Z',
				score: 1,
				max_score: 1,
				percent: 100,
				passed: true,
				items: []
			},
			error: undefined
		})) as unknown as PostFn;

		const submitted = await submitAttempt(post, 'attempt-1');

		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/submit', {
			params: { path: { attempt_id: 'attempt-1' } },
			headers: { 'Idempotency-Key': expect.any(String) }
		});
		expect(submitted).toEqual({ percent: 100, passed: true });
	});
});

describe('error handling', () => {
	// Scenario: the API returns an RFC 9457 problem body with a `title` (e.g. attempt already
	// submitted), same shape KnowledgeCheck.svelte/LessonPager.svelte already fall back to.
	// Invariant: the helper throws with that `title` as its message.
	it('throws the problem body title when a request fails', async () => {
		const post: PostFn = vi.fn(async () => ({
			data: undefined,
			error: { title: 'Attempt already submitted' }
		})) as unknown as PostFn;

		await expect(submitAttempt(post, 'attempt-1')).rejects.toThrow('Attempt already submitted');
	});
});
