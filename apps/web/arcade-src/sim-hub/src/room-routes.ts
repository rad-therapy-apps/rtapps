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

/** Frees every spot (the journey reset) but those held by the actors `keep` returns true for: the
    caller's hand-overs still under way, which are walking to theirs. */
export function clearArrivalSpots(keep: (actor: THREE.Object3D) => boolean = () => false): void {
	for (const actor of [...holds.keys()]) if (!keep(actor)) holds.delete(actor);
}

/* Room graphs: hand-placed waypoints per room (world x/z) joined by straight edges, each keeping a
   0.25 m half-width corridor clear of furniture (check l in scripts/sim-hub-npc-check.mjs; the vault
   and HDR door leaves, 2 cm thick across their doorways, are crossed by 1.0 cm at most). The first
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
	// round the exam table (x -19.1..-16.9, z -6.86..-6.14): its -x side for the patient on it and the
	// doctor, its +x side for the arrival spots and Mia's final
	consult: {
		nodes: [
			[-18, -2.15], // 0 door
			[-18, -3.9], // 1 inside the door
			[-19.9, -4.6], // 2 -x of the IV pole at (-18.9, -4.8)
			[-19.7, -7.4], // 3 off the table's -x end: the patient steps off it along x
			[-16.6, -4.9], // 4 +z of the table: Mia's final (-17.2, -5.9) leaves and arrives along z
			[-16.1, -7.4] // 5 off the table's +x end: spots [0] and [1]
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
	// round the couch, whose back faces the door: its +x side to the arrival spots and the patient
	// on it, its -x side to the staff by the table
	social: {
		nodes: [
			[-30, -2.15], // 0 door
			[-30.4, -4.0], // 1 inside the door
			[-28.0, -5.6], // 2 +x of the couch
			[-28.6, -6.9], // 3 -z of the couch's +x end: the spots and the patient's stand-up point
			[-32.6, -6.6] // 4 -x of the couch, clear of its back, for the staff by the table
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[1, 4]
		]
	},
	// in by the door's +x half (the doorway is x -43.3..-40.7), then round the desk (x -43.9..-40.1,
	// z -6.75..-5.65). Spot [1] (-41.5, -7.0) stands in the 0.59 m gap between the desk and the
	// chairs: its line to node 4 is clear at body width (0.12 m), not at 0.25 m
	education: {
		nodes: [
			[-42, -2.15], // 0 door
			[-40.92, -2.6], // 1 outside the door's +x half
			[-40.92, -4.0], // 2 inside it
			[-39.75, -5.3], // 3 +x of the desk: Mia's final and spot [0] arrive and leave along x
			[-39.6, -7.3], // 4 off the desk's +x end, -z side: the seated patient and spot [1]
			[-42.9, -5.2], // 5 +z of the desk: spot [2] along x
			[-44.5, -5.0], // 6 and 7 round the desk's -x end
			[-44.5, -7.0] // 7 to the navigator (-43.6, -6.95)
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
	// round the cart (-28, 4.4) and the bed (x -29.1..-26.9, z 5.22..5.78) inside the door: +x side
	// to the arrival spots, -x side to the exam table at (-30.6, 9.8)
	patientcare: {
		nodes: [
			[-28, 2.15], // 0 door
			[-25.9, 4.6], // 1 +x of the cart and bed: spot [0] arrives along x, clear of the bed
			[-26.2, 6.2], // 2 +z of the bed's +x end: spots [1], [2] and the nurse
			[-29.0, 3.7], // 3 inside the door's -x half, clear of the cart
			[-30.0, 6.5], // 4 -x of the bed
			[-29.0, 9.0] // 5 +x of the table's stand-up point (-30.6, 9.14): leaves along x
		],
		edges: [
			[0, 1],
			[1, 2],
			[0, 3],
			[3, 4],
			[4, 5]
		]
	},
	// door to the open floor; the desk and chairs stay clear of both lines
	safety: {
		nodes: [
			[-2.15, -18],
			[-4.0, -17.6]
		],
		edges: [[0, 1]]
	},
	// door to the open floor; the desk and the round panel at (9.2, -17.5) stay clear
	physics: {
		nodes: [
			[2.15, -18],
			[4.0, -17.6]
		],
		edges: [[0, 1]]
	},
	// in by the door's -z half, between the wall screen (x 3.1..3.2, z -31.16..-28.14, from 1.11 m)
	// and the cabinet at (4.05, -32.9)
	engineering: {
		nodes: [
			[2.15, -31], // 0 door
			[2.6, -31.68], // 1 outside the door's -z half
			[3.9, -31.68] // 2 inside, between the screen and the cabinet
		],
		edges: [
			[0, 1],
			[1, 2]
		]
	},
	// the arrival spots stand beside the enclosure (x -9.05..-5.95, z -44.7..-41.9): they are reached
	// along z, from off its ends
	qa: {
		nodes: [
			[-2.15, -44], // 0 door
			[-5.3, -45.5], // 1 off the enclosure's -z end: spots [0] and [2]
			[-5.3, -41.3] // 2 off its +z end: spot [1] and the physicist's start
		],
		edges: [
			[0, 1],
			[0, 2]
		]
	},
	// door to the open floor; the desks stay clear of the line
	dosimetry: {
		nodes: [
			[1.15, -49],
			[2.6, -49.0]
		],
		edges: [[0, 1]]
	},
	// door to the open floor; the table and chairs stay clear
	commons: {
		nodes: [
			[-1.15, -60],
			[-3.0, -59.3]
		],
		edges: [[0, 1]]
	},
	// round the desk's -x end (x 18.75..21.25, z 6.07..6.93)
	manager: {
		nodes: [
			[20, 2.65], // 0 door
			[18.2, 6.5], // 1 -x of the desk
			[18.6, 7.6] // 2 +z of the desk's -x end: the manager behind it and the visitor's chair
		],
		edges: [
			[0, 1],
			[1, 2]
		]
	},
	// past the cabinet inside the door, then down the aisle between the console (x 29.73..30.87) and
	// the operators' chairs (from x 32.2)
	ctcontrol: {
		nodes: [
			[31.5, -3.15], // 0 door
			[31.5, -4.5], // 1 inside the door
			[31.2, -5.6], // 2 -x of the cabinet at (32.6, -5.55)
			[31.6, -7.15], // 3 aisle: the arrival spots and the operators' places
			[31.84, -8.5], // 4 past the keyboard tray (x 31.23..31.47) on its +x side
			[31.85, -10.69] // 5 the partner (31.0, -11.0) leaves at ~20 deg, legs clear of the console
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5]
		]
	},
	// from the door round the gantry (x 43.4..44.6, z -12.2..-6.8): -x to the couch side and the
	// changing bench, +x to the far side
	ctsim: {
		nodes: [
			[44, -2.15], // 0 door
			[43.4, -4.0], // 1 inside the door, clear of the IV pole at (43.5, -5.6)
			[38.2, -4.4], // 2 Mia's bench final (37.15, -4.4) is reached along x, clear of the coat hook
			[38.37, -4.93], // 3 the navigator (38.3, -4.7) leaves and arrives along ~290 deg
			[38.6, -6.1], // 4 toward the couch side: the navigator's next place (39.8, -6.7)
			[41.6, -6.9], // 5 +z of the couch: the arrival spots and the CT staff
			[45.6, -5.6], // 6 +x of the gantry
			[45.9, -8.0] // 7 the far-side staff place
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
	// the aisle between the console's keyboards (to x 50.87) and the operators' chairs (from x 51.7),
	// and a line behind the chairs for the arrival spots
	linaccontrol: {
		nodes: [
			[51, 3.15], // 0 door
			[50.95, 6.2], // 1 Marcus (50.8, 7.0) leaves along -z, clear of the console top
			[51.3, 7.85], // 2 aisle
			[51.28, 9.5], // 3 aisle
			[52.8, 5.9], // 4 behind the chairs: spot [0] arrives along z
			[52.9, 8.6] // 5 behind the chairs: spots [2]-[4]
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
	// door, a step, then the maze: the hall, a turn past the end of the hall's inner wall (x 64.30..71.50,
	// z +/-15.24..+/-15.66), a corner beyond that wall's end, the room side. The step took entries
	// beside the old mid-doorway entrance marker; the markers now sit on the wall at x 63.685,
	// z +/-15.45, so it avoids nothing a straight line would hit and is kept as the routes were
	// checked. vault1's is on the -z side, away from the wall panel at (64.45, -16.8)
	vault1: {
		nodes: [
			[63.15, -18], // 0 door
			[64.75, -18.95], // 1 step
			[70.5, -18], // 2 hall
			[71.7, -15.0], // 3 corner: the changing-area final (69.8, -15.03) is reached along the wall
			[73.15, -15.3], // 4 room side
			[69.05, -12.75], // 5 off the bench's +z end: the patient beside it leaves and arrives along it
			[74.6, -19.4], // 6 off the couch's -x end, for the staff place at (77.4, -20.4)
			[71.85, -16.0] // 7 turn, east of the inner wall's end
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 7],
			[7, 3],
			[3, 4],
			[3, 5],
			[4, 6]
		]
	},
	// vault1 without the bench node, the hall, turn, corner and room side mirrored in z; the step is
	// not mirrored (z 17.05, 0.95 m to the door's -z side, as vault1's is 0.95 m to its -z side)
	vault2: {
		nodes: [
			[63.15, 18], // 0 door
			[64.75, 17.05], // 1 step (see vault1)
			[70.5, 18], // 2 hall
			[71.7, 15.0], // 3 corner
			[73.15, 15.3], // 4 room side
			[74.6, 19.4], // 5 off the couch's -x end
			[71.85, 16.0] // 6 turn, east of the inner wall's end
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 6],
			[6, 3],
			[3, 4],
			[4, 5]
		]
	},
	// door to the open floor; the machine at (58.2, 24.3) and the exam table stay clear
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
