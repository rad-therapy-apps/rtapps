/* One CT QA run at a time (#76). The Run QA button and the three quick-animate buttons each start
   a multi-second animated sequence that drives the shared PROC_STATE and the release/hold verdict;
   a second press mid-run would overlap the first and silently drop a verdict. Every handler wrapped
   by the same lock ignores presses until the run in progress settles. Kept free of scene/DOM
   imports so it is unit tested in Node; sdk-bridge.ts wraps the button handlers with it. */
export function createQaLock() {
	let busy = false;
	return (run: () => Promise<void>) => async () => {
		if (busy) return;
		busy = true;
		try {
			await run();
		} finally {
			busy = false;
		}
	};
}
