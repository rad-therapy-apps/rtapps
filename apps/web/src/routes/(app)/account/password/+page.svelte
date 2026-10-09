<!--
	What this file does: Change-password page markup for `(app)/account/password`. Posts
	current/new/confirm password to the `default` action in +page.server.ts.

	Used here and why: `use:enhance` progressively enhances the form, same as login/register;
	Svelte 5 runes (`$props()`, `$state`, `$derived`) drive the client-side confirm-mismatch
	check — a JS-only convenience, the server action re-checks the same thing.

	How it fits the project: this is where `hooks.server.ts` sends a signed-in user whose
	`must_change_password` flag is set (an admin password reset), and where any signed-in user
	can change their password voluntarily via the nav's "Account" link.
	`docs/03-architecture.md` §4.2, §7.

	Works with: `$app/forms`, `$lib/ui/{Alert,Button,Card,Field}.svelte`. Used by: linked from `+layout.svelte` ("Account"); reached via the
	forced-change redirect in `hooks.server.ts`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	// Only flagged once the confirm field has content, so the mismatch message doesn't show
	// before the user has typed anything into it.
	let mismatch = $derived(confirmPassword.length > 0 && confirmPassword !== newPassword);
</script>

<svelte:head>
	<title>Change password — RTTLearn</title>
</svelte:head>

<div class="auth">
	<Card>
		<h1>Change password</h1>

		<form method="POST" use:enhance aria-describedby={form?.error ? 'password-error' : undefined}>
			<!-- Server-rendered error from the last failed submit (wrong current password, Google-only
	     account, weak new password, API down, etc). -->
			{#if form?.error}
				<Alert tone="danger" id="password-error" role="status">{form.error}</Alert>
			{/if}

			<Field label="Current password" id="current_password">
				<input
					id="current_password"
					name="current_password"
					type="password"
					required
					autocomplete="current-password"
				/>
			</Field>

			<Field label="New password" id="new_password">
				<input
					id="new_password"
					name="new_password"
					type="password"
					required
					minlength="10"
					maxlength="256"
					autocomplete="new-password"
					bind:value={newPassword}
				/>
			</Field>

			<Field label="Confirm new password" id="confirm_password">
				<input
					id="confirm_password"
					name="confirm_password"
					type="password"
					required
					minlength="10"
					maxlength="256"
					autocomplete="new-password"
					bind:value={confirmPassword}
				/>
			</Field>

			<!-- Client-side-only mismatch notice; the server action rejects a mismatch too. -->
			{#if mismatch}
				<Alert tone="danger" role="status">New passwords do not match</Alert>
			{/if}

			<Button type="submit" variant="primary" disabled={mismatch}>Change password</Button>
		</form>
	</Card>
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
