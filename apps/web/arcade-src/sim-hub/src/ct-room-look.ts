/// <reference types="vite/client" />
/* The CT Simulator room's scanner in the CT suite's look, driven by the CT console
   (docs/specs/2026-11-18-consoles-in-center-design.md, part 2). Once the center is built it loads the
   suite's gantry, rotor, table and lasers (models/ct-scanner.glb, made by
   scripts/export-ct-model.mjs) and swaps them in for the ring, pedestal and table top props.ts
   ctScanner built: the ring keeps its 2.835 m and the bore its axis and centre, and the new table top
   sits on the old one's top. The table itself stays CT_COUCH.table (equipment.ts, now drawn by the
   model's top), so the journey's couch slide, the lying patients and the NPC check are unchanged. If
   the model cannot load (the Node checks have no fetch) the old scanner stays and works as before.

   While the CT console panel is open (console-bus.ts panelOpen 'ct') it follows the console's pose
   (ctPose, mapped by ct-room-pose.ts): table travel and height, the rotor turning and the bore lit
   while scanning, the x-ray lamp over the door and the lasers. The table and every patient lying on
   it sit in one frame group at scene level: the console moves the frame, and the journey keeps
   moving the table (and its patient) inside it as before, so either way a lying patient rides along.
   With no CT console open the frame stays at rest and the journey drives. ctRoomFeedCamera is the
   room camera the CT console panel shows. main.ts calls initCtRoomLook once. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from './scene';
import { CT_COUCH } from './equipment';
import { CT_SCANNER, XRAY_LAMP_ON, XRAY_LAMP_OFF } from './props';
import { ROOM_CAST } from './main';
import { isPaused } from './pause';
import { ctPose, panelOpen } from './console-bus';
import type { ConsoleKind, CtPose } from '../../shared/console-protocol';
import {
	tableTarget,
	tableDriver,
	roomShows,
	rotorAngle,
	fitScale,
	pedestalScaleY,
	liesOn
} from './ct-room-pose';

const MODEL_URL = `${import.meta.env.BASE_URL}models/ct-scanner.glb`;
/** The CT room ceiling's underside (rooms.ts buildRoom: 3.75 m walls, a 0.04 m slab). */
const CEILING_Y = 3.71;
/** The bore glow while scanning: the model's bezel (or the old scanner's bore torus), then the
    softer glow of the model's bore wall. */
const BORE_LIT = [
	{ color: 0x35d6c4, intensity: 1.4 },
	{ color: 0x2bb3a6, intensity: 0.75 }
];

/* What the room follows: the open console panel and the CT console's last pose (kept while the
   panel is closed: the console stays alive and posts only on change). */
let open: ConsoleKind | null = null,
	pose: CtPose | null = null;
/** The table and the patients lying on it; at rest unless the console drives. */
const frame = new THREE.Group();
frame.name = 'ct-table-frame';
/* The pedestal under the table (the old one, then the model's): its bottom, its height at home and
   its y scale at home, so it can be stretched to meet the top as the top rises or falls. */
let pedestal: { mesh: THREE.Object3D; bottom: number; height: number; scaleY: number } | null =
	null;
/* Emissive materials that light up while scanning, with their colour and intensity at rest. */
let glows: { mat: THREE.MeshStandardMaterial; color: number; intensity: number }[] = [];
let model: { rotor: THREE.Object3D; lasers: THREE.Object3D } | null = null;
let rotor = 0,
	lastTick = 0,
	feedCamera: THREE.PerspectiveCamera | null = null;

/** The camera the CT console panel shows as its room feed: high on the CT room's control-window
    wall (x 36), between the window and the door, looking at the gantry's face and the length of
    the table. 16:9; the panel may set its own aspect. */
export function ctRoomFeedCamera(): THREE.Camera {
	if (!feedCamera) {
		feedCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 220);
		feedCamera.position.set(36.5, 2.9, -6.4);
		feedCamera.lookAt(42.6, 1.1, -10.2);
		feedCamera.updateMatrixWorld();
	}
	return feedCamera;
}

const driver = () => tableDriver(open, pose);

/* Puts the frame where the console wants the table: the table's own position is the journey's (it
   moves it during its scan), so the frame makes up the difference. At rest otherwise. */
function placeFrame() {
	const table = CT_COUCH.table;
	let x = 0,
		y = 0;
	if (driver() === 'console') {
		const t = tableTarget(pose, {
			baseX: CT_COUCH.baseX,
			inDist: CT_COUCH.inDist,
			topY: CT_SCANNER.topY
		});
		x = t.x - table.position.x;
		y = t.topY - CT_SCANNER.topY;
	}
	if (frame.position.x === x && frame.position.y === y) return;
	frame.position.set(x, y, 0);
	frame.updateMatrixWorld(true);
	if (pedestal) {
		const { mesh, bottom, height, scaleY } = pedestal;
		mesh.scale.y = scaleY * pedestalScaleY(height, y);
		mesh.position.y = bottom + (height + y) / 2;
		mesh.updateMatrixWorld(true);
	}
}

/* The bore glow, the x-ray lamp and the lasers, as roomShows says. */
function applyShows() {
	const s = roomShows(driver(), pose);
	glows.forEach((g, i) => {
		const lit = BORE_LIT[i];
		g.mat.emissive.setHex(s.scanning ? lit.color : g.color);
		g.mat.emissiveIntensity = s.scanning ? lit.intensity : g.intensity;
	});
	CT_SCANNER.xrayLamp?.color.setHex(s.xrayOn ? XRAY_LAMP_ON : XRAY_LAMP_OFF);
	if (model) model.lasers.visible = s.lasersOn;
}

function update() {
	placeFrame();
	applyShows();
}

/* Every render (scene.onBeforeRender, after three has updated the scene's matrices): keeps the
   console's table in place while the journey's couch slide moves the table inside the frame, and
   turns the rotor while scanning (not while the game is paused). */
function tick() {
	const now = performance.now(),
		dt = Math.min(0.1, (now - lastTick) / 1000);
	lastTick = now;
	if (driver() === 'console') placeFrame();
	if (!model || isPaused()) return;
	const a = rotorAngle(rotor, dt, roomShows(driver(), pose).scanning);
	if (a === rotor) return;
	rotor = a;
	model.rotor.rotation.z = a;
	model.rotor.updateMatrixWorld(true);
}

/** A mesh's or line's own geometry box, in its own units. */
function extent(o: THREE.Mesh | THREE.Line): THREE.Box3 {
	if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
	return o.geometry.boundingBox;
}
const glowOf = (mat: THREE.MeshStandardMaterial) => ({
	mat,
	color: mat.emissive.getHex(),
	intensity: mat.emissiveIntensity
});

/* The suite's parts in place of the old ring, pedestal and table top. The suite's frame has the
   bore axis along z with the table on +z; turned by -90° about y that is the center's bore axis
   along x with the table on -x. The suite's head pad is left out: the center's lying patients
   bring their own pillow, and the pad would sit inside them. */
function swapModel(gltf: THREE.Group) {
	const part = (name: string) => gltf.getObjectByName(name),
		gantry = part('gantry'),
		rotorNode = part('rotor'),
		lasers = part('lasers'),
		laserY = part('laserY') as THREE.Line,
		top = part('tableTop') as THREE.Mesh,
		base = part('tableBase') as THREE.Mesh,
		face = part('frontFace') as THREE.Mesh,
		bezel = part('bezel') as THREE.Mesh,
		bore = part('boreWall') as THREE.Mesh,
		table = CT_COUCH.table;
	if (![gantry, rotorNode, lasers, laserY, top, base, face, bezel, bore].every(Boolean)) return;
	if (!table || !CT_SCANNER.group) return;
	const size = new THREE.Box3().setFromObject(gantry).getSize(new THREE.Vector3()),
		k = fitScale(Math.max(size.x, size.y), CT_SCANNER.ringDiameter);
	const root = new THREE.Group();
	root.name = 'ct-scanner-model';
	root.position.copy(CT_SCANNER.boreCenter);
	root.rotation.y = -Math.PI / 2;
	root.scale.setScalar(k);
	root.add(gantry, rotorNode, lasers);
	// the vertical laser runs from the bore up to the ceiling (below the bore the floor hides it)
	const up = extent(laserY).max.y;
	lasers.scale.y = (CEILING_Y - CT_SCANNER.boreCenter.y) / (up * k);
	CT_SCANNER.group.add(root);
	// the top, in the suite's frame and scale, as a child of the table with its top surface centred
	// on the old top's (0.075 m above the table's centre)
	const rig = new THREE.Group();
	rig.rotation.y = -Math.PI / 2;
	rig.scale.setScalar(k);
	rig.add(top);
	rig.updateMatrixWorld(true);
	const tb = new THREE.Box3().setFromObject(top),
		tc = tb.getCenter(new THREE.Vector3()),
		half = CT_SCANNER.topY - table.position.y;
	rig.position.set(-tc.x, half - tb.max.y, -tc.z);
	table.add(rig);
	// the old top stays the lying surface (LYING_SURFACES) and the journey's slide; the model draws it
	table.material = new THREE.MeshBasicMaterial({ visible: false });
	// the pedestal stands on the floor under the part of the top that is over it all the way in and
	// all the way out (the top slides over it), up to the top's underside
	const thick = tb.max.y - tb.min.y,
		height = CT_SCANNER.topY - thick,
		natural = extent(base).getSize(new THREE.Vector3()).y;
	base.position.set(CT_COUCH.baseX + CT_COUCH.inDist / 2, height / 2, table.position.z);
	base.rotation.set(0, -Math.PI / 2, 0);
	base.scale.set(k, height / natural, k);
	CT_SCANNER.group.add(base);
	if (CT_SCANNER.pedestal) CT_SCANNER.pedestal.visible = false;
	pedestal = { mesh: base, bottom: 0, height, scaleY: base.scale.y };
	for (const o of CT_SCANNER.gantry) o.visible = false;
	root.traverse((o) => {
		if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
	});
	top.castShadow = top.receiveShadow = base.castShadow = base.receiveShadow = true;
	// the CT QA flash (equipment.ts flashCtScanner) and the scan glow use the model's face and bezel
	CT_COUCH.ring = face;
	CT_COUCH.bore = bezel;
	glows = [bezel, bore].map((m) => glowOf(m.material as THREE.MeshStandardMaterial));
	model = { rotor: rotorNode, lasers };
	root.updateMatrixWorld(true);
	base.updateMatrixWorld(true);
	frame.position.set(0, 0, 0);
	update();
}

async function loadModel() {
	try {
		swapModel((await new GLTFLoader().loadAsync(MODEL_URL)).scene);
	} catch {
		// no model (no fetch in the Node checks, or the file is missing): the old scanner stays
	}
}

/** Puts the CT table and its lying patients in the console's frame, listens to the CT console and
    loads the suite's model. main.ts calls it once the center is built. */
export function initCtRoomLook() {
	const table = CT_COUCH.table;
	if (!table || !CT_SCANNER.group) return;
	scene.add(frame);
	// the patients lying on the table now (the CT room's patient and the journey's, shown or not)
	const top = new THREE.Box3().setFromObject(table),
		rect = { x0: top.min.x, x1: top.max.x, z0: top.min.z, z1: top.max.z, y: top.max.y },
		b = new THREE.Box3();
	for (const { g } of ROOM_CAST.ctsim || []) {
		if (!g.userData?.lying) continue;
		b.setFromObject(g);
		if (liesOn({ cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, minY: b.min.y }, rect))
			frame.attach(g);
	}
	frame.attach(table);
	const old = CT_SCANNER.pedestal;
	if (old) {
		const h = new THREE.Box3().setFromObject(old).getSize(new THREE.Vector3()).y;
		pedestal = { mesh: old, bottom: old.position.y - h / 2, height: h, scaleY: old.scale.y };
	}
	const oldBore = (CT_COUCH.bore as THREE.Mesh | null)?.material as THREE.MeshStandardMaterial;
	if (oldBore?.emissive) glows = [glowOf(oldBore)];
	ctPose.on((p) => {
		pose = p;
		update();
	});
	panelOpen.on((k) => {
		open = k;
		update();
	});
	const before = scene.onBeforeRender;
	scene.onBeforeRender = function (...args) {
		before.apply(this, args);
		tick();
	};
	// ?npccheck: the CT room's pose channels and feed camera, for the browser pictures and checks
	const hook = (window as unknown as { __NPC?: Record<string, unknown> }).__NPC;
	if (hook)
		hook.ctRoom = {
			ctPose,
			panelOpen,
			feedCamera: ctRoomFeedCamera,
			frame,
			modelLoaded: () => !!model
		};
	applyShows();
	void loadModel();
}
