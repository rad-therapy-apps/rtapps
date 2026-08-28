/**
 * What this file does: exports a typed `openapi-fetch` client factory for the RTApps API.
 *
 * Used here and why: `paths`/`components` (below) are generated, not hand-written — see
 * `./schema` — from `apps/api`'s OpenAPI document, so request/response shapes stay in
 * sync with the actual FastAPI routes. `baseUrl` is left empty because the generated
 * `paths` type already keys requests with the API's own `/api/v1` mount prefix (e.g.
 * `api.GET('/api/v1/subjects')`), so requests resolve relative to the page origin
 * instead of a separate API host — this only works because the Caddy proxy
 * (infra/Caddyfile) serves both web and api from one origin (ADR-0002).
 * `credentials: 'same-origin'` sends the session cookie automatically on same-origin
 * requests without exposing it to any other origin.
 *
 * How it fits the project: docs/03-architecture.md §7 (API) and §9 (this package is
 * `packages/api-client/` — "generated from openapi.json — never edited by hand", except
 * for this hand-written `index.ts` wrapper); ADR-0005 (single-origin deployment is what
 * makes `baseUrl: ''` valid in every environment, not just dev).
 *
 * Works with / Depends on: `./schema` (the generated `paths`/`components` types,
 * produced by `make client` from `apps/api/app/openapi_export.py`'s OpenAPI dump).
 * Used by: `apps/web/src/lib/lesson/api.ts` (`export const api = createApi()`), and the
 * `contract` CI job (`.github/workflows/pr.yml`) diffs this package after `make client`
 * to catch drift between the API and this generated/wrapper client.
 */
import createClient from 'openapi-fetch';
import type { paths } from './schema';

export type { components, paths } from './schema';

/**
 * Builds the browser-side API client. Accepts an optional `fetch` override for
 * testing/SSR; `fetchImpl` defaults to `undefined`, which makes `openapi-fetch` fall
 * back to the ambient global `fetch` (the browser's) when no override is given.
 */
export function createApi(fetchImpl?: typeof fetch) {
	return createClient<paths>({ baseUrl: '', credentials: 'same-origin', fetch: fetchImpl });
}
