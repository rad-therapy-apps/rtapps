/* Today's dialogs, registered for Esc (sim-hub menu, Step 0; dialogs.ts). Esc closes the open one
   before it would open the settings. Order matters: the procedure lab, opened from the CT QA dock,
   closes before the dock. */
import { registerDialog } from './dialogs';
import {
	closeStaffDialogue,
	closeEquipmentPanel,
	closeLinacHeadLab,
	closeProcedureLab,
	closeKioskDialog
} from './interact';
import { showCtQaDock } from './sdk-bridge';

const shown = (id: string) => () =>
	document.getElementById(id)?.classList.contains('show') ?? false;

registerDialog('procedureLab', shown('procedureLab'), () => closeProcedureLab());
registerDialog('linacHeadLab', shown('linacHeadDialog'), () => closeLinacHeadLab());
registerDialog('equipment', shown('equipmentPanel'), () => closeEquipmentPanel());
registerDialog('staff', shown('staffDialog'), () => closeStaffDialogue());
registerDialog('kiosk', shown('kioskDialog'), () => closeKioskDialog());
registerDialog('ctQaDock', shown('ctQaDock'), () => showCtQaDock(false));
