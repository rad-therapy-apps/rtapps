import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type SubjectDetailOut = components['schemas']['SubjectDetailOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, `/subjects/${event.params.slug}`);
	if (res.status === 404) error(404, 'Subject not found');
	if (!res.ok) error(502, 'Could not load the subject');
	const subject: SubjectDetailOut = await res.json();
	return { subject };
};
