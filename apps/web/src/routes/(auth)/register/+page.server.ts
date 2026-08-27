import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, relaySetCookie } from '$lib/server/api';
import { problemMessage, safeNext } from '$lib/server/auth-forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) redirect(303, '/home');
	return { next: safeNext(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '');
		const displayName = String(form.get('display_name') ?? '');
		const password = String(form.get('password') ?? '');
		const next = safeNext(String(form.get('next') ?? ''));

		let res: Response;
		try {
			res = await apiFetch(event, '/auth/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password, display_name: displayName })
			});
		} catch {
			return fail(503, {
				error: 'The service is temporarily unavailable. Please try again.',
				email,
				display_name: displayName
			});
		}

		if (!res.ok) {
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, {
				error: problemMessage(problem, res.status),
				email,
				display_name: displayName
			});
		}

		relaySetCookie(event, res);
		redirect(303, next);
	}
};
