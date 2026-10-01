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

	Works with: `$app/forms`. Used by: linked from `+layout.svelte` ("Account"); reached via the
	forced-change redirect in `hooks.server.ts`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
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

<h1>Change password</h1>

<form method="POST" use:enhance aria-describedby={form?.error ? 'password-error' : undefined}>
	<!-- Server-rendered error from the last failed submit (wrong current password, Google-only
	     account, weak new password, API down, etc). -->
	{#if form?.error}
		<p id="password-error" aria-live="polite" class="error">{form.error}</p>
	{/if}

	<div class="field">
		<label for="current_password">Current password</label>
		<input
			id="current_password"
			name="current_password"
			type="password"
			required
			autocomplete="current-password"
		/>
	</div>

	<div class="field">
		<label for="new_password">New password</label>
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
	</div>

	<div class="field">
		<label for="confirm_password">Confirm new password</label>
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
	</div>

	<!-- Client-side-only mismatch notice; the server action rejects a mismatch too. -->
	{#if mismatch}
		<p class="error" aria-live="polite">New passwords do not match</p>
	{/if}

	<button type="submit" disabled={mismatch}>Change password</button>
</form>

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
		color: var(--danger);
	}
</style>
