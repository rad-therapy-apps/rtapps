/**
 * What this file does: SSR `load` for `(app)/educator/cohorts/[id]/activities/[aid]`. Fetches one
 * activity's cohort-scoped attempt/pass-rate summary, score distribution, and per-item stats.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie; `error()` distinguishes a missing activity/cohort (404) and an educator
 * viewing someone else's cohort (403) from a genuine API failure (502), matching the cohort
 * overview route's mapping.
 *
 * How it fits the project: `(app)/+layout.server.ts`/`guard.ts` guarantee a signed-in
 * educator/admin before this route runs; the API's own membership check enforces the 403
 * (FR-E-03). `docs/03-architecture.md` §7 (`cohorts/{id}/activities/{aid}`), plan 3a Task 15.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`ActivityStatsOut`). Used by:
 * `+page.svelte` (this route), reached from `(app)/educator/cohorts/[id]/+page.svelte`.
 */
import { apiFetch } from '$lib/server/api';
import { expectOk } from '$lib/server/expect';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type ActivityStatsOut = components['schemas']['ActivityStatsOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, `/cohorts/${event.params.id}/activities/${event.params.aid}`);
	const stats = await expectOk<ActivityStatsOut>(res, 'Activity not found');
	// cohortId/activityId are passed through only for the page's CSV link and "back to cohort" link.
	return { stats, cohortId: event.params.id, activityId: event.params.aid };
};
