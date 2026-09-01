/**
 * What this file does: SSR `load` for `(app)/subjects/[slug]/activities/[id]`. Fetches one
 * practice activity's current published snapshot by id (`GET /activities/{id}`), answers
 * stripped.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie; `error()` distinguishes a genuinely missing (or, per ADR-0006, an
 * inaccessible assessment) activity — 404 — from an API/network failure — 502.
 *
 * How it fits the project: `(app)/+layout.server.ts` guarantees a signed-in user before this
 * runs. Unlike `(app)/lessons/[slug]`, the attempt itself is started/resumed client-side by
 * `QuizPlayer.svelte`/`FlashcardPlayer.svelte`, not here. `docs/03-architecture.md` §4.4, plan 3a
 * Task 14.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`ActivityOut`). Used by:
 * `+page.svelte` (this route), reached from `(app)/subjects/[slug]/+page.svelte`.
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type ActivityOut = components['schemas']['ActivityOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, `/activities/${event.params.id}`);
	// No activity with this id (or, per ADR-0006, an assessment activity): a genuine 404.
	if (res.status === 404) error(404, 'Activity not found');
	// Any other non-2xx (API down, 500, etc): a 502, since the activity may well exist.
	if (!res.ok) error(502, 'Could not load the activity');
	const activity: ActivityOut = await res.json();
	return { activity };
};
