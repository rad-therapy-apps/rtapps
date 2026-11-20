/* The no-scroll rules for the LINAC console's delivery window and charge capture in the center's
   panel (console-screens.ts lays them out): how the interlocks list fits its pane, what the
   Interlocks tab says, and which charge capture tab follows the learner's action; and, in narrow
   short frames, which tab of Machine / Imaging keys a workflow window brings up. Free of DOM
   imports so it is unit tested in Node (console-fit.spec.ts). Pages break as the center's pop-ups
   do (sim-hub/src/pager-math.ts breakPages). */
import { breakPages } from '../../sim-hub/src/pager-math';

export interface Interlock {
	name: string;
	ok: boolean;
	detail: string;
}

/** The interlocks the way the console lists them: the failing ones first, then the passed ones,
    each in the order the app checks them. */
export function splitInterlocks(checks: Interlock[]): {
	failing: Interlock[];
	passed: Interlock[];
} {
	return { failing: checks.filter((c) => !c.ok), passed: checks.filter((c) => c.ok) };
}

/** The Interlocks tab's badge: how many interlocks hold the beam, or that none does. */
export function interlockBadge(failing: number): { text: string; hold: boolean } {
	if (failing <= 0) return { text: 'clear', hold: false };
	return { text: `${failing} hold${failing === 1 ? '' : 's'}`, hold: true };
}

export interface InterlockFit {
	/** How the passed interlocks show: as chips, as one count line, or not at all (none passed). */
	passed: 'chips' | 'count' | 'none';
	/** The blocks on each page, by index: the failing rows 0 … n-1, then the passed block (n). */
	pages: number[][];
}

const FUZZ = 0.5; // sub-pixel heights: a block this much too tall still fits

/** The pages for blocks of `heights` px in a pane `room` px tall with `gap` px between them: one
    page when they all fit, else pages broken between blocks. */
export function fitBlocks(heights: number[], room: number, gap: number): number[][] {
	return breakPages(heights, room + FUZZ, gap);
}

/** How the interlocks fit a pane `room` px tall with `gap` px between blocks. `rows` are the failing
    rows' heights, `chips` the passed chips' block and `count` the passed count line (0 when no
    interlock passed). All of it on one page when it fits; else the passed ones as the count line;
    else pages, the failing rows first. */
export function fitInterlocks(
	rows: number[],
	chips: number,
	count: number,
	room: number,
	gap: number
): InterlockFit {
	const withChips = [...rows, chips],
		total = withChips.reduce((a, h) => a + h, 0) + gap * rows.length;
	if (count > 0 && total <= room + FUZZ)
		return { passed: 'chips', pages: [withChips.map((_, i) => i)] };
	return {
		passed: count > 0 ? 'count' : 'none',
		pages: fitBlocks(count > 0 ? [...rows, count] : rows, room, gap)
	};
}

export type ChargeTab = 'codes' | 'notes' | 'result';
export type ChargeAction = 'open' | 'code' | 'igrt' | 'verify' | 'post';

/** The charge capture tab to show after the learner's action: the code guide when it opens (the
    record once the fraction is posted), the guide again when a code is chosen (it explains the
    choice), the image-guidance notes when the IGRT handling is chosen, and the result after
    Verify or Post. */
export function chargeTabFor(action: ChargeAction, posted: boolean): ChargeTab {
	if (action === 'open') return posted ? 'result' : 'codes';
	if (action === 'code') return 'codes';
	if (action === 'igrt') return 'notes';
	return 'result';
}

export type KeyTab = 'couch' | 'beam';

/** The tab of Machine / Imaging keys a workflow window brings up where the keys show one tab at a
    time (narrow, short frames): image guidance presses kV Imaging and the couch keys, delivery holds
    Move to field. Any other window, or none, keeps the tab the learner picked (null). */
export function keyTabFor(openWindow: string | null): KeyTab | null {
	if (openWindow === 'igrtPanel') return 'couch';
	if (openWindow === 'deliveryPanel') return 'beam';
	return null;
}
