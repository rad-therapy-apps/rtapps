/**
 * What this file does: the 403/404/502 response-to-load mapping shared by every educator
 * cohort-scoped SSR load — turns an API response into its parsed JSON body, or throws the
 * SvelteKit `error()` the load should surface.
 * Used here and why: each `(app)/educator/cohorts/[id]/...` load repeated the same three-line
 * "404 if missing, 403 if not this educator's cohort, 502 otherwise" mapping; centralising it
 * here means the mapping can't drift between routes.
 * How it fits the project: FR-E-02/03 (an educator can only read their own cohort's data);
 * `docs/03-architecture.md` §7.
 * Depends on: `@sveltejs/kit` (error).
 * Used by: `(app)/educator/cohorts/[id]/+page.server.ts`,
 *   `(app)/educator/cohorts/[id]/students/[uid]/+page.server.ts`,
 *   `(app)/educator/cohorts/[id]/activities/[aid]/+page.server.ts`,
 *   `(app)/educator/cohorts/[id]/outcomes/+page.server.ts`.
 */
import { error } from '@sveltejs/kit';

/**
 * Returns the parsed JSON body of an ok response; otherwise throws the load error the caller
 * should surface: 404 with the caller's own message, 403 for a non-member educator, 502 for
 * any other non-ok status.
 */
export async function expectOk<T>(res: Response, notFoundMessage: string): Promise<T> {
	if (res.status === 404) error(404, notFoundMessage);
	if (res.status === 403) error(403, 'You are not an educator of this cohort');
	if (!res.ok) error(502, 'Could not load the data');
	return (await res.json()) as T;
}
