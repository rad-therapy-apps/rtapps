/**
 * What this file does: pins the human-readable label shown for each calculator type in the
 * authoring "New calculator" dropdown (#50), in CALC_TYPES order.
 * Used here and why: vitest `server` project — plain data, no DOM. `satisfies` in registry.ts
 * already makes a missing label a type error; this guards the wording itself.
 * Depends on: `./registry` (`CALC_TYPES`, `CALC_TYPE_LABELS`).
 * Used by: `pnpm --filter web test`.
 */
import { describe, expect, it } from 'vitest';
import { CALC_TYPES, CALC_TYPE_LABELS } from './registry';

describe('calculator type labels', () => {
	it('gives every calc_type a readable label', () => {
		expect(CALC_TYPES.map((t) => [t, CALC_TYPE_LABELS[t]])).toEqual([
			['mu', 'MU (monitor units)'],
			['inverse_square', 'Inverse square law'],
			['extended_ssd', 'Extended SSD'],
			['gap', 'Gap calculation'],
			['magnification', 'Magnification'],
			['si_convert', 'SI unit converter']
		]);
	});
});
