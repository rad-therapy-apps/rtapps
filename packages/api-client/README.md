# @rtapps/api-client

Generated `openapi-fetch` client for the RTApps API. `openapi.json` and `src/schema.d.ts` are
generated artifacts — do not hand-edit them.

Regenerate with `make client` from the repo root (requires the api's Python deps synced via
`uv sync` in `apps/api`). The `contract` CI job fails if regenerating produces a diff, so run it
after any change to the API's routes or schemas and commit the result.

## Using it from SvelteKit

The package ships TypeScript source (`src/index.ts`), not compiled JS. Browser code bundles it fine. Any **server-side** import (`+page.server.ts`, `hooks.server.ts`) must be listed in `apps/web/vite.config.ts` under `ssr.noExternal` so Vite bundles it into the SSR build — otherwise Node would try to load the `.ts` file at runtime in the production image. Type-only imports (`import type { components }`) are erased and need nothing.
