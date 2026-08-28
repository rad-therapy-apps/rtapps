<script lang="ts">
	import { getContext } from 'svelte';
	import ProseNode from './ProseNode.svelte';
	import ProseInline from './ProseInline.svelte';
	import type { ProseBlock } from './types';

	let { node }: { node: ProseBlock } = $props();

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

	const images = getContext<Record<string, string>>('prose-images') ?? {};
</script>

{#if node.type === 'paragraph'}
	<p>
		{#each node.content ?? [] as inline, i (i)}
			<ProseInline node={inline} />
		{/each}
	</p>
{:else if node.type === 'heading'}
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
	<blockquote>
		{#each node.content as child, i (i)}
			<ProseNode node={child} />
		{/each}
	</blockquote>
{:else if node.type === 'table'}
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
	{@const src = images[node.attrs.mediaAssetId]}
	<figure>
		{#if src}
			<img {src} alt={node.attrs.alt} />
		{:else}
			<span class="prose-image-missing">{node.attrs.alt}</span>
		{/if}
	</figure>
{:else if node.type === 'callout'}
	<aside class="callout callout-{node.attrs.kind}">
		{#each node.content as child, i (i)}
			<ProseNode node={child} />
		{/each}
	</aside>
{/if}
