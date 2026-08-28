/**
 * What this file does: SSR `load` and form `action` for `(app)/home`, the signed-in landing
 * page. `load` fetches the current user's results (`GET /me/results`) and cohorts
 * (`GET /cohorts`); the `join` action joins a cohort by code (`POST /cohorts/join`).
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch`/`apiJson(event, …)`
 * forward the session cookie; failures degrade to an empty list with an error message rather
 * than throwing, since a broken results/cohorts fetch shouldn't block the whole home page from
 * rendering; `fail()` re-renders the join form with the API's problem+json message on error.
 *
 * How it fits the project: `(app)/+layout.server.ts` already guarantees a signed-in user before
 * this runs, so `/me/results` and `/cohorts` are scoped to that user by the API itself (no id is
 * passed from the client). `docs/03-architecture.md` §7 (`GET me/results`, `GET/POST cohorts`).
 *
 * Works with: `$lib/server/api` (`apiFetch`, `apiJson`), `$lib/server/auth-forms`
 * (`problemMessage`), `@rtapps/api-client` (`ResultOut`, `CohortOut`). Used by: `+page.svelte`
 * (this route); the "Back to home" link from the lesson pager
 * (`$lib/lesson/LessonPager.svelte`) returns here, and `apps/web/e2e/lesson.e2e.ts` asserts the
 * completed lesson's row and score appear in this page's results table.
 */
import { fail } from '@sveltejs/kit';
import { apiFetch, apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import type { components } from '@rtapps/api-client';
import type { Actions, PageServerLoad } from './$types';

type ResultOut = components['schemas']['ResultOut'];
type CohortOut = components['schemas']['CohortOut'];

export const load: PageServerLoad = async (event) => {
	// Results and cohorts are independent fetches; a failure in one shouldn't blank the other.
	let results: ResultOut[] = [];
	let error: string | undefined;
	try {
		const res = await apiFetch(event, '/me/results');
		// Non-2xx: show the page with an empty table and an error message, not a crashed page.
		if (res.ok) results = await res.json();
		else error = 'Could not load results';
	} catch {
		// API unreachable: same fallback as a non-2xx response above.
		error = 'Could not load results';
	}

	let cohorts: CohortOut[] = [];
	try {
		const res = await apiFetch(event, '/cohorts');
		if (res.ok) cohorts = await res.json();
	} catch {
		// Same fallback as above: an empty list, not a crashed page.
	}

	return { results, error, cohorts };
};

export const actions: Actions = {
	// Joins the cohort with this join code, then re-renders home with the joined cohort's name.
	join: async (event) => {
		const form = await event.request.formData();
		const code = String(form.get('code') ?? '').trim();
		const res = await apiJson(event, '/cohorts/join', { code });
		if (!res.ok) {
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, { error: problemMessage(problem, res.status), code });
		}
		const cohort: CohortOut = await res.json();
		return { joined: cohort.name };
	}
};
