/* The LINAC console's tutorial scenario (`?view=console&scenario=tutorial`, docs/specs/
   2026-11-18-consoles-in-center-design.md part 3): the queue holds the Tutorial's three schedule
   entries in TUTORIAL_PATIENTS, in the storyboard's order (Jordan's look-alike first, then Jordan,
   then Jody). Jordan's case copies the app's first treatment case (3D-CRT prostate AP/PA, 6 MV,
   Vac-Lok and knee support) under Jordan's identity, and its daily setup error makes today's check
   images ask for the TUTORIAL_SHIFT_MM couch correction. The two look-alikes are queue rows only:
   console-patch.ts refuses to check them in or open their charts. main.ts swaps these cases in for
   TREATMENT_CASES and drops their saved R&V sessions; console-patch.ts reads the queue details
   and the refusals. Free of scene and DOM
   imports so it is unit tested in Node (tutorial-cases.spec.ts). */
import { TUTORIAL_PATIENTS, TUTORIAL_SHIFT_MM } from '../../shared/console-protocol';
import type { TreatmentCase } from './delivery/types';

/** A queue entry: who, when and where, plus the treatment site the row shows. */
interface TutorialEntry {
	mrn: string;
	name: string;
	born: string;
	vault: string;
	time: string;
	site: string;
}

/** The queue, top to bottom. */
export const TUTORIAL_QUEUE: readonly TutorialEntry[] = [
	{ ...TUTORIAL_PATIENTS.jordanLookalike, site: 'Prostate' },
	{ ...TUTORIAL_PATIENTS.jordan, site: 'Prostate' },
	{ ...TUTORIAL_PATIENTS.jody, site: 'Left Breast' }
];
/** Jordan's row in TUTORIAL_QUEUE, which is also the case the app loads at boot. */
export const JORDAN_QUEUE_INDEX = TUTORIAL_QUEUE.findIndex(
	(e) => e.mrn === TUTORIAL_PATIENTS.jordan.mrn
);

/** Today's setup error on Jordan's couch: the patient lies TUTORIAL_SHIFT_MM low, so the check
    images ask the couch to go up by that much (linac-igrt.ts turns an error into a correction). */
export const TUTORIAL_DAILY_ERROR = {
	lat: 0,
	lng: 0,
	vrt: TUTORIAL_SHIFT_MM,
	roll: 0,
	pitch: 0,
	yaw: 0
};

/** The three tutorial cases, in TUTORIAL_QUEUE order. `base` is the app's first treatment case,
    after main.ts has applied its immobilization rules and setup refinements; it is not changed. */
export function buildTutorialCases(base: TreatmentCase): TreatmentCase[] {
	return TUTORIAL_QUEUE.map((entry) => {
		const c: TreatmentCase = structuredClone(base);
		c.patient = entry.name;
		c.mrn = entry.mrn;
		c.siteLabel = entry.site;
		if (entry.mrn === TUTORIAL_PATIENTS.jordan.mrn) c.dailySetupError = { ...TUTORIAL_DAILY_ERROR };
		return c;
	});
}

/** The queue row's second line for a tutorial MRN, or null for any other patient. */
export function tutorialQueueDetail(mrn: string): string | null {
	const e = TUTORIAL_QUEUE.find((x) => x.mrn === mrn);
	return e ? `Born ${e.born} · ${e.site} · ${e.vault} · ${e.time}` : null;
}

/** Whether a saved R&V session key (ois.ts: `mrn|fraction`) is a tutorial patient's. The console
    tutorial drops these on boot, so every play starts with a fresh record. */
export function isTutorialSessionKey(key: string): boolean {
	return TUTORIAL_QUEUE.some((e) => key.startsWith(`${e.mrn}|`));
}

/** Whether the queue lets this MRN be checked in and charted: only Jordan's entry. */
export function isTutorialPatient(mrn: string): boolean {
	return mrn === TUTORIAL_PATIENTS.jordan.mrn;
}

/** What the console says when a look-alike is picked (posted as a 'wrong-patient' mistake). */
export const WRONG_PATIENT_MESSAGE = {
	checkIn:
		'Not the patient who checked in. Match the full name, date of birth and vault before you check a patient in.',
	openChart:
		'Not the patient who checked in. Match the full name, date of birth and vault before you open a chart.'
};
