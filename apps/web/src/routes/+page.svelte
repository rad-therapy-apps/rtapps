<!--
	What this file does: Public landing page at `/`. A centred welcome with the logo, the RTTLearn
	wordmark, the web/API health lines returned by +page.server.ts's load, and a Sign in button.

	Used here and why: the `$lib/ui` kit (Logo, Button as a link); `resolve()` for the Sign in
	href, per `svelte/no-navigation-without-resolve`; Svelte 5 runes (`$props()`).

	How it fits the project: reachable without a session (see `guard.ts` public paths); signed-in
	users never see this page because the server load redirects them to `/home` first.

	Used by: nothing links here directly other than the browser's own root navigation and the
	header brand link (`resolve('/')` in `+layout.svelte`).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/ui/Button.svelte';
	import Logo from '$lib/ui/Logo.svelte';

	let { data } = $props();
</script>

<div class="welcome">
	<Logo size={64} />
	<h1>RTTLearn</h1>
	<p>Web: ok</p>
	<p>API: {data.api.status}{data.api.database ? ` (database ${data.api.database})` : ''}</p>
	<Button variant="primary" href={resolve('/(auth)/login')}>Sign in</Button>
</div>

<style>
	.welcome {
		display: grid;
		justify-items: center;
		gap: var(--space-2);
		padding-block: var(--space-6);
		text-align: center;
	}
	.welcome h1 {
		margin: 0;
	}
	.welcome p {
		margin: 0;
		color: var(--text-muted);
	}
	.welcome :global(.btn) {
		margin-block-start: var(--space-4);
	}
</style>
