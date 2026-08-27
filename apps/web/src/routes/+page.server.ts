import { apiFetch } from '$lib/server/api';

export async function load({ fetch }) {
	let api: { status: string; database?: string } = { status: 'unreachable' };
	try {
		const res = await apiFetch(fetch, '/health');
		if (res.ok) api = await res.json();
	} catch {
		/* API down: show the status on the page instead of failing the render */
	}
	return { api };
}
