<!--
	What this file does: Root layout markup wrapping every page — the header/nav bar plus the
	sign-out form — and renders the current page via `{@render children()}`.

	Used here and why: Svelte 5 runes (`$props()`) for `data`/`children`; `resolve()` from
	`$app/paths` for every `href` because the `svelte/no-navigation-without-resolve` lint rule
	requires route names to be resolved rather than hand-written strings; `use:enhance` on the
	sign-out form for progressive enhancement (works without JS, upgrades to a fetch when JS is
	present) without changing where the request goes.

	How it fits the project: `data.user` comes from `+layout.server.ts`, which just forwards
	`locals.user` set by `hooks.server.ts`; this file only decides what to show, not who is
	signed in. `docs/03-architecture.md` §4.

	Works with: `$app/forms`, `$app/paths`, `$lib/assets/favicon.svg`. Used by: every route
	(this is the root layout); the sign-out form posts to `(auth)/logout/+page.server.ts`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<a href={resolve('/')} class="brand">RTApps</a>
	<nav>
		<!-- Signed in: subjects link, display name, and a sign-out form. -->
		{#if data.user}
			<a href={resolve('/subjects')}>Subjects</a>
			<span>{data.user.display_name}</span>
			<form method="POST" action="/logout" use:enhance>
				<button type="submit">Sign out</button>
			</form>
		{:else}
			<!-- Signed out: sign-in / register links only. -->
			<a href={resolve('/login')}>Sign in</a>
			<a href={resolve('/register')}>Register</a>
		{/if}
	</nav>
</header>

{@render children()}

<style>
	/* Header bar: brand on the left, nav on the right. */
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid #ddd;
	}
	.brand {
		font-weight: bold;
		text-decoration: none;
	}
	/* Nav row: links/name/sign-out form laid out inline. */
	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	/* display: contents lets the sign-out <form> sit inline with the other nav items,
	   as if the form element itself weren't there. */
	nav form {
		display: contents;
	}
</style>
