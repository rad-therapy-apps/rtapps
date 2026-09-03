/**
 * What this file does: TypeScript types for the lesson working-copy page/block shape
 * (`LessonAuthorOut.pages` / `PagesIn.pages`), plus the client-only editor state that adds one
 * extra field on top of the wire shape.
 * Used here and why: hand-written types mirroring `$lib/lesson/types.ts`'s pattern — the
 * generated OpenAPI schema types `LessonAuthorOut.pages`/`PagesIn.pages` as opaque JSON (the API
 * treats page/block content as untyped JSONB), so `+page.server.ts` casts the loaded array to
 * `AuthorPage[]` at one boundary and everything downstream uses these types instead of
 * `unknown`. `ClientBlock` adds `instanceId` (a `crypto.randomUUID()` generated once per block
 * object, never sent back to the API) — the stable per-block identity `LessonEditor.svelte`
 * keys each block's `{#key}` wrapper on, so `RichTextEditor`'s one-time-mount contract (Task 14)
 * survives reordering a block within or across pages.
 * How it fits the project: the type half of Task 15's lesson editor; `LessonEditor.svelte` is
 * the only place that builds `ClientPage[]` from `AuthorPage[]` (on load) and back (on save).
 * `ClientPage` carries the same per-instance `instanceId` pattern as `ClientBlock`: the stable
 * identity the outer pages `{#each}` keys on, so `movePage`/`deletePage` moves a page's whole DOM
 * subtree (including its already block-keyed children) instead of remounting it in place.
 * Depends on: `$lib/prose/types` (`ProseDoc`).
 * Used by: `LessonEditor.svelte`, `KnowledgeCheckForm.svelte`,
 * `routes/(app)/author/lessons/[id]/+page.server.ts`, `LessonEditor.svelte.spec.ts`.
 */
import type { ProseDoc } from '$lib/prose/types';

// --- Wire shapes: LessonAuthorOut.pages (GET) and PagesIn.pages (PUT), which share one shape
// per the API's docstring ("Task 15's editor consumes this verbatim"). Unlike the student-facing
// `$lib/lesson/types.ts` block shapes, the knowledge-check block here is unstripped: it carries
// `answer`/`explanation`, the author's own working copy.
export type AuthorRichTextBlock = { type: 'rich_text'; body: ProseDoc };

export type AuthorKnowledgeCheckBlock = {
	type: 'knowledge_check';
	key: string;
	stem: ProseDoc;
	options: string[];
	answer: number;
	explanation: ProseDoc | null;
};

export type AuthorBlock = AuthorRichTextBlock | AuthorKnowledgeCheckBlock;

export type AuthorPage = { title: string; blocks: AuthorBlock[] };

// --- Client-only editor state: the wire shape plus a stable `instanceId`, stripped back off
// before a save PUT (see `LessonEditor.svelte`'s `toPagesIn`).
export type ClientRichTextBlock = AuthorRichTextBlock & { instanceId: string };
export type ClientKnowledgeCheckBlock = AuthorKnowledgeCheckBlock & { instanceId: string };
export type ClientBlock = ClientRichTextBlock | ClientKnowledgeCheckBlock;
export type ClientPage = { title: string; blocks: ClientBlock[]; instanceId: string };
