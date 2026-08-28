/**
 * What this file does: unit tests for `formatScore`.
 * Used here and why: vitest `server` project — a pure function, no DOM needed.
 * How it fits the project: covers the score-display formatting shown after a lesson is
 * submitted (ADR-0004's `score`/`max_score`/`percent`/`passed` fields on `AttemptOut`).
 * Depends on: `./score` (`formatScore`), vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it } from 'vitest';
import { formatScore } from './score';

describe('formatScore', () => {
	// Scenario: percent is a whole number (50).
	// Invariant: printed without a decimal point.
	it('formats a whole-number percent without decimals', () => {
		expect(formatScore({ score: 1, max_score: 2, percent: 50, passed: false })).toBe(
			'1 / 2 (50%) — Not passed'
		);
	});

	// Scenario: a full, passing score.
	// Invariant: "Passed" is used instead of "Not passed".
	it('formats a passing full score', () => {
		expect(formatScore({ score: 2, max_score: 2, percent: 100, passed: true })).toBe(
			'2 / 2 (100%) — Passed'
		);
	});

	// Scenario: percent has a fractional part (66.67).
	// Invariant: rounded/truncated to exactly one decimal place.
	it('formats a fractional percent to one decimal', () => {
		expect(formatScore({ score: 2, max_score: 3, percent: 66.67, passed: false })).toBe(
			'2 / 3 (66.7%) — Not passed'
		);
	});
});
