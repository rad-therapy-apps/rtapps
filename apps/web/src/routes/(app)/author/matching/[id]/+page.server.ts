/**
 * What this file does: SSR `load` for `(app)/author/matching/[id]` -- fetches the matching
 * activity working copy (title/access/config/pairs), its publish history, and its
 * `import_notes`.
 *
 * Used here and why: `[id]` is the activity's own `activity_id` (see the quiz route's `load` for
 * why every builder route is keyed this way). `MatchingAuthorOut` carries no `import_notes` of
 * its own, so it's looked up on the generic per-subject activity row instead, same as the
 * quiz/deck/sequencing routes.
 *
 * How it fits the project: `docs/03-architecture.md` §7; `MatchingAuthorOut`/`VersionOut` are
 * Task 9/10's wire shapes Task 16's matching builder consumes.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`MatchingAuthorOut`,
 * `VersionOut`, `ActivityAuthorRow`).
 * Used by: `+page.svelte` (this route).
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type MatchingAuthorOut = components['schemas']['MatchingAuthorOut'];
type VersionOut = components['schemas']['VersionOut'];
type ActivityAuthorRow = components['schemas']['ActivityAuthorRow'];

export const load: PageServerLoad = async (event) => {
	const matchingRes = await apiFetch(event, `/authoring/matching/${event.params.id}`);
	// No matching activity with this id: a genuine 404, distinct from an API failure below.
	if (matchingRes.status === 404) error(404, 'Matching activity not found');
	if (!matchingRes.ok) error(502, 'Could not load the matching activity');
	const matching: MatchingAuthorOut = await matchingRes.json();

	const versionsRes = await apiFetch(
		event,
		`/authoring/activities/${matching.activity_id}/versions`
	);
	if (!versionsRes.ok) error(502, 'Could not load version history');
	const versions: VersionOut[] = await versionsRes.json();

	const activitiesRes = await apiFetch(
		event,
		`/authoring/subjects/${matching.subject_slug}/activities`
	);
	if (!activitiesRes.ok) error(502, 'Could not load activity metadata');
	const activities: ActivityAuthorRow[] = await activitiesRes.json();
	const importNotes =
		activities.find((a) => a.activity_id === matching.activity_id)?.import_notes ?? [];

	return { matching, versions, importNotes };
};
