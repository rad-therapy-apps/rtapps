import { test, expect } from '@playwright/test';

test('register, complete a lesson, answer a question, and see the score', async ({ page }) => {
	const email = `e2e-${Date.now()}@example.edu`;
	const password = 'password-1234';
	const displayName = 'E2E Student';

	await page.goto('/register');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Display name').fill(displayName);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Register' }).click();

	await expect(page).toHaveURL(/\/home$/);

	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await expect(page).toHaveURL(/\/subjects$/);

	await page.getByRole('link', { name: 'Radiation Biology' }).click();
	await page.getByRole('link', { name: 'RBE and OER' }).click();

	await expect(page.getByText('Page 1 of 7')).toBeVisible();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByText('Page 2 of 7')).toBeVisible();

	await page.getByLabel('RBE actually decreases past that point').check();
	await page.getByRole('button', { name: 'Check answer' }).click();
	await expect(page.getByText('Correct')).toBeVisible();

	for (let i = 0; i < 5; i++) {
		await page.getByRole('button', { name: 'Next' }).click();
	}
	await expect(page.getByText('Page 7 of 7')).toBeVisible();

	await page.getByRole('button', { name: 'Finish lesson' }).click();
	await expect(page.getByText('Score: 1 / 2')).toBeVisible();

	await page.getByRole('link', { name: 'Back to home' }).click();
	await expect(page).toHaveURL(/\/home$/);

	const row = page.getByRole('row').filter({ hasText: 'RBE and OER' });
	await expect(row).toContainText('50');
});
