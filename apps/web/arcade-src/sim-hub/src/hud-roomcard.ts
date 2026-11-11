/* The room pop-up (sim-hub menu, task 1c): a centred card when the player walks into a room
   (room-enter.ts, the lobby included): the room's kicker, name and description, its department zone
   and room type, "What happens here" and who to talk to. It pauses the game (pause.ts) and frees the
   pointer; Continue (the button or Enter) resumes and locks the pointer again, Esc closes it too
   (dialogs.ts). "Don't show this again" keeps the room in PREF.roomCardsHidden; Settings > Room
   introductions (the #setRoomCards box in menu.ts's settings, wired here) turns every card off, and
   back on clears that list (roomcard-rules.ts). The element is #roomPopup: sdk-bridge.ts's CT QA
   animation pulses '#roomCard'. */
import type { Room } from './rooms';
import { ROOM_GUIDES } from './main';
import { STAFF_GUIDES } from './interact';
import { requestWalkPointerLock } from './walk';
import { setPaused } from './pause';
import { openDialogName, registerDialog } from './dialogs';
import { PREF, readPref, writePref } from './prefs';
import { onRoomEnter } from './room-enter';
import {
	hideRoomCardFor,
	roomTypeLabel,
	roomZoneLabel,
	setRoomCardsEnabled,
	shouldShowRoomCard,
	type RoomCardPrefs
} from './roomcard-rules';

const byId = (id: string) => document.getElementById(id);
const setText = (id: string, text: string) => {
	const el = byId(id);
	if (el) el.textContent = text;
};
let shownId: string | null = null;

function loadPrefs(): RoomCardPrefs {
	const hidden = readPref<unknown>(PREF.roomCardsHidden, []);
	return {
		enabled: readPref<unknown>(PREF.roomCardsEnabled, true) !== false,
		hidden: Array.isArray(hidden) ? hidden.filter((id): id is string => typeof id === 'string') : []
	};
}

function savePrefs(p: RoomCardPrefs): void {
	writePref(PREF.roomCardsEnabled, p.enabled);
	writePref(PREF.roomCardsHidden, p.hidden);
}

function showRoomCard(r: Room): void {
	const key = ROOM_GUIDES[r.id],
		guide = key ? STAFF_GUIDES[key] : null;
	setText('rcKicker', r.kicker);
	setText('rcName', r.name);
	setText('rcDesc', r.desc);
	setText('rcZone', roomZoneLabel(r.zone));
	setText('rcType', roomTypeLabel(r.id));
	setText('rcWhat', r.what);
	const staff = byId('rcStaff');
	if (staff) staff.hidden = !guide;
	if (guide) setText('rcStaffName', `${guide.name} · ${guide.role}`);
	const tick = byId('rcHide') as HTMLInputElement | null;
	if (tick) tick.checked = false;
	shownId = r.id;
	byId('roomPopup')?.classList.add('show');
	setPaused('roomCard', true);
	if (document.pointerLockElement) document.exitPointerLock();
	byId('rcContinue')?.focus();
}

/** `relock`: only from Continue (a click or Enter), a user gesture the pointer lock needs. */
function closeRoomCard(relock: boolean): void {
	if (!shownId) return;
	if ((byId('rcHide') as HTMLInputElement | null)?.checked)
		savePrefs(hideRoomCardFor(shownId, loadPrefs()));
	shownId = null;
	byId('roomPopup')?.classList.remove('show');
	setPaused('roomCard', false);
	if (relock) requestWalkPointerLock();
}

onRoomEnter((r) => {
	// one card at a time, never over another dialog (a conversation, a lab, the CT QA menu)
	if (shownId || openDialogName() !== null || !shouldShowRoomCard(r.id, loadPrefs())) return;
	showRoomCard(r);
});
registerDialog(
	'roomCard',
	() => shownId !== null,
	() => closeRoomCard(false)
);
byId('rcContinue')?.addEventListener('click', () => closeRoomCard(true));
document.addEventListener('keydown', (e) => {
	if (!shownId || e.key !== 'Enter') return;
	e.preventDefault(); // the focused Continue must not also click
	closeRoomCard(true);
});
const roomCardsBox = byId('setRoomCards') as HTMLInputElement | null;
if (roomCardsBox) {
	roomCardsBox.checked = loadPrefs().enabled;
	roomCardsBox.addEventListener('change', () =>
		savePrefs(setRoomCardsEnabled(roomCardsBox.checked, loadPrefs()))
	);
}
