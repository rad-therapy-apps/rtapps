/**
 * What this file does: the Playwright `setup` project — signs the seeded educator and admin in
 * once per run and saves each session as a `storageState` file under `e2e/.auth/` (gitignored).
 * Used here and why: every e2e login reaches the API from the web container's IP, so all of them
 * share one login rate-limit bucket (burst 10, one token per 6 s). `ui.e2e.ts` runs in four
 * projects and used to sign in ~11 times per project; reusing one session per role keeps the
 * whole run well under the limit without loosening it.
 * How it fits the project: `playwright.config.ts` makes every browser project depend on `setup`,
 * which Playwright runs once per run. The saved cookie is plain `rt_session`, so the Chromium
 * session is reused as-is in Firefox and WebKit. Tests that share a state must never sign out or
 * change that account's password (that would revoke the shared session for everyone after them).
 * Depends on: `./helpers` (signIn), the seeded compose stack (app.seed).
 * Used by: `ui.e2e.ts` (via `educatorState` / `adminState` from `./helpers`).
 */
import { test as setup } from '@playwright/test';
import { adminState, educatorState, signIn } from './helpers';

setup('sign in as the educator', async ({ page }) => {
	await signIn(page, 'educator@example.com', 'rtapps-dev-password');
	await page.context().storageState({ path: educatorState });
});

setup('sign in as the admin', async ({ page }) => {
	await signIn(page, 'admin@example.com', 'rtapps-dev-password');
	await page.context().storageState({ path: adminState });
});
