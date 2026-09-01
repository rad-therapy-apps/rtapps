/**
 * What this file does: TypeScript types for the four practice-activity snapshot shapes returned,
 * answers stripped, by `GET /activities/{id}` (quiz, flashcards, matching, sequencing), plus the
 * one boundary cast from the opaque `ActivityOut.snapshot` JSON to those shapes.
 * Used here and why: hand-written types mirroring `apps/api/app/content/activity_snapshots.py`'s
 * `strip_activity_answers` output, following the `lib/lesson/types.ts`/`snapshot.ts` pattern so
 * `+page.svelte`/`QuizPlayer.svelte`/`FlashcardPlayer.svelte` get an exhaustive-checkable
 * discriminated union over `activity.kind` instead of treating the snapshot as `unknown`.
 * How it fits the project: the generated OpenAPI schema types `ActivityOut.snapshot` as an opaque
 * JSON object (it's untyped JSON to the API); `activitySnapshot()` casts it to `ActivitySnapshot`
 * at this one boundary, mirroring `lib/lesson/snapshot.ts`'s `lessonSnapshot()`. See ADR-0003,
 * ADR-0006, and `docs/03-architecture.md` §4.4/§5.
 * Depends on: `$lib/prose/types` (`ProseDoc`, embedded as the quiz stem).
 * Used by: `(app)/subjects/[slug]/activities/[id]/+page.svelte`, `QuizPlayer.svelte`,
 * `FlashcardPlayer.svelte`, `QuizPlayer.svelte.spec.ts`.
 */
import type { ProseDoc } from '$lib/prose/types';

// Subject reference embedded in every non-lesson activity snapshot (or null if unassigned).
type SubjectRef = { slug: string; title: string } | null;

export type QuizQuestion = {
	key: string;
	question_id: string;
	stem: ProseDoc;
	body: { type: 'single_choice'; options: string[] };
};

export type QuizSnapshot = {
	activity: { id: string; kind: 'quiz'; title: string };
	quiz: {
		id: string;
		slug: string;
		title: string;
		subject: SubjectRef;
		questions: QuizQuestion[];
	};
};

export type FlashcardsSnapshot = {
	activity: { id: string; kind: 'flashcards'; title: string };
	flashcards: {
		id: string;
		slug: string;
		title: string;
		subject: SubjectRef;
		cards: { term: string; definition: string }[];
	};
};

export type MatchingSnapshot = {
	activity: { id: string; kind: 'matching'; title: string };
	matching: {
		id: string;
		slug: string;
		title: string;
		subject: SubjectRef;
		terms: { key: string; term: string }[];
		definitions: string[];
	};
};

export type SequencingSnapshot = {
	activity: { id: string; kind: 'sequencing'; title: string };
	sequencing: {
		id: string;
		slug: string;
		title: string;
		subject: SubjectRef;
		items: { key: string; label: string; detail?: string }[];
	};
};

// The four practice-activity snapshot shapes (ADR-0006 excludes lesson/assessment activities
// from this route), discriminated on `activity.kind`.
export type ActivitySnapshot =
	QuizSnapshot | FlashcardsSnapshot | MatchingSnapshot | SequencingSnapshot;

/**
 * `snapshot` is typed as a plain object by the OpenAPI schema (it's opaque JSON to the API), so
 * it needs an explicit cast to the activity content shape the frontend actually renders.
 */
export function activitySnapshot(raw: unknown): ActivitySnapshot {
	// The cast this whole module exists for: `unknown` first because the generated snapshot type
	// and `ActivitySnapshot` don't otherwise overlap enough for a direct assertion.
	return raw as unknown as ActivitySnapshot;
}
