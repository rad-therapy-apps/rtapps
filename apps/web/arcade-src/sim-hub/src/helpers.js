// @ts-nocheck -- converted in this PR, header removed per-module
/* RTApps (#77 sim-hub modularization, task 3): primitives, textures, signs, small utils.
   Verbatim extractions from main.js — mesh primitives (box/cyl/sphere/std/eRbox), canvas
   texture builders (sign/door-header/badge/workflow/engineering textures/architectural wall
   material), and small utilities (escHtml/zeroY/point helpers/later). A handful of these
   (wall, makeWallSign, makeDoorHeaderSign, makeLobbyEntranceSign, makeDirectionalSign, later)
   still reach back for `scene` (now from ./scene.js, task 4) and `JOURNEY` (owned by
   ./journey.js, task 9) and `collider`/`doorCenter`/`doorNormal` (task 8's ./walk.js). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { scene } from './scene';
import { collider, doorCenter, doorNormal } from './walk';
import { JOURNEY } from './journey';

export function std(c, r = 0.75, m = 0.03, o = {}) {
	return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
}

/* RTApps perf pass 2: only meshes big enough to throw a visible shadow cast one — the sun's
   depth pass was re-rendering ~2000 casters/frame, ~1200 of them centimeter-scale NPC parts.
   receiveShadow stays on everywhere (floors/walls catching shadows is the look). */
export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
	const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
	o.position.set(x, y, z);
	o.castShadow = Math.max(w, h, d) > 1.0;
	o.receiveShadow = true;
	return o;
}
export function cyl(rt, rb, h, mat, seg = 28) {
	const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
	o.castShadow = h > 1.0 || rt > 0.4;
	o.receiveShadow = true;
	return o;
}

export function sphere(r, mat) {
	const o = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat);
	o.castShadow = r > 0.3;
	o.receiveShadow = true;
	return o;
}

export function chestBadgeTexture(name, title = '') {
	const c = document.createElement('canvas');
	c.width = 320;
	c.height = 160;
	const x = c.getContext('2d');
	x.fillStyle = 'rgba(244,248,249,.96)';
	x.fillRect(0, 0, 320, 160);
	x.strokeStyle = 'rgba(15,53,65,.35)';
	x.lineWidth = 6;
	x.strokeRect(3, 3, 314, 154);
	x.fillStyle = '#0f3541';
	x.font = '900 36px Arial';
	x.fillText((name || 'STAFF').slice(0, 22), 18, 60);
	x.fillStyle = '#2a8f89';
	x.font = '700 22px Arial';
	x.fillText((title || 'Team').slice(0, 24), 18, 98);
	x.fillStyle = '#62808c';
	x.font = '700 18px Arial';
	x.fillText('RTAPPS · STAFF', 18, 130);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

export function wall(x, z, w, d, h, mat, collide = true) {
	const o = box(w, h, d, mat, x, h / 2, z);
	scene.add(o);
	if (collide) collider(x, z, w, d);
	return o;
}

export function makeSignTexture(room) {
	const c = document.createElement('canvas');
	c.width = 900;
	c.height = 270;
	const x = c.getContext('2d');
	const palette =
		room.zone === 'technical'
			? ['#f7f2e9', '#8a5b1a']
			: room.zone === 'clinical'
				? ['#edf8f7', '#176f70']
				: ['#eef5fb', '#2a5f8d'];
	if (room.id === 'manager') palette[1] = '#685398';
	if (room.vault) palette[1] = '#9d3942';
	if (room.special) palette[1] = '#287d58';
	x.fillStyle = palette[0];
	x.fillRect(0, 0, c.width, c.height);
	x.fillStyle = palette[1];
	x.fillRect(0, 0, 22, c.height);
	x.strokeStyle = 'rgba(30,45,55,.22)';
	x.lineWidth = 6;
	x.strokeRect(3, 3, c.width - 6, c.height - 6);
	x.fillStyle = '#24343b';
	x.font = '700 35px Arial';
	x.fillText(room.kicker.toUpperCase(), 54, 65);
	x.fillStyle = '#11242c';
	x.font = '800 52px Arial';
	const words = room.name
		.replace('Treatment Vault 1 — ', 'Vault 1 · ')
		.replace('Treatment Vault 2 — ', 'Vault 2 · ');
	x.fillText(words.length > 34 ? words.slice(0, 34) + '…' : words, 54, 137);
	x.fillStyle = '#5a6d75';
	x.font = '600 28px Arial';
	x.fillText(
		'RTApps · ' +
			(room.zone === 'technical'
				? 'Education & Technical'
				: room.zone === 'clinical'
					? 'Clinical Services'
					: 'Patient Services'),
		54,
		205
	);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
export function makeWallSign(room, side, gap) {
	const dc = doorCenter(room, 1.88);
	const tangent = side[0] === 'z' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
	const normal = doorNormal(room);
	const pos = dc
		.clone()
		.add(tangent.multiplyScalar(gap / 2 + 1.25))
		.add(normal.multiplyScalar(0.035));
	const sign = new THREE.Mesh(
		new THREE.PlaneGeometry(2.15, 0.65),
		new THREE.MeshBasicMaterial({ map: makeSignTexture(room), side: THREE.DoubleSide })
	);
	sign.position.copy(pos);
	if (side === 'zmin') sign.rotation.y = Math.PI;
	else if (side === 'zmax') sign.rotation.y = 0;
	else if (side === 'xmin') sign.rotation.y = -Math.PI / 2;
	else sign.rotation.y = Math.PI / 2;
	scene.add(sign);
}

export function makeDoorHeaderTexture(room) {
	const c = document.createElement('canvas');
	c.width = 1200;
	c.height = 260;
	const x = c.getContext('2d');
	x.fillStyle = '#f4f7f7';
	x.fillRect(0, 0, c.width, c.height);
	x.fillStyle = '#' + room.color.toString(16).padStart(6, '0');
	x.fillRect(0, 0, c.width, 28);
	x.fillStyle = '#19313a';
	x.font = '800 58px Arial';
	let nm = room.name
		.replace('Treatment Vault 1 — LINAC', 'TREATMENT VAULT 1 · LINAC')
		.replace('Treatment Vault 2 — LINAC', 'TREATMENT VAULT 2 · LINAC');
	if (nm.length > 34) x.font = '800 48px Arial';
	x.textAlign = 'center';
	x.fillText(nm.toUpperCase(), c.width / 2, 132);
	x.fillStyle = '#59717a';
	x.font = '700 27px Arial';
	x.fillText(room.kicker.toUpperCase(), c.width / 2, 190);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
export function makeDoorHeaderSign(room, side, gap) {
	const h = room.vault ? 3.78 : 3.05,
		dc = doorCenter(room, h),
		normal = doorNormal(room);
	dc.add(normal.clone().multiplyScalar(0.085));
	const w = room.vault ? 4.7 : Math.max(2.8, Math.min(4.4, gap + 1.2)),
		hh = room.vault ? 0.76 : 0.62;
	const back = box(w + 0.12, hh + 0.1, 0.055, std(0x26363d, 0.7, 0.12), dc.x, dc.y, dc.z);
	if (side === 'zmin' || side === 'zmax') back.rotation.y = side === 'zmin' ? Math.PI : 0;
	else back.rotation.y = side === 'xmin' ? -Math.PI / 2 : Math.PI / 2;
	scene.add(back);
	const s = new THREE.Mesh(
		new THREE.PlaneGeometry(w, hh),
		new THREE.MeshBasicMaterial({ map: makeDoorHeaderTexture(room), side: THREE.DoubleSide })
	);
	s.position.copy(dc).add(normal.clone().multiplyScalar(0.045));
	if (side === 'zmin') s.rotation.y = Math.PI;
	else if (side === 'zmax') s.rotation.y = 0;
	else if (side === 'xmin') s.rotation.y = -Math.PI / 2;
	else s.rotation.y = Math.PI / 2;
	scene.add(s);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pre-existing dead code, tracked in #77 phase 1 report
export function makeDoorNameLabel(room) {}

export function makeLobbyEntranceSign(r) {
	const c = document.createElement('canvas');
	c.width = 1200;
	c.height = 260;
	const x = c.getContext('2d');
	x.fillStyle = '#f4f7f7';
	x.fillRect(0, 0, 1200, 260);
	x.fillStyle = '#2f8cab';
	x.fillRect(0, 0, 1200, 30);
	x.fillStyle = '#17333d';
	x.textAlign = 'center';
	x.font = '900 64px Arial';
	x.fillText('RADIATION ONCOLOGY', 600, 130);
	x.fillStyle = '#627781';
	x.font = '700 30px Arial';
	x.fillText('MAIN ENTRANCE · RECEPTION', 600, 192);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const s = new THREE.Mesh(
		new THREE.PlaneGeometry(5.4, 1.05),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	s.position.set(r.x, 3.28, r.z + r.d / 2 + 0.03);
	scene.add(s);
}

export function makeCanvasPanel(title, sub = '', lines = []) {
	const c = document.createElement('canvas');
	c.width = 1024;
	c.height = 560;
	const x = c.getContext('2d');
	x.fillStyle = '#08141a';
	x.fillRect(0, 0, c.width, c.height);
	x.fillStyle = '#1f99cc';
	x.fillRect(0, 0, c.width, 26);
	x.strokeStyle = 'rgba(110,180,210,.45)';
	x.lineWidth = 6;
	x.strokeRect(8, 8, c.width - 16, c.height - 16);
	x.fillStyle = '#f5fbfd';
	x.font = '800 42px Arial';
	x.fillText(title, 34, 68);
	if (sub) {
		x.fillStyle = '#93cddd';
		x.font = '700 20px Arial';
		x.fillText(sub, 34, 102);
	}
	let y = 150;
	lines.forEach((line, i) => {
		x.fillStyle = i % 2 === 0 ? 'rgba(72,127,157,.16)' : 'rgba(31,55,70,.10)';
		x.fillRect(30, y - 28, c.width - 60, 46);
		x.fillStyle = '#89b8c5';
		x.font = '700 21px Arial';
		x.fillText(line[0], 48, y);
		x.fillStyle = '#ffffff';
		x.font = '800 22px Arial';
		x.fillText(line[1], 360, y);
		y += 58;
	});
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

export function workflowDisplayTexture(title = 'WORKFLOW') {
	const c = document.createElement('canvas');
	c.width = 1100;
	c.height = 620;
	const x = c.getContext('2d');
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return { canvas: c, ctx: x, texture: t, title, status: 'READY', rows: [] };
}

export function eRbox(w, h, d, mat, r = 0.08) {
	const rad = Math.min(r, Math.min(w, h, d) / 2 - 0.002);
	const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.max(0.01, rad)), mat);
	m.castShadow = Math.max(w, h, d) > 1.0;
	m.receiveShadow = true;
	return m;
}

export function engineeringLinacOverviewTexture() {
	const c = document.createElement('canvas');
	c.width = 1024;
	c.height = 640;
	const x = c.getContext('2d');
	x.fillStyle = '#07131a';
	x.fillRect(0, 0, c.width, c.height);
	x.fillStyle = '#1f99cc';
	x.fillRect(0, 0, c.width, 28);
	x.strokeStyle = 'rgba(110,180,210,.45)';
	x.lineWidth = 6;
	x.strokeRect(8, 8, c.width - 16, c.height - 16);
	x.fillStyle = '#f5fbfd';
	x.font = '900 40px Arial';
	x.fillText('LINAC SYSTEM OVERVIEW', 34, 64);
	x.fillStyle = '#93cddd';
	x.font = '700 20px Arial';
	x.fillText(
		'Educational room-level schematic from modulator/RF generation to treatment delivery',
		34,
		96
	);
	x.fillStyle = '#173844';
	x.fillRect(36, 138, 952, 440);
	x.strokeStyle = '#4fd1c5';
	x.lineWidth = 4;
	x.strokeRect(36, 138, 952, 440);
	const nodes = [
		['Modulator / Power cabinet', 110, 220, 160, 60, '#5b7381'],
		['Magnetron / Klystron', 310, 220, 160, 60, '#6a86a8'],
		['Accelerating waveguide', 520, 220, 180, 60, '#5f86d7'],
		['Bending magnet', 760, 220, 150, 60, '#4494e2'],
		['Treatment head', 760, 360, 170, 72, '#7c5ce0'],
		['Gantry + couch', 500, 360, 180, 72, '#35b48f'],
		['MV/kV imaging', 270, 360, 160, 72, '#c88b42']
	];
	x.textAlign = 'center';
	nodes.forEach((n) => {
		x.fillStyle = n[4];
		x.fillRect(n[1], n[2], n[3], n[4] ? 60 : 60);
		x.fillStyle = '#fff';
		x.font = '800 22px Arial';
		wrapText(x, n[0], n[1] + n[3] / 2, n[2] + 24, n[3] - 16, 24);
	});
	function arrow(x1, y1, x2, y2, color = '#8fd8ff') {
		x.strokeStyle = color;
		x.fillStyle = color;
		x.lineWidth = 6;
		x.beginPath();
		x.moveTo(x1, y1);
		x.lineTo(x2, y2);
		x.stroke();
		const ang = Math.atan2(y2 - y1, x2 - x1);
		x.beginPath();
		x.moveTo(x2, y2);
		x.lineTo(x2 - 16 * Math.cos(ang - Math.PI / 6), y2 - 16 * Math.sin(ang - Math.PI / 6));
		x.lineTo(x2 - 16 * Math.cos(ang + Math.PI / 6), y2 - 16 * Math.sin(ang + Math.PI / 6));
		x.closePath();
		x.fill();
	}
	function wrapText(ctx, text, cx, y, maxW, lh) {
		const words = text.split(' ');
		let line = '';
		let lines = [];
		words.forEach((w) => {
			const test = line ? line + ' ' + w : w;
			if (ctx.measureText(test).width > maxW && line) {
				lines.push(line);
				line = w;
			} else line = test;
		});
		if (line) lines.push(line);
		lines.forEach((ln, i) => ctx.fillText(ln, cx, y + i * lh));
	}
	arrow(270, 250, 310, 250);
	arrow(470, 250, 520, 250);
	arrow(700, 250, 760, 250);
	arrow(835, 280, 835, 360);
	arrow(760, 396, 680, 396);
	arrow(500, 396, 430, 396);
	x.textAlign = 'left';
	x.fillStyle = '#dbeff6';
	x.font = '700 22px Arial';
	x.fillText('Clinical concept:', 58, 518);
	x.font = '600 19px Arial';
	x.fillText(
		'Electrical/RF systems accelerate electrons, the gantry and treatment head shape and deliver the beam, and imaging supports positioning/verification.',
		58,
		548
	);
	x.fillText(
		'This schematic complements the treatment-head display by showing where the head fits within the full LINAC system.',
		58,
		576
	);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
export function engineeringShieldingTexture() {
	const c = document.createElement('canvas');
	c.width = 1024;
	c.height = 640;
	const x = c.getContext('2d');
	x.fillStyle = '#07131a';
	x.fillRect(0, 0, c.width, c.height);
	x.fillStyle = '#1f99cc';
	x.fillRect(0, 0, c.width, 28);
	x.strokeStyle = 'rgba(110,180,210,.45)';
	x.lineWidth = 6;
	x.strokeRect(8, 8, c.width - 16, c.height - 16);
	x.fillStyle = '#f5fbfd';
	x.font = '900 40px Arial';
	x.fillText('VAULT SHIELDING CONCEPTS', 34, 64);
	x.fillStyle = '#93cddd';
	x.font = '700 20px Arial';
	x.fillText(
		'Illustrative educational example only — final shielding design must be performed by qualified experts',
		34,
		96
	);
	x.fillStyle = '#10242c';
	x.fillRect(50, 140, 924, 430);
	x.strokeStyle = '#325562';
	x.lineWidth = 4;
	x.strokeRect(50, 140, 924, 430);
	x.fillStyle = '#4b5d69';
	x.fillRect(350, 220, 280, 180);
	x.fillStyle = '#fff';
	x.font = '800 28px Arial';
	x.textAlign = 'center';
	x.fillText('TREATMENT', 490, 295);
	x.fillText('VAULT', 490, 330);
	x.fillStyle = '#718894';
	x.fillRect(270, 220, 80, 180);
	x.fillRect(630, 220, 80, 180);
	x.fillRect(350, 160, 280, 60);
	x.fillRect(350, 400, 280, 60);
	x.fillStyle = '#d7edf4';
	x.font = '800 20px Arial';
	x.fillText('Primary barrier', 310, 312);
	x.fillText('Primary barrier', 670, 312);
	x.fillText('Secondary / leakage barrier', 490, 198);
	x.fillText('Secondary / leakage barrier', 490, 436);
	x.fillStyle = '#26404d';
	x.fillRect(170, 260, 100, 100);
	x.fillStyle = '#fff';
	x.font = '800 20px Arial';
	x.fillText('Maze /', 220, 302);
	x.fillText('entry', 220, 326);
	x.strokeStyle = '#89d3ff';
	x.lineWidth = 8;
	x.beginPath();
	x.moveTo(270, 310);
	x.lineTo(240, 310);
	x.lineTo(240, 210);
	x.lineTo(320, 210);
	x.stroke();
	x.fillStyle = '#fff';
	x.font = '700 18px Arial';
	x.textAlign = 'left';
	const lines = [
		['Controlled area (occupational)', 'Example primary barrier: ~2.0–2.2 m ordinary concrete'],
		['Non-controlled / public area', 'Example primary barrier: ~2.2–2.4 m ordinary concrete'],
		['Controlled secondary barrier', 'Example leakage/scatter barrier: ~1.2–1.5 m concrete'],
		['Non-controlled secondary barrier', 'Example leakage/scatter barrier: ~1.5–1.8 m concrete'],
		[
			'Door/maze concept',
			'Maze reduces direct line-of-sight; door shielding depends on the calculated residual radiation field'
		]
	];
	let y = 486;
	lines.forEach((ln, i) => {
		x.fillStyle = i % 2 === 0 ? 'rgba(72,127,157,.14)' : 'rgba(31,55,70,.10)';
		x.fillRect(82, y - 22, 860, 34);
		x.fillStyle = '#89b8c5';
		x.font = '700 19px Arial';
		x.fillText(ln[0], 98, y);
		x.fillStyle = '#ffffff';
		x.font = '800 19px Arial';
		x.fillText(ln[1], 360, y);
		y += 36;
	});
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

export function architecturalWallMaterial() {
	const c = document.createElement('canvas');
	c.width = 512;
	c.height = 256;
	const x = c.getContext('2d');
	x.fillStyle = '#d9dfe1';
	x.fillRect(0, 0, 512, 256);
	for (let i = 0; i < 512; i += 64) {
		x.fillStyle = i % 128 === 0 ? '#d3d9db' : '#dde2e4';
		x.fillRect(i, 0, 62, 256);
		x.fillStyle = 'rgba(80,101,109,.12)';
		x.fillRect(i + 62, 0, 2, 256);
	}
	for (let y = 20; y < 256; y += 58) {
		x.fillStyle = 'rgba(255,255,255,.18)';
		x.fillRect(0, y, 512, 1);
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(2.8, 1.4);
	return new THREE.MeshStandardMaterial({
		map: t,
		color: 0xffffff,
		roughness: 0.94,
		metalness: 0.01
	});
}

export function later(fn, ms) {
	const id = setTimeout(() => {
		JOURNEY.sceneTimers = (JOURNEY.sceneTimers || []).filter((x) => x !== id);
		fn();
	}, ms);
	(JOURNEY.sceneTimers || (JOURNEY.sceneTimers = [])).push(id);
	return id;
}

export function zeroY(v) {
	return new THREE.Vector3(v.x, 0, v.z);
}

export function makeDirectionalSign(text, sub, x, y, z, rotY, w = 3.2) {
	const c = document.createElement('canvas');
	c.width = 1000;
	c.height = 240;
	const q = c.getContext('2d');
	q.fillStyle = '#13242c';
	q.fillRect(0, 0, 1000, 240);
	q.strokeStyle = '#62818c';
	q.lineWidth = 7;
	q.strokeRect(4, 4, 992, 232);
	q.fillStyle = '#eff6f7';
	q.font = '800 56px Arial';
	q.fillText(text, 45, 94);
	q.fillStyle = '#9ccbd0';
	q.font = '600 31px Arial';
	q.fillText(sub, 45, 162);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(w, 0.76),
		new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })
	);
	m.position.set(x, y, z);
	m.rotation.y = rotY;
	scene.add(m);
}

export function samePoint(a, b) {
	return a.distanceTo(b) < 0.06;
}
export function commonPrefixLen(a, b) {
	let i = 0;
	while (i < a.length && i < b.length && samePoint(a[i], b[i])) i++;
	return i;
}
export function cleanPoints(pts) {
	const out = [];
	for (const p of pts) {
		if (!out.length || out.at(-1).distanceTo(p) > 0.35) out.push(p);
	}
	return out;
}

export function escHtml(s) {
	return String(s ?? '').replace(
		// eslint-disable-next-line no-useless-escape -- legacy pattern, unnecessary but harmless escape of "
		/[&<>\"']/g,
		// eslint-disable-next-line no-useless-escape -- legacy pattern, unnecessary but harmless escape of "
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[c]
	);
}
