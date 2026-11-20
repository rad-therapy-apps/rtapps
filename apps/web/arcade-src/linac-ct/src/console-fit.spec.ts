import { describe, expect, it } from 'vitest';
import {
	adaptiveTabFor,
	chargeTabFor,
	fitBlocks,
	fitGrid,
	fitInterlocks,
	fitTable,
	interlockBadge,
	keyTabFor,
	oisTabOnOpen,
	pageOfBlock,
	splitInterlocks,
	srsTabFor
} from './console-fit';

const check = (name: string, ok: boolean) => ({ name, ok, detail: `${name} detail` });

describe('splitInterlocks', () => {
	it('lists the failing interlocks first, each group in the order the app checks them', () => {
		const { failing, passed } = splitInterlocks([
			check('Patient', true),
			check('Door', false),
			check('Setup', true),
			check('IGRT', false)
		]);
		expect(failing.map((c) => c.name)).toEqual(['Door', 'IGRT']);
		expect(passed.map((c) => c.name)).toEqual(['Patient', 'Setup']);
	});
});

describe('interlockBadge', () => {
	it('counts the holds, one or many', () => {
		expect(interlockBadge(1)).toEqual({ text: '1 hold', hold: true });
		expect(interlockBadge(3)).toEqual({ text: '3 holds', hold: true });
	});
	it('says clear when nothing holds the beam', () => {
		expect(interlockBadge(0)).toEqual({ text: 'clear', hold: false });
	});
});

describe('fitBlocks', () => {
	it('keeps every block on one page when they fit', () => {
		expect(fitBlocks([100, 60, 40], 210, 5)).toEqual([[0, 1, 2]]);
	});
	it('breaks between blocks, never inside one, when they do not', () => {
		expect(fitBlocks([100, 60, 40], 170, 5)).toEqual([[0, 1], [2]]);
		expect(fitBlocks([300, 40], 170, 5)).toEqual([[0], [1]]);
	});
});

describe('pageOfBlock', () => {
	it('finds the page a block is on', () => {
		expect(pageOfBlock([[0, 1], [2, 3], [4]], 0)).toBe(0);
		expect(pageOfBlock([[0, 1], [2, 3], [4]], 3)).toBe(1);
		expect(pageOfBlock([[0, 1], [2, 3], [4]], 4)).toBe(2);
	});
	it('is -1 for a block on no page, or none', () => {
		expect(pageOfBlock([[0, 1]], 5)).toBe(-1);
		expect(pageOfBlock([[0, 1]], -1)).toBe(-1);
	});
});

describe('fitInterlocks', () => {
	it('shows the passed interlocks as chips when everything fits', () => {
		// 40 + 4 + 40 + 4 + 60 = 148
		expect(fitInterlocks([40, 40], 60, 20, 150, 4)).toEqual({
			passed: 'chips',
			pages: [[0, 1, 2]]
		});
	});
	it('folds the passed interlocks into a count line when the chips do not fit', () => {
		// with chips 148 > 120; with the count 40 + 4 + 40 + 4 + 20 = 108
		expect(fitInterlocks([40, 40], 60, 20, 120, 4)).toEqual({
			passed: 'count',
			pages: [[0, 1, 2]]
		});
	});
	it('pages the failing rows when even the count line does not fit, the count line last', () => {
		expect(fitInterlocks([40, 40, 40], 60, 20, 90, 4)).toEqual({
			passed: 'count',
			pages: [
				[0, 1],
				[2, 3]
			]
		});
	});
	it('has no passed block when no interlock passed', () => {
		expect(fitInterlocks([40, 40], 0, 0, 100, 4)).toEqual({ passed: 'none', pages: [[0, 1]] });
		expect(fitInterlocks([40, 40], 0, 0, 60, 4)).toEqual({ passed: 'none', pages: [[0], [1]] });
	});
	it('shows the chips alone when every interlock passed', () => {
		expect(fitInterlocks([], 60, 20, 100, 4)).toEqual({ passed: 'chips', pages: [[0]] });
		expect(fitInterlocks([], 120, 20, 100, 4)).toEqual({ passed: 'count', pages: [[0]] });
	});
	it('lets a block a fraction of a pixel too tall still fit', () => {
		expect(fitInterlocks([50.3], 0, 0, 50, 4).pages).toEqual([[0]]);
	});
});

describe('chargeTabFor', () => {
	it('opens on the code guide, or on the record once the fraction is posted', () => {
		expect(chargeTabFor('open', false)).toBe('codes');
		expect(chargeTabFor('open', true)).toBe('result');
	});
	it('follows each choice to the text that explains it, and Verify and Post to the result', () => {
		expect(chargeTabFor('code', false)).toBe('codes');
		expect(chargeTabFor('igrt', false)).toBe('notes');
		expect(chargeTabFor('verify', false)).toBe('result');
		expect(chargeTabFor('post', true)).toBe('result');
	});
});

describe('keyTabFor', () => {
	it("brings up image guidance's couch keys and delivery's beam keys", () => {
		expect(keyTabFor('igrtPanel')).toBe('couch');
		expect(keyTabFor('deliveryPanel')).toBe('beam');
	});
	it('keeps the picked tab for any other window, or none', () => {
		expect(keyTabFor('immobilizationPanel')).toBeNull();
		expect(keyTabFor('chargeCapturePanel')).toBeNull();
		expect(keyTabFor(null)).toBeNull();
	});
});

describe('fitTable', () => {
	it('keeps the header and every row on one page when they fit', () => {
		// 20 + 2 + 30 + 2 + 30 = 84
		expect(fitTable(20, [30, 30], 84, 2)).toEqual([[0, 1, 2]]);
	});
	it('repeats the header on every page, breaking between rows', () => {
		// room for rows under the header: 70 - 20 - 2 = 48, one 30 px row a page
		expect(fitTable(20, [30, 30, 30], 70, 2)).toEqual([
			[0, 1],
			[0, 2],
			[0, 3]
		]);
	});
	it('is the header alone when the table has no rows', () => {
		expect(fitTable(20, [], 70, 2)).toEqual([[0]]);
	});
});

describe('fitGrid', () => {
	it('is a plain list in one column', () => {
		expect(fitGrid([100, 60, 40], 1, 170, 5)).toEqual(fitBlocks([100, 60, 40], 170, 5));
	});
	it('breaks between rows, each as tall as its tallest block', () => {
		// rows of three: [80, 120, 100] is 120 tall, [60] 60 tall; 120 + 5 + 60 = 185
		expect(fitGrid([80, 120, 100, 60], 3, 190, 5)).toEqual([[0, 1, 2, 3]]);
		expect(fitGrid([80, 120, 100, 60], 3, 150, 5)).toEqual([[0, 1, 2], [3]]);
	});
});

describe('oisTabOnOpen', () => {
	it('opens on the sign-off when the posted record waits for the therapist', () => {
		expect(oisTabOnOpen(true, false)).toBe('signoff');
	});
	it('opens on the verification record before the charge is posted and once signed', () => {
		expect(oisTabOnOpen(false, false)).toBe('record');
		expect(oisTabOnOpen(true, true)).toBe('record');
	});
});

describe('adaptiveTabFor', () => {
	const fresh = { compared: false, approved: false };
	it('opens where the review stands', () => {
		expect(adaptiveTabFor('open', fresh)).toBe('anatomy');
		expect(adaptiveTabFor('open', { compared: true, approved: false })).toBe('plans');
		expect(adaptiveTabFor('open', { compared: true, approved: true })).toBe('approval');
	});
	it('follows each action to what it changes', () => {
		expect(adaptiveTabFor('assess', fresh)).toBe('anatomy');
		expect(adaptiveTabFor('compare', fresh)).toBe('plans');
		expect(adaptiveTabFor('check', fresh)).toBe('approval');
		expect(adaptiveTabFor('approve', fresh)).toBe('approval');
		expect(adaptiveTabFor('next', fresh)).toBe('anatomy');
		expect(adaptiveTabFor('reset', fresh)).toBe('history');
	});
});

describe('srsTabFor', () => {
	it('shows the checklist on opening and after Recheck Clearance or Dry Run', () => {
		expect(srsTabFor('open')).toBe('checklist');
		expect(srsTabFor('clearance')).toBe('checklist');
		expect(srsTabFor('dryrun')).toBe('checklist');
	});
	it('keeps the tab the learner is on after Approve Timeout', () => {
		expect(srsTabFor('approve')).toBeNull();
	});
});
