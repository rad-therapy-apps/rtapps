/* Which side of the app a hub door opened (Free Mode fixes). The hub's CT doors add `side=ct` to
   the player page's URL and its LINAC Control Area door `side=linac` (sim-hub room-app-url.ts).
   The app runs in that page's same-origin iframe, whose own URL has no query, so the top window is
   read first and the app's own URL second. A side keeps the app to that side's queue: no switcher,
   and Home Queue leads back to it. No side (opened from the Games shelf) keeps both queues.
   Read by console-patch.ts (brand, landing queue) and workspace.ts (switcher, CT landing). */
export type Side = 'ct' | 'linac';

/** The `side` parameter of a query string ('?side=ct'), or null when it is missing or unknown. */
export function sideFromSearch(search: string): Side | null {
	const side = new URLSearchParams(search).get('side');
	return side === 'ct' || side === 'linac' ? side : null;
}

/** `win()`'s query string, or '' when it cannot be read (a cross-origin top window). */
function searchOf(win: () => Window | null): string {
	try {
		return win()?.location.search ?? '';
	} catch {
		return '';
	}
}

/** The side the player page was opened for, else the one in the app's own URL; null for neither. */
export function readSide(): Side | null {
	return sideFromSearch(searchOf(() => window.top)) ?? sideFromSearch(searchOf(() => window));
}
