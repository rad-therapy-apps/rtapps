import createClient from 'openapi-fetch';
import type { paths } from './schema';

export type { components, paths } from './schema';

/**
 * Browser-side client for the RTApps API on the current origin (session cookie is sent
 * automatically). The generated `paths` type keys requests with the API's own `/api/v1` mount
 * prefix (e.g. `api.GET('/api/v1/subjects')`), so `baseUrl` is left empty and requests resolve
 * relative to the page origin.
 */
export function createApi(fetchImpl?: typeof fetch) {
	return createClient<paths>({ baseUrl: '', credentials: 'same-origin', fetch: fetchImpl });
}
