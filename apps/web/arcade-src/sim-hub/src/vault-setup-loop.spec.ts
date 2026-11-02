import { describe, expect, it } from 'vitest';
import { VAULT2_SETUP_STEPS, VAULT2_STEP_SEC, vault2StepAt } from './vault-setup-loop';

describe('vault 2 setup loop', () => {
	it('steps through identity check, positioning, setup imaging and setup verified', () => {
		expect(VAULT2_SETUP_STEPS.map((s) => s.state)).toEqual([
			'IDENTITY CHECK',
			'POSITIONING',
			'SETUP IMAGING',
			'SETUP VERIFIED'
		]);
	});
	it('moves to the next step every VAULT2_STEP_SEC seconds and starts over', () => {
		expect(vault2StepAt(0)).toBe(0);
		expect(vault2StepAt(VAULT2_STEP_SEC - 0.01)).toBe(0);
		expect(vault2StepAt(VAULT2_STEP_SEC)).toBe(1);
		expect(vault2StepAt(VAULT2_STEP_SEC * 3.5)).toBe(3);
		expect(vault2StepAt(VAULT2_STEP_SEC * 4)).toBe(0);
	});
	it('never shows beam on: a therapist stays in the room', () => {
		for (const s of VAULT2_SETUP_STEPS) expect(JSON.stringify(s).toUpperCase()).not.toMatch(/BEAM/);
	});
});
