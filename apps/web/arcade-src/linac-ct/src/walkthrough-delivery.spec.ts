import { describe, expect, it, vi } from 'vitest';
import { TUTORIAL_PATIENTS, type LinacGeometryHold } from '../../shared/console-protocol';
import { currentIndex, fillTokens } from '../../shared/walkthrough-core';
import type { ConsoleEvent } from './console-hooks';
import { TREATMENT_CASES } from './delivery/cases';
import { angleMismatch } from './delivery-guide';
import { buildTutorialCases } from './tutorial-cases';
import { DELIVERY_WALK, FIELDS, fieldRow, type DeliverySnap } from './walkthrough-delivery';

// read() is the console's side; linac-safety.ts and delivery/plan.ts load the whole console (main.ts),
// which Node cannot
vi.mock('./linac-safety', () => ({ deliveryGeometryHold: () => null }));
vi.mock('./delivery/plan', () => ({ deliveryCasePlan: () => ({ field: 'Right Lateral' }) }));

const JORDAN = TUTORIAL_PATIENTS.jordan.mrn,
	LOOKALIKE = TUTORIAL_PATIENTS.jordanLookalike.mrn;
const gantry = (field: string, now: number, planned: number): LinacGeometryHold => ({
	field,
	mismatches: [angleMismatch('Gantry', now, planned)]
});
const snap = (o: Partial<DeliverySnap> = {}): DeliverySnap => ({
	field: 'Right Lateral',
	hold: gantry('Right Lateral', 0, 270),
	motion: false,
	armed: false,
	delivering: false,
	held: false,
	events: [],
	...o,
	// at field when the geometry matches, unless a case says the key doesn't say so yet
	keyAtField: o.keyAtField ?? o.hold === null
});
const steps = DELIVERY_WALK.steps,
	at = (s: DeliverySnap, seen: string[] = [], reached = 0) =>
		currentIndex(steps, s, new Set(seen), reached);
const step = (id: string) => steps.find((s) => s.id === id)!;
const index = (id: string) => steps.findIndex((s) => s.id === id);
const EXPLAINS = ['delivery.intro', 'delivery.fields', 'delivery.hold'];
const fieldDelivered = (field: string, i: number, mrn: string = JORDAN): ConsoleEvent => ({
	kind: 'field-delivered',
	mrn,
	field,
	index: i,
	of: 2
});
const firstDone = [fieldDelivered('Right Lateral', 0)];

describe("step 9's walkthrough, the treatment", () => {
	it('has the ten sub-steps, three explains, six presses and the done explain', () => {
		expect(DELIVERY_WALK.id).toBe('delivery');
		expect(DELIVERY_WALK.header).toBe('Treatment');
		expect(steps.map((s) => [s.id, s.kind])).toEqual([
			['delivery.intro', 'explain'],
			['delivery.fields', 'explain'],
			['delivery.hold', 'explain'],
			['delivery.motion', 'do'],
			['delivery.move1', 'do'],
			['delivery.enable1', 'do'],
			['delivery.beam1', 'do'],
			['delivery.move2', 'do'],
			['delivery.beam2', 'do'],
			['delivery.done', 'explain']
		]);
		expect(steps.map((s) => s.cue ?? null)).toEqual([
			null,
			null,
			null,
			'Press Motion Enable',
			'Hold Move to field',
			'Press Enable Beam',
			'Press Beam On',
			'Hold Move to field',
			'Enable Beam, then Beam On',
			null
		]);
	});

	it('moves on by Next, then by the console through both fields', () => {
		expect(at(snap())).toBe(0);
		expect(at(snap(), ['delivery.intro'])).toBe(1);
		expect(at(snap(), ['delivery.intro', 'delivery.fields'])).toBe(2);
		expect(at(snap(), EXPLAINS)).toBe(index('delivery.motion'));
		// motion enabled, then held to Right Lateral's 270°
		expect(at(snap({ motion: true }), EXPLAINS)).toBe(index('delivery.move1'));
		const atRight = snap({ motion: true, hold: null });
		expect(at(atRight, EXPLAINS)).toBe(index('delivery.enable1'));
		expect(at({ ...atRight, armed: true }, EXPLAINS)).toBe(index('delivery.beam1'));
		expect(at({ ...atRight, armed: true, delivering: true }, EXPLAINS)).toBe(
			index('delivery.beam1')
		);
		// the field delivered, the beam off; the console then selects Left Lateral, 270° → 90°, read
		// from the furthest sub-step reached, as the runner does (Right Lateral is no longer selected)
		expect(at({ ...atRight, events: firstDone }, EXPLAINS)).toBe(index('delivery.move2'));
		const from = index('delivery.beam1');
		const left = snap({
			motion: true,
			field: 'Left Lateral',
			hold: gantry('Left Lateral', 270, 90),
			events: firstDone
		});
		expect(at(left, EXPLAINS, from)).toBe(index('delivery.move2'));
		const atLeft = { ...left, hold: null, keyAtField: true };
		expect(at(atLeft, EXPLAINS, from)).toBe(index('delivery.beam2'));
		expect(at({ ...atLeft, armed: true }, EXPLAINS, from)).toBe(index('delivery.beam2'));
		const complete: ConsoleEvent[] = [
			...firstDone,
			fieldDelivered('Left Lateral', 1),
			{ kind: 'treatment-complete', mrn: JORDAN }
		];
		expect(at({ ...atLeft, events: complete }, EXPLAINS, from)).toBe(index('delivery.done'));
		expect(at({ ...atLeft, events: complete }, [...EXPLAINS, 'delivery.done'], from)).toBe(
			steps.length
		);
	});

	it('passes over Motion Enable when it is already on, and the hold when the gantry is at field', () => {
		expect(at(snap({ motion: true }), EXPLAINS)).toBe(index('delivery.move1'));
		expect(at(snap({ hold: null }), ['delivery.intro', 'delivery.fields'])).toBe(
			index('delivery.motion')
		);
		// a hold with no gantry in it (here the collimator) is not the gantry's, so it is passed over
		const coll = { field: 'Right Lateral', mismatches: [angleMismatch('Collimator', 5, 0)] };
		expect(at(snap({ hold: coll }), ['delivery.intro', 'delivery.fields'])).toBe(
			index('delivery.motion')
		);
	});

	it('keeps a sub-step passed, from the furthest reached', () => {
		// enabled, then disarmed by an interlock with no field delivered: Beam On stays the step, and
		// Enable Beam is cut out again beside it
		const atRight = snap({ motion: true, hold: null });
		expect(at(atRight, EXPLAINS, index('delivery.beam1'))).toBe(index('delivery.beam1'));
		expect(step('delivery.beam1').targets(atRight)).toEqual(['#rtv2EnableBeam', '#rtv2BeamOn']);
		// Motion Enable turned off after Move to field: not asked again
		expect(at(snap({ hold: null }), EXPLAINS, index('delivery.enable1'))).toBe(
			index('delivery.enable1')
		);
	});

	it("counts only Jordan's fields and treatment", () => {
		const atRight = snap({ motion: true, hold: null, armed: true });
		expect(
			at({ ...atRight, events: [fieldDelivered('Right Lateral', 0, LOOKALIKE)] }, EXPLAINS)
		).toBe(index('delivery.beam1'));
		const atLeft = snap({ motion: true, field: 'Left Lateral', hold: null, events: firstDone });
		expect(
			at(
				{ ...atLeft, events: [...firstDone, { kind: 'treatment-complete', mrn: LOOKALIKE }] },
				EXPLAINS,
				index('delivery.move2')
			)
		).toBe(index('delivery.beam2'));
	});

	it('waits for the key to say At field, past the interlock clearing within its tolerance', () => {
		const cleared = snap({ motion: true, hold: null, keyAtField: false });
		expect(at(cleared, EXPLAINS)).toBe(index('delivery.move1'));
		expect(at({ ...cleared, keyAtField: true }, EXPLAINS)).toBe(index('delivery.enable1'));
	});

	it("is not at field on the other field's angle", () => {
		// Left Lateral picked by hand and held to 90°: Right Lateral is still to move to
		const wrong = snap({ motion: true, field: 'Left Lateral', hold: null });
		expect(at(wrong, EXPLAINS)).toBe(index('delivery.move1'));
		expect(step('delivery.move1').targets(wrong)).toEqual(['#consoleMoveToField', fieldRow(0)]);
		const back = snap({ motion: true, field: 'Right Lateral', hold: null, events: firstDone });
		expect(at(back, EXPLAINS, index('delivery.move2'))).toBe(index('delivery.move2'));
		expect(step('delivery.move2').targets(back)).toEqual(['#consoleMoveToField', fieldRow(1)]);
	});

	it('targets the screen, the field list, the interlocks, then each key', () => {
		const s = snap();
		expect(step('delivery.intro').targets(s)).toEqual(['#rtv2dFieldList', '#rtv2dChecksPane']);
		expect(step('delivery.fields').targets(s)).toEqual(['#rtv2dFieldList']);
		expect(step('delivery.hold').targets(s)).toEqual(['#rtv2dChecksPane']);
		expect(step('delivery.motion').targets(s)).toEqual(['#rtv2MotionEnable']);
		expect(step('delivery.move1').targets(s)).toEqual(['#consoleMoveToField']);
		expect(step('delivery.enable1').targets(s)).toEqual(['#rtv2EnableBeam']);
		expect(step('delivery.beam1').targets({ ...s, armed: true })).toEqual(['#rtv2BeamOn']);
		const left = snap({ field: 'Left Lateral', hold: gantry('Left Lateral', 270, 90) });
		expect(step('delivery.move2').targets(left)).toEqual(['#consoleMoveToField']);
		expect(step('delivery.done').targets(s)).toEqual(['#rtv2dFieldList']);
	});

	it('cuts out Resume Beam while a field is held, on either field', () => {
		// the panel closed or the door opened mid-field: the beam stays delivering, held
		const right = snap({ motion: true, hold: null, armed: true, delivering: true, held: true });
		expect(at(right, EXPLAINS, index('delivery.beam1'))).toBe(index('delivery.beam1'));
		expect(step('delivery.beam1').targets(right)).toEqual(['#rtv2BeamHold']);
		expect(step('delivery.beam1').targets({ ...right, held: false })).toEqual(['#rtv2BeamOn']);
		const left = { ...right, field: 'Left Lateral', events: firstDone };
		expect(at(left, EXPLAINS, index('delivery.beam2'))).toBe(index('delivery.beam2'));
		expect(step('delivery.beam2').targets(left)).toEqual(['#rtv2BeamHold']);
		expect(step('delivery.beam2').targets({ ...left, held: false })).toEqual(['#rtv2BeamOn']);
	});

	it('cuts out Enable Beam again when an interlock disarms the beam', () => {
		const armed = snap({ motion: true, hold: null, armed: true });
		expect(step('delivery.beam1').targets(armed)).toEqual(['#rtv2BeamOn']);
		expect(step('delivery.beam1').targets({ ...armed, armed: false })).toEqual([
			'#rtv2EnableBeam',
			'#rtv2BeamOn'
		]);
		const left = { ...armed, field: 'Left Lateral', events: firstDone };
		expect(step('delivery.beam2').targets(left)).toEqual(['#rtv2BeamOn']);
		expect(step('delivery.beam2').targets({ ...left, armed: false })).toEqual(['#rtv2EnableBeam']);
	});

	it('moves the last press from Enable Beam to Beam On once the beam is enabled', () => {
		const left = snap({ field: 'Left Lateral', hold: null, events: firstDone });
		expect(step('delivery.beam2').targets(left)).toEqual(['#rtv2EnableBeam']);
		expect(step('delivery.beam2').targets({ ...left, armed: true })).toEqual(['#rtv2BeamOn']);
		expect(step('delivery.beam2').targets({ ...left, armed: true, delivering: true })).toEqual([
			'#rtv2BeamOn'
		]);
	});

	it("fills the hold's gantry and field from the geometry hold", () => {
		const hold = step('delivery.hold'),
			fill = (s: DeliverySnap) => fillTokens(hold.text.why, hold.tokens?.(s));
		expect(fill(snap())).toBe(
			'The gantry is at 0° and Right Lateral needs 270°. Move to field turns it there.'
		);
		expect(fill(snap({ hold: gantry('Right Lateral', 359.96, 270) }))).toBe(
			'The gantry is at 0° and Right Lateral needs 270°. Move to field turns it there.'
		);
		const both: LinacGeometryHold = {
			field: 'Left Lateral',
			mismatches: [angleMismatch('Collimator', 5, 0), angleMismatch('Gantry', 182.5, 90)]
		};
		expect(fill(snap({ field: 'Left Lateral', hold: both }))).toBe(
			'The gantry is at 182.5° and Left Lateral needs 90°. Move to field turns it there.'
		);
	});

	it("names the fields, MU, angles and fraction as Jordan's plan has them", () => {
		const plan = buildTutorialCases(TREATMENT_CASES).find((c) => c.mrn === JORDAN)!;
		expect(plan.fields.map((f) => f.name)).toEqual([...FIELDS]);
		const [right, left] = plan.fields;
		expect([right.mu, left.mu]).toEqual([152, 152]);
		expect([right.geometry.gantry, left.geometry.gantry]).toEqual(['270°', '90°']);
		expect(plan.fraction).toBe('4 / 10');
		expect(step('delivery.fields').text.do).toContain(`two fields, ${right.mu} MU each`);
		expect(step('delivery.fields').text.why).toContain(
			`${right.name} treats from gantry ${right.geometry.gantry}, ${left.name} from ${left.geometry.gantry}`
		);
		expect(step('delivery.beam1').text.why).toContain(`climb to ${right.mu}.`);
		expect(step('delivery.move2').text.why).toContain(
			`from ${right.geometry.gantry} to ${left.geometry.gantry}`
		);
		expect(step('delivery.beam2').text.why).toContain(`its ${left.mu} MU`);
		expect(step('delivery.done').text.why).toContain(
			`${right.mu + left.mu} MU in all, today's fraction 4 of 10`
		);
	});
});
