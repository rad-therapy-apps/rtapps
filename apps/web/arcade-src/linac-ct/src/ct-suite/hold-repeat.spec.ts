import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHoldRepeater } from './hold-repeat';

afterEach(() => vi.useRealTimers());

describe('createHoldRepeater', () => {
	it('steps once on a quick press and release', () => {
		vi.useFakeTimers();
		const step = vi.fn(),
			h = createHoldRepeater(step);
		h.start();
		vi.advanceTimersByTime(100);
		h.stop();
		vi.advanceTimersByTime(2000);
		expect(step).toHaveBeenCalledTimes(1);
	});
	it('waits for the delay, then repeats about 8 a second', () => {
		vi.useFakeTimers();
		const step = vi.fn(),
			h = createHoldRepeater(step);
		h.start();
		vi.advanceTimersByTime(349);
		expect(step).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(1 + 1000);
		expect(step).toHaveBeenCalledTimes(1 + 8);
		h.stop();
	});
	it('stops on release and can start again', () => {
		vi.useFakeTimers();
		const step = vi.fn(),
			h = createHoldRepeater(step);
		h.start();
		vi.advanceTimersByTime(1000);
		h.stop();
		const n = step.mock.calls.length;
		vi.advanceTimersByTime(1000);
		expect(step).toHaveBeenCalledTimes(n);
		h.start();
		expect(step).toHaveBeenCalledTimes(n + 1);
		h.stop();
	});
});
