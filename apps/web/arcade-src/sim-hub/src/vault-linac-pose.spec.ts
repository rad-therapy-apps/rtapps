import { describe, it, expect } from 'vitest';
import type { LinacPose } from '../../shared/console-protocol';
import {
	APP,
	LIMITS,
	SMOOTHING,
	clampPose,
	jawOffset,
	parkedPose,
	partPose,
	smoothPose
} from './vault-linac-pose';

const HOME: LinacPose = {
	gantry: 0,
	collimator: 0,
	couchAngle: 0,
	couchVrt: 0,
	couchLng: 0,
	couchLat: 0,
	jawX1: 5,
	jawX2: 5,
	jawY1: 5,
	jawY2: 5,
	kvArmsOut: false,
	epidOut: false,
	beamOn: false,
	lasersOn: false
};
const pose = (p: Partial<LinacPose>): LinacPose => ({ ...HOME, ...p });
const deg = (r: number) => (r * 180) / Math.PI;

describe('Vault 1 LINAC pose: angles', () => {
	it('turns the gantry clockwise seen from the couch foot (rotation.z = -angle, as the app)', () => {
		expect(deg(partPose(pose({ gantry: 90 })).gantry)).toBeCloseTo(-90);
		expect(deg(partPose(pose({ gantry: 180 })).gantry)).toBeCloseTo(180);
		// 270 is 90 the other way: the same turn as the app's -270
		expect(deg(partPose(pose({ gantry: 270 })).gantry)).toBeCloseTo(90);
	});

	it('turns the collimator and the couch counter-clockwise (rotation.y = +angle, as the app)', () => {
		expect(deg(partPose(pose({ collimator: 30 })).collimator)).toBeCloseTo(30);
		expect(deg(partPose(pose({ collimator: 330 })).collimator)).toBeCloseTo(-30);
		expect(deg(partPose(pose({ couchAngle: 90 })).couchAngle)).toBeCloseTo(90);
		expect(deg(partPose(pose({ couchAngle: 270 })).couchAngle)).toBeCloseTo(-90);
	});
});

describe('Vault 1 LINAC pose: couch translations in cm, shown at true scale', () => {
	it('raises the couch 0.01 m per cm of vrt, from the app home height', () => {
		expect(partPose(HOME).couchY).toBeCloseTo(APP.couchHome.y);
		expect(partPose(pose({ couchVrt: 10 })).couchY).toBeCloseTo(APP.couchHome.y + 0.1);
		expect(partPose(pose({ couchVrt: -5 })).couchY).toBeCloseTo(APP.couchHome.y - 0.05);
	});

	it('moves +lat to -x and +lng toward the gantry (-z), as the app pendant does', () => {
		expect(partPose(pose({ couchLat: 10 })).couchX).toBeCloseTo(-0.1);
		expect(partPose(pose({ couchLat: -4 })).couchX).toBeCloseTo(0.04);
		expect(partPose(pose({ couchLng: 20 })).couchTopZ).toBeCloseTo(APP.couchTopHomeZ - 0.2);
		expect(partPose(pose({ couchLng: -30 })).couchTopZ).toBeCloseTo(APP.couchTopHomeZ + 0.3);
	});

	it('scales the bellows to fill the gap from the base plate to the housing (0.54 m at home, as the app)', () => {
		const home = partPose(HOME),
			low = partPose(pose({ couchVrt: -40 }));
		expect(home.bellowsScale).toBeCloseTo(0.54);
		expect(home.bellowsY).toBeCloseTo(-0.505);
		expect(low.bellowsScale).toBeCloseTo(0.14);
		// the bottom stays on the base plate as the couch goes down
		const bottom = (t: typeof home) => t.couchY + t.bellowsY - t.bellowsScale / 2;
		expect(bottom(low)).toBeCloseTo(APP.bellowsBottom);
		expect(bottom(home)).toBeCloseTo(APP.bellowsBottom);
	});

	it('never puts the couch below its lowest height', () => {
		expect(partPose(pose({ couchVrt: -200 })).couchY).toBe(APP.couchLowest);
	});
});

describe('Vault 1 LINAC pose: jaws, imagers, beam and lasers', () => {
	it('places each jaw edge from 0.03 m (0 cm) to 0.25 m (12.5 cm) off the beam axis', () => {
		expect(jawOffset(0)).toBeCloseTo(0.03);
		expect(jawOffset(12.5)).toBeCloseTo(0.25);
		expect(jawOffset(5)).toBeCloseTo(0.118);
		const p = partPose(pose({ jawX1: 2, jawX2: 8, jawY1: 0, jawY2: 12.5 }));
		expect(p.jawX1).toBeCloseTo(-jawOffset(2));
		expect(p.jawX2).toBeCloseTo(jawOffset(8));
		expect(p.jawY1).toBeCloseTo(APP.jawPlane - 0.03 - APP.jawThickness);
		expect(p.jawY2).toBeCloseTo(APP.jawPlane + 0.25 + APP.jawThickness);
	});

	it('extends the EPID under the patient or parks it, and shows kV arms, beam and lasers as told', () => {
		const out = partPose(pose({ epidOut: true, kvArmsOut: true, beamOn: true, lasersOn: true }));
		expect(out.epid).toEqual(APP.epidOut);
		expect([out.kvArms, out.beam, out.lasers]).toEqual([true, true, true]);
		const home = partPose(HOME);
		expect(home.epid).toEqual(APP.epidHome);
		expect([home.kvArms, home.beam, home.lasers]).toEqual([false, false, false]);
	});
});

describe('Vault 1 LINAC pose: checks on a console pose', () => {
	it('holds the couch and jaws inside the safe range', () => {
		const p = clampPose(
			pose({ couchVrt: 90, couchLng: -400, couchLat: 60, jawX1: -3, jawY2: 30 }),
			HOME
		);
		expect(p.couchVrt).toBe(LIMITS.couchVrt[1]);
		expect(p.couchLng).toBe(LIMITS.couchLng[0]);
		expect(p.couchLat).toBe(LIMITS.couchLat[1]);
		expect(p.jawX1).toBe(0);
		expect(p.jawY2).toBe(12.5);
	});

	it('wraps angles to 0..360 and keeps the couch within 95 degrees either way', () => {
		const p = clampPose(pose({ gantry: -90, collimator: 725, couchAngle: 120 }), HOME);
		expect(p.gantry).toBeCloseTo(270);
		expect(p.collimator).toBeCloseTo(5);
		expect(p.couchAngle).toBeCloseTo(95);
		expect(clampPose(pose({ couchAngle: 200 }), HOME).couchAngle).toBeCloseTo(265);
		expect(clampPose(pose({ couchAngle: 300 }), HOME).couchAngle).toBeCloseTo(300);
	});

	it('keeps the previous value for a number that is missing or not finite', () => {
		const prev = pose({ gantry: 45, couchVrt: 3 });
		const bad = { ...HOME, gantry: NaN, couchVrt: undefined } as unknown as LinacPose;
		const p = clampPose(bad, prev);
		expect(p.gantry).toBe(45);
		expect(p.couchVrt).toBe(3);
		expect(clampPose({ ...HOME, beamOn: 1 } as unknown as LinacPose, HOME).beamOn).toBe(true);
	});
});

describe('Vault 1 LINAC pose: parked couch', () => {
	it('lowers and pulls back the couch by the fit, with the gantry at 0 and the lasers on', () => {
		const p = parkedPose({ drop: 0.4375, retract: 1.16 });
		expect(p.couchVrt).toBeCloseTo(-43.75);
		expect(p.couchLng).toBeCloseTo(-116);
		expect([p.gantry, p.couchAngle, p.couchLat]).toEqual([0, 0, 0]);
		expect(p.lasersOn).toBe(true);
		const t = partPose(p);
		expect(t.couchY).toBeCloseTo(APP.couchHome.y - 0.4375);
		expect(t.couchTopZ).toBeCloseTo(APP.couchTopHomeZ + 1.16);
		// inside the safe range, so a console pose can bring it back
		expect(clampPose(p, HOME)).toEqual(p);
	});
});

describe('Vault 1 LINAC pose: smoothing', () => {
	it('closes part of the gap each frame and arrives', () => {
		let cur = HOME;
		const target = pose({ gantry: 40, jawX1: 8 });
		cur = smoothPose(cur, target, 1 / 60);
		expect(cur.gantry).toBeGreaterThan(0);
		expect(cur.gantry).toBeLessThan(40);
		for (let i = 0; i < 60; i++) cur = smoothPose(cur, target, 1 / 60);
		expect(cur.gantry).toBe(40);
		expect(cur.jawX1).toBe(8);
	});

	it('turns the short way round through 0', () => {
		let cur = pose({ gantry: 350 });
		const seen: number[] = [];
		for (let i = 0; i < 30; i++) {
			cur = smoothPose(cur, pose({ gantry: 10 }), 1 / 60);
			seen.push(cur.gantry);
		}
		expect(seen.every((g) => g >= 350 || g <= 10)).toBe(true);
		expect(cur.gantry).toBeCloseTo(10, 1);
	});

	it('moves the couch no faster than its top speed, and takes the flags at once', () => {
		const target = pose({ couchLng: 100, beamOn: true });
		const next = smoothPose(HOME, target, 0.1);
		expect(next.couchLng).toBeCloseTo(SMOOTHING.couchSpeed * 0.1);
		expect(next.beamOn).toBe(true);
	});
});
