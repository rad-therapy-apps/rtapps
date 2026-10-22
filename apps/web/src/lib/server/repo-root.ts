/**
 * What this file does: finds the monorepo root (the directory holding pnpm-workspace.yaml).
 * Used here and why: tests that read repo files (infra/, pnpm-lock.yaml) anchor on it instead of a
 * fixed number of `..` hops, so moving a test file doesn't silently change the resolved path.
 * How it fits the project: test-only helper for the vitest `server` project (#61, #153).
 * Depends on: `node:fs`, `node:path`.
 * Used by: `./caddy-sync.test.ts`, `../author/prosemirror-single-copy.test.ts`.
 */
import fs from 'node:fs';
import path from 'node:path';

export function repoRoot(start: string = __dirname): string {
	let dir = start;
	while (!fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
		const parent = path.dirname(dir);
		if (parent === dir) throw new Error('pnpm-workspace.yaml not found above ' + start);
		dir = parent;
	}
	return dir;
}
