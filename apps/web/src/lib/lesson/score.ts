/**
 * What this file does: formats an `attempt`'s score fields (ADR-0004) into the one-line summary
 * shown after a lesson is submitted, e.g. "1 / 2 (50%) — Not passed".
 * Used here and why: a plain function, not a component — `LessonPager.svelte` interpolates its
 * result directly into an `aria-live` region; kept separate from the component so it has its own
 * unit tests (`score.test.ts`) without spinning up a browser.
 * How it fits the project: `score`/`max_score`/`percent`/`passed` are the server-graded fields
 * on `AttemptOut` (ADR-0004 §1) returned by `POST /api/v1/attempts/{id}/submit`; this is purely
 * presentation, no grading logic.
 * Depends on: nothing (pure function over a plain object).
 * Used by: `LessonPager.svelte` (`formatScore(submitResult)`), `score.test.ts`.
 */
export type ScoreInput = {
	score: number | null;
	max_score: number | null;
	percent: number | null;
	passed: boolean | null;
};

/** Formats an attempt result as e.g. "1 / 2 (50%) — Not passed". Percent keeps one decimal unless it's a whole number. */
export function formatScore({ score, max_score, percent, passed }: ScoreInput): string {
	const pct = percent ?? 0;
	// Whole-number percents (e.g. 50, 100) print without a decimal; anything else keeps one decimal place.
	const pctText = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
	return `${score ?? 0} / ${max_score ?? 0} (${pctText}%) — ${passed ? 'Passed' : 'Not passed'}`;
}
