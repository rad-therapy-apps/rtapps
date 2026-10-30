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

/* Room graphs: hand-placed waypoints per room (world x/z) joined by straight edges, each keeping a
   0.25 m half-width corridor clear of furniture (check l in scripts/sim-hub-npc-check.mjs; the vault
   and HDR door leaves, 2 cm thick across their doorways, are crossed by 0.7 cm at most). The first
   node is the room's door point (walk.ts doorPoint); the lobby's first three are its corridor exits,
   east, west and technical, and the vaults' graphs hold their maze. Every resting place in a room
   (arrival spots, staff spots, seat approach points, journey finals) has a nearest node it reaches in
   a straight line clear of furniture; for the places routes start or end at, that line also keeps
   the swinging legs (about 0.6 m behind and 0.4 m ahead at foot height) clear of furniture. */
export interface RoomGraph {
	nodes: [number, number][];
	edges: [number, number][];
}
export const ROOM_GRAPHS: Record<string, RoomGraph> = {
	// exits east, west and technical; J the corridor junction; G1-G2 between the two east benches;
	// N2-M-C along the front of the coffee table; GAP between the chair rows; CM-CW in front of the
	// west chairs; K by the check-in desk; SP among the arrival spots; TK between the technical exit
	// and the spots, clear of the desk
	lobby: {
		nodes: [
			[12.8, 0], // 0 E
			[-12.8, 0], // 1 W
			[0, -10.8], // 2 T
			[0, 0], // 3 J
			[4.2, -0.6], // 4 G1
			[6.8, -0.6], // 5 G2
			[6.9, 2.4], // 6 N2
			[1.6, 2.4], // 7 M
			[-0.6, 2.3], // 8 C
			[0.6, 3.4], // 9 GAP
			[0.4, 6.0], // 10 S
			[-3.0, 2.1], // 11 CM
			[-6.0, 2.2], // 12 CW
			[-4.5, -1.0], // 13 K
			[-3.0, 0.6], // 14 SP
			[-2.3, -2.0] // 15 TK
		],
		edges: [
			[0, 5],
			[0, 6],
			[4, 5],
			[3, 4],
			[6, 7],
			[7, 8],
			[7, 9],
			[8, 9],
			[9, 10],
			[8, 11],
			[11, 12],
			[12, 1],
			[13, 1],
			[3, 1],
			[11, 13],
			[3, 13],
			[3, 14],
			[14, 11],
			[14, 13],
			[2, 3],
			[2, 15],
			[15, 13],
			[15, 14]
		]
	},
	consult: {
		nodes: [
			[-18, -2.15],
			[-18, -3.9],
			[-19.9, -4.6],
			[-19.7, -7.4],
			[-16.6, -4.9],
			[-16.1, -7.4]
		],
		edges: [
			[0, 1],
			[1, 2],
			[1, 4],
			[2, 3],
			[3, 5],
			[4, 5]
		]
	},
	social: {
		nodes: [
			[-30, -2.15],
			[-30.4, -4.0],
			[-28.0, -5.6],
			[-28.6, -6.9],
			[-32.6, -6.6]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[1, 4]
		]
	},
	education: {
		nodes: [
			[-42, -2.15],
			[-40.55, -2.6],
			[-40.55, -4.1],
			[-39.75, -5.3],
			[-39.6, -7.3],
			[-42.9, -5.2],
			[-44.5, -5.0],
			[-44.5, -7.0]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[2, 5],
			[5, 6],
			[6, 7]
		]
	},
	patientcare: {
		nodes: [
			[-28, 2.15],
			[-25.9, 4.6],
			[-26.2, 6.2],
			[-29.0, 3.7],
			[-30.0, 6.5],
			[-29.0, 9.0]
		],
		edges: [
			[0, 1],
			[1, 2],
			[0, 3],
			[3, 4],
			[4, 5]
		]
	},
	safety: {
		nodes: [
			[-2.15, -18],
			[-4.0, -17.6]
		],
		edges: [[0, 1]]
	},
	physics: {
		nodes: [
			[2.15, -18],
			[4.0, -17.6]
		],
		edges: [[0, 1]]
	},
	engineering: {
		nodes: [
			[2.15, -31],
			[2.6, -31.68],
			[3.9, -31.68]
		],
		edges: [
			[0, 1],
			[1, 2]
		]
	},
	qa: {
		nodes: [
			[-2.15, -44],
			[-5.3, -45.5],
			[-5.3, -41.3]
		],
		edges: [
			[0, 1],
			[0, 2]
		]
	},
	dosimetry: {
		nodes: [
			[1.15, -49],
			[2.6, -49.0]
		],
		edges: [[0, 1]]
	},
	commons: {
		nodes: [
			[-1.15, -60],
			[-3.0, -59.3]
		],
		edges: [[0, 1]]
	},
	manager: {
		nodes: [
			[20, 2.65],
			[18.2, 6.5],
			[18.6, 7.6]
		],
		edges: [
			[0, 1],
			[1, 2]
		]
	},
	ctcontrol: {
		nodes: [
			[31.5, -3.15],
			[31.5, -4.5],
			[31.2, -5.6],
			[31.6, -7.15],
			[31.84, -8.5],
			[31.85, -10.69]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5]
		]
	},
	ctsim: {
		nodes: [
			[44, -2.15],
			[43.4, -4.0],
			[38.2, -4.4],
			[38.17, -4.93],
			[38.6, -6.1],
			[41.6, -6.9],
			[45.6, -5.6],
			[45.9, -8.0]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 4],
			[3, 4],
			[4, 5],
			[1, 5],
			[1, 6],
			[6, 7]
		]
	},
	linaccontrol: {
		nodes: [
			[51, 3.15],
			[50.95, 6.2],
			[51.3, 7.85],
			[51.28, 9.5],
			[52.8, 5.9],
			[52.9, 8.6]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[1, 4],
			[0, 4],
			[4, 5]
		]
	},
	// door, the step beside the entrance marker (and out of the doorway's centre line), then the maze
	// (hall, corner, room side); P off the bench's +z end, so the patient beside the bench leaves and
	// arrives along it; Wc off the couch's -x end
	vault1: {
		nodes: [
			[63.15, -18],
			[64.75, -18.95],
			[70.5, -18],
			[71.25, -15.3],
			[73.15, -15.3],
			[69.05, -12.9],
			[74.6, -19.4]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[3, 5],
			[4, 6]
		]
	},
	vault2: {
		nodes: [
			[63.15, 18],
			[64.75, 17.05],
			[70.5, 18],
			[71.25, 15.3],
			[73.15, 15.3],
			[74.6, 19.4]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5]
		]
	},
	hdr: {
		nodes: [
			[62.35, 25],
			[60.5, 25.6]
		],
		edges: [[0, 1]]
	}
};

// Waypoints this close to either end of an in-room path are left out (the de-duplication distance in
// npc-behavior.ts buildActorHandoffPath), so an end point is never dropped for a waypoint.
const NEAR_END = 0.22;

function nearestNode(g: RoomGraph, p: { x: number; z: number }): number {
	let best = 0;
	g.nodes.forEach(([x, z], i) => {
		const [bx, bz] = g.nodes[best];
		if (Math.hypot(x - p.x, z - p.z) < Math.hypot(bx - p.x, bz - p.z)) best = i;
	});
	return best;
}

/** The waypoints strictly between `from` and `to` inside room `roomId`: from's nearest node, the
    shortest path through the room's graph (no node repeated), then to's nearest node, less any within
    0.22 m of either end. [] for a room without a graph: a straight line. */
export function inRoomPath(
	roomId: string,
	from: { x: number; z: number },
	to: { x: number; z: number }
): [number, number][] {
	const g = ROOM_GRAPHS[roomId];
	if (!g) return [];
	const a = nearestNode(g, from),
		b = nearestNode(g, to),
		n = g.nodes.length,
		dist = new Array(n).fill(Infinity),
		prev = new Array(n).fill(-1),
		done = new Array(n).fill(false);
	dist[a] = 0;
	for (;;) {
		let u = -1;
		for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
		if (u < 0 || u === b || dist[u] === Infinity) break;
		done[u] = true;
		for (const [i, j] of g.edges) {
			const v = i === u ? j : j === u ? i : -1;
			if (v < 0) continue;
			const d = dist[u] + Math.hypot(g.nodes[v][0] - g.nodes[u][0], g.nodes[v][1] - g.nodes[u][1]);
			if (d < dist[v]) {
				dist[v] = d;
				prev[v] = u;
			}
		}
	}
	if (dist[b] === Infinity) return [];
	const path: [number, number][] = [];
	for (let v = b; v >= 0; v = prev[v]) path.unshift(g.nodes[v]);
	return path.filter(
		([x, z]) =>
			Math.hypot(x - from.x, z - from.z) > NEAR_END && Math.hypot(x - to.x, z - to.z) > NEAR_END
	);
}
