<!--
	What this file does: A toned message box (info, success, warning, danger) with a matching icon.

	Used here and why: the icon shape plus the caller's text carry the meaning, colour only repeats it; `id` and `role` pass through so existing selectors like `#login-error` and `[role=alert]` keep working.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).

	Depends on: `./Icon.svelte`, `@lucide/svelte`.
	Used by: pages showing status or errors.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Icon from './Icon.svelte';

	type Tone = 'info' | 'success' | 'warning' | 'danger';
	let {
		tone,
		id,
		role,
		children
	}: { tone: Tone; id?: string; role?: 'alert' | 'status'; children: Snippet } = $props();
	const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert };
</script>

<div class="alert alert-{tone}" {id} {role}>
	<Icon icon={icons[tone]} />
	<div>{@render children()}</div>
</div>

<style>
	.alert {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		padding: var(--space-3) var(--space-4);
		border: 1px solid currentColor;
		border-radius: var(--radius-sm);
		margin-block: var(--space-3);
	}
	.alert :global(svg) {
		flex: none;
		margin-top: 0.15em;
	}
	.alert-info {
		color: var(--info);
		background: var(--info-bg);
	}
	.alert-success {
		color: var(--success);
		background: var(--success-bg);
	}
	.alert-warning {
		color: var(--warning);
		background: var(--warning-bg);
	}
	.alert-danger {
		color: var(--danger);
		background: var(--danger-bg);
	}
</style>
