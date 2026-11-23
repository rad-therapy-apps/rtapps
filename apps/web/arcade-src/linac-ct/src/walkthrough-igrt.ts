/* The Tutorial's step 8 walkthrough on the LINAC console's image guidance (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Step 8, the check images"). walkthrough-mode.ts runs
   it while the console shows the igrt workspace. Not written yet: with no sub-steps the part ends
   at once, so image guidance shows no bubble. */
import type { WalkPart } from './walkthrough-part';

export const IGRT_WALK: WalkPart<null> = {
	id: 'igrt',
	header: 'Check images',
	steps: [],
	read: () => null
};
