/**
 * What this file does: `authorExtensions()` — the exact closed-schema TipTap extension list
 * `RichTextEditor.svelte` builds its `Editor` with, restricting the editor to precisely the
 * node/mark set `packages/schemas/prose-doc.schema.json` allows.
 * Used here and why: `StarterKit.configure(...)` disables everything the schema lacks
 * (`codeBlock`, `horizontalRule`, `strike`) and pins heading levels to 2-4 (history stays on —
 * the schema doesn't constrain editor history, only the document shape); `Underline`/
 * `Subscript`/`Superscript`/`Link` add the remaining marks; the `Table` family (resizing off, so
 * no colwidth churn) adds tables. Three block/inline nodes have no off-the-shelf TipTap
 * extension and are defined inline: `AuthorImage` (schema's `mediaAssetId`/`alt` attrs, not
 * TipTap's `src`/`title`), `Callout` (the schema's `key-principle`/`clinical-note`/`warning`
 * aside), and `MathSource` (a read-only KaTeX-source span — inserted only by pasting/API content,
 * never from the toolbar, since there's no math input UI yet).
 * How it fits the project: the extension-list half of Task 14; `prosemap.ts` is the other half
 * (translating between this editor's `JSONContent` and the closed schema JSON).
 * Depends on: `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-underline`,
 * `@tiptap/extension-subscript`, `@tiptap/extension-superscript`, `@tiptap/extension-link`,
 * `@tiptap/extension-table(-row|-cell|-header)`.
 * Used by: `RichTextEditor.svelte`.
 */
import { Node, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import type { CalloutKind } from '../prose/types';

// `AuthorImage`: our schema's `image` node has exactly `{mediaAssetId, alt}` (no `src`/`title` —
// the API serves the bytes by id), so the base Image extension's attrs are replaced rather than
// extended; `renderHTML` builds the `src` from the id instead of storing a URL.
const AuthorImage = Image.extend({
	addAttributes() {
		return {
			mediaAssetId: {},
			alt: {}
		};
	},
	renderHTML({ HTMLAttributes }) {
		return [
			'img',
			{ src: `/api/v1/media/${HTMLAttributes.mediaAssetId}`, alt: HTMLAttributes.alt }
		];
	}
});

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		callout: {
			toggleCallout: (kind: CalloutKind) => ReturnType;
		};
	}
}

// `Callout`: block node matching the schema's `callout` (kind: key-principle/clinical-note/warning),
// rendered as `<aside class="callout callout-{kind}">`. `toggleCallout` wraps/lifts the current
// block the same way StarterKit's own `toggleBlockquote` does (`commands.toggleWrap`), passing the kind through as the wrap attrs.
const Callout = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	addAttributes() {
		return { kind: { default: 'key-principle' } };
	},
	parseHTML() {
		return [{ tag: 'aside.callout' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['aside', { class: `callout callout-${HTMLAttributes.kind}` }, 0];
	},
	addCommands() {
		return {
			toggleCallout:
				(kind: CalloutKind) =>
				({ commands }) =>
					commands.toggleWrap(this.name, { kind })
		};
	}
});

// `MathSource`: inline atom matching the schema's `math` node (`src` is raw KaTeX source,
// rendered read-only as `<code class="math-src">` — no toolbar insert command; content only
// arrives via `toEditor` loading a document that already has one).
const MathSource = Node.create({
	name: 'math',
	group: 'inline',
	inline: true,
	atom: true,
	addAttributes() {
		return { src: {} };
	},
	parseHTML() {
		return [{ tag: 'code.math-src' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['code', { class: 'math-src' }, HTMLAttributes.src];
	}
});

export function authorExtensions(): Extensions {
	return [
		StarterKit.configure({
			codeBlock: false,
			horizontalRule: false,
			strike: false,
			heading: { levels: [2, 3, 4] },
			blockquote: {},
			code: {}
		}),
		Underline,
		Subscript,
		Superscript,
		Link.configure({
			openOnClick: false,
			autolink: false,
			validate: (href: string) => href.startsWith('https://')
		}),
		Table.configure({ resizable: false }),
		TableRow,
		TableCell,
		TableHeader,
		AuthorImage,
		Callout,
		MathSource
	];
}
