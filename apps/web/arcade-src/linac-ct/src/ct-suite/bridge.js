// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import { PROTOCOLS, setProto } from './console';

/* ===== RTApps parent workstation bridge ===== */
export function attachBridgeListener() {
	window.addEventListener('message', (ev) => {
		const d = ev.data || {};
		if (d.type === 'rtapps-ct-view') {
			document.body.classList.toggle('rtapps-room-mode', d.view === 'room');
			document.body.classList.toggle('rtapps-console-mode', d.view === 'console');
			setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
		}
		if (d.type === 'rtapps-ct-case' && d.key && PROTOCOLS[d.key]) {
			setProto(d.key);
			window.parent?.postMessage(
				{
					type: 'rtapps-ct-case-loaded',
					key: d.key,
					patient: PROTOCOLS[d.key].patient,
					protocol: PROTOCOLS[d.key].name,
					series: PROTOCOLS[d.key].series
				},
				'*'
			);
		}
	});
}

export function sendReady() {
	window.parent?.postMessage({ type: 'rtapps-ct-ready' }, '*');
}
