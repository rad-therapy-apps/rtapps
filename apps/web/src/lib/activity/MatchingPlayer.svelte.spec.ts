/**
 * What this file does: component-level tests for `MatchingPlayer.svelte` — the term/definition
 * pairing flow's grading requests, re-pairing an already-answered term, and the final score once
 * every term is paired and submitted.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) so the click-to-select/click-to-pair flow is exercised for real;
 * the `post` prop is replaced with a `vi.fn` fake that dispatches on the request path (start/
 * grade/submit), so no real network call happens and each call's exact path/body can be
 * asserted, mirroring `QuizPlayer.svelte.spec.ts`.
 * How it fits the project: covers the client half of ADR-0004's attempt flow generalized to
 * matching (plan 3a Task 15) — a definition's index in `matching.definitions` is the grading
 * choice (`./types`'s `MatchingSnapshot`).
 * Depends on: `./MatchingPlayer.svelte`, `./types` (`MatchingSnapshot`), `@rtapps/api-client`,
 * vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type ComponentProps } from 'svelte';
import MatchingPlayer from './MatchingPlayer.svelte';
import type { MatchingSnapshot } from './types';

type Post = NonNullable<ComponentProps<typeof MatchingPlayer>['post']>;

// Two-term fixture; `definitions` is the server's alphabetical order — its index is the grading
// choice for whichever term is paired with it.
const snapshot: MatchingSnapshot = {
	activity: { id: 'activity-1', kind: 'matching', title: 'RBE Terms' },
	matching: {
		id: 'matching-1',
		slug: 'rbe-terms',
		title: 'RBE Terms',
		subject: null,
		terms: [
			{ key: 't1', term: 'RBE' },
			{ key: 't2', term: 'LET' }
		],
		definitions: ['Definition A', 'Definition B']
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

// Waits until the mount-time `startAttempt` call has gone out, so a subsequent click isn't
// racing the still-unresolved attempt id (`pair()` no-ops until it's set).
async function waitForAttemptStart(post: Post) {
	await vi.waitFor(() =>
		expect(post).toHaveBeenCalledWith('/api/v1/activities/{activity_id}/attempts', {
			params: { path: { activity_id: 'activity-1' } }
		})
	);
}

describe('MatchingPlayer', () => {
	// Scenario: select a term, then click a definition to pair it.
	// Invariant: the grade request body is exactly {item_key: <term key>, response: {choice: <definition index>}},
	// and the term's Correct/Incorrect icon feedback renders.
	it('pairs a selected term with a definition and grades it', async () => {
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
				throw new Error(`unexpected path ${path}`);
			}
		) as unknown as Post;

		await render(MatchingPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		await page.getByRole('button', { name: 'RBE' }).click();
		await page.getByRole('button', { name: 'Definition B' }).click();

		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 't1', response: { choice: 1 } }
		});
		await expect
			.element(page.getByTestId('match-feedback-t1').getByRole('img', { name: 'Correct' }))
			.toBeVisible();
	});

	// Scenario: a term already paired is re-selected and paired with a different definition.
	// Invariant: the second grade request carries the new choice (upsert), not a duplicate of the first.
	it('allows re-pairing an already-answered term before submit', async () => {
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
							correct: init!.body!.response.choice === 0,
							score: init!.body!.response.choice === 0 ? 1 : 0,
							max_score: 1,
							explanation: null
						},
						error: undefined
					};
				}
				throw new Error(`unexpected path ${path}`);
			}
		) as unknown as Post;

		await render(MatchingPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		await page.getByRole('button', { name: 'RBE' }).click();
		await page.getByRole('button', { name: 'Definition B' }).click();
		await expect
			.element(page.getByTestId('match-feedback-t1').getByRole('img', { name: 'Incorrect' }))
			.toBeVisible();

		await page.getByRole('button', { name: 'RBE' }).click();
		await page.getByRole('button', { name: 'Definition A' }).click();

		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 't1', response: { choice: 0 } }
		});
		await expect
			.element(page.getByTestId('match-feedback-t1').getByRole('img', { name: 'Correct' }))
			.toBeVisible();
	});

	// Scenario: both terms are paired and "Check results" is clicked.
	// Invariant: the result section shows the final percent once submit resolves.
	it('shows the score once every term is paired and submitted', async () => {
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

		await render(MatchingPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		await page.getByRole('button', { name: 'RBE' }).click();
		await page.getByRole('button', { name: 'Definition A' }).click();
		await expect.element(page.getByTestId('match-feedback-t1')).toBeInTheDocument();

		await page.getByRole('button', { name: 'LET' }).click();
		await page.getByRole('button', { name: 'Definition B' }).click();
		await expect.element(page.getByTestId('match-feedback-t2')).toBeInTheDocument();

		await page.getByRole('button', { name: 'Check results' }).click();

		await expect.element(page.getByTestId('matching-result')).toBeInTheDocument();
		await expect.element(page.getByTestId('matching-badge')).toBeInTheDocument();
		await expect.element(page.getByText('Score: 100%')).toBeInTheDocument();
	});
});
