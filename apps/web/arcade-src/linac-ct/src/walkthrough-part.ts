/* One of the LINAC console's four Tutorial walkthroughs (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md): queue (step 3), setup (step 6), igrt (step 8) and
   delivery (step 9), each in its own walkthrough-<part>.ts, run by walkthrough-mode.ts on the
   workspace it guides. The sub-steps' rules are shared/walkthrough-core.ts's. */
import type { LinacWorkspace } from '../../shared/console-protocol';
import type { SubStep } from '../../shared/walkthrough-core';
import type { ConsoleEvent } from './console-hooks';

export interface WalkPart<Snap> {
	/** The workspace it guides. */
	id: LinacWorkspace;
	/** The bubble's header ("Patient setup"). */
	header: string;
	steps: readonly SubStep<Snap>[];
	/** What its sub-steps need from the console now (its DOM and S), given every event the console
	    has reported this page load, in order (console-hooks.ts consoleEvent). The runner calls it
	    on each of the console's ticks while the part runs; the specs call the sub-steps with
	    made-up snapshots instead. */
	read(events: readonly ConsoleEvent[]): Snap;
}
