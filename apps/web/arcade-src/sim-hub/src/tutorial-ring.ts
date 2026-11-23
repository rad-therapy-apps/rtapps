/* The sim-hub tutorial's floor ring (docs/specs/2026-11-23-tutorial-walkthrough-design.md, "The
   floor ring"): one flat teal ring lying on the floor under the Tutorial's next target, beside
   the orange marker. tutorial.ts moves it every frame (placeRing) and hides it outside an active
   step (hideRing); the tutorial check reads where it is (ringShown). The mesh is made on the first
   placeRing, never at import: a three.js Object3D draws Math.random for its uuid, and the NPC
   check seeds that, so nothing outside the Tutorial may make one. */
import * as THREE from 'three';
import { scene } from './scene';

/* the floor slabs' tops are at 0.065 m (rooms) and 0.075 m (the hub lobby): just above them */
const FLOOR_Y = 0.09,
	PULSE_S = 1.4,
	OPACITY_LOW = 0.45,
	OPACITY_HIGH = 0.9,
	OPACITY_STEADY = 0.8;

let ring: THREE.Mesh | null = null;

/** Steady, not pulsing, when the player asks for reduced motion (guarded: the Node stubs have no
    matchMedia). */
function reducedMotion(): boolean {
	return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Puts the ring on the floor at world [x, z] (t is seconds, for the pulse); null hides it. */
export function placeRing(p: [number, number] | null, t: number): void {
	if (!p) {
		hideRing();
		return;
	}
	if (!ring) {
		const g = new THREE.RingGeometry(0.42, 0.58, 48);
		g.rotateX(-Math.PI / 2); // lie flat, facing up
		ring = new THREE.Mesh(
			g,
			new THREE.MeshBasicMaterial({
				color: '#3fd0c9',
				transparent: true,
				depthWrite: false,
				side: THREE.DoubleSide
			})
		);
		scene.add(ring);
	}
	ring.position.set(p[0], FLOOR_Y, p[1]);
	ring.visible = true;
	(ring.material as THREE.MeshBasicMaterial).opacity = reducedMotion()
		? OPACITY_STEADY
		: OPACITY_LOW +
			(OPACITY_HIGH - OPACITY_LOW) * (0.5 - 0.5 * Math.cos((t / PULSE_S) * Math.PI * 2));
}

export function hideRing(): void {
	if (ring) ring.visible = false;
}

/** Where the ring is, or null while hidden (the check hook). */
export function ringShown(): [number, number] | null {
	return ring?.visible ? [ring.position.x, ring.position.z] : null;
}
