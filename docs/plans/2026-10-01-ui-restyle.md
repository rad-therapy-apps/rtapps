# RTTLearn UI restyle — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the SvelteKit platform (`apps/web`) into the owner-approved RTTLearn look: dark navy/cyan, Inter, Lucide icons, a sidebar shell, and a "paper" reading panel. Behaviour and copy stay the same. Spec: `docs/specs/2026-10-01-ui-restyle-design.md`.

**Architecture:**

- Colour, spacing and type tokens are CSS custom properties in a new global `src/app.css`, with base element styles beside them.
- A small presentational kit lives in `src/lib/ui/`.
- The root layout renders a single `AppShell`: one nav that is a sidebar on desktop and a drawer on phones.
- Pages and components move onto the tokens and the kit with Svelte scoped styles. No Tailwind.

**Tech stack:**

- SvelteKit 2 and Svelte 5 (runes)
- `@lucide/svelte` 1.x, the Svelte 5 build of Lucide (the spec's "lucide-svelte" means the Lucide Svelte package; `lucide-svelte` itself is the Svelte 3/4 build)
- `@fontsource-variable/inter` 5.x
- Vitest 4: a browser project for `*.svelte.spec.ts`, a node project for `*.test.ts`
- Playwright 1.60 with `@axe-core/playwright` 4.x

**Rollout:** four PRs, one per branch, with an owner walk on test.rttlearn.com after each:

| PR                        | Branch                  | Tasks |
| ------------------------- | ----------------------- | ----- |
| 1, Foundation             | `ui/foundation`         | 1–5   |
| 2, Student pages          | `ui/student-pages`      | 6–9   |
| 3, Educator and authoring | `ui/educator-authoring` | 10–12 |
| 4, Admin and polish       | `ui/admin-polish`       | 13–14 |

Tasks 1–5 carry complete code. Tasks 6–14 are specified at the requirement level, for two reasons:

- the owner will adjust the look after the PR 1 walk ("make adjustments once completed");
- they re-apply PR 1's kit to existing markup.

Before each later PR starts, the controller re-reads that PR's files and writes the exact selectors and markup into each task brief.

## Global constraints

Every task implicitly includes these. They are copied from the spec.

**Accessibility**

- **WCAG 2.1 AA (NFR-16):** text needs ≥ 4.5:1 contrast; large text and UI component boundaries need ≥ 3:1. Every interactive element has a visible focus style. Colour is never the only signal.
- **Keyboard operability (NFR-17)** must not regress.
- **360 px (NFR-18):** no page scrolls horizontally at 360 px wide. Tables and the grid editor may scroll inside their own `overflow-x: auto` container.

**Assets and markup**

- **No runtime CDNs.** Inter comes from `@fontsource-variable/inter` and icons from `@lucide/svelte`, both bundled by Vite. No `<link>` to fonts.googleapis.com or similar.
- **No `{@html}`** (`svelte/no-at-html-tags`). Icons are Svelte components. Every internal `href` goes through `resolve()` (`svelte/no-navigation-without-resolve`).

**Tokens and icons**

- **Colours live only in `src/app.css`.** After Task 2, `src/lib/ui/no-hex.test.ts` enforces that no `.css` file or Svelte `<style>`/`style=`/`fill=`/`stroke=` holds a hex colour, except `src/app.css` and `src/lib/ui/Logo.svelte` (SVG presentation attributes cannot take `var()`).
- **No emoji** in platform UI markup. Use Lucide icons (`@lucide/svelte/icons/<name>`) through `src/lib/ui/Icon.svelte`. Icons are decorative (`aria-hidden`) unless they are the only label.

**Test stability (keep these exactly)**

- Selectors: `.prose`, `.ProseMirror a`, `.paste-controls textarea`, `.calc-message`, `fieldset.kc-form`, `#login-error`, `[role=alert]`, every `data-testid`.
- The accessible names and visible text of buttons, links and labels that tests assert on. Examples: "Sign out", "Sign in", "Register", "Subjects" (an exact link name), "Next", "Previous", "Finish lesson", "Check answer", "Correct", "Deck complete", "Badge earned!", "Enter the radiation oncology center".
- The restyle changes look, not behaviour or copy.
- The one copy change the owner decided is the wordmark: "RTApps" becomes "RTTLearn" in the brand and in `<title>` suffixes.

**Scope boundaries**

- **Arcade games and simulators keep their own look.** Do not touch `apps/web/arcade/**`, `apps/web/arcade-src/**` or `apps/web/static/arcade/**`. Only the platform frame around them (`ExternalPlayer.svelte`, the subject page's Games and Simulator shelf) is restyled.

**Conventions**

- **File headers:** every new `.svelte`, `.ts` and `.css` file starts with the repo's header comment ("What this file does / Used here and why / How it fits the project / Works with or Depends on / Used by"), matching neighbouring files.
- **Prettier formatting:** tabs, single quotes, printWidth 100.
- **Security:** NEVER read, create or edit any `.env*` file. Never touch `rt-app/rtt_e_workbook`, `rt-app/RT-Games`, `rt-app/simulator` or `RadTherapyPlatform` (read-only legacy).

**Gates (run from the repo root, all must pass before each commit)**

```bash
pnpm --filter web exec prettier --check src e2e ../../docs/plans/2026-10-01-ui-restyle.md ../../docs/04-conventions.md ../../docs/03-architecture.md
pnpm --filter web exec eslint .
pnpm --filter web check
pnpm --filter web test
pnpm --filter web build
```

- `pnpm --filter web lint` (prettier over `.`) currently fails locally only because of the stray, gitignored `apps/web/.superpowers` and `apps/.superpowers` build dirs. Run prettier on the paths above instead. CI runs the full `lint`.
- e2e runs in CI against the compose stack. Locally it can only run if the owner already has the dev stack up; never create the `.env` it needs.

---

## PR 1: Foundation (branch `ui/foundation`)

### Task 1: Tokens, base styles, Inter, and the token contrast test

**Files:**

- Create: `apps/web/src/app.css`
- Create: `apps/web/src/lib/ui/contrast.ts`
- Create: `apps/web/src/lib/ui/contrast.test.ts`
- Create: `apps/web/src/lib/ui/tokens.test.ts`
- Modify: `apps/web/package.json` (dependencies, via `pnpm add`)
- Modify: `apps/web/src/routes/+layout.svelte` (two imports at the top of `<script>`)
- Modify: `apps/web/src/app.html` (theme-color meta)
- Modify: `docs/04-conventions.md` (one table row)

**Interfaces:**

- Produces:
  - the CSS custom properties listed in `app.css`, which every later task uses by name;
  - `contrastRatio(fg: string, bg: string): number`;
  - `relativeLuminance(hex: string): number`.

- [ ] **Step 1: Add dependencies**

```bash
pnpm --filter web add @lucide/svelte@^1.49.0 @fontsource-variable/inter@^5.3.0
```

Expected: `apps/web/package.json` dependencies gain both, and `pnpm-lock.yaml` updates.

- [ ] **Step 2: Write the failing contrast-math test**

`apps/web/src/lib/ui/contrast.test.ts`:

```ts
/**
 * What this file does: unit tests for the WCAG contrast helpers in `contrast.ts`.
 * Used here and why: known reference values (black/white = 21:1, #777 on white just under
 * 4.5:1) pin the formula, so the token test built on it can be trusted.
 * How it fits the project: NFR-16 (WCAG 2.1 AA) verification, docs/specs/2026-10-01-ui-restyle-design.md.
 * Depends on: `./contrast`. Used by: `pnpm --filter web test` (node project).
 */
import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBe(1);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white, in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it("puts #777777 on white just under the 4.5 AA threshold", () => {
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("rejects anything that is not a 6-digit hex colour", () => {
    expect(() => contrastRatio("#fff", "#000000")).toThrow(/6-digit hex/);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter web exec vitest run --project server src/lib/ui/contrast.test.ts`
Expected: FAIL, because `./contrast` cannot be resolved.

- [ ] **Step 4: Implement `contrast.ts`**

`apps/web/src/lib/ui/contrast.ts`:

```ts
/**
 * What this file does: WCAG 2.1 relative luminance and contrast ratio for 6-digit hex colours.
 * Used here and why: the token contrast test (`tokens.test.ts`) checks every declared
 * foreground/background pair in `src/app.css` against AA. Plain math with no dependency, since
 * this is the whole formula (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
 * How it fits the project: NFR-16 verification for the UI restyle
 * (docs/specs/2026-10-01-ui-restyle-design.md, Verification).
 * Depends on: nothing. Used by: `tokens.test.ts`, `contrast.test.ts`.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;

/** sRGB relative luminance of a `#rrggbb` colour (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  if (!HEX.test(hex))
    throw new Error(`expected a 6-digit hex colour, got "${hex}"`);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#rrggbb` colours, 1–21, order-independent. */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm --filter web exec vitest run --project server src/lib/ui/contrast.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Write the failing token test**

`apps/web/src/lib/ui/tokens.test.ts`:

```ts
/**
 * What this file does: checks every declared foreground/background token pair in `src/app.css`
 * against WCAG 2.1 AA (4.5:1 text, 3:1 UI component boundaries and large text).
 * Used here and why: reads the stylesheet's `:root` block as text, so the check runs on the real
 * shipped values with no browser. Each pair here is a pairing the UI actually uses; adding a new
 * text/background combination to the UI means adding it here.
 * How it fits the project: NFR-16 (docs/02-requirements.md), the UI restyle spec's "token
 * contrast test" (docs/specs/2026-10-01-ui-restyle-design.md).
 * Depends on: `./contrast`, `src/app.css`. Used by: `pnpm --filter web test` (node project).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const css = readFileSync(new URL("../../app.css", import.meta.url), "utf8");
const rootBlock = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
const tokens = new Map(
  [...rootBlock.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [
    m[1],
    m[2],
  ]),
);

const TEXT = 4.5;
const UI = 3;

// [foreground token, background token, minimum ratio]
const PAIRS: [string, string, number][] = [
  // Body and muted text on every surface
  ...["bg", "surface", "surface-raised", "accent-soft"].flatMap(
    (bg): [string, string, number][] => [
      ["text", bg, TEXT],
      ["text-muted", bg, TEXT],
      ["accent", bg, TEXT],
    ],
  ),
  // Primary button: text on accent (rest and hover)
  ["accent-contrast", "accent", TEXT],
  ["accent-contrast", "accent-strong", TEXT],
  // Control boundaries (inputs, secondary buttons) and the focus ring
  ...["bg", "surface", "surface-raised"].flatMap(
    (bg): [string, string, number][] => [
      ["border-strong", bg, UI],
      ["accent", bg, UI],
    ],
  ),
  // Status text: on its own tinted background, and inline on page surfaces
  ...["success", "warning", "danger", "info"].flatMap(
    (s): [string, string, number][] => [
      [s, `${s}-bg`, TEXT],
      [s, "bg", TEXT],
      [s, "surface", TEXT],
      [s, "surface-raised", TEXT],
      ["text", `${s}-bg`, TEXT],
    ],
  ),
  // Reading panel: dark paper (default) and light paper
  ...["paper", "paper-light"].flatMap((p): [string, string, number][] => [
    [`${p}-text`, `${p}-bg`, TEXT],
    [`${p}-muted`, `${p}-bg`, TEXT],
    [`${p}-link`, `${p}-bg`, TEXT],
    [`${p}-text`, `${p}-th-bg`, TEXT],
    [`${p}-link`, `${p}-th-bg`, TEXT],
    ...["kp", "cn", "warn"].flatMap((k): [string, string, number][] => [
      [`${p}-text`, `${p}-callout-${k}-bg`, TEXT],
      [`${p}-muted`, `${p}-callout-${k}-bg`, TEXT],
      [`${p}-link`, `${p}-callout-${k}-bg`, TEXT],
      [`${p}-callout-${k}-bar`, `${p}-bg`, UI],
    ]),
  ]),
  // Subject tags
  ...[1, 2, 3, 4, 5, 6].map((n): [string, string, number] => [
    `tag-${n}-fg`,
    `tag-${n}-bg`,
    TEXT,
  ]),
];

describe("design tokens (src/app.css :root)", () => {
  it("declares every token the contrast pairs reference", () => {
    const missing = [...new Set(PAIRS.flatMap(([fg, bg]) => [fg, bg]))].filter(
      (name) => !tokens.has(name),
    );
    expect(missing).toEqual([]);
  });

  it.each(PAIRS)("--%s on --%s meets %s:1", (fg, bg, min) => {
    const ratio = contrastRatio(tokens.get(fg)!, tokens.get(bg)!);
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm --filter web exec vitest run --project server src/lib/ui/tokens.test.ts`
Expected: FAIL, because `readFileSync` throws ENOENT (no `src/app.css` yet).

- [ ] **Step 8: Write `src/app.css`**

Every hex value below was contrast-checked when this plan was written. Use them verbatim.
`apps/web/src/app.css`:

```css
/*
 * What this file does: the platform's design tokens (CSS custom properties) and base element
 * styles — colour, type, spacing, radius, shadows, focus ring, reduced motion.
 * Used here and why: plain CSS imported once from the root layout, so every page and component
 * shares one palette; components use Svelte scoped styles that read these tokens. Starting values
 * come from the legacy RadTherapyPlatform theme (navy surfaces, cyan accent), adjusted where a
 * legacy value failed WCAG AA (its muted text #5b7292 is not used).
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md (Architecture 1–2).
 * `src/lib/ui/tokens.test.ts` checks every text/background pair here against AA.
 * Depends on: `@fontsource-variable/inter` (imported next to this file in +layout.svelte).
 * Used by: `src/routes/+layout.svelte` (only importer); every component via var(--…).
 */

:root {
  color-scheme: dark;

  /* Surfaces */
  --bg: #0a1420;
  --surface: #101e33;
  --surface-raised: #162a45;
  --border: #1e3350; /* decorative dividers only, never a control boundary */
  --border-strong: #5a7aa3; /* control boundaries, >= 3:1 on every surface */

  /* Text */
  --text: #eaf2fb;
  --text-muted: #8fa6c2;

  /* Brand */
  --accent: #22d3ee;
  --accent-strong: #06b6d4;
  --accent-contrast: #04222a; /* text on an accent fill */
  --accent-soft: #0f2e3d; /* active nav item, selected rows */

  /* Status: foreground on its own tinted background */
  --success: #34d399;
  --success-bg: #0c2a24;
  --warning: #fbbf24;
  --warning-bg: #2a2109;
  --danger: #fca5a5;
  --danger-bg: #2e1418;
  --info: #93c5fd;
  --info-bg: #0f2240;

  /* Reading panel, dark "paper" (the default) */
  --paper-bg: #18263b;
  --paper-text: #d3dde9;
  --paper-muted: #a3b4c9;
  --paper-link: #67e8f9;
  --paper-rule: #4c6383; /* table/blockquote rules, decorative */
  --paper-th-bg: #1f3150;
  --paper-callout-kp-bg: #1b2d4a;
  --paper-callout-kp-bar: #60a5fa;
  --paper-callout-cn-bg: #16302c;
  --paper-callout-cn-bar: #34d399;
  --paper-callout-warn-bg: #33291a;
  --paper-callout-warn-bar: #fbbf24;

  /* Reading panel, light variant (switched on per student in PR 2) */
  --paper-light-bg: #f7f9fc;
  --paper-light-text: #1b2533;
  --paper-light-muted: #4a5a70;
  --paper-light-link: #0e7490;
  --paper-light-rule: #8a9ab0;
  --paper-light-th-bg: #e9eef5;
  --paper-light-callout-kp-bg: #e8f0fe;
  --paper-light-callout-kp-bar: #2563eb;
  --paper-light-callout-cn-bg: #e6f6ef;
  --paper-light-callout-cn-bar: #047857;
  --paper-light-callout-warn-bg: #fdf3e1;
  --paper-light-callout-warn-bar: #b45309;

  /* Subject tags (cyan stays the only brand colour; these only mark subjects) */
  --tag-1-fg: #7dd3fc;
  --tag-1-bg: #0f2a3d;
  --tag-2-fg: #6ee7b7;
  --tag-2-bg: #0e2c26;
  --tag-3-fg: #fcd34d;
  --tag-3-bg: #2d2510;
  --tag-4-fg: #fda4af;
  --tag-4-bg: #331820;
  --tag-5-fg: #bef264;
  --tag-5-bg: #1f2a0e;
  --tag-6-fg: #fdba74;
  --tag-6-bg: #33200f;

  /* Type */
  --font-sans:
    "Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  --font-mono:
    ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;

  /* Radius (legacy theme values) and elevation */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-2: 0 8px 24px rgb(0 0 0 / 0.45);

  /* Layout. The shell breakpoint is 50rem; media queries cannot read custom properties, so
	   50rem is written literally in AppShell.svelte and checked by ui.e2e.ts at 360px. */
  --sidebar-width: 248px;
  --content-max: 72rem;
  --control-height: 2.5rem;
}

/* ---- Base elements ---- */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100vh;
  min-height: 100dvh;
}

h1,
h2,
h3,
h4 {
  line-height: 1.25;
  text-wrap: balance;
  margin-block: 0 var(--space-3);
}
h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.015em;
}
h2 {
  font-size: var(--text-xl);
  font-weight: 650;
}
h3 {
  font-size: var(--text-lg);
  font-weight: 600;
}

p {
  margin-block: 0 var(--space-3);
}

a {
  color: var(--accent);
  text-underline-offset: 0.15em;
}
a:hover {
  color: var(--text);
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--control-height);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
}
button:hover:not(:disabled) {
  border-color: var(--accent);
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

input:not([type="radio"], [type="checkbox"], [type="range"], [type="file"]),
select,
textarea {
  min-height: var(--control-height);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg);
  max-width: 100%;
}
textarea {
  min-height: 6rem;
}
input[type="radio"],
input[type="checkbox"] {
  accent-color: var(--accent);
  width: 1.1rem;
  height: 1.1rem;
}
::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

fieldset {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin: 0 0 var(--space-4);
}
legend {
  padding-inline: var(--space-2);
  font-weight: 600;
}

table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border);
  text-align: start;
  vertical-align: top;
}
th {
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
}

code,
kbd,
pre {
  font-family: var(--font-mono);
  font-size: 0.95em;
}

hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin-block: var(--space-5);
}

::selection {
  background: var(--accent);
  color: var(--accent-contrast);
}

/* Visually hidden but read by assistive tech (skip-link target labels, icon-only context). */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 9: Run the token test to verify it passes**

Run: `pnpm --filter web exec vitest run --project server src/lib/ui/tokens.test.ts`
Expected: PASS (1 + 80 cases). If a pair fails, do not change the test. Report the pair and ratio as DONE_WITH_CONCERNS; the values come from the plan.

- [ ] **Step 10: Load the stylesheet and font**

In `apps/web/src/routes/+layout.svelte`, add these as the first two lines inside `<script lang="ts">`:

```ts
import "../app.css";
import "@fontsource-variable/inter";
```

In `apps/web/src/app.html`, add after the viewport meta:

```html
<meta name="theme-color" content="#0a1420" />
```

(`app.html` is outside Task 2's guard, which scans only `.svelte`/`.css`; a meta value cannot read a CSS token.)

In the same root layout `<style>`, replace `border-bottom: 1px solid #ddd;` with `border-bottom: 1px solid var(--border);`. The header is replaced in Task 4, but this keeps Task 2's hex grep honest in between.

- [ ] **Step 11: Conventions doc row**

In `docs/04-conventions.md`, in the conventions table, add this row after the TypeScript row:

```markdown
| Platform UI (`apps/web/src`) | `tokens.test.ts`, axe in `ui.e2e.ts` | Colours only as tokens in `src/app.css` (no hex elsewhere except `Logo.svelte`); icons from `@lucide/svelte` via `$lib/ui/Icon.svelte`, no emoji; shared pieces in `src/lib/ui/`; Svelte scoped styles, no Tailwind |
```

Match the table's existing column count. If it has a different number of columns, fit the same content into its columns and say so in the report.

- [ ] **Step 12: Gates and commit**

Run the Global gates. Expected: all pass, and the web build succeeds. Pages now render on the navy background.

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/app.css apps/web/src/app.html apps/web/src/lib/ui/contrast.ts apps/web/src/lib/ui/contrast.test.ts apps/web/src/lib/ui/tokens.test.ts apps/web/src/routes/+layout.svelte docs/04-conventions.md
git commit -m "feat(web): RTTLearn design tokens, base styles, Inter, token contrast test"
```

---

### Task 2: Dark-safety sweep (no hard-coded light colours left)

Once Task 1 lands, every page sits on `--bg`. These hard-coded light colours would then be unreadable or off-brand, so each one moves onto a token. This is the complete list from the current-UI catalog:

| Where                                                                     | Today                       | Becomes                                                         |
| ------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------- |
| `src/lib/prose/prose.css` `.prose`                                        | (inherits)                  | `color: var(--paper-text);`                                     |
| `prose.css` blockquote                                                    | `#ccc` rule, `#555` text    | `var(--paper-rule)`, `var(--paper-muted)`                       |
| `prose.css` `.callout`                                                    | `#888` bar, `#f5f5f5` bg    | `var(--paper-rule)`, `var(--paper-th-bg)`                       |
| `prose.css` `.callout-key-principle`                                      | `#2563eb`, `#eff6ff`        | `var(--paper-callout-kp-bar)`, `var(--paper-callout-kp-bg)`     |
| `prose.css` `.callout-clinical-note`                                      | `#059669`, `#ecfdf5`        | `var(--paper-callout-cn-bar)`, `var(--paper-callout-cn-bg)`     |
| `prose.css` `.callout-warning`                                            | `#d97706`, `#fffbeb`        | `var(--paper-callout-warn-bar)`, `var(--paper-callout-warn-bg)` |
| `prose.css` `th, td` border                                               | `#ddd`                      | `var(--paper-rule)`                                             |
| `prose.css` `th` bg                                                       | `#f0f0f0`                   | `var(--paper-th-bg)`                                            |
| `prose.css` `.prose-image-missing`                                        | `#999` border, `#666` text  | `var(--paper-rule)`, `var(--paper-muted)`                       |
| `prose.css` `code.math` font list                                         | literal stack               | `font-family: var(--font-mono);`                                |
| `prose.css` (new rule)                                                    | none                        | `.prose a { color: var(--paper-link); }`                        |
| `(auth)/login/+page.svelte` `.error`                                      | `#b00020`                   | `var(--danger)`                                                 |
| `(auth)/register/+page.svelte` `.error`                                   | `#b00020`                   | `var(--danger)`                                                 |
| `(app)/account/password/+page.svelte` `.error`                            | `#b00020`                   | `var(--danger)`                                                 |
| `(app)/educator/cohorts/[id]/+page.svelte` `tr.below`                     | `#fff3f3`                   | `background: var(--danger-bg);`                                 |
| `lib/author/LessonEditor.svelte` (×2), `author/quizzes/[id]/+page.svelte` | `var(--border-color, #ccc)` | `var(--border)`                                                 |

**Files:**

- Modify: every file in the table above.
- Test: `apps/web/src/lib/ui/no-hex.test.ts` (create).

**Interfaces:**

- Consumes: Task 1's tokens (names as listed in `app.css`).
- Produces: nothing new. The invariant is "no hex colours outside the allowed list".

- [ ] **Step 1: Write the failing guard test**

`apps/web/src/lib/ui/no-hex.test.ts`:

```ts
/**
 * What this file does: fails if any platform stylesheet or Svelte style outside the allowed list
 * contains a hard-coded hex colour.
 * Used here and why: the restyle keeps every colour in `src/app.css` tokens so the dark theme,
 * the reading-panel switch and the AA contrast test (`tokens.test.ts`) cover the whole UI; a
 * stray literal would bypass all three. Only CSS is scanned — `.css` files and `.svelte`
 * `<style>` blocks plus `style=`/`fill=`/`stroke=` attributes — with comments stripped, so issue
 * numbers like `#123` in comments or `href="#main"` fragments never trip it.
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md; docs/04-conventions.md
 * "Platform UI" row.
 * Depends on: node:fs. Used by: `pnpm --filter web test` (node project).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../..", import.meta.url)); // apps/web/src
const ALLOWED = new Set(["app.css", "lib/ui/Logo.svelte"]);
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(svelte|css)$/.test(name)) yield path;
  }
}

/** The CSS a file carries: whole `.css` files; `<style>` blocks and colour attributes in `.svelte`. */
function cssOf(rel: string, source: string): string {
  const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (rel.endsWith(".css")) return noComments(source);
  const styles = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
    (m) => m[1],
  );
  const attrs = [...source.matchAll(/\b(?:style|fill|stroke)="([^"]*)"/g)].map(
    (m) => m[1],
  );
  return noComments([...styles, ...attrs].join("\n"));
}

it("keeps hex colours inside src/app.css (and the logo)", () => {
  const offenders = [...files(SRC)]
    .map((path) => relative(SRC, path).split("\\").join("/"))
    .filter((rel) => !ALLOWED.has(rel))
    .flatMap((rel) =>
      [...cssOf(rel, readFileSync(join(SRC, rel), "utf8")).matchAll(HEX)].map(
        (m) => `${rel}: ${m[0]}`,
      ),
    );
  expect(offenders).toEqual([]);
});
```

(The guard scans `.svelte` and `.css` only. `.ts` holds no styles here, and `app.html`'s theme-color meta is outside `src/**/*.svelte|css`.)

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter web exec vitest run --project server src/lib/ui/no-hex.test.ts`
Expected: FAIL, listing the `prose.css`, auth-page, cohort, LessonEditor and quizzes-page colours from the table.

- [ ] **Step 3: Apply the table**

Edit each file exactly as the table says. Keep every selector and class name. Update a file's header comment only where it names the old colours. In `prose.css`, the header's "three callout-kind color variants" stays true.

- [ ] **Step 4: Run the guard and the full suite**

Run: `pnpm --filter web exec vitest run --project server src/lib/ui/no-hex.test.ts` (Expected: PASS), then the Global gates. The existing `ProseDoc.svelte.spec.ts` and `LessonEditor.svelte.spec.ts` must still pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "refactor(web): move remaining hard-coded colours onto design tokens"
```

---

### Task 3: UI kit (`src/lib/ui/`)

**Files (all new, under `apps/web/src/lib/ui/`):**

- `Icon.svelte`, `Button.svelte`, `Card.svelte`, `PageHeader.svelte`, `SubjectTag.svelte`, `subject-tag.ts`, `Field.svelte`, `Alert.svelte`, `Feedback.svelte`, `Logo.svelte`
- Tests: `ui.svelte.spec.ts` (browser project), `subject-tag.test.ts` (node project)

**Scope note (deviation from the spec's kit list):**

- The spec lists "Field/Input/Select/Textarea wrappers". Task 1's base element styles already give native `input`, `select` and `textarea` the full look. Wrapping them would only forward attributes, so only `Field` (label plus control layout) is built.
- `Field` has no error prop: this app's form errors are page-level (`#login-error`, `role="alert"` paragraphs) and stay so.

**Interfaces (Produces, used by Tasks 4–14):**

- `Icon`: `{ icon: Component<LucideProps>; label?: string; size?: number = 18 }`. Decorative (`aria-hidden`) unless `label` is given; then `role="img"` with that name.
- `Button`: `HTMLButtonAttributes` minus `class`, plus `{ variant?: 'primary' | 'secondary' | 'ghost' | 'danger' = 'secondary'; icon?: Component<LucideProps>; children: Snippet }`. Default `type="button"`.
- `Card`: `{ as?: 'div' | 'section' | 'article' | 'li' = 'div'; children: Snippet }`.
- `PageHeader`: `{ title: string; subtitle?: string; actions?: Snippet }`. Renders the page's single `<h1>`.
- `SubjectTag`: `{ slug: string; label: string }`. `subject-tag.ts` exports `tagIndex(slug: string): 1 | 2 | 3 | 4 | 5 | 6`.
- `Field`: `{ label: string; id: string; children: Snippet }`. The caller's control must carry `id={id}`.
- `Alert`: `{ tone: 'info' | 'success' | 'warning' | 'danger'; id?: string; role?: 'alert' | 'status'; children: Snippet }`.
- `Feedback`: `{ correct: boolean; children: Snippet }`. Icon plus caller-supplied text; the caller keeps the exact copy.
- `Logo`: `{ size?: number = 28 }`. Decorative (`aria-hidden`); the wordmark text beside it is the name.

- [ ] **Step 1: Write the failing node test for `tagIndex`**

`apps/web/src/lib/ui/subject-tag.test.ts`:

```ts
/**
 * What this file does: unit tests for `tagIndex`, the slug → subject-tag colour mapping.
 * Used here and why: the mapping must be stable (a subject keeps its colour across visits and
 * deploys) and always land in the six declared tag tokens.
 * How it fits the project: subject tags, docs/specs/2026-10-01-ui-restyle-design.md (Decisions).
 * Depends on: `./subject-tag`. Used by: `pnpm --filter web test` (node project).
 */
import { describe, expect, it } from "vitest";
import { tagIndex } from "./subject-tag";

describe("tagIndex", () => {
  it("is deterministic for a slug", () => {
    expect(tagIndex("radiation-biology")).toBe(tagIndex("radiation-biology"));
  });

  it("always returns 1–6", () => {
    for (const slug of [
      "",
      "a",
      "radiation-biology",
      "sectional-anatomy",
      "x".repeat(200),
    ]) {
      expect([1, 2, 3, 4, 5, 6]).toContain(tagIndex(slug));
    }
  });

  it("spreads the seeded subjects over more than one colour", () => {
    const seeded = [
      "radiation-biology",
      "sectional-anatomy",
      "patient-care",
      "physics",
    ];
    expect(new Set(seeded.map(tagIndex)).size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter web exec vitest run --project server src/lib/ui/subject-tag.test.ts`
Expected: FAIL, because `./subject-tag` cannot be resolved.

- [ ] **Step 3: Implement `subject-tag.ts`**

```ts
/**
 * What this file does: maps a subject slug to one of the six subject-tag colour tokens.
 * Used here and why: a small string hash keeps each subject's colour stable without storing a
 * colour per subject in the API; cyan stays the only brand colour, tags only mark subjects.
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md (Subject colour).
 * Depends on: nothing. Used by: `SubjectTag.svelte`.
 */
export type TagIndex = 1 | 2 | 3 | 4 | 5 | 6;

export function tagIndex(slug: string): TagIndex {
  let hash = 7;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return ((hash % 6) + 1) as TagIndex;
}
```

Run the test again. Expected: PASS (3 tests).

- [ ] **Step 4: Write the failing component tests**

`apps/web/src/lib/ui/ui.svelte.spec.ts`:

```ts
/**
 * What this file does: browser component tests for the shared UI kit in `src/lib/ui/`.
 * Used here and why: vitest-browser-svelte renders each component in real Chromium and asserts
 * through roles and names (no class or colour assertions), matching the repo's other
 * `*.svelte.spec.ts` files; `createRawSnippet` supplies children.
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).
 * Depends on: `vitest/browser`, `vitest-browser-svelte`, the kit components.
 * Used by: `pnpm --filter web test` (client project).
 */
import { page } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet } from "svelte";
import Check from "@lucide/svelte/icons/check";
import Alert from "./Alert.svelte";
import Button from "./Button.svelte";
import Card from "./Card.svelte";
import Feedback from "./Feedback.svelte";
import Field from "./Field.svelte";
import Icon from "./Icon.svelte";
import PageHeader from "./PageHeader.svelte";
import SubjectTag from "./SubjectTag.svelte";

const text = (t: string) =>
  createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));

describe("Icon", () => {
  it("is hidden from assistive tech by default", async () => {
    const { container } = render(Icon, { icon: Check });
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("is an image with a name when labelled", async () => {
    render(Icon, { icon: Check, label: "Done" });
    await expect.element(page.getByRole("img", { name: "Done" })).toBeVisible();
  });
});

describe("Button", () => {
  it('defaults to type="button" and fires onclick', async () => {
    const onclick = vi.fn();
    render(Button, { children: text("Save"), onclick });
    const button = page.getByRole("button", { name: "Save" });
    await expect.element(button).toHaveAttribute("type", "button");
    await button.click();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('passes type="submit" and disabled through', async () => {
    render(Button, {
      children: text("Send"),
      type: "submit",
      disabled: true,
      variant: "primary",
    });
    const button = page.getByRole("button", { name: "Send" });
    await expect.element(button).toHaveAttribute("type", "submit");
    await expect.element(button).toBeDisabled();
  });

  it("keeps the accessible name to the text when an icon is set", async () => {
    render(Button, {
      children: text("Sign out"),
      icon: Check,
      variant: "ghost",
    });
    await expect
      .element(page.getByRole("button", { name: "Sign out", exact: true }))
      .toBeVisible();
  });
});

describe("Alert", () => {
  it("passes id and role through and shows its text", async () => {
    render(Alert, {
      tone: "danger",
      id: "login-error",
      role: "alert",
      children: text("Bad password"),
    });
    const alert = page.getByRole("alert");
    await expect.element(alert).toHaveAttribute("id", "login-error");
    await expect.element(alert).toHaveTextContent("Bad password");
  });
});

describe("Feedback", () => {
  it("renders the caller’s exact text for a correct answer", async () => {
    render(Feedback, { correct: true, children: text("Correct") });
    await expect
      .element(page.getByText("Correct", { exact: true }))
      .toBeVisible();
  });

  it("renders the caller’s exact text for an incorrect answer", async () => {
    render(Feedback, { correct: false, children: text("Incorrect") });
    await expect
      .element(page.getByText("Incorrect", { exact: true }))
      .toBeVisible();
  });
});

describe("PageHeader", () => {
  it("renders one h1 with the title and the subtitle", async () => {
    render(PageHeader, { title: "Subjects", subtitle: "Pick a subject" });
    await expect
      .element(page.getByRole("heading", { level: 1, name: "Subjects" }))
      .toBeVisible();
    await expect.element(page.getByText("Pick a subject")).toBeVisible();
  });
});

describe("Field", () => {
  it("labels the control it wraps", async () => {
    render(Field, {
      label: "Email",
      id: "email",
      children: createRawSnippet(() => ({
        render: () => '<input id="email" type="email" />',
      })),
    });
    await expect.element(page.getByLabelText("Email")).toBeVisible();
  });
});

describe("Card and SubjectTag", () => {
  it("Card renders as the requested element", async () => {
    const { container } = render(Card, {
      as: "section",
      children: text("Body"),
    });
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("SubjectTag shows its label", async () => {
    render(SubjectTag, {
      slug: "radiation-biology",
      label: "Radiation Biology",
    });
    await expect.element(page.getByText("Radiation Biology")).toBeVisible();
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `pnpm --filter web exec vitest run --project client src/lib/ui/ui.svelte.spec.ts`
Expected: FAIL, because the component imports cannot be resolved.

- [ ] **Step 6: Implement the components**

Every file gets the repo header comment, in the same format as above. Bodies:

`Icon.svelte`:

```svelte
<script lang="ts">
	import type { Component } from 'svelte';
	import type { LucideProps } from '@lucide/svelte';

	let {
		icon: IconComponent,
		label,
		size = 18
	}: { icon: Component<LucideProps>; label?: string; size?: number } = $props();
</script>

{#if label}
	<IconComponent {size} strokeWidth={2} role="img" aria-label={label} focusable="false" />
{:else}
	<IconComponent {size} strokeWidth={2} aria-hidden="true" focusable="false" />
{/if}
```

`Button.svelte`:

```svelte
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { LucideProps } from '@lucide/svelte';
	import Icon from './Icon.svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	let {
		variant = 'secondary',
		type = 'button',
		icon,
		children,
		...rest
	}: Omit<HTMLButtonAttributes, 'class'> & {
		variant?: Variant;
		icon?: Component<LucideProps>;
		children: Snippet;
	} = $props();
</script>

<button {type} class="btn btn-{variant}" {...rest}>
	{#if icon}<Icon {icon} />{/if}
	{@render children()}
</button>

<style>
	/* Base look comes from app.css `button`; variants only change fill and border. */
	.btn-primary {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-contrast);
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--accent-strong);
		border-color: var(--accent-strong);
	}
	.btn-ghost {
		background: transparent;
		border-color: transparent;
		color: var(--text-muted);
	}
	.btn-ghost:hover:not(:disabled) {
		background: var(--surface-raised);
		border-color: transparent;
		color: var(--text);
	}
	.btn-danger {
		background: var(--danger-bg);
		border-color: var(--danger);
		color: var(--danger);
	}
</style>
```

`Card.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		as = 'div',
		children
	}: { as?: 'div' | 'section' | 'article' | 'li'; children: Snippet } = $props();
</script>

<svelte:element this={as} class="card">{@render children()}</svelte:element>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-5);
		box-shadow: var(--shadow-1);
		list-style: none;
	}
</style>
```

`PageHeader.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		subtitle,
		actions
	}: { title: string; subtitle?: string; actions?: Snippet } = $props();
</script>

<header class="page-header">
	<div>
		<h1>{title}</h1>
		{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</header>

<style>
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4);
		margin-block-end: var(--space-5);
	}
	h1 {
		margin: 0;
	}
	.subtitle {
		margin: var(--space-1) 0 0;
		color: var(--text-muted);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
```

`SubjectTag.svelte`:

```svelte
<script lang="ts">
	import { tagIndex } from './subject-tag';
	let { slug, label }: { slug: string; label: string } = $props();
	const n = $derived(tagIndex(slug));
</script>

<span class="tag tag-{n}"><span class="dot" aria-hidden="true"></span>{label}</span>

<style>
	.tag {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: 0.125rem var(--space-2);
		border-radius: 999px;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: currentColor;
	}
	.tag-1 { color: var(--tag-1-fg); background: var(--tag-1-bg); }
	.tag-2 { color: var(--tag-2-fg); background: var(--tag-2-bg); }
	.tag-3 { color: var(--tag-3-fg); background: var(--tag-3-bg); }
	.tag-4 { color: var(--tag-4-fg); background: var(--tag-4-bg); }
	.tag-5 { color: var(--tag-5-fg); background: var(--tag-5-bg); }
	.tag-6 { color: var(--tag-6-fg); background: var(--tag-6-bg); }
</style>
```

(Prettier will expand the one-line rules. That is fine.)

`Field.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	let { label, id, children }: { label: string; id: string; children: Snippet } = $props();
</script>

<div class="field">
	<label for={id}>{label}</label>
	{@render children()}
</div>

<style>
	.field {
		display: grid;
		gap: var(--space-1);
	}
	label {
		font-weight: 600;
		font-size: var(--text-sm);
	}
</style>
```

`Alert.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Icon from './Icon.svelte';

	type Tone = 'info' | 'success' | 'warning' | 'danger';
	let {
		tone,
		id,
		role,
		children
	}: { tone: Tone; id?: string; role?: 'alert' | 'status'; children: Snippet } = $props();
	const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert };
</script>

<div class="alert alert-{tone}" {id} {role}>
	<Icon icon={icons[tone]} />
	<div>{@render children()}</div>
</div>

<style>
	.alert {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		padding: var(--space-3) var(--space-4);
		border: 1px solid currentColor;
		border-radius: var(--radius-sm);
		margin-block: var(--space-3);
	}
	.alert :global(svg) {
		flex: none;
		margin-top: 0.15em;
	}
	.alert-info { color: var(--info); background: var(--info-bg); }
	.alert-success { color: var(--success); background: var(--success-bg); }
	.alert-warning { color: var(--warning); background: var(--warning-bg); }
	.alert-danger { color: var(--danger); background: var(--danger-bg); }
</style>
```

`Feedback.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Icon from './Icon.svelte';

	let { correct, children }: { correct: boolean; children: Snippet } = $props();
</script>

<!-- Icon shape (check vs cross) plus the caller's words carry the meaning; colour only repeats it. -->
<p class="feedback" class:correct class:incorrect={!correct}>
	<Icon icon={correct ? CircleCheck : CircleX} />
	<span>{@render children()}</span>
</p>

<style>
	.feedback {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-sm);
	}
	.correct { color: var(--success); background: var(--success-bg); }
	.incorrect { color: var(--danger); background: var(--danger-bg); }
</style>
```

`Logo.svelte`: a copy of the legacy mark `RadTherapyPlatform/public/rtapps-icon.svg` (read-only source; copy the markup, never link to it). Mention Kevin Kindle's legacy mark in the header comment's "How it fits" line:

```svelte
<script lang="ts">
	let { size = 28 }: { size?: number } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 64 64"
	width={size}
	height={size}
	aria-hidden="true"
	focusable="false"
>
	<rect width="64" height="64" rx="12" fill="#0B1A2E" />
	<circle cx="32" cy="32" r="21" fill="none" stroke="#1E3A5F" stroke-width="2" />
	<path
		d="M32 11 A21 21 0 0 1 50.2 41.5"
		fill="none"
		stroke="#22D3EE"
		stroke-width="3"
		stroke-linecap="round"
	/>
	<circle cx="32" cy="32" r="6" fill="#22D3EE" />
	<circle cx="32" cy="11" r="2.5" fill="#22D3EE" />
</svg>
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter web exec vitest run src/lib/ui`
Expected: PASS in both projects (ui.svelte.spec.ts, subject-tag.test.ts, and Task 1/2's tests).

- [ ] **Step 8: Gates and commit**

Run the Global gates.

```bash
git add apps/web/src/lib/ui
git commit -m "feat(web): shared UI kit — Icon, Button, Card, PageHeader, SubjectTag, Field, Alert, Feedback, Logo"
```

---

### Task 4: App shell (sidebar on desktop, top bar and drawer on phones) and the RTTLearn wordmark

**Files:**

- Create: `apps/web/src/lib/ui/AppShell.svelte`
- Create: `apps/web/src/lib/ui/AppShell.svelte.spec.ts`
- Create: `apps/web/src/lib/assets/rttlearn-icon.svg` (byte-for-byte copy of `RadTherapyPlatform/public/rtapps-icon.svg`)
- Delete: `apps/web/src/lib/assets/favicon.svg` (the Svelte logo; its only importer is replaced below)
- Delete: `apps/web/src/routes/(app)/+layout.svelte` (its nav moves into AppShell; SvelteKit's default layout renders children)
- Modify: `apps/web/src/routes/+layout.svelte` (shell for signed-in users, public bar otherwise)
- Modify: `apps/web/src/routes/(app)/+layout.server.ts` (header "Used by" line only: it now feeds the root shell's pages; the svelte layout is gone)
- Modify: `apps/web/src/routes/+page.svelte` (`<main>` becomes `<div>`, because the layout owns `<main>`; `<h1>RTApps</h1>` becomes `<h1>RTTLearn</h1>`)
- Modify: every `<title>… — RTApps</title>` in `apps/web/src/routes/**` (22 files) to `— RTTLearn` (`grep -rln "— RTApps" apps/web/src`)

**Interfaces:**

- Consumes: `Icon`, `Button`, `Logo` (Task 3); tokens (Task 1).
- Produces:
  - `AppShell` props `{ user: App.User; currentPath: string; signOut: Snippet; children: Snippet }`;
  - the page's single `<main id="main">`.

  Pages from Task 6 on render inside `<main>` and must not add their own `<main>`.

**Design rules:**

- **One nav in the DOM.** On desktop it is the sidebar. Below `50rem` the same `<nav>` is hidden until the menu button opens it. Duplicate nav markup would break e2e's `getByRole('link', { name: 'Subjects', exact: true })` strict-mode lookup.
- **Role gating unchanged:** Home and Subjects for everyone; Educator and Author for `role !== 'student'`; Admin (`/admin/users`) and Audit log for `role === 'admin'`. Labels are exactly those words.
- **Active link:** `aria-current="page"` when `currentPath === href` or `currentPath.startsWith(href + '/')`. Styled with the accent bar plus weight, so colour is not the only signal.
- **Menu button:**
  - `aria-expanded`, `aria-controls="app-nav"`, and name "Open menu" or "Close menu".
  - Escape closes the menu and returns focus to the button.
  - Navigating (a `currentPath` change) closes it.
- **Hrefs inline:** write every nav `href={resolve(…)}` directly in markup. The `svelte/no-navigation-without-resolve` rule does not accept hrefs stored in arrays.
- **Sign-out form stays in the root layout** (it uses `use:enhance` from `$app/forms`) and is passed in as the `signOut` snippet, so AppShell stays testable in the browser project. The button keeps the accessible name "Sign out".

- [ ] **Step 1: Write the failing AppShell test**

`apps/web/src/lib/ui/AppShell.svelte.spec.ts`:

```ts
/**
 * What this file does: browser tests for AppShell — role-gated links, the active link, and the
 * phone drawer (open/close, Escape, focus return) at a 360px viewport.
 * Used here and why: real Chromium via vitest-browser-svelte so the media-query layout is
 * exercised; `page.viewport` switches between phone and desktop widths.
 * How it fits the project: NFR-17/NFR-18, docs/specs/2026-10-01-ui-restyle-design.md (App shell).
 * Depends on: `vitest/browser`, `vitest-browser-svelte`, `./AppShell.svelte`.
 * Used by: `pnpm --filter web test` (client project).
 */
import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet } from "svelte";
import AppShell from "./AppShell.svelte";

const snippet = (html: string) =>
  createRawSnippet(() => ({ render: () => html }));
const user = (role: App.User["role"]): App.User => ({
  id: "u1",
  email: "u@example.com",
  display_name: "Pat Example",
  role,
});
const props = (role: App.User["role"], currentPath = "/home") => ({
  user: user(role),
  currentPath,
  signOut: snippet('<button type="submit">Sign out</button>'),
  children: snippet("<p>Page body</p>"),
});
const navLinks = () =>
  page.getByRole("navigation", { name: "Main" }).getByRole("link");

afterEach(async () => {
  await page.viewport(1280, 800);
});

describe("AppShell on desktop", () => {
  it("shows only Home and Subjects to a student", async () => {
    await page.viewport(1280, 800);
    render(AppShell, props("student"));
    await expect
      .element(page.getByRole("link", { name: "Subjects", exact: true }))
      .toBeVisible();
    expect(
      navLinks()
        .elements()
        .map((a) => a.textContent?.trim()),
    ).toEqual(["Home", "Subjects"]);
  });

  it("shows every area to an admin", async () => {
    await page.viewport(1280, 800);
    render(AppShell, props("admin"));
    await expect
      .element(page.getByRole("link", { name: "Audit log" }))
      .toBeVisible();
    expect(
      navLinks()
        .elements()
        .map((a) => a.textContent?.trim()),
    ).toEqual(["Home", "Subjects", "Educator", "Author", "Admin", "Audit log"]);
  });

  it("marks the current section with aria-current", async () => {
    await page.viewport(1280, 800);
    render(AppShell, props("student", "/subjects/radiation-biology"));
    await expect
      .element(page.getByRole("link", { name: "Subjects", exact: true }))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(page.getByRole("link", { name: "Home", exact: true }))
      .not.toHaveAttribute("aria-current");
  });

  it("hides the menu button, shows the account block and the page", async () => {
    await page.viewport(1280, 800);
    render(AppShell, props("student"));
    await expect
      .element(page.getByRole("button", { name: "Open menu" }))
      .not.toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Sign out" }))
      .toBeVisible();
    await expect.element(page.getByText("Pat Example")).toBeVisible();
    await expect.element(page.getByRole("main")).toHaveTextContent("Page body");
  });
});

describe("AppShell on a 360px phone", () => {
  it("collapses the nav behind a menu button", async () => {
    await page.viewport(360, 780);
    render(AppShell, props("student"));
    const menu = page.getByRole("button", { name: "Open menu" });
    await expect.element(menu).toBeVisible();
    await expect.element(menu).toHaveAttribute("aria-expanded", "false");
    await expect
      .element(page.getByRole("link", { name: "Subjects", exact: true }))
      .not.toBeVisible();

    await menu.click();
    await expect
      .element(page.getByRole("button", { name: "Close menu" }))
      .toHaveAttribute("aria-expanded", "true");
    await expect
      .element(page.getByRole("link", { name: "Subjects", exact: true }))
      .toBeVisible();
  });

  it("closes on Escape and returns focus to the menu button", async () => {
    await page.viewport(360, 780);
    render(AppShell, props("student"));
    await page.getByRole("button", { name: "Open menu" }).click();
    await userEvent.keyboard("{Escape}");
    const menu = page.getByRole("button", { name: "Open menu" });
    await expect.element(menu).toHaveAttribute("aria-expanded", "false");
    await expect.element(menu).toHaveFocus();
  });

  it("closes when the current path changes", async () => {
    await page.viewport(360, 780);
    const { rerender } = render(AppShell, props("student", "/home"));
    await page.getByRole("button", { name: "Open menu" }).click();
    await rerender({ currentPath: "/subjects" });
    await expect
      .element(page.getByRole("button", { name: "Open menu" }))
      .toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter web exec vitest run --project client src/lib/ui/AppShell.svelte.spec.ts`
Expected: FAIL, because `./AppShell.svelte` cannot be resolved.

- [ ] **Step 3: Implement `AppShell.svelte`**

Header comment in repo format (mention: single nav, role gating is presentation only and real authorization is `guard.ts`, sign-out comes in as a snippet). Body:

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import House from '@lucide/svelte/icons/house';
	import Menu from '@lucide/svelte/icons/menu';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import UserRound from '@lucide/svelte/icons/user-round';
	import X from '@lucide/svelte/icons/x';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';

	let {
		user,
		currentPath,
		signOut,
		children
	}: { user: App.User; currentPath: string; signOut: Snippet; children: Snippet } = $props();

	let menuOpen = $state(false);
	let menuButton: HTMLButtonElement | undefined = $state();

	// Any navigation closes the phone drawer.
	$effect(() => {
		void currentPath;
		menuOpen = false;
	});

	function isCurrent(href: string): 'page' | undefined {
		return currentPath === href || currentPath.startsWith(href + '/') ? 'page' : undefined;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menuOpen) {
			menuOpen = false;
			menuButton?.focus();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<a class="skip-link" href="#main">Skip to content</a>

<div class="shell">
	<header class="sidebar">
		<div class="sidebar-head">
			<a class="brand" href={resolve('/')}>
				<Logo size={28} />
				<span>RTTLearn</span>
			</a>
			<button
				type="button"
				class="menu-button"
				aria-controls="app-nav"
				aria-expanded={menuOpen}
				aria-label={menuOpen ? 'Close menu' : 'Open menu'}
				bind:this={menuButton}
				onclick={() => (menuOpen = !menuOpen)}
			>
				<Icon icon={menuOpen ? X : Menu} size={22} />
			</button>
		</div>

		<div id="app-nav" class="sidebar-body" class:open={menuOpen}>
			<nav aria-label="Main">
				<ul>
					<li>
						<a href={resolve('/(app)/home')} aria-current={isCurrent(resolve('/(app)/home'))}>
							<Icon icon={House} />Home
						</a>
					</li>
					<li>
						<a
							href={resolve('/(app)/subjects')}
							aria-current={isCurrent(resolve('/(app)/subjects'))}
						>
							<Icon icon={BookOpen} />Subjects
						</a>
					</li>
					<!-- Educators and admins both get the educator and author areas; students don't.
					     Wayfinding only — guard.ts does the real authorization. -->
					{#if user.role !== 'student'}
						<li>
							<a
								href={resolve('/(app)/educator')}
								aria-current={isCurrent(resolve('/(app)/educator'))}
							>
								<Icon icon={GraduationCap} />Educator
							</a>
						</li>
						<li>
							<a href={resolve('/(app)/author')} aria-current={isCurrent(resolve('/(app)/author'))}>
								<Icon icon={PenLine} />Author
							</a>
						</li>
					{/if}
					{#if user.role === 'admin'}
						<li>
							<a
								href={resolve('/(app)/admin/users')}
								aria-current={isCurrent(resolve('/(app)/admin/users'))}
							>
								<Icon icon={UserCog} />Admin
							</a>
						</li>
						<li>
							<a
								href={resolve('/(app)/admin/audit')}
								aria-current={isCurrent(resolve('/(app)/admin/audit'))}
							>
								<Icon icon={ScrollText} />Audit log
							</a>
						</li>
					{/if}
				</ul>
			</nav>

			<div class="account">
				<span class="user-name">{user.display_name}</span>
				<a
					href={resolve('/(app)/account/password')}
					aria-current={isCurrent(resolve('/(app)/account/password'))}
				>
					<Icon icon={UserRound} />Account
				</a>
				{@render signOut()}
			</div>
		</div>
	</header>

	<main id="main" tabindex="-1">
		{@render children()}
	</main>
</div>

<style>
	.skip-link {
		position: absolute;
		left: var(--space-4);
		top: -4rem;
		z-index: 20;
		padding: var(--space-2) var(--space-4);
		background: var(--accent);
		color: var(--accent-contrast);
		border-radius: var(--radius-sm);
		font-weight: 600;
	}
	.skip-link:focus {
		top: var(--space-4);
	}

	.shell {
		display: grid;
		grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
		min-height: 100vh;
		min-height: 100dvh;
	}

	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-5) var(--space-4);
		background: var(--surface);
		border-right: 1px solid var(--border);
		overflow-y: auto;
	}
	.sidebar-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
		text-decoration: none;
		font-size: var(--text-lg);
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.menu-button {
		display: none;
		padding: 0;
		width: var(--control-height);
		background: transparent;
	}

	.sidebar-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: space-between;
		gap: var(--space-5);
	}
	ul {
		display: grid;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	nav a,
	.account a {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--control-height);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		text-decoration: none;
	}
	nav a:hover,
	.account a:hover {
		background: var(--surface-raised);
		color: var(--text);
	}
	/* Current section: tinted fill + accent bar + heavier weight, so colour is not the only cue. */
	a[aria-current='page'] {
		background: var(--accent-soft);
		box-shadow: inset 3px 0 0 var(--accent);
		color: var(--text);
		font-weight: 600;
	}
	.account {
		display: grid;
		gap: var(--space-1);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}
	.account :global(form) {
		display: contents;
	}
	.user-name {
		padding-inline: var(--space-3);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	main {
		width: 100%;
		max-width: var(--content-max);
		padding: var(--space-6);
	}
	main:focus {
		outline: none;
	}

	/* Phones and narrow tablets: the sidebar becomes a sticky top bar; the same nav opens as a
	   drawer under it. 50rem is the shell breakpoint documented in app.css. */
	@media (max-width: 50rem) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}
		.sidebar {
			z-index: 10;
			height: auto;
			padding: var(--space-3) var(--space-4);
			border-right: 0;
			border-bottom: 1px solid var(--border);
			overflow: visible;
		}
		.menu-button {
			display: inline-flex;
		}
		.sidebar-body {
			display: none;
		}
		.sidebar-body.open {
			display: flex;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			max-height: calc(100dvh - 4rem);
			overflow-y: auto;
			padding: var(--space-4);
			background: var(--surface);
			border-bottom: 1px solid var(--border);
			box-shadow: var(--shadow-2);
		}
		main {
			padding: var(--space-5) var(--space-4);
		}
	}
</style>
```

If eslint's `svelte/no-navigation-without-resolve` flags the fragment link `href="#main"`, add `<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- in-page fragment, not a route -->` above it. Do not change the link.

- [ ] **Step 4: Run the AppShell test to verify it passes**

Run: `pnpm --filter web exec vitest run --project client src/lib/ui/AppShell.svelte.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Root layout**

Replace the body of `apps/web/src/routes/+layout.svelte` (keep the header comment, updated to describe the shell and the public bar):

```svelte
<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/inter';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LogOut from '@lucide/svelte/icons/log-out';
	import favicon from '$lib/assets/rttlearn-icon.svg';
	import AppShell from '$lib/ui/AppShell.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Logo from '$lib/ui/Logo.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- The sign-out form stays here (it needs $app/forms' enhance) and is handed to AppShell. -->
{#snippet signOut()}
	<form method="POST" action="/logout" use:enhance>
		<Button type="submit" variant="ghost" icon={LogOut}>Sign out</Button>
	</form>
{/snippet}

{#if data.user}
	<AppShell user={data.user} currentPath={page.url.pathname} {signOut}>
		{@render children()}
	</AppShell>
{:else}
	<!-- Signed out: brand plus sign-in / register links only. -->
	<header class="public-bar">
		<a href={resolve('/')} class="brand"><Logo size={28} /><span>RTTLearn</span></a>
		<nav aria-label="Account">
			<a href={resolve('/(auth)/login')}>Sign in</a>
			<a href={resolve('/(auth)/register')}>Register</a>
		</nav>
	</header>
	<main id="main" class="public-main">
		{@render children()}
	</main>
{/if}

<style>
	.public-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-5);
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
		text-decoration: none;
		font-size: var(--text-lg);
		font-weight: 700;
	}
	nav {
		display: flex;
		gap: var(--space-4);
	}
	.public-main {
		max-width: 32rem;
		margin-inline: auto;
		padding: var(--space-6) var(--space-4);
	}
</style>
```

- `.ghost` sign-out sits inside `.account` (which displays `form` as `contents`), so the button lines up with the Account link. Add `justify-content: flex-start` for the ghost button through `.account :global(.btn-ghost) { justify-content: flex-start; }` in AppShell's style block.
- Copy the logo: `cp ../RadTherapyPlatform/public/rtapps-icon.svg apps/web/src/lib/assets/rttlearn-icon.svg`, run from `rt-app/rtapps`; the source stays untouched.
- Delete `apps/web/src/lib/assets/favicon.svg` and `apps/web/src/routes/(app)/+layout.svelte`.

- [ ] **Step 6: Landing page and titles**

- In `apps/web/src/routes/+page.svelte`: `<main>` becomes `<div>`, and `<h1>RTApps</h1>` becomes `<h1>RTTLearn</h1>`.
- Run `grep -rl "— RTApps" apps/web/src | xargs sed -i '' 's/— RTApps/— RTTLearn/g'`.
- Then `grep -rn "RTApps" apps/web/src`. The only remaining hits may be in comments (e.g. "RTApps SDK", `rtapps-sdk.js` references). Leave those; they name the SDK, not the product.

- [ ] **Step 7: Gates and commit**

Run the Global gates (svelte-check confirms no page imports the deleted files). Then:

```bash
git add -A apps/web/src
git commit -m "feat(web): RTTLearn app shell — sidebar nav, phone drawer, skip link, logo and wordmark"
```

---

### Task 5: Accessibility, 360px and cross-browser e2e harness

**Files:**

- Modify: `apps/web/package.json` (devDependency `@axe-core/playwright`)
- Create: `apps/web/e2e/ui.e2e.ts`
- Modify: `apps/web/playwright.config.ts` (projects; header comment "Chromium only" sentence)
- Modify: `.github/workflows/pr.yml` (e2e job's browser install line only)
- Modify: `docs/03-architecture.md` §11 (testing strategy: one row or sentence on axe, 360px, Firefox/WebKit)

**Interfaces:**

- Consumes:
  - `registerStudent` and `signIn` from `e2e/helpers.ts`;
  - the shell's names: "Open menu", "Close menu", `navigation` "Main", link "Subjects";
  - the seeded data: subject slug `radiation-biology`, lesson `rbe-and-oer`, the activity link "Demo quiz", educator `educator@example.com` / `rtapps-dev-password`.
- Produces: the Playwright project names `chromium`, `mobile-360`, `firefox`, `webkit`. Later PRs add their pages to `ui.e2e.ts`'s page lists.

- [ ] **Step 1: Add the dependency**

```bash
pnpm --filter web add -D @axe-core/playwright@^4.13.0
```

- [ ] **Step 2: Write `e2e/ui.e2e.ts`**

```ts
/**
 * What this file does: platform-wide UI checks — axe-core WCAG 2.1 A/AA scans of the main
 * student, educator and signed-out pages, no horizontal scrolling at the current viewport, and
 * the phone drawer flow at 360px.
 * Used here and why: `@axe-core/playwright` runs axe in the real page; only serious/critical
 * violations fail (NFR-16's bar), with the rule id and offending selectors in the failure
 * message. Arcade iframes are excluded (games keep their own look and are out of scope). A fresh
 * student is registered per run so lesson/quiz visits never touch seeded accounts other specs
 * count on. Runs in every Playwright project (desktop Chromium, 360px, Firefox, WebKit).
 * How it fits the project: NFR-16/NFR-18 (docs/02-requirements.md);
 * docs/specs/2026-10-01-ui-restyle-design.md (Verification); docs/03-architecture.md §11.
 * Depends on: `@axe-core/playwright`, `./helpers`, the seeded compose stack (app.seed).
 * Used by: `pnpm --filter web e2e`; pr.yml's e2e job.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { registerStudent, signIn, signOut } from "./helpers";

const EDUCATOR = {
  email: "educator@example.com",
  password: "rtapps-dev-password",
};
const PHONE_MAX = 800; // px; the shell's 50rem breakpoint

async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("iframe")
    .analyze();
  const blocking = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${label} — ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    );
  expect(blocking).toEqual([]);
}

async function expectNoSidewaysScroll(page: Page, label: string) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(
    overflow,
    `${label} scrolls sideways by ${overflow}px`,
  ).toBeLessThanOrEqual(0);
}

async function check(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expectAccessible(page, path);
  await expectNoSidewaysScroll(page, path);
}

test("signed-out pages are accessible and fit the viewport", async ({
  page,
}) => {
  for (const path of ["/login", "/register"]) await check(page, path);
});

test("student pages are accessible and fit the viewport", async ({ page }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await registerStudent(page, {
    email: `e2e-ui-${stamp}@example.edu`,
    password: "e2e-ui-password-1",
    name: "UI Check",
  });
  for (const path of [
    "/home",
    "/subjects",
    "/subjects/radiation-biology",
    "/lessons/rbe-and-oer",
    "/account/password",
  ]) {
    await check(page, path);
  }
  // An activity page (quiz player), reached the way a student does.
  await page.goto("/subjects/radiation-biology");
  await page.getByRole("link", { name: "Demo quiz" }).click();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await expectAccessible(page, "quiz activity");
  await expectNoSidewaysScroll(page, "quiz activity");
});

test("educator pages are accessible and fit the viewport", async ({ page }) => {
  await signIn(page, EDUCATOR.email, EDUCATOR.password);
  for (const path of ["/educator", "/author"]) await check(page, path);
});

test("phone drawer opens, navigates and closes", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) > PHONE_MAX, "phone layout only");
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await registerStudent(page, {
    email: `e2e-ui-drawer-${stamp}@example.edu`,
    password: "e2e-ui-password-1",
    name: "Drawer Check",
  });
  const subjects = page.getByRole("link", { name: "Subjects", exact: true });
  await expect(subjects).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await subjects.click();
  await expect(page).toHaveURL(/\/subjects$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  // Sign out is inside the drawer on phones.
  await page.getByRole("button", { name: "Open menu" }).click();
  await signOut(page);
});
```

- **On phones, `registerStudent` and `signIn` are unaffected:** the auth pages have no drawer, and they wait for `/home`.
- **`signOut` clicks "Sign out", which is only visible once the drawer is open.** That is why the drawer test opens it first. The desktop-only specs (lesson, quiz and so on) run only in the `chromium` project, where the sidebar shows it.

- [ ] **Step 3: Playwright projects**

In `apps/web/playwright.config.ts`, replace the `projects` line and its comment with:

```ts
// Desktop Chromium runs every spec. The other three run the UI checks (axe, 360px, drawer)
// plus the lesson flow as a cross-browser smoke — the full suite in every engine would
// triple e2e time for little extra signal (docs/specs/2026-10-01-ui-restyle-design.md).
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  {
    name: "mobile-360",
    testMatch: "**/ui.e2e.ts",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 360, height: 780 },
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    name: "firefox",
    testMatch: ["**/ui.e2e.ts", "**/lesson.e2e.ts"],
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    testMatch: ["**/ui.e2e.ts", "**/lesson.e2e.ts"],
    use: { ...devices["Desktop Safari"] },
  },
];
```

Update the header comment's "Chromium only, matching the vitest browser project's provider" to describe the four projects.

- [ ] **Step 4: Validate the config without a stack**

Run: `pnpm --filter web exec playwright test --list`
Expected: lists every existing spec under `[chromium]`, `ui.e2e.ts` under all four projects, and `lesson.e2e.ts` under `[firefox]` and `[webkit]`. There must be no config errors.

- [ ] **Step 5: CI browser install**

In `.github/workflows/pr.yml`, in the **e2e** job only, change:

```yaml
- run: pnpm --filter web exec playwright install --with-deps chromium
```

to:

```yaml
- run: pnpm --filter web exec playwright install --with-deps chromium firefox webkit
```

Leave the `web` job's install (Chromium, used by the vitest browser project) unchanged. Do not touch `runs-on` or anything else in the workflow.

- [ ] **Step 6: Architecture doc**

In `docs/03-architecture.md` §11 (Testing strategy), add a row to its table, or a sentence after it if it has no table. Matching the section's form, it states:

- `e2e/ui.e2e.ts` runs axe-core WCAG 2.1 A/AA scans (serious and critical fail) and a no-sideways-scroll check over the main signed-out, student and educator pages;
- Playwright projects are desktop Chromium (all specs), `mobile-360`, Firefox and WebKit (UI checks plus the lesson flow);
- `src/lib/ui/tokens.test.ts` checks every token colour pair against AA, and `no-hex.test.ts` keeps colours in `src/app.css`.

- [ ] **Step 7: Gates and commit**

Run the Global gates.

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/e2e/ui.e2e.ts apps/web/playwright.config.ts .github/workflows/pr.yml docs/03-architecture.md
git commit -m "test(web): axe, 360px and Firefox/WebKit e2e checks for the platform UI"
```

- **CI e2e is the arbiter for this task.** The task is complete only when the PR's e2e job passes in all four projects.
- **If axe reports serious violations on pages PR 1 did not restyle:** fix them in this task only when the fix is markup or CSS (a missing label association, a contrast pair). Report anything that would change behaviour or copy, as NEEDS_CONTEXT.
- **If WebKit or Firefox cannot install on the `oracle-arm64` runner, stop and report BLOCKED with the log.** Do not drop the project silently.

### PR 1 close-out

1. Final whole-branch review on the most capable model, given `review-package $(git merge-base main HEAD) HEAD`. It checks:
   - the token values against the plan;
   - single-nav;
   - selector and copy stability;
   - no CDN;
   - no hex.
2. Open the PR. CI must be green, including e2e in all four projects.
3. Merge and auto-deploy.
4. **Owner walk:** desktop and phone, all three roles, on test.rttlearn.com. Collect the owner's look adjustments, especially:
   - the menu and sign-out placement;
   - the palette;
   - whether any playful spots should use emoji (the spec asks to confirm "no emoji" on this walk).
5. Fold the owner's adjustments into `app.css` (and the token test if a pair changes) as a follow-up commit on `ui/student-pages` before Task 6.

---

## PR 2: Student pages (branch `ui/student-pages`)

**Before the first dispatch:** re-read each listed file at its current state and write the exact markup diff into the task brief. Requirements here are binding; exact code is filled in then.

### Task 6: Reading panel and its light/dark switch

**Files:**

- `src/lib/prose/prose.css`
- `src/lib/lesson/LessonPager.svelte` (+ its spec)
- `src/routes/(app)/lessons/[slug]/+page.svelte`
- `src/app.html`
- new `src/lib/lesson/ReadingToggle.svelte` (+ `.svelte.spec.ts`)
- `src/lib/ui/tokens.test.ts` (no change needed if the light pairs already pass)

**Requirements:**

- **Panel.** The lesson page's content is one panel: page counter, page title, blocks and pager controls. It uses `class="reading-panel"`, with `background: var(--paper-bg); color: var(--paper-text); border-radius: var(--radius-lg); padding: var(--space-6)` (`var(--space-5) var(--space-4)` below 50rem). The measure stays `65ch` from `.prose`.
- **Light mode.** `:root[data-reading='light'] .reading-panel` reassigns every `--paper-*` token to its `--paper-light-*` counterpart. The panel and `prose.css` read only `--paper-*`.
- **Toggle.**
  - `ReadingToggle` is a single `<button>` with `aria-pressed` and the visible label "Light page". The label is new UI text; tests use only the name.
  - Its icon is Lucide `sun` or `moon`.
  - It sits in the lesson page header's actions.
  - It sets `document.documentElement.dataset.reading` and persists `'light'` or `'dark'` in `localStorage` under key `rttlearn:reading`.
  - Every `localStorage` access is wrapped in try/catch, and the page renders correctly without storage.
- **No flash.**
  - Add a small inline `<script>` in `app.html` `<head>`, before `%sveltekit.head%`: read `localStorage['rttlearn:reading']` in try/catch and set `data-reading` on `<html>` when it is `'light'`.
  - Comment it with the reason, and note that a future CSP must hash or allow this one script.
- **Keep:** `.prose`, "Page N of M", "Previous", "Next", "Finish lesson", "Score: …", "Back to home", and the `aria-live` regions.
- **Restyle pager controls** with `Button`:
  - Previous is `secondary`;
  - Next and Finish lesson are `primary`;
  - icons `chevron-left` / `chevron-right`.
- **`KnowledgeCheck`** keeps `fieldset.kc-form`; its result uses `Feedback` with the existing copy.

**Tests:**

- `ReadingToggle.svelte.spec.ts`:
  - toggling flips `aria-pressed` and `document.documentElement.dataset.reading`, and writes storage;
  - a throwing `localStorage` (stub `Storage.prototype.setItem` to throw) leaves the toggle working for the session.
- Add `/lessons/rbe-and-oer` with the light panel to `ui.e2e.ts`:
  - set storage, reload, axe-scan;
  - assert the panel's computed background is light before hydration completes (read `getComputedStyle` right after `goto` with `waitUntil: 'domcontentloaded'`).
- Existing `LessonPager.svelte.spec.ts` and `lesson.e2e.ts` pass unchanged.

### Task 7: Subjects, subject page, home, games shelf, ExternalPlayer frame

**Files:**

- `src/routes/(app)/subjects/+page.svelte`
- `src/routes/(app)/subjects/[slug]/+page.svelte`
- `src/routes/(app)/home/+page.svelte`
- `src/lib/activity/ExternalPlayer.svelte`

**Requirements:**

- **Subjects index.**
  - `PageHeader` "Subjects".
  - A responsive grid of `Card as="li"` (`grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr))`). Each card has a `SubjectTag`, the subject title as the card's link (the accessible link name stays the subject title, e.g. "Radiation Biology"), and the counts text unchanged.
- **Subject page.**
  - `PageHeader` with the subject title and summary, and a `SubjectTag`.
  - The lessons list is styled as rows with the Lucide `book-open` icon.
  - Each activity-kind section is a `Card` with its existing heading.
  - The Games shelf uses the Lucide `gamepad-2` icon. The Simulator section uses `monitor`, and its disabled-state button stays.
  - Keep `data-testid="simulator-entry"`, every link name, and "Enter the radiation oncology center".
- **Home.**
  - `PageHeader`.
  - The join-cohort form uses `Field` and a primary `Button` (same label).
  - Errors use `Alert` with `role="alert"`.
- **ExternalPlayer.**
  - The `.player-bar` header uses tokens and a back link with the `chevron-left` icon (same text).
  - The iframe keeps `src` and class `arcade-frame`, with a 1px `--border` frame and `--radius-md`.
  - Height becomes `calc(100dvh - 9rem)` on desktop and `calc(100dvh - 8rem)` below 50rem. Measure this in the e2e check: the frame must fit without page scroll at 1280×800 and 360×780.
  - `#rtappsBackBtn` and `#watermark` are inside the game. Do not touch them.
- **Remove emoji** from any of these files (`grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]"`), replacing them with Lucide icons. Text a test asserts on stays character-for-character, minus a leading emoji only if no test asserts the emoji. Check `e2e/` and `*.spec.ts` with grep before removing any.

**Tests:**

- Existing `ExternalPlayer.svelte.spec.ts`, `arcade.e2e.ts` and `simulator.e2e.ts` pass unchanged.
- `ui.e2e.ts` already covers these pages.

### Task 8: Activity players

**Files:** `src/lib/activity/{QuizPlayer,FlashcardPlayer,MatchingPlayer,SequencingPlayer}.svelte`, `src/routes/(app)/subjects/[slug]/activities/[id]/+page.svelte`

**Requirements:**

- Each player sits in a `Card` with `PageHeader` on the route page. Its own controls use `Button` (primary for the main action: check, next, flip, submit), and radios and checkboxes get `--control-height` touch rows.
- **Feedback.** Correct and incorrect results use `Feedback` with the existing copy. Result and badge sections keep `aria-live="polite"` and every `data-testid` (`quiz-result`, `quiz-badge`, `matching-result`, `matching-badge`, `deck-complete`, `player-error`).
- **Badge.** The emoji badge becomes the Lucide `award` icon, with the badge text unchanged ("Badge earned!").
- **Flashcards:**
  - the card face is a `--surface-raised` panel at least 12rem high;
  - the flip keeps its existing control and name;
  - there is no animation beyond a 150 ms opacity transition, removed under reduced motion.
- **Matching and Sequencing:** the selected item shows `--accent-soft` with `--accent` border plus `aria-pressed` or the existing state attribute. Never colour alone.

**Tests:**

- All four player specs and `quiz.e2e.ts` pass unchanged.
- Add one activity of each kind to `ui.e2e.ts` (reach each through the "Radiation Biology" subject page by its seeded link name; read `apps/api/app/seed.py` for the titles).

### Task 9: Calculators, account and auth pages

**Files:**

- `src/lib/calc/*.svelte`
- `src/routes/(auth)/login/+page.svelte`
- `src/routes/(auth)/register/+page.svelte`
- `src/routes/(app)/account/password/+page.svelte`

**Requirements:**

- **Calculators:**
  - each is a `Card`;
  - inputs sit in a two-column grid ≥ 40rem and one column below;
  - `.calc-result` and `[data-testid=mu-output]` sit on `--surface-raised` with `--font-mono` digits and `font-variant-numeric: tabular-nums`;
  - `.calc-message` uses `Alert` styling while keeping the class `calc-message` on the element tests select (put the class on the Alert's wrapper or keep a `<p class="calc-message">` inside it);
  - `.calc-formula` is monospace.
- **Auth and account forms:**
  - a centred `Card` with max width 24rem (already capped);
  - `Field` for each control;
  - primary `Button` with the same labels ("Sign in", "Register", and the password page's existing label);
  - errors are `Alert tone="danger"`, keeping `id="login-error"` and `role="alert"` where they exist today.

**Tests:**

- `MuCalculator.svelte.spec.ts`, `TrivialCalculators.svelte.spec.ts`, and the e2e auth helpers pass unchanged.
- `ui.e2e.ts` covers login, register and account. Add one calculator activity page, reached by its seeded link name.

### PR 2 close-out

Same as PR 1: final review, PR, CI green in four projects, deploy, then an owner walk of the student journey on desktop and phone, with the reading switch tried both ways.

---

## PR 3: Educator and authoring (branch `ui/educator-authoring`)

### Task 10: Educator dashboard and cohort pages

**Files:**

- `src/routes/(app)/educator/+page.svelte`
- `educator/cohorts/[id]/+page.svelte`
- `.../activities/[aid]/+page.svelte`
- `.../outcomes/+page.svelte`
- `.../students/[uid]/+page.svelte`

**Requirements:**

- `PageHeader` on each page; cohort cards on the dashboard.
- Tables sit in a `.table-wrap { overflow-x: auto }` container, with tabular numerals for scores.
- **Below-threshold rows.** Keep the `tr.below` class and `--danger-bg`, and add a non-colour cue: the Lucide `triangle-alert` icon with `label="Below threshold"` in the first cell. This fixes the colour-only gap the catalog found. It is the one allowed visible-copy addition, as an accessible name only.
- Keep `td`, `tbody tr`, `table` and `section` structure and order, which `cohort.e2e.ts` and `quiz.e2e.ts` select by.

**Tests:**

- `cohort.e2e.ts` and `quiz.e2e.ts` pass unchanged.
- Add a cohort page to `ui.e2e.ts`'s educator test, reaching it through the first cohort link on `/educator`.

### Task 11: Authoring hub, lesson editor and RichTextEditor chrome

**Files:**

- `src/routes/(app)/author/+page.svelte`
- `author/lessons/[id]/+page.svelte`
- `src/lib/author/{LessonEditor,RichTextEditor,PublishPanel,KnowledgeCheckForm}.svelte`

**Requirements:**

- **Hub.** `PageHeader` with the create actions as `Button`s (same labels); the content lists become `Card` rows.
- **RichTextEditor:**
  - the toolbar is a `--surface-raised` bar; its buttons become 2.25rem square ghost buttons with Lucide icons (`bold`, `italic`, `underline`, `link`, `list`, `list-ordered`, `table`, `image`, `subscript`, `superscript`, `heading-2`, `heading-3`, `quote`, `undo`, `redo`);
  - each keeps its existing accessible name through `aria-label`, with the same words as today's text;
  - `aria-pressed` for active marks stays (or is added if absent);
  - `role="toolbar"` and its aria-label stay.
- **Editor surface:**
  - `.ProseMirror` gets the dark paper look by reusing `prose.css` rules through the `.prose` class on the editor element, if the editor does not already add it; otherwise a scoped `:global(.ProseMirror)` block reading `--paper-*`;
  - a focus-visible ring on the editable area;
  - `.ProseMirror a` stays a real `<a>`.
- Keep `.paste-controls textarea`.

**Tests:** `RichTextEditor.svelte.spec.ts`, `LessonEditor.svelte.spec.ts` and `authoring.e2e.ts` pass unchanged.

### Task 12: Remaining authoring editors and the data-table grid

**Files:**

- `author/{quizzes,decks,matching,sequencing}/[id]/+page.svelte`
- `author/data-tables/+page.svelte`
- `src/lib/author/{GridEditor,PairsEditor,QuestionPicker,BankQuestionForm}.svelte`

**Requirements:**

- `PageHeader`, `Card` sections, `Field` for labelled controls, and `Button` variants: primary for save/publish, danger for delete, ghost for row actions.
- **GridEditor:**
  - keeps its table and `overflow-x: auto` wrapper;
  - cells are compact inputs (`min-height: 2rem`), with sticky header row and first column;
  - focus is visible per cell.
- Every label, `data-testid` and button name is unchanged.

**Tests:** `GridEditor`, `PairsEditor` specs and `authoring.e2e.ts` pass unchanged. Add `/author/data-tables` to `ui.e2e.ts`.

### PR 3 close-out

Final review, PR, CI, deploy, then an owner walk as the educator: dashboard, a cohort, editing a lesson, and editing a quiz.

---

## PR 4: Admin and polish (branch `ui/admin-polish`)

### Task 13: Admin pages, landing page, and the error page

**Files:**

- `src/routes/(app)/admin/{users,audit}/+page.svelte`
- `src/routes/+page.svelte`
- new `src/routes/+error.svelte`

**Requirements:**

- **Admin pages.**
  - `PageHeader`, tables in `.table-wrap`, forms with `Field` and `Button`.
  - Temporary-password display (admin reset) stays exactly as it is shown today: shown once, not logged. Restyle only, as an `Alert tone="warning"` around the existing text.
- **Landing `/`.** A centred welcome with `Logo` at 64px, the RTTLearn wordmark, and the existing health lines, with Sign in as a primary link-button.
- **`+error.svelte`.** Uses `page.status` and `page.error.message` from `$app/state`:
  - `PageHeader` with the status code;
  - the message;
  - a link back home via `resolve('/')`;
  - the Lucide `circle-alert` icon.

**Tests:** existing admin coverage in `long-tail.e2e.ts` passes. Add `/admin/users` and `/admin/audit` to `ui.e2e.ts` with the seeded admin account. Read `apps/api/app/seed.py` for its email; the password is the owner-changed one only on the deployed site, while the dev seed's is used in CI.

### Task 14: Final sweep

**Requirements:**

1. **Empty states.** Every list page has an empty state made from `Card` plus a muted sentence (copy already present, or none if the page has none today). The empty state must not add new copy unless the page currently renders nothing at all; if so, report NEEDS_CONTEXT with the page list.
2. **Run the checks:**
   - `no-hex.test.ts` and `tokens.test.ts`;
   - an emoji grep over `apps/web/src` (zero hits outside tests);
   - a CDN grep (`grep -rn "https://" apps/web/src --include=*.svelte --include=*.css --include=*.html`, expecting only comments or API docs links).
3. **Axe coverage.** `ui.e2e.ts` covers every routed page that is reachable with seeded data.
4. **Docs.** Update `docs/02-requirements.md` NFR-16 and NFR-18 status notes (if the doc tracks status) to name `ui.e2e.ts` and `tokens.test.ts` as their verification.

### PR 4 close-out

Final review, PR, CI, deploy, then the owner's full walk of all roles. Then:

- close the UI items in the ledger;
- update memory.

---

## Bookkeeping

- **Ledger:** `.superpowers/sdd/progress-ui.md`, with one line per task as it completes and the Minor findings carried to each PR's final review.
- **No controller commits while an implementer is running.**
- **One branch per PR.** Merge each to `main` only after CI is green and before the next PR's branch is cut.
