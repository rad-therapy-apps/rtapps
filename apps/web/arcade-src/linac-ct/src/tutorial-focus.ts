/* The Tutorial's focused console (`?view=console&scenario=tutorial`): each of the Tutorial's console
   steps shows only what that step uses (sim-hub/src/tutorial-steps.ts steps 3, 6, 8 and 9). The
   console keeps its whole workflow; only the layout changes. console-mode.ts puts
   `linac-tutorial-focus` and one `tut-focus-<focus>` class on the body for the screen in use, and
   index.html's "console mode, Tutorial focus" styles lay each one out: the queue as it is, the
   chart as Jordan's identity, Patient Setup across the whole frame, and image guidance and delivery
   with only the keys their step presses beside them. Free Mode (no scenario) never gets the
   classes, so its console is the full one. Free of DOM imports so it is unit tested in Node
   (tutorial-focus.spec.ts). */

export type TutorialFocus = 'queue' | 'chart' | 'setup' | 'igrt' | 'delivery' | 'other';

/** The workflow windows the Tutorial's steps work in, and the focus each gives. */
export const FOCUS_WINDOWS: readonly (readonly [string, TutorialFocus])[] = [
	['immobilizationPanel', 'setup'],
	['igrtPanel', 'igrt'],
	['deliveryPanel', 'delivery']
];

/** The other workflow windows: no Tutorial step opens one, so the full console shows with them. */
export const OTHER_WINDOWS: readonly string[] = [
	'chargeCapturePanel',
	'oisPanel',
	'motionPanel',
	'adaptivePanel',
	'srsPanel',
	'specialSetupPanel'
];

/** The focus for what the console shows: the queue while it is the landing page, else the open
    workflow window's, else (a chart open with no window) the chart. */
export function tutorialFocus(landing: boolean, isOpen: (id: string) => boolean): TutorialFocus {
	if (landing) return 'queue';
	for (const [id, focus] of FOCUS_WINDOWS) if (isOpen(id)) return focus;
	return OTHER_WINDOWS.some(isOpen) ? 'other' : 'chart';
}

/** The body class for a focus. */
export const focusClass = (focus: TutorialFocus): string => `tut-focus-${focus}`;
