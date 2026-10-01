# RTTLearn UI restyle — design

**Status:** approved by owner 2026-10-01 ("Approved, dont do a mockup").
**Evidence:**
- `.superpowers/sdd/ui-legacy-catalog.md`: the legacy repos' visual identities, palettes, contrast audit and representative pages.
- `.superpowers/sdd/ui-current-catalog.md`: how the platform is styled today, constraints, test coupling and surface size.

## Context

The SvelteKit web app (`apps/web`) is almost entirely unstyled. It uses browser defaults throughout: under 250 lines of CSS, no tokens, no web fonts, no shared components, no focus styles, and no responsive rules. Its 25 pages, 2 layouts and about 33 components are effectively a greenfield restyle.

The legacy repos had two identities:
- a purple-on-light student workbook (`rtt_e_workbook`, RT-Games);
- the dark navy/cyan RadTherapyPlatform.

The owner chose to start from the RadTherapyPlatform look, because it matches the simulators and games and carries the only real logo. The look will be adjusted once it is in place.

## Decisions (owner)

| Topic | Decision |
|---|---|
| Base identity | RadTherapyPlatform dark look: navy surfaces, single cyan brand accent, cyan arc-and-dot logo (`RadTherapyPlatform/public/rtapps-icon.svg`, copied, not linked) |
| Product name / wordmark | **RTTLearn** |
| Theme | Dark everywhere (navigation, menus, cards, games shelf, authoring) |
| Lesson reading | Lesson content sits on a softer dark "paper" panel. A per-student switch turns the reading panel light. The setting is stored in `localStorage` (per device); moving it to an account setting is out of scope |
| Navigation | Left sidebar on desktop; below a breakpoint it collapses to a top bar with a menu button (drawer). It must work at 360 px (NFR-18) |
| Subject colour | Workbook purple dropped. Each subject gets a small coloured tag/chip on its card; cyan stays the only brand colour |
| Font | Inter, self-hosted (npm package or woff2 in the app), with a system-ui fallback stack. No Orbitron in the platform UI |
| Icons | Lucide (`lucide-svelte`), bundled, for all interface icons. **No emoji** in the platform UI (owner: "Use Lucide"; confirm on the first walk if emoji were wanted in playful spots) |

## Non-negotiable constraints

- **WCAG 2.1 AA (NFR-16, Must):** every text/background pair is at least 4.5:1, or 3:1 for large text and UI component boundaries. Focus is visible on every interactive element. Information is never conveyed by colour alone. The legacy values that fail are adjusted, not copied:
  - `--rtapps-text-muted #5b7292` measured 3.4–3.8;
  - success and error feedback pairs;
  - prose callout accents `#059669` (3.77) and `#d97706` (3.19) used as text.
- **Keyboard operability (NFR-17):** unchanged behaviour; the restyle must not regress it.
- **No runtime CDNs.** Fonts and icons ship with the app (consistent with #97).
- **No `{@html}`** (lint rule `svelte/no-at-html-tags`). Lucide icons are used as Svelte components.
- **Test stability:** keep these selectors and copy:
  - `.prose`, `.ProseMirror a`, `.paste-controls textarea`, `.calc-message`, `fieldset.kc-form`, `#login-error`, `[role=alert]`;
  - every `data-testid`;
  - button and label text that tests assert on.
  The restyle changes look, not behaviour or copy.
- **Arcade games and simulators keep their own look.** Only the platform frame around them (`ExternalPlayer.svelte`, the Games/Simulator shelf) is restyled.

## Architecture

1. **Tokens.** A global stylesheet (`src/app.css`, imported once from the root layout) defines CSS custom properties for:
   - colour: surfaces (`--bg`, `--surface`, `--surface-raised`, `--border`), text (`--text`, `--text-muted`), accent (`--accent`, `--accent-contrast`), status (`--success`, `--warning`, `--danger`, `--info`, each with foreground and background pairs that pass AA), reading panel (`--paper-bg`, `--paper-text` plus the light variants), and the subject tag palette;
   - spacing scale, radius (6/10/16 px from the legacy theme), shadows, the focus ring, the type scale and the layout breakpoint.

   The starting values come from `RadTherapyPlatform/src/styles/theme.css:12-48`:
   - bg `#0a1420`
   - panel `#101e33`
   - border `#1e3350`
   - text `#eaf2fb`
   - accent `#22d3ee`

   Every value is contrast-checked. Plain CSS plus Svelte scoped styles, matching the current codebase. No Tailwind.
2. **Base element styles** in `app.css`: body, headings, links, form controls, tables, `:focus-visible` ring, and `prefers-reduced-motion`.
3. **Shared UI kit** in `src/lib/ui/`: Button (primary/secondary/ghost/danger, icon slot), Card, SubjectTag, Field/Input/Select/Textarea wrappers, Alert/Notice, Feedback (correct/incorrect with icon + text, not colour alone), PageHeader, Icon (Lucide wrapper with `aria-hidden` by default and an optional label). These are small, presentational and token-only.
4. **App shell**: root and `(app)` layouts become:
   - a sidebar with the logo, the RTTLearn wordmark, role-gated nav links with Lucide icons, and the user/account/sign-out block;
   - a top bar plus drawer below the breakpoint;
   - a main content area with a max width.

   Role gating logic is unchanged; only the presentation changes.
5. **Reading panel**: `.prose` content is wrapped in a reading surface that uses the `--paper-*` tokens. A toggle (in the lesson pager or page header) switches `data-reading="light"` on the panel and persists it to `localStorage`, read on mount with no flash where feasible.
6. **Pages and components** move onto the kit and tokens. The look changes; behaviour and copy do not.

## Verification

- **New automated checks (fulfils NFR-16/18):**
  - axe-core (`@axe-core/playwright`) runs over the main student pages (subjects, lesson, each activity type) and key educator pages, failing on serious and critical violations;
  - Playwright projects for a 360 px mobile viewport, Firefox and WebKit, on a smoke subset where the full suite is too slow.
- **Token contrast test:** a unit test computes the ratio for every declared foreground/background token pair and fails below AA.
- **Existing gates:** lint, check, test, `build:arcade`, smoke, and CI e2e all stay green.
- **Owner walk after each PR.**

## Rollout (one PR each, owner walk after each)

1. **Foundation:** tokens, base styles, Inter, Lucide, UI kit, app shell (sidebar and drawer), the a11y/viewport/browser test harness, and the token contrast test.
2. **Student pages:** subjects menu, subject page with games shelf, lesson reader with reading panel and switch, quiz/flashcards/matching/sequencing/knowledge-check players, calculators, ExternalPlayer frame, account and auth pages.
3. **Educator and authoring pages:** dashboard, cohorts, authoring editors, TipTap/RichTextEditor chrome, data-table grid editor.
4. **Admin pages and polish:** remaining pages, empty and error states, final contrast/axe sweep.

## Out of scope

- An account-level reading setting.
- A full light theme for the whole app.
- Restyling arcade games or simulators.
- Custom radiation-therapy icons, unless a needed concept has no Lucide equivalent; then a minimal custom SVG matching Lucide's stroke style.
- Copy changes.
