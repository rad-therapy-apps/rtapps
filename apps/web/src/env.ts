/**
 * What this file does: declares the server's environment variables for SvelteKit 3 with
 * `defineEnvVars`; SvelteKit reads it and generates the typed `$app/env/private` module.
 * Used here and why: SENTRY_DSN, API_INTERNAL_URL and ORIGIN are all dynamic (read at runtime,
 * not baked in at build) and private (server-only). Each schema is `(input) => input`, so an
 * unset variable stays `undefined` and the callers' `??` defaults (`src/lib/server/api.ts`) and
 * `if (SENTRY_DSN)` checks (`src/hooks.server.ts`) behave as they did on SvelteKit 2's
 * `$env/dynamic/private`.
 * How it fits the project: the single declaration point for the web server's configuration;
 * `infra/compose.prod.yaml` supplies the values in production.
 * Depends on: `@sveltejs/kit/env` (`defineEnvVars`).
 * Used by: SvelteKit itself (generates `$app/env/private` from this file); the generated module
 * is imported by `src/hooks.server.ts` and `src/lib/server/api.ts`.
 */
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	SENTRY_DSN: { schema: (input) => input },
	API_INTERNAL_URL: { schema: (input) => input },
	ORIGIN: { schema: (input) => input }
});
