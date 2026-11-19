/* The console panel (docs/specs/2026-11-18-consoles-in-center-design.md, part 5). E at the LINAC
   Control console desk opens the LINAC console, E at the CT Control console desk the CT console
   (equipment.ts), each in an iframe in a large panel over the center (#consolePanel, index.html).
   The center keeps running behind it: main.ts keeps stepping the simulation, but the keys, E and
   mouse look go to the panel while it is open, and the pointer lock is released.
   - Each console's iframe loads on its first open and stays alive while the player is in the
     center: closing hides it, reopening shows it where it was; another scenario reloads it.
   - Messages from a console are taken only from its iframe's window and the center's own origin,
     checked against the contract (console-panel-messages.ts) and emitted on console-bus.ts; after
     a load only its ready passes until it comes (from the scenario asked for). The center answers
     the LINAC console's ready with the workspace to show (rtapps-linac-open) and sends the Vault 1
     door and whether the player is inside (rtapps-linac-room) on ready, on open and whenever they
     change. A finished CT scan in the free scenario records 'sim-ct-scan'.
   - Opening closes the other pop-ups (the equipment card, a conversation, the room card…), so none
     sits over the panel or takes its Esc; the settings and the Tutorial's cards stay.
   - The camera slots in the panel are holes: while it is open, main.ts calls renderConsoleFeeds
     after the frame, which draws each feed camera straight onto the main canvas at its slot's
     rectangle (scissor and viewport), with no render targets or pixel copies. The LINAC panel shows
     three of Vault 1's CCTV cameras (equipment.ts vaultFeedCamera), the CT panel the CT room's
     'CT Table Wide' camera (ctFeedCamera): the control desks' own feed cameras.
   The Tutorial uses openConsole, closeConsole and isConsoleOpen; with ?npccheck they are on
   window.__NPC too, with the messages seen and sent and the console-bus channels. */
import * as THREE from 'three';
import type {
	CenterToLinacMessage,
	ConsoleKind,
	ConsoleScenario,
	LinacRoomMsg,
	LinacWorkspace
} from '../../shared/console-protocol';
import { ctComplete, ctPose, linacEvents, linacPose, panelOpen } from './console-bus';
import {
	consoleUrl,
	gateMessage,
	linacRoom,
	messageFrom,
	readCtMessage,
	readLinacMessage,
	recordsCtScan,
	sameRoom
} from './console-panel-messages';
import { S } from './state';
import { camera, canvas, renderer, scene } from './scene';
import { doors, keys, player } from './main';
import { roomContainingWalkPoint } from './walk';
import { applyVisibility } from './visibility';
import { ctFeedCamera, vaultFeedCamera } from './equipment';
import { closeDialogsExcept, closeOpenDialog, registerDialog } from './dialogs';
import { onPlayModeChange } from './play-mode';

const TITLES: Record<ConsoleKind, string> = {
	linac: 'LINAC Treatment Console',
	ct: 'CT Simulation Console'
};
const FRAME_TITLES: Record<ConsoleKind, string> = {
	linac: 'LINAC treatment console',
	ct: 'CT simulation console'
};
const KEPT = 60; // messages kept for the check hook
// the dialogs an opening panel leaves open: the settings, the Tutorial's cards and the panel itself
const STAY_OPEN = ['settings', 'tutorial', 'console'];

interface ConsoleFrame {
	el: HTMLIFrameElement;
	scenario: ConsoleScenario;
	/** the page has loaded (its load event) */
	loaded: boolean;
	/** the console said it is ready (rtapps-linac-ready / rtapps-ct-ready) */
	ready: boolean;
	/** LINAC: the workspace sent with rtapps-linac-open when the console is ready */
	workspace: LinacWorkspace;
	/** LINAC: the vault state last sent */
	room: LinacRoomMsg | null;
	/** CT: the scan keys recorded as 'sim-ct-scan' by this page load */
	recorded: Set<string>;
}
const frames: Partial<Record<ConsoleKind, ConsoleFrame>> = {};
let shown: ConsoleKind | null = null;
const seen: { kind: ConsoleKind; message: unknown }[] = [],
	sent: CenterToLinacMessage[] = [];
let ignored = 0;

const panel = document.getElementById('consolePanel'),
	titleEl = document.getElementById('cpTitle'),
	host = document.getElementById('cpFrames');

export function isConsoleOpen(): boolean {
	return shown !== null;
}

/** Opens a console in the panel: free scenario unless `scenario` says, at `workspace` (LINAC) when
    given, else where it was (the queue on a first open). `fresh` reloads its page first, so it
    starts as on a first open (the Tutorial, at each start of its chapter). */
export function openConsole(
	kind: ConsoleKind,
	opts: { workspace?: LinacWorkspace; scenario?: ConsoleScenario; fresh?: boolean } = {}
): void {
	const scenario = opts.scenario ?? 'free';
	let f = frames[kind];
	if (!f || f.scenario !== scenario || opts.fresh) f = loadFrame(kind, scenario);
	if (kind === 'linac' && opts.workspace) {
		f.workspace = opts.workspace;
		if (f.ready) post({ type: 'rtapps-linac-open', workspace: opts.workspace });
	}
	if (shown === kind) return;
	if (shown) closeConsole();
	closeDialogsExcept(STAY_OPEN);
	shown = kind;
	if (panel) panel.dataset.kind = kind;
	if (titleEl) titleEl.textContent = TITLES[kind];
	for (const [k, fr] of Object.entries(frames)) fr.el.hidden = k !== kind;
	showLoading();
	// shown before the lock goes, so losing it opens no settings menu (menu.ts)
	panel?.classList.add('show');
	document.body.classList.add('consoleOpen');
	releaseKeys();
	if (document.pointerLockElement) document.exitPointerLock();
	panelOpen.emit(kind);
	if (kind === 'linac') sendRoom(true);
}

/** Hides the panel; the console stays loaded, as it was. A click on × hands the mouse back to
    looking around (hub-dialogs.ts); after Esc the next key press or click does (main.ts). */
export function closeConsole(): void {
	if (!shown) return;
	const f = frames[shown];
	shown = null;
	panel?.classList.remove('show');
	document.body.classList.remove('consoleOpen');
	releaseKeys();
	// the keyboard back to the center from the console page, if it had it (no focus() in the Node
	// checks' stubbed window)
	f?.el.blur();
	window.focus?.();
	panelOpen.emit(null);
}

// A key held as the panel opens or closes gets its keyup in the other page: none stays down.
function releaseKeys(): void {
	for (const k of Object.keys(keys)) keys[k] = false;
}

function loadFrame(kind: ConsoleKind, scenario: ConsoleScenario): ConsoleFrame {
	let f = frames[kind];
	const src = consoleUrl(kind, scenario, location.href);
	if (!f) {
		const el = document.createElement('iframe');
		el.className = 'cpFrame';
		el.title = FRAME_TITLES[kind];
		el.addEventListener('load', () => frameLoaded(kind));
		el.src = src; // before it joins the page, so the only load is the console's
		f = frames[kind] = {
			el,
			scenario,
			loaded: false,
			ready: false,
			workspace: 'queue',
			room: null,
			recorded: new Set()
		};
		host?.appendChild(el);
		return f;
	}
	Object.assign(f, {
		scenario,
		loaded: false,
		ready: false,
		workspace: 'queue',
		room: null,
		recorded: new Set()
	});
	f.el.src = src;
	showLoading();
	return f;
}

function frameLoaded(kind: ConsoleKind): void {
	const f = frames[kind];
	f.loaded = true;
	showLoading();
	// Esc in the console page closes the panel, as Esc over the center does (menu.ts)
	try {
		f.el.contentWindow?.addEventListener('keydown', onConsoleKey);
	} catch {
		// not the center's origin (an error page): Esc over the center still closes the panel
	}
}
function onConsoleKey(e: KeyboardEvent): void {
	if (e.key === 'Escape' && !e.repeat && shown) closeOpenDialog();
}

// "Starting the console…" shows until the open console's page has loaded
function showLoading(): void {
	panel?.classList.toggle('loading', !!shown && !frames[shown]?.loaded);
}

function post(msg: CenterToLinacMessage): void {
	const w = frames.linac?.el.contentWindow;
	if (!w) return;
	w.postMessage(msg, location.origin);
	sent.push(msg);
	if (sent.length > KEPT) sent.shift();
}

function onMessage(e: MessageEvent): void {
	const kind = messageFrom(
		e.source,
		e.origin,
		{ linac: frames.linac?.el.contentWindow, ct: frames.ct?.el.contentWindow },
		location.origin
	);
	const looksLikeConsole =
		typeof e.data?.type === 'string' && /^rtapps-(linac|ct)-/.test(e.data.type);
	const m = kind === 'linac' ? readLinacMessage(e.data) : kind ? readCtMessage(e.data) : null,
		f = kind ? frames[kind] : null,
		gate = m ? gateMessage(m, f.ready, f.scenario) : 'drop';
	if (gate === 'drop') {
		if (looksLikeConsole) ignored++;
		return;
	}
	if (gate === 'ready') f.ready = true;
	seen.push({ kind, message: m });
	if (seen.length > KEPT) seen.shift();
	switch (m.type) {
		case 'rtapps-linac-ready':
			post({ type: 'rtapps-linac-open', workspace: f.workspace });
			sendRoom(true);
			return;
		case 'rtapps-linac-state':
			linacPose.emit(m.pose);
			return;
		case 'rtapps-linac-event':
			linacEvents.emit(m.event);
			return;
		case 'rtapps-ct-ready':
			return;
		case 'rtapps-ct-state':
			ctPose.emit(m.pose);
			return;
		case 'rtapps-ct-complete':
			ctComplete.emit(m);
			if (recordsCtScan(f.scenario, m.key, f.recorded)) {
				f.recorded.add(m.key);
				// RTApps: one completion per finished CT scan, as the LINAC/CT app recorded it
				if (window.RTApps) window.RTApps.recordResult('sim-ct-scan').catch(function () {});
			}
	}
}

/* ---- the vault as the LINAC console's door interlock sees it ---- */
// the room the player walks in (the therapists standing in Vault 1 in Free Mode do not count)
const playerRoom = () =>
	S.mode === 'walk' ? (roomContainingWalkPoint(player.pos.x, player.pos.z)?.id ?? null) : null;
function sendRoom(force = false): void {
	const f = frames.linac;
	if (!f?.ready) return;
	const room = linacRoom(doors.get('vault1')?.progress ?? 0, playerRoom());
	if (!force && sameRoom(f.room, room)) return;
	f.room = room;
	post(room);
}
/** A few times a second (main.ts stepSimulation): tells the LINAC console when the vault changes. */
export function updateConsoleRoom(): void {
	sendRoom();
}

/* ---- the camera slots ---- */
const feedCamera = (kind: ConsoleKind, name: string) =>
	kind === 'ct' ? ctFeedCamera(name) : vaultFeedCamera(name);

// m, past the far corner of Vault 1 (30 x 26 m) or the CT room. The room culling (visibility.ts)
// cannot see the vault maze's walls, so a feed facing the vault door would otherwise draw the
// hallway and the rooms beyond it: about 1,500 draw calls a frame instead of about 250.
const FEED_FAR = 30;
let slots: { kind: ConsoleKind; name: string; el: HTMLElement }[] | null = null;
// each feed is drawn through this copy, made on first use: an Object3D draws Math.random for its
// uuid, and the NPC check seeds Math.random
let view: THREE.PerspectiveCamera | null = null;
const size = new THREE.Vector2();
/** While the panel is open, after the frame (main.ts): each feed camera drawn into its slot. */
export function renderConsoleFeeds(): void {
	if (!shown) return;
	slots ??= [...document.querySelectorAll<HTMLElement>('#consolePanel .cpSlot')].map((el) => ({
		kind: el.dataset.kind as ConsoleKind,
		name: el.dataset.feed ?? '',
		el
	}));
	view ??= new THREE.PerspectiveCamera();
	const c = canvas.getBoundingClientRect();
	renderer.setScissorTest(true);
	for (const s of slots) {
		if (s.kind !== shown) continue;
		const cam = feedCamera(s.kind, s.name),
			r = s.el.getBoundingClientRect();
		if (!cam || r.width < 1 || r.height < 1) continue;
		// a copy, so the slot's shape never changes the desk monitor's camera
		view.copy(cam, false);
		view.far = Math.min(view.far, FEED_FAR);
		view.aspect = r.width / r.height;
		view.updateProjectionMatrix();
		applyVisibility(view);
		const x = r.left - c.left,
			y = c.bottom - r.bottom;
		renderer.setViewport(x, y, r.width, r.height);
		renderer.setScissor(x, y, r.width, r.height);
		renderer.render(scene, view);
	}
	renderer.setScissorTest(false);
	renderer.getSize(size);
	renderer.setViewport(0, 0, size.x, size.y);
	applyVisibility(camera); // the rooms shown as the main view sees them again
}

/** Boot (main.ts, after the tutorial, whose cards close before the panel under them on Esc). */
export function initConsolePanel(): void {
	registerDialog('console', isConsoleOpen, closeConsole);
	document.getElementById('cpClose')?.addEventListener('click', closeConsole);
	addEventListener('message', onMessage);
	onPlayModeChange(() => closeConsole());
	const hook = (window as unknown as { __NPC?: object }).__NPC;
	if (hook)
		Object.assign(hook, {
			openConsole,
			closeConsole,
			isConsoleOpen,
			/** The console messages the panel accepted (the last 60, oldest first), as checked. */
			consoleMessages: () => seen.map((s) => ({ ...s })),
			/** Console-looking messages turned away: a wrong window or origin, a bad shape, or any but
			    ready from a console not ready yet. */
			consoleIgnored: () => ignored,
			/** What the center sent the LINAC console (the last 60). */
			consoleSent: () => [...sent],
			/** The channels the panel emits on (console-bus.ts), for a check to listen to. */
			consoleBus: { linacPose, linacEvents, ctPose, ctComplete, panelOpen }
		});
}
