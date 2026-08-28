/**
 * What this file does: SSR `load` for `(app)/lessons/[slug]`. Fetches the published lesson
 * snapshot by slug and starts a new attempt against it, both server-side, before the page renders.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie on both calls and sets `Origin` on the attempt-starting POST for the API's
 * CSRF check; `error()` distinguishes a missing lesson (404) from any other API failure (502).
 *
 * How it fits the project: this is the one route in the group that starts an `attempt` — the
 * ADR-0004 integration spine — server-side, up front, so every subsequent grading call from the
 * browser (via `$lib/lesson/api`, used by `KnowledgeCheck.svelte` and `LessonPager.svelte`) has an
 * `attempt_id` to post against. The lesson snapshot has correct answers stripped by the API before
 * it ever reaches here (ADR-0003, `docs/03-architecture.md` §4.3–4.4).
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`LessonOut`, `AttemptOut`).
 * Used by: `+page.svelte` (this route), which renders `$lib/lesson/LessonPager.svelte`; reached
 * from `(app)/subjects/[slug]/+page.svelte`; driven end-to-end by
 * `apps/web/e2e/lesson.e2e.ts`.
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type LessonOut = components['schemas']['LessonOut'];
type AttemptOut = components['schemas']['AttemptOut'];

export const load: PageServerLoad = async (event) => {
	const lessonRes = await apiFetch(event, `/lessons/${event.params.slug}`);
	// No lesson with this slug: a genuine 404, distinct from an API failure below.
	if (lessonRes.status === 404) error(404, 'Lesson not found');
	// Any other non-2xx (API down, 500, etc): a 502, since the lesson may well exist.
	if (!lessonRes.ok) error(502, 'Could not load the lesson');
	const lesson: LessonOut = await lessonRes.json();

	// Starts a new attempt (ADR-0004) against this lesson's activity, pinned to the published
	// content_version the snapshot above just came from.
	const attemptRes = await apiFetch(event, `/activities/${lesson.activity_id}/attempts`, {
		method: 'POST'
	});
	if (!attemptRes.ok) error(502, 'Could not start the attempt');
	const attempt: AttemptOut = await attemptRes.json();

	return { lesson, attempt };
};
