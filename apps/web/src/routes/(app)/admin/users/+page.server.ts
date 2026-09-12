/**
 * What this file does: SSR `load` and form `actions` for `(app)/admin/users`. `load` lists users
 * (`GET /admin/users?q=&cursor=`), paginated by `next_cursor`; the `role` action changes a user's
 * role (`PATCH /admin/users/{id}/role`), `deactivate` deactivates one
 * (`POST /admin/users/{id}/deactivate`), and `reset` sets a temporary password
 * (`POST /admin/users/{id}/reset-password`).
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch`/`apiJson(event, …)`
 * forward the session cookie and (for the mutating actions) set `Origin` for the API's CSRF
 * check; `fail()` re-renders the page with the API's problem+json message on error.
 *
 * How it fits the project: `guard.ts` already restricts `/admin/*` to the admin role, so this
 * page assumes the caller is an admin. `docs/03-architecture.md` §7 (`GET/PATCH/POST admin
 * users`).
 *
 * Works with: `$lib/server/api` (`apiFetch`, `apiJson`), `$lib/server/auth-forms`
 * (`problemMessage`), `@rtapps/api-client` (`UserPage`, `ResetPasswordOut`). Used by:
 * `+page.svelte` (this route).
 */
import { fail } from '@sveltejs/kit';
import { apiFetch, apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import type { components } from '@rtapps/api-client';
import type { Actions, PageServerLoad } from './$types';

type UserPage = components['schemas']['UserPage'];
type ResetPasswordOut = components['schemas']['ResetPasswordOut'];

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams.get('q') ?? '';
	const cursor = event.url.searchParams.get('cursor') ?? '';
	// Forward only the params that are set: an empty `q`/`cursor` shouldn't filter/paginate.
	const params = new URLSearchParams();
	if (q) params.set('q', q);
	if (cursor) params.set('cursor', cursor);

	const res = await apiFetch(event, `/admin/users?${params.toString()}`);
	if (!res.ok) {
		const page: UserPage = { items: [], next_cursor: null };
		return { page, q, error: 'Could not load users' };
	}
	const page: UserPage = await res.json();
	return { page, q, error: undefined };
};

// Shared failure path for the mutating actions below: turns a non-ok response into a form `fail`.
async function problemOrNull(res: Response) {
	const problem = await res.json().catch(() => undefined);
	return fail(res.status, { error: problemMessage(problem, res.status) });
}

export const actions: Actions = {
	// Changes a user's role from the roster's per-row select.
	role: async (event) => {
		const form = await event.request.formData();
		const userId = String(form.get('user_id') ?? '');
		const role = String(form.get('role') ?? '');
		const res = await apiJson(event, `/admin/users/${userId}/role`, { role }, 'PATCH');
		return res.ok ? { saved: true } : problemOrNull(res);
	},
	// Deactivates a user from the roster's per-row button.
	deactivate: async (event) => {
		const form = await event.request.formData();
		const userId = String(form.get('user_id') ?? '');
		const res = await apiJson(event, `/admin/users/${userId}/deactivate`);
		return res.ok ? { deactivated: true } : problemOrNull(res);
	},
	// Sets a temporary password for a user from the roster's per-row button. The temporary
	// password is returned to the page once, in the action result — never persisted client-side
	// (no cookie, no URL param, no logging).
	reset: async (event) => {
		const form = await event.request.formData();
		const userId = String(form.get('user_id') ?? '');
		const res = await apiJson(event, `/admin/users/${userId}/reset-password`);
		if (!res.ok) return problemOrNull(res);
		const body: ResetPasswordOut = await res.json();
		return { temporaryPassword: body.temporary_password };
	}
};
