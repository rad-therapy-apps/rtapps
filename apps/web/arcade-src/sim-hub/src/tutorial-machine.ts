/* The sim-hub tutorial's step machine (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3):
   a pure reducer over Chapter 1's steps (tutorial-steps.ts). Events in (start, a frame's tick with
   the walking distance, E on a target, reaching a target, an answer, Continue, closing the dialog,
   an event from the LINAC console, its beam turning on or off, the player closing the console, the
   role change finishing, stop); a new state and a list of effects out, which tutorial.ts performs (tracker, dialog, hint
   line, console, role change, world actions). It holds the hint timers and the miss counter of a
   decision or a console step, mirroring the CT console's validateTechnique: "Not yet." with a
   hint, a stronger hint, then the answer and its reason at the third miss. A console step
   (docs/specs/2026-11-18-consoles-in-center-design.md, part 6) opens the console on E and is
   triggered by Jordan's events on it, in order; its misses show in the hint line. */
import {
	CHAPTER_1,
	JORDAN_MRN,
	WAIT_FOR_JAMIE,
	WAIT_FOR_JORDAN,
	eHintText
} from './tutorial-steps';
import type {
	ConsoleProgressKind,
	ConsoleTask,
	Role,
	Step,
	StepAction,
	TargetId
} from './tutorial-steps';
import type { LinacEvent, LinacWorkspace } from '../../shared/console-protocol';
import {
	eHintDue,
	missFeedback,
	newStuckTimer,
	stepNear,
	stepStuck,
	stuckLevel
} from './tutorial-math';
import type { FeedbackKind, StuckTimer } from './tutorial-math';

/** 'console': a console step's console is open (E opened it, and the player has not closed it). */
export type Phase = 'off' | 'active' | 'dialog' | 'console' | 'waiting' | 'roleChange' | 'done';

export interface TutorialState {
	phase: Phase;
	/** The current step, 1-based (0 when off). */
	step: number;
	/** Wrong answers to the current step's decision, or misses on its console. */
	misses: number;
	/** How many of the console step's events (ConsoleTask.done) have come, in order. */
	progress: number;
	/** The console step's last miss feedback, kept in the hint line while the console is closed. */
	missHint: string | null;
	/** The console's beam as the step's world actions last showed it (ConsoleTask.beam). */
	beamOn: boolean;
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
	/** An event from the LINAC console (console-bus.ts linacEvents). */
	| { type: 'linac'; event: LinacEvent }
	/** The LINAC console's beam, from each pose it posts (console-bus.ts linacPose). */
	| { type: 'beam'; on: boolean }
	/** The player closed the console panel. */
	| { type: 'consoleClosed' }
	| { type: 'roleChangeDone' }
	| { type: 'stop' };

export type Effect =
	| { type: 'showStep'; step: number }
	| { type: 'action'; action: StepAction }
	| { type: 'openDialog'; step: number }
	| { type: 'feedback'; kind: FeedbackKind; text: string }
	| { type: 'closeDialog' }
	/** Open the LINAC console, tutorial scenario, at this workspace. */
	| { type: 'openConsole'; workspace: LinacWorkspace }
	/** The console step is done: close the console after a beat (tutorial.ts). */
	| { type: 'closeConsole' }
	/** `kind`: the line is a console step's miss feedback. */
	| { type: 'hint'; text: string | null; kind?: MissKind }
	| { type: 'roleChange'; role: Role }
	| { type: 'complete' };

/** The feedback of a console step's miss (tutorial-math.ts missFeedback). */
export type MissKind = Exclude<FeedbackKind, 'correct'>;

export const OFF: TutorialState = {
	phase: 'off',
	step: 0,
	misses: 0,
	progress: 0,
	missHint: null,
	beamOn: false,
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

/** What a LINAC console event means to a console step waiting for `next`, the next of its events
    for Jordan: a miss (the console refused an action, or another patient's chart was opened or
    check-in made), that next event, or nothing (an event of another step, or out of order). */
export function consoleOutcome(
	ev: LinacEvent,
	next: ConsoleProgressKind | undefined,
	mrn: string = JORDAN_MRN
): 'miss' | 'progress' | null {
	if (ev.kind === 'mistake') return 'miss';
	if (ev.mrn !== mrn) return ev.kind === 'chart-opened' || ev.kind === 'checked-in' ? 'miss' : null;
	return ev.kind === next ? 'progress' : null;
}

/** The hint line for the n-th miss on a console step: hint 1, hint 2, then the reveal. */
export function consoleMissText(
	task: ConsoleTask,
	misses: number
): { kind: MissKind; text: string } {
	const kind = missFeedback(misses);
	return {
		kind,
		text: kind === 'reveal' ? task.reveal : `Not yet. ${task.hints[kind === 'hint1' ? 0 : 1]}`
	};
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
		if (cur.afterSeconds) return { ...st, phase: 'waiting', wait: cur.afterSeconds };
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
				return out({ ...s, wait });
			}
			if (s.phase !== 'active') return out(s);
			const pressE = cur.trigger === 'pressE',
				stuck = stepStuck(s.stuck, ev.dt, ev.distance),
				near = pressE ? stepNear(s.near, ev.dt, ev.distance) : 0,
				hintLevel = Math.max(s.hintLevel, stuckLevel(stuck.idle)) as 0 | 1 | 2,
				eHint = s.eHint || (pressE && eHintDue(near));
			const walking = eHint
				? eHintText(cur.target.name)
				: hintLevel
					? cur.hints[hintLevel - 1]
					: null;
			// a console step's last miss stays in the hint line: the player has found the console
			const hint = ev.escortAhead
				? WAIT_FOR_JORDAN
				: ev.heldForJamie
					? WAIT_FOR_JAMIE
					: (s.missHint ?? walking);
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
			if (cur.console) {
				fx.push({ type: 'openConsole', workspace: cur.console.workspace });
				return out({ ...s, phase: 'console' });
			}
			return out(trigger(s));
		}
		case 'linac': {
			// only the current console step's console counts, open or closed (a beam the player left
			// running still completes the step)
			const task = cur?.console;
			if (!task || (s.phase !== 'console' && s.phase !== 'active')) return out(s);
			const outcome = consoleOutcome(ev.event, task.done[s.progress]);
			if (outcome === 'miss') {
				const misses = s.misses + 1,
					{ kind, text } = consoleMissText(task, misses);
				fx.push({ type: 'hint', text, kind });
				return out({ ...s, misses, missHint: text, hint: text });
			}
			if (outcome !== 'progress') return out(s);
			const progress = s.progress + 1;
			if (progress < task.done.length) return out({ ...s, progress });
			fx.push({ type: 'closeConsole' });
			return out(trigger({ ...s, progress, phase: 'active' }));
		}
		case 'beam': {
			// the step's boards follow the console's beam: on, and off between fields
			const beam = cur?.console?.beam;
			if (!beam || (s.phase !== 'console' && s.phase !== 'active') || ev.on === s.beamOn)
				return out(s);
			actions([ev.on ? beam.on : beam.off]);
			return out({ ...s, beamOn: ev.on });
		}
		case 'consoleClosed': {
			// closed before the step is done: the step stays, and E opens the console again
			if (!cur?.console || s.phase !== 'console') return out(s);
			return out({ ...s, phase: 'active' });
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
