/* The sim-hub tutorial's step machine (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3):
   a pure reducer over Chapter 1's steps (tutorial-steps.ts). Events in (start, a frame's tick with
   the walking distance, E on a target, reaching a target, an answer, Continue, closing the dialog,
   an event from the LINAC console, its beam turning on or off, its geometry hold, the player
   closing the console, the role change finishing, stop); a new state and a list of effects out,
   which tutorial.ts performs (tracker, dialog, hint line, console, role change, world actions). It
   holds the hint timers and the miss counter of a decision or a console step, mirroring the CT
   console's validateTechnique: "Not yet." with a hint, a stronger hint, then the answer and its
   reason at the third miss. A console step (docs/specs/2026-11-18-consoles-in-center-design.md,
   part 6) opens the console on E and is triggered by Jordan's events on it, in order; its misses
   show in the hint line. The delivery step's hints also follow the console's geometry hold (the
   selected field off the plan): a refused beam for it names the fix with the field, as does its
   hold hint once the hold has stayed HOLD_HINT_S with the console open and no field delivered (a
   timer like the E-step hint's); both follow the hold as it changes and go when it clears. */
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
import type { LinacEvent, LinacGeometryHold, LinacWorkspace } from '../../shared/console-protocol';
import {
	eHintDue,
	fillGoal,
	GOAL,
	holdHintDue,
	missFeedback,
	newStuckTimer,
	stepHold,
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
	/** This step has opened its console: only then do the console's events count for it (not the
	    last step's, still open for its close-out). */
	consoleOpened: boolean;
	/** The console step's last miss feedback, kept in the hint line while the console is closed. */
	missHint: string | null;
	/** That miss's text before its {goal} was filled, when it names the geometry hold's fix: filled
	    again as the hold changes, and dropped with the miss when the hold clears. */
	missTemplate: string | null;
	/** The LINAC console's geometry hold as it last posted it (the selected field off the plan). */
	hold: LinacGeometryHold | null;
	/** Seconds a console step's console has been open with the hold on, since the hold came, a field
	    was delivered or a miss (ConsoleTask.holdHint). */
	holdSecs: number;
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
	/** The LINAC console's geometry hold, from each state it posts (console-bus.ts
	    linacGeometryHold). */
	| { type: 'geometryHold'; hold: LinacGeometryHold | null }
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
	/** The console step is done: "Correct." and why, in the hint line for a few seconds. */
	| { type: 'correct'; text: string }
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
	consoleOpened: false,
	missHint: null,
	missTemplate: null,
	hold: null,
	holdSecs: 0,
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

/** The hint line for the n-th miss on a console step: hint 1, hint 2, then the reveal, from the
    task's hints for this refusal (`code`, with `progress` of its `done` events in) if it has
    some, else its own. */
export function consoleMissText(
	task: ConsoleTask,
	misses: number,
	code?: string,
	progress = 0
): { kind: MissKind; text: string } {
	const kind = missFeedback(misses),
		heard = task.done.slice(0, progress),
		h =
			task.refusals?.find(
				(r) => code !== undefined && r.codes.includes(code) && (!r.after || heard.includes(r.after))
			) ?? task;
	return {
		kind,
		text: kind === 'reveal' ? h.reveal : `Not yet. ${h.hints[kind === 'hint1' ? 0 : 1]}`
	};
}

/** A console step's own line in the hint line: its hold hint once due, else its last miss's. */
function consoleHint(s: TutorialState, task: ConsoleTask | undefined): string | null {
	if (task?.holdHint && s.hold && holdHintDue(s.holdSecs)) return fillGoal(task.holdHint, s.hold);
	return s.missHint;
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
		// the console's hold is the console's, not the step's
		return { ...fresh(n, 'active'), hold: s.hold };
	};
	/** `st` with the console step's line in the hint line, while its console is open. */
	const showConsoleHint = (st: TutorialState): TutorialState => {
		if (st.phase !== 'console') return st;
		const hint = consoleHint(st, cur?.console);
		if (hint !== st.hint) fx.push({ type: 'hint', text: hint });
		return { ...st, hint };
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
			// the console open: only the hold timer runs (the console's hints are its own)
			if (s.phase === 'console') {
				if (!cur.console?.holdHint) return out(s);
				return out(showConsoleHint({ ...s, holdSecs: stepHold(s.holdSecs, ev.dt, !!s.hold) }));
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
					: (consoleHint(s, cur.console) ?? walking);
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
				// the walking and E hints are done with; a miss's hint stays for the reopened console
				const hint = consoleHint(s, cur.console);
				if (hint !== s.hint) fx.push({ type: 'hint', text: hint });
				return out({ ...s, phase: 'console', consoleOpened: true, hint });
			}
			return out(trigger(s));
		}
		case 'linac': {
			// only the console this step opened counts, open or closed (closing the panel holds the beam,
			// and reopening it lets the player resume); the last step's, still open for its close-out,
			// does not
			const task = cur?.console;
			if (!task || !s.consoleOpened || (s.phase !== 'console' && s.phase !== 'active'))
				return out(s);
			const outcome = consoleOutcome(ev.event, task.done[s.progress]);
			if (outcome === 'miss') {
				// a miss shows at once, and the hold timer starts again
				const misses = s.misses + 1,
					code = ev.event.kind === 'mistake' ? ev.event.code : undefined,
					{ kind, text: template } = consoleMissText(task, misses, code, s.progress),
					text = fillGoal(template, s.hold);
				fx.push({ type: 'hint', text, kind });
				return out({
					...s,
					misses,
					missHint: text,
					missTemplate: template.includes(GOAL) ? template : null,
					holdSecs: 0,
					hint: text
				});
			}
			// a field delivered is progress: the hold timer starts again
			if (ev.event.kind === 'field-delivered' && ev.event.mrn === JORDAN_MRN)
				return out(showConsoleHint({ ...s, holdSecs: 0 }));
			if (outcome !== 'progress') return out(s);
			const progress = s.progress + 1;
			if (progress < task.done.length) return out({ ...s, progress });
			fx.push({ type: 'closeConsole' }, { type: 'correct', text: `Correct. ${task.reason}` });
			return out(trigger({ ...s, progress, phase: 'active' }));
		}
		case 'beam': {
			// the step's boards follow the console's beam: on, and off between fields
			const beam = cur?.console?.beam;
			if (
				!beam ||
				!s.consoleOpened ||
				(s.phase !== 'console' && s.phase !== 'active') ||
				ev.on === s.beamOn
			)
				return out(s);
			actions([ev.on ? beam.on : beam.off]);
			return out({ ...s, beamOn: ev.on });
		}
		case 'geometryHold': {
			// the hold's fix follows the hold; once it clears, its miss and timer go with it
			const st: TutorialState = { ...s, hold: ev.hold, holdSecs: ev.hold ? s.holdSecs : 0 };
			if (s.missTemplate) {
				st.missHint = ev.hold ? fillGoal(s.missTemplate, ev.hold) : null;
				if (!ev.hold) st.missTemplate = null;
			}
			return out(showConsoleHint(st));
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
