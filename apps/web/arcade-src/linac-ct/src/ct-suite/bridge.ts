/* The CT suite's postMessage bridge. With the LINAC/CT app (workspace.ts) as parent it takes the
   view and case messages and answers with ready / case-loaded / complete; in console mode
   (?view=console, loaded by the center's console panel) it also streams the scanner pose as
   rtapps-ct-state. Both directions are same-origin only: messages count only from the parent window
   on this page's origin, and posts name this origin as their target. Checks live in ct-state.ts. */
import { PROTOCOLS, S, setProto, $ } from './console';
import type {
	ParentToCtMessage,
	CtToParentMessage,
	CtCaseLoadedMsg,
	CtReadyMsg,
	CtStateMsg
} from '../ct-protocol';
import {
	createStateGate,
	ctPose,
	isTrustedParentMessage,
	postTargetOrigin,
	ctStepLabel
} from './ct-state';

/** Console mode: the page is the console panel's iframe, with no room. */
export const consoleMode = new URLSearchParams(location.search).get('view') === 'console';

/** Posts to the parent window, same origin only. */
export function postToParent(msg: CtToParentMessage) {
	const target = postTargetOrigin(location.origin);
	if (target) window.parent?.postMessage(msg, target);
}

/* ===== RTApps parent workstation bridge ===== */
export function attachBridgeListener() {
	window.addEventListener('message', (ev) => {
		if (!isTrustedParentMessage(ev, window.parent, window, location.origin)) return;
		const d = (ev.data || {}) as Partial<ParentToCtMessage>;
		// The panel's console mode has one layout; the room/console toggle is for the LINAC/CT app.
		if (d.type === 'rtapps-ct-view' && !consoleMode) {
			document.body.classList.toggle('rtapps-room-mode', d.view === 'room');
			document.body.classList.toggle('rtapps-console-mode', d.view === 'console');
			setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
		}
		if (d.type === 'rtapps-ct-case' && d.key && PROTOCOLS[d.key]) {
			setProto(d.key);
			postToParent({
				type: 'rtapps-ct-case-loaded',
				key: d.key,
				patient: PROTOCOLS[d.key].patient,
				protocol: PROTOCOLS[d.key].name,
				series: PROTOCOLS[d.key].series
			} satisfies CtCaseLoadedMsg);
		}
	});
}

export function sendReady() {
	postToParent({ type: 'rtapps-ct-ready' } satisfies CtReadyMsg);
}

/** Console mode: posts rtapps-ct-state whenever the pose or step changes, at most 30 a second.
    The suite's state (S) changes from many places, so this watches it rather than hooking each. */
export function startStateStream() {
	const gate = createStateGate(33);
	const tick = () => {
		const pose = ctPose(S);
		const step = $('conStep')?.textContent || ctStepLabel(S.step);
		if (gate(pose, step, performance.now()))
			postToParent({ type: 'rtapps-ct-state', pose, step } satisfies CtStateMsg);
	};
	// polled at twice the gate's rate, so a change is never held back a whole period
	setInterval(tick, 16);
	tick();
}
