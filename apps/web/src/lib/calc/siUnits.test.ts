/**
 * What this file tests: `UNITS`'s conversion factors — one hand-computed conversion per
 * quantity, verifying the multipliers transcribed verbatim from the legacy `unitsData` (audit
 * §11) are wired correctly through `siConvert`.
 * Used here and why: vitest `server` project — pure data plus a pure function, no DOM.
 * How it fits the project: TDD step 1 of plan 3c Task 3 — written before `siUnits.ts` exists.
 * Depends on: `./siUnits` (`UNITS`, written next), `./formulas` (`siConvert`).
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it } from 'vitest';
import { siConvert } from './formulas';
import { UNITS } from './siUnits';

describe('UNITS', () => {
	// 250 cGy -> Gy (legacy factors: cGy=1e-2, Gy=1): 250*1e-2/1 = 2.5
	it('converts absorbed dose: 250 cGy -> Gy', () => {
		const f = UNITS.absorbedDose.factors;
		expect(siConvert(250, f['centigray (cGy)'], f['Gray (Gy)'])).toBeCloseTo(2.5, 10);
	});

	// 50 mSv -> Sv (legacy factors: mSv=1e-3, Sv=1): 50*1e-3/1 = 0.05
	it('converts equivalent dose: 50 mSv -> Sv', () => {
		const f = UNITS.equivalentDose.factors;
		expect(siConvert(50, f['millisievert (mSv)'], f['Sievert (Sv)'])).toBeCloseTo(0.05, 10);
	});

	// 1 GBq -> MBq (legacy factors: GBq=1e9, MBq=1e6): 1*1e9/1e6 = 1000
	it('converts radioactivity: 1 GBq -> MBq', () => {
		const f = UNITS.radioactivity.factors;
		expect(siConvert(1, f['gigabecquerel (GBq)'], f['megabecquerel (MBq)'])).toBeCloseTo(1000, 10);
	});

	// 1 mC/kg -> C/kg (legacy factors: mC/kg=1e-3, C/kg=1): 1*1e-3/1 = 0.001
	it('converts exposure: 1 mC/kg -> C/kg', () => {
		const f = UNITS.exposure.factors;
		expect(siConvert(1, f['milliC/kg (mC/kg)'], f['Coulomb/kg (C/kg)'])).toBeCloseTo(0.001, 10);
	});

	// 100 cm -> m (legacy factors: cm=1e-2, m=1): 100*1e-2/1 = 1
	it('converts length: 100 cm -> m', () => {
		const f = UNITS.length.factors;
		expect(siConvert(100, f['centimeter (cm)'], f['meter (m)'])).toBeCloseTo(1, 10);
	});

	// 6 MeV -> keV (legacy factors: MeV=1.602e-13, keV=1.602e-16): 6*1.602e-13/1.602e-16 = 6000
	it('converts energy: 6 MeV -> keV', () => {
		const f = UNITS.energy.factors;
		expect(siConvert(6, f['mega-electron-Volt (MeV)'], f['kilo-electron-Volt (keV)'])).toBeCloseTo(
			6000,
			6
		);
	});
});
