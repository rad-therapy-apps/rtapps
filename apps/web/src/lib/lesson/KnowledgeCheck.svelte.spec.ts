/**
 * What this file does: component-level tests for `KnowledgeCheck.svelte` — button
 * enable/disable, a successful grade, and a failed grade.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) so `page.getByRole`/`bind:group` radio behaviour is exercised
 * for real, not simulated; the `post` prop is replaced with a `vi.fn` fake so no real network
 * call happens and the exact request body can be asserted.
 * How it fits the project: covers the client half of ADR-0004's item-grading call
 * (`POST /api/v1/attempts/{attempt_id}/items`) and the RFC 9457 `error.title` fallback path
 * documented in the component itself.
 * Depends on: `./KnowledgeCheck.svelte`, `./types` (`KnowledgeCheckBlock`), `@rtapps/api-client`
 * (`ItemGradeOut`), vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type ComponentProps } from 'svelte';
import KnowledgeCheck from './KnowledgeCheck.svelte';
import type { KnowledgeCheckBlock } from './types';
import type { components } from '@rtapps/api-client';

type ItemGradeOut = components['schemas']['ItemGradeOut'];
type Post = NonNullable<ComponentProps<typeof KnowledgeCheck>['post']>;

// Shared fixture question used by all three tests below.
const block: KnowledgeCheckBlock = {
	type: 'knowledge_check',
	key: 'lq_page2_1',
	question_id: 'q-1',
	stem: {
		type: 'doc',
		content: [
			{ type: 'paragraph', content: [{ type: 'text', text: 'What happens as LET increases?' }] }
		]
	},
	body: { type: 'single_choice', options: ['Option A', 'Option B'] }
};

describe('KnowledgeCheck', () => {
	// Scenario: no option selected yet.
	// Invariant: "Check answer" is disabled until a radio is picked, then enabled.
	it('disables the button until a radio is chosen', async () => {
		// `Post` is a generic overloaded signature (openapi-fetch's `ClientMethod`); `vi.fn<Post>`
		// can't infer a matching concrete implementation, so the fake is built untyped and cast
		// once to the real prop type instead of widening the prop itself.
		const post: Post = vi.fn(async () => ({
			data: undefined,
			error: undefined
		})) as unknown as Post;
		await render(KnowledgeCheck, { block, attemptId: 'attempt-1', post });

		const button = page.getByRole('button', { name: 'Check answer' });
		await expect.element(button).toBeDisabled();

		await page.getByRole('radio', { name: 'Option B' }).click();
		await expect.element(button).not.toBeDisabled();
	});

	// Scenario: the server grades the choice as correct and returns an explanation.
	// Invariant: the exact request body is sent, and "Correct" plus the explanation render, with
	// the button relabelled "Check again".
	it('grades the chosen option and shows the result', async () => {
		const result: ItemGradeOut = {
			item_key: 'lq_page2_1',
			correct: true,
			score: 1,
			max_score: 1,
			explanation: {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Because overkill.' }] }]
			}
		};
		const post: Post = vi.fn(async () => ({ data: result, error: undefined })) as unknown as Post;

		await render(KnowledgeCheck, { block, attemptId: 'attempt-1', post });

		await page.getByRole('radio', { name: 'Option B' }).click();
		await page.getByRole('button', { name: 'Check answer' }).click();

		expect(post).toHaveBeenCalledWith('/api/v1/attempts/{attempt_id}/items', {
			params: { path: { attempt_id: 'attempt-1' } },
			body: { item_key: 'lq_page2_1', response: { choice: 1 } }
		});

		await expect.element(page.getByText('Correct')).toBeInTheDocument();
		await expect.element(page.getByText('Because overkill.')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
	});

	// Scenario: the API returns an RFC 9457 problem body with a `title` (e.g. attempt already submitted).
	// Invariant: that `title` is shown as the error message.
	it('shows an error message when the request fails', async () => {
		const post: Post = vi.fn(async () => ({
			data: undefined,
			error: { title: 'Attempt already submitted' }
		})) as unknown as Post;
		await render(KnowledgeCheck, { block, attemptId: 'attempt-1', post });

		await page.getByRole('radio', { name: 'Option A' }).click();
		await page.getByRole('button', { name: 'Check answer' }).click();

		await expect.element(page.getByText('Attempt already submitted')).toBeInTheDocument();
	});
});
