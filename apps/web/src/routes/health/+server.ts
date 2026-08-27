import { json } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';

export async function GET({ fetch, request }) {
	const res = await apiFetch(fetch, '/health', {
		cookie: request.headers.get('cookie') ?? undefined
	});
	const api = res.ok ? await res.json() : { status: 'error', code: res.status };
	return json({ web: 'ok', api });
}
