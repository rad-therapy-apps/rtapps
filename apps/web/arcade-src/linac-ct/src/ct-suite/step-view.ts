/* Console mode's step-focused control column (the owner's rule: nothing in a console scrolls): which
   workflow step's controls show, the chips that stand for the other steps, and the one-line summary
   each finished step's chip shows. The workflow itself (S.step in console.ts, moved by setStep) is
   unchanged; this only decides what the column shows. console-steps.ts draws it; free of scene and
   DOM imports so it is unit tested in Node (step-view.spec.ts). */
import { ctStepLabel } from './ct-state';

/** The workflow's steps, 1..6: protocol, technique, position, topogram, range, scan. */
export const STEP_COUNT = 6;

/** A chip above the open step's controls. A finished step (`done`) shows its summary and opens that
    step again; `back` is the current step's chip, shown while a finished one is open. */
export interface StepChip {
	n: number;
	kind: 'done' | 'back';
	/** This chip's step is the one open. */
	open: boolean;
	/** Nothing may go back while a scan runs (the suite ignores those controls then). */
	disabled: boolean;
}

/** The chips for workflow step `current` with step `open` showing: one per finished step, in order,
    then the current step's when it is not the one open. */
export function stepChips(current: number, open: number, scanning: boolean): StepChip[] {
	const chips: StepChip[] = [];
	for (let n = 1; n < current; n++)
		chips.push({ n, kind: 'done', open: n === open, disabled: scanning });
	if (open !== current) chips.push({ n: current, kind: 'back', open: false, disabled: false });
	return chips;
}

/** The step that shows after a tap on step `n`'s chip: a finished step opens, or closes again when it
    is open; the current step's chip goes back to it. Nothing changes while a scan runs or for a step
    not reached yet. */
export function openAfterTap(n: number, open: number, current: number, scanning: boolean): number {
	if (n > current) return open;
	if (n === current) return current;
	if (scanning) return open;
	return n === open ? current : n;
}

/** What the console shows of a finished step. */
export interface StepFacts {
	/** The protocol's name, e.g. "Prostate SBRT". */
	protocol: string;
	/** The habitus picked, 'small' | 'average' | 'large', or '' for none. */
	habitus: string;
	kv: number;
	mas: number;
	/** The isocentre's table position as the console shows it, e.g. "47.0 cm". */
	iso: string;
	/** The scan range's ends as the console shows them, e.g. "S2.8 cm" and "S8.3 cm". */
	rangeStart: string;
	rangeEnd: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The one-line summary on a finished step's chip, e.g. "Large · 140 kVp · 310 mAs". */
export function stepSummary(n: number, f: StepFacts): string {
	switch (n) {
		case 1:
			return f.protocol;
		case 2:
			return [f.habitus ? cap(f.habitus) : '', `${f.kv} kVp`, `${f.mas} mAs`]
				.filter(Boolean)
				.join(' · ');
		case 3:
			return `Iso ${f.iso}`;
		case 4:
			return 'Topogram';
		case 5:
			return `Range ${f.rangeStart.replace(/ cm$/, '')}–${f.rangeEnd}`;
		default:
			return ctStepLabel(n);
	}
}

/** The chip's text: a finished step's summary with a tick, or the way back to the current step. */
export function chipText(chip: StepChip, f: StepFacts): string {
	return chip.kind === 'done' ? `✓ ${stepSummary(chip.n, f)}` : `Back to ${ctStepLabel(chip.n)}`;
}

/** The chip's full name for screen readers and its tooltip, e.g. "Step 1 · Protocol: Prostate SBRT". */
export function chipName(chip: StepChip, f: StepFacts): string {
	return chip.kind === 'done'
		? `${ctStepLabel(chip.n)}: ${stepSummary(chip.n, f)}`
		: `Back to ${ctStepLabel(chip.n)}`;
}
