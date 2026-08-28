<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Register — RTApps</title>
</svelte:head>

<h1>Create an account</h1>

<form method="POST" use:enhance aria-describedby={form?.error ? 'register-error' : undefined}>
	{#if form?.error}
		<p id="register-error" aria-live="polite" class="error">{form.error}</p>
	{/if}

	<div class="field">
		<label for="email">Email</label>
		<input id="email" name="email" type="email" required value={form?.email ?? ''} />
	</div>

	<div class="field">
		<label for="display_name">Display name</label>
		<input
			id="display_name"
			name="display_name"
			type="text"
			required
			maxlength="120"
			value={form?.display_name ?? ''}
		/>
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input
			id="password"
			name="password"
			type="password"
			required
			minlength="10"
			maxlength="256"
			autocomplete="new-password"
		/>
	</div>

	<input type="hidden" name="next" value={data.next} />

	<button type="submit">Register</button>
</form>

<p><a href={resolve('/login')}>Already have an account? Sign in</a></p>

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
