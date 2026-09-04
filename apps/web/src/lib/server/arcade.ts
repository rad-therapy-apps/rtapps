/**
 * What this file does: pure arcade file resolver — maps a slug and relative path to a real
 * file inside root/<slug>/, with slug validation, path traversal defense, and extension
 * allowlist.
 * Used here and why: kept as a plain function (no filesystem access, no routing) specifically
 * so it's unit-testable without SvelteKit or filesystem mocks.
 * How it fits the project: security foundation for the `/arcade/<slug>/[...file]` route that
 * serves legacy browser games — validates slugs, prevents `..` escape sequences, and blocks
 * unlisted file types (e.g., `.exe`, `.sh`).
 * Depends on: `node:path` (for POSIX/Windows path resolution and normalization).
 * Used by: `apps/web/src/routes/(app)/arcade/[slug]/[...file]/+server.ts`.
 */
import path from 'node:path';

/** Extension → Content-Type allow-map; anything not listed here 404s. */
export const ARCADE_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.json': 'application/json',
	'.woff2': 'font/woff2'
};

/** Resolve a request to a real file inside root/<slug>/, or null (→ 404). Containment is
 *  checked on the RESOLVED path, so `..` segments can never escape the slug directory. */
export function resolveArcadeFile(
	root: string,
	slug: string,
	rest: string
): { filePath: string; contentType: string } | null {
	if (!/^[a-z0-9-]+$/.test(slug)) return null;
	const slugDir = path.resolve(root, slug);
	const filePath = path.resolve(slugDir, rest === '' ? 'index.html' : rest);
	if (filePath !== slugDir && !filePath.startsWith(slugDir + path.sep)) return null;
	const contentType = ARCADE_TYPES[path.extname(filePath).toLowerCase()];
	if (!contentType) return null;
	return { filePath, contentType };
}
