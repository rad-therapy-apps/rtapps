/**
 * What this file does: SSR `load` for `/`, the public landing page. Shows web/API health when
 * signed out; redirects straight through to `/home` when already signed in.
 *
 * Used here and why: plain `load` (not an `Actions` object — this route has no form); runs on
 * the server, so it can call the internal API URL directly via `apiFetch`.
 *
 * How it fits the project: `/` is one of the public paths in `guard.ts` (`decideAccess`), so it
 * never requires a user; this `load` still checks `locals.user` itself to bounce signed-in users
 * onward to `/home` rather than showing them the marketing/health page again.
 *
 * Works with: `$lib/server/api` (`apiFetch`). Used by: `+page.svelte` (this route).
 */
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { apiFetch } from '$lib/server/api';

export async function load({ fetch, locals }) {
	// Already signed in: skip the landing page entirely.
	if (locals.user) redirect(303, resolve('/(app)/home'));

	let api: { status: string; database?: string } = { status: 'unreachable' };
	try {
		const res = await apiFetch(fetch, '/health');
		if (res.ok) api = await res.json();
	} catch {
		/* API down: show the status on the page instead of failing the render */
	}
	return { api };
}
