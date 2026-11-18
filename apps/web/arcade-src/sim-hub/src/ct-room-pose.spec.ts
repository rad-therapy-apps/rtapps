import { describe, expect, it } from 'vitest';
import type { CtPose } from '../../shared/console-protocol';
import {
	TABLE_HEIGHT_SPAN,
	ROTOR_SPEED,
	tableTarget,
	tableDriver,
	roomShows,
	rotorAngle,
	fitScale,
	pedestalScaleY,
	liesOn
} from './ct-room-pose';

// the CT console's start: table out and lowest
const pose: CtPose = {
	tableTravel: 0,
	tableHeight: 0,
	scanning: false,
	xrayOn: false,
	lasersOn: false
};
// the center's CT table as props.ts builds it: home x 40.1, 3.15 m into the bore, top at 1.025
const range = { baseX: 40.1, inDist: 3.15, topY: 1.025 };

describe('tableTarget', () => {
	it('puts travel 0 at home and 1 fully in the bore, the journey couch range', () => {
		expect(tableTarget(pose, range).x).toBeCloseTo(40.1);
		expect(tableTarget({ ...pose, tableTravel: 1 }, range).x).toBeCloseTo(43.25);
		expect(tableTarget({ ...pose, tableTravel: 0.5 }, range).x).toBeCloseTo(41.675);
	});
	it("puts the console's start pose at the table's rest: home, today's top height", () => {
		expect(tableTarget(pose, range)).toEqual({ x: 40.1, topY: 1.025 });
	});
	it('raises the top from there by up to TABLE_HEIGHT_SPAN', () => {
		expect(tableTarget({ ...pose, tableHeight: 0.5 }, range).topY).toBeCloseTo(
			1.025 + TABLE_HEIGHT_SPAN / 2
		);
		expect(tableTarget({ ...pose, tableHeight: 1 }, range).topY).toBeCloseTo(
			1.025 + TABLE_HEIGHT_SPAN
		);
	});
	it('clamps fractions outside 0..1', () => {
		const t = tableTarget({ ...pose, tableTravel: 1.4, tableHeight: -0.3 }, range);
		expect(t.x).toBeCloseTo(43.25);
		expect(t.topY).toBeCloseTo(1.025);
	});
});

describe('tableDriver', () => {
	it('is the console while the CT panel is open and has sent a pose', () => {
		expect(tableDriver('ct', pose)).toBe('console');
	});
	it('is the journey with no panel, the LINAC panel, or no pose yet', () => {
		expect(tableDriver(null, pose)).toBe('journey');
		expect(tableDriver('linac', pose)).toBe('journey');
		expect(tableDriver('ct', null)).toBe('journey');
	});
});

describe('roomShows', () => {
	it("follows the console's scan, x-ray and lasers while it drives", () => {
		const on = { ...pose, scanning: true, xrayOn: true, lasersOn: true };
		expect(roomShows('console', on)).toEqual({ scanning: true, xrayOn: true, lasersOn: true });
		expect(roomShows('console', pose)).toEqual({
			scanning: false,
			xrayOn: false,
			lasersOn: false
		});
	});
	it('shows the room at rest with the lasers on under the journey', () => {
		const on = { ...pose, scanning: true, xrayOn: true };
		expect(roomShows('journey', on)).toEqual({ scanning: false, xrayOn: false, lasersOn: true });
		expect(roomShows('journey', null)).toEqual({ scanning: false, xrayOn: false, lasersOn: true });
	});
});

describe('rotorAngle', () => {
	it('turns at ROTOR_SPEED while scanning and wraps at a full turn', () => {
		expect(rotorAngle(0, 0.5, true)).toBeCloseTo(ROTOR_SPEED * 0.5);
		const a = rotorAngle(2 * Math.PI - 0.1, 0.1, true);
		expect(a).toBeGreaterThanOrEqual(0);
		expect(a).toBeCloseTo(ROTOR_SPEED * 0.1 - 0.1);
	});
	it('stays put when not scanning', () => {
		expect(rotorAngle(1.2, 0.5, false)).toBe(1.2);
	});
});

describe('fitScale and pedestalScaleY', () => {
	it("scales the suite's 23-unit ring to the center's 2.835 m", () => {
		expect(fitScale(23, 2.835) * 23).toBeCloseTo(2.835);
	});
	it('keeps the pedestal as built at home and stretches it with the top', () => {
		expect(pedestalScaleY(0.78, 0)).toBe(1);
		expect(pedestalScaleY(0.78, 0.3)).toBeCloseTo(1.08 / 0.78);
		expect(pedestalScaleY(0.78, -0.3)).toBeCloseTo(0.48 / 0.78);
	});
});

describe('liesOn', () => {
	const top = { x0: 37.2, x1: 43.0, z0: -9.86, z1: -9.14, y: 1.025 };
	it('is true for a figure centred over the top with its back on it', () => {
		expect(liesOn({ cx: 40.2, cz: -9.5, minY: 1.025 }, top)).toBe(true);
		expect(liesOn({ cx: 40.2, cz: -9.5, minY: 1.04 }, top)).toBe(true);
	});
	it('is false beside the table, above it or on the floor', () => {
		expect(liesOn({ cx: 40.2, cz: -8.6, minY: 1.025 }, top)).toBe(false);
		expect(liesOn({ cx: 44.5, cz: -9.5, minY: 1.025 }, top)).toBe(false);
		expect(liesOn({ cx: 40.2, cz: -9.5, minY: 1.3 }, top)).toBe(false);
		expect(liesOn({ cx: 40.2, cz: -9.5, minY: 0 }, top)).toBe(false);
	});
});
