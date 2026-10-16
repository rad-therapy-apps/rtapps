import { describe, expect, it, vi } from 'vitest';

// A stand-in Sentry and a made-up DSN, so importing the hook runs its Sentry.init branch.
vi.mock('@sentry/sveltekit', () => ({ init: vi.fn(), captureException: vi.fn() }));
// API_INTERNAL_URL and ORIGIN are read by #lib/server/api (imported by the hook); left unset.
vi.mock('$app/env/private', () => ({
	SENTRY_DSN: 'https://public@example.invalid/1',
	API_INTERNAL_URL: undefined,
	ORIGIN: undefined
}));

describe('hooks.server Sentry setup', () => {
	// Sentry 11 collects user info, cookies, headers, request/response bodies, query params and
	// local variable values unless told otherwise; the session cookie and login bodies (passwords)
	// must never be sent, so every category is switched off explicitly.
	it('initialises Sentry with every data-collection category off', async () => {
		const Sentry = await import('@sentry/sveltekit');
		await import('./hooks.server');
		expect(Sentry.init).toHaveBeenCalledOnce();
		expect(Sentry.init).toHaveBeenCalledWith({
			dsn: 'https://public@example.invalid/1',
			dataCollection: {
				userInfo: false,
				cookies: false,
				httpHeaders: false,
				httpBodies: [],
				urlQueryParams: false,
				graphQL: { document: false, variables: false },
				genAI: { inputs: false, outputs: false },
				databaseQueryData: false,
				queues: false,
				stackFrameVariables: false
			}
		});
	});
});

describe('hooks.server handleError', () => {
	// SvelteKit 3 runs handleError for every server error, tagged with `kind`. Only a real crash
	// ('unknown') goes to Sentry: our own error(404)s ('app') and SvelteKit's missing-route 404s
	// ('framework') are expected and would only be noise.
	it('reports only unknown (crash) errors to Sentry', async () => {
		const Sentry = await import('@sentry/sveltekit');
		const { handleError } = await import('./hooks.server');
		const event = {} as Parameters<typeof handleError>[0]['event'];
		const crash = new Error('boom');

		await handleError({ kind: 'app', error: { status: 404, message: 'Not found' }, event });
		await handleError({ kind: 'framework', error: { status: 404, message: 'Not Found' }, event });
		expect(Sentry.captureException).not.toHaveBeenCalled();

		await handleError({ kind: 'unknown', error: crash, event });
		expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(crash);
	});
});
