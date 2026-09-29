// The postMessage contract between the linac-ct parent (workspace.ts) and the
// CT suite page (ct-suite/bridge.ts). One union per direction so the two halves
// of the door cannot silently disagree about message shapes. Types only — the
// wire format is unchanged.
export interface CtViewMsg {
	type: 'rtapps-ct-view';
	view: 'room' | 'console';
}
export interface CtCaseMsg {
	type: 'rtapps-ct-case';
	key: string;
}
export interface CtReadyMsg {
	type: 'rtapps-ct-ready';
}
export interface CtCaseLoadedMsg {
	type: 'rtapps-ct-case-loaded';
	key: string;
	patient: string;
	protocol: string;
	series: string;
}
export interface CtCompleteMsg {
	type: 'rtapps-ct-complete';
	key: string;
	patient: string;
	series: string;
	images: number;
}
export type ParentToCtMessage = CtViewMsg | CtCaseMsg;
export type CtToParentMessage = CtReadyMsg | CtCaseLoadedMsg | CtCompleteMsg;
