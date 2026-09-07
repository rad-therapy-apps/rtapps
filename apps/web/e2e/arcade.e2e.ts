/**
 * What this file does: the end-to-end arcade flow for plan 4a's phase exit criterion — a
 * student joins the demo cohort, plays the seeded "Cell Defender" game (external activity) via
 * Subjects → Radiation Biology → Games, and the educator sees the resulting score in the demo
 * cohort's activity stats; a second test asserts the arcade route is auth-gated.
 * Used here and why: Playwright against the running compose stack (baseURL http://localhost:8080,
 * see playwright.config.ts), same as `quiz.e2e.ts`; role/label locators, no CSS selectors; the
 * game is driven through its real shim (`window.RTApps.reportResult`) inside the real iframe
 * instead of playing the canvas game, per the task brief — this exercises shim -> bridge ->
 * submit without needing to simulate keyboard/canvas gameplay. The student joins the demo cohort
 * first (join code DEMO42): `activity_stats`/`activity_rows` (`app/analytics/queries.py`) only
 * count attempts by that cohort's enrolled students, so an attempt from a non-enrolled student
 * would never reach the educator's cohort-scoped stats page. Attempts/students-attempted are
 * asserted as a floor (>= 1), not an exact total, the same way `quiz.e2e.ts` does — the seed
 * creates no Cell Defender attempts of its own (`app/seed.py`), but earlier e2e runs against the
 * same shared stack can have already added their own.
 * How it fits the project: docs/03-architecture.md §11 (End-to-end row); plan 4a's external-
 * activity flow (Task 3's `/arcade/<slug>/` serving, Task 4's shim, Task 5's `ExternalPlayer`,
 * Task 7's seeded "Cell Defender" activity: external, radiation-biology,
 * config {arcade_slug:"cell-defender", max_score:5000}).
 * Works with: `./helpers` (registerStudent, signIn, signOut); the pages under
 * apps/web/src/routes ((app)/subjects/[slug], (app)/subjects/[slug]/activities/[id],
 * (app)/educator/cohorts/[id], (app)/educator/cohorts/[id]/activities/[aid]) and
 * `$lib/activity/ExternalPlayer.svelte`. Used by: `make e2e` and the CI `e2e` job in
 * .github/workflows/pr.yml.
 */
import { test, expect } from '@playwright/test';
import { registerStudent, signIn, signOut } from './helpers';

const EDUCATOR = { email: 'educator@example.com', password: 'rtapps-dev-password' };

test('a student plays the seeded arcade game and the educator sees the score', async ({ page }) => {
	const stamp = Date.now();
	const student = {
		email: `e2e-arcade-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Arcade ${stamp}`
	};

	// Student: register, join the demo cohort (required for the attempt to be visible to the
	// educator below — see file header), then Subjects → Radiation Biology → Games → Cell Defender.
	await registerStudent(page, student);
	await page.getByLabel('Join code').fill('DEMO42');
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByText('Joined Demo cohort')).toBeVisible();

	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await page.getByRole('link', { name: 'Radiation Biology' }).click();
	await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Simulator' })).toBeVisible();
	await page.getByRole('link', { name: 'Cell Defender' }).click();

	// The real game (with the real shim) loads in the iframe; drive the shim directly instead of
	// playing the canvas game — this exercises shim -> bridge -> submit (per the task brief).
	const frame = page.frameLocator('iframe[title="Cell Defender"]');
	await expect(frame.locator('#gameOverScreen')).toBeAttached();
	await page
		.frames()
		.find((f) => f.url().includes('/arcade/cell-defender'))!
		.evaluate(() =>
			(
				window as unknown as { RTApps: { reportResult(s: number): void } }
			).RTApps.reportResult(1200)
		);

	// 1200 / the seeded max_score of 5000 = 24%.
	await expect(page.getByText('Score recorded: 24%')).toBeVisible();
	await signOut(page);

	// Educator: Demo cohort → the Cell Defender row's Stats link (same navigation as quiz.e2e.ts).
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.getByRole('link', { name: 'Educator' }).click();
	await page.getByRole('link', { name: 'Demo cohort' }).click();
	await page
		.getByRole('row')
		.filter({ hasText: 'Cell Defender' })
		.getByRole('link', { name: 'Stats' })
		.click();

	// Summary counts include this run's student, on top of whatever earlier arcade e2e runs left
	// behind against the same shared stack (the seed itself creates no Cell Defender attempts —
	// see file header) — assert a floor, not an exact total, mirroring quiz.e2e.ts's rationale.
	const summary = await page.getByText(/Attempts: \d+ · Students attempted: \d+/).textContent();
	const attempts = Number(summary!.match(/Attempts: (\d+)/)![1]);
	const studentsAttempted = Number(summary!.match(/Students attempted: (\d+)/)![1]);
	expect(attempts).toBeGreaterThanOrEqual(1);
	expect(studentsAttempted).toBeGreaterThanOrEqual(1);

	// The reported 1200/5000 score (24%) falls in the 0-49% distribution bucket — assert at
	// least this run's attempt landed there.
	const bucketCount = await page
		.getByRole('row')
		.filter({ hasText: '0-49' })
		.locator('td')
		.nth(1)
		.textContent();
	expect(Number(bucketCount)).toBeGreaterThanOrEqual(1);
});

test('signed-out access to the arcade game redirects to login', async ({ page }) => {
	// hooks.server.ts's deny-by-default guard 303s an anonymous request off /arcade/*; SvelteKit
	// itself 308-redirects the trailing-slash form to the non-trailing-slash form first, but
	// `page.goto` follows the whole chain and lands on /login (with a `?next=` redirect target)
	// either way.
	await page.goto('/arcade/cell-defender/');
	await expect(page).toHaveURL(/\/login(\?|$)/);
});
