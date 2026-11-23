/* The postMessage contract between the center (sim-hub console-panel.ts) and the two consoles it
   opens in an iframe panel at the console desks: the LINAC console (linac-ct index.html in console
   mode) and the CT console (linac-ct ct-suite.html in console mode).
   docs/specs/2026-11-18-consoles-in-center-design.md. One union per direction, as in
   linac-ct/src/ct-protocol.ts, so the two halves cannot disagree about message shapes. Types and
   constants only: both apps import it, and neither pulls the other's code.

   Both sides check every message: the console accepts only messages whose `source` is
   `window.parent` and whose `origin` is its own; the center accepts only messages whose `source` is
   the panel's iframe window and whose `origin` is its own. */
import type { CtCompleteMsg } from '../linac-ct/src/ct-protocol';

/** The query parameter that starts either console in console mode: `?view=console`. */
export const CONSOLE_VIEW_PARAM = 'view';
export const CONSOLE_VIEW_VALUE = 'console';
/** The query parameter that picks the console's patient list: `?scenario=tutorial`. Absent means free. */
export const CONSOLE_SCENARIO_PARAM = 'scenario';
export type ConsoleScenario = 'free' | 'tutorial';

/** The Tutorial's three schedule entries on the LINAC console (tutorial-steps.ts step 3). The
    patient is Jordan Ellis; the other two are the look-alikes the step asks the player to rule out.
    Jordan's case copies the LINAC app's whole-brain case (lateral opposed, 6 MV) with Jordan's
    identity, and today's check images show a 4 mm shift to correct. */
export const TUTORIAL_PATIENTS = {
	jordan: {
		mrn: 'TUT-680314',
		name: 'Ellis, Jordan',
		born: 'March 14, 1968',
		vault: 'Vault 1',
		time: '9:00'
	},
	jordanLookalike: {
		mrn: 'TUT-851002',
		name: 'Ellis, Jordan',
		born: 'October 2, 1985',
		vault: 'Vault 1',
		time: '9:40'
	},
	jody: {
		mrn: 'TUT-680315',
		name: 'Ellis, Jody',
		born: 'March 14, 1968',
		vault: 'Vault 2',
		time: '9:00'
	}
} as const;
/** The couch correction today's check images call for in Jordan's case (mm, vector length). */
export const TUTORIAL_SHIFT_MM = 4;

/* ===== LINAC ===== */

/** The LINAC console's workspaces the center can open it at; both sides check messages against
    this list. */
export const LINAC_WORKSPACES = ['queue', 'setup', 'igrt', 'delivery'] as const;
export type LinacWorkspace = (typeof LINAC_WORKSPACES)[number];

/** The LINAC as the console shows it right now, mid-move values while a motion runs (not the
    target). Angles in degrees (IEC 61217, 0..360), couch translations in cm from the couch's
    home (fundamentalState vrt/lng/lat), jaw edges in cm from the central axis. */
export interface LinacPose {
	gantry: number;
	collimator: number;
	couchAngle: number;
	couchVrt: number;
	couchLng: number;
	couchLat: number;
	jawX1: number;
	jawX2: number;
	jawY1: number;
	jawY2: number;
	kvArmsOut: boolean;
	epidOut: boolean;
	beamOn: boolean;
	lasersOn: boolean;
}

/** Center → LINAC: show this workspace (the console switches to it as its own buttons would). */
export interface LinacOpenMsg {
	type: 'rtapps-linac-open';
	workspace: LinacWorkspace;
}
/** Center → LINAC: the vault as the center sees it, sent on open and whenever it changes. The
    console's door interlock reads `doorClosed`; `staffInVault` is true while the player is inside
    Vault 1 (the therapists who stand there in Free Mode don't count, and nothing blocks on it). */
export interface LinacRoomMsg {
	type: 'rtapps-linac-room';
	doorClosed: boolean;
	staffInVault: boolean;
}
/** Center → LINAC: the panel shows the console (`open: true`) or has hidden it (`open: false`);
    sent on each open and close, and on ready. Closing the panel is the therapist leaving the
    console: a hidden page gets no animation frames, so the console holds a delivering field at
    once (reason 'Console left'), stops any held key or Move to field, and posts its state.
    Reopening resumes nothing: the learner presses Resume Beam. */
export interface LinacPanelMsg {
	type: 'rtapps-linac-panel';
	open: boolean;
}

/** LINAC → center: the console has booted in console mode. */
export interface LinacReadyMsg {
	type: 'rtapps-linac-ready';
	scenario: ConsoleScenario;
}
/** One axis of the selected field's geometry that is off the plan, as the console's geometry
    interlock names it ("Gantry 0° → 270°"): the axis, the machine's value now and the planned
    value, display-ready (the unit on the planned value, and on both for angles). */
export interface GeometryMismatch {
	label: string;
	now: string;
	planned: string;
}
/** The geometry interlock holding the selected field: the field's name and what is off the plan,
    in the checklist's order. */
export interface LinacGeometryHold {
	field: string;
	mismatches: GeometryMismatch[];
}

/** LINAC → center: the machine pose, posted when it changes, at most 30 times a second. */
export interface LinacStateMsg {
	type: 'rtapps-linac-state';
	pose: LinacPose;
	/** The open chart's MRN, or null on the queue. */
	mrn: string | null;
	workspace: LinacWorkspace;
	/** Added later (optional, so a message without it is still valid): the geometry interlock's hold
	    on the selected field while a chart is open, or null when its geometry matches the plan (or
	    no chart is open). The Tutorial's delivery step names the fix from it. */
	geometryHold?: LinacGeometryHold | null;
	/** Added later (optional, as geometryHold): the Tutorial's walkthrough on this workspace while
	    its spotlight shows, or null when none does. The Tutorial holds back its hints meanwhile. */
	walkthrough?: LinacWalkthrough | null;
}
/** The console's Tutorial walkthrough showing (docs/specs/2026-11-23-tutorial-walkthrough-design.md):
    its part (the workspace it guides) and its current sub-step, `index` of `of` (0-based). */
export interface LinacWalkthrough {
	part: LinacWorkspace;
	index: number;
	of: number;
}
/** What happened on the LINAC console. `mistake` is posted whenever the console refuses an action
    (an interlock, a wrong pick, a step out of order); the Tutorial counts them for its hints. */
export type LinacEvent =
	| { kind: 'checked-in'; mrn: string }
	| { kind: 'chart-opened'; mrn: string }
	| { kind: 'setup-complete'; mrn: string }
	| { kind: 'images-acquired'; mrn: string; shiftMm: number }
	| { kind: 'shift-applied'; mrn: string }
	| { kind: 'alignment-verified'; mrn: string }
	| { kind: 'field-delivered'; mrn: string; field: string; index: number; of: number }
	| { kind: 'treatment-complete'; mrn: string }
	| { kind: 'mistake'; workspace: LinacWorkspace; code: string; message: string };
export interface LinacEventMsg {
	type: 'rtapps-linac-event';
	event: LinacEvent;
}

export type CenterToLinacMessage = LinacOpenMsg | LinacRoomMsg | LinacPanelMsg;
export type LinacToCenterMessage = LinacReadyMsg | LinacStateMsg | LinacEventMsg;

/* ===== CT ===== */

/** The CT scanner as the console shows it right now. Table travel and height are fractions of the
    table's range (0 = home/loading position or lowest, 1 = fully in the bore or highest), so the
    center maps them onto its own table without sharing units with the suite's scene. */
export interface CtPose {
	tableTravel: number;
	tableHeight: number;
	/** A topogram or helical scan is running. */
	scanning: boolean;
	/** X-ray is on (the warning light and the beam). */
	xrayOn: boolean;
	lasersOn: boolean;
}
/** CT → center: the scanner pose, posted when it changes, at most 30 times a second. `step` is the
    console's current workflow step label as shown on screen. */
export interface CtStateMsg {
	type: 'rtapps-ct-state';
	pose: CtPose;
	step: string;
}
/** CT → center, besides CtStateMsg: the suite's existing rtapps-ct-ready / rtapps-ct-complete
    (ct-protocol.ts). The center records 'sim-ct-scan' on rtapps-ct-complete in free scenario. */
export type CtToCenterMessage = CtStateMsg | CtCompleteMsg | { type: 'rtapps-ct-ready' };

/* ===== shared ===== */

/** Which console a panel holds. */
export type ConsoleKind = 'linac' | 'ct';
