/* The Tutorial's spotlight (docs/specs/2026-11-23-tutorial-walkthrough-design.md, "The spotlight"):
   a dim layer over the page with cut-outs onto the one thing to use next, and a bubble beside them
   that says what to do and how it works. DOM only, no three.js, so the center (sim-hub
   tutorial-guide.ts) and the LINAC console (linac-ct walkthrough-mode.ts) both use it; its pure
   geometry is coach-geometry.ts. A caller calls showCoach with the current sub-step as often as it
   likes (each frame is fine: the same view is not rebuilt), and hideCoach when the walkthrough
   ends. */

export type CoachDim = 'full' | 'light' | 'none';

export interface CoachView {
	/** The cut-outs: the elements to use now (none for a sub-step with nothing to point at). */
	targets: readonly Element[];
	/** A drag: the item and where it goes, both cut out, with a dashed arrow between them. */
	drag?: { from: Element; to: Element };
	/** 'full' 66%, 'light' 34%, 'none' no dim layer (the bubble only). */
	dim: CoachDim;
	/** Clicks, drags and keys outside the cut-outs do nothing (Esc, and keys aimed at a focused
	    cut-out or at the bubble, still work). */
	lock: boolean;
	/** The part's name, in the bubble's header beside the dots. */
	header: string;
	/** One dot per sub-step: those before `index` done, `index` the current one. */
	dots: { count: number; index: number };
	text: { do: string; why: string };
	/** 'next': a sub-step that only explains; 'wait': one the player does, with its cue. */
	footer: { kind: 'next' } | { kind: 'wait'; cue: string };
	onNext?: () => void;
	onSkip: () => void;
}

/** Shows `view`, replacing the one shown (Task 1 builds it; until then nothing shows). */
export function showCoach(view: CoachView): void {
	void view;
}

/** Hides the spotlight and its bubble, and drops the key filter. */
export function hideCoach(): void {}

/** Whether the spotlight is showing. */
export function coachShown(): boolean {
	return false;
}
