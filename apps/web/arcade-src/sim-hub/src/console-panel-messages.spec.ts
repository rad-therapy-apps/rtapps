import { describe, expect, it } from 'vitest';
import {
	consoleUrl,
	gateMessage,
	linacPanel,
	linacRoom,
	messageFrom,
	readCtMessage,
	readLinacMessage,
	recordsCtScan,
	sameRoom
} from './console-panel-messages';

const ORIGIN = 'https://rtapps.example';
// the center page's own URL, as location.href gives it
const CENTER = 'https://rtapps.example/arcade/sim-hub/index.html?npccheck&hq';

describe('consoleUrl', () => {
	it('opens the LINAC console in console mode on the LINAC side, on the center’s origin', () => {
		expect(consoleUrl('linac', 'free', CENTER)).toBe(
			'https://rtapps.example/arcade/linac-ct/index.html?view=console&side=linac'
		);
		expect(consoleUrl('linac', 'tutorial', CENTER)).toBe(
			'https://rtapps.example/arcade/linac-ct/index.html?view=console&side=linac&scenario=tutorial'
		);
	});

	it('opens the CT console in console mode', () => {
		expect(consoleUrl('ct', 'free', CENTER)).toBe(
			'https://rtapps.example/arcade/linac-ct/ct-suite.html?view=console'
		);
		expect(consoleUrl('ct', 'tutorial', 'http://127.0.0.1:4173/arcade/sim-hub/')).toBe(
			'http://127.0.0.1:4173/arcade/linac-ct/ct-suite.html?view=console&scenario=tutorial'
		);
	});

	it('builds from the Node checks’ stubbed location too, which has an href but no origin', () => {
		expect(consoleUrl('linac', 'tutorial', 'http://localhost/')).toBe(
			'http://localhost/arcade/linac-ct/index.html?view=console&side=linac&scenario=tutorial'
		);
	});
});

describe('messageFrom', () => {
	const linacWin = { name: 'linac frame' },
		ctWin = { name: 'ct frame' },
		frames = { linac: linacWin, ct: ctWin };

	it('names the console whose frame sent the message from the center’s own origin', () => {
		expect(messageFrom(linacWin, ORIGIN, frames, ORIGIN)).toBe('linac');
		expect(messageFrom(ctWin, ORIGIN, frames, ORIGIN)).toBe('ct');
	});

	it('ignores any other window, even one on the same origin', () => {
		expect(messageFrom({ name: 'the page around the center' }, ORIGIN, frames, ORIGIN)).toBe(null);
		expect(messageFrom(null, ORIGIN, frames, ORIGIN)).toBe(null);
	});

	it('ignores the right window when the origin is not the center’s', () => {
		expect(messageFrom(linacWin, 'https://evil.example', frames, ORIGIN)).toBe(null);
		expect(messageFrom(ctWin, 'null', frames, ORIGIN)).toBe(null);
	});

	it('names nothing before the console frame exists', () => {
		expect(messageFrom(linacWin, ORIGIN, { ct: ctWin }, ORIGIN)).toBe(null);
		expect(messageFrom(undefined, ORIGIN, {}, ORIGIN)).toBe(null);
	});
});

const POSE = {
	gantry: 180,
	collimator: 0,
	couchAngle: 0,
	couchVrt: -12.5,
	couchLng: 101.3,
	couchLat: 0.4,
	jawX1: -5,
	jawX2: 5,
	jawY1: -6,
	jawY2: 6,
	kvArmsOut: false,
	epidOut: true,
	beamOn: false,
	lasersOn: true
};

describe('readLinacMessage', () => {
	it('reads ready with its scenario', () => {
		expect(readLinacMessage({ type: 'rtapps-linac-ready', scenario: 'tutorial' })).toEqual({
			type: 'rtapps-linac-ready',
			scenario: 'tutorial'
		});
		expect(readLinacMessage({ type: 'rtapps-linac-ready', scenario: 'demo' })).toBe(null);
	});

	it('reads a pose message, keeping only the contract’s fields', () => {
		const msg = readLinacMessage({
			type: 'rtapps-linac-state',
			pose: { ...POSE, extra: 'dropped' },
			mrn: 'TUT-680314',
			workspace: 'delivery',
			extra: 1
		});
		expect(msg).toEqual({
			type: 'rtapps-linac-state',
			pose: POSE,
			mrn: 'TUT-680314',
			workspace: 'delivery'
		});
	});

	it('accepts a pose on the queue with no chart open', () => {
		expect(
			readLinacMessage({ type: 'rtapps-linac-state', pose: POSE, mrn: null, workspace: 'queue' })
		).not.toBe(null);
	});

	it('refuses a pose with a field missing, not a number, or not finite', () => {
		const state = (pose: unknown) =>
			readLinacMessage({ type: 'rtapps-linac-state', pose, mrn: null, workspace: 'queue' });
		const noGantry: Partial<typeof POSE> = { ...POSE };
		delete noGantry.gantry;
		expect(state(noGantry)).toBe(null);
		expect(state({ ...POSE, couchVrt: '12' })).toBe(null);
		expect(state({ ...POSE, jawX1: Number.NaN })).toBe(null);
		expect(state({ ...POSE, gantry: Infinity })).toBe(null);
		expect(state({ ...POSE, beamOn: 1 })).toBe(null);
		expect(state(null)).toBe(null);
	});

	it('reads the geometry hold when the state carries one, a fresh copy of its fields', () => {
		const geometryHold = {
			field: 'Right Lateral',
			mismatches: [{ label: 'Gantry', now: '0°', planned: '270°', extra: 1 }],
			extra: 'dropped'
		};
		const base = {
			type: 'rtapps-linac-state',
			pose: POSE,
			mrn: 'TUT-680314',
			workspace: 'delivery'
		};
		const msg = readLinacMessage({ ...base, geometryHold });
		expect(msg).toEqual({
			...base,
			geometryHold: {
				field: 'Right Lateral',
				mismatches: [{ label: 'Gantry', now: '0°', planned: '270°' }]
			}
		});
		expect(msg && msg.type === 'rtapps-linac-state' && msg.geometryHold).not.toBe(geometryHold);
		expect(readLinacMessage({ ...base, geometryHold: null })).toEqual({
			...base,
			geometryHold: null
		});
		// a state from before the hold was in the contract is still read
		expect(readLinacMessage(base)).toEqual(base);
	});

	it('refuses a state whose geometry hold is malformed', () => {
		const state = (geometryHold: unknown) =>
			readLinacMessage({
				type: 'rtapps-linac-state',
				pose: POSE,
				mrn: null,
				workspace: 'queue',
				geometryHold
			});
		expect(state({ mismatches: [] })).toBe(null);
		expect(state({ field: 'Right Lateral', mismatches: 'Gantry' })).toBe(null);
		expect(state({ field: 'Right Lateral', mismatches: [{ label: 'Gantry', now: 0 }] })).toBe(null);
		expect(state('Right Lateral')).toBe(null);
		expect(state({ field: 'Right Lateral', mismatches: [] })).not.toBe(null);
	});

	it('refuses a pose message with an unknown workspace or a bad MRN', () => {
		expect(
			readLinacMessage({ type: 'rtapps-linac-state', pose: POSE, mrn: null, workspace: 'vault' })
		).toBe(null);
		expect(
			readLinacMessage({ type: 'rtapps-linac-state', pose: POSE, mrn: 42, workspace: 'queue' })
		).toBe(null);
	});

	it('reads each event kind with the fields it carries', () => {
		const ev = (event: unknown) => readLinacMessage({ type: 'rtapps-linac-event', event });
		expect(ev({ kind: 'chart-opened', mrn: 'TUT-680314' })).toEqual({
			type: 'rtapps-linac-event',
			event: { kind: 'chart-opened', mrn: 'TUT-680314' }
		});
		expect(ev({ kind: 'images-acquired', mrn: 'TUT-680314', shiftMm: 4 })).toEqual({
			type: 'rtapps-linac-event',
			event: { kind: 'images-acquired', mrn: 'TUT-680314', shiftMm: 4 }
		});
		expect(
			ev({ kind: 'field-delivered', mrn: 'TUT-680314', field: 'AP', index: 1, of: 2, note: 'x' })
		).toEqual({
			type: 'rtapps-linac-event',
			event: { kind: 'field-delivered', mrn: 'TUT-680314', field: 'AP', index: 1, of: 2 }
		});
		expect(
			ev({ kind: 'mistake', workspace: 'igrt', code: 'shift-first', message: 'Apply the shift' })
		).toEqual({
			type: 'rtapps-linac-event',
			event: {
				kind: 'mistake',
				workspace: 'igrt',
				code: 'shift-first',
				message: 'Apply the shift'
			}
		});
	});

	it('refuses an unknown event kind or an event missing its fields', () => {
		const ev = (event: unknown) => readLinacMessage({ type: 'rtapps-linac-event', event });
		expect(ev({ kind: 'beam-on', mrn: 'TUT-680314' })).toBe(null);
		expect(ev({ kind: 'toString', mrn: 'TUT-680314' })).toBe(null);
		expect(ev({ kind: 'chart-opened' })).toBe(null);
		expect(ev({ kind: 'images-acquired', mrn: 'TUT-680314', shiftMm: '4' })).toBe(null);
		expect(ev({ kind: 'field-delivered', mrn: 'TUT-680314', field: 'AP', index: 1 })).toBe(null);
		expect(ev({ kind: 'mistake', workspace: 'vault', code: 'x', message: 'y' })).toBe(null);
		expect(ev('chart-opened')).toBe(null);
	});

	it('refuses other types and anything that is not an object', () => {
		expect(readLinacMessage({ type: 'rtapps-linac-open', workspace: 'queue' })).toBe(null);
		expect(readLinacMessage({ type: 'rtapps-ct-ready' })).toBe(null);
		expect(readLinacMessage('rtapps-linac-ready')).toBe(null);
		expect(readLinacMessage(null)).toBe(null);
	});
});

describe('readCtMessage', () => {
	const CT_POSE = {
		tableTravel: 0.4,
		tableHeight: 1,
		scanning: true,
		xrayOn: true,
		lasersOn: false
	};

	it('reads ready, the scanner pose and a finished scan', () => {
		expect(readCtMessage({ type: 'rtapps-ct-ready' })).toEqual({ type: 'rtapps-ct-ready' });
		expect(
			readCtMessage({ type: 'rtapps-ct-state', pose: { ...CT_POSE, extra: 1 }, step: 'Scan' })
		).toEqual({ type: 'rtapps-ct-state', pose: CT_POSE, step: 'Scan' });
		expect(
			readCtMessage({
				type: 'rtapps-ct-complete',
				key: 'prostate',
				patient: 'Mia Chen',
				series: 'CT Sim Pelvis',
				images: 120
			})
		).toEqual({
			type: 'rtapps-ct-complete',
			key: 'prostate',
			patient: 'Mia Chen',
			series: 'CT Sim Pelvis',
			images: 120
		});
	});

	it('refuses a bad pose, a missing step or a scan with missing fields', () => {
		expect(readCtMessage({ type: 'rtapps-ct-state', pose: CT_POSE })).toBe(null);
		expect(
			readCtMessage({ type: 'rtapps-ct-state', pose: { ...CT_POSE, scanning: 'yes' }, step: '' })
		).toBe(null);
		expect(
			readCtMessage({
				type: 'rtapps-ct-state',
				pose: { ...CT_POSE, tableTravel: Number.NaN },
				step: ''
			})
		).toBe(null);
		expect(
			readCtMessage({ type: 'rtapps-ct-complete', key: 'prostate', patient: 'Mia', images: 9 })
		).toBe(null);
	});

	it('refuses messages outside the contract', () => {
		expect(readCtMessage({ type: 'rtapps-ct-case-loaded', key: 'k' })).toBe(null);
		expect(readCtMessage({ type: 'rtapps-linac-ready', scenario: 'free' })).toBe(null);
		expect(readCtMessage(undefined)).toBe(null);
	});
});

describe('gateMessage', () => {
	const state = {
		type: 'rtapps-linac-state' as const,
		pose: POSE,
		mrn: null,
		workspace: 'queue' as const
	};
	const event = {
		type: 'rtapps-linac-event' as const,
		event: { kind: 'treatment-complete' as const, mrn: 'TUT-680314' }
	};

	it('makes the LINAC console ready only on a ready from the scenario asked for', () => {
		expect(
			gateMessage({ type: 'rtapps-linac-ready', scenario: 'tutorial' }, false, 'tutorial')
		).toBe('ready');
		expect(gateMessage({ type: 'rtapps-linac-ready', scenario: 'free' }, false, 'tutorial')).toBe(
			'drop'
		);
		expect(gateMessage({ type: 'rtapps-linac-ready', scenario: 'free' }, true, 'free')).toBe(
			'ready'
		);
	});

	it('drops every other message until the console is ready: early, or left by the page before', () => {
		expect(gateMessage(state, false, 'free')).toBe('drop');
		expect(gateMessage(event, false, 'tutorial')).toBe('drop');
		expect(gateMessage(state, true, 'free')).toBe('accept');
		expect(gateMessage(event, true, 'tutorial')).toBe('accept');
	});

	it('gates the CT console on its ready alone (it has no scenario)', () => {
		const ctState = {
			type: 'rtapps-ct-state' as const,
			pose: { tableTravel: 0, tableHeight: 0, scanning: false, xrayOn: false, lasersOn: true },
			step: 'Position'
		};
		expect(gateMessage({ type: 'rtapps-ct-ready' }, false, 'tutorial')).toBe('ready');
		expect(gateMessage(ctState, false, 'free')).toBe('drop');
		expect(gateMessage(ctState, true, 'free')).toBe('accept');
	});
});

describe('linacRoom and sameRoom', () => {
	it('counts the door closed only when it is fully shut', () => {
		expect(linacRoom(0, 'linaccontrol')).toEqual({
			type: 'rtapps-linac-room',
			doorClosed: true,
			staffInVault: false
		});
		expect(linacRoom(0.02, 'linaccontrol').doorClosed).toBe(false);
		expect(linacRoom(1, 'vault1')).toEqual({
			type: 'rtapps-linac-room',
			doorClosed: false,
			staffInVault: true
		});
	});

	it('has staff in the vault only while the player is in Vault 1', () => {
		expect(linacRoom(0, 'vault1').staffInVault).toBe(true);
		expect(linacRoom(0, 'vault2').staffInVault).toBe(false);
		expect(linacRoom(0, 'linaccontrol').staffInVault).toBe(false);
		expect(linacRoom(0, null).staffInVault).toBe(false);
	});

	it('sees a change in either field, and nothing sent yet as a change', () => {
		const shut = linacRoom(0, null);
		expect(sameRoom(shut, linacRoom(0, 'lobby'))).toBe(true);
		expect(sameRoom(shut, linacRoom(0.5, null))).toBe(false);
		expect(sameRoom(shut, linacRoom(0, 'vault1'))).toBe(false);
		expect(sameRoom(null, shut)).toBe(false);
	});
});

describe('linacPanel', () => {
	it('tells the LINAC console it is shown only while the panel shows it', () => {
		expect(linacPanel('linac')).toEqual({ type: 'rtapps-linac-panel', open: true });
		// closed, or showing the CT console instead: the therapist has left the LINAC console
		expect(linacPanel(null)).toEqual({ type: 'rtapps-linac-panel', open: false });
		expect(linacPanel('ct')).toEqual({ type: 'rtapps-linac-panel', open: false });
	});
});

describe('recordsCtScan', () => {
	it('records a finished scan once per key, in the free scenario only', () => {
		const recorded = new Set(['hn']);
		expect(recordsCtScan('free', 'prostate', recorded)).toBe(true);
		expect(recordsCtScan('free', 'hn', recorded)).toBe(false);
		expect(recordsCtScan('tutorial', 'prostate', recorded)).toBe(false);
		expect(recordsCtScan('free', '', recorded)).toBe(false);
	});
});
