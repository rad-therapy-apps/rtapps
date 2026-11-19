/* The console queue's paging rules (console-patch.ts renderQueue), in console mode only: how many
   rows a page holds for the room the list has, which page shows a given row, and the page a turn
   lands on. Free of DOM imports so it is unit tested in Node (queue-pages.spec.ts). The arrow-key
   rule is the center's own (sim-hub/src/pager-math.ts pageStep). */

/** Rows that fit in `room` px when each is `rowHeight` px tall: at least one, so a tiny frame still
    shows a row; a frame not yet measured (no room or no row height) keeps `fallback`. */
export function rowsPerPage(room: number, rowHeight: number, fallback: number): number {
	if (!(room > 0) || !(rowHeight > 0)) return fallback;
	return Math.max(1, Math.floor(room / rowHeight));
}

/** How many pages `total` rows make at `perPage` rows a page; at least one. */
export function pageCount(total: number, perPage: number): number {
	return Math.max(1, Math.ceil(total / Math.max(1, perPage)));
}

/** The page (from 0) that holds row `index`; the first page for a row not on the list (-1). */
export function pageOfRow(index: number, perPage: number): number {
	return index < 0 ? 0 : Math.floor(index / Math.max(1, perPage));
}

/** `page` moved by `step` and kept inside the pages that exist. */
export function turnPage(page: number, step: number, pages: number): number {
	return Math.min(Math.max(page + step, 0), Math.max(1, pages) - 1);
}
