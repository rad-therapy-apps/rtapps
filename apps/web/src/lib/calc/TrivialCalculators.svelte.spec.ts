/**
 * What this file tests: the four pure-formula calculator components' teaching-output panels —
 * one exact-input happy-path case per component (values visible in the rendered output) plus one
 * guard-message case (InverseSquareCalculator with a zero d2), the case list from plan 3c's Task 2
 * brief.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`), same idiom as `MuCalculator.svelte.spec.ts` — every input is
 * `$state`/`$derived`, so there is no `post` fake to inject and no attempt lifecycle to wait on.
 * Each component renders a single `.calc` root, so assertions check that root's text content for
 * the expected substrings rather than per-field test ids.
 * How it fits the project: TDD step 1 of plan 3c Task 2; the values below are hand-computed the
 * same way `formulas.test.ts`'s fixtures are (Task 1).
 * Depends on: `./InverseSquareCalculator.svelte`, `./ExtendedSsdCalculator.svelte`,
 * `./GapCalculator.svelte`, `./MagnificationCalculator.svelte`, `./SiConverter.svelte`,
 * vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import InverseSquareCalculator from './InverseSquareCalculator.svelte';
import ExtendedSsdCalculator from './ExtendedSsdCalculator.svelte';
import GapCalculator from './GapCalculator.svelte';
import MagnificationCalculator from './MagnificationCalculator.svelte';
import SiConverter from './SiConverter.svelte';

async function fillByLabel(label: string, value: string) {
	await userEvent.fill(page.getByLabelText(label).element(), value);
}

async function selectByLabel(label: string, value: string) {
	await userEvent.selectOptions(page.getByLabelText(label).element(), value);
}

// Assertions read `container.textContent` (rather than a `.calc`/`.calc-result` locator) because
// Svelte splits `{expr} literal` markup into sibling text nodes, and vitest's `getByText` matches
// a single TextNode's `nodeValue` — `container.textContent` concatenates the whole subtree
// regardless of how it was split, and `expect.poll` retries it until the `$derived` update lands.
describe('InverseSquareCalculator', () => {
	// Scenario: I1 fixed at 100, d1=100, d2=200 (audit §6): I2 = 100*(100/200)^2 = 25.
	// Invariant: the rendered result shows "25.0".
	it('computes intensity at a distance', async () => {
		const { container } = await render(InverseSquareCalculator, { tables: {} });

		await fillByLabel('Distance 1, d1 (cm)', '100');
		// Test reactivity: fill a different d2 value first, verify output changes
		await fillByLabel('Distance 2, d2 (cm)', '100');
		// d2=100: I2 = 100*(100/100)^2 = 100.0
		await expect.poll(() => container.textContent).toContain('100.0');

		// Now fill the target value and verify the final result
		await fillByLabel('Distance 2, d2 (cm)', '200');
		await expect.poll(() => container.textContent).toContain('25.0');
	});

	// Scenario: d2=0 (invalid distance).
	// Invariant: a guard message renders instead of a result.
	it('shows a guard message for a zero distance', async () => {
		const { container } = await render(InverseSquareCalculator, { tables: {} });

		await fillByLabel('Distance 1, d1 (cm)', '100');
		await fillByLabel('Distance 2, d2 (cm)', '0');

		await expect.poll(() => container.querySelector('.calc-message')).not.toBeNull();
	});
});

describe('ExtendedSsdCalculator', () => {
	// Scenario: ssd0=100, ssdE=150, depth=10 (audit §4): isf = (110/160)^2 = 0.47265625,
	// muMult = 1/isf = 2.115702... .
	// Invariant: the rendered result shows the ISF ("0.4727") and the MU multiplier ("2.1157"),
	// both formatted as factors (.toFixed(4)).
	it('computes the extended-SSD correction', async () => {
		const { container } = await render(ExtendedSsdCalculator, { tables: {} });

		await fillByLabel('Reference SSD, SSD0 (cm)', '100');
		await fillByLabel('Extended SSD, SSDe (cm)', '150');
		// Test reactivity: fill a different depth value first, verify output changes
		await fillByLabel('Depth (cm)', '5');
		// depth=5: isf = ((100+5)/(150+5))^2 = (105/155)^2 = 0.45889...
		// muMult = 1/0.45889 = 2.17909...
		await expect.poll(() => container.textContent).toContain('0.4589');
		await expect.poll(() => container.textContent).toContain('2.1791');

		// Now fill the target value and verify the final result
		await fillByLabel('Depth (cm)', '10');
		await expect.poll(() => container.textContent).toContain('0.4727');
		await expect.poll(() => container.textContent).toContain('2.1157');
	});
});

describe('GapCalculator', () => {
	// Scenario: L1=10, L2=20, depth=5, ssd=100 (audit §5): gap = 0.5*10*0.05 + 0.5*20*0.05 = 0.75.
	// Invariant: the rendered result shows "0.75 cm".
	it('computes the skin gap', async () => {
		const { container } = await render(GapCalculator, { tables: {} });

		await fillByLabel('Field length 1 (cm)', '10');
		await fillByLabel('Field length 2 (cm)', '20');
		// Test reactivity: fill a different depth value first, verify output changes
		await fillByLabel('Match depth (cm)', '10');
		// depth=10, ssd=100: gap = 0.5*10*(10/100) + 0.5*20*(10/100) = 0.5 + 1.0 = 1.50
		await fillByLabel('SSD (cm)', '100');
		await expect.poll(() => container.textContent).toContain('1.50 cm');

		// Now fill the target value and verify the final result
		await fillByLabel('Match depth (cm)', '5');
		await expect.poll(() => container.textContent).toContain('0.75 cm');
	});
});

describe('MagnificationCalculator', () => {
	// Scenario: sid=140, sod=100, obj=4 (audit §7): m = 1.4, imgSize = 5.6.
	// Invariant: the rendered result shows the magnification ("1.40") and image size ("5.60"),
	// both formatted as ratios/lengths (.toFixed(2)).
	it('computes magnification and image size', async () => {
		const { container } = await render(MagnificationCalculator, { tables: {} });

		await fillByLabel('Source-to-image distance, SID (cm)', '140');
		// Test reactivity: fill a different SOD value first, verify output changes
		await fillByLabel('Source-to-object distance, SOD (cm)', '140');
		// sod=140: m = 140/140 = 1.0, imgSize = 4*1.0 = 4.00
		await fillByLabel('Object size (cm)', '4');
		await expect.poll(() => container.textContent).toContain('1.00');
		await expect.poll(() => container.textContent).toContain('4.00');

		// Now fill the target value and verify the final result
		await fillByLabel('Source-to-object distance, SOD (cm)', '100');
		await expect.poll(() => container.textContent).toContain('1.40');
		await expect.poll(() => container.textContent).toContain('5.60');
	});
});

describe('SiConverter', () => {
	// Scenario: absorbed dose, 250 cGy -> Gy (audit §11): siConvert(250, 1e-2, 1) = 2.5, rendered
	// in the legacy page's fixed 4-decimal format ("2.5000").
	// Invariant: the rendered result contains "2.5".
	it('converts 250 cGy to Gy', async () => {
		const { container } = await render(SiConverter, { tables: {} });

		await selectByLabel('From unit', 'centigray (cGy)');
		await selectByLabel('To unit', 'Gray (Gy)');
		await fillByLabel('Value', '250');

		await expect.poll(() => container.textContent).toContain('2.5');
	});
});
