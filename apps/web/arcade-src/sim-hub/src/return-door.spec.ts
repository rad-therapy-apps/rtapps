import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { returnDoorOnBoot } from './return-door';

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
