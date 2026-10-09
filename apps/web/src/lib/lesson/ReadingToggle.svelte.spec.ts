/**
 * What this file does: browser tests for the "Light page" toggle.
 * Used here and why: vitest-browser-svelte renders it in real Chromium; assertions go through the
 * button's role/name and the real `<html data-reading>` and `localStorage`.
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md (reading panel).
 * Depends on: `vitest/browser`, `vitest-browser-svelte`, `./ReadingToggle.svelte`.
 * Used by: `pnpm --filter web test` (client project).
 */
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ReadingToggle from './ReadingToggle.svelte';

afterEach(() => {
	vi.restoreAllMocks();
	delete document.documentElement.dataset.reading;
	localStorage.removeItem('rttlearn:reading');
});

describe('ReadingToggle', () => {
	it('flips aria-pressed, the html attribute and storage', async () => {
		await render(ReadingToggle);
		const button = page.getByRole('button', { name: 'Light page' });
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');

		await button.click();
		await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		expect(document.documentElement.dataset.reading).toBe('light');
		expect(localStorage.getItem('rttlearn:reading')).toBe('light');

		await button.click();
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');
		expect(document.documentElement.dataset.reading).toBe('dark');
		expect(localStorage.getItem('rttlearn:reading')).toBe('dark');
	});

	it('starts pressed when the page already carries data-reading=light', async () => {
		document.documentElement.dataset.reading = 'light';
		await render(ReadingToggle);
		await expect
			.element(page.getByRole('button', { name: 'Light page' }))
			.toHaveAttribute('aria-pressed', 'true');
	});

	it('still works for the session when storage throws', async () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		await render(ReadingToggle);
		const button = page.getByRole('button', { name: 'Light page' });
		await button.click();
		await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		expect(document.documentElement.dataset.reading).toBe('light');
	});
});
