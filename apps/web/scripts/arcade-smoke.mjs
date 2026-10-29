// Bundle-eval smoke test for sim-hub built bundle.
// Stubs a minimal DOM/browser environment and imports the built bundle to
// confirm it evaluates top-to-bottom without throwing (module-eval-order crash check).
import { installBrowserStubs } from './lib/browser-stubs.mjs';

// ---------------------------------------------------------------------------
// Driver.
//   node scripts/arcade-smoke.mjs <built-page.html> [...more.html]
//     For each built HTML page, find its <script type="module" src> bundles and
//     evaluate each in a FRESH node process (child mode below), so pages never
//     share global state.
//   node scripts/arcade-smoke.mjs --bundle <bundle.js>
//     Child mode: import one bundle under the stubbed DOM/WebGL environment
//     and report whether it evaluates top-to-bottom without throwing.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
if (args[0] === '--bundle') {
	installBrowserStubs();
	try {
		await import(pathToFileURL(resolve(args[1])).href);
		console.log('SMOKE OK (clean evaluation):', args[1]);
		process.exit(0);
	} catch (err) {
		console.error('SMOKE FAIL (threw during evaluation):', args[1]);
		console.error(err && err.stack ? err.stack : err);
		process.exit(1);
	}
}

const { spawnSync } = await import('node:child_process');
const BUNDLE_TIMEOUT_MS = 120_000;
let failed = 0;
for (const htmlPath of args) {
	const html = readFileSync(htmlPath, 'utf8');
	const srcs = [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
	if (srcs.length === 0) {
		console.error(`SMOKE FAIL: no module script found in ${htmlPath}`);
		failed++;
		continue;
	}
	for (const src of srcs) {
		const rel = src.replace(/^\/arcade\/[^/]+\//, '');
		const bundle = isAbsolute(rel) ? rel : join(dirname(htmlPath), rel);
		// A bundle whose evaluation never settles (e.g. awaiting a request the stubbed fetch never
		// answers) must fail, not hang the CI job: kill each child after BUNDLE_TIMEOUT_MS.
		console.log('SMOKE START:', bundle);
		const run = spawnSync(process.execPath, [process.argv[1], '--bundle', bundle], {
			stdio: 'inherit',
			timeout: BUNDLE_TIMEOUT_MS,
			killSignal: 'SIGKILL'
		});
		if (run.error || run.signal) {
			console.error(`SMOKE TIMEOUT: ${bundle} did not finish within ${BUNDLE_TIMEOUT_MS / 1000}s`);
			failed++;
		} else if (run.status !== 0) failed++;
	}
}
process.exit(failed === 0 ? 0 : 1);
