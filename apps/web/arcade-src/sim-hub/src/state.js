/* RTApps (#77 sim-hub modularization, task 2): shared mutable state.
   Every top-level `let`/`var` formerly declared in main.js lives here as a
   property of `S` instead. ES module imports are read-only bindings, so a
   `let mode` in main.js couldn't be reassigned from another module — `S.mode`
   can, since only `S`'s properties change, not the `S` binding itself.
   Modules extracted from main.js in later tasks import `S` and read/write
   `S.<name>` in its place. Initializers below are verbatim from the original
   top-level declarations. */
export const S = {
	currentInteraction: null,
	ROOM_APP_URL: null,
	CONSOLE_APP_URL: null,
	CONSOLE_APP_DOORS: new Set(['Learning Commons / Staff Education']),
	AMB: null,
	ambUnload: null,
	ambLoad: null,
	mode: 'overview',
	activeRoom: null,
	history: [],
	travel: null,
	walkCompositionRoomId: null,
	activeGuideKey: null,
	walkDragLook: false,
	walkLastX: 0,
	walkLastY: 0
};
