/**
 * What this file does: form `action` for `(app)/account/password`. Posts current/new/confirm
 * password fields to the API's `POST /auth/change-password` and, on success, redirects to
 * `/subjects`.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiJson(event, …)` forwards
 * the session cookie and sets `Origin` for the API's CSRF check; `fail()` for user-correctable
 * errors (wrong current password, Google-only account, weak new password, mismatched confirm),
 * matching the login/register form action pattern.
 *
 * How it fits the project: this route is where `hooks.server.ts` sends a user whose
 * `must_change_password` flag is set (an admin password reset) — it must stay reachable from
 * that redirect, so it has no `load` guard beyond the `(app)` group's existing signed-in check.
 * A successful change clears the flag API-side, so the next request's redirect check no longer
 * fires. `docs/03-architecture.md` §4.2, §7 (`auth/change-password`).
 *
 * Works with: `$lib/server/api` (`apiJson`), `$lib/server/auth-forms` (`problemMessage`),
 * `@rtapps/api-client` (`ChangePasswordIn`). Used by: `+page.svelte` (this route); the
 * forced-change redirect in `../../../hooks.server.ts`.
 */
import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import type { components } from '@rtapps/api-client';
import type { Actions } from './$types';

type ChangePasswordIn = components['schemas']['ChangePasswordIn'];

export const actions: Actions = {
	// Submits the change-password form; on success redirects to /subjects.
	default: async (event) => {
		const form = await event.request.formData();
		const currentPassword = String(form.get('current_password') ?? '');
		const newPassword = String(form.get('new_password') ?? '');
		const confirmPassword = String(form.get('confirm_password') ?? '');

		// Server-side re-check of the confirm field: the page also checks this client-side, but
		// that's JS-only and never trusted on its own.
		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'New passwords do not match' });
		}

		const body: ChangePasswordIn = {
			current_password: currentPassword,
			new_password: newPassword
		};
		const res = await apiJson(event, '/auth/change-password', body);

		if (!res.ok) {
			// 403 wrong current password, 409 Google-only account, 422 weak new password: the
			// API's problem+json detail already says the right thing for each case.
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, { error: problemMessage(problem, res.status) });
		}

		redirect(303, resolve('/(app)/subjects'));
	}
};
