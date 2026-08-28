/**
 * What this file does: unit tests for `apiFetch`'s two call shapes and for `relaySetCookie`'s
 * Set-Cookie parsing.
 * Used here and why: vitest `server` project (plain Node, no DOM) — this module only touches
 * `fetch`/`Headers`/`RequestEvent`, never the browser.
 * How it fits the project: guards the SSR half of ADR-0002 (same-origin cookie sessions) — a
 * regression here means the session cookie stops being forwarded or relayed correctly.
 * Depends on: `./api` (apiFetch, relaySetCookie), `@sveltejs/kit` types, vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project, `pr.yml` job `web`).
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch, apiJson, relaySetCookie } from './api';

// Builds a minimal mock RequestEvent: a stubbed fetch, an empty request, and mutable locals
// (so a test can set `event.locals.requestId` before calling apiFetch/apiJson).
function makeEvent(overrides: {
	fetch: (url: string, init: RequestInit) => Promise<Response>;
}): RequestEvent {
	return {
		fetch: overrides.fetch,
		request: new Request('http://x'),
		locals: {} as App.Locals
	} as unknown as RequestEvent;
}

describe('apiFetch', () => {
	// Scenario: the bare-fetch overload with an explicit cookie string.
	// Invariant: the internal API base is prefixed and the cookie header is set verbatim.
	it('prefixes the internal API base and forwards the cookie header', async () => {
		const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
		await apiFetch(fetchMock as unknown as typeof fetch, '/health', { cookie: 'rt_session=abc' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('http://api:8000/api/v1/health');
		expect(new Headers(init.headers).get('cookie')).toBe('rt_session=abc');
	});

	// Scenario: the RequestEvent overload with a mutating (non-GET) request.
	// Invariant: the cookie is forwarded from the incoming request and Origin is set for the API's CSRF check.
	it('given a RequestEvent, forwards the cookie header and sets Origin on non-GET', async () => {
		const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
		const event = {
			fetch: fetchMock,
			request: new Request('http://x', { headers: { cookie: 'rt_session=t' } }),
			locals: { requestId: 'rid-0' }
		} as unknown as RequestEvent;

		await apiFetch(event, '/auth/logout', { method: 'POST' });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('http://api:8000/api/v1/auth/logout');
		const headers = new Headers(init.headers);
		expect(headers.get('cookie')).toBe('rt_session=t');
		expect(headers.get('origin')).toBe('http://localhost:8080');
	});

	// Scenario: a request via apiJson, with a per-request correlation id set on locals.
	// Invariant: x-request-id, content-type and origin are all set, and the body is JSON-encoded.
	it('forwards the request id on every call and JSON-encodes apiJson bodies', async () => {
		const calls: { url: string; init: RequestInit }[] = [];
		const event = makeEvent({
			fetch: async (url: string, init: RequestInit) => {
				calls.push({ url, init });
				return new Response('{}');
			}
		});
		event.locals.requestId = 'rid-1';
		await apiJson(event, '/cohorts', { name: 'X' });
		const h = new Headers(calls[0].init.headers);
		expect(h.get('x-request-id')).toBe('rid-1');
		expect(h.get('content-type')).toBe('application/json');
		expect(h.get('origin')).toBe('http://localhost:8080');
		expect(calls[0].init.method).toBe('POST');
		expect(calls[0].init.body).toBe('{"name":"X"}');
	});
});

describe('relaySetCookie', () => {
	// Scenario: a live session cookie with the full attribute set.
	// Invariant: attributes are parsed correctly and `cookies.set` is called, not `delete`.
	it('copies a Set-Cookie header onto event.cookies with parsed attributes', () => {
		const set = vi.fn();
		const del = vi.fn();
		const event = { cookies: { set, delete: del } } as unknown as RequestEvent;
		const headers = new Headers();
		headers.append(
			'set-cookie',
			'rt_session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600'
		);
		const res = new Response(null, { headers });

		relaySetCookie(event, res);

		expect(set).toHaveBeenCalledTimes(1);
		expect(set).toHaveBeenCalledWith('rt_session', 'abc123', {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 3600
		});
		expect(del).not.toHaveBeenCalled();
	});

	// Scenario: a logout/clear response (Max-Age=0).
	// Invariant: the cookie is deleted, not set with an empty value.
	it('deletes the cookie when Max-Age=0', () => {
		const set = vi.fn();
		const del = vi.fn();
		const event = { cookies: { set, delete: del } } as unknown as RequestEvent;
		const headers = new Headers();
		headers.append('set-cookie', 'rt_session=; Path=/; Max-Age=0');
		const res = new Response(null, { headers });

		relaySetCookie(event, res);

		expect(del).toHaveBeenCalledTimes(1);
		expect(del).toHaveBeenCalledWith('rt_session', { path: '/' });
		expect(set).not.toHaveBeenCalled();
	});
});
