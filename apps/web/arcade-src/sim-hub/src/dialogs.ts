/* Esc's dialog registry (sim-hub menu, Step 0). Every dialog Esc should close registers how to tell it
   is open and how to close it. menu.ts's Esc handler closes the open one instead of opening the
   settings, and a pointer-lock loss while one is open (a dialog frees the pointer as it opens) does
   not open the settings. They are tried in registration order: hub-dialogs.ts registers today's
   dialogs, hud-roomcard.ts the room card, menu.ts the settings. Free of scene and DOM imports so it is
   unit tested in Node (dialogs.spec.ts). */
interface Dialog {
	name: string;
	isOpen: () => boolean;
	close: () => void;
}

const dialogs: Dialog[] = [];

/** Registering a name again replaces the earlier entry, in its place. */
export function registerDialog(name: string, isOpen: () => boolean, close: () => void): void {
	const i = dialogs.findIndex((d) => d.name === name);
	if (i >= 0) dialogs[i] = { name, isOpen, close };
	else dialogs.push({ name, isOpen, close });
}

/** The first registered dialog that is open, or null. */
export function openDialogName(): string | null {
	return dialogs.find((d) => d.isOpen())?.name ?? null;
}

/** Closes that dialog; true if one was open. */
export function closeOpenDialog(): boolean {
	const d = dialogs.find((x) => x.isOpen());
	if (!d) return false;
	d.close();
	return true;
}

/** Closes every open dialog except those named in `keep` (the console panel closes the pop-ups
    under it as it opens, console-panel.ts). */
export function closeDialogsExcept(keep: readonly string[]): void {
	for (const d of dialogs) if (!keep.includes(d.name) && d.isOpen()) d.close();
}
