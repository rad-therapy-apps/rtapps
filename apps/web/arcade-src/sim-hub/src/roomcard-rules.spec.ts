import { describe, expect, it } from 'vitest';
import {
	hideRoomCardFor,
	roomTypeLabel,
	roomZoneLabel,
	setRoomCardsEnabled,
	shouldShowRoomCard,
	shouldShowRoomCardNow,
	type RoomCardPrefs
} from './roomcard-rules';

const fresh: RoomCardPrefs = { enabled: true, hidden: [] };

describe('room card rules', () => {
	it('show a room’s card on the first entry', () => {
		expect(shouldShowRoomCard('consult', fresh)).toBe(true);
	});

	it('do not show a ticked room, and still show the others', () => {
		const ticked = hideRoomCardFor('consult', fresh);
		expect(shouldShowRoomCard('consult', ticked)).toBe(false);
		expect(shouldShowRoomCard('lobby', ticked)).toBe(true);
	});

	it('keep a ticked room once, however often it is ticked', () => {
		expect(hideRoomCardFor('consult', hideRoomCardFor('consult', fresh)).hidden).toEqual([
			'consult'
		]);
	});

	it('show no cards at all with room introductions off', () => {
		const off = setRoomCardsEnabled(false, fresh);
		expect(shouldShowRoomCard('consult', off)).toBe(false);
		expect(shouldShowRoomCard('lobby', off)).toBe(false);
	});

	it('clear the ticked rooms when room introductions come back on, so every card shows again', () => {
		const ticked = hideRoomCardFor('lobby', hideRoomCardFor('consult', fresh));
		const back = setRoomCardsEnabled(true, setRoomCardsEnabled(false, ticked));
		expect(back).toEqual({ enabled: true, hidden: [] });
		expect(shouldShowRoomCard('consult', back)).toBe(true);
	});

	it('keep the ticked rooms while room introductions are off', () => {
		expect(setRoomCardsEnabled(false, hideRoomCardFor('consult', fresh)).hidden).toEqual([
			'consult'
		]);
	});

	it('name the department zone as the old room panel did', () => {
		expect([roomZoneLabel('front'), roomZoneLabel('technical'), roomZoneLabel('clinical')]).toEqual(
			['Patient Services', 'Technical / Support', 'Clinical']
		);
	});

	it('name the room type as the old room panel did', () => {
		expect(
			['vault1', 'vault2', 'hdr', 'ctcontrol', 'ctsim', 'consult'].map((id) => roomTypeLabel(id))
		).toEqual([
			'Modern LINAC treatment vault',
			'Modern LINAC treatment vault',
			'HDR / special procedures',
			'CT operator control room',
			'CT simulation',
			'Department area'
		]);
	});

	describe('in the Tutorial, once per room per play', () => {
		it('shows a room on its first entry', () => {
			expect(shouldShowRoomCardNow('vault1', fresh, 'tutorial', new Set())).toBe(true);
		});

		it('does not show it again on a second entry in the same play', () => {
			const shown = new Set(['vault1']);
			expect(shouldShowRoomCardNow('vault1', fresh, 'tutorial', shown)).toBe(false);
			expect(shouldShowRoomCardNow('lobby', fresh, 'tutorial', shown)).toBe(true);
		});

		it('shows it again in a new play (the set is emptied)', () => {
			expect(shouldShowRoomCardNow('vault1', fresh, 'tutorial', new Set())).toBe(true);
		});

		it('leaves Free Mode showing the card on every entry', () => {
			expect(shouldShowRoomCardNow('vault1', fresh, 'free', new Set(['vault1']))).toBe(true);
		});

		it('shows nothing with room introductions off', () => {
			const off = { enabled: false, hidden: [] };
			expect(shouldShowRoomCardNow('vault1', off, 'tutorial', new Set())).toBe(false);
			expect(shouldShowRoomCardNow('vault1', off, 'free', new Set())).toBe(false);
		});
	});
});
