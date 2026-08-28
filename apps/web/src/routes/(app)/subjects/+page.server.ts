import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type SubjectOut = components['schemas']['SubjectOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, '/subjects');
	if (!res.ok) error(502, 'Could not load subjects');
	const subjects: SubjectOut[] = await res.json();
	return { subjects };
};
