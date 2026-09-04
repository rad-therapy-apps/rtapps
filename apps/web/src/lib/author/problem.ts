/**
 * What this file does: shared RFC 9457 problem+json parsers for extracting display text from
 * API error responses — used across every author-side editor page/component.
 * Used here and why: every author-facing save/search/create/publish action routes errors through
 * these two functions: `errorTitle` for simple title-only errors (e.g., no-network fallbacks,
 * calculator creation failures), and `problemDetail` for structured 422 validation errors where
 * each error includes a JSON field path (`loc`) and message (`msg`). Both are copy-pasted across
 * LessonEditor, QuestionPicker, and every activity-type page (sequencing, matching, decks,
 * quizzes, data-tables) — extracted here to reduce duplication.
 * How it fits the project: the shared error-parsing half of Task 16's form-save idiom. All
 * author components that make API calls import both or either of these functions and call them
 * on `res.error` when a request fails.
 * Depends on: nothing.
 * Used by: LessonEditor.svelte, QuestionPicker.svelte, and all activity pages under
 * routes/(app)/author/{sequencing,matching,decks,quizzes,data-tables}.
 */

/**
 * Extracts the `title` from an RFC 9457 problem+json error response, or a fallback message
 * if the title is missing. Used for simple error messages where the API returns a single
 * title (e.g., network failures, calculator creation failures in data-tables).
 */
export function errorTitle(error: unknown): string {
	return (error as { title?: string }).title ?? 'Request failed';
}

/**
 * Extracts display text from an RFC 9457 problem+json error response, with fallbacks:
 * 1. If the error has `errors[]` (422 validation), format each as `"path: message"` joined by `"; "`.
 * 2. Otherwise fall back to `detail`, then `title`, then a generic message.
 * Used for validation errors where each error includes a JSON path (`loc`) and message (`msg`),
 * so the author sees exactly which fields failed validation.
 */
export function problemDetail(problem: unknown): string {
	if (problem && typeof problem === 'object') {
		const { title, detail, errors } = problem as {
			title?: unknown;
			detail?: unknown;
			errors?: unknown;
		};
		if (Array.isArray(errors) && errors.length > 0) {
			const parts = errors
				.map((e) => {
					if (!e || typeof e !== 'object') return undefined;
					const { loc, msg } = e as { loc?: unknown; msg?: unknown };
					if (typeof msg !== 'string') return undefined;
					const path = Array.isArray(loc) ? loc.join('.') : undefined;
					return path ? `${path}: ${msg}` : msg;
				})
				.filter((part): part is string => Boolean(part));
			if (parts.length > 0) return parts.join('; ');
		}
		if (typeof detail === 'string' && detail) return detail;
		if (typeof title === 'string' && title) return title;
	}
	return 'Request failed';
}
