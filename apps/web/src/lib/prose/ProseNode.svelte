<!--
	What this file does: the recursive block-node renderer — switches on `node.type` and emits a
	real Svelte/HTML element per ProseMirror block node, recursing into children (list items,
	table cells, blockquote/callout content) via itself.
	Used here and why: Svelte 5 runes ($props for `node`); a `{#if}/{:else if}` chain standing in
	for an exhaustive switch over the closed node-type union from ./types.
	How it fits the project: the core of ADR-0003 — it deliberately never uses `{@html}`, so
	there is no HTML-injection surface regardless of what an author pasted into the editor.
	Unknown node types throw rather than silently rendering nothing, so a schema/renderer drift
	fails loudly (see ProseDoc.svelte.spec.ts). See `docs/03-architecture.md` §5.
	Works with: ProseInline.svelte (inline content within paragraphs/headings), ./types.
	Depends on: svelte (getContext), ./types (ProseBlock).
	Used by: ProseDoc.svelte (top-level blocks), itself (recursion into nested blocks).
-->
<script lang="ts">
	import { getContext } from 'svelte';
	import ProseNode from './ProseNode.svelte';
	import ProseInline from './ProseInline.svelte';
	import type { ProseBlock } from './types';

	// The single block node this instance renders; recursion passes a child node into a fresh instance.
	let { node }: { node: ProseBlock } = $props();

	// Mirrors the closed block-node list in ./types/ADR-0003; kept as a runtime Set so an unknown
	// type (schema/renderer drift, or a malformed fixture) fails with a clear error instead of
	// silently rendering nothing.
	const KNOWN_BLOCK_TYPES = new Set([
		'paragraph',
		'heading',
		'bulletList',
		'orderedList',
		'blockquote',
		'table',
		'image',
		'callout'
	]);
	if (!KNOWN_BLOCK_TYPES.has(node.type)) {
		throw new Error(`Unknown prose node: ${node.type}`);
	}

	// Getter-style context set by ProseDoc.svelte: resolves an `image` node's mediaAssetId to a URL.
	const getImages = getContext<() => Record<string, string>>('prose-images');
</script>

{#if node.type === 'paragraph'}
	<!-- paragraph: a <p> of inline content, delegated to ProseInline. -->
	<p>
		{#each node.content ?? [] as inline, i (i)}
			<ProseInline node={inline} />
		{/each}
	</p>
{:else if node.type === 'heading'}
	<!-- heading: level 2-4 only (ADR-0003 closed schema), picks the matching h2/h3/h4 tag. -->
	{#if node.attrs.level === 2}
		<h2>
			{#each node.content as inline, i (i)}<ProseInline node={inline} />{/each}
		</h2>
	{:else if node.attrs.level === 3}
		<h3>
			{#each node.content as inline, i (i)}<ProseInline node={inline} />{/each}
		</h3>
	{:else}
		<h4>
			{#each node.content as inline, i (i)}<ProseInline node={inline} />{/each}
		</h4>
	{/if}
{:else if node.type === 'bulletList'}
	<!-- bulletList: each listItem's block content recurses back through ProseNode. -->
	<ul>
		{#each node.content as item, i (i)}
			<li>
				{#each item.content as child, j (j)}
					<ProseNode node={child} />
				{/each}
			</li>
		{/each}
	</ul>
{:else if node.type === 'orderedList'}
	<!-- orderedList: same shape as bulletList, rendered as <ol>. -->
	<ol>
		{#each node.content as item, i (i)}
			<li>
				{#each item.content as child, j (j)}
					<ProseNode node={child} />
				{/each}
			</li>
		{/each}
	</ol>
{:else if node.type === 'blockquote'}
	<!-- blockquote: block content recurses back through ProseNode. -->
	<blockquote>
		{#each node.content as child, i (i)}
			<ProseNode node={child} />
		{/each}
	</blockquote>
{:else if node.type === 'table'}
	<!-- table: rows/cells recurse through ProseNode; a cell's `header` attr picks <th> vs <td>. -->
	<table>
		<tbody>
			{#each node.content as row, i (i)}
				<tr>
					{#each row.content as cell, j (j)}
						{#if cell.attrs?.header}
							<th scope="col">
								{#each cell.content as child, k (k)}<ProseNode node={child} />{/each}
							</th>
						{:else}
							<td>
								{#each cell.content as child, k (k)}<ProseNode node={child} />{/each}
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{:else if node.type === 'image'}
	<!-- image: resolves mediaAssetId through the prose-images context (set by ProseDoc); falls
	     back to showing the alt text if the id isn't in the map (e.g. not yet loaded). -->
	{@const src = getImages?.()[node.attrs.mediaAssetId]}
	<figure>
		{#if src}
			<img {src} alt={node.attrs.alt} />
		{:else}
			<span class="prose-image-missing">{node.attrs.alt}</span>
		{/if}
	</figure>
{:else if node.type === 'callout'}
	<!-- callout: key-principle/clinical-note/warning; kind picks the CSS modifier class in prose.css. -->
	<aside class="callout callout-{node.attrs.kind}">
		{#each node.content as child, i (i)}
			<ProseNode node={child} />
		{/each}
	</aside>
{/if}
