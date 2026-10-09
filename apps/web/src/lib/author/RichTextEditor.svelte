<!--
	What this file does: wraps a TipTap `Editor` restricted to the closed prose schema
	(`authorExtensions()`) behind a compact toolbar, translating to/from our schema JSON via
	`prosemap.ts` at the boundary.
	Used here and why: the `Editor` is instantiated imperatively in a Svelte 5 `$effect` (TipTap is
	not a Svelte component) exactly once per mount — `doc` is read via `untrack` so a later change
	to the `doc` prop does NOT recreate the editor (that would reset the cursor); a parent that
	needs to load a genuinely different document must force a remount itself with `{#key}` around
	this component, per the Task 14 brief. `onUpdate` is the only path back to the caller:
	`fromEditor(editor.getJSON())` on every change. A `version` counter bumped on every
	`onTransaction` drives the toolbar's active-state highlighting (`editor.isActive(...)` reads
	TipTap's own mutable state, which Svelte can't see, so a tracked counter forces the toolbar to
	recompute after each transaction).
	How it fits the project: the component half of Task 14 (closed-schema TipTap editor); Task
	15/16's lesson/knowledge-check editors embed this directly.
	Toolbar buttons are icon-only: each carries `aria-label` (and a matching `title` tooltip) with
	the same words the text buttons had, so the accessible names are unchanged.
	Depends on: `@tiptap/core` (`Editor`), `./extensions` (`authorExtensions`), `./prosemap`
	(`toEditor`/`fromEditor`), `../prose/types` (`ProseDoc`, `CalloutKind`).
	Used by: Task 15/16 authoring routes (not yet built), `RichTextEditor.svelte.spec.ts`.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { authorExtensions } from './extensions';
	import { toEditor, fromEditor } from './prosemap';
	import type { ProseDoc, CalloutKind } from '../prose/types';
	import '../prose/prose.css';
	import type { Component } from 'svelte';
	import type { LucideProps } from '@lucide/svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import Underline from '@lucide/svelte/icons/underline';
	import Subscript from '@lucide/svelte/icons/subscript';
	import Superscript from '@lucide/svelte/icons/superscript';
	import Code from '@lucide/svelte/icons/code';
	import Heading2 from '@lucide/svelte/icons/heading-2';
	import Heading3 from '@lucide/svelte/icons/heading-3';
	import Heading4 from '@lucide/svelte/icons/heading-4';
	import List from '@lucide/svelte/icons/list';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import TextQuote from '@lucide/svelte/icons/text-quote';
	import Info from '@lucide/svelte/icons/info';
	import LinkIcon from '@lucide/svelte/icons/link';
	import Table from '@lucide/svelte/icons/table';
	import ImageIcon from '@lucide/svelte/icons/image';

	let {
		doc,
		onchange,
		oninsertimage
	}: {
		doc: ProseDoc;
		onchange: (doc: ProseDoc) => void;
		oninsertimage?: () => Promise<{ mediaAssetId: string; alt: string } | null>;
	} = $props();

	let element: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();
	// Bumped on every transaction so `activeState` below (an aria-pressed/select-value source for
	// the toolbar) recomputes; TipTap's `isActive`/attribute reads aren't otherwise visible to Svelte.
	let version = $state(0);

	let linkUrl = $state('');
	let linkError = $state<string | undefined>(undefined);
	let calloutKind = $state<CalloutKind>('key-principle');

	$effect(() => {
		if (!element) return;
		// Read once (untracked): changing `doc` later must NOT recreate the editor — see the file
		// header. A caller that wants to load a different document remounts via `{#key}`.
		const initialDoc = untrack(() => doc);
		const instance = new Editor({
			element,
			extensions: authorExtensions(),
			content: toEditor(initialDoc),
			// `prose` reuses prose.css's paper look for the editable surface (same classes as the
			// student reader), so authors see what students will.
			editorProps: { attributes: { class: 'prose' } },
			onUpdate: () => onchange(fromEditor(instance.getJSON())),
			onTransaction: () => {
				version += 1;
			}
		});
		editor = instance;
		return () => {
			instance.destroy();
			editor = undefined;
		};
	});

	// Toolbar active/current state, recomputed whenever `version` changes (see above).
	const activeState = $derived.by(() => {
		// Read (not used) to register `version` as a reactive dependency of this $derived.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		version;
		return {
			bold: editor?.isActive('bold') ?? false,
			italic: editor?.isActive('italic') ?? false,
			underline: editor?.isActive('underline') ?? false,
			code: editor?.isActive('code') ?? false,
			subscript: editor?.isActive('subscript') ?? false,
			superscript: editor?.isActive('superscript') ?? false,
			h2: editor?.isActive('heading', { level: 2 }) ?? false,
			h3: editor?.isActive('heading', { level: 3 }) ?? false,
			h4: editor?.isActive('heading', { level: 4 }) ?? false,
			bulletList: editor?.isActive('bulletList') ?? false,
			orderedList: editor?.isActive('orderedList') ?? false,
			blockquote: editor?.isActive('blockquote') ?? false,
			callout: editor?.isActive('callout') ?? false,
			link: editor?.isActive('link') ?? false
		};
	});

	function applyLink() {
		if (!linkUrl.startsWith('https://')) {
			linkError = 'Links must start with https://';
			return;
		}
		linkError = undefined;
		editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
		linkUrl = '';
	}

	async function insertImage() {
		if (!oninsertimage || !editor) return;
		const result = await oninsertimage();
		if (result) {
			editor.chain().focus().insertContent({ type: 'image', attrs: result }).run();
		}
	}
</script>

<!-- One icon-only toolbar button. `pressed` undefined omits aria-pressed (non-toggle actions). -->
{#snippet tool(
	label: string,
	icon: Component<LucideProps>,
	onclick: () => void,
	pressed?: boolean,
	disabled?: boolean
)}
	<button
		type="button"
		aria-label={label}
		title={label}
		aria-pressed={pressed}
		{onclick}
		{disabled}
	>
		<Icon {icon} size={18} />
	</button>
{/snippet}

<div class="richtext-editor">
	<div class="toolbar" role="toolbar" aria-label="Formatting">
		{@render tool('Bold', Bold, () => editor?.chain().focus().toggleBold().run(), activeState.bold)}
		{@render tool(
			'Italic',
			Italic,
			() => editor?.chain().focus().toggleItalic().run(),
			activeState.italic
		)}
		{@render tool(
			'Underline',
			Underline,
			() => editor?.chain().focus().toggleUnderline().run(),
			activeState.underline
		)}
		{@render tool(
			'Sub',
			Subscript,
			() => editor?.chain().focus().toggleSubscript().run(),
			activeState.subscript
		)}
		{@render tool(
			'Sup',
			Superscript,
			() => editor?.chain().focus().toggleSuperscript().run(),
			activeState.superscript
		)}
		{@render tool('Code', Code, () => editor?.chain().focus().toggleCode().run(), activeState.code)}

		<span class="sep" aria-hidden="true"></span>
		{@render tool(
			'H2',
			Heading2,
			() => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
			activeState.h2
		)}
		{@render tool(
			'H3',
			Heading3,
			() => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
			activeState.h3
		)}
		{@render tool(
			'H4',
			Heading4,
			() => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
			activeState.h4
		)}

		<span class="sep" aria-hidden="true"></span>
		{@render tool(
			'Bullet list',
			List,
			() => editor?.chain().focus().toggleBulletList().run(),
			activeState.bulletList
		)}
		{@render tool(
			'Numbered list',
			ListOrdered,
			() => editor?.chain().focus().toggleOrderedList().run(),
			activeState.orderedList
		)}
		{@render tool(
			'Quote',
			TextQuote,
			() => editor?.chain().focus().toggleBlockquote().run(),
			activeState.blockquote
		)}

		<span class="sep" aria-hidden="true"></span>
		<label for="callout-kind">Callout kind</label>
		<select id="callout-kind" bind:value={calloutKind}>
			<option value="key-principle">Key principle</option>
			<option value="clinical-note">Clinical note</option>
			<option value="warning">Warning</option>
		</select>
		{@render tool(
			'Callout',
			Info,
			() => editor?.chain().focus().toggleCallout(calloutKind).run(),
			activeState.callout
		)}

		<span class="sep" aria-hidden="true"></span>
		<label for="link-url">Link URL</label>
		<input id="link-url" type="text" placeholder="https://" bind:value={linkUrl} />
		{@render tool('Link', LinkIcon, applyLink)}
		{#if linkError}
			<p role="alert">{linkError}</p>
		{/if}

		<span class="sep" aria-hidden="true"></span>
		{@render tool('Insert table', Table, () =>
			editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
		)}
		{@render tool('Image', ImageIcon, insertImage, undefined, !oninsertimage)}
	</div>

	<div class="surface" bind:this={element}></div>
</div>

<style>
	.richtext-editor {
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2);
		background: var(--surface-raised);
		border-block-end: 1px solid var(--border-strong);
	}
	.toolbar button {
		width: 2.25rem;
		height: 2.25rem;
		min-height: 2.25rem;
		padding: 0;
		background: transparent;
		border-color: transparent;
		color: var(--text-muted);
	}
	.toolbar button:hover:not(:disabled):not([aria-pressed='true']) {
		background: var(--surface);
		border-color: transparent;
		color: var(--text);
	}
	/* Pressed is a fill plus an inset ring, so it never relies on colour alone. */
	.toolbar button[aria-pressed='true'] {
		background: var(--accent-soft);
		color: var(--accent);
		box-shadow: inset 0 0 0 2px var(--accent);
	}
	.toolbar label {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.toolbar select,
	.toolbar input {
		min-height: 2.25rem;
		padding-block: var(--space-1);
	}
	.toolbar input {
		width: 10rem;
	}
	.toolbar p[role='alert'] {
		flex-basis: 100%;
		margin: 0;
		color: var(--danger);
		font-size: var(--text-sm);
	}
	.sep {
		width: 1px;
		height: 1.5rem;
		margin-inline: var(--space-1);
		background: var(--border-strong);
	}
	/* The editable area is the same dark paper the reader uses. */
	.surface :global(.ProseMirror) {
		max-width: none;
		min-height: 8rem;
		padding: var(--space-4);
		background: var(--paper-bg);
		color: var(--paper-text);
	}
	.surface :global(.ProseMirror:focus-visible) {
		outline: 2px solid var(--paper-link);
		outline-offset: -2px;
	}
</style>
