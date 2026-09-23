// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import { initThree } from './room';
import { log, setProto, setStatus, wire } from './console';
import { attachBridgeListener, sendReady } from './bridge';

/* boot */
initThree();
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
document.body.classList.add('rtapps-room-mode');
const rtappsEmbedBadge = document.createElement('div');
rtappsEmbedBadge.className = 'rtapps-embedded-badge';
rtappsEmbedBadge.textContent = 'RTApps · CT Simulation Workspace';
document.body.appendChild(rtappsEmbedBadge);
sendReady();
