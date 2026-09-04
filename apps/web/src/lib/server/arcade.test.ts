/**
 * What this file does: unit tests for `resolveArcadeFile`'s slug validation, path traversal
 * defense, and content-type mapping.
 * Used here and why: vitest `server` project — `resolveArcadeFile` is a pure function, no
 * filesystem access needed in tests.
 * How it fits the project: the only test coverage for arcade file resolution security (slug
 * validation, traversal prevention, extension whitelist) used by the `/arcade/<slug>/[...file]`
 * route to serve legacy browser games.
 * Depends on: `./arcade` (resolveArcadeFile), `node:path`, vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveArcadeFile } from './arcade';

const root = '/srv/arcade';

describe('resolveArcadeFile', () => {
	it('serves index.html for an empty rest path', () => {
		expect(resolveArcadeFile(root, 'cell-defender', '')).toEqual({
			filePath: path.resolve(root, 'cell-defender', 'index.html'),
			contentType: 'text/html; charset=utf-8'
		});
	});
	it('maps known extensions', () => {
		expect(resolveArcadeFile(root, 'g', 'a/b.js')?.contentType).toBe('text/javascript');
		expect(resolveArcadeFile(root, 'g', 'x.png')?.contentType).toBe('image/png');
	});
	it('rejects traversal, bad slugs, and unknown extensions', () => {
		expect(resolveArcadeFile(root, 'g', '../../etc/passwd')).toBeNull();
		expect(resolveArcadeFile(root, '..', 'index.html')).toBeNull();
		expect(resolveArcadeFile(root, 'G!', '')).toBeNull();
		expect(resolveArcadeFile(root, 'g', 'x.exe')).toBeNull();
	});
});
