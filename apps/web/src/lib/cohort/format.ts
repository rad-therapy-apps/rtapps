/**
 * What this file does: two small pure display-formatting helpers shared by the educator cohort
 * overview and student-detail pages.
 * Used here and why: plain TypeScript, no framework dependency, so they're trivially unit
 * testable and reusable across every `+page.svelte` that renders `ActivityRowOut`/`StudentRowOut`
 * percentages.
 * How it fits the project: `formatPercent` renders the nullable percent fields the API returns
 * for cohorts with no attempts yet; `belowThresholdClass` maps the API's `below_threshold` flag
 * to the css class that highlights a row (FR-E-02/FR-E-03).
 * Depends on: nothing.
 * Used by: `apps/web/src/routes/(app)/educator/cohorts/[id]/+page.svelte`,
 * `apps/web/src/routes/(app)/educator/cohorts/[id]/students/[uid]/+page.svelte`.
 */
/** Renders a nullable percent to one decimal place, or an em dash when there's no data yet. */
export function formatPercent(p: number | null | undefined): string {
	return p === null || p === undefined ? '—' : `${p.toFixed(1)}%`;
}

/** Maps the API's below_threshold flag to the css class that highlights a table row. */
export function belowThresholdClass(flag: boolean): string {
	return flag ? 'below' : '';
}
