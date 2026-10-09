<!--
	What this file does: the "Light page" switch on the lesson page; flips the reading panel between its dark and light paper and remembers the choice.
	Used here and why: Svelte 5 runes (`$state`, `onMount`); the choice lives on `<html data-reading>` so prose.css can swap the `--paper-*` tokens, and in `localStorage` under `rttlearn:reading` so it survives reloads. Every storage access is in try/catch, so with storage blocked the toggle still works for the session.
	How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md (reading panel). The inline script in `src/app.html` applies a saved 'light' before first paint; this component reads the attribute on mount to match it.
	Depends on: `$lib/ui/Button.svelte`, `@lucide/svelte` (sun, moon).
	Used by: `src/routes/(app)/lessons/[slug]/+page.svelte`, `ReadingToggle.svelte.spec.ts`.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Button from '$lib/ui/Button.svelte';

	const KEY = 'rttlearn:reading';

	// True when the light page is on; read from <html> on mount so it matches the no-flash script.
	let light = $state(false);

	onMount(() => {
		light = document.documentElement.dataset.reading === 'light';
	});

	// Flips the mode, applies it to <html>, and saves it when storage allows.
	function toggle() {
		light = !light;
		document.documentElement.dataset.reading = light ? 'light' : 'dark';
		try {
			localStorage.setItem(KEY, light ? 'light' : 'dark');
		} catch {
			/* storage unavailable: the choice lasts for this session only */
		}
	}
</script>

<Button variant="secondary" icon={light ? Moon : Sun} aria-pressed={light} onclick={toggle}>
	Light page
</Button>
