/* Where people go inside a room (sim-hub NPC stage 3). Plain data plus three.js only, so the
   movement modules (npc-behavior.ts, journey.ts) can import it without a cycle.

   Arrival spots: the standing spots a hand-over without its own `final` point ends at, per target
   room, in world x/z with the facing (rotation.y) the actor turns to on arrival: toward the room's
   resident staff or its work area. Each spot is at least 0.05 m clear of furniture for the
   people who arrive there, 0.6 m from the room's other spots and 0.5 m from its residents
   (checks k and m in scripts/sim-hub-npc-check.mjs). Each room has one more spot than the
   hand-overs into it, and at least 3. The first spot is the room's old fixed arrival point where
   that point passes. */
import * as THREE from 'three';

export interface ArrivalSpot {
	x: number;
	z: number;
	facing: number;
}

export const ARRIVAL_SPOTS: Record<string, ArrivalSpot[]> = {
	// in front of the waiting chairs, facing reception
	lobby: [
		{ x: -3.2, z: 1.3, facing: -2.53 },
		{ x: -3.45, z: 0.7, facing: -2.5 },
		{ x: -2.6, z: 1.05, facing: -2.41 },
		{ x: -3.75, z: 1.65, facing: -2.66 }
	],
	consult: [
		{ x: -16.7, z: -6.85, facing: -2.06 },
		{ x: -17.3, z: -7.1, facing: -2.07 },
		{ x: -16.5, z: -6.2, facing: -2.16 }
	],
	social: [
		{ x: -28.9, z: -6.05, facing: -2.25 },
		{ x: -28.9, z: -6.7, facing: -2.12 },
		{ x: -29.6, z: -6.95, facing: -2.16 }
	],
	education: [
		{ x: -41.1, z: -5.4, facing: -2.13 },
		{ x: -41.5, z: -7.0, facing: -1.55 },
		{ x: -41.8, z: -5.4, facing: -2.28 }
	],
	patientcare: [
		{ x: -27.4, z: 4.95, facing: 0.53 },
		{ x: -27.4, z: 6.05, facing: 1.27 },
		{ x: -26.65, z: 5.5, facing: 0.06 }
	],
	physics: [
		{ x: 6.4, z: -17.2, facing: -2.66 },
		{ x: 5.75, z: -17.2, facing: -2.93 },
		{ x: 6.15, z: -17.8, facing: -2.63 }
	],
	// beside the QA enclosure, facing it
	qa: [
		{ x: -5.65, z: -43.4, facing: -2.16 },
		{ x: -5.65, z: -42.4, facing: -2.32 },
		{ x: -5.6, z: -44.05, facing: -2.03 }
	],
	ctcontrol: [
		{ x: 31.3, z: -7.4, facing: 1.05 },
		{ x: 31.3, z: -6.75, facing: 1.46 },
		{ x: 31.85, z: -7.75, facing: 0.64 }
	],
	ctsim: [
		{ x: 40.4, z: -7.2, facing: 2.58 },
		{ x: 40.4, z: -7.9, facing: 2.3 },
		{ x: 40.5, z: -6.5, facing: 2.77 }
	],
	// behind the operators' chairs, facing the console
	linaccontrol: [
		{ x: 52.75, z: 7.2, facing: -0.99 },
		{ x: 52.75, z: 6.5, facing: -0.83 },
		{ x: 52.75, z: 7.9, facing: -1.19 },
		{ x: 52.75, z: 8.6, facing: -1.43 },
		{ x: 52.75, z: 9.3, facing: -1.68 }
	],
	vault1: [
		{ x: 75.0, z: -14.25, facing: 2.36 },
		{ x: 74.8, z: -14.9, facing: 1.36 },
		{ x: 75.45, z: -13.75, facing: 3.09 }
	],
	vault2: [
		{ x: 75.15, z: 14.3, facing: 0.66 },
		{ x: 74.8, z: 14.85, facing: 1.71 },
		{ x: 75.8, z: 14.25, facing: -0.54 }
	]
};

// Someone else standing this close to a spot makes it taken (check m's spacing).
const SPOT_CLEAR = 0.5;
// The spot each actor holds, until it starts another move or the journey resets.
const holds = new Map<THREE.Object3D, ArrivalSpot>();

/** The first spot in `roomId` that no other actor holds and that has no other visible person
    (a figure or a lying patient) within 0.5 m; `actor` holds it. Null when every spot is taken or
    the room has none. */
export function takeArrivalSpot(roomId: string, actor: THREE.Object3D): ArrivalSpot | null {
	releaseArrivalSpot(actor);
	let root = actor;
	while (root.parent) root = root.parent;
	const people: THREE.Vector3[] = [];
	root.traverseVisible((o) => {
		if (o !== actor && (o.userData.walkRig || o.userData.lying))
			people.push(o.getWorldPosition(new THREE.Vector3()));
	});
	const held = new Set(holds.values());
	const spot = (ARRIVAL_SPOTS[roomId] || []).find(
		(s) => !held.has(s) && !people.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < SPOT_CLEAR)
	);
	if (!spot) return null;
	holds.set(actor, spot);
	return spot;
}

/** Frees the spot `actor` holds, if any. */
export function releaseArrivalSpot(actor: THREE.Object3D): void {
	holds.delete(actor);
}

/** Frees every spot (the journey reset). */
export function clearArrivalSpots(): void {
	holds.clear();
}
