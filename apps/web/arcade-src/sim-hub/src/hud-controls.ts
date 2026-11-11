/* The controls bar (sim-hub menu, task 1b): "W A S D move · Mouse look · Shift run · E interact · Esc
   settings" at the bottom centre. It shows when walking starts in Free Mode or the tutorial and fades
   out (0.4 s, in CSS) once the player has moved for 1.0 s in total. It does not come back on its own;
   Settings > Help lists the controls. */
import { S } from './state';
import { player } from './main';
import { onPlayModeChange } from './play-mode';

const HIDE_AFTER_MOVING_SEC = 1.0;
const bar = document.getElementById('controlsBar');
let showing = false,
	movedSec = 0,
	lastX = NaN,
	lastZ = NaN;

export function showControlsBar(): void {
	showing = true;
	movedSec = 0;
	lastX = NaN;
	lastZ = NaN;
	bar?.classList.add('show');
}

function hideControlsBar(): void {
	showing = false;
	bar?.classList.remove('show');
}

/** Every frame the game runs (main.ts stepSimulation): counts the time the player really moves. */
export function updateControlsBar(dt: number): void {
	if (!showing || S.mode !== 'walk') return;
	const x = player.pos.x,
		z = player.pos.z;
	if (!Number.isNaN(lastX) && (x !== lastX || z !== lastZ)) movedSec += dt;
	lastX = x;
	lastZ = z;
	if (movedSec >= HIDE_AFTER_MOVING_SEC) hideControlsBar();
}

onPlayModeChange((m) => (m === 'title' ? hideControlsBar() : showControlsBar()));
