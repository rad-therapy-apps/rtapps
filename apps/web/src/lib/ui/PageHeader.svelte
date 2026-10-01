<!--
	What this file does: The page title block: the page's single h1, an optional subtitle and an optional actions area.

	Used here and why: one component keeps heading level and spacing consistent across pages.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).

	Depends on: nothing.
	Used by: every page route.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, subtitle, actions }: { title: string; subtitle?: string; actions?: Snippet } =
		$props();
</script>

<header class="page-header">
	<div>
		<h1>{title}</h1>
		{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</header>

<style>
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4);
		margin-block-end: var(--space-5);
	}
	h1 {
		margin: 0;
	}
	.subtitle {
		margin: var(--space-1) 0 0;
		color: var(--text-muted);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
