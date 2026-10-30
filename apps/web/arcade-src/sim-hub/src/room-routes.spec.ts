import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ROOM_GRAPHS, inRoomPath, takeArrivalSpot, clearArrivalSpots } from './room-routes';

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe.each(Object.entries(ROOM_GRAPHS))('ROOM_GRAPHS.%s', (room, g) => {
	it('has only valid edge indices', () => {
		for (const [i, j] of g.edges) {
			expect(Number.isInteger(i) && i >= 0 && i < g.nodes.length).toBe(true);
			expect(Number.isInteger(j) && j >= 0 && j < g.nodes.length).toBe(true);
			expect(i).not.toBe(j);
		}
	});

	it('is connected', () => {
		const seen = new Set([0]),
			todo = [0];
		while (todo.length) {
			const k = todo.pop()!;
			for (const [i, j] of g.edges) {
				const o = i === k ? j : j === k ? i : -1;
				if (o >= 0 && !seen.has(o)) {
					seen.add(o);
					todo.push(o);
				}
			}
		}
		expect(seen.size).toBe(g.nodes.length);
	});

	it('gives a path between its two farthest nodes', () => {
		let a = 0,
			b = 0;
		g.nodes.forEach((p, i) =>
			g.nodes.forEach((q, j) => {
				if (dist(p, q) > dist(g.nodes[a], g.nodes[b])) [a, b] = [i, j];
			})
		);
		const [pa, pb] = [g.nodes[a], g.nodes[b]],
			L = dist(pa, pb);
		// ends 0.3 m beyond each node, away from the other: the nodes themselves are then kept
		const from = { x: pa[0] + ((pa[0] - pb[0]) / L) * 0.3, z: pa[1] + ((pa[1] - pb[1]) / L) * 0.3 },
			to = { x: pb[0] + ((pb[0] - pa[0]) / L) * 0.3, z: pb[1] + ((pb[1] - pa[1]) / L) * 0.3 },
			path = inRoomPath(room, from, to);
		expect(path.length).toBeGreaterThanOrEqual(2);
		expect(path[0]).toEqual(pa);
		expect(path.at(-1)).toEqual(pb);
		expect(new Set(path).size).toBe(path.length);
	});
});

describe('clearArrivalSpots', () => {
	it('frees every spot but those of the actors `keep` names', () => {
		clearArrivalSpots();
		const root = new THREE.Group(),
			[a, b, c] = [new THREE.Object3D(), new THREE.Object3D(), new THREE.Object3D()];
		root.add(a, b, c);
		const first = takeArrivalSpot('consult', a),
			second = takeArrivalSpot('consult', b);
		expect(first).not.toBe(second);
		// a is still walking to its spot (a live hand-over); b's spot is free again
		clearArrivalSpots((actor) => actor === a);
		expect(takeArrivalSpot('consult', c)).toBe(second);
		clearArrivalSpots();
		expect(takeArrivalSpot('consult', c)).toBe(first);
		clearArrivalSpots();
	});
});
