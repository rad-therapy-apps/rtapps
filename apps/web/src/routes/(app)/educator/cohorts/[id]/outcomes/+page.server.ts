/**
 * What this file does: SSR `load` for `(app)/educator/cohorts/[id]/outcomes`. Fetches the
 * cohort's per-outcome mastery: aggregate stats per outcome plus per-student rows.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie; `error()` distinguishes a missing cohort (404) and an educator viewing
 * someone else's cohort (403) from a genuine API failure (502), matching the cohort overview
 * route's mapping.
 *
 * How it fits the project: `(app)/+layout.server.ts`/`guard.ts` guarantee a signed-in
 * educator/admin before this route runs; the API's own membership check enforces the 403
 * (FR-E-03). `docs/03-architecture.md` §7 (`cohorts/{id}/outcomes`), plan 3a Task 15.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`OutcomeMasteryOut`). Used by:
 * `+page.svelte` (this route), reached from `(app)/educator/cohorts/[id]/+page.svelte`.
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type OutcomeMasteryOut = components['schemas']['OutcomeMasteryOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, `/cohorts/${event.params.id}/outcomes`);
	if (res.status === 404) error(404, 'Cohort not found');
	if (res.status === 403) error(403, 'You are not an educator of this cohort');
	if (!res.ok) error(502, 'Could not load the outcomes');
	const mastery: OutcomeMasteryOut = await res.json();
	// cohortId is passed through only for the page's CSV link and "back to cohort" link.
	return { mastery, cohortId: event.params.id };
};
