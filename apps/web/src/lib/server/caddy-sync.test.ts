/**
 * What this file does: pins infra/Caddyfile (dev) and infra/Caddyfile.prod's security-header
 * lines to each other.
 * Used here and why: vitest `server` project — pure file reads, no filesystem mocks needed.
 * How it fits the project: #56 — plan 4a's final review caught infra/Caddyfile flipped to
 * SAMEORIGIN while Caddyfile.prod still sent DENY; prod would silently have blocked the
 * arcade iframe. This test fails on any future drift between the two files' header lines.
 * Depends on: `node:fs`, `node:path`, vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// #56: plan 4a's final review caught infra/Caddyfile flipped to SAMEORIGIN while
// Caddyfile.prod still sent DENY — prod would silently have blocked the arcade iframe.
// This pins the two files' security-header lines to each other.
const HEADERS = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];

function headerLines(file: string): string[] {
	const text = fs.readFileSync(path.resolve(__dirname, '../../../../../infra', file), 'utf8');
	return HEADERS.map(
		(h) =>
			text
				.split('\n')
				.find((line) => line.trim().startsWith(h))
				?.trim() ?? `${h}: MISSING`
	);
}

describe('Caddyfile security-header sync', () => {
	it('dev and prod proxies send identical security headers', () => {
		expect(headerLines('Caddyfile')).toEqual(headerLines('Caddyfile.prod'));
	});
});
