import { describe, it, expect } from 'vitest';
import { monitorLines } from './vault-linac-monitor';

const NAMED = { detail: 'On the treatment couch', status: 'PATIENT IN THE ROOM' };

describe('Vault 1 in-room monitor text', () => {
	it('names the patient lying on the couch when the center knows the name', () => {
		expect(monitorLines(null, { name: 'Mia Reynolds' })).toEqual({
			patient: 'Mia Reynolds',
			...NAMED
		});
	});

	it('says a patient is on the couch when the name is not known', () => {
		expect(monitorLines(null, { name: null })).toEqual({
			patient: 'Patient on the couch',
			detail: 'Vault 1 treatment couch',
			status: 'PATIENT IN THE ROOM'
		});
	});

	it('shows a neutral screen with nobody on the couch', () => {
		const empty = { patient: 'No patient', detail: 'The couch is empty', status: 'ROOM READY' };
		expect(monitorLines(null, null)).toEqual(empty);
		expect(monitorLines('   ', null)).toEqual(empty);
	});

	it("shows the Tutorial's patient over whoever lies there, until it is cleared", () => {
		expect(monitorLines('  Jordan Ellis ', { name: null })).toEqual({
			patient: 'Jordan Ellis',
			...NAMED
		});
		expect(monitorLines('Jordan Ellis', null).patient).toBe('Jordan Ellis');
		expect(monitorLines(null, { name: null }).patient).toBe('Patient on the couch');
	});
});
