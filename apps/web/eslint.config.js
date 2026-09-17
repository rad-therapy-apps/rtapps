/**
 * What this file does: the ESLint flat config for `apps/web` — base JS/TS rules, Svelte-aware
 * linting, and project-specific rule overrides.
 * Used here and why: `eslint/config`'s `defineConfig`/`includeIgnoreFile` compose the config
 * array and reuse `.gitignore` as the ignore list instead of duplicating it; `svelte.configs.recommended`
 * brings in `svelte/no-navigation-without-resolve` (requires internal `<a href>`/`goto()` targets
 * to go through `resolve()`, see `LessonPager.svelte`'s "Back to home" link) and
 * `svelte/no-at-html-tags` (already `error` there by default; restated below for emphasis, since
 * ADR-0003's renderer must never use `{@html}`) among others.
 * How it fits the project: enforced by `pnpm --filter web lint` (also runs `prettier --check`),
 * which is `pr.yml` job `web`'s lint step.
 * Depends on: `eslint-config-prettier`, `@eslint/js`, `eslint-plugin-svelte`, `eslint/config`,
 * `globals`, `typescript-eslint`, `./.gitignore`.
 * Used by: `pnpm --filter web lint`; editors via the ESLint extension.
 */
import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	// Reuses .gitignore as ESLint's ignore list instead of maintaining a second one.
	includeIgnoreFile(gitignorePath),
	// Migrated legacy arcade games (plan 4b): committed, but not linted or reformatted —
	// same treatment as .prettierignore's `/arcade/` entry. Multi-file games' standalone
	// script.js files would otherwise surface the legacy code's own unused-var etc. lint
	// errors, which are out of scope to fix here (surgical-copy games, not authored code).
	{ ignores: ['arcade/**'] },
	// Base rule sets: ESLint's own recommended rules, typescript-eslint's recommended rules, and
	// eslint-plugin-svelte's recommended rules (includes svelte/no-navigation-without-resolve,
	// svelte/no-at-html-tags at its default severity, etc).
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	// Turns off any base rule that conflicts with Prettier's formatting (must come after the rule
	// sets above so it can override them), for both plain JS/TS and Svelte files.
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	// Type-aware parsing for Svelte and Svelte-flavoured files: `projectService` gives the
	// TypeScript parser access to tsconfig-driven type info inside `<script>` blocks.
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			// Already 'error' in svelte.configs.recommended; restated explicitly here since
			// ADR-0003's prose renderer must never use {@html} — that's the whole
			// XSS-by-construction guarantee, so this rule is deliberately not left implicit.
			'svelte/no-at-html-tags': 'error'
		}
	},
	// sim-hub's extracted modules (#77 modularization): plain (non-TS) browser JS, so unlike the
	// rest of the project no-undef is worth its keep here — it's what caught 3 ReferenceErrors
	// left behind by the extraction. Re-enabled for just this tree rather than disabling it in the
	// catch-all block above.
	{
		files: ['arcade-src/**/*.js'],
		rules: {
			'no-undef': 'error',
			// linac-ct's mechanical move (#77 phase 2, PR1) carries a `// @ts-nocheck -- <reason>`
			// first-line header on each verbatim-moved legacy script (removed at TS conversion, PR4).
			// `allow-with-description` permits only the described form, not a bare @ts-nocheck.
			'@typescript-eslint/ban-ts-comment': ['error', { 'ts-nocheck': 'allow-with-description' }]
		}
	}
);
