import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnterOptions, PlayMode } from './play-mode';

let M: typeof import('./play-mode');
beforeEach(async () => {
	vi.resetModules();
	M = await import('./play-mode');
});

describe('play mode', () => {
	it('starts at the title', () => {
		expect(M.getPlayMode()).toBe('title');
	});

	it('sets the mode, then tells the listeners in registration order, with the options', () => {
		const seen: string[] = [];
		M.onPlayModeChange((m, opts) => seen.push(`a:${m}:${opts.atDoor}:${M.getPlayMode()}`));
		M.onPlayModeChange((m) => seen.push(`b:${m}`));
		M.enterMode('free', { atDoor: 'ctsim' });
		expect(seen).toEqual(['a:free:ctsim:free', 'b:free']);
	});

	it('passes empty options when none are given', () => {
		const seen: EnterOptions[] = [];
		M.onPlayModeChange((_m, opts) => seen.push(opts));
		M.enterMode('tutorial');
		expect(seen).toEqual([{}]);
	});

	it('tells the listeners even when the mode does not change (the boot enters the title)', () => {
		const seen: PlayMode[] = [];
		M.onPlayModeChange((m) => seen.push(m));
		M.enterMode('title');
		expect(seen).toEqual(['title']);
	});

	it('stops telling a listener that unsubscribed', () => {
		const seen: PlayMode[] = [];
		const off = M.onPlayModeChange((m) => seen.push(m));
		M.enterMode('free');
		off();
		M.enterMode('title');
		expect(seen).toEqual(['free']);
	});
});
