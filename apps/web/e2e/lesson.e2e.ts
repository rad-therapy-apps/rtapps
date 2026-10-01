/**
 * What this file does: the one end-to-end flow for milestone M1 — a brand-new student registers,
 * opens a migrated lesson, answers a knowledge check, finishes, and sees the score on /home.
 * Used here and why: Playwright against the running compose stack (baseURL http://localhost:8080,
 * see playwright.config.ts) so the real Caddy → SvelteKit → FastAPI → Postgres path is exercised;
 * role/label locators (no CSS selectors) so the test survives markup changes; a unique e-mail per
 * run so it never collides with earlier runs or the seed accounts; no sleeps — every step uses
 * Playwright's auto-waiting `expect`.
 * How it fits the project: docs/03-architecture.md §11 (End-to-end row); the roadmap's Phase 1
 * exit criterion. Requires `make seed` first (lesson content); the user itself is created here.
 * Works with: `./helpers` (registerStudent); the pages under apps/web/src/routes ((auth)/register,
 * (app)/subjects, (app)/lessons, (app)/home) and their components (LessonPager, KnowledgeCheck).
 * Used by: `make e2e` and the CI `e2e` job in .github/workflows/pr.yml.
 */
import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test('register, complete a lesson, answer a question, and see the score', async ({ page }) => {
	// Fresh identity per run: registration must succeed even when the stack was reused. The random
	// suffix keeps the Firefox, WebKit and Chromium projects (which all run this spec) from
	// colliding when two start in the same millisecond.
	const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.edu`;
	const password = 'password-1234';
	const displayName = 'E2E Student';

	// The register action relays the API's session cookie and redirects to the signed-in home.
	await registerStudent(page, { email, password, name: displayName });

	// `exact` because the home page also has a "Browse subjects" link.
	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await expect(page).toHaveURL(/\/subjects$/);

	await page.getByRole('link', { name: 'Radiation Biology' }).click();
	await page.getByRole('link', { name: 'RBE and OER' }).click();

	// Opening the lesson starts an attempt server-side; the pager shows the first of 7 pages.
	await expect(page.getByText('Page 1 of 7')).toBeVisible();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByText('Page 2 of 7')).toBeVisible();

	// Page 2 carries the knowledge check lq_page2_1; option B is the correct answer in the seed.
	await page.getByLabel('RBE actually decreases past that point').check();
	await page.getByRole('button', { name: 'Check answer' }).click();
	await expect(page.getByText('Correct')).toBeVisible();

	// Skip the remaining pages without answering the second check (so the score is 1 / 2).
	for (let i = 0; i < 5; i++) {
		await page.getByRole('button', { name: 'Next' }).click();
	}
	await expect(page.getByText('Page 7 of 7')).toBeVisible();

	// Finish submits the attempt (idempotent POST) and renders the score from the API's numbers.
	await page.getByRole('button', { name: 'Finish lesson' }).click();
	await expect(page.getByText('Score: 1 / 2')).toBeVisible();

	await page.getByRole('link', { name: 'Back to home' }).click();
	await expect(page).toHaveURL(/\/home$/);

	// /home lists submitted attempts from GET /me/results; 50 = one of two checks correct.
	const row = page.getByRole('row').filter({ hasText: 'RBE and OER' });
	await expect(row).toContainText('50');
});
