import { describe, it, expect } from 'vitest';
import {
	MOVE_SPEED,
	moveToFieldStep,
	REPEAT_DELAY_MS,
	REPEAT_EVERY_MS,
	REPEATING_KEYS,
	shortestTurn,
	type FieldAxes
} from './console-motion';

const home: FieldAxes = { gantry: 0, collimator: 0, couchAngle: 0, vrt: 0, lng: 0, lat: 0 };

describe('held machine keys', () => {
	it('repeats the gantry, collimator and couch keys only', () => {
		for (const k of [
			'consoleGantryPlus',
			'consoleCollMinus',
			'consoleVrtPlus',
			'consoleTableMinus'
		])
			expect(REPEATING_KEYS.has(k)).toBe(true);
		for (const k of ['consoleKV', 'consoleJawsOpen', 'consoleMLCShape', 'consoleRollPlus'])
			expect(REPEATING_KEYS.has(k)).toBe(false);
		expect(REPEATING_KEYS.size).toBe(12);
	});

	it('waits about 300 ms before repeating, then repeats faster than that', () => {
		expect(REPEAT_DELAY_MS).toBe(300);
		expect(REPEAT_EVERY_MS).toBeLessThan(REPEAT_DELAY_MS);
	});
});

describe('the shortest way round', () => {
	it('turns toward the nearer side', () => {
		expect(shortestTurn(0, 90)).toBe(90);
		expect(shortestTurn(10, 350)).toBe(-20);
		expect(shortestTurn(350, 10)).toBe(20);
		expect(shortestTurn(270, 0)).toBe(90);
		expect(shortestTurn(45, 45)).toBe(0);
	});
});

describe('one frame of Move to field', () => {
	it('moves at the field speeds: 30 degrees and 50 mm a second', () => {
		expect(MOVE_SPEED.gantry).toBe(30);
		expect(MOVE_SPEED.collimator).toBe(30);
		expect(MOVE_SPEED.vrt).toBe(50);
		const { next, arrived } = moveToFieldStep(
			home,
			{ ...home, gantry: 180, collimator: 90, vrt: 40, lng: -40 },
			0.05
		);
		expect(next.gantry).toBeCloseTo(1.5);
		expect(next.collimator).toBeCloseTo(1.5);
		expect(next.vrt).toBeCloseTo(2.5);
		expect(next.lng).toBeCloseTo(-2.5);
		expect(next.lat).toBe(0);
		expect(arrived).toBe(false);
	});

	it('turns the gantry the shortest way round, through 0', () => {
		const { next } = moveToFieldStep({ ...home, gantry: 10 }, { ...home, gantry: 300 }, 0.1);
		expect(next.gantry).toBeCloseTo(7);
		const back = moveToFieldStep({ ...home, gantry: 1 }, { ...home, gantry: 300 }, 0.1);
		expect(back.next.gantry).toBeCloseTo(358);
	});

	it('lands exactly on the target and reports arrival', () => {
		const { next, arrived } = moveToFieldStep(
			{ ...home, gantry: 179.2, vrt: 3.9 },
			{ ...home, gantry: 180, vrt: 4 },
			0.05
		);
		expect(next).toEqual({ ...home, gantry: 180, vrt: 4 });
		expect(arrived).toBe(true);
	});

	it('reaches the PA field from AP in about six seconds of frames, never overshooting', () => {
		let pose = home,
			frames = 0,
			last = 0;
		const seen: number[] = [];
		for (; frames < 1000; frames++) {
			const r = moveToFieldStep(pose, { ...home, gantry: 180 }, 1 / 60);
			expect(r.next.gantry).toBeGreaterThanOrEqual(last);
			expect(r.next.gantry).toBeLessThanOrEqual(180);
			last = r.next.gantry;
			seen.push(r.next.gantry);
			pose = r.next;
			if (r.arrived) break;
		}
		expect(pose.gantry).toBe(180);
		expect(frames / 60).toBeGreaterThan(5.8);
		expect(frames / 60).toBeLessThan(6.2);
		expect(seen.some((g) => g % 5 !== 0)).toBe(true);
	});

	it('caps a long frame so a stalled tab does not jump the machine', () => {
		const { next } = moveToFieldStep(home, { ...home, gantry: 180 }, 5);
		expect(next.gantry).toBeCloseTo(3);
	});

	it('is already there when every axis matches', () => {
		const at = { gantry: 180, collimator: 0, couchAngle: 0, vrt: 4, lng: 0, lat: 0 };
		expect(moveToFieldStep(at, { ...at, gantry: 540 }, 0.016)).toEqual({ next: at, arrived: true });
	});
});
