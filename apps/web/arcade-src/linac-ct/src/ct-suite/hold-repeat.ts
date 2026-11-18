/* Press-and-hold for the console's table buttons: one step on press, then after a short delay the
   step repeats about 8 times a second until the button is released. console.ts wires it to the
   couch In/Out/Up/Down buttons in console mode (?view=console), so a learner can hold In to reach
   isocenter instead of clicking it a dozen times. Timers are passed in so it is unit tested in Node
   (hold-repeat.spec.ts). */
export interface HoldRepeater {
	/** Steps once now, then keeps stepping while held. */
	start(): void;
	/** Stops the repeat; safe to call when nothing is held. */
	stop(): void;
}

export function createHoldRepeater(
	step: () => void,
	delayMs = 350,
	intervalMs = 125,
	timers: {
		setTimeout: (fn: () => void, ms: number) => unknown;
		setInterval: (fn: () => void, ms: number) => unknown;
		clear: (id: unknown) => void;
	} = {
		setTimeout: (fn, ms) => setTimeout(fn, ms),
		setInterval: (fn, ms) => setInterval(fn, ms),
		clear: (id) => {
			clearTimeout(id as number);
			clearInterval(id as number);
		}
	}
): HoldRepeater {
	let id: unknown = null;
	const stop = () => {
		if (id !== null) timers.clear(id);
		id = null;
	};
	return {
		start() {
			stop();
			step();
			id = timers.setTimeout(() => {
				id = timers.setInterval(step, intervalMs);
			}, delayMs);
		},
		stop
	};
}
