export type ScoreInput = {
	score: number | null;
	max_score: number | null;
	percent: number | null;
	passed: boolean | null;
};

/** Formats an attempt result as e.g. "1 / 2 (50%) — Not passed". Percent keeps one decimal unless it's a whole number. */
export function formatScore({ score, max_score, percent, passed }: ScoreInput): string {
	const pct = percent ?? 0;
	const pctText = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
	return `${score ?? 0} / ${max_score ?? 0} (${pctText}%) — ${passed ? 'Passed' : 'Not passed'}`;
}
