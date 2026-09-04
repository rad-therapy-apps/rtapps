/**
 * What this file does: pure duplicate-value finder shared by every author-facing list whose API
 * rejects duplicates as a 422 -- matching term/definition (`_MatchingContentMixin._unique_pairs`)
 * and sequencing labels (`_SequencingContentMixin._unique_labels`) -- so the editor can warn
 * before a save round-trips just to fail.
 * Used here and why: a plain function over `string[]`, no framework dependency, so it's usable
 * from both a `.svelte` component (`PairsEditor.svelte`) and a page script
 * (`routes/(app)/author/sequencing/[id]/+page.svelte`) without either depending on the other.
 * Blank values are never flagged: an empty term/definition/label is a required-field problem
 * (caught by the input itself, or just not yet filled in), not a duplicate.
 * How it fits the project: the shared half of Task 16's inline pre-save validation.
 * Depends on: nothing.
 * Used by: `PairsEditor.svelte`, `routes/(app)/author/sequencing/[id]/+page.svelte`,
 * `PairsEditor.svelte.spec.ts`.
 */

/** Every value that appears more than once in `values` (blanks excluded). */
export function duplicates(values: string[]): Set<string> {
	const seen = new Set<string>();
	const dupes = new Set<string>();
	for (const value of values) {
		if (value === '') continue;
		if (seen.has(value)) dupes.add(value);
		seen.add(value);
	}
	return dupes;
}
