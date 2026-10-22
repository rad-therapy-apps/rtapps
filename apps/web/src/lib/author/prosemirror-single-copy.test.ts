/**
 * What this file does: fails if pnpm-lock.yaml resolves a ProseMirror core package to more than
 * one version.
 * Used here and why: two copies of prosemirror-model (or state/transform/view) make the editor's
 * `instanceof` checks fail across them — TipTap commands then throw "Can not convert <> to a
 * Fragment" and, behind a toolbar button, silently do nothing. A partial update (e.g. a
 * Dependabot group bumping only @tiptap/*) can leave such duplicates; `pnpm dedupe` fixes them.
 * How it fits the project: #153 — TipTap 3.32.0 raised its prosemirror-model floor and the
 * callout button stopped wrapping; the RichTextEditor spec caught it, but only via that symptom.
 * Depends on: `node:fs`, `node:path`, `../server/repo-root` (`repoRoot`), vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../server/repo-root';

const CORE = [
	'prosemirror-model',
	'prosemirror-state',
	'prosemirror-transform',
	'prosemirror-view'
];

describe('ProseMirror core packages', () => {
	// The `packages:` section lists each resolved version once, as `  name@version:`.
	const packages = fs
		.readFileSync(path.join(repoRoot(__dirname), 'pnpm-lock.yaml'), 'utf8')
		.split('\nsnapshots:\n')[0];

	it.each(CORE)('the lockfile resolves %s to exactly one version', (name) => {
		const versions = [...packages.matchAll(new RegExp(`^  ${name}@([^:(]+):$`, 'gm'))].map(
			(m) => m[1]
		);
		expect(
			versions,
			`${name} resolves to ${versions.length} versions (${versions.join(', ')}): run \`pnpm dedupe\``
		).toHaveLength(1);
	});
});
