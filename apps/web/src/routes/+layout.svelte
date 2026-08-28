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
		{#if data.user}
			<a href={resolve('/subjects')}>Subjects</a>
			<span>{data.user.display_name}</span>
			<form method="POST" action="/logout" use:enhance>
				<button type="submit">Sign out</button>
			</form>
		{:else}
			<a href={resolve('/login')}>Sign in</a>
			<a href={resolve('/register')}>Register</a>
		{/if}
	</nav>
</header>

{@render children()}

<style>
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
	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	nav form {
		display: contents;
	}
</style>
