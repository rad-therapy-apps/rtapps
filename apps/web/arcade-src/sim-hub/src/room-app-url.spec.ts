import { describe, expect, it } from 'vitest';
import { roomAppHref } from './room-app-url';

const BASE = 'https://rtapps.example/arcade/sim-hub/index.html';
// what window.RTApps.activityUrl resolves to: the player page's path
const urls = { linac: '/subjects/tdp/activities/7', ct: '/subjects/tdp/activities/8' };

describe('roomAppHref', () => {
	it('sends the LINAC Control Area door to the Treatment delivery player on the LINAC side', () => {
		expect(roomAppHref('linaccontrol', urls, BASE)).toBe(
			'https://rtapps.example/subjects/tdp/activities/7?side=linac'
		);
	});

	it('sends both CT doors to the CT simulation player on the CT side', () => {
		for (const door of ['ctcontrol', 'ctsim'])
			expect(roomAppHref(door, urls, BASE)).toBe(
				'https://rtapps.example/subjects/tdp/activities/8?side=ct'
			);
	});

	it('uses the Treatment delivery player, still on the CT side, when the CT URL did not resolve', () => {
		expect(roomAppHref('ctsim', { ...urls, ct: null }, BASE)).toBe(
			'https://rtapps.example/subjects/tdp/activities/7?side=ct'
		);
	});

	it('keeps any other query and replaces a side already there', () => {
		expect(
			roomAppHref('ctcontrol', { linac: urls.linac, ct: '/play/8?mode=x&side=linac#top' }, BASE)
		).toBe('https://rtapps.example/play/8?mode=x&side=ct#top');
	});
});
