/* Console mode's no-scroll layout (?view=console, the center's console panel; the owner's rule: no
   pop-up ever scrolls). The control column shows one workflow step at a time: the controls of the
   step open (the current one unless the learner reopened a finished one), under chips that sum up
   the finished steps and open them again (step-view.ts decides which). ct-suite.html marks each
   control with the step and block it belongs to (data-cs="3b": step 3, block b); this moves the
   marked controls into one body a step, so their ids, handlers and the workflow rules in console.ts
   stay as they are, and hides what is left (the step list, the duplicate readouts and the room's
   demo toggles, which do nothing without the room). When the open step's blocks do not fit, they go
   on pages with the center's pager bar (‹, "1 / 2", ›, ArrowLeft / ArrowRight; pager-math.ts). The
   message log shows its newest lines only, hiding older ones instead of scrolling. main.ts calls
   initConsoleLayout in console mode only; the normal suite keeps its own layout. */
import { breakPages, pageStep } from '../../../sim-hub/src/pager-math';
import { S, stepListeners } from './console';
import {
	chipName,
	chipText,
	openAfterTap,
	stepChips,
	STEP_COUNT,
	type StepFacts
} from './step-view';

const OFF = 'pgOff'; // a block on another page, or a log line too old to fit
const FUZZ = 0.5; // sub-pixel heights: a block this much too tall still fits

const px = (v: string) => parseFloat(v) || 0;
const outerHeight = (el: HTMLElement) => {
	const cs = getComputedStyle(el);
	return el.getBoundingClientRect().height + px(cs.marginTop) + px(cs.marginBottom);
};
const text = (id: string) => document.getElementById(id)?.textContent?.trim() ?? '';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] {
	const e = document.createElement(tag);
	e.className = cls;
	return e;
}

/** What the finished steps' chips show, read from the suite's state and its own readouts. */
function facts(): StepFacts {
	return {
		protocol: S.proto?.name ?? '',
		habitus: S.selectedHabitus,
		kv: S.techKv,
		mas: S.techMas,
		iso: text('botIso'),
		rangeStart: text('rangeStartLbl'),
		rangeEnd: text('rangeEndLbl')
	};
}

export function initConsoleLayout() {
	const ctl = document.querySelector<HTMLElement>('.ctl');
	if (!ctl) return;
	const sections = [...ctl.children] as HTMLElement[];
	const chipBar = el('div', 'cs-chips'),
		chips: HTMLButtonElement[] = [],
		bodies: HTMLElement[] = [];
	ctl.appendChild(chipBar);
	for (let n = 1; n <= STEP_COUNT; n++) {
		const chip = el('button', 'cs-chip');
		chip.type = 'button';
		chip.dataset.csChip = String(n);
		chip.addEventListener('click', () => {
			open = openAfterTap(n, open, S.step, S.scanning);
			page = 0;
			refresh();
		});
		chipBar.appendChild(chip);
		chips[n] = chip;
		const body = el('div', 'cs-body');
		body.dataset.csStep = String(n);
		ctl.appendChild(body);
		bodies[n] = body;
	}
	// the habitus box's footnote is a block of its own (2a1), so a short frame can page it apart from
	// the cue and the size buttons
	const rule = ctl.querySelector<HTMLElement>('.habitus-box .tech-rule');
	if (rule) {
		rule.dataset.cs = '2a1';
		rule.parentElement?.after(rule);
	}
	// the marked controls, a block per mark, in mark order (the HTML's order differs: positioning
	// comes after window / level there)
	const marks = new Map<string, HTMLElement[]>();
	ctl.querySelectorAll<HTMLElement>('[data-cs]').forEach((c) => {
		const key = c.dataset.cs as string;
		marks.set(key, [...(marks.get(key) ?? []), c]);
	});
	[...marks.keys()].sort().forEach((key) => {
		const block = el('div', 'cs-block');
		block.dataset.csBlock = key;
		block.append(...(marks.get(key) as HTMLElement[]));
		bodies[+key[0]]?.appendChild(block);
	});
	sections.forEach((s) => s.classList.add('cs-left'));

	// the pager bar, as the center's (sim-hub pager.ts)
	const bar = el('div', 'pager'),
		prev = el('button', ''),
		count = el('span', 'pgCount'),
		next = el('button', '');
	prev.type = next.type = 'button';
	prev.textContent = '‹';
	next.textContent = '›';
	prev.setAttribute('aria-label', 'Previous page');
	next.setAttribute('aria-label', 'Next page');
	count.setAttribute('aria-live', 'polite');
	bar.append(prev, count, next);
	bar.hidden = true;
	ctl.appendChild(bar);

	// The console opens on the protocol (main.ts has loaded the first one, so the suite is on step 2):
	// the learner picks a protocol, or goes on with the one loaded.
	let open = 1,
		page = 0,
		pages: HTMLElement[][] = [];

	/** Splits the open step's blocks into pages that fit the column; one page hides the bar. */
	function layout() {
		const body = bodies[open],
			blocks = [...body.children] as HTMLElement[];
		blocks.forEach((b) => b.classList.remove(OFF));
		bar.hidden = true;
		const cs = getComputedStyle(ctl),
			gap = px(cs.rowGap),
			avail = ctl.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
		let room = avail - (chipBar.hidden ? 0 : chipBar.offsetHeight + gap);
		const heights = blocks.map(outerHeight),
			blockGap = px(getComputedStyle(body).rowGap);
		let split = breakPages(heights, room + FUZZ, blockGap);
		if (split.length > 1) {
			bar.hidden = false; // the bar takes its room from the pages
			room -= outerHeight(bar) + gap;
			split = breakPages(heights, room + FUZZ, blockGap);
		}
		pages = split.map((p) => p.map((i) => blocks[i]));
		page = Math.max(0, Math.min(page, pages.length - 1));
		pages.forEach((p, i) => p.forEach((b) => b.classList.toggle(OFF, i !== page)));
		const label = `${page + 1} / ${pages.length}`;
		if (count.textContent !== label) count.textContent = label;
		prev.disabled = page === 0;
		next.disabled = page >= pages.length - 1;
		// a button that just went disabled drops the focus: hand it to the other one (as pager.ts)
		if (document.activeElement === prev && prev.disabled) next.focus();
		if (document.activeElement === next && next.disabled) prev.focus();
	}

	/** Draws the chips and the open step, then pages it. */
	function refresh() {
		watch.disconnect();
		const shown = stepChips(S.step, open, S.scanning),
			f = facts();
		chips.forEach((chip, n) => {
			const c = shown.find((s) => s.n === n);
			chip.hidden = !c;
			if (!c) return;
			const t = chipText(c, f),
				name = chipName(c, f);
			if (chip.textContent !== t) chip.textContent = t;
			if (chip.title !== name) chip.title = name;
			chip.classList.toggle('back', c.kind === 'back');
			chip.setAttribute('aria-expanded', String(c.open));
			chip.disabled = c.disabled;
		});
		chipBar.hidden = !shown.length;
		bodies.forEach((b, n) => b.classList.toggle('open', n === open));
		layout();
		watch.observe(ctl, WATCH);
	}

	// any change in the column (a message shown, a control enabled) can change what fits
	const watch = new MutationObserver(refresh),
		WATCH: MutationObserverInit = {
			subtree: true,
			childList: true,
			characterData: true,
			attributes: true,
			attributeFilter: ['class', 'style', 'disabled', 'hidden']
		};
	stepListeners.push((n) => {
		open = n;
		page = 0;
		refresh();
	});
	const turn = (step: number) => {
		page += step;
		refresh();
	};
	prev.addEventListener('click', () => turn(-1));
	next.addEventListener('click', () => turn(1));
	addEventListener('keydown', (e) => {
		if (e.defaultPrevented || bar.hidden) return;
		const step = pageStep(e, document.activeElement?.tagName ?? '');
		if (!step) return;
		e.preventDefault();
		turn(step);
	});
	// the column's room changes with the window and with the bottom bar (a status that wraps)
	new ResizeObserver(() => refresh()).observe(ctl);
	refresh();
	fitLog();
}

/** The message log in console mode: newest first (console.ts log), as many whole lines as fit, the
    older ones hidden; laid out again on each new line and when the log's box changes size. */
function fitLog() {
	const log = document.getElementById('log');
	if (!log) return;
	const fit = () => {
		const lines = [...log.children] as HTMLElement[];
		lines.forEach((l) => l.classList.remove(OFF));
		const bottom = log.clientHeight - px(getComputedStyle(log).paddingBottom);
		let full = false;
		lines.forEach((l, i) => {
			// the newest line always shows (it is clamped to the log's height in ct-suite.html)
			full ||= i > 0 && l.offsetTop + l.offsetHeight > bottom + FUZZ;
			l.classList.toggle(OFF, full);
		});
	};
	new MutationObserver(fit).observe(log, { childList: true });
	new ResizeObserver(fit).observe(log);
	fit();
}
