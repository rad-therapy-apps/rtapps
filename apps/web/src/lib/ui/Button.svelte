<!--
	What this file does: A button with four variants (primary, secondary, ghost, danger) and an optional leading icon.

	Used here and why: native button attributes are forwarded, type defaults to "button" so it never submits a form by accident, and the accessible name stays the caller's text.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3). The base button look lives in `src/app.css`; variants only change fill and border.

	Depends on: `./Icon.svelte`.
	Used by: pages and components needing a styled button.
-->

<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { LucideProps } from '@lucide/svelte';
	import Icon from './Icon.svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	let {
		variant = 'secondary',
		type = 'button',
		icon,
		children,
		...rest
	}: Omit<HTMLButtonAttributes, 'class'> & {
		variant?: Variant;
		icon?: Component<LucideProps>;
		children: Snippet;
	} = $props();
</script>

<button {type} class="btn btn-{variant}" {...rest}>
	{#if icon}<Icon {icon} />{/if}
	{@render children()}
</button>

<style>
	/* Base look comes from app.css `button`; variants only change fill and border. */
	.btn-primary {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-contrast);
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--accent-strong);
		border-color: var(--accent-strong);
	}
	.btn-ghost {
		background: transparent;
		border-color: transparent;
		color: var(--text-muted);
	}
	.btn-ghost:hover:not(:disabled) {
		background: var(--surface-raised);
		border-color: transparent;
		color: var(--text);
	}
	.btn-danger {
		background: var(--danger-bg);
		border-color: var(--danger);
		color: var(--danger);
	}
</style>
