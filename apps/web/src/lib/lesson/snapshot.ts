import type { components } from '@rtapps/api-client';
import type { LessonSnapshot } from './types';

type LessonOut = components['schemas']['LessonOut'];

/**
 * `snapshot` is typed as a plain object by the OpenAPI schema (it's opaque JSON to the API),
 * so it needs an explicit cast to the lesson content shape the frontend actually renders.
 */
export function lessonSnapshot(lesson: LessonOut): LessonSnapshot {
	return lesson.snapshot as unknown as LessonSnapshot;
}
