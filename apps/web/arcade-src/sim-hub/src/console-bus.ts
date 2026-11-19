/* The center's side of the console messages (docs/specs/2026-11-18-consoles-in-center-design.md).
   console-panel.ts checks each message from the open console's iframe and emits it here; Vault 1
   (vault-linac.ts) follows `linacPose`, the CT room (ct-room-look.ts) follows `ctPose`, and the
   Tutorial (tutorial.ts) listens to `linacEvents`, `ctComplete` and `panelOpen` and emits
   `vaultMonitorPatient`, which Vault 1 listens to. A channel per
   message keeps those modules from importing one another. Free of scene and DOM imports so it is
   unit tested in Node (console-bus.spec.ts). */
import type { ConsoleKind, CtPose, LinacEvent, LinacPose } from '../../shared/console-protocol';
import type { CtCompleteMsg } from '../../linac-ct/src/ct-protocol';

export interface Channel<T> {
	/** Adds a listener; the returned function removes it. */
	on(listener: (value: T) => void): () => void;
	emit(value: T): void;
}

export function channel<T>(): Channel<T> {
	const listeners = new Set<(value: T) => void>();
	return {
		on(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		emit(value) {
			for (const l of [...listeners]) l(value);
		}
	};
}

/** The LINAC console's machine pose, as each rtapps-linac-state message brings it. */
export const linacPose = channel<LinacPose>();
/** What happened on the LINAC console (rtapps-linac-event). */
export const linacEvents = channel<LinacEvent>();
/** The CT console's scanner pose (rtapps-ct-state). */
export const ctPose = channel<CtPose>();
/** The CT console finished a scan (rtapps-ct-complete). */
export const ctComplete = channel<CtCompleteMsg>();
/** Who the Vault 1 treatment monitors name (the Tutorial's Jordan Ellis), or null for whoever lies on
    the couch; vault-linac.ts listens. */
export const vaultMonitorPatient = channel<string | null>();
/** A console panel opened (`kind`) or closed (null). */
export const panelOpen = channel<ConsoleKind | null>();
