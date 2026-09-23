/* RTApps (#77 sim-hub modularization, task 2): shared mutable state.
   Every top-level `let`/`var` formerly declared in main.js lives here as a
   property of `S` instead. ES module imports are read-only bindings, so a
   `let mode` in main.js couldn't be reassigned from another module — `S.mode`
   can, since only `S`'s properties change, not the `S` binding itself.
   Modules extracted from main.js in later tasks import `S` and read/write
   `S.<name>` in its place. Initializers below are verbatim from the original
   top-level declarations. */
import type * as THREE from 'three';
import type { Room } from './rooms';
import type { Travel } from './walk';

// RTApps (#77 phase 2 task 11): typed boundary for `S`. Unions/types derived
// from every actual assignment site across the sim-hub modules (grep `S.<member> =`).
interface SimHubState {
	// Only ever initialized to null — no read or reassignment found anywhere in
	// sim-hub. Kept as `unknown` (not deleted: out of scope for a type-only pass).
	currentInteraction: unknown;
	ROOM_APP_URL: string | null;
	CONSOLE_APP_URL: string | null;
	CONSOLE_APP_DOORS: Set<string>;
	AMB: THREE.Object3D | null;
	ambUnload: THREE.Object3D | null;
	ambLoad: THREE.Object3D | null;
	mode: 'overview' | 'guided' | 'walk';
	// RTApps (#77 phase 2 task 12, type-only follow-up): rooms.ts now exports a `Room`
	// interface for the ROOMS table entries this is always assigned from — tightened
	// from `unknown` now that the shape exists.
	activeRoom: Room | null;
	history: string[];
	// RTApps (#77 phase 2 task 14): walk.ts now exports a `Travel` interface for the literal
	// this is always assigned from (built in walk.ts's beginTravel, mutated by
	// walk.ts/journey.js) — tightened from `unknown` now that the shape exists.
	travel: Travel | null;
	walkCompositionRoomId: string | null;
	activeGuideKey: string | null;
	walkDragLook: boolean;
	walkLastX: number;
	walkLastY: number;
}

export const S: SimHubState = {
	currentInteraction: null,
	ROOM_APP_URL: null,
	CONSOLE_APP_URL: null,
	CONSOLE_APP_DOORS: new Set(['Learning Commons / Staff Education']),
	AMB: null,
	ambUnload: null,
	ambLoad: null,
	mode: 'overview',
	activeRoom: null,
	history: [],
	travel: null,
	walkCompositionRoomId: null,
	activeGuideKey: null,
	walkDragLook: false,
	walkLastX: 0,
	walkLastY: 0
};
