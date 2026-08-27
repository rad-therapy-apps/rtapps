import { redirect } from '@sveltejs/kit';
import { apiFetch, relaySetCookie } from '$lib/server/api';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const res = await apiFetch(event, '/auth/logout', { method: 'POST' });
		relaySetCookie(event, res);
		event.cookies.delete('rt_session', { path: '/' });
		redirect(303, '/login');
	}
};
