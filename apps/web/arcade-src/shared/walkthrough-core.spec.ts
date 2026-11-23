import { describe, expect, it } from 'vitest';
import { DEFAULT_CUE, currentIndex, fillTokens, isDone } from './walkthrough-core';
import type { SubStep } from './walkthrough-core';

interface Snap {
	armed: boolean;
	moved: boolean;
	hold: boolean;
}
const none = () => [];
const STEPS: SubStep<Snap>[] = [
	{ id: 't.intro', kind: 'explain', text: { do: 'Intro', why: '' }, targets: none },
	{
		id: 't.arm',
		kind: 'do',
		text: { do: 'Arm', why: '' },
		targets: () => ['#arm'],
		done: (s) => s.armed
	},
	{
		id: 't.hold',
		kind: 'explain',
		text: { do: 'Hold', why: '' },
		targets: none,
		applies: (s) => s.hold
	},
	{
		id: 't.move',
		kind: 'do',
		text: { do: 'Move', why: '' },
		targets: () => ['#move'],
		done: (s) => s.moved
	}
];
const snap = (o: Partial<Snap> = {}): Snap => ({ armed: false, moved: false, hold: true, ...o });

describe('isDone', () => {
	it('counts an explain done once its Next is remembered, and a do from the state', () => {
		expect(isDone(STEPS[0], snap(), new Set())).toBe(false);
		expect(isDone(STEPS[0], snap(), new Set(['t.intro']))).toBe(true);
		expect(isDone(STEPS[1], snap(), new Set())).toBe(false);
		expect(isDone(STEPS[1], snap({ armed: true }), new Set())).toBe(true);
	});
	it('passes over a sub-step that does not apply', () => {
		expect(isDone(STEPS[2], snap({ hold: false }), new Set())).toBe(true);
	});
});

describe('currentIndex', () => {
	it('starts at the first explain', () => {
		expect(currentIndex(STEPS, snap(), new Set(), 0)).toBe(0);
	});
	it('moves to the do sub-step after Next, and on when its state shows it done', () => {
		const seen = new Set(['t.intro']);
		expect(currentIndex(STEPS, snap(), seen, 0)).toBe(1);
		expect(currentIndex(STEPS, snap({ armed: true }), seen, 1)).toBe(2);
	});
	it('passes over a do sub-step already done when it comes up', () => {
		expect(currentIndex(STEPS, snap({ armed: true }), new Set(['t.intro']), 0)).toBe(2);
	});
	it('never goes back below the furthest reached, even when an earlier state undoes itself', () => {
		expect(currentIndex(STEPS, snap({ armed: false }), new Set(['t.intro']), 2)).toBe(2);
	});
	it('passes over an explain that does not apply', () => {
		expect(currentIndex(STEPS, snap({ armed: true, hold: false }), new Set(['t.intro']), 0)).toBe(
			3
		);
	});
	it('is the length once every sub-step is done', () => {
		const seen = new Set(['t.intro', 't.hold']);
		expect(currentIndex(STEPS, snap({ armed: true, moved: true }), seen, 0)).toBe(STEPS.length);
	});
});

describe('fillTokens', () => {
	it('fills each token it is given and keeps the rest as written', () => {
		expect(
			fillTokens('Press {key} until {axis} is 0 ({x}).', { key: 'Vert +', axis: 'Vert' })
		).toBe('Press Vert + until Vert is 0 ({x}).');
		expect(fillTokens('No tokens here.')).toBe('No tokens here.');
	});
});

it('names a default waiting cue', () => {
	expect(DEFAULT_CUE.length).toBeGreaterThan(0);
});
