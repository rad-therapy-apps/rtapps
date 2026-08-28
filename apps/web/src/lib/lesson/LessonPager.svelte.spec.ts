import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { type ComponentProps } from 'svelte';
import LessonPager from './LessonPager.svelte';
import type { LessonSnapshot } from './types';
import type { components } from '@rtapps/api-client';

type LessonOut = components['schemas']['LessonOut'];
type AttemptOut = components['schemas']['AttemptOut'];
type ItemGradeOut = components['schemas']['ItemGradeOut'];
type Post = NonNullable<ComponentProps<typeof LessonPager>['post']>;

const snapshot: LessonSnapshot = {
	activity: { id: 'activity-1', kind: 'lesson', title: 'RBE and OER', config: {} },
	lesson: {
		id: 'lesson-1',
		slug: 'rbe-and-oer',
		title: 'RBE and OER',
		subject: { slug: 'radiation-biology', title: 'Radiation Biology' },
		pages: [
			{
				order: 1,
				title: 'Page one',
				blocks: [
					{
						type: 'rich_text',
						body: {
							type: 'doc',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Page one intro.' }] }]
						}
					}
				]
			},
			{
				order: 2,
				title: 'Page two',
				blocks: [
					{
						type: 'rich_text',
						body: {
							type: 'doc',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Page two intro.' }] }]
						}
					},
					{
						type: 'knowledge_check',
						key: 'k2',
						question_id: 'q-2',
						stem: {
							type: 'doc',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'Page two question.' }] }
							]
						},
						body: { type: 'single_choice', options: ['A', 'B'] }
					}
				]
			},
			{
				order: 3,
				title: 'Page three',
				blocks: [
					{
						type: 'rich_text',
						body: {
							type: 'doc',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'Page three intro.' }] }
							]
						}
					},
					{
						type: 'knowledge_check',
						key: 'k3',
						question_id: 'q-3',
						stem: {
							type: 'doc',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'Page three question.' }] }
							]
						},
						body: { type: 'single_choice', options: ['C', 'D'] }
					}
				]
			}
		]
	}
};

const lesson: LessonOut = {
	activity_id: 'activity-1',
	content_version_id: 'content-version-1',
	snapshot: snapshot as unknown as Record<string, unknown>
};

const attempt: AttemptOut = {
	id: 'attempt-1',
	activity_id: 'activity-1',
	content_version_id: 'content-version-1',
	status: 'in_progress',
	started_at: '2026-08-25T00:00:00Z',
	submitted_at: null,
	score: null,
	max_score: null,
	percent: null,
	passed: null
};

function gradeFor(key: string, choice: number): ItemGradeOut {
	return {
		item_key: key,
		correct: choice === 1,
		score: choice === 1 ? 1 : 0,
		max_score: 1,
		explanation: null
	};
}

describe('LessonPager', () => {
	it('does not leak a graded result into a different page and restores it when returning', async () => {
		// `Post` is a generic overloaded signature (openapi-fetch's `ClientMethod`); `vi.fn<Post>`
		// can't infer a matching concrete implementation, so the fake is built untyped and cast
		// once to the real prop type instead of widening the prop itself.
		const post: Post = vi.fn(
			async (_path: string, init: { body: { item_key: string; response: { choice: number } } }) => {
				return { data: gradeFor(init.body.item_key, init.body.response.choice), error: undefined };
			}
		) as unknown as Post;

		await render(LessonPager, { lesson, attempt, post });

		await expect.element(page.getByText('Page 1 of 3')).toBeInTheDocument();

		await page.getByRole('button', { name: 'Next' }).click();
		await expect.element(page.getByText('Page 2 of 3')).toBeInTheDocument();

		await page.getByRole('radio', { name: 'B' }).click();
		await page.getByRole('button', { name: 'Check answer' }).click();
		await expect.element(page.getByText('Correct')).toBeInTheDocument();

		await page.getByRole('button', { name: 'Next' }).click();
		await expect.element(page.getByText('Page 3 of 3')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Finish lesson' })).toBeInTheDocument();

		await expect.element(page.getByText('Correct')).not.toBeInTheDocument();
		expect(document.querySelector('input[type="radio"]:checked')).toBeNull();

		await page.getByRole('button', { name: 'Previous' }).click();
		await expect.element(page.getByText('Page 2 of 3')).toBeInTheDocument();
		await expect.element(page.getByText('Correct')).toBeInTheDocument();
	});

	it('shows the Finish button only on the last page', async () => {
		const post: Post = vi.fn(async () => ({
			data: undefined,
			error: undefined
		})) as unknown as Post;
		await render(LessonPager, { lesson, attempt, post });

		await expect
			.element(page.getByRole('button', { name: 'Finish lesson' }))
			.not.toBeInTheDocument();

		await page.getByRole('button', { name: 'Next' }).click();
		await expect
			.element(page.getByRole('button', { name: 'Finish lesson' }))
			.not.toBeInTheDocument();

		await page.getByRole('button', { name: 'Next' }).click();
		await expect.element(page.getByRole('button', { name: 'Finish lesson' })).toBeInTheDocument();
	});
});
