import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type ComponentProps } from 'svelte';
import KnowledgeCheck from './KnowledgeCheck.svelte';
import type { KnowledgeCheckBlock } from './types';
import type { components } from '@rtapps/api-client';

type ItemGradeOut = components['schemas']['ItemGradeOut'];
type Post = NonNullable<ComponentProps<typeof KnowledgeCheck>['post']>;

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
