/* Test hook for apps/web/scripts/sim-hub-npc-check.mjs. Present only when the page is opened with
   `?npccheck` (same precedent as `?visibilitycheck` in visibility.ts); otherwise nothing is added
   to `window` and `isHidden()` is exactly `document.hidden`. */
import * as THREE from 'three';
import { renderer, labelRenderer } from './scene';
import { ROOMS } from './rooms';
import { getColliders } from './walk';
import { movers, dutyActors, handoffTransitions, startActorHandoff } from './npc-behavior';
import { JOURNEY, journeyActors, moveJourneyActor, workflowTransitions } from './journey';

let hiddenOverride: boolean | null = null;

/** What `stepSimulation` reads for `document.hidden`; the hook can override it. */
export function isHidden(): boolean {
	return hiddenOverride ?? document.hidden;
}

export function installNpcCheckHook(
	roomCast: Record<string, { g: THREE.Object3D; kind: string }[]>,
	stepSimulation: (now: number) => void
): void {
	if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('npccheck'))
		return;
	const castActors = () => {
		const seen = new Set<THREE.Object3D>(),
			out: { x: number; z: number; id: string }[] = [],
			p = new THREE.Vector3(),
			push = (g: THREE.Object3D, id: string) => {
				if (!g || seen.has(g)) return;
				seen.add(g);
				g.getWorldPosition(p);
				out.push({ x: p.x, z: p.z, id });
			};
		for (const [room, arr] of Object.entries(roomCast))
			arr.forEach((e, i) => push(e.g, `${room}:${e.kind}:${i}`));
		dutyActors.forEach((d, i) => push(d.group, `duty:${i}`));
		return out;
	};
	Object.assign(window, {
		__NPC: {
			colliders: getColliders(),
			movers,
			castActors,
			stepSimulation,
			setHidden: (v: boolean | null) => {
				hiddenOverride = v;
			},
			moveJourneyActor,
			startActorHandoff,
			workflowTransitions: workflowTransitions as readonly unknown[],
			handoffTransitions: handoffTransitions as readonly unknown[],
			journeyActors: () => {
				journeyActors();
				return [
					...new Set(Object.values(JOURNEY).filter((v) => v && (v as THREE.Object3D).isObject3D))
				] as THREE.Object3D[];
			},
			/** The check drives the simulation headlessly; drawing is not needed and the stub GL cannot draw. */
			disableRendering: () => {
				renderer.render = () => {};
				labelRenderer.render = () => {};
			},
			JOURNEY,
			ROOMS,
			ROOM_CAST: roomCast
		}
	});
}
