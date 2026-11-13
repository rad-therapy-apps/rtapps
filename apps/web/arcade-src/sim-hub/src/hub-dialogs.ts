/* Today's dialogs, registered for Esc (sim-hub menu, Step 0; dialogs.ts). Esc closes the open one
   before it would open the settings. Order matters: the procedure lab, opened from the CT QA dock,
   closes before the dock. */
import { openDialogName, registerDialog } from './dialogs';
import {
	closeStaffDialogue,
	closeEquipmentPanel,
	closeLinacHeadLab,
	closeProcedureLab,
	closeKioskDialog
} from './interact';
import { showCtQaDock } from './sdk-bridge';
import { requestWalkPointerLock } from './walk';

const shown = (id: string) => () =>
	document.getElementById(id)?.classList.contains('show') ?? false;

const HUB_DIALOGS: [string, string, () => void][] = [
	['procedureLab', 'procedureLab', () => closeProcedureLab()],
	['linacHeadLab', 'linacHeadDialog', () => closeLinacHeadLab()],
	['equipment', 'equipmentPanel', () => closeEquipmentPanel()],
	['staff', 'staffDialog', () => closeStaffDialogue()],
	['kiosk', 'kioskDialog', () => closeKioskDialog()],
	['ctQaDock', 'ctQaDock', () => showCtQaDock(false)]
];
for (const [name, id, close] of HUB_DIALOGS) registerDialog(name, shown(id), close);

/* A click that closes the last open one of these (its × or Close, the kiosk's backdrop) hands the
   mouse back to looking around: the click is the gesture pointer lock needs, so the player doesn't
   click the view again. The room card, settings and tutorial cards relock from their own buttons.
   Esc can't do it: browsers don't count Escape as a gesture, so after Esc a click on the view locks. */
const hubNames = new Set(HUB_DIALOGS.map(([name]) => name));
let hubOpenBeforeClick = false;
document.addEventListener(
	'click',
	() => {
		const open = openDialogName();
		hubOpenBeforeClick = open !== null && hubNames.has(open);
	},
	true
);
document.addEventListener('click', () => {
	if (hubOpenBeforeClick && openDialogName() === null) requestWalkPointerLock();
});
