/* The sim-hub tutorial's step machine (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3):
   a pure reducer over Chapter 1's steps (tutorial-steps.ts). Events in (start, a frame's tick with
   the walking distance, E on a target, reaching a target, an answer, Continue, closing the dialog,
   the role change finishing, stop); a new state and a list of effects out, which tutorial.ts
   performs (tracker, dialog, hint line, role change, world actions). It holds the hint timers and
   the decision miss counter, mirroring the CT console's validateTechnique: "Not yet." with a hint,
   a stronger hint, then the answer and its reason at the third miss. */
import { CHAPTER_1, WAIT_FOR_JAMIE, WAIT_FOR_JORDAN, eHintText } from './tutorial-steps';
import type { Role, Step, StepAction, TargetId } from './tutorial-steps';
import {
	eHintDue,
	missFeedback,
	newStuckTimer,
	stepNear,
	stepStuck,
	stuckLevel
} from './tutorial-math';
import type { FeedbackKind, StuckTimer } from './tutorial-math';

export type Phase = 'off' | 'active' | 'dialog' | 'waiting' | 'roleChange' | 'done';

export interface TutorialState {
	phase: Phase;
	/** The current step, 1-based (0 when off). */
	step: number;
	/** Wrong answers to the current step's decision. */
	misses: number;
	/** The decision was answered right, or its answer shown: Continue completes the step. */
	resolved: boolean;
	/** Seconds left of the step's afterSeconds ('waiting'). */
	wait: number;
	stuck: StuckTimer;
	/** Seconds within E_HINT_R of the target (press-E steps). */
	near: number;
	/** The walking hint reached this step (it never goes back down). */
	hintLevel: 0 | 1 | 2;
	/** The E-step hint is due (it stays for the step). */
	eHint: boolean;
	/** The hint line as last emitted. */
	hint: string | null;
}

export type TutorialEvent =
	| { type: 'start' }
	| {
			type: 'tick';
			dt: number;
			distance: number;
			escortAhead?: boolean;
			/** At the step's room, held there until Jamie Williams has walked out (step 7). */
			heldForJamie?: boolean;
	  }
	| { type: 'pressedE'; target: TargetId }
	| { type: 'reachedTarget' }
	| { type: 'answered'; option: string }
	| { type: 'continue' }
	| { type: 'closeDialog' }
	| { type: 'roleChangeDone' }
	| { type: 'stop' };

export type Effect =
	| { type: 'showStep'; step: number }
	| { type: 'action'; action: StepAction }
	| { type: 'openDialog'; step: number }
	| { type: 'feedback'; kind: FeedbackKind; text: string }
	| { type: 'closeDialog' }
	| { type: 'hint'; text: string | null }
	| { type: 'roleChange'; role: Role }
	| { type: 'complete' };

export const OFF: TutorialState = {
	phase: 'off',
	step: 0,
	misses: 0,
	resolved: false,
	wait: 0,
	stuck: newStuckTimer(),
	near: 0,
	hintLevel: 0,
	eHint: false,
	hint: null
};

function fresh(step: number, phase: Phase): TutorialState {
	return { ...OFF, phase, step, stuck: newStuckTimer() };
}

function countdownText(template: string, secondsLeft: number): string {
	return template.replace('{s}', String(Math.max(0, Math.ceil(secondsLeft - 1e-9))));
}

/** The share of the chapter done, for the tracker's bar: completed steps over all steps. */
export function progressOf(s: TutorialState, total = CHAPTER_1.length): number {
	if (s.phase === 'done') return 1;
	if (s.phase === 'off') return 0;
	return (s.step - 1) / total;
}

export function reduceTutorial(
	s: TutorialState,
	ev: TutorialEvent,
	steps: readonly Step[] = CHAPTER_1
): { state: TutorialState; effects: Effect[] } {
	const fx: Effect[] = [];
	const out = (state: TutorialState) => ({ state, effects: fx });
	const cur: Step | undefined = steps[s.step - 1];
	const actions = (list?: readonly StepAction[]) => {
		for (const action of list ?? []) fx.push({ type: 'action', action });
	};
	const enter = (n: number): TutorialState => {
		fx.push({ type: 'showStep', step: n }, { type: 'hint', text: null });
		actions(steps[n - 1].onStart);
		return fresh(n, 'active');
	};
	const complete = (st: TutorialState): TutorialState => {
		actions(cur?.onComplete);
		if (st.step >= steps.length) {
			fx.push({ type: 'hint', text: null }, { type: 'complete' });
			return fresh(st.step, 'done');
		}
		const next = steps[st.step];
		if (cur && next.role !== cur.role) {
			fx.push({ type: 'hint', text: null }, { type: 'roleChange', role: next.role });
			return fresh(st.step + 1, 'roleChange');
		}
		return enter(st.step + 1);
	};
	const trigger = (st: TutorialState): TutorialState => {
		if (!cur) return st;
		actions(cur.onTrigger);
		if (cur.afterSeconds) {
			const hint = cur.countdown ? countdownText(cur.countdown, cur.afterSeconds) : null;
			if (hint !== st.hint) fx.push({ type: 'hint', text: hint });
			return { ...st, phase: 'waiting', wait: cur.afterSeconds, hint };
		}
		return complete(st);
	};

	switch (ev.type) {
		case 'start':
			return out(enter(1));
		case 'stop':
			return out(OFF);
		case 'tick': {
			if (!cur) return out(s);
			if (s.phase === 'waiting') {
				const wait = s.wait - ev.dt;
				if (wait <= 1e-9) return out(complete({ ...s, wait: 0 }));
				const hint = cur.countdown ? countdownText(cur.countdown, wait) : null;
				if (hint !== s.hint) fx.push({ type: 'hint', text: hint });
				return out({ ...s, wait, hint });
			}
			if (s.phase !== 'active') return out(s);
			const pressE = cur.trigger === 'pressE',
				stuck = stepStuck(s.stuck, ev.dt, ev.distance),
				near = pressE ? stepNear(s.near, ev.dt, ev.distance) : 0,
				hintLevel = Math.max(s.hintLevel, stuckLevel(stuck.idle)) as 0 | 1 | 2,
				eHint = s.eHint || (pressE && eHintDue(near));
			const hint = ev.escortAhead
				? WAIT_FOR_JORDAN
				: ev.heldForJamie
					? WAIT_FOR_JAMIE
					: eHint
						? eHintText(cur.target.name)
						: hintLevel
							? cur.hints[hintLevel - 1]
							: null;
			if (hint !== s.hint) fx.push({ type: 'hint', text: hint });
			return out({ ...s, stuck, near, hintLevel, eHint, hint });
		}
		case 'pressedE': {
			if (!cur || s.phase !== 'active' || cur.trigger !== 'pressE' || ev.target !== cur.target.id)
				return out(s);
			if (cur.decision || cur.exchange) {
				fx.push({ type: 'openDialog', step: s.step });
				return out({ ...s, phase: 'dialog', resolved: false });
			}
			return out(trigger(s));
		}
		case 'reachedTarget': {
			if (!cur || s.phase !== 'active' || cur.trigger === 'pressE') return out(s);
			return out(trigger(s));
		}
		case 'answered': {
			const d = cur?.decision;
			if (!d || s.phase !== 'dialog' || s.resolved) return out(s);
			const opt = d.options.find((o) => o.id === ev.option);
			if (!opt) return out(s);
			if (opt.correct) {
				fx.push({
					type: 'feedback',
					kind: 'correct',
					text: `Correct. ${d.reason}`
				});
				return out({ ...s, resolved: true });
			}
			const misses = s.misses + 1,
				kind = missFeedback(misses),
				text =
					kind === 'reveal'
						? `${d.reveal} ${d.reason}`
						: `Not yet. ${d.hints[kind === 'hint1' ? 0 : 1]}`;
			fx.push({ type: 'feedback', kind, text });
			return out({ ...s, misses, resolved: kind === 'reveal' });
		}
		case 'continue': {
			// Continue shows only on the exchange and on an answered decision
			if (!cur || s.phase !== 'dialog' || !(cur.exchange || s.resolved)) return out(s);
			fx.push({ type: 'closeDialog' });
			return out(trigger({ ...s, phase: 'active' }));
		}
		case 'closeDialog': {
			// Esc: an answered decision completes as Continue would; otherwise E opens it again,
			// with its misses kept
			if (!cur || s.phase !== 'dialog') return out(s);
			fx.push({ type: 'closeDialog' });
			if (cur.decision && s.resolved) return out(trigger({ ...s, phase: 'active' }));
			return out({ ...s, phase: 'active' });
		}
		case 'roleChangeDone':
			if (s.phase !== 'roleChange') return out(s);
			return out(enter(s.step));
	}
}
