/* The Tutorial's step 9 walkthrough on the LINAC console's delivery screen (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Step 9, the treatment"): the screen, Jordan's two
   fields, the geometry interlock holding, then Motion Enable, the held Move to field, Enable Beam
   and Beam On for each field, and the treatment delivered. walkthrough-mode.ts runs it while the
   console shows the delivery window. The console selects the next field not yet delivered when the
   window opens and after each field (console-mode.ts), so Right Lateral comes first and Left
   Lateral second. The geometry hold's sub-step fills its angles from deliveryGeometryHold
   (linac-safety.ts, formatted by delivery-guide.ts) and is passed over when the gantry is not
   holding. A Move to field sub-step is done once its field is selected with no geometry hold; with
   the other field selected, that field's row is cut out too, so the learner can pick it back. The
   beam's presses follow the beam: a held beam (the panel closed or the door opened mid-field) cuts
   out Resume Beam, and a beam disarmed by an interlock after Enable Beam cuts out Enable Beam
   again. The sub-steps are pure, so walkthrough-delivery.spec.ts tests them with made-up snapshots; read()
   is the DOM side. */
import { TUTORIAL_PATIENTS, type LinacGeometryHold } from '../../shared/console-protocol';
import type { ConsoleEvent } from './console-hooks';
import { deliveryCasePlan } from './delivery/plan';
import { deliveryGeometryHold } from './linac-safety';
import { S } from './state';
import type { WalkPart } from './walkthrough-part';

export interface DeliverySnap {
	/** The selected field's name ("Right Lateral"), or null with no plan loaded. */
	field: string | null;
	/** The geometry interlock's hold on the selected field, or null when it matches the plan. */
	hold: LinacGeometryHold | null;
	/** Motion Enable is armed. */
	motion: boolean;
	/** The beam is enabled for the selected field (Enable Beam), on (Beam On), and held mid-field
	    (Resume Beam goes on). */
	armed: boolean;
	delivering: boolean;
	held: boolean;
	/** Move to field's key says At field (console-keys.ts syncMoveKey): the machine exactly at the
	    selected field. The geometry interlock clears a little before that, within its tolerance. */
	keyAtField: boolean;
	/** Every event the console has reported this page load. */
	events: readonly ConsoleEvent[];
}

/** Jordan's two fields, in the plan's order (delivery/cases.ts, the whole-brain case). */
export const FIELDS = ['Right Lateral', 'Left Lateral'] as const;
/** The selector of the delivery window's row for the field at `i` (from 0). */
export const fieldRow = (i: number): string =>
	`#rtv2dFieldList .rtv2d-field-row[data-index="${i}"]`;

const MOVE = '#consoleMoveToField',
	ENABLE = '#rtv2EnableBeam',
	BEAM_ON = '#rtv2BeamOn',
	// the chart's Beam Hold, which says Resume Beam while a field is held (console-mode.ts)
	RESUME = '#rtv2BeamHold',
	FIELD_LIST = '#rtv2dFieldList',
	INTERLOCKS = '#rtv2dChecksPane',
	JORDAN = TUTORIAL_PATIENTS.jordan.mrn;

const delivered = (s: DeliverySnap) =>
	s.events.filter((e) => e.kind === 'field-delivered' && e.mrn === JORDAN).length;

/** The geometry hold's gantry, now and planned, or null when the gantry is not off the plan. */
const gantryHold = (s: DeliverySnap) =>
	s.hold?.mismatches.find((m) => m.label === 'Gantry') ?? null;

/** Move to field's sub-step for the field at `i`: done once it is selected and its key says At
    field, as the bubble tells the player to hold it until. */
const atField = (s: DeliverySnap, i: number) => s.field === FIELDS[i] && s.keyAtField;
const moveTargets = (s: DeliverySnap, i: number) =>
	s.field === FIELDS[i] ? [MOVE] : [MOVE, fieldRow(i)];
/** The key that brings the beam on now: Resume Beam while held, Beam On once enabled or on, else
    Enable Beam (`disarmed`, its keys when the beam is neither: one or both). */
const beamKeys = (s: DeliverySnap, disarmed: readonly string[]) =>
	s.held ? [RESUME] : s.armed || s.delivering ? [BEAM_ON] : disarmed;

export const DELIVERY_WALK: WalkPart<DeliverySnap> = {
	id: 'delivery',
	header: 'Treatment',
	steps: [
		{
			id: 'delivery.intro',
			kind: 'explain',
			text: {
				do: 'This is the delivery screen.',
				why: 'The fields to deliver are on the left. The interlock checklist on the right must be all green before the beam can come on.'
			},
			targets: () => [FIELD_LIST, INTERLOCKS]
		},
		{
			id: 'delivery.fields',
			kind: 'explain',
			text: {
				do: "Jordan's plan has two fields, 152 MU each.",
				why: 'Right Lateral treats from gantry 270°, Left Lateral from 90°. Right Lateral is selected first.'
			},
			targets: () => [FIELD_LIST]
		},
		{
			id: 'delivery.hold',
			kind: 'explain',
			text: {
				do: 'One interlock is holding: the treatment geometry.',
				why: 'The gantry is at {now} and {field} needs {planned}. Move to field turns it there.'
			},
			targets: () => [INTERLOCKS],
			applies: (s) => gantryHold(s) !== null,
			tokens: (s) => {
				const g = gantryHold(s);
				return g && s.hold ? { now: g.now, field: s.hold.field, planned: g.planned } : {};
			}
		},
		{
			id: 'delivery.motion',
			kind: 'do',
			text: {
				do: 'Press Motion Enable.',
				why: 'The machine moves only while motion is enabled.'
			},
			targets: () => ['#rtv2MotionEnable'],
			done: (s) => s.motion,
			cue: 'Press Motion Enable'
		},
		{
			id: 'delivery.move1',
			kind: 'do',
			text: {
				do: 'Press and hold Move to field until it says At field.',
				why: 'The machine moves only while you hold the key, like the hold-to-run switch on a real console. Letting go stops it at once.'
			},
			targets: (s) => moveTargets(s, 0),
			done: (s) => atField(s, 0),
			cue: 'Hold Move to field'
		},
		{
			id: 'delivery.enable1',
			kind: 'do',
			text: {
				do: 'Press Enable Beam.',
				why: 'Every interlock is green, so the beam can be armed for this field.'
			},
			targets: () => [ENABLE],
			done: (s) => s.armed || s.delivering || delivered(s) > 0,
			cue: 'Press Enable Beam'
		},
		{
			id: 'delivery.beam1',
			kind: 'do',
			text: {
				do: 'Press Beam On.',
				why: 'Watch the MU count climb to 152. The beam stops by itself when the field is done.'
			},
			targets: (s) => beamKeys(s, [ENABLE, BEAM_ON]),
			done: (s) => delivered(s) > 0,
			cue: 'Press Beam On'
		},
		{
			id: 'delivery.move2',
			kind: 'do',
			text: {
				do: 'Left Lateral is selected. Hold Move to field until it says At field.',
				why: 'The gantry turns from 270° to 90° for the second field.'
			},
			targets: (s) => moveTargets(s, 1),
			done: (s) => atField(s, 1),
			cue: 'Hold Move to field'
		},
		{
			id: 'delivery.beam2',
			kind: 'do',
			text: {
				do: 'Press Enable Beam, then Beam On.',
				why: 'The second field delivers its 152 MU.'
			},
			targets: (s) => beamKeys(s, [ENABLE]),
			done: (s) => s.events.some((e) => e.kind === 'treatment-complete' && e.mrn === JORDAN),
			cue: 'Enable Beam, then Beam On'
		},
		{
			id: 'delivery.done',
			kind: 'explain',
			text: {
				do: 'Treatment delivered.',
				why: "Both fields are done: 304 MU in all, today's fraction 4 of 10. The console records it in Jordan's chart."
			},
			targets: () => [FIELD_LIST]
		}
	],
	read(events) {
		const d = S.treatmentDelivery;
		return {
			field: S.activeTreatmentCase ? deliveryCasePlan().field : null,
			hold: deliveryGeometryHold(),
			motion: S.consoleMotionArmed,
			armed: d.armed,
			delivering: d.delivering,
			held: d.held,
			keyAtField: !!document.getElementById('consoleMoveToField')?.classList.contains('at-field'),
			events
		};
	}
};
