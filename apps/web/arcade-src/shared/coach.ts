/* The Tutorial's spotlight (docs/specs/2026-11-23-tutorial-walkthrough-design.md, "The spotlight"):
   a dim layer over the page with cut-outs onto the one thing to use next, and a bubble beside them
   that says what to do and how it works. DOM only, no three.js, so the center (sim-hub
   tutorial-guide.ts) and the LINAC console (linac-ct walkthrough-mode.ts) both use it; its pure
   geometry is coach-geometry.ts. A caller calls showCoach with the current sub-step as often as it
   likes (each frame is fine: the same view is not rebuilt), and hideCoach when the walkthrough
   ends. */

import { holesPath, HOLE_RADIUS, padRect, placeBubble, union } from './coach-geometry';
import type { Placement, Rect, Size } from './coach-geometry';

export type CoachDim = 'full' | 'light' | 'none';

export interface CoachView {
	/** The cut-outs: the elements to use now (none for a sub-step with nothing to point at). */
	targets: readonly Element[];
	/** A drag: the item and where it goes, both cut out, with a dashed arrow between them. */
	drag?: { from: Element; to: Element };
	/** 'full' 66%, 'light' 34%, 'none' no dim layer (the bubble only). */
	dim: CoachDim;
	/** Clicks, drags and keys outside the cut-outs do nothing (Esc, Tab, key releases, and keys
	    aimed at a focused cut-out or at the bubble still work). With dim 'none' there is no lock at
	    all: no key filter and no press stop. */
	lock: boolean;
	/** The part's name, in the bubble's header beside the dots. */
	header: string;
	/** One dot per sub-step: those before `index` done, `index` the current one. */
	dots: { count: number; index: number };
	text: { do: string; why: string };
	/** 'next': a sub-step that only explains; 'wait': one the player does, with its cue. */
	footer: { kind: 'next' } | { kind: 'wait'; cue: string };
	onNext?: () => void;
	onSkip: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'rtCoachStyle';
const DIM_ALPHA: Record<CoachDim, number> = { full: 0.66, light: 0.34, none: 0 };
/** The pointer: a square turned 45°, centred on the bubble's edge (half its diagonal, under
    BUBBLE_GAP, sticks out). */
const PTR = 14;
const FONT = `system-ui, -apple-system, 'Segoe UI', sans-serif`;
/** The keys the lock filters. Key releases always go on, so a key held when a lock begins (W in
    the center) is not left down. */
const KEYS = ['keydown', 'keypress'];
/** Presses on the dim layer or the bubble stop at the root, so the page's own listeners (a
    document click, the center's mouse look) never see them. Moves and releases go on, so a drag
    started in a cut-out still ends wherever it is let go. */
const PRESSES = [
	'pointerdown',
	'mousedown',
	'touchstart',
	'click',
	'dblclick',
	'auxclick',
	'contextmenu'
];

/* The reset reverts every page rule (the LINAC page makes each button full width and green) for
   the coach's HTML. The SVG's children are left out of it because `all: revert` drops their
   presentation attributes (d, x, y, width, height, rx, fill are CSS properties too), so nothing
   would draw; page-wide svg, path or rect rules can therefore reach them, and the coach's own
   #rtCoach rules below outrank any plain ones. */
const CSS = `
#rtCoach, #rtCoach *:not(svg *) { all: revert; box-sizing: border-box; }
#rtCoach { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }
#rtCoach[hidden] { display: none; }
#rtCoach .rt-coach-layer { position: fixed; left: 0; top: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
#rtCoach .rt-coach-dim { fill-rule: evenodd; stroke: none; }
#rtCoach .rt-coach-ring { fill: none; stroke: #3fd0c9; stroke-width: 2px; animation: rtCoachPulse 1.4s ease-in-out infinite; }
#rtCoach .rt-coach-arrow { fill: none; stroke: #3fd0c9; stroke-width: 2px; stroke-dasharray: 6 5; }
#rtCoach .rt-coach-head { fill: #3fd0c9; stroke: none; }
@keyframes rtCoachPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { #rtCoach .rt-coach-ring { animation: none; } }
#rtCoach .rt-coach-bubble { position: fixed; left: 0; top: 0; width: min(360px, 100vw - 16px); padding: 16px 18px 14px; border-radius: 12px; background: #f6f9fb; color: #13202b; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45); font: 400 13px/1.45 ${FONT}; text-align: left; pointer-events: auto; }
#rtCoach .rt-coach-ptr { position: absolute; z-index: -1; width: ${PTR}px; height: ${PTR}px; background: #f6f9fb; transform: rotate(45deg); }
#rtCoach .rt-coach-kick { display: flex; align-items: center; gap: 10px; font: 700 12px/1.2 ${FONT}; letter-spacing: 0.08em; text-transform: uppercase; color: #1e8f8a; }
#rtCoach .rt-coach-dots { display: flex; gap: 5px; }
#rtCoach .rt-coach-dot { display: block; width: 8px; height: 8px; border-radius: 50%; background: #c9d6de; }
#rtCoach .rt-coach-dot-done { background: #1e8f8a; }
#rtCoach .rt-coach-dot-now { background: #f0a640; box-shadow: 0 0 0 3px rgba(240, 166, 64, 0.3); }
#rtCoach .rt-coach-do { margin: 9px 0 6px; font: 700 15px/1.3 ${FONT}; color: #13202b; }
#rtCoach .rt-coach-why { margin: 0; font: 400 13px/1.45 ${FONT}; color: #4a5b68; }
#rtCoach .rt-coach-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 12px; }
#rtCoach .rt-coach-skip { margin: 0; padding: 0; border: 0; background: none; font: 500 12px/1.2 ${FONT}; color: #6c7c88; text-decoration: underline; cursor: pointer; }
#rtCoach .rt-coach-next { margin: 0; padding: 8px 18px; border: 0; border-radius: 6px; background: #1e8f8a; color: #fff; font: 700 13px/1 ${FONT}; cursor: pointer; }
#rtCoach .rt-coach-cue { font: 500 12px/1.2 ${FONT}; color: #1e8f8a; }
#rtCoach .rt-coach-skip:focus-visible, #rtCoach .rt-coach-next:focus-visible { outline: 2px solid #3fd0c9; outline-offset: 2px; }
`;

interface Dom {
	root: HTMLDivElement;
	dim: SVGPathElement;
	ringLayer: SVGGElement;
	rings: SVGRectElement[];
	arrow: SVGLineElement;
	bubble: HTMLDivElement;
	ptr: HTMLSpanElement;
	header: HTMLSpanElement;
	dots: HTMLSpanElement;
	doLine: HTMLParagraphElement;
	why: HTMLParagraphElement;
	foot: HTMLDivElement;
	/** The footer's right side: Next or the cue. */
	end: HTMLElement | null;
}

let dom: Dom | null = null;
/** The view shown: its callbacks are the ones the buttons call. */
let current: CoachView | null = null;
let shown = false;
let looping = false;
let raf = 0;
let filtering = false;
/** What the bubble and the layer show now, to write the DOM only when it changes. */
let contentKey = '';
let layoutKey = '';
/** The elements that have a cut-out now: keys go through while one of them holds the focus. */
let holeEls: Element[] = [];

const r1 = (v: number) => Math.round(v * 10) / 10;

function html<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	cls: string,
	parent: Node
): HTMLElementTagNameMap[K] {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	parent.appendChild(e);
	return e;
}

function svg<K extends keyof SVGElementTagNameMap>(
	tag: K,
	cls: string,
	parent: Node,
	attrs: Record<string, string> = {}
): SVGElementTagNameMap[K] {
	const e = document.createElementNS(SVG_NS, tag);
	if (cls) e.setAttribute('class', cls);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
	parent.appendChild(e);
	return e;
}

function build(): Dom {
	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = CSS;
		(document.head ?? document.body).appendChild(style);
	}
	const root = document.createElement('div');
	root.id = 'rtCoach';
	root.setAttribute('aria-live', 'polite');
	const layer = svg('svg', 'rt-coach-layer', root, { 'aria-hidden': 'true' });
	const marker = svg('marker', '', svg('defs', '', layer), {
		id: 'rtCoachArrowHead',
		viewBox: '0 0 10 10',
		refX: '9',
		refY: '5',
		markerWidth: '6',
		markerHeight: '6',
		orient: 'auto'
	});
	svg('path', 'rt-coach-head', marker, { d: 'M0 0L10 5L0 10Z' });
	const dim = svg('path', 'rt-coach-dim', layer);
	const ringLayer = svg('g', '', layer);
	const arrow = svg('line', 'rt-coach-arrow', layer, { 'marker-end': 'url(#rtCoachArrowHead)' });
	const bubble = html('div', 'rt-coach-bubble', root);
	const ptr = html('span', 'rt-coach-ptr', bubble);
	const kick = html('div', 'rt-coach-kick', bubble);
	const header = html('span', '', kick);
	const dots = html('span', 'rt-coach-dots', kick);
	dots.setAttribute('aria-hidden', 'true');
	const doLine = html('p', 'rt-coach-do', bubble);
	const why = html('p', 'rt-coach-why', bubble);
	const foot = html('div', 'rt-coach-foot', bubble);
	const skip = html('button', 'rt-coach-skip', foot);
	skip.type = 'button';
	skip.textContent = 'Skip walkthrough';
	skip.addEventListener('click', () => current?.onSkip());
	for (const type of PRESSES) root.addEventListener(type, onPress);
	root.addEventListener('keydown', onBubbleKey);
	root.addEventListener('keypress', onBubbleKey);
	document.body.appendChild(root);
	return {
		root,
		dim,
		ringLayer,
		rings: [],
		arrow,
		bubble,
		ptr,
		header,
		dots,
		doLine,
		why,
		foot,
		end: null
	};
}

/** Writes the bubble's header, dots, text and footer; returns the Next button if it has one. */
function fill(v: CoachView, d: Dom): HTMLButtonElement | null {
	d.header.textContent = v.header;
	d.dots.textContent = '';
	for (let i = 0; i < v.dots.count; i++)
		html(
			'i',
			i < v.dots.index
				? 'rt-coach-dot rt-coach-dot-done'
				: i === v.dots.index
					? 'rt-coach-dot rt-coach-dot-now'
					: 'rt-coach-dot',
			d.dots
		);
	d.doLine.textContent = v.text.do;
	d.why.textContent = v.text.why;
	if (d.end) d.foot.removeChild(d.end);
	if (v.footer.kind === 'next') {
		const next = html('button', 'rt-coach-next', d.foot);
		next.type = 'button';
		next.textContent = 'Next';
		next.addEventListener('click', () => current?.onNext?.());
		d.end = next;
		return next;
	}
	d.end = html('span', 'rt-coach-cue', d.foot);
	d.end.textContent = v.footer.cue;
	return null;
}

/** An element's cut-out, or null while it is hidden (an empty rect). */
function holeOf(e: Element): Rect | null {
	const r = e.getBoundingClientRect();
	return r.width > 0 && r.height > 0
		? padRect({ x: r.left, y: r.top, w: r.width, h: r.height })
		: null;
}

/** The drag's arrow: from the item's centre to where the line toward the drop zone's centre meets
    the zone's edge. */
function arrowLine(a: Rect, b: Rect): { x1: number; y1: number; x2: number; y2: number } {
	const x1 = a.x + a.w / 2,
		y1 = a.y + a.h / 2,
		dx = b.x + b.w / 2 - x1,
		dy = b.y + b.h / 2 - y1,
		tx = dx > 0 ? (b.x - x1) / dx : dx < 0 ? (b.x + b.w - x1) / dx : 0,
		ty = dy > 0 ? (b.y - y1) / dy : dy < 0 ? (b.y + b.h - y1) / dy : 0,
		t = Math.min(Math.max(tx, ty, 0), 1);
	return { x1, y1, x2: x1 + dx * t, y2: y1 + dy * t };
}

function placePointer(d: Dom, at: Placement, size: Size): void {
	const s = d.ptr.style,
		half = PTR / 2;
	s.display = at.side ? '' : 'none';
	if (at.side === 'below' || at.side === 'above') {
		s.left = `${r1(at.pointer - half)}px`;
		s.top = `${r1(at.side === 'below' ? -half : size.h - half)}px`;
	} else if (at.side) {
		s.left = `${r1(at.side === 'right' ? -half : size.w - half)}px`;
		s.top = `${r1(at.pointer - half)}px`;
	}
}

/** Measures the cut-outs and the bubble, and writes the layer and the bubble's place when a
    number changed. */
function layout(v: CoachView, d: Dom): void {
	const els = [...v.targets];
	if (v.drag) for (const e of [v.drag.from, v.drag.to]) if (!els.includes(e)) els.push(e);
	const holes: Rect[] = [];
	holeEls = [];
	for (const e of els) {
		const h = holeOf(e);
		if (h) {
			holes.push(h);
			holeEls.push(e);
		}
	}
	const page = { w: window.innerWidth, h: window.innerHeight },
		b = d.bubble.getBoundingClientRect(),
		size = { w: b.width, h: b.height },
		at = placeBubble(page, union(holes), size, holes),
		from = v.drag ? holeOf(v.drag.from) : null,
		to = v.drag ? holeOf(v.drag.to) : null,
		arrow = from && to ? arrowLine(from, to) : null;
	const key = JSON.stringify([page, holes, size, at, arrow, v.dim, v.lock]);
	if (key === layoutKey) return;
	layoutKey = key;

	d.dim.style.display = v.dim === 'none' ? 'none' : '';
	d.dim.style.fill = `rgba(6,12,18,${DIM_ALPHA[v.dim]})`;
	d.dim.style.pointerEvents = v.lock ? 'visiblePainted' : 'none';
	d.dim.setAttribute('d', holesPath(page, holes));
	holes.forEach((h, i) => {
		const ring = (d.rings[i] ??= svg('rect', 'rt-coach-ring', d.ringLayer, {
			rx: String(HOLE_RADIUS)
		}));
		ring.setAttribute('x', String(r1(h.x)));
		ring.setAttribute('y', String(r1(h.y)));
		ring.setAttribute('width', String(r1(h.w)));
		ring.setAttribute('height', String(r1(h.h)));
	});
	for (const ring of d.rings.splice(holes.length)) d.ringLayer.removeChild(ring);
	d.arrow.style.display = arrow ? '' : 'none';
	if (arrow) for (const [k, n] of Object.entries(arrow)) d.arrow.setAttribute(k, String(r1(n)));
	d.bubble.style.left = `${r1(at.x)}px`;
	d.bubble.style.top = `${r1(at.y)}px`;
	placePointer(d, at, size);
}

/** A press on the dim layer or the bubble stops at the root. On the dim layer it also does nothing
    by default, so a stray press doesn't blur a focused cut-out or start a text selection. With dim
    'none' there is no lock, so presses go on. */
function onPress(e: Event): void {
	if (!dom || current?.dim === 'none') return;
	if (e.target === dom.dim && (e.type === 'pointerdown' || e.type === 'mousedown'))
		e.preventDefault();
	e.stopPropagation();
}

/** Keys aimed at the bubble are its own: Enter, Space and Tab still work on Next and Skip, but the
    page's listeners never see them (the queue's arrow keys turn its page). Esc goes on. */
function onBubbleKey(e: KeyboardEvent): void {
	if (e.key !== 'Escape') e.stopPropagation();
}

/** While a bubble locks: a key goes through when it is Esc or Tab (so the focus can always reach
    the cut-out and the bubble), aimed at the bubble, or pressed while a cut-out's element holds the
    focus; any other stops here, before the page's listeners. */
function onKey(e: KeyboardEvent): void {
	if (e.key === 'Escape' || e.key === 'Tab') return;
	if (dom && e.target instanceof Node && dom.bubble.contains(e.target)) return;
	const focused = document.activeElement;
	if (focused && holeEls.some((h) => h.contains(focused))) return;
	e.preventDefault();
	e.stopImmediatePropagation();
}

function setKeyFilter(on: boolean): void {
	if (on === filtering) return;
	filtering = on;
	for (const type of KEYS)
		if (on) window.addEventListener(type, onKey, true);
		else window.removeEventListener(type, onKey, true);
}

/* The coach's own frames: the center pauses its game during an explain, so the caller's frames
   can't be relied on to follow layout changes and resizes. */
function tick(): void {
	looping = false;
	if (!shown || !current || !dom) return;
	layout(current, dom);
	loop();
}

function loop(): void {
	if (looping || typeof requestAnimationFrame !== 'function') return;
	looping = true;
	raf = requestAnimationFrame(tick);
}

/** Shows `view`, replacing the one shown. */
export function showCoach(view: CoachView): void {
	current = view;
	dom ??= build();
	if (!shown) {
		dom.root.removeAttribute('hidden');
		shown = true;
	}
	const key = JSON.stringify([view.header, view.dots, view.text, view.footer]);
	const nextButton = key !== contentKey ? fill(view, dom) : null;
	contentKey = key;
	setKeyFilter(view.lock && view.dim !== 'none');
	layout(view, dom);
	nextButton?.focus({ preventScroll: true });
	loop();
}

/** Hides the spotlight and its bubble, and drops the key filter. The root stays in the page,
    hidden, so its live region is there before the next bubble's text. */
export function hideCoach(): void {
	setKeyFilter(false);
	if (looping && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
	looping = false;
	current = null;
	holeEls = [];
	contentKey = '';
	layoutKey = '';
	shown = false;
	if (!dom) return;
	dom.root.setAttribute('hidden', '');
	// a hidden Next keeps the focus otherwise, and the root would go on stopping the page's keys
	const focused = document.activeElement as HTMLElement | null;
	if (focused && dom.root.contains(focused)) focused.blur();
}

/** Whether the spotlight is showing. */
export function coachShown(): boolean {
	return shown;
}
