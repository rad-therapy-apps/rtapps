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
 * Sessions: educator and admin tests reuse a session signed in once per run by the `setup`
 * project (`auth.setup.ts`, via `storageState`) instead of logging in per test — all e2e logins
 * share one API login rate-limit bucket, and this file in four projects exhausted it. Those
 * tests must not sign out or change the password (that would revoke the shared session); tests
 * about signing in/out or registering keep the real flow.
 * Depends on: `@axe-core/playwright`, `./helpers`, `auth.setup.ts`, the seeded compose stack
 * (app.seed).
 * Used by: `pnpm --filter web e2e`; pr.yml's e2e job.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { adminState, educatorState, registerStudent, signOut } from './helpers';

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
	for (const path of ['/', '/login', '/register']) await check(page, path);
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
	// Matching (Radiation Biology) and flashcards (Clinical Practice), the same way. No sequencing
	// activity is seeded, so that player is covered by its component spec only.
	await page.goto('/subjects/radiation-biology');
	await page.getByRole('link', { name: 'Cell & Molecular Biology: Matching' }).click();
	await expect(page.getByTestId('matching-terms')).toBeVisible();
	await expectAccessible(page, 'matching activity');
	await expectNoSidewaysScroll(page, 'matching activity');
	await page.goto('/subjects/clinical-practice');
	await page.getByRole('link', { name: 'Terminology Challenge: Flashcards' }).click();
	await expect(page.getByText('Card 1 of')).toBeVisible();
	await expectAccessible(page, 'flashcards activity');
	await expectNoSidewaysScroll(page, 'flashcards activity');
	// A calculator activity (the seeded MU calculator, which has the most inputs).
	await page.goto('/subjects/radiation-biology');
	await page.getByRole('link', { name: 'MU calculator', exact: true }).click();
	await expect(page.getByLabel('Prescribed dose (cGy)')).toBeVisible();
	await expectAccessible(page, 'calculator activity');
	await expectNoSidewaysScroll(page, 'calculator activity');
	// The arcade frame fits the viewport: the page itself never scrolls.
	await page.goto('/subjects/radiation-biology');
	await page.getByRole('link', { name: 'Cell Defender' }).click();
	await expect(page.locator('iframe.arcade-frame')).toBeVisible();
	await expectNoSidewaysScroll(page, 'arcade frame');
	const overflowY = await page.evaluate(
		() => document.documentElement.scrollHeight - window.innerHeight
	);
	expect(overflowY, `arcade page scrolls vertically by ${overflowY}px`).toBeLessThanOrEqual(1);
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
	// Page 3 of medical-terminology holds a prose table and a knowledge check (radios): the
	// table header and radio colours are what the light panel must keep readable.
	await page.goto('/lessons/medical-terminology', { waitUntil: 'networkidle' });
	const next = page.getByRole('button', { name: 'Next', exact: true });
	await next.click();
	await next.click();
	await expect(page.getByText('Page 3 of')).toBeVisible();
	await expect(page.locator('.prose th').first()).toBeVisible();
	await expectAccessible(page, 'light lesson panel with table');
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

test.describe('as the seeded educator', () => {
	test.use({ storageState: educatorState });

	test('the error page is accessible and fits the viewport', async ({ page }) => {
		// Signed in (shared educator session): the route guard sends signed-out visitors from unknown
		// paths to /login, so a 404 is only reachable with a session.
		await page.goto('/this-page-does-not-exist');
		await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'error page');
		await expectNoSidewaysScroll(page, 'error page');
	});

	test('educator pages are accessible and fit the viewport', async ({ page }) => {
		// Four scans, but the authoring hub is heavy: 28 s on the dev server with one worker, right
		// at the 30 s default.
		test.slow();
		for (const path of ['/educator', '/author', '/author/data-tables']) await check(page, path);
		// A cohort page, reached the way an educator does.
		await page.goto('/educator');
		await page.getByRole('link', { name: 'Demo cohort' }).click();
		await expect(page.getByRole('heading', { name: 'Demo cohort' })).toBeVisible();
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'cohort page');
		await expectNoSidewaysScroll(page, 'cohort page');
	});

	test('cohort analytics pages are accessible and fit the viewport', async ({ page }) => {
		test.slow();
		const toCohort = async () => {
			await page.goto('/educator');
			await page.getByRole('link', { name: 'Demo cohort' }).click();
			await expect(page.getByRole('heading', { name: 'Demo cohort' })).toBeVisible();
		};
		await toCohort();
		await page.getByRole('link', { name: 'Stats' }).first().click();
		await expect(page).toHaveURL(/\/activities\//);
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'activity stats');
		await expectNoSidewaysScroll(page, 'activity stats');
		await toCohort();
		await page.getByRole('main').getByRole('link', { name: 'Outcomes', exact: true }).click();
		await expect(page).toHaveURL(/\/outcomes$/);
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'cohort outcomes');
		await expectNoSidewaysScroll(page, 'cohort outcomes');
		await toCohort();
		await page
			.getByRole('row')
			.filter({ hasText: 'student01@example.com' })
			.getByRole('link')
			.click();
		await expect(page).toHaveURL(/\/students\//);
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'student detail');
		await expectNoSidewaysScroll(page, 'student detail');
	});

	test('deck and matching editors are accessible and fit the viewport', async ({ page }) => {
		test.slow();
		// Seeded activities, reached the way an educator does: from the authoring hub. No sequencing
		// activity is seeded, so that editor is not scanned here.
		await page.goto('/author');
		await page.getByRole('link', { name: 'Terminology Challenge: Flashcards' }).first().click();
		await expect(page).toHaveURL(/\/author\/decks\//);
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'deck editor');
		await expectNoSidewaysScroll(page, 'deck editor');
		await page.goto('/author');
		await page.getByRole('link', { name: 'Cell & Molecular Biology: Matching' }).first().click();
		await expect(page).toHaveURL(/\/author\/matching\//);
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'matching editor');
		await expectNoSidewaysScroll(page, 'matching editor');
	});

	test('quiz editor is accessible and fits the viewport', async ({ page }) => {
		test.slow();
		// The seeded "Demo quiz", reached the way an educator does: from the authoring hub.
		await page.goto('/author');
		await page
			.getByRole('link', { name: /Demo quiz/ })
			.first()
			.click();
		await expect(page.getByRole('tab', { name: 'Edit' })).toBeVisible();
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'quiz editor');
		await expectNoSidewaysScroll(page, 'quiz editor');
	});

	test('data-table editor opens, is accessible and fits the viewport', async ({ page }) => {
		test.slow();
		await page.goto('/author/data-tables');
		await page.waitForLoadState('networkidle');
		// The grid editor used to throw on open (structuredClone of a $state proxy), so assert it
		// renders before scanning.
		await page.getByRole('button', { name: 'New table' }).click();
		await expect(page.getByRole('heading', { name: 'New table' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Add row' })).toBeVisible();
		await expect(page.locator('table')).toBeVisible();
		await expectAccessible(page, 'data-table editor');
		await expectNoSidewaysScroll(page, 'data-table editor');
	});

	test('lesson editor is accessible and fits the viewport', async ({ page }) => {
		test.slow();
		// A seeded lesson, reached the way an educator does: from the authoring hub.
		await page.goto('/author');
		await page.getByRole('link', { name: 'RBE and OER' }).first().click();
		await expect(page).toHaveURL(/\/author\/lessons\//);
		await expect(page.getByRole('tab', { name: 'Edit' })).toBeVisible();
		await expect(page.getByRole('toolbar', { name: 'Formatting' }).first()).toBeVisible();
		await page.waitForLoadState('networkidle');
		await expectAccessible(page, 'lesson editor');
		await expectNoSidewaysScroll(page, 'lesson editor');
	});
});

test.describe('as the seeded admin', () => {
	test.use({ storageState: adminState });

	test('admin pages are accessible and fit the viewport', async ({ page }) => {
		test.slow();
		for (const path of ['/admin/users', '/admin/audit']) await check(page, path);
	});
});
