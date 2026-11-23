/* The Tutorial's step 9 walkthrough on the LINAC console's delivery screen (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Step 9, the treatment"). walkthrough-mode.ts runs it
   while the console shows the delivery workspace. Not written yet: with no sub-steps the part ends
   at once, so the delivery screen shows no bubble. */
import type { WalkPart } from './walkthrough-part';

export const DELIVERY_WALK: WalkPart<null> = {
	id: 'delivery',
	header: 'Treatment',
	steps: [],
	read: () => null
};
