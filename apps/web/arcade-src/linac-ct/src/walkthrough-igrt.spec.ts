import { describe, expect, it } from 'vitest';
import { TUTORIAL_PATIENTS, TUTORIAL_SHIFT_MM } from '../../shared/console-protocol';
import { currentIndex, fillTokens } from '../../shared/walkthrough-core';
import type { ConsoleEvent } from './console-hooks';
import {
	couchKey,
	IGRT_WALK,
	machineKey,
	type CorrectionRow,
	type IgrtSnap
} from './walkthrough-igrt';

const JORDAN = TUTORIAL_PATIENTS.jordan.mrn,
	OTHER = TUTORIAL_PATIENTS.jordanLookalike.mrn;
/** Jordan's correction table with `applied` mm of the +4 mm vertical correction applied. */
const table = (applied = 0): CorrectionRow[] => [
	{ axis: 'Lateral', recommended: 0, residual: 0 },
	{ axis: 'Longitudinal', recommended: 0, residual: 0 },
	{ axis: 'Vertical', recommended: TUTORIAL_SHIFT_MM, residual: TUTORIAL_SHIFT_MM - applied }
];
const snap = (o: Partial<IgrtSnap> = {}): IgrtSnap => ({
	started: false,
	panelOut: false,
	armed: false,
	rows: [],
	events: [],
	...o
});
const acquired: ConsoleEvent = { kind: 'images-acquired', mrn: JORDAN, shiftMm: TUTORIAL_SHIFT_MM },
	shifted: ConsoleEvent = { kind: 'shift-applied', mrn: JORDAN },
	verified: ConsoleEvent = { kind: 'alignment-verified', mrn: JORDAN };
/** The console just after Acquire Images, `applied` mm moved and Motion Enable as given. */
const imaged = (applied = 0, o: Partial<IgrtSnap> = {}) =>
	snap({ started: true, panelOut: true, rows: table(applied), events: [acquired], ...o });
const steps = IGRT_WALK.steps,
	at = (s: IgrtSnap, seen: string[] = [], reached = 0) =>
		currentIndex(steps, s, new Set(seen), reached);
const step = (id: string) => {
	const s = steps.find((x) => x.id === id);
	if (!s) throw new Error(id);
	return s;
};
const SEEN = ['igrt.intro', 'igrt.table'];
const text = (id: string, s: IgrtSnap) => {
	const t = step(id).text,
		k = step(id).tokens?.(s);
	return { do: fillTokens(t.do, k), why: fillTokens(t.why, k) };
};

describe("step 8's walkthrough, the check images", () => {
	it('has the nine sub-steps in order', () => {
		expect(IGRT_WALK.id).toBe('igrt');
		expect(IGRT_WALK.header).toBe('Check images');
		expect(steps.map((s) => [s.id, s.kind])).toEqual([
			['igrt.intro', 'explain'],
			['igrt.new', 'do'],
			['igrt.mvOut', 'do'],
			['igrt.acquire', 'do'],
			['igrt.table', 'explain'],
			['igrt.motion', 'do'],
			['igrt.couch', 'do'],
			['igrt.mvIn', 'do'],
			['igrt.verify', 'do']
		]);
	});

	it('moves on at each state of the console, in order', () => {
		expect(at(snap())).toBe(0);
		expect(at(snap(), ['igrt.intro'])).toBe(1);
		expect(at(snap({ started: true }), ['igrt.intro'])).toBe(2);
		expect(at(snap({ started: true, panelOut: true }), ['igrt.intro'])).toBe(3);
		expect(at(imaged(), ['igrt.intro'])).toBe(4);
		expect(at(imaged(), SEEN)).toBe(5);
		expect(at(imaged(0, { armed: true }), SEEN)).toBe(6);
		const corrected = imaged(TUTORIAL_SHIFT_MM, { armed: true, events: [acquired, shifted] });
		expect(at(corrected, SEEN)).toBe(7);
		expect(at({ ...corrected, panelOut: false }, SEEN, 7)).toBe(8);
		expect(
			at({ ...corrected, panelOut: false, events: [acquired, shifted, verified] }, SEEN, 7)
		).toBe(9);
	});

	it('passes over Motion Enable when it is already armed', () => {
		expect(at(imaged(0, { armed: true }), SEEN, 5)).toBe(6);
		expect(at(imaged(0, { armed: false }), SEEN, 5)).toBe(5);
	});

	it('passes over the panel when it is already out, and retracting it is the later sub-step', () => {
		expect(at(snap({ started: true, panelOut: true }), ['igrt.intro'], 1)).toBe(3);
		// the panel retracted before the images does not pass over Acquire Images
		expect(at(snap({ started: true }), ['igrt.intro'], 3)).toBe(3);
	});

	it('keeps the couch key until every residual reads 0, not only within the tolerance', () => {
		// 3 of 4 mm applied: inside Jordan's 1 mm tolerance, so the console reported the shift, but the
		// Vertical residual reads +1 mm
		const nearly = imaged(3, { armed: true, events: [acquired, shifted] });
		expect(at(nearly, SEEN, 6)).toBe(6);
		expect(at(imaged(4, { armed: true, events: [acquired] }), SEEN, 6)).toBe(6);
		expect(at(imaged(4, { armed: true, events: [acquired, shifted] }), SEEN, 6)).toBe(7);
	});

	it('flips the couch key to the other sign past 0', () => {
		expect(couchKey(imaged(0))).toEqual({
			target: 'consoleVrtPlus',
			label: 'Vert +',
			axis: 'Vertical'
		});
		expect(couchKey(imaged(5))).toEqual({
			target: 'consoleVrtMinus',
			label: 'Vert −',
			axis: 'Vertical'
		});
		expect(step('igrt.couch').targets(imaged(5))).toEqual([machineKey('consoleVrtMinus')]);
		expect(text('igrt.couch', imaged(6)).do).toBe(
			'Press Vert − until the vertical residual reads 0 mm.'
		);
		expect(couchKey(imaged(4))).toBe(null);
		expect(step('igrt.couch').targets(imaged(4))).toEqual([]);
	});

	it('names the other axes by their keys and the sign that reduces them', () => {
		const rows: CorrectionRow[] = [
			{ axis: 'Lateral', recommended: -2, residual: -2 },
			{ axis: 'Longitudinal', recommended: 1, residual: 1 },
			{ axis: 'Vertical', recommended: 0, residual: 0 }
		];
		expect(couchKey(snap({ rows }))?.target).toBe('consoleLngPlus');
		expect(couchKey(snap({ rows: [rows[0]] }))).toEqual({
			target: 'consoleLatMinus',
			label: 'Lat −',
			axis: 'Lateral'
		});
	});

	it("fills the tokens from Jordan's correction", () => {
		expect(text('igrt.table', imaged())).toEqual({
			do: `The images show Jordan ${TUTORIAL_SHIFT_MM} mm off in the vertical direction.`,
			why: "Recommended is the shift the images call for, Applied is how far you've moved, and Residual is what's left. Residual must reach 0."
		});
		// the correction stays what the images called for as the couch moves
		expect(text('igrt.table', imaged(2)).do).toBe(text('igrt.table', imaged()).do);
		expect(text('igrt.couch', imaged(1))).toEqual({
			do: 'Press Vert + until the vertical residual reads 0 mm.',
			why: 'Each press moves the couch 1 mm.'
		});
	});

	it("counts only Jordan's images, shift and verification", () => {
		const other = (kind: 'shift-applied' | 'alignment-verified'): ConsoleEvent => ({
			kind,
			mrn: OTHER
		});
		const s = snap({ started: true, panelOut: true });
		expect(at({ ...s, events: [{ ...acquired, mrn: OTHER }] }, ['igrt.intro'])).toBe(3);
		expect(
			at(imaged(4, { armed: true, events: [acquired, other('shift-applied')] }), SEEN, 6)
		).toBe(6);
		expect(
			at(
				imaged(4, {
					panelOut: false,
					armed: true,
					events: [acquired, shifted, other('alignment-verified')]
				}),
				SEEN,
				7
			)
		).toBe(8);
	});

	it('points at the panel heading, the buttons and the MV / EPID key', () => {
		const s = imaged();
		expect(step('igrt.intro').targets(s)).toEqual(['#consoleWorkflowDock .console-dock-eyebrow']);
		expect(step('igrt.new').targets(s)).toEqual(['#igrtNewSetup']);
		expect(step('igrt.mvOut').targets(s)).toEqual([
			'#rtv2MachinePanel [data-console-target="consoleMV"]'
		]);
		expect(step('igrt.acquire').targets(s)).toEqual(['#igrtAcquire']);
		expect(step('igrt.table').targets(s)).toEqual(['#igrtPanel .igrt-table']);
		expect(step('igrt.motion').targets(s)).toEqual(['#rtv2MotionEnable']);
		expect(step('igrt.couch').targets(s)).toEqual([
			'#rtv2MachinePanel [data-console-target="consoleVrtPlus"]'
		]);
		// the couch back at 0: the key alone
		const at0 = imaged(4);
		expect(step('igrt.mvIn').targets(at0)).toEqual(step('igrt.mvOut').targets(at0));
		expect(step('igrt.verify').targets(at0)).toEqual(['#igrtVerify']);
		// a residual left (a couch key held past 0): the couch key that brings it back, too
		expect(step('igrt.mvIn').targets(imaged(5))).toEqual([
			machineKey('consoleMV'),
			machineKey('consoleVrtMinus')
		]);
		expect(step('igrt.verify').targets(imaged(5))).toEqual([
			'#igrtVerify',
			machineKey('consoleVrtMinus')
		]);
	});

	it('gives every do sub-step a short cue', () => {
		expect(steps.filter((s) => s.kind === 'do').map((s) => s.cue)).toEqual([
			'Press New Daily Setup',
			'Press MV / EPID',
			'Press Acquire Images',
			'Press Motion Enable',
			'Bring the residual to 0 mm',
			'Press MV / EPID',
			'Press Verify Alignment'
		]);
	});
});
