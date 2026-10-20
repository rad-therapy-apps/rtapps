<!--
	What this file does: A tab strip (`tablist` of `tab` buttons) for the editor pages; the page keeps rendering its own `tabpanel`s, spreading `tabPanel(id, tabId)` onto each so the two stay paired.

	Used here and why: the five author editors each carried an identical copy of this markup and CSS. Activation is manual, matching today's click behaviour (selecting a tab can unmount an editor or trigger a fetch): Left/Right move focus between tabs (wrapping), Home/End jump to the first/last, Enter/Space (a native button click) select. Roving tabindex keeps one tab stop. Props: `id` (the tab set's id, unique on the page), `tabs`, `selected` (bindable), `label`, `onselect`. Only the selected tab gets `aria-controls`, because the editors render only the selected panel. The selected tab shows weight plus an underline, not colour alone.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).

	Depends on: nothing.
	Used by: the lesson, quiz, deck, matching and sequencing editor pages under `(app)/author`.
-->

<script module lang="ts">
	/** Attributes for the panel that belongs to tab `tab` of the tab set `set`. */
	export function tabPanel(set: string, tab: string) {
		return {
			role: 'tabpanel' as const,
			id: `${set}-panel-${tab}`,
			'aria-labelledby': `${set}-tab-${tab}`
		};
	}
</script>

<script lang="ts" generics="T extends string">
	let {
		id,
		tabs,
		selected = $bindable(),
		label,
		onselect
	}: {
		id: string;
		tabs: { id: T; label: string }[];
		selected: T;
		label: string;
		onselect?: (id: T) => void;
	} = $props();

	function select(tabId: T) {
		selected = tabId;
		onselect?.(tabId);
	}

	function onkeydown(event: KeyboardEvent, index: number) {
		// Modified arrows belong to the browser (Alt+Left/Right is Back/Forward).
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		let next: number;
		if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = tabs.length - 1;
		else return;
		event.preventDefault();
		document.getElementById(`${id}-tab-${tabs[next].id}`)?.focus();
	}
</script>

<div class="tabs" role="tablist" aria-label={label}>
	{#each tabs as tab, i (tab.id)}
		<button
			type="button"
			role="tab"
			id="{id}-tab-{tab.id}"
			aria-controls={selected === tab.id ? `${id}-panel-${tab.id}` : undefined}
			aria-selected={selected === tab.id}
			tabindex={selected === tab.id ? 0 : -1}
			onclick={() => select(tab.id)}
			onkeydown={(event) => onkeydown(event, i)}
		>
			{tab.label}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-block-end: var(--space-5);
		border-block-end: 1px solid var(--border-strong);
	}
	.tabs button {
		border-color: transparent;
		border-end-start-radius: 0;
		border-end-end-radius: 0;
		background: transparent;
		color: var(--text-muted);
		margin-block-end: -1px;
	}
	/* The scoped border-color above blocks the global hover, so unselected tabs get their own. */
	.tabs button:hover:not([aria-selected='true']) {
		background: var(--surface-raised);
		color: var(--text);
	}
	/* Selected tab: accent underline plus bold text, so colour is not the only signal. */
	.tabs button[aria-selected='true'] {
		background: var(--accent-soft);
		border-block-end: 3px solid var(--accent);
		color: var(--text);
		font-weight: 700;
	}
</style>
