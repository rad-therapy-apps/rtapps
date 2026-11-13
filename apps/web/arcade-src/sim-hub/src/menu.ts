/* The title menu, the Esc settings and Help (sim-hub menu, task 1a).
   - Title menu (#titleMenu): Free Mode and Tutorial over the overview pose (walk.ts setMode
     'overview'), which turns slowly (OrbitControls autoRotate; main.ts updates the orbit in overview).
     Mouse, or Up/Down and Enter. Tutorial says "Coming soon" until PR 3 calls setTutorialAvailable.
   - Play modes (play-mode.ts): this module's listener does the switch. 'free' and 'tutorial' hide the
     menu, walk from the plaza (or, with atDoor, from just outside that room's door, facing the
     hallway) and ask for the pointer lock, which the browser grants because enterMode runs inside
     the entry's click. 'title' goes back to the turning overview and shows the menu.
   - Settings (#settingsMenu): Sound, Room introductions (its #setRoomCards box is wired by
     hud-roomcard.ts), Help, Resume and Main menu (not on the title; in the tutorial it asks first,
     inline: the player has no confirm()). Help is a screen of its own in the card, with Back to
     settings; its content pages when it does not fit (pager.ts). It pauses the game (pause.ts). It opens when the pointer
     lock is lost while walking with nothing open (the browser keeps Esc to itself while locked), and
     on an Esc keydown while the pointer is free; Esc with a dialog open closes that dialog
     (dialogs.ts). menu-rules.ts holds those rules. */
import * as THREE from 'three';
import { S } from './state';
import { camera, orbit } from './scene';
import { roomById, player, PLAYER_EYE_Y } from './main';
import { hallwayFacing, type ReturnView } from './return-door';
import {
	setMode,
	aimPlayerAt,
	doorPoint,
	doorNormal,
	getColliders,
	requestWalkPointerLock
} from './walk';
import {
	enterMode,
	getPlayMode,
	onPlayModeChange,
	type EnterOptions,
	type PlayMode
} from './play-mode';
import { isPaused, setPaused } from './pause';
import { closeOpenDialog, openDialogName, registerDialog } from './dialogs';
import { PREF, readPref, writePref } from './prefs';
import { escKeyAction, lockLossOpensSettings } from './menu-rules';
import { applySoundPrefOnFirstGesture, setSound } from './sound';
import { createPager, type Pager } from './pager';

/** About four minutes a turn at 60 frames a second (OrbitControls turns 2π/3600 × speed a frame). */
const TITLE_ORBIT_SPEED = 0.25;
const MODE_NAMES: Record<PlayMode, string> = {
	title: 'Main menu',
	free: 'Free Mode',
	tutorial: 'Tutorial'
};
const TUTORIAL_LINE = 'Follow objectives as a patient and a radiation therapist';

const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T | null;
let settingsOpen = false,
	autoOpenedAt = -Infinity,
	wasLocked = false,
	helpPager: Pager | null = null;

export function setTutorialAvailable(on: boolean): void {
	const entry = byId<HTMLButtonElement>('menuTutorial'),
		line = byId('menuTutorialSub');
	if (entry) {
		entry.disabled = !on;
		entry.setAttribute('aria-disabled', String(!on));
	}
	if (line) line.textContent = on ? TUTORIAL_LINE : 'Coming soon';
}

/** The settings' main screen, or Help in its place (the card keeps its size; Help pages instead). */
function showHelp(on: boolean): void {
	const mode = getPlayMode(),
		kicker = byId('setKicker'),
		title = byId('setTitle'),
		main = byId('setMain'),
		help = byId('setHelpScreen');
	if (kicker)
		kicker.textContent =
			mode === 'title' ? 'Settings' : on ? `${MODE_NAMES[mode]} · Settings` : 'Paused';
	if (title) title.textContent = on ? 'Help' : MODE_NAMES[mode];
	if (main) main.hidden = on;
	if (help) help.hidden = !on;
	if (on) helpPager?.open();
}

function showLeave(on: boolean): void {
	const ask = byId('setLeave'),
		mainMenu = byId('setMainMenu');
	if (ask) ask.hidden = !on;
	if (mainMenu && getPlayMode() !== 'title') mainMenu.hidden = on;
	if (on) byId('setLeaveNo')?.focus();
}

function openSettings(): void {
	if (settingsOpen) return;
	settingsOpen = true;
	const mainMenu = byId('setMainMenu'),
		sound = byId<HTMLInputElement>('setSound');
	if (mainMenu) mainMenu.hidden = getPlayMode() === 'title';
	showHelp(false);
	showLeave(false);
	if (sound) sound.checked = readPref<unknown>(PREF.sound, false) === true;
	byId('settingsMenu')?.classList.add('show');
	setPaused('settings', true);
	if (document.pointerLockElement) document.exitPointerLock();
	byId('setResume')?.focus();
}

/** `relock`: only from a click or Enter on Resume, a user gesture the pointer lock needs. */
function closeSettings(relock: boolean): void {
	if (!settingsOpen) return;
	settingsOpen = false;
	byId('settingsMenu')?.classList.remove('show');
	setPaused('settings', false);
	if (getPlayMode() === 'title') byId('menuFree')?.focus();
	else if (relock) requestWalkPointerLock();
}

function onMainMenu(): void {
	if (getPlayMode() === 'tutorial') showLeave(true);
	else enterMode('title');
}

/** Free Mode from a room's door (main.ts boot, task 1e): where the player stood and looking the way
    they looked as they left, or, without that, just outside the door facing along the hallway. */
function startAtDoor(roomId: string, view?: ReturnView): void {
	const r = roomById(roomId);
	if (!r || r.hub) return;
	if (view) {
		player.pos.set(view.x, PLAYER_EYE_Y, view.z);
		player.yaw = view.yaw;
		player.pitch = view.pitch;
		camera.position.copy(player.pos);
		return;
	}
	const at = doorPoint(r),
		dir = hallwayFacing(at, doorNormal(r), getColliders());
	player.pos.set(at.x, PLAYER_EYE_Y, at.z);
	camera.position.copy(player.pos);
	aimPlayerAt(new THREE.Vector3(at.x + dir.x * 5, PLAYER_EYE_Y, at.z + dir.z * 5));
}

function onModeChange(m: PlayMode, opts: EnterOptions): void {
	closeSettings(false);
	const menu = byId('titleMenu');
	if (m === 'title') {
		setMode('overview');
		orbit.enabled = false; // the backdrop turns on its own: no drag or zoom behind the menu
		orbit.autoRotate = true;
		orbit.autoRotateSpeed = TITLE_ORBIT_SPEED;
		menu?.classList.add('show');
		byId('menuFree')?.focus();
		return;
	}
	menu?.classList.remove('show');
	orbit.autoRotate = false;
	S.activeRoom = null; // walk.ts setMode starts on the plaza only when no room is active
	setMode('walk', false);
	if (opts.atDoor) startAtDoor(opts.atDoor, opts.view);
	requestWalkPointerLock();
}

function onEscKey(e: KeyboardEvent): void {
	if (e.key !== 'Escape' || e.repeat) return;
	const action = escKeyAction({
		msSinceAutoOpen: performance.now() - autoOpenedAt,
		dialogOpen: openDialogName() !== null,
		locked: !!document.pointerLockElement,
		playMode: getPlayMode(),
		walking: S.mode === 'walk' && !S.travel
	});
	if (action === 'closeDialog') closeOpenDialog();
	else if (action === 'openSettings') openSettings();
}

function onLockChange(): void {
	const locked = !!document.pointerLockElement;
	if (
		wasLocked &&
		!locked &&
		lockLossOpensSettings({
			walking: S.mode === 'walk' && !S.travel,
			playMode: getPlayMode(),
			dialogOpen: openDialogName() !== null,
			paused: isPaused()
		})
	) {
		autoOpenedAt = performance.now();
		openSettings();
	}
	wasLocked = locked;
}

/** Up and Down move between the entries that are enabled; Enter presses the focused one (a button). */
function onMenuKey(e: KeyboardEvent): void {
	if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
	e.preventDefault();
	const entries = [...document.querySelectorAll<HTMLButtonElement>('#titleMenu .tmEntry')].filter(
		(b) => !b.disabled
	);
	if (!entries.length) return;
	const i = entries.indexOf(document.activeElement as HTMLButtonElement),
		step = e.key === 'ArrowDown' ? 1 : -1;
	entries[i < 0 ? 0 : (i + step + entries.length) % entries.length].focus();
}

export function installMenu(): void {
	byId('menuFree')?.addEventListener('click', () => enterMode('free'));
	byId('menuTutorial')?.addEventListener('click', () => enterMode('tutorial'));
	byId('titleMenu')?.addEventListener('keydown', onMenuKey);
	// a click on the overlay outside the entries moves focus to body: put it back so Up/Down/Enter work
	byId('titleMenu')?.addEventListener('click', (e) => {
		if (!(e.target as HTMLElement).closest('.tmEntry')) byId('menuFree')?.focus();
	});
	registerDialog(
		'settings',
		() => settingsOpen,
		() => closeSettings(false)
	);
	byId('setResume')?.addEventListener('click', () => closeSettings(true));
	helpPager = createPager({
		isOpen: () => settingsOpen && byId('setHelpScreen')?.hidden === false,
		body: byId('setHelpPanel'),
		bar: byId('setHelpPager'),
		card: document.querySelector<HTMLElement>('#settingsMenu .setCard') ?? undefined
	});
	byId('setHelp')?.addEventListener('click', () => {
		showHelp(true);
		byId('setHelpBack')?.focus();
	});
	byId('setHelpBack')?.addEventListener('click', () => {
		showHelp(false);
		byId('setHelp')?.focus();
	});
	byId('setMainMenu')?.addEventListener('click', onMainMenu);
	byId('setLeaveYes')?.addEventListener('click', () => enterMode('title'));
	byId('setLeaveNo')?.addEventListener('click', () => {
		showLeave(false);
		byId('setMainMenu')?.focus();
	});
	const settings = byId('settingsMenu');
	// a click on the dimmed backdrop resumes, like Resume
	settings?.addEventListener('click', (e) => {
		if (e.target === settings) closeSettings(true);
	});
	const sound = byId<HTMLInputElement>('setSound');
	sound?.addEventListener('change', () => {
		void setSound(sound.checked).then((on) => {
			sound.checked = on;
			writePref(PREF.sound, on);
		});
	});
	applySoundPrefOnFirstGesture();
	document.addEventListener('keydown', onEscKey);
	document.addEventListener('pointerlockchange', onLockChange);
	onPlayModeChange(onModeChange);
	setTutorialAvailable(false);
}
