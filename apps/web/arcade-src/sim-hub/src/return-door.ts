/* Back to the door you left from (sim-hub menu, task 1e). Leaving through a LINAC/CT room-app door,
   interact.ts performInteraction writes PREF.returnDoor (the room id, sessionStorage: the arcade
   pages share the app's origin and tab); the LINAC/CT app's Back to the Center button writes
   PREF.returning. On boot main.ts asks here where to start. Both values are taken (read and removed)
   every time, so only a real Back to the Center return skips the title menu and an old door is never
   reused. Free of scene and DOM imports so it is unit tested in Node (return-door.spec.ts). */
import { PREF, takePref } from './prefs';
import { segmentBlocked, type WallRect } from './prompt-math';

/** The room id to start Free Mode at, or null for the title menu; `isRoom` accepts a room with a door. */
export function returnDoorOnBoot(isRoom: (id: string) => boolean): string | null {
	const returning = takePref<unknown>(PREF.returning, false, 'session'),
		door = takePref<unknown>(PREF.returnDoor, null, 'session');
	return returning === true && typeof door === 'string' && isRoom(door) ? door : null;
}

const PROBE_START = 0.6, // m out from the door, where the clear run is measured from
	PROBE_STEP = 0.5,
	PROBE_MAX = 12,
	MIN_CLEAR = 2; // below this on both sides the door faces a dead end: keep the door normal

type XZ = { x: number; z: number };

/** The direction to face on arriving at a door: along the hallway, not at the wall across it. `out` is
    the unit door normal (into the hallway); the candidates are its two floor-plane perpendiculars, and
    the one with the longer clear run wins (a tie goes to (-out.z, out.x)). Both under 2 m: `out`. */
export function hallwayFacing(at: XZ, out: XZ, walls: readonly WallRect[]): XZ {
	const sx = at.x + out.x * PROBE_START,
		sz = at.z + out.z * PROBE_START,
		clearRun = (d: XZ): number => {
			let run = 0;
			for (let t = PROBE_STEP; t <= PROBE_MAX; t += PROBE_STEP) {
				if (segmentBlocked(sx, sz, sx + d.x * t, sz + d.z * t, walls)) break;
				run = t;
			}
			return run;
		},
		a = { x: -out.z, z: out.x },
		b = { x: out.z, z: 0 - out.x },
		ra = clearRun(a),
		rb = clearRun(b);
	if (ra < MIN_CLEAR && rb < MIN_CLEAR) return out;
	return rb > ra ? b : a;
}
