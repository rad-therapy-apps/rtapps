/**
 * What this file does: the Prettier config for `apps/web` — indentation, quote style, and the
 * Svelte-aware parser override.
 * Used here and why: `useTabs: true` is why every file in this codebase is tab-indented (all
 * HTML-style and JSDoc-style header comments added across the project follow the same tabs); `prettier-plugin-svelte`
 * plus the `*.svelte` override give `.svelte` files (including their `<script>`/`<style>` blocks
 * and any header comment) Svelte-aware formatting instead of being parsed as plain HTML.
 * How it fits the project: enforced by `pnpm --filter web lint` (`prettier --check .`) and
 * `pnpm --filter web format` (`prettier --write .`), both part of `pr.yml` job `web`.
 * Depends on: `prettier-plugin-svelte`.
 * Used by: `prettier` CLI (`lint`/`format` scripts), editors via the Prettier extension.
 */
/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	plugins: ['prettier-plugin-svelte'],
	// Without this, .svelte files would be formatted with Prettier's default HTML parser instead
	// of the Svelte-aware one, mangling `<script>`/`<style>` blocks and template expressions.
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }]
};

export default config;
