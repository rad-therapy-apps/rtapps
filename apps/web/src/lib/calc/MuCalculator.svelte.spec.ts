/**
 * What this file tests: `MuCalculator.svelte`'s teaching-output panel — an exact-grid-point PDD
 * lookup producing the expected MU, an out-of-range depth producing a range message computed
 * from the grid's own bounds, and the SAD/TMR radio switching which table (`tables`' own key,
 * not a fixed slot) the lookup reads from.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`), same idiom as `QuizPlayer.svelte.spec.ts` — everything here is
 * `$derived` from plain inputs, so there is no `post` fake to inject and no attempt lifecycle to
 * wait on, unlike the four attemptable players.
 * How it fits the project: TDD step 3 of plan 3b Task 17 (component half); the values below are
 * hand-computed the same way `interpolate.test.ts`'s fixture is.
 * Depends on: `./MuCalculator.svelte`, `./interpolate` (`Grid`), vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import MuCalculator from './MuCalculator.svelte';
import type { Grid } from './interpolate';

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

async function setInputs(dose: string, depth: string, fieldSize: string) {
	await userEvent.fill(page.getByLabelText('Prescribed dose (cGy)').element(), dose);
	await userEvent.fill(page.getByLabelText('Depth (cm)').element(), depth);
	await userEvent.fill(page.getByLabelText('Field size (cm)').element(), fieldSize);
}

describe('MuCalculator', () => {
	// Scenario: SSD/PDD (the default technique) at an exact grid point (depth 5, field size 5).
	// Invariant: the looked-up PDD (80.0000), the SSD formula line, and the resulting MU
	// (200 / (80/100) = 250.0) all render.
	it('computes MU at an exact grid point', async () => {
		await render(MuCalculator, { tables: { 'pdd-6mv': { title: 'PDD 6MV', grid: PDD_GRID } } });

		await setInputs('200', '5', '5');

		await expect.element(page.getByTestId('mu-lookup')).toHaveTextContent('PDD: 80.0000');
		await expect.element(page.getByTestId('mu-formula')).toHaveTextContent('MU = dose / (PDD/100)');
		await expect.element(page.getByTestId('mu-result')).toHaveTextContent('MU = 250.0');
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

	// Scenario: switching technique to SAD (TMR) at an exact grid point (depth 5, field size 10).
	// Invariant: the TMR table (not the PDD one) is read, and the TMR formula (no /100) is used:
	// 200 / 0.95 = 210.5.
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
		await expect.element(page.getByTestId('mu-formula')).toHaveTextContent('MU = dose / TMR');
		await expect.element(page.getByTestId('mu-result')).toHaveTextContent('MU = 210.5');
	});
});
