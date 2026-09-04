/**
 * What this file does: pure functions mapping between our closed prose schema JSON
 * (`packages/schemas/prose-doc.schema.json`, typed as `ProseDoc` in `../prose/types`) and
 * TipTap's `JSONContent` document shape — `toEditor` for loading a doc into the editor,
 * `fromEditor` for reading it back out.
 * Used here and why: TipTap/ProseMirror decorates every node/mark with its own editor-only
 * attrs (list `start`, table cell `colspan`/`rowspan`/`colwidth`, link's `target`/`rel`/`class`,
 * ...) that our closed schema's `additionalProperties: false` rejects outright, so `fromEditor`
 * rebuilds each node/mark from an explicit allow-list (`NODE_ATTRS`/`MARK_ATTRS` below) rather
 * than passing TipTap's attrs through — the load-bearing invariant is
 * `fromEditor(toEditor(doc))` deep-equalling `doc` for every node/mark the schema allows, proven
 * by `prosemap.test.ts` against a fixture that also passes ajv validation of the schema itself.
 * The only structural (not just attr-stripping) translation is table header cells: our schema
 * has one `tableCell` node with an optional `attrs.header` flag; TipTap's table extensions use
 * two distinct node types (`tableCell`/`tableHeader`).
 * How it fits the project: the mapping half of Task 14 (closed-schema TipTap editor); the other
 * half is `extensions.ts` (the closed extension list `RichTextEditor.svelte` builds the TipTap
 * `Editor` with).
 * Depends on: `@tiptap/core` (`JSONContent` type only — no editor instantiation here), `../prose/types`.
 * Used by: `RichTextEditor.svelte` (`toEditor` for `content`, `fromEditor` in `onUpdate`),
 * `prosemap.test.ts`, `RichTextEditor.svelte.spec.ts`.
 */
import type { JSONContent } from '@tiptap/core';
import type { ProseDoc } from '../prose/types';

// Attrs the closed schema allows, keyed by node type. Every node type absent from this map
// carries NO attrs in `fromEditor`'s output, regardless of what TipTap attaches (e.g.
// `orderedList.start`, `orderedList.type` — our schema's `orderedList` has no `attrs` property
// at all, so even `attrs: {}` would fail `additionalProperties: false`). `tableCell`/`tableHeader`
// are handled by dedicated branches below, not through this map.
const NODE_ATTRS: Record<string, string[]> = {
	heading: ['level'],
	image: ['mediaAssetId', 'alt'],
	callout: ['kind'],
	math: ['src']
};

// Attrs the closed schema allows on a mark, keyed by mark type. Only `link` carries attrs in our
// schema (`href`); TipTap's Link mark also carries `target`/`rel`/`class` (defaults, not null)
// that must be dropped. Every other mark type (bold/italic/underline/code/subscript/superscript)
// carries none.
const MARK_ATTRS: Record<string, string[]> = {
	link: ['href']
};

// Keeps only the allow-listed keys from `source`, dropping null/undefined values too (TipTap
// sets unset attrs to `null` rather than omitting them); returns `undefined` (not `{}`) when
// nothing survives, so callers can omit the `attrs` key entirely rather than emitting an empty object.
function pickAttrs(
	source: Record<string, unknown> | undefined,
	keys: string[]
): Record<string, unknown> | undefined {
	if (!source) return undefined;
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		const value = source[key];
		if (value !== null && value !== undefined) out[key] = value;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

// Our closed schema -> TipTap `JSONContent`, recursively. Only `tableCell{attrs.header: true}`
// needs translating (-> `tableHeader`); everything else passes through as-is — TipTap fills in
// its own default attrs (colspan, target, ...) for whatever we don't set.
function toEditorNode(node: JSONContent): JSONContent {
	if (node.type === 'tableCell' && node.attrs?.header) {
		return { type: 'tableHeader', content: node.content?.map(toEditorNode) };
	}
	const out: JSONContent = { ...node };
	if (node.content) out.content = node.content.map(toEditorNode);
	return out;
}

export function toEditor(doc: ProseDoc): JSONContent {
	return toEditorNode(doc as JSONContent);
}

// TipTap `JSONContent` -> our closed schema, recursively. `tableHeader` becomes
// `tableCell{attrs:{header:true}}`; `tableCell` drops TipTap's colspan/rowspan/colwidth (our
// schema has no cell attrs beyond `header`, and merged cells are never produced by our editor
// config, so there's nothing to preserve there). Every other node rebuilds its `attrs`/`marks`
// from the allow-lists above; `marks` is only ever attached to `text` nodes (the only schema
// node type that lists `marks` in its properties — atoms like `math`/`image`/`hardBreak` don't).
function fromEditorNode(node: JSONContent): ProseDoc {
	if (node.type === 'tableHeader') {
		return {
			type: 'tableCell',
			attrs: { header: true },
			content: (node.content ?? []).map(fromEditorNode)
		} as unknown as ProseDoc;
	}
	if (node.type === 'tableCell') {
		return {
			type: 'tableCell',
			content: (node.content ?? []).map(fromEditorNode)
		} as unknown as ProseDoc;
	}

	const out: JSONContent = { type: node.type };

	const attrKeys = node.type ? NODE_ATTRS[node.type] : undefined;
	if (attrKeys) {
		const attrs = pickAttrs(node.attrs, attrKeys);
		if (attrs) out.attrs = attrs;
	}

	if (node.type === 'text' && node.marks && node.marks.length > 0) {
		out.marks = node.marks.map((mark) => {
			const keys = MARK_ATTRS[mark.type];
			const attrs = keys ? pickAttrs(mark.attrs, keys) : undefined;
			return attrs ? { type: mark.type, attrs } : { type: mark.type };
		});
	}

	if (node.text !== undefined) out.text = node.text;
	if (node.content) out.content = node.content.map(fromEditorNode);

	return out as unknown as ProseDoc;
}

export function fromEditor(json: JSONContent): ProseDoc {
	return fromEditorNode(json);
}
