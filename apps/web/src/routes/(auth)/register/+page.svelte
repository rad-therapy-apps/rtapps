<!--
	What this file does: Registration page markup for `(auth)/register`. Posts email/display
	name/password to the `default` action in +page.server.ts.

	Used here and why: `use:enhance` for progressive enhancement, same as the login page;
	`resolve()` for the sign-in link (`svelte/no-navigation-without-resolve`); Svelte 5 runes
	(`$props()`).

	How it fits the project: `minlength`/`maxlength` on the password and `maxlength` on the
	display name mirror the API's own validation limits, so most invalid input is caught before
	a round trip — the API is still the source of truth and re-validates on submit.
	`docs/03-architecture.md` §4.2.

	Works with: `$app/forms`, `$app/paths`. Used by: linked from `+layout.svelte` ("Register")
	and from the login page ("Need an account?"); driven by `apps/web/e2e/lesson.e2e.ts`.
-->
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
	<!-- Server-rendered error from the last failed submit (e.g. email taken, API down). -->
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
		<!-- new-password (not current-password) tells the browser/password manager this creates
		     a new credential; minlength/maxlength mirror the API's password length limits. -->
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

	<!-- Carries the safeNext-validated redirect target through to the server action. -->
	<input type="hidden" name="next" value={data.next} />

	<button type="submit">Register</button>
</form>

<p><a href={resolve('/login')}>Already have an account? Sign in</a></p>

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
