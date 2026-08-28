/**
 * What this file does: Vite + Vitest configuration for the SvelteKit app — the build (adapter-node
 * for the Docker image), the dev server, SSR bundling rules, and the two test projects.
 * Used here and why: `@sveltejs/adapter-node` because production runs `node build` in a container
 * (ADR-0005); Svelte 5 runes forced on for our own code; `ssr.noExternal` for the workspace
 * client package, which ships TypeScript source that Node could not load at runtime; Vitest
 * "projects" so DOM components run in a real Chromium (browser project) while pure TS runs in
 * Node (server project).
 * How it fits the project: docs/03-architecture.md §11 (testing) and §10 (deployment).
 * Works with: package.json scripts (dev/build/test), playwright.config.ts (e2e is separate from
 * Vitest), apps/web/Dockerfile (runs `pnpm --filter web build`), packages/api-client (noExternal).
 * Used by: `pnpm --filter web dev|build|test`, the CI `web`/`images`/`e2e` jobs.
 */
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	// SvelteKit's Vite plugin does routing, SSR and the Svelte compiler; options below tune it.
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node: `pnpm build` emits build/index.js, started with `node build` in the image.
			adapter: adapter()
		})
	],
	// Bundle the workspace client into the SSR build: it is published as .ts source, so leaving it
	// external would make Node `import` a TypeScript file at runtime (see packages/api-client/README).
	ssr: { noExternal: ['@rtapps/api-client'] },
	// Playwright writes reports/traces into this directory while the dev server (bind-mounted in
	// compose) is running; without this Vite sees new .html files and forces page reloads mid-test.
	server: { watch: { ignored: ['**/playwright-report/**', '**/test-results/**'] } },
	// Vitest: every test must assert something; two projects split by environment.
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				// Browser project: *.svelte.spec.ts run inside headless Chromium via Playwright, so
				// component tests exercise real DOM/a11y behaviour; server-only modules are excluded.
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				// Node project: plain *.test.ts (guards, helpers, schema fixtures) with no DOM.
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
