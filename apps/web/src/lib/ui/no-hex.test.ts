/**
 * What this file does: fails if any platform stylesheet or Svelte style outside the allowed list
 * contains a hard-coded hex colour.
 * Used here and why: the restyle keeps every colour in `src/app.css` tokens so the dark theme,
 * the reading-panel switch and the AA contrast test (`tokens.test.ts`) cover the whole UI; a
 * stray literal would bypass all three. Only CSS is scanned — `.css` files and `.svelte`
 * `<style>` blocks plus `style=`/`fill=`/`stroke=` attributes — with comments stripped, so issue
 * numbers like `#123` in comments or `href="#main"` fragments never trip it.
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md; docs/04-conventions.md
 * "Platform UI" row.
 * Depends on: node:fs. Used by: `pnpm --filter web test` (node project).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../..', import.meta.url)); // apps/web/src
const ALLOWED = new Set(['app.css', 'lib/ui/Logo.svelte']);
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

function* files(dir: string): Generator<string> {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* files(path);
		else if (/\.(svelte|css)$/.test(name)) yield path;
	}
}

/** The CSS a file carries: whole `.css` files; `<style>` blocks and colour attributes in `.svelte`. */
function cssOf(rel: string, source: string): string {
	const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
	if (rel.endsWith('.css')) return noComments(source);
	const styles = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
	const attrs = [...source.matchAll(/\b(?:style|fill|stroke)="([^"]*)"/g)].map((m) => m[1]);
	return noComments([...styles, ...attrs].join('\n'));
}

it('keeps hex colours inside src/app.css (and the logo)', () => {
	const offenders = [...files(SRC)]
		.map((path) => relative(SRC, path).split('\\').join('/'))
		.filter((rel) => !ALLOWED.has(rel))
		.flatMap((rel) =>
			[...cssOf(rel, readFileSync(join(SRC, rel), 'utf8')).matchAll(HEX)].map(
				(m) => `${rel}: ${m[0]}`
			)
		);
	expect(offenders).toEqual([]);
});
