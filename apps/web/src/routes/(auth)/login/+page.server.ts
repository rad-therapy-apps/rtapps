import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, relaySetCookie } from '$lib/server/api';
import { problemMessage, safeNext } from '$lib/server/auth-forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) redirect(303, '/home');

	let googleEnabled = false;
	try {
		const res = await apiFetch(event, '/auth/providers');
		if (res.ok) googleEnabled = (await res.json()).google === true;
	} catch {
		/* API unreachable: hide the Google link */
	}

	return { googleEnabled, next: safeNext(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const next = safeNext(String(form.get('next') ?? ''));

		let res: Response;
		try {
			res = await apiFetch(event, '/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
		} catch {
			return fail(503, {
				error: 'The service is temporarily unavailable. Please try again.',
				email
			});
		}

		if (!res.ok) {
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, { error: problemMessage(problem, res.status), email });
		}

		relaySetCookie(event, res);
		redirect(303, next);
	}
};
