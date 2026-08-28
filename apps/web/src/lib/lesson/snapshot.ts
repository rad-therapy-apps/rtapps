/**
 * What this file does: the one place that casts `LessonOut.snapshot` from an opaque JSON object
 * to the typed `LessonSnapshot` shape the lesson UI renders.
 * Used here and why: a single `as unknown as` boundary function, rather than casting at every
 * call site, so there is exactly one place to update if the snapshot shape ever changes.
 * How it fits the project: the generated OpenAPI schema can't express the lesson content shape
 * (ADR-0003 snapshots are opaque JSONB to the API), so this bridges that gap for
 * `+page.svelte`/`LessonPager.svelte`. See `docs/03-architecture.md` §4.3/§5.
 * Depends on: `@rtapps/api-client` (`components['schemas']['LessonOut']`), `./types`
 * (`LessonSnapshot`).
 * Used by: `apps/web/src/routes/(app)/lessons/[slug]/+page.svelte`, `LessonPager.svelte`.
 */
import type { components } from '@rtapps/api-client';
import type { LessonSnapshot } from './types';

type LessonOut = components['schemas']['LessonOut'];

/**
 * `snapshot` is typed as a plain object by the OpenAPI schema (it's opaque JSON to the API),
 * so it needs an explicit cast to the lesson content shape the frontend actually renders.
 */
export function lessonSnapshot(lesson: LessonOut): LessonSnapshot {
	// The cast this whole module exists for: `unknown` first because `Record<string, unknown>`
	// and `LessonSnapshot` don't otherwise overlap enough for a direct assertion.
	return lesson.snapshot as unknown as LessonSnapshot;
}
