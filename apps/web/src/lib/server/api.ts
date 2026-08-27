import { env } from '$env/dynamic/private';

const API_BASE = `${env.API_INTERNAL_URL ?? 'http://api:8000'}/api/v1`;

export type ApiInit = RequestInit & { cookie?: string };

/** Server-side call to the API. Forwards the browser's cookie so the API sees the session. */
export async function apiFetch(fetch: typeof globalThis.fetch, path: string, init: ApiInit = {}) {
	const { cookie, headers, ...rest } = init;
	const h = new Headers(headers);
	if (cookie) h.set('cookie', cookie);
	if (!h.has('accept')) h.set('accept', 'application/json');
	return fetch(`${API_BASE}${path}`, { ...rest, headers: h });
}
