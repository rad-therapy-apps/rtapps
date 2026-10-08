/**
 * What this file does: platform-wide UI checks — axe-core WCAG 2.1 A/AA scans of the main
 * student, educator and signed-out pages, no horizontal scrolling at the current viewport, and
 * the phone drawer flow at 360px.
 * Used here and why: `@axe-core/playwright` runs axe in the real page; only serious/critical
 * violations fail (NFR-16's bar), with the rule id and offending selectors in the failure
 * message. Arcade iframes are excluded (games keep their own look and are out of scope). A fresh
 * student is registered per run so lesson/quiz visits never touch seeded accounts other specs
 * count on. Runs in every Playwright project (desktop Chromium, 360px, Firefox, WebKit).
 * How it fits the project: NFR-16/NFR-18 (docs/02-requirements.md);
 * docs/specs/2026-10-01-ui-restyle-design.md (Verification); docs/03-architecture.md §11.
 * Depends on: `@axe-core/playwright`, `./helpers`, the seeded compose stack (app.seed).
 * Used by: `pnpm --filter web e2e`; pr.yml's e2e job.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { registerStudent, signIn, signOut } from './helpers';

const EDUCATOR = {
	email: 'educator@example.com',
	password: 'rtapps-dev-password'
};
const PHONE_MAX = 800; // px; the shell's 50rem breakpoint

async function expectAccessible(page: Page, label: string) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.exclude('iframe')
		.analyze();
	const blocking = results.violations
		.filter((v) => v.impact === 'serious' || v.impact === 'critical')
		.map((v) => `${label} — ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
	expect(blocking).toEqual([]);
}

async function expectNoSidewaysScroll(page: Page, label: string) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow, `${label} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
}

async function check(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
	await expectAccessible(page, path);
	await expectNoSidewaysScroll(page, path);
}

test('signed-out pages are accessible and fit the viewport', async ({ page }) => {
	for (const path of ['/login', '/register']) await check(page, path);
});

test('student pages are accessible and fit the viewport', async ({ page }) => {
	// Seven full-page axe scans in one test against the dev server: triple the default timeout.
	test.slow();
	const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	await registerStudent(page, {
		email: `e2e-ui-${stamp}@example.edu`,
		password: 'e2e-ui-password-1',
		name: 'UI Check'
	});
	for (const path of [
		'/home',
		'/subjects',
		'/subjects/radiation-biology',
		'/simulator',
		'/lessons/rbe-and-oer',
		'/account/password'
	]) {
		await check(page, path);
	}
	// An activity page (quiz player), reached the way a student does.
	await page.goto('/subjects/radiation-biology');
	await page.getByRole('link', { name: 'Demo quiz' }).click();
	await expect(page.getByText('Question 1 of 4')).toBeVisible();
	await expectAccessible(page, 'quiz activity');
	await expectNoSidewaysScroll(page, 'quiz activity');
});

test('light reading panel is applied before hydration and is accessible', async ({ page }) => {
	const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	await registerStudent(page, {
		email: `e2e-ui-light-${stamp}@example.edu`,
		password: 'e2e-ui-password-1',
		name: 'Light Check'
	});
	await page.evaluate(() => localStorage.setItem('rttlearn:reading', 'light'));
	await page.goto('/lessons/rbe-and-oer', { waitUntil: 'domcontentloaded' });
	// Read right after DOM-ready: the head script, not the toggle component, has set the mode.
	const background = await page.evaluate(
		() => getComputedStyle(document.querySelector('.reading-panel')!).backgroundColor
	);
	expect(background).toBe('rgb(247, 249, 252)'); // --paper-light-bg
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('button', { name: 'Light page' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expectAccessible(page, 'light lesson panel');
	await expectNoSidewaysScroll(page, 'light lesson panel');
});

test('educator pages are accessible and fit the viewport', async ({ page }) => {
	// Two scans, but the authoring hub is heavy: 28 s on the dev server with one worker, right
	// at the 30 s default.
	test.slow();
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	for (const path of ['/educator', '/author']) await check(page, path);
});

test('phone drawer opens, navigates and closes', async ({ page, viewport }) => {
	test.skip((viewport?.width ?? 1280) > PHONE_MAX, 'phone layout only');
	const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	await registerStudent(page, {
		email: `e2e-ui-drawer-${stamp}@example.edu`,
		password: 'e2e-ui-password-1',
		name: 'Drawer Check'
	});
	const subjects = page.getByRole('link', { name: 'Subjects', exact: true });
	await expect(subjects).toBeHidden();
	await page.getByRole('button', { name: 'Open menu' }).click();
	await subjects.click();
	await expect(page).toHaveURL(/\/subjects$/);
	await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
		'aria-expanded',
		'false'
	);
	// Sign out is inside the drawer on phones.
	await page.getByRole('button', { name: 'Open menu' }).click();
	await signOut(page);
});
