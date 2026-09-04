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

<div class="richtext-editor">
	<div class="toolbar" role="toolbar" aria-label="Formatting">
		<button
			type="button"
			aria-pressed={activeState.bold}
			onclick={() => editor?.chain().focus().toggleBold().run()}>Bold</button
		>
		<button
			type="button"
			aria-pressed={activeState.italic}
			onclick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button
		>
		<button
			type="button"
			aria-pressed={activeState.underline}
			onclick={() => editor?.chain().focus().toggleUnderline().run()}>Underline</button
		>
		<button
			type="button"
			aria-pressed={activeState.subscript}
			onclick={() => editor?.chain().focus().toggleSubscript().run()}>Sub</button
		>
		<button
			type="button"
			aria-pressed={activeState.superscript}
			onclick={() => editor?.chain().focus().toggleSuperscript().run()}>Sup</button
		>
		<button
			type="button"
			aria-pressed={activeState.code}
			onclick={() => editor?.chain().focus().toggleCode().run()}>Code</button
		>

		<button
			type="button"
			aria-pressed={activeState.h2}
			onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button
		>
		<button
			type="button"
			aria-pressed={activeState.h3}
			onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button
		>
		<button
			type="button"
			aria-pressed={activeState.h4}
			onclick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}>H4</button
		>

		<button
			type="button"
			aria-pressed={activeState.bulletList}
			onclick={() => editor?.chain().focus().toggleBulletList().run()}>Bullet list</button
		>
		<button
			type="button"
			aria-pressed={activeState.orderedList}
			onclick={() => editor?.chain().focus().toggleOrderedList().run()}>Numbered list</button
		>
		<button
			type="button"
			aria-pressed={activeState.blockquote}
			onclick={() => editor?.chain().focus().toggleBlockquote().run()}>Quote</button
		>

		<label for="callout-kind">Callout kind</label>
		<select id="callout-kind" bind:value={calloutKind}>
			<option value="key-principle">Key principle</option>
			<option value="clinical-note">Clinical note</option>
			<option value="warning">Warning</option>
		</select>
		<button
			type="button"
			aria-pressed={activeState.callout}
			onclick={() => editor?.chain().focus().toggleCallout(calloutKind).run()}>Callout</button
		>

		<label for="link-url">Link URL</label>
		<input id="link-url" type="text" placeholder="https://" bind:value={linkUrl} />
		<button type="button" onclick={applyLink}>Link</button>
		{#if linkError}
			<p role="alert">{linkError}</p>
		{/if}

		<button
			type="button"
			onclick={() =>
				editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
			>Insert table</button
		>

		<button type="button" onclick={insertImage} disabled={!oninsertimage}>Image</button>
	</div>

	<div bind:this={element}></div>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-block-end: 0.5rem;
	}
</style>
