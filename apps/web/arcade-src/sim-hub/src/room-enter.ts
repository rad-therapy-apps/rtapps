/* Room entry (sim-hub menu, task 1c). onRoomEnter fires once the player has been inside a room
   (walk.ts roomContainingWalkPoint: the lobby included, a vault from its entrance maze on) for
   ENTER_DWELL_SEC. A room fires again only after the player has been out in a hallway or outside
   since it last fired, so walking between two connected rooms does not repeat it. walk.ts updateWalk
   feeds noteWalkRoom every walking frame; paused frames do not run it. Unlike the staff-composition
   hook (journey.ts applyWalkConversationComposition), it fires for rooms without staff too. The
   tracker has no scene or DOM imports, so it is unit tested in Node (room-enter.spec.ts). */
import type { Room } from './rooms';

export const ENTER_DWELL_SEC = 0.3;

export function createRoomEntryTracker(
	fire: (room: Room) => void
): (room: Room | null, dt: number) => void {
	let currentId: string | null = null,
		dwell = 0;
	const firedSinceHallway = new Set<string>();
	return (room, dt) => {
		if (!room) {
			currentId = null;
			dwell = 0;
			firedSinceHallway.clear();
			return;
		}
		if (room.id !== currentId) {
			currentId = room.id;
			dwell = 0;
		}
		if (firedSinceHallway.has(room.id)) return;
		dwell += dt;
		if (dwell >= ENTER_DWELL_SEC) {
			firedSinceHallway.add(room.id);
			fire(room);
		}
	};
}

const listeners: ((room: Room) => void)[] = [];

export const noteWalkRoom = createRoomEntryTracker((room) => {
	for (const cb of [...listeners]) cb(room);
});

/** Returns the unsubscribe. */
export function onRoomEnter(cb: (room: Room) => void): () => void {
	listeners.push(cb);
	return () => {
		const i = listeners.indexOf(cb);
		if (i >= 0) listeners.splice(i, 1);
	};
}
