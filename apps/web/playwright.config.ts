/**
 * What this file does: the Playwright config for `apps/web`'s end-to-end tests
 * (`apps/web/e2e/*.e2e.ts`, e.g. `lesson.e2e.ts`).
 * Used here and why: no `webServer` entry — unlike a typical Playwright setup that boots the app
 * itself, here the docker-compose stack (proxy + web + api + db) is expected to already be
 * running and is the thing under test, so `baseURL` points at it via `E2E_BASE_URL` instead of a
 * locally spawned dev server; `trace: 'retain-on-failure'` keeps a debuggable trace only when a
 * test actually fails, since traces are otherwise expensive to keep for every run.
 * How it fits the project: exercises the full stack end to end, including the same-origin proxy
 * (ADR-0002) and the real API (ADR-0004 attempts/grading), from the outside — the same surface a
 * browser sees, not a mocked one.
 * Depends on: `@playwright/test`, the running compose stack (`E2E_BASE_URL`, default
 * `http://localhost:8080`).
 * Used by: `pnpm --filter web e2e`; `pr.yml`'s e2e job.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	use: {
		// The already-running compose stack's origin (the proxy, not `web` directly) — falls back
		// to the local dev compose port when E2E_BASE_URL isn't set.
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
		// Only keeps a trace for tests that fail, so passing runs stay cheap to store.
		trace: 'retain-on-failure'
	},
	// A live list reporter while running, plus a static HTML report written to disk afterwards
	// (not auto-opened, so it doesn't block CI).
	reporter: [['list'], ['html', { open: 'never' }]],
	// One retry in CI to absorb flakiness against a real, shared stack; none locally, so a failure
	// surfaces immediately during development.
	retries: process.env.CI ? 1 : 0,
	// Chromium only, matching the vitest browser project's provider.
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
