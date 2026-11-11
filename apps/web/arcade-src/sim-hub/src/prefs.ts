/* Every browser-storage access of the sim hub (sim-hub menu, Step 0), each in try/catch. Storage can
   be missing (the node checks' stubs have no sessionStorage), blocked (privacy settings throw on
   access) or full; then reads give the fallback and writes do nothing, and the game still works.
   Values are stored as JSON; callers check the shape of what they read back. The LINAC/CT app imports
   this module too, for PREF.returning. Free of scene and DOM imports so it is unit tested in Node
   (prefs.spec.ts). */
export const PREF = {
	/** localStorage, JSON string[] of room ids whose room card was ticked "Don't show this again" */
	roomCardsHidden: 'simhub.roomCards.hidden',
	/** localStorage, JSON boolean, default true: Settings > Room introductions */
	roomCardsEnabled: 'simhub.roomCards.enabled',
	/** localStorage, JSON boolean, default false: Settings > Sound */
	sound: 'simhub.sound',
	/** sessionStorage, JSON string room id, written as the hub leaves through a room-app door */
	returnDoor: 'simhub.returnDoor',
	/** sessionStorage, JSON boolean, written by the LINAC/CT app's Back to the Center button */
	returning: 'simhub.returning'
} as const;

type PrefStore = 'local' | 'session';

function storage(store: PrefStore): Storage | undefined {
	return store === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
}

export function readPref<T>(key: string, fallback: T, store: PrefStore = 'local'): T {
	try {
		const raw = storage(store)?.getItem(key);
		return raw == null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export function writePref(key: string, value: unknown, store: PrefStore = 'local'): void {
	try {
		storage(store)?.setItem(key, JSON.stringify(value));
	} catch {
		// storage blocked or full: the game goes on without remembering
	}
}

/** Reads the value, then removes it. */
export function takePref<T>(key: string, fallback: T, store: PrefStore = 'local'): T {
	const value = readPref(key, fallback, store);
	try {
		storage(store)?.removeItem(key);
	} catch {
		// as in writePref
	}
	return value;
}
