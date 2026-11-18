/* Which room to start in, from the hub's own address (consoles in the center, part 7). An activity
   ("Treatment delivery", "CT simulation") opens the center as /arcade/sim-hub/index.html?start=<room>
   (the external player adds it from the activity's start_room). Only the two control rooms are
   allowed; anything else is ignored and the title menu shows as usual. main.ts asks here on boot,
   after the return-door check, and enters Free Mode at that room's door. Free of scene and DOM
   imports so it is unit tested in Node (start-room.spec.ts). */

export type StartRoom = 'linaccontrol' | 'ctcontrol';

const START_ROOMS: readonly string[] = ['linaccontrol', 'ctcontrol'];

/** The room named by `?start=` in `search` (the page's location.search), or null. */
export function startRoomFromSearch(search: string): StartRoom | null {
	const room = new URLSearchParams(search).get('start');
	return room !== null && START_ROOMS.includes(room) ? (room as StartRoom) : null;
}
