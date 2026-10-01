/**
 * What this file does: unit tests for the WCAG contrast helpers in `contrast.ts`.
 * Used here and why: known reference values (black/white = 21:1, #777 on white just under
 * 4.5:1) pin the formula, so the token test built on it can be trusted.
 * How it fits the project: NFR-16 (WCAG 2.1 AA) verification, docs/specs/2026-10-01-ui-restyle-design.md.
 * Depends on: `./contrast`. Used by: `pnpm --filter web test` (node project).
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance } from './contrast';

describe('relativeLuminance', () => {
	it('is 0 for black and 1 for white', () => {
		expect(relativeLuminance('#000000')).toBe(0);
		expect(relativeLuminance('#ffffff')).toBe(1);
	});
});

describe('contrastRatio', () => {
	it('is 21 for black on white, in either order', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
	});

	it('puts #777777 on white just under the 4.5 AA threshold', () => {
		expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
	});

	it('rejects anything that is not a 6-digit hex colour', () => {
		expect(() => contrastRatio('#fff', '#000000')).toThrow(/6-digit hex/);
	});
});
