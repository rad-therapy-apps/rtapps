/* The Tutorial's step 8 walkthrough on the LINAC console's image guidance (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Step 8, the check images"): the Registration & Couch
   Correction panel, New Daily Setup, the MV / EPID panel out, Acquire Images, the correction table,
   Motion Enable, the couch key until the residual reads 0, the panel back in, then Verify
   Alignment. walkthrough-mode.ts runs it while the console shows the igrt workspace. The correction
   and the residual are read from the correction table as the player reads them; the couch key is
   the one that brings the residual toward 0 (console{Vrt,Lng,Lat}{Plus,Minus}), so a press past 0
   flips it to the other sign. The couch sub-step is done once the console has reported the shift
   applied for Jordan (console-mode.ts watchShift, inside the tolerance) and every residual reads 0,
   as its bubble says. The sub-steps are pure, so walkthrough-igrt.spec.ts tests them with made-up
   snapshots; read() is the DOM and S side. */
import { TUTORIAL_PATIENTS } from '../../shared/console-protocol';
import type { ConsoleEvent } from './console-hooks';
import { S } from './state';
import type { WalkPart } from './walkthrough-part';

/** The correction table's translation rows, as linac-igrt.ts renderClinicalIGRT labels them. */
export type CouchAxis = 'Vertical' | 'Longitudinal' | 'Lateral';

export interface CorrectionRow {
	axis: CouchAxis;
	/** The Recommended and Residual columns (mm). */
	recommended: number;
	residual: number;
}

export interface IgrtSnap {
	/** Today's imaging session has started (New Daily Setup). */
	started: boolean;
	/** The MV / EPID panel is extended. */
	panelOut: boolean;
	/** Motion Enable is armed. */
	armed: boolean;
	/** The correction table's translation rows; none before the images. */
	rows: readonly CorrectionRow[];
	/** Every event the console has reported this page load. */
	events: readonly ConsoleEvent[];
}

/** The couch keys for each axis, in the Machine / Imaging panel's order: the key's id part and the
    label on the key. */
const COUCH_KEYS: readonly (readonly [CouchAxis, id: string, label: string])[] = [
	['Vertical', 'Vrt', 'Vert'],
	['Longitudinal', 'Lng', 'Long'],
	['Lateral', 'Lat', 'Lat']
];

/** The selector of a Machine / Imaging key by its data-console-target. */
export const machineKey = (target: string): string =>
	`#rtv2MachinePanel [data-console-target="${target}"]`;
const MV_KEY = machineKey('consoleMV');

const JORDAN = TUTORIAL_PATIENTS.jordan;

const reported = (s: IgrtSnap, kind: 'images-acquired' | 'shift-applied' | 'alignment-verified') =>
	s.events.some((e) => e.kind === kind && e.mrn === JORDAN.mrn);

/** The table shows whole millimetres (linac-igrt.ts fmtIGRT), so this reads 0 mm. */
const readsZero = (mm: number) => Math.abs(mm) < 0.5;

/** The couch key that brings the residual toward 0: the first axis, in the keys' order, whose
    residual does not read 0, and the sign that reduces it; null when every residual reads 0. */
export function couchKey(s: IgrtSnap): { target: string; label: string; axis: CouchAxis } | null {
	for (const [axis, id, label] of COUCH_KEYS) {
		const r = s.rows.find((row) => row.axis === axis)?.residual;
		if (r === undefined || readsZero(r)) continue;
		return {
			target: `console${id}${r > 0 ? 'Plus' : 'Minus'}`,
			label: `${label} ${r > 0 ? '+' : '−'}`,
			axis
		};
	}
	return null;
}

/** The correction the images call for: the axis with the largest recommended shift, and its size. */
function correction(s: IgrtSnap): Record<string, string> {
	const top = [...s.rows].sort((a, b) => Math.abs(b.recommended) - Math.abs(a.recommended))[0];
	return top ? { shift: String(Math.abs(top.recommended)), axis: top.axis } : {};
}

export const IGRT_WALK: WalkPart<IgrtSnap> = {
	id: 'igrt',
	header: 'Check images',
	steps: [
		{
			id: 'igrt.intro',
			kind: 'explain',
			text: {
				do: 'Before any beam, you image Jordan to check the position.',
				why: 'This is image-guided radiation therapy (IGRT). The images are compared with the plan, and any difference is corrected by moving the couch.'
			},
			// the window's title, "Registration & Couch Correction" (main.ts copies the panel's heading
			// there; the console view hides the panel's own)
			targets: () => ['#consoleWorkflowDock .console-dock-eyebrow']
		},
		{
			id: 'igrt.new',
			kind: 'do',
			text: {
				do: 'Press New Daily Setup.',
				why: "It starts today's imaging session for Jordan."
			},
			targets: () => ['#igrtNewSetup'],
			done: (s) => s.started,
			cue: 'Press New Daily Setup'
		},
		{
			id: 'igrt.mvOut',
			kind: 'do',
			text: {
				do: 'Press MV / EPID to extend the imaging panel.',
				why: 'The panel sits opposite the treatment head and makes images with the treatment beam itself.'
			},
			targets: () => [MV_KEY],
			done: (s) => s.panelOut,
			cue: 'Press MV / EPID'
		},
		{
			id: 'igrt.acquire',
			kind: 'do',
			text: {
				do: 'Press Acquire Images.',
				why: "The console takes a pair of images and lines them up with the plan's reference images."
			},
			targets: () => ['#igrtAcquire'],
			done: (s) => reported(s, 'images-acquired'),
			cue: 'Press Acquire Images'
		},
		{
			id: 'igrt.table',
			kind: 'explain',
			text: {
				do: 'The images show Jordan {shift} mm off in the {axis} direction.',
				why: "Recommended is the shift the images call for, Applied is how far you've moved, and Residual is what's left. Residual must reach 0."
			},
			// the whole table with its header: in a short window index.html turns it on its side, and
			// #igrtCorrectionRows then has no box of its own (display: contents)
			targets: () => ['#igrtPanel .igrt-table'],
			tokens: correction
		},
		{
			id: 'igrt.motion',
			kind: 'do',
			text: {
				do: 'Press Motion Enable.',
				why: 'The couch and gantry move only while motion is enabled, so nothing moves by accident.'
			},
			targets: () => ['#rtv2MotionEnable'],
			// already armed: passed over
			done: (s) => s.armed,
			cue: 'Press Motion Enable'
		},
		{
			id: 'igrt.couch',
			kind: 'do',
			text: {
				do: 'Press {key} until the {axis} residual reads 0 mm.',
				why: 'Each press moves the couch 1 mm.'
			},
			targets: (s) => {
				const k = couchKey(s);
				return k ? [machineKey(k.target)] : [];
			},
			tokens: (s): Record<string, string> => {
				const k = couchKey(s);
				return k ? { key: k.label, axis: k.axis } : {};
			},
			done: (s) =>
				reported(s, 'shift-applied') &&
				s.rows.length > 0 &&
				s.rows.every((r) => readsZero(r.residual)),
			cue: 'Bring the residual to 0 mm'
		},
		{
			id: 'igrt.mvIn',
			kind: 'do',
			text: {
				do: 'Press MV / EPID again to fold the panel away.',
				why: 'The beam stays locked while imaging hardware is out.'
			},
			targets: () => [MV_KEY],
			done: (s) => !s.panelOut,
			cue: 'Press MV / EPID'
		},
		{
			id: 'igrt.verify',
			kind: 'do',
			text: {
				do: 'Press Verify Alignment.',
				why: "It records that Jordan's position was checked and corrected before treatment."
			},
			targets: () => ['#igrtVerify'],
			done: (s) => reported(s, 'alignment-verified'),
			cue: 'Press Verify Alignment'
		}
	],
	read(events) {
		const rows: CorrectionRow[] = [];
		for (const row of document.querySelectorAll('#igrtCorrectionRows .igrt-row')) {
			const cells = [...row.children].map((c) => c.textContent?.trim() ?? ''),
				axis = COUCH_KEYS.find(([a]) => a === cells[0])?.[0];
			if (axis)
				rows.push({ axis, recommended: parseFloat(cells[1]), residual: parseFloat(cells[3]) });
		}
		return {
			started: !!S.clinicalIGRT.active,
			panelOut: !!S.detectorExtended,
			armed: !!S.consoleMotionArmed,
			rows,
			events
		};
	}
};
