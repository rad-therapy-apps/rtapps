/**
 * What this file does: component-level tests for `SequencingPlayer.svelte` — move-up reordering
 * of the rendered list, and the final score once every item is graded at its current position and
 * the attempt is submitted.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) so the click-to-reorder flow is exercised for real; the `post`
 * prop is replaced with a `vi.fn` fake that dispatches on the request path (start/grade/submit),
 * so no real network call happens and each call's exact path/body can be asserted, mirroring
 * `QuizPlayer.svelte.spec.ts`.
 * How it fits the project: covers the client half of ADR-0004's attempt flow generalized to
 * sequencing (plan 3a Task 15) — an item's index in the student's ordered list (not the served
 * order) is the grading choice.
 * Depends on: `./SequencingPlayer.svelte`, `./types` (`SequencingSnapshot`), `@rtapps/api-client`,
 * vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type ComponentProps } from 'svelte';
import SequencingPlayer from './SequencingPlayer.svelte';
import type { SequencingSnapshot } from './types';

type Post = NonNullable<ComponentProps<typeof SequencingPlayer>['post']>;

// Three-item fixture in the server's served (label-sorted) order.
const snapshot: SequencingSnapshot = {
	activity: { id: 'activity-2', kind: 'sequencing', title: 'Order Steps' },
	sequencing: {
		id: 'sequencing-1',
		slug: 'order-steps',
		title: 'Order Steps',
		subject: null,
		items: [
			{ key: 's1', label: 'Alpha' },
			{ key: 's2', label: 'Beta' },
			{ key: 's3', label: 'Gamma' }
		]
	}
};

// Fields common to every fake AttemptOut response below (start and submit).
const baseAttempt = {
	id: 'attempt-1',
	activity_id: 'activity-2',
	content_version_id: 'cv-1',
	status: 'in_progress',
	started_at: '2026-01-01T00:00:00Z',
	submitted_at: null,
	score: null,
	max_score: null,
	percent: null,
	passed: null
};

async function waitForAttemptStart(post: Post) {
	await vi.waitFor(() =>
		expect(post).toHaveBeenCalledWith('/api/v1/activities/{activity_id}/attempts', {
			params: { path: { activity_id: 'activity-2' } }
		})
	);
}

describe('SequencingPlayer', () => {
	// Scenario: a fresh attempt renders the served order, then "Move up" is clicked on the second row.
	// Invariant: the rendered list order swaps (Beta now precedes Alpha).
	it('reorders the rendered list on move up', async () => {
		const post: Post = vi.fn(async () => ({
			data: { ...baseAttempt, items: [] },
			error: undefined
		})) as unknown as Post;

		const { container } = await render(SequencingPlayer, {
			activityId: 'activity-2',
			snapshot,
			post
		});
		await waitForAttemptStart(post);

		const labelsBefore = [...container.querySelectorAll('li')].map((li) => li.textContent);
		expect(labelsBefore[0]).toContain('Alpha');
		expect(labelsBefore[1]).toContain('Beta');

		await page.getByRole('button', { name: 'Move up Beta' }).click();

		const labelsAfter = [...container.querySelectorAll('li')].map((li) => li.textContent);
		expect(labelsAfter[0]).toContain('Beta');
		expect(labelsAfter[1]).toContain('Alpha');
		expect(labelsAfter[2]).toContain('Gamma');
	});

	// Scenario: "Check order" grades every item at its current index, then submits.
	// Invariant: each grade request carries the item's current position, and the score renders.
	it('grades every item at its position and shows the score once submitted', async () => {
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

		await render(SequencingPlayer, { activityId: 'activity-2', snapshot, post });
		await waitForAttemptStart(post);

		await page.getByRole('button', { name: 'Move up Beta' }).click();
		await page.getByRole('button', { name: 'Check order' }).click();

		// After the swap the order is Beta(0), Alpha(1), Gamma(2).
		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 's2', response: { choice: 0 } }
		});
		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 's1', response: { choice: 1 } }
		});
		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 's3', response: { choice: 2 } }
		});

		await expect.element(page.getByTestId('sequencing-result')).toBeInTheDocument();
		await expect.element(page.getByText('Score: 100%')).toBeInTheDocument();
	});
});
