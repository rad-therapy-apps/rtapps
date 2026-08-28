/**
 * What this file does: the server-only helper for calling the FastAPI backend from SvelteKit —
 * builds the internal request (base URL, cookie, Origin header) and copies the API's
 * `Set-Cookie` responses back onto the browser's response.
 * Used here and why: hand-rolled fetch wrapper (not the generated `@rtapps/api-client`) because
 * `load()`/actions need raw `Response` handling for cookies and RFC 9457 problem bodies before
 * any typed parsing happens.
 * How it fits the project: this is the SSR half of ADR-0002 (same-origin proxy, cookie
 * sessions) — `web` calls `api:8000` directly over the Docker network and relays the session
 * cookie both directions so the browser only ever talks to one origin. See
 * `docs/03-architecture.md` §4.1/§4.2.
 * Depends on: `@sveltejs/kit` (`RequestEvent`), `$env/dynamic/private` (`API_INTERNAL_URL`,
 * `ORIGIN`).
 * Used by: `hooks.server.ts` and every `+layout.server.ts`/`+page.server.ts` under
 * `apps/web/src/routes` that calls the API (auth, subjects, lessons, health).
 */
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_BASE = `${env.API_INTERNAL_URL ?? 'http://api:8000'}/api/v1`;
const ORIGIN = env.ORIGIN ?? 'http://localhost:8080';

export type ApiInit = RequestInit & { cookie?: string };

/** Server-side call to the API. Forwards the browser's cookie so the API sees the session. */
// Overload 1: raw `fetch` + an explicit `cookie` string (used where there's no RequestEvent, e.g. tests).
export async function apiFetch(
	fetch: typeof globalThis.fetch,
	path: string,
	init?: ApiInit
): Promise<Response>;
/**
 * Server-side call to the API using a `RequestEvent`. Forwards the incoming request's cookie and,
 * on non-GET requests, sets `Origin` so the API's CSRF check passes.
 */
// Overload 2: the common case in load()/actions — pass the RequestEvent and the cookie/Origin are derived from it.
export async function apiFetch(
	event: RequestEvent,
	path: string,
	init?: RequestInit
): Promise<Response>;
// Single implementation backing both overloads: branches on whether `source` is a bare fetch function
// or a RequestEvent, since only the latter has a request to read the cookie from and an Origin to set.
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
	// Correlation id set once per request in hooks.server.ts: forwarded so API logs/audit rows
	// can be tied back to the request that triggered them.
	h.set('x-request-id', event.locals.requestId);
	if (!h.has('accept')) h.set('accept', 'application/json');
	// The API's CSRF check (ADR-0002) allow-lists Origin on non-GET requests only; GET is never mutating by convention.
	if ((rest.method ?? 'GET').toUpperCase() !== 'GET') h.set('origin', ORIGIN);
	return event.fetch(`${API_BASE}${path}`, { ...rest, headers: h });
}

/** JSON request helper for form actions: sets content-type, encodes the body, forwards cookie/origin/request id. */
export function apiJson(
	event: RequestEvent,
	path: string,
	body?: unknown,
	method: 'POST' | 'PATCH' | 'DELETE' = 'POST'
): Promise<Response> {
	return apiFetch(event, path, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}

type SameSite = 'lax' | 'strict' | 'none';

/** Copies every `Set-Cookie` header from an API response onto `event.cookies`. */
// Re-parses each raw Set-Cookie header (name/value + attrs) because SvelteKit's `event.cookies.set`
// takes structured options, not a raw header string — the API's session cookie must be relayed
// attribute-for-attribute (HttpOnly/Secure/SameSite/Max-Age) for ADR-0002's cookie session to hold.
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
