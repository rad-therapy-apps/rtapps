/**
 * What this file does: Root layout `load` for every route. Runs on the server for every
 * request (SSR and client-side navigations alike) and supplies `data.user` to `+layout.svelte`.
 *
 * Used here and why: `+layout.server.ts` only ever executes on the server, so it can read
 * `locals.user` — the session lookup `hooks.server.ts` already did for this request — without
 * a second round trip to the API.
 *
 * How it fits the project: `hooks.server.ts` resolves `locals.user` (via `apiFetch`/`auth/me`)
 * and `guard.ts` redirects anonymous users away from gated routes before any `load` here runs;
 * this layout just forwards the result so the header nav can show sign-in/sign-out state. See
 * ADR-0002 and `docs/03-architecture.md` §4.
 *
 * Works with: `app.d.ts` (`App.Locals.user` type). Used by: `+layout.svelte` (root layout).
 */
import type { LayoutServerLoad } from './$types';

// Passes through the user already resolved by hooks.server.ts; never calls the API itself.
export const load: LayoutServerLoad = ({ locals }) => {
	return { user: locals.user };
};
