/**
 * What this file does: SSR `load` for `(app)/admin/audit`. Lists audit log rows
 * (`GET /admin/audit-log?action=&limit=100`), optionally filtered by action from the query
 * string.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch(event, …)` forwards
 * the session cookie; a failed fetch degrades to an empty list with an error message rather than
 * throwing.
 *
 * How it fits the project: `guard.ts` already restricts `/admin/*` to the admin role, so this
 * page assumes the caller is an admin. `docs/03-architecture.md` §7 (`GET admin audit-log`).
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`AuditOut`). Used by:
 * `+page.svelte` (this route).
 */
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type AuditOut = components['schemas']['AuditOut'];

export const load: PageServerLoad = async (event) => {
	const action = event.url.searchParams.get('action') ?? '';
	// Forward the action filter only when set: an empty filter shouldn't restrict the results.
	const params = new URLSearchParams({ limit: '100' });
	if (action) params.set('action', action);

	const res = await apiFetch(event, `/admin/audit-log?${params.toString()}`);
	if (!res.ok) return { rows: [] as AuditOut[], action, error: 'Could not load audit log' };
	const rows: AuditOut[] = await res.json();
	return { rows, action, error: undefined };
};
