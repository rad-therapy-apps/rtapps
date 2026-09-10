/**
 * What this file does: tests for the real shipped `rtapps-sdk.js` (plan 4c, the "A pattern")
 * loaded via a Vite `?raw` import and evaluated with `new Function(source)()` against a stubbed
 * `window.fetch` — no mock/reimplementation of the SDK, the actual served file under test.
 * Used here and why: vitest `client` browser project (real Chromium) because the SDK reads
 * `window`/`crypto.randomUUID` as unqualified globals — `new Function` executes in the global
 * scope, so those only resolve against a real `window`, not a Node `environment: 'node'` test.
 * Each case asserts the exact `fetch` call sequence (URL, method, body, headers), not just the
 * resolved value, since the SDK's whole job is chaining the right requests together.
 * How it fits the project: covers Task 2 of plan 4c — the simulator SDK Tasks 3/5 include via one
 * `<script>` tag and call as `window.RTApps.recordResult`/`window.RTApps.activityUrl`.
 * Depends on: `../../../static/arcade/rtapps-sdk.js` (real file, `?raw`), vitest `client` project.
 * Used by: `pnpm --filter web test` (vitest `client` project).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
// Vite ?raw import pulls the actual shipped file's source.
import sdkSource from '../../../static/arcade/rtapps-sdk.js?raw';

function loadSdk() {
	// Evaluate the real IIFE against the current window (fetch already stubbed).
	new Function(sdkSource)();
}

function jsonResponse(body: unknown, status = 200) {
	return { ok: status >= 200 && status < 300, status, json: async () => body };
}
type FetchResponse = ReturnType<typeof jsonResponse>;
// Explicit generic keeps `fetchMock.mock.calls[n]` typed as `[url, init?]` even in tests whose
// implementation only reads `url` — the second (unused) param would otherwise trip
// @typescript-eslint/no-unused-vars if declared directly on the implementation.
type FetchImpl = (url: string, init?: RequestInit) => Promise<FetchResponse>;

const RESOLVER_INFO = {
	activity_id: 'activity-1',
	subject_slug: 'ct-basics',
	completion_only: false,
	max_score: 10
};

declare global {
	interface Window {
		RTApps: {
			recordResult: (
				slug: string,
				opts?: { score?: number }
			) => Promise<{ percent: number | null }>;
			activityUrl: (slug: string) => Promise<string>;
		};
	}
}

describe('rtapps-sdk', () => {
	beforeEach(() => {
		// Each evaluation makes a fresh `resolved` cache closure, so a fresh window.fetch stub per
		// test plus one fresh loadSdk() call is enough isolation between cases.
		window.RTApps = undefined as unknown as Window['RTApps'];
	});

	it('scored flow: resolves the slug, starts an attempt, submits the score with an Idempotency-Key', async () => {
		const fetchMock = vi.fn<FetchImpl>(async (url) => {
			if (url === '/api/v1/activities/by-sdk-slug/s') return jsonResponse(RESOLVER_INFO);
			if (url === '/api/v1/activities/activity-1/attempts')
				return jsonResponse({ id: 'attempt-1' });
			if (url === '/api/v1/attempts/attempt-1/submit') return jsonResponse({ percent: 30 });
			throw new Error('unexpected fetch: ' + url);
		});
		window.fetch = fetchMock as unknown as typeof fetch;
		loadSdk();

		const result = await window.RTApps.recordResult('s', { score: 3 });

		expect(result).toEqual({ percent: 30 });
		expect(fetchMock.mock.calls).toHaveLength(3);

		const [resolveCall, attemptCall, submitCall] = fetchMock.mock.calls;
		expect(resolveCall[0]).toBe('/api/v1/activities/by-sdk-slug/s');
		expect((resolveCall[1] as RequestInit).credentials).toBe('same-origin');

		expect(attemptCall[0]).toBe('/api/v1/activities/activity-1/attempts');
		expect((attemptCall[1] as RequestInit).method).toBe('POST');
		expect((attemptCall[1] as RequestInit).credentials).toBe('same-origin');
		expect(
			(attemptCall[1] as { headers: Record<string, string> }).headers['Idempotency-Key']
		).toEqual(expect.any(String));

		expect(submitCall[0]).toBe('/api/v1/attempts/attempt-1/submit');
		const submitInit = submitCall[1] as {
			method: string;
			body: string;
			headers: Record<string, string>;
		};
		expect(submitInit.method).toBe('POST');
		expect(JSON.parse(submitInit.body)).toEqual({ score: 3 });
		expect(submitInit.headers['Idempotency-Key']).toEqual(expect.any(String));
		expect(submitInit.headers['Content-Type']).toBe('application/json');
	});

	it('completion flow: submit carries no body when the resolver says completion_only', async () => {
		const fetchMock = vi.fn<FetchImpl>(async (url) => {
			if (url === '/api/v1/activities/by-sdk-slug/s')
				return jsonResponse({ ...RESOLVER_INFO, completion_only: true });
			if (url === '/api/v1/activities/activity-1/attempts')
				return jsonResponse({ id: 'attempt-1' });
			if (url === '/api/v1/attempts/attempt-1/submit') return jsonResponse({ percent: null });
			throw new Error('unexpected fetch: ' + url);
		});
		window.fetch = fetchMock as unknown as typeof fetch;
		loadSdk();

		const result = await window.RTApps.recordResult('s');

		expect(result).toEqual({ percent: null });
		const submitCall = fetchMock.mock.calls[2];
		const submitInit = submitCall[1] as { body?: string; headers: Record<string, string> };
		expect(submitInit.body).toBeUndefined();
		expect(submitInit.headers['Content-Type']).toBeUndefined();
	});

	it('resolver cache: two recordResult calls make exactly one by-sdk-slug fetch', async () => {
		let attemptCount = 0;
		const fetchMock = vi.fn(async (url: string) => {
			if (url === '/api/v1/activities/by-sdk-slug/s') return jsonResponse(RESOLVER_INFO);
			if (url === '/api/v1/activities/activity-1/attempts') {
				attemptCount += 1;
				return jsonResponse({ id: 'attempt-' + attemptCount });
			}
			if (url.startsWith('/api/v1/attempts/')) return jsonResponse({ percent: 50 });
			throw new Error('unexpected fetch: ' + url);
		});
		window.fetch = fetchMock as unknown as typeof fetch;
		loadSdk();

		await window.RTApps.recordResult('s', { score: 1 });
		await window.RTApps.recordResult('s', { score: 2 });

		const resolveCalls = fetchMock.mock.calls.filter(
			(c) => c[0] === '/api/v1/activities/by-sdk-slug/s'
		);
		expect(resolveCalls).toHaveLength(1);
	});

	it('retries the whole chain once when the attempt-start POST rejects, then succeeds', async () => {
		let attemptCalls = 0;
		let resolveCalls = 0;
		const fetchMock = vi.fn(async (url: string) => {
			if (url === '/api/v1/activities/by-sdk-slug/s') {
				resolveCalls += 1;
				return jsonResponse(RESOLVER_INFO);
			}
			if (url === '/api/v1/activities/activity-1/attempts') {
				attemptCalls += 1;
				if (attemptCalls === 1) throw new Error('network down');
				return jsonResponse({ id: 'attempt-1' });
			}
			if (url === '/api/v1/attempts/attempt-1/submit') return jsonResponse({ percent: 30 });
			throw new Error('unexpected fetch: ' + url);
		});
		window.fetch = fetchMock as unknown as typeof fetch;
		loadSdk();

		const result = await window.RTApps.recordResult('s', { score: 3 });

		expect(result).toEqual({ percent: 30 });
		expect(resolveCalls).toBe(1);
		expect(attemptCalls).toBe(2);
	});

	it('rejects when a second consecutive attempt-start POST also fails', async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url === '/api/v1/activities/by-sdk-slug/s') return jsonResponse(RESOLVER_INFO);
			if (url === '/api/v1/activities/activity-1/attempts') throw new Error('network down');
			throw new Error('unexpected fetch: ' + url);
		});
		window.fetch = fetchMock as unknown as typeof fetch;
		loadSdk();

		await expect(window.RTApps.recordResult('s', { score: 3 })).rejects.toThrow('network down');
	});

	it("activityUrl builds the player URL from the resolver's subject_slug and activity_id", async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url === '/api/v1/activities/by-sdk-slug/s') return jsonResponse(RESOLVER_INFO);
			throw new Error('unexpected fetch: ' + url);
		});
		window.fetch = fetchMock as unknown as typeof fetch;
		loadSdk();

		const url = await window.RTApps.activityUrl('s');

		expect(url).toBe('/subjects/ct-basics/activities/activity-1');
	});

	it('rejects with an Error naming the slug when the resolver 404s', async () => {
		const fetchMock = vi.fn(async () => jsonResponse({}, 404));
		window.fetch = fetchMock as unknown as typeof fetch;
		loadSdk();

		await expect(window.RTApps.recordResult('missing-slug')).rejects.toThrow('missing-slug');
	});
});
