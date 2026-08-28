/**
 * What this file does: SSR `load` and form `action` for `(app)/educator`. `load` lists the
 * cohorts the signed-in user educates; the `create` action creates a new cohort via the API.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch`/`apiJson` can
 * forward the session cookie and (for the mutating `create` action) set `Origin` for the API's
 * CSRF check; `fail()` re-renders the form with the API's problem+json message on error.
 *
 * How it fits the project: `(app)/+layout.server.ts` and `guard.ts` already guarantee a
 * signed-in educator/admin before this route runs (FR-E-01). `docs/03-architecture.md` §7
 * (`GET/POST cohorts`).
 *
 * Works with: `$lib/server/api` (`apiFetch`, `apiJson`), `$lib/server/auth-forms`
 * (`problemMessage`), `@rtapps/api-client` (`CohortOut`). Used by: `+page.svelte` (this route).
 */
import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import type { components } from '@rtapps/api-client';
import type { Actions, PageServerLoad } from './$types';

type CohortOut = components['schemas']['CohortOut'];

// Lists only the cohorts where this user is the educator (the API also returns cohorts they've
// joined as a student, which don't belong on this page).
export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, '/cohorts');
	if (!res.ok) return { cohorts: [] as CohortOut[], error: 'Could not load cohorts' };
	const cohorts: CohortOut[] = await res.json();
	return { cohorts: cohorts.filter((c) => c.role === 'educator'), error: undefined };
};

export const actions: Actions = {
	// Creates a cohort, then redirects straight into its overview page.
	create: async (event) => {
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const res = await apiJson(event, '/cohorts', { name });
		if (!res.ok) {
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, { error: problemMessage(problem, res.status), name });
		}
		const cohort: CohortOut = await res.json();
		redirect(303, `/educator/cohorts/${cohort.id}`);
	}
};
