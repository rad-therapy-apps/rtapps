import { describe, it, expect } from 'vitest';
import {
	ctPose,
	ctStepLabel,
	createStateGate,
	isTrustedParentMessage,
	postTargetOrigin,
	type CtPoseInput
} from './ct-state';

const base: CtPoseInput = {
	couchZ: 20,
	couchY: -6,
	scanning: false,
	topogramming: false,
	xray: false,
	step: 1
};

describe('ctPose', () => {
	it('maps the table range onto 0..1 (home and lowest to fully in and highest)', () => {
		expect(ctPose(base)).toMatchObject({ tableTravel: 0, tableHeight: 0 });
		expect(ctPose({ ...base, couchZ: -16, couchY: 6 })).toMatchObject({
			tableTravel: 1,
			tableHeight: 1
		});
		expect(ctPose({ ...base, couchZ: 2, couchY: 0 })).toMatchObject({
			tableTravel: 0.5,
			tableHeight: 0.5
		});
	});
	it('clamps positions beyond the range', () => {
		const p = ctPose({ ...base, couchZ: -99, couchY: 99 });
		expect(p.tableTravel).toBe(1);
		expect(p.tableHeight).toBe(1);
	});
	it('rises as the table indexes into the bore during a scan', () => {
		const a = ctPose({ ...base, couchZ: 12, scanning: true }).tableTravel;
		const b = ctPose({ ...base, couchZ: -14, scanning: true }).tableTravel;
		expect(b).toBeGreaterThan(a);
	});
	it('reports scanning for a helical scan and for a topogram', () => {
		expect(ctPose({ ...base, scanning: true }).scanning).toBe(true);
		expect(ctPose({ ...base, topogramming: true }).scanning).toBe(true);
		expect(ctPose(base).scanning).toBe(false);
	});
	it('passes x-ray through and turns the lasers on from the positioning step', () => {
		expect(ctPose({ ...base, xray: true }).xrayOn).toBe(true);
		expect(ctPose({ ...base, step: 2 }).lasersOn).toBe(false);
		expect(ctPose({ ...base, step: 3 }).lasersOn).toBe(true);
	});
});

describe('ctStepLabel', () => {
	it('matches the console wording', () => {
		expect(ctStepLabel(3)).toBe('Step 3 · Position');
		expect(ctStepLabel(6)).toBe('Step 6 · Scan');
	});
});

describe('createStateGate', () => {
	const pose = ctPose(base);
	it('posts the first state, then stays quiet while nothing changes', () => {
		const gate = createStateGate();
		expect(gate(pose, 'a', 0)).toBe(true);
		expect(gate(pose, 'a', 100)).toBe(false);
	});
	it('posts a change, but at most once per 33 ms', () => {
		const gate = createStateGate();
		gate(pose, 'a', 0);
		expect(gate({ ...pose, xrayOn: true }, 'a', 10)).toBe(false);
		expect(gate({ ...pose, xrayOn: true }, 'a', 40)).toBe(true);
	});
	it('posts a step change', () => {
		const gate = createStateGate();
		gate(pose, 'a', 0);
		expect(gate(pose, 'b', 50)).toBe(true);
	});
	it('ignores sub-pixel table drift', () => {
		const gate = createStateGate();
		gate(pose, 'a', 0);
		expect(gate({ ...pose, tableTravel: 0.0005 }, 'a', 100)).toBe(false);
	});
});

describe('message checks', () => {
	const parent = {},
		self = {};
	it('accepts the parent window on this origin', () => {
		expect(
			isTrustedParentMessage({ source: parent, origin: 'http://x' }, parent, self, 'http://x')
		).toBe(true);
	});
	it('rejects another window, another origin, or the page itself', () => {
		expect(
			isTrustedParentMessage({ source: {}, origin: 'http://x' }, parent, self, 'http://x')
		).toBe(false);
		expect(
			isTrustedParentMessage({ source: parent, origin: 'http://evil' }, parent, self, 'http://x')
		).toBe(false);
		expect(
			isTrustedParentMessage({ source: self, origin: 'http://x' }, self, self, 'http://x')
		).toBe(false);
	});
	it('has no target origin where the page origin is opaque', () => {
		expect(postTargetOrigin('http://x')).toBe('http://x');
		expect(postTargetOrigin('null')).toBeNull();
	});
});
