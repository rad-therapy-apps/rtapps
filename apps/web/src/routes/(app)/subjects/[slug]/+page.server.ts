/**
 * What this file does: SSR `load` for `(app)/subjects/[slug]`. Fetches one subject's detail —
 * summary and its lesson list — by slug (`GET /subjects/{slug}`).
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie; `error()` distinguishes a genuinely missing subject (404, e.g. a bad or
 * stale slug) from an API/network failure (502), so the error page shown matches the cause.
 *
 * How it fits the project: `(app)/+layout.server.ts` guarantees a signed-in user before this
 * runs. `docs/03-architecture.md` §7 (`GET subjects/{slug}`).
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`SubjectDetailOut`). Used by:
 * `+page.svelte` (this route), reached from `(app)/subjects/+page.svelte`; driven by
 * `apps/web/e2e/lesson.e2e.ts`.
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type SubjectDetailOut = components['schemas']['SubjectDetailOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, `/subjects/${event.params.slug}`);
	// No subject with this slug: a genuine 404, distinct from an API failure below.
	if (res.status === 404) error(404, 'Subject not found');
	// Any other non-2xx (API down, 500, etc): a 502, since the subject may well exist.
	if (!res.ok) error(502, 'Could not load the subject');
	const subject: SubjectDetailOut = await res.json();
	return { subject };
};
