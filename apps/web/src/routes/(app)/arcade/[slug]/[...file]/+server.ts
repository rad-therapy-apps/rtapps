/**
 * What this file does: auth-gated route handler for arcade game file serving — resolves
 * slugs and relative paths to files in the arcade directory, validates user auth, and serves
 * files with proper Content-Type headers.
 * Used here and why: SvelteKit `RequestHandler` serves `GET /arcade/<slug>/` (serves
 * `index.html`) and `GET /arcade/<slug>/<file>` (serves allow-listed types).
 * How it fits the project: completes the arcade game serving feature started in Task 3 —
 * pairs with hooks.server.ts's deny-by-default guard to require user authentication before
 * serving any arcade files. Tasks 4/5/8 build on this route's URL shape `/arcade/<slug>/`.
 * Depends on: `$lib/server/arcade` (resolveArcadeFile, readArcadeFile), `@sveltejs/kit` (error,
 * RequestHandler types), `node:path` (path resolution).
 * Used by: SvelteKit router, hooks.server.ts authorization flow.
 */
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { cacheControlFor, readArcadeFile, resolveArcadeFile } from '$lib/server/arcade';
import type { RequestHandler } from './$types';

// cwd is apps/web in dev/tests and /app in the production image (Dockerfile WORKDIR),
// and `arcade/` sits directly under both — see package.json "files".
const ARCADE_ROOT = path.resolve(process.cwd(), 'arcade');

export const GET: RequestHandler = ({ params, locals }) => {
	// hooks.server.ts already redirects anonymous users off /arcade/*; this 401 is defense
	// in depth in case the guard's path rules ever change.
	if (!locals.user) throw error(401, 'Not signed in');
	const resolved = resolveArcadeFile(ARCADE_ROOT, params.slug, params.file);
	if (!resolved) throw error(404, 'Not found');
	const body = readArcadeFile(resolved.filePath);
	if (!body) throw error(404, 'Not found');
	// Copy into a plain-ArrayBuffer-backed Uint8Array: Response's BodyInit rejects Buffer's
	// ArrayBufferLike typing. Game files are small; a per-request copy is fine at this scale.
	return new Response(new Uint8Array(body), {
		headers: {
			'Content-Type': resolved.contentType,
			'Cache-Control': cacheControlFor(path.extname(resolved.filePath).toLowerCase())
		}
	});
};
