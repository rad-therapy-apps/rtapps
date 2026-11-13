/* The pop-up pager's rules (pager.ts): which blocks go on which page, and which keys turn a page. Free
   of DOM imports so it is unit tested in Node (pager-math.spec.ts). */

/** Greedy page breaks. `heights` are the blocks' heights in order, `limit` the height a page has and
    `gap` the space between two blocks on a page. Each page lists the indices of its blocks. A block
    taller than the limit gets a page to itself; no blocks give no pages. */
export function breakPages(heights: number[], limit: number, gap: number): number[][] {
	const pages: number[][] = [];
	let used = 0;
	heights.forEach((h, i) => {
		const page = pages[pages.length - 1];
		if (page && used + gap + h <= limit) {
			page.push(i);
			used += gap + h;
		} else {
			pages.push([i]);
			used = h;
		}
	});
	return pages;
}

const FIELDS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

/** The page turn an arrow key asks for: -1 for ArrowLeft, 1 for ArrowRight, 0 for any other key,
    with a modifier held, or with focus (`focusTag`, the focused element's tag name) in a field,
    whose arrows move its caret or its choice. */
export function pageStep(
	e: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
	focusTag: string
): -1 | 0 | 1 {
	if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || FIELDS.has(focusTag)) return 0;
	return e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
}
