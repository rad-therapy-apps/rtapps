/* The Tutorial's step 6 walkthrough on the LINAC console's Patient Setup (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Step 6, the couch setup"). walkthrough-mode.ts runs
   it while the console shows the setup workspace. Not written yet: with no sub-steps the part ends
   at once, so Patient Setup shows no bubble. */
import type { WalkPart } from './walkthrough-part';

export const SETUP_WALK: WalkPart<null> = {
	id: 'setup',
	header: 'Patient setup',
	steps: [],
	read: () => null
};
