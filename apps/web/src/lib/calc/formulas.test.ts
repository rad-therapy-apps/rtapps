/**
 * What this file does: unit tests for pure calculator formula modules — inverse square law,
 * extended SSD corrections, skin gap calculations, magnification, SI conversions, Mayneord
 * F factor, and inverse-square factor (ISF) per TG-51.
 * Used here and why: vitest `server` project — pure functions with no DOM; hand-computed
 * expectations from legacy formulas in the audit (each formula listed in comments with its
 * source page number).
 * How it fits the project: TDD step 1 of plan 3c Task 1 — written before `formulas.ts` exists,
 * per the brief's required case list (each formula with valid and edge-case inputs).
 * Depends on: `./formulas` (written next), vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it } from 'vitest';
import {
	extendedSsd,
	gapCalc,
	inverseSquare,
	magnification,
	mayneordF,
	siConvert,
	ssdIsf
} from './formulas';

describe('inverseSquare', () => {
	// I2 = I1 * (d1/d2)^2 (audit §6): 100 * (100/200)^2 = 25
	it('computes intensity, ratio and area', () => {
		expect(inverseSquare(100, 100, 200)).toEqual({ i2: 25, ratio: 2, area: 4 });
	});
	it('nulls on zero distance', () => {
		expect(inverseSquare(100, 100, 0)).toBeNull();
	});
});

describe('extendedSsd', () => {
	// isf = ((ssd0+d)/(ssdE+d))^2 (audit §4): ssd0=100, ssdE=150, d=10:
	// (110/160)^2 = 0.47265625; outPct = 47.265625; muMult = 1/isf = 2.115702...;
	// fieldF = 150/100 = 1.5
	it('computes the extended-SSD correction set', () => {
		const r = extendedSsd(100, 150, 10);
		expect(r).not.toBeNull();
		expect(r!.isf).toBeCloseTo(0.47265625, 8);
		expect(r!.outPct).toBeCloseTo(47.265625, 6);
		expect(r!.muMult).toBeCloseTo(1 / 0.47265625, 6);
		expect(r!.fieldF).toBeCloseTo(1.5, 6);
	});
});

describe('gapCalc', () => {
	// gap = 0.5*L1*(d/ssd) + 0.5*L2*(d/ssd) (audit §5): L1=10, L2=20, d=5, ssd=100:
	// 0.5*10*0.05 + 0.5*20*0.05 = 0.25 + 0.5 = 0.75
	it('computes the skin gap', () => {
		expect(gapCalc(10, 20, 5, 100)).toBeCloseTo(0.75, 8);
	});
	it('nulls on zero SSD', () => {
		expect(gapCalc(10, 20, 5, 0)).toBeNull();
	});
});

describe('magnification', () => {
	// M = sid/sod; img = obj*M (audit §7): sid=140, sod=100, obj=4 → M=1.4, img=5.6, +40%
	it('computes magnification and image size', () => {
		const r = magnification(140, 100, 4);
		expect(r).not.toBeNull();
		expect(r!.m).toBeCloseTo(1.4, 8);
		expect(r!.imgSize).toBeCloseTo(5.6, 8);
		expect(r!.pctEnlarge).toBeCloseTo(40, 6);
	});
});

describe('siConvert', () => {
	// base = value*fromFactor; result = base/toFactor (audit §11):
	// 250 cGy (1e-2) → Gy (1): 2.5
	it('converts through base-SI factors', () => {
		expect(siConvert(250, 1e-2, 1)).toBeCloseTo(2.5, 10);
	});
	it('nulls on zero target factor', () => {
		expect(siConvert(1, 1, 0)).toBeNull();
	});
});

describe('mayneordF', () => {
	// fFactor = ((100+d)/(100+dmax))^2 * ((ssd+dmax)/(ssd+d))^2 (audit §1)
	// d=10, dmax=1.5, ssd=120: (110/101.5)^2 * (121.5/130)^2
	it('computes the Mayneord F factor', () => {
		const expected = Math.pow(110 / 101.5, 2) * Math.pow(121.5 / 130, 2);
		expect(mayneordF(10, 1.5, 120)).toBeCloseTo(expected, 10);
	});
	it('is 1 at the reference SSD of 100', () => {
		expect(mayneordF(10, 1.5, 100)).toBeCloseTo(1, 10);
	});
});

describe('ssdIsf', () => {
	// ISF = ((ssd+dmax)/(ssd+depth))^2 (audit §1): ssd=100, dmax=1.5, d=10:
	// (101.5/110)^2
	it('computes the inverse-square factor', () => {
		expect(ssdIsf(100, 1.5, 10)).toBeCloseTo(Math.pow(101.5 / 110, 2), 10);
	});
});
