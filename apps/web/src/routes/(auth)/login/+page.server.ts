import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, relaySetCookie } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

/** Only accept same-origin relative paths as a redirect target (open-redirect guard). */
function safeNext(value: string | null): string {
	if (value && value.startsWith('/') && !value.startsWith('//')) return value;
	return '/home';
}

async function problemMessage(res: Response, fallback: string): Promise<string> {
	try {
		const problem = await res.json();
		return problem.title ?? problem.detail ?? fallback;
	} catch {
		return fallback;
	}
}

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

		const res = await apiFetch(event, '/auth/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!res.ok) {
			const error = await problemMessage(res, 'Unable to sign in.');
			return fail(res.status, { error, email });
		}

		relaySetCookie(event, res);
		redirect(303, next);
	}
};
