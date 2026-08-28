import { redirect, type Handle } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { decideAccess } from '$lib/server/guard';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = crypto.randomUUID();
	event.locals.user = null;
	if (event.request.headers.get('cookie')?.includes('rt_session=')) {
		try {
			const res = await apiFetch(event, '/auth/me');
			if (res.ok) event.locals.user = await res.json();
		} catch {
			/* API unreachable: treat as signed out */
		}
	}
	const decision = decideAccess(event.url.pathname, event.locals.user);
	if ('redirect' in decision) throw redirect(303, decision.redirect);
	return resolve(event);
};
