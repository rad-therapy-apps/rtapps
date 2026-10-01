<!--
	What this file does: Renders a Lucide icon at a fixed stroke width, decorative unless labelled.

	Used here and why: the single entry point for icons so every icon is aria-hidden by default and only gets role="img" when it is the sole label.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).

	Depends on: `@lucide/svelte`.
	Used by: every kit component and page that shows an icon.
-->

<script lang="ts">
	import type { Component } from 'svelte';
	import type { LucideProps } from '@lucide/svelte';

	let {
		icon: IconComponent,
		label,
		size = 18
	}: { icon: Component<LucideProps>; label?: string; size?: number } = $props();
</script>

{#if label}
	<IconComponent {size} strokeWidth={2} role="img" aria-label={label} focusable="false" />
{:else}
	<IconComponent {size} strokeWidth={2} aria-hidden="true" focusable="false" />
{/if}
