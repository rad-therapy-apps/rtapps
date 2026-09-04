/**
 * What this file does: SSR `load` for `(app)/author/quizzes/[id]` -- fetches the quiz working
 * copy (title/access/config/questions), its publish history, and its `import_notes`.
 *
 * Used here and why: `[id]` is the quiz's own `activity_id` (unlike the lesson editor route,
 * every builder route in Task 9/16 is keyed by activity id directly, per
 * `app.authoring.router`'s `_resolve_*` helpers). `QuizAuthorOut` (unlike `LessonAuthorOut`)
 * carries no `import_notes` of its own -- the migrated-content review queue lives on the generic
 * per-subject activity row instead (`ActivityAuthorRow.import_notes`), so it's looked up there
 * for the Publish tab's "needs review" section, the same list the dashboard's needs-review queue
 * reads from.
 *
 * How it fits the project: `docs/03-architecture.md` §7; `QuizAuthorOut`/`VersionOut` are Task
 * 9/10's wire shapes Task 16's quiz builder consumes.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`QuizAuthorOut`, `VersionOut`,
 * `ActivityAuthorRow`).
 * Used by: `+page.svelte` (this route).
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type QuizAuthorOut = components['schemas']['QuizAuthorOut'];
type VersionOut = components['schemas']['VersionOut'];
type ActivityAuthorRow = components['schemas']['ActivityAuthorRow'];

export const load: PageServerLoad = async (event) => {
	const quizRes = await apiFetch(event, `/authoring/quizzes/${event.params.id}`);
	// No quiz with this activity id: a genuine 404, distinct from an API failure below.
	if (quizRes.status === 404) error(404, 'Quiz not found');
	if (!quizRes.ok) error(502, 'Could not load the quiz');
	const quiz: QuizAuthorOut = await quizRes.json();

	const versionsRes = await apiFetch(event, `/authoring/activities/${quiz.activity_id}/versions`);
	if (!versionsRes.ok) error(502, 'Could not load version history');
	const versions: VersionOut[] = await versionsRes.json();

	const activitiesRes = await apiFetch(
		event,
		`/authoring/subjects/${quiz.subject_slug}/activities`
	);
	if (!activitiesRes.ok) error(502, 'Could not load activity metadata');
	const activities: ActivityAuthorRow[] = await activitiesRes.json();
	const importNotes =
		activities.find((a) => a.activity_id === quiz.activity_id)?.import_notes ?? [];

	return { quiz, versions, importNotes };
};
