<!--
	What this file does: the entry point for rendering a ProseMirror JSON document — sets up the
	image-lookup context, then hands each top-level block node to ProseNode.
	Used here and why: Svelte 5 runes ($props for the doc/images inputs) plus `setContext` — the
	getter-function context is what lets `images` update reactively for consumers, since a plain
	value would be captured once at mount.
	How it fits the project: this is the outermost component of ADR-0003's renderer — it never
	uses `{@html}`; every node the API validated as a closed ProseMirror schema becomes a real
	Svelte element via ProseNode/ProseInline. See `docs/03-architecture.md` §5.
	Works with: ProseNode.svelte (per-block dispatch), prose.css (styling), ./types (ProseDoc type).
	Used by: KnowledgeCheck.svelte (question stem + explanation), LessonPager.svelte (rich_text
	blocks), ProseDoc.svelte.spec.ts.
-->
<script lang="ts">
	import { setContext } from 'svelte';
	import ProseNode from './ProseNode.svelte';
	import type { ProseDoc } from './types';
	import './prose.css';

	// `doc` is the ProseMirror JSON tree to render; `images` maps mediaAssetId -> resolved URL
	// (resolved server-side to a presigned URL, since the renderer never fetches by id itself).
	let { doc, images = {} }: { doc: ProseDoc; images?: Record<string, string> } = $props();

	// Wrapped in a getter so ProseNode/ProseImage reads stay reactive to `images` changing on rerender,
	// rather than closing over the value from the moment setContext ran.
	setContext('prose-images', () => images);
</script>

<div class="prose">
	<!-- One ProseNode per top-level block; each recurses into its own children as needed. -->
	{#each doc.content as node, i (i)}
		<ProseNode {node} />
	{/each}
</div>
