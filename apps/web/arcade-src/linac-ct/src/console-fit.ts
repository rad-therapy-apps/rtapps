/* The no-scroll rules for the LINAC console's delivery window and charge capture in the center's
   panel (console-screens.ts lays them out): how the interlocks list fits its pane, what the
   Interlocks tab says, and which charge capture tab follows the learner's action; and, in narrow
   short frames, which tab of Machine / Imaging keys a workflow window brings up. For the extra
   workflow windows (OIS / R&V, Adaptive, SRS / SBRT): how a table pages under its header, how a
   grid of cards pages by rows, and which tab each window shows after the learner's action. Free of
   DOM imports so it is unit tested in Node (console-fit.spec.ts). Pages break as the center's
   pop-ups do (sim-hub/src/pager-math.ts breakPages). */
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

/** The page (from 0) that holds block `block`; -1 when no page does. */
export function pageOfBlock(pages: number[][], block: number): number {
	return pages.findIndex((p) => p.includes(block));
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

/** The pages for a table's rows under its header row, which shows on every page. `header` is the
    header row's height and `rows` the other rows' heights; block 0 is the header, block i + 1 row i. */
export function fitTable(header: number, rows: number[], room: number, gap: number): number[][] {
	if (!rows.length) return [[0]];
	return fitBlocks(rows, room - header - gap, gap).map((page) => [0, ...page.map((i) => i + 1)]);
}

/** The pages for blocks laid out `cols` to a row (a grid), each row as tall as its tallest block:
    pages break between rows. One column is a plain list (fitBlocks). */
export function fitGrid(heights: number[], cols: number, room: number, gap: number): number[][] {
	const rows: number[][] = [];
	heights.forEach((_, i) => (i % cols ? rows[rows.length - 1].push(i) : rows.push([i])));
	const tallest = rows.map((row) => Math.max(...row.map((i) => heights[i])));
	return fitBlocks(tallest, room, gap).map((page) => page.flatMap((r) => rows[r]));
}

export type OisTab = 'record' | 'fields' | 'trail' | 'signoff';

/** The OIS / R&V tab the window opens on: the sign-off once the fraction's charge is posted and
    the record waits for the therapist, else the verification record. */
export function oisTabOnOpen(posted: boolean, signed: boolean): OisTab {
	return posted && !signed ? 'signoff' : 'record';
}

export type AdaptiveTab = 'anatomy' | 'plans' | 'approval' | 'course' | 'history';
export type AdaptiveAction = 'open' | 'assess' | 'compare' | 'check' | 'approve' | 'next' | 'reset';

/** The adaptive window's tab after the learner's action: it opens where the review stands (the
    anatomy, the plans once compared, the approval once approved); Assess Anatomy and the next
    fraction show the day's anatomy, Compare Plans the plans, the review's checks and Approve the
    approval steps, and restoring the teaching baseline the course history. */
export function adaptiveTabFor(
	action: AdaptiveAction,
	review: { compared: boolean; approved: boolean }
): AdaptiveTab {
	if (action === 'open')
		return review.approved ? 'approval' : review.compared ? 'plans' : 'anatomy';
	if (action === 'compare') return 'plans';
	if (action === 'check' || action === 'approve') return 'approval';
	if (action === 'reset') return 'history';
	return 'anatomy';
}

export type SrsTab = 'checklist' | 'timeout';
export type SrsAction = 'open' | 'clearance' | 'dryrun' | 'approve';

/** The SRS / SBRT window's tab after the learner's action: opening it, Recheck Clearance and Dry
    Run show the checklist they update; Approve Timeout keeps the tab the learner is on (null). */
export function srsTabFor(action: SrsAction): SrsTab | null {
	return action === 'approve' ? null : 'checklist';
}
