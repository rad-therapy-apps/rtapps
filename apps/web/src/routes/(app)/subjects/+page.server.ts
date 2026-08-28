/**
 * What this file does: SSR `load` for `(app)/subjects`. Fetches the published subject list
 * (`GET /subjects`) for the subjects index page.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie; unlike `(app)/home`, a failed fetch here throws via `error()` rather than
 * degrading, since there is no sensible "empty" subjects page to show.
 *
 * How it fits the project: `(app)/+layout.server.ts` guarantees a signed-in user before this
 * runs. `docs/03-architecture.md` §7 (`GET subjects`).
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`SubjectOut`). Used by:
 * `+page.svelte` (this route); linked from `+layout.svelte` and `(app)/home/+page.svelte`
 * ("Browse subjects"); driven by `apps/web/e2e/lesson.e2e.ts`.
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type SubjectOut = components['schemas']['SubjectOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, '/subjects');
	// API down or erroring: a 502 error page, since there's no meaningful subjects list to show.
	if (!res.ok) error(502, 'Could not load subjects');
	const subjects: SubjectOut[] = await res.json();
	return { subjects };
};
