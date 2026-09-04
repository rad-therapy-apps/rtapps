/**
 * What this file does: component-level tests for `LessonEditor.svelte` — editing a
 * knowledge-check option/answer and saving, a 422 save failure, add/move/delete block operations
 * (including the last-block-in-a-page delete guard), and a page reorder, all asserted against the
 * exact PUT body a fake `put` receives.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) since a rich-text block mounts a real TipTap editor;
 * `window.confirm` is stubbed to auto-accept (Playwright otherwise auto-dismisses native dialogs,
 * which would make every delete/move-adjacent confirm silently no-op) so the delete-block
 * assertions are reachable. `put` is a `vi.fn` fake (same injectable-client pattern as
 * `$lib/activity/attempts.test.ts`'s `post`), so the emitted `PagesIn` body can be asserted
 * without a network call. The third test's scenario was rewritten from an earlier version that
 * deleted a page's only block and asserted a `blocks: []` PUT as success — the API's
 * `PageImport.blocks` requires min_length=1, so that PUT would actually 422; the delete-block
 * control now disables itself for a lone block instead (mirroring
 * `KnowledgeCheckForm`'s min-2-options remove-option guard), which this test asserts.
 * How it fits the project: the component half of Task 15's lesson editor test plan (`uploadImage`
 * has its own pure-function test; `KnowledgeCheckForm`/`RichTextEditor` are exercised here through
 * `LessonEditor` rather than in isolation, since the scenarios the brief asks for — save,
 * dirty-clearing, 422, reordering — are all about `LessonEditor`'s own state).
 * Depends on: `./LessonEditor.svelte`, `./api` (`api`, for the `put` fake's type), `./types`
 * (`AuthorPage`), vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import LessonEditor from './LessonEditor.svelte';
import type { api } from './api';
import type { AuthorPage } from './types';
import type { ProseDoc } from '../prose/types';
import type { components } from '@rtapps/api-client';

type PutFn = typeof api.PUT;
type PagesIn = components['schemas']['PagesIn'];
// `PutFn` is a generic overloaded signature (openapi-fetch's `ClientMethod`); `vi.fn` can't infer
// a matching concrete implementation for it (same issue `attempts.test.ts` documents for
// `PostFn`), so each fake is built as a plain 0-arg async function and cast once to `PutFn` for
// the prop. `SaveCall` re-types what `.mock.calls[0]` actually receives at runtime, for the tests
// that need to inspect the exact PUT body rather than just assert it was called.
type SaveCall = [string, { params: { path: { lesson_id: string } }; body: PagesIn }];

const emptyDoc: ProseDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
const originalDoc: ProseDoc = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original' }] }]
};

// A fresh two-page fixture per test: page 1 has one knowledge_check block, page 2 has one
// rich_text block with distinguishing content (so reorder assertions don't rely on typing).
function fixture(): AuthorPage[] {
	return [
		{
			title: 'Page 1',
			blocks: [
				{
					type: 'knowledge_check',
					key: 'kc_aaaaaaaa',
					stem: emptyDoc,
					options: ['Alpha', 'Beta'],
					answer: 0,
					explanation: null
				}
			]
		},
		{ title: 'Page 2', blocks: [{ type: 'rich_text', body: originalDoc }] }
	];
}

// Structural helpers: elements are located by position/class (button text repeats across blocks),
// same approach RichTextEditor.svelte.spec.ts uses for the ProseMirror surface.
function pages(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>('.page')];
}
function blocks(page: HTMLElement): HTMLElement[] {
	return [...page.querySelectorAll<HTMLElement>('.block')];
}
function blockControls(block: HTMLElement): HTMLButtonElement[] {
	return [...block.querySelectorAll<HTMLButtonElement>('.block-controls button')];
}
function saveButton(container: HTMLElement): HTMLButtonElement {
	const el = container.querySelector<HTMLButtonElement>('.save-controls button');
	if (!el) throw new Error('save button not found');
	return el;
}

beforeEach(() => {
	// Playwright auto-dismisses native dialogs unless handled; stubbed to auto-accept so
	// delete/confirm flows below are actually reachable.
	vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('LessonEditor', () => {
	// Scenario: edit a knowledge-check option's text and pick a different correct answer, then save.
	// Invariant: the PUT body carries both changes, and the Save button (disabled while clean)
	// disables again once the save succeeds — dirty cleared.
	it('saves an edited option/answer and clears dirty', async () => {
		// `putMock` keeps its vi.fn type for `.mock.calls` access below; `put` (cast to the real
		// generic `openapi-fetch` signature) is what actually gets passed as the prop.
		const putMock = vi.fn(async () => ({ data: {}, error: undefined }));
		const put = putMock as unknown as PutFn;
		const { container } = await render(LessonEditor, {
			lessonId: 'lesson-1',
			initialPages: fixture(),
			put
		});

		const kcBlock = blocks(pages(container)[0])[0];
		const optionInputs = [
			...kcBlock.querySelectorAll<HTMLInputElement>('.option input[type=text]')
		];
		const optionRadios = [
			...kcBlock.querySelectorAll<HTMLInputElement>('.option input[type=radio]')
		];

		await userEvent.fill(optionInputs[0], 'Alpha edited');
		await userEvent.click(optionRadios[1]);

		const save = saveButton(container);
		expect(save).not.toBeDisabled();
		await userEvent.click(save);

		expect(putMock).toHaveBeenCalledTimes(1);
		const [path, init] = putMock.mock.calls[0] as unknown as SaveCall;
		expect(path).toBe('/api/v1/authoring/lessons/{lesson_id}/pages');
		expect(init.params).toEqual({ path: { lesson_id: 'lesson-1' } });
		expect(init.body.pages[0].blocks[0]).toEqual({
			type: 'knowledge_check',
			key: 'kc_aaaaaaaa',
			stem: emptyDoc,
			options: ['Alpha edited', 'Beta'],
			answer: 1,
			explanation: null
		});

		await expect.element(save).toBeDisabled();
	});

	// Scenario: the save PUT fails with a 422 problem body.
	// Invariant: the error banner shows the field path + message, and the Save button stays
	// enabled — dirty is never cleared on failure.
	it('shows the 422 problem detail and keeps dirty on save failure', async () => {
		const put = vi.fn(async () => ({
			data: undefined,
			error: {
				title: 'Validation failed',
				errors: [{ loc: ['body', 'pages', 0, 'blocks', 0, 'answer'], msg: 'field required' }]
			}
		})) as unknown as PutFn;
		const { container } = await render(LessonEditor, {
			lessonId: 'lesson-1',
			initialPages: fixture(),
			put
		});

		// Trivial edit to mark the editor dirty (retitle page 1).
		const titleInput = pages(container)[0].querySelector<HTMLInputElement>('input');
		if (!titleInput) throw new Error('page title input not found');
		await userEvent.fill(titleInput, 'Renamed page');

		await userEvent.click(saveButton(container));

		const banner = container.querySelector('[role=alert]');
		expect(banner?.textContent).toContain('body.pages.0.blocks.0.answer');
		expect(banner?.textContent).toContain('field required');
		await expect.element(saveButton(container)).not.toBeDisabled();
	});

	// Scenario: add a rich_text block to page 2, move it above the original block, then delete one
	// of page 2's now-two blocks, and save.
	// Invariant: a page's *only* block can't be deleted (the API's PageImport.blocks requires
	// min_length=1 -- the scenario this replaces used to delete page 1's only block and assert a
	// `blocks: []` PUT as success, which would now 422). Page 1's lone knowledge_check block's
	// delete control is disabled instead, and page 1's blocks are untouched in the saved body.
	// Page 2's delete (of one of its two blocks) still goes through, leaving the remaining block in
	// the saved body.
	it("disables deleting a page's last block and reflects add/move/delete ordering otherwise", async () => {
		const putMock = vi.fn(async () => ({ data: {}, error: undefined }));
		const put = putMock as unknown as PutFn;
		const { container } = await render(LessonEditor, {
			lessonId: 'lesson-1',
			initialPages: fixture(),
			put
		});

		const page1Block = blocks(pages(container)[0])[0];
		expect(blockControls(page1Block)[2]).toBeDisabled();

		const page2 = pages(container)[1];
		const addTextBlock = page2.querySelector<HTMLButtonElement>('.add-block-controls button');
		if (!addTextBlock) throw new Error('add text block button not found');
		await userEvent.click(addTextBlock); // page 2: [original, new-empty]

		const newBlock = blocks(page2)[1];
		await userEvent.click(blockControls(newBlock)[0]); // move up -> [new-empty, original]

		const page2Blocks = blocks(page2);
		expect(blockControls(page2Blocks[0])[2]).not.toBeDisabled();
		await userEvent.click(blockControls(page2Blocks[0])[2]); // delete new-empty (confirm stubbed true)

		await userEvent.click(saveButton(container));

		expect(putMock).toHaveBeenCalledTimes(1);
		const [, init] = putMock.mock.calls[0] as unknown as SaveCall;
		const body = init.body;
		expect(body.pages[0].blocks).toEqual([
			{
				type: 'knowledge_check',
				key: 'kc_aaaaaaaa',
				stem: emptyDoc,
				options: ['Alpha', 'Beta'],
				answer: 0,
				explanation: null
			}
		]);
		expect(body.pages[1].blocks).toEqual([{ type: 'rich_text', body: originalDoc }]);
	});

	// Scenario: swap the two pages via `movePage` (page 1's "Move page down" control), then save.
	// Invariant: the saved body reflects the new page order. This is a cheap ordering guard for the
	// outer `{#each pages as page, pi (page.instanceId)}` keying fix -- it exercises movePage's state
	// mutation, though proving the *DOM identity* (no RichTextEditor remount) that motivated keying
	// on instanceId over array index would need a mount-count/cursor-preservation assertion, which
	// isn't cheap here.
	it('reflects a page reorder in the saved body ordering', async () => {
		const putMock = vi.fn(async () => ({ data: {}, error: undefined }));
		const put = putMock as unknown as PutFn;
		const { container } = await render(LessonEditor, {
			lessonId: 'lesson-1',
			initialPages: fixture(),
			put
		});

		const page1Controls =
			pages(container)[0].querySelectorAll<HTMLButtonElement>('.page-controls button');
		await userEvent.click(page1Controls[1]); // "Move page down" -> [Page 2, Page 1]

		await userEvent.click(saveButton(container));

		expect(putMock).toHaveBeenCalledTimes(1);
		const [, init] = putMock.mock.calls[0] as unknown as SaveCall;
		const body = init.body;
		expect(body.pages[0]).toEqual({
			title: 'Page 2',
			blocks: [{ type: 'rich_text', body: originalDoc }]
		});
		expect(body.pages[1]).toEqual({
			title: 'Page 1',
			blocks: [
				{
					type: 'knowledge_check',
					key: 'kc_aaaaaaaa',
					stem: emptyDoc,
					options: ['Alpha', 'Beta'],
					answer: 0,
					explanation: null
				}
			]
		});
	});
});
