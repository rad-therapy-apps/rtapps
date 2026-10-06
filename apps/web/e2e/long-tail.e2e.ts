/**
 * What this file does: the end-to-end long-tail flows for plan 4d (Task 9) — a student completes
 * the "Three-point setup" alignment-set shim game and the educator sees "Completed"; a second test
 * walks the simulator hub's console door: the hub's `CONSOLE_APP_URL` prefetch resolves to the
 * console emulator's player URL, the student is navigated there directly (door-walking the 3D
 * world isn't automatable) and drives the console's own SDK completion, which the educator then
 * sees under "Treatment console"; a third test drives the forced-password-change flow end to end
 * through the real admin/account UI — an admin reset bounces the student's existing session,
 * their temp-password sign-in is redirected to /account/password and stuck there until they
 * change it, and the old temp password stops working afterwards; a final test asserts the hub's
 * QA verdict latch (#73/Task 8) — a rapid double-click on RELEASE records only one attempt.
 * Used here and why: Playwright against the running compose stack (baseURL http://localhost:8080,
 * see playwright.config.ts), mirroring `simulator.e2e.ts`/`arcade.e2e.ts`'s idioms exactly:
 * role/label/testid locators (no CSS selectors); the two-step iframe attach (a static markup
 * locator asserted attached, then the real `Frame` picked up by URL substring) before reaching
 * into a heavy three.js app's `window`; a generous `waitForFunction` timeout for `window.RTApps`
 * attaching asynchronously. Tests 1/2/4 use a single `page` fixture and swap identity via
 * sign-out/sign-in (student acts, then the educator checks stats after) — the same pattern
 * `arcade.e2e.ts` uses — since nothing in those flows needs both identities signed in at once.
 * Test 3 is the exception: it needs the student's *original* browser session to still be live
 * when the admin resets their password (to prove that specific session gets bounced), so it opens
 * two separate browser contexts (student, admin) the same way `simulator.e2e.ts`'s serial pair
 * does, for the same reason (one context's cookie jar can only hold one identity at a time).
 * The QA verdict latch check (Test 4) drives the hub's RELEASE button via two `dispatchEvent`
 * calls in the same `frame.evaluate` tick rather than two Playwright `locator.click()`s: the
 * button is set `disabled` by its own handler synchronously on the first click, and a disabled
 * button doesn't reliably receive a second simulated *mouse* click in Chromium (real or
 * CDP-injected) — dispatching the `click` `Event` directly targets the registered listener
 * regardless, which is what actually exercises the app's `__rtappsVerdictLocked` guard rather than
 * just confirming the browser's own disabled-element suppression.
 * Requires re-seeding first (`make seed`, stack running) — the three alignment-set activities
 * ("Three-point setup", "LINAC training — beginner"/"— intermediate") and "Treatment console" are
 * new in plan 4d (`app/seed.py`); an already-seeded stack that predates plan 4d won't have them.
 * The alembic migration for `must_change_password` (0009) must also be applied — `make seed`
 * itself will fail with an `UndefinedColumnError` if it isn't.
 * How it fits the project: docs/specs/plan 4d's design and Task 9 brief (`.superpowers/sdd/`);
 * `app/seed.py`'s four new plan-4d activities; the change-password/admin-reset endpoints (plan 4d
 * Tasks 2-4: `POST /auth/change-password`, `POST /admin/users/{id}/reset-password`); the forced
 * redirect in `hooks.server.ts`; the CONSOLE_APP_URL hub-door prefetch and the verdict latch
 * (plan 4d Tasks 6/8, `apps/web/arcade/sim-hub/index.html`).
 * Works with: `./helpers` (registerStudent, signIn, signOut); the pages under
 * apps/web/src/routes ((app)/subjects/[slug], (app)/subjects/[slug]/activities/[id],
 * (app)/educator/cohorts/[id], (app)/educator/cohorts/[id]/activities/[aid],
 * (app)/admin/users, (app)/account/password) and `$lib/activity/ExternalPlayer.svelte`; the
 * static `apps/web/static/arcade/rtapps-shim.js`/`rtapps-sdk.js` and the
 * `three-point-setup`/`sim-hub`/`linac-console` apps embedded in. Used by: `make e2e` and the CI
 * `e2e` job in .github/workflows/pr.yml.
 */
import { test, expect } from '@playwright/test';
import { registerStudent, signIn, signOut } from './helpers';

const EDUCATOR = { email: 'educator@example.com', password: 'rtapps-dev-password' };
const ADMIN = { email: 'admin@example.com', password: 'rtapps-dev-password' };

/** The shape a games'-shim app exposes (rtapps-shim.js) — completion-only, no numeric score. */
type ShimGlobal = { RTApps?: { reportCompletion(): void } };

/** The shape a plan-4c/4d simulator app exposes (rtapps-sdk.js). */
type SdkGlobal = {
	RTApps?: {
		recordResult(slug: string, opts?: { score: number }): Promise<{ percent: number | null }>;
	};
	CONSOLE_APP_URL?: string | null;
};

test('an alignment set completion reaches the educator', async ({ page }) => {
	test.setTimeout(180_000); // three-point-setup loads three.js from a CDN import map; generous headroom for CI's 2-core runner

	const stamp = Date.now();
	const student = {
		email: `e2e-longtail-align-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Align ${stamp}`
	};

	// Student: register, join the demo cohort (required for the attempt to be visible to the
	// educator's cohort-scoped stats page below — same rationale as arcade.e2e.ts/simulator.e2e.ts).
	await registerStudent(page, student);
	await page.getByLabel('Join code').fill('DEMO42');
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByText('Joined Demo cohort')).toBeVisible();

	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await page.getByRole('link', { name: 'Treatment Delivery Procedures' }).click();
	// Wait for hydration before clicking the specific activity link, same rationale as
	// simulator.e2e.ts's Treatment delivery navigation.
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
	await page.getByRole('link', { name: 'Three-point setup', exact: true }).click();
	await expect(page).toHaveURL(/\/activities\//);

	// #console-toggle-button is static markup, the first element after <body> — present the
	// instant the iframe's document parses, same two-step attach as the other specs.
	const frame = page.frameLocator('iframe[title="Three-point setup"]');
	await expect(frame.locator('#console-toggle-button')).toBeAttached();
	const gameFrame = page.frames().find((f) => f.url().includes('/arcade/three-point-setup'))!;
	await gameFrame.waitForFunction(() => (window as unknown as ShimGlobal).RTApps !== undefined, {
		timeout: 30_000
	});

	// Driving the actual 3D alignment (couch/nudge controls until the tumor sits within tolerance
	// of the laser isocenter) to a real pass isn't practical to automate — per the same 4b policy
	// arcade.e2e.ts's Beam Sculptor test uses, call the app's own audited completion path directly
	// (the exact `window.RTApps.reportCompletion()` call `checkAlignment()` makes on a real pass),
	// rather than faking a bridge message.
	await gameFrame.evaluate(() => (window as unknown as ShimGlobal).RTApps!.reportCompletion());

	await expect(page.getByText('Completed')).toBeVisible();
	await signOut(page);

	// Educator: Demo cohort → the Three-point setup row's Stats link.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.getByRole('link', { name: 'Educator' }).click();
	await page.getByRole('link', { name: 'Demo cohort' }).click();
	await page
		.getByRole('row')
		.filter({ hasText: 'Three-point setup' })
		.getByRole('link', { name: 'Stats' })
		.click();

	// Completion-only row: score "—", percent "Completed" — filtered by this run's stamp-unique
	// student name, same rationale as the other specs' shared-stack Attempts tables.
	const attemptRow = page.getByRole('row').filter({ hasText: student.name });
	await expect(attemptRow.locator('td').nth(1)).toHaveText('—');
	await expect(attemptRow.locator('td').nth(2)).toHaveText('Completed');
});

test('the console door round-trip', async ({ page }) => {
	test.setTimeout(180_000); // sim-hub is a heavy ~380KB inline three.js bundle; same headroom as simulator.e2e.ts

	const stamp = Date.now();
	const student = {
		email: `e2e-longtail-console-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Console ${stamp}`
	};

	await registerStudent(page, student);
	await page.getByLabel('Join code').fill('DEMO42');
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByText('Joined Demo cohort')).toBeVisible();

	// The live Simulator entry is on the Simulator tab, same as simulator.e2e.ts.
	await page.getByRole('link', { name: 'Simulator', exact: true }).click();
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('simulator-entry')).toBeVisible();
	await page.getByTestId('simulator-entry').click();
	await expect(page).toHaveURL(/\/activities\//);

	const hubFrameLocator = page.frameLocator('iframe[title="Center QA walkthrough"]');
	await expect(hubFrameLocator.locator('#watermark')).toBeAttached();
	const hubFrame = page.frames().find((f) => f.url().includes('/arcade/sim-hub'))!;
	await hubFrame.waitForFunction(() => (window as unknown as SdkGlobal).RTApps !== undefined, {
		timeout: 30_000
	});

	// Door-clicking through the 3D world to the Learning Commons / Staff Education door isn't
	// automatable — assert the prefetch gate instead: CONSOLE_APP_URL (plan 4d Task 6) resolves
	// asynchronously via window.RTApps.activityUrl('sim-console') once the SDK attaches.
	await hubFrame.waitForFunction(() => (window as unknown as SdkGlobal).CONSOLE_APP_URL != null, {
		timeout: 30_000
	});
	const consoleUrl = await hubFrame.evaluate(
		() => (window as unknown as SdkGlobal).CONSOLE_APP_URL
	);
	expect(consoleUrl).toBeTruthy();
	expect(consoleUrl).toContain('/activities/');

	// Navigate to the console player via the resolved URL directly (what the hub's own door
	// handler does via `window.top.location.href = CONSOLE_APP_URL`), rather than walking the door.
	await page.goto(consoleUrl!);
	await expect(page).toHaveURL(/\/activities\//);

	// #rtappsBackBtn is static markup in the console shell, same idiom as linac-ct's back button.
	const consoleFrameLocator = page.frameLocator('iframe[title="Treatment console"]');
	await expect(consoleFrameLocator.locator('#rtappsBackBtn')).toBeAttached();
	const consoleFrame = page.frames().find((f) => f.url().includes('/arcade/linac-console'))!;
	await consoleFrame.waitForFunction(() => (window as unknown as SdkGlobal).RTApps !== undefined, {
		timeout: 30_000
	});

	// Drive the real SDK directly (script.js's own call on a delivered beam) — "Treatment console"
	// is completion-only, so the resolved percent is always null (same as linac-ct's completions).
	const result = await consoleFrame.evaluate(() => {
		const w = window as unknown as SdkGlobal;
		return w.RTApps!.recordResult('sim-console');
	});
	expect(result).toEqual({ percent: null });
	await signOut(page);

	// Educator: Demo cohort → the Treatment console row's Stats link.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.getByRole('link', { name: 'Educator' }).click();
	await page.getByRole('link', { name: 'Demo cohort' }).click();
	await page
		.getByRole('row')
		.filter({ hasText: 'Treatment console' })
		.getByRole('link', { name: 'Stats' })
		.click();

	const attemptRow = page.getByRole('row').filter({ hasText: student.name });
	await expect(attemptRow.locator('td').nth(1)).toHaveText('—');
	await expect(attemptRow.locator('td').nth(2)).toHaveText('Completed');
});

test('forced password change', async ({ browser }) => {
	// Two separate browser contexts (not one shared page/signed-out swap, unlike the tests above):
	// the student's *original* session must stay live while the admin resets their password, so the
	// next request from that same session can be shown getting bounced — signing the student out
	// first would make that bounce trivially true regardless of the reset. Same two-context
	// rationale as simulator.e2e.ts's serial pair.
	const studentPage = await (await browser.newContext()).newPage();
	const adminPage = await (await browser.newContext()).newPage();

	const stamp = Date.now();
	const student = {
		email: `e2e-longtail-pw-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Password ${stamp}`
	};

	try {
		await registerStudent(studentPage, student);

		// Admin: find the student in the roster and reset their password.
		await signIn(adminPage, ADMIN.email, ADMIN.password);
		await adminPage.getByRole('link', { name: 'Admin' }).click();
		await expect(adminPage).toHaveURL(/\/admin\/users$/);
		await adminPage.getByLabel('Search').fill(student.email);
		await adminPage.getByRole('button', { name: 'Search' }).click();
		await adminPage
			.getByRole('row')
			.filter({ hasText: student.email })
			.getByRole('button', { name: 'Reset password' })
			.click();

		// The temporary password is shown once, in the banner rendered from the action result —
		// never in a URL, cookie, or log (+page.server.ts's `reset` action).
		const statusBanner = adminPage.getByRole('status');
		await expect(statusBanner).toBeVisible();
		const tempPassword = await statusBanner.locator('code').textContent();
		expect(tempPassword).toBeTruthy();

		// The student's original session is revoked server-side by the reset (admin/router.py's
		// `revoke_all_for_user`) — their next navigation bounces to /login.
		await studentPage.reload();
		await expect(studentPage).toHaveURL(/\/login(\?|$)/);

		// Student signs in with the temp password — NOT the shared `signIn` helper, which asserts
		// landing on /home: `must_change_password` is now set, so hooks.server.ts's forced-change
		// redirect sends this sign-in to /account/password instead.
		await studentPage.goto('/login');
		await studentPage.waitForLoadState('networkidle');
		await studentPage.getByLabel('Email').fill(student.email);
		await studentPage.getByLabel('Password').fill(tempPassword!);
		await studentPage.getByRole('button', { name: 'Sign in' }).click();
		await expect(studentPage).toHaveURL(/\/account\/password$/);

		// Stuck there: any other navigation bounces straight back (hooks.server.ts leaves only
		// /account/password and /logout reachable while the flag is set).
		await studentPage.goto('/subjects');
		await expect(studentPage).toHaveURL(/\/account\/password$/);

		// Change the password for real, through the form.
		const newPassword = 'brand-new-password-5678';
		await studentPage.getByLabel('Current password').fill(tempPassword!);
		// exact: true — "Confirm new password" otherwise substring-matches "New password" too.
		await studentPage.getByLabel('New password', { exact: true }).fill(newPassword);
		await studentPage.getByLabel('Confirm new password').fill(newPassword);
		await studentPage.getByRole('button', { name: 'Change password' }).click();

		// Successful change clears the flag and redirects to /subjects (+page.server.ts) — normal
		// browsing works again, no more forced redirect.
		await expect(studentPage).toHaveURL(/\/subjects$/);
		await studentPage.goto('/home');
		await expect(studentPage).toHaveURL(/\/home$/);

		// The old temporary password no longer works.
		await signOut(studentPage);
		await studentPage.goto('/login');
		await studentPage.waitForLoadState('networkidle');
		await studentPage.getByLabel('Email').fill(student.email);
		await studentPage.getByLabel('Password').fill(tempPassword!);
		await studentPage.getByRole('button', { name: 'Sign in' }).click();
		await expect(studentPage).toHaveURL(/\/login/);
		await expect(studentPage.locator('#login-error')).toBeVisible();

		// The new password does work.
		await studentPage.getByLabel('Email').fill(student.email);
		await studentPage.getByLabel('Password').fill(newPassword);
		await studentPage.getByRole('button', { name: 'Sign in' }).click();
		await expect(studentPage).toHaveURL(/\/home$/);
	} finally {
		await studentPage.context().close();
		await adminPage.context().close();
	}
});

test('the QA verdict latch: a rapid double click records only one attempt', async ({ page }) => {
	test.setTimeout(180_000); // sim-hub is a heavy ~380KB inline three.js bundle; same headroom as simulator.e2e.ts

	// Baseline: the shared stack's current Attempts count for Center QA walkthrough, before this
	// run's student does anything — same summary text arcade.e2e.ts reads for its floor checks.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.getByRole('link', { name: 'Educator' }).click();
	await page.getByRole('link', { name: 'Demo cohort' }).click();
	await page
		.getByRole('row')
		.filter({ hasText: 'Center QA walkthrough' })
		.getByRole('link', { name: 'Stats' })
		.click();
	// Wait for the navigation to actually land before reading `page.url()` — SvelteKit's
	// client-side routing means the URL bar can lag the click by a tick, so capturing it
	// synchronously right after `.click()` can freeze the *previous* (cohort overview) URL instead.
	await expect(page).toHaveURL(/\/activities\//);
	const statsUrl = page.url();
	const baselineText = await page
		.getByText(/Attempts: \d+ · Students attempted: \d+/)
		.textContent();
	const baselineAttempts = Number(baselineText!.match(/Attempts: (\d+)/)![1]);
	await signOut(page);

	const stamp = Date.now();
	const student = {
		email: `e2e-longtail-latch-${stamp}@example.edu`,
		password: 'password-1234',
		name: `E2E Latch ${stamp}`
	};
	await registerStudent(page, student);
	await page.getByLabel('Join code').fill('DEMO42');
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByText('Joined Demo cohort')).toBeVisible();

	await page.getByRole('link', { name: 'Simulator', exact: true }).click();
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('simulator-entry')).toBeVisible();
	await page.getByTestId('simulator-entry').click();
	await expect(page).toHaveURL(/\/activities\//);

	const hubFrameLocator = page.frameLocator('iframe[title="Center QA walkthrough"]');
	await expect(hubFrameLocator.locator('#watermark')).toBeAttached();
	const hubFrame = page.frames().find((f) => f.url().includes('/arcade/sim-hub'))!;
	await hubFrame.waitForFunction(() => (window as unknown as SdkGlobal).RTApps !== undefined, {
		timeout: 30_000
	});
	// `window.RTApps` attaches from a small, separately-loaded script and is ready almost
	// immediately — long before the hub's own (heavy, ~380KB) module script finishes building the
	// 3D scene and, near the very end of its top-to-bottom run, wires up #releaseClinical's click
	// listener. #siteChoices starts empty in the static markup and is only populated (via
	// procRenderSite(), called right alongside the verdict-button wiring) once that module script
	// has actually finished running — waiting for it is what proves the listener is attached
	// before this test dispatches a click at the button below.
	await hubFrame.waitForFunction(
		() => (document.getElementById('siteChoices')?.children.length ?? 0) > 0,
		{ timeout: 30_000 }
	);

	// Click RELEASE CT twice, rapidly: the handler sets `__rtappsVerdictLocked` and disables both
	// verdict buttons synchronously on the *first* call (index.html's #73 fix, Task 8), before any
	// of its own async work — but a disabled button doesn't reliably receive a second simulated
	// *mouse* click in Chromium (real or Playwright's `force: true`, which is still CDP-level mouse
	// input), so a plain double `.click()` would only prove the browser's own disabled-element
	// suppression, not the app's guard. Dispatching the `click` `Event` directly at the button in
	// the same evaluate call reaches the registered listener regardless of `disabled`, actually
	// exercising `__rtappsVerdictLocked` — both dispatches run synchronously in the one tick, i.e.
	// as rapidly as two clicks can happen.
	// Wait for the click's recordResult call (fire-and-forget from the hub's own code, not
	// awaited by this test) to actually reach the server before signing out — otherwise
	// navigating away risks aborting its still-in-flight fetch. Waiting for the specific submit
	// response is more direct (and, under a loaded/shared stack, more robust) than a wall-clock
	// `networkidle` wait: started before the dispatch so it can't miss a response that lands fast.
	const submitResponse = page.waitForResponse(
		(res) => res.request().method() === 'POST' && /\/attempts\/[^/]+\/submit$/.test(res.url()),
		{ timeout: 30_000 }
	);
	await hubFrame.evaluate(() => {
		const btn = document.getElementById('releaseClinical')!;
		btn.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
		btn.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
	});
	await submitResponse;
	// Widened timeout: right after tearing down the hub's heavy WebGL context, the client-side
	// navigation to /login can take noticeably longer than the default 5s.
	await signOut(page, { timeout: 20_000 });

	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	// Retrying poll, not a single read: the stats query can lag the submit above slightly under a
	// loaded/shared stack.
	await expect(async () => {
		await page.goto(statsUrl);
		const newText = await page.getByText(/Attempts: \d+ · Students attempted: \d+/).textContent();
		const newAttempts = Number(newText!.match(/Attempts: (\d+)/)![1]);
		expect(newAttempts).toBe(baselineAttempts + 1);
	}).toPass({ timeout: 30_000 });
});
