// What this file does: Vite build for the linac-ct arcade app — a multi-page build
// (parent shell + the un-embedded CT operator console) from arcade-src/linac-ct/
// back into apps/web/arcade/linac-ct/, the same paths the arcade route has always
// served. public/ carries the CT PNGs + the static DICOM review page verbatim, so
// /arcade/linac-ct/assets/ct-1.png keeps its e2e-asserted URL.
// Used here and why: a second config (vs. extending vite.arcade.config.ts) because
// Vite has one root per build and sim-hub/linac-ct need different roots; the
// build:arcade script chains both. Three.js versions stay per-app via the
// three-linac/three-ct npm aliases in package.json — no resolve.alias needed.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	root: 'arcade-src/linac-ct',
	base: '/arcade/linac-ct/',
	build: {
		outDir: '../../arcade/linac-ct',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				index: fileURLToPath(new URL('./arcade-src/linac-ct/index.html', import.meta.url)),
				'ct-suite': fileURLToPath(new URL('./arcade-src/linac-ct/ct-suite.html', import.meta.url))
			}
		}
	}
});
