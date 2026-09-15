/* RTApps (#77 sim-hub modularization, task 5): prop/furniture builders — waiting-room and
   clinical furniture, signage, safety equipment, wall displays, and equipment shells (chairs,
   desks, exam tables, monitors, dispensers, the CT/LINAC-shell objects, etc). Verbatim
   extractions from main.js. A handful still reach back into main.js for symbols owned by
   modules not yet extracted: `add`/`MAT` (shared scene-building helpers), `registerInteractable`
   (the walk-mode interaction registry), and `openKioskDialog` (the wayfinding UI) — main.js
   exports them rather than duplicating that state here. `personFigure` moved to ./npc.js in
   task 6 and is imported from there instead. `CT_COUCH`/`ROOM_CLOCKS` (mutable state read/
   written by the still-resident furnishing calls here and by the clock/CT-couch update loops)
   moved to ./equipment.js in task 7 and are imported from there instead. */
import * as THREE from 'three';
import { box, cyl, eRbox, std, makeCanvasPanel } from './helpers.js';
import { scene } from './scene.js';
import { personFigure } from './npc.js';
import { add, MAT, registerInteractable, openKioskDialog } from './main.js';
import { CT_COUCH, ROOM_CLOCKS } from './equipment.js';

export function lampPost(x, z, h = 4.4) {
	const g = new THREE.Group();
	const pole = cyl(0.06, 0.08, h, std(0x3d464d, 0.72, 0.12), 12);
	pole.position.y = h / 2;
	g.add(pole);
	const arm = box(0.55, 0.06, 0.06, std(0x3d464d, 0.72, 0.12), 0.24, h - 0.35, 0);
	g.add(arm);
	const glow = box(
		0.42,
		0.16,
		0.28,
		std(0xf7f1da, 0.22, 0, { emissive: 0xffefba, emissiveIntensity: 1.2 }),
		0.42,
		h - 0.45,
		0
	);
	g.add(glow);
	g.position.set(x, 0, z);
	scene.add(g);
	return g;
}

export function wheelchairObject(scale = 1, occupied = false) {
	const g = new THREE.Group();
	const s = scale;
	const frameMat = std(0x8f9da7, 0.46, 0.42),
		seatMat = std(0x2f4758, 0.84, 0.02),
		tireMat = std(0x1e252a, 0.9, 0.08);
	const seat = box(0.48 * s, 0.08, 0.44 * s, seatMat, 0, 0.64 * s, 0);
	g.add(seat);
	const back = box(0.48 * s, 0.46, 0.08 * s, seatMat, 0, 0.88 * s, -0.18 * s);
	g.add(back);
	const arm1 = box(0.05 * s, 0.18, 0.34 * s, frameMat, -0.27 * s, 0.76 * s, -0.01 * s),
		arm2 = arm1.clone();
	arm2.position.x = 0.27 * s;
	g.add(arm1);
	g.add(arm2);
	const wheel1 = cyl(0.31 * s, 0.31 * s, 0.05 * s, tireMat, 24);
	wheel1.rotation.z = Math.PI / 2;
	wheel1.position.set(-0.34 * s, 0.48 * s, 0);
	g.add(wheel1);
	const wheel2 = wheel1.clone();
	wheel2.position.x = 0.34 * s;
	g.add(wheel2);
	const caster1 = cyl(0.08 * s, 0.08 * s, 0.04 * s, tireMat, 12);
	caster1.rotation.z = Math.PI / 2;
	caster1.position.set(-0.16 * s, 0.12 * s, 0.24 * s);
	g.add(caster1);
	const caster2 = caster1.clone();
	caster2.position.x = 0.16 * s;
	g.add(caster2);
	const foot = box(0.28 * s, 0.03, 0.09 * s, frameMat, 0, 0.18 * s, 0.28 * s);
	g.add(foot);
	if (occupied) {
		const patient = personFigure(0x8b8ec4, 0x606a76, 0xe6c3a0);
		patient.scale.set(0.82 * s, 0.82 * s, 0.82 * s);
		patient.position.set(0, -0.02 * s, -0.02 * s);
		g.add(patient);
	}
	return g;
}

export function ivPoleObject(scale = 1) {
	const g = new THREE.Group();
	const s = scale,
		mat = std(0xb8c4ca, 0.35, 0.5);
	const pole = cyl(0.03 * s, 0.03 * s, 1.55 * s, mat, 12);
	pole.position.y = 0.9 * s;
	g.add(pole);
	const base = box(0.46 * s, 0.03, 0.46 * s, mat, 0, 0.03 * s, 0);
	g.add(base);
	for (const p of [
		[0.18, 0],
		[-0.18, 0],
		[0, 0.18],
		[0, -0.18]
	]) {
		const w = cyl(0.04 * s, 0.04 * s, 0.03 * s, std(0x2a3036, 0.84, 0.1), 10);
		w.position.set(p[0] * s, 0.05 * s, p[1] * s);
		g.add(w);
	}
	const arm = box(0.36 * s, 0.03, 0.03 * s, mat, 0.16 * s, 1.64 * s, 0);
	g.add(arm);
	const bag = box(
		0.12 * s,
		0.24,
		0.06 * s,
		std(0xdbe9f2, 0.25, 0.0, { transparent: true, opacity: 0.7 }),
		0.33 * s,
		1.42 * s,
		0
	);
	g.add(bag);
	return g;
}

export function medCartObject(scale = 1, color = 0x7da9c8) {
	const g = new THREE.Group();
	const s = scale;
	const body = box(0.56 * s, 0.78, 0.38 * s, std(color, 0.74, 0.04), 0, 0.46 * s, 0);
	g.add(body);
	for (let i = 0; i < 3; i++)
		g.add(
			box(0.48 * s, 0.03, 0.02 * s, std(0xe6edf1, 0.8, 0.02), 0, 0.2 * s + i * 0.2 * s, 0.2 * s)
		);
	const top = box(0.62 * s, 0.05, 0.44 * s, std(0xd6dde2, 0.84, 0.03), 0, 0.86 * s, 0);
	g.add(top);
	for (const p of [
		[0.22, 0.14],
		[-0.22, 0.14],
		[0.22, -0.14],
		[-0.22, -0.14]
	]) {
		const w = cyl(0.05 * s, 0.05 * s, 0.04 * s, std(0x22292f, 0.84, 0.12), 10);
		w.rotation.z = Math.PI / 2;
		w.position.set(p[0] * s, 0.06 * s, p[1] * s);
		g.add(w);
	}
	const handle = box(0.04 * s, 0.46, 0.04 * s, std(0xaab6bd, 0.4, 0.45), -0.33 * s, 1.02 * s, 0);
	g.add(handle);
	return g;
}

export function vehicleObject(kind = 'car', color = 0x5c89bf) {
	const g = new THREE.Group();
	const wheelMat = std(0x20262b, 0.85, 0.12);
	function addWheel(x, z, r = 0.22, w = 0.18) {
		const wh = cyl(r, r, w, wheelMat, 16);
		wh.rotation.z = Math.PI / 2;
		wh.position.set(x, 0.22, z);
		g.add(wh);
	}
	if (kind === 'ambulance') {
		g.add(box(2.8, 0.24, 1.3, std(0x3d444a, 0.7, 0.08), 0, 0.14, 0));
		g.add(box(2.2, 0.8, 1.18, std(0xf6f7f8, 0.75, 0.02), 0, 0.66, 0));
		g.add(box(1.0, 0.18, 1.22, std(0xc73138, 0.72, 0.03), 0.45, 0.86, 0));
		g.add(
			box(
				0.44,
				0.42,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.45 }),
				1.08,
				0.76,
				0.56
			)
		);
		g.add(
			box(
				0.44,
				0.42,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.45 }),
				1.08,
				0.76,
				-0.56
			)
		);
		g.add(
			box(
				0.52,
				0.52,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.45 }),
				-0.98,
				0.68,
				0.56
			)
		);
		g.add(
			box(
				0.52,
				0.52,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.45 }),
				-0.98,
				0.68,
				-0.56
			)
		);
		g.add(
			box(
				0.3,
				0.12,
				0.12,
				std(0x4ea6ff, 0.2, 0.0, { emissive: 0x4ea6ff, emissiveIntensity: 0.45 }),
				0.15,
				1.1,
				0.22
			)
		);
		g.add(
			box(
				0.3,
				0.12,
				0.12,
				std(0xff6565, 0.2, 0.0, { emissive: 0xff6565, emissiveIntensity: 0.45 }),
				-0.15,
				1.1,
				-0.22
			)
		);
	} else if (kind === 'van') {
		g.add(box(2.6, 0.22, 1.24, std(0x3d444a, 0.7, 0.08), 0, 0.14, 0));
		g.add(box(2.22, 0.84, 1.12, std(color, 0.7, 0.04), 0, 0.64, 0));
		g.add(
			box(
				1.0,
				0.5,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.42 }),
				0.7,
				0.78,
				0.56
			)
		);
		g.add(
			box(
				1.0,
				0.5,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.42 }),
				0.7,
				0.78,
				-0.56
			)
		);
		g.add(
			box(
				0.58,
				0.4,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.42 }),
				-1.0,
				0.72,
				0.56
			)
		);
		g.add(
			box(
				0.58,
				0.4,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.42 }),
				-1.0,
				0.72,
				-0.56
			)
		);
	} else {
		g.add(box(2.3, 0.2, 1.08, std(0x3d444a, 0.72, 0.08), 0, 0.13, 0));
		g.add(box(1.95, 0.48, 1.0, std(color, 0.74, 0.04), 0, 0.45, 0));
		g.add(box(0.9, 0.32, 0.92, std(color, 0.76, 0.04), -0.15, 0.77, 0));
		g.add(
			box(
				0.72,
				0.28,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.42 }),
				0.18,
				0.72,
				0.48
			)
		);
		g.add(
			box(
				0.72,
				0.28,
				0.04,
				std(0x7ac3e2, 0.18, 0.03, { transparent: true, opacity: 0.42 }),
				0.18,
				0.72,
				-0.48
			)
		);
	}
	addWheel(0.75, 0.45);
	addWheel(0.75, -0.45);
	addWheel(-0.75, 0.45);
	addWheel(-0.75, -0.45);
	return g;
}

export function plant(g, x, z, scale = 1) {
	const pot = cyl(0.27 * scale, 0.34 * scale, 0.52 * scale, std(0x8b735d, 0.88, 0.02), 18);
	pot.position.set(x, 0.27 * scale, z);
	add(g, pot);
	const stem = cyl(0.045 * scale, 0.055 * scale, 0.82 * scale, std(0x3f7655, 0.82, 0.01), 10);
	stem.position.set(x, 0.9 * scale, z);
	add(g, stem);
	for (let i = 0; i < 6; i++) {
		const leaf = new THREE.Mesh(
			new THREE.SphereGeometry(0.25 * scale, 12, 8),
			std(i % 2 ? 0x4c8d66 : 0x579e70, 0.88, 0.0)
		);
		const a = (i * Math.PI) / 3;
		leaf.scale.set(1.0, 0.32, 0.46);
		leaf.position.set(
			x + Math.cos(a) * 0.22 * scale,
			0.88 * scale + i * 0.07 * scale,
			z + Math.sin(a) * 0.22 * scale
		);
		leaf.rotation.y = -a;
		add(g, leaf);
	}
}

export function wallArt(g, x, y, z, rot = 0, w = 1.4, h = 0.78, color = 0x3c8093) {
	const frame = box(w + 0.09, h + 0.09, 0.05, std(0x35464f, 0.62, 0.18), x, y, z);
	frame.rotation.y = rot;
	add(g, frame);
	const art = box(
		w,
		h,
		0.055,
		std(color, 0.72, 0.02, { emissive: color, emissiveIntensity: 0.08 }),
		x,
		y,
		z
	);
	art.rotation.y = rot;
	add(g, art);
}

export function benchSeat(g, x, z, rot = 0, len = 2.2, col = 0x7f8f98) {
	const seat = box(len, 0.12, 0.58, std(col, 0.78, 0.02), x, 0.54, z);
	seat.rotation.y = rot;
	add(g, seat);
	const back = box(len, 0.42, 0.08, std(col, 0.78, 0.02), x, 0.82, z - 0.24 * Math.cos(rot));
	back.rotation.y = rot;
	add(g, back);
	for (const ox of [-len * 0.36, len * 0.36]) {
		const leg = box(
			0.09,
			0.52,
			0.09,
			std(0x4b565d, 0.55, 0.28),
			x + Math.cos(rot) * ox,
			0.26,
			z - Math.sin(rot) * ox
		);
		leg.rotation.y = rot;
		add(g, leg);
	}
}

export function brochureRack(g, x, z, rot = 0) {
	const side = box(0.08, 1.05, 0.42, std(0x6d7b82, 0.5, 0.32), x, 0.53, z);
	side.rotation.y = rot;
	add(g, side);
	for (let i = 0; i < 4; i++) {
		const tray = box(
			0.42,
			0.08,
			0.18,
			std(i % 2 ? 0x6bb2d6 : 0xd69b6b, 0.85, 0.02),
			x + Math.sin(rot) * 0.08,
			0.28 + i * 0.2,
			z + Math.cos(rot) * 0.08
		);
		tray.rotation.y = rot;
		add(g, tray);
	}
}

export function monumentSign(x, z) {
	const g = new THREE.Group();
	scene.add(g);
	const base = box(5.8, 0.24, 1.25, std(0x959288, 0.82, 0.08), x, 0.12, z);
	g.add(base);
	const planter = box(6.4, 0.16, 1.85, std(0x7f8a73, 0.95, 0.02), x, 0.08, z);
	g.add(planter);
	const slab = box(5.2, 2.05, 0.36, std(0xe9eeee, 0.94, 0.01), x, 1.1, z);
	g.add(slab);
	const c = document.createElement('canvas');
	c.width = 1400;
	c.height = 500;
	const q = c.getContext('2d');
	q.fillStyle = '#edf4f5';
	q.fillRect(0, 0, 1400, 500);
	q.fillStyle = '#1b6f88';
	q.fillRect(0, 0, 1400, 38);
	q.fillStyle = '#16343f';
	q.font = '900 96px Arial';
	q.fillText('RTApps', 78, 180);
	q.fillStyle = '#4f6872';
	q.font = '700 54px Arial';
	q.fillText('Radiation Oncology Center', 82, 272);
	q.fillStyle = '#2a8f89';
	q.font = '700 38px Arial';
	q.fillText('Education · Simulation · Clinical Orientation', 82, 350);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const face = new THREE.Mesh(
		new THREE.PlaneGeometry(4.8, 1.72),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	face.position.set(x, 1.18, z + 0.19);
	g.add(face);
	for (const ox of [-2.6, -1.8, 1.8, 2.6]) {
		plant(g, x + ox, z - 0.15, 0.55);
	}
}

export function tree(x, z, s = 1) {
	const g = new THREE.Group();
	const trunk = cyl(0.18 * s, 0.24 * s, 2.5 * s, std(0x68513e, 0.9, 0.02), 12);
	trunk.position.y = 1.25 * s;
	g.add(trunk);
	for (let i = 0; i < 3; i++) {
		const crown = new THREE.Mesh(
			new THREE.SphereGeometry((1.05 - 0.12 * i) * s, 16, 12),
			std(i === 1 ? 0x4e8056 : 0x5a8f61, 0.92, 0)
		);
		crown.scale.y = 0.75;
		crown.position.set((i - 1) * 0.48 * s, 2.75 * s + i * 0.28 * s, (i % 2 ? 0.25 : -0.15) * s);
		g.add(crown);
	}
	g.position.set(x, 0, z);
	scene.add(g);
}

export function desk(g, x, z, w = 2.2, d = 0.75, rot = 0) {
	const top = box(w, 0.08, d, MAT.wood, x, 0.84, z);
	top.rotation.y = rot;
	add(g, top);
	const base = box(w * 0.72, 0.76, d * 0.65, MAT.trim, x, 0.42, z);
	base.rotation.y = rot;
	add(g, base);
}

export function monitor(g, x, y, z, rot = 0, w = 0.8, h = 0.48) {
	const m = box(w, h, 0.055, MAT.screen, x, y, z);
	m.rotation.y = rot;
	add(g, m);
	const st = box(0.08, 0.28, 0.08, MAT.black, x, y - h / 2 - 0.14, z);
	add(g, st);
}

export function chair(g, x, z, rot = 0) {
	const s = box(0.55, 0.12, 0.55, MAT.uphol, x, 0.48, z);
	s.rotation.y = rot;
	add(g, s);
	const b = box(0.55, 0.65, 0.12, MAT.uphol, x, 0.82, z - 0.21);
	b.rotation.y = rot;
	add(g, b);
}

export function couch(g, x, z, rot = 0) {
	const s = box(1.7, 0.32, 0.72, MAT.uphol, x, 0.43, z);
	s.rotation.y = rot;
	add(g, s);
	const b = box(1.7, 0.72, 0.16, MAT.uphol, x, 0.87, z - 0.3);
	b.rotation.y = rot;
	add(g, b);
}

export function examTable(g, x, z, rot = 0) {
	const top = box(2.2, 0.13, 0.72, MAT.white, x, 0.88, z);
	top.rotation.y = rot;
	add(g, top);
	add(g, box(0.55, 0.77, 0.46, MAT.metal, x, 0.45, z));
}

export function workstationRow(g, x, z, n = 3, spacing = 1.7, rot = 0) {
	for (let i = 0; i < n; i++) {
		const xx = x + (rot ? 0 : (i - (n - 1) / 2) * spacing),
			zz = z + (rot ? (i - (n - 1) / 2) * spacing : 0);
		desk(g, xx, zz, 1.45, 0.7, rot);
		monitor(g, xx, 1.35, zz + (rot ? 0 : -0.22), rot, 0.65, 0.4);
	}
}

export function taskChair(g, x, z, rot = 0, color = 0x506d7a) {
	const base = cyl(0.15, 0.15, 0.05, std(0x313b42, 0.78, 0.12), 14);
	base.position.set(x, 0.12, z);
	g.add(base);
	const pole = box(0.06, 0.38, 0.06, std(0x8f9ca4, 0.38, 0.42), x, 0.31, z);
	add(g, pole);
	const seat = box(0.54, 0.1, 0.5, std(color, 0.82, 0.02), x, 0.6, z);
	seat.rotation.y = rot;
	add(g, seat);
	const back = box(0.5, 0.46, 0.1, std(color, 0.84, 0.02), x, 0.86, z - 0.18 * Math.cos(rot));
	back.rotation.y = rot;
	add(g, back);
}

export function cabinetBank(g, x, z, w = 2.0, h = 1.8, d = 0.48, rot = 0, color = 0xdfe5e8) {
	const body = box(w, h, d, std(color, 0.84, 0.02), x, h / 2, z);
	body.rotation.y = rot;
	add(g, body);
	for (let i = -1; i <= 1; i++) {
		const line = box(
			w * 0.9,
			0.02,
			0.015,
			std(0xb2bcc2, 0.7, 0.06),
			x,
			h * 0.22 + i * h * 0.22,
			z + (d / 2) * 0.98
		);
		line.rotation.y = rot;
		add(g, line);
	}
	const handleOff = (d / 2) * 0.98;
	for (let i = -1; i <= 1; i++) {
		const h1 = box(
			0.04,
			0.16,
			0.015,
			std(0x7d8b93, 0.45, 0.35),
			x - w * 0.24,
			h * 0.22 + i * h * 0.22,
			z + handleOff
		);
		h1.rotation.y = rot;
		add(g, h1);
		const h2 = box(
			0.04,
			0.16,
			0.015,
			std(0x7d8b93, 0.45, 0.35),
			x + w * 0.24,
			h * 0.22 + i * h * 0.22,
			z + handleOff
		);
		h2.rotation.y = rot;
		add(g, h2);
	}
}

export function stool(g, x, z, color = 0x5f7984) {
	const top = cyl(0.22, 0.22, 0.06, std(color, 0.82, 0.02), 18);
	top.position.set(x, 0.52, z);
	g.add(top);
	for (const [dx, dz] of [
		[0.09, 0.09],
		[-0.09, 0.09],
		[0.09, -0.09],
		[-0.09, -0.09]
	]) {
		const leg = box(0.04, 0.5, 0.04, std(0x7b8790, 0.4, 0.42), x + dx, 0.25, z + dz);
		add(g, leg);
	}
}

export function gurneyObject(g, x, z, rot = 0) {
	const top = box(2.1, 0.14, 0.78, MAT.white, x, 0.82, z);
	top.rotation.y = rot;
	add(g, top);
	const base = box(1.4, 0.52, 0.52, MAT.metal, x, 0.45, z);
	base.rotation.y = rot;
	add(g, base);
	for (const [dx, dz] of [
		[0.72, 0.24],
		[-0.72, 0.24],
		[0.72, -0.24],
		[-0.72, -0.24]
	]) {
		const w = cyl(0.06, 0.06, 0.04, std(0x22292f, 0.86, 0.12), 10);
		w.rotation.z = Math.PI / 2;
		w.position.set(
			x + dx * Math.cos(rot) - dz * Math.sin(rot),
			0.11,
			z + dx * Math.sin(rot) + dz * Math.cos(rot)
		);
		g.add(w);
	}
	const pillow = box(
		0.34,
		0.08,
		0.4,
		std(0xd5e0ea, 0.86, 0.02),
		x - 0.72 * Math.cos(rot),
		0.93,
		z - 0.72 * Math.sin(rot)
	);
	pillow.rotation.y = rot;
	add(g, pillow);
}

export function monitorWall(
	g,
	x,
	y,
	z,
	rot = 0,
	cols = 2,
	rows = 2,
	sw = 1.0,
	sh = 0.58,
	gap = 0.12
) {
	for (let r = 0; r < rows; r++)
		for (let c = 0; c < cols; c++) {
			const ox = (c - (cols - 1) / 2) * (sw + gap),
				oy = (rows - 1 - r) * (sh + gap) - ((rows - 1) * (sh + gap)) / 2;
			const sx = x + Math.cos(rot) * 0 + Math.sin(rot) * ox,
				sz = z + Math.cos(rot) * ox - Math.sin(rot) * 0;
			monitor(g, sx, y + oy, sz, rot, sw, sh);
		}
}

export function wallShelf(g, x, y, z, w = 1.4, rot = 0) {
	const sh = box(w, 0.04, 0.28, std(0xcfd7db, 0.84, 0.03), x, y, z);
	sh.rotation.y = rot;
	add(g, sh);
}

export function framedWallMonitor(
	g,
	x,
	y,
	z,
	rot = 0,
	w = 2.1,
	h = 1.18,
	title = 'PATIENT INFO',
	sub = '',
	lines = []
) {
	const frame = box(w + 0.18, h + 0.18, 0.1, std(0x222f36, 0.62, 0.26), x, y, z);
	frame.rotation.y = rot;
	add(g, frame);
	registerInteractable(frame, title, sub || 'Wall-mounted clinical information display.', 2.4);
	const bezel = box(w + 0.04, h + 0.04, 0.08, std(0x11181d, 0.52, 0.18), x, y, z + 0.001);
	bezel.rotation.y = rot;
	add(g, bezel);
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({ map: makeCanvasPanel(title, sub, lines), side: THREE.DoubleSide })
	);
	screen.position.set(x + Math.sin(rot) * 0.055, y, z + Math.cos(rot) * 0.055);
	screen.rotation.y = rot;
	g.add(screen);
	const arm = box(0.08, 0.22, 0.08, std(0x6c7a82, 0.4, 0.3), x, y - h / 2 - 0.18, z);
	arm.rotation.y = rot;
	add(g, arm);
}

export function interiorRoomSign(g, x, y, z, rot = 0, title = 'ROOM', sub = 'Radiation Oncology') {
	const sign = new THREE.Mesh(
		new THREE.PlaneGeometry(2.8, 0.62),
		new THREE.MeshBasicMaterial({ map: makeCanvasPanel(title, sub, []), side: THREE.DoubleSide })
	);
	sign.position.set(x, y, z);
	sign.rotation.y = rot;
	g.add(sign);
}

export function soapDispenser(g, x, y, z, rot = 0) {
	const body = box(0.2, 0.34, 0.1, std(0xe8f0f3, 0.78, 0.03), x, y, z);
	body.rotation.y = rot;
	add(g, body);
	const label = box(
		0.12,
		0.11,
		0.015,
		std(0x6fa9c4, 0.35, 0.02, { emissive: 0x2f6f89, emissiveIntensity: 0.18 }),
		x + Math.sin(rot) * 0.058,
		y + 0.035,
		z + Math.cos(rot) * 0.058
	);
	label.rotation.y = rot;
	add(g, label);
	const pump = box(
		0.13,
		0.035,
		0.045,
		std(0x78878e, 0.42, 0.28),
		x + Math.sin(rot) * 0.08,
		y - 0.19,
		z + Math.cos(rot) * 0.08
	);
	pump.rotation.y = rot;
	add(g, pump);
}

export function sinkStation(g, x, z, rot = 0) {
	const body = box(1.18, 0.94, 0.66, std(0xe7ecef, 0.86, 0.03), x, 0.47, z);
	body.rotation.y = rot;
	add(g, body);
	const basin = box(0.98, 0.09, 0.52, std(0xc9d4da, 0.55, 0.08), x, 0.97, z);
	basin.rotation.y = rot;
	add(g, basin);
	const bowl = box(0.58, 0.055, 0.29, std(0xb5c4cb, 0.34, 0.08), x, 0.935, z);
	bowl.rotation.y = rot;
	add(g, bowl);
	const bx = x - 0.36 * Math.sin(rot),
		bz = z - 0.36 * Math.cos(rot);
	const splash = box(1.52, 0.78, 0.07, std(0xd9e1e5, 0.88, 0.03), bx, 1.18, bz);
	splash.rotation.y = rot;
	add(g, splash);
	const rail = box(1.58, 0.055, 0.055, std(0x6d8e99, 0.5, 0.18), bx, 1.62, bz);
	rail.rotation.y = rot;
	add(g, rail);
	const faucet = box(0.08, 0.24, 0.08, std(0x7f929c, 0.35, 0.4), x, 1.16, z + 0.03);
	faucet.rotation.y = rot;
	add(g, faucet);
	const spout = box(
		0.24,
		0.05,
		0.05,
		std(0x7f929c, 0.35, 0.4),
		x + 0.11 * Math.sin(rot),
		1.1,
		z + 0.11 * Math.cos(rot)
	);
	spout.rotation.y = rot;
	add(g, spout);
	const lx = x - 0.76 * Math.cos(rot) - 0.38 * Math.sin(rot),
		lz = z + 0.76 * Math.sin(rot) - 0.38 * Math.cos(rot),
		rx = x + 0.76 * Math.cos(rot) - 0.38 * Math.sin(rot),
		rz = z - 0.76 * Math.sin(rot) - 0.38 * Math.cos(rot);
	soapDispenser(g, lx, 1.42, lz, rot);
	sanitizerDispenser(g, rx, 1.42, rz, rot);
	const c = document.createElement('canvas');
	c.width = 720;
	c.height = 210;
	const q = c.getContext('2d');
	q.fillStyle = '#eef5f6';
	q.fillRect(0, 0, 720, 210);
	q.fillStyle = '#2f7c86';
	q.fillRect(0, 0, 720, 24);
	q.fillStyle = '#17343d';
	q.font = '900 46px Arial';
	q.fillText('HAND HYGIENE', 28, 91);
	q.fillStyle = '#5b737c';
	q.font = '700 27px Arial';
	q.fillText('Soap · Water · Hand Sanitizer', 28, 145);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const sign = new THREE.Mesh(
		new THREE.PlaneGeometry(1.58, 0.46),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	sign.position.set(bx + Math.sin(rot) * 0.048, 1.91, bz + Math.cos(rot) * 0.048);
	sign.rotation.y = rot;
	g.add(sign);
	registerInteractable(
		sign,
		'Hand Hygiene Station',
		'Clinical sink with soap and alcohol-based hand sanitizer positioned together for hand hygiene before and after patient contact.',
		2.8
	);
}

export function immobilizationStorage(g, x, z, rot = 0, label = 'IMMOBILIZATION') {
	const frame = box(1.7, 2.0, 0.5, std(0xcfd8dd, 0.82, 0.04), x, 1.0, z);
	frame.rotation.y = rot;
	add(g, frame);
	for (const yy of [0.45, 0.95, 1.45]) {
		const shelf = box(1.56, 0.05, 0.42, std(0xafbbc2, 0.7, 0.06), x, yy, z);
		shelf.rotation.y = rot;
		add(g, shelf);
	}
	const items = [
		[-0.48, 0.45, 0x7fc7d4, 0.26, 0.12, 0.18],
		[-0.02, 0.45, 0xbe89d8, 0.28, 0.12, 0.18],
		[0.44, 0.45, 0xe7b770, 0.24, 0.12, 0.18],
		[-0.44, 0.95, 0x86c197, 0.42, 0.08, 0.22],
		[0.1, 0.95, 0x66a7d9, 0.34, 0.09, 0.22],
		[-0.3, 1.45, 0xedbfd2, 0.32, 0.14, 0.16],
		[0.32, 1.45, 0x9bb1d9, 0.38, 0.08, 0.2]
	];
	items.forEach(([ox, oy, col, w, h, d]) => {
		const item = box(
			w,
			h,
			d,
			std(col, 0.82, 0.02),
			x + Math.cos(rot) * ox,
			oy,
			z - Math.sin(rot) * ox
		);
		item.rotation.y = rot;
		add(g, item);
	});
	interiorRoomSign(
		g,
		x,
		2.42,
		z + Math.cos(rot) * 0.28,
		rot,
		label,
		'Masks · Vac-Lok · Knee & foot support'
	);
}

export function wallClock(g, x, y, z, rot = 0) {
	const cg = new THREE.Group();
	cg.position.set(x, y, z);
	cg.rotation.y = rot;
	g.add(cg);
	const face = cyl(0.34, 0.34, 0.035, std(0xf7f7f3, 0.78, 0.02), 32);
	face.rotation.x = Math.PI / 2;
	cg.add(face);
	const rim = cyl(0.37, 0.37, 0.025, std(0x4a555b, 0.55, 0.22), 32);
	rim.rotation.x = Math.PI / 2;
	rim.position.z = -0.015;
	cg.add(rim);
	const hourPivot = new THREE.Group(),
		minutePivot = new THREE.Group(),
		secondPivot = new THREE.Group();
	hourPivot.position.z = 0.05;
	minutePivot.position.z = 0.055;
	secondPivot.position.z = 0.06;
	cg.add(hourPivot, minutePivot, secondPivot);
	const hh = box(0.032, 0.145, 0.018, std(0x263238, 0.45, 0.25), 0, 0.068, 0),
		mh = box(0.022, 0.215, 0.016, std(0x263238, 0.45, 0.25), 0, 0.103, 0),
		sh = box(0.012, 0.245, 0.012, std(0xc43d3d, 0.42, 0.18), 0, 0.118, 0);
	hourPivot.add(hh);
	minutePivot.add(mh);
	secondPivot.add(sh);
	const cc = document.createElement('canvas');
	cc.width = 600;
	cc.height = 150;
	const cx = cc.getContext('2d'),
		tx = new THREE.CanvasTexture(cc);
	tx.colorSpace = THREE.SRGBColorSpace;
	const digital = new THREE.Mesh(
		new THREE.PlaneGeometry(1.18, 0.3),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, transparent: true })
	);
	digital.position.set(0, -0.55, 0.06);
	cg.add(digital);
	ROOM_CLOCKS.push({
		hourPivot,
		minutePivot,
		secondPivot,
		ctx: cx,
		texture: tx,
		roomId: g.userData?.roomId || '',
		lastKey: ''
	});
}

export function sanitizerDispenser(g, x, y, z, rot = 0) {
	const body = box(0.18, 0.32, 0.09, std(0xe9eef0, 0.75, 0.03), x, y, z);
	body.rotation.y = rot;
	add(g, body);
	const win = box(
		0.09,
		0.1,
		0.015,
		std(0x7cb9cc, 0.25, 0.02, { transparent: true, opacity: 0.55 }),
		x + Math.sin(rot) * 0.051,
		y + 0.03,
		z + Math.cos(rot) * 0.051
	);
	win.rotation.y = rot;
	add(g, win);
	const pump = box(
		0.12,
		0.035,
		0.04,
		std(0x7f8e95, 0.42, 0.28),
		x + Math.sin(rot) * 0.08,
		y - 0.18,
		z + Math.cos(rot) * 0.08
	);
	pump.rotation.y = rot;
	add(g, pump);
}

export function emergencyStopPanel(g, x, y, z, rot = 0) {
	const plate = box(0.42, 0.62, 0.06, std(0xe9ecee, 0.82, 0.03), x, y, z);
	plate.rotation.y = rot;
	add(g, plate);
	registerInteractable(
		plate,
		'Emergency OFF',
		'Emergency stop control located in the treatment room for immediate machine shutdown when required.',
		2.2
	);
	const red = cyl(
		0.12,
		0.12,
		0.1,
		std(0xd73539, 0.34, 0.18, { emissive: 0x7c1216, emissiveIntensity: 0.35 }),
		20
	);
	red.rotation.z = Math.PI / 2;
	red.position.set(x + Math.sin(rot) * 0.07, y + 0.08, z + Math.cos(rot) * 0.07);
	add(g, red);
	const tag = new THREE.Mesh(
		new THREE.PlaneGeometry(0.35, 0.12),
		new THREE.MeshBasicMaterial({
			map: makeCanvasPanel('EMERGENCY OFF', '', []),
			side: THREE.DoubleSide
		})
	);
	tag.position.set(x + Math.sin(rot) * 0.075, y - 0.19, z + Math.cos(rot) * 0.075);
	tag.rotation.y = rot;
	g.add(tag);
}

export function couchSideControlPanel(g, x, y, z, rot = 0, label = 'COUCH CONTROLS') {
	const post = box(0.12, 0.78, 0.12, std(0x9aa6ad, 0.58, 0.2), x, y - 0.34, z);
	post.rotation.y = rot;
	add(g, post);
	const cabinet = box(0.34, 0.52, 0.16, std(0xe8ecef, 0.84, 0.03), x, y, z);
	cabinet.rotation.y = rot;
	add(g, cabinet);
	registerInteractable(
		cabinet,
		label,
		'Representative treatment-couch side control panel and local emergency stop.',
		2.2
	);
	const screen = box(
		0.22,
		0.12,
		0.018,
		std(0x16313f, 0.24, 0.06, { emissive: 0x1e6785, emissiveIntensity: 0.42 }),
		x + Math.sin(rot) * 0.083,
		y + 0.14,
		z + Math.cos(rot) * 0.083
	);
	screen.rotation.y = rot;
	add(g, screen);
	for (let i = -1; i <= 1; i++) {
		const bt = box(
			0.05,
			0.05,
			0.015,
			std(0x96aab3, 0.55, 0.22),
			x + Math.sin(rot) * 0.083 + i * 0.058 * Math.cos(rot),
			y - 0.01,
			z + Math.cos(rot) * 0.083 - i * 0.058 * Math.sin(rot)
		);
		bt.rotation.y = rot;
		add(g, bt);
	}
	const red = cyl(
		0.075,
		0.075,
		0.08,
		std(0xd73539, 0.34, 0.18, { emissive: 0x7c1216, emissiveIntensity: 0.35 }),
		18
	);
	red.rotation.z = Math.PI / 2;
	red.position.set(x + Math.sin(rot) * 0.085, y - 0.16, z + Math.cos(rot) * 0.085);
	add(g, red);
	const placard = new THREE.Mesh(
		new THREE.PlaneGeometry(0.26, 0.1),
		new THREE.MeshBasicMaterial({ map: makeCanvasPanel(label, '', []), side: THREE.DoubleSide })
	);
	placard.position.set(x + Math.sin(rot) * 0.086, y + 0.27, z + Math.cos(rot) * 0.086);
	placard.rotation.y = rot;
	g.add(placard);
}

export function wallSpeaker(g, x, y, z, rot = 0) {
	const s = box(0.34, 0.34, 0.08, std(0x727e84, 0.66, 0.16), x, y, z);
	s.rotation.y = rot;
	add(g, s);
	for (let i = -2; i <= 2; i++) {
		const sl = box(0.22, 0.018, 0.012, std(0x31383c, 0.5, 0.25), x, y + i * 0.045, z + 0.048);
		sl.rotation.y = rot;
		add(g, sl);
	}
}

export function warningPlaque(g, x, y, z, rot = 0, title = 'CAUTION', sub = 'RADIATION AREA') {
	const c = document.createElement('canvas');
	c.width = 700;
	c.height = 420;
	const q = c.getContext('2d');
	q.fillStyle = '#fff7bf';
	q.fillRect(0, 0, 700, 420);
	q.strokeStyle = '#332c0a';
	q.lineWidth = 14;
	q.strokeRect(12, 12, 676, 396);
	q.fillStyle = '#171500';
	q.textAlign = 'center';
	q.font = '900 82px Arial';
	q.fillText('☢', 350, 130);
	q.font = '900 54px Arial';
	q.fillText(title, 350, 220);
	q.font = '800 38px Arial';
	q.fillText(sub, 350, 292);
	q.font = '700 24px Arial';
	q.fillText('AUTHORIZED PERSONNEL ONLY', 350, 350);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(1.35, 0.82),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	m.position.set(x, y, z);
	m.rotation.y = rot;
	g.add(m);
}

export function aedWallBox(g, x, y, z, rot = 0, label = 'AED') {
	const body = box(
		0.52,
		0.78,
		0.14,
		std(0xd83e41, 0.52, 0.18, { emissive: 0x581316, emissiveIntensity: 0.22 }),
		x,
		y,
		z
	);
	body.rotation.y = rot;
	add(g, body);
	registerInteractable(
		body,
		'AED Cabinet',
		'Automated external defibrillator cabinet positioned along the clinical circulation path for emergency response.',
		2.2
	);
	const door = box(
		0.44,
		0.62,
		0.03,
		std(0xf6fafb, 0.7, 0.03),
		x + Math.sin(rot) * 0.06,
		y + 0.02,
		z + Math.cos(rot) * 0.06
	);
	door.rotation.y = rot;
	add(g, door);
	const icon = new THREE.Mesh(
		new THREE.PlaneGeometry(0.28, 0.16),
		new THREE.MeshBasicMaterial({
			map: makeCanvasPanel(label, 'Emergency response', []),
			side: THREE.DoubleSide
		})
	);
	icon.position.set(x + Math.sin(rot) * 0.079, y + 0.16, z + Math.cos(rot) * 0.079);
	icon.rotation.y = rot;
	g.add(icon);
	const handle = box(
		0.05,
		0.15,
		0.018,
		std(0x68747a, 0.42, 0.22),
		x + Math.sin(rot) * 0.081,
		y - 0.14,
		z + Math.cos(rot) * 0.081
	);
	handle.rotation.y = rot;
	add(g, handle);
}

export function cctvCamera(g, x, y, z, rot = 0, tilt = -0.38) {
	const arm = box(0.08, 0.08, 0.28, std(0x87939a, 0.45, 0.3), x, y, z);
	arm.rotation.y = rot;
	arm.rotation.x = tilt * 0.2;
	add(g, arm);
	registerInteractable(
		arm,
		'Treatment Room CCTV',
		'Camera used by radiation therapists to continuously observe the patient from the protected control area during beam delivery.',
		2.5
	);
	const head = new THREE.Group();
	const bx = x + Math.sin(rot) * 0.18,
		bz = z + Math.cos(rot) * 0.18;
	const body = eRbox(0.18, 0.14, 0.26, std(0xe4e8ea, 0.64, 0.08), 0.04);
	body.position.set(bx, y - 0.02, bz);
	body.rotation.y = rot;
	body.rotation.x = tilt;
	g.add(body);
	const lens = cyl(
		0.045,
		0.045,
		0.04,
		std(0x16242d, 0.24, 0.06, { emissive: 0x173746, emissiveIntensity: 0.35 }),
		18
	);
	lens.rotation.x = Math.PI / 2 + tilt;
	lens.rotation.y = rot;
	lens.position.set(bx + Math.sin(rot) * 0.105, y - 0.03, bz + Math.cos(rot) * 0.105);
	g.add(lens);
	const mount = box(0.06, 0.14, 0.06, std(0x6d7980, 0.35, 0.22), x, y - 0.04, z);
	mount.rotation.y = rot;
	add(g, mount);
}

export function gloveBoxRack(g, x, y, z, rot = 0) {
	for (let i = 0; i < 3; i++) {
		const b = box(
			0.32,
			0.16,
			0.13,
			std([0x8fc5d6, 0xa7d4a7, 0xd9b3d1][i], 0.8, 0.02),
			x,
			y + i * 0.19,
			z
		);
		b.rotation.y = rot;
		add(g, b);
	}
}

export function biohazardBox(g, x, z, rot = 0, label = 'BIOHAZARD') {
	const body = eRbox(0.72, 0.82, 0.54, std(0xc93b43, 0.72, 0.05), 0.06);
	body.position.set(x, 0.43, z);
	body.rotation.y = rot;
	g.add(body);
	const lid = eRbox(0.78, 0.1, 0.6, std(0x8f252b, 0.64, 0.08), 0.04);
	lid.position.set(x, 0.89, z);
	lid.rotation.y = rot;
	g.add(lid);
	const c = document.createElement('canvas');
	c.width = 720;
	c.height = 360;
	const q = c.getContext('2d');
	q.fillStyle = '#f6f1e9';
	q.fillRect(0, 0, 720, 360);
	q.fillStyle = '#b71f2a';
	q.font = '900 126px Arial';
	q.textAlign = 'center';
	q.fillText('☣', 360, 145);
	q.fillStyle = '#76141b';
	q.font = '900 54px Arial';
	q.fillText(label, 360, 240);
	q.fillStyle = '#7b3b3f';
	q.font = '700 27px Arial';
	q.fillText('CLINICAL WASTE', 360, 298);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const face = new THREE.Mesh(
		new THREE.PlaneGeometry(0.58, 0.3),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	face.position.set(x + Math.sin(rot) * 0.286, 0.54, z + Math.cos(rot) * 0.286);
	face.rotation.y = rot;
	g.add(face);
	registerInteractable(
		body,
		'Biohazard Waste Container',
		'Labeled clinical biohazard waste container positioned near the immobilization and treatment-support area.',
		2.5
	);
}

export function ctScanner(g, room) {
	const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.58, 18, 54), MAT.white);
	ring.rotation.y = Math.PI / 2;
	ring.position.set(room.x, 2.15, room.z + 1.5);
	ring.castShadow = true;
	add(g, ring);
	const bore = new THREE.Mesh(
		new THREE.TorusGeometry(1.5, 0.07, 14, 48),
		std(0x2b3944, 0.5, 0.1, { emissive: 0x16435a, emissiveIntensity: 0.65 })
	);
	bore.rotation.y = Math.PI / 2;
	bore.position.copy(ring.position);
	add(g, bore);
	const base = box(1.2, 1.0, 4.9, MAT.white, room.x, 1.0, room.z + 1.5);
	add(g, base);
	const table = box(5.8, 0.15, 0.72, MAT.white, room.x - 3.9, 0.95, room.z + 1.5);
	add(g, table);
	CT_COUCH.table = table;
	CT_COUCH.ring = ring;
	CT_COUCH.bore = bore;
	CT_COUCH.baseX = table.position.x;
	add(g, box(2.1, 0.78, 0.65, MAT.metal, room.x - 5.0, 0.5, room.z + 1.5));
}

export function emulatorLinacShell(g, room) {
	const shell = std(0xf7f8f8, 0.43, 0.06),
		soft = std(0xdfe2e2, 0.58, 0.04),
		trim = std(0x8a8278, 0.42, 0.35),
		trimDark = std(0x4d555a, 0.38, 0.5),
		base = std(0xbec4c6, 0.56, 0.25),
		glassDark = std(0x182c35, 0.18, 0.08, { emissive: 0x0c3344, emissiveIntensity: 0.48 }),
		beamGlow = std(0xe7f4fa, 0.16, 0.02, { emissive: 0x83d9ff, emissiveIntensity: 0.8 }),
		carbon = std(0x17191b, 0.35, 0.25),
		accent = std(0x5aa7e8, 0.34, 0.18, { emissive: 0x183f60, emissiveIntensity: 0.2 });
	const root = new THREE.Group();
	root.position.set(room.x + 1.2, 0, room.z);
	root.rotation.y = -Math.PI / 2;
	g.add(root);
	// floor pad / isocenter cue
	const pad = cyl(3.0, 3.0, 0.05, std(0x56616a, 0.82, 0.05), 56);
	pad.position.set(0, 0.055, 0);
	root.add(pad);
	const iso = cyl(1.05, 1.05, 0.018, std(0x77858d, 0.7, 0.04), 48);
	iso.position.set(0, 0.09, 0);
	root.add(iso);
	// fixed drivestand: same component language as the uploaded emulator shell
	const stand = new THREE.Group();
	stand.position.set(0, 0, -2.5);
	const sb = eRbox(1.7, 2.5, 1.0, shell, 0.16);
	sb.position.set(0, 1.3, 0);
	stand.add(sb);
	const pl = eRbox(1.85, 0.3, 1.15, base, 0.06);
	pl.position.set(0, 0.15, 0);
	stand.add(pl);
	const pan = eRbox(1.2, 1.7, 0.06, soft, 0.08);
	pan.position.set(0, 1.55, 0.52);
	stand.add(pan);
	const band = eRbox(1.25, 0.14, 0.05, trim, 0.03);
	band.position.set(0, 0.62, 0.53);
	stand.add(band);
	root.add(stand);
	// connecting rotation bearing
	const bearing = new THREE.Group();
	bearing.position.set(0, 1.5, -1.85);
	const col = cyl(0.55, 0.55, 0.34, trimDark, 48);
	col.rotation.x = Math.PI / 2;
	bearing.add(col);
	const f1 = cyl(0.62, 0.62, 0.06, trim, 48);
	f1.rotation.x = Math.PI / 2;
	f1.position.z = 0.17;
	bearing.add(f1);
	const f2 = f1.clone();
	f2.position.z = -0.17;
	bearing.add(f2);
	root.add(bearing);
	// rotating gantry shell at isocenter height (static in orientation center)
	const gan = new THREE.Group();
	gan.position.set(0, 1.5, 0);
	root.add(gan);
	const arm = eRbox(1.25, 2.4, 0.55, shell, 0.16);
	arm.position.set(0, 0.1, -1.4);
	gan.add(arm);
	const bezel = cyl(0.4, 0.4, 0.05, trim, 44);
	bezel.rotation.x = Math.PI / 2;
	bezel.position.set(0, 0.15, -1.11);
	gan.add(bezel);
	const rim = cyl(0.34, 0.34, 0.04, trimDark, 44);
	rim.rotation.x = Math.PI / 2;
	rim.position.set(0, 0.15, -1.14);
	gan.add(rim);
	const scr = cyl(0.3, 0.3, 0.03, glassDark, 44);
	scr.rotation.x = Math.PI / 2;
	scr.position.set(0, 0.15, -1.17);
	gan.add(scr);
	const acc = eRbox(0.6, 0.6, 1.5, shell, 0.14);
	acc.position.set(0, 1.02, -0.7);
	gan.add(acc);
	const knee = eRbox(0.72, 0.9, 0.62, shell, 0.16);
	knee.position.set(0, 0.62, -1.3);
	gan.add(knee);
	const nose = cyl(0.24, 0.24, 0.18, trim, 28);
	nose.rotation.x = Math.PI / 2;
	nose.position.set(0, 1.02, 0.12);
	gan.add(nose);
	// treatment head / collimator
	const head = new THREE.Group();
	head.position.set(0, 1.05, 0);
	const drum = cyl(0.4, 0.4, 0.6, shell, 40);
	drum.position.y = 0.02;
	head.add(drum);
	const cap = cyl(0.32, 0.4, 0.16, shell, 40);
	cap.position.y = 0.36;
	head.add(cap);
	const ca = cyl(0.36, 0.42, 0.14, trim, 40);
	ca.position.y = -0.34;
	head.add(ca);
	const cb = cyl(0.3, 0.36, 0.12, soft, 40);
	cb.position.y = -0.46;
	head.add(cb);
	const ap = cyl(0.16, 0.2, 0.05, trimDark, 32);
	ap.position.y = -0.52;
	head.add(ap);
	const lg = cyl(0.14, 0.14, 0.02, beamGlow, 24);
	lg.position.y = -0.55;
	head.add(lg);
	gan.add(head);
	// retracted imaging panel / yoke
	const yoke = eRbox(0.14, 0.14, 1.18, trimDark, 0.03);
	yoke.position.set(1.05, -0.35, -0.05);
	gan.add(yoke);
	const panel = eRbox(0.08, 1.18, 1.28, soft, 0.06);
	panel.position.set(1.62, -0.35, -0.05);
	gan.add(panel);
	const pface = eRbox(0.02, 1.02, 1.12, glassDark, 0.03);
	pface.position.set(1.67, -0.35, -0.05);
	gan.add(pface);
	const kv = eRbox(0.14, 0.14, 1.02, trimDark, 0.03);
	kv.position.set(-1.0, -0.45, -0.05);
	gan.add(kv);
	const kvh = cyl(0.28, 0.28, 0.52, soft, 28);
	kvh.rotation.z = Math.PI / 2;
	kvh.position.set(-1.55, -0.45, -0.05);
	gan.add(kvh);
	// couch shell patterned after emulator: white base, carbon top, pedestal/bellows
	const couch = new THREE.Group();
	couch.position.set(0, 0, 2.4);
	root.add(couch);
	const ped = eRbox(1.12, 0.72, 0.78, shell, 0.1);
	ped.position.set(0, 0.4, -1.65);
	couch.add(ped);
	for (let i = 0; i < 7; i++) {
		const b = eRbox(1.0, 0.05, 0.68, soft, 0.015);
		b.position.set(0, 0.72 + i * 0.055, -1.65);
		couch.add(b);
	}
	const top = eRbox(0.72, 0.12, 4.55, soft, 0.05);
	top.position.set(0, 0.96, -0.2);
	couch.add(top);
	const cf = eRbox(0.64, 0.055, 4.2, carbon, 0.025);
	cf.position.set(0, 1.05, -0.14);
	couch.add(cf);
	const noseTop = eRbox(0.58, 0.07, 0.78, carbon, 0.1);
	noseTop.position.set(0, 1.05, 2.02);
	couch.add(noseTop);
	couchSideControlPanel(couch, 0.78, 1.0, -0.22, Math.PI / 2, 'COUCH CONTROLS');
	couchSideControlPanel(couch, -0.78, 1.0, -0.22, -Math.PI / 2, 'COUCH CONTROLS');
	// subtle accent strip and room lasers
	const strip = eRbox(1.25, 0.08, 0.03, accent, 0.02);
	strip.position.set(0, 0.1, -1.1);
	gan.add(strip);
	const laserMat = new THREE.LineBasicMaterial({
		color: 0x43ef76,
		transparent: true,
		opacity: 0.62
	});
	const pts1 = [new THREE.Vector3(-3.4, 1.5, 0), new THREE.Vector3(3.4, 1.5, 0)],
		pts2 = [new THREE.Vector3(0, 0.12, -3.4), new THREE.Vector3(0, 3.35, -3.4)];
	const l1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), laserMat);
	root.add(l1);
	const l2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), laserMat);
	root.add(l2);
}

export function hdrSuite(g, room) {
	examTable(g, room.x - 1.3, room.z, 0);
	const after = box(0.85, 1.0, 0.85, MAT.white, room.x + 2.2, 0.65, room.z - 0.7);
	add(g, after);
	const stem = cyl(0.11, 0.11, 1.15, MAT.metal);
	stem.rotation.z = Math.PI / 2;
	stem.position.set(room.x + 1.55, 1.15, room.z - 0.7);
	add(g, stem);
	const glass = box(0.08, 2.4, room.d - 1.8, MAT.glass, room.x + 2.9, 1.35, room.z);
	add(g, glass);
	desk(g, room.x + 4.2, room.z - 1.4, 1.7, 0.7, Math.PI / 2);
	monitor(g, room.x + 3.95, 1.35, room.z - 1.4, Math.PI / 2, 0.65, 0.4);
}

export function customTextureWallMonitor(
	g,
	x,
	y,
	z,
	rot,
	w,
	h,
	texture,
	title,
	desc = 'Wall-mounted teaching display.'
) {
	const frame = box(w + 0.18, h + 0.18, 0.1, std(0x222f36, 0.62, 0.26), x, y, z);
	frame.rotation.y = rot;
	add(g, frame);
	registerInteractable(frame, title, desc, 2.8);
	const bezel = box(w + 0.04, h + 0.04, 0.08, std(0x11181d, 0.52, 0.18), x, y, z + 0.001);
	bezel.rotation.y = rot;
	add(g, bezel);
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
	);
	screen.position.set(x + Math.sin(rot) * 0.055, y, z + Math.cos(rot) * 0.055);
	screen.rotation.y = rot;
	g.add(screen);
	const arm = box(0.08, 0.18, 0.08, std(0x6c7a82, 0.4, 0.3), x, y - h / 2 - 0.16, z);
	arm.rotation.y = rot;
	add(g, arm);
}

export function consoleKeyboard(g, x, z, rot = 0) {
	const kb = box(0.72, 0.035, 0.24, std(0x262d31, 0.52, 0.18), x, 0.91, z);
	kb.rotation.y = rot;
	g.add(kb);
	for (let r = 0; r < 3; r++)
		for (let c = 0; c < 10; c++) {
			const k = box(
				0.045,
				0.012,
				0.035,
				std(0x727d82, 0.56, 0.08),
				x + (c - 4.5) * 0.055 * Math.cos(rot) - r * 0.045 * Math.sin(rot),
				0.935,
				z - (c - 4.5) * 0.055 * Math.sin(rot) - r * 0.045 * Math.cos(rot)
			);
			k.rotation.y = rot;
			g.add(k);
		}
	const mouse = eRbox(0.11, 0.045, 0.16, std(0x363f44, 0.45, 0.18), 0.03);
	mouse.position.set(x + 0.48 * Math.cos(rot), 0.94, z - 0.48 * Math.sin(rot));
	mouse.rotation.y = rot;
	g.add(mouse);
}

export function privacyChangingNook(roomId, x, z, rot = 0, label = 'PATIENT CHANGING', scale = 1) {
	const g = new THREE.Group();
	g.userData.roomId = roomId;
	scene.add(g);
	const s = Math.max(0.9, scale),
		panelMat = std(0xe8eef0, 0.82, 0.03),
		accent = std(0x4f8e98, 0.62, 0.04);
	const p1 = box(1.75 * s, 2.34, 0.08, panelMat, x, 1.17, z);
	p1.rotation.y = rot;
	g.add(p1);
	const cornerOff = 0.78 * s;
	const p2 = box(
		1.45 * s,
		2.34,
		0.08,
		panelMat,
		x + cornerOff * Math.cos(rot + Math.PI / 2),
		1.17,
		z - cornerOff * Math.sin(rot + Math.PI / 2)
	);
	p2.rotation.y = rot + Math.PI / 2;
	g.add(p2);
	const floor = box(
		1.7 * s,
		0.025,
		1.55 * s,
		std(0x6c8589, 0.7, 0.03),
		x - 0.42 * s * Math.sin(rot),
		0.075,
		z - 0.42 * s * Math.cos(rot)
	);
	floor.rotation.y = rot;
	g.add(floor);
	const header = box(1.95 * s, 0.12, 0.1, accent, x, 2.4, z);
	header.rotation.y = rot;
	g.add(header);
	const c = document.createElement('canvas');
	c.width = 1100;
	c.height = 420;
	const q = c.getContext('2d');
	q.fillStyle = '#f4f7f7';
	q.fillRect(0, 0, 1100, 420);
	q.fillStyle = '#286f79';
	q.fillRect(0, 0, 1100, 42);
	q.fillStyle = '#17343d';
	q.textAlign = 'center';
	q.font = '900 82px Arial';
	q.fillText(label, 550, 154);
	q.fillStyle = '#496b75';
	q.font = '800 43px Arial';
	q.fillText('PRIVATE CHANGING AREA', 550, 232);
	q.fillStyle = '#67808a';
	q.font = '700 34px Arial';
	q.fillText('Gown change before procedure / treatment', 550, 303);
	q.fillText('Please close privacy screen while occupied', 550, 354);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const sign = new THREE.Mesh(
		new THREE.PlaneGeometry(2.35 * s, 0.9),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	sign.position.set(x + Math.sin(rot) * 0.058, 1.88, z + Math.cos(rot) * 0.058);
	sign.rotation.y = rot;
	g.add(sign);
	const hook = box(
		0.08,
		0.18,
		0.07,
		std(0x747e83, 0.4, 0.35),
		x + 0.62 * s * Math.cos(rot),
		1.48,
		z - 0.62 * s * Math.sin(rot)
	);
	hook.rotation.y = rot;
	g.add(hook);
	const bench = box(
		1.18 * s,
		0.36,
		0.42,
		std(0x879aa2, 0.72, 0.04),
		x - 0.18 * s * Math.sin(rot),
		0.24,
		z - 0.18 * s * Math.cos(rot)
	);
	bench.rotation.y = rot;
	g.add(bench);
	registerInteractable(
		sign,
		label,
		'Private changing area used before CT simulation or treatment when clothing must be changed for positioning or access.',
		3.2
	);
	return g;
}

export function orientationKiosk() {
	const g = new THREE.Group();
	scene.add(g);
	const x = 5.5,
		z = -4.3;
	const pedestal = box(0.72, 1.18, 0.56, std(0x3c5965, 0.6, 0.16), x, 0.59, z);
	g.add(pedestal);
	const screenFrame = box(1.32, 0.86, 0.12, std(0x24343b, 0.5, 0.18), x, 1.48, z - 0.04);
	screenFrame.rotation.x = -0.18;
	g.add(screenFrame);
	const tx = makeCanvasPanel('WELCOME TO RTApps', 'Choose a patient journey or explore freely', [
		['Returning treatment', 'Reception → Vault 1'],
		['Mia journey', 'Consult → CT → Plan → Tx 1'],
		['Walk mode', 'Press E near staff / equipment']
	]);
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry(1.16, 0.68),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	screen.position.set(x, 1.5, z - 0.105);
	screen.rotation.x = -0.18;
	g.add(screen);
	registerInteractable(
		screen,
		'Patient Orientation Kiosk',
		'Interactive facility orientation kiosk.',
		2.5,
		null,
		() => openKioskDialog()
	);
	return g;
}
