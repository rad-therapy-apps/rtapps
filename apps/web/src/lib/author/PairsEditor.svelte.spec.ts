/**
 * What this file tests: `PairsEditor.svelte`'s inline duplicate-term/definition warning (mirroring
 * the API's 422 rule -- `_MatchingContentMixin._unique_pairs`) and the row order it emits via
 * `onchange` for move-up/move-down/add/remove.
 * Used here and why: vitest `client` browser project (real Chromium via
 * `@vitest/browser-playwright`), same as `LessonEditor.svelte.spec.ts`. `PairsEditor` is a fully
 * controlled component (`rows`/`onchange`, no state of its own), so the duplicate-warning test
 * uses `rerender` to simulate the caller applying an `onchange` result back as new props -- the
 * same round-trip `PairsEditor`'s real callers (`decks/[id]`, `matching/[id]`) do.
 * How it fits the project: the component half of Task 16's `PairsEditor` test plan.
 * Depends on: `./PairsEditor.svelte`, vitest-browser-svelte.
 * Used by: `pnpm --filter web test` (vitest `client` project, `pr.yml` job `web`).
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import PairsEditor from './PairsEditor.svelte';

type Pair = { term: string; definition: string };

function fixture(): Pair[] {
	return [
		{ term: 'Gray', definition: 'SI unit of absorbed dose' },
		{ term: 'Sievert', definition: 'SI unit of equivalent dose' }
	];
}

function rows(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>('.pair-row')];
}
function rowInputs(row: HTMLElement): HTMLInputElement[] {
	return [...row.querySelectorAll<HTMLInputElement>('input')];
}
function rowControls(row: HTMLElement): HTMLButtonElement[] {
	return [...row.querySelectorAll<HTMLButtonElement>('.pair-controls button')];
}

describe('PairsEditor', () => {
	// Scenario: two rows share the same term.
	// Invariant: a duplicate-terms warning names the clashing value; fixing the clash (re-rendered
	// with the caller's updated rows, the same round-trip a real `onchange` consumer does) clears
	// it. No false positive on the (distinct) definitions.
	it('warns on a duplicate term and clears once fixed', async () => {
		const onchange = vi.fn();
		const duplicateRows: Pair[] = [
			{ term: 'Gray', definition: 'SI unit of absorbed dose' },
			{ term: 'Gray', definition: 'SI unit of equivalent dose' }
		];
		const { container, rerender } = await render(PairsEditor, { rows: duplicateRows, onchange });

		const termBanner = [...container.querySelectorAll('[role=alert]')].find((el) =>
			el.textContent?.includes('Duplicate terms')
		);
		expect(termBanner?.textContent).toContain('Gray');
		expect(
			[...container.querySelectorAll('[role=alert]')].some((el) =>
				el.textContent?.includes('Duplicate definitions')
			)
		).toBe(false);

		await rerender({ rows: fixture(), onchange });

		expect(
			[...container.querySelectorAll('[role=alert]')].some((el) =>
				el.textContent?.includes('Duplicate terms')
			)
		).toBe(false);
	});

	// Scenario: move the first row down via its own control.
	// Invariant: `onchange` receives the rows in the new order.
	it('emits the swapped row order on move down', async () => {
		const onchange = vi.fn();
		const { container } = await render(PairsEditor, { rows: fixture(), onchange });

		await userEvent.click(rowControls(rows(container)[0])[1]); // "Move down"

		expect(onchange).toHaveBeenCalledTimes(1);
		expect(onchange.mock.calls[0][0]).toEqual([
			{ term: 'Sievert', definition: 'SI unit of equivalent dose' },
			{ term: 'Gray', definition: 'SI unit of absorbed dose' }
		]);
	});

	// Scenario: edit a row's term/definition text.
	// Invariant: `onchange` receives the full row list with only that row's fields changed.
	it('emits an edited term/definition in place', async () => {
		const onchange = vi.fn();
		const { container } = await render(PairsEditor, { rows: fixture(), onchange });

		const [termInput] = rowInputs(rows(container)[0]);
		await userEvent.fill(termInput, 'Grey (edited)');

		expect(onchange).toHaveBeenCalledTimes(1);
		expect(onchange.mock.calls[0][0]).toEqual([
			{ term: 'Grey (edited)', definition: 'SI unit of absorbed dose' },
			{ term: 'Sievert', definition: 'SI unit of equivalent dose' }
		]);
	});

	// Scenario: `minRows` floor (matching's `MatchingPutIn.pairs` requires at least 2).
	// Invariant: Remove disables itself at exactly `minRows` rows, and `onchange` is never called
	// for a click on a disabled control.
	it("disables Remove at minRows and doesn't emit past it", async () => {
		const onchange = vi.fn();
		const { container } = await render(PairsEditor, {
			rows: fixture(),
			onchange,
			minRows: 2
		});

		for (const row of rows(container)) {
			expect(rowControls(row)[2]).toBeDisabled(); // "Remove"
		}
		expect(onchange).not.toHaveBeenCalled();
	});
});
