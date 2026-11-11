import { describe, expect, it } from 'vitest';
import {
	AUTO_OPEN_GRACE_MS,
	escKeyAction,
	lockLossOpensSettings,
	type EscKeyState,
	type LockLossState
} from './menu-rules';

// walking in Free Mode with the pointer free (say, after a dialog closed), nothing open
const walking: EscKeyState = {
	msSinceAutoOpen: Infinity,
	dialogOpen: false,
	locked: false,
	playMode: 'free',
	walking: true
};

describe('escKeyAction', () => {
	it('closes an open dialog (a conversation, a lab, the room card, the settings) instead of opening the settings', () => {
		expect(escKeyAction({ ...walking, dialogOpen: true })).toBe('closeDialog');
	});

	it('opens the settings while walking with the pointer free', () => {
		expect(escKeyAction(walking)).toBe('openSettings');
	});

	it('opens the settings on the title menu', () => {
		expect(escKeyAction({ ...walking, playMode: 'title', walking: false })).toBe('openSettings');
	});

	it('leaves an Esc that reaches the page while the pointer is locked to the lock loss', () => {
		expect(escKeyAction({ ...walking, locked: true })).toBe('ignore');
	});

	it('ignores the Esc that has just released the lock and opened the settings', () => {
		expect(
			escKeyAction({
				...walking,
				dialogOpen: true,
				msSinceAutoOpen: AUTO_OPEN_GRACE_MS - 1
			})
		).toBe('ignore');
	});

	it('acts on Esc again once that grace has passed', () => {
		expect(
			escKeyAction({
				...walking,
				dialogOpen: true,
				msSinceAutoOpen: AUTO_OPEN_GRACE_MS
			})
		).toBe('closeDialog');
	});

	it('does nothing in guided travel (neither walking nor on the title)', () => {
		expect(escKeyAction({ ...walking, walking: false })).toBe('ignore');
	});
});

describe('lockLossOpensSettings', () => {
	const lost: LockLossState = {
		walking: true,
		playMode: 'free',
		dialogOpen: false,
		paused: false
	};

	it('opens the settings when the lock is lost while walking with nothing open', () => {
		expect(lockLossOpensSettings(lost)).toBe(true);
	});

	it('does so in the tutorial too', () => {
		expect(lockLossOpensSettings({ ...lost, playMode: 'tutorial' })).toBe(true);
	});

	it('not when a dialog took the lock: every dialog frees the pointer as it opens', () => {
		expect(lockLossOpensSettings({ ...lost, dialogOpen: true })).toBe(false);
	});

	it('not when a pause took it (a room card)', () => {
		expect(lockLossOpensSettings({ ...lost, paused: true })).toBe(false);
	});

	it('not when the walk itself ended (Main menu, guided travel)', () => {
		expect(lockLossOpensSettings({ ...lost, walking: false })).toBe(false);
	});

	it('not on the title menu', () => {
		expect(lockLossOpensSettings({ ...lost, playMode: 'title' })).toBe(false);
	});
});
