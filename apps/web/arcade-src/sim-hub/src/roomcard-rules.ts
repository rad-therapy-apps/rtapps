/* The room card's rules (sim-hub menu, task 1c; hud-roomcard.ts applies them). A room's card shows
   unless room introductions are off or the room was ticked "Don't show this again"; turning room
   introductions back on clears the ticked rooms. In the Tutorial a room's card shows only the first
   time the player enters it during one play (the caller keeps the set of rooms already shown and
   empties it when a new Tutorial play starts); Free Mode shows it on every entry. The zone and room-type names are the old room
   panel's (interact.ts updateRoomUI, removed in task 1d). Free of scene and DOM imports so it is unit
   tested in Node (roomcard-rules.spec.ts). */
import type { Room } from './rooms';
import type { PlayMode } from './play-mode';

export interface RoomCardPrefs {
	enabled: boolean;
	hidden: string[];
}

export function shouldShowRoomCard(roomId: string, prefs: RoomCardPrefs): boolean {
	return prefs.enabled && !prefs.hidden.includes(roomId);
}

/** The full rule for one entry: the prefs, then the Tutorial's once-per-play limit. `shownThisPlay`
    holds the rooms whose card the Tutorial play has already shown. */
export function shouldShowRoomCardNow(
	roomId: string,
	prefs: RoomCardPrefs,
	mode: PlayMode,
	shownThisPlay: ReadonlySet<string>
): boolean {
	if (!shouldShowRoomCard(roomId, prefs)) return false;
	return mode !== 'tutorial' || !shownThisPlay.has(roomId);
}

export function hideRoomCardFor(roomId: string, prefs: RoomCardPrefs): RoomCardPrefs {
	return prefs.hidden.includes(roomId) ? prefs : { ...prefs, hidden: [...prefs.hidden, roomId] };
}

export function setRoomCardsEnabled(on: boolean, prefs: RoomCardPrefs): RoomCardPrefs {
	return { enabled: on, hidden: on ? [] : prefs.hidden };
}

export function roomZoneLabel(zone: Room['zone']): string {
	return zone === 'front'
		? 'Patient Services'
		: zone === 'technical'
			? 'Technical / Support'
			: 'Clinical';
}

export function roomTypeLabel(roomId: string): string {
	if (roomId === 'vault1' || roomId === 'vault2') return 'Modern LINAC treatment vault';
	if (roomId === 'hdr') return 'HDR / special procedures';
	if (roomId === 'ctcontrol') return 'CT operator control room';
	if (roomId === 'ctsim') return 'CT simulation';
	return 'Department area';
}
