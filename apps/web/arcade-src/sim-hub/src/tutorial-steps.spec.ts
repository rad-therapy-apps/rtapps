import { describe, it, expect } from 'vitest';
import {
	CHAPTER_1,
	JORDAN_MRN,
	LINES,
	ROLES,
	WAIT_FOR_JAMIE,
	WAIT_FOR_JORDAN,
	WORLD,
	eHintText
} from './tutorial-steps';
import type { StepAction } from './tutorial-steps';
import { TUTORIAL_PATIENTS, TUTORIAL_SHIFT_MM } from '../../shared/console-protocol';

const ACTIONS: StepAction[] = [
	'pickChair',
	'sitPlayer',
	'intercomToControl',
	'jordanOnMonitors',
	'jordanConfirms',
	'escortToVault',
	'jordanOnCouch',
	'lasersOn',
	'jamieAcrossCouch',
	'jamieToControl',
	'holdVaultClosed',
	'shiftApplied',
	'beamOff',
	'releaseVaultDoor',
	'jamieBackIn',
	'jordanOffCouch',
	'escortToLobby',
	'jordanThanks'
];

// every string in Chapter 1 that a player reads
function texts(): string[] {
	const out: string[] = [
		eHintText('Jordan'),
		WAIT_FOR_JORDAN,
		WAIT_FOR_JAMIE,
		...Object.values(LINES)
	];
	for (const s of CHAPTER_1) {
		out.push(s.objective, s.target.place, s.target.name, ...s.hints);
		if (s.target.label) out.push(s.target.label);
		if (s.console) out.push(...s.console.hints, s.console.reveal);
		for (const l of s.exchange ?? []) out.push(l.who, l.text);
		const d = s.decision;
		if (d) {
			out.push(d.title, d.prompt, ...d.hints, d.reveal, d.reason);
			for (const o of d.options) out.push(o.text);
			for (const [k, v] of d.context ?? []) out.push(k, v);
		}
	}
	return out;
}

describe('Chapter 1 steps', () => {
	it('has 11 steps, numbered in order', () => {
		expect(CHAPTER_1.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
	});

	it('is played as Jordan for steps 1-2, then as Morgan Reed', () => {
		expect(CHAPTER_1.map((s) => s.role)).toEqual([
			'patient',
			'patient',
			...Array(9).fill('therapist')
		]);
		expect(ROLES.patient.name).toBe('Jordan Ellis');
		expect(ROLES.therapist.name).toBe('Morgan Reed');
	});

	it('gives every step an objective, a target and two walking hints', () => {
		for (const s of CHAPTER_1) {
			expect(s.objective, `step ${s.n}`).toMatch(/\S.*\.$/);
			expect(s.target.place.length, `step ${s.n}`).toBeGreaterThan(0);
			expect(s.target.name.length, `step ${s.n}`).toBeGreaterThan(0);
			expect(s.target.roomId.length, `step ${s.n}`).toBeGreaterThan(0);
			expect(s.hints, `step ${s.n}`).toHaveLength(2);
			for (const h of s.hints) expect(h.length, `step ${s.n}`).toBeGreaterThan(10);
			expect(s.hints[0], `step ${s.n}`).not.toBe(s.hints[1]);
		}
	});

	it('matches each trigger to its kind of target', () => {
		for (const s of CHAPTER_1) {
			if (s.trigger === 'pressE') {
				expect(s.target.label, `step ${s.n}`).toBeTruthy();
				expect(['actor', 'seat', 'segment']).toContain(s.target.spec.kind);
			}
			if (s.trigger === 'enterRoom') expect(s.target.spec.kind, `step ${s.n}`).toBe('room');
			if (s.trigger === 'escortArrived') expect(s.target.spec.kind, `step ${s.n}`).toBe('escort');
		}
		expect(CHAPTER_1.filter((s) => s.trigger === 'escortArrived').map((s) => s.n)).toEqual([5, 11]);
	});

	it('has the decision at step 4 and the console at steps 3, 6, 8 and 9', () => {
		expect(CHAPTER_1.filter((s) => s.decision).map((s) => s.n)).toEqual([4]);
		expect(CHAPTER_1.filter((s) => s.console).map((s) => s.n)).toEqual([3, 6, 8, 9]);
	});

	it('opens the console at each console step’s workspace, done on Jordan’s events', () => {
		const at = (n: number) => CHAPTER_1[n - 1];
		expect([3, 6, 8, 9].map((n) => at(n).console!.workspace)).toEqual([
			'queue',
			'setup',
			'igrt',
			'delivery'
		]);
		expect([3, 6, 8, 9].map((n) => at(n).console!.done)).toEqual([
			['chart-opened'],
			['setup-complete'],
			['shift-applied', 'alignment-verified'],
			['treatment-complete']
		]);
		expect(JORDAN_MRN).toBe(TUTORIAL_PATIENTS.jordan.mrn);
		// the storyboard's E prompts: at the console desk, and at the couch
		for (const n of [3, 8, 9]) expect(at(n).target.label).toBe('Open the treatment console');
		expect(at(6).target.label).toBe('Open Patient Setup');
		for (const s of CHAPTER_1.filter((x) => x.console)) {
			expect(s.trigger, `step ${s.n}`).toBe('pressE');
			expect(s.decision ?? s.exchange ?? s.afterSeconds, `step ${s.n}`).toBeUndefined();
			const c = s.console!;
			expect(c.hints[0], `step ${s.n}`).not.toBe(c.hints[1]);
			for (const l of [...c.hints, c.reveal]) expect(l.length, `step ${s.n}`).toBeGreaterThan(10);
		}
	});

	it('keeps step 6’s world actions for when the setup is complete', () => {
		expect(CHAPTER_1[5].onTrigger).toEqual(['jordanOnCouch', 'lasersOn', 'jamieAcrossCouch']);
		expect(CHAPTER_1[2].onTrigger).toEqual(['jordanOnMonitors']);
		expect(CHAPTER_1[7].onTrigger).toEqual(['shiftApplied']);
		expect(CHAPTER_1[8].onComplete).toEqual(['beamOff']);
	});

	it('gives every decision exactly one correct answer and three feedback lines', () => {
		for (const s of CHAPTER_1) {
			const d = s.decision;
			if (!d) continue;
			expect(
				d.options.filter((o) => o.correct),
				`step ${s.n}`
			).toHaveLength(1);
			expect(new Set(d.options.map((o) => o.id)).size, `step ${s.n}`).toBe(d.options.length);
			expect(d.options.length, `step ${s.n}`).toBeGreaterThanOrEqual(2);
			const lines = [...d.hints, d.reveal];
			expect(lines, `step ${s.n}`).toHaveLength(3);
			for (const l of [...lines, d.reason]) expect(l.length, `step ${s.n}`).toBeGreaterThan(10);
		}
	});

	it('does not put a decision’s correct answer first', () => {
		for (const s of CHAPTER_1.filter((x) => x.decision))
			expect(s.decision!.options[0].correct, `step ${s.n}`).toBeUndefined();
	});

	it('tells Jordan’s identity at check-in, which the console’s schedule then matches', () => {
		const j = TUTORIAL_PATIENTS.jordan,
			said = (CHAPTER_1[0].exchange ?? []).map((l) => l.text).join(' ');
		expect(said).toContain('Jordan Ellis');
		expect(said).toContain(j.born);
		expect(said).toContain(j.vault);
		expect(said).toContain(j.time);
		const schedule = CHAPTER_1[2].console!;
		expect(schedule.hints[1]).toContain(j.born);
		for (const v of [j.name, j.born, j.vault, j.time]) expect(schedule.reveal).toContain(v);
		// the look-alikes are told apart by the date of birth and the vault
		expect(TUTORIAL_PATIENTS.jordanLookalike.born).not.toBe(j.born);
		expect(TUTORIAL_PATIENTS.jody.vault).not.toBe(j.vault);
		expect(CHAPTER_1[3].decision!.options.find((o) => o.correct)!.text).toBe(
			'Full name and date of birth'
		);
		expect(CHAPTER_1[7].console!.hints[1]).toContain(`${TUTORIAL_SHIFT_MM} mm`);
	});

	it('waits 6 s after sitting down; the console runs the beam', () => {
		expect(CHAPTER_1[1].afterSeconds).toBe(6);
		expect(CHAPTER_1.filter((s) => s.afterSeconds).map((s) => s.n)).toEqual([2]);
		for (const s of CHAPTER_1) if (s.afterSeconds) expect(s.trigger, `step ${s.n}`).toBe('pressE');
	});

	it('puts Jamie Williams behind the player at the console desk, never in front of it', () => {
		// the player faces the desk (-x) from its stand line: Jamie is behind them, out of E's view,
		// and farther from them than the desk edge is
		const [jx] = WORLD.jamieControl,
			standX = WORLD.console.stand[0],
			edgeX = WORLD.console.a[0];
		expect(jx).toBeGreaterThan(standX + 1);
		expect(jx - standX).toBeGreaterThan(standX - edgeX);
	});

	it('uses only the actions tutorial.ts performs', () => {
		for (const s of CHAPTER_1)
			for (const a of [...(s.onStart ?? []), ...(s.onTrigger ?? []), ...(s.onComplete ?? [])])
				expect(ACTIONS, `step ${s.n}`).toContain(a);
	});

	it('names people by name or they/them, never he or she', () => {
		for (const t of texts()) expect(t).not.toMatch(/\b(he|him|his|she|her|hers)\b/i);
	});

	it('ends the escorts on the journey’s own finals', () => {
		expect(CHAPTER_1[4].target.spec).toEqual({
			kind: 'escort',
			final: WORLD.couchSide
		});
		expect(WORLD.couchSide).toEqual([76.7, -15.25]);
		expect(WORLD.changingArea).toEqual([69.0, -14.15]);
		expect(CHAPTER_1[10].target.spec).toEqual({
			kind: 'escort',
			final: WORLD.lobbyDesk
		});
		expect(WORLD.lobbyDesk).toEqual(WORLD.checkIn);
	});
});
