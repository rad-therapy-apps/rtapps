/**
 * What this file does: DOM-level tests for the ProseDoc/ProseNode/ProseInline renderer, using
 * the same fixture set the schema tests validate against.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`) because these assertions need real elements/roles/attributes,
 * not just a rendered string — `page.getByRole`/`getByText` come from `vitest/browser`.
 * How it fits the project: proves ADR-0003's core security claim (no `{@html}`, so pasted HTML
 * in text renders as literal text, never as markup) and exercises every node/mark type the
 * closed schema allows. Shares fixtures with `schema.test.ts` so "valid per schema" and
 * "rendered by ProseDoc" never drift apart.
 * Depends on: `@rtapps/schemas/fixtures/prose-doc.json`, `./ProseDoc.svelte`, `./types`,
 * vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';
import ProseDoc from './ProseDoc.svelte';
import type { ProseDoc as Doc } from './types';

describe('ProseDoc', () => {
	// Scenario: every fixture the shared schema considers valid.
	// Invariant: none of them throw during render (schema-valid implies renderer-safe).
	it('renders every valid fixture without throwing', async () => {
		for (const doc of Object.values(fixtures.valid)) {
			const { container } = await render(ProseDoc, { doc: doc as Doc });
			expect(container.querySelector('.prose')).not.toBeNull();
		}
	});

	// Scenario: a paragraph with a bold mark and an https link.
	// Invariant: bold becomes a real <strong> element, and the link keeps rel="noopener noreferrer".
	it('renders marks as real elements and https links only', async () => {
		await render(ProseDoc, { doc: fixtures.valid.paragraph_with_marks as Doc });
		await expect.element(page.getByText('rises')).toBeInTheDocument();
		const strong = page.getByText('rises');
		expect((await strong.element()).tagName).toBe('STRONG');
		const link = page.getByRole('link', { name: 'source' });
		await expect.element(link).toHaveAttribute('href', 'https://example.org/rbe');
		await expect.element(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	// Scenario: callout/image/math, a table header cell, and a heading at each allowed level.
	// Invariant: each renders its expected element/role/text.
	it('renders callout, table header and heading levels', async () => {
		await render(ProseDoc, { doc: fixtures.valid.callout_image_math as Doc });
		await expect.element(page.getByText('OER = 3.0')).toBeInTheDocument();
		await render(ProseDoc, { doc: fixtures.valid.table as Doc });
		await expect.element(page.getByRole('columnheader', { name: 'Part' })).toBeInTheDocument();
		await render(ProseDoc, { doc: fixtures.valid.heading_levels as Doc });
		await expect.element(page.getByRole('heading', { level: 4, name: 'H4' })).toBeInTheDocument();
	});

	// Scenario: a node type not in the closed schema (`iframe`).
	// Invariant: rendering throws with a message naming the offending type, rather than rendering it.
	it('throws on an unknown node type', async () => {
		const bad = { type: 'doc', content: [{ type: 'iframe' }] } as unknown as Doc;
		await expect(render(ProseDoc, { doc: bad })).rejects.toThrow(/Unknown prose node: iframe/);
	});

	// Scenario: rerendering the same ProseDoc instance with a document that adds a bold mark and an image.
	// Invariant: the new mark/image show up after rerender ($props stay reactive, nothing stale from the first render).
	it('keeps marks and images reactive across a rerender', async () => {
		const docA: Doc = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'LET' }] }]
		};
		const docB: Doc = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'LET', marks: [{ type: 'bold' }] }] },
				{ type: 'image', attrs: { mediaAssetId: 'fig1', alt: 'figure' } }
			]
		};

		const screen = await render(ProseDoc, { doc: docA });
		await expect.element(page.getByText('LET')).toBeInTheDocument();
		expect(screen.container.querySelector('strong')).toBeNull();

		await screen.rerender({ doc: docB, images: { fig1: '/fig1.png' } });

		const strong = page.getByText('LET');
		await expect.element(strong).toBeInTheDocument();
		expect((await strong.element()).tagName).toBe('STRONG');
		const img = screen.container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.getAttribute('src')).toBe('/fig1.png');
	});

	// Scenario: a text run whose literal content looks like an HTML injection payload.
	// Invariant: it renders as visible text, and no <img> element is ever created — the ADR-0003 no-{@html} guarantee.
	it('never injects HTML from text', async () => {
		const doc: Doc = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: '<img src=x onerror=alert(1)>' }]
				}
			]
		};
		await render(ProseDoc, { doc });
		await expect.element(page.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
