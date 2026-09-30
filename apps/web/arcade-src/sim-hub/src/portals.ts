/* Portal data and the pure visibility computation for room culling (see
   docs/specs/2026-09-29-sim-hub-room-culling-design.md). Kept free of scene/DOM imports so it is unit
   tested in Node; visibility.ts binds it to the real ROOMS table.
   Room rects are centre-based (x,z centre; w,d full extents). A portal is a world-space Box3 on a
   wall plane, as thick as that wall, covering the real opening. The numbers mirror buildSide()
   (door gap 2.6 m, 4.8 m for vaults, 2.65 m high; window 4.5 m wide, 1.0-2.82 m high) and, for
   the hub lobby, its lobbyWallWithGap() gaps (lintel at 2.75 m, wall 0.18 m thick). Vault doors
   sit on the vault's own xmin wall; the maze hall behind them is inside the vault rect. */
import * as THREE from 'three';
import type { Room } from './rooms';

type Side = 'zmin' | 'zmax' | 'xmin' | 'xmax';

/* Id in the visible set standing for the outside cell (hallways, lobby circulation, exterior). */
export const OUTSIDE = '__outside__';

const DOOR_H = 2.65;
const WIN_W = 4.5;
const WIN_Y0 = 1.0;
const WIN_Y1 = 2.82;
const LOBBY_GAPS: Record<Side, number> = { xmin: 7.2, xmax: 8.0, zmin: 7.0, zmax: 5.2 };
const LOBBY_H = 2.75;
const LOBBY_T = 0.18;
const SIDES: Side[] = ['zmin', 'zmax', 'xmin', 'xmax'];

export function roomAt(rooms: readonly Room[], x: number, z: number): Room | null {
	for (const r of rooms) if (Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2) return r;
	return null;
}

function portalBox(r: Room, side: Side, width: number, y0: number, y1: number, t: number) {
	const zWall = side === 'zmin' || side === 'zmax';
	const c = zWall
		? new THREE.Vector3(r.x, 0, r.z + (side === 'zmin' ? -r.d / 2 : r.d / 2))
		: new THREE.Vector3(r.x + (side === 'xmin' ? -r.w / 2 : r.w / 2), 0, r.z);
	const sx = zWall ? width : t,
		sz = zWall ? t : width;
	return new THREE.Box3(
		new THREE.Vector3(c.x - sx / 2, y0, c.z - sz / 2),
		new THREE.Vector3(c.x + sx / 2, y1, c.z + sz / 2)
	);
}

export function buildPortals(rooms: readonly Room[]): Map<string, THREE.Box3[]> {
	const out = new Map<string, THREE.Box3[]>();
	for (const r of rooms) {
		const list: THREE.Box3[] = [];
		if (r.hub) {
			for (const s of SIDES) list.push(portalBox(r, s, LOBBY_GAPS[s], 0, LOBBY_H, LOBBY_T));
		} else {
			const t = r.vault ? 0.58 : 0.16;
			if (r.doorSide) list.push(portalBox(r, r.doorSide, r.vault ? 4.8 : 2.6, 0, DOOR_H, t));
			if (r.windowSide) list.push(portalBox(r, r.windowSide, WIN_W, WIN_Y0, WIN_Y1, t));
		}
		out.set(r.id, list);
	}
	return out;
}

const frustum = new THREE.Frustum();
const projView = new THREE.Matrix4();
const camPos = new THREE.Vector3();

/* A camera standing in (or within this distance of) a doorway sees past a portal thinner than its
   near plane, which the frustum test would miss, so proximity counts as in view. */
const NEAR_MARGIN = 0.5;

function anyInView(boxes: readonly THREE.Box3[] | undefined) {
	if (!boxes) return false;
	for (const b of boxes)
		if (frustum.intersectsBox(b) || b.distanceToPoint(camPos) <= NEAR_MARGIN) return true;
	return false;
}

/* Fills `out` (cleared first) with the ids of visible rooms, plus OUTSIDE when the outside cell is
   visible. The camera's matrixWorldInverse must be current (renderer.render / updateMatrixWorld).
   Allocation-free per call: only module-level scratch objects and the caller's Set are used. */
export function computeVisible(
	camera: THREE.Camera,
	rooms: readonly Room[],
	portals: ReadonlyMap<string, THREE.Box3[]>,
	out: Set<string>
) {
	out.clear();
	projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
	frustum.setFromProjectionMatrix(projView);
	camPos.setFromMatrixPosition(camera.matrixWorld);
	const cur = roomAt(rooms, camPos.x, camPos.z);
	let outside = true;
	if (cur) {
		out.add(cur.id);
		outside = anyInView(portals.get(cur.id));
	}
	if (outside) {
		out.add(OUTSIDE);
		for (const r of rooms) if (r !== cur && anyInView(portals.get(r.id))) out.add(r.id);
	}
	return out;
}
