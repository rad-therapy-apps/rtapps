/* The Tutorial walkthroughs' shared rules (docs/specs/2026-11-23-tutorial-walkthrough-design.md). A
   walkthrough is a list of sub-steps, each one bubble of the spotlight (coach.ts). An explain
   sub-step is done once its Next is pressed; a do sub-step once the page's state shows it done. The
   current sub-step is the first one not done at or after the furthest one reached, so a sub-step
   already done when it comes up is passed over, and one passed never comes back (the runner keeps
   the furthest reached). The center's getting started (sim-hub tutorial-guide.ts) and the LINAC
   console's four walkthroughs (linac-ct walkthrough-mode.ts) use them. Pure, so it is unit tested
   in Node (walkthrough-core.spec.ts). */

export type SubKind = 'explain' | 'do';

export interface SubStep<Snap> {
	/** Unique on the page ("setup.headrest"): an explain's Next is remembered by it. */
	id: string;
	kind: SubKind;
	/** The bubble's instruction and its how-it-works line; {name} tokens are filled from tokens(). */
	text: { do: string; why: string };
	/** CSS selectors of the cut-outs in this state; none for a sub-step with nothing to point at. */
	targets(snap: Snap): readonly string[];
	/** A drag: the item's selector and its drop zone's, both cut out with an arrow between. */
	drag?(snap: Snap): { from: string; to: string } | null;
	/** A do sub-step: the page's state shows it done. */
	done?(snap: Snap): boolean;
	/** False: the sub-step does not apply in this state and is passed over (default true). */
	applies?(snap: Snap): boolean;
	tokens?(snap: Snap): Readonly<Record<string, string>>;
	/** A do sub-step's waiting cue in the bubble's footer ("Drag it to the table"). */
	cue?: string;
}

/** The footer's cue for a do sub-step that names none. */
export const DEFAULT_CUE = 'Your turn';

export function isDone<Snap>(s: SubStep<Snap>, snap: Snap, seen: ReadonlySet<string>): boolean {
	if (s.applies && !s.applies(snap)) return true;
	return s.kind === 'explain' ? seen.has(s.id) : !!s.done?.(snap);
}

/** The current sub-step: the first not done at or after `reached`, the furthest one reached so far;
    `steps.length` once every one is done. */
export function currentIndex<Snap>(
	steps: readonly SubStep<Snap>[],
	snap: Snap,
	seen: ReadonlySet<string>,
	reached: number
): number {
	let i = Math.max(0, reached);
	while (i < steps.length && isDone(steps[i], snap, seen)) i++;
	return i;
}

/** `text` with each {name} replaced by its token; a token not given stays as written. */
export function fillTokens(text: string, tokens?: Readonly<Record<string, string>>): string {
	return text.replace(/\{(\w+)\}/g, (m, k: string) => tokens?.[k] ?? m);
}
