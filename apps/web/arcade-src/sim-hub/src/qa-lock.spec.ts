import { describe, it, expect } from 'vitest';
import { createQaLock } from './qa-lock';

/** A run that stays pending until `finish()` is called. */
function deferredRun() {
	let calls = 0;
	let finish = () => {};
	const run = () => {
		calls++;
		return new Promise<void>((r) => (finish = r));
	};
	return { run, calls: () => calls, finish: () => finish() };
}

describe('createQaLock', () => {
	it('ignores a second press of the same button while its run is pending', async () => {
		const guard = createQaLock();
		const a = deferredRun();
		const pressA = guard(a.run);
		const first = pressA();
		await pressA();
		expect(a.calls()).toBe(1);
		a.finish();
		await first;
	});

	it('ignores every other guarded button while any run is pending', async () => {
		const guard = createQaLock();
		const a = deferredRun();
		const b = deferredRun();
		const first = guard(a.run)();
		await guard(b.run)();
		expect(b.calls()).toBe(0);
		a.finish();
		await first;
	});

	it('accepts a new run once the previous one has finished, even if it threw', async () => {
		const guard = createQaLock();
		await expect(guard(() => Promise.reject(new Error('boom')))()).rejects.toThrow('boom');
		const a = deferredRun();
		const run = guard(a.run)();
		expect(a.calls()).toBe(1);
		a.finish();
		await run;
	});
});
