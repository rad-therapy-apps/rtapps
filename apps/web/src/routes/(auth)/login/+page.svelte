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

	Works with: `$app/forms`, `$app/paths`, `$lib/ui/{Alert,Button,Card,Field}.svelte`. Used by: linked from `+layout.svelte` ("Sign in") and
	from the register page ("Already have an account?").
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
	<title>Sign in — RTTLearn</title>
</svelte:head>

<div class="auth">
	<Card>
		<h1>Sign in</h1>

		<form method="POST" use:enhance aria-describedby={form?.error ? 'login-error' : undefined}>
			<!-- Server-rendered error from the last failed submit (bad credentials, API down, etc). -->
			{#if form?.error}
				<Alert tone="danger" id="login-error" role="status">{form.error}</Alert>
			{/if}

			<Field label="Email" id="email">
				<input id="email" name="email" type="email" required value={form?.email ?? ''} />
			</Field>

			<Field label="Password" id="password">
				<!-- current-password (not new-password) tells the browser/password manager this is a
			     login, not an account-creation form. -->
				<input
					id="password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
				/>
			</Field>

			<!-- Carries the safeNext-validated redirect target through to the server action. -->
			<input type="hidden" name="next" value={data.next} />

			<Button type="submit" variant="primary">Sign in</Button>
		</form>
	</Card>

	<!-- Google sign-in link, shown only when the API reports the provider is configured. -->
	{#if data.googleEnabled}
		<p><a href="/api/v1/auth/google/start" rel="external">Continue with Google</a></p>
	{/if}

	<p><a href={resolve('/(auth)/register')}>Need an account? Register</a></p>
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
