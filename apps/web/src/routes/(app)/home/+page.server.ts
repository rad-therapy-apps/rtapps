/**
 * What this file does: SSR `load` for `(app)/home`, the signed-in landing page. Fetches the
 * current user's results (`GET /me/results`) for the results table.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie; failures degrade to an empty list with an error message rather than
 * throwing, since a broken results fetch shouldn't block the whole home page from rendering.
 *
 * How it fits the project: `(app)/+layout.server.ts` already guarantees a signed-in user before
 * this runs, so `/me/results` is scoped to that user by the API itself (no id is passed from the
 * client). `docs/03-architecture.md` §7 (`GET me/results`).
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`ResultOut`). Used by:
 * `+page.svelte` (this route); the "Back to home" link from the lesson pager
 * (`$lib/lesson/LessonPager.svelte`) returns here, and `apps/web/e2e/lesson.e2e.ts` asserts the
 * completed lesson's row and score appear in this page's results table.
 */
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type ResultOut = components['schemas']['ResultOut'];

export const load: PageServerLoad = async (event) => {
	try {
		const res = await apiFetch(event, '/me/results');
		// Non-2xx: show the page with an empty table and an error message, not a crashed page.
		if (!res.ok) return { results: [] as ResultOut[], error: 'Could not load results' };
		const results: ResultOut[] = await res.json();
		return { results, error: undefined };
	} catch {
		// API unreachable: same fallback as a non-2xx response above.
		return { results: [] as ResultOut[], error: 'Could not load results' };
	}
};
