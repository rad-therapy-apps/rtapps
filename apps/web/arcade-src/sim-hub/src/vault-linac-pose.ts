/* Vault 1's LINAC pose (docs/specs/2026-11-18-consoles-in-center-design.md, part 1): turns the
   LINAC console's pose (shared/console-protocol.ts LinacPose: IEC 61217 angles in degrees, couch
   translations and jaw edges in cm) into the transforms of the named parts of the LINAC app's
   model (linac-vault.glb, scripts/export-linac-model.mjs). It uses the app's own axes, signs and
   part offsets (linac-ct scene.ts, main.ts, linac-safety.ts), so the center turns and moves the
   machine the way the app shows it: the gantry clockwise seen from the couch foot, the collimator
   counter-clockwise seen from the source, the couch counter-clockwise seen from above, +lat to the
   left seen from the couch foot, +lng toward the gantry, +vrt up.
   Unlike the app, which draws a 1 mm couch step 0.1 m long so it can be seen, the center moves
   the couch at true scale (1 cm = 0.01 m). Also: the checks on a pose from the console (clampPose),
   the parked pose (the couch lowered and pulled back to today's lying top) and the light smoothing
   between the console's samples (smoothPose). Free of scene and DOM imports: vault-linac.ts applies
   the result, vault-linac-pose.spec.ts tests it. */
import type { LinacPose } from '../../shared/console-protocol';

/** The app's parts at its home pose, in its own coordinates. */
export const APP = {
	/** scene.ts initThreeJS: the couch (vertical and lateral) group's home and lowest height. */
	couchHome: { x: 0, y: 0.84 },
	couchLowest: 0.3,
	/** The couch top (longitudinal) group's home z in the couch's turntable. */
	couchTopHomeZ: 1.1,
	/** scene.ts createCollimatorJaws3D / jawEdgeCmToOffset: the jaws' plane in the head, their
	    offset from the beam axis at a 0 cm and a 12.5 cm edge, and the Y jaws' thickness. */
	jawPlane: -0.52,
	jawNear: 0.03,
	jawFar: 0.25,
	jawEdgeMaxCm: 12.5,
	jawThickness: 0.04,
	/** scene.ts applyDetectorCommandedPose: the EPID panel out under the patient, and parked. */
	epidOut: { y: -1.02, z: 0, rotX: 0 },
	epidHome: { y: -0.5, z: -0.9, rotX: Math.PI / 2 },
	/** scene.ts createCouch3DModels / updateCouchAccordion at home: the bellows (1 m high, scaled)
	    stand on the couch base plate's top and reach 0.235 m under the couch group's origin, inside
	    the housing. */
	bellowsBottom: 0.065,
	bellowsTop: -0.235,
	bellowsHeight: 1
} as const;

/** The safe range the center shows a console pose in (cm, degrees as signed angles). The couch
    stays clear of the floor and of the gantry (Vault 1's patient lies with its head at the board's
    gantry end, 0.02 m off the gantry: props.ts VAULT1_LYING); anything outside is held at the edge. */
export const LIMITS = {
	couchVrt: [-50, 15],
	couchLng: [-120, 2],
	couchLat: [-25, 25],
	couchAngle: [-95, 95],
	jaw: [0, 12.5]
} as const;

/** Where the parked couch sits against the app's home (vault-linac.ts measures it when the model
    loads): `drop` metres lower and `retract` metres back from the gantry, which puts its top on
    today's lying top (props.ts LYING_SURFACES.vault1). */
export interface CouchFit {
	drop: number;
	retract: number;
}

/** The transforms for the named parts (rotations in radians, positions in the app's metres, each
    in its part's parent). */
export interface LinacPartPose {
	/** gantry rotation.z */
	gantry: number;
	/** collimator rotation.y */
	collimator: number;
	/** couchRotation rotation.y */
	couchAngle: number;
	/** couch position x (lateral) and y (vertical) */
	couchX: number;
	couchY: number;
	/** couchTop position z (longitudinal) */
	couchTopZ: number;
	/** couchBellows position.y and scale.y */
	bellowsY: number;
	bellowsScale: number;
	/** jawX1 / jawX2 position.x, jawY1 / jawY2 position.y */
	jawX1: number;
	jawX2: number;
	jawY1: number;
	jawY2: number;
	/** epid position y and z, rotation x */
	epid: { y: number; z: number; rotX: number };
	kvArms: boolean;
	beam: boolean;
}

const CM = 0.01;
const RAD = Math.PI / 180;
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
/** An angle in degrees as 0..360. */
const wrap360 = (a: number) => ((a % 360) + 360) % 360;
/** An angle in degrees as -180..180. */
const signed = (a: number) => wrap360(a + 180) - 180;

/** The jaw's offset from the beam axis for an edge `cm` from it (scene.ts jawEdgeCmToOffset). */
export function jawOffset(cm: number): number {
	const c = clamp(cm, [0, APP.jawEdgeMaxCm]);
	return APP.jawNear + (c / APP.jawEdgeMaxCm) * (APP.jawFar - APP.jawNear);
}

/** The app's home pose (gantry and couch at 0, a 10 x 10 cm field) with the couch parked by `fit`:
    the pose Vault 1 stands in until the console sends one, and after a resetLinacPose with no
    console loaded. Its lasersOn is not shown: Vault 1's lasers follow only the console's own switch
    (and the Tutorial's). */
export function parkedPose(fit: CouchFit): LinacPose {
	return {
		gantry: 0,
		collimator: 0,
		couchAngle: 0,
		couchVrt: -fit.drop / CM,
		couchLng: -fit.retract / CM,
		couchLat: 0,
		jawX1: 5,
		jawX2: 5,
		jawY1: 5,
		jawY2: 5,
		kvArmsOut: false,
		epidOut: false,
		beamOn: false,
		lasersOn: true
	};
}

/** A pose from the console, made safe to show: a number that is not finite keeps `prev`'s value,
    angles come back as 0..360 (the couch angle held within LIMITS.couchAngle), couch translations
    and jaw edges within LIMITS, flags as booleans. */
export function clampPose(p: LinacPose, prev: LinacPose): LinacPose {
	const num = (k: keyof LinacPose) => {
		const v = Number(p?.[k]);
		return Number.isFinite(v) ? v : (prev[k] as number);
	};
	return {
		gantry: wrap360(num('gantry')),
		collimator: wrap360(num('collimator')),
		couchAngle: wrap360(clamp(signed(num('couchAngle')), LIMITS.couchAngle)),
		couchVrt: clamp(num('couchVrt'), LIMITS.couchVrt),
		couchLng: clamp(num('couchLng'), LIMITS.couchLng),
		couchLat: clamp(num('couchLat'), LIMITS.couchLat),
		jawX1: clamp(num('jawX1'), LIMITS.jaw),
		jawX2: clamp(num('jawX2'), LIMITS.jaw),
		jawY1: clamp(num('jawY1'), LIMITS.jaw),
		jawY2: clamp(num('jawY2'), LIMITS.jaw),
		kvArmsOut: !!p?.kvArmsOut,
		epidOut: !!p?.epidOut,
		beamOn: !!p?.beamOn,
		lasersOn: !!p?.lasersOn
	};
}

/** The part transforms for a pose, lasers aside (linac-safety.ts and main.ts: gantry rotation.z = -angle,
    collimator rotation.y = +angle, couch turntable rotation.y = +angle, couch x -= lat, couch
    y += vrt, couch top z -= lng). */
export function partPose(p: LinacPose): LinacPartPose {
	const couchY = Math.max(APP.couchLowest, APP.couchHome.y + p.couchVrt * CM);
	// the bellows fill the gap between the base plate and the housing, as at the app's home (the
	// app's own updateCouchAccordion lets them sink through the floor as the couch goes down)
	const top = couchY + APP.bellowsTop,
		gap = Math.max(0.01, top - APP.bellowsBottom);
	return {
		gantry: -signed(p.gantry) * RAD,
		collimator: signed(p.collimator) * RAD,
		couchAngle: signed(p.couchAngle) * RAD,
		couchX: APP.couchHome.x - p.couchLat * CM,
		couchY,
		couchTopZ: APP.couchTopHomeZ - p.couchLng * CM,
		bellowsY: top - gap / 2 - couchY,
		bellowsScale: gap / APP.bellowsHeight,
		jawX1: -jawOffset(p.jawX1),
		jawX2: jawOffset(p.jawX2),
		jawY1: APP.jawPlane - jawOffset(p.jawY1) - APP.jawThickness,
		jawY2: APP.jawPlane + jawOffset(p.jawY2) + APP.jawThickness,
		epid: p.epidOut ? { ...APP.epidOut } : { ...APP.epidHome },
		kvArms: p.kvArmsOut,
		beam: p.beamOn
	};
}

/** How fast the smoothing closes on the console's samples (s), and the couch's top speed (cm/s),
    which only the parked couch's rise to the console's home ever reaches. */
export const SMOOTHING = { tau: 0.06, couchSpeed: 50 } as const;

/** `cur` moved toward `target` over `dt` seconds: each number closes the gap by 1 - e^(-dt/tau)
    (the gantry and collimator the short way round, so 359 to 1 passes 0; the couch angle as a
    signed angle, so 95 to 265 passes 0, never the 180 the couch cannot reach), couch translations
    at most SMOOTHING.couchSpeed; a gap under 0.001 closes; flags are the target's. */
export function smoothPose(cur: LinacPose, target: LinacPose, dt: number): LinacPose {
	const k = 1 - Math.exp(-Math.max(0, dt) / SMOOTHING.tau),
		maxStep = SMOOTHING.couchSpeed * Math.max(0, dt);
	const ease = (c: number, t: number, cap = Infinity) => {
		const d = t - c;
		return Math.abs(d) < 1e-3 ? t : c + Math.sign(d) * Math.min(Math.abs(d * k), cap);
	};
	const turn = (c: number, t: number) => wrap360(ease(c, c + signed(t - c)));
	return {
		...target,
		gantry: turn(cur.gantry, target.gantry),
		collimator: turn(cur.collimator, target.collimator),
		couchAngle: wrap360(ease(signed(cur.couchAngle), signed(target.couchAngle))),
		couchVrt: ease(cur.couchVrt, target.couchVrt, maxStep),
		couchLng: ease(cur.couchLng, target.couchLng, maxStep),
		couchLat: ease(cur.couchLat, target.couchLat, maxStep),
		jawX1: ease(cur.jawX1, target.jawX1),
		jawX2: ease(cur.jawX2, target.jawX2),
		jawY1: ease(cur.jawY1, target.jawY1),
		jawY2: ease(cur.jawY2, target.jawY2)
	};
}
