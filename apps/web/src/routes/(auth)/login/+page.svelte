<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Sign in — RTApps</title>
</svelte:head>

<h1>Sign in</h1>

<form method="POST" use:enhance aria-describedby={form?.error ? 'login-error' : undefined}>
	{#if form?.error}
		<p id="login-error" aria-live="polite" class="error">{form.error}</p>
	{/if}

	<div class="field">
		<label for="email">Email</label>
		<input id="email" name="email" type="email" required value={form?.email ?? ''} />
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input id="password" name="password" type="password" required autocomplete="current-password" />
	</div>

	<input type="hidden" name="next" value={data.next} />

	<button type="submit">Sign in</button>
</form>

{#if data.googleEnabled}
	<p><a href="/api/v1/auth/google/start" rel="external">Continue with Google</a></p>
{/if}

<p><a href={resolve('/register')}>Need an account? Register</a></p>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 24rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.error {
		color: #b00020;
	}
</style>
