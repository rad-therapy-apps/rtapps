// What this file does: standalone Vite build config for the arcade source trees
// (arcade-src/*) — bundles each app back into apps/web/arcade/<app>/ as the same
// static index.html + assets the auth-gated arcade route has always served.
// Used here and why: kept separate from vite.config.ts (the SvelteKit app build);
// `pnpm build:arcade` runs it, and the main `build`/`dev` scripts chain it first.
// How it fits: output is gitignored; Docker/CI produce it via `pnpm --filter web build`.
import { defineConfig } from 'vite';

export default defineConfig({
	root: 'arcade-src/sim-hub',
	base: '/arcade/sim-hub/',
	build: {
		outDir: '../../arcade/sim-hub',
		emptyOutDir: true
	}
});
