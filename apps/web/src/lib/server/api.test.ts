import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';

describe('apiFetch', () => {
	it('prefixes the internal API base and forwards the cookie header', async () => {
		const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
		await apiFetch(fetchMock as unknown as typeof fetch, '/health', { cookie: 'rt_session=abc' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('http://api:8000/api/v1/health');
		expect(new Headers(init.headers).get('cookie')).toBe('rt_session=abc');
	});
});
