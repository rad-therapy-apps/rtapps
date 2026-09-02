/**
 * What this file does: SSR `load` and form `action` for `(auth)/register`. `load` supplies the
 * validated redirect target; `default` action creates the account via the API and, on success,
 * signs the new user in.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` can
 * forward cookies and set `Origin` on this POST for the API's CSRF check; `fail()` for
 * user-correctable errors, `redirect()` on success, matching the login route's pattern.
 *
 * How it fits the project: public route (`guard.ts`); on success the API's `Set-Cookie`
 * (`rt_session`, ADR-0002) is relayed via `relaySetCookie` before redirecting, so registration
 * doubles as sign-in — there is no separate "log in after registering" step.
 * `docs/03-architecture.md` §4.2, §7 (`auth/register`).
 *
 * Works with: `$lib/server/api` (`apiFetch`, `relaySetCookie`), `$lib/server/auth-forms`
 * (`problemMessage`, `safeNext`). Used by: `+page.svelte` (this route); driven end-to-end by
 * `apps/web/e2e/lesson.e2e.ts`, which registers a fresh account before exercising a lesson.
 */
import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { apiFetch, relaySetCookie } from '$lib/server/api';
import { problemMessage, safeNext } from '$lib/server/auth-forms';
import type { Actions, PageServerLoad } from './$types';

// Renders the registration form with a validated `next` redirect target.
export const load: PageServerLoad = async (event) => {
	// Already signed in: don't show the registration form again.
	if (event.locals.user) redirect(303, resolve('/(app)/home'));
	// safeNext rejects protocol-relative / off-site values (open-redirect guard).
	return { next: safeNext(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
	// Creates the account via the API; on success relays the session cookie and redirects.
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '');
		const displayName = String(form.get('display_name') ?? '');
		const password = String(form.get('password') ?? '');
		const next = safeNext(String(form.get('next') ?? ''));

		let res: Response;
		try {
			res = await apiFetch(event, '/auth/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password, display_name: displayName })
			});
		} catch {
			// API unreachable: user sees a retry-able 503 message, form re-renders their input.
			return fail(503, {
				error: 'The service is temporarily unavailable. Please try again.',
				email,
				display_name: displayName
			});
		}

		if (!res.ok) {
			// Validation error (e.g. email taken, password too short): surface the API's
			// problem+json as a form error.
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, {
				error: problemMessage(problem, res.status),
				email,
				display_name: displayName
			});
		}

		// Relay the API's Set-Cookie (rt_session) onto the browser before redirecting.
		relaySetCookie(event, res);
		redirect(303, next);
	}
};
