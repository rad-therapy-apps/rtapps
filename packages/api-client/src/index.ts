import createClient from 'openapi-fetch';
import type { paths } from './schema';

export type { components, paths } from './schema';

/** Browser-side client for the RTApps API on the current origin (session cookie is sent automatically). */
export function createApi(fetchImpl?: typeof fetch) {
	return createClient<paths>({ baseUrl: '/api/v1', credentials: 'same-origin', fetch: fetchImpl });
}
