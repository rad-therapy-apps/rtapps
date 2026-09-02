/**
 * What this file does: Form `action` for `(auth)/logout`. Has no `load` and no page markup — it
 * is posted to directly (from the sign-out form in `+layout.svelte`) and always redirects to
 * `/login`.
 *
 * Used here and why: `+page.server.ts` runs only on the server so it can call the API with the
 * forwarded session cookie via `apiFetch(event, …)`; a single `default` action since there is
 * only one thing this route does.
 *
 * How it fits the project: revokes the session server-side (the `session` row, ADR-0002) and
 * then clears the cookie locally regardless of whether that call succeeded, so a user can always
 * sign out even if the API is unreachable. `docs/03-architecture.md` §4.2.
 *
 * Works with: `$lib/server/api` (`apiFetch`, `relaySetCookie`). Used by: the sign-out `<form>`
 * in `+layout.svelte` (`action="/logout"`).
 */
import { redirect } from '@sveltejs/kit';
import { apiFetch, relaySetCookie } from '$lib/server/api';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		try {
			// Ask the API to revoke the session row; relay any Set-Cookie it sends back (it may
			// clear rt_session itself).
			const res = await apiFetch(event, '/auth/logout', { method: 'POST' });
			relaySetCookie(event, res);
		} catch {
			/* API unreachable: still sign out locally below */
		}
		// Belt-and-braces fallback: delete the cookie locally even if the API call above failed
		// or didn't clear it, so the browser is never left holding a session cookie.
		event.cookies.delete('rt_session', { path: '/' });
		// A literal path, not `resolve('/(auth)/login')`: this form's action is the absolute,
		// cross-route `/logout` (not the same-page `?/action` convention every other action in
		// this app uses), so `resolve()`'s relative-path depth — computed from *this* request's
		// URL (`/logout`) — comes out wrong once the client applies it against whatever deeper
		// page the sign-out form was actually submitted from (e.g. `/educator/cohorts/{id}` ->
		// `/educator/cohorts/login`). `/login` has no route params and no base path in this
		// deployment, so a literal string is both correct and simpler here.
		redirect(303, '/login');
	}
};
