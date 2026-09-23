/* RTApps (#77 sim-hub modularization, task 6): NPC construction, appearance and labels —
   the humanoid figure builder, clothing/badge/pose helpers, role-label and speech-bubble UI,
   facing helpers, and the department cast placement (`departmentStaff`). Verbatim extractions
   from main.js. `registerDutyActor`/`registerNpcExchange` are duty/exchange registries owned
   by ./npc-behavior.js (task 6's companion module) and are imported back for use inside
   `departmentStaff`. `ROOM_CAST`/`PRIMARY_NPCS`/`PRIMARY_PATIENTS` and `roomById` stay owned by
   main.js — they're read/written by still-resident journey (task 9) systems too — so main.js
   exports them rather than duplicating that state here. `STAFF_GUIDES`/`registerInteractable`
   moved to ./interact.js in task 8 and are imported from there instead. */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { box, sphere, std, chestBadgeTexture, escHtml } from './helpers';
import { scene, camera } from './scene';
import { S } from './state';
import { registerDutyActor, registerNpcExchange } from './npc-behavior';
import { STAFF_GUIDES, registerInteractable } from './interact';
import { ROOM_CAST, PRIMARY_NPCS, PRIMARY_PATIENTS, roomById } from './main';

// RTApps (#77 phase 2 task 13): typed boundary for the appearance-options bag passed into
// personFigure — every field read inside personFigure itself. Callers also pass richer
// per-role literals (e.g. CHARACTER_STYLES entries with skin/pose) through this same
// parameter; those extra fields are fine since they're never passed as inline literals here.
interface PersonFigureOptions {
	female?: boolean;
	hairColor?: number;
}

export function personFigure(
	top = 0x5e8fb2,
	bottom = 0x394651,
	skin = 0xf0c7a3,
	opts: PersonFigureOptions = {}
) {
	const g = new THREE.Group(),
		o = opts || {},
		hairColor = o.hairColor ?? 0x4a382e;
	const torso = box(0.38, 0.58, 0.24, std(top, 0.78, 0.02), 0, 1.35, 0);
	g.add(torso);
	const shoulder = box(0.48, 0.1, 0.22, std(top, 0.76, 0.02), 0, 1.6, 0);
	g.add(shoulder);
	const neck = box(0.09, 0.08, 0.09, std(skin, 0.9, 0.0), 0, 1.68, 0);
	g.add(neck);
	const head = sphere(0.16, std(skin, 0.9, 0.0));
	head.scale.y = 1.05;
	head.position.set(0, 1.86, 0);
	g.add(head);
	const hair = sphere(0.165, std(hairColor, 0.82, 0.02));
	hair.scale.set(1, 0.52, 1);
	hair.position.set(0, 1.94, -0.01);
	g.add(hair);
	if (o.female) {
		const backHair = box(0.22, 0.18, 0.16, std(hairColor, 0.84, 0.02), 0, 1.83, -0.08);
		g.add(backHair);
		const sideL = box(0.05, 0.16, 0.1, std(hairColor, 0.84, 0.02), -0.15, 1.83, 0.01),
			sideR = sideL.clone();
		sideR.position.x = 0.15;
		g.add(sideL);
		g.add(sideR);
	} else {
		const crown = box(0.18, 0.08, 0.18, std(hairColor, 0.84, 0.02), 0, 2.0, -0.01);
		g.add(crown);
	}
	const eyeMat = std(0xffffff, 0.2, 0.0, { emissive: 0xffffff, emissiveIntensity: 0.25 }),
		pupilMat = std(0x1d2228, 0.2, 0.0),
		browMat = std(hairColor, 0.7, 0.02),
		lipMat = std(0x9a5960, 0.65, 0.02);
	const eyeL = sphere(0.023, eyeMat),
		eyeR = sphere(0.023, eyeMat);
	eyeL.position.set(-0.05, 1.87, 0.14);
	eyeR.position.set(0.05, 1.87, 0.14);
	g.add(eyeL);
	g.add(eyeR);
	const pupilL = sphere(0.011, pupilMat),
		pupilR = sphere(0.011, pupilMat);
	pupilL.position.set(-0.05, 1.868, 0.159);
	pupilR.position.set(0.05, 1.868, 0.159);
	g.add(pupilL);
	g.add(pupilR);
	const browL = box(0.06, 0.012, 0.016, browMat, -0.05, 1.92, 0.146),
		browR = browL.clone();
	browR.position.x = 0.05;
	g.add(browL);
	g.add(browR);
	const nose = box(0.024, 0.045, 0.018, std(skin, 0.85, 0.0), 0, 1.84, 0.147);
	g.add(nose);
	const mouth = box(0.06, 0.012, 0.012, lipMat, 0, 1.79, 0.147);
	g.add(mouth);
	const armMat = std(top, 0.8, 0.02),
		legMat = std(bottom, 0.82, 0.04),
		shoeMat = std(0x252b30, 0.85, 0.1);
	const armLP = new THREE.Group();
	armLP.position.set(-0.25, 1.56, 0);
	const armRP = new THREE.Group();
	armRP.position.set(0.25, 1.56, 0);
	const armL = box(0.09, 0.42, 0.09, armMat, 0, -0.21, 0),
		armR = box(0.09, 0.42, 0.09, armMat, 0, -0.21, 0);
	armLP.add(armL);
	armRP.add(armR);
	g.add(armLP);
	g.add(armRP);
	const legLP = new THREE.Group();
	legLP.position.set(-0.1, 1.06, 0);
	const legRP = new THREE.Group();
	legRP.position.set(0.1, 1.06, 0);
	const legL = box(0.12, 0.5, 0.12, legMat, 0, -0.25, 0),
		legR = box(0.12, 0.5, 0.12, legMat, 0, -0.25, 0);
	legLP.add(legL);
	legRP.add(legR);
	legLP.add(box(0.13, 0.06, 0.2, shoeMat, 0, -0.52, 0.03));
	legRP.add(box(0.13, 0.06, 0.2, shoeMat, 0, -0.52, 0.03));
	g.add(legLP);
	g.add(legRP);
	g.userData.walkRig = { armLP, armRP, legLP, legRP };
	g.userData.faceRig = { head, torso };
	g.userData.clothingRig = {
		kind: 'standing',
		topParts: [torso, shoulder, armL, armR],
		bottomParts: [legL, legR],
		topColor: top,
		bottomColor: bottom
	};
	return g;
}

function addLabCoat(group) {
	if (!group || group.userData.labCoat) return group;
	const coatMat = std(0xf5f7f8, 0.82, 0.015),
		trimMat = std(0xd9e0e4, 0.75, 0.02);
	const coat = new THREE.Group();
	const left = box(0.19, 0.61, 0.22, coatMat, -0.105, 1.35, -0.005),
		right = box(0.19, 0.61, 0.22, coatMat, 0.105, 1.35, -0.005);
	coat.add(left, right);
	coat.add(box(0.5, 0.105, 0.21, coatMat, 0, 1.605, -0.005));
	coat.add(
		box(0.055, 0.28, 0.275, trimMat, -0.055, 1.43, 0.145),
		box(0.055, 0.28, 0.275, trimMat, 0.055, 1.43, 0.145)
	);
	coat.add(
		box(0.13, 0.12, 0.025, trimMat, -0.11, 1.17, 0.148),
		box(0.13, 0.12, 0.025, trimMat, 0.11, 1.17, 0.148)
	);
	group.add(coat);
	const wr = group.userData.walkRig;
	if (wr) {
		wr.armLP.add(box(0.105, 0.43, 0.105, coatMat, 0, -0.21, 0.005));
		wr.armRP.add(box(0.105, 0.43, 0.105, coatMat, 0, -0.21, 0.005));
	}
	group.userData.labCoat = true;
	return group;
}
function isDirectCareProvider(roomId, role = '') {
	const r = String(role).toLowerCase();
	if (r.includes('radiation oncologist')) return true;
	if (r.includes('nurse')) return ['patientcare', 'hdr'].includes(roomId);
	return (
		['ctcontrol', 'ctsim', 'linaccontrol', 'vault1', 'vault2'].includes(roomId) &&
		r.includes('therapist')
	);
}
export function setPatientGown(group, on = true) {
	if (!group) return;
	const rig = group.userData.clothingRig;
	if (rig) {
		const gown = 0xb9dbe1,
			gownDark = 0x9fc9d2;
		for (const p of rig.topParts || [])
			if (p?.material?.color) p.material.color.setHex(on ? gown : (rig.topColor ?? 0xc7ced3));
		for (const p of rig.bottomParts || [])
			if (p?.material?.color)
				p.material.color.setHex(on ? gownDark : (rig.bottomColor ?? 0xb9c1c6));
	}
	if (!group.userData.gownPanel && group.userData.walkRig) {
		const panel = box(0.46, 0.46, 0.29, std(0xb9dbe1, 0.88, 0.01), 0, 1.18, 0.01);
		panel.visible = false;
		group.add(panel);
		group.userData.gownPanel = panel;
	}
	if (group.userData.gownPanel) group.userData.gownPanel.visible = !!on;
	group.userData.inGown = !!on;
}

const npcRoleLabels = [];
function roleClass(role) {
	const r = role.toLowerCase();
	if (r.includes('patient') || r.includes('visitor')) return 'patient';
	if (r.includes('physic') || r.includes('dosim')) return 'physics';
	if (r.includes('counsel') || r.includes('social') || r.includes('nurse')) return 'support';
	return '';
}
function addChestBadge(group, name, title = '') {
	if (group.userData.hasBadge) return;
	const badge = new THREE.Mesh(
		new THREE.PlaneGeometry(0.18, 0.09),
		new THREE.MeshBasicMaterial({
			map: chestBadgeTexture(name, title),
			transparent: false,
			side: THREE.DoubleSide
		})
	);
	badge.position.set(0, 1.36, 0.125);
	group.add(badge);
	group.userData.hasBadge = true;
}
export function poseCharacter(group, mode = 'neutral') {
	group.traverse((o) => {
		const r = o.userData?.walkRig;
		if (!r) return;
		r.armLP.rotation.z = 0;
		r.armRP.rotation.z = 0;
		r.legLP.rotation.x = 0;
		r.legRP.rotation.x = 0;
		if (mode === 'desk') {
			r.armLP.rotation.x = -1.05;
			r.armRP.rotation.x = -1.1;
			r.legLP.rotation.x = 0.08;
			r.legRP.rotation.x = -0.05;
		} else if (mode === 'console') {
			r.armLP.rotation.x = -0.88;
			r.armRP.rotation.x = -1.22;
			r.armLP.rotation.z = 0.18;
			r.armRP.rotation.z = -0.2;
		} else if (mode === 'gesture') {
			r.armLP.rotation.x = -0.35;
			r.armRP.rotation.x = -1.28;
			r.armRP.rotation.z = -0.24;
		} else if (mode === 'support') {
			r.armLP.rotation.x = -0.58;
			r.armRP.rotation.x = -0.72;
			r.armLP.rotation.z = 0.08;
			r.armRP.rotation.z = -0.08;
		} else if (mode === 'seated') {
			r.armLP.rotation.x = -0.45;
			r.armRP.rotation.x = -0.48;
			r.legLP.rotation.x = -1.22;
			r.legRP.rotation.x = -1.22;
		} else {
			r.armLP.rotation.x = 0;
			r.armRP.rotation.x = 0;
		}
	});
}
export function setNpcRole(group, role, detail = 'Clinical team member', guideKey = null) {
	group.userData.npcRole = role;
	group.userData.interactionDetail = detail;
	group.userData.guideKey = guideKey;
	const guide = guideKey && STAFF_GUIDES[guideKey] ? STAFF_GUIDES[guideKey] : null;
	if (role !== 'Patient') addChestBadge(group, guide?.name || role, guide?.role || role);
	const el = document.createElement('div');
	el.className = 'npc-role ' + roleClass(role);
	el.textContent = guide?.name ? `${guide.name} · ${role}` : role;
	const lab = new CSS2DObject(el);
	lab.position.set(0, 2.18, 0);
	group.add(lab);
	npcRoleLabels.push({ group, el, lab });
	registerInteractable(group, role, detail, 2.4, guideKey);
	return group;
}
function setNamedNpcRole(group, name, role, detail = 'Clinical team member') {
	group.userData.npcRole = role;
	group.userData.interactionDetail = detail;
	addChestBadge(group, name, role);
	const el = document.createElement('div');
	el.className = 'npc-role ' + roleClass(role);
	el.textContent = `${name} · ${role}`;
	const lab = new CSS2DObject(el);
	lab.position.set(0, 2.18, 0);
	group.add(lab);
	npcRoleLabels.push({ group, el, lab });
	registerInteractable(group, `${name} · ${role}`, detail, 2.4, null);
	return group;
}
// RTApps (#77 phase 2 task 13): npcBubble stashes the CSS2DObject it creates directly on the
// DOM element, so bubbleVis can toggle both the CSS opacity and the CSS2DObject's visibility
// from one reference — small interface extension + one cast at creation.
interface NpcSpeechElement extends HTMLDivElement {
	_rtappsObj?: CSS2DObject;
}
export function npcBubble(group, kind = 'staff') {
	const el = document.createElement('div') as NpcSpeechElement;
	el.className = 'npc-speech ' + kind;
	const obj = new CSS2DObject(el);
	obj.position.set(0, 2.48, 0);
	group.add(obj);
	el._rtappsObj = obj;
	return el;
}
/* RTApps perf pass 2: hide the CSS2DObject with the bubble so hidden bubbles cost zero DOM work. */
export function bubbleVis(b: NpcSpeechElement, on) {
	b.style.opacity = on ? '1' : '0';
	if (b._rtappsObj) b._rtappsObj.visible = !!on;
}
export function faceNpcToward(a, b) {
	const pa = new THREE.Vector3(),
		pb = new THREE.Vector3();
	a.getWorldPosition(pa);
	b.getWorldPosition(pb);
	a.rotation.y = Math.atan2(pb.x - pa.x, pb.z - pa.z);
}
const LABEL_FADE_DIST = 3.4;
const LABEL_RECHECK_STRIDE = 10;
let labelFrameCount = 0;
/* RTApps perf task 2: in walk mode, a label already known to be past the fade-out distance
   skips the world-position/distance/DOM work most frames — it's re-checked every 10th frame so
   an approaching NPC regains its label promptly. Skipped labels leave their DOM state (opacity,
   visibility) exactly as it was, so a hidden label never flickers. Overview mode is unchanged:
   every label is recomputed every frame there, same as before this gating existed. */
export function updateNpcLabels() {
	labelFrameCount++;
	const walkGated = S.mode === 'walk';
	const cam = new THREE.Vector3();
	camera.getWorldPosition(cam);
	const wp = new THREE.Vector3();
	for (const n of npcRoleLabels) {
		if (walkGated && n.farAway && labelFrameCount % LABEL_RECHECK_STRIDE !== 0) continue;
		n.group.getWorldPosition(wp);
		const d = cam.distanceTo(wp);
		const near = d < LABEL_FADE_DIST;
		n.farAway = !near;
		if (n.lab) n.lab.visible = near;
		/* RTApps perf pass 2: invisible CSS2D objects skip DOM transforms entirely */ n.el.style.opacity =
			near ? String(Math.max(0, Math.min(1, (LABEL_FADE_DIST - d) / 1.1))) : '0';
	}
}
export function faceAlong(o, dx, dz, off) {
	if (dx || dz) o.rotation.y = Math.atan2(dx, dz) + (off || 0);
}

export function departmentStaff() {
	const R = (id) => roomById(id),
		cast = ROOM_CAST;
	const addCast = (id, g, kind) => {
		(cast[id] || (cast[id] = [])).push({ g, kind });
		if (kind === 'patient' && !PRIMARY_PATIENTS[id]) PRIMARY_PATIENTS[id] = g;
		return g;
	};
	const CHARACTER_STYLES = {
		lobby: { female: true, hairColor: 0x352419, skin: 0x8f5d3f, pose: 'desk' },
		consult: { female: true, hairColor: 0x38261d, skin: 0xf0c8a6, pose: 'gesture' },
		social: { female: true, hairColor: 0x241711, skin: 0x9c6644, pose: 'gesture' },
		education: { hairColor: 0x1d1410, skin: 0xd4a17a, pose: 'gesture' },
		patientcare: { female: true, hairColor: 0x2b1a14, skin: 0xb77a59, pose: 'support' },
		safety: { hairColor: 0x2e241a, skin: 0xe0b493, pose: 'desk' },
		physics: { female: true, hairColor: 0x221914, skin: 0xc48d67, pose: 'desk' },
		radbio: { female: true, hairColor: 0x5f4031, skin: 0xe4bf9a, pose: 'desk' },
		engineering: { hairColor: 0x201714, skin: 0x7f5339, pose: 'support' },
		qa: { female: true, hairColor: 0x281d16, skin: 0xc28a66, pose: 'desk' },
		dosimetry: { female: true, hairColor: 0x231610, skin: 0xf0c8a6, pose: 'desk' },
		commons: { female: true, hairColor: 0x463229, skin: 0xd0a07d, pose: 'gesture' },
		manager: { female: true, hairColor: 0x2d2018, skin: 0xba7f59, pose: 'desk' },
		ctcontrol: { female: true, hairColor: 0x32261c, skin: 0xd9a883, pose: 'console' },
		ctsim: { hairColor: 0x231812, skin: 0xa76f4f, pose: 'support' },
		linaccontrol: { hairColor: 0x1d1410, skin: 0x8d5c3b, pose: 'console' },
		vault1: { female: true, hairColor: 0x281c15, skin: 0xe3bb95, pose: 'support' },
		vault2: { hairColor: 0x1c1310, skin: 0x6f4933, pose: 'support' },
		hdr: { female: true, hairColor: 0x221814, skin: 0xd7a37f, pose: 'support' }
	};
	// RTApps (#77 phase 2 task 13): `bottom` given an explicit `undefined` default — every
	// call site either passes `undefined` or omits it (falls back to 0x39464f below) — so this
	// is a type-only optionality fix, not a behavior change.
	const place = (id, role, detail, top, dx, dz, ry, skin, bottom?, guideKey = null) => {
		const r = R(id);
		if (!r) return;
		const prof = CHARACTER_STYLES[guideKey || id] || {};
		const charSkin = prof.skin || skin || 0xf0c7a3;
		const g = setNpcRole(
			personFigure(top, bottom || 0x39464f, charSkin, prof),
			role,
			detail,
			guideKey
		);
		g.position.set(r.x + dx, 0, r.z + dz);
		g.rotation.y = ry || 0;
		scene.add(g);
		if (isDirectCareProvider(id, role)) addLabCoat(g);
		if (prof.pose) poseCharacter(g, prof.pose);
		registerDutyActor(g, prof.pose || 'idle');
		addCast(id, g, 'staff');
		if (guideKey) PRIMARY_NPCS[guideKey] = g;
		return g;
	};
	const secondary = (
		id,
		name,
		role,
		detail,
		top,
		dx,
		dz,
		ry,
		skin,
		opts = {},
		pose = 'support'
	) => {
		const r = R(id);
		if (!r) return;
		const g = setNamedNpcRole(personFigure(top, 0x39464f, skin, opts), name, role, detail);
		g.position.set(r.x + dx, 0, r.z + dz);
		g.rotation.y = ry || 0;
		scene.add(g);
		if (isDirectCareProvider(id, role)) addLabCoat(g);
		poseCharacter(g, pose);
		registerDutyActor(g, pose);
		addCast(id, g, 'staff');
		return g;
	};
	const lyingPatient = (id, detail, dx, dz, ry = 0, skin = 0xe9c39d, hairColor = 0x4a382e) => {
		const r = R(id);
		if (!r) return;
		const cont = new THREE.Group();
		const lift = id === 'vault1' || id === 'vault2' ? 0.62 : id === 'ctsim' ? 0.48 : 0.42;
		const topMat = std(0xd3d9dd, 0.78, 0.02),
			pantMat = std(0xc3cace, 0.82, 0.03),
			skinMat = std(skin, 0.9, 0.0),
			hairMat = std(hairColor, 0.82, 0.02),
			shoeMat = std(0x252b30, 0.85, 0.1);
		const torso = box(0.82, 0.22, 0.42, topMat, 0, 0.9 + lift, -0.05);
		cont.add(torso);
		const pelvis = box(0.42, 0.2, 0.42, topMat, 0.5, 0.88 + lift, -0.02);
		cont.add(pelvis);
		const neck = box(0.08, 0.06, 0.08, skinMat, -0.52, 0.92 + lift, 0);
		cont.add(neck);
		const head = sphere(0.17, skinMat);
		head.scale.y = 1.04;
		head.position.set(-0.72, 0.92 + lift, 0);
		cont.add(head);
		const hair = sphere(0.175, hairMat);
		hair.scale.set(1, 0.5, 1);
		hair.position.set(-0.73, 0.99 + lift, -0.01);
		cont.add(hair);
		const armL = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, -0.22);
		cont.add(armL);
		const armR = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, 0.22);
		cont.add(armR);
		const foreL = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, -0.22);
		cont.add(foreL);
		const foreR = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, 0.22);
		cont.add(foreR);
		const legL = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, -0.1);
		cont.add(legL);
		const legR = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, 0.1);
		cont.add(legR);
		const footL = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, -0.1);
		cont.add(footL);
		const footR = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, 0.1);
		cont.add(footR);
		const pillow = box(0.34, 0.055, 0.42, std(0xd7e1e5, 0.86, 0.02), -0.67, 0.73 + lift, 0);
		cont.add(pillow);
		setNpcRole(cont, 'Patient', detail);
		cont.userData.clothingRig = {
			kind: 'lying',
			topParts: [torso, pelvis, armL, armR],
			bottomParts: [legL, legR],
			topColor: 0xd3d9dd,
			bottomColor: 0xc3cace
		};
		cont.position.set(r.x + dx, 0.02, r.z + dz);
		cont.rotation.y = ry;
		scene.add(cont);
		addCast(id, cont, 'patient');
		return cont;
	};
	const sitPatient = (id, detail, dx, dz, ry, skin = 0xe9c39d, opts = {}) => {
		const r = R(id);
		if (!r) return;
		const g = setNpcRole(personFigure(0xc7ced3, 0xb9c1c6, skin, opts), 'Patient', detail);
		g.position.set(r.x + dx, 0, r.z + dz);
		g.rotation.y = ry || 0;
		scene.add(g);
		registerDutyActor(g, 'idle');
		addCast(id, g, 'patient');
		return g;
	};
	/* Front of house / support */
	place(
		'lobby',
		'Patient Access Coordinator',
		'Registration, identity verification, scheduling and arrival workflow.',
		0xe3e9ec,
		-6.0,
		-2.7,
		0,
		0xf0c8a6,
		undefined,
		'lobby'
	);
	sitPatient('lobby', 'New patient waiting after check-in.', -6.2, 3.3, Math.PI, 0xd7a17d, {
		female: true,
		hairColor: 0x3a281f
	});
	sitPatient('lobby', 'Returning patient checked in for treatment.', -2.5, 3.0, Math.PI, 0x7b5239, {
		hairColor: 0x1c1410
	});
	sitPatient('lobby', 'Family member accompanying a patient.', 3.2, 3.0, Math.PI, 0xe2b38d, {
		female: true,
		hairColor: 0x4a3126
	});
	place(
		'consult',
		'Radiation Oncologist',
		'Evaluates the patient, prescribes radiation and oversees the course of care.',
		0xe3e9ec,
		-2.3,
		-1.3,
		0.4,
		0xf0c8a6,
		undefined,
		'consult'
	);
	sitPatient('consult', 'Here for a new-patient consultation.', 0.2, 1.2, Math.PI);
	place(
		'social',
		'Oncology Social Worker',
		'Psychosocial support, transportation, financial concerns and community resources.',
		0x8a719e,
		-2.2,
		-1.2,
		0.4,
		0xecc5a6,
		undefined,
		'social'
	);
	place(
		'education',
		'Patient Navigator',
		'Helps patients understand appointments, resources and the sequence of care.',
		0x5c8e9c,
		-1.6,
		0.9,
		0.5,
		0xefc7a4,
		undefined,
		'education'
	);
	sitPatient('education', 'Reviewing the care pathway and education materials.', 1.1, -0.2, -0.4);
	place(
		'patientcare',
		'Oncology Nurse',
		'Assessment, symptom management, medication review and supportive-care coordination.',
		0x5b9f8d,
		1.4,
		-2.2,
		-0.7,
		0xefc7a4,
		undefined,
		'patientcare'
	);
	/* Technical services */
	place(
		'safety',
		'Radiation Safety Officer',
		'Radiation protection, monitoring, source safety and regulatory oversight.',
		0xd7ad57,
		0,
		-1.1,
		0,
		0xeac19e,
		undefined,
		'safety'
	);
	place(
		'physics',
		'Medical Physicist',
		'Calibration, dose measurement, QA and technical safety of radiation delivery.',
		0xb37d45,
		-2.2,
		-1.3,
		0.3,
		0xe8c09f,
		undefined,
		'physics'
	);
	place(
		'radbio',
		'Radiobiology Educator / Scientist',
		'Explains the biological response of cells and tissues to radiation.',
		0xa4795a,
		0,
		-1.4,
		0,
		0xead0b0,
		undefined,
		'radbio'
	);
	place(
		'engineering',
		'LINAC Field Service Engineer',
		'Maintains and repairs treatment-machine mechanical, electronic and RF systems.',
		0xcaa15a,
		0,
		0.6,
		Math.PI,
		0xe8c09f,
		undefined,
		'engineering'
	);
	place(
		'qa',
		'Medical Physicist · QA',
		'Performs and reviews equipment quality-assurance measurements.',
		0xb37d45,
		-2.0,
		-2.0,
		0.4,
		0xe8c09f,
		undefined,
		'qa'
	);
	place(
		'dosimetry',
		'Medical Dosimetrist',
		'Develops the technical treatment plan from the physician prescription.',
		0x92744f,
		-3.6,
		-1.8,
		0.6,
		0xefc8a6,
		undefined,
		'dosimetry'
	);
	place(
		'commons',
		'Clinical Education Coordinator',
		'Supports orientation, continuing education and supervised clinical learning.',
		0x7a77a5,
		3.2,
		2.8,
		-1,
		0xefc8a6,
		undefined,
		'commons'
	);
	/* Clinical operations */
	place(
		'manager',
		'Rad Onc Manager / Lead Therapist',
		'Coordinates treatment operations, staffing, chart review and escalation.',
		0x6d9c84,
		0,
		-1.1,
		0,
		0xefc8a6,
		undefined,
		'manager'
	);
	place(
		'ctcontrol',
		'CT Simulation Therapist',
		'Operates the CT scanner and monitors the patient from the control room.',
		0x6d8ea9,
		1.2,
		2.4,
		Math.PI,
		0xefc8a6,
		undefined,
		'ctcontrol'
	);
	place(
		'ctsim',
		'Radiation Therapist · CT Simulation',
		'Positions, immobilizes and images the patient for treatment planning.',
		0x6d8ea9,
		-2.6,
		2.2,
		-0.5,
		0xefc8a6,
		undefined,
		'ctsim'
	);
	lyingPatient('ctsim', 'Undergoing CT simulation on the flat tabletop.', -4.0, 1.5, 0);
	place(
		'linaccontrol',
		'Radiation Therapist · Treatment Control',
		'Reviews the treatment record and imaging and monitors delivery from the console.',
		0x617ca5,
		0.35,
		1.6,
		-Math.PI / 2,
		0xf0c8a6,
		undefined,
		'linaccontrol'
	);
	place(
		'vault1',
		'Radiation Therapist · Vault 1',
		'Performs setup, image guidance and external-beam treatment delivery.',
		0x617ca5,
		-3.5,
		3.25,
		0.6,
		0xf0c8a6,
		undefined,
		'vault1'
	);
	lyingPatient('vault1', 'Positioned on the treatment couch.', -1.25, -0.05, 0, 0x7b5239, 0x1c1410);
	place(
		'vault2',
		'Radiation Therapist · Vault 2',
		'Performs the same core safety and treatment workflow on the second LINAC.',
		0x617ca5,
		-3.5,
		-3.25,
		0.6,
		0xefc8a6,
		undefined,
		'vault2'
	);
	lyingPatient('vault2', 'Positioned on the treatment couch.', -1.25, -0.05, 0);
	place(
		'hdr',
		'Brachytherapy / Special Procedures Nurse',
		'Supports preparation, monitoring, education and recovery for HDR procedures.',
		0x6aa187,
		-2.1,
		2.1,
		0.4,
		0xf0c8a6,
		undefined,
		'hdr'
	);
	place(
		'hdr',
		'Medical Physicist',
		'Supports source-transfer safety and technical verification for HDR.',
		0xb37d45,
		2.1,
		1.6,
		-0.6,
		0xe8c09f
	);
	lyingPatient('hdr', 'Undergoing an HDR special procedure.', -1.3, 0.1, 0);
	/* Secondary team members and patient partners create visible teamwork in each department. */
	sitPatient('social', 'Discussing transportation and support needs.', 1.25, 1.0, -0.6, 0x7c5238, {
		female: true,
		hairColor: 0x211610
	});
	sitPatient(
		'patientcare',
		'Reporting symptoms during a nursing assessment.',
		-2.5,
		1.5,
		0.8,
		0xd8a47f,
		{ hairColor: 0x463229 }
	);
	secondary(
		'safety',
		'Alex Kim',
		'Radiation Safety Technologist',
		'Reviewing monitoring records with the Radiation Safety Officer.',
		0xd5a85e,
		1.7,
		1.5,
		-2.2,
		0xc18a63,
		{ hairColor: 0x201814 },
		'desk'
	);
	secondary(
		'physics',
		'Jordan Price',
		'Radiation Therapist',
		'Assisting with a measurement setup in the physics laboratory.',
		0x6b91b7,
		1.6,
		1.2,
		-1.2,
		0x80543a,
		{ female: true, hairColor: 0x1d1410 },
		'support'
	);
	secondary(
		'radbio',
		'Leah Grant',
		'Research Assistant',
		'Reviewing cell-response observations with the radiobiology educator.',
		0x7390a3,
		2.0,
		1.0,
		-1.1,
		0xd7a17b,
		{ female: true, hairColor: 0x4b3225 },
		'desk'
	);
	secondary(
		'engineering',
		'Omar Davis',
		'Service Technician',
		'Assisting with LINAC service diagnostics and component inspection.',
		0x87939c,
		2.4,
		-1.1,
		-1.7,
		0x6f4933,
		{ hairColor: 0x17110e },
		'inspect'
	);
	secondary(
		'qa',
		'Riley Chen',
		'Radiation Therapist',
		'Reviewing QA setup and measurement results with medical physics.',
		0x6791ad,
		2.1,
		1.1,
		-1.7,
		0xd8ad8c,
		{ female: true, hairColor: 0x251a15 },
		'support'
	);
	secondary(
		'dosimetry',
		'Dr. Priya Shah',
		'Medical Physicist',
		'Reviewing the treatment plan and technical checks with dosimetry.',
		0xa87e52,
		-1.9,
		1.1,
		0.8,
		0xa66f4d,
		{ female: true, hairColor: 0x18110e },
		'desk'
	);
	secondary(
		'commons',
		'Jordan Bell',
		'Radiation Therapy Student',
		'Discussing a clinical case with the education coordinator.',
		0x8192bb,
		-0.8,
		2.4,
		0.6,
		0xe0b08d,
		{ hairColor: 0x35251c },
		'gesture'
	);
	secondary(
		'manager',
		'Chris Evans',
		'Radiation Therapist',
		'Reviewing the daily treatment schedule and staffing needs with the lead therapist.',
		0x668ca5,
		-1.8,
		1.6,
		0.65,
		0xc28b67,
		{ hairColor: 0x291c15 },
		'desk'
	);
	secondary(
		'ctcontrol',
		'Avery Woods',
		'Radiation Therapist',
		'Verifying the simulation protocol and coordinating with the therapist in the scanner room.',
		0x6c93b2,
		-1.3,
		-2.0,
		0.3,
		0x81563c,
		{ female: true, hairColor: 0x1d1410 },
		'console'
	);
	secondary(
		'ctsim',
		'Jasmine Lee',
		'Radiation Therapist',
		'Assisting with immobilization indexing, tabletop setup and patient comfort before the planning scan.',
		0x6794b3,
		1.8,
		2.0,
		-2.3,
		0xd7a17c,
		{ female: true, hairColor: 0x2f211a },
		'support'
	);
	secondary(
		'linaccontrol',
		'Marcus Hill',
		'Radiation Therapist',
		'Cross-checking the treatment record, imaging status and room readiness.',
		0x658da9,
		-0.4,
		-2.0,
		-Math.PI / 2,
		0x6b4733,
		{ hairColor: 0x15110f },
		'console'
	);
	secondary(
		'vault1',
		'Elena Torres',
		'Radiation Therapist',
		'Assisting with patient alignment and immobilization in Vault 1.',
		0x6694b0,
		-1.6,
		-2.4,
		0.2,
		0xbe805d,
		{ female: true, hairColor: 0x2b1912 },
		'support'
	);
	secondary(
		'vault2',
		'Devin Cole',
		'Radiation Therapist',
		'Assisting with setup verification in Vault 2.',
		0x6694b0,
		-1.6,
		2.4,
		0.2,
		0x754d36,
		{ hairColor: 0x17100d },
		'support'
	);
	const link = (id, exchange) => {
		const arr = cast[id] || [],
			staff = arr.filter((x) => x.kind === 'staff'),
			patients = arr.filter((x) => x.kind === 'patient');
		if (staff.length && (patients.length || staff.length > 1))
			registerNpcExchange(
				staff[0].g,
				(patients[0] || staff[1]).g,
				exchange,
				13 + Math.random() * 4,
				Math.random()
			);
	};
	link('lobby', [
		{ who: 'a', text: 'Good morning. I can help you check in.' },
		{ who: 'b', text: 'Thank you. This is my first visit.' },
		{ who: 'a', text: 'I’ll verify your information and let the care team know you are here.' }
	]);
	link('consult', [
		{ who: 'a', text: 'Let’s review the goal of radiation treatment.' },
		{ who: 'b', text: 'What should I expect during treatment?' },
		{ who: 'a', text: 'I’ll explain the benefits, side effects and next steps with you.' }
	]);
	link('social', [
		{ who: 'a', text: 'Let’s talk about what could make treatment difficult to attend.' },
		{ who: 'b', text: 'Transportation has been my biggest concern.' },
		{ who: 'a', text: 'We can review local resources and support options.' }
	]);
	link('education', [
		{ who: 'a', text: 'Your next major step is CT simulation.' },
		{ who: 'b', text: 'Is that the same as my treatment?' },
		{ who: 'a', text: 'No. It creates the images and setup information used to plan treatment.' }
	]);
	link('patientcare', [
		{ who: 'a', text: 'I’m checking how you have been feeling since your last visit.' },
		{ who: 'b', text: 'I’ve noticed more fatigue this week.' },
		{ who: 'a', text: 'Thank you for telling me. We’ll assess it and update the care team.' }
	]);
	link('safety', [
		{ who: 'a', text: 'Let’s confirm the monitoring records and controlled-area checks.' },
		{ who: 'b', text: 'The badge review and survey documentation are current.' }
	]);
	link('physics', [
		{ who: 'a', text: 'Center the detector before we record this measurement.' },
		{ who: 'b', text: 'Setup is aligned and ready for verification.' }
	]);
	link('radbio', [
		{ who: 'a', text: 'Compare the response after the fractionated exposure.' },
		{ who: 'b', text: 'The survival pattern is different from the single-dose group.' }
	]);
	link('engineering', [
		{ who: 'a', text: 'Check the service diagnostics before we close the panel.' },
		{ who: 'b', text: 'Mechanical and RF checks are within expected values.' }
	]);
	link('qa', [
		{ who: 'a', text: 'Let’s verify phantom position before taking the reading.' },
		{ who: 'b', text: 'Alignment is centered to the room lasers.' }
	]);
	link('dosimetry', [
		{ who: 'a', text: 'Target coverage is acceptable here, but review this OAR hotspot.' },
		{ who: 'b', text: 'Agreed. Let’s evaluate whether the optimization can reduce it.' }
	]);
	link('commons', [
		{ who: 'a', text: 'What did you notice about the setup decision in this case?' },
		{ who: 'b', text: 'The immobilization choice affects how reproducible the position will be.' }
	]);
	link('manager', [
		{ who: 'a', text: 'Vault 2 has a maintenance window this afternoon.' },
		{ who: 'b', text: 'I’ll review the schedule and identify patients who may need reassignment.' }
	]);
	link('ctcontrol', [
		{ who: 'a', text: 'Confirm the protocol and scan extent before acquisition.' },
		{ who: 'b', text: 'Protocol is selected and the setup note matches the order.' }
	]);
	link('ctsim', [
		{
			who: 'a',
			text: 'I’m going to adjust the support so you can hold this position comfortably.'
		},
		{ who: 'b', text: 'Okay. Please let me know when I need to stay completely still.' }
	]);
	link('linaccontrol', [
		{ who: 'a', text: 'Image match is complete. Please verify the couch correction.' },
		{ who: 'b', text: 'Correction verified against the treatment record.' }
	]);
	link('vault1', [
		{ who: 'a', text: 'Let’s recheck shoulder position before imaging.' },
		{ who: 'b', text: 'I’m comfortable. Is this where I need to stay still?' },
		{ who: 'a', text: 'Yes. We’ll finish the setup, then leave the room for treatment.' }
	]);
	link('vault2', [
		{ who: 'a', text: 'Immobilization is indexed. Let’s verify the reference marks.' },
		{ who: 'b', text: 'Do I need to move at all once you leave?' },
		{ who: 'a', text: 'Stay in this position. We can see and hear you the entire time.' }
	]);
	link('hdr', [
		{ who: 'a', text: 'Let’s confirm the patient is ready before the source transfer.' },
		{ who: 'b', text: 'Monitoring and procedure checks are complete.' },
		{ who: 'a', text: 'Good. We’ll proceed only after the full safety verification.' }
	]);
	const linkStaff = (id, exchange, offset = 0.25) => {
		const staff = (cast[id] || []).filter((x) => x.kind === 'staff');
		if (staff.length > 1) registerNpcExchange(staff[0].g, staff[1].g, exchange, 15, offset);
	};
	linkStaff(
		'ctsim',
		[
			{ who: 'a', text: 'Can you confirm the device is indexed to the documented position?' },
			{ who: 'b', text: 'Confirmed. Head support and knee support match the setup record.' },
			{ who: 'a', text: 'Great. I’ll do the final laser check before scanning.' }
		],
		0.18
	);
	linkStaff(
		'vault1',
		[
			{ who: 'a', text: 'I have the longitudinal index. Can you verify lateral alignment?' },
			{ who: 'b', text: 'Lateral alignment and immobilization are verified.' },
			{ who: 'a', text: 'Let’s step out and review the verification image together.' }
		],
		0.42
	);
	linkStaff(
		'vault2',
		[
			{ who: 'a', text: 'Please confirm patient ID and treatment site before we leave the room.' },
			{ who: 'b', text: 'Two identifiers and treatment site are confirmed.' },
			{ who: 'a', text: 'Room is ready for imaging.' }
		],
		0.62
	);
	linkStaff(
		'hdr',
		[
			{ who: 'a', text: 'Nursing monitoring is complete. Are physics checks ready?' },
			{ who: 'b', text: 'Source path, dwell plan and transfer checks are verified.' },
			{ who: 'a', text: 'Then we are ready for the procedural timeout.' }
		],
		0.78
	);
}

export function bubble(kind, who, msg) {
	const host = document.getElementById('staffTranscript');
	const d = document.createElement('div');
	d.className = 'chatBubble ' + kind;
	d.innerHTML = `<span class="chatWho">${escHtml(who)}</span>${escHtml(msg)}`;
	host.appendChild(d);
	host.scrollTop = host.scrollHeight;
}
