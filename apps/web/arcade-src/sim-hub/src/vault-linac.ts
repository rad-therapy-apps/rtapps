/* Vault 1's LINAC (docs/specs/2026-11-18-consoles-in-center-design.md, part 1). startVaultLinac,
   called once the center has started (main.ts), loads the LINAC app's exported vault
   (linac-vault.glb, scripts/export-linac-model.mjs) and puts its machine, couch, couch base, floor
   pads, ceiling light panels and room lasers where the center's own Vault 1 machine stood
   (props.ts emulatorLinacShell, hidden then; Vault 2 keeps its own), and the app's monitor frame and
   radiation sign in the mounts props.ts linacVaultFitOut set up. If the model cannot load (the Node
   checks have no fetch) the old machine stays and nothing else changes.

   The machine then follows the LINAC console: each pose on console-bus.ts `linacPose` is checked
   (vault-linac-pose.ts clampPose) and becomes the target the parts close on with a light
   smoothing, every frame; a lying patient on the couch moves with the couch top. Until the console
   sends a pose, and again after resetLinacPose (journey.ts resetTreatmentJourney calls it), the
   machine stands parked: gantry at 0 and the couch lowered and pulled back so that its board is
   where today's couch top is (props.ts LYING_SURFACES.vault1), where every lying patient is placed.
   The console's home has the couch at treatment height, about 0.44 m higher; the parked couch
   rises to it when the console's poses come in, so the gantry clears the couch all the way round.
   Colliders, seats, stand points and routes are unchanged. setVaultMonitorPatient (from
   vault-linac-monitor.ts) names the patient on the in-room monitors. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { LinacPose } from '../../shared/console-protocol';
import { linacPose } from './console-bus';
import { scene } from './scene';
import { LINAC_SHELLS, LINAC_VAULT_MOUNTS, LYING_SURFACES, ROOM_LASERS } from './props';
import { LINAC_MODEL_URL } from './vault-linac-files';
import {
	clampPose,
	parkedPose,
	partPose,
	smoothPose,
	type CouchFit,
	type LinacPartPose
} from './vault-linac-pose';
export { setVaultMonitorPatient } from './vault-linac-monitor';

/* The app's floor (y -0.05) goes on Vault 1's floor top (rooms.ts buildRoom: 0.065), so the app's
   isocentre (0, 1.5, -1) comes 1.615 m up over the old machine's (room.x + 1.2, room.z), the couch
   toward the door as before. The app's light panels hang 5 mm under Vault 1's ceiling (5.66 m). */
const APP_FLOOR = -0.05,
	VAULT_FLOOR_TOP = 0.065,
	CEILING_UNDERSIDE = 5.66;

interface Parts {
	frame: THREE.Group;
	gantry: THREE.Object3D;
	collimator: THREE.Object3D;
	jawX1: THREE.Object3D;
	jawX2: THREE.Object3D;
	jawY1: THREE.Object3D;
	jawY2: THREE.Object3D;
	kvArms: THREE.Object3D;
	epid: THREE.Object3D;
	beam: THREE.Object3D;
	lasers: THREE.Object3D;
	couch: THREE.Object3D;
	couchRotation: THREE.Object3D;
	couchTop: THREE.Object3D;
	couchBellows: THREE.Object3D;
	couchTopBoard: THREE.Object3D;
}
const PART_NAMES = [
	'gantry',
	'collimator',
	'jawX1',
	'jawX2',
	'jawY1',
	'jawY2',
	'kvArms',
	'epid',
	'beam',
	'lasers',
	'couch',
	'couchRotation',
	'couchTop',
	'couchBellows',
	'couchTopBoard'
] as const;

let started = false;
let parts: Parts | null = null;
let fit: CouchFit = { drop: 0, retract: 0 };
/** The console's last pose, checked; null while parked. */
let target: LinacPose | null = null;
/** The pose the parts show now, on its way to the target. */
let current: LinacPose | null = null;
/** The laser state last taken from a pose: the lasers change only when it does, so the Tutorial's
    own switching (tutorial.ts setLasers, through ROOM_LASERS) holds in between. */
let lasersFromPose: boolean | null = null;
/** The couch board's world matrix at the parked pose, inverted: a rider's move is the board's
    move since then. */
const parkedBoardInverse = new THREE.Matrix4();
interface Rider {
	base: THREE.Matrix4;
	setPos: THREE.Vector3;
	setQuat: THREE.Quaternion;
}
/** The lying patients on Vault 1's couch, by figure: where the game placed each (base, for the
    parked couch) and where this module last put it. */
const riders = new Map<THREE.Object3D, Rider>();

const goal = () => target ?? parkedPose(fit);

/** Puts Vault 1's machine back to its parked pose (the couch lowered to today's lying top, gantry
    at 0, lasers on); the console's next pose takes it from there. */
export function resetLinacPose(): void {
	target = null;
}

/** What Vault 1's machine shows, for the check hooks (npc-check-hook.ts). */
export function vaultLinacState(): {
	loaded: boolean;
	parked: boolean;
	target: LinacPose;
	current: LinacPose | null;
	fit: CouchFit;
} {
	return { loaded: !!parts, parked: !target, target: goal(), current, fit };
}

/** Loads the LINAC app's vault and follows the console's poses; once, after the center starts. */
export function startVaultLinac(): void {
	if (started) return;
	started = true;
	linacPose.on((p) => {
		target = clampPose(p, target ?? current ?? parkedPose(fit));
	});
	// a failed load, or one that cannot even start (the Node checks' relative URL), keeps the old machine
	try {
		new GLTFLoader().load(
			LINAC_MODEL_URL,
			(gltf) => install(gltf.scene),
			undefined,
			() => {}
		);
	} catch {
		/* the old machine stays */
	}
}

function install(model: THREE.Object3D): void {
	const shell = LINAC_SHELLS.vault1,
		board = LYING_SURFACES.vault1;
	const found = Object.fromEntries(PART_NAMES.map((n) => [n, model.getObjectByName(n)]));
	if (!shell?.parent || !board || PART_NAMES.some((n) => !found[n])) return;
	// the app's coordinates in the center: the old shell's frame, its origin moved to the app's
	const frame = new THREE.Group();
	frame.name = 'vault1-linac';
	frame.quaternion.copy(shell.quaternion);
	frame.position
		.set(0, VAULT_FLOOR_TOP - APP_FLOOR, 1)
		.applyQuaternion(shell.quaternion)
		.add(shell.position);
	for (const name of ['linacMachine', 'couch', 'couchBase', 'lasers'])
		frame.add(model.getObjectByName(name));
	for (const pad of ['floorPadMachine', 'floorPadIso', 'floorPadCabinet'])
		frame.add(model.getObjectByName(pad));
	for (let i = 1; i <= 6; i++) {
		const light = model.getObjectByName(`ceilingLight${i}`);
		if (!light) continue;
		light.position.y = CEILING_UNDERSIDE - 0.005 - frame.position.y;
		frame.add(light);
	}
	frame.traverse((o) => {
		const m = o as THREE.Mesh;
		if (!m.isMesh) return;
		m.receiveShadow = true;
		m.castShadow = !(m.material as THREE.Material).transparent && !o.name.startsWith('ceiling');
	});
	// the in-room monitors' frames (their screens are props.ts's) and the radiation sign
	const at = (o: THREE.Object3D, mount: THREE.Object3D) => {
		o.position.set(0, 0, 0);
		o.rotation.set(0, 0, 0);
		o.scale.set(1, 1, 1);
		mount.add(o);
	};
	const monitor = model.getObjectByName('treatmentMonitor'),
		sign = model.getObjectByName('radiationSign');
	if (monitor) LINAC_VAULT_MOUNTS.monitors.forEach((m, i) => at(i ? monitor.clone() : monitor, m));
	if (sign && LINAC_VAULT_MOUNTS.sign) at(sign, LINAC_VAULT_MOUNTS.sign);
	shell.parent.add(frame);
	shell.visible = false;
	parts = { frame, ...(found as Omit<Parts, 'frame'>) };
	// the parked couch: its board's top and middle on today's couch top
	frame.updateMatrixWorld(true);
	board.updateWorldMatrix(true, false);
	const now = new THREE.Box3().setFromObject(parts.couchTopBoard),
		old = new THREE.Box3().setFromObject(board),
		towardGantry = new THREE.Vector3(0, 0, -1).applyQuaternion(frame.quaternion);
	fit = {
		drop: now.max.y - old.max.y,
		retract: now
			.getCenter(new THREE.Vector3())
			.sub(old.getCenter(new THREE.Vector3()))
			.dot(towardGantry)
	};
	current = parkedPose(fit);
	apply(partPose(current));
	parts.couchTopBoard.updateWorldMatrix(true, false);
	parkedBoardInverse.copy(parts.couchTopBoard.matrixWorld).invert();
	// the lying patients over today's couch top ride the couch (Jordan's and Mia's figures)
	const footprint = old.clone().expandByVector(new THREE.Vector3(0.3, 1, 0.3));
	for (const o of scene.children)
		if (o.userData.lying && footprint.containsPoint(o.position))
			riders.set(o, {
				base: new THREE.Matrix4().compose(o.position, o.quaternion, o.scale),
				setPos: o.position.clone(),
				setQuat: o.quaternion.clone()
			});
	// the tutorial's laser switch now reaches the app's lasers
	const lasersWereOn = (ROOM_LASERS.vault1 ?? []).every((l) => l.visible);
	ROOM_LASERS.vault1 = [parts.lasers];
	parts.lasers.visible = lasersWereOn;
	lasersFromPose = goal().lasersOn;
	let last = performance.now();
	const tick = (t: number) => {
		requestAnimationFrame(tick);
		step(Math.min(0.1, Math.max(0, (t - last) / 1000)));
		last = t;
	};
	requestAnimationFrame(tick);
}

function apply(p: LinacPartPose): void {
	const q = parts;
	q.gantry.rotation.z = p.gantry;
	q.collimator.rotation.y = p.collimator;
	q.couchRotation.rotation.y = p.couchAngle;
	q.couch.position.x = p.couchX;
	q.couch.position.y = p.couchY;
	q.couchTop.position.z = p.couchTopZ;
	q.couchBellows.position.y = p.bellowsY;
	q.couchBellows.scale.y = p.bellowsScale;
	q.jawX1.position.x = p.jawX1;
	q.jawX2.position.x = p.jawX2;
	q.jawY1.position.y = p.jawY1;
	q.jawY2.position.y = p.jawY2;
	q.epid.position.y = p.epid.y;
	q.epid.position.z = p.epid.z;
	q.epid.rotation.x = p.epid.rotX;
	q.kvArms.visible = p.kvArms;
	q.beam.visible = p.beam;
}

const move = new THREE.Matrix4(),
	m = new THREE.Matrix4(),
	pos = new THREE.Vector3(),
	quat = new THREE.Quaternion(),
	scl = new THREE.Vector3();

/** One frame: the parts close on the goal, then each rider is put on the couch where it moved. */
function step(dt: number): void {
	const g = goal();
	current = smoothPose(current, g, dt);
	apply(partPose(current));
	if (g.lasersOn !== lasersFromPose) {
		lasersFromPose = g.lasersOn;
		for (const l of ROOM_LASERS.vault1 ?? []) l.visible = g.lasersOn;
	}
	parts.couch.updateMatrixWorld(true);
	move.multiplyMatrices(parts.couchTopBoard.matrixWorld, parkedBoardInverse);
	for (const [o, r] of riders) {
		// the game placed it again (the Tutorial puts Jordan on the couch): that is its new base
		if (!o.position.equals(r.setPos) || !o.quaternion.equals(r.setQuat))
			r.base.compose(o.position, o.quaternion, o.scale);
		m.multiplyMatrices(move, r.base).decompose(pos, quat, scl);
		o.position.copy(pos);
		o.quaternion.copy(quat);
		r.setPos.copy(pos);
		r.setQuat.copy(quat);
	}
}
