import { describe, it, expect } from 'vitest';
import {
	atFieldTarget,
	KEEP_HOLDING_NOTICE,
	KEY_STEPS,
	keyLanding,
	moveKeyLabel,
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

describe('keys reaching the plan from a part-way move', () => {
	it('steps each key as the app does: 5 degrees or 1 mm, signed', () => {
		expect(KEY_STEPS.consoleGantryPlus).toEqual(['gantry', 5]);
		expect(KEY_STEPS.consoleTableMinus).toEqual(['couchAngle', -5]);
		expect(KEY_STEPS.consoleVrtMinus).toEqual(['vrt', -1]);
		expect(KEY_STEPS.consoleLatPlus).toEqual(['lat', 1]);
	});

	it('lands the gantry on 180 when the next 5 degrees would pass it', () => {
		expect(keyLanding('gantry', 47.8, 5, 180)).toBeNull();
		expect(keyLanding('gantry', 177.8, 5, 180)).toBe(180);
		expect(keyLanding('gantry', 179.99, 5, 180)).toBe(180);
	});

	it('reaches the plan from any value, pressing either way', () => {
		const press = (axis: 'gantry' | 'vrt', from: number, step: number, target: number) => {
			let v = from;
			for (let i = 0; i < 200 && v !== target; i++) {
				const land = keyLanding(axis, v, step, target);
				v = land ?? (axis === 'gantry' ? (((v + step) % 360) + 360) % 360 : v + step);
			}
			return v;
		};
		expect(press('gantry', 47.8, 5, 180)).toBe(180);
		expect(press('gantry', 47.8, -5, 0)).toBe(0);
		expect(press('gantry', 47.8, -5, 180)).toBe(180); // the long way round, through 0
		expect(press('vrt', 2.37, -1, 0)).toBe(0);
		expect(press('vrt', 2.37, 1, 4)).toBe(4);
	});

	it('wraps through 0 for angles', () => {
		expect(keyLanding('collimator', 357.5, 5, 0)).toBe(0);
		expect(keyLanding('couchAngle', 2.5, -5, 0)).toBe(0);
	});

	it("leaves the key's own step alone on the plan's grid and when moving away", () => {
		expect(keyLanding('gantry', 175, 5, 180)).toBeNull(); // the step lands on 180 itself
		expect(keyLanding('gantry', 180, 5, 180)).toBeNull(); // at the plan: step away
		expect(keyLanding('gantry', 182, 5, 180)).toBeNull(); // moving away
		expect(keyLanding('vrt', 0.37, 1, 0)).toBeNull();
		expect(keyLanding('vrt', 0.37, -1, 0)).toBe(0);
		expect(keyLanding('lng', 0.5, -1, null)).toBeNull();
	});
});

describe('what the Move to field key says', () => {
	const field: FieldAxes = { ...home, gantry: 270, vrt: 4 };

	it('is at the field only when every axis it drives is there', () => {
		expect(atFieldTarget(field, field)).toBe(true);
		expect(atFieldTarget({ ...field, gantry: 269.9 }, field)).toBe(false);
		expect(atFieldTarget({ ...field, vrt: 3 }, field)).toBe(false);
		// 360 is 0 the shortest way round
		expect(atFieldTarget({ ...home, gantry: 360 }, home)).toBe(true);
	});

	it('says to keep holding while it moves, At field once there, else to hold it', () => {
		expect(moveKeyLabel(true, false)).toBe('Moving… keep holding');
		expect(moveKeyLabel(true, true)).toBe('Moving… keep holding');
		expect(moveKeyLabel(false, true)).toBe('At field');
		expect(moveKeyLabel(false, false)).toBe('Hold to move to field');
	});

	it('notes that a press let go too soon must be held', () => {
		expect(KEEP_HOLDING_NOTICE).toBe('Keep holding to move to the field');
	});
});
