import { describe, it, expect } from 'vitest';
import {
	CHAPTER_1,
	LINES,
	ROLES,
	WAIT_FOR_JAMIE,
	WAIT_FOR_JORDAN,
	WORLD,
	eHintText
} from './tutorial-steps';
import type { StepAction } from './tutorial-steps';

const ACTIONS: StepAction[] = [
	'pickChair',
	'sitPlayer',
	'intercomToControl',
	'jordanConfirms',
	'escortToVault',
	'jordanOnCouch',
	'lasersOn',
	'jamieAcrossCouch',
	'jamieToControl',
	'holdVaultClosed',
	'shiftApplied',
	'beamOn',
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
		if (s.countdown) out.push(s.countdown);
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

	it('has the decisions at steps 3, 4, 6 and 8', () => {
		expect(CHAPTER_1.filter((s) => s.decision).map((s) => s.n)).toEqual([3, 4, 6, 8]);
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

	it('does not put the correct answer in the same place in every decision', () => {
		const at = CHAPTER_1.filter((s) => s.decision).map((s) =>
			s.decision!.options.findIndex((o) => o.correct)
		);
		expect(new Set(at).size).toBeGreaterThan(1);
	});

	it('tells Jordan’s identity at check-in, which the schedule answer then matches', () => {
		const said = (CHAPTER_1[0].exchange ?? []).map((l) => l.text).join(' ');
		expect(said).toContain('Jordan Ellis');
		expect(said).toContain('March 14, 1968');
		expect(said).toContain('Vault 1');
		const right = CHAPTER_1[2].decision!.options.find((o) => o.correct)!.text;
		expect(right).toContain('March 14, 1968');
		expect(right).toContain('Vault 1');
		expect(CHAPTER_1[3].decision!.options.find((o) => o.correct)!.text).toBe(
			'Full name and date of birth'
		);
		expect(CHAPTER_1[7].decision!.options.find((o) => o.correct)!.text).toMatch(/^Apply the/);
	});

	it('waits 6 s after sitting down and counts down 10 s of beam', () => {
		expect(CHAPTER_1[1].afterSeconds).toBe(6);
		expect(CHAPTER_1[8].afterSeconds).toBe(10);
		expect(CHAPTER_1[8].countdown).toContain('{s}');
		for (const s of CHAPTER_1) if (s.afterSeconds) expect(s.trigger, `step ${s.n}`).toBe('pressE');
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
