/* Room-content grouping for portal culling (see docs/specs/2026-09-29-sim-hub-room-culling-design.md).
   One post-build pass reparents every scene child that lies wholly inside a single room's interior
   into that room's THREE.Group. The groups sit at the identity transform, so `attach` leaves every
   world (and local) transform unchanged and the pass is visually a no-op until culling is applied.
   Shells (walls, door and window frames, glass), corridors, exterior props and anything straddling
   a room boundary stay at scene level and are never culled. */
import * as THREE from 'three';
import { scene } from './scene';
import { ROOMS } from './rooms';
import { ROOM_CAST } from './main';
import { movers, interactionScenes } from './npc-behavior';
import { JOURNEY } from './journey';

export const ROOM_CONTENT = new Map<string, THREE.Group>();

/* Room rect is centre-based (x,z centre; w,d full extents). Shrunk by 0.05 m, which is less than
   the thinnest wall's half-thickness (0.08), so wall slabs, which straddle the room edge, are never
   contents, while floors (built 0.075 m inside the edge) and baseboards still are. */
const INTERIOR_INSET = 0.05;

export function groupRoomContents() {
	const protectedActors = new Set<THREE.Object3D>();
	for (const m of movers) protectedActors.add(m.group);
	for (const v of Object.values(JOURNEY))
		if (v && (v as THREE.Object3D).isObject3D) protectedActors.add(v as THREE.Object3D);
	// Any cast actor can be picked for an actor handoff later, so none of them is reparented.
	for (const arr of Object.values(ROOM_CAST)) for (const c of arr) protectedActors.add(c.g);
	for (const sc of interactionScenes) {
		protectedActors.add(sc.a);
		protectedActors.add(sc.b);
	}
	const rects = ROOMS.map((r) => ({
		id: r.id,
		x0: r.x - r.w / 2 + INTERIOR_INSET,
		x1: r.x + r.w / 2 - INTERIOR_INSET,
		z0: r.z - r.d / 2 + INTERIOR_INSET,
		z1: r.z + r.d / 2 - INTERIOR_INSET
	}));
	for (const r of ROOMS) {
		const g = new THREE.Group();
		g.name = `room-content:${r.id}`;
		ROOM_CONTENT.set(r.id, g);
		scene.add(g);
	}
	scene.updateMatrixWorld(true);
	const groups = new Set<THREE.Object3D>(ROOM_CONTENT.values());
	const box = new THREE.Box3();
	for (const child of [...scene.children]) {
		if (groups.has(child) || protectedActors.has(child) || child.userData?.inHandoff) continue;
		box.setFromObject(child);
		if (box.isEmpty()) continue;
		const hits = rects.filter(
			(q) => box.min.x >= q.x0 && box.max.x <= q.x1 && box.min.z >= q.z0 && box.max.z <= q.z1
		);
		if (hits.length === 1) ROOM_CONTENT.get(hits[0].id)!.attach(child);
	}
}
