/* The Tutorial's step 6 walkthrough on the LINAC console's Patient Setup (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Step 6, the couch setup"): the setup order, the
   immobilization key and the position, then the Headrest and the Short Head Mask dragged from the
   shelf onto the treatment table, Position and Indexing ticked, and Verify Setup Equipment.
   walkthrough-mode.ts runs it while the console shows the setup workspace. The drags are the
   page's own HTML5 drag and drop (immobilization.ts and main.ts): the shelf shuffles its devices on
   each load, so a device is found by its label (the name in IMMOBILIZATION_DEVICE_META), not its
   place. What is on the table and ticked is read from S; Verify is done once the console reports
   the setup complete for Jordan's MRN. The sub-steps are pure, so walkthrough-setup.spec.ts tests
   them with made-up snapshots; read() is the console side. */
import { TUTORIAL_PATIENTS } from '../../shared/console-protocol';
import type { ConsoleEvent } from './console-hooks';
import { S } from './state';
import type { WalkPart } from './walkthrough-part';

export interface SetupSnap {
	/** The devices on the treatment table, by immobilization.ts's ids ('headrest', 'headMask'). */
	onTable: readonly string[];
	/** Position and Indexing ticked. */
	position: boolean;
	indexing: boolean;
	/** Every event the console has reported this page load. */
	events: readonly ConsoleEvent[];
}

/** Jordan's two devices: immobilization.ts's id and the label the shelf shows. */
const HEADREST = { id: 'headrest', name: 'Headrest' },
	MASK = { id: 'headMask', name: 'Short Head Mask' };

/** The selector of the shelf's device labelled `name`. */
export const shelfDevice = (name: string): string =>
	`#immobilizationShelf .immo-device[aria-label="${name}"]`;
const TABLE = '#immobilizationTableDrop';
/** The selector of the label row that holds the checkbox `id`: its box and its word, so a click
    anywhere on it ticks the box. */
const checkRow = (id: string): string => `#immobilizationVerificationChecks label:has(#${id})`;

const placed = (device: { id: string }) => (s: SetupSnap) => s.onTable.includes(device.id);

export const SETUP_WALK: WalkPart<SetupSnap> = {
	id: 'setup',
	header: 'Patient setup',
	steps: [
		{
			id: 'setup.order',
			kind: 'explain',
			text: {
				do: "This is Jordan's setup order.",
				why: "It was written at CT simulation, when the plan was made. Today's setup has to match it."
			},
			targets: () => ['#immobilizationOrderSummary', '#immobilizationInstructions']
		},
		{
			id: 'setup.key',
			kind: 'explain',
			text: {
				do: 'Jordan needs a short head mask and a headrest, lying head first and on their back.',
				why: 'Head first and on the back is called head-first supine (HFS).'
			},
			targets: () => ['#immobilizationOrderSummary .immo-key', '#immobilizationPosition']
		},
		{
			id: 'setup.headrest',
			kind: 'do',
			text: {
				do: 'Drag the Headrest onto the treatment table.',
				why: "The headrest goes on first. It holds Jordan's head at the same angle as at CT simulation, and the mask clips down over it."
			},
			targets: () => [],
			drag: () => ({ from: shelfDevice(HEADREST.name), to: TABLE }),
			done: placed(HEADREST),
			cue: 'Drag it to the table'
		},
		{
			id: 'setup.mask',
			kind: 'do',
			text: {
				do: 'Drag the Short Head Mask onto the treatment table.',
				why: "The mask was moulded to Jordan's face at CT simulation. It keeps the head still to within a few millimetres."
			},
			targets: () => [],
			drag: () => ({ from: shelfDevice(MASK.name), to: TABLE }),
			done: placed(MASK),
			cue: 'Drag it to the table'
		},
		{
			id: 'setup.position',
			kind: 'do',
			text: {
				do: 'Tick Position.',
				why: 'Jordan lies as the setup record says: head first, on the back, head straight and centred.'
			},
			targets: () => [checkRow('immoPositionCheck')],
			done: (s) => s.position,
			cue: 'Tick Position'
		},
		{
			id: 'setup.indexing',
			kind: 'do',
			text: {
				do: 'Tick Indexing.',
				why: 'The headrest and mask lock into numbered positions on the couch, so they sit in the same place every day.'
			},
			targets: () => [checkRow('immoIndexCheck')],
			done: (s) => s.indexing,
			cue: 'Tick Indexing'
		},
		{
			id: 'setup.verify',
			kind: 'do',
			text: {
				do: 'Press Verify Setup Equipment.',
				why: "The console checks your setup against Jordan's order."
			},
			targets: () => ['#immobilizationVerify'],
			done: (s) =>
				s.events.some((e) => e.kind === 'setup-complete' && e.mrn === TUTORIAL_PATIENTS.jordan.mrn),
			cue: 'Press Verify'
		}
	],
	read(events) {
		const w = S.immobilizationWorkflow;
		return {
			onTable: [...(w?.selected ?? [])],
			position: !!w?.positionChecked,
			indexing: !!w?.indexingChecked,
			events
		};
	}
};
