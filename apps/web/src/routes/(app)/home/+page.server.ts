import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type ResultOut = components['schemas']['ResultOut'];

export const load: PageServerLoad = async (event) => {
	try {
		const res = await apiFetch(event, '/me/results');
		if (!res.ok) return { results: [] as ResultOut[], error: 'Could not load results' };
		const results: ResultOut[] = await res.json();
		return { results, error: undefined };
	} catch {
		return { results: [] as ResultOut[], error: 'Could not load results' };
	}
};
