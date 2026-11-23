/* What the LINAC app's own modules share with console mode (`?view=console`, docs/specs/
   2026-11-18-consoles-in-center-design.md part 3): the mode read once from the app's own URL, the
   vault as the center last reported it, and four calls the workflow makes at the moment something
   happens: consoleEvent (a patient checked in, images acquired, a field delivered, ...),
   consoleMistake (the console refused an action), consoleNotice (a note for the learner that is
   not a refusal, such as to keep holding Move to field) and consoleMoved (the machine made a move
   the learner asked for). console-mode.ts installs the sink that posts the first two to the
   center, shows the mistakes and notices in the refusal bar, and lets a move end it; outside
   console mode there is no sink and the calls do nothing, so the app behaves exactly as before.
   No app imports, so any module can use it without an import cycle. */
import type { LinacEvent } from '../../shared/console-protocol';
import { consoleViewFromSearch } from './console-messages';

function ownSearch(): string {
	try {
		return location.search;
	} catch {
		return '';
	}
}

/** Console mode and scenario for this page load. */
export const CONSOLE = consoleViewFromSearch(ownSearch());

/** The vault as the center reports it (rtapps-linac-room). The door starts closed. */
export const consoleRoom = { doorClosed: true, staffInVault: false };

export type ConsoleEvent = Exclude<LinacEvent, { kind: 'mistake' }>;
interface ConsoleSink {
	event(e: ConsoleEvent): void;
	mistake(code: string, message: string): void;
	notice(message: string): void;
	moved(): void;
}
let sink: ConsoleSink | null = null;

export function setConsoleSink(s: ConsoleSink): void {
	sink = s;
}

/** A workflow step just happened (posted as rtapps-linac-event). */
export function consoleEvent(e: ConsoleEvent): void {
	sink?.event(e);
}

let mistakes = 0;

/** The console just refused an action; `message` is what the console shows the learner. */
export function consoleMistake(code: string, message: string): void {
	mistakes++;
	sink?.mistake(code, message);
}

/** A note for the learner in the refusal bar's place that is not a refused action: not posted to
    the center, so the Tutorial does not count it. */
export function consoleNotice(message: string): void {
	sink?.notice(message);
}

/** The machine just made a move the learner asked for: a gantry, couch or table move the collision
    interlock let through (linac-safety.ts attemptCollisionSafeMotion). */
export function consoleMoved(): void {
	sink?.moved();
}

/** How many actions the console has refused so far (a held key stops at a refusal). */
export function consoleMistakeCount(): number {
	return mistakes;
}
