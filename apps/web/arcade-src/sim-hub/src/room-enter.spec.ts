import { describe, expect, it } from 'vitest';
import type { Room } from './rooms';
import { ENTER_DWELL_SEC, createRoomEntryTracker } from './room-enter';

const room = (id: string) => ({ id }) as Room;
const LOBBY = room('lobby'),
	CONSULT = room('consult'),
	SOCIAL = room('social');

function tracker() {
	const fired: string[] = [];
	return { fired, note: createRoomEntryTracker((r) => fired.push(r.id)) };
}

describe('room entry', () => {
	it('fires once the player has been inside a room for 0.3 s, not before', () => {
		const { fired, note } = tracker();
		expect(ENTER_DWELL_SEC).toBe(0.3);
		note(CONSULT, 0.2);
		expect(fired).toEqual([]);
		note(CONSULT, 0.1);
		expect(fired).toEqual(['consult']);
	});

	it('fires for the lobby too', () => {
		const { fired, note } = tracker();
		note(LOBBY, 0.3);
		expect(fired).toEqual(['lobby']);
	});

	it('does not fire again while the player stays', () => {
		const { fired, note } = tracker();
		note(CONSULT, 0.3);
		note(CONSULT, 5);
		expect(fired).toEqual(['consult']);
	});

	it('does not fire for a room left within 0.3 s', () => {
		const { fired, note } = tracker();
		note(CONSULT, 0.2);
		note(null, 0.05);
		note(SOCIAL, 0.2);
		expect(fired).toEqual([]);
	});

	it('fires again on the next entry after a hallway or outside', () => {
		const { fired, note } = tracker();
		note(CONSULT, 0.3);
		note(null, 0.05);
		note(CONSULT, 0.3);
		expect(fired).toEqual(['consult', 'consult']);
	});

	it('walking straight into another room fires it, and walking straight back does not repeat the first', () => {
		const { fired, note } = tracker();
		note(CONSULT, 0.3);
		note(SOCIAL, 0.3);
		note(CONSULT, 0.3);
		expect(fired).toEqual(['consult', 'social']);
	});
});
