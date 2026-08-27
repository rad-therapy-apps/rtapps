import type { Handle } from '@sveltejs/kit';

// Plan 1b replaces this with session resolution (GET /auth/me) and role guards.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = crypto.randomUUID();
	return resolve(event);
};
