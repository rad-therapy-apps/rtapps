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
	return { next: safeNext(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '');
		const displayName = String(form.get('display_name') ?? '');
		const password = String(form.get('password') ?? '');
		const next = safeNext(String(form.get('next') ?? ''));

		const res = await apiFetch(event, '/auth/register', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, password, display_name: displayName })
		});

		if (!res.ok) {
			const error = await problemMessage(res, 'Unable to register.');
			return fail(res.status, { error, email, display_name: displayName });
		}

		relaySetCookie(event, res);
		redirect(303, next);
	}
};
