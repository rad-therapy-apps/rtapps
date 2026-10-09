<!--
	What this file does: Lays out a label above a form control.

	Used here and why: the label is tied to the caller's control by `for`/`id`; the caller's control must carry `id={id}`. Native input styling comes from `src/app.css`.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3). Form errors stay page-level, so there is no error prop.

	Depends on: nothing.
	Used by: forms.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	let { label, id, children }: { label: string; id: string; children: Snippet } = $props();
</script>

<div class="field">
	<label for={id}>{label}</label>
	{@render children()}
</div>

<style>
	/* minmax(0, 1fr), not the implicit auto column: a <select> is as wide as its longest
	   option, which would otherwise widen the page past a 360px screen. */
	.field {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-1);
	}
	label {
		font-weight: 600;
		font-size: var(--text-sm);
	}
</style>
