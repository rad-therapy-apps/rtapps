import { describe, it, expect } from 'vitest';
import { OFF, progressOf, reduceTutorial } from './tutorial-machine';
import type { Effect, TutorialEvent, TutorialState } from './tutorial-machine';
import { CHAPTER_1, WAIT_FOR_JAMIE, WAIT_FOR_JORDAN, eHintText } from './tutorial-steps';

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

	it('moves on to step 2 after the exchange, picking the chair', () => {
		const { s, effects } = run(
			atStep(1),
			{ type: 'pressedE', target: 'maya' },
			{ type: 'continue' }
		);
		expect(s.step).toBe(2);
		expect(s.phase).toBe('active');
		expect(effects.slice(1)).toEqual([
			{ type: 'closeDialog' },
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
		expect(r.s.phase).toBe('roleChange');
		expect(r.s.step).toBe(3);
		expect(r.effects).toContainEqual({ type: 'roleChange', role: 'therapist' });
		expect(progressOf(r.s)).toBeCloseTo(2 / 11);
		r = run(r.s, { type: 'roleChangeDone' });
		expect(r.s.phase).toBe('active');
		expect(r.effects[0]).toEqual({ type: 'showStep', step: 3 });
	});

	it('counts the beam down for 10 s, then turns it off', () => {
		let r = run(atStep(9), { type: 'pressedE', target: 'console' });
		expect(actions(r.effects)).toEqual(['beamOn']);
		expect(hints(r.effects)).toEqual(['Beam on · 10 s']);
		r = run(r.s, ...ticks(1, 0));
		expect(hints(r.effects)).toEqual(['Beam on · 9 s']);
		r = run(r.s, ...ticks(9, 0));
		expect(actions(r.effects)).toEqual(['beamOff', 'releaseVaultDoor', 'jamieBackIn']);
		expect(r.s.step).toBe(10);
	});
});

describe('decisions', () => {
	const open = run(atStep(3), { type: 'pressedE', target: 'console' }).s;
	const d = CHAPTER_1[2].decision!;

	it('gives a hint, a stronger hint, then the answer with its reason at the third miss', () => {
		const { s, effects } = run(
			open,
			{ type: 'answered', option: 'a' },
			{ type: 'answered', option: 'c' },
			{ type: 'answered', option: 'a' }
		);
		expect(effects).toEqual([
			{ type: 'feedback', kind: 'hint1', text: `Not yet. ${d.hints[0]}` },
			{ type: 'feedback', kind: 'hint2', text: `Not yet. ${d.hints[1]}` },
			{ type: 'feedback', kind: 'reveal', text: `${d.reveal} ${d.reason}` }
		]);
		expect(s.resolved).toBe(true);
		const next = run(s, { type: 'answered', option: 'b' }, { type: 'continue' });
		expect(next.effects[0]).toEqual({ type: 'closeDialog' });
		expect(next.s.step).toBe(4);
	});

	it('accepts the right answer with its reason, and Continue completes the step', () => {
		const r = run(open, { type: 'answered', option: 'b' });
		expect(r.effects).toEqual([
			{ type: 'feedback', kind: 'correct', text: `Correct. ${d.reason}` }
		]);
		expect(run(r.s, { type: 'continue' }).s.step).toBe(4);
	});

	it('ignores Continue before the decision is answered', () => {
		const r = run(open, { type: 'answered', option: 'a' }, { type: 'continue' });
		expect(r.s.phase).toBe('dialog');
	});

	it('keeps the misses when the dialog is closed and opened again', () => {
		let r = run(open, { type: 'answered', option: 'a' }, { type: 'closeDialog' });
		expect(r.s.phase).toBe('active');
		expect(r.effects.at(-1)).toEqual({ type: 'closeDialog' });
		r = run(r.s, { type: 'pressedE', target: 'console' }, { type: 'answered', option: 'c' });
		expect(r.effects.at(-1)).toMatchObject({ type: 'feedback', kind: 'hint2' });
	});

	it('runs the step’s actions after the answer', () => {
		const r = run(
			run(atStep(6), { type: 'pressedE', target: 'couch' }).s,
			{ type: 'answered', option: 'c' },
			{ type: 'continue' }
		);
		expect(actions(r.effects)).toEqual([
			'jordanOnCouch',
			'lasersOn',
			'jamieAcrossCouch',
			'jamieToControl'
		]);
		expect(r.s.step).toBe(7);
	});
});

describe('walking steps', () => {
	it('completes on reaching the target, not on E', () => {
		expect(run(atStep(7), { type: 'pressedE', target: 'linaccontrol' }).s.step).toBe(7);
		const r = run(atStep(7), { type: 'reachedTarget' });
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
		const r = run(atStep(5), { type: 'reachedTarget' });
		expect(r.s.step).toBe(6);
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
			else if (step.trigger !== 'pressE') go({ type: 'reachedTarget' });
			else {
				go({ type: 'pressedE', target: step.target.id });
				const wrong = step.decision?.options.find((o) => !o.correct);
				if (wrong) for (let i = 0; i < 3; i++) go({ type: 'answered', option: wrong.id });
				if (s.phase === 'dialog') go({ type: 'continue' });
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
		expect(all.filter((e) => e.type === 'feedback' && e.kind === 'reveal')).toHaveLength(4);
	});

	it('runs every world action once, in order', () => {
		expect(actions(playThrough().all)).toEqual([
			'pickChair',
			'sitPlayer',
			'intercomToControl',
			'jordanConfirms',
			'escortToVault',
			'jordanOnCouch',
			'lasersOn',
			'jamieAcrossCouch',
			'jamieToControl',
			'holdVaultClosed',
			'shiftApplied',
			'beamOn',
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
			...ticks(1, 0)
		] as TutorialEvent[])
			expect(run(s, ev)).toEqual({ s, effects: [] });
	});
});
