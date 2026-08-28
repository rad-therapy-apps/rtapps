<!--
	What this file does: renders one inline ProseMirror node (text/hardBreak/math) and, for text,
	wraps it in the real element for its first mark then recurses on itself for the rest — so
	`bold + link` becomes `<strong><a>text</a></strong>`, one mark peeled off per recursion.
	Used here and why: Svelte 5 runes ($props, $derived for `marks`); recursion instead of a
	nested-elements builder because each mark is just one more wrapper around the same node.
	How it fits the project: the leaf level of ADR-0003's renderer — marks become real elements
	(`<strong>`, `<a>`, ...), never `{@html}`; a `link` mark's href is re-checked against the
	https-only pattern at render time even though the schema already enforced it on write.
	Depends on: ./types (ProseInline, ProseMark).
	Used by: ProseNode.svelte (paragraph/heading inline content), itself (mark recursion).
-->
<script lang="ts">
	import ProseInline from './ProseInline.svelte';
	import type { ProseInline as ProseInlineNode, ProseMark } from './types';

	// The single inline node this instance renders (a text run, hard break, or math span).
	let { node }: { node: ProseInlineNode } = $props();

	// Closed inline-node list (ADR-0003): anything else is a schema/renderer mismatch.
	const KNOWN_INLINE_TYPES = new Set(['text', 'hardBreak', 'math']);
	if (!KNOWN_INLINE_TYPES.has(node.type)) {
		throw new Error(`Unknown prose node: ${node.type}`);
	}

	// Closed mark list (ADR-0003), checked against only the first (outermost) remaining mark below.
	const KNOWN_MARK_TYPES = new Set([
		'bold',
		'italic',
		'underline',
		'code',
		'subscript',
		'superscript',
		'link'
	]);

	// $derived because `node` is a reactive prop: recomputes the remaining mark stack whenever a
	// different node is passed in (e.g. across a rerender), rather than freezing it at first render.
	const marks: ProseMark[] = $derived(node.type === 'text' ? (node.marks ?? []) : []);
	if (marks.length > 0 && !KNOWN_MARK_TYPES.has(marks[0].type)) {
		throw new Error(`Unknown prose mark: ${marks[0].type}`);
	}

	// Builds the "same text, one fewer mark" node passed to the recursive <ProseInline> below —
	// each render peels off marks[0] as an element and recurses on the rest.
	function tail(): ProseInlineNode {
		const text = node as Extract<ProseInlineNode, { type: 'text' }>;
		return { type: 'text', text: text.text, marks: marks.slice(1) };
	}
</script>

{#if node.type === 'text'}
	<!-- text: peel off marks[0] as its element and recurse via tail() until none remain, then emit plain text. -->
	{#if marks.length === 0}
		{node.text}
	{:else if marks[0].type === 'bold'}
		<strong><ProseInline node={tail()} /></strong>
	{:else if marks[0].type === 'italic'}
		<em><ProseInline node={tail()} /></em>
	{:else if marks[0].type === 'underline'}
		<u><ProseInline node={tail()} /></u>
	{:else if marks[0].type === 'code'}
		<code><ProseInline node={tail()} /></code>
	{:else if marks[0].type === 'subscript'}
		<sub><ProseInline node={tail()} /></sub>
	{:else if marks[0].type === 'superscript'}
		<sup><ProseInline node={tail()} /></sup>
	{:else if marks[0].type === 'link'}
		{@const href = marks[0].attrs.href}
		<!-- https-only guard: the schema already enforces this on write, but rendering re-checks
		     rather than trusting stored data; a non-https href is dropped (link unwrapped) instead of rendered. -->
		{#if /^https:\/\//.test(href)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external content link, guarded by the ^https:// check above, not a SvelteKit route -->
			<a {href} rel="noopener noreferrer" target="_blank"><ProseInline node={tail()} /></a>
		{:else}
			<ProseInline node={tail()} />
		{/if}
	{/if}
{:else if node.type === 'hardBreak'}
	<!-- hardBreak: a forced line break within a paragraph. -->
	<br />
{:else if node.type === 'math'}
	<!-- math: KaTeX rendering is not implemented yet (Phase 3, ADR-0003 §5); the raw source shows as code. -->
	<code class="math">{node.attrs.src}</code>
{/if}
