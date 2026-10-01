<!--
	What this file does: The RTTLearn brand mark as inline SVG, decorative (the wordmark text beside it is the name).

	Used here and why: SVG presentation attributes cannot take `var()`, so this is the one kit file allowed hex colours (see `no-hex.test.ts`).

	How it fits the project: a copy of Kevin Kindle's legacy mark `RadTherapyPlatform/public/rtapps-icon.svg`, which stays read-only. Shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md.

	Depends on: nothing.
	Used by: `AppShell.svelte` (signed-in sidebar brand) and the root layout's signed-out public bar.
-->

<script lang="ts">
	let { size = 28 }: { size?: number } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 64 64"
	width={size}
	height={size}
	aria-hidden="true"
	focusable="false"
>
	<rect width="64" height="64" rx="12" fill="#0B1A2E" />
	<circle cx="32" cy="32" r="21" fill="none" stroke="#1E3A5F" stroke-width="2" />
	<path
		d="M32 11 A21 21 0 0 1 50.2 41.5"
		fill="none"
		stroke="#22D3EE"
		stroke-width="3"
		stroke-linecap="round"
	/>
	<circle cx="32" cy="32" r="6" fill="#22D3EE" />
	<circle cx="32" cy="11" r="2.5" fill="#22D3EE" />
</svg>
