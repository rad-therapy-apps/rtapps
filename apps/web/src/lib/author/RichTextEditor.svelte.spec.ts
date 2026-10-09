/**
 * What this file does: component-level tests for `RichTextEditor.svelte` — typing produces a
 * schema-valid emitted doc, the Bold toolbar button applies the mark, the callout toolbar
 * inserts a real `callout` node, and an `http://` link is rejected with a visible error and no
 * mark applied.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) since TipTap needs a real contenteditable DOM; `userEvent` (not
 * just `page`) for keyboard typing and triple-click text selection inside the editor surface.
 * Every emitted doc is checked against `prose-doc.schema.json` with the same `Ajv2020` setup as
 * `../prose/schema.test.ts`/`./prosemap.test.ts`, so a bug that lets an editor-only shape leak
 * through `fromEditor` fails here even if the round-trip test's fixture didn't happen to cover it.
 * How it fits the project: the component half of Task 14's test plan (`prosemap.test.ts` covers
 * the pure mapping layer; this covers the editor + toolbar wired together).
 * Depends on: `./RichTextEditor.svelte`, `ajv/dist/2020`, `ajv-formats`,
 * `@rtapps/schemas/prose-doc.schema.json`, vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@rtapps/schemas/prose-doc.schema.json';
import RichTextEditor from './RichTextEditor.svelte';
import type { ProseDoc } from '../prose/types';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// A single empty paragraph — the minimal valid doc every test below starts from.
const emptyDoc: ProseDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

// Locates the ProseMirror contenteditable surface RichTextEditor mounts the Editor into.
function editable(container: HTMLElement): HTMLElement {
	const el = container.querySelector<HTMLElement>('.ProseMirror');
	if (!el) throw new Error('ProseMirror surface not found');
	return el;
}

// The doc from the most recent onchange call, asserting one actually happened.
function lastDoc(onchange: ReturnType<typeof vi.fn>): ProseDoc {
	expect(onchange).toHaveBeenCalled();
	return onchange.mock.calls.at(-1)?.[0] as ProseDoc;
}

describe('RichTextEditor', () => {
	// Scenario: typing into a fresh editor.
	// Invariant: `onchange` fires with a doc containing the typed text, and that doc is itself
	// valid per the closed prose schema (proves `fromEditor` never leaks an editor-only shape).
	it('typing text fires onchange with a schema-valid doc', async () => {
		const onchange = vi.fn();
		const { container } = await render(RichTextEditor, {
			doc: emptyDoc,
			label: 'Test editor',
			onchange
		});

		const el = editable(container);
		await userEvent.click(el);
		await userEvent.type(el, 'Hello world');

		const doc = lastDoc(onchange);
		expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
		expect(doc.content[0]).toMatchObject({
			type: 'paragraph',
			content: [{ type: 'text', text: 'Hello world' }]
		});
	});

	// Scenario: typing text, selecting it, then clicking the Bold toolbar button.
	// Invariant: the emitted doc's text run carries a `bold` mark.
	it('toggling Bold from the toolbar applies the mark', async () => {
		const onchange = vi.fn();
		const { container } = await render(RichTextEditor, {
			doc: emptyDoc,
			label: 'Test editor',
			onchange
		});

		const el = editable(container);
		await userEvent.click(el);
		await userEvent.type(el, 'bold me');
		await userEvent.tripleClick(el);
		await page.getByRole('button', { name: 'Bold' }).click();

		const doc = lastDoc(onchange);
		expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
		expect(doc.content[0]).toMatchObject({
			type: 'paragraph',
			content: [{ type: 'text', text: 'bold me', marks: [{ type: 'bold' }] }]
		});
	});

	// Scenario: typing text, then clicking the Callout toolbar button (default kind: key-principle).
	// Invariant: the emitted doc wraps the paragraph in a real `callout` node with that kind.
	it('inserting a callout wraps the current block in a callout node', async () => {
		const onchange = vi.fn();
		const { container } = await render(RichTextEditor, {
			doc: emptyDoc,
			label: 'Test editor',
			onchange
		});

		const el = editable(container);
		await userEvent.click(el);
		await userEvent.type(el, 'Key idea');
		await page.getByRole('button', { name: 'Callout' }).click();

		const doc = lastDoc(onchange);
		expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
		expect(doc.content[0]).toMatchObject({
			type: 'callout',
			attrs: { kind: 'key-principle' },
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Key idea' }] }]
		});
	});

	// Scenario: selecting typed text, entering an `http://` URL into the link prompt, and clicking Link.
	// Invariant: a visible error appears, and no link mark (or `<a>` element) is produced.
	it('rejects an http:// link with a visible error and no mark', async () => {
		const onchange = vi.fn();
		const { container } = await render(RichTextEditor, {
			doc: emptyDoc,
			label: 'Test editor',
			onchange
		});

		const el = editable(container);
		await userEvent.click(el);
		await userEvent.type(el, 'source');
		await userEvent.tripleClick(el);

		await userEvent.fill(page.getByLabelText('Link URL').element(), 'http://insecure.example');
		await page.getByRole('button', { name: 'Link' }).click();

		await expect.element(page.getByRole('alert')).toBeInTheDocument();
		expect(container.querySelector('.ProseMirror a')).toBeNull();
	});
});
