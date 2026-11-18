/* LINAC console mode (`?view=console`, docs/specs/2026-11-18-consoles-in-center-design.md part 3):
   the app runs in an iframe in the center's console panel and drives the center's Vault 1. It
   boots straight to the control console with no vault view (main.ts skips the render, cctv.ts the
   camera feeds, index.html's #rtappsConsoleView styles lay the screens out for the panel), and it
   talks to the center only through postMessage (contract: shared/console-protocol.ts; rules:
   console-messages.ts). Out: rtapps-linac-ready once the shell has settled, rtapps-linac-state when
   the pose, workspace or open chart changes (at most 30 a second), and rtapps-linac-event for
   each step the workflow reports through console-hooks.ts, with every refused action as a
   `mistake` that is also shown in the console's refusal bar. In: rtapps-linac-open switches
   workspace the way the chart's own buttons do; rtapps-linac-room sets the vault door the door
   interlock reads. The Machine keys' hold-to-repeat and Move to field are console-keys.ts's.
   Started by main.ts once the app has booted. */
import type {
	LinacPose,
	LinacToCenterMessage,
	LinacWorkspace
} from '../../shared/console-protocol';
import { S } from './state';
import {
	beamRefusal,
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
import { installConsoleKeys } from './console-keys';
import { TREATMENT_CASES } from './delivery/cases';
import { renderTreatmentDeliveryPanel } from './delivery/treatment-delivery';
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

const STATE_TICK_MS = 17; // the pose is checked this often; statePostDue spaces the posts
const REFUSAL_SHOW_MS = 6000;

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

/* ----- the refusal bar: every mistake shows at the top of the console for a few seconds ----- */
let refusalBar: HTMLElement | null = null;
let refusalTimer = 0;
function showRefusal(message: string) {
	if (!refusalBar) {
		refusalBar = document.createElement('div');
		refusalBar.id = 'consoleRefusal';
		refusalBar.setAttribute('role', 'alert');
		document.body.appendChild(refusalBar);
	}
	refusalBar.textContent = message;
	refusalBar.classList.add('show');
	clearTimeout(refusalTimer);
	refusalTimer = window.setTimeout(() => refusalBar?.classList.remove('show'), REFUSAL_SHOW_MS);
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

function tick() {
	watchShift();
	const pose = currentPose(),
		workspace = currentWorkspace(),
		mrn = workspace === 'queue' ? null : openChartMrn();
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
	if (!openChartMrn()) {
		consoleMistake('no-chart-open', 'Open a patient chart from the queue first.');
		return;
	}
	if (document.body.classList.contains('rtv2-landing')) consoleShell.showChart();
	// the chart's workflow buttons share the workspaces' names (console-patch.ts launchWorkflow)
	consoleShell.launchWorkflow(workspace);
}

/** The door interlock and the console's door readouts follow the center's vault door. */
function applyRoom(doorClosed: boolean, staffInVault: boolean) {
	consoleRoom.doorClosed = doorClosed;
	consoleRoom.staffInVault = staffInVault;
	S.vaultDoorTarget = S.vaultDoorProgress = doorClosed ? 0 : 1;
	syncOperatorConsole();
	renderTreatmentDeliveryPanel();
}

function onMessage(ev: MessageEvent) {
	if (!fromCenter(ev.source, ev.origin, window.parent, location.origin)) return;
	const msg = parseCenterMessage(ev.data);
	if (!msg) return;
	if (msg.type === 'rtapps-linac-room') applyRoom(msg.doorClosed, msg.staffInVault);
	else if (settled) openWorkspace(msg.workspace);
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
		// Jordan's plan is a 10 × 10 field; a jaw setting saved by an earlier session must not hold it
		setCenteredJawField(10, 10);
		syncFundamentalReadouts();
	}
	setConsoleSink({
		event: (event) => post({ type: 'rtapps-linac-event', event }),
		mistake: (code, message) => {
			showRefusal(message);
			post({
				type: 'rtapps-linac-event',
				event: { kind: 'mistake', workspace: currentWorkspace(), code, message }
			});
		}
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
