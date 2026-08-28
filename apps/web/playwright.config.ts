import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
		trace: 'retain-on-failure'
	},
	reporter: [['list'], ['html', { open: 'never' }]],
	retries: process.env.CI ? 1 : 0,
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
