/**
 * What this file tests: `MuCalculator.svelte`'s teaching-output panel — an exact-grid-point PDD
 * lookup producing the expected MU, an out-of-range depth producing a range message computed
 * from the grid's own bounds, the SAD/TMR radio switching which table (`tables`' own key, not a
 * fixed slot) the lookup reads from, and (plan 3c Task 4) the photon-complete factor chain —
 * collimator/phantom scatter (Sc/Sp), wedge factor (WF), tray factor (TF), calibration (K), the
 * Mayneord correction, and the SSD inverse-square factor (ISF).
 * Used here and why: vitest `client` project (real Chromium via `@vitest/browser-playwright`).
 * The new cases hand-compute their expected MU by calling the SAME pure helpers the component
 * uses (`interpolate2d`, `mayneordF`, `ssdIsf`) against the same fixture grids, rather than
 * hand-typing decimals — those helpers' arithmetic is already covered by `interpolate.test.ts`
 * and `formulas.test.ts`; this file only proves the component wires them together correctly.
 * How it fits the project: TDD step 1 of plan 3c Task 4. Two pre-existing exact-value
 * expectations changed here (see the comments at each): the SSD/PDD-only case now also carries
 * the ISF term (ISF ≠ 1 away from the reference SSD, so the old bare "dose / (PDD/100)" value is
 * no longer correct), and both SSD- and SAD-mode formula-line strings changed text to show the
 * full factor chain (K · ... · TF[· ISF]) even though the SAD-mode *value* is unaffected (ISF is
 * fixed at 1 in SAD/TMR mode and no other new factor tables are configured in that pre-existing
 * case).
 * Depends on: `./MuCalculator.svelte`, `./interpolate` (`interpolate2d`, `Grid`), `./formulas`
 * (`mayneordF`, `ssdIsf`), vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import MuCalculator from './MuCalculator.svelte';
import { interpolate2d, type Grid } from './interpolate';
import { mayneordF, ssdIsf } from './formulas';

// A tiny 2x2 PDD grid: depths 5/10, field sizes 5/10, values as percentages (e.g. 80 -> 80%).
const PDD_GRID: Grid = {
	row_label: 'Depth (cm)',
	col_label: 'Field size (cm)',
	cols: [5, 10],
	rows: [
		{ key: 5, values: [80, 85] },
		{ key: 10, values: [70, 75] }
	]
};

// A distinct 2x2 TMR grid: values are ratios (e.g. 0.9 -> TMR of 0.9), not percentages.
const TMR_GRID: Grid = {
	row_label: 'Depth (cm)',
	col_label: 'Field size (cm)',
	cols: [5, 10],
	rows: [
		{ key: 5, values: [0.9, 0.95] },
		{ key: 10, values: [0.8, 0.85] }
	]
};

// Single-row 1D tables (role by key substring): collimator scatter, phantom scatter, wedge
// factor vs angle. Read via `interpolate2d(grid, grid.rows[0].key, x)` — the row key (0 here) is
// arbitrary since it's always an exact hit on itself.
const SC_GRID: Grid = {
	row_label: 'n/a',
	col_label: 'Field size (cm)',
	cols: [5, 10],
	rows: [{ key: 0, values: [0.98, 1.02] }]
};
const SP_GRID: Grid = {
	row_label: 'n/a',
	col_label: 'Field size (cm)',
	cols: [5, 10],
	rows: [{ key: 0, values: [0.99, 1.01] }]
};
const WEDGE_GRID: Grid = {
	row_label: 'n/a',
	col_label: 'Wedge angle (deg)',
	cols: [0, 30, 45, 60],
	rows: [{ key: 0, values: [1.0, 0.71, 0.6, 0.5] }]
};

async function setInputs(dose: string, depth: string, fieldSize: string) {
	await userEvent.fill(page.getByLabelText('Prescribed dose (cGy)').element(), dose);
	await userEvent.fill(page.getByLabelText('Depth (cm)').element(), depth);
	await userEvent.fill(page.getByLabelText('Field size (cm)').element(), fieldSize);
}

describe('MuCalculator', () => {
	// Scenario: SSD/PDD (the default technique) at an exact grid point (depth 5, field size 5),
	// with no sc/sp/wedge tables configured (they default to 1.0 "not configured") and SSD/dmax
	// left at their defaults (100 / 1.5).
	// Invariant: the looked-up PDD (80.0000), the full-chain SSD formula line, and the resulting
	// MU all render; the not-configured factors show 1.0000.
	// CHANGED from the pre-Task-4 spec: MU is no longer the bare 250.0 — the SSD chain now always
	// multiplies by ISF (ssdIsf(100, 1.5, 5)), which is not 1 away from... actually is not exactly
	// 1 even at SSD 100 once depth != dmax, so the expected value is computed here via `ssdIsf`
	// rather than hand-typed.
	it('computes MU at an exact grid point, times ISF, with unconfigured factors at 1.0', async () => {
		await render(MuCalculator, { tables: { 'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID } } });

		await setInputs('200', '5', '5');

		const isf = ssdIsf(100, 1.5, 5)!;
		const expectedMu = 200 / ((80 / 100) * isf);

		await expect.element(page.getByTestId('mu-lookup')).toHaveTextContent('PDD: 80.0000');
		await expect
			.element(page.getByTestId('mu-factor-sc'))
			.toHaveTextContent('1.0000 (not configured)');
		await expect
			.element(page.getByTestId('mu-factor-sp'))
			.toHaveTextContent('1.0000 (not configured)');
		await expect
			.element(page.getByTestId('mu-factor-wedge'))
			.toHaveTextContent('1.0000 (no wedge)');
		await expect
			.element(page.getByTestId('mu-formula'))
			.toHaveTextContent('MU = dose / (K · (PDD/100) · Sc · Sp · WF · TF · ISF)');
		await expect
			.element(page.getByTestId('mu-result'))
			.toHaveTextContent(`MU = ${expectedMu.toFixed(1)}`);
	});

	// Scenario: a depth below the grid's row range (rows are keyed 5 and 10; depth 1 is below 5).
	// Invariant: the range message names the grid's own bounds, never NaN.
	it('shows a range message for an out-of-range depth', async () => {
		await render(MuCalculator, { tables: { 'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID } } });

		await setInputs('200', '1', '5');

		await expect
			.element(page.getByTestId('mu-out-of-range'))
			.toHaveTextContent("outside the table's range (depth 5–10 cm, field size 5–10 cm)");
	});

	// Scenario: switching technique to SAD (TMR) at an exact grid point (depth 5, field size 10),
	// no sc/sp/wedge tables configured.
	// Invariant: the TMR table (not the PDD one) is read; TMR-mode ISF is fixed at 1 so the value
	// is unaffected (200 / 0.95 = 210.5), but the formula line now shows the full chain text.
	it('reads the tmr table once SAD (TMR) is selected', async () => {
		await render(MuCalculator, {
			tables: {
				'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID },
				'tmr-6mv': { title: 'TMR 6MV', grid: TMR_GRID }
			}
		});

		await page.getByRole('radio', { name: 'SAD (TMR)' }).click();
		await setInputs('200', '5', '10');

		await expect.element(page.getByTestId('mu-lookup')).toHaveTextContent('TMR: 0.9500');
		await expect
			.element(page.getByTestId('mu-formula'))
			.toHaveTextContent('MU = dose / (K · TMR · Sc · Sp · WF · TF)');
		await expect.element(page.getByTestId('mu-result')).toHaveTextContent('MU = 210.5');
	});

	// Scenario: grid cell is exactly 0 at an exact grid point (depth 5, field size 5).
	// Invariant: MU derivation produces Infinity (dose / 0), but the UI shows a clear message
	// ("MU is undefined for a zero table value") and never renders "Infinity" — unaffected by the
	// ISF/scatter-factor chain since a zero PDD zeroes the denominator regardless.
	it('shows undefined message when table lookup is zero', async () => {
		const ZERO_PDD_GRID: Grid = {
			row_label: 'Depth (cm)',
			col_label: 'Field size (cm)',
			cols: [5, 10],
			rows: [
				{ key: 5, values: [0, 85] },
				{ key: 10, values: [70, 75] }
			]
		};

		await render(MuCalculator, {
			tables: { 'pdd-6mv': { title: 'PDD 6MV', grid: ZERO_PDD_GRID } }
		});

		await setInputs('200', '5', '5');

		await expect
			.element(page.getByTestId('mu-undefined'))
			.toHaveTextContent('MU is undefined for a zero table value');
		await expect.element(page.getByTestId('mu-output')).not.toHaveTextContent('Infinity');
	});

	// Scenario (plan 3c Task 4): full photon chain in SSD mode — pdd + sc + sp + wedge tables all
	// present, tray factor entered, wedge angle at an exact grid point, Mayneord off, SSD left at
	// its default (100).
	// Invariant: MU equals the hand-assembled chain dose / (K · (PDD/100) · Sc · Sp · WF · TF ·
	// ISF), computed here from the same fixtures via `interpolate2d`/`ssdIsf`; the teaching output
	// names which table filled each role ("table: <key>"), and ISF/Mayneord labels show "(formula)"
	// not "(input)" since they are computed via formulas.
	it('assembles the full SSD factor chain (Sc, Sp, WF, TF, ISF)', async () => {
		await render(MuCalculator, {
			tables: {
				'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID },
				'sc-6mv': { title: 'Sc 6MV', grid: SC_GRID },
				'sp-6mv': { title: 'Sp 6MV', grid: SP_GRID },
				'wedge-45': { title: 'Wedge 45', grid: WEDGE_GRID }
			}
		});

		await setInputs('200', '10', '10');
		await userEvent.fill(page.getByLabelText('Tray factor').element(), '1.05');
		await userEvent.fill(page.getByLabelText('Wedge angle (deg)').element(), '45');

		const pdd = interpolate2d(PDD_GRID, 10, 10)!;
		const sc = interpolate2d(SC_GRID, SC_GRID.rows[0].key, 10)!;
		const sp = interpolate2d(SP_GRID, SP_GRID.rows[0].key, 10)!;
		const wf = interpolate2d(WEDGE_GRID, WEDGE_GRID.rows[0].key, 45)!;
		const tf = 1.05;
		const isf = ssdIsf(100, 1.5, 10)!;
		const expectedMu = 200 / (1 * (pdd / 100) * sc * sp * wf * tf * isf);

		await expect
			.element(page.getByTestId('mu-factor-sc'))
			.toHaveTextContent(`${sc.toFixed(4)} (table: sc-6mv)`);
		await expect
			.element(page.getByTestId('mu-factor-sp'))
			.toHaveTextContent(`${sp.toFixed(4)} (table: sp-6mv)`);
		await expect
			.element(page.getByTestId('mu-factor-wedge'))
			.toHaveTextContent(`${wf.toFixed(4)} (table: wedge-45)`);
		await expect.element(page.getByTestId('mu-factor-isf')).toHaveTextContent(`(formula)`);
		await expect
			.element(page.getByTestId('mu-result'))
			.toHaveTextContent(`MU = ${expectedMu.toFixed(1)}`);
	});

	// Scenario (plan 3c Task 4): Mayneord correction — SSD 120 with the toggle on multiplies PDD
	// by `mayneordF(depth, dmax, 120)` before the ISF (which itself uses SSD 120) is applied.
	// Invariant: MU equals dose / (K · (PDD·mayneordF/100) · ISF) with sc/sp/wedge unconfigured
	// (1.0), computed here via the same `mayneordF`/`ssdIsf` helpers the component uses.
	it('applies the Mayneord correction when the toggle is on', async () => {
		await render(MuCalculator, { tables: { 'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID } } });

		await setInputs('200', '10', '10');
		await userEvent.fill(page.getByLabelText('SSD (cm)').element(), '120');
		await userEvent.click(page.getByLabelText('Mayneord correction').element());

		const pdd = interpolate2d(PDD_GRID, 10, 10)!;
		const dmax = 1.5;
		const mFactor = mayneordF(10, dmax, 120)!;
		const isf = ssdIsf(120, dmax, 10)!;
		const expectedMu = 200 / (1 * ((pdd * mFactor) / 100) * isf);

		await expect
			.element(page.getByTestId('mu-factor-mayneord'))
			.toHaveTextContent(mFactor.toFixed(4));
		await expect
			.element(page.getByTestId('mu-result'))
			.toHaveTextContent(`MU = ${expectedMu.toFixed(1)}`);
	});

	// Scenario (plan 3c Task 4): full photon chain in SAD/TMR mode — pdd + tmr + sc + sp + wedge
	// tables all present (pdd/tmr matched first and excluded from the sc/sp/wedge search), tray
	// factor entered, wedge angle at an exact grid point. ISF and Mayneord do not apply in SAD
	// mode (fixed at 1).
	// Invariant: MU equals dose / (K · TMR · Sc · Sp · WF · TF), computed here from the same
	// fixtures.
	it('assembles the full SAD/TMR factor chain (Sc, Sp, WF, TF), no ISF', async () => {
		await render(MuCalculator, {
			tables: {
				'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID },
				'tmr-6mv': { title: 'TMR 6MV', grid: TMR_GRID },
				'sc-6mv': { title: 'Sc 6MV', grid: SC_GRID },
				'sp-6mv': { title: 'Sp 6MV', grid: SP_GRID },
				'wedge-45': { title: 'Wedge 45', grid: WEDGE_GRID }
			}
		});

		await page.getByRole('radio', { name: 'SAD (TMR)' }).click();
		await setInputs('200', '5', '10');
		await userEvent.fill(page.getByLabelText('Tray factor').element(), '1.05');
		await userEvent.fill(page.getByLabelText('Wedge angle (deg)').element(), '45');

		const tmr = interpolate2d(TMR_GRID, 5, 10)!;
		const sc = interpolate2d(SC_GRID, SC_GRID.rows[0].key, 10)!;
		const sp = interpolate2d(SP_GRID, SP_GRID.rows[0].key, 10)!;
		const wf = interpolate2d(WEDGE_GRID, WEDGE_GRID.rows[0].key, 45)!;
		const tf = 1.05;
		const expectedMu = 200 / (1 * tmr * sc * sp * wf * tf);

		await expect
			.element(page.getByTestId('mu-result'))
			.toHaveTextContent(`MU = ${expectedMu.toFixed(1)}`);
	});

	// Scenario (FIX 2 — wedge label at angle 0): wedge table is configured and present, but wedge
	// angle is set to 0. The wedge value correctly becomes 1.0, and the source label must reflect
	// this by showing "no wedge" rather than the table key.
	// Invariant: the wedge line shows 1.0000 and (no wedge), and the table key does NOT appear on
	// that line.
	it('shows "no wedge" label when wedge angle is 0, even with a wedge table configured', async () => {
		await render(MuCalculator, {
			tables: {
				'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID },
				'wedge-45': { title: 'Wedge 45', grid: WEDGE_GRID }
			}
		});

		await setInputs('200', '10', '10');
		await userEvent.fill(page.getByLabelText('Wedge angle (deg)').element(), '0');

		const pdd = interpolate2d(PDD_GRID, 10, 10)!;
		const isf = ssdIsf(100, 1.5, 10)!;
		const expectedMu = 200 / (1 * (pdd / 100) * isf);

		await expect
			.element(page.getByTestId('mu-factor-wedge'))
			.toHaveTextContent('1.0000 (no wedge)');
		await expect.element(page.getByTestId('mu-factor-wedge')).not.toHaveTextContent('wedge-45');
		await expect
			.element(page.getByTestId('mu-result'))
			.toHaveTextContent(`MU = ${expectedMu.toFixed(1)}`);
	});

	// Scenario (FIX 3 — progressive role exclusion): a single table key "sc_wedge_test" contains
	// both "sc" and "wedge" substrings. The role-assignment algorithm searches progressively,
	// removing each matched entry from the pool before the next role's search, so this key must
	// fill ONLY the sc role (first in search order) and wedge shows "(not configured)". Angle is 45
	// to avoid the "no wedge" label that appears at angle 0.
	// Invariant: Sc line shows the value and (table: sc_wedge_test); Sp and WF both show 1.0000
	// (not configured); no table key appears on the WF line.
	it('assigns a multi-substring table key to the first matching role only (progressive exclusion)', async () => {
		await render(MuCalculator, {
			tables: {
				'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID },
				sc_wedge_test: { title: 'SC Wedge Test', grid: SC_GRID }
			}
		});

		await setInputs('200', '10', '10');
		await userEvent.fill(page.getByLabelText('Wedge angle (deg)').element(), '45');

		const sc = interpolate2d(SC_GRID, SC_GRID.rows[0].key, 10)!;
		const pdd = interpolate2d(PDD_GRID, 10, 10)!;
		const isf = ssdIsf(100, 1.5, 10)!;
		const expectedMu = 200 / (1 * (pdd / 100) * sc * isf);

		await expect
			.element(page.getByTestId('mu-factor-sc'))
			.toHaveTextContent(`${sc.toFixed(4)} (table: sc_wedge_test)`);
		await expect
			.element(page.getByTestId('mu-factor-sp'))
			.toHaveTextContent('1.0000 (not configured)');
		await expect
			.element(page.getByTestId('mu-factor-wedge'))
			.toHaveTextContent('1.0000 (not configured)');
		await expect
			.element(page.getByTestId('mu-factor-wedge'))
			.not.toHaveTextContent('sc_wedge_test');
		await expect
			.element(page.getByTestId('mu-result'))
			.toHaveTextContent(`MU = ${expectedMu.toFixed(1)}`);
	});

	// Scenario (minor/cheap case): wedge lookup is requested at an angle outside the wedge table's
	// range (e.g., angle 90 on a 0–60 grid). The interpolation returns null (out of range), and the
	// UI shows a factor-out-of-range message, never "Infinity" or "NaN".
	// Invariant: the factor-out-of-range message appears; the output does not contain "Infinity"
	// or "NaN".
	it('handles wedge lookup out of range without rendering Infinity/NaN', async () => {
		await render(MuCalculator, {
			tables: {
				'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID },
				'wedge-60': { title: 'Wedge 60', grid: WEDGE_GRID }
			}
		});

		await setInputs('200', '10', '10');
		await userEvent.fill(page.getByLabelText('Wedge angle (deg)').element(), '90');

		await expect
			.element(page.getByTestId('mu-factor-out-of-range'))
			.toHaveTextContent(
				'one or more scatter, wedge, or correction factors are outside their table'
			);
		await expect.element(page.getByTestId('mu-output')).not.toHaveTextContent('Infinity');
		await expect.element(page.getByTestId('mu-output')).not.toHaveTextContent('NaN');
	});
});
