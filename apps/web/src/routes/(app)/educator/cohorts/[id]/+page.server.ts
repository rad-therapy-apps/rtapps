/**
 * What this file does: SSR `load` and form `actions` for `(app)/educator/cohorts/[id]`. `load`
 * fetches the cohort's analytics overview and its member roster; the actions rotate the join
 * code, save the below-threshold percent, and remove a member.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch`/`apiJson` can
 * forward the session cookie and set `Origin` on the mutating actions for the API's CSRF check;
 * `error()` distinguishes a missing cohort (404) and an educator viewing someone else's cohort
 * (403) from a genuine API failure (502).
 *
 * How it fits the project: `(app)/+layout.server.ts`/`guard.ts` guarantee a signed-in
 * educator/admin before this route runs; the API's own membership check is what actually
 * enforces the 403 (this page just surfaces it) (FR-E-02, FR-E-03). `docs/03-architecture.md`
 * §7 (`cohorts/{id}/overview`, `cohorts/{id}/members`, `cohorts/{id}/rotate-code`).
 *
 * Works with: `$lib/server/api` (`apiFetch`, `apiJson`), `$lib/server/auth-forms`
 * (`problemMessage`), `@rtapps/api-client` (`CohortOverviewOut`, `MemberOut`). Used by:
 * `+page.svelte` (this route), reached from `(app)/educator/+page.svelte`.
 */
import { fail } from '@sveltejs/kit';
import { apiFetch, apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import { expectOk } from '$lib/server/expect';
import type { components } from '@rtapps/api-client';
import type { Actions, PageServerLoad } from './$types';

type CohortOverviewOut = components['schemas']['CohortOverviewOut'];
type MemberOut = components['schemas']['MemberOut'];

// Fetches the analytics overview and member roster in parallel; both are needed to render the page.
export const load: PageServerLoad = async (event) => {
	const [overviewRes, membersRes] = await Promise.all([
		apiFetch(event, `/cohorts/${event.params.id}/overview`),
		apiFetch(event, `/cohorts/${event.params.id}/members`)
	]);
	const overview = await expectOk<CohortOverviewOut>(overviewRes, 'Cohort not found');
	const members = await expectOk<MemberOut[]>(membersRes, 'Cohort not found');
	return { overview, members };
};

// Shared failure path for the mutating actions below: null on a successful response, otherwise a
// form `fail` built from the API's problem+json body.
async function problemOrNull(res: Response) {
	if (res.ok) return null;
	const problem = await res.json().catch(() => undefined);
	return fail(res.status, { error: problemMessage(problem, res.status) });
}

export const actions: Actions = {
	// Rotates the join code; the new code is picked up on the next load (form re-runs load on success).
	rotate: async (event) => {
		const res = await apiJson(event, `/cohorts/${event.params.id}/rotate-code`);
		return (await problemOrNull(res)) ?? { rotated: true };
	},
	// Saves the below-threshold percent used to flag activities/students on this cohort.
	threshold: async (event) => {
		const form = await event.request.formData();
		const threshold_percent = Number.parseInt(String(form.get('threshold_percent') ?? ''), 10);
		if (Number.isNaN(threshold_percent)) {
			return fail(400, { error: 'Threshold must be a number' });
		}
		const res = await apiJson(event, `/cohorts/${event.params.id}`, { threshold_percent }, 'PATCH');
		return (await problemOrNull(res)) ?? { saved: true };
	},
	// Removes a member from the cohort's roster.
	remove: async (event) => {
		const form = await event.request.formData();
		const uid = String(form.get('user_id') ?? '');
		const res = await apiJson(
			event,
			`/cohorts/${event.params.id}/members/${uid}`,
			undefined,
			'DELETE'
		);
		return (await problemOrNull(res)) ?? { removed: true };
	}
};
