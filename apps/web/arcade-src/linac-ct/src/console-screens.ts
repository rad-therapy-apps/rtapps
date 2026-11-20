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
     narrow frames' two-column setup gives the order the room the shelf and table leave), and so
     do the delivery window's fields when a plan has more than the patient column holds, and
     screen 2's setup card when a patient's setup is longer than its room.
   - In narrow, short frames the chart's Machine / Imaging keys show one tab at a time (Imaging &
     Couch · Beam & Workflows) beside the open window, and opening image guidance or delivery brings
     up the tab of keys that step presses (console-fit.ts keyTabFor). Elsewhere the bar is hidden
     and every key shows.
   - The extra workflow windows (the chart's OIS / R&V step and its Additional Workflow keys) show
     their sections as tabs over the actions and status they keep in view: OIS / R&V (Record · Fields · Audit trail · Sign-off), Adaptive
     (Anatomy · Plans · Approval · Course · History) and SRS / SBRT (Checklist · Timeout); each
     opens on, and each action brings up, the tab that matters then (console-fit.ts). 4D Motion
     needs no tabs: index.html's styles alone fit it.
   A tab whose blocks still do not fit (a long list of holds, a long result on the smallest panel)
   splits into pages under a bar with ‹, the count and ›, turned with ArrowLeft / ArrowRight too, as
   the center's pop-ups are; pages break between blocks and the bar hides when everything fits
   (rules in console-fit.ts). The look is index.html's "console mode, no scroll" block.
   console-patch.ts starts it (installConsoleScreens) and hands it the interlocks each time it paints
   the delivery screen (renderInterlocks). Outside console mode nothing here runs. */
import { pageStep } from '../../sim-hub/src/pager-math';
import {
	adaptiveTabFor,
	chargeTabFor,
	fitGrid,
	fitInterlocks,
	fitTable,
	interlockBadge,
	keyTabFor,
	oisTabOnOpen,
	pageOfBlock,
	splitInterlocks,
	srsTabFor,
	type AdaptiveAction,
	type ChargeAction,
	type ChargeTab,
	type Interlock,
	type KeyTab,
	type SrsAction
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
    content does. With `follow`, the page turns to the block it names whenever that changes (the
    delivery window's selected field). */
function pagedPane(
	host: HTMLElement,
	plan: () => Plan,
	watch = false,
	follow?: (blocks: HTMLElement[]) => number
): Paged {
	const bar = document.createElement('div');
	bar.className = 'pager';
	bar.hidden = true;
	bar.innerHTML =
		'<button type="button" aria-label="Previous page">‹</button><span class="pgCount" aria-live="polite"></span><button type="button" aria-label="Next page">›</button>';
	const [prev, next] = [...bar.querySelectorAll('button')],
		count = bar.querySelector('.pgCount');
	host.after(bar);
	let page = 0,
		followed = -1;
	function layout() {
		if (!host.offsetParent) return; // not shown: laid out when it is
		bar.hidden = true;
		let p = plan();
		if (p.pages.length > 1) {
			bar.hidden = false; // the bar takes its room from the pages
			p = plan();
		}
		const pages = p.pages.length ? p.pages : [[]];
		const want = follow ? follow(p.blocks) : -1;
		if (want !== followed) {
			followed = want;
			const at = pageOfBlock(pages, want);
			if (at >= 0) page = at;
		}
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

interface Plan {
	blocks: HTMLElement[];
	pages: number[][];
}

/** The shown blocks among `items`, laid out in `host` `cols` to a row (each shown for measuring),
    and their pages. */
function planList(host: HTMLElement, items: (Element | null)[], cols = 1): Plan {
	const blocks = items.filter((b): b is HTMLElement => {
		b?.classList.remove(OFF);
		return b instanceof HTMLElement && getComputedStyle(b).display !== 'none';
	});
	const gap = px(getComputedStyle(host).rowGap);
	return { blocks, pages: fitGrid(blocks.map(outerHeight), cols, host.clientHeight, gap) };
}

/** The shown blocks of `host` (each shown for measuring) and their pages. */
function planBlocks(host: HTMLElement): Plan {
	return planList(host, [...host.children]);
}

/** The cards of a grid `host`, paged by rows of as many columns as the grid has. */
function planGrid(host: HTMLElement): Plan {
	const cs = getComputedStyle(host);
	const cols = cs.display === 'grid' ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 1;
	return planList(host, [...host.children], Math.max(1, cols));
}

/** A table's `rows` in `host`, its header row first, paged under the header (on every page). */
function planTable(host: HTMLElement, rows: Element[]): Plan {
	const blocks = rows.filter((r): r is HTMLElement => r instanceof HTMLElement);
	blocks.forEach((r) => r.classList.remove(OFF));
	if (!blocks.length) return { blocks, pages: [] };
	const [head, ...body] = blocks;
	return {
		blocks,
		pages: fitTable(outerHeight(head), body.map(outerHeight), host.clientHeight, 0)
	};
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

/* ----- screen 2's setup card: its list pages when a patient's setup needs more room ----- */
function installReferencePages() {
	const list = $('consoleImmoList');
	if (list) pagedPane(list, () => planBlocks(list), true);
}

/* ----- the delivery window's fields page when a plan has more than its column holds, the page
   with the selected field shown ----- */
function installFieldPages() {
	const list = $('rtv2dFieldList');
	if (list)
		pagedPane(
			list,
			() => planBlocks(list),
			true,
			(rows) => rows.findIndex((r) => r.classList.contains('active'))
		);
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

/* ----- the extra workflow windows: OIS / R&V, Adaptive and SRS / SBRT show their sections as
   tabs over what stays in view (the window's summary chips on top; its actions and status under
   the tabs), each tab's blocks paged when they need more room than the tab has ----- */
interface WindowPane {
	key: string;
	label: string;
	/** What the tab shows, moved into it in order. */
	items: (Element | null)[];
	/** The box that pages (by default a box holding `items`) and how its blocks go on pages. */
	host?: HTMLElement;
	plan?: (host: HTMLElement) => Plan;
}

/** A tab bar `id` over `panes`, put in a window's `body` before `before`. Returns what shows a tab. */
function windowTabs(
	body: HTMLElement,
	id: string,
	label: string,
	panes: WindowPane[],
	before: Element
) {
	const shown = new Map<string, { el: HTMLElement; paged: Paged }>();
	const show = (key: string) => {
		markTabs(bar, key);
		shown.forEach((p, k) => (p.el.hidden = k !== key));
		shown.get(key)?.paged.go(0);
	};
	const bar = tabBar(
		id,
		label,
		panes.map((p): [string, string] => [p.key, p.label]),
		show
	);
	body.insertBefore(bar, before);
	for (const p of panes) {
		const el = document.createElement('div');
		el.className = 'console-pane';
		el.dataset.pane = p.key;
		el.hidden = true;
		const items = p.items.filter((i): i is Element => !!i);
		let host = p.host;
		if (host) el.append(...items);
		else {
			host = document.createElement('div');
			host.className = 'console-blocks';
			host.append(...items);
			el.append(host);
		}
		body.insertBefore(el, before);
		const h = host,
			plan = p.plan ?? planBlocks;
		shown.set(p.key, { el, paged: pagedPane(h, () => plan(h), true) });
	}
	return show;
}

/** Runs `opened` now and each time `panel` opens (gains the class open). */
function whenOpened(panel: HTMLElement, opened: () => void) {
	let wasOpen = panel.classList.contains('open');
	new MutationObserver(() => {
		const open = panel.classList.contains('open');
		if (open && !wasOpen) opened();
		wasOpen = open;
	}).observe(panel, { attributes: true, attributeFilter: ['class'] });
	opened();
}

/** OIS / R&V: Record (the verification and imaging cards) · Fields (the delivery table, paged under
    its header) · Audit trail (paged by event, newest first) · Sign-off (the override review, paged
    by line, and the therapist's documentation); the chips and the record's status stay in view. */
function installOisTabs() {
	const panel = $('oisPanel'),
		body = panel?.querySelector<HTMLElement>('.ois-body'),
		grid = body?.querySelector(':scope > .ois-grid'),
		fields = $('oisFields'),
		trail = $('oisTimeline'),
		override = $('oisOverrideCard'),
		docs = $('oisNote')?.closest('.ois-card'),
		status = $('oisStatus');
	if (!panel || !body || !grid || !fields || !trail || !override || !docs || !status) return;
	// the override review, when a clearance override needs one, pages by line: its heading, each
	// override's record and its acknowledgment (index.html lays them out as the card's)
	const overrideLines = () =>
		override.hidden
			? []
			: [
					override.querySelector(':scope > h4'),
					...($('oisOverrideSummary')?.children ?? []),
					override.querySelector(':scope > .ois-sign-row')
				];
	const show = windowTabs(
		body,
		'oisTabs',
		'Treatment record views',
		[
			{
				key: 'record',
				label: 'Record',
				items: [...grid.children, body.querySelector('.ois-footnote')]
			},
			{
				key: 'fields',
				label: 'Fields',
				items: [fields.closest('.ois-card')],
				host: fields,
				plan: (h) => planTable(h, [...h.querySelectorAll('tr')])
			},
			{ key: 'trail', label: 'Audit trail', items: [trail.closest('.ois-card')], host: trail },
			{
				key: 'signoff',
				label: 'Sign-off',
				items: [override, docs],
				plan: (h) => planList(h, [...overrideLines(), docs])
			}
		],
		status
	);
	grid.remove(); // emptied: its two cards are the Record tab's
	whenOpened(panel, () =>
		show(oisTabOnOpen(!!S.treatmentCompletion?.posted, !!S.oisSession?.signed))
	);
}

/** Adaptive planning: Anatomy · Plans (three columns where the window is wide, else a list, paged
    by rows) · Approval (the steps and the review's checks) · Course (the dose so far) · History
    (paged under its header); the chips, Assess / Compare / Approve and the status stay in view,
    and each action brings up the tab it changes (console-fit.ts adaptiveTabFor). */
function installAdaptiveTabs() {
	const panel = $('adaptivePanel'),
		body = panel?.querySelector<HTMLElement>('.adaptive-body'),
		steps = $('adaptiveStepList'),
		checks = body?.querySelector<HTMLElement>('.adaptive-checks'),
		actions = body?.querySelector<HTMLElement>('.adaptive-actions'),
		plans = $('adaptivePlanGrid'),
		history = $('adaptiveHistory'),
		status = $('adaptiveStatus'),
		stepsCard = steps?.closest('.adaptive-card'),
		courseCard = history?.closest('.adaptive-card');
	if (!panel || !body || !steps || !checks || !actions || !plans || !history || !status) return;
	if (!stepsCard || !courseCard) return;
	body.insertBefore(actions, status);
	const show = windowTabs(
		body,
		'adaptiveTabs',
		'Adaptive planning views',
		[
			{ key: 'anatomy', label: 'Anatomy', items: [$('adaptiveAnatomyCard')] },
			{ key: 'plans', label: 'Plans', items: [plans], host: plans, plan: planGrid },
			{
				key: 'approval',
				label: 'Approval',
				items: [steps, checks],
				plan: (h) => planList(h, [...steps.children, checks])
			},
			{
				key: 'course',
				label: 'Course',
				items: [
					courseCard.querySelector('.adaptive-dose-summary'),
					$('adaptiveDoseCanvas'),
					courseCard.querySelector('.adaptive-course-actions'),
					body.querySelector('.adaptive-footnote')
				]
			},
			{
				key: 'history',
				label: 'History',
				items: [history],
				host: history,
				plan: (h) => planTable(h, [...h.children])
			}
		],
		actions
	);
	stepsCard.remove(); // emptied but for their headings, which the tabs name
	courseCard.remove();
	const follow = (action: AdaptiveAction) => show(adaptiveTabFor(action, S.adaptiveWorkflow));
	$('adaptiveAssess')?.addEventListener('click', () => follow('assess'));
	$('adaptiveCompare')?.addEventListener('click', () => follow('compare'));
	$('adaptiveApprove')?.addEventListener('click', () => follow('approve'));
	checks.addEventListener('change', () => follow('check'));
	$('adaptiveNextFraction')?.addEventListener('click', () => follow('next'));
	$('adaptiveResetCourse')?.addEventListener('click', () => follow('reset'));
	whenOpened(panel, () => follow('open'));
}

/** SRS / SBRT: Checklist (the prescription, the stereotactic checks, paged by row, and the controls
    note) · Timeout (the team's four checks); the chips, the three actions and the status stay in
    view. Opening it, Recheck Clearance and Dry Run show the checklist (console-fit.ts srsTabFor). */
function installSrsTabs() {
	const panel = $('srsPanel'),
		body = panel?.querySelector<HTMLElement>('.srs-body'),
		rx = $('srsPrescription'),
		list = $('srsChecklist'),
		note = $('stereoFootnote'),
		manual = body?.querySelector<HTMLElement>('.srs-manual'),
		actions = body?.querySelector('.srs-actions');
	if (!panel || !body || !rx || !list || !note || !manual || !actions) return;
	const show = windowTabs(
		body,
		'srsTabs',
		'Stereotactic views',
		[
			{
				key: 'checklist',
				label: 'Checklist',
				items: [rx, list, note],
				plan: (h) => planList(h, [rx, ...list.children, note])
			},
			{ key: 'timeout', label: 'Timeout', items: [manual], host: manual, plan: planGrid }
		],
		actions
	);
	const follow = (action: SrsAction) => {
		const tab = srsTabFor(action);
		if (tab) show(tab);
	};
	$('srsClearanceCheck')?.addEventListener('click', () => follow('clearance'));
	$('srsDryRun')?.addEventListener('click', () => follow('dryrun'));
	whenOpened(panel, () => follow('open'));
}

/** Builds the tabs, the panes and their page bars, once. */
export function installConsoleScreens() {
	installDeliveryTabs();
	installChargeTabs();
	installSetupPages();
	installFieldPages();
	installReferencePages();
	installKeyTabs();
	installOisTabs();
	installAdaptiveTabs();
	installSrsTabs();
	document.addEventListener('keydown', onKey);
}
