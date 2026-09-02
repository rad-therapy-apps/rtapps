/**
 * What this file does: the end-to-end quiz flow for plan 3a — a student joins the demo cohort,
 * answers all four questions of the seeded "Demo quiz" with the first option each time (scoring
 * 2 / 4, below the quiz's 80 % pass mark), and sees the un-badged 50 % result; a second student
 * answers two questions, reloads mid-quiz, and resumes at the third; the educator then opens the
 * demo cohort's activity stats for the quiz and downloads its CSV export.
 * Used here and why: Playwright against the running compose stack (baseURL http://localhost:8080,
 * see playwright.config.ts) so the real Caddy → SvelteKit → FastAPI → Postgres path is exercised;
 * role/label/testid locators (no CSS selectors) so the test survives markup changes; a unique
 * timestamp per run for both students' e-mails so it never collides with earlier runs or the
 * seed's own ten `studentNN@example.com` quiz attempts; no sleeps — every step uses Playwright's
 * auto-waiting `expect`. The activity stats page has no test id on its two tables, so the items
 * table is addressed as `table` index 1 (distribution is index 0 — see `+page.svelte`'s fixed
 * section order); the summary counts are asserted as a floor (≥ the ten seed students + this
 * run's own), not an exact total, since the seed data and any earlier e2e runs both contribute
 * attempts that this test doesn't control.
 * How it fits the project: docs/03-architecture.md §11 (End-to-end row); FR-S-12–15 (quiz
 * attempt/grade/badge/resume), FR-E-06 (activity stats), FR-E-08 (CSV export). Requires
 * `make seed` first (the "Demo quiz" activity, the educator account, and the demo cohort); the
 * students are created here.
 * Works with: `./helpers` (registerStudent, signIn, signOut); the pages under
 * apps/web/src/routes ((app)/subjects/[slug], (app)/subjects/[slug]/activities/[id],
 * (app)/educator/cohorts/[id], (app)/educator/cohorts/[id]/activities/[aid]) and
 * `$lib/activity/QuizPlayer.svelte`. Used by: `make e2e` and the CI `e2e` job in
 * .github/workflows/pr.yml.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerStudent, signIn, signOut } from './helpers';

const EDUCATOR = { email: 'educator@example.com', password: 'rtapps-dev-password' };

/** Navigates a signed-in student from /home to the seeded Demo quiz via Subjects → Radiation
 *  Biology → Quizzes, asserting the first question is showing. */
async function openDemoQuiz(page: Page): Promise<void> {
	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await expect(page).toHaveURL(/\/subjects$/);
	await page.getByRole('link', { name: 'Radiation Biology' }).click();
	await page.getByRole('link', { name: 'Demo quiz' }).click();
	await expect(page.getByText('Question 1 of 4')).toBeVisible();
}

test('a student answers the demo quiz, scores 50%, and the educator sees the stats and CSV', async ({
	page
}) => {
	const stamp = Date.now();
	const student = {
		email: `e2e-quiz-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Quiz ${stamp}`
	};

	// Student: register, join the demo cohort, open the demo quiz.
	await registerStudent(page, student);
	await page.getByLabel('Join code').fill('DEMO42');
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByText('Joined Demo cohort')).toBeVisible();
	await openDemoQuiz(page);

	// Seeded answers are at option indices 0, 1, 2, 0 — choosing option 0 ("Option A") on every
	// question scores 2 of 4 (questions 1 and 4 are correct, 2 and 3 are not).
	for (let n = 1; n <= 4; n++) {
		await expect(page.getByText(`Question ${n} of 4`)).toBeVisible();
		await page.getByLabel('Option A').check();
		await expect(page.getByTestId('feedback')).toBeVisible();
		if (n < 4) {
			await page.getByRole('button', { name: 'Next question' }).click();
		} else {
			await page.getByRole('button', { name: 'Finish quiz' }).click();
		}
	}
	await expect(page.getByText('Score: 50%')).toBeVisible();
	// 50 % is below the quiz's 80 % pass mark, so no badge — the element isn't rendered at all.
	await expect(page.getByTestId('quiz-badge')).toHaveCount(0);
	await signOut(page);

	// Educator: Demo cohort → the Demo quiz row's Stats link.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.getByRole('link', { name: 'Educator' }).click();
	await page.getByRole('link', { name: 'Demo cohort' }).click();
	await page
		.getByRole('row')
		.filter({ hasText: 'Demo quiz' })
		.getByRole('link', { name: 'Stats' })
		.click();

	// Summary counts include this run's student, on top of the ten seed students (and whatever
	// earlier e2e runs left behind) — assert a floor, not an exact total (see file header).
	const summary = await page.getByText(/Attempts: \d+ · Students attempted: \d+/).textContent();
	const attempts = Number(summary!.match(/Attempts: (\d+)/)![1]);
	const studentsAttempted = Number(summary!.match(/Students attempted: (\d+)/)![1]);
	expect(attempts).toBeGreaterThanOrEqual(11);
	expect(studentsAttempted).toBeGreaterThanOrEqual(11);

	// The items table (the second of the page's two tables — see file header) has one row per
	// question regardless of how many students have attempted.
	const itemRows = page.locator('table').nth(1).locator('tbody tr');
	await expect(itemRows).toHaveCount(4);

	// CSV export: fetch the download link directly and check the exact header row (Task 10).
	const csvHref = await page.getByTestId('csv-link').getAttribute('href');
	const csv = await page.request.get(csvHref!);
	expect(csv.status()).toBe(200);
	const firstLine = (await csv.text()).split(/\r?\n/)[0];
	expect(firstLine).toBe('item,label,answered,correct,percent_correct');
});

test('reloading mid-quiz resumes the player at the next unanswered question', async ({ page }) => {
	const stamp = Date.now();
	const student = {
		email: `e2e-quiz-resume-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Quiz Resume ${stamp}`
	};

	await registerStudent(page, student);
	await openDemoQuiz(page);

	// Answer two of the four questions, then reload before finishing.
	await page.getByLabel('Option A').check();
	await expect(page.getByTestId('feedback')).toBeVisible();
	await page.getByRole('button', { name: 'Next question' }).click();
	await expect(page.getByText('Question 2 of 4')).toBeVisible();
	await page.getByLabel('Option A').check();
	await expect(page.getByTestId('feedback')).toBeVisible();

	// A fresh navigation (not a client-side route change) re-fetches the snapshot and remounts
	// QuizPlayer, which resumes the in-progress attempt and jumps to the first unanswered question.
	await page.reload();
	await expect(page.getByText('Question 3 of 4')).toBeVisible();
});
