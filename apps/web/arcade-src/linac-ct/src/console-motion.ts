/* The LINAC console's held machine keys (docs/specs/2026-11-18-consoles-in-center-design.md part 3):
   in console mode the gantry, collimator and couch keys repeat while held, and the Move to field
   key drives the machine toward the selected field at a steady, visible speed so the center's
   Vault 1 follows it smoothly. This module holds the rules: which keys repeat and how fast, the
   move speeds, and one frame of the move (each axis the shortest way round, no further than its
   speed allows). console-keys.ts applies them to the page. Free of scene and DOM imports so it is
   unit tested in Node (console-motion.spec.ts). */

/** The Machine / Imaging keys (data-console-target) that repeat while held. */
export const REPEATING_KEYS: ReadonlySet<string> = new Set([
	'consoleGantryMinus',
	'consoleGantryPlus',
	'consoleCollMinus',
	'consoleCollPlus',
	'consoleVrtMinus',
	'consoleVrtPlus',
	'consoleLngMinus',
	'consoleLngPlus',
	'consoleLatMinus',
	'consoleLatPlus',
	'consoleTableMinus',
	'consoleTablePlus'
]);
/** A held key steps once on press, waits this long, then steps every REPEAT_EVERY_MS. */
export const REPEAT_DELAY_MS = 300;
export const REPEAT_EVERY_MS = 100;

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
