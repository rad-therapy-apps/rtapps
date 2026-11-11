/* The play mode (sim-hub menu, Step 0): 'title' (the title menu over the turning overview), 'free'
   (Free Mode) or 'tutorial'. enterMode records the mode and tells the listeners; menu.ts's listener
   does the switch itself (the camera, walk mode, the menu), the HUD modules show or hide their parts.
   Free of scene and DOM imports so it is unit tested in Node (play-mode.spec.ts). */
export type PlayMode = 'title' | 'free' | 'tutorial';
/** `atDoor`: a room id; the walk starts just outside that room's door, facing the hallway. */
export interface EnterOptions {
	atDoor?: string;
}

let mode: PlayMode = 'title';
const listeners: ((m: PlayMode, opts: EnterOptions) => void)[] = [];

export function getPlayMode(): PlayMode {
	return mode;
}

/** Sets the mode, then calls every listener synchronously in registration order (so a menu click's
    user gesture still holds when a listener asks for the pointer lock). It notifies even when the mode
    does not change: the boot enters 'title' to show the menu. */
export function enterMode(m: PlayMode, opts: EnterOptions = {}): void {
	mode = m;
	for (const cb of [...listeners]) cb(m, opts);
}

/** Returns the unsubscribe. */
export function onPlayModeChange(cb: (m: PlayMode, opts: EnterOptions) => void): () => void {
	listeners.push(cb);
	return () => {
		const i = listeners.indexOf(cb);
		if (i >= 0) listeners.splice(i, 1);
	};
}
