<!--
	What this file does: Root layout markup wrapping every page. Signed-in users get the AppShell
	(sidebar on desktop, top bar and drawer on phones); signed-out visitors get a plain public bar
	with the brand and Sign in / Register links. Renders the page via `{@render children()}`.

	Used here and why: Svelte 5 runes (`$props()`) for `data`/`children`; `resolve()` from
	`$app/paths` for every `href` (`svelte/no-navigation-without-resolve`); `use:enhance` on the
	sign-out form for progressive enhancement. The form stays here and is handed to AppShell as a
	snippet so AppShell does not depend on `$app/forms`.

	How it fits the project: `data.user` comes from `+layout.server.ts`, which just forwards
	`locals.user` set by `hooks.server.ts`; this file only decides what to show, not who is
	signed in. The layout owns the page's single `<main>`. `docs/03-architecture.md` §4.

	Works with: `$app/forms`, `$app/paths`, `$app/state`, `$lib/ui/AppShell.svelte`,
	`$lib/assets/rttlearn-icon.svg`. Used by: every route (this is the root layout); the sign-out
	form posts to `(auth)/logout/+page.server.ts`.
-->
<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/inter';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LogOut from '@lucide/svelte/icons/log-out';
	import favicon from '$lib/assets/rttlearn-icon.svg';
	import AppShell from '$lib/ui/AppShell.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Logo from '$lib/ui/Logo.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- The sign-out form stays here (it needs $app/forms' enhance) and is handed to AppShell. -->
{#snippet signOut()}
	<form method="POST" action="/logout" use:enhance>
		<Button type="submit" variant="ghost" icon={LogOut}>Sign out</Button>
	</form>
{/snippet}

{#if data.user}
	<AppShell user={data.user} currentPath={page.url.pathname} {signOut}>
		{@render children()}
	</AppShell>
{:else}
	<!-- Signed out: brand plus sign-in / register links only. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- in-page fragment, not a route -->
	<a class="skip-link" href="#main">Skip to content</a>
	<header class="public-bar">
		<a href={resolve('/')} class="brand"><Logo size={28} /><span>RTTLearn</span></a>
		<nav aria-label="Account">
			<a href={resolve('/(auth)/login')}>Sign in</a>
			<a href={resolve('/(auth)/register')}>Register</a>
		</nav>
	</header>
	<main id="main" class="public-main">
		{@render children()}
	</main>
{/if}

<style>
	.public-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-5);
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
		text-decoration: none;
		font-size: var(--text-lg);
		font-weight: 700;
	}
	nav {
		display: flex;
		gap: var(--space-4);
	}
	.public-main {
		max-width: 32rem;
		margin-inline: auto;
		padding: var(--space-6) var(--space-4);
	}
</style>
