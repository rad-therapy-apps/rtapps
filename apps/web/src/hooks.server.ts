/**
 * What this file does: SvelteKit's server-only request hook. Runs before every request:
 * resolves who the caller is (by asking the API) and redirects away from pages the caller
 * isn't allowed to see.
 * Used here and why: SvelteKit's `Handle` hook — the one place guaranteed to run once per
 * request on the server, before any `load()` function.
 * How it fits the project: implements the SSR half of ADR-0002 (same-origin proxy + cookie
 * sessions) — the browser's `rt_session` cookie is forwarded to `GET /api/v1/auth/me` so `web`
 * never touches the database itself; `decideAccess` (guard.ts) enforces the role-gated route
 * groups. See `docs/03-architecture.md` §4.2/§9.
 * Depends on: `$lib/server/api` (apiFetch), `$lib/server/guard` (decideAccess), `@sveltejs/kit`.
 * Used by: SvelteKit itself (framework convention — no explicit importer; every request in the
 * app runs through this file).
 */
import { redirect, type Handle } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { decideAccess } from '$lib/server/guard';

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
