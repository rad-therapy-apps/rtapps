<script lang="ts">
	import { setContext } from 'svelte';
	import ProseNode from './ProseNode.svelte';
	import type { ProseDoc } from './types';
	import './prose.css';

	let { doc, images = {} }: { doc: ProseDoc; images?: Record<string, string> } = $props();

	setContext('prose-images', () => images);
</script>

<div class="prose">
	{#each doc.content as node, i (i)}
		<ProseNode {node} />
	{/each}
</div>
