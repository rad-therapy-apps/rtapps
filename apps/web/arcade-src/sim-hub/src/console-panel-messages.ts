/* The console panel's message rules (docs/specs/2026-11-18-consoles-in-center-design.md, part 5):
   the URL each console opens at, which console a message came from (the window that sent it and
   its origin, nothing else), the shape checks every console message passes before console-panel.ts
   emits it on console-bus.ts, which messages wait for the console's ready, the vault state the
   center sends the LINAC console, and when a finished CT scan is recorded. The shapes are the contract in shared/console-protocol.ts. Free of
   scene and DOM imports so it is unit tested in Node (console-panel-messages.spec.ts). */
import {
	CONSOLE_SCENARIO_PARAM,
	CONSOLE_VIEW_PARAM,
	CONSOLE_VIEW_VALUE,
	type ConsoleKind,
	type ConsoleScenario,
	type CtPose,
	type CtToCenterMessage,
	type LinacEvent,
	type LinacPose,
	type LinacRoomMsg,
	type LinacToCenterMessage,
	type LinacWorkspace
} from '../../shared/console-protocol';

const CONSOLE_PAGES: Record<ConsoleKind, string> = {
	linac: '/arcade/linac-ct/index.html',
	ct: '/arcade/linac-ct/ct-suite.html'
};

/** The console page in console mode, on the center's own origin:
    LINAC `index.html?view=console&side=linac[&scenario=tutorial]`,
    CT `ct-suite.html?view=console[&scenario=tutorial]`. `base` is the center page's own URL
    (location.href; the Node checks' stubbed location has no origin). */
export function consoleUrl(kind: ConsoleKind, scenario: ConsoleScenario, base: string): string {
	const url = new URL(CONSOLE_PAGES[kind], base);
	url.searchParams.set(CONSOLE_VIEW_PARAM, CONSOLE_VIEW_VALUE);
	if (kind === 'linac') url.searchParams.set('side', 'linac');
	if (scenario === 'tutorial') url.searchParams.set(CONSOLE_SCENARIO_PARAM, 'tutorial');
	return url.href;
}

/** The console whose frame window sent a message, when it came from the center's own origin;
    null for any other sender. */
export function messageFrom(
	source: unknown,
	origin: string,
	frames: Partial<Record<ConsoleKind, unknown>>,
	ownOrigin: string
): ConsoleKind | null {
	if (source == null || origin !== ownOrigin) return null;
	if (frames.linac === source) return 'linac';
	if (frames.ct === source) return 'ct';
	return null;
}

type Bag = Record<string, unknown>;
const isBag = (v: unknown): v is Bag => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isStr = (v: unknown): v is string => typeof v === 'string';
const WORKSPACES: readonly LinacWorkspace[] = ['queue', 'setup', 'igrt', 'delivery'];
const isWorkspace = (v: unknown): v is LinacWorkspace => WORKSPACES.includes(v as LinacWorkspace);

const LINAC_NUMBERS = [
	'gantry',
	'collimator',
	'couchAngle',
	'couchVrt',
	'couchLng',
	'couchLat',
	'jawX1',
	'jawX2',
	'jawY1',
	'jawY2'
] as const;
const LINAC_FLAGS = ['kvArmsOut', 'epidOut', 'beamOn', 'lasersOn'] as const;

/** A copy with only the pose's own fields, or null when one is missing or of the wrong type. */
function readLinacPose(p: unknown): LinacPose | null {
	if (!isBag(p)) return null;
	const out: Bag = {};
	for (const k of LINAC_NUMBERS) {
		if (!isNum(p[k])) return null;
		out[k] = p[k];
	}
	for (const k of LINAC_FLAGS) {
		if (!isBool(p[k])) return null;
		out[k] = p[k];
	}
	return out as unknown as LinacPose;
}

/** The fields each event kind carries besides `kind`, with their checks. */
const EVENT_FIELDS: Record<LinacEvent['kind'], Record<string, (v: unknown) => boolean>> = {
	'checked-in': { mrn: isStr },
	'chart-opened': { mrn: isStr },
	'setup-complete': { mrn: isStr },
	'images-acquired': { mrn: isStr, shiftMm: isNum },
	'shift-applied': { mrn: isStr },
	'alignment-verified': { mrn: isStr },
	'field-delivered': { mrn: isStr, field: isStr, index: isNum, of: isNum },
	'treatment-complete': { mrn: isStr },
	mistake: { workspace: isWorkspace, code: isStr, message: isStr }
};

function readLinacEvent(e: unknown): LinacEvent | null {
	if (!isBag(e) || !isStr(e.kind) || !Object.hasOwn(EVENT_FIELDS, e.kind)) return null;
	const fields = EVENT_FIELDS[e.kind as LinacEvent['kind']],
		out: Bag = { kind: e.kind };
	for (const [k, ok] of Object.entries(fields)) {
		if (!ok(e[k])) return null;
		out[k] = e[k];
	}
	return out as unknown as LinacEvent;
}

/** A LINAC console message as the contract shapes it (a fresh copy), or null for anything else. */
export function readLinacMessage(data: unknown): LinacToCenterMessage | null {
	if (!isBag(data)) return null;
	if (data.type === 'rtapps-linac-ready')
		return data.scenario === 'free' || data.scenario === 'tutorial'
			? { type: data.type, scenario: data.scenario }
			: null;
	if (data.type === 'rtapps-linac-state') {
		const pose = readLinacPose(data.pose),
			{ mrn, workspace } = data;
		if (!pose || !(mrn === null || isStr(mrn)) || !isWorkspace(workspace)) return null;
		return { type: data.type, pose, mrn: mrn as string | null, workspace };
	}
	if (data.type === 'rtapps-linac-event') {
		const event = readLinacEvent(data.event);
		return event ? { type: data.type, event } : null;
	}
	return null;
}

function readCtPose(p: unknown): CtPose | null {
	if (!isBag(p)) return null;
	const { tableTravel, tableHeight, scanning, xrayOn, lasersOn } = p;
	if (!isNum(tableTravel) || !isNum(tableHeight)) return null;
	if (!isBool(scanning) || !isBool(xrayOn) || !isBool(lasersOn)) return null;
	return { tableTravel, tableHeight, scanning, xrayOn, lasersOn };
}

/** A CT console message as the contract shapes it (a fresh copy), or null for anything else. */
export function readCtMessage(data: unknown): CtToCenterMessage | null {
	if (!isBag(data)) return null;
	if (data.type === 'rtapps-ct-ready') return { type: data.type };
	if (data.type === 'rtapps-ct-state') {
		const pose = readCtPose(data.pose);
		return pose && isStr(data.step) ? { type: data.type, pose, step: data.step } : null;
	}
	if (data.type === 'rtapps-ct-complete') {
		const { key, patient, series, images } = data;
		if (!isStr(key) || !isStr(patient) || !isStr(series) || !isNum(images)) return null;
		return { type: data.type, key, patient, series, images };
	}
	return null;
}

/** What the panel does with a checked message, from a console that has (`ready`) or has not yet
    posted ready since its page last loaded, opened for `scenario`. Its ready makes it ready, the
    LINAC's only from the scenario asked for; until then every other message is dropped: it is
    early, or left over from the page before a reload (the iframe keeps its window). */
export function gateMessage(
	msg: LinacToCenterMessage | CtToCenterMessage,
	ready: boolean,
	scenario: ConsoleScenario
): 'ready' | 'accept' | 'drop' {
	if (msg.type === 'rtapps-linac-ready') return msg.scenario === scenario ? 'ready' : 'drop';
	if (msg.type === 'rtapps-ct-ready') return 'ready';
	return ready ? 'accept' : 'drop';
}

/** The vault as the LINAC console's door interlock reads it: the door is closed only when it is
    fully shut (walk.ts updateDoors progress 0), and staff are in the vault only when the player is
    (`playerRoom`, the room the player stands in): the therapists who stand there in Free Mode are
    scenery. */
export function linacRoom(doorProgress: number, playerRoom: string | null): LinacRoomMsg {
	return {
		type: 'rtapps-linac-room',
		doorClosed: doorProgress <= 0,
		staffInVault: playerRoom === 'vault1'
	};
}

export function sameRoom(a: LinacRoomMsg | null, b: LinacRoomMsg): boolean {
	return !!a && a.doorClosed === b.doorClosed && a.staffInVault === b.staffInVault;
}

/** A finished scan records 'sim-ct-scan' in the free scenario only, once per scan key (as the
    LINAC/CT app counted one completion per finished scan); a scan with no key is not counted. */
export function recordsCtScan(
	scenario: ConsoleScenario,
	key: string,
	recorded: ReadonlySet<string>
): boolean {
	return scenario === 'free' && key !== '' && !recorded.has(key);
}
