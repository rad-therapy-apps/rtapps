/* Console mode, no scroll: the owner's rule for the center's pop-ups (no pop-up ever needs
   scrolling) on the LINAC console in the center's panel, at every panel size: screen 2's windows,
   and the chart's keys in narrow frames.
   - The R&V delivery window keeps its patient column, the beam keys and the interlocks in view. Its
     plan / actual tables are tabs beside the interlocks (Interlocks · Beam · Geometry), and the
     Interlocks tab counts the holds, so what blocks Beam On shows from any tab. The interlocks list
     the failing ones first with their reasons, then the passed ones as chips, or as one count line
     when the chips do not fit.
   - Charge capture keeps its two choices and its Verify and Post buttons in view, with the code
     guide, the image-guidance notes and the result as tabs above them; each choice and button shows
     the tab that explains it.
   - Patient Setup's instructions page when the window is too short for the whole order (the
     narrow frames' two-column setup gives the order the room the shelf and table leave).
   - In narrow, short frames the chart's Machine / Imaging keys show one tab at a time (Imaging &
     Couch · Beam & Workflows) beside the open window, and opening image guidance or delivery brings
     up the tab of keys that step presses (console-fit.ts keyTabFor). Elsewhere the bar is hidden
     and every key shows.
   A tab whose blocks still do not fit (a long list of holds, a long result on the smallest panel)
   splits into pages under a bar with ‹, the count and ›, turned with ArrowLeft / ArrowRight too, as
   the center's pop-ups are; pages break between blocks and the bar hides when everything fits
   (rules in console-fit.ts). The look is index.html's "console mode, no scroll" block.
   console-patch.ts starts it (installConsoleScreens) and hands it the interlocks each time it paints
   the delivery screen (renderInterlocks). Outside console mode nothing here runs. */
import { pageStep } from '../../sim-hub/src/pager-math';
import {
	chargeTabFor,
	fitBlocks,
	fitInterlocks,
	interlockBadge,
	keyTabFor,
	splitInterlocks,
	type ChargeAction,
	type ChargeTab,
	type Interlock,
	type KeyTab
} from './console-fit';
import { S } from './state';

const OFF = 'pgOff'; // a block on another page (index.html: .pgOff { display: none !important })

const $ = (id: string) => document.getElementById(id);
const px = (v: string) => parseFloat(v) || 0;

function outerHeight(el: HTMLElement): number {
	const cs = getComputedStyle(el);
	return el.getBoundingClientRect().height + px(cs.marginTop) + px(cs.marginBottom);
}

function esc(s: unknown): string {
	return String(s ?? '').replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
	);
}

/* ----- paged panes ----- */
interface Paged {
	/** Lays the blocks out again, keeping the page shown (clamped to the pages there are). */
	layout(): void;
	/** Lays the blocks out again and shows page `i`, from 0. */
	go(i: number): void;
}
const pagedPanes: { host: HTMLElement; bar: HTMLElement; turn: (step: number) => void }[] = [];

/** A pane whose blocks sit in `host` (a flex child that takes the room it has: flex 1 1 0,
    min-height 0), with a page bar after it. `plan` measures the blocks with the bar hidden, or
    again with it shown when they need pages, and says which block goes on which page. Laid out
    again when the host's room changes (its tab shown, a resize) and, with `watch`, when its
    content does. */
function pagedPane(
	host: HTMLElement,
	plan: () => { blocks: HTMLElement[]; pages: number[][] },
	watch = false
): Paged {
	const bar = document.createElement('div');
	bar.className = 'pager';
	bar.hidden = true;
	bar.innerHTML =
		'<button type="button" aria-label="Previous page">‹</button><span class="pgCount" aria-live="polite"></span><button type="button" aria-label="Next page">›</button>';
	const [prev, next] = [...bar.querySelectorAll('button')],
		count = bar.querySelector('.pgCount');
	host.after(bar);
	let page = 0;
	function layout() {
		if (!host.offsetParent) return; // not shown: laid out when it is
		bar.hidden = true;
		let p = plan();
		if (p.pages.length > 1) {
			bar.hidden = false; // the bar takes its room from the pages
			p = plan();
		}
		const pages = p.pages.length ? p.pages : [[]];
		page = Math.max(0, Math.min(page, pages.length - 1));
		pages.forEach((blocks, i) =>
			blocks.forEach((b) => p.blocks[b]?.classList.toggle(OFF, i !== page))
		);
		const text = `${page + 1} / ${pages.length}`;
		if (count.textContent !== text) count.textContent = text;
		prev.disabled = page === 0;
		next.disabled = page >= pages.length - 1;
	}
	const go = (i: number) => {
		page = i;
		layout();
	};
	prev.addEventListener('click', () => go(page - 1));
	next.addEventListener('click', () => go(page + 1));
	new ResizeObserver(layout).observe(host);
	if (watch)
		new MutationObserver(layout).observe(host, {
			childList: true,
			characterData: true,
			subtree: true
		});
	pagedPanes.push({ host, bar, turn: (step) => go(page + step) });
	return { layout, go };
}

/** The shown blocks of `host` (each shown for measuring) and their pages. */
function planBlocks(host: HTMLElement) {
	const blocks = [...host.children].filter((b): b is HTMLElement => {
		b.classList.remove(OFF);
		return b instanceof HTMLElement && getComputedStyle(b).display !== 'none';
	});
	const gap = px(getComputedStyle(host).rowGap);
	return { blocks, pages: fitBlocks(blocks.map(outerHeight), host.clientHeight, gap) };
}

/** ArrowLeft / ArrowRight turn the shown pane's pages, unless focus is in a field. */
function onKey(e: KeyboardEvent) {
	if (e.defaultPrevented) return;
	const shown = pagedPanes.find((p) => !p.bar.hidden && p.host.offsetParent);
	const step = shown ? pageStep(e, document.activeElement?.tagName ?? '') : 0;
	if (!step) return;
	e.preventDefault();
	shown.turn(step);
}

/** A row of tab buttons; `pick` runs with the tab's key on a click. */
function tabBar(id: string, label: string, tabs: [string, string][], pick: (key: string) => void) {
	const bar = document.createElement('div');
	bar.id = id;
	bar.className = 'console-tabs';
	bar.setAttribute('role', 'tablist');
	bar.setAttribute('aria-label', label);
	bar.innerHTML = tabs
		.map(
			([key, text]) =>
				`<button type="button" role="tab" class="console-tab" data-tab="${key}"><span>${text}</span></button>`
		)
		.join('');
	bar.addEventListener('click', (e) => {
		const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
		if (tab) pick(tab.dataset.tab);
	});
	return bar;
}

function markTabs(bar: HTMLElement, key: string) {
	bar.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => {
		const on = b.dataset.tab === key;
		b.classList.toggle('active', on);
		b.setAttribute('aria-selected', String(on));
	});
}

/* ----- the delivery window: Interlocks · Beam · Geometry ----- */
let interlocks: Paged | null = null;
let interlocksKey = '';

function installDeliveryTabs() {
	const alt = $('rtv2DeliveryAlt'),
		checklist = $('rtv2dChecklist'),
		content = alt?.querySelector('.rtv2d-content');
	if (!alt || !checklist || !content) return;
	const tabs = tabBar(
		'rtv2dTabs',
		'Delivery screen views',
		[
			['checks', 'Interlocks'],
			['beam', 'Beam'],
			['geometry', 'Geometry']
		],
		(key) => {
			alt.dataset.tab = key;
			markTabs(tabs, key);
		}
	);
	tabs
		.querySelector('[data-tab="checks"]')
		?.insertAdjacentHTML('beforeend', '<b id="rtv2dHoldBadge" class="console-tab-badge"></b>');
	content.appendChild(tabs);
	alt.dataset.tab = 'checks';
	markTabs(tabs, 'checks');
	// the interlocks and their page bar share the tab's room
	const pane = document.createElement('div');
	pane.id = 'rtv2dChecksPane';
	checklist.before(pane);
	pane.appendChild(checklist);
	interlocks = pagedPane(checklist, () => planInterlocks(checklist));
	interlocksKey = ''; // painted again in full at the next paint, the tab's badge with it
	// the geometry table in two columns, the machine's axes then the couch's, each with its heading
	const head = alt.querySelector('.rtv2d-panel.geometry .rtv2d-panel-head');
	if (head) {
		const half = document.createElement('div');
		half.className = 'rtv2d-head-half';
		half.append(...head.children);
		head.append(half);
		head.insertAdjacentHTML(
			'beforeend',
			'<div class="rtv2d-head-half"><div class="title">Couch</div><div>Plan</div><div>Actual</div></div>'
		);
	}
}

/** The failing rows, then the passed ones as chips or as the count line (fitInterlocks). */
function planInterlocks(host: HTMLElement) {
	const rows = [...host.querySelectorAll<HTMLElement>('.rtv2d-check')],
		chips = host.querySelector<HTMLElement>('.rtv2d-passed.chips'),
		count = host.querySelector<HTMLElement>('.rtv2d-passed.count');
	[...rows, chips, count].forEach((b) => b?.classList.remove(OFF));
	const fit = fitInterlocks(
		rows.map(outerHeight),
		chips ? outerHeight(chips) : 0,
		count ? outerHeight(count) : 0,
		host.clientHeight,
		px(getComputedStyle(host).rowGap)
	);
	(fit.passed === 'chips' ? count : chips)?.classList.add(OFF);
	return { blocks: [...rows, fit.passed === 'chips' ? chips : count], pages: fit.pages };
}

/** console-patch.ts's delivery screen paint: every interlock, the failing ones first. Painted
    again only when an interlock changes, so the page shown stays put while the machine moves. */
export function renderInterlocks(host: HTMLElement, checks: Interlock[]) {
	const key = JSON.stringify(checks.map((c) => [c.name, c.ok, c.detail]));
	if (key === interlocksKey) return;
	interlocksKey = key;
	const { failing, passed } = splitInterlocks(checks);
	const row = (c: Interlock) =>
		`<div class="rtv2d-check bad"><div class="lamp">!</div><div><b>${esc(c.name)}</b><span>${esc(c.detail)}</span></div></div>`;
	const others = failing.length
		? `${passed.length} other interlock${passed.length === 1 ? '' : 's'} passed`
		: `All ${passed.length} interlocks passed`;
	host.innerHTML = !checks.length
		? '<div class="rtv2d-check"><div><b>No checks loaded</b><span>Open a patient chart and select the Treatment Delivery workflow.</span></div></div>'
		: failing.map(row).join('') +
			(passed.length
				? `<div class="rtv2d-passed chips">${passed.map((c) => `<span title="${esc(c.detail)}"><i>✓</i>${esc(c.name)}</span>`).join('')}</div>` +
					`<div class="rtv2d-passed count"><i>✓</i>${others}</div>`
				: '');
	const badge = $('rtv2dHoldBadge');
	if (badge) {
		const b = interlockBadge(failing.length);
		badge.textContent = b.text;
		badge.classList.toggle('hold', b.hold);
	}
	interlocks?.layout();
}

/* ----- charge capture: Codes · IGRT notes · Result, the choices and buttons always shown ----- */
function installChargeTabs() {
	const panel = $('chargeCapturePanel'),
		body = panel?.querySelector<HTMLElement>('.charge-body'),
		code = $('chargeTreatmentCode'),
		igrt = $('chargeIgrtHandling'),
		guide = body?.querySelector('.charge-code-guide')?.closest('.charge-section'),
		choices = code?.closest('.charge-section'),
		actions = body?.querySelector('.charge-actions');
	if (!panel || !body || !code || !igrt || !guide || !choices || !actions) return;
	const box = (className: string, items: (Element | null)[]) => {
		const el = document.createElement('div');
		el.className = className;
		items.forEach((item) => item && el.appendChild(item));
		return el;
	};
	const panes = new Map<ChargeTab, Paged>();
	const pane = (tab: ChargeTab, items: (Element | null)[]) => {
		const blocks = box('charge-blocks', items),
			el = box('charge-pane', [blocks]);
		el.dataset.pane = tab;
		return { el, blocks };
	};
	const codes = pane('codes', [guide, $('chargeCodeExplanation')]),
		notes = pane('notes', [$('chargeIgrtExplanation'), $('chargeManagementInfo')]),
		result = pane('result', [
			$('chargeFeedback'),
			$('chargePostedRecord'),
			body.querySelector('.charge-footnote')
		]);
	const show = (key: ChargeTab) => {
		body.dataset.tab = key;
		markTabs(tabs, key);
		panes.get(key)?.go(0);
	};
	const tabs = tabBar(
		'chargeTabs',
		'Charge capture views',
		[
			['codes', 'Codes'],
			['notes', 'IGRT notes'],
			['result', 'Result']
		],
		show
	);
	body.append(
		tabs,
		codes.el,
		notes.el,
		result.el,
		box('charge-form', [code.closest('.charge-field'), igrt.closest('.charge-field'), actions])
	);
	choices.remove(); // emptied: its choices are in the form, its notes in the panes
	for (const [tab, p] of [
		['codes', codes],
		['notes', notes],
		['result', result]
	] as const)
		panes.set(
			tab,
			pagedPane(p.blocks, () => planBlocks(p.blocks), true)
		);
	const follow = (action: ChargeAction) =>
		show(chargeTabFor(action, !!S.treatmentCompletion?.posted));
	code.addEventListener('change', () => follow('code'));
	igrt.addEventListener('change', () => follow('igrt'));
	$('chargeVerify')?.addEventListener('click', () => follow('verify'));
	$('chargePost')?.addEventListener('click', () => follow('post'));
	let wasOpen = false;
	new MutationObserver(() => {
		const open = panel.classList.contains('open');
		if (open && !wasOpen) follow('open');
		wasOpen = open;
	}).observe(panel, { attributes: true, attributeFilter: ['class'] });
	follow('open');
}

/* ----- Patient Setup: the instructions page when the order does not fit its room ----- */
function installSetupPages() {
	const list = $('immobilizationInstructions');
	if (list) pagedPane(list, () => planBlocks(list), true);
}

/* ----- the chart's Machine / Imaging keys in narrow, short frames: two tabs (index.html's
   "console mode, narrow frames" styles show the bar and hide the other tab's keys only there) ----- */
function installKeyTabs() {
	const panel = $('rtv2MachinePanel'),
		grid = panel?.querySelector('.rtv2-console-grid');
	if (!panel || !grid) return;
	const show = (key: KeyTab) => {
		panel.dataset.keys = key;
		markTabs(tabs, key);
	};
	const tabs = tabBar(
		'rtv2KeyTabs',
		'Machine keys',
		[
			['couch', 'Imaging &amp; Couch'],
			['beam', 'Beam &amp; Workflows']
		],
		(key) => show(key as KeyTab)
	);
	grid.before(tabs);
	show('couch');
	// opening image guidance or delivery brings up the keys that step presses
	for (const id of ['igrtPanel', 'deliveryPanel']) {
		const win = $(id);
		if (!win) continue;
		let wasOpen = win.classList.contains('open');
		new MutationObserver(() => {
			const open = win.classList.contains('open'),
				tab = open && !wasOpen ? keyTabFor(id) : null;
			if (tab) show(tab);
			wasOpen = open;
		}).observe(win, { attributes: true, attributeFilter: ['class'] });
	}
}

/** Builds the tabs, the panes and their page bars, once. */
export function installConsoleScreens() {
	installDeliveryTabs();
	installChargeTabs();
	installSetupPages();
	installKeyTabs();
	document.addEventListener('keydown', onKey);
}
