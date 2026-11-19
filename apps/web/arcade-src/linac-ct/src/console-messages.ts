/* The LINAC console mode's message rules (docs/specs/2026-11-18-consoles-in-center-design.md
   part 3, contract in shared/console-protocol.ts): which page URL starts console mode, which
   center messages it accepts and in what shape, the machine pose it reports, when a couch
   correction counts as applied, and how a refused Enable Beam / Beam On is worded. console-hooks.ts
   reads the mode from the URL; console-mode.ts applies the rest to the page. Free of scene and DOM
   imports so it is unit tested in Node (console-messages.spec.ts). */
import {
	CONSOLE_SCENARIO_PARAM,
	CONSOLE_VIEW_PARAM,
	CONSOLE_VIEW_VALUE,
	LINAC_WORKSPACES,
	type CenterToLinacMessage,
	type ConsoleScenario,
	type LinacPose,
	type LinacWorkspace
} from '../../shared/console-protocol';

export interface ConsoleView {
	/** `?view=console`: the app runs inside the center's console panel. */
	console: boolean;
	/** `?scenario=tutorial` counts only in console mode; anything else is the free scenario. */
	scenario: ConsoleScenario;
}

/** Console mode and scenario from the app's own query string ('?view=console&scenario=tutorial'). */
export function consoleViewFromSearch(search: string): ConsoleView {
	const q = new URLSearchParams(search);
	const inConsole = q.get(CONSOLE_VIEW_PARAM) === CONSOLE_VIEW_VALUE;
	return {
		console: inConsole,
		scenario: inConsole && q.get(CONSOLE_SCENARIO_PARAM) === 'tutorial' ? 'tutorial' : 'free'
	};
}

export function isLinacWorkspace(value: unknown): value is LinacWorkspace {
	return LINAC_WORKSPACES.includes(value as LinacWorkspace);
}

/** Whether a message event comes from the center: sent by the parent window, from our origin. */
export function fromCenter(
	source: unknown,
	origin: string,
	parent: unknown,
	ownOrigin: string
): boolean {
	return source != null && source === parent && origin === ownOrigin;
}

/** A center message in its exact contract shape, or null for anything else (wrong type, missing or
    mistyped fields). Only the contract's fields are copied. */
export function parseCenterMessage(data: unknown): CenterToLinacMessage | null {
	if (!data || typeof data !== 'object') return null;
	const d = data as Record<string, unknown>;
	if (d.type === 'rtapps-linac-open')
		return isLinacWorkspace(d.workspace) ? { type: d.type, workspace: d.workspace } : null;
	if (d.type === 'rtapps-linac-room')
		return typeof d.doorClosed === 'boolean' && typeof d.staffInVault === 'boolean'
			? { type: d.type, doorClosed: d.doorClosed, staffInVault: d.staffInVault }
			: null;
	if (d.type === 'rtapps-linac-panel')
		return typeof d.open === 'boolean' ? { type: d.type, open: d.open } : null;
	return null;
}

/** The machine as the app holds it: linac-safety.ts's fundamentalState (angles in degrees, couch
    translations in mm, jaw edges in cm) and the hardware flags on `S`. */
export interface MachineReadout {
	gantry: number;
	collimator: number;
	couchAngle: number;
	vrt: number;
	lng: number;
	lat: number;
	jawX1: number;
	jawX2: number;
	jawY1: number;
	jawY2: number;
	kvOn: boolean;
	detectorExtended: boolean;
	beamOn: boolean;
	lasersOn: boolean;
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
/** Degrees wrapped into 0..360, then to 0.1° (so -0.01 and 359.99 both read 0, and 360.3 reads
    0.3 with no float noise left from the wrap). */
const angle = (v: unknown) => {
	const a = Math.round((((num(v) % 360) + 360) % 360) * 10) / 10;
	return a === 360 ? 0 : a + 0;
};
/** To 0.01 (cm), which is 0.1 mm. */
const hundredths = (v: unknown) => Math.round(num(v) * 100) / 100 + 0;

/** The contract's pose: angles in degrees (0..360), couch in cm from home, jaw edges in cm. */
export function poseFromReadout(m: MachineReadout): LinacPose {
	return {
		gantry: angle(m.gantry),
		collimator: angle(m.collimator),
		couchAngle: angle(m.couchAngle),
		couchVrt: hundredths(num(m.vrt) / 10),
		couchLng: hundredths(num(m.lng) / 10),
		couchLat: hundredths(num(m.lat) / 10),
		jawX1: hundredths(m.jawX1),
		jawX2: hundredths(m.jawX2),
		jawY1: hundredths(m.jawY1),
		jawY2: hundredths(m.jawY2),
		kvArmsOut: !!m.kvOn,
		epidOut: !!m.detectorExtended,
		beamOn: !!m.beamOn,
		lasersOn: !!m.lasersOn
	};
}

/** The shortest gap between two state posts, so that no second ever holds more than 30. */
export const STATE_MIN_GAP_MS = 34;

/** Whether a state post may go now, `lastPostAt` being the last one's time (ms), or null. */
export function statePostDue(now: number, lastPostAt: number | null): boolean {
	return lastPostAt === null || now - lastPostAt >= STATE_MIN_GAP_MS;
}

export function samePose(a: LinacPose | null, b: LinacPose | null): boolean {
	if (!a || !b) return a === b;
	return (Object.keys(a) as (keyof LinacPose)[]).every((k) => a[k] === b[k]);
}

/** The length of a couch correction's translation, in mm to 0.1. */
export function shiftLengthMm(c: { lat: number; lng: number; vrt: number }): number {
	return Math.round(Math.hypot(num(c.lat), num(c.lng), num(c.vrt)) * 10) / 10;
}

export interface SixAxis {
	lat: number;
	lng: number;
	vrt: number;
	roll: number;
	pitch: number;
	yaw: number;
}

/** Whether every remaining couch correction is inside tolerance, by the rule Verify Alignment uses
    (linac-igrt.ts verifyClinicalIGRT): all three translations, and roll/pitch/yaw for CBCT or
    pitch/yaw for an MV pair. */
export function correctionApplied(
	residual: SixAxis,
	tolerance: { translation: number; rotation: number },
	mode: string
): boolean {
	const rot: (keyof SixAxis)[] = mode === 'CBCT' ? ['roll', 'pitch', 'yaw'] : ['pitch', 'yaw'];
	return (
		(['lat', 'lng', 'vrt'] as const).every(
			(k) => Math.abs(num(residual[k])) <= tolerance.translation
		) && rot.every((k) => Math.abs(num(residual[k])) <= tolerance.rotation)
	);
}

/** One beam-enable interlock as linac-safety.ts getDeliveryReadiness lists it. */
export interface ReadinessCheck {
	name: string;
	ok: boolean;
	detail: string;
}
export interface BeamState {
	armed: boolean;
	delivering: boolean;
	completed: boolean;
	ready: boolean;
	checks: ReadinessCheck[];
}
export interface Refusal {
	code: string;
	message: string;
}

/** Mistake codes for the interlocks a learner meets most, the most basic step first: an
    unverified alignment, for one, also leaves the couch off the planned position, so it is coded
    before the geometry it causes. Any other failed check is 'interlock'. */
const INTERLOCK_CODES: [string, string][] = [
	['Vault door closed', 'door-open'],
	['Immobilization / indexing verified', 'setup-not-verified'],
	['Image guidance verified', 'igrt-not-verified'],
	['Treatment geometry matches plan', 'geometry-mismatch'],
	['Imaging hardware retracted', 'imaging-out'],
	['In-room motion locked', 'motion-armed']
];

/** `action` refused by the interlocks: the code names the most basic failed one, the message
    lists every failed one as the checklist shows it. */
export function interlockRefusal(action: string, checks: ReadinessCheck[]): Refusal {
	const failed = checks.filter((c) => !c.ok);
	return {
		code: INTERLOCK_CODES.find(([name]) => failed.some((c) => c.name === name))?.[1] ?? 'interlock',
		message: `${action} refused. Treatment holds: ${failed.map((c) => `${c.name} (${c.detail})`).join('; ')}.`
	};
}

/** Why the console refuses Enable Beam ('enable') or Beam On ('on') right now, or null when the
    press goes ahead (or, while the beam is already on, has nothing to refuse). */
export function beamRefusal(kind: 'enable' | 'on', s: BeamState): Refusal | null {
	if (s.delivering) return null;
	const action = kind === 'on' ? 'Beam On' : 'Enable Beam';
	if (s.completed)
		return {
			code: 'field-complete',
			message: `${action} refused. This field is complete: select the next field.`
		};
	if (!s.ready) return interlockRefusal(action, s.checks);
	if (kind === 'on' && !s.armed)
		return { code: 'beam-not-enabled', message: 'Beam On refused. Press Enable Beam first.' };
	return null;
}
