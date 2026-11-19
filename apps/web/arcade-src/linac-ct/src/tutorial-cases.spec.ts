import { describe, it, expect } from 'vitest';
import { TUTORIAL_PATIENTS, TUTORIAL_SHIFT_MM } from '../../shared/console-protocol';
import { TREATMENT_CASES } from './delivery/cases';
import {
	buildTutorialCases,
	isTutorialPatient,
	isTutorialSessionKey,
	JORDAN_QUEUE_INDEX,
	TUTORIAL_BASE_SITE,
	TUTORIAL_DAILY_ERROR,
	tutorialQueueDetail
} from './tutorial-cases';

const base = TREATMENT_CASES.find((c) => c.patient === 'Erica Johnson')!;

describe('the console tutorial cases', () => {
	it('builds exactly the three tutorial entries, look-alike first as in the storyboard', () => {
		const cases = buildTutorialCases(TREATMENT_CASES);
		expect(cases.map((c) => [c.patient, c.mrn])).toEqual([
			['Ellis, Jordan', TUTORIAL_PATIENTS.jordanLookalike.mrn],
			['Ellis, Jordan', TUTORIAL_PATIENTS.jordan.mrn],
			['Ellis, Jody', TUTORIAL_PATIENTS.jody.mrn]
		]);
		expect(cases[JORDAN_QUEUE_INDEX].mrn).toBe(TUTORIAL_PATIENTS.jordan.mrn);
	});

	it("copies the whole-brain case's plan for Jordan: lateral opposed, 6 MV, head mask and headrest", () => {
		const jordan = buildTutorialCases(TREATMENT_CASES)[JORDAN_QUEUE_INDEX];
		expect([base.siteKey, base.siteLabel]).toEqual([
			TUTORIAL_BASE_SITE.siteKey,
			TUTORIAL_BASE_SITE.siteLabel
		]);
		expect(jordan.siteKey).toBe('brain');
		expect(jordan.siteLabel).toBe('Whole Brain');
		expect(jordan.technique).toBe('Lateral Opposed');
		expect(jordan.energy).toBe('6 MV');
		expect([jordan.position, jordan.positionLabel]).toEqual(['HFS', 'Head-First Supine']);
		expect(jordan.fields.map((f) => [f.name, f.geometry.gantry, f.mu])).toEqual([
			['Right Lateral', '270°', 152],
			['Left Lateral', '90°', 152]
		]);
		expect(jordan.immobilization.required).toEqual(['headMask', 'headrest']);
		expect(jordan.immobilization.orderSummary).toBe(
			'Rigid cranial fixation with indexed occipital support.'
		);
		expect(jordan.planned).toEqual(base.planned);
	});

	it('finds the whole-brain case by its site, wherever it is in the list', () => {
		const shuffled = [...TREATMENT_CASES].reverse();
		const jordan = buildTutorialCases(shuffled)[JORDAN_QUEUE_INDEX];
		expect(jordan.fields).toEqual(base.fields);
		expect(() => buildTutorialCases(TREATMENT_CASES.filter((c) => c !== base))).toThrow();
	});

	it('gives only Jordan the fixed daily error, whose correction is TUTORIAL_SHIFT_MM long', () => {
		const cases = buildTutorialCases(TREATMENT_CASES);
		const e = cases[JORDAN_QUEUE_INDEX].dailySetupError;
		expect(e).toEqual(TUTORIAL_DAILY_ERROR);
		expect(Math.hypot(e.lat, e.lng, e.vrt)).toBe(TUTORIAL_SHIFT_MM);
		expect([e.roll, e.pitch, e.yaw]).toEqual([0, 0, 0]);
		expect(cases.filter((c) => c.dailySetupError)).toHaveLength(1);
	});

	it('leaves the base case and the shared plan objects untouched', () => {
		const before = JSON.stringify(base);
		const cases = buildTutorialCases(TREATMENT_CASES);
		cases[JORDAN_QUEUE_INDEX].fields[0].mu = 1;
		cases[JORDAN_QUEUE_INDEX].immobilization.required.push('vacLok');
		expect(JSON.stringify(base)).toBe(before);
		expect(base.dailySetupError).toBeUndefined();
	});

	it("shows each entry's date of birth, site, vault and time so the look-alikes can be told apart", () => {
		expect(tutorialQueueDetail(TUTORIAL_PATIENTS.jordan.mrn)).toBe(
			'Born March 14, 1968 · Whole Brain · Vault 1 · 9:00'
		);
		expect(tutorialQueueDetail(TUTORIAL_PATIENTS.jordanLookalike.mrn)).toBe(
			'Born October 2, 1985 · Whole Brain · Vault 1 · 9:40'
		);
		expect(tutorialQueueDetail(TUTORIAL_PATIENTS.jody.mrn)).toBe(
			'Born March 14, 1968 · Left Breast · Vault 2 · 9:00'
		);
		expect(tutorialQueueDetail(base.mrn)).toBeNull();
	});

	it("picks out the tutorial patients' saved R&V sessions only", () => {
		const jordan = buildTutorialCases(TREATMENT_CASES)[JORDAN_QUEUE_INDEX];
		expect(isTutorialSessionKey(`${jordan.mrn}|${jordan.fraction}`)).toBe(true);
		expect(isTutorialSessionKey(`${TUTORIAL_PATIENTS.jody.mrn}|1 / 1`)).toBe(true);
		expect(isTutorialSessionKey(`${base.mrn}|${base.fraction}`)).toBe(false);
		expect(isTutorialSessionKey(`${TUTORIAL_PATIENTS.jordan.mrn}X|1`)).toBe(false);
		expect(isTutorialSessionKey('')).toBe(false);
	});

	it('lets only Jordan be checked in and charted', () => {
		expect(isTutorialPatient(TUTORIAL_PATIENTS.jordan.mrn)).toBe(true);
		expect(isTutorialPatient(TUTORIAL_PATIENTS.jordanLookalike.mrn)).toBe(false);
		expect(isTutorialPatient(TUTORIAL_PATIENTS.jody.mrn)).toBe(false);
		expect(isTutorialPatient(base.mrn)).toBe(false);
	});
});
