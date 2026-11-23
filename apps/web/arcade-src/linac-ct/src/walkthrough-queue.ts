/* The Tutorial's step 3 walkthrough on the LINAC console's queue (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Step 3, today's schedule"): the queue, the two
   Jordan Ellis rows, then Check In and Open Chart on Jordan's. walkthrough-mode.ts runs it while
   the console shows the queue. Jordan's row and the look-alike's are found by what they show (the
   name and the date of birth in TUTORIAL_PATIENTS), not by their place: Jody shares Jordan's date
   of birth and the look-alike Jordan's name, so it takes both. Check In and Open Chart are done
   once the console reports them for Jordan's MRN; the look-alike's are refused, so they never
   count. The sub-steps are pure, so walkthrough-queue.spec.ts tests them with made-up snapshots;
   read() is the DOM side. */
import { TUTORIAL_PATIENTS } from '../../shared/console-protocol';
import type { ConsoleEvent } from './console-hooks';
import type { WalkPart } from './walkthrough-part';

export interface QueueSnap {
	/** Jordan's row and the look-alike's on the queue's page shown, by :nth-child (from 1); null when
	    the row is not on it. */
	jordanRow: number | null;
	lookalikeRow: number | null;
	/** Every event the console has reported this page load. */
	events: readonly ConsoleEvent[];
}

const ROWS = '#rtv2QueueRows .rtv2-queue-row';
/** The selector of the queue row at `n` (from 1) on the page shown. */
export const queueRow = (n: number): string => `${ROWS}:nth-child(${n})`;

const JORDAN = TUTORIAL_PATIENTS.jordan;

const reported = (s: QueueSnap, kind: 'checked-in' | 'chart-opened') =>
	s.events.some((e) => e.kind === kind && e.mrn === JORDAN.mrn);

const jordanKey = (s: QueueSnap, key: string) =>
	s.jordanRow === null ? [] : [`${queueRow(s.jordanRow)} ${key}`];

/** The :nth-child (from 1) of the row that shows this patient's name and date of birth, or null. */
function rowOf(rows: readonly Element[], p: { name: string; born: string }): number | null {
	const row = rows.find(
		(r) =>
			r.querySelector('.rtv2-qpatient b')?.textContent?.trim() === p.name &&
			!!r.querySelector('.rtv2-qpatient span')?.textContent?.includes(`Born ${p.born}`)
	);
	return row?.parentElement ? [...row.parentElement.children].indexOf(row) + 1 : null;
}

export const QUEUE_WALK: WalkPart<QueueSnap> = {
	id: 'queue',
	header: "Today's schedule",
	steps: [
		{
			id: 'queue.intro',
			kind: 'explain',
			text: {
				do: "This is today's treatment queue for LINAC 1.",
				why: 'Every patient booked on this machine today, in order.'
			},
			targets: () => ['#rtv2Home .rtv2-queue-title']
		},
		{
			id: 'queue.twins',
			kind: 'explain',
			text: {
				do: 'Two patients are called Jordan Ellis.',
				why: "Jordan told reception they were born March 14, 1968, and is booked in Vault 1 at 9:00. That's row #02."
			},
			targets: (s) =>
				[s.lookalikeRow, s.jordanRow].filter((n) => n !== null).map((n) => queueRow(n))
		},
		{
			id: 'queue.checkin',
			kind: 'do',
			text: {
				do: "Press Check In on Jordan's row.",
				why: 'It tells the team Jordan is here and ready to be called.'
			},
			targets: (s) => jordanKey(s, '.rtv2-checkin'),
			done: (s) => reported(s, 'checked-in'),
			cue: 'Press Check In'
		},
		{
			id: 'queue.chart',
			kind: 'do',
			text: {
				do: 'Press Open Chart.',
				why: "The chart holds Jordan's plan, setup instructions and treatment record."
			},
			targets: (s) => jordanKey(s, '.rtv2-openchart'),
			done: (s) => reported(s, 'chart-opened'),
			cue: 'Press Open Chart'
		}
	],
	read(events) {
		const rows = [...document.querySelectorAll(ROWS)];
		return {
			jordanRow: rowOf(rows, JORDAN),
			lookalikeRow: rowOf(rows, TUTORIAL_PATIENTS.jordanLookalike),
			events
		};
	}
};
