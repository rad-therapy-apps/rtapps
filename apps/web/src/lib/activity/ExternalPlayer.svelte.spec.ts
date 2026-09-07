/**
 * What this file does: component-level tests for `ExternalPlayer.svelte` — the arcade game
 * iframe, starting an attempt on mount, the `postMessage` result bridge that submits the game's
 * reported score exactly once, and the error/retry path when submit rejects.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) so the real `window.postMessage`/`message` event path is
 * exercised; the `post` prop is replaced with a `vi.fn` fake that dispatches on the request path
 * (start/submit), mirroring `QuizPlayer.svelte.spec.ts`. Result messages are dispatched with
 * `window.dispatchEvent(new MessageEvent('message', {...}))` rather than real cross-frame
 * `postMessage`, since there is no second frame in this test — `MessageEvent`'s `origin` is
 * settable in its constructor, which is enough to exercise the bridge's same-origin check.
 * How it fits the project: covers the client half of plan 4a's external-activity flow — start an
 * attempt, receive the arcade shim's `{type:"rtapps:result", score, max}` message once, and
 * submit that score for a final (server-clamped) percent.
 * Depends on: `./ExternalPlayer.svelte`, `./types` (`ExternalSnapshot`), `@rtapps/api-client`,
 * vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type ComponentProps } from 'svelte';
import ExternalPlayer from './ExternalPlayer.svelte';
import type { ExternalSnapshot } from './types';

type Post = NonNullable<ComponentProps<typeof ExternalPlayer>['post']>;

// Snapshot fixture reused by every test below.
const snapshot: ExternalSnapshot = {
	activity: { id: 'activity-1', kind: 'external', title: 'Cell Defender' },
	external: {
		arcade_slug: 'cell-defender',
		max_score: 5000,
		subject: { slug: 'radiation-biology', title: 'Radiation Biology' }
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
// subsequent result message isn't racing the still-unresolved attempt id (`submitScore()`
// no-ops until it's set).
async function waitForAttemptStart(post: Post) {
	await vi.waitFor(() =>
		expect(post).toHaveBeenCalledWith('/api/v1/activities/{activity_id}/attempts', {
			params: { path: { activity_id: 'activity-1' } }
		})
	);
}

function dispatchResult(data: unknown, origin = window.location.origin) {
	window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

describe('ExternalPlayer', () => {
	// Scenario: mounting the player.
	// Invariant: the arcade iframe points at the slug's served path, the activity title renders,
	// and starting an attempt is kicked off immediately.
	it('renders the iframe and starts an attempt on mount', async () => {
		const post: Post = vi.fn(async () => ({
			data: { ...baseAttempt, items: [] },
			error: undefined
		})) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });

		await expect.element(page.getByText('Cell Defender')).toBeInTheDocument();
		const iframe = document.querySelector('iframe');
		expect(iframe?.getAttribute('src')).toBe('/arcade/cell-defender/');
		await waitForAttemptStart(post);
	});

	// Scenario: the arcade shim posts a same-origin result once the attempt has started.
	// Invariant: submit is posted with exactly {score}, and the result panel shows the returned
	// percent with no pass/fail badge (practice semantics for games in 4a).
	it('submits the reported score on a same-origin result message and shows the percent with no badge', async () => {
		const post: Post = vi.fn(async (path: string, init?: { body?: { score: number } }) => {
			if (path === '/api/v1/activities/{activity_id}/attempts') {
				return { data: { ...baseAttempt, items: [] }, error: undefined };
			}
			if (path === '/api/v1/attempts/{attempt_id}/submit') {
				expect(init?.body).toEqual({ score: 1200 });
				return {
					data: { ...baseAttempt, status: 'submitted', percent: 24, passed: null },
					error: undefined
				};
			}
			throw new Error(`unexpected path ${path}`);
		}) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		dispatchResult({ type: 'rtapps:result', score: 1200, max: 5000 });

		await expect.element(page.getByLabelText('result')).toBeInTheDocument();
		await expect.element(page.getByText('24%', { exact: false })).toBeInTheDocument();
		// Codebase badge idiom is <p class="badge" data-testid="quiz-badge">🏅 Badge earned!</p>;
		// games show no badge (practice semantics in 4a), so both must be absent.
		expect(page.getByTestId('quiz-badge').elements().length).toBe(0);
		expect(page.getByText(/badge earned/i).elements().length).toBe(0);
		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/submit', {
			params: { path: { attempt_id: 'attempt-1' } },
			headers: { 'Idempotency-Key': expect.any(String) },
			body: { score: 1200 }
		});
	});

	// Scenario: the arcade shim's shim retries (or the game double-fires) after a result was
	// already accepted and submitted.
	// Invariant: the bridge is once-only — no second submit call goes out.
	it('ignores a second result message after submit', async () => {
		let submitCalls = 0;
		const post: Post = vi.fn(async (path: string) => {
			if (path === '/api/v1/activities/{activity_id}/attempts') {
				return { data: { ...baseAttempt, items: [] }, error: undefined };
			}
			if (path === '/api/v1/attempts/{attempt_id}/submit') {
				submitCalls += 1;
				return {
					data: { ...baseAttempt, status: 'submitted', percent: 24, passed: null },
					error: undefined
				};
			}
			throw new Error(`unexpected path ${path}`);
		}) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		dispatchResult({ type: 'rtapps:result', score: 1200, max: 5000 });
		await expect.element(page.getByLabelText('result')).toBeInTheDocument();

		dispatchResult({ type: 'rtapps:result', score: 3000, max: 5000 });

		expect(submitCalls).toBe(1);
	});

	// Scenario: a message with the wrong shape (unrelated type, or a non-numeric/missing score),
	// or one from another origin.
	// Invariant: ignored — no submit call goes out for any of them.
	it('ignores messages with the wrong shape or origin', async () => {
		let submitCalls = 0;
		const post: Post = vi.fn(async (path: string) => {
			if (path === '/api/v1/activities/{activity_id}/attempts') {
				return { data: { ...baseAttempt, items: [] }, error: undefined };
			}
			if (path === '/api/v1/attempts/{attempt_id}/submit') {
				submitCalls += 1;
				return {
					data: { ...baseAttempt, status: 'submitted', percent: 24, passed: null },
					error: undefined
				};
			}
			throw new Error(`unexpected path ${path}`);
		}) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		dispatchResult({ type: 'other', score: 1200 });
		dispatchResult({ type: 'rtapps:result' });
		dispatchResult({ type: 'rtapps:result', score: 1200 }, 'https://evil.example');

		// Give any (wrongly) triggered submit a tick to fire before asserting it didn't.
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(submitCalls).toBe(0);
	});

	// Scenario: a message with score as a string (which Number() would coerce to a number).
	// Invariant: ignored — no submit call goes out, rejecting coercion of strings.
	it('ignores a message with score as a string', async () => {
		let submitCalls = 0;
		const post: Post = vi.fn(async (path: string) => {
			if (path === '/api/v1/activities/{activity_id}/attempts') {
				return { data: { ...baseAttempt, items: [] }, error: undefined };
			}
			if (path === '/api/v1/attempts/{attempt_id}/submit') {
				submitCalls += 1;
				return {
					data: { ...baseAttempt, status: 'submitted', percent: 24, passed: null },
					error: undefined
				};
			}
			throw new Error(`unexpected path ${path}`);
		}) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		dispatchResult({ type: 'rtapps:result', score: '1200', max: 5000 });

		// Give any (wrongly) triggered submit a tick to fire before asserting it didn't.
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(submitCalls).toBe(0);
	});

	// Scenario: a message with score as null (which Number() would coerce to 0).
	// Invariant: ignored — no submit call goes out, rejecting coercion of null.
	it('ignores a message with score as null', async () => {
		let submitCalls = 0;
		const post: Post = vi.fn(async (path: string) => {
			if (path === '/api/v1/activities/{activity_id}/attempts') {
				return { data: { ...baseAttempt, items: [] }, error: undefined };
			}
			if (path === '/api/v1/attempts/{attempt_id}/submit') {
				submitCalls += 1;
				return {
					data: { ...baseAttempt, status: 'submitted', percent: 24, passed: null },
					error: undefined
				};
			}
			throw new Error(`unexpected path ${path}`);
		}) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		dispatchResult({ type: 'rtapps:result', score: null, max: 5000 });

		// Give any (wrongly) triggered submit a tick to fire before asserting it didn't.
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(submitCalls).toBe(0);
	});

	// Scenario: a message with score as a boolean (which Number() would coerce to 0 or 1).
	// Invariant: ignored — no submit call goes out, rejecting coercion of booleans.
	it('ignores a message with score as a boolean', async () => {
		let submitCalls = 0;
		const post: Post = vi.fn(async (path: string) => {
			if (path === '/api/v1/activities/{activity_id}/attempts') {
				return { data: { ...baseAttempt, items: [] }, error: undefined };
			}
			if (path === '/api/v1/attempts/{attempt_id}/submit') {
				submitCalls += 1;
				return {
					data: { ...baseAttempt, status: 'submitted', percent: 24, passed: null },
					error: undefined
				};
			}
			throw new Error(`unexpected path ${path}`);
		}) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		dispatchResult({ type: 'rtapps:result', score: true, max: 5000 });

		// Give any (wrongly) triggered submit a tick to fire before asserting it didn't.
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(submitCalls).toBe(0);
	});

	// Scenario: submit rejects (e.g. a dropped network connection).
	// Invariant: the error text and a Retry button render; clicking Retry re-posts with the same
	// score and a fresh Idempotency-Key.
	it('shows an error and Retry button on submit failure, and retries with the same score', async () => {
		let submitCalls = 0;
		const idempotencyKeys: string[] = [];
		const post: Post = vi.fn(
			async (
				path: string,
				init?: { headers?: Record<string, string>; body?: { score: number } }
			) => {
				if (path === '/api/v1/activities/{activity_id}/attempts') {
					return { data: { ...baseAttempt, items: [] }, error: undefined };
				}
				if (path === '/api/v1/attempts/{attempt_id}/submit') {
					submitCalls += 1;
					idempotencyKeys.push(init?.headers?.['Idempotency-Key'] ?? '');
					expect(init?.body).toEqual({ score: 1200 });
					if (submitCalls === 1) {
						return { data: undefined, error: { title: 'Attempt already submitted' } };
					}
					return {
						data: { ...baseAttempt, status: 'submitted', percent: 24, passed: null },
						error: undefined
					};
				}
				throw new Error(`unexpected path ${path}`);
			}
		) as unknown as Post;

		await render(ExternalPlayer, { activityId: 'activity-1', snapshot, post });
		await waitForAttemptStart(post);

		dispatchResult({ type: 'rtapps:result', score: 1200, max: 5000 });

		await expect.element(page.getByRole('alert')).toHaveTextContent('Attempt already submitted');
		await page.getByRole('button', { name: 'Retry' }).click();

		await expect.element(page.getByLabelText('result')).toBeInTheDocument();
		expect(submitCalls).toBe(2);
		expect(idempotencyKeys[0]).not.toBe(idempotencyKeys[1]);
	});
});
