// No-scroll guard for the browser checks (the owner's rule: no console screen, no pop-up, ever
// scrolls; content that does not fit splits into pages or gets a compact layout instead).
//
// `scrollAreas(target)` runs one evaluate in a Playwright Frame or Page and returns every area
// that scrolls or could: the document itself (taller or wider than the window by over 2 px) and
// every displayed element with overflow auto/scroll whose content is over 4 px taller or wider
// than its box. Zero-size, visibility:hidden and display:none elements are ignored.
// `createNoScrollCollector()` records those areas at named moments, each area once (the largest
// hidden amount wins), and `fail()` words the result for the check's "NO-SCROLL FAIL" line.
// Used by sim-hub-console-check.mjs and sim-hub-free-console-check.mjs.

/** Every scrollable area in `target`'s document (a Playwright Frame or Page), or null if the
    frame went away mid-scan. */
export async function scrollAreas(target) {
	return target
		.evaluate(() => {
			const areas = [];
			const vh = innerHeight;
			const vw = innerWidth;
			const se = document.scrollingElement;
			if (se && (se.scrollHeight > vh + 2 || se.scrollWidth > vw + 2)) {
				areas.push({
					el: 'WHOLE PAGE',
					owner: '',
					size: [vw, vh],
					hiddenY: Math.max(0, se.scrollHeight - vh),
					hiddenX: Math.max(0, se.scrollWidth - vw),
					text: ''
				});
			}
			for (const el of document.querySelectorAll('body *')) {
				const cs = getComputedStyle(el);
				if (!/(auto|scroll)/.test(cs.overflowY + ' ' + cs.overflowX)) continue;
				const hiddenY = el.scrollHeight - el.clientHeight;
				const hiddenX = el.scrollWidth - el.clientWidth;
				if (hiddenY <= 4 && hiddenX <= 4) continue;
				const b = el.getBoundingClientRect();
				if (b.width < 4 || b.height < 4 || cs.visibility === 'hidden' || cs.display === 'none')
					continue;
				if (el.offsetParent === null && cs.position !== 'fixed') continue;
				const name = el.id
					? '#' + el.id
					: el.tagName.toLowerCase() +
						(el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
				areas.push({
					el: name,
					owner: el.parentElement?.closest('[id]')?.id || '',
					size: [Math.round(b.width), Math.round(b.height)],
					hiddenY: Math.max(0, hiddenY),
					hiddenX: Math.max(0, hiddenX),
					text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60)
				});
			}
			return { frame: [vw, vh], areas };
		})
		.catch(() => null);
}

/** Collects scroll areas over a whole run. `scan(target, moment)` records `target`'s areas;
    `fail()` returns the "NO-SCROLL FAIL: ..." text, or null when nothing scrolled. */
export function createNoScrollCollector() {
	const seen = new Map();
	let scans = 0;
	return {
		get scans() {
			return scans;
		},
		async scan(target, moment) {
			const r = await scrollAreas(target);
			if (!r) return;
			scans++;
			for (const a of r.areas) {
				const key = `${r.frame.join('x')}|${a.el}|${a.owner}`;
				const prev = seen.get(key);
				const size = a.hiddenY + a.hiddenX;
				if (!prev || size > prev.hiddenY + prev.hiddenX)
					seen.set(key, { ...a, frame: r.frame.join('x'), moment });
			}
		},
		fail() {
			if (!seen.size) return null;
			const rows = [...seen.values()].sort(
				(a, b) => b.hiddenY + b.hiddenX - (a.hiddenY + a.hiddenX)
			);
			const lines = rows.map(
				(a) =>
					`  [${a.frame}] ${a.el}${a.owner ? ` (in #${a.owner})` : ''} ${a.size.join('x')} hides ${a.hiddenY} px down, ${a.hiddenX} px across; first seen ${a.moment}${a.text ? `; "${a.text}"` : ''}`
			);
			return `NO-SCROLL FAIL: ${rows.length} scrolling area${rows.length === 1 ? '' : 's'}\n${lines.join('\n')}`;
		}
	};
}

/** The check's viewport: CHECK_VIEW=WxH (e.g. 1280x640) overrides `fallback`. */
export function checkView(fallback) {
	const m = /^(\d+)x(\d+)$/.exec(process.env.CHECK_VIEW ?? '');
	return m ? { width: +m[1], height: +m[2] } : fallback;
}
