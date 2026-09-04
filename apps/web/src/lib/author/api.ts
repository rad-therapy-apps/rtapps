/**
 * What this file does: constructs the single browser-side `openapi-fetch` client the authoring UI
 * (Task 15's lesson editor, Task 16's other builders) uses to call the API directly from the
 * client — save/publish/preview/media calls, none of which go through a `+page.server.ts` action.
 * Used here and why: identical to `$lib/lesson/api.ts` (`createApi()`, `baseUrl: ''`) — kept as a
 * separate instance under `$lib/author` rather than importing the lesson one, so the authoring
 * feature doesn't depend on the student-lesson feature for something this trivial.
 * How it fits the project: the browser half of ADR-0002 (same-origin proxy, cookie sessions) for
 * the authoring area. See `docs/03-architecture.md` §4.1/§7.
 * Depends on: `@rtapps/api-client` (`createApi`).
 * Used by: `LessonEditor.svelte`, `PublishPanel.svelte`, `+page.svelte` (Preview tab fetch),
 * `uploadImage`'s real `AuthorApi` wiring in `LessonEditor.svelte`.
 */
import { createApi } from '@rtapps/api-client';

/** Browser-side API client for the authoring area. Import only from `.svelte` components. */
export const api = createApi();
