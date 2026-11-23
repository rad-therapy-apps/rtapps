/* The runner of the LINAC console's Tutorial walkthroughs (docs/specs/
   2026-11-23-tutorial-walkthrough-design.md, "Console: the four walkthroughs"): one part per
   workspace the Tutorial uses (walkthrough-queue.ts, -setup.ts, -igrt.ts and -delivery.ts), shown
   on the shared spotlight (shared/coach.ts) while the console shows that workspace. console-mode.ts
   calls tickWalkthrough on each of its ticks in the tutorial scenario and posts what it returns in
   its state message, and hands it every event the console reports (noteWalkthroughEvent). On a
   tick the part reads the console, its current sub-step is worked out by shared/walkthrough-core.ts,
   and the sub-step's selectors are looked up on the page: a target hidden by one of the console's
   tabs is reached through the tab button that shows it, and a sub-step the player does whose
   targets are nowhere on the page shows its bubble with no dim and no lock, so the player is never
   locked out. What it remembers lasts the page's life, which is one Tutorial play (the console's
   page boots fresh for each): the explains' Next, the furthest sub-step reached in each part, and
   the parts finished or skipped. In the tutorial scenario the page also gets
   `window.__WALKTHROUGH` for the checks: state() (the sub-step showing and its selectors as this
   tick resolved them, or null), next() and skip(), which press the bubble's Next and Skip. */
import type { LinacWalkthrough, LinacWorkspace } from '../../shared/console-protocol';
import { hideCoach, showCoach, type CoachView } from '../../shared/coach';
import { currentIndex, DEFAULT_CUE, fillTokens, type SubKind } from '../../shared/walkthrough-core';
import { CONSOLE, type ConsoleEvent } from './console-hooks';
import type { WalkPart } from './walkthrough-part';
import { QUEUE_WALK } from './walkthrough-queue';
import { SETUP_WALK } from './walkthrough-setup';
import { IGRT_WALK } from './walkthrough-igrt';
import { DELIVERY_WALK } from './walkthrough-delivery';

const PARTS: Record<LinacWorkspace, WalkPart<unknown>> = {
	queue: QUEUE_WALK,
	setup: SETUP_WALK,
	igrt: IGRT_WALK,
	delivery: DELIVERY_WALK
};

/** What window.__WALKTHROUGH.state() returns: the sub-step showing, with its cut-outs' selectors
    and its drag's as this tick resolved them. */
export interface WalkthroughState extends LinacWalkthrough {
	id: string;
	kind: SubKind;
	targets: string[];
	drag: { from: string; to: string } | null;
}

const seen = new Set<string>();
const reached: Partial<Record<LinacWorkspace, number>> = {};
const ended = new Set<LinacWorkspace>();
const events: ConsoleEvent[] = [];
let shown: { state: WalkthroughState; view: CoachView } | null = null;

/** A step the workflow reported (console-hooks.ts consoleEvent), for the parts' read(). */
export function noteWalkthroughEvent(e: ConsoleEvent): void {
	events.push(e);
}

function end(workspace: LinacWorkspace) {
	ended.add(workspace);
	shown = null;
	hideCoach();
}

/* ----- the console's tabs (console-screens.ts): where a tab bar shows, index.html hides the panes
   of the tabs not picked (display: none), so an element in one has an empty rect. Each: the
   element whose data-<key> names the tab picked, the tab bar, and the panes each tab shows. ----- */
const TABS: readonly {
	host: string;
	key: string;
	bar: string;
	panes: readonly (readonly [tab: string, pane: string])[];
}[] = [
	// the chart's Machine / Imaging keys in narrow, short frames (installKeyTabs; index.html's
	// "frames under 660 px tall" rules): Imaging & Couch hides the second group and the advanced
	// workflows, Beam & Workflows the third group and the first group's keys
	{
		host: '#rtv2MachinePanel',
		key: 'keys',
		bar: '#rtv2KeyTabs',
		panes: [
			['beam', '.rtv2-control-group:nth-child(2), .rtv2-advanced-workflows'],
			[
				'couch',
				'.rtv2-control-group:nth-child(3), .rtv2-control-group:first-child > .rtv2-button-grid'
			]
		]
	},
	// the delivery window's Interlocks · Beam · Geometry (installDeliveryTabs)
	{
		host: '#rtv2DeliveryAlt',
		key: 'tab',
		bar: '#rtv2dTabs',
		panes: [
			['checks', '#rtv2dChecksPane'],
			['beam', '.rtv2d-panel.beam'],
			['geometry', '.rtv2d-panel.geometry']
		]
	}
];

function shows(el: Element | null): el is Element {
	const r = el?.getBoundingClientRect();
	return !!r && r.width > 0 && r.height > 0;
}

/** The selector of the tab button that would show `el`, hidden on a tab not picked; else null. */
function tabFor(el: Element): string | null {
	for (const t of TABS) {
		const host = el.closest<HTMLElement>(t.host);
		if (!host) continue;
		for (const [tab, pane] of t.panes) {
			const p = el.closest(pane);
			if (!p || !host.contains(p) || host.dataset[t.key] === tab) continue;
			const button = `${t.bar} [data-tab="${tab}"]`;
			return shows(document.querySelector(button)) ? button : null;
		}
	}
	return null;
}

/** What to cut out for `sel` now: itself when it shows, the tab button that shows it when a tab
    hides it, else nothing. */
function resolve(sel: string): { sel: string; el: Element } | null {
	const el = document.querySelector(sel);
	if (!el) return null;
	if (shows(el)) return { sel, el };
	const tab = tabFor(el);
	return tab ? { sel: tab, el: document.querySelector(tab) } : null;
}

/** Runs the part for the workspace shown: shows its current sub-step on the spotlight and returns
    it for the state message, or hides the spotlight and returns null once the part has ended. */
export function tickWalkthrough(workspace: LinacWorkspace): LinacWalkthrough | null {
	const p = PARTS[workspace];
	if (ended.has(workspace)) {
		shown = null;
		hideCoach();
		return null;
	}
	const snap = p.read(events),
		i = currentIndex(p.steps, snap, seen, reached[workspace] ?? 0);
	reached[workspace] = i;
	if (i === p.steps.length) {
		end(workspace);
		return null;
	}
	const step = p.steps[i],
		targets: { sel: string; el: Element }[] = [],
		add = (t: { sel: string; el: Element } | null) =>
			t && !targets.some((x) => x.sel === t.sel) && targets.push(t);
	step.targets(snap).forEach((sel) => add(resolve(sel)));
	let drag: { from: { sel: string; el: Element }; to: { sel: string; el: Element } } | null = null;
	const pair = step.drag?.(snap);
	if (pair) {
		const from = resolve(pair.from),
			to = resolve(pair.to);
		// both ends in view: the drag; an end behind a tab: that tab first
		if (from?.sel === pair.from && to?.sel === pair.to) drag = { from, to };
		else [from, to].forEach((t) => t && t.sel !== pair.from && t.sel !== pair.to && add(t));
	}
	const nowhere = step.kind === 'do' && !targets.length && !drag,
		tokens = step.tokens?.(snap),
		view: CoachView = {
			targets: targets.map((t) => t.el),
			drag: drag ? { from: drag.from.el, to: drag.to.el } : undefined,
			dim: nowhere ? 'none' : 'full',
			lock: !nowhere,
			header: p.header,
			dots: { count: p.steps.length, index: i },
			text: { do: fillTokens(step.text.do, tokens), why: fillTokens(step.text.why, tokens) },
			footer:
				step.kind === 'explain' ? { kind: 'next' } : { kind: 'wait', cue: step.cue ?? DEFAULT_CUE },
			onNext: () => seen.add(step.id),
			onSkip: () => end(workspace)
		};
	shown = {
		state: {
			part: workspace,
			index: i,
			of: p.steps.length,
			id: step.id,
			kind: step.kind,
			targets: targets.map((t) => t.sel),
			drag: drag ? { from: drag.from.sel, to: drag.to.sel } : null
		},
		view
	};
	showCoach(view);
	return { part: workspace, index: i, of: p.steps.length };
}

if (CONSOLE.scenario === 'tutorial')
	Object.assign(window, {
		__WALKTHROUGH: {
			state: (): WalkthroughState | null => shown?.state ?? null,
			next: () => shown?.view.footer.kind === 'next' && shown.view.onNext?.(),
			skip: () => shown?.view.onSkip()
		}
	});
