import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hallwayFacing, returnDoorOnBoot } from './return-door';
import type { WallRect } from './prompt-math';

const ROOM_IDS = new Set(['linaccontrol', 'ctcontrol', 'ctsim']);
const isRoom = (id: string) => ROOM_IDS.has(id);
let session: Map<string, string>;
function installSession(store: unknown) {
	Object.defineProperty(globalThis, 'sessionStorage', {
		value: store,
		configurable: true,
		writable: true
	});
}
beforeEach(() => {
	session = new Map();
	installSession({
		getItem: (k: string) => session.get(k) ?? null,
		setItem: (k: string, v: string) => void session.set(k, String(v)),
		removeItem: (k: string) => void session.delete(k)
	});
});
afterEach(() => {
	delete (globalThis as unknown as Record<string, unknown>).sessionStorage;
});

describe('returnDoorOnBoot', () => {
	it('starts outside the door the player left through, after Back to the Center', () => {
		session.set('simhub.returnDoor', '"ctsim"');
		session.set('simhub.returning', 'true');
		expect(returnDoorOnBoot(isRoom)).toBe('ctsim');
	});

	it('takes both values, so the next load opens the title menu', () => {
		session.set('simhub.returnDoor', '"linaccontrol"');
		session.set('simhub.returning', 'true');
		returnDoorOnBoot(isRoom);
		expect(session.size).toBe(0);
		expect(returnDoorOnBoot(isRoom)).toBe(null);
	});

	it('opens the title menu when the player came back another way, and drops the door', () => {
		session.set('simhub.returnDoor', '"ctcontrol"');
		expect(returnDoorOnBoot(isRoom)).toBe(null);
		expect(session.has('simhub.returnDoor')).toBe(false);
	});

	it('opens the title menu for Back to the Center with no door (the app was opened on its own)', () => {
		session.set('simhub.returning', 'true');
		expect(returnDoorOnBoot(isRoom)).toBe(null);
	});

	it('ignores a door that is not a room', () => {
		session.set('simhub.returnDoor', '"roof"');
		session.set('simhub.returning', 'true');
		expect(returnDoorOnBoot(isRoom)).toBe(null);
	});

	it('opens the title menu when sessionStorage throws', () => {
		const fail = () => {
			throw new Error('blocked');
		};
		installSession({ getItem: fail, setItem: fail, removeItem: fail });
		expect(returnDoorOnBoot(isRoom)).toBe(null);
	});
});

describe('hallwayFacing', () => {
	const at = { x: 0, z: 0 },
		out = { x: 0, z: 1 },
		across: WallRect = { x: 0, z: 2, hw: 20, hd: 0.1 },
		endAt = (x: number): WallRect => ({ x, z: 1, hw: 0.1, hd: 3 });

	it('faces -x when the corridor is open that way and closed 3 m to +x', () => {
		expect(hallwayFacing(at, out, [across, endAt(3)])).toEqual({ x: -1, z: 0 });
	});

	it('faces +x for the mirror case', () => {
		expect(hallwayFacing(at, out, [across, endAt(-3)])).toEqual({ x: 1, z: 0 });
	});

	it('returns the door normal when both ends are closed within 1.5 m', () => {
		expect(hallwayFacing(at, out, [across, endAt(-1.4), endAt(1.4)])).toBe(out);
	});

	it('takes the first perpendicular on a tie (no walls)', () => {
		expect(hallwayFacing(at, out, [])).toEqual({ x: -1, z: 0 });
	});
});
