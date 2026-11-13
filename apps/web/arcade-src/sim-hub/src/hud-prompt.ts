/* The E prompt (sim-hub menu, task 1b), in place of the old one under the crosshair. interact.ts picks
   its target every third frame (the nearest interactable or door, measured from REACH_Y, never
   through a wall); this module places it beside the target every frame, so it follows a person who
   moves:
     - a person: beside the head, at the top of their bounding box minus 0.12 m, offset right by half
       the head's on-screen width plus a gap;
     - an object: beside the top centre of its bounding box (its position, for an anchor with no mesh);
     - a door: beside the door centre at 2.0 m.
   It shows only for what E acts on right now, at full size, and fades in and out (prompt-math.ts). */
import * as THREE from 'three';
import { camera } from './scene';
import { S } from './state';
import { doorCenter } from './walk';
import { getPromptTarget, type PromptTarget } from './interact';
import { onPauseChange } from './pause';
import { promptSide, smoothOpacity } from './prompt-math';

const HEAD_HALF_WIDTH = 0.12,
	HEAD_TOP_DROP = 0.12,
	DOOR_PROMPT_Y = 2.0,
	GAP_PX = 10,
	EDGE_MARGIN_PX = 8;
const el = document.getElementById('ePrompt'),
	titleEl = document.getElementById('ePromptTitle'),
	subEl = document.getElementById('ePromptSub');
const box = new THREE.Box3(),
	at = new THREE.Vector3(),
	onScreen = new THREE.Vector3(),
	beside = new THREE.Vector3(),
	right = new THREE.Vector3();
let shown = 0,
	showing = false,
	last: PromptTarget | null = null,
	lastText = '',
	width = 0; // the prompt's unscaled width, measured when its text changes

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
		target = 1;
		const text = picked.title + '\n' + picked.sub;
		if (text !== lastText) {
			lastText = text;
			if (titleEl) titleEl.textContent = picked.title;
			if (subEl) {
				subEl.textContent = picked.sub;
				subEl.hidden = !picked.sub;
			}
			width = el.offsetWidth;
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
	if (onScreen.z > 1) {
		el.style.opacity = '0'; // behind the camera this frame
		return;
	}
	let gap = GAP_PX;
	if (t.kind === 'thing' && t.person) {
		// half the head's on-screen width; the same on either side of the head
		right.setFromMatrixColumn(camera.matrixWorld, 0);
		beside.copy(at).addScaledVector(right, HEAD_HALF_WIDTH).project(camera);
		gap += (Math.abs(beside.x - onScreen.x) / 2) * innerWidth;
	}
	// beside the target, to its right; on its left when the prompt would run off the right edge. It
	// grows away from the edge that stays next to the target.
	const place = promptSide(
			((onScreen.x + 1) / 2) * innerWidth,
			gap,
			width,
			1,
			innerWidth,
			EDGE_MARGIN_PX
		),
		x = place.side === 'right' ? place.edge : place.edge - width,
		// E offers whoever is in front, even off to the side of the view: the prompt stays at the edge
		y = Math.min(
			innerHeight - EDGE_MARGIN_PX,
			Math.max(EDGE_MARGIN_PX, ((1 - onScreen.y) / 2) * innerHeight)
		);
	el.style.transformOrigin = place.side === 'right' ? '0 50%' : '100% 50%';
	el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%)`;
	el.style.opacity = shown.toFixed(3);
	if (!showing) {
		showing = true;
		el.classList.add('show');
	}
}
