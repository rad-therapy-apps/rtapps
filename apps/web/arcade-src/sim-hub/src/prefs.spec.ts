import { afterEach, describe, expect, it } from 'vitest';
import { PREF, readPref, takePref, writePref } from './prefs';

type StoreName = 'localStorage' | 'sessionStorage';

/** A Map-backed Storage that behaves like the browser's. */
function memoryStorage() {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, String(v)),
		removeItem: (k: string) => void data.delete(k)
	};
}
/** Storage that throws on every call, as a full or blocked browser storage does. */
const throwingStorage = {
	getItem: () => {
		throw new Error('blocked');
	},
	setItem: () => {
		throw new Error('QuotaExceededError');
	},
	removeItem: () => {
		throw new Error('blocked');
	}
};
function install(name: StoreName, value: unknown) {
	Object.defineProperty(globalThis, name, {
		value,
		configurable: true,
		writable: true
	});
}
afterEach(() => {
	for (const name of ['localStorage', 'sessionStorage'] as const)
		delete (globalThis as unknown as Record<string, unknown>)[name];
});

describe('PREF', () => {
	it('names the storage keys of the spec', () => {
		expect(PREF).toEqual({
			roomCardsHidden: 'simhub.roomCards.hidden',
			roomCardsEnabled: 'simhub.roomCards.enabled',
			sound: 'simhub.sound',
			returnDoor: 'simhub.returnDoor',
			returning: 'simhub.returning'
		});
	});
});

describe('readPref, writePref and takePref', () => {
	it('write JSON to localStorage by default and read it back', () => {
		const local = memoryStorage();
		install('localStorage', local);
		writePref(PREF.roomCardsHidden, ['consult', 'lobby']);
		expect(local.data.get('simhub.roomCards.hidden')).toBe('["consult","lobby"]');
		expect(readPref(PREF.roomCardsHidden, [])).toEqual(['consult', 'lobby']);
	});

	it('keep session values in sessionStorage', () => {
		const local = memoryStorage(),
			session = memoryStorage();
		install('localStorage', local);
		install('sessionStorage', session);
		writePref(PREF.returnDoor, 'ctsim', 'session');
		expect(session.data.get('simhub.returnDoor')).toBe('"ctsim"');
		expect(local.data.size).toBe(0);
		expect(readPref<string | null>(PREF.returnDoor, null, 'session')).toBe('ctsim');
		expect(readPref<string | null>(PREF.returnDoor, null)).toBe(null);
	});

	it('give the fallback for a missing key or a value that is not JSON', () => {
		const local = memoryStorage();
		install('localStorage', local);
		expect(readPref(PREF.roomCardsEnabled, true)).toBe(true);
		local.data.set('simhub.sound', 'not json');
		expect(readPref(PREF.sound, false)).toBe(false);
	});

	it('takePref reads the value, then removes it', () => {
		const session = memoryStorage();
		install('sessionStorage', session);
		writePref(PREF.returning, true, 'session');
		expect(takePref(PREF.returning, false, 'session')).toBe(true);
		expect(session.data.has('simhub.returning')).toBe(false);
		expect(takePref(PREF.returning, false, 'session')).toBe(false);
	});

	it('work with no storage at all (the node checks have no sessionStorage)', () => {
		expect(readPref(PREF.sound, false)).toBe(false);
		expect(() => writePref(PREF.sound, true)).not.toThrow();
		expect(takePref<string | null>(PREF.returnDoor, null, 'session')).toBe(null);
	});

	it('work when every storage call throws', () => {
		install('localStorage', throwingStorage);
		install('sessionStorage', throwingStorage);
		expect(readPref(PREF.roomCardsEnabled, true)).toBe(true);
		expect(() => writePref(PREF.roomCardsHidden, ['lobby'])).not.toThrow();
		expect(takePref(PREF.returning, false, 'session')).toBe(false);
	});

	it('work when even reaching storage throws (blocked by privacy settings)', () => {
		for (const name of ['localStorage', 'sessionStorage'] as const)
			Object.defineProperty(globalThis, name, {
				get() {
					throw new Error('SecurityError');
				},
				configurable: true
			});
		expect(readPref(PREF.sound, false)).toBe(false);
		expect(() => writePref(PREF.sound, true, 'session')).not.toThrow();
		expect(takePref<string | null>(PREF.returnDoor, null, 'session')).toBe(null);
	});
});
