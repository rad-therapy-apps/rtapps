import { describe, expect, it } from 'vitest';
import { focusClass, tutorialFocus } from './tutorial-focus';

const openOnly =
	(...ids: string[]) =>
	(id: string) =>
		ids.includes(id);

describe('tutorialFocus', () => {
	it('is the queue while the queue is the landing page, whatever window was left open', () => {
		expect(tutorialFocus(true, openOnly())).toBe('queue');
		expect(tutorialFocus(true, openOnly('igrtPanel'))).toBe('queue');
	});
	it('is the open window of a Tutorial step', () => {
		expect(tutorialFocus(false, openOnly('immobilizationPanel'))).toBe('setup');
		expect(tutorialFocus(false, openOnly('igrtPanel'))).toBe('igrt');
		expect(tutorialFocus(false, openOnly('deliveryPanel'))).toBe('delivery');
	});
	it('is the chart when a chart is open with no window', () => {
		expect(tutorialFocus(false, openOnly())).toBe('chart');
	});
	it('falls back to the full console for a window no Tutorial step opens', () => {
		expect(tutorialFocus(false, openOnly('chargeCapturePanel'))).toBe('other');
		expect(tutorialFocus(false, openOnly('oisPanel'))).toBe('other');
	});
});

describe('focusClass', () => {
	it('names the body class', () => {
		expect(focusClass('igrt')).toBe('tut-focus-igrt');
		expect(focusClass('chart')).toBe('tut-focus-chart');
	});
});
