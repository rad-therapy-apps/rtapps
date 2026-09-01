/**
 * What this file does: component-level tests for `LessonPager.svelte` — page-scoped grading
 * state and the Finish-button visibility across a three-page lesson.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) so navigation between pages and the `{#key pageIndex}` remount
 * behaviour are exercised for real; the `post` prop is replaced with a `vi.fn` fake that grades
 * based on the request body, so no real network call happens.
 * How it fits the project: the first test is the regression check for the
 * `{#key pageIndex}` remount in `LessonPager.svelte` — it proves a graded result doesn't leak
 * into another page's DOM, and that returning to a page still shows its own earlier result
 * (`gradedResults`, ADR-0004's per-item grading). The second test covers the Finish button only
 * appearing on the last page.
 * Depends on: `./LessonPager.svelte`, `./types` (`LessonSnapshot`), `@rtapps/api-client`,
 * vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
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

// Three-page fixture: page 1 has no knowledge check, pages 2 and 3 each have one, so the tests
// below can navigate through a page with nothing to grade and confirm state isolation between the two graded pages.
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

// `LessonOut.snapshot` is typed as an opaque object by the generated schema (ADR-0003); the cast
// here mirrors what `lessonSnapshot()` does at runtime, so the component receives the same shape it would in production.
const lesson: LessonOut = {
	activity_id: 'activity-1',
	content_version_id: 'content-version-1',
	snapshot: snapshot as unknown as Record<string, unknown>
};

// A freshly started attempt (as `+page.server.ts`'s `load` would hand to the component), not yet submitted.
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
	passed: null,
	// Task 5 made `items` a required field on AttemptOut (attempt resume); a fresh attempt has none.
	items: []
};

// Builds a fake grading result matching the fake `post` below: choice 1 ("B"/"D") is always correct.
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
	// Scenario: grade the knowledge check on page 2, navigate to page 3 (no grading), then back to page 2.
	// Invariant: page 3 never shows page 2's "Correct" result or a checked radio (the `{#key pageIndex}`
	// remount), and returning to page 2 restores its own result from `gradedResults`.
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

	// Scenario: walk from page 1 through page 3 of the fixture lesson.
	// Invariant: "Finish lesson" is absent on pages 1 and 2 and appears only once page 3 is reached.
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
