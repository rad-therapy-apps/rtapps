import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';
import ProseDoc from './ProseDoc.svelte';
import type { ProseDoc as Doc } from './types';

describe('ProseDoc', () => {
	it('renders every valid fixture without throwing', async () => {
		for (const doc of Object.values(fixtures.valid)) {
			const { container } = await render(ProseDoc, { doc: doc as Doc });
			expect(container.querySelector('.prose')).not.toBeNull();
		}
	});

	it('renders marks as real elements and https links only', async () => {
		await render(ProseDoc, { doc: fixtures.valid.paragraph_with_marks as Doc });
		await expect.element(page.getByText('rises')).toBeInTheDocument();
		const strong = page.getByText('rises');
		expect((await strong.element()).tagName).toBe('STRONG');
		const link = page.getByRole('link', { name: 'source' });
		await expect.element(link).toHaveAttribute('href', 'https://example.org/rbe');
		await expect.element(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('renders callout, table header and heading levels', async () => {
		await render(ProseDoc, { doc: fixtures.valid.callout_image_math as Doc });
		await expect.element(page.getByText('OER = 3.0')).toBeInTheDocument();
		await render(ProseDoc, { doc: fixtures.valid.table as Doc });
		await expect.element(page.getByRole('columnheader', { name: 'Part' })).toBeInTheDocument();
		await render(ProseDoc, { doc: fixtures.valid.heading_levels as Doc });
		await expect.element(page.getByRole('heading', { level: 4, name: 'H4' })).toBeInTheDocument();
	});

	it('throws on an unknown node type', async () => {
		const bad = { type: 'doc', content: [{ type: 'iframe' }] } as unknown as Doc;
		await expect(render(ProseDoc, { doc: bad })).rejects.toThrow(/Unknown prose node: iframe/);
	});

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
