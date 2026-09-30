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
import { S } from './state';
import { OUTSIDE, buildPortals, computeVisible, roomAt as roomAtIn } from './portals';

export const ROOM_CONTENT = new Map<string, THREE.Group>();
const cullActors: THREE.Object3D[] = [];

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
	cullActors.push(...protectedActors);
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

/* Portal culling: the visible-room set for a camera. Contains room ids plus OUTSIDE when the outside
   cell (hallways, lobby circulation, exterior) is visible. The returned Set is reused across calls,
   so consume it before calling again. */
export { OUTSIDE };
// Built on first use: equipment.ts imports this module before rooms.ts has evaluated.
let portals: ReturnType<typeof buildPortals> | null = null;
const visible = new Set<string>();

export function roomAt(x: number, z: number) {
	return roomAtIn(ROOMS, x, z);
}

export function visibleRooms(camera: THREE.Camera) {
	return computeVisible(camera, ROOMS, (portals ??= buildPortals(ROOMS)), visible);
}

/* Actors are culled per frame by world position, not by reparenting. Game logic (journey, npc)
   owns their `visible` flag and reads it back, so culling must not touch it: a culled actor moves
   to layer 1, which no camera enables, on the actor and every descendant (three tests layers per
   object, not per subtree). Layers are rewritten only when an actor's state flips. */
const SEEN_MASK = 1;
const CULLED_MASK = 2;
let cullingEnabled = true;
const actorCulled = new Map<THREE.Object3D, boolean>();
const actorPos = new THREE.Vector3();
let layerMask = SEEN_MASK;
const setLayerMask = (o: THREE.Object3D) => {
	o.layers.mask = layerMask;
};
// Actors straddling a doorway count as seen if either side is (0.4 m probe) so nobody pops in a door.
const PROBE = 0.4;
function roomSeen(x: number, z: number, seen: Set<string>) {
	const r = roomAtIn(ROOMS, x, z);
	return seen.has(r ? r.id : OUTSIDE);
}

/* Sets group and actor visibility for the camera about to render. Overview shows everything. */
export function applyVisibility(camera: THREE.Camera) {
	const all = S.mode === 'overview' || !cullingEnabled;
	let seen = visible;
	if (!all) {
		// three refreshes matrixWorldInverse only inside render(); cull with this frame's view.
		camera.updateMatrixWorld();
		camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
		seen = visibleRooms(camera);
	}
	for (const [id, g] of ROOM_CONTENT) g.visible = all || seen.has(id);
	for (const a of cullActors) {
		let show = all;
		if (!show) {
			a.getWorldPosition(actorPos);
			const { x, z } = actorPos;
			show =
				roomSeen(x, z, seen) ||
				roomSeen(x + PROBE, z, seen) ||
				roomSeen(x - PROBE, z, seen) ||
				roomSeen(x, z + PROBE, seen) ||
				roomSeen(x, z - PROBE, seen);
		}
		if (actorCulled.get(a) === !show) continue;
		actorCulled.set(a, !show);
		layerMask = show ? SEEN_MASK : CULLED_MASK;
		a.traverse(setLayerMask);
	}
}

/* Test hook for apps/web/scripts/sim-hub-visibility-check.mjs. Present only when the page is opened
   with `?visibilitycheck`; otherwise nothing is exposed and culling cannot be switched off. */
if (
	typeof location !== 'undefined' &&
	new URLSearchParams(location.search).has('visibilitycheck')
) {
	Object.assign(window, {
		__simHubVisibility: {
			applyVisibility,
			setCulling: (on: boolean) => {
				cullingEnabled = on;
			},
			// Getter: this module can evaluate before rooms.ts (import cycle).
			get rooms() {
				return ROOMS;
			},
			WebGLRenderTarget: THREE.WebGLRenderTarget,
			MeshBasicMaterial: THREE.MeshBasicMaterial
		}
	});
}
