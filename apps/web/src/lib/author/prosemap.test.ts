/**
 * What this file does: the load-bearing round-trip test for `prosemap.ts` — a fixture doc
 * exercising every node and mark the closed prose schema allows, asserting
 * `fromEditor(toEditor(FIXTURE))` deep-equals `FIXTURE`, plus targeted shape assertions for the
 * `toEditor` direction's table-header and image translations.
 * Used here and why: vitest `server` project (pure functions, no DOM/editor instantiation — that
 * belongs to `RichTextEditor.svelte.spec.ts`); `Ajv2020` + `ajv-formats` (same setup as
 * `../prose/schema.test.ts`) validates `FIXTURE` itself against the schema first, so the fixture
 * can't silently drift from what the schema actually allows.
 * How it fits the project: proves the Task 14 invariant that makes the TipTap editor safe to
 * round-trip through — every document the editor can produce, once mapped back through
 * `fromEditor`, is still exactly the document the schema describes.
 * Depends on: `./prosemap`, `ajv/dist/2020`, `ajv-formats`, `@rtapps/schemas/prose-doc.schema.json`.
 * Used by: `pnpm --filter web test` (vitest `server` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@rtapps/schemas/prose-doc.schema.json';
import { toEditor, fromEditor } from './prosemap';
import type { ProseDoc } from '../prose/types';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// Exercises every node type (paragraph, heading 2/3/4, bulletList/orderedList/listItem,
// blockquote, callout x3 kinds plus one nesting a bulletList (content is `block+`, not just
// paragraph), table with a header row and a plain row, image, math, hardBreak) and every mark
// type (bold, italic, underline, code, subscript, superscript, link, and a two-mark combination)
// the closed schema allows.
const FIXTURE: ProseDoc = {
	type: 'doc',
	content: [
		{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2 heading' }] },
		{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3 heading' }] },
		{ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'H4 heading' }] },
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
				{ type: 'text', text: ' italic', marks: [{ type: 'italic' }] },
				{ type: 'text', text: ' underline', marks: [{ type: 'underline' }] },
				{ type: 'text', text: ' code', marks: [{ type: 'code' }] },
				{ type: 'text', text: ' sub', marks: [{ type: 'subscript' }] },
				{ type: 'text', text: ' sup', marks: [{ type: 'superscript' }] },
				{ type: 'hardBreak' },
				{ type: 'text', text: 'bold+italic', marks: [{ type: 'bold' }, { type: 'italic' }] },
				{
					type: 'text',
					text: 'source',
					marks: [{ type: 'link', attrs: { href: 'https://example.org/rbe' } }]
				},
				{ type: 'math', attrs: { src: 'E = mc^2' } }
			]
		},
		{
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'bullet item' }] }]
				}
			]
		},
		{
			type: 'orderedList',
			content: [
				{
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ordered item' }] }]
				}
			]
		},
		{
			type: 'blockquote',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quoted' }] }]
		},
		{
			type: 'callout',
			attrs: { kind: 'key-principle' },
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'key principle' }] }]
		},
		{
			type: 'callout',
			attrs: { kind: 'clinical-note' },
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'clinical note' }] }]
		},
		{
			type: 'callout',
			attrs: { kind: 'warning' },
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'warning' }] }]
		},
		{
			// Callout content is `block+` (not just paragraph): a callout nesting a bulletList,
			// left untested until now (Task 14 review follow-up).
			type: 'callout',
			attrs: { kind: 'key-principle' },
			content: [
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nested bullet' }] }]
						}
					]
				}
			]
		},
		{
			type: 'table',
			content: [
				{
					type: 'tableRow',
					content: [
						{
							type: 'tableCell',
							attrs: { header: true },
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Part' }] }]
						}
					]
				},
				{
					type: 'tableRow',
					content: [
						{
							type: 'tableCell',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cathode' }] }]
						}
					]
				}
			]
		},
		{
			type: 'image',
			attrs: { mediaAssetId: '0190f4a6-1c2b-7d3e-8f4a-5b6c7d8e9f01', alt: 'a figure' }
		}
	]
};

describe('prosemap', () => {
	// Scenario: the fixture above, checked against the schema itself.
	// Invariant: it's a valid document per `prose-doc.schema.json` — otherwise the round-trip
	// test below would be exercising a shape the editor never legitimately has to handle.
	it('FIXTURE is valid per the closed prose schema', () => {
		expect(validate(FIXTURE), JSON.stringify(validate.errors)).toBe(true);
	});

	// Scenario: FIXTURE through toEditor then back through fromEditor.
	// Invariant: the load-bearing round-trip — the result deep-equals the original, and is
	// itself still schema-valid (fromEditor must never invent a shape the schema rejects).
	it('fromEditor(toEditor(FIXTURE)) deep-equals FIXTURE', () => {
		const roundTripped = fromEditor(toEditor(FIXTURE));
		expect(roundTripped).toEqual(FIXTURE);
		expect(validate(roundTripped), JSON.stringify(validate.errors)).toBe(true);
	});

	// Scenario: a header table cell, in the toEditor direction.
	// Invariant: our `tableCell{attrs:{header:true}}` becomes TipTap's distinct `tableHeader`
	// node (no `attrs` on it — TipTap fills in its own colspan/rowspan/colwidth defaults).
	it('toEditor maps a header tableCell to a tableHeader node', () => {
		// Index 11: shifted by one from the extra callout fixture entry added above.
		const cell = toEditor(FIXTURE).content?.[11].content?.[0].content?.[0];
		expect(cell).toEqual({
			type: 'tableHeader',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Part' }] }]
		});
	});

	// Scenario: a plain (non-header) table cell, in the toEditor direction.
	// Invariant: passes through unchanged as `tableCell`.
	it('toEditor leaves a plain tableCell as tableCell', () => {
		const cell = toEditor(FIXTURE).content?.[11].content?.[1].content?.[0];
		expect(cell).toEqual({
			type: 'tableCell',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cathode' }] }]
		});
	});

	// Scenario: the image node, in the toEditor direction.
	// Invariant: `mediaAssetId`/`alt` pass through unchanged (the custom AuthorImage extension
	// keeps our attr names, so this is a pure passthrough, not a translation).
	it('toEditor passes the image node through with the same attrs', () => {
		const image = toEditor(FIXTURE).content?.at(-1);
		expect(image).toEqual({
			type: 'image',
			attrs: { mediaAssetId: '0190f4a6-1c2b-7d3e-8f4a-5b6c7d8e9f01', alt: 'a figure' }
		});
	});
});
