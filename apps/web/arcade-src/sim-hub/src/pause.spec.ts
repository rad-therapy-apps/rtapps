import { beforeEach, describe, expect, it, vi } from 'vitest';

// the pause state is module-level: every test gets a fresh module
let P: typeof import('./pause');
beforeEach(async () => {
	vi.resetModules();
	P = await import('./pause');
});

describe('pause', () => {
	it('starts unpaused', () => {
		expect(P.isPaused()).toBe(false);
	});

	it('stays paused while any reason is on', () => {
		P.setPaused('settings', true);
		P.setPaused('roomCard', true);
		P.setPaused('settings', false);
		expect(P.isPaused()).toBe(true);
		P.setPaused('roomCard', false);
		expect(P.isPaused()).toBe(false);
	});

	it('counts a reason once, however often it is switched on', () => {
		P.setPaused('menu', true);
		P.setPaused('menu', true);
		P.setPaused('menu', false);
		expect(P.isPaused()).toBe(false);
	});

	it('tells listeners only when the game as a whole pauses or resumes', () => {
		const seen: boolean[] = [];
		P.onPauseChange((paused) => seen.push(paused));
		P.setPaused('settings', true);
		P.setPaused('roomCard', true);
		P.setPaused('settings', false);
		P.setPaused('roomCard', false);
		P.setPaused('tutorial', false);
		expect(seen).toEqual([true, false]);
	});

	it('stops telling a listener that unsubscribed', () => {
		const seen: boolean[] = [];
		const off = P.onPauseChange((paused) => seen.push(paused));
		P.setPaused('tutorial', true);
		off();
		P.setPaused('tutorial', false);
		expect(seen).toEqual([true]);
	});
});
