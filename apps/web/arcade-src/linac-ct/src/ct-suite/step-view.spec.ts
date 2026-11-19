import { describe, it, expect } from 'vitest';
import {
	chipName,
	chipText,
	openAfterTap,
	stepChips,
	stepSummary,
	type StepFacts
} from './step-view';

const facts: StepFacts = {
	protocol: 'Prostate SBRT',
	habitus: 'large',
	kv: 140,
	mas: 310,
	iso: '47.0 cm',
	rangeStart: 'S2.8 cm',
	rangeEnd: 'S8.3 cm'
};

describe('stepChips', () => {
	it('gives each finished step a chip, in order, and none for the open current step', () => {
		expect(stepChips(4, 4, false)).toEqual([
			{ n: 1, kind: 'done', open: false, disabled: false },
			{ n: 2, kind: 'done', open: false, disabled: false },
			{ n: 3, kind: 'done', open: false, disabled: false }
		]);
	});
	it('gives no chips on the first step', () => {
		expect(stepChips(1, 1, false)).toEqual([]);
	});
	it('marks a reopened step and adds the way back to the current step', () => {
		expect(stepChips(3, 1, false)).toEqual([
			{ n: 1, kind: 'done', open: true, disabled: false },
			{ n: 2, kind: 'done', open: false, disabled: false },
			{ n: 3, kind: 'back', open: false, disabled: false }
		]);
	});
	it('disables the finished steps while a scan runs', () => {
		expect(stepChips(6, 6, true).map((c) => c.disabled)).toEqual([true, true, true, true, true]);
	});
});

describe('openAfterTap', () => {
	it('opens a finished step, and closes it again back to the current step', () => {
		expect(openAfterTap(2, 5, 5, false)).toBe(2);
		expect(openAfterTap(2, 2, 5, false)).toBe(5);
	});
	it('moves from one finished step to another', () => {
		expect(openAfterTap(1, 3, 5, false)).toBe(1);
	});
	it('goes back to the current step from its chip', () => {
		expect(openAfterTap(5, 2, 5, false)).toBe(5);
	});
	it('keeps the open step while a scan runs', () => {
		expect(openAfterTap(3, 6, 6, true)).toBe(6);
	});
	it('ignores a step not reached yet', () => {
		expect(openAfterTap(4, 2, 2, false)).toBe(2);
	});
});

describe('stepSummary', () => {
	it('sums up each finished step in a line', () => {
		expect([1, 2, 3, 4, 5].map((n) => stepSummary(n, facts))).toEqual([
			'Prostate SBRT',
			'Large · 140 kVp · 310 mAs',
			'Iso 47.0 cm',
			'Topogram',
			'Range S2.8–S8.3 cm'
		]);
	});
	it('leaves out a habitus not picked', () => {
		expect(stepSummary(2, { ...facts, habitus: '' })).toBe('140 kVp · 310 mAs');
	});
});

describe('chipText and chipName', () => {
	it('ticks a finished step and names it in full for screen readers', () => {
		const chip = { n: 1, kind: 'done' as const, open: false, disabled: false };
		expect(chipText(chip, facts)).toBe('✓ Prostate SBRT');
		expect(chipName(chip, facts)).toBe('Step 1 · Protocol: Prostate SBRT');
	});
	it('names the way back to the current step', () => {
		const chip = { n: 5, kind: 'back' as const, open: false, disabled: false };
		expect(chipText(chip, facts)).toBe('Back to Step 5 · Range');
		expect(chipName(chip, facts)).toBe('Back to Step 5 · Range');
	});
});
