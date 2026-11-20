// No-scroll guard for the browser checks (the owner's rule: no console screen, no pop-up, ever
// scrolls; content that does not fit splits into pages or gets a compact layout instead).
//
// `scrollAreas(target)` runs one evaluate in a Playwright Frame or Page and returns every area
// that scrolls or could: the document itself (taller or wider than the window by over 2 px) and
// every displayed element with overflow auto/scroll whose content is over 4 px taller or wider
// than its box. Zero-size, visibility:hidden and display:none elements are ignored.
// `cutOffs(target)` finds what is cut off instead (the site-size rule: nothing scrolls and nothing
// is cut off): every displayed control, label, row and piece of text that reaches past the window
// or past the box of an ancestor that clips it (overflow hidden or clip, or auto or scroll unless
// that ancestor is a pager page, whose blocks the pager shows a page at a time). Left out as meant
// to be hidden: display:none, visibility:hidden, opacity 0, zero-size (under 2 px) and what a
// zero-size box clips, aria-hidden, the pager's off-page blocks (.pgOff), svg drawings and a
// select's options.
// `createNoScrollCollector()` records those areas at named moments, each area once (the largest
// hidden amount wins), and does the cut-off scan too when the target is a console's iframe (a
// Playwright Frame with a parent frame); `fail()` words both for the check's "NO-SCROLL FAIL"
// line, the scrolling areas first and then a "cut off" section.
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

/** Every control, label, row and text in `target`'s document (a Playwright Frame or Page) that is
    cut off: past the window's edge or clipped by an ancestor, by more than 1 px. Elements of the
    same name in the same owner and clipped by the same box count as one entry, with how many
    there are and the worst overflow. Null if the frame went away mid-scan. */
export async function cutOffs(target) {
	return target
		.evaluate(() => {
			const vw = innerWidth;
			const vh = innerHeight;
			const CONTROL =
				'button,input,select,textarea,a[href],label,summary,[role="button"],[role="tab"],[role="checkbox"],[role="radio"],[role="switch"],[role="link"],[role="menuitem"],[role="option"]';
			const ROW = 'tr,li,[role="row"]';
			const SKIP = '.pgOff, [aria-hidden="true"], svg, script, style, template, noscript';
			const nameOf = (el) =>
				el.id
					? '#' + el.id
					: el.tagName.toLowerCase() +
						(el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
			const styles = new Map();
			const css = (el) => {
				let cs = styles.get(el);
				if (!cs) styles.set(el, (cs = getComputedStyle(el)));
				return cs;
			};
			// a pager page: the box the pager shows its blocks in (the bar beside it or in it)
			const pagerPage = (el) =>
				el.nextElementSibling?.classList.contains('pager') || !!el.querySelector(':scope > .pager');
			const lifts = (cs) =>
				cs.transform !== 'none' ||
				cs.filter !== 'none' ||
				cs.perspective !== 'none' ||
				/paint|layout|strict|content/.test(cs.contain);
			// the box an element positioned `pos` is laid out in (an absolute or fixed element is not
			// clipped by the boxes it is positioned out of); null for the window
			const container = (el, pos) => {
				if (pos !== 'absolute' && pos !== 'fixed') return el.parentElement;
				for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
					const cs = css(a);
					if (lifts(cs) || (pos === 'absolute' && cs.position !== 'static')) return a;
				}
				return null;
			};
			// The edges that clip `el`'s content, each [px, the clipping element]: those that clip its
			// box, narrowed by its own padding box on the axes its overflow clips; HIDDEN inside a
			// clipping box under 2 px (a visually hidden one). Worked out once per element.
			const VIEW = { left: [0, null], top: [0, null], right: [vw, null], bottom: [vh, null] };
			const HIDDEN = 'hidden';
			const clips = new Map();
			const contentClip = (el) => {
				if (!el || el === document.documentElement) return VIEW;
				let c = clips.get(el);
				if (c) return c;
				const cs = css(el);
				c = contentClip(container(el, cs.position));
				// overflow does not apply to an inline box, display:contents or a table row
				const x = cs.overflowX !== 'visible',
					y = cs.overflowY !== 'visible',
					applies = !/^(inline|contents|table-(row|column|header|footer)(-group)?)$/.test(
						cs.display
					);
				const scrolls = /auto|scroll/.test(cs.overflowX + cs.overflowY);
				if (c !== HIDDEN && (x || y) && applies) {
					if (el.clientWidth < 2 || el.clientHeight < 2) c = HIDDEN;
					else if (!(scrolls && pagerPage(el))) {
						const b = el.getBoundingClientRect();
						const left = b.left + el.clientLeft,
							top = b.top + el.clientTop;
						c = { ...c };
						// on a tie the inner box is named
						if (x && left >= c.left[0]) c.left = [left, el];
						if (x && left + el.clientWidth <= c.right[0]) c.right = [left + el.clientWidth, el];
						if (y && top >= c.top[0]) c.top = [top, el];
						if (y && top + el.clientHeight <= c.bottom[0]) c.bottom = [top + el.clientHeight, el];
					}
				}
				clips.set(el, c);
				return c;
			};
			const clipName = (by, el) => {
				if (!by) return 'the frame edge';
				if (by === el) return `${nameOf(by)} (its own box)`;
				const cs = css(by);
				return `${nameOf(by)} (overflow ${cs.overflowX === cs.overflowY ? cs.overflowX : cs.overflowX + '/' + cs.overflowY})`;
			};
			// the union of the own text nodes' line boxes, or null when it has no text of its own
			const range = document.createRange();
			const textRect = (el) => {
				let r = null;
				for (const n of el.childNodes) {
					if (n.nodeType !== 3 || !n.textContent.trim()) continue;
					range.selectNodeContents(n);
					for (const q of range.getClientRects()) {
						if (q.width < 1 || q.height < 1) continue;
						r = r
							? {
									left: Math.min(r.left, q.left),
									top: Math.min(r.top, q.top),
									right: Math.max(r.right, q.right),
									bottom: Math.max(r.bottom, q.bottom)
								}
							: { left: q.left, top: q.top, right: q.right, bottom: q.bottom };
					}
				}
				return r;
			};
			const found = new Map();
			const check = (el, cs, box) => {
				const r = box ? el.getBoundingClientRect() : textRect(el);
				if (!r || r.right - r.left < 2 || r.bottom - r.top < 2) return;
				// a box is clipped where it is laid out; text by its own element too
				const edge = box ? contentClip(container(el, cs.position)) : contentClip(el);
				if (edge === HIDDEN) return;
				const over = {
					left: edge.left[0] - r.left,
					top: edge.top[0] - r.top,
					right: r.right - edge.right[0],
					bottom: r.bottom - edge.bottom[0]
				};
				const side = Object.keys(over).reduce((a, k) => (over[k] > over[a] ? k : a));
				if (over[side] <= 1) return;
				const item = {
					el: nameOf(el),
					owner: el.parentElement?.closest('[id]')?.id || '',
					size: [Math.round(r.right - r.left), Math.round(r.bottom - r.top)],
					side,
					px: Math.round(over[side]),
					by: clipName(edge[side][1], el),
					count: 1,
					text: (el.innerText || el.value || el.getAttribute('aria-label') || '')
						.trim()
						.replace(/\s+/g, ' ')
						.slice(0, 60)
				};
				const key = `${item.el}|${item.owner}|${item.by}`;
				const prev = found.get(key);
				if (!prev) found.set(key, item);
				else {
					prev.count++;
					if (item.px > prev.px) found.set(key, { ...item, count: prev.count });
				}
			};
			// down the tree, leaving out what is not shown (display:none, opacity 0) or meant hidden
			const visit = (el) => {
				if (el.matches(SKIP)) return;
				const cs = css(el);
				if (cs.display === 'none' || cs.opacity === '0') return;
				const control = el.matches(CONTROL);
				if (cs.visibility === 'visible' && cs.display !== 'contents')
					check(el, cs, control || el.matches(ROW));
				// what is inside a control is measured as the control
				if (!control) for (const c of el.children) visit(c);
			};
			for (const c of document.body.children) visit(c);
			return { frame: [vw, vh], items: [...found.values()] };
		})
		.catch(() => null);
}

/** Collects scroll areas over a whole run, and the cut-off elements of each console iframe
    scanned. `scan(target, moment)` records `target`'s areas (and, for an iframe, its cut-offs);
    `fail()` returns the "NO-SCROLL FAIL: ..." text, or null when nothing scrolled or was cut off. */
export function createNoScrollCollector() {
	const seen = new Map();
	const cut = new Map();
	let scans = 0;
	let cutScans = 0;
	return {
		get scans() {
			return scans;
		},
		/** How many cut-off scans ran (one per console iframe scanned). */
		get cutScans() {
			return cutScans;
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
			// a Playwright Page has no parentFrame; the center's own page is not a console
			if (typeof target.parentFrame !== 'function' || !target.parentFrame()) return;
			const c = await cutOffs(target);
			if (!c) return;
			cutScans++;
			for (const it of c.items) {
				const key = `${c.frame.join('x')}|${it.el}|${it.owner}|${it.by}`;
				const prev = cut.get(key);
				if (!prev || it.px > prev.px)
					cut.set(key, {
						...it,
						count: Math.max(it.count, prev?.count ?? 0),
						frame: c.frame.join('x'),
						moment
					});
				else prev.count = Math.max(prev.count, it.count);
			}
		},
		fail() {
			if (!seen.size && !cut.size) return null;
			const rows = [...seen.values()].sort(
				(a, b) => b.hiddenY + b.hiddenX - (a.hiddenY + a.hiddenX)
			);
			const lines = rows.map(
				(a) =>
					`  [${a.frame}] ${a.el}${a.owner ? ` (in #${a.owner})` : ''} ${a.size.join('x')} hides ${a.hiddenY} px down, ${a.hiddenX} px across; first seen ${a.moment}${a.text ? `; "${a.text}"` : ''}`
			);
			const cuts = [...cut.values()].sort((a, b) => b.px - a.px);
			const cutLines = cuts.map(
				(c) =>
					`  [${c.frame}] ${c.el}${c.count > 1 ? ` x${c.count}` : ''}${c.owner ? ` (in #${c.owner})` : ''} ${c.size.join('x')} cut ${c.px} px at the ${c.side} by ${c.by}; seen ${c.moment}${c.text ? `; "${c.text}"` : ''}`
			);
			const head = `NO-SCROLL FAIL: ${rows.length} scrolling area${rows.length === 1 ? '' : 's'}${cuts.length ? `, ${cuts.length} cut off` : ''}`;
			return [
				head,
				...lines,
				...(cuts.length ? [`  cut off (${cuts.length}):`, ...cutLines] : [])
			].join('\n');
		}
	};
}

/** The check's viewport: CHECK_VIEW=WxH (e.g. 1280x640) overrides `fallback`. */
export function checkView(fallback) {
	const m = /^(\d+)x(\d+)$/.exec(process.env.CHECK_VIEW ?? '');
	return m ? { width: +m[1], height: +m[2] } : fallback;
}
