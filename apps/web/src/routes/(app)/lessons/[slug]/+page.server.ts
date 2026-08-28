import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

type LessonOut = components['schemas']['LessonOut'];
type AttemptOut = components['schemas']['AttemptOut'];

export const load: PageServerLoad = async (event) => {
	const lessonRes = await apiFetch(event, `/lessons/${event.params.slug}`);
	if (lessonRes.status === 404) error(404, 'Lesson not found');
	if (!lessonRes.ok) error(502, 'Could not load the lesson');
	const lesson: LessonOut = await lessonRes.json();

	const attemptRes = await apiFetch(event, `/activities/${lesson.activity_id}/attempts`, {
		method: 'POST'
	});
	if (!attemptRes.ok) error(502, 'Could not start the attempt');
	const attempt: AttemptOut = await attemptRes.json();

	return { lesson, attempt };
};
