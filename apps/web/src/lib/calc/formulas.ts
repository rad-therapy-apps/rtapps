/**
 * What this file does: pure calculator formula modules — inverse square law, extended SSD
 * corrections, skin gap calculations, magnification, SI conversions, Mayneord F factor, and
 * inverse-square factor (ISF) per TG-51. All functions guard inputs and results, returning
 * `null` for non-finite or invalid inputs.
 * Used here and why: consumed by Tasks 2–4 (UI components) to compute dosimetry corrections
 * and conversions. Pure functions allow easy testing and reuse without DOM dependencies.
 * How it fits: TDD step 2 of plan 3c Task 1 — implements the formulas listed in the brief,
 * each guarding against non-finite inputs, non-positive denominators, and non-finite results.
 * Depends on: nothing (pure TS).
 * Used by: `./formulas.test.ts`, Tasks 2–4, UI components consuming calculated values.
 */

function finite(...ns: number[]): boolean {
	return ns.every((n) => Number.isFinite(n));
}

function out<T extends Record<string, number>>(r: T): T | null {
	return finite(...Object.values(r)) ? r : null;
}

/** Inverse-square law: I2 = I1 * (d1/d2)^2; computes intensity ratio and area scaling (audit §6). */
export function inverseSquare(i1: number, d1: number, d2: number) {
	if (!finite(i1, d1, d2) || d1 <= 0 || d2 <= 0) return null;
	return out({ i2: i1 * (d1 / d2) ** 2, ratio: d2 / d1, area: (d2 / d1) ** 2 });
}

/** Extended SSD correction: isf = ((ssd0+d)/(ssdE+d))^2; returns isf, outPct, muMult, fieldF (audit §4). */
export function extendedSsd(ssd0: number, ssdE: number, depth: number) {
	if (!finite(ssd0, ssdE, depth) || ssd0 <= 0 || ssdE + depth <= 0) return null;
	const isf = ((ssd0 + depth) / (ssdE + depth)) ** 2;
	return out({ isf, outPct: isf * 100, muMult: 1 / isf, fieldF: ssdE / ssd0 });
}

/** Skin gap: gap = 0.5*L1*(d/ssd) + 0.5*L2*(d/ssd) (audit §5). */
export function gapCalc(l1: number, l2: number, depth: number, ssd: number) {
	if (!finite(l1, l2, depth, ssd) || ssd <= 0) return null;
	const gap = 0.5 * l1 * (depth / ssd) + 0.5 * l2 * (depth / ssd);
	return Number.isFinite(gap) ? gap : null;
}

/** Magnification: M = sid/sod; returns m, imgSize, pctEnlarge (audit §7). */
export function magnification(sid: number, sod: number, objSize: number) {
	if (!finite(sid, sod, objSize) || sod <= 0) return null;
	const m = sid / sod;
	return out({ m, imgSize: objSize * m, pctEnlarge: (m - 1) * 100 });
}

/** SI unit conversion: result = (value * fromFactor) / toFactor (audit §11). */
export function siConvert(value: number, fromFactor: number, toFactor: number) {
	if (!finite(value, fromFactor, toFactor) || toFactor === 0) return null;
	const r = (value * fromFactor) / toFactor;
	return Number.isFinite(r) ? r : null;
}

/** Mayneord F factor: fFactor = ((100+d)/(100+dmax))^2 * ((ssd+dmax)/(ssd+d))^2 (audit §1). */
export function mayneordF(depth: number, dmax: number, ssd: number) {
	if (!finite(depth, dmax, ssd) || ssd + depth <= 0 || 100 + dmax <= 0) return null;
	const f = ((100 + depth) / (100 + dmax)) ** 2 * ((ssd + dmax) / (ssd + depth)) ** 2;
	return Number.isFinite(f) ? f : null;
}

/** Inverse-square factor (ISF): ISF = ((ssd+dmax)/(ssd+depth))^2 (audit §1). */
export function ssdIsf(ssd: number, dmax: number, depth: number) {
	if (!finite(ssd, dmax, depth) || ssd + depth <= 0) return null;
	const f = ((ssd + dmax) / (ssd + depth)) ** 2;
	return Number.isFinite(f) ? f : null;
}
