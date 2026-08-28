import { describe, expect, it } from 'vitest';
import { formatScore } from './score';

describe('formatScore', () => {
	it('formats a whole-number percent without decimals', () => {
		expect(formatScore({ score: 1, max_score: 2, percent: 50, passed: false })).toBe(
			'1 / 2 (50%) — Not passed'
		);
	});

	it('formats a passing full score', () => {
		expect(formatScore({ score: 2, max_score: 2, percent: 100, passed: true })).toBe(
			'2 / 2 (100%) — Passed'
		);
	});

	it('formats a fractional percent to one decimal', () => {
		expect(formatScore({ score: 2, max_score: 3, percent: 66.67, passed: false })).toBe(
			'2 / 3 (66.7%) — Not passed'
		);
	});
});
