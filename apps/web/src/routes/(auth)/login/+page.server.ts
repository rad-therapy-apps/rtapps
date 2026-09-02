/**
 * What this file does: SSR `load` and form `action` for `(auth)/login`. `load` decides whether
 * to show the form (and whether the Google sign-in link appears); `default` action submits
 * email/password to the API and, on success, becomes signed in.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so it can call the API with
 * `apiFetch(event, …)` — passing the `RequestEvent` forwards the session cookie and sets
 * `Origin` on this POST so the API's CSRF check passes; the login submit is a SvelteKit form
 * action (paired with `use:enhance` in `+page.svelte`) using `fail()` for user-correctable
 * errors (bad credentials, API down) and `redirect()` for the success path.
 *
 * How it fits the project: this route is public in `guard.ts`, but `load` still redirects an
 * already-signed-in user to `/home` before showing the form again. On success the API's
 * `Set-Cookie` (the `rt_session` cookie from ADR-0002) is relayed onto the browser via
 * `relaySetCookie` before the redirect fires — the browser never sees a redirect without also
 * getting the cookie in the same response. `docs/03-architecture.md` §4.2.
 *
 * Works with: `$lib/server/api` (`apiFetch`, `relaySetCookie`), `$lib/server/auth-forms`
 * (`problemMessage`, `safeNext`). Used by: `+page.svelte` (this route).
 */
import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { apiFetch, relaySetCookie } from '$lib/server/api';
import { problemMessage, safeNext } from '$lib/server/auth-forms';
import type { Actions, PageServerLoad } from './$types';

// Renders the login form, pre-filling `googleEnabled` and a validated `next` redirect target.
export const load: PageServerLoad = async (event) => {
	// Already signed in: don't show the login form again.
	if (event.locals.user) redirect(303, resolve('/(app)/home'));

	let googleEnabled = false;
	try {
		const res = await apiFetch(event, '/auth/providers');
		if (res.ok) googleEnabled = (await res.json()).google === true;
	} catch {
		/* API unreachable: hide the Google link */
	}

	// safeNext rejects protocol-relative / off-site values so a crafted `?next=` can't redirect
	// a signed-in user off this site (open-redirect guard).
	return { googleEnabled, next: safeNext(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
	// Submits email/password to the API; on success relays the session cookie and redirects.
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		// Re-validate `next` from the submitted form value too, not just the query string.
		const next = safeNext(String(form.get('next') ?? ''));

		let res: Response;
		try {
			res = await apiFetch(event, '/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
		} catch {
			// API unreachable: user sees a retry-able 503 message, form re-renders with their email.
			return fail(503, {
				error: 'The service is temporarily unavailable. Please try again.',
				email
			});
		}

		if (!res.ok) {
			// Bad credentials or validation error: surface the API's problem+json as a form error.
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, { error: problemMessage(problem, res.status), email });
		}

		// Relay the API's Set-Cookie (rt_session) onto the browser before redirecting, so the
		// next request already carries the session.
		relaySetCookie(event, res);
		redirect(303, next);
	}
};
