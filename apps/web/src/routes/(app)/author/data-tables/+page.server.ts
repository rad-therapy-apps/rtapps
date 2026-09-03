/**
 * What this file does: SSR `load` for `(app)/author/data-tables` -- every author-editable numeric
 * lookup table, plus every subject (for the "New calculator" form's subject select).
 *
 * Used here and why: unlike every other builder route, this page isn't keyed by one activity id
 * -- `DataTable` rows are a shared, keyed lookup (Task 11), not a per-activity working copy, so
 * the page lists all of them and edits one at a time client-side (see `+page.svelte`).
 *
 * How it fits the project: `docs/03-architecture.md` §7; `DataTableOut`/`SubjectAuthorOut` are
 * Task 9/11's wire shapes Task 16's grid editor and calculator form consume.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`DataTableOut`,
 * `SubjectAuthorOut`).
 * Used by: `+page.svelte` (this route).
 */
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type DataTableOut = components['schemas']['DataTableOut'];
type SubjectAuthorOut = components['schemas']['SubjectAuthorOut'];

export const load: PageServerLoad = async (event) => {
	const tablesRes = await apiFetch(event, '/authoring/data-tables');
	if (!tablesRes.ok) error(502, 'Could not load data tables');
	const tables: DataTableOut[] = await tablesRes.json();

	const subjectsRes = await apiFetch(event, '/authoring/subjects');
	if (!subjectsRes.ok) error(502, 'Could not load subjects');
	const subjects: SubjectAuthorOut[] = await subjectsRes.json();

	return { tables, subjects };
};
