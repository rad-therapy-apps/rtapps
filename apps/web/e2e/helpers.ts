/**
 * What this file does: shared Playwright helpers for the e2e specs — signing in/out and
 * registering a fresh student account, the sequences every spec needed before it could get to
 * the flow it actually tests.
 * Used here and why: each spec (`lesson.e2e.ts`, `cohort.e2e.ts`) previously duplicated the same
 * register-a-student and (in `cohort.e2e.ts`) sign-in/sign-out steps inline; centralising them
 * here means the locators only need updating in one place if the auth forms change.
 * How it fits the project: docs/03-architecture.md §11 (End-to-end row).
 * Depends on: `@playwright/test`.
 * Used by: `lesson.e2e.ts`, `cohort.e2e.ts` (and Task 17's `quiz.e2e.ts`).
 */
import { expect, type Page } from '@playwright/test';

/** Registers a brand-new student account via `/register` and waits for the signed-in home page. */
export async function registerStudent(
	page: Page,
	{ email, password, name }: { email: string; password: string; name: string }
): Promise<void> {
	await page.goto('/register');
	// Wait for hydration (module requests to finish) before typing: values entered into the
	// server-rendered form before Svelte hydrates are reset by the `value={…}` bindings.
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Display name').fill(name);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Register' }).click();
	await expect(page).toHaveURL(/\/home$/);
}

/** Signs in an existing account via `/login` and waits for the signed-in home page. */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/home$/);
}

/**
 * Signs out via the root layout's sign-out form and waits for the login page. `timeout` widens
 * the default wait — needed right after a heavy three.js page (long-tail.e2e.ts's hub visits),
 * where the client-side navigation to /login can take longer than the default 5s while the
 * browser tears down the outgoing WebGL context.
 */
export async function signOut(page: Page, options?: { timeout?: number }): Promise<void> {
	await page.getByRole('button', { name: 'Sign out' }).click(); // root layout form → POST /logout
	await expect(page).toHaveURL(/\/login$/, { timeout: options?.timeout });
}
