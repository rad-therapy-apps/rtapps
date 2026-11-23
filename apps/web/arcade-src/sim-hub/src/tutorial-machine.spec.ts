import { describe, it, expect } from 'vitest';
import {
	OFF,
	consoleMissText,
	consoleOutcome,
	progressOf,
	reduceTutorial
} from './tutorial-machine';
import type { Effect, TutorialEvent, TutorialState } from './tutorial-machine';
import {
	CHAPTER_1,
	JORDAN_MRN,
	WAIT_FOR_JAMIE,
	WAIT_FOR_JORDAN,
	eHintText
} from './tutorial-steps';
import type { ConsoleProgressKind } from './tutorial-steps';
import { TUTORIAL_PATIENTS } from '../../shared/console-protocol';
import type { LinacEvent } from '../../shared/console-protocol';

// Runs events from `s`, collecting every effect.
function run(s: TutorialState, ...events: TutorialEvent[]) {
	const effects: Effect[] = [];
	for (const ev of events) {
		const r = reduceTutorial(s, ev);
		s = r.state;
		effects.push(...r.effects);
	}
	return { s, effects };
}
// `seconds` of quarter-second frames at walking distance `distance`.
function ticks(seconds: number, distance: number, escortAhead = false): TutorialEvent[] {
	return Array.from({ length: seconds * 4 }, () => ({
		type: 'tick' as const,
		dt: 0.25,
		distance,
		escortAhead
	}));
}
const hints = (effects: Effect[]) =>
	effects.flatMap((e) => (e.type === 'hint' ? [e.text] : [])).filter((t) => t !== null);
const actions = (effects: Effect[]) =>
	effects.flatMap((e) => (e.type === 'action' ? [e.action] : []));
const atStep = (n: number): TutorialState => ({
	...OFF,
	phase: 'active',
	step: n
});
// an event from the LINAC console, for Jordan unless another MRN is given
const linac = (
	kind: Exclude<LinacEvent['kind'], 'mistake' | 'field-delivered' | 'images-acquired'>,
	mrn: string = JORDAN_MRN
): TutorialEvent => ({
	type: 'linac',
	event: { kind, mrn }
});
const mistake: TutorialEvent = {
	type: 'linac',
	event: { kind: 'mistake', workspace: 'queue', code: 'wrong-patient', message: 'Not the patient.' }
};
// a refusal on the image-guidance screen, by its code
const refused = (code: string): TutorialEvent => ({
	type: 'linac',
	event: { kind: 'mistake', workspace: 'igrt', code, message: 'Refused.' }
});
const imagesAcquired: TutorialEvent = {
	type: 'linac',
	event: { kind: 'images-acquired', mrn: JORDAN_MRN, shiftMm: 4 }
};
// Continue on the step card
const cardContinue: TutorialEvent = { type: 'cardContinue' };
// a step's completion: the hint line cleared and its card
const cardFor = (step: number): Effect[] => [
	{ type: 'hint', text: null },
	{ type: 'showCard', step }
];

describe('starting', () => {
	it('opens step 1 with no hint', () => {
		const { s, effects } = run(OFF, { type: 'start' });
		expect(s.phase).toBe('active');
		expect(s.step).toBe(1);
		expect(effects).toEqual([
			{ type: 'showStep', step: 1 },
			{ type: 'hint', text: null }
		]);
		expect(progressOf(s)).toBe(0);
	});

	it('stops', () => {
		expect(run(atStep(5), { type: 'stop' }).s).toEqual(OFF);
	});
});

describe('E steps', () => {
	it('ignores E on any other target, then opens the check-in exchange', () => {
		let r = run(atStep(1), { type: 'pressedE', target: 'console' });
		expect(r.s).toEqual(atStep(1));
		expect(r.effects).toEqual([]);
		r = run(atStep(1), { type: 'pressedE', target: 'maya' });
		expect(r.s.phase).toBe('dialog');
		expect(r.effects).toEqual([{ type: 'openDialog', step: 1 }]);
	});

	it('moves on to step 2 after the exchange and its card, picking the chair', () => {
		let r = run(atStep(1), { type: 'pressedE', target: 'maya' }, { type: 'continue' });
		expect(r.s.step).toBe(1);
		expect(r.s.phase).toBe('card');
		expect(r.effects.slice(1)).toEqual([{ type: 'closeDialog' }, ...cardFor(1)]);
		r = run(r.s, cardContinue);
		expect(r.s.step).toBe(2);
		expect(r.s.phase).toBe('active');
		expect(r.effects).toEqual([
			{ type: 'hideCard' },
			{ type: 'showStep', step: 2 },
			{ type: 'hint', text: null },
			{ type: 'action', action: 'pickChair' }
		]);
	});

	it('sits the player down, waits 6 s, then changes the role', () => {
		let r = run(atStep(2), { type: 'pressedE', target: 'chair' });
		expect(actions(r.effects)).toEqual(['sitPlayer', 'intercomToControl']);
		expect(r.s.phase).toBe('waiting');
		r = run(r.s, ...ticks(5.75, 0));
		expect(r.s.phase).toBe('waiting');
		r = run(r.s, ...ticks(0.25, 0));
		expect(r.s.phase).toBe('card');
		expect(r.effects).toEqual(cardFor(2));
		r = run(r.s, cardContinue);
		expect(r.s.phase).toBe('roleChange');
		expect(r.s.step).toBe(3);
		expect(r.effects).toEqual([{ type: 'hideCard' }, { type: 'roleChange', role: 'therapist' }]);
		expect(progressOf(r.s)).toBeCloseTo(2 / 11);
		r = run(r.s, { type: 'roleChangeDone' });
		expect(r.s.phase).toBe('active');
		expect(r.effects[0]).toEqual({ type: 'showStep', step: 3 });
	});
});

describe('console steps', () => {
	const schedule = CHAPTER_1[2].console!;

	it('opens the console at the step’s workspace on E, and completes on Jordan’s chart', () => {
		let r = run(atStep(3), { type: 'pressedE', target: 'console' });
		expect(r.s.phase).toBe('console');
		expect(r.effects).toEqual([{ type: 'openConsole', workspace: 'queue' }]);
		// checking Jordan in is on the way: nothing yet
		r = run(r.s, linac('checked-in'));
		expect(r.effects).toEqual([]);
		r = run(r.s, linac('chart-opened'));
		// no "Correct." line: the step card says why
		expect(r.effects).toEqual([
			{ type: 'closeConsole' },
			{ type: 'action', action: 'jordanOnMonitors' },
			...cardFor(3)
		]);
		expect(r.s.step).toBe(3);
		expect(r.s.phase).toBe('card');
		r = run(r.s, cardContinue);
		expect(r.effects).toEqual([
			{ type: 'hideCard' },
			{ type: 'showStep', step: 4 },
			{ type: 'hint', text: null }
		]);
		expect(r.s.step).toBe(4);
		expect(r.s.phase).toBe('active');
	});

	it('opens Patient Setup at the couch and runs step 6’s world actions on setup-complete', () => {
		let r = run(atStep(6), { type: 'pressedE', target: 'couch' });
		expect(r.effects).toEqual([{ type: 'openConsole', workspace: 'setup' }]);
		r = run(r.s, linac('setup-complete'));
		expect(actions(r.effects)).toEqual(['jordanOnCouch', 'lasersOn', 'jamieAcrossCouch']);
		expect(r.s.phase).toBe('card');
		r = run(r.s, cardContinue);
		expect(actions(r.effects)).toEqual(['jamieToControl']);
		expect(r.s.step).toBe(7);
	});

	it('counts a mistake, or another patient’s chart or check-in, as a miss: hint 1, hint 2, then the reveal', () => {
		const open = run(atStep(3), { type: 'pressedE', target: 'console' }).s;
		const r = run(
			open,
			mistake,
			linac('chart-opened', TUTORIAL_PATIENTS.jordanLookalike.mrn),
			linac('checked-in', TUTORIAL_PATIENTS.jody.mrn),
			mistake
		);
		expect(r.effects).toEqual([
			{ type: 'hint', text: `Not yet. ${schedule.hints[0]}`, kind: 'hint1' },
			{ type: 'hint', text: `Not yet. ${schedule.hints[1]}`, kind: 'hint2' },
			{ type: 'hint', text: schedule.reveal, kind: 'reveal' },
			{ type: 'hint', text: schedule.reveal, kind: 'reveal' }
		]);
		expect(r.s.misses).toBe(4);
		expect(r.s.step).toBe(3);
		expect(r.s.phase).toBe('console');
		// the right chart still completes the step
		expect(run(r.s, linac('chart-opened'), cardContinue).s.step).toBe(4);
	});

	it('completes step 8 on alignment-verified only after the images and shift-applied', () => {
		let r = run(atStep(8), { type: 'pressedE', target: 'console' });
		expect(r.effects).toEqual([{ type: 'openConsole', workspace: 'igrt' }]);
		r = run(r.s, linac('alignment-verified'));
		expect(r.s.step).toBe(8);
		expect(r.effects).toEqual([]);
		r = run(r.s, imagesAcquired);
		expect(r.s.progress).toBe(1);
		expect(r.effects).toEqual([]);
		r = run(r.s, linac('shift-applied'));
		expect(r.s.progress).toBe(2);
		expect(r.effects).toEqual([]);
		r = run(r.s, linac('alignment-verified'));
		expect(actions(r.effects)).toEqual(['shiftApplied']);
		expect(r.effects[0]).toEqual({ type: 'closeConsole' });
		expect(r.s.phase).toBe('card');
		expect(run(r.s, cardContinue).s.step).toBe(9);
	});

	it('completes step 9 on treatment-complete, not on a field, and then opens the door', () => {
		let r = run(atStep(9), { type: 'pressedE', target: 'console' });
		expect(r.effects).toEqual([{ type: 'openConsole', workspace: 'delivery' }]);
		r = run(r.s, {
			type: 'linac',
			event: { kind: 'field-delivered', mrn: JORDAN_MRN, field: 'Right Lateral', index: 1, of: 2 }
		});
		expect(r.s.step).toBe(9);
		r = run(r.s, linac('treatment-complete'));
		expect(r.effects[0]).toEqual({ type: 'closeConsole' });
		expect(actions(r.effects)).toEqual(['beamOff']);
		expect(r.s.phase).toBe('card');
		r = run(r.s, cardContinue);
		expect(actions(r.effects)).toEqual(['releaseVaultDoor', 'jamieBackIn']);
		expect(r.s.step).toBe(10);
	});

	it('shows the beam on the boards while the console’s beam is on, between fields when it is off', () => {
		const beam = (on: boolean): TutorialEvent => ({ type: 'beam', on });
		let r = run(atStep(9), { type: 'pressedE', target: 'console' }, beam(false));
		expect(r.effects).toEqual([{ type: 'openConsole', workspace: 'delivery' }]);
		r = run(r.s, beam(true), beam(true));
		expect(actions(r.effects)).toEqual(['beamOn']);
		r = run(r.s, beam(false), beam(true), beam(false));
		expect(actions(r.effects)).toEqual(['betweenFields', 'beamOn', 'betweenFields']);
		// still followed with the console closed; TREATMENT COMPLETE comes with the step's end
		r = run(r.s, { type: 'consoleClosed' }, beam(true), linac('treatment-complete'), cardContinue);
		expect(actions(r.effects)).toEqual(['beamOn', 'beamOff', 'releaseVaultDoor', 'jamieBackIn']);
		expect(r.s.beamOn).toBe(false);
		// no boards outside the delivery step
		for (const s of [atStep(8), atStep(10), { ...atStep(9), phase: 'roleChange' as const }])
			expect(run(s, beam(true))).toEqual({ s, effects: [] });
	});

	it('keeps the step when the console is closed early: E opens it again, with its misses kept', () => {
		let r = run(atStep(3), { type: 'pressedE', target: 'console' }, mistake, {
			type: 'consoleClosed'
		});
		expect(r.s.phase).toBe('active');
		expect(r.s.step).toBe(3);
		// the miss stays in the hint line while the console is closed, over the E hint
		r = run(r.s, ...ticks(30, 1));
		expect(r.s.hint).toBe(`Not yet. ${schedule.hints[0]}`);
		expect(hints(r.effects)).toEqual([]);
		r = run(r.s, { type: 'pressedE', target: 'console' }, mistake);
		expect(r.effects).toEqual([
			{ type: 'openConsole', workspace: 'queue' },
			{ type: 'hint', text: `Not yet. ${schedule.hints[1]}`, kind: 'hint2' }
		]);
	});

	it('takes the walking and E hints down when the console opens, and keeps a miss for a reopen', () => {
		const r = run(atStep(3), ...ticks(25, 1));
		expect(r.s.hint).toBe(eHintText('the treatment console'));
		const open = run(r.s, { type: 'pressedE', target: 'console' });
		expect(open.effects).toEqual([
			{ type: 'openConsole', workspace: 'queue' },
			{ type: 'hint', text: null }
		]);
		const reopen = run(
			open.s,
			mistake,
			{ type: 'consoleClosed' },
			{ type: 'pressedE', target: 'console' }
		);
		expect(reopen.s.hint).toBe(`Not yet. ${schedule.hints[0]}`);
		expect(reopen.effects.at(-1)).toEqual({ type: 'openConsole', workspace: 'queue' });
	});

	it('ignores the console until the step opens it: the last step’s close-out does not count', () => {
		// step 8's console is still open for its beat when step 9 starts
		const next = run(
			atStep(8),
			{ type: 'pressedE', target: 'console' },
			imagesAcquired,
			linac('shift-applied'),
			linac('alignment-verified'),
			cardContinue
		).s;
		expect(next.step).toBe(9);
		for (const ev of [
			mistake,
			linac('treatment-complete'),
			{ type: 'beam', on: true } as TutorialEvent
		])
			expect(run(next, ev)).toEqual({ s: next, effects: [] });
		// once step 9 opens it, they count
		const r = run(next, { type: 'pressedE', target: 'console' }, mistake);
		expect(r.s.misses).toBe(1);
	});

	it('still counts the console’s events while its panel is closed', () => {
		const r = run(
			atStep(9),
			{ type: 'pressedE', target: 'console' },
			{ type: 'consoleClosed' },
			linac('treatment-complete'),
			cardContinue
		);
		expect(r.s.step).toBe(10);
	});

	it('ignores console events outside a console step, and closing when nothing is open', () => {
		for (const s of [OFF, atStep(4), atStep(7), { ...atStep(4), phase: 'dialog' as const }])
			for (const ev of [mistake, linac('chart-opened'), linac('treatment-complete')])
				expect(run(s, ev)).toEqual({ s, effects: [] });
		expect(run(atStep(3), { type: 'consoleClosed' })).toEqual({ s: atStep(3), effects: [] });
		// the next step's event during this one does nothing either
		expect(run(atStep(3), linac('setup-complete'))).toEqual({ s: atStep(3), effects: [] });
	});

	it('reads a console event: a miss, the step’s next event, or nothing', () => {
		const { jody, jordanLookalike } = TUTORIAL_PATIENTS;
		const cases: [LinacEvent, ConsoleProgressKind | undefined, 'miss' | 'progress' | null][] = [
			[{ kind: 'mistake', workspace: 'igrt', code: 'x', message: 'm' }, 'shift-applied', 'miss'],
			[{ kind: 'chart-opened', mrn: jody.mrn }, 'chart-opened', 'miss'],
			[{ kind: 'checked-in', mrn: jordanLookalike.mrn }, 'chart-opened', 'miss'],
			[{ kind: 'chart-opened', mrn: JORDAN_MRN }, 'chart-opened', 'progress'],
			[{ kind: 'checked-in', mrn: JORDAN_MRN }, 'chart-opened', null],
			// another patient's later events are neither Jordan's nor misses
			[{ kind: 'setup-complete', mrn: jody.mrn }, 'setup-complete', null],
			[{ kind: 'alignment-verified', mrn: JORDAN_MRN }, 'shift-applied', null],
			[{ kind: 'treatment-complete', mrn: JORDAN_MRN }, undefined, null]
		];
		for (const [ev, next, want] of cases)
			expect(consoleOutcome(ev, next), `${ev.kind} waiting for ${next}`).toBe(want);
	});

	it('words the misses as the decisions do: "Not yet." with a hint, then the reveal', () => {
		expect(consoleMissText(schedule, 1)).toEqual({
			kind: 'hint1',
			text: `Not yet. ${schedule.hints[0]}`
		});
		expect(consoleMissText(schedule, 2)).toEqual({
			kind: 'hint2',
			text: `Not yet. ${schedule.hints[1]}`
		});
		expect(consoleMissText(schedule, 3)).toEqual({ kind: 'reveal', text: schedule.reveal });
		expect(consoleMissText(schedule, 7).kind).toBe('reveal');
	});
});

describe('step 8: hints by what the console refused', () => {
	const task = CHAPTER_1[7].console!;
	const open = run(atStep(8), { type: 'pressedE', target: 'console' }).s;
	const imaged = run(open, imagesAcquired).s;
	const NEW_IMAGES = /New Daily Setup|Acquire Images/;

	it('after the images, a collision says the couch went past the correction: back with Vert −, then Verify Alignment', () => {
		const r = run(imaged, refused('collision'), refused('collision'), refused('collision'));
		const lines = hints(r.effects);
		expect(r.effects.map((e) => e.type === 'hint' && e.kind)).toEqual(['hint1', 'hint2', 'reveal']);
		expect(lines[0]).toMatch(/^Not yet\. The couch went past the 4 mm correction/);
		for (const l of lines) {
			expect(l).toContain('Vert −');
			expect(l).toContain('Verify Alignment');
			expect(l).not.toMatch(NEW_IMAGES);
		}
		// the reveal says exactly where to stop
		expect(lines[2]).toContain('Vertical residual reads 0 mm');
		expect(r.s.misses).toBe(3);
		expect(r.s.step).toBe(8);
	});

	it('after the images, the other couch refusals point at the correction, never at new images', () => {
		for (const code of ['motion-locked', 'baseline-required', 'verify-before-shift']) {
			const l = hints(run(imaged, refused(code)).effects);
			expect(l, code).toHaveLength(1);
			expect(l[0], code).not.toMatch(NEW_IMAGES);
			expect(l[0], code).toContain('Motion Enable');
		}
	});

	it('before the images, keeps the step’s own hints, which start with taking them', () => {
		expect(hints(run(open, refused('collision')).effects)).toEqual([`Not yet. ${task.hints[0]}`]);
		// and an image refusal after the images (a new daily setup) still points at the images
		expect(hints(run(imaged, refused('verify-before-images')).effects)).toEqual([
			`Not yet. ${task.hints[0]}`
		]);
	});

	it('counts the misses across kinds: hint 1, hint 2, then the reveal of the hints that fit', () => {
		const r = run(open, refused('imaging-not-ready'), imagesAcquired, refused('collision'));
		const lines = hints(r.effects);
		expect(lines[0]).toBe(`Not yet. ${task.hints[0]}`);
		expect(r.effects.filter((e) => e.type === 'hint').at(-1)).toMatchObject({ kind: 'hint2' });
		expect(lines[1]).toContain('Vert −');
		expect(hints(run(r.s, refused('collision')).effects)[0]).toContain(
			'Vertical residual reads 0 mm'
		);
	});

	it('picks the hints from the refusal’s code and the events already in', () => {
		expect(consoleMissText(task, 1, 'collision', 0).text).toBe(`Not yet. ${task.hints[0]}`);
		expect(consoleMissText(task, 1, 'collision', 1).text).toMatch(/went past/);
		expect(consoleMissText(task, 1, undefined, 1).text).toBe(`Not yet. ${task.hints[0]}`);
		expect(consoleMissText(task, 3, 'collision', 2).kind).toBe('reveal');
	});
});

describe('step 9: the geometry hold names its fix with the selected field', () => {
	const task = CHAPTER_1[8].console!;
	const hold = (field: string, planned: string, now = '0°'): TutorialEvent => ({
		type: 'geometryHold',
		hold: { field, mismatches: [{ label: 'Gantry', now, planned }] }
	});
	const cleared: TutorialEvent = { type: 'geometryHold', hold: null };
	const geometryRefused: TutorialEvent = {
		type: 'linac',
		event: {
			kind: 'mistake',
			workspace: 'delivery',
			code: 'geometry-mismatch',
			message: 'Refused.'
		}
	};
	const fieldDelivered: TutorialEvent = {
		type: 'linac',
		event: { kind: 'field-delivered', mrn: JORDAN_MRN, field: 'Right Lateral', index: 0, of: 2 }
	};
	const RIGHT =
		'Hold Move to field until Right Lateral’s gantry reaches 270° and the checklist turns green.';
	const LEFT =
		'Hold Move to field until Left Lateral’s gantry reaches 90° and the checklist turns green.';
	// the console open at step 9, its geometry hold on the right lateral field
	const open = run(atStep(9), hold('Right Lateral', '270°'), {
		type: 'pressedE',
		target: 'console'
	}).s;
	// `seconds` of quarter-second frames with the console open
	const wait = (seconds: number) => ticks(seconds, 0);

	it('a refused beam for the geometry says to hold Move to field, with the field and its angle', () => {
		const r = run(open, geometryRefused, geometryRefused, geometryRefused);
		expect(r.effects).toEqual([
			{ type: 'hint', text: `Not yet. ${RIGHT}`, kind: 'hint1' },
			{
				type: 'hint',
				text: 'Not yet. Press and keep holding Move to field: the machine moves only while it is held. Keep holding until Right Lateral’s gantry reaches 270° and the checklist turns green.',
				kind: 'hint2'
			},
			{
				type: 'hint',
				text: 'Hold Move to field until Right Lateral’s gantry reaches 270° and the checklist turns green, then press Enable Beam and Beam On.',
				kind: 'reveal'
			}
		]);
		expect(r.s.misses).toBe(3);
	});

	it('the hint follows the selected field, and goes once the geometry matches', () => {
		let r = run(open, geometryRefused, hold('Left Lateral', '90°'));
		expect(r.s.hint).toBe(`Not yet. ${LEFT}`);
		expect(hints(r.effects).at(-1)).toBe(`Not yet. ${LEFT}`);
		r = run(r.s, cleared);
		expect(r.s.hint).toBeNull();
		expect(r.effects).toEqual([{ type: 'hint', text: null }]);
		// a later hold (the next field) brings no stale hint back
		expect(run(r.s, hold('Left Lateral', '90°')).s.hint).toBeNull();
	});

	it('other refusals keep the step’s own hints', () => {
		const r = run(open, {
			type: 'linac',
			event: { kind: 'mistake', workspace: 'delivery', code: 'door-open', message: 'Refused.' }
		});
		expect(hints(r.effects)).toEqual([`Not yet. ${task.hints[0]}`]);
		// and they do not follow the hold
		expect(run(r.s, cleared).s.hint).toBe(`Not yet. ${task.hints[0]}`);
	});

	it('with no hold heard, the refusal still names the fix in general', () => {
		const r = run(run(atStep(9), { type: 'pressedE', target: 'console' }).s, geometryRefused);
		expect(r.s.hint).toBe(
			'Not yet. Hold Move to field until the machine reaches the selected field and the checklist turns green.'
		);
	});

	it('names the fix after 20 s of the hold with the console open, and not before', () => {
		let r = run(open, ...wait(19.75));
		expect(r.s.hint).toBeNull();
		r = run(r.s, ...wait(0.25));
		expect(r.s.hint).toBe(RIGHT);
		expect(r.effects).toEqual([{ type: 'hint', text: RIGHT }]);
		// it follows the selected field, and goes when the geometry matches
		expect(run(r.s, hold('Left Lateral', '90°')).s.hint).toBe(LEFT);
		r = run(r.s, cleared);
		expect(r.s.hint).toBeNull();
		expect(r.s.holdSecs).toBe(0);
	});

	it('starts the 20 s again when a field is delivered, a miss shows or the hold clears', () => {
		expect(run(open, ...wait(15), fieldDelivered, ...wait(15)).s.hint).toBeNull();
		expect(
			run(open, ...wait(15), cleared, hold('Left Lateral', '90°'), ...wait(15)).s.hint
		).toBeNull();
		const missed = run(open, ...wait(15), geometryRefused, ...wait(15)).s;
		expect(missed.hint).toBe(`Not yet. ${RIGHT}`);
		expect(run(missed, ...wait(5)).s.hint).toBe(RIGHT);
	});

	it('counts only while the console is open, and not at a step without a hold hint', () => {
		const closed = run(open, { type: 'consoleClosed' }).s;
		expect(run(closed, ...wait(30)).s.holdSecs).toBe(0);
		const igrt = run(atStep(8), hold('Right Lateral', '270°'), {
			type: 'pressedE',
			target: 'console'
		}).s;
		expect(run(igrt, ...wait(30)).s.hint).toBeNull();
	});

	it('keeps the console’s hold from one step to the next', () => {
		const verified = run(
			atStep(8),
			{ type: 'pressedE', target: 'console' },
			imagesAcquired,
			hold('Right Lateral', '270°'),
			linac('shift-applied'),
			linac('alignment-verified'),
			cardContinue
		).s;
		expect(verified.step).toBe(9);
		expect(verified.hold?.field).toBe('Right Lateral');
	});
});

describe('decisions', () => {
	const open = run(atStep(4), { type: 'pressedE', target: 'jordan' }).s;
	const d = CHAPTER_1[3].decision!;

	it('gives a hint, a stronger hint, then the answer at the third miss', () => {
		const { s, effects } = run(
			open,
			{ type: 'answered', option: 'a' },
			{ type: 'answered', option: 'b' },
			{ type: 'answered', option: 'd' }
		);
		expect(effects).toEqual([
			{ type: 'feedback', kind: 'hint1', text: `Not yet. ${d.hints[0]}` },
			{ type: 'feedback', kind: 'hint2', text: `Not yet. ${d.hints[1]}` },
			{ type: 'feedback', kind: 'reveal', text: d.reveal }
		]);
		expect(s.resolved).toBe(true);
		const next = run(s, { type: 'answered', option: 'c' }, { type: 'continue' }, cardContinue);
		expect(next.effects[0]).toEqual({ type: 'closeDialog' });
		expect(next.s.step).toBe(5);
	});

	it('accepts the right answer, and Continue completes the step', () => {
		const r = run(open, { type: 'answered', option: 'c' });
		expect(r.effects).toEqual([{ type: 'feedback', kind: 'correct', text: 'Correct.' }]);
		expect(run(r.s, { type: 'continue' }, cardContinue).s.step).toBe(5);
	});

	it('leads from Continue on the answer to the step card', () => {
		const answered = run(open, { type: 'answered', option: 'c' }).s;
		const r = run(answered, { type: 'continue' });
		expect(r.effects).toEqual([
			{ type: 'closeDialog' },
			{ type: 'action', action: 'jordanConfirms' },
			...cardFor(4)
		]);
		expect(r.s.step).toBe(4);
		expect(r.s.phase).toBe('card');
		// Esc on the answered decision does the same
		expect(run(answered, { type: 'closeDialog' })).toEqual(r);
	});

	it('ignores Continue before the decision is answered', () => {
		const r = run(open, { type: 'answered', option: 'a' }, { type: 'continue' });
		expect(r.s.phase).toBe('dialog');
	});

	it('keeps the misses when the dialog is closed and opened again', () => {
		let r = run(open, { type: 'answered', option: 'a' }, { type: 'closeDialog' });
		expect(r.s.phase).toBe('active');
		expect(r.effects.at(-1)).toEqual({ type: 'closeDialog' });
		r = run(r.s, { type: 'pressedE', target: 'jordan' }, { type: 'answered', option: 'b' });
		expect(r.effects.at(-1)).toMatchObject({ type: 'feedback', kind: 'hint2' });
	});

	it('runs the step’s actions after the answer', () => {
		const r = run(open, { type: 'answered', option: 'c' }, { type: 'continue' }, cardContinue);
		expect(actions(r.effects)).toEqual(['jordanConfirms', 'escortToVault']);
		expect(r.s.step).toBe(5);
	});
});

describe('walking steps', () => {
	it('completes on reaching the target, not on E', () => {
		expect(run(atStep(7), { type: 'pressedE', target: 'linaccontrol' }).s.step).toBe(7);
		const r = run(atStep(7), { type: 'reachedTarget' }, cardContinue);
		expect(actions(r.effects)).toEqual(['holdVaultClosed']);
		expect(r.s.step).toBe(8);
	});

	it('shows hint 1 after 60 s and hint 2 after 120 s without progress, and keeps them', () => {
		const step = CHAPTER_1[6];
		let r = run(atStep(7), ...ticks(59.75, 30));
		expect(hints(r.effects)).toEqual([]);
		r = run(r.s, ...ticks(0.25, 30));
		expect(hints(r.effects)).toEqual([step.hints[0]]);
		// progress restarts the timer but the hint shown stays
		r = run(r.s, ...ticks(30, 20));
		expect(r.s.hint).toBe(step.hints[0]);
		r = run(r.s, ...ticks(120, 20));
		expect(hints(r.effects)).toEqual([step.hints[1]]);
	});

	it('says "Wait for Jordan" while the player is far ahead on an escort', () => {
		let r = run(atStep(5), ...ticks(1, 40, true));
		expect(r.s.hint).toBe(WAIT_FOR_JORDAN);
		r = run(r.s, ...ticks(1, 40, false));
		expect(r.effects.at(-1)).toEqual({ type: 'hint', text: null });
	});

	it('says the waiting line while step 7 is held for Jamie Williams', () => {
		const held = (on: boolean): TutorialEvent => ({
			type: 'tick',
			dt: 0.25,
			distance: 0,
			heldForJamie: on
		});
		let r = run(atStep(7), held(true));
		expect(r.s.hint).toBe(WAIT_FOR_JAMIE);
		expect(r.s.hint).toBe('Waiting for Jamie Williams to join you.');
		r = run(r.s, held(false));
		expect(r.effects.at(-1)).toEqual({ type: 'hint', text: null });
	});

	it('completes an escort when Jordan arrives', () => {
		const r = run(atStep(5), { type: 'reachedTarget' }, cardContinue);
		expect(r.s.step).toBe(6);
	});
});

describe('the step card', () => {
	// step n's card, reached as a player does: E and the dialog's right answer, the console's events
	// for Jordan or the wait; or reaching the target
	const atCard = (n: number): TutorialState => {
		const st = CHAPTER_1[n - 1];
		if (st.trigger !== 'pressE') return run(atStep(n), { type: 'reachedTarget' }).s;
		const right = st.decision?.options.find((o) => o.correct);
		return run(
			atStep(n),
			{ type: 'pressedE', target: st.target.id },
			...((right ? [{ type: 'answered', option: right.id }] : []) as TutorialEvent[]),
			...((st.exchange || st.decision ? [{ type: 'continue' }] : []) as TutorialEvent[]),
			...(st.console?.done ?? []).map(
				(kind) => ({ type: 'linac', event: { kind, mrn: JORDAN_MRN } }) as TutorialEvent
			),
			...ticks(st.afterSeconds ?? 0, 0)
		).s;
	};

	it('shows step 2’s card before the role change', () => {
		let r = run(atStep(2), { type: 'pressedE', target: 'chair' }, ...ticks(6, 0));
		expect(r.effects.slice(-2)).toEqual(cardFor(2));
		expect(r.effects.some((e) => e.type === 'roleChange')).toBe(false);
		expect(r.s).toMatchObject({ step: 2, phase: 'card' });
		r = run(r.s, cardContinue);
		expect(r.effects).toEqual([{ type: 'hideCard' }, { type: 'roleChange', role: 'therapist' }]);
		expect(r.s).toMatchObject({ step: 3, phase: 'roleChange' });
	});

	it('shows step 11’s card before the end', () => {
		let r = run(atStep(11), { type: 'reachedTarget' });
		expect(r.effects).toEqual([{ type: 'action', action: 'jordanThanks' }, ...cardFor(11)]);
		expect(r.s).toMatchObject({ step: 11, phase: 'card' });
		expect(progressOf(r.s)).toBe(1);
		r = run(r.s, cardContinue);
		expect(r.effects).toEqual([{ type: 'hideCard' }, { type: 'complete' }]);
		expect(r.s).toMatchObject({ step: 11, phase: 'done' });
	});

	it('ignores Continue on the card outside the card', () => {
		const dialog = run(atStep(1), { type: 'pressedE', target: 'maya' }).s,
			consoleOpen = run(atStep(3), { type: 'pressedE', target: 'console' }).s,
			waiting = run(atStep(2), { type: 'pressedE', target: 'chair' }).s,
			roleChange = run(atCard(2), cardContinue).s,
			done = run(atCard(11), cardContinue).s;
		for (const s of [OFF, atStep(3), dialog, consoleOpen, waiting, roleChange, done])
			expect(run(s, cardContinue), s.phase).toEqual({ s, effects: [] });
	});

	it('changes nothing on the console, its beam, a frame or E while the card shows', () => {
		for (const n of [3, 7, 9]) {
			const s = atCard(n);
			expect(s.phase, `step ${n}`).toBe('card');
			for (const ev of [
				mistake,
				linac('chart-opened'),
				linac('treatment-complete'),
				{ type: 'beam', on: true },
				{ type: 'beam', on: false },
				...ticks(1, 5),
				{ type: 'pressedE', target: CHAPTER_1[n - 1].target.id },
				{ type: 'pressedE', target: CHAPTER_1[n].target.id }
			] as TutorialEvent[])
				expect(run(s, ev), `step ${n}: ${ev.type}`).toEqual({ s, effects: [] });
		}
	});

	it('fills the bar to the step just done while its card shows', () => {
		for (const n of [1, 5, 9, 11]) expect(progressOf(atCard(n)), `step ${n}`).toBe(n / 11);
		expect(progressOf(atCard(5), 20)).toBe(5 / 20);
	});
});

describe('the E-step hint', () => {
	it('shows after 20 s within 6 m without pressing E', () => {
		let r = run(atStep(1), ...ticks(19.75, 4));
		expect(r.s.hint).toBeNull();
		r = run(r.s, ...ticks(0.25, 4));
		expect(r.s.hint).toBe(eHintText('Maya Brooks'));
		expect(r.s.hint).toBe('Walk up to Maya Brooks and press E when the prompt appears.');
	});

	it('does not count time farther than 6 m away', () => {
		const r = run(atStep(1), ...ticks(30, 6.5));
		expect(r.s.hint).toBeNull();
	});
});

describe('the whole chapter', () => {
	// plays every step the way the run-through check does, answering each decision wrong three times
	// and making three mistakes on each console step before its events for Jordan
	function playThrough() {
		let s = OFF;
		const all: Effect[] = [];
		const go = (...events: TutorialEvent[]) => {
			const r = run(s, ...events);
			s = r.s;
			all.push(...r.effects);
		};
		go({ type: 'start' });
		// capped, so a machine that never finishes fails here instead of hanging the run
		for (let i = 0; s.phase !== 'done'; i++) {
			if (i >= 500)
				throw new Error(`not done after 500 rounds: step ${s.step}, phase '${s.phase}'`);
			const step = CHAPTER_1[s.step - 1];
			if (s.phase === 'roleChange') go({ type: 'roleChangeDone' });
			else if (s.phase === 'waiting') go(...ticks(1, 0));
			else if (s.phase === 'card') go(cardContinue);
			else if (step.trigger !== 'pressE') go({ type: 'reachedTarget' });
			else {
				go({ type: 'pressedE', target: step.target.id });
				const wrong = step.decision?.options.find((o) => !o.correct);
				if (wrong) for (let i = 0; i < 3; i++) go({ type: 'answered', option: wrong.id });
				if (s.phase === 'dialog') go({ type: 'continue' });
				if (s.phase === 'console') {
					go(mistake, mistake, mistake);
					for (const kind of step.console!.done)
						go({ type: 'linac', event: { kind, mrn: JORDAN_MRN } } as TutorialEvent);
				}
			}
		}
		return { s, all };
	}

	it('reaches the end card after all 11 steps', () => {
		const { s, all } = playThrough();
		expect(s.step).toBe(11);
		expect(progressOf(s)).toBe(1);
		expect(all.at(-1)).toEqual({ type: 'complete' });
		expect(
			all.filter((e) => e.type === 'showStep').map((e) => (e as { step: number }).step)
		).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
		// step 4's decision, and the four console steps
		expect(all.filter((e) => e.type === 'feedback' && e.kind === 'reveal')).toHaveLength(1);
		expect(all.filter((e) => e.type === 'hint' && e.kind === 'reveal')).toHaveLength(4);
		expect(
			all.filter((e) => e.type === 'openConsole').map((e) => (e as { workspace: string }).workspace)
		).toEqual(['queue', 'setup', 'igrt', 'delivery']);
		expect(all.filter((e) => e.type === 'closeConsole')).toHaveLength(4);
	});

	it('shows a card after every step, before the next step, the role change or the end', () => {
		const { all } = playThrough();
		const flow = all.flatMap((e) =>
			e.type === 'showCard' || e.type === 'showStep'
				? [`${e.type} ${e.step}`]
				: e.type === 'hideCard' || e.type === 'roleChange' || e.type === 'complete'
					? [e.type]
					: []
		);
		const want = ['showStep 1'];
		for (const st of CHAPTER_1) {
			want.push(`showCard ${st.n}`, 'hideCard');
			const next = CHAPTER_1[st.n];
			if (!next) want.push('complete');
			else {
				if (next.role !== st.role) want.push('roleChange');
				want.push(`showStep ${next.n}`);
			}
		}
		expect(flow).toEqual(want);
		// the hint line is cleared as each card shows
		all.forEach((e, i) => {
			if (e.type === 'showCard') expect(all[i - 1]).toEqual({ type: 'hint', text: null });
		});
	});

	it('runs every world action once, in order', () => {
		expect(actions(playThrough().all)).toEqual([
			'pickChair',
			'sitPlayer',
			'intercomToControl',
			'jordanOnMonitors',
			'jordanConfirms',
			'escortToVault',
			'jordanOnCouch',
			'lasersOn',
			'jamieAcrossCouch',
			'jamieToControl',
			'holdVaultClosed',
			'shiftApplied',
			'beamOff',
			'releaseVaultDoor',
			'jamieBackIn',
			'jordanOffCouch',
			'escortToLobby',
			'jordanThanks'
		]);
	});

	it('ignores events once done', () => {
		const { s } = playThrough();
		for (const ev of [
			{ type: 'pressedE', target: 'reception' },
			{ type: 'reachedTarget' },
			{ type: 'continue' },
			cardContinue,
			mistake,
			linac('treatment-complete'),
			...ticks(1, 0)
		] as TutorialEvent[])
			expect(run(s, ev)).toEqual({ s, effects: [] });
	});
});
