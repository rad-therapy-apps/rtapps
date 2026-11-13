/* Pop-up pages (the owner's rule: no pop-up shows a scrollbar). A paged pop-up's content is a list of
   blocks; when they do not fit the room the pop-up has, they split into pages shown one at a time,
   and a bar under them holds ‹, the count ("1 / 2") and ›. When everything fits, the bar hides.
   Pages break between blocks, never inside one (pager-math.ts breakPages); the staff dialogue gives
   each exchange a page of its own instead. The pages are laid out again when the pop-up opens (its
   owner calls open), when the body's content changes and when the window resizes. One keydown
   listener turns the pages of the open paged pop-up with ArrowLeft and ArrowRight, the most
   recently opened when two are, unless focus is in a field (pager-math.ts pageStep). Used by
   interact.ts (staff dialogue, equipment panel, LINAC head lab, CT QA lab) and menu.ts (Help).
   index.html holds the bar's look (.pager) and the hidden blocks' rule (.pgOff). */
import { breakPages, pageStep } from './pager-math';

export interface Pager {
	/** The pop-up was just shown: lays it out on its first page and gives it the arrow keys. */
	open(): void;
	/** Lays the blocks out again and shows page `i` (from 0, clamped to the pages there are). */
	go(i: number): void;
	/** Lays the blocks out again, keeping the page shown. */
	refresh(): void;
}

export interface PagerOptions {
	/** Whether the pop-up is shown; nothing is laid out while it is not. */
	isOpen: () => boolean;
	/** The element the blocks sit in. It takes the room it has and no more (flex: 1 1 auto;
	    min-height: 0; overflow: hidden). A change to its content lays the pages out again. */
	body: HTMLElement;
	/** The blocks, in order; the body's children unless given. */
	blocks?: () => HTMLElement[];
	/** The bar's empty host, where the bar goes. */
	bar: HTMLElement;
	/** The element whose max-height bounds the body; it is held at that height while the room is
	    measured. */
	card?: HTMLElement;
	/** Every block gets a page of its own (the staff dialogue's exchanges). */
	each?: boolean;
	/** Runs before each layout (the head lab sizes its schematic there). */
	prepare?: () => void;
}

const OFF = 'pgOff'; // a block on another page: index.html .pgOff { display: none !important }
const FUZZ = 0.5; // sub-pixel heights: a block this much too tall still fits

interface Live {
	isOpen: () => boolean;
	openedAt: number;
	turn: (step: number) => void;
	refresh: () => void;
}
const live: Live[] = [];
let openCount = 0;

const px = (v: string) => parseFloat(v) || 0;

function outerHeight(el: HTMLElement): number {
	const cs = getComputedStyle(el);
	return el.getBoundingClientRect().height + px(cs.marginTop) + px(cs.marginBottom);
}

function barButton(label: string, name: string): HTMLButtonElement {
	const b = document.createElement('button');
	b.type = 'button';
	b.textContent = label;
	b.setAttribute('aria-label', name);
	return b;
}

function onKey(e: KeyboardEvent): void {
	if (e.defaultPrevented) return;
	const step = pageStep(e, document.activeElement?.tagName ?? '');
	if (!step) return;
	const newest = live
		.filter((p) => p.isOpen())
		.reduce<Live | null>((a, p) => (!a || p.openedAt > a.openedAt ? p : a), null);
	if (!newest) return;
	e.preventDefault();
	newest.turn(step);
}

export function createPager(o: PagerOptions): Pager {
	const blocksOf = o.blocks ?? (() => [...o.body.children] as HTMLElement[]);
	const prev = barButton('‹', 'Previous page'),
		next = barButton('›', 'Next page'),
		count = document.createElement('span');
	count.className = 'pgCount';
	count.setAttribute('aria-live', 'polite');
	o.bar.appendChild(prev);
	o.bar.appendChild(count);
	o.bar.appendChild(next);
	let pages: HTMLElement[][] = [],
		page = 0;

	/** The height the body's content may take, with the card at its tallest. */
	function room(): number {
		const card = o.card,
			held = card?.style.height ?? '';
		if (card) card.style.height = getComputedStyle(card).maxHeight;
		const cs = getComputedStyle(o.body),
			h = o.body.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
		if (card) card.style.height = held;
		return h;
	}

	function layout(): void {
		o.prepare?.();
		const blocks = blocksOf();
		blocks.forEach((b) => b.classList.remove(OFF));
		if (o.each) {
			pages = blocks.map((b) => [b]);
			o.bar.hidden = pages.length < 2;
			return;
		}
		o.bar.hidden = true;
		const gap = px(getComputedStyle(blocks[0]?.parentElement ?? o.body).rowGap),
			heights = blocks.map(outerHeight);
		let split = breakPages(heights, room() + FUZZ, gap);
		if (split.length > 1) {
			o.bar.hidden = false; // the bar takes its room from the pages
			split = breakPages(heights, room() + FUZZ, gap);
		}
		pages = split.map((p) => p.map((i) => blocks[i]));
	}

	function show(): void {
		page = Math.max(0, Math.min(page, pages.length - 1));
		pages.forEach((p, i) => p.forEach((b) => b.classList.toggle(OFF, i !== page)));
		const text = `${page + 1} / ${pages.length}`;
		if (count.textContent !== text) count.textContent = text;
		prev.disabled = page === 0;
		next.disabled = page >= pages.length - 1;
		// a button that just went disabled drops the focus: hand it to the other one
		if (document.activeElement === prev && prev.disabled) next.focus();
		if (document.activeElement === next && next.disabled) prev.focus();
	}

	function go(i: number): void {
		if (!o.isOpen()) return;
		layout();
		page = i;
		show();
	}

	const self: Live = {
		isOpen: o.isOpen,
		openedAt: 0,
		turn: (step) => go(page + step),
		refresh: () => go(page)
	};
	if (!live.length) {
		document.addEventListener('keydown', onKey);
		window.addEventListener('resize', () => live.forEach((p) => p.refresh()));
	}
	live.push(self);
	prev.addEventListener('click', () => go(page - 1));
	next.addEventListener('click', () => go(page + 1));
	new MutationObserver(() => go(page)).observe(o.body, {
		childList: true,
		characterData: true,
		subtree: true
	});

	return {
		open() {
			self.openedAt = ++openCount;
			go(0);
		},
		go,
		refresh: () => go(page)
	};
}
