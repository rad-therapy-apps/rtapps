<!--
	What this file does: A raised surface container that can render as div, section, article or li.

	Used here and why: `svelte:element` lets callers keep correct semantics (e.g. list items) while sharing one look.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).

	Depends on: nothing.
	Used by: pages and components that group content.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	let { as = 'div', children }: { as?: 'div' | 'section' | 'article' | 'li'; children: Snippet } =
		$props();
</script>

<svelte:element this={as} class="card">{@render children()}</svelte:element>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-5);
		box-shadow: var(--shadow-1);
		list-style: none;
	}
</style>
