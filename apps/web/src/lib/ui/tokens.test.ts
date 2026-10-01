/**
 * What this file does: checks every declared foreground/background token pair in `src/app.css`
 * against WCAG 2.1 AA (4.5:1 text, 3:1 UI component boundaries and large text).
 * Used here and why: reads the stylesheet's `:root` block as text, so the check runs on the real
 * shipped values with no browser. Each pair here is a pairing the UI actually uses; adding a new
 * text/background combination to the UI means adding it here.
 * How it fits the project: NFR-16 (docs/02-requirements.md), the UI restyle spec's "token
 * contrast test" (docs/specs/2026-10-01-ui-restyle-design.md).
 * Depends on: `./contrast`, `src/app.css`. Used by: `pnpm --filter web test` (node project).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';

const css = readFileSync(new URL('../../app.css', import.meta.url), 'utf8');
const rootBlock = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
const tokens = new Map(
	[...rootBlock.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]])
);

const TEXT = 4.5;
const UI = 3;

// [foreground token, background token, minimum ratio]
const PAIRS: [string, string, number][] = [
	// Body and muted text on every surface
	...['bg', 'surface', 'surface-raised', 'accent-soft'].flatMap(
		(bg): [string, string, number][] => [
			['text', bg, TEXT],
			['text-muted', bg, TEXT],
			['accent', bg, TEXT]
		]
	),
	// Primary button: text on accent (rest and hover)
	['accent-contrast', 'accent', TEXT],
	['accent-contrast', 'accent-strong', TEXT],
	// Control boundaries (inputs, secondary buttons) and the focus ring
	...['bg', 'surface', 'surface-raised'].flatMap((bg): [string, string, number][] => [
		['border-strong', bg, UI],
		['accent', bg, UI]
	]),
	// Status text: on its own tinted background, and inline on page surfaces
	...['success', 'warning', 'danger', 'info'].flatMap((s): [string, string, number][] => [
		[s, `${s}-bg`, TEXT],
		[s, 'bg', TEXT],
		[s, 'surface', TEXT],
		[s, 'surface-raised', TEXT],
		['text', `${s}-bg`, TEXT]
	]),
	// Reading panel: dark paper (default) and light paper
	...['paper', 'paper-light'].flatMap((p): [string, string, number][] => [
		[`${p}-text`, `${p}-bg`, TEXT],
		[`${p}-muted`, `${p}-bg`, TEXT],
		[`${p}-link`, `${p}-bg`, TEXT],
		[`${p}-text`, `${p}-th-bg`, TEXT],
		[`${p}-link`, `${p}-th-bg`, TEXT],
		...['kp', 'cn', 'warn'].flatMap((k): [string, string, number][] => [
			[`${p}-text`, `${p}-callout-${k}-bg`, TEXT],
			[`${p}-muted`, `${p}-callout-${k}-bg`, TEXT],
			[`${p}-link`, `${p}-callout-${k}-bg`, TEXT],
			[`${p}-callout-${k}-bar`, `${p}-bg`, UI]
		])
	]),
	// Subject tags
	...[1, 2, 3, 4, 5, 6].map((n): [string, string, number] => [`tag-${n}-fg`, `tag-${n}-bg`, TEXT])
];

describe('design tokens (src/app.css :root)', () => {
	it('declares every token the contrast pairs reference', () => {
		const missing = [...new Set(PAIRS.flatMap(([fg, bg]) => [fg, bg]))].filter(
			(name) => !tokens.has(name)
		);
		expect(missing).toEqual([]);
	});

	it.each(PAIRS)('--%s on --%s meets %s:1', (fg, bg, min) => {
		const ratio = contrastRatio(tokens.get(fg)!, tokens.get(bg)!);
		expect(ratio).toBeGreaterThanOrEqual(min);
	});
});
