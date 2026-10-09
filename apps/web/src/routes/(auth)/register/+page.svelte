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

	Works with: `$app/forms`, `$app/paths`, `$lib/ui/{Alert,Button,Card,Field}.svelte`. Used by: linked from `+layout.svelte` ("Register")
	and from the login page ("Need an account?"); driven by `apps/web/e2e/lesson.e2e.ts`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Register — RTTLearn</title>
</svelte:head>

<div class="auth">
	<Card>
		<h1>Create an account</h1>

		<form method="POST" use:enhance aria-describedby={form?.error ? 'register-error' : undefined}>
			<!-- Server-rendered error from the last failed submit (e.g. email taken, API down). -->
			{#if form?.error}
				<Alert tone="danger" id="register-error" role="status">{form.error}</Alert>
			{/if}

			<Field label="Email" id="email">
				<input id="email" name="email" type="email" required value={form?.email ?? ''} />
			</Field>

			<Field label="Display name" id="display_name">
				<input
					id="display_name"
					name="display_name"
					type="text"
					required
					maxlength="120"
					value={form?.display_name ?? ''}
				/>
			</Field>

			<Field label="Password" id="password">
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
			</Field>

			<!-- Carries the safeNext-validated redirect target through to the server action. -->
			<input type="hidden" name="next" value={data.next} />

			<Button type="submit" variant="primary">Register</Button>
		</form>
	</Card>

	<p><a href={resolve('/(auth)/login')}>Already have an account? Sign in</a></p>
</div>

<style>
	/* Centred card, capped width. */
	.auth {
		max-width: 24rem;
		margin-inline: auto;
	}
	h1 {
		margin-top: 0;
	}
	form {
		display: grid;
		gap: var(--space-4);
	}
</style>
