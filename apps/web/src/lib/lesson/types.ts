/**
 * What this file does: TypeScript types for the lesson-page content shape embedded in
 * `LessonOut.snapshot` (rich text + knowledge-check blocks, grouped into pages).
 * Used here and why: hand-written types mirroring the `lesson` half of ADR-0003's published
 * snapshot shape, so `LessonPager.svelte`/`KnowledgeCheck.svelte` get exhaustive-checkable
 * `{#if}`/`{#each}` branches over `block.type` instead of treating the snapshot as `unknown`.
 * How it fits the project: the generated OpenAPI schema types `LessonOut.snapshot` as an opaque
 * JSON object (it's untyped JSON to the API), so `snapshot.ts` casts it to `LessonSnapshot` at
 * one boundary; everything downstream of that cast uses these types. See ADR-0003 and
 * `docs/03-architecture.md` §4.3/§5.
 * Depends on: `$lib/prose/types` (`ProseDoc`, embedded as the rich-text body and the
 * knowledge-check stem).
 * Used by: `snapshot.ts` (`lessonSnapshot` return type), `LessonPager.svelte`,
 * `KnowledgeCheck.svelte`, and both `.spec.ts` fixtures in this directory.
 */
import type { ProseDoc } from '$lib/prose/types';

export type RichTextBlock = { type: 'rich_text'; body: ProseDoc };

export type KnowledgeCheckBlock = {
	type: 'knowledge_check';
	key: string;
	question_id: string;
	stem: ProseDoc;
	body: { type: 'single_choice'; options: string[] };
};

// The two block kinds a lesson page can contain (ADR-0003 snapshot shape): plain prose, or a
// single-choice knowledge check graded server-side via `key`.
export type LessonBlock = RichTextBlock | KnowledgeCheckBlock;

export type LessonPage = { order: number; title: string; blocks: LessonBlock[] };

/** The shape of `LessonOut.snapshot` (an untyped JSON blob in the generated API schema). */
export type LessonSnapshot = {
	activity: { id: string; kind: string; title: string; config: Record<string, unknown> };
	lesson: {
		id: string;
		slug: string;
		title: string;
		subject: { slug: string; title: string } | null;
		pages: LessonPage[];
	};
};
