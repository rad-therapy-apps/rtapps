<!--
	What this file does: Sign-in page markup for `(auth)/login`. Posts email/password to the
	`default` action in +page.server.ts.

	Used here and why: `use:enhance` progressively enhances the form (works with JS disabled as a
	plain POST; with JS it submits via fetch and re-renders `form` without a full page reload);
	`resolve()` for the register link per the `svelte/no-navigation-without-resolve` rule; Svelte 5
	runes (`$props()`) for `data`/`form`.

	How it fits the project: `data.next` and `data.googleEnabled` come from this route's `load`;
	the hidden `next` field round-trips the validated (safeNext-checked) redirect target back to
	the action on submit. `docs/03-architecture.md` §4.2.

	Works with: `$app/forms`, `$app/paths`. Used by: linked from `+layout.svelte` ("Sign in") and
	from the register page ("Already have an account?").
-->
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
	<!-- Server-rendered error from the last failed submit (bad credentials, API down, etc). -->
	{#if form?.error}
		<p id="login-error" aria-live="polite" class="error">{form.error}</p>
	{/if}

	<div class="field">
		<label for="email">Email</label>
		<input id="email" name="email" type="email" required value={form?.email ?? ''} />
	</div>

	<div class="field">
		<label for="password">Password</label>
		<!-- current-password (not new-password) tells the browser/password manager this is a
		     login, not an account-creation form. -->
		<input id="password" name="password" type="password" required autocomplete="current-password" />
	</div>

	<!-- Carries the safeNext-validated redirect target through to the server action. -->
	<input type="hidden" name="next" value={data.next} />

	<button type="submit">Sign in</button>
</form>

<!-- Google sign-in link, shown only when the API reports the provider is configured. -->
{#if data.googleEnabled}
	<p><a href="/api/v1/auth/google/start" rel="external">Continue with Google</a></p>
{/if}

<p><a href={resolve('/(auth)/register')}>Need an account? Register</a></p>

<style>
	/* Form layout: stacked fields, capped width. */
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
