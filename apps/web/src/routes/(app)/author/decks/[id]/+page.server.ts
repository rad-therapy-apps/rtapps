/**
 * What this file does: SSR `load` for `(app)/author/decks/[id]` -- fetches the flashcard deck
 * working copy (title/access/config/cards), its publish history, and its `import_notes`.
 *
 * Used here and why: `[id]` is the deck's own `activity_id` (see the quiz route's `load` for why
 * every builder route is keyed this way, unlike the lesson editor route). `FlashcardDeckAuthorOut`
 * carries no `import_notes` of its own, so it's looked up on the generic per-subject activity row
 * instead, same as the quiz/matching/sequencing routes.
 *
 * How it fits the project: `docs/03-architecture.md` §7; `FlashcardDeckAuthorOut`/`VersionOut`
 * are Task 9/10's wire shapes Task 16's deck builder consumes.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`FlashcardDeckAuthorOut`,
 * `VersionOut`, `ActivityAuthorRow`).
 * Used by: `+page.svelte` (this route).
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type FlashcardDeckAuthorOut = components['schemas']['FlashcardDeckAuthorOut'];
type VersionOut = components['schemas']['VersionOut'];
type ActivityAuthorRow = components['schemas']['ActivityAuthorRow'];

export const load: PageServerLoad = async (event) => {
	const deckRes = await apiFetch(event, `/authoring/flashcard-decks/${event.params.id}`);
	// No deck with this activity id: a genuine 404, distinct from an API failure below.
	if (deckRes.status === 404) error(404, 'Flashcard deck not found');
	if (!deckRes.ok) error(502, 'Could not load the flashcard deck');
	const deck: FlashcardDeckAuthorOut = await deckRes.json();

	const versionsRes = await apiFetch(event, `/authoring/activities/${deck.activity_id}/versions`);
	if (!versionsRes.ok) error(502, 'Could not load version history');
	const versions: VersionOut[] = await versionsRes.json();

	const activitiesRes = await apiFetch(
		event,
		`/authoring/subjects/${deck.subject_slug}/activities`
	);
	if (!activitiesRes.ok) error(502, 'Could not load activity metadata');
	const activities: ActivityAuthorRow[] = await activitiesRes.json();
	const importNotes =
		activities.find((a) => a.activity_id === deck.activity_id)?.import_notes ?? [];

	return { deck, versions, importNotes };
};
