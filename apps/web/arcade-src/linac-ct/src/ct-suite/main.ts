import { initThree } from './room';
import { log, setProto, setStatus, wire } from './console';
import { attachBridgeListener, consoleMode, sendReady, startStateStream } from './bridge';

/* boot */
// ?view=console (the center's console panel) has no 3D room: the table, scan and x-ray state the
// room used to animate lives in S (console.ts), and the state stream reads it from there.
if (!consoleMode) initThree();
wire();
setStatus('Select a scan protocol to begin', 'busy');
log('CT Simulation Suite ready. Select a scan protocol to begin.', '');
log(
	'Workflow: protocol → habitus/technique → position &amp; isocenter → topogram → range → scan.',
	''
);
// auto-load pelvis so the console isn't empty
setProto('prostate');

attachBridgeListener();
if (consoleMode) {
	document.body.classList.add('rtapps-console-mode', 'rtapps-panel-mode');
	startStateStream();
} else {
	document.body.classList.add('rtapps-room-mode');
	const rtappsEmbedBadge = document.createElement('div');
	rtappsEmbedBadge.className = 'rtapps-embedded-badge';
	rtappsEmbedBadge.textContent = 'RTApps · CT Simulation Workspace';
	document.body.appendChild(rtappsEmbedBadge);
}
sendReady();
