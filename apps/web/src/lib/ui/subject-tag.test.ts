/**
 * What this file does: unit tests for `tagIndex`, the slug → subject-tag colour mapping.
 * Used here and why: the mapping must be stable (a subject keeps its colour across visits and
 * deploys) and always land in the six declared tag tokens.
 * How it fits the project: subject tags, docs/specs/2026-10-01-ui-restyle-design.md (Decisions).
 * Depends on: `./subject-tag`. Used by: `pnpm --filter web test` (node project).
 */
import { describe, expect, it } from 'vitest';
import { tagIndex } from './subject-tag';

describe('tagIndex', () => {
	it('is deterministic for a slug', () => {
		expect(tagIndex('radiation-biology')).toBe(tagIndex('radiation-biology'));
	});

	it('always returns 1–6', () => {
		for (const slug of ['', 'a', 'radiation-biology', 'sectional-anatomy', 'x'.repeat(200)]) {
			expect([1, 2, 3, 4, 5, 6]).toContain(tagIndex(slug));
		}
	});

	it('spreads the seeded subjects over more than one colour', () => {
		const seeded = ['radiation-biology', 'sectional-anatomy', 'patient-care', 'physics'];
		expect(new Set(seeded.map(tagIndex)).size).toBeGreaterThan(1);
	});
});
