/* What the LINAC console's delivery screen tells the learner in console mode (`?view=console`), so
   the next action is always on screen and named by a key that is there: the geometry interlock's
   detail, naming each axis off the plan with the machine's value and the planned one; the line over
   the delivery window (the hero line), the real next action for the state; and, in the Tutorial
   scenario, the field to select next. linac-safety.ts builds the geometry detail from the mismatch
   builders here (console mode only; the standalone app keeps "Review parameter mismatches"),
   console-patch.ts paints the hero line (deliveryHero) and console-mode.ts selects the Tutorial's
   next field (nextFieldIndex) and posts the geometry hold to the center, whose Tutorial names the
   fix from it. Free of scene and DOM imports so it is unit tested in Node (delivery-guide.spec.ts).

   The geometry detail: each axis off the plan as "<label> <now> → <planned>", in the checklist's
   order (gantry, collimator, jaws, MLC aperture, MLC shape, couch position, couch angle), joined by
   " · ". Numbers show to 0.1, whole numbers with no decimal and never as -0; angles wrap into
   0..360 and carry ° on both sides; the other units go once, after the planned value:
     Gantry 0° → 270° · Couch Vrt +6 → +4 mm
     Collimator 5° → 0° · Couch angle 10° → 0°
     Jaws 10 × 10 → 18 × 18 cm, or by edge when either side is asymmetric:
       Jaws X1 4 / X2 9 / Y1 9 / Y2 9 → X1 9 / X2 9 / Y1 9 / Y2 9 cm
     MLC 10 → 16 cm · MLC shape Square → Conformal
   Couch positions are signed (+4, 0, -2.5) and only the axes off the plan show, each by itself. */
import type { GeometryMismatch } from '../../shared/console-protocol';
import { basicHold, GEOMETRY_CHECK, type ReadinessCheck } from './console-messages';

/* ----- the geometry detail ----- */
/** A number to 0.1: whole numbers with no decimal, never -0. */
export function fmtNumber(n: number): string {
	const r = Math.round(n * 10) / 10 + 0;
	return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
/** An angle in 0..360 to 0.1°, so 359.96 reads 0°. */
export function fmtAngle(deg: number): string {
	const r = Math.round((((deg % 360) + 360) % 360) * 10) / 10;
	return `${fmtNumber(r === 360 ? 0 : r)}°`;
}
/** A couch position in mm, signed: +4, 0, -2.5. */
export function fmtSigned(mm: number): string {
	const s = fmtNumber(mm);
	return mm > 0 && s !== '0' ? `+${s}` : s;
}

/** The labels of the axes Move to field drives (console-motion.ts): the others are the aperture,
    set with the jaw and MLC keys. */
const MOVED_BY_MOVE_TO_FIELD = new Set([
	'Gantry',
	'Collimator',
	'Couch angle',
	'Couch Vrt',
	'Couch Lng',
	'Couch Lat'
]);

export function angleMismatch(
	label: 'Gantry' | 'Collimator' | 'Couch angle',
	now: number,
	planned: number
): GeometryMismatch {
	return { label, now: fmtAngle(now), planned: fmtAngle(planned) };
}
export function couchMismatch(
	axis: 'Vrt' | 'Lng' | 'Lat',
	now: number,
	planned: number
): GeometryMismatch {
	return { label: `Couch ${axis}`, now: fmtSigned(now), planned: `${fmtSigned(planned)} mm` };
}
/** Jaw edges in cm from the central axis (delivery/plan.ts parseJawSpec). */
export interface JawEdges {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
}
export function jawsMismatch(now: JawEdges, planned: JawEdges): GeometryMismatch {
	const symmetric = (j: JawEdges) => j.x1 === j.x2 && j.y1 === j.y2;
	const text = (j: JawEdges) =>
		symmetric(now) && symmetric(planned)
			? `${fmtNumber(j.x1 + j.x2)} × ${fmtNumber(j.y1 + j.y2)}`
			: `X1 ${fmtNumber(j.x1)} / X2 ${fmtNumber(j.x2)} / Y1 ${fmtNumber(j.y1)} / Y2 ${fmtNumber(j.y2)}`;
	return { label: 'Jaws', now: text(now), planned: `${text(planned)} cm` };
}
export function mlcMismatch(now: number, planned: number): GeometryMismatch {
	return { label: 'MLC', now: fmtNumber(now), planned: `${fmtNumber(planned)} cm` };
}
/** An axis compared as text (the MLC shape), or one whose values do not parse. */
export function textMismatch(label: string, now: string, planned: string): GeometryMismatch {
	return { label, now, planned };
}

/** The geometry interlock's detail: "Gantry 0° → 270° · Couch Vrt +6 → +4 mm". */
export function geometryDetail(mismatches: readonly GeometryMismatch[]): string {
	return mismatches.map((m) => `${m.label} ${m.now} → ${m.planned}`).join(' · ');
}

/* ----- the hero line ----- */
/** The geometry interlock as getDeliveryReadiness lists it in console mode: with the axes off the
    plan when it fails. */
export interface GeometryCheck extends ReadinessCheck {
	mismatches?: GeometryMismatch[];
}

/** The delivery screen's state, as console-patch.ts reads it from the app. */
export interface HeroState {
	hasCase: boolean;
	delivering: boolean;
	/** The beam is held mid-field (Beam Hold, an interlock, the door, the console left). */
	held: boolean;
	/** The fraction is recorded (charge capture posted). */
	posted: boolean;
	/** The selected field is delivered. */
	completed: boolean;
	/** Every field of the plan is delivered. */
	allDone: boolean;
	/** Beam enabled for the selected field. */
	armed: boolean;
	/** Every interlock passes. */
	ready: boolean;
	checks: GeometryCheck[];
	/** The selected field's name. */
	field: string;
	/** Motion Enable is armed, so Move to field can move the machine. */
	motionArmed: boolean;
	/** The delivery window's own Record / Complete key shows (Free Mode; the Tutorial hides it). */
	recordKey: boolean;
}

/** The hero line in console mode: what to press next, naming only keys on screen (Move to field,
    Motion Enable, Enable Beam, Beam On and Resume Beam are on every console-mode delivery screen;
    Record / Complete when `recordKey`). For a hold, the most basic one (console-messages.ts
    basicHold): the geometry names its fix and the axes off the plan, any other its checklist line. */
export function deliveryHero(s: HeroState): string {
	if (!s.hasCase) return 'Open a patient chart to begin.';
	if (s.delivering && s.held) return 'Beam held. Resolve the hold, then press Resume Beam.';
	if (s.delivering) return 'Beam on. Monitor MU progression and treatment status.';
	if (s.posted) return 'Fraction recorded. Session complete.';
	if (s.completed && s.allDone)
		return s.recordKey
			? 'All fields delivered. Press Record / Complete to close the fraction.'
			: 'All fields delivered.';
	if (s.completed) return 'Field complete. Select the next field.';
	if (s.armed) return 'Beam enabled. Press Beam On.';
	if (s.ready) return 'All interlocks green. Press Enable Beam.';
	const hold = basicHold(s.checks) as GeometryCheck | null;
	if (!hold) return 'Resolve the holds on the checklist.';
	if (hold.name !== GEOMETRY_CHECK || !hold.mismatches?.length)
		return `Resolve the hold: ${hold.name} (${hold.detail}).`;
	const moved = hold.mismatches.filter((m) => MOVED_BY_MOVE_TO_FIELD.has(m.label));
	if (!moved.length) return `${s.field}: set the jaws and MLC to the plan (${hold.detail}).`;
	const press = s.motionArmed ? 'hold' : 'press Motion Enable, then hold';
	const last =
		s.checks.filter((c) => !c.ok).length === 1 && moved.length === hold.mismatches.length;
	return last
		? `${s.field}: ${press} Move to field until the checklist is green (${hold.detail}).`
		: `${s.field}: ${press} Move to field (${geometryDetail(moved)}).`;
}

/* ----- the Tutorial's field order ----- */
/** The first field of the plan's `count` not yet delivered (`completed` by index), or null when
    every one is. */
export function nextFieldIndex(
	count: number,
	completed: Readonly<Record<number, boolean>>
): number | null {
	for (let i = 0; i < count; i++) if (!completed[i]) return i;
	return null;
}
