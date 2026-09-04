# Plan 3c Implementation Plan — Calculator suite + follow-ups (v0.5.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port every remaining portable legacy calculator onto the plan-3b framework (five trivial calculators + the SI converter), upgrade the MU calculator photon-complete (Sc/Sp/wedge/tray/Mayneord), and close issues #42/#43/#44.

**Architecture:** Pure formula modules in `apps/web/src/lib/calc/` consumed by small Svelte components registered in the existing calc registry; new 1D tables are single-row grids in the existing `data_table` (single-row `interpolate2d` is already proven); table values transcribed once from the audited legacy JS into `seed.py`. Spec: `docs/specs/2026-09-04-plan-3c-calculators-design.md`. Formula source of truth: `.superpowers/sdd/3c-calculator-audit.md` (verbatim legacy extractions).

**Tech Stack:** SvelteKit 2 / Svelte 5 runes (apps/web), FastAPI + SQLAlchemy 2 async (apps/api). No new dependencies, no migrations, no new e2e.

## Deviations from the spec (decided while grounding the plan — record, don't re-litigate)

1. **`extended_ssd`, not `mayneord`, is the calc_type name** for the Extended-SSD page: the legacy page computes the inverse-square output correction (`isf = ((ssd0+d)/(ssde+d))²`, %output, MU multiplier, field factor), NOT the Mayneord F factor. The Mayneord F function lives in the MU formula module (used by the MU calculator's SSD branch), matching the legacy MU_Calculator.
2. **Tray factor is a direct numeric input** (default 1.0) in the upgraded MU calculator, not a table: legacy `trayFactors` is keyed by categorical tray names, which don't fit numeric grid keys; wedge factors stay table-driven (numeric angles).
3. **`dmax` and `K` (calibration cGy/MU) are user inputs with defaults** (1.5 cm, 1.0) in the MU calculator, not config fields — keeps the component's contract `{tables}`-only and teaches the full formula.
4. **The API's `CALC_TYPES` tuple is extended, not pattern-widened**: the existing closed-set validator stays (stricter than the spec's fallback pattern); adding literals changes no JSON schema shape, so no client regeneration is needed anywhere in this plan.
5. **Gap formula uses one shared SSD** (`gap = 0.5·L1·(d/ssd) + 0.5·L2·(d/ssd)`) — verbatim from the legacy page, which has a single SSD input (the spec sketch showed per-field SSDs).

## Global Constraints

- Branch `feat/calculators` from `main`; tag at the end is `v0.5.0` (milestone M5). Commit per task.
- API gates (from `apps/api`): `uv run ruff check . && uv run ruff format --check . && uv run mypy app` and `TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5434/rtapps_test uv run pytest -q > /tmp/pt.log 2>&1; echo "exit=$?"` — real exit code, NEVER pipe pytest through tail/head; the gate is `mypy app`, NOT `mypy .`. Never run two api pytest processes concurrently (shared test DB).
- Web gates (repo root): `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test > /tmp/wt.log 2>&1; echo "exit=$?"` (rerun one chromium timeout before concluding failure — known flake).
- The legacy checkout `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtt_e_workbook` is READ-ONLY reference material. NEVER read, create, or edit any `.env*` file.
- No API route/response SHAPE changes in this plan → no `make client` anywhere (deviation 4).
- Calculator components: Svelte 5 runes, tabs, no `{@html}`, all-`$derived` outputs (no submit button), teaching-style intermediate values, and NEVER render NaN/Infinity — non-finite/out-of-range shows a message (the established MuCalculator idiom). Components must not hardcode their activity's title (the ALARA activity reuses `inverse_square`).
- Formula constants and expected test values come VERBATIM from `.superpowers/sdd/3c-calculator-audit.md`; hand-compute every expected value in tests.
- House-style header comments (What this file does / Used here and why / How it fits / Works with) on every new file.

---

### Task 1: Pure formula modules + unit tests

**Files:**
- Create: `apps/web/src/lib/calc/formulas.ts`
- Test: `apps/web/src/lib/calc/formulas.test.ts` (node project — same naming as `interpolate.test.ts`)

**Interfaces:**
- Produces (exact signatures, consumed by Tasks 2–4):

```typescript
export function inverseSquare(i1: number, d1: number, d2: number): { i2: number; ratio: number; area: number } | null;
export function extendedSsd(ssd0: number, ssdE: number, depth: number): { isf: number; outPct: number; muMult: number; fieldF: number } | null;
export function gapCalc(l1: number, l2: number, depth: number, ssd: number): number | null;
export function magnification(sid: number, sod: number, objSize: number): { m: number; imgSize: number; pctEnlarge: number } | null;
export function siConvert(value: number, fromFactor: number, toFactor: number): number | null;
export function mayneordF(depth: number, dmax: number, ssd: number): number | null;
export function ssdIsf(ssd: number, dmax: number, depth: number): number | null;
```

Every function returns `null` for non-finite inputs, non-positive denominators, or a non-finite result — callers render a message on `null`, never a number.

- [ ] **Step 1: Write the failing tests** — `formulas.test.ts` with hand-computed expectations (legacy formulas verbatim from the audit):

```typescript
import { describe, expect, it } from 'vitest';
import {
	extendedSsd,
	gapCalc,
	inverseSquare,
	magnification,
	mayneordF,
	siConvert,
	ssdIsf
} from './formulas';

describe('inverseSquare', () => {
	// I2 = I1 * (d1/d2)^2 (audit §6): 100 * (100/200)^2 = 25
	it('computes intensity, ratio and area', () => {
		expect(inverseSquare(100, 100, 200)).toEqual({ i2: 25, ratio: 2, area: 4 });
	});
	it('nulls on zero distance', () => {
		expect(inverseSquare(100, 100, 0)).toBeNull();
	});
});

describe('extendedSsd', () => {
	// isf = ((ssd0+d)/(ssdE+d))^2 (audit §4): ssd0=100, ssdE=150, d=10:
	// (110/160)^2 = 0.47265625; outPct = 47.265625; muMult = 1/isf = 2.115702...;
	// fieldF = 150/100 = 1.5
	it('computes the extended-SSD correction set', () => {
		const r = extendedSsd(100, 150, 10);
		expect(r).not.toBeNull();
		expect(r!.isf).toBeCloseTo(0.47265625, 8);
		expect(r!.outPct).toBeCloseTo(47.265625, 6);
		expect(r!.muMult).toBeCloseTo(1 / 0.47265625, 6);
		expect(r!.fieldF).toBeCloseTo(1.5, 6);
	});
});

describe('gapCalc', () => {
	// gap = 0.5*L1*(d/ssd) + 0.5*L2*(d/ssd) (audit §5): L1=10, L2=20, d=5, ssd=100:
	// 0.5*10*0.05 + 0.5*20*0.05 = 0.25 + 0.5 = 0.75
	it('computes the skin gap', () => {
		expect(gapCalc(10, 20, 5, 100)).toBeCloseTo(0.75, 8);
	});
	it('nulls on zero SSD', () => {
		expect(gapCalc(10, 20, 5, 0)).toBeNull();
	});
});

describe('magnification', () => {
	// M = sid/sod; img = obj*M (audit §7): sid=140, sod=100, obj=4 → M=1.4, img=5.6, +40%
	it('computes magnification and image size', () => {
		const r = magnification(140, 100, 4);
		expect(r).not.toBeNull();
		expect(r!.m).toBeCloseTo(1.4, 8);
		expect(r!.imgSize).toBeCloseTo(5.6, 8);
		expect(r!.pctEnlarge).toBeCloseTo(40, 6);
	});
});

describe('siConvert', () => {
	// base = value*fromFactor; result = base/toFactor (audit §11):
	// 250 cGy (1e-2) → Gy (1): 2.5
	it('converts through base-SI factors', () => {
		expect(siConvert(250, 1e-2, 1)).toBeCloseTo(2.5, 10);
	});
	it('nulls on zero target factor', () => {
		expect(siConvert(1, 1, 0)).toBeNull();
	});
});

describe('mayneordF', () => {
	// fFactor = ((100+d)/(100+dmax))^2 * ((ssd+dmax)/(ssd+d))^2 (audit §1)
	// d=10, dmax=1.5, ssd=120: (110/101.5)^2 * (121.5/130)^2
	it('computes the Mayneord F factor', () => {
		const expected = Math.pow(110 / 101.5, 2) * Math.pow(121.5 / 130, 2);
		expect(mayneordF(10, 1.5, 120)).toBeCloseTo(expected, 10);
	});
	it('is 1 at the reference SSD of 100', () => {
		expect(mayneordF(10, 1.5, 100)).toBeCloseTo(1, 10);
	});
});

describe('ssdIsf', () => {
	// ISF = ((ssd+dmax)/(ssd+depth))^2 (audit §1): ssd=100, dmax=1.5, d=10:
	// (101.5/110)^2
	it('computes the inverse-square factor', () => {
		expect(ssdIsf(100, 1.5, 10)).toBeCloseTo(Math.pow(101.5 / 110, 2), 10);
	});
});
```

- [ ] **Step 2: Run to verify failure**: `pnpm --filter web test` → module `./formulas` not found.

- [ ] **Step 3: Implement `formulas.ts`** — every function guards inputs and the result:

```typescript
function finite(...ns: number[]): boolean {
	return ns.every((n) => Number.isFinite(n));
}

function out<T extends Record<string, number>>(r: T): T | null {
	return finite(...Object.values(r)) ? r : null;
}

export function inverseSquare(i1: number, d1: number, d2: number) {
	if (!finite(i1, d1, d2) || d1 <= 0 || d2 <= 0) return null;
	return out({ i2: i1 * (d1 / d2) ** 2, ratio: d2 / d1, area: (d2 / d1) ** 2 });
}

export function extendedSsd(ssd0: number, ssdE: number, depth: number) {
	if (!finite(ssd0, ssdE, depth) || ssd0 <= 0 || ssdE + depth <= 0) return null;
	const isf = ((ssd0 + depth) / (ssdE + depth)) ** 2;
	return out({ isf, outPct: isf * 100, muMult: 1 / isf, fieldF: ssdE / ssd0 });
}

export function gapCalc(l1: number, l2: number, depth: number, ssd: number) {
	if (!finite(l1, l2, depth, ssd) || ssd <= 0) return null;
	const gap = 0.5 * l1 * (depth / ssd) + 0.5 * l2 * (depth / ssd);
	return Number.isFinite(gap) ? gap : null;
}

export function magnification(sid: number, sod: number, objSize: number) {
	if (!finite(sid, sod, objSize) || sod <= 0) return null;
	const m = sid / sod;
	return out({ m, imgSize: objSize * m, pctEnlarge: (m - 1) * 100 });
}

export function siConvert(value: number, fromFactor: number, toFactor: number) {
	if (!finite(value, fromFactor, toFactor) || toFactor === 0) return null;
	const r = (value * fromFactor) / toFactor;
	return Number.isFinite(r) ? r : null;
}

export function mayneordF(depth: number, dmax: number, ssd: number) {
	if (!finite(depth, dmax, ssd) || ssd + depth <= 0 || 100 + dmax <= 0) return null;
	const f = ((100 + depth) / (100 + dmax)) ** 2 * ((ssd + dmax) / (ssd + depth)) ** 2;
	return Number.isFinite(f) ? f : null;
}

export function ssdIsf(ssd: number, dmax: number, depth: number) {
	if (!finite(ssd, dmax, depth) || ssd + depth <= 0) return null;
	const f = ((ssd + dmax) / (ssd + depth)) ** 2;
	return Number.isFinite(f) ? f : null;
}
```

(House-style header comment on the file; JSDoc one-liners naming each legacy source page.)

- [ ] **Step 4: Tests green**: `pnpm --filter web test` — all pass.

- [ ] **Step 5: Gates + commit**

```bash
pnpm --filter web lint && pnpm --filter web check
git add apps/web/src/lib/calc/formulas.ts apps/web/src/lib/calc/formulas.test.ts
git commit -m "feat(web): pure calculator formula modules with unit tests"
```

---

### Task 2: Four formula-calculator components + registry entries

**Files:**
- Create: `apps/web/src/lib/calc/InverseSquareCalculator.svelte`, `ExtendedSsdCalculator.svelte`, `GapCalculator.svelte`, `MagnificationCalculator.svelte`
- Modify: `apps/web/src/lib/calc/registry.ts` (four new entries + a shared `CALC_TYPES` export)
- Test: `apps/web/src/lib/calc/TrivialCalculators.svelte.spec.ts` (browser project)

**Interfaces:**
- Consumes: Task 1's formula functions.
- Produces: registry keys `inverse_square`, `extended_ssd`, `gap`, `magnification` (components take the standard `{ tables: CalcTables }` prop and ignore it — the registry's shared prop shape); `export const CALC_TYPES: string[]` listing every registered key (Tasks 3–5 extend/consume it).

- [ ] **Step 1: Write the failing browser spec** — one representative case per component, in the MuCalculator spec's idiom (render with `tables: {}`, set inputs, assert exact outputs and one guard message):

```typescript
// InverseSquare: d1=100, d2=200, I1 fixed 100 → "25.0" visible; d2=0 → guard message.
// ExtendedSsd: ssd0=100, ssdE=150, d=10 → ISF "0.4727" and MU multiplier "2.116" visible.
// Gap: L1=10, L2=20, d=5, ssd=100 → "0.75 cm" visible.
// Magnification: sid=140, sod=100, obj=4 → "1.40" and "5.60" visible.
```

(Write real render/locator code following `MuCalculator.svelte.spec.ts` — same helpers, same assertion style, exact expected strings from Task 1's hand computations.)

- [ ] **Step 2: Run to verify failure** (components missing).

- [ ] **Step 3: Implement the four components.** Each mirrors `MuCalculator.svelte`'s structure: `let { tables }: { tables: CalcTables } = $props();` (unused for these — comment why: registry prop-shape uniformity), `$state` numeric inputs with the legacy default ranges (audit §§4–7: inverse-square d1 default 100/d2 200 with I1 fixed 100; extended-SSD ssd0 100/ssdE 150/depth 10; gap L1 10/L2 20/depth 5/ssd 100; magnification sid 140/sod 100/obj 4), one `$derived` result via the Task-1 function, a teaching output block showing the formula line and each intermediate, and a guard message when the result is `null`. Number formatting: factors `.toFixed(4)`, percentages/lengths `.toFixed(2)`, ratios `.toFixed(2)` — consistent with MuCalculator.

Representative complete component (`GapCalculator.svelte`) — the other three follow the identical skeleton with their own inputs/outputs:

```svelte
<script lang="ts">
	/* header comment: gap between adjacent divergent fields at a match depth;
	   legacy source Treatment_Planning/Gap_Calculation; formula gapCalc() in ./formulas. */
	import { gapCalc } from './formulas';
	import type { CalcTables } from './registry';

	// `tables` is unused here (pure-formula calculator) but kept so every registry
	// component shares one prop shape.
	let { tables: _tables }: { tables: CalcTables } = $props();

	let l1 = $state(10);
	let l2 = $state(20);
	let depth = $state(5);
	let ssd = $state(100);

	const gap = $derived(gapCalc(l1, l2, depth, ssd));
</script>

<div class="calc">
	<label>Field length 1 (cm) <input type="number" bind:value={l1} min="1" step="0.5" /></label>
	<label>Field length 2 (cm) <input type="number" bind:value={l2} min="1" step="0.5" /></label>
	<label>Match depth (cm) <input type="number" bind:value={depth} min="0.5" step="0.5" /></label>
	<label>SSD (cm) <input type="number" bind:value={ssd} min="50" step="1" /></label>

	{#if gap === null}
		<p class="calc-message">Enter positive field lengths, depth and SSD.</p>
	{:else}
		<p class="calc-formula">gap = ½·L1·(d/SSD) + ½·L2·(d/SSD)</p>
		<p class="calc-result">Skin gap: <strong>{gap.toFixed(2)} cm</strong></p>
	{/if}
</div>
```

- [ ] **Step 4: Registry.** In `registry.ts`, import the four components, add entries, and add the shared list (single source for the authoring form and any future check):

```typescript
export const registry: Record<string, Component<{ tables: CalcTables }>> = {
	mu: MuCalculator,
	inverse_square: InverseSquareCalculator,
	extended_ssd: ExtendedSsdCalculator,
	gap: GapCalculator,
	magnification: MagnificationCalculator
};

// The authoritative list of calc_types this build can render — the authoring "New
// calculator" form's select reads this, so form and registry can never drift.
export const CALC_TYPES: string[] = Object.keys(registry);
```

- [ ] **Step 5: Tests green, gates, commit**

```bash
pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test
git add apps/web/src/lib/calc
git commit -m "feat(web): inverse-square, extended-SSD, gap and magnification calculators"
```

---

### Task 3: SI unit/prefix converter

**Files:**
- Create: `apps/web/src/lib/calc/SiConverter.svelte`, `apps/web/src/lib/calc/siUnits.ts`
- Modify: `apps/web/src/lib/calc/registry.ts` (add `si_convert`)
- Test: `apps/web/src/lib/calc/siUnits.test.ts` (node), plus one case appended to `TrivialCalculators.svelte.spec.ts`

**Interfaces:**
- Consumes: `siConvert` (Task 1), `CALC_TYPES` auto-includes via `Object.keys`.
- Produces: registry key `si_convert`; `siUnits.ts` exports `export const UNITS: Record<string, { label: string; factors: Record<string, number> }>`.

- [ ] **Step 1: `siUnits.ts`** — the constants, transcribed from the legacy `unitsData` (audit §11; READ the legacy page `Radiation_Physics/units_of_measurement/index.html` lines ~219-238 to transcribe the six quantities exactly — absorbed dose Gy/cGy/mGy, equivalent dose Sv/mSv/rem, radioactivity Bq/MBq/GBq/Ci, exposure C/kg / R, length m/cm/mm, energy J/MeV/keV — VERBATIM names and multipliers from the legacy file, not from this list, which is indicative only). Node test: one conversion per quantity, hand-computed (e.g. 250 cGy → 2.5 Gy; 1 Ci → 3.7e10 Bq if that's the legacy factor).

- [ ] **Step 2–4: Component.** Quantity `<select>` (from `Object.keys(UNITS)`), numeric value input, from/to unit selects (options from the chosen quantity's `factors` keys; reset both to the first unit when quantity changes), `$derived` result via `siConvert(value, factors[from], factors[to])`, formatted like the legacy page (fixed decimal when `1e-4 ≤ |r| < 1e7`, exponential otherwise — implement exactly that rule). Register as `si_convert`. Browser-spec case: absorbed dose 250 cGy → Gy shows "2.5".

- [ ] **Step 5: Gates + commit**

```bash
pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test
git add apps/web/src/lib/calc
git commit -m "feat(web): SI unit and prefix converter calculator"
```

---

### Task 4: MU calculator — photon-complete upgrade

**Files:**
- Modify: `apps/web/src/lib/calc/MuCalculator.svelte`
- Test: `apps/web/src/lib/calc/MuCalculator.svelte.spec.ts` (extend), `apps/web/src/lib/calc/formulas.test.ts` (no change — mayneordF/ssdIsf already covered)

**Interfaces:**
- Consumes: `mayneordF`, `ssdIsf` (Task 1); existing `interpolate2d`; existing table-role convention (first table key containing a substring).
- Produces: the upgraded `mu` component. New table roles by key substring: `"sc"` (collimator scatter vs field size), `"sp"` (phantom scatter vs field size), `"wedge"` (factor vs wedge angle) — all read as SINGLE-ROW grids via `interpolate2d(grid, grid.rows[0].key, x)`. IMPORTANT ordering: the pdd/tmr matcher currently uses `includes`; check `"sp"`-vs-`"pdd"` collisions — `"pdd_6mv".includes("sp")` is false, but write role matching so pdd/tmr are matched FIRST and excluded from the 1D-role search, and add a unit-visible note listing which table filled which role.

- [ ] **Step 1: Extend the spec first** (failing):
  - Factor chain: with a pdd table + sc/sp/wedge single-row tables present and tray=1.05 entered, dose 200, depth 10, field 10, wedge angle at an exact grid point, SSD 100 (Mayneord off): assert MU equals the hand-computed `dose / (K · (PDD/100) · Sc · Sp · WF · TF · ISF)` with K=1, ISF=ssdIsf(100,1.5,10) — compute the exact expected number in the test from the same fixture grids.
  - Each 1D table absent → its factor shows `1.0000 (not configured)` and the MU changes accordingly (assert one such case: no sc/sp/wedge tables → matches the OLD formula times ISF).
  - Mayneord: SSD input 120 with the toggle on → PDD is multiplied by `mayneordF(depth, dmax, 120)`; assert the exact value.
  - TMR mode unchanged shape: `MU = dose / (K · TMR · Sc · Sp · WF · TF)` (ISF = 1, no Mayneord) — one exact case.
  - Zero/non-finite still guarded (existing zero-cell test keeps passing).
- [ ] **Step 2: Run to verify the new cases fail.**
- [ ] **Step 3: Implement.** New `$state` inputs: `kFactor` (default 1.0, labeled "calibration (cGy/MU)"), `dmax` (default 1.5), `trayFactor` (default 1.0), `wedgeAngle` (default 0 → WF 1.0 when 0 or no wedge table), `mayneordOn` (checkbox, SSD mode only). Role resolution: `pddTable`/`tmrTable` first (existing logic), then among the REMAINING tables find first key containing `sc`, `sp`, `wedge`; helper `lookup1d(table, x)` = `interpolate2d(grid, grid.rows[0].key, x)` with null-guard. Derived chain (SSD): `pddEff = pdd × (mayneordOn ? mayneordF(...) : 1)`; `den = kFactor × (pddEff/100) × sc × sp × wf × trayFactor × ssdIsf(ssd, dmax, depth)`; `mu = dose/den` with the existing `Number.isFinite` guard. SAD: `den = kFactor × tmr × sc × sp × wf × trayFactor`. Teaching output lists EVERY factor with its value and source (`table: sc_6mv` / `not configured` / `input`), the assembled formula line, and MU at 1 decimal. Add an `ssd` numeric input (default 100) — it already implicitly assumed 100.
- [ ] **Step 4: All web tests green.**
- [ ] **Step 5: Gates + commit**

```bash
pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test
git add apps/web/src/lib/calc
git commit -m "feat(web): photon-complete MU calculator (scatter, wedge, tray, Mayneord)"
```

---

### Task 5: Authoring calc_type select (API tuple + web form)

**Files:**
- Modify: `apps/api/app/authoring/schemas.py` (`CALC_TYPES` tuple)
- Modify: `apps/web/src/routes/(app)/author/data-tables/+page.svelte` (form select; remove both hardcoded `'mu'` spots — the create payload and the "Calc type: `mu`" display line)
- Test: `apps/api/tests/test_data_tables.py` or `test_calculator_activity.py` (extend: creating a calculator with each new calc_type succeeds; an unknown one still 422s)

**Interfaces:**
- Consumes: `CALC_TYPES` export from `registry.ts` (Task 2) for the web select.
- Produces: API `CALC_TYPES = ("mu", "inverse_square", "extended_ssd", "gap", "magnification", "si_convert")` — Task 6's seed uses exactly these strings.

- [ ] **Step 1: Failing API test** — POST `/authoring/calculators` with `calc_type: "gap", data_tables: []` → 201; `calc_type: "bogus"` → 422 (extend the existing creation tests' idiom).
- [ ] **Step 2: Verify failure** (422 on "gap" today).
- [ ] **Step 3: Extend the tuple** (one line + updated comment). No client regen (validator literal set is not part of the JSON schema).
- [ ] **Step 4: Web form** — import `CALC_TYPES` from `$lib/calc/registry`, replace the hardcoded `'mu'` payload value with a bound `<select>` (default `mu`), replace the static display line. Keep the data-tables multi-select optional (trivial calcs pass `data_tables: []`).
- [ ] **Step 5: Both projects' gates + commit**

```bash
git add apps/api apps/web
git commit -m "feat: calc_type select fed by the calculator registry"
```

---

### Task 6: Seed — MU factor tables + six new published calculators

**Files:**
- Modify: `apps/api/app/seed.py` (extend the existing MU-calculator section)
- Test: `apps/api/tests/test_seed.py` (extend)

**Interfaces:**
- Consumes: API `CALC_TYPES` (Task 5), existing seed helpers (`DataTable` get-or-create, draft `Activity` + `publish_activity` — mirror the existing `pdd_6mv`/`SEED_CALC_TITLE` block exactly).
- Produces: tables `sc_6mv`, `sp_6mv`, `wedge_factors` (single-row grids; values transcribed from the legacy `Treatment_Planning/MU_Calculator/index.html` inline JS — READ that file's `scData`/`spData`/`wedgeFactors` and transcribe the 6MV series verbatim; row key 0, cols = field sizes / wedge angles ascending); the demo MU calculator's `data_tables` updated to `["pdd_6mv", "sc_6mv", "sp_6mv", "wedge_factors"]` and re-published; six new published practice activities (get-or-create by title, like the existing one): Inverse Square Law (`inverse_square`, Treatment Planning), Extended SSD (`extended_ssd`, Treatment Planning), Gap Calculation (`gap`, Treatment Planning), Magnification (`magnification`, Treatment Planning), SI Unit Converter (`si_convert`, Radiation Physics), ALARA: Inverse Square in Practice (`inverse_square`, Radiation Protection) — all `data_tables: []` except the MU calculator.

- [ ] **Step 1: Failing seed-test extensions** — assert the three new tables exist with ascending cols; the MU activity's LATEST published snapshot embeds all four tables; six new published calculator activities exist with the right kinds/subjects (query by title), incl. TWO `inverse_square` instances; seeding twice stays idempotent (existing idempotency test's counts updated).
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement** (constants module-level next to `SEED_PDD_TABLE_KEY`; loop over a small declarative list for the six activities; re-publish the MU calculator when its `data_tables` config changes).
- [ ] **Step 4: Full api suite green** (`exit=0`).
- [ ] **Step 5: Gates + commit**

```bash
git add apps/api
git commit -m "feat(api): seed scatter/wedge tables and the full calculator suite"
```

---

### Task 7: Issue #42 — import_quiz reimport staleness

**Files:**
- Modify: `apps/api/app/content/activity_importer.py` (the `import_quiz` reimport branch)
- Test: `apps/api/tests/test_activity_importer.py` (or the module holding import_quiz tests — find it first)

**Interfaces:** none new — behavior fix.

- [ ] **Step 1: Failing test** reproducing the bug in one session, mirroring how seed hits it: import a quiz doc, then import the SAME doc again, then in the same session call `build_activity_snapshot` (or `publish_activity`) for the quiz's activity and assert the snapshot still contains ALL the questions (today the stale in-memory `quiz.questions` yields zero/missing questions).
- [ ] **Step 2: Verify failure** (this is the bug's fingerprint — if it unexpectedly passes, STOP and report; do not weaken the test to force a failure).
- [ ] **Step 3: Fix** — in the reimport branch, after `quiz.questions.clear()`, append the new `QuizQuestion` rows VIA the relationship (`quiz.questions.append(...)`) instead of bare `db.add(QuizQuestion(quiz_id=...))` constructors, so the ORM collection matches the DB (or, if the surrounding code structure makes that awkward, `await db.refresh(quiz, ["questions"])` after the inserts — pick whichever reads cleaner against the actual code, explain the choice in the report).
- [ ] **Step 4: Full api suite green.**
- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "fix(api): keep quiz.questions in sync on reimport (closes #42)"
```

---

### Task 8: Issue #43 — pin served media Content-Type

**Files:**
- Modify: `apps/api/app/media/storage.py` (`MediaStorage` Protocol + `MinioStorage.presigned_get`), `apps/api/app/media/router.py` (serve route call site)
- Test: `apps/api/tests/test_media.py` (extend the FakeStorage + serve tests)

**Interfaces:**
- Produces: `presigned_get(key: str, mime: str) -> str` (Protocol change) — MinioStorage passes `response_headers={"response-content-type": mime}` to `presigned_get_object`; the serve route passes `asset.mime`. The FakeStorage in tests records the mime it was called with.

- [ ] **Step 1: Failing test** — update FakeStorage's `presigned_get` to `(key, mime)` recording both; serve test asserts the redirect was generated with the asset's stored mime (e.g. `image/png`), and a second asset with a different mime gets its own.
- [ ] **Step 2: Verify failure** (signature mismatch).
- [ ] **Step 3: Implement** Protocol + MinioStorage (`response_headers` param per the minio SDK) + route call. Comment: the mime comes from the DB-validated presign value, so a mismatched direct-to-storage PUT can never control the served Content-Type.
- [ ] **Step 4: Full api suite green** (mypy will catch any missed call site).
- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "fix(api): serve media with the DB-validated content type (closes #43)"
```

---

### Task 9: Issue #44 — shared author error helpers

**Files:**
- Create: `apps/web/src/lib/author/problem.ts`
- Modify: every author-side file carrying a private `problemDetail`/`errorTitle` copy — grep BOTH names under `apps/web/src/lib/author` and `apps/web/src/routes/(app)/author` and update every hit. Do NOT touch `apps/web/src/lib/activity/attempts.ts` (player-side, different context, out of #44's scope).
- Test: none new — this is a pure refactor; the existing component specs and route behavior are the guard (state that explicitly in the commit).

- [ ] **Step 1: Read all copies**, confirm they're identical (or reconcile trivial drift toward the most complete version), create `problem.ts` exporting both functions with a house-style header.
- [ ] **Step 2: Update every call site** to import from `$lib/author/problem`; delete the local copies.
- [ ] **Step 3: Web gates green** (`lint`, `check`, `test` — behavior unchanged, existing specs pass).
- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "refactor(web): extract shared author problem-detail helpers (closes #44)"
```

---

### Task 10: Docs, version 0.5.0, release checks

**Files:**
- Modify: `apps/api/app/main.py` (`version="0.5.0"`; check for tests pinning the string), `docs/03-architecture.md` (the calculator paragraph: list the shipped calc_types and the photon-complete MU factor chain — a focused edit), `README.md` (status line → v0.5.0 / M5, one sentence).
- Test: existing suites.

- [ ] **Step 1: Edits** (version, docs paragraph, README).
- [ ] **Step 2: BOTH projects' full gates green, sequenced** (api full suite; web lint/check/test).
- [ ] **Step 3: Commit**

```bash
git add apps/api docs README.md
git commit -m "feat: v0.5.0 - calculator suite docs and version bump"
```

---

## Execution notes (for the controller)

- Order: 1→2→3→4 (web chain), 5 (api+web, after 2), 6 (after 5), 7/8 independent api tasks, 9 independent web task, 10 last. One writer at a time as always.
- Task 6's transcription step READS the legacy tree (read-only) — remind implementers the legacy checkout is never modified.
- No `make client` anywhere (no schema-shape changes) — if any task believes it changed a response/request shape, that's a plan conflict to surface, not silently regen.
- Final whole-branch review lenses: formula fidelity to the audit (spot-check against `.superpowers/sdd/3c-calculator-audit.md`), the non-finite guard on every new output, seed idempotency, and that #42's test genuinely reproduced the bug before the fix.
