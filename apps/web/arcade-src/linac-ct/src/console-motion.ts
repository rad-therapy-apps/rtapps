/* The LINAC console's held machine keys (docs/specs/2026-11-18-consoles-in-center-design.md part 3):
   in console mode the gantry, collimator and couch keys repeat while held, and the Move to field
   key drives the machine toward the selected field at a steady, visible speed so the center's
   Vault 1 follows it smoothly. A move released part way leaves values between the keys' steps,
   so a key whose step would pass the field's planned value lands on it instead. This module holds
   the rules: which keys repeat, what each steps and how fast, the move speeds, one frame of the
   move (each axis the shortest way round, no further than its speed allows) and the landing.
   console-keys.ts applies them to the page. Free of scene and DOM imports so it is unit tested in
   Node (console-motion.spec.ts). */

/** The axes Move to field drives: angles in degrees, couch translations in mm (fundamentalState). */
export interface FieldAxes {
	gantry: number;
	collimator: number;
	couchAngle: number;
	vrt: number;
	lng: number;
	lat: number;
}
type Axis = keyof FieldAxes;
const ANGLES: Axis[] = ['gantry', 'collimator', 'couchAngle'];
const TRANSLATIONS: Axis[] = ['vrt', 'lng', 'lat'];

/** The Machine / Imaging keys (data-console-target) that repeat while held, with the axis and the
    signed step each press moves through the app's own key (main.ts): 5° or 1 mm. */
export const KEY_STEPS: Readonly<Record<string, [Axis, number]>> = {
	consoleGantryMinus: ['gantry', -5],
	consoleGantryPlus: ['gantry', 5],
	consoleCollMinus: ['collimator', -5],
	consoleCollPlus: ['collimator', 5],
	consoleTableMinus: ['couchAngle', -5],
	consoleTablePlus: ['couchAngle', 5],
	consoleVrtMinus: ['vrt', -1],
	consoleVrtPlus: ['vrt', 1],
	consoleLngMinus: ['lng', -1],
	consoleLngPlus: ['lng', 1],
	consoleLatMinus: ['lat', -1],
	consoleLatPlus: ['lat', 1]
};
export const REPEATING_KEYS: ReadonlySet<string> = new Set(Object.keys(KEY_STEPS));
/** A held key steps once on press, waits this long, then steps every REPEAT_EVERY_MS. */
export const REPEAT_DELAY_MS = 300;
export const REPEAT_EVERY_MS = 100;

/** Move to field speeds: degrees a second for the angles, mm a second for the couch. */
export const MOVE_SPEED: Record<Axis, number> = {
	gantry: 30,
	collimator: 30,
	couchAngle: 30,
	vrt: 50,
	lng: 50,
	lat: 50
};
/** The longest frame a move takes in one step, so a stalled tab does not jump the machine. */
const MAX_FRAME_S = 0.1;

const wrap360 = (v: number) => ((v % 360) + 360) % 360;

/** The signed turn from one angle to another the shortest way round, in -180..180. */
export function shortestTurn(from: number, to: number): number {
	const d = wrap360(to - from);
	return d > 180 ? d - 360 : d;
}

/** One frame of Move to field: each axis moves toward `target` by at most its speed × `dt`
    seconds (angles the shortest way round, ending in 0..360). `arrived` once every axis is there;
    an axis that would reach its target this frame lands on it exactly. */
export function moveToFieldStep(
	current: FieldAxes,
	target: FieldAxes,
	dt: number
): { next: FieldAxes; arrived: boolean } {
	const s = Math.max(0, Math.min(MAX_FRAME_S, dt));
	const next = { ...current };
	let arrived = true;
	for (const k of [...ANGLES, ...TRANSLATIONS]) {
		const angle = ANGLES.includes(k);
		const left = angle ? shortestTurn(current[k], target[k]) : target[k] - current[k];
		const reach = MOVE_SPEED[k] * s;
		if (Math.abs(left) <= reach) next[k] = angle ? wrap360(target[k]) : target[k];
		else {
			next[k] = current[k] + Math.sign(left) * reach;
			if (angle) next[k] = wrap360(next[k]);
			arrived = false;
		}
	}
	return { next, arrived };
}

/** Where a key press on `axis` ends when its `step` would pass `target` (the field's planned
    value): on the target itself, the shortest way round for an angle. Null when the press is the
    key's own step: moving away from the target, short of it, landing on it exactly anyway, or
    with no target. From any value, pressing toward the plan therefore reaches it exactly. */
export function keyLanding(
	axis: Axis,
	current: number,
	step: number,
	target: number | null
): number | null {
	if (target == null || !Number.isFinite(target) || !Number.isFinite(current)) return null;
	const angle = ANGLES.includes(axis),
		left = angle ? shortestTurn(current, target) : target - current;
	if (left === 0 || Math.sign(left) !== Math.sign(step) || Math.abs(left) >= Math.abs(step))
		return null;
	return angle ? wrap360(target) : target;
}
