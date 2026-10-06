/**
 * What this file does: the end-to-end phase-4 core loop for plan 4c (the simulator world, M8) —
 * a student enters the simulator hub from any subject page's live Simulator entry, drives a
 * scored QA run through the real `window.RTApps` SDK inside the hub's own iframe, and the
 * educator sees the resulting 75% on the per-attempt Attempts row; a second scenario (the same
 * student, still signed in) navigates straight to the Treatment delivery room app and records a
 * `sim-ct-scan` completion from inside it — proving the SDK resolves purely by slug, independent
 * of which player the student happens to be standing in — and the educator sees it land under the
 * separate "CT simulation" activity instead; a third test asserts the simulator stays behind the
 * same auth gate as the games, and that an authed request for one of the extracted CT scan images
 * carries the plan 4c media cache header.
 * Used here and why: Playwright against the running compose stack (baseURL http://localhost:8080,
 * see playwright.config.ts), same as `arcade.e2e.ts`; role/label/testid locators, no CSS
 * selectors. The real `sim-hub`/`linac-ct` apps load in their real iframes and are driven through
 * `window.RTApps.recordResult` directly — the actual SDK call a real simulator app makes — rather
 * than the games' postMessage shim; plan 4c's apps are real same-origin API clients
 * (`rtapps-sdk.js`'s header), so there's no player-side bridge to go through. The two
 * RTApps-driving tests run in `test.describe.serial`, sharing one student `Page` (its own browser
 * context) across both and one educator `Page` (a second context) reused for both stats checks —
 * two contexts, not one shared page, because a single context's session cookie can only belong to
 * one signed-in identity at a time, and the student must stay signed in across both tests (the
 * second scenario's premise) while the educator checks stats independently after each. Both
 * apps are heavy (sim-hub ~380KB inline three.js; linac-ct ~1.4MB with three.js plus the
 * extracted CT images): `frame.waitForFunction(() => window.RTApps)` gets a generous 30s timeout,
 * and each test's own timeout is raised, rather than asserting anything more weakly.
 * Requires `make seed` first (the demo cohort/educator account, and the three sim activities —
 * Center QA walkthrough, Treatment delivery, CT simulation — the seed get-or-creates, so
 * re-seeding an already-seeded stack is safe and, if the stack predates plan 4c, required).
 * How it fits the project: docs/specs/2026-09-10-plan-4c-simulator-design.md's Testing section
 * and Success criterion (the phase-4 vision's core loop, closed); `app/seed.py`'s three seeded
 * external activities (config `sdk_slug` "sim-hub-qa" scored max 4, "sim-linac-fraction" and
 * "sim-ct-scan" completion-only); the `GET /activities/by-sdk-slug/{slug}` resolver; the live
 * Simulator entry on subject pages (`data-testid="simulator-entry"`); the arcade media cache
 * header (`cacheControlFor` in `$lib/server/arcade.ts`).
 * Works with: `./helpers` (registerStudent, signIn); the pages under apps/web/src/routes
 * ((app)/subjects/[slug], (app)/subjects/[slug]/activities/[id], (app)/educator/cohorts/[id],
 * (app)/educator/cohorts/[id]/activities/[aid]) and `$lib/activity/ExternalPlayer.svelte`; the
 * static `apps/web/static/arcade/rtapps-sdk.js` and the `apps/web/arcade/sim-hub`/`linac-ct` apps
 * it's embedded in. Used by: `make e2e` and the CI `e2e` job in .github/workflows/pr.yml.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerStudent, signIn } from './helpers';

const EDUCATOR = { email: 'educator@example.com', password: 'rtapps-dev-password' };

/** The shape `window.RTApps` exposes inside a simulator app's iframe (`rtapps-sdk.js`). */
type RTAppsGlobal = {
	RTApps?: {
		recordResult(slug: string, opts?: { score: number }): Promise<{ percent: number | null }>;
	};
};

test.describe
	.serial('the phase-4 core loop: simulator entry and SDK results reach the educator', () => {
	let studentPage: Page;
	let educatorPage: Page;
	const stamp = Date.now();
	const student = {
		email: `e2e-simulator-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Simulator ${stamp}`
	};

	test.beforeAll(async ({ browser }) => {
		// Two separate browser contexts (not one shared page) so the student's session stays
		// signed in across both tests below while the educator independently signs in once and
		// checks stats after each — a single context's cookie can only hold one identity at a time.
		studentPage = await (await browser.newContext()).newPage();
		educatorPage = await (await browser.newContext()).newPage();
	});

	test.afterAll(async () => {
		await studentPage.context().close();
		await educatorPage.context().close();
	});

	test('a student enters the simulator and a QA run reaches the educator', async () => {
		test.setTimeout(180_000); // the sim-hub app is a heavy ~380KB inline three.js bundle; CI's 2-core runner needs the headroom (a local run fits in half this)

		// Student: register, join the demo cohort (required for the attempt to be visible to the
		// educator's cohort-scoped stats page below — same reason as arcade.e2e.ts).
		await registerStudent(studentPage, student);
		await studentPage.getByLabel('Join code').fill('DEMO42');
		await studentPage.getByRole('button', { name: 'Join cohort' }).click();
		await expect(studentPage.getByText('Joined Demo cohort')).toBeVisible();

		// The live Simulator entry is on the Simulator tab (its own page since 2026-10-06).
		await studentPage.getByRole('link', { name: 'Simulator', exact: true }).click();
		// Wait for hydration (module requests to finish) before clicking: a click on the
		// server-rendered link can race Svelte's own re-render of this section, same rationale
		// as helpers.ts's registerStudent/signIn.
		await studentPage.waitForLoadState('networkidle');
		await expect(studentPage.getByTestId('simulator-entry')).toBeVisible();
		await studentPage.getByTestId('simulator-entry').click();

		// Lands on the hub activity's player (the resolver's own subject_slug/activity_id, not
		// hardcoded here) — asserted by URL shape.
		await expect(studentPage).toHaveURL(/\/activities\//);

		// #watermark is static markup, present the instant the iframe's document parses — waiting
		// on it confirms the iframe has actually navigated before reaching into its frame, the
		// same two-step attach arcade.e2e.ts uses (frameLocator assertion, then the real Frame).
		const hubFrameLocator = studentPage.frameLocator('iframe[title="Center QA walkthrough"]');
		await expect(hubFrameLocator.locator('#watermark')).toBeAttached();
		const hubFrame = studentPage.frames().find((f) => f.url().includes('/arcade/sim-hub'))!;

		// The SDK script attaches window.RTApps asynchronously, after the heavy inline bundle
		// parses and runs; a generous timeout avoids racing it.
		await hubFrame.waitForFunction(() => (window as unknown as RTAppsGlobal).RTApps !== undefined, {
			timeout: 30_000
		});

		// Drive the real SDK directly — exactly what the hub app's own QA verdict code calls —
		// rather than the games' postMessage shim, since simulator apps are real API clients.
		// Score = QA checks passed, out of the seeded max_score of 4.
		const result = await hubFrame.evaluate(() => {
			const w = window as unknown as RTAppsGlobal;
			return w.RTApps!.recordResult('sim-hub-qa', { score: 3 });
		});
		// 3 / 4 = 75%, rounded server-side (attempts/router.py); the SDK's resolved value is a
		// plain JS number, not a formatted string.
		expect(result).toEqual({ percent: 75 });

		// Educator (a separate, already-signed-in browser context reused by the next test too):
		// Demo cohort → the Center QA walkthrough row's Stats link, same navigation as
		// arcade.e2e.ts/quiz.e2e.ts.
		await signIn(educatorPage, EDUCATOR.email, EDUCATOR.password);
		await educatorPage.getByRole('link', { name: 'Educator' }).click();
		await educatorPage.getByRole('link', { name: 'Demo cohort' }).click();
		await educatorPage
			.getByRole('row')
			.filter({ hasText: 'Center QA walkthrough' })
			.getByRole('link', { name: 'Stats' })
			.click();

		// The per-attempt Attempts table's row for this run's stamp-unique student name (the
		// shared stack accumulates other runs' attempts too, same rationale as arcade.e2e.ts):
		// score "3 / 4", percent "75.0%" (formatPercent's one-decimal rendering).
		const attemptRow = educatorPage.getByRole('row').filter({ hasText: student.name });
		await expect(attemptRow.locator('td').nth(1)).toHaveText('3 / 4');
		await expect(attemptRow.locator('td').nth(2)).toHaveText('75.0%');
	});

	test('room app completions record against the resolved slug, independent of the current player', async () => {
		test.setTimeout(180_000); // linac-ct is a ~1.4MB three.js bundle with the extracted CT images; CI's 2-core runner timed out at 90s with the SDK chain proven complete server-side (PR #71 run 1)

		// The student from the test above is still signed in (same Page/context, never signed
		// out) — navigate straight to the Treatment delivery activity via its own subject page,
		// not through the hub's in-app door wiring.
		await studentPage.getByRole('link', { name: 'Subjects', exact: true }).click();
		await studentPage.getByRole('link', { name: 'Treatment Delivery Procedures' }).click();
		// Wait for hydration before clicking the specific activity link, same rationale as the
		// simulator-entry click above.
		await studentPage.waitForLoadState('networkidle');
		await expect(studentPage.getByRole('heading', { name: 'Games' })).toBeVisible();
		await studentPage.getByRole('link', { name: 'Treatment delivery', exact: true }).click();
		await expect(studentPage).toHaveURL(/\/activities\//);

		// #rtappsBackBtn ("← Back to the Center") is static markup in the linac-ct shell.
		const roomFrameLocator = studentPage.frameLocator('iframe[title="Treatment delivery"]');
		await expect(roomFrameLocator.locator('#rtappsBackBtn')).toBeAttached();
		const roomFrame = studentPage.frames().find((f) => f.url().includes('/arcade/linac-ct'))!;
		await roomFrame.waitForFunction(
			() => (window as unknown as RTAppsGlobal).RTApps !== undefined,
			{ timeout: 30_000 }
		);

		// NOTE (intentional, per the design's slug-addressing decision): calling
		// recordResult('sim-ct-scan') here — while standing in the Treatment delivery player —
		// records against the CT simulation activity, not Treatment delivery. The SDK resolves
		// purely by slug (GET /activities/by-sdk-slug/{slug}), independent of which player/app
		// happens to be making the call; this is the design's point, not a bug. Assert the
		// promise actually resolves: completion-only activities always resolve percent null
		// (attempts/router.py's completion-only branch clears score/max_score/percent).
		const result = await roomFrame.evaluate(() => {
			const w = window as unknown as RTAppsGlobal;
			return w.RTApps!.recordResult('sim-ct-scan');
		});
		expect(result).toEqual({ percent: null });

		// Educator (same signed-in session as the previous test): back to Demo cohort, then the
		// CT simulation row's Stats link.
		await educatorPage.getByRole('link', { name: 'Back to cohort' }).click();
		// "CT simulation" is a case-insensitive substring of the seeded "CT Simulation Border
		// Challenge" game's row too (a different, unrelated activity) — exclude it explicitly so
		// this filter resolves to exactly one row.
		await educatorPage
			.getByRole('row')
			.filter({ hasText: 'CT simulation' })
			.filter({ hasNotText: 'Border Challenge' })
			.getByRole('link', { name: 'Stats' })
			.click();

		// Completion-only rows render score "—" and percent "Completed" (+page.svelte), filtered
		// by this run's stamp-unique student name.
		const attemptRow = educatorPage.getByRole('row').filter({ hasText: student.name });
		await expect(attemptRow.locator('td').nth(1)).toHaveText('—');
		await expect(attemptRow.locator('td').nth(2)).toHaveText('Completed');
	});
});

test('signed-out access to the simulator redirects to login, and an authed asset request carries the media cache header', async ({
	page
}) => {
	// hooks.server.ts's deny-by-default guard 303s an anonymous request off /arcade/*, same as
	// arcade.e2e.ts's existing redirect test — the simulator hub is served by the same auth-gated
	// route as the games.
	await page.goto('/arcade/sim-hub/index.html');
	await expect(page).toHaveURL(/\/login(\?|$)/);

	// Any signed-in user can fetch an arcade file (the auth gate is route-wide, not
	// activity-specific) — sign in as the seeded educator rather than registering a new student.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);

	// assets/ct-1.png is one of the five CT scan PNGs the linac-ct app's own index.html
	// references relatively (Task 7's byte-for-byte extraction) — a real, page-referenced asset
	// URL, not an arbitrary path. Non-HTML arcade files get an hour of private caching
	// (cacheControlFor in $lib/server/arcade.ts); HTML itself stays uncached.
	const res = await page.request.get('/arcade/linac-ct/assets/ct-1.png');
	expect(res.status()).toBe(200);
	expect(res.headers()['cache-control']).toBe('private, max-age=3600');
});
