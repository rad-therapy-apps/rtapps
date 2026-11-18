import { describe, it, expect } from 'vitest';
import { monitorLines } from './vault-linac-monitor';

describe('Vault 1 in-room monitor text', () => {
	it('names the patient on the couch', () => {
		expect(monitorLines('Jordan Ellis')).toEqual({
			patient: 'Jordan Ellis',
			detail: 'On the treatment couch',
			status: 'PATIENT IN THE ROOM'
		});
	});

	it('shows a neutral screen with no patient, or only spaces', () => {
		const empty = { patient: 'No patient', detail: 'The couch is empty', status: 'ROOM READY' };
		expect(monitorLines(null)).toEqual(empty);
		expect(monitorLines('   ')).toEqual(empty);
		expect(monitorLines('  Jordan Ellis ').patient).toBe('Jordan Ellis');
	});
});
