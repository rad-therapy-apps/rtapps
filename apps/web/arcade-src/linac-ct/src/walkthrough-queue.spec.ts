import { describe, expect, it } from 'vitest';
import { TUTORIAL_PATIENTS } from '../../shared/console-protocol';
import { currentIndex } from '../../shared/walkthrough-core';
import type { ConsoleEvent } from './console-hooks';
import { QUEUE_WALK, queueRow, type QueueSnap } from './walkthrough-queue';

const JORDAN = TUTORIAL_PATIENTS.jordan.mrn,
	LOOKALIKE = TUTORIAL_PATIENTS.jordanLookalike.mrn;
const snap = (events: ConsoleEvent[] = [], o: Partial<QueueSnap> = {}): QueueSnap => ({
	jordanRow: 2,
	lookalikeRow: 1,
	events,
	...o
});
const steps = QUEUE_WALK.steps,
	at = (s: QueueSnap, seen: string[] = [], reached = 0) =>
		currentIndex(steps, s, new Set(seen), reached);
const step = (id: string) => steps.find((s) => s.id === id);

describe("step 3's walkthrough, today's schedule", () => {
	it('has the four sub-steps, explains first', () => {
		expect(QUEUE_WALK.header).toBe("Today's schedule");
		expect(steps.map((s) => [s.id, s.kind])).toEqual([
			['queue.intro', 'explain'],
			['queue.twins', 'explain'],
			['queue.checkin', 'do'],
			['queue.chart', 'do']
		]);
	});

	it('moves on by Next, then by Check In and Open Chart for Jordan', () => {
		expect(at(snap())).toBe(0);
		expect(at(snap(), ['queue.intro'])).toBe(1);
		expect(at(snap(), ['queue.intro', 'queue.twins'])).toBe(2);
		const checkedIn: ConsoleEvent[] = [{ kind: 'checked-in', mrn: JORDAN }];
		expect(at(snap(checkedIn), ['queue.intro', 'queue.twins'])).toBe(3);
		expect(
			at(snap([...checkedIn, { kind: 'chart-opened', mrn: JORDAN }]), [
				'queue.intro',
				'queue.twins'
			])
		).toBe(4);
	});

	it("does not count the look-alike's check-in or chart", () => {
		const seen = ['queue.intro', 'queue.twins'];
		expect(at(snap([{ kind: 'checked-in', mrn: LOOKALIKE }]), seen)).toBe(2);
		expect(
			at(
				snap([
					{ kind: 'checked-in', mrn: JORDAN },
					{ kind: 'chart-opened', mrn: LOOKALIKE }
				]),
				seen
			)
		).toBe(3);
	});

	it("targets the heading, both Jordan Ellis rows, then row #02's buttons", () => {
		const s = snap();
		expect(step('queue.intro').targets(s)).toEqual(['#rtv2Home .rtv2-queue-title']);
		expect(step('queue.twins').targets(s)).toEqual([queueRow(1), queueRow(2)]);
		expect(step('queue.checkin').targets(s)).toEqual([
			'#rtv2QueueRows .rtv2-queue-row:nth-child(2) .rtv2-checkin'
		]);
		expect(step('queue.chart').targets(s)).toEqual([
			'#rtv2QueueRows .rtv2-queue-row:nth-child(2) .rtv2-openchart'
		]);
	});

	it('follows the rows where they are, and points at none that is not shown', () => {
		const s = snap([], { jordanRow: 1, lookalikeRow: null });
		expect(step('queue.twins').targets(s)).toEqual([queueRow(1)]);
		expect(step('queue.checkin').targets(s)).toEqual([`${queueRow(1)} .rtv2-checkin`]);
		const none = snap([], { jordanRow: null, lookalikeRow: null });
		expect(step('queue.checkin').targets(none)).toEqual([]);
		expect(step('queue.chart').targets(none)).toEqual([]);
	});

	it("names Jordan's date of birth, vault and time as the schedule has them", () => {
		const p = TUTORIAL_PATIENTS.jordan,
			why = step('queue.twins').text.why;
		expect(why).toContain(`born ${p.born}`);
		expect(why).toContain(`booked in ${p.vault} at ${p.time}`);
		expect(step('queue.checkin').cue).toBe('Press Check In');
		expect(step('queue.chart').cue).toBe('Press Open Chart');
	});
});
