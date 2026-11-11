/* The game's pause switch (sim-hub menu, Step 0). The game is paused while any reason is on: the Esc
   settings, a room card, a tutorial card ('menu' is kept for a paused title screen; the title menu
   itself keeps the clinic moving behind it). main.ts's frame loop then skips stepSimulation, and with
   it updateWalk, so nobody moves and no simulation clock runs, but it still draws the frame. The NPC
   check calls stepSimulation directly and never sees a pause. Free of scene and DOM imports so it is
   unit tested in Node (pause.spec.ts). */
export type PauseReason = 'menu' | 'settings' | 'roomCard' | 'tutorial';

const reasons = new Set<PauseReason>();
const listeners: ((paused: boolean) => void)[] = [];

/** Switches one reason on or off; listeners hear only when the game as a whole pauses or resumes. */
export function setPaused(reason: PauseReason, on: boolean): void {
	const was = reasons.size > 0;
	if (on) reasons.add(reason);
	else reasons.delete(reason);
	const now = reasons.size > 0;
	if (now !== was) for (const cb of [...listeners]) cb(now);
}

export function isPaused(): boolean {
	return reasons.size > 0;
}

/** Calls `cb(true)` when the game pauses and `cb(false)` when it resumes; returns the unsubscribe. */
export function onPauseChange(cb: (paused: boolean) => void): () => void {
	listeners.push(cb);
	return () => {
		const i = listeners.indexOf(cb);
		if (i >= 0) listeners.splice(i, 1);
	};
}
