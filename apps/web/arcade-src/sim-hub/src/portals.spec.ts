import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { Room } from './rooms';
import { OUTSIDE, buildPortals, computeVisible, roomAt } from './portals';

function room(p: Partial<Room> & Pick<Room, 'id' | 'x' | 'z' | 'w' | 'd'>): Room {
	return {
		wing: 'patient',
		zone: 'front',
		name: p.id,
		kicker: '',
		color: 0,
		cam: [0, 0, 0],
		look: [0, 0, 0],
		desc: '',
		what: '',
		...p
	};
}

// A and B face each other across a hallway (z 5..11); C is a vault whose door opens onto x = 64.
const A = room({ id: 'A', x: 0, z: 0, w: 10, d: 10, doorSide: 'zmax' });
const B = room({ id: 'B', x: 0, z: 16, w: 10, d: 10, doorSide: 'zmin' });
const W = room({ id: 'W', x: 30, z: 0, w: 10, d: 10, windowSide: 'xmin' });
const V = room({ id: 'V', x: 79, z: -18, w: 30, d: 26, doorSide: 'xmin', vault: true });
const L = room({ id: 'L', x: -40, z: 0, w: 24, d: 20, hub: true });
const ROOMS = [A, B, W, V, L];
const PORTALS = buildPortals(ROOMS);

function cam(x: number, z: number, lookX: number, lookZ: number) {
	const c = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 200);
	c.position.set(x, 1.6, z);
	c.lookAt(lookX, 1.6, lookZ);
	c.updateMatrixWorld(true);
	return c;
}

function vis(c: THREE.Camera) {
	return [...computeVisible(c, ROOMS, PORTALS, new Set<string>())].sort();
}

describe('roomAt', () => {
	it('uses centre-convention rects', () => {
		expect(roomAt(ROOMS, 4.9, -4.9)).toBe(A);
		expect(roomAt(ROOMS, 0, 8)).toBeNull();
	});
	it('includes the boundary', () => {
		expect(roomAt(ROOMS, 0, 5)).toBe(A);
	});
});

describe('buildPortals', () => {
	it('puts the door on the wall plane with the generic gap and height', () => {
		const [door] = PORTALS.get('A')!;
		expect(door.min.x).toBeCloseTo(-1.3);
		expect(door.max.x).toBeCloseTo(1.3);
		expect(door.min.z).toBeCloseTo(5 - 0.08);
		expect(door.max.y).toBeCloseTo(2.65);
	});
	it('makes vault doors 4.8 wide on the xmin wall', () => {
		const [door] = PORTALS.get('V')!;
		expect(door.min.z).toBeCloseTo(-18 - 2.4);
		expect(door.max.z).toBeCloseTo(-18 + 2.4);
		expect((door.min.x + door.max.x) / 2).toBeCloseTo(64);
	});
	it('makes windows 4.5 wide from 1.0 to 2.82 m', () => {
		const [win] = PORTALS.get('W')!;
		expect(win.max.z - win.min.z).toBeCloseTo(4.5);
		expect(win.min.y).toBeCloseTo(1.0);
		expect(win.max.y).toBeCloseTo(2.82);
	});
	it('gives the hub lobby one portal per wall gap', () => {
		const ps = PORTALS.get('L')!;
		expect(ps).toHaveLength(4);
		const widths = ps.map((b) => Math.max(b.max.x - b.min.x, b.max.z - b.min.z)).sort();
		expect(widths.map((w) => +w.toFixed(2))).toEqual([5.2, 7.0, 7.2, 8.0]);
	});
	it('gives rooms with no door or window an empty list', () => {
		expect(buildPortals([room({ id: 'X', x: 0, z: 0, w: 4, d: 4 })]).get('X')).toEqual([]);
	});
});

describe('computeVisible', () => {
	it('inside facing a wall shows only that room', () => {
		expect(vis(cam(0, 0, 0, -20))).toEqual(['A']);
	});
	it('inside facing its door shows the room, the outside cell and the room across the hall', () => {
		expect(vis(cam(0, 0, 0, 20))).toEqual(['A', 'B', OUTSIDE]);
	});
	it('in the hallway shows rooms whose portals are in view', () => {
		expect(vis(cam(0, 8, 0, 20))).toEqual(['B', OUTSIDE]);
		expect(vis(cam(0, 8, 0, -20))).toEqual(['A', OUTSIDE]);
		expect(vis(cam(0, 8, 60, 8))).toEqual(['V', 'W', OUTSIDE]);
	});
	it('a camera exactly on a room boundary is in that room and sees through its door', () => {
		const got = vis(cam(0, 5, 0, 20));
		expect(got).toContain('A');
		expect(got).toContain(OUTSIDE);
		expect(got).toContain('B');
	});
	it('reuses the caller set', () => {
		const out = new Set<string>(['stale']);
		expect(computeVisible(cam(0, 0, 0, -20), ROOMS, PORTALS, out)).toBe(out);
		expect(out.has('stale')).toBe(false);
	});
});
