/**
 * What this file does: Plain JSON API endpoint at `GET /health` (not a page — no `+page.svelte`
 * alongside it). Reports the web process is up and proxies the API's own health check.
 *
 * Used here and why: a `+server.ts` route handler (SvelteKit's way of exposing a non-HTML
 * endpoint) rather than a `load`, since this is consumed by uptime checks/scripts, not browsers
 * navigating a page.
 *
 * How it fits the project: `/health` is a public path (`guard.ts`), reachable without a session;
 * it calls the API's `/api/v1/health` the same way any server-side code does, via `apiFetch`, and
 * never throws on API failure — a down API is reported in the JSON body, not as a 5xx here.
 *
 * Works with: `$lib/server/api` (`apiFetch`, the `fetch` overload). Used by: uptime/liveness
 * checks against the deployed proxy (see `docs/03-architecture.md` §3, `system: GET health`).
 */
import { json } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';

export async function GET({ fetch, request }) {
	// Forwards the incoming cookie manually (this overload of apiFetch takes `fetch`, not the
	// full RequestEvent, so it can't read the cookie itself the way the RequestEvent overload does).
	const res = await apiFetch(fetch, '/health', {
		cookie: request.headers.get('cookie') ?? undefined
	});
	const api = res.ok ? await res.json() : { status: 'error', code: res.status };
	return json({ web: 'ok', api });
}
