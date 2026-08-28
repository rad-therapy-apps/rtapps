import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_BASE = `${env.API_INTERNAL_URL ?? 'http://api:8000'}/api/v1`;
const ORIGIN = env.ORIGIN ?? 'http://localhost:8080';

export type ApiInit = RequestInit & { cookie?: string };

/** Server-side call to the API. Forwards the browser's cookie so the API sees the session. */
export async function apiFetch(
	fetch: typeof globalThis.fetch,
	path: string,
	init?: ApiInit
): Promise<Response>;
/**
 * Server-side call to the API using a `RequestEvent`. Forwards the incoming request's cookie and,
 * on non-GET requests, sets `Origin` so the API's CSRF check passes.
 */
export async function apiFetch(
	event: RequestEvent,
	path: string,
	init?: RequestInit
): Promise<Response>;
export async function apiFetch(
	source: RequestEvent | typeof globalThis.fetch,
	path: string,
	init: ApiInit = {}
): Promise<Response> {
	if (typeof source === 'function') {
		const { cookie, headers, ...rest } = init;
		const h = new Headers(headers);
		if (cookie) h.set('cookie', cookie);
		if (!h.has('accept')) h.set('accept', 'application/json');
		return source(`${API_BASE}${path}`, { ...rest, headers: h });
	}

	const event = source;
	const { headers, ...rest } = init;
	const h = new Headers(headers);
	const cookie = event.request.headers.get('cookie');
	if (cookie) h.set('cookie', cookie);
	if (!h.has('accept')) h.set('accept', 'application/json');
	if ((rest.method ?? 'GET').toUpperCase() !== 'GET') h.set('origin', ORIGIN);
	return event.fetch(`${API_BASE}${path}`, { ...rest, headers: h });
}

type SameSite = 'lax' | 'strict' | 'none';

/** Copies every `Set-Cookie` header from an API response onto `event.cookies`. */
export function relaySetCookie(event: RequestEvent, res: Response): void {
	for (const raw of res.headers.getSetCookie()) {
		const [nameValue, ...attrs] = raw.split(';').map((part) => part.trim());
		const eq = nameValue.indexOf('=');
		const name = nameValue.slice(0, eq);
		const value = nameValue.slice(eq + 1);

		let path: string | undefined;
		let httpOnly = false;
		let secure = false;
		let sameSite: SameSite | undefined;
		let maxAge: number | undefined;
		let expires: Date | undefined;

		for (const attr of attrs) {
			const attrEq = attr.indexOf('=');
			const key = (attrEq === -1 ? attr : attr.slice(0, attrEq)).toLowerCase();
			const val = attrEq === -1 ? undefined : attr.slice(attrEq + 1);
			switch (key) {
				case 'path':
					path = val;
					break;
				case 'httponly':
					httpOnly = true;
					break;
				case 'secure':
					secure = true;
					break;
				case 'samesite':
					sameSite = val?.toLowerCase() as SameSite | undefined;
					break;
				case 'max-age':
					maxAge = val === undefined ? undefined : Number(val);
					break;
				case 'expires':
					expires = val === undefined ? undefined : new Date(val);
					break;
			}
		}

		const cookiePath = path ?? '/';
		const isExpired = maxAge === 0 || (expires !== undefined && expires.getTime() <= Date.now());
		if (isExpired) {
			event.cookies.delete(name, { path: cookiePath });
		} else {
			event.cookies.set(name, value, { path: cookiePath, httpOnly, secure, sameSite, maxAge });
		}
	}
}
