import { describe, expect, it } from 'vitest';
import { startRoomFromSearch } from './start-room';

describe('startRoomFromSearch', () => {
	it('returns the two control rooms', () => {
		expect(startRoomFromSearch('?start=linaccontrol')).toBe('linaccontrol');
		expect(startRoomFromSearch('?start=ctcontrol')).toBe('ctcontrol');
	});

	it('finds start among other parameters', () => {
		expect(startRoomFromSearch('?npccheck&start=ctcontrol')).toBe('ctcontrol');
	});

	it('returns null for no search, no start, an empty value or another room', () => {
		expect(startRoomFromSearch('')).toBeNull();
		expect(startRoomFromSearch('?npccheck')).toBeNull();
		expect(startRoomFromSearch('?start=')).toBeNull();
		expect(startRoomFromSearch('?start=ctsim')).toBeNull();
		expect(startRoomFromSearch('?start=LINACCONTROL')).toBeNull();
	});
});
