/* The E prompt (sim-hub menu, task 1b), in place of the old one under the crosshair. interact.ts picks
   its target every third frame (the nearest interactable or door, measured from REACH_Y, never
   through a wall); this module places it beside the target every frame, so it follows a person who
   moves:
     - a person: beside the head, at the top of their bounding box minus 0.12 m, offset right by half
       the head's on-screen width plus a gap;
     - an object: beside the top centre of its bounding box (its position, for an anchor with no mesh);
     - a door: beside the door centre at 2.0 m.
   It fades in from the target's reach + 3 m and grows to full size at the reach (prompt-math.ts). */
import * as THREE from 'three';
import { camera } from './scene';
import { S } from './state';
import { player, REACH_Y } from './main';
import { doorCenter, doorPoint } from './walk';
import { getPromptTarget, type PromptTarget } from './interact';
import { onPauseChange } from './pause';
import { promptVisual, smoothOpacity } from './prompt-math';

const HEAD_HALF_WIDTH = 0.12,
	HEAD_TOP_DROP = 0.12,
	DOOR_PROMPT_Y = 2.0,
	GAP_PX = 10;
const el = document.getElementById('ePrompt'),
	titleEl = document.getElementById('ePromptTitle'),
	subEl = document.getElementById('ePromptSub');
const box = new THREE.Box3(),
	at = new THREE.Vector3(),
	onScreen = new THREE.Vector3(),
	beside = new THREE.Vector3(),
	right = new THREE.Vector3(),
	from = new THREE.Vector3(),
	wp = new THREE.Vector3();
let shown = 0,
	shownScale = 0.6,
	showing = false,
	last: PromptTarget | null = null,
	lastText = '';

function hide(): void {
	shown = 0;
	last = null;
	if (!el || !showing) return;
	showing = false;
	el.style.opacity = '0';
	el.classList.remove('show');
}
// a room card or the settings cover the view: the prompt goes at once
onPauseChange((paused) => {
	if (paused) hide();
});

function anchorOf(t: PromptTarget, out: THREE.Vector3): THREE.Vector3 {
	if (t.kind === 'door') return out.copy(doorCenter(t.room, DOOR_PROMPT_Y));
	box.setFromObject(t.object);
	if (box.isEmpty()) return t.object.getWorldPosition(out);
	if (t.person) {
		t.object.getWorldPosition(out);
		out.y = box.max.y - HEAD_TOP_DROP;
		return out;
	}
	return out.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
}

/** The distance E measures (interact.ts), redone every frame so the fade follows the walk. */
function reachDistance(t: PromptTarget): number {
	from.set(player.pos.x, REACH_Y, player.pos.z);
	return from.distanceTo(t.kind === 'door' ? doorPoint(t.room) : t.object.getWorldPosition(wp));
}

/** Every frame the game runs (main.ts stepSimulation), after the camera has moved. */
export function updatePrompt(dt: number): void {
	if (!el) return;
	if (S.mode !== 'walk' || S.travel) {
		hide();
		return;
	}
	const picked = getPromptTarget();
	let target = 0;
	if (picked) {
		const v = promptVisual(reachDistance(picked), picked.reach);
		target = v.opacity;
		shownScale = v.scale;
		const text = picked.title + '\n' + picked.sub;
		if (text !== lastText) {
			lastText = text;
			if (titleEl) titleEl.textContent = picked.title;
			if (subEl) {
				subEl.textContent = picked.sub;
				subEl.hidden = !picked.sub;
			}
		}
		last = picked;
	}
	shown = smoothOpacity(shown, target, dt);
	const t = picked ?? last; // with no target left, the prompt fades out where it was
	if (!t || shown <= 0 || (t.kind === 'thing' && t.object.visible === false)) {
		hide();
		return;
	}
	camera.updateMatrixWorld();
	anchorOf(t, at);
	onScreen.copy(at).project(camera);
	if (onScreen.z > 1 || Math.abs(onScreen.x) > 1.2 || Math.abs(onScreen.y) > 1.2) {
		el.style.opacity = '0'; // behind the camera or off screen this frame
		return;
	}
	let gap = GAP_PX;
	if (t.kind === 'thing' && t.person) {
		right.setFromMatrixColumn(camera.matrixWorld, 0);
		beside.copy(at).addScaledVector(right, HEAD_HALF_WIDTH).project(camera);
		gap += (Math.abs(beside.x - onScreen.x) / 2) * innerWidth;
	}
	const x = ((onScreen.x + 1) / 2) * innerWidth + gap,
		y = ((1 - onScreen.y) / 2) * innerHeight;
	el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%) scale(${shownScale.toFixed(3)})`;
	el.style.opacity = shown.toFixed(3);
	if (!showing) {
		showing = true;
		el.classList.add('show');
	}
}
