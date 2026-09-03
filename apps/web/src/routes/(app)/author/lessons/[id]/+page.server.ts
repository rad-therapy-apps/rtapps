/**
 * What this file does: SSR `load` for `(app)/author/lessons/[id]` — fetches the lesson working
 * copy (meta + full page tree, answers included) and its publish history.
 *
 * Used here and why: `apiFetch(event, …)` forwards the session cookie server-side; `error()`
 * distinguishes a missing lesson (404) from any other API failure (502). `[id]` is the lesson's
 * own id (`Lesson.id`, returned as `LessonAuthorOut.lesson_id`) — `GET /authoring/lessons/{lesson_id}`
 * is keyed by it directly, unlike every other authoring editor route (quiz/matching/etc.), which
 * key by `activity_id` and resolve the model row from there (`apps/api/app/authoring/router.py`'s
 * `_resolve_*` helpers have no lesson equivalent). The response's own `activity_id` is what the
 * versions fetch (and the page's Preview/Publish tabs) key off instead.
 *
 * How it fits the project: `LessonAuthorOut.pages`/`VersionOut[]` back Task 15's three-tab editor
 * (Edit/Preview/Publish). `docs/03-architecture.md` §7.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`LessonAuthorOut`,
 * `VersionOut`).
 * Used by: `+page.svelte` (this route).
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type LessonAuthorOut = components['schemas']['LessonAuthorOut'];
type VersionOut = components['schemas']['VersionOut'];

export const load: PageServerLoad = async (event) => {
	const lessonRes = await apiFetch(event, `/authoring/lessons/${event.params.id}`);
	// No lesson with this id: a genuine 404, distinct from an API failure below.
	if (lessonRes.status === 404) error(404, 'Lesson not found');
	if (!lessonRes.ok) error(502, 'Could not load the lesson');
	const lesson: LessonAuthorOut = await lessonRes.json();

	const versionsRes = await apiFetch(event, `/authoring/activities/${lesson.activity_id}/versions`);
	if (!versionsRes.ok) error(502, 'Could not load version history');
	const versions: VersionOut[] = await versionsRes.json();

	return { lesson, versions };
};
