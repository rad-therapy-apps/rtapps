/* What the CT console tells the center: the scanner pose and workflow step, worked out from the
   suite's own state (S in console.ts) without touching the 3D room, so console mode, which has no
   room, can stream it. Also the message checks the suite's bridge uses (who may talk to the suite).
   console.ts and imaging.ts keep the state, bridge.ts posts what this module derives; free of scene
   and DOM imports so it is unit tested in Node (ct-state.spec.ts). */
import type { CtPose } from '../../../shared/console-protocol';

/* The table's range in the suite's own units. Travel: couchZ runs +out ... -in. Height: couchY
   starts at 0 and moves 0.6 per console click; the range is 10 clicks either way. */
export const COUCH_Z_OUT = 20;
export const COUCH_Z_IN = -16;
export const COUCH_Y_LOW = -6;
export const COUCH_Y_HIGH = 6;

/** The slice of the suite's state the pose needs. */
export interface CtPoseInput {
	couchZ: number;
	couchY: number;
	/** A helical scan is running. */
	scanning: boolean;
	/** A topogram is being acquired. */
	topogramming: boolean;
	xray: boolean;
	/** Workflow step, 1..6. */
	step: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The pose the center shows: 0..1 fractions of the table range, flags as the console has them. */
export function ctPose(s: CtPoseInput): CtPose {
	return {
		tableTravel: clamp01((COUCH_Z_OUT - s.couchZ) / (COUCH_Z_OUT - COUCH_Z_IN)),
		tableHeight: clamp01((s.couchY - COUCH_Y_LOW) / (COUCH_Y_HIGH - COUCH_Y_LOW)),
		scanning: s.scanning || s.topogramming,
		xrayOn: s.xray,
		// The lasers are used from the positioning step on.
		lasersOn: s.step >= 3
	};
}

const STEP_NAMES = ['', 'Protocol', 'Habitus / Technique', 'Position', 'Topogram', 'Range', 'Scan'];

/** The step label as the console shows it, e.g. "Step 3 · Position". */
export function ctStepLabel(n: number): string {
	return `Step ${n} · ${STEP_NAMES[n]}`;
}

/** True when two poses would look the same to the center, so nothing needs posting. */
export function samePose(a: CtPose, b: CtPose): boolean {
	return (
		Math.abs(a.tableTravel - b.tableTravel) < 0.002 &&
		Math.abs(a.tableHeight - b.tableHeight) < 0.002 &&
		a.scanning === b.scanning &&
		a.xrayOn === b.xrayOn &&
		a.lasersOn === b.lasersOn
	);
}

/** Says when to post: only when the pose or step changed and at least minGapMs has passed since the
    last post (33 ms is 30 a second). Call it as often as you like; true means post now. */
export function createStateGate(minGapMs = 33) {
	let lastPose: CtPose | null = null,
		lastStep = '',
		lastAt = -Infinity;
	return (pose: CtPose, step: string, now: number): boolean => {
		if (lastPose && samePose(lastPose, pose) && lastStep === step) return false;
		if (now - lastAt < minGapMs) return false;
		lastPose = { ...pose };
		lastStep = step;
		lastAt = now;
		return true;
	};
}

/** Only the page that embeds the suite may drive it: the message must come from the parent window
    itself (not the suite's own window) and from this page's origin. */
export function isTrustedParentMessage(
	ev: { source: unknown; origin: string },
	parentWin: unknown,
	selfWin: unknown,
	origin: string
): boolean {
	return ev.source === parentWin && parentWin !== selfWin && ev.origin === origin;
}

/** The targetOrigin for posts to the parent, or null where the page has no usable origin (file:). */
export function postTargetOrigin(origin: string): string | null {
	return origin && origin !== 'null' ? origin : null;
}
