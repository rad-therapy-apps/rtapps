# linac-ct Modularization + TypeScript Migration Implementation Plan (#77 phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `apps/web/arcade/linac-ct/index.html` (10,608 lines; three embedded documents; 18MB assets) into a Vite-built, modular source tree like sim-hub's, then migrate BOTH simulators (sim-hub + linac-ct) to TypeScript with permissive compiler settings.

**Architecture:** Four gated PRs per the spec (`docs/specs/2026-09-17-linac-ct-and-typescript-design.md`). PR 1 proves the pipeline: un-embed the CT suite (`CT_SUITE_HTML` string → real `ct-suite.html` page) and the base64 DICOM page, move all scripts verbatim to `arcade-src/linac-ct/`, npm-pin both Three.js versions, wire checkJs + the bundle-eval smoke script. PR 2 splits both scripts into modules by verbatim moves. PR 3 converts sim-hub's 13 modules to TS. PR 4 converts linac-ct's modules to TS plus a shared typed postMessage contract. Conversion NEVER mixes with code-motion in one commit.

**Tech Stack:** Vite 8 (existing `vite.arcade.config.ts` pattern), three@0.160.1 via alias `three-linac`, three@0.163.0 via alias `three-ct` (no version unification), TypeScript 6.0.3 (`strict: false`, `noImplicitAny: false` in a dedicated `tsconfig.arcade.json`), eslint `no-undef` (already enforced over `arcade-src/**/*.js`).

## Global Constraints

- **Mechanical move only (PRs 1–2).** Moved code textually identical modulo (a) prettier formatting, (b) `import`/`export` wiring, (c) Three.js import-specifier renames (`three` → `three-linac` / `three-ct`, see Task 1), (d) the four spec'd functional edits in Task 1 (importmap deletions, `initFrame` srcdoc→src, dicom handler, dead-IIFE deletion), (e) `// @ts-nocheck` first-line headers on moved legacy JS, (f) PR 2's `S.`-prefix state rename. Any bug discovered is FILED as a GitHub issue, never fixed inline.
- **Types only (PRs 3–4).** Conversion commits contain the file rename, type syntax, compiler-driven annotations, and `@ts-nocheck` removal — zero logic edits. Anything behavioral escalates to the controller.
- Zero product/UX change. Same door, same flow, same two activities.
- Asset URLs byte-identical: `/arcade/linac-ct/assets/ct-1.png` … `ct-5.png` must keep serving (e2e `apps/web/e2e/simulator.e2e.ts:221` asserts the URL AND `cache-control: private, max-age=3600`).
- SDK contract byte-identical wherever touched: `RTApps.activityUrl('sim-hub-qa')` (one site), `RTApps.recordResult('sim-linac-fraction')` (two sites), `RTApps.recordResult('sim-ct-scan')` (one site); postMessage type strings `rtapps-ct-ready` / `rtapps-ct-view` / `rtapps-ct-case` / `rtapps-ct-case-loaded` / `rtapps-ct-complete`; globals `window.RTAppsLinacMirrorBridge`, `window.clinicalIGRTActive`, `window.clinicalIGRTCouchShift`; the `?hq` URL param; `#rtappsBackBtn` markup (e2e-asserted).
- No Three.js version unification: parent stays 0.160.1, CT suite stays 0.163.0, sim-hub stays 0.160.0. Exact pins, no carets.
- `rtapps-sdk.js` untouched. Zero changes to `apps/web/Dockerfile`, CI workflows, the serving route, `simulator.e2e.ts`, sim-hub source (except PR 3), the 27 single-file games.
- Gates before every commit, from repo root: `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test` (28 files / 161 tests) and `pnpm --filter web build:arcade`, THEN the bundle smoke: `cd apps/web && node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html` (from PR 1 Task 2 onward). All must pass.
- **Mandatory bidirectional per-symbol sweeps on every move** (phase-1 lesson: build/tests are blind to bare free variables): for each moved symbol, grep the source module for names it references and the rest of the tree for references to it; eslint `no-undef` + the bundle smoke are the nets, the sweep is the primary check.
- ES-module eval order: `main.js` (the entry) evaluates LAST. Cross-module references must be function-body-only; top-level calls/reads of imports crash (phase-1 crashes C1/C2). Top-level executable statements always land in `main.js`'s bootstrap or the module that owned them, in original relative order.
- NEVER read/create/edit any `.env*` file. No force-push. Repos stay private. Commit messages end with `Co-Authored-By:` per repo convention.
- PR 1 must NOT merge until the owner's pending sim-hub acceptance walk passes (spec prerequisite).
- Progress ledger: `.superpowers/sdd/progress-linact.md`.

## Anchor references (committed alongside this plan)

- `docs/plans/2026-09-17-linac-ct-parent-anchors.md` — every top-level function of the parent main module script (315 total) assigned to its target module, plus the 59-`let` state list and named config tables. PR 2 parent tasks extract against it.
- `docs/plans/2026-09-17-arcade-smoke.mjs` — the complete bundle-eval smoke script (DOM+WebGL stubs + driver), copied verbatim into the repo by Task 2.
- Source line numbers below refer to `apps/web/arcade/linac-ct/index.html` at commit `b7140af`.

## linac-ct source map (recon 2026-09-17, verified)

| lines | what |
|---|---|
| 7–15 | importmap: three@0.160.1 CDN (`three`, `three/examples/jsm/controls/OrbitControls.js`, `three/addons/geometries/RoundedBoxGeometry.js`) |
| 2340–3268 | body markup (incl. `#rtappsBackBtn`, `#dicomModal`/`#dicomFrame`) |
| 3266 | `<script type="text/plain" id="dicomB64">` — base64 DICOM page, one physical line (59,725 chars) |
| 3268 | `<script src="/arcade/rtapps-sdk.js"></script>` |
| 3269–9986 | MAIN MODULE SCRIPT (6,718 lines; 315 top-level functions, 323 consts, 59 lets; DOM-cache block 3291–3673; bootstrap calls 9142–9274; 4 tail IIFEs 9277–9940; `window.RTAppsLinacMirrorBridge` 9946–9978) |
| 9989–10432 | `<script id="rtappsV2ConsolePatch">` — classic script, one IIFE (console UI adapter; reads `window.RTAppsLinacMirrorBridge`; no RTApps calls) |
| 10434–10456 | `#ctSimWorkspace` DOM (iframe `#rtappsCTFrame`) |
| 10458–10605 | `<script id="rtappsCTQueueWorkspace">` — classic script, one IIFE; owns `CT_SUITE_HTML` (10461, one line, 93,290 chars), `initFrame` (10540), postMessage parent side (10550/10577), `CT_CASES`, `recordResult('sim-ct-scan')` (10593) |

Embedded CT suite (once unescaped: 90,949 bytes / 1,477 lines): `<base href="/arcade/linac-ct/">` (line 4); importmap tag 8–156 of which JSON is 9–14 (three@0.163.0) and 16–154 is a DEAD IIFE (browsers parse importmap content as strict JSON — this code never executes); style 157–453; body 454–639; module script 640–1475 (836 lines, 56 callable top-level bindings); assets referenced as relative `assets/ct-1..5.png` resolved against the base tag.

Embedded DICOM page (once decoded: 44,752 bytes / 313 lines): fully static except two CDN `<script src>` tags (`dicom-parser@1.8.21`, `jszip@3.10.1`) it already loads at runtime today — kept verbatim, recorded as a follow-up.

Classic-script timing fact used by PR 2: classic scripts execute during HTML parse, BEFORE the deferred module script — so today's order is consolePatch → ctQueueWorkspace → main module. Importing them as the first two side-effect imports of `main.js` preserves that order.

---

## PR 1 — branch `refactor/linac-ct-vite` (Tasks 1–2, pipeline proof)

Branch from up-to-date main: `git checkout -b refactor/linac-ct-vite`.

### Task 1: Un-embed + source tree + Vite build

**Files:**
- Create: `apps/web/arcade-src/linac-ct/index.html`, `apps/web/arcade-src/linac-ct/ct-suite.html`, `apps/web/arcade-src/linac-ct/src/main.js`, `apps/web/arcade-src/linac-ct/src/ct-suite/main.js`, `apps/web/arcade-src/linac-ct/public/dicom-review.html`, `apps/web/vite.arcade.linac-ct.config.ts`
- Move (git mv): `apps/web/arcade/linac-ct/assets/` → `apps/web/arcade-src/linac-ct/public/assets/` (5 PNGs, 18MB)
- Delete (git rm): `apps/web/arcade/linac-ct/index.html`
- Modify: `apps/web/package.json`, root `.gitignore`

**Interfaces — Produces:** the two-config `build:arcade` pipeline and the `arcade-src/linac-ct/` layout every later task edits; `src/main.js` and `src/ct-suite/main.js` as the monoliths PR 2 extracts from; the `three-linac`/`three-ct` aliases.

- [ ] **Step 1: Extract the embedded documents mechanically** (scratch node script, not committed). `CT_SUITE_HTML` at line 10461 is a single-line double-quoted JS string with standard `\n`/`\"`/`\/` escapes: slice the source between `const CT_SUITE_HTML="` and the final `";`, unescape (JSON-compatible — wrap in quotes and `JSON.parse` after normalizing `\/`), write to `arcade-src/linac-ct/ct-suite.html`. Verify: starts `<!DOCTYPE html>`, ends `</html>`, 90,949 bytes / 1,477 lines. The `dicomB64` payload at line 3266: base64-decode the tag's text content, write to `arcade-src/linac-ct/public/dicom-review.html`. Verify: 44,752 bytes / 313 lines, starts `<!doctype html>`.

- [ ] **Step 2: Split the parent document** into `arcade-src/linac-ct/index.html` + `src/main.js`:
  - DELETE the importmap tag (lines 7–15) entirely.
  - DELETE line 3266 (the whole `dicomB64` script tag).
  - Keep line 3268 (`/arcade/rtapps-sdk.js`) verbatim.
  - Replace the module script (3269–9986) with `<script type="module" src="./src/main.js"></script>`; the script body (3270–9985) goes VERBATIM to `src/main.js` with exactly two classes of edit: (1) first line becomes `// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)`, (2) import-specifier renames: `'three'` → `'three-linac'`, `'three/examples/jsm/controls/OrbitControls.js'` → `'three-linac/examples/jsm/controls/OrbitControls.js'`, `'three/addons/geometries/RoundedBoxGeometry.js'` → `'three-linac/addons/geometries/RoundedBoxGeometry.js'`, plus (3) the dicom-handler edit below.
  - In the moved `src/main.js`, the DICOM launch block (source lines ~9817–9835) changes from srcdoc/data-URI decoding to loading the un-embedded page — exactly this:
    ```js
    const dicomBtn = $('img-dicom-launch'), dicomModal = document.getElementById('dicomModal'),
        dicomFrame = document.getElementById('dicomFrame'), dicomClose = document.getElementById('dicomClose');
    if (dicomBtn && dicomModal && dicomFrame) {
        dicomBtn.addEventListener('click', () => {
            const currentSrc = dicomFrame.getAttribute('src') || '';
            if (!currentSrc || currentSrc === 'about:blank') {
                dicomFrame.src = '/arcade/linac-ct/dicom-review.html';
            }
            dicomModal.style.display = 'block';
        });
        dicomClose.addEventListener('click', () => { dicomModal.style.display = 'none'; });
    }
    ```
    (`dicomB64` is removed from the const list and the guard; the `file:` branch dies with the embed — it only existed for the srcdoc/atob dance.)
  - The two classic scripts (`rtappsV2ConsolePatch` 9989–10432, `rtappsCTQueueWorkspace` 10458–10605) STAY INLINE in `index.html` verbatim for this PR (PR 2 modularizes them), except inside `rtappsCTQueueWorkspace`: DELETE the `const CT_SUITE_HTML="…";` line (10461) and replace `initFrame` (10540–10548) with exactly:
    ```js
    function initFrame(){
      const fr=$('rtappsCTFrame');if(!fr||fr.dataset.loaded)return;
      fr.dataset.loaded='1';
      fr.src='/arcade/linac-ct/ct-suite.html';
    }
    ```
  - Everything else (styles, markup, `#ctSimWorkspace` DOM, footer) byte-identical.

- [ ] **Step 3: Split the CT suite document** (`ct-suite.html` from Step 1) the same way:
  - Keep line 4 `<base href="/arcade/linac-ct/">` verbatim (it's what resolves `assets/ct-N.png` at runtime).
  - DELETE the entire importmap tag (lines 8–156). Lines 16–154 inside it are dead code (an IIFE inside a JSON-only tag, never executed) — its deletion is behavior-neutral; REPORT it as a finding for issue filing ("parent decor IIFE embedded in CT suite importmap, dead").
  - Replace the module script (640–1475) with `<script type="module" src="./src/ct-suite/main.js"></script>`; body (641–1474) VERBATIM to `src/ct-suite/main.js` with only the `@ts-nocheck` header (note: removed in PR 4) and specifier renames `'three'` → `'three-ct'`, `'three/addons/'…` → `'three-ct/addons/'…`.
  - `public/dicom-review.html` stays byte-identical to the decoded output — no edits at all (its CDN script tags included).

- [ ] **Step 4: Create `apps/web/vite.arcade.linac-ct.config.ts`:**
  ```ts
  // What this file does: Vite build for the linac-ct arcade app — a multi-page build
  // (parent shell + the un-embedded CT operator console) from arcade-src/linac-ct/
  // back into apps/web/arcade/linac-ct/, the same paths the arcade route has always
  // served. public/ carries the CT PNGs + the static DICOM review page verbatim, so
  // /arcade/linac-ct/assets/ct-1.png keeps its e2e-asserted URL.
  // Used here and why: a second config (vs. extending vite.arcade.config.ts) because
  // Vite has one root per build and sim-hub/linac-ct need different roots; the
  // build:arcade script chains both. Three.js versions stay per-app via the
  // three-linac/three-ct npm aliases in package.json — no resolve.alias needed.
  import { defineConfig } from 'vite';
  import { fileURLToPath } from 'node:url';

  export default defineConfig({
  	root: 'arcade-src/linac-ct',
  	base: '/arcade/linac-ct/',
  	build: {
  		outDir: '../../arcade/linac-ct',
  		emptyOutDir: true,
  		rollupOptions: {
  			input: {
  				index: fileURLToPath(new URL('./arcade-src/linac-ct/index.html', import.meta.url)),
  				'ct-suite': fileURLToPath(new URL('./arcade-src/linac-ct/ct-suite.html', import.meta.url))
  			}
  		}
  	}
  });
  ```

- [ ] **Step 5: Wire `apps/web/package.json`** (then `pnpm install` at repo root to update the lockfile):
  - dependencies (exact pins, no carets; `three: "0.160.0"` stays untouched):
    ```json
    "three-ct": "npm:three@0.163.0",
    "three-linac": "npm:three@0.160.1",
    ```
  - script change: `"build:arcade": "vite build -c vite.arcade.config.ts && vite build -c vite.arcade.linac-ct.config.ts"` (dev/build/dev:arcade chains unchanged — they already run `build:arcade`; note `dev:arcade --watch` now only watches sim-hub, acceptable and pre-existing single-config behavior).

- [ ] **Step 6: Ignore wiring + old file removal.** Root `.gitignore`: add `apps/web/arcade/linac-ct/` (next to the existing `apps/web/arcade/sim-hub/` line). `git rm apps/web/arcade/linac-ct/index.html` (assets were `git mv`'d in this task; nothing else remains tracked there).

- [ ] **Step 7: Build + verify output.** `pnpm --filter web build:arcade` then check `apps/web/arcade/linac-ct/` contains: `index.html` (with `/arcade/rtapps-sdk.js` tag, the two inline classic scripts, NO `importmap`, NO `cdn.jsdelivr`, NO `CT_SUITE_HTML`), `ct-suite.html`, `dicom-review.html`, `assets/ct-1.png`…`ct-5.png`, hashed `assets/*.js`. `git status` must show the output dir ignored.

- [ ] **Step 8: Bidirectional sweep + prettier + gates.** Prettier-format the new source (`pnpm --filter web exec prettier --write arcade-src/linac-ct`). eslint `no-undef` already covers `arcade-src/**/*.js` — run full gates (Global Constraints). Expect green: the moved scripts are self-contained (the module script referenced nothing from the classic scripts and vice versa — only `window.*` bridges, verified in recon).

- [ ] **Step 9: Commit** `refactor(linac-ct): un-embed CT suite + DICOM page, build from arcade-src via Vite (#77 phase 2, PR1)`.

### Task 2: Guardrails — smoke script, checkJs project, seed-test path

**Files:**
- Create: `apps/web/scripts/arcade-smoke.mjs` (copy of `docs/plans/2026-09-17-arcade-smoke.mjs`, verbatim), `apps/web/tsconfig.arcade.json`
- Modify: `apps/web/package.json` (check script), `apps/api/tests/test_seed.py:1176`

**Interfaces — Produces:** the per-task smoke command every later task runs; the `tsc -p tsconfig.arcade.json` gate PRs 3–4 ratchet.

- [ ] **Step 1: Smoke script.** `cp docs/plans/2026-09-17-arcade-smoke.mjs apps/web/scripts/arcade-smoke.mjs`. Run it: `cd apps/web && node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html`. Expected: three `SMOKE OK (clean evaluation)` lines, exit 0. If a bundle throws on a MISSING STUB (e.g. a DOM/WebGL API the harness lacks), extend the stub section minimally and re-run; if it throws a ReferenceError/TypeError rooted in the moved code, STOP and report — that's a real Task-1 defect, not a harness gap.

- [ ] **Step 2: Create `apps/web/tsconfig.arcade.json`:**
  ```json
  {
  	"compilerOptions": {
  		"target": "esnext",
  		"module": "esnext",
  		"moduleResolution": "bundler",
  		"lib": ["esnext", "DOM", "DOM.Iterable"],
  		"allowJs": true,
  		"checkJs": true,
  		"strict": false,
  		"noImplicitAny": false,
  		"noEmit": true,
  		"skipLibCheck": true,
  		"isolatedModules": true,
  		"types": []
  	},
  	"include": ["arcade-src/linac-ct/**/*.js", "arcade-src/linac-ct/**/*.ts"]
  }
  ```
  (Scoped to linac-ct for now — a recorded refinement of spec decision 5: the NEW source is compiler-protected from day one; sim-hub joins the include in PR 3's first task as its conversion starts. `strict`/`noImplicitAny` stay off per spec decision 4. The moved legacy files carry `@ts-nocheck`, so the gate's PR-1 value is wiring + protection of any new non-legacy file; every conversion commit ratchets real coverage by deleting a header.)

- [ ] **Step 3: Wire the gate.** `apps/web/package.json`: `"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json && tsc -p tsconfig.arcade.json"`. Run `pnpm --filter web check` — expect green.

- [ ] **Step 4: Seed test path.** `apps/api/tests/test_seed.py:1176`: change `apps/web/arcade/linac-ct/index.html` → `apps/web/arcade-src/linac-ct/index.html` (mirror of the sim-hub change in `28104df` — the built output is gitignored; the source proves the app exists on disk). Run just that test: `cd apps/api && uv run pytest tests/test_seed.py -k arcade_directories > /tmp/seedtest.log 2>&1; echo "exit=$?"` — expect exit=0.

- [ ] **Step 5: Full gates + smoke** (Global Constraints command list). **Commit** `refactor(linac-ct): arcade bundle smoke script + checkJs project + seed-test path (#77 phase 2, PR1)`.

### Controller close-out, PR 1

- [ ] Push, `gh pr create --fill`, CI fully green (do NOT arm auto-merge). **HOLD merge until the owner's pending sim-hub walk passes.** Then merge → auto-deploy → **owner walk** of linac-ct on test.rttlearn.com: vault view, one LINAC fraction to completion, CT workspace open, one CT scan to completion (`sim-ct-scan` recorded), DICOM review opens.

---

## PR 2 — branch `refactor/linac-ct-modules` (Tasks 3–9, one reviewed commit each)

Branch from main after PR 1 merges. Module naming refines the spec's coarse list (`linac` → `linac-delivery`/`linac-igrt`/`linac-safety`; plus `state`/`dom`/`game`/`console-patch`) — recorded here per the phase-1 `props.js` precedent, no spec edit needed. Verbatim-move protocol = phase 1's (anchors cut unchanged; sole-use helpers move with their anchor; shared data to its owning module and exported; mutable top-level `let`s live in `S`; every move gets the bidirectional sweep; every task ends with gates + smoke). Parent anchors: `docs/plans/2026-09-17-linac-ct-parent-anchors.md` (per-module function lists; the plan below names the modules and their themes — the appendix is the authoritative symbol list). All new module files inherit the `@ts-nocheck` header until PR 4.

### Task 3: parent `state.js` + `dom.js`

- `src/state.js`: `export const S = {}` holding ALL 59 top-level `let`s of `main.js` (list in the appendix), initializers preserved verbatim, order preserved; references renamed `name` → `S.name` with manual review of every match (skip strings/markup). `window.*` assignments (`clinicalIGRTActive`, `clinicalIGRTCouchShift`, `RTAppsLinacMirrorBridge`) stay byte-identical.
- `src/dom.js`: the DOM-element-reference const block (source lines 3291–3673, ~105 consts) moved verbatim, each `export`ed. `main.js` and later modules import what they use.
- Post-rename check: `grep -n "S\.S\." arcade-src/linac-ct/src/*.js` returns nothing.
- Commit `refactor(linac-ct): extract state.js (S object) and dom.js`.

### Task 4: parent `scene.js` + `cctv.js` + `travel.js`

Appendix groups: `scene.js` (geometry/texture builders, `initThreeJS`, `onWindowResize`, all `create*3D`/waveguide-part builders, internals shell-game, kV/beam/laser builders); `cctv.js` (`setupCCTVFeeds`, `resizeCCTVFeeds`, `updateCCTVFeeds`); `travel.js` (`beginTravelPath`, `travelToRoomView`, `updateTravelWorkflow`, `updateCameraTravel`, `updateVaultAesthetics`, `syncRoomViewButtons`, `getRoomViewPreset`). `animate()` stays in `main.js`. Commit `refactor(linac-ct): extract scene.js, cctv.js, travel.js`.

### Task 5: parent `linac-delivery.js` + `linac-igrt.js`

Appendix groups: delivery/case/patient-pose/special-technique workflows (delivery-field state machine, SRS, motion/DIBH, OIS, adaptive, electron bolus, immobilization, case loading, treatment lifecycle) and the `clinicalIGRT*` cluster. Commit `refactor(linac-ct): extract linac-delivery.js and linac-igrt.js`.

### Task 6: parent `linac-safety.js` + `sdk.js` + `game.js`

Appendix groups: safety (collision system, clearance/readiness gating, jaw state, pendant LCD, BEV inset); `sdk.js` (`treatmentCompletion`, `chargeCapture`, `postChargeAndCompleteFraction` — both `recordResult('sim-linac-fraction')` sites verified byte-identical at review — plus the `HUB_URL` resolver block from source 3277–3283, wrapped as `export function resolveHubUrl() { … }` with body verbatim and called from `main.js`'s bootstrap in original position — the phase-1-approved pattern for relocating a top-level executable block); `game.js` (quiz/store/save-load/updateUI cluster). Commit `refactor(linac-ct): extract linac-safety.js, sdk.js, game.js`.

### Task 7: parent classic scripts → `console-patch.js` + `workspace.js`; `main.js` becomes bootstrap

- The two inline classic scripts in `index.html` move verbatim into `src/console-patch.js` and `src/workspace.js` (each keeps its IIFE wrapper unchanged — they were written as IIFEs and stay so; only the surrounding `<script>` tags die).
- `main.js` gains, as its FIRST two imports: `import './console-patch.js'; import './workspace.js';` — preserving today's classic-before-module execution order (see source map note). The `window.RTAppsLinacMirrorBridge` assignment stays in `main.js` (evaluates after, exactly as today).
- `workspace.js` contract items re-verified byte-identical: `recordResult('sim-ct-scan')`, all five `rtapps-ct-*` type strings, `initFrame`'s `/arcade/linac-ct/ct-suite.html` URL.
- After this task `main.js` = imports + DOM wiring + bootstrap statements (source 9142–9274 order preserved) + the 4 tail IIFEs + bridge assignment + `animate` loop.
- Commit `refactor(linac-ct): extract console-patch.js and workspace.js; main.js is bootstrap+loop`.

### Task 8: CT suite module split (`src/ct-suite/`)

From the recon census of the un-embedded script (all names verbatim):
- `room.js`: `initThree`, `createRoom`, `createGantry`, `createCouchPatient`, `buildPatient`, `createLasers`, `setView`, `onResize`, `animate`, consts `TABLE_W`, `BORE_R`, `HOUSING_R`, `GANTRY_DEPTH`, `PATIENT_LEN`, and the scene-object state (`scene`, `camera`, `renderer`, `controls`, `clock`, `gantryHousing`, `gantryRotor`, `tubeMesh`, `detectorMesh`, `couchGroup`, `tableTop`, `patientGroup`, `skinGroup`, `boneGroup`, `organGroup`, `tumorMesh`, `laserGroup`, `gantryAngle` — these mutable bindings stay in `room.js` as exported `let`s; ES-module live bindings keep cross-module reads correct, and they are only assigned inside this module's functions).
- `console.js`: `PROTOCOLS`, `PROTO_SPEC`, `WL_PRESETS`, `REGION_SPAN`, `HABITUS_CASES`, `TECH_BASE`, `S` (the suite's own state object — exported), `spanOf`, `techniqueTarget`, `habitusForProtocol`, `updateTechniqueReadout`, `updateAcquisitionGates`, `resetTechniqueForProtocol`, `selectHabitus`, `setTechnique`, `validateTechnique`, `buildProtocols`, `buildWL`, `buildSteps`, `setStep`, `setProto`, `setWL`, `updateRangeLabels`, `moveCouch`, `setIso`, `wire`, `setStatus`, `setXray`, `$`, `log`.
- `imaging.js`: `REAL_DATA`, `REALV`, `buildScout`, `decodeRealVolume`, `rnd`/`noiseSeed`, `ell`, `lerp`, `sampleHU`, `bodyBase`, `huPelvis`, `huThorax`, `huAbdomen`, `huHead`, `genSliceHU`, `paintHU`, `autoWindow`, `hoverHU`, `repaintCurrent`, `levelToTablePos`, `drawScoutReal`, `drawTopogram`, `topoCanvas`/`topoCtx`/`TOPO_W`/`TOPO_H`, `axCanvas`/`axCtx`/`REC`, `acquireTopogram`, `startScan`/`finishScan`/`stopScan`/`scanTimer`, `reviewSlice`. Eval-order hazard: the `Object.keys(REAL_DATA).forEach(...)` REALV init stays immediately after `REAL_DATA` in this module.
- `bridge.js`: the `window.addEventListener('message', …)` handler and helpers around the two child-side `postMessage` sends, exported as functions `main.js` calls (the `rtapps-ct-complete` send stays inside `finishScan` in `imaging.js` — byte-identical).
- `main.js`: boot sequence in original order — `initThree(); wire();` → status/log boot lines → `setProto('prostate')` → body-class/badge DOM mutations → attach the bridge listener → final `postMessage({type:'rtapps-ct-ready'},'*')`. All top-level executable statements land here, original relative order preserved (the ready message MUST stay after listener attach).
- Commit `refactor(linac-ct): split CT suite into room/console/imaging/bridge/main`.

### Task 9 (controller): PR 2 close-out

- [ ] Final whole-branch review (most capable model; review package from `git merge-base main HEAD`; reviewer EXECUTES the smoke against all three pages and spot-verifies relocation purity + the SDK contract lines).
- [ ] Push, PR, CI green, merge → deploy → **owner walk** (same route as PR 1's).

---

## PR 3 — branch `refactor/sim-hub-ts` (Tasks 10–16)

Conversion protocol (Tasks 11–16, and PR 4): per module, one commit: `git mv x.js x.ts`; delete any `@ts-nocheck` header; run `pnpm --filter web check`; fix ONLY compiler findings via type syntax — parameter/return/variable annotations, interfaces, `as` casts. For legacy ad-hoc properties on Three.js objects (the dominant finding class — 76 of the 87 probe errors are TS2339), declare a small interface extending the THREE type and cast once at creation (e.g. `interface FeedCamera extends THREE.PerspectiveCamera { head?: THREE.Object3D }`); use `// @ts-expect-error -- <reason>` only where an interface would force restructuring. Zero logic edits — anything behavioral escalates. Then gates + smoke + commit `refactor(sim-hub): convert <modules> to TypeScript`.

### Task 10: TS plumbing (one commit)

- `tsconfig.arcade.json` include widens to `["arcade-src/**/*.js", "arcade-src/**/*.ts"]`.
- Add `// @ts-nocheck -- converted in this PR, header removed per-module` as line 1 of each of the 13 sim-hub `src/*.js` files (so the widened gate passes before conversions land).
- Strip the `.js` extension from every RELATIVE import specifier in sim-hub's 13 modules (`from './state.js'` → `from './state'`; `three`/`three/addons` specifiers untouched). Vite resolves extensionless via its default extensions list, so later `.js`→`.ts` renames need zero edits in importers. Verify with build + smoke.
- Gates + smoke. Commit `refactor(sim-hub): TS plumbing — widen checkJs, extensionless imports, temporary ts-nocheck`.

### Task 11: convert `state` + `helpers` + `scene`

`state.ts` also gains the typed boundary: an explicit `interface SimHubState { … }` for all 16 `S` members (e.g. `mode: 'overview' | 'walk' | …` — derive unions from actual assignments; `ROOM_APP_URL: string | null`; `CONSOLE_APP_DOORS: Set<string>`; etc.) with `export const S: SimHubState = { … }`. One commit per module (3 commits).

### Task 12: convert `rooms` + `props` (2 commits)
### Task 13: convert `npc` + `npc-behavior` (2 commits)
### Task 14: convert `equipment` + `walk` (2 commits)
### Task 15: convert `interact` + `journey` (2 commits)

### Task 16: convert `sdk-bridge` + `main`; typed export surfaces

- `sdk-bridge.ts`: type the SDK boundary — the resolver results (`string | null`), the QA payload shapes, the `__rtappsVerdictLocked` latch; `window.CONSOLE_APP_URL` mirror assignments stay byte-identical (e2e reads them; add a `declare global { interface Window { CONSOLE_APP_URL?: string; … } }` block rather than casts).
- `main.ts`: convert; update `arcade-src/sim-hub/index.html` script tag to `src="./src/main.ts"` (Vite compiles TS entries natively).
- Verify zero `@ts-nocheck` remains under `arcade-src/sim-hub/`: `grep -rn "ts-nocheck" apps/web/arcade-src/sim-hub/` → empty.
- 2 commits, then controller: final whole-branch review (types-only purity), push, PR, CI green, merge → deploy. (No dedicated owner walk required by the spec for PR 3 — it's not user-visible; the CI e2e + smoke arbitrate. Mention it to the owner anyway.)

---

## PR 4 — branch `refactor/linac-ct-ts` (Tasks 17–20)

Same conversion protocol. First, Task 10's plumbing pattern applied to linac-ct: extensionless relative imports across `arcade-src/linac-ct/src/**` (one commit, part of Task 17).

### Task 17: `ct-protocol.ts` + convert both bridge ends

- Create `arcade-src/linac-ct/src/ct-protocol.ts`:
  ```ts
  // The postMessage contract between the linac-ct parent (workspace.ts) and the
  // CT suite page (ct-suite/bridge.ts). One union per direction so the two halves
  // of the door cannot silently disagree about message shapes. Types only — the
  // wire format is unchanged.
  export interface CtViewMsg { type: 'rtapps-ct-view'; view: 'room' | 'console' }
  export interface CtCaseMsg { type: 'rtapps-ct-case'; key: string }
  export interface CtReadyMsg { type: 'rtapps-ct-ready' }
  export interface CtCaseLoadedMsg {
  	type: 'rtapps-ct-case-loaded';
  	key: string;
  	patient: string;
  	protocol: string;
  	series: string;
  }
  export interface CtCompleteMsg {
  	type: 'rtapps-ct-complete';
  	key: string;
  	patient: string;
  	series: string;
  	images: number;
  }
  export type ParentToCtMessage = CtViewMsg | CtCaseMsg;
  export type CtToParentMessage = CtReadyMsg | CtCaseLoadedMsg | CtCompleteMsg;
  ```
  (Field shapes verified against source: sends at CT-suite lines 1392/1468/1473 and parent lines 10550–10593 of the pre-move file.)
- Convert `workspace.js` → `.ts` (parent) and `ct-suite/bridge.js` → `.ts`, typing their send/receive sites with the union (`postToCT(msg: ParentToCtMessage)`, message handlers narrowing on `d.type`). Commits: plumbing, workspace, bridge.

### Task 18: convert parent batch 1 — `state`, `dom`, `scene`, `cctv`, `travel` (one commit each; `state.ts` gets its `interface LinacState` for the 59 members)
### Task 19: convert parent batch 2 — `linac-delivery`, `linac-igrt`, `linac-safety`, `sdk`, `game`, `console-patch`, `main` (+ `index.html` script tag → `./src/main.ts`; the `declare global` block for `RTAppsLinacMirrorBridge`/`clinicalIGRT*` globals lives in `main.ts`)
### Task 20: convert CT suite — `room`, `console`, `imaging`, `main` (+ `ct-suite.html` tag → `./src/ct-suite/main.ts`)

- Verify zero `@ts-nocheck` under `arcade-src/`: `grep -rn "ts-nocheck" apps/web/arcade-src/` → empty. From here `tsc -p tsconfig.arcade.json` guards every arcade file for real.

### Controller close-out, PR 4 + phase

- [ ] Final whole-branch review; push, PR, CI green, merge → deploy → final **owner walk** (both simulators, full flows).
- [ ] Add the consistency rule line to `docs/04-conventions.md` (per spec "Consistency end-state"): "Application-scale arcade apps (sim-hub, linac-ct) are modular TypeScript under `apps/web/arcade-src/`; the small single-activity games stay single-file by policy."
- [ ] Update #77 (phase 2 done; remaining follow-ups: sim-hub SCC dissolution, CI smoke gate (#61), dead-code list, DICOM-page CDN scripts (`dicom-parser`, `jszip`) still runtime-CDN, the dead CT-suite importmap IIFE issue filed in Task 1). Update memory. Ledger closed.

---

## Verification summary

Per task: full gates (lint / check incl. `tsc -p tsconfig.arcade.json` / 161 tests / `build:arcade`) + `node scripts/arcade-smoke.mjs` over all three built pages + reviewer purity check (relocation purity PRs 1–2; types-only purity PRs 3–4) + bidirectional symbol sweeps on every move. Per push: CI fresh-stack e2e (`simulator.e2e.ts`: hub door handoff, `sim-linac-fraction` + `sim-ct-scan` completions, the ct-1.png URL + Cache-Control contract) on the self-hosted runner. Owner walks after PRs 1, 2, and 4. SDK/postMessage contract lines byte-verified at review wherever a diff touches them.
