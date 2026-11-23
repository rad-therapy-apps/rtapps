# Tutorial walkthrough: implementation plan

> **For agentic workers:** each task below is built by one builder in its own worktree. Read your
> task, the spec (`docs/specs/2026-11-23-tutorial-walkthrough-design.md`) and the Global Constraints.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the sim-hub Tutorial teaches: a spotlight walkthrough at the start and at the four console
steps, a step card after every step, and a floor ring under the next target.

**Architecture:** one shared spotlight module (`arcade-src/shared/coach.ts`, pure geometry in
`coach-geometry.ts`) is used by both pages. The center (sim-hub) runs getting started, the step
cards and the ring. The LINAC console (in its iframe) runs the four console walkthroughs itself,
because only it can see its own state, and tells the center through one optional field on
`rtapps-linac-state`. The shared sub-step rules are `arcade-src/shared/walkthrough-core.ts`.

**Tech stack:** TypeScript, three.js 0.160.0 (the ring only), DOM, vitest (Node), Playwright
(the browser checks), pnpm.

## Global Constraints

Every task's requirements include these.

- The wording is the spec's, verbatim: the bubble text tables and the step-card table. The owner
  reviews it for clinical accuracy. Don't reword it; if a line can't be true in the console's real
  state, stop and report.
- Spotlight: cut-outs 4 px larger than the target, rounded, outlined in teal and pulsing (steady
  with `prefers-reduced-motion`). Dim 66% (`full`) and 34% (`light`, getting started's movement
  sub-steps only). The bubble is at most 360 px wide, uses no text under 12 px and never covers its
  own cut-outs.
- Nothing scrolls and nothing is cut off at the website's sizes: the center at 992×624 to 1104×936
  (the checks also run 1280×800); the console frame is 823×512 at the smallest.
- Clicks, drags and keys outside the cut-outs do nothing while a bubble locks. The center's console
  panel Close and Esc still work.
- Skip walkthrough skips that part only, for the rest of that play; a new play is guided again.
- Free Mode, the graded activities and the free console check don't change, and the free console
  shows no bubble.
- The NPC check is never loosened. Nothing new may draw `Math.random` outside the Tutorial (a three.js
  Object3D does, for its uuid): make new scene objects on first Tutorial use.
- Palette (from the approved mockups): dim `rgba(6,12,18,α)`, teal `#3fd0c9`, ink `#13202b`, muted
  `#4a5b68`, paper `#f6f9fb`, amber `#f0a640`, accent text `#1e8f8a`; card `#172029` with text
  `#eef4f7`, rows `#d3dee5`, border `rgba(63,208,201,.45)`.
- No new dependencies. three.js stays 0.160.0.
- Code style: match the surrounding files. Each new file opens with a block comment saying what it
  is and who uses it, in plain words, as the existing files do. No emojis in code.

### Process rules (every builder)

- Work only in your worktree, on your branch. Scratch files go only in the session scratchpad
  (the path is in your prompt). Never delete files you didn't create; no glob deletes.
- Never open, read, create or edit any `.env*` file. If a permission is denied, stop and report;
  don't work around it.
- Stage files by name. Never stage `.superpowers/` or `e2e/.auth/`.
- Run prettier and eslint on the files you touched (`npx prettier --check <files>`, `npx eslint
<files>` from `apps/web`), not the package-wide `pnpm lint`.
- Python only through `uv` (no task here needs it).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.
- Commands run from `apps/web`: unit tests `npx vitest run <spec files>`; types `npx tsc -p
tsconfig.arcade.json`; build `pnpm build:arcade`; checks `node scripts/<check>.mjs` (the console
  checks also with `CHECK_VIEW=992x624`). The checks serve the build on a random port, so builders
  in other worktrees don't collide.
- Report: status (DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT), commits, the test and check
  results with their output tails, and any concern. Write the full report to the report file named
  in your prompt.

## Branches and worktrees

- `feat/tutorial-walkthrough` (worktree `.worktrees/tutorial-walkthrough`) holds the spec, this plan
  and Task 0. It is PR A's branch.
- Each task gets its own branch and worktree inside `rtapps/.worktrees/`, cut from the branch named
  in its row. The controller cherry-picks finished tasks onto PR A's branch, or onto PR B's branch
  `feat/tutorial-walkthrough-console`, cut from PR A's branch after wave 1.

| Wave | Task                                 | PR  | Cut from                  |
| ---- | ------------------------------------ | --- | ------------------------- |
| 0    | 0 Foundation (controller, done)      | A   | -                         |
| 1    | 1 Spotlight                          | A   | feat/tutorial-walkthrough |
| 1    | 2 Step cards                         | A   | feat/tutorial-walkthrough |
| 1    | 3 Floor ring                         | A   | feat/tutorial-walkthrough |
| 1    | 4 Contract, center side              | B   | feat/tutorial-walkthrough |
| 1    | 5 Console runner and step 3          | B   | feat/tutorial-walkthrough |
| 2    | 6 Getting started                    | A   | PR A after 1, 2, 3        |
| 2    | 7 Step 6 walkthrough                 | B   | PR B after 1-5            |
| 2    | 8 Step 8 walkthrough                 | B   | PR B after 1-5            |
| 2    | 9 Step 9 walkthrough                 | B   | PR B after 1-5            |
| 2    | 10 Center follows the walkthrough    | B   | PR B after 1-5            |
| 3    | 11 Console check: skip and guided    | B   | PR B after 6-10           |
| -    | Integration, pictures, PR A and PR B | -   | controller                |

## Task 0: Foundation (done by the controller, on feat/tutorial-walkthrough)

Already committed. Builders code against these and don't change their interfaces:

- `apps/web/arcade-src/shared/walkthrough-core.ts` (+ spec): `SubStep<Snap>` (`id`, `kind:
'explain' | 'do'`, `text: {do, why}`, `targets(snap): string[]` of CSS selectors, optional
  `drag(snap): {from, to} | null`, `done(snap)`, `applies(snap)`, `tokens(snap)`, `cue`),
  `DEFAULT_CUE`, `isDone`, `currentIndex(steps, snap, seen, reached)` and `fillTokens(text,
tokens)`.
- `apps/web/arcade-src/shared/coach.ts`: the `CoachView` and `CoachDim` types, and no-op
  `showCoach(view)`, `hideCoach()` and `coachShown()`. Task 1 fills in the bodies.
- `apps/web/arcade-src/shared/console-protocol.ts`: `LinacWalkthrough { part: LinacWorkspace;
index: number; of: number }` and the optional `LinacStateMsg.walkthrough?: LinacWalkthrough |
null`.
- `apps/web/arcade-src/linac-ct/src/walkthrough-part.ts`: `WalkPart<Snap> { id: LinacWorkspace;
header; steps: SubStep<Snap>[]; read(events: readonly ConsoleEvent[]): Snap }`.
- `apps/web/vite.config.ts`: the Node test project also runs `arcade-src/shared/**/*.spec.ts`.

---

## Task 1: The spotlight (shared)

**Files:**

- Create: `apps/web/arcade-src/shared/coach-geometry.ts`, `apps/web/arcade-src/shared/coach-geometry.spec.ts`
- Modify: `apps/web/arcade-src/shared/coach.ts` (bodies only; keep the exported types and names)

**Interfaces:**

- Consumes: `CoachView`, `CoachDim` (Task 0).
- Produces: working `showCoach(view)`, `hideCoach()`, `coachShown()`; the root element is
  `#rtCoach`, its bubble `#rtCoach .rt-coach-bubble`, its buttons `.rt-coach-next` and
  `.rt-coach-skip`. The checks (Tasks 2, 6 and 11) find them by these names.

### coach-geometry.ts (pure)

- [ ] **Step 1: Write the failing spec** `coach-geometry.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BUBBLE_MAX_W,
  HOLE_PAD,
  PAGE_EDGE,
  holesPath,
  intersects,
  padRect,
  placeBubble,
  union,
} from "./coach-geometry";
import type { Rect } from "./coach-geometry";

const inside = (
  page: { w: number; h: number },
  p: { x: number; y: number },
  b: { w: number; h: number },
) =>
  p.x >= PAGE_EDGE &&
  p.y >= PAGE_EDGE &&
  p.x + b.w <= page.w - PAGE_EDGE &&
  p.y + b.h <= page.h - PAGE_EDGE;

describe("padRect and union", () => {
  it("grows a rect by the hole pad on every side", () => {
    expect(padRect({ x: 10, y: 20, w: 30, h: 40 })).toEqual({
      x: 10 - HOLE_PAD,
      y: 20 - HOLE_PAD,
      w: 30 + 2 * HOLE_PAD,
      h: 40 + 2 * HOLE_PAD,
    });
  });
  it("bounds several rects, and none is null", () => {
    expect(
      union([
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 20, y: 5, w: 5, h: 20 },
      ]),
    ).toEqual({ x: 0, y: 0, w: 25, h: 25 });
    expect(union([])).toBeNull();
  });
});

describe("holesPath", () => {
  it("is the page then one closed rounded subpath per hole", () => {
    const d = holesPath({ w: 800, h: 500 }, [
      { x: 10, y: 10, w: 50, h: 20 },
      { x: 100, y: 100, w: 40, h: 40 },
    ]);
    expect(d.startsWith("M0 0H800V500H0Z")).toBe(true);
    expect(d.match(/Z/g)?.length).toBe(3);
  });
  it("is the page alone with no holes", () => {
    expect(holesPath({ w: 10, h: 10 }, [])).toBe("M0 0H10V10H0Z");
  });
});

describe("placeBubble", () => {
  const bubble = { w: BUBBLE_MAX_W, h: 150 };
  for (const page of [
    { w: 823, h: 512 },
    { w: 1280, h: 800 },
  ]) {
    it(`goes below a target near the top at ${page.w}x${page.h}`, () => {
      const t: Rect = { x: 100, y: 40, w: 120, h: 30 };
      const p = placeBubble(page, t, bubble, [t]);
      expect(p.side).toBe("below");
      expect(inside(page, p, bubble)).toBe(true);
      expect(intersects({ ...p, ...bubble }, t)).toBe(false);
    });
    it(`goes above a target near the bottom at ${page.w}x${page.h}`, () => {
      const t: Rect = { x: 300, y: page.h - 60, w: 120, h: 30 };
      const p = placeBubble(page, t, bubble, [t]);
      expect(p.side).toBe("above");
      expect(intersects({ ...p, ...bubble }, t)).toBe(false);
    });
    it(`goes beside a target as tall as the page at ${page.w}x${page.h}`, () => {
      const t: Rect = { x: 40, y: 20, w: 200, h: page.h - 40 };
      const p = placeBubble(page, t, bubble, [t]);
      expect(p.side).toBe("right");
      expect(intersects({ ...p, ...bubble }, t)).toBe(false);
    });
    it(`keeps clear of a drag's two holes at ${page.w}x${page.h}`, () => {
      const from: Rect = { x: 30, y: 200, w: 140, h: 40 },
        to: Rect = { x: 420, y: 180, w: 260, h: 120 };
      const p = placeBubble(page, union([from, to]), bubble, [from, to]);
      expect(inside(page, p, bubble)).toBe(true);
      expect(
        intersects({ ...p, ...bubble }, from) ||
          intersects({ ...p, ...bubble }, to),
      ).toBe(false);
    });
  }
  it("sits low in the middle with nothing to point at", () => {
    const page = { w: 992, h: 624 },
      p = placeBubble(page, null, bubble, []);
    expect(p.side).toBeNull();
    expect(Math.abs(p.x + bubble.w / 2 - page.w / 2)).toBeLessThan(1);
    expect(inside(page, p, bubble)).toBe(true);
  });
  it("points at the target from the side it sits on", () => {
    const t: Rect = { x: 600, y: 40, w: 100, h: 30 },
      p = placeBubble({ w: 1280, h: 800 }, t, bubble, [t]);
    expect(p.pointer).toBeCloseTo(650 - p.x, 0);
  });
});
```

- [ ] **Step 2: Run it; expect it to fail** (`npx vitest run arcade-src/shared/coach-geometry.spec.ts`:
      module not found).
- [ ] **Step 3: Implement** `coach-geometry.ts`:

```ts
/* The spotlight's pure geometry (coach.ts; docs/specs/2026-11-23-tutorial-walkthrough-design.md):
   the cut-outs' padded rects, the dim layer's evenodd path with a rounded hole per cut-out, and
   where the bubble goes: below the cut-outs, else above, right or left, inside the page and over
   none of them; else the page corner nearest them that covers none; else the spot that covers
   least. Pure, so it is unit tested in Node (coach-geometry.spec.ts). */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Size {
  w: number;
  h: number;
}
export type Side = "below" | "above" | "right" | "left";
/** The bubble's top-left, the side of the cut-outs it sits on (null: nothing to point at, or a
    corner), and the pointer's offset along the bubble's edge that faces them. */
export interface Placement {
  x: number;
  y: number;
  side: Side | null;
  pointer: number;
}

export const HOLE_PAD = 4;
export const HOLE_RADIUS = 6;
export const BUBBLE_MAX_W = 360;
/** Between a cut-out and the bubble: room for the pointer. */
export const BUBBLE_GAP = 14;
/** The bubble stays this far inside the page. */
export const PAGE_EDGE = 8;
/** With nothing to point at, the bubble's bottom sits this far above the page's (clear of the
    center's controls bar). */
export const NO_ANCHOR_BOTTOM = 96;
/** The pointer stays this far from the bubble's corners. */
export const POINTER_INSET = 18;

const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));

export function padRect(r: Rect, pad = HOLE_PAD): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad };
}

export function union(rs: readonly Rect[]): Rect | null {
  if (!rs.length) return null;
  const x = Math.min(...rs.map((r) => r.x)),
    y = Math.min(...rs.map((r) => r.y)),
    x2 = Math.max(...rs.map((r) => r.x + r.w)),
    y2 = Math.max(...rs.map((r) => r.y + r.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
    h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function roundRect(r: Rect, radius: number): string {
  const k = r1(Math.min(radius, r.w / 2, r.h / 2)),
    x = r1(r.x),
    y = r1(r.y),
    x2 = r1(r.x + r.w),
    y2 = r1(r.y + r.h);
  return (
    `M${r1(x + k)} ${y}H${r1(x2 - k)}A${k} ${k} 0 0 1 ${x2} ${r1(y + k)}V${r1(y2 - k)}` +
    `A${k} ${k} 0 0 1 ${r1(x2 - k)} ${y2}H${r1(x + k)}A${k} ${k} 0 0 1 ${x} ${r1(y2 - k)}` +
    `V${r1(y + k)}A${k} ${k} 0 0 1 ${r1(x + k)} ${y}Z`
  );
}

/** The dim layer's path: the page, then each hole (fill-rule evenodd cuts them out). */
export function holesPath(
  page: Size,
  holes: readonly Rect[],
  radius = HOLE_RADIUS,
): string {
  return (
    `M0 0H${r1(page.w)}V${r1(page.h)}H0Z` +
    holes.map((h) => roundRect(h, radius)).join("")
  );
}

export function placeBubble(
  page: Size,
  anchor: Rect | null,
  bubble: Size,
  avoid: readonly Rect[],
): Placement {
  const maxX = page.w - PAGE_EDGE - bubble.w,
    maxY = page.h - PAGE_EDGE - bubble.h,
    cx = (v: number) => clamp(v, PAGE_EDGE, maxX),
    cy = (v: number) => clamp(v, PAGE_EDGE, maxY);
  if (!anchor)
    return {
      x: cx((page.w - bubble.w) / 2),
      y: cy(page.h - NO_ANCHOR_BOTTOM - bubble.h),
      side: null,
      pointer: 0,
    };
  const ax = anchor.x + anchor.w / 2,
    ay = anchor.y + anchor.h / 2,
    box = (x: number, y: number): Rect => ({ x, y, w: bubble.w, h: bubble.h }),
    fits = (x: number, y: number) =>
      x >= PAGE_EDGE && y >= PAGE_EDGE && x <= maxX && y <= maxY,
    clear = (x: number, y: number) =>
      !avoid.some((r) => intersects(box(x, y), r)),
    pointer = (side: Side, x: number, y: number) =>
      side === "below" || side === "above"
        ? clamp(ax - x, POINTER_INSET, bubble.w - POINTER_INSET)
        : clamp(ay - y, POINTER_INSET, bubble.h - POINTER_INSET);
  const spots: [Side, number, number][] = [
    ["below", cx(ax - bubble.w / 2), anchor.y + anchor.h + BUBBLE_GAP],
    ["above", cx(ax - bubble.w / 2), anchor.y - BUBBLE_GAP - bubble.h],
    ["right", anchor.x + anchor.w + BUBBLE_GAP, cy(ay - bubble.h / 2)],
    ["left", anchor.x - BUBBLE_GAP - bubble.w, cy(ay - bubble.h / 2)],
  ];
  for (const [side, x, y] of spots)
    if (fits(x, y) && clear(x, y))
      return { x, y, side, pointer: pointer(side, x, y) };
  const corners: [number, number][] = [
    [PAGE_EDGE, PAGE_EDGE],
    [cx(maxX), PAGE_EDGE],
    [PAGE_EDGE, cy(maxY)],
    [cx(maxX), cy(maxY)],
  ];
  const near = (p: [number, number]) =>
    Math.hypot(p[0] + bubble.w / 2 - ax, p[1] + bubble.h / 2 - ay);
  const corner = corners
    .filter(([x, y]) => clear(x, y))
    .sort((a, b) => near(a) - near(b))[0];
  if (corner) return { x: corner[0], y: corner[1], side: null, pointer: 0 };
  const cover = (x: number, y: number) =>
    avoid.reduce((n, r) => n + overlap(box(x, y), r), 0);
  const [side, x, y] = spots
    .map(([s, x, y]): [Side, number, number] => [s, cx(x), cy(y)])
    .sort((a, b) => cover(a[1], a[2]) - cover(b[1], b[2]))[0];
  return { x, y, side, pointer: pointer(side, x, y) };
}
```

- [ ] **Step 4: Run the spec; expect it to pass.**

### coach.ts (DOM)

- [ ] **Step 5: Implement the bodies** of `showCoach`, `hideCoach` and `coachShown`:
  - One root `<div id="rtCoach" aria-live="polite">`, appended to `document.body` on the first
    show. Inside it:
    - a full-page fixed `<svg>` (`pointer-events: none` on the svg) holding the dim `<path>`
      (`fill: rgba(6,12,18,α)`, `fill-rule: evenodd`, `d = holesPath(...)`). When `view.lock` is
      true the path has `pointer-events: visiblePainted`, so a click lands only in a hole; when
      false, `none`. `dim: 'none'` draws no path;
    - one teal outline `<rect>` per hole (stroke `#3fd0c9`, width 2, rx `HOLE_RADIUS`, the pulse
      animation 1.4 s opacity 1 to .45; none under `prefers-reduced-motion: reduce`);
    - for `view.drag`, a dashed teal line with an arrowhead from the `from` hole's centre to the
      `to` hole's edge;
    - the bubble `<div class="rt-coach-bubble">` (fixed; width `min(360px, 100vw - 16px)`), with a
      pointer square rotated 45° on the side `placeBubble` returns. Contents, top to bottom: the
      header (`.rt-coach-kick`: the header text uppercase, 12px bold, letter-spacing .08em,
      `#1e8f8a`, then the dots: done `#1e8f8a`, current amber with a soft ring, the rest
      `#c9d6de`); `.rt-coach-do` (bold 15px/1.3, ink); `.rt-coach-why` (13px/1.45, muted); the
      footer: `button.rt-coach-skip` "Skip walkthrough" on the left (12px, underlined, `#6c7c88`),
      and on the right `button.rt-coach-next` "Next" (13px bold, white on `#1e8f8a`) or the cue
      (`.rt-coach-cue`, 12px, `#1e8f8a`).
  - The holes are each target's and each drag end's `getBoundingClientRect()`, padded with
    `padRect`; a target with an empty rect (hidden) makes no hole. The bubble is placed with
    `placeBubble({w: innerWidth, h: innerHeight}, union(holes), bubbleSize, holes)`.
  - A `requestAnimationFrame` loop runs while shown: it re-measures the holes and the bubble and
    writes the DOM only when a number changed, so layout changes and resizes follow. It stops on
    hide. (The center pauses its game during explains, so the caller's own frames can't be relied
    on.)
  - `showCoach(view)` keeps the latest view and its callbacks. It rebuilds the bubble's contents
    only when the header, dots, text or footer changed, and then focuses `.rt-coach-next` if the
    footer is `next`.
  - While `view.lock` is true, a capture-phase `keydown`/`keyup`/`keypress` filter on `window`
    lets an event through when it is Esc, when its target is inside the bubble, or when
    `document.activeElement` is inside a hole's element; it stops every other one
    (`preventDefault` and `stopImmediatePropagation`). The filter goes on hide.
  - Styles: one `<style id="rtCoachStyle">` injected once. Every selector starts with `#rtCoach`.
    It opens with a reset, `#rtCoach, #rtCoach * { all: revert; box-sizing: border-box; }`, then the
    coach's own rules after it. The LINAC page makes every `button` full width and green; the
    coach's buttons must not be. Text never under 12px. `z-index: 2147483000`.
  - Under the Node checks' stub DOM (`apps/web/scripts/lib/browser-stubs.mjs`) nothing may throw.
    Guard `requestAnimationFrame` and `matchMedia` with `typeof` checks.
- [ ] **Step 6: Verify in Chromium.** Write a scratch harness in the scratchpad:
  - Bundle `coach.ts` with a scratch vite lib-mode config, also in the scratchpad.
  - Serve the built LINAC console (`/arcade/linac-ct/index.html?view=console&side=linac&scenario=tutorial`)
    the way `scripts/sim-hub-console-check.mjs` serves the arcade, inject the bundle, and show:
    - a one-target explain on the queue's first row;
    - a drag pair on two queue elements;
    - a `wait` footer.
  - At 823×512 and 1280×800, assert:
    - the bubble's box is inside the viewport, is at most 360 px wide and doesn't intersect a
      hole;
    - every text node's computed font size is at least 12px;
    - `.rt-coach-next`'s computed width is its content's, not the page's;
    - its background is `rgb(30, 143, 138)`;
    - a click outside the holes doesn't reach the page (count clicks on `document`);
    - a click inside a hole does reach it;
    - a key outside is stopped, and Esc passes.
  - Take screenshots for the controller. Also load the sim-hub page and show one bubble there;
    assert the same styling.
- [ ] **Step 7:** prettier and eslint on the three files; `npx tsc -p tsconfig.arcade.json`.
- [ ] **Step 8: Commit** `feat(shared): the Tutorial spotlight (coach.ts)` with the three files.

---

## Task 2: The step cards (center)

**Files:**

- Modify:
  - `apps/web/arcade-src/sim-hub/src/tutorial-steps.ts` and its `.spec.ts`;
  - `tutorial-machine.ts` and its `.spec.ts`;
  - `tutorial-hud.ts`;
  - `tutorial.ts`;
  - `apps/web/arcade-src/sim-hub/index.html` (the `slot:tutorial` markup and style);
  - `apps/web/scripts/sim-hub-tutorial-check.mjs`;
  - `apps/web/scripts/sim-hub-console-check.mjs` (only to continue the cards).

**Interfaces:**

- Produces:
  - phase `'card'`;
  - event `{ type: 'cardContinue' }`;
  - effects `{ type: 'showCard'; step: number }` and `{ type: 'hideCard' }`. The `'correct'`
    effect is removed.
  - `Step.card: StepCard { title: string; did: string; why: string; next: string }`.
  - `hud.showStepCard(c: { step: number; total: number; title: string; did: string; why: string;
next: string } | null)`.
  - `HudHandlers.cardContinue()`.
  - Hooks: `window.__TUTORIAL.cardContinue()`, and `state().card` (boolean: a card shows).
  - The card's elements: `#tutCard`, `#tutCardTitle`, `#tutCardContinue`.

- [ ] **Step 1: Steps data.**
  - In `tutorial-steps.ts` add `export interface StepCard { title; did; why; next }` and
    `card: StepCard` on `Step`.
  - Give each of the 11 steps its card from the spec's step-card table, verbatim.
  - Remove `reason` from `Decision` and from `ConsoleTask`, and every step's `reason` value.
  - Remove `TUTORIAL_TIMING.correctMs`.
  - Fix the comments that mention "Correct. <reason>".
  - In `tutorial-steps.spec.ts`, the text checks that read `reason` read the card's four fields
    instead. Add a test: every step has a card, the four fields are non-empty, and each title is
    unique.
- [ ] **Step 2: Machine spec first.** In `tutorial-machine.spec.ts`:
  - Every test that expects the next step's `showStep`, `roleChange` or `complete` straight after
    a completion now expects `{ type: 'hint', text: null }, { type: 'showCard', step: n }` and phase
    `'card'`. Then `cardContinue` gives `{ type: 'hideCard' }` and the old continuation.
  - Replace the `'correct'` expectations:
    - a console step's completion gives `closeConsole` and no `correct`;
    - a right answer's feedback text is `'Correct.'`;
    - a reveal's is `d.reveal`.
  - Add tests:
    - the card after every step, in a walk of the whole chapter;
    - step 2's card comes before the role change;
    - step 11's comes before `complete`;
    - a decision's Continue leads to the card;
    - `cardContinue` outside `'card'` does nothing;
    - `linac`, `beam`, `tick` and `pressedE` in `'card'` change nothing;
    - `progressOf` in `'card'` is `step / total`.
  - Run it; expect failures.
- [ ] **Step 3: Machine.** In `tutorial-machine.ts`:
  - Add `'card'` to `Phase`, `cardContinue` to `TutorialEvent`, `showCard` and `hideCard` to
    `Effect`; remove `correct`.
  - In `progressOf`: `if (s.phase === 'card') return s.step / total;`.
  - Replace `complete`, and add the event case:

```ts
const complete = (st: TutorialState): TutorialState => {
  actions(cur?.onComplete);
  fx.push({ type: "hint", text: null }, { type: "showCard", step: st.step });
  return { ...fresh(st.step, "card"), hold: s.hold };
};
```

```ts
case 'cardContinue': {
	if (!cur || s.phase !== 'card') return out(s);
	fx.push({ type: 'hideCard' });
	if (s.step >= steps.length) {
		fx.push({ type: 'complete' });
		return out(fresh(s.step, 'done'));
	}
	const next = steps[s.step];
	if (next.role !== cur.role) {
		fx.push({ type: 'roleChange', role: next.role });
		return out(fresh(s.step + 1, 'roleChange'));
	}
	return out(enter(s.step + 1));
}
```

- Then:
  - the console step's done branch pushes only `{ type: 'closeConsole' }`;
  - the right answer's text is `'Correct.'`;
  - the reveal's is `d.reveal`.
- Update the file's header comment. Run the spec; expect a pass.
- [ ] **Step 4: The card on screen.**
  - `index.html`'s `slot:tutorial` gets the card:

```html
<div
  id="tutCard"
  class="tut-card"
  role="dialog"
  aria-modal="true"
  aria-labelledby="tutCardTitle"
>
  <div class="tut-card-kick">
    <b aria-hidden="true">✓</b><span id="tutCardKick"></span>
  </div>
  <h3 id="tutCardTitle"></h3>
  <dl>
    <dt>You did</dt>
    <dd id="tutCardDid"></dd>
    <dt>Why</dt>
    <dd id="tutCardWhy"></dd>
    <dt>Next</dt>
    <dd id="tutCardNext"></dd>
  </dl>
  <div class="tut-card-foot">
    <button type="button" id="tutCardContinue">Continue</button>
  </div>
</div>
```

- Its style follows the mockup (card palette in the Global Constraints):
  - centred, width `min(520px, 100vw - 32px)`, radius 14px;
  - kick: teal, 12px uppercase;
  - title: 22px bold;
  - `dl`: a grid `92px 1fr`, `dt` amber 12px uppercase, `dd` 14px/1.45;
  - Continue: teal background, `#0b1a20` text.
  - It shows with the `.show` class, as the other tutorial cards do. It never scrolls at 992×624.
- In `tutorial-hud.ts`:
  - add the ids to `IDS`;
  - add `showStepCard(c)`: kick `Step ${c.step} of ${c.total} complete`, the four texts, show,
    focus Continue;
  - `tutCardContinue.onclick = () => handlers?.cardContinue()`;
  - hide the card in `hideTutorialHud`.
- [ ] **Step 5: tutorial.ts.**
  - Remove `correctLine`, `hintAfter` and the `'correct'` case; the `'hint'` case becomes
    `hud.setHint(e.text, e.kind)`.
  - Add `let cardOpen = false, cardStep: number | null = null;`.
  - `'showCard'`: set `cardStep = e.step`; if `consoleShown` is null, call `openCard()`. Otherwise
    the card waits for the panel: `closeStepConsole()` and `consolePanelClosed()` call
    `openCard()` when `cardStep !== null && !cardOpen`. In `consolePanelClosed()`, while the
    machine is in `'card'`, the close is not dispatched as `consoleClosed`.
  - `openCard()`:
    - `cardOpen = true`;
    - `showTrackerFor(CHAPTER_1[cardStep - 1])`, so the bar shows the step done;
    - `hud.placeMarker(null); hud.placeEdge(null);`
    - `hud.showStepCard({ step, total: CHAPTER_1.length, ...CHAPTER_1[step - 1].card })`;
    - `setPaused('tutorial', true)`, and release the pointer lock, as `openDialog` does.
  - `'hideCard'`: `cardOpen = false; cardStep = null; hud.showStepCard(null); setPaused('tutorial',
false);` and `requestWalkPointerLock()` only if `machine.phase === 'active'` (the role change
    and the end card pause again themselves).
  - `registerDialog('tutorial', ...)`:
    - its open test adds `cardOpen`;
    - its close dispatches `cardContinue` when `cardOpen`.
  - Hooks:
    - `__TUTORIAL.cardContinue = () => dispatch({ type: 'cardContinue' })`;
    - `state()` gets `card: cardOpen` and loses `correct`.
  - `initTutorialHud` gets `cardContinue`.
  - `exitTutorial` resets `cardOpen` and `cardStep`.
- [ ] **Step 6: The checks.**
  - `sim-hub-tutorial-check.mjs`:
    - where it asserts the "Correct." line, assert instead that `state().card` is true and that
      the card's title element reads the step's `card.title`;
    - then call `T.cardContinue()`, and continue as before;
    - count the cards shown by step number; at the end, assert 11 cards, each step once.
    - The room-card loop presses Continue each frame; add the same for the step card where the
      check waits.
  - `sim-hub-console-check.mjs`: after each step completes, wait for `state().card`, then call
    `cardContinue()`. Nothing else changes in this task.
- [ ] **Step 7: Verify.**
  - Run:
    - `npx vitest run arcade-src/sim-hub/src`;
    - `npx tsc -p tsconfig.arcade.json`;
    - `pnpm build:arcade`;
    - `node scripts/sim-hub-tutorial-check.mjs`;
    - `node scripts/sim-hub-npc-check.mjs`;
    - `node scripts/sim-hub-console-check.mjs`, with and without `CHECK_VIEW=992x624`;
    - `node scripts/sim-hub-free-console-check.mjs`.
  - Take screenshots of the card for steps 2, 6 and 11 at 1280×800 and 992×624, into the
    scratchpad. Run `scripts/lib/no-scroll.mjs`'s guard (as the console check uses it) on
    `#tutCard` at both sizes.
- [ ] **Step 8: Commit** `feat(sim-hub): a step card after every Tutorial step`.

---

## Task 3: The floor ring (center)

**Files:**

- Create: `apps/web/arcade-src/sim-hub/src/tutorial-ring.ts`
- Modify: `apps/web/arcade-src/sim-hub/src/tutorial.ts` (three small call sites)

**Interfaces:**

- Produces:
  - `placeRing(p: [number, number] | null, t: number): void`: null hides it; `t` is seconds, for
    the pulse;
  - `hideRing(): void`;
  - `ringShown(): [number, number] | null` (for the check hook).

- [ ] **Step 1: tutorial-ring.ts.**
  - The mesh is made on the first non-null `placeRing`, not at import (the NPC check seeds
    `Math.random`, and an Object3D draws it): a flat ring, `THREE.RingGeometry(0.42, 0.58, 48)`
    rotated to lie on the floor at y 0.03.
  - Material: `MeshBasicMaterial` teal `#3fd0c9`, transparent, `depthWrite: false`.
  - The opacity pulses between 0.45 and 0.9 over 1.4 s; it stays at 0.8 when
    `matchMedia('(prefers-reduced-motion: reduce)')` matches (guarded for the Node stubs).
  - Added to `scene` once.
- [ ] **Step 2: Where it goes.** In `tutorial.ts`, add `ringPoint(st, p)`:
  - for a room target or an escort, the target room's door: `doorPoint(roomById(st.target.roomId))`
    as x/z;
  - otherwise `destination(st, p)` (the stand point of the pressE targets).
  - In `updateTutorial`:
    - call `placeRing(machine.phase === 'active' ? ringPoint(st, p) : null, S.simSec)` once `st`
      and `p` are known;
    - call `hideRing()` in the `walkFade` branch before its return, and in the branch for the
      non-active phases.
  - `exitTutorial` calls `hideRing()`.
  - Hook: `__TUTORIAL.ring = () => ringShown()`.
- [ ] **Step 3: Verify.**
  - Run:
    - `npx tsc -p tsconfig.arcade.json`;
    - `pnpm build:arcade`;
    - `node scripts/sim-hub-npc-check.mjs` (unchanged and passing);
    - `node scripts/sim-hub-tutorial-check.mjs`.
  - Add to the tutorial check:
    - at steps 1, 2, 5 and 7, the ring is shown and within 0.5 m of the expected point;
    - in the dialog and in the walk fade it is null.
  - Take screenshots at 1280×800 of steps 1, 4, 7 and 10 (the ring under Maya, at the waiting
    area, at the LINAC Control door, at the couch side), into the scratchpad. Check by eye that
    the ring lies on the floor, not under it or floating.
- [ ] **Step 4: Commit** `feat(sim-hub): a floor ring under the Tutorial's next target`.

---

## Task 4: The contract's center side

**Files:**

- Modify: `apps/web/arcade-src/sim-hub/src/console-panel-messages.ts` and its spec,
  `console-bus.ts` and its spec, `console-panel.ts`

**Interfaces:**

- Consumes: `LinacWalkthrough`, `LinacStateMsg.walkthrough?` (Task 0).
- Produces: `linacWalkthrough: Channel<LinacWalkthrough | null>` in `console-bus.ts`, emitted on
  every state message (null when the message has none).

- [ ] **Step 1: Spec first.** In `console-panel-messages.spec.ts`, add three cases:
  - a state message with `walkthrough: { part: 'setup', index: 2, of: 7 }` is accepted and copied;
  - `walkthrough: null` is accepted;
  - a message without the field is accepted, without it. Rejected (the whole message is null):
    - a part that is not a workspace;
    - a non-integer or negative index;
    - `of` < 1;
    - index ≥ of;
    - a non-object.
- [ ] **Step 2:** Add `readWalkthrough(w): LinacWalkthrough | null | undefined` beside
      `readGeometryHold`, and read the field the same way `geometryHold` is read (only when not
      `undefined`; an invalid one rejects the message). Run the spec; expect a pass.
- [ ] **Step 3:** `console-bus.ts`:
  - add `linacWalkthrough`, with a doc comment;
  - add a spec case that it emits and removes listeners like the others;
  - mention the channel in the header comment.
  - In `console-panel.ts`'s `'rtapps-linac-state'` case, add
    `linacWalkthrough.emit(m.walkthrough ?? null)`.
- [ ] **Step 4:** Run `npx vitest run arcade-src/sim-hub/src/console-panel-messages.spec.ts
arcade-src/sim-hub/src/console-bus.spec.ts`, then `npx tsc -p tsconfig.arcade.json`.
- [ ] **Step 5: Commit** `feat(sim-hub): read the console's walkthrough from its state messages`.

---

## Task 5: The console's runner and the step 3 walkthrough

**Files:**

- Create, in `apps/web/arcade-src/linac-ct/src/`:
  - `walkthrough-mode.ts` (the runner);
  - `walkthrough-queue.ts` and its `.spec.ts`;
  - stubs `walkthrough-setup.ts`, `walkthrough-igrt.ts` and `walkthrough-delivery.ts`.
- Modify: `console-mode.ts`, `console-messages.ts` and its spec.

**Interfaces:**

- Consumes:
  - `WalkPart` (Task 0);
  - `currentIndex`, `fillTokens`, `DEFAULT_CUE`, `isDone` (Task 0);
  - `showCoach` / `hideCoach` (Task 0's no-ops until Task 1 lands; build against the interface).
- Produces:
  - `tickWalkthrough(workspace: LinacWorkspace): LinacWalkthrough | null`;
  - `noteWalkthroughEvent(e: ConsoleEvent): void`;
  - `sameWalkthrough(a, b): boolean` in `console-messages.ts`;
  - the stubs' exports, which Tasks 7 to 9 replace in place: `SETUP_WALK`, `IGRT_WALK`,
    `DELIVERY_WALK`, each `WalkPart<...>` with `steps: []`. The queue part is `QUEUE_WALK`.
  - `window.__WALKTHROUGH` (tutorial scenario only):
    - `state()` returns `{ part, index, of, id, kind, targets: string[], drag: {from, to} | null }`
      or null, where `targets` and `drag` are the selectors as resolved for this tick;
    - `next()` presses Next;
    - `skip()` presses Skip.

- [ ] **Step 1: The runner** (`walkthrough-mode.ts`).
  - State for the page's life:
    - `seen: Set<string>` (explains' Next);
    - `reached: Partial<Record<LinacWorkspace, number>>`;
    - `ended: Set<LinacWorkspace>` (finished or skipped);
    - `events: ConsoleEvent[]` (filled by `noteWalkthroughEvent`).
  - `PARTS = { queue: QUEUE_WALK, setup: SETUP_WALK, igrt: IGRT_WALK, delivery: DELIVERY_WALK }`.
  - `tickWalkthrough(workspace)`:
    - Part `p = PARTS[workspace]`. If it ended, `hideCoach()` and return null.
    - `snap = p.read(events)`; `i = currentIndex(p.steps, snap, seen, reached[workspace] ?? 0)`;
      `reached[workspace] = i`.
    - If `i === p.steps.length`: end the part, `hideCoach()`, return null.
    - Otherwise resolve the sub-step's `targets(snap)` and `drag?.(snap)` with
      `document.querySelector`, keeping elements with a non-empty rect.
    - If a target exists but is hidden by the narrow layout's Machine / Imaging tabs (see
      `console-fit.ts` and `console-screens.ts`), spotlight the tab button that shows it instead.
    - If a `do` sub-step resolves no element at all, show its bubble with `lock: false` and `dim:
'none'`, so the player is never locked out.
    - Call `showCoach` with:
      - `dim: 'full'`, `lock: true`;
      - `header: p.header`, `dots: { count: p.steps.length, index: i }`;
      - `text` filled with `fillTokens(…, step.tokens?.(snap))`;
      - `footer`: `{ kind: 'next' }` for an explain, else `{ kind: 'wait', cue: step.cue ??
DEFAULT_CUE }`;
      - `onNext`: `seen.add(step.id)`;
      - `onSkip`: end the part.
    - Return `{ part: workspace, index: i, of: p.steps.length }`.
  - Install `__WALKTHROUGH` only when `CONSOLE.scenario === 'tutorial'`.
- [ ] **Step 2: Wire it** in `console-mode.ts`:
  - `tick()` computes `walkthrough = CONSOLE.scenario === 'tutorial' ?
tickWalkthrough(workspace) : null`;
  - it adds `sameWalkthrough(posted.walkthrough, walkthrough)` to the dedupe;
  - it posts `walkthrough` with the state.
  - The sink's `event` also calls `noteWalkthroughEvent(e)`.
  - Update the header comment.
  - `sameWalkthrough` (null-safe, field by field) gets three spec cases in
    `console-messages.spec.ts`.
- [ ] **Step 3: The step 3 walkthrough** (`walkthrough-queue.ts`), header `Today's schedule`, four
      sub-steps with the spec's text verbatim:
  1. `queue.intro`, explain: target the queue's panel heading or table container, whichever keeps
     the bubble clear of it at 823×512.
  2. `queue.twins`, explain: targets the two Jordan Ellis rows (#01, the look-alike, and #02).
  3. `queue.checkin`, do: target row #02's `.rtv2-checkin`. Done when the events hold a
     `checked-in` for Jordan's MRN. Cue: `Press Check In`.
  4. `queue.chart`, do: target row #02's `.rtv2-openchart`. Done when the events hold a
     `chart-opened` for Jordan's MRN. Cue: `Press Open Chart`.
  - `read(events)` finds the rows by content, not position: Jordan's row is the one with Jordan's
    MRN or the date of birth `TUTORIAL_PATIENTS` gives. The selector is built as
    `#rtv2QueueRows .rtv2-queue-row:nth-child(n)`.
  - The spec tests the four sub-steps with made-up snapshots:
    - the current index at each state;
    - check-in by the look-alike doesn't count;
    - the targets name row #02's buttons.
- [ ] **Step 4: Stubs**: `walkthrough-setup.ts`, `-igrt.ts` and `-delivery.ts`, each with one
      `WalkPart` with `steps: []`, its header (`Patient setup`, `Check images`, `Treatment`) and
      `read: () => null`. An empty part ends at once, so those workspaces show no bubble until their
      task lands.
- [ ] **Step 5: Verify.**
  - Run:
    - `npx vitest run arcade-src/linac-ct/src`;
    - `npx tsc -p tsconfig.arcade.json`;
    - `pnpm build:arcade`;
    - both console checks at both sizes, which must still pass. The coach is a no-op until Task
      1, so step 3 plays as today.
  - With a scratch Playwright script:
    - load the console in the tutorial scenario;
    - assert `__WALKTHROUGH.state()` walks `queue.intro` → `queue.twins` (after `next()`) →
      `queue.checkin` → (after clicking row #02's Check In) `queue.chart` → (after Open Chart)
      null;
    - assert the state messages to the parent carry the matching `walkthrough`, and null after;
    - assert the free scenario has no `__WALKTHROUGH` and posts `walkthrough: null`.
- [ ] **Step 6: Commit** `feat(linac-ct): the Tutorial walkthrough runner and the schedule walkthrough`.

---

## Task 6: Getting started (center)

**Files:**

- Create, in `apps/web/arcade-src/sim-hub/src/`: `tutorial-guide-steps.ts` and its `.spec.ts`,
  and `tutorial-guide.ts`
- Modify: `tutorial.ts`, `apps/web/scripts/sim-hub-tutorial-check.mjs`

**Interfaces:**

- Consumes: `showCoach`, `hideCoach` (Task 1); `SubStep`, `currentIndex`, `isDone` (Task 0);
  Task 2's card hooks.
- Produces:
  - `GETTING_STARTED: readonly SubStep<GuideSnap>[]` and `GuideSnap { walked: number; turned:
number; nearMaya: boolean; checkedIn: boolean }`;
  - `GUIDE_DIM: Record<string, CoachDim>` and `GUIDE_LOCK: Record<string, boolean>`, by sub-step
    id;
  - in `tutorial-guide.ts`:
    - `startGuide()`;
    - `stopGuide()`;
    - `tickGuide(ctx: { pos: [number, number]; yaw: number; nearMaya: boolean; checkedIn: boolean })`;
    - `guideBlocking(): boolean` (an explain shows);
    - `guideNext()`;
    - `guideSkip()`;
    - `guideState(): { id: string; index: number; of: number; kind: SubKind } | null`.
  - Hooks: `__TUTORIAL.coach()` (`guideState()`), `coachNext()` and `coachSkip()`.

- [ ] **Step 1: Steps** (`tutorial-guide-steps.ts`), header `Getting started`, the spec's six rows
      verbatim:

| id           | kind    | targets                          | dim   | lock  | done           |
| ------------ | ------- | -------------------------------- | ----- | ----- | -------------- |
| `gs.tracker` | explain | `#tutTracker`                    | full  | true  | -              |
| `gs.marker`  | explain | `#tutMarker.show, #tutEdge.show` | full  | true  | -              |
| `gs.walk`    | do      | `#controlsBar`                   | light | false | `walked >= 3`  |
| `gs.look`    | do      | none                             | light | false | `turned >= 60` |
| `gs.follow`  | do      | none                             | none  | false | `nearMaya`     |
| `gs.checkin` | do      | `#ePrompt`                       | full  | false | `checkedIn`    |

- `walked` is metres and `turned` degrees, each measured from when its sub-step became current.
  `GUIDE_WALK_M = 3` and `GUIDE_TURN_DEG = 60` are exported.
- Cues:
  - `gs.walk`: `Walk 3 m`;
  - `gs.look`: `Turn to look around`;
  - `gs.follow`: `Follow the marker`;
  - `gs.checkin`: `Press E`.
- The spec tests the index at each state, and that `gs.look` doesn't pass on turning done before
  it came up.
- [ ] **Step 2: The runner** (`tutorial-guide.ts`).
  - `startGuide()` resets it.
  - `tickGuide(ctx)`:
    - keeps the baselines (the position and yaw when the current sub-step came up) and builds the
      snap from them;
    - computes the index;
    - shows the coach with `GUIDE_DIM` and `GUIDE_LOCK`;
    - at the end, or on skip, hides the coach and stops.
  - An explain calls `setPaused('tutorial-guide', true)` and releases the pointer lock as a
    dialog does. Its Next calls `setPaused('tutorial-guide', false)` and `requestWalkPointerLock()`
    (Next is a click, so the lock request is allowed), then shows the next sub-step at once.
  - Esc on an explain is Next.
- [ ] **Step 3: Wire it** in `tutorial.ts`:
  - `startTutorial` calls `startGuide()` after the `start` dispatch. `updateTutorial` calls
    `tickGuide` while `machine.step === 1` and the phase is `active` or `dialog`. The context:
    - the player's x/z and yaw;
    - `nearMaya`: the distance to step 1's `destination` ≤ 2.4;
    - `checkedIn`: the phase is `dialog`.
  - Because the game is paused during explains, show the first sub-step from `startGuide()`
    itself, not only from a tick.
  - `registerDialog('tutorial', ...)`'s open test adds `guideBlocking()`, and its close calls
    `guideNext()` when the guide blocks.
  - `exitTutorial` calls `stopGuide()`.
  - Add the three hooks.
- [ ] **Step 4: The check.** `sim-hub-tutorial-check.mjs`:
  - run 1 calls `coachSkip()` at the start and asserts `coach()` is null after;
  - run 2 (add it if the check has one run) plays getting started by its predicates:
    - `coachNext()` twice;
    - `placePlayer` 3 m along the entrance walk;
    - `placePlayer` with the yaw turned 70°;
    - `placePlayer` at Maya's stand point;
    - `faceTarget()` and `pressE()`;
    - assert each sub-step id in turn, then null.
  - Both runs still continue all 11 cards.
- [ ] **Step 5: Verify.**
  - Run:
    - the vitest specs, `tsc` and `pnpm build:arcade`;
    - the tutorial, NPC and both console checks at both sizes.
  - With a scratch Playwright script, take screenshots of each of the six bubbles at 1280×800 and
    992×624 into the scratchpad. Assert:
    - each bubble is inside the viewport and doesn't intersect its holes;
    - no text is under 12px;
    - the light dim's alpha is 0.34.
- [ ] **Step 6: Commit** `feat(sim-hub): the Tutorial's getting started walkthrough`.

---

## Tasks 7, 8 and 9: the step 6, 8 and 9 walkthroughs (console)

Each builder replaces one stub file and adds its spec. They touch no other file; if one must,
stop and report.

Common to all three:

- **Consumes:** `WalkPart`, `SubStep`, the runner (Task 5) and the spotlight (Task 1), both on
  your branch.
- **Text:** the spec's table for your step, verbatim.
- **Snapshot:** `read(events)` reads the console's DOM and `S` (see `state.ts`, and the ids in
  `scripts/sim-hub-console-check.mjs`, which plays every one of these screens).
- **Targets:** the selectors this state needs. Choose targets that let the bubble sit clear of
  them at 823×512.
- **Spec:** test every sub-step with made-up snapshots:
  - the index at each state;
  - a sub-step already done passed over;
  - the tokens filled.
- **Live check:** write a scratch Playwright script, from `sim-hub-console-check.mjs`'s
  set-up, that plays the Tutorial to your step. At each sub-step it asserts:
  - `__WALKTHROUGH.state()`'s id and targets;
  - the bubble's box is inside the frame and clear of its holes, at 823×512 (the panel's smallest
    frame) and at the frame size the 1280×800 center gives.
  - It also does the action through the real controls and asserts the next id.
- **Screenshots:** every bubble, at both sizes, into the scratchpad.
- **Verify:** run `npx vitest run arcade-src/linac-ct/src`, `tsc`, `pnpm build:arcade` and both
  console checks at both sizes. Those checks play today's paths; they must still pass, using
  `__WALKTHROUGH.skip()` where the bubble is in their way. Task 11 does the full rework; here,
  only add the skip.

### Task 7: step 6, the couch setup (`walkthrough-setup.ts`, export `SETUP_WALK`, header `Patient setup`)

The seven sub-steps:

- `setup.order` (explain): targets `#immobilizationOrderSummary` or `#immobilizationInstructions`.
- `setup.key` (explain): targets the immobilization key and the position chip
  (`#immobilizationPosition`).
- `setup.headrest` (do): a drag from the Headrest on `#immobilizationShelf` to
  `#immobilizationTableDrop`. Find the device by its label text; the shelf order shuffles each
  load. Done when the headrest is on the table. Cue `Drag it to the table`.
- `setup.mask` (do): the same for the Short Head Mask.
- `setup.position` (do): targets `#immoPositionCheck`; done when ticked. Cue `Tick Position`.
- `setup.indexing` (do): targets `#immoIndexCheck`; done when ticked. Cue `Tick Indexing`.
- `setup.verify` (do): targets `#immobilizationVerify`; done on the `setup-complete` event for
  Jordan. Cue `Press Verify`.

Find out how the drag works (HTML5 drag and drop or pointer events), and check that a drag
whose path crosses the dim layer still drops. If it doesn't, report; don't change `coach.ts`.

### Task 8: step 8, the check images (`walkthrough-igrt.ts`, export `IGRT_WALK`, header `Check images`)

The nine sub-steps:

- `igrt.intro` (explain): the Registration & Couch Correction panel.
- `igrt.new` (do): `#igrtNewSetup`; done when the session has started.
- `igrt.mvOut` (do): `#rtv2MachinePanel [data-console-target="consoleMV"]`; done when the panel is
  extended.
- `igrt.acquire` (do): `#igrtAcquire`; done on `images-acquired` for Jordan.
- `igrt.table` (explain): `#igrtCorrectionRows`, with tokens `{shift}` and `{axis}` from the
  correction (Jordan's: 4, Vertical).
- `igrt.motion` (do): `#rtv2MotionEnable`; done when motion is enabled. It is passed over if
  already on.
- `igrt.couch` (do): the couch key that reduces the residual, `console{Vrt,Lng,Lat}{Plus,Minus}`
  from the residual's axis and sign. Tokens `{key}` (`Vert +`, `Vert −`, …) and `{axis}`. Done on
  `shift-applied` for Jordan. An overshoot flips the key to the other sign.
- `igrt.mvIn` (do): the MV / EPID key again; done when the panel is retracted.
- `igrt.verify` (do): `#igrtVerify`; done on `alignment-verified` for Jordan.

Give every do sub-step a short cue in the style of `Press New Daily Setup`.

### Task 9: step 9, the treatment (`walkthrough-delivery.ts`, export `DELIVERY_WALK`, header `Treatment`)

The ten sub-steps:

- `delivery.intro` (explain): the delivery window.
- `delivery.fields` (explain): `#rtv2dFieldList`.
- `delivery.hold` (explain): the interlock checklist. Tokens `{now}`, `{field}` and `{planned}`
  from `deliveryGeometryHold()` (`delivery-guide.ts` formats them). It is passed over (`applies`
  false) when there's no hold.
- `delivery.motion` (do): `#rtv2MotionEnable`; done when motion is enabled.
- `delivery.move1` (do): `#consoleMoveToField`; done when the Right Lateral field is selected and
  its geometry hold is null. Cue `Hold Move to field`.
- `delivery.enable1` (do): `#rtv2EnableBeam`; done when the beam is armed or delivering, or a
  field is delivered.
- `delivery.beam1` (do): `#rtv2BeamOn`; done when one `field-delivered` for Jordan is in the
  events.
- `delivery.move2` (do): `#consoleMoveToField`; done when the Left Lateral field is selected and
  its hold is null.
- `delivery.beam2` (do): `#rtv2EnableBeam` until armed, then `#rtv2BeamOn`; done on
  `treatment-complete`.
- `delivery.done` (explain): `#rtv2dFieldList`.

The hold-to-move key is pressed with the mouse held down on it. Check that the coach's key filter
doesn't stop the console's own hold handling.

---

## Task 10: The center follows the console's walkthrough

**Files:**

- Modify: `apps/web/arcade-src/sim-hub/src/tutorial-machine.ts` and its spec, `tutorial.ts`

**Interfaces:**

- Consumes: `linacWalkthrough` (Task 4); Task 2's card phase.
- Produces: event `{ type: 'walkthrough'; on: boolean }`; `TutorialState.walkthrough: boolean`.

- [ ] **Step 1: Spec first.**
  - While `walkthrough` is on:
    - a console step's `consoleHint` is null (no hold hint, no miss hint shown);
    - a `mistake`, or another patient's check-in or chart, counts no miss and pushes no hint;
    - the hold timer stays 0.
  - Its progress events still count.
  - When it goes off (the part ended, or the player skipped), misses count from zero again.
  - `walkthrough` survives `enter()`, as `hold` does.
- [ ] **Step 2: Implement** it in the reducer, then run the spec.
- [ ] **Step 3: tutorial.ts.**
  - `linacWalkthrough.on((w) => …)`:
    - track `walkthroughOn = !!w`;
    - dispatch `{ type: 'walkthrough', on }` when it changes;
    - when it goes off while a close is pending, close the panel.
  - The `'closeConsole'` effect, after `consoleCloseMs`: if `walkthroughOn`, keep the close
    pending instead of closing (delivery's last bubble is an explain with Next). The card then
    shows when the panel closes, as Task 2 set up.
  - `exitTutorial` resets both.
- [ ] **Step 4: Verify.** Run:
  - vitest, `tsc` and `pnpm build:arcade`;
  - the tutorial check (it emits no walkthrough, so it plays as before);
  - both console checks at both sizes.
- [ ] **Step 5: Commit** `feat(sim-hub): the Tutorial holds its hints while a console walkthrough runs`.

---

## Task 11: The console check: a skipped play and a guided play

**Files:**

- Modify: `apps/web/scripts/sim-hub-console-check.mjs` (and its header comment),
  `apps/web/scripts/sim-hub-free-console-check.mjs` (one assertion)

- [ ] **Step 1: Play 1, skipped.**
  - At each console step, assert the first bubble shows with `index` 0 of the right part, then
    press its real `.rt-coach-skip` button.
  - Then run today's paths unchanged:
    - step 3's look-alike mistake and hint 1;
    - step 8's overshoot and refusal;
    - step 9's wrong-field-first path, the click-not-hold note, both fields.
  - Continue every card.
- [ ] **Step 2: Play 2, guided** (today's second play, steps 1 to 3, runs on to step 9).
  - Follow every sub-step of steps 3, 6, 8 and 9 through the real controls:
    - press Next on explains;
    - at each sub-step, assert `__WALKTHROUGH.state().id` and that the expected element sits
      inside a hole (its rect within a padded hole rect).
  - Once, during `queue.checkin`, click row #01's Check In (dimmed) and assert:
    - no `checked-in` event came;
    - no mistake was posted;
    - the sub-step didn't change.
  - Assert the center's hint line stays empty while a walkthrough runs (Task 10).
  - Continue every card.
- [ ] **Step 3: The guard.**
  - Run the no-scroll and cut-off guard (`scripts/lib/no-scroll.mjs`) on every bubble and card it
    meets.
  - Assert:
    - the bubble is inside the frame;
    - it's at most 360 px wide;
    - it intersects none of its holes;
    - no text is under 12 px.
  - CI runs the check at 1280×800 and 992×624.
- [ ] **Step 4: The free console.** In `sim-hub-free-console-check.mjs`, assert `#rtCoach` is
      absent or hidden, and that the frame's window has no `__WALKTHROUGH`.
- [ ] **Step 5: Verify.**
  - Run both console checks at both sizes, and the free check at both sizes.
  - Report each run's wall time. Each CI step has a 10-minute backstop; if a run takes over 6
    minutes on this machine, report it rather than splitting the check.
- [ ] **Step 6: Commit** `test(sim-hub): the console check plays the walkthroughs skipped and guided`.

---

## Integration (controller)

- [ ] Cherry-pick tasks 1, 2 and 3 onto `feat/tutorial-walkthrough`. Cut
      `feat/tutorial-walkthrough-console` from it, then cherry-pick tasks 4 and 5. Resolve conflicts
      in `tutorial.ts` by keeping both sides.
- [ ] After wave 2, cherry-pick task 6 onto PR A's branch and merge PR A's branch into PR B's.
      Cherry-pick tasks 7 to 10 onto PR B's branch. After wave 3, cherry-pick task 11.
- [ ] On each branch, run:
  - `pnpm check` and `pnpm test`;
  - `pnpm build:arcade` and the smoke;
  - the NPC check and the tutorial check;
  - both console checks and the free check at 1280×800 and 992×624.
  - Then prettier and eslint on every touched file.
- [ ] A whole-branch review of each PR, on the most capable model, given the spec and this plan.
- [ ] Before/after pictures of every bubble and card at 1280×800 and 992×624, on the brainstorm
      companion for the owner.
- [ ] Open PR A, then PR B; their bodies end with the Claude Code line. The owner says "merge" for
      each.
