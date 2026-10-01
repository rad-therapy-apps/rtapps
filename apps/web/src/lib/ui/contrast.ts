/**
 * What this file does: WCAG 2.1 relative luminance and contrast ratio for 6-digit hex colours.
 * Used here and why: the token contrast test (`tokens.test.ts`) checks every declared
 * foreground/background pair in `src/app.css` against AA. Plain math with no dependency, since
 * this is the whole formula (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
 * How it fits the project: NFR-16 verification for the UI restyle
 * (docs/specs/2026-10-01-ui-restyle-design.md, Verification).
 * Depends on: nothing. Used by: `tokens.test.ts`, `contrast.test.ts`.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;

/** sRGB relative luminance of a `#rrggbb` colour (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
	if (!HEX.test(hex)) throw new Error(`expected a 6-digit hex colour, got "${hex}"`);
	const [r, g, b] = [1, 3, 5].map((i) => {
		const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#rrggbb` colours, 1–21, order-independent. */
export function contrastRatio(fg: string, bg: string): number {
	const a = relativeLuminance(fg);
	const b = relativeLuminance(bg);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
