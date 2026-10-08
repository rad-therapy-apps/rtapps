/**
 * What this file does: browser tests for AppShell — role-gated links, the active link, and the
 * phone drawer (open/close, Escape, focus return) at a 360px viewport.
 * Used here and why: real Chromium via vitest-browser-svelte so the media-query layout is
 * exercised; `page.viewport` switches between phone and desktop widths.
 * How it fits the project: NFR-17/NFR-18, docs/specs/2026-10-01-ui-restyle-design.md (App shell).
 * Depends on: `vitest/browser`, `vitest-browser-svelte`, `./AppShell.svelte`.
 * Used by: `pnpm --filter web test` (client project).
 */
import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import AppShell from './AppShell.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));
const user = (role: App.User['role']): App.User => ({
	id: 'u1',
	email: 'u@example.com',
	display_name: 'Pat Example',
	role
});
const props = (role: App.User['role'], currentPath = '/home') => ({
	user: user(role),
	currentPath,
	signOut: snippet('<button type="submit">Sign out</button>'),
	children: snippet('<p>Page body</p>')
});
const navLinks = () => page.getByRole('navigation', { name: 'Main' }).getByRole('link');

afterEach(async () => {
	await page.viewport(1280, 800);
});

describe('AppShell on desktop', () => {
	it('shows Home, Subjects and Simulator to a student', async () => {
		await page.viewport(1280, 800);
		await render(AppShell, props('student'));
		await expect.element(page.getByRole('link', { name: 'Subjects', exact: true })).toBeVisible();
		expect(
			navLinks()
				.elements()
				.map((a) => a.textContent?.trim())
		).toEqual(['Home', 'Subjects', 'Simulator']);
	});

	it('shows every area to an admin', async () => {
		await page.viewport(1280, 800);
		await render(AppShell, props('admin'));
		await expect.element(page.getByRole('link', { name: 'Audit log' })).toBeVisible();
		expect(
			navLinks()
				.elements()
				.map((a) => a.textContent?.trim())
		).toEqual(['Home', 'Subjects', 'Simulator', 'Educator', 'Author', 'Admin', 'Audit log']);
	});

	it('marks the current section with aria-current', async () => {
		await page.viewport(1280, 800);
		await render(AppShell, props('student', '/subjects/radiation-biology'));
		await expect
			.element(page.getByRole('link', { name: 'Subjects', exact: true }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(page.getByRole('link', { name: 'Home', exact: true }))
			.not.toHaveAttribute('aria-current');
	});

	it('hides the menu button, shows the account block and the page', async () => {
		await page.viewport(1280, 800);
		await render(AppShell, props('student'));
		// display:none removes the button from the accessibility tree, so a role query cannot find it.
		await expect.element(page.getByLabelText('Open menu')).not.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
		await expect.element(page.getByText('Pat Example')).toBeVisible();
		await expect.element(page.getByRole('main')).toHaveTextContent('Page body');
	});
});

describe('AppShell on a 360px phone', () => {
	it('collapses the nav behind a menu button', async () => {
		await page.viewport(360, 780);
		await render(AppShell, props('student'));
		const menu = page.getByRole('button', { name: 'Open menu' });
		await expect.element(menu).toBeVisible();
		await expect.element(menu).toHaveAttribute('aria-expanded', 'false');
		// Hidden (display:none) links are out of the accessibility tree, so query by text here.
		await expect.element(page.getByText('Subjects', { exact: true })).not.toBeVisible();

		await menu.click();
		await expect
			.element(page.getByRole('button', { name: 'Close menu' }))
			.toHaveAttribute('aria-expanded', 'true');
		await expect.element(page.getByRole('link', { name: 'Subjects', exact: true })).toBeVisible();
	});

	it('closes on Escape and returns focus to the menu button', async () => {
		await page.viewport(360, 780);
		await render(AppShell, props('student'));
		await page.getByRole('button', { name: 'Open menu' }).click();
		await userEvent.keyboard('{Escape}');
		const menu = page.getByRole('button', { name: 'Open menu' });
		await expect.element(menu).toHaveAttribute('aria-expanded', 'false');
		await expect.element(menu).toHaveFocus();
	});

	it('closes when the current path changes', async () => {
		await page.viewport(360, 780);
		const { rerender } = await render(AppShell, props('student', '/home'));
		await page.getByRole('button', { name: 'Open menu' }).click();
		await rerender({ currentPath: '/subjects' });
		await expect
			.element(page.getByRole('button', { name: 'Open menu' }))
			.toHaveAttribute('aria-expanded', 'false');
	});

	it('closes when a link to the page already open is tapped', async () => {
		await page.viewport(360, 780);
		await render(AppShell, props('student', '/home'));
		await page.getByRole('button', { name: 'Open menu' }).click();
		// The path doesn't change, so only the tap itself can close the drawer. Stop the real
		// navigation so the test page stays put.
		const home = page.getByRole('link', { name: 'Home', exact: true });
		home.element().addEventListener('click', (event) => event.preventDefault());
		await home.click();
		await expect
			.element(page.getByRole('button', { name: 'Open menu' }))
			.toHaveAttribute('aria-expanded', 'false');
	});
});
