/**
 * What this file does: unit tests for `formatPercent` and `belowThresholdClass`.
 * Used here and why: vitest `server` project — both are pure functions, no DOM needed.
 * How it fits the project: covers the display formatting used across the educator cohort
 * overview and student-detail pages (FR-E-02/FR-E-03).
 * Depends on: `./format` (`formatPercent`, `belowThresholdClass`), vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it } from 'vitest';
import { belowThresholdClass, formatPercent } from './format';

describe('formatPercent', () => {
	// Scenario: whole numbers, a fractional percent, and both nullish inputs.
	// Invariant: always one decimal place, or an em dash for null/undefined.
	it('renders one decimal or a dash', () => {
		expect(formatPercent(50)).toBe('50.0%');
		expect(formatPercent(100)).toBe('100.0%');
		expect(formatPercent(33.333)).toBe('33.3%');
		expect(formatPercent(null)).toBe('—');
		expect(formatPercent(undefined)).toBe('—');
	});
});

describe('belowThresholdClass', () => {
	// Scenario: the below_threshold flag from an ActivityRowOut/StudentRowOut.
	// Invariant: maps true to the 'below' css class, false to no class.
	it('maps the flag to a css class', () => {
		expect(belowThresholdClass(true)).toBe('below');
		expect(belowThresholdClass(false)).toBe('');
	});
});
