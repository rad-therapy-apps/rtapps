/* The LINAC console's held machine keys, in console mode only (docs/specs/2026-11-18-consoles-in-
   center-design.md part 3; rules in console-motion.ts). On the chart's Machine / Imaging console:
   - the gantry, collimator and couch keys step once on press and then repeat while held, stopping
     on release, when the pointer leaves the key, when the window loses focus, or when the console
     refuses a step (a locked motion, a collision: the mistake is posted as for any press); a key
     pressed from the keyboard steps once, as before. A step that would pass the selected field's
     planned value lands on it, so a machine left between steps by a part-way Move to field still
     reaches the plan exactly (the plan checks are not loosened);
   - a Move to field key drives the gantry, collimator and couch toward the selected field while it
     is held, the shortest way round, through the same motion-enable and collision checks as the
     other keys. The machine values change every frame, so the console's pose stream (console-
     mode.ts) and the center's Vault 1 follow it smoothly. The key says what it is doing: "Moving…
     keep holding" while it moves the machine, "At field" once the machine is at the selected
     field, else "Hold to move to field"; let go before the machine gets there, the console's bar
     says to keep holding (a notice, not a refused action).
   Installed by console-mode.ts once the chart shell is built; console-mode.ts also lets go of the
   keys when the center's panel hides the console (releaseConsoleKeys) and keeps the key's label in
   step with the machine and the selected field (syncMoveKey). */
import { S } from './state';
import { consoleMistakeCount, consoleNotice } from './console-hooks';
import {
	atFieldTarget,
	KEEP_HOLDING_NOTICE,
	KEY_STEPS,
	keyLanding,
	moveKeyLabel,
	moveToFieldStep,
	REPEAT_DELAY_MS,
	REPEAT_EVERY_MS,
	REPEATING_KEYS,
	shortestTurn,
	type FieldAxes
} from './console-motion';
import {
	getCurrentPlannedParameters,
	getIGRTExpectedAbsoluteCouch,
	getPlannedCouchState,
	normalizeAngleValue,
	treatmentParamMatches
} from './delivery/plan';
import { renderTreatmentDeliveryPanel } from './delivery/treatment-delivery';
import { srsRequired } from './delivery/stereotactic';
import { GROUND_Y, updateCouchAccordion } from './scene';
import {
	attemptCollisionSafeMotion,
	fundamentalState,
	imgCouch,
	MOVEMENT_STEP,
	requirePendantMotion,
	syncFundamentalReadouts
} from './linac-safety';

const COUCH_MIN_Y = 0.7 / 2 + GROUND_Y; // the couch-down key's floor (main.ts)
const READOUT_EVERY_MS = 150;

/* ----- the machine and the selected field ----- */
function machineAxes(): FieldAxes {
	const f = fundamentalState;
	return {
		gantry: f.gantry,
		collimator: f.collimator,
		couchAngle: f.couchAngle || 0,
		vrt: f.vrt,
		lng: f.lng,
		lat: f.lat
	};
}

/** The selected field's planned values, with the couch the geometry check expects: the
    image-guided position once images are acquired, else the plan's. Axes the plan leaves open
    keep the machine's value. */
function plannedAxes(): FieldAxes {
	const p = getCurrentPlannedParameters(),
		now = machineAxes(),
		couch = getIGRTExpectedAbsoluteCouch() ?? getPlannedCouchState() ?? now;
	const angle = (v: unknown, fallback: number) => normalizeAngleValue(v) ?? fallback;
	return {
		gantry: angle(p.gantry, now.gantry),
		collimator: angle(p.collimator, now.collimator),
		couchAngle: angle(p.couchAngle, now.couchAngle),
		vrt: couch.vrt,
		lng: couch.lng,
		lat: couch.lat
	};
}

/** Move to field's target: the planned values, except that a couch the geometry check already
    accepts stays where it is, so moving to a field never undoes a verified match. */
function fieldTarget(): FieldAxes {
	const p = getCurrentPlannedParameters(),
		now = machineAxes(),
		planned = plannedAxes();
	const couchOK = treatmentParamMatches(
		'couch',
		p.couch,
		`${now.vrt} / ${now.lng} / ${now.lat} mm`
	);
	return couchOK ? { ...planned, vrt: now.vrt, lng: now.lng, lat: now.lat } : planned;
}

/** Couch motion image guidance has not heard yet: imgCouch redraws its images, so a moving couch
    reports at once when it starts and then with the readouts, a few times a second. */
const unheard = { vrt: 0, lng: 0, lat: 0 };
function tellImageGuidance() {
	for (const k of ['vrt', 'lng', 'lat'] as const)
		if (unheard[k]) {
			imgCouch(k, unheard[k]);
			unheard[k] = 0;
		}
}

/** Puts the machine at `next` through the app's collision check (`label` names the motion in
    its interlock message); false when it refuses. */
function moveMachine(next: FieldAxes, label: string): boolean {
	const now = machineAxes(),
		turn = shortestTurn(now.gantry, next.gantry),
		d = { vrt: next.vrt - now.vrt, lng: next.lng - now.lng, lat: next.lat - now.lat };
	const ok = attemptCollisionSafeMotion(label, () => {
		// the same scene moves as the gantry, couch and table keys (main.ts), by any amount
		if (S.gantryRotatingGroup) S.gantryRotatingGroup.rotation.z -= (turn * Math.PI) / 180;
		if (S.couchTreatmentPivot) S.couchTreatmentPivot.rotation.y = (next.couchAngle * Math.PI) / 180;
		if (S.couchGroup) {
			S.couchGroup.position.y = Math.max(
				COUCH_MIN_Y,
				S.couchGroup.position.y + d.vrt * MOVEMENT_STEP
			);
			S.couchGroup.position.x -= d.lat * MOVEMENT_STEP;
			updateCouchAccordion();
		}
		if (S.couchTopGroup) S.couchTopGroup.position.z -= d.lng * MOVEMENT_STEP;
	});
	if (!ok) return false;
	if (S.linacHeadObject) S.linacHeadObject.rotation.y = (next.collimator * Math.PI) / 180;
	if (next.couchAngle !== now.couchAngle && srsRequired()) {
		const idx = Number(S.treatmentDelivery.activeFieldIndex) || 0;
		S.srsWorkflow.timeoutVerifiedByField[idx] = false;
		S.srsWorkflow.dryRunByField[idx] = false;
	}
	Object.assign(fundamentalState, next);
	// image guidance hears every couch move, as from the couch keys (tellImageGuidance)
	for (const k of ['vrt', 'lng', 'lat'] as const) unheard[k] += d[k];
	return true;
}

/* ----- held keys ----- */
/** The app's motion names (main.ts) for each axis, as its interlock messages and display use. */
const AXIS_LABELS: Record<keyof FieldAxes, string> = {
	gantry: 'GANTRY',
	collimator: 'COLLIMATOR',
	couchAngle: 'TREATMENT COUCH',
	vrt: 'COUCH VERTICAL',
	lng: 'COUCH LONGITUDINAL',
	lat: 'COUCH LATERAL'
};
let held: HTMLElement | null = null;
let holdTimer = 0;
let pointerPressed: Element | null = null;

/** One step of a key: the app's own key (its click), or the landing on the planned value when
    that step would pass it. False when the console refused it. */
function stepKey(key: HTMLElement): boolean {
	const before = consoleMistakeCount(),
		[axis, step] = KEY_STEPS[key.dataset.consoleTarget],
		land = keyLanding(axis, machineAxes()[axis], step, plannedAxes()[axis]);
	if (land === null) document.getElementById(key.dataset.consoleTarget)?.click();
	else if (requirePendantMotion(AXIS_LABELS[axis])) {
		const next = { ...machineAxes(), [axis]: land };
		if (moveMachine(next, AXIS_LABELS[axis])) {
			tellImageGuidance();
			const unit = axis === 'vrt' || axis === 'lng' || axis === 'lat' ? ' mm' : '°';
			syncFundamentalReadouts(AXIS_LABELS[axis], `${land}${unit}`);
			renderTreatmentDeliveryPanel();
		}
	}
	return consoleMistakeCount() === before;
}

function stopHold() {
	held = null;
	clearTimeout(holdTimer);
}

function onKeyDown(ev: PointerEvent) {
	if (ev.button !== 0) return;
	const key = (ev.target as Element).closest<HTMLButtonElement>('[data-console-target]');
	if (!key || key.disabled || !REPEATING_KEYS.has(key.dataset.consoleTarget)) return;
	stopHold();
	// the click that ends this press is already this step
	pointerPressed = key;
	if (!stepKey(key)) return;
	held = key;
	key.addEventListener('pointerleave', stopHold, { once: true });
	const again = () => {
		if (held !== key) return;
		if (!stepKey(key)) return stopHold();
		holdTimer = window.setTimeout(again, REPEAT_EVERY_MS);
	};
	holdTimer = window.setTimeout(again, REPEAT_DELAY_MS);
}

/** Every click on a held-key goes through stepKey rather than the chart's own handler: the one
    that ends a pointer press is swallowed (its step happened on press), and one from the keyboard
    (detail 0) is a single step. */
function onClick(ev: MouseEvent) {
	const key = (ev.target as Element | null)?.closest?.<HTMLElement>('[data-console-target]');
	if (!key || !REPEATING_KEYS.has(key.dataset.consoleTarget)) return;
	ev.stopPropagation();
	ev.preventDefault();
	if (key === pointerPressed && ev.detail > 0) pointerPressed = null;
	else stepKey(key);
}

/* ----- Move to field ----- */
let moveKey: HTMLButtonElement | null = null;
let moving = false;
let moveTarget: FieldAxes | null = null;
let frameId = 0;
let lastFrame = 0;
let lastReadout = 0;
let heardThisMove = false;

/** Ends a move: arrived, refused, or let go (`letGo`: by the learner, before the machine got
    there, which brings up the notice to keep holding). */
function stopMove(lcd: string, letGo = false) {
	if (!moving) return;
	moving = false;
	cancelAnimationFrame(frameId);
	moveKey?.classList.remove('active');
	tellImageGuidance();
	syncFundamentalReadouts('MOVE TO FIELD', lcd);
	renderTreatmentDeliveryPanel();
	syncMoveKey();
	if (letGo) consoleNotice(KEEP_HOLDING_NOTICE);
}

/** The Move to field key's label (and its at-field look) for the machine and the selected field
    now; console-mode.ts calls it on each state tick. */
export function syncMoveKey() {
	if (!moveKey) return;
	const at = !moving && !!S.activeTreatmentCase && atFieldTarget(machineAxes(), fieldTarget()),
		label = moveKeyLabel(moving, at);
	if (moveKey.textContent !== label) moveKey.textContent = label;
	moveKey.classList.toggle('at-field', at);
}

function moveFrame(now: number) {
	if (!moving) return;
	if (!S.pendantMotionArmed && !S.consoleMotionArmed)
		return stopMove('LOCKED · enable motion first');
	const { next, arrived } = moveToFieldStep(machineAxes(), moveTarget, (now - lastFrame) / 1000);
	lastFrame = now;
	if (!moveMachine(next, 'MOVE TO FIELD')) return stopMove('COLLISION INTERLOCK');
	if (arrived) return stopMove('AT FIELD');
	if (!heardThisMove && (unheard.vrt || unheard.lng || unheard.lat)) {
		heardThisMove = true;
		tellImageGuidance();
	}
	if (now - lastReadout > READOUT_EVERY_MS) {
		lastReadout = now;
		tellImageGuidance();
		syncFundamentalReadouts();
		renderTreatmentDeliveryPanel();
	}
	frameId = requestAnimationFrame(moveFrame);
}

function startMove() {
	if (moving || !requirePendantMotion('MOVE TO FIELD')) return;
	moving = true;
	heardThisMove = false;
	moveTarget = fieldTarget();
	moveKey?.classList.add('active');
	syncMoveKey();
	lastFrame = lastReadout = performance.now();
	frameId = requestAnimationFrame(moveFrame);
}

/** Lets go of a held key and stops Move to field (the panel hid the console, the window lost
    focus). */
export function releaseConsoleKeys() {
	stopHold();
	stopMove('STOPPED');
}

/** The learner let go (a pointer release): as releaseConsoleKeys, and a Move to field let go
    before the machine got there says to keep holding. */
function letGoOfKeys() {
	stopHold();
	stopMove('STOPPED', true);
}

/** Adds the Move to field key under the Beam Geometry keys and wires the held keys. */
export function installConsoleKeys() {
	const panel = document.getElementById('rtv2MachinePanel');
	const geometry = panel?.querySelectorAll('.rtv2-control-group')[1];
	if (!panel || !geometry) return;
	const title = document.createElement('h4');
	title.className = 'console-move-title';
	title.textContent = 'Selected field';
	moveKey = document.createElement('button');
	moveKey.type = 'button';
	moveKey.id = 'consoleMoveToField';
	moveKey.textContent = moveKeyLabel(false, false);
	moveKey.title =
		'Hold to turn the gantry and collimator and move the couch to the selected field. Motion Enable first.';
	geometry.append(title, moveKey);
	moveKey.addEventListener('pointerdown', (ev) => {
		if (ev.button === 0) startMove();
	});
	moveKey.addEventListener('pointerleave', () => stopMove('STOPPED', true));
	moveKey.addEventListener('keydown', (ev) => {
		if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) {
			ev.preventDefault();
			startMove();
		}
	});
	moveKey.addEventListener('keyup', (ev) => {
		if (ev.key === ' ' || ev.key === 'Enter') stopMove('STOPPED', true);
	});
	panel.addEventListener('pointerdown', onKeyDown);
	document.addEventListener('click', onClick, true);
	for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, letGoOfKeys);
	window.addEventListener('blur', releaseConsoleKeys);
}
