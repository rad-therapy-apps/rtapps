/**
 * What this file does: SSR `load` and form `action` for `(app)/author`. `load` fetches every
 * subject (`GET /authoring/subjects`) plus, per subject, its activities (`GET
 * /authoring/subjects/{slug}/activities`), and pulls out the ones flagged `needs_review` into
 * their own list; the `createLesson` action creates a draft lesson via the API and redirects
 * into its editor.
 *
 * Used here and why: `+page.server.ts` runs only on the server, so `apiFetch`/`apiJson` forward
 * the session cookie; the per-subject activities fetch is serial (14 subjects, not worth the
 * complexity of `Promise.all` error-aggregation for this task); `fail()` re-renders the create
 * form with the API's problem+json message on error, same as `(app)/educator`'s `create` action.
 *
 * How it fits the project: `guard.ts`'s `/author` prefix (widened alongside `/educator` to admit
 * both educator and admin) and `(app)/+layout.server.ts` guarantee a signed-in educator/admin
 * before this runs. `needs_review`/`import_notes` are the migrated-content review queue (Task 4).
 * `docs/03-architecture.md` §7.
 *
 * Works with: `$lib/server/api` (`apiFetch`, `apiJson`), `$lib/server/auth-forms`
 * (`problemMessage`), `@rtapps/api-client` (`SubjectAuthorOut`, `ActivityAuthorRow`,
 * `LessonAuthorOut`). Used by: `+page.svelte` (this route).
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { apiFetch, apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import type { components } from '@rtapps/api-client';
import type { Actions, PageServerLoad } from './$types';

type SubjectAuthorOut = components['schemas']['SubjectAuthorOut'];
type ActivityAuthorRow = components['schemas']['ActivityAuthorRow'];
type LessonAuthorOut = components['schemas']['LessonAuthorOut'];

export type SubjectActivities = { subject: SubjectAuthorOut; activities: ActivityAuthorRow[] };
export type NeedsReviewRow = ActivityAuthorRow & { subject: SubjectAuthorOut };

export const load: PageServerLoad = async (event) => {
	const subjectsRes = await apiFetch(event, '/authoring/subjects');
	// API down or erroring: a 502, since there's no meaningful dashboard to show without subjects.
	if (!subjectsRes.ok) error(502, 'Could not load subjects');
	const subjects: SubjectAuthorOut[] = await subjectsRes.json();

	const bySubject: SubjectActivities[] = [];
	const needsReview: NeedsReviewRow[] = [];
	for (const subject of subjects) {
		const activitiesRes = await apiFetch(event, `/authoring/subjects/${subject.slug}/activities`);
		if (!activitiesRes.ok) error(502, 'Could not load activities');
		const activities: ActivityAuthorRow[] = await activitiesRes.json();
		bySubject.push({ subject, activities });
		for (const activity of activities) {
			if (activity.needs_review) needsReview.push({ ...activity, subject });
		}
	}

	return { bySubject, needsReview };
};

export const actions: Actions = {
	// Creates a draft lesson (plus its paired draft activity), then redirects straight into its
	// editor. The editor route (`/author/lessons/[id]`) doesn't exist yet (Task 15) — a plain
	// string redirect target, since `resolve()` can only target route ids SvelteKit already knows.
	createLesson: async (event) => {
		const form = await event.request.formData();
		const title = String(form.get('title') ?? '').trim();
		const slug = String(form.get('slug') ?? '').trim();
		const subject_slug = String(form.get('subject_slug') ?? '').trim();
		const res = await apiJson(event, '/authoring/lessons', { title, slug, subject_slug });
		if (!res.ok) {
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, {
				error: problemMessage(problem, res.status),
				title,
				slug,
				subject_slug
			});
		}
		const lesson: LessonAuthorOut = await res.json();
		redirect(303, `/author/lessons/${lesson.activity_id}`);
	}
};
