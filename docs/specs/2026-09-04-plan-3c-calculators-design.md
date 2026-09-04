# Plan 3c design — Calculator suite + follow-ups (M5 / v0.5.0)

<!--
What this file does: the approved design for plan 3c — the remaining portable legacy
calculators on the framework plan 3b proved, the photon-complete MU calculator upgrade,
and follow-up issues #42 #43 #44.
Used here and why: brainstormed and approved 2026-09-04 against the legacy-calculator audit
(.superpowers/sdd/3c-calculator-audit.md); the writing-plans skill turns this into
docs/plans/<date>-plan-3c-calculators.md, executed subagent-driven on branch feat/calculators.
How it fits the project: milestone M5 (tag v0.5.0). Complex legacy calculator pages are
phase-4 backlog (listed in §5), alongside games/simulators/EMR.
Works with: docs/specs/2026-09-03-plan-3b-authoring-design.md (calculator framework:
registry, interpolate2d, data_table grids, snapshot embedding), the audit report above,
issues #42 #43 #44.
-->

## Decisions log (owner, 2026-09-04)

| Question | Decision |
|---|---|
| 3c scope | The "easy 6" (5 trivial calculators + SI converter) + photon-complete MU upgrade + issues #42 #43 #44 |
| MU depth | Photon-complete: Sc/Sp scatter, wedge/tray factors, Mayneord extended-SSD correction; electron mode → phase 4 |
| Complex legacy pages | Defer to phase 4, listed explicitly in this spec (no per-page issues) |
| 1D tables (design call) | Modeled as single-row grids in the existing `data_table` — single-row `interpolate2d` is already tested; zero schema/API changes |
| SI prefix factors (design call) | Exact constants in the component, NOT author-editable data tables — nothing there for an author to edit |
| Table data entry (design call) | Transcribed once from the audited legacy JS into `seed.py`; no converter tooling |

## Goals

1. Every portable legacy calculator runs on the new platform: inverse-square (plus its
   ALARA instance), Mayneord extended-SSD, gap calculation, magnification, SI unit/prefix
   converter, and a photon-complete MU calculator.
2. Issues #42 (import_quiz reimport staleness), #43 (media content-type pinning), and
   #44 (author error-helper extraction) closed.
3. The six complex legacy calculator pages are recorded as phase-4 backlog, not lost.

## 1. Five new trivial calculators

Each is one registry entry (`apps/web/src/lib/calc/registry.ts`) backed by a pure formula
module with unit tests and a small Svelte component in the established MuCalculator style:
`$derived` outputs (no submit button), teaching-style intermediate values, out-of-range /
non-finite guards (never NaN/Infinity on screen), tabs/runes/no-`{@html}`.

| calc_type | Computes | Formula core | Data |
|---|---|---|---|
| `inverse_square` | Dose/intensity at a new distance | I2 = I1 × (d1/d2)² | none |
| `mayneord` | Extended-SSD correction factor (F factor) | F = ((SSD2+dm)/(SSD1+dm))² × ((SSD1+d)/(SSD2+d))² | none |
| `gap` | Adjacent-field skin gap | gap = (L1/2)(d/SSD1) + (L2/2)(d/SSD2) | none |
| `magnification` | Radiographic magnification | M = SID/SOD (+ object/image size solve) | none |
| `si_convert` | SI unit/prefix conversion (activity, dose, exposure units) | value × prefix/unit factors | exact constants IN the component |

Exact formulas and input/output sets come from the audit report's per-page extraction
(`.superpowers/sdd/3c-calculator-audit.md`) — the plan copies them verbatim per calculator.
The ALARA activity is an additional seeded activity instance of `inverse_square` (different
title/subject; same component) — components must not hardcode their activity's title.

## 2. MU calculator — photon-complete upgrade

`calc_type` stays `"mu"`; the component and snapshot contract are extended, backward
compatible:

- **New 1D tables** (single-row grids in `data_table`, keys referenced from the
  calculator's `config.data_tables`): `sc_6mv` (collimator scatter vs field size),
  `sp_6mv` (phantom scatter vs field size), `wedge_factors` (factor vs wedge angle),
  `tray_factors` (factor vs tray type index or a small fixed set). Values transcribed from
  the legacy `Treatment_Planning/MU_Calculator` JS into `seed.py`; the demo calculator is
  re-seeded referencing them.
- **Formula**: SSD mode `MU = dose / ((PDD/100) × Sc × Sp × WF × TF × Mayneord?)`;
  SAD/TMR mode analogous with TMR replacing PDD/100 and no Mayneord. Each factor's
  looked-up value appears in the teaching output.
- **Graceful degradation**: any absent table → that factor is 1.0 and the output labels it
  "(not configured)"; the existing pdd/tmr-only configuration keeps working unchanged.
  Non-finite/zero guards as today.
- **Mayneord correction**: optional toggle with treatment-SSD vs table-SSD inputs, applied
  only in SSD mode; formula from §1's `mayneord` module (shared, not duplicated).
- Table selection by key substring continues the existing convention (`"sc"`, `"sp"`,
  `"wedge"`, `"tray"` — matching the seeded key names); a key matching none of the roles is
  ignored with a visible note in the author-facing config, not a crash.
- Electron mode is explicitly OUT (phase 4): different tables and formula path.

## 3. Authoring touch-up

The data-tables page's "New calculator" form replaces the hardcoded `calc_type: "mu"` with
a select. The list of valid calc_types lives in ONE shared place on the web side (exported
beside the registry) so the form, the registry, and the student route's unknown-type
fallback can never drift. On the API side: if `CalculatorCreateIn`/`CalculatorPutIn`
currently pin `calc_type` to the literal `"mu"`, widen it to a constrained plain string
(pattern `^[a-z][a-z0-9_]{1,39}$`) — the registry's unknown-type fallback paragraph is the
student-side safety net, so the API stays agnostic about which types exist (client regen
required if the schema changes).

## 4. Follow-up issues

- **#42**: in `app.content.activity_importer.import_quiz`'s reimport branch, new
  `QuizQuestion` rows must be appended via the `quiz.questions` relationship (or the
  collection refreshed) so the ORM collection isn't left stale after `clear()`; a
  double-import test asserts the rebuilt snapshot still carries the questions.
- **#43**: `MediaStorage.presigned_get` pins the served Content-Type via
  `response-content-type=<asset.mime>` (the DB-validated mime), so a mismatched
  direct-to-storage PUT can never control what the browser renders it as; test asserts the
  generated URL carries the parameter (fake storage records it).
- **#44**: the copy-pasted `problemDetail`/`errorTitle` helpers across the author pages
  move to one shared module (`apps/web/src/lib/author/problem.ts`); all call sites updated;
  behavior unchanged.

## 5. Phase-4 backlog (deferred complex pages, recorded here)

Beam_Dose_Simulator, Technique_Simulator, TPS_Simulator, Run_Plan, field_size_simulator
(canvas/Three.js simulators); PDD_Explorer and TMR_PDD (fictional non-clinical analytic
model, disclaimed in the legacy source); bolus dose-buildup sim (canvas curve generator);
room_shielding NCRP-151 vault game (real formula, game shell); MU electron mode.

## Testing

- Pure-formula unit tests per calculator (hand-computed expected values, edge/zero/
  non-finite cases), mirroring `interpolate.test.ts`'s rigor.
- Component specs for representative cases per calculator (exact computation renders;
  guard message on bad input), in the players' browser-spec idiom.
- MU upgrade: unit tests for the factor chain (all factors present; each factor absent →
  1.0 labeled; Mayneord on/off; TMR mode) + an updated exact-value component spec; seed
  test asserts the four new tables and the re-published demo config.
- API tests for #42 (double-import) and #43 (URL parameter); web tests unchanged for #44
  (pure refactor — existing specs are the guard).
- No new e2e: the existing calculator e2e already proves the student route path; new
  calc_types ride the same branch.

## Out of scope

Electron-beam MU · every §5 page · new data_table schema shapes · attempt recording for
calculators · authoring UI changes beyond the calc_type select.
