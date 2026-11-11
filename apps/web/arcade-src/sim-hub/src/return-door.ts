/* Back to the door you left from (sim-hub menu, task 1e). Leaving through a LINAC/CT room-app door,
   interact.ts performInteraction writes PREF.returnDoor (the room id, sessionStorage: the arcade
   pages share the app's origin and tab); the LINAC/CT app's Back to the Center button writes
   PREF.returning. On boot main.ts asks here where to start. Both values are taken (read and removed)
   every time, so only a real Back to the Center return skips the title menu and an old door is never
   reused. Free of scene and DOM imports so it is unit tested in Node (return-door.spec.ts). */
import { PREF, takePref } from './prefs';

/** The room id to start Free Mode at, or null for the title menu; `isRoom` accepts a room with a door. */
export function returnDoorOnBoot(isRoom: (id: string) => boolean): string | null {
	const returning = takePref<unknown>(PREF.returning, false, 'session'),
		door = takePref<unknown>(PREF.returnDoor, null, 'session');
	return returning === true && typeof door === 'string' && isRoom(door) ? door : null;
}
