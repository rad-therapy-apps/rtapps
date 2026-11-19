/* Chapter 1 of the sim-hub tutorial, Jordan's treatment day (docs/specs/2026-11-11-sim-hub-menu-
   tutorial-design.md, PR 3), as data: each step's role, objective, target, completion trigger,
   walking hints, check-in exchange, decision or console task, and the world actions tutorial.ts
   runs when the step starts, is triggered and completes. Steps 3, 6, 8 and 9 are console steps
   (docs/specs/2026-11-18-consoles-in-center-design.md, part 6): E opens the real LINAC console in
   the tutorial scenario, and Jordan's events on it complete the step. The decision wording and the
   reasons come from the staff and journey text (interact.ts STAFF_GUIDES, journey.ts JOURNEY_META
   and the journey's lines). Plain data, so its spec runs without the scene. Positions are world
   [x, z] in metres; the escort and Jamie's vault finals are the journey's own (journey.ts), so
   their routes are the ones the NPC check walks. Jamie's spot in LINAC Control is the Tutorial's
   own (the tutorial check walks it against the walls). */
import { TUTORIAL_PATIENTS, TUTORIAL_SHIFT_MM } from '../../shared/console-protocol';
import type { LinacEvent, LinacWorkspace } from '../../shared/console-protocol';
import type { Pt } from './tutorial-math';

export type Role = 'patient' | 'therapist';
export interface RoleInfo {
	name: string;
	role: string;
	initials: string;
}
export const ROLES: Record<Role, RoleInfo> = {
	patient: { name: 'Jordan Ellis', role: 'Patient', initials: 'JE' },
	therapist: {
		name: 'Morgan Reed',
		role: 'Radiation Therapist',
		initials: 'MR'
	}
};

/** World points the wiring uses (tutorial.ts). */
export const WORLD = {
	/** Outside the main entrance (z > plazaZ, |x| < plazaHalfX) the marker leads in through it. */
	plazaZ: 10.25,
	plazaHalfX: 30,
	entranceOut: [1.2, 11.6] as Pt,
	entranceIn: [0.6, 8.4] as Pt,
	/** The check-in spot in front of Maya Brooks (journey.ts startTreatmentJourney). */
	checkIn: [-4.5, -2.05] as Pt,
	/** Where the player stands at the start of step 3: Morgan Reed's spot at the console, facing it
	    (journey.ts resetTreatmentJourney; yaw as walk.ts reads it, the look along -x). */
	therapistStart: { x: 46.06, z: 10.6, yaw: Math.PI / 2, pitch: -0.12 },
	/** The console desk's front edge (rooms.ts linaccontrol: desk at room.x - 6.29, 1.25 deep,
	    6.0 long) and where to stand at it. */
	console: {
		a: [45.4, 6.2] as Pt,
		b: [45.4, 11.8] as Pt,
		stand: [46.1, 9.0] as Pt
	},
	/** The vault 1 couch's near (+z) side, just in front of its side control panel (props.ts
	    couchSideControlPanel, at z -17.22), and where to stand beside it. */
	couch: {
		a: [76.2, -17.1] as Pt,
		b: [79.6, -17.1] as Pt,
		stand: [77.4, -16.4] as Pt
	},
	/** Jordan's escort to Vault 1: the changing area, then the couch side (journey.ts
	    beginJordanEscortToVault). */
	changingArea: [69.0, -14.15] as Pt,
	couchSide: [76.7, -15.25] as Pt,
	/** Where Jordan stands after sitting up (journey.ts, the 'returning' stage). */
	offCouch: [77.0, -15.25] as Pt,
	/** The lobby desk, where the walk back ends (the check-in spot). */
	lobbyDesk: [-4.5, -2.05] as Pt,
	/** Jamie Williams across the couch: on the line from the vault graph's node off the couch's -x
	    end (room-routes.ts vault1 node 6) to Elena Torres's place. */
	jamieAcross: [76.3, -20.0] as Pt,
	/** Jamie in LINAC Control, behind the operators' chairs facing the console (the journey's spot,
	    45.56, 8.6, is in the aisle in front of the desk, where E would talk to Jamie instead of
	    opening the console), and back in the vault (journey.ts, the vault therapist's final). Off
	    room-routes.ts linaccontrol node 6, so the walk in keeps behind the chairs. */
	jamieControl: [47.7, 10.3] as Pt,
	jamieBack: [76.3, -16.0] as Pt,
	/** The eye above the seat top when seated: standing eye 1.87 - hip 1.06 + hip to pelvis 0.06. */
	seatedEyeAboveSeat: 0.87,
	/** Jordan's average pace on the escorts' last stretch (m/s): the journey's ease peaks at 1.5
	    times it, 3.3 m/s, about the player's walk (walk.ts, 3.35). */
	escortSpeed: 2.2,
	/** After the fade (tutorial.ts walkUnderFade), Jordan stands this far short of the room the walk
	    leads into along Jordan's route, and the player this far behind Jordan (m). */
	doorLead: 2.5,
	playerBehind: 1.8
};

export const TUTORIAL_TIMING = {
	roleFadeMs: 600,
	roleCardMs: 2500,
	/** The escorts' slow fade, each way, and how long its line shows on the black. */
	walkFadeMs: 1500,
	walkCardMs: 1000,
	/** A console step's console stays open this long after the step completes, to show the result. */
	consoleCloseMs: 1500,
	/** A console step's "Correct." line stays in the hint line this long once the step completes. */
	correctMs: 5000
};

export type TargetId =
	'maya' | 'chair' | 'console' | 'jordan' | 'couch' | 'linaccontrol' | 'vault1' | 'reception';

export type TargetSpec =
	| { kind: 'actor'; actor: 'maya' | 'jordan'; stand?: Pt }
	| { kind: 'seat' }
	| { kind: 'segment'; a: Pt; b: Pt; stand: Pt }
	| { kind: 'room'; roomId: string }
	| { kind: 'escort'; final: Pt };

export interface Target {
	id: TargetId;
	/** The room the target is in (the marker route's destination room). */
	roomId: string;
	/** Where the objective is, on the marker. */
	place: string;
	/** The target in the E hint: "Walk up to {name} and press E when the prompt appears." */
	name: string;
	/** The E prompt's text (press-E steps). */
	label?: string;
	spec: TargetSpec;
}

export type Trigger = 'pressE' | 'enterRoom' | 'escortArrived';

export type StepAction =
	| 'pickChair'
	| 'sitPlayer'
	| 'intercomToControl'
	| 'jordanOnMonitors'
	| 'jordanConfirms'
	| 'escortToVault'
	| 'jordanOnCouch'
	| 'lasersOn'
	| 'jamieAcrossCouch'
	| 'jamieToControl'
	| 'holdVaultClosed'
	| 'shiftApplied'
	| 'beamOn'
	| 'betweenFields'
	| 'beamOff'
	| 'releaseVaultDoor'
	| 'jamieBackIn'
	| 'jordanOffCouch'
	| 'escortToLobby'
	| 'jordanThanks';

export interface ExchangeLine {
	who: string;
	text: string;
}

export interface DecisionOption {
	id: string;
	text: string;
	correct?: true;
}
export interface Decision {
	title: string;
	prompt: string;
	/** Rows shown above the options (a record the answer is read from). */
	context?: readonly (readonly [string, string])[];
	options: readonly DecisionOption[];
	/** After the first and the second miss. */
	hints: readonly [string, string];
	/** Shown at the third miss, with the reason. */
	reveal: string;
	/** One line: why the answer is right (also shown when it is picked). */
	reason: string;
}

/** Jordan's MRN on the LINAC console's tutorial queue. */
export const JORDAN_MRN = TUTORIAL_PATIENTS.jordan.mrn;

/** The LINAC console events that move a console step on (all but `mistake`). */
export type ConsoleProgressKind = Exclude<LinacEvent['kind'], 'mistake'>;
/** A console step's task: E at the target opens the LINAC console at `workspace`; the step is
    triggered when the console has posted the `done` events for Jordan's MRN, in this order. A
    refused action on the console (`mistake`), or another patient's chart or check-in, is a miss:
    hint 1, hint 2, then the reveal, in the tracker's hint line. */
export interface ConsoleTask {
	workspace: LinacWorkspace;
	done: readonly ConsoleProgressKind[];
	/** After the first and the second miss. */
	hints: readonly [string, string];
	/** From the third miss on: what to do (the reason says why, once the step is done). */
	reveal: string;
	/** Why the step is done this way: "Correct. <reason>" shows when it completes, as a decision's
	    reason does. */
	reason: string;
	/** The world actions as the console's beam (its pose stream, console-bus.ts linacPose) turns on
	    and off during the step. */
	beam?: { on: StepAction; off: StepAction };
}

export interface Step {
	n: number;
	role: Role;
	objective: string;
	target: Target;
	trigger: Trigger;
	/** Walking hints after 60 s and 120 s without progress. */
	hints: readonly [string, string];
	/** Opened by E (step 1); Continue triggers the step. */
	exchange?: readonly ExchangeLine[];
	/** Opened by E; Continue after the answer triggers the step. */
	decision?: Decision;
	/** E opens the LINAC console; its events trigger the step. */
	console?: ConsoleTask;
	/** After the trigger, the step completes this many seconds later. */
	afterSeconds?: number;
	onStart?: readonly StepAction[];
	onTrigger?: readonly StepAction[];
	onComplete?: readonly StepAction[];
}

export const WAIT_FOR_JORDAN = 'Wait for Jordan';
/** Step 7's line while the player is in LINAC Control and Jamie Williams is still walking out. */
export const WAIT_FOR_JAMIE = 'Waiting for Jamie Williams to join you.';
export const eHintText = (name: string): string =>
	`Walk up to ${name} and press E when the prompt appears.`;

/** World lines the actions say (tutorial.ts). */
export const LINES = {
	intercomToControl:
		'Treatment Control, Jordan Ellis is checked in for 9:00 in Vault 1 and waiting in reception.',
	controlAlert:
		'Jordan Ellis just checked in at reception. Vault 1 is ready: open today’s schedule.',
	jordanConfirms: 'Jordan Ellis, March 14, 1968. I’m ready to go back.',
	jordanChanged: 'I’ve taken off my glasses, earrings and hairpins. I’m ready to continue.',
	jamieSetup:
		'You’re in position. I’m checking the support placement, couch index, and your alignment before we take the check images.',
	jamieLeaving: 'Stay still, Jordan. We’ll talk to you over the intercom before treatment begins.',
	shiftVerified: 'Correction verified against the treatment record.',
	jordanOffCouch: 'Thank you. I’ve got my glasses and earrings back on, and I’m ready to go.',
	jordanThanks: 'That went smoothly. See you tomorrow.',
	walkToVault: 'You walk Jordan to Vault 1.',
	walkToLobby: 'You walk Jordan back to reception.'
};

const JORDAN = TUTORIAL_PATIENTS.jordan;
const CONSOLE_HINTS: readonly [string, string] = [
	'The treatment console is the long desk of screens against the wall of LINAC Control.',
	'Stand at the console desk, in front of the screens, and press E.'
];
const CONSOLE_SPEC: TargetSpec = { kind: 'segment', ...WORLD.console };
const COUCH_SPEC: TargetSpec = { kind: 'segment', ...WORLD.couch };

export const CHAPTER_1: readonly Step[] = [
	{
		n: 1,
		role: 'patient',
		objective: 'Go inside and check in at reception.',
		target: {
			id: 'maya',
			roomId: 'lobby',
			place: 'Reception',
			name: 'Maya Brooks',
			label: 'Check in with Maya Brooks',
			spec: { kind: 'actor', actor: 'maya', stand: WORLD.checkIn }
		},
		trigger: 'pressE',
		hints: [
			'Reception is just inside the main doors, on your left as you walk in.',
			'Walk through the glass doors and turn left to the front desk, where Maya Brooks stands.'
		],
		exchange: [
			{
				who: 'Maya Brooks',
				text: 'Good morning. Can I have your full name and date of birth, please?'
			},
			{
				who: 'You',
				text: 'Jordan Ellis, March 14, 1968. I’m here for my scheduled treatment.'
			},
			{
				who: 'Maya Brooks',
				text: 'Thank you, Jordan. I have you on today’s schedule in Vault 1 at 9:00. I’ll mark you arrived so the treatment team knows you’re here. Please have a seat in the waiting area.'
			}
		]
	},
	{
		n: 2,
		role: 'patient',
		objective: 'Take a seat in the waiting area.',
		target: {
			id: 'chair',
			roomId: 'lobby',
			place: 'Waiting area',
			name: 'the empty chair',
			label: 'Sit down',
			spec: { kind: 'seat' }
		},
		trigger: 'pressE',
		hints: [
			'The waiting chairs face the front desk, across the lobby from it.',
			'The marker is on an empty chair in the waiting area. Walk up to it and press E to sit down.'
		],
		afterSeconds: 6,
		onStart: ['pickChair'],
		onTrigger: ['sitPlayer', 'intercomToControl']
	},
	{
		n: 3,
		role: 'therapist',
		objective: 'Check today’s schedule.',
		target: {
			id: 'console',
			roomId: 'linaccontrol',
			place: 'Treatment console',
			name: 'the treatment console',
			label: 'Open the treatment console',
			spec: CONSOLE_SPEC
		},
		trigger: 'pressE',
		hints: CONSOLE_HINTS,
		console: {
			workspace: 'queue',
			done: ['chart-opened'],
			hints: [
				'Two entries share Jordan’s name. Check the date of birth Jordan gave at check-in.',
				`Jordan was born on ${JORDAN.born}, and is booked on ${JORDAN.vault} at ${JORDAN.time}.`
			],
			reveal: `Jordan’s entry is ${JORDAN.name} · born ${JORDAN.born} · ${JORDAN.vault} · ${JORDAN.time}. Check it in, then open its chart.`,
			reason:
				'A full name and date of birth together identify the patient, and the booking has to be on the machine where the plan is loaded.'
		},
		onTrigger: ['jordanOnMonitors']
	},
	{
		n: 4,
		role: 'therapist',
		objective: 'Go to reception and call Jordan.',
		target: {
			id: 'jordan',
			roomId: 'lobby',
			place: 'Waiting area',
			name: 'Jordan',
			label: 'Call Jordan',
			spec: { kind: 'actor', actor: 'jordan' }
		},
		trigger: 'pressE',
		hints: [
			'Follow the MAIN LOBBY signs back to reception. Jordan is in the waiting area.',
			'Jordan is sitting in the chair you used. Walk up to Jordan and press E.'
		],
		decision: {
			title: 'Confirm the patient',
			prompt:
				'Before you take Jordan back, you confirm you have the right patient. Which two things confirm Jordan’s identity?',
			options: [
				{ id: 'a', text: 'Full name and the chair Jordan is sitting in' },
				{ id: 'b', text: 'Date of birth and today’s appointment time' },
				{ id: 'c', text: 'Full name and date of birth', correct: true },
				{ id: 'd', text: 'A yes when you ask, “Are you Jordan Ellis?”' }
			],
			hints: [
				'An identifier belongs to the patient, not to where they sit or when they are booked.',
				'Ask Jordan to tell you the same two things you matched on the schedule.'
			],
			reveal: 'Full name and date of birth.',
			reason:
				'Two identifiers that Jordan states, matched to the record, confirm the right patient; a seat, a time or a yes to a leading question can be wrong.'
		},
		onTrigger: ['jordanConfirms']
	},
	{
		n: 5,
		role: 'therapist',
		objective: 'Walk Jordan to Vault 1.',
		target: {
			id: 'vault1',
			roomId: 'vault1',
			place: 'Vault 1',
			name: 'Vault 1',
			spec: { kind: 'escort', final: WORLD.couchSide }
		},
		trigger: 'escortArrived',
		hints: [
			'Jordan waits at each door and corner until you are within 5 m. Stay close.',
			'Follow Jordan through the Vault 1 door and the maze to the changing area, then the couch.'
		],
		onStart: ['escortToVault']
	},
	{
		n: 6,
		role: 'therapist',
		objective: 'Set Jordan up on the treatment couch.',
		target: {
			id: 'couch',
			roomId: 'vault1',
			place: 'Treatment couch',
			name: 'the treatment couch',
			label: 'Open Patient Setup',
			spec: COUCH_SPEC
		},
		trigger: 'pressE',
		hints: [
			'The couch is in the middle of Vault 1, under the treatment machine.',
			'Stand beside the couch, next to Jordan, and press E.'
		],
		console: {
			workspace: 'setup',
			done: ['setup-complete'],
			hints: [
				'Compare each part with the setup order: the devices, position, indexing and preparation.',
				'The setup order calls for the short head mask and the headrest, head first and supine.'
			],
			reveal:
				'Place the short head mask and the headrest, confirm position, indexing and preparation, then verify the setup.',
			reason:
				'Each day’s setup reproduces the headrest, the mask and the indexing documented at CT simulation, so Jordan’s head lies where the plan expects.'
		},
		onTrigger: ['jordanOnCouch', 'lasersOn', 'jamieAcrossCouch']
	},
	{
		n: 7,
		role: 'therapist',
		objective: 'Leave the vault before treatment.',
		target: {
			id: 'linaccontrol',
			roomId: 'linaccontrol',
			place: 'LINAC Control',
			name: 'LINAC Control',
			spec: { kind: 'room', roomId: 'linaccontrol' }
		},
		trigger: 'enterRoom',
		hints: [
			'Jordan stays alone in the vault during treatment. Walk back out through the maze to LINAC Control.',
			'Follow the walkway back to the main corridor; LINAC Control’s door is by the TREATMENT AREA sign.'
		],
		onStart: ['jamieToControl'],
		onComplete: ['holdVaultClosed']
	},
	{
		n: 8,
		role: 'therapist',
		objective: 'Take the check images.',
		target: {
			id: 'console',
			roomId: 'linaccontrol',
			place: 'Treatment console',
			name: 'the treatment console',
			label: 'Open the treatment console',
			spec: CONSOLE_SPEC
		},
		trigger: 'pressE',
		hints: CONSOLE_HINTS,
		console: {
			workspace: 'igrt',
			done: ['shift-applied', 'alignment-verified'],
			hints: [
				'The images find this kind of difference before the beam is on. Press New Daily Setup and MV / EPID, then Acquire Images.',
				`Today’s images show Jordan ${TUTORIAL_SHIFT_MM} mm off the plan. Press Motion Enable, then the couch keys, until the residuals are in tolerance.`
			],
			reveal:
				'Press Motion Enable, apply the correction with the couch keys or by holding Move to field, then press Verify Alignment.',
			reason:
				'Image guidance checks that Jordan is in the planned treatment position before radiation is delivered; a measured shift is corrected, then verified.'
		},
		onTrigger: ['shiftApplied']
	},
	{
		n: 9,
		role: 'therapist',
		objective: 'Deliver today’s treatment.',
		target: {
			id: 'console',
			roomId: 'linaccontrol',
			place: 'Treatment console',
			name: 'the treatment console',
			label: 'Open the treatment console',
			spec: CONSOLE_SPEC
		},
		trigger: 'pressE',
		hints: CONSOLE_HINTS,
		// no timed beam or countdown any more (it was afterSeconds 10, "Beam on · {s} s"): the
		// console's own delivery runs the beam, field by field, and the boards follow it
		console: {
			workspace: 'delivery',
			done: ['treatment-complete'],
			hints: [
				'The beam waits until every interlock on the checklist is green. Read the one that is not.',
				'Each field needs Move to field, then Enable Beam and Beam On. Deliver the right lateral field, then the left lateral field.'
			],
			reveal:
				'Hold Move to field until the checklist is all green, then press Enable Beam and Beam On: the right lateral field first, then the left lateral field.',
			reason:
				'The beam came on only once the room, the setup and the images were verified, and both lateral fields were delivered as planned.',
			beam: { on: 'beamOn', off: 'betweenFields' }
		},
		onComplete: ['beamOff']
	},
	{
		n: 10,
		role: 'therapist',
		objective: 'Go back in and help Jordan off the couch.',
		target: {
			id: 'couch',
			roomId: 'vault1',
			place: 'Vault 1',
			name: 'Jordan',
			label: 'Help Jordan off the couch',
			spec: COUCH_SPEC
		},
		trigger: 'pressE',
		hints: [
			'The vault door opens as you walk up to it. Jordan is still on the couch.',
			'Walk back down the walkway into Vault 1, stand beside the couch and press E.'
		],
		onStart: ['releaseVaultDoor', 'jamieBackIn'],
		onTrigger: ['jordanOffCouch']
	},
	{
		n: 11,
		role: 'therapist',
		objective: 'Walk Jordan back to reception.',
		target: {
			id: 'reception',
			roomId: 'lobby',
			place: 'Reception',
			name: 'reception',
			spec: { kind: 'escort', final: WORLD.lobbyDesk }
		},
		trigger: 'escortArrived',
		hints: [
			'Jordan waits at each door and corner until you are within 5 m. Stay close.',
			'Follow Jordan into the lobby to the front desk, where Maya Brooks stands.'
		],
		onStart: ['escortToLobby'],
		onComplete: ['jordanThanks']
	}
];
