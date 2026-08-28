/**
 * What this file does: constructs the single browser-side `openapi-fetch` client used by the
 * lesson UI to call the API directly from the client (grading, submit).
 * Used here and why: `createApi()` builds an `openapi-fetch` client typed against the generated
 * `paths`, with `baseUrl: ''` — the generated paths already include the `/api/v1` prefix, so
 * requests resolve relative to the page origin instead of needing a base URL configured here.
 * How it fits the project: this is the browser half of ADR-0002 (same-origin proxy, cookie
 * sessions) — `KnowledgeCheck.svelte`/`LessonPager.svelte` call `/api/v1/attempts/...` on the
 * same origin the page was served from, with `credentials: 'same-origin'` set inside `createApi`
 * so the session cookie is sent automatically. See `docs/03-architecture.md` §4.1/§4.4.
 * Depends on: `@rtapps/api-client` (`createApi`).
 * Used by: `KnowledgeCheck.svelte` and `LessonPager.svelte` (default `post = api.POST` prop).
 */
import { createApi } from '@rtapps/api-client';

/** Browser-side API client. Import only from `.svelte` components — never from `+page.server.ts`. */
export const api = createApi();
