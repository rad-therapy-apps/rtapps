/**
 * What this file does: the end-to-end cohort flow for milestone M2 — an educator creates a
 * cohort, a student registers and joins it by code, completes a lesson, and the educator sees
 * the result in the cohort overview and student detail; the join code is then rotated and the
 * old one is refused for a second student.
 * Used here and why: Playwright against the running compose stack (baseURL http://localhost:8080,
 * see playwright.config.ts) so the real Caddy → SvelteKit → FastAPI → Postgres path is exercised;
 * role/label/testid locators (no CSS selectors) so the test survives markup changes; a unique
 * timestamp per run for both the cohort name and the student e-mails so it never collides with
 * earlier runs, the seed accounts, or the seed cohort `DEMO42`; no sleeps — every step uses
 * Playwright's auto-waiting `expect`.
 * How it fits the project: docs/03-architecture.md §11 (End-to-end row); FR-E-01/02/03 (cohort
 * create/join, analytics, student detail). Requires `make seed` first (the educator account and
 * the `rbe-and-oer` lesson); the students and cohort are created here.
 * Works with: the pages under apps/web/src/routes ((app)/educator, (app)/educator/cohorts/[id],
 * (app)/educator/cohorts/[id]/students/[uid], (app)/home) and their form actions (create, join,
 * rotate). Used by: `make e2e` and the CI `e2e` job in .github/workflows/pr.yml.
 */
import { test, expect } from '@playwright/test';

const EDUCATOR = { email: 'educator@example.com', password: 'rtapps-dev-password' };

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/home$/);
}

async function signOut(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Sign out' }).click(); // root layout form → POST /logout
	await expect(page).toHaveURL(/\/login$/);
}

test('educator creates a cohort, a student joins and completes a lesson, the educator sees it', async ({
	page
}) => {
	const stamp = Date.now();
	const cohortName = `E2E cohort ${stamp}`;
	// `cohort` in the prefix (not just `e2e-`) keeps this file's emails distinct from
	// lesson.e2e.ts's even when both spec files run in parallel and land on the same millisecond.
	const student = {
		email: `e2e-cohort-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E ${stamp}`
	};

	// Educator: create the cohort and read its join code.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.getByRole('link', { name: 'Educator' }).click();
	await page.getByLabel('Cohort name').fill(cohortName);
	await page.getByRole('button', { name: 'Create cohort' }).click();
	await expect(page.getByRole('heading', { name: cohortName })).toBeVisible();
	const code = (await page.getByTestId('join-code').textContent())!.trim();
	expect(code).toMatch(/^[A-Z2-9]{6}$/);
	const cohortUrl = page.url();
	await signOut(page);

	// Student: register, join with the code, complete the lesson with one correct answer.
	await page.goto('/register');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(student.email);
	await page.getByLabel('Display name').fill(student.name);
	await page.getByLabel('Password').fill(student.password);
	await page.getByRole('button', { name: 'Register' }).click();
	await expect(page).toHaveURL(/\/home$/);
	await page.getByLabel('Join code').fill(code);
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByText(`Joined ${cohortName}`)).toBeVisible();
	await page.goto('/lessons/rbe-and-oer');
	// Wait for hydration before clicking Next: the pager advances client-side, and a click fired
	// before Svelte attaches its handlers is a silent no-op (unlike lesson.e2e.ts, which reaches
	// this page via an already-hydrated link click rather than a fresh navigation).
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Page 1 of 7')).toBeVisible();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('RBE actually decreases past that point').check();
	await page.getByRole('button', { name: 'Check answer' }).click();
	await expect(page.getByText('Correct')).toBeVisible();
	for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Finish lesson' }).click();
	await expect(page.getByText('Score: 1 / 2')).toBeVisible();
	await signOut(page);

	// Educator: the overview shows the student at 50 %, and the detail shows the item response.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.goto(cohortUrl);
	const row = page.getByRole('row').filter({ hasText: student.email });
	await expect(row).toContainText('50.0%');
	await row.getByRole('link', { name: student.name }).click();
	await expect(page.getByRole('heading', { name: student.name })).toBeVisible();
	// `cell` (not `getByText`) because the activity title also appears in the attempts
	// `<summary>` below, which would otherwise make this locator ambiguous.
	await expect(page.getByRole('cell', { name: 'RBE and OER' })).toBeVisible();
	await expect(page.getByText('lq_page2_1')).toBeVisible();

	// Rotate the code; the old one is refused for a second student.
	await page.goto(cohortUrl);
	await page.getByRole('button', { name: 'Rotate code' }).click();
	await expect(page.getByTestId('join-code')).not.toHaveText(code);
	await signOut(page);
	await page.goto('/register');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(`e2e-cohort-b-${stamp}@example.edu`);
	await page.getByLabel('Display name').fill('Second');
	await page.getByLabel('Password').fill(student.password);
	await page.getByRole('button', { name: 'Register' }).click();
	await page.getByLabel('Join code').fill(code);
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByRole('alert')).toContainText('Join code not valid');
});
