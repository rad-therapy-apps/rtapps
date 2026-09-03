/**
 * What this file does: SSR `load` for `(app)/author/sequencing/[id]` -- fetches the sequencing
 * activity working copy (title/access/config/items), its publish history, and its
 * `import_notes`.
 *
 * Used here and why: `[id]` is the activity's own `activity_id` (see the quiz route's `load` for
 * why every builder route is keyed this way). `SequencingAuthorOut` carries no `import_notes` of
 * its own, so it's looked up on the generic per-subject activity row instead, same as the
 * quiz/deck/matching routes.
 *
 * How it fits the project: `docs/03-architecture.md` §7; `SequencingAuthorOut`/`VersionOut` are
 * Task 9/10's wire shapes Task 16's sequencing builder consumes.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`SequencingAuthorOut`,
 * `VersionOut`, `ActivityAuthorRow`).
 * Used by: `+page.svelte` (this route).
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type SequencingAuthorOut = components['schemas']['SequencingAuthorOut'];
type VersionOut = components['schemas']['VersionOut'];
type ActivityAuthorRow = components['schemas']['ActivityAuthorRow'];

export const load: PageServerLoad = async (event) => {
	const sequencingRes = await apiFetch(event, `/authoring/sequencing/${event.params.id}`);
	// No sequencing activity with this id: a genuine 404, distinct from an API failure below.
	if (sequencingRes.status === 404) error(404, 'Sequencing activity not found');
	if (!sequencingRes.ok) error(502, 'Could not load the sequencing activity');
	const sequencing: SequencingAuthorOut = await sequencingRes.json();

	const versionsRes = await apiFetch(
		event,
		`/authoring/activities/${sequencing.activity_id}/versions`
	);
	if (!versionsRes.ok) error(502, 'Could not load version history');
	const versions: VersionOut[] = await versionsRes.json();

	const activitiesRes = await apiFetch(
		event,
		`/authoring/subjects/${sequencing.subject_slug}/activities`
	);
	if (!activitiesRes.ok) error(502, 'Could not load activity metadata');
	const activities: ActivityAuthorRow[] = await activitiesRes.json();
	const importNotes =
		activities.find((a) => a.activity_id === sequencing.activity_id)?.import_notes ?? [];

	return { sequencing, versions, importNotes };
};
