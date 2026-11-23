import { describe, expect, it } from 'vitest';
import { TUTORIAL_PATIENTS } from '../../shared/console-protocol';
import { currentIndex } from '../../shared/walkthrough-core';
import type { ConsoleEvent } from './console-hooks';
import { SETUP_WALK, shelfDevice, type SetupSnap } from './walkthrough-setup';

const JORDAN = TUTORIAL_PATIENTS.jordan.mrn,
	JODY = TUTORIAL_PATIENTS.jody.mrn;
const snap = (o: Partial<SetupSnap> = {}): SetupSnap => ({
	onTable: [],
	position: false,
	indexing: false,
	events: [],
	...o
});
const steps = SETUP_WALK.steps,
	at = (s: SetupSnap, seen: string[] = [], reached = 0) =>
		currentIndex(steps, s, new Set(seen), reached);
const step = (id: string) => steps.find((s) => s.id === id);
const EXPLAINS = ['setup.order', 'setup.key'];
const complete = (mrn: string): ConsoleEvent[] => [{ kind: 'setup-complete', mrn }];

describe("step 6's walkthrough, the couch setup", () => {
	it('has the seven sub-steps, explains first', () => {
		expect(SETUP_WALK.id).toBe('setup');
		expect(SETUP_WALK.header).toBe('Patient setup');
		expect(steps.map((s) => [s.id, s.kind])).toEqual([
			['setup.order', 'explain'],
			['setup.key', 'explain'],
			['setup.headrest', 'do'],
			['setup.mask', 'do'],
			['setup.position', 'do'],
			['setup.indexing', 'do'],
			['setup.verify', 'do']
		]);
	});

	it('moves on by Next, then by each device on the table, each tick and Verify for Jordan', () => {
		expect(at(snap())).toBe(0);
		expect(at(snap(), ['setup.order'])).toBe(1);
		expect(at(snap(), EXPLAINS)).toBe(2);
		expect(at(snap({ onTable: ['headrest'] }), EXPLAINS)).toBe(3);
		const both = { onTable: ['headrest', 'headMask'] };
		expect(at(snap(both), EXPLAINS)).toBe(4);
		expect(at(snap({ ...both, position: true }), EXPLAINS)).toBe(5);
		const ticked = { ...both, position: true, indexing: true };
		expect(at(snap(ticked), EXPLAINS)).toBe(6);
		expect(at(snap({ ...ticked, events: complete(JORDAN) }), EXPLAINS)).toBe(7);
		expect(steps).toHaveLength(7);
	});

	it('passes over a sub-step already done when it comes up', () => {
		// the mask on the table and Position ticked before their turn
		const s = snap({ onTable: ['headMask', 'headrest'], position: true });
		expect(at(s, EXPLAINS)).toBe(5);
		// Indexing ticked first: the headrest is next, then the mask, then Position, then Verify
		const early = snap({ indexing: true });
		expect(at(early, EXPLAINS)).toBe(2);
		expect(at(snap({ onTable: ['headrest', 'headMask'], indexing: true }), EXPLAINS)).toBe(4);
		expect(
			at(snap({ onTable: ['headrest', 'headMask'], position: true, indexing: true }), EXPLAINS)
		).toBe(6);
	});

	it('never goes back to a sub-step passed, but explains wait for their Next', () => {
		// the furthest reached holds once a device or a tick is undone
		expect(at(snap(), EXPLAINS, 4)).toBe(4);
		expect(at(snap({ onTable: ['headrest'] }), [], 0)).toBe(0);
	});

	it("counts only Jordan's setup-complete for Verify", () => {
		const ready = snap({ onTable: ['headrest', 'headMask'], position: true, indexing: true });
		expect(at({ ...ready, events: complete(JODY) }, EXPLAINS)).toBe(6);
		expect(at({ ...ready, events: complete('') }, EXPLAINS)).toBe(6);
		expect(
			at({ ...ready, events: [{ kind: 'checked-in', mrn: JORDAN }, ...complete(JORDAN)] }, EXPLAINS)
		).toBe(7);
	});

	it('targets the order, the key and the position, then each drag, tick and Verify', () => {
		const s = snap();
		expect(step('setup.order').targets(s)).toEqual(['#immobilizationOrderSummary']);
		expect(step('setup.key').targets(s)).toEqual([
			'#immobilizationOrderSummary .immo-key',
			'#immobilizationPosition'
		]);
		expect(step('setup.headrest').targets(s)).toEqual([]);
		expect(step('setup.headrest').drag(s)).toEqual({
			from: '#immobilizationShelf .immo-device[aria-label="Headrest"]',
			to: '#immobilizationTableDrop'
		});
		expect(step('setup.mask').targets(s)).toEqual([]);
		expect(step('setup.mask').drag(s)).toEqual({
			from: '#immobilizationShelf .immo-device[aria-label="Short Head Mask"]',
			to: '#immobilizationTableDrop'
		});
		expect(step('setup.position').targets(s)).toEqual(['#immoPositionCheck']);
		expect(step('setup.indexing').targets(s)).toEqual(['#immoIndexCheck']);
		expect(step('setup.verify').targets(s)).toEqual(['#immobilizationVerify']);
		// only the two drags have one
		expect(steps.filter((x) => x.drag).map((x) => x.id)).toEqual(['setup.headrest', 'setup.mask']);
	});

	it('finds each device by the label the shelf shows, wherever the shuffle puts it', () => {
		expect(shelfDevice('Headrest')).not.toMatch(/nth-child/);
		for (const id of ['setup.headrest', 'setup.mask']) {
			const s = step(id),
				name = s.text.do.match(/^Drag the (.+) onto the treatment table\.$/)?.[1];
			expect(s.drag(snap()).from).toBe(shelfDevice(name));
		}
	});

	it('has no tokens to fill, and the cues the spec names', () => {
		expect(steps.every((s) => !s.tokens && !/\{\w+\}/.test(s.text.do + s.text.why))).toBe(true);
		expect(steps.filter((s) => s.kind === 'do').map((s) => s.cue)).toEqual([
			'Drag it to the table',
			'Drag it to the table',
			'Tick Position',
			'Tick Indexing',
			'Press Verify'
		]);
	});
});
