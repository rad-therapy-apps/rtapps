# Split linac-delivery.ts into feature modules: design

**Date:** 2026-10-23. **Status:** approved by the owner: 12 files in `linac-ct/src/delivery/`, the old file removed, and importers pointing at the new files directly.

## Why

#77 phases 1–2 split linac-ct out of its single HTML file into 17 TypeScript modules. One of them, `apps/web/arcade-src/linac-ct/src/linac-delivery.ts`, is still 7,469 lines:
- about 3,200 lines are a case library, pure data (`TREATMENT_CASES` alone runs 2,933 lines);
- the rest is about ten separate treatment-room features in one file.

The file is already laid out in contiguous feature blocks, so it can be split along its existing boundaries. This is a maintainability change only. Nothing changes on screen, and the owner's pending simulator walk-through covers it together with #77 and #167.

## What the file holds today

From the TypeScript compiler's top-level statement map:
- 8 imports, 23 interfaces, 140 functions and 10 `const`s.
- **No top-level statement runs code when the module loads.** Every `const` initializer is a literal: object and array data, `Math.PI`, numbers and strings. None references another top-level name except the `TreatmentCase` type. So the order in which the new modules load cannot change behaviour.
- **The delivery files import each other in cycles** (for example `plan` ↔ `special-setup`, `treatment-delivery` ↔ `plan`). That is safe only while none of them runs code at load. A future top-level `const x = fn()` in any of them needs its load order checked.
- Six modules import from it, 134 names in all, counting type-only imports: `main.ts` 56, `linac-safety.ts` 29, `scene.ts` 20, `linac-igrt.ts` 12, `sdk.ts` 10, `state.ts` 7.

## Design

**New folder:** `apps/web/arcade-src/linac-ct/src/delivery/`. The source line ranges below refer to `linac-delivery.ts` at `main` 065fd0d. Ranges are by statement start line. Each statement moves together with the comments above it; a trailing same-line comment travels with the statement after it.

| New file | Holds | Source lines |
|---|---|---|
| `types.ts` | All 23 interfaces (`TreatmentField`, `TreatmentCase`, `AdaptiveScenario`, …) | 93–352 |
| `plan.ts` | Plan and field parsing, couch-vs-plan checks, dynamic arc/control-point state, the delivery field select; the machine-geometry drivers `getODIMeasurement`, `setBeamWidth`, `setReceptorSID` | 356–704, 3904–3934 |
| `special-setup.ts` | Special setups (breast match, CSI, electron diagrams and panel); `currentSpecialFieldTarget`, `updateSpecialAnatomyTargetMarker` | 706–1021, 7355–7386 |
| `stereotactic.ts` | SRS / SBRT checklist, dry run, clearance | 1023–1379 |
| `motion.ts` | Motion management: 4D characterization, DIBH hold, gating, waveform | 1381–1807 |
| `ois.ts` | OIS record-and-verify: session store, event log, snapshot, sign-off | 1809–2196 |
| `adaptive.ts` | Adaptive replanning course, dose chart, fraction advance | 2198–2787 |
| `electron-bolus.ts` | Electron bolus delivery task (drag and verify); `updateElectronBolusMesh` | 2789–2983, 7388–7415 |
| `immobilization.ts` | Immobilization devices, shelf, drag-drop, verification; `applyImmobilizationRules` | 2985–3504, 6899–6997 |
| `treatment-delivery.ts` | `DELIVERY_SPEED_FACTOR`; beam-on delivery (arm, hold, resume, tick, finish, terminate) | 354, 3506–3902 |
| `cases.ts` | Case library data: `PATIENT_POSITIONS`, `PATIENT_POS_NAMES`, `PATIENT_ROT`, `IMAGING_SITES`, `TREATMENT_CASES`, `SETUP_REFINEMENTS`. Its only import is a type-only import of `TreatmentCase`. | 3936–6896, 6999–7249 |
| `case-setup.ts` | Case select and load, `isFixedElectronField`, patient position and pose, `runPatientSetup`, `setImagingError6DOF` | 7251–7353, 7417–7469 |

**Rules for the move:**
- **Text kept verbatim.** Every statement and comment moves character-for-character. Inside each new file, statements keep their original relative order (lower source line first).
- **The only allowed text changes:**
  1. Each new file gets its own import block. It imports only what it uses: `three-linac`, `../state`, `../dom` and the other sibling modules, plus the other `delivery/*` files. Type-only imports use `import type`.
  2. `export ` is added in front of a previously private top-level function or `const` when another new file now needs it. Nothing else gains `export`.
  3. Each new file starts with one comment line saying what it holds and that it was split out of `linac-delivery.ts` (#77).
- **`linac-delivery.ts` is deleted.** Its six importers change only their import statements: each name is imported from the new file that now holds it. No other line in those files changes.
- **No barrel or index file**, matching the rest of `arcade-src/`, which has none.
- **Pre-existing dead code moves unchanged,** with its existing eslint-disable comment. That is `setReceptorSID`, plus anything else annotated that way. Removing it is out of scope.

## Proof of no behaviour change

1. **Verbatim check** (scratch script using the TypeScript compiler API).
   - **Statements:** over all top-level non-import statements, the multiset in the old file equals the multiset across the 12 new files. Statement text is compared after removing one leading `export ` keyword.
   - **Comments:** the multiset of comments in the old file equals the multiset in the new files, minus the 12 new header lines.
   - The check reports `VERBATIM OK`, or lists every difference.
2. **Built output.**
   - Build linac-ct unminified (`vite build -c vite.arcade.linac-ct.config.ts --minify false --outDir <scratch>`) before and after.
   - Parse each `index-*.js` into top-level statements, dropping comments and `//#region` markers, and normalizing rolldown's collision suffixes (`name$1` → `name`).
   - The multisets must be equal: the same code, possibly in a different order. `ct-suite-*.js` must be byte-identical (it does not import `linac-delivery.ts`).
3. **Gates:**
   - `pnpm check` must report 0 errors, which includes `tsc -p tsconfig.arcade.json` (23 pre-existing warnings are fine).
   - `pnpm exec eslint arcade-src` and `prettier --check arcade-src` must be clean.
   - `pnpm test` must stay at 326 passed.
   - `pnpm build:arcade` followed by `node scripts/arcade-smoke.mjs` on the three pages must print three `SMOKE OK`. This step evaluates each built bundle, so a crash at load fails here. It cannot catch every load-order mistake: rolldown turns top-level `const` into `var`, so a value read too early in the bundle is `undefined` rather than an error. Item 4 covers that.
4. **CI:** the same checks, plus the e2e suite, which drives the linac-ct simulator.
5. **Module order** (added after the final review). The split changes the bundle's module order:
   - **Outside `delivery/`:** `sdk` now evaluates before `linac-igrt`.
   - **What was checked:** the evaluation order computed from source, ignoring `import type`, matches the built bundle's.
   - **Delivery files still come first:** every delivery module still evaluates before `game`, `linac-safety`, `scene`, `travel` and `main`.
   - **Nothing earlier reads delivery names:** the modules that evaluate earlier or in between (`console-patch`, `workspace`, `state`, `dom`, `cctv`, `sdk`, `linac-igrt`) read no delivery name at load. `sdk` and `linac-igrt` only declare literal values.
   - So the reordering is harmless.
6. **Owner:** the walk-through of both simulators (#77), which now also covers #167 and this split.

## Known follow-ups

- **Stale comments.** Some comments still describe the old single file. Under the verbatim rule they were not edited:
  - in moved code, e.g. `delivery/types.ts` lines 3–9 ("the 32-entry literal below", now in `cases.ts`);
  - in untouched files: `dom.ts` and `state.ts` still name `linac-delivery.ts`.
  
  A small comment-only follow-up can update them.
- **The commit message for 7210a2f** says "'export' on 18 helpers"; 5 of the 18 are interfaces.

## Out of scope

- Any edit to the moved code: renames, dead-code removal, type tightening.
- `scene.ts` (3,425 lines) and `main.ts` (2,903). Each is one job.
- `index.html` (11,438 lines, 9,100 of them CSS).
- #163 (the LINAC console startup refresh); it needs the owner's go-ahead because it changes behaviour.
