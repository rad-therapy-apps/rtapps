import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch, relaySetCookie } from './api';

describe('apiFetch', () => {
	it('prefixes the internal API base and forwards the cookie header', async () => {
		const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
		await apiFetch(fetchMock as unknown as typeof fetch, '/health', { cookie: 'rt_session=abc' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('http://api:8000/api/v1/health');
		expect(new Headers(init.headers).get('cookie')).toBe('rt_session=abc');
	});

	it('given a RequestEvent, forwards the cookie header and sets Origin on non-GET', async () => {
		const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
		const event = {
			fetch: fetchMock,
			request: new Request('http://x', { headers: { cookie: 'rt_session=t' } })
		} as unknown as RequestEvent;

		await apiFetch(event, '/auth/logout', { method: 'POST' });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('http://api:8000/api/v1/auth/logout');
		const headers = new Headers(init.headers);
		expect(headers.get('cookie')).toBe('rt_session=t');
		expect(headers.get('origin')).toBe('http://localhost:8080');
	});
});

describe('relaySetCookie', () => {
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
