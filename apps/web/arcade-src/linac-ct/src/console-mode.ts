/* LINAC console mode (`?view=console`, docs/specs/2026-11-18-consoles-in-center-design.md part 3):
   the app runs in an iframe in the center's console panel and drives the center's Vault 1. It
   boots straight to the control console with no vault view (main.ts skips the render, cctv.ts the
   camera feeds, index.html's #rtappsConsoleView styles lay the screens out for the panel), and it
   talks to the center only through postMessage (contract: shared/console-protocol.ts; rules:
   console-messages.ts). Out: rtapps-linac-ready once the shell has settled, rtapps-linac-state when
   the pose, workspace or open chart changes (at most 30 a
   second), and rtapps-linac-event for each step the workflow reports through console-hooks.ts,
   with every refused action as a `mistake` that is also shown in the console's refusal bar (a
   notice, such as to keep holding Move to field, shows there too but is not posted). In:
   rtapps-linac-open switches workspace the way the chart's own buttons do (with no chart open yet
   it stays on the queue);
   rtapps-linac-room sets the vault door the door interlock reads; rtapps-linac-panel with open
   false (the panel closed: the therapist has left the console) holds a delivering field and stops
   the machine keys. The Machine keys' hold-to-repeat and Move to field are console-keys.ts's.
   In the tutorial scenario the body also carries the Tutorial's focus classes (tutorial-focus.ts),
   kept in step with the screen shown. Started by main.ts once the app has booted. */
import type {
	LinacPose,
	LinacToCenterMessage,
	LinacWorkspace
} from '../../shared/console-protocol';
import { S } from './state';
import {
	beamRefusal,
	clearsRefusal,
	workspaceClearsRefusal,
	correctionApplied,
	fromCenter,
	parseCenterMessage,
	poseFromReadout,
	samePose,
	statePostDue,
	type SixAxis
} from './console-messages';
import {
	CONSOLE,
	consoleEvent,
	consoleMistake,
	consoleRoom,
	setConsoleSink
} from './console-hooks';
import { consoleShell, shellSettled } from './console-patch';
import { installConsoleKeys, releaseConsoleKeys, syncMoveKey } from './console-keys';
import { TREATMENT_CASES } from './delivery/cases';
import { holdTreatmentDelivery, renderTreatmentDeliveryPanel } from './delivery/treatment-delivery';
import { parseFirstNumber, parseJawSpec } from './delivery/plan';
import { updateMLCPositions } from './scene';
import { activeIGRTTolerances } from './delivery/stereotactic';
import { getIGRTApplied, getIGRTResidual } from './linac-igrt';
import {
	fundamentalState,
	getDeliveryReadiness,
	setCenteredJawField,
	syncFundamentalReadouts
} from './linac-safety';
import { syncRoomViewButtons } from './travel';
import { syncOperatorConsole } from './main';
import { focusClass, tutorialFocus, type TutorialFocus } from './tutorial-focus';

const STATE_TICK_MS = 17; // the pose is checked this often; statePostDue spaces the posts
const REFUSAL_SHOW_MS = 6000;
const NOTICE_SHOW_MS = 3000;

/** The workflow panels and the workspace each one is; the advanced workflow panels keep the last. */
const PANEL_WORKSPACES: [string, LinacWorkspace][] = [
	['immobilizationPanel', 'setup'],
	['igrtPanel', 'igrt'],
	['deliveryPanel', 'delivery'],
	['chargeCapturePanel', 'delivery'],
	['oisPanel', 'delivery']
];

let lastWorkflow: LinacWorkspace = 'setup';
let settled = false;
let shownWorkspace: LinacWorkspace = 'queue';
let refusalAt = 0;
let pendingOpen: LinacWorkspace | null = null;
let posted: { pose: LinacPose; mrn: string | null; workspace: LinacWorkspace } | null = null;
let postedAt: number | null = null;

function post(msg: LinacToCenterMessage) {
	window.parent.postMessage(msg, location.origin);
}

/** The open chart's MRN; null when no chart has been opened. */
function openChartMrn(): string | null {
	const value = consoleShell.openCase();
	return value == null ? null : (TREATMENT_CASES[Number(value)]?.mrn ?? null);
}

/** Which workspace the console shows: the queue, the open workflow panel, or (on the chart's own
    review and machine views) the last workflow panel shown since the chart opened. */
function currentWorkspace(): LinacWorkspace {
	if (document.body.classList.contains('rtv2-landing')) return 'queue';
	for (const [id, ws] of PANEL_WORKSPACES)
		if (document.getElementById(id)?.classList.contains('open')) return (lastWorkflow = ws);
	return lastWorkflow;
}

function currentPose(): LinacPose {
	return poseFromReadout({
		...fundamentalState,
		kvOn: S.kvOn,
		detectorExtended: S.detectorExtended,
		beamOn: S.beamOn,
		lasersOn: S.lasersOn
	});
}

/* ----- the refusal bar: every mistake shows at the top of the console for a few seconds, or until
   the learner's next action succeeds (a workflow event, or a machine move the interlocks let
   through) or the workspace changes; a notice shows there the same way, in amber and for less
   time ----- */
let refusalBar: HTMLElement | null = null;
let refusalTimer = 0;
function hideRefusal() {
	clearTimeout(refusalTimer);
	refusalBar?.classList.remove('show');
}
function showRefusal(message: string, notice = false) {
	shownWorkspace = currentWorkspace();
	refusalAt = performance.now();
	if (!refusalBar) {
		refusalBar = document.createElement('div');
		refusalBar.id = 'consoleRefusal';
		document.body.appendChild(refusalBar);
	}
	refusalBar.setAttribute('role', notice ? 'status' : 'alert');
	refusalBar.classList.toggle('notice', notice);
	refusalBar.textContent = message;
	refusalBar.classList.add('show');
	clearTimeout(refusalTimer);
	refusalTimer = window.setTimeout(
		() => refusalBar?.classList.remove('show'),
		notice ? NOTICE_SHOW_MS : REFUSAL_SHOW_MS
	);
}

/* ----- the couch correction: shift-applied once the residual is inside tolerance ----- */
let shiftWatch: { correction: unknown; start: SixAxis; done: boolean } | null = null;
function watchShift() {
	const igrt = S.clinicalIGRT;
	if (!igrt.active || !igrt.acquired || !igrt.correction) return;
	// each New Daily Setup brings a new correction; the watch starts from the couch at acquisition
	if (!shiftWatch || shiftWatch.correction !== igrt.correction)
		shiftWatch = { correction: igrt.correction, start: getIGRTApplied(), done: false };
	if (shiftWatch.done) return;
	const now = getIGRTApplied(),
		moved = (Object.keys(now) as (keyof SixAxis)[]).some((k) => now[k] !== shiftWatch.start[k]);
	if (moved && correctionApplied(getIGRTResidual(), activeIGRTTolerances(), igrt.mode)) {
		shiftWatch.done = true;
		consoleEvent({ kind: 'shift-applied', mrn: S.activeTreatmentCase?.mrn ?? '' });
	}
}

/* ----- the Tutorial's focused console: one body class for the screen shown (tutorial-focus.ts) ----- */
let focus: TutorialFocus | null = null;
function syncTutorialFocus() {
	const next = tutorialFocus(
		document.body.classList.contains('rtv2-landing'),
		(id) => !!document.getElementById(id)?.classList.contains('open')
	);
	if (next !== focus) {
		if (focus) document.body.classList.remove(focusClass(focus));
		document.body.classList.add(focusClass(next));
		focus = next;
	}
	// the delivery focus keeps the chart's Beam Hold, not the delivery window's own: it says Resume
	// Beam while a field is held, as the window's does
	const hold = document.getElementById('rtv2BeamHold'),
		label = document.getElementById('deliveryHold')?.textContent?.trim().toUpperCase();
	if (hold && label && hold.textContent !== label) hold.textContent = label;
}

function tick() {
	if (CONSOLE.scenario === 'tutorial') syncTutorialFocus();
	watchShift();
	syncMoveKey();
	const pose = currentPose(),
		workspace = currentWorkspace(),
		mrn = workspace === 'queue' ? null : openChartMrn();
	if (workspaceClearsRefusal(shownWorkspace, workspace, performance.now() - refusalAt))
		hideRefusal();
	shownWorkspace = workspace;
	if (posted && samePose(posted.pose, pose) && posted.mrn === mrn && posted.workspace === workspace)
		return;
	const now = performance.now();
	if (!statePostDue(now, postedAt)) return; // the change goes out on a later tick
	posted = { pose, mrn, workspace };
	postedAt = now;
	post({ type: 'rtapps-linac-state', pose, mrn, workspace });
}

/* ----- center → console ----- */
function openWorkspace(workspace: LinacWorkspace) {
	if (workspace === 'queue') {
		consoleShell.showHome();
		return;
	}
	// asked before any chart is open (the panel may forward its workspace on ready): stay on the
	// queue. Only the learner's own actions post mistakes.
	if (!openChartMrn()) return;
	if (document.body.classList.contains('rtv2-landing')) consoleShell.showChart();
	// the chart's workflow buttons share the workspaces' names (console-patch.ts launchWorkflow)
	consoleShell.launchWorkflow(workspace);
}

/** The door interlock and the console's door readouts follow the center's vault door. A door
    opening while a field is delivering holds the beam at once, as the delivery loop's own check
    would on its next frame, which never comes while a hidden panel's frames are paused. */
function applyRoom(doorClosed: boolean, staffInVault: boolean) {
	consoleRoom.doorClosed = doorClosed;
	consoleRoom.staffInVault = staffInVault;
	S.vaultDoorTarget = S.vaultDoorProgress = doorClosed ? 0 : 1;
	const d = S.treatmentDelivery;
	if (!doorClosed && d.delivering && !d.held) holdTreatmentDelivery('Vault door closed');
	syncOperatorConsole();
	renderTreatmentDeliveryPanel();
	if (settled) tick();
}

/** The panel hid the console: the therapist has left it. A hidden page gets no animation frames,
    so the delivery loop and any motion would stop where they are with the beam still shown on: a
    delivering field holds at once, as for the door, a held key or Move to field stops, and the
    state goes out with the beam off. Showing the console again resumes nothing: the learner
    presses Resume Beam. */
function leaveConsole() {
	const d = S.treatmentDelivery;
	if (d.delivering && !d.held) holdTreatmentDelivery('Console left');
	releaseConsoleKeys();
	if (settled) tick();
}

function onMessage(ev: MessageEvent) {
	if (!fromCenter(ev.source, ev.origin, window.parent, location.origin)) return;
	const msg = parseCenterMessage(ev.data);
	if (!msg) return;
	if (msg.type === 'rtapps-linac-room') applyRoom(msg.doorClosed, msg.staffInVault);
	else if (msg.type === 'rtapps-linac-panel') {
		if (!msg.open) leaveConsole();
	} else if (settled) openWorkspace(msg.workspace);
	else pendingOpen = msg.workspace;
}

/** The chart's Enable Beam and Beam On buttons (console-patch.ts builds them on load) stay
    pressable while the delivery panel's own are disabled, so a press there that the interlocks
    refuse is the learner's refused action. Heard before the chart's own handler runs. */
function onBeamPress(ev: MouseEvent) {
	const button = (ev.target as Element | null)?.closest?.('#rtv2EnableBeam, #rtv2BeamOn');
	if (!button) return;
	const r = getDeliveryReadiness(),
		d = S.treatmentDelivery,
		refusal = beamRefusal(button.id === 'rtv2BeamOn' ? 'on' : 'enable', {
			armed: d.armed,
			delivering: d.delivering,
			completed: d.completed,
			ready: r.ready,
			checks: r.checks
		});
	if (refusal) consoleMistake(refusal.code, refusal.message);
}

export function startConsoleMode() {
	document.body.classList.add('linac-console-view');
	// the console desk, straight away: no walk through the maze, the door closed
	S.currentRoomView = 'control';
	syncRoomViewButtons('control');
	if (CONSOLE.scenario === 'tutorial') {
		// the jaws and MLC start at Jordan's field apertures (both lateral fields: 18 × 18 cm, a 16 cm
		// conformal MLC), as the record-and-verify system sets them, since the Tutorial's delivery
		// step has no aperture keys; a setting saved by an earlier session must not hold them
		const g = S.activeTreatmentCase.fields[0].geometry,
			jaws = parseJawSpec(g.jaws);
		setCenteredJawField(jaws.x1 + jaws.x2, jaws.y1 + jaws.y2);
		fundamentalState.mlc = parseFirstNumber(g.mlcAperture);
		fundamentalState.mlcShape = g.mlcShape;
		updateMLCPositions();
		syncFundamentalReadouts();
		document.body.classList.add('linac-tutorial-focus');
	}
	setConsoleSink({
		event: (event) => {
			if (clearsRefusal(event.kind)) hideRefusal();
			post({ type: 'rtapps-linac-event', event });
		},
		mistake: (code, message) => {
			showRefusal(message);
			post({
				type: 'rtapps-linac-event',
				event: { kind: 'mistake', workspace: currentWorkspace(), code, message }
			});
		},
		notice: (message) => showRefusal(message, true),
		// a refused couch key's "Collision blocked" must not stay up while the opposite key moves the
		// couch back: that reads as the way back being blocked too
		moved: hideRefusal
	});
	// the image-guidance steps name the console's keys, not the in-room pendant (linac-igrt.ts too)
	const igrtSteps = document.querySelector('#igrtPanel .igrt-head p');
	if (igrtSteps)
		igrtSteps.textContent =
			'Acquire → review correction → drive the couch from the console keys → verify residual.';
	applyRoom(consoleRoom.doorClosed, consoleRoom.staffInVault);
	window.addEventListener('message', onMessage);
	document.addEventListener('click', onBeamPress, true);
	// a shift applied just before Verify Alignment is reported before the verification
	document.getElementById('igrtVerify')?.addEventListener('click', watchShift, true);
	consoleShell.onChartOpened(() => (lastWorkflow = 'setup'));
	shellSettled.then(() => {
		settled = true;
		installConsoleKeys();
		post({ type: 'rtapps-linac-ready', scenario: CONSOLE.scenario });
		tick();
		setInterval(tick, STATE_TICK_MS);
		if (pendingOpen) openWorkspace(pendingOpen);
		pendingOpen = null;
	});
}
