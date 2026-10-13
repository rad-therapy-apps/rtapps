/**
 * What this file does: proves the author editor's extension set round-trips every shared prose
 * fixture unchanged — load `toEditor(doc)` into a real TipTap `Editor` built from
 * `authorExtensions()`, read it back with `fromEditor(editor.getJSON())`, expect the fixture.
 * Used here and why: a real Editor (browser project) because the TipTap schema, default attrs and
 * StarterKit members (e.g. v3's `trailingNode`) only show up when the editor parses content.
 * Written on TipTap 2 as the baseline for the TipTap 3 upgrade
 * (docs/specs/2026-10-13-tiptap-3-upgrade-design.md): it must pass unchanged on both.
 * How it fits the project: guards ADR-0003's closed prose schema at the editor boundary — saved
 * lesson JSON must not change because a library changed.
 * Depends on: `@tiptap/core`, `./extensions`, `./prosemap`, `@rtapps/schemas/fixtures/prose-doc.json`.
 * Used by: `pnpm --filter web test` (client project).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';
import { authorExtensions } from './extensions';
import { fromEditor, toEditor } from './prosemap';
import type { ProseDoc } from '../prose/types';

describe('authorExtensions', () => {
	let editor: Editor | undefined;
	afterEach(() => {
		editor?.destroy();
		editor = undefined;
	});

	function load(doc: ProseDoc): Editor {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: authorExtensions(),
			content: toEditor(doc)
		});
		return editor;
	}

	// Scenario: every schema-valid fixture, loaded into the editor and read straight back.
	// Invariant: the saved ProseDoc is exactly the fixture — no added nodes (e.g. a trailing
	// paragraph), no dropped or defaulted attrs, no reordered content.
	for (const [name, doc] of Object.entries(fixtures.valid)) {
		it(`round-trips the "${name}" fixture unchanged`, () => {
			const out = fromEditor(load(doc as ProseDoc).getJSON());
			expect(out).toEqual(doc);
		});
	}

	// Scenario: HTML with a non-https link is pasted/inserted (the schema only allows ^https://).
	// Invariant: the editor drops the link mark (keeping the text) instead of carrying a link the
	// API would reject with a 422 on save. `isAllowedUri` applies to HTML parsing (paste,
	// insertContent) and to setLink/toggleLink, but not to JSON loaded via `content`; JSON from the
	// API is already https-only via the schema.
	it('drops non-https links in pasted HTML', () => {
		const doc = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'start' }] }]
		} as unknown as ProseDoc;
		const ed = load(doc);
		ed.commands.insertContent('<p>see <a href="http://example.com">here</a></p>');
		const json = JSON.stringify(ed.getJSON());
		expect(json).toContain('here');
		expect(json).not.toContain('http://example.com');
	});

	it('keeps https links in pasted HTML', () => {
		const doc = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'start' }] }]
		} as unknown as ProseDoc;
		const ed = load(doc);
		ed.commands.insertContent('<p>see <a href="https://example.com">here</a></p>');
		expect(JSON.stringify(ed.getJSON())).toContain('https://example.com');
	});

	// Scenario: a callout with a non-default kind.
	// Invariant: the kind survives the round trip (the only fixture callout uses the default).
	it('round-trips a non-default callout kind', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'callout',
					attrs: { kind: 'warning' },
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mind the dose' }] }]
				}
			]
		} as unknown as ProseDoc;
		expect(fromEditor(load(doc).getJSON())).toEqual(doc);
	});

	// Guard: the round-trip loop above really covers every expected fixture.
	it('loads the expected fixtures', () => {
		expect(Object.keys(fixtures.valid)).toEqual([
			'paragraph_with_marks',
			'heading_levels',
			'lists_and_quote',
			'table',
			'callout_image_math',
			'empty_paragraph'
		]);
	});
});
