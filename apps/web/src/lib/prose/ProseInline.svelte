<script lang="ts">
	import ProseInline from './ProseInline.svelte';
	import type { ProseInline as ProseInlineNode, ProseMark } from './types';

	let { node }: { node: ProseInlineNode } = $props();

	const KNOWN_INLINE_TYPES = new Set(['text', 'hardBreak', 'math']);
	if (!KNOWN_INLINE_TYPES.has(node.type)) {
		throw new Error(`Unknown prose node: ${node.type}`);
	}

	const KNOWN_MARK_TYPES = new Set([
		'bold',
		'italic',
		'underline',
		'code',
		'subscript',
		'superscript',
		'link'
	]);

	const marks: ProseMark[] = $derived(node.type === 'text' ? (node.marks ?? []) : []);
	if (marks.length > 0 && !KNOWN_MARK_TYPES.has(marks[0].type)) {
		throw new Error(`Unknown prose mark: ${marks[0].type}`);
	}

	function tail(): ProseInlineNode {
		const text = node as Extract<ProseInlineNode, { type: 'text' }>;
		return { type: 'text', text: text.text, marks: marks.slice(1) };
	}
</script>

{#if node.type === 'text'}
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
		{#if /^https:\/\//.test(href)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external content link, guarded by the ^https:// check above, not a SvelteKit route -->
			<a {href} rel="noopener noreferrer" target="_blank"><ProseInline node={tail()} /></a>
		{:else}
			<ProseInline node={tail()} />
		{/if}
	{/if}
{:else if node.type === 'hardBreak'}
	<br />
{:else if node.type === 'math'}
	<code class="math">{node.attrs.src}</code>
{/if}
