# Design: linac-ct modularization + CT-suite extraction + TypeScript migration (#77 phase 2)

**Status:** approved by owner 2026-09-17 (brainstorm; four-PR structure and TS scope confirmed verbally in session)
**Prerequisite state:** #77 phase 1 complete — sim-hub is 13 Vite-built ES modules (PR #78 `d4b575d`, PR #79 `fcef239`), deployed and live. The sim-hub owner acceptance walk is still pending; PR 1 of this phase must not merge until that walk passes.

## Problem

`apps/web/arcade/linac-ct/index.html` (10,608 lines + 18MB assets) is the last application-scale monolith. It is worse than sim-hub was:

- The entire **CT operator console** — a complete second HTML document with its own CSS, scripts, and its own CDN Three.js at a *different version* — is embedded as one escaped JS string constant (`CT_SUITE_HTML`, ~85KB, line 10461) and loaded at runtime via `fr.srcdoc = CT_SUITE_HTML` (`initFrame()`, line ~10540).
- A **third** document (the DICOM review page) is embedded base64-encoded and decoded with `atob()` into another iframe (`dicomFrame`, line ~9824).
- Parent and CT suite communicate over postMessage (`rtapps-ct-ready` / `rtapps-ct-case` / `rtapps-ct-case-loaded`); the **parent** reports both SDK completions (`recordResult('sim-linac-fraction')` lines ~5352/5403, `recordResult('sim-ct-scan')` line ~10593).

Separately, the owner has directed a **TypeScript migration for both simulators** now that the module structure exists — five of five bugs found during phase 1's refactor were "name refers to nothing / value not there yet" errors, the exact class a type checker eliminates.

## Verified technical facts (2026-09-17 recon)

- Parent importmap: `three@0.160.1` (CDN). CT suite importmap: `three@0.163.0` (CDN). Different versions, both currently runtime CDN dependencies.
- `apps/web/arcade/linac-ct/assets/` = 18MB, `ct-1.png` … `ct-5.png`. e2e (`simulator.e2e.ts:221`) asserts the URL `/arcade/linac-ct/assets/ct-1.png` including its Cache-Control header — asset URLs must not change.
- e2e matches the room app frame by `/arcade/linac-ct` URL substring — tolerant of new page paths under that prefix.
- The serving route's extension allow-map serves any `.html`/`.js`/`.png` under the slug; a second/third page needs no server change.
- Vite compiles `.ts` natively in the arcade build (esbuild); `typescript` + typescript-eslint already in the workspace.

## Owner-approved decisions

1. **CT suite becomes its own page inside linac-ct** — NOT a separate arcade app. Same door, same flow, same two activities, zero product change. `arcade-src/linac-ct/ct-suite.html` + own source modules → built to `/arcade/linac-ct/ct-suite.html`; parent switches `srcdoc` → `src` (same origin; postMessage protocol and parent-side completions unchanged). The DICOM review page is likewise un-embedded to a plain third static page (its `atob` dance deleted) but not modularized further.
2. **Full module split for both scripts** (parent + CT suite), not just un-embedding.
3. **Full TypeScript migration of BOTH simulators (sim-hub + linac-ct) in this initiative**, sequenced AFTER mechanical extraction — conversion and code-motion never mix in one commit (phase-1 lesson: a verbatim move is diff-verifiable, a rewrite is not).
4. **Permissive compiler settings first** (`strict: false`, `noImplicitAny: false`): still catches unknown identifiers, misspelled properties, wrong-arity calls (all phase-1 bug classes) without forcing behavior-risk edits on ~15k lines of legacy Three.js code. Boundary interfaces are typed properly. Strictness can ratchet per-module later without another migration.
5. **`checkJs` over `arcade-src/` from PR 1**, so the JS stages are compiler-protected before conversion lands.
6. Assets move to `arcade-src/linac-ct/public/assets/` — Vite copies verbatim, preserving `/arcade/linac-ct/assets/*.png` URLs byte-identical (naive `emptyOutDir` would delete them; this is the load-bearing detail).
7. Both Three.js versions become exact npm pins via aliasing (`three` = 0.160.x already pinned for sim-hub/parent scope as appropriate; `three-ct: npm:three@0.163.0` for the CT suite). **No version unification** — that would be a behavior change.
8. Execution: subagent-driven development per PR, with two hardenings from phase 1: the **bundle-eval smoke test runs per task** (DOM+WebGL-stub evaluation of every built page — it caught the two load-order crashes the four standard gates missed), and **eslint + checkJs cover the new source from PR 1**, not last. Bidirectional per-symbol no-undef sweeps remain mandatory on every move.

## Delivery structure (four PRs, each gated, owner walk after each user-visible PR)

**PR 1 — linac-ct pipeline proof** (branch `refactor/linac-ct-vite`): source tree `arcade-src/linac-ct/` with `index.html` (parent shell), `ct-suite.html` (un-embedded verbatim from `CT_SUITE_HTML`, unescaped), the DICOM page (un-embedded from base64), `src/main.js` (parent script verbatim), `src/ct-suite/main.js` (CT script verbatim), `public/assets/` (the 5 PNGs moved). Vite config extended to multi-page (rollupOptions.input for the pages under a shared root, or a second config — implementation plan decides mechanics). CDN importmaps deleted; npm pins per decision 7. `initFrame()` swaps `srcdoc` → `src='/arcade/linac-ct/ct-suite.html'`; the dicom frame likewise loads by URL. Old tracked `arcade/linac-ct/**` git-rm'd + gitignored. eslint + checkJs enabled over the new source. Gates + per-page bundle smoke + CI e2e → merge → deploy → **owner walk** (vault, LINAC fraction completion, CT workspace, scan completion, DICOM review).

**PR 2 — linac-ct module extraction** (branch `refactor/linac-ct-modules`): verbatim JS moves, one reviewed commit per group.
Parent `src/`: `scene` (vault, lights, adaptive perf floor), `linac` (gantry/couch/pendant machine logic), `cctv` (feed renderers + throttle), `travel` (room-view camera transitions), `workspace` (CT workspace open/close + iframe bridge, postMessage parent side), `sdk` (both recordResult sites + fraction workflow latch), `main` (bootstrap + loop).
CT suite `src/ct-suite/`: `room` (3D scan room), `console` (protocol/step state machine), `imaging` (topogram/axial canvas rendering), `bridge` (postMessage child side), `main`.
Exact anchor lists are pinned at plan-writing time. Same protocol as phase 1 tasks 2–9 (verbatim-move rules, bidirectional sweeps, per-task reviewer, per-task bundle smoke). Final whole-branch review executes both built pages. Merge → deploy → **owner walk**.

**PR 3 — sim-hub TypeScript migration** (branch `refactor/sim-hub-ts`): the 13 existing sim-hub modules convert one commit per module — rename `.js`→`.ts`, fix compiler findings, add explicit interface types at the load-bearing boundaries: the `S` state object, `sdk-bridge` (slugs, payloads, latch), and each module's export surface. `tsc --noEmit` (project config for arcade-src) joins the check gate. Reviewer contract: conversion commits contain type syntax and compiler-driven annotations only — zero logic edits; anything behavioral escalates.

**PR 4 — linac-ct TypeScript migration** (branch `refactor/linac-ct-ts`): same treatment for the new linac-ct + ct-suite modules, PLUS a shared typed postMessage contract: one message-union type (e.g. `src/ct-protocol.ts`) imported by both `workspace` (parent) and `bridge` (child), so the two halves of the door cannot silently disagree about message shapes. Merge → deploy → final **owner walk**.

## Verification summary

Per task: full web gates (lint incl. eslint-over-arcade-src, check incl. checkJs/tsc as staged, 161+ tests, build:arcade) + bundle-eval smoke per built page + reviewer relocation-purity (PRs 1–2) or types-only purity (PRs 3–4). Per push: CI fresh-stack e2e on the self-hosted runner (simulator.e2e.ts covers door handoff, both completions, and the ct-1.png asset contract). SDK contract items verified byte-for-byte at review wherever touched: both `recordResult` call sites, postMessage type strings, `window.CONSOLE_APP_URL`-analogous globals if any, activity slugs.

## Out of scope

Product/UX changes; activity or seed changes; Three.js version unification; full `strict` mode (later per-module ratchet); Svelte-izing the 2D console UIs (possible future, tracked separately); the 27 small single-file games (policy: they stay single-file); sim-hub structural changes beyond the TS conversion (the 12-module SCC dissolution stays a listed follow-up on #77).

## Consistency end-state

After this phase: every application-scale codebase in the repo (SvelteKit app, FastAPI app, sim-hub, linac-ct + CT suite) is modular and type-checked; every mini-game is single-file by documented policy. That rule gets a line in the repo docs when PR 4 lands.
