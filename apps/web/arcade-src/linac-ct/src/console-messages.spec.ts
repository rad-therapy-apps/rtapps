import { describe, it, expect } from 'vitest';
import { LINAC_WORKSPACES } from '../../shared/console-protocol';
import {
	beamRefusal,
	consoleViewFromSearch,
	correctionApplied,
	fromCenter,
	interlockRefusal,
	isLinacWorkspace,
	parseCenterMessage,
	poseFromReadout,
	samePose,
	shiftLengthMm,
	STATE_MIN_GAP_MS,
	statePostDue,
	type BeamState,
	type MachineReadout
} from './console-messages';

describe('console mode from the URL', () => {
	it('starts console mode only for view=console', () => {
		expect(consoleViewFromSearch('?view=console&side=linac')).toEqual({
			console: true,
			scenario: 'free'
		});
		expect(consoleViewFromSearch('?side=linac')).toEqual({ console: false, scenario: 'free' });
		expect(consoleViewFromSearch('?view=Console')).toEqual({ console: false, scenario: 'free' });
		expect(consoleViewFromSearch('')).toEqual({ console: false, scenario: 'free' });
	});

	it('reads the tutorial scenario only inside console mode', () => {
		expect(consoleViewFromSearch('?view=console&side=linac&scenario=tutorial').scenario).toBe(
			'tutorial'
		);
		expect(consoleViewFromSearch('?scenario=tutorial').scenario).toBe('free');
		expect(consoleViewFromSearch('?view=console&scenario=other').scenario).toBe('free');
	});
});

describe('which messages the console accepts', () => {
	const parent = { name: 'parent window' },
		other = { name: 'some other window' };

	it('accepts only the parent window on its own origin', () => {
		const own = 'http://127.0.0.1:5173';
		expect(fromCenter(parent, own, parent, own)).toBe(true);
		expect(fromCenter(other, own, parent, own)).toBe(false);
		expect(fromCenter(parent, 'http://evil.example', parent, own)).toBe(false);
		expect(fromCenter(null, own, null, own)).toBe(false);
	});

	it('parses the open message and keeps only the contract fields', () => {
		expect(parseCenterMessage({ type: 'rtapps-linac-open', workspace: 'igrt', extra: 1 })).toEqual({
			type: 'rtapps-linac-open',
			workspace: 'igrt'
		});
		for (const w of ['queue', 'setup', 'igrt', 'delivery'])
			expect(parseCenterMessage({ type: 'rtapps-linac-open', workspace: w })).not.toBeNull();
	});

	it('refuses an open message with an unknown workspace', () => {
		expect(parseCenterMessage({ type: 'rtapps-linac-open', workspace: 'chart' })).toBeNull();
		expect(parseCenterMessage({ type: 'rtapps-linac-open' })).toBeNull();
	});

	it('parses the room message only with both booleans', () => {
		expect(
			parseCenterMessage({ type: 'rtapps-linac-room', doorClosed: false, staffInVault: true })
		).toEqual({ type: 'rtapps-linac-room', doorClosed: false, staffInVault: true });
		expect(
			parseCenterMessage({ type: 'rtapps-linac-room', doorClosed: 'no', staffInVault: false })
		).toBeNull();
		expect(parseCenterMessage({ type: 'rtapps-linac-room', doorClosed: true })).toBeNull();
	});

	it('takes the workspaces from the shared contract list, and nothing else', () => {
		expect(LINAC_WORKSPACES).toEqual(['queue', 'setup', 'igrt', 'delivery']);
		for (const w of LINAC_WORKSPACES) expect(isLinacWorkspace(w)).toBe(true);
		for (const w of ['chart', 'machine', 'ois', '', null, undefined, 0])
			expect(isLinacWorkspace(w)).toBe(false);
	});

	it("refuses anything else, including the console's own outgoing messages", () => {
		for (const data of [
			null,
			undefined,
			'rtapps-linac-open',
			42,
			{},
			{ type: 'rtapps-linac-ready', scenario: 'free' },
			{ type: 'rtapps-linac-state', pose: {}, mrn: null, workspace: 'queue' },
			{ type: 'rtapps-linac-event', event: { kind: 'checked-in', mrn: 'x' } },
			{ type: 'rtapps-ct-view', view: 'room' }
		])
			expect(parseCenterMessage(data)).toBeNull();
	});
});

describe('the machine pose the console reports', () => {
	const readout: MachineReadout = {
		gantry: 0,
		collimator: 0,
		couchAngle: 0,
		vrt: 0,
		lng: 0,
		lat: 0,
		jawX1: 5,
		jawX2: 5,
		jawY1: 5,
		jawY2: 5,
		kvOn: false,
		detectorExtended: false,
		beamOn: false,
		lasersOn: false
	};

	it('turns couch millimetres into centimetres and keeps jaw edges in cm', () => {
		const p = poseFromReadout({ ...readout, vrt: 4, lng: -12, lat: 3, jawX1: 2.5 });
		expect([p.couchVrt, p.couchLng, p.couchLat]).toEqual([0.4, -1.2, 0.3]);
		expect([p.jawX1, p.jawX2, p.jawY1, p.jawY2]).toEqual([2.5, 5, 5, 5]);
	});

	it('wraps angles into 0..360 at 0.1 degree', () => {
		expect(poseFromReadout({ ...readout, gantry: -5 }).gantry).toBe(355);
		expect(poseFromReadout({ ...readout, gantry: 359.99 }).gantry).toBe(0);
		expect(poseFromReadout({ ...readout, gantry: 182.46 }).gantry).toBe(182.5);
		expect(poseFromReadout({ ...readout, collimator: 725 }).collimator).toBe(5);
		expect(Object.is(poseFromReadout({ ...readout, couchAngle: -0.01 }).couchAngle, 0)).toBe(true);
		// a moving gantry's in-between angles come out clean
		expect(poseFromReadout({ ...readout, gantry: 0.30000000000001 }).gantry).toBe(0.3);
		expect(poseFromReadout({ ...readout, gantry: 360.3 }).gantry).toBe(0.3);
		expect(poseFromReadout({ ...readout, gantry: 179.96 }).gantry).toBe(180);
	});

	it('reads the hardware flags and survives missing numbers', () => {
		const p = poseFromReadout({
			...readout,
			gantry: Number.NaN,
			kvOn: true,
			detectorExtended: true,
			beamOn: true,
			lasersOn: true
		});
		expect(p.gantry).toBe(0);
		expect([p.kvArmsOut, p.epidOut, p.beamOn, p.lasersOn]).toEqual([true, true, true, true]);
	});

	it('tells a changed pose from an unchanged one', () => {
		const a = poseFromReadout(readout);
		expect(samePose(a, poseFromReadout({ ...readout, gantry: 0.01 }))).toBe(true);
		expect(samePose(a, poseFromReadout({ ...readout, gantry: 5 }))).toBe(false);
		expect(samePose(a, poseFromReadout({ ...readout, kvOn: true }))).toBe(false);
		expect(samePose(null, a)).toBe(false);
		expect(samePose(null, null)).toBe(true);
	});
});

describe('the state stream rate', () => {
	it('never posts more than 30 times in any second, however the timer jitters', () => {
		const posts: number[] = [];
		let last: number | null = null;
		// a timer meant for every 17 ms that fires anywhere from 12 to 22 ms apart
		for (let t = 0, i = 0; t < 5000; t += 12 + ((i++ * 7) % 11))
			if (statePostDue(t, last)) posts.push((last = t));
		let worst = 0;
		for (let i = 0; i < posts.length; i++) {
			let j = i;
			while (j < posts.length && posts[j] - posts[i] < 1000) j++;
			worst = Math.max(worst, j - i);
		}
		expect(worst).toBeLessThanOrEqual(30);
		// and keeps the stream close to that: a moving gantry still reads smoothly
		expect(worst).toBeGreaterThanOrEqual(20);
	});

	it('posts the first state at once', () => {
		expect(statePostDue(5, null)).toBe(true);
		expect(statePostDue(5 + STATE_MIN_GAP_MS - 1, 5)).toBe(false);
		expect(statePostDue(5 + STATE_MIN_GAP_MS, 5)).toBe(true);
	});
});

describe('couch corrections', () => {
	it('measures the translation length in mm', () => {
		expect(shiftLengthMm({ lat: 0, lng: 0, vrt: 4 })).toBe(4);
		expect(shiftLengthMm({ lat: -3, lng: 0, vrt: 4 })).toBe(5);
		expect(shiftLengthMm({ lat: 1, lng: -1, vrt: 1 })).toBe(1.7);
	});

	it('counts a correction as applied once every residual is inside tolerance', () => {
		const tol = { translation: 1, rotation: 0.5 },
			zero = { lat: 0, lng: 0, vrt: 0, roll: 0, pitch: 0, yaw: 0 };
		expect(correctionApplied({ ...zero, vrt: 4 }, tol, 'CBCT')).toBe(false);
		expect(correctionApplied({ ...zero, vrt: 1 }, tol, 'CBCT')).toBe(true);
		expect(correctionApplied({ ...zero, vrt: -1.5 }, tol, 'CBCT')).toBe(false);
		expect(correctionApplied({ ...zero, roll: 1 }, tol, 'CBCT')).toBe(false);
		// an MV pair cannot see roll, so Verify Alignment ignores it
		expect(correctionApplied({ ...zero, roll: 1 }, tol, 'MV Pair')).toBe(true);
	});
});

describe('refused Enable Beam and Beam On', () => {
	const ready: BeamState = {
		armed: false,
		delivering: false,
		completed: false,
		ready: true,
		checks: [{ name: 'Patient / plan loaded', ok: true, detail: 'Prostate' }]
	};
	const hold = (...failed: [string, string][]): BeamState => ({
		...ready,
		ready: false,
		checks: [...ready.checks, ...failed.map(([name, detail]) => ({ name, ok: false, detail }))]
	});

	it('lets Enable Beam go when every interlock is satisfied, and Beam On once it is enabled', () => {
		expect(beamRefusal('enable', ready)).toBeNull();
		expect(beamRefusal('on', { ...ready, armed: true })).toBeNull();
	});

	it('refuses Beam On before Enable Beam', () => {
		expect(beamRefusal('on', ready)).toEqual({
			code: 'beam-not-enabled',
			message: 'Beam On refused. Press Enable Beam first.'
		});
	});

	it('names the door when the vault door is open', () => {
		const r = beamRefusal('enable', hold(['Vault door closed', 'Close the vault door']));
		expect(r).toEqual({
			code: 'door-open',
			message: 'Enable Beam refused. Treatment holds: Vault door closed (Close the vault door).'
		});
	});

	it('codes an early Beam On by its most basic failed interlock and lists them all in order', () => {
		const r = beamRefusal(
			'on',
			hold(
				['Treatment geometry matches plan', 'Review parameter mismatches'],
				['Image guidance verified', 'Registration / correction incomplete'],
				['Imaging hardware retracted', 'kV extended']
			)
		);
		expect(r.code).toBe('igrt-not-verified');
		expect(r.message).toBe(
			'Beam On refused. Treatment holds: Treatment geometry matches plan (Review parameter mismatches); Image guidance verified (Registration / correction incomplete); Imaging hardware retracted (kV extended).'
		);
		expect(
			beamRefusal('on', hold(['Image guidance verified', 'x'], ['Vault door closed', 'y'])).code
		).toBe('door-open');
		expect(beamRefusal('on', hold(['Something new', 'x'])).code).toBe('interlock');
	});

	it('words a refused Resume Beam the same way', () => {
		expect(
			interlockRefusal('Resume Beam', hold(['Vault door closed', 'Close the vault door']).checks)
		).toEqual({
			code: 'door-open',
			message: 'Resume Beam refused. Treatment holds: Vault door closed (Close the vault door).'
		});
	});

	it('asks for the next field once this one is complete, and stays quiet while the beam is on', () => {
		expect(beamRefusal('on', { ...ready, completed: true }).code).toBe('field-complete');
		expect(beamRefusal('on', { ...hold(['Vault door closed', 'x']), delivering: true })).toBeNull();
	});
});
