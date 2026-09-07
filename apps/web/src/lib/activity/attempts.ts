/**
 * What this file does: shared, client-injectable helpers over the three attempt endpoints every
 * practice-activity player calls — start/resume an attempt, grade one item, submit for a final
 * score.
 * Used here and why: pure functions taking an openapi-fetch `post` (the same injectable pattern
 * as `KnowledgeCheck.svelte`/`LessonPager.svelte`'s `post` prop), returning small hand-typed
 * shapes instead of the generated response types directly, so `QuizPlayer.svelte`/
 * `FlashcardPlayer.svelte` don't each repeat request-building and the RFC 9457 `error.title`
 * fallback documented in `KnowledgeCheck.svelte`; `explanation`/`response.choice` are cast to
 * their real shapes here (the OpenAPI schema types both as opaque JSON), so callers never touch
 * an unknown boundary type.
 * How it fits the project: ADR-0004's attempt/grading/submit integration spine, generalized from
 * lessons to the four practice-activity kinds (plan 3a Task 14). `POST /activities/{id}/attempts`
 * resumes an in-progress attempt (with its saved items) rather than starting a second one. See
 * `docs/03-architecture.md` §4.4.
 * Depends on: `$lib/lesson/api` (`api.POST`'s type, for `PostFn`), `$lib/prose/types`
 * (`ProseDoc`), `@rtapps/api-client`.
 * Used by: `QuizPlayer.svelte`, `FlashcardPlayer.svelte`, `ExternalPlayer.svelte`, `attempts.test.ts`.
 */
import { api } from '$lib/lesson/api';
import type { components } from '@rtapps/api-client';
import type { ProseDoc } from '$lib/prose/types';

type AttemptOut = components['schemas']['AttemptOut'];
type ItemGradeOut = components['schemas']['ItemGradeOut'];

/** Shape of `api.POST`; every function below takes one so tests can inject a fake. */
export type PostFn = typeof api.POST;

export type SavedItem = { item_key: string; response: { choice: number }; correct: boolean | null };
export type StartedAttempt = { id: string; items: SavedItem[] };
export type ItemGrade = { item_key: string; correct: boolean; explanation: ProseDoc | null };
export type SubmittedAttempt = { percent: number | null; passed: boolean | null };

// Same RFC 9457 fallback as KnowledgeCheck.svelte/LessonPager.svelte: apps/api's global exception
// handlers return a problem+json body with `title`, which the generated schema doesn't reflect.
function errorTitle(error: unknown): string {
	return (error as { title?: string }).title ?? 'Request failed';
}

/** POST /activities/{id}/attempts — the API resumes an in-progress attempt (items included). */
export async function startAttempt(post: PostFn, activityId: string): Promise<StartedAttempt> {
	const res = await post('/api/v1/activities/{activity_id}/attempts', {
		params: { path: { activity_id: activityId } }
	});
	if (res.error) throw new Error(errorTitle(res.error));
	const attempt = res.data as AttemptOut;
	return {
		id: attempt.id,
		// `response` is opaque JSON to the schema (additionalProperties: true); every item on a
		// quiz/flashcards attempt is a single-choice response, so `choice` is safe to assume here.
		items: attempt.items.map((item) => ({
			item_key: item.item_key,
			response: item.response as unknown as { choice: number },
			correct: item.correct
		}))
	};
}

/** POST /attempts/{id}/items — grade one choice; returns correct + optional explanation. */
export async function gradeItem(
	post: PostFn,
	attemptId: string,
	itemKey: string,
	choice: number
): Promise<ItemGrade> {
	const res = await post('/api/v1/attempts/{attempt_id}/items', {
		params: { path: { attempt_id: attemptId } },
		body: { item_key: itemKey, response: { choice } }
	});
	if (res.error) throw new Error(errorTitle(res.error));
	const grade = res.data as ItemGradeOut;
	return {
		item_key: grade.item_key,
		correct: grade.correct,
		// The API validated this as a prose doc (packages/schemas); the schema only types it as
		// opaque JSON (or null when the item has no explanation).
		explanation: grade.explanation as unknown as ProseDoc | null
	};
}

/** POST /attempts/{id}/submit with a fresh crypto.randomUUID() Idempotency-Key. */
export async function submitAttempt(post: PostFn, attemptId: string): Promise<SubmittedAttempt> {
	const res = await post('/api/v1/attempts/{attempt_id}/submit', {
		params: { path: { attempt_id: attemptId } },
		headers: { 'Idempotency-Key': crypto.randomUUID() }
	});
	if (res.error) throw new Error(errorTitle(res.error));
	const attempt = res.data as AttemptOut;
	return { percent: attempt.percent, passed: attempt.passed };
}

/** POST /attempts/{id}/submit with the external game's reported score (plan 4a). The server
 *  clamps against the pinned snapshot's max_score — this client never sends a denominator. */
export async function submitExternalAttempt(
	post: PostFn,
	attemptId: string,
	score: number
): Promise<SubmittedAttempt> {
	const res = await post('/api/v1/attempts/{attempt_id}/submit', {
		params: { path: { attempt_id: attemptId } },
		headers: { 'Idempotency-Key': crypto.randomUUID() },
		body: { score }
	});
	if (res.error) throw new Error(errorTitle(res.error));
	const attempt = res.data as AttemptOut;
	return { percent: attempt.percent, passed: attempt.passed };
}
