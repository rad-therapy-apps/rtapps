/**
 * What this file does: maps a subject slug to one of the six subject-tag colour tokens.
 * Used here and why: a small string hash keeps each subject's colour stable without storing a
 * colour per subject in the API; cyan stays the only brand colour, tags only mark subjects.
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md (Subject colour).
 * Depends on: nothing. Used by: `SubjectTag.svelte`.
 */
export type TagIndex = 1 | 2 | 3 | 4 | 5 | 6;

export function tagIndex(slug: string): TagIndex {
	let hash = 7;
	for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return ((hash % 6) + 1) as TagIndex;
}
