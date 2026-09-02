/**
 * What this file does: SvelteKit's server-only request hook. Runs before every request:
 * resolves who the caller is (by asking the API) and redirects away from pages the caller
 * isn't allowed to see. Also wires up opt-in, server-side-only Sentry error tracking.
 * Used here and why: SvelteKit's `Handle` hook — the one place guaranteed to run once per
 * request on the server, before any `load()` function; `HandleServerError` is SvelteKit's hook
 * for unhandled exceptions during routing/load/rendering.
 * How it fits the project: implements the SSR half of ADR-0002 (same-origin proxy + cookie
 * sessions) — the browser's `rt_session` cookie is forwarded to `GET /api/v1/auth/me` so `web`
 * never touches the database itself; `decideAccess` (guard.ts) enforces the role-gated route
 * groups. See `docs/03-architecture.md` §4.2/§9. Sentry is opt-in (blank `SENTRY_DSN` is a
 * no-op) and server-side only for now — client-side Sentry is deliberately deferred.
 * Depends on: `$lib/server/api` (apiFetch), `$lib/server/guard` (decideAccess), `@sveltejs/kit`,
 * `$env/dynamic/private` (SENTRY_DSN), `@sentry/sveltekit`.
 * Used by: SvelteKit itself (framework convention — no explicit importer; every request in the
 * app runs through this file).
 */
import * as Sentry from '@sentry/sveltekit';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { apiFetch } from '$lib/server/api';
import { decideAccess } from '$lib/server/guard';

// Initialized only when SENTRY_DSN is set; otherwise Sentry.init is never called and the
// captureException call in handleError below is a no-op.
if (env.SENTRY_DSN) {
	Sentry.init({ dsn: env.SENTRY_DSN });
}

// Runs once per incoming request, before routing/load(): stamp a request id, resolve locals.user
// from the session cookie (treating an unreachable API as signed-out), then enforce route access.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = crypto.randomUUID();
	event.locals.user = null;
	if (event.request.headers.get('cookie')?.includes('rt_session=')) {
		try {
			const res = await apiFetch(event, '/auth/me');
			if (res.ok) event.locals.user = await res.json();
		} catch {
			/* API unreachable: treat as signed out */
		}
	}
	const decision = decideAccess(event.url.pathname, event.locals.user);
	if ('redirect' in decision) throw redirect(303, decision.redirect);
	return resolve(event);
};

// Reports unhandled server-side exceptions to Sentry when configured; a no-op when
// SENTRY_DSN is unset (falls back to SvelteKit's default { message } error shape either way).
export const handleError: HandleServerError = ({ error }) => {
	if (env.SENTRY_DSN) Sentry.captureException(error);
};
