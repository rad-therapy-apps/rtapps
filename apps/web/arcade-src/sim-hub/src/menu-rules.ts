/* What Esc and a pointer-lock loss do (sim-hub menu, task 1a; menu.ts applies them). The browser keeps
   Esc to itself while the pointer is locked: it only releases the lock. So the settings open on that
   lock loss, unless the loss came from a dialog opening (every dialog frees the pointer as it opens)
   or a pause (a room card), and on an Esc keydown while the pointer is free. An Esc with a dialog open
   closes the dialog instead. AUTO_OPEN_GRACE_MS ignores an Esc keydown that arrives right after the
   lock loss already opened the settings, in a browser that sends both. Free of scene and DOM imports
   so it is unit tested in Node (menu-rules.spec.ts). */
import type { PlayMode } from './play-mode';

export const AUTO_OPEN_GRACE_MS = 300;

export type EscAction = 'ignore' | 'closeDialog' | 'openSettings';

export interface EscKeyState {
	/** Milliseconds since a lock loss last opened the settings. */
	msSinceAutoOpen: number;
	/** A registered dialog is open (dialogs.ts), the settings included. */
	dialogOpen: boolean;
	locked: boolean;
	playMode: PlayMode;
	/** In walk mode and not in guided travel. */
	walking: boolean;
}

export function escKeyAction(s: EscKeyState): EscAction {
	if (s.msSinceAutoOpen < AUTO_OPEN_GRACE_MS) return 'ignore';
	if (s.dialogOpen) return 'closeDialog';
	if (s.locked) return 'ignore';
	return s.playMode === 'title' || s.walking ? 'openSettings' : 'ignore';
}

export interface LockLossState {
	walking: boolean;
	playMode: PlayMode;
	dialogOpen: boolean;
	paused: boolean;
}

export function lockLossOpensSettings(s: LockLossState): boolean {
	return s.walking && s.playMode !== 'title' && !s.dialogOpen && !s.paused;
}
