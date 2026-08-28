/**
 * What this file does: TypeScript types for the closed ProseMirror document shape rendered by
 * `ProseNode.svelte`/`ProseInline.svelte` — every node and mark the renderer is allowed to see.
 * Used here and why: hand-written types mirroring `packages/schemas/prose-doc.schema.json` one
 * field at a time, so the renderer's `switch`-like `{#if}` chains are exhaustive-checkable by
 * TypeScript, not just by the runtime "unknown node" throw.
 * How it fits the project: this is the client-side type half of ADR-0003 (content as ProseMirror
 * JSON, closed schema, no `{@html}`). The JSON Schema is the source of truth (validated on the
 * API and by `schema.test.ts`); these types must stay in sync with it by hand — there is no
 * codegen from the schema to these types.
 * Depends on: nothing.
 * Used by: `ProseDoc.svelte`, `ProseNode.svelte`, `ProseInline.svelte`,
 * `ProseDoc.svelte.spec.ts`, and `apps/web/src/lib/lesson/types.ts` (`ProseDoc` embedded in
 * lesson blocks).
 */
export type HeadingLevel = 2 | 3 | 4;
export type CalloutKind = 'key-principle' | 'clinical-note' | 'warning';

// The closed mark list (ADR-0003): anything else is rejected by the schema and by ProseInline's runtime check.
export type ProseMark =
	| { type: 'bold' }
	| { type: 'italic' }
	| { type: 'underline' }
	| { type: 'code' }
	| { type: 'subscript' }
	| { type: 'superscript' }
	| { type: 'link'; attrs: { href: string } };

export type ProseText = { type: 'text'; text: string; marks?: ProseMark[] };
export type ProseHardBreak = { type: 'hardBreak' };
export type ProseMath = { type: 'math'; attrs: { src: string } };

// Leaf content: text runs (with marks), hard line breaks, and KaTeX-source math spans.
export type ProseInline = ProseText | ProseHardBreak | ProseMath;

export type ProseParagraph = { type: 'paragraph'; content?: ProseInline[] };
export type ProseHeading = {
	type: 'heading';
	attrs: { level: HeadingLevel };
	content: ProseInline[];
};
export type ProseListItem = { type: 'listItem'; content: ProseBlock[] };
export type ProseBulletList = { type: 'bulletList'; content: ProseListItem[] };
export type ProseOrderedList = { type: 'orderedList'; content: ProseListItem[] };
export type ProseBlockquote = { type: 'blockquote'; content: ProseBlock[] };
export type ProseTableCell = {
	type: 'tableCell';
	attrs?: { header?: boolean };
	content: ProseBlock[];
};
export type ProseTableRow = { type: 'tableRow'; content: ProseTableCell[] };
export type ProseTable = { type: 'table'; content: ProseTableRow[] };
export type ProseImage = { type: 'image'; attrs: { mediaAssetId: string; alt: string } };
export type ProseCallout = { type: 'callout'; attrs: { kind: CalloutKind }; content: ProseBlock[] };

// The closed block-node list (ADR-0003): paragraph, heading, lists, blockquote, table, image, callout.
export type ProseBlock =
	| ProseParagraph
	| ProseHeading
	| ProseBulletList
	| ProseOrderedList
	| ProseBlockquote
	| ProseTable
	| ProseImage
	| ProseCallout;

export type ProseDoc = { type: 'doc'; content: ProseBlock[] };
