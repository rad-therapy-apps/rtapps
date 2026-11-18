/* The CT room's scanner as the center shows it, worked out for ct-room-look.ts: the CT console's
   pose (shared/console-protocol.ts CtPose, table travel and height as 0..1 fractions) mapped onto
   the center's own CT table (equipment.ts CT_COUCH: home x, the 3.15 m slide into the bore, and
   today's top height), who drives the table (the console while its panel is open, the journey's
   couch moves otherwise), the rotor's spin, the model's fit and which figures lie on the table. Free
   of scene and DOM imports so it is unit tested in Node (ct-room-pose.spec.ts). */
import type { ConsoleKind, CtPose } from '../../shared/console-protocol';

/** The center's CT table: home x of its centre, how far it slides into the bore (+x), today's top. */
export interface CtTableRange {
	baseX: number;
	inDist: number;
	topY: number;
}

/** How far the top rises and falls (metres, lowest to highest) around today's height. The CT
    suite's table moves 6 units either way (ct-state.ts COUCH_Y_LOW/HIGH), 0.3 m at the scale of
    its 34-unit (1.7 m) patient. Today's height is the console's middle (0.5), where it starts. */
export const TABLE_HEIGHT_SPAN = 0.6;
/** The rotor's turn while scanning, radians a second (the suite's own, room.ts animate). */
export const ROTOR_SPEED = 4.2;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Where the console's pose puts the table: its centre's x and its top's height. */
export function tableTarget(pose: CtPose, r: CtTableRange): { x: number; topY: number } {
	return {
		x: r.baseX + clamp01(pose.tableTravel) * r.inDist,
		topY: r.topY + (clamp01(pose.tableHeight) - 0.5) * TABLE_HEIGHT_SPAN
	};
}

export type CtTableDriver = 'console' | 'journey';

/** The console drives the table while the CT panel is open and the console has sent a pose; the
    journey's couch moves (equipment.ts startCtCouchScan) drive it otherwise, as before. */
export function tableDriver(open: ConsoleKind | null, pose: CtPose | null): CtTableDriver {
	return open === 'ct' && pose ? 'console' : 'journey';
}

/** What the room shows: the console's scan, x-ray and lasers while it drives; otherwise the room at
    rest with its lasers on. */
export function roomShows(
	driver: CtTableDriver,
	pose: CtPose | null
): { scanning: boolean; xrayOn: boolean; lasersOn: boolean } {
	if (driver === 'console' && pose)
		return { scanning: pose.scanning, xrayOn: pose.xrayOn, lasersOn: pose.lasersOn };
	return { scanning: false, xrayOn: false, lasersOn: true };
}

/** The rotor's angle after dt seconds, in 0..2π. */
export function rotorAngle(angle: number, dt: number, scanning: boolean): number {
	if (!scanning) return angle;
	const a = (angle + ROTOR_SPEED * dt) % (2 * Math.PI);
	return a < 0 ? a + 2 * Math.PI : a;
}

/** The model's uniform scale: its ring (outer diameter in its own units) at the center's diameter. */
export function fitScale(modelRingDiameter: number, centerRingDiameter: number): number {
	return centerRingDiameter / modelRingDiameter;
}

/** The pedestal's height scale so it stands from the floor to the underside of the top. */
export function baseScaleY(undersideY: number, naturalHeight: number): number {
	return undersideY / naturalHeight;
}

/** A figure's centre on the floor plan and its lowest point. */
export interface FigureSpot {
	cx: number;
	cz: number;
	minY: number;
}
/** The table top's footprint on the floor plan and its height. */
export interface TopRect {
	x0: number;
	x1: number;
	z0: number;
	z1: number;
	y: number;
}
/* A lying figure rests its lowest point on the top (npc.ts restLyingPatient), so within a few
   centimetres of it. */
const LIE_TOL = 0.05;

/** Whether a figure lies on the top: centred over its footprint with its lowest point on it. */
export function liesOn(f: FigureSpot, top: TopRect): boolean {
	return (
		f.cx >= top.x0 &&
		f.cx <= top.x1 &&
		f.cz >= top.z0 &&
		f.cz <= top.z1 &&
		Math.abs(f.minY - top.y) <= LIE_TOL
	);
}
