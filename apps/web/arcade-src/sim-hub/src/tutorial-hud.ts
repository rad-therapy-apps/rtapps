/* The sim-hub tutorial's screen (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 3): the
   tracker card at the top-left (role, objective, hint line, progress, step and walking distance),
   the orange marker and its screen-edge arrow, the check-in and decision dialog, the fade and the
   role-change card, and the end card. DOM only; tutorial.ts decides what they show. The keyboard
   focus goes to a decision's first option, to Continue when it appears and to the end card's Keep
   exploring, so Tab and Enter work without the mouse. The elements are index.html's slot:tutorial
   block, looked up once at init (a headless check's stub DOM hands out a new element on every
   lookup). */
import type { Decision, ExchangeLine, RoleInfo } from './tutorial-steps';
import type { FeedbackKind } from './tutorial-math';

export interface HudHandlers {
	answer(id: string): void;
	cont(): void;
	mainMenu(): void;
	keepExploring(): void;
}
export interface TrackerView {
	role: RoleInfo;
	step: number;
	total: number;
	objective: string;
	progress: number;
}

const IDS = [
	'tutTracker',
	'tutAvatar',
	'tutRole',
	'tutObjective',
	'tutHint',
	'tutBar',
	'tutStep',
	'tutDistance',
	'tutMarker',
	'tutMarkerLabel',
	'tutEdge',
	'tutEdgeArrow',
	'tutEdgeLabel',
	'tutDialog',
	'tutDialogTitle',
	'tutDialogBody',
	'tutDialogContext',
	'tutDialogOptions',
	'tutDialogFeedback',
	'tutDialogContinue',
	'tutFade',
	'tutRoleCard',
	'tutRoleCardName',
	'tutEnd',
	'tutEndMenu',
	'tutEndExplore'
] as const;
type Id = (typeof IDS)[number];

let E = {} as Record<Id, HTMLElement>;
let handlers: HudHandlers | null = null;
let optionButtons: HTMLButtonElement[] = [];
let shownDistance = '';

const show = (el: HTMLElement, on: boolean) => el.classList.toggle('show', on);

export function initTutorialHud(h: HudHandlers): void {
	E = Object.fromEntries(IDS.map((id) => [id, document.getElementById(id)])) as Record<
		Id,
		HTMLElement
	>;
	handlers = h;
	E.tutDialogContinue.onclick = () => handlers?.cont();
	E.tutEndMenu.onclick = () => handlers?.mainMenu();
	E.tutEndExplore.onclick = () => handlers?.keepExploring();
}

export function showTracker(v: TrackerView | null): void {
	show(E.tutTracker, !!v);
	if (!v) return;
	E.tutAvatar.textContent = v.role.initials;
	E.tutRole.textContent = `${v.role.role} · ${v.role.name}`;
	E.tutObjective.textContent = v.objective;
	E.tutStep.textContent = `Step ${v.step} of ${v.total}`;
	E.tutBar.style.width = `${Math.round(v.progress * 100)}%`;
}

export function setHint(text: string | null): void {
	E.tutHint.textContent = text ?? '';
	show(E.tutHint, !!text);
}

export function setDistance(text: string): void {
	if (text === shownDistance) return;
	shownDistance = text;
	E.tutDistance.textContent = text;
}

/** The marker on screen at (x, y), screen fractions; null hides it. */
export function placeMarker(m: { x: number; y: number; label: string } | null): void {
	show(E.tutMarker, !!m);
	if (!m) return;
	E.tutMarker.style.left = `${(m.x * 100).toFixed(2)}%`;
	E.tutMarker.style.top = `${(m.y * 100).toFixed(2)}%`;
	E.tutMarkerLabel.textContent = m.label;
}

/** The edge arrow at (x, y), screen fractions, pointing `angle` degrees (0 right, 90 down). */
export function placeEdge(a: { x: number; y: number; angle: number; label: string } | null): void {
	show(E.tutEdge, !!a);
	if (!a) return;
	E.tutEdge.style.left = `${(a.x * 100).toFixed(2)}%`;
	E.tutEdge.style.top = `${(a.y * 100).toFixed(2)}%`;
	// the label stays on screen: it hangs inward from a side edge, above the arrow at the bottom
	E.tutEdge.classList.toggle('left', a.x < 0.25);
	E.tutEdge.classList.toggle('right', a.x > 0.75);
	E.tutEdge.classList.toggle('bottom', a.y > 0.75);
	E.tutEdgeArrow.style.transform = `rotate(${a.angle.toFixed(1)}deg)`;
	E.tutEdgeLabel.textContent = a.label;
}

function openCard(title: string): void {
	E.tutDialogTitle.textContent = title;
	E.tutDialogBody.textContent = '';
	E.tutDialogContext.textContent = '';
	E.tutDialogOptions.textContent = '';
	optionButtons = [];
	E.tutDialogFeedback.textContent = '';
	E.tutDialogFeedback.className = 'tut-feedback';
	show(E.tutDialog, true);
}

export function openExchange(title: string, lines: readonly ExchangeLine[]): void {
	openCard(title);
	for (const l of lines) {
		const p = document.createElement('p'),
			who = document.createElement('b'),
			said = document.createElement('span');
		p.className = 'tut-line';
		who.textContent = l.who;
		said.textContent = ` ${l.text}`;
		p.appendChild(who);
		p.appendChild(said);
		E.tutDialogBody.appendChild(p);
	}
	E.tutDialogContinue.hidden = false;
	E.tutDialogContinue.focus?.();
}

export function openDecision(d: Decision): void {
	openCard(d.title);
	const p = document.createElement('p');
	p.textContent = d.prompt;
	E.tutDialogBody.appendChild(p);
	for (const [k, v] of d.context ?? []) {
		const row = document.createElement('div'),
			key = document.createElement('span'),
			val = document.createElement('b');
		row.className = 'tut-row';
		key.textContent = k;
		val.textContent = v;
		row.appendChild(key);
		row.appendChild(val);
		E.tutDialogContext.appendChild(row);
	}
	for (const o of d.options) {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'tut-option';
		b.dataset.option = o.id;
		b.textContent = o.text;
		b.onclick = () => handlers?.answer(o.id);
		E.tutDialogOptions.appendChild(b);
		optionButtons.push(b);
	}
	E.tutDialogContinue.hidden = true;
	optionButtons[0]?.focus?.();
}

/** The answer's feedback: a miss marks the picked option; the answer or a right pick marks the
    right one, locks the options and shows Continue. */
export function showFeedback(
	kind: FeedbackKind,
	text: string,
	picked: string | null,
	correct: string | null
): void {
	E.tutDialogFeedback.textContent = text;
	E.tutDialogFeedback.className = `tut-feedback show ${kind}`;
	const done = kind === 'correct' || kind === 'reveal';
	for (const b of optionButtons) {
		const id = b.dataset.option;
		if (id === picked && !done) b.classList.add('tried');
		if (done && id === correct) b.classList.add('right');
		b.disabled = done;
	}
	E.tutDialogContinue.hidden = !done;
	if (done) E.tutDialogContinue.focus?.();
}

export function closeDialog(): void {
	show(E.tutDialog, false);
	optionButtons = [];
}

export function setFade(on: boolean): void {
	show(E.tutFade, on);
}

export function showRoleCard(r: RoleInfo | null): void {
	show(E.tutRoleCard, !!r);
	if (r) E.tutRoleCardName.textContent = `${r.name} · ${r.role}`;
}

export function showEnd(on: boolean): void {
	show(E.tutEnd, on);
	if (on) E.tutEndExplore.focus?.(); // the primary button, Keep exploring
}

export function hideTutorialHud(): void {
	showTracker(null);
	setHint(null);
	placeMarker(null);
	placeEdge(null);
	closeDialog();
	setFade(false);
	showRoleCard(null);
	showEnd(false);
	shownDistance = '';
}
