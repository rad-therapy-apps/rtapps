import { describe, it, expect } from 'vitest';
import {
	angleMismatch,
	couchMismatch,
	deliveryHero,
	fmtAngle,
	fmtNumber,
	fmtSigned,
	geometryDetail,
	jawsMismatch,
	mlcMismatch,
	nextFieldIndex,
	textMismatch,
	type GeometryCheck,
	type HeroState
} from './delivery-guide';
import { GEOMETRY_CHECK } from './console-messages';

describe('the geometry detail', () => {
	it('shows numbers to 0.1, whole ones with no decimal and never -0', () => {
		expect(fmtNumber(270)).toBe('270');
		expect(fmtNumber(87.333)).toBe('87.3');
		expect(fmtNumber(2.25)).toBe('2.3');
		expect(fmtNumber(-0.04)).toBe('0');
		expect(fmtNumber(-2.5)).toBe('-2.5');
	});

	it('wraps angles into 0..360, so 359.96 reads 0°', () => {
		expect(fmtAngle(270)).toBe('270°');
		expect(fmtAngle(-90)).toBe('270°');
		expect(fmtAngle(359.96)).toBe('0°');
		expect(fmtAngle(360.3)).toBe('0.3°');
		expect(fmtAngle(87.34)).toBe('87.3°');
	});

	it('signs couch positions: +4, 0, -2.5', () => {
		expect(fmtSigned(4)).toBe('+4');
		expect(fmtSigned(0)).toBe('0');
		expect(fmtSigned(0.04)).toBe('0');
		expect(fmtSigned(-2.5)).toBe('-2.5');
	});

	it('names each axis now → planned, the unit on the planned value (and on both for angles)', () => {
		expect(geometryDetail([angleMismatch('Gantry', 0, 270), couchMismatch('Vrt', 6, 4)])).toBe(
			'Gantry 0° → 270° · Couch Vrt +6 → +4 mm'
		);
		expect(
			geometryDetail([angleMismatch('Collimator', 5, 0), angleMismatch('Couch angle', 10, 0)])
		).toBe('Collimator 5° → 0° · Couch angle 10° → 0°');
		expect(
			geometryDetail([mlcMismatch(10, 16), textMismatch('MLC shape', 'Square', 'Conformal')])
		).toBe('MLC 10 → 16 cm · MLC shape Square → Conformal');
		expect(couchMismatch('Lng', 0, -2.5)).toEqual({
			label: 'Couch Lng',
			now: '0',
			planned: '-2.5 mm'
		});
	});

	it('shows the jaws as field sizes, or by edge when either side is asymmetric', () => {
		const square = (s: number) => ({ x1: s / 2, x2: s / 2, y1: s / 2, y2: s / 2 });
		expect(geometryDetail([jawsMismatch(square(10), square(18))])).toBe(
			'Jaws 10 × 10 → 18 × 18 cm'
		);
		expect(geometryDetail([jawsMismatch({ x1: 4, x2: 9, y1: 9, y2: 9 }, square(18))])).toBe(
			'Jaws X1 4 / X2 9 / Y1 9 / Y2 9 → X1 9 / X2 9 / Y1 9 / Y2 9 cm'
		);
	});

	it('is empty with nothing off the plan', () => {
		expect(geometryDetail([])).toBe('');
	});
});

describe('the hero line', () => {
	const passed = (name: string): GeometryCheck => ({ name, ok: true, detail: 'ok' });
	const geometry = (...mismatches: ReturnType<typeof angleMismatch>[]): GeometryCheck => ({
		name: GEOMETRY_CHECK,
		ok: false,
		detail: geometryDetail(mismatches),
		mismatches
	});
	const base: HeroState = {
		hasCase: true,
		delivering: false,
		held: false,
		posted: false,
		completed: false,
		allDone: false,
		armed: false,
		ready: false,
		checks: [passed('Vault door closed')],
		field: 'Left Lateral',
		motionArmed: true,
		recordKey: false
	};
	const hero = (s: Partial<HeroState>) => deliveryHero({ ...base, ...s });

	it('never says Prepare or Ready: it names the key to press next', () => {
		expect(hero({ ready: true, checks: [passed('Vault door closed')] })).toBe(
			'All interlocks green. Press Enable Beam.'
		);
		expect(hero({ ready: true, armed: true })).toBe('Beam enabled. Press Beam On.');
		expect(hero({ delivering: true })).toBe(
			'Beam on. Monitor MU progression and treatment status.'
		);
		expect(hero({ delivering: true, held: true })).toBe(
			'Beam held. Resolve the hold, then press Resume Beam.'
		);
		for (const s of [{}, { ready: true }, { armed: true }, { completed: true }])
			expect(hero(s)).not.toMatch(/Prepare|Ready|Click/);
	});

	it('names the geometry hold’s fix with the field and the axes off the plan', () => {
		const g = geometry(angleMismatch('Gantry', 0, 90));
		expect(hero({ checks: [passed('Vault door closed'), g] })).toBe(
			'Left Lateral: hold Move to field until the checklist is green (Gantry 0° → 90°).'
		);
		expect(hero({ checks: [g], motionArmed: false })).toBe(
			'Left Lateral: press Motion Enable, then hold Move to field until the checklist is green (Gantry 0° → 90°).'
		);
	});

	it('says only Move to field’s part when other holds or the aperture remain', () => {
		const moved = angleMismatch('Gantry', 0, 90),
			aperture = mlcMismatch(10, 16);
		expect(
			hero({
				checks: [
					geometry(moved),
					{ name: 'Imaging hardware retracted', ok: false, detail: 'kV extended' }
				]
			})
		).toBe('Left Lateral: hold Move to field (Gantry 0° → 90°).');
		expect(hero({ checks: [geometry(moved, aperture)] })).toBe(
			'Left Lateral: hold Move to field (Gantry 0° → 90°).'
		);
		expect(hero({ checks: [geometry(aperture)] })).toBe(
			'Left Lateral: set the jaws and MLC to the plan (MLC 10 → 16 cm).'
		);
	});

	it('names the most basic other hold by its checklist line', () => {
		const door = { name: 'Vault door closed', ok: false, detail: 'Close the vault door' };
		expect(hero({ checks: [geometry(angleMismatch('Gantry', 0, 90)), door] })).toBe(
			'Resolve the hold: Vault door closed (Close the vault door).'
		);
		expect(
			hero({
				checks: [{ name: 'Treatment trajectory clearance', ok: false, detail: 'G 90° hold' }]
			})
		).toBe('Resolve the hold: Treatment trajectory clearance (G 90° hold).');
	});

	it('after a field: select the next; after all, Record / Complete only where it shows', () => {
		expect(hero({ completed: true })).toBe('Field complete. Select the next field.');
		expect(hero({ completed: true, allDone: true })).toBe('All fields delivered.');
		expect(hero({ completed: true, allDone: true, recordKey: true })).toBe(
			'All fields delivered. Press Record / Complete to close the fraction.'
		);
		expect(hero({ posted: true, completed: true, allDone: true })).toBe(
			'Fraction recorded. Session complete.'
		);
		expect(hero({ hasCase: false })).toBe('Open a patient chart to begin.');
	});
});

describe('the Tutorial’s field order', () => {
	it('selects the first field not yet delivered, in plan order', () => {
		expect(nextFieldIndex(2, {})).toBe(0);
		expect(nextFieldIndex(2, { 0: true })).toBe(1);
		expect(nextFieldIndex(3, { 1: true })).toBe(0);
		expect(nextFieldIndex(2, { 0: true, 1: true })).toBeNull();
		expect(nextFieldIndex(0, {})).toBeNull();
	});
});
